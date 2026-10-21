// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  agenda, bundleCita, bundlesMaestros, cita, codigoEspecialidad, franja, idFhir, instanteBogota,
  organizacionEps, paciente, rolProfesional, SISTEMAS, sumarDias, ubicacion, urnPaciente,
} from './mapeador.ts';
import { leerRespuestaTransaccion, versionDeEtag } from './respuesta.ts';
import type { Appointment, Bundle, Patient, Slot } from './tipos.ts';
import {
  citaSintetica, epsSintetica, franjaSintetica, medicoSintetico, sedeSintetica,
} from '../../../../fhir/pruebas/datos-sinteticos.ts';

describe('fechas en la zona de Bogotá', () => {
  it('convierte fecha y hora locales en un instant con −05:00', () => {
    expect(instanteBogota('2026-11-18', '08:00:00')).toBe('2026-11-18T08:00:00-05:00');
    expect(instanteBogota('2026-11-18', '08:00')).toBe('2026-11-18T08:00:00-05:00');
    expect(() => instanteBogota('18/11/2026', '08:00')).toThrow(/inválida/);
  });

  it('suma días cruzando meses y años sin depender de la zona del equipo', () => {
    expect(sumarDias('2026-10-19', 60)).toBe('2026-12-18');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('recursos maestros', () => {
  it('una EPS es una Organization pagadora con su NIT y su código', () => {
    const eps = epsSintetica({ nit: '800251440', codigoHabilitacion: 'EPS005' });
    const recurso = organizacionEps(eps);
    expect(recurso.type?.[0]?.coding?.[0]).toMatchObject({ system: SISTEMAS.tipoOrganizacion, code: 'pay' });
    expect(recurso.identifier).toEqual([
      { use: 'official', system: SISTEMAS.nit, value: '800251440' },
      { system: SISTEMAS.codigoEps, value: 'EPS005' },
    ]);
  });

  it('una EPS liquidada queda inactiva y sin código de habilitación', () => {
    const recurso = organizacionEps(epsSintetica({ activa: false, codigoHabilitacion: null }));
    expect(recurso.active).toBe(false);
    expect(recurso.identifier).toHaveLength(1);
  });

  it('una sede es una Location administrada por su IPS', () => {
    const sede = sedeSintetica();
    expect(ubicacion(sede).managingOrganization?.reference).toBe(`Organization/${idFhir.prestador(sede.prestador.nit)}`);
  });

  it('el rol del médico lleva su EPS, su sede, su especialidad y sus días ISO', () => {
    const medico = medicoSintetico({ diasAtencion: [5, 1, 3, 3, 9] });
    const rol = rolProfesional(medico);
    expect(rol.organization?.reference).toBe(`Organization/${idFhir.eps(medico.eps.id)}`);
    expect(rol.location?.[0]?.reference).toBe(`Location/${idFhir.sede(medico.sede?.id ?? '')}`);
    expect(rol.specialty?.[0]?.coding?.[0]?.code).toBe('medicina-general');
    expect(rol.availableTime?.[0]?.daysOfWeek).toEqual(['mon', 'wed', 'fri']);
  });

  it('la agenda cubre la ventana de 60 días desde hoy', () => {
    const horizonte = agenda(medicoSintetico(), '2026-10-19').planningHorizon;
    expect(horizonte).toEqual({ start: '2026-10-19T00:00:00-05:00', end: '2026-12-18T23:59:59-05:00' });
  });

  it('un médico sin sede no referencia ninguna Location', () => {
    const medico = medicoSintetico({ sede: null });
    expect(rolProfesional(medico).location).toBeUndefined();
    expect(agenda(medico, '2026-10-19').actor).toHaveLength(1);
  });

  it('los códigos de especialidad no dependen de tildes ni mayúsculas', () => {
    expect(codigoEspecialidad('Ginecología')).toBe('ginecologia');
    expect(codigoEspecialidad('Cirugía General')).toBe('cirugia-general');
  });

  it('rechaza identificadores que FHIR no admite', () => {
    expect(() => idFhir.prestador('800 003 765')).toThrow(/inválido/);
  });
});

describe('franja y cita', () => {
  const medico = medicoSintetico();
  const horario = franjaSintetica('2026-11-18', '08:00:00', '08:20:00', true);

  it('una franja reservada se publica como busy y una libre como free', () => {
    const slot: Slot = franja(horario, medico);
    expect(slot).toMatchObject({ status: 'busy', start: '2026-11-18T08:00:00-05:00', end: '2026-11-18T08:20:00-05:00' });
    expect(franja({ ...horario, ocupada: false }, medico).status).toBe('free');
    expect(slot.schedule.reference).toBe(`Schedule/${idFhir.agenda(medico.id)}`);
  });

  it('la cita activa queda booked, con su franja, su duración y sus participantes', () => {
    const datos = citaSintetica(medico, horario);
    const recurso: Appointment = cita(datos, 'urn:uuid:x');
    expect(recurso.status).toBe('booked');
    expect(recurso.cancelationReason).toBeUndefined();
    expect(recurso.minutesDuration).toBe(20);
    expect(recurso.slot?.[0]?.reference).toBe(`Slot/${idFhir.franja(horario.id)}`);
    expect(recurso.participant.map((p) => p.actor?.reference)).toEqual([
      'urn:uuid:x',
      `PractitionerRole/${idFhir.rol(medico.id)}`,
      `Location/${idFhir.sede(medico.sede?.id ?? '')}`,
    ]);
    expect(recurso.appointmentType?.coding?.[0]).toMatchObject({ system: SISTEMAS.modalidad, code: 'presencial' });
  });

  it('la cita cancelada usa el código estándar de cancelación y no el texto del paciente', () => {
    const recurso = cita(citaSintetica(medico, horario, { estado: 'cancelled' }), 'urn:uuid:x');
    expect(recurso.status).toBe('cancelled');
    expect(recurso.cancelationReason?.coding?.[0]).toMatchObject({ system: SISTEMAS.motivoCancelacion, code: 'pat-cpp' });
  });

  it('la cita atendida queda fulfilled', () => {
    expect(cita(citaSintetica(medico, horario, { estado: 'completed' }), 'urn:uuid:x').status).toBe('fulfilled');
  });
});

describe('paciente seudonimizado (Ley 1581)', () => {
  const seudonimo = 'a'.repeat(64);

  it('solo lleva el seudónimo, la etiqueta PSEUDED y el estado activo', () => {
    const recurso: Patient = paciente({ claveLocal: 'profiles/x', seudonimo });
    expect(Object.keys(recurso).sort()).toEqual(['active', 'identifier', 'meta', 'resourceType']);
    expect(recurso.meta?.security?.[0]).toMatchObject({ code: 'PSEUDED' });
    expect(recurso.identifier).toEqual([{ use: 'secondary', system: SISTEMAS.seudonimo, value: seudonimo }]);
  });

  it('rechaza cualquier valor que no sea un HMAC-SHA-256 en hexadecimal', () => {
    expect(() => paciente({ claveLocal: 'profiles/x', seudonimo: '1012345678' })).toThrow(/seudónimo/);
  });

  it('su urn:uuid es estable y tiene forma de UUID', () => {
    expect(urnPaciente(seudonimo)).toBe(`urn:uuid:${'a'.repeat(8)}-aaaa-aaaa-aaaa-${'a'.repeat(12)}`);
  });
});

describe('Bundle de una cita', () => {
  const medico = medicoSintetico();
  const anterior = franjaSintetica('2026-11-17', '09:00:00', '09:20:00', false);
  const actual = franjaSintetica('2026-11-18', '08:00:00', '08:20:00', true);
  const datos = citaSintetica(medico, actual, { franjasAnteriores: [anterior, actual] });

  it('va en orden de dependencias y es autosuficiente', () => {
    const { bundle, esperadas } = bundleCita(datos, { hoy: '2026-10-19', versiones: {} });
    expect(bundle.type).toBe('transaction');
    expect(bundle.entry?.map((e) => e.resource?.resourceType)).toEqual([
      'Organization', 'Organization', 'Location', 'Practitioner', 'PractitionerRole', 'Schedule',
      'Slot', 'Slot', 'Patient', 'Appointment',
    ]);
    expect(esperadas).toHaveLength(bundle.entry?.length ?? 0);
  });

  it('la franja anterior queda libre y la actual no se repite', () => {
    const { bundle } = bundleCita(datos, { hoy: '2026-10-19', versiones: {} });
    const slots = (bundle.entry ?? []).filter((e) => e.resource?.resourceType === 'Slot').map((e) => e.resource as Slot);
    expect(slots.map((s) => [s.id, s.status])).toEqual([
      [idFhir.franja(anterior.id), 'free'],
      [idFhir.franja(actual.id), 'busy'],
    ]);
  });

  it('usa If-Match en las franjas ya publicadas y crea las nuevas sin él', () => {
    const { bundle } = bundleCita(datos, { hoy: '2026-10-19', versiones: { [idFhir.franja(actual.id)]: '3' } });
    const pedidos = (bundle.entry ?? []).filter((e) => e.resource?.resourceType === 'Slot').map((e) => e.request);
    expect(pedidos).toEqual([
      { method: 'PUT', url: `Slot/${idFhir.franja(anterior.id)}` },
      { method: 'PUT', url: `Slot/${idFhir.franja(actual.id)}`, ifMatch: 'W/"3"' },
    ]);
  });

  it('el paciente va por actualización condicional y la cita lo referencia por su urn', () => {
    const { bundle } = bundleCita(datos, { hoy: '2026-10-19', versiones: {} });
    const entradaPaciente = bundle.entry?.find((e) => e.resource?.resourceType === 'Patient');
    expect(entradaPaciente?.request).toEqual({ method: 'PUT', url: `Patient?identifier=${SISTEMAS.seudonimo}|${datos.paciente.seudonimo}` });
    const recursoCita = bundle.entry?.find((e) => e.resource?.resourceType === 'Appointment')?.resource as Appointment;
    expect(recursoCita.participant[0]?.actor?.reference).toBe(entradaPaciente?.fullUrl);
  });

  it('omite las franjas que se indiquen (tomadas por otra cita del servidor)', () => {
    const { bundle } = bundleCita(datos, { hoy: '2026-10-19', versiones: {}, omitirFranjas: new Set([anterior.id]) });
    expect((bundle.entry ?? []).filter((e) => e.resource?.resourceType === 'Slot')).toHaveLength(1);
  });

  it('no incluye ningún dato personal del paciente ni su clave local', () => {
    const { bundle } = bundleCita(datos, { hoy: '2026-10-19', versiones: {} });
    const recursoPaciente = bundle.entry?.find((e) => e.resource?.resourceType === 'Patient')?.resource;
    expect(Object.keys(recursoPaciente ?? {}).sort()).toEqual(['active', 'identifier', 'meta', 'resourceType']);
    expect(JSON.stringify(bundle)).not.toContain(datos.paciente.claveLocal);
  });
});

describe('carga inicial', () => {
  it('no repite EPS ni IPS y parte los Bundles sin romper el orden', () => {
    const eps = epsSintetica();
    const sede = sedeSintetica();
    const medicos = [medicoSintetico({ eps, sede }), medicoSintetico({ eps, sede })];
    const bundles = bundlesMaestros({ eps: [eps], sedes: [sede], medicos }, '2026-10-19', 4);
    const tipos = bundles.flatMap((b) => b.bundle.entry?.map((e) => e.resource?.resourceType) ?? []);
    expect(tipos).toEqual([
      'Organization', 'Organization', 'Location',
      'Practitioner', 'PractitionerRole', 'Schedule', 'Practitioner', 'PractitionerRole', 'Schedule',
    ]);
    expect(bundles.map((b) => b.bundle.entry?.length)).toEqual([4, 4, 1]);
  });
});

describe('respuesta de la transacción', () => {
  const esperadas = [
    { recurso: 'Slot' as const, claveLocal: 'availability_slots/a' },
    { recurso: 'Patient' as const, claveLocal: 'profiles/b' },
  ];

  it('obtiene el id y la versión de cada entrada, con ubicación relativa o absoluta', () => {
    const respuesta: Bundle = {
      resourceType: 'Bundle',
      type: 'transaction-response',
      entry: [
        { response: { status: '200 OK', location: 'Slot/citasya-franja-a/_history/4', etag: 'W/"4"' } },
        { response: { status: '201 Created', location: 'https://hapi.fhir.org/baseR4/Patient/123/_history/1' } },
      ],
    };
    expect(leerRespuestaTransaccion(respuesta, esperadas)).toEqual([
      { recurso: 'Slot', claveLocal: 'availability_slots/a', idFhir: 'citasya-franja-a', version: '4' },
      { recurso: 'Patient', claveLocal: 'profiles/b', idFhir: '123', version: '1' },
    ]);
  });

  it('falla si la respuesta no corresponde a lo enviado', () => {
    const incompleta: Bundle = { resourceType: 'Bundle', type: 'transaction-response', entry: [] };
    expect(() => leerRespuestaTransaccion(incompleta, esperadas)).toThrow(/entradas/);
    const otroTipo: Bundle = { resourceType: 'Bundle', type: 'searchset', entry: [] };
    expect(() => leerRespuestaTransaccion(otroTipo, esperadas)).toThrow(/transaction-response/);
  });

  it('lee ETags débiles y fuertes', () => {
    expect(versionDeEtag('W/"7"')).toBe('7');
    expect(versionDeEtag('"7"')).toBe('7');
    expect(versionDeEtag(undefined)).toBeUndefined();
  });
});
