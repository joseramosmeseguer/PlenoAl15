import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Check, X, Lock } from "lucide-react";
import { getFlagUrl } from "@/lib/flags";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type JuegoTeam = { code: string; name: string };
type Team = JuegoTeam;
type Winner = "home" | "away" | null;

const STAGES = [
  { key: "round_of_32",   label: "Dieciseisavos", n: 16 },
  { key: "round_of_16",   label: "Octavos",       n: 8 },
  { key: "quarter_final", label: "Cuartos",       n: 4 },
  { key: "semi_final",    label: "Semifinal",     n: 2 },
  { key: "final",         label: "Final",         n: 1 },
] as const;
type StageKey = (typeof STAGES)[number]["key"];
const HALF_STAGES = STAGES.slice(0, 4);


const CARD_H = 68; // alto natural de una tarjeta
// Hueco entre tarjetas — misma estructura que el Cuadro, un poco más de aire en octavos/cuartos
const GAP_BY_STAGE: Record<string, number> = {
  round_of_32: 8,
  round_of_16: 16,
  quarter_final: 22,
  semi_final: 22,
};
const HALF_H = (HALF_STAGES[0].n / 2) * CARD_H + (HALF_STAGES[0].n / 2 - 1) * GAP_BY_STAGE.round_of_32;

// Centros verticales de cada tarjeta de una ronda, agrupados y centrados dentro de HALF_H
// (en vez de repartir cada ronda en todo el alto, lo que separaba mucho octavos/cuartos)
function centersFor(sideN: number, gap: number): number[] {
  const naturalH = sideN * CARD_H + (sideN - 1) * gap;
  const offset = (HALF_H - naturalH) / 2;
  return Array.from({ length: sideN }, (_, i) => offset + i * (CARD_H + gap) + CARD_H / 2);
}

type JMatch = { home: Team | null; away: Team | null; winner: Winner };
type PicksMap = Partial<Record<StageKey, Record<number, Winner>>>;

export type JuegoR32Slot = { home: JuegoTeam | null; away: JuegoTeam | null };
export type SavedPick = { stage: string; bracket_position: number; team_code: string };

function deriveMatches(
  picks: PicksMap,
  r32: JuegoR32Slot[],
  actualWinners?: Partial<Record<StageKey, (string | null)[]>>
): Record<StageKey, JMatch[]> {
  const out = {} as Record<StageKey, JMatch[]>;
  out.round_of_32 = r32.map(({ home, away }, i) => ({
    home,
    away,
    winner: picks.round_of_32?.[i] ?? null,
  }));
  for (let s = 1; s < STAGES.length; s++) {
    const stage = STAGES[s].key;
    const prevStage = STAGES[s - 1].key;
    const prevMatches = out[prevStage];
    const prevActual = actualWinners?.[prevStage];
    const n = prevMatches.length / 2;
    out[stage] = Array.from({ length: n }, (_, i) => {
      const m1 = prevMatches[i * 2];
      const m2 = prevMatches[i * 2 + 1];
      // Prioridad: lo que el usuario eligió (para poder comparar su cuadro vs la
      // realidad, igual que siempre). Solo si NO eligió nada — porque el partido ya
      // estaba decidido y bloqueado cuando rellenó — se usa el resultado real, para
      // que pueda seguir completando el resto del cuadro a partir de ahí.
      const actual1 = prevActual?.[i * 2];
      const actual2 = prevActual?.[i * 2 + 1];
      const eff1: Winner = m1.winner ?? (actual1 ? (m1.home?.code === actual1 ? "home" : m1.away?.code === actual1 ? "away" : null) : null);
      const eff2: Winner = m2.winner ?? (actual2 ? (m2.home?.code === actual2 ? "home" : m2.away?.code === actual2 ? "away" : null) : null);
      const home = eff1 ? (eff1 === "home" ? m1.home : m1.away) : null;
      const away = eff2 ? (eff2 === "home" ? m2.home : m2.away) : null;
      return { home, away, winner: picks[stage]?.[i] ?? null };
    });
  }
  return out;
}

// Reconstruye qué lado (home/away) eligió el usuario en cada ronda a partir de
// los códigos de selección guardados, recorriendo el cuadro ronda a ronda.
function hydratePicks(saved: SavedPick[], r32: JuegoR32Slot[]): PicksMap {
  const savedMap: Record<string, string> = {};
  saved.forEach((s) => (savedMap[`${s.stage}-${s.bracket_position}`] = s.team_code));

  const picks: PicksMap = {};
  let prevMatches: JMatch[] = r32.map(({ home, away }) => ({ home, away, winner: null }));

  picks.round_of_32 = {};
  prevMatches.forEach((m, i) => {
    const code = savedMap[`round_of_32-${i + 1}`];
    if (!code) return;
    if (m.home?.code === code) picks.round_of_32![i] = "home";
    else if (m.away?.code === code) picks.round_of_32![i] = "away";
  });
  prevMatches = prevMatches.map((m, i) => ({ ...m, winner: picks.round_of_32![i] ?? null }));

  for (let s = 1; s < STAGES.length; s++) {
    const stage = STAGES[s].key;
    const n = prevMatches.length / 2;
    const thisRound: JMatch[] = Array.from({ length: n }, (_, i) => {
      const m1 = prevMatches[i * 2];
      const m2 = prevMatches[i * 2 + 1];
      const home = m1.winner ? (m1.winner === "home" ? m1.home : m1.away) : null;
      const away = m2.winner ? (m2.winner === "home" ? m2.home : m2.away) : null;
      return { home, away, winner: null };
    });
    picks[stage] = {};
    thisRound.forEach((m, i) => {
      const code = savedMap[`${stage}-${i + 1}`];
      if (!code) return;
      if (m.home?.code === code) picks[stage]![i] = "home";
      else if (m.away?.code === code) picks[stage]![i] = "away";
    });
    prevMatches = thisRound.map((m, i) => ({ ...m, winner: picks[stage]![i] ?? null }));
  }
  return picks;
}

