import { createClient } from '@supabase/supabase-js';
import { mockState } from './mockData.js';

// Load Supabase credentials dynamically (prioritizing localStorage settings)
const getSupabaseCredentials = () => {
  const url = localStorage.getItem('crm_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
  const key = localStorage.getItem('crm_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url: url.trim(), key: key.trim() };
};

const creds = getSupabaseCredentials();

// Initialize Supabase Client
export const supabase = (creds.url && creds.key) 
  ? createClient(creds.url, creds.key) 
  : null;

console.log('Supabase Connection Status:', supabase ? 'Configured dynamically' : 'Using Mock Data (no credentials)');

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

// Get configured calendar ID from localStorage
const getCalendarId = () => {
  return localStorage.getItem('crm_calendar_id') || import.meta.env.VITE_CALENDAR_ID || 'primary';
};

// Helper to parse Chatwoot configuration and extract Account ID from full URLs
export const getChatwootConfig = () => {
  const accountVal = localStorage.getItem('crm_chatwoot_account_id') || import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '';
  const token = localStorage.getItem('crm_chatwoot_access_token') || import.meta.env.VITE_CHATWOOT_ACCESS_TOKEN || '';
  const baseUrl = localStorage.getItem('crm_chatwoot_base_url') || import.meta.env.VITE_CHATWOOT_BASE_URL || 'https://app.chatwoot.com';
  
  if (!accountVal) return null;
  
  // Extract number if they paste the full URL (e.g., https://app.chatwoot.com/app/accounts/164153/)
  let accountId = accountVal.trim();
  const match = accountId.match(/accounts\/(\d+)/);
  if (match) {
    accountId = match[1];
  }
  
  return {
    accountId,
    token: token.trim(),
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

// 1. CRM LEADS
export const getLeads = async () => {
  if (supabase) {
    try {
      const { data: pacientesData, error: crmError } = await supabase
        .from('pacientes')
        .select('*');
        
      if (crmError) throw crmError;
      
      const { data: msgData, error: msgError } = await supabase
        .from('mensajes_whatsapp')
        .select('session_id')
        .order('id', { ascending: false });
        
      if (msgError) throw msgError;
      
      const uniquePhones = msgData ? [...new Set(msgData.map(m => m.session_id).filter(Boolean))] : [];
      
      const leadsMap = new Map();
      if (pacientesData) {
        pacientesData.forEach(p => {
          if (p.telefono_whatsapp) {
            leadsMap.set(p.telefono_whatsapp.replace(/[\s\-+]/g, ''), {
              phone_number: p.telefono_whatsapp,
              client_name: p.nombre_paciente || 'Paciente sin nombre',
              client_email: '',
              status: 'contacted',
              internal_notes: 'Paciente registrado en la base de datos.',
              created_at: p.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        });
      }
      
      uniquePhones.forEach(phone => {
        const cleanPhone = phone.replace(/[\s\-+]/g, '');
        if (!leadsMap.has(cleanPhone)) {
          leadsMap.set(cleanPhone, {
            phone_number: phone,
            client_name: `WhatsApp Lead (${phone.slice(-4)})`,
            client_email: '',
            status: 'lead',
            internal_notes: 'Nuevo contacto detectado en WhatsApp.',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });
      
      const mergedLeads = Array.from(leadsMap.values());
      return mergedLeads;
    } catch (err) {
      console.error('Error fetching leads from Supabase, using mock:', err);
    }
  }
  
  await new Promise(r => setTimeout(r, 400));
  return mockState.leads;
};

export const updateLead = async (lead) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .upsert({
          telefono_whatsapp: lead.phone_number,
          nombre_paciente: lead.client_name
        })
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        return {
          phone_number: data[0].telefono_whatsapp,
          client_name: data[0].nombre_paciente,
          client_email: lead.client_email || '',
          status: lead.status || 'contacted',
          internal_notes: lead.internal_notes || '',
          updated_at: new Date().toISOString()
        };
      }
    } catch (err) {
      console.error('Error updating patient in Supabase:', err);
    }
  }
  
  mockState.leads = mockState.leads.map(l => 
    l.phone_number === lead.phone_number 
      ? { ...l, ...lead, updated_at: new Date().toISOString() } 
      : l
  );
  return lead;
};

// 2. WHATSAPP CHATS
// Note: WhatsApp message history/sending methods were removed as they are handled directly via Chatwoot embed.

// 3. GOOGLE CALENDAR APPOINTMENTS - DIRECT CLIENT API CONNECTION
export const getAppointments = async (timeMin, timeMax) => {
  const token = getGCalToken();
  const calendarId = getCalendarId();

  if (token) {
    try {
      const cal = encodeURIComponent(calendarId);
      const tMin = timeMin || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const tMax = timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${cal}/events?maxResults=100&timeMin=${tMin}&timeMax=${tMax}&singleEvents=true&orderBy=startTime`, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('gcal_access_token');
          localStorage.removeItem('gcal_token_expiry');
        }
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }
      
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
    } catch (err) {
      console.error('Error fetching direct appointments from Google Calendar, using mock:', err);
    }
  }
  
  await new Promise(r => setTimeout(r, 450));
  return mockState.appointments;
};

export const createAppointment = async (summary, start, end, description = '', phone = '', email = '') => {
  const token = getGCalToken();
  const calendarId = getCalendarId();
  let gcalEventId = null;
  let gcalStatus = 'confirmed';

  if (token) {
    try {
      const cal = encodeURIComponent(calendarId);
      const url = `https://www.googleapis.com/calendar/v3/calendars/${cal}/events${email ? '?sendUpdates=all' : ''}`;
      
      const eventBody = {
        summary: summary,
        description: description,
        start: { dateTime: start },
        end: { dateTime: end }
      };

      if (email) {
        eventBody.attendees = [{ email: email }];
      }

      const response = await fetch(
        url, 
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventBody)
        }
      );
      
      if (!response.ok) throw new Error(`Google Calendar creation error: ${response.statusText}`);
      const data = await response.json();
      gcalEventId = data.id;
      gcalStatus = data.status || 'confirmed';
    } catch (err) {
      console.error('Error creating direct appointment in Google Calendar, using mock:', err);
    }
  }

  if (!gcalEventId) {
    gcalEventId = `gcal-event-${Date.now()}`;
  }

  // Sync to Supabase Table 'citas'
  if (supabase) {
    try {
      // Ensure patient exists in 'pacientes' table if phone is provided to avoid Foreign Key violations
      if (phone) {
        const { data: existingPatient } = await supabase
          .from('pacientes')
          .select('telefono_whatsapp')
          .eq('telefono_whatsapp', phone);
          
        if (!existingPatient || existingPatient.length === 0) {
          const patientName = summary.split(' - ')[0] || 'Paciente WhatsApp';
          await supabase
            .from('pacientes')
            .insert({
              telefono_whatsapp: phone,
              nombre_paciente: patientName
            });
        }
      }

      const { error } = await supabase
        .from('citas')
        .insert({
          telefono_paciente: phone || null,
          fecha_hora_cita: start,
          motivo_consulta: summary,
          estado_cita: 'AGENDADA',
          google_event_id: gcalEventId,
          detalles_notas_cita: description || null,
          correo_electronico: email || null
        });
        
      if (error) throw error;
    } catch (err) {
      console.error('Error inserting appointment into Supabase:', err);
      throw new Error(`Cita en Google Calendar OK, pero falló guardar en Base de Datos: ${err.message || JSON.stringify(err)}`, { cause: err });
    }
  }
  
  const newAppointment = {
    id: gcalEventId,
    summary: summary,
    description: description || 'Creada manualmente desde el CRM',
    start: { dateTime: start },
    end: { dateTime: end },
    status: gcalStatus,
    correo_electronico: email || null
  };
  
  mockState.appointments.push(newAppointment);
  return newAppointment;
};

export const deleteAppointment = async (eventId) => {
  const token = getGCalToken();
  const calendarId = getCalendarId();

  // 1. Delete from Google Calendar
  if (token) {
    try {
      const cal = encodeURIComponent(calendarId);
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${cal}/events/${eventId}`, 
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`Google Calendar delete error: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error deleting direct appointment in Google Calendar:', err);
    }
  }

  // 2. Sync status update in Supabase Table 'citas'
  if (supabase) {
    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado_cita: 'CANCELADA' })
        .eq('google_event_id', eventId);
        
      if (error) throw error;
    } catch (err) {
      console.error('Error updating appointment status to CANCELADA in Supabase:', err);
    }
  }
  
  mockState.appointments = mockState.appointments.filter(app => app.id !== eventId);
  return true;
};

// 4. SUPABASE CUSTOM CLINIC TABLES
export const getPacientes = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching patients from Supabase:', err);
      return [];
    }
  }
  // Off-line mock simulation matching the active design
  return [
    { telefono_whatsapp: '+51 987 654 321', nombre_paciente: 'Juan Pérez', created_at: new Date().toISOString() },
    { telefono_whatsapp: '+51 912 345 678', nombre_paciente: 'María Rodríguez', created_at: new Date().toISOString() },
    { telefono_whatsapp: '+51 955 667 788', nombre_paciente: 'Carlos Mendoza', created_at: new Date().toISOString() }
  ];
};

