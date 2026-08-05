import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useClubMatches } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Calendar, BookOpen } from "lucide-react";

export const Route = createFileRoute("/mis-pronosticos")({
  component: MyPredictions,
  head: () => ({ meta: [{ title: "Pronósticos · Pleno al 15" }] }),
});

function MyPredictions() {
  const { user } = useAuth();
  if (!user) return null;
  const { data: matches } = useClubMatches();
  const allMatches = matches ?? [];

  const [matchFilter, setMatchFilter] = useState<"upcoming" | "finished" | "all">("upcoming");

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    let source =
      matchFilter === "upcoming"
        ? allMatches.filter((m: any) => m.status !== "FINISHED")
        : matchFilter === "finished"
        ? allMatches.filter((m: any) => m.status === "FINISHED")
        : allMatches;
    if (matchFilter === "finished") {
      source = [...source].sort((a: any, b: any) => new Date(b.utc_date).getTime() - new Date(a.utc_date).getTime());
    }
    source.forEach((m: any) => {
      const day = new Date(m.utc_date).toLocaleDateString("es-ES", {
        weekday: "long", day: "2-digit", month: "long",
      });
      (g[day] ||= []).push(m);
    });
    return g;
  }, [allMatches, matchFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-pitch text-primary-foreground p-5 shadow-soft">
        <div className="display text-3xl">Pronósticos</div>
        <p className="text-white/70 text-sm mt-1">Partidos de LaLiga.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {(["upcoming", "finished", "all"] as const).map((key) => {
            const label = key === "upcoming" ? "Próximos" : key === "finished" ? "Jugados" : "Todos";
            return (
              <button
                key={key}
                onClick={() => setMatchFilter(key)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  matchFilter === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
          <Link
            to="/reglas"
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 transition-colors"
          >
            <BookOpen className="h-3 w-3" /> Reglas
          </Link>
        </div>
        {Object.keys(grouped).length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No hay partidos en esta sección.</p>
        )}
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, list]) => (
            <section key={day} className="space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {day}
              </h2>
              <div className="grid gap-3">
                {list.map((m: any) => (
                  <ClubMatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClubMatchCard({ match }: { match: any }) {
  const homeName = match.home?.short_name ?? match.home?.name ?? "?";
  const awayName = match.away?.short_name ?? match.away?.name ?? "?";
  const isFinished = match.status === "FINISHED";
  const timeStr = new Date(match.utc_date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
      <div className="px-3 pt-4 pb-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex min-h-16 items-center justify-center text-center">
            <span className="font-black uppercase leading-tight tracking-wide text-sm md:text-base">{homeName}</span>
          </div>
          <div className="flex min-w-[72px] flex-col items-center gap-1 rounded-xl border-2 border-border bg-muted/40 px-3 py-2">
            {isFinished ? (
              <div className="text-xl font-black tabular-nums">{match.home_score} – {match.away_score}</div>
            ) : (
              <div className="text-base font-black tracking-widest text-muted-foreground">VS</div>
            )}
          </div>
          <div className="flex min-h-16 items-center justify-center text-center">
            <span className="font-black uppercase leading-tight tracking-wide text-sm md:text-base">{awayName}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-bold">{timeStr}</span>
          <span className="font-bold">Jornada {match.matchday}</span>
        </div>
      </div>
    </div>
  );
}

