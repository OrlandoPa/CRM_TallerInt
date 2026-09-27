import { useState } from 'react';
import * as api from '../../../services/api';
import { formatHora, getLimaDate } from '../../../utils/dateHelpers';

const formatRango = (inicio, fin) => {
  const a = getLimaDate(inicio);
  const b = getLimaDate(fin);
  if (!a || !b) return '—';
  const dia = (d) => d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
  return a.toDateString() === b.toDateString()
    ? `${dia(a)}, ${formatHora(a)} – ${formatHora(b)}`
    : `${dia(a)} ${formatHora(a)} – ${dia(b)} ${formatHora(b)}`;
};

function BloqueosPanel({ bloqueos, onConfigChanged, showToast }) {
  const [form, setForm] = useState({ desde: '', hasta: '', diaCompleto: true, horaDesde: '08:00', horaHasta: '21:00', motivo: '' });
  const [enviando, setEnviando] = useState(false);

  const rango = () => {
    if (form.diaCompleto) {
      // Días completos: de 00:00 del primer día a 00:00 del día siguiente al último
      const inicio = new Date(`${form.desde}T00:00`);
      const fin = new Date(`${form.hasta || form.desde}T00:00`);
      fin.setDate(fin.getDate() + 1);
      return { inicio, fin };
    }
    return {
      inicio: new Date(`${form.desde}T${form.horaDesde}`),
      fin: new Date(`${form.hasta || form.desde}T${form.horaHasta}`)
    };
  };

  const crear = async (e) => {
    e.preventDefault();
    const { inicio, fin } = rango();
    if (!(fin > inicio)) {
      showToast('El fin del bloqueo debe ser posterior al inicio.', false);
      return;
    }
    setEnviando(true);
    try {
      await api.crearBloqueo({ inicio: inicio.toISOString(), fin: fin.toISOString(), motivo: form.motivo });
      showToast('Bloqueo creado. También aparece como ocupado en Google Calendar.');
      setForm(f => ({ ...f, desde: '', hasta: '', motivo: '' }));
      await onConfigChanged();
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setEnviando(false);
    }
  };

  const quitar = async (b) => {
    if (!window.confirm(`¿Quitar el bloqueo "${b.motivo}"? Ese horario volverá a estar disponible.`)) return;
    try {
      await api.quitarBloqueo(b.id);
      showToast('Bloqueo quitado.');
      await onConfigChanged();
    } catch (err) {
      showToast(err.message, false);
    }
  };

  const hoy = new Date().toLocaleString('sv-SE').slice(0, 10);

  return (
    <div className="stack-col">
      <section className="panel" aria-labelledby="bloqueo-nuevo-titulo">
        <header className="panel-head">
          <h3 className="panel-title" id="bloqueo-nuevo-titulo">Bloquear agenda</h3>
          <span className="panel-meta">Vacaciones, congresos, días libres…</span>
        </header>
        <form className="panel-body inline-form" onSubmit={crear}>
          <div className="form-group">
            <label htmlFor="bloqueo-desde">Desde</label>
            <input id="bloqueo-desde" type="date" className="form-control" required min={hoy}
              value={form.desde} onChange={(e) => setForm(f => ({ ...f, desde: e.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="bloqueo-hasta">Hasta (opcional)</label>
            <input id="bloqueo-hasta" type="date" className="form-control" min={form.desde || hoy}
              value={form.hasta} onChange={(e) => setForm(f => ({ ...f, hasta: e.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="bloqueo-motivo">Motivo</label>
            <input id="bloqueo-motivo" className="form-control" required maxLength={200} placeholder="Ej. Congreso de odontología"
              value={form.motivo} onChange={(e) => setForm(f => ({ ...f, motivo: e.target.value }))} />
          </div>
          <label className="check span-all" htmlFor="bloqueo-dia-completo">
            <input id="bloqueo-dia-completo" type="checkbox" checked={form.diaCompleto}
              onChange={(e) => setForm(f => ({ ...f, diaCompleto: e.target.checked }))} />
            Días completos
          </label>
          {!form.diaCompleto && (
            <>
              <div className="form-group">
                <label htmlFor="bloqueo-hora-desde">Hora de inicio</label>
                <input id="bloqueo-hora-desde" type="time" step={1800} className="form-control" required
                  value={form.horaDesde} onChange={(e) => setForm(f => ({ ...f, horaDesde: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="bloqueo-hora-hasta">Hora de fin</label>
                <input id="bloqueo-hora-hasta" type="time" step={1800} className="form-control" required
                  value={form.horaHasta} onChange={(e) => setForm(f => ({ ...f, horaHasta: e.target.value }))} />
              </div>
            </>
          )}
          <div>
            <button type="submit" className="btn btn-primary" disabled={enviando} data-testid="btn-crear-bloqueo">
              {enviando ? 'Guardando…' : 'Bloquear'}
            </button>
          </div>
          <p className="help-text span-all">
            No se puede bloquear un horario que ya tiene citas: reprográmalas o cancélalas antes.
          </p>
        </form>
      </section>

      <section className="panel" aria-labelledby="bloqueos-titulo">
        <header className="panel-head">
          <h3 className="panel-title" id="bloqueos-titulo">Bloqueos vigentes</h3>
        </header>
        {bloqueos.length === 0 ? (
          <p className="empty-state">No hay bloqueos vigentes.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table" data-testid="tabla-bloqueos">
              <thead>
                <tr>
                  <th scope="col">Cuándo</th>
                  <th scope="col">Motivo</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {bloqueos.map(b => (
                  <tr key={b.id}>
                    <td>{formatRango(b.inicio, b.fin)}</td>
                    <td>{b.motivo}</td>
                    <td className="cell-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => quitar(b)}>Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default BloqueosPanel;
