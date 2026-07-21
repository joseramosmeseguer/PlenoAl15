-- 1) league_memberships: antes cualquier autenticado veía TODAS las membresías de
-- TODAS las ligas. Ahora solo ves las tuyas, o las de una liga en la que ya estás
-- (necesario para contar miembros y para gestionar tu propia liga). Admin sigue
-- viendo todo, pero a través de una server function (ver getAdminLeagueMembers).
drop policy if exists "lm_select" on public.league_memberships;
create policy "lm_select" on public.league_memberships
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.league_memberships lm2
      where lm2.league_id = league_memberships.league_id
        and lm2.user_id = auth.uid()
    )
  );

-- 2) leagues.invite_code: antes cualquier autenticado podía leerlo directamente
-- de la tabla. Ahora esa columna no es legible por nadie vía select normal; el
-- creador la recupera con get_my_league_invite_codes() y el admin con
-- getAdminLeagues() (server function con privilegios elevados).
revoke select on public.leagues from authenticated;
grant select (id, name, creator_id, is_default, created_at) on public.leagues to authenticated;

create or replace function public.get_my_league_invite_codes()
returns table (league_id uuid, invite_code text)
language sql
security definer
set search_path = public
as $$
  select id, invite_code from public.leagues where creator_id = auth.uid();
$$;
revoke all on function public.get_my_league_invite_codes() from public;
grant execute on function public.get_my_league_invite_codes() to authenticated;

-- 3) generate_league_code() necesita leer invite_code de TODAS las ligas para
-- comprobar que el código aleatorio no esté ya en uso — ahora que esa columna ya
-- no es legible para el rol authenticated, la función necesita privilegios propios.
create or replace function public.generate_league_code()
returns text
language plpgsql
security definer
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
