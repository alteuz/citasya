/**
 * IND-10 — Casos de prueba de interoperabilidad TC-01 a TC-10 (sección 6.3.3).
 *
 * Corren contra un servidor HAPI FHIR R4 real con el mismo código que usa la
 * Edge Function `fhir-sync` (mapeador, cliente y sincronizador) y solo datos
 * sintéticos. Un caso pasa si el servidor responde lo esperado y, cuando
 * aplica, `$validate` no reporta errores.
 *
 *   npm run test:fhir                                          HAPI en http://localhost:8080/fhir
 *   FHIR_BASE_URL=https://hapi.fhir.org/baseR4 npm run test:fhir   servidor público de pruebas
 */
import { describe, expect, inject, it } from 'vitest';
import { crearClienteFhir, ErrorFhir } from '../../supabase/functions/_shared/fhir/cliente.ts';
import {
  agenda, bundleCita, bundlesMaestros, etiquetaVersion, franja, idFhir, organizacionEps, organizacionIps,
  paciente, profesional, rolProfesional, SISTEMAS, ubicacion, urlCondicionalPaciente, urnPaciente,
  type CitaFuente, type EntradaEsperada, type FranjaFuente,
} from '../../supabase/functions/_shared/fhir/mapeador.ts';
import { leerRespuestaTransaccion, type Vinculo } from '../../supabase/functions/_shared/fhir/respuesta.ts';
import {
  procesarLote, type EventoCita, type RepositorioOutbox,
} from '../../supabase/functions/_shared/fhir/sincronizador.ts';
import type { Appointment, Bundle, BundleEntry, OperationOutcome, Slot } from '../../supabase/functions/_shared/fhir/tipos.ts';
import {
  citaSintetica, epsSintetica, fechaBogota, franjaSintetica, medicoSintetico, sedeSintetica, seudonimoSintetico,
} from './datos-sinteticos.ts';

declare module 'vitest' {
  export interface ProvidedContext {
    fhirBase: string;
  }
}

const base = inject('fhirBase');
const cliente = crearClienteFhir({ base, tiempoMaximoMs: 60_000 });
const hoy = fechaBogota();

// ─── Escenario sintético ────────────────────────────────────────────────────
// Una EPS, una IPS con su sede y un médico con seis franjas libres dentro de
// una semana, una ocupada por otro canal y una libre que ya pasó.

const eps = epsSintetica();
const sede = sedeSintetica();
const medico = medicoSintetico({ eps, sede });
const dia = fechaBogota(7);

function veinteMinutosDespues(hora: string): string {
  const total = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)) + 20;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
}

const franjas: readonly FranjaFuente[] = ['07:00', '07:20', '07:40', '08:00', '08:20', '08:40']
  .map((hora) => franjaSintetica(dia, `${hora}:00`, veinteMinutosDespues(hora), false));
const ocupadaPorOtroCanal = franjaSintetica(dia, '09:00:00', '09:20:00', true);
const yaPasada = franjaSintetica(fechaBogota(-1), '07:00:00', '07:20:00', false);

function libre(indice: number): FranjaFuente {
  const horario = franjas[indice];
  if (!horario) throw new Error(`No existe la franja ${indice}.`);
  return horario;
}

// ─── Utilidades ─────────────────────────────────────────────────────────────

/** Versión publicada de cada recurso (id FHIR → versionId), igual que `fhir_vinculos`. */
const versiones = new Map<string, string>();
const guardar = (vinculos: readonly Vinculo[]) => {
  for (const vinculo of vinculos) versiones.set(vinculo.idFhir, vinculo.version);
};
const versionesDeFranjas = () => Object.fromEntries([...versiones].filter(([id]) => id.startsWith('citasya-franja-')));

const entradas = (bundle: Bundle) => bundle.entry ?? [];
const errores = (resultado: OperationOutcome) => resultado.issue.filter((p) => p.severity === 'error' || p.severity === 'fatal');
const explicar = (resultado: OperationOutcome) => errores(resultado).map((p) => p.diagnostics ?? p.code).join(' | ');

