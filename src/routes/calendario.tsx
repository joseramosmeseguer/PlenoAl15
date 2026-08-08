import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useClubMatches, useLaLigaStandings, useClubPlayers } from "@/lib/queries";
import { getLaLigaTeamDisplayName, getLaLigaTeamStadium } from "@/lib/laligaTeams";
import estadioFondo from "@/assets/Estadiofutbolfondo.png";
import laLigaBanner from "@/assets/LaLiga1.webp";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CalendarDays, ChevronRight, Clock3, Goal, MapPin, Shield, Shirt, Sparkles,
  Trophy, TrendingUp, Users, X,
} from "lucide-react";

export const Route = createFileRoute("/calendario")({
  component: LaLigaPage,
  validateSearch: (search: Record<string, unknown>) => ({
    match: typeof search.match === "number" ? search.match : undefined,
  }),
  head: () => ({ meta: [{ title: "La Liga · PlenoAl15" }] }),
});

type Tab = "calendar" | "teams" | "standings";
type Team = {
  id: number; name: string; short_name?: string; tla?: string; crest_url?: string;
  coach_name?: string | null; coach_nationality?: string | null; venue?: string | null; area_name?: string | null;
};
type TableRow = {
  position: number; team: Team; playedGames: number; won: number; draw: number; lost: number;
  goalsFor: number; goalsAgainst: number; goalDifference: number; points: number; form?: string;
};

const TABS: { id: Tab; label: string; icon: typeof Trophy }[] = [
  { id: "standings", label: "Clasificación", icon: Trophy },
  { id: "calendar", label: "Calendario", icon: CalendarDays },
  { id: "teams", label: "Equipos", icon: Shield },
];

// Los diálogos de partido/equipo caen desde arriba, pegados a la cabecera,
// en vez del recuadro cuadrado centrado por defecto.
const SHEET_CLASS = "top-3 sm:top-6 translate-y-0 rounded-3xl data-[state=open]:slide-in-from-top-6 data-[state=closed]:slide-out-to-top-6 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100";

function crestUrl(team?: Team | null) {
  return team?.id ? `/images/crests/${team.id}.png` : team?.crest_url ?? null;
}

function finished(match: any) {
  return match.status === "FINISHED" && match.home_score != null && match.away_score != null;
}

