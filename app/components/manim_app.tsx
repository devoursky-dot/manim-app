"use client";
import { useState, useRef, useEffect } from "react";
import { ViewportState, GraphOptions, PenOptions, Stroke, Point } from "./manim/data";
import { ToolGraph } from "./manim/tool_graph";
import { ToolPen } from "./manim/tool_pen";
import { Canvas } from "./manim/canvas";
import { Draggable } from "./manim/draggable";

export default function ManimApp() {
  // --- 기존 상태 ---
  const [viewport, setViewport] = useState<ViewportState>({ xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -2, yMax: 2 });
  const [options, setOptions] = useState<GraphOptions>({ duration: 2, strokeWidth: 4 });
  const [playKey, setPlayKey] = useState(0);

  // --- 추가된 판서 상태 ---
  const [penOptions, setPenOptions] = useState<PenOptions>({ isPenMode: false, color: "#FF3B30", width: 4 });
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const isDrawing = useRef(false);

  // --- 판서 드로잉 로직 (SVG 위에서 마우스 이벤트 처리) ---
  const getMousePos = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = (e as any).touches ? (e as any).touches[0].clientX : (e as any).clientX;
    const clientY = (e as any).touches ? (e as any).touches[0].clientY : (e as any).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!penOptions.isPenMode) return;
    isDrawing.current = true;
    const pos = getMousePos(e);
    setCurrentStroke({ points: [pos], color: penOptions.color, width: penOptions.width });
  };

  // 드로잉 중일 때는 화면 어디서든(툴바 위 포함) 이벤트를 받기 위해 window에 리스너 등록
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current || !penOptions.isPenMode) return;
      const pos = getMousePos(e);
      setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, pos] } : null);
    };

    const handleGlobalUp = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      
      // 현재 스트로크를 확정하여 저장
      setCurrentStroke(prev => {
        if (prev && prev.points.length > 1) {
          setStrokes(strokes => [...strokes, prev]);
        }
        return null;
      });
    };

    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchmove", handleGlobalMove);
    window.addEventListener("touchend", handleGlobalUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchmove", handleGlobalMove);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, [penOptions.isPenMode]);

  // --- 툴 액션 ---
  const undoLastStroke = () => setStrokes(prev => prev.slice(0, -1));
  const clearAllStrokes = () => setStrokes([]);

  // --- SVG 경로 렌더링 헬퍼 ---
  const renderPath = (stroke: Stroke) => {
    if (stroke.points.length === 0) return "";
    const d = stroke.points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
    return <path d={d} stroke={stroke.color} strokeWidth={stroke.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none touch-none">
      
      {/* 1. 배경 마님 캔버스 */}
      {/* 펜 모드일 때는 pointer-events-none을 주어 줌/드래그를 차단합니다 */}
      <div className={`absolute inset-0 z-0 ${penOptions.isPenMode ? "pointer-events-none" : "pointer-events-auto"}`}>
        <Canvas viewport={viewport} setViewport={setViewport} options={options} playKey={playKey} />
      </div>

      {/* 2. 투명 판서 레이어 (SVG Overlay) */}
      <svg 
        ref={svgRef}
        className={`absolute inset-0 w-full h-full z-10 ${penOptions.isPenMode ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"}`}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      >
        {strokes.map((stroke, index) => <g key={index}>{renderPath(stroke)}</g>)}
        {currentStroke && renderPath(currentStroke)}
      </svg>

      {/* 3. 상단 UI 배치 영역 */}
      <Draggable initialPos={{ x: 16, y: 16 }}>
        <ToolGraph 
          viewport={viewport} setViewport={setViewport}
          options={options} setOptions={setOptions}
          onPlay={() => setPlayKey(k => k + 1)}
        />
      </Draggable>

      <Draggable initialPos={{ x: 16, y: 140 }}>
        <ToolPen 
          penOptions={penOptions} setPenOptions={setPenOptions}
          onUndo={undoLastStroke} onClear={clearAllStrokes}
        />
      </Draggable>

    </div>
  );
}