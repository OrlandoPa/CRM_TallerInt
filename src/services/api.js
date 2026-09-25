import { createClient } from '@supabase/supabase-js';
import { ESTADOS_CITA } from '../utils/estadosCita.js';
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

// Helper to check and get Google Calendar access token
export const getGCalToken = () => {
  const token = localStorage.getItem('gcal_access_token');
  const expiry = localStorage.getItem('gcal_token_expiry');
  if (token && expiry && Date.now() < parseInt(expiry)) {
    return token;
  }
  // Clear expired token
  if (token) {
    localStorage.removeItem('gcal_access_token');
    localStorage.removeItem('gcal_token_expiry');
  }
  return null;
};

// Get configured calendar ID
const getCalendarId = () => {
  return import.meta.env.VITE_CALENDAR_ID || 'primary';
};

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
// Regla general: cualquier error de Supabase o Google Calendar se propaga a la UI.

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3/calendars';

const gcalEventsUrl = (eventId = '') => {
  const cal = encodeURIComponent(getCalendarId());
  return `${GCAL_BASE}/${cal}/events${eventId ? `/${encodeURIComponent(eventId)}` : ''}`;
};

const requireGCalToken = () => {
  const token = getGCalToken();
  if (!token) {
    throw new Error('Google Calendar no está conectado. Usa "Reconectar" e inténtalo de nuevo.');
  }
  return token;
};

const gcalError = async (response, action) => {
  if (response.status === 401) {
    localStorage.removeItem('gcal_access_token');
    localStorage.removeItem('gcal_token_expiry');
    return new Error(`La sesión de Google Calendar expiró (${action}). Reconecta y vuelve a intentarlo.`);
  }
  let detail = response.statusText;
  try {
    const body = await response.json();
    detail = body?.error?.message || detail;
  } catch {
    // respuesta sin JSON
  }
  return new Error(`Google Calendar (${action}): ${detail || response.status}`);
};

const dbError = (err, action) =>
  new Error(`Base de datos (${action}): ${err?.message || JSON.stringify(err)}`, { cause: err });

// Crea el paciente si no existe (evita violar la FK de citas)
const ensurePaciente = async (identificador, nombre) => {
  const { data: existing, error: selErr } = await supabase
    .from('pacientes')
    .select('identificador_paciente')
    .eq('identificador_paciente', identificador)
    .limit(1);
  if (selErr) throw dbError(selErr, 'buscar paciente');

  if (!existing || existing.length === 0) {
    const { error: insErr } = await supabase
      .from('pacientes')
      .insert({ identificador_paciente: identificador, nombre_paciente: nombre || identificador });
    if (insErr) throw dbError(insErr, 'registrar paciente');
  }
};

