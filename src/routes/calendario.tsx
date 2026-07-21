import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMatches } from "@/lib/queries";
import { formatKickoff, STAGE_LABELS } from "@/lib/scoring";
import { Calendar, Star } from "lucide-react";

export const Route = createFileRoute("/calendario")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendario · El Mundial" }] }),
});

function CalendarPage() {
  const { data: matches } = useMatches();

  const byStage = useMemo(() => {
    const g: Record<string, any[]> = {};
    (matches ?? []).forEach((m: any) => (g[m.stage] ||= []).push(m));
    return g;
  }, [matches]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-pitch text-primary-foreground p-5 shadow-soft">
        <div className="display text-3xl flex items-center gap-2"><Calendar className="h-6 w-6" /> Calendario y resultados</div>
        <p className="text-white/80 text-sm">Todos los partidos del Mundial.</p>
      </div>

      {Object.entries(byStage).map(([stage, list]) => (
        <section key={stage} className="space-y-2">
          <h2 className="display text-2xl">{STAGE_LABELS[stage] ?? stage}</h2>
          <div className="grid gap-2">
            {list.map((m) => (
              <div key={m.id} className={`rounded-xl border bg-card p-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 shadow-soft ${m.is_megapremium ? "border-red-500/50" : m.is_premium ? "border-gold/40" : "border-border"}`}>
                <div className="text-right truncate">
                  <span className="font-semibold">{m.home?.name ?? m.home_label}</span>{" "}
                  <span className="text-xl">{m.home?.flag ?? ""}</span>
                </div>
                <div className="text-center">
                  <div className="display text-2xl">
                    {m.home_score ?? "·"} <span className="text-muted-foreground">–</span> {m.away_score ?? "·"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.status === "finished" ? "FIN" : m.status === "live" ? "EN VIVO" : formatKickoff(m.kickoff_at)}
                  </div>
                  {m.is_megapremium ? (
                    <div className="text-[10px] text-red-600 dark:text-red-400 font-semibold flex items-center justify-center gap-1 mt-0.5">
                      <Star className="h-3 w-3 fill-red-600 dark:fill-red-400" /> MEGAPREMIUM
                    </div>
                  ) : m.is_premium && (
                    <div className="text-[10px] text-gold font-semibold flex items-center justify-center gap-1 mt-0.5">
                      <Star className="h-3 w-3 fill-gold" /> PREMIUM
                    </div>
                  )}
                </div>
                <div className="truncate">
                  <span className="text-xl">{m.away?.flag ?? ""}</span>{" "}
                  <span className="font-semibold">{m.away?.name ?? m.away_label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
