
import { useState } from "react";
import { useClinicData, Doctor } from "@/hooks/useClinicData";
import { supabase } from "@/integrations/supabase/client";
import { Stethoscope, Plus, Trash2, Edit, Save, X, Key, Mail, Phone, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import DoctorProfileEditor from "./DoctorProfileEditor";

export const AdminDoctors = () => {
  const { doctors, addDoctor, updateDoctor, deleteDoctor } = useClinicData();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; specialty: string; payModel: 'fixed' | 'percent'; rate: number; password: string; phone: string; cov: string }>({
    name: "", email: "", specialty: "Odontología General", payModel: "percent", rate: 0.4, password: "", phone: "", cov: "",
  });
  const [changingPw, setChangingPw] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");

  const handleAdd = async () => {
    if (!form.name || !form.email) { toast.error("Completa nombre y email"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) { toast.error("Ingresa un email válido (ej: doctor@clinica.com)"); return; }
    if (!form.password || form.password.length < 6) { toast.error("Contraseña de al menos 6 caracteres"); return; }
    try {
      const res = await supabase.functions.invoke("manage-doctor-auth", { body: { action: "create", email: form.email, password: form.password } });
      if (res.error || res.data?.error) throw new Error(res.data?.error || "Error al crear cuenta");
      await addDoctor({ name: form.name, email: form.email, specialty: form.specialty, payModel: form.payModel, rate: form.rate, phone: form.phone, cov: form.cov, signatureImg: '', sealImg: '' });
      setAdding(false);
      setForm({ name: "", email: "", specialty: "Odontología General", payModel: "percent", rate: 0.4, password: "", phone: "", cov: "" });
      toast.success("Doctor agregado con cuenta de acceso");
    } catch (err: any) { toast.error(err.message || "Error al crear doctor"); }
  };

  const handleUpdate = async (id: string) => {
    await updateDoctor(id, { name: form.name, email: form.email, specialty: form.specialty, payModel: form.payModel, rate: form.rate, phone: form.phone, cov: form.cov });
    setEditing(null);
    toast.success("Doctor actualizado");
  };

  const handleChangePw = async (doctorEmail: string) => {
    if (!newPw || newPw.length < 6) { toast.error("Contraseña de al menos 6 caracteres"); return; }
    try {
      const res = await supabase.functions.invoke("manage-doctor-auth", { body: { action: "update-password-by-email", email: doctorEmail, password: newPw } });
      if (res.error || res.data?.error) throw new Error(res.data?.error || "Error");
      toast.success("Contraseña del doctor actualizada");
      setChangingPw(null); setNewPw("");
    } catch (err: any) { toast.error(err.message); }
  };

  const startEdit = (d: Doctor) => {
    setEditing(d.id);
    setForm({ name: d.name, email: d.email, specialty: d.specialty, payModel: d.payModel, rate: d.rate, password: "", phone: d.phone, cov: d.cov });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-accent" /> Doctores
        </h2>
        <button onClick={() => setAdding(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {(adding || editing) && (
        <div className="bg-card rounded-xl p-5 gold-border mb-6 space-y-3">
          <h3 className="font-semibold">{adding ? "Nuevo Doctor" : "Editar Doctor"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Nombre completo" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} maxLength={100} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Email (será su login)" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} maxLength={100} disabled={!!editing} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Especialidad" value={form.specialty} onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))} maxLength={100} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Teléfono" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} maxLength={30} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="COV (Colegio de Odontólogos)" value={form.cov} onChange={(e) => setForm((p) => ({ ...p, cov: e.target.value }))} maxLength={30} />
            <select className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={form.payModel} onChange={(e) => setForm((p) => ({ ...p, payModel: e.target.value as 'fixed' | 'percent' }))}>
              <option value="percent">Porcentaje (%)</option>
              <option value="fixed">Monto Fijo (USD)</option>
            </select>
            <input type="number" step="0.01" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder={form.payModel === "percent" ? "Ej: 0.40" : "Ej: 50"} value={form.rate} onChange={(e) => setForm((p) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))} />
            {adding && (
              <input type="password" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Contraseña de acceso" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} minLength={6} />
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={adding ? handleAdd : () => handleUpdate(editing!)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Save className="w-4 h-4" /> Guardar</button>
            <button onClick={() => { setAdding(false); setEditing(null); }} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm flex items-center gap-1"><X className="w-4 h-4" /> Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {doctors.map((d) => (
          <div key={d.id} className="bg-card rounded-xl p-4 gold-border space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-sm text-muted-foreground">{d.specialty}{d.cov ? ` • COV: ${d.cov}` : ''}</p>
                <p className="text-sm text-muted-foreground">{d.email}{d.phone ? ` • Tel: ${d.phone}` : ''}</p>
                <p className="text-xs text-muted-foreground">Pago: {d.payModel === "percent" ? `${(d.rate * 100).toFixed(0)}%` : `$${d.rate.toFixed(2)} USD`}</p>
              </div>
              <div className="flex gap-1 flex-wrap">
                {d.phone && <a href={`tel:${d.phone}`} className="p-2 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="Llamar"><Phone className="w-4 h-4" /></a>}
                <a href={`mailto:${d.email}`} className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" title="Enviar correo"><Mail className="w-4 h-4" /></a>
                <button onClick={() => setChangingPw(changingPw === d.id ? null : d.id)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" title="Cambiar contraseña"><Key className="w-4 h-4" /></button>
                <button onClick={() => setExpandedProfile(expandedProfile === d.id ? null : d.id)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" title="Firma y Sello">{expandedProfile === d.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                <button onClick={() => startEdit(d)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" title="Editar"><Edit className="w-4 h-4" /></button>
                <button onClick={async () => { await deleteDoctor(d.id); toast.info("Doctor eliminado"); }} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {changingPw === d.id && (
              <div className="flex gap-2 items-center">
                <input type="password" placeholder="Nueva contraseña" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border flex-1" value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={6} />
                <button onClick={() => handleChangePw(d.email)} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold">Actualizar</button>
              </div>
            )}
            {expandedProfile === d.id && (
              <DoctorProfileEditor doctor={d} onUpdate={updateDoctor} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
