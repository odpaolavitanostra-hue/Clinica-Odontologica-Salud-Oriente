import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Image, Stamp, Check } from "lucide-react";
import { toast } from "sonner";
import type { Doctor } from "@/hooks/useClinicData";

interface DoctorProfileEditorProps {
  doctor: Doctor;
  onUpdate: (id: string, data: Partial<Doctor>) => Promise<void>;
}

const DoctorProfileEditor = ({ doctor, onUpdate }: DoctorProfileEditorProps) => {
  const [uploading, setUploading] = useState<"signature" | "seal" | null>(null);

  const handleUpload = async (type: "signature" | "seal", file: File) => {
    setUploading(type);
    const path = `doctors/${doctor.id}/${type}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("patient-files").upload(path, file);
    if (error) {
      toast.error(`Error al subir ${type === "signature" ? "firma" : "sello"}`);
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("patient-files").getPublicUrl(path);
    await onUpdate(doctor.id, type === "signature" ? { signatureImg: urlData.publicUrl } : { sealImg: urlData.publicUrl });
    toast.success(`${type === "signature" ? "Firma" : "Sello"} actualizado(a)`);
    setUploading(null);
  };

  return (
    <div className="bg-card rounded-xl p-4 sm:p-5 gold-border space-y-4">
      <h3 className="font-display text-lg font-semibold flex items-center gap-2">
        <Image className="w-5 h-5 text-gold" /> Identidad Médica Digital
      </h3>
      <p className="text-xs text-muted-foreground">Cargue su firma digital y sello profesional para incluirlos automáticamente en recipes y presupuestos.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Signature */}
        <div className="space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1"><Upload className="w-3 h-3" /> Firma Digital</p>
          {doctor.signatureImg ? (
            <div className="border border-border rounded-lg p-2 bg-white">
              <img src={doctor.signatureImg} alt="Firma" className="max-h-16 mx-auto" />
              <p className="text-[10px] text-clinic-green text-center mt-1 flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Cargada</p>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">Sin firma</p>
            </div>
          )}
          <label className={`inline-flex items-center gap-1 text-xs text-gold cursor-pointer hover:underline ${uploading === "signature" ? "opacity-50" : ""}`}>
            <Upload className="w-3 h-3" /> {uploading === "signature" ? "Subiendo..." : "Subir firma"}
            <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={e => { if (e.target.files?.[0]) handleUpload("signature", e.target.files[0]); }} />
          </label>
        </div>

        {/* Seal */}
        <div className="space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1"><Stamp className="w-3 h-3" /> Sello Profesional</p>
          {doctor.sealImg ? (
            <div className="border border-border rounded-lg p-2 bg-white">
              <img src={doctor.sealImg} alt="Sello" className="max-h-16 mx-auto" />
              <p className="text-[10px] text-clinic-green text-center mt-1 flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Cargado</p>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">Sin sello</p>
            </div>
          )}
          <label className={`inline-flex items-center gap-1 text-xs text-gold cursor-pointer hover:underline ${uploading === "seal" ? "opacity-50" : ""}`}>
            <Upload className="w-3 h-3" /> {uploading === "seal" ? "Subiendo..." : "Subir sello"}
            <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={e => { if (e.target.files?.[0]) handleUpload("seal", e.target.files[0]); }} />
          </label>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfileEditor;
