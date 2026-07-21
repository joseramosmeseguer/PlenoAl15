
-- =========================================================
-- ENUMS & ROLES
-- =========================================================
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

-- =========================================================
-- PROFILES
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  avatar_emoji text default '⚽',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- =========================================================
-- TEAMS
-- =========================================================
create table public.teams (
  code text primary key,         -- ej: 'ESP'
  name text not null,            -- ej: 'España'
  flag text not null,            -- emoji bandera
  group_letter text              -- A..H
);
alter table public.teams enable row level security;

-- =========================================================
-- MATCHES
-- =========================================================
create type public.match_stage as enum (
  'group','round_of_32','round_of_16','quarter_final','semi_final','third_place','final'
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  stage public.match_stage not null default 'group',
  group_letter text,
  home_code text references public.teams(code),
  away_code text references public.teams(code),
  home_label text, -- por si aún no hay equipo (ej "1A vs 2B")
  away_label text,
  kickoff_at timestamptz not null,
  home_score int,
  away_score int,
  status text not null default 'scheduled', -- scheduled | live | finished | cancelled
  is_premium boolean not null default false,
  external_id text, -- id de la API de fútbol
  predictions_locked boolean not null default false, -- override admin
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.matches enable row level security;
create index idx_matches_kickoff on public.matches(kickoff_at);

-- =========================================================
-- PREDICTIONS
-- =========================================================
create table public.predictions (
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  home_score int not null check (home_score >= 0 and home_score <= 30),
  away_score int not null check (away_score >= 0 and away_score <= 30),
  points_awarded int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);
alter table public.predictions enable row level security;

-- =========================================================
-- BONUS QUESTIONS (predicciones especiales del torneo)
-- =========================================================
create table public.bonus_questions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,           -- 'champion','runner_up','top_scorer'...
  label text not null,                -- texto visible
  description text,
  kind text not null default 'team',  -- 'team' | 'two_teams' | 'text' | 'stage'
  points int not null default 10,
  deadline_at timestamptz not null,
  correct_answer jsonb,               -- {value: 'ESP'} | {values:['ESP','FRA']} | {text:'Lamine Yamal'}
  is_active boolean not null default true,
  is_fun boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bonus_questions enable row level security;

create table public.bonus_predictions (
  user_id uuid not null references auth.users(id) on delete cascade,
  bonus_id uuid not null references public.bonus_questions(id) on delete cascade,
  answer jsonb not null,
  points_awarded int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, bonus_id)
);
alter table public.bonus_predictions enable row level security;

-- =========================================================
-- DAILY SNAPSHOTS (para "movimiento" y ganador del día)
-- =========================================================
create table public.daily_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  total_points int not null default 0,
  position int not null default 0,
  primary key (user_id, snapshot_date)
);
alter table public.daily_snapshots enable row level security;

-- =========================================================
-- SETTINGS
-- =========================================================
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;

insert into public.settings(key, value) values
  ('points', '{"normal_outcome":1,"normal_exact":3,"premium_outcome":2,"premium_exact":6}'::jsonb),
  ('lock_hours_before', '24'::jsonb),
  ('admin_email', '"joseramosmeseguer@gmail.com"'::jsonb),
  ('last_results_sync', 'null'::jsonb);

-- =========================================================
-- TRIGGERS: updated_at
-- =========================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_upd before update on public.profiles
  for each row execute function public.tg_set_updated_at();
create trigger trg_matches_upd before update on public.matches
  for each row execute function public.tg_set_updated_at();
create trigger trg_predictions_upd before update on public.predictions
  for each row execute function public.tg_set_updated_at();
create trigger trg_bonus_q_upd before update on public.bonus_questions
  for each row execute function public.tg_set_updated_at();
create trigger trg_bonus_p_upd before update on public.bonus_predictions
  for each row execute function public.tg_set_updated_at();

-- =========================================================
-- AUTO-CREAR PROFILE Y ROL al hacer signup
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_email text;
  display text;
