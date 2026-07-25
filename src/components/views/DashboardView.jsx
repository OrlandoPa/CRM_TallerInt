import { Users, Calendar as CalendarIcon, Clock3, Check, AlertCircle, Clock, Trash } from 'lucide-react';
import { getLimaDate } from '../../utils/dateHelpers';

function DashboardView({ 
  citasDb, 
  appointments, 
  pacientes, 
  gcalConnected, 
  onOpenDetail, 
  onDeleteAppointment,
  hasRequiredGCalGmail
}) {
  // Metrics calculations
  const totalPacientes = pacientes.length;
  const totalCitas = citasDb.length;
  const citasAgendadas = citasDb.filter(c => c.estado_cita === 'AGENDADA' || c.estado_cita === 'CONFIRMADA' || !c.estado_cita).length;
  const citasAsistio = citasDb.filter(c => c.estado_cita === 'ASISTIO' || c.estado_cita === 'COMPLETADA').length;
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

  const getBarColor = (name) => {
    switch (name) {
      case 'Evaluación': return 'var(--primary)';
      case 'Restauración': return 'var(--success)';
      case 'Endodoncia': return 'var(--secondary)';
      case 'Ortodoncia': return 'var(--warning)';
      case 'Blanqueamiento': return 'var(--info)';
      case 'Cirugía': return 'var(--danger)';
      case 'Rehabilitación': return '#ec4899';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="dashboard-view animate-fade-in" data-testid="view-dashboard" style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
      {!hasRequiredGCalGmail && (
        <div className="glass-card animate-pulse" style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)'
        }}>
          <AlertCircle size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500 }}>
            Para acceder a estas funcionalidades por favor ingrese su cuenta de gmail valida para el google calendar
          </span>
        </div>
      )}
      {/* KPI Metrics row */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px'}}>
        {/* Card 1: Pacientes Registrados */}
        <div data-testid="metric-patients" className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
          <div className="metric-icon-wrapper" style={{background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '12px', borderRadius: '10px'}}>
            <Users size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Pacientes Registrados</span>
            <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{totalPacientes}</span>
            <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>En base de datos</span>
          </div>
        </div>

        {/* Card 2: Citas en Base de Datos */}
        <div className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
          <div className="metric-icon-wrapper" style={{background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--primary)', padding: '12px', borderRadius: '10px'}}>
            <CalendarIcon size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Citas Totales (BD)</span>
            <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{totalCitas}</span>
            <span style={{fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600}}>Historial clínico</span>
          </div>
        </div>

        {/* Card 3: Citas Agendadas */}
        <div className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
          <div className="metric-icon-wrapper" style={{background: 'rgba(var(--warning-rgb), 0.15)', color: 'var(--warning)', padding: '12px', borderRadius: '10px'}}>
            <Clock3 size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Citas Agendadas</span>
            <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{citasAgendadas}</span>
            <span style={{fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 500}}>Pendientes de atención</span>
          </div>
        </div>

        {/* Card 4: Citas Asistidas */}
        <div className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
          <div className="metric-icon-wrapper" style={{background: 'rgba(var(--success-rgb), 0.15)', color: 'var(--success)', padding: '12px', borderRadius: '10px'}}>
            <Check size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Citas Asistidas</span>
            <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{citasAsistio}</span>
            <span style={{fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500}}>Asistencia confirmada</span>
          </div>
        </div>

        {/* Card 5: Inasistencias */}
        <div className="glass-card metric-card" style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '20px'}}>
          <div className="metric-icon-wrapper" style={{background: 'rgba(var(--danger-rgb), 0.15)', color: 'var(--danger)', padding: '12px', borderRadius: '10px'}}>
            <AlertCircle size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Inasistencias</span>
            <span className="metric-value" style={{fontSize: '2rem', fontWeight: 700, display: 'block', margin: '4px 0'}}>{citasNoAsistio}</span>
            <span style={{fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 500}}>Pacientes ausentes</span>
          </div>
        </div>
      </div>

      {/* Charts Grid Section */}
      <div className="charts-grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Attendance Donut Chart */}
        <div className="glass-card chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center', minHeight: '320px', padding: '30px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, width: '100%', textAlign: 'left', margin: 0 }}>Tasa de Asistencia</h3>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '160px', height: '160px' }}>
            <svg width="160" height="160" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--bg-tertiary)" strokeWidth="10" />
              {totalAsistenciaResuelta > 0 ? (
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="url(#donutGradient)" strokeWidth="10"
                        strokeDasharray="314.16" strokeDashoffset={314.16 - (tasaAsistencia * 314.16) / 100}
                        strokeLinecap="round" transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
              ) : null}
              <defs>
                <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--success)" />
                  <stop offset="100%" stopColor="var(--primary)" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{tasaAsistencia}%</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Asistencia</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', width: '100%', fontSize: '0.85rem', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)' }}></div>
              <span style={{ color: 'var(--text-secondary)' }}>Asistieron: <strong>{citasAsistio}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)' }}></div>
              <span style={{ color: 'var(--text-secondary)' }}>Ausentes: <strong>{citasNoAsistio}</strong></span>
            </div>
          </div>
        </div>

        {/* Treatment Distribution Chart */}
        <div className="glass-card chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '320px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Distribución de Tratamientos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, justifyContent: 'center' }}>
            {getTreatmentDistribution().slice(0, 6).map((treatment) => {
              const pct = totalCitas > 0 ? Math.round((treatment.count / totalCitas) * 100) : 0;
              const barColor = getBarColor(treatment.name);
              const maxCount = Math.max(...getTreatmentDistribution().map(d => d.count), 1);
              return (
                <div key={treatment.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 500 }}>
                    <span style={{ color: 'var(--text-primary)' }}>{treatment.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{treatment.count} cita{treatment.count === 1 ? '' : 's'} ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${(treatment.count / maxCount) * 100}%`, 
                      height: '100%', 
                      background: barColor, 
                      borderRadius: '4px',
                      transition: 'width 0.8s ease-out',
                      boxShadow: `0 0 8px ${barColor}`
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lists Columns */}
      <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
        {/* Column 1: Supabase Appointments */}
        <div className="glass-card" style={{flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h2 style={{fontSize: '1.1rem', fontWeight: 600}}>Próximas Citas (Supabase DB)</h2>
            <span style={{fontSize: '0.75rem', background: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600}}>BD ONLINE</span>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '400px'}}>
            {upcomingCitas.length === 0 ? (
              <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0'}}>
                No hay próximas citas clínicas programadas en la base de datos de Supabase.
              </p>
            ) : (
              upcomingCitas.map(cita => {
                const date = cita.fecha_hora_cita ? getLimaDate(cita.fecha_hora_cita) : null;
                const formattedDate = date 
                  ? date.toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'short'}) + ' a las ' + date.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})
                  : 'Fecha no programada';
                const patientName = cita.pacientes?.nombre_paciente || 'Paciente sin registrar';
                
                return (
                  <div key={cita.id} 
                    onClick={() => onOpenDetail(cita)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '10px',
                      borderLeft: cita.estado_cita === 'CANCELADA' ? '4px solid var(--danger)' : '4px solid var(--primary)', 
                      border: '1px solid var(--border-color)',
                      borderLeftWidth: '4px', gap: '10px',
                      opacity: cita.estado_cita === 'CANCELADA' ? 0.7 : 1,
                      cursor: 'pointer'
                    }}>
                    <div style={{overflow: 'hidden'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                        <span style={{
                          fontWeight: 600, 
                          fontSize: '0.9rem', 
                          color: 'var(--text-main)',
                          textDecoration: cita.estado_cita === 'CANCELADA' ? 'line-through' : 'none'
                        }}>{patientName}</span>
                        <span style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>({cita.telefono_paciente})</span>
                      </div>
                      <p style={{
                        fontSize: '0.8rem', 
                        color: 'var(--text-secondary)', 
                        fontStyle: cita.motivo_consulta ? 'normal' : 'italic', 
                        marginBottom: '4px',
                        textDecoration: cita.estado_cita === 'CANCELADA' ? 'line-through' : 'none'
                      }}>
                        {cita.motivo_consulta || 'Sin motivo especificado'}
                      </p>
                      <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <Clock size={12} style={{color: cita.estado_cita === 'CANCELADA' ? 'var(--danger)' : 'var(--primary)'}} /> {formattedDate}
                      </p>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0}}>
                      <span style={{
                        fontSize: '0.7rem', 
                        fontWeight: 600, 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        background: cita.estado_cita === 'CANCELADA' ? 'rgba(var(--danger-rgb), 0.1)' : (['CONFIRMADA', 'COMPLETADA', 'ASISTIO'].includes(cita.estado_cita) ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--warning-rgb), 0.1)'),
                        color: cita.estado_cita === 'CANCELADA' ? 'var(--danger)' : (['CONFIRMADA', 'COMPLETADA', 'ASISTIO'].includes(cita.estado_cita) ? 'var(--success)' : 'var(--warning)')
                      }}>
                        {cita.estado_cita || 'AGENDADA'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
