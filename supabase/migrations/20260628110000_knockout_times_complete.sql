-- Horario completo de octavos, cuartos, semifinales, 3º/4º puesto y final.
-- Octavos
update public.matches set kickoff_at = '2026-07-04T21:00:00Z' where stage = 'round_of_16' and bracket_position = 1;
update public.matches set kickoff_at = '2026-07-04T17:00:00Z' where stage = 'round_of_16' and bracket_position = 2;
update public.matches set kickoff_at = '2026-07-06T19:00:00Z' where stage = 'round_of_16' and bracket_position = 3;
update public.matches set kickoff_at = '2026-07-07T00:00:00Z' where stage = 'round_of_16' and bracket_position = 4;
update public.matches set kickoff_at = '2026-07-05T20:00:00Z' where stage = 'round_of_16' and bracket_position = 5;
update public.matches set kickoff_at = '2026-07-06T00:00:00Z' where stage = 'round_of_16' and bracket_position = 6;
update public.matches set kickoff_at = '2026-07-07T16:00:00Z' where stage = 'round_of_16' and bracket_position = 7;
update public.matches set kickoff_at = '2026-07-07T20:00:00Z' where stage = 'round_of_16' and bracket_position = 8;

-- Cuartos
update public.matches set kickoff_at = '2026-07-09T20:00:00Z' where stage = 'quarter_final' and bracket_position = 1;
update public.matches set kickoff_at = '2026-07-10T19:00:00Z' where stage = 'quarter_final' and bracket_position = 2;
update public.matches set kickoff_at = '2026-07-11T21:00:00Z' where stage = 'quarter_final' and bracket_position = 3;
update public.matches set kickoff_at = '2026-07-12T01:00:00Z' where stage = 'quarter_final' and bracket_position = 4;

-- Semifinales
update public.matches set kickoff_at = '2026-07-14T19:00:00Z' where stage = 'semi_final' and bracket_position = 1;
update public.matches set kickoff_at = '2026-07-15T19:00:00Z' where stage = 'semi_final' and bracket_position = 2;

-- 3º y 4º puesto, y Final
update public.matches set kickoff_at = '2026-07-18T21:00:00Z' where stage = 'third_place' and bracket_position = 1;
update public.matches set kickoff_at = '2026-07-19T19:00:00Z' where stage = 'final' and bracket_position = 1;
