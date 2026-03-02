import { useState, useCallback } from "react";

export type SurfaceStatus =
  | "sano"
  | "caries"
  | "restauracion_buena"
  | "restauracion_defectuosa"
  | "restauracion_provisional"
  | "planeado";

export type ToothOverallStatus =
  | "present"
  | "missing"
  | "exodoncia"
  | "endodoncia"
  | "corona"
  | "implante";

export interface ToothState {
  surfaces: {
    oclusal: SurfaceStatus;
    distal: SurfaceStatus;
    mesial: SurfaceStatus;
    bucal: SurfaceStatus;
    lingual: SurfaceStatus;
  };
  overall: ToothOverallStatus;
}

export type OdontogramData = Record<string, ToothState>;

// FDI permanent teeth
const PERMANENT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const PERMANENT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const PERMANENT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
const PERMANENT_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

// FDI deciduous teeth
const DECIDUOUS_UPPER_RIGHT = [55, 54, 53, 52, 51];
const DECIDUOUS_UPPER_LEFT = [61, 62, 63, 64, 65];
const DECIDUOUS_LOWER_LEFT = [71, 72, 73, 74, 75];
const DECIDUOUS_LOWER_RIGHT = [85, 84, 83, 82, 81];

export const QUADRANTS = {
  permanentUpperRight: PERMANENT_UPPER_RIGHT,
  permanentUpperLeft: PERMANENT_UPPER_LEFT,
  permanentLowerLeft: PERMANENT_LOWER_LEFT,
  permanentLowerRight: PERMANENT_LOWER_RIGHT,
  deciduousUpperRight: DECIDUOUS_UPPER_RIGHT,
  deciduousUpperLeft: DECIDUOUS_UPPER_LEFT,
  deciduousLowerLeft: DECIDUOUS_LOWER_LEFT,
  deciduousLowerRight: DECIDUOUS_LOWER_RIGHT,
};

export const ALL_TEETH = [
  ...PERMANENT_UPPER_RIGHT, ...PERMANENT_UPPER_LEFT,
  ...PERMANENT_LOWER_LEFT, ...PERMANENT_LOWER_RIGHT,
  ...DECIDUOUS_UPPER_RIGHT, ...DECIDUOUS_UPPER_LEFT,
  ...DECIDUOUS_LOWER_LEFT, ...DECIDUOUS_LOWER_RIGHT,
];

const createDefaultTooth = (): ToothState => ({
  surfaces: {
    oclusal: "sano",
    distal: "sano",
    mesial: "sano",
    bucal: "sano",
    lingual: "sano",
  },
  overall: "present",
});

export const createEmptyOdontogram = (): OdontogramData => {
  const data: OdontogramData = {};
  ALL_TEETH.forEach((t) => (data[t.toString()] = createDefaultTooth()));
  return data;
};

export function useOdontogram(initial?: OdontogramData | null) {
  const [data, setData] = useState<OdontogramData>(
    initial ?? createEmptyOdontogram()
  );

  const setSurface = useCallback(
    (tooth: string, surface: keyof ToothState["surfaces"], status: SurfaceStatus) => {
      setData((prev) => ({
        ...prev,
        [tooth]: {
          ...prev[tooth],
          surfaces: { ...prev[tooth].surfaces, [surface]: status },
        },
      }));
    },
    []
  );

  const setOverall = useCallback(
    (tooth: string, status: ToothOverallStatus) => {
      setData((prev) => ({
        ...prev,
        [tooth]: { ...prev[tooth], overall: status },
      }));
    },
    []
  );

  const resetTooth = useCallback((tooth: string) => {
    setData((prev) => ({ ...prev, [tooth]: createDefaultTooth() }));
  }, []);

  const loadState = useCallback((state: OdontogramData) => {
    setData(state);
  }, []);

  return { data, setSurface, setOverall, resetTooth, loadState };
}
