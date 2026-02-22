import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CalendarDays, Users, Package, DollarSign, Settings, LogOut, 
  Stethoscope, Menu, X, LayoutDashboard 
} from "lucide-react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminCalendar } from "@/components/admin/AdminCalendar";
import { AdminDoctors } from "@/components/admin/AdminDoctors";
import { AdminPatients } from "@/components/admin/AdminPatients";
import { AdminInventory } from "@/components/admin/AdminInventory";
import { AdminFinances } from "@/components/admin/AdminFinances";
import { AdminSettings } from "@/components/admin/AdminSettings";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "calendar", label: "Agenda", icon: CalendarDays },
  { id: "doctors", label: "Doctores", icon: Stethoscope },
  { id: "patients", label: "Pacientes", icon: Users },
  { id: "inventory", label: "Inventario", icon: Package },
  { id: "finances", label: "Finanzas", icon: DollarSign },
  { id: "settings", label: "Config", icon: Settings },
];

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("coso-auth") !== "admin") {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("coso-auth");
    navigate("/");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <AdminDashboard />;
      case "calendar": return <AdminCalendar />;
      case "doctors": return <AdminDoctors />;
      case "patients": return <AdminPatients />;
      case "inventory": return <AdminInventory />;
      case "finances": return <AdminFinances />;
      case "settings": return <AdminSettings />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Top bar */}
      <header className="noir-gradient sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-noir-foreground"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="font-display text-lg text-gold font-semibold">Admin COSO</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-noir-foreground/60 hover:text-gold transition-colors flex items-center gap-1 text-sm"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>

        {/* Desktop tabs */}
        <div className="hidden md:flex gap-1 px-4 pb-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gold text-gold-foreground"
                  : "text-noir-foreground/60 hover:text-noir-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-noir/95 pt-16">
          <div className="flex flex-col gap-2 p-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left text-base font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-gold text-gold-foreground"
                    : "text-noir-foreground/70 hover:text-noir-foreground"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {renderContent()}
      </main>
    </div>
  );
};

export default Admin;
