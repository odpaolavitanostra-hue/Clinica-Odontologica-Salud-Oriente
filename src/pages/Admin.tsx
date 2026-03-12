import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CalendarDays, Users, Package, DollarSign, Settings, LogOut, 
  Stethoscope, Menu, X, LayoutDashboard, Building2, Bell, UserCheck 
} from "lucide-react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminCalendar } from "@/components/admin/AdminCalendar";
import { AdminDoctors } from "@/components/admin/AdminDoctors";
import { AdminPatients } from "@/components/admin/AdminPatients";
import { AdminInventory } from "@/components/admin/AdminInventory";
import { AdminFinances } from "@/components/admin/AdminFinances";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminTenants } from "@/components/admin/AdminTenants";
import { AdminLeads } from "@/components/admin/AdminLeads";
import { useAuth } from "@/hooks/useAuth";
import { useClinicData } from "@/hooks/useClinicData";
import logoWhite from "@/assets/logo-icon-white.png";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "calendar", label: "Agenda", icon: CalendarDays },
  { id: "patients", label: "Pacientes", icon: Users },
  { id: "rentals", label: "Alquileres", icon: Building2 },
  { id: "doctors", label: "Doctores", icon: Stethoscope },
  { id: "inventory", label: "Inventario", icon: Package },
  { id: "leads", label: "Prospectos", icon: UserCheck },
  { id: "finances", label: "Finanzas", icon: DollarSign },
  { id: "settings", label: "Config", icon: Settings },
];

interface Notification {
  id: string;
  type: "appointment" | "patient" | "tenant";
  message: string;
  tab: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { appointments, patients, tenants, rentalRequests } = useClinicData();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const prevCounts = useRef<{ appointments: number; patients: number; pendingRentals: number }>({
    appointments: 0, patients: 0, pendingRentals: 0,
  });
  const initialized = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    const currentAppCount = appointments.length;
    const currentPatientCount = patients.length;
    const currentPendingRentals = rentalRequests.filter(r => r.status === 'pending_review').length;

    if (!initialized.current) {
      prevCounts.current = { appointments: currentAppCount, patients: currentPatientCount, pendingRentals: currentPendingRentals };
      initialized.current = true;
      return;
    }

    const newNotifs: Notification[] = [];

    if (currentAppCount > prevCounts.current.appointments) {
      const diff = currentAppCount - prevCounts.current.appointments;
      newNotifs.push({ id: `app-${Date.now()}`, type: "appointment", message: `📅 ${diff} nueva(s) cita(s) agendada(s)`, tab: "calendar" });
    }

    if (currentPatientCount > prevCounts.current.patients) {
      const diff = currentPatientCount - prevCounts.current.patients;
      newNotifs.push({ id: `pat-${Date.now()}`, type: "patient", message: `👤 ${diff} nuevo(s) paciente(s) registrado(s)`, tab: "patients" });
    }

    if (currentPendingRentals > prevCounts.current.pendingRentals) {
      const diff = currentPendingRentals - prevCounts.current.pendingRentals;
      newNotifs.push({ id: `ten-${Date.now()}`, type: "tenant", message: `🏢 ${diff} nueva(s) solicitud(es) de alquiler`, tab: "rentals" });
    }

    if (newNotifs.length > 0) {
      setNotifications(prev => [...newNotifs, ...prev]);
    }

    prevCounts.current = { appointments: currentAppCount, patients: currentPatientCount, pendingRentals: currentPendingRentals };
  }, [appointments.length, patients.length, rentalRequests]);

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const handleNotificationClick = (notif: Notification) => {
    setActiveTab(notif.tab);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    setShowNotifications(false);
  };

  const clearNotifications = () => { setNotifications([]); setShowNotifications(false); };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>;
  if (!user) return null;

  const pendingRentalCount = rentalRequests.filter(r => r.status === 'pending_review').length;

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <AdminDashboard onNavigate={setActiveTab} />;
      case "leads": return <AdminLeads />;
      case "calendar": return <AdminCalendar />;
      case "doctors": return <AdminDoctors />;
      case "patients": return <AdminPatients />;
      case "rentals": return <AdminTenants />;
      case "inventory": return <AdminInventory />;
      case "finances": return <AdminFinances />;
      case "settings": return <AdminSettings />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="noir-gradient sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-noir-foreground" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <img src={logoWhite} alt="Salud Oriente" className="h-8 object-contain" />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative text-noir-foreground/60 hover:text-primary transition-colors">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse font-bold">{notifications.length}</span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                    <span className="text-xs font-semibold">Notificaciones</span>
                    {notifications.length > 0 && (
                      <button onClick={clearNotifications} className="text-xs text-muted-foreground hover:text-destructive">Limpiar</button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Sin notificaciones nuevas</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.map((notif) => (
                        <button key={notif.id} onClick={() => handleNotificationClick(notif)} className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border/50 last:border-0">
                          {notif.message}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={handleLogout} className="text-noir-foreground/60 hover:text-primary transition-colors flex items-center gap-1 text-sm">
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>

        <div className="hidden md:flex gap-1 px-4 pb-2 overflow-x-auto">
          {tabs.map((tab) => {
            const rentalBadge = tab.id === "rentals" && pendingRentalCount > 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-gold text-gold-foreground"
                    : "text-noir-foreground/60 hover:text-noir-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {rentalBadge && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{pendingRentalCount}</span>}
              </button>
            );
          })}
        </div>
      </header>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-noir/95 pt-16">
          <div className="flex flex-col gap-2 p-4">
            {tabs.map((tab) => {
              const rentalBadge = tab.id === "rentals" && pendingRentalCount > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded text-left text-base font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-gold text-gold-foreground"
                      : "text-noir-foreground/70 hover:text-noir-foreground"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                  {rentalBadge && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">{pendingRentalCount}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div key={activeTab} className="module-enter">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Admin;
