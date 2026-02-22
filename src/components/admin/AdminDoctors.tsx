import { useState } from "react";
import { useCosoStore, Doctor } from "@/store/useCosoStore";
import { Stethoscope, Plus, Trash2, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";

export const AdminDoctors = () => {
  const { doctors, addDoctor, updateDoctor, deleteDoctor } = useCosoStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; pass: string; specialty: string; payModel: 'fixed' | 'percent'; rate: number }>({ name: "", email: "", pass: "000000", specialty: "Odontología General", payModel: "percent", rate: 0.4 });

  const handleAdd = () => {
    if (!form.name || !form.email) { toast.error("Completa nombre y email"); return; }
    addDoctor({ id: Math.random().toString(36).substring(2, 10), ...form });
    setAdding(false);
    setForm({ name: "", email: "", pass: "000000", specialty: "Odontología General", payModel: "percent", rate: 0.4 });
    toast.success("Doctor agregado");
  };

  const handleUpdate = (id: string) => {
    updateDoctor(id, form);
    setEditing(null);
    toast.success("Doctor actualizado");
  };

  const startEdit = (d: Doctor) => {
    setEditing(d.id);
    setForm({ name: d.name, email: d.email, pass: d.pass, specialty: d.specialty, payModel: d.payModel, rate: d.rate });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-gold" /> Doctores
        </h2>
        <button onClick={() => setAdding(true)} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {(adding || editing) && (
        <div className="bg-card rounded-xl p-5 gold-border mb-6 space-y-3">
          <h3 className="font-semibold">{adding ? "Nuevo Doctor" : "Editar Doctor"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} maxLength={100} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} maxLength={100} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Contraseña" value={form.pass} onChange={(e) => setForm((p) => ({ ...p, pass: e.target.value }))} maxLength={50} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Especialidad" value={form.specialty} onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))} maxLength={100} />
            <select className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={form.payModel} onChange={(e) => setForm((p) => ({ ...p, payModel: e.target.value as 'fixed' | 'percent' }))}>
              <option value="percent">Porcentaje (%)</option>
              <option value="fixed">Monto Fijo (USD)</option>
            </select>
            <input type="number" step="0.01" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder={form.payModel === "percent" ? "Ej: 0.40" : "Ej: 50"} value={form.rate} onChange={(e) => setForm((p) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={adding ? handleAdd : () => handleUpdate(editing!)} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
              <Save className="w-4 h-4" /> Guardar
            </button>
            <button onClick={() => { setAdding(false); setEditing(null); }} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm flex items-center gap-1">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {doctors.map((d) => (
          <div key={d.id} className="bg-card rounded-xl p-4 gold-border flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold">{d.name}</p>
              <p className="text-sm text-muted-foreground">{d.email} • {d.specialty}</p>
              <p className="text-xs text-muted-foreground">
                Pago: {d.payModel === "percent" ? `${(d.rate * 100).toFixed(0)}%` : `$${d.rate.toFixed(2)} USD`}
              </p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(d)} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20"><Edit className="w-4 h-4" /></button>
              <button onClick={() => { deleteDoctor(d.id); toast.info("Doctor eliminado"); }} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
