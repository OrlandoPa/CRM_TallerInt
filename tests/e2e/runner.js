import http from 'http';
import { spawn } from 'child_process';
import { createDriver } from './helpers/driverFactory.js';
import { runNavigationTests } from './specs/navigation.spec.js';
import { runDashboardAttendanceTests } from './specs/dashboard_and_attendance.spec.js';
import { runAppointmentFlowTests } from './specs/appointment_flow.spec.js';
import { runGoogleLoginAndAppointmentTests } from './specs/google_login_and_appointment.spec.js';

const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Checks if the Vite server is running on localhost:5173
 */
function isServerRunning(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

/**
 * Main E2E Test Suite Runner - Single Continuous Browser Window Session
 */
async function main() {
  console.log('====================================================');
  console.log('  🚀 SUITE DE PRUEBAS END-TO-END CON SELENIUM WEBDRIVER');
  console.log('  Proyecto: CRM Dental Frontend (React + Vite)');
  console.log('  Modo: Sesión Única de Navegador en Tiempo Real');
  console.log('====================================================\n');

  let viteProcess = null;
  const running = await isServerRunning(BASE_URL);

  if (!running) {
    console.log(`ℹ️ Servidor Vite no detectado en ${BASE_URL}. Iniciando servidor en segundo plano...`);
    viteProcess = spawn('npx', ['vite', '--port', String(PORT)], {
      shell: true,
      stdio: 'pipe'
    });

    // Esperar a que el servidor levante
    let ready = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      ready = await isServerRunning(BASE_URL);
      if (ready) break;
    }

    if (!ready) {
      console.error('❌ Error: No se pudo iniciar el servidor de desarrollo Vite.');
      if (viteProcess) viteProcess.kill();
      process.exit(1);
    }
    console.log(`✅ Servidor Vite activo en ${BASE_URL}.\n`);
  } else {
    console.log(`✅ Servidor Vite ya se encuentra ejecutándose en ${BASE_URL}.\n`);
  }

  const startTime = Date.now();
  let totalPassed = 0;
  let totalFailed = 0;
  let driver = null;

  try {
    console.log(' 🌐 Abriendo navegador Chrome para toda la suite de pruebas...');
    driver = await createDriver({ headless: false });

    // 1. Pruebas de Login Google y Agendamiento de Cita Completo (Establece sesión GCal)
    const gcalResult = await runGoogleLoginAndAppointmentTests(driver, BASE_URL);
    totalPassed += gcalResult.passed;
    totalFailed += gcalResult.failed;

    // 2. Pruebas de Dashboard y Asistencia (en la misma ventana activa con login GCal y cita agregada)
    const dashResult = await runDashboardAttendanceTests(driver);
    totalPassed += dashResult.passed;
    totalFailed += dashResult.failed;

    // 3. Pruebas de Agenda del Día (en la misma ventana activa)
    const agendaResult = await runAppointmentFlowTests(driver);
    totalPassed += agendaResult.passed;
    totalFailed += agendaResult.failed;

    // 4. Pruebas de Navegación, Interfaz y Tema (en la misma ventana activa)
    const navResult = await runNavigationTests(driver);
    totalPassed += navResult.passed;
    totalFailed += navResult.failed;

  } catch (err) {
    console.error('❌ Ocurrió una excepción imprevista durante la ejecución:', err);
    totalFailed++;
  } finally {
    if (driver) {
      console.log('\n 🛑 Finalizando suite y cerrando sesión del navegador Chrome...');
      await driver.quit();
    }
    if (viteProcess) {
      console.log(' 🛑 Apagando el servidor de desarrollo Vite temporal...');
      viteProcess.kill();
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const total = totalPassed + totalFailed;

  console.log('\n====================================================');
  console.log('   📊 RESUMEN DE RESULTADOS DE PRUEBAS E2E');
  console.log('====================================================');
  console.log(` ⏱️ Tiempo total de ejecución: ${duration}s`);
  console.log(` 🧪 Total de Casos Evaluados:  ${total}`);
  console.log(` ✅ Casos Exitosos (Passed):    ${totalPassed}`);
  console.log(` ❌ Casos Fallidos (Failed):    ${totalFailed}`);
  console.log('====================================================\n');

  if (totalFailed > 0) {
    console.error('❌ La suite E2E ha finalizado con fallos.');
    process.exit(1);
  } else {
    console.log('🎉 ¡TODAS LAS PRUEBAS E2E CON SELENIUM PASARON EXITOSAMENTE EN UNA UNICA SESION!');
    process.exit(0);
  }
}

main();