function LaLigaPage() {
  const { data: matches, isLoading } = useClubMatches();
  const { data: officialTable } = useLaLigaStandings();
  const { match: matchFromUrl } = Route.useSearch();
  const [tab, setTab] = useState<Tab>("standings");
  const [matchday, setMatchday] = useState<number | "all">(1);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const leagueMatches = useMemo(() => (matches ?? []).filter((m: any) => !m.competition || m.competition === "PD"), [matches]);
  const teams = useMemo(() => {
    const map = new Map<number, Team>();
    leagueMatches.forEach((m: any) => { if (m.home) map.set(m.home.id, m.home); if (m.away) map.set(m.away.id, m.away); });
    return [...map.values()].sort((a, b) => getLaLigaTeamDisplayName(a.name).localeCompare(getLaLigaTeamDisplayName(b.name), "es"));
  }, [leagueMatches]);
  const matchdays = useMemo(() => [...new Set(leagueMatches.map((m: any) => Number(m.matchday)).filter(Boolean))].sort((a, b) => a - b), [leagueMatches]);
  const table = useMemo(() => normalizeTable(officialTable, calculateTable(teams, leagueMatches)), [officialTable, teams, leagueMatches]);

  useEffect(() => {
    if (matchFromUrl && leagueMatches.length) setSelectedMatch(leagueMatches.find((m: any) => m.id === matchFromUrl) ?? null);
  }, [matchFromUrl, leagueMatches]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl sm:rounded-[1.75rem] shadow-soft h-24 sm:h-32">
        <img src={laLigaBanner} alt="LaLiga" className="w-full h-full object-cover object-center" />
      </div>

      <nav className="grid grid-cols-3 rounded-2xl border border-border bg-white p-1.5 shadow-soft" aria-label="Secciones de La Liga">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`relative flex min-w-0 items-center justify-center gap-1 rounded-xl px-1 py-3 text-[9px] font-black transition-all sm:gap-1.5 sm:px-2 sm:text-sm ${tab === id ? "bg-black text-white shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <Icon className={`h-4 w-4 ${tab === id ? "text-gold" : ""}`} /> {label}
            {tab === id && <motion.span layoutId="league-tab" className="absolute -bottom-0.5 h-1 w-7 rounded-full bg-gold" />}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .2 }}>
          {tab === "calendar" && <CalendarTab matches={leagueMatches} matchdays={matchdays} selected={matchday} onSelect={setMatchday} onOpen={setSelectedMatch} loading={isLoading} />}
          {tab === "teams" && <TeamsTab teams={teams} table={table} matches={leagueMatches} onOpen={setSelectedTeam} />}
          {tab === "standings" && <StandingsTab rows={table} onOpen={setSelectedTeam} />}
        </motion.div>
      </AnimatePresence>

      <MatchDialog match={selectedMatch} matches={leagueMatches} table={table} onClose={() => setSelectedMatch(null)} onTeam={team => { setSelectedMatch(null); setSelectedTeam(team); }} />
      <TeamDialog team={selectedTeam} matches={leagueMatches} table={table} onClose={() => setSelectedTeam(null)} />
    </div>
  );
}


function CalendarTab({ matches, matchdays, selected, onSelect, onOpen, loading }: any) {
  const shown = selected === "all" ? matches : matches.filter((m: any) => Number(m.matchday) === selected);
  return <div className="space-y-5">
    <div>
      <div className="mb-3 flex items-end justify-between"><div><h2 className="display text-2xl">Calendario</h2><p className="text-xs text-muted-foreground">Selecciona un partido para ver su análisis.</p></div><span className="text-xs font-bold text-muted-foreground">{shown.length} partidos</span></div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <RoundChip active={selected === "all"} onClick={() => onSelect("all")}>Todas</RoundChip>
        {matchdays.map((day: number) => <RoundChip key={day} active={selected === day} onClick={() => onSelect(day)}>J{day}</RoundChip>)}
      </div>
    </div>
    {loading ? <Empty text="Cargando competición…" /> : <div className="grid gap-3 sm:grid-cols-2">{shown.sort((a: any, b: any) => +new Date(a.utc_date) - +new Date(b.utc_date)).map((m: any) => <MatchCard key={m.id} match={m} onOpen={() => onOpen(m)} />)}</div>}
    {!loading && shown.length === 0 && <Empty text="Todavía no hay partidos cargados en esta jornada." />}
  </div>;
}

function RoundChip({ active, onClick, children }: any) {
  return <button onClick={onClick} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition-all ${active ? "border-black bg-black text-white shadow-md" : "border-border bg-white text-muted-foreground hover:border-gold hover:text-black"}`}>{children}</button>;
}

function MatchCard({ match: m, onOpen }: any) {
  const stadium = getLaLigaTeamStadium(m.home?.name); const kickoff = new Date(m.utc_date); const isDone = finished(m);
  return <button onClick={onOpen} className="group relative min-h-48 overflow-hidden rounded-2xl border border-white/80 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-xl">
    <img src={stadium?.stadium ?? estadioFondo} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" style={{ objectPosition: stadium?.backgroundPosition ?? "center" }} />
    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/85" />
    {(m.is_premium || m.is_megapremium) && (
      <div className={`relative flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black uppercase tracking-widest ${m.is_megapremium ? "bg-red-600 text-white" : "bg-gold text-gold-foreground"}`}>
        <Sparkles className="h-3 w-3" /> {m.is_megapremium ? "Mega Premium" : "Premium"}
      </div>
    )}
    <div className="relative flex min-h-48 flex-col p-4 text-white">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/70"><span>Jornada {m.matchday}</span><span>{kickoff.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} · {kickoff.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span></div>
      <div className="my-auto grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <TeamBadge team={m.home} /><div className="rounded-lg border-2 border-gold bg-white px-2.5 py-2 text-base font-black text-black [text-shadow:none]">{isDone ? `${m.home_score} - ${m.away_score}` : "VS"}</div><TeamBadge team={m.away} />
      </div>
      <div className="flex items-center justify-between text-[10px] font-semibold text-white/70"><span className="truncate">{stadium?.stadiumName ?? "Estadio por confirmar"}</span><span className="flex items-center gap-1 text-gold">Ver partido <ChevronRight className="h-3 w-3" /></span></div>
    </div>
  </button>;
}

