import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Sparkles, Pencil, ChevronDown, Check } from "lucide-react";
import { useLeaderboard, useDailyWinner, useProfiles, useMyLeagues, useLeagues, useMyLeagueInviteCodes, useAllLeagueMembers, useAllSnapshots, useBonusQuestions, useAnnouncements } from "@/lib/queries";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { isAnnouncementLive } from "@/lib/announcements";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InviteCard } from "@/components/InviteCard";
import estadioEpicoImg from "@/assets/EstadioEpico1.png";
import estadioImg from "@/assets/Estadiofutbolfondo.png";
import balonenporteriaImg from "@/assets/balonenporteria.webp";
import { EvolutionChart } from "@/components/EvolutionChart";
import { CreateLeagueModal, JoinLeagueModal, ManageLeagueModal } from "@/components/LeaguesSection";
import { InstallPWA } from "@/components/InstallPWA";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Clasificación · Pleno al 15" },
      { name: "description", content: "Clasificación general de la quiniela entre amigos." },
    ],
  }),
});

function useLiveCountdown(targetISO?: string | null) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!targetISO) { setSecs(null); return; }
    const tick = () => {
      const ms = new Date(targetISO).getTime() - Date.now();
      setSecs(ms <= 0 ? 0 : Math.floor(ms / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetISO]);
  return secs;
}

