-- Equipos y calendario de competiciones de clubes (LaLiga, Champions),
-- sincronizados desde football-data.org.

create table if not exists public.club_teams (
  id integer primary key, -- id de football-data.org
  name text not null,
  short_name text,
  tla text,
  crest_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.club_matches (
  id integer primary key, -- id de football-data.org
  competition text not null, -- 'PD' (LaLiga) | 'CL' (Champions)
  matchday integer,
  utc_date timestamptz not null,
  status text not null,
  home_team_id integer not null references public.club_teams(id),
  away_team_id integer not null references public.club_teams(id),
  home_score integer,
  away_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists club_matches_competition_matchday_idx
  on public.club_matches (competition, matchday);

alter table public.club_teams enable row level security;
alter table public.club_matches enable row level security;

create policy "club_teams_public_read" on public.club_teams
  for select using (true);

create policy "club_matches_public_read" on public.club_matches
  for select using (true);

grant select on public.club_teams, public.club_matches to anon, authenticated, service_role;
grant insert, update on public.club_teams, public.club_matches to service_role;
