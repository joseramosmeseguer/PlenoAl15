-- Posición estable del partido dentro de su ronda de eliminatoria (1-16 en dieciseisavos,
-- 1-8 en octavos, etc). Permite que al introducir un resultado se sepa automáticamente
-- a qué partido de la siguiente ronda avanza el ganador.
alter table public.matches add column if not exists bracket_position int;
create index if not exists idx_matches_bracket_position on public.matches(stage, bracket_position);
