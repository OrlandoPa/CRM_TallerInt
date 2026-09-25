/**
 * Estados de cita válidos. Deben coincidir con el CHECK de public.citas.estado_cita
 * y con los valores que escriben los flujos de n8n.
 */
export const ESTADOS_CITA = Object.freeze({
  AGENDADA: 'AGENDADA',
  REPROGRAMADA: 'REPROGRAMADA',
  CONFIRMADA: 'CONFIRMADA',
  ASISTIO: 'ASISTIO',
  NO_ASISTIO: 'NO_ASISTIO',
  CANCELADA: 'CANCELADA'
});

// Citas vigentes: todavía no se atendieron ni se cancelaron
export const ESTADOS_PENDIENTES = [ESTADOS_CITA.AGENDADA, ESTADOS_CITA.REPROGRAMADA, ESTADOS_CITA.CONFIRMADA];

export const esPendiente = (estado) => !estado || ESTADOS_PENDIENTES.includes(estado);

export const esAtendida = (estado) => estado === ESTADOS_CITA.ASISTIO;

// Estados que se muestran en verde en las tarjetas
export const esEstadoPositivo = (estado) => estado === ESTADOS_CITA.CONFIRMADA || estado === ESTADOS_CITA.ASISTIO;
