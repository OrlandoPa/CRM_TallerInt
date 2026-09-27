// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import LoginView from './LoginView';
import * as authService from '../../services/authService';
import { supabase } from '../../services/api';

const sessionFor = (email) => ({
  user: {
    email,
    last_sign_in_at: '2026-09-24T10:00:00Z',
    user_metadata: { full_name: 'Administrador Taller', avatar_url: 'https://example.com/pic.jpg' }
  }
});

describe('UT-FRONT-LOGIN: Autenticación y roles', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  describe('authService Unit Tests', () => {
    it('userFromSession acepta solo sesiones con perfil activo en usuarios_autorizados', () => {
      const sinPerfil = authService.userFromSession(sessionFor('desconocido@gmail.com'), null);
      expect(sinPerfil.success).toBe(false);
      expect(sinPerfil.error).toContain('Acceso denegado');

      expect(authService.userFromSession(null, null).success).toBe(false);

      const doctor = authService.userFromSession(
        sessionFor('Automatizadon8n@gmail.com'),
        { email: 'automatizadon8n@gmail.com', nombre: 'Dr. Clínica', rol: 'doctor' }
      );
      expect(doctor.success).toBe(true);
      expect(doctor.user.email).toBe('automatizadon8n@gmail.com');
      expect(doctor.user.rol).toBe('doctor');
      expect(doctor.user.name).toBe('Dr. Clínica');
    });

    it('El rol de recepción se conserva y el nombre cae al de Google si el perfil no lo tiene', () => {
      const r = authService.userFromSession(
        sessionFor('rosa@gmail.com'),
        { email: 'rosa@gmail.com', nombre: null, rol: 'recepcion' }
      );
      expect(r.user.rol).toBe('recepcion');
      expect(r.user.name).toBe('Administrador Taller');
    });

    it('logout elimina los datos que dejaban versiones anteriores', async () => {
      localStorage.setItem('gcal_access_token', 'x');
      localStorage.setItem('gcal_user_email', 'a@b.c');
      localStorage.setItem('crm_user_session', '{"email":"automatizadon8n@gmail.com"}');
      await authService.logout();
      expect(localStorage.getItem('gcal_access_token')).toBeNull();
      expect(localStorage.getItem('gcal_user_email')).toBeNull();
      expect(localStorage.getItem('crm_user_session')).toBeNull();
    });
  });

  describe('LoginView Component Unit Tests', () => {
    it('Debe renderizar la vista de Login con el aviso de acceso restringido', () => {
      render(<LoginView />);

      expect(screen.getByTestId('login-view')).toBeTruthy();
      expect(screen.getByText(/Gestión de Citas Odontológicas/i)).toBeTruthy();
      expect(screen.getByText(/Acceso solo para el personal registrado por el doctor/i)).toBeTruthy();
    });

    it('Debe mostrar el error de autorización recibido', () => {
      render(<LoginView authError="Acceso denegado: prueba" />);
      expect(screen.getByTestId('login-error-alert').textContent).toContain('Acceso denegado: prueba');
    });

    it('Debe iniciar el OAuth de Google vía Supabase sin pedir permisos de Calendar', async () => {
      if (!supabase) return; // sin credenciales en el entorno de test
      const spy = vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValue({ data: {}, error: null });
      render(<LoginView />);

      fireEvent.click(screen.getByTestId('btn-google-login'));

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ provider: 'google' }));
      });
      expect(spy.mock.calls[0][0].options.scopes).toBeUndefined();
      expect(localStorage.getItem('crm_user_session')).toBeNull();
    });
  });
});