export const getCitasDb = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('citas')
        .select('*, pacientes(nombre_paciente)')
        .order('fecha_hora_cita', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching appointments from Supabase:', err);
      return [];
    }
  }
  // Off-line mock simulation matching the active design
  return [
    {
      id: 101,
      telefono_paciente: '+51 987 654 321',
      fecha_hora_cita: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      motivo_consulta: 'Evaluación y limpieza profunda',
      estado_cita: 'AGENDADA',
      detalles_notas_cita: 'Paciente reporta sangrado leve de encías.',
      pacientes: { nombre_paciente: 'Juan Pérez' }
    },
    {
      id: 102,
      telefono_paciente: '+51 955 667 788',
      fecha_hora_cita: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      motivo_consulta: 'Revisión mensual de Ortodoncia',
      estado_cita: 'AGENDADA',
      detalles_notas_cita: 'Ajuste de brackets superior e inferior.',
      pacientes: { nombre_paciente: 'Carlos Mendoza' }
    }
  ];
};

export const updateAppointmentStatus = async (googleEventId, status) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('citas')
        .update({ estado_cita: status })
        .eq('google_event_id', googleEventId)
        .select();
        
      if (error) throw error;
      return data[0];
    } catch (err) {
      console.error('Error updating appointment status in Supabase:', err);
      throw err;
    }
  }
  
  // Offline simulation fallback
  mockState.appointments = mockState.appointments.map(app => 
    app.id === googleEventId ? { ...app, status: status.toLowerCase() } : app
  );
  return { google_event_id: googleEventId, estado_cita: status };
};

