import { describe, it, expect } from 'vitest';
import { leerDescripcionEvento } from './descripcionEvento';

const AVISO = 'Tu cita en nuestra clínica odontológica.\nSi necesitas cambiarla o cancelarla, escríbenos por WhatsApp.\n\n';

describe('leerDescripcionEvento', () => {
  it('reconoce la cita agendada por el bot', () => {
    expect(leerDescripcionEvento(`${AVISO}Agendada por WhatsApp · Contacto: +51948223027`))
      .toEqual({ origen: 'whatsapp', notas: '' });
  });

  it('reconoce la cita agendada desde el CRM', () => {
    expect(leerDescripcionEvento(`${AVISO}Agendada desde el CRM · Contacto: +51948223027`))
      .toEqual({ origen: 'crm', notas: '' });
  });

  it('reconoce el formato anterior del bot', () => {
    expect(leerDescripcionEvento('Contacto: +51948223027\nCita 65 agendada por el bot de WhatsApp'))
      .toEqual({ origen: 'whatsapp', notas: '' });
  });

  it('conserva las notas del formato anterior del CRM y quita el contacto', () => {
    expect(leerDescripcionEvento('Traer radiografía\r\nContacto: +51987654321'))
      .toEqual({ origen: null, notas: 'Traer radiografía' });
  });

  it('tolera una descripción vacía', () => {
    expect(leerDescripcionEvento(undefined)).toEqual({ origen: null, notas: '' });
  });
});
