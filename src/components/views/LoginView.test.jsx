// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import LoginView from './LoginView';
import * as authService from '../../services/authService';

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

    it('validateAndLoginUser debe permitir ingreso únicamente si el correo coincide', () => {
      // Intento no autorizado
      const invalidRes = authService.validateAndLoginUser({ email: 'desconocido@gmail.com' });
      expect(invalidRes.success).toBe(false);
      expect(invalidRes.error).toContain('Acceso denegado');
      expect(authService.getCurrentUser()).toBeNull();

      // Intento autorizado
      const validRes = authService.validateAndLoginUser({
        email: 'automatizadon8n@gmail.com',
        name: 'Administrador Taller',
        picture: 'https://example.com/pic.jpg'
      });
      expect(validRes.success).toBe(true);
      expect(validRes.user.email).toBe('automatizadon8n@gmail.com');
      expect(authService.getCurrentUser().email).toBe('automatizadon8n@gmail.com');
    });

    it('logout debe eliminar la sesión activa de localStorage', () => {
      authService.validateAndLoginUser({ email: 'automatizadon8n@gmail.com' });
      expect(authService.getCurrentUser()).not.toBeNull();

      authService.logout();
      expect(authService.getCurrentUser()).toBeNull();
    });
  });

  describe('LoginView Component Unit Tests', () => {
    it('Debe renderizar la vista de Login con el aviso de acceso restringido', () => {
      render(<LoginView onLoginSuccess={() => { }} />);

      expect(screen.getByTestId('login-view')).toBeTruthy();
      expect(screen.getByText(/Gestión de Citas Odontologicas/i)).toBeTruthy();
      expect(screen.getByText(/Acceso restringido únicamente al correo autorizado/i)).toBeTruthy();
    });

    it('Debe llamar a onLoginSuccess cuando la autenticación con la cuenta autorizada es exitosa', async () => {
      const handleSuccess = vi.fn();
      render(<LoginView onLoginSuccess={handleSuccess} />);

      const googleBtn = screen.getByTestId('btn-google-login');
      fireEvent.click(googleBtn);

      await waitFor(() => {
        expect(handleSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ email: expect.any(String) })
        );
      });
    });
  });
});
