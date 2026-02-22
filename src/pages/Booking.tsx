import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock, User, Phone, Stethoscope } from "lucide-react";
import { useCosoStore } from "@/store/useCosoStore";
import { toast } from "sonner";

const Booking = () => {
  const { doctors, treatments, validateSlot, validateSchedule, addAppointment, patients, addPatient, appointments } = useCosoStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    patientName: "",
    patientPhone: "",
    doctorId: doctors[0]?.id || "",
    date: "",
    time: "",
    treatment: treatments[0]?.name || "",
    customPrice: "",
    notes: "",
  });

  const selectedTreatment = treatments.find((t) => t.name === form.treatment);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.patientName || !form.patientPhone || !form.date || !form.time) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    const scheduleCheck = validateSchedule(form.date, form.time);
    if (!scheduleCheck.valid) {
      toast.error(scheduleCheck.reason);
      return;
    }

    if (!validateSlot(form.date, form.time)) {
      toast.error("Ya existe una cita en ese horario. Debe haber al menos 60 min de diferencia.");
      return;
    }

    const priceUSD =
      form.treatment === "Otros"
        ? parseFloat(form.customPrice) || 0
        : selectedTreatment?.priceUSD || 0;

    // Auto-register patient if not exists
    const existingPatient = patients.find(
      (p) => p.phone === form.patientPhone.trim() || p.name.toLowerCase() === form.patientName.trim().toLowerCase()
    );
    if (!existingPatient) {
      addPatient({
        id: Math.random().toString(36).substring(2, 10),
        name: form.patientName.trim(),
        cedula: "",
        phone: form.patientPhone.trim(),
        email: "",
        notes: "Registrado vía booking online",
        photos: [],
        clinicalHistoryUrl: "",
      });
    }

    addAppointment({
      id: Math.random().toString(36).substring(2, 10),
      patientName: form.patientName.trim(),
      patientPhone: form.patientPhone.trim(),
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

  // Generate available time slots (1-hour intervals, exclude booked)
  const getTimeSlots = () => {
    if (!form.date) return [];
    const d = new Date(form.date + "T00:00:00");
    const day = d.getDay();
    if (day === 0) return [];
    const end = day === 6 ? 14 : 17;
    const slots: string[] = [];
    for (let h = 8; h < end; h++) {
      const time = `${h.toString().padStart(2, "0")}:00`;
      // Check if slot is already booked
      const isBooked = appointments.some(
        (a) => a.date === form.date && a.time === time && a.status !== "cancelada"
      );
      if (!isBooked) {
        slots.push(time);
      }
    }
    return slots;
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Header */}
      <header className="noir-gradient py-4">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <Link to="/" className="text-noir-foreground hover:text-gold transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-xl text-gold font-semibold">Reservar Cita</h1>
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
                {treatments.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            {form.treatment === "Otros" && (
              <div>
                <label className="block text-sm font-medium mb-1">Precio USD *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-gold focus:outline-none"
                  value={form.customPrice}
                  onChange={(e) => update("customPrice", e.target.value)}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha *</label>
                <input
                  type="date"
                  min={today}
                  className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-gold focus:outline-none"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
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

        {/* Map */}
        <div className="mt-8 rounded-xl overflow-hidden gold-border">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3925.123!2d-64.63!3d10.22!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTDCsDEzJzEyLjAiTiA2NMKwMzcnNDguMCJX!5e0!3m2!1ses!2sve!4v1234567890"
            width="100%"
            height="250"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            title="Ubicación"
          />
        </div>
      </div>
    </div>
  );
};

export default Booking;
