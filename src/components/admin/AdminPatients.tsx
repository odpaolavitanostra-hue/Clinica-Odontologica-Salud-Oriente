import { useState, useRef } from "react";
import { useCosoStore, Patient } from "@/store/useCosoStore";
import { Users, Plus, Trash2, Edit, Save, X, Camera, FileText } from "lucide-react";
import { toast } from "sonner";

export const AdminPatients = () => {
  const { patients, addPatient, updatePatient, deletePatient } = useCosoStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", cedula: "", phone: "", email: "", notes: "" });
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!form.name) { toast.error("Nombre requerido"); return; }
    addPatient({ id: Math.random().toString(36).substring(2, 10), ...form, photos: [], clinicalHistoryUrl: "" });
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

  const handleAddPhoto = (patientId: string, files: FileList | null) => {
    if (!files) return;
    const newPhotos: string[] = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPhotos.push(e.target?.result as string);
        if (newPhotos.length === files.length) {
          const patient = patients.find((p) => p.id === patientId);
          if (patient) {
            updatePatient(patientId, { photos: [...(patient.photos || []), ...newPhotos] });
            toast.success(`${newPhotos.length} foto(s) agregada(s)`);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddPdf = (patientId: string, files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      updatePatient(patientId, { clinicalHistoryUrl: e.target?.result as string });
      toast.success("Historia clínica cargada");
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (patientId: string, index: number) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      const updated = [...(patient.photos || [])];
      updated.splice(index, 1);
      updatePatient(patientId, { photos: updated });
      toast.info("Foto eliminada");
    }
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
            <div key={p.id} className="bg-card rounded-xl p-4 gold-border space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.cedula || "Sin cédula"} • {p.phone || "Sin teléfono"}</p>
                  {p.notes && <p className="text-xs text-muted-foreground">📝 {p.notes}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setViewingPhotos(viewingPhotos === p.id ? null : p.id)}
                    className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20"
                    title="Fotos del proceso"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => pdfInputRef.current?.click()}
                    className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20"
                    title="Historia clínica PDF"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => handleAddPdf(p.id, e.target.files)} />
                  <button onClick={() => startEdit(p)} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => { deletePatient(p.id); toast.info("Paciente eliminado"); }} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Clinical history link */}
              {p.clinicalHistoryUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-gold" />
                  <a href={p.clinicalHistoryUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">Ver Historia Clínica (PDF)</a>
                </div>
              )}

              {/* Photos section */}
              {viewingPhotos === p.id && (
                <div className="bg-muted rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Fotos del Proceso ({(p.photos || []).length})</h4>
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="bg-gold text-gold-foreground px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Agregar
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleAddPhoto(p.id, e.target.files)} />
                  </div>
                  {(p.photos || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Sin fotos aún</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {(p.photos || []).map((photo, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden aspect-square">
                          <img src={photo} alt={`Proceso ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removePhoto(p.id, i)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};