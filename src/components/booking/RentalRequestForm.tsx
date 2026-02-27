import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Building2, User, CreditCard, Phone, Mail, Clock, Send, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClinicData } from "@/hooks/useClinicData";
import { getAllAvailableSlots, getCaracasNow, getCaracasToday } from "@/lib/scheduleUtils";
import BookingConfirmationModal from "./BookingConfirmationModal";

interface RentalRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RentalRequestForm = ({ open, onOpenChange }: RentalRequestFormProps) => {
  const { appointments, tenants } = useClinicData();
  const [submitting, setSubmitting] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{ name: string; date: string; time: string } | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    cedula: "",
    cov: "",
    email: "",
    phone: "",
    rentalMode: "turno" as "turno" | "percent",
    date: "",
    selectedHours: [] as string[],
  });

  const update = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));

  const caracasToday = getCaracasToday();
  const caracasNow = getCaracasNow();
  const isToday = form.date === caracasToday;
  const currentHour = caracasNow.getHours();

  const availableSlots = form.date
    ? getAllAvailableSlots(form.date, appointments, tenants, isToday ? currentHour : undefined, isToday)
    : [];

  const toggleHour = (time: string) => {
    setForm((prev) => ({
      ...prev,
      selectedHours: prev.selectedHours.includes(time)
        ? prev.selectedHours.filter((t) => t !== time)
        : [...prev.selectedHours, time].sort(),
    }));
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.cedula || !form.cov || !form.email || !form.phone) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    if (!form.date || form.selectedHours.length === 0) {
      toast.error("Selecciona fecha y al menos una hora");
      return;
    }

    setSubmitting(true);
    try {
      const formattedPhone = `+58${form.phone.replace(/^0/, "")}`;
      const sorted = [...form.selectedHours].sort();

      // Group consecutive hours into ranges
      const ranges: { start: string; end: string }[] = [];
      let rangeStart = sorted[0];
      let prevHour = parseInt(sorted[0]);

      for (let i = 1; i <= sorted.length; i++) {
        const currentH = i < sorted.length ? parseInt(sorted[i]) : -1;
        if (currentH !== prevHour + 1) {
          ranges.push({
            start: rangeStart,
            end: `${(prevHour + 1).toString().padStart(2, "0")}:00`,
          });
          if (i < sorted.length) rangeStart = sorted[i];
        }
        prevHour = currentH;
      }

      // Insert blocked slots with pending_review status
      for (const range of ranges) {
        const { error } = await supabase.from("tenant_blocked_slots").insert({
          date: form.date,
          all_day: false,
          start_time: range.start,
          end_time: range.end,
          status: "pending_review",
          requester_first_name: form.firstName.trim(),
          requester_last_name: form.lastName.trim(),
          requester_cedula: form.cedula.trim(),
          requester_cov: form.cov.trim(),
          requester_email: form.email.trim(),
          requester_phone: formattedPhone,
          rental_mode: form.rentalMode,
        });
        if (error) throw error;
      }

      onOpenChange(false);
      setConfirmationData({
        name: `${form.firstName} ${form.lastName}`,
        date: form.date,
        time: sorted.join(", "),
      });

      // Reset form
      setForm({
        firstName: "", lastName: "", cedula: "", cov: "", email: "", phone: "",
        rentalMode: "turno", date: "", selectedHours: [],
      });
    } catch (err) {
      toast.error("Error al enviar la solicitud. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gold" /> Solicitud de Pre-Reserva
            </DialogTitle>
            <DialogDescription>
              Complete el formulario para solicitar el alquiler del consultorio. Su solicitud será revisada por el equipo administrativo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Personal Data */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4 text-gold" /> Datos Personales</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Nombre *</label>
                  <input type="text" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.firstName} onChange={(e) => update("firstName", e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ""))} maxLength={50} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Apellido *</label>
                  <input type="text" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.lastName} onChange={(e) => update("lastName", e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ""))} maxLength={50} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Cédula *</label>
                  <input type="text" inputMode="numeric" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.cedula} onChange={(e) => update("cedula", e.target.value.replace(/[^0-9]/g, ""))} maxLength={20} placeholder="12345678" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> COV *</label>
                  <input type="text" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.cov} onChange={(e) => update("cov", e.target.value)} maxLength={20} placeholder="COV-12345" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email *</label>
                  <input type="email" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={100} placeholder="doctor@correo.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono *</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2 bg-muted border border-r-0 border-border rounded-l-lg text-xs text-muted-foreground font-medium">+58</span>
                    <input type="tel" inputMode="numeric" className="w-full bg-muted rounded-r-lg rounded-l-none px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.phone} onChange={(e) => { let val = e.target.value.replace(/[^0-9]/g, ""); if (val.startsWith("0")) val = val.slice(1); update("phone", val); }} maxLength={10} placeholder="4121234567" />
                  </div>
                </div>
              </div>
            </div>

            {/* Rental mode selection only - price set by admin */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-gold" /> Modo de Alquiler</h3>
              <div>
                <label className="block text-xs font-medium mb-1">Modalidad Preferida *</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.rentalMode} onChange={(e) => update("rentalMode", e.target.value)}>
                  <option value="turno">Por Turno (USD)</option>
                  <option value="percent">Por Porcentaje (%)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">El monto será acordado con la administración.</p>
              </div>
            </div>

            {/* Scheduling */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-gold" /> Horario Solicitado</h3>
              <div>
                <label className="block text-xs font-medium mb-1">Fecha *</label>
                <input type="date" min={caracasToday} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.date} onChange={(e) => { update("date", e.target.value); update("selectedHours", []); }} />
              </div>

              {form.date && (
                <>
                  {availableSlots.length > 0 ? (
                    <>
                      <p className="text-xs font-medium">Seleccione las horas disponibles:</p>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {availableSlots.map((slot) => {
                          const isSelected = form.selectedHours.includes(slot);
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => toggleHour(slot)}
                              className={`py-2.5 rounded-lg text-xs font-medium transition-all border ${
                                isSelected
                                  ? "bg-gold text-gold-foreground border-gold"
                                  : "bg-muted border-border hover:border-gold/50"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                      {form.selectedHours.length > 0 && (
                        <p className="text-xs text-muted-foreground">{form.selectedHours.length} hora(s) seleccionada(s)</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-destructive">No hay horarios disponibles para esta fecha.</p>
                  )}
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-gold text-gold-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Enviando..." : "Enviar Solicitud de Pre-Reserva"}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              ⏳ Su solicitud será revisada por el administrador. El horario quedará <strong>temporalmente bloqueado</strong> hasta la confirmación o rechazo.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {confirmationData && (
        <BookingConfirmationModal
          open={!!confirmationData}
          onClose={() => setConfirmationData(null)}
          patientName={confirmationData.name}
          date={confirmationData.date}
          time={confirmationData.time}
          isPendingConfirmation
        />
      )}
    </>
  );
};

export default RentalRequestForm;
