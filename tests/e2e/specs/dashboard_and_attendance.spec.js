import { pause, By, until } from '../helpers/driverFactory.js';

export async function runDashboardAttendanceTests(driver) {
  console.log('\n--- 🧪 EJECUTANDO PRUEBAS E2E (VISUAL - SESIÓN CONTINUA): DASHBOARD Y ASISTENCIA ---');
  let passed = 0;
  let failed = 0;

  try {
    // Ir a pestaña de Dashboard
    const dashTab = await driver.findElement(By.css('[data-testid="tab-dashboard"]'));
    await dashTab.click();
    await pause(driver, 1500);

    // Test 1: Verificar tarjetas métricas del Dashboard
    console.log(' ▶ [CP-E2E-05] Validando renderizado del panel de métricas en Dashboard...');
    const dashboardView = await driver.wait(until.elementLocated(By.css('[data-testid="view-dashboard"]')), 8000);
    const metricCard = await driver.findElement(By.css('[data-testid="metric-patients"]'));
    const isDisplayed = await metricCard.isDisplayed();

    if (dashboardView && isDisplayed) {
      const metricText = await metricCard.getText();
      console.log(`   ✅ CP-E2E-05 PASÓ: Tarjeta métrica 'Pacientes Registrados' visible ('${metricText.replace(/\n/g, ' - ')}').`);
      passed++;
    } else {
      console.error('   ❌ CP-E2E-05 FALLÓ: No se renderizó la tarjeta métrica.');
      failed++;
    }
    await pause(driver, 1500);

    // Test 2: Navegar a vista de Asistencia y verificar contenedor
    console.log(' ▶ [CP-E2E-06] Validando vista de Tomar Asistencia...');
    const attendanceTab = await driver.findElement(By.css('[data-testid="tab-attendance"]'));
    await attendanceTab.click();
    await pause(driver, 1500);

    const attendanceView = await driver.wait(until.elementLocated(By.css('[data-testid="view-attendance"]')), 5000);
    const isAttendanceVisible = await attendanceView.isDisplayed();

    if (isAttendanceVisible) {
      console.log('   ✅ CP-E2E-06 PASÓ: Vista de Tomar Asistencia renderizada correctamente.');
      passed++;
    } else {
      console.error('   ❌ CP-E2E-06 FALLÓ: La vista de asistencia no se visualiza.');
      failed++;
    }
    await pause(driver, 1500);

  } catch (error) {
    console.error(' ❌ Error crítico durante ejecución de pruebas de Dashboard y Asistencia:', error.message);
    failed++;
  }

  return { passed, failed };
}
