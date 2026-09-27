import { AlertCircle } from 'lucide-react';

export const GCAL_REQUIRED_MSG =
  'Google Calendar no respondió. Mientras tanto, agendar, reprogramar y cancelar están deshabilitados; usa "Reintentar" o avisa al doctor.';

function GCalNotice() {
  return (
    <div className="notice notice--bad" role="alert">
      <AlertCircle size={16} />
      <span>{GCAL_REQUIRED_MSG}</span>
    </div>
  );
}

export default GCalNotice;
