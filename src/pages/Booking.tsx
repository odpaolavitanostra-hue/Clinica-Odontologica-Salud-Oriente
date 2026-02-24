import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock, User, Phone, Stethoscope, Mail, CreditCard } from "lucide-react";
import { useCosoStore } from "@/store/useCosoStore";
import { toast } from "sonner";

const Booking = () => {
  const { doctors, treatments, validateSlot, validateSchedule, addAppointment, patients, addPatient, appointments, isSlotBlockedByTenant, getCaracasNow, getCaracasToday } = useCosoStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTreatment = searchParams.get("tratamiento") || treatments[0]?.name || "";
  
  const [form, setForm] = useState({
    patientName: "",
    patientCedula: "",
    patientPhone: "",
    patientEmail: "",
    doctorId: doctors[0]?.id || "",
    date: "",
    time: "",
    treatment: initialTreatment,
    notes: "",
  });

  const selectedTreatment = treatments.find((t) => t.name === form.treatment);

  const handleSubmit = (e: React.FormEvent) => {
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

    const tenantCheck = isSlotBlockedByTenant(form.date, form.time);
    if (tenantCheck.blocked) {
      toast.error("Este horario está reservado. Selecciona otro.");
      return;
    }

    if (!validateSlot(form.date, form.time)) {
      toast.error("Ya existe una cita en ese horario. Debe haber al menos 60 min de diferencia.");
      return;
    }

    const priceUSD = selectedTreatment?.priceUSD || 0;

    const existingPatient = patients.find(
      (p) => p.cedula === form.patientCedula.trim() || p.phone === form.patientPhone.trim() || p.name.toLowerCase() === form.patientName.trim().toLowerCase()
    );
    if (!existingPatient) {
      addPatient({
        id: Math.random().toString(36).substring(2, 10),
        name: form.patientName.trim(),
        cedula: form.patientCedula.trim(),
        phone: form.patientPhone.trim(),
        email: form.patientEmail.trim(),
        notes: "Registrado vía booking online",
        photos: [],
        clinicalHistoryUrl: "",
      });
    }

    addAppointment({
      id: Math.random().toString(36).substring(2, 10),
      patientName: form.patientName.trim(),
      patientPhone: form.patientPhone.trim(),
      patientCedula: form.patientCedula.trim(),
      patientEmail: form.patientEmail.trim(),
      doctorId: form.doctorId,
      date: form.date,
      time: form.time,
      treatment: form.treatment,
      priceUSD,
      status: "pendiente",
      notes: form.notes,
    });

    toast.success("¡Cita agendada exitosamente!");
    navigate("/");
  };

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const getTimeSlots = () => {
    if (!form.date) return [];
    const d = new Date(form.date + "T00:00:00");
    const day = d.getDay();
    if (day === 0) return [];
    const end = day === 6 ? 14 : 17;
    const slots: string[] = [];

    const caracasNow = getCaracasNow();
    const caracasToday = getCaracasToday();
    const isToday = form.date === caracasToday;
    const currentHour = caracasNow.getHours();

    for (let h = 8; h < end; h++) {
      // Block past hours for today
      if (isToday && h <= currentHour) continue;

      const time = `${h.toString().padStart(2, "0")}:00`;

      // Check tenant blocks
      const tenantCheck = isSlotBlockedByTenant(form.date, time);
      if (tenantCheck.blocked) continue;

      // Check if already booked
      const isBooked = appointments.some(
        (a) => a.date === form.date && a.time === time && a.status !== "cancelada"
      );
      if (!isBooked) {
        slots.push(time);
      }
    }
    return slots;
  };

  const caracasToday = getCaracasToday();

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="noir-gradient py-4">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <Link to="/" className="text-noir-foreground hover:text-gold transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-xl text-gold font-semibold">Agendar Cita</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Patient Info */}
          <div className="bg-card rounded-xl p-5 gold-border space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-gold" /> Datos del Paciente
            </h2>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre completo *</label>
              <input
                type="text"
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-gold focus:outline-none transition-colors"
                value={form.patientName}
                onChange={(e) => update("patientName", e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <CreditCard className="w-4 h-4" /> Cédula *
              </label>
              <input
                type="text"
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-gold focus:outline-none transition-colors"
                value={form.patientCedula}
                onChange={(e) => update("patientCedula", e.target.value)}
                required
                maxLength={20}
                placeholder="V-12345678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Phone className="w-4 h-4" /> Teléfono *
              </label>
              <input
                type="tel"
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-gold focus:outline-none transition-colors"
                value={form.patientPhone}
                onChange={(e) => update("patientPhone", e.target.value)}
                required
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Mail className="w-4 h-4" /> Email *
              </label>
              <input
                type="email"
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-gold focus:outline-none transition-colors"
                value={form.patientEmail}
                onChange={(e) => update("patientEmail", e.target.value)}
                required
                maxLength={100}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          {/* Appointment Details */}
          <div className="bg-card rounded-xl p-5 gold-border space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-gold" /> Detalles de la Cita
            </h2>
            <div>
              <label className="block text-sm font-medium mb-1">Doctor *</label>
              <select
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-gold focus:outline-none"
                value={form.doctorId}
                onChange={(e) => update("doctorId", e.target.value)}
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Stethoscope className="w-4 h-4" /> Tratamiento *
              </label>
              <select
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-gold focus:outline-none"
                value={form.treatment}
                onChange={(e) => update("treatment", e.target.value)}
              >
                {[...treatments]
                  .sort((a, b) => {
                    if (a.name === "Otros") return 1;
                    if (b.name === "Otros") return -1;
                    return a.name.localeCompare(b.name, "es");
                  })
                  .map((t) => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha *</label>
                <input
                  type="date"
                  min={caracasToday}
                  className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-gold focus:outline-none"
                  value={form.date}
                  onChange={(e) => { update("date", e.target.value); update("time", ""); }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Hora *
                </label>
                <select
                  className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-gold focus:outline-none"
                  value={form.time}
                  onChange={(e) => update("time", e.target.value)}
                  required
                >
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
            <div>
              <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
              <textarea
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-gold focus:outline-none resize-none"
                rows={3}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                maxLength={500}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gold text-gold-foreground py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Confirmar Cita
          </button>
        </form>

        <div className="mt-8 rounded-xl overflow-hidden gold-border">
          <a href="https://maps.app.goo.gl/XCTMewNAjtyAQrqk7" target="_blank" rel="noopener noreferrer">
            <iframe
              src="https://maps.google.com/maps?q=Novocentro+piso+1+local+1-02+Puerto+La+Cruz+6023+Anzoategui+Venezuela&t=&z=18&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="250"
              style={{ border: 0, pointerEvents: "none" }}
              allowFullScreen
              loading="lazy"
              title="Ubicación"
            />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Booking;
