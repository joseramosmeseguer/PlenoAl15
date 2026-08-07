import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLeaderboard, useProfiles } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, User, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import estadioEpicoImg from "@/assets/EstadioEpico1.png";

export const Route = createFileRoute("/perfil")({
  component: Perfil,
  head: () => ({ meta: [{ title: "Mi perfil · PlenoAl15" }] }),
});

function Perfil() {
  const { user } = useAuth();
  const { data: rows, isLoading } = useLeaderboard();
  const { data: profiles } = useProfiles();
  const [changeNameOpen, setChangeNameOpen] = useState(false);

  const myProfile = useMemo(() => (profiles ?? []).find((p: any) => p.id === user?.id), [profiles, user]);
  const displayName = myProfile?.display_name ?? myProfile?.avatar_emoji ?? "campeón";
  const nameAlreadyChanged = !!user && !!localStorage.getItem(`name_changed_${user.id}`);

  const list = rows ?? [];
  const myPos = user ? list.findIndex((r) => r.user_id === user.id) : -1;
  const myRow = myPos >= 0 ? list[myPos] : null;

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-gold flex items-center justify-center text-2xl shadow-gold">
          <User className="h-7 w-7 text-gold-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="display text-2xl truncate">{displayName}</h1>
          <p className="text-xs text-muted-foreground">Avatar personalizable — próximamente</p>
        </div>
        <button
          onClick={() => !nameAlreadyChanged && setChangeNameOpen(true)}
          disabled={nameAlreadyChanged}
          title={nameAlreadyChanged ? "Solo puedes cambiar el nombre una vez" : "Cambiar tu nombre visible"}
          className={`shrink-0 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
            nameAlreadyChanged
              ? "border-border text-muted-foreground/40 cursor-not-allowed"
              : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
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
