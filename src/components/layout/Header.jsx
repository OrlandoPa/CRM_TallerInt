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
        <h1 style={{textTransform: 'capitalize'}}>
          {getPageTitle(activeTab)}
        </h1>
      </div>
      <div className="top-bar-actions">
        {/* Google Calendar OAuth Login status in header */}
        {gcalConnected ? (
          <button 
            onClick={handleGoogleLogout} 
            className="btn" 
            style={{
              background: 'rgba(16, 185, 129, 0.1)', 
              color: '#10b981', 
              border: '1px solid rgba(16, 185, 129, 0.2)', 
              fontSize: '0.8rem', 
              padding: '6px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px'
            }}
          >
            <span className="pulse-dot" style={{background: '#10b981', boxShadow: '0 0 6px #10b981'}}></span>
            GCal Conectado (Salir)
          </button>
        ) : (
          <button 
            onClick={handleGoogleLogin} 
            className="btn" 
            style={{
              background: 'rgba(245, 158, 11, 0.1)', 
              color: '#f59e0b', 
              border: '1px solid rgba(245, 158, 11, 0.2)', 
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

        <button onClick={handleRefresh} className="btn-icon" title="Sincronizar Datos">
          <RefreshCw size={18} />
        </button>
        <div style={{
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
            background: supabaseOnline ? '#10b981' : '#f59e0b', 
            boxShadow: supabaseOnline ? '0 0 8px #10b981' : '0 0 8px #f59e0b'
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
