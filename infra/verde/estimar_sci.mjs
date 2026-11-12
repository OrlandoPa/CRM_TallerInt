#!/usr/bin/env node
/**
 * Estimación de la huella de carbono del SGRC con la especificación
 * Software Carbon Intensity (SCI, ISO/IEC 21031:2024):
 *
 *   SCI = ((E × I) + M) por R        R = una cita gestionada
 *
 * Es una ESTIMACIÓN: ningún proveedor expone el consumo de energía de un VPS
 * ni de un servicio gestionado. Cada parámetro indica su fuente o si es un
 * supuesto. Los que dicen «MEDIR» se reemplazan con datos reales.
 *
 * Uso:  node infra/verde/estimar_sci.mjs [--util=0.1] [--json]
 * Sin dependencias (Anexo I del Informe final, requisito RNF-VERDE-04).
 */

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

// ---------------------------------------------------------------------------
// 1. Coeficientes con fuente
// ---------------------------------------------------------------------------
const CCF = {
  // Cloud Carbon Footprint, Methodology (consultado el 11/11/2026)
  minWattsVcpu: 0.74, // AWS, promedio, 0 % de CPU
  maxWattsVcpu: 3.5, //  AWS, promedio, 100 % de CPU
  kWhPorGBHoraMemoria: 0.000392,
  pueAws: 1.135,
  pueAzure: 1.185, // runners de GitHub Actions
  vidaUtilAnios: 4, // EL de la fórmula de emisiones incorporadas
  // cloud-carbon-coefficients, coefficients-aws-embodied.csv: m5.24xlarge (96 vCPU)
  embodiedServidorKg: 1610.79,
  vcpuServidor: 96,
};

const SWD_V4 = {
  // Sustainable Web Design v4, constantes de CO2.js 0.16.9 (kWh por GB transferido)
  operativo: { datacenter: 0.055, red: 0.059, dispositivo: 0.08 },
  incorporado: { datacenter: 0.012, red: 0.013, dispositivo: 0.081 },
};

const INTENSIDAD = {
  // gCO2eq/kWh
  francia: 32.0, //   Electricity Maps, Grid in review 2025: France (flujos)
  pjm: 396.25, //     Green Web Foundation, cloud regions 2023 (us-east-1 y us-east-2)
  peru: 197, //       LowCarbonPower, 12 meses a mayo de 2026
  mundial: 494, //    promedio mundial de CO2.js 0.16.9 (Ember)
};

const GEMINI = {
  // Google (2025), mediana por prompt de Gemini Apps con el método completo.
  // Se usa como cota superior: flash-lite es un modelo más pequeño.
  whPorLlamada: 0.24,
  gCO2PorLlamada: 0.03,
};

const PUE_CONTABO_HUB_EUROPE = 1.168; // Contabo, Welcome to Hub Europe (PUE de diseño)

