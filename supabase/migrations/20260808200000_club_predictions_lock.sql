-- Bloquea pronósticos de LaLiga 1 hora antes del partido (o si el admin lo
-- bloquea a mano), a nivel de base de datos — no solo en la interfaz.

create or replace function public.tg_club_prediction_check_lock()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  m public.club_matches%rowtype;
begin
  select * into m from public.club_matches where id = new.match_id;
  if m.id is null then
    raise exception 'Partido no encontrado';
  end if;
  if m.predictions_locked or now() > (m.utc_date - interval '1 hour') then
    raise exception 'Los pronósticos de este partido están cerrados';
  end if;
  return new;
end; $$;

drop trigger if exists trg_club_prediction_check_lock on public.club_predictions;
create trigger trg_club_prediction_check_lock
  before insert or update of home_score, away_score on public.club_predictions
  for each row execute function public.tg_club_prediction_check_lock();
