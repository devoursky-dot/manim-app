"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Presentation, MonitorPlay, Rocket, Home as HomeIcon, Menu, X } from "lucide-react";

const ManimApp = dynamic(() => import("./components/manim_app"), { ssr: false });
const LectureApp = dynamic(() => import("./components/lecture_test"), { ssr: false });

// --- [Canvas Matrix Rain Engine] ---
const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;
    const chars = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890@#$%^&*".split("");
    const fontSize = 16;
    let columns = 0;
    let drops: number[] = [];
    const setup = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = new Array(columns).fill(1);
    };
    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0F0"; 
      ctx.font = fontSize + "px 'Pretendard', sans-serif";
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(text, x, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      animationFrameId = requestAnimationFrame(draw);
    };
    setup(); draw();
    window.addEventListener("resize", setup);
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener("resize", setup); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }} />;
};

export default function Home() {
  const [activeApp, setActiveApp] = useState<"manim" | "lecture" | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 메뉴 확장 상태

  return (
    <div style={styles.mainWrapper}>
      {/* 1. 왼쪽 상단 플로팅 토글 버튼 (앱 실행 시에만 표시되거나 항상 표시 가능) */}
      {activeApp && (
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          style={styles.menuToggleBtn}
          title={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* 2. 숨김형 상단 메뉴바 (isMenuOpen 상태에 따라 노출) */}
      <nav style={{ 
        ...styles.topNavbar, 
        transform: (!activeApp || isMenuOpen) ? "translateY(0)" : "translateY(-100%)",
        opacity: (!activeApp || isMenuOpen) ? 1 : 0
      }}>
        <div style={styles.navLeft}>
          <Rocket size={24} color="#A5B4FC" style={{ transform: "rotate(-45deg)" }} />
          <span style={styles.navLogoText}>경남외고 지식저장소</span>
        </div>
        
        <div style={styles.navRight}>
          <button onClick={() => {setActiveApp(null); setIsMenuOpen(false);}} style={!activeApp ? styles.navBtnActive : styles.navBtn}>
            <HomeIcon size={18} />
            <span>메인 홈</span>
          </button>
          <button onClick={() => {setActiveApp("lecture"); setIsMenuOpen(false);}} style={activeApp === "lecture" ? styles.navBtnActive : styles.navBtn}>
            <Presentation size={18} />
            <span>판서 앱</span>
          </button>
          <button onClick={() => {setActiveApp("manim"); setIsMenuOpen(false);}} style={activeApp === "manim" ? styles.navBtnActive : styles.navBtn}>
            <MonitorPlay size={18} />
            <span>마님 앱</span>
          </button>
        </div>
      </nav>

      {/* 3. 메인 컨텐츠 영역 */}
      <main style={styles.contentArea}>
        {!activeApp ? (
          <div style={styles.heroSection}>
            <MatrixRain />
            <div style={styles.megaTitleWrapper}>
              <div style={styles.glitchContainer}>
                <h1 style={styles.megaNeonTitle}>경남외고 지식저장소</h1>
                <div style={styles.glitchLayer}>경남외고 지식저장소</div>
                <div style={styles.glitchLayer2}>경남외고 지식저장소</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            {activeApp === "manim" ? <ManimApp /> : <LectureApp />}
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes neonFlicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { text-shadow: 0 0 20px #A5B4FC, 0 0 50px #6366f1, 0 0 80px #6366f1; }
          20%, 22%, 24%, 55% { text-shadow: none; opacity: 0.7; }
        }
        @keyframes glitchEffect {
          0% { clip-path: inset(80% 0 0 0); transform: translate(-10px, -10px); }
          100% { clip-path: inset(0 0 0 0); transform: translate(0); }
        }
        @keyframes glitchEffect2 {
          0% { clip-path: inset(0 80% 0 0); transform: translate(10px, 10px); }
          100% { clip-path: inset(0 0 0 0); transform: translate(0); }
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
  // 토글 버튼 스타일 (왼쪽 상단)
  menuToggleBtn: {
    position: "fixed", top: "15px", left: "15px", zIndex: 110000,
    backgroundColor: "rgba(30, 30, 40, 0.7)", color: "white", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px", padding: "8px", cursor: "pointer", backdropFilter: "blur(10px)",
    display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s"
  },
  // 상단 메뉴바 (숨김 애니메이션 적용)
  topNavbar: {
    position: "fixed", top: 0, left: 0, height: "65px", width: "100%", 
    backgroundColor: "rgba(10, 10, 15, 0.95)", backdropFilter: "blur(15px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    display: "flex", alignItems: "center", justifyContent: "space-between", 
    padding: "0 20px 0 70px", zIndex: 100000,
    transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s",
  },
  navLeft: { display: "flex", alignItems: "center", gap: "12px" },
  navLogoText: { fontSize: "1.2rem", fontWeight: 800, color: "#EEF2FF" },
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
    flexDirection: "column", alignItems: "center", overflow: "hidden",
  },
  megaTitleWrapper: {
    position: "absolute", top: "25%", width: "90%", 
    display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 5,
  },
  glitchContainer: { position: "relative", width: "100%", textAlign: "center" },
  megaNeonTitle: {
    fontSize: "8vw", fontWeight: 950, color: "#E0E7FF",
    textShadow: "0 0 20px #A5B4FC, 0 0 50px #6366f1",
    whiteSpace: "nowrap", animation: "neonFlicker 5s infinite",
  },
  glitchLayer: {
    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
    fontSize: "8vw", fontWeight: 950, color: "#F0F", clipPath: "inset(80% 0 0 0)",
    animation: "glitchEffect 3s infinite", opacity: 0.8,
  },
  glitchLayer2: {
    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
    fontSize: "8vw", fontWeight: 950, color: "#0FF", clipPath: "inset(0 80% 0 0)",
    animation: "glitchEffect2 2s infinite", opacity: 0.8,
  },
};