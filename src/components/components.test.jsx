// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import AttendanceView from './views/AttendanceView';
import Sidebar from './layout/Sidebar';

describe('UT-FRONT-04: Renderizado de Mensaje Vacío en Citas Pasadas (AttendanceView)', () => {
  it('Debería ejecutar la lógica condicional del componente y mostrar el mensaje vacio', () => {
    // Se ejecuta el componente REAL AttendanceView.jsx pasando un arreglo vacío de citas
    const pastAppointmentsToReview = [];

    render(
      <AttendanceView 
        pastAppointmentsToReview={pastAppointmentsToReview}
        onMarkAttendance={() => {}}
        onOpenReschedule={() => {}}
        hasRequiredGCalGmail={true}
      />
    );

    // Se busca en el HTML real generado por el componente el mensaje de alerta/vacío
    const emptyElement = screen.getByText(/¡Todo al día! No hay citas pasadas pendientes de registrar asistencia/i);
    console.log(`UT-FRONT-04 [Componente REAL] => Texto renderizado en pantalla: "${emptyElement.textContent.trim()}"`);
    expect(emptyElement).toBeTruthy();
  });
});

describe('UT-FRONT-05: Contador de Alertas en Sidebar (Sidebar)', () => {
  it('Debería evaluar dinámicamente cualquier cantidad de citas recibidas y renderizar el número exacto en el badge', () => {
    // Probamos con una lista real de 5 citas de ejemplo
    const citasRealesDePrueba = [
      { id: 1, motivo_consulta: 'Limpieza' },
      { id: 2, motivo_consulta: 'Evaluación' },
      { id: 3, motivo_consulta: 'Endodoncia' },
      { id: 4, motivo_consulta: 'Blanqueamiento' },
      { id: 5, motivo_consulta: 'Cirugía' }
    ];

    const cantidadEsperada = citasRealesDePrueba.length.toString(); // "5"

    render(
      <Sidebar 
        activeTab="dashboard"
        setActiveTab={() => {}}
        theme="dark"
        toggleTheme={() => {}}
        pastAppointmentsToReview={citasRealesDePrueba}
        isCollapsed={false}
        setIsCollapsed={() => {}}
      />
    );

    // El componente ejecuta {pastAppointmentsToReview.length} internamente y debe renderizar "5"
    const badgeElement = screen.getByText(cantidadEsperada);
    console.log(`UT-FRONT-05 [Componente REAL] => Arreglo de ${citasRealesDePrueba.length} citas -> Badge renderizó dinámicamente: "${badgeElement.textContent}"`);
    expect(badgeElement.textContent).toBe(cantidadEsperada);
  });
});

import DetailModal from './modals/DetailModal';

describe('UT-FRONT-06: Renderizado de identificador_paciente en DetailModal', () => {
  it('Debería mostrar correctamente el identificador_paciente (celular o username) cuando la cita proviene de Supabase con identificador_paciente', () => {
    const mockAppointmentDetails = {
      id: 105,
      identificador_paciente: '@usuario_whatsapp_999',
      fecha_hora_cita: new Date().toISOString(),
      motivo_consulta: 'Consulta General',
      estado_cita: 'AGENDADA',
      detalles_notas_cita: 'Notas de prueba',
      pacientes: { nombre_paciente: 'Ana Torres', identificador_paciente: '@usuario_whatsapp_999' }
    };

    render(
      <DetailModal
        isOpen={true}
        onClose={() => {}}
        selectedAppointmentDetails={mockAppointmentDetails}
        onDelete={() => {}}
        onReschedule={() => {}}
        hasRequiredGCalGmail={true}
      />
    );

    const contactElement = screen.getByText(/@usuario_whatsapp_999/i);
    expect(contactElement).toBeTruthy();
  });
});
