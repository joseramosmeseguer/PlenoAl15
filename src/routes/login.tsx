import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
      <div className="relative hidden md:block bg-gradient-pitch">
        <div className="relative z-10 h-full flex flex-col justify-end p-10">
          <div className="display text-6xl text-gold leading-none">Pleno al 15</div>
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
