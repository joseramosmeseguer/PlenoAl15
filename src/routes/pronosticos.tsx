import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAllPredictions, useMatches, useProfiles, useMyLeagues, useAllLeagueMembers } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { formatKickoff, outcome, STAGE_LABELS } from "@/lib/scoring";
import { getCrestUrl } from "@/lib/crests";
import { Star, Users, ChevronDown } from "lucide-react";
import { StatsContent } from "@/components/StatsContent";
import { RulesContent } from "@/components/RulesContent";
import { STAGE_BADGE_COLORS } from "@/lib/stageColors";

export const Route = createFileRoute("/pronosticos")({
  component: AllPredictions,
  head: () => ({ meta: [{ title: "Pronósticos de todos · El Mundial" }] }),
});

type Tab = "upcoming" | "finished" | "stats" | "all";

function AllPredictions() {
  const { user } = useAuth();
  const { data: matches } = useMatches();
  const { data: preds } = useAllPredictions();
  const { data: profiles } = useProfiles();
  const { data: myLeagues } = useMyLeagues(user?.id);
  const { data: allMembers } = useAllLeagueMembers();
  const [filter, setFilter] = useState<Tab>("upcoming");

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const predsByMatch = useMemo(() => {
    const m: Record<string, any[]> = {};
    (preds ?? []).forEach((p: any) => (m[p.match_id] ||= []).push(p));
    return m;
  }, [preds]);

  // Set of user IDs that share at least one league with the current user
  const leagueMateIds = useMemo(() => {
    if (!user || !myLeagues || !allMembers) return null;
    const myLeagueIds = new Set(myLeagues.map((m) => m.league_id));
    const ids = new Set<string>();
    allMembers.forEach(({ league_id, user_id }) => {
      if (myLeagueIds.has(league_id)) ids.add(user_id);
    });
    return ids;
  }, [user, myLeagues, allMembers]);

  const filtered = (matches ?? []).filter((m: any) => {
    if (filter === "upcoming") return m.status === "scheduled";
    if (filter === "finished") return m.status === "finished";
    return true;
  });
  if (filter === "finished") {
    filtered.sort((a: any, b: any) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime());
  }

  const tabs: [Tab, string][] = [
    ["upcoming", "Próximos"],
    ["finished", "Jugados"],
    ["stats", "Estadísticas"],
    ["all", "Todos"],
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-pitch text-white p-5 shadow-soft">
        <div className="display text-3xl flex items-center gap-2"><Users className="h-6 w-6" /> Pronósticos de todos</div>
        <p className="text-white/80 text-sm">Mira lo que ha puesto cada uno y ríete (o tiembla).</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full text-sm border ${filter === k ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {filter === "stats" && <StatsContent showHeader={false} />}

      {filter !== "stats" && (
        <div className="grid gap-4">
          {filtered.map((m: any) => {
            const list = predsByMatch[m.id] ?? [];
            const stats = computeStats(list, m); // % always global
            const displayList = leagueMateIds ? list.filter((p: any) => leagueMateIds.has(p.user_id)) : list;
            const homeCrest = m.home_code === "CZE" ? null : getCrestUrl(m.home_code);
            const awayCrest = m.away_code === "CZE" ? null : getCrestUrl(m.away_code);
            const isKnockout = m.stage !== "group";
            const isMegapremium = m.is_megapremium;
            const stageColor = STAGE_BADGE_COLORS[m.stage];
            return (
              <div key={m.id} className={`rounded-xl border bg-card p-4 shadow-soft ${
                isMegapremium ? "border-l-4 border-l-red-500 border-border"
                : isKnockout && stageColor ? `border-l-4 ${stageColor.border} border-border`
                : m.is_premium ? "border-gold/40" : "border-border"
              }`}>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold">{formatKickoff(m.kickoff_at)}</span>
                  <div className="flex items-center gap-2">
                    {isKnockout && stageColor ? (
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${stageColor.badge}`}>
                        {STAGE_LABELS[m.stage]}
                      </span>
                    ) : (
                      <span className="text-xs">{STAGE_LABELS[m.stage]}</span>
                    )}
                    {isMegapremium ? (
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1 text-xs"><Star className="h-3 w-3 fill-red-600 dark:fill-red-400" /> Megapremium</span>
                    ) : m.is_premium && (
                      <span className="text-gold flex items-center gap-1 text-xs"><Star className="h-3 w-3 fill-gold" /> Premium</span>
                    )}
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="font-semibold flex items-center gap-2">
                    <TeamMark crest={homeCrest} flag={m.home?.flag} name={m.home?.name ?? m.home_label} />
                    {m.home?.name ?? m.home_label}
                  </div>
                  <div className="display text-2xl">
                    {m.home_score ?? "·"} <span className="text-muted-foreground">–</span> {m.away_score ?? "·"}
                  </div>
                  <div className="font-semibold flex items-center gap-2">
                    {m.away?.name ?? m.away_label}
                    <TeamMark crest={awayCrest} flag={m.away?.flag} name={m.away?.name ?? m.away_label} />
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <Stat label={`${m.home?.code ?? "1"}`} pct={stats.pctH} />
                  <Stat label="X" pct={stats.pctD} />
                  <Stat label={`${m.away?.code ?? "2"}`} pct={stats.pctA} />
                </div>
                {stats.mostCommon && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Más común: <span className="font-semibold text-foreground">{stats.mostCommon}</span> ({stats.mostCommonCount}/{list.length})
                  </div>
                )}

                {/* Lista pronósticos (solo compañeros de liga) */}
                <MatchPredsList list={displayList} profileMap={profileMap} match={m} />
              </div>
            );
          })}
        </div>
      )}

      {filter === "all" && (
        <div className="pt-4 border-t border-border">
          <RulesContent showHeader={true} />
        </div>
      )}
    </div>
  );
}


const PREDS_INITIAL = 4;

function MatchPredsList({ list, profileMap, match }: { list: any[]; profileMap: Record<string, any>; match: any }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? list : list.slice(0, PREDS_INITIAL);
  const hasMore = list.length > PREDS_INITIAL;
  return (
    <div className="mt-3">
      {list.length === 0 && (
        <div className="text-xs text-muted-foreground">Nadie de tu liga ha pronosticado aún.</div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {shown.map((p: any) => {
          const profile = profileMap[p.user_id];
          const exact = match.home_score !== null && p.home_score === match.home_score && p.away_score === match.away_score;
          const right = match.home_score !== null && outcome(p.home_score, p.away_score) === outcome(match.home_score, match.away_score);
          return (
            <div key={p.user_id} className={`flex items-center justify-between text-xs border rounded-md px-2 py-1 ${exact ? "border-gold bg-gold/15" : right ? "border-primary/40 bg-primary/5" : "border-border"}`}>
              <span className="truncate">{profile?.avatar_emoji} {profile?.display_name ?? "?"}</span>
              <span className="font-bold">{p.home_score}-{p.away_score}</span>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Ver menos" : `Ver todos (${list.length})`}
        </button>
      )}
    </div>
  );
}

function Stat({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="rounded-md bg-muted px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-bold text-sm">{pct}%</div>
    </div>
  );
}

function TeamMark({ crest, flag, name }: { crest: string | null; flag?: string; name?: string | null }) {
  if (crest) {
    return <img src={crest} alt={name ?? ""} className="h-8 w-8 shrink-0 object-contain" />;
  }
  return <span className="text-2xl shrink-0">{flag}</span>;
}

function computeStats(preds: any[], _m: any) {
  if (!preds.length) return { pctH: 0, pctD: 0, pctA: 0, mostCommon: null, mostCommonCount: 0 };
  let h = 0, d = 0, a = 0;
  const score: Record<string, number> = {};
  preds.forEach((p) => {
    const o = outcome(p.home_score, p.away_score);
    if (o === "H") h++; else if (o === "A") a++; else d++;
    const key = `${p.home_score}-${p.away_score}`;
    score[key] = (score[key] ?? 0) + 1;
  });
  const total = preds.length;
  const sorted = Object.entries(score).sort(([, x], [, y]) => y - x);
  return {
    pctH: Math.round((h / total) * 100),
    pctD: Math.round((d / total) * 100),
    pctA: Math.round((a / total) * 100),
    mostCommon: sorted[0]?.[0] ?? null,
    mostCommonCount: sorted[0]?.[1] ?? 0,
  };
}
