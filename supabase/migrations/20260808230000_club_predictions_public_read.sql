-- Para la pestaña de Estadísticas (cómo pronostica la comunidad), igual que
-- ya pasaba con la tabla "predictions" del Mundial: todo el mundo puede leer
-- los pronósticos de LaLiga, no solo los suyos. Seguimos sin exponer nada
-- más sensible (los emails siguen protegidos aparte en profiles).

drop policy if exists "club_predictions_select_own" on public.club_predictions;
create policy "club_predictions_select_all" on public.club_predictions
  for select to authenticated using (true);
