// Descripción que escriben en el evento de Google (la ve el paciente invitado):
//   Tu cita en nuestra clínica odontológica.
//   Si necesitas cambiarla o cancelarla, escríbenos por WhatsApp.
//
//   Agendada por WhatsApp · Contacto: +51987654321     (bot de n8n)
//   Agendada desde el CRM · Contacto: +51987654321     (Edge Function "agenda")
// Formatos anteriores: "Cita 65 agendada por el bot de WhatsApp" (bot) y
// "<notas>\nContacto: ..." (CRM, sin marca de origen).
const MARCA_BOT = /agendada por (el bot de )?whatsapp/i;
const MARCA_CRM = /agendada desde el crm/i;
const LINEA_CONTACTO = /^contacto:/i;

/**
 * Lee de la descripción de un evento de Google Calendar quién agendó la cita
 * y las notas libres (solo existen en el formato antiguo del CRM).
 * @param {string} texto
 * @returns {{ origen: 'whatsapp' | 'crm' | null, notas: string }}
 */
export const leerDescripcionEvento = (texto) => {
  const lineas = String(texto || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lineas.some(l => MARCA_BOT.test(l))) return { origen: 'whatsapp', notas: '' };
  if (lineas.some(l => MARCA_CRM.test(l))) return { origen: 'crm', notas: '' };
  return { origen: null, notas: lineas.filter(l => !LINEA_CONTACTO.test(l)).join('\n') };
};
