
import { useState } from "react";
import { useClinicData } from "@/hooks/useClinicData";
import { Settings, Save, Stethoscope, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AdminSettings = () => {
  const { tasaBCV, setTasaBCV, treatments, updateTreatment } = useClinicData();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    if (newPassword !== confirmPassword) { toast.error("Las contraseñas no coinciden"); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contraseña actualizada exitosamente");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Settings className="w-6 h-6 text-gold" /> Configuración
      </h2>

      {/* BCV Rate */}
      <div className="bg-card rounded-xl p-5 gold-border space-y-3">
        <h3 className="font-semibold">Tasa BCV (USD → VES)</h3>
        <div className="flex items-center gap-3">
          <input
            type="number"
            step="0.01"
            className="bg-muted rounded-lg px-3 py-2 text-sm border border-border w-32"
            value={tasaBCV}
            onChange={(e) => setTasaBCV(parseFloat(e.target.value) || 0)}
          />
          <span className="text-sm text-muted-foreground">1 USD = {tasaBCV} VES</span>
        </div>
      </div>

      {/* Treatment Prices */}
      <div className="bg-card rounded-xl p-5 gold-border space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-gold" /> Precios de Servicios (USD)
        </h3>
        <div className="space-y-2">
          {[...treatments]
            .sort((a, b) => {
              if (a.name === "Otros") return 1;
              if (b.name === "Otros") return -1;
              return a.name.localeCompare(b.name, "es");
            })
            .map((t) => (
              <TreatmentPriceRow key={t.name} treatment={t} onUpdate={updateTreatment} />
            ))}
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-card rounded-xl p-5 gold-border space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Lock className="w-4 h-4 text-gold" /> Cambiar Contraseña
        </h3>
        <div className="space-y-2">
          <input
            type="password"
            placeholder="Nueva contraseña"
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
          />
          <button
            onClick={handleChangePassword}
            disabled={changingPw}
            className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {changingPw ? "Actualizando..." : "Actualizar Contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
};

const TreatmentPriceRow = ({ treatment, onUpdate }: { treatment: { name: string; priceUSD: number }; onUpdate: (name: string, price: number) => Promise<void> }) => {
  const [price, setPrice] = useState(treatment.priceUSD.toString());

  const handleSave = async () => {
    const val = parseFloat(price) || 0;
    await onUpdate(treatment.name, val);
    toast.success(`Precio de ${treatment.name} actualizado a $${val.toFixed(2)}`);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm flex-1 min-w-[120px]">{treatment.name}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          className="bg-muted rounded-lg px-3 py-2 text-sm border border-border w-24 text-center"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={treatment.name === "Otros"}
        />
        <button
          onClick={handleSave}
          className="bg-gold text-gold-foreground px-3 py-2 rounded-lg text-xs font-semibold"
          disabled={treatment.name === "Otros"}
        >
          <Save className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
