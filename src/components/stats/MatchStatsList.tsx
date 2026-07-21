import { useMemo, useState } from "react";
import { useAllPredictions, useMatches } from "@/lib/queries";
import { outcome, STAGE_LABELS } from "@/lib/scoring";
import { getCrestUrl } from "@/lib/crests";
import { ChevronDown } from "lucide-react";
import { STAGE_BADGE_COLORS } from "@/lib/stageColors";

type Filter = "all" | "group" | "knockout";

export function MatchStatsList() {
  const { data: matches } = useMatches();
  const { data: preds } = useAllPredictions();
  const [filter, setFilter] = useState<Filter>("all");

  const finished = useMemo(() => {
    return (matches ?? [])
      .filter((m: any) => m.status === "finished")
      .filter((m: any) => filter === "all" || (filter === "group" ? m.stage === "group" : m.stage !== "group"))
      .sort((a: any, b: any) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime());
  }, [matches, filter]);

  const predsByMatch = useMemo(() => {
    const map: Record<string, any[]> = {};
    (preds ?? []).forEach((p: any) => (map[p.match_id] ||= []).push(p));
    return map;
  }, [preds]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {([
          ["all", "Todos"],
          ["group", "Fase de grupos"],
          ["knockout", "Eliminatorias"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              filter === key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {finished.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aún no hay partidos jugados en esta sección.</p>
      ) : (
        <div className="space-y-2">
          {finished.map((m: any) => (
            <MatchStatRow key={m.id} match={m} preds={predsByMatch[m.id] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}

function computeFullStats(preds: any[], m: any) {
  const total = preds.length;
  let h = 0, d = 0, a = 0, exactCount = 0, outcomeCount = 0;
  const scoreCounts: Record<string, number> = {};
  const realOutcome = m.status === "finished" ? outcome(m.home_score, m.away_score) : null;

  preds.forEach((p: any) => {
    const o = outcome(p.home_score, p.away_score);
    if (o === "H") h++; else if (o === "A") a++; else d++;
    const key = `${p.home_score}-${p.away_score}`;
    scoreCounts[key] = (scoreCounts[key] ?? 0) + 1;
    if (realOutcome) {
      if (p.home_score === m.home_score && p.away_score === m.away_score) exactCount++;
      else if (o === realOutcome) outcomeCount++;
    }
  });

  const sortedScores = Object.entries(scoreCounts).sort(([, x], [, y]) => y - x);
  return {
    total,
    pctH: total ? Math.round((h / total) * 100) : 0,
    pctD: total ? Math.round((d / total) * 100) : 0,
    pctA: total ? Math.round((a / total) * 100) : 0,
    mostCommon: sortedScores[0]?.[0] ?? null,
    mostCommonCount: sortedScores[0]?.[1] ?? 0,
    leastCommon: sortedScores.length ? sortedScores[sortedScores.length - 1][0] : null,
    leastCommonCount: sortedScores.length ? sortedScores[sortedScores.length - 1][1] : 0,
    exactCount,
    outcomeCount,
    distribution: sortedScores,
  };
}

function MatchStatRow({ match, preds }: { match: any; preds: any[] }) {
  const [open, setOpen] = useState(false);
  const stats = useMemo(() => computeFullStats(preds, match), [preds, match]);
  const homeCrest = getCrestUrl(match.home_code);
  const awayCrest = getCrestUrl(match.away_code);
  const isKnockout = match.stage !== "group";
  const stageColor = STAGE_BADGE_COLORS[match.stage];

  return (
    <div className={`rounded-xl border bg-card overflow-hidden shadow-soft ${isKnockout && stageColor ? `border-l-4 ${stageColor.border} border-border` : "border-border"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        {isKnockout && stageColor && (
          <span className={`hidden sm:inline-flex text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border shrink-0 ${stageColor.badge}`}>
            {STAGE_LABELS[match.stage]}
          </span>
        )}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 text-sm font-semibold">
          {homeCrest ? <img src={homeCrest} alt="" className="h-5 w-5 shrink-0 object-contain" /> : <span className="shrink-0">{match.home?.flag}</span>}
          <span className="truncate">{match.home?.name ?? match.home_label}</span>
          <span className="text-muted-foreground shrink-0 tabular-nums">{match.home_score}–{match.away_score}</span>
          <span className="truncate">{match.away?.name ?? match.away_label}</span>
          {awayCrest ? <img src={awayCrest} alt="" className="h-5 w-5 shrink-0 object-contain" /> : <span className="shrink-0">{match.away?.flag}</span>}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{stats.total} votos</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border px-3 py-3 space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label={match.home?.code ?? "1"} pct={stats.pctH} />
            <Stat label="X" pct={stats.pctD} />
            <Stat label={match.away?.code ?? "2"} pct={stats.pctA} />
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

          {stats.leastCommon && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide mb-1">Marcador menos apostado</div>
              <div className="font-semibold">{stats.leastCommon} <span className="text-muted-foreground">({stats.leastCommonCount})</span></div>
            </div>
          )}

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
