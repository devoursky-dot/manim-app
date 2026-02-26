import React, { useRef } from "react";
import { ViewportState } from "./data";

export function useManimInteraction(
  viewport: ViewportState,
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>
) {
  const isMouseDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const touchState = useRef({
    mode: "IDLE" as "IDLE" | "PAN" | "ZOOM",
    startX: 0,
    startY: 0,
    startDist: 0,
    startViewport: null as ViewportState | null,
  });

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
    isMouseDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent, container: HTMLDivElement | null) => {
    if (!isMouseDragging.current || !container) return;

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
    isMouseDragging.current = false;
  };

  // --- 터치 이벤트 핸들러 (태블릿/모바일 지원) ---

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // 한 손가락: 팬(이동) 시작
      touchState.current.mode = "PAN";
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
      touchState.current.startViewport = { ...viewport };
    } else if (e.touches.length === 2) {
      // 두 손가락: 줌 시작
      touchState.current.mode = "ZOOM";
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchState.current.startDist = dist;
      touchState.current.startViewport = { ...viewport };
    }
  };

  const handleTouchMove = (e: React.TouchEvent, container: HTMLDivElement | null) => {
    if (!container || !touchState.current.startViewport) return;

    if (e.touches.length === 1 && touchState.current.mode === "PAN") {
      const touch = e.touches[0];
      const dxPixels = touch.clientX - touchState.current.startX;
      const dyPixels = touch.clientY - touchState.current.startY;

      const { clientWidth, clientHeight } = container;
      const v = touchState.current.startViewport;
      const xRange = v.xMax - v.xMin;
      const yRange = v.yMax - v.yMin;

      const dxUnits = (dxPixels / clientWidth) * xRange;
      const dyUnits = (dyPixels / clientHeight) * yRange;

      setViewport({
        ...v,
        xMin: v.xMin - dxUnits,
        xMax: v.xMax - dxUnits,
        yMin: v.yMin + dyUnits,
        yMax: v.yMax + dyUnits,
      });
    } else if (e.touches.length === 2 && touchState.current.mode === "ZOOM") {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      if (dist > 0 && touchState.current.startDist > 0) {
        const factor = touchState.current.startDist / dist;
        const v = touchState.current.startViewport;
        
        const xRange = v.xMax - v.xMin;
        const yRange = v.yMax - v.yMin;
        const xCenter = (v.xMin + v.xMax) / 2;
        const yCenter = (v.yMin + v.yMax) / 2;

        setViewport({
          ...v,
          xMin: xCenter - (xRange * factor) / 2,
          xMax: xCenter + (xRange * factor) / 2,
          yMin: yCenter - (yRange * factor) / 2,
          yMax: yCenter + (yRange * factor) / 2,
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      touchState.current.mode = "IDLE";
      touchState.current.startViewport = null;
    }
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