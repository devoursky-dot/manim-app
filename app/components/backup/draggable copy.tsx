"use client";
import React, { useState, useEffect, useRef } from "react";

interface DraggableProps {
  children: React.ReactNode;
  initialPos?: { x: number; y: number };
}

interface Position {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
}

export function Draggable({ children, initialPos = { x: 0, y: 0 } }: DraggableProps) {
  const [pos, setPos] = useState<Position>({ left: initialPos.x, top: initialPos.y });
  const [isDragging, setIsDragging] = useState(false);
  const [orientation, setOrientation] = useState<"horizontal" | "vertical" | undefined>(undefined);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStart = (clientX: number, clientY: number, target: EventTarget | null) => {
    // 입력 필드나 버튼 등을 클릭했을 때는 드래그 방지
    const el = target as HTMLElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "BUTTON" || el.tagName === "LABEL" || el.tagName === "SELECT")) {
      return;
    }
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    // 드래그 시작 시 클릭한 위치와 요소의 왼쪽 상단 모서리 사이의 거리 저장
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };

    // 드래그 중에는 항상 left/top 절대 좌표로 변환하여 제어
    setPos({ left: rect.left, top: rect.top });
    setIsDragging(true);
  };

  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY, e.target);
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      setPos({
        left: clientX - dragOffset.current.x,
        top: clientY - dragOffset.current.y,
      });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);

    const onEnd = () => {
      setIsDragging(false);
      if (!containerRef.current) return;

      // 화면 가장자리에 가까우면 스냅(Snap) 및 방향 전환
      const rect = containerRef.current.getBoundingClientRect();
      const { innerWidth, innerHeight } = window;
      const threshold = 50; // 스냅 거리 임계값
      const margin = 16;

      const distLeft = rect.left;
      const distRight = innerWidth - rect.right;
      const distTop = rect.top;
      const distBottom = innerHeight - rect.bottom;

      const minDist = Math.min(distLeft, distRight, distTop, distBottom);

      if (minDist < threshold) {
        if (minDist === distLeft) {
          setPos({ left: margin, top: rect.top });
          setOrientation("vertical");
        } else if (minDist === distRight) {
          setPos({ right: margin, top: rect.top });
          setOrientation("vertical");
        } else if (minDist === distTop) {
          setPos({ left: rect.left, top: margin });
          setOrientation("horizontal");
        } else if (minDist === distBottom) {
          setPos({ left: rect.left, bottom: margin });
          setOrientation("horizontal");
        }
      } else {
        // 가장자리에서 떨어지면 기본 상태(undefined)로 복귀하거나 현재 상태 유지
        // 여기서는 떨어지면 원래 모양으로 돌아가도록 설정
        setOrientation(undefined);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onEnd);
    };
  }, [isDragging]);

  // 자식 컴포넌트에 orientation prop 전달
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, { orientation });
    }
    return child;
  });

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: pos.left,
        top: pos.top,
        right: pos.right,
        bottom: pos.bottom,
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
      className="z-50 pointer-events-auto"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {childrenWithProps}
    </div>
  );
}