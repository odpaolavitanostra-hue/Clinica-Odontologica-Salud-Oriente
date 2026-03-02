import { type SurfaceStatus, type ToothOverallStatus } from "@/hooks/useOdontogram";

interface ToothContextMenuProps {
  toothNumber: string;
  mode: "surface" | "overall";
  surfaceName?: string;
  position: { x: number; y: number };
  onSelectSurface?: (status: SurfaceStatus) => void;
  onSelectOverall?: (status: ToothOverallStatus) => void;
  onReset: () => void;
  onClose: () => void;
}

const surfaceOptions: { label: string; value: SurfaceStatus; color: string; icon: string }[] = [
  { label: "Sano", value: "sano", color: "#e8e8e8", icon: "✓" },
  { label: "Caries", value: "caries", color: "#ef4444", icon: "●" },
  { label: "Restauración (Buena)", value: "restauracion_buena", color: "#3b82f6", icon: "■" },
  { label: "Restauración (Defectuosa)", value: "restauracion_defectuosa", color: "#f59e0b", icon: "■" },
  { label: "Restauración (Provisional)", value: "restauracion_provisional", color: "#8b5cf6", icon: "■" },
  { label: "Tratamiento Planeado", value: "planeado", color: "#D4AF37", icon: "★" },
];

const overallOptions: { label: string; value: ToothOverallStatus; icon: string }[] = [
  { label: "Presente (Normal)", value: "present", icon: "🦷" },
  { label: "Ausente", value: "missing", icon: "—" },
  { label: "Exodoncia", value: "exodoncia", icon: "✕" },
  { label: "Endodoncia", value: "endodoncia", icon: "│" },
  { label: "Corona", value: "corona", icon: "○" },
  { label: "Implante", value: "implante", icon: "△" },
];

const SURFACE_LABELS: Record<string, string> = {
  oclusal: "Oclusal", distal: "Distal", mesial: "Mesial", bucal: "Bucal", lingual: "Lingual",
};

export default function ToothContextMenu({
  toothNumber,
  mode,
  surfaceName,
  position,
  onSelectSurface,
  onSelectOverall,
  onReset,
  onClose,
}: ToothContextMenuProps) {
  // Clamp position to viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(position.x, window.innerWidth - 240),
    top: Math.min(position.y, window.innerHeight - 320),
    zIndex: 9999,
  };

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div style={style} className="w-56 bg-[#1a1a1a] border border-[#D4AF37]/60 rounded-xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="px-3 py-2 border-b border-[#D4AF37]/30 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#D4AF37]">
            Diente {toothNumber}
            {mode === "surface" && surfaceName ? ` — ${SURFACE_LABELS[surfaceName] || surfaceName}` : " — Estado General"}
          </span>
        </div>
        <div className="py-1 max-h-64 overflow-y-auto">
          {mode === "surface"
            ? surfaceOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onSelectSurface?.(opt.value); onClose(); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-[#D4AF37]/20 transition-colors flex items-center gap-2"
                >
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: opt.color }} />
                  {opt.label}
                </button>
              ))
            : overallOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onSelectOverall?.(opt.value); onClose(); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-[#D4AF37]/20 transition-colors flex items-center gap-2"
                >
                  <span className="text-base leading-none">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
          <div className="border-t border-[#D4AF37]/20 mt-1 pt-1">
            <button
              onClick={() => { onReset(); onClose(); }}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              🔄 Reiniciar diente
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
