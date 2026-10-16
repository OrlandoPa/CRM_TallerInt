-- Prepara un Postgres vacío (contenedor de prueba) para restaurar el respaldo
-- de Supabase: roles y funciones de Supabase que el esquema public referencia.
-- Solo para la PRUEBA de restauración; un proyecto de Supabase ya los trae.
-- El respaldo crea el esquema public, así que en el destino vacío se quita antes.
drop schema if exists public cascade;
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role', 'n8n_bot', 'respaldo_ro'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I nologin', r);
    end if;
  end loop;
end;
$$;
create schema if not exists auth;
create or replace function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create schema if not exists extensions;
create extension if not exists btree_gist schema extensions;
