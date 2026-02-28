import React, { useState, useRef, useCallback } from 'react';
import { Stage, Layer, Image, Rect, Line } from 'react-konva';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileUp, Hand, Pencil, Eraser, ZoomIn, ZoomOut, RotateCcw, Crop, Grip } from 'lucide-react';

// 최신 라이브러리 환경에 맞는 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const UltimateSmartBoard = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfImage, setPdfImage] = useState(null);
  const [lines, setLines] = useState([]);
  const [tool, setTool] = useState('pen');
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 }); // 캔버스 위치
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0, orient: 'horizontal' }); // 툴바 위치 및 방향
  const [bgColor, setBgColor] = useState('#ffffff');
  const [currentCrop, setCurrentCrop] = useState(null);
  
  const stageRef = useRef(null);
  const isDrawing = useRef(false);
  const fileInputRef = useRef(null);
  const toolbarRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // 초기 툴바 위치 설정 (화면 상단 중앙)
  React.useEffect(() => {
    setToolbarPos({ x: window.innerWidth / 2 - 220, y: 30, orient: 'horizontal' });
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfImage(null);
      setPdfFile(file);
    }
  };

  // --- [최적화 포인트] PDF 렌더링 고속화 로직 ---
  const onRenderSuccess = useCallback(async (page) => {
    // 1. 초기 렌더링 배율 최적화 (2 -> 1.5로 하향하여 속도 확보)
    const renderScale = 1.5; 
    const viewport = page.getViewport({ scale: renderScale });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d', { alpha: false }); // 알파 채널 비활성화로 성능 향상
    
    // 2. 렌더링 품질 옵션 최적화
    const renderContext = { 
      canvasContext: ctx, 
      viewport,
      intent: 'display' // 화면 표시용 고속 렌더링 모드
    };
    await page.render(renderContext).promise;
    
    // 3. 배경색 추출 (효율적인 메모리 접근)
    const pixel = ctx.getImageData(0, 0, 1, 1).data;
    const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
    setBgColor(hex);

    // 4. 여백 처리
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.15);
    ctx.fillRect(0, canvas.height * 0.85, canvas.width, canvas.height * 0.15);

    // 5. [핵심] toDataURL 대신 ImageBitmap 사용하여 지연 시간 제거
    try {
      const bitmap = await createImageBitmap(canvas);
      setPdfImage(bitmap);
    } catch (e) {
      // 구형 브라우저 호환성을 위한 폴백(Fallback)
      const img = new window.Image();
      img.src = canvas.toDataURL('image/jpeg', 0.8); // JPEG 압축으로 로딩 가속
      img.onload = () => setPdfImage(img);
    }
  }, []);

  const getRelativePointerPosition = (stage) => {
    const transform = stage.getAbsoluteTransform().copy().invert();
    const pos = stage.getPointerPosition();
    return transform.point(pos);
  };

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);

    if (tool === 'hand') return;
    if (tool === 'crop') {
      setCurrentCrop({ x: pos.x, y: pos.y, width: 0, height: 0, startX: pos.x, startY: pos.y });
      return;
    }

    isDrawing.current = true;
    setLines([...lines, { tool, points: [pos.x, pos.y], color: tool === 'eraser' ? 'white' : '#2563eb' }]);
  };

  const handleMouseMove = (e) => {
    const stage = e.target.getStage();
    const point = getRelativePointerPosition(stage);
    
    if (tool === 'hand') return;

    if (tool === 'crop' && currentCrop) {
      setCurrentCrop(prev => ({
        ...prev,
        x: Math.min(prev.startX, point.x),
        y: Math.min(prev.startY, point.y),
        width: Math.abs(point.x - prev.startX),
        height: Math.abs(point.y - prev.startY)
      }));
      return;
    }

    if (isDrawing.current) {
      const lastLine = lines[lines.length - 1];
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      setLines([...lines.slice(0, -1), lastLine]);
    }
  };

  const handleMouseUp = () => { 
    if (tool === 'crop' && currentCrop) {
      const { x, y, width, height } = currentCrop;
      if (width > 5 && height > 5) {
        const huge = 100000;
        setLines([...lines, 
          { tool: 'rect', x: -huge, y: -huge, width: huge * 2, height: huge + y, fill: bgColor },
          { tool: 'rect', x: -huge, y: y + height, width: huge * 2, height: huge, fill: bgColor },
          { tool: 'rect', x: -huge, y: y, width: huge + x, height: height, fill: bgColor },
          { tool: 'rect', x: x + width, y: y, width: huge, height: height, fill: bgColor }
        ]);
      }
      setCurrentCrop(null);
      setTool('pen');
      return;
    }
    isDrawing.current = false; 
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const speed = 1.15; // 줌 속도 약간 상향
    let newScale = e.evt.deltaY > 0 ? oldScale / speed : oldScale * speed;
    newScale = Math.max(0.2, Math.min(newScale, 5)); // 범위 5배로 확장

    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // --- 툴바 드래그 및 스냅 로직 ---
  const handleToolbarDragStart = (e) => {
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const handleToolbarDragEnd = (e) => {
    const clientX = e.clientX || e.changedTouches?.[0]?.clientX;
    const clientY = e.clientY || e.changedTouches?.[0]?.clientY;
    
    // 유효하지 않은 좌표 무시
    if (!clientX || !clientY) return;

    const iw = window.innerWidth;
    const ih = window.innerHeight;
    const margin = 20; // 화면 끝에서의 여백
    const snapDist = 100; // 자석 효과 감지 거리

    // [수정] 툴바의 실제 크기를 동적으로 계산 (줄바꿈 등으로 크기가 변할 수 있음)
    const rect = toolbarRef.current ? toolbarRef.current.getBoundingClientRect() : { width: 420, height: 60 };
    const tbW = rect.width;
    const tbH = rect.height;

    let nextOrient = toolbarPos.orient;
    let nextX = clientX;
    let nextY = clientY;

    // 1. 가장자리 감지 및 방향 결정 (상 -> 하 -> 좌 -> 우 순서)
    if (clientY < snapDist) { // 상단 스냅
        nextOrient = 'horizontal';
        nextY = margin;
        nextX = Math.max(margin, Math.min(clientX - tbW / 2, iw - tbW - margin));
    } else if (clientY > ih - snapDist) { // 하단 스냅
        nextOrient = 'horizontal';
        nextY = ih - tbH - margin; 
        nextX = Math.max(margin, Math.min(clientX - tbW / 2, iw - tbW - margin));
    } else if (clientX < snapDist) { // 좌측 스냅
        nextOrient = 'vertical';
        nextX = margin;
        nextY = Math.max(margin, Math.min(clientY - tbW / 2, ih - tbW - margin));
    } else if (clientX > iw - snapDist) { // 우측 스냅
        nextOrient = 'vertical';
        nextX = iw - tbH - margin;
        nextY = Math.max(margin, Math.min(clientY - tbW / 2, ih - tbW - margin));
    } else {
        // 허공에 놓았을 때: 드래그 오프셋을 적용하여 자연스럽게 위치 이동
        nextX = clientX - dragOffset.current.x;
        nextY = clientY - dragOffset.current.y;
        
        // 현재 방향에 맞춰 화면 밖으로 나가지 않도록 클램핑
        const currentW = nextOrient === 'horizontal' ? tbW : tbH;
        const currentH = nextOrient === 'horizontal' ? tbH : tbW;
        
        nextX = Math.max(margin, Math.min(nextX, iw - currentW - margin));
        nextY = Math.max(margin, Math.min(nextY, ih - currentH - margin));
    }

    setToolbarPos({ x: nextX, y: nextY, orient: nextOrient });
  };

  // 마스킹 여부 확인 및 토글 함수
  const hasMask = lines.some(line => line.tool === 'rect');
  
  const handleCropTool = () => {
    if (hasMask) {
      setLines(lines.filter(line => line.tool !== 'rect'));
      setTool('pen');
    } else {
      setTool(tool === 'crop' ? 'pen' : 'crop');
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#222', overflow: 'hidden' }}>
      {/* 플로팅 툴바 */}
      <div 
        ref={toolbarRef}
        draggable
        onDragStart={handleToolbarDragStart}
        onDragEnd={handleToolbarDragEnd}
        style={{
          position: 'fixed',
          left: toolbarPos.x,
          top: toolbarPos.y,
          display: 'flex',
          flexDirection: toolbarPos.orient === 'horizontal' ? 'row' : 'column',
          flexWrap: 'wrap', // [추가] 공간 부족 시 줄바꿈 허용
          maxWidth: '94vw', // [추가] 화면 너비를 넘지 않도록 제한
          maxHeight: '90vh', // [추가] 화면 높이를 넘지 않도록 제한
          overflow: 'auto', // [추가] 필요 시 스크롤 생성
          justifyContent: 'center', // [추가] 중앙 정렬
          alignItems: 'center',
          gap: '8px',
          padding: '10px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          zIndex: 1000,
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', // 부드러운 이동 애니메이션
          cursor: 'move'
        }}
      >
        {/* 드래그 핸들 */}
        <div style={{ color: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
            <Grip size={20} style={{ transform: toolbarPos.orient === 'horizontal' ? 'rotate(90deg)' : 'none' }} />
        </div>

        {/* 도구 모음 */}
        <div style={{ 
          display: 'flex', 
          flexDirection: toolbarPos.orient === 'horizontal' ? 'row' : 'column', 
          gap: '8px',
          flexWrap: 'wrap', // [추가] 내부 버튼들도 줄바꿈 허용
          justifyContent: 'center'
        }}>
          <button onClick={() => fileInputRef.current.click()} style={btnStyle} title="PDF 불러오기"><FileUp size={20}/></button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" hidden />
          
          <div style={toolbarPos.orient === 'horizontal' ? dividerHorizontal : dividerVertical} />
          
          <button onClick={() => setTool('hand')} style={tool === 'hand' ? activeBtn : btnStyle}><Hand size={20}/></button>
          <button onClick={() => setTool('pen')} style={tool === 'pen' ? activeBtn : btnStyle}><Pencil size={20}/></button>
          <button onClick={() => setTool('eraser')} style={tool === 'eraser' ? activeBtn : btnStyle}><Eraser size={20}/></button>
          <button onClick={handleCropTool} style={(tool === 'crop' || hasMask) ? activeBtn : btnStyle} title={hasMask ? "마스킹 해제" : "영역 잘라내기"}><Crop size={20}/></button>
        </div>
        
        <div style={toolbarPos.orient === 'horizontal' ? dividerHorizontal : dividerVertical} />

        {/* 줌 컨트롤 */}
        <div style={{ display: 'flex', flexDirection: toolbarPos.orient === 'horizontal' ? 'row' : 'column', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>{Math.round(stageScale * 100)}%</span>
          <button onClick={() => {setStageScale(1); setStagePos({x:0, y:0});}} style={btnStyle}><RotateCcw size={18}/></button>
        </div>
      </div>

      <div style={{ display: 'none' }}>
        {pdfFile && (
          <Document file={pdfFile}>
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

      <div style={{ width: '100%', height: '100%', cursor: tool === 'hand' ? 'grab' : 'crosshair' }}>
        <Stage
          width={window.innerWidth}
          height={window.innerHeight}
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
          draggable={tool === 'hand'}
          onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
          ref={stageRef}
        >
          <Layer>
            <Rect 
              width={window.innerWidth * 20} 
              height={window.innerHeight * 20} 
              x={-window.innerWidth * 10} 
              y={-window.innerHeight * 10} 
              fill={bgColor} 
            />
            {pdfImage && (
              <Image
                image={pdfImage}
                x={0} y={0}
                width={window.innerWidth}
                height={(window.innerWidth * pdfImage.height) / pdfImage.width}
                shadowBlur={5}
                shadowColor="rgba(0,0,0,0.1)"
              />
            )}
          </Layer>

          {/* 마스킹 레이어 (지우개 영향 받지 않음) */}
          <Layer>
            {lines.map((line, i) => {
              if (line.tool === 'rect') {
                return (
                  <Rect key={i} x={line.x} y={line.y} width={line.width} height={line.height} fill={line.fill} />
                );
              }
              return null;
            })}
          </Layer>

          {/* 판서 레이어 (지우개 동작) */}
          <Layer>
            {lines.map((line, i) => {
              if (line.tool !== 'rect') {
                return (
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
                );
              }
              return null;
            })}
            {currentCrop && (
              <Rect
                x={currentCrop.x} y={currentCrop.y} width={currentCrop.width} height={currentCrop.height}
                stroke="red" strokeWidth={2} dash={[5, 5]}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

const btnStyle = { padding: '8px', border: '1px solid #eee', background: '#fff', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center' };
const activeBtn = { ...btnStyle, background: '#eef2ff', border: '1px solid #6366f1', color: '#6366f1' };
const dividerHorizontal = { width: '1px', height: '20px', background: '#eee', margin: '0 8px' };
const dividerVertical = { width: '20px', height: '1px', background: '#eee', margin: '8px 0' };

export default UltimateSmartBoard;