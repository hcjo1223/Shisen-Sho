import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {astryxStylex} from '@astryxdesign/build/vite';
import {VitePWA} from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, 'src'),
  base: './',
  plugins: [
    ...astryxStylex({rootDir: __dirname}),
    react(),
    // 오프라인 지원: 빌드 산출물 전체를 프리캐시하는 서비스 워커 생성.
    // 매니페스트는 src/public/manifest.webmanifest를 그대로 쓴다.
    // 새 버전은 받는 즉시 활성화(autoUpdate)하고, 페이지 새로고침 시점은
    // src/utils/pwaUpdate.ts에서 직접 정한다 (게임 중이 아닐 때 바로 적용)
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // 새 서비스 워커가 즉시 활성화되어 열린 페이지까지 넘겨받도록
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {cacheName: 'google-fonts-stylesheets'},
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365},
              cacheableResponse: {statuses: [0, 200]},
            },
          },
        ],
      },
    }),
  ],
  server: {
    fs: {allow: [__dirname]},
  },
  build: {
    // 코드를 한 파일로 묶는다. 새 버전 배포 뒤 이전 페이지가 아직 열려 있을 때
    // 나중에 불러오는 조각 파일(이미 서버에서 사라짐)을 찾다 깨지는 일을 막는다.
    rolldownOptions: {
      output: {inlineDynamicImports: true},
    },
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    assetsDir: 'assets',
  },
});
