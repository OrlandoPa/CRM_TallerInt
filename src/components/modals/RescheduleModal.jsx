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

  return (
    <div className="modal-overlay" style={{ zIndex: 120 }}>
      <div className="modal-content animate-slide-up" style={{ maxWidth: '450px', width: '90%' }}>
        <header className="modal-header">
          <span className="modal-title">Reprogramar Cita</span>
          <button 
            type="button"
            onClick={onClose} 
            className="btn-icon" 
            style={{width:'32px', height:'32px'}}
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
                value={rescheduleEvent.end}
                onChange={(e) => setRescheduleEvent(prev => ({ ...prev, end: e.target.value }))}
                required
                min={minDateTime}
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
            <button type="submit" className="btn btn-primary">
              Guardar Cambios
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default RescheduleModal;
