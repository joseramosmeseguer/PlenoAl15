-- El límite de "solo puedes cambiar el nombre una vez" vivía solo en
-- localStorage del navegador (se perdía en otro dispositivo/navegador, o
-- borrando datos). Lo movemos a la base de datos para que sea de verdad.
alter table public.profiles add column if not exists name_changed boolean not null default false;
