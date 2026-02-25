
import { useState } from "react";
import { useClinicData, Patient } from "@/hooks/useClinicData";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Trash2, Edit, Save, X, Camera, FileText, Upload } from "lucide-react";
import { toast } from "sonner";

export const AdminPatients = () => {
  const { patients, addPatient, updatePatient, deletePatient } = useClinicData();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", cedula: "", phone: "", email: "", notes: "" });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const handleAdd = async () => {
    if (!form.name) { toast.error("Nombre requerido"); return; }
    await addPatient({ ...form, photos: [], clinicalHistoryUrl: "" });
    setAdding(false);
    setForm({ name: "", cedula: "", phone: "", email: "", notes: "" });
    toast.success("Paciente agregado");
  };

  const handleUpdate = async (id: string) => {
    await updatePatient(id, form);
    setEditing(null);
    toast.success("Paciente actualizado");
  };

  const startEdit = (p: Patient) => {
    setEditing(p.id);
    setForm({ name: p.name, cedula: p.cedula, phone: p.phone, email: p.email, notes: p.notes });
  };

  const handlePhotoUpload = async (patientId: string, file: File) => {
    setUploadingPhoto(true);
    const path = `patients/${patientId}/photos/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("patient-files").upload(path, file);
    if (error) { toast.error("Error al subir foto"); setUploadingPhoto(false); return; }
    const { data: urlData } = supabase.storage.from("patient-files").getPublicUrl(path);
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      await updatePatient(patientId, { photos: [...patient.photos, urlData.publicUrl] });
      toast.success("Foto agregada");
    }
    setUploadingPhoto(false);
  };

  const handlePdfUpload = async (patientId: string, file: File) => {
    setUploadingPdf(true);
    const path = `patients/${patientId}/clinical/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("patient-files").upload(path, file);
    if (error) { toast.error("Error al subir PDF"); setUploadingPdf(false); return; }
    const { data: urlData } = supabase.storage.from("patient-files").getPublicUrl(path);
    await updatePatient(patientId, { clinicalHistoryUrl: urlData.publicUrl });
    toast.success("Historia clínica actualizada");
    setUploadingPdf(false);
  };

  const removePhoto = async (patientId: string, index: number) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      const updated = [...(patient.photos || [])];
      updated.splice(index, 1);
      await updatePatient(patientId, { photos: updated });
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
                  <p className="text-sm text-muted-foreground">{p.email || "—"}</p>
                  {p.notes && <p className="text-xs text-muted-foreground">📝 {p.notes}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setViewingPhotos(viewingPhotos === p.id ? null : p.id)} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20" title="Fotos"><Camera className="w-4 h-4" /></button>
                  <button onClick={() => startEdit(p)} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20"><Edit className="w-4 h-4" /></button>
                  <button onClick={async () => { await deletePatient(p.id); toast.info("Paciente eliminado"); }} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Clinical History PDF */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Historia Clínica</p>
                {p.clinicalHistoryUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewingPdf(viewingPdf === p.id ? null : p.id)} className="text-xs text-gold hover:underline">
                        {viewingPdf === p.id ? "Cerrar visor" : "Ver PDF"}
                      </button>
                      <a href={p.clinicalHistoryUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">Abrir en nueva pestaña</a>
                    </div>
                    {viewingPdf === p.id && (
                      <iframe src={p.clinicalHistoryUrl} className="w-full h-96 rounded-lg border border-border" title={`HC ${p.name}`} />
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin historia clínica</p>
                )}
                <label className={`inline-flex items-center gap-1 text-xs text-gold cursor-pointer hover:underline ${uploadingPdf ? 'opacity-50' : ''}`}>
                  <Upload className="w-3 h-3" /> {uploadingPdf ? "Subiendo..." : "Subir PDF"}
                  <input type="file" accept=".pdf" className="hidden" disabled={uploadingPdf} onChange={(e) => { if (e.target.files?.[0]) handlePdfUpload(p.id, e.target.files[0]); }} />
                </label>
              </div>

              {/* Photos */}
              {viewingPhotos === p.id && (
                <div className="bg-muted rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Fotos del Proceso ({(p.photos || []).length})</h4>
                    <label className={`bg-gold text-gold-foreground px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${uploadingPhoto ? 'opacity-50' : ''}`}>
                      <Plus className="w-3 h-3" /> {uploadingPhoto ? "Subiendo..." : "Agregar"}
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto} onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(p.id, e.target.files[0]); }} />
                    </label>
                  </div>
                  {(p.photos || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Sin fotos aún</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {(p.photos || []).map((photo, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden aspect-square">
                          <img src={photo} alt={`Proceso ${i + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(photo, "_blank")} />
                          <button onClick={() => removePhoto(p.id, i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
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
