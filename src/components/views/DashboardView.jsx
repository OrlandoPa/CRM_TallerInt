import { ArrowUpRight, ArrowDownRight, Minus, ChevronRight } from 'lucide-react';
import { formatHora, formatDiaCorto } from '../../utils/dateHelpers';
import { calcularMetricas } from '../../utils/metricasDashboard';
import StatusBadge from '../ui/StatusBadge';
import GCalNotice from '../ui/GCalNotice';

const pct = (n, total) => (total ? (n / total) * 100 : 0);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function Delta({ actual, previa }) {
  if (actual === null || previa === null) {
    return <span className="kpi-note">Sin datos de los 30 días anteriores para comparar</span>;
  }
  const diff = actual - previa;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const tone = diff > 0 ? 'up' : diff < 0 ? 'down' : '';
  return (
    <span className={`delta ${tone}`}>
      <Icon size={14} />
      {diff > 0 ? '+' : ''}{diff} pts vs. los 30 días anteriores ({previa} %)
    </span>
  );
}

function Kpi({ label, value, note, tone, onClick, testId, actionLabel }) {
  const content = (
    <>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-note">{note}</span>
      {onClick && <span className="kpi-action">{actionLabel}<ChevronRight size={13} /></span>}
    </>
  );
  const className = `kpi ${tone ? `kpi--${tone}` : ''} ${onClick ? 'kpi--link' : ''}`;
  return onClick
    ? <button type="button" data-testid={testId} className={className} onClick={onClick}>{content}</button>
    : <div data-testid={testId} className={className}>{content}</div>;
}

