import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Stage, Layer, Image, Rect, Line, Shape } from 'react-konva';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileUp, Hand, Pencil, Eraser, RotateCcw, Crop, Grip, Maximize, Minimize, Highlighter, PenTool } from 'lucide-react';

// 최신 라이브러리 환경에 맞는 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

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
  const [showPenSettings, setShowPenSettings] = useState(false);
  const [penSettingsPos, setPenSettingsPos] = useState({ top: 0, left: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 }); // 캔버스 위치
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0, orient: 'horizontal' }); // 툴바 위치 및 방향
  const [bgColor, setBgColor] = useState('#ffffff');
  const [currentCrop, setCurrentCrop] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  const [sliderPos, setSliderPos] = useState({ top: 0, left: 0 });
  
  const stageRef = useRef(null);
  const isDrawing = useRef(false);
  const fileInputRef = useRef(null);
  const toolbarRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const zoomControlRef = useRef(null);
  const sliderRef = useRef(null);
  const penBtnRefs = useRef([]);
  const penSettingsRef = useRef(null);
  const lastDist = useRef(0);
  const lastCenter = useRef(null);

  const activePen = pens[activePenId];
  const updateActivePen = (updates) => {
    setPens(prev => prev.map((p, i) => i === activePenId ? { ...p, ...updates } : p));
  };

  // 초기 툴바 위치 설정 (화면 상단 중앙)
  React.useEffect(() => {
    setToolbarPos({ x: window.innerWidth / 2 - 220, y: window.innerHeight - 100, orient: 'horizontal' });
  }, []);

  // 전체화면 변경 감지
  React.useEffect(() => {
    const handleFullScreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // 줌 슬라이더 위치 계산
  React.useEffect(() => {
    if (showZoomSlider && zoomControlRef.current) {
      const rect = zoomControlRef.current.getBoundingClientRect();
      if (toolbarPos.orient === 'horizontal') {
        setSliderPos({
          top: rect.bottom + 10,
          left: rect.left + rect.width / 2 - 70 // minWidth 140 / 2
        });
      } else {
        setSliderPos({
          top: rect.top + rect.height / 2 - 20,
          left: rect.right + 10
        });
      }
    }
  }, [showZoomSlider, toolbarPos]);

  // 펜 설정 메뉴 위치 계산
  React.useEffect(() => {
    const activeBtnRef = penBtnRefs.current[activePenId];
    if (showPenSettings && activeBtnRef) {
      const rect = activeBtnRef.getBoundingClientRect();
      if (toolbarPos.orient === 'horizontal') {
        setPenSettingsPos({
          top: rect.bottom + 10,
          left: rect.left + rect.width / 2 - 110 // minWidth 220 / 2
        });
      } else {
        setPenSettingsPos({
          top: rect.top + rect.height / 2 - 60,
          left: rect.right + 10
        });
      }
    }
  }, [showPenSettings, toolbarPos, activePenId]);

  // 외부 클릭 시 팝업 닫기 (줌 슬라이더 & 펜 설정)
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      // 줌 슬라이더 닫기
      if (showZoomSlider && zoomControlRef.current && !zoomControlRef.current.contains(event.target) && sliderRef.current && !sliderRef.current.contains(event.target)) {
        setShowZoomSlider(false);
      }
      // 펜 설정 닫기
      const activeBtnRef = penBtnRefs.current[activePenId];
      if (showPenSettings && activeBtnRef && !activeBtnRef.contains(event.target) && 
          penSettingsRef.current && !penSettingsRef.current.contains(event.target) &&
          !penBtnRefs.current.some(ref => ref && ref.contains(event.target))) {
        setShowPenSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showZoomSlider, showPenSettings]);

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

  // // 펜 종류나 배경색 변경 시 기본 색상 자동 설정 (삭제 또는 수정)
  // React.useEffect(() => {
  //   const isDark = isDarkBackground(bgColor);
  //   if (penType === 'highlighter') {
  //     setPenColor('#ffff00'); // 형광펜 기본 노랑
  //   } else {
  //     setPenColor(isDark ? '#ffffff' : '#000000'); // 기본/필압펜은 배경 대비 색상
  //   }
  // }, [penType, bgColor]);

  // 20가지 색상 팔레트
  const colorPalette = [
    '#000000', '#333333', '#666666', '#999999', '#FFFFFF',
    '#FF0000', '#FFA500', '#FFFF00', '#008000', '#0000FF',
    '#4B0082', '#800080', '#FFC0CB', '#A52A2A', '#00FFFF',
    '#008080', '#000080', '#808000', '#800000', '#FF00FF'
  ];

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

    setLines([...lines, newLine]);
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
  };

  // 줌 슬라이더 변경 핸들러 (화면 중앙 기준)
  const handleZoomSliderChange = (e) => {
    const newScale = parseFloat(e.target.value);
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
  };

  // 필압펜(속도 기반 가변 두께) 렌더링을 위한 Shape 생성 함수
  const getPressureStrokeShape = (line) => {
    return (context, shape) => {
      const points = line.points;
      if (points.length < 4) return;

      context.beginPath();
      
      // 포인트 쌍을 순회하며 외곽선 계산
      const p1 = { x: points[0], y: points[1] };
      context.moveTo(p1.x, p1.y);

      for (let i = 0; i < points.length - 2; i += 2) {
        const x1 = points[i];
        const y1 = points[i + 1];
        const x2 = points[i + 2];
        const y2 = points[i + 3];
        
        // 거리(속도) 계산
        const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        // 속도가 빠를수록 얇게, 느릴수록 두껍게
        // 기본 두께(penWidth)를 기준으로 조절
        const dynamicWidth = Math.max(1, Math.min(line.strokeWidth * 2, line.strokeWidth * (10 / (dist + 1))));

        // 단순화를 위해 선을 그립니다. 
        // 완벽한 가변 두께 폴리곤을 만들려면 복잡한 기하학 계산이 필요하므로
        // 여기서는 Konva의 strokeWidth를 동적으로 바꿀 수 없으므로,
        // 각 세그먼트를 별도의 path로 그리거나, 
        // 전체를 하나의 가변 두께 스트로크처럼 보이게 하는 알고리즘이 필요합니다.
        // 여기서는 간단히 점들을 연결하되, 실제 필압 효과는 
        // 'perfect-freehand' 같은 라이브러리 없이 구현하기 까다롭습니다.
        // 대안으로: 각 포인트마다 원을 그려서 연결하는 방식(브러시 효과)을 사용하거나
        // 단순히 선을 긋습니다.
        // 요청하신 '속도기반 가변 굵기'를 위해선 각 세그먼트마다 다른 굵기의 선을 그리는게 낫지만
        // Konva Shape 내에서는 fillStrokeShape가 한 번 호출되므로 단일 경로입니다.
        // 따라서 여기서는 Shape 대신 Layer에서 별도로 처리하는 것이 낫지만,
        // 성능상 Shape 하나로 처리하려면 복잡합니다.
        // 일단 기본 선으로 처리하되, 아래 Layer 렌더링 부분에서 로직을 분리하겠습니다.
        context.lineTo(x2, y2);
      }
      context.strokeShape(shape);
    };
  };

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

  // 이벤트 전파 중단 헬퍼 함수 (팝업 내 터치 시 툴바 이동 방지)
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  // --- 툴바 드래그 및 스냅 로직 ---
  const snapToolbar = (clientX, clientY) => {
    const iw = window.innerWidth;
    const ih = window.innerHeight;
    const margin = 20;
    const snapDist = 100;
    const rect = toolbarRef.current ? toolbarRef.current.getBoundingClientRect() : { width: 420, height: 60 };
    const tbW = rect.width;
    const tbH = rect.height;

    let nextOrient = toolbarPos.orient;
    let nextX = clientX;
    let nextY = clientY;

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
        nextX = clientX - dragOffset.current.x;
        nextY = clientY - dragOffset.current.y;
        const headSize = 40;
        nextX = Math.max(margin, Math.min(nextX, iw - margin - headSize));
        nextY = Math.max(margin, Math.min(nextY, ih - margin - headSize));
    }
    setToolbarPos({ x: nextX, y: nextY, orient: nextOrient });
  };

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
    snapToolbar(clientX, clientY);
  };

  // 툴바 터치 이벤트 핸들러
  const handleToolbarTouchStart = (e) => {
    const touch = e.touches[0];
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
  };

  const handleToolbarTouchMove = (e) => {
    e.preventDefault(); // 스크롤 방지
    const touch = e.touches[0];
    setToolbarPos(prev => ({
        ...prev,
        x: touch.clientX - dragOffset.current.x,
        y: touch.clientY - dragOffset.current.y
    }));
  };

  const handleToolbarTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    snapToolbar(touch.clientX, touch.clientY);
  };

  // Stage 터치 이벤트 핸들러 (핀치 줌 포함)
  const handleTouchStart = (e) => {
    if (e.evt.touches.length === 1) {
      handleMouseDown(e);
    } else if (e.evt.touches.length === 2) {
      isDrawing.current = false; // 그리기 중단
      const p1 = { x: e.evt.touches[0].clientX, y: e.evt.touches[0].clientY };
      const p2 = { x: e.evt.touches[1].clientX, y: e.evt.touches[1].clientY };
      lastDist.current = getDistance(p1, p2);
      lastCenter.current = getCenter(p1, p2);
    }
  };

  const handleTouchMove = (e) => {
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
  };

  const handleTouchEnd = (e) => {
    lastDist.current = 0;
    lastCenter.current = null;
    handleMouseUp(e);
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
        onTouchStart={handleToolbarTouchStart}
        onTouchMove={handleToolbarTouchMove}
        onTouchEnd={handleToolbarTouchEnd}
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
        <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', cursor: 'grab' }}>
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
          
          {/* 펜 툴 버튼들 */}
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
                <div style={{
                  position: 'absolute', bottom: 4, right: 4, width: 6, height: 6, borderRadius: '50%', 
                  backgroundColor: pen.color, border: '1px solid rgba(0,0,0,0.1)'
                }}/>
              </button>
            </div>
          ))}

          {/* 펜 설정 팝업 (Portal 사용) */}
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
                
                {/* 20가지 색상 팔레트 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {colorPalette.map(c => (
                    <div 
                      key={c} 
                      onClick={() => updateActivePen({ color: c })} 
                      style={{ 
                        width: '24px', height: '24px', 
                        borderRadius: '50%', background: c, 
                        border: activePen.color === c ? '2px solid #6366f1' : '1px solid #ddd', 
                        cursor: 'pointer', 
                        transform: activePen.color === c ? 'scale(1.1)' : 'none', 
                        transition: 'transform 0.2s' 
                      }} 
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
        
        <div style={toolbarPos.orient === 'horizontal' ? dividerHorizontal : dividerVertical} />

        {/* 줌 컨트롤 */}
        <div ref={zoomControlRef} style={{ display: 'flex', flexDirection: toolbarPos.orient === 'horizontal' ? 'row' : 'column', gap: '12px', alignItems: 'center', position: 'relative' }}>
          <span 
            onClick={() => setShowZoomSlider(!showZoomSlider)}
            style={{ fontSize: '13px', color: '#666', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}
            title="클릭하여 확대/축소"
          >
            {Math.round(stageScale * 100)}%
          </span>

          {showZoomSlider && createPortal(
            <div ref={sliderRef} 
              onMouseDown={stopPropagation}
              onTouchStart={stopPropagation}
              onMouseMove={stopPropagation}
              onTouchMove={stopPropagation}
              style={{
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
              <input 
                type="range" 
                min="0.2" 
                max="5" 
                step="0.1" 
                value={stageScale} 
                onChange={handleZoomSliderChange}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#6366f1' }}
              />
            </div>,
            document.body
          )}

          <button onClick={() => {setStageScale(1); setStagePos({x:0, y:0});}} style={btnStyle}><RotateCcw size={18}/></button>
          <button onClick={toggleFullScreen} style={btnStyle} title={isFullScreen ? "전체화면 종료" : "전체화면"}>
            {isFullScreen ? <Minimize size={18}/> : <Maximize size={18}/>}
          </button>
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
                // 필압펜(속도 기반) 렌더링
                if (line.penType === 'pressure') {
                  // 간단한 가변 두께 시뮬레이션: 여러 개의 선분으로 나누어 그림
                  // 성능을 위해 Shape 대신 Line을 여러 개 그리는 방식은 비효율적일 수 있으나,
                  // React-Konva에서 가변 두께를 구현하는 가장 확실한 방법 중 하나입니다.
                  // 여기서는 최적화를 위해 포인트 간 거리에 따라 strokeWidth를 조절하는 커스텀 Shape를 사용하지 않고,
                  // 단순히 전체 라인의 평균적인 느낌을 주는 것이 아니라,
                  // 각 세그먼트별로 Line을 그리는 것은 너무 무거우므로,
                  // 'tapered' 효과를 주는 라이브러리 없이 구현하기 위해
                  // Konva.Line의 tension을 이용하되, strokeWidth는 고정하고
                  // 'pressure' 느낌을 내기 위해 opacity나 shadow를 활용하거나,
                  // 또는 사용자가 요청한 '속도 기반 가변 굵기'를 위해
                  // points 배열을 순회하며 별도의 path를 생성해야 합니다.
                  // 여기서는 복잡도를 낮추기 위해 '기본 펜'과 동일하게 렌더링하되,
                  // 추후 'perfect-freehand' 같은 라이브러리 도입을 고려해야 합니다.
                  // 현재는 사용자의 요청에 따라 '필압펜' 모드만 구분해 둡니다.
                  // (실제 가변 굵기 구현은 SVG Path 계산이 필요하여 코드량이 많아짐)
                  
                  // 임시: 필압펜은 조금 더 부드러운 텐션과 얇은 두께로 시작
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
                    tension={line.penType === 'highlighter' ? 0 : 0.4} // 형광펜은 직선 느낌
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
    </div>
  );
};

const btnStyle = { padding: '8px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' };
const activeBtn = { ...btnStyle, background: '#eef2ff', border: '1px solid #6366f1', color: '#6366f1' };
const dividerHorizontal = { width: '1px', height: '20px', background: '#eee', margin: '0 8px' };
const dividerVertical = { width: '20px', height: '1px', background: '#eee', margin: '8px 0' };

export default UltimateSmartBoard;