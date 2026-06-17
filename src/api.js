import { createClient } from '@supabase/supabase-js';

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

// Look up a conversation ID in Chatwoot using a client's phone number
export const getChatwootConversationIdByPhone = async (phone) => {
  const config = getChatwootConfig();
  if (!config || !config.token) return null;
  
  try {
    // Format phone: remove spaces to improve search matching
    const cleanPhone = phone.replace(/[\s\-\+]/g, '');
    const searchUrl = `${config.baseUrl}/api/v1/accounts/${config.accountId}/contacts/search?q=${encodeURIComponent(cleanPhone)}`;
    const response = await fetch(searchUrl, {
      headers: { 'api_access_token': config.token }
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    const contact = data.payload?.[0];
    if (!contact) return null;
    
    // Fetch conversations for this contact
    const convUrl = `${config.baseUrl}/api/v1/accounts/${config.accountId}/contacts/${contact.id}/conversations`;
    const convResponse = await fetch(convUrl, {
      headers: { 'api_access_token': config.token }
    });
    
    if (!convResponse.ok) return null;
    const convData = await convResponse.json();
    return convData.payload?.[0]?.id || null;
  } catch (err) {
    console.error('Error finding Chatwoot conversation by phone:', err);
    return null;
  }
};

// --- HIGH FIDELITY MOCK DATA ---
const mockLeads = [
  {
    phone_number: '+51 987 654 321',
    client_name: 'Juan Pérez',
    client_email: 'juan.perez@gmail.com',
    status: 'scheduled',
    internal_notes: 'Paciente requiere endodoncia en el molar inferior derecho. Tiene dolor moderado.',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    phone_number: '+51 912 345 678',
    client_name: 'María Rodríguez',
    client_email: 'maria.rod@outlook.com',
    status: 'lead',
    internal_notes: 'Preguntó por blanqueamiento dental. Le interesa el horario de la tarde.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    phone_number: '+51 955 667 788',
    client_name: 'Carlos Mendoza',
    client_email: 'carlos.mendoza@yahoo.com',
    status: 'contacted',
    internal_notes: 'Solicitó información sobre ortodoncia y facilidades de pago. Prefiere pagar con Yape.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    phone_number: '+51 933 445 566',
    client_name: 'Sofía Luján',
    client_email: 'sofia.lujan@gmail.com',
    status: 'completed',
    internal_notes: 'Se le realizó una curación simple de 30 minutos. Todo conforme.',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    phone_number: '+51 922 883 377',
    client_name: 'Diego Torres',
    client_email: 'diegotorres@hotmail.com',
    status: 'lost',
    internal_notes: 'Preguntó por cirugías de cordales pero indicó que el horario se le cruzaba con su trabajo.',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const mockChats = {
  '+51 987 654 321': [
    { id: 1, sender: 'client', content: 'Hola, buenas tardes. Quisiera agendar una cita por favor.', timestamp: '2026-05-20T14:30:00Z', sender_type: 'human' },
    { id: 2, sender: 'bot', content: '¡Hola! Qué gusto saludarte. Soy el asistente virtual de la clínica odontológica. Claro que sí, con mucho gusto te ayudo a agendar tu cita. ¿Para qué fecha deseas tu cita?', timestamp: '2026-05-20T14:30:05Z', sender_type: 'agente_proceso' },
    { id: 3, sender: 'client', content: 'Me gustaría para el viernes 22 de mayo en la tarde.', timestamp: '2026-05-20T14:32:00Z', sender_type: 'human' },
    { id: 4, sender: 'bot', content: 'Perfecto, entiendo que deseas agendar para el viernes 22 de mayo en el turno de la tarde (4:00 PM a 8:00 PM). Déjame revisar la disponibilidad... Tengo libre a las 5:00 PM y a las 6:30 PM. ¿Alguno de estos horarios te acomoda?', timestamp: '2026-05-20T14:32:15Z', sender_type: 'agente_maestro_citas' },
    { id: 5, sender: 'client', content: 'A las 5:00 PM está perfecto. Mi nombre es Juan Pérez y el motivo es por dolor de muelas.', timestamp: '2026-05-20T14:33:00Z', sender_type: 'human' },
    { id: 6, sender: 'bot', content: '¡Excelente, Juan! He agendado tu cita de evaluación para el viernes 22 de mayo a las 5:00 PM. La duración estimada es de 1 hora. Te esperamos en la clínica. Recuerda que los pagos se realizan mediante Yape o efectivo. ¡Que tengas un gran día!', timestamp: '2026-05-20T14:33:10Z', sender_type: 'agente_maestro_citas' }
  ],
  '+51 912 345 678': [
    { id: 1, sender: 'client', content: 'Hola, quería consultar cuánto cuesta el blanqueamiento dental y cuánto demora.', timestamp: '2026-05-20T15:00:00Z', sender_type: 'human' },
    { id: 2, sender: 'bot', content: '¡Hola! Qué gusto saludarte. Te comento que el blanqueamiento dental en nuestra clínica tiene una duración aproximada de entre 30 y 45 minutos. Con respecto al costo, nunca proporcionamos montos específicos por este medio, ya que el precio de cualquier tratamiento es manejado y determinado exclusivamente por el doctor tras una evaluación clínica. ¿Te gustaría que te agende una cita de evaluación gratuita para revisar tu caso?', timestamp: '2026-05-20T15:00:12Z', sender_type: 'agente_faq' },
    { id: 3, sender: 'client', content: 'Ah entiendo. ¿Y atienen los sábados?', timestamp: '2026-05-20T15:02:00Z', sender_type: 'human' }
  ],
  '+51 955 667 788': [
    { id: 1, sender: 'client', content: 'Hola, hacen ortodoncia? Y se puede pagar en cuotas?', timestamp: '2026-05-19T10:15:00Z', sender_type: 'human' },
    { id: 2, sender: 'bot', content: '¡Hola! Sí, realizamos tratamientos de Ortodoncia en la clínica. Respecto al costo y las facilidades de pago en cuotas, el doctor debe realizarte primero una evaluación clínica completa para determinar tu diagnóstico y el plan de tratamiento adecuado. Una vez establecido esto, se coordinan las opciones de pago (aceptamos Yape y efectivo). ¿Te gustaría agendar una cita de evaluación para esta semana?', timestamp: '2026-05-19T10:15:20Z', sender_type: 'agente_faq' },
    { id: 3, sender: 'client', content: 'Sí, por favor, pero me gustaría saber si atienden a partir de las 6 pm.', timestamp: '2026-05-19T10:18:00Z', sender_type: 'human' },
    { id: 4, sender: 'bot', content: '¡Por supuesto! Nuestro horario de atención en las tardes es de 4:00 PM a 8:00 PM, así que con gusto podemos programarte a las 6:00 PM o más tarde. ¿Qué día te convendría más?', timestamp: '2026-05-19T10:18:15Z', sender_type: 'agente_maestro_citas' }
  ],
  '+51 933 445 566': [
    { id: 1, sender: 'client', content: 'Hola, tengo una curación pendiente, ¿me pueden agendar?', timestamp: '2026-05-18T09:00:00Z', sender_type: 'human' },
    { id: 2, sender: 'bot', content: '¡Hola! Claro que sí, con mucho gusto te ayudo a agendar tu cita para tu curación. ¿Para qué fecha deseas la cita?', timestamp: '2026-05-18T09:00:10Z', sender_type: 'agente_proceso' },
    { id: 3, sender: 'client', content: 'Para hoy mismo de ser posible a las 11 am.', timestamp: '2026-05-18T09:02:00Z', sender_type: 'human' },
    { id: 4, sender: 'bot', content: 'Déjame revisar la disponibilidad en el calendario... Sí, tengo disponible a las 11:00 AM. Procedo a agendar tu cita para curación simple a las 11:00 AM a nombre de Sofía Luján. ¡Confirmado!', timestamp: '2026-05-18T09:02:22Z', sender_type: 'agente_maestro_citas' }
  ],
  '+51 922 883 377': [
    { id: 1, sender: 'client', content: 'Buenas noches, sacan muelas del juicio?', timestamp: '2026-05-17T20:45:00Z', sender_type: 'human' },
    { id: 2, sender: 'bot', content: '¡Hola! Sí, en la clínica realizamos cirugías de cordales (muelas del juicio). Para poder indicarte los detalles y programarte, el doctor debe hacerte una evaluación. ¿Te gustaría agendar una cita de evaluación?', timestamp: '2026-05-17T20:45:15Z', sender_type: 'agente_faq' },
    { id: 3, sender: 'client', content: 'El problema es que yo solo puedo los domingos.', timestamp: '2026-05-17T20:50:00Z', sender_type: 'human' },
    { id: 4, sender: 'bot', content: 'Comprendo. Lamentablemente, nuestro horario de atención es exclusivamente de lunes a sábado en los turnos de 10:00 AM a 1:00 PM y de 4:00 PM a 8:00 PM. No abrimos los domingos. Si en algún momento tienes disponibilidad en la semana, no dudes en escribirnos.', timestamp: '2026-05-17T20:50:35Z', sender_type: 'agente_faq' }
  ]
};

const mockAppointments = [
  {
    id: 'gcal-event-1',
    summary: 'Juan Pérez - Evaluación Endodoncia',
    description: 'Cita agendada desde CRM WhatsApp (+51 987 654 321)',
    start: { dateTime: '2026-05-22T17:00:00-05:00' },
    end: { dateTime: '2026-05-22T18:00:00-05:00' },
    status: 'confirmed'
  },
  {
    id: 'gcal-event-2',
    summary: 'Carlos Mendoza - Evaluación Ortodoncia',
    description: 'Cita agendada desde CRM WhatsApp (+51 955 667 788)',
    start: { dateTime: '2026-05-23T18:00:00-05:00' },
    end: { dateTime: '2026-05-23T19:00:00-05:00' },
    status: 'confirmed'
  },
  {
    id: 'gcal-event-3',
    summary: 'Sofía Luján - Curación Simple',
    description: 'Cita agendada desde CRM WhatsApp (+51 933 445 566)',
    start: { dateTime: '2026-05-18T11:00:00-05:00' },
    end: { dateTime: '2026-05-18T11:30:00-05:00' },
    status: 'confirmed'
  }
];

// Memory state for mockup
let stateLeads = [...mockLeads];
let stateChats = { ...mockChats };
let stateAppointments = [...mockAppointments];

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
            leadsMap.set(p.telefono_whatsapp.replace(/[\s\-\+]/g, ''), {
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
        const cleanPhone = phone.replace(/[\s\-\+]/g, '');
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
  return stateLeads;
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
  
  stateLeads = stateLeads.map(l => 
    l.phone_number === lead.phone_number 
      ? { ...l, ...lead, updated_at: new Date().toISOString() } 
      : l
  );
  return lead;
};

// 2. WHATSAPP CHATS
export const getChatHistory = async (phoneNumber, conversationId = null) => {
  const config = getChatwootConfig();
  
  // Try fetching directly from Chatwoot API if credentials are provided
  if (config && config.token) {
    try {
      let convId = conversationId;
      if (!convId) {
        convId = await getChatwootConversationIdByPhone(phoneNumber);
      }
      
      if (convId) {
        const msgUrl = `${config.baseUrl}/api/v1/accounts/${config.accountId}/conversations/${convId}/messages`;
        const response = await fetch(msgUrl, {
          headers: { 'api_access_token': config.token }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Map Chatwoot messages to CRM chat format
          return (data.payload || []).map(row => {
            const isClient = row.message_type === 0;
            return {
              id: row.id,
              sender: isClient ? 'client' : 'bot',
              content: row.content,
              timestamp: row.created_at || new Date().toISOString(),
              sender_type: row.sender?.name || (isClient ? 'Cliente' : 'Agente')
            };
          }).reverse(); // Chronological order
        }
      }
    } catch (err) {
      console.error('Error fetching chat history from Chatwoot API, using fallback:', err);
    }
  }

  // Fallback to Supabase Database
  if (supabase) {
    try {
      const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');
      const { data, error } = await supabase
        .from('mensajes_whatsapp')
        .select('*')
        .or(`session_id.eq.${phoneNumber},session_id.eq.${cleanPhone},session_id.eq.+${cleanPhone}`);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Sort ascending by ID or Date to make sure they display in correct order
        const sortedData = [...data].sort((a, b) => a.id - b.id);
        return sortedData.map(row => {
          let msgObj = {};
          try {
            msgObj = typeof row.message === 'string' ? JSON.parse(row.message) : row.message;
          } catch(e) {
            msgObj = { data: { content: row.message } };
          }
          
          const type = msgObj.type;
          const content = msgObj.data?.content || row.message;
          const senderType = msgObj.data?.additional_kwargs?.agent_name || (type === 'human' ? 'human' : 'bot');
          
          return {
            id: row.id,
            sender: type === 'human' ? 'client' : 'bot',
            content: content,
            timestamp: row.created_at || new Date().toISOString(),
            sender_type: senderType
          };
        });
      }
    } catch (err) {
      console.error('Error fetching chat history from Supabase, using mock:', err);
    }
  }
  
  await new Promise(r => setTimeout(r, 200));
  // Clean phone matching for mock key lookup
  const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');
  const mockKey = Object.keys(stateChats).find(k => k.replace(/[\s\-\+]/g, '') === cleanPhone);
  if (mockKey) {
    return stateChats[mockKey];
  }
  return stateChats[phoneNumber] || [];
};

export const sendWhatsAppMessage = async (phoneNumber, content, conversationId = null) => {
  const config = getChatwootConfig();

  // Try sending directly through Chatwoot API if credentials are provided
  if (config && config.token) {
    try {
      let convId = conversationId;
      if (!convId) {
        convId = await getChatwootConversationIdByPhone(phoneNumber);
      }
      
      if (convId) {
        const msgUrl = `${config.baseUrl}/api/v1/accounts/${config.accountId}/conversations/${convId}/messages`;
        const response = await fetch(msgUrl, {
          method: 'POST',
          headers: { 
            'api_access_token': config.token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: content,
            message_type: 'outgoing'
          })
        });
        
        if (response.ok) {
          return true;
        }
      }
    } catch (err) {
      console.error('Error sending message via Chatwoot API, using fallback:', err);
    }
  }

  // Fallback to Supabase Database
  if (supabase) {
    try {
      const messagePayload = {
        type: "ai", 
        data: {
          content: content,
          additional_kwargs: { agent_name: "Soporte Humano (CRM)" }
        }
      };
      
      await supabase
        .from('mensajes_whatsapp')
        .insert({
          session_id: phoneNumber,
          message: JSON.stringify(messagePayload),
          created_at: new Date().toISOString()
        });
    } catch (err) {
      console.error('Error logging human message to Supabase:', err);
    }
  }

  // Local simulator update
  if (!stateChats[phoneNumber]) {
    stateChats[phoneNumber] = [];
  }
  const newMsg = {
    id: Date.now(),
    sender: 'bot',
    content: content,
    timestamp: new Date().toISOString(),
    sender_type: 'Soporte Humano'
  };
  stateChats[phoneNumber].push(newMsg);
  return true;
};

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
  return stateAppointments;
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

      const { data, error } = await supabase
        .from('citas')
        .insert({
          telefono_paciente: phone || null,
          fecha_hora_cita: start,
          motivo_consulta: summary,
          estado_cita: 'AGENDADA',
          google_event_id: gcalEventId,
          detalles_notas_cita: description || null,
          correo_electronico: email || null
        })
        .select();
        
      if (error) throw error;
    } catch (err) {
      console.error('Error inserting appointment into Supabase:', err);
      throw new Error(`Cita en Google Calendar OK, pero falló guardar en Base de Datos: ${err.message || JSON.stringify(err)}`);
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
  
  stateAppointments.push(newAppointment);
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
  
  stateAppointments = stateAppointments.filter(app => app.id !== eventId);
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
  stateAppointments = stateAppointments.map(app => 
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
  stateAppointments = stateAppointments.map(app => 
    app.id === eventId ? { ...app, start: { dateTime: start }, end: { dateTime: end } } : app
  );
  return { google_event_id: eventId, fecha_hora_cita: start };
};
