import { describe, it, expect } from 'vitest';
import {
  partesLima,
  jornadasDelDia,
  bloquesDeJornadas,
  validarRangoCita,
  sinReceta
} from './reglasAgenda.js';

// Horario por defecto: lunes a sábado, 8–12 y 16–21
const horario = [1, 2, 3, 4, 5, 6].flatMap(d => [
  { dia_semana: d, inicio: '08:00:00', fin: '12:00:00' },
  { dia_semana: d, inicio: '16:00:00', fin: '21:00:00' }
]);
const config = { horario, feriados: ['2026-12-25'], bloqueos: [] };
const AHORA = new Date('2026-10-01T12:00:00Z');

// Instantes en hora de Lima escritos con su desfase explícito
const lima = (s) => new Date(`${s}-05:00`);

describe('partesLima', () => {
  it('convierte a hora de Lima sin depender de la zona del equipo', () => {
    expect(partesLima('2026-10-05T14:30:00Z')).toEqual({ fecha: '2026-10-05', diaSemana: 1, minutos: 9 * 60 + 30 });
    // 02:00 UTC del martes = 21:00 del lunes en Lima
    expect(partesLima('2026-10-06T02:00:00Z')).toEqual({ fecha: '2026-10-05', diaSemana: 1, minutos: 21 * 60 });
  });
});

describe('jornadas y bloques', () => {
  it('lunes tiene mañana y tarde; domingo nada', () => {
    expect(jornadasDelDia(horario, 1).map(j => j.nombre)).toEqual(['Mañana', 'Tarde']);
    expect(jornadasDelDia(horario, 0)).toEqual([]);
  });

  it('una cita de 1 h no empieza a las 11:30', () => {
    const [manana] = bloquesDeJornadas(jornadasDelDia(horario, 1), 60);
    expect(manana.bloques).toContain('11:00');
    expect(manana.bloques).not.toContain('11:30');
    expect(manana.bloques[0]).toBe('08:00');
  });
});

describe('validarRangoCita', () => {
  it('acepta una cita dentro de la jornada', () => {
    expect(validarRangoCita({ inicio: lima('2026-10-05T11:30'), fin: lima('2026-10-05T12:00') }, config, AHORA))
      .toEqual({ valid: true });
  });

  it('rechaza domingo, feriado, fuera de jornada, pasado y rango invertido', () => {
    const casos = [
      [lima('2026-10-04T09:00'), lima('2026-10-04T09:30'), 'domingos'],
      [lima('2026-12-25T09:00'), lima('2026-12-25T09:30'), 'feriados'],
      [lima('2026-10-05T11:30'), lima('2026-10-05T12:30'), 'atención'],
      [lima('2026-10-05T13:00'), lima('2026-10-05T13:30'), 'atención'],
      [lima('2026-09-28T09:00'), lima('2026-09-28T09:30'), 'pasado'],
      [lima('2026-10-05T10:00'), lima('2026-10-05T09:30'), 'posterior']
    ];
    for (const [inicio, fin, texto] of casos) {
      const r = validarRangoCita({ inicio, fin }, config, AHORA);
      expect(r.valid).toBe(false);
      expect(r.reason).toContain(texto);
    }
  });

  it('rechaza un horario bloqueado y avisa el motivo', () => {
    const conBloqueo = {
      ...config,
      bloqueos: [{ inicio: lima('2026-10-05T08:00'), fin: lima('2026-10-05T10:00'), motivo: 'Congreso' }]
    };
    const r = validarRangoCita({ inicio: lima('2026-10-05T09:30'), fin: lima('2026-10-05T10:00') }, conBloqueo, AHORA);
    expect(r).toEqual({ valid: false, reason: 'El horario está bloqueado (Congreso).' });
    // Justo al terminar el bloqueo sí se puede
    expect(validarRangoCita({ inicio: lima('2026-10-05T10:00'), fin: lima('2026-10-05T10:30') }, conBloqueo, AHORA).valid).toBe(true);
  });

  it('sin "ahora" no aplica la regla del pasado', () => {
    expect(validarRangoCita({ inicio: lima('2020-10-05T09:00'), fin: lima('2020-10-05T09:30') }, config, null).valid).toBe(true);
  });

  it('un día sin jornadas que no es domingo', () => {
    const soloLunes = { horario: horario.filter(h => h.dia_semana === 1), feriados: [] };
    expect(validarRangoCita({ inicio: lima('2026-10-06T09:00'), fin: lima('2026-10-06T09:30') }, soloLunes, AHORA).reason)
      .toBe('No hay atención ese día de la semana.');
  });

  it('acepta feriados como filas de la BD', () => {
    const r = validarRangoCita(
      { inicio: lima('2026-12-25T09:00'), fin: lima('2026-12-25T09:30') },
      { horario, feriados: [{ fecha: '2026-12-25', nombre: 'Navidad' }] },
      AHORA
    );
    expect(r.valid).toBe(false);
  });
});

describe('sinReceta', () => {
  it('quita el bloque de receta de la descripción del evento', () => {
    expect(sinReceta('Control\n\n[Receta Médica]\nAmoxicilina')).toBe('Control');
    expect(sinReceta('Sin receta')).toBe('Sin receta');
  });
});
