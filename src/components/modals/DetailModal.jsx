import { useState } from 'react';
import { Phone, Trash2, CalendarClock } from 'lucide-react';
import { getLimaDate, formatHora, formatFechaLarga } from '../../utils/dateHelpers';
import { resolveContactIdentifier } from '../../utils/contactHelpers';
import { esAtendida } from '../../utils/estadosCita';
import ModalShell from '../ui/ModalShell';
import StatusBadge from '../ui/StatusBadge';
import { GCAL_REQUIRED_MSG } from '../ui/GCalNotice';

function DetailModal({
  isOpen,
  onClose,
  selectedAppointmentDetails,
  onDelete,
  onReschedule,
  onSavePrescription,
  hasRequiredGCalGmail,
  leads = [],
  pacientes = [],
  citasDb = []
}) {
  const [prescriptionText, setPrescriptionText] = useState('');
  const [isSavingPrescription, setIsSavingPrescription] = useState(false);
  const [prescriptionSaved, setPrescriptionSaved] = useState(false);

  // Cada vez que se abre una cita se carga su receta. Guardar actualiza la misma
  // cita (mismo identificador), así que no borra el texto ni el aviso "Guardado".
  const citaKey = isOpen && selectedAppointmentDetails
    ? (selectedAppointmentDetails.google_event_id || selectedAppointmentDetails.id || null)
    : undefined;
  const [loadedCitaKey, setLoadedCitaKey] = useState();
  if (citaKey !== loadedCitaKey) {
    setLoadedCitaKey(citaKey);
    if (citaKey !== undefined) {
      setPrescriptionText(selectedAppointmentDetails.tratamiento_receta || selectedAppointmentDetails.receta_medica || '');
      setPrescriptionSaved(false);
    }
  }

  if (!isOpen || !selectedAppointmentDetails) return null;

  const cita = selectedAppointmentDetails;
  const isCompleted = esAtendida(cita.estado_cita);
  const isActive = !isCompleted && cita.estado_cita !== 'CANCELADA';
  const contactText = resolveContactIdentifier(cita, leads, pacientes, citasDb);
  const patientDisplayName = cita.pacientes?.nombre_paciente
    || (cita.summary ? cita.summary.split(' - ')[0].trim() : '')
    || 'Paciente sin nombre';
  const date = cita.fecha_hora_cita ? getLimaDate(cita.fecha_hora_cita) : null;

  const requireGCal = (action) => () => {
    if (!hasRequiredGCalGmail) {
      alert(GCAL_REQUIRED_MSG);
      return;
    }
    action();
  };

  return (
    <ModalShell
      title="Detalle de la cita"
      onClose={onClose}
      zIndex={120}
      testId="modal-detail"
      closeTestId="btn-close-detail-modal"
    >
      <div className="modal-body">
        <div className="patient-head">
          <span className="avatar avatar-lg">{(patientDisplayName || 'P')[0].toUpperCase()}</span>
          <div>
            <h3>{patientDisplayName}</h3>
            <p><Phone size={12} /> {contactText || 'Sin teléfono registrado'}</p>
          </div>
          <StatusBadge estado={cita.estado_cita} />
        </div>

        <dl className="details">
          <dt>Motivo</dt>
          <dd>{cita.motivo_consulta || 'Sin motivo especificado'}</dd>
          <dt>Fecha y hora</dt>
          <dd>
            {date ? (
              <>
                <span className="capitalize">{formatFechaLarga(date)}</span>
                {' · '}
                <span className="mono">{formatHora(date)}</span>
              </>
            ) : 'No programada'}
          </dd>
          <dt>Notas</dt>
          <dd>{cita.detalles_notas_cita || cita.description || 'Sin notas adicionales'}</dd>
          {cita.correo_electronico && (
            <>
              <dt>Correo</dt>
              <dd>{cita.correo_electronico}</dd>
            </>
          )}
        </dl>

        <div className="form-group">
          <div className="field-head">
            <label htmlFor="tratamiento-receta" className="field-label">Tratamiento / receta</label>
            <span className="saved-flag" role="status">{prescriptionSaved ? 'Guardado' : ''}</span>
          </div>
          <textarea
            id="tratamiento-receta"
            data-testid="textarea-tratamiento-receta"
            className="form-control"
            rows={3}
            placeholder="Ej. Amoxicilina 500 mg c/8 h por 7 días. Indicaciones para el paciente…"
            value={prescriptionText}
            onChange={(e) => {
              setPrescriptionText(e.target.value);
              setPrescriptionSaved(false);
            }}
          />
          <div className="field-actions">
            <button
              type="button"
              data-testid="btn-save-prescription"
              className="btn btn-secondary btn-sm"
              disabled={isSavingPrescription}
              onClick={async () => {
                setIsSavingPrescription(true);
                try {
                  if (onSavePrescription) {
                    await onSavePrescription(cita, prescriptionText);
                  }
                  setPrescriptionSaved(true);
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsSavingPrescription(false);
                }
              }}
            >
              {isSavingPrescription ? 'Guardando…' : 'Guardar Receta / Tratamiento'}
            </button>
          </div>
        </div>
      </div>

      <footer className="modal-footer split">
        <div className="group">
          {isActive && (
            <button
              type="button"
              data-testid="btn-cancel-appointment"
              onClick={requireGCal(() => onDelete(cita.google_event_id))}
              className="btn btn-danger"
              disabled={!hasRequiredGCalGmail}
            >
              <Trash2 size={14} /> Cancelar cita
            </button>
          )}
        </div>

        <div className="group">
          {isActive && (
            <button
              type="button"
              data-testid="btn-reschedule-appointment"
              onClick={requireGCal(() => onReschedule(cita))}
              className="btn btn-secondary"
              disabled={!hasRequiredGCalGmail}
            >
              <CalendarClock size={14} /> Reprogramar
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-primary" data-testid="btn-close-detail">
            Cerrar
          </button>
        </div>
      </footer>
    </ModalShell>
  );
}

export default DetailModal;
