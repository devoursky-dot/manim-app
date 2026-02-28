export interface ViewportState {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface GraphOptions {
  duration: number;
  strokeWidth: number;
}

export interface PenOptions {
  isPenMode: boolean;
  color: string;
  width: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
}