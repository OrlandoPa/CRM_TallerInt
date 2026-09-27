import { X } from 'lucide-react';

// Contenedor común de los modales: overlay, cabecera con título y botón de cierre.
// El cuerpo y el pie los pone cada modal (a veces dentro de un <form>).
function ModalShell({ title, subtitle, onClose, size = '', zIndex, testId, closeTestId, children }) {
  return (
    <div
      className="modal-overlay"
      style={zIndex ? { zIndex } : undefined}
      data-testid={testId}
    >
      <div className={`modal-content ${size ? `size-${size}` : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn-icon" title="Cerrar" data-testid={closeTestId}>
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export default ModalShell;