export function JuegoBracket({
  r32,
  locked,
  savedPicks,
  actualWinners,
  onSaved,
}: {
  r32: JuegoR32Slot[];
  locked: boolean;
  savedPicks: SavedPick[];
  actualWinners?: Partial<Record<StageKey, (string | null)[]>>;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [picks, setPicks] = useState<PicksMap>({});
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (savedPicks.length === 0) return;
    setPicks(hydratePicks(savedPicks, r32));
    hydratedRef.current = true;
  }, [savedPicks, r32]);

  const matches = useMemo(() => deriveMatches(picks, r32, actualWinners), [picks, r32, actualWinners]);

  async function pick(stage: StageKey, matchIndex: number, side: "home" | "away") {
    if (locked || !user) return;
    const match = matches[stage][matchIndex];
    const winnerTeam = side === "home" ? match.home : match.away;
    if (!winnerTeam) return;

    const stageOrder = STAGES.findIndex((s) => s.key === stage);
    const laterStages = STAGES.slice(stageOrder + 1).map((s) => s.key);

    setPicks((prev) => {
      const next: PicksMap = {};
      for (let i = 0; i <= stageOrder; i++) {
        const k = STAGES[i].key;
        next[k] = { ...(prev[k] ?? {}) };
      }
      next[stage]![matchIndex] = side;
      return next;
    });

    const { error } = await (supabase as any)
      .from("juego_picks")
      .upsert({ user_id: user.id, stage, bracket_position: matchIndex + 1, team_code: winnerTeam.code });
    if (error) { toast.error(error.message); return; }
    if (laterStages.length) {
      await (supabase as any).from("juego_picks").delete().eq("user_id", user.id).in("stage", laterStages);
    }
    toast.success("Guardado", { duration: 1200 });
    onSaved?.();
  }

  const finalMatch = matches.final[0];
  const champion = finalMatch.winner ? (finalMatch.winner === "home" ? finalMatch.home : finalMatch.away) : null;

  const centersByStage = useMemo(() => {
    const out: Record<string, number[]> = {};
    HALF_STAGES.forEach((stage) => (out[stage.key] = centersFor(stage.n / 2, GAP_BY_STAGE[stage.key])));
    return out;
  }, []);

  const leftCols: ReactNode[] = [];
  HALF_STAGES.forEach((stage, si) => {
    const sideN = stage.n / 2;
    const slice = matches[stage.key].slice(0, sideN);
    const actualSlice = actualWinners?.[stage.key]?.slice(0, sideN);
    leftCols.push(
      <PickColumn key={`l-${stage.key}`} label={stage.label} centers={centersByStage[stage.key]} matches={slice} actuals={actualSlice} stage={stage.key} indexOffset={0} onPick={pick} locked={locked} />
    );
    if (si < HALF_STAGES.length - 1) {
      const nextStage = HALF_STAGES[si + 1];
      leftCols.push(<Connector key={`cl-${si}`} prevCenters={centersByStage[stage.key]} currCenters={centersByStage[nextStage.key]} />);
    }
  });

  const rightCols: ReactNode[] = [];
  const reversedHalf = [...HALF_STAGES].reverse();
  reversedHalf.forEach((stage, si) => {
    const sideN = stage.n / 2;
    const slice = matches[stage.key].slice(sideN, sideN * 2);
    const actualSlice = actualWinners?.[stage.key]?.slice(sideN, sideN * 2);
    if (si > 0) {
      const prevStage = reversedHalf[si - 1];
      rightCols.push(<Connector key={`cr-${si}`} prevCenters={centersByStage[stage.key]} currCenters={centersByStage[prevStage.key]} mirror />);
    }
    rightCols.push(
      <PickColumn key={`r-${stage.key}`} label={stage.label} centers={centersByStage[stage.key]} matches={slice} actuals={actualSlice} stage={stage.key} indexOffset={sideN} onPick={pick} locked={locked} />
    );
  });

  const finalActual = actualWinners?.final?.[0];

  return (
    <div className="space-y-2">
      {locked && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> Cuadro bloqueado — ya no se puede cambiar
        </div>
      )}
      <div className="overflow-x-auto pb-4">
        <div className="inline-flex items-start gap-3 px-1" style={{ minWidth: "max-content" }}>
          {leftCols}
          <div className="flex flex-col shrink-0 items-center self-center gap-5 px-4 py-6">
            <div className="flex flex-col items-center gap-2">
              <div className="text-xs font-bold uppercase tracking-widest text-primary whitespace-nowrap">Final</div>
              <PickCard match={finalMatch} big onPick={(side) => pick("final", 0, side)} locked={locked} actualWinnerCode={finalActual} />
            </div>
            {champion && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-gold/50 bg-gradient-to-b from-gold/20 to-gold/5 px-5 py-4 shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gold">🏆 Campeón</span>
                <FlagCircle code={champion.code} big />
                <span className="text-sm font-bold text-foreground">{champion.name}</span>
              </div>
            )}
          </div>
          {rightCols}
        </div>
      </div>
    </div>
  );
}

