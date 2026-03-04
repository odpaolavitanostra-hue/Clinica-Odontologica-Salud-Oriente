import { useClinicData } from "@/hooks/useClinicData";
import { CalendarDays, Users, Package, DollarSign, TrendingUp, AlertTriangle, Clock, CheckCircle, Building2, MessageCircle, Stethoscope } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatVES } from "@/lib/formatVES";

interface AdminDashboardProps {
  onNavigate?: (tab: string) => void;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--clinic-green))",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export const AdminDashboard = ({ onNavigate }: AdminDashboardProps) => {
  const { appointments, patients, doctors, inventory, finances, tasaBCV, rentalRequests, tenants } = useClinicData();

  const today = new Date().toISOString().split("T")[0];
  const todayApps = appointments.filter((a) => a.date === today);
  const pendingApps = appointments.filter((a) => a.status === "pendiente");
  const completedApps = appointments.filter((a) => a.status === "completada");
  const lowStockItems = inventory.filter((i) => i.stock <= i.minStock);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthFinances = finances.filter((f) => f.date.startsWith(currentMonth));
  const monthRevenueUSD = monthFinances.reduce((s, f) => s + f.treatmentPriceUSD, 0);
  const monthUtilityUSD = monthFinances.reduce((s, f) => s + f.utilityUSD, 0);
  const monthRevenueBs = monthFinances.reduce((s, f) => s + f.treatmentPriceUSD * f.tasaBCV, 0);
  const monthUtilityBs = monthFinances.reduce((s, f) => s + f.utilityUSD * f.tasaBCV, 0);

  const treatmentCounts: Record<string, number> = {};
  completedApps.forEach((a) => {
    treatmentCounts[a.treatment] = (treatmentCounts[a.treatment] || 0) + 1;
  });
  const totalRentals = tenants.reduce((sum, t) => sum + t.blockedSlots.filter(s => s.status === "approved").length, 0);
  if (totalRentals > 0) { treatmentCounts["Alquileres"] = totalRentals; }

  const pieData = Object.entries(treatmentCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const nav = (tab: string) => onNavigate?.(tab);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-accent" /> Dashboard
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<CalendarDays className="w-5 h-5" />} label="Citas Hoy" value={todayApps.length} accent onClick={() => nav("calendar")} />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Pendientes" value={pendingApps.length} onClick={() => nav("calendar")} />
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Completadas" value={completedApps.length} onClick={() => nav("calendar")} />
        <StatCard icon={<Users className="w-5 h-5" />} label="Pacientes" value={patients.length} onClick={() => nav("patients")} />
        {rentalRequests.length > 0 && (
          <StatCard icon={<Building2 className="w-5 h-5" />} label="Solicitudes Alquiler" value={rentalRequests.length} accent onClick={() => nav("rentals")} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 gold-border space-y-3 cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all" onClick={() => nav("finances")}>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent" /> Finanzas del Mes
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-muted-foreground">Ingresos USD</p><p className="text-xl font-bold text-gold">${monthRevenueUSD.toFixed(2)}</p></div>
            <div><p className="text-xs text-muted-foreground">Utilidad USD</p><p className="text-xl font-bold text-clinic-green">${monthUtilityUSD.toFixed(2)}</p></div>
            <div><p className="text-xs text-muted-foreground">Ingresos Bs.</p><p className="text-lg font-semibold">Bs. {formatVES(monthRevenueBs)}</p></div>
            <div><p className="text-xs text-muted-foreground">Utilidad Bs.</p><p className="text-lg font-semibold">Bs. {formatVES(monthUtilityBs)}</p></div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 gold-border space-y-3">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" /> Servicios Realizados
          </h3>
          {pieData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No hay servicios registrados aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name">
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Post-Operative Follow-up */}
      {(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split("T")[0];
        const invasive = ["Endodoncia", "Extracción", "Cirugía"];
        const postOpPatients = appointments.filter(
          a => a.date === yStr && a.status === "completada" && invasive.some(t => a.treatment.toLowerCase().includes(t.toLowerCase()))
        );
        if (postOpPatients.length === 0) return null;
        return (
          <div className="bg-card rounded-xl p-5 gold-border space-y-3">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-gold" /> Seguimiento Post-Operatorio (Ayer)
            </h3>
            <div className="space-y-2">
              {postOpPatients.map(app => (
                <div key={app.id} className="flex items-center justify-between bg-muted rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{app.patientName}</p>
                    <p className="text-xs text-muted-foreground">{app.treatment} • {app.date}</p>
                  </div>
                  <a
                    href={`https://wa.me/${(app.patientPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${app.patientName}, somos de Clínica Salud Oriente. ¿Cómo se siente después de su ${app.treatment}? ¡Su sonrisa merece lo mejor!`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-gold px-3 py-2 text-xs flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {lowStockItems.length > 0 && (
        <div className="bg-card rounded-xl p-5 border border-amber/50 space-y-3">
          <h3 className="font-display font-semibold flex items-center gap-2 text-amber"><AlertTriangle className="w-5 h-5" /> Alertas de Stock Bajo</h3>
          <div className="space-y-2">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-muted rounded-lg px-4 py-2">
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-sm font-bold text-amber">{item.stock} / mín {item.minStock}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl p-5 gold-border space-y-3">
        <h3 className="font-display font-semibold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-accent" /> Citas de Hoy</h3>
        {todayApps.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No hay citas programadas para hoy</p>
        ) : (
          <div className="space-y-2">
            {todayApps.sort((a, b) => a.time.localeCompare(b.time)).map((app) => (
              <div key={app.id} className="flex items-center justify-between bg-muted rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{app.patientName}</p>
                  <p className="text-xs text-muted-foreground">{app.time} • {app.treatment} • {doctors.find((d) => d.id === app.doctorId)?.name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${app.status === "pendiente" ? "bg-amber/20 text-amber" : app.status === "completada" ? "bg-clinic-green/20 text-clinic-green" : "bg-destructive/20 text-destructive"}`}>
                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-muted rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground">Tasa BCV: <span className="font-bold text-gold">Bs. {tasaBCV.toFixed(2)} / USD</span></p>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, accent, onClick }: { icon: React.ReactNode; label: string; value: number; accent?: boolean; onClick?: () => void }) => (
  <div className={`bg-card rounded-xl p-4 gold-border cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all ${accent ? "ring-1 ring-primary/30" : ""}`} onClick={onClick}>
    <div className="flex items-center gap-2 mb-2 text-accent">{icon}</div>
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);