begin
  select (value #>> '{}')::text into admin_email from public.settings where key='admin_email';

  display := coalesce(
    new.raw_user_meta_data->>'display_name',
    split_part(new.email,'@',1)
  );

  insert into public.profiles(id, display_name, email)
  values (new.id, display, new.email)
  on conflict (id) do nothing;

  if new.email = admin_email then
    insert into public.user_roles(user_id, role) values (new.id,'admin')
    on conflict do nothing;
  else
    insert into public.user_roles(user_id, role) values (new.id,'user')
    on conflict do nothing;
  end if;

  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- LOCK de predicciones 24h antes (excepto admin)
-- =========================================================
create or replace function public.tg_lock_predictions()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  m public.matches%rowtype;
  hrs int;
begin
  select * into m from public.matches where id = new.match_id;
  if m.id is null then raise exception 'Partido no existe'; end if;
  if public.has_role(auth.uid(),'admin') then return new; end if;
  if m.predictions_locked then raise exception 'Las predicciones para este partido están bloqueadas'; end if;
  if m.status <> 'scheduled' then raise exception 'El partido ya ha comenzado o terminado'; end if;
  select (value::text)::int into hrs from public.settings where key='lock_hours_before';
  if now() > (m.kickoff_at - make_interval(hours => hrs)) then
    raise exception 'Las predicciones se cierran 24h antes del partido';
  end if;
  return new;
end; $$;

create trigger trg_predictions_lock
  before insert or update of home_score, away_score on public.predictions
  for each row execute function public.tg_lock_predictions();

-- =========================================================
-- LOCK de bonus por deadline (excepto admin)
-- =========================================================
create or replace function public.tg_lock_bonus()
returns trigger language plpgsql security definer set search_path=public as $$
declare q public.bonus_questions%rowtype;
begin
  select * into q from public.bonus_questions where id = new.bonus_id;
  if q.id is null then raise exception 'Pregunta bonus no existe'; end if;
  if public.has_role(auth.uid(),'admin') then return new; end if;
  if not q.is_active then raise exception 'Pregunta bonus inactiva'; end if;
  if now() > q.deadline_at then raise exception 'Plazo de esta pregunta bonus cerrado'; end if;
  return new;
end; $$;

create trigger trg_bonus_p_lock
  before insert or update of answer on public.bonus_predictions
  for each row execute function public.tg_lock_bonus();

-- =========================================================
-- CÁLCULO DE PUNTOS por partido
-- =========================================================
create or replace function public.outcome(h int, a int) returns text
language sql immutable as $$
  select case when h is null or a is null then null
              when h > a then 'H'
              when h < a then 'A'
              else 'D' end;
$$;

create or replace function public.recompute_match_points(_match_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  m public.matches%rowtype;
  cfg jsonb;
  p_outcome int;
  p_exact int;
  real_outcome text;
begin
  select * into m from public.matches where id = _match_id;
  if m.id is null then return; end if;
  if m.home_score is null or m.away_score is null or m.status <> 'finished' then
    update public.predictions set points_awarded = 0 where match_id = _match_id;
    return;
  end if;
  select value into cfg from public.settings where key='points';
  if m.is_premium then
    p_outcome := (cfg->>'premium_outcome')::int;
    p_exact := (cfg->>'premium_exact')::int;
  else
    p_outcome := (cfg->>'normal_outcome')::int;
    p_exact := (cfg->>'normal_exact')::int;
  end if;
  real_outcome := public.outcome(m.home_score, m.away_score);

  update public.predictions p
  set points_awarded = case
    when p.home_score = m.home_score and p.away_score = m.away_score then p_exact
    when public.outcome(p.home_score, p.away_score) = real_outcome then p_outcome
    else 0
  end
  where p.match_id = _match_id;
end; $$;

create or replace function public.tg_match_after_update()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (new.home_score is distinct from old.home_score)
     or (new.away_score is distinct from old.away_score)
     or (new.status is distinct from old.status)
     or (new.is_premium is distinct from old.is_premium) then
    perform public.recompute_match_points(new.id);
  end if;
  return new;
end; $$;
create trigger trg_match_recompute
  after update on public.matches
  for each row execute function public.tg_match_after_update();

-- =========================================================
-- BONUS POINTS recompute
-- =========================================================
create or replace function public.recompute_bonus_points(_bonus_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare q public.bonus_questions%rowtype;
begin
  select * into q from public.bonus_questions where id = _bonus_id;
  if q.id is null then return; end if;
  if q.correct_answer is null then
    update public.bonus_predictions set points_awarded = 0 where bonus_id = _bonus_id;
    return;
  end if;

  if q.kind = 'two_teams' then
    update public.bonus_predictions bp
    set points_awarded = case
      when (bp.answer->'values') @> (q.correct_answer->'values')
       and (q.correct_answer->'values') @> (bp.answer->'values')
      then q.points else 0 end
    where bp.bonus_id = _bonus_id;
  else
    update public.bonus_predictions bp
    set points_awarded = case
      when lower(coalesce(bp.answer->>'value', bp.answer->>'text','')) =
           lower(coalesce(q.correct_answer->>'value', q.correct_answer->>'text',''))
      then q.points else 0 end
    where bp.bonus_id = _bonus_id;
  end if;
end; $$;

create or replace function public.tg_bonus_after_update()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (new.correct_answer is distinct from old.correct_answer)
     or (new.points is distinct from old.points)
     or (new.kind is distinct from old.kind) then
    perform public.recompute_bonus_points(new.id);
  end if;
  return new;
end; $$;
create trigger trg_bonus_recompute
  after update on public.bonus_questions
  for each row execute function public.tg_bonus_after_update();

-- =========================================================
-- RECÁLCULO MASIVO (botón admin)
-- =========================================================
create or replace function public.recompute_all_points()
returns void language plpgsql security definer set search_path=public as $$
declare r record;
begin
  for r in select id from public.matches loop
    perform public.recompute_match_points(r.id);
  end loop;
  for r in select id from public.bonus_questions loop
    perform public.recompute_bonus_points(r.id);
  end loop;
end; $$;

-- =========================================================
-- VISTA RANKING
-- =========================================================
create or replace view public.v_leaderboard as
select
  pr.id as user_id,
  pr.display_name,
  pr.avatar_emoji,
  coalesce(pm.match_points,0) as match_points,
  coalesce(pb.bonus_points,0) as bonus_points,
  coalesce(pm.match_points,0) + coalesce(pb.bonus_points,0) as total_points,
  coalesce(pm.exact_count,0) as exact_count,
  coalesce(pm.outcome_count,0) as outcome_count
from public.profiles pr
left join (
  select p.user_id,
         sum(p.points_awarded) as match_points,
         sum(case when m.home_score is not null
                   and p.home_score = m.home_score
                   and p.away_score = m.away_score then 1 else 0 end) as exact_count,
         sum(case when m.status='finished'
                   and public.outcome(p.home_score,p.away_score) = public.outcome(m.home_score,m.away_score)
                   and not (p.home_score = m.home_score and p.away_score = m.away_score)
              then 1 else 0 end) as outcome_count
  from public.predictions p join public.matches m on m.id = p.match_id
  group by p.user_id
) pm on pm.user_id = pr.id
left join (
  select user_id, sum(points_awarded) as bonus_points
  from public.bonus_predictions group by user_id
) pb on pb.user_id = pr.id;

-- =========================================================
-- RLS POLICIES
-- =========================================================
-- profiles: todos los autenticados pueden ver, solo el propio puede actualizar
create policy "profiles read all" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid());
create policy "profiles admin all" on public.profiles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- user_roles: el usuario puede ver los suyos, admin todo
create policy "roles read own" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles admin all" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- teams: lectura pública (autenticada), admin escribe
create policy "teams read" on public.teams for select to authenticated using (true);
create policy "teams admin" on public.teams for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- matches: lectura todos auth, escritura admin
create policy "matches read" on public.matches for select to authenticated using (true);
create policy "matches admin" on public.matches for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- predictions: cada uno ve TODAS, solo edita las suyas; admin todo
create policy "preds read all" on public.predictions for select to authenticated using (true);
create policy "preds insert own" on public.predictions for insert to authenticated
  with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "preds update own" on public.predictions for update to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "preds delete admin" on public.predictions for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- bonus_questions: lectura todos, escritura admin
create policy "bonusq read" on public.bonus_questions for select to authenticated using (true);
create policy "bonusq admin" on public.bonus_questions for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- bonus_predictions: ver todas, editar las propias
create policy "bonusp read all" on public.bonus_predictions for select to authenticated using (true);
create policy "bonusp insert own" on public.bonus_predictions for insert to authenticated
  with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "bonusp update own" on public.bonus_predictions for update to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- daily_snapshots: lectura todos
create policy "snap read" on public.daily_snapshots for select to authenticated using (true);
create policy "snap admin" on public.daily_snapshots for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- settings: lectura todos auth, escritura admin
create policy "settings read" on public.settings for select to authenticated using (true);
create policy "settings admin" on public.settings for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
