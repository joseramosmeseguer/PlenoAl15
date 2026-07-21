-- ============================================================
-- LIGAS: leagues + league_memberships
-- ============================================================

create table if not exists public.leagues (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  invite_code text        not null,
  creator_id  uuid        references auth.users(id) on delete set null,
  is_default  boolean     not null default false,
  created_at  timestamptz not null default now(),
  constraint leagues_name_unique unique (name),
  constraint leagues_code_unique unique (invite_code)
);

create table if not exists public.league_memberships (
  league_id       uuid        not null references public.leagues(id) on delete cascade,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  is_league_admin boolean     not null default false,
  joined_at       timestamptz not null default now(),
  primary key (league_id, user_id)
);

create index if not exists lm_user_idx   on public.league_memberships(user_id);
create index if not exists lm_league_idx on public.league_memberships(league_id);

-- ── RLS ─────────────────────────────────────────────────────

alter table public.leagues           enable row level security;
alter table public.league_memberships enable row level security;

-- leagues: todos los autenticados pueden leer
create policy "leagues_select" on public.leagues
  for select to authenticated using (true);

-- leagues: cualquier autenticado puede crear (creator_id debe ser su uid)
create policy "leagues_insert" on public.leagues
  for insert to authenticated
  with check (auth.uid() = creator_id or creator_id is null);

-- leagues: el creador o un admin puede eliminar
create policy "leagues_delete" on public.leagues
  for delete to authenticated using (
    auth.uid() = creator_id
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- memberships: todos pueden leer
create policy "lm_select" on public.league_memberships
  for select to authenticated using (true);

-- memberships: un usuario se une a sí mismo, o un admin puede añadir a cualquiera
create policy "lm_insert" on public.league_memberships
  for insert to authenticated with check (
    auth.uid() = user_id
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- memberships: puede salir uno mismo, expulsar el league_admin, o mover el admin general
create policy "lm_delete" on public.league_memberships
  for delete to authenticated using (
    auth.uid() = user_id
    or exists (
      select 1 from public.league_memberships lm2
      where lm2.league_id = league_memberships.league_id
        and lm2.user_id   = auth.uid()
        and lm2.is_league_admin = true
    )
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- memberships: admin general puede actualizar (p.ej. is_league_admin)
create policy "lm_update" on public.league_memberships
  for update to authenticated using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
    or exists (
      select 1 from public.league_memberships lm2
      where lm2.league_id = league_memberships.league_id
        and lm2.user_id   = auth.uid()
        and lm2.is_league_admin = true
    )
  );

-- ── Auto-generar código de invitación ───────────────────────

create or replace function public.generate_league_code()
returns text language plpgsql
set search_path = ''
as $$
declare
  code text;
  i    int := 0;
begin
  loop
    code := lpad((floor(random() * 90000) + 10000)::int::text, 5, '0');
    exit when not exists (select 1 from public.leagues where invite_code = code);
    i := i + 1;
    if i > 500 then raise exception 'No hay códigos disponibles'; end if;
  end loop;
  return code;
end;
$$;

create or replace function public.tg_leagues_auto_code()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.invite_code is null or new.invite_code = '' then
    new.invite_code := public.generate_league_code();
  end if;
  return new;
end;
$$;

drop trigger if exists leagues_auto_code on public.leagues;
create trigger leagues_auto_code
  before insert on public.leagues
  for each row execute function public.tg_leagues_auto_code();

-- ── Liga por defecto: TuttiFascis ────────────────────────────

insert into public.leagues (name, invite_code, is_default, creator_id)
values ('TuttiFascis', '00000', true, null)
on conflict (name) do nothing;

-- Añadir todos los usuarios existentes a TuttiFascis
insert into public.league_memberships (league_id, user_id, is_league_admin)
select l.id, p.id, false
from   public.profiles p
cross join public.leagues l
where  l.is_default = true
on conflict do nothing;
