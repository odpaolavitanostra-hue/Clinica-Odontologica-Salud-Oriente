import { useState, useMemo } from "react";
import { useClinicData, Appointment } from "@/hooks/useClinicData";
import PaymentModal from "./PaymentModal";
import { isSlotBlockedByTenant, validateSlot, validateSchedule, getCaracasNow, getCaracasToday } from "@/lib/scheduleUtils";
import { CalendarDays, Check, X, Trash2, DollarSign, Save, UserCog, Plus, ChevronLeft, ChevronRight, Clock, Search, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, addWeeks, isSameMonth, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

type CalView = "month" | "week" | "day";

export const AdminCalendar = () => {
  const {
    appointments, doctors, patients, treatments, tenants,
    updateAppointment, deleteAppointment, completeAppointment,
    addAppointment, addPatient, inventory, finances, updateFinance,
    tasaBCV, addTransaction, addFinance,
  } = useClinicData();

  const [view, setView] = useState<CalView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [completing, setCompleting] = useState<string | null>(null);
  const [materials, setMaterials] = useState<{ itemId: string; qty: number }[]>([]);
  const [editingPay, setEditingPay] = useState<string | null>(null);
  const [customDoctorPay, setCustomDoctorPay] = useState<number>(0);
  const [editingDoctor, setEditingDoctor] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [showBooking, setShowBooking] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [bookingForm, setBookingForm] = useState({
    patientName: "", patientCedula: "", patientPhone: "", patientEmail: "",
    doctorId: doctors[0]?.id || "", date: "", time: "", treatment: treatments[0]?.name || "", notes: "",
    customPrice: "" as string, otrosMotivo: "",
    paymentMethod: "", paymentReference: "",
    doctorCommission: "40",
  });
  const [payingAppId, setPayingAppId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const navigate = (dir: number) => {
    if (view === "month") setCurrentDate(addMonths(currentDate, dir));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, dir));
    else setCurrentDate(addDays(currentDate, dir));
  };

  const getBlockedForDate = (dateStr: string) => {
    const blocked: { time: string; tenant: string; status: string }[] = [];
    tenants.forEach((t) => {
      t.blockedSlots.forEach((sl) => {
        if (sl.date !== dateStr) return;
        if (sl.status === 'cancelled') return;
        const status = sl.status || 'approved';
        if (sl.allDay) {
          for (let h = 8; h < 17; h++) blocked.push({ time: `${h.toString().padStart(2, "0")}:00`, tenant: `${t.firstName} ${t.lastName}`, status });
        } else if (sl.startTime && sl.endTime) {
          const start = parseInt(sl.startTime.split(":")[0]);
          const end = parseInt(sl.endTime.split(":")[0]);
          for (let h = start; h < end; h++) blocked.push({ time: `${h.toString().padStart(2, "0")}:00`, tenant: `${t.firstName} ${t.lastName}`, status });
        }
      });
    });
    return blocked;
  };

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = start;
    while (day <= end) { days.push(day); day = addDays(day, 1); }
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const hours = Array.from({ length: 9 }, (_, i) => 8 + i);

  const getAppsForDate = (dateStr: string) =>
    appointments.filter((a) => a.date === dateStr && (filter === "all" || a.status === filter));

  const handleComplete = async (id: string) => {
    await completeAppointment(id, materials);
    inventory.forEach((item) => {
      if (item.stock <= item.minStock) toast.warning(`⚠️ Stock bajo: ${item.name} (${item.stock})`);
    });
    toast.success("Cita completada y finanzas registradas");
    setCompleting(null);
    setMaterials([]);
  };

  const handleBookingSubmit = async () => {
    const f = bookingForm;
    const effectiveDoctorId = f.doctorId || doctors[0]?.id || "";
    const effectiveTreatment = f.treatment || treatments[0]?.name || "";
    if (!f.patientName || !f.date || !f.time) { toast.error("Completa campos obligatorios"); return; }
    const schedCheck = validateSchedule(f.date, f.time);
    if (!schedCheck.valid) { toast.error(schedCheck.reason); return; }
    if (!validateSlot(f.date, f.time, appointments, tenants)) { toast.error("Horario no disponible"); return; }
    const treat = treatments.find((t) => t.name === effectiveTreatment);

    const existing = patients.find((p) => (f.patientCedula && p.cedula === f.patientCedula) || p.phone === f.patientPhone || p.name.toLowerCase() === f.patientName.toLowerCase());
    if (!existing && f.patientName) {
      await addPatient({
        name: f.patientName, cedula: f.patientCedula, phone: f.patientPhone,
        email: f.patientEmail, notes: "Registrado por admin", photos: [], clinicalHistoryUrl: "",
      });
    }

    const finalPrice = f.customPrice !== "" ? parseFloat(f.customPrice) : (treat?.priceUSD || 0);
    const finalNotes = effectiveTreatment === "Otros" && f.otrosMotivo ? `Motivo: ${f.otrosMotivo}${f.notes ? ` | ${f.notes}` : ""}` : f.notes;

    const hasPay = !!f.paymentMethod;
    const isDigitalMethod = ["pago_movil", "transferencia", "zelle", "binance"].includes(f.paymentMethod);
    if (hasPay && isDigitalMethod && !f.paymentReference.trim()) {
      toast.error("Los pagos digitales requieren número de referencia");
      return;
    }

    await addAppointment({
      patientName: f.patientName, patientPhone: f.patientPhone,
      patientCedula: f.patientCedula, patientEmail: f.patientEmail,
      doctorId: effectiveDoctorId, date: f.date, time: f.time,
      treatment: effectiveTreatment, priceUSD: finalPrice,
      status: hasPay ? "pagada" : "pendiente", notes: finalNotes,
      paymentMethod: hasPay ? f.paymentMethod : undefined,
      paymentReference: hasPay ? f.paymentReference : undefined,
    });

    if (hasPay) {
      await addTransaction({
        date: f.date,
        type: "patient",
        description: `Pago cita: ${effectiveTreatment}`,
        entityName: f.patientName,
        amountUSD: finalPrice,
        amountVES: finalPrice * tasaBCV,
        tasaBCV,
        paymentMethod: f.paymentMethod,
        paymentReference: f.paymentReference,
      });
    }

    toast.success(hasPay ? "Cita agendada con pago registrado" : "Cita agendada");
    setShowBooking(false);
    setBookingForm({ patientName: "", patientCedula: "", patientPhone: "", patientEmail: "", doctorId: doctors[0]?.id || "", date: "", time: "", treatment: treatments[0]?.name || "", notes: "", customPrice: "", otrosMotivo: "", paymentMethod: "", paymentReference: "" });
  };

  const selectExistingPatient = (p: typeof patients[0]) => {
    setBookingForm((prev) => ({ ...prev, patientName: p.name, patientCedula: p.cedula, patientPhone: p.phone, patientEmail: p.email }));
    setPatientSearch("");
  };

  const filteredPatients = patientSearch.length >= 2
    ? patients.filter((p) =>
        p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.cedula.includes(patientSearch) ||
        p.phone.includes(patientSearch)
      ).slice(0, 5)
    : [];

  const getBookingTimeSlots = () => {
    if (!bookingForm.date) return [];
    const d = new Date(bookingForm.date + "T00:00:00");
    const day = d.getDay();
    if (day === 0) return [];
    const end = day === 6 ? 14 : 17;
    const slots: string[] = [];
    const caracasNow = getCaracasNow();
    const caracasToday = getCaracasToday();
    const isToday = bookingForm.date === caracasToday;
    const currentHour = caracasNow.getHours();
    for (let h = 8; h < end; h++) {
      if (isToday && h <= currentHour) continue;
      const time = `${h.toString().padStart(2, "0")}:00`;
      const tb = isSlotBlockedByTenant(bookingForm.date, time, tenants);
      if (tb.blocked) continue;
      const isBooked = appointments.some((a) => a.date === bookingForm.date && a.time === time && a.status !== "cancelada");
      if (!isBooked) slots.push(time);
    }
    return slots;
  };

  const getRescheduleTimeSlots = (dateStr: string, excludeId?: string) => {
    if (!dateStr) return [];
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay();
    if (day === 0) return [];
    const end = day === 6 ? 14 : 17;
    const slots: string[] = [];
    const caracasNow = getCaracasNow();
    const caracasToday = getCaracasToday();
    const isToday = dateStr === caracasToday;
    const currentHour = caracasNow.getHours();
    for (let h = 8; h < end; h++) {
      if (isToday && h <= currentHour) continue;
      const time = `${h.toString().padStart(2, "0")}:00`;
      if (isSlotBlockedByTenant(dateStr, time, tenants).blocked) continue;
      const isBooked = appointments.some((a) => a.id !== excludeId && a.date === dateStr && a.time === time && a.status !== "cancelada");
      if (!isBooked) slots.push(time);
    }
    return slots;
  };

  const handleReschedule = async (appId: string) => {
    if (!rescheduleDate || !rescheduleTime) { toast.error("Selecciona fecha y hora"); return; }
    const schedCheck = validateSchedule(rescheduleDate, rescheduleTime);
    if (!schedCheck.valid) { toast.error(schedCheck.reason); return; }
    if (!validateSlot(rescheduleDate, rescheduleTime, appointments, tenants, appId)) {
      toast.error("Horario no disponible"); return;
    }
    await updateAppointment(appId, { date: rescheduleDate, time: rescheduleTime });
    toast.success("✅ Cita reagendada exitosamente");
    setReschedulingId(null);
    setRescheduleDate("");
    setRescheduleTime("");
  };

  const todayStr = getCaracasToday();

  const renderAppCard = (app: Appointment) => (
    <div key={app.id} className="bg-card rounded-xl p-4 gold-border">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{app.patientName}</p>
          <p className="text-sm text-muted-foreground">{app.treatment} • {doctors.find((d) => d.id === app.doctorId)?.name}</p>
          <p className="text-sm text-muted-foreground">{app.date} • {app.time}</p>
          {app.notes && <p className="text-xs text-muted-foreground mt-1">📝 {app.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap ${
            app.status === "pendiente" ? "bg-amber/20 text-amber"
              : app.status === "pagada" ? "bg-blue-500/20 text-blue-400"
              : app.status === "completada" ? "bg-clinic-green/20 text-clinic-green"
              : app.status === "pendiente_confirmacion" ? "bg-orange-500/20 text-orange-400"
              : "bg-destructive/20 text-destructive"
          }`}>{app.status === "pendiente_confirmacion" ? "Por confirmar" : app.status === "pagada" ? "Pagada" : app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
          {app.status === "pendiente_confirmacion" && (
            <div className="flex gap-1">
              <button onClick={() => { setReschedulingId(app.id); setRescheduleDate(app.date); setRescheduleTime(""); }} className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20" title="Reagendar"><CalendarClock className="w-4 h-4" /></button>
              <button onClick={() => { setEditingDoctor(app.id); setSelectedDoctorId(app.doctorId); }} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" title="Cambiar doctor"><UserCog className="w-4 h-4" /></button>
              <button onClick={async () => { await updateAppointment(app.id, { status: "pendiente" }); toast.success("✅ Cita aprobada"); }} className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="Aprobar cita"><Check className="w-4 h-4" /></button>
              <button onClick={async () => { await updateAppointment(app.id, { status: "cancelada" }); toast.info("Cita rechazada"); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" title="Rechazar cita"><X className="w-4 h-4" /></button>
            </div>
          )}
          {app.status === "pendiente" && (
            <div className="flex gap-1">
              <button onClick={() => { setReschedulingId(app.id); setRescheduleDate(app.date); setRescheduleTime(""); }} className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20" title="Reagendar"><CalendarClock className="w-4 h-4" /></button>
              <button onClick={() => { setEditingDoctor(app.id); setSelectedDoctorId(app.doctorId); }} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" title="Cambiar doctor"><UserCog className="w-4 h-4" /></button>
              <button onClick={() => setPayingAppId(app.id)} className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="Procesar Pago"><DollarSign className="w-4 h-4" /></button>
              <button onClick={() => { setCompleting(app.id); setMaterials([]); }} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" title="Completar sin pago"><Check className="w-4 h-4" /></button>
              <button onClick={async () => { await updateAppointment(app.id, { status: "cancelada" }); toast.info("Cita cancelada"); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" title="Cancelar"><X className="w-4 h-4" /></button>
            </div>
          )}
          {app.status === "pagada" && (
            <div className="flex gap-1 items-center">
              <span className="text-[10px] text-muted-foreground">{app.paymentMethod?.replace('_', ' ')}{app.paymentReference ? ` • Ref: ${app.paymentReference}` : ''}</span>
              <button onClick={() => { setReschedulingId(app.id); setRescheduleDate(app.date); setRescheduleTime(""); }} className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20" title="Reagendar"><CalendarClock className="w-4 h-4" /></button>
              <button onClick={() => { setCompleting(app.id); setMaterials([]); }} className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="Completar"><Check className="w-4 h-4" /></button>
            </div>
          )}
          {app.status === "completada" && (
            <button onClick={() => { const fin = finances.find((f) => f.appointmentId === app.id); setEditingPay(app.id); setCustomDoctorPay(fin?.doctorPayUSD || 0); }} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" title="Editar pago"><DollarSign className="w-4 h-4" /></button>
          )}
          <button onClick={async () => { await deleteAppointment(app.id); toast.info("Cita eliminada"); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {editingDoctor === app.id && (
        <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
          <h4 className="font-semibold text-sm">Reasignar doctor:</h4>
          <select className="w-full bg-card rounded-lg px-3 py-2 border border-border text-sm" value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)}>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={async () => { await updateAppointment(app.id, { doctorId: selectedDoctorId }); setEditingDoctor(null); toast.success("Doctor reasignado"); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Save className="w-4 h-4" /> Guardar</button>
            <button onClick={() => setEditingDoctor(null)} className="bg-muted-foreground/10 text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {editingPay === app.id && (
        <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
          <h4 className="font-semibold text-sm">Editar pago al doctor (USD):</h4>
          <input type="number" min="0" step="0.01" className="w-full bg-card rounded-lg px-3 py-2 border border-border text-sm" value={customDoctorPay} onChange={(e) => setCustomDoctorPay(parseFloat(e.target.value) || 0)} />
          <div className="flex gap-2">
            <button onClick={async () => {
              const fin = finances.find((f) => f.appointmentId === app.id);
              if (fin) {
                await updateFinance(app.id, { doctorPayUSD: customDoctorPay, utilityUSD: fin.treatmentPriceUSD - customDoctorPay - fin.materialsCostUSD });
              }
              setEditingPay(null);
              toast.success("Pago actualizado");
            }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Save className="w-4 h-4" /> Guardar</button>
            <button onClick={() => setEditingPay(null)} className="bg-muted-foreground/10 text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {completing === app.id && (
        <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
          <h4 className="font-semibold text-sm">Materiales utilizados:</h4>
          {inventory.map((item) => {
            const mat = materials.find((m) => m.itemId === item.id);
            return (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1">{item.name} (Stock: {item.stock})</span>
                <input type="number" min="0" step="0.01" className="w-20 bg-card rounded px-2 py-1 border border-border text-center" value={mat?.qty || ""} placeholder="0" onChange={(e) => {
                  const qty = parseFloat(e.target.value) || 0;
                  setMaterials((prev) => { const existing = prev.filter((m) => m.itemId !== item.id); return qty > 0 ? [...existing, { itemId: item.id, qty }] : existing; });
                }} />
              </div>
            );
          })}
          <div className="flex gap-2 pt-2">
            <button onClick={() => handleComplete(app.id)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">Confirmar</button>
            <button onClick={() => setCompleting(null)} className="bg-muted-foreground/10 text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {reschedulingId === app.id && (
        <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2"><CalendarClock className="w-4 h-4 text-accent" /> Reagendar cita</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Nueva fecha</label>
              <input type="date" min={todayStr} className="w-full bg-card rounded-lg px-3 py-2 border border-border text-sm" value={rescheduleDate} onChange={(e) => { setRescheduleDate(e.target.value); setRescheduleTime(""); }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Nueva hora</label>
              <select className="w-full bg-card rounded-lg px-3 py-2 border border-border text-sm" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)}>
                <option value="">Seleccionar hora</option>
                {getRescheduleTimeSlots(rescheduleDate, app.id).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleReschedule(app.id)} className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Save className="w-4 h-4" /> Reagendar</button>
            <button onClick={() => { setReschedulingId(null); setRescheduleDate(""); setRescheduleTime(""); }} className="bg-muted-foreground/10 text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-accent" /> Agenda
        </h2>
        <button onClick={() => { setShowBooking(!showBooking); if (!showBooking) setBookingForm((p) => ({ ...p, date: selectedDate || todayStr })); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
          <Plus className="w-4 h-4" /> Agendar Cita
        </button>
      </div>

      {showBooking && (
        <div className="bg-card rounded-xl p-5 gold-border mb-6 space-y-4">
          <h3 className="font-semibold text-lg">Nueva Cita (Admin)</h3>
          <div className="relative">
            <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Search className="w-4 h-4" /> Buscar paciente existente</label>
            <input type="text" className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:outline-none" placeholder="Nombre, cédula o teléfono..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
            {filteredPatients.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
                {filteredPatients.map((p) => (
                  <button key={p.id} onClick={() => selectExistingPatient(p)} className="w-full text-left px-4 py-3 hover:bg-muted text-sm border-b border-border last:border-0">
                    <span className="font-semibold">{p.name}</span> <span className="text-muted-foreground">• {p.cedula} • {p.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Nombre *</label><input type="text" className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={bookingForm.patientName} onChange={(e) => setBookingForm((p) => ({ ...p, patientName: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium mb-1">Cédula</label><input type="text" className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={bookingForm.patientCedula} onChange={(e) => setBookingForm((p) => ({ ...p, patientCedula: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium mb-1">Teléfono</label><input type="tel" className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={bookingForm.patientPhone} onChange={(e) => setBookingForm((p) => ({ ...p, patientPhone: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={bookingForm.patientEmail} onChange={(e) => setBookingForm((p) => ({ ...p, patientEmail: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Doctor</label><select className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={bookingForm.doctorId || doctors[0]?.id} onChange={(e) => setBookingForm((p) => ({ ...p, doctorId: e.target.value }))}>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Tratamiento</label><select className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={bookingForm.treatment || treatments[0]?.name} onChange={(e) => setBookingForm((p) => ({ ...p, treatment: e.target.value, customPrice: "" }))}>{[...treatments].sort((a, b) => { if (a.name === "Otros") return 1; if (b.name === "Otros") return -1; return a.name.localeCompare(b.name, "es"); }).map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}</select></div>
          </div>
          {(bookingForm.treatment || treatments[0]?.name) === "Otros" && (
            <div><label className="block text-sm font-medium mb-1">Motivo de consulta *</label><input type="text" className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none" placeholder="Describa el motivo de la consulta" value={bookingForm.otrosMotivo} onChange={(e) => setBookingForm((p) => ({ ...p, otrosMotivo: e.target.value }))} maxLength={200} /></div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Precio USD (editable)</label>
            <input type="number" step="0.01" min="0" className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none" placeholder={`Estándar: $${(treatments.find(t => t.name === (bookingForm.treatment || treatments[0]?.name))?.priceUSD || 0).toFixed(2)}`} value={bookingForm.customPrice} onChange={(e) => setBookingForm((p) => ({ ...p, customPrice: e.target.value }))} />
            <p className="text-xs text-muted-foreground mt-1">Deja vacío para usar el precio estándar</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Fecha</label><input type="date" min={todayStr} className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={bookingForm.date} onChange={(e) => setBookingForm((p) => ({ ...p, date: e.target.value, time: "" }))} /></div>
            <div><label className="block text-sm font-medium mb-1">Hora</label><select className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={bookingForm.time} onChange={(e) => setBookingForm((p) => ({ ...p, time: e.target.value }))}><option value="">Seleccionar</option>{getBookingTimeSlots().map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
            <label className="block text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Pago inmediato (opcional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <button type="button" onClick={() => setBookingForm((p) => ({ ...p, paymentMethod: "", paymentReference: "" }))} className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${!bookingForm.paymentMethod ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>Sin pago</button>
              {[
                { value: "pago_movil", label: "Pago Móvil" },
                { value: "transferencia", label: "Transferencia" },
                { value: "zelle", label: "Zelle" },
                { value: "binance", label: "Binance" },
                { value: "efectivo_ves", label: "Efectivo VES" },
                { value: "efectivo_usd", label: "Efectivo USD" },
              ].map((m) => (
                <button key={m.value} type="button" onClick={() => setBookingForm((p) => ({ ...p, paymentMethod: m.value, paymentReference: "" }))} className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${bookingForm.paymentMethod === m.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>{m.label}</button>
              ))}
            </div>
            {["pago_movil", "transferencia", "zelle", "binance"].includes(bookingForm.paymentMethod) && (
              <div>
                <label className="block text-xs font-medium mb-1">Nº de Referencia *</label>
                <input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none" placeholder="Número de referencia" value={bookingForm.paymentReference} onChange={(e) => setBookingForm((p) => ({ ...p, paymentReference: e.target.value }))} />
              </div>
            )}
            {bookingForm.paymentMethod && (
              <p className="text-xs text-clinic-green font-medium">✅ La cita se registrará como "Pagada" directamente</p>
            )}
          </div>
          <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border resize-none" rows={2} placeholder="Notas (opcional)" value={bookingForm.notes} onChange={(e) => setBookingForm((p) => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-2">
            <button onClick={handleBookingSubmit} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-semibold">Agendar</button>
            <button onClick={() => setShowBooking(false)} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-muted hover:bg-muted/80"><ChevronLeft className="w-4 h-4" /></button>
          <h3 className="font-display font-semibold text-lg min-w-[180px] text-center capitalize">
            {view === "month" && format(currentDate, "MMMM yyyy", { locale: es })}
            {view === "week" && `Semana del ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: es })}`}
            {view === "day" && format(currentDate, "EEEE d MMMM yyyy", { locale: es })}
          </h3>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg bg-muted hover:bg-muted/80"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20">Hoy</button>
        </div>
        <div className="flex gap-1">
          {(["month", "week", "day"] as CalView[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {v === "month" ? "Mes" : v === "week" ? "Semana" : "Día"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "pendiente", "pendiente_confirmacion", "pagada", "completada", "cancelada"].map((f) => {
          const label = f === "all" ? "Todas" : f === "pendiente_confirmacion" ? "⏳ Por confirmar" : f === "pagada" ? "💳 Pagada" : f.charAt(0).toUpperCase() + f.slice(1);
          const count = f === "pendiente_confirmacion" ? appointments.filter(a => a.status === "pendiente_confirmacion").length : 0;
          return (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${filter === f ? "bg-primary text-primary-foreground" : f === "pendiente_confirmacion" && count > 0 ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 animate-pulse" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {label}{f === "pendiente_confirmacion" && count > 0 && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{count}</span>}
            </button>
          );
        })}
      </div>

      {view === "month" && (
        <div>
          <div className="grid grid-cols-7 gap-px mb-1">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayApps = getAppsForDate(dateStr);
              const blocked = getBlockedForDate(dateStr);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate === dateStr;
              return (
                <button key={dateStr} onClick={() => { setSelectedDate(dateStr); setView("day"); setCurrentDate(day); }} className={`min-h-[70px] p-1 rounded-lg text-left transition-all border ${isSelected ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"} ${!isCurrentMonth ? "opacity-30" : ""} ${isToday ? "ring-1 ring-primary/50" : ""}`}>
                  <span className={`text-xs font-semibold ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</span>
                  {dayApps.length > 0 && <div className="mt-1"><span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">{dayApps.length}</span></div>}
                  {blocked.length > 0 && <div className="mt-0.5"><span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full">🔒</span></div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px">
              <div className="text-xs text-muted-foreground p-1"></div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className={`text-center text-xs font-semibold p-2 rounded-t-lg ${isSameDay(day, new Date()) ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  {format(day, "EEE d", { locale: es })}
                </div>
              ))}
              {hours.map((h) => (
                <>
                  <div key={`h-${h}`} className="text-xs text-muted-foreground p-1 text-right">{`${h}:00`}</div>
                  {weekDays.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const time = `${h.toString().padStart(2, "0")}:00`;
                    const app = appointments.find((a) => a.date === dateStr && a.time === time && (filter === "all" || a.status === filter));
                    const blocked = getBlockedForDate(dateStr).find((b) => b.time === time);
                    return (
                      <div key={`${dateStr}-${h}`} onClick={() => { if (!app && !blocked) { setShowBooking(true); setBookingForm((p) => ({ ...p, date: dateStr, time })); } }} className={`min-h-[50px] border border-border/30 p-1 text-[10px] rounded cursor-pointer hover:bg-muted/50 ${blocked ? (blocked.status === 'pending_review' ? "bg-amber-500/10 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(245,158,11,0.15)_4px,rgba(245,158,11,0.15)_8px)]" : blocked.status === 'completed' ? "bg-clinic-green/15" : "bg-card border-primary/30") : ""}`}>
                        {app && (
                          <div className={`rounded px-1 py-0.5 truncate ${app.status === "pendiente" ? "bg-amber/20 text-amber" : app.status === "pagada" ? "bg-blue-500/20 text-blue-400" : app.status === "completada" ? "bg-clinic-green/20 text-clinic-green" : app.status === "pendiente_confirmacion" ? "bg-orange-500/20 text-orange-400" : "bg-destructive/20 text-destructive"}`}>
                            {app.patientName.split(" ")[0]}
                          </div>
                        )}
                        {blocked && !app && (
                          <span className={`${blocked.status === 'pending_review' ? "text-amber-500" : blocked.status === 'completed' ? "text-clinic-green" : "text-primary"}`}>
                            {blocked.status === 'pending_review' ? "⏳" : blocked.status === 'completed' ? "✔️" : "🔒"} {blocked.tenant.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "day" && (
        <div className="space-y-2">
          {hours.map((h) => {
            const dateStr = format(currentDate, "yyyy-MM-dd");
            const time = `${h.toString().padStart(2, "0")}:00`;
            const dayApps = appointments.filter((a) => a.date === dateStr && a.time === time && (filter === "all" || a.status === filter));
            const blocked = getBlockedForDate(dateStr).find((b) => b.time === time);
            return (
              <div key={h} className="flex gap-3">
                <div className="w-14 text-sm text-muted-foreground font-medium pt-3 text-right">{time}</div>
              <div className="flex-1 min-h-[60px] border border-border/30 rounded-lg p-2">
                  {blocked && (
                    <div className={`text-xs rounded px-2 py-1 mb-1 ${
                      blocked.status === 'pending_review' ? "text-amber-500 bg-amber-500/10 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(245,158,11,0.1)_4px,rgba(245,158,11,0.1)_8px)]"
                      : blocked.status === 'completed' ? "text-clinic-green bg-clinic-green/10"
                      : "text-primary bg-primary/10"
                    }`}>
                      {blocked.status === 'pending_review' ? "⏳ Por confirmar" : blocked.status === 'completed' ? "✔️ Completado" : "🔒 Reservado"}: {blocked.tenant}
                    </div>
                  )}
                  {dayApps.length === 0 && !blocked && (
                    <button onClick={() => { setShowBooking(true); setBookingForm((p) => ({ ...p, date: dateStr, time })); }} className="text-xs text-muted-foreground hover:text-primary">+ Agendar</button>
                  )}
                  {dayApps.map((app) => renderAppCard(app))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "month" && selectedDate && (
        <div className="mt-6 space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">{selectedDate}</h3>
          {getAppsForDate(selectedDate).length === 0
            ? <p className="text-muted-foreground text-sm text-center py-4">No hay citas este día</p>
            : getAppsForDate(selectedDate).sort((a, b) => a.time.localeCompare(b.time)).map(renderAppCard)
          }
        </div>
      )}

      {/* Payment Modal */}
      {payingAppId && (() => {
        const app = appointments.find(a => a.id === payingAppId);
        if (!app) return null;
        return (
          <PaymentModal
            open={!!payingAppId}
            onOpenChange={(v) => !v && setPayingAppId(null)}
            entityName={app.patientName}
            treatment={app.treatment}
            defaultPrice={app.priceUSD}
            tasaBCV={tasaBCV}
            onConfirm={async (finalPrice, paymentMethod, paymentReference) => {
              await updateAppointment(app.id, {
                status: 'pagada' as any,
                finalPrice,
                paymentMethod,
                paymentReference,
                priceUSD: finalPrice,
              });
              await addTransaction({
                date: app.date,
                type: 'patient',
                entityName: app.patientName,
                appointmentId: app.id,
                amountUSD: finalPrice,
                amountVES: finalPrice * tasaBCV,
                tasaBCV,
                paymentMethod,
                paymentReference,
                description: `${app.treatment} — ${app.patientName}`,
              });
              toast.success("💳 Pago procesado y registrado");
              setPayingAppId(null);
            }}
          />
        );
      })()}
    </div>
  );
};
