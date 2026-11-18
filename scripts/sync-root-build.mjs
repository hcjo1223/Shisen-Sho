import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distIndex = path.join(distDir, 'index.html');
const distAssets = path.join(distDir, 'assets');
const rootIndex = path.join(rootDir, 'index.html');
const rootAssets = path.join(rootDir, 'assets');

if (!fs.existsSync(distIndex)) {
  throw new Error('dist/index.html was not generated');
}

if (fs.existsSync(rootAssets)) {
  for (const entry of fs.readdirSync(rootAssets)) {
    if (/\.(js|css|map|png)$/i.test(entry)) {
      fs.rmSync(path.join(rootAssets, entry), {force: true});
    }
  }
} else {
  fs.mkdirSync(rootAssets, {recursive: true});
}

fs.copyFileSync(distIndex, rootIndex);
if (fs.existsSync(distAssets)) {
  for (const entry of fs.readdirSync(distAssets)) {
    fs.copyFileSync(path.join(distAssets, entry), path.join(rootAssets, entry));
  }
}

// 서비스 워커(vite-plugin-pwa) 산출물: 이전 빌드의 workbox 런타임은 지운다
for (const entry of fs.readdirSync(rootDir)) {
  if (/^workbox-[\w-]+\.js$/.test(entry)) {
    fs.rmSync(path.join(rootDir, entry), {force: true});
  }
}
const workboxFiles = fs
  .readdirSync(distDir)
  .filter(entry => /^workbox-[\w-]+\.js$/.test(entry));

const publicFiles = [
  'favicon.svg',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'manifest.webmanifest',
  'sw.js',
  'registerSW.js',
  ...workboxFiles,
];
for (const file of publicFiles) {
  const srcFile = path.join(distDir, file);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.join(rootDir, file));
  }
}

const distIcons = path.join(distDir, 'icons');
const rootIcons = path.join(rootDir, 'icons');
if (fs.existsSync(distIcons)) {
  fs.mkdirSync(rootIcons, {recursive: true});
  for (const entry of fs.readdirSync(distIcons)) {
    fs.copyFileSync(path.join(distIcons, entry), path.join(rootIcons, entry));
  }
}
