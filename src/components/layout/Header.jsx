import { LogOut, RefreshCw } from 'lucide-react';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  agenda: 'Agenda del Día',
  attendance: 'Tomar Asistencia',
  calendar: 'Calendario',
  chats: 'Chats WhatsApp'
};

function Header({ activeTab, handleRefresh, supabaseOnline, user, onLogout }) {
  const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1 data-testid="header-title">{PAGE_TITLES[activeTab] || activeTab}</h1>
        <span className="topbar-date">{today}</span>
      </div>
      <div className="topbar-actions">
        <div data-testid="status-supabase" className={`conn-status ${supabaseOnline ? '' : 'off'}`}>
          <span className="dot" />
          {supabaseOnline ? 'Base de datos conectada' : 'Supabase sin configurar'}
        </div>
        <button data-testid="btn-sync" onClick={handleRefresh} className="btn-icon" title="Sincronizar Datos">
          <RefreshCw size={16} />
        </button>

        {user && (
          <div data-testid="user-profile-badge" className="user-chip">
            {user.picture ? (
              <img src={user.picture} alt="" className="avatar" />
            ) : (
              <span className="avatar">{(user.name || user.email || 'U')[0].toUpperCase()}</span>
            )}
            <div className="user-meta">
              <strong>{user.name || 'Usuario'}</strong>
              <span>{user.email}</span>
            </div>
            {onLogout && (
              <button
                data-testid="btn-app-logout"
                onClick={onLogout}
                className="btn-icon danger"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
