
-- 1) Column-level revoke: hide sensitive columns from regular clients
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;
REVOKE SELECT (correct_answer) ON public.bonus_questions FROM anon, authenticated;

-- 2) Fix mutable search_path
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin new.updated_at = now(); return new; end;
$function$;

-- 3) Add admin check inside recompute functions (defense in depth)
CREATE OR REPLACE FUNCTION public.recompute_all_points()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare r record;
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    raise exception 'Solo admin';
  end if;
  for r in select id from public.matches loop
    perform public.recompute_match_points(r.id);
  end loop;
  for r in select id from public.bonus_questions loop
    perform public.recompute_bonus_points(r.id);
  end loop;
end;
$function$;

-- 4) Revoke EXECUTE from anon/authenticated on internal SECURITY DEFINER functions
--    has_role must remain executable (used in RLS USING expressions)
REVOKE EXECUTE ON FUNCTION public.recompute_match_points(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.recompute_bonus_points(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_match_after_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_bonus_after_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_lock_predictions() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_lock_bonus() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM anon, authenticated, public;
