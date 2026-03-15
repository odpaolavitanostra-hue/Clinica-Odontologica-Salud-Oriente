
import { useState } from "react";
import { useClinicData, InventoryItem } from "@/hooks/useClinicData";
import { Package, Plus, Trash2, Edit, Save, X, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";

export const AdminInventory = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useClinicData();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", stock: 0, priceUSD: 0, minStock: 10 });
  const [searchQuery, setSearchQuery] = useState("");

  const handleAdd = async () => {
    if (!form.name) { toast.error("Nombre requerido"); return; }
    await addInventoryItem(form);
    setAdding(false);
    setForm({ name: "", stock: 0, priceUSD: 0, minStock: 10 });
    toast.success("Item agregado");
  };

  const handleUpdate = async (id: string) => {
    await updateInventoryItem(id, form);
    setEditing(null);
    toast.success("Item actualizado");
  };

  const startEdit = (item: InventoryItem) => {
    setEditing(item.id);
    setForm({ name: item.name, stock: item.stock, priceUSD: item.priceUSD, minStock: item.minStock });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-accent" /> Inventario
        </h2>
        <button onClick={() => setAdding(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Buscar por nombre..." className="w-full bg-card rounded-lg pl-10 pr-4 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {(adding || editing) && (
        <div className="bg-card rounded-xl p-5 gold-border mb-6 space-y-3">
          <h3 className="font-semibold">{adding ? "Nuevo Item" : "Editar Item"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} maxLength={100} />
            <input type="number" min="0" step="0.01" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Stock" value={form.stock} onChange={(e) => setForm((p) => ({ ...p, stock: parseFloat(e.target.value) || 0 }))} />
            <input type="number" min="0" step="0.01" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Precio USD" value={form.priceUSD} onChange={(e) => setForm((p) => ({ ...p, priceUSD: parseFloat(e.target.value) || 0 }))} />
            <input type="number" min="0" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border" placeholder="Stock Mínimo" value={form.minStock} onChange={(e) => setForm((p) => ({ ...p, minStock: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={adding ? handleAdd : () => handleUpdate(editing!)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Save className="w-4 h-4" /> Guardar</button>
            <button onClick={() => { setAdding(false); setEditing(null); }} className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm flex items-center gap-1"><X className="w-4 h-4" /> Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {inventory.map((item) => (
          <div key={item.id} className={`bg-card rounded-xl p-4 flex items-center justify-between flex-wrap gap-3 ${item.stock <= item.minStock ? "border-2 border-amber" : "gold-border"}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{item.name}</p>
                {item.stock <= item.minStock && (
                  <span className="flex items-center gap-1 text-xs text-amber font-semibold"><AlertTriangle className="w-3 h-3" /> Stock bajo</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Stock: {item.stock} • Mín: {item.minStock} • ${item.priceUSD.toFixed(2)} USD</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(item)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"><Edit className="w-4 h-4" /></button>
              <button onClick={async () => { await deleteInventoryItem(item.id); toast.info("Item eliminado"); }} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
