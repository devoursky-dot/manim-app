// app/page.tsx
import ManimCanvas from './components/ManimCanvas';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-slate-50">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900">Manim Vector Studio</h1>
          <div className="space-x-4">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">
              저장하기
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* 폴더 트리 영역 (예정) */}
          <aside className="col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[600px]">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">프로젝트 파일</h2>
            <div className="text-slate-300 italic text-sm">탐색기 준비 중...</div>
          </aside>

          {/* Manim 렌더링 영역 */}
          <section className="col-span-9 h-[600px]">
            <ManimCanvas />
          </section>
        </div>
      </div>
    </main>
  );
}