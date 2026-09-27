// Cálculo de los indicadores del Dashboard. Funciones puras: reciben los datos
// y la fecha de referencia (`ahora`) para poder probarlas sin depender del reloj.
import { getLimaDate, isPeruHoliday, JORNADAS, normalizarDuracion } from './dateHelpers';
import { ESTADOS_CITA, esPendiente } from './estadosCita';

const DIA_MS = 24 * 60 * 60 * 1000;

// Bloques de 30 min que ofrece un día laborable (mañana + tarde)
export const BLOQUES_POR_DIA = JORNADAS.reduce((n, j) => n + (j.fin - j.inicio) / 30, 0);

const inicioDelDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const mismoDia = (a, b) => inicioDelDia(a).getTime() === inicioDelDia(b).getTime();
const esLaborable = (d) => d.getDay() !== 0 && !isPeruHoliday(d);

// Lunes de la semana de una fecha
export const inicioDeSemana = (d) => {
  const dia = inicioDelDia(d);
  const offset = (dia.getDay() + 6) % 7;
  dia.setDate(dia.getDate() - offset);
  return dia;
};

// Citas con su fecha en hora de Lima y su duración en minutos (30 o 60)
export const prepararCitas = (citasDb, appointments = []) => {
  const duraciones = new Map(
    appointments
      .filter(a => a.start?.dateTime && a.end?.dateTime)
      .map(a => [a.id, normalizarDuracion((new Date(a.end.dateTime) - new Date(a.start.dateTime)) / 60000)])
  );
  return citasDb
    .map(c => ({
      ...c,
      fecha: getLimaDate(c.fecha_hora_cita),
      duracion: duraciones.get(c.google_event_id) || 30
    }))
    .filter(c => c.fecha);
};

const esVigente = (c) => c.estado_cita !== ESTADOS_CITA.CANCELADA;

// Resultado de las citas ya ocurridas en [desde, hasta)
export const resultadoPeriodo = (citas, desde, hasta) => {
  const enPeriodo = citas.filter(c => c.fecha >= desde && c.fecha < hasta);
  const asistio = enPeriodo.filter(c => c.estado_cita === ESTADOS_CITA.ASISTIO).length;
  const noAsistio = enPeriodo.filter(c => c.estado_cita === ESTADOS_CITA.NO_ASISTIO).length;
  const canceladas = enPeriodo.filter(c => c.estado_cita === ESTADOS_CITA.CANCELADA).length;
  const resueltas = asistio + noAsistio;
  return {
    asistio,
    noAsistio,
    canceladas,
    total: enPeriodo.length,
    // Tasa de asistencia: asistieron / (asistieron + no asistieron). null si no hay datos
    tasa: resueltas ? Math.round((asistio / resueltas) * 100) : null
  };
};

// Ocupación de los próximos `dias` días laborables (hoy incluido)
export const ocupacion = (citas, ahora, dias = 7) => {
  let capacidad = 0;
  let ocupados = 0;
  for (let i = 0; i < dias; i++) {
    const dia = inicioDelDia(new Date(ahora.getTime() + i * DIA_MS));
    if (!esLaborable(dia)) continue;
    capacidad += BLOQUES_POR_DIA;
    ocupados += citas
      .filter(c => esVigente(c) && mismoDia(c.fecha, dia))
      .reduce((n, c) => n + c.duracion / 30, 0);
  }
  ocupados = Math.min(ocupados, capacidad);
  return {
    capacidad,
    ocupados,
    porcentaje: capacidad ? Math.round((ocupados / capacidad) * 100) : 0
  };
};

// Citas vigentes por semana: `semanasAtras` semanas pasadas, la actual y la siguiente
export const citasPorSemana = (citas, ahora, semanasAtras = 6) => {
  const lunesActual = inicioDeSemana(ahora);
  const semanas = [];
  for (let i = -semanasAtras; i <= 1; i++) {
    const inicio = new Date(lunesActual);
    inicio.setDate(inicio.getDate() + i * 7);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 7);
    const deLaSemana = citas.filter(c => esVigente(c) && c.fecha >= inicio && c.fecha < fin);
    semanas.push({
      inicio,
      pasadas: deLaSemana.filter(c => c.fecha < ahora).length,
      programadas: deLaSemana.filter(c => c.fecha >= ahora).length,
      esActual: i === 0
    });
  }
  return semanas;
};

const CATEGORIAS = [
  ['Evaluación', ['evalua', 'revis']],
  ['Restauración', ['restaura', 'curac']],
  ['Endodoncia', ['endodoncia']],
  ['Ortodoncia', ['ortodoncia', 'bracket']],
  ['Blanqueamiento', ['blanquea']],
  ['Cirugía', ['cirug', 'extrac', 'cordal']],
  ['Rehabilitación', ['rehab', 'prote', 'corona']]
];

export const categoriaTratamiento = (motivo) => {
  const m = (motivo || '').toLowerCase();
  const encontrada = CATEGORIAS.find(([, claves]) => claves.some(k => m.includes(k)));
  return encontrada ? encontrada[0] : 'Otros';
};

// Tratamientos de las citas vigentes desde `desde`, de mayor a menor
export const tratamientosDesde = (citas, desde) => {
  const conteo = {};
  citas
    .filter(c => esVigente(c) && c.fecha >= desde)
    .forEach(c => {
      const cat = categoriaTratamiento(c.motivo_consulta);
      conteo[cat] = (conteo[cat] || 0) + 1;
    });
  return Object.entries(conteo)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
};

export const calcularMetricas = ({ citasDb, pacientes, appointments, ahora = new Date() }) => {
  const citas = prepararCitas(citasDb, appointments);
  const en48h = new Date(ahora.getTime() + 2 * DIA_MS);
  const hace30 = new Date(ahora.getTime() - 30 * DIA_MS);
  const hace60 = new Date(ahora.getTime() - 60 * DIA_MS);
  const hace90 = new Date(ahora.getTime() - 90 * DIA_MS);
  const en7dias = new Date(inicioDelDia(ahora).getTime() + 7 * DIA_MS);

  const citasHoy = citas
    .filter(c => esVigente(c) && mismoDia(c.fecha, ahora))
    .sort((a, b) => a.fecha - b.fecha);
  const proximaHoy = citasHoy.find(c => c.fecha >= ahora && esPendiente(c.estado_cita)) || null;

  const porConfirmar = citas.filter(c =>
    c.fecha >= ahora && c.fecha <= en48h
    && (c.estado_cita === ESTADOS_CITA.AGENDADA || c.estado_cita === ESTADOS_CITA.REPROGRAMADA || !c.estado_cita)
  );

  const pendientesAsistencia = citas.filter(c => c.fecha < ahora && esPendiente(c.estado_cita));

  const pacientesNuevos = pacientes.filter(p => p.created_at && new Date(p.created_at) >= hace30).length;

  const proximas = citas
    .filter(c => esVigente(c) && c.fecha >= ahora && c.fecha < en7dias)
    .sort((a, b) => a.fecha - b.fecha);

  return {
    citasHoy,
    proximaHoy,
    porConfirmar,
    pendientesAsistencia,
    pacientesNuevos,
    totalPacientes: pacientes.length,
    ocupacion: ocupacion(citas, ahora, 7),
    asistencia30: resultadoPeriodo(citas, hace30, ahora),
    asistenciaPrevia: resultadoPeriodo(citas, hace60, hace30),
    asistenciaHistorica: resultadoPeriodo(citas, new Date(0), ahora),
    semanas: citasPorSemana(citas, ahora),
    tratamientos: tratamientosDesde(citas, hace90),
    proximas
  };
};
