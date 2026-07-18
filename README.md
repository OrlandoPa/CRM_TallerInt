# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

## Guía de Despliegue en Vercel

Este proyecto está construido con **React** y **Vite**. A continuación se detallan las instrucciones para desplegar la aplicación en [Vercel](https://vercel.com).

### Requisitos Previos

Asegúrate de tener a la mano las variables de entorno necesarias para el correcto funcionamiento del proyecto.

### Opción 1: Despliegue desde GitHub (Recomendado)

Esta es la forma más rápida y recomendada de desplegar el proyecto, ya que habilita despliegues automáticos (CI/CD) cada vez que subes cambios a la rama principal en tu repositorio remoto.

1. **Crear una cuenta en Vercel**: Ve a [vercel.com](https://vercel.com) e inicia sesión o regístrate asociando tu cuenta de GitHub.
2. **Importar el Repositorio**:
   - En el panel de control (Dashboard) de Vercel, haz clic en el botón **"Add New..."** y selecciona **"Project"**.
   - Busca e importa el repositorio de este proyecto (`FrontTallerInt`).
3. **Configurar el Proyecto**:
   - **Framework Preset**: Vercel detectará de manera automática que estás usando **Vite**.
   - **Root Directory**: Deja el valor por defecto `./`.
   - **Build and Development Settings**: Puedes dejarlos por defecto, ya que Vite compila con `npm run build` y genera la salida en el directorio `dist`.
4. **Configurar Variables de Entorno**:
   Despliega la sección **"Environment Variables"** y añade las siguientes variables con sus respectivos valores (puedes guiarte de tu archivo `.env` local):
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
   * `VITE_GOOGLE_CLIENT_ID`
   * `VITE_CALENDAR_ID`
   * `VITE_CHATWOOT_ACCOUNT_ID`
   * `VITE_CHATWOOT_BASE_URL`
   * `VITE_CHATWOOT_ACCESS_TOKEN`
5. **Desplegar**: Haz clic en el botón **"Deploy"**. Vercel compilará la aplicación y te proporcionará una URL pública de producción.

---

### Opción 2: Despliegue usando Vercel CLI (Línea de Comandos)

Si deseas realizar el despliegue de forma local desde tu terminal:

1. **Instalar el CLI de Vercel globalmente**:
   ```bash
   npm install -g vercel
   ```
2. **Iniciar sesión en Vercel**:
   ```bash
   vercel login
   ```
3. **Inicializar y configurar el proyecto**:
   Ejecuta el siguiente comando en la raíz del proyecto y sigue las instrucciones interactivas:
   ```bash
   vercel
   ```
   * *Set up and deploy ...?* `yes`
   * *Which scope ...?* Tu cuenta o equipo personal.
   * *Link to existing project?* `no`
   * *What's your project's name?* Deja el predeterminado (`fronttallerint`) o asigna uno nuevo.
   * *In which directory is your code located?* `./`
   * *Want to modify settings?* `no` (los preajustes detectados para Vite son correctos).
4. **Agregar las Variables de Entorno en Vercel**:
   Puedes agregarlas desde el panel de control de Vercel en la web, o por consola usando:
   ```bash
   vercel env add NOMBRE_DE_VARIABLE valor
   ```
5. **Despliegue final en producción**:
   Una vez configurado todo y agregadas las variables, ejecuta:
   ```bash
   vercel --prod
   ```

---

### Manejo de Rutas (Single Page Application)

Si utilizas enrutamiento del lado del cliente (por ejemplo, con `react-router-dom`), es necesario configurar un redireccionamiento para evitar que Vercel devuelva un error `404` al recargar páginas internas. Para solucionar esto, crea un archivo `vercel.json` en la raíz del proyecto con la siguiente estructura:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 🧪 Documentación de Pruebas

Para garantizar y certificar el correcto funcionamiento de este frontend y de los flujos de n8n, se han elaborado tres documentos detallados de control de calidad:

1.  **Pruebas de Caja Negra:** [CASOS_DE_PRUEBA.md](file:///c:/Users/lalop/Desktop/FrontTallerInt/CASOS_DE_PRUEBA.md)
    *   Casos de prueba funcionales de cara al usuario final (7 casos para el CRM Web y 12 casos para el bot conversacional y recordatorios automáticos).
2.  **Pruebas Unitarias:** [PRUEBAS_UNITARIAS.md](file:///c:/Users/lalop/Desktop/FrontTallerInt/PRUEBAS_UNITARIAS.md)
    *   Verificación en aislamiento de utilidades de fecha (`dateHelpers.js`), renderizado de componentes y filtros de seguridad en nodos de código de n8n.
3.  **Pruebas de Integración:** [PRUEBAS_INTEGRACION.md](file:///c:/Users/lalop/Desktop/FrontTallerInt/PRUEBAS_INTEGRACION.md)
    *   Validación de la comunicación bidireccional entre el CRM Web, Supabase, Google Calendar, n8n, Chatwoot y Gmail.

