import withPWAInit from 'next-pwa';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// [자동화] PDF Worker 파일 자동 복사 (앱 실행 시 자동 수행)
try {
  const workerSrc = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
  const workerDest = path.join(__dirname, 'public', 'pdf.worker.min.mjs');
  
  // public 폴더가 없으면 생성
  if (!fs.existsSync(path.join(__dirname, 'public'))) {
    fs.mkdirSync(path.join(__dirname, 'public'));
  }

  // 파일 복사 실행
  fs.copyFileSync(workerSrc, workerDest);
  console.log('✅ PDF Worker file copied to public folder successfully!');
} catch (e) {
  console.warn('⚠️ PDF Worker file copy failed. Please check pdfjs-dist installation.', e.message);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-pdf'],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      'pdfjs-dist': path.join(__dirname, 'node_modules/pdfjs-dist'),
    };
    return config;
  },
};

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
        },
      },
    },
  ],
});

export default withPWA(nextConfig);