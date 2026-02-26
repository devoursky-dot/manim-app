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
    lastTranslate: { x: 0, y: 0 },
    lastScale: 1,
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

  const getTouchDist = (touches: React.TouchList) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const handleTouchStart = (e: React.TouchEvent, container: HTMLDivElement | null) => {
    if (!container) return;

    // 1. PAN -> ZOOM 전환 시 튀는 현상 방지: 현재까지의 이동량을 viewport에 반영(Commit)하고 ZOOM 시작
    if (touchState.current.mode === "PAN" && e.touches.length === 2 && touchState.current.startViewport) {
      const { clientWidth, clientHeight } = container;
      const v = touchState.current.startViewport;
      const { x, y } = touchState.current.lastTranslate;
      
      const xRange = v.xMax - v.xMin;
      const yRange = v.yMax - v.yMin;
      const dxUnits = (x / clientWidth) * xRange;
      const dyUnits = (y / clientHeight) * yRange;

      // 현재 시점의 Viewport 계산
      const currentViewport = {
        ...v,
        xMin: v.xMin - dxUnits,
        xMax: v.xMax - dxUnits,
        yMin: v.yMin + dyUnits,
        yMax: v.yMax + dyUnits,
      };

      // ZOOM 시작을 위한 상태 업데이트
      touchState.current.startViewport = currentViewport;
      touchState.current.lastTranslate = { x: 0, y: 0 };
      container.style.transform = "none";
    }

    if (e.touches.length === 1) {
      // 한 손가락: 팬(이동) 시작
      touchState.current.mode = "PAN";
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
      touchState.current.startViewport = { ...viewport };
      touchState.current.lastTranslate = { x: 0, y: 0 };
      container.style.transform = "none";
    } else if (e.touches.length === 2) {
      // 두 손가락: 줌 시작
      touchState.current.mode = "ZOOM";
      touchState.current.startDist = getTouchDist(e.touches);
      // PAN -> ZOOM 전환 로직에서 startViewport가 설정되지 않은 경우(바로 두 손가락 터치 등) 처리
      if (!touchState.current.startViewport) {
        touchState.current.startViewport = { ...viewport };
      }
      touchState.current.lastScale = 1;
      container.style.transform = "none";
    }
  };

  const handleTouchMove = (e: React.TouchEvent, container: HTMLDivElement | null) => {
    if (!container || !touchState.current.startViewport) return;
    
    // 브라우저 기본 제스처(스크롤, 뒤로가기 등) 방지
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    if (e.touches.length === 1 && touchState.current.mode === "PAN") {
      const touch = e.touches[0];
      const dxPixels = touch.clientX - touchState.current.startX;
      const dyPixels = touch.clientY - touchState.current.startY;

      touchState.current.lastTranslate = { x: dxPixels, y: dyPixels };

      // 상태 업데이트 대신 CSS Transform 적용
      container.style.transform = `translate3d(${dxPixels}px, ${dyPixels}px, 0)`;
      
    } else if (e.touches.length === 2 && touchState.current.mode === "ZOOM") {
      const dist = getTouchDist(e.touches);

      if (dist > 0 && touchState.current.startDist > 0) {
        const scale = dist / touchState.current.startDist;
        touchState.current.lastScale = scale;
        // 줌 시각적 피드백 (CSS Scale)
        container.style.transform = `scale(${scale})`;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, container: HTMLDivElement | null) => {
    if (!container || !touchState.current.startViewport) return;

    // 최종 상태 계산을 위한 변수
    let finalViewport = { ...touchState.current.startViewport };
    let shouldUpdate = false;

    if (touchState.current.mode === "PAN") {
      const { clientWidth, clientHeight } = container;
      const { x, y } = touchState.current.lastTranslate;
      
      // 이동이 있었을 경우에만 업데이트
      if (x !== 0 || y !== 0) {
        const xRange = finalViewport.xMax - finalViewport.xMin;
        const yRange = finalViewport.yMax - finalViewport.yMin;
        const dxUnits = (x / clientWidth) * xRange;
        const dyUnits = (y / clientHeight) * yRange;

        finalViewport = {
          ...finalViewport,
          xMin: finalViewport.xMin - dxUnits,
          xMax: finalViewport.xMax - dxUnits,
          yMin: finalViewport.yMin + dyUnits,
          yMax: finalViewport.yMax + dyUnits,
        };
        shouldUpdate = true;
      }
    } else if (touchState.current.mode === "ZOOM") {
      const scale = touchState.current.lastScale;
      
      if (scale !== 1) {
        const xRange = finalViewport.xMax - finalViewport.xMin;
        const yRange = finalViewport.yMax - finalViewport.yMin;
        const xCenter = (finalViewport.xMin + finalViewport.xMax) / 2;
        const yCenter = (finalViewport.yMin + finalViewport.yMax) / 2;

        // Scale > 1 이면 확대(범위 축소), Scale < 1 이면 축소(범위 확대)
        const newXRange = xRange / scale;
        const newYRange = yRange / scale;

        finalViewport = {
          ...finalViewport,
          xMin: xCenter - newXRange / 2,
          xMax: xCenter + newXRange / 2,
          yMin: yCenter - newYRange / 2,
          yMax: yCenter + newYRange / 2,
        };
        shouldUpdate = true;
      }
    }

    // 상태 업데이트 및 정리
    if (shouldUpdate) {
      setViewport(finalViewport);
    }
    container.style.transform = "none";

    // 손가락이 모두 떨어지면 IDLE, 하나라도 남아있으면(예: 줌 하다가 한 손가락 뗌) PAN으로 전환하여 연속성 유지
    if (e.touches.length === 0) {
      touchState.current.mode = "IDLE";
      touchState.current.startViewport = null;
      touchState.current.lastTranslate = { x: 0, y: 0 };
      touchState.current.lastScale = 1;
    } else if (e.touches.length === 1) {
      // 줌 종료 후 남은 손가락으로 자연스럽게 팬 모드 전환
      touchState.current.mode = "PAN";
      touchState.current.startViewport = finalViewport;
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
      touchState.current.lastTranslate = { x: 0, y: 0 };
      touchState.current.lastScale = 1;
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