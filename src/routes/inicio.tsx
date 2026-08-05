import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useProfiles } from "@/lib/queries";
import { Newspaper } from "lucide-react";

export const Route = createFileRoute("/inicio")({
  component: Inicio,
  head: () => ({ meta: [{ title: "Inicio · Pleno al 15" }] }),
});

function Inicio() {
  const { user } = useAuth();
  const { data: profiles } = useProfiles();
  const myProfile = (profiles ?? []).find((p: any) => p.id === user?.id);
  const displayName = myProfile?.display_name ?? myProfile?.avatar_emoji ?? "campeón";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <img src="/images/logo/logo-cuadrado.webp" alt="Pleno al 15" className="h-12 w-12 rounded-xl shadow-soft" />
        <h1 className="display text-3xl">Bienvenido, {displayName}</h1>
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-soft p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
          <Newspaper className="h-4 w-4" /> Noticias
        </h2>
        <p className="text-sm text-muted-foreground py-6 text-center">Todavía no hay noticias.</p>
      </section>
    </div>
  );
}
