-- Permite marcar manualmente, respuesta por respuesta y usuario por usuario,
-- qué se considera correcto en preguntas de texto libre (jugadores, partidos...).
-- Los puntos para estas preguntas los calcula directamente el admin desde la web,
-- no el trigger automático (que sigue funcionando igual para equipos/sí-no/etc).
alter table public.bonus_predictions
  add column if not exists correct_items jsonb;
