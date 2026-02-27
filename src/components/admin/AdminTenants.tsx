
import { useState } from "react";
import { useClinicData, Tenant, TenantBlockedSlot } from "@/hooks/useClinicData";
import { Building2, Plus, Save, Trash2, Edit, Lock, Calendar, X, Check, Mail, MessageCircle, Clock, Sun, Moon } from "lucide-react";
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
    setForm({ firstName: "", lastName: "", cov: "", email: "", phone: "", cedula: "", rentalMode: "turno", rentalPrice: 0 });
    setShowForm(false);
    setEditing(null);
  };

  const resetBlockForm = () => {
    setBlockForm({ date: "", rentalMode: "", turnoBlock: "", selectedHours: [] });
  };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) { toast.error("Nombre y apellido son obligatorios"); return; }
    if (editing) {
      await updateTenant(editing, form);
      toast.success("Inquilino actualizado");
    } else {
      await addTenant(form);
      toast.success("Inquilino añadido");
    }
    resetForm();
  };

  const handleEdit = (t: Tenant) => {
    setForm({ firstName: t.firstName, lastName: t.lastName, cov: t.cov, email: t.email, phone: t.phone, cedula: t.cedula, rentalMode: t.rentalMode, rentalPrice: t.rentalPrice });
    setEditing(t.id);
    setShowForm(true);
  };

  // Check if AM/PM block is fully available
  const isBlockAvailable = (block: "am" | "pm"): boolean => {
    if (!blockForm.date) return false;
    const startH = block === "am" ? 8 : 13;
    const endH = block === "am" ? 12 : 17;
    const d = new Date(blockForm.date + "T00:00:00");
    const day = d.getDay();
    if (day === 0) return false;
    if (day === 6 && block === "pm") return false;
    const actualEnd = day === 6 && block === "am" ? 14 : endH;
    const isToday = blockForm.date === caracasToday;
    const currentHour = caracasNow.getHours();

    for (let h = startH; h < actualEnd; h++) {
      if (isToday && h <= currentHour) continue;
      const time = `${h.toString().padStart(2, "0")}:00`;
      const hasAppointment = appointments.some(
        (a) => a.date === blockForm.date && a.status !== "cancelada" && parseInt(a.time.split(":")[0]) === h
      );
      if (hasAppointment) return false;
      if (isSlotBlockedByTenant(blockForm.date, time, tenants).blocked) return false;
    }
    return true;
  };

  const getTurnoHours = (block: "am" | "pm"): string[] => {
    const d = new Date(blockForm.date + "T00:00:00");
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

  // Get all available slots for percent mode
  const isToday = blockForm.date === caracasToday;
  const currentHour = caracasNow.getHours();
  const percentSlots = blockForm.date && blockForm.rentalMode === "percent"
    ? getAllAvailableSlots(blockForm.date, appointments, tenants, isToday ? currentHour : undefined, isToday)
    : [];

  const toggleHour = (time: string) => {
    setBlockForm(prev => ({
      ...prev,
      selectedHours: prev.selectedHours.includes(time)
        ? prev.selectedHours.filter(t => t !== time)
        : [...prev.selectedHours, time].sort(),
    }));
  };

  const handleAddBlocks = async (tenantId: string) => {
    if (!blockForm.date || !blockForm.rentalMode) { toast.error("Selecciona fecha y modalidad"); return; }

    if (blockForm.rentalMode === "turno") {
      if (!blockForm.turnoBlock) { toast.error("Selecciona el turno (AM o PM)"); return; }
      const hours = getTurnoHours(blockForm.turnoBlock as "am" | "pm");
      const startTime = hours[0];
      const lastH = parseInt(hours[hours.length - 1]);
      const endTime = `${(lastH + 1).toString().padStart(2, "0")}:00`;
      await addTenantBlockedSlot(tenantId, {
        date: blockForm.date,
        allDay: false,
        startTime,
        endTime,
        status: 'approved',
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

  const amAvailable = blockForm.date ? isBlockAvailable("am") : false;
  const pmAvailable = blockForm.date ? isBlockAvailable("pm") : false;

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
        <div className="bg-muted rounded-xl p-5 space-y-3">
          <h4 className="font-semibold text-sm">{editing ? "Editar Inquilino" : "Nuevo Inquilino"}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Nombre *</label><input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><label className="block text-xs font-medium mb-1">Apellido *</label><input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            <div><label className="block text-xs font-medium mb-1">COV</label><input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.cov} onChange={(e) => setForm({ ...form, cov: e.target.value })} /></div>
            <div><label className="block text-xs font-medium mb-1">Cédula</label><input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} /></div>
            <div><label className="block text-xs font-medium mb-1">Email</label><input type="email" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="block text-xs font-medium mb-1">Teléfono</label><input type="tel" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Modo de Alquiler</label><select className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.rentalMode} onChange={(e) => setForm({ ...form, rentalMode: e.target.value as "turno" | "percent" })}><option value="turno">Por Turno (USD)</option><option value="percent">Por Porcentaje (%)</option></select></div>
            <div><label className="block text-xs font-medium mb-1">{form.rentalMode === "turno" ? "Precio por Turno (USD)" : "Porcentaje (%)"}</label><input type="number" step="0.01" min="0" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.rentalPrice} onChange={(e) => setForm({ ...form, rentalPrice: parseFloat(e.target.value) || 0 })} /></div>
          </div>
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

                {/* Date selection */}
                <div>
                  <label className="block text-xs font-medium mb-1">Fecha *</label>
                  <input type="date" min={caracasToday} className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={blockForm.date} onChange={(e) => setBlockForm({ date: e.target.value, rentalMode: "", turnoBlock: "", selectedHours: [] })} />
                </div>

                {/* Rental mode selection (after date) */}
                {blockForm.date && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold flex items-center gap-1"><Building2 className="w-3 h-3 text-gold" /> Modalidad de Alquiler</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBlockForm(prev => ({ ...prev, rentalMode: "turno", turnoBlock: "", selectedHours: [] }))}
                        className={`py-3 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-1 ${
                          blockForm.rentalMode === "turno"
                            ? "bg-gold text-gold-foreground border-gold"
                            : "bg-card border-border hover:border-gold/50"
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        Por Turno (USD)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlockForm(prev => ({ ...prev, rentalMode: "percent", turnoBlock: "", selectedHours: [] }))}
                        className={`py-3 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-1 ${
                          blockForm.rentalMode === "percent"
                            ? "bg-gold text-gold-foreground border-gold"
                            : "bg-card border-border hover:border-gold/50"
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        Por Porcentaje (%)
                      </button>
                    </div>
                  </div>
                )}

                {/* Turno mode → AM/PM */}
                {blockForm.date && blockForm.rentalMode === "turno" && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium">Seleccione el turno:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={!amAvailable}
                        onClick={() => setBlockForm(prev => ({ ...prev, turnoBlock: "am" }))}
                        className={`py-4 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-2 ${
                          !amAvailable
                            ? "bg-muted/50 border-border text-muted-foreground/50 cursor-not-allowed"
                            : blockForm.turnoBlock === "am"
                              ? "bg-gold text-gold-foreground border-gold"
                              : "bg-card border-border hover:border-gold/50"
                        }`}
                      >
                        <Sun className="w-5 h-5" />
                        <span className="font-semibold">Mañana (AM)</span>
                        <span className="text-xs opacity-75">8:00 AM - 12:00 PM</span>
                        {!amAvailable && <span className="text-xs text-destructive">No disponible</span>}
                      </button>
                      <button
                        type="button"
                        disabled={!pmAvailable}
                        onClick={() => setBlockForm(prev => ({ ...prev, turnoBlock: "pm" }))}
                        className={`py-4 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-2 ${
                          !pmAvailable
                            ? "bg-muted/50 border-border text-muted-foreground/50 cursor-not-allowed"
                            : blockForm.turnoBlock === "pm"
                              ? "bg-gold text-gold-foreground border-gold"
                              : "bg-card border-border hover:border-gold/50"
                        }`}
                      >
                        <Moon className="w-5 h-5" />
                        <span className="font-semibold">Tarde (PM)</span>
                        <span className="text-xs opacity-75">1:00 PM - 5:00 PM</span>
                        {!pmAvailable && <span className="text-xs text-destructive">No disponible</span>}
                      </button>
                    </div>
                    {!amAvailable && !pmAvailable && (
                      <p className="text-xs text-destructive">No hay turnos disponibles para esta fecha.</p>
                    )}
                    {blockForm.turnoBlock && (
                      <button onClick={() => handleAddBlocks(t.id)} className="w-full bg-gold text-gold-foreground py-2.5 rounded-lg text-sm font-semibold">
                        Bloquear Turno {blockForm.turnoBlock.toUpperCase()}
                      </button>
                    )}
                  </div>
                )}

                {/* Percent mode → individual hours */}
                {blockForm.date && blockForm.rentalMode === "percent" && (
                  <div className="space-y-3">
                    {percentSlots.length > 0 ? (
                      <>
                        <p className="text-xs font-medium">Seleccione las horas disponibles:</p>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {percentSlots.map((slot) => {
                            const isSelected = blockForm.selectedHours.includes(slot);
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => toggleHour(slot)}
                                className={`py-2.5 rounded-lg text-xs font-medium transition-all border ${
                                  isSelected
                                    ? "bg-gold text-gold-foreground border-gold"
                                    : "bg-card border-border hover:border-gold/50"
                                }`}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                        {blockForm.selectedHours.length > 0 && (
                          <div className="flex items-center justify-between pt-1">
                            <p className="text-xs text-muted-foreground">{blockForm.selectedHours.length} hora(s) seleccionada(s)</p>
                            <button onClick={() => handleAddBlocks(t.id)} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold">
                              Bloquear Selección
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-destructive text-center py-4">No hay horas disponibles para esta fecha.</p>
                    )}
                  </div>
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
