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
}

export interface BoardConstructor {
  new (rows: number, cols: number, rng?: () => number): BoardInstance;
}

export interface TileThemeConfig {
  name: string;
  icon: string;
  tiles: string[];
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
