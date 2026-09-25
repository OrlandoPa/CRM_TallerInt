# CRM Dental — Gestión de Citas

Panel web para el personal de una clínica odontológica: agenda, calendario, control de asistencia, tratamientos o recetas y acceso a las conversaciones de WhatsApp. Funciona junto a un asistente de WhatsApp construido en n8n que agenda, reprograma y cancela citas automáticamente.

## Stack

| Capa | Tecnología |
|------|------------|
| Front | React 19 + Vite 8, desplegado en Vercel |
| Datos y autenticación | Supabase (PostgreSQL, Auth con Google, RLS) |
| Calendario | Google Calendar API v3 (desde el navegador, con el token de Google del usuario) |
| Automatización | n8n (agentes con Gemini, recordatorios por Gmail) |
| Mensajería | Chatwoot + WhatsApp Cloud API |

## Requisitos

- Node.js 20+
- Proyecto de Supabase con el proveedor **Google** activo en Authentication, y el dominio de la app en *URL Configuration*
- Cliente OAuth de Google con el dominio de la app autorizado y el callback de Supabase como redirect URI
- Tablas `pacientes`, `citas` y `mensajes_whatsapp`, con las migraciones de `supabase/migrations/` aplicadas en orden

## Variables de entorno

Crea un archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_CLIENT_ID=
VITE_CALENDAR_ID=
VITE_ALLOWED_EMAIL=
VITE_REQUIRED_GCAL_GMAIL=
VITE_CHATWOOT_ACCOUNT_ID=
VITE_CHATWOOT_BASE_URL=
```

> Todas las variables `VITE_*` se incluyen en el bundle público. **Nunca** pongas en ellas tokens ni claves privadas.

Sin `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` la aplicación no permite ingresar: no existe un modo con datos simulados.

## Scripts

```bash
npm install        # dependencias
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm test           # pruebas unitarias (Vitest)
npm run lint       # ESLint
```

## Funcionamiento

- **Login:** Google vía Supabase Auth (flujo PKCE). El mismo login entrega el permiso de Google Calendar, que dura cerca de una hora; cuando vence, la app muestra un aviso para reconectar.
- **Citas:** crear, reprogramar y cancelar pasa primero por Google Calendar y luego se registra en Supabase. Si falla el registro de una cita nueva, el evento se revierte.
- **Estados de cita:** `AGENDADA`, `REPROGRAMADA`, `CONFIRMADA`, `ASISTIO`, `NO_ASISTIO`, `CANCELADA` (validados por la base de datos).
- **Pacientes:** el identificador es el teléfono en formato E.164 (`+51987654321`) o el usuario de WhatsApp; la base lo normaliza automáticamente.

## Seguridad

- El acceso requiere iniciar sesión con Google mediante Supabase Auth.
- La base de datos aplica Row Level Security: solo los usuarios autenticados cuyo correo está en `public.usuarios_autorizados` pueden leer o modificar pacientes y citas. El rol anónimo no tiene acceso y no se permiten borrados.
- Las migraciones SQL están en `supabase/migrations/` y se ejecutan en el SQL Editor de Supabase.
