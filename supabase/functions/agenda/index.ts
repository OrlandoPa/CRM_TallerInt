// Edge Function "agenda": única puerta del CRM hacia Google Calendar.
//
// * Google: usa el refresh token de la cuenta de la clínica (secreto del
//   servidor), así que el personal ya no necesita un token de Google en el
//   navegador ni "Reconectar" cada hora, y varios usuarios comparten el
//   mismo calendario.
// * Base de datos: cada consulta usa el JWT de quien llama, así que la RLS
//   (rol doctor / recepcion) se aplica igual que desde el front. La clave
//   service_role solo se usa para deshacer una fila recién creada cuando
//   Google falla (compensación), porque el personal no tiene DELETE.
// * Orden: primero la BD (la exclusion constraint reserva el horario sin
//   carreras) y luego Google; si Google falla se revierte la BD.
//
// Secretos (supabase secrets set ...): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
// GOOGLE_REFRESH_TOKEN, GOOGLE_CALENDAR_ID, CRM_ORIGINS (orígenes permitidos,
// separados por coma). SUPABASE_URL, SUPABASE_ANON_KEY y
// SUPABASE_SERVICE_ROLE_KEY los define Supabase.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { ESTADOS_ACTIVOS, sinReceta, validarRangoCita } from '../_shared/reglasAgenda.js';

const env = (k: string) => Deno.env.get(k) ?? '';

// El navegador envía el origen sin barra final: se quita por si el secreto la trae
const ORIGENES = env('CRM_ORIGINS').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);

const corsPara = (req: Request) => {
  const origen = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGENES.includes(origen) ? origen : (ORIGENES[0] ?? ''),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin'
  };
};

class ErrorHttp extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------------------------------------------------------------------
// Google Calendar
// ---------------------------------------------------------------------
let tokenCache = { token: '', vence: 0 };

const tokenGoogle = async (): Promise<string> => {
  if (tokenCache.token && Date.now() < tokenCache.vence - 60_000) return tokenCache.token;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      refresh_token: env('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token'
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) {
    console.error('Google token', r.status, data);
    throw new ErrorHttp(502, 'No se pudo autenticar con Google Calendar. Avisa al administrador (refresh token).');
  }
  tokenCache = { token: data.access_token, vence: Date.now() + data.expires_in * 1000 };
  return tokenCache.token;
};

const urlEventos = (eventId = '') => {
  const cal = encodeURIComponent(env('GOOGLE_CALENDAR_ID') || 'primary');
  return `https://www.googleapis.com/calendar/v3/calendars/${cal}/events${eventId ? `/${encodeURIComponent(eventId)}` : ''}`;
};

