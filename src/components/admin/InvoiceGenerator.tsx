import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Printer } from "lucide-react";
import type { Appointment, Doctor, FinanceRecord } from "@/hooks/useClinicData";
import { formatVES } from "@/lib/formatVES";

interface InvoiceGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  doctor: Doctor | null;
  finance: FinanceRecord | null;
  tasaBCV: number;
}

const CLINIC_INFO = {
  name: "Clínica Odontológica Salud Oriente",
  rif: "J-50800151-6",
  address: "C.C Novocentro piso 1, local 1-02, Puerto La Cruz 6023, Anzoátegui",
  phone: "0422-7180013",
  email: "clinicaodsaludoriente@gmail.com",
};

const InvoiceGenerator = ({ open, onOpenChange, appointment, doctor, finance, tasaBCV }: InvoiceGeneratorProps) => {
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    const saved = localStorage.getItem("coso-invoice-counter");
    return saved ? parseInt(saved) + 1 : 1;
  });

  if (!appointment || !finance) return null;

  const formattedDate = (() => {
    try {
      const [y, m, d] = appointment.date.split("-");
      return `${d}/${m}/${y}`;
    } catch { return appointment.date; }
  })();

  const historicalRate = finance.tasaBCV;
  const amountVES = finance.treatmentPriceUSD * historicalRate;

  const handlePrint = () => {
    localStorage.setItem("coso-invoice-counter", invoiceNumber.toString());
    setInvoiceNumber(prev => prev + 1);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const fmtVES = (n: number) => {
      const fixed = Math.abs(n).toFixed(2);
      const [integer, decimal] = fixed.split('.');
      const formatted = integer.replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');
      return `${n < 0 ? '-' : ''}${formatted},${decimal}`;
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Factura #${invoiceNumber.toString().padStart(6, "0")}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #435A53; padding-bottom: 20px; margin-bottom: 30px; }
        .clinic-name { font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: bold; color: #1a1a1a; }
        .clinic-info { font-size: 11px; color: #666; margin-top: 4px; line-height: 1.6; }
        .invoice-title { font-family: 'Playfair Display', Georgia, serif; font-size: 32px; font-weight: bold; color: #435A53; text-align: right; }
        .invoice-number { font-size: 16px; color: #444; text-align: right; margin-top: 6px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 12px; font-weight: 600; color: #435A53; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .info-item { font-size: 13px; }
        .info-label { color: #888; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f5f5f0; color: #435A53; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
        .totals { text-align: right; margin-top: 20px; }
        .total-row { display: flex; justify-content: flex-end; gap: 40px; padding: 6px 0; font-size: 14px; }
        .total-row.grand { font-size: 18px; font-weight: bold; color: #435A53; border-top: 2px solid #435A53; padding-top: 12px; margin-top: 8px; }
        .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        @media print { body { padding: 20px; } }
      </style></head>
      <body>
        <div class="header">
          <div style="display:flex;align-items:center;gap:16px;">
            <img src="/images/logo-green.png" alt="Logo" style="height:70px;object-fit:contain;" />
            <div>
              <div class="clinic-name">${CLINIC_INFO.name}</div>
              <div class="clinic-info">
                RIF: ${CLINIC_INFO.rif}<br>
                ${CLINIC_INFO.address}<br>
                Tel: ${CLINIC_INFO.phone} • ${CLINIC_INFO.email}
              </div>
            </div>
          </div>
          <div>
            <div class="invoice-title">FACTURA</div>
            <div class="invoice-number">Nº ${invoiceNumber.toString().padStart(6, "0")}<br>Fecha: ${formattedDate}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Datos del Paciente</div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Nombre:</span> ${appointment.patientName}</div>
            <div class="info-item"><span class="info-label">Cédula:</span> ${appointment.patientCedula || "—"}</div>
            <div class="info-item"><span class="info-label">Teléfono:</span> ${appointment.patientPhone}</div>
            <div class="info-item"><span class="info-label">Email:</span> ${appointment.patientEmail || "—"}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Detalles del Servicio</div>
          <table>
            <thead><tr><th>Servicio</th><th>Doctor</th><th>Fecha</th><th style="text-align:right">Monto (Bs.)</th></tr></thead>
            <tbody>
              <tr>
                <td>${appointment.treatment}</td>
                <td>${doctor?.name || "—"}</td>
                <td>${formattedDate}</td>
                <td style="text-align:right">Bs. ${fmtVES(amountVES)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="total-row"><span>Tasa BCV (${formattedDate}):</span><span>${historicalRate.toFixed(2)} Bs/$</span></div>
          <div class="total-row grand"><span>TOTAL:</span><span>Bs. ${fmtVES(amountVES)}</span></div>
        </div>

        <div style="margin-top:16px;font-size:11px;color:#666;font-style:italic;text-align:right;">
          * Los montos en bolívares (Bs.) están calculados según la tasa BCV vigente para la fecha del tratamiento.
        </div>

        <div class="footer">
          ${CLINIC_INFO.name} • RIF: ${CLINIC_INFO.rif} • ${CLINIC_INFO.address} • Tel: ${CLINIC_INFO.phone}<br>
          ${CLINIC_INFO.email}<br>
          Gracias por su preferencia
        </div>

        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Generar Factura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
            <p className="font-semibold">{CLINIC_INFO.name}</p>
            <p className="text-muted-foreground text-xs">{CLINIC_INFO.address}</p>
          </div>

          <div className="bg-card rounded-lg p-4 gold-border space-y-2 text-sm">
            <p><span className="text-muted-foreground">Paciente:</span> <strong>{appointment.patientName}</strong></p>
            <p><span className="text-muted-foreground">Cédula:</span> {appointment.patientCedula || "—"}</p>
            <p><span className="text-muted-foreground">Tratamiento:</span> {appointment.treatment}</p>
            <p><span className="text-muted-foreground">Doctor:</span> {doctor?.name || "—"}</p>
            <p><span className="text-muted-foreground">Fecha:</span> {formattedDate}</p>
          </div>

          <div className="bg-card rounded-lg p-4 gold-border">
            <div className="flex justify-between items-center text-sm">
              <span>Total VES</span>
              <span className="font-bold text-primary">Bs. {formatVES(amountVES)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tasa BCV ({formattedDate}): {historicalRate.toFixed(2)} Bs/$</p>
            <p className="text-[10px] text-muted-foreground italic mt-1">* Tasa BCV vigente para la fecha del tratamiento</p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium">Nº Factura:</label>
            <input type="number" className="w-28 bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={invoiceNumber} onChange={(e) => setInvoiceNumber(parseInt(e.target.value) || 1)} />
          </div>

          <button onClick={handlePrint} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <Printer className="w-4 h-4" /> Imprimir Factura
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceGenerator;
