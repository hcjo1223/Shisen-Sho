import type {BoardInstance, Coord} from '../types/game';
import {THEMES, TINTS, type TileThemeKey} from '../utils/gameStore';

const SPARKLES = ['✨', '💖', '⭐', '🌟', '💫', '🎀'];
const SVG_NS = 'http://www.w3.org/2000/svg';
const STYLE_ID = 'shisen-board-runtime-styles';

const BOARD_CSS = `
@layer product {
  .shisen-stage-root {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    touch-action: none;
    --shisen-cell: 48px;
    --shisen-emoji-font: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
  }

  .shisen-board-frame {
    position: relative;
    padding: 2px;
    border-radius: calc(var(--radius-container, 20px) + 2px);
    background: var(--color-background-muted, #ffe9e1);
    border: 1.5px solid var(--color-border, #e7cdc4);
    box-shadow: var(--shadow-med, 0 12px 28px rgba(166, 104, 86, 0.18));
    touch-action: none;
  }

  .shisen-board {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--shisen-cols), var(--shisen-cell));
    grid-template-rows: repeat(var(--shisen-rows), var(--shisen-cell));
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .shisen-cell {
    position: relative;
  }

  .shisen-tile {
    position: absolute;
    inset: calc(var(--shisen-cell) * 0.035);
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--color-border-emphasized, #d8b8ae) 55%, transparent);
    padding: 0;
    border-radius: calc(var(--shisen-cell) * 0.22);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0) 58%),
      light-dark(
        color-mix(in srgb, var(--shisen-tint, #fffaf6) 86%, var(--color-background-card, #fffdfb)),
        color-mix(in srgb, var(--shisen-tint, #fffaf6) 24%, var(--color-background-card, #2a2120))
      );
    box-shadow:
      0 calc(var(--shisen-cell) * 0.07) 0 var(--color-border-emphasized, #e7c9bf),
      0 calc(var(--shisen-cell) * 0.11) calc(var(--shisen-cell) * 0.16) var(--color-shadow, rgba(166, 104, 86, 0.22));
    font-family: var(--shisen-emoji-font);
    font-size: calc(var(--shisen-cell) * 0.64);
    line-height: 1;
    cursor: pointer;
    touch-action: none;
    transform: translateY(calc(var(--shisen-cell) * -0.03));
    transition: transform 0.12s cubic-bezier(.3, 1.6, .5, 1), box-shadow 0.12s ease, filter 0.15s ease;
    animation: shisen-tile-in 0.4s cubic-bezier(.3, 1.5, .5, 1) backwards;
    animation-delay: var(--shisen-delay, 0ms);
  }

  @media (hover: hover) {
    .shisen-tile:hover {
      transform: translateY(calc(var(--shisen-cell) * -0.07));
    }
  }

  .shisen-tile:active {
    transform: translateY(calc(var(--shisen-cell) * 0.02)) scale(0.92);
    box-shadow: 0 calc(var(--shisen-cell) * 0.02) 0 var(--color-border-emphasized, #e7c9bf);
  }

  .shisen-tile:focus-visible {
    outline: 3px solid var(--color-accent, #f2685a);
    outline-offset: 1px;
  }

  .shisen-tile.selected {
    transform: translateY(calc(var(--shisen-cell) * -0.12)) scale(1.04);
    border-color: var(--color-accent, #f2685a);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0) 58%),
      color-mix(in srgb, var(--color-accent, #f2685a) 22%, var(--color-background-card, #fffdfb));
    box-shadow:
      0 calc(var(--shisen-cell) * 0.1) 0 var(--color-accent, #f2685a),
      0 calc(var(--shisen-cell) * 0.2) calc(var(--shisen-cell) * 0.28) var(--color-accent-muted, rgba(242, 104, 90, 0.35));
    animation: shisen-bounce 0.9s ease-in-out infinite;
  }

  .shisen-tile.hint {
    animation: shisen-wiggle 0.6s ease-in-out 3;
    filter: drop-shadow(0 0 calc(var(--shisen-cell) * 0.14) #ffcf4d);
  }

  .shisen-tile.shake {
    animation: shisen-shake 0.36s ease;
  }

  .shisen-tile.removing {
    pointer-events: none;
    animation: shisen-pop-out 0.34s ease-in forwards;
  }

  .shisen-tile.flip {
    animation: shisen-flip 0.5s ease both;
    animation-delay: var(--shisen-delay, 0ms);
  }

  .shisen-path-layer,
  .shisen-fx-layer {
    position: absolute;
    inset: 2px;
    width: calc(var(--shisen-cell) * var(--shisen-cols));
    height: calc(var(--shisen-cell) * var(--shisen-rows));
    pointer-events: none;
    overflow: visible;
  }

  .shisen-path-line {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .shisen-path-line.glow {
    stroke: #ffd977;
    stroke-width: 0.32;
    opacity: 0.65;
  }

  .shisen-path-line.core {
    stroke: var(--color-accent, #f2685a);
    stroke-width: 0.12;
    stroke-dasharray: 0.01 0.22;
    animation: shisen-dash 0.4s linear infinite;
  }

  .shisen-path-layer.fade {
    transition: opacity 0.25s ease;
    opacity: 0;
  }

  .shisen-particle {
    position: absolute;
    font-family: var(--shisen-emoji-font);
    font-size: calc(var(--shisen-cell) * 0.34);
    transform: translate(-50%, -50%);
    animation: shisen-burst 0.7s ease-out forwards;
  }

  .shisen-combo {
    position: absolute;
    top: 4%;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-family-heading, "Jua", sans-serif);
    font-size: clamp(1.35rem, 4.5vw, 2.2rem);
    letter-spacing: 0.03em;
    color: var(--color-accent, #f2685a);
    text-shadow: 0 2px 0 var(--color-background-card, #fff), 0 6px 14px var(--color-accent-muted, rgba(242, 104, 90, 0.25));
    pointer-events: none;
    opacity: 0;
    z-index: 5;
    white-space: nowrap;
  }

  .shisen-combo.show {
    animation: shisen-combo-pop 1s ease forwards;
  }

  @keyframes shisen-tile-in {
    from {
      opacity: 0;
      transform: translateY(calc(var(--shisen-cell) * -0.4)) scale(0.6);
    }
  }

  @keyframes shisen-bounce {
    0%, 100% {
      transform: translateY(calc(var(--shisen-cell) * -0.12)) scale(1.04);
    }
    50% {
      transform: translateY(calc(var(--shisen-cell) * -0.18)) scale(1.06);
    }
  }

  @keyframes shisen-wiggle {
    0%, 100% {
      transform: translateY(calc(var(--shisen-cell) * -0.06)) rotate(0);
    }
    25% {
      transform: translateY(calc(var(--shisen-cell) * -0.1)) rotate(-8deg);
    }
    75% {
      transform: translateY(calc(var(--shisen-cell) * -0.1)) rotate(8deg);
    }
  }

  @keyframes shisen-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-12%); }
    40% { transform: translateX(10%); }
    60% { transform: translateX(-7%); }
    80% { transform: translateX(4%); }
  }

  @keyframes shisen-pop-out {
    40% {
      transform: scale(1.18);
      opacity: 1;
    }
    100% {
      transform: scale(0.1) rotate(25deg);
      opacity: 0;
    }
  }

  @keyframes shisen-flip {
    0% { transform: rotateY(0); }
    50% { transform: rotateY(90deg) scale(0.9); }
    100% { transform: rotateY(0); }
  }

  @keyframes shisen-dash {
    to { stroke-dashoffset: -0.23; }
  }

  @keyframes shisen-burst {
    0% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(0.4);
    }
    100% {
      opacity: 0;
      transform: translate(calc(-50% + var(--shisen-dx)), calc(-50% + var(--shisen-dy))) scale(1.1) rotate(var(--shisen-rot));
    }
  }

  @keyframes shisen-combo-pop {
    0% {
      opacity: 0;
      transform: translate(-50%, 10px) scale(0.6);
    }
    20% {
      opacity: 1;
      transform: translate(-50%, 0) scale(1.1);
    }
    35% {
      transform: translate(-50%, 0) scale(1);
    }
    80% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -14px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shisen-tile,
    .shisen-tile.selected,
    .shisen-tile.hint,
    .shisen-tile.shake,
    .shisen-tile.removing,
    .shisen-tile.flip,
    .shisen-path-line.core,
    .shisen-particle,
    .shisen-combo.show {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
}
`;

function ensureBoardStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = BOARD_CSS;
  document.head.appendChild(style);
}

export interface BoardControllerOptions {
  stage: HTMLElement;
  onTileSelect: (pos: Coord) => void;
}

export class BoardController {
  private stageEl: HTMLElement;
  private onTileSelect: (pos: Coord) => void;
  private stageRoot: HTMLDivElement;
  private comboEl: HTMLDivElement;
  private frameEl: HTMLDivElement;
  private boardEl: HTMLDivElement;
  private pathEl: SVGSVGElement;
  private fxEl: HTMLDivElement;
  private cells: HTMLDivElement[][] = [];
  private board: BoardInstance | null = null;
  private themeKey: TileThemeKey = 'fruit';
  private gridRows = 0;
  private gridCols = 0;
  private pathFadeTimer: number | null = null;
  private pathClearTimer: number | null = null;
  private refreshTimers: number[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private lastPointerTime = 0;

  constructor(options: BoardControllerOptions) {
    ensureBoardStyles();
    this.stageEl = options.stage;
    this.onTileSelect = options.onTileSelect;

    this.stageRoot = document.createElement('div');
    this.stageRoot.className = 'shisen-stage-root';

    this.comboEl = document.createElement('div');
    this.comboEl.className = 'shisen-combo';
    this.comboEl.setAttribute('aria-live', 'polite');

    this.frameEl = document.createElement('div');
    this.frameEl.className = 'shisen-board-frame';

    this.boardEl = document.createElement('div');
    this.boardEl.className = 'shisen-board';
    this.boardEl.setAttribute('role', 'grid');
    this.boardEl.setAttribute('aria-label', '사천성 퍼즐 보드');

    this.pathEl = document.createElementNS(SVG_NS, 'svg');
    this.pathEl.setAttribute('class', 'shisen-path-layer');
    this.pathEl.setAttribute('aria-hidden', 'true');

    this.fxEl = document.createElement('div');
    this.fxEl.className = 'shisen-fx-layer';
    this.fxEl.setAttribute('aria-hidden', 'true');

    this.frameEl.appendChild(this.boardEl);
    this.frameEl.appendChild(this.pathEl);
    this.frameEl.appendChild(this.fxEl);

    this.stageRoot.appendChild(this.comboEl);
    this.stageRoot.appendChild(this.frameEl);
    this.stageEl.appendChild(this.stageRoot);

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleResize = this.handleResize.bind(this);

    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      this.boardEl.addEventListener('pointerdown', this.handlePointerDown);
      this.boardEl.addEventListener('click', this.handleClick);
    } else {
      this.boardEl.addEventListener('click', this.handleClick);
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.fit());
      this.resizeObserver.observe(this.stageEl);
    }
    window.addEventListener('resize', this.handleResize);
  }

  private emoji(v: number): string {
    const tiles = THEMES[this.themeKey].tiles;
    return tiles[(v - 1) % tiles.length];
  }

  private tint(v: number): string {
    return TINTS[(v - 1) % TINTS.length];
  }

  private tileEl(p: Coord): HTMLButtonElement | null {
    const cell = this.cells[p.r]?.[p.c];
    if (!cell || !cell.firstElementChild) return null;
    return cell.firstElementChild as HTMLButtonElement;
  }

  private placeTile(
    r: number,
    c: number,
    v: number,
    delay: number,
  ): HTMLButtonElement {
    const cell = this.cells[r][c];
    cell.innerHTML = '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shisen-tile';
    btn.id = `tile-${r}-${c}`;
    btn.dataset.r = String(r);
    btn.dataset.c = String(c);
    const glyph = this.emoji(v);
    btn.textContent = glyph;
    btn.setAttribute('aria-label', `${glyph} 타일`);
    btn.style.setProperty('--shisen-tint', this.tint(v));
    btn.style.setProperty('--shisen-delay', `${delay || 0}ms`);
    cell.appendChild(btn);
    return btn;
  }

  build(board: BoardInstance, themeKey: TileThemeKey): void {
    this.clearRefreshTimers();
    this.board = board;
    this.themeKey = themeKey;
    this.gridRows = board.grid.length;
    this.gridCols = board.grid[0].length;

    this.stageRoot.style.setProperty('--shisen-rows', String(this.gridRows));
    this.stageRoot.style.setProperty('--shisen-cols', String(this.gridCols));
    this.pathEl.setAttribute('viewBox', `0 0 ${this.gridCols} ${this.gridRows}`);

    this.clearPath();
    this.fxEl.innerHTML = '';
    this.boardEl.innerHTML = '';
    this.cells = [];

    const frag = document.createDocumentFragment();
    for (let r = 0; r < this.gridRows; r++) {
      const row: HTMLDivElement[] = [];
      for (let c = 0; c < this.gridCols; c++) {
        const cell = document.createElement('div');
        cell.className = 'shisen-cell';
        row.push(cell);
        frag.appendChild(cell);
      }
      this.cells.push(row);
    }
    this.boardEl.appendChild(frag);

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const v = board.get(r, c);
        if (v) this.placeTile(r, c, v, (r + c) * 16);
      }
    }

    this.fit();
  }

  fit(): void {
    if (!this.gridRows || !this.gridCols) return;
    const rect = this.stageEl.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    const availableW = Math.max(rect.width - 8, 120);
    const availableH = Math.max(rect.height - 8, 120);
    const cell = Math.floor(
      Math.min(availableW / this.gridCols, availableH / this.gridRows, 96),
    );
    this.stageRoot.style.setProperty(
      '--shisen-cell',
      `${Math.max(cell, 22)}px`,
    );
  }

  setSelected(p: Coord, on: boolean): void {
    const el = this.tileEl(p);
    if (el) el.classList.toggle('selected', on);
  }

  shake(p: Coord): void {
    const el = this.tileEl(p);
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    el.addEventListener('animationend', () => el.classList.remove('shake'), {
      once: true,
    });
  }

  hint(pair: {a: Coord; b: Coord}): void {
    this.clearHints();
    [pair.a, pair.b].forEach(p => {
      const el = this.tileEl(p);
      if (!el) return;
      el.classList.add('hint');
      el.addEventListener('animationend', () => el.classList.remove('hint'), {
        once: true,
      });
    });
  }

  clearHints(): void {
    this.boardEl
      .querySelectorAll('.shisen-tile.hint')
      .forEach(el => el.classList.remove('hint'));
  }

  drawPath(points: Coord[]): void {
    this.clearPath();
    const d = points
      .map((p, i) => `${i ? 'L' : 'M'}${p.c + 0.5} ${p.r + 0.5}`)
      .join(' ');
    this.pathEl.innerHTML = `<path class="shisen-path-line glow" d="${d}"/><path class="shisen-path-line core" d="${d}"/>`;
    this.pathFadeTimer = window.setTimeout(() => {
      this.pathEl.classList.add('fade');
      this.pathClearTimer = window.setTimeout(() => this.clearPath(), 260);
    }, 280);
  }

  clearPath(): void {
    if (this.pathFadeTimer !== null) {
      clearTimeout(this.pathFadeTimer);
      this.pathFadeTimer = null;
    }
    if (this.pathClearTimer !== null) {
      clearTimeout(this.pathClearTimer);
      this.pathClearTimer = null;
    }
    this.pathEl.classList.remove('fade');
    this.pathEl.innerHTML = '';
  }

  removeTiles(a: Coord, b: Coord, intensity: number): void {
    [a, b].forEach(p => {
      const el = this.tileEl(p);
      if (!el) return;
      el.classList.remove('selected', 'hint');
      el.classList.add('removing');
      el.addEventListener('animationend', () => el.remove(), {once: true});
      this.burst(p, intensity);
    });
  }

  private burst(p: Coord, intensity: number): void {
    const cellStr = getComputedStyle(this.stageRoot).getPropertyValue(
      '--shisen-cell',
    );
    const cell = parseFloat(cellStr) || 48;
    const count = 5 + Math.min(intensity || 1, 6) * 2;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'shisen-particle';
      s.textContent = SPARKLES[Math.floor(Math.random() * SPARKLES.length)];
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const dist = cell * (0.6 + Math.random() * 0.7);
      s.style.left = `${(p.c + 0.5) * cell}px`;
      s.style.top = `${(p.r + 0.5) * cell}px`;
      s.style.setProperty('--shisen-dx', `${Math.cos(ang) * dist}px`);
      s.style.setProperty('--shisen-dy', `${Math.sin(ang) * dist}px`);
      s.style.setProperty('--shisen-rot', `${Math.random() * 180 - 90}deg`);
      this.fxEl.appendChild(s);
      s.addEventListener('animationend', () => s.remove(), {once: true});
    }
  }

  refreshAll(board: BoardInstance): void {
    this.clearRefreshTimers();
    this.board = board;
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const v = board.get(r, c);
        const el = this.tileEl({r, c});
        if (!v) {
          if (el) el.remove();
          continue;
        }
        const btn = el || this.placeTile(r, c, v, 0);
        btn.className = 'shisen-tile flip';
        btn.style.setProperty('--shisen-delay', `${(r + c) * 12}ms`);
        const timer = window.setTimeout(() => {
          const glyph = this.emoji(v);
          btn.textContent = glyph;
          btn.setAttribute('aria-label', `${glyph} 타일`);
          btn.style.setProperty('--shisen-tint', this.tint(v));
        }, 250 + (r + c) * 12);
        this.refreshTimers.push(timer);
        btn.addEventListener('animationend', () => btn.classList.remove('flip'), {
          once: true,
        });
      }
    }
  }

  retheme(board: BoardInstance, themeKey: TileThemeKey): void {
    this.themeKey = themeKey;
    this.board = board;
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const v = board.get(r, c);
        const el = this.tileEl({r, c});
        if (v && el) {
          const glyph = this.emoji(v);
          el.textContent = glyph;
          el.setAttribute('aria-label', `${glyph} 타일`);
          el.style.setProperty('--shisen-tint', this.tint(v));
        }
      }
    }
  }

  showCombo(n: number): void {
    this.comboEl.textContent = n >= 5 ? `${n} Combo! 🔥` : `${n} Combo! ✨`;
    this.comboEl.classList.remove('show');
    void this.comboEl.offsetWidth;
    this.comboEl.classList.add('show');
  }

  blurBoard(): void {
    const active = document.activeElement as HTMLElement | null;
    if (active && this.boardEl.contains(active)) {
      active.blur();
    }
  }

  private clearRefreshTimers(): void {
    for (const id of this.refreshTimers) clearTimeout(id);
    this.refreshTimers = [];
  }

  private resolvePointerTile(clientX: number, clientY: number, target: EventTarget | null): void {
    if (!this.board) return;
    let tile =
      target instanceof Element
        ? (target.closest('.shisen-tile') as HTMLButtonElement | null)
        : null;

    if (!tile) {
      const rect = this.boardEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const cellW = rect.width / this.board.grid[0].length;
      const cellH = rect.height / this.board.grid.length;
      const touchX = clientX - rect.left;
      const touchY = clientY - rect.top;
      const c = Math.floor(touchX / cellW);
      const r = Math.floor(touchY / cellH);

      if (
        r >= 0 &&
        r < this.board.grid.length &&
        c >= 0 &&
        c < this.board.grid[0].length
      ) {
        if (this.board.get(r, c) !== 0) {
          tile = this.tileEl({r, c});
        } else {
          let minDist = Infinity;
          let bestEl: HTMLButtonElement | null = null;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (
                nr >= 0 &&
                nr < this.board.grid.length &&
                nc >= 0 &&
                nc < this.board.grid[0].length &&
                this.board.get(nr, nc) !== 0
              ) {
                const el = this.tileEl({r: nr, c: nc});
                if (el && !el.classList.contains('removing')) {
                  const b = el.getBoundingClientRect();
                  const d = Math.hypot(
                    clientX - (b.left + b.width / 2),
                    clientY - (b.top + b.height / 2),
                  );
                  if (d < minDist && d <= Math.max(cellW, cellH) * 1.1) {
                    minDist = d;
                    bestEl = el;
                  }
                }
              }
            }
          }
          tile = bestEl;
        }
      }
    }

    if (!tile || tile.classList.contains('removing')) return;
    const r = Number(tile.dataset.r);
    const c = Number(tile.dataset.c);
    if (Number.isFinite(r) && Number.isFinite(c)) {
      this.onTileSelect({r, c});
    }
  }

  private handlePointerDown(e: PointerEvent): void {
    if (e.button && e.button !== 0) return;
    this.lastPointerTime = Date.now();
    this.resolvePointerTile(e.clientX, e.clientY, e.target);
  }

  private handleClick(e: MouseEvent): void {
    if ('PointerEvent' in window && Date.now() - this.lastPointerTime < 500) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    this.resolvePointerTile(e.clientX, e.clientY, e.target);
  }

  private handleResize(): void {
    this.fit();
  }

  destroy(): void {
    this.clearPath();
    this.clearRefreshTimers();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.handleResize);
    this.boardEl.removeEventListener('pointerdown', this.handlePointerDown);
    this.boardEl.removeEventListener('click', this.handleClick);
    this.stageRoot.remove();
  }
}
