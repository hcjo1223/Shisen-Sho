import {useCallback, useEffect, useRef, useState} from 'react';
import {
  BarChart3,
  Home,
  Lightbulb,
  Moon,
  Music,
  Palette,
  RotateCcw,
  Shuffle,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Icon} from '@astryxdesign/core/Icon';
import {
  HStack,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  VStack,
} from '@astryxdesign/core/Layout';
import {Selector} from '@astryxdesign/core/Selector';
import {Heading, Text} from '@astryxdesign/core/Text';
import {ToggleButton} from '@astryxdesign/core/ToggleButton';
import {Token} from '@astryxdesign/core/Token';
import type {ThemeSlug} from '../astryx-themes';
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
  MAX_SHUFFLES,
  Sound,
  THEMES,
  TILE_THEME_ORDER,
  UI_THEME_OPTIONS,
  createBoard,
  evaluateUnlockedBadges,
  formatTime,
  formatTimerClock,
  getBestMs,
  setBestMs,
  type ColorModeKey,
  type DifficultyKey,
  type GameSettings,
  type GameStats,
  type TileThemeKey,
} from '../utils/gameStore';

export interface GameScreenProps {
  settings: GameSettings;
  stats: GameStats;
  onUpdateStats: (nextStats: GameStats) => void;
  onChangeDifficulty: (diff: DifficultyKey) => void;
  onChangeTileTheme: (theme: TileThemeKey) => void;
  onChangeUiTheme: (uiTheme: ThemeSlug) => void;
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
  difficultyName: string;
  message: string;
}

const DIFFICULTY_SELECTOR_OPTIONS = DIFFICULTY_ORDER.map(key => ({
  value: key,
  label: `${DIFFICULTY_META[key].icon} ${DIFFICULTY_META[key].name} (${DIFFICULTY_META[key].tiles})`,
}));

const TILE_THEME_SELECTOR_OPTIONS = TILE_THEME_ORDER.map(key => ({
  value: key,
  label: `${THEMES[key].icon} ${THEMES[key].name}`,
}));

const UI_THEME_SELECTOR_OPTIONS = UI_THEME_OPTIONS.map(option => ({
  value: option.value,
  label: option.label,
}));

