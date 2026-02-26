"use client";
import { ViewportState, GraphOptions } from "./data";

interface ToolGraphProps {
  viewport: ViewportState;
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
  options: GraphOptions;
  setOptions: React.Dispatch<React.SetStateAction<GraphOptions>>;
  onPlay: () => void;
  orientation?: "horizontal" | "vertical";
}

export function ToolGraph({ viewport, setViewport, options, setOptions, onPlay, orientation }: ToolGraphProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div className={`flex ${isHorizontal ? "flex-row items-center" : "flex-col w-48"} gap-4 bg-gray-800 p-4 rounded-lg shadow-lg text-white z-10 border border-gray-700 transition-all duration-300`}>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 font-mono">Duration: {options.duration}s</label>
        <input 
          type="range" min="0" max="5" step="0.1" 
          value={options.duration} 
          onChange={(e) => setOptions({ ...options, duration: parseFloat(e.target.value) })}
          className="w-32 accent-blue-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 font-mono">X Range</label>
        <div className="flex gap-2">
          <input 
            type="number" step="0.1"
            value={Number(viewport.xMin).toFixed(1)} 
            onChange={(e) => setViewport({ ...viewport, xMin: parseFloat(e.target.value) })}
            className="w-20 px-2 py-1 text-black rounded text-xs"
          />
          <input 
            type="number" step="0.1"
            value={Number(viewport.xMax).toFixed(1)} 
            onChange={(e) => setViewport({ ...viewport, xMax: parseFloat(e.target.value) })}
            className="w-20 px-2 py-1 text-black rounded text-xs"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 font-mono">Thickness: {options.strokeWidth}px</label>
        <input 
          type="range" min="1" max="10" step="1" 
          value={options.strokeWidth} 
          onChange={(e) => setOptions({ ...options, strokeWidth: parseInt(e.target.value) })}
          className="w-32 accent-green-500"
        />
      </div>
      <button 
        onClick={onPlay}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded font-bold transition-colors shadow-md"
      >
        Play
      </button>
    </div>
  );
}