import { supabase } from "@/integrations/supabase/client";

/**
 * Get dynamic greeting based on Caracas time (UTC-4)
 */
export function getCaracasGreeting(): string {
  const now = new Date();
  const caracas = new Date(now.toLocaleString("en-US", { timeZone: "America/Caracas" }));
  const hour = caracas.getHours();
  if (hour >= 5 && hour < 12) return "Hola, buen día";
  if (hour >= 12 && hour < 19) return "Hola, buenas tardes";
  return "Hola, buenas noches";
}

const CLINIC_NAME = "Salud Oriente";
const CLINIC_LOCATION = "📍 Ubicación: C.C. Novocentro, Piso 1, Local 1-02, Puerto La Cruz.";
const CLINIC_EARLY_NOTE = "⚠️ Nota: Por favor, llega 5 minutos antes para completar tu ficha clínica.";

interface NotificationContext {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  doctorName?: string;
  doctorPhone?: string;
  treatment: string;
  date: string;
  time: string;
  isStaffDoctor?: boolean;
}

// ─── PATIENT NOTIFICATIONS ───

export async function schedulePatientNotification(
  type: "confirmation" | "reschedule" | "cancellation" | "modification",
  ctx: NotificationContext
) {
  const greeting = getCaracasGreeting();
  let message = "";

  switch (type) {
    case "confirmation":
      message =
        `${greeting}, ${ctx.patientName}. ¡Tu cita en ${CLINIC_NAME} ha sido CONFIRMADA! ✅\n\n` +
        `Dr(a): ${ctx.doctorName || "Por asignar"}\n` +
        `Fecha: ${ctx.date}\n` +
        `Hora: ${ctx.time}\n\n` +
        `${CLINIC_LOCATION}\n` +
        `${CLINIC_EARLY_NOTE}\n\n` +
        `¡Te esperamos!`;
      break;
    case "reschedule":
      message =
        `${greeting}, ${ctx.patientName}. Tu cita en ${CLINIC_NAME} ha sido REAGENDADA con éxito. ✅\n\n` +
        `🗓️ Nueva Fecha: ${ctx.date}\n` +
        `⏰ Nueva Hora: ${ctx.time}\n` +
        `👨‍⚕️ Especialista: ${ctx.doctorName || "Por asignar"}\n\n` +
        `📍 Te esperamos en C.C. Novocentro, Piso 1, Local 1-02. Por favor, llega 5 minutos antes.`;
      break;
    case "cancellation":
      message =
        `❌ ${greeting}, ${ctx.patientName}. Lamentamos informarte que tu cita de ${ctx.treatment} ` +
        `para el ${ctx.date} a las ${ctx.time} ha sido cancelada.\n\n` +
        `Si deseas reagendar, contáctanos al 0422-7180013.`;
      break;
    case "modification":
      message =
        `📝 ${greeting}, ${ctx.patientName}. Tu cita en ${CLINIC_NAME} ha sido actualizada.\n\n` +
        `Tratamiento: ${ctx.treatment}\n` +
        `Fecha: ${ctx.date}\n` +
        `Hora: ${ctx.time}\n\n` +
        `${CLINIC_LOCATION}\n` +
        `${CLINIC_EARLY_NOTE}`;
      break;
  }

  await supabase.from("scheduled_notifications").insert({
    type,
    appointment_id: ctx.appointmentId,
    patient_name: ctx.patientName,
    phone: ctx.patientPhone,
    message,
    scheduled_for: new Date().toISOString(),
  });
}

// ─── STAFF DOCTOR NOTIFICATIONS ───

