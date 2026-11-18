/**
 * 일일 챌린지 — 날짜를 시드로 매일 같은 판을 만들고, 날짜별 기록과 연속 일수를 관리한다.
 */

/** 일일 챌린지 난이도 (보통 8×10, 80개) */
export const DAILY_DIFFICULTY = 'normal' as const;

const DAILY_RECORDS_KEY = 'shisen-daily';

export interface DailyRecord {
  /** 그날 최고 클리어 시간 */
  bestMs: number;
  /** 최고 기록 판에서 쓴 힌트 수 */
  hintsUsed: number;
  /** 그날 클리어 횟수 */
  clears: number;
}

export type DailyRecords = Record<string, DailyRecord>;

/** 기기 로컬 날짜 기준 'YYYY-MM-DD' */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

/** 'YYYY-MM-DD' → '11월 18일' */
export function formatDailyLabel(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${m}월 ${d}일`;
}

/** 'YYYY-MM-DD' → '11/18' */
export function formatDailyShort(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${m}/${d}`;
}

/** 문자열 → 32비트 시드 (FNV-1a) */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 시드 고정 난수 (mulberry32) */
export function seededRng(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dailySeed(key: string): string {
  return `malang-shisen-daily-${key}`;
}

/** 행/열을 맞바꾼 격자 (세로 화면용). 2회 꺾임 연결 관계는 그대로 유지된다. */
export function transposeGrid(grid: number[][]): number[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const out: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const row: number[] = [];
    for (let r = 0; r < rows; r++) row.push(grid[r][c]);
    out.push(row);
  }
  return out;
}

export function loadDailyRecords(): DailyRecords {
  try {
    const raw = JSON.parse(localStorage.getItem(DAILY_RECORDS_KEY) || '{}') as unknown;
    if (!raw || typeof raw !== 'object') return {};
    const out: DailyRecords = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== 'object') {
        continue;
      }
      const v = value as Partial<DailyRecord>;
      if (typeof v.bestMs !== 'number' || v.bestMs <= 0) continue;
      out[key] = {
        bestMs: v.bestMs,
        hintsUsed: typeof v.hintsUsed === 'number' ? v.hintsUsed : 0,
        clears: typeof v.clears === 'number' ? v.clears : 1,
      };
    }
    return out;
  } catch {
    return {};
  }
}

function saveDailyRecords(records: DailyRecords): void {
  try {
    localStorage.setItem(DAILY_RECORDS_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota errors
  }
}

/** 클리어 기록을 남기고, 그날 최고 기록을 경신했는지 돌려준다. */
export function recordDailyClear(
  key: string,
  elapsedMs: number,
  hintsUsed: number,
): {isBest: boolean; records: DailyRecords} {
  const records = loadDailyRecords();
  const prev = records[key];
  const isBest = !prev || elapsedMs < prev.bestMs;
  records[key] = {
    bestMs: isBest ? elapsedMs : prev.bestMs,
    hintsUsed: isBest ? hintsUsed : prev.hintsUsed,
    clears: (prev?.clears ?? 0) + 1,
  };
  saveDailyRecords(records);
  return {isBest, records};
}

function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

/**
 * 현재 연속 일수. 오늘을 아직 안 깼어도 어제까지 이어져 있으면 그 연속을 보여 준다.
 */
export function currentStreak(records: DailyRecords, today = todayKey()): number {
  let key = records[today] ? today : previousDay(today);
  let streak = 0;
  while (records[key]) {
    streak++;
    key = previousDay(key);
  }
  return streak;
}

export function longestStreak(records: DailyRecords): number {
  const keys = Object.keys(records).sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const key of keys) {
    run = prev && previousDay(key) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}
