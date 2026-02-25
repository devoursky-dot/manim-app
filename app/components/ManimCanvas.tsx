// app/components/ManimCanvas.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Scene, Circle, Create } from 'manim-web';

export default function ManimCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 브라우저 자원을 사용하는 Manim 씬 초기화
    const scene = new Scene(containerRef.current);
    
    // 파란색 원 생성 (이 정보가 나중에 JSON 데이터가 됩니다)
    const circle = new Circle({ radius: 2, color: "#0070f3" });

    // 애니메이션 실행
    scene.play(new Create(circle));

    return () => scene.dispose(); // 페이지 나갈 때 리소스 정리
  }, []);

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden border border-gray-700 shadow-2xl">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}