import { useState } from "react";
import { useCosoStore, Patient } from "@/store/useCosoStore";
import { Users, Plus, Trash2, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";

export const AdminPatients = () => {
  const { patients, addPatient, updatePatient, deletePatient } = useCosoStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", cedula: "", phone: "", email: "", notes: "" });

  const handleAdd = () => {
    if (!form.name) { toast.error("Nombre requerido"); return; }
    addPatient({ id: Math.random().toString(36).substring(2, 10), ...form });
    setAdding(false);
    setForm({ name: "", cedula: "", phone: "", email: "", notes: "" });
    toast.success("Paciente agregado");
  };

  const handleUpdate = (id: string) => {
    updatePatient(id, form);
    setEditing(null);
    toast.success("Paciente actualizado");
  };

  const startEdit = (p: Patient) => {
    setEditing(p.id);
    setForm({ name: p.name, cedula: p.cedula, phone: p.phone, email: p.email, notes: p.notes });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-gold" /> Pacientes
        </h2>
        <button onClick={() => setAdding(true)} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {(adding || editing) && (
        <div className="bg-card rounded-xl p-5 gold-border mb-6 space-y-3">
          <h3 className="font-semibold">{adding ? "Nuevo Paciente" : "Editar Paciente"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} maxLength={100} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Cédula" value={form.cedula} onChange={(e) => setForm((p) => ({ ...p, cedula: e.target.value }))} maxLength={20} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Teléfono" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} maxLength={20} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} maxLength={100} />
          </div>
          <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border resize-none" placeholder="Notas" rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} maxLength={500} />
          <div className="flex gap-2">
            <button onClick={adding ? handleAdd : () => handleUpdate(editing!)} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Save className="w-4 h-4" /> Guardar</button>
            <button onClick={() => { setAdding(false); setEditing(null); }} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm flex items-center gap-1"><X className="w-4 h-4" /> Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {patients.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No hay pacientes registrados</p>
        ) : (
          patients.map((p) => (
            <div key={p.id} className="bg-card rounded-xl p-4 gold-border flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.cedula} • {p.phone}</p>
                {p.notes && <p className="text-xs text-muted-foreground">📝 {p.notes}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(p)} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20"><Edit className="w-4 h-4" /></button>
                <button onClick={() => { deletePatient(p.id); toast.info("Paciente eliminado"); }} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
