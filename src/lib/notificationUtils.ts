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

const CLINIC_CLOSING = "¡Te esperamos en C.C Novocentro piso 1, local 1-02, Puerto La Cruz! Llega 5 minutos antes para tu ficha clínica.";

interface NotificationContext {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  doctorName?: string;
  doctorPhone?: string;
  treatment: string;
  date: string;
  time: string;
  /** Is the assigned doctor a staff (own) doctor vs a tenant? */
  isStaffDoctor?: boolean;
}

/**
 * Schedule a patient notification for a status change.
 * NEVER includes financial amounts.
 */
export async function schedulePatientNotification(
  type: "confirmation" | "reschedule" | "cancellation" | "modification",
  ctx: NotificationContext
) {
  const greeting = getCaracasGreeting();
  let message = "";

  switch (type) {
    case "confirmation":
      message = `✅ ${greeting} ${ctx.patientName}, su cita para ${ctx.treatment} con ${ctx.doctorName || "su especialista"} ha sido confirmada para el ${ctx.date} a las ${ctx.time}. ${CLINIC_CLOSING}`;
      break;
    case "reschedule":
      message = `📅 ${greeting} ${ctx.patientName}, su cita ha sido reagendada. Nueva fecha: ${ctx.date} a las ${ctx.time} — Tratamiento: ${ctx.treatment}. ${CLINIC_CLOSING}`;
      break;
    case "cancellation":
      message = `❌ ${greeting} ${ctx.patientName}, lamentamos informarle que su cita de ${ctx.treatment} para el ${ctx.date} a las ${ctx.time} ha sido cancelada. Si desea reagendar, contáctenos al 0422-7180013.`;
      break;
    case "modification":
      message = `📝 ${greeting} ${ctx.patientName}, su cita ha sido actualizada. Tratamiento: ${ctx.treatment}, Fecha: ${ctx.date}, Hora: ${ctx.time}. ${CLINIC_CLOSING}`;
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

/**
 * Schedule a doctor (staff) notification — includes patient name, treatment, date, time.
 */
export async function scheduleStaffDoctorNotification(
  type: "new_appointment" | "reschedule" | "cancellation" | "modification",
  ctx: NotificationContext
) {
  if (!ctx.doctorPhone) return;

  const labels: Record<string, string> = {
    new_appointment: "🆕 Nueva cita asignada",
    reschedule: "📅 Cita reagendada",
    cancellation: "❌ Cita cancelada",
    modification: "📝 Cita modificada",
  };

  const message = `${labels[type]}: Paciente ${ctx.patientName}, Tratamiento: ${ctx.treatment}, Fecha: ${ctx.date}, Hora: ${ctx.time}.`;

  await supabase.from("scheduled_notifications").insert({
    type: `doctor_${type}`,
    appointment_id: ctx.appointmentId,
    patient_name: ctx.doctorName || "Doctor",
    phone: ctx.doctorPhone,
    message,
    scheduled_for: new Date().toISOString(),
  });
}

/**
 * Schedule a tenant doctor notification — PRIVACY: NO patient name, only logistics.
 */
export async function scheduleTenantDoctorNotification(
  type: "new_appointment" | "reschedule" | "cancellation" | "modification",
  ctx: NotificationContext & { tenantPhone: string }
) {
  if (!ctx.tenantPhone) return;

  const labels: Record<string, string> = {
    new_appointment: "🆕 Nuevo bloque asignado",
    reschedule: "📅 Bloque reagendado",
    cancellation: "❌ Bloque cancelado",
    modification: "📝 Bloque modificado",
  };

  // CRITICAL: No patient name for tenant privacy
  const message = `${labels[type]}: Fecha: ${ctx.date}, Hora: ${ctx.time}, Tratamiento: ${ctx.treatment}.`;

  await supabase.from("scheduled_notifications").insert({
    type: `tenant_${type}`,
    appointment_id: ctx.appointmentId,
    patient_name: "Inquilino",
    phone: ctx.tenantPhone,
    message,
    scheduled_for: new Date().toISOString(),
  });
}

/**
 * Dispatch all relevant notifications for an appointment status change.
 * Determines whether the doctor is staff or tenant and sends accordingly.
 */
export async function dispatchStatusChangeNotifications(
  type: "confirmation" | "reschedule" | "cancellation" | "modification",
  ctx: NotificationContext,
  doctors: Array<{ id: string; name: string; phone: string }>,
  tenants?: Array<{ id: string; firstName: string; lastName: string; phone: string }>
) {
  const doctor = doctors.find(d => d.id === ctx.appointmentId ? false : true) // find by matching
    ? doctors.find(d => d.name === ctx.doctorName || d.phone === ctx.doctorPhone)
    : undefined;
  
  // Map type for doctor notification
  const doctorType = type === "confirmation" ? "new_appointment" : type;

  // 1. Patient notification (always)
  await schedulePatientNotification(type, ctx);

  // 2. Staff doctor notification (if doctor is in doctors list)
  if (ctx.doctorPhone) {
    await scheduleStaffDoctorNotification(doctorType, ctx);
  }
}
