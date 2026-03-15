import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Building2, User, CreditCard, Phone, Mail, Clock, Send, Briefcase, Sun, Moon, Stethoscope, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClinicData } from "@/hooks/useClinicData";
import { getAllAvailableSlots, getCaracasNow, getCaracasToday, isSlotBlockedByTenant } from "@/lib/scheduleUtils";
import { Switch } from "@/components/ui/switch";
import { formatVES } from "@/lib/formatVES";
import BookingConfirmationModal from "./BookingConfirmationModal";

interface RentalRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RentalRequestForm = ({ open, onOpenChange }: RentalRequestFormProps) => {
  const { appointments, tenants, treatments, tasaBCV } = useClinicData();
  const [submitting, setSubmitting] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{ name: string; date: string; time: string } | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    cedula: "",
    cov: "",
    email: "",
    phone: "",
    rentalMode: "" as "" | "turno" | "procedimiento" | "percent",
    date: "",
    turnoBlock: "" as "" | "am" | "pm",
    selectedHours: [] as string[],
    treatment: "Revisión",
    clinicProvidesMaterials: false,
  });

  const update = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));

  // Auto-fill from existing tenant when cedula matches
  useEffect(() => {
    if (form.cedula.length >= 6) {
      const existingTenant = tenants.find(t => t.cedula === form.cedula);
      if (existingTenant) {
        setForm(prev => ({
          ...prev,
          firstName: prev.firstName || existingTenant.firstName,
          lastName: prev.lastName || existingTenant.lastName,
          cov: prev.cov || existingTenant.cov,
          email: prev.email || existingTenant.email,
          phone: prev.phone || existingTenant.phone.replace(/^\+58/, ""),
        }));
        toast.info(`✅ Datos cargados de ${existingTenant.firstName} ${existingTenant.lastName}`);
      }
    }
  }, [form.cedula, tenants]);

  const caracasToday = getCaracasToday();
  const caracasNow = getCaracasNow();
  const isToday = form.date === caracasToday;
  const currentHour = caracasNow.getHours();

  const isBlockAvailable = (block: "am" | "pm"): boolean => {
    if (!form.date) return false;
    const startH = block === "am" ? 8 : 13;
    const endH = block === "am" ? 12 : 17;
    const d = new Date(form.date + "T00:00:00");
    const day = d.getDay();
    if (day === 0) return false;
    if (day === 6 && block === "pm") return false;
    const actualEnd = day === 6 && block === "am" ? 14 : endH;
    for (let h = startH; h < actualEnd; h++) {
      if (isToday && h <= currentHour) continue;
      const time = `${h.toString().padStart(2, "0")}:00`;
      const hasAppointment = appointments.some(
        (a) => a.date === form.date && a.status !== "cancelada" && parseInt(a.time.split(":")[0]) === h
      );
      if (hasAppointment) return false;
      if (isSlotBlockedByTenant(form.date, time, tenants).blocked) return false;
    }
    return true;
  };

  const percentSlots = form.date && (form.rentalMode === "percent" || form.rentalMode === "procedimiento")
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

  const getTurnoHours = (block: "am" | "pm"): string[] => {
    const d = new Date(form.date + "T00:00:00");
    const day = d.getDay();
    if (block === "am") {
      const end = day === 6 ? 14 : 12;
      const hours: string[] = [];
      for (let h = 8; h < end; h++) hours.push(`${h.toString().padStart(2, "0")}:00`);
      return hours;
    } else {
      const hours: string[] = [];
      for (let h = 13; h < 17; h++) hours.push(`${h.toString().padStart(2, "0")}:00`);
      return hours;
    }
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.cedula || !form.cov || !form.email || !form.phone) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    if (!form.date || !form.rentalMode) {
      toast.error("Selecciona fecha y modalidad de alquiler");
      return;
    }
    if (form.rentalMode === "turno" && !form.turnoBlock) {
      toast.error("Selecciona el turno (AM o PM)");
      return;
    }
    if ((form.rentalMode === "percent" || form.rentalMode === "procedimiento") && form.selectedHours.length === 0) {
      toast.error("Selecciona al menos una hora");
      return;
    }

    setSubmitting(true);
    try {
      const formattedPhone = `+58${form.phone.replace(/^0/, "")}`;
      const treatmentValue = (form.rentalMode === "percent" || form.rentalMode === "procedimiento") ? (form.treatment || "Revisión") : "Revisión";

      // Auto-save tenant data
      const existingTenant = tenants.find(t => t.cedula === form.cedula.trim());
      if (!existingTenant) {
        await supabase.from("tenants").insert({
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          cedula: form.cedula.trim(),
          cov: form.cov.trim(),
          email: form.email.trim(),
          phone: formattedPhone,
          rental_mode: form.rentalMode,
          rental_price: 0,
        });
      }

      if (form.rentalMode === "turno") {
        const hours = getTurnoHours(form.turnoBlock as "am" | "pm");
        const startTime = hours[0];
        const lastH = parseInt(hours[hours.length - 1]);
        const endTime = `${(lastH + 1).toString().padStart(2, "0")}:00`;

        const { error } = await supabase.from("tenant_blocked_slots").insert({
          date: form.date,
          all_day: false,
          start_time: startTime,
          end_time: endTime,
          status: "pending_review",
          requester_first_name: form.firstName.trim(),
          requester_last_name: form.lastName.trim(),
          requester_cedula: form.cedula.trim(),
          requester_cov: form.cov.trim(),
          requester_email: form.email.trim(),
          requester_phone: formattedPhone,
          rental_mode: form.rentalMode,
          treatment: treatmentValue,
        });
        if (error) throw error;

        onOpenChange(false);
        setConfirmationData({
          name: `${form.firstName} ${form.lastName}`,
          date: form.date,
          time: `${form.turnoBlock === "am" ? "Mañana" : "Tarde"} (${startTime} - ${endTime})`,
        });
      } else {
        const sorted = [...form.selectedHours].sort();
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
            treatment: treatmentValue,
          });
          if (error) throw error;
        }

        onOpenChange(false);
        setConfirmationData({
          name: `${form.firstName} ${form.lastName}`,
          date: form.date,
          time: sorted.join(", "),
        });
      }

      setForm({
        firstName: "", lastName: "", cedula: "", cov: "", email: "", phone: "",
        rentalMode: "", date: "", turnoBlock: "", selectedHours: [], treatment: "Revisión",
      });
    } catch (err) {
      toast.error("Error al enviar la solicitud. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const amAvailable = form.date ? isBlockAvailable("am") : false;
  const pmAvailable = form.date ? isBlockAvailable("pm") : false;

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
                  <input type="text" inputMode="numeric" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.cedula} onChange={(e) => update("cedula", e.target.value.replace(/[^0-9]/g, ""))} maxLength={20} placeholder="12345678 (auto-completa)" />
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

            {/* Date */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-gold" /> Fecha y Horario</h3>
              <div>
                <label className="block text-xs font-medium mb-1">Fecha *</label>
                <input type="date" min={caracasToday} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.date} onChange={(e) => { update("date", e.target.value); update("rentalMode", ""); update("turnoBlock", ""); update("selectedHours", []); }} />
              </div>
            </div>

            {/* Rental mode */}
            {form.date && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-gold" /> Modalidad de Alquiler</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => { update("rentalMode", "turno"); update("turnoBlock", ""); update("selectedHours", []); }}
                    className={`py-3 rounded-lg text-xs font-medium transition-all border flex flex-col items-center gap-1 ${form.rentalMode === "turno" ? "bg-gold text-gold-foreground border-gold" : "bg-muted border-border hover:border-gold/50"}`}>
                    <Clock className="w-4 h-4" /> Por Turno
                  </button>
                  <button type="button" onClick={() => { update("rentalMode", "procedimiento"); update("turnoBlock", ""); update("selectedHours", []); }}
                    className={`py-3 rounded-lg text-xs font-medium transition-all border flex flex-col items-center gap-1 ${form.rentalMode === "procedimiento" ? "bg-gold text-gold-foreground border-gold" : "bg-muted border-border hover:border-gold/50"}`}>
                    <Stethoscope className="w-4 h-4" /> Por Procedimiento
                  </button>
                  <button type="button" onClick={() => { update("rentalMode", "percent"); update("turnoBlock", ""); update("selectedHours", []); }}
                    className={`py-3 rounded-lg text-xs font-medium transition-all border flex flex-col items-center gap-1 ${form.rentalMode === "percent" ? "bg-gold text-gold-foreground border-gold" : "bg-muted border-border hover:border-gold/50"}`}>
                    <Building2 className="w-4 h-4" /> Por Porcentaje (%)
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">El monto será acordado con la administración.</p>
              </div>
            )}

            {/* Treatment selector for % mode */}
            {form.date && (form.rentalMode === "percent" || form.rentalMode === "procedimiento") && (
              <div>
                <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Stethoscope className="w-3 h-3 text-gold" /> {form.rentalMode === "procedimiento" ? "Procedimiento a realizar" : "Tratamiento a realizar"}</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.treatment} onChange={(e) => update("treatment", e.target.value)}>
                  {[...treatments].sort((a, b) => a.name.localeCompare(b.name, "es")).map((t) => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Si no desea compartir, seleccione "Revisión".</p>
              </div>
            )}

            {/* Turno selection */}
            {form.date && form.rentalMode === "turno" && (
              <div className="space-y-3">
                <p className="text-xs font-medium">Seleccione el turno:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" disabled={!amAvailable} onClick={() => update("turnoBlock", "am")}
                    className={`py-4 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-2 ${!amAvailable ? "bg-muted/50 border-border text-muted-foreground/50 cursor-not-allowed" : form.turnoBlock === "am" ? "bg-gold text-gold-foreground border-gold" : "bg-muted border-border hover:border-gold/50"}`}>
                    <Sun className="w-5 h-5" /><span className="font-semibold">Mañana (AM)</span><span className="text-xs opacity-75">8:00 AM - 12:00 PM</span>
                    {!amAvailable && <span className="text-xs text-destructive">No disponible</span>}
                  </button>
                  <button type="button" disabled={!pmAvailable} onClick={() => update("turnoBlock", "pm")}
                    className={`py-4 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-2 ${!pmAvailable ? "bg-muted/50 border-border text-muted-foreground/50 cursor-not-allowed" : form.turnoBlock === "pm" ? "bg-gold text-gold-foreground border-gold" : "bg-muted border-border hover:border-gold/50"}`}>
                    <Moon className="w-5 h-5" /><span className="font-semibold">Tarde (PM)</span><span className="text-xs opacity-75">1:00 PM - 5:00 PM</span>
                    {!pmAvailable && <span className="text-xs text-destructive">No disponible</span>}
                  </button>
                </div>
                {!amAvailable && !pmAvailable && (
                  <p className="text-xs text-destructive">No hay turnos disponibles para esta fecha. Ya existen citas agendadas.</p>
                )}
              </div>
            )}

            {/* Percent hour selection */}
            {form.date && (form.rentalMode === "percent" || form.rentalMode === "procedimiento") && (
              <div className="space-y-3">
                {percentSlots.length > 0 ? (
                  <>
                    <p className="text-xs font-medium">Seleccione las horas disponibles:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {percentSlots.map((slot) => (
                        <button key={slot} type="button" onClick={() => toggleHour(slot)}
                          className={`py-2.5 rounded-lg text-xs font-medium transition-all border ${form.selectedHours.includes(slot) ? "bg-gold text-gold-foreground border-gold" : "bg-muted border-border hover:border-gold/50"}`}>
                          {slot}
                        </button>
                      ))}
                    </div>
                    {form.selectedHours.length > 0 && (
                      <p className="text-xs text-muted-foreground">{form.selectedHours.length} hora(s) seleccionada(s)</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-destructive">No hay horarios disponibles para esta fecha.</p>
                )}
              </div>
            )}

            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="w-full bg-gold text-gold-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
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
