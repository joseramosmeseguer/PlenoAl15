
-- 1. Add category column
ALTER TABLE public.bonus_questions
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- 2. Clear existing bonus data
DELETE FROM public.bonus_predictions;
DELETE FROM public.bonus_questions;

-- 3. Seed new questions
-- Deadlines: torneo arranca 2026-06-11; knockout aprox 2026-06-27
INSERT INTO public.bonus_questions (key, label, description, kind, points, position, category, deadline_at) VALUES
  -- GENERALES (1 pt salvo 10 pts)
  ('champion',          'Campeón del Mundial',          NULL, 'team',   1,  1, 'general',  '2026-06-11 00:00:00+00'),
  ('runner_up',         'Subcampeón',                   NULL, 'team',   1,  2, 'general',  '2026-06-11 00:00:00+00'),
  ('mvp',               'Mejor jugador del torneo',     'Balón de Oro', 'player', 1,  3, 'general',  '2026-06-11 00:00:00+00'),
  ('best_young',        'Mejor jugador joven (U21)',    NULL, 'player', 1,  4, 'general',  '2026-06-11 00:00:00+00'),
  ('best_keeper',       'Mejor portero',                'Guante de Oro', 'player', 1,  5, 'general',  '2026-06-11 00:00:00+00'),
  ('fair_play',         'Selección Fair Play',          NULL, 'team',   1,  6, 'general',  '2026-06-11 00:00:00+00'),
  ('best_africa',       'Selección africana más lejos', NULL, 'team',   1,  7, 'general',  '2026-06-11 00:00:00+00'),
  ('best_asia_oceania', 'Selección Asia-Oceanía más lejos', NULL, 'team', 1, 8, 'general', '2026-06-11 00:00:00+00'),
  ('best_america',      'Selección América más lejos',  NULL, 'team',   1,  9, 'general',  '2026-06-11 00:00:00+00'),
  ('best_europe',       'Selección Europa más lejos',   NULL, 'team',   1, 10, 'general',  '2026-06-11 00:00:00+00'),
  ('olympic_goal',      '¿Habrá gol olímpico?',         NULL, 'yes_no', 1, 11, 'general',  '2026-06-11 00:00:00+00'),
  ('top_scorer_team',   'Equipo más goleador',          NULL, 'team',  10, 12, 'general',  '2026-06-11 00:00:00+00'),
  ('most_conceded_team','Equipo más goleado',           NULL, 'team',  10, 13, 'general',  '2026-06-11 00:00:00+00'),
  ('top7_out_first',    'Primer top-7 histórico eliminado', 'España, Francia, Portugal, Argentina, Inglaterra, Brasil, Alemania', 'team', 1, 14, 'general', '2026-06-11 00:00:00+00'),

  -- TOPS (5 pts por jugador acertado, máx 25)
  ('top5_scorers',      'Top 5 goleadores',             '5 pts por cada jugador acertado (sin orden)', 'top5_players', 25, 15, 'tops', '2026-06-11 00:00:00+00'),
  ('top5_assists',      'Top 5 asistentes',             '5 pts por cada jugador acertado (sin orden)', 'top5_players', 25, 16, 'tops', '2026-06-11 00:00:00+00'),
  ('top5_keepers',      'Top 5 porteros menos goleados','5 pts por cada jugador acertado (sin orden)', 'top5_players', 25, 17, 'tops', '2026-06-11 00:00:00+00'),

  -- FASE DE GRUPOS
  ('group_top_scorer',  'Máximo goleador fase de grupos', NULL, 'player', 1, 18, 'groups', '2026-06-11 00:00:00+00'),
  ('group_top_assist',  'Máximo asistente fase de grupos', NULL, 'player', 1, 19, 'groups', '2026-06-11 00:00:00+00'),
  ('most_cards_team',   'Equipo con más tarjetas',      NULL, 'team',   1, 20, 'groups', '2026-06-11 00:00:00+00'),
  ('group_top_match',   'Partido con más goles (fase grupos)', NULL, 'match', 1, 21, 'groups', '2026-06-11 00:00:00+00'),
  ('top_scoring_group', 'Grupo con más goles',          NULL, 'group',  5, 22, 'groups', '2026-06-11 00:00:00+00'),
  ('unbeaten_group',    'Equipo invicto en grupos',     NULL, 'team',  10, 23, 'groups', '2026-06-11 00:00:00+00'),
  ('first_zero_zero',   'Primer 0-0 del torneo',        'Hasta 3 partidos. 15 pts si aciertas', 'multi_match', 15, 24, 'groups', '2026-06-11 00:00:00+00'),

  -- ELIMINATORIAS
  ('penalty_out',       'Equipo eliminado en penaltis', NULL, 'team',   1, 25, 'knockout', '2026-06-27 00:00:00+00'),
  ('ko_top_match',      'Partido con más goles de las eliminatorias', NULL, 'match', 1, 26, 'knockout', '2026-06-27 00:00:00+00');

-- 4. Update scoring function
CREATE OR REPLACE FUNCTION public.recompute_bonus_points(_bonus_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  q public.bonus_questions%rowtype;
  per_hit int;
begin
  select * into q from public.bonus_questions where id = _bonus_id;
  if q.id is null then return; end if;
  if q.correct_answer is null then
    update public.bonus_predictions set points_awarded = 0 where bonus_id = _bonus_id;
    return;
  end if;

  if q.kind = 'top5_players' then
    -- 5 pts per coincidence (case/diacritic-insensitive, trimmed)
    per_hit := 5;
    update public.bonus_predictions bp
    set points_awarded = coalesce((
      select count(*)::int * per_hit
      from jsonb_array_elements_text(coalesce(bp.answer->'values','[]'::jsonb)) as a(val)
      where lower(unaccent(trim(a.val))) in (
        select lower(unaccent(trim(c.val)))
        from jsonb_array_elements_text(coalesce(q.correct_answer->'values','[]'::jsonb)) as c(val)
      )
    ), 0)
    where bp.bonus_id = _bonus_id;

  elsif q.kind = 'multi_match' then
    update public.bonus_predictions bp
    set points_awarded = case
      when exists (
        select 1
        from jsonb_array_elements_text(coalesce(bp.answer->'values','[]'::jsonb)) as a(val)
        where a.val = (q.correct_answer->>'value')
      ) then q.points else 0 end
    where bp.bonus_id = _bonus_id;

  elsif q.kind = 'two_teams' then
    update public.bonus_predictions bp
    set points_awarded = case
      when (bp.answer->'values') @> (q.correct_answer->'values')
       and (q.correct_answer->'values') @> (bp.answer->'values')
      then q.points else 0 end
    where bp.bonus_id = _bonus_id;

  else
    -- team, player, match, yes_no, group, stage, text
    update public.bonus_predictions bp
    set points_awarded = case
      when lower(unaccent(coalesce(bp.answer->>'value', bp.answer->>'text',''))) =
           lower(unaccent(coalesce(q.correct_answer->>'value', q.correct_answer->>'text','')))
       and coalesce(bp.answer->>'value', bp.answer->>'text','') <> ''
      then q.points else 0 end
    where bp.bonus_id = _bonus_id;
  end if;
end; $function$;

-- Ensure unaccent extension is available
CREATE EXTENSION IF NOT EXISTS unaccent;
