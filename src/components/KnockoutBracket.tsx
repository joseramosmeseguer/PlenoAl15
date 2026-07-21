import { ReactNode } from "react";
import { Star } from "lucide-react";
import { getFlagUrl } from "@/lib/flags";
import { isLocked, formatCountdown, LOCK_HOURS } from "@/lib/scoring";

export type BracketSlot = {
  id?: string;
  stageKey?: string;
  homeCode?: string | null;
  awayCode?: string | null;
  homeName: string;
  awayName: string;
  scoreHome?: number | null;
  scoreAway?: number | null;
  officialHome?: number | null;
  officialAway?: number | null;
  officialWinnerCode?: string | null;
  voteCount?: number;
  isPremium?: boolean;
  isMegapremium?: boolean;
  matchNumber: number;
  raw?: any;
};

function outcome(h: number, a: number): "H" | "D" | "A" {
  return h > a ? "H" : h < a ? "A" : "D";
}

export const ROUNDS = [
  { key: "round_of_32",   label: "Dieciseisavos", short: "16avos",  n: 16 },
  { key: "round_of_16",   label: "Octavos",       short: "8vos",    n: 8 },
  { key: "quarter_final", label: "Cuartos",       short: "Cuartos", n: 4 },
  { key: "semi_final",    label: "Semifinal",     short: "Semis",   n: 2 },
  { key: "final",         label: "Final",         short: "Final",   n: 1 },
] as const;

// Rondas que se reparten a izquierda/derecha (todo menos la Final, que va en el centro)
const HALF_ROUNDS = ROUNDS.slice(0, 4);
const FINAL_ROUND = ROUNDS[4];

const CARD_H = 68; // alto natural de una tarjeta
// Hueco entre tarjetas — igual estructura que el Juego, un poco más de aire en octavos/cuartos
// Huecos pensados para dejar sitio a la franja de tiempo restante que cuelga de cada tarjeta
const GAP_BY_STAGE: Record<string, number> = {
  round_of_32: 30,
  round_of_16: 32,
  quarter_final: 32,
  semi_final: 32,
};

const HALF_H = (HALF_ROUNDS[0].n / 2) * CARD_H + (HALF_ROUNDS[0].n / 2 - 1) * GAP_BY_STAGE.round_of_32;

// Centros verticales de cada tarjeta de una ronda, agrupados y centrados dentro de HALF_H
function centersFor(sideN: number, gap: number): number[] {
  const naturalH = sideN * CARD_H + (sideN - 1) * gap;
  const offset = (HALF_H - naturalH) / 2;
  return Array.from({ length: sideN }, (_, i) => offset + i * (CARD_H + gap) + CARD_H / 2);
}

export type Champion = { code?: string | null; name: string };

export function KnockoutBracket({
  slotsByStage,
  onSelect,
  thirdPlaceSlot,
  champion,
}: {
  slotsByStage: Record<string, (BracketSlot | null)[]>;
  onSelect?: (slot: BracketSlot) => void;
  thirdPlaceSlot?: BracketSlot | null;
  champion?: Champion | null;
}) {
  const centersByStage: Record<string, number[]> = {};
  HALF_ROUNDS.forEach((round) => (centersByStage[round.key] = centersFor(round.n / 2, GAP_BY_STAGE[round.key])));

  const leftCols: ReactNode[] = [];
  HALF_ROUNDS.forEach((round, ri) => {
    const sideN = round.n / 2;
    const all = slotsByStage[round.key] ?? [];
    const slots = all.slice(0, sideN);
    leftCols.push(
      <Column key={`l-${round.key}`} round={round} centers={centersByStage[round.key]} slots={slots} onSelect={onSelect} />
    );
    if (ri < HALF_ROUNDS.length - 1) {
      const nextRound = HALF_ROUNDS[ri + 1];
      leftCols.push(
        <Connector key={`cl-${ri}`} prevCenters={centersByStage[round.key]} currCenters={centersByStage[nextRound.key]} />
      );
    }
  });

  const rightCols: ReactNode[] = [];
  const reversedHalf = [...HALF_ROUNDS].reverse(); // Semis → Cuartos → Octavos → Dieciseisavos
  reversedHalf.forEach((round, ri) => {
    const sideN = round.n / 2;
    const all = slotsByStage[round.key] ?? [];
    const slots = all.slice(sideN, sideN * 2);
    if (ri > 0) {
      const prevRound = reversedHalf[ri - 1];
      rightCols.push(
        <Connector key={`cr-${ri}`} prevCenters={centersByStage[round.key]} currCenters={centersByStage[prevRound.key]} mirror />
      );
    }
    rightCols.push(
      <Column key={`r-${round.key}`} round={round} centers={centersByStage[round.key]} slots={slots} onSelect={onSelect} />
    );
  });

  const finalSlot = (slotsByStage[FINAL_ROUND.key] ?? [])[0] ?? null;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex items-start gap-3 px-1" style={{ minWidth: "max-content" }}>
        {leftCols}
        <div className="flex flex-col shrink-0 items-center self-center gap-5 px-4 py-6">
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs font-bold uppercase tracking-widest text-primary whitespace-nowrap">
              {FINAL_ROUND.label}
            </div>
            <BracketCard slot={finalSlot} round={FINAL_ROUND} onSelect={onSelect} big />
          </div>
          {thirdPlaceSlot !== undefined && (
            <div className="flex flex-col items-center gap-1.5">
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                🥉 3er y 4º puesto
              </div>
              <BracketCard slot={thirdPlaceSlot ?? null} round={{ key: "third_place", label: "3er puesto", short: "3º", n: 1 }} onSelect={onSelect} />
            </div>
          )}
          {champion && <ChampionBadge champion={champion} />}
        </div>
        {rightCols}
      </div>
    </div>
  );
}