function TeamBadge({ team }: { team: Team }) {
  return <div className="flex min-w-0 flex-col items-center gap-2"><img src={crestUrl(team) ?? ""} alt="" className="h-11 w-11 object-contain drop-shadow-lg" /><span className="line-clamp-2 text-xs font-black leading-tight [text-shadow:0_2px_5px_rgba(0,0,0,.9)]">{getLaLigaTeamDisplayName(team?.name)}</span></div>;
}

function TeamsTab({ teams, table, matches, onOpen }: any) {
  return <div className="space-y-4"><div><h2 className="display text-2xl">Los 20 clubes</h2><p className="text-xs text-muted-foreground">Identidad, rendimiento y plantilla de cada equipo.</p></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{teams.map((team: Team) => { const row = table.find((r: TableRow) => r.team.id === team.id); const stadium = getLaLigaTeamStadium(team.name); return <button key={team.id} onClick={() => onOpen(team)} className="group overflow-hidden rounded-2xl border border-border bg-white text-left shadow-soft transition-all hover:-translate-y-1 hover:border-gold/70">
      <div className="relative h-24 overflow-hidden bg-black"><img src={stadium?.stadium ?? estadioFondo} alt="" className="h-full w-full object-cover opacity-65 transition-transform duration-500 group-hover:scale-105" style={{ objectPosition: stadium?.backgroundPosition }} /><div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" /><img src={crestUrl(team) ?? ""} alt="" className="absolute bottom-2 left-3 h-12 w-12 object-contain drop-shadow-xl" />{row && <span className="absolute right-2 top-2 rounded-full bg-gold px-2 py-1 text-[9px] font-black text-black">#{row.position}</span>}</div>
      <div className="p-3"><h3 className="truncate text-sm font-black">{getLaLigaTeamDisplayName(team.name)}</h3><p className="mt-1 truncate text-[10px] text-muted-foreground">{stadium?.stadiumName ?? "Estadio por confirmar"}</p><div className="mt-3 flex items-center justify-between border-t pt-2 text-[10px]"><span className="text-muted-foreground">{row?.points ?? 0} puntos</span><span className="font-bold text-gold">Ficha <ChevronRight className="inline h-3 w-3" /></span></div></div>
    </button>; })}</div></div>;
}

function StandingsTab({ rows, onOpen }: { rows: TableRow[]; onOpen: (team: Team) => void }) {
  return <div className="space-y-4"><div><h2 className="display text-2xl">Clasificación</h2><p className="text-xs text-muted-foreground">Tabla general de la competición.</p></div>
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
      <div className="sm:hidden">
        <div className="grid grid-cols-[32px_1fr_34px] items-center bg-black px-2 py-2 text-[8px] font-black uppercase tracking-wider text-white/70"><span></span><span></span><span className="text-center text-gold">Pts</span></div>
        {rows.map(row => <button key={row.team.id} onClick={() => onOpen(row.team)} className="w-full border-b px-2 py-2.5 text-left last:border-0 active:bg-gold/10">
          <div className="grid grid-cols-[32px_1fr_34px] items-center"><span className={`flex h-7 w-7 items-center justify-center rounded-md border-l-4 text-xs font-black ${zone(row.position)}`}>{row.position}</span><img src={crestUrl(row.team) ?? ""} alt={getLaLigaTeamDisplayName(row.team.name)} className="h-9 w-9 object-contain"/><b className="text-center text-sm">{row.points}</b></div>
          <div className="ml-8 mt-2 grid grid-cols-7 gap-0.5 rounded-lg bg-muted/55 px-1 py-1.5">{[["PJ",row.playedGames],["G",row.won],["E",row.draw],["P",row.lost],["GF",row.goalsFor],["GC",row.goalsAgainst],["DG",`${row.goalDifference>0?"+":""}${row.goalDifference}`]].map(([label,value])=><span key={label} className="text-center"><small className="block text-[6px] font-black uppercase text-muted-foreground">{label}</small><b className="block text-[9px] tabular-nums">{value}</b></span>)}</div>
        </button>)}
      </div>
      <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[720px] text-xs"><thead className="bg-black text-white"><tr>{["Pos", "Equipo", "PJ", "G", "E", "P", "GF", "GC", "DG", "Pts"].map((h, i) => <th key={h} className={`px-3 py-3 text-center font-black ${i === 1 ? "text-left" : ""}`}>{h}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.team.id} onClick={() => onOpen(row.team)} className="cursor-pointer border-b last:border-0 hover:bg-gold/8"><td className="px-3 py-3"><span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md border-l-4 font-black ${zone(row.position)}`}>{row.position}</span></td><td className="px-3 py-3"><div className="flex items-center gap-2"><img src={crestUrl(row.team) ?? ""} alt="" className="h-7 w-7 object-contain" /><b>{getLaLigaTeamDisplayName(row.team.name)}</b></div></td>{[row.playedGames,row.won,row.draw,row.lost,row.goalsFor,row.goalsAgainst].map((v,i)=><td key={i} className="px-3 py-3 text-center tabular-nums text-muted-foreground">{v}</td>)}<td className="px-3 py-3 text-center font-bold tabular-nums">{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</td><td className="px-3 py-3 text-center text-sm font-black">{row.points}</td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t bg-muted/45 px-4 py-3 text-[10px] text-muted-foreground"><Legend color="bg-blue-600" text="Champions" /><Legend color="bg-sky-400" text="Europa" /><Legend color="bg-amber-400" text="Conference" /><Legend color="bg-red-500" text="Descenso" /></div>
    </div></div>;
}

