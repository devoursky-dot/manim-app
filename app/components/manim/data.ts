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