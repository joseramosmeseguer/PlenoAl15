import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useProfiles, useMyLeagues, useAllLeagueMembers } from "@/lib/queries";
import { CreateLeagueModal, JoinLeagueModal } from "@/components/LeaguesSection";
import { Plus, KeyRound, BookOpen, Share2, Newspaper, ChevronRight, LogIn, Download, Users, User } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import estadioEpicoImg from "@/assets/EstadioEpico2.png";
import estadioInstalarImg from "@/assets/Estadiofutbolfondo.png";

export const Route = createFileRoute("/inicio")({
  component: Inicio,
  head: () => ({ meta: [{ title: "Inicio · PlenoAl15" }] }),
});

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function Inicio() {
  const { user } = useAuth();
  const { data: profiles } = useProfiles();
  const { data: myLeagues } = useMyLeagues(user?.id);
  const { data: allMembers } = useAllLeagueMembers();
  const myProfile = (profiles ?? []).find((p: any) => p.id === user?.id);
  const displayName = myProfile?.display_name ?? myProfile?.avatar_emoji ?? "campeón";

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [installTutorialOpen, setInstallTutorialOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream);
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const memberCountByLeague = useMemo(() => {
    const map: Record<string, number> = {};
    (allMembers ?? []).forEach(({ league_id }) => { map[league_id] = (map[league_id] ?? 0) + 1; });
    return map;
  }, [allMembers]);

  const myLeagueList = (myLeagues ?? []).map((m) => m.league).filter(Boolean) as any[];

  async function installApp() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
      return;
    }
    setInstallTutorialOpen(true);
  }

  async function invite() {
    const url = window.location.origin;
    const message =
      `¿Te gustó la app de El Mundial? ¡Pues ahora llega PlenoAl15! ` +
      `Pronostica los partidos de LaLiga y compite con tus amigos. Esta vez habrá eventos de Copa del Rey, ` +
      `Champions, noticias y mucho más.\n\n${url}`;

    if (navigator.share) {
      try {
        const res = await fetch("/images/logo/logo-horizontal.webp");
        const blob = await res.blob();
        const file = new File([blob], "pleno-al-15.webp", { type: blob.type });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: "PlenoAl15", text: message, files: [file] });
          return;
        }
      } catch {
        // si falla preparar la imagen, seguimos con el share de solo texto
      }
      navigator.share({ title: "PlenoAl15", text: message }).catch(() => {});
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
      {/* Cabecera: cuelga pegada de la barra superior */}
      <div className="relative -mt-6 md:-mt-8 overflow-hidden rounded-b-3xl shadow-soft">
        <img src={estadioEpicoImg} alt="" className="absolute inset-0 h-full w-full object-cover object-center scale-105" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
        <div className="relative flex items-center gap-4 p-5">
          <img src="/images/logo/logo-cuadrado.webp" alt="PlenoAl15" className="h-14 w-14 rounded-2xl shadow-gold shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">Bienvenido</p>
            {user ? (
              <Link to="/perfil" className="flex items-center gap-1 group">
                <h1 className="display text-2xl text-white truncate group-hover:text-gold transition-colors">{displayName}</h1>
                <ChevronRight className="h-4 w-4 text-white/50 shrink-0 group-hover:text-gold transition-colors" />
              </Link>
            ) : (
              <h1 className="display text-2xl text-white truncate">a PlenoAl15</h1>
            )}
          </div>
        </div>
      </div>

      {/* Mis ligas */}
      {user && myLeagueList.length > 0 && (
        <section className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mis ligas</span>
          </div>
          {myLeagueList.map((league: any) => (
            <Link
              key={league.id}
              to="/clasificacion"
              search={{ league: league.id }}
              className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm ${
                league.is_default ? "bg-muted text-muted-foreground" : "bg-gradient-gold text-gold-foreground shadow-gold"
              }`}>
                {league.is_default ? <User className="h-4 w-4" /> : league.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{league.is_default ? "Individual" : league.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {memberCountByLeague[league.id] ?? 0} participantes
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </section>
      )}

      {/* Instalar app */}
      <button
        type="button"
        onClick={installApp}
        className="relative w-full overflow-hidden rounded-2xl shadow-soft text-left"
      >
        <img src={estadioInstalarImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30" />
        <div className="relative flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/20 ring-1 ring-gold/40">
            <Download className="h-5 w-5 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm text-white block">Instalar la app</span>
            <span className="text-xs text-white/70">Acceso directo desde tu pantalla de inicio</span>
          </div>
        </div>
      </button>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-2">
        {actions.map(({ label, icon: Icon, to, onClick, accent }) => {
          const content = (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                <Icon className={`h-4 w-4 ${accent}`} />
              </div>
              <span className="font-semibold text-xs truncate">{label}</span>
            </>
          );
          const className = "flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-soft hover:bg-muted/60 transition-colors text-left";
          return to ? (
            <Link key={label} to={to} className={className}>{content}</Link>
          ) : (
            <button key={label} type="button" onClick={onClick} className={className}>{content}</button>
          );
        })}
      </div>

      {/* Noticias */}
      <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] text-white shadow-soft overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/60">
            <Newspaper className="h-4 w-4" /> Noticias
          </h2>
          <ChevronRight className="h-4 w-4 text-white/40" />
        </div>
        <p className="text-sm text-white/50 py-8 text-center">Todavía no hay noticias.</p>
      </section>

      <CreateLeagueModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinLeagueModal open={joinOpen} onClose={() => setJoinOpen(false)} />

      {/* Tutorial de instalación (iOS / navegadores sin prompt nativo) */}
      <Dialog open={installTutorialOpen} onOpenChange={setInstallTutorialOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar PlenoAl15</DialogTitle>
            <DialogDescription>
              {isIOS ? "En iPhone/iPad se instala así:" : "Sigue estos pasos desde el menú de tu navegador:"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {isIOS ? (
              <>
                <TutorialStep n={1}>
                  Toca el botón <b>Compartir ⬆️</b> en la barra inferior de Safari
                </TutorialStep>
                <TutorialStep n={2}>
                  Baja un poco hasta ver <b>"Añadir a pantalla de inicio"</b>
                </TutorialStep>
                <TutorialStep n={3}>
                  Pulsa <b>"Añadir"</b> arriba a la derecha
                </TutorialStep>
              </>
            ) : (
              <>
                <TutorialStep n={1}>
                  Abre el menú de tu navegador (⋮ arriba a la derecha)
                </TutorialStep>
                <TutorialStep n={2}>
                  Busca <b>"Instalar app"</b> o <b>"Añadir a pantalla de inicio"</b>
                </TutorialStep>
                <TutorialStep n={3}>
                  Confirma y listo — ya tienes PlenoAl15 como una app
                </TutorialStep>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TutorialStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-muted px-3 py-2">
      <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-gold-foreground text-[10px] font-bold">{n}</span>
      <p className="text-sm leading-snug">{children}</p>
    </div>
  );
}
