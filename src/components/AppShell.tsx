import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Trophy, Calendar, ListChecks, BookOpen, Shield, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMyLeagues } from "@/lib/queries";
import { LeagueOnboarding } from "@/components/LeaguesSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Clasificación", icon: Trophy },
  { to: "/mis-pronosticos", label: "Pronósticos", icon: ListChecks },
  { to: "/calendario", label: "Calendario", icon: Calendar },
  { to: "/reglas", label: "Reglas", icon: BookOpen },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [nameJustSet, setNameJustSet] = useState(false);
  const { data: myLeagues, isLoading: leaguesLoading } = useMyLeagues(user?.id);
  const nameAlreadyChosen = !!user && (!!localStorage.getItem(`name_changed_${user.id}`) || nameJustSet);
  const needsName = !loading && !!user && !nameAlreadyChosen;
  const needsLeague = !loading && !leaguesLoading && !!user && !needsName && (myLeagues ?? []).length === 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-night text-primary-foreground">
        <div className="animate-pulse text-2xl display">Cargando…</div>
      </div>
    );
  }

  if (!user) {
    if (location.pathname !== "/login") {
      // redirect on next tick
      queueMicrotask(() => navigate({ to: "/login" }));
    }
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
      <header className="sticky top-0 z-40 border-b border-border bg-gradient-night text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center text-xl shadow-gold">
              🏆
            </div>
            <div className="display text-2xl tracking-wide">Pleno al 15</div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const active = location.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
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
          </nav>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menú">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-white/10 bg-pitch-deep">
            <div className="flex flex-col p-2">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-md text-white/85 hover:bg-white/10"
                >
                  {n.label}
                </Link>
              ))}
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
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:pb-10">{children}</main>

      {/* Bottom nav móvil */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="grid grid-cols-4">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = location.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center justify-center py-3 text-[10px] gap-1 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {n.label.split(" ")[0]}
              </Link>
            );
          })}
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
      <div className="w-full max-w-sm rounded-3xl bg-gradient-night border border-white/15 shadow-2xl p-8 text-primary-foreground flex flex-col items-center gap-6">
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
