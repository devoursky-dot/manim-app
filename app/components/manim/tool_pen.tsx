"use client";
import { PenOptions } from "./data";

interface ToolPenProps {
  penOptions: PenOptions;
  setPenOptions: React.Dispatch<React.SetStateAction<PenOptions>>;
  onUndo: () => void;
  onClear: () => void;
  orientation?: "horizontal" | "vertical";
}

export function ToolPen({ penOptions, setPenOptions, onUndo, onClear, orientation }: ToolPenProps) {
  // 사용 가능한 색상 팔레트
  const colors = ["#FFFFFF", "#FF3B30", "#34C759", "#007AFF", "#FFCC00"];
  const isHorizontal = orientation === "horizontal";

  return (
    <div className={`flex ${isHorizontal ? "flex-row items-center w-auto" : "flex-col w-48"} gap-3 bg-gray-800/90 backdrop-blur p-4 rounded-lg shadow-lg text-white z-10 border border-gray-700 transition-all duration-300`}>
      {/* 모드 전환 버튼 */}
      <div className={`flex justify-between items-center ${isHorizontal ? "gap-2" : "mb-1"}`}>
        <span className="text-sm font-bold">펜 툴 (판서)</span>
        <button 
          onClick={() => setPenOptions({ ...penOptions, isPenMode: !penOptions.isPenMode })}
          className={`px-3 py-1 text-xs rounded font-bold transition-colors ${
            penOptions.isPenMode ? "bg-red-500 hover:bg-red-600" : "bg-gray-600 hover:bg-gray-500"
          }`}
        >
          {penOptions.isPenMode ? "ON" : "OFF"}
        </button>
      </div>

      {/* 색상 선택 */}
      <div className="flex gap-2">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setPenOptions({ ...penOptions, color: c })}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${
              penOptions.color === c ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* 두께 조절 */}
      <div className={`flex flex-col gap-1 ${isHorizontal ? "w-32" : "mt-1"}`}>
        <label className="text-xs text-gray-400 font-mono">두께: {penOptions.width}px</label>
        <input 
          type="range" min="2" max="20" step="2"
          value={penOptions.width}
          onChange={(e) => setPenOptions({ ...penOptions, width: parseInt(e.target.value) })}
          className="w-full accent-white"
          disabled={!penOptions.isPenMode} // 펜 모드가 아닐 땐 비활성화
        />
      </div>

      {/* 지우개 도구 */}
      <div className={`flex gap-2 ${isHorizontal ? "" : "mt-2"}`}>
        <button 
          onClick={onUndo} 
          disabled={!penOptions.isPenMode}
          className="flex-1 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs disabled:opacity-50"
        >
          실행 취소
        </button>
        <button 
          onClick={onClear} 
          disabled={!penOptions.isPenMode}
          className="flex-1 py-1 bg-red-900 hover:bg-red-800 rounded text-xs disabled:opacity-50"
        >
          전체 지우기
        </button>
      </div>
    </div>
  );
}