import { useEffect, useState } from 'react';
import * as api from '../../../services/api';

// Comentarios del personal sobre el rendimiento, el uso y la sostenibilidad
// del sistema (software verde, RNF-VERDE-13). Solo lectura, solo el doctor.
const fechaLima = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

function ComentariosPanel({ showToast }) {
  const [filas, setFilas] = useState(null);

  useEffect(() => {
    let vigente = true;
    api.getComentarios()
      .then(lista => { if (vigente) setFilas(lista); })
      .catch(err => {
        if (!vigente) return;
        showToast(err.message, false);
        setFilas([]);
      });
    return () => { vigente = false; };
  }, [showToast]);

  return (
    <section className="panel" aria-labelledby="comentarios-titulo">
      <header className="panel-head">
        <h3 className="panel-title" id="comentarios-titulo">Comentarios del personal</h3>
        <span className="panel-meta">Rendimiento, uso y consumo del sistema · últimos 100</span>
      </header>
      {filas === null ? (
        <p className="empty-state">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="empty-state">Aún no hay comentarios.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table" data-testid="tabla-comentarios">
            <caption className="sr-only">Últimos {filas.length} comentarios</caption>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Tema</th>
                <th scope="col">Comentario</th>
                <th scope="col">Quién</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.id}>
                  <td className="mono">{fechaLima.format(new Date(f.created_at))}</td>
                  <td>{api.CATEGORIAS_COMENTARIO[f.categoria] || f.categoria}</td>
                  <td>{f.texto}</td>
                  <td>{f.autor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default ComentariosPanel;
