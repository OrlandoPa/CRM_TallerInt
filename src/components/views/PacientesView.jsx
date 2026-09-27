import { useMemo, useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import { getLimaDate, formatHora, formatFechaLarga } from '../../utils/dateHelpers';
import { ESTADOS_CITA, esPendiente } from '../../utils/estadosCita';
import StatusBadge from '../ui/StatusBadge';

const formatFecha = (iso) => {
  const d = getLimaDate(iso);
  return d ? d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};

const sinTildes = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function PacienteDetalle({ paciente, citas, esDoctor, onActualizarPaciente, onOpenDetail }) {
  const [nombre, setNombre] = useState(paciente.nombre_paciente || '');
  const [guardando, setGuardando] = useState(false);

  const ahora = new Date();
  const conteo = (estado) => citas.filter(c => c.estado_cita === estado).length;
  const proxima = citas
    .filter(c => esPendiente(c.estado_cita) && new Date(c.fecha_hora_cita) >= ahora)
    .sort((a, b) => new Date(a.fecha_hora_cita) - new Date(b.fecha_hora_cita))[0];
  const historial = [...citas].sort((a, b) => new Date(b.fecha_hora_cita) - new Date(a.fecha_hora_cita));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await onActualizarPaciente(paciente.identificador_paciente, { nombre_paciente: nombre });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="stack-col">
      <section className="panel" aria-labelledby="paciente-titulo">
        <header className="panel-head">
          <h3 className="panel-title" id="paciente-titulo">{paciente.nombre_paciente || 'Paciente sin nombre'}</h3>
          <span className="panel-meta mono">{paciente.identificador_paciente}</span>
        </header>
        <div className="panel-body stack-col">
          <dl className="kv">
            <dt>Registrado</dt>
            <dd>{paciente.created_at ? formatFecha(paciente.created_at) : '—'}</dd>
            <dt>Aviso de privacidad</dt>
            <dd>
              {paciente.consentimiento_datos_at
                ? `Aceptado el ${formatFecha(paciente.consentimiento_datos_at)}`
                : 'Sin registro de aceptación'}
            </dd>
            <dt>Citas</dt>
            <dd>
              {citas.length} en total · {conteo(ESTADOS_CITA.ASISTIO)} asistió · {conteo(ESTADOS_CITA.NO_ASISTIO)} no asistió · {conteo(ESTADOS_CITA.CANCELADA)} canceladas
            </dd>
            <dt>Próxima cita</dt>
            <dd>
              {proxima
                ? `${formatFechaLarga(getLimaDate(proxima.fecha_hora_cita))}, ${formatHora(getLimaDate(proxima.fecha_hora_cita))}`
                : 'Ninguna programada'}
            </dd>
          </dl>

          <form onSubmit={guardar} className="inline-form">
            <div className="form-group">
              <label htmlFor="paciente-nombre">Nombre del paciente</label>
              <input
                id="paciente-nombre"
                data-testid="input-paciente-nombre"
                className="form-control"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                maxLength={150}
              />
            </div>
            <div>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={guardando || !nombre.trim() || nombre.trim() === (paciente.nombre_paciente || '')}
              >
                {guardando ? 'Guardando…' : 'Guardar nombre'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="panel" aria-labelledby="historial-titulo">
        <header className="panel-head">
          <h3 className="panel-title" id="historial-titulo">Historial de citas</h3>
          {!esDoctor && <span className="panel-meta">Los tratamientos solo los ve el doctor</span>}
        </header>
        {historial.length === 0 ? (
          <p className="empty-state">Este paciente aún no tiene citas.</p>
        ) : (
          <ul className="plain-list">
            {historial.map(c => {
              const fecha = getLimaDate(c.fecha_hora_cita);
              return (
                <li key={c.id} className="history-item">
                  <div className="history-head">
                    <button type="button" className="history-link" onClick={() => onOpenDetail(c)}>
                      <strong>{fecha ? `${formatFecha(c.fecha_hora_cita)} · ${formatHora(fecha)}` : 'Sin fecha'}</strong>
                      <span className="muted"> — {c.motivo_consulta || 'Cita'}</span>
                    </button>
                    <StatusBadge estado={c.estado_cita} />
                  </div>
                  {c.detalles_notas_cita && <p className="history-text">Notas: {c.detalles_notas_cita}</p>}
                  {esDoctor && c.tratamiento_receta && (
                    <p className="history-text">Tratamiento: {c.tratamiento_receta}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function PacientesView({ pacientes, citasDb, esDoctor, onActualizarPaciente, onOpenDetail }) {
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);

  const citasPorPaciente = useMemo(() => {
    const mapa = new Map();
    citasDb.forEach(c => {
      const id = c.identificador_paciente;
      if (!mapa.has(id)) mapa.set(id, []);
      mapa.get(id).push(c);
    });
    return mapa;
  }, [citasDb]);

  const filtrados = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    return [...pacientes]
      .filter(p => !q || sinTildes(p.nombre_paciente).includes(q) || sinTildes(p.identificador_paciente).includes(q))
      .sort((a, b) => sinTildes(a.nombre_paciente).localeCompare(sinTildes(b.nombre_paciente)));
  }, [pacientes, busqueda]);

  const paciente = pacientes.find(p => p.identificador_paciente === seleccionado) || null;

  return (
    <div className="page" data-testid="view-pacientes">
      <div className="split-view">
        <section className="panel" aria-labelledby="pacientes-titulo">
          <header className="panel-head">
            <h3 className="panel-title" id="pacientes-titulo">Pacientes</h3>
            <span className="panel-meta">{filtrados.length} de {pacientes.length}</span>
          </header>
          <div className="panel-body">
            <label htmlFor="buscar-paciente" className="sr-only">Buscar paciente</label>
            <div className="search-field">
              <Search size={15} aria-hidden="true" />
              <input
                id="buscar-paciente"
                data-testid="input-buscar-paciente"
                type="search"
                className="form-control"
                placeholder="Nombre o celular"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
          <div className="list-scroll">
            {filtrados.length === 0 ? (
              <p className="empty-state">No hay pacientes que coincidan.</p>
            ) : filtrados.map(p => {
              const n = citasPorPaciente.get(p.identificador_paciente)?.length || 0;
              return (
                <button
                  type="button"
                  key={p.identificador_paciente}
                  className="list-item"
                  data-testid="paciente-item"
                  aria-current={p.identificador_paciente === seleccionado ? 'true' : undefined}
                  onClick={() => setSeleccionado(p.identificador_paciente)}
                >
                  <span className="list-item-main">
                    <strong>{p.nombre_paciente || 'Paciente sin nombre'}</strong>
                    <span className="mono muted">{p.identificador_paciente}</span>
                  </span>
                  <span className="list-item-meta">
                    {n} {n === 1 ? 'cita' : 'citas'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {paciente ? (
          <PacienteDetalle
            key={paciente.identificador_paciente}
            paciente={paciente}
            citas={citasPorPaciente.get(paciente.identificador_paciente) || []}
            esDoctor={esDoctor}
            onActualizarPaciente={onActualizarPaciente}
            onOpenDetail={onOpenDetail}
          />
        ) : (
          <section className="panel">
            <div className="empty-state">
              <UserRound size={28} aria-hidden="true" />
              <p>Selecciona un paciente para ver su ficha e historial.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default PacientesView;
