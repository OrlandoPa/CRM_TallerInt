import { ChevronLeft, ChevronRight, AlertCircle, Plus } from 'lucide-react';
import { getLimaDate } from '../../utils/dateHelpers';
import { tonoEstado } from '../../utils/estadosCita';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function CalendarView({
  currentDate,
  setCurrentDate,
  appointments,
  citasDb,
  gcalConnected,
  onOpenDetail,
  onSelectDay,
  onAddAppointment
}) {
  const calendarYear = currentDate.getFullYear();
  const calendarMonth = currentDate.getMonth();
  const calendarStartOffset = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarTotalCells = Math.ceil((calendarStartOffset + calendarDaysInMonth) / 7) * 7;
  const today = new Date();

  return (
    <div className="page calendar-view">
      <div className="toolbar">
        <div className="date-nav">
          <button
            onClick={() => setCurrentDate(new Date(calendarYear, calendarMonth - 1, 1))}
            className="btn-icon bordered"
            title="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date(calendarYear, calendarMonth + 1, 1))}
            className="btn-icon bordered"
            title="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
          <h2>{currentDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}</h2>
        </div>

        <div className="toolbar-group">
          {!gcalConnected && (
            <span className="badge badge--warn">
              <AlertCircle size={13} /> Google Calendar desconectado
            </span>
          )}
          <button
            onClick={onAddAppointment}
            className="btn btn-primary"
            disabled={!gcalConnected}
            title={!gcalConnected ? 'Debes conectar Google Calendar primero' : ''}
          >
            <Plus size={16} /> Agendar Cita
          </button>
        </div>
      </div>

      <div className="panel cal">
        <div className="cal-weekdays">
          {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
        </div>
        <div className="cal-grid">
          {Array.from({ length: calendarTotalCells }).map((_, idx) => {
            const dayNumber = idx - calendarStartOffset + 1;
            const isValidDay = dayNumber > 0 && dayNumber <= calendarDaysInMonth;

            if (!isValidDay) {
              return <div key={idx} className="cal-cell is-empty" />;
            }

            // Calculate events for this day
            const dayEvents = appointments.filter(app => {
              const dbCita = citasDb.find(c => c.google_event_id === app.id);
              let appDate = null;
              if (dbCita && dbCita.fecha_hora_cita) {
                appDate = getLimaDate(dbCita.fecha_hora_cita);
              }
              if (!appDate) {
                appDate = getLimaDate(app.start?.dateTime || app.start?.date);
              }
              if (!appDate) return false;
              return appDate.getDate() === dayNumber &&
                     appDate.getMonth() === calendarMonth &&
                     appDate.getFullYear() === calendarYear;
            });

            const isToday = today.getDate() === dayNumber &&
                            today.getMonth() === calendarMonth &&
                            today.getFullYear() === calendarYear;

            return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                aria-label={`Ver agenda del ${dayNumber}`}
                className={`cal-cell is-day ${isToday ? 'is-today' : ''}`}
                onClick={() => onSelectDay(new Date(calendarYear, calendarMonth, dayNumber))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectDay(new Date(calendarYear, calendarMonth, dayNumber));
                  }
                }}
              >
                <span className="cal-daynum">{dayNumber}</span>
                <div className="cal-events">
                  {dayEvents.map(evt => {
                    const dbCita = citasDb.find(c => c.google_event_id === evt.id);
                    const displayName = dbCita?.pacientes?.nombre_paciente || evt.summary.split(' - ')[0];
                    return (
                      <button
                        type="button"
                        key={evt.id}
                        className={`cal-event tone-${tonoEstado(dbCita?.estado_cita)}`}
                        title={`${dbCita ? dbCita.pacientes?.nombre_paciente + ' - ' + dbCita.motivo_consulta : evt.summary}${evt.description ? `: ${evt.description}` : ''}`}
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid opening day details modal when clicking event
                          onOpenDetail(evt);
                        }}
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
