
import { useState } from "react";
import { useClinicData, Tenant, TenantBlockedSlot } from "@/hooks/useClinicData";
import { Building2, Plus, Save, Trash2, Edit, Lock, Calendar, X, Check, Mail, MessageCircle, Clock, Sun, Moon, User, CreditCard, Phone, Briefcase, DollarSign } from "lucide-react";
import { toast } from "sonner";
import PaymentModal from "./PaymentModal";
import { getCaracasToday, getCaracasNow, getAllAvailableSlots, isSlotBlockedByTenant } from "@/lib/scheduleUtils";

// Schedule selection UI (moved outside to prevent re-renders losing focus)
const ScheduleSelector = ({ 
  date, rentalMode, turnoBlock, selectedHours, onDateChange, onModeChange, onTurnoChange, onToggleHour, rentalPrice, onPriceChange,
  amAvail, pmAvail, pSlots, caracasToday
}: {
  date: string; rentalMode: string; turnoBlock: string; selectedHours: string[];
  onDateChange: (d: string) => void; onModeChange: (m: string) => void; onTurnoChange: (t: string) => void; onToggleHour: (h: string) => void;
  rentalPrice?: number; onPriceChange?: (p: number) => void;
  amAvail: boolean; pmAvail: boolean; pSlots: string[]; caracasToday: string;
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Clock className="w-3 h-3 text-gold" /> Fecha *</label>
        <input type="date" min={caracasToday} className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={date} onChange={(e) => onDateChange(e.target.value)} />
      </div>
      {date && (
        <div className="space-y-3">
          <p className="text-xs font-semibold flex items-center gap-1"><Building2 className="w-3 h-3 text-gold" /> Modalidad de Alquiler</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => onModeChange("turno")} className={`py-3 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-1 ${rentalMode === "turno" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
              <Clock className="w-4 h-4" /> Por Turno
            </button>
            <button type="button" onClick={() => onModeChange("percent")} className={`py-3 rounded-lg text-sm font-medium transition-all border flex flex-col items-center gap-1 ${rentalMode === "percent" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"}`}>
              <Building2 className="w-4 h-4" /> Por Porcentaje (%)
            </button>
          </div>
        </div>
      )}
      {date && rentalMode && onPriceChange && (
        <div>
          <label className="block text-xs font-medium mb-1">{rentalMode === "turno" ? "Precio por Turno (USD)" : "Porcentaje (%)"}</label>
          <input type="number" step="0.01" min="0" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={rentalPrice || 0} onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)} />
        </div>
      )}
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
      {date && rentalMode === "percent" && (
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
              {selectedHours.length > 0 ? <p className="text-xs text-muted-foreground">{selectedHours.length} hora(s) seleccionada(s)</p> : null}
            </>
          ) : (
            <p className="text-xs text-destructive text-center py-4">No hay horas disponibles para esta fecha.</p>
          )}
        </div>
      )}
    </div>
  );
};

