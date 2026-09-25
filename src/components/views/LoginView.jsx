import { useState } from 'react';
import { ShieldCheck, AlertCircle, Lock, Calendar, MessageSquare, Activity, CheckCircle2 } from 'lucide-react';
import { signInWithGoogle } from '../../services/authService';

function LoginView({ authError = '' }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const shownError = error || authError;

  // Inicio de sesión real con Google vía Supabase Auth (redirige a Google y vuelve a la app).
  // No existe ningún modo "simulado": sin sesión de Supabase no hay acceso.
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      setError(err?.message || 'No se pudo iniciar sesión con Google.');
      setLoading(false);
    }
  };

  return (
    <div
      className="login-container"
      data-testid="login-view"
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexWrap: 'wrap',
        background: 'var(--bg-primary)',
        overflowX: 'hidden'
      }}
    >
      {/* Sección Izquierda: Hero Showcase Informativo */}
      <div
        className="login-hero-section"
        style={{
          flex: '1.2',
          minWidth: '340px',
          background: 'radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 45%), radial-gradient(circle at bottom right, rgba(45, 212, 191, 0.15), transparent 45%), #090d16',
          padding: '50px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glow de fondo decorativo */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Encabezado Superior / Marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 16px var(--primary-glow)'
          }}>
            <ShieldCheck size={24} />
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Sistema de Gestión de Reserva de Citas Odontológicas
          </span>
        </div>

        {/* Contenido Central Informativo */}
        <div style={{ margin: '40px 0', zIndex: 1, maxWidth: '540px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            color: 'var(--primary)',
            fontWeight: 600,
            marginBottom: '20px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)', boxShadow: '0 0 8px var(--secondary)' }} />
            Sistema de Gestión Odontológica
          </div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.25', marginBottom: '16px', letterSpacing: '-0.5px' }}>
            Control Integral de Citas y Pacientes
          </h1>

          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px' }}>
            Plataforma médica para la administración eficiente de consultorios, sincronización bidireccional en tiempo real y atención al paciente.
          </p>

          {/* Tarjetas de características clave */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              padding: '16px 20px',
              borderRadius: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>Google Calendar Integrado</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>Sincronización de citas y eventos agendados en tiempo real.</p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              padding: '16px 20px',
              borderRadius: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(45, 212, 191, 0.15)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MessageSquare size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>Consola Chatwoot & WhatsApp</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>Gestión directa de chats y confirmación con pacientes.</p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              padding: '16px 20px',
              borderRadius: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(74, 222, 128, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Activity size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>Asistencia y Registro Clínico</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>Seguimiento detallado de estado de citas y pacientes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie Informativo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', zIndex: 1 }}>
          <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
          <span>Acceso seguro monousuario • Sistema en línea</span>
        </div>
      </div>

      {/* Sección Derecha: Formulario y Tarjeta de Login */}
      <div
        className="login-form-section"
        style={{
          flex: '1',
          minWidth: '340px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderLeft: '1px solid var(--glass-border)'
        }}
      >
        <div
          className="login-card"
          style={{
            width: '100%',
            maxWidth: '420px',
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
          {shownError && (
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
                {shownError}
              </div>
            </div>
          )}

          {/* Único Botón de Acción Google Sign In */}
          <button
            data-testid="btn-google-login"
            onClick={handleGoogleLogin}
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

          {/* Aviso de Acceso Restringido */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <Lock size={13} />
              <span>Acceso restringido únicamente al correo autorizado</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default LoginView;
