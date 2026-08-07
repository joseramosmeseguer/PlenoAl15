import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useClubMatches } from "@/lib/queries";
import { Calendar, Star, ChevronLeft } from "lucide-react";
import estadioFondo from "@/assets/Estadiofutbolfondo.png";
import { getLaLigaTeamDisplayName, getLaLigaTeamStadium } from "@/lib/laligaTeams";

export const Route = createFileRoute("/calendario")({
  component: CalendarPage,
  validateSearch: (search: Record<string, unknown>) => ({
    match: typeof search.match === "number" ? search.match : undefined,
  }),
  head: () => ({ meta: [{ title: "Calendario · PlenoAl15" }] }),
});

function crestUrl(teamId?: number) {
  return teamId ? `/images/crests/${teamId}.png` : null;
}

function CalendarPage() {
  const { data: matches } = useClubMatches();
  const { match: matchFromUrl } = Route.useSearch();
  const [flippedId, setFlippedId] = useState<number | null>(matchFromUrl ?? null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (matchFromUrl) {
      setFlippedId(matchFromUrl);
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [matchFromUrl]);

  const byMatchday = useMemo(() => {
    const g: Record<number, any[]> = {};
    (matches ?? []).forEach((m: any) => (g[m.matchday] ||= []).push(m));
    return g;
  }, [matches]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-pitch text-white p-5 shadow-soft">
        <div className="display text-3xl flex items-center gap-2">
          <Calendar className="h-6 w-6" /> Calendario
        </div>
        <p className="text-white/80 text-sm">Todos los partidos de LaLiga, jornada a jornada.</p>
      </div>

      {Object.entries(byMatchday)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([matchday, list]) => (
          <section key={matchday} className="space-y-3">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Jornada {matchday}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {list
                .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime())
                .map((m) => (
                  <div key={m.id} ref={m.id === matchFromUrl ? highlightRef : undefined}>
                    <MatchCard
                      match={m}
                      flipped={flippedId === m.id}
                      onToggle={() => setFlippedId(flippedId === m.id ? null : m.id)}
                    />
                  </div>
                ))}
            </div>
          </section>
        ))}

      {(matches ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Todavía no hay partidos cargados.
        </p>
      )}
    </div>
  );
}

function MatchCard({ match: m, flipped, onToggle }: { match: any; flipped: boolean; onToggle: () => void }) {
  const homeStadium = getLaLigaTeamStadium(m.home?.name);
  const bg = homeStadium?.stadium ?? estadioFondo;
  const isFinished = m.status === "FINISHED";
  const kickoff = new Date(m.utc_date);
  const homeCrest = crestUrl(m.home?.id);
  const awayCrest = crestUrl(m.away?.id);

  return (
    <div style={{ perspective: 1200 }}>
      <AnimatePresence mode="wait" initial={false}>
        {!flipped ? (
          <motion.div
            key="front"
            initial={{ opacity: 0, rotateY: -12 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 12 }}
            transition={{ duration: 0.25 }}
            onClick={onToggle}
            className="relative overflow-hidden rounded-2xl border border-white/80 shadow-soft cursor-pointer"
          >
            <img
              src={bg}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: homeStadium?.backgroundPosition ?? "center 55%" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/70" />

            <div className="relative px-4 pt-3 pb-3 text-white [text-shadow:0_2px_5px_rgba(0,0,0,.95)]">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-slate-200">
                  {kickoff.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" })}
                </span>
                <span className="font-bold text-slate-200">
                  {kickoff.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="flex h-9 w-9 items-center justify-center drop-shadow-lg">
                    {homeCrest && <img src={homeCrest} alt="" className="h-full w-full object-contain" />}
                  </div>
                  <span className="text-xs font-bold leading-tight">{getLaLigaTeamDisplayName(m.home?.name)}</span>
                </div>

                <div className="flex min-w-[44px] flex-col items-center gap-1">
                  <div className="flex min-h-10 min-w-10 items-center justify-center rounded-md border-2 border-gold bg-white px-1.5 py-1 shadow-lg [text-shadow:none]">
                    <span className="text-sm font-black tabular-nums text-black">
                      {isFinished ? `${m.home_score} - ${m.away_score}` : "VS"}
                    </span>
                  </div>
                  {m.is_megapremium ? (
                    <span className="flex items-center gap-1 text-[9px] text-red-400 font-bold uppercase">
                      <Star className="h-2.5 w-2.5 fill-red-400" /> Mega
                    </span>
                  ) : m.is_premium ? (
                    <span className="flex items-center gap-1 text-[9px] text-gold font-bold uppercase">
                      <Star className="h-2.5 w-2.5 fill-gold" /> Premium
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="flex h-9 w-9 items-center justify-center drop-shadow-lg">
                    {awayCrest && <img src={awayCrest} alt="" className="h-full w-full object-contain" />}
                  </div>
                  <span className="text-xs font-bold leading-tight">{getLaLigaTeamDisplayName(m.away?.name)}</span>
                </div>
              </div>
              {homeStadium && (
                <div className="mt-2 text-right text-[10px] font-semibold text-slate-200">{homeStadium.stadiumName}</div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ opacity: 0, rotateY: 12 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -12 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden rounded-2xl border border-gold/50 shadow-soft bg-card min-h-[196px] flex flex-col"
          >
            <button
              onClick={onToggle}
              className="flex items-center gap-1.5 px-3 pt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Volver
            </button>
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4 pb-4">
              <span className="text-2xl">🚧</span>
              <p className="text-sm font-semibold">Aquí habrá información</p>
              <p className="text-xs text-muted-foreground">
                {getLaLigaTeamDisplayName(m.home?.name)} vs {getLaLigaTeamDisplayName(m.away?.name)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
