// Cliente de Google Calendar con reintentos que no duplican eventos (Anexo F,
// RNF-SEG-04). JavaScript puro, sin dependencias: lo usa la Edge Function
// "agenda" (Deno) y se prueba con Vitest.
//
// * Cada evento que crea el sistema lleva un id propio y determinista
//   (idEventoGoogle). Si la creación se reintenta, o se repite tras un timeout
//   en el que Google sí alcanzó a crearlo, Google responde 409 y se usa el que
//   ya existe en vez de crear otro.
// * Como el id se conoce antes de llamar a Google, la compensación puede
//   borrar el evento aunque la respuesta nunca haya llegado (sin huérfanos).
// * Solo se reintentan errores transitorios (red, 429, 5xx). GET, PATCH y
//   DELETE son idempotentes; un POST solo se reintenta si lleva id.

// Google exige ids en base32hex: minúsculas a-v y dígitos, de 5 a 1024 caracteres.
const ID_VALIDO = /^[a-v0-9]{5,1024}$/;
const PREFIJOS = { cita: 'sgrccita', bloqueo: 'sgrcbloq' };

export const idEventoGoogle = (tipo, id) => {
  const prefijo = PREFIJOS[tipo];
  const n = String(id ?? '');
  if (!prefijo) throw new Error(`Tipo de evento desconocido: ${tipo}`);
  if (!/^\d+$/.test(n)) throw new Error(`Id no válido para el evento: ${id}`);
  const valor = `${prefijo}${n}`;
  if (!ID_VALIDO.test(valor)) throw new Error(`Id de evento no válido para Google: ${valor}`);
  return valor;
};

// 0 = error de red o timeout (no hubo respuesta)
export const esTransitorio = (status) => status === 0 || status === 408 || status === 429 || status >= 500;

const esperarMs = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {object} o
 * @param {(url: string, init: object) => Promise<Response>} o.fetch
 * @param {() => Promise<string>} o.obtenerToken  access token de Google
 * @param {(eventId?: string) => string} o.urlEventos
 * @param {(status: number, mensaje: string) => Error} o.crearError
 * @param {number} [o.intentos]  intentos totales por llamada (por defecto 3)
 * @param {number} [o.timeoutMs]  límite por intento (por defecto 10 s)
 * @param {(ms: number) => Promise<void>} [o.esperar]
 * @param {(...a: unknown[]) => void} [o.log]
 */
export const crearClienteCalendar = ({
  fetch, obtenerToken, urlEventos, crearError,
  intentos = 3, timeoutMs = 10_000, esperar = esperarMs, log = () => {}
}) => {
  const llamar = async (metodo, eventId = '', cuerpo, query) => {
    const qs = query ? `?${new URLSearchParams(query)}` : '';
    const reintentable = metodo !== 'POST' || Boolean(cuerpo?.id);
    let ultimo = { status: 0, mensaje: 'sin respuesta' };

    for (let n = 1; n <= intentos; n++) {
      let r;
      try {
        r = await fetch(`${urlEventos(eventId)}${qs}`, {
          method: metodo,
          headers: { Authorization: `Bearer ${await obtenerToken()}`, 'Content-Type': 'application/json' },
          body: cuerpo ? JSON.stringify(cuerpo) : undefined,
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (e) {
        if (e?.status) throw e; // error ya formado (p. ej. del token)
        ultimo = { status: 0, mensaje: e?.message || 'error de red' };
        log('Google Calendar sin respuesta', metodo, eventId, n, ultimo.mensaje);
        if (!reintentable || n === intentos) break;
        await esperar(300 * 2 ** (n - 1));
        continue;
      }

      if (metodo === 'DELETE' && (r.status === 404 || r.status === 410)) return null; // ya no existe
      if (r.ok) return r.status === 204 ? null : r.json();

      const detalle = await r.json().catch(() => ({}));
      ultimo = { status: r.status, mensaje: detalle?.error?.message ?? r.statusText ?? '' };
      log('Google Calendar', metodo, eventId, r.status, n, detalle);
      if (!reintentable || !esTransitorio(r.status) || n === intentos) break;
      await esperar(300 * 2 ** (n - 1));
    }

    const error = crearError(502, `Google Calendar: ${ultimo.mensaje}`);
    error.statusGoogle = ultimo.status;
    throw error;
  };

  /** Crea el evento con su id; si ya existe (409), devuelve el existente. */
  const crearEvento = async (evento, query) => {
    if (!evento?.id) throw crearError(500, 'El evento necesita un id propio para crearse sin duplicados.');
    try {
      return await llamar('POST', '', evento, query);
    } catch (e) {
      if (e?.statusGoogle !== 409) throw e;
      const existente = await llamar('GET', evento.id);
      if (existente?.status === 'cancelled') {
        throw crearError(409, 'Google Calendar: ese evento ya se había creado y fue eliminado.');
      }
      return existente;
    }
  };

  /** Lee el evento; null si no existe o se borró. Nunca lanza. */
  const leerEvento = async (eventId) => {
    try {
      const e = await llamar('GET', eventId);
      return e && e.status !== 'cancelled' ? e : null;
    } catch {
      return null;
    }
  };

  return { llamar, crearEvento, leerEvento };
};

/** ¿El evento de Google ya está en ese horario? (compara instantes, no texto) */
export const eventoEnHorario = (evento, inicio, fin) => {
  const t = (v) => new Date(v).getTime();
  return Boolean(evento?.start?.dateTime && evento?.end?.dateTime)
    && t(evento.start.dateTime) === t(inicio)
    && t(evento.end.dateTime) === t(fin);
};
