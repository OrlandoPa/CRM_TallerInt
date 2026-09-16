/**
 * Helper to resolve contact identifier (phone number or WhatsApp username)
 * for a patient / appointment from all available sources.
 */
export const resolveContactIdentifier = (appDetails, leads = [], pacientes = [], citasDb = []) => {
  if (!appDetails) return '';

  // 1. Check direct fields on appointment object
  const direct = appDetails.identificador_paciente || 
                 appDetails.telefono_paciente || 
                 appDetails.pacientes?.identificador_paciente || 
                 appDetails.pacientes?.telefono_whatsapp || 
                 appDetails.pacientes?.telefono_paciente ||
                 appDetails.phone_number;

  if (direct && typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  // 2. Extract patient name
  const rawName = appDetails.pacientes?.nombre_paciente || 
                  (appDetails.summary ? appDetails.summary.split(' - ')[0].trim() : '') ||
                  (appDetails.motivo_consulta ? appDetails.motivo_consulta.split(' - ')[0].trim() : '');

  const patientName = rawName && !['Paciente GCal', 'Paciente', 'Paciente sin nombre'].includes(rawName) ? rawName : null;

  if (patientName) {
    const normName = patientName.toLowerCase().trim();

    // Search in citasDb
    if (Array.isArray(citasDb) && citasDb.length > 0) {
      const matchCita = citasDb.find(c => {
        const cName = (c.pacientes?.nombre_paciente || c.motivo_consulta || '').toLowerCase();
        return cName.includes(normName) || normName.includes(cName);
      });
      if (matchCita) {
        const citaContact = matchCita.identificador_paciente || 
                            matchCita.telefono_paciente || 
                            matchCita.pacientes?.identificador_paciente || 
                            matchCita.pacientes?.telefono_whatsapp || 
                            matchCita.pacientes?.telefono_paciente;
        if (citaContact && typeof citaContact === 'string' && citaContact.trim()) {
          return citaContact.trim();
        }
      }
    }

    // Search in leads
    if (Array.isArray(leads) && leads.length > 0) {
      const matchLead = leads.find(l => {
        const lName = (l.client_name || '').toLowerCase().trim();
        return lName === normName || lName.includes(normName) || normName.includes(lName);
      });
      if (matchLead && matchLead.phone_number && matchLead.phone_number.trim()) {
        return matchLead.phone_number.trim();
      }
    }

    // Search in pacientes
    if (Array.isArray(pacientes) && pacientes.length > 0) {
      const matchPac = pacientes.find(p => {
        const pName = (p.nombre_paciente || '').toLowerCase().trim();
        return pName === normName || pName.includes(normName) || normName.includes(pName);
      });
      if (matchPac) {
        const pacContact = matchPac.identificador_paciente || matchPac.telefono_whatsapp || matchPac.telefono_paciente;
        if (pacContact && typeof pacContact === 'string' && pacContact.trim()) {
          return pacContact.trim();
        }
      }
    }
  }

  // 3. Search in description / summary / motivo_consulta text for phone/username regex pattern
  const textToSearch = `${appDetails.description || ''} ${appDetails.summary || ''} ${appDetails.motivo_consulta || ''} ${appDetails.detalles_notas_cita || ''}`;
  
  // Try matching phone number format (e.g. +51 987 654 321, 987654321, +51987654321)
  const phoneMatch = textToSearch.match(/(\+?\d{1,3}[\s\-]?)?9\d{2}[\s\-]?\d{3}[\s\-]?\d{3}/);
  if (phoneMatch) return phoneMatch[0].trim();

  // Try matching username/handle format (e.g. @username)
  const userMatch = textToSearch.match(/@[a-zA-Z0-9_\.-]+/);
  if (userMatch) return userMatch[0].trim();

  return '';
};
