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
import type {
  BoardConstructor,
  BoardInstance,
  DifficultyConfig,
  SoundEngine,
  TileThemeConfig,
} from '../types/game';

const BoardClass = RawBoard as unknown as BoardConstructor;

export function createBoard(rows: number, cols: number): BoardInstance {
  return new BoardClass(rows, cols);
}

export const DIFFICULTIES = RawDIFFICULTIES as Record<
  DifficultyKey,
  DifficultyConfig
>;
export const THEMES = RawTHEMES as Record<TileThemeKey, TileThemeConfig>;
export const TINTS = RawTINTS as string[];
export const Sound = RawSound as unknown as SoundEngine;

export type DifficultyKey = 'easy' | 'normal' | 'hard';
export type TileThemeKey = 'fruit' | 'animal' | 'dessert' | 'mix';
export type ColorModeKey = 'system' | 'light' | 'dark';
export type ScreenName = 'home' | 'dashboard' | 'game';

export const MAX_HINTS = 5;
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
    desc: '96개 타일 (8×12 · 꽉 찬 집중)',
    tiles: 96,
    gridLabel: '8×12',
  },
};

export const TILE_THEME_ORDER: readonly TileThemeKey[] = [
  'fruit',
  'animal',
  'dessert',
  'mix',
];

export const UI_THEME_OPTIONS: Array<{
  value: ThemeSlug;
  label: string;
  description: string;
}> = [
  {
    value: 'malang',
    label: '말랑 파스텔',
    description: '코랄 피치 · Jua 기본 테마',
  },
  {
    value: 'butter',
    label: '버터 크림',
    description: '따뜻한 크림 · 클래식 페이퍼',
  },
  {
    value: 'matcha',
    label: '말차 그린',
    description: '차분한 허브 그린 감성',
  },
  {
    value: 'y2k',
    label: 'Y2K 팝',
    description: '레트로 비비드 픽셀 무드',
  },
  {
    value: 'neutral',
    label: '미니멀 뉴트럴',
    description: '깔끔한 모노톤 UI',
  },
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
};

const VALID_UI_THEMES = new Set<ThemeSlug>([
  'malang',
  'butter',
  'matcha',
  'y2k',
  'neutral',
]);

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
    const theme =
      raw.theme === 'fruit' ||
      raw.theme === 'animal' ||
      raw.theme === 'dessert' ||
      raw.theme === 'mix'
        ? raw.theme
        : DEFAULT_SETTINGS.theme;
    const uiTheme =
      typeof raw.uiTheme === 'string' &&
      VALID_UI_THEMES.has(raw.uiTheme as ThemeSlug)
        ? (raw.uiTheme as ThemeSlug)
        : DEFAULT_SETTINGS.uiTheme;
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

export function bestKey(diff: DifficultyKey): string {
  return `shisen-best-${diff}`;
}

export function getBestMs(diff: DifficultyKey): number {
  try {
    const v = Number(localStorage.getItem(bestKey(diff)));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

export function setBestMs(diff: DifficultyKey, ms: number): void {
  try {
    localStorage.setItem(bestKey(diff), String(ms));
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

export function evaluateUnlockedBadges(
  stats: GameStats,
  difficulty: DifficultyKey,
  lastClearMs?: number,
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

  return {
    nextStats: {
      ...stats,
      unlockedBadges: Array.from(unlocked),
    },
    newlyUnlocked,
  };
}
