// Trae equipos y calendario de football-data.org y los guarda en Supabase
// (tablas club_teams / club_matches).
//
// Uso:
//   node scripts/sync-club-data.mjs PD          -> equipos + calendario completo de LaLiga
//   node scripts/sync-club-data.mjs PD 1         -> equipos + solo la jornada 1
//   node scripts/sync-club-data.mjs CL           -> equipos + calendario completo de Champions

import { createClient } from "@supabase/supabase-js";

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const [, , competitionArg, matchdayArg] = process.argv;
const competition = competitionArg ?? "PD";
const matchday = matchdayArg ? Number(matchdayArg) : undefined;

if (!FOOTBALL_DATA_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan variables de entorno: FOOTBALL_DATA_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function footballDataFetch(path) {
  const res = await fetch(`https://api.football-data.org/v4${path}`, {
    headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`football-data.org ${path} -> HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function syncTeams() {
  const data = await footballDataFetch(`/competitions/${competition}/teams`);
  const rows = data.teams.map((t) => ({
    id: t.id,
    name: t.name,
    short_name: t.shortName,
    tla: t.tla,
    crest_url: t.crest,
  }));
  const { error } = await supabase.from("club_teams").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  console.log(`Equipos sincronizados: ${rows.length}`);
}

async function syncMatches() {
  const path = matchday
    ? `/competitions/${competition}/matches?matchday=${matchday}`
    : `/competitions/${competition}/matches`;
  const data = await footballDataFetch(path);
  const rows = data.matches.map((m) => ({
    id: m.id,
    competition,
    matchday: m.matchday,
    utc_date: m.utcDate,
    status: m.status,
    home_team_id: m.homeTeam.id,
    away_team_id: m.awayTeam.id,
    home_score: m.score?.fullTime?.home ?? null,
    away_score: m.score?.fullTime?.away ?? null,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("club_matches").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  console.log(`Partidos sincronizados: ${rows.length}`);
}

await syncTeams();
await syncMatches();
