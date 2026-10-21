// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { ErrorFhir, type ClienteFhir } from './cliente.ts';
import { idFhir } from './mapeador.ts';
import {
  clasificarError, procesarLote, publicarCita,
  type EventoCita, type RepositorioOutbox, type ResultadoPublicacion,
} from './sincronizador.ts';
import type { Bundle, Slot } from './tipos.ts';
import { citaSintetica, franjaSintetica, medicoSintetico } from '../../../../fhir/pruebas/datos-sinteticos.ts';

/** Respuesta correcta: una entrada 200 por cada entrada enviada, en el mismo orden. */
function respuestaExitosa(bundle: Bundle): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'transaction-response',
    entry: (bundle.entry ?? []).map((entrada, i) => {
      const recurso = entrada.resource;
      const id = recurso?.resourceType === 'Patient' ? `p${i}` : recurso?.id;
      return { response: { status: '200 OK', location: `${recurso?.resourceType}/${id}/_history/2`, etag: 'W/"2"' } };
    }),
  };
}

const busqueda = (ids: string[] = []): Bundle => ({
  resourceType: 'Bundle',
  type: 'searchset',
  entry: ids.map((id) => ({ resource: { resourceType: 'Appointment', id, status: 'booked', participant: [] } })),
});

function clienteFalso(cambios: Partial<ClienteFhir> = {}): ClienteFhir {
  return {
    base: 'http://fhir.prueba/fhir',
    capacidades: vi.fn(),
    transaccion: vi.fn(async (bundle: Bundle) => respuestaExitosa(bundle)),
    leer: vi.fn(),
    buscar: vi.fn(async () => busqueda()),
    validar: vi.fn(),
    ...cambios,
  } as ClienteFhir;
}

const conflicto = () => new ErrorFhir('El servidor FHIR respondió 409: HAPI-0989', 409);

function slotEnServidor(id: string, version: string, status: Slot['status']): Slot {
  return {
    resourceType: 'Slot', id, meta: { versionId: version }, status,
    schedule: { reference: 'Schedule/x' }, start: '2026-11-18T08:00:00-05:00', end: '2026-11-18T08:20:00-05:00',
  };
}

function eventoDePrueba(cambios: Parameters<typeof citaSintetica>[2] = {}): EventoCita {
  const medico = medicoSintetico();
  const horario = franjaSintetica('2026-11-18', '08:00:00', '08:20:00', true);
  const cita = citaSintetica(medico, horario, cambios);
  return { ids: [1], cita, versiones: { [idFhir.franja(cita.franja.id)]: '1' } };
}

const slotsDelBundle = (bundle: Bundle) => (bundle.entry ?? []).filter((e) => e.resource?.resourceType === 'Slot');

describe('clasificación de errores', () => {
  it('reintenta lo transitorio, revisa versiones y abandona lo que no tiene arreglo', () => {
    expect(clasificarError(new ErrorFhir('sin red', 0))).toBe('reintentar');
    expect(clasificarError(new ErrorFhir('caído', 503))).toBe('reintentar');
    expect(clasificarError(new ErrorFhir('límite', 429))).toBe('reintentar');
    expect(clasificarError(new ErrorFhir('versión', 409))).toBe('version');
    expect(clasificarError(new ErrorFhir('versión', 412))).toBe('version');
    expect(clasificarError(new ErrorFhir('inválido', 400))).toBe('definitivo');
    expect(clasificarError(new ErrorFhir('inválido', 422))).toBe('definitivo');
    expect(clasificarError(new Error('otro'))).toBe('definitivo');
  });
});

