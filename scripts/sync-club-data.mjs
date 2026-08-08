// Trae equipos, calendario, plantillas y entrenadores de football-data.org
// y los guarda en Supabase (tablas club_teams / club_matches / club_players).
//
// Uso:
//   node scripts/sync-club-data.mjs PD               -> equipos + calendario completo de LaLiga
//   node scripts/sync-club-data.mjs PD 1              -> equipos + solo la jornada 1
//   node scripts/sync-club-data.mjs CL                -> equipos + calendario completo de Champions
//   node scripts/sync-club-data.mjs PD --squads       -> además sincroniza plantillas + entrenador
//
// football-data.org solo permite 10 peticiones por minuto: al sincronizar
// plantillas se pide equipo a equipo en tandas de 10, con una pausa de un
// minuto entre tandas.

import { createClient } from "@supabase/supabase-js";

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const withSquads = args.includes("--squads");
const positional = args.filter((a) => !a.startsWith("--"));
const [competitionArg, matchdayArg] = positional;
const competition = competitionArg ?? "PD";
const matchday = matchdayArg ? Number(matchdayArg) : undefined;

if (!FOOTBALL_DATA_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan variables de entorno: FOOTBALL_DATA_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function footballDataFetch(path) {
  await waitForRateLimit();
  const res = await fetch(`https://api.football-data.org/v4${path}`, {
    headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`football-data.org ${path} -> HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// football-data.org permite 10 peticiones/minuto en total (cualquier
// endpoint). Este limitador cuenta TODAS las llamadas hechas con
// footballDataFetch y espera lo necesario antes de dejar pasar la 11ª.
const requestTimestamps = [];
async function waitForRateLimit() {
  const now = Date.now();
  while (requestTimestamps.length && now - requestTimestamps[0] > 60_000) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= 10) {
    const waitMs = 60_000 - (now - requestTimestamps[0]) + 500;
    console.log(`Límite de 10 peticiones/minuto alcanzado, esperando ${Math.ceil(waitMs / 1000)}s...`);
    await sleep(waitMs);
    return waitForRateLimit();
  }
  requestTimestamps.push(Date.now());
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
  return data.teams.map((t) => t.id);
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

// Uno a uno; el limitador global (waitForRateLimit) se encarga de
// pausar automáticamente para no superar 10 peticiones/minuto.
async function syncSquads(teamIds) {
  for (let i = 0; i < teamIds.length; i++) {
    const teamId = teamIds[i];
    console.log(`Sincronizando plantilla ${i + 1}/${teamIds.length} (equipo ${teamId})...`);
    const detail = await footballDataFetch(`/teams/${teamId}`);

    const { error: teamError } = await supabase
      .from("club_teams")
      .update({
        coach_name: detail.coach?.name ?? null,
        coach_nationality: detail.coach?.nationality ?? null,
        venue: detail.venue ?? null,
        area_name: detail.area?.name ?? null,
      })
      .eq("id", teamId);
    if (teamError) throw teamError;

    const players = (detail.squad ?? []).map((p) => ({
      id: p.id,
      team_id: teamId,
      name: p.name,
      position: p.position,
      date_of_birth: p.dateOfBirth ?? null,
      nationality: p.nationality ?? null,
      shirt_number: p.shirtNumber ?? null,
      updated_at: new Date().toISOString(),
    }));
    if (players.length) {
      const { error: playersError } = await supabase.from("club_players").upsert(players, { onConflict: "id" });
      if (playersError) throw playersError;
    }
    console.log(`  ${players.length} jugadores, entrenador ${detail.coach?.name ?? "—"}`);
  }
}

const teamIds = await syncTeams();
await syncMatches();
if (withSquads) await syncSquads(teamIds);
