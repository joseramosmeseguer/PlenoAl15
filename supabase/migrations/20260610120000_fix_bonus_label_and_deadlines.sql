-- Corrige el label de "Equipo más goleador" y ajusta todos los deadlines
-- de pronósticos especiales a 1 hora antes del primer partido
-- (jueves 11 junio 21:00 CEST = 19:00 UTC → deadline 18:00 UTC).

UPDATE public.bonus_questions
SET label = 'Equipo más goleador del torneo'
WHERE key = 'top_scorer_team';

UPDATE public.bonus_questions
SET deadline_at = COALESCE(
  (SELECT MIN(kickoff_at) - INTERVAL '1 hour' FROM public.matches),
  '2026-06-11 18:00:00+00'
);
