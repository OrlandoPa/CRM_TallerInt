import { useState } from 'react';
import { X } from 'lucide-react';
import * as api from '../../../services/api';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
// Lunes primero
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

// Horas cada 30 min, de 06:00 a 23:00
const HORAS = Array.from({ length: 35 }, (_, i) => {
  const min = 6 * 60 + i * 30;
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
});

const hhmm = (t) => String(t).slice(0, 5);

function HorarioPanel({ horario, feriados, onConfigChanged, showToast }) {
  const [jornada, setJornada] = useState({ dia_semana: 1, inicio: '08:00', fin: '12:00' });
  const [feriado, setFeriado] = useState({ fecha: '', nombre: '' });

  // Devuelve true si la acción se guardó
  const ejecutar = async (accion, mensaje) => {
    try {
      await accion();
      showToast(mensaje);
      await onConfigChanged();
      return true;
    } catch (err) {
      showToast(err.message.includes('duplicate') ? 'Ese feriado ya está registrado.' : err.message, false);
      return false;
    }
  };

  const agregarJornada = (e) => {
    e.preventDefault();
    if (jornada.fin <= jornada.inicio) {
      showToast('La hora de fin debe ser posterior a la de inicio.', false);
      return;
    }
    const choca = horario.some(h => Number(h.dia_semana) === Number(jornada.dia_semana)
      && hhmm(h.inicio) < jornada.fin && jornada.inicio < hhmm(h.fin));
    if (choca) {
      showToast('Esa jornada se superpone con otra del mismo día.', false);
      return;
    }
    ejecutar(() => api.agregarJornada(jornada), `Jornada agregada al ${DIAS[jornada.dia_semana].toLowerCase()}.`);
  };

  const hoy = new Date().toLocaleString('sv-SE').slice(0, 10);
  const proximosFeriados = feriados.filter(f => f.fecha >= hoy);

  return (
    <div className="stack-col">
      <section className="panel" aria-labelledby="horario-titulo">
        <header className="panel-head">
          <h3 className="panel-title" id="horario-titulo">Horario de atención</h3>
          <span className="panel-meta">Solo se agenda dentro de estas jornadas</span>
        </header>
        <div className="table-wrap">
          <table className="data-table" data-testid="tabla-horario">
            <thead>
              <tr>
                <th scope="col">Día</th>
                <th scope="col">Jornadas</th>
              </tr>
            </thead>
            <tbody>
              {ORDEN_DIAS.map(d => {
                const delDia = horario.filter(h => Number(h.dia_semana) === d && h.id)
                  .sort((a, b) => hhmm(a.inicio).localeCompare(hhmm(b.inicio)));
                return (
                  <tr key={d}>
                    <th scope="row">{DIAS[d]}</th>
                    <td>
                      {delDia.length === 0 ? <span className="muted">Sin atención</span> : (
                        <ul className="chip-list plain-list">
                          {delDia.map(h => (
                            <li key={h.id} className="chip">
                              <span className="mono">{hhmm(h.inicio)}–{hhmm(h.fin)}</span>
                              <button
                                type="button"
                                className="btn-icon danger"
                                aria-label={`Quitar jornada de ${hhmm(h.inicio)} a ${hhmm(h.fin)} del ${DIAS[d].toLowerCase()}`}
                                onClick={() => {
                                  if (!window.confirm(`¿Quitar la jornada ${hhmm(h.inicio)}–${hhmm(h.fin)} del ${DIAS[d].toLowerCase()}?`)) return;
                                  ejecutar(() => api.quitarJornada(h.id), 'Jornada quitada.');
                                }}
                              >
                                <X size={12} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <form className="panel-body inline-form" onSubmit={agregarJornada}>
          <div className="form-group">
            <label htmlFor="jornada-dia">Día</label>
            <select id="jornada-dia" className="form-control" value={jornada.dia_semana}
              onChange={(e) => setJornada(j => ({ ...j, dia_semana: Number(e.target.value) }))}>
              {ORDEN_DIAS.map(d => <option key={d} value={d}>{DIAS[d]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="jornada-inicio">Desde</label>
            <select id="jornada-inicio" className="form-control" value={jornada.inicio}
              onChange={(e) => setJornada(j => ({ ...j, inicio: e.target.value }))}>
              {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="jornada-fin">Hasta</label>
            <select id="jornada-fin" className="form-control" value={jornada.fin}
              onChange={(e) => setJornada(j => ({ ...j, fin: e.target.value }))}>
              {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <button type="submit" className="btn btn-primary">Agregar jornada</button>
          </div>
        </form>
      </section>

      <section className="panel" aria-labelledby="feriados-titulo">
        <header className="panel-head">
          <h3 className="panel-title" id="feriados-titulo">Feriados</h3>
          <span className="panel-meta">No se agenda en estas fechas</span>
        </header>
        <div className="table-wrap">
          <table className="data-table" data-testid="tabla-feriados">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Motivo</th>
                <th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {proximosFeriados.length === 0 && (
                <tr><td colSpan={3} className="muted">No hay feriados próximos registrados.</td></tr>
              )}
              {proximosFeriados.map(f => (
                <tr key={f.fecha}>
                  <td className="mono">{f.fecha}</td>
                  <td>{f.nombre || '—'}</td>
                  <td className="cell-actions">
                    <button type="button" className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (!window.confirm(`¿Quitar el feriado del ${f.fecha}? Ese día se podrá agendar.`)) return;
                        ejecutar(() => api.quitarFeriado(f.fecha), 'Feriado quitado.');
                      }}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="panel-body inline-form" onSubmit={(e) => {
          e.preventDefault();
          ejecutar(() => api.agregarFeriado(feriado), `Feriado del ${feriado.fecha} agregado.`)
            .then(ok => { if (ok) setFeriado({ fecha: '', nombre: '' }); });
        }}>
          <div className="form-group">
            <label htmlFor="feriado-fecha">Fecha</label>
            <input id="feriado-fecha" type="date" className="form-control" required min={hoy}
              value={feriado.fecha} onChange={(e) => setFeriado(f => ({ ...f, fecha: e.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="feriado-nombre">Motivo</label>
            <input id="feriado-nombre" className="form-control" maxLength={100} placeholder="Ej. Semana Santa"
              value={feriado.nombre} onChange={(e) => setFeriado(f => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div>
            <button type="submit" className="btn btn-primary">Agregar feriado</button>
          </div>
          <p className="help-text span-all">
            Se cargaron los feriados nacionales fijos de 2026 y 2027. Los movibles (como Semana Santa) hay que agregarlos cada año.
          </p>
        </form>
      </section>
    </div>
  );
}

export default HorarioPanel;
