import { useMemo, useState } from "react";
import { ChevronDown, Trophy, Swords, Star } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMyPredictions, useMatches, useTeams, useJuegoPicks, useBonusPredictions, useBonusQuestions } from "@/lib/queries";
import { outcome, formatKickoff, STAGE_LABELS } from "@/lib/scoring";
import { resolveLabel } from "@/lib/bonusTally";

type ResultKind = "exact" | "outcome" | "wrong" | "pending";

const RESULT_STYLE: Record<ResultKind, { border: string; label: string }> = {
  exact: { border: "border-gold bg-gold/10", label: "Resultado exacto" },
  outcome: { border: "border-primary/40 bg-primary/5", label: "Acertaste el ganador" },
  wrong: { border: "border-border", label: "Fallado" },
  pending: { border: "border-border", label: "Pendiente" },
};

function SectionHeader({ icon: Icon, title, count, points, open, onToggle }: any) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 px-4 py-3 text-left"
    >
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="font-semibold text-sm flex-1">{title}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
      <span className="text-sm font-bold text-foreground tabular-nums">{points} pts</span>
      <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

export function MyStatsTab() {
  const { user } = useAuth();
  const { data: myPreds } = useMyPredictions(user?.id);
  const { data: matches } = useMatches();
  const { data: teams } = useTeams();
  const { data: juegoPicks } = useJuegoPicks(user?.id);
  const { data: myBonus } = useBonusPredictions(user?.id);
  const { data: bonusQs } = useBonusQuestions();
  const [open, setOpen] = useState<"matches" | "bonus" | "juego" | null>("matches");

  const matchMap = useMemo(() => {
    const m: Record<string, any> = {};
    (matches ?? []).forEach((x: any) => (m[x.id] = x));
    return m;
  }, [matches]);

  const matchRows = useMemo(() => {
    return (myPreds ?? [])
      .map((p: any) => {
        const m = matchMap[p.match_id];
        if (!m) return null;
        const finished = m.status === "finished" && m.home_score != null && m.away_score != null;
        let result: ResultKind = "pending";
        if (finished) {
          if (p.home_score === m.home_score && p.away_score === m.away_score) result = "exact";
          else if (outcome(p.home_score, p.away_score) === outcome(m.home_score, m.away_score)) result = "outcome";
          else result = "wrong";
        }
        return { match: m, pred: p, result, points: p.points_awarded ?? 0 };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (a.match.kickoff_at < b.match.kickoff_at ? 1 : -1));
  }, [myPreds, matchMap]);

  const bonusQMap = useMemo(() => {
    const m: Record<string, any> = {};
    (bonusQs ?? []).forEach((q: any) => (m[q.id] = q));
    return m;
  }, [bonusQs]);

  const bonusRows = useMemo(() => {
    return (myBonus ?? [])
      .map((p: any) => {
        const q = bonusQMap[p.bonus_id];
        if (!q) return null;
        return { question: q, pred: p, points: p.points_awarded ?? 0 };
      })
      .filter((r: any) => r && r.question)
      .sort((a: any, b: any) => b.points - a.points);
  }, [myBonus, bonusQMap]);

  const juegoRows = useMemo(
    () =>
      (juegoPicks ?? [])
        .map((p: any) => ({ pick: p, points: p.points_awarded ?? 0 }))
        .sort((a: any, b: any) => b.points - a.points),
    [juegoPicks]
  );

  const matchPoints = matchRows.reduce((s: number, r: any) => s + r.points, 0);
  const bonusPoints = bonusRows.reduce((s: number, r: any) => s + r.points, 0);
  const juegoPoints = juegoRows.reduce((s: number, r: any) => s + r.points, 0);
  const total = matchPoints + bonusPoints + juegoPoints;

  if (!user) return null;

  function answerLabel(p: any, kind: string) {
    const raws: string[] = Array.isArray(p?.answer?.values)
      ? p.answer.values.filter(Boolean)
      : p?.answer?.value != null && p.answer.value !== ""
      ? [p.answer.value]
      : p?.answer?.text
      ? [p.answer.text]
      : [];
    if (!raws.length) return "Sin respuesta";
    return raws.map((r) => resolveLabel(kind, r, teams ?? [], matches ?? [])).join(", ");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Tus puntos totales</p>
        <p className="display text-4xl text-foreground mt-1">{total}</p>
        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
          <span>Partidos: <b className="text-foreground">{matchPoints}</b></span>
          <span>Especiales: <b className="text-foreground">{bonusPoints}</b></span>
          <span>Juego: <b className="text-foreground">{juegoPoints}</b></span>
        </div>
      </div>

      {/* Partidos */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <SectionHeader
          icon={Trophy}
          title="Puntos por partido"
          count={`${matchRows.length} pronósticos`}
          points={matchPoints}
          open={open === "matches"}
          onToggle={() => setOpen(open === "matches" ? null : "matches")}
        />
        {open === "matches" && (
          <div className="border-t border-border px-3 py-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
            {matchRows.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Aún no tienes pronósticos.</p>
            ) : (
              matchRows.map((r: any) => (
                <div key={r.match.id} className={`rounded-lg border px-3 py-2 text-xs ${RESULT_STYLE[r.result].border}`}>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{formatKickoff(r.match.kickoff_at)} · {STAGE_LABELS[r.match.stage] ?? r.match.stage}</span>
                    <span className="flex items-center gap-1">
                      {(r.match.is_megapremium || r.match.is_premium) && (
                        <Star className={`h-3 w-3 ${r.match.is_megapremium ? "text-red-500 fill-red-500" : "text-gold fill-gold"}`} />
                      )}
                      <span className="font-bold text-foreground">{r.points} pts</span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between font-semibold text-foreground">
                    <span className="truncate">
                      {r.match.home?.name ?? r.match.home_label ?? "?"} {r.match.home_score ?? "–"}-{r.match.away_score ?? "–"} {r.match.away?.name ?? r.match.away_label ?? "?"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">
                    Tu pronóstico: <b className="text-foreground">{r.pred.home_score}-{r.pred.away_score}</b> · {RESULT_STYLE[r.result].label}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Especiales */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <SectionHeader
          icon={Star}
          title="Puntos por pronóstico especial"
          count={`${bonusRows.length} respuestas`}
          points={bonusPoints}
          open={open === "bonus"}
          onToggle={() => setOpen(open === "bonus" ? null : "bonus")}
        />
        {open === "bonus" && (
          <div className="border-t border-border px-3 py-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
            {bonusRows.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Aún no has respondido ningún especial.</p>
            ) : (
              bonusRows.map((r: any) => (
                <div
                  key={r.question.id}
                  className={`rounded-lg border px-3 py-2 text-xs ${r.points > 0 ? "border-emerald-500/50 bg-emerald-500/10" : "border-border"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground truncate">{r.question.label}</span>
                    <span className="font-bold text-foreground shrink-0 ml-2">{r.points} pts</span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">
                    Tu respuesta: <b className="text-foreground">{answerLabel(r.pred, r.question.kind)}</b>
                    {r.points > 0 && <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-bold">✓ Acertado</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Juego eliminatorias */}
      {juegoRows.length > 0 && (
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader
            icon={Swords}
            title="Puntos del Juego (Eliminatorias)"
            count={`${juegoRows.length} elecciones`}
            points={juegoPoints}
            open={open === "juego"}
            onToggle={() => setOpen(open === "juego" ? null : "juego")}
          />
          {open === "juego" && (
            <div className="border-t border-border px-3 py-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
              {juegoRows.map((r: any, i: number) => (
                <div
                  key={`${r.pick.stage}-${r.pick.bracket_position}`}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${r.points > 0 ? "border-emerald-500/50 bg-emerald-500/10" : "border-border"}`}
                >
                  <span className="text-muted-foreground">
                    {STAGE_LABELS[r.pick.stage] ?? r.pick.stage} · posición {r.pick.bracket_position}
                  </span>
                  <span className="font-semibold text-foreground">{r.pick.team_code}</span>
                  <span className="font-bold text-foreground">{r.points} pts</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