// 1. CRM LEADS
export const getLeads = async () => {
  const { data: pacientesData, error: crmError } = await supabase
    .from('pacientes')
    .select('*');
  if (crmError) throw dbError(crmError, 'leer pacientes');

  const { data: msgData, error: msgError } = await supabase
    .from('mensajes_whatsapp')
    .select('session_id')
    .order('id', { ascending: false });
  if (msgError) throw dbError(msgError, 'leer mensajes');

  const uniqueSessions = msgData ? [...new Set(msgData.map(m => m.session_id).filter(Boolean))] : [];

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

  uniqueSessions.forEach(session => {
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

// 2. WHATSAPP CHATS
// Note: WhatsApp message history/sending methods were removed as they are handled directly via Chatwoot embed.

// 3. GOOGLE CALENDAR APPOINTMENTS - DIRECT CLIENT API CONNECTION
export const getAppointments = async (timeMin, timeMax) => {
  const token = getGCalToken();

  if (!token) {
    // Sin conexión a Google Calendar: la UI muestra el aviso "Reconectar"
    return [];
  }

  const tMin = timeMin || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const tMax = timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    maxResults: '250',
    timeMin: tMin,
    timeMax: tMax,
    singleEvents: 'true',
    orderBy: 'startTime'
  });

  const response = await fetch(`${gcalEventsUrl()}?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw await gcalError(response, 'leer eventos');

  const data = await response.json();
  return (data.items || []).map(item => ({
    id: item.id,
    summary: item.summary || 'Cita Odontológica',
    description: item.description || '',
    start: { dateTime: item.start?.dateTime || item.start?.date },
    end: { dateTime: item.end?.dateTime || item.end?.date },
    status: item.status || 'confirmed',
    correo_electronico: item.attendees?.[0]?.email || ''
  }));
};

export const createAppointment = async (summary, start, end, description = '', phone = '', email = '', tratamiento_receta = '') => {
  const identificador = normalizarIdentificador(phone);

  if (!identificador) {
    throw new Error('Selecciona o registra al paciente (celular o usuario de WhatsApp) antes de agendar.');
  }

  // 1. Google Calendar es obligatorio: n8n consulta la disponibilidad allí
  const token = requireGCalToken();
  const eventBody = {
    summary,
    description,
    start: { dateTime: start },
    end: { dateTime: end }
  };
  if (email) {
    eventBody.attendees = [{ email }];
  }

  const response = await fetch(`${gcalEventsUrl()}${email ? '?sendUpdates=all' : ''}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventBody)
  });
  if (!response.ok) throw await gcalError(response, 'crear evento');
  const gcalEvent = await response.json();

  // 2. Registro en Supabase. Si falla, se revierte el evento para no dejar datos a medias.
  try {
    const patientName = summary.split(' - ')[0].trim() || 'Paciente WhatsApp';
    await ensurePaciente(identificador, patientName);

    const { error } = await supabase
      .from('citas')
      .insert({
        identificador_paciente: identificador,
        fecha_hora_cita: start,
        motivo_consulta: summary,
        estado_cita: ESTADOS_CITA.AGENDADA,
        google_event_id: gcalEvent.id,
        detalles_notas_cita: description || null,
        correo_electronico: email || null,
        tratamiento_receta: tratamiento_receta || null,
        recordatorio_enviado: false
      });
    if (error) throw dbError(error, 'guardar cita');
  } catch (err) {
    await fetch(gcalEventsUrl(gcalEvent.id), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {});
    throw new Error(`No se guardó la cita (se revirtió en Google Calendar). ${err.message}`, { cause: err });
  }

  return {
    id: gcalEvent.id,
    summary,
    description: description || 'Creada manualmente desde el CRM',
    start: { dateTime: start },
    end: { dateTime: end },
    status: gcalEvent.status || 'confirmed',
    correo_electronico: email || null
  };
};

export const deleteAppointment = async (eventId) => {
  // 1. Eliminar de Google Calendar (404/410 = ya no existe, se continúa)
  const token = requireGCalToken();
  const response = await fetch(gcalEventsUrl(eventId), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw await gcalError(response, 'cancelar evento');
  }

  // 2. Soft delete en Supabase
  const { error } = await supabase
    .from('citas')
    .update({ estado_cita: ESTADOS_CITA.CANCELADA, updated_at: new Date().toISOString() })
    .eq('google_event_id', eventId);
  if (error) throw dbError(error, 'cancelar cita');

  return true;
};

// 4. SUPABASE CUSTOM CLINIC TABLES
export const getPacientes = async () => {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*');
  if (error) throw dbError(error, 'leer pacientes');
  return data || [];
};

