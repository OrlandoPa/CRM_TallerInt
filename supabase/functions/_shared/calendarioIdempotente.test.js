import { describe, it, expect } from 'vitest';
import { crearClienteCalendar, esTransitorio, eventoEnHorario, idEventoGoogle } from './calendarioIdempotente.js';

// Google Calendar simulado: guarda eventos por id y permite inyectar fallos
const crearGoogleFalso = () => {
  const eventos = new Map();
  const fallos = []; // cola de fallos para las próximas llamadas: { tipo: 'red' | 'status' | 'red-tras-crear', status? }
  const llamadas = [];

  const responder = (status, cuerpo) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => cuerpo
  });

  const fetch = async (url, init) => {
    const metodo = init.method;
    const id = decodeURIComponent(new URL(url).pathname.split('/events/')[1] || '');
    const cuerpo = init.body ? JSON.parse(init.body) : undefined;
    llamadas.push({ metodo, id: id || cuerpo?.id });
    const fallo = fallos.shift();
    if (fallo?.tipo === 'red') throw new TypeError('fetch failed');
    if (fallo?.tipo === 'status') return responder(fallo.status, { error: { message: `falla ${fallo.status}` } });

    if (metodo === 'POST') {
      if (eventos.has(cuerpo.id)) return responder(409, { error: { message: 'The requested identifier already exists.' } });
      const ev = { ...cuerpo, status: 'confirmed' };
      eventos.set(cuerpo.id, ev);
      // Google lo creó, pero la respuesta no llega
      if (fallo?.tipo === 'red-tras-crear') throw new TypeError('socket hang up');
      return responder(200, ev);
    }
    const ev = eventos.get(id);
    if (metodo === 'GET') return ev ? responder(200, ev) : responder(404, { error: { message: 'Not Found' } });
    if (metodo === 'PATCH') {
      if (!ev) return responder(404, { error: { message: 'Not Found' } });
      Object.assign(ev, cuerpo);
      if (fallo?.tipo === 'red-tras-crear') throw new TypeError('socket hang up');
      return responder(200, ev);
    }
    if (metodo === 'DELETE') {
      if (!ev || ev.status === 'cancelled') return responder(410, {});
      ev.status = 'cancelled';
      return responder(204);
    }
    return responder(400, {});
  };

  return { fetch, eventos, fallos, llamadas, activos: () => [...eventos.values()].filter((e) => e.status !== 'cancelled') };
};

const crearCliente = (google, extra = {}) => crearClienteCalendar({
  fetch: google.fetch,
  obtenerToken: async () => 'token',
  urlEventos: (id = '') => `https://www.googleapis.com/calendar/v3/calendars/c/events${id ? `/${encodeURIComponent(id)}` : ''}`,
  crearError: (status, mensaje) => Object.assign(new Error(mensaje), { status }),
  esperar: async () => {},
  ...extra
});

describe('idEventoGoogle', () => {
  it('genera ids base32hex válidos para Google', () => {
    expect(idEventoGoogle('cita', 123)).toBe('sgrccita123');
    expect(idEventoGoogle('bloqueo', '7')).toBe('sgrcbloq7');
    expect(idEventoGoogle('cita', 1)).toMatch(/^[a-v0-9]{5,1024}$/);
  });
  it('rechaza tipos o ids no válidos', () => {
    expect(() => idEventoGoogle('otro', 1)).toThrow();
    expect(() => idEventoGoogle('cita', 'abc')).toThrow();
    expect(() => idEventoGoogle('cita', null)).toThrow();
  });
});

describe('esTransitorio', () => {
  it('reintenta red, 408, 429 y 5xx; no 4xx de negocio', () => {
    expect([0, 408, 429, 500, 503].every(esTransitorio)).toBe(true);
    expect([400, 401, 403, 404, 409].some(esTransitorio)).toBe(false);
  });
});

