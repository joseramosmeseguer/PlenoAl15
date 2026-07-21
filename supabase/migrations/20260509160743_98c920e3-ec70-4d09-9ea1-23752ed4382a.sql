
alter view public.v_leaderboard set (security_invoker = on);

alter function public.outcome(int,int) set search_path = public;

revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.recompute_match_points(uuid) from anon, authenticated;
revoke execute on function public.recompute_bonus_points(uuid) from anon, authenticated;
revoke execute on function public.recompute_all_points() from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.tg_set_updated_at() from anon, authenticated;
revoke execute on function public.tg_lock_predictions() from anon, authenticated;
revoke execute on function public.tg_lock_bonus() from anon, authenticated;
revoke execute on function public.tg_match_after_update() from anon, authenticated;
revoke execute on function public.tg_bonus_after_update() from anon, authenticated;
