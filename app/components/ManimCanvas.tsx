"use client";
import { useEffect, useRef, useState } from "react";
import { Scene, Axes, FunctionGraph, Create } from "manim-web";

export default function ManimCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(2);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [xMin, setXMin] = useState(-2 * Math.PI);
  const [xMax, setXMax] = useState(2 * Math.PI);
  const [yMin, setYMin] = useState(-2);
  const [yMax, setYMax] = useState(2);
  const [key, setKey] = useState(0); // 리렌더링 트리거용 키
  
  // 애니메이션 트리거 감지용 Ref (Play 버튼 클릭 시에만 애니메이션 실행)
  const prevKeyRef = useRef(-1);

  // 마우스 인터랙션 상태
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;

    setXMin(xCenter - (xRange * factor) / 2);
    setXMax(xCenter + (xRange * factor) / 2);
    setYMin(yCenter - (yRange * factor) / 2);
    setYMax(yCenter + (yRange * factor) / 2);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const dxPixels = e.clientX - lastMousePos.current.x;
    const dyPixels = e.clientY - lastMousePos.current.y;
    
    const { clientWidth, clientHeight } = containerRef.current;
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    const dxUnits = (dxPixels / clientWidth) * xRange;
    const dyUnits = (dyPixels / clientHeight) * yRange;

    setXMin(prev => prev - dxUnits);
    setXMax(prev => prev - dxUnits);
    setYMin(prev => prev + dyUnits);
    setYMax(prev => prev + dyUnits);

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 애니메이션 실행 여부 결정 (Play 버튼 클릭 시에만 애니메이션)
    const shouldAnimate = prevKeyRef.current !== key;
    prevKeyRef.current = key;

    const currentDuration = shouldAnimate ? duration : 0;

    // React의 중복 렌더링 방지를 위해 캔버스 초기화
    containerRef.current.innerHTML = "";

    let scene: any;

    const runAnimation = async () => {
      try {
        // 1. 씬 생성
        scene = new Scene(containerRef.current);

      // 2. 하얀색 좌표축 생성
      const axes = new Axes({
        xRange: [xMin, xMax, Math.PI / 2],
        yRange: [yMin, yMax, 1],
        axisConfig: { color: "#FFFFFF" }
      });

      // 3. 초록색 사인(sin) 그래프 생성
      const sinGraph = axes.plot((x) => Math.sin(x), {
  color: "#00FF00",
        xRange: [xMin, xMax, 0.1],
        strokeWidth: strokeWidth
      } as any);

      // 좌표축을 먼저 씬에 추가하여 좌표 계산이 올바르게 동작하도록 함
      scene.add(axes);

      // 4. 애니메이션 재생
      await scene.play(new Create(sinGraph, { runTime: currentDuration }));
    } catch (e) {
      console.error("Manim 렌더링 에러:", e);
    }
  };

  runAnimation();

  return () => {
    if (scene && typeof scene.dispose === 'function') {
      scene.dispose();
    }
  };

  }, [key, duration, strokeWidth, xMin, xMax, yMin, yMax]);

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full bg-gray-900 p-4">
      {/* 툴바 */}
      <div className="flex gap-6 bg-gray-800 p-4 rounded-lg shadow-lg text-white items-center z-10 border border-gray-700">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-mono">Duration: {duration}s</label>
          <input 
            type="range" 
            min="0.5" 
            max="5" 
            step="0.5" 
            value={duration} 
            onChange={(e) => setDuration(parseFloat(e.target.value))}
            className="w-32 accent-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-mono">X Range</label>
          <div className="flex gap-2">
            <input 
              type="number" 
              value={xMin} 
              onChange={(e) => setXMin(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 text-black rounded text-xs"
              step="0.1"
            />
            <input 
              type="number" 
              value={xMax} 
              onChange={(e) => setXMax(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 text-black rounded text-xs"
              step="0.1"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-mono">Thickness: {strokeWidth}px</label>
          <input 
            type="range" 
            min="1" 
            max="10" 
            step="1" 
            value={strokeWidth} 
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
            className="w-32 accent-green-500"
          />
        </div>
        <button 
          onClick={() => setKey(k => k + 1)}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded font-bold transition-colors shadow-md"
        >
          Play
        </button>
      </div>

      <div className="relative w-full flex-1 bg-black rounded-lg border border-gray-700 shadow-2xl overflow-hidden">
      {/* 캔버스가 그려질 공간 */}
        <div 
          ref={containerRef} 
          className="w-full h-full cursor-move"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}