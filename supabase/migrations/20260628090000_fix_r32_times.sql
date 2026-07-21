-- Corrige las horas de los 16 partidos de dieciseisavos según el calendario oficial.
-- Solo actualiza kickoff_at por bracket_position, no toca equipos ni resultados.
update public.matches set kickoff_at = '2026-06-28T19:00:00Z' where stage = 'round_of_32' and bracket_position = 1;
update public.matches set kickoff_at = '2026-06-29T17:00:00Z' where stage = 'round_of_32' and bracket_position = 2;
update public.matches set kickoff_at = '2026-06-29T20:30:00Z' where stage = 'round_of_32' and bracket_position = 3;
update public.matches set kickoff_at = '2026-06-30T01:00:00Z' where stage = 'round_of_32' and bracket_position = 4;
update public.matches set kickoff_at = '2026-06-30T17:00:00Z' where stage = 'round_of_32' and bracket_position = 5;
update public.matches set kickoff_at = '2026-06-30T21:00:00Z' where stage = 'round_of_32' and bracket_position = 6;
update public.matches set kickoff_at = '2026-07-01T01:00:00Z' where stage = 'round_of_32' and bracket_position = 7;
update public.matches set kickoff_at = '2026-07-01T16:00:00Z' where stage = 'round_of_32' and bracket_position = 8;
update public.matches set kickoff_at = '2026-07-01T20:00:00Z' where stage = 'round_of_32' and bracket_position = 9;
update public.matches set kickoff_at = '2026-07-02T00:00:00Z' where stage = 'round_of_32' and bracket_position = 10;
update public.matches set kickoff_at = '2026-07-02T19:00:00Z' where stage = 'round_of_32' and bracket_position = 11;
update public.matches set kickoff_at = '2026-07-02T23:00:00Z' where stage = 'round_of_32' and bracket_position = 12;
update public.matches set kickoff_at = '2026-07-03T03:00:00Z' where stage = 'round_of_32' and bracket_position = 13;
update public.matches set kickoff_at = '2026-07-03T18:00:00Z' where stage = 'round_of_32' and bracket_position = 14;
update public.matches set kickoff_at = '2026-07-03T22:00:00Z' where stage = 'round_of_32' and bracket_position = 15;
update public.matches set kickoff_at = '2026-07-04T01:30:00Z' where stage = 'round_of_32' and bracket_position = 16;
