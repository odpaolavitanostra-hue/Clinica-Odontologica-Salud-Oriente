import { useState } from "react";
import { FileText, Printer, User, Stethoscope, Building2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Appointment, Doctor, FinanceRecord, Tenant, Transaction } from "@/hooks/useClinicData";
import { formatVES } from "@/lib/formatVES";

interface AdminInvoiceHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointments: Appointment[];
  doctors: Doctor[];
  finances: FinanceRecord[];
  tenants: Tenant[];
  transactions: Transaction[];
  tasaBCV: number;
}

const CLINIC_INFO = {
  name: "Clínica Odontológica Salud Oriente",
  rif: "J-50800151-6",
  address: "C.C Novocentro piso 1, local 1-02, Puerto La Cruz 6023, Anzoátegui",
  phone: "0422-7180013",
  email: "clinicaodsaludoriente@gmail.com",
};

type InvoiceType = "paciente" | "doctor" | "inquilino";

const fmtDate = (d: string) => {
  try { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; } catch { return d; }
};

const fmtVES = (n: number) => {
  const fixed = Math.abs(n).toFixed(2);
  const [integer, decimal] = fixed.split('.');
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}${formatted},${decimal}`;
};

const AdminInvoiceHub = ({ open, onOpenChange, appointments, doctors, finances, tenants, transactions, tasaBCV }: AdminInvoiceHubProps) => {
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("paciente");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    const saved = localStorage.getItem("coso-invoice-hub-counter");
    return saved ? parseInt(saved) + 1 : 1;
  });

  const completedApps = appointments.filter(a => a.status === "completada" || a.status === "pagada");

  // Unique patients from completed appointments
  const patientNames = [...new Set(completedApps.map(a => a.patientName))].sort();

  // Filter data based on type
  const getPatientItems = () => {
    if (!selectedEntity) return [];
    return completedApps
      .filter(a => a.patientName === selectedEntity && a.date >= dateFrom && a.date <= dateTo)
      .map(a => {
        const f = finances.find(fi => fi.appointmentId === a.id);
        const doc = doctors.find(d => d.id === a.doctorId);
        return { date: a.date, description: a.treatment, doctor: doc?.name || "—", amountUSD: a.priceUSD, tasaBCV: f?.tasaBCV || tasaBCV, cedula: a.patientCedula || "—", phone: a.patientPhone };
      });
  };

  const getDoctorItems = () => {
    if (!selectedEntity) return [];
    return finances
      .filter(f => {
        const app = appointments.find(a => a.id === f.appointmentId);
        return app?.doctorId === selectedEntity && f.date >= dateFrom && f.date <= dateTo;
      })
      .map(f => {
        const app = appointments.find(a => a.id === f.appointmentId);
        return { date: f.date, description: app?.treatment || "—", patient: app?.patientName || "—", amountUSD: f.doctorPayUSD, tasaBCV: f.tasaBCV };
      });
  };

  const getTenantItems = () => {
    if (!selectedEntity) return [];
    const tenant = tenants.find(t => t.id === selectedEntity);
    if (!tenant) return [];
    return tenant.blockedSlots
      .filter(sl => sl.status === "completed" && sl.date >= dateFrom && sl.date <= dateTo && sl.rentalPrice && sl.rentalPrice > 0)
      .map(sl => ({
        date: sl.date,
        description: sl.treatment || "Alquiler",
        schedule: sl.allDay ? "Día completo" : `${sl.startTime} - ${sl.endTime}`,
        amountUSD: sl.rentalPrice || 0,
        tasaBCV: tasaBCV,
      }));
  };

  const printInvoice = () => {
    localStorage.setItem("coso-invoice-hub-counter", invoiceNumber.toString());
    setInvoiceNumber(prev => prev + 1);

    const pw = window.open("", "_blank");
    if (!pw) return;

    let entityLabel = "";
    let entityDetails = "";
    let tableHeaders = "";
    let tableRows = "";
    let totalUSD = 0;

    if (invoiceType === "paciente") {
      const items = getPatientItems();
      entityLabel = "PACIENTE";
      const first = items[0];
      entityDetails = `<div class="info-item"><span class="info-label">Nombre:</span> ${selectedEntity}</div>
        <div class="info-item"><span class="info-label">Cédula:</span> ${first?.cedula || "—"}</div>
        <div class="info-item"><span class="info-label">Teléfono:</span> ${first?.phone || "—"}</div>`;
      tableHeaders = `<th>Fecha</th><th>Tratamiento</th><th>Doctor</th><th>Tasa BCV</th><th style="text-align:right">Monto (Bs.)</th>`;
      items.forEach(i => {
        const ves = i.amountUSD * i.tasaBCV;
        totalUSD += i.amountUSD;
        tableRows += `<tr><td>${fmtDate(i.date)}</td><td>${i.description}</td><td>${i.doctor}</td><td>${i.tasaBCV.toFixed(2)}</td><td style="text-align:right">Bs. ${fmtVES(ves)}</td></tr>`;
      });
    } else if (invoiceType === "doctor") {
      const doc = doctors.find(d => d.id === selectedEntity);
      const items = getDoctorItems();
      entityLabel = "DOCTOR";
      entityDetails = `<div class="info-item"><span class="info-label">Nombre:</span> Dr(a). ${doc?.name || "—"}</div>
        <div class="info-item"><span class="info-label">Especialidad:</span> ${doc?.specialty || "—"}</div>
        <div class="info-item"><span class="info-label">COV:</span> ${doc?.cov || "—"}</div>
        <div class="info-item"><span class="info-label">Teléfono:</span> ${doc?.phone || "—"}</div>`;
      tableHeaders = `<th>Fecha</th><th>Tratamiento</th><th>Paciente</th><th>Tasa BCV</th><th style="text-align:right">Pago (Bs.)</th>`;
      items.forEach(i => {
        const ves = i.amountUSD * i.tasaBCV;
        totalUSD += i.amountUSD;
        tableRows += `<tr><td>${fmtDate(i.date)}</td><td>${i.description}</td><td>${i.patient}</td><td>${i.tasaBCV.toFixed(2)}</td><td style="text-align:right">Bs. ${fmtVES(ves)}</td></tr>`;
      });
    } else {
      const tenant = tenants.find(t => t.id === selectedEntity);
      const items = getTenantItems();
      entityLabel = "INQUILINO";
      entityDetails = `<div class="info-item"><span class="info-label">Nombre:</span> ${tenant?.firstName} ${tenant?.lastName}</div>
        <div class="info-item"><span class="info-label">COV:</span> ${tenant?.cov || "—"}</div>
        <div class="info-item"><span class="info-label">Cédula:</span> ${tenant?.cedula || "—"}</div>
        <div class="info-item"><span class="info-label">Teléfono:</span> ${tenant?.phone || "—"}</div>`;
      tableHeaders = `<th>Fecha</th><th>Servicio</th><th>Horario</th><th>Tasa BCV</th><th style="text-align:right">Monto (Bs.)</th>`;
      items.forEach(i => {
        const ves = i.amountUSD * i.tasaBCV;
        totalUSD += i.amountUSD;
        tableRows += `<tr><td>${fmtDate(i.date)}</td><td>${i.description}</td><td>${i.schedule}</td><td>${i.tasaBCV.toFixed(2)}</td><td style="text-align:right">Bs. ${fmtVES(ves)}</td></tr>`;
      });
    }

    const totalVES = totalUSD * tasaBCV;

    pw.document.write(`<!DOCTYPE html><html><head><title>Factura #${invoiceNumber.toString().padStart(6,"0")}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Inter',Arial,sans-serif;padding:40px;color:#1a1a1a;max-width:800px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #435A53;padding-bottom:20px;margin-bottom:30px}
      .clinic-name{font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:bold;color:#1a1a1a}
      .clinic-info{font-size:11px;color:#666;margin-top:4px;line-height:1.6}
      .invoice-title{font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:bold;color:#435A53;text-align:right}
      .invoice-number{font-size:14px;color:#444;text-align:right;margin-top:6px}
      .badge{display:inline-block;background:#D4AF37;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:1px;margin-top:6px}
      .section{margin-bottom:24px}
      .section-title{font-size:12px;font-weight:600;color:#435A53;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .info-item{font-size:13px}
      .info-label{color:#888}
      table{width:100%;border-collapse:collapse;margin:20px 0}
      th{background:#f5f5f0;color:#435A53;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;text-align:left}
      td{padding:12px;border-bottom:1px solid #eee;font-size:13px}
      .totals{text-align:right;margin-top:20px}
      .total-row{display:flex;justify-content:flex-end;gap:40px;padding:6px 0;font-size:14px}
      .total-row.grand{font-size:18px;font-weight:bold;color:#435A53;border-top:2px solid #435A53;padding-top:12px;margin-top:8px}
      .footer{margin-top:60px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:20px}
      @media print{body{padding:20px}}
    </style></head><body>
      <div class="header">
        <div style="display:flex;align-items:center;gap:16px">
          <img src="/images/logo-green.png" alt="Logo" style="height:70px;object-fit:contain"/>
          <div>
            <div class="clinic-name">${CLINIC_INFO.name}</div>
            <div class="clinic-info">RIF: ${CLINIC_INFO.rif}<br>${CLINIC_INFO.address}<br>Tel: ${CLINIC_INFO.phone} • ${CLINIC_INFO.email}</div>
          </div>
        </div>
        <div>
          <div class="invoice-title">FACTURA</div>
          <div class="invoice-number">Nº ${invoiceNumber.toString().padStart(6,"0")}<br>Período: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}</div>
          <div class="badge">${entityLabel}</div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Datos del ${entityLabel.toLowerCase()}</div>
        <div class="info-grid">${entityDetails}</div>
      </div>
      <div class="section">
        <div class="section-title">Detalle de Servicios</div>
        <table><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table>
      </div>
      <div class="totals">
        <div class="total-row"><span>Total USD:</span><span>$${totalUSD.toFixed(2)}</span></div>
        <div class="total-row"><span>Tasa BCV actual:</span><span>${tasaBCV.toFixed(2)} Bs/$</span></div>
        <div class="total-row grand"><span>TOTAL:</span><span>Bs. ${fmtVES(totalVES)}</span></div>
      </div>
      <div style="margin-top:16px;font-size:11px;color:#666;font-style:italic;text-align:right">
        * Los montos en Bs. de cada línea usan la tasa BCV de la fecha del servicio. El total usa la tasa actual.
      </div>
      <div class="footer">${CLINIC_INFO.name} • RIF: ${CLINIC_INFO.rif} • ${CLINIC_INFO.address}<br>${CLINIC_INFO.email}<br>Gracias por su preferencia</div>
      <script>window.onload=()=>window.print();</script>
    </body></html>`);
    pw.document.close();
  };

  const currentItems = invoiceType === "paciente" ? getPatientItems() : invoiceType === "doctor" ? getDoctorItems() : getTenantItems();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Centro de Facturación
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice Type Selector */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "paciente" as const, label: "Paciente", icon: <User className="w-4 h-4" /> },
              { key: "doctor" as const, label: "Doctor", icon: <Stethoscope className="w-4 h-4" /> },
              { key: "inquilino" as const, label: "Inquilino", icon: <Building2 className="w-4 h-4" /> },
            ]).map(t => (
              <button key={t.key} onClick={() => { setInvoiceType(t.key); setSelectedEntity(""); }}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${invoiceType === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Entity Selector */}
          <div>
            <label className="block text-xs font-medium mb-1">
              {invoiceType === "paciente" ? "Seleccionar paciente" : invoiceType === "doctor" ? "Seleccionar doctor" : "Seleccionar inquilino"}
            </label>
            <select className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border" value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {invoiceType === "paciente" && patientNames.map(n => <option key={n} value={n}>{n}</option>)}
              {invoiceType === "doctor" && doctors.map(d => <option key={d.id} value={d.id}>Dr(a). {d.name}</option>)}
              {invoiceType === "inquilino" && tenants.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Desde</label>
              <input type="date" className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Hasta</label>
              <input type="date" className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          {/* Invoice Number */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium">Nº Factura:</label>
            <input type="number" className="w-28 bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={invoiceNumber} onChange={(e) => setInvoiceNumber(parseInt(e.target.value) || 1)} />
          </div>

          {/* Preview */}
          {selectedEntity && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-primary uppercase">{currentItems.length} registro(s) encontrados</p>
              {currentItems.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {currentItems.slice(0, 5).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{fmtDate(item.date)} — {item.description}</span>
                      <span className="font-semibold">${item.amountUSD.toFixed(2)}</span>
                    </div>
                  ))}
                  {currentItems.length > 5 && <p className="text-[10px] text-muted-foreground">... y {currentItems.length - 5} más</p>}
                </div>
              )}
            </div>
          )}

          {/* Print Button */}
          <button onClick={printInvoice} disabled={!selectedEntity || currentItems.length === 0}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            <Printer className="w-4 h-4" /> Generar e Imprimir Factura
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminInvoiceHub;