export async function scheduleStaffDoctorNotification(
  type: "new_appointment" | "reschedule" | "cancellation" | "modification",
  ctx: NotificationContext
) {
  if (!ctx.doctorPhone) return;

  const doctorLastName = (ctx.doctorName || "Doctor").split(" ").slice(-1)[0];

  const labels: Record<string, string> = {
    new_appointment: "Nueva Cita Confirmada",
    reschedule: "Cita Reagendada",
    cancellation: "Cita Cancelada",
    modification: "Cita Modificada",
  };

  const message =
    `Hola Dr(a). ${doctorLastName}, tienes una ${labels[type]}.\n\n` +
    `Paciente: ${ctx.patientName}\n` +
    `Tratamiento: ${ctx.treatment}\n` +
    `Horario: ${ctx.date} - ${ctx.time}`;

  await supabase.from("scheduled_notifications").insert({
    type: `doctor_${type}`,
    appointment_id: ctx.appointmentId,
    patient_name: ctx.doctorName || "Doctor",
    phone: ctx.doctorPhone,
    message,
    scheduled_for: new Date().toISOString(),
  });
}

// ─── TENANT DOCTOR NOTIFICATIONS (PRIVACY: NO PATIENT NAME) ───

export async function scheduleTenantDoctorNotification(
  type: "new_appointment" | "reschedule" | "cancellation" | "modification",
  ctx: NotificationContext & { tenantPhone: string; tenantName?: string }
) {
  if (!ctx.tenantPhone) return;

  const tenantLastName = (ctx.tenantName || "Doctor").split(" ").slice(-1)[0];

  const labels: Record<string, string> = {
    new_appointment: "Turno Confirmado",
    reschedule: "Turno Reagendado",
    cancellation: "Turno Cancelado",
    modification: "Turno Modificado",
  };

  // CRITICAL: No patient name for tenant privacy
  const message =
    `Hola Dr(a). ${tenantLastName}, un nuevo ${labels[type]}.\n\n` +
    `Tratamiento: ${ctx.treatment}\n` +
    `Horario: ${ctx.date} - ${ctx.time}\n\n` +
    `Nota: Los datos del paciente son gestionados por administración.`;

  await supabase.from("scheduled_notifications").insert({
    type: `tenant_${type}`,
    appointment_id: ctx.appointmentId,
    patient_name: "Inquilino",
    phone: ctx.tenantPhone,
    message,
    scheduled_for: new Date().toISOString(),
  });
}

// ─── STAGE 1: RECEPTION (WEB BOOKING → PATIENT) ───

export async function scheduleReceptionNotification(ctx: NotificationContext) {
  const message =
    `Hola ${ctx.patientName}, ${CLINIC_NAME} ha recibido tu solicitud. ` +
    `Actualmente está PENDIENTE DE CONFIRMACIÓN. ` +
    `Te avisaremos por esta vía en cuanto sea aprobada. ¡Gracias por tu paciencia!`;

  await supabase.from("scheduled_notifications").insert({
    type: "reception",
    appointment_id: ctx.appointmentId,
    patient_name: ctx.patientName,
    phone: ctx.patientPhone,
    message,
    scheduled_for: new Date().toISOString(),
  });
}

// ─── ADMIN ALERT (WEB BOOKING → ADMIN EMAIL) ───

export async function scheduleAdminAlertNotification(
  ctx: NotificationContext & { requesterType?: "Paciente" | "Inquilino" }
) {
  const requesterType = ctx.requesterType || "Paciente";

  const message =
    `🚨 Nueva Solicitud de Cita - ${ctx.patientName}\n\n` +
    `Se ha registrado una nueva solicitud pendiente en el sistema.\n\n` +
    `Solicitante: ${ctx.patientName}\n` +
    `Tipo: ${requesterType}\n` +
    `Fecha/Hora: ${ctx.date} a las ${ctx.time}\n` +
    `Tratamiento: ${ctx.treatment}\n\n` +
    `Por favor, ingresa al panel para validar la disponibilidad y confirmar.`;

  await supabase.from("scheduled_notifications").insert({
    type: "admin_alert",
    appointment_id: ctx.appointmentId,
    patient_name: ctx.patientName,
    phone: "admin",
    message,
    scheduled_for: new Date().toISOString(),
  });
}
