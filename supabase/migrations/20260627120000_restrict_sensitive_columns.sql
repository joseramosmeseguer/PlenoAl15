-- Oculta columnas sensibles a usuarios normales aunque la fila sea visible:
-- - bonus_questions.correct_answer: nadie debe poder leer la respuesta correcta
--   antes de tiempo consultando la tabla directamente.
-- - profiles.email: el email de un participante no debe ser visible para otros.
-- El admin sigue viendo ambas columnas a través de las funciones de servidor
-- (getAdminBonusQuestions / getAdminProfiles), que usan el cliente con privilegios
-- elevados y no se ven afectadas por este cambio.

revoke select on public.bonus_questions from authenticated;
grant select (
  id, key, label, description, kind, points, deadline_at, is_active, is_fun,
  position, created_at, updated_at, category, start_at, is_visible, location,
  location_label, multi_text_count
) on public.bonus_questions to authenticated;

revoke select on public.profiles from authenticated;
grant select (
  id, display_name, avatar_emoji, created_at, updated_at, is_hidden
) on public.profiles to authenticated;
