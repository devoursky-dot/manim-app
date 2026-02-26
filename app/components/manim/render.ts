import { Scene, Axes, Create } from "manim-web";
import { ViewportState, GraphOptions } from "./data";

export const renderManimScene = async (
  container: HTMLDivElement,
  viewport: ViewportState,
  options: GraphOptions,
  currentDuration: number
) => {
  // 1. 씬 생성
  const scene = new Scene(container);

  // 2. 좌표축 생성
  const axes = new Axes({
    xRange: [viewport.xMin, viewport.xMax, Math.PI / 2],
    yRange: [viewport.yMin, viewport.yMax, 1],
    axisConfig: { color: "#FFFFFF" }
  });

  // 3. 그래프 생성
  const sinGraph = (axes as any).plot((x: number) => Math.sin(x), {
    color: "#00FF00",
    strokeWidth: options.strokeWidth,
  });

  // 타이밍 이슈(_dirty) 우회 로직 유지
  if (sinGraph && (sinGraph as any)._dirty === undefined) {
    (sinGraph as any)._dirty = false;
  }

  // 4. 장면에 추가 및 안정화 대기
  scene.add(axes);
  await new Promise(resolve => setTimeout(resolve, 50));

  // 5. 애니메이션 재생
  if (sinGraph && scene) {
    scene.add(sinGraph);
    await scene.play(new Create(sinGraph, { duration: currentDuration }));
  }

  // 메모리 해제를 위해 씬 객체를 반환
  return scene;
};