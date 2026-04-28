/**
 * CitasYA — Edge Function: send-email
 *
 * Envía correos transaccionales (confirmación, cancelación, reprogramación)
 * usando la API de Resend y registra el resultado en la tabla `notifications`.
 *
 * Payload esperado:
 *   { appointmentId: string, type: 'confirmation' | 'cancellation' | 'rescheduled' }
 */

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface EmailPayload {
  readonly appointmentId: string;
  readonly type: "confirmation" | "cancellation" | "rescheduled";
}

interface AppointmentData {
  readonly patientEmail: string;
  readonly patientName: string;
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

// ─── Templates de Email ─────────────────────────────────────────────────────

function buildEmailContent(
  type: EmailPayload["type"],
  data: AppointmentData,
): { subject: string; html: string } {
  const dateFormatted = formatDateLong(data.slotDate);
  const timeFormatted = `${formatTime(data.slotStartTime)} - ${formatTime(data.slotEndTime)}`;
  const modeLabel =
    data.mode === "presencial" ? "🏥 Presencial" : "💻 Telemedicina";

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

  const detailsBlock = `
    <div style="background: #ffffff; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #e2e8f0;">
      <div style="${infoRowStyle}">
        <span style="color: #64748b; font-size: 14px;">Médico</span>
        <span style="color: #1e293b; font-weight: 600; font-size: 14px;">${data.doctorName}</span>
      </div>
      <div style="${infoRowStyle}">
        <span style="color: #64748b; font-size: 14px;">Especialidad</span>
        <span style="color: #1e293b; font-weight: 600; font-size: 14px;">${data.specialtyName}</span>
      </div>
      <div style="${infoRowStyle}">
        <span style="color: #64748b; font-size: 14px;">EPS</span>
        <span style="color: #1e293b; font-weight: 600; font-size: 14px;">${data.epsName}</span>
      </div>
      <div style="${infoRowStyle}">
        <span style="color: #64748b; font-size: 14px;">Fecha</span>
        <span style="color: #1e293b; font-weight: 600; font-size: 14px;">${dateFormatted}</span>
      </div>
      <div style="${infoRowStyle}">
        <span style="color: #64748b; font-size: 14px;">Hora</span>
        <span style="color: #1e293b; font-weight: 600; font-size: 14px;">${timeFormatted}</span>
      </div>
      <div style="${infoRowStyle} border-bottom: none;">
        <span style="color: #64748b; font-size: 14px;">Modalidad</span>
        <span style="color: #1e293b; font-weight: 600; font-size: 14px;">${modeLabel}</span>
      </div>
    </div>
  `;

  switch (type) {
    case "confirmation":
      return {
        subject: "✅ Tu cita ha sido agendada — CitasYA",
        html: `
          <div style="${baseStyles}">
            <div style="${headerStyle}">
              <h1 style="color: #0f172a; font-size: 24px; margin: 0;">🎉 ¡Cita confirmada!</h1>
              <p style="color: #64748b; margin: 8px 0 0;">Hola ${data.patientName}, tu cita ha sido agendada exitosamente.</p>
            </div>
            ${detailsBlock}
            <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 24px;">
              Recuerda que puedes cancelar o reprogramar tu cita con al menos 24 horas de anticipación desde tu panel en CitasYA.
            </p>
            <div style="text-align: center; margin-top: 16px;">
              <p style="color: #94a3b8; font-size: 12px;">CitasYA — Tu salud. Donde estés. Cuando la necesites.</p>
            </div>
          </div>
        `,
      };

    case "cancellation":
      return {
        subject: "❌ Tu cita ha sido cancelada — CitasYA",
        html: `
          <div style="${baseStyles}">
            <div style="${headerStyle}">
              <h1 style="color: #0f172a; font-size: 24px; margin: 0;">Cita cancelada</h1>
              <p style="color: #64748b; margin: 8px 0 0;">Hola ${data.patientName}, tu cita ha sido cancelada según tu solicitud.</p>
            </div>
            ${detailsBlock}
            <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 24px;">
              Si necesitas agendar una nueva cita, puedes hacerlo desde tu panel en CitasYA.
            </p>
            <div style="text-align: center; margin-top: 16px;">
              <p style="color: #94a3b8; font-size: 12px;">CitasYA — Tu salud. Donde estés. Cuando la necesites.</p>
            </div>
          </div>
        `,
      };

    case "rescheduled":
      return {
        subject: "🔄 Tu cita ha sido reprogramada — CitasYA",
        html: `
          <div style="${baseStyles}">
            <div style="${headerStyle}">
              <h1 style="color: #0f172a; font-size: 24px; margin: 0;">Cita reprogramada</h1>
              <p style="color: #64748b; margin: 8px 0 0;">Hola ${data.patientName}, tu cita ha sido reprogramada exitosamente.</p>
            </div>
            ${detailsBlock}
            <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 24px;">
              Si necesitas hacer otro cambio, recuerda que debes hacerlo con al menos 24 horas de anticipación.
            </p>
            <div style="text-align: center; margin-top: 16px;">
              <p style="color: #94a3b8; font-size: 12px;">CitasYA — Tu salud. Donde estés. Cuando la necesites.</p>
            </div>
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

    const payload: EmailPayload = await req.json();

    if (!payload.appointmentId || !payload.type) {
      return new Response(
        JSON.stringify({ error: "Faltan campos: appointmentId, type" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Crear cliente Supabase con service_role para acceso completo
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Obtener datos completos de la cita
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select(`
        id,
        mode,
        doctors(full_name),
        specialties(name),
        eps(name),
        availability_slots(date, start_time, end_time),
        profiles!appointments_patient_id_fkey(email, full_name)
      `)
      .eq("id", payload.appointmentId)
      .single();

    if (fetchError || !appointment) {
      console.error("Error fetching appointment:", fetchError);
      return new Response(
        JSON.stringify({ error: "Cita no encontrada." }),
        { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const appointmentData: AppointmentData = {
      patientEmail: (appointment as any).profiles?.email ?? "",
      patientName: (appointment as any).profiles?.full_name ?? "Paciente",
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
      return new Response(
        JSON.stringify({ error: "Email del paciente no disponible." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
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

    console.log(`Email ${emailStatus} to ${appointmentData.patientEmail}:`, emailResult);

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

    return new Response(
      JSON.stringify({
        success: emailResponse.ok,
        emailId: emailResult.id ?? null,
        status: emailStatus,
      }),
      {
        status: emailResponse.ok ? 200 : 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Edge Function error:", err);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
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
