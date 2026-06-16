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
  const [newEvent, setNewEvent] = useState({
    summary: '',
    start: '',
    end: '',
    description: '',
    phone_number: ''
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
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 21)); // May 2026

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

  // Verify Google Token on mount and settings changes
  useEffect(() => {
    const token = api.getGCalToken();
    setGcalConnected(!!token);
    fetchData();
  }, [settings]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const fetchedLeads = await api.getLeads();
      const fetchedAppointments = await api.getAppointments();
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

    try {
      const desc = newEvent.phone_number 
        ? `${newEvent.description} | Contacto: ${newEvent.phone_number}`
        : newEvent.description;

      await api.createAppointment(
        newEvent.summary,
        new Date(newEvent.start).toISOString(),
        new Date(newEvent.end).toISOString(),
        desc
      );
      
      // If client phone was linked, let's update their lead status to 'scheduled'
      if (newEvent.phone_number) {
        const lead = leads.find(l => l.phone_number === newEvent.phone_number);
        if (lead && lead.status !== 'scheduled') {
          await api.updateLead({ ...lead, status: 'scheduled' });
        }
      }

      fetchData();
      setIsAppointmentModalOpen(false);
      setNewEvent({ summary: '', start: '', end: '', description: '', phone_number: '' });
      showToast('Cita agendada directamente en Google Calendar');
    } catch (err) {
      console.error(err);
      showToast('Error al agendar cita en Google Calendar', false);
    }
  };

  // Delete appointment
  const handleDeleteAppointment = async (eventId) => {
    if (!window.confirm('¿Estás seguro de cancelar esta cita en Google Calendar?')) return;
    try {
      await api.deleteAppointment(eventId);
      setAppointments(prev => prev.filter(app => app.id !== eventId));
      showToast('Cita cancelada correctamente');
    } catch (err) {
      console.error(err);
      showToast('Error al cancelar la cita', false);
    }
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

  // Timeline hours generator for Dentist (10:00 - 13:00, 16:00 - 20:00) in 30-min intervals
  const getTimeSlots = () => {
    const slots = [];
    // Morning: 10:00 AM to 1:00 PM
    for (let hour = 10; hour <= 12; hour++) {
      slots.push(`${hour}:00`);
      slots.push(`${hour}:30`);
    }
    slots.push('13:00');
    // Break indicator
    slots.push('RECESO');
    // Afternoon: 4:00 PM to 8:00 PM
    for (let hour = 16; hour <= 19; hour++) {
      const displayHour = hour;
      slots.push(`${displayHour}:00`);
      slots.push(`${displayHour}:30`);
    }
    slots.push('20:00');
    return slots;
  };

  // Check if an event overlaps with a specific time slot on a specific day
  const getEventForTimeSlot = (slotString, dayDate) => {
    if (slotString === 'RECESO') return null;
    
    const [hours, minutes] = slotString.split(':').map(Number);
    const slotTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hours, minutes);

    return appointments.find(app => {
      const appStart = new Date(app.start.dateTime);
      const appEnd = new Date(app.end.dateTime);
      
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
                {activeTab === 'chats' ? 'Consola de Chatwoot' : activeTab === 'calendar' ? 'Calendario' : activeTab}
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
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px'}}>
                  {/* Card 1: Pacientes Registrados */}
                  <div className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
                    <div className="metric-icon-wrapper" style={{background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '12px', borderRadius: '10px'}}>
                      <Users size={28} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Pacientes Registrados</span>
                      <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{pacientes.length}</span>
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
                      <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{citasDb.length}</span>
                      <span style={{fontSize: '0.75rem', color: '#10b981', fontWeight: 600}}>● Control Clínico</span>
                    </div>
                  </div>

                  {/* Card 3: Google Calendar */}
                  <div className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
                    <div className="metric-icon-wrapper" style={{background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', padding: '12px', borderRadius: '10px'}}>
                      <Clock3 size={28} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Eventos Google Cal</span>
                      <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{appointments.length}</span>
                      <span style={{fontSize: '0.75rem', color: gcalConnected ? '#10b981' : 'var(--text-muted)', fontWeight: 500}}>
                        {gcalConnected ? '● Google Calendar Activo' : '○ Modo Demo (Sin conexión)'}
                      </span>
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
                          const date = cita.fecha_hora_cita ? new Date(cita.fecha_hora_cita) : null;
                          const formattedDate = date 
                            ? date.toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'short'}) + ' a las ' + date.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})
                            : 'Fecha no programada';
                          const patientName = cita.pacientes?.nombre_paciente || 'Paciente sin registrar';
                          
                          return (
                            <div key={cita.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                              padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '10px',
                              borderLeft: '4px solid var(--primary)', border: '1px solid var(--border-color)',
                              borderLeftWidth: '4px', gap: '10px'
                            }}>
                              <div style={{overflow: 'hidden'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                                  <span style={{fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)'}}>{patientName}</span>
                                  <span style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>({cita.telefono_paciente})</span>
                                </div>
                                <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: cita.motivo_consulta ? 'normal' : 'italic', marginBottom: '4px'}}>
                                  {cita.motivo_consulta || 'Sin motivo especificado'}
                                </p>
                                <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                  <Clock size={12} style={{color: 'var(--primary)'}} /> {formattedDate}
                                </p>
                              </div>
                              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0}}>
                                <span style={{
                                  fontSize: '0.7rem', 
                                  fontWeight: 600, 
                                  padding: '2px 8px', 
                                  borderRadius: '4px',
                                  background: cita.estado_cita === 'CONFIRMADA' || cita.estado_cita === 'COMPLETADA' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                  color: cita.estado_cita === 'CONFIRMADA' || cita.estado_cita === 'COMPLETADA' ? '#10b981' : '#f59e0b'
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
                          const date = new Date(app.start.dateTime);
                          return (
                            <div key={app.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                              padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '10px',
                              borderLeft: '4px solid #f59e0b', border: '1px solid var(--border-color)',
                              borderLeftWidth: '4px'
                            }}>
                              <div style={{overflow: 'hidden', marginRight: '10px'}}>
                                <p style={{fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)'}}>{app.summary}</p>
                                <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                                  {date.toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'short'})} a las {date.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}
                                </p>
                              </div>
                              <button onClick={() => handleDeleteAppointment(app.id)} className="btn-icon" style={{width:'30px', height:'30px', borderRadius:'6px', color:'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0}} title="Cancelar Cita">
                                <Trash size={14} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
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
                    <button onClick={() => setCurrentDate(new Date(2026, 4, 1))} className="btn-icon" style={{width:'32px', height:'32px'}}>
                      <ChevronLeft size={16} />
                    </button>
                    <h2 style={{fontSize: '1.25rem', fontWeight: 600}}>
                      {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </h2>
                    <button onClick={() => setCurrentDate(new Date(2026, 5, 1))} className="btn-icon" style={{width:'32px', height:'32px'}}>
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
                      onClick={() => setIsAppointmentModalOpen(true)} 
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
                    {/* May 2026 starts on Friday (5 offset cells) */}
                    {Array.from({ length: 35 }).map((_, idx) => {
                      const dayNumber = idx - 4; // Shift offset for Friday May 1st
                      const isValidDay = dayNumber > 0 && dayNumber <= 31;
                      
                      // Calculate events for this day
                      const dayEvents = appointments.filter(app => {
                        const appDate = new Date(app.start.dateTime);
                        return appDate.getDate() === dayNumber && appDate.getMonth() === 4 && appDate.getFullYear() === 2026;
                      });

                      return (
                        <div 
                          key={idx} 
                          className={`calendar-cell ${!isValidDay ? 'other-month' : ''} ${dayNumber === 21 ? 'today' : ''}`}
                          style={{cursor: isValidDay ? 'pointer' : 'default'}}
                          onClick={() => {
                            if (isValidDay) {
                              setSelectedDayForAgenda(new Date(2026, 4, dayNumber));
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
                                      if (confirm(`Cita: ${evt.summary}\nDetalles: ${evt.description}\n\n¿Deseas cancelar esta cita en Google Calendar?`)) {
                                        handleDeleteAppointment(evt.id);
                                      }
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
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <header className="modal-header">
              <span className="modal-title">Agendar Cita en Google Calendar</span>
              <button onClick={() => setIsAppointmentModalOpen(false)} className="btn-icon" style={{width:'32px', height:'32px'}}>✕</button>
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
                  <label>Vincular a Paciente de WhatsApp (Opcional)</label>
                  <select 
                    className="form-control"
                    value={newEvent.phone_number}
                    onChange={(e) => {
                      const num = e.target.value;
                      const l = leads.find(lead => lead.phone_number === num);
                      setNewEvent(prev => ({ 
                        ...prev, 
                        phone_number: num,
                        summary: l ? `${l.client_name} - Consulta` : prev.summary
                      }));
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
                <div className="form-group">
                  <label>Fecha y Hora de Inicio</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={newEvent.start}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, start: e.target.value }))}
                    required
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
                  />
                </div>
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
                <button type="button" onClick={() => setIsAppointmentModalOpen(false)} className="btn btn-secondary">
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
                        - RECESO DEL DOCTOR (1:00 PM a 4:00 PM) -
                      </div>
                    );
                  }

                  const activeEvent = getEventForTimeSlot(slot, selectedDayForAgenda);
                  
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
                            <div style={{overflow:'hidden', paddingRight:'10px'}}>
                              <span style={{
                                fontWeight:600, fontSize:'0.9rem', color:'var(--text-primary)',
                                display:'block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
                              }}>
                                {activeEvent.summary}
                              </span>
                              <span style={{fontSize:'0.75rem', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'4px'}}>
                                <Clock size={12} />
                                {new Date(activeEvent.start.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(activeEvent.end.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 
                                {` (${Math.round((new Date(activeEvent.end.dateTime) - new Date(activeEvent.start.dateTime)) / 60000)} mins)`}
                              </span>
                            </div>
                            
                            <div style={{display:'flex', gap:'8px', flexShrink:0}}>
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
                                
                                const endStr = new Date(
                                  selectedDayForAgenda.getFullYear(), 
                                  selectedDayForAgenda.getMonth(), 
                                  selectedDayForAgenda.getDate(), 
                                  hours + 1, // Default duration 1h
                                  minutes
                                ).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
                                
                                setNewEvent({
                                  summary: '',
                                  start: startStr,
                                  end: endStr,
                                  description: '',
                                  phone_number: activeChatPhone || ''
                                });
                                setIsAppointmentModalOpen(true);
                              }}
                              className="btn btn-secondary" 
                              style={{padding:'4px 10px', fontSize:'0.75rem', height:'28px'}}
                              disabled={!gcalConnected}
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
    </div>
  );
}

export default App;