async function publicar(datos: CitaFuente): Promise<void> {
  const { bundle, esperadas } = bundleCita(datos, { hoy, versiones: versionesDeFranjas() });
  guardar(leerRespuestaTransaccion(await cliente.transaccion(bundle), esperadas));
}

function entradaDeFranja(horario: FranjaFuente): readonly [BundleEntry, EntradaEsperada] {
  return [
    { resource: franja(horario, medico), request: { method: 'PUT', url: `Slot/${idFhir.franja(horario.id)}` } },
    { recurso: 'Slot', claveLocal: `availability_slots/${horario.id}` },
  ];
}

/** Outbox en memoria con la misma semántica que `private.fhir_outbox` (TC-10). */
function crearOutboxEnMemoria() {
  const cola: EventoCita[] = [];
  const estados = new Map<string, { estado: string; intentos: number }>();
  let siguiente = 1;
  const repositorio: RepositorioOutbox = {
    async tomarEventos(limite) {
      return cola.splice(0, limite).map((evento) => ({ ...evento, versiones: versionesDeFranjas() }));
    },
    async registrar(evento, resultado) {
      const previo = estados.get(evento.cita.id);
      estados.set(evento.cita.id, { estado: resultado.estado, intentos: (previo?.intentos ?? 0) + 1 });
      guardar(resultado.vinculos);
      if (resultado.estado === 'pendiente') cola.push(evento);
    },
  };
  return {
    repositorio,
    encolar(datos: CitaFuente) {
      cola.push({ ids: [siguiente++], cita: datos, versiones: {} });
    },
    estado: (idCita: string) => estados.get(idCita),
  };
}

let reservada: CitaFuente | undefined;

// ─── Casos ──────────────────────────────────────────────────────────────────