export const rescheduleAppointment = async (eventId, start, end) => {
  const token = getGCalToken();
  const calendarId = getCalendarId();

  // 1. Google Calendar update
  if (token) {
    try {
      const cal = encodeURIComponent(calendarId);
      const getResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${cal}/events/${eventId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (getResponse.ok) {
        const event = await getResponse.json();
        event.start = { dateTime: start };
        event.end = { dateTime: end };

        const putResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${cal}/events/${eventId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
          }
        );
        if (!putResponse.ok) throw new Error(`Google Calendar PUT error: ${putResponse.statusText}`);
      } else {
        throw new Error(`Google Calendar GET error: ${getResponse.statusText}`);
      }
    } catch (err) {
      console.error('Error rescheduling appointment in Google Calendar:', err);
    }
  }

  // 2. Supabase DB update
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('citas')
        .update({ 
          fecha_hora_cita: start,
          estado_cita: 'AGENDADA' // Reset status on reschedule
        })
        .eq('google_event_id', eventId)
        .select();
        
      if (error) throw error;
      return data[0];
    } catch (err) {
      console.error('Error rescheduling appointment in Supabase:', err);
      throw err;
    }
  }

  // Offline simulation fallback
  mockState.appointments = mockState.appointments.map(app => 
    app.id === eventId ? { ...app, start: { dateTime: start }, end: { dateTime: end } } : app
  );
  return { google_event_id: eventId, fecha_hora_cita: start };
};
