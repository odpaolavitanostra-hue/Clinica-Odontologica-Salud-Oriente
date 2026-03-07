import { useClinicData, Transaction } from "@/hooks/useClinicData";
import { formatVES } from "@/lib/formatVES";
import { DollarSign, CreditCard, Banknote, Smartphone, Globe, Wallet } from "lucide-react";

const METHOD_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  pago_movil: { label: "Pago Móvil", icon: <Smartphone className="w-4 h-4" /> },
  transferencia: { label: "Transferencia", icon: <CreditCard className="w-4 h-4" /> },
  zelle: { label: "Zelle", icon: <Globe className="w-4 h-4" /> },
  binance: { label: "Binance", icon: <Wallet className="w-4 h-4" /> },
  efectivo_usd: { label: "Efectivo USD", icon: <DollarSign className="w-4 h-4" /> },
  efectivo_ves: { label: "Efectivo VES", icon: <Banknote className="w-4 h-4" /> },
};

interface Props {
  date: string;
  transactions: Transaction[];
  tasaBCV: number;
}

export default function CierreCaja({ date, transactions, tasaBCV }: Props) {
  const dayTx = transactions.filter(t => t.date === date);

  const byMethod: Record<string, { count: number; totalUSD: number; totalVES: number }> = {};
  dayTx.forEach(t => {
    const m = t.paymentMethod || "otro";
    if (!byMethod[m]) byMethod[m] = { count: 0, totalUSD: 0, totalVES: 0 };
    byMethod[m].count++;
    byMethod[m].totalUSD += t.amountUSD;
    byMethod[m].totalVES += t.amountVES;
  });

  const grandTotalUSD = dayTx.reduce((s, t) => s + t.amountUSD, 0);
  const grandTotalVES = dayTx.reduce((s, t) => s + t.amountVES, 0);

  return (
    <div className="bg-card rounded-xl p-5 gold-border space-y-4">
      <h3 className="font-display font-semibold flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-gold" /> Cierre de Caja — {date}
      </h3>

      {dayTx.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-6">No hay pagos confirmados para este día</p>
      ) : (
        <>
           <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(byMethod).map(([method, data]) => {
              const cfg = METHOD_CONFIG[method] || { label: method, icon: <DollarSign className="w-4 h-4" /> };
              return (
                <div key={method} className="bg-muted rounded-lg p-4 space-y-1" style={{ minHeight: '60px' }}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    {cfg.icon} {cfg.label}
                  </div>
                  <p className="text-base font-bold">${data.totalUSD.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Bs. {formatVES(data.totalVES)}</p>
                  <p className="text-xs text-muted-foreground">{data.count} pago(s)</p>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border pt-3 flex items-center justify-between">
            <span className="font-semibold text-sm">Total del Día</span>
            <div className="text-right">
              <p className="text-lg font-bold text-gold">${grandTotalUSD.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Bs. {formatVES(grandTotalVES)}</p>
              <p className="text-[10px] text-muted-foreground">{dayTx.length} transacción(es)</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
