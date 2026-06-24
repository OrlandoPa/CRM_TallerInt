import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Calendar as CalendarIcon, 
  Settings, 
  Search, 
  Plus, 
  Trash, 
  Check, 
  Clock, 
  ArrowUpRight, 
  AlertCircle, 
  Database, 
  Link2, 
  User, 
  Mail, 
  FileText, 
  Sun, 
  Moon, 
  Send, 
  Phone,
  MessageCircle,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LogIn,
  LogOut,
  Clock3
} from 'lucide-react';
import * as api from './api';

const getPeruHolidays = (year) => {
  return [
    `${year}-01-01`, // Año Nuevo
    `${year}-05-01`, // Día del Trabajo
    `${year}-06-07`, // Batalla de Arica
    `${year}-06-29`, // San Pedro y San Pablo
    `${year}-07-23`, // Fuerza Aérea
    `${year}-07-28`, // Fiestas Patrias
    `${year}-07-29`, // Fiestas Patrias
    `${year}-08-06`, // Batalla de Junín
    `${year}-08-30`, // Santa Rosa de Lima
    `${year}-10-08`, // Combate de Angamos
    `${year}-11-01`, // Todos los Santos
    `${year}-12-08`, // Inmaculada Concepción
    `${year}-12-09`, // Batalla de Ayacucho
    `${year}-12-25`  // Navidad
  ];
};

const isPeruHoliday = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  return getPeruHolidays(year).includes(dateStr);
};

const isValidWorkingHours = (startDate, endDate) => {
  // Check day of week (Sunday is 0)
  if (startDate.getDay() === 0 || endDate.getDay() === 0) {
    return { valid: false, reason: 'No se pueden agendar citas los domingos.' };
  }

  // Check Peru Holiday
  if (isPeruHoliday(startDate) || isPeruHoliday(endDate)) {
    return { valid: false, reason: 'No se pueden agendar citas en feriados nacionales de Perú.' };
  }

  // Check if start and end are on the same day
  if (startDate.toDateString() !== endDate.toDateString()) {
    return { valid: false, reason: 'La cita debe empezar y terminar el mismo día.' };
  }

  // Check time ranges
  const startHour = startDate.getHours();
  const startMin = startDate.getMinutes();
  const endHour = endDate.getHours();
  const endMin = endDate.getMinutes();

  const startVal = startHour * 60 + startMin;
  const endVal = endHour * 60 + endMin;

  const morningStart = 8 * 60;   // 8:00 AM
  const morningEnd = 12 * 60;   // 12:00 PM
  const afternoonStart = 16 * 60; // 4:00 PM (16:00)
  const afternoonEnd = 21 * 60;   // 9:00 PM (21:00)

  const inMorning = startVal >= morningStart && endVal <= morningEnd;
  const inAfternoon = startVal >= afternoonStart && endVal <= afternoonEnd;

  if (!inMorning && !inAfternoon) {
    return { 
      valid: false, 
      reason: 'El horario debe estar dentro de las jornadas laborales: Mañanas (8:00 AM - 12:00 PM) o Tardes (4:00 PM - 9:00 PM).' 
    };
  }

  return { valid: true };
};

const calculateEndTime = (startStr, treatmentKey) => {
  if (!startStr) return '';
  const startDate = new Date(startStr);
  let durationMinutes = 30; // Default

  switch (treatmentKey) {
    case 'evaluacion':
    case 'restauracion':
    case 'endodoncia':
    case 'ortodoncia':
      durationMinutes = 30;
      break;
    case 'blanqueamiento':
      durationMinutes = 45;
      break;
    case 'cirugia':
    case 'rehabilitacion':
      durationMinutes = 60;
      break;
    default:
      durationMinutes = 30;
  }

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return endDate.toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
};

