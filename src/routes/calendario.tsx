import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useClubMatches } from "@/lib/queries";
import { Calendar, Star } from "lucide-react";

export const Route = createFileRoute("/calendario")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendario · Pleno al 15" }] }),
});

function crestUrl(teamId?: number) {
  return teamId ? `/images/crests/${teamId}.png` : null;
}

function CalendarPage() {
  const { data: matches } = useClubMatches();

  const byMatchday = useMemo(() => {
    const g: Record<number, any[]> = {};
    (matches ?? []).forEach((m: any) => (g[m.matchday] ||= []).push(m));
    return g;
  }, [matches]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-pitch text-primary-foreground p-5 shadow-soft">
        <div className="display text-3xl flex items-center gap-2"><Calendar className="h-6 w-6" /> Calendario y resultados</div>
        <p className="text-white/80 text-sm">Todos los partidos de LaLiga cargados.</p>
      </div>

      {Object.entries(byMatchday)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([matchday, list]) => (
          <section key={matchday} className="space-y-2">
            <h2 className="display text-2xl">Jornada {matchday}</h2>
            <div className="grid gap-2">
              {list
                .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime())
                .map((m) => {
                  const isFinished = m.status === "FINISHED";
                  const kickoff = new Date(m.utc_date);
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border bg-card p-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 shadow-soft ${
                        m.is_megapremium ? "border-red-500/50" : m.is_premium ? "border-gold/40" : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-end gap-2 min-w-0 text-right">
                        <span className="font-semibold truncate">{m.home?.short_name ?? m.home?.name}</span>
                        {crestUrl(m.home?.id) && <img src={crestUrl(m.home?.id)!} alt="" className="h-6 w-6 object-contain shrink-0" />}
                      </div>
                      <div className="text-center shrink-0">
                        <div className="display text-2xl">
                          {isFinished ? `${m.home_score} – ${m.away_score}` : "vs"}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {isFinished
                            ? "FIN"
                            : kickoff.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }) +
                              " · " +
                              kickoff.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
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
                      <div className="flex items-center gap-2 min-w-0">
                        {crestUrl(m.away?.id) && <img src={crestUrl(m.away?.id)!} alt="" className="h-6 w-6 object-contain shrink-0" />}
                        <span className="font-semibold truncate">{m.away?.short_name ?? m.away?.name}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}

      {(matches ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">Todavía no hay partidos cargados.</p>
      )}
    </div>
  );
}
