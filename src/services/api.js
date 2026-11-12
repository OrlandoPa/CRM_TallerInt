import { createClient } from '@supabase/supabase-js';
import { normalizarIdentificador } from '../utils/contactHelpers.js';

// Supabase credentials come only from build-time env vars (never from localStorage)
const getSupabaseCredentials = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url: url.trim(), key: key.trim() };
};

const creds = getSupabaseCredentials();

// Initialize Supabase Client
export const supabase = (creds.url && creds.key)
  ? createClient(creds.url, creds.key, {
      // PKCE: el login vuelve con ?code= (que se canjea y se borra de la URL)
      // en vez de exponer los tokens en el #fragmento
      auth: { flowType: 'pkce' }
    })
  : null;

if (!supabase) {
  console.error('Supabase no está configurado: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
}

// Helper to parse Chatwoot configuration and extract Account ID from full URLs.
// No API token here: anything prefixed VITE_ is shipped in the public bundle.
export const getChatwootConfig = () => {
  const accountVal = import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '';
  const baseUrl = import.meta.env.VITE_CHATWOOT_BASE_URL || 'https://app.chatwoot.com';

  if (!accountVal) return null;

  // Extract number if they paste the full URL (e.g., https://app.chatwoot.com/app/accounts/164153/)
  let accountId = accountVal.trim();
  const match = accountId.match(/accounts\/(\d+)/);
  if (match) {
    accountId = match[1];
  }

  return {
    accountId,
    baseUrl: baseUrl.trim().replace(/\/+$/, '') || 'https://app.chatwoot.com'
  };
};

export const getChatwootDashboardUrl = (conversationId = null) => {
  const config = getChatwootConfig();
  if (!config) return '';

  return conversationId
    ? `${config.baseUrl}/app/accounts/${config.accountId}/conversations/${conversationId}`
    : `${config.baseUrl}/app/accounts/${config.accountId}/dashboard`;
};

// --- API METHODS ---
//
// Regla general: cualquier error de Supabase o de la agenda se propaga a la UI.
// Los permisos (doctor / recepción) los aplica la RLS de Supabase; el front solo
// oculta lo que el rol no puede usar.

const dbError = (err, action) => {
  if (err?.code === '23P01') {
    const msg = String(err.message || '').includes('citas_sin_choques')
      ? 'Ese horario ya está ocupado por otra cita.'
      : err.message;
    return new Error(msg, { cause: err });
  }
  if (err?.code === '42501') {
    return new Error('No tienes permiso para esta acción.', { cause: err });
  }
  return new Error(`Base de datos (${action}): ${err?.message || JSON.stringify(err)}`, { cause: err });
};

const exigir = ({ data, error }, action) => {
  if (error) throw dbError(error, action);
  return data;
};

// Edge Function "agenda": única puerta hacia Google Calendar (ver supabase/functions/agenda)
const agenda = async (accion, datos = {}) => {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.functions.invoke('agenda', { body: { accion, ...datos } });
  if (error) {
    let mensaje = error.message;
    try {
      const cuerpo = await error.context?.json();
      if (cuerpo?.error) mensaje = cuerpo.error;
    } catch {
      // respuesta sin JSON
    }
    throw new Error(mensaje, { cause: error });
  }
  return data?.data;
};

// 0. SESIÓN Y PERFIL
/** Perfil del usuario de la sesión según usuarios_autorizados: { email, nombre, rol } o null. */
export const getPerfil = async () => {
  const data = exigir(await supabase.rpc('mi_perfil'), 'leer perfil');
  return Array.isArray(data) ? (data[0] || null) : data;
};

// --- Lecturas acotadas (software verde, RNF-VERDE-05) ---
// Las tablas que crecen se leen con columnas explícitas y con un límite (rango de
// fechas o número de filas): una columna nueva en la base no viaja al navegador
// si la interfaz no la usa. Los límites coinciden con la retención de datos
// (pacientes y citas: 2 años; mensajes: 90 días) y quedan muy por encima del
// volumen de la clínica. Si una lectura llega al tope, se avisa en la consola.
export const COLUMNAS_PACIENTES =
  'identificador_paciente, nombre_paciente, created_at, consentimiento_datos_at, consentimiento_aviso_version';
export const COLUMNAS_CITAS =
  'id, identificador_paciente, fecha_hora_cita, fecha_hora_fin, servicio_clave, motivo_consulta, estado_cita, ' +
  'google_event_id, detalles_notas_cita, correo_electronico, recordatorio_enviado, created_at, updated_at, ' +
  'pacientes(identificador_paciente, nombre_paciente), tratamientos_cita(texto)';
export const MAX_PACIENTES = 5000;
export const MAX_SESIONES = 5000;
export const MESES_CITAS = 24;
const MS_DIA = 24 * 60 * 60 * 1000;

const avisarTope = (filas, maximo, que) => {
  if (filas.length >= maximo) console.warn(`Se leyeron ${maximo} ${que}: el resto no se cargó.`);
  return filas;
};

// 1. CRM LEADS
/**
 * Remitentes de WhatsApp de la memoria del bot, sin repetir. Usa la función
 * sesiones_whatsapp() (una fila por remitente); si la migración aún no se
 * ejecutó, lee solo los últimos 90 días (la retención de la tabla).
 */
export const getSesionesWhatsapp = async () => {
  const rpc = await supabase.rpc('sesiones_whatsapp');
  if (!rpc.error) {
    return avisarTope((rpc.data || []).map(f => f.session_id).filter(Boolean), MAX_SESIONES, 'remitentes');
  }
  if (rpc.error.code !== 'PGRST202') throw dbError(rpc.error, 'leer remitentes');

  const desde = new Date(Date.now() - 90 * MS_DIA).toISOString();
  const filas = exigir(
    await supabase.from('mensajes_whatsapp').select('session_id')
      .gte('created_at', desde).order('id', { ascending: false }).limit(MAX_SESIONES),
    'leer mensajes'
  ) || [];
  return [...new Set(filas.map(m => m.session_id).filter(Boolean))];
};

/** Combina pacientes y remitentes de WhatsApp (sin consultar la base otra vez). */
export const construirLeads = (pacientesData = [], uniqueSessions = []) => {
  const leadsMap = new Map();
  (pacientesData || []).forEach(p => {
    const identificador = p.identificador_paciente;
    if (identificador) {
      leadsMap.set(normalizarIdentificador(identificador), {
        phone_number: identificador,
        client_name: p.nombre_paciente || 'Paciente sin nombre',
        client_email: '',
        status: 'contacted',
        internal_notes: 'Paciente registrado en la base de datos.',
        created_at: p.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  });

  (uniqueSessions || []).forEach(session => {
    const key = normalizarIdentificador(session);
    if (!leadsMap.has(key)) {
      leadsMap.set(key, {
        phone_number: session,
        client_name: `WhatsApp Lead (${String(session).slice(-4)})`,
        client_email: '',
        status: 'lead',
        internal_notes: 'Nuevo contacto detectado en WhatsApp.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  });

  return Array.from(leadsMap.values());
};

export const updateLead = async (lead) => {
  const identificador = normalizarIdentificador(lead.phone_number);
  const { data, error } = await supabase
    .from('pacientes')
    .upsert({
      identificador_paciente: identificador,
      nombre_paciente: lead.client_name
    })
    .select();
  if (error) throw dbError(error, 'actualizar paciente');

  return {
    ...lead,
    phone_number: data?.[0]?.identificador_paciente || identificador,
    client_name: data?.[0]?.nombre_paciente || lead.client_name,
    updated_at: new Date().toISOString()
  };
};

// 2. GOOGLE CALENDAR (vía Edge Function)
export const getAppointments = async (timeMin, timeMax) =>
  (await agenda('listar_eventos', { timeMin, timeMax })) || [];

/**
 * Crea la cita en la BD y en Google Calendar (la Edge Function revierte si algo falla).
 * @param {{identificador, nombre, titulo, inicio, fin, servicio_clave?, notas?, correo?, tratamiento?}} cita
 */
export const createAppointment = (cita) => agenda('crear_cita', cita);

export const deleteAppointment = (eventId) => agenda('cancelar_cita', { google_event_id: eventId });

export const rescheduleAppointment = (eventId, start, end) =>
  agenda('reprogramar_cita', { google_event_id: eventId, inicio: start, fin: end });

// 3. CITAS Y PACIENTES (Supabase)
export const getPacientes = async () => {
  const { data, error } = await supabase
    .from('pacientes')
    .select(COLUMNAS_PACIENTES)
    .order('identificador_paciente')
    .limit(MAX_PACIENTES);
  if (error) throw dbError(error, 'leer pacientes');
  return avisarTope(data || [], MAX_PACIENTES, 'pacientes');
};

export const updatePaciente = async (identificador, cambios) => {
  const permitidos = {};
  if (typeof cambios.nombre_paciente === 'string') {
    const nombre = cambios.nombre_paciente.trim();
    if (!nombre) throw new Error('El nombre del paciente no puede quedar vacío.');
    permitidos.nombre_paciente = nombre;
  }
  const data = exigir(
    await supabase.from('pacientes').update(permitidos).eq('identificador_paciente', identificador).select(),
    'actualizar paciente'
  );
  if (!data?.length) throw new Error('No se encontró el paciente.');
  return data[0];
};

// La receta vive en tratamientos_cita (solo el doctor la ve: RLS). Se aplana
// a `tratamiento_receta` para que la UI no dependa de la tabla.
const aplanarCita = ({ tratamientos_cita: trat, ...c }) => ({
  ...c,
  tratamiento_receta: (Array.isArray(trat) ? trat[0]?.texto : trat?.texto) || ''
});

/** Citas desde hace MESES_CITAS meses (incluye las futuras). */
export const getCitasDb = async () => {
  const desde = new Date();
  desde.setMonth(desde.getMonth() - MESES_CITAS);
  const { data, error } = await supabase
    .from('citas')
    .select(COLUMNAS_CITAS)
    .gte('fecha_hora_cita', desde.toISOString())
    .order('fecha_hora_cita', { ascending: true });
  if (error) throw dbError(error, 'leer citas');
  return (data || []).map(aplanarCita);
};

export const updateAppointmentStatus = async (googleEventId, status) => {
  const { data, error } = await supabase
    .from('citas')
    .update({ estado_cita: status, updated_at: new Date().toISOString() })
    .eq('google_event_id', googleEventId)
    .select();
  if (error) throw dbError(error, 'actualizar estado');
  if (!data || data.length === 0) {
    throw new Error('La cita no existe en la base de datos (solo está en Google Calendar).');
  }
  return data[0];
};

/** Guarda la receta/tratamiento de una cita registrada (solo el doctor). */
export const updateAppointmentPrescription = async (cita, tratamientoReceta) => {
  let citaId = cita?.id;
  if (!citaId && cita?.google_event_id) {
    const encontrada = exigir(
      await supabase.from('citas').select('id').eq('google_event_id', cita.google_event_id).maybeSingle(),
      'buscar cita'
    );
    citaId = encontrada?.id;
  }
  if (!citaId) {
    throw new Error('La cita no está registrada en la base de datos; no se puede guardar el tratamiento.');
  }
  exigir(
    await supabase.from('tratamientos_cita').upsert({ cita_id: citaId, texto: (tratamientoReceta || '').trim() }),
    'guardar tratamiento'
  );
  return { id: citaId, tratamiento_receta: (tratamientoReceta || '').trim() };
};

// 4. CONFIGURACIÓN DE LA AGENDA (catálogo, horario, feriados, bloqueos)
export const getAgendaConfig = async () => {
  const hoy = new Date();
  hoy.setDate(hoy.getDate() - 1);
  const [servicios, horario, feriados, bloqueos] = await Promise.all([
    supabase.from('servicios').select('*').order('orden').order('nombre'),
    supabase.from('horario_atencion').select('*').order('dia_semana').order('inicio'),
    supabase.from('feriados').select('*').order('fecha'),
    supabase.from('bloqueos_agenda').select('*').eq('activo', true).gte('fin', hoy.toISOString()).order('inicio')
  ]);
  return {
    servicios: exigir(servicios, 'leer servicios') || [],
    horario: exigir(horario, 'leer horario') || [],
    feriados: exigir(feriados, 'leer feriados') || [],
    bloqueos: exigir(bloqueos, 'leer bloqueos') || []
  };
};

export const guardarServicio = async ({ id, clave, nombre, duracion_min, nota, activo, orden }) => {
  const fila = {
    nombre: String(nombre || '').trim(),
    duracion_min: Number(duracion_min),
    nota: String(nota || '').trim() || null,
    activo: activo !== false,
    orden: Number(orden) || 0
  };
  if (!fila.nombre) throw new Error('El servicio necesita un nombre.');
  if (id) {
    return exigir(await supabase.from('servicios').update(fila).eq('id', id).select().single(), 'actualizar servicio');
  }
  const claveLimpia = String(clave || fila.nombre)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return exigir(await supabase.from('servicios').insert({ ...fila, clave: claveLimpia }).select().single(), 'crear servicio');
};

export const agregarJornada = async ({ dia_semana, inicio, fin }) =>
  exigir(await supabase.from('horario_atencion').insert({ dia_semana, inicio, fin }).select().single(), 'agregar jornada');

export const quitarJornada = async (id) =>
  exigir(await supabase.from('horario_atencion').delete().eq('id', id), 'quitar jornada');

export const agregarFeriado = async ({ fecha, nombre }) =>
  exigir(await supabase.from('feriados').insert({ fecha, nombre: String(nombre || '').trim() || 'Feriado' }).select().single(), 'agregar feriado');

export const quitarFeriado = async (fecha) =>
  exigir(await supabase.from('feriados').delete().eq('fecha', fecha), 'quitar feriado');

export const crearBloqueo = ({ inicio, fin, motivo }) => agenda('crear_bloqueo', { inicio, fin, motivo });

export const quitarBloqueo = (id) => agenda('quitar_bloqueo', { id });

// 4b. COMENTARIOS SOBRE EL SISTEMA (software verde, RNF-VERDE-13)
export const CATEGORIAS_COMENTARIO = {
  rendimiento: 'Rendimiento o lentitud',
  uso: 'Uso o facilidad',
  sostenibilidad: 'Consumo de datos o energía',
  otro: 'Otro'
};

const sinTablaComentarios = (err) => err?.code === '42P01' || err?.code === 'PGRST205';

/** Guarda un comentario del personal. Sin .select(): solo el doctor puede leerlos (RLS). */
export const enviarComentario = async ({ categoria, texto }) => {
  const limpio = String(texto || '').trim();
  if (limpio.length < 3) throw new Error('Escribe tu comentario.');
  if (!CATEGORIAS_COMENTARIO[categoria]) throw new Error('Elige una categoría.');
  const { error } = await supabase.from('comentarios_sistema').insert({ categoria, texto: limpio });
  if (sinTablaComentarios(error)) throw new Error('Los comentarios aún no están habilitados en la base de datos.', { cause: error });
  if (error) throw dbError(error, 'guardar comentario');
};

/** Últimos comentarios (solo el doctor). */
export const getComentarios = async ({ limite = 100 } = {}) => {
  const { data, error } = await supabase.from('comentarios_sistema')
    .select('id, created_at, autor, categoria, texto')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (sinTablaComentarios(error)) return [];
  if (error) throw dbError(error, 'leer comentarios');
  return data || [];
};

// 5. USUARIOS (solo el doctor: RLS)
/**
 * Últimos cambios registrados por los triggers de auditoría (solo el doctor: RLS).
 * No trae datos_antes/datos_despues: la revisión periódica solo necesita quién,
 * cuándo y qué campos cambiaron, sin mostrar el contenido (p. ej. recetas).
 */
export const getAuditoria = async ({ tabla = '', desde = null, limite = 200 } = {}) => {
  let q = supabase.from('auditoria')
    .select('id, created_at, tabla, operacion, registro_id, origen, usuario, aplicacion, campos_modificados')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (tabla) q = q.eq('tabla', tabla);
  if (desde) q = q.gte('created_at', desde);
  return exigir(await q, 'leer auditoría') || [];
};

export const getUsuarios = async () =>
  exigir(await supabase.from('usuarios_autorizados').select('*').order('rol').order('email'), 'leer usuarios') || [];

export const crearUsuario = async ({ email, nombre, rol }) => {
  const correo = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error('Ingresa un correo válido.');
  return exigir(
    await supabase.from('usuarios_autorizados').insert({ email: correo, nombre: String(nombre || '').trim() || null, rol }).select().single(),
    'crear usuario'
  );
};

export const actualizarUsuario = async (email, cambios) => {
  const fila = {};
  if ('nombre' in cambios) fila.nombre = String(cambios.nombre || '').trim() || null;
  if ('rol' in cambios) fila.rol = cambios.rol;
  if ('activo' in cambios) fila.activo = !!cambios.activo;
  return exigir(
    await supabase.from('usuarios_autorizados').update(fila).eq('email', email).select().single(),
    'actualizar usuario'
  );
};
