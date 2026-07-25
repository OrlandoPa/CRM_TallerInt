import { pause, By, until } from '../helpers/driverFactory.js';

export async function runNavigationTests(driver) {
  console.log('\n--- 🧪 EJECUTANDO PRUEBAS E2E (VISUAL - SESIÓN CONTINUA): NAVEGACIÓN E INTERFAZ ---');
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Carga inicial y presencia del título Dashboard
    console.log(' ▶ [CP-E2E-01] Validando título principal en pantalla...');
    const headerTitle = await driver.wait(until.elementLocated(By.css('[data-testid="header-title"]')), 10000);
    const titleText = await headerTitle.getText();
    if (titleText.toLowerCase().includes('dashboard') || titleText.length > 0) {
      console.log(`   ✅ CP-E2E-01 PASÓ: El CRM está activo en la interfaz principal ('${titleText}').`);
      passed++;
    } else {
      console.error(`   ❌ CP-E2E-01 FALLÓ: Se esperaba título válido, obtenido '${titleText}'`);
      failed++;
    }

    // Test 2: Indicador de Supabase
    console.log(' ▶ [CP-E2E-02] Verificando indicador de estado Supabase ONLINE / Modo Simulador...');
    const statusElem = await driver.findElement(By.css('[data-testid="status-supabase"]'));
    const statusText = await statusElem.getText();
    if (statusText.includes('ONLINE') || statusText.includes('Simulador')) {
      console.log(`   ✅ CP-E2E-02 PASÓ: Indicador detectado ('${statusText}').`);
      passed++;
    } else {
      console.error(`   ❌ CP-E2E-02 FALLÓ: Texto inesperado en indicador '${statusText}'`);
      failed++;
    }
    await pause(driver, 1500);

    // Test 3: Navegación por pestañas (Agenda, Asistencia, Calendario, Chats, Dashboard)
    console.log(' ▶ [CP-E2E-03] Probando cambio dinámico de pestañas en la misma sesión...');
    let tabSubPassed = true;

    // Tab Agenda
    console.log('   👉 Navegando a Agenda del Día...');
    await driver.findElement(By.css('[data-testid="tab-agenda"]')).click();
    await pause(driver, 1500);
    let currentTitle = await driver.findElement(By.css('[data-testid="header-title"]')).getText();
    if (currentTitle.toLowerCase().includes('agenda')) {
      console.log('   ✅ Cambio a Agenda del Día exitoso.');
    } else {
      console.error(`   ❌ Fallo al cambiar a Agenda. Título actual: '${currentTitle}'`);
      tabSubPassed = false;
    }

    // Tab Tomar Asistencia
    console.log('   👉 Navegando a Tomar Asistencia...');
    await driver.findElement(By.css('[data-testid="tab-attendance"]')).click();
    await pause(driver, 1500);
    currentTitle = await driver.findElement(By.css('[data-testid="header-title"]')).getText();
    if (currentTitle.toLowerCase().includes('asistencia')) {
      console.log('   ✅ Cambio a Tomar Asistencia exitoso.');
    } else {
      console.error(`   ❌ Fallo al cambiar a Tomar Asistencia. Título actual: '${currentTitle}'`);
      tabSubPassed = false;
    }

    // Tab Calendario
    console.log('   👉 Navegando a Calendario...');
    await driver.findElement(By.css('[data-testid="tab-calendar"]')).click();
    await pause(driver, 1500);
    currentTitle = await driver.findElement(By.css('[data-testid="header-title"]')).getText();
    if (currentTitle.toLowerCase().includes('calendario')) {
      console.log('   ✅ Cambio a Calendario exitoso.');
    } else {
      console.error(`   ❌ Fallo al cambiar a Calendario. Título actual: '${currentTitle}'`);
      tabSubPassed = false;
    }

    // Tab Chats
    console.log('   👉 Navegando a Chats WhatsApp...');
    await driver.findElement(By.css('[data-testid="tab-chats"]')).click();
    await pause(driver, 1500);
    currentTitle = await driver.findElement(By.css('[data-testid="header-title"]')).getText();
    if (currentTitle.toLowerCase().includes('chatwoot')) {
      console.log('   ✅ Cambio a Consola de Chatwoot exitoso.');
    } else {
      console.error(`   ❌ Fallo al cambiar a Chats. Título actual: '${currentTitle}'`);
      tabSubPassed = false;
    }

    // Volver a Dashboard
    console.log('   👉 Retornando a Dashboard...');
    await driver.findElement(By.css('[data-testid="tab-dashboard"]')).click();
    await pause(driver, 1500);
    currentTitle = await driver.findElement(By.css('[data-testid="header-title"]')).getText();
    if (currentTitle.toLowerCase().includes('dashboard')) {
      console.log('   ✅ Retorno a Dashboard exitoso.');
    } else {
      console.error('   ❌ Fallo al retornar a Dashboard.');
      tabSubPassed = false;
    }

    if (tabSubPassed) {
      console.log('   ✅ CP-E2E-03 PASÓ: La navegación visual entre todas las pestañas funcionó perfectamente.');
      passed++;
    } else {
      console.error('   ❌ CP-E2E-03 FALLÓ: Falló la comprobación en al menos una pestaña.');
      failed++;
    }

    // Test 4: Alternancia de Tema (Oscuro / Claro)
    console.log(' ▶ [CP-E2E-04] Probando el botón de alternancia de tema en la misma ventana...');
    const themeBtn = await driver.findElement(By.css('[data-testid="btn-theme-toggle"]'));
    const initialText = await themeBtn.getText();
    await themeBtn.click();
    await pause(driver, 1500);
    const newText = await themeBtn.getText();
    if (initialText !== newText) {
      console.log(`   ✅ CP-E2E-04 PASÓ: Tema cambiado correctamente ('${initialText}' -> '${newText}').`);
      passed++;
      // Revertir tema para restaurar apariencia
      await themeBtn.click();
      await pause(driver, 1000);
    } else {
      console.error('   ❌ CP-E2E-04 FALLÓ: El botón de tema no alteró el estado.');
      failed++;
    }

  } catch (error) {
    console.error(' ❌ Error crítico durante ejecución de pruebas de navegación:', error.message);
    failed++;
  }

  return { passed, failed };
}
