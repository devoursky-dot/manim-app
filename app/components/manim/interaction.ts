import React, { useRef } from "react";
import { ViewportState } from "./data";

export function useManimInteraction(
  viewport: ViewportState,
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>
) {
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef<number | null>(null);

  const handleWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const xRange = viewport.xMax - viewport.xMin;
    const yRange = viewport.yMax - viewport.yMin;
    const xCenter = (viewport.xMin + viewport.xMax) / 2;
    const yCenter = (viewport.yMin + viewport.yMax) / 2;

    setViewport({
      ...viewport,
      xMin: xCenter - (xRange * factor) / 2,
      xMax: xCenter + (xRange * factor) / 2,
      yMin: yCenter - (yRange * factor) / 2,
      yMax: yCenter + (yRange * factor) / 2,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent, container: HTMLDivElement | null) => {
    if (!isDragging.current || !container) return;

    const dxPixels = e.clientX - lastMousePos.current.x;
    const dyPixels = e.clientY - lastMousePos.current.y;
    
    const { clientWidth, clientHeight } = container;
    const xRange = viewport.xMax - viewport.xMin;
    const yRange = viewport.yMax - viewport.yMin;

    const dxUnits = (dxPixels / clientWidth) * xRange;
    const dyUnits = (dyPixels / clientHeight) * yRange;

    setViewport(prev => ({
      ...prev,
      xMin: prev.xMin - dxUnits,
      xMax: prev.xMax - dxUnits,
      yMin: prev.yMin + dyUnits,
      yMax: prev.yMax + dyUnits,
    }));

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // --- 터치 이벤트 핸들러 (태블릿/모바일 지원) ---

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // 한 손가락: 이동 시작
      isDragging.current = true;
      lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      // 두 손가락: 핀치 줌 시작
      isDragging.current = false; // 줌 동작 중에는 이동 중지
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent, container: HTMLDivElement | null) => {
    if (!container) return;

    if (e.touches.length === 1 && isDragging.current) {
      // 한 손가락 이동 (Pan)
      const touch = e.touches[0];
      const dxPixels = touch.clientX - lastMousePos.current.x;
      const dyPixels = touch.clientY - lastMousePos.current.y;

      const { clientWidth, clientHeight } = container;
      const xRange = viewport.xMax - viewport.xMin;
      const yRange = viewport.yMax - viewport.yMin;

      const dxUnits = (dxPixels / clientWidth) * xRange;
      const dyUnits = (dyPixels / clientHeight) * yRange;

      setViewport((prev) => ({
        ...prev,
        xMin: prev.xMin - dxUnits,
        xMax: prev.xMax - dxUnits,
        yMin: prev.yMin + dyUnits,
        yMax: prev.yMax + dyUnits,
      }));

      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      // 두 손가락 확대/축소 (Pinch Zoom)
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      if (lastTouchDistance.current !== null && lastTouchDistance.current > 0) {
        const factor = lastTouchDistance.current / dist; // 거리가 멀어지면 factor < 1 (확대), 가까워지면 factor > 1 (축소)
        const xRange = viewport.xMax - viewport.xMin;
        const yRange = viewport.yMax - viewport.yMin;
        const xCenter = (viewport.xMin + viewport.xMax) / 2;
        const yCenter = (viewport.yMin + viewport.yMax) / 2;

        setViewport((prev) => ({
          ...prev,
          xMin: xCenter - (xRange * factor) / 2,
          xMax: xCenter + (xRange * factor) / 2,
          yMin: yCenter - (yRange * factor) / 2,
          yMax: yCenter + (yRange * factor) / 2,
        }));
      }
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    lastTouchDistance.current = null;
  };

  return {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}