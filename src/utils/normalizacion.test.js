import { describe, it, expect } from 'vitest';
import { normalizarIdentificador } from './contactHelpers';
import { esPendiente, esAtendida, ESTADOS_CITA } from './estadosCita';

describe('normalizarIdentificador', () => {
  it('convierte teléfonos a E.164', () => {
    expect(normalizarIdentificador('+51 987 654 321')).toBe('+51987654321');
    expect(normalizarIdentificador('51987654321')).toBe('+51987654321');
    expect(normalizarIdentificador('987-654-321')).toBe('+51987654321');
    expect(normalizarIdentificador('(+51) 987654321')).toBe('+51987654321');
    expect(normalizarIdentificador('+1 555 123 4567')).toBe('+15551234567');
  });

  it('respeta identificadores que no son teléfonos', () => {
    expect(normalizarIdentificador('  juan_perez ')).toBe('juan_perez');
    expect(normalizarIdentificador('user_123')).toBe('user_123');
    expect(normalizarIdentificador('@clinica.dental')).toBe('@clinica.dental');
  });

  it('devuelve vacío para valores nulos', () => {
    expect(normalizarIdentificador(null)).toBe('');
    expect(normalizarIdentificador(undefined)).toBe('');
    expect(normalizarIdentificador('   ')).toBe('');
  });
});

describe('estados de cita', () => {
  it('las reprogramadas siguen pendientes de asistencia', () => {
    expect(esPendiente(ESTADOS_CITA.REPROGRAMADA)).toBe(true);
    expect(esPendiente(ESTADOS_CITA.AGENDADA)).toBe(true);
    expect(esPendiente(null)).toBe(true);
    expect(esPendiente(ESTADOS_CITA.CANCELADA)).toBe(false);
    expect(esPendiente(ESTADOS_CITA.ASISTIO)).toBe(false);
  });

  it('solo ASISTIO cuenta como atendida', () => {
    expect(esAtendida(ESTADOS_CITA.ASISTIO)).toBe(true);
    expect(esAtendida(ESTADOS_CITA.NO_ASISTIO)).toBe(false);
  });
});