const getLimaDate = (dateOrStr) => {
  if (!dateOrStr) return null;
  const date = new Date(dateOrStr);
  if (isNaN(date.getTime())) return null;

  try {
    // Force conversion of date to America/Lima timezone fields
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const partValues = {};
    parts.forEach(p => {
      partValues[p.type] = p.value;
    });

    return new Date(
      parseInt(partValues.year),
      parseInt(partValues.month) - 1,
      parseInt(partValues.day),
      parseInt(partValues.hour),
      parseInt(partValues.minute),
      parseInt(partValues.second)
    );
  } catch (e) {
    console.error('Error formatting Lima date:', e);
    return date; // fallback to original date object if Intl fails
  }
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [leads, setLeads] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [citasDb, setCitasDb] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [gcalConnected, setGcalConnected] = useState(false);

  // Embedded mode state (e.g. inside Chatwoot iframe)
  const [isEmbedded, setIsEmbedded] = useState(false);

  // Active chat state
  const [activeChatPhone, setActiveChatPhone] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [chatViewMode, setChatViewMode] = useState('chatwoot'); // Default to chatwoot iframe
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Modals state
  const [selectedLead, setSelectedLead] = useState(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedDayForAgenda, setSelectedDayForAgenda] = useState(null);
  
  // Rescheduling states
  const [selectedCitaForReschedule, setSelectedCitaForReschedule] = useState(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleEvent, setRescheduleEvent] = useState({ start: '', end: '' });

  // Appointment Detail Card states
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTimeLocked, setIsTimeLocked] = useState(false);
  const [treatmentType, setTreatmentType] = useState('evaluacion');
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false);
  const [targetDateInput, setTargetDateInput] = useState('');
  const [sendEmailReminder, setSendEmailReminder] = useState(false);
  const [newEvent, setNewEvent] = useState({
    summary: '',
    start: '',
    end: '',
    description: '',
    phone_number: '',
    email: ''
  });

  // Settings state (Persisted in LocalStorage)
  const [settings, setSettings] = useState({
    supabaseUrl: localStorage.getItem('crm_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: localStorage.getItem('crm_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    googleClientId: localStorage.getItem('crm_google_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    calendarId: localStorage.getItem('crm_calendar_id') || import.meta.env.VITE_CALENDAR_ID || 'primary',
    chatwootAccountId: localStorage.getItem('crm_chatwoot_account_id') || import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '1',
    chatwootBaseUrl: localStorage.getItem('crm_chatwoot_base_url') || import.meta.env.VITE_CHATWOOT_BASE_URL || 'https://app.chatwoot.com',
    chatwootAccessToken: localStorage.getItem('crm_chatwoot_access_token') || import.meta.env.VITE_CHATWOOT_ACCESS_TOKEN || ''
  });

  // Calendar month state
  const [currentDate, setCurrentDate] = useState(new Date()); // Today's date (June 2026)
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(new Date());

  const calendarYear = currentDate.getFullYear();
  const calendarMonth = currentDate.getMonth();
  const calendarStartOffset = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarTotalCells = Math.ceil((calendarStartOffset + calendarDaysInMonth) / 7) * 7;

  // Detect query parameters on mount to check if embedded in Chatwoot
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const embedParam = params.get('embed');
    const phoneParam = params.get('phone') || params.get('phone_number');
    const conversationIdParam = params.get('conversation_id');
    
    if (embedParam === 'true') {
      setIsEmbedded(true);
      setActiveTab('chats'); // Default to chats when embedded
    }
    
    if (phoneParam) {
      // Decode phone parameter
      const formatted = decodeURIComponent(phoneParam).trim();
      setActiveChatPhone(formatted);
    }

    if (conversationIdParam) {
      setActiveConversationId(conversationIdParam);
    }
  }, []);

  const chatwootDashboardUrl = api.getChatwootDashboardUrl(activeConversationId);
  const chatwootEmbedUrl = chatwootDashboardUrl;

  // Verify Google Token on mount, settings changes, or month changes
  useEffect(() => {
    const token = api.getGCalToken();
    setGcalConnected(!!token);
    fetchData();
  }, [settings, currentDate]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const timeMin = new Date(year, month, 1).toISOString();
      const timeMax = new Date(year, month + 1, 1).toISOString();

      const fetchedLeads = await api.getLeads();
      const fetchedAppointments = await api.getAppointments(timeMin, timeMax);
      setLeads(fetchedLeads);
      setAppointments(fetchedAppointments);

      // Fetch Supabase pacientes and database appointments
      const fetchedPacientes = await api.getPacientes();
      const fetchedCitasDb = await api.getCitasDb();
      setPacientes(fetchedPacientes);
      setCitasDb(fetchedCitasDb);
      
      // Auto select first chat if none selected and not embedded
      if (fetchedLeads.length > 0 && !activeChatPhone && !isEmbedded) {
        setActiveChatPhone(fetchedLeads[0].phone_number);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al sincronizar datos. Usando mocks offline.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Login Flow (Client-side GIS)
  const handleGoogleLogin = () => {
    if (!settings.googleClientId) {
      showToast('Por favor, configura tu Google Client ID en las variables de entorno (.env).', false);
      return;
    }

    if (!window.google) {
      showToast('La biblioteca de Google no se ha cargado todavía. Reintente en un momento.', false);
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: settings.googleClientId,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: (tokenResponse) => {
          if (tokenResponse.access_token) {
            localStorage.setItem('gcal_access_token', tokenResponse.access_token);
            localStorage.setItem('gcal_token_expiry', (Date.now() + tokenResponse.expires_in * 1000).toString());
            setGcalConnected(true);
            showToast('Conexión con Google Calendar exitosa');
            fetchData();
          }
        },
      });
      client.requestAccessToken();
    } catch (err) {
      console.error('GIS Error:', err);
      showToast('Error al inicializar la autenticación de Google.', false);
    }
  };

  // Google Sign-Out
  const handleGoogleLogout = () => {
    localStorage.removeItem('gcal_access_token');
    localStorage.removeItem('gcal_token_expiry');
    setGcalConnected(false);
    showToast('Desconectado de Google Calendar');
    fetchData();
  };

  // Toggle Theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  // Refresh data helper
  const handleRefresh = () => {
    fetchData();
    showToast('Datos actualizados');
  };

  // Toast notifications helper
  const showToast = (msg, isSuccess = true) => {
    if (isSuccess) {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Load chat messages when active phone changes
  useEffect(() => {
    if (activeChatPhone) {
      loadChat(activeChatPhone);
    }
  }, [activeChatPhone]);

  const loadChat = async (phone) => {
    try {
      const config = api.getChatwootConfig();
      let convId = null;
      if (config && config.token) {
        convId = await api.getChatwootConversationIdByPhone(phone);
      }
      setActiveConversationId(convId);
      const messages = await api.getChatHistory(phone, convId);
      setChatMessages(messages);
    } catch (err) {
      console.error('Error loading chat:', err);
    }
  };

  // Send WhatsApp message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatPhone) return;

    const content = newMessage;
    setNewMessage('');

    // Optimistic update
    const tempMsg = {
      id: Date.now(),
      sender: 'bot',
      content: content,
      timestamp: new Date().toISOString(),
      sender_type: 'Soporte Humano (Tú)'
    };
    setChatMessages(prev => [...prev, tempMsg]);

    try {
      await api.sendWhatsAppMessage(activeChatPhone, content, activeConversationId);
      loadChat(activeChatPhone);
    } catch (err) {
      console.error(err);
      showToast('Error al enviar mensaje por WhatsApp', false);
    }
  };

  // Update CRM Lead details
  const handleUpdateLead = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      const updated = await api.updateLead(selectedLead);
      setLeads(prev => prev.map(l => l.phone_number === updated.phone_number ? updated : l));
      setIsLeadModalOpen(false);
      showToast('Lead actualizado correctamente');
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar lead', false);
    }
  };

  // Create calendar event
  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!newEvent.summary || !newEvent.start || !newEvent.end) return;

    // Validate working hours & Peru holidays
    const validation = isValidWorkingHours(new Date(newEvent.start), new Date(newEvent.end));
    if (!validation.valid) {
      showToast(validation.reason, false);
      return;
    }

    // Determine phone number to pass
    const phone = isNewPatient ? newPatientPhone.trim() : newEvent.phone_number;
    if (isNewPatient && (!newPatientName.trim() || !newPatientPhone.trim())) {
      showToast('Por favor, ingresa el nombre y celular del paciente nuevo.', false);
      return;
    }

    try {
      const desc = phone 
        ? `${newEvent.description} | Contacto: ${phone}`
        : newEvent.description;

      await api.createAppointment(
        newEvent.summary,
        new Date(newEvent.start).toISOString(),
        new Date(newEvent.end).toISOString(),
        desc,
        phone,
        sendEmailReminder ? newEvent.email : ''
      );
      
      // If client phone was linked, let's update their lead status to 'scheduled'
      if (newEvent.phone_number) {
        const lead = leads.find(l => l.phone_number === newEvent.phone_number);
        if (lead && lead.status !== 'scheduled') {
          await api.updateLead({ ...lead, status: 'scheduled' });
        }
      }

      fetchData();
      closeAppointmentModal();
      showToast('Cita agendada directamente en Google Calendar');
    } catch (err) {
      console.error(err);
      showToast('Error al agendar cita en Google Calendar', false);
    }
  };

  const closeAppointmentModal = () => {
    setIsAppointmentModalOpen(false);
    setIsTimeLocked(false);
    setTreatmentType('evaluacion');
    setIsNewPatient(false);
    setNewPatientName('');
    setNewPatientPhone('');
    setSendEmailReminder(false);
    setNewEvent({ summary: '', start: '', end: '', description: '', phone_number: '', email: '' });
  };

  // Delete appointment
  const handleDeleteAppointment = async (eventId) => {
    if (!window.confirm('¿Estás seguro de cancelar esta cita en Google Calendar?')) return;
    try {
      await api.deleteAppointment(eventId);
      setAppointments(prev => prev.filter(app => app.id !== eventId));
      showToast('Cita cancelada correctamente');
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Error al cancelar la cita', false);
    }
  };

  // Update appointment status
  const handleUpdateAppointmentStatus = async (eventId, status) => {
    try {
      await api.updateAppointmentStatus(eventId, status);
      showToast(`Estado de la cita actualizado a ${status}`);
      fetchData();
      setIsDetailModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar el estado de la cita', false);
    }
  };

  // Submit rescheduling
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCitaForReschedule || !rescheduleEvent.start || !rescheduleEvent.end) return;

    try {
      await api.rescheduleAppointment(
        selectedCitaForReschedule.google_event_id,
        new Date(rescheduleEvent.start).toISOString(),
        new Date(rescheduleEvent.end).toISOString()
      );
      showToast('Cita reprogramada con éxito');
      setIsRescheduleModalOpen(false);
      setSelectedCitaForReschedule(null);
      setRescheduleEvent({ start: '', end: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Error al reprogramar la cita', false);
    }
  };

  const handleOpenDetailFromGCal = (app) => {
    const dbCita = citasDb.find(c => c.google_event_id === app.id);
    if (dbCita) {
      setSelectedAppointmentDetails(dbCita);
    } else {
      setSelectedAppointmentDetails({
        id: null,
        google_event_id: app.id,
        fecha_hora_cita: app.start.dateTime || app.start.date,
        motivo_consulta: app.summary,
        estado_cita: 'AGENDADA',
        telefono_paciente: '',
        correo_electronico: app.correo_electronico || '',
        pacientes: { nombre_paciente: app.summary.split(' - ')[0] || 'Paciente GCal' }
      });
    }
    setIsDetailModalOpen(true);
  };

  // Save Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('crm_supabase_url', settings.supabaseUrl);
    localStorage.setItem('crm_supabase_anon_key', settings.supabaseAnonKey);
    localStorage.setItem('crm_google_client_id', settings.googleClientId);
    localStorage.setItem('crm_calendar_id', settings.calendarId);
    localStorage.setItem('crm_chatwoot_account_id', settings.chatwootAccountId);
    localStorage.setItem('crm_chatwoot_base_url', settings.chatwootBaseUrl);
    localStorage.setItem('crm_chatwoot_access_token', settings.chatwootAccessToken || '');
    
    showToast('Configuraciones guardadas');
    // Force refresh to reload api instance
    window.location.reload();
  };

  const minDateTime = new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);

  // Filter past appointments pending attendance review
  const pastAppointmentsToReview = citasDb.filter(cita => {
    if (!cita.fecha_hora_cita) return false;
    const isPast = new Date(cita.fecha_hora_cita) < new Date();
    const isPendingAttendance = cita.estado_cita === 'AGENDADA' || cita.estado_cita === 'CONFIRMADA' || !cita.estado_cita;
    return isPast && isPendingAttendance;
  });

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const filteredLeads = leads.filter(l => 
    l.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.phone_number.includes(searchQuery)
  );

  // Kanban Drag and Drop simulation
  const handleStatusChange = async (leadPhone, newStatus) => {
    const lead = leads.find(l => l.phone_number === leadPhone);
    if (!lead) return;
    
    try {
      const updated = await api.updateLead({ ...lead, status: newStatus });
      setLeads(prev => prev.map(l => l.phone_number === leadPhone ? updated : l));
      showToast(`Lead movido a ${newStatus.toUpperCase()}`);
    } catch(err) {
      console.error(err);
      showToast('Error al actualizar estado del lead', false);
    }
  };

  // Metrics calculations
  const totalLeads = leads.length;
  const scheduledCount = leads.filter(l => l.status === 'scheduled').length;
  const contactedCount = leads.filter(l => l.status === 'contacted').length;
  const completedCount = leads.filter(l => l.status === 'completed').length;
  const lostCount = leads.filter(l => l.status === 'lost').length;
  const conversionRate = totalLeads ? Math.round(((scheduledCount + completedCount) / totalLeads) * 100) : 0;

  // Citas BD metrics
  const totalPacientes = pacientes.length;
  const totalCitas = citasDb.length;
  const citasAgendadas = citasDb.filter(c => c.estado_cita === 'AGENDADA' || c.estado_cita === 'CONFIRMADA' || !c.estado_cita).length;
  const citasAsistio = citasDb.filter(c => c.estado_cita === 'ASISTIO' || c.estado_cita === 'COMPLETADA').length;
  const citasNoAsistio = citasDb.filter(c => c.estado_cita === 'NO_ASISTIO').length;
  const totalAsistenciaResuelta = citasAsistio + citasNoAsistio;
  const tasaAsistencia = totalAsistenciaResuelta ? Math.round((citasAsistio / totalAsistenciaResuelta) * 100) : 0;
  const getTreatmentDistribution = () => {
    const counts = {
      'Evaluación': 0,
      'Restauración': 0,
      'Endodoncia': 0,
      'Ortodoncia': 0,
      'Blanqueamiento': 0,
      'Cirugía': 0,
      'Rehabilitación': 0,
      'Otros': 0
    };

    citasDb.forEach(cita => {
      if (!cita.motivo_consulta) {
        counts['Otros']++;
        return;
      }
      const motivo = cita.motivo_consulta.toLowerCase();
      if (motivo.includes('evalua') || motivo.includes('revis')) {
        counts['Evaluación']++;
      } else if (motivo.includes('restaura') || motivo.includes('curac')) {
        counts['Restauración']++;
      } else if (motivo.includes('endodoncia')) {
        counts['Endodoncia']++;
      } else if (motivo.includes('ortodoncia') || motivo.includes('bracket')) {
        counts['Ortodoncia']++;
      } else if (motivo.includes('blanquea')) {
        counts['Blanqueamiento']++;
      } else if (motivo.includes('cirug') || motivo.includes('extrac') || motivo.includes('cordal')) {
        counts['Cirugía']++;
      } else if (motivo.includes('rehab') || motivo.includes('prote') || motivo.includes('corona')) {
        counts['Rehabilitación']++;
      } else {
        counts['Otros']++;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const getBarColor = (name) => {
    switch (name) {
      case 'Evaluación': return '#3b82f6';
      case 'Restauración': return '#10b981';
      case 'Endodoncia': return '#8b5cf6';
      case 'Ortodoncia': return '#fbbf24';
      case 'Blanqueamiento': return '#06b6d4';
      case 'Cirugía': return '#ef4444';
      case 'Rehabilitación': return '#ec4899';
      default: return '#6b7280';
    }
  };

  // Render helper for icons inside dashboard
  const getStatusBadge = (status) => {
    switch (status) {
      case 'lead':
        return <span className="status-badge disconnected" style={{color:'#f87171'}}><span className="pulse-dot"></span>Nuevo</span>;
      case 'contacted':
        return <span className="status-badge" style={{color:'#60a5fa', background:'rgba(96,165,250,0.1)'}}><span className="pulse-dot"></span>Contactado</span>;
      case 'scheduled':
        return <span className="status-badge" style={{color:'#fbbf24', background:'rgba(245,158,11,0.1)'}}><span className="pulse-dot"></span>Agendado</span>;
      case 'completed':
        return <span className="status-badge connected"><span className="pulse-dot"></span>Completado</span>;
      case 'lost':
        return <span className="status-badge" style={{color:'#94a3b8', background:'rgba(148,163,184,0.1)'}}>Perdido</span>;
      default:
        return null;
    }
  };

  // Timeline hours generator for Dentist: Mañanas (8:00 AM - 12:00 PM) y Tardes (4:00 PM - 9:00 PM) in 30-min intervals
  const getTimeSlots = () => {
    const slots = [];
    // Morning: 8:00 AM to 12:00 PM (booking slots start at 8:00, 8:30, 9:00, 9:30, 10:00, 10:30, 11:00, 11:30)
    for (let hour = 8; hour <= 11; hour++) {
      const hStr = String(hour).padStart(2, '0');
      slots.push(`${hStr}:00`);
      slots.push(`${hStr}:30`);
    }
    // Break indicator
    slots.push('RECESO');
    // Afternoon: 4:00 PM to 9:00 PM (16:00 to 21:00) (booking slots start at 16:00, 16:30, 17:00, 17:30, 18:00, 18:30, 19:00, 19:30, 20:00, 20:30)
    for (let hour = 16; hour <= 20; hour++) {
      slots.push(`${hour}:00`);
      slots.push(`${hour}:30`);
    }
    return slots;
  };

  // Check if an event overlaps with a specific time slot on a specific day
  const getEventForTimeSlot = (slotString, dayDate) => {
    if (slotString === 'RECESO') return null;
    
    const [hours, minutes] = slotString.split(':').map(Number);
    const slotTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hours, minutes);

    return appointments.find(app => {
      const appStart = getLimaDate(app.start?.dateTime || app.start?.date);
      if (!appStart) return false;
      
      const appEnd = getLimaDate(app.end?.dateTime || app.end?.date) || new Date(appStart.getTime() + 30 * 60000);
      
      // Event matches the day
      const sameDay = appStart.getDate() === dayDate.getDate() && 
                      appStart.getMonth() === dayDate.getMonth() && 
                      appStart.getFullYear() === dayDate.getFullYear();
      
      if (!sameDay) return false;
      
      // Slot falls within the event duration [start, end)
      return slotTime >= appStart && slotTime < appEnd;
    });
  };

  return (
    <div className={`app-container ${isEmbedded ? 'embedded-mode' : ''}`}>
      {/* Toast Notifications */}
      {successMsg && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', background: 'rgba(16, 185, 129, 0.9)', 
          color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 2000, 
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }} className="animate-fade-in">
          <Check size={18} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', background: 'rgba(239, 68, 68, 0.9)', 
          color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 2000, 
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }} className="animate-fade-in">
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      {/* Sidebar Navigation - HIDE IF EMBEDDED */}
      {!isEmbedded && (
        <aside className="sidebar">
          <div className="logo-container">
            <div className="logo-icon">T</div>
            <span className="logo-text">TallerCRM</span>
          </div>

          <nav className="sidebar-menu">
            <button 
              className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={20} />
              Dashboard
            </button>

            <button 
              className={`menu-item ${activeTab === 'agenda' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('agenda');
                setSelectedAgendaDate(new Date());
              }}
            >
              <Clock3 size={20} />
              Agenda del Día
            </button>

            <button 
              className={`menu-item ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              <Check size={20} style={{ color: pastAppointmentsToReview.length > 0 ? '#fbbf24' : 'inherit' }} />
              Tomar Asistencia
              {pastAppointmentsToReview.length > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 'bold'
                }}>
                  {pastAppointmentsToReview.length}
                </span>
              )}
            </button>

            <button 
              className={`menu-item ${activeTab === 'chats' ? 'active' : ''}`}
              onClick={() => setActiveTab('chats')}
            >
              <MessageSquare size={20} />
              Chats WhatsApp
            </button>
            <button 
              className={`menu-item ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              <CalendarIcon size={20} />
              Calendario
            </button>
          </nav>

          <div className="sidebar-footer">
            <button onClick={toggleTheme} className="menu-item" style={{width: '100%', background: 'none', border: 'none', textAlign: 'left'}}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Container */}
      <main className="main-content">
        {/* Header bar - HIDE IF EMBEDDED */}
        {!isEmbedded && (
          <header className="top-bar">
            <div className="page-title">
              <h1 style={{textTransform: 'capitalize'}}>
                {activeTab === 'chats' ? 'Consola de Chatwoot' : 
                 activeTab === 'calendar' ? 'Calendario' : 
                 activeTab === 'agenda' ? 'Agenda del Día' : 
                 activeTab === 'attendance' ? 'Tomar Asistencia' : 
                 activeTab}
              </h1>
            </div>
            <div className="top-bar-actions">
              {/* Google Calendar OAuth Login status in header */}
              {gcalConnected ? (
                <button onClick={handleGoogleLogout} className="btn" style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <span className="pulse-dot" style={{background: '#10b981', boxShadow: '0 0 6px #10b981'}}></span>
                  GCal Conectado (Salir)
                </button>
              ) : (
                <button onClick={handleGoogleLogin} className="btn" style={{background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <LogIn size={14} />
                  Conectar Google Calendar
                </button>
              )}

              <button onClick={handleRefresh} className="btn-icon" title="Sincronizar Datos">
                <RefreshCw size={18} />
              </button>
              <div style={{display:'flex', alignItems:'center', gap:'10px', background:'var(--bg-tertiary)', padding:'6px 12px', borderRadius:'10px', border:'1px solid var(--border-color)'}}>
                <div style={{width:'8px', height:'8px', borderRadius:'50%', background: api.supabase ? '#10b981' : '#f59e0b', boxShadow: api.supabase ? '0 0 8px #10b981' : '0 0 8px #f59e0b'}}></div>
                <span style={{fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)'}}>{api.supabase ? 'Supabase ONLINE' : 'Modo Simulador'}</span>
              </div>
            </div>
          </header>
        )}

        {/* LOADING SHIMMER */}
        {loading && (
          <div style={{display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px'}}>
            <RefreshCw className="animate-pulse" size={40} style={{animation: 'spin 2s linear infinite', color: 'var(--primary)'}} />
            <p style={{color: 'var(--text-secondary)'}}>Sincronizando con Google Calendar y Supabase...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* 1. DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
              <div className="dashboard-view animate-fade-in" style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                {/* KPI Metrics row */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px'}}>
                  {/* Card 1: Pacientes Registrados */}
                  <div className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
                    <div className="metric-icon-wrapper" style={{background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '12px', borderRadius: '10px'}}>
                      <Users size={28} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Pacientes Registrados</span>
                      <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{totalPacientes}</span>
                      <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>En base de datos</span>
                    </div>
                  </div>

                  {/* Card 2: Citas en Base de Datos */}
                  <div className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
                    <div className="metric-icon-wrapper" style={{background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', padding: '12px', borderRadius: '10px'}}>
                      <CalendarIcon size={28} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Citas Totales (BD)</span>
                      <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{totalCitas}</span>
                      <span style={{fontSize: '0.75rem', color: '#10b981', fontWeight: 600}}>Historial clínico</span>
                    </div>
                  </div>

                  {/* Card 3: Citas Agendadas */}
                  <div className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
                    <div className="metric-icon-wrapper" style={{background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '12px', borderRadius: '10px'}}>
                      <Clock3 size={28} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Citas Agendadas</span>
                      <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{citasAgendadas}</span>
                      <span style={{fontSize: '0.75rem', color: '#fbbf24', fontWeight: 500}}>Pendientes de atención</span>
                    </div>
                  </div>

                  {/* Card 4: Citas Asistidas */}
                  <div className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
                    <div className="metric-icon-wrapper" style={{background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '12px', borderRadius: '10px'}}>
                      <Check size={28} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Citas Asistidas</span>
                      <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{citasAsistio}</span>
                      <span style={{fontSize: '0.75rem', color: '#10b981', fontWeight: 500}}>Asistencia confirmada</span>
                    </div>
                  </div>

                  {/* Card 5: Inasistencias */}
                  <div className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
                    <div className="metric-icon-wrapper" style={{background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '12px', borderRadius: '10px'}}>
                      <AlertCircle size={28} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Inasistencias</span>
                      <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{citasNoAsistio}</span>
                      <span style={{fontSize: '0.75rem', color: '#ef4444', fontWeight: 500}}>Pacientes ausentes</span>
                    </div>
                  </div>

                  {/* Card 6: Tasa de Asistencia (Comentada por redundancia con el gráfico)
                  <div className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
                    <div className="metric-icon-wrapper" style={{background: 'rgba(79, 70, 229, 0.15)', color: '#6366f1', padding: '12px', borderRadius: '10px'}}>
                      <ArrowUpRight size={28} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Tasa de Asistencia</span>
                      <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{tasaAsistencia}%</span>
                      <span style={{fontSize: '0.75rem', color: '#6366f1', fontWeight: 600}}>Eficiencia de citas</span>
                    </div>
                  </div>
                  */}
                </div>

                {/* Seccion de Graficos del Dashboard */}
                <div className="charts-grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                  {/* Dona de asistencia */}
                  <div className="glass-card chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center', minHeight: '320px', padding: '30px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, width: '100%', textAlign: 'left', margin: 0 }}>Tasa de Asistencia</h3>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '160px', height: '160px' }}>
                      <svg width="160" height="160" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--bg-tertiary)" strokeWidth="10" />
                        {totalAsistenciaResuelta > 0 ? (
                          <circle cx="60" cy="60" r="50" fill="transparent" stroke="url(#donutGradient)" strokeWidth="10"
                                  strokeDasharray="314.16" strokeDashoffset={314.16 - (tasaAsistencia * 314.16) / 100}
                                  strokeLinecap="round" transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
                        ) : null}
                        <defs>
                          <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{tasaAsistencia}%</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Asistencia</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', width: '100%', fontSize: '0.85rem', marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
                        <span style={{ color: 'var(--text-secondary)' }}>Asistieron: <strong>{citasAsistio}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
                        <span style={{ color: 'var(--text-secondary)' }}>Ausentes: <strong>{citasNoAsistio}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Distribucion de tratamientos */}
                  <div className="glass-card chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '320px', padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Distribución de Tratamientos</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, justifyContent: 'center' }}>
                      {getTreatmentDistribution().slice(0, 6).map((treatment) => {
                        const pct = totalCitas > 0 ? Math.round((treatment.count / totalCitas) * 100) : 0;
                        const barColor = getBarColor(treatment.name);
                        const maxCount = Math.max(...getTreatmentDistribution().map(d => d.count), 1);
                        return (
                          <div key={treatment.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 500 }}>
                              <span style={{ color: 'var(--text-primary)' }}>{treatment.name}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{treatment.count} cita{treatment.count === 1 ? '' : 's'} ({pct}%)</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ 
                                width: `${(treatment.count / maxCount) * 100}%`, 
                                height: '100%', 
                                background: barColor, 
                                borderRadius: '4px',
                                transition: 'width 0.8s ease-out',
                                boxShadow: `0 0 8px ${barColor}`
                              }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Lists Columns */}
                <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                  {/* Column 1: Supabase Appointments */}
                  <div className="glass-card" style={{flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <h2 style={{fontSize: '1.1rem', fontWeight: 600}}>Próximas Citas (Supabase DB)</h2>
                      <span style={{fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontWeight: 600}}>BD ONLINE</span>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '400px'}}>
                      {citasDb.length === 0 ? (
                        <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0'}}>
                          No hay citas clínicas programadas en la base de datos de Supabase.
                        </p>
                      ) : (
                        citasDb.map(cita => {
                          const date = cita.fecha_hora_cita ? getLimaDate(cita.fecha_hora_cita) : null;
                          const formattedDate = date 
                            ? date.toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'short'}) + ' a las ' + date.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})
                            : 'Fecha no programada';
                          const patientName = cita.pacientes?.nombre_paciente || 'Paciente sin registrar';
                          
                          return (
                            <div key={cita.id} 
                              onClick={() => {
                                setSelectedAppointmentDetails(cita);
                                setIsDetailModalOpen(true);
                              }}
                              style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '10px',
                                borderLeft: cita.estado_cita === 'CANCELADA' ? '4px solid #ef4444' : '4px solid var(--primary)', 
                                border: '1px solid var(--border-color)',
                                borderLeftWidth: '4px', gap: '10px',
                                opacity: cita.estado_cita === 'CANCELADA' ? 0.7 : 1,
                                cursor: 'pointer'
                              }}>
                              <div style={{overflow: 'hidden'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                                  <span style={{
                                    fontWeight: 600, 
                                    fontSize: '0.9rem', 
                                    color: 'var(--text-main)',
                                    textDecoration: cita.estado_cita === 'CANCELADA' ? 'line-through' : 'none'
                                  }}>{patientName}</span>
                                  <span style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>({cita.telefono_paciente})</span>
                                </div>
                                <p style={{
                                  fontSize: '0.8rem', 
                                  color: 'var(--text-secondary)', 
                                  fontStyle: cita.motivo_consulta ? 'normal' : 'italic', 
                                  marginBottom: '4px',
                                  textDecoration: cita.estado_cita === 'CANCELADA' ? 'line-through' : 'none'
                                }}>
                                  {cita.motivo_consulta || 'Sin motivo especificado'}
                                </p>
                                <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                  <Clock size={12} style={{color: cita.estado_cita === 'CANCELADA' ? '#ef4444' : 'var(--primary)'}} /> {formattedDate}
                                </p>
                              </div>
                              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0}}>
                                <span style={{
                                  fontSize: '0.7rem', 
                                  fontWeight: 600, 
                                  padding: '2px 8px', 
                                  borderRadius: '4px',
                                  background: cita.estado_cita === 'CANCELADA' ? 'rgba(239, 68, 68, 0.1)' : (cita.estado_cita === 'CONFIRMADA' || cita.estado_cita === 'COMPLETADA' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                                  color: cita.estado_cita === 'CANCELADA' ? '#ef4444' : (cita.estado_cita === 'CONFIRMADA' || cita.estado_cita === 'COMPLETADA' ? '#10b981' : '#f59e0b')
                                }}>
                                  {cita.estado_cita || 'AGENDADA'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Column 2: Google Calendar Events */}
                  <div className="glass-card" style={{flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <h2 style={{fontSize: '1.1rem', fontWeight: 600}}>Agenda (Google Calendar)</h2>
                      <span style={{fontSize: '0.75rem', background: gcalConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: gcalConnected ? '#10b981' : '#f59e0b', padding: '4px 8px', borderRadius: '6px', fontWeight: 600}}>
                        {gcalConnected ? 'CONECTADO' : 'OFFLINE'}
                      </span>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '400px'}}>
                      {appointments.length === 0 ? (
                        <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0'}}>
                          No hay eventos programados próximamente.
                        </p>
                      ) : (
                        appointments.slice(0, 8).map(app => {
                          const date = getLimaDate(app.start?.dateTime || app.start?.date);
                          return (
                            <div key={app.id} 
                              onClick={() => handleOpenDetailFromGCal(app)}
                              style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '10px',
                                borderLeft: '4px solid #f59e0b', border: '1px solid var(--border-color)',
                                borderLeftWidth: '4px', cursor: 'pointer'
                              }}
                            >
                              <div style={{overflow: 'hidden', marginRight: '10px'}}>
                                <p style={{fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)'}}>{app.summary}</p>
                                <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                                  {date.toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'short'})} a las {date.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}
                                </p>
                              </div>
                              {!(citasDb.find(c => c.google_event_id === app.id)?.estado_cita === 'ASISTIO' || citasDb.find(c => c.google_event_id === app.id)?.estado_cita === 'COMPLETADA') && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAppointment(app.id);
                                  }} 
                                  className="btn-icon" 
                                  style={{width:'30px', height:'30px', borderRadius:'6px', color:'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0}} 
                                  title="Cancelar Cita"
                                >
                                  <Trash size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. AGENDA DEL DIA VIEW */}
            {activeTab === 'agenda' && (
              <div className="agenda-view animate-fade-in" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                      onClick={() => {
                        const newD = new Date(selectedAgendaDate);
                        newD.setDate(newD.getDate() - 1);
                        setSelectedAgendaDate(newD);
                      }} 
                      className="btn-icon" 
                      style={{ width: '32px', height: '32px' }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                      {selectedAgendaDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
                    </h2>
                    <button 
                      onClick={() => {
                        const newD = new Date(selectedAgendaDate);
                        newD.setDate(newD.getDate() + 1);
                        setSelectedAgendaDate(newD);
                      }} 
                      className="btn-icon" 
                      style={{ width: '32px', height: '32px' }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Seleccionar Fecha:</span>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ width: 'auto', padding: '6px 12px', margin: 0 }}
                      value={selectedAgendaDate.toLocaleString('sv-SE').slice(0, 10)}
                      onChange={(e) => {
                        if (e.target.value) {
                          const parts = e.target.value.split('-');
                          setSelectedAgendaDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                        }
                      }}
                    />
                    <button 
                      onClick={() => setSelectedAgendaDate(new Date())} 
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      Hoy
                    </button>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {getTimeSlots().map((slot, idx) => {
                      if (slot === 'RECESO') {
                        return (
                          <div key={`receso-${idx}`} style={{
                            textAlign: 'center', padding: '10px', 
                            background: 'rgba(255, 255, 255, 0.02)', 
                            borderRadius: '8px', border: '1px dashed var(--border-color)',
                            color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600,
                            letterSpacing: '1px'
                          }}>
                            ☕ RECESO DE ALMUERZO (12:00 PM - 4:00 PM)
                          </div>
                        );
                      }

                      const activeEvent = getEventForTimeSlot(slot, selectedAgendaDate);
                      const [hours, minutes] = slot.split(':').map(Number);
                      const slotTime = new Date(
                        selectedAgendaDate.getFullYear(),
                        selectedAgendaDate.getMonth(),
                        selectedAgendaDate.getDate(),
                        hours,
                        minutes
                      );
                      const isSlotPast = slotTime < new Date();
                      const dbCitaResolved = activeEvent ? citasDb.find(c => c.google_event_id === activeEvent.id) : null;
                      
                      return (
                        <div key={slot} className="agenda-time-slot" style={{
                          display: 'flex', alignItems: 'center', padding: '14px 20px', 
                          background: activeEvent ? 'rgba(var(--primary-rgb), 0.03)' : 'var(--bg-tertiary)', 
                          borderRadius: '10px', 
                          border: activeEvent ? '1px solid rgba(var(--primary-rgb), 0.15)' : '1px solid var(--border-color)', 
                          minHeight: '64px',
                          transition: 'all var(--transition-fast)'
                        }}>
                          {/* Hour Indicator */}
                          <div style={{
                            width: '80px', fontWeight: 600, fontSize: '0.9rem', 
                            color: activeEvent ? 'var(--primary)' : 'var(--text-secondary)', 
                            borderRight: '1px solid var(--border-color)',
                            marginRight: '20px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {slot}
                          </div>

                          {/* Overlapping Event Card or Empty slot */}
                          <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {activeEvent ? (
                              <>
                                <div 
                                  onClick={() => handleOpenDetailFromGCal(activeEvent)}
                                  style={{ overflow: 'hidden', paddingRight: '10px', cursor: 'pointer', flexGrow: 1 }}
                                >
                                  <span style={{
                                    fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)',
                                    display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                  }}>
                                    {activeEvent.summary}
                                  </span>
                                  {activeEvent.description && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {activeEvent.description}
                                    </span>
                                  )}
                                </div>
                                
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                                  {dbCitaResolved?.estado_cita && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      background: ['ASISTIO', 'COMPLETADA'].includes(dbCitaResolved.estado_cita) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                      color: ['ASISTIO', 'COMPLETADA'].includes(dbCitaResolved.estado_cita) ? '#10b981' : '#ef4444'
                                    }}>
                                      {dbCitaResolved.estado_cita}
                                    </span>
                                  )}
                                  
                                  {!(dbCitaResolved?.estado_cita === 'ASISTIO' || dbCitaResolved?.estado_cita === 'COMPLETADA') && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAppointment(activeEvent.id);
                                      }}
                                      className="btn-icon" 
                                      style={{ color: 'var(--danger)', width: '32px', height: '32px' }}
                                      title="Cancelar Cita"
                                    >
                                      <Trash size={14} />
                                    </button>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                  Disponible
                                </span>
                                <button 
                                  onClick={() => {
                                    const [hours, minutes] = slot.split(':').map(Number);
                                    const startStr = new Date(
                                      selectedAgendaDate.getFullYear(), 
                                      selectedAgendaDate.getMonth(), 
                                      selectedAgendaDate.getDate(), 
                                      hours, 
                                      minutes
                                    ).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
                                    
                                    const endStr = calculateEndTime(startStr, 'evaluacion');
                                    
                                    setNewEvent({
                                      summary: 'Paciente - Evaluación Inicial',
                                      start: startStr,
                                      end: endStr,
                                      description: '',
                                      phone_number: ''
                                    });
                                    setIsTimeLocked(true);
                                    setTreatmentType('evaluacion');
                                    setIsNewPatient(false);
                                    setNewPatientName('');
                                    setNewPatientPhone('');
                                    setIsAppointmentModalOpen(true);
                                  }}
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', height: '32px', opacity: isSlotPast ? 0.5 : 1 }}
                                  disabled={!gcalConnected || isSlotPast}
                                  title={isSlotPast ? 'No se pueden agendar citas en el pasado' : ''}
                                >
                                  + Agendar Cita
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. TOMAR ASISTENCIA VIEW */}
            {activeTab === 'attendance' && (
              <div className="attendance-view animate-fade-in" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={20} style={{ color: 'var(--primary)' }} />
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Citas Pasadas Pendientes de Asistencia</h2>
                    </div>
                    <span className="status-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontWeight: 600, padding: '4px 10px', borderRadius: '8px' }}>
                      {pastAppointmentsToReview.length} {pastAppointmentsToReview.length === 1 ? 'pendiente' : 'pendientes'}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                    A continuación se listan las citas de fechas u horas pasadas que aún no han sido resueltas en el sistema. Por favor marca si el paciente asistió a su cita, no asistió, o si necesitas reprogramarla.
                  </p>
                  
                  {pastAppointmentsToReview.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '48px 24px', 
                      color: 'var(--text-muted)', 
                      fontSize: '0.95rem', 
                      border: '1px dashed var(--border-color)', 
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.01)',
                      marginTop: '12px'
                    }}>
                      🎉 ¡Todo al día! No hay citas pasadas pendientes de registrar asistencia.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                      {pastAppointmentsToReview.map(cita => {
                        const date = cita.fecha_hora_cita ? getLimaDate(cita.fecha_hora_cita) : null;
                        const formattedDate = date 
                          ? date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' a las ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                          : 'Fecha no programada';
                        const patientName = cita.pacientes?.nombre_paciente || 'Paciente sin registrar';

                        return (
                          <div key={cita.id} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '16px 20px', 
                            background: 'var(--bg-tertiary)', 
                            borderRadius: '12px', 
                            border: '1px solid var(--border-color)', 
                            gap: '16px', 
                            flexWrap: 'wrap',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                          }}>
                            <div style={{ flex: '1 1 300px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{patientName}</span>
                                {cita.telefono_paciente && (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({cita.telefono_paciente})</span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <Clock size={14} style={{ color: 'var(--primary)' }} />
                                <span>{formattedDate}</span>
                              </div>
                              {cita.motivo_consulta && (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBlockEnd: 0 }}>
                                  Motivo: {cita.motivo_consulta}
                                </p>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap' }}>
                              <button 
                                onClick={() => handleUpdateAppointmentStatus(cita.google_event_id, 'ASISTIO')}
                                className="btn" 
                                style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '8px 16px', fontSize: '0.85rem' }}
                              >
                                <Check size={16} /> Asistió
                              </button>
                              <button 
                                onClick={() => handleUpdateAppointmentStatus(cita.google_event_id, 'NO_ASISTIO')}
                                className="btn" 
                                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 16px', fontSize: '0.85rem' }}
                              >
                                ✕ No Asistió
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedCitaForReschedule(cita);
                                  const tomorrow = new Date();
                                  tomorrow.setDate(tomorrow.getDate() + 1);
                                  const tomorrowStr = tomorrow.toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
                                  const tomorrowEndStr = new Date(tomorrow.getTime() + 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
                                  setRescheduleEvent({ start: tomorrowStr, end: tomorrowEndStr });
                                  setIsRescheduleModalOpen(true);
                                }}
                                className="btn btn-secondary" 
                                style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <RefreshCw size={14} /> Reprogramar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. CHATS WHATSAPP MONITOR VIEW */}
            {activeTab === 'chats' && (
              <div className="chats-view animate-fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 0'}}>
                <header className="chat-header" style={{margin: '0 20px 15px 20px', padding: '0 0 15px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <MessageSquare size={24} style={{color: 'var(--primary)'}} />
                    <div>
                      <span className="chat-name" style={{fontSize: '1.15rem', fontWeight: 600}}>Consola de Chatwoot</span>
                      <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Gestiona tus conversaciones y contactos de WhatsApp</p>
                    </div>
                  </div>
                  <div>
                    <a 
                      href={chatwootDashboardUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-secondary" 
                      style={{padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none'}}
                    >
                      Abrir en pestaña nueva <ExternalLink size={14} />
                    </a>
                  </div>
                </header>

                <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column', height: 'calc(100% - 80px)', overflow: 'hidden', padding: '0 20px'}}>
                  <iframe 
                    src={chatwootEmbedUrl}
                    style={{width: '100%', flexGrow: 1, border: 'none', background: 'var(--bg-secondary)', borderRadius: '12px', height: '100%'}}
                    title="Consola de Chatwoot"
                    allow="camera; microphone; geolocation"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              </div>
            )}

            {/* 4. CALENDAR VIEW */}
            {activeTab === 'calendar' && (
              <div className="calendar-view animate-fade-in">
                <div className="calendar-header">
                  <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                    <button onClick={() => setCurrentDate(new Date(calendarYear, calendarMonth - 1, 1))} className="btn-icon" style={{width:'32px', height:'32px'}}>
                      <ChevronLeft size={16} />
                    </button>
                    <h2 style={{fontSize: '1.25rem', fontWeight: 600}}>
                      {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </h2>
                    <button onClick={() => setCurrentDate(new Date(calendarYear, calendarMonth + 1, 1))} className="btn-icon" style={{width:'32px', height:'32px'}}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  
                  <div style={{display: 'flex', gap: '12px'}}>
                    {!gcalConnected && (
                      <div style={{fontSize: '0.85rem', color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                        <AlertCircle size={14} /> Usando datos offline. Conecta GCal arriba.
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        const todayStr = new Date().toLocaleString('sv-SE').slice(0, 10);
                        setTargetDateInput(todayStr);
                        setIsDatePickerModalOpen(true);
                      }} 
                      className="btn btn-primary"
                      disabled={!gcalConnected}
                      title={!gcalConnected ? 'Debes conectar Google Calendar primero' : ''}
                    >
                      <Plus size={16} /> Agendar Cita
                    </button>
                  </div>
                </div>

                <div className="calendar-grid-container">
                  <div className="calendar-days-header">
                    <span>DOM</span>
                    <span>LUN</span>
                    <span>MAR</span>
                    <span>MIÉ</span>
                    <span>JUE</span>
                    <span>VIE</span>
                    <span>SÁB</span>
                  </div>
                  <div className="calendar-grid">
                    {Array.from({ length: calendarTotalCells }).map((_, idx) => {
                      const dayNumber = idx - calendarStartOffset + 1;
                      const isValidDay = dayNumber > 0 && dayNumber <= calendarDaysInMonth;
                      
                      // Calculate events for this day
                      const dayEvents = appointments.filter(app => {
                        const appDate = getLimaDate(app.start?.dateTime || app.start?.date);
                        if (!appDate) return false;
                        return appDate.getDate() === dayNumber && 
                               appDate.getMonth() === calendarMonth && 
                               appDate.getFullYear() === calendarYear;
                      });

                      const today = new Date();
                      const isToday = isValidDay && 
                                      today.getDate() === dayNumber && 
                                      today.getMonth() === calendarMonth && 
                                      today.getFullYear() === calendarYear;

                      return (
                        <div 
                          key={idx} 
                          className={`calendar-cell ${!isValidDay ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                          style={{cursor: isValidDay ? 'pointer' : 'default'}}
                          onClick={() => {
                            if (isValidDay) {
                              setSelectedDayForAgenda(new Date(calendarYear, calendarMonth, dayNumber));
                            }
                          }}
                        >
                          {isValidDay && (
                            <>
                              <div className="calendar-cell-number">{dayNumber}</div>
                              <div className="calendar-events">
                                {dayEvents.map(evt => (
                                  <div 
                                    key={evt.id} 
                                    className="calendar-event confirmed" 
                                    title={`${evt.summary}: ${evt.description}`}
                                    onClick={(e) => {
                                      e.stopPropagation(); // Avoid opening day details modal when clicking event
                                      handleOpenDetailFromGCal(evt);
                                    }}
                                  >
                                    {evt.summary.split(' - ')[0]}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}


          </>
        )}
      </main>

      {/* LEAD MODAL (CRM EDIT) */}
      {isLeadModalOpen && selectedLead && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <header className="modal-header">
              <span className="modal-title">Detalles del Lead CRM</span>
              <button onClick={() => setIsLeadModalOpen(false)} className="btn-icon" style={{width:'32px', height:'32px'}}>✕</button>
            </header>
            <form onSubmit={handleUpdateLead}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Número de WhatsApp (Celular)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={selectedLead.phone_number} 
                    disabled 
                  />
                </div>
                <div className="form-group">
                  <label>Nombre del Cliente</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={selectedLead.client_name} 
                    placeholder="Ej. Juan Pérez"
                    onChange={(e) => setSelectedLead(prev => ({ ...prev, client_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={selectedLead.client_email} 
                    placeholder="Ej. correo@dominio.com"
                    onChange={(e) => setSelectedLead(prev => ({ ...prev, client_email: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Estado en Embudo CRM</label>
                  <select 
                    className="form-control"
                    value={selectedLead.status}
                    onChange={(e) => setSelectedLead(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="lead">Nuevo Lead</option>
                    <option value="contacted">Contactado / En Conversación</option>
                    <option value="scheduled">Cita Agendada</option>
                    <option value="completed">Tratamiento Completado</option>
                    <option value="lost">Lead Perdido</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Notas Internas y de Tratamiento</label>
                  <textarea 
                    className="form-control"
                    rows={4}
                    value={selectedLead.internal_notes}
                    placeholder="Agregar observaciones clínicas, precios especiales o comentarios..."
                    onChange={(e) => setSelectedLead(prev => ({ ...prev, internal_notes: e.target.value }))}
                  />
                </div>
              </div>
              <footer className="modal-footer">
                <button type="button" onClick={() => setIsLeadModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Cambios
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* APPOINTMENT MODAL (GCAL ADD) */}
      {isAppointmentModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content animate-slide-up">
            <header className="modal-header">
              <span className="modal-title">Agendar Cita en Google Calendar</span>
              <button onClick={closeAppointmentModal} className="btn-icon" style={{width:'32px', height:'32px'}}>✕</button>
            </header>
            <form onSubmit={handleCreateAppointment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Título de la Cita</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej. Juan Pérez - Evaluación de Ortodoncia"
                    value={newEvent.summary}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>¿Paciente nuevo?</label>
                  <select 
                    className="form-control"
                    value={isNewPatient ? 'si' : 'no'}
                    onChange={(e) => {
                      const val = e.target.value === 'si';
                      setIsNewPatient(val);
                      // Reset values
                      setNewPatientName('');
                      setNewPatientPhone('');
                      setNewEvent(prev => ({ 
                        ...prev, 
                        phone_number: '',
                        summary: `Paciente - ${
                          {
                            evaluacion: 'Evaluación Inicial',
                            restauracion: 'Restauración',
                            endodoncia: 'Endodoncia',
                            ortodoncia: 'Ortodoncia',
                            blanqueamiento: 'Blanqueamiento Dental',
                            cirugia: 'Cirugía de Cordales',
                            rehabilitacion: 'Rehabilitación Oral',
                            personalizado: 'Consulta'
                          }[treatmentType] || 'Consulta'
                        }`
                      }));
                    }}
                  >
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </div>

                {!isNewPatient ? (
                  <div className="form-group">
                    <label>Vincular a Paciente de WhatsApp (Opcional)</label>
                    <select 
                      className="form-control"
                      value={newEvent.phone_number}
                      onChange={(e) => {
                        const num = e.target.value;
                        const l = leads.find(lead => lead.phone_number === num);
                        const treatmentLabels = {
                          evaluacion: 'Evaluación Inicial',
                          restauracion: 'Restauración',
                          endodoncia: 'Endodoncia',
                          ortodoncia: 'Ortodoncia',
                          blanqueamiento: 'Blanqueamiento Dental',
                          cirugia: 'Cirugía de Cordales',
                          rehabilitacion: 'Rehabilitación Oral',
                          personalizado: 'Consulta'
                        };
                        const label = treatmentLabels[treatmentType] || 'Consulta';
                        const patientName = l ? l.client_name : 'Paciente';
                        const patientEmail = l ? l.client_email || '' : '';
                        setNewEvent(prev => ({ 
                          ...prev, 
                          phone_number: num,
                          email: patientEmail,
                          summary: `${patientName} - ${label}`
                        }));
                        setSendEmailReminder(!!patientEmail);
                      }}
                    >
                      <option value="">-- No vincular --</option>
                      {leads.map(l => (
                        <option key={l.phone_number} value={l.phone_number}>
                          {l.client_name} ({l.phone_number})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Nombre del Paciente Nuevo</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Ej. Carlos Prado"
                        value={newPatientName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPatientName(val);
                          
                          const treatmentLabels = {
                            evaluacion: 'Evaluación Inicial',
                            restauracion: 'Restauración',
                            endodoncia: 'Endodoncia',
                            ortodoncia: 'Ortodoncia',
                            blanqueamiento: 'Blanqueamiento Dental',
                            cirugia: 'Cirugía de Cordales',
                            rehabilitacion: 'Rehabilitación Oral',
                            personalizado: 'Consulta'
                          };
                          const label = treatmentLabels[treatmentType] || 'Consulta';
                          const patientName = val.trim() || 'Paciente';
                          setNewEvent(prev => ({
                            ...prev,
                            summary: `${patientName} - ${label}`
                          }));
                        }}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Número de Celular</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        placeholder="Ej. +51 999 888 777"
                        value={newPatientPhone}
                        onChange={(e) => setNewPatientPhone(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>Tipo de Tratamiento / Motivo</label>
                  <select 
                    className="form-control"
                    value={treatmentType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTreatmentType(val);
                      
                      const l = leads.find(lead => lead.phone_number === newEvent.phone_number);
                      const patientName = l ? l.client_name : 'Paciente';
                      const treatmentLabels = {
                        evaluacion: 'Evaluación Inicial',
                        restauracion: 'Restauración',
                        endodoncia: 'Endodoncia',
                        ortodoncia: 'Ortodoncia',
                        blanqueamiento: 'Blanqueamiento Dental',
                        cirugia: 'Cirugía de Cordales',
                        rehabilitacion: 'Rehabilitación Oral',
                        personalizado: 'Consulta'
                      };
                      const label = treatmentLabels[val] || 'Consulta';
                      const newSummary = `${patientName} - ${label}`;
                      
                      setNewEvent(prev => {
                        const newEnd = val !== 'personalizado' ? calculateEndTime(prev.start, val) : prev.end;
                        return {
                          ...prev,
                          summary: newSummary,
                          end: newEnd
                        };
                      });
                    }}
                  >
                    <option value="evaluacion">Evaluación inicial / Revisión general (30 min)</option>
                    <option value="restauracion">Restauración (30 min)</option>
                    <option value="endodoncia">Endodoncia (30 min)</option>
                    <option value="ortodoncia">Ortodoncia (30 min)</option>
                    <option value="blanqueamiento">Blanqueamiento dental (45 min)</option>
                    <option value="cirugia">Cirugía (ej. cordales) (60 min)</option>
                    <option value="rehabilitacion">Rehabilitación oral (60 min)</option>
                    <option value="personalizado">Otro / Personalizado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha y Hora de Inicio</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={newEvent.start}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewEvent(prev => {
                        const newEnd = treatmentType !== 'personalizado' ? calculateEndTime(val, treatmentType) : prev.end;
                        return {
                          ...prev,
                          start: val,
                          end: newEnd
                        };
                      });
                    }}
                    required
                    min={minDateTime}
                    disabled={isTimeLocked}
                  />
                </div>
                <div className="form-group">
                  <label>Fecha y Hora de Fin</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={newEvent.end}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, end: e.target.value }))}
                    required
                    min={minDateTime}
                    disabled={isTimeLocked}
                  />
                </div>

                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="sendEmailReminder" 
                    checked={sendEmailReminder}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSendEmailReminder(checked);
                      if (!checked) {
                        setNewEvent(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="sendEmailReminder" style={{ cursor: 'pointer', margin: 0 }}>
                    ¿Enviar recordatorio por correo electrónico?
                  </label>
                </div>

                {sendEmailReminder && (
                  <div className="form-group animate-slide-up">
                    <label>Correo Electrónico para Recordatorio</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="Ej. paciente@correo.com"
                      value={newEvent.email || ''}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, email: e.target.value }))}
                      required={sendEmailReminder}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Detalles / Notas de la Cita</label>
                  <textarea 
                    className="form-control"
                    rows={3}
                    placeholder="Observaciones de la cita médica..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <footer className="modal-footer">
                <button type="button" onClick={closeAppointmentModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Agendar Cita
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* DAY AGENDA HOURLY MODAL */}
      {selectedDayForAgenda && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{maxWidth: '650px', width: '90%'}}>
            <header className="modal-header">
              <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <Clock3 style={{color:'var(--primary)'}} size={20} />
                <span className="modal-title" style={{fontSize:'1.1rem'}}>
                  Agenda: {selectedDayForAgenda.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <button onClick={() => setSelectedDayForAgenda(null)} className="btn-icon" style={{width:'32px', height:'32px'}}>✕</button>
            </header>
            
            <div className="modal-body" style={{maxHeight:'70vh', overflowY:'auto', padding:'20px'}}>
              <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                {getTimeSlots().map((slot, index) => {
                  if (slot === 'RECESO') {
                    return (
                      <div key={`receso-${index}`} style={{
                        textAlign:'center', padding:'12px', fontSize:'0.75rem', 
                        fontWeight:600, color:'var(--text-muted)', background:'rgba(255,255,255,0.02)',
                        borderRadius:'6px', letterSpacing:'1.5px', border: '1px dashed var(--border-color)'
                      }}>
                        - RECESO DEL DOCTOR (12:00 PM a 4:00 PM) -
                      </div>
                    );
                  }

                  const activeEvent = getEventForTimeSlot(slot, selectedDayForAgenda);
                  
                  const [hours, minutes] = slot.split(':').map(Number);
                  const slotTime = new Date(
                    selectedDayForAgenda.getFullYear(),
                    selectedDayForAgenda.getMonth(),
                    selectedDayForAgenda.getDate(),
                    hours,
                    minutes
                  );
                  const isSlotPast = slotTime < new Date();
                  
                  return (
                    <div key={slot} style={{
                      display:'flex', alignItems:'center', padding:'12px', 
                      background:'var(--bg-tertiary)', borderRadius:'8px', 
                      border:'1px solid var(--border-color)', minHeight:'56px'
                    }}>
                      {/* Hour Indicator */}
                      <div style={{
                        width:'70px', fontWeight:600, fontSize:'0.85rem', 
                        color:'var(--text-secondary)', borderRight:'1px solid var(--border-color)',
                        marginRight:'16px'
                      }}>
                        {slot}
                      </div>

                      {/* Overlapping Event Card or Empty slot */}
                      <div style={{flexGrow:1, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        {activeEvent ? (
                          <>
                            <div 
                              onClick={() => handleOpenDetailFromGCal(activeEvent)}
                              style={{overflow:'hidden', paddingRight:'10px', cursor:'pointer', flexGrow:1}}
                            >
                              <span style={{
                                fontWeight:600, fontSize:'0.9rem', color:'var(--text-primary)',
                                display:'block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
                              }}>
                                {activeEvent.summary}
                              </span>
                              <span style={{fontSize:'0.75rem', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'4px'}}>
                                <Clock size={12} />
                                {(() => {
                                  const start = getLimaDate(activeEvent.start?.dateTime || activeEvent.start?.date);
                                  const end = getLimaDate(activeEvent.end?.dateTime || activeEvent.end?.date) || new Date(start.getTime() + 30 * 60000);
                                  return `${start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} (${Math.round((end - start) / 60000)} mins)`;
                                })()}
                              </span>
                            </div>
                            
                            <div style={{display:'flex', gap:'8px', flexShrink:0}}>
                              {!(citasDb.find(c => c.google_event_id === activeEvent.id)?.estado_cita === 'ASISTIO' || citasDb.find(c => c.google_event_id === activeEvent.id)?.estado_cita === 'COMPLETADA') && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAppointment(activeEvent.id);
                                  }}
                                  className="btn-icon" 
                                  style={{color:'var(--danger)', width:'32px', height:'32px'}}
                                  title="Cancelar Cita"
                                >
                                  <Trash size={14} />
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <span style={{color:'var(--text-muted)', fontSize:'0.85rem', fontStyle:'italic'}}>
                              Disponible
                            </span>
                            <button 
                              onClick={() => {
                                const [hours, minutes] = slot.split(':').map(Number);
                                const startStr = new Date(
                                  selectedDayForAgenda.getFullYear(), 
                                  selectedDayForAgenda.getMonth(), 
                                  selectedDayForAgenda.getDate(), 
                                  hours, 
                                  minutes
                                ).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16); // format to yyyy-MM-ddThh:mm for datetime-local
                                
                                const endStr = calculateEndTime(startStr, 'evaluacion');
                                
                                setNewEvent({
                                  summary: 'Paciente - Evaluación Inicial',
                                  start: startStr,
                                  end: endStr,
                                  description: '',
                                  phone_number: ''
                                });
                                setIsTimeLocked(true);
                                setTreatmentType('evaluacion');
                                setIsNewPatient(false);
                                setNewPatientName('');
                                setNewPatientPhone('');
                                setIsAppointmentModalOpen(true);
                              }}
                               className="btn btn-secondary" 
                              style={{padding:'4px 10px', fontSize:'0.75rem', height:'28px', opacity: isSlotPast ? 0.5 : 1}}
                              disabled={!gcalConnected || isSlotPast}
                              title={isSlotPast ? 'No se pueden agendar citas en el pasado' : ''}
                            >
                              + Agendar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <footer className="modal-footer">
              <button onClick={() => setSelectedDayForAgenda(null)} className="btn btn-secondary">
                Cerrar Agenda
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE DE CITA */}
      {isDetailModalOpen && selectedAppointmentDetails && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '500px', width: '90%' }}>
            <header className="modal-header">
              <span className="modal-title">Detalles de la Cita</span>
              <button onClick={() => setIsDetailModalOpen(false)} className="btn-icon" style={{width:'32px', height:'32px'}}>✕</button>
            </header>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div className="chat-avatar" style={{ flexShrink: 0 }}>
                    {(selectedAppointmentDetails.pacientes?.nombre_paciente || 'P')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>
                      {selectedAppointmentDetails.pacientes?.nombre_paciente || 'Paciente sin nombre'}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {selectedAppointmentDetails.telefono_paciente || 'Sin teléfono registrado'}
                    </p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Motivo de Consulta</label>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {selectedAppointmentDetails.motivo_consulta || 'Sin motivo especificado'}
                  </div>
                </div>

                <div className="form-group">
                  <label>Fecha y Hora</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <Clock size={16} style={{ color: 'var(--primary)' }} />
                    <span>
                      {selectedAppointmentDetails.fecha_hora_cita 
                        ? (() => {
                            const date = getLimaDate(selectedAppointmentDetails.fecha_hora_cita);
                            return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' a las ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                          })()
                        : 'No programada'}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notas de la Cita</label>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-primary)', minHeight: '60px' }}>
                    {selectedAppointmentDetails.detalles_notas_cita || selectedAppointmentDetails.description || 'Sin notas adicionales'}
                  </div>
                </div>

                {selectedAppointmentDetails.correo_electronico && (
                  <div className="form-group">
                    <label>Correo Electrónico (Recordatorio)</label>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--primary)' }}>✉</span>
                      <span>{selectedAppointmentDetails.correo_electronico}</span>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Estado de la Cita</label>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{
                      fontSize: '0.85rem', 
                      fontWeight: 600, 
                      padding: '6px 12px', 
                      borderRadius: '6px',
                      display: 'inline-block',
                      background: selectedAppointmentDetails.estado_cita === 'CANCELADA' || selectedAppointmentDetails.estado_cita === 'NO_ASISTIO' ? 'rgba(239, 68, 68, 0.1)' : (selectedAppointmentDetails.estado_cita === 'CONFIRMADA' || selectedAppointmentDetails.estado_cita === 'COMPLETADA' || selectedAppointmentDetails.estado_cita === 'ASISTIO' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                      color: selectedAppointmentDetails.estado_cita === 'CANCELADA' || selectedAppointmentDetails.estado_cita === 'NO_ASISTIO' ? '#ef4444' : (selectedAppointmentDetails.estado_cita === 'CONFIRMADA' || selectedAppointmentDetails.estado_cita === 'COMPLETADA' || selectedAppointmentDetails.estado_cita === 'ASISTIO' ? '#10b981' : '#f59e0b')
                    }}>
                      {selectedAppointmentDetails.estado_cita || 'AGENDADA'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <footer className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {selectedAppointmentDetails.estado_cita !== 'ASISTIO' && selectedAppointmentDetails.estado_cita !== 'COMPLETADA' && (
                  <button 
                    type="button" 
                    onClick={() => {
                      if (confirm('¿Estás seguro de cancelar esta cita? Se marcará como CANCELADA en el sistema.')) {
                        handleDeleteAppointment(selectedAppointmentDetails.google_event_id);
                        setIsDetailModalOpen(false);
                      }
                    }} 
                    className="btn" 
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  >
                    <Trash size={14} /> Cancelar Cita
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedAppointmentDetails.estado_cita !== 'ASISTIO' && selectedAppointmentDetails.estado_cita !== 'COMPLETADA' && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setSelectedCitaForReschedule(selectedAppointmentDetails);
                      const date = selectedAppointmentDetails.fecha_hora_cita 
                        ? new Date(selectedAppointmentDetails.fecha_hora_cita) 
                        : new Date();
                      
                      const startStr = date.toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
                      const endStr = new Date(date.getTime() + 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
                      
                      setRescheduleEvent({ start: startStr, end: endStr });
                      setIsDetailModalOpen(false);
                      setIsRescheduleModalOpen(true);
                    }} 
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={14} /> Reprogramar
                  </button>
                )}
                <button type="button" onClick={() => setIsDetailModalOpen(false)} className="btn btn-primary">
                  Cerrar
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL DE REPROGRAMACIÓN DE CITAS */}
      {isRescheduleModalOpen && selectedCitaForReschedule && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '450px', width: '90%' }}>
            <header className="modal-header">
              <span className="modal-title">Reprogramar Cita</span>
              <button 
                onClick={() => {
                  setIsRescheduleModalOpen(false);
                  setSelectedCitaForReschedule(null);
                }} 
                className="btn-icon" 
                style={{width:'32px', height:'32px'}}
              >
                ✕
              </button>
            </header>
            <form onSubmit={handleRescheduleSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reprogramando la cita de:</span>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                    {selectedCitaForReschedule.pacientes?.nombre_paciente || selectedCitaForReschedule.motivo_consulta?.split(' - ')[0] || 'Paciente'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Motivo original: {selectedCitaForReschedule.motivo_consulta || 'Sin motivo'}
                  </div>
                </div>

                <div className="form-group">
                  <label>Nueva Fecha y Hora de Inicio</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={rescheduleEvent.start}
                    onChange={(e) => setRescheduleEvent(prev => ({ ...prev, start: e.target.value }))}
                    required
                    min={minDateTime}
                  />
                </div>
                <div className="form-group">
                  <label>Nueva Fecha y Hora de Fin</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={rescheduleEvent.end}
                    onChange={(e) => setRescheduleEvent(prev => ({ ...prev, end: e.target.value }))}
                    required
                    min={minDateTime}
                  />
                </div>
              </div>
              <footer className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsRescheduleModalOpen(false);
                    setSelectedCitaForReschedule(null);
                  }} 
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Cambios
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
      {/* MODAL DE SELECCIÓN DE FECHA (AGENDAR CITA GENERAL) */}
      {isDatePickerModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 130 }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '400px', width: '90%' }}>
            <header className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={20} style={{ color: 'var(--primary)' }} />
                <span className="modal-title">Seleccionar Fecha de Cita</span>
              </div>
              <button 
                onClick={() => {
                  setIsDatePickerModalOpen(false);
                  setTargetDateInput('');
                }} 
                className="btn-icon" 
                style={{width:'32px', height:'32px'}}
              >
                ✕
              </button>
            </header>
            <div className="modal-body">
              <div className="form-group">
                <label>Elige la fecha para la cita</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={targetDateInput}
                  onChange={(e) => setTargetDateInput(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>
            <footer className="modal-footer">
              <button 
                type="button" 
                onClick={() => {
                  setIsDatePickerModalOpen(false);
                  setTargetDateInput('');
                }} 
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={() => {
                  if (!targetDateInput) {
                    showToast('Por favor, selecciona una fecha.', false);
                    return;
                  }
                  const parts = targetDateInput.split('-');
                  const year = parseInt(parts[0]);
                  const month = parseInt(parts[1]) - 1;
                  const day = parseInt(parts[2]);
                  const targetDate = new Date(year, month, day);

                  setCurrentDate(targetDate);
                  setSelectedDayForAgenda(targetDate);
                  setIsDatePickerModalOpen(false);
                  setTargetDateInput('');
                }} 
                className="btn btn-primary"
              >
                Ir a la Agenda de ese Día
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
