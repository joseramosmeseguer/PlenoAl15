-- Puntos del Juego (cuadro propio de eliminatorias): 1/2/4/6/10 según ronda,
-- sin bonus extra por trayectoria. Se calculan solos en cuanto el admin pone
-- el resultado oficial de un partido con bracket_position.

alter table public.juego_picks add column if not exists points_awarded int not null default 0;

create or replace function public.recompute_juego_points(_stage text, _bracket_position int)
returns void language plpgsql security definer set search_path=public as $$
declare
  m public.matches%rowtype;
  pts int;
  winner_code text;
begin
  select * into m from public.matches
  where stage = _stage::public.match_stage and bracket_position = _bracket_position
  limit 1;

  if m.id is null or m.home_score is null or m.away_score is null or m.home_score = m.away_score then
    update public.juego_picks set points_awarded = 0
    where stage = _stage and bracket_position = _bracket_position;
    return;
  end if;

  winner_code := case when m.home_score > m.away_score then m.home_code else m.away_code end;

  pts := case _stage
    when 'round_of_32' then 1
    when 'round_of_16' then 2
    when 'quarter_final' then 4
    when 'semi_final' then 6
    when 'final' then 10
    else 0
  end;

  update public.juego_picks
  set points_awarded = case when team_code = winner_code then pts else 0 end
  where stage = _stage and bracket_position = _bracket_position;
end; $$;

create or replace function public.tg_match_after_update_juego()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.bracket_position is not null
     and ((new.home_score is distinct from old.home_score)
       or (new.away_score is distinct from old.away_score)
       or (new.status is distinct from old.status)) then
    perform public.recompute_juego_points(new.stage::text, new.bracket_position);
  end if;
  return new;
end; $$;

drop trigger if exists trg_match_recompute_juego on public.matches;
create trigger trg_match_recompute_juego
  after update on public.matches
  for each row execute function public.tg_match_after_update_juego();

-- El botón "Recalcular puntos" del admin también recalcula el Juego
create or replace function public.recompute_all_points()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r record;
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    raise exception 'Solo admin';
  end if;
  for r in select id from public.matches loop
    perform public.recompute_match_points(r.id);
  end loop;
  for r in select id from public.bonus_questions loop
    perform public.recompute_bonus_points(r.id);
  end loop;
  for r in select distinct stage, bracket_position from public.matches where bracket_position is not null loop
    perform public.recompute_juego_points(r.stage::text, r.bracket_position);
  end loop;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.recompute_juego_points(text, int) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_match_after_update_juego() FROM anon, authenticated, public;

-- Clasificación general: suma también los puntos del Juego
CREATE OR REPLACE VIEW public.v_leaderboard AS
SELECT
  pr.id AS user_id,
  pr.display_name,
  pr.avatar_emoji,
  COALESCE(pm.match_points,0) AS match_points,
  COALESCE(pb.bonus_points,0) AS bonus_points,
  COALESCE(pm.match_points,0) + COALESCE(pb.bonus_points,0) + COALESCE(pj.juego_points,0) AS total_points,
  COALESCE(pm.exact_count,0) AS exact_count,
  COALESCE(pm.outcome_count,0) AS outcome_count,
  COALESCE(pj.juego_points,0) AS juego_points
FROM public.profiles pr
LEFT JOIN (
  SELECT p.user_id,
         SUM(p.points_awarded) AS match_points,
         SUM(CASE WHEN m.home_score IS NOT NULL
                   AND p.home_score = m.home_score
                   AND p.away_score = m.away_score THEN 1 ELSE 0 END) AS exact_count,
         SUM(CASE WHEN m.status='finished'
                   AND public.outcome(p.home_score,p.away_score) = public.outcome(m.home_score,m.away_score)
                   AND NOT (p.home_score = m.home_score AND p.away_score = m.away_score)
              THEN 1 ELSE 0 END) AS outcome_count
  FROM public.predictions p JOIN public.matches m ON m.id = p.match_id
  GROUP BY p.user_id
) pm ON pm.user_id = pr.id
LEFT JOIN (
  SELECT bp.user_id, SUM(bp.points_awarded) AS bonus_points
  FROM public.bonus_predictions bp
  GROUP BY bp.user_id
) pb ON pb.user_id = pr.id
LEFT JOIN (
  SELECT jp.user_id, SUM(jp.points_awarded) AS juego_points
  FROM public.juego_picks jp
  GROUP BY jp.user_id
) pj ON pj.user_id = pr.id
WHERE pr.is_hidden = false;

ALTER VIEW public.v_leaderboard SET (security_invoker = on);
