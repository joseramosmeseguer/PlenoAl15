import { useMemo } from "react";
import { Trophy, Star } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMyClubPredictions, useClubMatches } from "@/lib/queries";
import { getLaLigaTeamDisplayName } from "@/lib/laligaTeams";

type ResultKind = "exact" | "outcome" | "wrong" | "pending";

const RESULT_STYLE: Record<ResultKind, { border: string; label: string }> = {
  exact: { border: "border-gold bg-gold/10", label: "Marcador exacto" },
  outcome: { border: "border-primary/40 bg-primary/5", label: "Acertaste el resultado" },
  wrong: { border: "border-border", label: "Fallado" },
  pending: { border: "border-border", label: "Pendiente" },
};

function outcomeOf(h: number, a: number) {
  return h > a ? "H" : h < a ? "A" : "D";
}

export function MyLaLigaStats() {
  const { user } = useAuth();
  const { data: myPreds } = useMyClubPredictions(user?.id);
  const { data: matches } = useClubMatches();

  const matchMap = useMemo(() => {
    const m: Record<number, any> = {};
    (matches ?? []).forEach((x: any) => (m[x.id] = x));
    return m;
  }, [matches]);

  const rows = useMemo(() => {
    return (myPreds ?? [])
      .map((p: any) => {
        const m = matchMap[p.match_id];
        if (!m) return null;
        const isFinished = m.status === "FINISHED" && m.home_score != null;
        let result: ResultKind = "pending";
        if (isFinished) {
          if (p.home_score === m.home_score && p.away_score === m.away_score) result = "exact";
          else if (outcomeOf(p.home_score, p.away_score) === outcomeOf(m.home_score, m.away_score)) result = "outcome";
          else result = "wrong";
        }
        return { match: m, pred: p, result, points: p.points_awarded ?? 0 };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (a.match.utc_date < b.match.utc_date ? 1 : -1));
  }, [myPreds, matchMap]);

  const totalPoints = rows.reduce((s: number, r: any) => s + r.points, 0);
  const exactCount = rows.filter((r: any) => r.result === "exact").length;
  const outcomeCount = rows.filter((r: any) => r.result === "outcome").length;
  const wrongCount = rows.filter((r: any) => r.result === "wrong").length;

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Tus puntos de LaLiga</p>
        <p className="display text-4xl text-foreground mt-1">{totalPoints}</p>
        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
          <span>Exactos: <b className="text-foreground">{exactCount}</b></span>
          <span>Resultado: <b className="text-foreground">{outcomeCount}</b></span>
          <span>Fallados: <b className="text-foreground">{wrongCount}</b></span>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm flex-1">Tus pronósticos</span>
          <span className="text-xs text-muted-foreground">{rows.length}</span>
        </div>
        <div className="px-3 py-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Aún no tienes pronósticos.</p>
          ) : (
            rows.map((r: any) => (
              <div key={r.match.id} className={`rounded-lg border px-3 py-2 text-xs ${RESULT_STYLE[r.result].border}`}>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Jornada {r.match.matchday}</span>
                  <span className="flex items-center gap-1">
                    {(r.match.is_megapremium || r.match.is_premium) && (
                      <Star className={`h-3 w-3 ${r.match.is_megapremium ? "text-red-500 fill-red-500" : "text-gold fill-gold"}`} />
                    )}
                    <span className="font-bold text-foreground">{r.points} pts</span>
                  </span>
                </div>
                <div className="mt-1 font-semibold text-foreground truncate">
                  {getLaLigaTeamDisplayName(r.match.home?.name)} {r.match.home_score ?? "–"}-{r.match.away_score ?? "–"} {getLaLigaTeamDisplayName(r.match.away?.name)}
                </div>
                <div className="mt-0.5 text-muted-foreground">
                  Tu pronóstico: <b className="text-foreground">{r.pred.home_score}-{r.pred.away_score}</b> · {RESULT_STYLE[r.result].label}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