function ChampionBadge({ champion }: { champion: Champion }) {
  const url = getFlagUrl(champion.code);
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-gold/50 bg-gradient-to-b from-gold/20 to-gold/5 px-5 py-4 shadow-sm">
      <span className="text-[9px] font-bold uppercase tracking-widest text-gold">🏆 Campeón</span>
      {url ? (
        <img src={url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-gold/60" />
      ) : (
        <span className="h-12 w-12 rounded-full bg-muted ring-2 ring-gold/60" />
      )}
      <span className="text-sm font-bold text-foreground">{champion.name}</span>
    </div>
  );
}

function Column({
  round,
  centers,
  slots,
  onSelect,
}: {
  round: { key: string; label: string; short: string; n: number };
  centers: number[];
  slots: (BracketSlot | null)[];
  onSelect?: (slot: BracketSlot) => void;
}) {
  return (
    <div className="flex flex-col shrink-0">
      <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        {round.label}
      </div>
      <div className="relative px-3" style={{ height: HALF_H, width: 150 + 24 }}>
        {centers.map((center, i) => (
          <div key={i} className="absolute left-3 right-3" style={{ top: center - CARD_H / 2 }}>
            <BracketCard slot={slots[i] ?? null} round={round} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FlagCircle({ code, big }: { code?: string | null; big?: boolean }) {
  const size = big ? "h-7 w-7" : "h-5 w-5";
  const url = getFlagUrl(code);
  if (url) {
    return <img src={url} alt="" className={`${size} shrink-0 rounded-full object-cover ring-1 ring-black/10`} />;
  }
  return <span className={`${size} shrink-0 rounded-full bg-muted ring-1 ring-black/10`} />;
}

const PRED_VARIANT_CLASSES: Record<string, string> = {
  exact: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  outcome: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  wrong: "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400",
};

function Row({
  name,
  code,
  score,
  predScore,
  predVariant,
  muted,
  big,
  winner,
}: {
  name: string;
  code?: string | null;
  score?: number | null;
  predScore?: number | null;
  predVariant?: "exact" | "outcome" | "wrong";
  muted?: boolean;
  big?: boolean;
  winner?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 ${big ? "py-2.5" : "py-1.5"} ${winner ? "bg-emerald-50 dark:bg-emerald-950/30" : ""}`}>
      <FlagCircle code={code} big={big} />
      <span className={`flex-1 truncate font-medium ${big ? "text-sm" : "text-[11px]"} ${
        muted ? "text-muted-foreground" : winner ? "text-emerald-700 dark:text-emerald-400 font-bold" : "text-foreground"
      }`}>
        {name}
      </span>
      <span className="shrink-0 flex items-center gap-1">
        <span className={`text-center font-bold tabular-nums ${big ? "w-5 text-sm" : "w-4 text-[11px]"} ${
          score == null ? "text-muted-foreground/40" : winner ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
        }`}>
          {score == null ? "–" : score}
        </span>
        {predScore != null && (
          <span
            title="Tu pronóstico"
            className={`leading-none font-bold tabular-nums rounded px-1 py-0.5 ${big ? "text-[10px]" : "text-[8px]"} ${PRED_VARIANT_CLASSES[predVariant ?? "wrong"]}`}
          >
            {predScore}
          </span>
        )}
      </span>
    </div>
  );
}

function BracketCard({
  slot,
  round,
  onSelect,
  big = false,
}: {
  slot: BracketSlot | null;
  round: { key: string; label: string; short: string; n: number };
  onSelect?: (slot: BracketSlot) => void;
  big?: boolean;
}) {
  const w = big ? "w-[220px]" : "w-[150px]";

  if (!slot) {
    return (
      <div className={`${w} overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 divide-y divide-border/60`}>
        <Row name="Por definir" muted big={big} />
        <Row name="Por definir" muted big={big} />
      </div>
    );
  }

  const clickable = !!onSelect;
  const hasOfficial = slot.officialHome != null && slot.officialAway != null;
  const hasPred = slot.scoreHome != null && slot.scoreAway != null;

  // Si ya hay resultado oficial, ese manda como marcador principal; si no, se muestra tu pronóstico (comportamiento de siempre)
  const mainHome = hasOfficial ? slot.officialHome! : slot.scoreHome ?? null;
  const mainAway = hasOfficial ? slot.officialAway! : slot.scoreAway ?? null;
  // El ganador oficial (que puede venir de prórroga/penaltis con empate a 90') manda
  // sobre el marcador para resaltar quién pasa; si no lo hay, se usa el marcador.
  const homeWins = slot.officialWinnerCode
    ? slot.officialWinnerCode === slot.homeCode
    : mainHome != null && mainAway != null && mainHome > mainAway;
  const awayWins = slot.officialWinnerCode
    ? slot.officialWinnerCode === slot.awayCode
    : mainHome != null && mainAway != null && mainAway > mainHome;

  // Si hay oficial Y pronóstico propio, se muestra el pronóstico como chip pequeño coloreado por acierto
  const showPredChip = hasOfficial && hasPred;
  const predVariant: "exact" | "outcome" | "wrong" | undefined = showPredChip
    ? slot.scoreHome === slot.officialHome && slot.scoreAway === slot.officialAway
      ? "exact"
      : outcome(slot.scoreHome!, slot.scoreAway!) === outcome(slot.officialHome!, slot.officialAway!)
      ? "outcome"
      : "wrong"
    : undefined;

  // Tiempo restante para pronosticar este partido — mismo cálculo y estilo que en Mis Pronósticos
  const kickoffAt: string | undefined = slot.raw?.kickoff_at;
  const manualLocked: boolean | undefined = slot.raw?.predictions_locked;
  const showCountdown = !hasOfficial && !!kickoffAt && !isLocked(kickoffAt, manualLocked);
  const countdown = showCountdown
    ? formatCountdown(new Date(new Date(kickoffAt!).getTime() - LOCK_HOURS * 3600 * 1000).toISOString())
    : null;
  const countdownCls = countdown?.variant === "red"
    ? "text-red-400 border-red-800/60 bg-red-950/70"
    : countdown?.variant === "amber"
    ? "text-amber-300 border-amber-700/60 bg-amber-950/70"
    : "text-emerald-400 border-emerald-800/60 bg-emerald-950/70";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={clickable ? () => onSelect!(slot) : undefined}
        disabled={!clickable}
        className={`relative ${w} overflow-hidden rounded-xl border-2 bg-card text-left divide-y divide-border/60 shadow-sm transition-all ${
          slot.isMegapremium ? "border-red-500 shadow-md shadow-red-500/20"
          : slot.isPremium ? "border-gold shadow-md shadow-gold/20"
          : big ? "border-gold/60 shadow-md"
          : "border-border"
        } ${clickable ? "hover:shadow-md hover:border-primary/40 cursor-pointer" : "cursor-default"}`}
      >
        <Row
          name={slot.homeName}
          code={slot.homeCode}
          score={mainHome}
          predScore={showPredChip ? slot.scoreHome : null}
          predVariant={predVariant}
          big={big}
          winner={homeWins}
        />
        <Row
          name={slot.awayName}
          code={slot.awayCode}
          score={mainAway}
          predScore={showPredChip ? slot.scoreAway : null}
          predVariant={predVariant}
          big={big}
          winner={awayWins}
        />
      </button>
      {slot.isMegapremium ? (
        <span className="absolute -top-2 -right-2 z-10 flex items-center justify-center h-5 w-5 rounded-full bg-red-500 shadow-md ring-2 ring-card">
          <Star className="h-3 w-3 text-white fill-white" />
        </span>
      ) : slot.isPremium && (
        <span className="absolute -top-2 -right-2 z-10 flex items-center justify-center h-5 w-5 rounded-full bg-gold shadow-md ring-2 ring-card">
          <Star className="h-3 w-3 text-pitch-deep fill-pitch-deep" />
        </span>
      )}
      {typeof slot.voteCount === "number" && (
        <span
          title="Pronósticos recibidos"
          className="absolute -top-2 -left-2 z-10 flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-slate-700 text-white text-[9px] font-bold shadow-md ring-2 ring-card"
        >
          {slot.voteCount}
        </span>
      )}
      {countdown && (
        <div className="flex pl-3">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-b-md border-x border-b ${countdownCls}`}>
            cierra en {countdown.label}
          </span>
        </div>
      )}
    </div>
  );
}

function Connector({
  prevCenters,
  currCenters,
  mirror = false,
}: {
  prevCenters: number[];
  currCenters: number[];
  mirror?: boolean;
}) {
  const W = 22;
  const stroke = "rgba(100,116,139,0.85)";
  return (
    <svg width={W} height={HALF_H} className="shrink-0 self-end" style={mirror ? { transform: "scaleX(-1)" } : undefined}>
      {currCenters.map((midY, i) => {
        const topY = prevCenters[i * 2];
        const botY = prevCenters[i * 2 + 1];
        const mx = W / 2;
        return (
          <g key={i}>
            <path d={`M 0 ${topY} H ${mx} V ${midY} H ${W}`} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
            <path d={`M 0 ${botY} H ${mx} V ${midY}`} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
}
