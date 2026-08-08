import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLeaderboard, useProfiles, useMyLeagues, useAllLeagueMembers } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, User, BarChart3, ImagePlus, Check, Shield, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import estadioEpicoImg from "@/assets/EstadioEpico1.png";
import { AVATAR_OPTIONS } from "@/lib/avatars";
import { ManageLeagueModal } from "@/components/LeaguesSection";

export const Route = createFileRoute("/perfil")({
  component: Perfil,
  head: () => ({ meta: [{ title: "Mi perfil · PlenoAl15" }] }),
});

function Perfil() {
  const { user } = useAuth();
  const { data: rows, isLoading } = useLeaderboard();
  const { data: profiles } = useProfiles();
  const { data: myLeagues } = useMyLeagues(user?.id);
  const { data: allMembers } = useAllLeagueMembers();
  const [changeNameOpen, setChangeNameOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [managingLeague, setManagingLeague] = useState<{ id: string; name: string } | null>(null);

  const myProfile = useMemo(() => (profiles ?? []).find((p: any) => p.id === user?.id), [profiles, user]);
  const displayName = myProfile?.display_name ?? myProfile?.avatar_emoji ?? "campeón";
  const nameAlreadyChanged = !!myProfile?.name_changed;

  const createdLeagues = useMemo(
    () => (myLeagues ?? []).map((m: any) => m.league).filter((l: any) => l && !l.is_default && l.creator_id === user?.id),
    [myLeagues, user],
  );
  const memberCountByLeague = useMemo(() => {
    const map: Record<string, number> = {};
    (allMembers ?? []).forEach(({ league_id }: any) => { map[league_id] = (map[league_id] ?? 0) + 1; });
    return map;
  }, [allMembers]);

  const list = rows ?? [];
  const myPos = user ? list.findIndex((r) => r.user_id === user.id) : -1;
  const myRow = myPos >= 0 ? list[myPos] : null;

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <button
          type="button"
          onClick={() => setAvatarPickerOpen(true)}
          title="Elegir avatar"
          className="relative h-16 w-16 shrink-0 rounded-full bg-gradient-gold flex items-center justify-center text-2xl shadow-gold overflow-hidden group"
        >
          {myProfile?.avatar_url ? (
            <img src={myProfile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-7 w-7 text-gold-foreground" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <ImagePlus className="h-5 w-5 text-white" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="display text-2xl truncate">{displayName}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <button
              type="button"
              onClick={() => setAvatarPickerOpen(true)}
              className="text-xs text-primary hover:underline"
            >
              {myProfile?.avatar_url ? "Cambiar avatar" : "Elegir avatar"}
            </button>
            <button
              type="button"
              onClick={() => !nameAlreadyChanged && setChangeNameOpen(true)}
              disabled={nameAlreadyChanged}
              title={nameAlreadyChanged ? "Ya has usado tu único cambio de nombre" : "Cambiar tu nombre visible"}
              className={`flex items-center gap-1 text-xs ${
                nameAlreadyChanged ? "text-muted-foreground/40 cursor-not-allowed" : "text-primary hover:underline"
              }`}
            >
              <Pencil className="h-3 w-3" /> {nameAlreadyChanged ? "Nombre bloqueado" : "Editar nombre"}
            </button>
          </div>
        </div>
      </div>

      {/* Tus puntos */}
      {myRow && (
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
      )}

      {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Cargando…</p>}

      {/* Ligas que has creado */}
      {createdLeagues.length > 0 && (
        <section className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tus ligas</span>
          </div>
          <div>
            {createdLeagues.map((league: any) => (
              <div key={league.id} className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{league.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> {memberCountByLeague[league.id] ?? 0} participantes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setManagingLeague({ id: league.id, name: league.name })}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Gestionar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Estadísticas */}
      <section className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <span className="display text-xl">Tus estadísticas</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-muted-foreground">
          <span className="text-3xl">🚧</span>
          <p className="text-sm font-medium">Próximamente</p>
          <p className="text-xs opacity-70">Aciertos, rachas y mucho más, aquí.</p>
        </div>
      </section>

      <ChangeNameModal
        open={changeNameOpen}
        currentName={myProfile?.display_name ?? ""}
        userId={user.id}
        onClose={() => setChangeNameOpen(false)}
      />

      <AvatarPickerModal
        open={avatarPickerOpen}
        currentAvatarUrl={myProfile?.avatar_url ?? null}
        userId={user.id}
        onClose={() => setAvatarPickerOpen(false)}
      />

      {managingLeague && (
        <ManageLeagueModal
          leagueId={managingLeague.id}
          leagueName={managingLeague.name}
          open={!!managingLeague}
          onClose={() => setManagingLeague(null)}
        />
      )}
    </div>
  );
}

function AvatarPickerModal({ open, currentAvatarUrl, userId, onClose }: {
  open: boolean; currentAvatarUrl: string | null; userId: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  async function selectAvatar(url: string) {
    setSaving(url);
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    setSaving(null);
    if (error) { toast.error("No se pudo guardar el avatar. Inténtalo de nuevo."); return; }
    qc.invalidateQueries({ queryKey: ["profiles"] });
    qc.invalidateQueries({ queryKey: ["my_profile", userId] });
    toast.success("¡Avatar actualizado!");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4" /> Elige tu avatar
          </DialogTitle>
          <DialogDescription>Aparecerá en tu perfil y en la clasificación.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3">
          {AVATAR_OPTIONS.map((url) => {
            const selected = url === currentAvatarUrl;
            return (
              <button
                key={url}
                type="button"
                disabled={!!saving}
                onClick={() => selectAvatar(url)}
                className={`relative aspect-square rounded-full overflow-hidden border-2 transition-colors ${
                  selected ? "border-gold" : "border-transparent hover:border-primary/50"
                } disabled:opacity-50`}
              >
                <img src={url} alt="Avatar" className="h-full w-full object-cover" />
                {selected && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Check className="h-5 w-5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
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
    const { error } = await supabase.from("profiles").update({ display_name: trimmed, name_changed: true }).eq("id", userId);
    setSaving(false);
    if (error) { toast.error("No se pudo guardar. Inténtalo de nuevo."); return; }
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
