export const getPeruHolidays = (year) => {
  return [
    `${year}-01-01`, // Año Nuevo
    `${year}-05-01`, // Día del Trabajo
    `${year}-06-07`, // Batalla de Arica
    `${year}-06-29`, // San Pedro y San Pablo
    `${year}-07-23`, // Fuerza Aérea
    `${year}-07-28`, // Fiestas Patrias
    `${year}-07-29`, // Fiestas Patrias
    `${year}-08-06`, // Batalla de Junín
    `${year}-08-30`, // Santa Rosa de Lima
    `${year}-10-08`, // Combate de Angamos
    `${year}-11-01`, // Todos los Santos
    `${year}-12-08`, // Inmaculada Concepción
    `${year}-12-09`, // Batalla de Ayacucho
    `${year}-12-25`  // Navidad
  ];
};

export const isPeruHoliday = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  return getPeruHolidays(year).includes(dateStr);
};

export const isValidWorkingHours = (startDate, endDate) => {
  // Check day of week (Sunday is 0)
  if (startDate.getDay() === 0 || endDate.getDay() === 0) {
    return { valid: false, reason: 'No se pueden agendar citas los domingos.' };
  }

  // Check Peru Holiday
  if (isPeruHoliday(startDate) || isPeruHoliday(endDate)) {
    return { valid: false, reason: 'No se pueden agendar citas en feriados nacionales de Perú.' };
  }

  // Check if start and end are on the same day
  if (startDate.toDateString() !== endDate.toDateString()) {
    return { valid: false, reason: 'La cita debe empezar y terminar el mismo día.' };
  }

  // Check time ranges
  const startHour = startDate.getHours();
  const startMin = startDate.getMinutes();
  const endHour = endDate.getHours();
  const endMin = endDate.getMinutes();

  const startVal = startHour * 60 + startMin;
  const endVal = endHour * 60 + endMin;

  const morningStart = 8 * 60;   // 8:00 AM
  const morningEnd = 12 * 60;   // 12:00 PM
  const afternoonStart = 16 * 60; // 4:00 PM (16:00)
  const afternoonEnd = 21 * 60;   // 9:00 PM (21:00)

  const inMorning = startVal >= morningStart && endVal <= morningEnd;
  const inAfternoon = startVal >= afternoonStart && endVal <= afternoonEnd;

  if (!inMorning && !inAfternoon) {
    return { 
      valid: false, 
      reason: 'El horario debe estar dentro de las jornadas laborales: Mañanas (8:00 AM - 12:00 PM) o Tardes (4:00 PM - 9:00 PM).' 
    };
  }

  return { valid: true };
};

export const calculateEndTime = (startStr, treatmentKey) => {
  if (!startStr) return '';
  const startDate = new Date(startStr);
  let durationMinutes;

  switch (treatmentKey) {
    case 'evaluacion':
    case 'restauracion':
    case 'endodoncia':
    case 'ortodoncia':
      durationMinutes = 30;
      break;
    case 'blanqueamiento':
      durationMinutes = 45;
      break;
    case 'cirugia':
    case 'rehabilitacion':
      durationMinutes = 60;
      break;
    default:
      durationMinutes = 30;
  }

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return endDate.toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
};

export const getLimaDate = (dateOrStr) => {
  if (!dateOrStr) return null;
  const date = new Date(dateOrStr);
  if (isNaN(date.getTime())) return null;

  try {
    // Force conversion of date to America/Lima timezone fields
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const partValues = {};
    parts.forEach(p => {
      partValues[p.type] = p.value;
    });

    return new Date(
      parseInt(partValues.year),
      parseInt(partValues.month) - 1,
      parseInt(partValues.day),
      parseInt(partValues.hour),
      parseInt(partValues.minute),
      parseInt(partValues.second)
    );
  } catch (e) {
    console.error('Error formatting Lima date:', e);
    return date; // fallback to original date object if Intl fails
  }
};
