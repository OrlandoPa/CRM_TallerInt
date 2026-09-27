import { etiquetaEstado, tonoEstado } from '../../utils/estadosCita';

function StatusBadge({ estado }) {
  return (
    <span className={`badge badge--${tonoEstado(estado)}`} title={estado || 'AGENDADA'}>
      {etiquetaEstado(estado)}
    </span>
  );
}

export default StatusBadge;
