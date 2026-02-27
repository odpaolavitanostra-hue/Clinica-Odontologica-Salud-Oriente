
import { useState } from "react";
import { useClinicData } from "@/hooks/useClinicData";
import { DollarSign, Download, Plus, Trash2, BookOpen, ShoppingCart, Receipt, Edit, Save, X, CalendarDays } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface AccountingEntry {
  id: string;
  date: string;
  description: string;
  amountUSD: number;
  reference: string;
}

const generateId = () => Math.random().toString(36).substring(2, 10);

type PeriodFilter = "dia" | "semana" | "mes" | "todo";

const getDateRange = (filter: PeriodFilter, customDate?: string): { start: string; end: string } => {
  const today = customDate || new Date().toISOString().split("T")[0];
  if (filter === "dia") return { start: today, end: today };
  if (filter === "semana") {
    const d = new Date(today + "T00:00:00");
    const day = d.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday.toISOString().split("T")[0], end: sunday.toISOString().split("T")[0] };
  }
  if (filter === "mes") {
    const [y, m] = today.split("-");
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    return { start: `${y}-${m}-01`, end: `${y}-${m}-${lastDay.toString().padStart(2, "0")}` };
  }
  return { start: "2000-01-01", end: "2099-12-31" };
};

const inRange = (date: string, start: string, end: string) => date >= start && date <= end;

