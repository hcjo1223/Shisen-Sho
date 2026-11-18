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
  clearSavedGame,
  createBoard,
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
  type GameSettings,
  type GameStats,
  type SavedGame,
  type TileThemeKey,
} from '../utils/gameStore';

export interface GameScreenProps {
  settings: GameSettings;
  /** true면 저장된 판을 이어서 시작한다 (없으면 새 판). */
  resume: boolean;
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
  resume,
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
  /** 현재 판의 난이도 (설정 변경과 별개로 저장에 사용) */
  const activeDiffRef = useRef<DifficultyKey>(settings.difficulty);
  /** 한 번이라도 조작했는지 — 손대지 않은 판은 저장하지 않는다 */
  const dirtyRef = useRef(false);

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  /** 진행 중인 판을 버리고 새로 시작할지 확인 대기 중인 난이도 */
  const [pendingNewGame, setPendingNewGame] = useState<DifficultyKey | null>(
    null,
  );

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

  const persistGame = useCallback(() => {
    const board = boardRef.current;
    if (!board || finishedRef.current || !dirtyRef.current) return;
    if (board.isCleared()) return;
    if (timerIdRef.current !== null) {
      elapsedRef.current = Date.now() - startTimeRef.current;
    }
    saveGame({
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
    (board: BoardInstance, diff: DifficultyKey, saved?: SavedGame) => {
      gameIdRef.current += 1;
      clearPendingTimers();
      stopTimer();

      boardRef.current = board;
      activeDiffRef.current = diff;
      selectedRef.current = null;
      hintsLeftRef.current = saved ? saved.hintsLeft : MAX_HINTS;
      shufflesLeftRef.current = saved ? saved.shufflesLeft : MAX_SHUFFLES;
      elapsedRef.current = saved ? saved.elapsedMs : 0;
      comboRef.current = 0;
      lastMatchRef.current = 0;
      finishedRef.current = false;
      dirtyRef.current = Boolean(saved);

      setElapsedMs(elapsedRef.current);
      setHintsLeft(hintsLeftRef.current);
      setShufflesLeft(shufflesLeftRef.current);
      setFinished(false);
      setClearInfo(null);
      setBestMsState(getBestMs(diff));
      setRemaining(board.remaining());

      controllerRef.current?.build(board, settingsRef.current.theme);
      startTimer();
    },
    [clearPendingTimers, startTimer, stopTimer],
  );

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

      clearSavedGame();
      resetRoundState(createBoard(rows, cols), activeDiff);
    },
    [resetRoundState],
  );

  /** 저장된 판을 복원한다. 복원할 판이 없으면 false. */
  const restoreGame = useCallback((): boolean => {
    const saved = loadSavedGame();
    if (!saved) return false;
    const board = createBoardFromGrid(saved.rows, saved.cols, saved.grid);
    if (saved.difficulty !== settingsRef.current.difficulty) {
      onChangeDifficulty(saved.difficulty);
    }
    resetRoundState(board, saved.difficulty, saved);
    if (!board.hasMoves()) {
      board.shuffle();
      controllerRef.current?.refreshAll(board);
      persistGame();
    }
    return true;
  }, [onChangeDifficulty, persistGame, resetRoundState]);

  /** 진행 중인 판이 있으면 확인을 받은 뒤 새 판을 시작한다. */
  const requestNewGame = useCallback(
    (diff: DifficultyKey) => {
      if (dirtyRef.current && !finishedRef.current) {
        setPendingNewGame(diff);
        return;
      }
      if (diff !== settingsRef.current.difficulty) onChangeDifficulty(diff);
      startNewGame(diff);
    },
    [onChangeDifficulty, startNewGame],
  );

  const confirmNewGame = useCallback(() => {
    const diff = pendingNewGame;
    setPendingNewGame(null);
    if (!diff) return;
    if (diff !== settingsRef.current.difficulty) onChangeDifficulty(diff);
    startNewGame(diff);
  }, [onChangeDifficulty, pendingNewGame, startNewGame]);

  const finishGame = useCallback(
    (activeDiff: DifficultyKey) => {
      finishedRef.current = true;
      setFinished(true);
      stopTimer();
      clearSavedGame();

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
    if (hintsLeftRef.current <= 0) {
      showToast('힌트를 모두 사용했어요! (최대 5회) 💡');
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
      requestNewGame(nextDiff as DifficultyKey);
    },
    [requestNewGame],
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
  const resumeRef = useRef(resume);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const controller = new BoardController({
      stage,
      onTileSelect: pos => onTileSelectRef.current(pos),
    });
    controllerRef.current = controller;
    if (!resumeRef.current || !restoreGameRef.current()) {
      startNewGameRef.current(settingsRef.current.difficulty);
    }
    // StrictMode 재마운트나 다음 진입 때는 방금 저장한 판을 이어간다
    resumeRef.current = true;

    return () => {
      persistGameRef.current();
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
        persistGame();
        stopTimer();
      } else if (!finishedRef.current) {
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
    <VStack height="100dvh">
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={1}>
            <HStack justify="between" align="center" gap={1}>
              <IconButton
                label="홈으로 (진행 상황은 자동 저장돼요)"
                icon={<Icon icon={Home} size="sm" />}
                variant="secondary"
                size="sm"
                onClick={handleBackHome}
              />

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

              <IconButton
                label="게임 설정"
                icon={<Icon icon={Settings} size="sm" />}
                variant="secondary"
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
              />
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
                  onClick={() => requestNewGame(settings.difficulty)}
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
                    handleOpenDashboard();
                  }}
                />
                <Button
                  label="한 판 더"
                  variant="primary"
                  onClick={() => requestNewGame(settings.difficulty)}
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
            label="타일 테마"
            presentation="adaptive"
            width="100%"
            options={TILE_THEME_SELECTOR_OPTIONS}
            value={settings.theme}
            onChange={handleTileThemeChange}
          />
          <Selector
            label="UI 테마"
            presentation="adaptive"
            width="100%"
            startIcon={<Icon icon={Palette} size="sm" />}
            options={UI_THEME_SELECTOR_OPTIONS}
            value={settings.uiTheme}
            onChange={val => onChangeUiTheme(val as ThemeSlug)}
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
            label="배경음악 (도트 BGM)"
            labelPosition="start"
            labelSpacing="spread"
            value={settings.bgm}
            onChange={checked => onToggleBgm(checked)}
          />
          <Switch
            label="효과음 (SFX)"
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
