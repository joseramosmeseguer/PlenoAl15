import { createFileRoute } from "@tanstack/react-router";
import championsFondo from "@/assets/champions/ChampionsLogoyCopa.webp";
import championsEstadio from "@/assets/champions/ChampionsEstadio1.webp";

export const Route = createFileRoute("/champions")({
  component: ChampionsPage,
  head: () => ({ meta: [{ title: "Champions League · PlenoAl15" }] }),
});

type Zone = "direct" | "playoff" | "out";

const TEAMS: { pos: number; name: string; played: number; gd: number; pts: number; zone: Zone }[] = [
  { pos: 1, name: "Atlético Boreal", played: 4, gd: 7, pts: 12, zone: "direct" },
  { pos: 2, name: "Real Fénix", played: 4, gd: 5, pts: 10, zone: "direct" },
  { pos: 3, name: "Unión Central", played: 4, gd: 2, pts: 9, zone: "playoff" },
  { pos: 4, name: "CF Estrella Negra", played: 4, gd: -1, pts: 6, zone: "playoff" },
  { pos: 5, name: "Deportivo Aurora", played: 4, gd: -6, pts: 3, zone: "out" },
];

const ZONE: Record<Zone, { bar: string; dot: string; label: string }> = {
  direct: { bar: "bg-blue-500", dot: "bg-blue-500", label: "Directo a octavos" },
  playoff: { bar: "bg-cyan-400", dot: "bg-cyan-400", label: "Playoff eliminatorio" },
  out: { bar: "bg-white/15", dot: "bg-white/25", label: "Eliminado" },
};

function ChampionsPage() {
  return (
    <div className="space-y-5 -mt-2">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl shadow-soft min-h-[300px] flex flex-col justify-end">
        <img src={championsFondo} alt="UEFA Champions League" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#040c24]/10 via-[#040c24]/40 to-[#040c24]/95" />
        <div className="relative px-5 pb-5 pt-10 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-300">Fase de liga · 2026/27</p>
          <h1 className="font-black uppercase text-3xl leading-none mt-1 tracking-tight">Clasificación</h1>
        </div>
      </section>

      {/* Tabla */}
      <section className="rounded-3xl overflow-hidden shadow-soft border border-blue-500/20" style={{ backgroundColor: "#060f2b" }}>
        <div className="relative overflow-hidden">
          <img src={championsEstadio} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060f2b]/40 to-[#060f2b]" />
          <div className="relative px-4 py-3 flex items-center justify-between text-white border-b border-blue-500/20">
            <span className="font-black uppercase tracking-wide text-sm">Clasificación</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Tras la jornada 4</span>
          </div>
        </div>

        <div className="grid grid-cols-[28px_1fr_28px_32px_36px] gap-2 px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-blue-300/70">
          <span>Pos</span>
          <span>Club</span>
          <span className="text-center">P</span>
          <span className="text-center">+/-</span>
          <span className="text-right">Pts</span>
        </div>

        <div className="px-2 pb-3">
          {TEAMS.map((t) => (
            <div
              key={t.pos}
              className="grid grid-cols-[28px_1fr_28px_32px_36px] items-center gap-2 px-2 py-2.5 rounded-lg relative overflow-hidden"
            >
              <span className={`absolute left-0 top-0.5 bottom-0.5 w-1 rounded-full ${ZONE[t.zone].bar}`} />
              <span className="text-sm font-black text-white/50 pl-1.5">{t.pos}</span>
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-6 w-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[10px] font-black text-white/80 shrink-0">
                  {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <span className="text-sm font-bold text-white truncate">{t.name}</span>
              </span>
              <span className="text-center text-sm text-white/70 tabular-nums">{t.played}</span>
              <span className={`text-center text-sm tabular-nums font-semibold ${t.gd > 0 ? "text-emerald-400" : t.gd < 0 ? "text-red-400" : "text-white/60"}`}>
                {t.gd > 0 ? `+${t.gd}` : t.gd}
              </span>
              <span className="text-right text-base font-black text-white tabular-nums">{t.pts}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 pb-4 pt-1 border-t border-blue-500/15">
          {(Object.keys(ZONE) as Zone[]).map((z) => (
            <span key={z} className="flex items-center gap-1.5 text-[10px] text-white/60">
              <span className={`h-2 w-2 rounded-full ${ZONE[z].dot}`} /> {ZONE[z].label}
            </span>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground text-center px-4">
        Clasificación de ejemplo — en cuanto tengamos el calendario de la Champions cargado, esto se llenará con los
        equipos y datos reales.
      </p>
    </div>
  );
}
