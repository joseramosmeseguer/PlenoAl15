-- Anuncios editables desde el panel de admin, se muestran en la pantalla de inicio.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  badge_text text,
  badge_color text default 'red',
  title text not null,
  message text,
  image_ref text,                                  -- clave de preset o URL subida a Storage
  visibility text not null default 'all',          -- 'all' | 'admins'
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.announcements enable row level security;

-- Los usuarios normales solo ven los de visibilidad 'all'; el admin ve todos.
create policy "announcements_select" on public.announcements
  for select to authenticated using (
    visibility = 'all' or public.has_role(auth.uid(), 'admin')
  );

-- Solo el admin puede crear/editar/borrar.
create policy "announcements_admin_all" on public.announcements
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Bucket público para las imágenes que suba el admin desde el móvil.
insert into storage.buckets (id, name, public)
values ('announcements', 'announcements', true)
on conflict (id) do nothing;

create policy "announcements_img_read" on storage.objects
  for select using (bucket_id = 'announcements');
create policy "announcements_img_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'announcements' and public.has_role(auth.uid(), 'admin'));
create policy "announcements_img_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'announcements' and public.has_role(auth.uid(), 'admin'));
create policy "announcements_img_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'announcements' and public.has_role(auth.uid(), 'admin'));
