import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Printer, MessageCircle, Mail } from "lucide-react";
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
      const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `${n < 0 ? '-' : ''}${formatted},${decimal}`;
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Factura #${invoiceNumber.toString().padStart(6, "0")}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #435A53; padding-bottom: 20px; margin-bottom: 24px; }
        .clinic-name { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: bold; }
        .clinic-info { font-size: 11px; color: #666; margin-top: 4px; line-height: 1.6; }
        .invoice-title { font-family: 'Playfair Display', Georgia, serif; font-size: 26px; color: #435A53; text-align: center; margin-bottom: 24px; }
        .invoice-number { text-align: right; font-size: 14px; color: #435A53; font-weight: bold; margin-bottom: 16px; }
        .date { text-align: right; font-size: 13px; color: #666; margin-bottom: 16px; }
        .patient-info { margin-bottom: 20px; font-size: 13px; }
        .patient-info span { color: #888; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f5f5f0; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
        td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
        .total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #435A53; }
        .total-row td { padding: 12px 8px; }
        .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
        .note { font-size: 10px; color: #888; font-style: italic; margin-top: 8px; }
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
        </div>

        <div class="invoice-title">FACTURA</div>
        <div class="invoice-number">Nº ${invoiceNumber.toString().padStart(6, "0")}</div>
        <div class="date">Fecha: ${formattedDate}</div>

        <div class="patient-info">
          <p><span>Paciente:</span> <strong>${appointment.patientName}</strong></p>
          <p><span>Cédula:</span> ${appointment.patientCedula || "—"}</p>
          <p><span>Doctor:</span> ${doctor?.name || "—"}</p>
        </div>

        <table>
          <thead><tr><th>Descripción</th><th style="text-align:right">Monto (Bs.)</th></tr></thead>
          <tbody>
            <tr><td>${appointment.treatment}</td><td style="text-align:right">Bs. ${fmtVES(amountVES)}</td></tr>
            <tr class="total-row"><td>TOTAL</td><td style="text-align:right">Bs. ${fmtVES(amountVES)}</td></tr>
          </tbody>
        </table>

        <p class="note">* Los montos en bolívares (Bs.) están calculados según la tasa BCV vigente para la fecha del tratamiento (${historicalRate.toFixed(2)} Bs/$).</p>

        <div class="footer">
          ${CLINIC_INFO.name} • RIF: ${CLINIC_INFO.rif} • ${CLINIC_INFO.address} • Tel: ${CLINIC_INFO.phone}<br>
          ${CLINIC_INFO.email}
        </div>

        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleWhatsApp = () => {
    if (!appointment.patientPhone) return;
    const phone = appointment.patientPhone.replace(/^0/, "58").replace(/\D/g, "");
    const text = encodeURIComponent(`Hola ${appointment.patientName}, adjuntamos su Factura Nº ${invoiceNumber.toString().padStart(6, "0")} de Clínica Salud Oriente por Bs. ${formatVES(amountVES)}. ¡Feliz día!`);
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  const handleEmail = () => {
    if (!appointment.patientEmail) return;
    const subject = encodeURIComponent(`Factura Nº ${invoiceNumber.toString().padStart(6, "0")} — Clínica Salud Oriente`);
    const body = encodeURIComponent(`Hola ${appointment.patientName}, adjuntamos su Factura Nº ${invoiceNumber.toString().padStart(6, "0")} de Clínica Salud Oriente por Bs. ${formatVES(amountVES)}. ¡Feliz día!`);
    window.open(`mailto:${appointment.patientEmail}?subject=${subject}&body=${body}`, "_blank");
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button onClick={handlePrint} className="bg-primary text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={handleWhatsApp} disabled={!appointment.patientPhone}
              className="bg-clinic-green text-clinic-green-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            <button onClick={handleEmail} disabled={!appointment.patientEmail}
              className="bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
              <Mail className="w-4 h-4" /> Email
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceGenerator;
