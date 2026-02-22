import { useState } from "react";
import { useCosoStore, Appointment } from "@/store/useCosoStore";
import { CalendarDays, Check, X, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export const AdminCalendar = () => {
  const { appointments, doctors, updateAppointment, deleteAppointment, completeAppointment, inventory } = useCosoStore();
  const [filter, setFilter] = useState<string>("all");
  const [completing, setCompleting] = useState<string | null>(null);
  const [materials, setMaterials] = useState<{ itemId: string; qty: number }[]>([]);

  const filtered = appointments
    .filter((a) => filter === "all" || a.status === filter)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));

  const handleComplete = (id: string) => {
    completeAppointment(id, materials);

    // Check low stock alerts
    const store = useCosoStore.getState();
    store.inventory.forEach((item) => {
      if (item.stock <= item.minStock) {
        toast.warning(`⚠️ Stock bajo: ${item.name} (${item.stock} restantes)`);
      }
    });

    toast.success("Cita completada y finanzas registradas");
    setCompleting(null);
    setMaterials([]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-gold" /> Agenda
        </h2>
        <div className="flex gap-2 flex-wrap">
          {["all", "pendiente", "completada", "cancelada"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f ? "bg-gold text-gold-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No hay citas</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div key={app.id} className="bg-card rounded-xl p-4 gold-border">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{app.patientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {app.treatment} • {doctors.find((d) => d.id === app.doctorId)?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{app.date} • {app.time}</p>
                  {app.notes && <p className="text-xs text-muted-foreground mt-1">📝 {app.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap ${
                      app.status === "pendiente"
                        ? "bg-gold/20 text-gold"
                        : app.status === "completada"
                        ? "bg-clinic-green/20 text-clinic-green"
                        : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </span>
                  {app.status === "pendiente" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setCompleting(app.id); setMaterials([]); }}
                        className="p-1.5 rounded-lg bg-clinic-green/10 text-clinic-green hover:bg-clinic-green/20"
                        title="Completar"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { updateAppointment(app.id, { status: "cancelada" }); toast.info("Cita cancelada"); }}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => { deleteAppointment(app.id); toast.info("Cita eliminada"); }}
                    className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Complete dialog */}
              {completing === app.id && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                  <h4 className="font-semibold text-sm">Materiales utilizados:</h4>
                  {inventory.map((item) => {
                    const mat = materials.find((m) => m.itemId === item.id);
                    return (
                      <div key={item.id} className="flex items-center gap-3 text-sm">
                        <span className="flex-1">{item.name} (Stock: {item.stock})</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-20 bg-card rounded px-2 py-1 border border-border text-center"
                          value={mat?.qty || ""}
                          placeholder="0"
                          onChange={(e) => {
                            const qty = parseFloat(e.target.value) || 0;
                            setMaterials((prev) => {
                              const existing = prev.filter((m) => m.itemId !== item.id);
                              return qty > 0 ? [...existing, { itemId: item.id, qty }] : existing;
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleComplete(app.id)}
                      className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setCompleting(null)}
                      className="bg-muted-foreground/10 text-foreground px-4 py-2 rounded-lg text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
