import { useState } from "react";
import { useClinicData, Patient } from "@/hooks/useClinicData";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Trash2, Edit, Save, X, Camera, FileText, Upload, Clock, Mail, MessageCircle, Check, UserCog, ClipboardList, Search } from "lucide-react";
import { toast } from "sonner";
import ClinicalHistoryForm from "@/components/clinical/ClinicalHistoryForm";
import OdontogramChart from "@/components/odontogram/OdontogramChart";
import { useOdontogram, createEmptyOdontogram, type OdontogramData } from "@/hooks/useOdontogram";
import { useClinicalHistory } from "@/hooks/useClinicalHistory";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const AdminPatients = () => {
  const { patients, appointments, addPatient, updatePatient, deletePatient, updateAppointment, doctors } = useClinicData();
  const waitingAppointments = appointments.filter((a) => a.status === "pendiente_confirmacion");
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", cedula: "", phone: "", email: "", notes: "", age: "" });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [clinicalHistoryPatient, setClinicalHistoryPatient] = useState<Patient | null>(null);
  const [odontogramPatientId, setOdontogramPatientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleAdd = async () => {
    if (!form.name) { toast.error("Nombre requerido"); return; }
    await addPatient({ ...form, photos: [], clinicalHistoryUrl: "" });
    setAdding(false); setForm({ name: "", cedula: "", phone: "", email: "", notes: "", age: "" });
    toast.success("Paciente agregado");
  };

  const handleUpdate = async (id: string) => { await updatePatient(id, form); setEditing(null); toast.success("Paciente actualizado"); };

  const startEdit = (p: Patient) => {
    setEditing(p.id);
    setForm({ name: p.name, cedula: p.cedula, phone: p.phone, email: p.email, notes: p.notes, age: "" });
  };

  const handlePhotoUpload = async (patientId: string, file: File) => {
    setUploadingPhoto(true);
    const path = `patients/${patientId}/photos/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("patient-files").upload(path, file);
    if (error) { toast.error("Error al subir foto"); setUploadingPhoto(false); return; }
    const { data: urlData } = supabase.storage.from("patient-files").getPublicUrl(path);
    const patient = patients.find(p => p.id === patientId);
    if (patient) { await updatePatient(patientId, { photos: [...patient.photos, urlData.publicUrl] }); toast.success("Foto agregada"); }
    setUploadingPhoto(false);
  };

  const handlePdfUpload = async (patientId: string, file: File) => {
    setUploadingPdf(true);
    const path = `patients/${patientId}/clinical/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("patient-files").upload(path, file);
    if (error) { toast.error("Error al subir PDF"); setUploadingPdf(false); return; }
    const { data: urlData } = supabase.storage.from("patient-files").getPublicUrl(path);
    await updatePatient(patientId, { clinicalHistoryUrl: urlData.publicUrl });
    toast.success("Historia clínica actualizada"); setUploadingPdf(false);
  };

  const removePhoto = async (patientId: string, index: number) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) { const updated = [...(patient.photos || [])]; updated.splice(index, 1); await updatePatient(patientId, { photos: updated }); toast.info("Foto eliminada"); }
  };

  const filteredPatients = searchQuery.length >= 2
    ? patients.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.cedula.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone.includes(searchQuery) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.notes.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : patients;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-accent" /> Pacientes
        </h2>
        <button onClick={() => setAdding(true)} className="btn-gold px-4 py-2 text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar paciente por nombre, cédula, teléfono..."
          className="w-full bg-card rounded-lg pl-10 pr-4 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {(adding || editing) && (
        <div className="bg-card rounded-xl p-5 gold-border mb-6 space-y-3">
          <h3 className="font-semibold">{adding ? "Nuevo Paciente" : "Editar Paciente"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} maxLength={100} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Cédula" value={form.cedula} onChange={(e) => setForm((p) => ({ ...p, cedula: e.target.value }))} maxLength={20} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Edad" value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value.replace(/\D/g, '') }))} maxLength={3} type="text" inputMode="numeric" />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Teléfono" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} maxLength={20} />
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} maxLength={100} />
          </div>
          <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border resize-none" placeholder="Notas" rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} maxLength={500} />
          <div className="flex gap-2">
            <button onClick={adding ? handleAdd : () => handleUpdate(editing!)} className="btn-gold px-4 py-2 text-sm flex items-center gap-1"><Save className="w-4 h-4" /> Guardar</button>
            <button onClick={() => { setAdding(false); setEditing(null); }} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm flex items-center gap-1"><X className="w-4 h-4" /> Cancelar</button>
          </div>
        </div>
      )}

      {waitingAppointments.length > 0 && (
        <div className="bg-card rounded-xl p-5 gold-border mb-6 space-y-3">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" /> Solicitudes Especiales ({waitingAppointments.length})
          </h3>
          <div className="space-y-2">
            {waitingAppointments.map((app) => {
              const phoneClean = (app.patientPhone || "").replace(/[^0-9]/g, "");
              const waPhone = phoneClean.startsWith("58") ? phoneClean : `58${phoneClean}`;
              const doctor = doctors.find(d => d.id === app.doctorId);
              return (
                <div key={app.id} className="bg-orange-500/10 rounded-lg px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold">{app.patientName}</p>
                      <p className="text-xs text-muted-foreground">{app.patientPhone} • {app.patientCedula || "—"} • {app.patientEmail || "—"}</p>
                      <p className="text-xs text-muted-foreground">{app.treatment} • {app.date} {app.time}</p>
                      {doctor && <p className="text-xs text-muted-foreground">Dr. {doctor.name}</p>}
                      {app.notes && <p className="text-xs text-orange-500 mt-1">📝 {app.notes}</p>}
                    </div>
                    <div className="flex gap-1 items-center flex-wrap">
                      {app.patientPhone && (<a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20" title="WhatsApp"><MessageCircle className="w-4 h-4" /></a>)}
                      {app.patientEmail && (<a href={`mailto:${app.patientEmail}`} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" title="Correo"><Mail className="w-4 h-4" /></a>)}
                      <button onClick={() => { setEditingDoctorId(editingDoctorId === app.id ? null : app.id); setSelectedDoctorId(app.doctorId || doctors[0]?.id || ""); }} className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20" title="Asignar doctor"><UserCog className="w-4 h-4" /></button>
                      <button onClick={async () => { await updateAppointment(app.id, { status: "pendiente" }); toast.success("✅ Cita aprobada"); }} className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="Aprobar"><Check className="w-4 h-4" /></button>
                      <button onClick={async () => { await updateAppointment(app.id, { status: "cancelada" }); toast.info("Cita rechazada"); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" title="Rechazar"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {editingDoctorId === app.id && (
                    <div className="mt-2 p-3 bg-muted rounded-lg space-y-2">
                      <h4 className="font-semibold text-xs">Asignar / Cambiar doctor:</h4>
                      <select className="w-full bg-card rounded-lg px-3 py-2 border border-border text-sm" value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)}>
                        {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={async () => { await updateAppointment(app.id, { doctorId: selectedDoctorId }); setEditingDoctorId(null); toast.success("Doctor asignado"); }} className="btn-gold px-3 py-1.5 text-xs flex items-center gap-1"><Save className="w-3 h-3" /> Guardar</button>
                        <button onClick={() => setEditingDoctorId(null)} className="bg-muted-foreground/10 text-foreground px-3 py-1.5 rounded-lg text-xs">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredPatients.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">{searchQuery ? "No se encontraron pacientes" : "No hay pacientes registrados"}</p>
        ) : (
          filteredPatients.map((p) => (
            <PatientCard
              key={p.id}
              patient={p}
              appointments={appointments}
              doctors={doctors}
              onEdit={startEdit}
              onDelete={async (id) => { await deletePatient(id); toast.info("Paciente eliminado"); }}
              onPhotoUpload={handlePhotoUpload}
              onPdfUpload={handlePdfUpload}
              onRemovePhoto={removePhoto}
              onClinicalHistory={setClinicalHistoryPatient}
              onViewOdontogram={(id) => setOdontogramPatientId(odontogramPatientId === id ? null : id)}
              showOdontogram={odontogramPatientId === p.id}
              viewingPhotos={viewingPhotos === p.id}
              onTogglePhotos={() => setViewingPhotos(viewingPhotos === p.id ? null : p.id)}
              viewingPdf={viewingPdf === p.id}
              onTogglePdf={() => setViewingPdf(viewingPdf === p.id ? null : p.id)}
              uploadingPhoto={uploadingPhoto}
              uploadingPdf={uploadingPdf}
              updatePatient={updatePatient}
            />
          ))
        )}
      </div>
      {clinicalHistoryPatient && (
        <ClinicalHistoryForm patient={clinicalHistoryPatient} open={!!clinicalHistoryPatient} onOpenChange={(open) => { if (!open) setClinicalHistoryPatient(null); }} />
      )}
    </div>
  );
};

/* Patient card with age + odontogram */
const PatientCard = ({ patient: p, appointments, doctors, onEdit, onDelete, onPhotoUpload, onPdfUpload, onRemovePhoto, onClinicalHistory, onViewOdontogram, showOdontogram, viewingPhotos, onTogglePhotos, viewingPdf, onTogglePdf, uploadingPhoto, uploadingPdf, updatePatient }: any) => {
  const { history } = useClinicalHistory(p.id);
  
  const patientApps = appointments.filter((a: any) => a.patientName === p.name && a.odontogramData);
  const sortedSnapshots = patientApps.sort((a: any, b: any) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  const [selectedSnapshot, setSelectedSnapshot] = useState(0);
  
  const age = history?.age;

  return (
    <div className="bg-card rounded-xl p-4 gold-border space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{p.name}</p>
            {age && age > 0 && (
              <span className="text-xs bg-accent/15 text-accent px-2 py-0.5 rounded-full font-medium">{age} años</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{p.cedula || "Sin cédula"} • {p.phone || "Sin teléfono"}</p>
          <p className="text-sm text-muted-foreground">{p.email || "—"}</p>
          {p.notes && <p className="text-xs text-muted-foreground">📝 {p.notes}</p>}
        </div>
        <div className="flex gap-1.5 items-center flex-wrap justify-center">
          {p.phone && (() => {
            const phoneClean = p.phone.replace(/[^0-9]/g, "");
            const waPhone = phoneClean.startsWith("58") ? phoneClean : `58${phoneClean}`;
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20"><MessageCircle className="w-4 h-4" /></a>
                </TooltipTrigger>
                <TooltipContent>WhatsApp</TooltipContent>
              </Tooltip>
            );
          })()}
          {p.email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={`mailto:${p.email}`} className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"><Mail className="w-4 h-4" /></a>
              </TooltipTrigger>
              <TooltipContent>Enviar correo</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => onClinicalHistory(p)} className="p-2 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20"><ClipboardList className="w-4 h-4" /></button>
            </TooltipTrigger>
            <TooltipContent>Historia clínica</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => onViewOdontogram(p.id)} className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20">🦷</button>
            </TooltipTrigger>
            <TooltipContent>Odontograma</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => onTogglePhotos()} className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20"><Camera className="w-4 h-4" /></button>
            </TooltipTrigger>
            <TooltipContent>Fotos del proceso</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => onEdit(p)} className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20"><Edit className="w-4 h-4" /></button>
            </TooltipTrigger>
            <TooltipContent>Editar paciente</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => onDelete(p.id)} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-4 h-4" /></button>
            </TooltipTrigger>
            <TooltipContent>Eliminar paciente</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Odontogram Archive */}
      {showOdontogram && (
        <div className="bg-muted rounded-lg p-3 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">🦷 Archivo de Odontogramas ({sortedSnapshots.length})</h4>
          {sortedSnapshots.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Sin odontogramas registrados. Se crean desde las citas del doctor.</p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {sortedSnapshots.map((snap: any, i: number) => (
                  <button key={snap.id} onClick={() => setSelectedSnapshot(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                      selectedSnapshot === i ? "bg-gold text-gold-foreground" : "bg-card border border-border hover:bg-muted"
                    }`}>
                    {snap.date} {snap.time}
                  </button>
                ))}
              </div>
              <OdontogramChart
                data={sortedSnapshots[selectedSnapshot]?.odontogramData as any}
                onSurfaceChange={() => {}}
                onOverallChange={() => {}}
                onResetTooth={() => {}}
                readOnly
                notes={(sortedSnapshots[selectedSnapshot]?.odontogramData as any)?._notes}
              />
            </>
          )}
        </div>
      )}

      {viewingPhotos && (
        <div className="bg-muted rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Fotos del Proceso ({(p.photos || []).length})</h4>
            <label className={`btn-gold px-3 py-1 text-xs flex items-center gap-1 cursor-pointer ${uploadingPhoto ? 'opacity-50' : ''}`}>
              <Plus className="w-3 h-3" /> {uploadingPhoto ? "Subiendo..." : "Agregar"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto} onChange={(e) => { if (e.target.files?.[0]) onPhotoUpload(p.id, e.target.files[0]); }} />
            </label>
          </div>
          {(p.photos || []).length === 0 ? (<p className="text-xs text-muted-foreground text-center py-4">Sin fotos aún</p>) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(p.photos || []).map((photo: string, i: number) => (
                <div key={i} className="relative group rounded-lg overflow-hidden aspect-square">
                  <img src={photo} alt={`Proceso ${i + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(photo, "_blank")} />
                  <button onClick={() => onRemovePhoto(p.id, i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
