import { supabase, getPerfil } from './api';

// Claves que usaban versiones anteriores (sesión simulada y token de Google
// en el navegador). Ya no se usan: solo se limpian al iniciar o cerrar sesión.
const CLAVES_ANTIGUAS = ['crm_user_session', 'gcal_access_token', 'gcal_token_expiry', 'gcal_user_email'];

export const limpiarDatosAntiguos = () => {
  CLAVES_ANTIGUAS.forEach(k => {
    try {
      localStorage.removeItem(k);
    } catch {
      // almacenamiento no disponible
    }
  });
};

export const ROLES = {
  DOCTOR: 'doctor',
  RECEPCION: 'recepcion'
};

export const ETIQUETAS_ROL = {
  doctor: 'Doctor',
  recepcion: 'Recepción'
};

/**
 * Convierte una sesión de Supabase Auth y el perfil de usuarios_autorizados en
 * el usuario de la app. El acceso real lo decide la RLS; esto es solo UX.
 * @param {Object|null} session
 * @param {{email, nombre, rol}|null} perfil
 * @returns {{ success: boolean, user?: Object, error?: string }}
 */
export const userFromSession = (session, perfil) => {
  const email = session?.user?.email;
  if (!email) {
    return { success: false, error: 'No hay una sesión válida de Google.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!perfil) {
    return {
      success: false,
      error: `Acceso denegado: la cuenta ${normalizedEmail} no está autorizada o fue desactivada. Pide acceso al doctor.`
    };
  }

  const meta = session.user.user_metadata || {};
  return {
    success: true,
    user: {
      email: normalizedEmail,
      name: perfil.nombre || meta.full_name || meta.name || normalizedEmail.split('@')[0],
      picture: meta.avatar_url || meta.picture || null,
      rol: perfil.rol,
      loginAt: session.user.last_sign_in_at || new Date().toISOString()
    }
  };
};

/** Resuelve el usuario de una sesión consultando su perfil en la BD. */
export const cargarUsuario = async (session) => {
  if (!session) return { success: false, error: '' };
  try {
    return userFromSession(session, await getPerfil());
  } catch (err) {
    console.error('Error al leer el perfil:', err);
    return { success: false, error: `No se pudo verificar tu acceso: ${err.message}` };
  }
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
 * Google Calendar ya no se usa desde el navegador: basta con el correo.
 */
export const signInWithGoogle = async () => {
  if (!supabase) {
    throw new Error('Supabase no está configurado (revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).');
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname + window.location.search,
      queryParams: { prompt: 'select_account' }
    }
  });
  if (error) throw error;
};

/**
 * Cierra la sesión activa y elimina datos de persistencia.
 */
export const logout = async () => {
  try {
    limpiarDatosAntiguos();
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
  }
};
