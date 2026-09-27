import { useState } from 'react';
import * as api from '../../../services/api';

// Fila editable de un servicio del catálogo
function FilaServicio({ servicio, onGuardado, showToast }) {
  const [valores, setValores] = useState(servicio);
  const [guardando, setGuardando] = useState(false);
  const cambiado = ['nombre', 'duracion_min', 'nota', 'activo', 'orden']
    .some(k => String(valores[k] ?? '') !== String(servicio[k] ?? ''));

  const guardar = async () => {
    setGuardando(true);
    try {
      await api.guardarServicio(valores);
      showToast(`Servicio "${valores.nombre}" actualizado.`);
      await onGuardado();
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setGuardando(false);
    }
  };

  const id = `servicio-${servicio.id}`;
  return (
    <tr className={valores.activo ? '' : 'is-inactive'}>
      <td>
        <label className="sr-only" htmlFor={`${id}-nombre`}>Nombre</label>
        <input id={`${id}-nombre`} className="form-control" value={valores.nombre}
          onChange={(e) => setValores(v => ({ ...v, nombre: e.target.value }))} maxLength={100} />
      </td>
      <td>
        <label className="sr-only" htmlFor={`${id}-duracion`}>Duración</label>
        <select id={`${id}-duracion`} className="form-control" value={valores.duracion_min}
          onChange={(e) => setValores(v => ({ ...v, duracion_min: Number(e.target.value) }))}>
          <option value={30}>30 min</option>
          <option value={60}>1 h</option>
        </select>
      </td>
      <td>
        <label className="sr-only" htmlFor={`${id}-nota`}>Nota</label>
        <input id={`${id}-nota`} className="form-control" value={valores.nota || ''}
          onChange={(e) => setValores(v => ({ ...v, nota: e.target.value }))} maxLength={200} />
      </td>
      <td>
        <label className="check" htmlFor={`${id}-activo`}>
          <input id={`${id}-activo`} type="checkbox" checked={!!valores.activo}
            onChange={(e) => setValores(v => ({ ...v, activo: e.target.checked }))} />
          {valores.activo ? 'Sí' : 'No'}
        </label>
      </td>
      <td className="cell-actions">
        <button type="button" className="btn btn-secondary btn-sm" disabled={!cambiado || guardando} onClick={guardar}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
}

function ServiciosPanel({ servicios, onConfigChanged, showToast }) {
  const [nuevo, setNuevo] = useState({ nombre: '', duracion_min: 30, nota: '' });
  const [enviando, setEnviando] = useState(false);

  const crear = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.guardarServicio({ ...nuevo, orden: servicios.length + 1 });
      showToast(`Servicio "${nuevo.nombre}" agregado al catálogo.`);
      setNuevo({ nombre: '', duracion_min: 30, nota: '' });
      await onConfigChanged();
    } catch (err) {
      showToast(err.message.includes('duplicate') ? 'Ya existe un servicio con ese nombre.' : err.message, false);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="stack-col">
      <section className="panel" aria-labelledby="servicios-titulo">
        <header className="panel-head">
          <h3 className="panel-title" id="servicios-titulo">Catálogo de servicios</h3>
          <span className="panel-meta">La duración define el bloque que ocupa la cita (CRM y bot)</span>
        </header>
        <div className="table-wrap">
          <table className="data-table" data-testid="tabla-servicios">
            <thead>
              <tr>
                <th scope="col">Servicio</th>
                <th scope="col">Duración</th>
                <th scope="col">Nota</th>
                <th scope="col">Activo</th>
                <th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {servicios.filter(s => s.id).map(s => (
                <FilaServicio key={`${s.id}-${s.updated_at}`} servicio={s} onGuardado={onConfigChanged} showToast={showToast} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="servicio-nuevo-titulo">
        <header className="panel-head">
          <h3 className="panel-title" id="servicio-nuevo-titulo">Agregar servicio</h3>
        </header>
        <form className="panel-body inline-form" onSubmit={crear}>
          <div className="form-group">
            <label htmlFor="servicio-nuevo-nombre">Nombre</label>
            <input id="servicio-nuevo-nombre" className="form-control" required maxLength={100}
              value={nuevo.nombre} onChange={(e) => setNuevo(n => ({ ...n, nombre: e.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="servicio-nuevo-duracion">Duración</label>
            <select id="servicio-nuevo-duracion" className="form-control" value={nuevo.duracion_min}
              onChange={(e) => setNuevo(n => ({ ...n, duracion_min: Number(e.target.value) }))}>
              <option value={30}>30 min</option>
              <option value={60}>1 h</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="servicio-nuevo-nota">Nota (opcional)</label>
            <input id="servicio-nuevo-nota" className="form-control" maxLength={200}
              value={nuevo.nota} onChange={(e) => setNuevo(n => ({ ...n, nota: e.target.value }))} />
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
          <p className="help-text span-all">
            Los servicios no se borran: desactívalos para que dejen de ofrecerse. El bot los lee desde la base de datos.
          </p>
        </form>
      </section>
    </div>
  );
}

export default ServiciosPanel;
