import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Plus, KeyRound } from "lucide-react";
import { useLeaderboard, useDailyWinner, useProfiles, useMyLeagues, useLeagues, useAllLeagueMembers, useAllSnapshots, useAnnouncements } from "@/lib/queries";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { isAnnouncementLive } from "@/lib/announcements";
import { useAuth } from "@/lib/auth";
import { InviteCard } from "@/components/InviteCard";
import { EvolutionChart } from "@/components/EvolutionChart";
import { CreateLeagueModal, JoinLeagueModal } from "@/components/LeaguesSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  component: Home,
  validateSearch: (search: Record<string, unknown>) => ({
    league: typeof search.league === "string" ? search.league : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Clasificación · PlenoAl15" },
      { name: "description", content: "Clasificación general de la quiniela entre amigos." },
    ],
  }),
});

// ── Anuncios creados desde admin ──────────────────────────────
function CustomAnnouncements() {
  const { isAdmin } = useAuth();
  const { data: announcements } = useAnnouncements();
  const visible = (announcements ?? []).filter(
    (a: any) => isAnnouncementLive(a) && (a.visibility === "all" || isAdmin)
  );
  if (visible.length === 0) return null;
  return (
    <>
      {visible.map((a: any) => (
        <AnnouncementCard key={a.id} announcement={a} />
      ))}
    </>
  );
}

