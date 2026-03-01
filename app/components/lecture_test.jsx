import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Stage, Layer, Image, Rect, Line, Shape } from 'react-konva';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileUp, Hand, Pencil, Eraser, RotateCcw, Crop, Grip, Maximize, Minimize, Highlighter, PenTool, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

// 최신 라이브러리 환경에 맞는 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

// 헬퍼 함수: 스테이지 상대 좌표 구하기 (컴포넌트 외부로 이동하여 재생성 방지)
const getRelativePointerPosition = (stage) => {
  const transform = stage.getAbsoluteTransform().copy().invert();
  const pos = stage.getPointerPosition();
  return transform.point(pos);
};

// 색상 팔레트 (컴포넌트 외부로 이동)
const colorPalette = [
  '#000000', '#333333', '#666666', '#999999', '#FFFFFF',
  '#FF0000', '#FFA500', '#FFFF00', '#008000', '#0000FF',
  '#4B0082', '#800080', '#FFC0CB', '#A52A2A', '#00FFFF',
  '#008080', '#000080', '#808000', '#800000', '#FF00FF'
];

// --- [분리된 툴바 컴포넌트] ---
const FloatingToolbar = React.memo(({ 
  tool, setTool, 
  pens, activePenId, setActivePenId, updateActivePen, 
  stageScale, onZoomChange, onResetZoom,
  isFullScreen, toggleFullScreen,
  hasMask, handleCropTool,
  onFileChange,
  onOpenPageSelector,
  currPage, numPages, onPrevPage, onNextPage
}) => {
  const [showPenSettings, setShowPenSettings] = useState(false);
  const [penSettingsPos, setPenSettingsPos] = useState({ top: 0, left: 0 });
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  const [sliderPos, setSliderPos] = useState({ top: 0, left: 0 });

  const toolbarRef = useRef(null);
  const fileInputRef = useRef(null);
  const zoomControlRef = useRef(null);
  const sliderRef = useRef(null);
  const penBtnRefs = useRef([]);
  const penSettingsRef = useRef(null);

  const activePen = pens[activePenId];

  // 이벤트 전파 중단 헬퍼
  const stopPropagation = (e) => e.stopPropagation();

  // 줌 슬라이더 위치 계산
  React.useEffect(() => {
    if (showZoomSlider && zoomControlRef.current) {
      const rect = zoomControlRef.current.getBoundingClientRect();
      setSliderPos({ top: rect.top - 60, left: rect.left + rect.width / 2 - 70 });
    }
  }, [showZoomSlider]);

  // 펜 설정 메뉴 위치 계산
  React.useEffect(() => {
    const activeBtnRef = penBtnRefs.current[activePenId];
    if (showPenSettings && activeBtnRef) {
      const rect = activeBtnRef.getBoundingClientRect();
      setPenSettingsPos({ top: rect.top - 160, left: rect.left + rect.width / 2 - 110 });
    }
  }, [showPenSettings, activePenId]);

  // 외부 클릭 시 팝업 닫기
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (showZoomSlider && zoomControlRef.current && !zoomControlRef.current.contains(event.target) && sliderRef.current && !sliderRef.current.contains(event.target)) {
        setShowZoomSlider(false);
      }
      const activeBtnRef = penBtnRefs.current[activePenId];
      if (showPenSettings && activeBtnRef && !activeBtnRef.contains(event.target) && 
          penSettingsRef.current && !penSettingsRef.current.contains(event.target) &&
          !penBtnRefs.current.some(ref => ref && ref.contains(event.target))) {
        setShowPenSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showZoomSlider, showPenSettings, activePenId]);

  return (
    <div 
      ref={toolbarRef}
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        maxWidth: '94vw',
        maxHeight: '90vh',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        padding: '10px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        zIndex: 1000,
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onOpenPageSelector} style={btnStyle} title="페이지 목록"><LayoutGrid size={20}/></button>
        <button onClick={() => fileInputRef.current.click()} style={btnStyle} title="PDF 불러오기"><FileUp size={20}/></button>
        <input type="file" ref={fileInputRef} onChange={onFileChange} accept="application/pdf" hidden />
        
        <div style={dividerHorizontal} />
        
        <button onClick={() => setTool('hand')} style={tool === 'hand' ? activeBtn : btnStyle}><Hand size={20}/></button>
        
        {pens.map((pen, index) => (
          <div key={index} style={{ position: 'relative' }}>
            <button 
              ref={el => penBtnRefs.current[index] = el}
              onClick={() => {
                if (tool === 'pen' && activePenId === index) {
                  setShowPenSettings(!showPenSettings);
                } else {
                  setTool('pen');
                  setActivePenId(index);
                  setShowPenSettings(false); 
                }
              }} 
              style={(tool === 'pen' && activePenId === index) ? activeBtn : btnStyle}
              title={`펜 ${index + 1} (클릭하여 설정)`}
            >
              {pen.type === 'highlighter' ? <Highlighter size={20}/> : pen.type === 'pressure' ? <PenTool size={20}/> : <Pencil size={20}/>}
              <div style={{ position: 'absolute', bottom: 4, right: 4, width: 6, height: 6, borderRadius: '50%', backgroundColor: pen.color, border: '1px solid rgba(0,0,0,0.1)' }}/>
            </button>
          </div>
        ))}

        <div style={{ position: 'relative' }}>
          {showPenSettings && createPortal(
            <div ref={penSettingsRef} 
              onMouseDown={stopPropagation}
              onTouchStart={stopPropagation}
              onMouseMove={stopPropagation}
              onTouchMove={stopPropagation}
              style={{
              position: 'fixed',
              top: penSettingsPos.top,
              left: penSettingsPos.left,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '12px',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minWidth: '220px'
            }}>
              <div style={{ display: 'flex', gap: '5px', justifyContent: 'space-between' }}>
                <button onClick={() => updateActivePen({ type: 'basic', width: 3 })} style={activePen.type === 'basic' ? activeBtn : btnStyle} title="기본펜"><Pencil size={18}/></button>
                <button onClick={() => updateActivePen({ type: 'pressure', width: 3 })} style={activePen.type === 'pressure' ? activeBtn : btnStyle} title="필압펜"><PenTool size={18}/></button>
                <button onClick={() => updateActivePen({ type: 'highlighter', width: 20 })} style={activePen.type === 'highlighter' ? activeBtn : btnStyle} title="형광펜"><Highlighter size={18}/></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>두께: {activePen.width}</span>
                <input type="range" min="1" max="50" value={activePen.width} onChange={(e) => updateActivePen({ width: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#6366f1' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {colorPalette.map(c => (
                  <div key={c} onClick={() => updateActivePen({ color: c })} 
                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, border: activePen.color === c ? '2px solid #6366f1' : '1px solid #ddd', cursor: 'pointer', transform: activePen.color === c ? 'scale(1.1)' : 'none', transition: 'transform 0.2s' }} 
                  />
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>

        <button onClick={() => setTool('eraser')} style={tool === 'eraser' ? activeBtn : btnStyle}><Eraser size={20}/></button>
        <button onClick={handleCropTool} style={(tool === 'crop' || hasMask) ? activeBtn : btnStyle} title={hasMask ? "마스킹 해제" : "영역 잘라내기"}><Crop size={20}/></button>
      </div>
      
      <div style={dividerHorizontal} />

      <div ref={zoomControlRef} style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center', position: 'relative' }}>
        <span onClick={() => setShowZoomSlider(!showZoomSlider)} style={{ fontSize: '13px', color: '#666', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }} title="클릭하여 확대/축소">
          {Math.round(stageScale * 100)}%
        </span>

        {showZoomSlider && createPortal(
          <div ref={sliderRef} 
            onMouseDown={stopPropagation}
            onTouchStart={stopPropagation}
            onMouseMove={stopPropagation}
            onTouchMove={stopPropagation}
            style={{
            touchAction: 'none',
            position: 'fixed',
            top: sliderPos.top,
            left: sliderPos.left,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '8px 12px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            minWidth: '140px'
          }}>
            <input type="range" min="0.2" max="5" step="0.1" value={stageScale} onChange={(e) => onZoomChange(parseFloat(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: '#6366f1' }} />
          </div>,
          document.body
        )}

        <button onClick={onResetZoom} style={btnStyle}><RotateCcw size={18}/></button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '0 4px' }}>
          <button onClick={onPrevPage} disabled={currPage <= 1} style={currPage <= 1 ? disabledBtnStyle : btnStyle} title="이전 페이지"><ChevronLeft size={18}/></button>
          <span style={{ fontSize: '12px', color: '#555', minWidth: '40px', textAlign: 'center', userSelect: 'none' }}>{currPage} / {numPages || '-'}</span>
          <button onClick={onNextPage} disabled={!numPages || currPage >= numPages} style={(!numPages || currPage >= numPages) ? disabledBtnStyle : btnStyle} title="다음 페이지"><ChevronRight size={18}/></button>
        </div>

        <button onClick={toggleFullScreen} style={btnStyle} title={isFullScreen ? "전체화면 종료" : "전체화면"}>
          {isFullScreen ? <Minimize size={18}/> : <Maximize size={18}/>}
        </button>
      </div>
    </div>
  );
});