function MatchDialog({ match, matches, table, onClose, onTeam }: any) {
  if (!match) return null; const stadium = getLaLigaTeamStadium(match.home?.name); const kickoff = new Date(match.utc_date);
  const homeRow = table.find((r: TableRow) => r.team.id === match.home?.id); const awayRow = table.find((r: TableRow) => r.team.id === match.away?.id);
  return <Dialog open={!!match} onOpenChange={open => !open && onClose()}><DialogContent className={`${SHEET_CLASS} max-h-[88vh] max-w-2xl overflow-y-auto p-0`}><DialogHeader className="sr-only"><DialogTitle>Detalle del partido</DialogTitle><DialogDescription>Información y estadísticas del encuentro</DialogDescription></DialogHeader>
    <div className="relative h-48 overflow-hidden bg-black sm:h-56"><img src={stadium?.stadium ?? estadioFondo} alt="" className="h-full w-full object-cover opacity-60" style={{ objectPosition: stadium?.backgroundPosition }} /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-black/50" /><button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-black/45 p-2 text-white backdrop-blur"><X className="h-4 w-4" /></button><div className="absolute inset-x-4 bottom-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center text-white"><button onClick={() => onTeam(match.home)}><TeamBadge team={match.home} /></button><div><div className="text-2xl font-black">{finished(match) ? `${match.home_score} - ${match.away_score}` : "VS"}</div><span className="text-[9px] uppercase tracking-widest text-gold">Jornada {match.matchday}</span></div><button onClick={() => onTeam(match.away)}><TeamBadge team={match.away} /></button></div></div>
    <div className="space-y-5 p-5"><div className="grid grid-cols-2 gap-3"><Info icon={CalendarDays} label="Fecha" value={kickoff.toLocaleDateString("es-ES", { weekday:"long", day:"numeric", month:"long" })} /><Info icon={Clock3} label="Hora" value={kickoff.toLocaleTimeString("es-ES", { hour:"2-digit",minute:"2-digit" })} /><Info icon={MapPin} label="Estadio" value={stadium?.stadiumName ?? "Por confirmar"} /><Info icon={Trophy} label="Estado" value={finished(match) ? "Finalizado" : "Próximo partido"} /></div>
      <div><SectionTitle icon={TrendingUp}>Momento de los equipos</SectionTitle><div className="grid grid-cols-2 gap-3"><FormCard team={match.home} row={homeRow} matches={matches} /><FormCard team={match.away} row={awayRow} matches={matches} /></div></div>
      <div><SectionTitle icon={Goal}>Últimos partidos</SectionTitle><div className="grid gap-2 sm:grid-cols-2"><RecentList team={match.home} matches={matches} /><RecentList team={match.away} matches={matches} /></div></div>
    </div></DialogContent></Dialog>;
}

