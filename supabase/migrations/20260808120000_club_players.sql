-- Plantillas (jugadores) y entrenador de cada club, sincronizados desde
-- football-data.org, para no depender de la API en vivo en cada visita.

alter table public.club_teams
  add column if not exists coach_name text,
  add column if not exists coach_nationality text,
  add column if not exists venue text,
  add column if not exists area_name text;

create table if not exists public.club_players (
  id integer primary key, -- id de football-data.org
  team_id integer not null references public.club_teams(id) on delete cascade,
  name text not null,
  position text,
  date_of_birth date,
  nationality text,
  shirt_number integer,
  updated_at timestamptz not null default now()
);

create index if not exists club_players_team_id_idx on public.club_players (team_id);

alter table public.club_players enable row level security;

create policy "club_players_public_read" on public.club_players
  for select using (true);

grant select on public.club_players to anon, authenticated, service_role;
grant insert, update, delete on public.club_players to service_role;
