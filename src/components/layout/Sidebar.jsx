import { 
  LayoutDashboard, 
  MessageSquare, 
  Calendar as CalendarIcon, 
  Check, 
  Sun, 
  Moon,
  Clock3
} from 'lucide-react';

function Sidebar({ activeTab, setActiveTab, theme, toggleTheme, pastAppointmentsToReview }) {
  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">T</div>
        <span className="logo-text">TallerCRM</span>
      </div>

      <nav className="sidebar-menu">
        <button 
          className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </button>

        <button 
          className={`menu-item ${activeTab === 'agenda' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('agenda');
          }}
        >
          <Clock3 size={20} />
          Agenda del Día
        </button>

        <button 
          className={`menu-item ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <Check size={20} style={{ color: pastAppointmentsToReview.length > 0 ? '#fbbf24' : 'inherit' }} />
          Tomar Asistencia
          {pastAppointmentsToReview.length > 0 && (
            <span style={{
              marginLeft: 'auto',
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#fbbf24',
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: '10px',
              fontWeight: 'bold'
            }}>
              {pastAppointmentsToReview.length}
            </span>
          )}
        </button>

        <button 
          className={`menu-item ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          <MessageSquare size={20} />
          Chats WhatsApp
        </button>
        <button 
          className={`menu-item ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <CalendarIcon size={20} />
          Calendario
        </button>
      </nav>

      <div className="sidebar-footer">
        <button onClick={toggleTheme} className="menu-item" style={{width: '100%', background: 'none', border: 'none', textAlign: 'left'}}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
