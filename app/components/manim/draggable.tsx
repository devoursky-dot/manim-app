"use client";
import React, { useState, useEffect, useRef } from "react";

interface DraggableProps {
  children: React.ReactNode;
  initialPos?: { x: number; y: number };
}

export function Draggable({ children, initialPos = { x: 0, y: 0 } }: DraggableProps) {
  const [pos, setPos] = useState(initialPos);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const handleStart = (clientX: number, clientY: number, target: EventTarget | null) => {
    // 입력 필드나 버튼 등을 클릭했을 때는 드래그 방지
    const el = target as HTMLElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "BUTTON" || el.tagName === "LABEL" || el.tagName === "SELECT")) {
      return;
    }
    setIsDragging(true);
    dragStart.current = { x: clientX, y: clientY };
    startPos.current = { ...pos };
  };

  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY, e.target);
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;
      setPos({ x: startPos.current.x + dx, y: startPos.current.y + dy });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);

    const onEnd = () => setIsDragging(false);

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

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
      className="z-50 pointer-events-auto"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {children}
    </div>
  );
}