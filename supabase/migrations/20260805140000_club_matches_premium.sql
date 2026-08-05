-- Columnas para gestionar los partidos de clubes desde el admin: nivel de
-- puntuacion (premium/megapremium) y bloqueo manual de pronosticos.

alter table public.club_matches
  add column if not exists is_premium boolean not null default false,
  add column if not exists is_megapremium boolean not null default false,
  add column if not exists predictions_locked boolean not null default false;
