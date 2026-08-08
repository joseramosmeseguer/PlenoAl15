-- Puntuación de LaLiga (club_matches / club_predictions), + arregla el
-- permiso que impedía guardar resultados desde el admin.

-- 1) El admin no podía guardar resultados de LaLiga: la tabla solo tenía
--    grant de UPDATE para service_role, no para authenticated.
grant update on public.club_matches to authenticated;
create policy "club_matches_admin_update" on public.club_matches
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 2) Puntos por pronóstico de LaLiga.
alter table public.club_predictions
  add column if not exists points_awarded integer not null default 0;

insert into public.settings (key, value)
values (
  'club_points',
  '{"normal_outcome":5,"normal_exact":15,"premium_outcome":10,"premium_exact":30,"megapremium_outcome":15,"megapremium_exact":45}'::jsonb
)
on conflict (key) do update set value = excluded.value;

create or replace function public.recompute_club_match_points(_match_id integer)
returns void language plpgsql security definer set search_path=public as $$
declare
  m public.club_matches%rowtype;
  cfg jsonb;
  p_outcome int;
  p_exact int;
  real_outcome text;
begin
  select * into m from public.club_matches where id = _match_id;
  if m.id is null then return; end if;
  if m.home_score is null or m.away_score is null or m.status <> 'FINISHED' then
    update public.club_predictions set points_awarded = 0 where match_id = _match_id;
    return;
  end if;
  select value into cfg from public.settings where key = 'club_points';
  if m.is_megapremium then
    p_outcome := (cfg->>'megapremium_outcome')::int;
    p_exact := (cfg->>'megapremium_exact')::int;
  elsif m.is_premium then
    p_outcome := (cfg->>'premium_outcome')::int;
    p_exact := (cfg->>'premium_exact')::int;
  else
    p_outcome := (cfg->>'normal_outcome')::int;
    p_exact := (cfg->>'normal_exact')::int;
  end if;
  real_outcome := public.outcome(m.home_score, m.away_score);

  update public.club_predictions p
  set points_awarded = case
    when p.home_score = m.home_score and p.away_score = m.away_score then p_exact
    when public.outcome(p.home_score, p.away_score) = real_outcome then p_outcome
    else 0
  end
  where p.match_id = _match_id;
end; $$;

create or replace function public.tg_club_match_after_update()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (new.home_score is distinct from old.home_score)
     or (new.away_score is distinct from old.away_score)
     or (new.status is distinct from old.status)
     or (new.is_premium is distinct from old.is_premium)
     or (new.is_megapremium is distinct from old.is_megapremium) then
    perform public.recompute_club_match_points(new.id);
  end if;
  return new;
end; $$;

drop trigger if exists trg_club_match_recompute on public.club_matches;
create trigger trg_club_match_recompute
  after update on public.club_matches
  for each row execute function public.tg_club_match_after_update();

-- Por si alguien pronostica después de que el resultado ya esté puesto.
create or replace function public.tg_club_prediction_after_write()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.recompute_club_match_points(new.match_id);
  return new;
end; $$;

drop trigger if exists trg_club_prediction_recompute on public.club_predictions;
create trigger trg_club_prediction_recompute
  after insert or update of home_score, away_score on public.club_predictions
  for each row execute function public.tg_club_prediction_after_write();

-- El botón "Recalcular puntos" del admin también recalcula LaLiga.
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
  for r in select id from public.club_matches loop
    perform public.recompute_club_match_points(r.id);
  end loop;
end;
$function$;

-- 3) La clasificación general suma también los puntos de LaLiga.
CREATE OR REPLACE VIEW public.v_leaderboard AS
SELECT
  pr.id AS user_id,
  pr.display_name,
  pr.avatar_emoji,
  COALESCE(pm.match_points,0) AS match_points,
  COALESCE(pb.bonus_points,0) AS bonus_points,
  COALESCE(pm.match_points,0) + COALESCE(pb.bonus_points,0) + COALESCE(pj.juego_points,0) + COALESCE(pc.club_points,0) AS total_points,
  COALESCE(pm.exact_count,0) AS exact_count,
  COALESCE(pm.outcome_count,0) AS outcome_count,
  COALESCE(pj.juego_points,0) AS juego_points,
  COALESCE(pc.club_points,0) AS club_points
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
LEFT JOIN (
  SELECT cp.user_id, SUM(cp.points_awarded) AS club_points
  FROM public.club_predictions cp
  GROUP BY cp.user_id
) pc ON pc.user_id = pr.id
WHERE pr.is_hidden = false;

ALTER VIEW public.v_leaderboard SET (security_invoker = on);
