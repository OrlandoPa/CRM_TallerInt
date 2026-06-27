import { MessageSquare, ExternalLink } from 'lucide-react';

function ChatsView({ chatwootEmbedUrl, chatwootDashboardUrl }) {
  return (
    <div className="chats-view animate-fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 0'}}>
      <header className="chat-header" style={{margin: '0 20px 15px 20px', padding: '0 0 15px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <MessageSquare size={24} style={{color: 'var(--primary)'}} />
          <div>
            <span className="chat-name" style={{fontSize: '1.15rem', fontWeight: 600}}>Consola de Chatwoot</span>
            <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Gestiona tus conversaciones y contactos de WhatsApp</p>
          </div>
        </div>
        <div>
          <a 
            href={chatwootDashboardUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary" 
            style={{padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none'}}
          >
            Abrir en pestaña nueva <ExternalLink size={14} />
          </a>
        </div>
      </header>

      <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column', height: 'calc(100% - 80px)', overflow: 'hidden', padding: '0 20px'}}>
        <iframe 
          src={chatwootEmbedUrl}
          style={{width: '100%', flexGrow: 1, border: 'none', background: 'var(--bg-secondary)', borderRadius: '12px', height: '100%'}}
          title="Consola de Chatwoot"
          allow="camera; microphone; geolocation"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}

export default ChatsView;
