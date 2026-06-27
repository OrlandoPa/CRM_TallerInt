import { useState, useEffect } from 'react';
import { 
  Check, 
  AlertCircle, 
  RefreshCw
} from 'lucide-react';

import * as api from './services/api';
import { isValidWorkingHours, calculateEndTime } from './utils/dateHelpers';

// Layout components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Tab views
import DashboardView from './components/views/DashboardView';
import AgendaView from './components/views/AgendaView';
import AttendanceView from './components/views/AttendanceView';
import ChatsView from './components/views/ChatsView';
import CalendarView from './components/views/CalendarView';

// Modals
import LeadModal from './components/modals/LeadModal';
import AppointmentModal from './components/modals/AppointmentModal';
import DayAgendaModal from './components/modals/DayAgendaModal';
import DetailModal from './components/modals/DetailModal';
import RescheduleModal from './components/modals/RescheduleModal';
import DatePickerModal from './components/modals/DatePickerModal';

const getInitialParams = () => {
  if (typeof window === 'undefined') return { isEmbedded: false, activeTab: 'dashboard', phone: null, convId: null };
  const params = new URLSearchParams(window.location.search);
  const isEmbedded = params.get('embed') === 'true';
  const phoneParam = params.get('phone') || params.get('phone_number');
  const conversationIdParam = params.get('conversation_id');
  return {
    isEmbedded,
    activeTab: isEmbedded ? 'chats' : 'dashboard',
    phone: phoneParam ? decodeURIComponent(phoneParam).trim() : null,
    convId: conversationIdParam || null
  };
};

const initialParams = getInitialParams();

