-- =====================================================================
-- Unificar estados de cita y normalizar identificadores de paciente
-- Ejecutar en Supabase > SQL Editor. Es una sola transacción: si algo
-- falla, no se aplica nada y el mensaje de error indica qué revisar.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Normalización de identificadores (misma lógica que normalizarIdentificador del front)
--    Teléfono -> E.164 (+51987654321). Móvil peruano de 9 dígitos -> +51.
--    Otros valores (usuario de WhatsApp, user_123) -> solo trim.
-- ---------------------------------------------------------------------
create or replace function public.normalizar_identificador(valor text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  texto    text := btrim(coalesce(valor, ''));
  compacto text;
  digitos  text;
begin
  if texto = '' then
    return null;
  end if;

  compacto := regexp_replace(texto, '[\s\-().]', '', 'g');
  if compacto ~ '^\+?\d{7,15}$' then
    digitos := ltrim(compacto, '+');
    if digitos ~ '^9\d{8}$' then
      digitos := '51' || digitos;
    end if;
    return '+' || digitos;
  end if;

  return texto;
end;
$$;

-- 1.1 Corregir pacientes existentes. Si el identificador normalizado ya existe,
--     se fusionan (las citas pasan al paciente normalizado y se borra el duplicado).
do $$
declare
  r record;
  nuevo text;
begin
  for r in
    select identificador_paciente, nombre_paciente, created_at
    from public.pacientes
    where identificador_paciente is distinct from public.normalizar_identificador(identificador_paciente)
  loop
    nuevo := public.normalizar_identificador(r.identificador_paciente);

    insert into public.pacientes (identificador_paciente, nombre_paciente, created_at)
    values (nuevo, r.nombre_paciente, r.created_at)
    on conflict (identificador_paciente) do nothing;

    update public.citas
    set identificador_paciente = nuevo
    where identificador_paciente = r.identificador_paciente;

    delete from public.pacientes where identificador_paciente = r.identificador_paciente;

    raise notice 'Paciente % -> %', r.identificador_paciente, nuevo;
  end loop;
end;
$$;

-- 1.2 Triggers: todo lo que se inserte o actualice (front o n8n) queda normalizado
create or replace function public.tg_normalizar_identificador()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.identificador_paciente := public.normalizar_identificador(new.identificador_paciente);
  return new;
end;
$$;

drop trigger if exists normalizar_identificador on public.pacientes;
create trigger normalizar_identificador
  before insert or update of identificador_paciente on public.pacientes
  for each row execute function public.tg_normalizar_identificador();

drop trigger if exists normalizar_identificador on public.citas;
create trigger normalizar_identificador
  before insert or update of identificador_paciente on public.citas
  for each row execute function public.tg_normalizar_identificador();

-- ---------------------------------------------------------------------
-- 2. Estados de cita unificados
--    AGENDADA | REPROGRAMADA | CONFIRMADA | ASISTIO | NO_ASISTIO | CANCELADA
-- ---------------------------------------------------------------------
update public.citas set estado_cita = 'AGENDADA' where estado_cita is null or estado_cita = 'CREADA';
update public.citas set estado_cita = 'ASISTIO'  where estado_cita = 'COMPLETADA';
update public.citas set estado_cita = upper(btrim(estado_cita)) where estado_cita <> upper(btrim(estado_cita));

do $$
declare
  desconocidos text;
begin
  select string_agg(distinct estado_cita, ', ') into desconocidos
  from public.citas
  where estado_cita not in ('AGENDADA', 'REPROGRAMADA', 'CONFIRMADA', 'ASISTIO', 'NO_ASISTIO', 'CANCELADA');

  if desconocidos is not null then
    raise exception 'Hay citas con estados no reconocidos: %. Revísalos antes de aplicar la migración.', desconocidos;
  end if;
end;
$$;

alter table public.citas alter column estado_cita set default 'AGENDADA';
alter table public.citas alter column estado_cita set not null;
alter table public.citas drop constraint if exists citas_estado_cita_check;
alter table public.citas add constraint citas_estado_cita_check
  check (estado_cita in ('AGENDADA', 'REPROGRAMADA', 'CONFIRMADA', 'ASISTIO', 'NO_ASISTIO', 'CANCELADA'));

-- ---------------------------------------------------------------------
-- 3. recordatorio_enviado nunca nulo (con NULL la cita nunca recibía recordatorio)
-- ---------------------------------------------------------------------
update public.citas set recordatorio_enviado = false where recordatorio_enviado is null;
alter table public.citas alter column recordatorio_enviado set default false;
alter table public.citas alter column recordatorio_enviado set not null;

commit;

-- =====================================================================
-- Verificación (ejecutar aparte):
--   select estado_cita, count(*) from public.citas group by 1 order by 2 desc;
--   select identificador_paciente from public.pacientes
--     where identificador_paciente is distinct from public.normalizar_identificador(identificador_paciente);
--   select count(*) as citas_con_evento_falso from public.citas
--     where google_event_id like 'gcal-%' or google_event_id is null;
-- =====================================================================
