import { AlertCircle } from 'lucide-react';

export const GCAL_REQUIRED_MSG =
  'Conecta la cuenta de Google Calendar autorizada para gestionar citas. Mientras tanto, agendar, reprogramar y marcar asistencia están deshabilitados.';

function GCalNotice() {
  return (
    <div className="notice notice--bad" role="alert">
      <AlertCircle size={16} />
      <span>{GCAL_REQUIRED_MSG}</span>
    </div>
  );
}

export default GCalNotice;
