-- 1) Soporta varios admins: settings.admin_email pasa de "un email" a un
--    array JSON de emails. Las cuentas nuevas que se registren con uno de
--    esos correos recibirán el rol admin automáticamente.
update public.settings
set value = '["joseramosmeseguer@gmail.com","pablozaframira@gmail.com"]'::jsonb
where key = 'admin_email';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_emails jsonb;
  display text;
begin
  select value into admin_emails from public.settings where key = 'admin_email';

  display := coalesce(
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles(id, display_name, email)
  values (new.id, display, new.email)
  on conflict (id) do nothing;

  if admin_emails is not null and jsonb_typeof(admin_emails) = 'array' and admin_emails ? new.email then
    insert into public.user_roles(user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  else
    insert into public.user_roles(user_id, role) values (new.id, 'user')
    on conflict do nothing;
  end if;

  return new;
end; $$;

-- 2) Noticias editables desde el panel de admin (estructura gemela a
--    "announcements"; el consumo público se diseñará más adelante).
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  badge_text text,
  badge_color text default 'red',
  title text not null,
  message text,
  image_ref text,                          -- clave de preset o URL subida a Storage
  visibility text not null default 'all',  -- 'all' | 'admins'
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.news enable row level security;

create policy "news_select" on public.news
  for select to authenticated using (
    visibility = 'all' or public.has_role(auth.uid(), 'admin')
  );

create policy "news_admin_all" on public.news
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into storage.buckets (id, name, public)
values ('news', 'news', true)
on conflict (id) do nothing;

create policy "news_img_read" on storage.objects
  for select using (bucket_id = 'news');
create policy "news_img_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'news' and public.has_role(auth.uid(), 'admin'));
create policy "news_img_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'news' and public.has_role(auth.uid(), 'admin'));
create policy "news_img_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'news' and public.has_role(auth.uid(), 'admin'));
