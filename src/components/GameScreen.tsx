import {useCallback, useEffect, useRef, useState} from 'react';
import {
  BarChart3,
  Home,
  Lightbulb,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Settings,
  Share2,
  Shuffle,
  Sun,
} from 'lucide-react';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Badge} from '@astryxdesign/core/Badge';
import {BottomSheet} from '@astryxdesign/core/BottomSheet';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {
  HStack,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  StackItem,
  VStack,
} from '@astryxdesign/core/Layout';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {Switch} from '@astryxdesign/core/Switch';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {BoardController} from '../board/boardController';
import type {BoardInstance, Coord} from '../types/game';
import {
  BADGES,
  CLEAR_MESSAGES,
  COMBO_WINDOW,
  DIFFICULTIES,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  MAX_HINTS,
  maxHintsFor,
  timeLimitFor,
  MAX_SHUFFLES,
  Sound,
  THEMES,
  THEME_META,
  TILE_SPRITE_URLS,
  TILE_THEME_ORDER,
  clearSavedGame,
  createBoard,
  createBoardFor,
  createBoardFromGrid,
  evaluateUnlockedBadges,
  loadSavedGame,
  saveGame,
  formatTime,
  formatTimerClock,
  getBestMs,
  setBestMs,
  type ColorModeKey,
  type DifficultyKey,
  type GameEntry,
  type GameMode,
  type GameSettings,
  type GameStats,
  type SavedGame,
  type TileThemeKey,
} from '../utils/gameStore';
import {
  DAILY_DIFFICULTY,
  currentStreak,
  dailySeed,
  formatDailyShort,
  loadDailyRecords,
  recordDailyClear,
  seededRng,
  todayKey,
  transposeGrid,
} from '../utils/daily';
import {shareResult, type ShareInfo} from '../utils/shareCard';
import {layoutStyles} from '../styles/layout';
import {safeAreaStyles} from '../styles/safeArea';

export interface GameScreenProps {
  settings: GameSettings;
  /** 진입 방식: 새 판 / 저장된 판 이어하기(없으면 새 판) / 오늘의 챌린지 */
  entry: GameEntry;
  stats: GameStats;
  onUpdateStats: (nextStats: GameStats) => void;
  onChangeDifficulty: (diff: DifficultyKey) => void;
  onChangeGravity: (enabled: boolean) => void;
  onChangeTileTheme: (theme: TileThemeKey) => void;
  onChangeColorMode: (mode: ColorModeKey) => void;
  onToggleBgm: (enabled: boolean) => void;
  onToggleSound: (enabled: boolean) => void;
  onBackHome: () => void;
  onOpenDashboard: () => void;
  showToast: (message: string) => void;
}

interface ClearInfo {
  isBest: boolean;
  elapsedMs: number;
  /** 다이얼로그 부제, 예: '보통 난이도 클리어 🎉' */
  subtitle: string;
  message: string;
  share: ShareInfo;
}

/** 확인창을 거친 뒤 시작할 판 */
type PendingStart =
  | {mode: 'classic'; diff: DifficultyKey; gravity: boolean}
  | {mode: 'daily'};

function isPortraitStage(stage: HTMLElement | null): boolean {
  const rect = stage?.getBoundingClientRect();
  return rect && rect.width > 0 && rect.height > 0
    ? rect.height > rect.width * 1.1
    : window.innerHeight > window.innerWidth * 1.1;
}

const DIFFICULTY_SELECTOR_OPTIONS = DIFFICULTY_ORDER.map(key => ({
  value: key,
  label: `${DIFFICULTY_META[key].icon} ${DIFFICULTY_META[key].name} (${DIFFICULTY_META[key].tiles})`,
}));

const TILE_THEME_SELECTOR_OPTIONS = TILE_THEME_ORDER.map(key => ({
  value: key,
  label: `${THEMES[key].icon} ${THEMES[key].name} (${THEME_META[key].uiLabel})`,
}));

