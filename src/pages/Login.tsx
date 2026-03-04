
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Completa todos los campos"); return; }
    if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }

    setLoading(true);
    try {
      await signIn(email, password);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        const isAdmin = roles?.some(r => r.role === "admin");
        if (isAdmin) { toast.success("Bienvenido, Administrador"); navigate("/admin"); }
        else { toast.success("Bienvenido, Doctor"); navigate("/doctor"); }
      }
    } catch (err: any) {
      toast.error(err.message || "Error de autenticación");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen noir-gradient flex items-center justify-center px-4 font-body">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-2 text-noir-foreground/60 hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>

        <h1 className="font-display text-3xl text-gold font-bold mb-2">Acceso</h1>
        <p className="text-noir-foreground/50 mb-8">Ingresa al panel de gestión</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-noir-foreground/70 text-sm mb-1">Email</label>
            <input type="email" className="w-full bg-noir-light text-noir-foreground rounded-lg px-4 py-3 text-sm border border-noir-light focus:border-primary focus:outline-none" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={100} placeholder="correo@clinica.com" />
          </div>
          <div>
            <label className="block text-noir-foreground/70 text-sm mb-1">Contraseña</label>
            <input type="password" className="w-full bg-noir-light text-noir-foreground rounded-lg px-4 py-3 text-sm border border-noir-light focus:border-primary focus:outline-none" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={50} />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-gold py-3 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? "Cargando..." : (<><LogIn className="w-4 h-4" />Ingresar</>)}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
