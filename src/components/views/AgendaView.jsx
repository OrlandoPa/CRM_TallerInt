import { ChevronLeft, ChevronRight, Trash } from 'lucide-react';
import { getLimaDate } from '../../utils/dateHelpers';

function AgendaView({ 
  selectedAgendaDate, 
  setSelectedAgendaDate, 
  appointments, 
  citasDb, 
  gcalConnected, 
  onOpenDetail, 
  onDeleteAppointment, 
  onAddAppointmentFromSlot 
}) {
  const getMorningSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 11; hour++) {
      const hStr = String(hour).padStart(2, '0');
      slots.push(`${hStr}:00`);
      slots.push(`${hStr}:30`);
    }
    return slots;
  };

  const getAfternoonSlots = () => {
    const slots = [];
    for (let hour = 16; hour <= 20; hour++) {
      const hStr = String(hour).padStart(2, '0');
      slots.push(`${hStr}:00`);
      slots.push(`${hStr}:30`);
    }
    return slots;
  };

  const getEventsForTimeSlot = (slotString, dayDate) => {
    const [hours, minutes] = slotString.split(':').map(Number);
    const slotTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hours, minutes);

    return appointments.filter(app => {
      const dbCita = citasDb.find(c => c.google_event_id === app.id);
      
      let appStart = null;
      if (dbCita && dbCita.fecha_hora_cita) {
        appStart = getLimaDate(dbCita.fecha_hora_cita);
      }
      if (!appStart) {
        appStart = getLimaDate(app.start?.dateTime || app.start?.date);
      }
      if (!appStart) return false;
      
      let durationMs = 30 * 60000;
      if (app.end?.dateTime && app.start?.dateTime) {
        durationMs = new Date(app.end.dateTime).getTime() - new Date(app.start.dateTime).getTime();
      } else if (app.end?.date && app.start?.date) {
        durationMs = new Date(app.end.date).getTime() - new Date(app.start.date).getTime();
      }
      
      const appEndResolved = new Date(appStart.getTime() + durationMs);
      
      const sameDay = appStart.getDate() === dayDate.getDate() && 
                      appStart.getMonth() === dayDate.getMonth() && 
                      appStart.getFullYear() === dayDate.getFullYear();
      
      if (!sameDay) return false;
      
      return slotTime >= appStart && slotTime < appEndResolved;
    });
  };

  const getUnmatchedEvents = (dayDate) => {
    if (!dayDate) return [];
    
    const dayEvents = appointments.filter(app => {
      const dbCita = citasDb.find(c => c.google_event_id === app.id);
      let appStart = null;
      if (dbCita && dbCita.fecha_hora_cita) {
        appStart = getLimaDate(dbCita.fecha_hora_cita);
      }
      if (!appStart) {
        appStart = getLimaDate(app.start?.dateTime || app.start?.date);
      }
      if (!appStart) return false;
      
      return appStart.getDate() === dayDate.getDate() && 
             appStart.getMonth() === dayDate.getMonth() && 
             appStart.getFullYear() === dayDate.getFullYear();
    });

    const slots = getMorningSlots().concat(getAfternoonSlots());
    
    return dayEvents.filter(app => {
      const dbCita = citasDb.find(c => c.google_event_id === app.id);
      let appStart = null;
      if (dbCita && dbCita.fecha_hora_cita) {
        appStart = getLimaDate(dbCita.fecha_hora_cita);
      }
      if (!appStart) {
        appStart = getLimaDate(app.start?.dateTime || app.start?.date);
      }
      if (!appStart) return false;
      
      let durationMs = 30 * 60000;
      if (app.end?.dateTime && app.start?.dateTime) {
        durationMs = new Date(app.end.dateTime).getTime() - new Date(app.start.dateTime).getTime();
      } else if (app.end?.date && app.start?.date) {
        durationMs = new Date(app.end.date).getTime() - new Date(app.start.date).getTime();
      }
      const appEndResolved = new Date(appStart.getTime() + durationMs);
      
      const matchedByASlot = slots.some(slot => {
        const [hours, minutes] = slot.split(':').map(Number);
        const slotTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hours, minutes);
        return slotTime >= appStart && slotTime < appEndResolved;
      });
      
      return !matchedByASlot;
    });
  };

  const unmatched = getUnmatchedEvents(selectedAgendaDate);

  const renderSlotRow = (slot) => {
    const slotEvents = getEventsForTimeSlot(slot, selectedAgendaDate);
    const hasEvents = slotEvents.length > 0;
    const [hours, minutes] = slot.split(':').map(Number);
    const slotTime = new Date(
      selectedAgendaDate.getFullYear(),
      selectedAgendaDate.getMonth(),
      selectedAgendaDate.getDate(),
      hours,
      minutes
    );
    const isSlotPast = slotTime < new Date();
    
    return (
      <div key={slot} className="agenda-time-slot" style={{
        display: 'flex', alignItems: 'center', padding: '12px 16px', 
        background: hasEvents ? 'rgba(var(--primary-rgb), 0.03)' : 'var(--bg-tertiary)', 
        borderRadius: '10px', 
        border: hasEvents ? '1px solid rgba(var(--primary-rgb), 0.15)' : '1px solid var(--border-color)', 
        minHeight: '60px',
        transition: 'all var(--transition-fast)'
      }}>
        {/* Hour Indicator */}
        <div style={{
          width: '64px', fontWeight: 600, fontSize: '0.85rem', 
          color: hasEvents ? 'var(--primary)' : 'var(--text-secondary)', 
          borderRight: '1px solid var(--border-color)',
          marginRight: '16px',
          display: 'flex',
          alignItems: 'center'
        }}>
          {slot}
        </div>

        {/* Overlapping Event Card or Empty slot */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {hasEvents ? (
            slotEvents.map(activeEvent => {
              const dbCitaResolved = citasDb.find(c => c.google_event_id === activeEvent.id);
              return (
                <div 
                  key={activeEvent.id} 
                  style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    width: '100%',
                    background: slotEvents.length > 1 ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                    borderLeft: slotEvents.length > 1 ? '3px solid #fbbf24' : 'none',
                    padding: slotEvents.length > 1 ? '4px 6px' : '0px',
                    borderRadius: slotEvents.length > 1 ? '4px' : '0px'
                  }}
                >
                  <div 
                    onClick={() => {
                      if (dbCitaResolved) {
                        onOpenDetail(dbCitaResolved);
                      } else {
                        onOpenDetail({
                          id: null,
                          google_event_id: activeEvent.id,
                          fecha_hora_cita: activeEvent.start.dateTime || activeEvent.start.date,
                          motivo_consulta: activeEvent.summary,
                          estado_cita: 'AGENDADA',
                          telefono_paciente: '',
                          correo_electronico: activeEvent.correo_electronico || '',
                          pacientes: { nombre_paciente: activeEvent.summary.split(' - ')[0] || 'Paciente GCal' }
                        });
                      }
                    }}
                    style={{ overflow: 'hidden', paddingRight: '10px', cursor: 'pointer', flexGrow: 1 }}
                  >
                    <span style={{
                      fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)',
                      display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {dbCitaResolved ? `${dbCitaResolved.pacientes?.nombre_paciente || 'Paciente'} - ${dbCitaResolved.motivo_consulta || 'Cita'}` : activeEvent.summary}
                    </span>
                    {dbCitaResolved ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dbCitaResolved.telefono_paciente || 'Sin teléfono'} | {dbCitaResolved.detalles_notas_cita || 'Sin notas'}
                      </span>
                    ) : activeEvent.description && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activeEvent.description}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                    {dbCitaResolved?.estado_cita && (
                       <span style={{
                         fontSize: '0.65rem',
                         fontWeight: 600,
                         padding: '2px 6px',
                         borderRadius: '4px',
                         background: ['ASISTIO', 'COMPLETADA'].includes(dbCitaResolved.estado_cita) ? 'rgba(var(--success-rgb), 0.15)' : 'rgba(var(--danger-rgb), 0.15)',
                         color: ['ASISTIO', 'COMPLETADA'].includes(dbCitaResolved.estado_cita) ? 'var(--success)' : 'var(--danger)'
                       }}>
                         {dbCitaResolved.estado_cita}
                       </span>
                     )}
                    
                    {!(dbCitaResolved?.estado_cita === 'ASISTIO' || dbCitaResolved?.estado_cita === 'COMPLETADA') && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAppointment(activeEvent.id);
                        }}
                        className="btn-icon" 
                        style={{ color: 'var(--danger)', width: '28px', height: '28px', border:'none', background:'none', cursor:'pointer' }}
                        title="Cancelar Cita"
                      >
                        <Trash size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                Disponible
              </span>
              <button 
                onClick={() => onAddAppointmentFromSlot(slot)}
                className="btn btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '0.7rem', height: '28px', opacity: isSlotPast ? 0.5 : 1 }}
                disabled={!gcalConnected || isSlotPast}
                title={isSlotPast ? 'No se pueden agendar citas en el pasado' : ''}
              >
                + Agendar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="agenda-view animate-fade-in">
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => {
              const newD = new Date(selectedAgendaDate);
              newD.setDate(newD.getDate() - 1);
              setSelectedAgendaDate(newD);
            }} 
            className="btn-icon" 
            style={{ width: '32px', height: '32px' }}
          >
            <ChevronLeft size={16} />
          </button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            {selectedAgendaDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
          </h2>
          <button 
            onClick={() => {
              const newD = new Date(selectedAgendaDate);
              newD.setDate(newD.getDate() + 1);
              setSelectedAgendaDate(newD);
            }} 
            className="btn-icon" 
            style={{ width: '32px', height: '32px' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Seleccionar Fecha:</span>
          <input 
            type="date" 
            className="form-control" 
            style={{ width: 'auto', padding: '6px 12px', margin: 0 }}
            value={selectedAgendaDate.toLocaleString('sv-SE').slice(0, 10)}
            onChange={(e) => {
              if (e.target.value) {
                const parts = e.target.value.split('-');
                setSelectedAgendaDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
              }
            }}
          />
          <button 
            onClick={() => setSelectedAgendaDate(new Date())} 
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            Hoy
          </button>
        </div>
      </div>

      {unmatched.length > 0 && (
        <div style={{background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '14px', borderRadius: '10px'}}>
          <h4 style={{margin: '0 0 8px 0', color: 'var(--warning)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
            ⚠️ Citas Fuera de Horario Laboral o en Receso ({unmatched.length})
          </h4>
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {unmatched.map(evt => {
              const dbCita = citasDb.find(c => c.google_event_id === evt.id);
              let start = null;
              if (dbCita && dbCita.fecha_hora_cita) {
                start = getLimaDate(dbCita.fecha_hora_cita);
              }
              if (!start) {
                start = getLimaDate(evt.start?.dateTime || evt.start?.date);
              }
              let durationMs = 30 * 60000;
              if (evt.end?.dateTime && evt.start?.dateTime) {
                durationMs = new Date(evt.end.dateTime).getTime() - new Date(evt.start.dateTime).getTime();
              } else if (evt.end?.date && evt.start?.date) {
                durationMs = new Date(evt.end.date).getTime() - new Date(evt.start.date).getTime();
              }
              const end = new Date(start.getTime() + durationMs);
              const displayName = dbCita ? `${dbCita.pacientes?.nombre_paciente || 'Paciente'} - ${dbCita.motivo_consulta || 'Cita'}` : evt.summary;
              return (
                <div key={evt.id} onClick={() => onOpenDetail(evt)} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: '4px solid var(--warning)', cursor: 'pointer'}}>
                  <div>
                    <span style={{fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)'}}>{displayName}</span>
                    <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block'}}>
                      Hora: {start?.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - {end?.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </span>
                  </div>
                  <span style={{fontSize: '0.75rem', color: 'var(--warning)', background: 'rgba(var(--warning-rgb), 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600}}>Revisar Horario</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two-Column Agenda Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Morning Column */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <span>☀️</span> Turno Mañana (8:00 AM - 12:00 PM)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {getMorningSlots().map(slot => renderSlotRow(slot))}
          </div>
        </div>

        {/* Afternoon Column */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <span>🌙</span> Turno Tarde/Noche (4:00 PM - 9:00 PM)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {getAfternoonSlots().map(slot => renderSlotRow(slot))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgendaView;
