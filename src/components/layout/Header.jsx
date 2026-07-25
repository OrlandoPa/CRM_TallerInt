import { LogIn, RefreshCw } from 'lucide-react';

function Header({ activeTab, gcalConnected, handleGoogleLogin, handleGoogleLogout, handleRefresh, supabaseOnline }) {
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
        {/* Google Calendar OAuth Login status in header */}
        {gcalConnected ? (
          <button 
            data-testid="btn-gcal-logout"
            onClick={handleGoogleLogout} 
            className="btn" 
            style={{
              background: 'rgba(var(--success-rgb), 0.1)', 
              color: 'var(--success)', 
              border: '1px solid rgba(var(--success-rgb), 0.2)', 
              fontSize: '0.8rem', 
              padding: '6px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px'
            }}
          >
            <span className="pulse-dot" style={{background: 'var(--success)', boxShadow: '0 0 6px var(--success)'}}></span>
            GCal Conectado (Salir)
          </button>
        ) : (
          <button 
            data-testid="btn-gcal-login"
            onClick={handleGoogleLogin} 
            className="btn" 
            style={{
              background: 'rgba(var(--warning-rgb), 0.1)', 
              color: 'var(--warning)', 
              border: '1px solid rgba(var(--warning-rgb), 0.2)', 
              fontSize: '0.8rem', 
              padding: '6px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px'
            }}
          >
            <LogIn size={14} />
            Conectar Google Calendar
          </button>
        )}

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
      </div>
    </header>
  );
}

export default Header;
