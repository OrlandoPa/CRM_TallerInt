// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import LoginView from './LoginView';
import * as authService from '../../services/authService';
import { supabase } from '../../services/api';

const sessionFor = (email, extra = {}) => ({
  provider_token: 'google-token-123',
  user: {
    email,
    last_sign_in_at: '2026-09-24T10:00:00Z',
    user_metadata: { full_name: 'Administrador Taller', avatar_url: 'https://example.com/pic.jpg' }
  },
  ...extra
});

describe('UT-FRONT-LOGIN: Módulo de Autenticación y Login monousuario', () => {
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
    it('Debe identificar correctamente el correo autorizado', () => {
      const allowed = authService.getAllowedEmail();
      expect(allowed).toBe('automatizadon8n@gmail.com');
      expect(authService.isEmailAuthorized('automatizadon8n@gmail.com')).toBe(true);
      expect(authService.isEmailAuthorized('AUTOMATIZADON8N@GMAIL.COM')).toBe(true);
    });

    it('Debe rechazar correos no autorizados', () => {
      expect(authService.isEmailAuthorized('otro.usuario@gmail.com')).toBe(false);
      expect(authService.isEmailAuthorized('hack@domain.com')).toBe(false);
      expect(authService.isEmailAuthorized('')).toBe(false);
      expect(authService.isEmailAuthorized(null)).toBe(false);
    });

    it('userFromSession debe aceptar únicamente sesiones del correo autorizado', () => {
      const invalidRes = authService.userFromSession(sessionFor('desconocido@gmail.com'));
      expect(invalidRes.success).toBe(false);
      expect(invalidRes.error).toContain('Acceso denegado');

      expect(authService.userFromSession(null).success).toBe(false);

      const validRes = authService.userFromSession(sessionFor('Automatizadon8n@gmail.com'));
      expect(validRes.success).toBe(true);
      expect(validRes.user.email).toBe('automatizadon8n@gmail.com');
      expect(validRes.user.name).toBe('Administrador Taller');
    });

    it('storeGCalTokenFromSession debe guardar el provider_token de Google', () => {
      authService.storeGCalTokenFromSession(sessionFor('automatizadon8n@gmail.com'));
      expect(localStorage.getItem('gcal_access_token')).toBe('google-token-123');
      expect(Number(localStorage.getItem('gcal_token_expiry'))).toBeGreaterThan(Date.now());
    });

    it('logout debe eliminar los tokens locales', async () => {
      localStorage.setItem('gcal_access_token', 'x');
      localStorage.setItem('crm_user_session', '{"email":"automatizadon8n@gmail.com"}');
      await authService.logout();
      expect(localStorage.getItem('gcal_access_token')).toBeNull();
      expect(localStorage.getItem('crm_user_session')).toBeNull();
    });
  });

  describe('LoginView Component Unit Tests', () => {
    it('Debe renderizar la vista de Login con el aviso de acceso restringido', () => {
      render(<LoginView />);

      expect(screen.getByTestId('login-view')).toBeTruthy();
      expect(screen.getByText(/Gestión de Citas Odontologicas/i)).toBeTruthy();
      expect(screen.getByText(/Acceso restringido únicamente al correo autorizado/i)).toBeTruthy();
    });

    it('Debe mostrar el error de autorización recibido', () => {
      render(<LoginView authError="Acceso denegado: prueba" />);
      expect(screen.getByTestId('login-error-alert').textContent).toContain('Acceso denegado: prueba');
    });

    it('Debe iniciar el OAuth de Google vía Supabase (sin login simulado)', async () => {
      if (!supabase) return; // sin credenciales en el entorno de test
      const spy = vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValue({ data: {}, error: null });
      render(<LoginView />);

      fireEvent.click(screen.getByTestId('btn-google-login'));

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ provider: 'google' }));
      });
      expect(localStorage.getItem('crm_user_session')).toBeNull();
    });
  });
});