function PickColumn({
  label,
  centers,
  matches,
  actuals,
  stage,
  indexOffset,
  onPick,
  locked,
}: {
  label: string;
  centers: number[];
  matches: JMatch[];
  actuals?: (string | null)[];
  stage: StageKey;
  indexOffset: number;
  onPick: (stage: StageKey, idx: number, side: "home" | "away") => void;
  locked: boolean;
}) {
  return (
    <div className="flex flex-col shrink-0">
      <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        {label}
      </div>
      <div className="relative px-3" style={{ height: HALF_H, width: 150 + 24 }}>
        {centers.map((center, i) => (
          <div key={i} className="absolute left-3 right-3" style={{ top: center - CARD_H / 2 }}>
            <PickCard match={matches[i]} onPick={(side) => onPick(stage, indexOffset + i, side)} locked={locked} actualWinnerCode={actuals?.[i]} />
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

function TeamRow({
  team,
  picked,
  eliminated,
  disabled,
  onClick,
  big,
  result,
}: {
  team: Team | null;
  picked: boolean;
  eliminated: boolean;
  disabled: boolean;
  onClick: () => void;
  big?: boolean;
  result?: "correct" | "wrong";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 ${big ? "py-2.5" : "py-1.5"} text-left transition-colors disabled:cursor-default ${
        result === "correct" ? "bg-emerald-50 dark:bg-emerald-950/30"
        : result === "wrong" ? "bg-red-50 dark:bg-red-950/30"
        : picked ? "bg-emerald-50 dark:bg-emerald-950/30" : "hover:bg-muted/60"
      } ${eliminated ? "opacity-40" : ""}`}
    >
      <FlagCircle code={team?.code} big={big} />
      <span
        className={`flex-1 truncate font-medium ${big ? "text-sm" : "text-[11px]"} ${
          eliminated
            ? "line-through text-muted-foreground"
            : result === "correct" ? "text-emerald-700 dark:text-emerald-400"
            : result === "wrong" ? "text-red-700 dark:text-red-400"
            : team
            ? picked
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-foreground"
            : "text-muted-foreground"
        }`}
      >
        {team?.name ?? "Por definir"}
      </span>
      {result === "correct" && <Check className={`shrink-0 ${big ? "h-4 w-4" : "h-3 w-3"} text-emerald-600 dark:text-emerald-400`} />}
      {result === "wrong" && <X className={`shrink-0 ${big ? "h-4 w-4" : "h-3 w-3"} text-red-600 dark:text-red-400`} />}
      {!result && picked && <Check className={`shrink-0 ${big ? "h-4 w-4" : "h-3 w-3"} text-emerald-600 dark:text-emerald-400`} />}
    </button>
  );
}

function PickCard({
  match,
  onPick,
  big = false,
  locked,
  actualWinnerCode,
}: {
  match: JMatch;
  onPick: (side: "home" | "away") => void;
  big?: boolean;
  locked?: boolean;
  actualWinnerCode?: string | null;
}) {
  const w = big ? "w-[220px]" : "w-[150px]";
  const decided = !!match.winner;
  // Si el partido real ya tiene resultado oficial, no se puede elegir (ni cambiar):
  // sería elegir a ganador seguro a posteriori.
  const canPick = !!match.home && !!match.away && !locked && !actualWinnerCode;

  function resultFor(team: Team | null, isPicked: boolean): "correct" | "wrong" | undefined {
    if (!actualWinnerCode) return undefined;
    if (team?.code === actualWinnerCode) return "correct";
    if (isPicked) return "wrong";
    return undefined;
  }

  return (
    <div
      className={`${w} overflow-hidden rounded-xl border bg-card divide-y divide-border/60 shadow-sm ${
        decided ? "border-emerald-400/50" : "border-border"
      }`}
    >
      <TeamRow
        team={match.home}
        picked={match.winner === "home"}
        eliminated={decided && match.winner !== "home"}
        disabled={!canPick}
        onClick={() => onPick("home")}
        big={big}
        result={resultFor(match.home, match.winner === "home")}
      />
      <TeamRow
        team={match.away}
        picked={match.winner === "away"}
        eliminated={decided && match.winner !== "away"}
        disabled={!canPick}
        onClick={() => onPick("away")}
        big={big}
        result={resultFor(match.away, match.winner === "away")}
      />
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
