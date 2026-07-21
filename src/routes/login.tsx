import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import heroImg from "@/assets/hero-trophy.jpg";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada! Entrando…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) {
      toast.error(r.error.message ?? "Error con Google");
      setBusy(false);
    }
  }

  async function sendRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Si ese email existe, te hemos enviado un enlace para crear una nueva contraseña.");
      setMode("signin");
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-gradient-night text-primary-foreground">
      <div className="relative hidden md:block">
        <img src={heroImg} alt="Trofeo del Mundial" className="absolute inset-0 h-full w-full object-cover opacity-90" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-tr from-pitch-deep/90 via-pitch-deep/30 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-end p-10">
          <div className="display text-6xl text-gold leading-none">El Mundial</div>
          <div className="display text-6xl leading-none">2026</div>
          <p className="mt-4 max-w-sm text-white/85">Pronósticos entre amigos, ranking en directo y bonus para chinchar.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="mx-auto h-14 w-14 rounded-full bg-gradient-gold flex items-center justify-center text-2xl shadow-gold">
              {mode === "forgot" ? "🔑" : "🏆"}
            </div>
            <h1 className="display text-4xl mt-4">
              {mode === "signin" ? "Entra a jugar" : mode === "signup" ? "Crea tu cuenta" : "Recuperar acceso"}
            </h1>
            <p className="text-white/70 mt-1 text-sm">
              {mode === "signin" ? "Inicia sesión y la web te recordará." : mode === "signup" ? "Solo se hace una vez." : "Te enviaremos un enlace para crear una contraseña nueva."}
            </p>
          </div>

          {mode === "forgot" ? (
            <form onSubmit={sendRecovery} className="space-y-3">
              <div>
                <label className="text-sm text-white/80">Email</label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-gold hover:bg-gold/90 text-gold-foreground font-semibold">
                {busy ? "…" : "Enviar enlace"}
              </Button>
            </form>
          ) : (
            <>
              <p className="mb-3 text-center text-xs text-white/40 leading-relaxed">
                ¿Primera vez? Después del login te pediremos el código de tu liga.<br />
                Si ves un error al crear la cuenta, vuelve a intentarlo.
              </p>

              <Button
                type="button"
                onClick={google}
                disabled={busy}
                variant="outline"
                className="w-full bg-white text-gray-900 hover:bg-white/90 border-white/20 font-semibold"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                Continuar con Google
              </Button>

              <div className="my-4 flex items-center gap-2 text-white/40 text-xs">
                <div className="h-px flex-1 bg-white/15" /> o con email <div className="h-px flex-1 bg-white/15" />
              </div>

              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="text-sm text-white/80">Email</label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                </div>
                <div>
                  <label className="text-sm text-white/80">Contraseña</label>
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="tu contraseña"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-gold hover:bg-gold/90 text-gold-foreground font-semibold">
                  {busy ? "…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
                </Button>
              </form>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="mt-3 w-full text-center text-xs text-white/50 hover:text-white"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-sm text-white/70 hover:text-white"
          >
            {mode === "forgot" ? "¿Ya tienes cuenta? Entra" : mode === "signin" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Entra"}
          </button>

        </div>
      </div>
    </div>
  );
}
