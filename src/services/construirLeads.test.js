import { describe, expect, it } from 'vitest';
import { construirLeads, COLUMNAS_CITAS, COLUMNAS_PACIENTES } from './api';

describe('construirLeads', () => {
  it('une pacientes y remitentes sin duplicar al mismo contacto', () => {
    const leads = construirLeads(
      [{ identificador_paciente: '+51987654321', nombre_paciente: 'Ana' }],
      ['51987654321', '+51911111111']
    );
    expect(leads).toHaveLength(2);
    expect(leads.find(l => l.client_name === 'Ana')?.status).toBe('contacted');
    expect(leads.find(l => l.phone_number === '+51911111111')?.status).toBe('lead');
  });

  it('acepta listas vacías o ausentes', () => {
    expect(construirLeads()).toEqual([]);
    expect(construirLeads(null, null)).toEqual([]);
  });
});

describe('lecturas acotadas (RNF-VERDE-05)', () => {
  it('pide columnas explícitas, nunca *', () => {
    expect(COLUMNAS_PACIENTES).not.toContain('*');
    expect(COLUMNAS_CITAS).not.toContain('*');
  });
});