describe('crearEvento (RNF-SEG-04)', () => {
  const evento = { id: 'sgrccita10', summary: 'Ana - Consulta', start: { dateTime: '2026-10-20T15:00:00Z' }, end: { dateTime: '2026-10-20T15:30:00Z' } };

  it('crea el evento con el id propio', async () => {
    const g = crearGoogleFalso();
    const ev = await crearCliente(g).crearEvento(evento);
    expect(ev.id).toBe('sgrccita10');
    expect(g.activos()).toHaveLength(1);
  });

  it('si Google crea el evento pero la respuesta se pierde, el reintento no duplica', async () => {
    const g = crearGoogleFalso();
    g.fallos.push({ tipo: 'red-tras-crear' });
    const ev = await crearCliente(g).crearEvento(evento);
    expect(ev.id).toBe('sgrccita10');
    expect(g.activos()).toHaveLength(1);
    expect(g.llamadas.map((l) => l.metodo)).toEqual(['POST', 'POST', 'GET']); // 2.º POST → 409 → se lee el existente
  });

  it('reintenta un 503 y crea un solo evento', async () => {
    const g = crearGoogleFalso();
    g.fallos.push({ tipo: 'status', status: 503 }, { tipo: 'red' });
    await crearCliente(g).crearEvento(evento);
    expect(g.activos()).toHaveLength(1);
    expect(g.llamadas).toHaveLength(3);
  });

  it('no reintenta un 400 y no crea nada', async () => {
    const g = crearGoogleFalso();
    g.fallos.push({ tipo: 'status', status: 400 });
    await expect(crearCliente(g).crearEvento(evento)).rejects.toMatchObject({ status: 502 });
    expect(g.llamadas).toHaveLength(1);
    expect(g.activos()).toHaveLength(0);
  });

  it('tras agotar los reintentos, la compensación por id borra el evento que Google sí creó', async () => {
    const g = crearGoogleFalso();
    g.fallos.push({ tipo: 'red-tras-crear' }, { tipo: 'red' }, { tipo: 'red' });
    const cliente = crearCliente(g);
    await expect(cliente.crearEvento(evento)).rejects.toMatchObject({ status: 502 });
    expect(g.activos()).toHaveLength(1); // huérfano si no se compensa
    await cliente.llamar('DELETE', evento.id); // lo que hace la Edge Function en el catch
    expect(g.activos()).toHaveLength(0);
  });

  it('exige un id propio para no duplicar', async () => {
    const g = crearGoogleFalso();
    const sinId = { ...evento, id: undefined };
    await expect(crearCliente(g).crearEvento(sinId)).rejects.toMatchObject({ status: 500 });
    expect(g.llamadas).toHaveLength(0);
  });

  it('un id ya usado y eliminado no se reutiliza', async () => {
    const g = crearGoogleFalso();
    const cliente = crearCliente(g);
    await cliente.crearEvento(evento);
    await cliente.llamar('DELETE', evento.id);
    await expect(cliente.crearEvento(evento)).rejects.toMatchObject({ status: 409 });
    expect(g.activos()).toHaveLength(0);
  });

  it('un POST sin id no se reintenta (evita duplicados)', async () => {
    const g = crearGoogleFalso();
    g.fallos.push({ tipo: 'red' });
    await expect(crearCliente(g).llamar('POST', '', { summary: 'x' })).rejects.toMatchObject({ status: 502 });
    expect(g.llamadas).toHaveLength(1);
  });
});

describe('llamar: PATCH y DELETE', () => {
  it('DELETE de un evento que ya no existe no es error', async () => {
    const g = crearGoogleFalso();
    await expect(crearCliente(g).llamar('DELETE', 'sgrccita99')).resolves.toBeNull();
  });

  it('un PATCH cuya respuesta se pierde se reintenta y queda en el horario nuevo', async () => {
    const g = crearGoogleFalso();
    const cliente = crearCliente(g);
    await cliente.crearEvento({ id: 'sgrccita5', start: { dateTime: '2026-10-20T15:00:00Z' }, end: { dateTime: '2026-10-20T15:30:00Z' } });
    g.fallos.push({ tipo: 'red-tras-crear' });
    const nuevo = { start: { dateTime: '2026-10-21T15:00:00Z' }, end: { dateTime: '2026-10-21T15:30:00Z' } };
    await cliente.llamar('PATCH', 'sgrccita5', nuevo);
    expect(eventoEnHorario(await cliente.leerEvento('sgrccita5'), '2026-10-21T15:00:00.000Z', '2026-10-21T15:30:00Z')).toBe(true);
  });

  it('leerEvento devuelve null si el evento no existe o fue eliminado', async () => {
    const g = crearGoogleFalso();
    const cliente = crearCliente(g);
    expect(await cliente.leerEvento('sgrccita1')).toBeNull();
    await cliente.crearEvento({ id: 'sgrccita1' });
    await cliente.llamar('DELETE', 'sgrccita1');
    expect(await cliente.leerEvento('sgrccita1')).toBeNull();
  });

  it('propaga sin reintentar el error del token (ya formado)', async () => {
    const g = crearGoogleFalso();
    const cliente = crearCliente(g, {
      obtenerToken: async () => { throw Object.assign(new Error('refresh token'), { status: 502 }); }
    });
    await expect(cliente.llamar('GET', 'x')).rejects.toThrow('refresh token');
    expect(g.llamadas).toHaveLength(0);
  });
});

describe('eventoEnHorario', () => {
  it('compara instantes aunque el formato difiera', () => {
    const ev = { start: { dateTime: '2026-10-20T10:00:00-05:00' }, end: { dateTime: '2026-10-20T10:30:00-05:00' } };
    expect(eventoEnHorario(ev, '2026-10-20T15:00:00.000Z', '2026-10-20T15:30:00.000Z')).toBe(true);
    expect(eventoEnHorario(ev, '2026-10-20T16:00:00.000Z', '2026-10-20T16:30:00.000Z')).toBe(false);
    expect(eventoEnHorario(null, '2026-10-20T15:00:00Z', '2026-10-20T15:30:00Z')).toBe(false);
  });
});
