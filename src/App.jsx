import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  CalendarX2,
  X
} from 'lucide-react';

import * as api from './services/api';
import { isValidWorkingHours, calculateEndTime, toDateInput, toDateTimeInput } from './utils/dateHelpers';
import { esPendiente } from './utils/estadosCita';
import { AgendaConfigContext, CONFIG_POR_DEFECTO, normalizarConfig } from './utils/agendaConfig';

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

// Se cargan bajo demanda: recepción nunca descarga el módulo de Administración
const PacientesView = lazy(() => import('./components/views/PacientesView'));
const AdminView = lazy(() => import('./components/views/AdminView'));

// Modals
import AppointmentModal from './components/modals/AppointmentModal';
import DayAgendaModal from './components/modals/DayAgendaModal';
import DetailModal from './components/modals/DetailModal';
import RescheduleModal from './components/modals/RescheduleModal';
import DatePickerModal from './components/modals/DatePickerModal';

const CLAVE_PESTANA = 'crm_pestana_activa';
const PESTANAS = ['dashboard', 'agenda', 'attendance', 'calendar', 'pacientes', 'chats', 'admin'];

const leerPestanaGuardada = () => {
  try {
    const guardada = sessionStorage.getItem(CLAVE_PESTANA);
    return PESTANAS.includes(guardada) ? guardada : null;
  } catch {
    return null;
  }
};

const getInitialParams = () => {
  if (typeof window === 'undefined') return { isEmbedded: false, activeTab: 'dashboard', convId: null };
  const params = new URLSearchParams(window.location.search);
  const isEmbedded = params.get('embed') === 'true';
  return {
    isEmbedded,
    activeTab: isEmbedded ? 'chats' : (leerPestanaGuardada() || 'dashboard'),
    convId: params.get('conversation_id') || null
  };
};

