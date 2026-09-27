import {
  LayoutGrid,
  MessageSquare,
  CalendarDays,
  ClipboardCheck,
  Sun,
  Moon,
  Clock3,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'agenda', label: 'Agenda del Día', icon: Clock3 },
  { id: 'attendance', label: 'Tomar Asistencia', icon: ClipboardCheck },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'chats', label: 'Chats WhatsApp', icon: MessageSquare }
];

function Sidebar({ activeTab, setActiveTab, theme, toggleTheme, pastAppointmentsToReview, isCollapsed, setIsCollapsed }) {
  const pendingCount = pastAppointmentsToReview.length;

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">C</div>
        {!isCollapsed && (
          <div className="brand-text">
            <span className="brand-name">Gestión de Citas</span>
            <span className="brand-sub">Clínica odontológica</span>
          </div>
        )}
      </div>

      <nav className="nav" aria-label="Secciones">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const showCount = id === 'attendance' && pendingCount > 0;
          return (
            <button
              key={id}
              data-testid={`tab-${id}`}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
              title={isCollapsed ? label : undefined}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={1.75} />
              {!isCollapsed && <span>{label}</span>}
              {showCount && (isCollapsed
                ? <span className="nav-dot" aria-label={`${pendingCount} pendientes`} />
                : <span className="nav-count">{pendingCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          data-testid="btn-theme-toggle"
          onClick={toggleTheme}
          className="nav-item"
          title={isCollapsed ? (theme === 'dark' ? 'Modo claro' : 'Modo oscuro') : undefined}
        >
          {theme === 'dark' ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
          {!isCollapsed && <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="nav-item sidebar-toggle-btn"
          title={isCollapsed ? 'Desplegar menú' : 'Retraer menú'}
        >
          {isCollapsed ? <PanelLeftOpen size={18} strokeWidth={1.75} /> : <PanelLeftClose size={18} strokeWidth={1.75} />}
          {!isCollapsed && <span>Retraer menú</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
