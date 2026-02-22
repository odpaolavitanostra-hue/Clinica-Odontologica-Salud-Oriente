import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, CalendarDays, DollarSign, Users } from "lucide-react";
import { useCosoStore } from "@/store/useCosoStore";

const DoctorPanel = () => {
  const navigate = useNavigate();
  const { appointments, doctors, finances, tasaBCV, patients } = useCosoStore();
  const [doctorId, setDoctorId] = useState("");

  useEffect(() => {
    const auth = sessionStorage.getItem("coso-auth");
    if (!auth?.startsWith("doctor:")) {
      navigate("/login");
      return;
    }
    setDoctorId(auth.split(":")[1]);
  }, [navigate]);

  const doctor = doctors.find((d) => d.id === doctorId);
  const myAppointments = appointments.filter((a) => a.doctorId === doctorId);
  const myFinances = finances.filter((f) => {
    const app = appointments.find((a) => a.id === f.appointmentId);
    return app?.doctorId === doctorId;
  });

  const totalEarnedUSD = myFinances.reduce((sum, f) => sum + f.doctorPayUSD, 0);
  const pendingCount = myAppointments.filter((a) => a.status === "pendiente").length;
  const completedCount = myAppointments.filter((a) => a.status === "completada").length;

  const handleLogout = () => {
    sessionStorage.removeItem("coso-auth");
    navigate("/");
  };

  if (!doctor) return null;

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="noir-gradient py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-gold font-semibold">{doctor.name}</h1>
            <p className="text-noir-foreground/50 text-sm">{doctor.specialty}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-noir-foreground/60 hover:text-gold transition-colors flex items-center gap-1 text-sm"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<CalendarDays className="w-5 h-5 text-gold" />} label="Pendientes" value={pendingCount.toString()} />
          <StatCard icon={<CalendarDays className="w-5 h-5 text-clinic-green" />} label="Completadas" value={completedCount.toString()} />
          <StatCard icon={<DollarSign className="w-5 h-5 text-gold" />} label="Ganado USD" value={`$${totalEarnedUSD.toFixed(2)}`} />
          <StatCard icon={<DollarSign className="w-5 h-5 text-gold" />} label="Ganado VES" value={`Bs. ${(totalEarnedUSD * tasaBCV).toFixed(2)}`} />
        </div>

        {/* Appointments */}
        <div>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-gold" /> Mi Agenda
          </h2>
          <div className="space-y-3">
            {myAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay citas registradas</p>
            ) : (
              myAppointments
                .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
                .map((app) => (
                  <div key={app.id} className="bg-card rounded-xl p-4 gold-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{app.patientName}</p>
                        <p className="text-sm text-muted-foreground">{app.treatment}</p>
                        <p className="text-sm text-muted-foreground">{app.date} • {app.time}</p>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          app.status === "pendiente"
                            ? "bg-gold/20 text-gold"
                            : app.status === "completada"
                            ? "bg-clinic-green/20 text-clinic-green"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-card rounded-xl p-4 gold-border text-center">
    <div className="flex justify-center mb-2">{icon}</div>
    <p className="text-lg font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default DoctorPanel;
