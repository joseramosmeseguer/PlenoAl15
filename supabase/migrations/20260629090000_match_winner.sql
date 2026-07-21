-- En eliminatorias puede haber empate a 90' (que es el resultado que se guarda),
-- pero el que pasa se decide en prórroga/penaltis. Guardamos quién ganó/pasa en una
-- columna aparte para que el Juego sume puntos y el Cuadro avance al equipo correcto.
alter table public.matches add column if not exists winner_code text references public.teams(code);

-- Puntos del Juego: usa winner_code si el admin lo ha fijado; si no, el que tenga
-- más goles. Solo da 0 cuando no hay ningún ganador determinable.
create or replace function public.recompute_juego_points(_stage text, _bracket_position int)
returns void language plpgsql security definer set search_path=public as $$
declare
  m public.matches%rowtype;
  pts int;
  win text;
begin
  select * into m from public.matches
  where stage = _stage::public.match_stage and bracket_position = _bracket_position
  limit 1;

  win := coalesce(
    m.winner_code,
    case when m.home_score > m.away_score then m.home_code
         when m.away_score > m.home_score then m.away_code
         else null end
  );

  if m.id is null or win is null then
    update public.juego_picks set points_awarded = 0
    where stage = _stage and bracket_position = _bracket_position;
    return;
  end if;

  pts := case _stage
    when 'round_of_32' then 1
    when 'round_of_16' then 2
    when 'quarter_final' then 4
    when 'semi_final' then 6
    when 'final' then 10
    else 0
  end;

  update public.juego_picks
  set points_awarded = case when team_code = win then pts else 0 end
  where stage = _stage and bracket_position = _bracket_position;
end; $$;

-- El trigger también debe recalcular cuando cambia winner_code
create or replace function public.tg_match_after_update_juego()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.bracket_position is not null
     and ((new.home_score is distinct from old.home_score)
       or (new.away_score is distinct from old.away_score)
       or (new.winner_code is distinct from old.winner_code)
       or (new.status is distinct from old.status)) then
    perform public.recompute_juego_points(new.stage::text, new.bracket_position);
  end if;
  return new;
end; $$;

REVOKE EXECUTE ON FUNCTION public.recompute_juego_points(text, int) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_match_after_update_juego() FROM anon, authenticated, public;
