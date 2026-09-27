import { describe, expect, it } from 'vitest';
import { codigoDeError, mensajeDeError } from './errores';

describe('errores de agendamiento', () => {
  it('usa el texto para el paciente cuando el error es de negocio', () => {
    const error = {
      code: 'P0001',
      message: 'HORARIO_NO_DISPONIBLE',
      details: 'Otra persona acaba de reservar este horario. Elige otro, por favor.',
    };
    expect(codigoDeError(error)).toBe('HORARIO_NO_DISPONIBLE');
    expect(mensajeDeError(error, 'No se pudo agendar.')).toBe(
      'Otra persona acaba de reservar este horario. Elige otro, por favor.',
    );
  });

  it('nunca muestra el mensaje técnico de la base de datos', () => {
    const error = { code: '42501', message: 'permission denied for table appointments', details: null };
    expect(codigoDeError(error)).toBeNull();
    expect(mensajeDeError(error, 'No se pudo agendar la cita. Intenta de nuevo.')).toBe(
      'No se pudo agendar la cita. Intenta de nuevo.',
    );
  });

  it('usa el mensaje por defecto si no hay error o falta el detalle', () => {
    expect(mensajeDeError(null, 'Error genérico')).toBe('Error genérico');
    expect(mensajeDeError({ message: 'FUERA_DE_PLAZO', details: null }, 'Error genérico')).toBe('Error genérico');
  });
});
