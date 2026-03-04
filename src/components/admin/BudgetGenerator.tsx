import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, MessageCircle, Mail, Lock } from "lucide-react";
import type { Doctor, Patient, Treatment } from "@/hooks/useClinicData";

interface BudgetGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctors: Doctor[];
  patients: Patient[];
  treatments: Treatment[];
  tasaBCV: number;
  currentDoctor?: Doctor;
}

const CLINIC_INFO = {
  name: "Clínica Odontológica Salud Oriente",
  rif: "J-50800151-6",
  address: "C.C Novocentro piso 1, local 1-02, Puerto La Cruz 6023, Anzoátegui",
  phone: "0422-7180013",
};

interface BudgetItem {
  treatment: string;
  priceUSD: number;
  qty: number;
}

const BudgetGenerator = ({ open, onOpenChange, doctors, patients, treatments, tasaBCV, currentDoctor }: BudgetGeneratorProps) => {
  const [form, setForm] = useState({
    doctorId: currentDoctor?.id || "",
    patientId: "",
    patientName: "",
    patientCedula: "",
    patientPhone: "",
    notes: "",
  });
  const [items, setItems] = useState<BudgetItem[]>([{ treatment: "", priceUSD: 0, qty: 1 }]);
  const [signed, setSigned] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [patientSignature, setPatientSignature] = useState<string | null>(null);

  const selectedDoctor = currentDoctor || doctors.find(d => d.id === form.doctorId);

  const handlePatientSelect = (patientId: string) => {
    const p = patients.find(pt => pt.id === patientId);
    if (p) setForm(prev => ({ ...prev, patientId, patientName: p.name, patientCedula: p.cedula, patientPhone: p.phone }));
  };

  const addItem = () => setItems(prev => [...prev, { treatment: "", priceUSD: 0, qty: 1 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: keyof BudgetItem, val: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      if (key === "treatment") {
        const t = treatments.find(tr => tr.name === val);
        return { ...item, treatment: val, priceUSD: t?.priceUSD || item.priceUSD };
      }
      return { ...item, [key]: val };
    }));
  };

  const totalUSD = items.reduce((s, i) => s + i.priceUSD * i.qty, 0);
  const totalVES = totalUSD * tasaBCV;

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setPatientSignature(null);
    setSigned(false);
  };

  const confirmSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPatientSignature(canvas.toDataURL("image/png"));
    setSigned(true);
  };

  const generateAndPrint = () => {
    if (!selectedDoctor) return;
    if (!selectedDoctor.signatureImg) {
      alert("Por favor, cargue su firma digital en su perfil antes de generar documentos.");
      return;
    }
    const today = new Date().toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" });
    const w = window.open("", "_blank");
    if (!w) return;

    const itemsHTML = items.map(i => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${i.treatment}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${i.qty}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">Bs. ${(i.priceUSD * i.qty * tasaBCV).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join("");

    w.document.write(`<!DOCTYPE html><html><head><title>Presupuesto</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Inter',Arial,sans-serif;padding:40px;color:#1a1a1a;max-width:800px;margin:0 auto}
      .header{display:flex;justify-content:space-between;border-bottom:3px solid #435A53;padding-bottom:20px;margin-bottom:24px}
      .clinic-name{font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:bold}
      .clinic-info{font-size:11px;color:#666;margin-top:4px;line-height:1.6}
      .title{font-family:'Playfair Display',Georgia,serif;font-size:26px;color:#435A53;text-align:center;margin-bottom:24px}
      .date{text-align:right;font-size:13px;color:#666;margin-bottom:16px}
      .doctor-info{background:#f5f5f0;padding:16px;border-radius:8px;margin-bottom:20px}
      .doctor-name{font-size:16px;font-weight:bold}
      .doctor-details{font-size:12px;color:#666;margin-top:4px}
      .patient-info{margin-bottom:20px;font-size:13px}
      .patient-info span{color:#888}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{background:#f5f5f0;padding:10px 8px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#888}
      .total-row{font-weight:bold;font-size:16px;border-top:2px solid #435A53}
      .total-row td{padding:12px 8px}
      .contract{background:#f9f9f5;border:1px solid #eee;border-radius:8px;padding:16px;margin:24px 0;font-size:12px;line-height:1.6}
      .signatures{display:flex;justify-content:space-between;margin-top:60px;gap:40px}
      .sig-block{text-align:center;flex:1}
      .sig-line{border-top:1px solid #1a1a1a;padding-top:8px;font-size:12px}
      .sig-img{max-height:60px;margin-bottom:8px}
      .seal-img{max-height:70px;margin-top:4px;opacity:0.8}
      .footer{margin-top:40px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:16px}
      @media print{body{padding:20px}}
    </style></head>
    <body>
      <div class="header">
        <div>
          <div class="clinic-name">🦷 ${CLINIC_INFO.name}</div>
          <div class="clinic-info">RIF: ${CLINIC_INFO.rif}<br>${CLINIC_INFO.address}<br>Tel: ${CLINIC_INFO.phone}</div>
        </div>
      </div>
      <div class="title">PRESUPUESTO ODONTOLÓGICO</div>
      <div class="date">Puerto La Cruz, ${today}</div>
      <div class="doctor-info">
        <div class="doctor-name">Dr(a). ${selectedDoctor.name}</div>
        <div class="doctor-details">${selectedDoctor.specialty}${selectedDoctor.cov ? ` • COV: ${selectedDoctor.cov}` : ''}<br>Email: ${selectedDoctor.email}${selectedDoctor.phone ? ` • Tel: ${selectedDoctor.phone}` : ''}</div>
      </div>
      <div class="patient-info">
        <p><span>Paciente:</span> <strong>${form.patientName || "—"}</strong></p>
        <p><span>Cédula:</span> ${form.patientCedula || "—"}</p>
      </div>
      <table>
        <thead><tr><th>Tratamiento</th><th style="text-align:center">Cant.</th><th style="text-align:right">Monto (Bs.)</th></tr></thead>
        <tbody>
          ${itemsHTML}
          <tr class="total-row">
            <td colspan="2">TOTAL</td>
            <td style="text-align:right">Bs. ${totalVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
      ${form.notes ? `<p style="font-size:12px;color:#666;margin-bottom:16px"><strong>Observaciones:</strong> ${form.notes}</p>` : ""}
      <div class="contract">
        <strong>CLÁUSULA DE ACEPTACIÓN</strong><br><br>
        Yo, <strong>${form.patientName || "________________"}</strong>, portador(a) de la C.I. <strong>${form.patientCedula || "________________"}</strong>, acepto los montos expresados en Bolívares (VES) y el plan de tratamiento descrito en el presente presupuesto. Entiendo que los valores pueden estar sujetos a ajustes según la tasa del BCV vigente al momento de cada pago.
      </div>
      <div class="signatures">
        <div class="sig-block">
          ${patientSignature ? `<img src="${patientSignature}" class="sig-img" alt="Firma Paciente"/>` : '<div style="height:60px"></div>'}
          <div class="sig-line">${form.patientName || "Paciente"}<br><span style="font-size:10px;color:#888">C.I. ${form.patientCedula || ""}</span></div>
        </div>
        <div class="sig-block">
          ${selectedDoctor.signatureImg ? `<img src="${selectedDoctor.signatureImg}" class="sig-img" alt="Firma Doctor"/>` : '<div style="height:60px"></div>'}
          ${selectedDoctor.sealImg ? `<img src="${selectedDoctor.sealImg}" class="seal-img" alt="Sello"/>` : ''}
          <div class="sig-line">Dr(a). ${selectedDoctor.name}<br><span style="font-size:10px;color:#888">${selectedDoctor.specialty}${selectedDoctor.cov ? ` — COV: ${selectedDoctor.cov}` : ''}</span></div>
        </div>
      </div>
      <div class="footer">${CLINIC_INFO.name} • RIF: ${CLINIC_INFO.rif} • ${CLINIC_INFO.address} • Tel: ${CLINIC_INFO.phone}</div>
      <script>window.onload = () => window.print();</script>
    </body></html>`);
    w.document.close();
  };

  const sendWhatsApp = () => {
    if (!form.patientPhone) { alert("Ingrese teléfono del paciente"); return; }
    const phone = form.patientPhone.replace(/^0/, "58").replace(/\D/g, "");
    const text = encodeURIComponent(`Hola ${form.patientName}, adjuntamos su Presupuesto de Clínica Salud Oriente. El monto total es Bs. ${totalVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}. ¡Feliz día!`);
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Presupuesto Odontológico
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!currentDoctor && (
            <div>
              <label className="block text-xs font-medium mb-1">Doctor *</label>
              <select className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={form.doctorId} onChange={(e) => setForm(p => ({ ...p, doctorId: e.target.value }))}>
                <option value="">Seleccionar doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">Paciente</label>
            <select className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={form.patientId} onChange={(e) => handlePatientSelect(e.target.value)}>
              <option value="">Seleccionar paciente</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} — C.I. {p.cedula}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Nombre</label>
              <input className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border" value={form.patientName} onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Cédula</label>
              <input className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border" value={form.patientCedula} onChange={e => setForm(p => ({ ...p, patientCedula: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Teléfono (para WhatsApp)</label>
            <input className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border" value={form.patientPhone} onChange={e => setForm(p => ({ ...p, patientPhone: e.target.value }))} placeholder="04XX-XXXXXXX" />
          </div>

          {/* Treatment Items */}
          <div>
            <label className="block text-xs font-medium mb-2">Plan de Tratamiento</label>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <select className="flex-1 bg-muted rounded-lg px-2 py-2 text-xs border border-border" value={item.treatment} onChange={e => updateItem(i, "treatment", e.target.value)}>
                  <option value="">Tratamiento</option>
                  {treatments.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <input type="number" min="1" className="w-12 bg-muted rounded-lg px-2 py-2 text-xs border border-border text-center" value={item.qty} onChange={e => updateItem(i, "qty", parseInt(e.target.value) || 1)} />
                <span className="text-xs text-muted-foreground whitespace-nowrap w-24 text-right">Bs. {(item.priceUSD * item.qty * tasaBCV).toLocaleString("es-VE", { minimumFractionDigits: 0 })}</span>
                {items.length > 1 && <button onClick={() => removeItem(i)} className="text-destructive text-xs">✕</button>}
              </div>
            ))}
            <button onClick={addItem} className="text-xs text-primary hover:underline">+ Agregar tratamiento</button>
          </div>

          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total estimado</p>
            <p className="text-xl font-bold">Bs. {totalVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-muted-foreground">Tasa BCV: {tasaBCV} Bs/USD</p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Observaciones</label>
            <textarea className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border resize-none" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          {/* Signature Pad */}
          {!signed ? (
            <div>
              <label className="block text-xs font-medium mb-1">Firma del Paciente</label>
              <canvas ref={canvasRef} width={400} height={120}
                className="w-full border border-border rounded-lg bg-white cursor-crosshair touch-none"
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              <div className="flex gap-2 mt-1">
                <button onClick={clearSignature} className="text-xs text-muted-foreground hover:underline">Limpiar</button>
                <button onClick={confirmSignature} className="text-xs text-primary hover:underline font-semibold">Confirmar Firma</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-clinic-green">
              <Lock className="w-3 h-3" /> Presupuesto firmado — Bloqueado
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button onClick={generateAndPrint} disabled={!selectedDoctor || items.every(i => !i.treatment)}
              className="bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
              <Download className="w-4 h-4" /> Descargar
            </button>
            <button onClick={sendWhatsApp} disabled={!form.patientPhone}
              className="bg-clinic-green text-clinic-green-foreground py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            <button disabled
              className="bg-muted text-muted-foreground py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 opacity-50 text-sm cursor-not-allowed">
              <Mail className="w-4 h-4" /> Email
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetGenerator;
