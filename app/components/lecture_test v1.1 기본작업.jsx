import React, { useState, useRef, useCallback } from 'react';
import { Stage, Layer, Image, Rect, Line } from 'react-konva';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileUp, Hand, Pencil, Eraser, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// PDF Worker 설정 (가장 안정적인 CDN 방식 또는 패키지 내부 방식 선택)
// Next.js 환경에서는 아래와 같이 외부 URL을 사용하는 것이 설정이 꼬이지 않아 편리합니다.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const UltimateSmartBoard = () => {
  const [pdfFile, setPdfFile] = useState(null); // 실제 파일 객체
  const [pdfImage, setPdfImage] = useState(null); // 렌더링된 이미지 데이터
  const [lines, setLines] = useState([]);
  const [tool, setTool] = useState('pen');
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  
  const stageRef = useRef(null);
  const isDrawing = useRef(false);
  const fileInputRef = useRef(null);

  // --- 파일 선택 핸들러 ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfImage(null); // 기존 이미지 초기화
      setPdfFile(file);  // 새 파일 로드 시작
    }
  };

  // --- PDF 렌더링 및 크롭 처리 ---
  const onRenderSuccess = useCallback(async (page) => {
    // 1. 고해상도 렌더링을 위한 설정
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: 2 * dpr }); 
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    
    // 2. 캔버스에 PDF 그리기
    const renderContext = { canvasContext: ctx, viewport };
    await page.render(renderContext).promise;
    
    // 3. 백지 처리 (상단 15%, 하단 15%)
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.15);
    ctx.fillRect(0, canvas.height * 0.85, canvas.width, canvas.height - (canvas.height * 0.85));

    // 4. 결과물을 Konva 이미지로 변환
    const img = new window.Image();
    img.src = canvas.toDataURL();
    img.onload = () => setPdfImage(img);
  }, []);

  // --- 판서 좌표 계산 (행렬 역연산) ---
  const getRelativePointerPosition = (stage) => {
    const transform = stage.getAbsoluteTransform().copy().invert();
    const pos = stage.getPointerPosition();
    return transform.point(pos);
  };

  const handleMouseDown = (e) => {
    if (tool === 'hand') return;
    isDrawing.current = true;
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    setLines([...lines, { tool, points: [pos.x, pos.y], color: tool === 'eraser' ? 'white' : '#2563eb' }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current || tool === 'hand') return;
    const stage = e.target.getStage();
    const point = getRelativePointerPosition(stage);
    
    setLines(prevLines => {
      const newLines = [...prevLines];
      const lastLine = { ...newLines[newLines.length - 1] };
      lastLine.points = [...lastLine.points, point.x, point.y];
      newLines[newLines.length - 1] = lastLine;
      return newLines;
    });
  };

  const handleMouseUp = () => { isDrawing.current = false; };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const speed = 1.1;
    let newScale = e.evt.deltaY > 0 ? oldScale / speed : oldScale * speed;
    // [수정] 확대/축소 범위를 0.5배 ~ 3배로 제한
    newScale = Math.max(0.5, Math.min(newScale, 3));

    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handleDragEnd = (e) => {
    setStagePos({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#333' }}>
      {/* 툴바 */}
      <div style={toolbarStyle}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => fileInputRef.current.click()} style={btnStyle} title="PDF 불러오기">
            <FileUp size={20}/>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="application/pdf" 
            hidden 
          />
          <div style={divider} />
          <button onClick={() => setTool('hand')} style={tool === 'hand' ? activeBtn : btnStyle}><Hand size={20}/></button>
          <button onClick={() => setTool('pen')} style={tool === 'pen' ? activeBtn : btnStyle}><Pencil size={20}/></button>
          <button onClick={() => setTool('eraser')} style={tool === 'eraser' ? activeBtn : btnStyle}><Eraser size={20}/></button>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#666' }}>Zoom: {Math.round(stageScale * 100)}%</span>
          <button onClick={() => {setStageScale(1); setStagePos({x:0, y:0});}} style={btnStyle}><RotateCcw size={18}/></button>
        </div>
      </div>

      {/* PDF 렌더링용 임시 영역 (숨김) */}
      <div style={{ display: 'none' }}>
        {pdfFile && (
          <Document file={pdfFile} error={<div>PDF를 로드할 수 없습니다.</div>}>
            <Page 
              pageNumber={1} 
              onRenderSuccess={onRenderSuccess} 
              width={window.innerWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        )}
      </div>

      {/* 전자칠판 */}
      <div style={{ flex: 1, cursor: tool === 'hand' ? 'grab' : 'crosshair' }}>
        <Stage
          width={window.innerWidth}
          height={window.innerHeight - 60}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
          draggable={tool === 'hand'}
          ref={stageRef}
        >
          <Layer>
            <Rect 
              width={window.innerWidth * 10} 
              height={window.innerHeight * 10} 
              x={-window.innerWidth * 5} 
              y={-window.innerHeight * 5} 
              fill="#ffffff" 
            />
            
            {pdfImage && (
              <Image
                image={pdfImage}
                x={0} y={0}
                width={window.innerWidth}
                height={(window.innerWidth * pdfImage.height) / pdfImage.width}
                shadowBlur={10}
                shadowColor="rgba(0,0,0,0.1)"
              />
            )}
          </Layer>

          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.color === 'white' ? 30 : 3}
                tension={0.4}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={line.color === 'white' ? 'destination-out' : 'source-over'}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

// 스타일 (생략 없이 유지)
const toolbarStyle = { height: '60px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 100, borderBottom: '1px solid #ddd' };
const btnStyle = { padding: '8px', border: '1px solid #eee', background: '#fff', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center' };
const activeBtn = { ...btnStyle, background: '#eef2ff', border: '1px solid #6366f1', color: '#6366f1' };
const divider = { width: '1px', height: '20px', background: '#eee', margin: '0 8px' };

export default UltimateSmartBoard;