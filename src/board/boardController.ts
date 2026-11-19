import type {BoardInstance, Coord, TilePair} from '../types/game';
import {
  THEMES,
  TILE_SPRITE_URLS,
  TINTS,
  type TileThemeKey,
} from '../utils/gameStore';

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
    /* 바깥 테두리 통로(패딩 칸)는 반 칸 너비로 그려 타일 공간을 넓힌다 */
    --shisen-edge: calc(var(--shisen-cell) * 0.5);
    grid-template-columns: var(--shisen-edge) repeat(calc(var(--shisen-cols) - 2), var(--shisen-cell)) var(--shisen-edge);
    grid-template-rows: var(--shisen-edge) repeat(calc(var(--shisen-rows) - 2), var(--shisen-cell)) var(--shisen-edge);
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .shisen-cell {
    position: relative;
  }

  /* 어려움 모드: 판 꼭짓점 칸을 막는 벽돌 (지울 수 없고 길도 못 지나간다)
     칸을 꽉 채운 벽 덩어리. 보드 배경 색 계열로 칠하고, 타일처럼 아래 두께와 그림자를 줘서 앞으로 튀어나와 보이게 한다 */
  .shisen-brick {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: calc(var(--shisen-cell) * 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 55%),
      color-mix(in srgb, var(--color-background-muted, #ffe9e1) 40%, var(--color-border-emphasized, #d8b8ae));
    box-shadow:
      inset 0 1.5px 0 rgba(255, 255, 255, 0.55),
      inset 0 -1.5px 0 color-mix(in srgb, var(--color-border-emphasized, #d8b8ae) 70%, black),
      0 calc(var(--shisen-cell) * 0.07) 0 color-mix(in srgb, var(--color-border-emphasized, #d8b8ae) 75%, black),
      0 calc(var(--shisen-cell) * 0.11) calc(var(--shisen-cell) * 0.16) var(--color-shadow, rgba(166, 104, 86, 0.28));
    transform: translateY(calc(var(--shisen-cell) * -0.04));
    pointer-events: none;
  }

  /* 벽돌마다 아래쪽 그늘 (줄눈 무늬를 살짝 위로 밀어 진하게 깔아 벽돌이 도드라져 보이게) */
  .shisen-brick::before,
  .shisen-brick::after {
    content: "";
    position: absolute;
    inset: 0;
    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M0 .9H20M0 10.9H20M.9 0V10M10.9 10V20' stroke='black' stroke-width='1.8' fill='none'/%3E%3C/svg%3E") 0 0 / calc(var(--shisen-cell) * 0.5) calc(var(--shisen-cell) * 0.5) repeat;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M0 .9H20M0 10.9H20M.9 0V10M10.9 10V20' stroke='black' stroke-width='1.8' fill='none'/%3E%3C/svg%3E") 0 0 / calc(var(--shisen-cell) * 0.5) calc(var(--shisen-cell) * 0.5) repeat;
  }

  .shisen-brick::before {
    background: color-mix(in srgb, var(--color-border-emphasized, #d8b8ae) 55%, black);
    opacity: 0.45;
    translate: 0 -1.5px;
  }

  /* 줄눈: 배경과 같은 밝은 색 */
  .shisen-brick::after {
    background: color-mix(in srgb, var(--color-background-muted, #ffe9e1) 75%, white);
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
  }

  .shisen-tile.is-sprite {
    box-shadow:
      inset 0 calc(var(--shisen-cell) * 0.04) calc(var(--shisen-cell) * 0.08) rgba(255, 255, 255, 0.7),
      0 calc(var(--shisen-cell) * 0.08) 0 var(--color-border-emphasized, #e7c9bf),
      0 calc(var(--shisen-cell) * 0.12) calc(var(--shisen-cell) * 0.18) var(--color-shadow, rgba(166, 104, 86, 0.24));
  }

  .shisen-tile-sprite {
    display: block;
    width: 88%;
    height: 88%;
    background-image: var(--shisen-sprite-url);
    background-size: calc(var(--shisen-sprite-cols, 6) * 100%) calc(var(--shisen-sprite-rows, 6) * 100%);
    background-position: var(--shisen-sprite-x, 0%) var(--shisen-sprite-y, 0%);
    background-repeat: no-repeat;
    pointer-events: none;
    filter: drop-shadow(0 calc(var(--shisen-cell) * 0.045) calc(var(--shisen-cell) * 0.055) rgba(36, 20, 16, 0.28));
    transition: transform 0.14s cubic-bezier(.3, 1.6, .5, 1), filter 0.14s ease;
  }

  /*
   * 등장 애니메이션은 판을 처음 깔 때만 재생한다.
   * (기본 .shisen-tile에 두면 selected·hint·falling 등 다른 클래스를 뗄 때마다
   *  등장 애니메이션이 다시 재생되어 타일이 깜빡였다)
   */
  .shisen-tile.entering {
    animation: shisen-tile-in 0.4s cubic-bezier(.3, 1.5, .5, 1) backwards;
    animation-delay: var(--shisen-delay, 0ms);
  }

  @media (hover: hover) {
    .shisen-tile:hover {
      transform: translateY(calc(var(--shisen-cell) * -0.07));
    }
    .shisen-tile:hover .shisen-tile-sprite {
      transform: translateY(-3%) scale(1.06);
      filter: drop-shadow(0 calc(var(--shisen-cell) * 0.07) calc(var(--shisen-cell) * 0.08) rgba(36, 20, 16, 0.34));
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
    z-index: 3;
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

  .shisen-tile.selected .shisen-tile-sprite {
    transform: translateY(-4%) scale(1.08);
    filter: drop-shadow(0 calc(var(--shisen-cell) * 0.07) calc(var(--shisen-cell) * 0.09) rgba(36, 20, 16, 0.38));
  }

  /* 힌트 활성화 시 나머지 타일은 부드럽게 눌러 힌트 쌍을 즉시 눈에 띄게 만든다 */
  .shisen-board.has-hint .shisen-tile:not(.hint):not(.selected):not(.removing) {
    opacity: 0.36;
    filter: saturate(0.32) contrast(0.86);
    transition: opacity 0.22s ease, filter 0.22s ease, transform 0.12s ease;
  }

  .shisen-tile.hint,
  .shisen-tile.is-sprite.hint {
    z-index: 4;
    border: max(2px, calc(var(--shisen-cell) * 0.065)) solid #ff6d00;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 238, 173, 0.32) 60%),
      light-dark(#fffdf2, #584010);
    box-shadow:
      inset 0 0 0 max(1.5px, calc(var(--shisen-cell) * 0.04)) rgba(255, 255, 255, 0.96),
      0 calc(var(--shisen-cell) * 0.09) 0 #d45200,
      0 0 0 max(2px, calc(var(--shisen-cell) * 0.055)) rgba(255, 255, 255, 0.96),
      0 0 calc(var(--shisen-cell) * 0.48) calc(var(--shisen-cell) * 0.14) rgba(255, 166, 0, 0.88);
    animation: shisen-hint-pulse 1.15s ease-in-out infinite;
  }

  .shisen-tile.hint::after {
    content: "";
    position: absolute;
    inset: calc(var(--shisen-cell) * -0.09);
    border-radius: calc(var(--shisen-cell) * 0.3);
    border: max(2.5px, calc(var(--shisen-cell) * 0.07)) solid #ff8c00;
    box-shadow: 0 0 calc(var(--shisen-cell) * 0.24) rgba(255, 196, 0, 0.85);
    pointer-events: none;
    animation: shisen-hint-ring 1.25s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }

  .shisen-tile.hint .shisen-tile-sprite {
    transform: scale(1.06);
    filter: drop-shadow(0 calc(var(--shisen-cell) * 0.06) calc(var(--shisen-cell) * 0.09) rgba(36, 20, 16, 0.42));
  }

  .shisen-tile.shake {
    animation: shisen-shake 0.36s ease;
  }

  .shisen-tile.removing {
    pointer-events: none;
    animation: shisen-pop-out 0.34s ease-in forwards;
  }

  /*
   * 중력 낙하: 위치(translateY)만 움직인다.
   * 크기 변형(눌림·반동)이나 will-change 해제는 끝나는 순간 이모지를 다시 그리며
   * 깜빡임처럼 보이므로 쓰지 않는다.
   */
  .shisen-tile.falling {
    animation: shisen-fall var(--shisen-fall-ms, 320ms) cubic-bezier(.45, 0, .2, 1) both;
    animation-delay: var(--shisen-fall-delay, 120ms);
  }

  /* 일시정지: 보드를 흐리게 페이드해 가리고 안내 문구를 띄운다 */
  .shisen-board-frame {
    transition: opacity 0.28s ease, filter 0.28s ease;
  }

  .shisen-stage-root.paused .shisen-board-frame {
    opacity: 0.12;
    filter: blur(calc(var(--shisen-cell) * 0.16)) saturate(0.6);
    pointer-events: none;
  }

  /* 설정 시트가 아래에서 올라와 가리므로 문구는 위쪽에 둔다 */
  .shisen-pause {
    position: absolute;
    inset: 0;
    display: grid;
    justify-items: center;
    align-content: start;
    padding-top: clamp(12px, 3vh, 40px);
    gap: 6px;
    font-family: var(--font-family-heading, "Jua", sans-serif);
    font-size: clamp(1.6rem, 6vw, 2.6rem);
    color: var(--color-text-primary, #4a3430);
    opacity: 0;
    transform: scale(0.94);
    transition: opacity 0.28s ease, transform 0.28s ease;
    pointer-events: none;
    z-index: 6;
  }

  .shisen-pause small {
    font-family: var(--font-family-body, sans-serif);
    font-size: 0.45em;
    color: var(--color-text-secondary, #7c6561);
  }

  .shisen-stage-root.paused .shisen-pause {
    opacity: 1;
    transform: scale(1);
  }

  .shisen-tile.flip {
    animation: shisen-flip 0.5s ease both;
    animation-delay: var(--shisen-delay, 0ms);
  }

  .shisen-path-layer,
  .shisen-fx-layer {
    position: absolute;
    inset: 2px;
    width: calc(var(--shisen-cell) * (var(--shisen-cols) - 1));
    height: calc(var(--shisen-cell) * (var(--shisen-rows) - 1));
    pointer-events: none;
    overflow: visible;
  }

  .shisen-path-layer {
    z-index: 3;
  }

  /* 힌트 연결선은 힌트 타일(z-index: 4) 아래, 나머지 보드 위에 그려 그림을 가리지 않는다 */
  .shisen-path-layer.is-hint {
    z-index: 2;
  }

  .shisen-fx-layer {
    z-index: 5;
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

  .shisen-stage-root[data-theme="animal"] .shisen-path-line.glow {
    stroke: #9af0b6;
  }

  .shisen-stage-root[data-theme="pokemon"] .shisen-path-line.glow {
    stroke: #ffdf5d;
    opacity: 0.78;
  }

  .shisen-path-line.core {
    stroke: var(--color-accent, #f2685a);
    stroke-width: 0.12;
    stroke-dasharray: 0.01 0.22;
    animation: shisen-dash 0.4s linear infinite;
  }

  .shisen-path-layer.is-hint .shisen-path-line.glow {
    stroke: rgba(255, 212, 59, 0.94);
    stroke-width: 0.36;
    opacity: 0.85;
  }

  .shisen-path-layer.is-hint .shisen-path-line.core {
    stroke: #ff6d00;
    stroke-width: 0.14;
    stroke-dasharray: 0.14 0.16;
    animation: shisen-hint-dash 0.85s linear infinite;
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

  @keyframes shisen-hint-pulse {
    0%, 100% {
      transform: translateY(calc(var(--shisen-cell) * -0.07)) scale(1.04);
    }
    50% {
      transform: translateY(calc(var(--shisen-cell) * -0.15)) scale(1.1);
    }
  }

  @keyframes shisen-hint-ring {
    0% {
      opacity: 0.95;
      transform: scale(0.95);
    }
    100% {
      opacity: 0;
      transform: scale(1.42);
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

  /* 부드러운 낙하: 천천히 출발해 가속한 뒤, 바닥 근처에서 감속하며 반동 없이 내려앉는다 */
  @keyframes shisen-fall {
    from {
      transform: translateY(calc(var(--shisen-cell) * (var(--shisen-fall-cells, 1) * -1 - 0.03)));
    }
    to {
      transform: translateY(calc(var(--shisen-cell) * -0.03));
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

  @keyframes shisen-hint-dash {
    to { stroke-dashoffset: -0.3; }
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
    .shisen-tile.entering,
    .shisen-tile.selected,
    .shisen-tile.hint,
    .shisen-tile.hint::after,
    .shisen-tile.shake,
    .shisen-tile.removing,
    .shisen-tile.flip,
    .shisen-tile.falling,
    .shisen-path-line.core,
    .shisen-particle,
    .shisen-combo.show {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }

    .shisen-tile.hint::after {
      animation: none !important;
      opacity: 0.88;
    }
  }
}
`;

/**
 * 패딩 칸은 반 칸 너비이므로, 셀 인덱스 → 셀 단위 중심 좌표 변환.
 * 0 → 0.25, 1..n-2 → i, n-1 → n-1.25 (전체 길이는 n-1 셀)
 */
function cellCenter(i: number, n: number): number {
  if (i <= 0) return 0.25;
  if (i >= n - 1) return n - 1.25;
  return i;
}

/** 셀 단위 좌표 → 셀 인덱스 (cellCenter의 역변환) */
function cellIndexAt(u: number, n: number): number {
  if (u < 0.5) return 0;
  if (u >= n - 1.5) return n - 1;
  return Math.floor(u - 0.5) + 1;
}

/** 지정한 애니메이션이 끝났을 때만 콜백 (다른 애니메이션 종료에 반응하지 않도록) */
function onAnimationEnd(el: Element, name: string, cb: () => void): void {
  const handler = (e: Event) => {
    if ((e as AnimationEvent).animationName !== name || e.target !== el) return;
    el.removeEventListener('animationend', handler);
    cb();
  };
  el.addEventListener('animationend', handler);
}

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
  private pauseEl: HTMLDivElement;
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
  private activeHint: TilePair | null = null;
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

    this.pauseEl = document.createElement('div');
    this.pauseEl.className = 'shisen-pause';
    this.pauseEl.setAttribute('aria-hidden', 'true');
    this.pauseEl.innerHTML = '<span>⏸ 일시정지</span><small>설정을 닫으면 이어서 해요</small>';

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
    this.stageRoot.appendChild(this.pauseEl);
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

  private tint(v: number): string {
    const tints = THEMES[this.themeKey]?.tints ?? TINTS;
    return tints[(v - 1) % tints.length];
  }

  private applyThemeVars(): void {
    const theme = THEMES[this.themeKey];
    const spriteUrl = TILE_SPRITE_URLS[this.themeKey];
    this.stageRoot.dataset.theme = this.themeKey;
    if (theme.kind === 'sprite' && spriteUrl) {
      const cols = theme.spriteCols ?? 6;
      const rows = theme.spriteRows ?? 6;
      this.boardEl.style.setProperty('--shisen-sprite-url', `url("${spriteUrl}")`);
      this.boardEl.style.setProperty('--shisen-sprite-cols', String(cols));
      this.boardEl.style.setProperty('--shisen-sprite-rows', String(rows));
    } else {
      this.boardEl.style.removeProperty('--shisen-sprite-url');
      this.boardEl.style.removeProperty('--shisen-sprite-cols');
      this.boardEl.style.removeProperty('--shisen-sprite-rows');
    }
  }

  private applyTileVisual(btn: HTMLButtonElement, v: number): void {
    const theme = THEMES[this.themeKey];
    const idx = (v - 1) % theme.tiles.length;
    const label = theme.tiles[idx];
    const spriteUrl = TILE_SPRITE_URLS[this.themeKey];

    btn.setAttribute('aria-label', `${label} 타일`);
    btn.style.setProperty('--shisen-tint', this.tint(v));

    if (theme.kind === 'sprite' && spriteUrl) {
      const cols = theme.spriteCols ?? 6;
      const rows = theme.spriteRows ?? 6;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const posX = cols > 1 ? (col * 100) / (cols - 1) : 0;
      const posY = rows > 1 ? (row * 100) / (rows - 1) : 0;

      btn.classList.add('is-sprite');
      let spriteEl = btn.querySelector<HTMLSpanElement>(':scope > .shisen-tile-sprite');
      if (!spriteEl) {
        btn.textContent = '';
        spriteEl = document.createElement('span');
        spriteEl.className = 'shisen-tile-sprite';
        spriteEl.setAttribute('aria-hidden', 'true');
        btn.appendChild(spriteEl);
      }
      spriteEl.style.setProperty('--shisen-sprite-x', `${posX}%`);
      spriteEl.style.setProperty('--shisen-sprite-y', `${posY}%`);
    } else {
      btn.classList.remove('is-sprite');
      btn.textContent = label;
    }
  }

  /** 칸의 현재 타일 (사라지는 중인 타일은 제외) */
  private tileEl(p: Coord): HTMLButtonElement | null {
    const cell = this.cells[p.r]?.[p.c];
    if (!cell) return null;
    return cell.querySelector<HTMLButtonElement>(
      ':scope > .shisen-tile:not(.removing)',
    );
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
    btn.className = 'shisen-tile entering';
    btn.id = `tile-${r}-${c}`;
    btn.dataset.r = String(r);
    btn.dataset.c = String(c);
    this.applyTileVisual(btn, v);
    btn.style.setProperty('--shisen-delay', `${delay || 0}ms`);
    onAnimationEnd(btn, 'shisen-tile-in', () => btn.classList.remove('entering'));
    cell.appendChild(btn);
    return btn;
  }

  build(board: BoardInstance, themeKey: TileThemeKey): void {
    this.clearRefreshTimers();
    this.clearHints();
    this.board = board;
    this.themeKey = themeKey;
    this.gridRows = board.grid.length;
    this.gridCols = board.grid[0].length;

    this.stageRoot.style.setProperty('--shisen-rows', String(this.gridRows));
    this.stageRoot.style.setProperty('--shisen-cols', String(this.gridCols));
    this.applyThemeVars();
    this.pathEl.setAttribute(
      'viewBox',
      `0 0 ${this.gridCols - 1} ${this.gridRows - 1}`,
    );

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
        if (v > 0) this.placeTile(r, c, v, (r + c) * 16);
        else if (v < 0) {
          const brick = document.createElement('div');
          brick.className = 'shisen-brick';
          brick.setAttribute('aria-hidden', 'true');
          this.cells[r][c].appendChild(brick);
        }
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
      Math.min(
        availableW / (this.gridCols - 1),
        availableH / (this.gridRows - 1),
        96,
      ),
    );
    this.stageRoot.style.setProperty(
      '--shisen-cell',
      `${Math.max(cell, 22)}px`,
    );
  }

  private coordsEqual(p: Coord, q: Coord): boolean {
    return p.r === q.r && p.c === q.c;
  }

  setSelected(p: Coord, on: boolean): void {
    const el = this.tileEl(p);
    if (!el) return;
    el.classList.toggle('selected', on);
    if (this.activeHint && this.isHintCoord(p)) {
      el.classList.toggle('hint', !on);
    }
  }

  shake(p: Coord): void {
    const el = this.tileEl(p);
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    onAnimationEnd(el, 'shisen-shake', () => el.classList.remove('shake'));
  }

  hasActiveHint(): boolean {
    if (!this.activeHint) return false;
    return Boolean(
      this.tileEl(this.activeHint.a) && this.tileEl(this.activeHint.b),
    );
  }

  isHintCoord(p: Coord): boolean {
    if (!this.activeHint) return false;
    return (
      this.coordsEqual(p, this.activeHint.a) ||
      this.coordsEqual(p, this.activeHint.b)
    );
  }

  pulseHint(): void {
    if (!this.activeHint) return;
    [this.activeHint.a, this.activeHint.b].forEach(p => {
      const el = this.tileEl(p);
      if (!el || el.classList.contains('selected')) return;
      el.classList.remove('hint');
      void el.offsetWidth;
      el.classList.add('hint');
    });
  }

  hint(pair: TilePair): void {
    this.clearHints();
    this.activeHint = {
      a: {...pair.a},
      b: {...pair.b},
      path: pair.path
        ? {...pair.path, points: pair.path.points.map(pt => ({...pt}))}
        : undefined,
    };
    this.boardEl.classList.add('has-hint');
    [pair.a, pair.b].forEach(p => {
      const el = this.tileEl(p);
      if (!el) return;
      el.classList.remove('entering');
      el.classList.add('hint');
    });
    if (pair.path?.points?.length) {
      this.drawHintPath(pair.path.points);
    }
  }

  clearHints(): void {
    this.activeHint = null;
    this.boardEl.classList.remove('has-hint');
    this.boardEl
      .querySelectorAll('.shisen-tile.hint')
      .forEach(el => el.classList.remove('hint'));
    if (this.pathEl.classList.contains('is-hint')) {
      this.clearPath();
    }
  }

  private buildPathD(points: Coord[]): string {
    return points
      .map(
        (p, i) =>
          `${i ? 'L' : 'M'}${cellCenter(p.c, this.gridCols)} ${cellCenter(p.r, this.gridRows)}`,
      )
      .join(' ');
  }

  private drawHintPath(points: Coord[]): void {
    this.clearPath();
    const d = this.buildPathD(points);
    this.pathEl.classList.add('is-hint');
    this.pathEl.innerHTML = `<path class="shisen-path-line glow" d="${d}"/><path class="shisen-path-line core" d="${d}"/>`;
  }

  drawPath(points: Coord[]): void {
    this.clearPath();
    const d = this.buildPathD(points);
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
    this.pathEl.classList.remove('fade', 'is-hint');
    this.pathEl.innerHTML = '';
  }

  removeTiles(a: Coord, b: Coord, intensity: number): void {
    [a, b].forEach(p => {
      const el = this.tileEl(p);
      if (!el) return;
      el.classList.remove('selected', 'hint');
      el.classList.add('removing');
      onAnimationEnd(el, 'shisen-pop-out', () => el.remove());
      this.burst(p, intensity);
    });
  }

  private burst(p: Coord, intensity: number): void {
    const cellStr = getComputedStyle(this.stageRoot).getPropertyValue(
      '--shisen-cell',
    );
    const cell = parseFloat(cellStr) || 48;
    const count = 5 + Math.min(intensity || 1, 6) * 2;
    const sparkles = THEMES[this.themeKey]?.sparkles ?? SPARKLES;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'shisen-particle';
      s.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const dist = cell * (0.6 + Math.random() * 0.7);
      s.style.left = `${cellCenter(p.c, this.gridCols) * cell}px`;
      s.style.top = `${cellCenter(p.r, this.gridRows) * cell}px`;
      s.style.setProperty('--shisen-dx', `${Math.cos(ang) * dist}px`);
      s.style.setProperty('--shisen-dy', `${Math.sin(ang) * dist}px`);
      s.style.setProperty('--shisen-rot', `${Math.random() * 180 - 90}deg`);
      this.fxEl.appendChild(s);
      s.addEventListener('animationend', () => s.remove(), {once: true});
    }
  }

  refreshAll(board: BoardInstance): void {
    this.clearRefreshTimers();
    this.clearHints();
    this.board = board;
    this.applyThemeVars();
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const v = board.get(r, c);
        const el = this.tileEl({r, c});
        if (v <= 0) {
          if (el) el.remove();
          continue;
        }
        const btn = el || this.placeTile(r, c, v, 0);
        btn.classList.remove('entering', 'selected', 'hint', 'shake', 'falling');
        btn.classList.add('flip');
        btn.style.setProperty('--shisen-delay', `${(r + c) * 12}ms`);
        const timer = window.setTimeout(() => {
          this.applyTileVisual(btn, v);
        }, 250 + (r + c) * 12);
        this.refreshTimers.push(timer);
        onAnimationEnd(btn, 'shisen-flip', () => btn.classList.remove('flip'));
      }
    }
  }

  retheme(board: BoardInstance, themeKey: TileThemeKey): void {
    this.themeKey = themeKey;
    this.board = board;
    this.applyThemeVars();
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const v = board.get(r, c);
        const el = this.tileEl({r, c});
        if (v > 0 && el) {
          this.applyTileVisual(el, v);
        }
      }
    }
  }

  /**
   * 중력 모드: 타일 요소를 새 칸으로 옮기고, 떨어진 거리만큼 위에서 내려오는 애니메이션을 준다.
   * 이동은 즉시 반영되므로 탭 좌표와 보드 상태가 어긋나지 않는다.
   */
  moveTiles(moves: Array<{from: Coord; to: Coord}>): void {
    this.clearHints();
    // 같은 열 안에서는 아래쪽 이동부터 처리되도록 정렬 (목적지 칸이 비어 있도록)
    const ordered = [...moves].sort((x, y) => y.to.r - x.to.r);
    // 열마다 아래 타일부터 조금씩 늦게 떨어뜨려 차르르 내려앉는 느낌을 준다
    const rankInColumn = new Map<number, number>();
    for (const {from, to} of ordered) {
      const el = this.tileEl(from);
      const target = this.cells[to.r]?.[to.c];
      if (!el || !target) continue;
      el.classList.remove('entering', 'selected', 'hint', 'shake', 'flip', 'falling');
      el.id = `tile-${to.r}-${to.c}`;
      el.dataset.r = String(to.r);
      el.dataset.c = String(to.c);
      const cells = to.r - from.r;
      const rank = rankInColumn.get(to.c) ?? 0;
      rankInColumn.set(to.c, rank + 1);
      el.style.setProperty('--shisen-fall-cells', String(cells));
      el.style.setProperty('--shisen-fall-ms', `${Math.round(240 + 90 * Math.sqrt(cells))}ms`);
      el.style.setProperty('--shisen-fall-delay', `${120 + rank * 35}ms`);
      // 클래스를 먼저 붙인 뒤 옮겨, 새 칸에 놓이는 첫 프레임부터 낙하 시작 위치에 있게 한다
      el.classList.add('falling');
      target.appendChild(el);
      onAnimationEnd(el, 'shisen-fall', () => el.classList.remove('falling'));
    }
  }

  /** 일시정지 표시: 보드를 흐리게 가리고 안내 문구를 띄운다. */
  setPaused(on: boolean): void {
    this.stageRoot.classList.toggle('paused', on);
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
      const cellW = rect.width / (this.gridCols - 1);
      const cellH = rect.height / (this.gridRows - 1);
      const touchX = clientX - rect.left;
      const touchY = clientY - rect.top;
      if (touchX < 0 || touchY < 0 || touchX > rect.width || touchY > rect.height) {
        return;
      }
      const c = cellIndexAt(touchX / cellW, this.gridCols);
      const r = cellIndexAt(touchY / cellH, this.gridRows);

      if (
        r >= 0 &&
        r < this.board.grid.length &&
        c >= 0 &&
        c < this.board.grid[0].length
      ) {
        if (this.board.get(r, c) > 0) {
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
                this.board.get(nr, nc) > 0
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
