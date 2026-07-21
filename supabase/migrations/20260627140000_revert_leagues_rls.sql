-- REVERTIR: la restricción de la migración anterior (20260627130000) rompió la
-- visibilidad de "Mis ligas" para usuarios normales. Se deja todo como estaba
-- antes (todo el mundo ve las ligas en las que está apuntado, sin problemas),
-- aceptando que el código de invitación y las membresías vuelven a ser visibles
-- en general (igual que ya funcionaba antes de tocar esto).

drop policy if exists "lm_select" on public.league_memberships;
create policy "lm_select" on public.league_memberships
  for select to authenticated using (true);

grant select on public.leagues to authenticated;
