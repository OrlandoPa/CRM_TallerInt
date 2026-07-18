import { Phone, Clock, Trash, RefreshCw } from 'lucide-react';
import { getLimaDate } from '../../utils/dateHelpers';

function DetailModal({ 
  isOpen, 
  onClose, 
  selectedAppointmentDetails, 
  onDelete, 
  onReschedule,
  hasRequiredGCalGmail
}) {
  if (!isOpen || !selectedAppointmentDetails) return null;

  const isCompleted = ['ASISTIO', 'COMPLETADA'].includes(selectedAppointmentDetails.estado_cita);

  return (
    <div className="modal-overlay" style={{ zIndex: 120 }}>
      <div className="modal-content animate-slide-up" style={{ maxWidth: '500px', width: '90%' }}>
        <header className="modal-header">
          <span className="modal-title">Detalles de la Cita</span>
          <button onClick={onClose} className="btn-icon" style={{width:'32px', height:'32px'}}>✕</button>
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
                {(selectedAppointmentDetails.pacientes?.nombre_paciente || 'P')[0].toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>
                  {selectedAppointmentDetails.pacientes?.nombre_paciente || 'Paciente sin nombre'}
                </h3>
                <p style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--text-secondary)', 
                  margin: '4px 0 0 0', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}>
                  <Phone size={12} /> {selectedAppointmentDetails.telefono_paciente || 'Sin teléfono registrado'}
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
                minHeight: '60px' 
              }}>
                {selectedAppointmentDetails.detalles_notas_cita || selectedAppointmentDetails.description || 'Sin notas adicionales'}
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
            <button type="button" onClick={onClose} className="btn btn-primary">
              Cerrar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default DetailModal;
