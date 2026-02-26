// 전체 화면의 설정 (뷰포트)
export interface ViewportState {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

// 툴바에서 설정하는 그래프 옵션
export interface GraphOptions {
  duration: number;
  strokeWidth: number;
}

// --- [추가된 판서 데이터 규격] ---
export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export interface PenOptions {
  isPenMode: boolean; // 펜 모드 활성화 여부 (true면 드래그 중지, 판서 시작)
  color: string;
  width: number;
}