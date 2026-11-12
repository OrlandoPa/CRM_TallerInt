import { useState } from 'react';
import ModalShell from '../ui/ModalShell';
import * as api from '../../services/api';

// Canal de comentarios del personal sobre el sistema (software verde, RNF-VERDE-13).
// Lo lee el doctor en Administración → Comentarios.
function ComentarioModal({ isOpen, onClose, showToast }) {
  const [categoria, setCategoria] = useState('rendimiento');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!isOpen) return null;

  const cerrar = () => {
    setTexto('');
    onClose();
  };

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.enviarComentario({ categoria, texto });
      showToast('Gracias: tu comentario quedó registrado.');
      cerrar();
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalShell
      title="Comentarios sobre el sistema"
      subtitle="Cuéntanos si algo va lento, consume muchos datos o se puede mejorar"
      onClose={cerrar}
      size="sm"
      zIndex={120}
      testId="modal-comentario"
    >
      <form onSubmit={enviar}>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="comentario-categoria">Tema</label>
            <select
              id="comentario-categoria"
              className="form-control"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {Object.entries(api.CATEGORIAS_COMENTARIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="comentario-texto">Comentario</label>
            <textarea
              id="comentario-texto"
              className="form-control"
              rows={4}
              maxLength={2000}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="No incluyas datos de pacientes."
              required
            />
          </div>
        </div>
        <footer className="modal-footer">
          <button type="button" onClick={cerrar} className="btn btn-secondary">Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={enviando || texto.trim().length < 3}>
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

export default ComentarioModal;
