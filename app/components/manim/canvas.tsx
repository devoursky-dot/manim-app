"use client";
import React, { useEffect, useRef, useState } from "react";
import { ViewportState, GraphOptions } from "./data";
import { useManimInteraction } from "./interaction";
import { renderManimScene } from "./render";

interface ManimCanvasProps {
  viewport: ViewportState;
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
  options: GraphOptions;
  playKey: number; // 애니메이션 재시작 트리거
}

export function Canvas({ viewport, setViewport, options, playKey }: ManimCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevKeyRef = useRef(-1);

  // 커스텀 훅 가져오기 (줌/드래그 로직)
  const { handleWheel, handleMouseDown, handleMouseMove, handleMouseUp } = useManimInteraction(viewport, setViewport);

  useEffect(() => {
    if (!containerRef.current) return;

    const shouldAnimate = prevKeyRef.current !== playKey;
    prevKeyRef.current = playKey;
    const currentDuration = shouldAnimate ? options.duration : 0;

    containerRef.current.innerHTML = "";
    let scene: any = null;

    const runAnimation = async () => {
      try {
        if (!containerRef.current) return;
        
        // [핵심 변경점] 분리된 렌더링 모듈을 호출하여 화면을 그립니다.
        scene = await renderManimScene(
          containerRef.current,
          viewport,
          options,
          currentDuration
        );

      } catch (e) {
        console.error("Manim 렌더링 에러:", e);
      }
    };

    runAnimation();

    // 컴포넌트가 사라지거나 재랜더링 될 때 이전 씬 메모리 정리
    return () => {
      if (scene && typeof scene.dispose === 'function') scene.dispose();
    };
  }, [playKey, options, viewport]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full cursor-move"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => handleMouseMove(e, containerRef.current)}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}