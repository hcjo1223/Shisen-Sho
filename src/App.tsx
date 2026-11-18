import {useCallback, useEffect, useRef, useState} from 'react';
import {LayerProvider} from '@astryxdesign/core/Layer';
import {Theme} from '@astryxdesign/core/theme';
import {useToast} from '@astryxdesign/core/Toast';
import {themes, type ThemeSlug} from './astryx-themes';
import {applyPendingUpdate, initPwaUpdate} from './utils/pwaUpdate';
import {DashboardScreen} from './components/DashboardScreen';
import {GameScreen} from './components/GameScreen';
import {HomeScreen} from './components/HomeScreen';
import {
  Sound,
  loadSavedGame,
  loadSettings,
  loadStats,
  saveSettings,
  saveStats,
  type ColorModeKey,
  type DifficultyKey,
  type GameEntry,
  type GameSettings,
  type GameStats,
  type ScreenName,
  type TileThemeKey,
} from './utils/gameStore';

interface AppShellProps {
  settings: GameSettings;
  stats: GameStats;
  screen: ScreenName;
  gameEntry: GameEntry;
  onNavigate: (nextScreen: ScreenName, entry?: GameEntry) => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onUpdateStats: (nextStats: GameStats) => void;
}

function AppShell({
  settings,
  stats,
  screen,
  gameEntry,
  onNavigate,
  onUpdateSettings,
  onUpdateStats,
}: AppShellProps) {
  const toast = useToast();

  const showToast = useCallback(
    (message: string) => {
      toast({
        body: message,
        type: 'info',
        autoHideDuration: 2200,
        uniqueID: 'shisen-game-toast',
      });
    },
    [toast],
  );

  const handleToggleBgm = useCallback(
    (enabled: boolean) => {
      Sound.unlock();
      Sound.bgmEnabled = enabled;
      onUpdateSettings({bgm: enabled});
    },
    [onUpdateSettings],
  );

  const handleToggleSound = useCallback(
    (enabled: boolean) => {
      Sound.enabled = enabled;
      onUpdateSettings({sound: enabled});
      if (enabled) Sound.select();
    },
    [onUpdateSettings],
  );

  const handleSelectDifficulty = useCallback(
    (difficulty: DifficultyKey) => {
      Sound.unlock();
      onUpdateSettings({difficulty});
      if (Sound.enabled) Sound.select();
    },
    [onUpdateSettings],
  );

  const handleSelectTileTheme = useCallback(
    (theme: TileThemeKey) => {
      Sound.unlock();
      onUpdateSettings({theme});
      if (Sound.enabled) Sound.select();
    },
    [onUpdateSettings],
  );

  const handleChangeUiTheme = useCallback(
    (uiTheme: ThemeSlug) => {
      Sound.unlock();
      onUpdateSettings({uiTheme});
      if (Sound.enabled) Sound.select();
    },
    [onUpdateSettings],
  );

  const handleChangeColorMode = useCallback(
    (colorMode: ColorModeKey) => {
      onUpdateSettings({colorMode});
    },
    [onUpdateSettings],
  );

  const handleStartGame = useCallback(() => {
    Sound.unlock();
    onNavigate('game', 'new');
  }, [onNavigate]);

  const handleResumeGame = useCallback(() => {
    Sound.unlock();
    onNavigate('game', 'resume');
  }, [onNavigate]);

  const handleStartDaily = useCallback(() => {
    Sound.unlock();
    onNavigate('game', 'daily');
  }, [onNavigate]);

  /** 대시보드의 플레이 버튼: 저장된 판이 있으면 이어하기 */
  const handlePlayFromDashboard = useCallback(() => {
    Sound.unlock();
    onNavigate('game', loadSavedGame() != null ? 'resume' : 'new');
  }, [onNavigate]);

  const handleOpenDashboard = useCallback(() => {
    Sound.unlock();
    onNavigate('dashboard');
  }, [onNavigate]);

  const handleBackHome = useCallback(() => {
    onNavigate('home');
  }, [onNavigate]);

  if (screen === 'home') {
    return (
      <HomeScreen
        settings={settings}
        savedGame={loadSavedGame()}
        onResumeGame={handleResumeGame}
        onStartDaily={handleStartDaily}
        onSelectDifficulty={handleSelectDifficulty}
        onToggleGravity={gravity => onUpdateSettings({gravity})}
        onSelectTileTheme={handleSelectTileTheme}
        onChangeUiTheme={handleChangeUiTheme}
        onChangeColorMode={handleChangeColorMode}
        onToggleBgm={handleToggleBgm}
        onToggleSound={handleToggleSound}
        onStartGame={handleStartGame}
        onOpenDashboard={handleOpenDashboard}
      />
    );
  }

  if (screen === 'dashboard') {
    return (
      <DashboardScreen
        stats={stats}
        onBackHome={handleBackHome}
        onStartGame={handlePlayFromDashboard}
      />
    );
  }

  return (
    <GameScreen
      settings={settings}
      entry={gameEntry}
      stats={stats}
      onUpdateStats={onUpdateStats}
      onChangeDifficulty={difficulty => onUpdateSettings({difficulty})}
      onChangeGravity={gravity => onUpdateSettings({gravity})}
      onChangeTileTheme={theme => onUpdateSettings({theme})}
      onChangeUiTheme={handleChangeUiTheme}
      onChangeColorMode={handleChangeColorMode}
      onToggleBgm={handleToggleBgm}
      onToggleSound={handleToggleSound}
      onBackHome={handleBackHome}
      onOpenDashboard={handleOpenDashboard}
      showToast={showToast}
    />
  );
}

