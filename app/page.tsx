"use client";
import dynamic from "next/dynamic";

// ✨ 핵심: 서버 사이드 렌더링(SSR)을 끄고 클라이언트에서만 불러옵니다.
// 주의: ManimCanvas.tsx 파일이 있는 실제 경로에 맞게 수정해주세요! (예: './components/ManimCanvas')
const ManimCanvas = dynamic(() => import("./components/ManimCanvas"), {
  ssr: false,
  loading: () => <div className="text-white text-xl">그래프 로딩 중...</div>
});

export default function Home() {
  return (
    <main className="w-screen h-screen bg-gray-900 flex items-center justify-center p-8">
      {/* 이곳에 ManimCanvas가 들어갑니다. 
        SSR이 꺼져있으므로 브라우저에서 안전하게 WebGL이 실행됩니다.
      */}
      <ManimCanvas />
    </main>
  );
}