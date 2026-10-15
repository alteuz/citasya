import { describe, expect, it } from 'vitest';
import {
  esProxima,
  estadoVisible,
  instanteBogota,
  puedeModificarse,
  separarCitas,
  type HorarioDeCita,
} from './citas';

// «Ahora» fijo: 15 de octubre de 2026, 10:00 en Bogotá (15:00 UTC).
const AHORA = new Date('2026-10-15T15:00:00Z');

const cita = (fecha: string, inicio: string, fin: string, status: HorarioDeCita['status'] = 'scheduled'): HorarioDeCita => ({
  status,
  slotDate: fecha,
  slotStartTime: inicio,
  slotEndTime: fin,
});

describe('reglas de tiempo de las citas (H-36)', () => {
  it('interpreta la fecha y la hora en hora de Bogotá (UTC−5)', () => {
    expect(instanteBogota('2026-10-15', '10:00:00').toISOString()).toBe('2026-10-15T15:00:00.000Z');
    expect(instanteBogota('2026-10-15', '10:00').toISOString()).toBe('2026-10-15T15:00:00.000Z');
  });

  it('una cita programada que ya terminó no es próxima y se muestra como «pasada»', () => {
    const vencida = cita('2026-06-04', '09:00:00', '09:30:00');
    expect(esProxima(vencida, AHORA)).toBe(false);
    expect(estadoVisible(vencida, AHORA)).toBe('pasada');
  });

  it('una cita en curso sigue siendo próxima hasta que termina', () => {
    const enCurso = cita('2026-10-15', '09:45:00', '10:15:00');
    expect(esProxima(enCurso, AHORA)).toBe(true);
    expect(estadoVisible(enCurso, AHORA)).toBe('scheduled');
  });

  it('las canceladas nunca son próximas y conservan su estado', () => {
    const cancelada = cita('2026-12-01', '08:00:00', '08:30:00', 'cancelled');
    expect(esProxima(cancelada, AHORA)).toBe(false);
    expect(estadoVisible(cancelada, AHORA)).toBe('cancelled');
  });

  it('solo se puede modificar con 24 horas o más de anticipación', () => {
    expect(puedeModificarse(cita('2026-10-16', '10:00:00', '10:30:00'), AHORA)).toBe(true);   // justo 24 h
    expect(puedeModificarse(cita('2026-10-16', '09:59:00', '10:29:00'), AHORA)).toBe(false);  // 23 h 59 min
    expect(puedeModificarse(cita('2026-06-04', '09:00:00', '09:30:00'), AHORA)).toBe(false);  // vencida
    expect(puedeModificarse(cita('2026-12-01', '08:00:00', '08:30:00', 'cancelled'), AHORA)).toBe(false);
  });

  it('separa próximas (más cercana primero) e historial (más reciente primero)', () => {
    const lejana = cita('2026-11-20', '08:00:00', '08:30:00');
    const cercana = cita('2026-10-20', '14:00:00', '14:30:00');
    const vencida = cita('2026-06-04', '09:00:00', '09:30:00');
    const cancelada = cita('2026-09-01', '08:00:00', '08:30:00', 'cancelled');

    const { proximas, historial } = separarCitas([vencida, lejana, cancelada, cercana], AHORA);

    expect(proximas).toEqual([cercana, lejana]);
    expect(historial).toEqual([cancelada, vencida]);
  });

  it('una cita sin horario válido va al historial', () => {
    const sinHorario = cita('', '', '');
    expect(separarCitas([sinHorario], AHORA)).toEqual({ proximas: [], historial: [sinHorario] });
  });
});
