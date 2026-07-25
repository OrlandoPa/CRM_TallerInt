import { 
  LayoutDashboard, 
  MessageSquare, 
  Calendar as CalendarIcon, 
  Check, 
  Sun, 
  Moon,
  Clock3,
  CalendarCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

function Sidebar({ activeTab, setActiveTab, theme, toggleTheme, pastAppointmentsToReview, isCollapsed, setIsCollapsed }) {
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="logo-container" style={{ justifyContent: isCollapsed ? 'center' : 'space-between', width: '100%', paddingRight: isCollapsed ? 0 : '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
          <div className="logo-icon" style={{ flexShrink: 0 }}>
            <CalendarCheck size={20} />
          </div>
          {!isCollapsed && (
            <span className="logo-text" style={{ fontSize: '1rem', lineHeight: '1.2' }}>
              Sistema Gestión de Citas
            </span>
          )}
        </div>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="btn-icon sidebar-toggle-btn" 
          style={{ 
            width: '28px', 
            height: '28px', 
            border: 'none', 
            background: 'var(--bg-tertiary)', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--text-primary)',
            marginLeft: isCollapsed ? '0' : '8px',
            marginTop: isCollapsed ? '8px' : '0'
          }}
          title={isCollapsed ? "Desplegar menú" : "Retraer menú"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar-menu" style={{ width: '100%' }}>
        <button 
          data-testid="tab-dashboard"
          className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          title={isCollapsed ? "Dashboard" : ""}
        >
          <LayoutDashboard size={20} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span>Dashboard</span>}
        </button>

        <button 
          data-testid="tab-agenda"
          className={`menu-item ${activeTab === 'agenda' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('agenda');
          }}
          title={isCollapsed ? "Agenda del Día" : ""}
        >
          <Clock3 size={20} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span>Agenda del Día</span>}
        </button>

        <button 
          data-testid="tab-attendance"
          className={`menu-item ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
          title={isCollapsed ? "Tomar Asistencia" : ""}
          style={{ position: 'relative' }}
        >
          <Check size={20} style={{ color: pastAppointmentsToReview.length > 0 ? 'var(--warning)' : 'inherit', flexShrink: 0 }} />
          {!isCollapsed && <span>Tomar Asistencia</span>}
          {pastAppointmentsToReview.length > 0 && (
            <span style={isCollapsed ? {
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'var(--warning)',
              width: '8px',
              height: '8px',
              borderRadius: '50%'
            } : {
              marginLeft: 'auto',
              background: 'rgba(var(--warning-rgb), 0.2)',
              color: 'var(--warning)',
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: '10px',
              fontWeight: 'bold'
            }}>
              {!isCollapsed && pastAppointmentsToReview.length}
            </span>
          )}
        </button>

        <button 
          data-testid="tab-chats"
          className={`menu-item ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
          title={isCollapsed ? "Chats WhatsApp" : ""}
        >
          <MessageSquare size={20} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span>Chats WhatsApp</span>}
        </button>
        <button 
          data-testid="tab-calendar"
          className={`menu-item ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
          title={isCollapsed ? "Calendario" : ""}
        >
          <CalendarIcon size={20} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span>Calendario</span>}
        </button>
      </nav>

      <div className="sidebar-footer" style={{ width: '100%' }}>
        <button data-testid="btn-theme-toggle" onClick={toggleTheme} className="menu-item" style={{width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: isCollapsed ? '12px' : '12px 16px', justifyContent: isCollapsed ? 'center' : 'flex-start'}} title={isCollapsed ? (theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro') : ""}>
          {theme === 'dark' ? <Sun size={20} style={{ flexShrink: 0 }} /> : <Moon size={20} style={{ flexShrink: 0 }} />}
          {!isCollapsed && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
