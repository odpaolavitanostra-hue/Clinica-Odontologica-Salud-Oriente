
import { useState } from "react";
import { useClinicData, Tenant, TenantBlockedSlot } from "@/hooks/useClinicData";
import { Building2, Plus, Save, Trash2, Edit, Lock, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import { getCaracasToday } from "@/lib/scheduleUtils";

export const AdminTenants = () => {
  const { tenants, appointments, addTenant, updateTenant, deleteTenant, addTenantBlockedSlot, removeTenantBlockedSlot } = useClinicData();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [blockingTenant, setBlockingTenant] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", cov: "", email: "", phone: "", cedula: "",
    rentalMode: "turno" as "turno" | "percent", rentalPrice: 0,
  });
  const [blockForm, setBlockForm] = useState({ date: "", selectedHours: [] as string[] });

  const resetForm = () => {
    setForm({ firstName: "", lastName: "", cov: "", email: "", phone: "", cedula: "", rentalMode: "turno", rentalPrice: 0 });
    setShowForm(false);
    setEditing(null);
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

  // Get all possible hours for a given date
  const getAvailableHours = (date: string) => {
    if (!date) return [];
    const d = new Date(date + "T00:00:00");
    const day = d.getDay();
    if (day === 0) return []; // domingo
    const end = day === 6 ? 14 : 17;
    const hours: { time: string; status: "free" | "booked" | "blocked" }[] = [];

    // Get all blocked slots for this date (from all tenants)
    const allBlockedSlots = tenants.flatMap(t => t.blockedSlots);

    for (let h = 8; h < end; h++) {
      const time = `${h.toString().padStart(2, "0")}:00`;

      // Check if already booked by appointment
      const isBooked = appointments.some(
        (a) => a.date === date && a.time === time && a.status !== "cancelada"
      );

      // Check if blocked by a tenant
      const isBlocked = allBlockedSlots.some(sl => {
        if (sl.date !== date) return false;
        if (sl.allDay) return true;
        if (sl.startTime && sl.endTime) {
          return time >= sl.startTime && time < sl.endTime;
        }
        return false;
      });

      hours.push({
        time,
        status: isBlocked ? "blocked" : isBooked ? "booked" : "free",
      });
    }
    return hours;
  };

  const toggleHour = (time: string) => {
    setBlockForm(prev => ({
      ...prev,
      selectedHours: prev.selectedHours.includes(time)
        ? prev.selectedHours.filter(t => t !== time)
        : [...prev.selectedHours, time].sort(),
    }));
  };

  const selectAllFree = (date: string) => {
    const hours = getAvailableHours(date);
    const freeHours = hours.filter(h => h.status === "free").map(h => h.time);
    setBlockForm(prev => ({ ...prev, selectedHours: freeHours }));
  };

  const handleAddBlocks = async (tenantId: string) => {
    if (!blockForm.date) { toast.error("Selecciona una fecha"); return; }
    if (blockForm.selectedHours.length === 0) { toast.error("Selecciona al menos una hora"); return; }

    const sorted = [...blockForm.selectedHours].sort();

    // Group consecutive hours into ranges
    const ranges: { start: string; end: string }[] = [];
    let rangeStart = sorted[0];
    let prevHour = parseInt(sorted[0]);

    for (let i = 1; i <= sorted.length; i++) {
      const currentHour = i < sorted.length ? parseInt(sorted[i]) : -1;
      if (currentHour !== prevHour + 1) {
        ranges.push({
          start: rangeStart,
          end: `${(prevHour + 1).toString().padStart(2, "0")}:00`,
        });
        if (i < sorted.length) rangeStart = sorted[i];
      }
      prevHour = currentHour;
    }

    // If all hours selected = full day
    const hours = getAvailableHours(blockForm.date);
    const allFreeHours = hours.filter(h => h.status === "free").map(h => h.time);
    const isAllDay = sorted.length === allFreeHours.length && sorted.every((h, i) => h === allFreeHours[i]) && allFreeHours.length === hours.length;

    if (isAllDay) {
      await addTenantBlockedSlot(tenantId, {
        date: blockForm.date,
        allDay: true,
      });
    } else {
      for (const range of ranges) {
        await addTenantBlockedSlot(tenantId, {
          date: blockForm.date,
          allDay: false,
          startTime: range.start,
          endTime: range.end,
        });
      }
    }

    toast.success(`${sorted.length} hora(s) bloqueada(s) en la agenda`);
    setBlockForm({ date: "", selectedHours: [] });
  };

  const caracasToday = getCaracasToday();

  return (
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
                <button onClick={() => { setBlockingTenant(blockingTenant === t.id ? null : t.id); setBlockForm({ date: "", selectedHours: [] }); }} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20" title="Bloquear horario"><Lock className="w-4 h-4" /></button>
                <button onClick={async () => { await deleteTenant(t.id); toast.success("Inquilino eliminado"); }} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {blockingTenant === t.id && (
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-1"><Calendar className="w-4 h-4" /> Agendar Horario para {t.firstName}</h4>
                <div>
                  <label className="block text-xs font-medium mb-1">Fecha</label>
                  <input type="date" min={caracasToday} className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={blockForm.date} onChange={(e) => setBlockForm({ date: e.target.value, selectedHours: [] })} />
                </div>

                {blockForm.date && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">Selecciona las horas a bloquear:</p>
                      <button onClick={() => selectAllFree(blockForm.date)} className="text-xs text-gold hover:underline">Seleccionar todo</button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {getAvailableHours(blockForm.date).map((slot) => {
                        const isSelected = blockForm.selectedHours.includes(slot.time);
                        return (
                          <button
                            key={slot.time}
                            disabled={slot.status !== "free"}
                            onClick={() => toggleHour(slot.time)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                              slot.status === "booked"
                                ? "bg-destructive/10 text-destructive border-destructive/20 cursor-not-allowed line-through"
                                : slot.status === "blocked"
                                ? "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20 cursor-not-allowed"
                                : isSelected
                                ? "bg-gold text-gold-foreground border-gold"
                                : "bg-card border-border hover:border-gold hover:text-gold"
                            }`}
                          >
                            {slot.time}
                            {slot.status === "booked" && <span className="block text-[10px]">Ocupado</span>}
                            {slot.status === "blocked" && <span className="block text-[10px]">Bloqueado</span>}
                          </button>
                        );
                      })}
                    </div>
                    {getAvailableHours(blockForm.date).length === 0 && (
                      <p className="text-xs text-destructive">Domingo - no hay horario disponible</p>
                    )}
                    {blockForm.selectedHours.length > 0 && (
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-muted-foreground">{blockForm.selectedHours.length} hora(s) seleccionada(s)</p>
                        <button onClick={() => handleAddBlocks(t.id)} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold">
                          Bloquear Selección
                        </button>
                      </div>
                    )}
                  </>
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
  );
};
