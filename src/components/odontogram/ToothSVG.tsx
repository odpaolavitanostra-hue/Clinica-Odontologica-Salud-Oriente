import { type SurfaceStatus, type ToothOverallStatus } from "@/hooks/useOdontogram";

const SURFACE_COLORS: Record<SurfaceStatus, string> = {
  sano: "#e8e8e8",
  caries: "#ef4444",
  restauracion_buena: "#3b82f6",
  restauracion_defectuosa: "#f59e0b",
  restauracion_provisional: "#8b5cf6",
  planeado: "#D4AF37",
};

interface ToothSVGProps {
  number: number;
  surfaces: {
    oclusal: SurfaceStatus;
    distal: SurfaceStatus;
    mesial: SurfaceStatus;
    bucal: SurfaceStatus;
    lingual: SurfaceStatus;
  };
  overall: ToothOverallStatus;
  onSurfaceClick: (surface: string) => void;
  onToothClick: () => void;
  size?: number;
}

export default function ToothSVG({
  number,
  surfaces,
  overall,
  onSurfaceClick,
  onToothClick,
  size = 44,
}: ToothSVGProps) {
  if (overall === "missing") {
    return (
      <div className="flex flex-col items-center gap-0.5 cursor-pointer" onClick={onToothClick}>
        <span className="text-[9px] font-mono text-muted-foreground">{number}</span>
        <svg width={size} height={size} viewBox="0 0 50 50">
          <rect x="5" y="5" width="40" height="40" rx="4" fill="none" stroke="#555" strokeWidth="1" strokeDasharray="4 2" />
          <text x="25" y="30" textAnchor="middle" fontSize="18" fill="#555" fontWeight="bold">—</text>
        </svg>
      </div>
    );
  }

  const showX = overall === "exodoncia";
  const showEndo = overall === "endodoncia";
  const showCrown = overall === "corona";
  const showImplant = overall === "implante";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] font-mono text-muted-foreground">{number}</span>
      <svg width={size} height={size} viewBox="0 0 50 50" className="cursor-pointer">
        {/* Bucal - top */}
        <polygon
          points="10,5 40,5 35,15 15,15"
          fill={SURFACE_COLORS[surfaces.bucal]}
          stroke="#333" strokeWidth="1"
          onClick={(e) => { e.stopPropagation(); onSurfaceClick("bucal"); }}
          className="hover:opacity-80 transition-opacity"
        />
        {/* Lingual - bottom */}
        <polygon
          points="15,35 35,35 40,45 10,45"
          fill={SURFACE_COLORS[surfaces.lingual]}
          stroke="#333" strokeWidth="1"
          onClick={(e) => { e.stopPropagation(); onSurfaceClick("lingual"); }}
          className="hover:opacity-80 transition-opacity"
        />
        {/* Mesial - left */}
        <polygon
          points="5,10 15,15 15,35 5,40"
          fill={SURFACE_COLORS[surfaces.mesial]}
          stroke="#333" strokeWidth="1"
          onClick={(e) => { e.stopPropagation(); onSurfaceClick("mesial"); }}
          className="hover:opacity-80 transition-opacity"
        />
        {/* Distal - right */}
        <polygon
          points="35,15 45,10 45,40 35,35"
          fill={SURFACE_COLORS[surfaces.distal]}
          stroke="#333" strokeWidth="1"
          onClick={(e) => { e.stopPropagation(); onSurfaceClick("distal"); }}
          className="hover:opacity-80 transition-opacity"
        />
        {/* Oclusal - center */}
        <rect
          x="15" y="15" width="20" height="20"
          fill={SURFACE_COLORS[surfaces.oclusal]}
          stroke="#333" strokeWidth="1"
          onClick={(e) => { e.stopPropagation(); onSurfaceClick("oclusal"); }}
          className="hover:opacity-80 transition-opacity"
        />

        {/* Overlays */}
        {showX && (
          <>
            <line x1="8" y1="8" x2="42" y2="42" stroke="#ef4444" strokeWidth="3" pointerEvents="none" />
            <line x1="42" y1="8" x2="8" y2="42" stroke="#ef4444" strokeWidth="3" pointerEvents="none" />
          </>
        )}
        {showEndo && (
          <line x1="25" y1="5" x2="25" y2="45" stroke="#D4AF37" strokeWidth="3" pointerEvents="none" />
        )}
        {showCrown && (
          <circle cx="25" cy="25" r="22" fill="none" stroke="#3b82f6" strokeWidth="2.5" pointerEvents="none" />
        )}
        {showImplant && (
          <>
            <circle cx="25" cy="25" r="22" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 2" pointerEvents="none" />
            <polygon points="25,8 20,42 30,42" fill="none" stroke="#8b5cf6" strokeWidth="1.5" pointerEvents="none" />
          </>
        )}
      </svg>
      {/* Tooth-level action */}
      <button
        onClick={onToothClick}
        className="text-[8px] text-muted-foreground hover:text-gold transition-colors leading-none"
        title="Estado general del diente"
      >
        ●
      </button>
    </div>
  );
}
