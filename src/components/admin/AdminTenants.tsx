
import { useState } from "react";
import { useClinicData, Tenant, TenantBlockedSlot } from "@/hooks/useClinicData";
import { Building2, Plus, Save, Trash2, Edit, Lock, Calendar, X, Check, Mail, MessageCircle, Clock, Sun, Moon, User, CreditCard, Phone, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { getCaracasToday, getCaracasNow, getAllAvailableSlots, isSlotBlockedByTenant } from "@/lib/scheduleUtils";

export const AdminTenants = () => {
  const { tenants, appointments, addTenant, updateTenant, deleteTenant, addTenantBlockedSlot, removeTenantBlockedSlot, rentalRequests, approveRentalRequest, rejectRentalRequest } = useClinicData();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [blockingTenant, setBlockingTenant] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", cov: "", email: "", phone: "", cedula: "",
    rentalMode: "turno" as "turno" | "percent", rentalPrice: 0,
    // Schedule fields (same as public form)
    date: "",
    turnoBlock: "" as "" | "am" | "pm",
    selectedHours: [] as string[],
  });
  const [blockForm, setBlockForm] = useState({
    date: "",
    rentalMode: "" as "" | "turno" | "percent",
    turnoBlock: "" as "" | "am" | "pm",
    selectedHours: [] as string[],
  });

  const caracasToday = getCaracasToday();
  const caracasNow = getCaracasNow();

  const resetForm = () => {
    setForm({ firstName: "", lastName: "", cov: "", email: "", phone: "", cedula: "", rentalMode: "turno", rentalPrice: 0, date: "", turnoBlock: "", selectedHours: [] });
    setShowForm(false);
    setEditing(null);
  };

  const resetBlockForm = () => {
    setBlockForm({ date: "", rentalMode: "", turnoBlock: "", selectedHours: [] });
  };

  // Availability check for a date + block
  const isBlockAvailableFor = (date: string, block: "am" | "pm"): boolean => {
    if (!date) return false;
    const startH = block === "am" ? 8 : 13;
    const endH = block === "am" ? 12 : 17;
    const d = new Date(date + "T00:00:00");
    const day = d.getDay();
    if (day === 0) return false;
    if (day === 6 && block === "pm") return false;
    const actualEnd = day === 6 && block === "am" ? 14 : endH;
    const isToday = date === caracasToday;
    const currentHour = caracasNow.getHours();

    for (let h = startH; h < actualEnd; h++) {
      if (isToday && h <= currentHour) continue;
      const time = `${h.toString().padStart(2, "0")}:00`;
      const hasAppointment = appointments.some(
        (a) => a.date === date && a.status !== "cancelada" && parseInt(a.time.split(":")[0]) === h
      );
      if (hasAppointment) return false;
      if (isSlotBlockedByTenant(date, time, tenants).blocked) return false;
    }
    return true;
  };

  const getTurnoHours = (date: string, block: "am" | "pm"): string[] => {
    const d = new Date(date + "T00:00:00");
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

  const getAvailableSlots = (date: string) => {
    const isToday = date === caracasToday;
    const currentHour = caracasNow.getHours();
    return getAllAvailableSlots(date, appointments, tenants, isToday ? currentHour : undefined, isToday);
  };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) { toast.error("Nombre y apellido son obligatorios"); return; }
    
    if (editing) {
      await updateTenant(editing, { firstName: form.firstName, lastName: form.lastName, cov: form.cov, email: form.email, phone: form.phone, cedula: form.cedula, rentalMode: form.rentalMode, rentalPrice: form.rentalPrice });
      toast.success("Inquilino actualizado");
    } else {
      // Create tenant first
      const newTenant = await addTenant({ firstName: form.firstName, lastName: form.lastName, cov: form.cov, email: form.email, phone: form.phone, cedula: form.cedula, rentalMode: form.rentalMode, rentalPrice: form.rentalPrice });

      // If date and schedule selected, also block slots
      if (form.date && form.rentalMode) {
        const tenantId = newTenant?.id;
        if (tenantId) {
          if (form.rentalMode === "turno" && form.turnoBlock) {
            const hours = getTurnoHours(form.date, form.turnoBlock as "am" | "pm");
            const startTime = hours[0];
            const lastH = parseInt(hours[hours.length - 1]);
            const endTime = `${(lastH + 1).toString().padStart(2, "0")}:00`;
            await addTenantBlockedSlot(tenantId, {
              date: form.date, allDay: false, startTime, endTime, status: 'approved',
            });
          } else if (form.rentalMode === "percent" && form.selectedHours.length > 0) {
            const sorted = [...form.selectedHours].sort();
            const ranges: { start: string; end: string }[] = [];
            let rangeStart = sorted[0];
            let prevHour = parseInt(sorted[0]);
            for (let i = 1; i <= sorted.length; i++) {
              const currentH = i < sorted.length ? parseInt(sorted[i]) : -1;
              if (currentH !== prevHour + 1) {
                ranges.push({ start: rangeStart, end: `${(prevHour + 1).toString().padStart(2, "0")}:00` });
                if (i < sorted.length) rangeStart = sorted[i];
              }
              prevHour = currentH;
            }
            for (const range of ranges) {
              await addTenantBlockedSlot(tenantId, {
                date: form.date, allDay: false, startTime: range.start, endTime: range.end, status: 'approved',
              });
            }
          }
        }
      }
      toast.success("Inquilino añadido");
    }
    resetForm();
  };

  const handleEdit = (t: Tenant) => {
    setForm({ firstName: t.firstName, lastName: t.lastName, cov: t.cov, email: t.email, phone: t.phone, cedula: t.cedula, rentalMode: t.rentalMode, rentalPrice: t.rentalPrice, date: "", turnoBlock: "", selectedHours: [] });
    setEditing(t.id);
    setShowForm(true);
  };

  const toggleHour = (setter: "form" | "block", time: string) => {
    if (setter === "form") {
      setForm(prev => ({
        ...prev,
        selectedHours: prev.selectedHours.includes(time)
          ? prev.selectedHours.filter(t => t !== time)
          : [...prev.selectedHours, time].sort(),
      }));
    } else {
      setBlockForm(prev => ({
        ...prev,
        selectedHours: prev.selectedHours.includes(time)
          ? prev.selectedHours.filter(t => t !== time)
          : [...prev.selectedHours, time].sort(),
      }));
    }
  };

  const handleAddBlocks = async (tenantId: string) => {
    if (!blockForm.date || !blockForm.rentalMode) { toast.error("Selecciona fecha y modalidad"); return; }

    if (blockForm.rentalMode === "turno") {
      if (!blockForm.turnoBlock) { toast.error("Selecciona el turno (AM o PM)"); return; }
      const hours = getTurnoHours(blockForm.date, blockForm.turnoBlock as "am" | "pm");
      const startTime = hours[0];
      const lastH = parseInt(hours[hours.length - 1]);
      const endTime = `${(lastH + 1).toString().padStart(2, "0")}:00`;
      await addTenantBlockedSlot(tenantId, {
        date: blockForm.date, allDay: false, startTime, endTime, status: 'approved',
      });
      toast.success(`Turno ${blockForm.turnoBlock.toUpperCase()} bloqueado para ${blockForm.date}`);
    } else {
      if (blockForm.selectedHours.length === 0) { toast.error("Selecciona al menos una hora"); return; }
      const sorted = [...blockForm.selectedHours].sort();
      const ranges: { start: string; end: string }[] = [];
      let rangeStart = sorted[0];
      let prevHour = parseInt(sorted[0]);
      for (let i = 1; i <= sorted.length; i++) {
        const currentH = i < sorted.length ? parseInt(sorted[i]) : -1;
        if (currentH !== prevHour + 1) {
          ranges.push({ start: rangeStart, end: `${(prevHour + 1).toString().padStart(2, "0")}:00` });
          if (i < sorted.length) rangeStart = sorted[i];
        }
        prevHour = currentH;
      }
      for (const range of ranges) {
        await addTenantBlockedSlot(tenantId, {
          date: blockForm.date, allDay: false, startTime: range.start, endTime: range.end, status: 'approved',
        });
      }
      toast.success(`${sorted.length} hora(s) bloqueada(s) en la agenda`);
    }
    resetBlockForm();
  };

  // Schedule selection UI (reusable for both new tenant form and existing tenant blocking)
  const ScheduleSelector = ({ date, rentalMode, turnoBlock, selectedHours, onDateChange, onModeChange, onTurnoChange, onToggleHour, rentalPrice, onPriceChange }: {
    date: string; rentalMode: string; turnoBlock: string; selectedHours: string[];
    onDateChange: (d: string) => void; onModeChange: (m: string) => void; onTurnoChange: (t: string) => void; onToggleHour: (h: string) => void;
    rentalPrice?: number; onPriceChange?: (p: number) => void;
  }) => {
    const amAvail = date ? isBlockAvailableFor(date, "am") : false;
    const pmAvail = date ? isBlockAvailableFor(date, "pm") : false;
    const pSlots = date && rentalMode === "percent" ? getAvailableSlots(date) : [];

    return (
      <div className="space-y-4">
        {/* Date */}
        <div>
          <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Clock className="w-3 h-3 text-gold" /> Fecha *</label>
          <input type="date" min={caracasToday} className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={date} onChange={(e) => onDateChange(e.target.value)} />
        </div>

        {/* Rental mode */}
        {date && (
          <div className="space-y-3">
            <p className="text-xs font-semibold flex items-center gap-1"><Building2 className="w-3 h-3 text-gold" /> Modalidad de Alquiler</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => onModeChange("turno")}
                className={`py-3 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-1 ${rentalMode === "turno" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
                <Clock className="w-4 h-4" /> Por Turno
              </button>
              <button type="button" onClick={() => onModeChange("percent")}
                className={`py-3 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-1 ${rentalMode === "percent" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
                <Building2 className="w-4 h-4" /> Por Porcentaje (%)
              </button>
            </div>
          </div>
        )}

        {/* Price field (admin only) */}
        {date && rentalMode && onPriceChange && (
          <div>
            <label className="block text-xs font-medium mb-1">{rentalMode === "turno" ? "Precio por Turno (USD)" : "Porcentaje (%)"}</label>
            <input type="number" step="0.01" min="0" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={rentalPrice || 0} onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)} />
          </div>
        )}

        {/* Turno AM/PM */}
        {date && rentalMode === "turno" && (
          <div className="space-y-3">
            <p className="text-xs font-medium">Seleccione el turno:</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled={!amAvail} onClick={() => onTurnoChange("am")}
                className={`py-4 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-2 ${!amAvail ? "bg-muted/50 border-border text-muted-foreground/50 cursor-not-allowed" : turnoBlock === "am" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
                <Sun className="w-5 h-5" />
                <span className="font-semibold">Mañana (AM)</span>
                <span className="text-xs opacity-75">8:00 AM - 12:00 PM</span>
                {!amAvail && <span className="text-xs text-destructive">No disponible</span>}
              </button>
              <button type="button" disabled={!pmAvail} onClick={() => onTurnoChange("pm")}
                className={`py-4 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-2 ${!pmAvail ? "bg-muted/50 border-border text-muted-foreground/50 cursor-not-allowed" : turnoBlock === "pm" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
                <Moon className="w-5 h-5" />
                <span className="font-semibold">Tarde (PM)</span>
                <span className="text-xs opacity-75">1:00 PM - 5:00 PM</span>
                {!pmAvail && <span className="text-xs text-destructive">No disponible</span>}
              </button>
            </div>
            {!amAvail && !pmAvail && <p className="text-xs text-destructive">No hay turnos disponibles para esta fecha.</p>}
          </div>
        )}

        {/* Percent hours */}
        {date && rentalMode === "percent" && (
          <div className="space-y-3">
            {pSlots.length > 0 ? (
              <>
                <p className="text-xs font-medium">Seleccione las horas disponibles:</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {pSlots.map((slot) => (
                    <button key={slot} type="button" onClick={() => onToggleHour(slot)}
                      className={`py-2.5 rounded-lg text-xs font-medium transition-all border ${selectedHours.includes(slot) ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
                      {slot}
                    </button>
                  ))}
                </div>
                {selectedHours.length > 0 && <p className="text-xs text-muted-foreground">{selectedHours.length} hora(s) seleccionada(s)</p>}
              </>
            ) : (
              <p className="text-xs text-destructive text-center py-4">No hay horas disponibles para esta fecha.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Rental Requests Section */}
      {rentalRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-400" /> Solicitudes de Alquiler
            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">{rentalRequests.length}</span>
          </h3>
          {rentalRequests.map((req) => {
            const cleanPhone = req.requesterPhone.replace(/[^0-9+]/g, "");
            const waPhone = cleanPhone.startsWith("+") ? cleanPhone.slice(1) : cleanPhone;
            return (
              <div key={req.id} className="bg-card rounded-xl p-5 border border-orange-500/30 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold">{req.requesterFirstName} {req.requesterLastName}</p>
                    <p className="text-sm text-muted-foreground">COV: {req.requesterCov} • Cédula: {req.requesterCedula}</p>
                    <p className="text-sm text-muted-foreground">{req.requesterEmail} • {req.requesterPhone}</p>
                    <p className="text-sm font-medium mt-1">
                      {req.rentalMode === "turno" ? `Turno: $${(req.rentalPrice || 0).toFixed(2)} USD` : `Porcentaje: ${req.rentalPrice}%`}
                    </p>
                    <p className="text-sm text-gold font-medium mt-1">
                      📅 {req.date} • {req.allDay ? "Día completo" : `${req.startTime} - ${req.endTime}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {req.requesterPhone && (
                      <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="WhatsApp"><MessageCircle className="w-4 h-4" /></a>
                    )}
                    {req.requesterEmail && (
                      <a href={`mailto:${req.requesterEmail}`} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" title="Correo"><Mail className="w-4 h-4" /></a>
                    )}
                    <button onClick={async () => { await approveRentalRequest(req.id); toast.success("✅ Alquiler aprobado — Horario bloqueado permanentemente"); }} className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="Aprobar"><Check className="w-4 h-4" /></button>
                    <button onClick={async () => { await rejectRentalRequest(req.id); toast.info("Solicitud rechazada — Horario liberado"); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" title="Rechazar"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Existing Tenants Section */}
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gold" /> Alquiler de Consultorio
        </h3>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
          <Plus className="w-4 h-4" /> Nuevo Inquilino
        </button>
      </div>

      {showForm && (
        <div className="bg-muted rounded-xl p-5 space-y-5">
          <h4 className="font-semibold text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-gold" /> {editing ? "Editar Inquilino" : "Nuevo Inquilino"}</h4>
          
          {/* Personal Data - matching public form */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold flex items-center gap-2"><User className="w-3.5 h-3.5 text-gold" /> Datos Personales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Nombre *</label>
                <input type="text" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "") })} maxLength={50} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Apellido *</label>
                <input type="text" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "") })} maxLength={50} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Cédula *</label>
                <input type="text" inputMode="numeric" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value.replace(/[^0-9]/g, "") })} maxLength={20} placeholder="12345678" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> COV *</label>
                <input type="text" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.cov} onChange={(e) => setForm({ ...form, cov: e.target.value })} maxLength={20} placeholder="COV-12345" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email *</label>
                <input type="email" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={100} placeholder="doctor@correo.com" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono *</label>
                <div className="flex">
                  <span className="inline-flex items-center px-2 bg-card border border-r-0 border-border rounded-l-lg text-xs text-muted-foreground font-medium">+58</span>
                  <input type="tel" inputMode="numeric" className="w-full bg-card rounded-r-lg rounded-l-none px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.phone} onChange={(e) => { let val = e.target.value.replace(/[^0-9]/g, ""); if (val.startsWith("0")) val = val.slice(1); setForm({ ...form, phone: val }); }} maxLength={10} placeholder="4121234567" />
                </div>
              </div>
            </div>
          </div>

          {/* Schedule - same as public form */}
          {!editing && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-gold" /> Fecha y Horario</h3>
              <ScheduleSelector
                date={form.date}
                rentalMode={form.rentalMode}
                turnoBlock={form.turnoBlock}
                selectedHours={form.selectedHours}
                onDateChange={(d) => setForm(prev => ({ ...prev, date: d, turnoBlock: "", selectedHours: [] }))}
                onModeChange={(m) => setForm(prev => ({ ...prev, rentalMode: m as "turno" | "percent", turnoBlock: "", selectedHours: [] }))}
                onTurnoChange={(t) => setForm(prev => ({ ...prev, turnoBlock: t as "" | "am" | "pm" }))}
                onToggleHour={(h) => toggleHour("form", h)}
                rentalPrice={form.rentalPrice}
                onPriceChange={(p) => setForm(prev => ({ ...prev, rentalPrice: p }))}
              />
            </div>
          )}

          {/* Price only when editing */}
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Modo de Alquiler</label>
                <select className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.rentalMode} onChange={(e) => setForm({ ...form, rentalMode: e.target.value as "turno" | "percent" })}>
                  <option value="turno">Por Turno</option>
                  <option value="percent">Por Porcentaje (%)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{form.rentalMode === "turno" ? "Precio por Turno (USD)" : "Porcentaje (%)"}</label>
                <input type="number" step="0.01" min="0" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.rentalPrice} onChange={(e) => setForm({ ...form, rentalPrice: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Save className="w-4 h-4" /> Guardar</button>
            <button onClick={resetForm} className="bg-muted-foreground/10 text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {tenants.length === 0 && !showForm ? (
        <p className="text-muted-foreground text-center py-8">No hay inquilinos registrados</p>
      ) : (
        tenants.map((t) => (
          <div key={t.id} className="bg-card rounded-xl p-5 gold-border space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold">{t.firstName} {t.lastName}</p>
                <p className="text-sm text-muted-foreground">COV: {t.cov || "—"} • Cédula: {t.cedula || "—"}</p>
                <p className="text-sm text-muted-foreground">{t.email || "—"} • {t.phone || "—"}</p>
                <p className="text-sm font-medium mt-1">{t.rentalMode === "turno" ? `Turno: $${t.rentalPrice.toFixed(2)} USD` : `Porcentaje: ${t.rentalPrice}%`}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(t)} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20"><Edit className="w-4 h-4" /></button>
                <button onClick={() => { setBlockingTenant(blockingTenant === t.id ? null : t.id); resetBlockForm(); }} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20" title="Agendar horario"><Lock className="w-4 h-4" /></button>
                <button onClick={async () => { await deleteTenant(t.id); toast.success("Inquilino eliminado"); }} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {blockingTenant === t.id && (
              <div className="bg-muted rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-1"><Calendar className="w-4 h-4" /> Agendar Horario para {t.firstName}</h4>
                <ScheduleSelector
                  date={blockForm.date}
                  rentalMode={blockForm.rentalMode}
                  turnoBlock={blockForm.turnoBlock}
                  selectedHours={blockForm.selectedHours}
                  onDateChange={(d) => setBlockForm({ date: d, rentalMode: "", turnoBlock: "", selectedHours: [] })}
                  onModeChange={(m) => setBlockForm(prev => ({ ...prev, rentalMode: m as "" | "turno" | "percent", turnoBlock: "", selectedHours: [] }))}
                  onTurnoChange={(t) => setBlockForm(prev => ({ ...prev, turnoBlock: t as "" | "am" | "pm" }))}
                  onToggleHour={(h) => toggleHour("block", h)}
                />
                {((blockForm.rentalMode === "turno" && blockForm.turnoBlock) || (blockForm.rentalMode === "percent" && blockForm.selectedHours.length > 0)) && (
                  <button onClick={() => handleAddBlocks(t.id)} className="w-full bg-gold text-gold-foreground py-2.5 rounded-lg text-sm font-semibold">
                    Bloquear Horario
                  </button>
                )}
              </div>
            )}

            {t.blockedSlots.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Horarios bloqueados:</p>
                {t.blockedSlots.sort((a, b) => a.date.localeCompare(b.date)).map((sl) => (
                  <div key={sl.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 text-xs">
                    <span>{sl.date} — {sl.allDay ? "Día completo" : `${sl.startTime} - ${sl.endTime}`}</span>
                    <button onClick={async () => { await removeTenantBlockedSlot(t.id, sl.id); toast.success("Bloqueo removido"); }} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
      </div>
    </div>
  );
};
