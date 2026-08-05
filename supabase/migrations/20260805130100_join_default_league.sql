-- RPC para la opcion "jugar individualmente" del onboarding: une al usuario
-- a la liga por defecto (is_default = true) sin necesitar codigo.

create or replace function public.join_default_league()
returns table (league_id uuid, league_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league record;
begin
  select id, name into v_league from public.leagues where is_default = true limit 1;

  if v_league is null then
    raise exception 'No hay liga por defecto configurada';
  end if;

  if exists (
    select 1 from public.league_memberships lm
    where lm.league_id = v_league.id and lm.user_id = auth.uid()
  ) then
    return query select v_league.id, v_league.name;
    return;
  end if;

  insert into public.league_memberships (league_id, user_id, is_league_admin)
  values (v_league.id, auth.uid(), false);

  return query select v_league.id, v_league.name;
end;
$$;

revoke all on function public.join_default_league() from public;
grant execute on function public.join_default_league() to authenticated;
