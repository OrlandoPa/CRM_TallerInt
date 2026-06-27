// --- HIGH FIDELITY MOCK DATA ---
export const mockLeads = [
  {
    phone_number: '+51 987 654 321',
    client_name: 'Juan Pérez',
    client_email: 'juan.perez@gmail.com',
    status: 'scheduled',
    internal_notes: 'Paciente requiere endodoncia en el molar inferior derecho. Tiene dolor moderado.',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    phone_number: '+51 912 345 678',
    client_name: 'María Rodríguez',
    client_email: 'maria.rod@outlook.com',
    status: 'lead',
    internal_notes: 'Preguntó por blanqueamiento dental. Le interesa el horario de la tarde.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    phone_number: '+51 955 667 788',
    client_name: 'Carlos Mendoza',
    client_email: 'carlos.mendoza@yahoo.com',
    status: 'contacted',
    internal_notes: 'Solicitó información sobre ortodoncia y facilidades de pago. Prefiere pagar con Yape.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    phone_number: '+51 933 445 566',
    client_name: 'Sofía Luján',
    client_email: 'sofia.lujan@gmail.com',
    status: 'completed',
    internal_notes: 'Se le realizó una curación simple de 30 minutos. Todo conforme.',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    phone_number: '+51 922 883 377',
    client_name: 'Diego Torres',
    client_email: 'diegotorres@hotmail.com',
    status: 'lost',
    internal_notes: 'Preguntó por cirugías de cordales pero indicó que el horario se le cruzaba con su trabajo.',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const mockChats = {
  '+51 987 654 321': [
    { id: 1, sender: 'client', content: 'Hola, buenas tardes. Quisiera agendar una cita por favor.', timestamp: '2026-05-20T14:30:00Z', sender_type: 'human' },
    { id: 2, sender: 'bot', content: '¡Hola! Qué gusto saludarte. Soy el asistente virtual de la clínica odontológica. Claro que sí, con mucho gusto te ayudo a agendar tu cita. ¿Para qué fecha deseas tu cita?', timestamp: '2026-05-20T14:30:05Z', sender_type: 'agente_proceso' },
    { id: 3, sender: 'client', content: 'Me gustaría para el viernes 22 de mayo en la tarde.', timestamp: '2026-05-20T14:32:00Z', sender_type: 'human' },
    { id: 4, sender: 'bot', content: 'Perfecto, entiendo que deseas agendar para el viernes 22 de mayo en el turno de la tarde (4:00 PM a 8:00 PM). Déjame revisar la disponibilidad... Tengo libre a las 5:00 PM y a las 6:30 PM. ¿Alguno de estos horarios te acomoda?', timestamp: '2026-05-20T14:32:15Z', sender_type: 'agente_maestro_citas' },
    { id: 5, sender: 'client', content: 'A las 5:00 PM está perfecto. Mi nombre es Juan Pérez y el motivo es por dolor de muelas.', timestamp: '2026-05-20T14:33:00Z', sender_type: 'human' },
    { id: 6, sender: 'bot', content: '¡Excelente, Juan! He agendado tu cita de evaluación para el viernes 22 de mayo a las 5:00 PM. La duración estimada es de 1 hora. Te esperamos en la clínica. Recuerda que los pagos se realizan mediante Yape o efectivo. ¡Que tengas un gran día!', timestamp: '2026-05-20T14:33:10Z', sender_type: 'agente_maestro_citas' }
  ],
  '+51 912 345 678': [
    { id: 1, sender: 'client', content: 'Hola, quería consultar cuánto cuesta el blanqueamiento dental y cuánto demora.', timestamp: '2026-05-20T15:00:00Z', sender_type: 'human' },
    { id: 2, sender: 'bot', content: '¡Hola! Qué gusto saludarte. Te comento que el blanqueamiento dental en nuestra clínica tiene una duración aproximada de entre 30 y 45 minutos. Con respecto al costo, nunca proporcionamos montos específicos por este medio, ya que el precio de cualquier tratamiento es manejado y determinado exclusivamente por el doctor tras una evaluación clínica. ¿Te gustaría que te agende una cita de evaluación gratuita para revisar tu caso?', timestamp: '2026-05-20T15:00:12Z', sender_type: 'agente_faq' },
    { id: 3, sender: 'client', content: 'Ah entiendo. ¿Y atienen los sábados?', timestamp: '2026-05-20T15:02:00Z', sender_type: 'human' }
  ],
  '+51 955 667 788': [
    { id: 1, sender: 'client', content: 'Hola, hacen ortodoncia? Y se puede pagar en cuotas?', timestamp: '2026-05-19T10:15:00Z', sender_type: 'human' },
    { id: 2, sender: 'bot', content: '¡Hola! Sí, realizamos tratamientos de Ortodoncia en la clínica. Respecto al costo y las facilidades de pago en cuotas, el doctor debe realizarte primero una evaluación clínica completa para determinar tu diagnóstico y el plan de tratamiento adecuado. Una vez establecido esto, se coordinan las opciones de pago (aceptamos Yape y efectivo). ¿Te gustaría agendar una cita de evaluación para esta semana?', timestamp: '2026-05-19T10:15:20Z', sender_type: 'agente_faq' },
    { id: 3, sender: 'client', content: 'Sí, por favor, pero me gustaría saber si atienden a partir de las 6 pm.', timestamp: '2026-05-19T10:18:00Z', sender_type: 'human' },
    { id: 4, sender: 'bot', content: '¡Por supuesto! Nuestro horario de atención en las tardes es de 4:00 PM a 8:00 PM, así que con gusto podemos programarte a las 6:00 PM o más tarde. ¿Qué día te convendría más?', timestamp: '2026-05-19T10:18:15Z', sender_type: 'agente_maestro_citas' }
  ],
  '+51 933 445 566': [
    { id: 1, sender: 'client', content: 'Hola, tengo una curación pendiente, ¿me pueden agendar?', timestamp: '2026-05-18T09:00:00Z', sender_type: 'human' },
    { id: 2, sender: 'bot', content: '¡Hola! Claro que sí, con mucho gusto te ayudo a agendar tu cita para tu curación. ¿Para qué fecha deseas la cita?', timestamp: '2026-05-18T09:00:10Z', sender_type: 'agente_proceso' },
    { id: 3, sender: 'client', content: 'Para hoy mismo de ser posible a las 11 am.', timestamp: '2026-05-18T09:02:00Z', sender_type: 'human' },
    { id: 4, sender: 'bot', content: 'Déjame revisar la disponibilidad en el calendario... Sí, tengo disponible a las 11:00 AM. Procedo a agendar tu cita para curación simple a las 11:00 AM a nombre de Sofía Luján. ¡Confirmado!', timestamp: '2026-05-18T09:02:22Z', sender_type: 'agente_maestro_citas' }
  ],
  '+51 922 883 377': [
    { id: 1, sender: 'client', content: 'Buenas noches, sacan muelas del juicio?', timestamp: '2026-05-17T20:45:00Z', sender_type: 'human' },
    { id: 2, sender: 'bot', content: '¡Hola! Sí, en la clínica realizamos cirugías de cordales (muelas del juicio). Para poder indicarte los detalles y programarte, el doctor debe hacerte una evaluación. ¿Te gustaría agendar una cita de evaluación?', timestamp: '2026-05-17T20:45:15Z', sender_type: 'agente_faq' },
    { id: 3, sender: 'client', content: 'El problema es que yo solo puedo los domingos.', timestamp: '2026-05-17T20:50:00Z', sender_type: 'human' },
    { id: 4, sender: 'bot', content: 'Comprendo. Lamentablemente, nuestro horario de atención es exclusivamente de lunes a sábado en los turnos de 10:00 AM a 1:00 PM y de 4:00 PM a 8:00 PM. No abrimos los domingos. Si en algún momento tienes disponibilidad en la semana, no dudes en escribirnos.', timestamp: '2026-05-17T20:50:35Z', sender_type: 'agente_faq' }
  ]
};

export const mockAppointments = [
  {
    id: 'gcal-event-1',
    summary: 'Juan Pérez - Evaluación Endodoncia',
    description: 'Cita agendada desde CRM WhatsApp (+51 987 654 321)',
    start: { dateTime: '2026-05-22T17:00:00-05:00' },
    end: { dateTime: '2026-05-22T18:00:00-05:00' },
    status: 'confirmed'
  },
  {
    id: 'gcal-event-2',
    summary: 'Carlos Mendoza - Evaluación Ortodoncia',
    description: 'Cita agendada desde CRM WhatsApp (+51 955 667 788)',
    start: { dateTime: '2026-05-23T18:00:00-05:00' },
    end: { dateTime: '2026-05-23T19:00:00-05:00' },
    status: 'confirmed'
  },
  {
    id: 'gcal-event-3',
    summary: 'Sofía Luján - Curación Simple',
    description: 'Cita agendada desde CRM WhatsApp (+51 933 445 566)',
    start: { dateTime: '2026-05-18T11:00:00-05:00' },
    end: { dateTime: '2026-05-18T11:30:00-05:00' },
    status: 'confirmed'
  }
];

export const mockState = {
  leads: [...mockLeads],
  chats: { ...mockChats },
  appointments: [...mockAppointments]
};
