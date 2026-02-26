import React, { useRef } from "react";
import { ViewportState } from "./data";

export function useManimInteraction(
  viewport: ViewportState,
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>
) {
  const isMouseDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // 드래그 최적화를 위한 Refs
  const startViewportRef = useRef<ViewportState | null>(null);
  const panDeltaRef = useRef({ x: 0, y: 0 });

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

  const handleMouseDown = (e: React.MouseEvent, container: HTMLDivElement | null) => {
    isMouseDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    startViewportRef.current = { ...viewport };
    panDeltaRef.current = { x: 0, y: 0 };
  };

  const handleMouseMove = (e: React.MouseEvent, container: HTMLDivElement | null) => {
    if (!isMouseDragging.current || !container) return;

    const dxPixels = e.clientX - lastMousePos.current.x;
    const dyPixels = e.clientY - lastMousePos.current.y;

    // 델타 누적
    panDeltaRef.current.x += dxPixels;
    panDeltaRef.current.y += dyPixels;

    // 상태 업데이트 대신 CSS Transform 적용 (가상 이동)
    container.style.transform = `translate3d(${panDeltaRef.current.x}px, ${panDeltaRef.current.y}px, 0)`;

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent, container: HTMLDivElement | null) => {
    if (!isMouseDragging.current) return;
    isMouseDragging.current = false;

    if (container && startViewportRef.current) {
      // 드래그 종료 시 최종 좌표 계산 및 상태 업데이트
      const { clientWidth, clientHeight } = container;
      const v = startViewportRef.current;
      const xRange = v.xMax - v.xMin;
      const yRange = v.yMax - v.yMin;

      const dxUnits = (panDeltaRef.current.x / clientWidth) * xRange;
      const dyUnits = (panDeltaRef.current.y / clientHeight) * yRange;

      setViewport({
        ...v,
        xMin: v.xMin - dxUnits,
        xMax: v.xMax - dxUnits,
        yMin: v.yMin + dyUnits,
        yMax: v.yMax + dyUnits,
      });

      // CSS Transform 초기화
      container.style.transform = "none";
    }
    startViewportRef.current = null;
    panDeltaRef.current = { x: 0, y: 0 };
  };

  // --- 터치 이벤트 핸들러 (태블릿/모바일 지원) ---

  const handleTouchStart = (e: React.TouchEvent, container: HTMLDivElement | null) => {
    if (e.touches.length === 1) {
      // 한 손가락: 팬(이동) 시작
      touchState.current.mode = "PAN";
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
      touchState.current.startViewport = { ...viewport };
      if (container) container.style.transform = "none";
    } else if (e.touches.length === 2) {
      // 두 손가락: 줌 시작
      // 만약 팬 동작 중에 줌으로 넘어가는 경우, 현재까지의 이동을 초기화하거나 커밋해야 함
      // 여기서는 간단히 transform을 초기화하고 현재 뷰포트 기준으로 줌 시작
      if (container) container.style.transform = "none";

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

      // 상태 업데이트 대신 CSS Transform 적용
      container.style.transform = `translate3d(${dxPixels}px, ${dyPixels}px, 0)`;
      
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

  const handleTouchEnd = (e: React.TouchEvent, container: HTMLDivElement | null) => {
    // 팬 동작 종료 시 최종 위치 커밋
    if (touchState.current.mode === "PAN" && e.touches.length === 0 && container && touchState.current.startViewport) {
      const changedTouch = e.changedTouches[0];
      const dxPixels = changedTouch.clientX - touchState.current.startX;
      const dyPixels = changedTouch.clientY - touchState.current.startY;

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
      container.style.transform = "none";
    }

    if (e.touches.length === 0) {
      touchState.current.mode = "IDLE";
      touchState.current.startViewport = null;
      if (container) container.style.transform = "none";
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