-- Nuevo nivel "MEGAPREMIUM": resultado = 3 pts, exacto = 9 pts (x3 sobre lo normal).
alter table public.matches add column if not exists is_megapremium boolean not null default false;

update public.settings
set value = value || '{"megapremium_outcome":3,"megapremium_exact":9}'::jsonb
where key = 'points';

create or replace function public.recompute_match_points(_match_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  m public.matches%rowtype;
  cfg jsonb;
  p_outcome int;
  p_exact int;
  real_outcome text;
begin
  select * into m from public.matches where id = _match_id;
  if m.id is null then return; end if;
  if m.home_score is null or m.away_score is null or m.status <> 'finished' then
    update public.predictions set points_awarded = 0 where match_id = _match_id;
    return;
  end if;
  select value into cfg from public.settings where key='points';
  if m.is_megapremium then
    p_outcome := (cfg->>'megapremium_outcome')::int;
    p_exact := (cfg->>'megapremium_exact')::int;
  elsif m.is_premium then
    p_outcome := (cfg->>'premium_outcome')::int;
    p_exact := (cfg->>'premium_exact')::int;
  else
    p_outcome := (cfg->>'normal_outcome')::int;
    p_exact := (cfg->>'normal_exact')::int;
  end if;
  real_outcome := public.outcome(m.home_score, m.away_score);

  update public.predictions p
  set points_awarded = case
    when p.home_score = m.home_score and p.away_score = m.away_score then p_exact
    when public.outcome(p.home_score, p.away_score) = real_outcome then p_outcome
    else 0
  end
  where p.match_id = _match_id;
end; $$;

create or replace function public.tg_match_after_update()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (new.home_score is distinct from old.home_score)
     or (new.away_score is distinct from old.away_score)
     or (new.status is distinct from old.status)
     or (new.is_premium is distinct from old.is_premium)
     or (new.is_megapremium is distinct from old.is_megapremium) then
    perform public.recompute_match_points(new.id);
  end if;
  return new;
end; $$;
