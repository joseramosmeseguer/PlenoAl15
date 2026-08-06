import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Nueva contraseña · PlenoAl15" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("¡Contraseña actualizada!");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo actualizar. Pide un nuevo enlace desde el login.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-gradient-night text-primary-foreground">
      <div className="relative hidden md:block bg-gradient-pitch">
        <div className="relative z-10 h-full flex flex-col justify-end p-10">
          <div className="display text-6xl text-gold leading-none">PlenoAl15</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="mx-auto h-14 w-14 rounded-full bg-gradient-gold flex items-center justify-center text-2xl shadow-gold">🔑</div>
            <h1 className="display text-4xl mt-4">Nueva contraseña</h1>
            <p className="text-white/70 mt-1 text-sm">Elige una contraseña nueva para tu cuenta.</p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-sm text-white/80">Contraseña nueva</label>
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gold hover:bg-gold/90 text-gold-foreground font-semibold">
              {busy ? "…" : "Guardar contraseña"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
