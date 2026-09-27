import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import { getLimaDate, formatHora, formatFechaLarga, getBloquesInicio, jornadasDeFecha, isPeruHoliday, bloqueoEn } from '../../utils/dateHelpers';
import { aHHMM } from '@compartido/reglasAgenda.js';
import { useAgendaConfig } from '../../utils/agendaConfig';
import { esAtendida } from '../../utils/estadosCita';
import ModalShell from '../ui/ModalShell';
import StatusBadge from '../ui/StatusBadge';

function DayAgendaModal({ 
  selectedDay, 
  onClose, 
  citasDb, 
  appointments: eventos, 
  agendaDisponible,  
  onOpenDetail, 
  onDeleteAppointment, 
  onAddAppointmentFromSlot 
}) {
  const { horario, feriados, bloqueos } = useAgendaConfig();
  if (!selectedDay) return null;

  // Los bloqueos llegan como eventos de Calendar; se muestran desde la configuración
  const appointments = eventos.filter(e => e.tipo !== 'bloqueo');
  const feriado = isPeruHoliday(selectedDay, feriados);
  const jornadas = feriado ? [] : jornadasDeFecha(selectedDay, horario);

  // Bloques de 30 min de cada jornada del día, con un separador "RECESO|desde|hasta" entre jornadas
  const getTimeSlots = () => getBloquesInicio(30, jornadas).flatMap((j, i, todas) =>
    i === 0 ? j.bloques : [`RECESO|${aHHMM(todas[i - 1].fin)}|${aHHMM(j.inicio)}`, ...j.bloques]);

  const getEventsForTimeSlot = (slotString, dayDate) => {
    if (slotString.startsWith('RECESO')) return [];
    
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
        if (slot.startsWith('RECESO')) return false;
        const [hours, minutes] = slot.split(':').map(Number);
        const slotTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hours, minutes);
        return slotTime >= appStart && slotTime < appEndResolved;
      });
      
      return !matchedByASlot;
    });
  };

  const unmatched = getUnmatchedEvents(selectedDay);

  // Inicio y fin efectivos de un evento (la hora de la BD manda sobre la de Google)
  const getEventRange = (evt) => {
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
    return { start, end: new Date(start.getTime() + durationMs), minutes: Math.round(durationMs / 60000) };
  };

  return (
    <ModalShell
      title="Agenda del día"
      subtitle={<span className="capitalize">{formatFechaLarga(selectedDay)}</span>}
      onClose={onClose}
      size="lg"
      zIndex={125}
    >
      <div className="modal-body flush">
        {unmatched.length > 0 && (
          <div className="modal-section">
            <div className="notice notice--warn">
              <AlertTriangle size={16} />
              <div className="notice-content">
                <p className="notice-title">
                  {unmatched.length === 1 ? '1 cita fuera del horario de atención' : `${unmatched.length} citas fuera del horario de atención`}
                </p>
                <div className="offhours-list">
                  {unmatched.map(evt => {
                    const dbCita = citasDb.find(c => c.google_event_id === evt.id);
                    const { start, end } = getEventRange(evt);
                    const displayName = dbCita ? `${dbCita.pacientes?.nombre_paciente || 'Paciente'} · ${dbCita.motivo_consulta || 'Cita'}` : evt.summary;
                    return (
                      <button type="button" key={evt.id} onClick={() => onOpenDetail(evt)} className="offhours-item">
                        <span>
                          <strong>{displayName}</strong>
                          <span className="mono muted">{formatHora(start)} – {formatHora(end)}</span>
                        </span>
                        <span className="badge badge--warn">Revisar horario</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {jornadas.length === 0 && (
          <div className="modal-section">
            <div className="notice notice--info">
              <AlertTriangle size={16} />
              <span>{feriado ? 'Feriado: no se atiende este día.' : 'No hay atención este día de la semana.'}</span>
            </div>
          </div>
        )}

        <div>
          {getTimeSlots().map((slot, index) => {
            if (slot.startsWith('RECESO')) {
              const [, desde, hasta] = slot.split('|');
              return (
                <div key={`receso-${index}`} className="break-row">
                  Receso · <span className="mono">{desde} – {hasta}</span>
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
            const bloqueo = bloqueoEn(bloqueos, slotTime);
            
            return (
              <div key={slot} className={`slot ${slotEvents.length > 0 ? 'slot--booked' : ''} ${isSlotPast ? 'slot--past' : ''}`}>
                <div className="slot-time">{slot}</div>
                <div className="slot-body">
                  {slotEvents.length > 0 ? (
                    slotEvents.map(activeEvent => {
                      const dbCitaResolved = citasDb.find(c => c.google_event_id === activeEvent.id);
                      const { start, end, minutes: mins } = getEventRange(activeEvent);
                      return (
                        <div key={activeEvent.id} className={`slot-event ${slotEvents.length > 1 ? 'overlap' : ''}`}>
                          <button type="button" className="slot-event-main" onClick={() => onOpenDetail(activeEvent)}>
                            <span className="slot-event-title">
                              {dbCitaResolved ? `${dbCitaResolved.pacientes?.nombre_paciente || 'Paciente'} · ${dbCitaResolved.motivo_consulta || 'Cita'}` : activeEvent.summary}
                            </span>
                            <span className="slot-event-sub mono">
                              {formatHora(start)} – {formatHora(end)} · {mins} min
                            </span>
                          </button>
                          <div className="slot-event-actions">
                            {dbCitaResolved?.estado_cita && <StatusBadge estado={dbCitaResolved.estado_cita} />}
                            {!(esAtendida(dbCitaResolved?.estado_cita)) && (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteAppointment(activeEvent.id);
                                }}
                                className="btn-icon danger" 
                                title="Cancelar cita"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : bloqueo ? (
                    <div className="slot-free slot-free--blocked">
                      <span>Bloqueado · {bloqueo.motivo}</span>
                    </div>
                  ) : (
                    <div className="slot-free">
                      <span>Libre</span>
                      <button 
                        type="button"
                        onClick={() => onAddAppointmentFromSlot(slot)}
                        className="btn btn-secondary btn-sm" 
                        disabled={!agendaDisponible || isSlotPast}
                        title={isSlotPast ? 'No se pueden agendar citas en el pasado' : ''}
                      >
                        <Plus size={14} /> Agendar
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
          Cerrar
        </button>
      </footer>
    </ModalShell>
  );
}

export default DayAgendaModal;
