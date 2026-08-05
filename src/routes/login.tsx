import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import estadioBg from "@/assets/EstadioNormalOscuro.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"welcome" | "signin" | "signup" | "forgot">("welcome");
  const [aboutOpen, setAboutOpen] = useState(false);
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
    <div className="relative min-h-screen text-white overflow-hidden">
      <img src={estadioBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-black/90" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {mode === "welcome" ? (
            <div className="text-center space-y-8">
              <div className="flex flex-col items-center gap-4">
                <img src="/images/logo/logo-hexagono.webp" alt="Pleno al 15" className="h-32 w-32 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/60">Bienvenido a</p>
                  <h1 className="display text-4xl text-gold leading-tight mt-1">PLENO AL 15</h1>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setAboutOpen(true)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 transition-colors"
                >
                  ¿De qué va esto?
                </button>
                <Button
                  onClick={() => setMode("signup")}
                  className="w-full bg-gold hover:bg-gold/90 text-gold-foreground font-bold py-6 text-base"
                >
                  Crear cuenta
                </Button>
                <Button
                  onClick={() => setMode("signin")}
                  variant="outline"
                  className="w-full border-white/25 bg-transparent text-white hover:bg-white/10 font-semibold py-6 text-base"
                >
                  Iniciar sesión
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setMode("welcome")}
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Volver
              </button>

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
                    ¿Primera vez? Después del login te pediremos tu nombre y el código de tu liga.<br />
                    Si ves un error al crear la cuenta, vuelve a intentarlo.
                  </p>

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
          )}
        </div>
      </div>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src="/images/logo/logo-reducido.webp" alt="" className="h-6 w-6" /> ¿Qué es Pleno al 15?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-foreground/90 text-left">
                <p>
                  Es una quiniela privada entre amigos: cada jornada de LaLiga pronosticas el resultado de los
                  partidos y ganas puntos según lo acertado que estés.
                </p>
                <p className="text-muted-foreground">
                  Puedes jugar solo o crear/unirte a una liga privada con tu grupo para tener vuestra propia
                  clasificación.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