function App() {
  const [activeTab, setActiveTab] = useState(initialParams.activeTab);
  const [theme, setTheme] = useState('dark');
  const [leads, setLeads] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [citasDb, setCitasDb] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [gcalConnected, setGcalConnected] = useState(() => !!api.getGCalToken());

  // Embedded mode state (e.g. inside Chatwoot iframe)
  const [isEmbedded] = useState(initialParams.isEmbedded);

  // Active chat state
  const [activeChatPhone, setActiveChatPhone] = useState(initialParams.phone);
  const [activeConversationId] = useState(initialParams.convId);

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
  const [settings] = useState({
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

  const chatwootDashboardUrl = api.getChatwootDashboardUrl(activeConversationId);
  const chatwootEmbedUrl = chatwootDashboardUrl;

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

      const fetchedPacientes = await api.getPacientes();
      const fetchedCitasDb = await api.getCitasDb();
      setPacientes(fetchedPacientes);
      setCitasDb(fetchedCitasDb);
      
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

  // Verify Google Token on mount, settings changes, or month changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, currentDate]);

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

    const validation = isValidWorkingHours(new Date(newEvent.start), new Date(newEvent.end));
    if (!validation.valid) {
      showToast(validation.reason, false);
      return;
    }

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

  const minDateTime = new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);

  // Filter past appointments pending attendance review
  const pastAppointmentsToReview = citasDb.filter(cita => {
    if (!cita.fecha_hora_cita) return false;
    const isPast = new Date(cita.fecha_hora_cita) < new Date();
    const isPendingAttendance = cita.estado_cita === 'AGENDADA' || cita.estado_cita === 'CONFIRMADA' || !cita.estado_cita;
    return isPast && isPendingAttendance;
  });

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
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          theme={theme} 
          toggleTheme={toggleTheme} 
          pastAppointmentsToReview={pastAppointmentsToReview}
        />
      )}

      {/* Main Container */}
      <main className="main-content">
        {/* Header bar - HIDE IF EMBEDDED */}
        {!isEmbedded && (
          <Header 
            activeTab={activeTab} 
            gcalConnected={gcalConnected} 
            handleGoogleLogin={handleGoogleLogin} 
            handleGoogleLogout={handleGoogleLogout} 
            handleRefresh={handleRefresh} 
            supabaseOnline={!!api.supabase}
          />
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
            {activeTab === 'dashboard' && (
              <DashboardView 
                citasDb={citasDb}
                appointments={appointments}
                pacientes={pacientes}
                gcalConnected={gcalConnected}
                onOpenDetail={handleOpenDetailFromGCal}
                onDeleteAppointment={handleDeleteAppointment}
              />
            )}

            {activeTab === 'agenda' && (
              <AgendaView 
                selectedAgendaDate={selectedAgendaDate}
                setSelectedAgendaDate={setSelectedAgendaDate}
                appointments={appointments}
                citasDb={citasDb}
                gcalConnected={gcalConnected}
                onOpenDetail={handleOpenDetailFromGCal}
                onDeleteAppointment={handleDeleteAppointment}
                onAddAppointmentFromSlot={(slot) => {
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
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceView 
                pastAppointmentsToReview={pastAppointmentsToReview}
                onMarkAttendance={handleUpdateAppointmentStatus}
                onOpenReschedule={(cita) => {
                  setSelectedCitaForReschedule(cita);
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const tomorrowStr = tomorrow.toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
                  const tomorrowEndStr = new Date(tomorrow.getTime() + 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
                  setRescheduleEvent({ start: tomorrowStr, end: tomorrowEndStr });
                  setIsRescheduleModalOpen(true);
                }}
              />
            )}

            {activeTab === 'chats' && (
              <ChatsView 
                chatwootEmbedUrl={chatwootEmbedUrl} 
                chatwootDashboardUrl={chatwootDashboardUrl}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarView 
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                appointments={appointments}
                citasDb={citasDb}
                gcalConnected={gcalConnected}
                onOpenDetail={handleOpenDetailFromGCal}
                onSelectDay={(day) => {
                  setSelectedDayForAgenda(day);
                }}
                onAddAppointment={() => {
                  const todayStr = new Date().toLocaleString('sv-SE').slice(0, 10);
                  setTargetDateInput(todayStr);
                  setIsDatePickerModalOpen(true);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* MODALS */}
      <LeadModal 
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        lead={selectedLead}
        onChange={setSelectedLead}
        onSubmit={handleUpdateLead}
      />

      <AppointmentModal 
        isOpen={isAppointmentModalOpen}
        onClose={closeAppointmentModal}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
        isNewPatient={isNewPatient}
        setIsNewPatient={setIsNewPatient}
        newPatientName={newPatientName}
        setNewPatientName={setNewPatientName}
        newPatientPhone={newPatientPhone}
        setNewPatientPhone={setNewPatientPhone}
        treatmentType={treatmentType}
        setTreatmentType={setTreatmentType}
        sendEmailReminder={sendEmailReminder}
        setSendEmailReminder={setSendEmailReminder}
        gcalConnected={gcalConnected}
        isTimeLocked={isTimeLocked}
        leads={leads}
        minDateTime={minDateTime}
        onSubmit={handleCreateAppointment}
      />

      <DayAgendaModal 
        selectedDay={selectedDayForAgenda}
        onClose={() => setSelectedDayForAgenda(null)}
        citasDb={citasDb}
        appointments={appointments}
        gcalConnected={gcalConnected}
        onOpenDetail={handleOpenDetailFromGCal}
        onDeleteAppointment={handleDeleteAppointment}
        onAddAppointmentFromSlot={(slot) => {
          const [hours, minutes] = slot.split(':').map(Number);
          const startStr = new Date(
            selectedDayForAgenda.getFullYear(), 
            selectedDayForAgenda.getMonth(), 
            selectedDayForAgenda.getDate(), 
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
      />

      <DetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedAppointmentDetails={selectedAppointmentDetails}
        onDelete={(eventId) => {
          handleDeleteAppointment(eventId);
          setIsDetailModalOpen(false);
        }}
        onReschedule={(cita) => {
          setSelectedCitaForReschedule(cita);
          const date = cita.fecha_hora_cita ? new Date(cita.fecha_hora_cita) : new Date();
          const startStr = date.toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
          const endStr = new Date(date.getTime() + 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
          
          setRescheduleEvent({ start: startStr, end: endStr });
          setIsDetailModalOpen(false);
          setIsRescheduleModalOpen(true);
        }}
      />

      <RescheduleModal 
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setSelectedCitaForReschedule(null);
        }}
        selectedCitaForReschedule={selectedCitaForReschedule}
        rescheduleEvent={rescheduleEvent}
        setRescheduleEvent={setRescheduleEvent}
        minDateTime={minDateTime}
        onSubmit={handleRescheduleSubmit}
      />

      <DatePickerModal 
        isOpen={isDatePickerModalOpen}
        onClose={() => {
          setIsDatePickerModalOpen(false);
          setTargetDateInput('');
        }}
        targetDateInput={targetDateInput}
        setTargetDateInput={setTargetDateInput}
        onSubmit={() => {
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
      />
    </div>
  );
}

export default App;
