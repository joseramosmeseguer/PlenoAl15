-- Selecciones de cada usuario en la pestaña "Juego" (quién pasa de ronda en cada
-- posición del cuadro). Se guarda el código de la selección elegida, no el lado
-- (local/visitante), porque el rival de cada posición puede cambiar mientras el
-- usuario sigue editando su cuadro antes del bloqueo.
create table if not exists public.juego_picks (
  user_id uuid not null references auth.users(id) on delete cascade,
  stage text not null,
  bracket_position int not null,
  team_code text not null references public.teams(code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, stage, bracket_position)
);
alter table public.juego_picks enable row level security;

create policy "juego_picks_select_all" on public.juego_picks
  for select to authenticated using (true);
create policy "juego_picks_insert_own" on public.juego_picks
  for insert to authenticated with check (user_id = auth.uid());
create policy "juego_picks_update_own" on public.juego_picks
  for update to authenticated using (user_id = auth.uid());
create policy "juego_picks_delete_own" on public.juego_picks
  for delete to authenticated using (user_id = auth.uid());
