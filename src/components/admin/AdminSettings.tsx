import { useState } from "react";
import { useClinicData } from "@/hooks/useClinicData";
import { Settings, Save, Stethoscope, Lock, Plus, Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AdminSettings = () => {
  const { tasaBCV, setTasaBCV, treatments, updateTreatment } = useClinicData();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [newTreatmentName, setNewTreatmentName] = useState("");
  const [newTreatmentPrice, setNewTreatmentPrice] = useState("");

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

  const handleAddTreatment = async () => {
    const name = newTreatmentName.trim();
    if (!name) { toast.error("Ingresa el nombre del servicio"); return; }
    if (treatments.some(t => t.name.toLowerCase() === name.toLowerCase())) { toast.error("Este servicio ya existe"); return; }
    const price = parseFloat(newTreatmentPrice) || 0;
    const { error } = await supabase.from("treatments").insert({ name, price_usd: price });
    if (error) { toast.error("Error al agregar servicio"); return; }
    toast.success(`Servicio "${name}" agregado`);
    setNewTreatmentName("");
    setNewTreatmentPrice("");
    // Invalidate will happen through useClinicData refetch
    window.location.reload();
  };

  const handleDeleteTreatment = async (id: string, name: string) => {
    if (name === "Otros") { toast.error("No se puede eliminar 'Otros'"); return; }
    if (!confirm(`¿Eliminar el servicio "${name}"?`)) return;
    const { error } = await supabase.from("treatments").delete().eq("id", id);
    if (error) { toast.error("Error al eliminar"); return; }
    toast.success(`Servicio "${name}" eliminado`);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Settings className="w-6 h-6 text-accent" /> Configuración
      </h2>

      <div className="bg-card rounded-xl p-5 gold-border space-y-3">
        <h3 className="font-semibold">Tasa BCV (USD → VES)</h3>
        <div className="flex items-center gap-3">
          <input type="number" step="0.001" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border w-40" value={tasaBCV} onChange={(e) => setTasaBCV(parseFloat(e.target.value) || 0)} />
          <span className="text-sm text-muted-foreground">1 USD = {tasaBCV} VES</span>
        </div>
      </div>

      <div className="bg-card rounded-xl p-5 gold-border space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-accent" /> Gestión de Servicios
        </h3>

        {/* Add new treatment */}
        <div className="bg-muted rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold">Agregar Nuevo Servicio</p>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-muted-foreground mb-1">Nombre</label>
              <input type="text" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={newTreatmentName} onChange={(e) => setNewTreatmentName(e.target.value)} placeholder="Ej: Ortodoncia" />
            </div>
            <div className="w-28">
              <label className="block text-xs text-muted-foreground mb-1">Precio USD</label>
              <input type="number" step="0.01" min="0" className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border" value={newTreatmentPrice} onChange={(e) => setNewTreatmentPrice(e.target.value)} placeholder="0.00" />
            </div>
            <button onClick={handleAddTreatment} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
        </div>

        {/* Existing treatments */}
        <div className="space-y-2">
          {[...treatments]
            .sort((a, b) => { if (a.name === "Otros") return 1; if (b.name === "Otros") return -1; return a.name.localeCompare(b.name, "es"); })
            .map((t) => (
              <TreatmentPriceRow key={t.id} treatment={t} onUpdate={updateTreatment} onDelete={() => handleDeleteTreatment(t.id, t.name)} />
            ))}
        </div>
      </div>

      <div className="bg-card rounded-xl p-5 gold-border space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Lock className="w-4 h-4 text-accent" /> Cambiar Contraseña
        </h3>
        <div className="space-y-2">
          <input type="password" placeholder="Nueva contraseña" className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
          <input type="password" placeholder="Confirmar contraseña" className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} />
          <button onClick={handleChangePassword} disabled={changingPw} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
            {changingPw ? "Actualizando..." : "Actualizar Contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
};

const TreatmentPriceRow = ({ treatment, onUpdate, onDelete }: { treatment: { id: string; name: string; priceUSD: number }; onUpdate: (name: string, price: number) => Promise<void>; onDelete: () => void }) => {
  const [price, setPrice] = useState(treatment.priceUSD.toString());
  const isOtros = treatment.name === "Otros";

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
        <input type="number" step="0.01" min="0" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border w-24 text-center" value={price} onChange={(e) => setPrice(e.target.value)} disabled={isOtros} />
        <button onClick={handleSave} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold" disabled={isOtros}>
          <Save className="w-3 h-3" />
        </button>
        {!isOtros && (
          <button onClick={onDelete} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
