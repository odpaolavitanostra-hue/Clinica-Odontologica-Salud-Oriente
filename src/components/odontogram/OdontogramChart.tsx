import { useState, useRef } from "react";
import ToothSVG from "./ToothSVG";
import ToothContextMenu from "./ToothContextMenu";
import {
  type OdontogramData,
  type SurfaceStatus,
  type ToothOverallStatus,
  QUADRANTS,
} from "@/hooks/useOdontogram";

interface OdontogramChartProps {
  data: OdontogramData;
  onSurfaceChange: (tooth: string, surface: string, status: SurfaceStatus) => void;
  onOverallChange: (tooth: string, status: ToothOverallStatus) => void;
  onResetTooth: (tooth: string) => void;
  readOnly?: boolean;
  notes?: string;
  onNotesChange?: (notes: string) => void;
}

interface MenuState {
  tooth: string;
  mode: "surface" | "overall";
  surface?: string;
  position: { x: number; y: number };
}

export default function OdontogramChart({
  data,
  onSurfaceChange,
  onOverallChange,
  onResetTooth,
  readOnly = false,
  notes,
  onNotesChange,
}: OdontogramChartProps) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const openSurfaceMenu = (tooth: string, surface: string, e: React.MouseEvent) => {
    if (readOnly) return;
    setMenu({ tooth, mode: "surface", surface, position: { x: e.clientX, y: e.clientY } });
  };

  const openOverallMenu = (tooth: string, e: React.MouseEvent) => {
    if (readOnly) return;
    setMenu({ tooth, mode: "overall", position: { x: e.clientX, y: e.clientY } });
  };

  const renderQuadrant = (teeth: number[], label: string) => (
    <div className="flex flex-wrap gap-1 justify-center">
      {teeth.map((t) => {
        const key = t.toString();
        const tooth = data[key];
        if (!tooth) return null;
        return (
          <ToothSVG
            key={key}
            number={t}
            surfaces={tooth.surfaces}
            overall={tooth.overall}
            size={38}
            onSurfaceClick={(surface) => {
              if (readOnly) return;
              const rect = scrollRef.current?.getBoundingClientRect();
              setMenu({
                tooth: key,
                mode: "surface",
                surface,
                position: { x: (rect?.left ?? 100) + 100, y: (rect?.top ?? 100) + 100 },
              });
            }}
            onToothClick={() => {
              if (readOnly) return;
              const rect = scrollRef.current?.getBoundingClientRect();
              setMenu({
                tooth: key,
                mode: "overall",
                position: { x: (rect?.left ?? 100) + 100, y: (rect?.top ?? 100) + 100 },
              });
            }}
          />
        );
      })}
    </div>
  );

  return (
    <div ref={scrollRef} className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#e8e8e8]" />Sano</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />Caries</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />Rest. Buena</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" />Rest. Defect.</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#8b5cf6]" />Rest. Prov.</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#D4AF37]" />Planeado</span>
      </div>

      {/* Chart area with light bg for clinical clarity */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-border overflow-x-auto">
        {/* PERMANENT - Upper */}
        <div className="mb-1">
          <p className="text-[9px] font-semibold text-muted-foreground mb-1 text-center">PERMANENTES — SUPERIOR</p>
          <div className="flex justify-center gap-0.5">
            <div className="flex gap-0.5 border-r border-dashed border-border pr-1">
              {QUADRANTS.permanentUpperRight.map((t) => {
                const key = t.toString();
                const tooth = data[key];
                if (!tooth) return null;
                return (
                  <ToothSVG key={key} number={t} surfaces={tooth.surfaces} overall={tooth.overall} size={36}
                    onSurfaceClick={(s) => !readOnly && setMenu({ tooth: key, mode: "surface", surface: s, position: { x: window.innerWidth / 2, y: 200 } })}
                    onToothClick={() => !readOnly && setMenu({ tooth: key, mode: "overall", position: { x: window.innerWidth / 2, y: 200 } })}
                  />
                );
              })}
            </div>
            <div className="flex gap-0.5 pl-1">
              {QUADRANTS.permanentUpperLeft.map((t) => {
                const key = t.toString();
                const tooth = data[key];
                if (!tooth) return null;
                return (
                  <ToothSVG key={key} number={t} surfaces={tooth.surfaces} overall={tooth.overall} size={36}
                    onSurfaceClick={(s) => !readOnly && setMenu({ tooth: key, mode: "surface", surface: s, position: { x: window.innerWidth / 2, y: 200 } })}
                    onToothClick={() => !readOnly && setMenu({ tooth: key, mode: "overall", position: { x: window.innerWidth / 2, y: 200 } })}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* DECIDUOUS - Upper */}
        <div className="mb-3">
          <p className="text-[9px] font-semibold text-muted-foreground mb-1 text-center">TEMPORALES — SUPERIOR</p>
          <div className="flex justify-center gap-0.5">
            <div className="flex gap-0.5 border-r border-dashed border-border pr-1">
              {QUADRANTS.deciduousUpperRight.map((t) => {
                const key = t.toString();
                const tooth = data[key];
                if (!tooth) return null;
                return (
                  <ToothSVG key={key} number={t} surfaces={tooth.surfaces} overall={tooth.overall} size={32}
                    onSurfaceClick={(s) => !readOnly && setMenu({ tooth: key, mode: "surface", surface: s, position: { x: window.innerWidth / 2, y: 300 } })}
                    onToothClick={() => !readOnly && setMenu({ tooth: key, mode: "overall", position: { x: window.innerWidth / 2, y: 300 } })}
                  />
                );
              })}
            </div>
            <div className="flex gap-0.5 pl-1">
              {QUADRANTS.deciduousUpperLeft.map((t) => {
                const key = t.toString();
                const tooth = data[key];
                if (!tooth) return null;
                return (
                  <ToothSVG key={key} number={t} surfaces={tooth.surfaces} overall={tooth.overall} size={32}
                    onSurfaceClick={(s) => !readOnly && setMenu({ tooth: key, mode: "surface", surface: s, position: { x: window.innerWidth / 2, y: 300 } })}
                    onToothClick={() => !readOnly && setMenu({ tooth: key, mode: "overall", position: { x: window.innerWidth / 2, y: 300 } })}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <hr className="border-dashed border-border my-2" />

        {/* DECIDUOUS - Lower */}
        <div className="mb-1">
          <p className="text-[9px] font-semibold text-muted-foreground mb-1 text-center">TEMPORALES — INFERIOR</p>
          <div className="flex justify-center gap-0.5">
            <div className="flex gap-0.5 border-r border-dashed border-border pr-1">
              {QUADRANTS.deciduousLowerRight.map((t) => {
                const key = t.toString();
                const tooth = data[key];
                if (!tooth) return null;
                return (
                  <ToothSVG key={key} number={t} surfaces={tooth.surfaces} overall={tooth.overall} size={32}
                    onSurfaceClick={(s) => !readOnly && setMenu({ tooth: key, mode: "surface", surface: s, position: { x: window.innerWidth / 2, y: 400 } })}
                    onToothClick={() => !readOnly && setMenu({ tooth: key, mode: "overall", position: { x: window.innerWidth / 2, y: 400 } })}
                  />
                );
              })}
            </div>
            <div className="flex gap-0.5 pl-1">
              {QUADRANTS.deciduousLowerLeft.map((t) => {
                const key = t.toString();
                const tooth = data[key];
                if (!tooth) return null;
                return (
                  <ToothSVG key={key} number={t} surfaces={tooth.surfaces} overall={tooth.overall} size={32}
                    onSurfaceClick={(s) => !readOnly && setMenu({ tooth: key, mode: "surface", surface: s, position: { x: window.innerWidth / 2, y: 400 } })}
                    onToothClick={() => !readOnly && setMenu({ tooth: key, mode: "overall", position: { x: window.innerWidth / 2, y: 400 } })}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* PERMANENT - Lower */}
        <div>
          <p className="text-[9px] font-semibold text-muted-foreground mb-1 text-center">PERMANENTES — INFERIOR</p>
          <div className="flex justify-center gap-0.5">
            <div className="flex gap-0.5 border-r border-dashed border-border pr-1">
              {QUADRANTS.permanentLowerRight.map((t) => {
                const key = t.toString();
                const tooth = data[key];
                if (!tooth) return null;
                return (
                  <ToothSVG key={key} number={t} surfaces={tooth.surfaces} overall={tooth.overall} size={36}
                    onSurfaceClick={(s) => !readOnly && setMenu({ tooth: key, mode: "surface", surface: s, position: { x: window.innerWidth / 2, y: 500 } })}
                    onToothClick={() => !readOnly && setMenu({ tooth: key, mode: "overall", position: { x: window.innerWidth / 2, y: 500 } })}
                  />
                );
              })}
            </div>
            <div className="flex gap-0.5 pl-1">
              {QUADRANTS.permanentLowerLeft.map((t) => {
                const key = t.toString();
                const tooth = data[key];
                if (!tooth) return null;
                return (
                  <ToothSVG key={key} number={t} surfaces={tooth.surfaces} overall={tooth.overall} size={36}
                    onSurfaceClick={(s) => !readOnly && setMenu({ tooth: key, mode: "surface", surface: s, position: { x: window.innerWidth / 2, y: 500 } })}
                    onToothClick={() => !readOnly && setMenu({ tooth: key, mode: "overall", position: { x: window.innerWidth / 2, y: 500 } })}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {onNotesChange !== undefined && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Observaciones clínicas del odontograma:</label>
          <textarea
            value={notes || ""}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            placeholder="Ej: Desgaste en piezas 16 y 26, gingivitis leve..."
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border resize-none"
            readOnly={readOnly}
          />
        </div>
      )}

      {/* Context Menu */}
      {menu && (
        <ToothContextMenu
          toothNumber={menu.tooth}
          mode={menu.mode}
          surfaceName={menu.surface}
          position={menu.position}
          onSelectSurface={(status) => onSurfaceChange(menu.tooth, menu.surface!, status)}
          onSelectOverall={(status) => onOverallChange(menu.tooth, status)}
          onReset={() => onResetTooth(menu.tooth)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