export function GameScreen({
  settings,
  stats,
  onUpdateStats,
  onChangeDifficulty,
  onChangeTileTheme,
  onChangeUiTheme,
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

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const [remaining, setRemaining] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bestMs, setBestMsState] = useState(() => getBestMs(settings.difficulty));
  const [hintsLeft, setHintsLeft] = useState(MAX_HINTS);
  const [shufflesLeft, setShufflesLeft] = useState(MAX_SHUFFLES);
  const [finished, setFinished] = useState(false);
  const [clearInfo, setClearInfo] = useState<ClearInfo | null>(null);

  const stopTimer = useCallback(() => {
    if (timerIdRef.current !== null) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    startTimeRef.current = Date.now() - elapsedRef.current;
    timerIdRef.current = window.setInterval(() => {
      const nextElapsed = Date.now() - startTimeRef.current;
      elapsedRef.current = nextElapsed;
      setElapsedMs(nextElapsed);
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

  const startNewGame = useCallback(
    (overrideDiff?: DifficultyKey) => {
      const activeDiff = overrideDiff ?? settingsRef.current.difficulty;
      const diff = DIFFICULTIES[activeDiff];
      const rect = stageRef.current?.getBoundingClientRect();
      const portrait =
        rect && rect.width > 0 && rect.height > 0
          ? rect.height > rect.width * 1.1
          : window.innerHeight > window.innerWidth * 1.1;

      const rows = portrait ? diff.cols : diff.rows;
      const cols = portrait ? diff.rows : diff.cols;

      gameIdRef.current += 1;
      clearPendingTimers();
      stopTimer();

      const board = createBoard(rows, cols);
      boardRef.current = board;
      selectedRef.current = null;
      hintsLeftRef.current = MAX_HINTS;
      shufflesLeftRef.current = MAX_SHUFFLES;
      elapsedRef.current = 0;
      comboRef.current = 0;
      lastMatchRef.current = 0;
      finishedRef.current = false;

      setElapsedMs(0);
      setHintsLeft(MAX_HINTS);
      setShufflesLeft(MAX_SHUFFLES);
      setFinished(false);
      setClearInfo(null);
      setBestMsState(getBestMs(activeDiff));
      setRemaining(board.remaining());

      controllerRef.current?.build(board, settingsRef.current.theme);
      startTimer();
    },
    [clearPendingTimers, startTimer, stopTimer],
  );

  const finishGame = useCallback(
    (activeDiff: DifficultyKey) => {
      finishedRef.current = true;
      setFinished(true);
      stopTimer();

      const finalElapsed = elapsedRef.current;
      const curStats = statsRef.current;
      const baseNext: GameStats = {
        ...curStats,
        totalClears: curStats.totalClears + 1,
        totalPlayMs: curStats.totalPlayMs + finalElapsed,
      };
      const prevBest = getBestMs(activeDiff);
      const isBest = !prevBest || finalElapsed < prevBest;
      if (isBest) {
        setBestMs(activeDiff, finalElapsed);
        setBestMsState(finalElapsed);
      }

      const {nextStats, newlyUnlocked} = evaluateUnlockedBadges(
        baseNext,
        activeDiff,
        finalElapsed,
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
        setClearInfo({
          isBest,
          elapsedMs: finalElapsed,
          difficultyName: DIFFICULTIES[activeDiff].name,
          message,
        });
      }, 600);
      pendingTimersRef.current.push(timer);
    },
    [onUpdateStats, showToast, stopTimer],
  );

  const handleTileSelect = useCallback(
    (p: Coord) => {
      const board = boardRef.current;
      if (!board || finishedRef.current) return;
      Sound.unlock();
      controllerRef.current?.clearHints();
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
      lastMatchRef.current = now;
      selectedRef.current = null;

      controllerRef.current?.drawPath(path.points);
      controllerRef.current?.removeTiles(cur, p, nextCombo);
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
        finishGame(settingsRef.current.difficulty);
        return;
      }

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
        }, 450);
        pendingTimersRef.current.push(timer);
      }
    },
    [deselect, finishGame, onUpdateStats, selectTile, showToast, syncRemaining],
  );

  const handleHint = useCallback(() => {
    const board = boardRef.current;
    if (!board || finishedRef.current) return;
    if (hintsLeftRef.current <= 0) {
      showToast('힌트를 모두 사용했어요! (최대 5회) 💡');
      return;
    }
    const [pair] = board.availablePairs(1);
    if (!pair) return;

    hintsLeftRef.current -= 1;
    setHintsLeft(hintsLeftRef.current);
    deselect();
    controllerRef.current?.hint(pair);
    if (Sound.enabled) Sound.hint();
  }, [deselect, showToast]);

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
    board.shuffle();
    controllerRef.current?.refreshAll(board);
    if (Sound.enabled) Sound.shuffle();
  }, [deselect, showToast]);

  const handleDifficultyChange = useCallback(
    (nextDiff: string) => {
      const typedDiff = nextDiff as DifficultyKey;
      onChangeDifficulty(typedDiff);
      startNewGame(typedDiff);
    },
    [onChangeDifficulty, startNewGame],
  );

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

  const handleQuickColorModeToggle = useCallback(() => {
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const isCurrentlyDark =
      settings.colorMode === 'dark' ||
      (settings.colorMode === 'system' && prefersDark);
    onChangeColorMode(isCurrentlyDark ? 'light' : 'dark');
  }, [onChangeColorMode, settings.colorMode]);

  const onTileSelectRef = useRef(handleTileSelect);
  onTileSelectRef.current = handleTileSelect;
  const startNewGameRef = useRef(startNewGame);
  startNewGameRef.current = startNewGame;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const controller = new BoardController({
      stage,
      onTileSelect: pos => onTileSelectRef.current(pos),
    });
    controllerRef.current = controller;
    startNewGameRef.current(settingsRef.current.difficulty);

    return () => {
      clearPendingTimers();
      stopTimer();
      controller.destroy();
      controllerRef.current = null;
    };
  }, [clearPendingTimers, stopTimer]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select')) return;

      if (e.key === 'h' || e.key === 'H') {
        handleHint();
      } else if (e.key === 's' || e.key === 'S') {
        handleShuffle();
      } else if (e.key === 'm' || e.key === 'M') {
        onToggleBgm(!settingsRef.current.bgm);
      } else if (e.key === 'Escape') {
        deselect();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else if (!finishedRef.current) {
        startTimer();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [deselect, handleHint, handleShuffle, onToggleBgm, startTimer, stopTimer]);

  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDarkActive =
    settings.colorMode === 'dark' ||
    (settings.colorMode === 'system' && prefersDark);

  return (
    <VStack height="100dvh">
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={1.5}>
            <HStack justify="between" align="center" gap={1.5} wrap="wrap">
              <HStack gap={1.5} align="center">
                <IconButton
                  label="홈으로"
                  icon={<Icon icon={Home} size="sm" />}
                  variant="secondary"
                  size="sm"
                  onClick={onBackHome}
                />
                <Heading level={4}>말랑 사천성</Heading>
              </HStack>

              <Card padding={1}>
                <HStack gap={2} align="center">
                  <HStack gap={1} align="center">
                    <Text type="supporting" size="xsm">
                      남은
                    </Text>
                    <Text size="sm" weight="bold" hasTabularNumbers>
                      {remaining}
                    </Text>
                  </HStack>

                  <HStack gap={1} align="center">
                    <Text type="supporting" size="xsm">
                      시간
                    </Text>
                    <Text size="sm" weight="bold" hasTabularNumbers>
                      {formatTimerClock(elapsedMs)}
                    </Text>
                  </HStack>

                  <HStack gap={1} align="center">
                    <Text type="supporting" size="xsm">
                      최고
                    </Text>
                    <Text size="sm" weight="bold" hasTabularNumbers>
                      {formatTime(bestMs)}
                    </Text>
                  </HStack>
                </HStack>
              </Card>

              <HStack gap={1} align="center" wrap="wrap">
                <Selector
                  label="난이도"
                  isLabelHidden
                  size="sm"
                  variant="secondary"
                  presentation="adaptive"
                  options={DIFFICULTY_SELECTOR_OPTIONS}
                  value={settings.difficulty}
                  onChange={handleDifficultyChange}
                />
                <Selector
                  label="타일 테마"
                  isLabelHidden
                  size="sm"
                  variant="secondary"
                  presentation="adaptive"
                  options={TILE_THEME_SELECTOR_OPTIONS}
                  value={settings.theme}
                  onChange={handleTileThemeChange}
                />
                <Selector
                  label="UI 테마"
                  isLabelHidden
                  size="sm"
                  variant="secondary"
                  presentation="adaptive"
                  startIcon={<Icon icon={Palette} size="sm" />}
                  options={UI_THEME_SELECTOR_OPTIONS}
                  value={settings.uiTheme}
                  onChange={val => onChangeUiTheme(val as ThemeSlug)}
                />
                <IconButton
                  label={isDarkActive ? '라이트 모드' : '다크 모드'}
                  icon={<Icon icon={isDarkActive ? Sun : Moon} size="sm" />}
                  variant="secondary"
                  size="sm"
                  onClick={handleQuickColorModeToggle}
                />
                <ToggleButton
                  label={settings.bgm ? '배경음악 끄기' : '배경음악 켜기'}
                  isIconOnly
                  size="sm"
                  isPressed={settings.bgm}
                  icon={<Icon icon={Music} size="sm" />}
                  onPressedChange={pressed => onToggleBgm(pressed)}
                />
                <ToggleButton
                  label={settings.sound ? '효과음 끄기' : '효과음 켜기'}
                  isIconOnly
                  size="sm"
                  isPressed={settings.sound}
                  icon={<Icon icon={VolumeX} size="sm" />}
                  pressedIcon={<Icon icon={Volume2} size="sm" />}
                  onPressedChange={pressed => onToggleSound(pressed)}
                />
                <IconButton
                  label="대시보드"
                  icon={<Icon icon={BarChart3} size="sm" />}
                  variant="secondary"
                  size="sm"
                  onClick={onOpenDashboard}
                />
              </HStack>
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
              <HStack gap={2} align="center" justify="center" wrap="wrap">
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
                  label="새 게임"
                  variant="primary"
                  size="md"
                  icon={<Icon icon={RotateCcw} size="sm" />}
                  onClick={() => startNewGame(settings.difficulty)}
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
              subtitle={`${clearInfo?.difficultyName ?? ''} 난이도 클리어 🎉`}
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
                />
                <Text type="supporting" justify="center">
                  {clearInfo?.message ?? ''}
                </Text>
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} justify="end" width="100%">
                <Button
                  label="기록 보기"
                  variant="secondary"
                  onClick={() => {
                    setClearInfo(null);
                    onOpenDashboard();
                  }}
                />
                <Button
                  label="한 판 더"
                  variant="primary"
                  onClick={() => startNewGame(settings.difficulty)}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </VStack>
  );
}
