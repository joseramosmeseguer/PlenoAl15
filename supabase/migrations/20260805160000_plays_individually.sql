-- Marca a los usuarios que eligieron "jugar individualmente" en el onboarding,
-- para no volver a pedirles liga y para no agruparlos en una tabla compartida.

alter table public.profiles
  add column if not exists plays_individually boolean not null default false;
