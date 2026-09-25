# CRM Dental — Gestión de Citas

Panel web para el personal de una clínica odontológica: agenda, calendario, control de asistencia, tratamientos/recetas y acceso a las conversaciones de WhatsApp. Funciona junto a un asistente de WhatsApp construido en n8n que agenda, reprograma y cancela citas automáticamente.

## Stack

| Capa | Tecnología |
|------|------------|
| Front | React 19 + Vite 8, desplegado en Vercel |
| Datos y autenticación | Supabase (PostgreSQL, Auth con Google, RLS) |
| Calendario | Google Calendar API v3 |
| Automatización | n8n (agentes con Gemini, recordatorios por Gmail) |
| Mensajería | Chatwoot + WhatsApp Cloud API |

## Requisitos

- Node.js 20+
- Proyecto de Supabase con el proveedor **Google** activo en Authentication (con el scope de Calendar)
- Cliente OAuth de Google con el dominio de la app autorizado

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

## Scripts

```bash
npm install        # dependencias
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm test           # pruebas unitarias (Vitest)
npm run lint       # ESLint
```

## Seguridad

- El acceso requiere iniciar sesión con Google mediante Supabase Auth.
- La base de datos aplica Row Level Security: solo los usuarios autenticados cuyo correo está en `public.usuarios_autorizados` pueden leer o modificar pacientes y citas. El rol anónimo no tiene acceso.
- Las migraciones SQL están en `supabase/migrations/` y se ejecutan en el SQL Editor de Supabase.
