
import { useState } from "react";
import { useClinicData, Tenant, TenantBlockedSlot } from "@/hooks/useClinicData";
import { Building2, Plus, Save, Trash2, Edit, Lock, Calendar, X, Check, Mail, MessageCircle, Clock, Sun, Moon, User, CreditCard, Phone, Briefcase, DollarSign, Search, Stethoscope, Package } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import PaymentModal from "./PaymentModal";
import { getCaracasToday, getCaracasNow, getAllAvailableSlots, isSlotBlockedByTenant } from "@/lib/scheduleUtils";
import { formatVES } from "@/lib/formatVES";

export const AdminTenants = () => {
  const { tenants, treatments, appointments, addTenant, updateTenant, deleteTenant, addTenantBlockedSlot, removeTenantBlockedSlot, rentalRequests, approveRentalRequest, rejectRentalRequest, deleteRentalRequest, completeRentalSlot, updateBlockedSlot, tasaBCV, addTransaction } = useClinicData();
  const [showForm, setShowForm] = useState(false);
  const [payingRentalId, setPayingRentalId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [blockingTenant, setBlockingTenant] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [requestEditForm, setRequestEditForm] = useState<{
    rentalMode: string; rentalPrice: number; date: string; startTime: string; endTime: string; treatments: string[]; clinicProvidesMaterials: boolean; clinicPercentage: number;
  }>({ rentalMode: "turno", rentalPrice: 0, date: "", startTime: "", endTime: "", treatments: ["Revisión"], clinicProvidesMaterials: false, clinicPercentage: 40 });
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "completed" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [slotEditForm, setSlotEditForm] = useState<{
    date: string; startTime: string; endTime: string; rentalPrice: number; rentalMode: string;
  }>({ date: "", startTime: "", endTime: "", rentalPrice: 0, rentalMode: "turno" });
  const [form, setForm] = useState({
    firstName: "", lastName: "", cov: "", email: "", phone: "", cedula: "",
    rentalMode: "turno" as "turno" | "percent", rentalPrice: 0,
    date: "", turnoBlock: "" as "" | "am" | "pm", selectedHours: [] as string[],
    treatments: ["Revisión"] as string[], clinicProvidesMaterials: false, clinicPercentage: 40,
  });
  const [blockForm, setBlockForm] = useState({
    date: "", rentalMode: "" as "" | "turno" | "percent",
    turnoBlock: "" as "" | "am" | "pm", selectedHours: [] as string[],
    treatments: ["Revisión"] as string[], clinicProvidesMaterials: false, clinicPercentage: 40,
  });

  const caracasToday = getCaracasToday();
  const caracasNow = getCaracasNow();

  const resetForm = () => {
    setForm({ firstName: "", lastName: "", cov: "", email: "", phone: "", cedula: "", rentalMode: "turno", rentalPrice: 0, date: "", turnoBlock: "", selectedHours: [], treatments: ["Revisión"], clinicProvidesMaterials: false, clinicPercentage: 40 });
    setShowForm(false);
    setEditing(null);
  };

  const resetBlockForm = () => {
    setBlockForm({ date: "", rentalMode: "", turnoBlock: "", selectedHours: [], treatments: ["Revisión"], clinicProvidesMaterials: false, clinicPercentage: 40 });
  };

  // Helper to calculate total price for multiple treatments
  const getMultiTreatmentTotal = (treatmentNames: string[]) => {
    return treatmentNames.reduce((sum, name) => {
      const t = treatments.find(tr => tr.name === name);
      return sum + (t?.priceUSD || 0);
    }, 0);
  };

  const isBlockAvailableFor = (date: string, block: "am" | "pm"): boolean => {
    if (!date) return false;
    const startH = block === "am" ? 8 : 13;
    const endH = block === "am" ? 12 : 17;
    const d = new Date(date + "T00:00:00");
    const day = d.getDay();
    if (day === 0) return false;
    if (day === 6 && block === "pm") return false;
    const actualEnd = day === 6 && block === "am" ? 14 : endH;
    const isToday = date === caracasToday;
    const currentHour = caracasNow.getHours();
    for (let h = startH; h < actualEnd; h++) {
      if (isToday && h <= currentHour) continue;
      const time = `${h.toString().padStart(2, "0")}:00`;
      const hasAppointment = appointments.some((a) => a.date === date && a.status !== "cancelada" && parseInt(a.time.split(":")[0]) === h);
      if (hasAppointment) return false;
      if (isSlotBlockedByTenant(date, time, tenants).blocked) return false;
    }
    return true;
  };

  const getTurnoHours = (date: string, block: "am" | "pm"): string[] => {
    const d = new Date(date + "T00:00:00");
    const day = d.getDay();
    if (block === "am") {
      const end = day === 6 ? 14 : 12;
      const hours: string[] = [];
      for (let h = 8; h < end; h++) hours.push(`${h.toString().padStart(2, "0")}:00`);
      return hours;
    } else {
      const hours: string[] = [];
      for (let h = 13; h < 17; h++) hours.push(`${h.toString().padStart(2, "0")}:00`);
      return hours;
    }
  };

  const getAvailableSlots = (date: string) => {
    const isToday = date === caracasToday;
    const currentHour = caracasNow.getHours();
    return getAllAvailableSlots(date, appointments, tenants, isToday ? currentHour : undefined, isToday);
  };

  // Auto-calculate clinic percentage based on materials toggle
  const getAutoPercentage = (clinicProvidesMaterials: boolean) => clinicProvidesMaterials ? 60 : 40;

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) { toast.error("Nombre y apellido son obligatorios"); return; }
    if (editing) {
      await updateTenant(editing, { firstName: form.firstName, lastName: form.lastName, cov: form.cov, email: form.email, phone: form.phone, cedula: form.cedula, rentalMode: form.rentalMode as "turno" | "percent", rentalPrice: form.rentalPrice });
      toast.success("Inquilino actualizado");
    } else {
      const newTenant = await addTenant({ firstName: form.firstName, lastName: form.lastName, cov: form.cov, email: form.email, phone: form.phone, cedula: form.cedula, rentalMode: form.rentalMode as "turno" | "percent", rentalPrice: form.rentalPrice });
      if (form.date && form.rentalMode) {
        const tenantId = newTenant?.id;
        if (tenantId) {
          if (form.rentalMode === "turno" && form.turnoBlock) {
            const hours = getTurnoHours(form.date, form.turnoBlock as "am" | "pm");
            const startTime = hours[0];
            const lastH = parseInt(hours[hours.length - 1]);
            const endTime = `${(lastH + 1).toString().padStart(2, "0")}:00`;
            await addTenantBlockedSlot(tenantId, { date: form.date, allDay: false, startTime, endTime, status: 'approved', rentalMode: form.rentalMode, treatment: form.treatments.join(", "), clinicProvidesMaterials: form.clinicProvidesMaterials, clinicPercentage: 0 });
          } else if (form.rentalMode === "percent" && form.selectedHours.length > 0) {
            const sorted = [...form.selectedHours].sort();
            const ranges: { start: string; end: string }[] = [];
            let rangeStart = sorted[0]; let prevHour = parseInt(sorted[0]);
            for (let i = 1; i <= sorted.length; i++) {
              const currentH = i < sorted.length ? parseInt(sorted[i]) : -1;
              if (currentH !== prevHour + 1) {
                ranges.push({ start: rangeStart, end: `${(prevHour + 1).toString().padStart(2, "0")}:00` });
                if (i < sorted.length) rangeStart = sorted[i];
              }
              prevHour = currentH;
            }
            for (const range of ranges) {
              await addTenantBlockedSlot(tenantId, { date: form.date, allDay: false, startTime: range.start, endTime: range.end, status: 'approved', rentalMode: form.rentalMode, treatment: form.treatments.join(", "), clinicProvidesMaterials: form.clinicProvidesMaterials, clinicPercentage: form.clinicPercentage });
            }
          }
        }
      }
      toast.success("Inquilino añadido");
    }
    resetForm();
  };

  const handleEdit = (t: Tenant) => {
    setForm({ firstName: t.firstName, lastName: t.lastName, cov: t.cov, email: t.email, phone: t.phone, cedula: t.cedula, rentalMode: (t.rentalMode === "turno" ? "turno" : "percent") as "turno" | "percent", rentalPrice: t.rentalPrice, date: "", turnoBlock: "", selectedHours: [], treatments: ["Revisión"], clinicProvidesMaterials: false, clinicPercentage: 40 });
    setEditing(t.id);
    setShowForm(true);
  };

  const toggleHour = (setter: "form" | "block", time: string) => {
    if (setter === "form") {
      setForm(prev => ({ ...prev, selectedHours: prev.selectedHours.includes(time) ? prev.selectedHours.filter(t => t !== time) : [...prev.selectedHours, time].sort() }));
    } else {
      setBlockForm(prev => ({ ...prev, selectedHours: prev.selectedHours.includes(time) ? prev.selectedHours.filter(t => t !== time) : [...prev.selectedHours, time].sort() }));
    }
  };

  const handleAddBlocks = async (tenantId: string) => {
    if (!blockForm.date || !blockForm.rentalMode) { toast.error("Selecciona fecha y modalidad"); return; }
    if (blockForm.rentalMode === "turno") {
      if (!blockForm.turnoBlock) { toast.error("Selecciona el turno (AM o PM)"); return; }
      const hours = getTurnoHours(blockForm.date, blockForm.turnoBlock as "am" | "pm");
      const startTime = hours[0];
      const lastH = parseInt(hours[hours.length - 1]);
      const endTime = `${(lastH + 1).toString().padStart(2, "0")}:00`;
      await addTenantBlockedSlot(tenantId, { date: blockForm.date, allDay: false, startTime, endTime, status: 'approved', rentalMode: blockForm.rentalMode, treatment: blockForm.treatments.join(", "), clinicProvidesMaterials: blockForm.clinicProvidesMaterials });
      toast.success(`Turno ${blockForm.turnoBlock.toUpperCase()} bloqueado para ${blockForm.date}`);
    } else {
      if (blockForm.selectedHours.length === 0) { toast.error("Selecciona al menos una hora"); return; }
      const sorted = [...blockForm.selectedHours].sort();
      const ranges: { start: string; end: string }[] = [];
      let rangeStart = sorted[0]; let prevHour = parseInt(sorted[0]);
      for (let i = 1; i <= sorted.length; i++) {
        const currentH = i < sorted.length ? parseInt(sorted[i]) : -1;
        if (currentH !== prevHour + 1) {
          ranges.push({ start: rangeStart, end: `${(prevHour + 1).toString().padStart(2, "0")}:00` });
          if (i < sorted.length) rangeStart = sorted[i];
        }
        prevHour = currentH;
      }
      const customPercent = blockForm.clinicPercentage;
      for (const range of ranges) {
        await addTenantBlockedSlot(tenantId, { date: blockForm.date, allDay: false, startTime: range.start, endTime: range.end, status: 'approved', rentalMode: blockForm.rentalMode, treatment: blockForm.treatments.join(", "), clinicProvidesMaterials: blockForm.clinicProvidesMaterials, clinicPercentage: customPercent });
      }
      toast.success(`${sorted.length} hora(s) bloqueada(s) en la agenda`);
    }
    resetBlockForm();
  };

  const startEditRequest = (req: typeof rentalRequests[0]) => {
    setEditingRequest(req.id);
    const reqTreatments = req.treatment ? req.treatment.split(", ").filter(Boolean) : ["Revisión"];
    setRequestEditForm({
      rentalMode: req.rentalMode === "procedimiento" ? "percent" : req.rentalMode,
      rentalPrice: req.rentalPrice || 0,
      date: req.date, startTime: req.startTime || "", endTime: req.endTime || "",
      treatments: reqTreatments, clinicProvidesMaterials: req.clinicProvidesMaterials || false,
      clinicPercentage: req.clinicPercentage || getAutoPercentage(req.clinicProvidesMaterials || false),
    });
  };

  const handleApproveRequest = async (reqId: string) => {
    if (editingRequest === reqId) {
      await updateBlockedSlot(reqId, {
        rentalMode: requestEditForm.rentalMode,
        rentalPrice: requestEditForm.rentalPrice,
        date: requestEditForm.date,
        startTime: requestEditForm.startTime,
        endTime: requestEditForm.endTime,
        treatment: requestEditForm.treatments.join(", "),
        clinicProvidesMaterials: requestEditForm.clinicProvidesMaterials,
        clinicPercentage: requestEditForm.rentalMode === 'percent' ? requestEditForm.clinicPercentage : 0,
      });
    }
    await approveRentalRequest(reqId);
    toast.success("✅ Alquiler aprobado — Horario bloqueado");
    setEditingRequest(null);
  };

  const startEditSlot = (sl: TenantBlockedSlot) => {
    setEditingSlot(sl.id);
    setSlotEditForm({
      date: sl.date,
      startTime: sl.startTime || "",
      endTime: sl.endTime || "",
      rentalPrice: sl.rentalPrice || 0,
      rentalMode: sl.rentalMode === "procedimiento" ? "percent" : (sl.rentalMode || "turno"),
    });
  };

  const handleSaveSlotEdit = async (slotId: string) => {
    await updateBlockedSlot(slotId, {
      date: slotEditForm.date,
      startTime: slotEditForm.startTime,
      endTime: slotEditForm.endTime,
      rentalPrice: slotEditForm.rentalPrice,
      rentalMode: slotEditForm.rentalMode,
    });
    toast.success("Horario actualizado");
    setEditingSlot(null);
  };

  // Schedule selection UI — only turno and percent
  const ScheduleSelector = ({ date, rentalMode, turnoBlock, selectedHours, onDateChange, onModeChange, onTurnoChange, onToggleHour, rentalPrice, onPriceChange, selectedTreatments, onAddTreatment, onRemoveTreatment, clinicProvidesMaterials, onClinicMaterialsChange, clinicPercentage, onClinicPercentageChange }: {
    date: string; rentalMode: string; turnoBlock: string; selectedHours: string[];
    onDateChange: (d: string) => void; onModeChange: (m: string) => void; onTurnoChange: (t: string) => void; onToggleHour: (h: string) => void;
    rentalPrice?: number; onPriceChange?: (p: number) => void;
    selectedTreatments?: string[]; onAddTreatment?: (t: string) => void; onRemoveTreatment?: (idx: number) => void;
    clinicProvidesMaterials?: boolean; onClinicMaterialsChange?: (v: boolean) => void;
    clinicPercentage?: number; onClinicPercentageChange?: (v: number) => void;
  }) => {
    const amAvail = date ? isBlockAvailableFor(date, "am") : false;
    const pmAvail = date ? isBlockAvailableFor(date, "pm") : false;
    const needsHours = rentalMode === "percent";
    const pSlots = date && needsHours ? getAvailableSlots(date) : [];
    const currentTreatments = selectedTreatments || ["Revisión"];
    const totalPrice = getMultiTreatmentTotal(currentTreatments);
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Clock className="w-3 h-3 text-gold" /> Fecha *</label>
          <input type="date" min={caracasToday} className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={date} onChange={(e) => onDateChange(e.target.value)} />
        </div>
        {date && (
          <div className="space-y-3">
            <p className="text-xs font-semibold flex items-center gap-1"><Building2 className="w-3 h-3 text-gold" /> Modalidad de Alquiler</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onModeChange("turno")} className={`py-3 rounded-lg text-xs font-medium transition-all border flex flex-col items-center gap-1 ${rentalMode === "turno" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
                <Clock className="w-4 h-4" /> Por Turno
              </button>
              <button type="button" onClick={() => onModeChange("percent")} className={`py-3 rounded-lg text-xs font-medium transition-all border flex flex-col items-center gap-1 ${rentalMode === "percent" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
                <DollarSign className="w-4 h-4" /> Por Porcentaje (%)
              </button>
            </div>
          </div>
        )}

        {/* Turno: flat USD price */}
        {date && rentalMode === "turno" && onPriceChange && (
          <div>
            <label className="block text-xs font-medium mb-1">Precio por Turno (USD)</label>
            <input type="number" step="0.01" min="0" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={rentalPrice || 0} onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)} />
            {(rentalPrice || 0) > 0 && <p className="text-[10px] text-muted-foreground mt-1">Bs. {formatVES((rentalPrice || 0) * tasaBCV)}</p>}
          </div>
        )}

        {/* Porcentaje: multi-treatment + materials toggle + auto % */}
        {date && rentalMode === "percent" && (
          <div className="space-y-3">
            {/* Multi-treatment list */}
            <div className="space-y-2">
              <label className="block text-xs font-medium flex items-center gap-1"><Stethoscope className="w-3 h-3 text-gold" /> Tratamientos a realizar</label>
              {currentTreatments.map((tName, idx) => {
                const tr = treatments.find(t => t.name === tName);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <select className="flex-1 bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={tName} onChange={(e) => {
                      if (onRemoveTreatment && onAddTreatment) {
                        const newList = [...currentTreatments];
                        newList[idx] = e.target.value;
                        // Replace entire list by removing and re-adding
                        onRemoveTreatment(idx);
                        // We need a different approach - just call with index update
                      }
                      // Simplify: update by replacing at index
                      const newList = [...currentTreatments];
                      newList[idx] = e.target.value;
                      // Remove all then add all back
                      if (onRemoveTreatment && onAddTreatment) {
                        // Use parent state update pattern
                      }
                    }}>
                      {[...treatments].sort((a, b) => a.name.localeCompare(b.name, "es")).map((t) => (
                        <option key={t.name} value={t.name}>{t.name} — ${t.priceUSD.toFixed(2)} | Bs. {formatVES(t.priceUSD * tasaBCV)}</option>
                      ))}
                    </select>
                    {currentTreatments.length > 1 && (
                      <button type="button" onClick={() => onRemoveTreatment?.(idx)} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              <button type="button" onClick={() => onAddTreatment?.(treatments[0]?.name || "Revisión")} className="w-full py-2 rounded-lg text-xs font-medium border border-dashed border-gold/50 text-gold hover:bg-gold/10 transition-all flex items-center justify-center gap-1">
                <Plus className="w-3 h-3" /> Añadir otro tratamiento
              </button>
            </div>
            <div className="flex items-center justify-between bg-card rounded-lg px-3 py-3 border border-border">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gold" />
                <p className="text-xs font-medium">¿La clínica provee los materiales?</p>
              </div>
              <Switch checked={clinicProvidesMaterials || false} onCheckedChange={(v) => {
                onClinicMaterialsChange?.(v);
                onClinicPercentageChange?.(v ? 60 : 40);
              }} className="data-[state=checked]:bg-gold" />
            </div>
            <div className="bg-card rounded-lg px-3 py-2.5 border border-border space-y-1">
              <label className="text-xs font-medium flex items-center gap-1">Comisión clínica (%)</label>
              <div className="flex items-center gap-2">
                <input type="number" step="1" min="0" max="100" className="w-20 bg-muted rounded-lg px-3 py-1.5 text-sm border border-border focus:border-gold focus:outline-none text-center font-bold text-gold" value={clinicPercentage ?? getAutoPercentage(clinicProvidesMaterials || false)} onChange={(e) => onClinicPercentageChange?.(parseInt(e.target.value) || 0)} />
                <span className="text-xs text-muted-foreground">%</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  Sugerido: {clinicProvidesMaterials ? "60%" : "40%"}
                </span>
              </div>
            </div>
            {/* Financial breakdown */}
            {(() => {
              const pct = clinicPercentage ?? getAutoPercentage(clinicProvidesMaterials || false);
              const clinicAmount = totalPrice * (pct / 100);
              const doctorAmount = totalPrice - clinicAmount;
              return totalPrice > 0 ? (
                <div className="bg-card rounded-lg px-3 py-3 border border-gold/30 space-y-2">
                  <p className="text-xs font-semibold flex items-center gap-1"><DollarSign className="w-3 h-3 text-gold" /> Desglose Financiero</p>
                  {currentTreatments.length > 1 && (
                    <div className="space-y-1 pb-1 border-b border-border/30">
                      {currentTreatments.map((tName, i) => {
                        const tr = treatments.find(t => t.name === tName);
                        return <p key={i} className="text-[10px] text-muted-foreground">• {tName}: ${(tr?.priceUSD || 0).toFixed(2)}</p>;
                      })}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-lg px-3 py-2 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground font-medium">Clínica ({pct}%)</p>
                      <p className="text-sm font-bold text-gold">${clinicAmount.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">Bs. {formatVES(clinicAmount * tasaBCV)}</p>
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground font-medium">Doctor ({100 - pct}%)</p>
                      <p className="text-sm font-bold">${doctorAmount.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">Bs. {formatVES(doctorAmount * tasaBCV)}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">Total tratamientos: ${totalPrice.toFixed(2)} | Bs. {formatVES(totalPrice * tasaBCV)}</p>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Turno selection */}
        {date && rentalMode === "turno" && (
          <div className="space-y-3">
            <p className="text-xs font-medium">Seleccione el turno:</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled={!amAvail} onClick={() => onTurnoChange("am")} className={`py-4 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-2 ${!amAvail ? "bg-muted/50 border-border text-muted-foreground/50 cursor-not-allowed" : turnoBlock === "am" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
                <Sun className="w-5 h-5" /><span className="font-semibold">Mañana (AM)</span><span className="text-xs opacity-75">8:00 AM - 12:00 PM</span>
                {!amAvail && <span className="text-xs text-destructive">No disponible</span>}
              </button>
              <button type="button" disabled={!pmAvail} onClick={() => onTurnoChange("pm")} className={`py-4 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-2 ${!pmAvail ? "bg-muted/50 border-border text-muted-foreground/50 cursor-not-allowed" : turnoBlock === "pm" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
                <Moon className="w-5 h-5" /><span className="font-semibold">Tarde (PM)</span><span className="text-xs opacity-75">1:00 PM - 5:00 PM</span>
                {!pmAvail && <span className="text-xs text-destructive">No disponible</span>}
              </button>
            </div>
            {!amAvail && !pmAvail && <p className="text-xs text-destructive">No hay turnos disponibles para esta fecha.</p>}
          </div>
        )}

        {/* Hour selection for percent */}
        {date && needsHours && (
          <div className="space-y-3">
            {pSlots.length > 0 ? (
              <>
                <p className="text-xs font-medium">Seleccione las horas disponibles:</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {pSlots.map((slot) => (
                    <button key={slot} type="button" onClick={() => onToggleHour(slot)} className={`py-2.5 rounded-lg text-xs font-medium transition-all border ${selectedHours.includes(slot) ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
                      {slot}
                    </button>
                  ))}
                </div>
                {selectedHours.length > 0 && <p className="text-xs text-muted-foreground">{selectedHours.length} hora(s) seleccionada(s)</p>}
              </>
            ) : (
              <p className="text-xs text-destructive text-center py-4">No hay horas disponibles para esta fecha.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const pendingCount = rentalRequests.filter(r => r.status === 'pending_review').length;
  const confirmedCount = rentalRequests.filter(r => r.status === 'approved').length;
  const completedCount = rentalRequests.filter(r => r.status === 'completed').length;
  const cancelledCount = rentalRequests.filter(r => r.status === 'cancelled').length;
  const filteredRequests = rentalRequests.filter(r => {
    if (filterStatus === "pending") return r.status === 'pending_review';
    if (filterStatus === "approved") return r.status === 'approved';
    if (filterStatus === "completed") return r.status === 'completed';
    if (filterStatus === "cancelled") return r.status === 'cancelled';
    return true;
  }).filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (r.requesterFirstName?.toLowerCase().includes(q) || r.requesterLastName?.toLowerCase().includes(q) || r.requesterCedula?.includes(q) || r.date.includes(q) || r.treatment?.toLowerCase().includes(q));
  }).sort((a, b) => {
    const order: Record<string, number> = { pending_review: 0, approved: 1, completed: 2, cancelled: 3 };
    const diff = (order[a.status] || 0) - (order[b.status] || 0);
    return diff !== 0 ? diff : a.date.localeCompare(b.date);
  });

  return (
    <div className="space-y-6">
      {/* HEADER: Alquiler de Consultorio — anchored at top */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-gold" /> Alquiler de Consultorio
        </h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-gold text-gold-foreground px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1">
          <Plus className="w-4 h-4" /> Nuevo Inquilino
        </button>
      </div>

      {/* New Tenant Form */}
      <div className="space-y-4">

        {showForm && (
          <div className="bg-muted rounded-xl p-3 sm:p-5 space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-gold" /> {editing ? "Editar Inquilino" : "Nuevo Inquilino"}</h4>
            <div className="space-y-3">
              <h3 className="text-xs font-semibold flex items-center gap-2"><User className="w-3.5 h-3.5 text-gold" /> Datos Personales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Nombre *</label>
                  <input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "") })} maxLength={50} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Apellido *</label>
                  <input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "") })} maxLength={50} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Cédula *</label>
                  <input type="text" inputMode="numeric" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value.replace(/[^0-9]/g, "") })} maxLength={20} placeholder="12345678" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> COV</label>
                  <input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={form.cov} onChange={(e) => setForm({ ...form, cov: e.target.value })} maxLength={20} placeholder="COV-12345" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email *</label>
                  <input type="email" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={100} placeholder="doctor@correo.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono *</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2 bg-card border border-r-0 border-border rounded-l-lg text-xs text-muted-foreground font-medium">+58</span>
                    <input type="tel" inputMode="numeric" className="w-full bg-card rounded-r-lg rounded-l-none px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={form.phone} onChange={(e) => { let val = e.target.value.replace(/[^0-9]/g, ""); if (val.startsWith("0")) val = val.slice(1); setForm({ ...form, phone: val }); }} maxLength={10} placeholder="4121234567" />
                  </div>
                </div>
              </div>
            </div>
            {!editing && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-gold" /> Fecha y Horario</h3>
                <ScheduleSelector date={form.date} rentalMode={form.rentalMode} turnoBlock={form.turnoBlock} selectedHours={form.selectedHours}
                  onDateChange={(d) => setForm(prev => ({ ...prev, date: d, turnoBlock: "", selectedHours: [] }))}
                  onModeChange={(m) => setForm(prev => ({ ...prev, rentalMode: m as "turno" | "percent", turnoBlock: "", selectedHours: [] }))}
                  onTurnoChange={(t) => setForm(prev => ({ ...prev, turnoBlock: t as "" | "am" | "pm" }))}
                  onToggleHour={(h) => toggleHour("form", h)}
                  rentalPrice={form.rentalPrice} onPriceChange={(p) => setForm(prev => ({ ...prev, rentalPrice: p }))}
                   selectedTreatments={form.treatments} onAddTreatment={(t) => setForm(prev => ({ ...prev, treatments: [...prev.treatments, t] }))} onRemoveTreatment={(idx) => setForm(prev => ({ ...prev, treatments: prev.treatments.filter((_, i) => i !== idx) }))}
                   clinicProvidesMaterials={form.clinicProvidesMaterials} onClinicMaterialsChange={(v) => setForm(prev => ({ ...prev, clinicProvidesMaterials: v }))}
                   clinicPercentage={form.clinicPercentage} onClinicPercentageChange={(v) => setForm(prev => ({ ...prev, clinicPercentage: v }))}
                 />
              </div>
            )}
            {editing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Modo de Alquiler</label>
                  <select className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.rentalMode} onChange={(e) => setForm({ ...form, rentalMode: e.target.value as "turno" | "percent" })}>
                    <option value="turno">Por Turno</option>
                    <option value="percent">Por Porcentaje (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">{form.rentalMode === "percent" ? "Porcentaje (%)" : "Precio (USD)"}</label>
                  <input type="number" step="0.01" min="0" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.rentalPrice} onChange={(e) => setForm({ ...form, rentalPrice: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleSave} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Save className="w-4 h-4" /> Guardar</button>
              <button onClick={resetForm} className="bg-muted-foreground/10 text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Gestión de Alquileres — RIGHT AFTER form, before tenant cards */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-gold" /> Gestión de Alquileres
          {pendingCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full animate-pulse">{pendingCount} pendiente(s)</span>
          )}
          <span className="text-xs text-muted-foreground font-normal ml-1">({rentalRequests.length} total)</span>
        </h3>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar por nombre, cédula, fecha..." className="w-full bg-card rounded-lg pl-10 pr-4 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterStatus("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filterStatus === "all" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
            Todos ({rentalRequests.length})
          </button>
          <button onClick={() => setFilterStatus("pending")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filterStatus === "pending" ? "bg-orange-500 text-white border-orange-500" : "bg-card border-border hover:border-orange-500/50"}`}>
            ⏳ Pendientes ({pendingCount})
          </button>
          <button onClick={() => setFilterStatus("approved")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filterStatus === "approved" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
            ✅ Confirmados ({confirmedCount})
          </button>
          <button onClick={() => setFilterStatus("completed")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filterStatus === "completed" ? "bg-clinic-green text-white border-clinic-green" : "bg-card border-border hover:border-clinic-green/50"}`}>
            ✔️ Completados ({completedCount})
          </button>
          <button onClick={() => setFilterStatus("cancelled")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filterStatus === "cancelled" ? "bg-destructive text-white border-destructive" : "bg-card border-border hover:border-destructive/50"}`}>
            ❌ Cancelados ({cancelledCount})
          </button>
        </div>

        {filteredRequests.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No hay alquileres {filterStatus === "pending" ? "pendientes" : filterStatus === "approved" ? "confirmados" : ""}</p>
        ) : (
          filteredRequests.map((req) => {
            const cleanPhone = req.requesterPhone.replace(/[^0-9+]/g, "");
            const waPhone = cleanPhone.startsWith("+") ? cleanPhone.slice(1) : cleanPhone;
            const isEditing = editingRequest === req.id;
            const isPending = req.status === 'pending_review';
            const isApproved = req.status === 'approved';
            const isCompleted = req.status === 'completed';
            const isCancelled = req.status === 'cancelled';
            const statusBadge = isPending ? { cls: "bg-orange-500/20 text-orange-400", label: "⏳ Por confirmar" }
              : isApproved ? { cls: "bg-gold/20 text-gold", label: "✅ Confirmado" }
              : isCompleted ? { cls: "bg-clinic-green/20 text-clinic-green", label: "✔️ Completado" }
              : { cls: "bg-destructive/20 text-destructive", label: "❌ Cancelado" };
            return (
              <div key={req.id} className={`bg-card rounded-xl p-3 sm:p-5 space-y-3 ${isPending ? "border border-orange-500/30" : isCompleted ? "border border-clinic-green/30" : isCancelled ? "border border-destructive/30 opacity-60" : "gold-border"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold">{req.requesterFirstName} {req.requesterLastName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge.cls}`}>{statusBadge.label}</span>
                      {req.tenantId && <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold">Inquilino asignado</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">Cédula: {req.requesterCedula || "—"}{req.requesterCov ? ` • COV: ${req.requesterCov}` : ""}</p>
                    <p className="text-sm text-muted-foreground">{req.requesterEmail || "—"} • {req.requesterPhone || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {req.requesterPhone && (
                      <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="WhatsApp"><MessageCircle className="w-4 h-4" /></a>
                    )}
                    {req.requesterEmail && (
                      <a href={`mailto:${req.requesterEmail}`} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" title="Correo"><Mail className="w-4 h-4" /></a>
                    )}
                    {(isPending || isApproved) && (
                      <button onClick={() => isEditing ? setEditingRequest(null) : startEditRequest(req)} className={`p-1.5 rounded-lg ${isEditing ? "bg-gold/20 text-gold" : "bg-gold/10 text-gold hover:bg-gold/20"}`} title="Editar"><Edit className="w-4 h-4" /></button>
                    )}
                    {isPending && (
                      <button onClick={() => handleApproveRequest(req.id)} className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="Aprobar"><Check className="w-4 h-4" /></button>
                    )}
                    {isApproved && (
                      <button onClick={() => setPayingRentalId(req.id)} className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="Procesar Pago y Completar"><DollarSign className="w-4 h-4" /></button>
                    )}
                    {(isPending || isApproved) && (
                      <button onClick={async () => { await rejectRentalRequest(req.id); toast.info("Alquiler cancelado — Horario liberado"); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" title="Cancelar"><X className="w-4 h-4" /></button>
                    )}
                    {(isCompleted || isCancelled) && (
                      <button onClick={async () => { await deleteRentalRequest(req.id); toast.info("Registro eliminado"); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>

                {/* Editable details */}
                {isEditing ? (
                  <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-3">
                    <p className="text-xs font-semibold flex items-center gap-1"><Edit className="w-3 h-3 text-gold" /> Editar detalles del alquiler</p>
                    <div>
                      <label className="block text-xs font-medium mb-1">Modalidad</label>
                      <select className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={requestEditForm.rentalMode} onChange={(e) => setRequestEditForm(prev => ({ ...prev, rentalMode: e.target.value }))}>
                        <option value="turno">Por Turno</option>
                        <option value="percent">Por Porcentaje (%)</option>
                      </select>
                    </div>
                    {requestEditForm.rentalMode === "turno" && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Precio USD</label>
                        <input type="number" step="0.01" min="0" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={requestEditForm.rentalPrice} onChange={(e) => setRequestEditForm(prev => ({ ...prev, rentalPrice: parseFloat(e.target.value) || 0 }))} />
                        {requestEditForm.rentalPrice > 0 && <p className="text-[10px] text-muted-foreground mt-1">Bs. {formatVES(requestEditForm.rentalPrice * tasaBCV)}</p>}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Fecha</label>
                        <input type="date" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={requestEditForm.date} onChange={(e) => setRequestEditForm(prev => ({ ...prev, date: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Inicio</label>
                        <input type="time" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={requestEditForm.startTime} onChange={(e) => setRequestEditForm(prev => ({ ...prev, startTime: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Fin</label>
                        <input type="time" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={requestEditForm.endTime} onChange={(e) => setRequestEditForm(prev => ({ ...prev, endTime: e.target.value }))} />
                      </div>
                    </div>
                    {requestEditForm.rentalMode === "percent" && (
                      <div>
                        <label className="block text-xs font-medium mb-1">Tratamiento</label>
                        <select className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={requestEditForm.treatment} onChange={(e) => setRequestEditForm(prev => ({ ...prev, treatment: e.target.value }))}>
                          {[...treatments].sort((a, b) => a.name.localeCompare(b.name, "es")).map((t) => (
                            <option key={t.name} value={t.name}>{t.name} — ${t.priceUSD.toFixed(2)} | Bs. {formatVES(t.priceUSD * tasaBCV)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {requestEditForm.rentalMode === "percent" && (
                      <div className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-border">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-gold" />
                          <p className="text-xs font-medium">¿Clínica provee materiales?</p>
                        </div>
                        <Switch checked={requestEditForm.clinicProvidesMaterials} onCheckedChange={(v) => {
                          setRequestEditForm(prev => ({ ...prev, clinicProvidesMaterials: v, clinicPercentage: v ? 60 : 40 }));
                        }} className="data-[state=checked]:bg-gold" />
                      </div>
                    )}
                    {requestEditForm.rentalMode === "percent" && (
                      <div className="bg-card rounded-lg px-3 py-2 border border-border space-y-1">
                        <label className="text-xs font-medium">Comisión clínica (%)</label>
                        <div className="flex items-center gap-2">
                          <input type="number" step="1" min="0" max="100" className="w-20 bg-muted rounded-lg px-3 py-1.5 text-sm border border-border focus:border-gold focus:outline-none text-center font-bold text-gold" value={requestEditForm.clinicPercentage} onChange={(e) => setRequestEditForm(prev => ({ ...prev, clinicPercentage: parseInt(e.target.value) || 0 }))} />
                          <span className="text-xs text-muted-foreground">% — Sugerido: {requestEditForm.clinicProvidesMaterials ? "60%" : "40%"}</span>
                        </div>
                      </div>
                    )}
                    {requestEditForm.rentalMode === "percent" && (() => {
                      const selectedTreatment = treatments.find(t => t.name === requestEditForm.treatment);
                      const treatmentPrice = selectedTreatment?.priceUSD || 0;
                      const pct = requestEditForm.clinicPercentage;
                      const clinicAmount = treatmentPrice * (pct / 100);
                      const doctorAmount = treatmentPrice - clinicAmount;
                      return treatmentPrice > 0 ? (
                        <div className="bg-card rounded-lg px-3 py-3 border border-gold/30 space-y-2">
                          <p className="text-xs font-semibold flex items-center gap-1"><DollarSign className="w-3 h-3 text-gold" /> Desglose Financiero</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-muted rounded-lg px-3 py-2 space-y-0.5">
                              <p className="text-[10px] text-muted-foreground font-medium">Clínica ({pct}%)</p>
                              <p className="text-sm font-bold text-gold">${clinicAmount.toFixed(2)}</p>
                              <p className="text-[10px] text-muted-foreground">Bs. {formatVES(clinicAmount * tasaBCV)}</p>
                            </div>
                            <div className="bg-muted rounded-lg px-3 py-2 space-y-0.5">
                              <p className="text-[10px] text-muted-foreground font-medium">Doctor ({100 - pct}%)</p>
                              <p className="text-sm font-bold">${doctorAmount.toFixed(2)}</p>
                              <p className="text-[10px] text-muted-foreground">Bs. {formatVES(doctorAmount * tasaBCV)}</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground text-center">Precio tratamiento: ${treatmentPrice.toFixed(2)} | Bs. {formatVES(treatmentPrice * tasaBCV)}</p>
                        </div>
                      ) : null;
                    })()}
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        await updateBlockedSlot(req.id, { rentalMode: requestEditForm.rentalMode, rentalPrice: requestEditForm.rentalPrice, date: requestEditForm.date, startTime: requestEditForm.startTime, endTime: requestEditForm.endTime, treatment: requestEditForm.treatment, clinicProvidesMaterials: requestEditForm.clinicProvidesMaterials, clinicPercentage: requestEditForm.rentalMode === 'percent' ? requestEditForm.clinicPercentage : 0 });
                        toast.success("Datos actualizados");
                        setEditingRequest(null);
                      }} className="bg-gold text-gold-foreground px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"><Save className="w-3 h-3" /> Guardar cambios</button>
                      {isPending && (
                        <button onClick={() => handleApproveRequest(req.id)} className="bg-clinic-green text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Guardar y Aprobar</button>
                      )}
                      <button onClick={() => setEditingRequest(null)} className="text-xs text-muted-foreground hover:underline">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-gold" />
                        {req.rentalMode === "turno" ? "Por Turno" : "Por Porcentaje (%)"}
                      </span>
                      <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-gold" />
                        {req.rentalMode === "percent" ? `${req.clinicPercentage || getAutoPercentage(req.clinicProvidesMaterials || false)}% clínica` : `$${(req.rentalPrice || 0).toFixed(2)} | Bs. ${formatVES((req.rentalPrice || 0) * tasaBCV)}`}
                      </span>
                      {req.rentalMode === "percent" && req.treatment && (
                        <span className="flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5 text-gold" /> {req.treatment}</span>
                      )}
                      {req.clinicProvidesMaterials && (
                        <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-gold" /> Materiales incluidos</span>
                      )}
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gold" />
                        {req.date} • {req.allDay ? "Día completo" : `${req.startTime} - ${req.endTime}`}
                      </span>
                    </div>
                    {req.rentalMode === "percent" && (() => {
                      const selectedTreatment = treatments.find(t => t.name === req.treatment);
                      const treatmentPrice = selectedTreatment?.priceUSD || 0;
                      const pct = req.clinicPercentage || getAutoPercentage(req.clinicProvidesMaterials || false);
                      const clinicAmount = treatmentPrice * (pct / 100);
                      const doctorAmount = treatmentPrice - clinicAmount;
                      return treatmentPrice > 0 ? (
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="bg-muted rounded-lg px-3 py-1.5">
                            <p className="text-[10px] text-muted-foreground">Clínica ({pct}%)</p>
                            <p className="text-xs font-bold text-gold">${clinicAmount.toFixed(2)} <span className="font-normal text-muted-foreground">| Bs. {formatVES(clinicAmount * tasaBCV)}</span></p>
                          </div>
                          <div className="bg-muted rounded-lg px-3 py-1.5">
                            <p className="text-[10px] text-muted-foreground">Doctor ({100 - pct}%)</p>
                            <p className="text-xs font-bold">${doctorAmount.toFixed(2)} <span className="font-normal text-muted-foreground">| Bs. {formatVES(doctorAmount * tasaBCV)}</span></p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Inquilinos Registrados */}
      <div className="space-y-4">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-gold" /> Inquilinos Registrados
          <span className="text-xs text-muted-foreground font-normal">({tenants.length})</span>
        </h3>
        {tenants.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No hay inquilinos registrados</p>
        ) : (
          tenants.map((t) => (
            <div key={t.id} className="bg-card rounded-xl p-3 sm:p-5 gold-border space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold">{t.firstName} {t.lastName}</p>
                  <p className="text-sm text-muted-foreground">COV: {t.cov || "—"} • Cédula: {t.cedula || "—"}</p>
                  <p className="text-sm text-muted-foreground">{t.email || "—"} • {t.phone || "—"}</p>
                  <p className="text-sm font-medium mt-1">{t.rentalMode === "turno" ? `Turno: $${t.rentalPrice.toFixed(2)} USD` : `Porcentaje: ${t.rentalPrice}%`}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(t)} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => { setBlockingTenant(blockingTenant === t.id ? null : t.id); resetBlockForm(); }} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20" title="Agendar horario"><Lock className="w-4 h-4" /></button>
                  <button onClick={async () => { await deleteTenant(t.id); toast.success("Inquilino eliminado"); }} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {blockingTenant === t.id && (
                <div className="bg-muted rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-sm flex items-center gap-1"><Calendar className="w-4 h-4" /> Agendar Horario para {t.firstName}</h4>
                  <ScheduleSelector date={blockForm.date} rentalMode={blockForm.rentalMode} turnoBlock={blockForm.turnoBlock} selectedHours={blockForm.selectedHours}
                    onDateChange={(d) => setBlockForm(prev => ({ ...prev, date: d, rentalMode: "", turnoBlock: "", selectedHours: [] }))}
                    onModeChange={(m) => setBlockForm(prev => ({ ...prev, rentalMode: m as "" | "turno" | "percent", turnoBlock: "", selectedHours: [] }))}
                    onTurnoChange={(t) => setBlockForm(prev => ({ ...prev, turnoBlock: t as "" | "am" | "pm" }))}
                    onToggleHour={(h) => toggleHour("block", h)}
                    treatment={blockForm.treatment} onTreatmentChange={(t) => setBlockForm(prev => ({ ...prev, treatment: t }))}
                    clinicProvidesMaterials={blockForm.clinicProvidesMaterials} onClinicMaterialsChange={(v) => setBlockForm(prev => ({ ...prev, clinicProvidesMaterials: v }))}
                    clinicPercentage={blockForm.clinicPercentage} onClinicPercentageChange={(v) => setBlockForm(prev => ({ ...prev, clinicPercentage: v }))}
                  />
                  {((blockForm.rentalMode === "turno" && blockForm.turnoBlock) || (blockForm.rentalMode === "percent" && blockForm.selectedHours.length > 0)) && (
                    <button onClick={() => handleAddBlocks(t.id)} className="w-full bg-gold text-gold-foreground py-2.5 rounded-lg text-sm font-semibold">Bloquear Horario</button>
                  )}
                </div>
              )}

              {t.blockedSlots.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Horarios bloqueados:</p>
                  {t.blockedSlots.sort((a, b) => a.date.localeCompare(b.date)).map((sl) => (
                    <div key={sl.id} className="bg-muted rounded-lg px-3 py-2 text-xs space-y-2">
                      {editingSlot === sl.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-0.5">Modalidad</label>
                              <select className="w-full bg-card rounded px-2 py-1 text-xs border border-border" value={slotEditForm.rentalMode} onChange={(e) => setSlotEditForm(prev => ({ ...prev, rentalMode: e.target.value }))}>
                                <option value="turno">Por Turno</option>
                                <option value="percent">Por Porcentaje (%)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-0.5">{slotEditForm.rentalMode === "percent" ? "Porcentaje %" : "Precio USD"}</label>
                              <input type="number" step="0.01" className="w-full bg-card rounded px-2 py-1 text-xs border border-border" value={slotEditForm.rentalPrice} onChange={(e) => setSlotEditForm(prev => ({ ...prev, rentalPrice: parseFloat(e.target.value) || 0 }))} />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input type="date" className="bg-card rounded px-2 py-1 text-xs border border-border" value={slotEditForm.date} onChange={(e) => setSlotEditForm(prev => ({ ...prev, date: e.target.value }))} />
                            <input type="time" className="bg-card rounded px-2 py-1 text-xs border border-border" value={slotEditForm.startTime} onChange={(e) => setSlotEditForm(prev => ({ ...prev, startTime: e.target.value }))} />
                            <input type="time" className="bg-card rounded px-2 py-1 text-xs border border-border" value={slotEditForm.endTime} onChange={(e) => setSlotEditForm(prev => ({ ...prev, endTime: e.target.value }))} />
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleSaveSlotEdit(sl.id)} className="bg-gold text-gold-foreground px-2 py-1 rounded text-xs font-semibold flex items-center gap-1"><Save className="w-3 h-3" /> Guardar</button>
                            <button onClick={() => setEditingSlot(null)} className="text-xs text-muted-foreground hover:underline">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span>{sl.date} — {sl.allDay ? "Día completo" : `${sl.startTime} - ${sl.endTime}`} • {sl.rentalMode === "percent" ? `${sl.clinicPercentage || sl.rentalPrice || 0}% clínica` : `$${(sl.rentalPrice || 0).toFixed(2)}`}{sl.treatment && sl.rentalMode === "percent" ? ` • ${sl.treatment}` : ""}</span>
                          <div className="flex gap-1">
                            <button onClick={() => startEditSlot(sl)} className="text-gold hover:text-gold/80"><Edit className="w-3 h-3" /></button>
                            <button onClick={async () => { await removeTenantBlockedSlot(t.id, sl.id); toast.success("Bloqueo removido"); }} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {payingRentalId && (() => {
        const req = rentalRequests.find(r => r.id === payingRentalId);
        if (!req) return null;
        const tenantName = `${req.requesterFirstName} ${req.requesterLastName}`.trim();
        return (
          <PaymentModal
            open={!!payingRentalId}
            onOpenChange={(v) => !v && setPayingRentalId(null)}
            entityName={tenantName}
            treatment={`Alquiler — ${req.rentalMode === 'turno' ? 'Por Turno' : 'Por %'}`}
            defaultPrice={req.rentalPrice || 0}
            tasaBCV={tasaBCV}
            onConfirm={async (finalPrice, paymentMethod, paymentReference) => {
              await updateBlockedSlot(req.id, { rentalPrice: finalPrice });
              await completeRentalSlot(req.id);
              await addTransaction({
                date: req.date,
                type: 'tenant',
                entityName: tenantName,
                rentalSlotId: req.id,
                amountUSD: finalPrice,
                amountVES: finalPrice * tasaBCV,
                tasaBCV,
                paymentMethod,
                paymentReference,
                description: `Alquiler — ${tenantName} (${req.date})`,
              });
              toast.success("💳 Pago de alquiler procesado");
              setPayingRentalId(null);
            }}
          />
        );
      })()}
    </div>
  );
};
