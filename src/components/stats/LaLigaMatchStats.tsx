import { useMemo, useState } from "react";
import { useClubMatches, useAllClubPredictions } from "@/lib/queries";
import { getLaLigaTeamDisplayName } from "@/lib/laligaTeams";
import { ChevronDown } from "lucide-react";

function crestUrl(teamId?: number | null) {
  return teamId ? `/images/crests/${teamId}.png` : null;
}

function outcomeOf(h: number, a: number) {
  return h > a ? "H" : h < a ? "A" : "D";
}

function finished(m: any) {
  return m.status === "FINISHED" && m.home_score != null && m.away_score != null;
}

export function LaLigaMatchStats() {
  const { data: matches } = useClubMatches();
  const { data: preds } = useAllClubPredictions();

  const finishedMatches = useMemo(
    () => (matches ?? []).filter(finished).sort((a: any, b: any) => +new Date(b.utc_date) - +new Date(a.utc_date)),
    [matches],
  );

  const predsByMatch = useMemo(() => {
    const map: Record<number, any[]> = {};
    (preds ?? []).forEach((p: any) => (map[p.match_id] ||= []).push(p));
    return map;
  }, [preds]);

  if (finishedMatches.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Aún no hay partidos jugados.</p>;
  }

  return (
    <div className="space-y-2">
      {finishedMatches.map((m: any) => (
        <MatchStatRow key={m.id} match={m} preds={predsByMatch[m.id] ?? []} />
      ))}
    </div>
  );
}

function computeStats(preds: any[], m: any) {
  const total = preds.length;
  let h = 0, d = 0, a = 0, exactCount = 0, outcomeCount = 0;
  const scoreCounts: Record<string, number> = {};
  const realOutcome = outcomeOf(m.home_score, m.away_score);

  preds.forEach((p: any) => {
    const o = outcomeOf(p.home_score, p.away_score);
    if (o === "H") h++; else if (o === "A") a++; else d++;
    const key = `${p.home_score}-${p.away_score}`;
    scoreCounts[key] = (scoreCounts[key] ?? 0) + 1;
    if (p.home_score === m.home_score && p.away_score === m.away_score) exactCount++;
    else if (o === realOutcome) outcomeCount++;
  });

  const sortedScores = Object.entries(scoreCounts).sort(([, x], [, y]) => y - x);
  return {
    total,
    pctH: total ? Math.round((h / total) * 100) : 0,
    pctD: total ? Math.round((d / total) * 100) : 0,
    pctA: total ? Math.round((a / total) * 100) : 0,
    mostCommon: sortedScores[0]?.[0] ?? null,
    mostCommonCount: sortedScores[0]?.[1] ?? 0,
    exactCount,
    outcomeCount,
    distribution: sortedScores,
  };
}

function MatchStatRow({ match, preds }: { match: any; preds: any[] }) {
  const [open, setOpen] = useState(false);
  const stats = useMemo(() => computeStats(preds, match), [preds, match]);
  const homeName = getLaLigaTeamDisplayName(match.home?.name);
  const awayName = getLaLigaTeamDisplayName(match.away?.name);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="text-[10px] font-bold text-muted-foreground shrink-0">J{match.matchday}</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 text-sm font-semibold">
          <img src={crestUrl(match.home?.id) ?? ""} alt="" className="h-5 w-5 shrink-0 object-contain" />
          <span className="truncate">{homeName}</span>
          <span className="text-muted-foreground shrink-0 tabular-nums">{match.home_score}–{match.away_score}</span>
          <span className="truncate">{awayName}</span>
          <img src={crestUrl(match.away?.id) ?? ""} alt="" className="h-5 w-5 shrink-0 object-contain" />
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{stats.total} pronósticos</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border px-3 py-3 space-y-3 text-xs">
          {stats.total === 0 ? (
            <p className="text-muted-foreground">Nadie pronosticó este partido.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Local" pct={stats.pctH} />
                <Stat label="Empate" pct={stats.pctD} />
                <Stat label="Visitante" pct={stats.pctA} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wide">Acertaron resultado</div>
                  <div className="text-lg font-black">{stats.outcomeCount + stats.exactCount}</div>
                </div>
                <div className="rounded-lg bg-gold/10 border border-gold/20 px-3 py-2">
                  <div className="text-[10px] text-gold font-bold uppercase tracking-wide">Marcador exacto</div>
                  <div className="text-lg font-black">{stats.exactCount}</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide mb-1">Marcador más apostado</div>
                <div className="font-semibold">{stats.mostCommon ?? "—"} <span className="text-muted-foreground">({stats.mostCommonCount})</span></div>
              </div>

              <div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide mb-1">Distribución de marcadores</div>
                <div className="space-y-1">
                  {stats.distribution.slice(0, 8).map(([score, count]) => (
                    <div key={score} className="flex items-center gap-2">
                      <span className="w-10 shrink-0 font-mono">{score}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-pitch" style={{ width: `${stats.total ? Math.round((count / stats.total) * 100) : 0}%` }} />
                      </div>
                      <span className="w-8 text-right tabular-nums text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-bold text-sm">{pct}%</div>
    </div>
  );
}