export default function App() {
  const [screen, setScreen] = useState<ScreenName>('home');
  const [gameEntry, setGameEntry] = useState<GameEntry>('new');

  const screenRef = useRef<ScreenName>(screen);
  screenRef.current = screen;

  const handleNavigate = useCallback(
    (nextScreen: ScreenName, entry: GameEntry = 'new') => {
      if (nextScreen === 'game') setGameEntry(entry);
      setScreen(nextScreen);
      // 게임 화면을 벗어날 때(판은 이미 저장됨) 받아 둔 새 버전을 적용
      if (nextScreen !== 'game') applyPendingUpdate();
    },
    [],
  );

  useEffect(() => {
    initPwaUpdate(() => screenRef.current !== 'game');
  }, []);
  const [settings, setSettings] = useState<GameSettings>(() => {
    const initial = loadSettings();
    Sound.enabled = initial.sound;
    Sound.bgmEnabled = initial.bgm;
    return initial;
  });
  const [stats, setStats] = useState<GameStats>(() => loadStats());

  const handleUpdateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings(prev => {
      const next = {...prev, ...patch};
      saveSettings(next);
      return next;
    });
  }, []);

  const handleUpdateStats = useCallback((nextStats: GameStats) => {
    saveStats(nextStats);
    setStats(nextStats);
  }, []);

  useEffect(() => {
    const unlockEvents = [
      'pointerdown',
      'touchstart',
      'touchend',
      'click',
      'keydown',
    ] as const;

    const unlockAudioOnce = () => {
      Sound.unlock();
      for (const evt of unlockEvents) {
        document.removeEventListener(evt, unlockAudioOnce);
      }
    };

    for (const evt of unlockEvents) {
      document.addEventListener(evt, unlockAudioOnce, {passive: true});
    }

    const onVisibility = () => {
      if (document.hidden) {
        Sound.stopBgm();
      } else if (Sound.bgmEnabled) {
        Sound.startBgm();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      for (const evt of unlockEvents) {
        document.removeEventListener(evt, unlockAudioOnce);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <Theme theme={themes[settings.uiTheme]} mode={settings.colorMode}>
      <LayerProvider toast={{position: 'bottomEnd', maxVisible: 2}}>
        <AppShell
          settings={settings}
          stats={stats}
          screen={screen}
          gameEntry={gameEntry}
          onNavigate={handleNavigate}
          onUpdateSettings={handleUpdateSettings}
          onUpdateStats={handleUpdateStats}
        />
      </LayerProvider>
    </Theme>
  );
}
