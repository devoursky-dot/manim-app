"use client";

/*
필수 설치
npm install react-pdf pdfjs-dist fabric lucide-react
*/

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Canvas, Rect, PencilBrush } from "fabric";
import {
  FileUp,
  ZoomIn,
  ZoomOut,
  PenTool,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Crop,
  MousePointer2,
  Move,
  LayoutGrid,
} from "lucide-react";

// react-pdf 라이브러리는 브라우저 API(DOMMatrix 등)를 사용하므로 SSR을 비활성화해야 합니다.
const Document = dynamic(() => import("react-pdf").then((mod) => mod.Document), {
  ssr: false,
});
const Page = dynamic(() => import("react-pdf").then((mod) => mod.Page), {
  ssr: false,
});

/* ================================
   MAIN COMPONENT
================================ */

export default function LectureApp() {
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currPage, setCurrPage] = useState(1);

  const [viewMode, setViewMode] = useState("EXPLORE");
  const [scale, setScale] = useState(1.5);

  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [toolbarPos, setToolbarPos] = useState({ x: 20, y: 20, orient: "vertical" });

  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  const [isPanning, setIsPanning] = useState(false);
  const [isLassoMode, setIsLassoMode] = useState(false);

  const [showPageSelector, setShowPageSelector] = useState(false);
  const lassoRectRef = useRef(null);
  const panLastRef = useRef(null);

  /* ================================
     PDF WORKER INIT
  ================================= */
  useEffect(() => {
    import("react-pdf").then((mod) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
    });
  }, []);

  /* ================================
     FABRIC INIT
  ================================= */

  useEffect(() => {
    if (!canvasRef.current) return;
    // 캔버스를 초기화합니다. 크기는 나중에 PDF 로드 시 조정됩니다.

    const canvas = new Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "rgba(0,0,0,0)",
      isDrawingMode: true,
      selection: false, // 기본 선택 비활성화
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 4;
    canvas.freeDrawingBrush.color = "#ff4757";

    fabricRef.current = canvas;

    /* ---------- mouse down ---------- */

    canvas.on("mouse:down", (opt) => {
      const e = opt.e;

      if (isLassoMode) {
        const pointer = opt.scenePoint;

        const rect = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: "rgba(52,152,219,0.2)",
          stroke: "#3498db",
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });

        lassoRectRef.current = rect;
        canvas.add(rect);
        canvas.isDrawingMode = false;
        return;
      }

      if (isPanning) {
        panLastRef.current = e;
      }
    });

    /* ---------- mouse move ---------- */

    canvas.on("mouse:move", (opt) => {
      const e = opt.e;

      if (isLassoMode && lassoRectRef.current) {
        const pointer = opt.scenePoint;
        const rect = lassoRectRef.current;

        rect.set({
          width: pointer.x - rect.left,
          height: pointer.y - rect.top,
        });

        canvas.renderAll();
        return;
      }

      if (isPanning && panLastRef.current) {
        const dx = e.clientX - panLastRef.current.clientX;
        const dy = e.clientY - panLastRef.current.clientY;

        setCanvasOffset((prev) => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }));

        panLastRef.current = e;
      }
    });

    /* ---------- mouse up ---------- */

    canvas.on("mouse:up", () => {
      if (isLassoMode && lassoRectRef.current) {
        setIsLassoMode(false);

        const rect = lassoRectRef.current;
        lassoRectRef.current = null;

        canvas.remove(rect);
        canvas.renderAll();

        setViewMode("LASSO_BOARD");
        setCanvasOffset({ x: 0, y: 0 });
      }

      panLastRef.current = null;
    });

    /* ---------- resize ---------- */

    const handleResize = () => {
      canvas.setWidth(window.innerWidth);
      canvas.setHeight(window.innerHeight);
      canvas.renderAll();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // 모드 변경에 따른 캔버스 설정 업데이트
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    
    if (viewMode === "WRITE") {
      canvas.isDrawingMode = true;
      canvas.backgroundColor = "rgba(0,0,0,0)";
    } else if (viewMode === "LASSO_BOARD") {
      canvas.isDrawingMode = false;
      canvas.backgroundColor = "#1e3a34"; // 칠판 모드 배경색
    } else {
      canvas.isDrawingMode = false;
    }
    canvas.requestRenderAll();
  }, [viewMode]);

  // 줌/팬 상태 업데이트 시 캔버스 설정 (필요한 경우)
  useEffect(() => {
    // isPanning, isLassoMode 등은 ref로 관리되거나 이벤트 핸들러 내에서 참조되므로
    // 별도 업데이트가 필요 없을 수 있으나, 상태 의존성이 있다면 여기서 처리
  }, [isPanning, isLassoMode]);

  // PDF 페이지 로드 성공 시 캔버스 크기 및 줌 동기화
  const handlePageLoadSuccess = (page) => {
    if (!fabricRef.current) return;
    
    // page.view = [x, y, w, h] (원본 크기)
    const originalWidth = page.view[2];
    const originalHeight = page.view[3];
    
    fabricRef.current.setDimensions({
      width: originalWidth * scale,
      height: originalHeight * scale,
    });
    fabricRef.current.setZoom(scale);
  };

  /* ================================
     TOOLBAR DRAG
  ================================= */

  const handleToolbarDrag = (e) => {
    const clientX = e.clientX || e.changedTouches?.[0]?.clientX;
    const clientY = e.clientY || e.changedTouches?.[0]?.clientY;
    if (!clientX || !clientY) return;

    const iw = window.innerWidth;
    const ih = window.innerHeight;

    let nextPos = { x: clientX - 30, y: clientY - 30, orient: "vertical" };

    if (clientY < 100) nextPos = { x: clientX - 150, y: 10, orient: "horizontal" };
    else if (clientY > ih - 100) nextPos = { x: clientX - 150, y: ih - 85, orient: "horizontal" };
    else if (clientX < iw / 2) nextPos = { x: 10, y: clientY - 150, orient: "vertical" };
    else nextPos = { x: iw - 85, y: clientY - 150, orient: "vertical" };

    setToolbarPos(nextPos);
  };

  /* ================================
     TOOL FUNCTIONS
  ================================= */

  const enablePen = () => {
    if (!fabricRef.current) return;
    fabricRef.current.isDrawingMode = true;
    setIsPanning(false);
  };

  const enableSelect = () => {
    if (!fabricRef.current) return;
    fabricRef.current.isDrawingMode = false;
    setIsPanning(false);
  };

  const enablePan = () => {
    if (!fabricRef.current) return;
    fabricRef.current.isDrawingMode = false;
    setIsPanning(true);
  };

  const startLasso = () => {
    if (!fabricRef.current) return;
    fabricRef.current.isDrawingMode = false;
    setIsPanning(false);
    setIsLassoMode(true);
  };

  const clearCanvas = () => {
    if (!fabricRef.current) return;
    const bg = fabricRef.current.backgroundColor;
    fabricRef.current.clear();
    fabricRef.current.backgroundColor = bg;
  };

  /* ================================
     UI
  ================================= */

  return (
    <div style={rootStyle}>
      <div style={pdfWrapper}>
        {pdfFile ? (
          <div
            style={{
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transformOrigin: "top left",
              transition: isPanning ? "none" : "transform 0.1s ease-out",
              position: "relative",
              display: "inline-block",
            }}
          >
            <Document file={pdfFile} onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setShowPageSelector(true);
            }}>
              <div style={{ position: "relative" }}>
                {viewMode !== "LASSO_BOARD" && (
                  <Page 
                    pageNumber={currPage} 
                    scale={scale} 
                    renderTextLayer={false} 
                    renderAnnotationLayer={false} 
                    onLoadSuccess={handlePageLoadSuccess}
                  />
                )}
                <canvas 
                  ref={canvasRef} 
                  style={{ 
                    position: "absolute", 
                    top: 0, 
                    left: 0,
                    // EXPLORE 모드에서도 캔버스는 보이지만 클릭은 통과시켜 드래그 등을 가능하게 함
                    pointerEvents: (viewMode === "WRITE" || viewMode === "LASSO_BOARD") ? "auto" : "none" 
                  }} 
                />
              </div>
            </Document>
          </div>
        ) : (
          <div style={emptyState}>PDF 파일 선택</div>
        )}
      </div>

      <div
        draggable
        onDragEnd={handleToolbarDrag}
        onTouchEnd={handleToolbarDrag}
        style={{
          ...toolbar,
          left: toolbarPos.x,
          top: toolbarPos.y,
          flexDirection: toolbarPos.orient === "horizontal" ? "row" : "column",
        }}
      >
        <div style={handleStyle}>⠿</div>

        {viewMode === "EXPLORE" ? (
          <>
            <label style={btn}>
              <FileUp />
              <input hidden type="file" accept="application/pdf" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPdfFile(URL.createObjectURL(file));
                }
              }} />
            </label>

            <button style={btn} onClick={() => setViewMode("WRITE")}>
              <PenTool />
            </button>

            <button
              style={btn}
              onClick={() => {
                setViewMode("WRITE");
                setTimeout(startLasso, 50);
              }}
            >
              <Crop />
            </button>

            <button style={btn} onClick={() => setShowPageSelector(true)}>
              <LayoutGrid />
            </button>

            <button style={btn} onClick={() => setCurrPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft />
            </button>

            <button style={btn} onClick={() => setCurrPage((p) => Math.min(numPages || p, p + 1))}>
              <ChevronRight />
            </button>
          </>
        ) : (
          <>
            <button style={btn} onClick={() => setViewMode("EXPLORE")}>
              <ChevronLeft />
            </button>

            <button style={btn} onClick={enablePen}>
              <PenTool />
            </button>

            <button style={btn} onClick={enableSelect}>
              <MousePointer2 />
            </button>

            <button style={btn} onClick={enablePan}>
              <Move />
            </button>

            <button style={btn} onClick={clearCanvas}>
              <Trash2 />
            </button>

            <button style={btn} onClick={() => setScale((s) => s + 0.2)}>
              <ZoomIn />
            </button>

            <button style={btn} onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}>
              <ZoomOut />
            </button>
          </>
        )}
      </div>

      {showPageSelector && numPages > 0 && (
        <div style={modalOverlay} onClick={() => setShowPageSelector(false)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <Document file={pdfFile}>
              <div style={gridLayout}>
                {Array.from({ length: numPages }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      ...pageCard,
                      border: currPage === i + 1 ? "3px solid #3498db" : "3px solid transparent",
                    }}
                    onClick={() => {
                      setCurrPage(i + 1);
                      setShowPageSelector(false);
                    }}
                  >
                    <Page pageNumber={i + 1} width={200} renderTextLayer={false} renderAnnotationLayer={false} />
                    <p style={pageLabel}>{i + 1}</p>
                  </div>
                ))}
              </div>
            </Document>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================
   STYLES