// ---------------------------------------------------------------------------
// 2. Uso del sistema (supuestos y datos medidos)
// ---------------------------------------------------------------------------
const USO = {
  horasAnio: 8760,
  // R: citas gestionadas al año, con las mediciones del informe (pre-test y post-test,
  // corte al 25/09/2026), Tabla 9: 468 solicitudes por WhatsApp × 86.8 % que terminan
  // en cita + 20.5 citas presenciales al día × 312 días. --citas=N para sensibilidad.
  citasAnio: Number(args.citas ?? Math.round(468 * 0.868 + 20.5 * 312)),

  // VPS: Cloud VPS 4 (2026), 4 núcleos y 8 GB (panel de Contabo, 11/11/2026)
  vps: { cantidad: 2, vcpu: 4, ramGB: 8 },
  // Medido el 11/11/2026 en /proc/stat (promedio desde el arranque, 24 días): 0.3 % y 0.7 %
  utilizacionCpu: Number(args.util ?? 0.005),

  // Supabase Nano (plan Free): 0.5 GB de RAM y CPU compartida. SUPUESTO: 0.5 vCPU equivalente.
  supabase: { vcpu: 0.5, ramGB: 0.5 },

  // CRM: archivos medidos en producción el 11/11/2026 (KB transferidos, comprimidos)
  // --linea-base: valores medidos antes de las mejoras de la semana 3 (11/11/2026)
  crmKB: args['linea-base'] ? {
    propio: 147.8, //          index.html + index.js + index.css (Vercel)
    accesibilidad: 81.1, //    widget de UserWay (6 archivos)
    fuentes: 182.7 + 1.9, //   IBM Plex Mono 400, IBM Plex Sans (variable) y Source Serif 4 con eje óptico + CSS
  } : {
    propio: 146.2, //          medido tras el despliegue del 11/11/2026 (gzip)
    accesibilidad: 81.1,
    fuentes: 111.2 + 1.4, //   Source Serif 4 sin eje óptico (50.9 KB en vez de 122.4 KB); sin OpenDyslexic
  },
  // SQL del 11/11/2026: citas 9 978 bytes y pacientes 3 425 bytes en la base; con JSON y
  // configuración se redondea a 20 KB por carga (supuesto conservador)
  datosApiKBPorCarga: 20,
  cargasDia: 10, //           SUPUESTO: el doctor abre o recarga el CRM 10 veces al día
  diasAtencion: 312, //       Informe, Tabla 9
  cargasCompletasAnio: 52, // SUPUESTO: una carga sin caché por semana (nuevo despliegue)
  fraccionRecarga: 0.02, //   SWD: con caché solo se vuelve a descargar el 2 %

  // Asistente de WhatsApp
  conversacionesAnio: 468, // Informe, Tabla 9 (1.5 solicitudes por día × 312 días)
  // Proporción de la memoria del bot (SQL del 11/11/2026: 881 mensajes del paciente en 76 conversaciones)
  mensajesPorConversacion: 881 / 76,
  llamadasIaPorMensaje: 2, //    clasificador + agente especializado
  kbPorMensaje: 5, //            SUPUESTO: payload de WhatsApp, Chatwoot y n8n
  kbPorOperacionGoogle: 20, //   SUPUESTO: evento, invitación o correo
  operacionesGooglePorCita: 3, // crear evento + invitación + recordatorio

  // Integración continua: API pública de GitHub, 27/09 – 09/11/2026: 39 corridas, 45 s en promedio
  ci: { corridas: 39, segundos: 45, dias: 43, vcpu: 4, ramGB: 16 },
};

// ---------------------------------------------------------------------------
// 3. Cálculo
// ---------------------------------------------------------------------------
const wattsVcpu = (u) => CCF.minWattsVcpu + u * (CCF.maxWattsVcpu - CCF.minWattsVcpu);
const kWhServidor = ({ vcpu, ramGB }, util, horas, pue) =>
  ((vcpu * wattsVcpu(util)) / 1000 + ramGB * CCF.kWhPorGBHoraMemoria) * horas * pue;
const embodiedKgAnio = (vcpu) =>
  (CCF.embodiedServidorKg / CCF.vidaUtilAnios) * (vcpu / CCF.vcpuServidor);

/** SWD v4: energía y carbono por GB transferido, con intensidad por segmento. */
function transferencia(gb, int) {
  const seg = ['datacenter', 'red', 'dispositivo'];
  const kWh = seg.reduce((s, k) => s + gb * (SWD_V4.operativo[k] + SWD_V4.incorporado[k]), 0);
  const g = seg.reduce((s, k) => s + gb * (SWD_V4.operativo[k] + SWD_V4.incorporado[k]) * int[k], 0);
  return { kWh, kg: g / 1000 };
}

const u = USO.utilizacionCpu;
const filas = [];

