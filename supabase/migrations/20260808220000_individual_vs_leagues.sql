-- "Jugar individualmente" debe significar estar solo. Si entras en una liga
-- real por código, deja de tener sentido seguir marcado como individual.

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

  update public.profiles set plays_individually = false where id = auth.uid();

  return query select v_league.id, v_league.name;
end;
$$;