function DashboardView({
  citasDb,
  pacientes,
  appointments = [],
  onOpenDetail,
  onNavigate,
  hasRequiredGCalGmail
}) {
  const m = calcularMetricas({ citasDb, pacientes, appointments });
  const a30 = m.asistencia30;
  const maxSemana = Math.max(...m.semanas.map(s => s.pasadas + s.programadas), 1);
  const maxTratamiento = Math.max(...m.tratamientos.map(t => t.cantidad), 1);
  const totalTratamientos = m.tratamientos.reduce((n, t) => n + t.cantidad, 0);
  const go = (tab) => (onNavigate ? () => onNavigate(tab) : undefined);

  return (
    <div className="page" data-testid="view-dashboard">
      {!hasRequiredGCalGmail && <GCalNotice />}

      <section className="panel kpi-strip" aria-label="Indicadores">
        <Kpi
          label="Citas de hoy"
          value={m.citasHoy.length}
          note={m.proximaHoy
            ? `Próxima: ${formatHora(m.proximaHoy.fecha)} · ${m.proximaHoy.pacientes?.nombre_paciente || 'Paciente'}`
            : 'No quedan citas por atender hoy'}
          onClick={go('agenda')}
          actionLabel="Ver agenda"
          testId="metric-today"
        />
        <Kpi
          label="Por confirmar (48 h)"
          value={m.porConfirmar.length}
          note="Agendadas o reprogramadas que el paciente aún no confirma"
          tone={m.porConfirmar.length > 0 ? 'warn' : ''}
          testId="metric-unconfirmed"
        />
        <Kpi
          label="Asistencia sin registrar"
          value={m.pendientesAsistencia.length}
          note="Citas pasadas sin marcar si el paciente vino"
          tone={m.pendientesAsistencia.length > 0 ? 'warn' : ''}
          onClick={m.pendientesAsistencia.length > 0 ? go('attendance') : undefined}
          actionLabel="Registrar"
          testId="metric-pending-attendance"
        />
        <Kpi
          label="Ocupación (7 días)"
          value={`${m.ocupacion.porcentaje} %`}
          note={`${m.ocupacion.ocupados} de ${m.ocupacion.capacidad} bloques de 30 min`}
          testId="metric-occupancy"
        />
        <Kpi
          label="Pacientes nuevos (30 días)"
          value={m.pacientesNuevos}
          note={`${plural(m.totalPacientes, 'paciente registrado', 'pacientes registrados')} en total`}
          testId="metric-patients"
        />
      </section>

      <div className="dash-grid">
        <section className="panel">
          <header className="panel-head">
            <h2 className="panel-title">Asistencia · últimos 30 días</h2>
            {m.asistenciaHistorica.tasa !== null && (
              <span className="panel-meta">Histórico: {m.asistenciaHistorica.tasa} %</span>
            )}
          </header>
          <div className="panel-body">
            <div className="rate">
              <span className="rate-value">{a30.tasa !== null ? `${a30.tasa} %` : '—'}</span>
              <span className="rate-caption">de los pacientes asistió a su cita</span>
            </div>
            <Delta actual={a30.tasa} previa={m.asistenciaPrevia.tasa} />

            <div className="stack-bar" role="img" aria-label={`Asistieron ${a30.asistio}, no asistieron ${a30.noAsistio}, canceladas ${a30.canceladas}`}>
              {a30.asistio > 0 && <span className="seg-ok" style={{ flexGrow: a30.asistio }} title={`Asistieron: ${a30.asistio}`} />}
              {a30.noAsistio > 0 && <span className="seg-bad" style={{ flexGrow: a30.noAsistio }} title={`No asistieron: ${a30.noAsistio}`} />}
              {a30.canceladas > 0 && <span className="seg-muted" style={{ flexGrow: a30.canceladas }} title={`Canceladas: ${a30.canceladas}`} />}
            </div>
            <div className="legend">
              <span className="legend-item"><i className="sw-ok" />Asistieron <strong>{a30.asistio}</strong></span>
              <span className="legend-item"><i className="sw-bad" />No asistieron <strong>{a30.noAsistio}</strong></span>
              <span className="legend-item"><i className="sw-muted" />Canceladas <strong>{a30.canceladas}</strong></span>
            </div>
            <p className="chart-footnote">
              La tasa solo considera citas con asistencia registrada; las canceladas no cuentan como inasistencia.
            </p>
          </div>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h2 className="panel-title">Citas por semana</h2>
            <span className="panel-meta">Sin canceladas</span>
          </header>
          <div className="panel-body">
            <div className="week-chart" role="img" aria-label="Citas por semana">
              {m.semanas.map(s => {
                const total = s.pasadas + s.programadas;
                const etiqueta = s.inicio.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
                return (
                  <div
                    key={s.inicio.toISOString()}
                    className={`week-col ${s.esActual ? 'is-current' : ''}`}
                    tabIndex={0}
                    data-tip={`Semana del ${etiqueta}: ${plural(total, 'cita', 'citas')}${s.programadas ? ` (${s.programadas} por venir)` : ''}`}
                  >
                    <div className="week-plot">
                      <span className="week-value">{total || ''}</span>
                      <div className="week-bar" style={{ height: `${pct(total, maxSemana)}%` }}>
                        {s.programadas > 0 && <span className="seg-scheduled" style={{ flexGrow: s.programadas }} />}
                        {s.pasadas > 0 && <span className="seg-past" style={{ flexGrow: s.pasadas }} />}
                      </div>
                    </div>
                    <span className="week-label">{s.esActual ? 'Esta semana' : etiqueta}</span>
                  </div>
                );
              })}
            </div>
            <div className="legend">
              <span className="legend-item"><i className="sw-accent" />Ya ocurridas</span>
              <span className="legend-item"><i className="sw-accent-light" />Programadas</span>
            </div>
            <table className="sr-only">
              <caption>Citas por semana</caption>
              <thead><tr><th>Semana del</th><th>Ocurridas</th><th>Programadas</th></tr></thead>
              <tbody>
                {m.semanas.map(s => (
                  <tr key={s.inicio.toISOString()}>
                    <td>{s.inicio.toLocaleDateString('es-PE')}</td><td>{s.pasadas}</td><td>{s.programadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="dash-grid dash-grid--reverse">
        <section className="panel">
          <header className="panel-head">
            <h2 className="panel-title">Próximos 7 días</h2>
            <span className="panel-meta">{plural(m.proximas.length, 'cita', 'citas')}</span>
          </header>
          <div className="appt-list">
            {m.proximas.length === 0 ? (
              <p className="empty-state">No hay citas en los próximos 7 días.</p>
            ) : (
              m.proximas.map(cita => {
                const patientName = cita.pacientes?.nombre_paciente || 'Paciente sin registrar';
                const contact = cita.identificador_paciente || cita.telefono_paciente || cita.pacientes?.identificador_paciente || cita.pacientes?.telefono_whatsapp || cita.pacientes?.telefono_paciente;
                return (
                  <button key={cita.id} type="button" onClick={() => onOpenDetail(cita)} className="appt-row">
                    <span className="appt-when">
                      <span className="day">{formatDiaCorto(cita.fecha)}</span>
                      <span className="time">{formatHora(cita.fecha)}</span>
                    </span>
                    <span className="appt-main">
                      <span className="appt-name">
                        {patientName}
                        {contact && <span className="contact">{contact}</span>}
                      </span>
                      <span className="appt-sub">{cita.motivo_consulta || 'Sin motivo especificado'}</span>
                    </span>
                    <StatusBadge estado={cita.estado_cita} />
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h2 className="panel-title">Tratamientos · últimos 90 días</h2>
            <span className="panel-meta">{plural(totalTratamientos, 'cita', 'citas')}</span>
          </header>
          <div className="panel-body dist">
            {m.tratamientos.length === 0 ? (
              <p className="empty-state">Sin citas en los últimos 90 días.</p>
            ) : m.tratamientos.slice(0, 6).map(t => (
              <div key={t.nombre} className="dist-row" title={`${t.nombre}: ${plural(t.cantidad, 'cita', 'citas')}`}>
                <span>{t.nombre}</span>
                <div className="dist-track">
                  <div className="dist-fill" style={{ width: `${pct(t.cantidad, maxTratamiento)}%` }} />
                </div>
                <span className="dist-count mono">{t.cantidad} · {Math.round(pct(t.cantidad, totalTratamientos))} %</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default DashboardView;
