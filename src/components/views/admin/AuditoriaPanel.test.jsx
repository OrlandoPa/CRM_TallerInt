// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import AuditoriaPanel from './AuditoriaPanel';
import { describirOrigen } from '../../../utils/auditoria';
import * as api from '../../../services/api';

vi.mock('../../../services/api', () => ({ getAuditoria: vi.fn() }));

const filas = [
  { id: 3, created_at: '2026-10-15T20:00:00Z', tabla: 'citas', operacion: 'UPDATE', registro_id: '41', origen: 'crm', usuario: 'doctor@gmail.com', campos_modificados: ['estado_cita'] },
  { id: 2, created_at: '2026-10-15T19:00:00Z', tabla: 'pacientes', operacion: 'INSERT', registro_id: '+51987654321', origen: 'conexion_directa', usuario: 'n8n_bot', campos_modificados: null },
  { id: 1, created_at: '2026-10-12T08:30:00Z', tabla: 'retencion', operacion: 'DELETE', registro_id: '2026-10-12', origen: 'conexion_directa', usuario: 'postgres', aplicacion: 'retencion_purgar', campos_modificados: null }
];

describe('AuditoriaPanel', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('lista los cambios con quién, qué y cuándo (hora de Lima), sin datos de las filas', async () => {
    api.getAuditoria.mockResolvedValue(filas);
    const { container, findByTestId } = render(<AuditoriaPanel showToast={() => {}} />);
    const tabla = await findByTestId('tabla-auditoria');
    const textos = [...tabla.querySelectorAll('tbody tr')].map(tr => tr.textContent);
    expect(textos).toHaveLength(3);
    expect(textos[0]).toContain('Citas');
    expect(textos[0]).toContain('Cambio');
    expect(textos[0]).toContain('doctor@gmail.com');
    expect(textos[0]).toContain('estado_cita');
    expect(textos[0]).toContain('15/10/2026, 15:00'); // 20:00 UTC = 15:00 en Lima
    expect(textos[1]).toContain('Asistente de WhatsApp');
    expect(textos[2]).toContain('Retención automática');
    expect(container.textContent).not.toContain('datos_antes');
  });

  it('pide a la API el periodo y la tabla elegidos', async () => {
    api.getAuditoria.mockResolvedValue([]);
    const { findByText, getByTestId } = render(<AuditoriaPanel showToast={() => {}} />);
    await findByText('No hay cambios registrados en este periodo.');
    const primera = api.getAuditoria.mock.calls[0][0];
    expect(primera.tabla).toBe('');
    expect(Date.now() - new Date(primera.desde).getTime()).toBeGreaterThan(29 * 864e5);

    fireEvent.change(getByTestId('filtro-auditoria-tabla'), { target: { value: 'tratamientos_cita' } });
    await waitFor(() => expect(api.getAuditoria).toHaveBeenLastCalledWith(expect.objectContaining({ tabla: 'tratamientos_cita' })));
    fireEvent.change(getByTestId('filtro-auditoria-periodo'), { target: { value: '7' } });
    await waitFor(() => {
      const ultima = api.getAuditoria.mock.calls.at(-1)[0];
      expect(Date.now() - new Date(ultima.desde).getTime()).toBeLessThan(8 * 864e5);
    });
  });

  it('muestra el error de la API (p. ej. recepción sin permiso)', async () => {
    api.getAuditoria.mockRejectedValue(new Error('No tienes permiso para esta acción.'));
    const showToast = vi.fn();
    render(<AuditoriaPanel showToast={showToast} />);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('No tienes permiso para esta acción.', false));
  });

  it('describe el origen de cada cambio', () => {
    expect(describirOrigen({ origen: 'crm', usuario: 'a@b.com' })).toEqual({ quien: 'a@b.com', via: 'CRM' });
    expect(describirOrigen({ origen: 'conexion_directa', usuario: 'n8n_bot' }).quien).toBe('Asistente de WhatsApp');
    expect(describirOrigen({ origen: 'conexion_directa', usuario: 'postgres' })).toEqual({ quien: 'postgres', via: 'Conexión directa' });
  });
});
