
import { useState } from "react";
import { useClinicData } from "@/hooks/useClinicData";
import { DollarSign, Download, Plus, Trash2, BookOpen, ShoppingCart, Receipt, Edit, Save, X } from "lucide-react";
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

export const AdminFinances = () => {
  const { finances, appointments, doctors, tasaBCV, setTasaBCV, updateFinance } = useClinicData();
  const [editingFinance, setEditingFinance] = useState<string | null>(null);
  const [editDoctorPay, setEditDoctorPay] = useState("");

  const [activeTab, setActiveTab] = useState<"resumen" | "compras" | "ventas">("resumen");
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

  const totalIncomeUSD = finances.reduce((s, f) => s + f.treatmentPriceUSD, 0);
  const totalDoctorPayUSD = finances.reduce((s, f) => s + f.doctorPayUSD, 0);
  const totalMaterialsUSD = finances.reduce((s, f) => s + f.materialsCostUSD, 0);
  const totalUtilityUSD = finances.reduce((s, f) => s + f.utilityUSD, 0);
  const totalPurchasesUSD = purchases.reduce((s, p) => s + p.amountUSD, 0);
  const totalSalesUSD = sales.reduce((s, p) => s + p.amountUSD, 0);

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const fiscalData = finances.map((f) => {
      const app = appointments.find((a) => a.id === f.appointmentId);
      const doctor = app ? doctors.find((d) => d.id === app.doctorId) : null;
      return { Fecha: f.date, Paciente: app?.patientName || "N/A", Tratamiento: app?.treatment || "N/A", Doctor: doctor?.name || "N/A", "Ingreso VES": (f.treatmentPriceUSD * f.tasaBCV).toFixed(2), "Pago Doctor VES": (f.doctorPayUSD * f.tasaBCV).toFixed(2), "Materiales VES": (f.materialsCostUSD * f.tasaBCV).toFixed(2), "Utilidad VES": (f.utilityUSD * f.tasaBCV).toFixed(2), "Tasa BCV": f.tasaBCV.toFixed(2) };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fiscalData), "Reporte Fiscal");
    const purchaseData = purchases.map((p) => ({ Fecha: p.date, Descripción: p.description, Referencia: p.reference, "Monto USD": p.amountUSD.toFixed(2), "Monto VES": (p.amountUSD * tasaBCV).toFixed(2) }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseData), "Libro de Compras");
    const salesData = sales.map((s) => ({ Fecha: s.date, Descripción: s.description, Referencia: s.reference, "Monto USD": s.amountUSD.toFixed(2), "Monto VES": (s.amountUSD * tasaBCV).toFixed(2) }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), "Libro de Ventas");
    XLSX.writeFile(wb, `contabilidad_COSO_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleSetTasaBCV = async (value: number) => {
    await setTasaBCV(value);
  };

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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2"><DollarSign className="w-6 h-6 text-gold" /> Finanzas</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 gold-border">
            <span className="text-sm font-medium">Tasa BCV:</span>
            <input type="number" step="0.01" className="w-24 bg-muted rounded px-2 py-1 text-sm border border-border text-center" value={tasaBCV} onChange={(e) => handleSetTasaBCV(parseFloat(e.target.value) || 0)} />
          </div>
          <button onClick={exportXLSX} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Download className="w-4 h-4" /> XLSX</button>
        </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <SummaryCard label="Ingresos USD" value={`$${totalIncomeUSD.toFixed(2)}`} sub={`Bs. ${(totalIncomeUSD * tasaBCV).toFixed(2)}`} />
            <SummaryCard label="Pago Doctores" value={`$${totalDoctorPayUSD.toFixed(2)}`} sub={`Bs. ${(totalDoctorPayUSD * tasaBCV).toFixed(2)}`} />
            <SummaryCard label="Materiales" value={`$${totalMaterialsUSD.toFixed(2)}`} sub={`Bs. ${(totalMaterialsUSD * tasaBCV).toFixed(2)}`} />
            <SummaryCard label="Utilidad" value={`$${totalUtilityUSD.toFixed(2)}`} sub={`Bs. ${(totalUtilityUSD * tasaBCV).toFixed(2)}`} highlight />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <SummaryCard label="Total Compras" value={`$${totalPurchasesUSD.toFixed(2)}`} sub={`Bs. ${(totalPurchasesUSD * tasaBCV).toFixed(2)}`} />
            <SummaryCard label="Total Ventas" value={`$${totalSalesUSD.toFixed(2)}`} sub={`Bs. ${(totalSalesUSD * tasaBCV).toFixed(2)}`} />
          </div>
          <div className="space-y-3">
            {finances.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No hay registros financieros</p>
            ) : (
              finances.sort((a, b) => b.date.localeCompare(a.date)).map((f) => {
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

      {activeTab === "compras" && (<>{renderEntryForm("compras")}{renderEntries(purchases, "compras")}</>)}
      {activeTab === "ventas" && (<>{renderEntryForm("ventas")}{renderEntries(sales, "ventas")}</>)}
      
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
