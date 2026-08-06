import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useProfiles } from "@/lib/queries";
import { CreateLeagueModal, JoinLeagueModal } from "@/components/LeaguesSection";
import { Plus, KeyRound, BookOpen, Share2, Newspaper, ChevronRight, LogIn } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/inicio")({
  component: Inicio,
  head: () => ({ meta: [{ title: "Inicio · Pleno al 15" }] }),
});

function Inicio() {
  const { user } = useAuth();
  const { data: profiles } = useProfiles();
  const myProfile = (profiles ?? []).find((p: any) => p.id === user?.id);
  const displayName = myProfile?.display_name ?? myProfile?.avatar_emoji ?? "campeón";

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  async function invite() {
    const url = window.location.origin;
    const message =
      `¿Te gustó la app de El Mundial? ¡Pues ahora llega Pleno al 15! ` +
      `Pronostica los partidos de LaLiga y compite con tus amigos. Esta vez habrá eventos de Copa del Rey, ` +
      `Champions, noticias y mucho más.\n\n${url}`;

    if (navigator.share) {
      try {
        const res = await fetch("/images/logo/logo-horizontal.webp");
        const blob = await res.blob();
        const file = new File([blob], "pleno-al-15.webp", { type: blob.type });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: "Pleno al 15", text: message, files: [file] });
          return;
        }
      } catch {
        // si falla preparar la imagen, seguimos con el share de solo texto
      }
      navigator.share({ title: "Pleno al 15", text: message }).catch(() => {});
      return;
    }
    navigator.clipboard.writeText(message).then(() => toast.success("Enlace copiado")).catch(() => {});
  }

  const actions = user
    ? [
        { label: "Crear liga", icon: Plus, onClick: () => setCreateOpen(true), accent: "text-gold" },
        { label: "Unirse a liga", icon: KeyRound, onClick: () => setJoinOpen(true), accent: "text-foreground" },
        { label: "Ver reglas", icon: BookOpen, to: "/reglas", accent: "text-foreground" },
        { label: "Invitar a amigos", icon: Share2, onClick: invite, accent: "text-foreground" },
      ]
    : [
        { label: "Crear cuenta / Entrar", icon: LogIn, to: "/login", accent: "text-gold" },
        { label: "Ver reglas", icon: BookOpen, to: "/reglas", accent: "text-foreground" },
      ];

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <img src="/images/logo/logo-cuadrado.webp" alt="Pleno al 15" className="h-14 w-14 rounded-2xl shadow-gold shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Bienvenido</p>
          <h1 className="display text-2xl truncate">{user ? displayName : "a Pleno al 15"}</h1>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ label, icon: Icon, to, onClick, accent }) => {
          const content = (
            <>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                <Icon className={`h-5 w-5 ${accent}`} />
              </div>
              <span className="font-semibold text-sm">{label}</span>
            </>
          );
          const className = "flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft hover:bg-muted/60 transition-colors text-left";
          return to ? (
            <Link key={label} to={to} className={className}>{content}</Link>
          ) : (
            <button key={label} type="button" onClick={onClick} className={className}>{content}</button>
          );
        })}
      </div>

      {/* Noticias */}
      <section className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <Newspaper className="h-4 w-4" /> Noticias
          </h2>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground py-8 text-center">Todavía no hay noticias.</p>
      </section>

      <CreateLeagueModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinLeagueModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}