const gcal = async (metodo: string, eventId = '', cuerpo?: unknown, query?: Record<string, string>) => {
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  const r = await fetch(`${urlEventos(eventId)}${qs}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${await tokenGoogle()}`, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  if (metodo === 'DELETE' && (r.status === 404 || r.status === 410)) return null; // ya no existe
  if (!r.ok) {
    const detalle = await r.json().catch(() => ({}));
    console.error('Google Calendar', metodo, r.status, detalle);
    throw new ErrorHttp(502, `Google Calendar: ${detalle?.error?.message ?? r.statusText}`);
  }
  return r.status === 204 ? null : r.json();
};

// ---------------------------------------------------------------------
// Base de datos
// ---------------------------------------------------------------------
const errorBd = (e: { code?: string; message?: string } | null, accion: string) => {
  if (!e) return null;
  if (e.code === '23P01') {
    // exclusion constraint citas_sin_choques o trigger de bloqueos
    const msg = e.message?.includes('citas_sin_choques') ? 'Ese horario ya está ocupado por otra cita.' : e.message;
    return new ErrorHttp(409, msg ?? 'Conflicto de horario.');
  }
  if (e.code === '42501') return new ErrorHttp(403, 'No tienes permiso para esta acción.');
  return new ErrorHttp(400, `Base de datos (${accion}): ${e.message}`);
};

const exigir = <T>(res: { data: T; error: { code?: string; message?: string } | null }, accion: string): T => {
  const err = errorBd(res.error, accion);
  if (err) throw err;
  return res.data;
};

// Para inserts con .single(): la fila tiene que existir
const fila = <T>(res: { data: T; error: { code?: string; message?: string } | null }, accion: string): NonNullable<T> => {
  const data = exigir(res, accion);
  if (data == null) throw new ErrorHttp(500, `Base de datos (${accion}): no devolvió la fila.`);
  return data as NonNullable<T>;
};

const cargarReglas = async (db: SupabaseClient) => {
  const [horario, feriados, bloqueos] = await Promise.all([
    db.from('horario_atencion').select('dia_semana, inicio, fin'),
    db.from('feriados').select('fecha'),
    db.from('bloqueos_agenda').select('inicio, fin, motivo').eq('activo', true)
  ]);
  return {
    horario: exigir(horario, 'leer horario') ?? [],
    feriados: exigir(feriados, 'leer feriados') ?? [],
    bloqueos: exigir(bloqueos, 'leer bloqueos') ?? []
  };
};

const validar = async (db: SupabaseClient, inicio: string, fin: string) => {
  const r = validarRangoCita({ inicio, fin }, await cargarReglas(db));
  if (!r.valid) throw new ErrorHttp(422, r.reason);
};

const texto = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const fechaIso = (v: unknown, campo: string) => {
  const d = new Date(String(v));
  if (!v || isNaN(d.getTime())) throw new ErrorHttp(400, `Falta o no es válida la fecha: ${campo}.`);
  return d.toISOString();
};

// ---------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------
type Ctx = { db: SupabaseClient; admin: SupabaseClient; perfil: { email: string; rol: string } };
type Datos = Record<string, unknown>;

const listarEventos = async ({ perfil }: Ctx, d: Datos) => {
  const data = await gcal('GET', '', undefined, {
    timeMin: fechaIso(d.timeMin, 'timeMin'),
    timeMax: fechaIso(d.timeMax, 'timeMax'),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '2500'
  });
  return (data.items ?? []).map((e: Record<string, any>) => ({
    id: e.id,
    summary: e.summary || 'Cita Odontológica',
    // Recepción no ve recetas antiguas que el CRM escribía en la descripción
    description: perfil.rol === 'doctor' ? (e.description || '') : sinReceta(e.description),
    start: { dateTime: e.start?.dateTime || e.start?.date },
    end: { dateTime: e.end?.dateTime || e.end?.date },
    status: e.status || 'confirmed',
    correo_electronico: e.attendees?.[0]?.email || '',
    tipo: e.extendedProperties?.private?.tipo === 'bloqueo' ? 'bloqueo' : 'cita'
  }));
};

const crearCita = async ({ db, admin, perfil }: Ctx, d: Datos) => {
  const inicio = fechaIso(d.inicio, 'inicio');
  const fin = fechaIso(d.fin, 'fin');
  const identificador = texto(d.identificador, 100);
  const nombre = texto(d.nombre, 150) || identificador;
  const titulo = texto(d.titulo, 200) || `${nombre} - Consulta`;
  const notas = texto(d.notas, 2000);
  const correo = texto(d.correo, 200).toLowerCase();
  const servicio = texto(d.servicio_clave, 50) || null;
  const tratamiento = texto(d.tratamiento, 4000);
  if (!identificador) throw new ErrorHttp(400, 'Selecciona o registra al paciente antes de agendar.');
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new ErrorHttp(400, 'El correo del paciente no es válido.');

  await validar(db, inicio, fin);

  // Paciente (el trigger normaliza el identificador a E.164)
  const existentes = exigir(
    await db.from('pacientes').select('identificador_paciente').eq('identificador_paciente', identificador).limit(1),
    'buscar paciente'
  );
  let idPaciente = existentes?.[0]?.identificador_paciente;
  if (!idPaciente) {
    const nuevo = fila(
      await db.from('pacientes').insert({ identificador_paciente: identificador, nombre_paciente: nombre })
        .select('identificador_paciente').single(),
      'registrar paciente'
    );
    idPaciente = nuevo.identificador_paciente;
  }

  // 1. BD primero: la constraint reserva el horario
  const cita = fila(
    await db.from('citas').insert({
      identificador_paciente: idPaciente,
      fecha_hora_cita: inicio,
      fecha_hora_fin: fin,
      servicio_clave: servicio,
      motivo_consulta: titulo,
      estado_cita: 'AGENDADA',
      detalles_notas_cita: notas || null,
      correo_electronico: correo || null,
      recordatorio_enviado: false
    }).select('id').single(),
    'guardar cita'
  );

  // 2. Google Calendar; si falla, se deshace la fila
  let evento;
  try {
    evento = await gcal('POST', '', {
      summary: titulo,
      description: [notas, `Contacto: ${idPaciente}`].filter(Boolean).join('\n'),
      start: { dateTime: inicio },
      end: { dateTime: fin },
      ...(correo ? { attendees: [{ email: correo }] } : {}),
      extendedProperties: { private: { tipo: 'cita', cita_id: String(cita.id) } }
    }, correo ? { sendUpdates: 'all' } : undefined);
    exigir(await db.from('citas').update({ google_event_id: evento.id }).eq('id', cita.id), 'vincular evento');
  } catch (e) {
    if (evento?.id) await gcal('DELETE', evento.id).catch(() => {});
    await admin.from('citas').delete().eq('id', cita.id);
    throw e;
  }

  // 3. Receta (solo el doctor; la RLS lo impide a los demás)
  if (tratamiento && perfil.rol === 'doctor') {
    exigir(await db.from('tratamientos_cita').insert({ cita_id: cita.id, texto: tratamiento }), 'guardar tratamiento');
  }

  return { id: cita.id, google_event_id: evento.id };
};

const buscarCita = async (db: SupabaseClient, googleEventId: string) => {
  const cita = exigir(
    await db.from('citas').select('id, fecha_hora_cita, fecha_hora_fin, estado_cita, recordatorio_enviado')
      .eq('google_event_id', googleEventId).maybeSingle(),
    'buscar cita'
  );
  if (!cita) throw new ErrorHttp(404, 'La cita no existe en la base de datos.');
  return cita;
};

const reprogramarCita = async ({ db }: Ctx, d: Datos) => {
  const eventId = texto(d.google_event_id, 200);
  const inicio = fechaIso(d.inicio, 'inicio');
  const fin = fechaIso(d.fin, 'fin');
  const antes = await buscarCita(db, eventId);
  if (!ESTADOS_ACTIVOS.includes(antes.estado_cita)) {
    throw new ErrorHttp(409, 'Solo se pueden reprogramar citas activas.');
  }
  await validar(db, inicio, fin);

  exigir(await db.from('citas').update({
    fecha_hora_cita: inicio,
    fecha_hora_fin: fin,
    estado_cita: 'REPROGRAMADA',
    recordatorio_enviado: false
  }).eq('id', antes.id), 'reprogramar cita');

  try {
    await gcal('PATCH', eventId, { start: { dateTime: inicio }, end: { dateTime: fin } });
  } catch (e) {
    await db.from('citas').update({
      fecha_hora_cita: antes.fecha_hora_cita,
      fecha_hora_fin: antes.fecha_hora_fin,
      estado_cita: antes.estado_cita,
      recordatorio_enviado: antes.recordatorio_enviado
    }).eq('id', antes.id);
    throw e;
  }
  return { ok: true };
};

const cancelarCita = async ({ db }: Ctx, d: Datos) => {
  const eventId = texto(d.google_event_id, 200);
  const antes = await buscarCita(db, eventId);
  if (!ESTADOS_ACTIVOS.includes(antes.estado_cita)) throw new ErrorHttp(409, 'La cita ya no está activa.');

  exigir(await db.from('citas').update({ estado_cita: 'CANCELADA' }).eq('id', antes.id), 'cancelar cita');
  try {
    await gcal('DELETE', eventId);
  } catch (e) {
    await db.from('citas').update({ estado_cita: antes.estado_cita }).eq('id', antes.id);
    throw e;
  }
  return { ok: true };
};

const crearBloqueo = async ({ db, admin, perfil }: Ctx, d: Datos) => {
  if (perfil.rol !== 'doctor') throw new ErrorHttp(403, 'Solo el doctor gestiona los bloqueos de agenda.');
  const inicio = fechaIso(d.inicio, 'inicio');
  const fin = fechaIso(d.fin, 'fin');
  const motivo = texto(d.motivo, 200);
  if (!motivo) throw new ErrorHttp(400, 'Indica el motivo del bloqueo.');
  if (new Date(fin) <= new Date(inicio)) throw new ErrorHttp(400, 'El fin del bloqueo debe ser posterior al inicio.');

  const bloqueo = fila(
    await db.from('bloqueos_agenda').insert({ inicio, fin, motivo, creado_por: perfil.email }).select('id').single(),
    'crear bloqueo'
  );
  let evento;
  try {
    // Evento "ocupado" para que el bot de WhatsApp no ofrezca ese horario
    evento = await gcal('POST', '', {
      summary: `Bloqueado - ${motivo}`,
      start: { dateTime: inicio },
      end: { dateTime: fin },
      transparency: 'opaque',
      extendedProperties: { private: { tipo: 'bloqueo', bloqueo_id: String(bloqueo.id) } }
    });
    exigir(await db.from('bloqueos_agenda').update({ google_event_id: evento.id }).eq('id', bloqueo.id), 'vincular bloqueo');
  } catch (e) {
    if (evento?.id) await gcal('DELETE', evento.id).catch(() => {});
    await admin.from('bloqueos_agenda').delete().eq('id', bloqueo.id);
    throw e;
  }
  return { id: bloqueo.id };
};

const quitarBloqueo = async ({ db, perfil }: Ctx, d: Datos) => {
  if (perfil.rol !== 'doctor') throw new ErrorHttp(403, 'Solo el doctor gestiona los bloqueos de agenda.');
  const id = Number(d.id);
  const bloqueo = exigir(
    await db.from('bloqueos_agenda').select('id, google_event_id, activo').eq('id', id).maybeSingle(),
    'buscar bloqueo'
  );
  if (!bloqueo) throw new ErrorHttp(404, 'El bloqueo no existe.');
  if (!bloqueo.activo) return { ok: true };

  exigir(await db.from('bloqueos_agenda').update({ activo: false }).eq('id', id), 'quitar bloqueo');
  if (bloqueo.google_event_id) {
    try {
      await gcal('DELETE', bloqueo.google_event_id);
    } catch (e) {
      await db.from('bloqueos_agenda').update({ activo: true }).eq('id', id);
      throw e;
    }
  }
  return { ok: true };
};

const ACCIONES: Record<string, (ctx: Ctx, d: Datos) => Promise<unknown>> = {
  listar_eventos: listarEventos,
  crear_cita: crearCita,
  reprogramar_cita: reprogramarCita,
  cancelar_cita: cancelarCita,
  crear_bloqueo: crearBloqueo,
  quitar_bloqueo: quitarBloqueo
};

// ---------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------
Deno.serve(async (req) => {
  const cors = corsPara(req);
  const responder = (status: number, cuerpo: unknown) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return responder(405, { error: 'Método no permitido.' });

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) throw new ErrorHttp(401, 'Falta la sesión.');

    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false }
    });
    const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false }
    });

    const perfil = exigir(await db.rpc('mi_perfil').maybeSingle(), 'leer perfil') as Ctx['perfil'] | null;
    if (!perfil) throw new ErrorHttp(403, 'Tu cuenta no está autorizada o fue desactivada.');

    const { accion, ...datos } = await req.json().catch(() => ({}));
    const fn = ACCIONES[accion];
    if (!fn) throw new ErrorHttp(400, `Acción desconocida: ${accion}`);

    return responder(200, { data: await fn({ db, admin, perfil }, datos) });
  } catch (e) {
    const status = e instanceof ErrorHttp ? e.status : 500;
    if (status === 500) console.error(e);
    return responder(status, { error: status === 500 ? 'Error interno de la agenda.' : (e as Error).message });
  }
});
