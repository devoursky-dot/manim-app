"use client";
import { useEffect, useRef } from "react";
import { Scene, Axes, FunctionGraph, Vector2 } from "manim-web";

export default function ManimPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. 씬(Scene) 생성 및 마우스 조작 설정
    const scene = new Scene(containerRef.current);
    scene.allowPan = true;  // 마우스 우클릭/드래그로 이동 가능
    scene.allowZoom = true; // 마우스 휠로 확대/축소 가능

    // 2. 좌표축(Axes) 생성
    const axes = new Axes({
      xRange: [-5, 5],
      yRange: [-1, 10],
      axisConfig: { color: "#FFFFFF" }
    });

    // 3. 지수함수 그래프 생성: f(x) = e^x
    const expGraph = new FunctionGraph((x) => Math.exp(x), {
      color: "#00FF00", // 초록색 그래프
      xRange: [-5, 2.3]  // 화면에 보일 범위
    });

    // 4. 화면에 추가
    scene.add(axes, expGraph);
    scene.render();

    return () => scene.dispose();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", backgroundColor: "#000" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}