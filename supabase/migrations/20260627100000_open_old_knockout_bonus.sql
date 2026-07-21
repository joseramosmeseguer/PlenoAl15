-- 'penalty_out' y 'ko_top_match' ya existían de una migración antigua (location='knockout',
-- deadline ya pasada), así que el insert de eliminatorias no las tocó (on conflict do nothing).
-- Las pasamos al bloque de eliminatorias con la misma deadline que el resto.
update public.bonus_questions
set location = 'mis_especiales_eliminatorias',
    is_active = true,
    is_visible = true,
    start_at = null,
    deadline_at = '2026-06-28T19:00:00Z'
where key in ('penalty_out', 'ko_top_match');
