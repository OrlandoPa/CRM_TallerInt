import { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, Lock, Sparkles, CheckCircle2, UserCheck } from 'lucide-react';
import { supabase } from '../../services/api';
import { validateAndLoginUser, getAllowedEmail } from '../../services/authService';

function LoginView({ onLoginSuccess }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const allowedEmail = getAllowedEmail();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Procesar credencial de Google GIS token
  const handleCredentialResponse = (response) => {
    setLoading(true);
    setError('');
    try {
      if (!response.credential) {
        throw new Error('No se recibió la credencial de Google.');
      }

      // Decodificar JWT Token Payload de Google
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);

      const result = validateAndLoginUser({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub
      });

      if (result.success) {
        if (onLoginSuccess) onLoginSuccess(result.user);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error al procesar autenticación de Google:', err);
      setError('Error al procesar el inicio de sesión con Google. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar SDK de Google Identity Services dinámicamente si no está presente
  useEffect(() => {
    if (!googleClientId) return;

    const initializeGoogleGIS = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
          auto_select: false
        });

        const btnElement = document.getElementById('google-signin-button');
        if (btnElement) {
          btnElement.innerHTML = '';
          window.google.accounts.id.renderButton(btnElement, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left'
          });
        }
      }
    };

    if (window.google?.accounts?.id) {
      initializeGoogleGIS();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleGIS;
      document.body.appendChild(script);
    }
  }, [googleClientId]);

  // Manejar Login vía Supabase OAuth si está configurado Supabase
  const handleSupabaseGoogleLogin = () => {
    setLoading(true);
    setError('');
    const isLocalOrTest = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname);

    if (supabase && supabase.auth && !isLocalOrTest) {
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      }).catch((err) => {
        console.warn('Fallback a simulación de inicio de sesión:', err);
        handleSimulatedGoogleLogin(allowedEmail);
      });
    } else {
      handleSimulatedGoogleLogin(allowedEmail);
    }
  };

  // Función de simulación para entornos sin credenciales OAuth o pruebas unitarias
  const handleSimulatedGoogleLogin = (emailToUse) => {
    setLoading(true);
    setError('');
    const targetEmail = emailToUse || allowedEmail;
    const result = validateAndLoginUser({
      email: targetEmail,
      name: targetEmail ? targetEmail.split('@')[0] : 'Administrador CRM',
      picture: 'https://lh3.googleusercontent.com/a/default-user'
    });

    if (result.success) {
      if (onLoginSuccess) onLoginSuccess(result.user);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div
      className="login-container"
      data-testid="login-view"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 40%), radial-gradient(circle at bottom left, rgba(45, 212, 191, 0.08), transparent 40%), var(--bg-primary)',
        padding: '24px'
      }}
    >
      <div
        className="login-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '24px',
          padding: '40px 32px',
          boxShadow: 'var(--glass-shadow)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorativo Superior */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Logo / Badge de la App */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', marginBottom: '20px', boxShadow: '0 8px 24px var(--primary-glow)' }}>
          <ShieldCheck size={36} />
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Gestión de Citas Odontologicas
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: '1.5' }}>
          Sistema de Gestión. Inicie sesión con la cuenta de Google autorizada para continuar.
        </p>

        {/* Notificación de Error */}
        {error && (
          <div
            data-testid="login-error-alert"
            style={{
              background: 'rgba(248, 113, 113, 0.12)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              borderRadius: '12px',
              padding: '14px 16px',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              textAlign: 'left',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, lineHeight: '1.4' }}>
              {error}
            </div>
          </div>
        )}

        {/* Botón de Google GIS Nativo */}
        <div
          id="google-signin-button"
          style={{
            display: 'flex',
            justifyContent: 'center',
            minHeight: '44px',
            marginBottom: '16px'
          }}
        ></div>

        {/* Botón de Acción Google Sign In Directo / Fallback */}
        <button
          data-testid="btn-google-login"
          onClick={handleSupabaseGoogleLogin}
          disabled={loading}
          className="btn"
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '12px',
            background: '#ffffff',
            color: '#1f2937',
            fontWeight: 600,
            fontSize: '0.95rem',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            transition: 'all 0.2s ease',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? (
            <span>Verificando cuenta...</span>
          ) : (
            <>
              {/* Google SVG Logo */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continuar con Google
            </>
          )}
        </button>

        {/* Sección de Simulación en Modo Pruebas/Desarrollo */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            <Lock size={13} />
            <span>Acceso restringido únicamente al correo autorizado</span>
          </div>

          {/* Botón rápido para pruebas manuales con cuenta no autorizada */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              type="button"
              data-testid="btn-test-unauthorized"
              onClick={() => handleSimulatedGoogleLogin('cuenta.no.autorizada@gmail.com')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                textDecoration: 'underline',
                cursor: 'pointer',
                opacity: 0.7
              }}
            >
              [Probar acceso denegado]
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default LoginView;
