import React, { useRef } from "react";
import { ViewportState } from "./data";

export function useManimInteraction(
  viewport: ViewportState,
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>
) {
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

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

  return { handleWheel, handleMouseDown, handleMouseMove, handleMouseUp };
}