================================ */

const rootStyle = {
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  background: "#2c3e50",
  position: "relative",
};

const pdfWrapper = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center", // 중앙 정렬
  height: "100%",
  overflow: "hidden", // 스크롤 대신 transform 이동 사용
  position: "relative",
};

const toolbar = {
  position: "fixed",
  display: "flex",
  background: "#1e1e1e",
  padding: 12,
  borderRadius: 20,
  gap: 10,
  zIndex: 1000,
};

const btn = {
  background: "#333",
  color: "white",
  border: "none",
  padding: 10,
  borderRadius: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const handleStyle = {
  cursor: "move",
  color: "#888",
  fontSize: 20,
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.8)",
  zIndex: 2000,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backdropFilter: "blur(5px)",
};

const modalContent = {
  width: "80%",
  height: "80%",
  backgroundColor: "#1e1e1e",
  borderRadius: 20,
  padding: 30,
  overflowY: "auto",
  boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
};

const gridLayout = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 20,
};

const pageCard = {
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  borderRadius: 8,
  overflow: "hidden",
  background: "#333",
  padding: 10,
  transition: "transform 0.2s",
};

const pageLabel = {
  color: "white",
  marginTop: 10,
  fontWeight: "bold",
};

const emptyState = {
  color: "#95a5a6",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100%",
};