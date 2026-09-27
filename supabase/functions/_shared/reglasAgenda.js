// Reglas de agenda compartidas por el front (src/utils/dateHelpers.js) y la
// Edge Function "agenda". JavaScript puro, sin dependencias: corre en el
// navegador, en Node (Vitest) y en Deno.
//
// Las horas de la clínica son de Lima (UTC-5, sin horario de verano), así
// que toda validación convierte primero el instante a hora de Lima.

export const ZONA_CLINICA = 'America/Lima';
export const MINUTOS_BLOQUE = 30;
export const ESTADOS_ACTIVOS = ['AGENDADA', 'REPROGRAMADA', 'CONFIRMADA'];

const formateadorLima = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_CLINICA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23'
});

const DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Fecha (YYYY-MM-DD), día de la semana (0 = domingo) y minutos desde medianoche, en hora de Lima. */
export const partesLima = (instante) => {
  const p = Object.fromEntries(formateadorLima.formatToParts(new Date(instante)).map(x => [x.type, x.value]));
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    diaSemana: DIAS[p.weekday],
    minutos: Number(p.hour) * 60 + Number(p.minute)
  };
};

/** "08:00" o "08:00:00" -> 480 */
export const aMinutos = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

/** 480 -> "08:00" */
export const aHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/**
 * Jornadas de un día de la semana, en minutos, ordenadas.
 * @param {Array<{dia_semana:number, inicio:string, fin:string}>} horario filas de horario_atencion
 */
export const jornadasDelDia = (horario, diaSemana) =>
  (horario || [])
    .filter(h => Number(h.dia_semana) === diaSemana)
    .map(h => ({ inicio: aMinutos(h.inicio), fin: aMinutos(h.fin) }))
    .sort((a, b) => a.inicio - b.inicio)
    .map(j => ({ ...j, nombre: j.inicio < 12 * 60 ? 'Mañana' : 'Tarde' }));

/** Horas de inicio (cada 30 min) donde cabe una cita de `duracion` minutos, por jornada. */
export const bloquesDeJornadas = (jornadas, duracion) =>
  jornadas.map(j => {
    const bloques = [];
    for (let t = j.inicio; t + duracion <= j.fin; t += MINUTOS_BLOQUE) bloques.push(aHHMM(t));
    return { nombre: j.nombre, inicio: j.inicio, fin: j.fin, bloques };
  });

const seSolapan = (aIni, aFin, bIni, bFin) => aIni < bFin && bIni < aFin;

/**
 * Valida el rango de una cita contra las reglas de la clínica.
 * @param {{inicio: Date|string, fin: Date|string}} rango
 * @param {{horario: Array, feriados: Iterable<string>|Array<{fecha:string}>, bloqueos?: Array<{inicio, fin, motivo?}>}} config
 * @param {Date|null} [ahora] instante actual; null omite la regla "no en el pasado"
 * @returns {{valid: true} | {valid: false, reason: string}}
 */
export const validarRangoCita = (rango, config, ahora = new Date()) => {
  const inicio = new Date(rango.inicio);
  const fin = new Date(rango.fin);
  if (isNaN(inicio) || isNaN(fin)) return { valid: false, reason: 'La fecha u hora de la cita no es válida.' };
  if (fin <= inicio) return { valid: false, reason: 'La hora de fin debe ser posterior a la de inicio.' };
  if (ahora && inicio < ahora) return { valid: false, reason: 'No se pueden agendar citas en el pasado.' };

  const pi = partesLima(inicio);
  // El fin se evalúa un minuto antes para que 12:00 cuente dentro de la jornada 8–12
  const pf = partesLima(new Date(fin.getTime() - 60000));
  if (pi.fecha !== pf.fecha) return { valid: false, reason: 'La cita debe empezar y terminar el mismo día.' };

  const feriados = new Set([...(config.feriados || [])].map(f => (typeof f === 'string' ? f : f.fecha)));
  if (feriados.has(pi.fecha)) return { valid: false, reason: 'No se pueden agendar citas en feriados.' };

  const jornadas = jornadasDelDia(config.horario, pi.diaSemana);
  if (jornadas.length === 0) {
    return {
      valid: false,
      reason: pi.diaSemana === 0 ? 'No se pueden agendar citas los domingos.' : 'No hay atención ese día de la semana.'
    };
  }

  const finMin = pi.minutos + Math.round((fin - inicio) / 60000);
  const dentro = jornadas.some(j => pi.minutos >= j.inicio && finMin <= j.fin);
  if (!dentro) {
    const texto = jornadas.map(j => `${aHHMM(j.inicio)}–${aHHMM(j.fin)}`).join(' o ');
    return { valid: false, reason: `El horario debe estar dentro de la atención de ese día: ${texto}.` };
  }

  const bloqueo = (config.bloqueos || []).find(b =>
    seSolapan(inicio, fin, new Date(b.inicio), new Date(b.fin)));
  if (bloqueo) {
    return { valid: false, reason: `El horario está bloqueado${bloqueo.motivo ? ` (${bloqueo.motivo})` : ''}.` };
  }

  return { valid: true };
};

/** Quita de la descripción de un evento el bloque "[Receta Médica]" que agregaba el CRM antiguo. */
export const sinReceta = (descripcion) =>
  String(descripcion || '').replace(/\n*\[Receta Médica\][\s\S]*/, '').trim();
