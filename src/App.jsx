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
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [gcalConnected, setGcalConnected] = useState(false);

  // Embedded mode state (e.g. inside Chatwoot iframe)
  const [isEmbedded, setIsEmbedded] = useState(false);

  // Active chat state
  const [activeChatPhone, setActiveChatPhone] = useState(null);
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
    supabaseUrl: localStorage.getItem('crm_supabase_url') || '',
    supabaseAnonKey: localStorage.getItem('crm_supabase_anon_key') || '',
    googleClientId: localStorage.getItem('crm_google_client_id') || '',
    calendarId: localStorage.getItem('crm_calendar_id') || 'primary',
    chatwootAccountId: localStorage.getItem('crm_chatwoot_account_id') || '1'
  });

  // Calendar month state
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 21)); // May 2026

  // Detect query parameters on mount to check if embedded in Chatwoot
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const embedParam = params.get('embed');
    const phoneParam = params.get('phone') || params.get('phone_number');
    
    if (embedParam === 'true') {
      setIsEmbedded(true);
      setActiveTab('chats'); // Default to chats when embedded
    }
    
    if (phoneParam) {
      // Decode phone parameter
      const formatted = decodeURIComponent(phoneParam).trim();
      setActiveChatPhone(formatted);
    }
  }, []);

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
      showToast('Por favor, configura tu Google Client ID en la pestaña de Configuración', false);
      setActiveTab('integrations');
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
      const messages = await api.getChatHistory(phone);
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
      await api.sendWhatsAppMessage(activeChatPhone, content);
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
    
    // Set custom env variables for runtime
    import.meta.env.VITE_SUPABASE_URL = settings.supabaseUrl;
    import.meta.env.VITE_SUPABASE_ANON_KEY = settings.supabaseAnonKey;

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
              className={`menu-item ${activeTab === 'crm' ? 'active' : ''}`}
              onClick={() => setActiveTab('crm')}
            >
              <Users size={20} />
              CRM Pipeline
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
            <button 
              className={`menu-item ${activeTab === 'integrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('integrations')}
            >
              <Settings size={20} />
              Configuración
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
              <h1 style={{textTransform: 'capitalize'}}>{activeTab === 'crm' ? 'Pipeline CRM' : activeTab}</h1>
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
              <div className="dashboard-view animate-fade-in">
                {/* KPI Metrics cards */}
                <div className="metrics-grid">
                  <div className="glass-card metric-card">
                    <div className="metric-icon-wrapper" style={{background: 'rgba(139, 92, 246, 0.15)', color: 'var(--primary)'}}>
                      <Users size={24} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label">Contactos Totales</span>
                      <span className="metric-value">{totalLeads}</span>
                      <span className="metric-change positive">Activos en WhatsApp</span>
                    </div>
                  </div>

                  <div className="glass-card metric-card">
                    <div className="metric-icon-wrapper" style={{background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)'}}>
                      <CalendarIcon size={24} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label">Citas Agendadas</span>
                      <span className="metric-value">{appointments.length}</span>
                      <span className="metric-change positive">
                        {gcalConnected ? 'Google Calendar ONLINE' : 'Modo Demo (Offline)'}
                      </span>
                    </div>
                  </div>

                  <div className="glass-card metric-card">
                    <div className="metric-icon-wrapper" style={{background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)'}}>
                      <MessageSquare size={24} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label">Conversaciones del Bot</span>
                      <span className="metric-value">{totalLeads}</span>
                      <span className="metric-change positive">IA activa (Gemini)</span>
                    </div>
                  </div>

                  <div className="glass-card metric-card">
                    <div className="metric-icon-wrapper" style={{background: 'rgba(14, 165, 233, 0.15)', color: 'var(--info)'}}>
                      <ArrowUpRight size={24} />
                    </div>
                    <div className="metric-info">
                      <span className="metric-label">Tasa de Conversión</span>
                      <span className="metric-value">{conversionRate}%</span>
                      <span className="metric-change positive">Chat → Cita</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard charts and details */}
                <div className="charts-grid">
                  <div className="glass-card" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                    <div style={{display:'flex', justifyContent:'between', alignItems:'center'}}>
                      <h2 style={{fontSize: '1.1rem'}}>Efectividad del Embudo de Citas</h2>
                    </div>
                    
                    {/* CUSTOM PREMIUM SVG BAR CHART */}
                    <div style={{flexGrow: 1, minHeight: '220px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '20px 0 10px 0'}}>
                      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1}}>
                        <div style={{
                          height: `${Math.max(20, (totalLeads / (totalLeads || 1)) * 180)}px`, 
                          width: '45px', 
                          background: 'linear-gradient(to top, rgba(139, 92, 246, 0.2), var(--primary))', 
                          borderRadius: '8px 8px 0 0',
                          boxShadow: '0 4px 12px var(--primary-glow)',
                          transition: 'height 1s ease'
                        }}></div>
                        <span style={{fontSize: '0.85rem', fontWeight: 600}}>{totalLeads}</span>
                        <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Leads Totales</span>
                      </div>

                      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1}}>
                        <div style={{
                          height: `${Math.max(20, (contactedCount / (totalLeads || 1)) * 180)}px`, 
                          width: '45px', 
                          background: 'linear-gradient(to top, rgba(96, 165, 250, 0.2), #60a5fa)', 
                          borderRadius: '8px 8px 0 0',
                          transition: 'height 1s ease'
                        }}></div>
                        <span style={{fontSize: '0.85rem', fontWeight: 600}}>{contactedCount}</span>
                        <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Contactados</span>
                      </div>

                      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1}}>
                        <div style={{
                          height: `${Math.max(20, (scheduledCount / (totalLeads || 1)) * 180)}px`, 
                          width: '45px', 
                          background: 'linear-gradient(to top, rgba(245, 158, 11, 0.2), var(--warning))', 
                          borderRadius: '8px 8px 0 0',
                          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                          transition: 'height 1s ease'
                        }}></div>
                        <span style={{fontSize: '0.85rem', fontWeight: 600}}>{scheduledCount}</span>
                        <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Citas Agendadas</span>
                      </div>

                      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1}}>
                        <div style={{
                          height: `${Math.max(20, (completedCount / (totalLeads || 1)) * 180)}px`, 
                          width: '45px', 
                          background: 'linear-gradient(to top, rgba(16, 185, 129, 0.2), var(--success))', 
                          borderRadius: '8px 8px 0 0',
                          boxShadow: '0 4px 12px var(--success-glow)',
                          transition: 'height 1s ease'
                        }}></div>
                        <span style={{fontSize: '0.85rem', fontWeight: 600}}>{completedCount}</span>
                        <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Completadas</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                    <h2 style={{fontSize: '1.1rem'}}>Próximas Citas (Google Calendar)</h2>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '250px'}}>
                      {appointments.length === 0 ? (
                        <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0'}}>
                          No hay citas programadas próximamente.
                        </p>
                      ) : (
                        appointments.slice(0, 4).map(app => {
                          const date = new Date(app.start.dateTime);
                          return (
                            <div key={app.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                              padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '10px',
                              borderLeft: '4px solid var(--primary)'
                            }}>
                              <div style={{overflow: 'hidden', marginRight: '10px'}}>
                                <p style={{fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{app.summary}</p>
                                <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                                  {date.toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'short'})} a las {date.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}
                                </p>
                              </div>
                              <button onClick={() => handleDeleteAppointment(app.id)} className="btn-icon" style={{width:'30px', height:'30px', borderRadius:'6px', color:'var(--danger)'}} title="Cancelar Cita">
                                <Trash size={14} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* WhatsApp bot active monitor */}
                <div className="glass-card" style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                  <h2 style={{fontSize:'1.1rem'}}>Monitoreo de Agentes en Tiempo Real</h2>
                  <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                    {leads.slice(0, 3).map(lead => (
                      <div key={lead.phone_number} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                        padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px'
                      }}>
                        <div style={{display:'flex', alignItems:'center', gap:'14px'}}>
                          <div className="chat-avatar" style={{width:'40px', height:'40px', fontSize:'0.9rem'}}>
                            {lead.client_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p style={{fontWeight:600, fontSize:'0.925rem'}}>{lead.client_name} <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>({lead.phone_number})</span></p>
                            <p style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>{lead.internal_notes || 'Sin notas del bot'}</p>
                          </div>
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                          {getStatusBadge(lead.status)}
                          <button onClick={() => {
                            setActiveChatPhone(lead.phone_number);
                            setActiveTab('chats');
                          }} className="btn btn-secondary" style={{padding:'6px 12px', fontSize:'0.8rem'}}>
                            Ver Conversación
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. CRM PIPELINE VIEW */}
            {activeTab === 'crm' && (
              <div className="crm-view animate-fade-in">
                <div className="crm-header">
                  <div className="search-input-wrapper">
                    <Search size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre o celular..." 
                      className="search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="crm-actions">
                    <button onClick={() => {
                      setSelectedLead({
                        phone_number: `+51 9${Math.floor(10000000 + Math.random() * 90000000)}`,
                        client_name: '',
                        client_email: '',
                        status: 'lead',
                        internal_notes: ''
                      });
                      setIsLeadModalOpen(true);
                    }} className="btn btn-primary">
                      <Plus size={16} /> Nuevo Lead
                    </button>
                  </div>
                </div>

                <div className="kanban-board">
                  {/* Pipeline columns */}
                  {['lead', 'contacted', 'scheduled', 'completed', 'lost'].map(statusName => {
                    const statusLeads = filteredLeads.filter(l => l.status === statusName);
                    
                    return (
                      <div key={statusName} className="kanban-column">
                        <div className="column-header">
                          <div className="column-title">
                            <div style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              background: statusName === 'lead' ? '#ef4444' : 
                                          statusName === 'contacted' ? '#3b82f6' : 
                                          statusName === 'scheduled' ? '#f59e0b' : 
                                          statusName === 'completed' ? '#10b981' : '#94a3b8'
                            }}></div>
                            <span style={{textTransform:'capitalize'}}>{statusName === 'lead' ? 'Nuevo' : statusName === 'contacted' ? 'Contactado' : statusName === 'scheduled' ? 'Agendado' : statusName === 'completed' ? 'Completado' : 'Perdido'}</span>
                          </div>
                          <span className="column-badge">{statusLeads.length}</span>
                        </div>
                        <div className="kanban-cards">
                          {statusLeads.length === 0 ? (
                            <div style={{
                              padding: '24px 0', border: '1px dashed var(--border-color)', 
                              borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem'
                            }}>
                              Vacío
                            </div>
                          ) : (
                            statusLeads.map(lead => (
                              <div key={lead.phone_number} className="kanban-card">
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                  <div className="card-client-name">{lead.client_name}</div>
                                  <button onClick={() => {
                                    setSelectedLead(lead);
                                    setIsLeadModalOpen(true);
                                  }} style={{background:'none', border:'none', color:'var(--primary)', cursor:'pointer', fontSize:'0.75rem', fontWeight:600}}>
                                    Editar
                                  </button>
                                </div>
                                <div className="card-phone">
                                  <Phone size={12} />
                                  <span>{lead.phone_number}</span>
                                </div>
                                <p style={{fontSize:'0.75rem', color:'var(--text-secondary)', marginBottom:'12px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
                                  {lead.internal_notes || 'Sin notas.'}
                                </p>
                                <div className="card-footer">
                                  <div className="card-time">
                                    <Clock size={10} />
                                    <span>{new Date(lead.updated_at).toLocaleDateString()}</span>
                                  </div>
                                  <div style={{display:'flex', gap:'4px'}}>
                                    {/* Move buttons for kanban columns */}
                                    {statusName !== 'lead' && (
                                      <button 
                                        onClick={() => handleStatusChange(lead.phone_number, statusName === 'contacted' ? 'lead' : statusName === 'scheduled' ? 'contacted' : statusName === 'completed' ? 'scheduled' : 'completed')}
                                        style={{padding:'2px 4px', background:'var(--bg-tertiary)', border:'none', borderRadius:'4px', color:'var(--text-secondary)', cursor:'pointer'}}
                                        title="Retroceder estado"
                                      >
                                        ←
                                      </button>
                                    )}
                                    {statusName !== 'lost' && statusName !== 'completed' && (
                                      <button 
                                        onClick={() => handleStatusChange(lead.phone_number, statusName === 'lead' ? 'contacted' : statusName === 'contacted' ? 'scheduled' : 'completed')}
                                        style={{padding:'2px 4px', background:'var(--bg-tertiary)', border:'none', borderRadius:'4px', color:'var(--text-secondary)', cursor:'pointer'}}
                                        title="Avanzar estado"
                                      >
                                        →
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. CHATS WHATSAPP MONITOR VIEW */}
            {activeTab === 'chats' && (
              <div className="chats-view animate-fade-in">
                {/* Chats Sidebar */}
                <div className="chats-sidebar">
                  <div className="chats-sidebar-header">
                    <div className="search-input-wrapper" style={{width: '100%'}}>
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar chat..." 
                        className="search-input"
                        style={{width: '100%'}}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="chats-list">
                    {filteredLeads.map(lead => (
                      <div 
                        key={lead.phone_number} 
                        className={`chat-item ${activeChatPhone === lead.phone_number ? 'active' : ''}`}
                        onClick={() => setActiveChatPhone(lead.phone_number)}
                      >
                        <div className="chat-avatar">
                          {lead.client_name.slice(0, 2).toUpperCase() || 'WA'}
                        </div>
                        <div className="chat-info">
                          <div className="chat-name-row">
                            <span className="chat-name">{lead.client_name || lead.phone_number}</span>
                          </div>
                          <span className="chat-last-message">{lead.phone_number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chat Panel */}
                <div className="chat-area">
                  {activeChatPhone ? (
                    <>
                      {/* Chat Header */}
                      <header className="chat-header">
                        <div className="chat-header-client">
                          <div className="chat-avatar" style={{width: '40px', height: '40px'}}>
                            {leads.find(l => l.phone_number === activeChatPhone)?.client_name.slice(0, 2).toUpperCase() || 'WA'}
                          </div>
                          <div>
                            <span className="chat-name" style={{fontSize: '1rem'}}>
                              {leads.find(l => l.phone_number === activeChatPhone)?.client_name || activeChatPhone}
                            </span>
                            <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px'}}>
                              <Phone size={10} /> {activeChatPhone}
                            </p>
                          </div>
                        </div>
                        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                          {/* Direct link to Chatwoot Dashboard */}
                          <a 
                            href={`https://app.chatwoot.com/app/accounts/${settings.chatwootAccountId}/dashboard`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-secondary" 
                            style={{padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none'}}
                          >
                            Abrir en Chatwoot <ExternalLink size={14} />
                          </a>
                          <button onClick={() => {
                            const found = leads.find(l => l.phone_number === activeChatPhone);
                            if (found) {
                              setSelectedLead(found);
                              setIsLeadModalOpen(true);
                            }
                          }} className="btn btn-secondary" style={{padding: '8px 14px', fontSize: '0.85rem'}}>
                            Editar Datos CRM
                          </button>
                        </div>
                      </header>

                      {/* Chat Messages */}
                      <div className="chat-messages">
                        {chatMessages.length === 0 ? (
                          <div style={{display:'flex', justifyContent:'center', alignItems:'center', flexGrow:1, color:'var(--text-muted)'}}>
                            No hay mensajes en esta conversación. Escribe un mensaje abajo para simular.
                          </div>
                        ) : (
                          chatMessages.map(msg => (
                            <div 
                              key={msg.id} 
                              className={`message-bubble ${msg.sender === 'client' ? 'incoming' : 'outgoing'}`}
                            >
                              <p style={{whiteSpace:'pre-wrap'}}>{msg.content}</p>
                              <div className="message-meta">
                                <span className="message-sender-type" style={{color: msg.sender === 'client' ? 'var(--primary)' : 'rgba(255,255,255,0.7)'}}>
                                  {msg.sender_type || (msg.sender === 'client' ? 'Cliente' : 'Agente')}
                                </span>
                                <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Message Input */}
                      <form onSubmit={handleSendMessage} className="chat-input-bar">
                        <input 
                          type="text" 
                          placeholder="Intervenir conversación y responder como humano..." 
                          className="chat-input"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary" style={{width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', padding: 0}}>
                          <Send size={18} />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div style={{display:'flex', justifyContent:'center', alignItems:'center', flexGrow:1, color:'var(--text-muted)'}}>
                      Selecciona una conversación del panel izquierdo o conéctate vía Chatwoot.
                    </div>
                  )}
                </div>

                {/* Right Quick CRM Panel */}
                {activeChatPhone && (
                  <div className="chats-detail-panel">
                    <div>
                      <div className="panel-section-title">Detalles CRM</div>
                      <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                        <div>
                          <label style={{fontSize:'0.75rem', color:'var(--text-secondary)', fontWeight:600}}>Nombre:</label>
                          <p style={{fontWeight:600}}>{leads.find(l => l.phone_number === activeChatPhone)?.client_name || 'Sin Nombre'}</p>
                        </div>
                        <div>
                          <label style={{fontSize:'0.75rem', color:'var(--text-secondary)', fontWeight:600}}>Correo:</label>
                          <p style={{fontSize:'0.85rem'}}>{leads.find(l => l.phone_number === activeChatPhone)?.client_email || 'Sin correo'}</p>
                        </div>
                        <div>
                          <label style={{fontSize:'0.75rem', color:'var(--text-secondary)', fontWeight:600}}>Estado en CRM:</label>
                          <div style={{marginTop:'4px'}}>
                            {getStatusBadge(leads.find(l => l.phone_number === activeChatPhone)?.status)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{borderTop:'1px solid var(--border-color)', paddingTop:'20px'}}>
                      <div className="panel-section-title">Notas de Asistencia</div>
                      <textarea 
                        className="form-control"
                        rows={6}
                        style={{width:'100%', resize:'none', fontSize:'0.85rem'}}
                        placeholder="Escribe notas sobre este paciente (tratamiento requerido, dolores, detalles de pago)..."
                        value={leads.find(l => l.phone_number === activeChatPhone)?.internal_notes || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          const lead = leads.find(l => l.phone_number === activeChatPhone);
                          if (!lead) return;
                          
                          // Quick local update
                          setLeads(prev => prev.map(l => l.phone_number === activeChatPhone ? { ...l, internal_notes: val } : l));
                          
                          // Debounced API call simulation
                          await api.updateLead({ ...lead, internal_notes: val });
                        }}
                      />
                      <p style={{fontSize:'0.7rem', color:'var(--text-muted)', marginTop:'6px'}}>Las notas se guardan automáticamente.</p>
                    </div>

                    <div style={{borderTop:'1px solid var(--border-color)', paddingTop:'20px', marginTop:'auto'}}>
                      <button 
                        onClick={() => {
                          setNewEvent(prev => ({ ...prev, phone_number: activeChatPhone, summary: `${leads.find(l => l.phone_number === activeChatPhone)?.client_name || 'Cliente'} - Consulta` }));
                          setIsAppointmentModalOpen(true);
                        }}
                        className="btn btn-primary" 
                        style={{width:'100%', justifyContent:'center'}}
                        disabled={!gcalConnected}
                        title={!gcalConnected ? 'Debes conectar Google Calendar primero' : ''}
                      >
                        Agendar Cita GCal
                      </button>
                    </div>
                  </div>
                )}
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

            {/* 5. INTEGRATIONS / CONFIGURATION VIEW */}
            {activeTab === 'integrations' && (
              <div className="integrations-view animate-fade-in">
                {/* Integration status overview */}
                <div className="glass-card" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <h2 style={{fontSize: '1.25rem'}}>Estado del Backend</h2>
                  
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: '16px'}}>
                    <div style={{background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px'}}>
                        <span style={{fontWeight:600, fontSize:'0.9rem'}}>Google Calendar API</span>
                        {gcalConnected ? (
                          <span style={{color:'#10b981', fontSize:'0.75rem', fontWeight:600}}>CONECTADO</span>
                        ) : (
                          <span style={{color:'#f59e0b', fontSize:'0.75rem', fontWeight:600}}>DEMO (OFFLINE)</span>
                        )}
                      </div>
                      <p style={{fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:'12px'}}>
                        {gcalConnected 
                          ? 'El frontend está consultando la API de Google de forma directa y segura con tu sesión activa.' 
                          : 'Carga tu Client ID de Google abajo y haz clic en el botón de conexión para usar tu cuenta.'}
                      </p>
                      {gcalConnected ? (
                        <button onClick={handleGoogleLogout} className="btn btn-secondary" style={{width:'100%', justifyContent:'center'}}>
                          Cerrar Sesión Google
                        </button>
                      ) : (
                        <button onClick={handleGoogleLogin} className="btn btn-primary" style={{width:'100%', justifyContent:'center'}}>
                          Conectar con Google
                        </button>
                      )}
                    </div>

                    <div style={{background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px'}}>
                        <span style={{fontWeight:600, fontSize:'0.9rem'}}>Supabase DB</span>
                        {api.supabase ? (
                          <span style={{color:'#10b981', fontSize:'0.75rem', fontWeight:600}}>ONLINE</span>
                        ) : (
                          <span style={{color:'#f59e0b', fontSize:'0.75rem', fontWeight:600}}>SIMULADO</span>
                        )}
                      </div>
                      <p style={{fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:'12px'}}>
                        {api.supabase 
                          ? 'La base de datos de Supabase está enlazada. Los mensajes de WhatsApp e información de leads se persisten en tiempo real.' 
                          : 'Configura la URL de tu proyecto y tu clave anónima para conectarte a las tablas clínicas.'}
                      </p>
                      <button onClick={() => {
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                      }} className="btn btn-secondary" style={{width:'100%', justifyContent:'center'}}>
                        Configurar Supabase
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass-card">
                  <h2 style={{fontSize: '1.25rem', marginBottom: '8px'}}>Configuración de Integraciones</h2>
                  <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px'}}>
                    Configura tus credenciales. Los datos se almacenan de forma local en tu navegador para máxima seguridad.
                  </p>

                  <form onSubmit={handleSaveSettings} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    <div style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '16px'}}>
                      <h3 style={{fontSize:'1rem', marginBottom:'12px', color:'var(--primary)'}}>Google Calendar (Conexión Directa)</h3>
                      <div className="form-group" style={{marginBottom:'12px'}}>
                        <label>Google Cloud OAuth Client ID</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="xxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                          value={settings.googleClientId}
                          onChange={(e) => setSettings(prev => ({ ...prev, googleClientId: e.target.value }))}
                        />
                        <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'4px'}}>
                          Obtén este Client ID en tu Consola de Google Cloud (debe ser una credencial de tipo "Web Application" con `http://localhost:5173` o tu dominio añadido en los orígenes autorizados).
                        </p>
                      </div>

                      <div className="form-group">
                        <label>Calendar ID (Correo de Agenda)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="primary o tuemail@gmail.com"
                          value={settings.calendarId}
                          onChange={(e) => setSettings(prev => ({ ...prev, calendarId: e.target.value }))}
                        />
                        <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'4px'}}>
                          Usa <code style={{color:'var(--primary)'}}>primary</code> para la agenda predeterminada de tu cuenta o introduce un correo si usas un calendario secundario compartido.
                        </p>
                      </div>
                    </div>

                    <div style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '16px'}}>
                      <h3 style={{fontSize:'1rem', marginBottom:'12px', color:'var(--primary)'}}>Chatwoot (Dashboard Integration)</h3>
                      <div className="form-group">
                        <label>ID de Cuenta de Chatwoot</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Ej. 1"
                          value={settings.chatwootAccountId}
                          onChange={(e) => setSettings(prev => ({ ...prev, chatwootAccountId: e.target.value }))}
                        />
                        <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'4px'}}>
                          El identificador numérico de tu cuenta que aparece en la URL de Chatwoot (ej. `https://app.chatwoot.com/app/accounts/XXXX`). Esto sirve para generar enlaces directos a tus chats de mensajería.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 style={{fontSize:'1rem', marginBottom:'12px', color:'var(--primary)'}}>Base de Datos Supabase</h3>
                      <div className="form-group" style={{marginBottom:'12px'}}>
                        <label><Database size={14} style={{verticalAlign:'middle', marginRight:'6px'}}/> Supabase URL</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="https://yourproject.supabase.co"
                          value={settings.supabaseUrl}
                          onChange={(e) => setSettings(prev => ({ ...prev, supabaseUrl: e.target.value }))}
                        />
                      </div>

                      <div className="form-group">
                        <label><Database size={14} style={{verticalAlign:'middle', marginRight:'6px'}}/> Supabase Anon Key</label>
                        <input 
                          type="password" 
                          className="form-control" 
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          value={settings.supabaseAnonKey}
                          onChange={(e) => setSettings(prev => ({ ...prev, supabaseAnonKey: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div style={{display:'flex', justifyContent:'flex-end', gap:'12px', marginTop:'10px'}}>
                      <button type="submit" className="btn btn-primary">
                        Guardar Configuración
                      </button>
                    </div>
                  </form>
                </div>

                <div className="glass-card" style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                  <h2 style={{fontSize:'1.1rem'}}>Configurar tu Base de Datos en Supabase</h2>
                  
                  <div style={{fontSize:'0.9rem', lineHeight:'1.6', display:'flex', flexDirection:'column', gap:'16px'}}>
                    <div>
                      <p style={{fontWeight:600, color:'var(--primary)'}}>Crear la Tabla de Leads para el CRM</p>
                      <p>Ejecuta la siguiente consulta SQL en la sección **SQL Editor** de tu consola de Supabase para añadir el soporte de estados del embudo y notas clínicas:</p>
                      <pre style={{background:'var(--bg-tertiary)', padding:'12px', borderRadius:'8px', fontSize:'0.75rem', overflowX:'auto', marginTop:'8px', border:'1px solid var(--border-color)', color:'#a78bfa'}}>
{`CREATE TABLE IF NOT EXISTS crm_leads (
    phone_number VARCHAR PRIMARY KEY, -- Se enlaza con sessionKey de mensajes_whatsapp
    client_name VARCHAR,
    client_email VARCHAR,
    status VARCHAR DEFAULT 'lead' CHECK (status IN ('lead', 'contacted', 'scheduled', 'completed', 'lost')),
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Habilitar actualizaciones en tiempo real
alter publication supabase_realtime add table crm_leads;
alter publication supabase_realtime add table mensajes_whatsapp;`}
                      </pre>
                    </div>
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
