import { ChevronLeft, ChevronRight, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { getLimaDate, formatHora, formatFechaLarga, toDateInput, getBloquesInicio, jornadasDeFecha, isPeruHoliday, bloqueoEn } from '../../utils/dateHelpers';
import { aHHMM } from '@compartido/reglasAgenda.js';
import { useAgendaConfig } from '../../utils/agendaConfig';
import { resolveContactIdentifier } from '../../utils/contactHelpers';
import { esAtendida } from '../../utils/estadosCita';
import { leerDescripcionEvento } from '../../utils/descripcionEvento';
import StatusBadge from '../ui/StatusBadge';

function AgendaView({
  selectedAgendaDate,
  setSelectedAgendaDate,
  appointments: eventos,
  citasDb,
  agendaDisponible,
  onOpenDetail,
  onDeleteAppointment,
  onAddAppointmentFromSlot
}) {
  const { horario, feriados, bloqueos } = useAgendaConfig();

  // Los bloqueos llegan como eventos de Calendar; se muestran desde la configuración
  const appointments = eventos.filter(e => e.tipo !== 'bloqueo');
  const feriado = isPeruHoliday(selectedAgendaDate, feriados);
  // Jornadas del día según el horario de la BD, con sus bloques de 30 min
  const jornadas = feriado ? [] : getBloquesInicio(30, jornadasDeFecha(selectedAgendaDate, horario));

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

    const slots = jornadas.flatMap(j => j.bloques);

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
    const bloqueo = bloqueoEn(bloqueos, slotTime);

    return (
      <div key={slot} className={`slot agenda-time-slot ${hasEvents ? 'slot--booked' : ''} ${isSlotPast ? 'slot--past' : ''}`}>
        <div className="slot-time">{slot}</div>

        <div className="slot-body">
          {hasEvents ? (
            slotEvents.map(activeEvent => {
              const dbCitaResolved = citasDb.find(c => c.google_event_id === activeEvent.id);
              return (
                <div key={activeEvent.id} className={`slot-event ${slotEvents.length > 1 ? 'overlap' : ''}`}>
                  <button
                    type="button"
                    data-testid="appointment-card"
                    className="slot-event-main"
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
                          identificador_paciente: '',
                          telefono_paciente: '',
                          correo_electronico: activeEvent.correo_electronico || '',
                          pacientes: { nombre_paciente: activeEvent.summary.split(' - ')[0] || 'Paciente GCal' }
                        });
                      }
                    }}
                  >
                    <span className="slot-event-title">
                      {dbCitaResolved ? `${dbCitaResolved.pacientes?.nombre_paciente || 'Paciente'} · ${dbCitaResolved.motivo_consulta || 'Cita'}` : activeEvent.summary}
                    </span>
                    {dbCitaResolved ? (
                      <span className="slot-event-sub">
                        <span className="mono">{resolveContactIdentifier(dbCitaResolved, [], [], citasDb) || 'Sin teléfono'}</span>
                        {dbCitaResolved.detalles_notas_cita && <> · {dbCitaResolved.detalles_notas_cita}</>}
                      </span>
                    ) : leerDescripcionEvento(activeEvent.description).notas && (
                      <span className="slot-event-sub">{leerDescripcionEvento(activeEvent.description).notas}</span>
                    )}
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
                data-testid={`btn-slot-add-${slot.replace(':', '-')}`}
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
  };

  const shiftDay = (delta) => {
    const newD = new Date(selectedAgendaDate);
    newD.setDate(newD.getDate() + delta);
    setSelectedAgendaDate(newD);
  };

  return (
    <div className="page agenda-view" data-testid="view-agenda">
      <div className="toolbar">
        <div className="date-nav">
          <button data-testid="btn-prev-day" onClick={() => shiftDay(-1)} className="btn-icon bordered" title="Día anterior">
            <ChevronLeft size={16} />
          </button>
          <button data-testid="btn-next-day" onClick={() => shiftDay(1)} className="btn-icon bordered" title="Día siguiente">
            <ChevronRight size={16} />
          </button>
          <h2 data-testid="agenda-date-heading">{formatFechaLarga(selectedAgendaDate)}</h2>
        </div>

        <div className="toolbar-group">
          <label htmlFor="agenda-date" className="sr-only">Seleccionar fecha</label>
          <input
            id="agenda-date"
            data-testid="input-agenda-date"
            type="date"
            className="form-control"
            value={toDateInput(selectedAgendaDate)}
            onChange={(e) => {
              if (e.target.value) {
                const parts = e.target.value.split('-');
                setSelectedAgendaDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
              }
            }}
          />
          <button data-testid="btn-today" onClick={() => setSelectedAgendaDate(new Date())} className="btn btn-secondary">
            Hoy
          </button>
        </div>
      </div>

      {unmatched.length > 0 && (
        <div className="notice notice--warn">
          <AlertTriangle size={16} />
          <div className="notice-content">
            <p className="notice-title">
              {unmatched.length === 1 ? '1 cita fuera del horario de atención' : `${unmatched.length} citas fuera del horario de atención`}
            </p>
            <div className="offhours-list">
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
      )}

      {jornadas.length === 0 ? (
        <div className="notice notice--info" data-testid="agenda-sin-atencion">
          <AlertTriangle size={16} />
          <span>{feriado ? 'Feriado: no se atiende este día.' : 'No hay atención este día de la semana.'}</span>
        </div>
      ) : (
        <div className="shift-grid">
          {jornadas.map(j => (
            <section className="panel" key={j.inicio}>
              <header className="panel-head">
                <h3 className="panel-title">{j.nombre}</h3>
                <span className="shift-range">{aHHMM(j.inicio)} – {aHHMM(j.fin)}</span>
              </header>
              {j.bloques.map(slot => renderSlotRow(slot))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default AgendaView;
