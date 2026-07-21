-- 1) Elimina las 2 preguntas especiales de fase de grupos que quedaron suspendidas
--    (no se pueden resolver de forma fiable: equipo con más tarjetas / partido con más goles).
delete from public.bonus_predictions
where bonus_id in (select id from public.bonus_questions where key in ('most_cards_team', 'group_top_match'));

delete from public.bonus_questions
where key in ('most_cards_team', 'group_top_match');

-- 2) recompute_bonus_points: el admin ahora puede marcar VARIAS respuestas correctas
--    en preguntas de equipo/sí-no/grupo/fase (ej. varios equipos invictos a la vez).
--    Si correct_answer trae "values" se comprueba que la respuesta del usuario esté
--    en esa lista; si solo trae "value"/"text" (como antes) se compara igual que siempre.
create or replace function public.recompute_bonus_points(_bonus_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
      when q.correct_answer ? 'values' then
        case when coalesce(bp.answer->>'value', bp.answer->>'text','') <> ''
          and exists (
            select 1
            from jsonb_array_elements_text(coalesce(q.correct_answer->'values','[]'::jsonb)) as c(val)
            where lower(unaccent(trim(c.val))) = lower(unaccent(coalesce(bp.answer->>'value', bp.answer->>'text','')))
          )
        then q.points else 0 end
      else
        case when lower(unaccent(coalesce(bp.answer->>'value', bp.answer->>'text',''))) =
             lower(unaccent(coalesce(q.correct_answer->>'value', q.correct_answer->>'text','')))
         and coalesce(bp.answer->>'value', bp.answer->>'text','') <> ''
        then q.points else 0 end
      end
    where bp.bonus_id = _bonus_id;
  end if;
end; $function$;
