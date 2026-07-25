import { isPeruHoliday } from '../../utils/dateHelpers';

function RescheduleModal({ 
  isOpen, 
  onClose, 
  selectedCitaForReschedule, 
  rescheduleEvent, 
  setRescheduleEvent, 
  minDateTime, 
  onSubmit 
}) {
  if (!isOpen || !selectedCitaForReschedule) return null;

  const isHoliday = rescheduleEvent.start ? isPeruHoliday(new Date(rescheduleEvent.start)) : false;

  return (
    <div className="modal-overlay" style={{ zIndex: 120 }} data-testid="modal-reschedule">
      <div className="modal-content animate-slide-up" style={{ maxWidth: '450px', width: '90%' }}>
        <header className="modal-header">
          <span className="modal-title">Reprogramar Cita</span>
          <button 
            type="button"
            onClick={onClose} 
            className="btn-icon" 
            style={{width:'32px', height:'32px'}}
            data-testid="btn-close-reschedule"
          >
            ✕
          </button>
        </header>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reprogramando la cita de:</span>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                {selectedCitaForReschedule.pacientes?.nombre_paciente || selectedCitaForReschedule.motivo_consulta?.split(' - ')[0] || 'Paciente'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Motivo original: {selectedCitaForReschedule.motivo_consulta || 'Sin motivo'}
              </div>
            </div>

            <div className="form-group">
              <label>Nueva Fecha y Hora de Inicio</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                data-testid="input-reschedule-start"
                value={rescheduleEvent.start}
                onChange={(e) => setRescheduleEvent(prev => ({ ...prev, start: e.target.value }))}
                required
                min={minDateTime}
              />
            </div>
            <div className="form-group">
              <label>Nueva Fecha y Hora de Fin</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                data-testid="input-reschedule-end"
                value={rescheduleEvent.end}
                onChange={(e) => setRescheduleEvent(prev => ({ ...prev, end: e.target.value }))}
                required
                min={minDateTime}
              />
            </div>

            {isHoliday && (
              <div className="alert alert-danger" style={{ 
                background: 'rgba(var(--danger-rgb, 239, 68, 68), 0.1)', 
                color: 'var(--danger, #ef4444)', 
                border: '1px solid rgba(var(--danger-rgb, 239, 68, 68), 0.2)',
                padding: '10px', 
                borderRadius: '8px', 
                fontSize: '0.85rem', 
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️ No se puede reprogramar en feriados nacionales de Perú.</span>
              </div>
            )}
          </div>
          <footer className="modal-footer">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-secondary"
              data-testid="btn-cancel-reschedule"
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isHoliday} data-testid="btn-submit-reschedule">
              Guardar Cambios
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default RescheduleModal;
