import { ChevronLeft, ChevronRight, AlertCircle, Plus } from 'lucide-react';
import { getLimaDate } from '../../utils/dateHelpers';

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

  return (
    <div className="calendar-view animate-fade-in">
      <div className="calendar-header">
        <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
          <button 
            onClick={() => setCurrentDate(new Date(calendarYear, calendarMonth - 1, 1))} 
            className="btn-icon" 
            style={{width:'32px', height:'32px'}}
          >
            <ChevronLeft size={16} />
          </button>
          <h2 style={{fontSize: '1.25rem', fontWeight: 600}}>
            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
          </h2>
          <button 
            onClick={() => setCurrentDate(new Date(calendarYear, calendarMonth + 1, 1))} 
            className="btn-icon" 
            style={{width:'32px', height:'32px'}}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        
        <div style={{display: 'flex', gap: '12px'}}>
          {!gcalConnected && (
            <div style={{
              fontSize: '0.85rem', 
              color: 'var(--warning)', 
              background: 'rgba(245, 158, 11, 0.1)', 
              padding: '6px 12px', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px'
            }}>
              <AlertCircle size={14} /> Usando datos offline. Conecta GCal arriba.
            </div>
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

      <div className="calendar-grid-container">
        <div className="calendar-days-header">
          <span>DOM</span>
          <span>LUN</span>
          <span>MAR</span>
          <span>MIÉ</span>
          <span>JUE</span>
          <span>VIE</span>
          <span>SÁB</span>
        </div>
        <div className="calendar-grid">
          {Array.from({ length: calendarTotalCells }).map((_, idx) => {
            const dayNumber = idx - calendarStartOffset + 1;
            const isValidDay = dayNumber > 0 && dayNumber <= calendarDaysInMonth;
            
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

            const today = new Date();
            const isToday = isValidDay && 
                            today.getDate() === dayNumber && 
                            today.getMonth() === calendarMonth && 
                            today.getFullYear() === calendarYear;

            return (
              <div 
                key={idx} 
                className={`calendar-cell ${!isValidDay ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                style={{cursor: isValidDay ? 'pointer' : 'default'}}
                onClick={() => {
                  if (isValidDay) {
                    onSelectDay(new Date(calendarYear, calendarMonth, dayNumber));
                  }
                }}
              >
                {isValidDay && (
                  <>
                    <div className="calendar-cell-number">{dayNumber}</div>
                    <div className="calendar-events">
                       {dayEvents.map(evt => {
                         const dbCita = citasDb.find(c => c.google_event_id === evt.id);
                         const displayName = dbCita?.pacientes?.nombre_paciente || evt.summary.split(' - ')[0];
                         return (
                           <div 
                             key={evt.id} 
                             className="calendar-event confirmed" 
                             title={`${dbCita ? dbCita.pacientes?.nombre_paciente + " - " + dbCita.motivo_consulta : evt.summary}: ${evt.description}`}
                             onClick={(e) => {
                               e.stopPropagation(); // Avoid opening day details modal when clicking event
                               onOpenDetail(evt);
                             }}
                           >
                             {displayName}
                           </div>
                         );
                       })}
                     </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
