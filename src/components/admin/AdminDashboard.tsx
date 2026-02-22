import { useCosoStore } from "@/store/useCosoStore";
import { CalendarDays, Users, Package, DollarSign, TrendingUp, AlertTriangle, Clock, CheckCircle } from "lucide-react";

export const AdminDashboard = () => {
  const { appointments, patients, doctors, inventory, finances, tasaBCV } = useCosoStore();

  const today = new Date().toISOString().split("T")[0];
  const todayApps = appointments.filter((a) => a.date === today);
  const pendingApps = appointments.filter((a) => a.status === "pendiente");
  const completedApps = appointments.filter((a) => a.status === "completada");
  const lowStockItems = inventory.filter((i) => i.stock <= i.minStock);

  const totalRevenueUSD = finances.reduce((s, f) => s + f.treatmentPriceUSD, 0);
  const totalUtilityUSD = finances.reduce((s, f) => s + f.utilityUSD, 0);

  // Monthly revenue
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthFinances = finances.filter((f) => f.date.startsWith(currentMonth));
  const monthRevenueUSD = monthFinances.reduce((s, f) => s + f.treatmentPriceUSD, 0);
  const monthUtilityUSD = monthFinances.reduce((s, f) => s + f.utilityUSD, 0);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-gold" /> Dashboard
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<CalendarDays className="w-5 h-5" />} label="Citas Hoy" value={todayApps.length} accent />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Pendientes" value={pendingApps.length} />
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Completadas" value={completedApps.length} />
        <StatCard icon={<Users className="w-5 h-5" />} label="Pacientes" value={patients.length} />
      </div>

      {/* Finance overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 gold-border space-y-3">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gold" /> Finanzas del Mes
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Ingresos USD</p>
              <p className="text-xl font-bold text-gold">${monthRevenueUSD.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Utilidad USD</p>
              <p className="text-xl font-bold text-clinic-green">${monthUtilityUSD.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ingresos Bs.</p>
              <p className="text-lg font-semibold">Bs. {(monthRevenueUSD * tasaBCV).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Utilidad Bs.</p>
              <p className="text-lg font-semibold">Bs. {(monthUtilityUSD * tasaBCV).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 gold-border space-y-3">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold" /> Totales Históricos
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Ingresos Totales</p>
              <p className="text-xl font-bold text-gold">${totalRevenueUSD.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Utilidad Total</p>
              <p className="text-xl font-bold text-clinic-green">${totalUtilityUSD.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Citas</p>
              <p className="text-lg font-semibold">{appointments.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Doctores Activos</p>
              <p className="text-lg font-semibold">{doctors.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-card rounded-xl p-5 border border-gold/50 space-y-3">
          <h3 className="font-display font-semibold flex items-center gap-2 text-gold">
            <AlertTriangle className="w-5 h-5" /> Alertas de Stock Bajo
          </h3>
          <div className="space-y-2">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-muted rounded-lg px-4 py-2">
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-sm font-bold text-gold">{item.stock} / mín {item.minStock}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's appointments */}
      <div className="bg-card rounded-xl p-5 gold-border space-y-3">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-gold" /> Citas de Hoy
        </h3>
        {todayApps.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No hay citas programadas para hoy</p>
        ) : (
          <div className="space-y-2">
            {todayApps
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((app) => (
                <div key={app.id} className="flex items-center justify-between bg-muted rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{app.patientName}</p>
                    <p className="text-xs text-muted-foreground">{app.time} • {app.treatment} • {doctors.find((d) => d.id === app.doctorId)?.name}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      app.status === "pendiente" ? "bg-gold/20 text-gold"
                        : app.status === "completada" ? "bg-clinic-green/20 text-clinic-green"
                        : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Tasa BCV */}
      <div className="bg-muted rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground">Tasa BCV: <span className="font-bold text-gold">Bs. {tasaBCV.toFixed(2)} / USD</span></p>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) => (
  <div className={`bg-card rounded-xl p-4 gold-border ${accent ? "ring-1 ring-gold/30" : ""}`}>
    <div className="flex items-center gap-2 mb-2 text-gold">{icon}</div>
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);