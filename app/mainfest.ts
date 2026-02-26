import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Manim Math Simulator', // 설치 시 바탕화면에 뜰 긴 이름
    short_name: 'Manim App',      // 아이콘 아래에 뜰 짧은 이름
    description: '나만의 수학 그래프 & 판서 시뮬레이터',
    start_url: '/',               // 앱을 켰을 때 처음 열릴 주소
    display: 'standalone',        // 주소창을 숨기고 진짜 앱처럼 보이게 하는 마법의 옵션!
    background_color: '#000000',  // 앱 로딩 시 배경색
    theme_color: '#1f2937',       // 스마트폰 상단 상태바 색상
    icons: [
      {
        src: '/icon.png',         // 방금 넣은 아이콘을 여기서 사용합니다.
        sizes: '192x192 512x512', // 크롬이 알아서 크기를 줄였다 늘렸다 합니다.
        type: 'image/png',
      },
    ],
  };
}