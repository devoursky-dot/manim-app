"use client";
import { useState } from "react";
import { ViewportState, GraphOptions } from "./manim/data";
import { ToolGraph } from "./manim/tool_graph";
import { Canvas } from "./manim/canvas";

export default function ManimApp() {
  // 전체 상태 관리 (중앙 집중)
  const [viewport, setViewport] = useState<ViewportState>({
    xMin: -2 * Math.PI,
    xMax: 2 * Math.PI,
    yMin: -2,
    yMax: 2,
  });

  const [options, setOptions] = useState<GraphOptions>({
    duration: 2,
    strokeWidth: 4,
  });

  const [playKey, setPlayKey] = useState(0);

  return (
    // 전체 화면, 오버레이 UI 레이아웃
    <div className="relative w-full h-screen bg-black overflow-hidden">
      
      {/* 1. 배경 캔버스 (z-index 낮음) */}
      <div className="absolute inset-0 z-0">
        <Canvas 
          viewport={viewport} setViewport={setViewport} 
          options={options} playKey={playKey} 
        />
      </div>

      {/* 2. 전면 툴바 UI (z-index 높음, 화면 좌상단에 띄움) */}
      <div className="absolute top-4 left-4 z-10 pointer-events-auto">
        <ToolGraph 
          viewport={viewport} setViewport={setViewport}
          options={options} setOptions={setOptions}
          onPlay={() => setPlayKey(k => k + 1)}
        />
      </div>

    </div>
  );
}