describe(`IND-10 · interoperabilidad con HAPI FHIR R4 (${base})`, () => {
  it('TC-01 · el CapabilityStatement declara FHIR 4.0.1 y las interacciones de Patient, Schedule, Slot y Appointment', async () => {
    const capacidades = await cliente.capacidades();
    expect(capacidades.resourceType).toBe('CapabilityStatement');
    expect(capacidades.fhirVersion).toBe('4.0.1');
    const recursos = new Map(
      (capacidades.rest?.[0]?.resource ?? []).map((r) => [r.type, new Set((r.interaction ?? []).map((i) => i.code))]),
    );
    for (const tipo of ['Patient', 'Schedule', 'Slot', 'Appointment']) {
      for (const interaccion of ['read', 'update', 'search-type']) {
        expect(recursos.get(tipo)?.has(interaccion), `${tipo}: ${interaccion}`).toBe(true);
      }
    }
  });

  it('TC-02 · la carga inicial publica los recursos maestros y las franjas en un Bundle de transacción', async () => {
    const [maestros] = bundlesMaestros({ eps: [eps], sedes: [sede], medicos: [medico] }, hoy);
    if (!maestros) throw new Error('No se generó la carga inicial.');
    const deFranjas = [...franjas, ocupadaPorOtroCanal, yaPasada].map(entradaDeFranja);
    const bundle: Bundle = { ...maestros.bundle, entry: [...entradas(maestros.bundle), ...deFranjas.map(([entrada]) => entrada)] };

    const vinculos = leerRespuestaTransaccion(
      await cliente.transaccion(bundle),
      [...maestros.esperadas, ...deFranjas.map(([, esperada]) => esperada)],
    );
    guardar(vinculos);
    expect(vinculos).toHaveLength(14);
    expect(new Set(vinculos.map((v) => v.recurso))).toEqual(
      new Set(['Organization', 'Location', 'Practitioner', 'PractitionerRole', 'Schedule', 'Slot']),
    );
  });

  it('TC-03 · $validate no reporta errores en ningún tipo de recurso maestro', async () => {
    const recursos = [
      organizacionEps(eps), organizacionIps(sede.prestador), ubicacion(sede),
      profesional(medico), rolProfesional(medico), agenda(medico, hoy), franja(libre(0), medico),
    ];
    for (const recurso of recursos) {
      const resultado = await cliente.validar(recurso);
      expect(errores(resultado), `${recurso.resourceType}: ${explicar(resultado)}`).toEqual([]);
    }
  });

  it('TC-04 · la actualización condicional deja un solo Patient aunque se envíe dos veces', async () => {
    const datos = { claveLocal: 'profiles/sintetico', seudonimo: seudonimoSintetico() };
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [{ fullUrl: urnPaciente(datos.seudonimo), resource: paciente(datos), request: { method: 'PUT', url: urlCondicionalPaciente(datos.seudonimo) } }],
    };
    const esperadas: EntradaEsperada[] = [{ recurso: 'Patient', claveLocal: datos.claveLocal }];

    const [primero] = leerRespuestaTransaccion(await cliente.transaccion(bundle), esperadas);
    const [segundo] = leerRespuestaTransaccion(await cliente.transaccion(bundle), esperadas);
    expect(segundo?.idFhir).toBe(primero?.idFhir);
    const encontrados = await cliente.buscar('Patient', { identifier: `${SISTEMAS.seudonimo}|${datos.seudonimo}` });
    expect(entradas(encontrados)).toHaveLength(1);
    const resultado = await cliente.validar(paciente(datos));
    expect(errores(resultado), explicar(resultado)).toEqual([]);
  });

  it('TC-05 · la búsqueda de franjas libres de un profesional devuelve solo las libres y futuras', async () => {
    const resultado = await cliente.buscar('Slot', {
      schedule: `Schedule/${idFhir.agenda(medico.id)}`,
      status: 'free',
      start: `ge${new Date().toISOString()}`,
      _count: '50',
    });
    const ids = entradas(resultado).map((e) => e.resource?.id).sort();
    expect(ids).toEqual(franjas.map((f) => idFhir.franja(f.id)).sort());
  });

  it('TC-06 · reservar publica la franja ocupada (If-Match) y la cita booked en una sola transacción', async () => {
    const datos = citaSintetica(medico, { ...libre(0), ocupada: true });
    const idFranja = idFhir.franja(libre(0).id);
    const versionPrevia = versiones.get(idFranja) ?? '';
    const { bundle } = bundleCita(datos, { hoy, versiones: versionesDeFranjas() });
    expect(entradas(bundle).find((e) => e.request?.url === `Slot/${idFranja}`)?.request?.ifMatch).toBe(etiquetaVersion(versionPrevia));

    await publicar(datos);
    reservada = datos;
    const slot = await cliente.leer<Slot>('Slot', idFranja);
    expect(slot.status).toBe('busy');
    expect(Number(slot.meta?.versionId)).toBe(Number(versionPrevia) + 1);
    const cita = await cliente.leer<Appointment>('Appointment', idFhir.cita(datos.id));
    expect(cita.status).toBe('booked');
    expect(cita.slot?.[0]?.reference).toBe(`Slot/${idFranja}`);
    expect(cita.participant[0]?.actor?.reference).toMatch(/^Patient\//);
    const resultado = await cliente.validar(cita);
    expect(errores(resultado), explicar(resultado)).toEqual([]);
  });

  it('TC-07 · dos reservas simultáneas de la misma franja: una gana y la otra falla por versión, sin doble reserva', async () => {
    const horario = { ...libre(1), ocupada: true };
    const idFranja = idFhir.franja(horario.id);
    const leidaPorAmbas = { [idFranja]: versiones.get(idFranja) ?? '1' };
    const resultados = await Promise.allSettled(
      [citaSintetica(medico, horario), citaSintetica(medico, horario)]
        .map((datos) => cliente.transaccion(bundleCita(datos, { hoy, versiones: leidaPorAmbas }).bundle)),
    );

    const rechazados = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rechazados).toHaveLength(1);
    const error: unknown = rechazados[0]?.reason;
    expect(error).toBeInstanceOf(ErrorFhir);
    // La especificación FHIR admite 412 Precondition Failed; HAPI responde 409 Conflict (HAPI-0989).
    expect([409, 412]).toContain((error as ErrorFhir).status);
    const citas = await cliente.buscar('Appointment', { slot: `Slot/${idFranja}`, status: 'booked' });
    expect(entradas(citas)).toHaveLength(1);
  });

  it('TC-08 · cancelar deja la cita cancelled con su motivo y la franja vuelve a free', async () => {
    if (!reservada) throw new Error('TC-08 depende de la reserva de TC-06.');
    const cancelada: CitaFuente = { ...reservada, estado: 'cancelled', franja: { ...reservada.franja, ocupada: false } };
    await publicar(cancelada);
    const cita = await cliente.leer<Appointment>('Appointment', idFhir.cita(cancelada.id));
    expect(cita.status).toBe('cancelled');
    expect(cita.cancelationReason?.coding?.[0]?.code).toBe('pat-cpp');
    expect((await cliente.leer<Slot>('Slot', idFhir.franja(cancelada.franja.id))).status).toBe('free');
  });

  it('TC-09 · reprogramar mueve la cita a otra franja y la anterior queda free', async () => {
    const original = citaSintetica(medico, { ...libre(2), ocupada: true });
    await publicar(original);
    await publicar({ ...original, franja: { ...libre(3), ocupada: true }, franjasAnteriores: [{ ...libre(2), ocupada: false }] });

    const cita = await cliente.leer<Appointment>('Appointment', idFhir.cita(original.id));
    expect(cita.status).toBe('booked');
    expect(cita.slot?.[0]?.reference).toBe(`Slot/${idFhir.franja(libre(3).id)}`);
    expect(cita.start).toBe(`${dia}T${libre(3).inicio}-05:00`);
    expect((await cliente.leer<Slot>('Slot', idFhir.franja(libre(2).id))).status).toBe('free');
    expect((await cliente.leer<Slot>('Slot', idFhir.franja(libre(3).id))).status).toBe('busy');
  });

  it('TC-10 · con el servidor caído el evento queda pendiente y se publica al volver, sin duplicados', async () => {
    const outbox = crearOutboxEnMemoria();
    const datos = citaSintetica(medico, { ...libre(4), ocupada: true });
    outbox.encolar(datos);

    const caido = crearClienteFhir({ base: 'http://127.0.0.1:9/fhir', tiempoMaximoMs: 5_000 });
    expect(await procesarLote({ repositorio: outbox.repositorio, cliente: caido, hoy })).toMatchObject({ procesados: 1, pendientes: 1 });
    expect(outbox.estado(datos.id)).toEqual({ estado: 'pendiente', intentos: 1 });

    expect(await procesarLote({ repositorio: outbox.repositorio, cliente, hoy })).toMatchObject({ procesados: 1, publicados: 1 });
    expect(outbox.estado(datos.id)).toEqual({ estado: 'publicado', intentos: 2 });

    // El mismo evento llega dos veces (entrega duplicada): no crea recursos nuevos.
    outbox.encolar(datos);
    expect(await procesarLote({ repositorio: outbox.repositorio, cliente, hoy })).toMatchObject({ publicados: 1 });
    const citas = await cliente.buscar('Appointment', { identifier: `${SISTEMAS.cita}|${datos.id}` });
    expect(entradas(citas)).toHaveLength(1);
    const pacientes = await cliente.buscar('Patient', { identifier: `${SISTEMAS.seudonimo}|${datos.paciente.seudonimo}` });
    expect(entradas(pacientes)).toHaveLength(1);
  });
});
