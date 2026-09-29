// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import HorarioPanel from './HorarioPanel';

const feriados = [
  { fecha: '2000-01-01', nombre: 'Año Nuevo' },
  { fecha: '2999-07-28', nombre: 'Fiestas Patrias' },
  { fecha: '2999-12-25', nombre: 'Navidad' }
];

const renderPanel = () => render(
  <HorarioPanel horario={[]} feriados={feriados} onConfigChanged={() => {}} showToast={() => {}} />
);

const filas = (container) => [...container.querySelectorAll('[data-testid="tabla-feriados"] tbody tr')]
  .map(tr => tr.textContent);

describe('Filtro de feriados', () => {
  afterEach(cleanup);

  it('por defecto muestra solo los próximos, en orden', () => {
    const { container } = renderPanel();
    const texto = filas(container);
    expect(texto).toHaveLength(2);
    expect(texto[0]).toContain('Fiestas Patrias');
    expect(texto[1]).toContain('Navidad');
  });

  it('filtra por mes, pasados y por motivo sin tildes', () => {
    const { container, getByTestId } = renderPanel();
    fireEvent.change(getByTestId('select-periodo-feriado'), { target: { value: 'mes' } });
    fireEvent.change(getByTestId('input-mes-feriado'), { target: { value: '2999-12' } });
    expect(filas(container)).toHaveLength(1);
    expect(filas(container)[0]).toContain('Navidad');

    fireEvent.change(getByTestId('select-periodo-feriado'), { target: { value: 'pasados' } });
    expect(filas(container)).toHaveLength(1);
    expect(filas(container)[0]).toContain('Año Nuevo');

    fireEvent.change(getByTestId('select-periodo-feriado'), { target: { value: 'todos' } });
    fireEvent.change(getByTestId('input-buscar-feriado'), { target: { value: 'ano' } });
    expect(filas(container)).toHaveLength(1);
    expect(filas(container)[0]).toContain('Año Nuevo');
  });
});
