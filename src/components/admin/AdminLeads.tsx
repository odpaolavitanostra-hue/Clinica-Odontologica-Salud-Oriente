import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Plus, MessageCircle, Search, Trash2, Edit2, X, Users, TrendingUp, Mail, Phone, Clock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  cedula: string;
  status: string;
  source: string;
  interest: string;
  notes: string;
  isHighValue: boolean;
  contactHistory: { date: string; note: string; channel?: string }[];
  createdAt: string;
}

const STATUSES = [
  { id: "cold", label: "Lead Frío", emoji: "❄️", desc: "Consultas sin agendar" },
  { id: "hot", label: "Lead Caliente", emoji: "🔥", desc: "Cita programada" },
  { id: "active", label: "Paciente Activo", emoji: "🏥", desc: "En tratamiento" },
  { id: "completed", label: "Completado", emoji: "✅", desc: "Fidelización" },
  { id: "lost", label: "Recuperación", emoji: "🔄", desc: "Cancelados / Reagendar" },
];

const SOURCES = ["WhatsApp", "Instagram", "Facebook", "Referido", "Presencial", "Sistema", "Otro"];
const HIGH_VALUE_KEYWORDS = ["implante", "ortodoncia", "corona", "prótesis", "cirugía"];

const WA_TEMPLATES = [
  { label: "Seguimiento post-extracción", text: "Hola [NOMBRE], somos de Salud Oriente. ¿Cómo se ha sentido después de su extracción? Recuerde seguir las indicaciones del especialista. Estamos para ayudarle." },
  { label: "Recordatorio limpieza semestral", text: "Hola [NOMBRE], en Salud Oriente le recordamos que ya es momento de su limpieza dental semestral. ¡Agende su cita y mantenga su sonrisa saludable!" },
  { label: "Recuperación de paciente", text: "Hola [NOMBRE], somos de Salud Oriente. Notamos que su última cita fue cancelada. ¿Le gustaría reagendar? Estamos a su disposición." },
  { label: "Promoción de servicios", text: "Hola [NOMBRE], en Salud Oriente tenemos nuevos servicios para usted. ¡Consulte nuestras opciones y agende su próxima visita!" },
];

