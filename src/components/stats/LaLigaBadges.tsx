import { useMemo } from "react";
import { useClubMatches, useAllClubPredictions, useProfiles } from "@/lib/queries";
import { getLaLigaTeamDisplayName } from "@/lib/laligaTeams";
import { Brain, Award, Skull, CircleSlash } from "lucide-react";

function crestUrl(teamId?: number | null) {
  return teamId ? `/images/crests/${teamId}.png` : null;
}

function outcomeOf(h: number, a: number) {
  return h > a ? "H" : h < a ? "A" : "D";
}

function finished(m: any) {
  return m.status === "FINISHED" && m.home_score != null && m.away_score != null;
}

export function LaLigaBadges() {
  const { data: matches } = useClubMatches();
  const { data: preds } = useAllClubPredictions();
  const { data: profiles } = useProfiles();

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const matchMap = useMemo(() => {
    const m: Record<number, any> = {};
    (matches ?? []).forEach((x: any) => (m[x.id] = x));
    return m;
  }, [matches]);

  const nostradamus = useMemo(() => {
    const exact: Record<string, number> = {};
    (preds ?? []).forEach((p: any) => {
      const m = matchMap[p.match_id];
      if (!m || !finished(m)) return;
      if (p.home_score === m.home_score && p.away_score === m.away_score) {
        exact[p.user_id] = (exact[p.user_id] ?? 0) + 1;
      }
    });
    const sorted = Object.entries(exact).sort(([, a], [, b]) => b - a);
    return sorted[0] ? { display_name: profileMap[sorted[0][0]]?.display_name, exact_count: sorted[0][1] } : null;
  }, [preds, matchMap, profileMap]);

  const raro = useMemo(() => {
    const score: Record<string, number> = {};
    (matches ?? []).forEach((m: any) => {
      const list = (preds ?? []).filter((p: any) => p.match_id === m.id);
      if (list.length < 2) return;
      const counts: Record<string, number> = {};
      list.forEach((p: any) => {
        const k = `${p.home_score}-${p.away_score}`;
        counts[k] = (counts[k] ?? 0) + 1;
      });
      list.forEach((p: any) => {
        const k = `${p.home_score}-${p.away_score}`;
        if (counts[k] === 1) score[p.user_id] = (score[p.user_id] ?? 0) + 1;
      });
    });
    const sorted = Object.entries(score).sort(([, a], [, b]) => b - a);
    return sorted[0] ? { user: profileMap[sorted[0][0]], n: sorted[0][1] } : null;
  }, [preds, matches, profileMap]);

  const canicas = useMemo(() => {
    const wrong: Record<string, number> = {};
    (preds ?? []).forEach((p: any) => {
      const m = matchMap[p.match_id];
      if (!m || !finished(m)) return;
      const real = outcomeOf(m.home_score, m.away_score);
      const my = outcomeOf(p.home_score, p.away_score);
      if (real !== my) wrong[p.user_id] = (wrong[p.user_id] ?? 0) + 1;
    });
    const sorted = Object.entries(wrong).sort(([, a], [, b]) => b - a);
    return sorted[0] ? { user: profileMap[sorted[0][0]], n: sorted[0][1] } : null;
  }, [preds, matchMap, profileMap]);

  const fiel = useMemo(() => {
    // Quién más veces ha pronosticado la victoria de su equipo más apoyado
    const byUser: Record<string, Record<number, number>> = {};
    (preds ?? []).forEach((p: any) => {
      const m = matchMap[p.match_id];
      if (!m) return;
      const o = outcomeOf(p.home_score, p.away_score);
      const teamId = o === "H" ? m.home_team_id : o === "A" ? m.away_team_id : null;
      if (!teamId) return;
      (byUser[p.user_id] ||= {})[teamId] = (byUser[p.user_id]?.[teamId] ?? 0) + 1;
    });
    let best: { userId: string; teamId: number; n: number } | null = null;
    Object.entries(byUser).forEach(([userId, counts]) => {
      Object.entries(counts).forEach(([teamId, n]) => {
        if (!best || n > best.n) best = { userId, teamId: Number(teamId), n };
      });
    });
    if (!best) return null;
    const team = (matches ?? []).find((m: any) => m.home_team_id === best!.teamId)?.home
      ?? (matches ?? []).find((m: any) => m.away_team_id === best!.teamId)?.away;
    return { user: profileMap[best.userId], team, n: best.n };
  }, [preds, matchMap, matches, profileMap]);

  const teamTrend = useMemo(() => {
    const counts: Record<number, { wins: number; total: number; team: any }> = {};
    (matches ?? []).forEach((m: any) => {
      const list = (preds ?? []).filter((p: any) => p.match_id === m.id);
      list.forEach((p: any) => {
        const o = outcomeOf(p.home_score, p.away_score);
        const winnerId = o === "H" ? m.home_team_id : o === "A" ? m.away_team_id : null;
        if (winnerId) {
          (counts[winnerId] ||= { wins: 0, total: 0, team: winnerId === m.home_team_id ? m.home : m.away }).wins++;
        }
        if (m.home_team_id) (counts[m.home_team_id] ||= { wins: 0, total: 0, team: m.home }).total++;
        if (m.away_team_id) (counts[m.away_team_id] ||= { wins: 0, total: 0, team: m.away }).total++;
      });
    });
    return Object.entries(counts)
      .map(([teamId, v]) => ({ teamId: Number(teamId), ...v, pct: v.total ? Math.round((v.wins / v.total) * 100) : 0 }))
      .filter((t) => t.total >= 3)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8);
  }, [matches, preds]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Badge icon={<Brain className="text-primary" />} title="Nostradamus" sub="Más marcadores exactos" name={nostradamus?.display_name} value={nostradamus?.exact_count} />
        <Badge icon={<Award className="text-gold" />} title="El Fiel" sub="Más veces pronosticó ganar al mismo equipo" name={fiel?.user?.display_name} value={fiel?.n} extra={fiel?.team ? getLaLigaTeamDisplayName(fiel.team.name) : undefined} />
        <Badge icon={<CircleSlash className="text-gold" />} title="El Descerebrao" sub="Pronósticos más raros (nadie más los puso)" name={raro?.user?.display_name} value={raro?.n} />
        <Badge icon={<Skull className="text-destructive" />} title="Mejor dedícate a las canicas" sub="Más fallos de resultado" name={canicas?.user?.display_name} value={canicas?.n} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="display text-2xl mb-3">Equipos más respaldados</h2>
        <p className="text-xs text-muted-foreground mb-3">Porcentaje de veces que ganan cuando la comunidad los pronostica ganadores (mín. 3 pronósticos).</p>
        <div className="grid gap-2">
          {teamTrend.map((t) => (
            <div key={t.teamId} className="flex items-center gap-3">
              <img src={crestUrl(t.teamId) ?? ""} alt="" className="h-6 w-6 shrink-0 object-contain" />
              <div className="w-28 truncate text-sm">{getLaLigaTeamDisplayName(t.team?.name)}</div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-pitch" style={{ width: `${t.pct}%` }} />
              </div>
              <div className="w-12 text-right text-sm font-semibold">{t.pct}%</div>
            </div>
          ))}
          {teamTrend.length === 0 && <div className="text-sm text-muted-foreground">Aún no hay suficientes pronósticos.</div>}
        </div>
      </section>
    </div>
  );
}

function Badge({ icon, title, sub, name, value, extra }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft flex items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="display text-lg">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
        <div className="text-sm mt-1 font-semibold truncate">
          {name ?? "—"} {value !== undefined && value !== null && <span className="text-muted-foreground">· {value}</span>}
          {extra && <span className="text-muted-foreground"> ({extra})</span>}
        </div>
      </div>
    </div>
  );
}
