/**
 * CitasYA — Edge Function: send-email
 *
 * Envía correos transaccionales (confirmación, cancelación y reprogramación)
 * con la API de Resend y registra el resultado en la tabla `notifications`.
 *
 * Payload esperado:
 *   { appointmentId: string, type: 'confirmation' | 'cancellation' | 'rescheduled' }
 *
 * Seguridad (H-38): la función usa la clave service_role, así que verifica por
 * sí misma quién la llama: exige un JWT de usuario válido y que la cita le
 * pertenezca (antes cualquiera podía disparar correos sobre citas ajenas), y
 * escapa todo dato que inserta en el HTML.
 *
 * Modelo familiar (RF-13): si la cita es para un familiar, el correo llega al
 * titular de la cuenta e indica para quién es la cita.
 */

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ─── Tipos ──────────────────────────────────────────────────────────────────

const TIPOS = ["confirmation", "cancellation", "rescheduled"] as const;
type TipoCorreo = (typeof TIPOS)[number];

interface EmailPayload {
  readonly appointmentId: string;
  readonly type: TipoCorreo;
}

interface AppointmentData {
  readonly patientEmail: string;
  readonly patientName: string;
  /** Nombre del familiar para quien es la cita; nulo si es del titular. */
  readonly familiarName: string | null;
  readonly doctorName: string;
  readonly specialtyName: string;
  readonly epsName: string;
  readonly slotDate: string;
  readonly slotStartTime: string;
  readonly slotEndTime: string;
  readonly mode: string;
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "CitasYA <onboarding@resend.dev>";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const responder = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

/** Escapa texto para insertarlo en HTML (los nombres los escriben los usuarios). */
function esc(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ─── Templates de Email ─────────────────────────────────────────────────────

function buildEmailContent(
  type: TipoCorreo,
  data: AppointmentData,
): { subject: string; html: string } {
  const dateFormatted = formatDateLong(data.slotDate);
  const timeFormatted = `${formatTime(data.slotStartTime)} - ${formatTime(data.slotEndTime)}`;
  const modeLabel =
    data.mode === "presencial" ? "🏥 Presencial" : "💻 Telemedicina";
  const titular = esc(data.patientName);
  const familiar = data.familiarName ? esc(data.familiarName) : null;
  // «tu cita» o «la cita de <familiar>»
  const laCita = familiar ? `la cita de ${familiar}` : "tu cita";
  const asuntoPara = data.familiarName ? ` de ${data.familiarName.split(" ")[0]}` : "";

  const baseStyles = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 32px 24px;
    background-color: #f8fafc;
    border-radius: 16px;
  `;

  const headerStyle = `
    text-align: center;
    padding-bottom: 24px;
    border-bottom: 2px solid #e2e8f0;
    margin-bottom: 24px;
  `;

  const infoRowStyle = `
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f1f5f9;
  `;

  const fila = (etiqueta: string, valor: string, ultima = false) => `
      <div style="${infoRowStyle}${ultima ? " border-bottom: none;" : ""}">
        <span style="color: #64748b; font-size: 14px;">${etiqueta}</span>
        <span style="color: #1e293b; font-weight: 600; font-size: 14px;">${valor}</span>
      </div>`;

  const detailsBlock = `
    <div style="background: #ffffff; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #e2e8f0;">
      ${familiar ? fila("Paciente", familiar) : ""}
      ${fila("Médico", esc(data.doctorName))}
      ${fila("Especialidad", esc(data.specialtyName))}
      ${fila("EPS", esc(data.epsName))}
      ${fila("Fecha", esc(dateFormatted))}
      ${fila("Hora", esc(timeFormatted))}
      ${fila("Modalidad", modeLabel, true)}
    </div>
  `;

  const pie = `
            <div style="text-align: center; margin-top: 16px;">
              <p style="color: #94a3b8; font-size: 12px;">CitasYA — Tu salud. Donde estés. Cuando la necesites.</p>
            </div>`;

  switch (type) {
    case "confirmation":
      return {
        subject: `✅ Cita${asuntoPara} agendada — CitasYA`,
        html: `
          <div style="${baseStyles}">
            <div style="${headerStyle}">
              <h1 style="color: #0f172a; font-size: 24px; margin: 0;">🎉 ¡Cita confirmada!</h1>
              <p style="color: #64748b; margin: 8px 0 0;">Hola ${titular}, ${laCita} ha sido agendada exitosamente.</p>
            </div>
            ${detailsBlock}
            <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 24px;">
              Recuerda que puedes cancelar o reprogramar la cita con al menos 24 horas de anticipación desde tu panel en CitasYA.
            </p>
            ${pie}
          </div>
        `,
      };

    case "cancellation":
      return {
        subject: `❌ Cita${asuntoPara} cancelada — CitasYA`,
        html: `
          <div style="${baseStyles}">
            <div style="${headerStyle}">
              <h1 style="color: #0f172a; font-size: 24px; margin: 0;">Cita cancelada</h1>
              <p style="color: #64748b; margin: 8px 0 0;">Hola ${titular}, ${laCita} ha sido cancelada según tu solicitud.</p>
            </div>
            ${detailsBlock}
            <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 24px;">
              Si necesitas agendar una nueva cita, puedes hacerlo desde tu panel en CitasYA.
            </p>
            ${pie}
          </div>
        `,
      };

    case "rescheduled":
      return {
        subject: `🔄 Cita${asuntoPara} reprogramada — CitasYA`,
        html: `
          <div style="${baseStyles}">
            <div style="${headerStyle}">
              <h1 style="color: #0f172a; font-size: 24px; margin: 0;">Cita reprogramada</h1>
              <p style="color: #64748b; margin: 8px 0 0;">Hola ${titular}, ${laCita} ha sido reprogramada exitosamente.</p>
            </div>
            ${detailsBlock}
            <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 24px;">
              Si necesitas hacer otro cambio, recuerda que debes hacerlo con al menos 24 horas de anticipación.
            </p>
            ${pie}
          </div>
        `,
      };
  }
}

// ─── Handler principal ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY no está configurada.");
    }

    const payload = (await req.json()) as Partial<EmailPayload>;
    if (!payload.appointmentId || !payload.type || !TIPOS.includes(payload.type)) {
      return responder({ error: "Faltan campos o el tipo no es válido: appointmentId, type" }, 400);
    }

    // Cliente con service_role: por eso la función verifica por sí misma quién llama.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // H-38: solo un usuario autenticado, y solo sobre sus propias citas.
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = jwt
      ? await supabaseAdmin.auth.getUser(jwt)
      : { data: { user: null } };
    if (!user) {
      return responder({ error: "Debes iniciar sesión." }, 401);
    }

    // Obtener datos completos de la cita
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select(`
        id,
        mode,
        patient_id,
        familiares(nombre_completo),
        doctors(full_name),
        specialties(name),
        eps(name),
        availability_slots(date, start_time, end_time),
        profiles!appointments_patient_id_fkey(email, full_name)
      `)
      .eq("id", payload.appointmentId)
      .single();

    // Una cita ajena se trata igual que una inexistente: no se revela que existe.
    if (fetchError || !appointment || (appointment as any).patient_id !== user.id) {
      return responder({ error: "Cita no encontrada." }, 404);
    }

    const appointmentData: AppointmentData = {
      patientEmail: (appointment as any).profiles?.email ?? "",
      patientName: (appointment as any).profiles?.full_name ?? "Paciente",
      familiarName: (appointment as any).familiares?.nombre_completo ?? null,
      doctorName: (appointment as any).doctors?.full_name ?? "",
      specialtyName: (appointment as any).specialties?.name ?? "",
      epsName: (appointment as any).eps?.name ?? "",
      slotDate: (appointment as any).availability_slots?.date ?? "",
      slotStartTime: (appointment as any).availability_slots?.start_time ?? "",
      slotEndTime: (appointment as any).availability_slots?.end_time ?? "",
      mode: (appointment as any).mode ?? "presencial",
    };

    if (!appointmentData.patientEmail) {
      console.error("No se encontró email del paciente.");
      return responder({ error: "Email del paciente no disponible." }, 400);
    }

    // Construir contenido del email
    const { subject, html } = buildEmailContent(payload.type, appointmentData);

    // Enviar email vía Resend
    const emailResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [appointmentData.patientEmail],
        subject,
        html,
      }),
    });

    const emailResult = await emailResponse.json();
    const emailStatus = emailResponse.ok ? "sent" : "failed";

    console.log(`Email ${emailStatus} (${payload.type}) para la cita ${payload.appointmentId}`);

    // Registrar en tabla notifications
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        appointment_id: payload.appointmentId,
        type: payload.type,
        status: emailStatus,
      });

    if (notifError) {
      console.error("Error registering notification:", notifError);
    }

    return responder(
      { success: emailResponse.ok, emailId: emailResult.id ?? null, status: emailStatus },
      emailResponse.ok ? 200 : 502,
    );
  } catch (err) {
    console.error("Edge Function error:", err);
    return responder({ error: "Error interno del servidor." }, 500);
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const parts = time.split(":");
  const h = parts[0] ?? "0";
  const m = parts[1] ?? "00";
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${suffix}`;
}

function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
