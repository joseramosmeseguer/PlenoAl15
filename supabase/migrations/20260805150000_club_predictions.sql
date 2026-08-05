-- Pronosticos de los usuarios sobre partidos de clubes. La tabla "predictions"
-- original usa match_id uuid (referenciando el "matches" del Mundial); los
-- partidos de clubes usan ids enteros (de football-data.org), de ahi la tabla
-- nueva en vez de reutilizar la antigua.

create table if not exists public.club_predictions (
  user_id     uuid    not null references auth.users(id) on delete cascade,
  match_id    integer not null references public.club_matches(id) on delete cascade,
  home_score  integer not null,
  away_score  integer not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, match_id)
);

alter table public.club_predictions enable row level security;

create policy "club_predictions_select_own" on public.club_predictions
  for select to authenticated using (user_id = auth.uid());

create policy "club_predictions_insert_own" on public.club_predictions
  for insert to authenticated with check (user_id = auth.uid());

create policy "club_predictions_update_own" on public.club_predictions
  for update to authenticated using (user_id = auth.uid());
