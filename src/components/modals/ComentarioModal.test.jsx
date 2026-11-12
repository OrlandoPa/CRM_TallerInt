import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ComentarioModal from './ComentarioModal';
import Sidebar from '../layout/Sidebar';

describe('Canal de comentarios (RNF-VERDE-13)', () => {
  afterEach(cleanup);

  it('el menú muestra el botón y lo abre', () => {
    const onComentar = vi.fn();
    render(
      <Sidebar
        activeTab="dashboard" setActiveTab={() => {}} theme="light" toggleTheme={() => {}}
        pastAppointmentsToReview={[]} isCollapsed={false} setIsCollapsed={() => {}} rol="recepcion"
        onComentar={onComentar}
      />
    );
    fireEvent.click(screen.getByTestId('btn-comentario'));
    expect(onComentar).toHaveBeenCalledOnce();
  });

  it('no envía un comentario vacío', () => {
    render(<ComentarioModal isOpen onClose={() => {}} showToast={() => {}} />);
    expect(screen.getByRole('button', { name: 'Enviar' }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Comentario'), { target: { value: 'Va lento al abrir' } });
    expect(screen.getByRole('button', { name: 'Enviar' }).disabled).toBe(false);
  });

  it('cerrado no se muestra', () => {
    const { container } = render(<ComentarioModal isOpen={false} onClose={() => {}} showToast={() => {}} />);
    expect(container.innerHTML).toBe('');
  });
});
