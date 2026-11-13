import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {astryxStylex} from '@astryxdesign/build/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, 'src'),
  base: './',
  plugins: [...astryxStylex({rootDir: __dirname}), react()],
  server: {
    fs: {allow: [__dirname]},
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    assetsDir: 'assets',
  },
});
