import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, BarChart3 } from "lucide-react";
import { useMatches, useMyPredictions, useJuegoPicks, useAllJuegoPicks, useMatchPredictionStats } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KnockoutBracket, ROUNDS, type BracketSlot, type Champion } from "@/components/KnockoutBracket";
import { KnockoutMatchModal } from "@/components/KnockoutMatchModal";
import { JuegoBracket, type JuegoR32Slot } from "@/components/JuegoBracket";
import { EliminatoriasBonusTab } from "@/components/EliminatoriasBonusTab";
import eliminatoriasImg from "@/assets/Eliminatorias2.png";

// Puntos del Juego por ronda acertada: 1/2/4/6/10 — calculados en la base de datos (trigger),
// sin bonus extra por trayectoria.
const JUEGO_LOCK_DEADLINE = "2026-06-29T17:00:00Z"; // lunes 29 jun, 19:00 CEST

export const Route = createFileRoute("/eliminatorias")({
  component: Eliminatorias,
  validateSearch: (search: Record<string, unknown>) => ({
    reglas: search.reglas === true || search.reglas === "true",
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Eliminatorias · El Mundial" },
      { name: "description", content: "Cuadro de eliminatorias del Mundial 2026." },
    ],
  }),
});

const ALL_STAGE_KEYS = [...ROUNDS.map((r) => r.key), "third_place"] as const;

// Ganador oficial de un partido: primero el que fije el admin (winner_code), útil
// cuando hay empate a 90' y se decide en prórroga/penaltis; si no, el que marcó más.
function officialWinner(m: any): string | null {
  if (!m) return null;
  if (m.winner_code) return m.winner_code;
  if (m.home_score == null || m.away_score == null || m.home_score === m.away_score) return null;
  return m.home_score > m.away_score ? m.home_code : m.away_code;
}

type Match = any;
type Pred = { home_score: number; away_score: number };
type Stats = { home: number; draw: number; away: number; total: number };
type ModalState = {
  match: Match;
  roundLabel: string;
  matchNumber: number;
  pred?: Pred;
  stats?: Stats;
  demo?: boolean;
  stageKey?: string;
};

