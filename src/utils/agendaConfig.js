// Configuración de la agenda (catálogo, horario, feriados y bloqueos) que el
// doctor mantiene en la BD. Mientras carga, o si la BD no la tiene aún, se usan
// los valores que antes estaban fijos en el código.
import { createContext, useContext } from 'react';
import { getPeruHolidays } from './dateHelpers';

export const SERVICIOS_POR_DEFECTO = [
  { clave: 'evaluacion', nombre: 'Evaluación inicial / Revisión general', duracion_min: 30, activo: true },
  { clave: 'restauracion', nombre: 'Restauración', duracion_min: 30, activo: true },
  { clave: 'endodoncia', nombre: 'Endodoncia', duracion_min: 30, activo: true },
  { clave: 'ortodoncia', nombre: 'Ortodoncia', duracion_min: 30, activo: true },
  { clave: 'blanqueamiento', nombre: 'Blanqueamiento dental', duracion_min: 30, activo: true, nota: 'En consulta puede extenderse hasta 45 min.' },
  { clave: 'cirugia', nombre: 'Cirugía (ej. cordales)', duracion_min: 60, activo: true },
  { clave: 'rehabilitacion', nombre: 'Rehabilitación oral', duracion_min: 60, activo: true }
];

export const HORARIO_POR_DEFECTO = [1, 2, 3, 4, 5, 6].flatMap(dia => [
  { dia_semana: dia, inicio: '08:00', fin: '12:00' },
  { dia_semana: dia, inicio: '16:00', fin: '21:00' }
]);

const anio = new Date().getFullYear();

export const CONFIG_POR_DEFECTO = {
  servicios: SERVICIOS_POR_DEFECTO,
  horario: HORARIO_POR_DEFECTO,
  feriados: [...getPeruHolidays(anio), ...getPeruHolidays(anio + 1)].map(fecha => ({ fecha })),
  bloqueos: []
};

/** Completa con los valores por defecto lo que la BD no devolvió. */
export const normalizarConfig = (config) => ({
  servicios: config?.servicios?.length ? config.servicios : CONFIG_POR_DEFECTO.servicios,
  horario: config?.horario?.length ? config.horario : CONFIG_POR_DEFECTO.horario,
  feriados: config?.feriados?.length ? config.feriados : CONFIG_POR_DEFECTO.feriados,
  bloqueos: config?.bloqueos || []
});

export const AgendaConfigContext = createContext(CONFIG_POR_DEFECTO);

export const useAgendaConfig = () => useContext(AgendaConfigContext);
