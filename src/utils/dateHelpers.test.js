import { describe, it, expect } from 'vitest';
import { isPeruHoliday, isValidWorkingHours, calculateEndTime } from './dateHelpers';

describe('UT-FRONT-01: Verificación de Feriados Nacionales de Perú (isPeruHoliday)', () => {
  it('Debería retornar true para Fiestas Patrias (28 de Julio)', () => {
    const holiday = new Date('2026-07-28T10:00:00');
    const result = isPeruHoliday(holiday);
    console.log(`isPeruHoliday('2026-07-28') => Retornó: ${result}`);
    expect(result).toBe(true);
  });

  it('Debería retornar true para Navidad (25 de Diciembre)', () => {
    const holiday = new Date('2026-12-25T15:00:00');
    const result = isPeruHoliday(holiday);
    console.log(`isPeruHoliday('2026-12-25') => Retornó: ${result}`);
    expect(result).toBe(true);
  });

  it('Debería retornar false para un día laborable común (15 de Julio)', () => {
    const commonDay = new Date('2026-07-15T09:00:00');
    const result = isPeruHoliday(commonDay);
    console.log(`isPeruHoliday('2026-07-15') => Retornó: ${result}`);
    expect(result).toBe(false);
  });
});

describe('UT-FRONT-02: Validación de Horas de Trabajo (isValidWorkingHours)', () => {
  it('Debería rechazar citas agendadas los domingos', () => {
    const start = new Date('2026-07-19T09:00:00'); // Domingo
    const end = new Date('2026-07-19T09:30:00');
    const result = isValidWorkingHours(start, end);
    console.log(`isValidWorkingHours(Domingo 19 de Julio) => Retornó:`, JSON.stringify(result));
    expect(result).toEqual({
      valid: false,
      reason: 'No se pueden agendar citas los domingos.'
    });
  });

  it('Debería rechazar citas agendadas en feriados nacionales de Perú', () => {
    const start = new Date('2026-05-01T10:00:00'); // Día del Trabajo
    const end = new Date('2026-05-01T10:30:00');
    const result = isValidWorkingHours(start, end);
    console.log(`isValidWorkingHours(Feriado 1 de Mayo) => Retornó:`, JSON.stringify(result));
    expect(result).toEqual({
      valid: false,
      reason: 'No se pueden agendar citas en feriados nacionales de Perú.'
    });
  });

  it('Debería rechazar citas fuera del horario laboral o en receso de almuerzo', () => {
    const start = new Date('2026-07-15T13:00:00'); // 1:00 PM (Receso)
    const end = new Date('2026-07-15T14:00:00');
    const result = isValidWorkingHours(start, end);
    console.log(`isValidWorkingHours(Hora de Almuerzo 13:00) => Retornó:`, JSON.stringify(result));
    expect(result.valid).toBe(false);
  });

  it('Debería aceptar citas en horario de mañana válido', () => {
    const start = new Date('2026-07-15T09:00:00');
    const end = new Date('2026-07-15T09:30:00');
    const result = isValidWorkingHours(start, end);
    console.log(`isValidWorkingHours(Mañana Válida 09:00) => Retornó:`, JSON.stringify(result));
    expect(result).toEqual({ valid: true });
  });

  it('Debería aceptar citas en horario de tarde válido', () => {
    const start = new Date('2026-07-15T17:00:00');
    const end = new Date('2026-07-15T18:00:00');
    const result = isValidWorkingHours(start, end);
    console.log(`isValidWorkingHours(Tarde Válida 17:00) => Retornó:`, JSON.stringify(result));
    expect(result).toEqual({ valid: true });
  });
});

describe('UT-FRONT-03: Cálculo Dinámico de Hora de Fin (calculateEndTime)', () => {
  it('Debería calcular hora de fin para evaluación (+30 min)', () => {
    const start = '2026-07-15T09:00';
    const result = calculateEndTime(start, 'evaluacion');
    console.log(`calculateEndTime('2026-07-15T09:00', 'evaluacion') => Retornó: '${result}'`);
    expect(result).toBe('2026-07-15T09:30');
  });

  it('Debería calcular hora de fin para blanqueamiento (+45 min)', () => {
    const start = '2026-07-15T09:00';
    const result = calculateEndTime(start, 'blanqueamiento');
    console.log(`calculateEndTime('2026-07-15T09:00', 'blanqueamiento') => Retornó: '${result}'`);
    expect(result).toBe('2026-07-15T09:45');
  });

  it('Debería calcular hora de fin para cirugía (+60 min)', () => {
    const start = '2026-07-15T09:00';
    const result = calculateEndTime(start, 'cirugia');
    console.log(`calculateEndTime('2026-07-15T09:00', 'cirugia') => Retornó: '${result}'`);
    expect(result).toBe('2026-07-15T10:00');
  });
});