// 3.1 VPS de n8n y Chatwoot (Francia)
{
  const kWh = kWhServidor(USO.vps, u, USO.horasAnio, PUE_CONTABO_HUB_EUROPE) * USO.vps.cantidad;
  filas.push({
    componente: 'VPS de n8n y Chatwoot (Contabo, Francia)',
    kWh, operKg: (kWh * INTENSIDAD.francia) / 1000,
    incorpKg: embodiedKgAnio(USO.vps.vcpu) * USO.vps.cantidad,
  });
}
// 3.2 Supabase (us-east-2, PJM)
{
  const kWh = kWhServidor(USO.supabase, u, USO.horasAnio, CCF.pueAws);
  filas.push({
    componente: 'Supabase: BD, Auth y Edge Function (Ohio)',
    kWh, operKg: (kWh * INTENSIDAD.pjm) / 1000, incorpKg: embodiedKgAnio(USO.supabase.vcpu),
  });
}
// 3.3 CRM web (Vercel CDN + red + equipo del doctor en Perú)
const kbCompleta = USO.crmKB.propio + USO.crmKB.accesibilidad + USO.crmKB.fuentes;
{
  const cargas = USO.cargasDia * USO.diasAtencion;
  const kb = USO.cargasCompletasAnio * kbCompleta
    + (cargas - USO.cargasCompletasAnio) * kbCompleta * USO.fraccionRecarga
    + cargas * USO.datosApiKBPorCarga;
  const t = transferencia(kb / 1e6, { datacenter: INTENSIDAD.mundial, red: INTENSIDAD.peru, dispositivo: INTENSIDAD.peru });
  filas.push({ componente: 'CRM web: transferencia y equipo (Vercel)', kWh: t.kWh, operKg: t.kg, incorpKg: 0, nota: 'SWD v4 incluye lo incorporado' });
}
// 3.4 Gemini
{
  const llamadas = USO.conversacionesAnio * USO.mensajesPorConversacion * USO.llamadasIaPorMensaje;
  filas.push({
    componente: 'API de Gemini (cota superior)',
    kWh: (llamadas * GEMINI.whPorLlamada) / 1000, operKg: (llamadas * GEMINI.gCO2PorLlamada) / 1000, incorpKg: 0,
    nota: `${llamadas} llamadas al año`,
  });
}
// 3.5 Google Calendar, Gmail y WhatsApp (transferencia)
{
  const kb = USO.citasAnio * USO.operacionesGooglePorCita * USO.kbPorOperacionGoogle
    + USO.conversacionesAnio * USO.mensajesPorConversacion * 2 * USO.kbPorMensaje;
  const t = transferencia(kb / 1e6, { datacenter: INTENSIDAD.mundial, red: INTENSIDAD.mundial, dispositivo: INTENSIDAD.peru });
  filas.push({ componente: 'Google Calendar, Gmail y WhatsApp', kWh: t.kWh, operKg: t.kg, incorpKg: 0, nota: 'SWD v4 incluye lo incorporado' });
}
// 3.6 Integración continua (desarrollo), anualizada
{
  const horas = (USO.ci.corridas * USO.ci.segundos) / 3600 * (365 / USO.ci.dias);
  const kWh = kWhServidor(USO.ci, 0.5, horas, CCF.pueAzure);
  filas.push({ componente: 'Integración continua (GitHub Actions)', kWh, operKg: (kWh * INTENSIDAD.mundial) / 1000, incorpKg: 0 });
}

const total = filas.reduce((t, f) => ({
  kWh: t.kWh + f.kWh, operKg: t.operKg + f.operKg, incorpKg: t.incorpKg + f.incorpKg,
}), { kWh: 0, operKg: 0, incorpKg: 0 });
const totalKg = total.operKg + total.incorpKg;
const sciG = (totalKg * 1000) / USO.citasAnio;

// ---------------------------------------------------------------------------
// 4. Salida
// ---------------------------------------------------------------------------
if (args.json) {
  console.log(JSON.stringify({ utilizacionCpu: u, citasAnio: USO.citasAnio, kbCargaCompleta: kbCompleta, filas, total, totalKg, sciG }, null, 2));
} else {
  const n = (x, d = 2) => x.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d });
  console.log(`SGRC: estimación SCI (utilización de CPU: ${u * 100} %, R = ${USO.citasAnio} citas/año)\n`);
  console.log('| Componente | Energía (kWh/año) | Operativo (kgCO2e) | Incorporado (kgCO2e) | Total (kgCO2e) | % |');
  console.log('|---|---|---|---|---|---|');
  for (const f of filas) {
    const t = f.operKg + f.incorpKg;
    console.log(`| ${f.componente} | ${n(f.kWh)} | ${n(f.operKg)} | ${n(f.incorpKg)} | ${n(t)} | ${n((t / totalKg) * 100, 1)} % |`);
  }
  console.log(`| **Total** | **${n(total.kWh)}** | **${n(total.operKg)}** | **${n(total.incorpKg)}** | **${n(totalKg)}** | 100 % |`);
  console.log(`\nSCI ≈ ${n(sciG)} gCO2e por cita gestionada`);
  console.log(`Carga completa del CRM: ${n(kbCompleta, 1)} KB (propio ${USO.crmKB.propio}, accesibilidad ${USO.crmKB.accesibilidad}, fuentes ${n(USO.crmKB.fuentes, 1)})`);
}
