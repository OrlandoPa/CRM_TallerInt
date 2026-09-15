import { supabase } from './api';

const SESSION_KEY = 'crm_user_session';

/**
 * Obtiene el correo electrónico autorizado para acceder al sistema.
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
 * Obtiene el usuario autenticado actualmente almacenado en sesión local o Supabase.
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
  try {
    const rawSession = localStorage.getItem(SESSION_KEY);
    if (!rawSession) return null;
    const user = JSON.parse(rawSession);
    
    // Verificar si sigue siendo un correo autorizado
    if (user && user.email && isEmailAuthorized(user.email)) {
      return user;
    } else {
      // Limpiar sesión inválida
      logout();
      return null;
    }
  } catch (err) {
    console.error('Error al recuperar sesión de usuario:', err);
    logout();
    return null;
  }
};

/**
 * Valida un usuario de Google y establece la sesión si está autorizado.
 * @param {Object} userData - { email, name, picture, sub/idToken }
 * @returns {Object} { success: boolean, user?: Object, error?: string }
 */
export const validateAndLoginUser = (userData) => {
  if (!userData || !userData.email) {
    return {
      success: false,
      error: 'Datos de usuario o correo de Google no válidos.'
    };
  }

  const normalizedEmail = userData.email.trim().toLowerCase();
  const allowed = getAllowedEmail();

  if (!isEmailAuthorized(normalizedEmail)) {
    // Limpiar cualquier residuo de sesión
    logout();
    return {
      success: false,
      error: `Acceso denegado: El correo (${normalizedEmail}) no está autorizado. Únicamente la cuenta (${allowed}) tiene acceso al sistema.`
    };
  }

  const userSession = {
    email: normalizedEmail,
    name: userData.name || normalizedEmail.split('@')[0],
    picture: userData.picture || null,
    loginAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
  } catch (err) {
    console.warn('No se pudo guardar la sesión en localStorage:', err);
  }

  return {
    success: true,
    user: userSession
  };
};

/**
 * Cierra la sesión activa y elimina datos de persistencia.
 */
export const logout = async () => {
  try {
    localStorage.removeItem(SESSION_KEY);
    if (supabase && supabase.auth) {
      await supabase.auth.signOut().catch(() => {});
    }
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
  }
};
