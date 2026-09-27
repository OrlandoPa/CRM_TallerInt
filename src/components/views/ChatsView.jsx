import { ExternalLink } from 'lucide-react';

function ChatsView({ chatwootEmbedUrl, chatwootDashboardUrl }) {
  return (
    <div className="page chats-view">
      <div className="toolbar">
        <p className="lead">Conversaciones de WhatsApp atendidas por el bot y el personal, desde Chatwoot.</p>
        <a
          href={chatwootDashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          Abrir en pestaña nueva <ExternalLink size={14} />
        </a>
      </div>

      <div className="panel chats-frame">
        <iframe
          src={chatwootEmbedUrl}
          title="Consola de Chatwoot"
          allow="camera; microphone; geolocation"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}

export default ChatsView;
