
import { useState, useEffect, useRef, useCallback } from "react";
import { useClinicalHistory, TRIAGE_QUESTIONS, CONDITIONS, type ClinicalHistory } from "@/hooks/useClinicalHistory";
import { type Patient } from "@/hooks/useClinicData";
import { toast } from "sonner";
import { Save, Lock, FileText, Heart, AlertTriangle, ClipboardList, PenTool, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  patient: Patient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = (): Omit<ClinicalHistory, "id" | "patientId"> => ({
  birthDate: "", age: 0, sex: "", occupation: "", address: "",
  emergencyContactName: "", emergencyContactPhone: "",
  medicalTriage: {}, conditionsMatrix: {},
  painDescription: "", bleeding: "",
  sensitivityCold: false, sensitivityHeat: false, sensitivitySweet: false,
  followup1Date: "", followup1Notes: "",
  followup2Date: "", followup2Notes: "",
  followup3Date: "", followup3Notes: "",
  consentSignature: "", isLocked: false,
});

export default function ClinicalHistoryForm({ patient, open, onOpenChange }: Props) {
  const { history, isLoading, save } = useClinicalHistory(patient.id);
  const [form, setForm] = useState(emptyForm());
  const [signing, setSigning] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  // Load existing or auto-fill
  useEffect(() => {
    if (history) {
      const { id, patientId, ...rest } = history;
      setForm(rest);
    } else {
      setForm(emptyForm());
    }
  }, [history]);

  const isLocked = form.isLocked;

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    if (isLocked) return;
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleTriage = (key: string) => {
    if (isLocked) return;
    setForm(prev => ({ ...prev, medicalTriage: { ...prev.medicalTriage, [key]: !prev.medicalTriage[key] } }));
  };

  const toggleCondition = (key: string) => {
    if (isLocked) return;
    setForm(prev => ({ ...prev, conditionsMatrix: { ...prev.conditionsMatrix, [key]: !prev.conditionsMatrix[key] } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(patient.id, form);
      toast.success("Historia clínica guardada");
    } catch {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const handleLockAndSign = async () => {
    if (!form.consentSignature) {
      toast.error("Firma de consentimiento requerida");
      return;
    }
    setSaving(true);
    try {
      await save(patient.id, { ...form, isLocked: true });
      setForm(prev => ({ ...prev, isLocked: true }));
      toast.success("Historia clínica firmada y bloqueada");
    } catch {
      toast.error("Error al bloquear");
    }
    setSaving(false);
  };

  // Signature pad
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#2C2F2D";
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const stopDrawing = useCallback(() => {
    drawingRef.current = false;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setForm(prev => ({ ...prev, consentSignature: dataUrl }));
    setSigning(false);
    toast.success("Firma capturada");
  };

  const hasRiskConditions = CONDITIONS.some(c => form.conditionsMatrix[c.key]);
  const hasAllergies = form.medicalTriage["allergies"];

  const inputCls = `w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-accent focus:outline-none ${isLocked ? "opacity-60 pointer-events-none" : ""}`;
  const sectionCls = "space-y-3 p-4 bg-card rounded-xl border border-border";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-accent/30 max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-accent flex items-center gap-2">
            <FileText className="w-5 h-5" /> Historia Odontológica — {patient.name}
            {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
            {(hasRiskConditions || hasAllergies) && (
              <span className="ml-2 flex items-center gap-1 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Alerta Médica
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Cargando...</p>
        ) : (
          <div className="space-y-5">
            {/* Section 1: Auto-filled patient data */}
            <div className={sectionCls}>
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-accent" /> Datos del Paciente
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Nombre</label>
                  <input className={inputCls} value={patient.name} disabled />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Cédula</label>
                  <input className={inputCls} value={patient.cedula} disabled />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Teléfono</label>
                  <input className={inputCls} value={patient.phone} disabled />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Email</label>
                  <input className={inputCls} value={patient.email || "—"} disabled />
                </div>
              </div>
            </div>

            {/* Section 2: Additional data */}
            <div className={sectionCls}>
              <h3 className="font-display font-semibold text-sm">Datos Adicionales</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Fecha de Nacimiento</label>
                  <input type="date" className={inputCls} value={form.birthDate} onChange={e => updateField("birthDate", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Edad</label>
                  <input type="number" className={inputCls} value={form.age || ""} onChange={e => updateField("age", parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Sexo</label>
                  <select className={inputCls} value={form.sex} onChange={e => updateField("sex", e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Ocupación</label>
                  <input className={inputCls} value={form.occupation} onChange={e => updateField("occupation", e.target.value)} maxLength={100} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Dirección</label>
                  <input className={inputCls} value={form.address} onChange={e => updateField("address", e.target.value)} maxLength={200} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Contacto Emergencia</label>
                  <input className={inputCls} placeholder="Nombre" value={form.emergencyContactName} onChange={e => updateField("emergencyContactName", e.target.value)} maxLength={100} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Tel. Emergencia</label>
                  <input className={inputCls} placeholder="Teléfono" value={form.emergencyContactPhone} onChange={e => updateField("emergencyContactPhone", e.target.value)} maxLength={20} />
                </div>
              </div>
            </div>

            {/* Section 3: Medical Triage */}
            <div className={sectionCls}>
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-destructive" /> Triaje Médico
              </h3>
              <div className="space-y-2">
                {TRIAGE_QUESTIONS.map(q => (
                  <div key={q.key} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm">{q.label}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTriage(q.key)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          form.medicalTriage[q.key] ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                        }`}
                        disabled={isLocked}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!isLocked) setForm(prev => ({ ...prev, medicalTriage: { ...prev.medicalTriage, [q.key]: false } })); }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          form.medicalTriage[q.key] === false || form.medicalTriage[q.key] === undefined
                            ? (!form.medicalTriage[q.key] && form.medicalTriage[q.key] !== undefined ? "bg-clinic-green text-clinic-green-foreground" : "bg-muted text-muted-foreground")
                            : "bg-muted text-muted-foreground"
                        }`}
                        disabled={isLocked}
                      >
                        No
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Conditions Matrix */}
            <div className={sectionCls}>
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-accent" /> Condiciones Médicas
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CONDITIONS.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleCondition(c.key)}
                    disabled={isLocked}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left ${
                      form.conditionsMatrix[c.key]
                        ? "bg-destructive/15 border-destructive text-destructive font-semibold"
                        : "bg-muted border-border text-muted-foreground hover:border-accent/50"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 5: Clinical Evaluation */}
            <div className={sectionCls}>
              <h3 className="font-display font-semibold text-sm">Evaluación Clínica</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Descripción del Dolor</label>
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.painDescription} onChange={e => updateField("painDescription", e.target.value)} maxLength={500} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Sangrado</label>
                  <input className={inputCls} value={form.bleeding} onChange={e => updateField("bleeding", e.target.value)} maxLength={200} />
                </div>
                <div className="flex gap-4 flex-wrap">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.sensitivityCold} onChange={e => updateField("sensitivityCold", e.target.checked)} disabled={isLocked} className="accent-accent" />
                    Sensibilidad al frío
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.sensitivityHeat} onChange={e => updateField("sensitivityHeat", e.target.checked)} disabled={isLocked} className="accent-accent" />
                    Sensibilidad al calor
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.sensitivitySweet} onChange={e => updateField("sensitivitySweet", e.target.checked)} disabled={isLocked} className="accent-accent" />
                    Sensibilidad al dulce
                  </label>
                </div>
              </div>
            </div>

            {/* Section 6: Follow-ups */}
            <div className={sectionCls}>
              <h3 className="font-display font-semibold text-sm">Seguimiento</h3>
              {[1, 2, 3].map(n => (
                <div key={n} className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Seguimiento {n} — Fecha</label>
                    <input type="date" className={inputCls} value={(form as any)[`followup${n}Date`]} onChange={e => updateField(`followup${n}Date` as any, e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">Notas</label>
                    <input className={inputCls} value={(form as any)[`followup${n}Notes`]} onChange={e => updateField(`followup${n}Notes` as any, e.target.value)} maxLength={300} />
                  </div>
                </div>
              ))}
            </div>

            {/* Section 7: Consent */}
            <div className={sectionCls}>
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <PenTool className="w-4 h-4 text-accent" /> Consentimiento Informado
              </h3>
              <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                Yo, <span className="font-semibold text-foreground">{patient.name}</span>, autorizo a la Clínica Odontológica Salud Oriente y a su equipo médico a realizar los procedimientos diagnósticos y terapéuticos que sean necesarios para mi tratamiento odontológico. Declaro que la información proporcionada en esta historia clínica es veraz y completa. He sido informado(a) de los riesgos, beneficios y alternativas de los procedimientos a realizar.
              </div>

              {form.consentSignature ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Firma registrada:</p>
                  <img src={form.consentSignature} alt="Firma" className="h-20 border border-border rounded-lg bg-white p-1" />
                  {!isLocked && (
                    <button onClick={() => setSigning(true)} className="text-xs text-accent hover:underline">Cambiar firma</button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setSigning(true)}
                  disabled={isLocked}
                  className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                >
                  <PenTool className="w-4 h-4" /> Firmar
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {!isLocked && (
                <>
                  <button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                    <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar Borrador"}
                  </button>
                  <button onClick={handleLockAndSign} disabled={saving || !form.consentSignature} className="bg-foreground text-background px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
                    <Lock className="w-4 h-4" /> Firmar y Bloquear
                  </button>
                </>
              )}
              {isLocked && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Documento firmado y bloqueado — Solo lectura
                </p>
              )}
            </div>
          </div>
        )}

        {/* Signature Modal */}
        {signing && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl p-5 w-full max-w-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm">Firma Digital del Paciente</h3>
                <button onClick={() => setSigning(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <canvas
                ref={canvasRef}
                width={450}
                height={200}
                className="w-full border border-border rounded-lg bg-white cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <div className="flex gap-2">
                <button onClick={saveSignature} className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold">Aceptar</button>
                <button onClick={clearCanvas} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm">Limpiar</button>
                <button onClick={() => setSigning(false)} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