function Home() {
  const { user, isAdmin } = useAuth();
  const { league: leagueFromUrl } = Route.useSearch();
  const { data: rows, isLoading } = useLeaderboard();
  const { data: dailyWinner } = useDailyWinner();
  const { data: profiles } = useProfiles();
  const { data: myLeagues } = useMyLeagues(user?.id);
  const { data: allLeagues } = useLeagues();
  const { data: allMembers } = useAllLeagueMembers();
  const { data: allSnaps } = useAllSnapshots();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const usersWithLeagues = useMemo(() => new Set((allMembers ?? []).map((m) => m.user_id)), [allMembers]);
  const list = rows ?? [];

  const membersByLeague = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    (allMembers ?? []).forEach(({ league_id, user_id }) => {
      (map[league_id] ||= new Set()).add(user_id);
    });
    return map;
  }, [allMembers]);

  const filteredList = useMemo(() => {
    if (!selectedLeagueId) return list;
    const ids = membersByLeague[selectedLeagueId];
    if (!ids) return list;
    return list.filter((r) => ids.has(r.user_id));
  }, [list, selectedLeagueId, membersByLeague]);

  const selectedMemberIds = selectedLeagueId ? (membersByLeague[selectedLeagueId] ?? null) : null;

  const leagueDailyWinner = useMemo(() => {
    if (!selectedLeagueId || !allSnaps?.length) return null;
    const ids = membersByLeague[selectedLeagueId];
    if (!ids) return null;
    const latestDate = [...new Set(allSnaps.map((s) => s.snapshot_date))].sort().at(-1);
    if (!latestDate) return null;
    return allSnaps
      .filter((s) => s.snapshot_date === latestDate && ids.has(s.user_id))
      .sort((a, b) => b.total_points - a.total_points)[0] ?? null;
  }, [allSnaps, selectedLeagueId, membersByLeague]);
  void dailyWinner;
  void leagueDailyWinner;

  const myLeagueList = (myLeagues ?? []).map((m) => m.league).filter(Boolean) as any[];
  const filterLeagueList = isAdmin ? (allLeagues ?? []) : myLeagueList;

  useEffect(() => {
    if (hasAutoSelected || filterLeagueList.length === 0) return;
    const fromUrl = leagueFromUrl && filterLeagueList.find((l: any) => l.id === leagueFromUrl);
    setSelectedLeagueId(fromUrl ? fromUrl.id : filterLeagueList[0].id);
    setHasAutoSelected(true);
  }, [filterLeagueList, hasAutoSelected, leagueFromUrl]);

  const selectedLeague = filterLeagueList.find((l: any) => l.id === selectedLeagueId) ?? null;

  // Posiciones del día anterior para mostrar flechas de cambio
  const yesterdayPositions = useMemo(() => {
    if (!allSnaps?.length) return {} as Record<string, number>;
    const dates = [...new Set(allSnaps.map((s) => s.snapshot_date))].sort();
    if (dates.length < 2) return {} as Record<string, number>;
    const prevDate = dates[dates.length - 2];
    const prevSnaps = allSnaps.filter((s) => {
      if (s.snapshot_date !== prevDate) return false;
      if (selectedLeagueId) return membersByLeague[selectedLeagueId]?.has(s.user_id) ?? false;
      return usersWithLeagues.has(s.user_id);
    });
    const sorted = [...prevSnaps].sort((a, b) => b.total_points - a.total_points);
    const pos: Record<string, number> = {};
    sorted.forEach((s, i) => { pos[s.user_id] = i + 1; });
    return pos;
  }, [allSnaps, selectedLeagueId, membersByLeague, usersWithLeagues]);

  if (!user) {
    const demoList = list.slice(0, 10);
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-dashed border-gold/40 bg-card p-5 shadow-soft text-center space-y-2">
          <p className="text-sm text-muted-foreground">Estás viendo PlenoAl15 como invitado.</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-gold text-gold-foreground font-bold px-5 py-2.5 text-sm hover:bg-gold/90 transition-colors"
          >
            Crear cuenta para pronosticar
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-3xl shadow-soft bg-gradient-pitch">
          <div className="absolute inset-0 bg-gradient-to-t from-pitch-deep via-pitch-deep/80 to-pitch-deep/30" />
          <div className="relative p-5 md:p-8 text-white">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 border border-gold/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold mb-2">
              Muestra
            </div>
            <h2 className="display text-3xl mb-4 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-gold" /> Clasificación de ejemplo
            </h2>
            {isLoading ? (
              <div className="py-8 text-white/70">Cargando…</div>
            ) : (
              <div className="space-y-1.5">
                {demoList.map((r, i) => (
                  <div
                    key={r.user_id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                      i === 0 ? "bg-gold/20 border border-gold/30" : "bg-white/5 border border-white/10"
                    }`}
                  >
                    <span className="w-7 text-center font-bold text-base shrink-0">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-white/60 text-sm">{i + 1}</span>}
                    </span>
                    <span className="flex-1 font-semibold truncate text-sm">{r.display_name}</span>
                    <span className={`font-bold tabular-nums text-lg shrink-0 ${i === 0 ? "text-gold" : "text-white/90"}`}>
                      {r.total_points}
                      <span className="text-[10px] font-normal text-white/50 ml-0.5">pts</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-white/50 mt-4">
              Esto es solo un ejemplo — regístrate y crea o únete a una liga para tener tu propia clasificación.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Anuncios creados desde admin */}
      <CustomAnnouncements />

      {/* Selector de liga */}
      {filterLeagueList.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card shadow-soft p-5 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Estás jugando de forma individual: tus puntos son solo tuyos, no compartes clasificación con nadie.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCreateOpen(true)}
              className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/20 transition-colors"
            >
              Crear liga
            </button>
            <button
              onClick={() => setJoinOpen(true)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors"
            >
              Unirme a una liga
            </button>
          </div>
        </section>
      ) : (
        <div
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Seleccionar liga"
        >
          {filterLeagueList.map((l: any) => {
            const active = l.id === selectedLeagueId;
            const memberCount = membersByLeague[l.id]?.size ?? 0;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelectedLeagueId(l.id)}
                className={`min-w-[128px] shrink-0 snap-center rounded-xl border px-3 py-2 text-left transition-all ${
                  active
                    ? "border-gold bg-gold text-slate-950 shadow-sm"
                    : "border-border bg-card text-foreground hover:border-gold/50 hover:bg-muted"
                }`}
              >
                <span className="block text-[10px] font-black uppercase tracking-wide truncate">
                  {l.is_default ? "Individual" : l.name}
                </span>
                <span className={`mt-0.5 block text-[9px] ${active ? "text-slate-700" : "text-muted-foreground"}`}>
                  {memberCount} miembro{memberCount !== 1 ? "s" : ""}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="shrink-0 snap-center rounded-xl border border-dashed border-gold/40 bg-gold/10 text-gold px-4 flex items-center justify-center hover:bg-gold/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Clasificación */}
      <section className="relative overflow-hidden rounded-3xl shadow-soft bg-gradient-pitch">
        <div className="absolute inset-0 bg-gradient-to-t from-pitch-deep via-pitch-deep/80 to-pitch-deep/30" />
        <div className="relative p-5 md:p-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="display text-2xl leading-none flex items-center gap-2">
              <Trophy className="h-6 w-6 text-gold" /> Clasificación
            </h2>
            <div className="text-xs text-white/50">{filteredList.length} participantes</div>
          </div>

          {isLoading ? (
            <div className="py-8 text-white/70">Cargando…</div>
          ) : filteredList.length === 0 ? (
            <div className="py-8 text-white/70">Aún no hay participantes en esta liga.</div>
          ) : (
            <motion.div
              key={selectedLeagueId ?? "global"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className={`space-y-1 ${filteredList.length > 10 ? "max-h-[30rem] overflow-y-auto pr-1" : ""}`}
            >
              {filteredList.map((r, i) => {
                const prevPos = yesterdayPositions[r.user_id];
                const diff = prevPos != null ? prevPos - (i + 1) : null;
                return (
                  <motion.div
                    key={r.user_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                      i === 0 ? "bg-gold/20 border border-gold/30" : "bg-white/5 border border-white/10"
                    }`}
                  >
                    <span className="w-7 text-center font-bold text-base shrink-0">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-white/60 text-sm">{i + 1}</span>}
                    </span>
                    <span className="flex-1 font-semibold truncate text-sm">{r.display_name}</span>
                    {diff !== null && diff !== 0 && (
                      <span className={`text-[10px] font-bold tabular-nums shrink-0 ${diff > 0 ? "text-green-400" : "text-red-400"}`}>
                        {diff > 0 ? "▲" : "▼"}{Math.abs(diff)}
                      </span>
                    )}
                    {diff === 0 && <span className="text-[10px] text-white/30 shrink-0">—</span>}
                    {i === 0 && <Crown className="h-4 w-4 text-gold shrink-0" />}
                    <span className={`font-bold tabular-nums text-lg shrink-0 ${i === 0 ? "text-gold" : "text-white/90"}`}>
                      {r.total_points}
                      <span className="text-[10px] font-normal text-white/50 ml-0.5">pts</span>
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* Evolución diaria */}
      {isAdmin ? (
        <EvolutionChart memberIds={selectedMemberIds ?? undefined} />
      ) : (
        <section className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <span className="display text-2xl">📈</span>
            <span className="display text-2xl">Evolución diaria</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-muted-foreground">
            <span className="text-3xl">🚧</span>
            <p className="text-sm font-medium">Próximamente</p>
            <p className="text-xs opacity-70">El gráfico de evolución estará disponible en breve.</p>
          </div>
        </section>
      )}

      {/* Solo admin: usuarios con/sin liga */}
      {isAdmin && (() => {
        const withLeague = (profiles ?? []).filter((p: any) => usersWithLeagues.has(p.id));
        const noLeague = (profiles ?? []).filter((p: any) => !usersWithLeagues.has(p.id));
        return (
          <details className="rounded-xl border border-border bg-card/50 text-xs overflow-hidden">
            <summary className="flex items-center justify-between px-3 py-2 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors list-none">
              <span className="font-medium">🔒 Solo admin · ligas</span>
              <span className="flex gap-2">
                <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-semibold">{withLeague.length} con liga</span>
                <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 font-semibold">{noLeague.length} sin liga</span>
              </span>
            </summary>
            <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
              {noLeague.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-destructive/70 mb-1">Sin liga</p>
                  <div className="flex flex-wrap gap-1">
                    {noLeague.map((p: any) => (
                      <span key={p.id} className="rounded-full bg-destructive/8 border border-destructive/20 px-2 py-0.5 text-[11px] text-destructive/80">
                        {p.avatar_emoji} {p.display_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Con liga ({withLeague.length})</p>
                <div className="flex flex-wrap gap-1">
                  {withLeague.map((p: any) => (
                    <span key={p.id} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {p.avatar_emoji} {p.display_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </details>
        );
      })()}

      {/* Invita — al final del todo */}
      <InviteCard />

      <CreateLeagueModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinLeagueModal open={joinOpen} onClose={() => setJoinOpen(false)} />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Añadir otra liga</DialogTitle>
            <DialogDescription>Únete con un código o crea una liga nueva.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setAddOpen(false); setJoinOpen(true); }}
              className="w-full flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
            >
              <KeyRound className="h-4 w-4 text-muted-foreground" /> Unirme con un código
            </button>
            <button
              onClick={() => { setAddOpen(false); setCreateOpen(true); }}
              className="w-full flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-sm font-semibold text-gold hover:bg-gold/20 transition-colors"
            >
              <Plus className="h-4 w-4" /> Crear una liga nueva
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
