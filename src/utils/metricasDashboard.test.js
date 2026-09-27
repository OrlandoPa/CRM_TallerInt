import { describe, it, expect } from 'vitest';
import {
  calcularMetricas,
  resultadoPeriodo,
  ocupacion,
  citasPorSemana,
  categoriaTratamiento,
  prepararCitas,
  BLOQUES_POR_DIA
} from './metricasDashboard';

// Miércoles 16/09/2026 10:00 (hora local; la suite corre con TZ de Lima o equivalente)
const AHORA = new Date(2026, 8, 16, 10, 0);
const en = (dias, h, m = 0) => {
  const d = new Date(AHORA);
  d.setDate(d.getDate() + dias);
  d.setHours(h, m, 0, 0);
  return d;
};
let id = 0;
const cita = (fecha, estado, extra = {}) => ({
  id: ++id,
  google_event_id: `g${id}`,
  fecha_hora_cita: fecha.toISOString(),
  estado_cita: estado,
  motivo_consulta: 'Evaluación inicial',
  pacientes: { nombre_paciente: `Paciente ${id}` },
  ...extra
});

describe('Métricas del Dashboard', () => {
  it('Tasa de asistencia: solo cuenta citas resueltas; las canceladas no son inasistencia', () => {
    const citas = prepararCitas([
      cita(en(-2, 9), 'ASISTIO'),
      cita(en(-3, 9), 'ASISTIO'),
      cita(en(-4, 9), 'ASISTIO'),
      cita(en(-5, 9), 'NO_ASISTIO'),
      cita(en(-6, 9), 'CANCELADA')
    ]);
    const r = resultadoPeriodo(citas, en(-30, 0), AHORA);
    expect(r).toMatchObject({ asistio: 3, noAsistio: 1, canceladas: 1, tasa: 75 });
  });

  it('Sin citas resueltas la tasa es null (se muestra "—", no 0 %)', () => {
    expect(resultadoPeriodo([], en(-30, 0), AHORA).tasa).toBeNull();
  });

  it('Ocupación: 18 bloques por día laborable; una cita de 1 h ocupa 2 bloques; excluye domingos y canceladas', () => {
    expect(BLOQUES_POR_DIA).toBe(18);
    const citasDb = [
      cita(en(0, 16), 'AGENDADA'),
      cita(en(1, 9), 'CONFIRMADA'),
      cita(en(1, 10), 'CANCELADA')
    ];
    const appointments = [{
      id: citasDb[1].google_event_id,
      start: { dateTime: en(1, 9).toISOString() },
      end: { dateTime: en(1, 10).toISOString() }
    }];
    const o = ocupacion(prepararCitas(citasDb, appointments), AHORA, 7);
    // mié 16 → mar 22: 6 días laborables (el dom 20 no cuenta)
    expect(o.capacidad).toBe(6 * 18);
    expect(o.ocupados).toBe(3);
  });

  it('Citas por semana: 6 semanas atrás, la actual y la siguiente; separa ocurridas y programadas', () => {
    const citas = prepararCitas([
      cita(en(-1, 9), 'ASISTIO'),
      cita(en(1, 9), 'AGENDADA'),
      cita(en(1, 11), 'CANCELADA'),
      cita(en(7, 9), 'AGENDADA')
    ]);
    const semanas = citasPorSemana(citas, AHORA);
    expect(semanas).toHaveLength(8);
    const actual = semanas.find(s => s.esActual);
    expect(actual).toMatchObject({ pasadas: 1, programadas: 1 });
    expect(semanas[7]).toMatchObject({ pasadas: 0, programadas: 1 });
  });

  it('Clasifica el motivo de consulta en categorías de tratamiento', () => {
    expect(categoriaTratamiento('Blanqueamiento dental')).toBe('Blanqueamiento');
    expect(categoriaTratamiento('Extracción de cordal')).toBe('Cirugía');
    expect(categoriaTratamiento('')).toBe('Otros');
  });

  it('Indicadores del día: citas de hoy, por confirmar en 48 h, asistencia sin registrar y pacientes nuevos', () => {
    const m = calcularMetricas({
      ahora: AHORA,
      citasDb: [
        cita(en(0, 9), 'AGENDADA'),      // hoy, ya pasó sin registrar
        cita(en(0, 17), 'CONFIRMADA'),   // hoy, próxima
        cita(en(1, 9), 'AGENDADA'),      // por confirmar
        cita(en(1, 10), 'REPROGRAMADA'), // por confirmar
        cita(en(3, 9), 'AGENDADA'),      // fuera de 48 h
        cita(en(0, 11), 'CANCELADA')     // no cuenta
      ],
      pacientes: [
        { created_at: en(-5, 9).toISOString() },
        { created_at: en(-60, 9).toISOString() }
      ],
      appointments: []
    });
    expect(m.citasHoy).toHaveLength(2);
    expect(m.proximaHoy.fecha.getHours()).toBe(17);
    expect(m.porConfirmar).toHaveLength(2);
    expect(m.pendientesAsistencia).toHaveLength(1);
    expect(m.pacientesNuevos).toBe(1);
    expect(m.totalPacientes).toBe(2);
    expect(m.proximas).toHaveLength(4);
  });
});
