// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import PacientesView from './PacientesView';

const pacientes = [
  { identificador_paciente: '+51987654321', nombre_paciente: 'Ana Torres', created_at: '2026-08-02T10:00:00Z' },
  { identificador_paciente: '+51911222333', nombre_paciente: 'Carlos Ñique' }
];
const citasDb = [
  { id: 1, identificador_paciente: '+51987654321', fecha_hora_cita: '2026-09-10T14:00:00Z', motivo_consulta: 'Evaluación', estado_cita: 'ASISTIO', tratamiento_receta: 'Control en 6 meses' }
];

const renderVista = (esDoctor) => render(
  <PacientesView pacientes={pacientes} citasDb={citasDb} esDoctor={esDoctor} onActualizarPaciente={() => {}} onOpenDetail={() => {}} />
);

describe('Módulo de Pacientes', () => {
  afterEach(cleanup);

  it('busca por nombre sin distinguir tildes ni mayúsculas y por celular', () => {
    const { container, getByTestId } = renderVista(true);
    const buscar = getByTestId('input-buscar-paciente');
    fireEvent.change(buscar, { target: { value: 'nique' } });
    expect(container.querySelectorAll('[data-testid="paciente-item"]')).toHaveLength(1);
    expect(container.textContent).toContain('Carlos Ñique');
    fireEvent.change(buscar, { target: { value: '98765' } });
    expect(container.textContent).toContain('Ana Torres');
    expect(container.textContent).not.toContain('Carlos Ñique');
  });

  it('el doctor ve los tratamientos en el historial; recepción no', () => {
    const doctor = renderVista(true);
    fireEvent.click(doctor.container.querySelector('[data-testid="paciente-item"]'));
    expect(doctor.container.textContent).toContain('Tratamiento: Control en 6 meses');
    cleanup();

    const recepcion = renderVista(false);
    fireEvent.click(recepcion.container.querySelector('[data-testid="paciente-item"]'));
    expect(recepcion.container.textContent).toContain('Evaluación');
    expect(recepcion.container.textContent).not.toContain('Control en 6 meses');
  });
});
