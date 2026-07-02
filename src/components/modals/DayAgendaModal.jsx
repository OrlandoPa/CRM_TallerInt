import { Clock, Clock3, Trash } from 'lucide-react';
import { getLimaDate } from '../../utils/dateHelpers';

function DayAgendaModal({ 
  selectedDay, 
  onClose, 
  citasDb, 
  appointments, 
  gcalConnected, 
  onOpenDetail, 
  onDeleteAppointment, 
  onAddAppointmentFromSlot 
}) {
  if (!selectedDay) return null;

  const getTimeSlots = () => {
    const slots = [];
    // Morning: 8:00 AM to 12:00 PM
    for (let hour = 8; hour <= 11; hour++) {
      const hStr = String(hour).padStart(2, '0');
      slots.push(`${hStr}:00`);
      slots.push(`${hStr}:30`);
    }
    slots.push('RECESO');
    // Afternoon: 4:00 PM to 9:00 PM (16:00 to 21:00)
    for (let hour = 16; hour <= 20; hour++) {
      slots.push(`${hour}:00`);
      slots.push(`${hour}:30`);
    }
    return slots;
  };

  const getEventsForTimeSlot = (slotString, dayDate) => {
    if (slotString === 'RECESO') return [];
    
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

    const slots = getTimeSlots();
    
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
        if (slot === 'RECESO') return false;
        const [hours, minutes] = slot.split(':').map(Number);
        const slotTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hours, minutes);
        return slotTime >= appStart && slotTime < appEndResolved;
      });
      
      return !matchedByASlot;
    });
  };

  const unmatched = getUnmatchedEvents(selectedDay);

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-slide-up" style={{maxWidth: '650px', width: '90%'}}>
        <header className="modal-header">
          <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <Clock3 style={{color:'var(--primary)'}} size={20} />
            <span className="modal-title" style={{fontSize:'1.1rem'}}>
              Agenda: {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <button onClick={onClose} className="btn-icon" style={{width:'32px', height:'32px'}}>✕</button>
        </header>
        
        <div className="modal-body" style={{maxHeight:'70vh', overflowY:'auto', padding:'20px'}}>
          {unmatched.length > 0 && (
            <div style={{background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '14px', borderRadius: '10px', marginBottom: '16px'}}>
              <h4 style={{margin: '0 0 8px 0', color: '#fbbf24', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
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
                    <div key={evt.id} onClick={() => onOpenDetail(evt)} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: '4px solid #fbbf24', cursor: 'pointer'}}>
                      <div>
                        <span style={{fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)'}}>{displayName}</span>
                        <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block'}}>
                          Hora: {start?.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - {end?.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </span>
                      </div>
                      <span style={{fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600}}>Revisar Horario</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            {getTimeSlots().map((slot, index) => {
              if (slot === 'RECESO') {
                return (
                  <div key={`receso-${index}`} style={{
                    textAlign:'center', padding:'12px', fontSize:'0.75rem', 
                    fontWeight:600, color:'var(--text-muted)', background:'rgba(255,255,255,0.02)',
                    borderRadius:'6px', letterSpacing:'1.5px', border: '1px dashed var(--border-color)'
                  }}>
                    - RECESO DEL DOCTOR (12:00 PM a 4:00 PM) -
                  </div>
                );
              }

              const slotEvents = getEventsForTimeSlot(slot, selectedDay);
              
              const [hours, minutes] = slot.split(':').map(Number);
              const slotTime = new Date(
                selectedDay.getFullYear(),
                selectedDay.getMonth(),
                selectedDay.getDate(),
                hours,
                minutes
              );
              const isSlotPast = slotTime < new Date();
              
              return (
                <div key={slot} style={{
                  display:'flex', alignItems:'center', padding:'12px', 
                  background:'var(--bg-tertiary)', borderRadius:'8px', 
                  border:'1px solid var(--border-color)', minHeight:'56px'
                }}>
                  {/* Hour Indicator */}
                  <div style={{
                    width:'70px', fontWeight:600, fontSize:'0.85rem', 
                    color:'var(--text-secondary)', borderRight:'1px solid var(--border-color)',
                    marginRight:'16px'
                  }}>
                    {slot}
                  </div>

                  {/* Overlapping Event Card or Empty slot */}
                  <div style={{flexGrow:1, display:'flex', flexDirection:'column', gap:'8px'}}>
                    {slotEvents.length > 0 ? (
                      slotEvents.map(activeEvent => {
                        const dbCitaResolved = citasDb.find(c => c.google_event_id === activeEvent.id);
                        return (
                          <div 
                            key={activeEvent.id} 
                            style={{
                              display:'flex', 
                              justifyContent:'space-between', 
                              alignItems:'center', 
                              width:'100%',
                              background: slotEvents.length > 1 ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                              borderLeft: slotEvents.length > 1 ? '3px solid #fbbf24' : 'none',
                              padding: slotEvents.length > 1 ? '6px 8px' : '0px',
                              borderRadius: slotEvents.length > 1 ? '6px' : '0px'
                            }}
                          >
                            <div 
                              onClick={() => onOpenDetail(activeEvent)}
                              style={{overflow:'hidden', paddingRight:'10px', cursor:'pointer', flexGrow:1}}
                            >
                              <span style={{
                                fontWeight:600, fontSize:'0.9rem', color:'var(--text-primary)',
                                display:'block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
                              }}>
                                {dbCitaResolved ? `${dbCitaResolved.pacientes?.nombre_paciente || 'Paciente'} - ${dbCitaResolved.motivo_consulta || 'Cita'}` : activeEvent.summary}
                              </span>
                              <span style={{fontSize:'0.75rem', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'4px'}}>
                                <Clock size={12} />
                                {(() => {
                                  let start = null;
                                  if (dbCitaResolved && dbCitaResolved.fecha_hora_cita) {
                                    start = getLimaDate(dbCitaResolved.fecha_hora_cita);
                                  }
                                  if (!start) {
                                    start = getLimaDate(activeEvent.start?.dateTime || activeEvent.start?.date);
                                  }
                                  let durationMs = 30 * 60000;
                                  if (activeEvent.end?.dateTime && activeEvent.start?.dateTime) {
                                    durationMs = new Date(activeEvent.end.dateTime).getTime() - new Date(activeEvent.start.dateTime).getTime();
                                  } else if (activeEvent.end?.date && activeEvent.start?.date) {
                                    durationMs = new Date(activeEvent.end.date).getTime() - new Date(activeEvent.start.date).getTime();
                                  }
                                  const end = new Date(start.getTime() + durationMs);
                                  return `${start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} (${Math.round(durationMs / 60000)} mins)`;
                                })()}
                              </span>
                            </div>
                            
                            <div style={{display:'flex', gap:'8px', flexShrink:0}}>
                              {!(dbCitaResolved?.estado_cita === 'ASISTIO' || dbCitaResolved?.estado_cita === 'COMPLETADA') && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteAppointment(activeEvent.id);
                                  }}
                                  className="btn-icon" 
                                  style={{color:'var(--danger)', width:'32px', height:'32px', border:'none', background:'none', cursor:'pointer'}}
                                  title="Cancelar Cita"
                                >
                                  <Trash size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                        <span style={{color:'var(--text-muted)', fontSize:'0.85rem', fontStyle:'italic'}}>
                          Disponible
                        </span>
                        <button 
                          onClick={() => onAddAppointmentFromSlot(slot)}
                          className="btn btn-secondary" 
                          style={{padding:'4px 10px', fontSize:'0.75rem', height:'28px', opacity: isSlotPast ? 0.5 : 1}}
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
            })}
          </div>
        </div>

        <footer className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Cerrar Agenda
          </button>
        </footer>
      </div>
    </div>
  );
}

export default DayAgendaModal;
