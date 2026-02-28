"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
// [변경] 방금 저장한 최신 판서 앱 파일을 불러옵니다. 
// 파일 경로가 ./components/lecture_test.jsx 인지 확인해주세요.
const ManimApp = dynamic(() => import("./components/manim_app"), { ssr: false });
const LectureApp = dynamic(() => import("./components/lecture_test"), { ssr: false });
import { Presentation, MonitorPlay, ChevronLeft } from "lucide-react";

export default function Home() {
  // 현재 실행할 앱 상태 관리
  const [activeApp, setActiveApp] = useState<"manim" | "lecture" | null>(null);

  // 1. 선택 화면 (Home Menu)
  if (!activeApp) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>수업 도구 선택</h1>
        <div style={styles.menuGrid}>
          {/* 판서 앱 선택 카드 */}
          <div 
            style={styles.card} 
            onClick={() => setActiveApp("lecture")}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#3d3d3d")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2c2c2c")}
          >
            <Presentation size={80} color="#3498db" />
            <h2 style={styles.cardTitle}>PDF 판서 앱</h2>
            <p style={styles.cardDesc}>PDF 로드, 영역 발췌 및 무한 판서</p>
          </div>

          {/* 마님 앱 선택 카드 */}
          <div 
            style={styles.card} 
            onClick={() => setActiveApp("manim")}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#3d3d3d")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2c2c2c")}
          >
            <MonitorPlay size={80} color="#e74c3c" />
            <h2 style={styles.cardTitle}>마님(Manim) 앱</h2>
            <p style={styles.cardDesc}>수학 및 과학 애니메이션 시각화</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. 앱 실행 화면
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", backgroundColor: "#333" }}>
      {/* 메뉴로 돌아가기 버튼 (수업 중 방해되지 않도록 우하단 배치) */}
      <button 
        onClick={() => setActiveApp(null)} 
        style={styles.backBtn}
        title="메뉴로 돌아가기"
      >
        <ChevronLeft size={20} /> 메뉴로 돌아가기
      </button>

      {/* 선택된 앱 렌더링 */}
      {activeApp === "manim" ? <ManimApp /> : <LectureApp />}
    </div>
  );
}

// --- [스타일 정의] ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: "100vw",
    height: "100vh",
    backgroundColor: "#1a1a1a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontFamily: "'Pretendard', sans-serif",
  },
  title: {
    marginBottom: "50px",
    fontSize: "3rem",
    fontWeight: "bold",
  },
  menuGrid: {
    display: "flex",
    gap: "30px",
  },
  card: {
    width: "350px",
    padding: "40px",
    backgroundColor: "#2c2c2c",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "center",
    border: "2px solid #444",
  },
  cardTitle: {
    marginTop: "20px",
    fontSize: "1.8rem",
  },
  cardDesc: {
    marginTop: "10px",
    color: "#aaa",
    lineHeight: "1.5",
  },
  backBtn: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: 99999, // 판서 레이어보다 항상 위에 있도록 설정
    padding: "12px 20px",
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "white",
    border: "1px solid #555",
    borderRadius: "30px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    backdropFilter: "blur(10px)",
    fontSize: "14px",
    fontWeight: "bold"
  },
};