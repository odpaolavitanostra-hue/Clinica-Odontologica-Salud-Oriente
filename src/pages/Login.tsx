import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Shield, Stethoscope } from "lucide-react";
import { useCosoStore } from "@/store/useCosoStore";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { adminPassword, doctors } = useCosoStore();
  const [mode, setMode] = useState<"admin" | "doctor">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "admin") {
      if (password === adminPassword) {
        sessionStorage.setItem("coso-auth", "admin");
        toast.success("Bienvenido, Administrador");
        navigate("/admin");
      } else {
        toast.error("Contraseña incorrecta");
      }
    } else {
      const doctor = doctors.find((d) => d.email === email && d.pass === password);
      if (doctor) {
        sessionStorage.setItem("coso-auth", `doctor:${doctor.id}`);
        toast.success(`Bienvenida, ${doctor.name}`);
        navigate("/doctor");
      } else {
        toast.error("Credenciales incorrectas");
      }
    }
  };

  return (
    <div className="min-h-screen noir-gradient flex items-center justify-center px-4 font-body">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-2 text-noir-foreground/60 hover:text-gold mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>

        <h1 className="font-display text-3xl text-gold font-bold mb-2">Acceso</h1>
        <p className="text-noir-foreground/50 mb-8">Ingresa al panel de gestión</p>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode("admin")}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
              mode === "admin"
                ? "bg-gold text-gold-foreground"
                : "bg-noir-light text-noir-foreground/50 hover:text-noir-foreground"
            }`}
          >
            <Shield className="w-4 h-4 inline mr-1" /> Admin
          </button>
          <button
            type="button"
            onClick={() => setMode("doctor")}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
              mode === "doctor"
                ? "bg-gold text-gold-foreground"
                : "bg-noir-light text-noir-foreground/50 hover:text-noir-foreground"
            }`}
          >
            <Stethoscope className="w-4 h-4 inline mr-1" /> Doctor
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "doctor" && (
            <div>
              <label className="block text-noir-foreground/70 text-sm mb-1">Email</label>
              <input
                type="email"
                className="w-full bg-noir-light text-noir-foreground rounded-lg px-4 py-3 text-sm border border-noir-light focus:border-gold focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={100}
              />
            </div>
          )}
          <div>
            <label className="block text-noir-foreground/70 text-sm mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full bg-noir-light text-noir-foreground rounded-lg px-4 py-3 text-sm border border-noir-light focus:border-gold focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={50}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gold text-gold-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