function Eliminatorias() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: matches } = useMatches();
  const { data: mine } = useMyPredictions(user?.id);
  const { data: juegoPicksRaw } = useJuegoPicks(user?.id);
  const { data: predStats } = useMatchPredictionStats();
  const { data: allJuegoPicks } = useAllJuegoPicks();

  const juegoFillCount = useMemo(() => {
    const ids = new Set((allJuegoPicks ?? []).map((p: any) => p.user_id));
    return ids.size;
  }, [allJuegoPicks]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const { reglas, tab: initialTab } = Route.useSearch();
  const [rulesOpen, setRulesOpen] = useState(reglas);

  // Primera visita a Eliminatorias: abrir las reglas automáticamente una sola vez
  useEffect(() => {
    if (reglas) return;
    if (localStorage.getItem("eliminatorias_rules_seen")) return;
    localStorage.setItem("eliminatorias_rules_seen", "1");
    setRulesOpen(true);
  }, [reglas]);
  const [simSlots, setSimSlots] = useState<Record<string, (BracketSlot | null)[]>>(SIM_SLOTS_INITIAL);

  const predMap = useMemo<Record<string, Pred>>(() => {
    const m: Record<string, Pred> = {};
    (mine ?? []).forEach((p: any) => (m[p.match_id] = { home_score: p.home_score, away_score: p.away_score }));
    return m;
  }, [mine]);

  const byStage = useMemo(() => {
    const all = (matches ?? []) as Match[];
    const out: Record<string, Match[]> = {};
    for (const key of ALL_STAGE_KEYS) {
      out[key] = all
        .filter((x) => x.stage === key)
        .sort((a, b) => {
          if (a.bracket_position != null && b.bracket_position != null) return a.bracket_position - b.bracket_position;
          return a.kickoff_at < b.kickoff_at ? -1 : 1;
        });
    }
    return out;
  }, [matches]);

  const cuadroSlots = useMemo(() => {
    const out: Record<string, (BracketSlot | null)[]> = {};
    for (const r of ROUNDS) {
      const arr = byStage[r.key] ?? [];
      out[r.key] = Array.from({ length: r.n }, (_, i) => {
        const m = arr[i];
        if (!m) return null;
        const pred = predMap[m.id];
        return {
          id: m.id,
          stageKey: r.key,
          homeCode: m.home_code,
          awayCode: m.away_code,
          homeName: m.home?.name ?? m.home_label ?? "Por definir",
          awayName: m.away?.name ?? m.away_label ?? "Por definir",
          scoreHome: pred?.home_score ?? null,
          scoreAway: pred?.away_score ?? null,
          officialHome: m.home_score ?? null,
          officialAway: m.away_score ?? null,
          officialWinnerCode: officialWinner(m),
          voteCount: predStats?.[m.id]?.total ?? 0,
          isPremium: m.is_premium,
          isMegapremium: m.is_megapremium,
          matchNumber: i + 1,
          raw: m,
        } as BracketSlot;
      });
    }
    return out;
  }, [byStage, predMap, predStats, isAdmin]);

  // Mismos partidos de dieciseisavos que el Cuadro (definidos por el admin) — el Juego no usa nada más
  const juegoR32 = useMemo<JuegoR32Slot[]>(() => {
    const arr = byStage["round_of_32"] ?? [];
    return Array.from({ length: 16 }, (_, i) => {
      const m = arr[i];
      if (!m) return { home: null, away: null };
      const home = m.home_code ? { code: m.home_code, name: m.home?.name ?? m.home_label ?? m.home_code } : null;
      const away = m.away_code ? { code: m.away_code, name: m.away?.name ?? m.away_label ?? m.away_code } : null;
      return { home, away };
    });
  }, [byStage]);

  const juegoPicksCount = juegoPicksRaw?.length ?? 0;
  const juegoComplete = juegoPicksCount >= 31;

  // Ganador real (oficial) de cada posición — solo para comparar una vez bloqueado el Juego
  const juegoActualWinners = useMemo(() => {
    const out: Partial<Record<string, (string | null)[]>> = {};
    for (const r of ROUNDS) {
      const arr = byStage[r.key] ?? [];
      out[r.key] = Array.from({ length: r.n }, (_, i) => officialWinner(arr[i]));
    }
    return out;
  }, [byStage]);

  // El Juego se bloquea entero a una hora fija: lunes 29/06 a las 19:00 CEST
  const juegoLocked = Date.now() >= new Date(JUEGO_LOCK_DEADLINE).getTime();

  // Puntos del Juego: los calcula la base de datos sola (trigger) en cuanto el
  // admin confirma un resultado — aquí solo los sumamos para mostrarlos.
  const juegoPoints = useMemo(
    () => (juegoPicksRaw ?? []).reduce((sum: number, p: any) => sum + (p.points_awarded ?? 0), 0),
    [juegoPicksRaw]
  );

  const thirdPlaceSlot = useMemo<BracketSlot | null>(() => {
    const m = (byStage["third_place"] ?? [])[0];
    if (!m) return null;
    const pred = predMap[m.id];
    return {
      id: m.id,
      stageKey: "third_place",
      homeCode: m.home_code,
      awayCode: m.away_code,
      homeName: m.home?.name ?? m.home_label ?? "Por definir",
      awayName: m.away?.name ?? m.away_label ?? "Por definir",
      scoreHome: pred?.home_score ?? null,
      scoreAway: pred?.away_score ?? null,
      officialHome: m.home_score ?? null,
      officialAway: m.away_score ?? null,
      officialWinnerCode: officialWinner(m),
      voteCount: predStats?.[m.id]?.total ?? 0,
      isPremium: m.is_premium,
      isMegapremium: m.is_megapremium,
      matchNumber: 1,
      raw: m,
    };
  }, [byStage, predMap, predStats, isAdmin]);

  // Campeón real: solo cuando la Final tiene ganador oficial (no el pronóstico)
  const champion = useMemo<Champion | null>(() => {
    const m = (byStage["final"] ?? [])[0];
    const win = officialWinner(m);
    if (!win) return null;
    return win === m.home_code
      ? { code: m.home_code, name: m.home?.name ?? m.home_label ?? "?" }
      : { code: m.away_code, name: m.away?.name ?? m.away_label ?? "?" };
  }, [byStage]);

  const simChampion = useMemo<Champion | null>(() => {
    const f = (simSlots["final"] ?? [])[0];
    if (!f || f.scoreHome == null || f.scoreAway == null || f.scoreHome === f.scoreAway) return null;
    return f.scoreHome > f.scoreAway
      ? { code: f.homeCode, name: f.homeName }
      : { code: f.awayCode, name: f.awayName };
  }, [simSlots]);

  if (!user) return null;

  const onSaved = () => qc.invalidateQueries({ queryKey: ["my_predictions", user.id] });
  const onJuegoSaved = () => qc.invalidateQueries({ queryKey: ["juego_picks", user.id] });

  function roundLabelFor(stageKey?: string) {
    if (stageKey === "third_place") return "3er puesto";
    return ROUNDS.find((r) => r.key === stageKey)?.label ?? "Eliminatoria";
  }

  // Tab "Cuadro": partidos reales — solo se puede abrir si ya existe el partido en BD
  function openSlot(slot: BracketSlot) {
    if (!slot.raw) return;
    setModal({
      match: slot.raw,
      roundLabel: roundLabelFor(slot.stageKey),
      matchNumber: slot.matchNumber,
      pred: predMap[slot.raw.id],
      stats: predStats?.[slot.raw.id],
    });
  }

  // Tab "Simulación": datos de ejemplo — se puede abrir y editar, pero no se guarda en BD
  function openSimSlot(slot: BracketSlot) {
    const fakeMatch = {
      id: `sim-${slot.stageKey}-${slot.matchNumber}`,
      kickoff_at: new Date(Date.now() + 86400000).toISOString(),
      home_code: slot.homeCode,
      away_code: slot.awayCode,
      home_label: slot.homeName,
      away_label: slot.awayName,
      is_premium: slot.isPremium,
      predictions_locked: false,
    };
    setModal({
      match: fakeMatch,
      roundLabel: roundLabelFor(slot.stageKey),
      matchNumber: slot.matchNumber,
      pred: slot.scoreHome != null && slot.scoreAway != null ? { home_score: slot.scoreHome, away_score: slot.scoreAway } : undefined,
      demo: true,
      stageKey: slot.stageKey,
    });
  }

  function onDemoSaved(score?: Pred) {
    if (!score || !modal?.stageKey) return;
    setSimSlots((prev) => {
      const arr = [...(prev[modal.stageKey!] ?? [])];
      const idx = arr.findIndex((s) => s?.matchNumber === modal.matchNumber);
      if (idx >= 0 && arr[idx]) {
        arr[idx] = { ...arr[idx]!, scoreHome: score.home_score, scoreAway: score.away_score };
      }
      return { ...prev, [modal.stageKey!]: arr };
    });
  }

  return (
    <div className="-mx-4 -mt-6 px-4 pt-6 relative">
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div
          className="h-full w-full opacity-60"
          style={{
            backgroundImage: `url(${eliminatoriasImg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </div>

      <div className="relative z-10 space-y-5">
      {/* Header */}
      <div className="relative text-center pt-1">
        <div className="absolute right-0 top-0 flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="flex items-center gap-1 rounded-full border border-emerald-600 bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-700 transition-colors shadow-soft"
          >
            <BookOpen className="h-3 w-3 shrink-0" />
            <span className="flex flex-col items-start leading-[1.05]">
              <span className="text-[8px] font-medium">Nuevas</span>
              <span className="text-[10px] font-bold">Reglas</span>
            </span>
          </button>
          <Link
            to="/estadisticas"
            className="flex items-center gap-0.5 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-soft"
          >
            <BarChart3 className="h-3 w-3" /> Estadísticas
          </Link>
        </div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Mundial 2026</div>
        <h1 className="display text-4xl">FASE FINAL</h1>
        <p className="mt-1.5 text-[11px] text-foreground font-semibold">Resultado hasta el min <span className="text-red-600">90</span> (sin penaltis).</p>
      </div>

      <Tabs defaultValue={initialTab ?? "cuadro"} className="space-y-4">
        <TabsList className={`grid w-full h-auto p-1 gap-1 ${isAdmin ? "grid-cols-4" : "grid-cols-3"}`}>
          <TabsTrigger value="cuadro" className="py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            Cuadro
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="simulacion" className="py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
              Simulación
            </TabsTrigger>
          )}
          <TabsTrigger value="juego" className="py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            Juego
          </TabsTrigger>
          <TabsTrigger value="bonus" className="py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            BONUS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cuadro" className="mt-4">
          <div className="rounded-2xl border border-border bg-muted/20 p-3">
            <KnockoutBracket slotsByStage={cuadroSlots} onSelect={openSlot} thirdPlaceSlot={thirdPlaceSlot} champion={champion} />
          </div>
          <p className="mt-2 text-center text-xs text-foreground/80 bg-card/90 rounded-lg py-1.5 px-2 shadow-soft">
            Toca un partido para hacer o editar tu pronóstico. Desliza para ver el cuadro completo.
          </p>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="simulacion" className="mt-4">
            <div className="rounded-2xl border border-border bg-muted/20 p-3">
              <KnockoutBracket slotsByStage={simSlots} onSelect={openSimSlot} champion={simChampion} />
            </div>
            <p className="mt-2 text-center text-xs text-foreground/80 bg-card/90 rounded-lg py-1.5 px-2 shadow-soft">
              Ejemplo visual de cómo se verá el cuadro una vez completado. Toca un partido para ver cómo se vería el modal — no cuenta para puntos.
            </p>
          </TabsContent>
        )}

        <TabsContent value="juego" className="mt-4">
          {isAdmin && (
            <div className="flex items-center justify-center gap-1.5 mb-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 py-1.5 text-[11px]">
              <span className="font-medium text-muted-foreground">Han rellenado el Juego:</span>
              <span className="font-black text-foreground">{juegoFillCount}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mb-3 rounded-xl border border-gold/40 bg-gold/10 py-2.5">
            <span className="text-xs font-bold uppercase tracking-widest text-gold">Tus puntos del Juego</span>
            <span className="display text-2xl text-foreground leading-none">{juegoPoints}</span>
          </div>
          {!juegoLocked && (
            <div
              className={`flex items-center justify-center gap-1.5 mb-3 rounded-lg py-1.5 text-xs font-semibold ${
                juegoComplete
                  ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              {juegoComplete
                ? "✓ Cuadro completo — todas tus elecciones están guardadas"
                : `Llevas ${juegoPicksCount}/31 elecciones guardadas — se guardan solas al tocar cada partido`}
            </div>
          )}
          <div className="rounded-2xl border border-border bg-muted/20 p-3">
            <JuegoBracket
              r32={juegoR32}
              locked={juegoLocked}
              savedPicks={juegoPicksRaw ?? []}
              actualWinners={juegoActualWinners}
              onSaved={onJuegoSaved}
            />
          </div>
          <p className="mt-2 text-center text-xs text-foreground/80 bg-card/90 rounded-lg py-1.5 px-2 shadow-soft">
            {juegoLocked
              ? "El cuadro está bloqueado. Compara tus elecciones con los resultados reales a medida que se juegan las rondas."
              : "Elige quién pasa de ronda en cada partido. Se bloqueará el lunes 29/06 a las 19:00."}
          </p>
        </TabsContent>

        <TabsContent value="bonus" className="mt-4">
          <EliminatoriasBonusTab />
        </TabsContent>
      </Tabs>

      {modal && (
        <KnockoutMatchModal
          match={modal.match}
          roundLabel={modal.roundLabel}
          matchNumber={modal.matchNumber}
          pred={modal.pred}
          stats={modal.stats}
          demo={modal.demo}
          onClose={() => setModal(null)}
          onSaved={modal.demo ? onDemoSaved : onSaved}
        />
      )}

      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="display text-2xl flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Reglas · Fase Final
            </DialogTitle>
            <DialogDescription className="sr-only">Reglas de Bonus y Juego en eliminatorias</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-foreground">
            <p className="text-muted-foreground">
              En la pestaña <strong>Eliminatorias</strong> hay tres formas de ganar puntos extra: el <strong>Cuadro</strong> (pronósticos reales), las preguntas <strong>BONUS</strong> y el <strong>Juego</strong> (tu propio cuadro).
            </p>

            <div>
              <h3 className="font-bold text-base mb-1">🏟️ Cuadro</h3>
              <p className="text-muted-foreground">
                Toca cualquier partido del cuadro para hacer tu pronóstico de marcador, igual que en la fase de grupos. Ahí también verás el porcentaje de votos de los demás participantes.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-1">🔴 MEGAPREMIUM</h3>
              <p className="text-muted-foreground">
                Algunos partidos especialmente importantes se marcan en <strong className="text-red-600 dark:text-red-400">rojo</strong> como MEGAPREMIUM: <strong className="text-foreground">3 puntos</strong> por resultado correcto y <strong className="text-foreground">9 puntos</strong> por marcador exacto (el triple de lo normal).
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-1">⭐ BONUS de eliminatorias</h3>
              <p className="text-muted-foreground">
                Responde preguntas extra sobre la fase final (goleador, sorpresas, tarjetas...). Cada pregunta tiene su propia puntuación según la dificultad. Una vez cerrado el plazo, no se pueden editar las respuestas.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-1">🏆 Juego (tu cuadro)</h3>
              <p className="text-muted-foreground mb-2">
                Completa tu propio cuadro de eliminatorias eligiendo quién pasa de ronda en cada partido. Se bloqueará el <strong>lunes 29/06 a las 19:00</strong> — después no se puede editar.
              </p>
              <p className="text-muted-foreground mb-1">Puntos por acierto:</p>
              <ul className="text-muted-foreground space-y-0.5 pl-1">
                <li>• Equipo acertado en dieciseisavos: <strong className="text-foreground">1 punto</strong></li>
                <li>• Equipo acertado en octavos: <strong className="text-foreground">2 puntos</strong></li>
                <li>• Equipo acertado en cuartos: <strong className="text-foreground">4 puntos</strong></li>
                <li>• Equipo acertado en semifinales: <strong className="text-foreground">6 puntos</strong></li>
                <li>• Campeón acertado: <strong className="text-foreground">10 puntos</strong></li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground border-t border-border pt-3">
              Los puntos del Juego se suman solos: cada vez que se confirma quién pasa de ronda, tus aciertos se recalculan al momento. El número que ves en "Tus puntos del Juego" está siempre actualizado.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

// ── Datos de ejemplo para la pestaña Simulación ──────────────
const TEAM_ES: Record<string, string> = {
  NED: "Países Bajos", USA: "EE.UU.", ARG: "Argentina", AUS: "Australia",
  JPN: "Japón", CRO: "Croacia", BRA: "Brasil", KOR: "Corea del Sur",
  ENG: "Inglaterra", SEN: "Senegal", FRA: "Francia", NOR: "Noruega",
  MAR: "Marruecos", ESP: "España", POR: "Portugal", SUI: "Suiza",
  GER: "Alemania", MEX: "México", BEL: "Bélgica", COL: "Colombia",
  URU: "Uruguay", CPV: "Cabo Verde", ECU: "Ecuador", CIV: "Costa de Marfil",
  SWE: "Suecia", TUN: "Túnez", UZB: "Uzbekistán", GHA: "Ghana",
  CAN: "Canadá", PAN: "Panamá", QAT: "Catar", BIH: "Bosnia",
};

function sim(stageKey: string, home: string, away: string, sh: number, sa: number, num: number, premium = false): BracketSlot {
  return {
    stageKey,
    homeCode: home,
    awayCode: away,
    homeName: TEAM_ES[home] ?? home,
    awayName: TEAM_ES[away] ?? away,
    scoreHome: sh,
    scoreAway: sa,
    isPremium: premium,
    matchNumber: num,
  };
}

const SIM_SLOTS_INITIAL: Record<string, (BracketSlot | null)[]> = {
  round_of_32: [
    { ...sim("round_of_32", "NED", "USA", 3, 1, 1), officialHome: 3, officialAway: 1 }, // ejemplo: acierto exacto
    { ...sim("round_of_32", "ARG", "AUS", 2, 0, 2), officialHome: 3, officialAway: 0 }, // ejemplo: acierto de resultado
    { ...sim("round_of_32", "JPN", "CRO", 2, 1, 3), officialHome: 1, officialAway: 2 }, // ejemplo: fallo
    sim("round_of_32", "BRA", "KOR", 4, 1, 4),
    sim("round_of_32", "ENG", "SEN", 3, 1, 5), sim("round_of_32", "FRA", "NOR", 3, 0, 6),
    sim("round_of_32", "MAR", "ESP", 2, 1, 7), sim("round_of_32", "POR", "SUI", 2, 0, 8),
    sim("round_of_32", "GER", "MEX", 2, 0, 9), sim("round_of_32", "BEL", "COL", 2, 1, 10),
    sim("round_of_32", "URU", "CPV", 1, 0, 11), sim("round_of_32", "ECU", "CIV", 2, 1, 12),
    sim("round_of_32", "SWE", "TUN", 1, 0, 13), sim("round_of_32", "GHA", "UZB", 2, 0, 14),
    sim("round_of_32", "CAN", "PAN", 1, 0, 15), sim("round_of_32", "BIH", "QAT", 1, 0, 16),
  ],
  round_of_16: [
    sim("round_of_16", "NED", "ARG", 2, 1, 1), sim("round_of_16", "JPN", "BRA", 1, 3, 2),
    sim("round_of_16", "ENG", "FRA", 2, 1, 3), sim("round_of_16", "MAR", "POR", 0, 1, 4),
    sim("round_of_16", "GER", "BEL", 2, 0, 5), sim("round_of_16", "URU", "ECU", 1, 2, 6),
    sim("round_of_16", "SWE", "GHA", 1, 0, 7), sim("round_of_16", "CAN", "BIH", 0, 1, 8),
  ],
  quarter_final: [
    sim("quarter_final", "NED", "BRA", 2, 1, 1, true), sim("quarter_final", "ENG", "POR", 1, 0, 2, true),
    sim("quarter_final", "GER", "ECU", 3, 1, 3, true), sim("quarter_final", "SWE", "BIH", 0, 2, 4, true),
  ],
  semi_final: [
    sim("semi_final", "NED", "ENG", 2, 1, 1, true), sim("semi_final", "GER", "BIH", 1, 0, 2, true),
  ],
  final: [sim("final", "NED", "GER", 2, 1, 1, true)],
};
