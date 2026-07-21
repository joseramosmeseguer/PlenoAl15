-- Encuesta: ¿llevamos esto a LaLiga/Champions/Premier en septiembre?
create table if not exists public.survey_responses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  would_play text,
  leagues jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.survey_responses enable row level security;

create policy "survey_responses_select_all" on public.survey_responses
  for select to authenticated using (true);
create policy "survey_responses_upsert_own" on public.survey_responses
  for insert to authenticated with check (user_id = auth.uid());
create policy "survey_responses_update_own" on public.survey_responses
  for update to authenticated using (user_id = auth.uid());

-- Ideas: texto libre, se pueden enviar varias por persona
create table if not exists public.survey_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idea_text text not null,
  created_at timestamptz not null default now()
);
alter table public.survey_ideas enable row level security;

create policy "survey_ideas_select_all" on public.survey_ideas
  for select to authenticated using (true);
create policy "survey_ideas_insert_own" on public.survey_ideas
  for insert to authenticated with check (user_id = auth.uid());
