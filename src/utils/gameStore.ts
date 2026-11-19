import {
  Board as RawBoard,
  DIFFICULTIES as RawDIFFICULTIES,
} from '../../js/board.js';
import {
  THEMES as RawTHEMES,
  TINTS as RawTINTS,
} from '../../js/themes.js';
import RawSound from '../../js/sound.js';
import type {ThemeSlug} from '../astryx-themes';
import pokemonSpriteUrl from '../assets/pokemon-gen1-sheet.png';
import pokemonThumbUrl from '../assets/pokemon-pikachu-icon.png';
import fruitDioramaUrl from '../assets/theme-fruit.png';
import animalDioramaUrl from '../assets/theme-animal.png';
import pokemonDioramaUrl from '../assets/theme-pokemon.png';
import {todayKey} from './daily';
import type {
  BoardConstructor,
  BoardInstance,
  BoardOptions,
  DifficultyConfig,
  SoundEngine,
  TileThemeConfig,
} from '../types/game';

const BoardClass = RawBoard as unknown as BoardConstructor;

export function createBoard(
  rows: number,
  cols: number,
  rng?: () => number,
  kinds?: number,
  opts?: BoardOptions,
): BoardInstance {
  return new BoardClass(rows, cols, rng, kinds, opts);
}

/** 난이도 설정(종류 수·그림 풀·벽돌)대로 새 판을 만든다 */
export function createBoardFor(
  diff: DifficultyConfig,
  rows: number,
  cols: number,
  rng?: () => number,
): BoardInstance {
  return createBoard(rows, cols, rng, diff.kinds, {
    pool: diff.pool,
    bricks: diff.bricks,
  });
}

export const DIFFICULTIES = RawDIFFICULTIES as Record<
  DifficultyKey,
  DifficultyConfig
>;
export const THEMES = RawTHEMES as Record<TileThemeKey, TileThemeConfig>;
export const TINTS = RawTINTS as string[];
export const Sound = RawSound as unknown as SoundEngine;

export type DifficultyKey = 'easy' | 'normal' | 'hard';
export type TileThemeKey = 'fruit' | 'animal' | 'pokemon';
export type ColorModeKey = 'system' | 'light' | 'dark';
export type ScreenName = 'home' | 'dashboard' | 'game';

export const TILE_SPRITE_URLS: Partial<Record<TileThemeKey, string>> = {
  pokemon: pokemonSpriteUrl,
};

export const POKEMON_THUMB_URL = pokemonThumbUrl;

export const THEME_DIORAMA_URLS: Record<TileThemeKey, string> = {
  fruit: fruitDioramaUrl,
  animal: animalDioramaUrl,
  pokemon: pokemonDioramaUrl,
};

/** 선택한 타일 테마에 맞춰 자동으로 적용되는 Astryx UI 디자인 테마 */
export const THEME_UI_MAP: Record<TileThemeKey, ThemeSlug> = {
  fruit: 'malang',
  animal: 'meadow',
  pokemon: 'kanto',
};

export type TokenColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'pink';

export const THEME_META: Record<
  TileThemeKey,
  {
    subtitle: string;
    tagline: string;
    uiLabel: string;
    badge: string;
    badgeColor: 'pink' | 'green' | 'yellow';
    heroTokens: ReadonlyArray<{label: string; color: TokenColor}>;
  }
