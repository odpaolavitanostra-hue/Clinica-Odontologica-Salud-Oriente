import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock, User, Phone, Stethoscope, Mail, CreditCard, HelpCircle } from "lucide-react";
import { useClinicData } from "@/hooks/useClinicData";
import { supabase } from "@/integrations/supabase/client";
import { validateSlot, validateSchedule, isSlotBlockedByTenant, getSmartTimeSlots, getCaracasNow, getCaracasToday } from "@/lib/scheduleUtils";
import { toast } from "sonner";
import WaitlistDialog from "@/components/booking/WaitlistDialog";
import BookingConfirmationModal from "@/components/booking/BookingConfirmationModal";

const Booking = () => {
  const { doctors, treatments, appointments, patients, addAppointment, addPatient, tenants } = useClinicData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTreatment = searchParams.get("tratamiento") || treatments[0]?.name || "";
  
  const [form, setForm] = useState({
    patientName: "",
    patientCedula: "",
    patientPhone: "",
    patientEmail: "",
    doctorId: "",
    date: "",
    time: "",
    treatment: initialTreatment,
    notes: "",
  });
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{ name: string; date: string; time: string } | null>(null);

  const effectiveDoctorId = form.doctorId || doctors[0]?.id || "";
  const effectiveTreatment = form.treatment || treatments[0]?.name || "";

  const selectedTreatment = treatments.find((t) => t.name === effectiveTreatment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.patientName || !form.patientCedula || !form.patientPhone || !form.patientEmail || !form.date || !form.time) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    const scheduleCheck = validateSchedule(form.date, form.time);
    if (!scheduleCheck.valid) {
      toast.error(scheduleCheck.reason);
      return;
    }

    const [{ data: latestAppointments, error: appointmentsError }, { data: latestBlockedSlots, error: blockedSlotsError }] = await Promise.all([
      supabase.from("appointments").select("id, date, time, status"),
      supabase.from("tenant_blocked_slots").select("tenant_id, date, all_day, start_time, end_time"),
    ]);

    if (appointmentsError || blockedSlotsError) {
      toast.error("No se pudo validar la disponibilidad en tiempo real. Intenta nuevamente.");
      return;
    }

    const slotsByTenant = new Map<string, {
      firstName: string;
      lastName: string;
      blockedSlots: { date: string; allDay: boolean; startTime?: string; endTime?: string }[];
    }>();

    for (const slot of latestBlockedSlots || []) {
      const existing = slotsByTenant.get(slot.tenant_id);
      const blockedSlot = {
        date: slot.date,
        allDay: slot.all_day,
        startTime: slot.start_time || undefined,
        endTime: slot.end_time || undefined,
      };

      if (existing) {
        existing.blockedSlots.push(blockedSlot);
      } else {
        slotsByTenant.set(slot.tenant_id, {
          firstName: "Bloqueo",
          lastName: "Agenda",
          blockedSlots: [blockedSlot],
        });
      }
    }

    const tenantsForValidation = Array.from(slotsByTenant.values());
    const tenantCheck = isSlotBlockedByTenant(form.date, form.time, tenantsForValidation);
    if (tenantCheck.blocked) {
      toast.error("Este horario está reservado. Selecciona otro.");
      return;
    }

    if (!validateSlot(form.date, form.time, latestAppointments || [], tenantsForValidation)) {
      toast.error("Ya existe una cita en ese horario. Debe haber al menos 60 min de diferencia.");
      return;
    }

    const priceUSD = selectedTreatment?.priceUSD || 0;
    const formattedPhone = `+58${form.patientPhone.trim()}`;

    const existingPatient = patients.find(
      (p) => p.cedula === form.patientCedula.trim() || p.phone === formattedPhone || p.name.toLowerCase() === form.patientName.trim().toLowerCase()
    );
    if (!existingPatient) {
      await addPatient({
        name: form.patientName.trim(),
        cedula: form.patientCedula.trim(),
        phone: formattedPhone,
        email: form.patientEmail.trim(),
        notes: "Registrado vía booking online",
        photos: [],
        clinicalHistoryUrl: "",
      });
    }

    await addAppointment({
      patientName: form.patientName.trim(),
      patientPhone: formattedPhone,
      patientCedula: form.patientCedula.trim(),
      patientEmail: form.patientEmail.trim(),
      doctorId: effectiveDoctorId,
      date: form.date,
      time: form.time,
      treatment: effectiveTreatment,
      priceUSD,
      status: "pendiente",
      notes: form.notes,
    });

    setConfirmationData({
      name: form.patientName.trim(),
      date: form.date,
      time: form.time,
    });
  };

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const getTimeSlots = () => {
    if (!form.date) return [];
    const caracasNow = getCaracasNow();
    const todayStr = getCaracasToday();
    const isToday = form.date === todayStr;
    const currentHour = caracasNow.getHours();
    return getSmartTimeSlots(form.date, appointments, tenants, isToday ? currentHour : undefined, isToday);
  };

  const caracasToday = getCaracasToday();

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="noir-gradient py-4">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <Link to="/" className="text-noir-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-xl text-primary font-semibold">Agendar Cita</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Patient Info */}
          <div className="bg-card rounded-xl p-5 gold-border space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Datos del Paciente
            </h2>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre completo *</label>
              <input type="text" className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:outline-none transition-colors" value={form.patientName} onChange={(e) => { const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ""); update("patientName", val); }} required maxLength={100} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1"><CreditCard className="w-4 h-4" /> Cédula *</label>
              <input type="text" inputMode="numeric" className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:outline-none transition-colors" value={form.patientCedula} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ""); update("patientCedula", val); }} required maxLength={20} placeholder="12345678" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Phone className="w-4 h-4" /> Teléfono *</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-border rounded-l-lg text-sm text-muted-foreground font-medium">+58</span>
                <input type="tel" inputMode="numeric" className="w-full bg-muted rounded-r-lg rounded-l-none px-4 py-3 text-sm border border-border focus:border-primary focus:outline-none transition-colors" value={form.patientPhone} onChange={(e) => { let val = e.target.value.replace(/[^0-9]/g, ""); if (val.startsWith("0")) val = val.slice(1); update("patientPhone", val); }} required maxLength={10} placeholder="4121234567" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Mail className="w-4 h-4" /> Email *</label>
              <input type="email" className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:outline-none transition-colors" value={form.patientEmail} onChange={(e) => update("patientEmail", e.target.value)} required maxLength={100} placeholder="correo@ejemplo.com" />
            </div>
          </div>

          {/* Appointment Details */}
          <div className="bg-card rounded-xl p-5 gold-border space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Detalles de la Cita
            </h2>
            <div>
              <label className="block text-sm font-medium mb-1">Doctor *</label>
              <select className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:outline-none" value={effectiveDoctorId} onChange={(e) => update("doctorId", e.target.value)}>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Stethoscope className="w-4 h-4" /> Tratamiento *</label>
              <select className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:outline-none" value={effectiveTreatment} onChange={(e) => update("treatment", e.target.value)}>
                {[...treatments].sort((a, b) => { if (a.name === "Otros") return 1; if (b.name === "Otros") return -1; return a.name.localeCompare(b.name, "es"); }).map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium mb-1">Fecha *</label>
                <input type="date" min={caracasToday} className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:outline-none appearance-none" value={form.date} onChange={(e) => { update("date", e.target.value); update("time", ""); }} required />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Clock className="w-4 h-4" /> Hora *</label>
                <select className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:outline-none" value={form.time} onChange={(e) => update("time", e.target.value)} required>
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
                  if (!form.patientName || !form.patientCedula || !form.patientPhone || !form.patientEmail) {
                    toast.error("Completa tus datos personales primero antes de solicitar un horario especial");
                    return;
                  }
                  setWaitlistOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors py-3 border border-dashed border-border rounded-lg hover:border-primary/50"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-center">¿No encuentras un horario que te sirva? <strong className="text-primary">Solicitar uno personalizado</strong></span>
              </button>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
              <textarea className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:outline-none resize-none" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} maxLength={500} />
            </div>
          </div>

          <button type="submit" className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity">
            Confirmar Cita
          </button>
        </form>

        <div className="mt-8 rounded-xl overflow-hidden gold-border">
          <a href="https://maps.app.goo.gl/Ku3FFCzB6b9RB5sm9" target="_blank" rel="noopener noreferrer">
            <iframe
              src="https://maps.google.com/maps?q=Cl%C3%ADnica+Odontol%C3%B3gica+Salud+Oriente+Novocentro+Puerto+La+Cruz+Anzoategui+Venezuela&t=&z=18&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="250"
              style={{ border: 0, pointerEvents: "none" }}
              allowFullScreen
              loading="lazy"
              title="Ubicación"
            />
          </a>
        </div>

        <WaitlistDialog
          open={waitlistOpen}
          onOpenChange={setWaitlistOpen}
          form={{
            patientName: form.patientName,
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
          currentHour={getCaracasNow().getHours()}
          isToday={form.date === caracasToday}
          onSuccess={() => navigate("/")}
        />
        {confirmationData && (
          <BookingConfirmationModal
            open={!!confirmationData}
            onClose={() => {
              setConfirmationData(null);
              setForm({
                patientName: "",
                patientCedula: "",
                patientPhone: "",
                patientEmail: "",
                doctorId: "",
                date: "",
                time: "",
                treatment: initialTreatment,
                notes: "",
              });
              navigate("/");
            }}
            patientName={confirmationData.name}
            date={confirmationData.date}
            time={confirmationData.time}
          />
        )}
      </div>
    </div>
  );
};

export default Booking;
