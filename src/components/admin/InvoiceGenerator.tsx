import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Printer } from "lucide-react";
import type { Appointment, Doctor, FinanceRecord } from "@/hooks/useClinicData";

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
  email: "contacto@saludoriente.com",
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

  const amountVES = finance.treatmentPriceUSD * tasaBCV;

  const handlePrint = () => {
    localStorage.setItem("coso-invoice-counter", invoiceNumber.toString());
    setInvoiceNumber(prev => prev + 1);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Factura #${invoiceNumber.toString().padStart(6, "0")}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #435A53; padding-bottom: 20px; margin-bottom: 30px; }
        .clinic-name { font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: bold; color: #1a1a1a; }
        .clinic-info { font-size: 11px; color: #666; margin-top: 4px; line-height: 1.6; }
        .invoice-title { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; color: #435A53; text-align: right; }
        .invoice-number { font-size: 14px; color: #666; text-align: right; margin-top: 4px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 12px; font-weight: 600; color: #435A53; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .info-item { font-size: 13px; }
        .info-label { color: #888; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #2C2F2D; color: #435A53; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
        .totals { text-align: right; margin-top: 20px; }
        .total-row { display: flex; justify-content: flex-end; gap: 40px; padding: 6px 0; font-size: 14px; }
        .total-row.grand { font-size: 18px; font-weight: bold; color: #435A53; border-top: 2px solid #2C2F2D; padding-top: 12px; margin-top: 8px; }
        .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        @media print { body { padding: 20px; } }
      </style></head>
      <body>
        <div class="header">
          <div>
            <div class="clinic-name">🦷 ${CLINIC_INFO.name}</div>
            <div class="clinic-info">
              RIF: ${CLINIC_INFO.rif}<br>
              ${CLINIC_INFO.address}<br>
              Tel: ${CLINIC_INFO.phone} • ${CLINIC_INFO.email}
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
            <thead><tr><th>Servicio</th><th>Doctor</th><th>Fecha</th><th style="text-align:right">Monto USD</th><th style="text-align:right">Monto VES</th></tr></thead>
            <tbody>
              <tr>
                <td>${appointment.treatment}</td>
                <td>${doctor?.name || "—"}</td>
                <td>${formattedDate}</td>
                <td style="text-align:right">$${finance.treatmentPriceUSD.toFixed(2)}</td>
                <td style="text-align:right">Bs. ${amountVES.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="total-row"><span>Tasa BCV:</span><span>${tasaBCV.toFixed(2)} Bs/$</span></div>
          <div class="total-row grand"><span>TOTAL:</span><span>$${finance.treatmentPriceUSD.toFixed(2)} / Bs. ${amountVES.toFixed(2)}</span></div>
        </div>

        <div class="footer">
          ${CLINIC_INFO.name} • ${CLINIC_INFO.address} • Tel: ${CLINIC_INFO.phone}<br>
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
              <span>Total USD</span>
              <span className="font-bold text-primary">${finance.treatmentPriceUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span>Total VES</span>
              <span className="font-semibold">Bs. {amountVES.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tasa BCV: {tasaBCV.toFixed(2)}</p>
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
