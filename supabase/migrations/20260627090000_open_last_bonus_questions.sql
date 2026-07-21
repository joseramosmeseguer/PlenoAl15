-- Reabre ko_top_assists y mas_42_goles_r32 para todos los usuarios,
-- igualando su deadline al resto de BONUS de eliminatorias.
update public.bonus_questions
set is_active = true,
    is_visible = true,
    start_at = null,
    deadline_at = '2026-06-28T19:00:00Z'
where key in ('ko_top_assists', 'mas_42_goles_r32');