> = {
  fruit: {
    subtitle: '상큼한 과일 & 채소 · 피치 코랄 과수원 UI',
    tagline: '상큼달콤 과일 농장 힐링 퍼즐',
    uiLabel: '피치 코랄 과수원',
    badge: '과수원 무드',
    badgeColor: 'pink',
    heroTokens: [
      {label: '🍓', color: 'red'},
      {label: '🍑', color: 'pink'},
      {label: '🍊', color: 'orange'},
      {label: '🍒', color: 'red'},
      {label: '🍋', color: 'yellow'},
    ],
  },
  animal: {
    subtitle: '포근한 동물 친구들 · 클로버 숲속 초원 UI',
    tagline: '포근포근 숲속 동물 친구들 힐링 퍼즐',
    uiLabel: '클로버 숲속 초원',
    badge: '초원 무드',
    badgeColor: 'green',
    heroTokens: [
      {label: '🐶', color: 'orange'},
      {label: '🐱', color: 'yellow'},
      {label: '🐰', color: 'pink'},
      {label: '🍀', color: 'green'},
      {label: '🐼', color: 'teal'},
    ],
  },
  pokemon: {
    subtitle: '3D 클레이 1세대 36종 · 관동 몬스터볼 UI',
    tagline: '입체 클레이 피규어 포켓몬 1세대 사천성',
    uiLabel: '관동 몬스터볼',
    badge: '3D 클레이',
    badgeColor: 'yellow',
    heroTokens: [
      {label: '⚡', color: 'yellow'},
      {label: '🔥', color: 'red'},
      {label: '💧', color: 'blue'},
      {label: '🍃', color: 'green'},
      {label: '✨', color: 'purple'},
    ],
  },
};

/** 게임 화면 진입 방식: 새 판 / 저장된 판 이어하기 / 오늘의 챌린지 */
export type GameEntry = 'new' | 'resume' | 'daily';
export type GameMode = 'classic' | 'daily';

export const MAX_HINTS = 5;
/** 어려움은 힌트를 3회만 준다 */
export const HARD_MAX_HINTS = 3;

export function maxHintsFor(diff: DifficultyKey): number {
  return diff === 'hard' ? HARD_MAX_HINTS : MAX_HINTS;
}
export const MAX_SHUFFLES = 1;
export const COMBO_WINDOW = 3000;

export const DIFFICULTY_ORDER: readonly DifficultyKey[] = [
  'easy',
  'normal',
  'hard',
];

export const DIFFICULTY_META: Record<
  DifficultyKey,
  {
    key: DifficultyKey;
    icon: string;
    name: string;
    desc: string;
    tiles: number;
    gridLabel: string;
  }
> = {
  easy: {
    key: 'easy',
    icon: '🌱',
    name: '쉬움',
    desc: '48개 타일 (6×8 · 가볍게 힐링)',
    tiles: 48,
    gridLabel: '6×8',
  },
  normal: {
    key: 'normal',
    icon: '🌸',
    name: '보통',
    desc: '80개 타일 (8×10 · 적당한 몰입)',
    tiles: 80,
    gridLabel: '8×10',
  },
  hard: {
    key: 'hard',
    icon: '👑',
    name: '어려움',
    desc: '80개 타일 (8×10 · 28종 · 힌트 3회)',
    tiles: 80,
    gridLabel: '8×10',
  },
};

export const TILE_THEME_ORDER: readonly TileThemeKey[] = [
  'fruit',
  'animal',
  'pokemon',
];

export interface BadgeInfo {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

export const BADGES: readonly BadgeInfo[] = [
  {id: 'first_clear', icon: '🌱', name: '첫 걸음', desc: '사천성 첫 클리어 달성'},
  {id: 'combo_5', icon: '🔥', name: '콤보 마스터', desc: '5 콤보 달성'},
  {id: 'hard_clear', icon: '👑', name: '달인의 길', desc: '어려움 난이도 클리어'},
  {id: 'speedy', icon: '⚡', name: '번개눈', desc: '1분 이내 클리어'},
  {id: 'clears_10', icon: '🏆', name: '열정 플레이어', desc: '누적 10회 클리어'},
  {id: 'pairs_200', icon: '🍒', name: '타일 수집가', desc: '누적 200쌍 매칭'},
  {id: 'daily_first', icon: '🗓️', name: '오늘의 도전자', desc: '오늘의 챌린지 첫 클리어'},
  {id: 'streak_7', icon: '🌈', name: '일주일 개근', desc: '오늘의 챌린지 7일 연속 클리어'},
  {id: 'no_hint', icon: '🧠', name: '혼자서도 척척', desc: '힌트 없이 보통 이상 클리어'},
  {id: 'gravity_clear', icon: '🍎', name: '뉴턴의 사과', desc: '중력 모드 클리어'},
];

export const CLEAR_MESSAGES: readonly string[] = [
  '오늘도 최고예요 💕',
  '역시 사천성 달인! 👑',
  '눈썰미가 반짝반짝 ✨',
  '쉬었다 가도 좋아요 ☕',
  '완벽한 한 판이었어요 🌷',
];

export interface GameSettings {
  difficulty: DifficultyKey;
  theme: TileThemeKey;
  sound: boolean;
  bgm: boolean;
  uiTheme: ThemeSlug;
  colorMode: ColorModeKey;
  /** 중력 모드: 짝을 지우면 위 타일이 아래로 떨어진다 (일반 판에만 적용) */
  gravity: boolean;
}

export interface GameStats {
  totalClears: number;
  maxCombo: number;
  matchedPairs: number;
  totalPlayMs: number;
  unlockedBadges: string[];
}

const SETTINGS_KEY = 'shisen-settings';
const STATS_KEY = 'shisen-stats';

const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'easy',
  theme: 'fruit',
  sound: true,
  bgm: true,
  uiTheme: 'malang',
  colorMode: 'light',
  gravity: false,
};

