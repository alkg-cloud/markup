import 'server-only';

export interface PinCoords {
  scrollX: number;
  scrollY: number;
  viewportWidth: number;
  viewportHeight: number;
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
}

const REQUIRED: (keyof PinCoords)[] = [
  'scrollX',
  'scrollY',
  'viewportWidth',
  'viewportHeight',
  'bboxX',
  'bboxY',
  'bboxW',
  'bboxH',
];

export function serializePinCoords(c: PinCoords): string {
  return JSON.stringify(c);
}

export function parsePinCoords(raw: string | null | undefined): PinCoords | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    for (const k of REQUIRED) {
      if (typeof obj[k] !== 'number' || !Number.isFinite(obj[k])) return null;
    }
    return obj as unknown as PinCoords;
  } catch {
    return null;
  }
}

export interface ScreenPosResult {
  visible: boolean;
  x: number;
  y: number;
}

const DEFAULT_TOLERANCE = 200;

export function computePinScreenPosition(
  pin: PinCoords,
  current: { scrollX: number; scrollY: number; tolerance?: number },
): ScreenPosResult {
  const tol = current.tolerance ?? DEFAULT_TOLERANCE;
  const dx = Math.abs(current.scrollX - pin.scrollX);
  const dy = Math.abs(current.scrollY - pin.scrollY);
  if (dx > tol || dy > tol) return { visible: false, x: 0, y: 0 };
  return {
    visible: true,
    x: pin.bboxX - current.scrollX,
    y: pin.bboxY - current.scrollY,
  };
}
