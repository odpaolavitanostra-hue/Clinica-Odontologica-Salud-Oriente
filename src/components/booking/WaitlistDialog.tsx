import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Clock, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAllAvailableSlots } from "@/lib/scheduleUtils";
import type { AppointmentSlotData, TenantWithSlots } from "@/lib/scheduleUtils";

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: {
    patientName: string;
    patientCedula: string;
    patientPhone: string;
    patientEmail: string;
    doctorId: string;
    date: string;
    treatment: string;
    notes: string;
  };
  appointments: AppointmentSlotData[];
  tenants: TenantWithSlots[];
  priceUSD: number;
  currentHour?: number;
  isToday: boolean;
  onSuccess: () => void;
}

const WaitlistDialog = ({
  open,
  onOpenChange,
  form,
  appointments,
  tenants,
  priceUSD,
  currentHour,
  isToday,
  onSuccess,
}: WaitlistDialogProps) => {
  const [selectedTime, setSelectedTime] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allSlots = form.date
    ? getAllAvailableSlots(form.date, appointments, tenants, currentHour, isToday)
    : [];

  const finalTime = selectedTime || customTime;

  const handleSubmit = async () => {
    if (!finalTime) {
      toast.error("Indica tu horario de preferencia");
      return;
    }

    setSubmitting(true);
    try {
      // Also register patient if not exists
      const { data: existingPatients } = await supabase
        .from("patients")
        .select("id")
        .or(`cedula.eq.${form.patientCedula.trim()},phone.eq.${form.patientPhone.trim()}`)
        .limit(1);

      if (!existingPatients || existingPatients.length === 0) {
        await supabase.from("patients").insert({
          name: form.patientName.trim(),
          cedula: form.patientCedula.trim(),
          phone: form.patientPhone.trim(),
          email: form.patientEmail.trim(),
          notes: "Registrado vía solicitud especial",
        });
      }

      const { error } = await supabase.from("appointments").insert({
        patient_name: form.patientName.trim(),
        patient_phone: form.patientPhone.trim(),
        patient_cedula: form.patientCedula.trim(),
        patient_email: form.patientEmail.trim(),
        doctor_id: form.doctorId || null,
        date: form.date,
        time: finalTime,
        treatment: form.treatment,
        price_usd: priceUSD,
        status: "pendiente_confirmacion",
        notes: `[SOLICITUD ESPECIAL] Horario preferido: ${finalTime}. ${form.notes || ""}`.trim(),
      });

      if (error) throw error;

      toast.success("¡Solicitud enviada! Tu cita queda pendiente de confirmación por el consultorio.");
      onOpenChange(false);
      setSelectedTime("");
      setCustomTime("");
      onSuccess();
    } catch {
      toast.error("Error al enviar la solicitud. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold" /> Solicitar horario especial
          </DialogTitle>
          <DialogDescription>
            Tus datos ya están capturados. Solo elige tu horario preferido y envía la solicitud.
          </DialogDescription>
        </DialogHeader>

        {/* Show captured patient info as confirmation */}
        <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
          <p><span className="text-muted-foreground">Paciente:</span> <strong>{form.patientName}</strong></p>
          <p><span className="text-muted-foreground">Cédula:</span> {form.patientCedula} · <span className="text-muted-foreground">Tel:</span> {form.patientPhone}</p>
          <p><span className="text-muted-foreground">Tratamiento:</span> {form.treatment} · <span className="text-muted-foreground">Fecha:</span> {form.date}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">¿Qué horario te vendría bien?</label>
            
            {allSlots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {allSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => { setSelectedTime(slot); setCustomTime(""); }}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      selectedTime === slot
                        ? "bg-gold text-gold-foreground border-gold"
                        : "bg-muted border-border hover:border-gold/50"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                placeholder="O escribe tu horario preferido (ej: 10:30 AM)"
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-gold focus:outline-none transition-colors"
                value={customTime}
                onChange={(e) => { setCustomTime(e.target.value); setSelectedTime(""); }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !finalTime}
            className="w-full bg-gold text-gold-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Enviando..." : "Enviar solicitud de cita especial"}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            ⏳ Este horario está <strong>sujeto a confirmación</strong> por parte del equipo médico. Te contactaremos por teléfono o email.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WaitlistDialog;
