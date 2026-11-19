declare module '../../js/board.js' {
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

  export const DIFFICULTIES: Record<'easy' | 'normal' | 'hard', DifficultyConfig>;

  export class Board {
    rows: number;
    cols: number;
    kinds: number;
    history: Array<{a: Coord; b: Coord; value: number}>;
    grid: number[][];
    constructor(
      rows: number,
      cols: number,
      rng?: () => number,
      kinds?: number,
      opts?: BoardOptions,
    );
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
}

declare module '../../js/themes.js' {
  export interface TileThemeConfig {
    name: string;
    icon: string;
    tiles: string[];
  }

  export const THEMES: Record<
    'fruit' | 'animal' | 'dessert' | 'mix',
    TileThemeConfig
  >;
  export const TINTS: string[];
}

declare module '../../js/sound.js' {
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

  const Sound: SoundEngine;
  export default Sound;
}
