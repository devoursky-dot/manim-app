export const SNAP_CONFIG = {
  THRESHOLD: 20,
  MARGIN: 16,
};

export function calculateSnap(x: number, y: number, width: number, height: number, threshold: number, margin: number) {
  return {
    position: { left: x, top: y },
    orientation: "horizontal" as const
  };
}

export function calculateSnapWithinCanvas(x: number, y: number, width: number, height: number, pWidth: number, pHeight: number, threshold: number, margin: number) {
  return {
    position: { left: x, top: y },
    orientation: "horizontal" as const
  };
}