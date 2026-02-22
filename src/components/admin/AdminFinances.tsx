import { useCosoStore } from "@/store/useCosoStore";
import { DollarSign, Download } from "lucide-react";
import * as XLSX from "xlsx";

export const AdminFinances = () => {
  const { finances, appointments, doctors, tasaBCV, setTasaBCV } = useCosoStore();

  const totalIncomeUSD = finances.reduce((s, f) => s + f.treatmentPriceUSD, 0);
  const totalDoctorPayUSD = finances.reduce((s, f) => s + f.doctorPayUSD, 0);
  const totalMaterialsUSD = finances.reduce((s, f) => s + f.materialsCostUSD, 0);
  const totalUtilityUSD = finances.reduce((s, f) => s + f.utilityUSD, 0);

  const exportXLSX = () => {
    const data = finances.map((f) => {
      const app = appointments.find((a) => a.id === f.appointmentId);
      const doctor = app ? doctors.find((d) => d.id === app.doctorId) : null;
      return {
        Fecha: f.date,
        Paciente: app?.patientName || "N/A",
        Tratamiento: app?.treatment || "N/A",
        Doctor: doctor?.name || "N/A",
        "Ingreso VES": (f.treatmentPriceUSD * f.tasaBCV).toFixed(2),
        "Pago Doctor VES": (f.doctorPayUSD * f.tasaBCV).toFixed(2),
        "Materiales VES": (f.materialsCostUSD * f.tasaBCV).toFixed(2),
        "Utilidad VES": (f.utilityUSD * f.tasaBCV).toFixed(2),
        "Tasa BCV": f.tasaBCV.toFixed(2),
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Fiscal");
    XLSX.writeFile(wb, `reporte_fiscal_COSO_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-gold" /> Finanzas
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 gold-border">
            <span className="text-sm font-medium">Tasa BCV:</span>
            <input
              type="number"
              step="0.01"
              className="w-24 bg-muted rounded px-2 py-1 text-sm border border-border text-center"
              value={tasaBCV}
              onChange={(e) => setTasaBCV(parseFloat(e.target.value) || 0)}
            />
          </div>
          <button onClick={exportXLSX} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
            <Download className="w-4 h-4" /> XLSX (SENIAT)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Ingresos USD" value={`$${totalIncomeUSD.toFixed(2)}`} sub={`Bs. ${(totalIncomeUSD * tasaBCV).toFixed(2)}`} />
        <SummaryCard label="Pago Doctores" value={`$${totalDoctorPayUSD.toFixed(2)}`} sub={`Bs. ${(totalDoctorPayUSD * tasaBCV).toFixed(2)}`} />
        <SummaryCard label="Materiales" value={`$${totalMaterialsUSD.toFixed(2)}`} sub={`Bs. ${(totalMaterialsUSD * tasaBCV).toFixed(2)}`} />
        <SummaryCard label="Utilidad" value={`$${totalUtilityUSD.toFixed(2)}`} sub={`Bs. ${(totalUtilityUSD * tasaBCV).toFixed(2)}`} highlight />
      </div>

      {/* Records */}
      <div className="space-y-3">
        {finances.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No hay registros financieros</p>
        ) : (
          finances
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((f) => {
              const app = appointments.find((a) => a.id === f.appointmentId);
              const doctor = app ? doctors.find((d) => d.id === app.doctorId) : null;
              return (
                <div key={f.id} className="bg-card rounded-xl p-4 gold-border">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold">{app?.patientName} — {app?.treatment}</p>
                      <p className="text-sm text-muted-foreground">{f.date} • {doctor?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gold">${f.utilityUSD.toFixed(2)} USD</p>
                      <p className="text-xs text-muted-foreground">Bs. {(f.utilityUSD * f.tasaBCV).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span>Ingreso: ${f.treatmentPriceUSD.toFixed(2)}</span>
                    <span>Doctor: ${f.doctorPayUSD.toFixed(2)}</span>
                    <span>Materiales: ${f.materialsCostUSD.toFixed(2)}</span>
                    <span>Tasa: {f.tasaBCV}</span>
                  </div>
                </div>
              );
            })
        )}
      </div>
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