export function GameScreen({
  settings,
  entry,
  stats,
  onUpdateStats,
  onChangeDifficulty,
  onChangeGravity,
  onChangeTileTheme,
  onChangeColorMode,
  onToggleBgm,
  onToggleSound,
  onBackHome,
  onOpenDashboard,
  showToast,
}: GameScreenProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<BoardController | null>(null);

  const boardRef = useRef<BoardInstance | null>(null);
  const selectedRef = useRef<Coord | null>(null);
  const comboRef = useRef(0);
  const lastMatchRef = useRef(0);
  const hintsLeftRef = useRef(MAX_HINTS);
  const shufflesLeftRef = useRef(MAX_SHUFFLES);
  const finishedRef = useRef(false);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const timerIdRef = useRef<number | null>(null);
  const pendingTimersRef = useRef<number[]>([]);
  const gameIdRef = useRef(0);
  /** 현재 판의 난이도 (설정 변경과 별개로 저장에 사용) */
  const activeDiffRef = useRef<DifficultyKey>(settings.difficulty);
  /** 한 번이라도 조작했는지 — 손대지 않은 판은 저장하지 않는다 */
  const dirtyRef = useRef(false);
  const modeRef = useRef<GameMode>('classic');
  /** 일일 챌린지 날짜 'YYYY-MM-DD' */
  const dailyKeyRef = useRef('');
  /** 이번 판 최대 콤보 (공유 카드용) */
  const gameMaxComboRef = useRef(0);
  /** 이번 판 중력 모드 여부 (판 시작 시 고정) */
  const gravityRef = useRef(false);
  /** 설정 시트·확인창이 열려 있는 동안 일시정지 */
  const pausedRef = useRef(false);
  /** 이번 판의 제한 시간(ms), 0이면 제한 없음 */
  const timeLimitRef = useRef(0);
  /** 제한 시간이 다 됐을 때 부를 함수 (타이머 콜백에서 최신 함수를 쓰기 위한 ref) */
  const timeUpRef = useRef<() => void>(() => {});

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const [remaining, setRemaining] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timeLimitMs, setTimeLimitMs] = useState(0);
  /** 시간 초과 창: 열려 있으면 그때 남은 타일 수 */
  const [timeUpTiles, setTimeUpTiles] = useState<number | null>(null);
  const [bestMs, setBestMsState] = useState(() => getBestMs(settings.difficulty));
  const [hintsLeft, setHintsLeft] = useState(MAX_HINTS);
  const [shufflesLeft, setShufflesLeft] = useState(MAX_SHUFFLES);
  const [finished, setFinished] = useState(false);
  const [clearInfo, setClearInfo] = useState<ClearInfo | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mode, setMode] = useState<GameMode>('classic');
  const [gravityOn, setGravityOn] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  /** 진행 중인 판을 버리고 새로 시작할지 확인 대기 중인 판 */
  const [pendingNewGame, setPendingNewGame] = useState<PendingStart | null>(
    null,
  );

  const stopTimer = useCallback(() => {
    if (timerIdRef.current !== null) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
      // 멈춘 순간까지의 시간을 정확히 남긴다 (250ms 틱 사이 손실 방지)
      elapsedRef.current = Date.now() - startTimeRef.current;
      setElapsedMs(elapsedRef.current);
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    startTimeRef.current = Date.now() - elapsedRef.current;
    timerIdRef.current = window.setInterval(() => {
      const nextElapsed = Date.now() - startTimeRef.current;
      elapsedRef.current = nextElapsed;
      setElapsedMs(nextElapsed);
      if (timeLimitRef.current > 0 && nextElapsed >= timeLimitRef.current) {
        timeUpRef.current();
      }
    }, 250);
  }, [stopTimer]);

  const clearPendingTimers = useCallback(() => {
    for (const id of pendingTimersRef.current) clearTimeout(id);
    pendingTimersRef.current = [];
  }, []);

  const syncRemaining = useCallback(() => {
    const board = boardRef.current;
    setRemaining(board ? board.remaining() : 0);
  }, []);

  const deselect = useCallback(() => {
    if (selectedRef.current) {
      controllerRef.current?.setSelected(selectedRef.current, false);
    }
    selectedRef.current = null;
  }, []);

  const selectTile = useCallback((p: Coord) => {
    selectedRef.current = p;
    controllerRef.current?.setSelected(p, true);
  }, []);

  const persistGame = useCallback(() => {
    const board = boardRef.current;
    if (!board || finishedRef.current || !dirtyRef.current) return;
    if (board.isCleared()) return;
    if (timerIdRef.current !== null) {
      elapsedRef.current = Date.now() - startTimeRef.current;
    }
    saveGame({
      mode: modeRef.current,
      dailyKey: modeRef.current === 'daily' ? dailyKeyRef.current : undefined,
      gravity: gravityRef.current,
      difficulty: activeDiffRef.current,
      rows: board.rows,
      cols: board.cols,
      grid: board.grid,
      elapsedMs: elapsedRef.current,
      hintsLeft: hintsLeftRef.current,
      shufflesLeft: shufflesLeftRef.current,
    });
  }, []);

  const resetRoundState = useCallback(
    (
      board: BoardInstance,
      diff: DifficultyKey,
      nextMode: GameMode,
      dailyKey: string,
      gravity: boolean,
      saved?: SavedGame,
    ) => {
      gameIdRef.current += 1;
      clearPendingTimers();
      stopTimer();

      boardRef.current = board;
      activeDiffRef.current = diff;
      modeRef.current = nextMode;
      dailyKeyRef.current = dailyKey;
      gravityRef.current = gravity;
      gameMaxComboRef.current = 0;
      setMode(nextMode);
      setGravityOn(gravity);
      selectedRef.current = null;
      hintsLeftRef.current = saved ? saved.hintsLeft : maxHintsFor(diff);
      shufflesLeftRef.current = saved ? saved.shufflesLeft : MAX_SHUFFLES;
      elapsedRef.current = saved ? saved.elapsedMs : 0;
      timeLimitRef.current = nextMode === 'classic' ? timeLimitFor(diff) : 0;
      setTimeLimitMs(timeLimitRef.current);
      setTimeUpTiles(null);
      comboRef.current = 0;
      lastMatchRef.current = 0;
      finishedRef.current = false;
      dirtyRef.current = Boolean(saved);

      setElapsedMs(elapsedRef.current);
      setHintsLeft(hintsLeftRef.current);
      setShufflesLeft(shufflesLeftRef.current);
      setFinished(false);
      setClearInfo(null);
      setBestMsState(
        nextMode === 'daily'
          ? (loadDailyRecords()[dailyKey]?.bestMs ?? 0)
          : getBestMs(diff, gravity),
      );
      setRemaining(board.remaining());

      controllerRef.current?.build(board, settingsRef.current.theme);
      if (!pausedRef.current) startTimer();
    },
    [clearPendingTimers, startTimer, stopTimer],
  );

  const startNewGame = useCallback(
    (overrideDiff?: DifficultyKey, overrideGravity?: boolean) => {
      const activeDiff = overrideDiff ?? settingsRef.current.difficulty;
      const gravity = overrideGravity ?? settingsRef.current.gravity;
      const diff = DIFFICULTIES[activeDiff];
      const portrait = isPortraitStage(stageRef.current);

      const rows = portrait ? diff.cols : diff.rows;
      const cols = portrait ? diff.rows : diff.cols;

      clearSavedGame();
      resetRoundState(createBoardFor(diff, rows, cols), activeDiff, 'classic', '', gravity);
    },
    [resetRoundState],
  );

  /**
   * 오늘의 챌린지: 날짜 시드로 가로형 판을 만들고, 세로 화면이면 행·열만 바꿔 보여 준다.
   * (같은 날에는 기기 방향과 상관없이 모두 같은 퍼즐)
   */
  const startDailyGame = useCallback(() => {
    const key = todayKey();
    const diff = DIFFICULTIES[DAILY_DIFFICULTY];
    const canonical = createBoard(diff.rows, diff.cols, seededRng(dailySeed(key)));
    const board = isPortraitStage(stageRef.current)
      ? createBoardFromGrid(diff.cols, diff.rows, transposeGrid(canonical.grid))
      : createBoardFromGrid(diff.rows, diff.cols, canonical.grid);
    clearSavedGame();
    // 챌린지는 기록 비교를 위해 항상 중력 없이 진행한다
    resetRoundState(board, DAILY_DIFFICULTY, 'daily', key, false);
  }, [resetRoundState]);

  /** 저장된 판을 복원한다. 복원할 판이 없으면 false. */
  const restoreGame = useCallback((): boolean => {
    const saved = loadSavedGame();
    if (!saved) return false;
    const board = createBoardFromGrid(saved.rows, saved.cols, saved.grid);
    const savedMode: GameMode = saved.mode === 'daily' ? 'daily' : 'classic';
    if (savedMode === 'classic' && saved.difficulty !== settingsRef.current.difficulty) {
      onChangeDifficulty(saved.difficulty);
    }
    resetRoundState(
      board,
      saved.difficulty,
      savedMode,
      saved.dailyKey ?? '',
      saved.gravity === true,
      saved,
    );
    if (!board.hasMoves()) {
      board.shuffle();
      controllerRef.current?.refreshAll(board);
      persistGame();
    }
    return true;
  }, [onChangeDifficulty, persistGame, resetRoundState]);

  /** 진행 중인 판이 있으면 확인을 받은 뒤 새 판을 시작한다. */
  const beginStart = useCallback(
    (start: PendingStart) => {
      if (start.mode === 'daily') {
        startDailyGame();
        return;
      }
      if (start.diff !== settingsRef.current.difficulty) {
        onChangeDifficulty(start.diff);
      }
      if (start.gravity !== settingsRef.current.gravity) {
        onChangeGravity(start.gravity);
      }
      startNewGame(start.diff, start.gravity);
    },
    [onChangeDifficulty, onChangeGravity, startDailyGame, startNewGame],
  );

  const requestStart = useCallback(
    (start: PendingStart) => {
      if (dirtyRef.current && !finishedRef.current) {
        setPendingNewGame(start);
        return;
      }
      beginStart(start);
    },
    [beginStart],
  );

  /** 하단 '새 게임' / 클리어 후 '한 판 더': 챌린지 중이면 같은 챌린지를 다시 */
  const requestReplay = useCallback(() => {
    requestStart(
      modeRef.current === 'daily'
        ? {mode: 'daily'}
        : {
            mode: 'classic',
            diff: settingsRef.current.difficulty,
            gravity: settingsRef.current.gravity,
          },
    );
  }, [requestStart]);

  /** 제한 시간 초과: 판을 끝내고 (기록 없이) 시간 초과 창을 띄운다 */
  const handleTimeUp = useCallback(() => {
    const board = boardRef.current;
    if (!board || finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    clearPendingTimers();
    stopTimer();
    elapsedRef.current = timeLimitRef.current;
    setElapsedMs(timeLimitRef.current);
    deselect();
    controllerRef.current?.clearHints();
    clearSavedGame();
    if (Sound.enabled) Sound.fail();
    setTimeUpTiles(board.remaining());
  }, [clearPendingTimers, deselect, stopTimer]);
  timeUpRef.current = handleTimeUp;

  const confirmNewGame = useCallback(() => {
    const start = pendingNewGame;
    setPendingNewGame(null);
    if (start) beginStart(start);
  }, [beginStart, pendingNewGame]);

  const finishGame = useCallback(
    (activeDiff: DifficultyKey) => {
      finishedRef.current = true;
      setFinished(true);
      stopTimer();
      clearSavedGame();

      const finalElapsed = elapsedRef.current;
      const finishedMode = modeRef.current;
      const dailyKey = dailyKeyRef.current;
      const hintsUsed = Math.max(0, maxHintsFor(activeDiff) - hintsLeftRef.current);
      const curStats = statsRef.current;
      const baseNext: GameStats = {
        ...curStats,
        totalClears: curStats.totalClears + 1,
        totalPlayMs: curStats.totalPlayMs + finalElapsed,
      };

      let isBest: boolean;
      let streak: number | undefined;
      if (finishedMode === 'daily') {
        const result = recordDailyClear(dailyKey, finalElapsed, hintsUsed);
        isBest = result.isBest;
        streak = currentStreak(result.records, dailyKey);
      } else {
        const prevBest = getBestMs(activeDiff, gravityRef.current);
        isBest = !prevBest || finalElapsed < prevBest;
        if (isBest) setBestMs(activeDiff, finalElapsed, gravityRef.current);
      }
      if (isBest) setBestMsState(finalElapsed);

      const {nextStats, newlyUnlocked} = evaluateUnlockedBadges(
        baseNext,
        activeDiff,
        finalElapsed,
        {mode: finishedMode, gravity: gravityRef.current, hintsUsed, dailyStreak: streak},
      );
      statsRef.current = nextStats;
      onUpdateStats(nextStats);

      if (newlyUnlocked.length > 0) {
        const badgeInfo =
          BADGES.find(b => b.id === newlyUnlocked[0].id) ?? newlyUnlocked[0];
        showToast(`🎉 새 업적 획득: [${badgeInfo.name}]!`);
      }

      const currentGameId = gameIdRef.current;
      const timer = window.setTimeout(() => {
        if (gameIdRef.current !== currentGameId) return;
        if (Sound.enabled) Sound.clear();
        const message =
          CLEAR_MESSAGES[Math.floor(Math.random() * CLEAR_MESSAGES.length)];
        const meta = DIFFICULTY_META[activeDiff];
        const title =
          finishedMode === 'daily'
            ? `🗓️ 오늘의 챌린지 ${formatDailyShort(dailyKey)}`
            : `${meta.icon} ${meta.name}${gravityRef.current ? ' · 중력' : ''} 난이도`;
        const activeThemeKey = settingsRef.current.theme;
        const activeTheme = THEMES[activeThemeKey];
        const spriteUrl = TILE_SPRITE_URLS[activeThemeKey];
        setClearInfo({
          isBest,
          elapsedMs: finalElapsed,
          subtitle: `${title} 클리어 🎉`,
          message,
          share: {
            title,
            elapsedText: formatTimerClock(finalElapsed),
            isBest,
            hintsUsed,
            maxCombo: gameMaxComboRef.current,
            streak,
            emojis:
              activeTheme.kind === 'sprite'
                ? activeThemeKey === 'digimon'
                  ? ['🔥', '❄️', '💠', '🌿', '⚡', '🕊️', '✨']
                  : ['⚡', '🔥', '💧', '🌿', '✨', '⭐', '🏆']
                : activeTheme.tiles.slice(0, 7),
            spriteUrl,
            spriteCols: activeTheme.spriteCols,
            spriteRows: activeTheme.spriteRows,
          },
        });
      }, 600);
      pendingTimersRef.current.push(timer);
    },
    [onUpdateStats, showToast, stopTimer],
  );

  const handleTileSelect = useCallback(
    (p: Coord) => {
      const board = boardRef.current;
      if (!board || finishedRef.current || pausedRef.current) return;
      Sound.unlock();
      if (!controllerRef.current?.isHintCoord(p)) {
        controllerRef.current?.clearHints();
      }
      dirtyRef.current = true;
      const cur = selectedRef.current;

      if (!cur) {
        selectTile(p);
        if (Sound.enabled) Sound.select();
        return;
      }

      if (cur.r === p.r && cur.c === p.c) {
        deselect();
        return;
      }

      if (board.get(cur.r, cur.c) !== board.get(p.r, p.c)) {
        deselect();
        selectTile(p);
        if (Sound.enabled) Sound.select();
        return;
      }

      const path = board.tryMatch(cur, p);
      if (!path) {
        controllerRef.current?.shake(p);
        controllerRef.current?.shake(cur);
        if (Sound.enabled) Sound.fail();
        deselect();
        selectTile(p);
        return;
      }

      const now = Date.now();
      const nextCombo =
        now - lastMatchRef.current <= COMBO_WINDOW ? comboRef.current + 1 : 1;
      comboRef.current = nextCombo;
      gameMaxComboRef.current = Math.max(gameMaxComboRef.current, nextCombo);
      lastMatchRef.current = now;
      selectedRef.current = null;

      controllerRef.current?.clearHints();
      controllerRef.current?.drawPath(path.points);
      controllerRef.current?.removeTiles(cur, p, nextCombo);
      if (gravityRef.current) {
        const moves = board.applyGravity();
        if (moves.length) controllerRef.current?.moveTiles(moves);
      }
      if (Sound.enabled) Sound.match(nextCombo);
      if (nextCombo >= 2) controllerRef.current?.showCombo(nextCombo);

      const curStats = statsRef.current;
      const nextStats: GameStats = {
        ...curStats,
        matchedPairs: curStats.matchedPairs + 1,
        maxCombo: Math.max(curStats.maxCombo, nextCombo),
      };
      statsRef.current = nextStats;
      onUpdateStats(nextStats);
      syncRemaining();

      if (board.isCleared()) {
        finishGame(activeDiffRef.current);
        return;
      }
      persistGame();

      if (!board.hasMoves()) {
        const currentGameId = gameIdRef.current;
        const timer = window.setTimeout(() => {
          if (gameIdRef.current !== currentGameId || finishedRef.current) return;
          deselect();
          board.shuffle();
          controllerRef.current?.refreshAll(board);
          if (Sound.enabled) Sound.shuffle();
          showToast('더 이상 맞출 짝이 없어서 타일을 섞었어요! 🔀');
          syncRemaining();
          persistGame();
        }, 450);
        pendingTimersRef.current.push(timer);
      }
    },
    [
      deselect,
      finishGame,
      onUpdateStats,
      persistGame,
      selectTile,
      showToast,
      syncRemaining,
    ],
  );

  const handleHint = useCallback(() => {
    const board = boardRef.current;
    if (!board || finishedRef.current) return;
    if (controllerRef.current?.hasActiveHint()) {
      controllerRef.current.pulseHint();
      if (Sound.enabled) Sound.hint();
      return;
    }
    if (hintsLeftRef.current <= 0) {
      showToast(`힌트를 모두 사용했어요! (최대 ${maxHintsFor(activeDiffRef.current)}회) 💡`);
      return;
    }
    const [pair] = board.availablePairs(1);
    if (!pair) return;

    hintsLeftRef.current -= 1;
    setHintsLeft(hintsLeftRef.current);
    dirtyRef.current = true;
    deselect();
    controllerRef.current?.hint(pair);
    if (Sound.enabled) Sound.hint();
    persistGame();
  }, [deselect, persistGame, showToast]);

  const handleShuffle = useCallback(() => {
    const board = boardRef.current;
    if (!board || finishedRef.current) return;
    if (shufflesLeftRef.current <= 0) {
      showToast('섞기를 모두 사용했어요! (최대 1회) 🔀');
      return;
    }
    shufflesLeftRef.current -= 1;
    setShufflesLeft(shufflesLeftRef.current);
    deselect();
    controllerRef.current?.clearHints();
    dirtyRef.current = true;
    board.shuffle();
    controllerRef.current?.refreshAll(board);
    if (Sound.enabled) Sound.shuffle();
    persistGame();
  }, [deselect, persistGame, showToast]);

  const handleDifficultyChange = useCallback(
    (nextDiff: string) => {
      setIsSettingsOpen(false);
      requestStart({
        mode: 'classic',
        diff: nextDiff as DifficultyKey,
        gravity: settingsRef.current.gravity,
      });
    },
    [requestStart],
  );

  const handleGravityChange = useCallback(
    (enabled: boolean) => {
      if (modeRef.current === 'daily') {
        // 챌린지 판은 그대로 두고 다음 일반 판부터 적용
        onChangeGravity(enabled);
        showToast(
          enabled
            ? '중력 모드는 다음 일반 판부터 적용돼요 (챌린지는 중력 없이 진행)'
            : '중력 모드를 껐어요',
        );
        return;
      }
      setIsSettingsOpen(false);
      requestStart({
        mode: 'classic',
        diff: settingsRef.current.difficulty,
        gravity: enabled,
      });
    },
    [onChangeGravity, requestStart, showToast],
  );

  const handleShare = useCallback(async () => {
    if (!clearInfo || isSharing) return;
    setIsSharing(true);
    try {
      const outcome = await shareResult(clearInfo.share, stageRef.current ?? undefined);
      if (outcome === 'downloaded') {
        showToast('기록 카드 이미지를 저장하고 문구를 복사했어요 📋');
      } else if (outcome === 'copied') {
        showToast('기록 문구를 복사했어요 📋');
      }
    } finally {
      setIsSharing(false);
    }
  }, [clearInfo, isSharing, showToast]);

  const handleTileThemeChange = useCallback(
    (nextTheme: string) => {
      const typedTheme = nextTheme as TileThemeKey;
      onChangeTileTheme(typedTheme);
      if (boardRef.current) {
        controllerRef.current?.retheme(boardRef.current, typedTheme);
        controllerRef.current?.blurBoard();
      }
    },
    [onChangeTileTheme],
  );

  const handleBackHome = useCallback(() => {
    persistGame();
    onBackHome();
  }, [onBackHome, persistGame]);

  const handleOpenDashboard = useCallback(() => {
    persistGame();
    onOpenDashboard();
  }, [onOpenDashboard, persistGame]);

  const onTileSelectRef = useRef(handleTileSelect);
  onTileSelectRef.current = handleTileSelect;
  const startNewGameRef = useRef(startNewGame);
  startNewGameRef.current = startNewGame;
  const restoreGameRef = useRef(restoreGame);
  restoreGameRef.current = restoreGame;
  const persistGameRef = useRef(persistGame);
  persistGameRef.current = persistGame;
  const startDailyGameRef = useRef(startDailyGame);
  startDailyGameRef.current = startDailyGame;
  const entryRef = useRef<GameEntry>(entry);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const controller = new BoardController({
      stage,
      onTileSelect: pos => onTileSelectRef.current(pos),
    });
    controllerRef.current = controller;
    const startEntry = entryRef.current;
    if (startEntry === 'resume' && restoreGameRef.current()) {
      // 저장된 판 복원
    } else if (startEntry === 'daily') {
      startDailyGameRef.current();
    } else {
      startNewGameRef.current(settingsRef.current.difficulty);
    }
    // StrictMode 재마운트 때는 방금 저장한 판을 이어간다
    entryRef.current = 'resume';

    return () => {
      persistGameRef.current();
      clearPendingTimers();
      stopTimer();
      controller.destroy();
      controllerRef.current = null;
    };
  }, [clearPendingTimers, stopTimer]);

  // 설정 시트나 확인창이 열리면 일시정지: 타이머를 멈추고 보드를 흐리게 가린다
  const isPaused = isSettingsOpen || pendingNewGame != null;
  useEffect(() => {
    if (!boardRef.current) return;
    if (isPaused === pausedRef.current) return;
    pausedRef.current = isPaused;
    controllerRef.current?.setPaused(isPaused);
    if (isPaused) {
      deselect();
      stopTimer();
      persistGame();
    } else if (!finishedRef.current && !document.hidden) {
      startTimer();
    }
  }, [deselect, isPaused, persistGame, startTimer, stopTimer]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select')) return;
      if (pausedRef.current) return;

      if (e.key === 'h' || e.key === 'H') {
        handleHint();
      } else if (e.key === 's' || e.key === 'S') {
        handleShuffle();
      } else if (e.key === 'm' || e.key === 'M') {
        onToggleBgm(!settingsRef.current.bgm);
      } else if (e.key === 'Escape') {
        if (selectedRef.current) {
          deselect();
        } else {
          controllerRef.current?.clearHints();
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        persistGame();
        stopTimer();
      } else if (!finishedRef.current && !pausedRef.current) {
        startTimer();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', persistGame);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', persistGame);
    };
  }, [
    deselect,
    handleHint,
    handleShuffle,
    onToggleBgm,
    persistGame,
    startTimer,
    stopTimer,
  ]);

  return (
    <VStack height="100dvh" xstyle={safeAreaStyles.screen}>
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={1.5}>
            <HStack justify="between" align="center" gap={1}>
              <StackItem size="static">
                <IconButton
                  label="홈으로 (진행 상황은 자동 저장돼요)"
                  icon={<Icon icon={Home} size="sm" />}
                  variant="secondary"
                  size="sm"
                  onClick={handleBackHome}
                />
              </StackItem>

              <StackItem size="fill">
                <Center>
                  <Card padding={1} maxWidth="100%">
                    <HStack gap={1} align="center" justify="center" wrap="wrap">
                      {(mode === 'daily' || gravityOn) && (
                        <HStack gap={0.5} align="center">
                          {mode === 'daily' && <Text size="xsm">🗓️</Text>}
                          {gravityOn && <Text size="xsm">⬇️</Text>}
                        </HStack>
                      )}
                      <HStack gap={0.5} align="center">
                        <Text type="supporting" size="xsm">
                          남은
                        </Text>
                        <Text size="sm" weight="bold" hasTabularNumbers>
                          {remaining}
                        </Text>
                      </HStack>

                      <HStack gap={0.5} align="center">
                        <Text type="supporting" size="xsm">
                          {timeLimitMs > 0 ? '⏰' : '시간'}
                        </Text>
                        <Text
                          size="sm"
                          weight="bold"
                          hasTabularNumbers
                          color={
                            timeLimitMs > 0 && timeLimitMs - elapsedMs <= 30_000
                              ? 'accent'
                              : undefined
                          }>
                          {timeLimitMs > 0
                            ? formatTimerClock(
                                // 남은 시간은 올림해서 00:00이 되는 순간 끝나도록
                                Math.ceil(Math.max(0, timeLimitMs - elapsedMs) / 1000) * 1000,
                              )
                            : formatTimerClock(elapsedMs)}
                        </Text>
                      </HStack>

                      <HStack gap={0.5} align="center">
                        <Text type="supporting" size="xsm">
                          {mode === 'daily' ? '오늘' : '최고'}
                        </Text>
                        <Text size="sm" weight="bold" hasTabularNumbers>
                          {formatTime(bestMs)}
                        </Text>
                      </HStack>
                    </HStack>
                  </Card>
                </Center>
              </StackItem>

              <StackItem size="static">
                <IconButton
                  label="게임 설정"
                  icon={<Icon icon={Settings} size="sm" />}
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsSettingsOpen(true)}
                />
              </StackItem>
            </HStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent isScrollable={false} padding={1} role="main" label="사천성 퍼즐 보드 영역">
            <Center ref={stageRef} width="100%" height="100%">
              {null}
            </Center>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider padding={1.5}>
            <Center>
              <HStack gap={1.5} align="center" justify="center" wrap="wrap">
                <Button
                  label="힌트"
                  variant="secondary"
                  size="md"
                  icon={<Icon icon={Lightbulb} size="sm" />}
                  endContent={
                    <Badge
                      label={String(hintsLeft)}
                      variant={hintsLeft > 0 ? 'orange' : 'neutral'}
                    />
                  }
                  isDisabled={hintsLeft <= 0 || finished}
                  onClick={handleHint}
                />

                <Button
                  label="섞기"
                  variant="secondary"
                  size="md"
                  icon={<Icon icon={Shuffle} size="sm" />}
                  endContent={
                    <Badge
                      label={String(shufflesLeft)}
                      variant={shufflesLeft > 0 ? 'pink' : 'neutral'}
                    />
                  }
                  isDisabled={shufflesLeft <= 0 || finished}
                  onClick={handleShuffle}
                />

                <Button
                  label={mode === 'daily' ? '다시 도전' : '새 게임'}
                  variant="primary"
                  size="md"
                  icon={<Icon icon={RotateCcw} size="sm" />}
                  onClick={requestReplay}
                />
              </HStack>
            </Center>
          </LayoutFooter>
        }
      />

      <Dialog
        isOpen={clearInfo != null}
        onOpenChange={open => {
          if (!open) setClearInfo(null);
        }}
        purpose="info"
        width={380}>
        <Layout
          header={
            <DialogHeader
              title={clearInfo?.isBest ? '최고 기록 달성!' : '모두 맞췄어요!'}
              subtitle={clearInfo?.subtitle ?? ''}
              onOpenChange={open => {
                if (!open) setClearInfo(null);
              }}
            />
          }
          content={
            <LayoutContent isScrollable={false}>
              <VStack gap={2} hAlign="center">
                <Text size="4xl">{clearInfo?.isBest ? '🏆' : '🎉'}</Text>
                <Token
                  size="lg"
                  color="orange"
                  label={`클리어 시간 ${formatTimerClock(clearInfo?.elapsedMs ?? 0)}`}
                  xstyle={layoutStyles.noShrink}
                />
                <HStack gap={1} hAlign="center" wrap="wrap">
                  <Token
                    size="sm"
                    color="yellow"
                    label={`💡 힌트 ${clearInfo?.share.hintsUsed ?? 0}회`}
                    xstyle={layoutStyles.noShrink}
                  />
                  <Token
                    size="sm"
                    color="pink"
                    label={`🔥 최대 콤보 ${clearInfo?.share.maxCombo ?? 0}`}
                    xstyle={layoutStyles.noShrink}
                  />
                  {typeof clearInfo?.share.streak === 'number' && (
                    <Token
                      size="sm"
                      color="green"
                      label={`🗓️ ${clearInfo.share.streak}일 연속`}
                      xstyle={layoutStyles.noShrink}
                    />
                  )}
                </HStack>
                <Text type="supporting" justify="center">
                  {clearInfo?.message ?? ''}
                </Text>
                <Button
                  label="기록 카드 공유하기"
                  variant="secondary"
                  width="100%"
                  icon={<Icon icon={Share2} size="sm" />}
                  isLoading={isSharing}
                  onClick={handleShare}
                />
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={1.5} justify="end" width="100%" wrap="wrap">
                <Button
                  label="기록 보기"
                  variant="secondary"
                  onClick={() => {
                    setClearInfo(null);
                    handleOpenDashboard();
                  }}
                />
                <Button
                  label={mode === 'daily' ? '다시 도전' : '한 판 더'}
                  variant="primary"
                  onClick={requestReplay}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>

      <BottomSheet
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        label="게임 설정"
        height="hug">
        <VStack gap={2}>
          <Heading level={3}>게임 설정</Heading>

          <Selector
            label="난이도 (바꾸면 새 판이 시작돼요)"
            presentation="adaptive"
            width="100%"
            options={DIFFICULTY_SELECTOR_OPTIONS}
            value={settings.difficulty}
            onChange={handleDifficultyChange}
          />
          <Selector
            label="게임 테마 (타일 & UI 디자인)"
            presentation="adaptive"
            width="100%"
            startIcon={<Icon icon={Palette} size="sm" />}
            options={TILE_THEME_SELECTOR_OPTIONS}
            value={settings.theme}
            onChange={handleTileThemeChange}
          />
          <Switch
            label="중력 모드 (바꾸면 새 판이 시작돼요)"
            labelPosition="start"
            labelSpacing="spread"
            value={settings.gravity}
            onChange={checked => handleGravityChange(checked)}
          />

          <VStack gap={1}>
            <Text type="label" weight="medium">
              화면 모드
            </Text>
            <SegmentedControl
              label="화면 모드"
              value={settings.colorMode}
              onChange={val => onChangeColorMode(val as ColorModeKey)}
              layout="fill"
              size="md">
              <SegmentedControlItem
                value="system"
                label="자동"
                icon={<Icon icon={Monitor} size="sm" />}
              />
              <SegmentedControlItem
                value="light"
                label="라이트"
                icon={<Icon icon={Sun} size="sm" />}
              />
              <SegmentedControlItem
                value="dark"
                label="다크"
                icon={<Icon icon={Moon} size="sm" />}
              />
            </SegmentedControl>
          </VStack>

          <Divider />

          <Switch
            label="배경음악 (BGM)"
            description={THEME_META[settings.theme].soundLabel}
            labelPosition="start"
            labelSpacing="spread"
            value={settings.bgm}
            onChange={checked => onToggleBgm(checked)}
          />
          <Switch
            label="효과음 (SFX)"
            description="테마별 효과음 재생"
            labelPosition="start"
            labelSpacing="spread"
            value={settings.sound}
            onChange={checked => onToggleSound(checked)}
          />

          <Button
            label="플레이 대시보드"
            variant="secondary"
            width="100%"
            icon={<Icon icon={BarChart3} size="sm" />}
            onClick={() => {
              setIsSettingsOpen(false);
              handleOpenDashboard();
            }}
          />
        </VStack>
      </BottomSheet>

      <AlertDialog
        isOpen={timeUpTiles != null}
        onOpenChange={open => {
          if (!open) setTimeUpTiles(null);
        }}
        title="시간 초과! ⏰"
        description={`${Math.round(timeLimitMs / 60_000)}분 안에 다 맞추지 못했어요. 남은 타일 ${timeUpTiles ?? 0}개. 다시 도전해 볼까요?`}
        actionLabel="다시 하기"
        cancelLabel="닫기"
        actionVariant="primary"
        onAction={() => {
          setTimeUpTiles(null);
          requestReplay();
        }}
      />

      <AlertDialog
        isOpen={pendingNewGame != null}
        onOpenChange={open => {
          if (!open) setPendingNewGame(null);
        }}
        title="새 판을 시작할까요?"
        description="지금 진행 중인 판은 사라져요."
        actionLabel="새로 시작"
        cancelLabel="계속 하기"
        actionVariant="primary"
        onAction={confirmNewGame}
      />
    </VStack>
  );
}
