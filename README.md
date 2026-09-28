# CRM Dental — Gestión de Citas

Panel web para el personal de una clínica odontológica: agenda, calendario, control de asistencia, pacientes, tratamientos o recetas y acceso a las conversaciones de WhatsApp. Funciona junto a un asistente de WhatsApp construido en n8n que agenda, reprograma y cancela citas automáticamente.

## Stack

| Capa | Tecnología |
|------|------------|
| Front | React 19 + Vite 8, desplegado en Vercel |
| Datos y autenticación | Supabase (PostgreSQL, Auth con Google, RLS por rol) |
| Calendario | Google Calendar API v3, llamada solo desde la Edge Function `agenda` de Supabase |
| Automatización | n8n (agentes con Gemini, recordatorios por Gmail) |
| Mensajería | Chatwoot + WhatsApp Cloud API |
| CI | GitHub Actions (lint, pruebas y build); Vercel espera el check antes de publicar |

## Requisitos

- Node.js 20+
- Proyecto de Supabase con el proveedor **Google** activo en Authentication, y el dominio de la app en *URL Configuration*
- Cliente OAuth de Google para el login (callback de Supabase como redirect URI)
- Tablas `pacientes`, `citas` y `mensajes_whatsapp`, con las migraciones SQL aplicadas en orden
- Edge Function `agenda` desplegada (`supabase/functions/agenda`) con sus secretos (ver abajo)

## Variables de entorno (front)

Crea un archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CHATWOOT_ACCOUNT_ID=
VITE_CHATWOOT_BASE_URL=
```

> Todas las variables `VITE_*` se incluyen en el bundle público. **Nunca** pongas en ellas tokens ni claves privadas.

Sin `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` la aplicación no permite ingresar: no existe un modo con datos simulados.

## Edge Function `agenda`

Única puerta del CRM hacia Google Calendar. Usa el refresh token de la cuenta de Google de la clínica, así que el personal no necesita dar permisos de Calendar ni reconectar.

```bash
npx supabase functions deploy agenda --project-ref TU_PROJECT_REF
```

Secretos (Supabase → *Edge Functions → Secrets*):

| Secreto | Valor |
|---------|-------|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Cliente OAuth "aplicación web" usado para obtener el refresh token |
| `GOOGLE_REFRESH_TOKEN` | Refresh token con el alcance `calendar.events`, obtenido con la cuenta dueña del calendario |
| `GOOGLE_CALENDAR_ID` | Correo del calendario de la clínica |
| `CRM_ORIGINS` | Orígenes permitidos por CORS, separados por coma (p. ej. `https://crm.ejemplo.pe,http://localhost:5173`) |

La pantalla de consentimiento de OAuth debe estar **En producción**: en modo *Prueba*, Google caduca el refresh token a los 7 días.

## Scripts

```bash
npm install        # dependencias
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm test           # pruebas unitarias (Vitest)
npm run lint       # ESLint
```

## Funcionamiento

- **Login:** Google vía Supabase Auth (flujo PKCE). El rol del usuario (`doctor` o `recepcion`) sale de `public.usuarios_autorizados`.
- **Citas:** crear, reprogramar y cancelar pasa por la Edge Function: primero se registra en la base de datos (que reserva el horario) y luego en Google Calendar; si Google falla, se revierte el cambio en la base.
- **Choques de horario:** la base de datos rechaza dos citas activas que se solapan, vengan del CRM o del bot.
- **Agenda configurable:** el doctor mantiene el catálogo de servicios (con su duración), el horario de atención, los feriados y los bloqueos de agenda desde **Administración**. Los bloqueos aparecen también como eventos "Bloqueado" en Google Calendar.
- **Estados de cita:** `AGENDADA`, `REPROGRAMADA`, `CONFIRMADA`, `ASISTIO`, `NO_ASISTIO`, `CANCELADA` (validados por la base de datos).
- **Pacientes:** el identificador es el teléfono en formato E.164 (`+51987654321`) o el usuario de WhatsApp; la base lo normaliza automáticamente. El módulo Pacientes permite buscarlos y ver su historial.

## Seguridad

- El acceso requiere iniciar sesión con Google mediante Supabase Auth y que el doctor haya registrado el correo (Administración → Usuarios).
- Row Level Security por rol: el **doctor** accede a todo; **recepción** gestiona agenda, pacientes y asistencia, pero no ve tratamientos, auditoría ni usuarios y no modifica la configuración. El rol anónimo no tiene acceso y no se borran citas (se cancelan por estado).
- Los cambios en citas, pacientes, tratamientos, usuarios y configuración quedan en la tabla `auditoria`.
- Las migraciones SQL se ejecutan en el SQL Editor de Supabase.
