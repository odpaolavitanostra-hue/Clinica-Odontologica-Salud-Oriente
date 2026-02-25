
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, CalendarDays, DollarSign, Users, Check, Package, Upload, FileText, Camera, Save, Edit2, X } from "lucide-react";
import { useClinicData } from "@/hooks/useClinicData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DoctorPanel = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { appointments, doctors, finances, tasaBCV, patients, inventory, completeAppointment, updatePatient } = useClinicData();
  const [activeTab, setActiveTab] = useState<"agenda" | "pacientes" | "inventario">("agenda");
  const [completing, setCompleting] = useState<string | null>(null);
  const [materials, setMaterials] = useState<{ itemId: string; qty: number }[]>([]);
  const [editingPatient, setEditingPatient] = useState<string | null>(null);
  const [patientForm, setPatientForm] = useState({ name: "", cedula: "", phone: "", email: "", notes: "" });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  // Find the doctor matched to the logged-in user's email
  const doctor = doctors.find((d) => d.email === user?.email);
  const doctorId = doctor?.id || "";

  const myAppointments = appointments.filter((a) => a.doctorId === doctorId);
  const myPatientNames = [...new Set(myAppointments.map((a) => a.patientName))];
  const myPatients = patients.filter((p) => myPatientNames.includes(p.name));
  const myFinances = finances.filter((f) => {
    const app = appointments.find((a) => a.id === f.appointmentId);
    return app?.doctorId === doctorId;
  });

  const totalEarnedUSD = myFinances.reduce((sum, f) => sum + f.doctorPayUSD, 0);
  const pendingCount = myAppointments.filter((a) => a.status === "pendiente").length;
  const completedCount = myAppointments.filter((a) => a.status === "completada").length;

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const handleComplete = async (id: string) => {
    await completeAppointment(id, materials);
    inventory.forEach((item) => {
      if (item.stock <= item.minStock) toast.warning(`⚠️ Stock bajo: ${item.name} (${item.stock})`);
    });
    toast.success("Cita completada");
    setCompleting(null);
    setMaterials([]);
  };

  const startEditPatient = (p: typeof patients[0]) => {
    setEditingPatient(p.id);
    setPatientForm({ name: p.name, cedula: p.cedula, phone: p.phone, email: p.email, notes: p.notes });
  };

  const savePatient = async (id: string) => {
    await updatePatient(id, patientForm);
    toast.success("Paciente actualizado");
    setEditingPatient(null);
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

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>;
  if (!user) return null;
  if (!doctor) return (
    <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
      <p className="text-muted-foreground">No se encontró un perfil de doctor asociado a tu cuenta ({user.email}).</p>
      <button onClick={handleLogout} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold">Cerrar sesión</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="noir-gradient py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-gold font-semibold">{doctor.name}</h2>
            <p className="text-noir-foreground/50 text-sm">{doctor.specialty}</p>
          </div>
          <button onClick={handleLogout} className="text-noir-foreground/60 hover:text-gold transition-colors flex items-center gap-1 text-sm">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<CalendarDays className="w-5 h-5 text-gold" />} label="Pendientes" value={pendingCount.toString()} />
          <StatCard icon={<CalendarDays className="w-5 h-5 text-clinic-green" />} label="Completadas" value={completedCount.toString()} />
          <StatCard icon={<DollarSign className="w-5 h-5 text-gold" />} label="Ganado USD" value={`$${totalEarnedUSD.toFixed(2)}`} />
          <StatCard icon={<DollarSign className="w-5 h-5 text-gold" />} label="Ganado VES" value={`Bs. ${(totalEarnedUSD * tasaBCV).toFixed(2)}`} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "agenda" as const, label: "Mi Agenda", icon: <CalendarDays className="w-4 h-4" /> },
            { key: "pacientes" as const, label: "Mis Pacientes", icon: <Users className="w-4 h-4" /> },
            { key: "inventario" as const, label: "Inventario", icon: <Package className="w-4 h-4" /> },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-gold text-gold-foreground" : "bg-card gold-border hover:bg-muted"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* AGENDA */}
        {activeTab === "agenda" && (
          <div className="space-y-3">
            {myAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay citas registradas</p>
            ) : (
              myAppointments.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)).map((app) => (
                <div key={app.id} className="bg-card rounded-xl p-4 gold-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{app.patientName}</p>
                      <p className="text-sm text-muted-foreground">{app.treatment}</p>
                      <p className="text-sm text-muted-foreground">{app.date} • {app.time}</p>
                      {app.notes && <p className="text-xs text-muted-foreground mt-1">📝 {app.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        app.status === "pendiente" ? "bg-gold/20 text-gold"
                          : app.status === "completada" ? "bg-clinic-green/20 text-clinic-green"
                          : "bg-destructive/20 text-destructive"
                      }`}>{app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
                      {app.status === "pendiente" && (
                        <button onClick={() => { setCompleting(app.id); setMaterials([]); }} className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="Completar">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {completing === app.id && (
                    <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                      <h4 className="font-semibold text-sm">Materiales utilizados:</h4>
                      {inventory.map((item) => {
                        const mat = materials.find((m) => m.itemId === item.id);
                        return (
                          <div key={item.id} className="flex items-center gap-3 text-sm">
                            <span className="flex-1">{item.name} (Stock: {item.stock})</span>
                            <input type="number" min="0" step="0.01" className="w-20 bg-card rounded px-2 py-1 border border-border text-center" value={mat?.qty || ""} placeholder="0" onChange={(e) => {
                              const qty = parseFloat(e.target.value) || 0;
                              setMaterials((prev) => { const existing = prev.filter((m) => m.itemId !== item.id); return qty > 0 ? [...existing, { itemId: item.id, qty }] : existing; });
                            }} />
                          </div>
                        );
                      })}
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => handleComplete(app.id)} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold">Confirmar</button>
                        <button onClick={() => setCompleting(null)} className="bg-muted-foreground/10 text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* PACIENTES */}
        {activeTab === "pacientes" && (
          <div className="space-y-4">
            {myPatients.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No tienes pacientes asignados</p>
            ) : (
              myPatients.map((p) => (
                <div key={p.id} className="bg-card rounded-xl p-5 gold-border space-y-3">
                  {editingPatient === p.id ? (
                    <div className="space-y-2">
                      <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={patientForm.name} onChange={(e) => setPatientForm(f => ({...f, name: e.target.value}))} placeholder="Nombre" />
                      <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={patientForm.cedula} onChange={(e) => setPatientForm(f => ({...f, cedula: e.target.value}))} placeholder="Cédula" />
                      <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={patientForm.phone} onChange={(e) => setPatientForm(f => ({...f, phone: e.target.value}))} placeholder="Teléfono" />
                      <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={patientForm.email} onChange={(e) => setPatientForm(f => ({...f, email: e.target.value}))} placeholder="Email" />
                      <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border resize-none" rows={2} value={patientForm.notes} onChange={(e) => setPatientForm(f => ({...f, notes: e.target.value}))} placeholder="Notas" />
                      <div className="flex gap-2">
                        <button onClick={() => savePatient(p.id)} className="bg-gold text-gold-foreground px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"><Save className="w-3 h-3" /> Guardar</button>
                        <button onClick={() => setEditingPatient(null)} className="bg-muted-foreground/10 text-foreground px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"><X className="w-3 h-3" /> Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-sm text-muted-foreground">Cédula: {p.cedula || "—"} • Tel: {p.phone || "—"}</p>
                          <p className="text-sm text-muted-foreground">{p.email || "—"}</p>
                          {p.notes && <p className="text-xs text-muted-foreground mt-1">📝 {p.notes}</p>}
                        </div>
                        <button onClick={() => startEditPatient(p)} className="p-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/20" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Photos */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Camera className="w-3 h-3" /> Fotos ({p.photos.length})</p>
                        {p.photos.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {p.photos.map((url, i) => (
                              <img key={i} src={url} alt={`Foto ${i+1}`} className="w-16 h-16 object-cover rounded-lg border border-border cursor-pointer" onClick={() => window.open(url, "_blank")} />
                            ))}
                          </div>
                        )}
                        <label className={`inline-flex items-center gap-1 mt-1 text-xs text-gold cursor-pointer hover:underline ${uploadingPhoto ? 'opacity-50' : ''}`}>
                          <Upload className="w-3 h-3" /> {uploadingPhoto ? "Subiendo..." : "Agregar foto"}
                          <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto} onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(p.id, e.target.files[0]); }} />
                        </label>
                      </div>

                      {/* Clinical History */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Historia Clínica</p>
                        {p.clinicalHistoryUrl ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setViewingPdf(viewingPdf === p.id ? null : p.id)} className="text-xs text-gold hover:underline">
                              {viewingPdf === p.id ? "Cerrar visor" : "Ver PDF"}
                            </button>
                            <a href={p.clinicalHistoryUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">Abrir en nueva pestaña</a>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sin historia clínica</p>
                        )}
                        {viewingPdf === p.id && p.clinicalHistoryUrl && (
                          <iframe src={p.clinicalHistoryUrl} className="w-full h-96 mt-2 rounded-lg border border-border" title="Historia Clínica" />
                        )}
                        <label className={`inline-flex items-center gap-1 mt-1 text-xs text-gold cursor-pointer hover:underline ${uploadingPdf ? 'opacity-50' : ''}`}>
                          <Upload className="w-3 h-3" /> {uploadingPdf ? "Subiendo..." : "Subir PDF"}
                          <input type="file" accept=".pdf" className="hidden" disabled={uploadingPdf} onChange={(e) => { if (e.target.files?.[0]) handlePdfUpload(p.id, e.target.files[0]); }} />
                        </label>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* INVENTARIO */}
        {activeTab === "inventario" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Consulta el inventario de materiales.</p>
            {inventory.map((item) => (
              <div key={item.id} className="bg-card rounded-xl p-4 gold-border flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Precio: ${item.priceUSD.toFixed(2)} • Mín: {item.minStock}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${item.stock <= item.minStock ? "text-gold" : ""}`}>{item.stock}</span>
                  <span className="text-xs text-muted-foreground">en stock</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-card rounded-xl p-4 gold-border text-center">
    <div className="flex justify-center mb-2">{icon}</div>
    <p className="text-lg font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default DoctorPanel;
