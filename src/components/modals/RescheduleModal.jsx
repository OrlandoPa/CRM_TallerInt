import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  isPeruHoliday,
  getLimaDate,
  getBloquesInicio,
  normalizarDuracion,
  DURACIONES_CITA,
  toDateInput,
  jornadasDeFecha
} from '../../utils/dateHelpers';
import { useAgendaConfig } from '../../utils/agendaConfig';
import ModalShell from '../ui/ModalShell';
const minutosDe = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Duración de una cita: por su hora de fin en la BD o, si no la tiene, por su
// evento de Google Calendar (30 min si no se conoce)
const duracionDeCita = (cita, appointments) => {
  if (cita.fecha_hora_fin && cita.fecha_hora_cita) {
    return normalizarDuracion((new Date(cita.fecha_hora_fin) - new Date(cita.fecha_hora_cita)) / 60000);
  }
  const evt = appointments.find(a => a.id === cita.google_event_id);
  if (evt?.start?.dateTime && evt?.end?.dateTime) {
    return normalizarDuracion((new Date(evt.end.dateTime) - new Date(evt.start.dateTime)) / 60000);
  }
  return 30;
};

function RescheduleForm({
  onClose,
  cita,
  rescheduleEvent,
  citasDb,
  appointments,
  onSubmit
}) {
  const { horario, feriados, bloqueos } = useAgendaConfig();

  // Valores iniciales: la fecha propuesta por quien abre el modal; la hora solo si cae en un bloque
  const [fecha, setFecha] = useState(() => (rescheduleEvent.start || '').slice(0, 10) || toDateInput(new Date()));
  const [duracion, setDuracion] = useState(() => duracionDeCita(cita, appointments));
  const [hora, setHora] = useState(() => {
    const h = (rescheduleEvent.start || '').slice(11, 16);
    const dia0 = new Date(`${(rescheduleEvent.start || '').slice(0, 10)}T00:00`);
    const jornadas0 = isNaN(dia0) ? [] : jornadasDeFecha(dia0, horario);
    const valida = getBloquesInicio(duracionDeCita(cita, appointments), jornadas0).some(j => j.bloques.includes(h));
    return valida ? h : '';
  });

  const dia = fecha ? new Date(`${fecha}T00:00`) : null;
  const jornadasDia = dia ? jornadasDeFecha(dia, horario) : [];
  const esFeriado = dia ? isPeruHoliday(dia, feriados) : false;
  const sinAtencion = !!dia && jornadasDia.length === 0;
  const diaNoLaborable = esFeriado || sinAtencion;
  const ahora = new Date();

  // Otras citas vigentes de ese día, como rangos en minutos
  const ocupados = citasDb
    .filter(c => c.fecha_hora_cita && c.estado_cita !== 'CANCELADA' && c.id !== cita.id
      && (!cita.google_event_id || c.google_event_id !== cita.google_event_id))
    .map(c => ({ inicio: getLimaDate(c.fecha_hora_cita), duracion: duracionDeCita(c, appointments) }))
    .filter(c => c.inicio && toDateInput(c.inicio) === fecha)
    .map(c => {
      const ini = c.inicio.getHours() * 60 + c.inicio.getMinutes();
      return { ini, fin: ini + c.duracion };
    });

  const estadoBloque = (hhmm) => {
    const ini = minutosDe(hhmm);
    const fin = ini + duracion;
    if (dia && new Date(`${fecha}T${hhmm}`) <= ahora) return 'pasado';
    if (ocupados.some(o => ini < o.fin && fin > o.ini)) return 'ocupado';
    const desde = new Date(`${fecha}T${hhmm}`);
    const hasta = new Date(desde.getTime() + duracion * 60000);
    if (bloqueos.some(b => desde < new Date(b.fin) && new Date(b.inicio) < hasta)) return 'bloqueado';
    return null;
  };

  // Si al cambiar fecha o duración la hora elegida deja de ser válida, se descarta
  const bloquesPorJornada = getBloquesInicio(duracion, jornadasDia);
  const horaValida = hora
    && bloquesPorJornada.some(j => j.bloques.includes(hora))
    && !estadoBloque(hora)
    ? hora
    : '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!horaValida || diaNoLaborable) return;
    const start = new Date(`${fecha}T${horaValida}`);
    const end = new Date(start.getTime() + duracion * 60000);
    onSubmit(e, { start, end });
  };

  const pacienteNombre = cita.pacientes?.nombre_paciente || cita.motivo_consulta?.split(' - ')[0] || 'Paciente';

  return (
    <ModalShell
      title="Reprogramar cita"
      onClose={onClose}
      size="sm"
      zIndex={160}
      testId="modal-reschedule"
      closeTestId="btn-close-reschedule"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="reschedule-summary">
            <strong>{pacienteNombre}</strong>
            <span>{cita.motivo_consulta || 'Sin motivo'}</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reschedule-date">Nueva fecha</label>
              <input
                id="reschedule-date"
                type="date"
                className="form-control"
                data-testid="input-reschedule-date"
                value={fecha}
                min={toDateInput(ahora)}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reschedule-duration">Duración</label>
              <select
                id="reschedule-duration"
                className="form-control"
                data-testid="select-reschedule-duration"
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
              >
                {DURACIONES_CITA.map(d => (
                  <option key={d} value={d}>{d === 60 ? '1 hora (2 bloques)' : '30 minutos (1 bloque)'}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reschedule-start">Hora de inicio</label>
            <select
              id="reschedule-start"
              className="form-control"
              data-testid="input-reschedule-start"
              value={horaValida}
              onChange={(e) => setHora(e.target.value)}
              disabled={!fecha || diaNoLaborable}
              required
            >
              <option value="">Selecciona un bloque</option>
              {bloquesPorJornada.map(j => (
                <optgroup key={j.nombre} label={j.nombre}>
                  {j.bloques.map(b => {
                    const estado = estadoBloque(b);
                    const fin = minutosDe(b) + duracion;
                    const finStr = `${String(Math.floor(fin / 60)).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`;
                    return (
                      <option key={b} value={b} disabled={!!estado}>
                        {b} – {finStr}{estado ? ` (${estado})` : ''}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>

          {diaNoLaborable && (
            <div className="notice notice--bad" role="alert">
              <AlertTriangle size={16} />
              <span>
                {esFeriado
                  ? 'No se puede reprogramar en feriados. Elige otra fecha.'
                  : dia?.getDay() === 0
                    ? 'No se atiende los domingos. Elige otra fecha.'
                    : 'No hay atención ese día de la semana. Elige otra fecha.'}
              </span>
            </div>
          )}
        </div>
        <footer className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            data-testid="btn-cancel-reschedule"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={diaNoLaborable || !horaValida}
            data-testid="btn-submit-reschedule"
          >
            Guardar cambios
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function RescheduleModal({
  isOpen,
  onClose,
  selectedCitaForReschedule,
  rescheduleEvent,
  citasDb = [],
  appointments = [],
  onSubmit
}) {
  if (!isOpen || !selectedCitaForReschedule) return null;

  return (
    <RescheduleForm
      onClose={onClose}
      cita={selectedCitaForReschedule}
      rescheduleEvent={rescheduleEvent}
      citasDb={citasDb}
      appointments={appointments}
      onSubmit={onSubmit}
    />
  );
}

export default RescheduleModal;
