import { useState } from "react";
import { useCosoStore } from "@/store/useCosoStore";
import { Settings, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const AdminSettings = () => {
  const { adminPassword, setAdminPassword, doctors, updateDoctor, tasaBCV, setTasaBCV } = useCosoStore();
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleChangePassword = () => {
    if (newPass.length < 4) { toast.error("Mínimo 4 caracteres"); return; }
    if (newPass !== confirmPass) { toast.error("Las contraseñas no coinciden"); return; }
    setAdminPassword(newPass);
    setNewPass("");
    setConfirmPass("");
    toast.success("Contraseña de Admin actualizada");
  };

  const handleChangeDoctorPass = (id: string, pass: string) => {
    if (pass.length < 4) { toast.error("Mínimo 4 caracteres"); return; }
    updateDoctor(id, { pass });
    toast.success("Contraseña del doctor actualizada");
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

      {/* Admin Password */}
      <div className="bg-card rounded-xl p-5 gold-border space-y-3">
        <h3 className="font-semibold">Contraseña de Administrador</h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">Actual:</span>
          <span className="text-sm font-mono">{showPass ? adminPassword : "••••••"}</span>
          <button onClick={() => setShowPass(!showPass)} className="text-muted-foreground hover:text-foreground">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="password" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Nueva contraseña" value={newPass} onChange={(e) => setNewPass(e.target.value)} maxLength={50} />
          <input type="password" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Confirmar contraseña" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} maxLength={50} />
        </div>
        <button onClick={handleChangePassword} className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
          <Save className="w-4 h-4" /> Cambiar
        </button>
      </div>

      {/* Doctor Passwords */}
      <div className="bg-card rounded-xl p-5 gold-border space-y-3">
        <h3 className="font-semibold">Contraseñas de Doctores</h3>
        {doctors.map((d) => (
          <DoctorPassRow key={d.id} doctor={d} onSave={(pass) => handleChangeDoctorPass(d.id, pass)} />
        ))}
      </div>
    </div>
  );
};

const DoctorPassRow = ({ doctor, onSave }: { doctor: { id: string; name: string; pass: string }; onSave: (pass: string) => void }) => {
  const [pass, setPass] = useState("");
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm flex-1 min-w-0 truncate">{doctor.name}</span>
      <input type="password" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border w-40" placeholder="Nueva contraseña" value={pass} onChange={(e) => setPass(e.target.value)} maxLength={50} />
      <button onClick={() => { onSave(pass); setPass(""); }} className="bg-gold text-gold-foreground px-3 py-2 rounded-lg text-xs font-semibold">
        <Save className="w-3 h-3" />
      </button>
    </div>
  );
};