describe('publicarCita', () => {
  it('publica y devuelve el id y la versión de cada recurso', async () => {
    const evento = eventoDePrueba();
    const resultado = await publicarCita(clienteFalso(), evento, '2026-10-19');
    expect(resultado.estado).toBe('publicado');
    expect(resultado.vinculos.map((v) => v.recurso)).toContain('Appointment');
    expect(resultado.vinculos.find((v) => v.recurso === 'Slot')).toMatchObject({ idFhir: idFhir.franja(evento.cita.franja.id), version: '2' });
  });

  it('sin respuesta del servidor el evento queda pendiente', async () => {
    const cliente = clienteFalso({ transaccion: vi.fn(async () => { throw new ErrorFhir('Sin respuesta', 0); }) });
    const resultado = await publicarCita(cliente, eventoDePrueba(), '2026-10-19');
    expect(resultado).toMatchObject({ estado: 'pendiente', error: 'Sin respuesta' });
  });

  it('un recurso rechazado por el servidor queda fallido con su diagnóstico', async () => {
    const cliente = clienteFalso({ transaccion: vi.fn(async () => { throw new ErrorFhir('El servidor FHIR respondió 400: inválido', 400); }) });
    const resultado = await publicarCita(cliente, eventoDePrueba(), '2026-10-19');
    expect(resultado).toMatchObject({ estado: 'fallido', error: expect.stringContaining('400') });
  });

  it('si solo cambió la versión, reintenta con la versión actual del servidor', async () => {
    const evento = eventoDePrueba();
    const idFranja = idFhir.franja(evento.cita.franja.id);
    const transaccion = vi.fn<(b: Bundle) => Promise<Bundle>>()
      .mockRejectedValueOnce(conflicto())
      .mockImplementation(async (b) => respuestaExitosa(b));
    const cliente = clienteFalso({ transaccion, leer: vi.fn(async () => slotEnServidor(idFranja, '7', 'free')) as ClienteFhir['leer'] });

    const resultado = await publicarCita(cliente, evento, '2026-10-19');
    expect(resultado.estado).toBe('publicado');
    const segundo = transaccion.mock.calls[1]?.[0];
    expect(segundo && slotsDelBundle(segundo)[0]?.request?.ifMatch).toBe('W/"7"');
  });

  it('si la franja ya la tiene la propia cita en el servidor, también reintenta', async () => {
    const evento = eventoDePrueba();
    const idFranja = idFhir.franja(evento.cita.franja.id);
    const transaccion = vi.fn<(b: Bundle) => Promise<Bundle>>()
      .mockRejectedValueOnce(conflicto())
      .mockImplementation(async (b) => respuestaExitosa(b));
    const cliente = clienteFalso({
      transaccion,
      leer: vi.fn(async () => slotEnServidor(idFranja, '5', 'busy')) as ClienteFhir['leer'],
      buscar: vi.fn(async () => busqueda([idFhir.cita(evento.cita.id)])),
    });
    expect((await publicarCita(cliente, evento, '2026-10-19')).estado).toBe('publicado');
  });

  it('si otra cita tomó la franja en el servidor, registra el conflicto y no sobrescribe', async () => {
    const evento = eventoDePrueba();
    const idFranja = idFhir.franja(evento.cita.franja.id);
    const transaccion = vi.fn(async () => { throw conflicto(); });
    const cliente = clienteFalso({
      transaccion,
      leer: vi.fn(async () => slotEnServidor(idFranja, '4', 'busy')) as ClienteFhir['leer'],
      buscar: vi.fn(async () => busqueda(['cita-de-otro-canal'])),
    });
    const resultado = await publicarCita(cliente, evento, '2026-10-19');
    expect(resultado.estado).toBe('conflicto');
    expect(resultado.error).toContain('Appointment/cita-de-otro-canal');
    expect(transaccion).toHaveBeenCalledTimes(1);
  });

  it('al cancelar no libera una franja que en el servidor ya usa otra cita', async () => {
    const evento = eventoDePrueba({ estado: 'cancelled' });
    const idFranja = idFhir.franja(evento.cita.franja.id);
    const transaccion = vi.fn<(b: Bundle) => Promise<Bundle>>()
      .mockRejectedValueOnce(conflicto())
      .mockImplementation(async (b) => respuestaExitosa(b));
    const cliente = clienteFalso({
      transaccion,
      leer: vi.fn(async () => slotEnServidor(idFranja, '9', 'busy')) as ClienteFhir['leer'],
      buscar: vi.fn(async () => busqueda(['cita-de-otro-canal'])),
    });
    expect((await publicarCita(cliente, evento, '2026-10-19')).estado).toBe('publicado');
    const segundo = transaccion.mock.calls[1]?.[0];
    expect(segundo && slotsDelBundle(segundo)).toHaveLength(0);
  });

  it('si el conflicto de versión persiste, el evento queda pendiente', async () => {
    const evento = eventoDePrueba();
    const idFranja = idFhir.franja(evento.cita.franja.id);
    const cliente = clienteFalso({
      transaccion: vi.fn(async () => { throw conflicto(); }),
      leer: vi.fn(async () => slotEnServidor(idFranja, '8', 'free')) as ClienteFhir['leer'],
    });
    const resultado = await publicarCita(cliente, evento, '2026-10-19');
    expect(resultado).toMatchObject({ estado: 'pendiente', error: expect.stringContaining('persiste') });
  });
});

describe('procesarLote', () => {
  it('publica cita por cita y registra cada resultado', async () => {
    const eventos = [eventoDePrueba(), eventoDePrueba()];
    const registrados: ResultadoPublicacion[] = [];
    const repositorio: RepositorioOutbox = {
      tomarEventos: vi.fn(async () => eventos),
      registrar: vi.fn(async (_evento, resultado) => { registrados.push(resultado); }),
    };
    const transaccion = vi.fn<(b: Bundle) => Promise<Bundle>>()
      .mockImplementationOnce(async (b) => respuestaExitosa(b))
      .mockRejectedValueOnce(new ErrorFhir('Sin respuesta', 0));

    const resumen = await procesarLote({ repositorio, cliente: clienteFalso({ transaccion }), hoy: '2026-10-19', limite: 5 });
    expect(resumen).toEqual({ procesados: 2, publicados: 1, pendientes: 1, conflictos: 0, fallidos: 0 });
    expect(repositorio.tomarEventos).toHaveBeenCalledWith(5);
    expect(registrados.map((r) => r.estado)).toEqual(['publicado', 'pendiente']);
  });
});