export const getCitasDb = async () => {
  const { data, error } = await supabase
    .from('citas')
    .select('*, pacientes(*)')
    .order('fecha_hora_cita', { ascending: true });
  if (error) throw dbError(error, 'leer citas');
  return data || [];
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

// Busca el identificador real del paciente de una cita que solo existe en Google Calendar
const resolvePacienteIdentificador = async (appObj, rawId) => {
  const direct = appObj?.identificador_paciente
    || appObj?.telefono_paciente
    || appObj?.phone_number
    || appObj?.pacientes?.identificador_paciente
    || (rawId && /^\+?[\d\s-]{7,}$/.test(rawId) ? rawId : null);
  if (direct) return normalizarIdentificador(direct);

  if (appObj) {
    const text = `${appObj.description || ''} ${appObj.summary || ''} ${appObj.motivo_consulta || ''} ${appObj.detalles_notas_cita || ''}`;
    const phoneMatch = text.match(/\+?\d[\d\s-]{6,16}\d/);
    if (phoneMatch) return normalizarIdentificador(phoneMatch[0]);
  }

  // Coincidencia EXACTA por nombre (nunca parcial, para no asignar la cita a otra persona)
  const patientName = appObj?.pacientes?.nombre_paciente
    || (appObj?.summary ? appObj.summary.split(' - ')[0].trim() : '');
  if (patientName && !['Paciente', 'Paciente GCal', 'Paciente sin nombre'].includes(patientName)) {
    const { data, error } = await supabase
      .from('pacientes')
      .select('identificador_paciente')
      .ilike('nombre_paciente', patientName)
      .limit(2);
    if (error) throw dbError(error, 'buscar paciente por nombre');
    if (data && data.length === 1) return data[0].identificador_paciente;
  }

  return null;
};

export const updateAppointmentPrescription = async (citaObjOrId, tratamientoReceta) => {
  const appObj = typeof citaObjOrId === 'object' && citaObjOrId !== null ? citaObjOrId : null;
  const rawId = typeof citaObjOrId === 'string' ? citaObjOrId : null;

  // Primary Key numérica de 'citas'
  const dbId = appObj?.id && /^\d+$/.test(String(appObj.id))
    ? parseInt(appObj.id, 10)
    : (typeof citaObjOrId === 'number' ? citaObjOrId : null);

  // ID real del evento de Google Calendar
  const gcalId = appObj?.google_event_id || (rawId && !/^\d+$/.test(rawId) ? rawId : null);

  const payload = { tratamiento_receta: tratamientoReceta || null, updated_at: new Date().toISOString() };

  // 1. Actualizar por id de la BD
  if (dbId) {
    const { data, error } = await supabase.from('citas').update(payload).eq('id', dbId).select();
    if (error) throw dbError(error, 'guardar tratamiento');
    if (data && data.length > 0) return data[0];
  }

  // 2. Actualizar por google_event_id
  if (gcalId) {
    const { data, error } = await supabase.from('citas').update(payload).eq('google_event_id', gcalId).select();
    if (error) throw dbError(error, 'guardar tratamiento');
    if (data && data.length > 0) return data[0];
  }

  // 3. La cita solo existe en Google Calendar: se registra en la BD, pero solo si
  //    se identifica al paciente con certeza y el evento es real.
  if (!gcalId) {
    throw new Error('La cita no tiene un evento válido de Google Calendar; no se puede registrar.');
  }
  const identificador = await resolvePacienteIdentificador(appObj, rawId);
  if (!identificador) {
    throw new Error('No se pudo identificar al paciente de esta cita. Agrega su celular en la descripción del evento o regístrala desde el CRM.');
  }

  const patientName = appObj?.pacientes?.nombre_paciente
    || (appObj?.summary ? appObj.summary.split(' - ')[0].trim() : '')
    || identificador;
  await ensurePaciente(identificador, patientName);

  const fechaRaw = appObj?.fecha_hora_cita || appObj?.start?.dateTime;
  if (!fechaRaw || isNaN(new Date(fechaRaw).getTime())) {
    throw new Error('La cita no tiene una fecha válida.');
  }

  const { data, error } = await supabase
    .from('citas')
    .insert({
      identificador_paciente: identificador,
      fecha_hora_cita: new Date(fechaRaw).toISOString(),
      motivo_consulta: appObj?.motivo_consulta || appObj?.summary || 'Consulta Médica',
      estado_cita: appObj?.estado_cita || ESTADOS_CITA.AGENDADA,
      google_event_id: gcalId,
      detalles_notas_cita: appObj?.detalles_notas_cita || appObj?.description || null,
      correo_electronico: appObj?.correo_electronico || null,
      tratamiento_receta: tratamientoReceta || null,
      recordatorio_enviado: false
    })
    .select();
  if (error) throw dbError(error, 'registrar cita con tratamiento');
  return data?.[0];
};

export const rescheduleAppointment = async (eventId, start, end) => {
  // 1. Google Calendar (PATCH solo cambia las fechas)
  const token = requireGCalToken();
  const response = await fetch(gcalEventsUrl(eventId), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ start: { dateTime: start }, end: { dateTime: end } })
  });
  if (!response.ok) {
    if (response.status === 404 || response.status === 410) {
      throw new Error('El evento ya no existe en Google Calendar. Cancela esta cita y agenda una nueva.');
    }
    throw await gcalError(response, 'reprogramar evento');
  }

  // 2. Supabase: mismo estado que usa n8n y se reactiva el recordatorio para la nueva fecha
  const { data, error } = await supabase
    .from('citas')
    .update({
      fecha_hora_cita: start,
      estado_cita: ESTADOS_CITA.REPROGRAMADA,
      recordatorio_enviado: false,
      updated_at: new Date().toISOString()
    })
    .eq('google_event_id', eventId)
    .select();
  if (error) throw dbError(error, 'reprogramar cita');
  return data?.[0];
};
