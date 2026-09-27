import ModalShell from '../ui/ModalShell';

function DatePickerModal({
  isOpen,
  onClose,
  targetDateInput,
  setTargetDateInput,
  onSubmit
}) {
  if (!isOpen) return null;

  return (
    <ModalShell title="Nueva cita" subtitle="Elige el día para ver sus horarios libres" onClose={onClose} size="sm" zIndex={120}>
      <div className="modal-body">
        <div className="form-group">
          <label htmlFor="target-date">Fecha</label>
          <input
            id="target-date"
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
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Cancelar
        </button>
        <button type="button" onClick={onSubmit} className="btn btn-primary">
          Ver horarios del día
        </button>
      </footer>
    </ModalShell>
  );
}

export default DatePickerModal;
