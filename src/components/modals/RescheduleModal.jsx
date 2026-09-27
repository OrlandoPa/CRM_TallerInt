import { AlertTriangle } from 'lucide-react';
import { isPeruHoliday } from '../../utils/dateHelpers';
import ModalShell from '../ui/ModalShell';

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
    <ModalShell
      title="Reprogramar cita"
      onClose={onClose}
      size="sm"
      zIndex={160}
      testId="modal-reschedule"
      closeTestId="btn-close-reschedule"
    >
      <form onSubmit={onSubmit}>
        <div className="modal-body">
          <div className="reschedule-summary">
            <strong>
              {selectedCitaForReschedule.pacientes?.nombre_paciente || selectedCitaForReschedule.motivo_consulta?.split(' - ')[0] || 'Paciente'}
            </strong>
            <span>{selectedCitaForReschedule.motivo_consulta || 'Sin motivo'}</span>
          </div>

          <div className="form-group">
            <label htmlFor="reschedule-start">Nuevo inicio</label>
            <input
              id="reschedule-start"
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
            <label htmlFor="reschedule-end">Nuevo fin</label>
            <input
              id="reschedule-end"
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
            <div className="notice notice--bad" role="alert">
              <AlertTriangle size={16} />
              <span>No se puede reprogramar en feriados nacionales de Perú.</span>
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
            Guardar cambios
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

export default RescheduleModal;
