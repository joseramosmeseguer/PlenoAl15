import { useMemo } from "react";
import { useAllPredictions, useMatches, useProfiles, useLeaderboard } from "@/lib/queries";
import { outcome } from "@/lib/scoring";
import { BarChart3, Award, Skull, Brain, CircleSlash } from "lucide-react";

export function StatsContent({ showHeader = true }: { showHeader?: boolean }) {
  const { data: matches } = useMatches();
  const { data: preds } = useAllPredictions();
  const { data: profiles } = useProfiles();
  const { data: leader } = useLeaderboard();

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const matchMap = useMemo(() => {
    const m: Record<string, any> = {};
    (matches ?? []).forEach((x: any) => (m[x.id] = x));
    return m;
  }, [matches]);

  const nostradamus = (leader ?? []).slice().sort((a, b) => b.exact_count - a.exact_count)[0];

  const facha = useMemo(() => {
    const spain = (matches ?? []).filter((m: any) => m.home?.code === "ESP" || m.away?.code === "ESP");
    const score: Record<string, number> = {};
    (preds ?? []).forEach((p: any) => {
      if (spain.some((s: any) => s.id === p.match_id)) {
        score[p.user_id] = (score[p.user_id] ?? 0) + (p.points_awarded ?? 0);
      }
    });
    const sorted = Object.entries(score).sort(([, a], [, b]) => b - a);
    return sorted[0] ? { user: profileMap[sorted[0][0]], pts: sorted[0][1] } : null;
  }, [preds, matches, profileMap]);

  const descerebrao = useMemo(() => {
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
    const finished = (matches ?? []).filter((m: any) => m.status === "finished");
    const wrong: Record<string, number> = {};
    (preds ?? []).forEach((p: any) => {
      const m = matchMap[p.match_id];
      if (!m || m.status !== "finished") return;
      const real = outcome(m.home_score, m.away_score);
      const my = outcome(p.home_score, p.away_score);
      if (real !== my) wrong[p.user_id] = (wrong[p.user_id] ?? 0) + 1;
    });
    const sorted = Object.entries(wrong).sort(([, a], [, b]) => b - a);
    return sorted[0] && finished.length > 0 ? { user: profileMap[sorted[0][0]], n: sorted[0][1] } : null;
  }, [preds, matches, profileMap, matchMap]);

  const teamTrend = useMemo(() => {
    const counts: Record<string, { wins: number; total: number; name: string; flag: string }> = {};
    (matches ?? []).forEach((m: any) => {
      const list = (preds ?? []).filter((p: any) => p.match_id === m.id);
      list.forEach((p: any) => {
        const o = outcome(p.home_score, p.away_score);
        const winner = o === "H" ? m.home : o === "A" ? m.away : null;
        if (winner) {
          counts[winner.code] ||= { wins: 0, total: 0, name: winner.name, flag: winner.flag };
          counts[winner.code].wins++;
        }
        if (m.home) (counts[m.home.code] ||= { wins: 0, total: 0, name: m.home.name, flag: m.home.flag }).total++;
        if (m.away) (counts[m.away.code] ||= { wins: 0, total: 0, name: m.away.name, flag: m.away.flag }).total++;
      });
    });
    return Object.entries(counts)
      .map(([code, v]) => ({ code, ...v, pct: v.total ? Math.round((v.wins / v.total) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8);
  }, [matches, preds]);

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="rounded-2xl bg-gradient-pitch text-primary-foreground p-5 shadow-soft">
          <div className="display text-3xl flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Estadísticas y badges</div>
          <p className="text-white/80 text-sm">Quién la clava, quién se la pega y quién mejor que se dedique a las canicas.</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Badge icon={<Brain className="text-primary" />} title="Nostradamus" sub="Más marcadores exactos" name={nostradamus?.display_name} value={nostradamus?.exact_count} />
        <Badge icon={<Award className="text-flame" />} title="El Facha" sub="Más puntos en partidos de España 🇪🇸" name={facha?.user?.display_name} value={facha?.pts} />
        <Badge icon={<CircleSlash className="text-gold" />} title="El Descerebrao" sub="Pronósticos más raros" name={descerebrao?.user?.display_name} value={descerebrao?.n} />
        <Badge icon={<Skull className="text-destructive" />} title="Mejor dedícate a las canicas" sub="Más fallos de resultado" name={canicas?.user?.display_name} value={canicas?.n} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="display text-2xl mb-3">Equipos más respaldados</h2>
        <div className="grid gap-2">
          {teamTrend.map((t) => (
            <div key={t.code} className="flex items-center gap-3">
              <div className="w-32 truncate text-sm flex items-center gap-2"><span className="text-xl">{t.flag}</span> {t.name}</div>
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

function Badge({ icon, title, sub, name, value }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft flex items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <div className="display text-lg">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
        <div className="text-sm mt-1 font-semibold">{name ?? "—"} {value !== undefined && value !== null && <span className="text-muted-foreground">· {value}</span>}</div>
      </div>
    </div>
  );
}
