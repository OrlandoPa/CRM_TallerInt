import { useEffect, useState } from 'react';
import * as api from '../../../services/api';
import { OPERACIONES, TABLAS_AUDITADAS, describirOrigen } from '../../../utils/auditoria';

// Revisión periódica de la auditoría por el doctor (Anexo F, Tabla 33).
// Solo lectura: la tabla no admite cambios ni borrados.
const PERIODOS = [
  { dias: 7, label: 'Últimos 7 días' },
  { dias: 30, label: 'Últimos 30 días' },
  { dias: 90, label: 'Últimos 90 días' }
];

const fechaLima = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

function AuditoriaPanel({ showToast }) {
  const [tabla, setTabla] = useState('');
  const [dias, setDias] = useState(30);
  // Resultado de la última consulta; mientras no coincide con el filtro vigente, se está cargando
  const [resultado, setResultado] = useState({ clave: null, filas: [] });
  const clave = `${tabla}|${dias}`;
  const cargando = resultado.clave !== clave;
  const filas = resultado.filas;

  useEffect(() => {
    let vigente = true;
    const desde = new Date(Date.now() - dias * 864e5).toISOString();
    api.getAuditoria({ tabla, desde })
      .then(lista => { if (vigente) setResultado({ clave: `${tabla}|${dias}`, filas: lista }); })
      .catch(err => {
        if (!vigente) return;
        showToast(err.message, false);
        setResultado({ clave: `${tabla}|${dias}`, filas: [] });
      });
    return () => { vigente = false; };
  }, [tabla, dias, showToast]);

  return (
    <section className="panel" aria-labelledby="auditoria-titulo">
      <header className="panel-head">
        <h3 className="panel-title" id="auditoria-titulo">Auditoría de cambios</h3>
        <span className="panel-meta">Solo lectura · revísela cada trimestre (Manual, §15.6)</span>
      </header>
      <div className="panel-body inline-form">
        <div className="form-group">
          <label htmlFor="auditoria-tabla">Qué</label>
          <select id="auditoria-tabla" className="form-control" value={tabla} onChange={(e) => setTabla(e.target.value)} data-testid="filtro-auditoria-tabla">
            <option value="">Todo</option>
            {Object.entries(TABLAS_AUDITADAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="auditoria-periodo">Periodo</label>
          <select id="auditoria-periodo" className="form-control" value={dias} onChange={(e) => setDias(Number(e.target.value))} data-testid="filtro-auditoria-periodo">
            {PERIODOS.map(p => <option key={p.dias} value={p.dias}>{p.label}</option>)}
          </select>
        </div>
      </div>
      {cargando ? (
        <p className="empty-state">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="empty-state">No hay cambios registrados en este periodo.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table" data-testid="tabla-auditoria">
            <caption className="sr-only">Últimos {filas.length} cambios registrados</caption>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Qué</th>
                <th scope="col">Operación</th>
                <th scope="col">Registro</th>
                <th scope="col">Quién</th>
                <th scope="col">Campos</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => {
                const [op, clase] = OPERACIONES[f.operacion] || [f.operacion, ''];
                const { quien, via } = describirOrigen(f);
                return (
                  <tr key={f.id}>
                    <td className="mono">{fechaLima.format(new Date(f.created_at))}</td>
                    <td>{TABLAS_AUDITADAS[f.tabla] || f.tabla}</td>
                    <td><span className={`badge ${clase}`}>{op}</span></td>
                    <td className="mono">{f.registro_id}</td>
                    <td>{quien} <span className="panel-meta">({via})</span></td>
                    <td>{f.campos_modificados?.length ? f.campos_modificados.join(', ') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AuditoriaPanel;
