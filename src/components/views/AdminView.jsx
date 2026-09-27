import { useRef, useState } from 'react';
import UsuariosPanel from './admin/UsuariosPanel';
import ServiciosPanel from './admin/ServiciosPanel';
import HorarioPanel from './admin/HorarioPanel';
import BloqueosPanel from './admin/BloqueosPanel';

const PESTANAS = [
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'horario', label: 'Horario y feriados' },
  { id: 'bloqueos', label: 'Bloqueos de agenda' }
];

// Módulo exclusivo del doctor. La RLS de Supabase impide estas acciones a
// cualquier otro rol aunque llegara a ver la pantalla.
function AdminView({ usuario, config, onConfigChanged, showToast }) {
  const [activa, setActiva] = useState('usuarios');
  const refs = useRef({});

  // Navegación con flechas entre pestañas (patrón WAI-ARIA)
  const onKeyDown = (e) => {
    const i = PESTANAS.findIndex(p => p.id === activa);
    let siguiente = null;
    if (e.key === 'ArrowRight') siguiente = PESTANAS[(i + 1) % PESTANAS.length];
    if (e.key === 'ArrowLeft') siguiente = PESTANAS[(i - 1 + PESTANAS.length) % PESTANAS.length];
    if (e.key === 'Home') siguiente = PESTANAS[0];
    if (e.key === 'End') siguiente = PESTANAS[PESTANAS.length - 1];
    if (siguiente) {
      e.preventDefault();
      setActiva(siguiente.id);
      refs.current[siguiente.id]?.focus();
    }
  };

  return (
    <div className="page" data-testid="view-admin">
      <div className="tabs" role="tablist" aria-label="Secciones de administración" onKeyDown={onKeyDown}>
        {PESTANAS.map(p => (
          <button
            key={p.id}
            ref={(el) => { refs.current[p.id] = el; }}
            type="button"
            role="tab"
            id={`tab-admin-${p.id}`}
            aria-selected={activa === p.id}
            aria-controls={`panel-admin-${p.id}`}
            tabIndex={activa === p.id ? 0 : -1}
            className="tab"
            data-testid={`tab-admin-${p.id}`}
            onClick={() => setActiva(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-admin-${activa}`} aria-labelledby={`tab-admin-${activa}`}>
        {activa === 'usuarios' && <UsuariosPanel usuarioActual={usuario} showToast={showToast} />}
        {activa === 'servicios' && (
          <ServiciosPanel servicios={config.servicios} onConfigChanged={onConfigChanged} showToast={showToast} />
        )}
        {activa === 'horario' && (
          <HorarioPanel horario={config.horario} feriados={config.feriados} onConfigChanged={onConfigChanged} showToast={showToast} />
        )}
        {activa === 'bloqueos' && (
          <BloqueosPanel bloqueos={config.bloqueos} onConfigChanged={onConfigChanged} showToast={showToast} />
        )}
      </div>
    </div>
  );
}

export default AdminView;
