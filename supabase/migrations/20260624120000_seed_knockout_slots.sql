-- Crea los 31 huecos del cuadro de eliminatorias (sin equipos todavía) para que
-- el admin solo tenga que abrir cada partido y asignar las selecciones — nunca
-- tiene que crearlos a mano. Las fechas son provisionales (calendario oficial
-- aproximado) y se pueden corregir más adelante.
-- Usa NOT EXISTS en vez de una unique constraint, por si ya hay partidos de
-- pruebas anteriores con esa misma posición.
insert into public.matches (stage, bracket_position, kickoff_at, status)
select v.stage::public.match_stage, v.bracket_position, v.kickoff_at::timestamptz, 'scheduled'
from (values
  ('round_of_32', 1,  '2026-06-29T17:00:00Z'),
  ('round_of_32', 2,  '2026-06-29T20:30:00Z'),
  ('round_of_32', 3,  '2026-06-29T21:00:00Z'),
  ('round_of_32', 4,  '2026-06-30T01:00:00Z'),
  ('round_of_32', 5,  '2026-06-30T17:00:00Z'),
  ('round_of_32', 6,  '2026-06-30T20:00:00Z'),
  ('round_of_32', 7,  '2026-07-01T01:00:00Z'),
  ('round_of_32', 8,  '2026-07-01T16:00:00Z'),
  ('round_of_32', 9,  '2026-07-01T20:00:00Z'),
  ('round_of_32', 10, '2026-07-02T00:00:00Z'),
  ('round_of_32', 11, '2026-07-02T19:00:00Z'),
  ('round_of_32', 12, '2026-07-02T23:00:00Z'),
  ('round_of_32', 13, '2026-07-03T03:00:00Z'),
  ('round_of_32', 14, '2026-07-03T22:00:00Z'),
  ('round_of_32', 15, '2026-07-04T01:30:00Z'),
  ('round_of_32', 16, '2026-07-04T17:00:00Z'),

  ('round_of_16', 1, '2026-07-04T17:00:00Z'),
  ('round_of_16', 2, '2026-07-04T21:00:00Z'),
  ('round_of_16', 3, '2026-07-05T20:00:00Z'),
  ('round_of_16', 4, '2026-07-06T00:00:00Z'),
  ('round_of_16', 5, '2026-07-06T19:00:00Z'),
  ('round_of_16', 6, '2026-07-07T00:00:00Z'),
  ('round_of_16', 7, '2026-07-07T16:00:00Z'),
  ('round_of_16', 8, '2026-07-07T20:00:00Z'),

  ('quarter_final', 1, '2026-07-09T20:00:00Z'),
  ('quarter_final', 2, '2026-07-10T19:00:00Z'),
  ('quarter_final', 3, '2026-07-11T21:00:00Z'),
  ('quarter_final', 4, '2026-07-12T01:00:00Z'),

  ('semi_final', 1, '2026-07-14T19:00:00Z'),
  ('semi_final', 2, '2026-07-15T19:00:00Z'),

  ('third_place', 1, '2026-07-18T21:00:00Z'),
  ('final',       1, '2026-07-19T19:00:00Z')
) as v(stage, bracket_position, kickoff_at)
where not exists (
  select 1 from public.matches m
  where m.stage = v.stage::public.match_stage
    and m.bracket_position = v.bracket_position
);
