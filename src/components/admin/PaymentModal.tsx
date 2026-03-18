
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Smartphone, Building, DollarSign, Banknote, Coins, Hash, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { formatVES } from "@/lib/formatVES";

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

const MIXED_METHOD = { value: "mixto", label: "Pago Mixto", icon: ArrowLeftRight };

const ALL_METHODS = [...DIGITAL_METHODS, ...CASH_METHODS, MIXED_METHOD];

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
  // Mixed payment state
  const [mixedUSD, setMixedUSD] = useState(0);
  const [mixedVES, setMixedVES] = useState(0);
  const [mixedMethodA, setMixedMethodA] = useState("");
  const [mixedMethodB, setMixedMethodB] = useState("");
  const [mixedRefA, setMixedRefA] = useState("");
  const [mixedRefB, setMixedRefB] = useState("");

  const handleOpen = (v: boolean) => {
    if (v) {
      setFinalPrice(defaultPrice);
      setPaymentMethod("");
      setReference("");
      setMixedUSD(0);
      setMixedVES(0);
      setMixedMethodA("");
      setMixedMethodB("");
      setMixedRefA("");
      setMixedRefB("");
    }
    onOpenChange(v);
  };

  const handleConfirm = async () => {
    if (!paymentMethod) { toast.error("Selecciona un método de pago"); return; }

    if (paymentMethod === "mixto") {
      if (!mixedMethodA || !mixedMethodB) { toast.error("Selecciona ambos métodos de pago"); return; }
      // Validate that mixed payments sum up to the total
      const totalMixed = mixedUSD + (mixedVES / tasaBCV);
      const tolerance = 0.5; // $0.50 tolerance
      if (Math.abs(totalMixed - finalPrice) > tolerance) {
        toast.error(`La suma de los pagos ($${totalMixed.toFixed(2)}) no coincide con el total ($${finalPrice.toFixed(2)})`);
        return;
      }
      if (isDigital(mixedMethodA) && !mixedRefA.trim()) { toast.error("Referencia del primer pago requerida"); return; }
      if (isDigital(mixedMethodB) && !mixedRefB.trim()) { toast.error("Referencia del segundo pago requerida"); return; }

      const refStr = `Mixto: ${mixedMethodA}($${mixedUSD.toFixed(2)})${mixedRefA ? `[${mixedRefA}]` : ''} + ${mixedMethodB}(Bs.${formatVES(mixedVES)})${mixedRefB ? `[${mixedRefB}]` : ''}`;
      setLoading(true);
      try {
        await onConfirm(finalPrice, "mixto", refStr);
        handleOpen(false);
      } catch {
        toast.error("Error al procesar el pago");
      } finally {
        setLoading(false);
      }
      return;
    }

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
  const isMixed = paymentMethod === "mixto";

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="bg-card border-primary/30 max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-primary flex items-center gap-2">
            <Banknote className="w-5 h-5" /> Procesar Pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="bg-muted rounded-lg p-3 space-y-1">
            <p className="text-sm font-semibold">{entityName}</p>
            <p className="text-xs text-muted-foreground">{treatment}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Monto de Consulta (USD)</label>
            <input
              type="number" step="0.01" min="0"
              className="w-full bg-muted rounded-lg px-4 py-3 text-lg font-bold border border-border focus:border-primary focus:outline-none text-center"
              value={finalPrice}
              onChange={(e) => setFinalPrice(parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground text-center mt-1">
              Bs. {formatVES(finalPrice * tasaBCV)} (Tasa: {tasaBCV})
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2">Método de Pago</label>
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Digital (requiere referencia)</p>
              <div className="grid grid-cols-2 gap-2">
                {DIGITAL_METHODS.map((m) => (
                  <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                      paymentMethod === m.value ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border hover:border-primary/50"
                    }`}>
                    <m.icon className="w-4 h-4" /> {m.label}
                  </button>
                ))}
              </div>

              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3">Efectivo (sin referencia)</p>
              <div className="grid grid-cols-2 gap-2">
                {CASH_METHODS.map((m) => (
                  <button key={m.value} type="button" onClick={() => { setPaymentMethod(m.value); setReference(""); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                      paymentMethod === m.value ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border hover:border-primary/50"
                    }`}>
                    <m.icon className="w-4 h-4" /> {m.label}
                  </button>
                ))}
              </div>

              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3">Combinado</p>
              <button type="button" onClick={() => setPaymentMethod("mixto")}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                  isMixed ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border hover:border-primary/50"
                }`}>
                <ArrowLeftRight className="w-4 h-4" /> Pago Mixto (USD + Bs.)
              </button>
            </div>
          </div>

          {isDigital(paymentMethod) && !isMixed && (
            <div>
              <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-primary" /> Ingrese Referencia para Conciliación *
              </label>
              <input type="text"
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-primary/50 focus:border-primary focus:outline-none"
                placeholder="Número de referencia bancaria"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}

          {/* Mixed Payment Fields */}
          {isMixed && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-primary/20">
              <h4 className="text-xs font-bold text-primary uppercase">Pago 1 — USD</h4>
              <div className="grid grid-cols-2 gap-2">
                {[...DIGITAL_METHODS, ...CASH_METHODS].map((m) => (
                  <button key={m.value} type="button" onClick={() => setMixedMethodA(m.value)}
                    className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-medium transition-all border ${
                      mixedMethodA === m.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/50"
                    }`}>
                    <m.icon className="w-3 h-3" /> {m.label}
                  </button>
                ))}
              </div>
              <input type="number" step="0.01" min="0" placeholder="Monto en USD"
                className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none"
                value={mixedUSD || ""} onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setMixedUSD(val);
                  setMixedVES((finalPrice - val) * tasaBCV);
                }} />
              {isDigital(mixedMethodA) && (
                <input type="text" placeholder="Referencia *" value={mixedRefA}
                  onChange={(e) => setMixedRefA(e.target.value)}
                  className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none" />
              )}

              <h4 className="text-xs font-bold text-primary uppercase">Pago 2 — Bs.</h4>
              <div className="grid grid-cols-2 gap-2">
                {[...DIGITAL_METHODS, ...CASH_METHODS].map((m) => (
                  <button key={m.value} type="button" onClick={() => setMixedMethodB(m.value)}
                    className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-medium transition-all border ${
                      mixedMethodB === m.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/50"
                    }`}>
                    <m.icon className="w-3 h-3" /> {m.label}
                  </button>
                ))}
              </div>
              <div>
                <input type="number" step="0.01" min="0" placeholder="Monto en Bs."
                  className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none"
                  value={mixedVES || ""} onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setMixedVES(val);
                    setMixedUSD(finalPrice - (val / tasaBCV));
                  }} />
                <p className="text-[10px] text-muted-foreground mt-1">≈ ${(mixedVES / tasaBCV).toFixed(2)} USD</p>
              </div>
              {isDigital(mixedMethodB) && (
                <input type="text" placeholder="Referencia *" value={mixedRefB}
                  onChange={(e) => setMixedRefB(e.target.value)}
                  className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none" />
              )}

              {/* Mixed summary */}
              <div className="bg-card rounded-lg p-3 border border-border space-y-1">
                <p className="text-xs font-semibold">Resumen Mixto:</p>
                <p className="text-[11px]">USD: ${mixedUSD.toFixed(2)} ({mixedMethodA || "—"})</p>
                <p className="text-[11px]">Bs.: {formatVES(mixedVES)} ({mixedMethodB || "—"})</p>
                <p className="text-[11px] font-semibold text-primary">Total: ${(mixedUSD + mixedVES / tasaBCV).toFixed(2)} / Bs. {formatVES((mixedUSD + mixedVES / tasaBCV) * tasaBCV)}</p>
              </div>
            </div>
          )}

          {paymentMethod && !isMixed && (
            <div className="bg-muted/50 rounded-lg p-3 border border-border space-y-1">
              <p className="text-xs text-muted-foreground">Resumen:</p>
              <p className="text-sm"><span className="font-semibold">${finalPrice.toFixed(2)} USD</span> — {methodLabel}</p>
              <p className="text-sm text-muted-foreground">Bs. {formatVES(finalPrice * tasaBCV)}</p>
              {reference && <p className="text-xs text-muted-foreground">Ref: {reference}</p>}
            </div>
          )}

          <button onClick={handleConfirm} disabled={loading || !paymentMethod}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold text-sm disabled:opacity-50 transition-all hover:opacity-90">
            {loading ? "Procesando..." : "Confirmar Pago"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ALL_METHODS, isDigital, DIGITAL_METHODS, CASH_METHODS };
