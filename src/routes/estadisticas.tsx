import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/estadisticas")({
  component: Stats,
  head: () => ({ meta: [{ title: "Estadísticas · PlenoAl15" }] }),
});

function Stats() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-pitch text-white p-5 shadow-soft">
        <div className="display text-3xl flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Estadísticas</div>
        <p className="text-white/80 text-sm">Cómo pronostica la comunidad y datos reales de LaLiga.</p>
      </div>

      <section className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
          <span className="text-3xl">🚧</span>
          <p className="text-sm font-medium">Próximamente</p>
          <p className="text-xs opacity-70">Aquí verás cómo pronostica la comunidad y estadísticas reales de la liga.</p>
        </div>
      </section>
    </div>
  );
}
