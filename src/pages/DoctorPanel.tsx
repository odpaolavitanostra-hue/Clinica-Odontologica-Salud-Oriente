import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, CalendarDays, DollarSign, Users, Check, Package, Camera, FileText, Trash2, Save } from "lucide-react";
import { useCosoStore } from "@/store/useCosoStore";
import { toast } from "sonner";

const DoctorPanel = () => {
  const navigate = useNavigate();
  const { appointments, doctors, finances, tasaBCV, patients, updatePatient, completeAppointment, inventory, deductInventory, updateInventoryItem } = useCosoStore();
  const [doctorId, setDoctorId] = useState("");
  const [activeTab, setActiveTab] = useState<"agenda" | "pacientes" | "inventario">("agenda");
  const [completing, setCompleting] = useState<string | null>(null);
  const [materials, setMaterials] = useState<{ itemId: string; qty: number }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  useEffect(() => {
    const auth = sessionStorage.getItem("coso-auth");
    if (!auth?.startsWith("doctor:")) { navigate("/login"); return; }
    setDoctorId(auth.split(":")[1]);
  }, [navigate]);

  const doctor = doctors.find((d) => d.id === doctorId);
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

  const handleLogout = () => { sessionStorage.removeItem("coso-auth"); navigate("/"); };

  const handleComplete = (id: string) => {
    completeAppointment(id, materials);
    const store = useCosoStore.getState();
    store.inventory.forEach((item) => {
      if (item.stock <= item.minStock) toast.warning(`⚠️ Stock bajo: ${item.name} (${item.stock})`);
    });
    toast.success("Cita completada");
    setCompleting(null);
    setMaterials([]);
  };

  const handlePhotoUpload = (patientId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Máximo 2MB por imagen"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const patient = patients.find((p) => p.id === patientId);
      if (patient) {
        updatePatient(patientId, { photos: [...patient.photos, reader.result as string] });
        toast.success("Foto añadida");
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePdfUpload = (patientId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB por PDF"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      updatePatient(patientId, { clinicalHistoryUrl: reader.result as string });
      toast.success("Historia clínica actualizada");
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (patientId: string, index: number) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      const newPhotos = patient.photos.filter((_, i) => i !== index);
      updatePatient(patientId, { photos: newPhotos });
      toast.success("Foto eliminada");
    }
  };

  if (!doctor) return null;

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="noir-gradient py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-gold font-semibold">{doctor.name}</h1>
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

                  {/* Complete with materials */}
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
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-sm text-muted-foreground">Cédula: {p.cedula || "—"} • Tel: {p.phone || "—"}</p>
                      <p className="text-sm text-muted-foreground">{p.email || "—"}</p>
                    </div>
                    <button onClick={() => setSelectedPatient(selectedPatient === p.id ? null : p.id)} className="text-xs bg-gold/10 text-gold px-3 py-1.5 rounded-lg font-semibold hover:bg-gold/20">
                      {selectedPatient === p.id ? "Cerrar" : "Gestionar"}
                    </button>
                  </div>

                  {selectedPatient === p.id && (
                    <div className="space-y-4 pt-2">
                      {/* Photos */}
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-1 mb-2"><Camera className="w-4 h-4 text-gold" /> Fotos del Proceso</h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {p.photos.map((photo, i) => (
                            <div key={i} className="relative group">
                              <img src={photo} alt={`Foto ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-border" />
                              <button onClick={() => removePhoto(p.id, i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <label className="inline-flex items-center gap-1 bg-muted px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-muted/80 border border-border">
                          <Camera className="w-4 h-4" /> Subir Foto
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(p.id, e)} />
                        </label>
                      </div>

                      {/* Clinical History PDF */}
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-1 mb-2"><FileText className="w-4 h-4 text-gold" /> Historia Clínica (PDF)</h4>
                        {p.clinicalHistoryUrl && (
                          <div className="mb-2">
                            <a href={p.clinicalHistoryUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-gold underline">Ver historia clínica actual</a>
                          </div>
                        )}
                        <label className="inline-flex items-center gap-1 bg-muted px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-muted/80 border border-border">
                          <FileText className="w-4 h-4" /> {p.clinicalHistoryUrl ? "Reemplazar PDF" : "Subir PDF"}
                          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handlePdfUpload(p.id, e)} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* INVENTARIO */}
        {activeTab === "inventario" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Consulta y actualiza el inventario de materiales.</p>
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
