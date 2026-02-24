import { useState } from "react";
import { useCosoStore, Tenant, TenantBlockedSlot } from "@/store/useCosoStore";
import { Building2, Plus, Save, Trash2, Edit, Lock, Calendar } from "lucide-react";
import { toast } from "sonner";

const generateId = () => Math.random().toString(36).substring(2, 10);

export const AdminTenants = () => {
  const { tenants, addTenant, updateTenant, deleteTenant, addTenantBlockedSlot, removeTenantBlockedSlot } = useCosoStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [blockingTenant, setBlockingTenant] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", cov: "", email: "", phone: "", cedula: "",
    rentalMode: "turno" as "turno" | "percent", rentalPrice: 0,
  });
  const [blockForm, setBlockForm] = useState({ date: "", allDay: true, startTime: "08:00", endTime: "17:00" });

  const resetForm = () => {
    setForm({ firstName: "", lastName: "", cov: "", email: "", phone: "", cedula: "", rentalMode: "turno", rentalPrice: 0 });
    setShowForm(false);
    setEditing(null);
  };

  const handleSave = () => {
    if (!form.firstName || !form.lastName) { toast.error("Nombre y apellido son obligatorios"); return; }
    if (editing) {
      updateTenant(editing, form);
      toast.success("Inquilino actualizado");
    } else {
      addTenant({ id: generateId(), ...form, blockedSlots: [] });
      toast.success("Inquilino añadido");
    }
    resetForm();
  };

  const handleEdit = (t: Tenant) => {
    setForm({ firstName: t.firstName, lastName: t.lastName, cov: t.cov, email: t.email, phone: t.phone, cedula: t.cedula, rentalMode: t.rentalMode, rentalPrice: t.rentalPrice });
    setEditing(t.id);
    setShowForm(true);
  };

  const handleAddBlock = (tenantId: string) => {
    if (!blockForm.date) { toast.error("Selecciona una fecha"); return; }
    const slot: TenantBlockedSlot = {
      id: generateId(),
      date: blockForm.date,
      allDay: blockForm.allDay,
      startTime: blockForm.allDay ? undefined : blockForm.startTime,
      endTime: blockForm.allDay ? undefined : blockForm.endTime,
    };
    addTenantBlockedSlot(tenantId, slot);
    toast.success("Horario bloqueado en la agenda");
    setBlockForm({ date: "", allDay: true, startTime: "08:00", endTime: "17:00" });
  };

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

      {/* Form */}
      {showForm && (
        <div className="bg-muted rounded-xl p-5 space-y-3">
          <h4 className="font-semibold text-sm">{editing ? "Editar Inquilino" : "Nuevo Inquilino"}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Nombre *</label>
              <input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Apellido *</label>
              <input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">COV (Colegio de Odontólogos)</label>
              <input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.cov} onChange={(e) => setForm({ ...form, cov: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Cédula</label>
              <input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <input type="email" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Teléfono</label>
              <input type="tel" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Modo de Alquiler</label>
              <select className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.rentalMode} onChange={(e) => setForm({ ...form, rentalMode: e.target.value as "turno" | "percent" })}>
                <option value="turno">Por Turno (monto fijo)</option>
                <option value="percent">Por Porcentaje (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{form.rentalMode === "turno" ? "Precio por Turno (USD)" : "Porcentaje (%)"}</label>
              <input type="number" step="0.01" min="0" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={form.rentalPrice} onChange={(e) => setForm({ ...form, rentalPrice: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Save className="w-4 h-4" /> Guardar</button>
            <button onClick={resetForm} className="bg-muted-foreground/10 text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* List */}
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
                <p className="text-sm font-medium mt-1">
                  {t.rentalMode === "turno" ? `Turno: $${t.rentalPrice.toFixed(2)} USD` : `Porcentaje: ${t.rentalPrice}%`}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(t)} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20"><Edit className="w-4 h-4" /></button>
                <button onClick={() => setBlockingTenant(blockingTenant === t.id ? null : t.id)} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20" title="Bloquear horario"><Lock className="w-4 h-4" /></button>
                <button onClick={() => { deleteTenant(t.id); toast.success("Inquilino eliminado"); }} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Block schedule */}
            {blockingTenant === t.id && (
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-1"><Calendar className="w-4 h-4" /> Bloquear Horario</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Fecha</label>
                    <input type="date" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={blockForm.date} onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })} />
                  </div>
                  <div className="flex items-end gap-2 pb-0.5">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={blockForm.allDay} onChange={(e) => setBlockForm({ ...blockForm, allDay: e.target.checked })} className="rounded" />
                      Día completo
                    </label>
                  </div>
                </div>
                {!blockForm.allDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Desde</label>
                      <select className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={blockForm.startTime} onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}>
                        {Array.from({ length: 9 }, (_, i) => 8 + i).map((h) => <option key={h} value={`${h.toString().padStart(2, "0")}:00`}>{h}:00</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Hasta</label>
                      <select className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={blockForm.endTime} onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}>
                        {Array.from({ length: 9 }, (_, i) => 9 + i).map((h) => <option key={h} value={`${h.toString().padStart(2, "0")}:00`}>{h}:00</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <button onClick={() => handleAddBlock(t.id)} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold">Bloquear</button>
              </div>
            )}

            {/* Blocked slots list */}
            {t.blockedSlots.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Horarios bloqueados:</p>
                {t.blockedSlots.sort((a, b) => a.date.localeCompare(b.date)).map((sl) => (
                  <div key={sl.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 text-xs">
                    <span>{sl.date} — {sl.allDay ? "Día completo" : `${sl.startTime} - ${sl.endTime}`}</span>
                    <button onClick={() => { removeTenantBlockedSlot(t.id, sl.id); toast.success("Bloqueo removido"); }} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3 h-3" /></button>
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
