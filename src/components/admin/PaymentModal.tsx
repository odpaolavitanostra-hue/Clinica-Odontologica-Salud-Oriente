
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Smartphone, Building, DollarSign, Banknote, Coins, Hash } from "lucide-react";
import { toast } from "sonner";

const DIGITAL_METHODS = [
  { value: "pago_movil", label: "Pago Móvil", icon: Smartphone },
  { value: "transferencia", label: "Transferencia Bancaria", icon: Building },
  { value: "zelle", label: "Zelle", icon: CreditCard },
  { value: "binance", label: "Binance", icon: CreditCard },
];

const CASH_METHODS = [
  { value: "efectivo_ves", label: "Efectivo VES", icon: Coins },
  { value: "efectivo_usd", label: "Efectivo USD", icon: DollarSign },
];

const ALL_METHODS = [...DIGITAL_METHODS, ...CASH_METHODS];

const isDigital = (method: string) => DIGITAL_METHODS.some(m => m.value === method);

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  treatment: string;
  defaultPrice: number;
  tasaBCV: number;
  onConfirm: (finalPrice: number, paymentMethod: string, paymentReference: string) => Promise<void>;
}

export default function PaymentModal({ open, onOpenChange, entityName, treatment, defaultPrice, tasaBCV, onConfirm }: PaymentModalProps) {
  const [finalPrice, setFinalPrice] = useState(defaultPrice);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpen = (v: boolean) => {
    if (v) {
      setFinalPrice(defaultPrice);
      setPaymentMethod("");
      setReference("");
    }
    onOpenChange(v);
  };

  const handleConfirm = async () => {
    if (!paymentMethod) { toast.error("Selecciona un método de pago"); return; }
    if (isDigital(paymentMethod) && !reference.trim()) { toast.error("Ingresa el número de referencia"); return; }
    setLoading(true);
    try {
      await onConfirm(finalPrice, paymentMethod, reference.trim());
      handleOpen(false);
    } catch {
      toast.error("Error al procesar el pago");
    } finally {
      setLoading(false);
    }
  };

  const methodLabel = ALL_METHODS.find(m => m.value === paymentMethod)?.label || "";

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="bg-card border-primary/30 max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-primary flex items-center gap-2">
            <Banknote className="w-5 h-5" /> Procesar Pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Entity info */}
          <div className="bg-muted rounded-lg p-3 space-y-1">
            <p className="text-sm font-semibold">{entityName}</p>
            <p className="text-xs text-muted-foreground">{treatment}</p>
          </div>

          {/* Editable price */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">Monto de Consulta (USD)</label>
            <input
              type="number" step="0.01" min="0"
              className="w-full bg-muted rounded-lg px-4 py-3 text-lg font-bold border border-border focus:border-primary focus:outline-none text-center"
              value={finalPrice}
              onChange={(e) => setFinalPrice(parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground text-center mt-1">
              Bs. {(finalPrice * tasaBCV).toFixed(2)} (Tasa: {tasaBCV})
            </p>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-semibold mb-2">Método de Pago</label>
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Digital (requiere referencia)</p>
              <div className="grid grid-cols-2 gap-2">
                {DIGITAL_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                      paymentMethod === m.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted border-border hover:border-primary/50"
                    }`}
                  >
                    <m.icon className="w-4 h-4" />
                    {m.label}
                  </button>
                ))}
              </div>

              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3">Efectivo (sin referencia)</p>
              <div className="grid grid-cols-2 gap-2">
                {CASH_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => { setPaymentMethod(m.value); setReference(""); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                      paymentMethod === m.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted border-border hover:border-primary/50"
                    }`}
                  >
                    <m.icon className="w-4 h-4" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reference field (conditional) */}
          {isDigital(paymentMethod) && (
            <div>
              <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-primary" /> Ingrese Referencia para Conciliación *
              </label>
              <input
                type="text"
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-primary/50 focus:border-primary focus:outline-none"
                placeholder="Número de referencia bancaria"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}

          {/* Summary */}
          {paymentMethod && (
            <div className="bg-muted/50 rounded-lg p-3 border border-border space-y-1">
              <p className="text-xs text-muted-foreground">Resumen:</p>
              <p className="text-sm"><span className="font-semibold">${finalPrice.toFixed(2)} USD</span> — {methodLabel}</p>
              {reference && <p className="text-xs text-muted-foreground">Ref: {reference}</p>}
            </div>
          )}

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={loading || !paymentMethod}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold text-sm disabled:opacity-50 transition-all hover:opacity-90"
          >
            {loading ? "Procesando..." : "Confirmar Pago"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ALL_METHODS, isDigital, DIGITAL_METHODS, CASH_METHODS };
