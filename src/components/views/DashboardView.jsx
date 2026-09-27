import { getLimaDate, formatHora, formatDiaCorto } from '../../utils/dateHelpers';
import { esAtendida, esPendiente } from '../../utils/estadosCita';
import StatusBadge from '../ui/StatusBadge';
import GCalNotice from '../ui/GCalNotice';

function DashboardView({
  citasDb,
  pacientes,
  onOpenDetail,
  hasRequiredGCalGmail
}) {
  // Metrics calculations
  const totalPacientes = pacientes.length;
  const totalCitas = citasDb.length;
  const citasAgendadas = citasDb.filter(c => esPendiente(c.estado_cita)).length;
  const citasAsistio = citasDb.filter(c => esAtendida(c.estado_cita)).length;
  const citasNoAsistio = citasDb.filter(c => c.estado_cita === 'NO_ASISTIO').length;
  const totalAsistenciaResuelta = citasAsistio + citasNoAsistio;
  const tasaAsistencia = totalAsistenciaResuelta ? Math.round((citasAsistio / totalAsistenciaResuelta) * 100) : 0;

  const upcomingCitas = citasDb
    .filter(cita => cita.fecha_hora_cita && new Date(cita.fecha_hora_cita) >= new Date())
    .sort((a, b) => new Date(a.fecha_hora_cita) - new Date(b.fecha_hora_cita));

  const getTreatmentDistribution = () => {
    const counts = {
      'Evaluación': 0,
      'Restauración': 0,
      'Endodoncia': 0,
      'Ortodoncia': 0,
      'Blanqueamiento': 0,
      'Cirugía': 0,
      'Rehabilitación': 0,
      'Otros': 0
    };

    citasDb.forEach(cita => {
      if (!cita.motivo_consulta) {
        counts['Otros']++;
        return;
      }
      const motivo = cita.motivo_consulta.toLowerCase();
      if (motivo.includes('evalua') || motivo.includes('revis')) {
        counts['Evaluación']++;
      } else if (motivo.includes('restaura') || motivo.includes('curac')) {
        counts['Restauración']++;
      } else if (motivo.includes('endodoncia')) {
        counts['Endodoncia']++;
      } else if (motivo.includes('ortodoncia') || motivo.includes('bracket')) {
        counts['Ortodoncia']++;
      } else if (motivo.includes('blanquea')) {
        counts['Blanqueamiento']++;
      } else if (motivo.includes('cirug') || motivo.includes('extrac') || motivo.includes('cordal')) {
        counts['Cirugía']++;
      } else if (motivo.includes('rehab') || motivo.includes('prote') || motivo.includes('corona')) {
        counts['Rehabilitación']++;
      } else {
        counts['Otros']++;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const distribution = getTreatmentDistribution();
  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  const kpis = [
    { label: 'Pacientes registrados', value: totalPacientes, note: 'En la base de datos', testId: 'metric-patients' },
    { label: 'Citas totales', value: totalCitas, note: 'Historial completo' },
    { label: 'Citas pendientes', value: citasAgendadas, note: 'Agendadas, reprogramadas o confirmadas', tone: citasAgendadas > 0 ? 'warn' : '' },
    { label: 'Asistieron', value: citasAsistio, note: 'Asistencia registrada' },
    { label: 'Inasistencias', value: citasNoAsistio, note: 'Pacientes ausentes', tone: citasNoAsistio > 0 ? 'bad' : '' }
  ];

  return (
    <div className="page" data-testid="view-dashboard">
      {!hasRequiredGCalGmail && <GCalNotice />}

      <section className="panel kpi-strip" aria-label="Indicadores">
        {kpis.map(kpi => (
          <div key={kpi.label} data-testid={kpi.testId} className={`kpi ${kpi.tone ? `kpi--${kpi.tone}` : ''}`}>
            <span className="kpi-label">{kpi.label}</span>
            <span className="kpi-value">{kpi.value}</span>
            <span className="kpi-note">{kpi.note}</span>
          </div>
        ))}
      </section>

      <div className="dash-grid">
        <section className="panel">
          <header className="panel-head">
            <h2 className="panel-title">Tasa de asistencia</h2>
            <span className="panel-meta">{totalAsistenciaResuelta} citas resueltas</span>
          </header>
          <div className="panel-body">
            <div className="rate">
              <span className="rate-value">{totalAsistenciaResuelta ? `${tasaAsistencia}%` : '—'}</span>
              <span className="rate-caption">de los pacientes asistió a su cita</span>
            </div>
            <div className="stack-bar" role="img" aria-label={`Asistieron ${citasAsistio}, ausentes ${citasNoAsistio}`}>
              {totalAsistenciaResuelta > 0 && (
                <>
                  <span className="seg-ok" style={{ width: `${(citasAsistio / totalAsistenciaResuelta) * 100}%` }} />
                  <span className="seg-bad" style={{ width: `${(citasNoAsistio / totalAsistenciaResuelta) * 100}%` }} />
                </>
              )}
            </div>
            <div className="legend">
              <span className="legend-item"><i style={{ background: 'var(--ok)' }} />Asistieron <strong>{citasAsistio}</strong></span>
              <span className="legend-item"><i style={{ background: 'var(--bad)' }} />Ausentes <strong>{citasNoAsistio}</strong></span>
            </div>
          </div>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h2 className="panel-title">Tratamientos más frecuentes</h2>
            <span className="panel-meta">Según el motivo de consulta</span>
          </header>
          <div className="panel-body dist">
            {distribution.slice(0, 6).map((treatment) => {
              const pct = totalCitas > 0 ? Math.round((treatment.count / totalCitas) * 100) : 0;
              return (
                <div key={treatment.name} className="dist-row">
                  <span>{treatment.name}</span>
                  <div className="dist-track">
                    <div className="dist-fill" style={{ width: `${(treatment.count / maxCount) * 100}%` }} />
                  </div>
                  <span className="dist-count mono">{treatment.count} · {pct}%</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title">Próximas citas</h2>
          <span className="panel-meta">{upcomingCitas.length} programadas</span>
        </header>
        <div className="appt-list">
          {upcomingCitas.length === 0 ? (
            <p className="empty-state">No hay próximas citas programadas.</p>
          ) : (
            upcomingCitas.map(cita => {
              const date = cita.fecha_hora_cita ? getLimaDate(cita.fecha_hora_cita) : null;
              const patientName = cita.pacientes?.nombre_paciente || 'Paciente sin registrar';
              const contact = cita.identificador_paciente || cita.telefono_paciente || cita.pacientes?.identificador_paciente || cita.pacientes?.telefono_whatsapp || cita.pacientes?.telefono_paciente;

              return (
                <button
                  key={cita.id}
                  type="button"
                  onClick={() => onOpenDetail(cita)}
                  className={`appt-row ${cita.estado_cita === 'CANCELADA' ? 'is-cancelled' : ''}`}
                >
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
                  <span className="appt-main">
                    <span className="appt-name">
                      {patientName}
                      {contact && <span className="contact">{contact}</span>}
                    </span>
                    <span className="appt-sub">
                      {cita.motivo_consulta || 'Sin motivo especificado'}
                    </span>
                  </span>
                  <StatusBadge estado={cita.estado_cita} />
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

export default DashboardView;
