-- =====================================================================
-- Seguridad: cerrar el acceso anónimo y exigir sesión de personal autorizado
-- Ejecutar en Supabase > SQL Editor DESPUÉS de desplegar el front que usa
-- Supabase Auth (si no, el front actual queda sin datos).
--
-- n8n NO se ve afectado: se conecta por Postgres directo con el rol
-- postgres (dueño de las tablas), que no está sujeto a estas políticas.
-- =====================================================================

begin;

-- 1. Lista de correos del personal con acceso (editable solo desde el SQL Editor)
create table if not exists public.usuarios_autorizados (
  email      text primary key check (email = lower(email)),
  nombre     text,
  created_at timestamptz not null default now()
);
alter table public.usuarios_autorizados enable row level security;
-- Sin políticas: no es accesible vía API (anon/authenticated).
revoke all on public.usuarios_autorizados from anon, authenticated;

insert into public.usuarios_autorizados (email, nombre)
values ('automatizadon8n@gmail.com', 'Administrador')
on conflict (email) do nothing;

-- 2. Función que valida el JWT del usuario contra la lista
create or replace function public.es_usuario_autorizado()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios_autorizados u
    where u.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.es_usuario_autorizado() from public, anon;
grant execute on function public.es_usuario_autorizado() to authenticated;

-- 3. Eliminar las políticas abiertas a "public" (incluye al rol anon)
drop policy if exists "Permitir inserción de mensajes para public"       on public.mensajes_whatsapp;
drop policy if exists "Permitir lectura de mensajes para public"         on public.mensajes_whatsapp;
drop policy if exists "Enable read access for all users"                 on public.citas;
drop policy if exists "Permitir actualización de citas para public"      on public.citas;
drop policy if exists "Permitir inserción de citas para public"          on public.citas;
drop policy if exists "Permitir lectura de citas para public"            on public.citas;
drop policy if exists "Enable read access for all users"                 on public.pacientes;
drop policy if exists "Permitir actualización de pacientes para public"  on public.pacientes;
drop policy if exists "Permitir inserción de pacientes para public"      on public.pacientes;
drop policy if exists "Permitir lectura de pacientes para public"        on public.pacientes;

-- 4. Asegurar RLS activa y quitar privilegios al rol anónimo
alter table public.pacientes         enable row level security;
alter table public.citas             enable row level security;
alter table public.mensajes_whatsapp enable row level security;

revoke all on public.pacientes, public.citas, public.mensajes_whatsapp from anon;

-- 5. Nuevas políticas: solo personal autenticado y autorizado.
--    Sin DELETE: las citas se cancelan con estado (soft delete).
create policy "personal_select_pacientes" on public.pacientes
  for select to authenticated using (public.es_usuario_autorizado());
create policy "personal_insert_pacientes" on public.pacientes
  for insert to authenticated with check (public.es_usuario_autorizado());
create policy "personal_update_pacientes" on public.pacientes
  for update to authenticated using (public.es_usuario_autorizado()) with check (public.es_usuario_autorizado());

create policy "personal_select_citas" on public.citas
  for select to authenticated using (public.es_usuario_autorizado());
create policy "personal_insert_citas" on public.citas
  for insert to authenticated with check (public.es_usuario_autorizado());
create policy "personal_update_citas" on public.citas
  for update to authenticated using (public.es_usuario_autorizado()) with check (public.es_usuario_autorizado());

-- El front solo lee mensajes (para detectar leads); n8n escribe por Postgres directo.
create policy "personal_select_mensajes" on public.mensajes_whatsapp
  for select to authenticated using (public.es_usuario_autorizado());

commit;

-- =====================================================================
-- Verificación (ejecutar aparte):
--   select tablename, policyname, roles, cmd from pg_policies where schemaname = 'public';
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
--   select rolname, rolbypassrls from pg_roles where rolname = 'postgres';
-- =====================================================================
