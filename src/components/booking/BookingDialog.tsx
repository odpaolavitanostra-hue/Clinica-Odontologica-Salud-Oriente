import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { User, CreditCard, Phone, Mail, CalendarDays, Clock, Stethoscope, HelpCircle, Send } from "lucide-react";
import { useClinicData } from "@/hooks/useClinicData";
import { supabase } from "@/integrations/supabase/client";
import { validateSlot, validateSchedule, isSlotBlockedByTenant, getSmartTimeSlots, getCaracasNow, getCaracasToday } from "@/lib/scheduleUtils";
import { toast } from "sonner";
import WaitlistDialog from "./WaitlistDialog";
import BookingConfirmationModal from "./BookingConfirmationModal";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTreatment?: string;
}

const BookingDialog = ({ open, onOpenChange, initialTreatment }: BookingDialogProps) => {
  const { doctors, treatments, appointments, patients, addAppointment, addPatient, tenants } = useClinicData();

  const [form, setForm] = useState({
    patientName: "",
    patientLastName: "",
    patientCedula: "",
    patientPhone: "",
    patientEmail: "",
    doctorId: "",
    date: "",
    time: "",
    treatment: initialTreatment || "",
    notes: "",
  });
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{ name: string; date: string; time: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const effectiveDoctorId = form.doctorId || doctors[0]?.id || "";
  const effectiveTreatment = form.treatment || initialTreatment || treatments[0]?.name || "";
  const selectedTreatment = treatments.find((t) => t.name === effectiveTreatment);

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const caracasToday = getCaracasToday();
  const caracasNow = getCaracasNow();
  const isToday = form.date === caracasToday;
  const currentHour = caracasNow.getHours();

  const getTimeSlots = () => {
    if (!form.date) return [];
    return getSmartTimeSlots(form.date, appointments, tenants, isToday ? currentHour : undefined, isToday);
  };

  const handleSubmit = async () => {
    const fullName = `${form.patientName.trim()} ${form.patientLastName.trim()}`.trim();
    if (!form.patientName || !form.patientLastName || !form.patientCedula || !form.patientPhone || !form.patientEmail || !form.date || !form.time) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    const scheduleCheck = validateSchedule(form.date, form.time);
    if (!scheduleCheck.valid) {
      toast.error(scheduleCheck.reason);
      return;
    }

    setSubmitting(true);
    try {
      const [{ data: latestAppointments, error: appointmentsError }, { data: latestBlockedSlots, error: blockedSlotsError }] = await Promise.all([
        supabase.from("appointments").select("id, date, time, status"),
        supabase.from("tenant_blocked_slots").select("tenant_id, date, all_day, start_time, end_time"),
      ]);

      if (appointmentsError || blockedSlotsError) {
        toast.error("No se pudo validar la disponibilidad. Intenta nuevamente.");
        setSubmitting(false);
        return;
      }

      const slotsByTenant = new Map<string, { firstName: string; lastName: string; blockedSlots: { date: string; allDay: boolean; startTime?: string; endTime?: string }[] }>();
      for (const slot of latestBlockedSlots || []) {
        const existing = slotsByTenant.get(slot.tenant_id);
        const blockedSlot = { date: slot.date, allDay: slot.all_day, startTime: slot.start_time || undefined, endTime: slot.end_time || undefined };
        if (existing) { existing.blockedSlots.push(blockedSlot); }
        else { slotsByTenant.set(slot.tenant_id, { firstName: "Bloqueo", lastName: "Agenda", blockedSlots: [blockedSlot] }); }
      }

      const tenantsForValidation = Array.from(slotsByTenant.values());
      const tenantCheck = isSlotBlockedByTenant(form.date, form.time, tenantsForValidation);
      if (tenantCheck.blocked) {
        toast.error("Este horario está reservado. Selecciona otro.");
        setSubmitting(false);
        return;
      }

      if (!validateSlot(form.date, form.time, latestAppointments || [], tenantsForValidation)) {
        toast.error("Ya existe una cita en ese horario.");
        setSubmitting(false);
        return;
      }

      const priceUSD = selectedTreatment?.priceUSD || 0;
      const formattedPhone = `+58${form.patientPhone.trim()}`;

      const existingPatient = patients.find(
        (p) => p.cedula === form.patientCedula.trim() || p.phone === formattedPhone || p.name.toLowerCase() === fullName.toLowerCase()
      );
      if (!existingPatient) {
        await addPatient({
          name: fullName,
          cedula: form.patientCedula.trim(),
          phone: formattedPhone,
          email: form.patientEmail.trim(),
          notes: "Registrado vía booking online",
          photos: [],
          clinicalHistoryUrl: "",
        });
      }

      await addAppointment({
        patientName: fullName,
        patientPhone: formattedPhone,
        patientCedula: form.patientCedula.trim(),
        patientEmail: form.patientEmail.trim(),
        doctorId: effectiveDoctorId,
        date: form.date,
        time: form.time,
        treatment: effectiveTreatment,
        priceUSD,
        status: "pendiente_confirmacion",
        notes: form.notes,
      });

      onOpenChange(false);
      setConfirmationData({ name: fullName, date: form.date, time: form.time });
      setForm({ patientName: "", patientLastName: "", patientCedula: "", patientPhone: "", patientEmail: "", doctorId: "", date: "", time: "", treatment: initialTreatment || "", notes: "" });
    } catch {
      toast.error("Error al agendar la cita. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const fullName = `${form.patientName.trim()} ${form.patientLastName.trim()}`.trim();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Agendar Cita
            </DialogTitle>
            <DialogDescription>
              Complete el formulario para reservar su cita odontológica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Patient Data */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Datos del Paciente</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Nombre *</label>
                  <input type="text" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={form.patientName} onChange={(e) => update("patientName", e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ""))} maxLength={50} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Apellido *</label>
                  <input type="text" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={form.patientLastName} onChange={(e) => update("patientLastName", e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ""))} maxLength={50} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Cédula *</label>
                <input type="text" inputMode="numeric" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={form.patientCedula} onChange={(e) => update("patientCedula", e.target.value.replace(/[^0-9]/g, ""))} maxLength={20} placeholder="12345678" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email *</label>
                  <input type="email" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={form.patientEmail} onChange={(e) => update("patientEmail", e.target.value)} maxLength={100} placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono *</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2 bg-muted border border-r-0 border-border rounded-l-lg text-xs text-muted-foreground font-medium">+58</span>
                    <input type="tel" inputMode="numeric" className="w-full bg-muted rounded-r-lg rounded-l-none px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={form.patientPhone} onChange={(e) => { let val = e.target.value.replace(/[^0-9]/g, ""); if (val.startsWith("0")) val = val.slice(1); update("patientPhone", val); }} maxLength={10} placeholder="4121234567" />
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Stethoscope className="w-4 h-4 text-primary" /> Detalles de la Cita</h3>
              <div>
                <label className="block text-xs font-medium mb-1">Doctor *</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={effectiveDoctorId} onChange={(e) => update("doctorId", e.target.value)}>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tratamiento *</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={effectiveTreatment} onChange={(e) => update("treatment", e.target.value)}>
                  {[...treatments].sort((a, b) => { if (a.name === "Otros") return 1; if (b.name === "Otros") return -1; return a.name.localeCompare(b.name, "es"); }).map((t) => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Fecha *</label>
                  <input type="date" min={caracasToday} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={form.date} onChange={(e) => { update("date", e.target.value); update("time", ""); }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Hora *</label>
                  <select className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={form.time} onChange={(e) => update("time", e.target.value)}>
                    <option value="">Seleccionar</option>
                    {getTimeSlots().map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              {form.date && getTimeSlots().length === 0 && (
                <p className="text-xs text-destructive">No hay horarios disponibles para esta fecha.</p>
              )}
              {form.date && (
                <button
                  type="button"
                  onClick={() => {
                    if (!form.patientName || !form.patientLastName || !form.patientCedula || !form.patientPhone || !form.patientEmail) {
                      toast.error("Completa tus datos personales primero");
                      return;
                    }
                    setWaitlistOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-2.5 border border-dashed border-border rounded-lg hover:border-primary/50"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>¿No encuentras horario? <strong className="text-primary">Solicitar uno personalizado</strong></span>
                </button>
              )}
              <div>
                <label className="block text-xs font-medium mb-1">Notas (opcional)</label>
                <textarea className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none resize-none" rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} maxLength={500} />
              </div>
            </div>

            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
              <Send className="w-4 h-4" />
              {submitting ? "Agendando..." : "Confirmar Cita"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <WaitlistDialog
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        form={{
          patientName: fullName,
          patientCedula: form.patientCedula,
          patientPhone: form.patientPhone,
          patientEmail: form.patientEmail,
          doctorId: effectiveDoctorId,
          date: form.date,
          treatment: effectiveTreatment,
          notes: form.notes,
        }}
        appointments={appointments}
        tenants={tenants}
        priceUSD={selectedTreatment?.priceUSD || 0}
        currentHour={isToday ? currentHour : undefined}
        isToday={isToday}
        onSuccess={() => {}}
      />

      {confirmationData && (
        <BookingConfirmationModal
          open={!!confirmationData}
          onClose={() => setConfirmationData(null)}
          patientName={confirmationData.name}
          date={confirmationData.date}
          time={confirmationData.time}
        />
      )}
    </>
  );
};

export default BookingDialog;
