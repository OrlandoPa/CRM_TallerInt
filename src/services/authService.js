import { supabase } from './api';

// Clave de la sesión simulada antigua (ya no se usa, solo se limpia)
const LEGACY_SESSION_KEY = 'crm_user_session';
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/**
 * Obtiene el correo electrónico autorizado para acceder al sistema.
 * Nota: este chequeo es solo de UX. La autorización real la aplica la RLS de
 * Supabase contra la tabla public.usuarios_autorizados.
 */
export const getAllowedEmail = () => {
  const envAllowed = import.meta.env.VITE_ALLOWED_EMAIL || import.meta.env.VITE_REQUIRED_GCAL_GMAIL || 'automatizadon8n@gmail.com';
  return envAllowed.trim().toLowerCase();
};

/**
 * Verifica si un correo está en la lista de correo permitido.
 * @param {string} email
 * @returns {boolean}
 */
export const isEmailAuthorized = (email) => {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase() === getAllowedEmail();
};

/**
 * Guarda el token de Google Calendar que devuelve Supabase tras el login con Google.
 * Supabase no refresca este token: dura ~1 hora y luego se reconecta desde la app.
 * @param {Object} session - Sesión de Supabase Auth
 */
export const storeGCalTokenFromSession = (session) => {
  if (!session?.provider_token) return;
  localStorage.setItem('gcal_access_token', session.provider_token);
  localStorage.setItem('gcal_token_expiry', (Date.now() + 55 * 60 * 1000).toString());
  if (session.user?.email) {
    localStorage.setItem('gcal_user_email', session.user.email);
  }
};

/**
 * Convierte una sesión de Supabase Auth en el usuario de la app.
 * @param {Object|null} session
 * @returns {{ success: boolean, user?: Object, error?: string }}
 */
export const userFromSession = (session) => {
  const email = session?.user?.email;
  if (!email) {
    return { success: false, error: 'No hay una sesión válida de Google.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!isEmailAuthorized(normalizedEmail)) {
    return {
      success: false,
      error: `Acceso denegado: El correo (${normalizedEmail}) no está autorizado. Únicamente la cuenta (${getAllowedEmail()}) tiene acceso al sistema.`
    };
  }

  const meta = session.user.user_metadata || {};
  return {
    success: true,
    user: {
      email: normalizedEmail,
      name: meta.full_name || meta.name || normalizedEmail.split('@')[0],
      picture: meta.avatar_url || meta.picture || null,
      loginAt: session.user.last_sign_in_at || new Date().toISOString()
    }
  };
};

/**
 * Obtiene la sesión activa de Supabase Auth (si existe).
 * @returns {Promise<Object|null>}
 */
export const getSession = async () => {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error al recuperar la sesión de Supabase:', error);
    return null;
  }
  return data.session;
};

/**
 * Inicia sesión con Google mediante Supabase Auth (redirección OAuth).
 * Solicita también el permiso de Google Calendar para obtener el provider_token.
 */
export const signInWithGoogle = async () => {
  if (!supabase) {
    throw new Error('Supabase no está configurado (revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).');
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname + window.location.search,
      scopes: GCAL_SCOPE,
      queryParams: { login_hint: getAllowedEmail() }
    }
  });
  if (error) throw error;
};

/**
 * Cierra la sesión activa y elimina datos de persistencia.
 */
export const logout = async () => {
  try {
    localStorage.removeItem(LEGACY_SESSION_KEY);
    localStorage.removeItem('gcal_access_token');
    localStorage.removeItem('gcal_token_expiry');
    localStorage.removeItem('gcal_user_email');
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
  }
};
