"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Presentation, MonitorPlay, Rocket, Home as HomeIcon, LayoutDashboard } from "lucide-react";

const ManimApp = dynamic(() => import("./components/manim_app"), { ssr: false });
const LectureApp = dynamic(() => import("./components/lecture_test"), { ssr: false });

// --- [Canvas Starfield Engine] ---
const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let stars: { x: number; y: number; z: number; o: string }[] = [];
    const numStars = 800;
    const speed = 2;

    const setup = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width - canvas.width / 2,
          y: Math.random() * canvas.height - canvas.height / 2,
          z: Math.random() * canvas.width,
          o: `0.${Math.floor(Math.random() * 99)}`,
        });
      }
    };

    const draw = () => {
      ctx.fillStyle = "#000005"; // 깊은 심해 우주색
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < numStars; i++) {
        const star = stars[i];
        star.z -= speed;

        if (star.z <= 0) {
          star.z = canvas.width;
        }

        const sx = (star.x / star.z) * canvas.width + canvas.width / 2;
        const sy = (star.y / star.z) * canvas.height + canvas.height / 2;
        const size = (1 - star.z / canvas.width) * 3;

        ctx.fillStyle = `rgba(255, 255, 255, ${star.o})`;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    setup();
    draw();
    window.addEventListener("resize", setup);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", setup);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }} />;
};

export default function Home() {
  const [activeApp, setActiveApp] = useState<"manim" | "lecture" | null>(null);

  return (
    <div style={styles.mainWrapper}>
      {/* 1. 상단 고정 메뉴바 */}
      <nav style={styles.topNavbar}>
        <div style={styles.navLeft}>
          <Rocket size={24} color="#A5B4FC" style={{ transform: "rotate(-45deg)" }} />
          <span style={styles.navLogoText}>경남외고 지식저장소</span>
        </div>
        
        <div style={styles.navRight}>
          <button onClick={() => setActiveApp(null)} style={!activeApp ? styles.navBtnActive : styles.navBtn}>
            <HomeIcon size={18} />
            <span>메인 홈</span>
          </button>
          <button onClick={() => setActiveApp("lecture")} style={activeApp === "lecture" ? styles.navBtnActive : styles.navBtn}>
            <Presentation size={18} />
            <span>판서 앱</span>
          </button>
          <button onClick={() => setActiveApp("manim")} style={activeApp === "manim" ? styles.navBtnActive : styles.navBtn}>
            <MonitorPlay size={18} />
            <span>마님 앱</span>
          </button>
        </div>
      </nav>

      {/* 2. 메인 컨텐츠 영역 */}
      <main style={styles.contentArea}>
        {!activeApp ? (
          <div style={styles.heroSection}>
            {/* 실제 우주 스타필드 배경 */}
            <Starfield />

            {/* 기차 여행 글자 모션 */}
            <div style={styles.trainWrapper}>
              <div style={styles.textTrain}>
                <span style={styles.trainHead}>🚂</span>
                <span style={styles.trainText}>경남외고 지식저장소</span>
                <span style={styles.trainTrail}></span>
              </div>
            </div>

            <div style={styles.welcomeMessage}>
              <LayoutDashboard size={40} style={{ marginBottom: "20px", color: "#6366f1", opacity: 0.8 }} />
              <p>상단 메뉴에서 수업 도구를 선택해 주세요</p>
            </div>
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            {activeApp === "manim" ? <ManimApp /> : <LectureApp />}
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes textTrainMove {
          0% { transform: translateX(-120vw) translateY(15vh) rotate(-5deg); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(120vw) translateY(-15vh) rotate(5deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  mainWrapper: {
    width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
    backgroundColor: "#000", color: "white", fontFamily: "'Pretendard', sans-serif", overflow: "hidden",
  },
  topNavbar: {
    height: "60px", width: "100%", backgroundColor: "rgba(10, 10, 15, 0.95)",
    backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 30px", zIndex: 1000,
  },
  navLeft: { display: "flex", alignItems: "center", gap: "12px" },
  navLogoText: { fontSize: "1.3rem", fontWeight: 800, color: "#EEF2FF" },
  navRight: { display: "flex", gap: "10px" },
  navBtn: {
    display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px",
    backgroundColor: "transparent", border: "1px solid transparent", color: "#9CA3AF",
    borderRadius: "20px", cursor: "pointer", fontSize: "14px", fontWeight: 600,
  },
  navBtnActive: {
    display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px",
    backgroundColor: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.4)",
    color: "#A5B4FC", borderRadius: "20px", fontSize: "14px", fontWeight: 700,
  },
  contentArea: { flex: 1, width: "100%", position: "relative" },
  heroSection: {
    width: "100%", height: "100%", position: "relative", display: "flex",
    flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  trainWrapper: {
    position: "absolute", width: "100%", height: "100%", display: "flex",
    alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 5,
  },
  textTrain: {
    display: "flex", alignItems: "center", gap: "20px", animation: "textTrainMove 20s linear infinite",
    filter: "drop-shadow(0 0 20px rgba(99, 102, 241, 0.8))",
  },
  trainHead: { fontSize: "50px" },
  trainText: {
    fontSize: "3.5rem", fontWeight: 900, color: "#E0E7FF",
    textShadow: "0 0 10px #A5B4FC, 0 0 30px #6366f1", whiteSpace: "nowrap",
  },
  trainTrail: {
    width: "300px", height: "4px", background: "linear-gradient(to right, #6366f1, transparent)", borderRadius: "2px",
  },
  welcomeMessage: {
    zIndex: 10, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "14px", marginTop: "200px"
  }
};