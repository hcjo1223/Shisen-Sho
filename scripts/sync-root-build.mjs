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
    if (/\.(js|css|map)$/i.test(entry)) {
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
