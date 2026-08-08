import { Link, useLocation } from "@tanstack/react-router";
import { Home, Trophy, Calendar, ListChecks, BookOpen, Shield, LogOut, Menu, X, Star, User, BarChart3, MoreHorizontal, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMyLeagues, useMyProfile } from "@/lib/queries";
import { LeagueOnboarding } from "@/components/LeaguesSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NAV_PRIMARY = [
  { to: "/inicio", label: "Inicio", icon: Home },
  { to: "/clasificacion", label: "Clasificación", icon: Trophy },
  { to: "/mis-pronosticos", label: "Pronósticos", icon: ListChecks },
  { to: "/calendario", label: "LaLiga", icon: Calendar },
] as const;

const NAV_SECONDARY = [
  { to: "/champions", label: "Champions", icon: Star },
  { to: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { to: "/reglas", label: "Reglas", icon: BookOpen },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [nameJustSet, setNameJustSet] = useState(false);
  const { data: myLeagues, isLoading: leaguesLoading } = useMyLeagues(user?.id);
  const { data: myProfile, isLoading: profileLoading } = useMyProfile(user?.id);
  const nameAlreadyChosen = !!user && (!!localStorage.getItem(`name_changed_${user.id}`) || nameJustSet);
  const needsName = !loading && !!user && !nameAlreadyChosen;
  const needsLeague =
    !loading && !leaguesLoading && !profileLoading && !!user && !needsName &&
    !myProfile?.plays_individually && (myLeagues ?? []).length === 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-night text-white">
        <div className="animate-pulse text-2xl display">Cargando…</div>
      </div>
    );
  }

  // Login y recuperar contraseña son pantallas a pantalla completa, sin cabecera.
  if (!user && (location.pathname === "/login" || location.pathname === "/reset-password")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      {needsName && user && (
        <OnboardingModal
          userId={user.id}
          onDone={() => {
            localStorage.setItem(`name_changed_${user.id}`, "1");
            setNameJustSet(true);
          }}
        />
      )}
      {!needsName && needsLeague && <LeagueOnboarding />}
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-gold/35 bg-[#11110f]/96 text-white shadow-[0_8px_28px_-20px_rgba(0,0,0,.8)] backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link to="/inicio" className="flex items-center gap-2">
            <img src="/images/logo/logo-cuadrado.webp" alt="" className="h-9 w-9 rounded-full ring-1 ring-gold/45 shadow-gold" />
            <div className="display text-xl tracking-[0.08em] sm:text-2xl">PlenoAl<span className="text-gold">15</span></div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV_PRIMARY.map((n) => {
              const active = location.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active ? "bg-gold text-gold-foreground shadow-sm" : "text-white/70 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
            <div className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                  moreOpen ? "bg-gold text-gold-foreground" : "text-white/70 hover:bg-white/8 hover:text-white"
                }`}
              >
                <MoreHorizontal className="h-4 w-4" /> Más
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-soft overflow-hidden z-50">
                  {NAV_SECONDARY.map((n) => {
                    const Icon = n.icon;
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" /> {n.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                      location.pathname.startsWith("/admin")
                        ? "bg-gold text-gold-foreground"
                        : "text-gold/90 hover:bg-white/10"
                    }`}
                  >
                    <Shield className="h-4 w-4" /> Admin
                  </Link>
                )}
                <Button variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-3 py-2 rounded-md text-sm font-bold bg-gold text-gold-foreground hover:bg-gold/90 transition-colors"
              >
                Crear cuenta / Entrar
              </Link>
            )}
          </nav>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menú">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-gold/20 bg-[#11110f]">
            <div className="flex flex-col p-2">
              {NAV_PRIMARY.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-md text-white/85 hover:bg-white/10"
                >
                  {n.label}
                </Link>
              ))}
              {user && (
                <Link to="/perfil" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md text-white/85 hover:bg-white/10">
                  Mi perfil
                </Link>
              )}
              <div className="my-1 border-t border-white/10" />
              {NAV_SECONDARY.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-md text-white/70 hover:bg-white/10"
                >
                  {n.label}
                </Link>
              ))}
              {user ? (
                <>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md text-gold flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Admin
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setOpen(false);
                      signOut();
                    }}
                    className="text-left px-3 py-2 rounded-md text-white/70 hover:bg-white/10"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-md text-gold font-bold"
                >
                  Crear cuenta / Entrar
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:py-8 md:pb-12">{children}</main>

      {/* Bottom nav móvil */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-black/10 bg-white/95 shadow-[0_-12px_30px_-22px_rgba(0,0,0,.45)] backdrop-blur-xl">
        <div className="grid grid-cols-5">
          {NAV_PRIMARY.map((n) => {
            const Icon = n.icon;
            const active = location.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center justify-center py-3 text-[10px] gap-1 ${
                  active ? "text-black" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5] text-gold" : ""}`} />
                {n.label.split(" ")[0]}
              </Link>
            );
          })}
          {user ? (
            <Link
              to="/perfil"
              className={`flex flex-col items-center justify-center py-3 text-[10px] gap-1 ${
                location.pathname === "/perfil" ? "text-black" : "text-muted-foreground"
              }`}
            >
              <User className="h-5 w-5" />
              Perfil
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex flex-col items-center justify-center py-3 text-[10px] gap-1 text-muted-foreground"
            >
              <LogIn className="h-5 w-5" />
              Entrar
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}

function OnboardingModal({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
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
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar el nombre. Inténtalo de nuevo.");
      return;
    }
    toast.success(`¡Bienvenido, ${trimmed}!`);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-deep/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-night border border-white/15 shadow-2xl p-8 text-white flex flex-col items-center gap-6">
        <div className="h-16 w-16 rounded-full bg-gradient-gold flex items-center justify-center text-3xl shadow-gold">
          🏆
        </div>
        <div className="text-center">
          <h2 className="display text-3xl">¡Bienvenido!</h2>
          <p className="text-white/70 mt-2 text-sm">
            ¿Cómo quieres que te conozcan en la clasificación?
          </p>
        </div>
        <div className="w-full space-y-3">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Tu nombre o apodo"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center text-lg h-12"
            maxLength={30}
          />
          <Button
            onClick={save}
            disabled={saving || !name.trim()}
            className="w-full bg-gold hover:bg-gold/90 text-gold-foreground font-semibold h-12 text-base"
          >
            {saving ? "Guardando…" : "¡Listo, a jugar!"}
          </Button>
        </div>
      </div>
    </div>
  );
}
