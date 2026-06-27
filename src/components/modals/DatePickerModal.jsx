import { Calendar as CalendarIcon } from 'lucide-react';

function DatePickerModal({ 
  isOpen, 
  onClose, 
  targetDateInput, 
  setTargetDateInput, 
  onSubmit 
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 130 }}>
      <div className="modal-content animate-slide-up" style={{ maxWidth: '400px', width: '90%' }}>
        <header className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={20} style={{ color: 'var(--primary)' }} />
            <span className="modal-title">Seleccionar Fecha de Cita</span>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="btn-icon" 
            style={{width:'32px', height:'32px'}}
          >
            ✕
          </button>
        </header>
        <div className="modal-body">
          <div className="form-group">
            <label>Elige la fecha para la cita</label>
            <input 
              type="date" 
              className="form-control" 
              value={targetDateInput}
              onChange={(e) => setTargetDateInput(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
        </div>
        <footer className="modal-footer">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-secondary"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={onSubmit} 
            className="btn btn-primary"
          >
            Ir a la Agenda de ese Día
          </button>
        </footer>
      </div>
    </div>
  );
}

export default DatePickerModal;