function BonusCountdown({ bonusQuestions }: { bonusQuestions: any[] }) {
  const deadline = bonusQuestions
    .filter((q) => q.deadline_at)
    .map((q) => q.deadline_at as string)
    .sort()[0] ?? null;
  const secs = useLiveCountdown(deadline);
  if (secs === null || secs === 0) return null;

  const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const urgent = secs < 3600;
  const units = [{ label: "horas", val: hh }, { label: "min", val: mm }, { label: "seg", val: ss }];

  return (
    <div className="relative rounded-xl overflow-hidden shadow-soft">
      <img src={balonenporteriaImg} alt="" className="absolute inset-0 w-full h-full object-cover scale-105 blur-[1px]" />
      <div className={`absolute inset-0 ${urgent ? "bg-black/80" : "bg-black/72"}`} />
      <div className="relative px-4 pt-3 pb-4 text-white text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-base">⏰</span>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${urgent ? "text-red-400" : "text-amber-400"}`}>
              Pronósticos especiales
            </p>
            <p className="text-sm font-semibold text-white">Se cierran en:</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          {units.map(({ label, val }, i) => (
            <div key={label} className="flex items-center gap-3">
              {i > 0 && (
                <span className={`font-black text-2xl leading-none pb-5 ${urgent ? "text-red-400/60" : "text-white/30"}`}>:</span>
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div className={`rounded-2xl min-w-[58px] px-3 py-2.5 text-center shadow-lg ${
                  urgent
                    ? "bg-gradient-to-b from-red-700/70 to-red-900/80 border border-red-400/40 shadow-red-900/40"
                    : "bg-gradient-to-b from-white/20 to-white/8 border border-white/20 shadow-black/30"
                }`}>
                  <span className={`font-mono font-black text-3xl tabular-nums leading-none tracking-tight ${urgent ? "text-red-100" : "text-white"}`}>
                    {val}
                  </span>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${urgent ? "text-red-400/80" : "text-amber-400/80"}`}>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Modal: sin liga ───────────────────────────────────────────
function NoLeagueModal({ myLeagues, myLeaguesLoading, onJoin, onCreate }: {
  myLeagues: any[] | undefined;
  myLeaguesLoading: boolean;
  onJoin: () => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(true);

  const hasNoLeague = !myLeaguesLoading && (myLeagues ?? []).length === 0;
  if (!hasNoLeague || !open) return null;

  function dismiss() {
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="display text-2xl">¡Hola! 👋</DialogTitle>
          <DialogDescription className="sr-only">Información sobre ligas</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-foreground">
          <p>
            Te mandamos este aviso porque <span className="font-semibold">todavía no estás en ninguna liga</span>.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Pregúntale al amigo que te invitó el código de su liga e introdúcelo para unirte. Si prefieres, también puedes crearte una liga propia desde el menú principal.
          </p>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={() => { dismiss(); onJoin(); }}
            className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-2.5 text-sm hover:bg-primary/90 transition-colors"
          >
            Tengo un código, quiero unirme
          </button>
          <button
            onClick={() => { dismiss(); onCreate(); }}
            className="w-full rounded-xl border border-border bg-card font-medium py-2.5 text-sm hover:bg-muted transition-colors"
          >
            Crear mi propia liga
          </button>
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Ahora no
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── CTA: Vota partidos normales ───────────────────────────────
function VotaPartidosCard() {
  return (
    <div className="relative rounded-xl overflow-hidden shadow-soft min-h-[80px]">
      <img src={estadioImg} alt="" className="absolute inset-0 w-full h-full object-cover object-center scale-105 blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
      <div className="relative px-4 py-3 text-white flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-snug">⚽ Pronósticos de partidos</p>
          <p className="text-xs text-white/60 mt-0.5">Predice el marcador de cada partido y sube en la clasificación.</p>
        </div>
        <Link
          to="/mis-pronosticos"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gold hover:bg-gold/90 text-pitch-deep font-black text-xs px-4 py-2 transition-colors"
        >
          ¡VOTA YA! →
        </Link>
      </div>
    </div>
  );
}

// ── Nuevo plazo pronósticos especiales ───────────────────────

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
  const { data: rows, isLoading } = useLeaderboard();
  const { data: dailyWinner } = useDailyWinner();
  const { data: profiles } = useProfiles();
  const { data: myLeagues, isLoading: myLeaguesLoading } = useMyLeagues(user?.id);
  const { data: allLeagues } = useLeagues();
  const { data: myLeagueCodes } = useMyLeagueInviteCodes(user?.id);
  const { data: allMembers } = useAllLeagueMembers();
  const { data: allSnaps } = useAllSnapshots();
  const { data: bonusQuestions } = useBonusQuestions();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const classificationRef = useRef<HTMLElement>(null);

  function selectLeague(id: string | null) {
    setSelectedLeagueId(id);
    setTimeout(() => {
      classificationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [manageLeague, setManageLeague] = useState<{ id: string; name: string } | null>(null);
  const [changeNameOpen, setChangeNameOpen] = useState(false);
  const [leaguesExpanded, setLeaguesExpanded] = useState(false);
  const LEAGUES_VISIBLE = 2;
  const nameAlreadyChanged = !!user && !!localStorage.getItem(`name_changed_${user.id}`);

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

  const effectiveWinner = selectedLeagueId ? leagueDailyWinner : dailyWinner;
  const dailyProfile = effectiveWinner
    ? (profiles ?? []).find((p: any) => p.id === effectiveWinner.user_id)
    : null;

  const myProfile = useMemo(() => (profiles ?? []).find((p: any) => p.id === user?.id), [profiles, user]);
  const displayName = myProfile?.display_name ?? myProfile?.avatar_emoji ?? "campeón";

  const myLeagueList = (myLeagues ?? []).map((m) => m.league).filter(Boolean) as any[];
  const filterLeagueList = isAdmin ? (allLeagues ?? []) : myLeagueList;

  useEffect(() => {
    if (!hasAutoSelected && filterLeagueList.length > 0) {
      setSelectedLeagueId(filterLeagueList[0].id);
      setHasAutoSelected(true);
    }
  }, [filterLeagueList, hasAutoSelected]);

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
          <p className="text-sm text-muted-foreground">Estás viendo Pleno al 15 como invitado.</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-gold text-gold-foreground font-bold px-5 py-2.5 text-sm hover:bg-gold/90 transition-colors"
          >
            Crear cuenta para pronosticar
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-3xl shadow-soft bg-gradient-pitch">
          <div className="absolute inset-0 bg-gradient-to-t from-pitch-deep via-pitch-deep/80 to-pitch-deep/30" />
          <div className="relative p-5 md:p-8 text-primary-foreground">
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

      {/* Perfil */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="display text-3xl">¡Hola, {displayName}!</h1>
        </div>
        <button
          onClick={() => !nameAlreadyChanged && setChangeNameOpen(true)}
          disabled={nameAlreadyChanged}
          title={nameAlreadyChanged ? "Solo puedes cambiar el nombre una vez" : "Cambiar tu nombre visible"}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors shadow-soft ${
            nameAlreadyChanged
              ? "border-border text-muted-foreground/40 cursor-not-allowed"
              : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          {nameAlreadyChanged ? "Nombre fijado" : "Editar nombre"}
        </button>
      </div>

      {/* Mis puntos */}
      {(() => {
        const myPos = list.findIndex((r) => r.user_id === user.id);
        const myRow = myPos >= 0 ? list[myPos] : null;
        if (!myRow) return null;
        return (
          <div className="relative rounded-2xl overflow-hidden shadow-soft">
            <img src={estadioEpicoImg} alt="" className="absolute inset-0 w-full h-full object-cover object-center scale-105 blur-[1px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/65 to-black/40" />
            <div className="relative px-5 py-4 text-white flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gold/80 mb-1">Tus puntos</p>
                <div className="flex items-end gap-1.5 leading-none">
                  <span className="display font-black text-white" style={{ fontSize: "3.25rem", lineHeight: 1 }}>{myRow.total_points}</span>
                  <span className="text-xl font-bold text-gold mb-1">pts</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-0.5">Posición</p>
                <span className="display font-black text-gold" style={{ fontSize: "2.75rem", lineHeight: 1 }}>#{myPos + 1}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Instalar como app */}
      <InstallPWA />

      {/* Anuncios creados desde admin */}
      <CustomAnnouncements />

      {/* Aviso recarga */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
        <span>🔄</span>
        <span>Recarga la página de vez en cuando para ver las últimas actualizaciones.</span>
      </div>

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
      <>
      {/* Mis ligas */}
      <section className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mis ligas</span>
        </div>

        {(leaguesExpanded ? filterLeagueList : filterLeagueList.slice(0, LEAGUES_VISIBLE)).map((league: any) => {
          const isSelected = selectedLeagueId === league.id;
          const memberCount = membersByLeague[league.id]?.size ?? 0;
          const isCreator = league.creator_id === user.id;
          const membership = (myLeagues ?? []).find((m) => m.league_id === league.id);
          const isLeagueAdmin = isAdmin || membership?.is_league_admin;
          const inviteCode = isCreator ? (myLeagueCodes ?? []).find((c) => c.league_id === league.id)?.invite_code ?? null : null;

          return (
            <div
              key={league.id}
              className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 transition-colors ${
                isSelected ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-muted/50"
              }`}
            >
              <button
                onClick={() => selectLeague(league.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <span className="text-xl shrink-0">{league.is_default ? "👤" : "👥"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold text-sm truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {league.is_default ? "Individual" : league.name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{memberCount} participantes</div>
                  {inviteCode && (
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                      Código: {inviteCode}
                    </div>
                  )}
                </div>
              </button>
              {isLeagueAdmin ? (
                <button
                  onClick={() => setManageLeague({ id: league.id, name: league.is_default ? "Individual" : league.name })}
                  className="shrink-0 text-[11px] font-medium text-muted-foreground border border-border rounded-lg px-2 py-1 hover:bg-muted transition-colors"
                >
                  Gestionar
                </button>
              ) : null}
            </div>
          );
        })}

        {filterLeagueList.length > LEAGUES_VISIBLE && (
          <button
            onClick={() => setLeaguesExpanded(!leaguesExpanded)}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors border-t border-border"
          >
            {leaguesExpanded ? (
              <><ChevronDown className="h-3.5 w-3.5 rotate-180" /> Ver menos</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" /> {filterLeagueList.length - LEAGUES_VISIBLE} liga{filterLeagueList.length - LEAGUES_VISIBLE > 1 ? "s" : ""} más</>
            )}
          </button>
        )}
      </section>

      {/* Clasificación */}
      <section ref={classificationRef} className="relative overflow-hidden rounded-3xl shadow-soft scroll-mt-4 bg-gradient-pitch">
        <div className="absolute inset-0 bg-gradient-to-t from-pitch-deep via-pitch-deep/80 to-pitch-deep/30" />
        <div className="relative p-5 md:p-8 text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-gold/90">
                {selectedLeague && !selectedLeague.is_default ? "Tu liga" : "Clasificación"}
              </div>
              <motion.h2
                key={selectedLeagueId ?? "global"}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="display text-4xl leading-none"
              >
                <span className="text-gold flex items-center gap-2">
                  <Trophy className="h-7 w-7" />
                  {selectedLeague && !selectedLeague.is_default ? selectedLeague.name : "Clasificación"}
                </span>
              </motion.h2>
            </div>
            <div className="text-xs text-white/50 text-right">
              {filteredList.length} participantes<br />
              <span className="text-[10px]">
                Actualizado {new Date().toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
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
      </>
      )}

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


      {/* Invita */}
      <InviteCard />

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

      <NoLeagueModal
        myLeagues={myLeagues}
        myLeaguesLoading={myLeaguesLoading}
        onJoin={() => setJoinOpen(true)}
        onCreate={() => setCreateOpen(true)}
      />
      <CreateLeagueModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinLeagueModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      {manageLeague && (
        <ManageLeagueModal
          leagueId={manageLeague.id}
          leagueName={manageLeague.name}
          open={!!manageLeague}
          onClose={() => setManageLeague(null)}
        />
      )}
      <ChangeNameModal
        open={changeNameOpen}
        currentName={myProfile?.display_name ?? ""}
        userId={user.id}
        onClose={() => setChangeNameOpen(false)}
      />
    </div>
  );
}

function ChangeNameModal({ open, currentName, userId, onClose }: {
  open: boolean; currentName: string; userId: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) return;
    setSaving(true);
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .ilike("display_name", trimmed)
      .neq("id", userId)
      .limit(1);
    if (existing && existing.length > 0) {
      toast.error("Ese nombre ya está en uso. Elige otro.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", userId);
    setSaving(false);
    if (error) { toast.error("No se pudo guardar. Inténtalo de nuevo."); return; }
    localStorage.setItem(`name_changed_${userId}`, "1");
    qc.invalidateQueries({ queryKey: ["profiles"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
    toast.success(`¡Listo! Ahora te llamas ${trimmed}.`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Cambiar nombre
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Este nombre aparecerá en la clasificación y en todas tus ligas.</p>
              <p className="font-semibold text-amber-500">⚠️ Solo puedes cambiarlo una vez.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre o apodo"
            maxLength={30}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <button
            onClick={save}
            disabled={saving || !name.trim() || name.trim() === currentName}
            className="w-full rounded-xl bg-pitch-deep text-white py-2.5 font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saving ? "Guardando…" : "Confirmar nombre"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