const UltimateSmartBoard = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfImage, setPdfImage] = useState(null);
  const [lines, setLines] = useState([]);
  const [tool, setTool] = useState('pen');
  const [pens, setPens] = useState([
    { type: 'basic', color: '#000000', width: 3 },
    { type: 'basic', color: '#FF0000', width: 3 }
  ]);
  const [activePenId, setActivePenId] = useState(0);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 }); // 캔버스 위치
  const [bgColor, setBgColor] = useState('#ffffff');
  const [currentCrop, setCurrentCrop] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [currPage, setCurrPage] = useState(1);
  const [showPageSelector, setShowPageSelector] = useState(false);
  
  const stageRef = useRef(null);
  const isDrawing = useRef(false);
  const lastDist = useRef(0);
  const lastCenter = useRef(null);
  const linesRef = useRef(lines); // lines 상태를 추적하는 ref

  // lines가 변경될 때마다 ref 업데이트 (렌더링 중에 수행)
  linesRef.current = lines;

  const activePen = pens[activePenId];
  const updateActivePen = useCallback((updates) => {
    setPens(prev => prev.map((p, i) => i === activePenId ? { ...p, ...updates } : p));
  }, [activePenId]);

  // 전체화면 변경 감지
  React.useEffect(() => {
    const handleFullScreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfImage(null);
      setPdfFile(file);
      setCurrPage(1);
    }
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setShowPageSelector(true);
  }, []);

  const changePage = useCallback((pageNumber) => {
    setCurrPage(pageNumber);
    setShowPageSelector(false);
    setPdfImage(null);
    setLines([]); // 새 페이지 판서 초기화
    setStageScale(1); // 줌 배율 100%로 리셋
    setStagePos({ x: 0, y: 0 }); // 화면 위치 좌상단으로 리셋
  }, []);

  const handlePrevPage = useCallback(() => {
    if (currPage > 1) changePage(currPage - 1);
  }, [currPage, changePage]);

  const handleNextPage = useCallback(() => {
    if (numPages && currPage < numPages) changePage(currPage + 1);
  }, [currPage, numPages, changePage]);

  // --- [최적화 포인트] PDF 렌더링 고속화 로직 ---
  const onRenderSuccess = useCallback(async (page) => {
    // 1. 렌더링 배율 상향 (1.5 -> 3.0)으로 업스케일링 (고화질 적용)
    const renderScale = 3.0; 
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
    
    // 3. 배경색 추출 (주조색 계산: 가장 많이 사용된 색상 선택)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const colorCounts = {};
    let maxCount = 0;
    let dominantColor = '#ffffff';

    // 전체 픽셀을 검사하면 느리므로 50픽셀 간격으로 샘플링하여 성능 최적화
    const step = 4 * 50; 
    for (let i = 0; i < data.length; i += step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
      if (colorCounts[hex] > maxCount) {
        maxCount = colorCounts[hex];
        dominantColor = hex;
      }
    }
    setBgColor(dominantColor);

    // 4. 여백 처리 제거 (PDF 상하단 내용이 가려지는 문제 해결)
    // 원본 PDF 내용을 그대로 보여줍니다.

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

  // 배경색 밝기 판별 함수
  const isDarkBackground = (color) => {
    if (!color) return false;
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq < 128;
  };

  const handleMouseDown = useCallback((e) => {
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);

    if (tool === 'hand') return;
    if (tool === 'crop') {
      setCurrentCrop({ x: pos.x, y: pos.y, width: 0, height: 0, startX: pos.x, startY: pos.y });
      return;
    }

    isDrawing.current = true;
    
    let newLine = { 
      tool, 
      points: [pos.x, pos.y], 
      color: tool === 'eraser' ? 'white' : activePen.color,
      strokeWidth: tool === 'eraser' ? 30 : activePen.width,
      opacity: 1,
      penType: tool === 'pen' ? activePen.type : 'basic'
    };

    if (tool === 'pen') {
      if (activePen.type === 'highlighter') {
        // newLine.color = '#fde047'; // activePen.color 사용
        // newLine.strokeWidth = 20;  // activePen.width 사용
        newLine.opacity = 0.4;
      } else if (activePen.type === 'pressure') {
        // newLine.color = '#000000'; // activePen.color 사용
      }
    }

    setLines(prev => [...prev, newLine]);
  }, [tool, activePen]); // lines 의존성 제거 (함수형 업데이트 사용) -> 하지만 lines를 직접 참조하지 않고 setLines(prev => ...) 사용하므로 lines 의존성 필요 없음. Wait, handleMouseDown uses lines in setLines(prev => [...prev, newLine]). Correct.

  const handleMouseMove = useCallback((e) => {
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
      setLines(prev => {
        const lastLine = { ...prev[prev.length - 1] };
        lastLine.points = lastLine.points.concat([point.x, point.y]);
        return [...prev.slice(0, -1), lastLine];
      });
    }
  }, [tool, currentCrop]);

  const handleMouseUp = useCallback(() => { 
    if (tool === 'crop' && currentCrop) {
      const { x, y, width, height } = currentCrop;
      if (width > 5 && height > 5) {
        const huge = 100000;
        setLines(prev => [...prev, 
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
  }, [tool, currentCrop, bgColor]);

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    
    // 화면 중앙을 기준으로 확대/축소
    const pointer = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };

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
  }, []);

  // 줌 슬라이더 변경 핸들러 (화면 중앙 기준)
  const handleZoomChange = useCallback((newScale) => {
    const stage = stageRef.current;
    
    if (stage) {
      const oldScale = stage.scaleX();
      const pointer = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      };

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      setStageScale(newScale);
      setStagePos({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    } else {
      setStageScale(newScale);
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    setStageScale(1);
    setStagePos({x:0, y:0});
  }, []);

  // 핀치 줌 헬퍼 함수
  const getDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const getCenter = (p1, p2) => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  };

  // Stage 터치 이벤트 핸들러 (핀치 줌 포함)
  const handleTouchStart = useCallback((e) => {
    if (e.evt.touches.length === 1) {
      handleMouseDown(e);
    } else if (e.evt.touches.length === 2) {
      isDrawing.current = false; // 그리기 중단
      const p1 = { x: e.evt.touches[0].clientX, y: e.evt.touches[0].clientY };
      const p2 = { x: e.evt.touches[1].clientX, y: e.evt.touches[1].clientY };
      lastDist.current = getDistance(p1, p2);
      lastCenter.current = getCenter(p1, p2);
    }
  }, [handleMouseDown]);

  const handleTouchMove = useCallback((e) => {
    if (e.evt.touches.length === 1) {
      handleMouseMove(e);
    } else if (e.evt.touches.length === 2) {
      e.evt.preventDefault(); // 브라우저 줌 방지
      const p1 = { x: e.evt.touches[0].clientX, y: e.evt.touches[0].clientY };
      const p2 = { x: e.evt.touches[1].clientX, y: e.evt.touches[1].clientY };
      
      if (!lastCenter.current) return;

      const newDist = getDistance(p1, p2);
      const newCenter = getCenter(p1, p2);
      const distRatio = newDist / lastDist.current;

      const stage = stageRef.current;
      const oldScale = stage.scaleX();
      let newScale = oldScale * distRatio;
      newScale = Math.max(0.2, Math.min(newScale, 5));

      const mousePointTo = {
        x: (lastCenter.current.x - stage.x()) / oldScale,
        y: (lastCenter.current.y - stage.y()) / oldScale,
      };

      const newPos = {
        x: newCenter.x - mousePointTo.x * newScale,
        y: newCenter.y - mousePointTo.y * newScale,
      };

      setStageScale(newScale);
      setStagePos(newPos);

      lastDist.current = newDist;
      lastCenter.current = newCenter;
    }
  }, [handleMouseMove]);

  const handleTouchEnd = useCallback((e) => {
    lastDist.current = 0;
    lastCenter.current = null;
    handleMouseUp(e);
  }, [handleMouseUp]);

  // 마스킹 여부 확인 및 토글 함수
  const hasMask = lines.some(line => line.tool === 'rect');
  
  const handleCropTool = useCallback(() => {
    // linesRef.current를 사용하여 최신 lines 상태에 접근
    const currentLines = linesRef.current;
    const isMasked = currentLines.some(line => line.tool === 'rect');

    if (isMasked) {
      setLines(prev => prev.filter(line => line.tool !== 'rect'));
      setTool('pen');
    } else {
      setTool(prev => prev === 'crop' ? 'pen' : 'crop');
    }
  }, []);

  // 메인 캔버스 영역 메모이제이션 (툴바 이동 시 리렌더링 방지)
  const boardContent = React.useMemo(() => (
    <>
      <div style={{ display: 'none' }}>
        {pdfFile && (
          <Document file={pdfFile} onLoadSuccess={onDocumentLoadSuccess}>
            <Page 
              pageNumber={currPage} 
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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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

          {/* 마스킹 레이어 */}
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

          {/* 판서 레이어 */}
          <Layer>
            {lines.map((line, i) => {
              if (line.tool !== 'rect') {
                if (line.penType === 'pressure') {
                  return (
                    <Line
                      key={i}
                      points={line.points}
                      stroke={line.color}
                      strokeWidth={line.strokeWidth}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      opacity={0.8}
                    />
                  );
                }
                return (
                  <Line
                    key={i}
                    points={line.points}
                    stroke={line.color}
                    strokeWidth={line.strokeWidth}
                    tension={line.penType === 'highlighter' ? 0 : 0.4}
                    lineCap="round"
                    lineJoin="round"
                    opacity={line.opacity || 1}
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
    </>
  ), [pdfFile, pdfImage, lines, tool, stageScale, stagePos, bgColor, currentCrop, onRenderSuccess, handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel, currPage, onDocumentLoadSuccess]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#222', overflow: 'hidden' }}>
      {/* 플로팅 툴바 */}
      <FloatingToolbar 
        tool={tool} setTool={setTool}
        pens={pens} activePenId={activePenId} setActivePenId={setActivePenId} updateActivePen={updateActivePen}
        stageScale={stageScale} onZoomChange={handleZoomChange} onResetZoom={handleResetZoom}
        isFullScreen={isFullScreen} toggleFullScreen={toggleFullScreen}
        hasMask={hasMask} handleCropTool={handleCropTool}
        onFileChange={handleFileChange}
        onOpenPageSelector={() => setShowPageSelector(true)}
        currPage={currPage}
        numPages={numPages}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
      />

      {/* 페이지 선택 모달 */}
      {showPageSelector && pdfFile && (
        <div style={modalOverlayStyle} onClick={() => setShowPageSelector(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>페이지 선택</h3>
            <Document file={pdfFile}>
              <div style={gridStyle}>
                {Array.from(new Array(numPages), (el, index) => (
                  <div 
                    key={`page_${index + 1}`} 
                    onClick={() => changePage(index + 1)} 
                    style={{
                      ...thumbnailStyle,
                      border: currPage === index + 1 ? '2px solid #6366f1' : '1px solid #eee',
                      backgroundColor: currPage === index + 1 ? '#eef2ff' : 'white'
                    }}
                  >
                    <div style={{ pointerEvents: 'none' }}>
                      <Page pageNumber={index + 1} width={150} renderTextLayer={false} renderAnnotationLayer={false} />
                    </div>
                    <span style={{ marginTop: '8px', fontSize: '14px', fontWeight: '500', color: '#555' }}>{index + 1}</span>
                  </div>
                ))}
              </div>
            </Document>
          </div>
        </div>
      )}

      {boardContent}
    </div>
  );
};

const btnStyle = { padding: '8px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' };
const activeBtn = { ...btnStyle, background: '#eef2ff', border: '1px solid #6366f1', color: '#6366f1' };
const disabledBtnStyle = { ...btnStyle, opacity: 0.5, cursor: 'not-allowed', background: '#f3f4f6' };
const dividerHorizontal = { width: '1px', height: '20px', background: '#eee', margin: '0 8px' };
const dividerVertical = { width: '20px', height: '1px', background: '#eee', margin: '8px 0' };

const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
  backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  backdropFilter: 'blur(5px)'
};

const modalContentStyle = {
  width: '80%', height: '80%', backgroundColor: 'white',
  borderRadius: '16px', padding: '24px', overflowY: 'auto',
  boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
  display: 'flex', flexDirection: 'column'
};

const gridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: '20px', padding: '10px', width: '100%'
};

const thumbnailStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  cursor: 'pointer', padding: '10px', borderRadius: '12px',
  transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
};

export default UltimateSmartBoard;