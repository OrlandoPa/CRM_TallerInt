import { Clock, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { getLimaDate } from '../../utils/dateHelpers';

function AttendanceView({ 
  pastAppointmentsToReview, 
  onMarkAttendance, 
  onOpenReschedule,
  hasRequiredGCalGmail
}) {
  return (
    <div className="attendance-view animate-fade-in" data-testid="view-attendance">
      {!hasRequiredGCalGmail && (
        <div className="glass-card animate-pulse" style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)'
        }}>
          <AlertCircle size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500 }}>
            Para acceder a estas funcionalidades por favor ingrese su cuenta de gmail valida para el google calendar
          </span>
        </div>
      )}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Citas Pasadas Pendientes de Asistencia</h2>
          </div>
          <span className="status-badge" style={{ background: 'rgba(var(--warning-rgb), 0.1)', color: 'var(--warning)', fontWeight: 600, padding: '4px 10px', borderRadius: '8px' }}>
            {pastAppointmentsToReview.length} {pastAppointmentsToReview.length === 1 ? 'pendiente' : 'pendientes'}
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          A continuación se listan las citas de fechas u horas pasadas que aún no han sido resueltas en el sistema. Por favor marca si el paciente asistió a su cita, no asistió, o si necesitas reprogramarla.
        </p>
        
        {pastAppointmentsToReview.length === 0 ? (
          <div 
            data-testid="attendance-empty-notice"
            style={{ 
            textAlign: 'center', 
            padding: '48px 24px', 
            color: 'var(--text-muted)', 
            fontSize: '0.95rem', 
            border: '1px dashed var(--border-color)', 
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.01)',
            marginTop: '12px'
          }}>
            🎉 ¡Todo al día! No hay citas pasadas pendientes de registrar asistencia.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            {pastAppointmentsToReview.map(cita => {
              const date = cita.fecha_hora_cita ? getLimaDate(cita.fecha_hora_cita) : null;
              const formattedDate = date 
                ? date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' a las ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                : 'Fecha no programada';
              const patientName = cita.pacientes?.nombre_paciente || 'Paciente sin registrar';

              return (
                <div key={cita.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '16px 20px', 
                  background: 'var(--bg-tertiary)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)', 
                  gap: '16px', 
                  flexWrap: 'wrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{patientName}</span>
                      {cita.telefono_paciente && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({cita.telefono_paciente})</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <Clock size={14} style={{ color: 'var(--primary)' }} />
                      <span>{formattedDate}</span>
                    </div>
                    {cita.motivo_consulta && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBlockEnd: 0 }}>
                        Motivo: {cita.motivo_consulta}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap' }}>
                    <button 
                      data-testid="btn-mark-attended"
                      onClick={() => {
                        if (!hasRequiredGCalGmail) {
                          alert('Para acceder a estas funcionalidades por favor ingrese su cuenta de gmail valida para el google calendar');
                          return;
                        }
                        onMarkAttendance(cita.google_event_id, 'ASISTIO');
                      }}
                      className="btn" 
                      disabled={!hasRequiredGCalGmail}
                      style={{ 
                        background: 'rgba(var(--success-rgb), 0.15)', 
                        color: 'var(--success)', 
                        border: '1px solid rgba(var(--success-rgb), 0.2)', 
                        padding: '8px 16px', 
                        fontSize: '0.85rem',
                        opacity: hasRequiredGCalGmail ? 1 : 0.5,
                        cursor: hasRequiredGCalGmail ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <Check size={16} /> Asistió
                    </button>
                    <button 
                      onClick={() => {
                        if (!hasRequiredGCalGmail) {
                          alert('Para acceder a estas funcionalidades por favor ingrese su cuenta de gmail valida para el google calendar');
                          return;
                        }
                        onMarkAttendance(cita.google_event_id, 'NO_ASISTIO');
                      }}
                      className="btn" 
                      disabled={!hasRequiredGCalGmail}
                      style={{ 
                        background: 'rgba(var(--danger-rgb), 0.15)', 
                        color: 'var(--danger)', 
                        border: '1px solid rgba(var(--danger-rgb), 0.2)', 
                        padding: '8px 16px', 
                        fontSize: '0.85rem',
                        opacity: hasRequiredGCalGmail ? 1 : 0.5,
                        cursor: hasRequiredGCalGmail ? 'pointer' : 'not-allowed'
                      }}
                    >
                      ✕ No Asistió
                    </button>
                    <button 
                      onClick={() => {
                        if (!hasRequiredGCalGmail) {
                          alert('Para acceder a estas funcionalidades por favor ingrese su cuenta de gmail valida para el google calendar');
                          return;
                        }
                        onOpenReschedule(cita);
                      }}
                      className="btn btn-secondary" 
                      disabled={!hasRequiredGCalGmail}
                      style={{ 
                        padding: '8px 16px', 
                        fontSize: '0.85rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        opacity: hasRequiredGCalGmail ? 1 : 0.5,
                        cursor: hasRequiredGCalGmail ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <RefreshCw size={14} /> Reprogramar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceView;