function TeamDialog({ team, matches, table, onClose }: any) {
  const { data: squad, isLoading } = useClubPlayers(team?.id); if (!team) return null;
  const stadium = getLaLigaTeamStadium(team.name); const row = table.find((r: TableRow) => r.team.id === team.id);
  const players = squad ?? [];
  return <Dialog open={!!team} onOpenChange={open => !open && onClose()}><DialogContent className={`${SHEET_CLASS} max-h-[88vh] max-w-3xl overflow-y-auto p-0`}><DialogHeader className="sr-only"><DialogTitle>{getLaLigaTeamDisplayName(team.name)}</DialogTitle><DialogDescription>Ficha oficial del club</DialogDescription></DialogHeader>
    <div className="relative h-52 overflow-hidden bg-black"><img src={stadium?.stadium ?? estadioFondo} alt="" className="h-full w-full object-cover opacity-55" style={{ objectPosition: stadium?.backgroundPosition }} /><div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/35" /><button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-black/45 p-2 text-white"><X className="h-4 w-4" /></button><div className="absolute inset-x-5 bottom-5 flex items-end gap-4 text-white"><img src={crestUrl(team) ?? ""} alt="" className="h-20 w-20 object-contain drop-shadow-2xl" /><div><p className="text-[9px] font-black uppercase tracking-[.25em] text-gold">Ficha del club</p><h2 className="display text-2xl sm:text-3xl">{getLaLigaTeamDisplayName(team.name)}</h2><p className="mt-1 text-xs text-white/60">{team.area_name ?? "España"} · {stadium?.stadiumName ?? team.venue}</p></div></div></div>
    <div className="space-y-6 p-5"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat value={row?.position ? `#${row.position}` : "—"} label="Posición" /><Stat value={row?.points ?? 0} label="Puntos" /><Stat value={row?.playedGames ?? 0} label="Partidos" /><Stat value={`${row?.won ?? 0}-${row?.draw ?? 0}-${row?.lost ?? 0}`} label="G-E-P" /></div>
      <div className="grid gap-3 sm:grid-cols-2"><Info icon={MapPin} label="Estadio" value={stadium?.stadiumName ?? team.venue ?? "Por confirmar"} /><Info icon={Users} label="Entrenador" value={team.coach_name ?? "Sin información"} /></div>
      <div><SectionTitle icon={Shirt}>Plantilla</SectionTitle>{isLoading ? <Empty text="Cargando plantilla…" /> : players.length ? <div className="grid gap-2 sm:grid-cols-2">{players.map((player:any)=><div key={player.id} className="flex items-center gap-3 rounded-xl border bg-white p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-black text-gold">{initials(player.name)}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{player.name}{player.shirt_number ? ` · #${player.shirt_number}` : ""}</p><p className="text-[10px] text-muted-foreground">{positionLabel(player.position)}{player.nationality ? ` · ${player.nationality}` : ""}</p></div></div>)}</div> : <Empty text="La plantilla estará disponible cuando la fuente oficial publique los datos." />}</div>
      <div><SectionTitle icon={Goal}>Últimos encuentros</SectionTitle><RecentList team={team} matches={matches} /></div>
    </div></DialogContent></Dialog>;
}