const initialParams = getInitialParams();

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
  const [agendaConfig, setAgendaConfig] = useState(CONFIG_POR_DEFECTO);
  // `loading` solo cubre la primera carga: las recargas posteriores no desmontan
  // la vista (se perdía el apartado abierto); se indican con `sincronizando`
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  // Error al leer Google Calendar (vía Edge Function); vacío = disponible
  const [calendarError, setCalendarError] = useState('');

  // Embedded mode state (e.g. inside Chatwoot iframe)
  const [isEmbedded] = useState(initialParams.isEmbedded);

  const [activeConversationId] = useState(initialParams.convId);

  // Modals state
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

  // Calendar month state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(new Date());

  const esDoctor = user?.rol === authService.ROLES.DOCTOR;
  const agendaDisponible = !calendarError;
  const chatwootDashboardUrl = api.getChatwootDashboardUrl(activeConversationId);

  const toastTimeoutRef = useRef(null);

  // Toast notifications helper (4 seconds duration)
  const showToast = useCallback((msg, isSuccess = true) => {
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
      toastTimeoutRef.current = setTimeout(() => setErrorMsg(''), 6000);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setSincronizando(true);
    setErrorMsg('');
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const timeMin = new Date(year, month, 1).toISOString();
      const timeMax = new Date(year, month + 1, 1).toISOString();

      // Cada fuente se carga por separado: si una falla, se informa y el resto se muestra igual
      const [leadsRes, appointmentsRes, pacientesRes, citasRes, configRes] = await Promise.allSettled([
        api.getLeads(),
        api.getAppointments(timeMin, timeMax),
        api.getPacientes(),
        api.getCitasDb(),
        api.getAgendaConfig()
      ]);

      if (leadsRes.status === 'fulfilled') setLeads(leadsRes.value);
      if (appointmentsRes.status === 'fulfilled') setAppointments(appointmentsRes.value);
      if (pacientesRes.status === 'fulfilled') setPacientes(pacientesRes.value);
      if (citasRes.status === 'fulfilled') setCitasDb(citasRes.value);
      if (configRes.status === 'fulfilled') setAgendaConfig(normalizarConfig(configRes.value));
      setCalendarError(appointmentsRes.status === 'rejected' ? (appointmentsRes.reason?.message || 'Error desconocido') : '');

      // El error de Calendar se muestra en su propio aviso persistente
      const errors = [leadsRes, pacientesRes, citasRes, configRes]
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
      setSincronizando(false);
      setLoading(false);
    }
  }, [currentDate]);

  // Sincronizar datos al iniciar sesión y al cambiar el mes del calendario.
  // Depende del correo, no del objeto `user`, para no recargar si solo se renueva la sesión.
  const emailUsuario = user?.email;
  useEffect(() => {
    if (emailUsuario) {
      const timer = setTimeout(() => {
        fetchData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [emailUsuario, fetchData]);

  // Pestaña activa: se recuerda en la sesión del navegador por si el navegador recarga la página
  useEffect(() => {
    if (isEmbedded) return;
    try {
      sessionStorage.setItem(CLAVE_PESTANA, activeTab);
    } catch {
      // almacenamiento no disponible
    }
  }, [activeTab, isEmbedded]);

  // Si el rol cambia (o no es doctor) no se queda en una pestaña que no le corresponde
  const tabVisible = activeTab === 'admin' && !esDoctor ? 'dashboard' : activeTab;

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

  // Create calendar event
  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!newEvent.summary || !newEvent.start || !newEvent.end) return;

    const validation = isValidWorkingHours(new Date(newEvent.start), new Date(newEvent.end), agendaConfig);
    if (!validation.valid) {
      showToast(validation.reason, false);
      return;
    }

    if (isNewPatient && (!newPatientName.trim() || !newPatientPhone.trim())) {
      showToast('Por favor, ingresa el nombre y celular del paciente nuevo.', false);
      return;
    }
    const identificador = isNewPatient ? newPatientPhone.trim() : newEvent.phone_number;
    const lead = leads.find(l => l.phone_number === newEvent.phone_number);

    try {
      await api.createAppointment({
        identificador,
        nombre: isNewPatient ? newPatientName.trim() : (lead?.client_name || ''),
        titulo: newEvent.summary,
        inicio: new Date(newEvent.start).toISOString(),
        fin: new Date(newEvent.end).toISOString(),
        servicio_clave: treatmentType !== 'personalizado' ? treatmentType : null,
        notas: newEvent.description,
        correo: sendEmailReminder ? newEvent.email : '',
        tratamiento: esDoctor ? (newEvent.tratamiento_receta || '') : ''
      });

      fetchData();
      closeAppointmentModal();
      showToast('Cita agendada correctamente.');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al agendar la cita.', false);
    }
  };

  const handleSavePrescription = async (cita, recetaText) => {
    try {
      const result = await api.updateAppointmentPrescription(cita, recetaText);
      setCitasDb(prev => prev.map(c => (String(c.id) === String(result.id)
        ? { ...c, tratamiento_receta: result.tratamiento_receta }
        : c)));
      setSelectedAppointmentDetails(prev => prev ? { ...prev, id: result.id, tratamiento_receta: result.tratamiento_receta } : prev);
      showToast('Tratamiento guardado.');
    } catch (err) {
      console.error('Error saving prescription:', err);
      showToast(err.message || 'Error al guardar el tratamiento.', false);
      throw err;
    }
  };

  const handleActualizarPaciente = async (identificador, cambios) => {
    try {
      const actualizado = await api.updatePaciente(identificador, cambios);
      setPacientes(prev => prev.map(p => p.identificador_paciente === identificador ? { ...p, ...actualizado } : p));
      setCitasDb(prev => prev.map(c => c.identificador_paciente === identificador
        ? { ...c, pacientes: { ...c.pacientes, ...actualizado } }
        : c));
      showToast('Datos del paciente actualizados.');
    } catch (err) {
      showToast(err.message, false);
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
    if (!window.confirm('¿Estás seguro de cancelar esta cita? Se quitará también de Google Calendar.')) return;
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

    const validation = isValidWorkingHours(range.start, range.end, agendaConfig);
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
      end: calculateEndTime(startStr, 'evaluacion', agendaConfig.servicios),
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
    // Los bloqueos de agenda no son citas: se gestionan en Administración
    if (app?.tipo === 'bloqueo') {
      showToast(`${app.summary}. ${esDoctor ? 'Se gestiona en Administración > Bloqueos de agenda.' : ''}`.trim());
      return;
    }

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

    // La descripción del evento de Google dice si la agendó el bot de WhatsApp
    const evento = app?.start ? app : appointments.find(e => e.id && e.id === detailObj.google_event_id);
    setSelectedAppointmentDetails({ ...detailObj, descripcion_evento: evento?.description || '' });
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
  // El rol sale de usuarios_autorizados (mi_perfil) y la RLS lo aplica en cada consulta.
  useEffect(() => {
    if (!api.supabase) return;
    let vigente = true;
    // Correo de la sesión ya aplicada: Supabase vuelve a emitir SIGNED_IN cada vez
    // que la pestaña recupera el foco, y no hay que volver a cargar nada por eso
    let emailAplicado = null;

    const applySession = async (session) => {
      if (!session) {
        emailAplicado = null;
        setUser(null);
        setLoading(true);
        return;
      }
      const result = await authService.cargarUsuario(session);
      if (!vigente) return;
      if (result.success) {
        emailAplicado = result.user.email;
        authService.limpiarDatosAntiguos();
        setAuthError('');
        // Mismo usuario y rol: se conserva el objeto para no re-renderizar en cadena
        setUser(prev => (prev && prev.email === result.user.email && prev.rol === result.user.rol
          && prev.name === result.user.name && prev.picture === result.user.picture)
          ? prev
          : result.user);
      } else {
        emailAplicado = null;
        setAuthError(result.error);
        setUser(null);
        authService.logout();
      }
    };

    authService.getSession().then(async (session) => {
      await applySession(session);
      if (vigente) setAuthReady(true);
    });

    const { data: authListener } = api.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email?.trim().toLowerCase() === emailAplicado) return;
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Supabase recomienda no consultar la BD dentro de este callback: se difiere
        setTimeout(() => applySession(session), 0);
      }
    });

    return () => {
      vigente = false;
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
    <AgendaConfigContext.Provider value={agendaConfig}>
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

      {/* Google Calendar no respondió (Edge Function): se ofrece reintentar */}
      {calendarError && (
        <div className="gcal-banner" role="alert" data-testid="gcal-error-banner">
          <CalendarX2 size={16} />
          <span>Google Calendar no disponible: {calendarError}</span>
          <button
            type="button"
            onClick={handleRefresh}
            className="btn btn-primary btn-sm"
            data-testid="btn-gcal-retry"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Sidebar Navigation - HIDE IF EMBEDDED */}
      {!isEmbedded && (
        <Sidebar
          activeTab={tabVisible}
          setActiveTab={setActiveTab}
          theme={theme}
          toggleTheme={toggleTheme}
          pastAppointmentsToReview={pastAppointmentsToReview}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          rol={user.rol}
        />
      )}

      {/* Main Container */}
      <main className="main-content">
        {/* Header bar - HIDE IF EMBEDDED */}
        {!isEmbedded && (
          <Header
            activeTab={tabVisible}
            handleRefresh={handleRefresh}
            supabaseOnline={!!api.supabase}
            user={user}
            sincronizando={sincronizando}
            onLogout={() => {
              authService.logout();
              setUser(null);
              setLoading(true);
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
          <Suspense fallback={<div className="loading-state" role="status"><div className="spinner" aria-hidden="true" /><p>Cargando…</p></div>}>
            {tabVisible === 'dashboard' && (
              <DashboardView
                citasDb={citasDb}
                appointments={appointments}
                pacientes={pacientes}
                onOpenDetail={handleOpenDetailFromGCal}
                onDeleteAppointment={handleDeleteAppointment}
                agendaDisponible={agendaDisponible}
                onNavigate={setActiveTab}
              />
            )}

            {tabVisible === 'agenda' && (
              <AgendaView
                selectedAgendaDate={selectedAgendaDate}
                setSelectedAgendaDate={setSelectedAgendaDate}
                appointments={appointments}
                citasDb={citasDb}
                agendaDisponible={agendaDisponible}
                onOpenDetail={handleOpenDetailFromGCal}
                onDeleteAppointment={handleDeleteAppointment}
                onAddAppointmentFromSlot={(slot) => openAppointmentFromSlot(selectedAgendaDate, slot)}
              />
            )}

            {tabVisible === 'attendance' && (
              <AttendanceView
                pastAppointmentsToReview={pastAppointmentsToReview}
                onMarkAttendance={handleUpdateAppointmentStatus}
                onOpenReschedule={(cita) => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  openReschedule(cita, tomorrow);
                }}
                agendaDisponible={agendaDisponible}
              />
            )}

            {tabVisible === 'pacientes' && (
              <PacientesView
                pacientes={pacientes}
                citasDb={citasDb}
                esDoctor={esDoctor}
                onActualizarPaciente={handleActualizarPaciente}
                onOpenDetail={handleOpenDetailFromGCal}
              />
            )}

            {tabVisible === 'chats' && (
              <ChatsView
                chatwootEmbedUrl={chatwootDashboardUrl}
                chatwootDashboardUrl={chatwootDashboardUrl}
              />
            )}

            {tabVisible === 'calendar' && (
              <CalendarView
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                appointments={appointments}
                citasDb={citasDb}
                agendaDisponible={agendaDisponible}
                onOpenDetail={handleOpenDetailFromGCal}
                onSelectDay={(day) => {
                  setSelectedDayForAgenda(day);
                }}
                onAddAppointment={handleAddNewAppointmentDirectly}
              />
            )}

            {tabVisible === 'admin' && esDoctor && (
              <AdminView
                usuario={user}
                config={agendaConfig}
                onConfigChanged={fetchData}
                showToast={showToast}
              />
            )}
          </Suspense>
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
        agendaDisponible={agendaDisponible}
        onOpenDetail={handleOpenDetailFromGCal}
        onDeleteAppointment={handleDeleteAppointment}
        onAddAppointmentFromSlot={(slot) => {
          openAppointmentFromSlot(selectedDayForAgenda, slot);
          setSelectedDayForAgenda(null);
        }}
      />

      <DetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedAppointmentDetails={selectedAppointmentDetails}
        leads={leads}
        pacientes={pacientes}
        citasDb={citasDb}
        agendaDisponible={agendaDisponible}
        esDoctor={esDoctor}
        onSavePrescription={handleSavePrescription}
        onDelete={(eventId) => {
          handleDeleteAppointment(eventId);
          setIsDetailModalOpen(false);
        }}
        onReschedule={(cita) => {
          setIsDetailModalOpen(false);
          openReschedule(cita, cita.fecha_hora_cita ? new Date(cita.fecha_hora_cita) : new Date());
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
        agendaDisponible={agendaDisponible}
        esDoctor={esDoctor}
        isTimeLocked={isTimeLocked}
        leads={leads}
        minDateTime={minDateTime}
        onSubmit={handleCreateAppointment}
      />
    </div>
    </AgendaConfigContext.Provider>
  );
}

export default App;
