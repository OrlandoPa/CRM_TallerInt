import { useState, useEffect } from 'react';
import { Phone, Clock, Trash, RefreshCw, FileText } from 'lucide-react';
import { getLimaDate } from '../../utils/dateHelpers';
import { resolveContactIdentifier } from '../../utils/contactHelpers';
import { esAtendida } from '../../utils/estadosCita';

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

  useEffect(() => {
    if (selectedAppointmentDetails) {
      setPrescriptionText(selectedAppointmentDetails.tratamiento_receta || selectedAppointmentDetails.receta_medica || '');
      setPrescriptionSaved(false);
    }
  }, [selectedAppointmentDetails]);

  if (!isOpen || !selectedAppointmentDetails) return null;

  const isCompleted = esAtendida(selectedAppointmentDetails.estado_cita);
  const contactText = resolveContactIdentifier(selectedAppointmentDetails, leads, pacientes, citasDb);
  const patientDisplayName = selectedAppointmentDetails.pacientes?.nombre_paciente 
    || (selectedAppointmentDetails.summary ? selectedAppointmentDetails.summary.split(' - ')[0].trim() : '') 
    || 'Paciente sin nombre';

  return (
    <div className="modal-overlay" style={{ zIndex: 120 }} data-testid="modal-detail">
      <div className="modal-content animate-slide-up" style={{ maxWidth: '500px', width: '90%' }}>
        <header className="modal-header">
          <span className="modal-title">Detalles de la Cita</span>
          <button onClick={onClose} className="btn-icon" style={{width:'32px', height:'32px'}} data-testid="btn-close-detail-modal">✕</button>
        </header>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              background: 'var(--bg-tertiary)', 
              padding: '16px', 
              borderRadius: '12px', 
              border: '1px solid var(--border-color)' 
            }}>
              <div className="chat-avatar" style={{ flexShrink: 0 }}>
                {(patientDisplayName || 'P')[0].toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>
                  {patientDisplayName}
                </h3>
                <p style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--text-secondary)', 
                  margin: '4px 0 0 0', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}>
                  <Phone size={12} /> {contactText || 'Sin teléfono registrado'}
                </p>
              </div>
            </div>

            <div className="form-group">
              <label>Motivo de Consulta</label>
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                fontSize: '0.9rem', 
                color: 'var(--text-primary)' 
              }}>
                {selectedAppointmentDetails.motivo_consulta || 'Sin motivo especificado'}
              </div>
            </div>

            <div className="form-group">
              <label>Fecha y Hora</label>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'var(--bg-tertiary)', 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                fontSize: '0.9rem', 
                color: 'var(--text-primary)' 
              }}>
                <Clock size={16} style={{ color: 'var(--primary)' }} />
                <span>
                  {selectedAppointmentDetails.fecha_hora_cita 
                    ? (() => {
                        const date = getLimaDate(selectedAppointmentDetails.fecha_hora_cita);
                        return date.toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        }) + ' a las ' + date.toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        });
                      })()
                    : 'No programada'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Notas de la Cita</label>
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                fontSize: '0.9rem', 
                color: 'var(--text-primary)', 
                minHeight: '60px',
                whiteSpace: 'pre-line'
              }}>
                {selectedAppointmentDetails.detalles_notas_cita || selectedAppointmentDetails.description || 'Sin notas adicionales'}
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} style={{ color: 'var(--primary)' }} /> Tratamiento / Receta Médica (Opcional)
                </span>
                {prescriptionSaved && <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>✓ Guardado en BD</span>}
              </label>
              <textarea 
                data-testid="textarea-tratamiento-receta"
                className="form-control"
                rows={3}
                placeholder="Ej. Amoxicilina 500mg c/8h por 7 días. Indicaciones o receta médica..."
                value={prescriptionText}
                onChange={(e) => {
                  setPrescriptionText(e.target.value);
                  setPrescriptionSaved(false);
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button 
                  type="button" 
                  data-testid="btn-save-prescription"
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  disabled={isSavingPrescription}
                  onClick={async () => {
                    setIsSavingPrescription(true);
                    try {
                      if (onSavePrescription) {
                        await onSavePrescription(selectedAppointmentDetails, prescriptionText);
                      }
                      setPrescriptionSaved(true);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsSavingPrescription(false);
                    }
                  }}
                >
                  {isSavingPrescription ? 'Guardando...' : 'Guardar Receta / Tratamiento'}
                </button>
              </div>
            </div>

            {selectedAppointmentDetails.correo_electronico && (
              <div className="form-group">
                <label>Correo Electrónico (Recordatorio)</label>
                <div style={{ 
                  background: 'var(--bg-tertiary)', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)', 
                  fontSize: '0.9rem', 
                  color: 'var(--text-primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px' 
                }}>
                  <span style={{ color: 'var(--primary)' }}>✉</span>
                  <span>{selectedAppointmentDetails.correo_electronico}</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Estado de la Cita</label>
              <div style={{ marginTop: '4px' }}>
                <span style={{
                  fontSize: '0.85rem', 
                  fontWeight: 600, 
                  padding: '6px 12px', 
                  borderRadius: '6px',
                  display: 'inline-block',
                  background: selectedAppointmentDetails.estado_cita === 'CANCELADA' || selectedAppointmentDetails.estado_cita === 'NO_ASISTIO' 
                    ? 'rgba(var(--danger-rgb), 0.1)' 
                    : (isCompleted ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--warning-rgb), 0.1)'),
                  color: selectedAppointmentDetails.estado_cita === 'CANCELADA' || selectedAppointmentDetails.estado_cita === 'NO_ASISTIO' 
                    ? 'var(--danger)' 
                    : (isCompleted ? 'var(--success)' : 'var(--warning)')
                }}>
                  {selectedAppointmentDetails.estado_cita || 'AGENDADA'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <footer className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {!isCompleted && selectedAppointmentDetails.estado_cita !== 'CANCELADA' && (
              <button 
                type="button" 
                data-testid="btn-cancel-appointment"
                onClick={() => {
                  if (!hasRequiredGCalGmail) {
                    alert('Para acceder a estas funcionalidades por favor ingrese su cuenta de gmail valida para el google calendar');
                    return;
                  }
                  onDelete(selectedAppointmentDetails.google_event_id);
                }} 
                className="btn" 
                disabled={!hasRequiredGCalGmail}
                style={{ 
                  background: 'rgba(var(--danger-rgb), 0.1)', 
                  color: 'var(--danger)', 
                  border: '1px solid rgba(var(--danger-rgb), 0.2)',
                  opacity: hasRequiredGCalGmail ? 1 : 0.5,
                  cursor: hasRequiredGCalGmail ? 'pointer' : 'not-allowed'
                }}
              >
                <Trash size={14} /> Cancelar Cita
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isCompleted && selectedAppointmentDetails.estado_cita !== 'CANCELADA' && (
              <button 
                type="button" 
                data-testid="btn-reschedule-appointment"
                onClick={() => {
                  if (!hasRequiredGCalGmail) {
                    alert('Para acceder a estas funcionalidades por favor ingrese su cuenta de gmail valida para el google calendar');
                    return;
                  }
                  onReschedule(selectedAppointmentDetails);
                }} 
                className="btn btn-secondary"
                disabled={!hasRequiredGCalGmail}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  opacity: hasRequiredGCalGmail ? 1 : 0.5,
                  cursor: hasRequiredGCalGmail ? 'pointer' : 'not-allowed'
                }}
              >
                <RefreshCw size={14} /> Reprogramar
              </button>
            )}
            <button type="button" onClick={onClose} className="btn btn-primary" data-testid="btn-close-detail">
              Cerrar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default DetailModal;
