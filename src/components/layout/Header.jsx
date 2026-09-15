import { LogOut, RefreshCw, User } from 'lucide-react';

function Header({ activeTab, handleRefresh, supabaseOnline, user, onLogout }) {
  const getPageTitle = (tab) => {
    switch (tab) {
      case 'chats':
        return 'Consola de Chatwoot';
      case 'calendar':
        return 'Calendario';
      case 'agenda':
        return 'Agenda del Día';
      case 'attendance':
        return 'Tomar Asistencia';
      default:
        return tab;
    }
  };

  return (
    <header className="top-bar">
      <div className="page-title">
        <h1 data-testid="header-title" style={{textTransform: 'capitalize'}}>
          {getPageTitle(activeTab)}
        </h1>
      </div>
      <div className="top-bar-actions">
        <button data-testid="btn-sync" onClick={handleRefresh} className="btn-icon" title="Sincronizar Datos">
          <RefreshCw size={18} />
        </button>
        <div data-testid="status-supabase" style={{
          display:'flex', 
          alignItems:'center', 
          gap:'10px', 
          background:'var(--bg-tertiary)', 
          padding:'6px 12px', 
          borderRadius:'10px', 
          border:'1px solid var(--border-color)'
        }}>
          <div style={{
            width:'8px', 
            height:'8px', 
            borderRadius:'50%', 
            background: supabaseOnline ? 'var(--success)' : 'var(--warning)', 
            boxShadow: supabaseOnline ? '0 0 8px var(--success)' : '0 0 8px var(--warning)'
          }}></div>
          <span style={{fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)'}}>
            {supabaseOnline ? 'Supabase ONLINE' : 'Modo Simulador'}
          </span>
        </div>

        {/* Perfil de Usuario Autorizado y Salida */}
        {user && (
          <div 
            data-testid="user-profile-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              padding: '4px 10px 4px 6px',
              borderRadius: '20px',
              marginLeft: '8px'
            }}
          >
            {user.picture ? (
              <img 
                src={user.picture} 
                alt="Avatar" 
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User size={16} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.name || 'Usuario'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {user.email}
              </span>
            </div>
            {onLogout && (
              <button
                data-testid="btn-app-logout"
                onClick={onLogout}
                className="btn-icon"
                title="Cerrar Sesión del CRM"
                style={{
                  padding: '5px',
                  borderRadius: '50%',
                  color: 'var(--danger)',
                  background: 'rgba(248, 113, 113, 0.1)',
                  border: '1px solid rgba(248, 113, 113, 0.2)',
                  cursor: 'pointer',
                  marginLeft: '4px'
                }}
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;