export function loadSettings(): GameSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as Partial<
      Record<string, unknown>
    >;
    const difficulty =
      raw.difficulty === 'easy' ||
      raw.difficulty === 'normal' ||
      raw.difficulty === 'hard'
        ? raw.difficulty
        : DEFAULT_SETTINGS.difficulty;
    const theme: TileThemeKey =
      raw.theme === 'fruit' ||
      raw.theme === 'animal' ||
      raw.theme === 'pokemon'
        ? raw.theme
        : DEFAULT_SETTINGS.theme;
    const uiTheme = THEME_UI_MAP[theme];
    const colorMode =
      raw.colorMode === 'system' ||
      raw.colorMode === 'light' ||
      raw.colorMode === 'dark'
        ? raw.colorMode
        : DEFAULT_SETTINGS.colorMode;

    return {
      difficulty,
      theme,
      sound: raw.sound !== false,
      bgm: raw.bgm !== false,
      uiTheme,
      colorMode,
      gravity: raw.gravity === true,
    };
  } catch {
    return {...DEFAULT_SETTINGS};
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors in restricted browsers
  }
}

export function loadStats(): GameStats {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) || '{}') as Partial<
      Record<string, unknown>
    >;
    return {
      totalClears: typeof raw.totalClears === 'number' ? raw.totalClears : 0,
      maxCombo: typeof raw.maxCombo === 'number' ? raw.maxCombo : 0,
      matchedPairs:
        typeof raw.matchedPairs === 'number' ? raw.matchedPairs : 0,
      totalPlayMs: typeof raw.totalPlayMs === 'number' ? raw.totalPlayMs : 0,
      unlockedBadges: Array.isArray(raw.unlockedBadges)
        ? raw.unlockedBadges.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return {
      totalClears: 0,
      maxCombo: 0,
      matchedPairs: 0,
      totalPlayMs: 0,
      unlockedBadges: [],
    };
  }
}

export function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota errors
  }
}

/** 난이도별 최고 기록 키 (중력 모드는 따로 기록) */
export function bestKey(diff: DifficultyKey, gravity = false): string {
  return gravity ? `shisen-best-${diff}-gravity` : `shisen-best-${diff}`;
}

