import { AlertTriangle } from 'lucide-react';
import { calculateEndTime, isPeruHoliday } from '../../utils/dateHelpers';
import { useAgendaConfig } from '../../utils/agendaConfig';
import ModalShell from '../ui/ModalShell';

function AppointmentModal({ 
  isOpen, 
  onClose, 
  newEvent, 
  setNewEvent, 
  isNewPatient, 
  setIsNewPatient, 
  newPatientName, 
  setNewPatientName, 
  newPatientPhone, 
  setNewPatientPhone, 
  treatmentType, 
  setTreatmentType, 
  sendEmailReminder, 
  setSendEmailReminder, 
  agendaDisponible,
  esDoctor = false,
  isTimeLocked,  
  leads, 
  minDateTime, 
  onSubmit 
}) {
  const { servicios, feriados } = useAgendaConfig();
  if (!isOpen) return null;

  // Catálogo de la BD (Administración > Servicios); los inactivos no se ofrecen
  const serviciosActivos = servicios.filter(sv => sv.activo !== false);
  const treatmentLabels = {
    ...Object.fromEntries(servicios.map(sv => [sv.clave, sv.nombre])),
    personalizado: 'Consulta'
  };
  const esFeriado = !!newEvent.start && isPeruHoliday(new Date(newEvent.start), feriados);

  return (
    <ModalShell
      title="Agendar cita"
      subtitle="Se crea en Google Calendar y en la base de datos"
      onClose={onClose}
      zIndex={150}
      testId="modal-appointment"
      closeTestId="btn-close-appointment-modal"
    >
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="appointment-title">Título de la cita</label>
              <input 
                id="appointment-title"
                data-testid="input-appointment-title"
                type="text" 
                className="form-control" 
                placeholder="Ej. Juan Pérez - Evaluación de Ortodoncia"
                value={newEvent.summary}
                onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="appointment-is-new">¿Paciente nuevo?</label>
              <select 
                id="appointment-is-new"
                data-testid="select-is-new-patient"
                className="form-control"
                value={isNewPatient ? 'si' : 'no'}
                onChange={(e) => {
                  const val = e.target.value === 'si';
                  setIsNewPatient(val);
                  setNewPatientName('');
                  setNewPatientPhone('');
                  setNewEvent(prev => ({ 
                    ...prev, 
                    phone_number: '',
                    summary: `Paciente - ${treatmentLabels[treatmentType] || 'Consulta'}`
                  }));
                }}
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>

            {!isNewPatient ? (
              <div className="form-group">
                <label htmlFor="appointment-patient">Paciente (registrado o contacto de WhatsApp)</label>
                <select 
                  id="appointment-patient"
                data-testid="select-whatsapp-patient"
                  className="form-control"
                  required
                  value={newEvent.phone_number}
                  onChange={(e) => {
                    const num = e.target.value;
                    const l = leads.find(lead => lead.phone_number === num);
                    const label = treatmentLabels[treatmentType] || 'Consulta';
                    const patientName = l ? l.client_name : 'Paciente';
                    const patientEmail = l ? l.client_email || '' : '';
                    setNewEvent(prev => ({ 
                      ...prev, 
                      phone_number: num,
                      email: patientEmail,
                      summary: `${patientName} - ${label}`
                    }));
                    setSendEmailReminder(!!patientEmail);
                  }}
                >
                  <option value="">Selecciona un paciente</option>
                  {leads.map(l => (
                    <option key={l.phone_number} value={l.phone_number}>
                      {l.client_name} ({l.phone_number})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="appointment-patient-name">Nombre del paciente</label>
                  <input 
                    id="appointment-patient-name"
                data-testid="input-patient-name"
                    type="text" 
                    className="form-control" 
                    placeholder="Ej. Carlos Prado"
                    value={newPatientName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewPatientName(val);
                      const label = treatmentLabels[treatmentType] || 'Consulta';
                      const patientName = val.trim() || 'Paciente';
                      setNewEvent(prev => ({
                        ...prev,
                        summary: `${patientName} - ${label}`
                      }));
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="appointment-patient-phone">Celular</label>
                  <input 
                    id="appointment-patient-phone"
                data-testid="input-patient-phone"
                    type="tel" 
                    className="form-control" 
                    placeholder="Ej. +51 999 888 777"
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="appointment-treatment">Tratamiento / motivo</label>
              <select 
                id="appointment-treatment"
                data-testid="select-treatment"
                className="form-control"
                value={treatmentType}
                onChange={(e) => {
                  const val = e.target.value;
                  setTreatmentType(val);
                  const l = leads.find(lead => lead.phone_number === newEvent.phone_number);
                  const patientName = l ? l.client_name : (isNewPatient && newPatientName.trim() ? newPatientName : 'Paciente');
                  const label = treatmentLabels[val] || 'Consulta';
                  const newSummary = `${patientName} - ${label}`;
                  
                  setNewEvent(prev => {
                    const newEnd = val !== 'personalizado' ? calculateEndTime(prev.start, val, servicios) : prev.end;
                    return {
                      ...prev,
                      summary: newSummary,
                      end: newEnd
                    };
                  });
                }}
              >
                {serviciosActivos.map(sv => (
                  <option key={sv.clave} value={sv.clave}>
                    {sv.nombre} ({sv.duracion_min === 60 ? '1 h' : '30 min'}{sv.nota ? `; ${sv.nota.replace(/\.$/, '')}` : ''})
                  </option>
                ))}
                <option value="personalizado">Otro / Personalizado</option>
              </select>
            </div>
            <div className="form-row">
            <div className="form-group">
              <label htmlFor="appointment-start">Inicio</label>
              <input 
                id="appointment-start"
                data-testid="input-start-time"
                type="datetime-local" 
                className="form-control" 
                value={newEvent.start}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewEvent(prev => {
                    const newEnd = treatmentType !== 'personalizado' ? calculateEndTime(val, treatmentType, servicios) : prev.end;
                    return {
                      ...prev,
                      start: val,
                      end: newEnd
                    };
                  });
                }}
                required
                min={minDateTime}
                disabled={isTimeLocked}
              />
            </div>
            <div className="form-group">
              <label htmlFor="appointment-end">Fin</label>
              <input 
                id="appointment-end"
                data-testid="input-end-time"
                type="datetime-local" 
                className="form-control" 
                value={newEvent.end}
                onChange={(e) => setNewEvent(prev => ({ ...prev, end: e.target.value }))}
                required
                min={minDateTime}
                disabled={isTimeLocked}
              />
            </div>
            </div>

            <label className="check" htmlFor="sendEmailReminder">
              <input 
                type="checkbox" 
                id="sendEmailReminder" 
                checked={sendEmailReminder}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSendEmailReminder(checked);
                  if (!checked) {
                    setNewEvent(prev => ({ ...prev, email: '' }));
                  }
                }}
              />
              Enviar recordatorio por correo electrónico
            </label>

            {sendEmailReminder && (
              <div className="form-group">
                <label htmlFor="appointment-email">Correo del paciente</label>
                <input
                  id="appointment-email"
                  type="email" 
                  className="form-control" 
                  placeholder="Ej. paciente@correo.com"
                  value={newEvent.email || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, email: e.target.value }))}
                  required={sendEmailReminder}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="appointment-notes">Notas de la cita</label>
              <textarea
                id="appointment-notes"
                className="form-control"
                rows={2}
                placeholder="Observaciones de la cita o del paciente..."
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Solo el doctor registra tratamientos; se guardan en la BD, no en Google Calendar */}
            {esDoctor && (
              <div className="form-group">
                <label htmlFor="appointment-tratamiento">Tratamiento / receta (opcional)</label>
                <textarea
                  id="appointment-tratamiento"
                  className="form-control"
                  rows={3}
                  placeholder="Ej. Amoxicilina 500mg c/8h por 7 días, Paracetamol 500mg si hay dolor. Reposo 24 horas."
                  value={newEvent.tratamiento_receta || ''}
                  onChange={(e) => {
                    const recetaText = e.target.value;
                    setNewEvent(prev => ({ ...prev, tratamiento_receta: recetaText }));
                  }}
                />
              </div>
            )}

            {esFeriado && (
              <div className="notice notice--bad" role="alert">
                <AlertTriangle size={16} />
                <span>No se pueden agendar citas en feriados.</span>
              </div>
            )}
          </div>
          <footer className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button 
              data-testid="btn-submit-appointment"
              type="submit" 
              className="btn btn-primary" 
              disabled={!agendaDisponible || esFeriado}
            >
              Agendar Cita
            </button>
          </footer>
        </form>
    </ModalShell>
  );
}

export default AppointmentModal;
