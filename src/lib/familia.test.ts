import { describe, expect, it } from 'vitest';
import type { Familiar } from '@/types/database';
import {
  PARA_MI,
  edadEnAnios,
  hoyEnBogota,
  opcionesDePaciente,
  pacientePorDefecto,
  tipoDocumentoSugerido,
  validarFamiliar,
  type DatosFamiliar,
} from './familia';

// 15-oct-2026 a las 22:00 en Bogotá equivale al 16-oct-2026 a las 03:00 UTC (en UTC ya es otro día).
const AHORA = new Date('2026-10-16T03:00:00Z');

const EPS_A = 'eps-a';
const EPS_B = 'eps-b';
const hijo: Familiar = {
  id: 'f-hijo', nombreCompleto: 'Samuel Pérez', tipoDocumento: 'TI', numeroDocumento: '1012345678',
  fechaNacimiento: '2015-05-10', parentesco: 'hijo', epsId: EPS_A, epsName: 'EPS A',
};
const madre: Familiar = {
  id: 'f-madre', nombreCompleto: 'Gloria Lugo', tipoDocumento: 'CC', numeroDocumento: '41234567',
  fechaNacimiento: '1955-03-02', parentesco: 'padre_madre', epsId: EPS_B, epsName: 'EPS B',
};

const datosValidos: DatosFamiliar = {
  nombreCompleto: 'Samuel Pérez', tipoDocumento: 'TI', numeroDocumento: '1012345678',
  fechaNacimiento: '2015-05-10', parentesco: 'hijo', epsId: EPS_A, autorizacion: true,
};

describe('modelo familiar: fechas y edad', () => {
  it('usa el día de Bogotá aunque en UTC ya sea el día siguiente', () => {
    expect(hoyEnBogota(AHORA)).toBe('2026-10-15');
  });

  it('calcula la edad cumplida', () => {
    expect(edadEnAnios('2015-05-10', AHORA)).toBe(11);
    expect(edadEnAnios('1955-10-16', AHORA)).toBe(70); // cumple mañana en Bogotá
    expect(edadEnAnios('1955-10-15', AHORA)).toBe(71); // cumple hoy
  });

  it('sugiere el documento según la edad', () => {
    expect(tipoDocumentoSugerido(3)).toBe('RC');
    expect(tipoDocumentoSugerido(11)).toBe('TI');
    expect(tipoDocumentoSugerido(18)).toBe('CC');
  });
});

describe('modelo familiar: validación del formulario', () => {
  it('acepta datos completos', () => {
    expect(validarFamiliar(datosValidos, { esNuevo: true, ahora: AHORA })).toEqual({});
  });

  it('exige la declaración de autorización solo al registrar (Ley 1581)', () => {
    const sinAutorizacion = { ...datosValidos, autorizacion: false };
    expect(validarFamiliar(sinAutorizacion, { esNuevo: true, ahora: AHORA })).toHaveProperty('autorizacion');
    expect(validarFamiliar(sinAutorizacion, { esNuevo: false, ahora: AHORA })).toEqual({});
  });

  it('rechaza una fecha de nacimiento futura y un documento con puntos', () => {
    const errores = validarFamiliar(
      { ...datosValidos, fechaNacimiento: '2026-10-16', numeroDocumento: '1.012.345' },
      { esNuevo: true, ahora: AHORA },
    );
    expect(errores.fechaNacimiento).toBe('Revisa la fecha de nacimiento.');
    expect(errores.numeroDocumento).toMatch(/sin puntos ni espacios/);
  });

  it('señala cada campo obligatorio vacío', () => {
    const errores = validarFamiliar(
      { nombreCompleto: ' ', tipoDocumento: '', numeroDocumento: '', fechaNacimiento: '', parentesco: '', epsId: '', autorizacion: false },
      { esNuevo: true, ahora: AHORA },
    );
    expect(Object.keys(errores).sort()).toEqual(
      ['autorizacion', 'epsId', 'fechaNacimiento', 'nombreCompleto', 'numeroDocumento', 'parentesco', 'tipoDocumento'],
    );
  });
});

describe('modelo familiar: ¿para quién es la cita?', () => {
  const titular = { epsId: EPS_A, epsName: 'EPS A' };

  it('solo habilita a quien pertenece a la EPS del médico', () => {
    const opciones = opcionesDePaciente(titular, [hijo, madre], EPS_B);
    expect(opciones.map((o) => [o.clave, o.habilitada])).toEqual([
      [PARA_MI, false],
      ['f-hijo', false],
      ['f-madre', true],
    ]);
    expect(opciones[2]?.detalle).toBe('Padre o madre · EPS B');
  });

  it('elige primero a la persona pedida, luego al titular y luego al primer familiar habilitado', () => {
    const opciones = opcionesDePaciente(titular, [hijo, madre], EPS_A);
    expect(pacientePorDefecto(opciones, 'f-hijo')).toBe('f-hijo');
    expect(pacientePorDefecto(opciones, null)).toBe(PARA_MI);
    // La madre no es de la EPS del médico, así que se vuelve al titular.
    expect(pacientePorDefecto(opciones, 'f-madre')).toBe(PARA_MI);

    const soloMadre = opcionesDePaciente(titular, [hijo, madre], EPS_B);
    expect(pacientePorDefecto(soloMadre, null)).toBe('f-madre');
  });

  it('devuelve null si nadie pertenece a la EPS del médico', () => {
    expect(pacientePorDefecto(opcionesDePaciente(titular, [hijo], 'eps-c'), null)).toBeNull();
  });
});