export const AdminLeads = () => {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [msgModal, setMsgModal] = useState<{ lead: Lead; channel: "whatsapp" | "email" } | null>(null);
  const [msgText, setMsgText] = useState("");

  const [form, setForm] = useState({
    name: "", phone: "", email: "", cedula: "",
    status: "cold", source: "WhatsApp", interest: "", notes: "",
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      return (data || []).map((l: any) => ({
        id: l.id, name: l.name, phone: l.phone, email: l.email,
        cedula: l.cedula, status: l.status, source: l.source,
        interest: l.interest, notes: l.notes, isHighValue: l.is_high_value,
        contactHistory: l.contact_history || [],
        createdAt: l.created_at,
      })) as Lead[];
    },
    refetchInterval: 5000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["leads"] });

  const detectHighValue = (interest: string) =>
    HIGH_VALUE_KEYWORDS.some(k => interest.toLowerCase().includes(k));

  const saveLead = async () => {
    if (!form.name.trim()) { toast.error("Nombre requerido"); return; }
    const isHV = detectHighValue(form.interest);
    if (editingId) {
      await supabase.from("leads").update({
        name: form.name, phone: form.phone, email: form.email, cedula: form.cedula,
        status: form.status, source: form.source, interest: form.interest,
        notes: form.notes, is_high_value: isHV, updated_at: new Date().toISOString(),
      }).eq("id", editingId);
      toast.success("Lead actualizado");
    } else {
      await supabase.from("leads").insert({
        name: form.name, phone: form.phone, email: form.email, cedula: form.cedula,
        status: form.status, source: form.source, interest: form.interest,
        notes: form.notes, is_high_value: isHV,
      });
      toast.success("Lead creado");
    }
    resetForm();
    invalidate();
  };

  const deleteLead = async (id: string) => {
    await supabase.from("leads").delete().eq("id", id);
    toast.success("Lead eliminado");
    invalidate();
  };

  const updateLeadStatus = async (id: string, newStatus: string) => {
    await supabase.from("leads").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
    invalidate();
  };

  const addContactNote = async (id: string) => {
    const note = noteInput[id]?.trim();
    if (!note) return;
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const history = [...lead.contactHistory, { date: new Date().toISOString(), note }];
    await supabase.from("leads").update({ contact_history: history, updated_at: new Date().toISOString() }).eq("id", id);
    setNoteInput(prev => ({ ...prev, [id]: "" }));
    invalidate();
  };

  const logContactAndSend = async (lead: Lead, channel: "whatsapp" | "email", message: string) => {
    const history = [...lead.contactHistory, { date: new Date().toISOString(), note: `📤 ${channel === "whatsapp" ? "WhatsApp" : "Email"}: ${message.substring(0, 80)}...`, channel }];
    await supabase.from("leads").update({ contact_history: history, updated_at: new Date().toISOString() }).eq("id", lead.id);

    if (channel === "whatsapp" && lead.phone) {
      const cleanPhone = lead.phone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('0') ? `58${cleanPhone.substring(1)}` : cleanPhone;
      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else if (channel === "email" && lead.email) {
      window.open(`mailto:${lead.email}?subject=Salud Oriente&body=${encodeURIComponent(message)}`, '_blank');
    }

    toast.success(`Contacto registrado vía ${channel === "whatsapp" ? "WhatsApp" : "Email"}`);
    invalidate();
    setMsgModal(null);
    setMsgText("");
  };

  const openMsgModal = (lead: Lead, channel: "whatsapp" | "email") => {
    setMsgModal({ lead, channel });
    setMsgText("");
  };

  const editLead = (lead: Lead) => {
    setForm({
      name: lead.name, phone: lead.phone, email: lead.email, cedula: lead.cedula,
      status: lead.status, source: lead.source, interest: lead.interest, notes: lead.notes,
    });
    setEditingId(lead.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ name: "", phone: "", email: "", cedula: "", status: "cold", source: "WhatsApp", interest: "", notes: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const filtered = leads.filter(l => {
    if (filterStatus && l.status !== filterStatus) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.phone.includes(search)) return false;
    return true;
  });

  // Stats
  const totalLeads = leads.length;
  const thisWeek = leads.filter(l => {
    const d = new Date(l.createdAt);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  const weekLeads = thisWeek.length;
  const weekScheduled = thisWeek.filter(l => l.status !== "cold" && l.status !== "lost").length;
  const conversionRate = weekLeads > 0 ? Math.round((weekScheduled / weekLeads) * 100) : 0;
  const completedCount = leads.filter(l => l.status === "completed").length;
  const recoveryCount = leads.filter(l => l.status === "lost").length;

  const getLastContact = (lead: Lead) => {
    if (lead.contactHistory.length === 0) return null;
    const last = lead.contactHistory[lead.contactHistory.length - 1];
    const days = Math.floor((Date.now() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24));
    return { ...last, daysAgo: days };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> CRM & Pipeline
        </h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-gold px-4 py-2 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Lead
        </button>
      </div>

      {/* Conversion Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl p-4 gold-border">
          <p className="text-xs text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-bold">{totalLeads}</p>
        </div>
        <div className="bg-card rounded-xl p-4 gold-border">
          <p className="text-xs text-muted-foreground">Esta Semana</p>
          <p className="text-2xl font-bold">{weekLeads}</p>
        </div>
        <div className="bg-card rounded-xl p-4 gold-border">
          <p className="text-xs text-muted-foreground">✅ Completados</p>
          <p className="text-2xl font-bold text-clinic-green">{completedCount}</p>
        </div>
        <div className="bg-card rounded-xl p-4 gold-border">
          <p className="text-xs text-muted-foreground">🔄 Recuperación</p>
          <p className="text-2xl font-bold text-orange-400">{recoveryCount}</p>
        </div>
        <div className="bg-card rounded-xl p-4 gold-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Conversión</p>
          <p className="text-2xl font-bold text-primary">{conversionRate}%</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterStatus(null)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!filterStatus ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            Todos
          </button>
          {STATUSES.map(s => (
            <button key={s.id} onClick={() => setFilterStatus(s.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-lg gold-border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg">{editingId ? "Editar Lead" : "Nuevo Lead"}</h3>
              <button onClick={resetForm}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Nombre *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="col-span-2 bg-muted border border-border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Teléfono" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Cédula" value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm" />
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm">
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input placeholder="Interés (ej: Implantes, Ortodoncia)" value={form.interest} onChange={e => setForm({ ...form, interest: e.target.value })} className="col-span-2 bg-muted border border-border rounded-lg px-3 py-2 text-sm" />
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="col-span-2 bg-muted border border-border rounded-lg px-3 py-2 text-sm">
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
              </select>
              <textarea placeholder="Notas rápidas" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="col-span-2 bg-muted border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={saveLead} className="btn-gold w-full py-2.5 text-sm font-semibold">{editingId ? "Guardar Cambios" : "Crear Lead"}</button>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {msgModal && (
        <Dialog open={!!msgModal} onOpenChange={() => { setMsgModal(null); setMsgText(""); }}>
          <DialogContent className="bg-card border-primary/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-primary flex items-center gap-2">
                {msgModal.channel === "whatsapp" ? <MessageCircle className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                {msgModal.channel === "whatsapp" ? "WhatsApp" : "Email"} — {msgModal.lead.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {msgModal.channel === "whatsapp" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Plantillas rápidas</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {WA_TEMPLATES.map((t, i) => (
                      <button key={i} onClick={() => setMsgText(t.text.replace("[NOMBRE]", msgModal.lead.name))}
                        className="text-left text-xs bg-muted rounded-lg px-3 py-2 border border-border hover:border-primary/50 transition-all">
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <textarea
                rows={4}
                className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none resize-none"
                placeholder="Escribe tu mensaje..."
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
              />
              {/* Last contact info */}
              {(() => {
                const lastContact = getLastContact(msgModal.lead);
                if (!lastContact) return <p className="text-[10px] text-muted-foreground">Sin contacto previo registrado</p>;
                return (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Último contacto: hace {lastContact.daysAgo} día(s) — {lastContact.note?.substring(0, 50)}
                  </p>
                );
              })()}
              <button
                onClick={() => msgText.trim() && logContactAndSend(msgModal.lead, msgModal.channel, msgText)}
                disabled={!msgText.trim()}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
              >
                Enviar y Registrar
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto">
        {STATUSES.map(status => {
          const columnLeads = filtered.filter(l => l.status === status.id);
          return (
            <div key={status.id} className="bg-card/50 rounded-xl p-4 gold-border min-h-[300px] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-base font-semibold flex items-center gap-1.5">
                  <span>{status.emoji}</span> {status.label}
                </h4>
                <span className="text-sm bg-muted px-2 py-0.5 rounded-full">{columnLeads.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">{status.desc}</p>

              {/* Campaign button for cold/lost leads */}
              {(status.id === "cold" || status.id === "lost") && columnLeads.length > 0 && (
                <button
                  onClick={() => {
                    const phones = columnLeads.map(l => l.phone).filter(Boolean);
                    const payload = JSON.stringify({ phones, message: status.id === "lost" ? "Hola, somos Salud Oriente. ¿Le gustaría reagendar su cita?" : "Hola, somos Salud Oriente. ¡Tenemos promociones especiales!", lead_category: status.id });
                    navigator.clipboard.writeText(payload);
                    toast.success(`Payload copiado con ${phones.length} contactos`);
                  }}
                  className="w-full text-xs bg-primary/10 text-primary rounded-lg py-1.5 hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" /> Campaña ({columnLeads.length})
                </button>
              )}

              <div className="space-y-2">
                {columnLeads.map(lead => {
                  const lastContact = getLastContact(lead);
                  return (
                  <div key={lead.id} className="bg-card rounded-lg p-4 border border-border/50 space-y-2 hover:border-primary/30 transition-all">
                     <div className="flex items-start justify-between">
                       <div className="flex items-center gap-1.5">
                         {lead.isHighValue && <Star className="w-4 h-4 text-primary fill-primary" />}
                         <p className="font-display text-base font-semibold leading-tight">{lead.name}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => editLead(lead)} className="text-muted-foreground hover:text-primary"><Edit2 className="w-3 h-3" /></button>
                        <button onClick={() => deleteLead(lead.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    {lead.interest && <p className="text-[11px] text-primary font-medium">{lead.interest}</p>}
                    <p className="text-[10px] text-muted-foreground">{lead.source} • {lead.phone || "Sin teléfono"}</p>
                    {lead.notes && <p className="text-[10px] text-muted-foreground italic">"{lead.notes}"</p>}

                    {/* Last contact indicator */}
                    {lastContact && (
                      <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Hace {lastContact.daysAgo}d {lastContact.channel ? `(${lastContact.channel})` : ""}
                      </p>
                    )}

                    {/* Quick status change */}
                    <select
                      value={lead.status}
                      onChange={e => updateLeadStatus(lead.id, e.target.value)}
                      className="w-full text-[10px] bg-muted border border-border rounded px-2 py-1"
                    >
                      {STATUSES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
                    </select>

                    {/* Contact history */}
                    {lead.contactHistory.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-border/30">
                        {lead.contactHistory.slice(-2).map((h, i) => (
                          <p key={i} className="text-[9px] text-muted-foreground">
                            <span className="font-medium">{new Date(h.date).toLocaleDateString()}</span>: {h.note}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Add note */}
                    <div className="flex gap-1">
                      <input
                        value={noteInput[lead.id] || ""}
                        onChange={e => setNoteInput(prev => ({ ...prev, [lead.id]: e.target.value }))}
                        placeholder="Nota rápida..."
                        className="flex-1 text-[10px] bg-muted border border-border rounded px-2 py-1"
                        onKeyDown={e => e.key === "Enter" && addContactNote(lead.id)}
                      />
                      <button onClick={() => addContactNote(lead.id)} className="text-[10px] text-primary hover:text-primary/80 font-semibold px-1">+</button>
                    </div>

                    {/* Communication Buttons */}
                    <div className="flex gap-1.5 pt-1">
                      {lead.phone && (
                        <button onClick={() => openMsgModal(lead, "whatsapp")}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] bg-clinic-green/10 text-clinic-green rounded-lg py-1.5 hover:bg-clinic-green/20 transition-colors font-medium">
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </button>
                      )}
                      {lead.email && (
                        <button onClick={() => openMsgModal(lead, "email")}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] bg-blue-500/10 text-blue-400 rounded-lg py-1.5 hover:bg-blue-500/20 transition-colors font-medium">
                          <Mail className="w-3 h-3" /> Email
                        </button>
                      )}
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`}
                          className="flex items-center justify-center gap-1 text-[10px] bg-muted text-muted-foreground rounded-lg py-1.5 px-2 hover:text-foreground transition-colors">
                          <Phone className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
