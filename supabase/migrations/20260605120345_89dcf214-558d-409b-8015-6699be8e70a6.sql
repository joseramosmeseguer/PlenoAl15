
-- 1) Nuevas columnas en bonus_questions
ALTER TABLE public.bonus_questions
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT 'mis_especiales_generales',
  ADD COLUMN IF NOT EXISTS location_label text,
  ADD COLUMN IF NOT EXISTS multi_text_count int NOT NULL DEFAULT 1;

-- 2) Migrar categorías existentes a la nueva ubicación
UPDATE public.bonus_questions SET location = CASE category
  WHEN 'general'  THEN 'mis_especiales_generales'
  WHEN 'tops'     THEN 'mis_especiales_tops'
  WHEN 'groups'   THEN 'mis_especiales_grupos'
  WHEN 'knockout' THEN 'mis_especiales_eliminatorias'
  ELSE 'mis_especiales_generales'
END
WHERE location = 'mis_especiales_generales';

-- 3) Rellenar start_at en las antiguas con created_at
UPDATE public.bonus_questions SET start_at = created_at WHERE start_at IS NULL;

-- 4) Actualizar trigger de bloqueo para respetar start_at e is_visible
CREATE OR REPLACE FUNCTION public.tg_lock_bonus()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare q public.bonus_questions%rowtype;
begin
  select * into q from public.bonus_questions where id = new.bonus_id;
  if q.id is null then raise exception 'Pregunta bonus no existe'; end if;
  if public.has_role(auth.uid(),'admin') then return new; end if;
  if not q.is_active then raise exception 'Pregunta bonus inactiva'; end if;
  if not q.is_visible then raise exception 'Pregunta no visible'; end if;
  if q.start_at is not null and now() < q.start_at then
    raise exception 'Esta pregunta aún no está disponible';
  end if;
  if now() > q.deadline_at then raise exception 'Plazo de esta pregunta bonus cerrado'; end if;
  return new;
end; $function$;

-- 5) Recompute con soporte para yes_no, match y multi_text
CREATE OR REPLACE FUNCTION public.recompute_bonus_points(_bonus_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  q public.bonus_questions%rowtype;
  per_hit int;
begin
  select * into q from public.bonus_questions where id = _bonus_id;
  if q.id is null then return; end if;
  if q.correct_answer is null then
    update public.bonus_predictions set points_awarded = 0 where bonus_id = _bonus_id;
    return;
  end if;

  if q.kind = 'top5_players' then
    per_hit := 5;
    update public.bonus_predictions bp
    set points_awarded = coalesce((
      select count(*)::int * per_hit
      from jsonb_array_elements_text(coalesce(bp.answer->'values','[]'::jsonb)) as a(val)
      where lower(unaccent(trim(a.val))) in (
        select lower(unaccent(trim(c.val)))
        from jsonb_array_elements_text(coalesce(q.correct_answer->'values','[]'::jsonb)) as c(val)
      )
    ), 0)
    where bp.bonus_id = _bonus_id;

  elsif q.kind = 'multi_text' then
    update public.bonus_predictions bp
    set points_awarded = coalesce((
      select count(*)::int * q.points
      from jsonb_array_elements_text(coalesce(bp.answer->'values','[]'::jsonb)) as a(val)
      where lower(unaccent(trim(a.val))) <> ''
        and lower(unaccent(trim(a.val))) in (
          select lower(unaccent(trim(c.val)))
          from jsonb_array_elements_text(coalesce(q.correct_answer->'values','[]'::jsonb)) as c(val)
        )
    ), 0)
    where bp.bonus_id = _bonus_id;

  elsif q.kind = 'multi_match' then
    update public.bonus_predictions bp
    set points_awarded = case
      when exists (
        select 1
        from jsonb_array_elements_text(coalesce(bp.answer->'values','[]'::jsonb)) as a(val)
        where a.val = (q.correct_answer->>'value')
      ) then q.points else 0 end
    where bp.bonus_id = _bonus_id;

  elsif q.kind = 'two_teams' then
    update public.bonus_predictions bp
    set points_awarded = case
      when (bp.answer->'values') @> (q.correct_answer->'values')
       and (q.correct_answer->'values') @> (bp.answer->'values')
      then q.points else 0 end
    where bp.bonus_id = _bonus_id;

  else
    -- team, player, match, yes_no, group, stage, text
    update public.bonus_predictions bp
    set points_awarded = case
      when lower(unaccent(coalesce(bp.answer->>'value', bp.answer->>'text',''))) =
           lower(unaccent(coalesce(q.correct_answer->>'value', q.correct_answer->>'text','')))
       and coalesce(bp.answer->>'value', bp.answer->>'text','') <> ''
      then q.points else 0 end
    where bp.bonus_id = _bonus_id;
  end if;
end; $function$;

-- 6) Dar rol admin a pzaframira@icloud.com si el usuario ya existe
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'pzaframira@icloud.com'
ON CONFLICT DO NOTHING;
