import { pause, By, until } from '../helpers/driverFactory.js';

export async function runAppointmentFlowTests(driver) {
  console.log('\n--- 🧪 EJECUTANDO PRUEBAS E2E (VISUAL - SESIÓN CONTINUA): NAVEGACIÓN Y AGENDA DEL DÍA ---');
  let passed = 0;
  let failed = 0;

  try {
    // Ir a pestaña de Agenda del Día
    console.log(' ▶ Navegando a la vista Agenda del Día...');
    const agendaTab = await driver.wait(until.elementLocated(By.css('[data-testid="tab-agenda"]')), 8000);
    await agendaTab.click();
    await pause(driver, 1500);

    // Test 1: Verificar encabezado de fecha en la agenda
    console.log(' ▶ [CP-E2E-07] Comprobando título y fecha activa de la Agenda del Día...');
    const headingElem = await driver.wait(until.elementLocated(By.css('[data-testid="agenda-date-heading"]')), 5000);
    
    await driver.wait(async () => {
      const txt = await headingElem.getText();
      return txt && txt.trim().length > 0;
    }, 5000);

    const initialDateText = (await headingElem.getText()).trim();
    
    if (initialDateText && initialDateText.length > 0) {
      console.log(`   ✅ CP-E2E-07 PASÓ: Fecha detectada en encabezado ('${initialDateText}').`);
      passed++;
    } else {
      console.error('   ❌ CP-E2E-07 FALLÓ: Encabezado de fecha vacío.');
      failed++;
    }
    await pause(driver, 1500);

    // Test 2: Navegación de día Siguiente (ChevronRight) y botón Hoy
    console.log(' ▶ [CP-E2E-08] Probando navegación de día Siguiente y botón "Hoy"...');
    console.log('   👉 Haciendo clic en día siguiente...');
    const nextBtn = await driver.findElement(By.css('[data-testid="btn-next-day"]'));
    await nextBtn.click();
    
    await driver.wait(async () => {
      const txt = await headingElem.getText();
      return txt && txt.trim() !== initialDateText;
    }, 5000);

    const nextDateText = (await headingElem.getText()).trim();

    if (nextDateText !== initialDateText) {
      console.log(`   ✅ Cambio de día exitoso ('${initialDateText}' -> '${nextDateText}').`);
    } else {
      console.error('   ❌ Fallo al avanzar de día.');
    }
    await pause(driver, 1500);

    // Probar botón "Hoy"
    console.log('   👉 Haciendo clic en botón "Hoy"...');
    const todayBtn = await driver.findElement(By.css('[data-testid="btn-today"]'));
    await todayBtn.click();

    await driver.wait(async () => {
      const txt = await headingElem.getText();
      return txt && txt.trim() === initialDateText;
    }, 5000);

    const todayDateText = (await headingElem.getText()).trim();

    if (todayDateText === initialDateText) {
      console.log('   ✅ Botón "Hoy" retornó exitosamente al día actual.');
      passed++;
    } else {
      console.error(`   ❌ Fallo con botón "Hoy". Esperado '${initialDateText}', obtenido '${todayDateText}'`);
      failed++;
    }
    await pause(driver, 1500);

    // Test 3: Selector de fecha de tipo date
    console.log(' ▶ [CP-E2E-09] Comprobando input nativo de selección de fecha...');
    const dateInput = await driver.findElement(By.css('[data-testid="input-agenda-date"]'));
    const dateValue = await dateInput.getAttribute('value');
    if (dateValue && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.log(`   ✅ CP-E2E-09 PASÓ: Input de fecha activo con formato válido ('${dateValue}').`);
      passed++;
    } else {
      console.error(`   ❌ CP-E2E-09 FALLÓ: Valor de fecha inválido '${dateValue}'`);
      failed++;
    }
    await pause(driver, 1500);

  } catch (error) {
    console.error(' ❌ Error crítico durante ejecución de pruebas de Agenda del Día:', error.message);
    failed++;
  }

  return { passed, failed };
}
