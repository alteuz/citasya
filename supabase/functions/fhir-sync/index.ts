/**
 * CitasYA — Edge Function: fhir-sync (Sprint 3, OE-3, ADR-0009)
 *
 * Publica en un servidor HL7 FHIR R4 los eventos de la outbox transaccional
 * (private.fhir_outbox): cada cita reservada, cancelada o reprogramada viaja en
 * un Bundle de transacción con su paciente seudonimizado, la franja (con
 * If-Match) y los recursos maestros del médico. La lógica vive en
 * ../_shared/fhir, la misma que prueban los casos TC-01 a TC-10.
 *
 * Acciones (POST, cuerpo JSON):
 *   { "accion": "sincronizar" }    publica los eventos pendientes (por defecto)
 *   { "accion": "carga-inicial" }  publica EPS, IPS, sedes, médicos y agendas
 *   { "accion": "estado" }         consulta el CapabilityStatement del servidor
 *
 * Quién puede invocarla (además del JWT que exige la puerta de enlace):
 *   - pg_net y pg_cron, con la cabecera x-citasya-fhir-clave (clave en Vault);
 *   - un administrador con sesión iniciada, desde el panel de interoperabilidad.
 *
 * Configuración: FHIR_BASE_URL (por defecto, el HAPI público de pruebas) y, si
 * el servidor la exige, FHIR_TOKEN. Nunca llegan al navegador.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.105.0";
import { crearClienteFhir } from "../_shared/fhir/cliente.ts";
import type { DatosMaestros } from "../_shared/fhir/mapeador.ts";
import {
  cargarMaestros,
  procesarLote,
  resumenVacio,
  type EventoCita,
  type RepositorioOutbox,
  type ResumenLote,
} from "../_shared/fhir/sincronizador.ts";

// ─── Constantes ─────────────────────────────────────────────────────────────

const SERVIDOR_DE_PRUEBAS = "https://hapi.fhir.org/baseR4";
/** Tiempo de trabajo por invocación; pg_net espera la respuesta hasta 30 s. */
const PRESUPUESTO_MS = 25_000;
const EVENTOS_POR_LOTE = 10;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const describir = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Fecha de hoy en Bogotá (UTC−5, sin horario de verano). */
const hoyEnBogota = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);

// ─── Autorización ───────────────────────────────────────────────────────────

type Autorizacion =
  | { readonly ok: true; readonly quien: "tarea" | "administrador" }
  | { readonly ok: false; readonly status: number; readonly mensaje: string };

async function autorizar(req: Request, admin: SupabaseClient): Promise<Autorizacion> {
  const clave = req.headers.get("x-citasya-fhir-clave");
  if (clave) {
    const { data, error } = await admin.rpc("fhir_validar_clave", { p_clave: clave });
    return !error && data === true
      ? { ok: true, quien: "tarea" }
      : { ok: false, status: 401, mensaje: "Clave de sincronización inválida." };
  }

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return { ok: false, status: 401, mensaje: "Debes iniciar sesión." };
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return { ok: false, status: 401, mensaje: "Debes iniciar sesión." };

  const { data: perfil } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return perfil?.role === "admin"
    ? { ok: true, quien: "administrador" }
    : { ok: false, status: 403, mensaje: "Solo un administrador puede sincronizar con FHIR." };
}

// ─── Outbox en la base de datos ─────────────────────────────────────────────

function repositorioSupabase(admin: SupabaseClient, servidor: string): RepositorioOutbox {
  return {
    async tomarEventos(limite) {
      const { data, error } = await admin.rpc("fhir_tomar_eventos", { p_servidor: servidor, p_limite: limite });
      if (error) throw new Error(`No se pudieron tomar los eventos: ${error.message}`);
      return (data ?? []) as EventoCita[];
    },
    async registrar(evento, resultado) {
      const { error } = await admin.rpc("fhir_registrar_resultado", {
        p_ids: evento.ids,
        p_servidor: servidor,
        p_estado: resultado.estado,
        p_error: resultado.error ?? null,
        p_vinculos: resultado.vinculos,
      });
      if (error) throw new Error(`No se pudo registrar el resultado: ${error.message}`);
    },
  };
}

// ─── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder({ error: "Método no permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const claveServicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !claveServicio) return responder({ error: "Falta la configuración de Supabase." }, 500);
  const admin = createClient(url, claveServicio, { auth: { persistSession: false, autoRefreshToken: false } });

  const autorizacion = await autorizar(req, admin);
  if (!autorizacion.ok) return responder({ error: autorizacion.mensaje }, autorizacion.status);

  let accion = "sincronizar";
  try {
    const cuerpo = await req.json();
    if (typeof cuerpo?.accion === "string") accion = cuerpo.accion;
  } catch {
    // Cuerpo vacío o no JSON: se sincroniza.
  }

  const servidor = (Deno.env.get("FHIR_BASE_URL") || SERVIDOR_DE_PRUEBAS).replace(/\/+$/, "");
  const cliente = crearClienteFhir({ base: servidor, token: Deno.env.get("FHIR_TOKEN") || undefined });
  const hoy = hoyEnBogota();

  try {
    if (accion === "estado") {
      const capacidades = await cliente.capacidades();
      return responder({ accion, servidor, fhirVersion: capacidades.fhirVersion ?? null });
    }

    if (accion === "carga-inicial") {
      const { data, error } = await admin.rpc("fhir_datos_maestros");
      if (error) throw new Error(`No se pudieron leer los datos maestros: ${error.message}`);
      const carga = await cargarMaestros(cliente, data as DatosMaestros, hoy);
      const guardado = await admin.rpc("fhir_guardar_vinculos", { p_servidor: servidor, p_vinculos: carga.vinculos });
      if (guardado.error) throw new Error(`No se pudieron guardar los vínculos: ${guardado.error.message}`);
      return responder({ accion, servidor, bundles: carga.bundles, recursos: carga.vinculos.length });
    }

    if (accion === "sincronizar") {
      const repositorio = repositorioSupabase(admin, servidor);
      const total: ResumenLote = resumenVacio();
      const inicio = Date.now();
      while (Date.now() - inicio < PRESUPUESTO_MS) {
        const lote = await procesarLote({ repositorio, cliente, hoy, limite: EVENTOS_POR_LOTE });
        for (const clave of Object.keys(total) as (keyof ResumenLote)[]) total[clave] += lote[clave];
        if (lote.procesados === 0) break;
      }
      return responder({ accion, servidor, ...total });
    }

    return responder({ error: `Acción desconocida: ${accion}.` }, 400);
  } catch (error) {
    console.error(`fhir-sync (${accion}, ${autorizacion.quien}):`, describir(error));
    return responder({ error: describir(error) }, 502);
  }
});
