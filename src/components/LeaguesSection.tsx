import { useMemo, useState } from "react";
import { useMyLeagues, useAllLeagueMembers, useMyLeagueInviteCodes, useProfiles, type League } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Trophy, Plus, LogIn, Copy, Users, X, ChevronRight, Shield, Star,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

// ── Helpers ──────────────────────────────────────────────────

function CodeBadge({ code }: { code: string }) {
  function copy() {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold hover:bg-gold/20 transition-colors"
    >
      <span className="tracking-widest font-mono">{code}</span>
      <Copy className="h-3 w-3" />
    </button>
  );
}

// ── Liga card (horizontal) ────────────────────────────────────

function LeagueCard({
  membership,
  memberCount,
  inviteCode,
  leaderboardRows,
  onLeave,
}: {
  membership: any;
  memberCount: number;
  inviteCode?: string;
  leaderboardRows: any[];
  onLeave: (leagueId: string, leagueName: string) => void;
}) {
  const { user } = useAuth();
  const league: League = membership.league;
  const isCreator = league.creator_id === user?.id;
  const isDefault = league.is_default;

  return (
    <div className="relative flex-shrink-0 w-44 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col gap-2.5">
      {/* Default badge */}
      {isDefault && (
        <div className="absolute top-2.5 right-2.5">
          <Star className="h-3.5 w-3.5 text-gold fill-gold" />
        </div>
      )}

      {/* Name */}
      <div className="pr-5">
        <div className="flex items-center gap-1.5">
          {isDefault && <Shield className="h-3.5 w-3.5 text-gold/80 shrink-0" />}
          <p className="font-display text-lg uppercase leading-none truncate text-foreground">
            {league.name}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
          <Users className="h-3 w-3" />
          {memberCount} participante{memberCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Code if creator */}
      {isCreator && inviteCode && (
        <CodeBadge code={inviteCode} />
      )}

      {/* Leave button */}
      {!isDefault && (
        <button
          onClick={() => onLeave(league.id, league.name)}
          className="mt-auto w-full rounded-lg border border-red-500/40 bg-red-500/10 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
        >
          Salir
        </button>
      )}
    </div>
  );
}

// ── Modales ──────────────────────────────────────────────────

