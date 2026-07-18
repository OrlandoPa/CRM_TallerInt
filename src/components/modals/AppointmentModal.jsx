import { calculateEndTime, isPeruHoliday } from '../../utils/dateHelpers';

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
  gcalConnected, 
  isTimeLocked, 
  leads, 
  minDateTime, 
  onSubmit 
}) {
  if (!isOpen) return null;

  const treatmentLabels = {
    evaluacion: 'Evaluación Inicial',
    restauracion: 'Restauración',
    endodoncia: 'Endodoncia',
    ortodoncia: 'Ortodoncia',
    blanqueamiento: 'Blanqueamiento Dental',
    cirugia: 'Cirugía de Cordales',
    rehabilitacion: 'Rehabilitación Oral',
    personalizado: 'Consulta'
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }}>
      <div className="modal-content animate-slide-up">
        <header className="modal-header">
          <span className="modal-title">Agendar Cita en Google Calendar</span>
          <button onClick={onClose} className="btn-icon" style={{width:'32px', height:'32px'}}>✕</button>
        </header>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Título de la Cita</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Ej. Juan Pérez - Evaluación de Ortodoncia"
                value={newEvent.summary}
                onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>¿Paciente nuevo?</label>
              <select 
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
                <label>Vincular a Paciente de WhatsApp (Opcional)</label>
                <select 
                  className="form-control"
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
                  <option value="">-- No vincular --</option>
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
                  <label>Nombre del Paciente Nuevo</label>
                  <input 
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
                  <label>Número de Celular</label>
                  <input 
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
              <label>Tipo de Tratamiento / Motivo</label>
              <select 
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
                    const newEnd = val !== 'personalizado' ? calculateEndTime(prev.start, val) : prev.end;
                    return {
                      ...prev,
                      summary: newSummary,
                      end: newEnd
                    };
                  });
                }}
              >
                <option value="evaluacion">Evaluación inicial / Revisión general (30 min)</option>
                <option value="restauracion">Restauración (30 min)</option>
                <option value="endodoncia">Endodoncia (30 min)</option>
                <option value="ortodoncia">Ortodoncia (30 min)</option>
                <option value="blanqueamiento">Blanqueamiento dental (45 min)</option>
                <option value="cirugia">Cirugía (ej. cordales) (60 min)</option>
                <option value="rehabilitacion">Rehabilitación oral (60 min)</option>
                <option value="personalizado">Otro / Personalizado</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha y Hora de Inicio</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                value={newEvent.start}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewEvent(prev => {
                    const newEnd = treatmentType !== 'personalizado' ? calculateEndTime(val, treatmentType) : prev.end;
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
              <label>Fecha y Hora de Fin</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                value={newEvent.end}
                onChange={(e) => setNewEvent(prev => ({ ...prev, end: e.target.value }))}
                required
                min={minDateTime}
                disabled={isTimeLocked}
              />
            </div>

            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
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
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <label htmlFor="sendEmailReminder" style={{ cursor: 'pointer', margin: 0 }}>
                ¿Enviar recordatorio por correo electrónico?
              </label>
            </div>

            {sendEmailReminder && (
              <div className="form-group animate-slide-up">
                <label>Correo Electrónico para Recordatorio</label>
                <input 
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
              <label>Detalles / Notas de la Cita</label>
              <textarea 
                className="form-control"
                rows={3}
                placeholder="Observaciones de la cita médica..."
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {newEvent.start && isPeruHoliday(new Date(newEvent.start)) && (
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
                <span>⚠️ No se pueden agendar citas en feriados nacionales de Perú.</span>
              </div>
            )}
          </div>
          <footer className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={!gcalConnected || (newEvent.start && isPeruHoliday(new Date(newEvent.start)))}
            >
              Agendar Cita
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default AppointmentModal;
