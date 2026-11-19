export interface Coord {
  r: number;
  c: number;
}

export interface PathResult {
  points: Coord[];
  turns: number;
}

export interface TilePair {
  a: Coord;
  b: Coord;
  path?: PathResult;
}

export interface DifficultyConfig {
  name: string;
  rows: number;
  cols: number;
  kinds?: number;
  /** 1..pool 그림 중 kinds 종을 매판 무작위로 고른다 */
  pool?: number;
  /** 바깥 통로 네 모서리에 벽돌을 세운다 */
  bricks?: boolean;
}

export interface BoardOptions {
  pool?: number;
  bricks?: boolean;
}

export interface BoardInstance {
  rows: number;
  cols: number;
  kinds: number;
  history: Array<{a: Coord; b: Coord; value: number}>;
  grid: number[][];
  generate(): void;
  get(r: number, c: number): number;
  remaining(): number;
  isCleared(): boolean;
  findPath(a: Coord, b: Coord): PathResult | null;
  availablePairs(limit?: number): TilePair[];
  hasMoves(): boolean;
  tryMatch(a: Coord, b: Coord): PathResult | null;
  undo(): {a: Coord; b: Coord; value: number} | null;
  shuffle(): void;
  applyGravity(): Array<{from: Coord; to: Coord; value: number}>;
}

export interface BoardConstructor {
  new (
    rows: number,
    cols: number,
    rng?: () => number,
    kinds?: number,
    opts?: BoardOptions,
  ): BoardInstance;
}

export interface TileThemeConfig {
  name: string;
  icon: string;
  tiles: string[];
  kind?: 'emoji' | 'sprite';
  spriteCols?: number;
  spriteRows?: number;
  tints?: string[];
  sparkles?: string[];
}

export interface SoundEngine {
  enabled: boolean;
  bgmEnabled: boolean;
  unlock(): void;
  select(): void;
  match(combo: number): void;
  fail(): void;
  hint(): void;
  shuffle(): void;
  clear(): void;
  startBgm(): void;
  stopBgm(): void;
}
