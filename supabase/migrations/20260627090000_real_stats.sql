-- Estadísticas reales del Mundial (no hay API conectada): los admins las
-- introducen y actualizan a mano desde el panel de admin.
create table if not exists public.real_stat_entries (
  id uuid primary key default gen_random_uuid(),
  stat_key text not null,
  rank int not null default 0,
  name text not null,
  value numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.real_stat_entries enable row level security;

create policy "real_stats_select_all" on public.real_stat_entries
  for select to authenticated using (true);
create policy "real_stats_admin_all" on public.real_stat_entries
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create index if not exists idx_real_stat_entries_key on public.real_stat_entries(stat_key, rank);
