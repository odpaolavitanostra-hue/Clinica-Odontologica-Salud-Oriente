
import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, CalendarDays, DollarSign, Users, Check, Package, Upload, FileText, Camera, Save, Edit2, X, Bell, Stethoscope, ChevronDown, ChevronUp, MessageCircle, User, ClipboardList, Search, Download, TrendingUp } from "lucide-react";
import { useClinicData } from "@/hooks/useClinicData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { printRecipe, sendRecipeWhatsApp } from "@/components/admin/RecipeGenerator";
import OdontogramChart from "@/components/odontogram/OdontogramChart";
import { useOdontogram, createEmptyOdontogram, type OdontogramData } from "@/hooks/useOdontogram";
import DoctorProfileEditor from "@/components/admin/DoctorProfileEditor";
import BudgetGenerator from "@/components/admin/BudgetGenerator";
import ClinicalHistoryForm from "@/components/clinical/ClinicalHistoryForm";
import { type Patient } from "@/hooks/useClinicData";
import { formatVES } from "@/lib/formatVES";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DoctorPanel = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { appointments, doctors, finances, tasaBCV, patients, inventory, treatments, completeAppointment, updatePatient, updateAppointment, updateDoctor } = useClinicData();
  const [activeTab, setActiveTab] = useState<"agenda" | "pacientes" | "finanzas" | "inventario" | "recipe" | "presupuesto" | "perfil">("agenda");
  const [completing, setCompleting] = useState<string | null>(null);
  const [materials, setMaterials] = useState<{ itemId: string; qty: number }[]>([]);
  const [editingPatient, setEditingPatient] = useState<string | null>(null);
  const [patientForm, setPatientForm] = useState({ name: "", cedula: "", phone: "", email: "", notes: "" });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<{ id: string; message: string }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const prevAppCount = useRef(0);
  const initialized = useRef(false);

  // Recipe state
  const [recipeForm, setRecipeForm] = useState({ patientId: "", patientName: "", patientCedula: "", patientPhone: "", diagnosis: "", content: "" });
  const [showBudget, setShowBudget] = useState(false);
  const [clinicalHistoryPatient, setClinicalHistoryPatient] = useState<Patient | null>(null);

  // Odontogram state
  const [odontogramAppId, setOdontogramAppId] = useState<string | null>(null);
  const [odontogramNotes, setOdontogramNotes] = useState("");
  const odontogram = useOdontogram();

  // Patient search
  const [patientSearch, setPatientSearch] = useState("");

  // Finance filter
  const [financeFilter, setFinanceFilter] = useState<"dia" | "semana" | "mes">("mes");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const doctor = doctors.find((d) => d.email === user?.email);
  const doctorId = doctor?.id || "";

  const myAppointments = appointments.filter((a) => a.doctorId === doctorId);
  const myPatientNames = [...new Set(myAppointments.map((a) => a.patientName))];
  const myPatients = patients.filter((p) => myPatientNames.includes(p.name));
  const myFinances = finances.filter((f) => {
    const app = appointments.find((a) => a.id === f.appointmentId);
    return app?.doctorId === doctorId;
  });

  // Filtered patients by search
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return myPatients;
    const q = patientSearch.toLowerCase().trim();
    return myPatients.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.cedula.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q)
    );
  }, [myPatients, patientSearch]);

  // Filtered finances by time period
  const filteredFinances = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    return myFinances.filter((f) => {
      if (financeFilter === "dia") return f.date === todayStr;
      if (financeFilter === "semana") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return f.date >= weekAgo.toISOString().split("T")[0];
      }
      // mes
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      return f.date >= monthStart;
    });
  }, [myFinances, financeFilter]);

  const filteredTotalUSD = filteredFinances.reduce((s, f) => s + f.doctorPayUSD, 0);
  // filteredTotalTreatments removed — doctor privacy: no access to total treatment price

  // Detect new appointments
  useEffect(() => {
    const count = myAppointments.length;
    if (!initialized.current) { prevAppCount.current = count; initialized.current = true; return; }
    if (count > prevAppCount.current) {
      const diff = count - prevAppCount.current;
      setNotifications(prev => [{ id: `app-${Date.now()}`, message: `📅 ${diff} nueva(s) cita(s)` }, ...prev]);
    }
    prevAppCount.current = count;
  }, [myAppointments.length]);

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

  const handleRecipePatientSelect = (patientId: string) => {
    const p = patients.find(pt => pt.id === patientId);
    if (p) setRecipeForm(prev => ({ ...prev, patientId, patientName: p.name, patientCedula: p.cedula, patientPhone: p.phone }));
  };

  const handlePrintRecipe = () => {
    if (!doctor) return;
    printRecipe(doctor, recipeForm.patientName, recipeForm.patientCedula, recipeForm.diagnosis, recipeForm.content);
  };

  // Odontogram handlers
  const toggleOdontogram = (appId: string) => {
    if (odontogramAppId === appId) {
      setOdontogramAppId(null);
      return;
    }
    const app = myAppointments.find(a => a.id === appId);
    if (app?.odontogramData) {
      odontogram.loadState(app.odontogramData as OdontogramData);
      setOdontogramNotes((app.odontogramData as any)?._notes || "");
    } else {
      const prevApps = myAppointments
        .filter(a => a.patientName === app?.patientName && a.id !== appId && a.odontogramData)
        .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
      
      if (prevApps.length > 0) {
        const loadPrev = window.confirm("¿Desea cargar el estado del odontograma de la cita anterior?");
        if (loadPrev) {
          odontogram.loadState(prevApps[0].odontogramData as OdontogramData);
          setOdontogramNotes((prevApps[0].odontogramData as any)?._notes || "");
        } else {
          odontogram.loadState(createEmptyOdontogram());
          setOdontogramNotes("");
        }
      } else {
        odontogram.loadState(createEmptyOdontogram());
        setOdontogramNotes("");
      }
    }
    setOdontogramAppId(appId);
  };

  const saveOdontogram = async (appId: string) => {
    const stateToSave = { ...odontogram.data, _notes: odontogramNotes };
    await updateAppointment(appId, { odontogramData: stateToSave });
    toast.success("Odontograma guardado");
  };

  // Export PDF report
  const handleExportPDF = () => {
    if (!doctor) return;
    const doc = new jsPDF();
    const filterLabel = financeFilter === "dia" ? "Hoy" : financeFilter === "semana" ? "Últimos 7 días" : "Mes en curso";

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Salud Oriente", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Reporte de Rendimiento del Doctor", 14, 27);
    doc.setFontSize(12);
    doc.text(`Dr(a). ${doctor.name}`, 14, 35);
    doc.setFontSize(10);
    doc.text(`Especialidad: ${doctor.specialty}${doctor.cov ? ` • COV: ${doctor.cov}` : ""}`, 14, 41);
    doc.text(`Período: ${filterLabel}`, 14, 47);
    doc.text(`Tasa BCV: ${tasaBCV.toFixed(2)} Bs/$`, 14, 53);

    // Build table data
    const rows = filteredFinances.map((f) => {
      const app = appointments.find((a) => a.id === f.appointmentId);
      return [
        f.date,
        app?.patientName || "—",
        app?.treatment || "—",
        `$${f.doctorPayUSD.toFixed(2)}`,
        `Bs. ${formatVES(f.doctorPayUSD * f.tasaBCV)}`,
      ];
    });

    autoTable(doc, {
      startY: 58,
      head: [["Fecha", "Paciente", "Tratamiento", "Ganancia $", "Ganancia Bs"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [44, 47, 45], textColor: [248, 246, 240] },
      alternateRowStyles: { fillColor: [245, 243, 237] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Ganancia: $${filteredTotalUSD.toFixed(2)} | Bs. ${formatVES(filteredTotalUSD * tasaBCV)}`, 14, finalY + 10);

    doc.save(`reporte-${doctor.name.replace(/\s+/g, "_")}-${filterLabel}.pdf`);
    toast.success("Reporte descargado");
  };

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>;
  if (!user) return null;
  if (!doctor) return (
    <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4 px-4 text-center">
      <p className="text-muted-foreground">No se encontró un perfil de doctor asociado a tu cuenta ({user.email}).</p>
      <button onClick={handleLogout} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">Cerrar sesión</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="noir-gradient py-3 sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg text-pearl font-semibold truncate">{doctor.name}</h2>
            <p className="text-noir-foreground/50 text-xs truncate">{doctor.specialty}{doctor.cov ? ` • COV: ${doctor.cov}` : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative text-noir-foreground/60 hover:text-primary transition-colors p-1">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse font-bold">{notifications.length}</span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-xs font-semibold">Notificaciones</span>
                    {notifications.length > 0 && (
                      <button onClick={() => { setNotifications([]); setShowNotifications(false); }} className="text-xs text-muted-foreground hover:text-destructive">Limpiar</button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Sin notificaciones</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      {notifications.map((n) => (
                        <button key={n.id} onClick={() => { setNotifications(prev => prev.filter(x => x.id !== n.id)); setShowNotifications(false); setActiveTab("agenda"); }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border/50 last:border-0">
                          {n.message}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={handleLogout} className="text-noir-foreground/60 hover:text-primary transition-colors flex items-center gap-1 text-sm">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 max-w-4xl space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard icon={<CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />} label="Pendientes" value={pendingCount.toString()} />
          <StatCard icon={<CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-clinic-green" />} label="Completadas" value={completedCount.toString()} />
          <StatCard icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />} label="Ganado USD" value={`$${totalEarnedUSD.toFixed(2)}`} />
          <StatCard icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />} label="Ganado VES" value={`Bs. ${formatVES(totalEarnedUSD * tasaBCV)}`} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { key: "agenda" as const, label: "Agenda", icon: <CalendarDays className="w-4 h-4" /> },
            { key: "pacientes" as const, label: "Pacientes", icon: <Users className="w-4 h-4" /> },
            { key: "finanzas" as const, label: "Finanzas", icon: <TrendingUp className="w-4 h-4" /> },
            { key: "recipe" as const, label: "Recipe", icon: <Stethoscope className="w-4 h-4" /> },
            { key: "presupuesto" as const, label: "Presupuesto", icon: <FileText className="w-4 h-4" /> },
            { key: "inventario" as const, label: "Inventario", icon: <Package className="w-4 h-4" /> },
            { key: "perfil" as const, label: "Perfil", icon: <User className="w-4 h-4" /> },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.key ? "bg-gold text-gold-foreground" : "bg-card gold-border hover:bg-muted"}`}>
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
                <div key={app.id} className="bg-card rounded-xl p-3 sm:p-4 gold-border">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm sm:text-base truncate">{app.patientName}</p>
                        <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          app.status === "pendiente" ? "bg-amber/20 text-amber"
                            : app.status === "completada" ? "bg-clinic-green/20 text-clinic-green"
                            : "bg-destructive/20 text-destructive"
                        }`}>{app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{app.treatment}</p>
                      <p className="text-xs text-muted-foreground">{app.date} • {app.time}</p>
                      {app.notes && <p className="text-xs text-muted-foreground mt-0.5">📝 {app.notes}</p>}
                    </div>
                    {app.status === "pendiente" && (
                      <button onClick={() => { setCompleting(app.id); setMaterials([]); }} className="self-end sm:self-start p-2 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20 flex-shrink-0" title="Completar">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {completing === app.id && (
                    <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
                      <h4 className="font-semibold text-xs">Materiales utilizados:</h4>
                      {inventory.map((item) => {
                        const mat = materials.find((m) => m.itemId === item.id);
                        return (
                          <div key={item.id} className="flex items-center gap-2 text-xs">
                            <span className="flex-1 truncate">{item.name} ({item.stock})</span>
                            <input type="number" min="0" step="0.01" className="w-16 bg-card rounded px-2 py-1 border border-border text-center text-xs" value={mat?.qty || ""} placeholder="0" onChange={(e) => {
                              const qty = parseFloat(e.target.value) || 0;
                              setMaterials((prev) => { const existing = prev.filter((m) => m.itemId !== item.id); return qty > 0 ? [...existing, { itemId: item.id, qty }] : existing; });
                            }} />
                          </div>
                        );
                      })}
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleComplete(app.id)} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold">Confirmar</button>
                        <button onClick={() => setCompleting(null)} className="bg-muted-foreground/10 text-foreground px-3 py-1.5 rounded-lg text-xs">Cancelar</button>
                      </div>
                    </div>
                  )}

                  {/* Herramientas Clínicas */}
                  <div className="mt-3 border-t border-border pt-2">
                    <button
                      onClick={() => toggleOdontogram(app.id)}
                      className="flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent/80 transition-colors w-full justify-between"
                    >
                      <span className="flex items-center gap-1.5">🦷 Herramientas Clínicas — Odontograma</span>
                      {odontogramAppId === app.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {odontogramAppId === app.id && (
                      <div className="mt-3 animate-fade-in space-y-3">
                        <OdontogramChart
                          data={odontogram.data}
                          onSurfaceChange={(tooth, surface, status) => odontogram.setSurface(tooth, surface as any, status)}
                          onOverallChange={(tooth, status) => odontogram.setOverall(tooth, status)}
                          onResetTooth={(tooth) => odontogram.resetTooth(tooth)}
                          notes={odontogramNotes}
                          onNotesChange={setOdontogramNotes}
                        />
                        <button
                          onClick={() => saveOdontogram(app.id)}
                          className="w-full bg-primary text-primary-foreground py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                          <Save className="w-4 h-4" /> Guardar Odontograma
                        </button>
                      </div>
                    )}
                  </div>

                  {app.odontogramData && odontogramAppId !== app.id && (
                    <p className="text-[10px] text-muted-foreground mt-1">✅ Odontograma registrado</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* PACIENTES */}
        {activeTab === "pacientes" && (
          <div className="space-y-4">
            {/* Sticky Search Bar */}
            <div className="sticky top-[52px] z-40 pb-2 pt-1 -mx-3 px-3 sm:-mx-4 sm:px-4">
              <div className="relative" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#E8C056" }} />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Buscar paciente por nombre, cédula, teléfono..."
                  className="w-full pl-12 pr-10 py-3.5 font-body focus:outline-none focus:ring-2 transition-all"
                  style={{
                    fontSize: "20px",
                    backgroundColor: "#F5F5F5",
                    borderRadius: "24px",
                    border: "1px solid #E0E0E0",
                    color: "#2C2F2D",
                  }}
                />
                {patientSearch && (
                  <button onClick={() => setPatientSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: "#888" }}>
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              {patientSearch && (
                <p className="text-xs text-muted-foreground mt-1.5 pl-4">
                  {filteredPatients.length} resultado(s) de {myPatients.length}
                </p>
              )}
            </div>

            {filteredPatients.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {patientSearch ? "No se encontraron pacientes" : "No tienes pacientes asignados"}
              </p>
            ) : (
              filteredPatients.map((p) => (
                <div key={p.id} className="bg-card rounded-xl p-4 sm:p-5 gold-border space-y-3">
                  {editingPatient === p.id ? (
                    <div className="space-y-2">
                      <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={patientForm.name} onChange={(e) => setPatientForm(f => ({...f, name: e.target.value}))} placeholder="Nombre" />
                      <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={patientForm.cedula} onChange={(e) => setPatientForm(f => ({...f, cedula: e.target.value}))} placeholder="Cédula" />
                      <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={patientForm.phone} onChange={(e) => setPatientForm(f => ({...f, phone: e.target.value}))} placeholder="Teléfono" />
                      <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={patientForm.email} onChange={(e) => setPatientForm(f => ({...f, email: e.target.value}))} placeholder="Email" />
                      <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border resize-none" rows={2} value={patientForm.notes} onChange={(e) => setPatientForm(f => ({...f, notes: e.target.value}))} placeholder="Notas" />
                      <div className="flex gap-2">
                        <button onClick={() => savePatient(p.id)} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"><Save className="w-3 h-3" /> Guardar</button>
                        <button onClick={() => setEditingPatient(null)} className="bg-muted-foreground/10 text-foreground px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"><X className="w-3 h-3" /> Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{p.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Cédula: {p.cedula || "—"} • Tel: {p.phone || "—"}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{p.email || "—"}</p>
                          {p.notes && <p className="text-xs text-muted-foreground mt-1">📝 {p.notes}</p>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => setClinicalHistoryPatient(p)} className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="Historia Clínica">
                            <ClipboardList className="w-4 h-4" />
                          </button>
                          <button onClick={() => startEditPatient(p)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Photos */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Camera className="w-3 h-3" /> Fotos ({p.photos.length})</p>
                        {p.photos.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {p.photos.map((url, i) => (
                              <img key={i} src={url} alt={`Foto ${i+1}`} className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg border border-border cursor-pointer flex-shrink-0" onClick={() => window.open(url, "_blank")} />
                            ))}
                          </div>
                        )}
                        <label className={`inline-flex items-center gap-1 mt-1 text-xs text-primary cursor-pointer hover:underline ${uploadingPhoto ? 'opacity-50' : ''}`}>
                          <Upload className="w-3 h-3" /> {uploadingPhoto ? "Subiendo..." : "Agregar foto"}
                          <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto} onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(p.id, e.target.files[0]); }} />
                        </label>
                      </div>

                      {/* Clinical History */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Historia Clínica</p>
                        {p.clinicalHistoryUrl ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setViewingPdf(viewingPdf === p.id ? null : p.id)} className="text-xs text-primary hover:underline">
                              {viewingPdf === p.id ? "Cerrar visor" : "Ver PDF"}
                            </button>
                            <a href={p.clinicalHistoryUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">Abrir en nueva pestaña</a>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sin historia clínica</p>
                        )}
                        {viewingPdf === p.id && p.clinicalHistoryUrl && (
                          <iframe src={p.clinicalHistoryUrl} className="w-full h-64 sm:h-96 mt-2 rounded-lg border border-border" title="Historia Clínica" />
                        )}
                        <label className={`inline-flex items-center gap-1 mt-1 text-xs text-primary cursor-pointer hover:underline ${uploadingPdf ? 'opacity-50' : ''}`}>
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

        {/* MIS FINANZAS */}
        {activeTab === "finanzas" && (
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" /> Mis Finanzas
            </h3>

            {/* Time Filters */}
            <div className="flex flex-wrap gap-2">
              {([
                { key: "dia" as const, label: "Hoy" },
                { key: "semana" as const, label: "Últimos 7 días" },
                { key: "mes" as const, label: "Mes en curso" },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFinanceFilter(f.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    financeFilter === f.key
                      ? "bg-gold text-gold-foreground"
                      : "bg-card gold-border hover:bg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Summary Card — Doctor only sees earnings */}
            <div className="bg-card rounded-xl p-4 gold-border">
              <p className="text-xs text-muted-foreground mb-1">Mi Ganancia Neta</p>
              <p className="text-lg font-bold font-display text-gold">${filteredTotalUSD.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Bs. {formatVES(filteredTotalUSD * tasaBCV)}</p>
            </div>

            {/* Detailed List */}
            <div className="space-y-2">
              {filteredFinances.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">No hay registros para este período</p>
              ) : (
                filteredFinances
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((f) => {
                    const app = appointments.find((a) => a.id === f.appointmentId);
                    return (
                      <div key={f.id} className="bg-card rounded-xl p-3 sm:p-4 gold-border">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{app?.patientName || "—"}</p>
                            <p className="text-xs text-muted-foreground">{app?.treatment || "—"} • {f.date}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-gold">${f.doctorPayUSD.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Bs. {formatVES(f.doctorPayUSD * f.tasaBCV)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Export Button */}
            {filteredFinances.length > 0 && (
              <button
                onClick={handleExportPDF}
                className="w-full bg-gold text-gold-foreground py-3 rounded-xl font-display font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                style={{ fontSize: "18px" }}
              >
                <Download className="w-5 h-5" /> Descargar Reporte PDF
              </button>
            )}
          </div>
        )}

        {/* INVENTARIO */}
        {activeTab === "inventario" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Consulta el inventario de materiales.</p>
            {inventory.map((item) => (
              <div key={item.id} className="bg-card rounded-xl p-3 sm:p-4 gold-border flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">${item.priceUSD.toFixed(2)} • Mín: {item.minStock}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-sm font-bold ${item.stock <= item.minStock ? "text-amber" : ""}`}>{item.stock}</span>
                  <span className="text-xs text-muted-foreground">stock</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RECIPE */}
        {activeTab === "recipe" && (
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-accent" /> Emitir Recipe Médico
            </h3>
            <div className="bg-card rounded-xl p-4 sm:p-5 gold-border space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Paciente</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={recipeForm.patientId} onChange={(e) => handleRecipePatientSelect(e.target.value)}>
                  <option value="">Seleccionar paciente</option>
                  {myPatients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — C.I. {p.cedula}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Nombre paciente</label>
                  <input type="text" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border" value={recipeForm.patientName} onChange={(e) => setRecipeForm(f => ({ ...f, patientName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Cédula</label>
                  <input type="text" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border" value={recipeForm.patientCedula} onChange={(e) => setRecipeForm(f => ({ ...f, patientCedula: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Teléfono (para WhatsApp)</label>
                <input type="text" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border" value={recipeForm.patientPhone} onChange={(e) => setRecipeForm(f => ({ ...f, patientPhone: e.target.value }))} placeholder="04XX-XXXXXXX" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Diagnóstico</label>
                <input type="text" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border" value={recipeForm.diagnosis} onChange={(e) => setRecipeForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="Diagnóstico del paciente" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Indicaciones / Prescripción *</label>
                <textarea className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border resize-none" rows={5} value={recipeForm.content} onChange={(e) => setRecipeForm(f => ({ ...f, content: e.target.value }))} placeholder="Medicamentos, dosis, indicaciones..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button onClick={handlePrintRecipe} disabled={!recipeForm.content} className="bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
                  <FileText className="w-4 h-4" /> Imprimir/PDF
                </button>
                <button onClick={() => { if (recipeForm.patientPhone) sendRecipeWhatsApp(recipeForm.patientName, recipeForm.patientPhone); else toast.error("Ingrese teléfono"); }} disabled={!recipeForm.content}
                  className="bg-clinic-green text-clinic-green-foreground py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
                <button disabled className="bg-muted text-muted-foreground py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 opacity-50 text-sm cursor-not-allowed">
                  <DollarSign className="w-4 h-4" /> Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRESUPUESTO */}
        {activeTab === "presupuesto" && (
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" /> Presupuesto Odontológico
            </h3>
            <button onClick={() => setShowBudget(true)} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm">
              <FileText className="w-4 h-4" /> Crear Presupuesto
            </button>
            <BudgetGenerator open={showBudget} onOpenChange={setShowBudget} doctors={doctors} patients={myPatients} treatments={treatments} tasaBCV={tasaBCV} currentDoctor={doctor} />
          </div>
        )}

        {/* PERFIL */}
        {activeTab === "perfil" && (
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-accent" /> Mi Perfil
            </h3>
            <div className="bg-card rounded-xl p-4 gold-border space-y-2">
              <p className="font-semibold">{doctor.name}</p>
              <p className="text-sm text-muted-foreground">{doctor.specialty}{doctor.cov ? ` • COV: ${doctor.cov}` : ''}</p>
              <p className="text-sm text-muted-foreground">{doctor.email}{doctor.phone ? ` • Tel: ${doctor.phone}` : ''}</p>
            </div>
            <DoctorProfileEditor doctor={doctor} onUpdate={updateDoctor} />
          </div>
        )}
      </div>

      {clinicalHistoryPatient && (
        <ClinicalHistoryForm
          patient={clinicalHistoryPatient}
          open={!!clinicalHistoryPatient}
          onOpenChange={(open) => { if (!open) setClinicalHistoryPatient(null); }}
        />
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-card rounded-xl p-3 sm:p-4 gold-border text-center">
    <div className="flex justify-center mb-1">{icon}</div>
    <p className="text-base sm:text-lg font-bold truncate">{value}</p>
    <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
  </div>
);

export default DoctorPanel;
