import { Check, X, CalendarClock } from 'lucide-react';
import { getLimaDate, formatHora, formatDiaCorto } from '../../utils/dateHelpers';
import GCalNotice, { GCAL_REQUIRED_MSG } from '../ui/GCalNotice';

function AttendanceView({
  pastAppointmentsToReview,
  onMarkAttendance,
  onOpenReschedule,
  agendaDisponible
}) {
  // Marcar asistencia solo toca la BD; reprogramar necesita Google Calendar
  const requireGCal = (action) => () => {
    if (!agendaDisponible) {
      alert(GCAL_REQUIRED_MSG);
      return;
    }
    action();
  };

  const count = pastAppointmentsToReview.length;

  return (
    <div className="page attendance-view" data-testid="view-attendance">
      {!agendaDisponible && <GCalNotice />}

      <p className="lead">
        Citas cuya hora ya pasó y que siguen sin resolver. Marca si el paciente asistió o no, o reprográmala.
      </p>

      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title">Pendientes de registrar asistencia</h2>
          <span className={`badge ${count > 0 ? 'badge--warn' : 'badge--ok'}`}>
            {count} {count === 1 ? 'pendiente' : 'pendientes'}
          </span>
        </header>

        {count === 0 ? (
          <p data-testid="attendance-empty-notice" className="empty-state">
            ¡Todo al día! No hay citas pasadas pendientes de registrar asistencia.
          </p>
        ) : (
          pastAppointmentsToReview.map(cita => {
            const date = cita.fecha_hora_cita ? getLimaDate(cita.fecha_hora_cita) : null;
            const patientName = cita.pacientes?.nombre_paciente || 'Paciente sin registrar';
            const contact = cita.identificador_paciente || cita.telefono_paciente || cita.pacientes?.identificador_paciente || cita.pacientes?.telefono_whatsapp || cita.pacientes?.telefono_paciente;

            return (
              <div key={cita.id} className="review-row">
                <span className="appt-when">
                  {date ? (
                    <>
                      <span className="day">{formatDiaCorto(date)}</span>
                      <span className="time">{formatHora(date)}</span>
                    </>
                  ) : (
                    <span className="day">Sin fecha</span>
                  )}
                </span>
                <div className="appt-main">
                  <span className="appt-name">
                    {patientName}
                    {contact && <span className="contact">{contact}</span>}
                  </span>
                  {cita.motivo_consulta && <span className="appt-sub">{cita.motivo_consulta}</span>}
                </div>
                <div className="review-actions">
                  <button
                    data-testid="btn-mark-attended"
                    onClick={() => onMarkAttendance(cita.google_event_id, 'ASISTIO')}
                    className="btn btn-ok btn-sm"
                  >
                    <Check size={14} /> Asistió
                  </button>
                  <button
                    onClick={() => onMarkAttendance(cita.google_event_id, 'NO_ASISTIO')}
                    className="btn btn-danger btn-sm"
                  >
                    <X size={14} /> No Asistió
                  </button>
                  <button
                    onClick={requireGCal(() => onOpenReschedule(cita))}
                    className="btn btn-secondary btn-sm"
                    disabled={!agendaDisponible}
                  >
                    <CalendarClock size={14} /> Reprogramar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

export default AttendanceView;