function Info({ icon: Icon, label, value }: any) { return <div className="rounded-xl border bg-muted/35 p-3"><Icon className="mb-2 h-4 w-4 text-gold" /><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 text-xs font-bold capitalize">{value}</p></div>; }
function Stat({ value, label }: any) { return <div className="rounded-xl bg-black p-3 text-center text-white"><p className="text-xl font-black text-gold">{value}</p><p className="text-[9px] uppercase tracking-widest text-white/55">{label}</p></div>; }
function SectionTitle({ icon: Icon, children }: any) { return <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest"><Icon className="h-4 w-4 text-gold" />{children}</h3>; }
function FormCard({ team, row, matches }: any) { const form = teamForm(team.id, matches); return <div className="rounded-xl border bg-white p-3"><div className="flex items-center gap-2"><img src={crestUrl(team) ?? ""} className="h-7 w-7 object-contain" alt=""/><div><b className="block text-xs">{getLaLigaTeamDisplayName(team.name)}</b><span className="text-[9px] text-muted-foreground">{row ? `${row.position}º · ${row.points} pts` : "Sin clasificación"}</span></div></div><div className="mt-3 flex gap-1">{form.length ? form.map((v:string,i:number)=><span key={i} className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black text-white ${v === "V" ? "bg-emerald-600" : v === "E" ? "bg-amber-500" : "bg-red-500"}`}>{v}</span>) : <span className="text-[10px] text-muted-foreground">Sin partidos jugados</span>}</div></div>; }
function RecentList({ team, matches }: any) { const recent = matches.filter((m:any)=>finished(m)&&(m.home?.id===team.id||m.away?.id===team.id)).sort((a:any,b:any)=>+new Date(b.utc_date)-+new Date(a.utc_date)).slice(0,5); return <div className="overflow-hidden rounded-xl border bg-white">{recent.length ? recent.map((m:any)=><div key={m.id} className="flex items-center gap-2 border-b px-2.5 py-2 text-[10px] last:border-0">
  <span className="flex min-w-0 flex-1 items-center justify-end gap-1 truncate">
    <span className="truncate">{m.home?.short_name ?? getLaLigaTeamDisplayName(m.home?.name)}</span>
    <img src={crestUrl(m.home) ?? ""} alt="" className="h-4 w-4 shrink-0 object-contain" />
  </span>
  <span className="shrink-0 text-muted-foreground">–</span>
  <span className="flex min-w-0 flex-1 items-center gap-1 truncate">
    <img src={crestUrl(m.away) ?? ""} alt="" className="h-4 w-4 shrink-0 object-contain" />
    <span className="truncate">{m.away?.short_name ?? getLaLigaTeamDisplayName(m.away?.name)}</span>
  </span>
  <span className="shrink-0 font-black tabular-nums">{m.home_score}-{m.away_score}</span>
  <span className={`h-2 w-2 shrink-0 rounded-full ${resultFor(team.id,m)==="V"?"bg-emerald-500":resultFor(team.id,m)==="E"?"bg-amber-400":"bg-red-500"}`} />
</div>) : <p className="p-4 text-center text-[10px] text-muted-foreground">Sin resultados todavía</p>}</div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed bg-white/60 py-10 text-center text-sm text-muted-foreground">{text}</div>; }
function Legend({ color, text }: any) { return <span className="flex items-center gap-1.5"><i className={`h-2.5 w-1 rounded-full ${color}`} />{text}</span>; }
function zone(p:number){ return p<=4?"border-blue-600":p===5?"border-sky-400":p===6?"border-amber-400":p>=18?"border-red-500":"border-transparent"; }
function initials(name:string){ return name.split(" ").slice(0,2).map(x=>x[0]).join(""); }
function positionLabel(p:string){ return ({Goalkeeper:"Portero",Defence:"Defensa",Midfield:"Centrocampista",Offence:"Delantero"} as any)[p]??p??"Jugador"; }
function resultFor(id:number,m:any){ const home=m.home.id===id; const a=home?m.home_score:m.away_score,b=home?m.away_score:m.home_score; return a>b?"V":a===b?"E":"D"; }
function teamForm(id:number,matches:any[]){ return matches.filter(m=>finished(m)&&(m.home?.id===id||m.away?.id===id)).sort((a,b)=>+new Date(b.utc_date)-+new Date(a.utc_date)).slice(0,5).reverse().map(m=>resultFor(id,m)); }

function calculateTable(teams: Team[], matches: any[]): TableRow[] {
  const map = new Map<number, TableRow>(); teams.forEach(team=>map.set(team.id,{position:0,team,playedGames:0,won:0,draw:0,lost:0,goalsFor:0,goalsAgainst:0,goalDifference:0,points:0}));
  matches.filter(finished).forEach(m=>{ const h=map.get(m.home.id),a=map.get(m.away.id); if(!h||!a)return; h.playedGames++;a.playedGames++;h.goalsFor+=m.home_score;h.goalsAgainst+=m.away_score;a.goalsFor+=m.away_score;a.goalsAgainst+=m.home_score;if(m.home_score>m.away_score){h.won++;h.points+=3;a.lost++;}else if(m.home_score<m.away_score){a.won++;a.points+=3;h.lost++;}else{h.draw++;a.draw++;h.points++;a.points++;}});
  return [...map.values()].map(r=>({...r,goalDifference:r.goalsFor-r.goalsAgainst})).sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference||b.goalsFor-a.goalsFor).map((r,i)=>({...r,position:i+1}));
}
function normalizeTable(official:any, fallback:TableRow[]):TableRow[]{ if(!Array.isArray(official)||!official.length)return fallback; return official.map((r:any)=>({position:r.position,team:{...r.team,short_name:r.team.shortName,crest_url:r.team.crest},playedGames:r.playedGames,won:r.won,draw:r.draw,lost:r.lost,goalsFor:r.goalsFor,goalsAgainst:r.goalsAgainst,goalDifference:r.goalDifference,points:r.points,form:r.form})); }