export function getBestMs(diff: DifficultyKey, gravity = false): number {
  try {
    const v = Number(localStorage.getItem(bestKey(diff, gravity)));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

export function setBestMs(diff: DifficultyKey, ms: number, gravity = false): void {
  try {
    localStorage.setItem(bestKey(diff, gravity), String(ms));
  } catch {
    // Ignore storage quota errors
  }
}

export function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '--:--';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTimerClock(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSec = Math.floor(safe / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface ClearContext {
  mode: GameMode;
  gravity?: boolean;
  hintsUsed: number;
  /** 일일 챌린지 현재 연속 일수 */
  dailyStreak?: number;
}

export function evaluateUnlockedBadges(
  stats: GameStats,
  difficulty: DifficultyKey,
  lastClearMs?: number,
  context?: ClearContext,
): {nextStats: GameStats; newlyUnlocked: BadgeInfo[]} {
  const unlocked = new Set(stats.unlockedBadges);
  const newlyUnlocked: BadgeInfo[] = [];

  const grant = (id: string) => {
    if (!unlocked.has(id)) {
      unlocked.add(id);
      const badge = BADGES.find(b => b.id === id);
      if (badge) newlyUnlocked.push(badge);
    }
  };

  if (stats.totalClears >= 1) grant('first_clear');
  if (stats.maxCombo >= 5) grant('combo_5');
  if (difficulty === 'hard') grant('hard_clear');
  if (typeof lastClearMs === 'number' && lastClearMs <= 60000) {
    grant('speedy');
  }
  if (stats.totalClears >= 10) grant('clears_10');
  if (stats.matchedPairs >= 200) grant('pairs_200');
  if (context?.mode === 'daily') grant('daily_first');
  if (context?.gravity) grant('gravity_clear');
  if ((context?.dailyStreak ?? 0) >= 7) grant('streak_7');
  if (context && context.hintsUsed === 0 && difficulty !== 'easy') {
    grant('no_hint');
  }

  return {
    nextStats: {
      ...stats,
      unlockedBadges: Array.from(unlocked),
    },
    newlyUnlocked,
  };
}

// ---------------------------------------------------------------------------
// 진행 중인 판 저장 / 이어하기
// ---------------------------------------------------------------------------

const SAVE_KEY = 'shisen-save';
const SAVE_VERSION = 1;

export interface SavedGame {
  version: number;
  /** 없으면 classic (이전 버전 저장분) */
  mode?: GameMode;
  /** mode === 'daily'일 때 챌린지 날짜 'YYYY-MM-DD' */
  dailyKey?: string;
  /** 중력 모드로 진행 중인 판 */
  gravity?: boolean;
  difficulty: DifficultyKey;
  rows: number;
  cols: number;
  grid: number[][];
  elapsedMs: number;
  hintsLeft: number;
  shufflesLeft: number;
  savedAt: number;
}

function isValidSavedGame(raw: unknown): raw is SavedGame {
  if (!raw || typeof raw !== 'object') return false;
  const s = raw as Partial<SavedGame>;
  if (s.version !== SAVE_VERSION) return false;
  if (s.difficulty !== 'easy' && s.difficulty !== 'normal' && s.difficulty !== 'hard') {
    return false;
  }
  const {rows, cols, grid} = s;
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) return false;
  if (!Array.isArray(grid) || grid.length !== (rows as number) + 2) return false;
  // 어려움은 일부 종류가 2장뿐이라 종류 수가 (타일 수/2)까지 늘어날 수 있다
  const kinds = ((rows as number) * (cols as number)) / 2;
  let remaining = 0;
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== (cols as number) + 2) return false;
    for (const v of row) {
      // -1 = 벽돌
      if (!Number.isInteger(v) || v < -1 || v > kinds) return false;
      if (v > 0) remaining++;
    }
  }
  if (remaining === 0 || remaining % 2 !== 0) return false;
  return (
    typeof s.elapsedMs === 'number' &&
    typeof s.hintsLeft === 'number' &&
    typeof s.shufflesLeft === 'number'
  );
}

export function loadSavedGame(): SavedGame | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!isValidSavedGame(raw)) return null;
    // 지난 날짜의 챌린지는 이어하지 않는다
    if (raw.mode === 'daily' && raw.dailyKey !== todayKey()) return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveGame(game: Omit<SavedGame, 'version' | 'savedAt'>): void {
  try {
    const payload: SavedGame = {...game, version: SAVE_VERSION, savedAt: Date.now()};
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function countRemaining(grid: number[][]): number {
  let n = 0;
  for (const row of grid) for (const v of row) if (v > 0) n++;
  return n;
}

/** 저장된 격자로 보드를 복원한다 (생성자가 만든 판은 덮어쓴다). */
export function createBoardFromGrid(
  rows: number,
  cols: number,
  grid: number[][],
): BoardInstance {
  const board = createBoard(rows, cols);
  board.grid = grid.map(row => [...row]);
  board.history = [];
  return board;
}