export const AdminFinances = () => {
  const { finances, appointments, doctors, tenants, tasaBCV, setTasaBCV, updateFinance } = useClinicData();
  const [editingFinance, setEditingFinance] = useState<string | null>(null);
  const [editDoctorPay, setEditDoctorPay] = useState("");
  const [activeTab, setActiveTab] = useState<"resumen" | "compras" | "ventas">("resumen");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("mes");
  const [customDate, setCustomDate] = useState(new Date().toISOString().split("T")[0]);

  const [purchases, setPurchases] = useState<AccountingEntry[]>(() => {
    const saved = localStorage.getItem("coso-purchases");
    return saved ? JSON.parse(saved) : [];
  });
  const [sales, setSales] = useState<AccountingEntry[]>(() => {
    const saved = localStorage.getItem("coso-sales");
    return saved ? JSON.parse(saved) : [];
  });
  const [newEntry, setNewEntry] = useState({ date: "", description: "", amountUSD: "", reference: "" });

  const savePurchases = (items: AccountingEntry[]) => { setPurchases(items); localStorage.setItem("coso-purchases", JSON.stringify(items)); };
  const saveSales = (items: AccountingEntry[]) => { setSales(items); localStorage.setItem("coso-sales", JSON.stringify(items)); };

  const addEntry = (type: "compras" | "ventas") => {
    if (!newEntry.date || !newEntry.description || !newEntry.amountUSD) { toast.error("Completa fecha, descripción y monto"); return; }
    const entry: AccountingEntry = { id: generateId(), date: newEntry.date, description: newEntry.description, amountUSD: parseFloat(newEntry.amountUSD) || 0, reference: newEntry.reference };
    if (type === "compras") savePurchases([...purchases, entry]);
    else saveSales([...sales, entry]);
    setNewEntry({ date: "", description: "", amountUSD: "", reference: "" });
    toast.success(`Registro añadido al libro de ${type}`);
  };

  const deleteEntry = (type: "compras" | "ventas", id: string) => {
    if (type === "compras") savePurchases(purchases.filter((p) => p.id !== id));
    else saveSales(sales.filter((s) => s.id !== id));
    toast.success("Registro eliminado");
  };

  const { start, end } = getDateRange(periodFilter, customDate);
  const filteredFinances = finances.filter(f => inRange(f.date, start, end));
  const filteredPurchases = purchases.filter(p => inRange(p.date, start, end));
  const filteredSales = sales.filter(s => inRange(s.date, start, end));

  // Rental income from blocked slots
  const allBlockedSlots = tenants.flatMap(t => t.blockedSlots.map(sl => ({ ...sl, tenantName: `${t.firstName} ${t.lastName}` })));
  const filteredRentals = allBlockedSlots.filter(sl => sl.status === "completed" && sl.rentalPrice && sl.rentalPrice > 0 && inRange(sl.date, start, end));
  const totalRentalIncomeUSD = filteredRentals.reduce((s, r) => s + (r.rentalPrice || 0), 0);

  const totalIncomeUSD = filteredFinances.reduce((s, f) => s + f.treatmentPriceUSD, 0);
  const totalDoctorPayUSD = filteredFinances.reduce((s, f) => s + f.doctorPayUSD, 0);
  const totalMaterialsUSD = filteredFinances.reduce((s, f) => s + f.materialsCostUSD, 0);
  const totalUtilityUSD = filteredFinances.reduce((s, f) => s + f.utilityUSD, 0);
  const totalPurchasesUSD = filteredPurchases.reduce((s, p) => s + p.amountUSD, 0);
  const totalSalesUSD = filteredSales.reduce((s, p) => s + p.amountUSD, 0);

  const periodLabel = periodFilter === "dia" ? customDate : periodFilter === "semana" ? `${start} al ${end}` : periodFilter === "mes" ? `${start.slice(0, 7)}` : "Histórico";

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    // Fiscal report (filtered)
    const fiscalData = filteredFinances.map((f) => {
      const app = appointments.find((a) => a.id === f.appointmentId);
      const doctor = app ? doctors.find((d) => d.id === app.doctorId) : null;
      return { Fecha: f.date, Paciente: app?.patientName || "N/A", Tratamiento: app?.treatment || "N/A", Doctor: doctor?.name || "N/A", "Ingreso USD": f.treatmentPriceUSD.toFixed(2), "Ingreso VES": (f.treatmentPriceUSD * f.tasaBCV).toFixed(2), "Pago Doctor USD": f.doctorPayUSD.toFixed(2), "Pago Doctor VES": (f.doctorPayUSD * f.tasaBCV).toFixed(2), "Materiales USD": f.materialsCostUSD.toFixed(2), "Materiales VES": (f.materialsCostUSD * f.tasaBCV).toFixed(2), "Utilidad USD": f.utilityUSD.toFixed(2), "Utilidad VES": (f.utilityUSD * f.tasaBCV).toFixed(2), "Tasa BCV": f.tasaBCV.toFixed(2) };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fiscalData), "Pacientes");

    // Rentals
    const rentalData = filteredRentals.map(r => ({
      Fecha: r.date, Inquilino: r.tenantName, Horario: r.allDay ? "Día completo" : `${r.startTime} - ${r.endTime}`,
      Modalidad: r.rentalMode === "turno" ? "Turno" : "Porcentaje", "Ingreso USD": (r.rentalPrice || 0).toFixed(2), "Ingreso VES": ((r.rentalPrice || 0) * tasaBCV).toFixed(2),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rentalData), "Alquileres");

    // Purchases
    const purchaseData = filteredPurchases.map((p) => ({ Fecha: p.date, Descripción: p.description, Referencia: p.reference, "Monto USD": p.amountUSD.toFixed(2), "Monto VES": (p.amountUSD * tasaBCV).toFixed(2) }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseData), "Libro de Compras");

    // Sales
    const salesData = filteredSales.map((s) => ({ Fecha: s.date, Descripción: s.description, Referencia: s.reference, "Monto USD": s.amountUSD.toFixed(2), "Monto VES": (s.amountUSD * tasaBCV).toFixed(2) }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), "Libro de Ventas");

    // Summary sheet
    const summaryData = [
      { Concepto: "Ingresos Pacientes", "USD": totalIncomeUSD.toFixed(2), "VES": (totalIncomeUSD * tasaBCV).toFixed(2) },
      { Concepto: "Ingresos Alquileres", "USD": totalRentalIncomeUSD.toFixed(2), "VES": (totalRentalIncomeUSD * tasaBCV).toFixed(2) },
      { Concepto: "Total Ingresos", "USD": (totalIncomeUSD + totalRentalIncomeUSD).toFixed(2), "VES": ((totalIncomeUSD + totalRentalIncomeUSD) * tasaBCV).toFixed(2) },
      { Concepto: "Pago Doctores", "USD": totalDoctorPayUSD.toFixed(2), "VES": (totalDoctorPayUSD * tasaBCV).toFixed(2) },
      { Concepto: "Materiales", "USD": totalMaterialsUSD.toFixed(2), "VES": (totalMaterialsUSD * tasaBCV).toFixed(2) },
      { Concepto: "Utilidad Pacientes", "USD": totalUtilityUSD.toFixed(2), "VES": (totalUtilityUSD * tasaBCV).toFixed(2) },
      { Concepto: "Total Compras", "USD": totalPurchasesUSD.toFixed(2), "VES": (totalPurchasesUSD * tasaBCV).toFixed(2) },
      { Concepto: "Total Ventas", "USD": totalSalesUSD.toFixed(2), "VES": (totalSalesUSD * tasaBCV).toFixed(2) },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Resumen");

    XLSX.writeFile(wb, `contabilidad_COSO_${periodLabel}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleSetTasaBCV = async (value: number) => { await setTasaBCV(value); };

  const renderEntryForm = (type: "compras" | "ventas") => (
    <div className="bg-muted rounded-lg p-4 space-y-3 mb-4">
      <h4 className="text-sm font-semibold">Nuevo registro</h4>
      <div className="grid grid-cols-2 gap-3">
        <input type="date" className="bg-card rounded-lg px-3 py-2 text-sm border border-border" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} />
        <input type="text" placeholder="Referencia / Factura" className="bg-card rounded-lg px-3 py-2 text-sm border border-border" value={newEntry.reference} onChange={(e) => setNewEntry({ ...newEntry, reference: e.target.value })} />
      </div>
      <input type="text" placeholder="Descripción" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} />
      <div className="flex gap-3">
        <input type="number" step="0.01" placeholder="Monto USD" className="flex-1 bg-card rounded-lg px-3 py-2 text-sm border border-border" value={newEntry.amountUSD} onChange={(e) => setNewEntry({ ...newEntry, amountUSD: e.target.value })} />
        <button onClick={() => addEntry(type)} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Plus className="w-4 h-4" /> Añadir</button>
      </div>
    </div>
  );

  const renderEntries = (entries: AccountingEntry[], type: "compras" | "ventas") => (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No hay registros en el libro de {type}</p>
      ) : (
        entries.sort((a, b) => b.date.localeCompare(a.date)).map((entry) => (
          <div key={entry.id} className="bg-card rounded-xl p-4 gold-border flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm">{entry.description}</p>
              <p className="text-xs text-muted-foreground">{entry.date} {entry.reference && `• Ref: ${entry.reference}`}</p>
            </div>
            <div className="text-right flex items-center gap-2">
              <div>
                <p className="font-semibold text-sm">${entry.amountUSD.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Bs. {(entry.amountUSD * tasaBCV).toFixed(2)}</p>
              </div>
              <button onClick={() => deleteEntry(type, entry.id)} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2"><DollarSign className="w-6 h-6 text-gold" /> Finanzas</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 gold-border">
            <span className="text-sm font-medium">Tasa BCV:</span>
            <input type="number" step="0.01" className="w-24 bg-muted rounded px-2 py-1 text-sm border border-border text-center" value={tasaBCV} onChange={(e) => handleSetTasaBCV(parseFloat(e.target.value) || 0)} />
          </div>
          <button onClick={exportXLSX} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Download className="w-4 h-4" /> XLSX</button>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <CalendarDays className="w-4 h-4 text-gold" />
        {(["dia", "semana", "mes", "todo"] as PeriodFilter[]).map((p) => (
          <button key={p} onClick={() => setPeriodFilter(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${periodFilter === p ? "bg-gold text-gold-foreground" : "bg-card gold-border hover:bg-muted"}`}>
            {p === "dia" ? "Día" : p === "semana" ? "Semana" : p === "mes" ? "Mes" : "Todo"}
          </button>
        ))}
        {periodFilter !== "todo" && (
          <input type="date" className="bg-card rounded-lg px-3 py-1.5 text-xs border border-border" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
        )}
        <span className="text-xs text-muted-foreground ml-1">{periodLabel}</span>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: "resumen" as const, label: "Resumen", icon: <BookOpen className="w-4 h-4" /> },
          { key: "compras" as const, label: "Compras", icon: <ShoppingCart className="w-4 h-4" /> },
          { key: "ventas" as const, label: "Ventas", icon: <Receipt className="w-4 h-4" /> },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-gold text-gold-foreground" : "bg-card gold-border hover:bg-muted"}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "resumen" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <SummaryCard label="Ingresos Pacientes" value={`$${totalIncomeUSD.toFixed(2)}`} sub={`Bs. ${(totalIncomeUSD * tasaBCV).toFixed(2)}`} />
            <SummaryCard label="Ingresos Alquileres" value={`$${totalRentalIncomeUSD.toFixed(2)}`} sub={`Bs. ${(totalRentalIncomeUSD * tasaBCV).toFixed(2)}`} />
            <SummaryCard label="Pago Doctores" value={`$${totalDoctorPayUSD.toFixed(2)}`} sub={`Bs. ${(totalDoctorPayUSD * tasaBCV).toFixed(2)}`} />
            <SummaryCard label="Utilidad" value={`$${totalUtilityUSD.toFixed(2)}`} sub={`Bs. ${(totalUtilityUSD * tasaBCV).toFixed(2)}`} highlight />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <SummaryCard label="Materiales" value={`$${totalMaterialsUSD.toFixed(2)}`} sub={`Bs. ${(totalMaterialsUSD * tasaBCV).toFixed(2)}`} />
            <SummaryCard label="Total Compras" value={`$${totalPurchasesUSD.toFixed(2)}`} sub={`Bs. ${(totalPurchasesUSD * tasaBCV).toFixed(2)}`} />
            <SummaryCard label="Total Ventas" value={`$${totalSalesUSD.toFixed(2)}`} sub={`Bs. ${(totalSalesUSD * tasaBCV).toFixed(2)}`} />
          </div>

          {/* Rental income details */}
          {filteredRentals.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2 text-gold">Ingresos por Alquileres</h3>
              <div className="space-y-2">
                {filteredRentals.map((r, i) => (
                  <div key={i} className="bg-card rounded-xl p-3 gold-border flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{r.tenantName}</span>
                      <span className="text-muted-foreground ml-2">{r.date} • {r.allDay ? "Día completo" : `${r.startTime}-${r.endTime}`}</span>
                    </div>
                    <span className="font-semibold text-gold">${(r.rentalPrice || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {filteredFinances.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No hay registros financieros en este período</p>
            ) : (
              filteredFinances.sort((a, b) => b.date.localeCompare(a.date)).map((f) => {
                const app = appointments.find((a) => a.id === f.appointmentId);
                const doctor = app ? doctors.find((d) => d.id === app.doctorId) : null;
                return (
                  <div key={f.id} className="bg-card rounded-xl p-4 gold-border">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div><p className="font-semibold">{app?.patientName} — {app?.treatment}</p><p className="text-sm text-muted-foreground">{f.date} • {doctor?.name}</p></div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="font-semibold text-gold">${f.utilityUSD.toFixed(2)} USD</p>
                          <p className="text-xs text-muted-foreground">Bs. {(f.utilityUSD * f.tasaBCV).toFixed(2)}</p>
                        </div>
                        <button onClick={() => { setEditingFinance(editingFinance === f.id ? null : f.id); setEditDoctorPay(f.doctorPayUSD.toString()); }} className="p-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/20" title="Editar pago doctor"><Edit className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span>Ingreso: ${f.treatmentPriceUSD.toFixed(2)}</span><span>Doctor: ${f.doctorPayUSD.toFixed(2)}</span><span>Materiales: ${f.materialsCostUSD.toFixed(2)}</span><span>Tasa: {f.tasaBCV}</span>
                    </div>
                    {editingFinance === f.id && (
                      <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
                        <p className="text-xs font-semibold">Sobrescribir pago al doctor (USD):</p>
                        <div className="flex gap-2 items-center">
                          <input type="number" step="0.01" min="0" className="bg-card rounded-lg px-3 py-2 text-sm border border-border w-32" value={editDoctorPay} onChange={(e) => setEditDoctorPay(e.target.value)} />
                          <button onClick={async () => {
                            const newPay = parseFloat(editDoctorPay) || 0;
                            const newUtility = f.treatmentPriceUSD - newPay - f.materialsCostUSD;
                            await updateFinance(f.appointmentId, { doctorPayUSD: newPay, utilityUSD: newUtility });
                            toast.success("Pago actualizado");
                            setEditingFinance(null);
                          }} className="bg-gold text-gold-foreground px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1"><Save className="w-3 h-3" /> Guardar</button>
                          <button onClick={() => setEditingFinance(null)} className="text-xs text-muted-foreground hover:underline">Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {activeTab === "compras" && (<>{renderEntryForm("compras")}{renderEntries(filteredPurchases, "compras")}</>)}
      {activeTab === "ventas" && (<>{renderEntryForm("ventas")}{renderEntries(filteredSales, "ventas")}</>)}
    </div>
  );
};

const SummaryCard = ({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) => (
  <div className={`bg-card rounded-xl p-4 text-center ${highlight ? "gold-border gold-glow" : "gold-border"}`}>
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className={`text-lg font-bold ${highlight ? "text-gold" : ""}`}>{value}</p>
    <p className="text-xs text-muted-foreground">{sub}</p>
  </div>
);
