insert into public.bonus_questions (key, label, points, kind, deadline_at, is_visible, is_fun, location)
values
  ('sorpresa_mundial', 'Sorpresa del Mundial (selección fuera del Top-15 que llegará más lejos)', 10, 'team', '2026-06-28T19:00:00Z', true, true, 'mis_especiales_eliminatorias'),
  ('ko_top_scorer', 'Máximo goleador de las eliminatorias', 10, 'player', '2026-06-28T19:00:00Z', true, true, 'mis_especiales_eliminatorias'),
  ('ko_clean_sheets', 'Portero con más porterías a cero en las eliminatorias', 10, 'player', '2026-06-28T19:00:00Z', true, true, 'mis_especiales_eliminatorias'),
  ('ko_top_match', 'Eliminatoria con más goles', 10, 'match', '2026-06-28T19:00:00Z', true, true, 'mis_especiales_eliminatorias'),
  ('lado_cuadro_goles', '¿Qué lado del cuadro marcará más goles?', 5, 'bracket_side', '2026-06-28T19:00:00Z', true, true, 'mis_especiales_eliminatorias'),
  ('ko_top_assists', 'Jugador que dará más asistencias en las eliminatorias', 10, 'player', '2026-06-28T19:00:00Z', true, true, 'mis_especiales_eliminatorias'),
  ('r32_top_cards', 'Partido con más tarjetas de dieciseisavos', 10, 'match', '2026-06-28T19:00:00Z', true, true, 'mis_especiales_eliminatorias'),
  ('habra_hattrick', '¿Habrá hat-trick en las eliminatorias?', 5, 'yes_no', '2026-06-28T19:00:00Z', true, true, 'mis_especiales_eliminatorias'),
  ('mas_42_goles_r32', '¿Habrá más de 42 goles en dieciseisavos?', 10, 'yes_no', '2026-06-28T19:00:00Z', true, true, 'mis_especiales_eliminatorias')
on conflict (key) do nothing;