export function CreateLeagueModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: () => void }) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: myLeagues } = useMyLeagues(user?.id);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const UNLIMITED_EMAILS = ["joseramosmeseguer@gmail.com"];
  const unlimited = isAdmin || UNLIMITED_EMAILS.includes(user?.email ?? "");
  const createdByMe = (myLeagues ?? []).filter((m) => m.league?.creator_id === user?.id).length;
  const atLimit = !unlimited && createdByMe >= 4;

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    // invite_code no se selecciona aquí (no es legible vía la tabla); se recupera
    // aparte con la función segura get_my_league_invite_codes()
    const { data, error } = await (supabase as any)
      .from("leagues")
      .insert({ name: name.trim(), creator_id: user!.id, invite_code: "" })
      .select("id, name, creator_id, is_default, created_at")
      .single();
    if (error) {
      toast.error(error.message.includes("unique") ? "Ya existe una liga con ese nombre" : error.message);
      setSaving(false);
      return;
    }
    await (supabase as any).from("league_memberships").insert({
      league_id: data.id,
      user_id: user!.id,
      is_league_admin: true,
    });
    // Crear una liga real es lo contrario de jugar individualmente.
    await (supabase as any).from("profiles").update({ plays_individually: false }).eq("id", user!.id);
    const { data: codes } = await (supabase as any).rpc("get_my_league_invite_codes");
    const code = (codes ?? []).find((c: any) => c.league_id === data.id)?.invite_code ?? null;
    qc.invalidateQueries({ queryKey: ["leagues"] });
    qc.invalidateQueries({ queryKey: ["my_leagues", user!.id] });
    qc.invalidateQueries({ queryKey: ["all_league_members"] });
    qc.invalidateQueries({ queryKey: ["my_league_invite_codes", user!.id] });
    qc.invalidateQueries({ queryKey: ["my_profile", user!.id] });
    setSaving(false);
    setCreatedCode(code);
  }

  function handleClose() {
    setName("");
    setCreatedCode(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" /> Crear liga
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">¡Crea una liga con quien quieras!</p>
              <p>Pon un nombre que os identifique, comparte el código y que empiece la batalla.</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {createdCode ? (
          <div className="space-y-4 text-center py-2">
            <div className="text-4xl">🎉</div>
            <p className="font-bold text-lg">¡Liga creada!</p>
            <div className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 space-y-2 text-left">
              <p className="text-xs font-semibold text-gold uppercase tracking-wide">Código de invitación</p>
              <div className="flex justify-center">
                <CodeBadge code={createdCode} />
              </div>
              <p className="text-xs text-muted-foreground">
                Comparte este código con quien quieras que entre. Solo quien tenga el código exacto puede unirse.
              </p>
            </div>
            <button
              onClick={() => { handleClose(); onSuccess?.(); }}
              className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-bold text-sm"
            >
              Listo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {atLimit && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                Has alcanzado el límite de 4 ligas creadas.
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre de la liga</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Los Cracks del Trabajo"
                disabled={atLimit}
                maxLength={40}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                onKeyDown={(e) => e.key === "Enter" && !atLimit && create()}
              />
              <p className="text-[11px] text-muted-foreground">
                Tus amigos buscarán la liga por este nombre para unirse.
              </p>
            </div>
            <button
              onClick={create}
              disabled={saving || !name.trim() || atLimit}
              className="w-full rounded-xl bg-pitch-deep text-white py-2.5 font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {saving ? "Creando…" : "Crear liga"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function JoinLeagueModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  async function join() {
    if (code.trim().length < 5) return;
    setJoining(true);
    const { data, error } = await (supabase as any).rpc("join_by_code", {
      p_code: code.trim().toUpperCase(),
    });
    setJoining(false);
    if (error) {
      toast.error(error.message.includes("válido") ? "Código incorrecto, compruébalo." : error.message.includes("miembro") ? "Ya estás en esta liga." : error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["my_leagues", user!.id] });
    qc.invalidateQueries({ queryKey: ["all_league_members"] });
    toast.success(`¡Te has unido a ${data?.league_name ?? "la liga"}!`);
    handleClose();
    onSuccess?.();
  }

  function handleClose() {
    setCode("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" /> Unirse a una liga
          </DialogTitle>
          <DialogDescription>
            Pide el código de 5 dígitos al creador de la liga e introdúcelo aquí.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Código de invitación</label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.slice(0, 5).toUpperCase())}
              placeholder="12345"
              maxLength={5}
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-center tracking-[0.4em] font-mono text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              onKeyDown={(e) => e.key === "Enter" && join()}
            />
          </div>
          <button
            onClick={join}
            disabled={joining || code.length < 5}
            className="w-full rounded-xl bg-pitch-deep text-white py-2.5 font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {joining ? "Uniéndome…" : "Unirme a la liga"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LeaveLeagueDialog({
  leagueId,
  leagueName,
  onClose,
}: {
  leagueId: string | null;
  leagueName: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [leaving, setLeaving] = useState(false);

  async function leave() {
    if (!leagueId) return;
    setLeaving(true);
    const { error } = await (supabase as any)
      .from("league_memberships")
      .delete()
      .eq("league_id", leagueId)
      .eq("user_id", user!.id);
    setLeaving(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["my_leagues", user!.id] });
    qc.invalidateQueries({ queryKey: ["all_league_members"] });
    toast.success(`Has salido de ${leagueName}`);
    onClose();
  }

  return (
    <Dialog open={!!leagueId} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Salir de {leagueName}?</DialogTitle>
          <DialogDescription>
            Puedes volver a unirte con el código de invitación si cambias de opinión.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={leave}
            disabled={leaving}
            className="flex-1 rounded-xl bg-red-500 text-white py-2.5 text-sm font-bold disabled:opacity-40 hover:bg-red-600 transition-colors"
          >
            {leaving ? "Saliendo…" : "Sí, salir"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Gestión de miembros (para league admins) ─────────────────

export function ManageLeagueModal({
  leagueId, leagueName, open, onClose,
}: { leagueId: string; leagueName: string; open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  // Usar hooks que ya funcionan con RLS para usuarios normales
  const { data: allMembers } = useAllLeagueMembers();
  const { data: profiles } = useProfiles();
  const [expelling, setExpelling] = useState<string | null>(null); // user_id a confirmar
  const [removing, setRemoving] = useState(false);

  const leagueMembers = useMemo(
    () => (allMembers ?? []).filter((m) => m.league_id === leagueId),
    [allMembers, leagueId]
  );

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => (m[p.id] = p));
    return m;
  }, [profiles]);

  async function confirmExpel() {
    if (!expelling) return;
    setRemoving(true);
    const { error } = await (supabase as any)
      .from("league_memberships")
      .delete()
      .eq("league_id", leagueId)
      .eq("user_id", expelling);
    setRemoving(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["all_league_members"] });
    qc.invalidateQueries({ queryKey: ["my_leagues"] });
    const name = profileMap[expelling]?.display_name ?? "El usuario";
    toast.success(`${name} ha sido expulsado/a`);
    setExpelling(null);
  }

  const isLoading = !allMembers || !profiles;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> {leagueName}
            </DialogTitle>
            <DialogDescription>
              {leagueMembers.length} miembro{leagueMembers.length !== 1 ? "s" : ""}. Puedes expulsar a cualquiera excepto a ti mismo.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">Cargando…</div>
          ) : leagueMembers.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">Sin miembros.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {leagueMembers.map((m) => {
                const p = profileMap[m.user_id];
                const name = p?.display_name ?? m.user_id.slice(0, 8);
                const isMe = m.user_id === user?.id;
                return (
                  <div key={m.user_id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="truncate">{p?.avatar_emoji} {name}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {isMe && <span className="text-[10px] text-muted-foreground">Tú</span>}
                      {!isMe && (
                        <button
                          onClick={() => setExpelling(m.user_id)}
                          className="text-xs font-medium text-destructive border border-destructive/30 rounded-lg px-2 py-0.5 hover:bg-destructive/10 transition-colors"
                        >
                          Expulsar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación de expulsión */}
      <Dialog open={!!expelling} onOpenChange={() => setExpelling(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>¿Expulsar a {profileMap[expelling ?? ""]?.display_name ?? "este usuario"}?</DialogTitle>
            <DialogDescription>
              Saldrá de la liga <strong>{leagueName}</strong>. Podrá volver a unirse con el código si alguien se lo comparte.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setExpelling(null)}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmExpel}
              disabled={removing}
              className="flex-1 rounded-xl bg-destructive text-destructive-foreground py-2.5 text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {removing ? "Expulsando…" : "Sí, expulsar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Onboarding obligatorio para usuarios nuevos ──────────────

export function LeagueOnboarding({ onJoined }: { onJoined?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joiningSolo, setJoiningSolo] = useState(false);

  async function joinIndividually() {
    setJoiningSolo(true);
    // Jugar individualmente es estar solo: si por lo que sea ya fuera
    // miembro de alguna liga (p.ej. la liga por defecto de versiones
    // antiguas), lo sacamos para que no comparta clasificación con nadie.
    await (supabase as any).from("league_memberships").delete().eq("user_id", user!.id);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ plays_individually: true })
      .eq("id", user!.id);
    setJoiningSolo(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["my_profile", user!.id] });
    qc.invalidateQueries({ queryKey: ["my_leagues", user!.id] });
    qc.invalidateQueries({ queryKey: ["all_league_members"] });
    onJoined?.();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-pitch-deep px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/30 text-4xl shadow-gold">
          🏆
        </div>
        <h1 className="font-display text-4xl uppercase text-gold leading-none mb-2">Bienvenido/a</h1>
        <p className="text-white/70 text-sm max-w-xs mb-8">
          Para participar necesitas estar en una liga. Únete a la de un amigo, crea la tuya propia, o juega de forma individual.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={() => setShowJoin(true)}
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-left hover:bg-white/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <LogIn className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Unirme a una liga</p>
                <p className="text-xs text-white/60">Pídele el código de 5 dígitos al organizador</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setShowCreate(true)}
            className="w-full rounded-2xl border border-gold/30 bg-gold/10 px-5 py-4 text-left hover:bg-gold/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-gold">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-gold text-sm">Crear una liga</p>
                <p className="text-xs text-white/60">Invita a tus amigos con un código único</p>
              </div>
            </div>
          </button>

          <button
            onClick={joinIndividually}
            disabled={joiningSolo}
            className="w-full rounded-2xl border border-white/10 bg-transparent px-5 py-4 text-left hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white/85 text-sm">{joiningSolo ? "Entrando…" : "Jugar individualmente"}</p>
                <p className="text-xs text-white/50">Sin liga privada, para empezar a pronosticar ya</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <CreateLeagueModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={onJoined} />
      <JoinLeagueModal open={showJoin} onClose={() => setShowJoin(false)} onSuccess={onJoined} />
    </>
  );
}

// ── Componente principal ─────────────────────────────────────

export function LeaguesSection({ leaderboardRows }: { leaderboardRows: any[] }) {
  const { user } = useAuth();
  const { data: myLeagues, isLoading } = useMyLeagues(user?.id);
  const { data: allMembers } = useAllLeagueMembers();
  const { data: myCodes } = useMyLeagueInviteCodes(user?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [leaving, setLeaving] = useState<{ id: string; name: string } | null>(null);

  const memberCountByLeague = useMemo(() => {
    const map: Record<string, number> = {};
    (allMembers ?? []).forEach(({ league_id }) => {
      map[league_id] = (map[league_id] ?? 0) + 1;
    });
    return map;
  }, [allMembers]);

  const codeByLeague = useMemo(() => {
    const map: Record<string, string> = {};
    (myCodes ?? []).forEach(({ league_id, invite_code }) => { map[league_id] = invite_code; });
    return map;
  }, [myCodes]);

  if (isLoading) return null;

  const memberships = myLeagues ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
        <span className="text-base shrink-0">🔄</span>
        <span>Recarga la página de vez en cuando para ver las últimas actualizaciones.</span>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl uppercase flex items-center gap-2">
          <Trophy className="h-5 w-5 text-gold" /> Mis ligas
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoin(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <LogIn className="h-3.5 w-3.5" /> Unirse
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Crear
          </button>
        </div>
      </div>

      {/* Cards — horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {memberships.map((m) => (
          <LeagueCard
            key={m.league_id}
            membership={m}
            memberCount={memberCountByLeague[m.league_id] ?? 0}
            inviteCode={codeByLeague[m.league_id]}
            leaderboardRows={leaderboardRows}
            onLeave={(id, name) => setLeaving({ id, name })}
          />
        ))}

        {/* Crear liga */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex-shrink-0 w-36 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 p-4 hover:border-gold/50 hover:bg-gold/5 transition-colors text-muted-foreground hover:text-gold"
        >
          <Plus className="h-6 w-6" />
          <span className="text-xs font-medium text-center leading-tight">Crear liga</span>
        </button>
      </div>

      {/* Modals */}
      <CreateLeagueModal open={showCreate} onClose={() => setShowCreate(false)} />
      <JoinLeagueModal open={showJoin} onClose={() => setShowJoin(false)} />
      <LeaveLeagueDialog
        leagueId={leaving?.id ?? null}
        leagueName={leaving?.name ?? ""}
        onClose={() => setLeaving(null)}
      />
    </section>
  );
}
