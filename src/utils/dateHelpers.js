import { validarRangoCita, jornadasDelDia, bloquesDeJornadas } from '@compartido/reglasAgenda.js';

export const getPeruHolidays = (year) => {
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

const fechaLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * ¿La fecha es feriado? Con `feriados` (filas {fecha} de la BD o 'YYYY-MM-DD')
 * usa esa lista; sin ella, los feriados nacionales fijos de Perú.
 */
export const isPeruHoliday = (date, feriados) => {
  const dateStr = fechaLocal(date);
  if (feriados) {
    return feriados.some(f => (typeof f === 'string' ? f : f.fecha) === dateStr);
  }
  return getPeruHolidays(date.getFullYear()).includes(dateStr);
};

// Horario por defecto (lunes a sábado, mañana y tarde), en el formato de la BD
const HORARIO_BASE = [1, 2, 3, 4, 5, 6].flatMap(dia => [
  { dia_semana: dia, inicio: '08:00', fin: '12:00' },
  { dia_semana: dia, inicio: '16:00', fin: '21:00' }
]);

/**
 * Valida horario de atención, feriados y bloqueos con las mismas reglas que la
 * Edge Function (supabase/functions/_shared/reglasAgenda.js). Sin `config` usa
 * el horario y los feriados por defecto. No valida "en el pasado": el formulario
 * ya lo impide y la Edge Function lo vuelve a comprobar.
 */
export const isValidWorkingHours = (startDate, endDate, config) => {
  const años = [startDate.getFullYear(), endDate.getFullYear()];
  const reglas = {
    horario: config?.horario || HORARIO_BASE,
    feriados: config?.feriados || años.flatMap(getPeruHolidays),
    bloqueos: config?.bloqueos || []
  };
  return validarRangoCita({ inicio: startDate, fin: endDate }, reglas, null);
};

/** Jornadas (en minutos) de la fecha dada según el horario de la BD. */
export const jornadasDeFecha = (date, horario = HORARIO_BASE) => jornadasDelDia(horario, date.getDay());

/** Hora de fin (datetime-local) según la duración del servicio; `servicios` viene del catálogo de la BD. */
export const calculateEndTime = (startStr, treatmentKey, servicios) => {
  if (!startStr) return '';
  const startDate = new Date(startStr);
  let durationMinutes;

  const servicio = servicios?.find(sv => sv.clave === treatmentKey);
  if (servicio) {
    return toDateTimeInput(new Date(startDate.getTime() + servicio.duracion_min * 60000));
  }

  switch (treatmentKey) {
    case 'evaluacion':
    case 'restauracion':
    case 'endodoncia':
    case 'ortodoncia':
    case 'blanqueamiento': // se agenda en 1 bloque; en consulta puede extenderse hasta 45 min
      durationMinutes = 30;
      break;
    case 'cirugia':
    case 'rehabilitacion':
      durationMinutes = 60;
      break;
    default:
      durationMinutes = 30;
  }

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return toDateTimeInput(endDate);
};

// Valores para <input type="date"> y <input type="datetime-local"> en hora local
export const toDateInput = (date) => date.toLocaleString('sv-SE').slice(0, 10);
export const toDateTimeInput = (date) => date.toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);

export const getLimaDate = (dateOrStr) => {
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

// Formatos de presentación (24 h, español de Perú)
export const formatHora = (date) =>
  date ? date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

export const formatDiaCorto = (date) =>
  date ? date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

export const formatFechaLarga = (date) =>
  date ? date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

// Jornadas de atención en minutos desde medianoche (mañana 8–12, tarde 16–21)
export const JORNADAS = [
  { nombre: 'Mañana', inicio: 8 * 60, fin: 12 * 60 },
  { nombre: 'Tarde', inicio: 16 * 60, fin: 21 * 60 }
];

// Las citas duran un bloque (30 min) o dos bloques (1 h)
export const DURACIONES_CITA = [30, 60];

// Horas de inicio válidas (cada 30 min) para una cita de la duración dada, por jornada
export const getBloquesInicio = (duracionMin, jornadas = JORNADAS) =>
  bloquesDeJornadas(jornadas, duracionMin);

// Duración normalizada a bloques: 1 h si dura 60 min o más, si no 30 min
export const normalizarDuracion = (minutos) => (minutos >= 60 ? 60 : 30);

/** Bloqueo de agenda que cubre el instante dado (o undefined). */
export const bloqueoEn = (bloqueos, instante) =>
  (bloqueos || []).find(b => instante >= new Date(b.inicio) && instante < new Date(b.fin));
