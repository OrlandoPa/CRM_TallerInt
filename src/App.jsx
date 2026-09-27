import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  CalendarX2,
  X
} from 'lucide-react';

import * as api from './services/api';
import { isValidWorkingHours, calculateEndTime, toDateInput, toDateTimeInput } from './utils/dateHelpers';
import { esPendiente } from './utils/estadosCita';

// Layout components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Auth & Views
import LoginView from './components/views/LoginView';
import * as authService from './services/authService';

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
  if (typeof window === 'undefined') return { isEmbedded: false, activeTab: 'dashboard', convId: null };
  const params = new URLSearchParams(window.location.search);
  const isEmbedded = params.get('embed') === 'true';
  return {
    isEmbedded,
    activeTab: isEmbedded ? 'chats' : 'dashboard',
    convId: params.get('conversation_id') || null
  };
};

const initialParams = getInitialParams();

// Configuración de build (variables públicas; nunca secretos)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const REQUIRED_GCAL_GMAIL = import.meta.env.VITE_REQUIRED_GCAL_GMAIL || '';
const SUPABASE_MISSING_MSG = 'Supabase no está configurado. Revisa las variables de entorno.';

const MS_HORA = 60 * 60 * 1000;

function App() {
  const [user, setUser] = useState(null);
  // Sin Supabase no hay sesión que esperar: se muestra el error directamente
  const [authReady, setAuthReady] = useState(!api.supabase);
  const [authError, setAuthError] = useState(api.supabase ? '' : SUPABASE_MISSING_MSG);
  const [activeTab, setActiveTab] = useState(initialParams.activeTab);
  const [theme, setTheme] = useState('light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  const [gcalEmail, setGcalEmail] = useState(api.getGCalEmail);

  // Calendar month state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(new Date());

  const chatwootDashboardUrl = api.getChatwootDashboardUrl(activeConversationId);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const timeMin = new Date(year, month, 1).toISOString();
      const timeMax = new Date(year, month + 1, 1).toISOString();

      // Cada fuente se carga por separado: si una falla, se informa y el resto se muestra igual
      const [leadsRes, appointmentsRes, pacientesRes, citasRes] = await Promise.allSettled([
        api.getLeads(),
        api.getAppointments(timeMin, timeMax),
        api.getPacientes(),
        api.getCitasDb()
      ]);

      if (leadsRes.status === 'fulfilled') setLeads(leadsRes.value);
      if (appointmentsRes.status === 'fulfilled') setAppointments(appointmentsRes.value);
      if (pacientesRes.status === 'fulfilled') setPacientes(pacientesRes.value);
      if (citasRes.status === 'fulfilled') setCitasDb(citasRes.value);
      setGcalConnected(!!api.getGCalToken());

      const errors = [leadsRes, appointmentsRes, pacientesRes, citasRes]
        .filter(r => r.status === 'rejected')
        .map(r => r.reason?.message || String(r.reason));
      if (errors.length > 0) {
        console.error('Errores al sincronizar:', errors);
        setErrorMsg(`Error al sincronizar: ${[...new Set(errors)].join(' · ')}`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(`Error al sincronizar datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  // Sincronizar datos al iniciar sesión y al cambiar el mes del calendario
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        fetchData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, fetchData]);

  // Obtener el correo de la cuenta de Google Calendar conectada
  useEffect(() => {
    const syncGCalEmail = async () => {
      const token = api.getGCalToken();
      if (!token) {
        setGcalEmail('');
        return;
      }
      const stored = api.getGCalEmail();
      if (stored) {
        setGcalEmail(stored);
        return;
      }
      try {
        const email = await api.fetchGoogleEmail(token);
        if (email) {
          api.storeGCalEmail(email);
          setGcalEmail(email);
        }
      } catch (err) {
        console.error('Error al obtener el correo de Google:', err);
      }
    };
    syncGCalEmail();
  }, [gcalConnected]);

  const hasRequiredGCalGmail = !!(gcalConnected && gcalEmail && REQUIRED_GCAL_GMAIL && gcalEmail.toLowerCase() === REQUIRED_GCAL_GMAIL.toLowerCase());

  // Google OAuth Login Flow (Client-side GIS)
  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      showToast('Por favor, configura tu Google Client ID en las variables de entorno (.env).', false);
      return;
    }

    if (!window.google) {
      showToast('La biblioteca de Google no se ha cargado todavía. Reintente en un momento.', false);
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
        callback: async (tokenResponse) => {
          if (tokenResponse.access_token) {
            api.storeGCalToken(tokenResponse.access_token, tokenResponse.expires_in * 1000);

            try {
              const email = await api.fetchGoogleEmail(tokenResponse.access_token);
              if (email) {
                api.storeGCalEmail(email);
                setGcalEmail(email);
              }
            } catch (err) {
              console.error('Error al obtener el correo de Google:', err);
            }

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

  // Toggle Theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Refresh data helper
  const handleRefresh = () => {
    fetchData();
    showToast('Datos actualizados');
  };

  const toastTimeoutRef = useRef(null);

  // Toast notifications helper (4 seconds duration)
  const showToast = (msg, isSuccess = true) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    if (isSuccess) {
      setErrorMsg('');
      setSuccessMsg(msg);
      toastTimeoutRef.current = setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setSuccessMsg('');
      setErrorMsg(msg);
      toastTimeoutRef.current = setTimeout(() => setErrorMsg(''), 4000);
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
      showToast(err.message || 'Error al actualizar lead', false);
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
        sendEmailReminder ? newEvent.email : '',
        newEvent.tratamiento_receta || newEvent.receta_medica || ''
      );

      fetchData();
      closeAppointmentModal();
      showToast('Cita agendada correctamente.');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al agendar la cita en Google Calendar.', false);
    }
  };

  const handleSavePrescription = async (cita, recetaText) => {
    try {
      const result = await api.updateAppointmentPrescription(cita, recetaText);
      
      const gId = cita.google_event_id || result?.google_event_id;
      const dbId = cita.id || result?.id;

      setCitasDb(prev => {
        let matched = false;
        const next = prev.map(c => {
          const isSameDbId = dbId && c.id && String(c.id) === String(dbId);
          const isSameGcal = gId && c.google_event_id && c.google_event_id === gId;

          if (isSameDbId || isSameGcal) {
            matched = true;
            return { ...c, ...result, tratamiento_receta: recetaText };
          }
          return c;
        });
        if (!matched && result) {
          return [...next, result];
        }
        return next;
      });

      setSelectedAppointmentDetails(prev => prev ? { ...prev, tratamiento_receta: recetaText } : prev);
      showToast('Tratamiento / Receta médica guardada en la Base de Datos.');
    } catch (err) {
      console.error('Error saving prescription:', err);
      const errMsg = err?.message || (typeof err === 'string' ? err : 'Error al guardar el tratamiento / receta en la BD.');
      showToast(`Error al guardar en BD: ${errMsg}`, false);
      throw err;
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
      showToast(err.message || 'Error al cancelar la cita', false);
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
      showToast(err.message || 'Error al actualizar el estado de la cita', false);
    }
  };

  // Submit rescheduling
  // El modal entrega el rango ya ajustado a bloques de 30 min (duración de 30 o 60 min)
  const handleRescheduleSubmit = async (e, range) => {
    e.preventDefault();
    if (!selectedCitaForReschedule || !range?.start || !range?.end) return;

    const validation = isValidWorkingHours(range.start, range.end);
    if (!validation.valid) {
      showToast(validation.reason, false);
      return;
    }

    try {
      await api.rescheduleAppointment(
        selectedCitaForReschedule.google_event_id,
        range.start.toISOString(),
        range.end.toISOString()
      );
      showToast('Cita reprogramada con éxito');
      setIsRescheduleModalOpen(false);
      setSelectedCitaForReschedule(null);
      setRescheduleEvent({ start: '', end: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al reprogramar la cita', false);
    }
  };

  const handleAddNewAppointmentDirectly = () => {
    setTargetDateInput(toDateInput(new Date()));
    setIsDatePickerModalOpen(true);
  };

  // Abre el formulario de nueva cita con la hora del bloque libre elegido
  const openAppointmentFromSlot = (day, slot) => {
    const [hours, minutes] = slot.split(':').map(Number);
    const startStr = toDateTimeInput(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes));

    setNewEvent({
      summary: 'Paciente - Evaluación Inicial',
      start: startStr,
      end: calculateEndTime(startStr, 'evaluacion'),
      description: '',
      phone_number: ''
    });
    setIsTimeLocked(true);
    setTreatmentType('evaluacion');
    setIsNewPatient(false);
    setNewPatientName('');
    setNewPatientPhone('');
    setIsAppointmentModalOpen(true);
  };

  // Abre el modal de reprogramación con un rango inicial de 1 h desde `start`
  const openReschedule = (cita, start) => {
    setSelectedCitaForReschedule(cita);
    setRescheduleEvent({
      start: toDateTimeInput(start),
      end: toDateTimeInput(new Date(start.getTime() + MS_HORA))
    });
    setIsRescheduleModalOpen(true);
  };

  const handleOpenDetailFromGCal = (app) => {
    let detailObj;
    if (app && app.fecha_hora_cita && !app.start) {
      detailObj = app;
    } else {
      let dbCita = citasDb.find(c => (c.google_event_id && app.id && c.google_event_id === app.id) || (c.id && app.id && String(c.id) === String(app.id)));
      
      const appStartTime = app.start?.dateTime || app.start?.date || app.fecha_hora_cita;

      // Fallback: match by patient name AND date if not matched by ID
      if (!dbCita && app.summary && appStartTime) {
        const patientNameFromSummary = app.summary.split(' - ')[0].trim().toLowerCase();
        const appDateStr = new Date(appStartTime).toISOString().slice(0, 10);

        if (patientNameFromSummary && patientNameFromSummary !== 'paciente') {
          dbCita = citasDb.find(c => {
            const cName = (c.pacientes?.nombre_paciente || '').toLowerCase().trim();
            const cDateStr = c.fecha_hora_cita ? new Date(c.fecha_hora_cita).toISOString().slice(0, 10) : '';
            return cName === patientNameFromSummary && cDateStr === appDateStr;
          });
        }
      }

      if (dbCita) {
        detailObj = dbCita;
      } else {
        const patientName = app.summary ? app.summary.split(' - ')[0].trim() : 'Paciente GCal';
        const leadMatch = leads.find(l => (l.client_name || '').toLowerCase().trim() === patientName.toLowerCase());
        const pacMatch = pacientes.find(p => (p.nombre_paciente || '').toLowerCase().trim() === patientName.toLowerCase());
        const contactId = (leadMatch?.phone_number) || (pacMatch?.identificador_paciente || pacMatch?.telefono_whatsapp || pacMatch?.telefono_paciente) || '';

        detailObj = {
          id: null,
          google_event_id: app.id,
          fecha_hora_cita: appStartTime,
          motivo_consulta: app.summary,
          estado_cita: 'AGENDADA',
          identificador_paciente: contactId,
          telefono_paciente: contactId,
          correo_electronico: app.correo_electronico || leadMatch?.client_email || '',
          pacientes: { nombre_paciente: patientName, identificador_paciente: contactId }
        };
      }
    }
    
    setSelectedAppointmentDetails(detailObj);
    setIsDetailModalOpen(true);
  };

  const minDateTime = toDateTimeInput(new Date());

  // Filter past appointments pending attendance review
  const pastAppointmentsToReview = citasDb.filter(cita => {
    if (!cita.fecha_hora_cita) return false;
    const isPast = new Date(cita.fecha_hora_cita) < new Date();
    const isPendingAttendance = esPendiente(cita.estado_cita);
    return isPast && isPendingAttendance;
  });

  // Sesión real de Supabase Auth: es la única fuente de verdad del login.
  // La RLS de Supabase valida el JWT de esta sesión en cada consulta.
  useEffect(() => {
    if (!api.supabase) return;

    const applySession = (session) => {
      if (!session) {
        setUser(null);
        return;
      }
      const result = authService.userFromSession(session);
      if (result.success) {
        authService.storeGCalTokenFromSession(session);
        setGcalConnected(!!api.getGCalToken());
        // La cuenta del CRM es la misma que la de Google Calendar
        api.storeGCalEmail(result.user.email);
        setGcalEmail(result.user.email);
        setAuthError('');
        setUser(result.user);
      } else {
        setAuthError(result.error);
        setUser(null);
        authService.logout();
      }
    };

    authService.getSession().then((session) => {
      applySession(session);
      setAuthReady(true);
    });

    const { data: authListener } = api.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        applySession(session);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  if (!authReady) {
    return (
      <div className="boot-screen">
        <div className="spinner" role="status" aria-label="Cargando" />
      </div>
    );
  }

  // Si no hay sesión de usuario activa, mostrar Auth Gate (LoginView)
  if (!user) {
    return <LoginView authError={authError} />;
  }

  return (
    <div className={`app-container ${isEmbedded ? 'embedded-mode' : ''}`}>
      {/* Toast Notifications */}
      {successMsg && (
        <div className="toast toast--ok" role="status" data-testid="toast-success">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
          <button 
            type="button" 
            onClick={() => setSuccessMsg('')}
            className="btn-icon"
            title="Cerrar notificación"
            aria-label="Cerrar notificación"
            data-testid="btn-close-toast-success"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="toast toast--bad" role="alert" data-testid="toast-error">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
          <button 
            type="button" 
            onClick={() => setErrorMsg('')}
            className="btn-icon"
            title="Cerrar notificación"
            aria-label="Cerrar notificación"
            data-testid="btn-close-toast-error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Google Calendar token expired / missing: offer reconnection */}
      {!gcalConnected && (
        <div className="gcal-banner" data-testid="gcal-reconnect-banner">
          <CalendarX2 size={16} />
          <span>Google Calendar desconectado</span>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn btn-primary btn-sm"
            data-testid="btn-gcal-login"
          >
            Reconectar
          </button>
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
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      )}

      {/* Main Container */}
      <main className="main-content">
        {/* Header bar - HIDE IF EMBEDDED */}
        {!isEmbedded && (
          <Header 
            activeTab={activeTab} 
            handleRefresh={handleRefresh} 
            supabaseOnline={!!api.supabase}
            user={user}
            onLogout={() => {
              authService.logout();
              setGcalConnected(false);
              setGcalEmail('');
              setUser(null);
            }}
          />
        )}

        {/* LOADING SHIMMER */}
        {loading && (
          <div className="loading-state" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <p>Sincronizando con Google Calendar y Supabase…</p>
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
                hasRequiredGCalGmail={hasRequiredGCalGmail}
                onNavigate={setActiveTab}
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
                onAddAppointmentFromSlot={(slot) => openAppointmentFromSlot(selectedAgendaDate, slot)}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceView 
                pastAppointmentsToReview={pastAppointmentsToReview}
                onMarkAttendance={handleUpdateAppointmentStatus}
                onOpenReschedule={(cita) => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  openReschedule(cita, tomorrow);
                }}
                hasRequiredGCalGmail={hasRequiredGCalGmail}
              />
            )}

            {activeTab === 'chats' && (
              <ChatsView 
                chatwootEmbedUrl={chatwootDashboardUrl} 
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
                onAddAppointment={handleAddNewAppointmentDirectly}
              />
            )}
          </>
        )}
      </main>

      {/* MODALS */}
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

      <DayAgendaModal 
        selectedDay={selectedDayForAgenda}
        onClose={() => setSelectedDayForAgenda(null)}
        citasDb={citasDb}
        appointments={appointments}
        gcalConnected={gcalConnected}
        onOpenDetail={handleOpenDetailFromGCal}
        onDeleteAppointment={handleDeleteAppointment}
        onAddAppointmentFromSlot={(slot) => {
          openAppointmentFromSlot(selectedDayForAgenda, slot);
          setSelectedDayForAgenda(null);
        }}
      />

      <LeadModal 
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        lead={selectedLead}
        onChange={setSelectedLead}
        onSubmit={handleUpdateLead}
      />

      <DetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedAppointmentDetails={selectedAppointmentDetails}
        leads={leads}
        pacientes={pacientes}
        citasDb={citasDb}
        hasRequiredGCalGmail={hasRequiredGCalGmail}
        onSavePrescription={handleSavePrescription}
        onDelete={(eventId) => {
          handleDeleteAppointment(eventId);
          setIsDetailModalOpen(false);
        }}
        onReschedule={(cita) => {
          setIsDetailModalOpen(false);
          openReschedule(cita, cita.fecha_hora_cita ? new Date(cita.fecha_hora_cita) : new Date());
        }}
        hasRequiredGCalGmail={hasRequiredGCalGmail}
      />

      <RescheduleModal 
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setSelectedCitaForReschedule(null);
        }}
        selectedCitaForReschedule={selectedCitaForReschedule}
        rescheduleEvent={rescheduleEvent}
        citasDb={citasDb}
        appointments={appointments}
        onSubmit={handleRescheduleSubmit}
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
    </div>
  );
}

export default App;
