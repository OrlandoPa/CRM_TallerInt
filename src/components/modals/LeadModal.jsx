function LeadModal({ isOpen, onClose, lead, onChange, onSubmit }) {
  if (!isOpen || !lead) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-slide-up">
        <header className="modal-header">
          <span className="modal-title">Detalles del Lead CRM</span>
          <button onClick={onClose} className="btn-icon" style={{width:'32px', height:'32px'}}>✕</button>
        </header>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Número de WhatsApp (Celular)</label>
              <input 
                type="text" 
                className="form-control" 
                value={lead.phone_number} 
                disabled 
              />
            </div>
            <div className="form-group">
              <label>Nombre del Cliente</label>
              <input 
                type="text" 
                className="form-control" 
                value={lead.client_name} 
                placeholder="Ej. Juan Pérez"
                onChange={(e) => onChange(prev => ({ ...prev, client_name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input 
                type="email" 
                className="form-control" 
                value={lead.client_email || ''} 
                placeholder="Ej. correo@dominio.com"
                onChange={(e) => onChange(prev => ({ ...prev, client_email: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Estado en Embudo CRM</label>
              <select 
                className="form-control"
                value={lead.status}
                onChange={(e) => onChange(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="lead">Nuevo Lead</option>
                <option value="contacted">Contactado / En Conversación</option>
                <option value="scheduled">Cita Agendada</option>
                <option value="completed">Tratamiento Completado</option>
                <option value="lost">Lead Perdido</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notas Internas y de Tratamiento</label>
              <textarea 
                className="form-control"
                rows={4}
                value={lead.internal_notes || ''}
                placeholder="Agregar observaciones clínicas, precios especiales o comentarios..."
                onChange={(e) => onChange(prev => ({ ...prev, internal_notes: e.target.value }))}
              />
            </div>
          </div>
          <footer className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Cambios
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default LeadModal;
