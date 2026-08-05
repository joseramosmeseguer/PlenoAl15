-- RPC usada por el modal "Unirse a una liga" (y por el onboarding individual,
-- con el codigo de la liga por defecto). No existia en las migraciones
-- copiadas del proyecto original (se habia creado a mano fuera de git).

create or replace function public.join_by_code(p_code text)
returns table (league_id uuid, league_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league record;
begin
  select id, name into v_league from public.leagues where invite_code = p_code;

  if v_league is null then
    raise exception 'Código no válido';
  end if;

  if exists (
    select 1 from public.league_memberships lm
    where lm.league_id = v_league.id and lm.user_id = auth.uid()
  ) then
    raise exception 'Ya eres miembro de esta liga';
  end if;

  insert into public.league_memberships (league_id, user_id, is_league_admin)
  values (v_league.id, auth.uid(), false);

  return query select v_league.id, v_league.name;
end;
$$;

revoke all on function public.join_by_code(text) from public;
grant execute on function public.join_by_code(text) to authenticated;
