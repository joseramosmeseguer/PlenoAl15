import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { SectionHero } from "@/components/SectionHero";

export const Route = createFileRoute("/estadisticas")({
  component: Stats,
  head: () => ({ meta: [{ title: "Estadísticas · PlenoAl15" }] }),
});

function Stats() {
  return (
    <div className="space-y-5">
      <SectionHero title="ESTADÍSTICAS" eyebrow="Datos y tendencias" subtitle="Cómo pronostica la comunidad y datos reales de LaLiga." icon={BarChart3} />

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
