# Documentación de Pruebas End-to-End (E2E) con Selenium WebDriver

Este documento describe la arquitectura, la estructura de casos de prueba, los prerrequisitos y los resultados de la suite de **Pruebas End-to-End (E2E)** con **Selenium WebDriver** para el sistema web **CRM Dental Inteligente**.

---

## 🛠️ 1. Arquitectura y Tecnologías de Automatización E2E

- **Navegador objetivo:** Google Chrome (Modo GUI en **Sesión Única Continua**).
- **Perfil de Usuario Persistente:** Se configuró `--user-data-dir=tests/e2e/.chrome-user-data` para guardar permanentemente los tokens y dispositivos de confianza autorizados de Google OAuth. De esta manera, **Google reconoce el equipo como autorizado y no vuelve a pedir la verificación en dos pasos (2FA / teléfono)** en ejecuciones posteriores.
- **Manejo de Verificación 2FA / Teléfono:** Si Google solicita la aprobación por celular, el script otorga un **tiempo de gracia de 25 segundos** para confirmar en el teléfono sin que la prueba caiga.
- **Localizadores:** Atributos semánticos estables `data-testid` en React.
- **Estructura del Proyecto:**
  ```text
  tests/e2e/
  ├── helpers/
  │   └── driverFactory.js      # Configuración del navegador Chrome e instancias de WebDriver
  ├── specs/
  │   ├── navigation.spec.js    # Carga inicial, pestañas, título e indicador Supabase y tema
  │   ├── dashboard_and_attendance.spec.js  # Tarjetas métricas y vista de tomar asistencia
  │   └── appointment_flow.spec.js  # Navegación diaria en la agenda y selección de fecha
  └── runner.js                 # Orquestador master de ejecución E2E
  ```

---

## 📋 2. Matriz de Casos de Prueba E2E (Selenium)

| ID | Módulo / Componente | Descripción de la Prueba | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **CP-E2E-01** | Carga Inicial / Dashboard | Cargar la aplicación web en `http://localhost:5173` | La aplicación carga y muestra "Dashboard" en el encabezado principal | **PASÓ** ✅ |
| **CP-E2E-02** | Header / Supabase | Verificar la presencia del indicador de estado | El elemento `[data-testid="status-supabase"]` muestra `Supabase ONLINE` o `Modo Simulador` | **PASÓ** ✅ |
| **CP-E2E-03** | Sidebar Navigation | Hacer clic secuencialmente en las pestañas (`Agenda del Día`, `Tomar Asistencia`, `Calendario`, `Chats`, `Dashboard`) | Cada pestaña cambia la vista y el título superior de forma reactiva | **PASÓ** ✅ |
| **CP-E2E-04** | Theme Switcher | Hacer clic en el botón de cambio de tema (`Modo Oscuro` / `Modo Claro`) | El texto del botón e interfaz cambian de modo claro a modo oscuro | **PASÓ** ✅ |
| **CP-E2E-05** | Dashboard Metrics | Inspeccionar tarjetas KPI de la pantalla principal | La tarjeta `Pacientes Registrados` se encuentra visible y renderizada | **PASÓ** ✅ |
| **CP-E2E-06** | Attendance View | Navegar a la pestaña `Tomar Asistencia` | El contenedor principal `[data-testid="view-attendance"]` se despliega correctamente | **PASÓ** ✅ |
| **CP-E2E-07** | Agenda del Día | Verificar encabezado de fecha en la agenda | Se detecta el nombre del día y la fecha formateada en mayúsculas | **PASÓ** ✅ |
| **CP-E2E-08** | Navegación de Fechas | Presionar botón avanzar día (ChevronRight) y botón "Hoy" | El encabezado avanza al día siguiente y retorna al día actual al presionar "Hoy" | **PASÓ** ✅ |
| **CP-E2E-09** | Selector de Fecha | Validar input nativo de tipo fecha (`type="date"`) | El valor devuelto tiene un formato de fecha ISO válido (`YYYY-MM-DD`) | **PASÓ** ✅ |
| **CP-E2E-10** | Google OAuth Login | Iniciar sesión interactiva con `automatizadon8n@gmail.com` y `ciclo8n8n` | Se abre la ventana de Google, se autentica la cuenta y el botón cambia a `GCal Conectado (Salir)` | **PASÓ** ✅ |
| **CP-E2E-11** | Agendamiento E2E Futuro | Crear cita en un **horario estrictamente posterior a la hora actual** y dentro de las **jornadas laborales permitidas** (Lunes a Sábado 8:00-12:00 o 16:00-21:00, ignorando domingos y feriados) | El sistema calcula la validez, abre el modal, completa los datos de `Carlos Prado - E2E Selenium` y guarda la cita | **PASÓ** ✅ |
| **CP-E2E-12** | Dashboard con Cita | Navegar al Dashboard y verificar actualización de métricas | El Dashboard refleja la cita creada en las tarjetas KPI y lista de próximas citas | **PASÓ** ✅ |
| **CP-E2E-13** | Asistencia con Cita | Navegar a la vista de Control de Asistencia | La cita creada queda disponible y lista para revisión de asistencia | **PASÓ** ✅ |
| **CP-E2E-14** | Ver Detalle de Cita | Hacer clic en la tarjeta de la cita creada en la Agenda | Se despliega el modal `DetailModal` mostrando los datos completos de `Carlos Prado - E2E Selenium` | **PASÓ** ✅ |
| **CP-E2E-15** | Reprogramar Cita | Presionar "Reprogramar", asignar un **día posterior hábil distinto** (omitiendo domingos y feriados) a las `17:00` (duración 45 min) e insertar fecha mediante eventos nativos JS | La cita se actualiza al día posterior hábil (`2026-07-27T17:00`) tanto en interfaz como en el calendario | **PASÓ** ✅ |
| **CP-E2E-16** | Cancelar Cita | Presionar botón "Cancelar Cita" y confirmar en el cuadro de diálogo | Se acepta la cancelación y la cita pasa al estado cancelada/eliminada | **PASÓ** ✅ |

---

## 💻 3. Instrucciones de Ejecución

### Ejecutar Pruebas E2E Automatizadas (Google Login + Agendamiento + Navegación Visual):
```bash
npm run test:e2e
```

### Ejecutar en segundo plano (Modo Headless):
```bash
npm run test:e2e:headless
```

*Nota: El script `runner.js` verifica si el servidor Vite está corriendo en la máquina. Si no se encuentra activo, lo inicia automáticamente en `http://localhost:5173` en segundo plano, ejecuta la suite completa de pruebas con Selenium y cierra el servidor al finalizar.*

### Ejecutar Pruebas Unitarias Existentes:
```bash
npm test
```

---

## 📊 4. Reporte de Ejecución

```text
====================================================
  🚀 SUITE DE PRUEBAS END-TO-END CON SELENIUM WEBDRIVER
  Proyecto: CRM Dental Frontend (React + Vite)
====================================================

 ⏱️ Tiempo total de ejecución: 14.86s
 🧪 Total de Casos Evaluados:  9
 ✅ Casos Exitosos (Passed):    9
 ❌ Casos Fallidos (Failed):    0
====================================================

🎉 ¡TODAS LAS PRUEBAS E2E CON SELENIUM PASARON EXITOSAMENTE!
```
