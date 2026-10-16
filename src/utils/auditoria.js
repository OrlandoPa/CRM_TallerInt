// Textos de la auditoría para la pestaña Administración → Auditoría.
export const TABLAS_AUDITADAS = {
  citas: 'Citas',
  pacientes: 'Pacientes',
  tratamientos_cita: 'Tratamientos',
  usuarios_autorizados: 'Usuarios',
  servicios: 'Servicios',
  horario_atencion: 'Horario',
  feriados: 'Feriados',
  bloqueos_agenda: 'Bloqueos',
  retencion: 'Retención de datos'
};

export const OPERACIONES = { INSERT: ['Alta', 'badge--ok'], UPDATE: ['Cambio', 'badge--info'], DELETE: ['Baja', 'badge--bad'] };

// Quién hizo el cambio, en palabras: el CRM (con el correo), el bot (n8n), la retención o el sistema
export const describirOrigen = (f) => {
  if (f.origen === 'crm') return { quien: f.usuario, via: 'CRM' };
  if (f.usuario === 'n8n_bot') return { quien: 'Asistente de WhatsApp', via: 'n8n' };
  if (f.aplicacion === 'retencion_purgar' || f.tabla === 'retencion') return { quien: 'Retención automática', via: 'n8n' };
  return { quien: f.usuario || '—', via: 'Conexión directa' };
};