export const AdminTenants = () => {
  const { tenants, treatments, appointments, addTenant, updateTenant, deleteTenant, addTenantBlockedSlot, removeTenantBlockedSlot, rentalRequests, approveRentalRequest, rejectRentalRequest, deleteRentalRequest, completeRentalSlot, updateBlockedSlot, tasaBCV, addTransaction } = useClinicData();
  const [showForm, setShowForm] = useState(false);
  const [payingRentalId, setPayingRentalId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [blockingTenant, setBlockingTenant] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [requestEditForm, setRequestEditForm] = useState<{
    rentalMode: string; rentalPrice: number; date: string; startTime: string; endTime: string; treatment: string;
  }>({ rentalMode: "turno", rentalPrice: 0, date: "", startTime: "", endTime: "", treatment: "Revisión" });
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "completed" | "cancelled">("all");
  // Editing existing blocked slots
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [slotEditForm, setSlotEditForm] = useState<{
    date: string; startTime: string; endTime: string; rentalPrice: number; rentalMode: string;
  }>({ date: "", startTime: "", endTime: "", rentalPrice: 0, rentalMode: "turno" });
  const [form, setForm] = useState({
    firstName: "", lastName: "", cov: "", email: "", phone: "", cedula: "",
    rentalMode: "turno" as "turno" | "percent", rentalPrice: 0,
    date: "", turnoBlock: "" as "" | "am" | "pm", selectedHours: [] as string[],
  });
  const [blockForm, setBlockForm] = useState({
    date: "", rentalMode: "" as "" | "turno" | "percent",
    turnoBlock: "" as "" | "am" | "pm", selectedHours: [] as string[],
  });

  const caracasToday = getCaracasToday();
  const caracasNow = getCaracasNow();

  const resetForm = () => {
    setForm({ firstName: "", lastName: "", cov: "", email: "", phone: "", cedula: "", rentalMode: "turno", rentalPrice: 0, date: "", turnoBlock: "", selectedHours: [] });
    setShowForm(false);
    setEditing(null);
  };

  const resetBlockForm = () => {
    setBlockForm({ date: "", rentalMode: "", turnoBlock: "", selectedHours: [] });
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

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) { toast.error("Nombre y apellido son obligatorios"); return; }
    if (editing) {
      await updateTenant(editing, { firstName: form.firstName, lastName: form.lastName, cov: form.cov, email: form.email, phone: form.phone, cedula: form.cedula, rentalMode: form.rentalMode, rentalPrice: form.rentalPrice });
      toast.success("Inquilino actualizado");
    } else {
      const newTenant = await addTenant({ firstName: form.firstName, lastName: form.lastName, cov: form.cov, email: form.email, phone: form.phone, cedula: form.cedula, rentalMode: form.rentalMode, rentalPrice: form.rentalPrice });
      if (form.date && form.rentalMode) {
        const tenantId = newTenant?.id;
        if (tenantId) {
          if (form.rentalMode === "turno" && form.turnoBlock) {
            const hours = getTurnoHours(form.date, form.turnoBlock as "am" | "pm");
            const startTime = hours[0];
            const lastH = parseInt(hours[hours.length - 1]);
            const endTime = `${(lastH + 1).toString().padStart(2, "0")}:00`;
            await addTenantBlockedSlot(tenantId, { date: form.date, allDay: false, startTime, endTime, status: 'approved' });
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
              await addTenantBlockedSlot(tenantId, { date: form.date, allDay: false, startTime: range.start, endTime: range.end, status: 'approved' });
            }
          }
        }
      }
      toast.success("Inquilino añadido");
    }
    resetForm();
  };

  const handleEdit = (t: Tenant) => {
    setForm({ firstName: t.firstName, lastName: t.lastName, cov: t.cov, email: t.email, phone: t.phone, cedula: t.cedula, rentalMode: t.rentalMode, rentalPrice: t.rentalPrice, date: "", turnoBlock: "", selectedHours: [] });
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
      await addTenantBlockedSlot(tenantId, { date: blockForm.date, allDay: false, startTime, endTime, status: 'approved' });
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
      for (const range of ranges) {
        await addTenantBlockedSlot(tenantId, { date: blockForm.date, allDay: false, startTime: range.start, endTime: range.end, status: 'approved' });
      }
      toast.success(`${sorted.length} hora(s) bloqueada(s) en la agenda`);
    }
    resetBlockForm();
  };

  const startEditRequest = (req: typeof rentalRequests[0]) => {
    setEditingRequest(req.id);
    setRequestEditForm({
      rentalMode: req.rentalMode, rentalPrice: req.rentalPrice || 0,
      date: req.date, startTime: req.startTime || "", endTime: req.endTime || "",
      treatment: req.treatment || "Revisión",
    });
  };

  const handleApproveRequest = async (reqId: string) => {
    if (editingRequest === reqId) {
      // Save edits first then approve
      await updateBlockedSlot(reqId, {
        rentalMode: requestEditForm.rentalMode,
        rentalPrice: requestEditForm.rentalPrice,
        date: requestEditForm.date,
        startTime: requestEditForm.startTime,
        endTime: requestEditForm.endTime,
        treatment: requestEditForm.treatment,
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
      rentalMode: sl.rentalMode || "turno",
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

  const { pendingCount, confirmedCount, completedCount, cancelledCount } = rentalRequests.reduce((acc, r) => {
    if (r.status === 'pending_review') acc.pendingCount++;
    if (r.status === 'approved') acc.confirmedCount++;
    if (r.status === 'completed') acc.completedCount++;
    if (r.status === 'cancelled') acc.cancelledCount++;
    return acc;
  }, { pendingCount: 0, confirmedCount: 0, completedCount: 0, cancelledCount: 0 });
  const filteredRequests = rentalRequests.filter(r => {
    if (filterStatus === "pending") return r.status === 'pending_review';
    if (filterStatus === "approved") return r.status === 'approved';
    if (filterStatus === "completed") return r.status === 'completed';
    if (filterStatus === "cancelled") return r.status === 'cancelled';
    return true;
  }).sort((a, b) => {
    const order: Record<string, number> = { pending_review: 0, approved: 1, completed: 2, cancelled: 3 };
    const diff = (order[a.status] || 0) - (order[b.status] || 0);
    return diff !== 0 ? diff : a.date.localeCompare(b.date);
  });

  return (
    <div className="space-y-6">
      {/* Rental Requests Section — Always visible */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-400" /> Gestión de Alquileres
          {pendingCount > 0 && (
            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">{pendingCount} pendiente(s)</span>
          )}
          <span className="text-xs text-muted-foreground font-normal ml-1">({rentalRequests.length} total)</span>
        </h3>

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
              <div key={req.id} className={`bg-card rounded-xl p-5 space-y-3 ${isPending ? "border border-orange-500/30" : isCompleted ? "border border-clinic-green/30" : isCancelled ? "border border-destructive/30 opacity-60" : "gold-border"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{req.requesterFirstName} {req.requesterLastName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge.cls}`}>{statusBadge.label}</span>
                      {req.tenantId && <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold">Inquilino asignado</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">COV: {req.requesterCov || "—"} • Cédula: {req.requesterCedula || "—"}</p>
                    <p className="text-sm text-muted-foreground">{req.requesterEmail || "—"} • {req.requesterPhone || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {req.requesterPhone && (
                      <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="WhatsApp"><MessageCircle className="w-4 h-4" /></a>
                    )}
                    {req.requesterEmail && (
                      <a href={`mailto:${req.requesterEmail}`} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" title="Correo"><Mail className="w-4 h-4" /></a>
                    )}
                    {/* Edit button - available for pending & approved */}
                    {(isPending || isApproved) && (
                      <button onClick={() => isEditing ? setEditingRequest(null) : startEditRequest(req)} className={`p-1.5 rounded-lg ${isEditing ? "bg-gold/20 text-gold" : "bg-gold/10 text-gold hover:bg-gold/20"}`} title="Editar"><Edit className="w-4 h-4" /></button>
                    )}
                    {/* Approve - only pending */}
                    {isPending && (
                      <button onClick={() => handleApproveRequest(req.id)} className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="Aprobar"><Check className="w-4 h-4" /></button>
                    )}
                    {/* Complete with payment - only approved */}
                    {isApproved && (
                      <button onClick={() => setPayingRentalId(req.id)} className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20" title="Procesar Pago y Completar"><DollarSign className="w-4 h-4" /></button>
                    )}
                    {/* Cancel - pending or approved */}
                    {(isPending || isApproved) && (
                      <button onClick={async () => { await rejectRentalRequest(req.id); toast.info("Alquiler cancelado — Horario liberado"); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" title="Cancelar"><X className="w-4 h-4" /></button>
                    )}
                    {/* Delete - completed or cancelled */}
                    {(isCompleted || isCancelled) && (
                      <button onClick={async () => { await deleteRentalRequest(req.id); toast.info("Registro eliminado"); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>

                {/* Editable details */}
                {isEditing ? (
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold flex items-center gap-1"><Edit className="w-3 h-3 text-gold" /> Editar detalles del alquiler</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Modalidad</label>
                        <select className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={requestEditForm.rentalMode} onChange={(e) => setRequestEditForm(prev => ({ ...prev, rentalMode: e.target.value }))}>
                          <option value="turno">Por Turno</option>
                          <option value="percent">Por Porcentaje (%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">{requestEditForm.rentalMode === "turno" ? "Precio USD" : "Porcentaje %"}</label>
                        <input type="number" step="0.01" min="0" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-gold focus:outline-none" value={requestEditForm.rentalPrice} onChange={(e) => setRequestEditForm(prev => ({ ...prev, rentalPrice: parseFloat(e.target.value) || 0 }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
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
                            <option key={t.name} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        await updateBlockedSlot(req.id, { rentalMode: requestEditForm.rentalMode, rentalPrice: requestEditForm.rentalPrice, date: requestEditForm.date, startTime: requestEditForm.startTime, endTime: requestEditForm.endTime, treatment: requestEditForm.treatment });
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
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-gold" />
                      {req.rentalMode === "turno" ? "Por Turno" : "Por Porcentaje (%)"}
                    </span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-gold" />
                      {req.rentalMode === "turno" ? `$${(req.rentalPrice || 0).toFixed(2)} USD` : `${req.rentalPrice}%`}
                    </span>
                    {req.rentalMode === "percent" && req.treatment && (
                      <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-gold" /> {req.treatment}</span>
                    )}
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gold" />
                      {req.date} • {req.allDay ? "Día completo" : `${req.startTime} - ${req.endTime}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Existing Tenants Section */}
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gold" /> Alquiler de Consultorio
        </h3>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
          <Plus className="w-4 h-4" /> Nuevo Inquilino
        </button>
      </div>

      {showForm && (
        <div className="bg-muted rounded-xl p-5 space-y-5">
          <h4 className="font-semibold text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-gold" /> {editing ? "Editar Inquilino" : "Nuevo Inquilino"}</h4>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold flex items-center gap-2"><User className="w-3.5 h-3.5 text-gold" /> Datos Personales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Nombre *</label>
                <input type="text" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.firstName} onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "") }))} maxLength={50} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Apellido *</label>
                <input type="text" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.lastName} onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "") }))} maxLength={50} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Cédula *</label>
                <input type="text" inputMode="numeric" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.cedula} onChange={(e) => setForm(prev => ({ ...prev, cedula: e.target.value.replace(/[^0-9]/g, "") }))} maxLength={20} placeholder="12345678" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> COV *</label>
                <input type="text" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.cov} onChange={(e) => setForm(prev => ({ ...prev, cov: e.target.value }))} maxLength={20} placeholder="COV-12345" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email *</label>
                <input type="email" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} maxLength={100} placeholder="doctor@correo.com" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono *</label>
                <div className="flex">
                  <span className="inline-flex items-center px-2 bg-card border border-r-0 border-border rounded-l-lg text-xs text-muted-foreground font-medium">+58</span>
                  <input type="tel" inputMode="numeric" className="w-full bg-card rounded-r-lg rounded-l-none px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.phone} onChange={(e) => { let val = e.target.value.replace(/[^0-9]/g, ""); if (val.startsWith("0")) val = val.slice(1); setForm(prev => ({ ...prev, phone: val })); }} maxLength={10} placeholder="4121234567" />
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
                amAvail={form.date ? isBlockAvailableFor(form.date, "am") : false}
                pmAvail={form.date ? isBlockAvailableFor(form.date, "pm") : false}
                pSlots={form.date && form.rentalMode === "percent" ? getAvailableSlots(form.date) : []}
                caracasToday={caracasToday}
              />
            </div>
          )}
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Modo de Alquiler</label>
                <select className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.rentalMode} onChange={(e) => setForm(prev => ({ ...prev, rentalMode: e.target.value as "turno" | "percent" }))}>
                  <option value="turno">Por Turno</option>
                  <option value="percent">Por Porcentaje (%)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{form.rentalMode === "turno" ? "Precio por Turno (USD)" : "Porcentaje (%)"}</label>
                <input type="number" step="0.01" min="0" className="w-full bg-card rounded-lg px-3 py-2.5 text-sm border border-border focus:border-gold focus:outline-none" value={form.rentalPrice} onChange={(e) => setForm(prev => ({ ...prev, rentalPrice: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Save className="w-4 h-4" /> Guardar</button>
            <button onClick={resetForm} className="bg-muted-foreground/10 text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {tenants.length === 0 && !showForm ? (
        <p className="text-muted-foreground text-center py-8">No hay inquilinos registrados</p>
      ) : (
        tenants.map((t) => (
          <div key={t.id} className="bg-card rounded-xl p-5 gold-border space-y-3">
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
                  onDateChange={(d) => setBlockForm({ date: d, rentalMode: "", turnoBlock: "", selectedHours: [] })}
                  onModeChange={(m) => setBlockForm(prev => ({ ...prev, rentalMode: m as "" | "turno" | "percent", turnoBlock: "", selectedHours: [] }))}
                  onTurnoChange={(t) => setBlockForm(prev => ({ ...prev, turnoBlock: t as "" | "am" | "pm" }))}
                  onToggleHour={(h) => toggleHour("block", h)}
                  amAvail={blockForm.date ? isBlockAvailableFor(blockForm.date, "am") : false}
                  pmAvail={blockForm.date ? isBlockAvailableFor(blockForm.date, "pm") : false}
                  pSlots={blockForm.date && blockForm.rentalMode === "percent" ? getAvailableSlots(blockForm.date) : []}
                  caracasToday={caracasToday}
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
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-0.5">Modalidad</label>
                            <select className="w-full bg-card rounded px-2 py-1 text-xs border border-border" value={slotEditForm.rentalMode} onChange={(e) => setSlotEditForm(prev => ({ ...prev, rentalMode: e.target.value }))}>
                              <option value="turno">Por Turno</option>
                              <option value="percent">Por Porcentaje (%)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-0.5">{slotEditForm.rentalMode === "turno" ? "Precio USD" : "Porcentaje %"}</label>
                            <input type="number" step="0.01" className="w-full bg-card rounded px-2 py-1 text-xs border border-border" value={slotEditForm.rentalPrice} onChange={(e) => setSlotEditForm(prev => ({ ...prev, rentalPrice: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
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
                        <span>{sl.date} — {sl.allDay ? "Día completo" : `${sl.startTime} - ${sl.endTime}`} • {sl.rentalMode === "percent" ? `${sl.rentalPrice || 0}%` : `$${(sl.rentalPrice || 0).toFixed(2)}`}</span>
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

      {/* Payment Modal for Rentals */}
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
              // Update slot with payment info and new price
              await updateBlockedSlot(req.id, { rentalPrice: finalPrice });
              await completeRentalSlot(req.id);
              // Create transaction
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
