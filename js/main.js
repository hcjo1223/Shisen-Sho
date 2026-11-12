/**
 * main.js — 화면 전환(홈/대시보드/인게임), 게임 상태 및 통계 관리
 */
(function () {
  const { Board, DIFFICULTIES } = window.ShisenBoard;
  const { THEMES } = window.ShisenThemes;
  const Sound = window.ShisenSound;
  const $ = id => document.getElementById(id);

  const COMBO_WINDOW = 3000;
  const MAX_HINTS = 5;
  const MAX_SHUFFLES = 1;
  const CLEAR_MESSAGES = [
    '오늘도 최고예요 💕', '역시 사천성 달인! 👑', '눈썰미가 반짝반짝 ✨',
    '쉬었다 가도 좋아요 ☕', '완벽한 한 판이었어요 🌷',
  ];

  const BADGES = [
    { id: 'first_clear', icon: '🌱', name: '첫 걸음', desc: '사천성 첫 클리어 달성' },
    { id: 'combo_5', icon: '🔥', name: '콤보 마스터', desc: '5 콤보 달성' },
    { id: 'hard_clear', icon: '👑', name: '달인의 길', desc: '어려움 난이도 클리어' },
    { id: 'speedy', icon: '⚡', name: '번개눈', desc: '1분 이내 클리어' },
    { id: 'clears_10', icon: '🏆', name: '열정 플레이어', desc: '누적 10회 클리어' },
    { id: 'pairs_200', icon: '🍒', name: '타일 수집가', desc: '누적 200쌍 매칭' },
  ];

  const renderer = new window.ShisenRenderer({
    board: $('board'), path: $('path-layer'), fx: $('fx-layer'),
    frame: $('board-frame'), stage: $('stage'),
  });

  // 로컬스토리지 불러오기
  const savedSettings = JSON.parse(localStorage.getItem('shisen-settings') || '{}');
  const stats = JSON.parse(localStorage.getItem('shisen-stats') || '{}');
  stats.totalClears = stats.totalClears || 0;
  stats.maxCombo = stats.maxCombo || 0;
  stats.matchedPairs = stats.matchedPairs || 0;
  stats.totalPlayMs = stats.totalPlayMs || 0;
  stats.unlockedBadges = stats.unlockedBadges || [];

  const state = {
    screen: 'home', // 'home' | 'dashboard' | 'game'
    board: null,
    difficulty: savedSettings.difficulty || 'easy',
    theme: savedSettings.theme || 'fruit',
    selected: null,
    hintsLeft: MAX_HINTS,
    shufflesLeft: MAX_SHUFFLES,
    startTime: 0,
    elapsed: 0,
    timerId: null,
    combo: 0,
    lastMatch: 0,
    finished: false,
  };
  Sound.enabled = savedSettings.sound !== false;
  Sound.bgmEnabled = savedSettings.bgm !== false;

  function saveSettings() {
    localStorage.setItem('shisen-settings', JSON.stringify({
      difficulty: state.difficulty,
      theme: state.theme,
      sound: Sound.enabled,
      bgm: Sound.bgmEnabled,
    }));
  }

  function saveStats() {
    localStorage.setItem('shisen-stats', JSON.stringify(stats));
  }

  // ---------- 시간 포맷 ----------
  function fmt(ms) {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function bestKey(diff) { return `shisen-best-${diff || state.difficulty}`; }
  function getBest(diff) {
    const v = Number(localStorage.getItem(bestKey(diff)));
    return v ? fmt(v) : '--:--';
  }

  // ==========================================================
  // 화면 전환 관리
  // ==========================================================
  function switchScreen(screenName) {
    state.screen = screenName;
    $('screen-home').hidden = screenName !== 'home';
    $('screen-dashboard').hidden = screenName !== 'dashboard';
    $('screen-game').hidden = screenName !== 'game';

    if (screenName === 'home') {
      renderHomeScreen();
      stopTimer();
    } else if (screenName === 'dashboard') {
      renderDashboard();
      stopTimer();
    } else if (screenName === 'game') {
      renderer.fit();
    }
  }

  // ==========================================================
  // 1. 홈 화면 렌더링 & 이벤트
  // ==========================================================
  function renderHomeScreen() {
    // 난이도 카드 활성화 및 최고 기록 표시
    document.querySelectorAll('.diff-card').forEach(btn => {
      const d = btn.dataset.diff;
      const isActive = d === state.difficulty;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', String(isActive));
      const badge = $(`home-best-${d}`);
      if (badge) badge.textContent = `최고 ${getBest(d)}`;
    });

    // 오디오 토글 상태 표시
    $('home-btn-bgm').textContent = Sound.bgmEnabled ? '🎵 BGM 켜짐' : '🔇 BGM 꺼짐';
    $('home-btn-sound').textContent = Sound.enabled ? '🔊 효과음 켜짐' : '🔇 효과음 꺼짐';

    // 테마 칩 렌더링
    const chipsContainer = $('home-theme-chips');
    chipsContainer.innerHTML = '';
    Object.entries(THEMES).forEach(([key, t]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `theme-chip ${key === state.theme ? 'active' : ''}`;
      chip.setAttribute('role', 'radio');
      chip.setAttribute('aria-checked', String(key === state.theme));
      chip.innerHTML = `<span class="theme-chip-icon">${t.icon}</span><span>${t.name}</span>`;
      chip.addEventListener('click', () => {
        Sound.unlock();
        state.theme = key;
        saveSettings();
        $('select-theme').value = key;
        renderHomeScreen();
        if (Sound.enabled) Sound.select();
      });
      chipsContainer.appendChild(chip);
    });
  }

  // 홈 난이도 카드 클릭
  document.querySelectorAll('.diff-card').forEach(card => {
    card.addEventListener('click', () => {
      Sound.unlock();
      state.difficulty = card.dataset.diff;
      saveSettings();
      $('select-difficulty').value = state.difficulty;
      renderHomeScreen();
      if (Sound.enabled) Sound.select();
    });
  });

  // 홈 게임 시작 버튼
  $('btn-start-game').addEventListener('click', () => {
    Sound.unlock();
    switchScreen('game');
    newGame();
  });

  // 홈 대시보드 열기 버튼
  $('btn-open-dashboard').addEventListener('click', () => {
    Sound.unlock();
    switchScreen('dashboard');
  });

  // 홈 오디오 토글 버튼들
  $('home-btn-bgm').addEventListener('click', () => {
    Sound.unlock();
    Sound.bgmEnabled = !Sound.bgmEnabled;
    updateBgmBtn();
    $('home-btn-bgm').textContent = Sound.bgmEnabled ? '🎵 BGM 켜짐' : '🔇 BGM 꺼짐';
    saveSettings();
  });
  $('home-btn-sound').addEventListener('click', () => {
    Sound.enabled = !Sound.enabled;
    updateSoundBtn();
    $('home-btn-sound').textContent = Sound.enabled ? '🔊 효과음 켜짐' : '🔇 효과음 꺼짐';
    saveSettings();
    if (Sound.enabled) Sound.select();
  });

  // ==========================================================
  // 2. 대시보드 화면 렌더링
  // ==========================================================
  function checkBadges(lastClearTime) {
    const newlyUnlocked = [];
    function tryUnlock(id) {
      if (!stats.unlockedBadges.includes(id)) {
        stats.unlockedBadges.push(id);
        newlyUnlocked.push(id);
      }
    }

    if (stats.totalClears >= 1) tryUnlock('first_clear');
    if (stats.maxCombo >= 5) tryUnlock('combo_5');
    if (state.difficulty === 'hard') tryUnlock('hard_clear');
    if (lastClearTime && lastClearTime <= 60000) tryUnlock('speedy');
    if (stats.totalClears >= 10) tryUnlock('clears_10');
    if (stats.matchedPairs >= 200) tryUnlock('pairs_200');

    if (newlyUnlocked.length > 0) {
      saveStats();
      const bInfo = BADGES.find(b => b.id === newlyUnlocked[0]);
      if (bInfo) toast(`🎉 새 업적 획득: [${bInfo.name}]!`);
    }
  }

  function renderDashboard() {
    $('dash-total-clears').textContent = stats.totalClears;
    $('dash-max-combo').textContent = stats.maxCombo;
    $('dash-matchedPairs' ? 'dash-matched-pairs' : 'dash-matched-pairs').textContent = stats.matchedPairs;
    const mins = Math.floor(stats.totalPlayMs / 60000);
    $('dash-total-time').textContent = `${mins}분`;

    $('dash-best-easy').textContent = getBest('easy');
    $('dash-best-normal').textContent = getBest('normal');
    $('dash-best-hard').textContent = getBest('hard');

    // 뱃지 렌더링
    const badgeContainer = $('dash-badges');
    badgeContainer.innerHTML = '';
    BADGES.forEach(b => {
      const isUnlocked = stats.unlockedBadges.includes(b.id);
      const item = document.createElement('div');
      item.className = `badge-item ${isUnlocked ? 'unlocked' : 'locked'}`;
      item.innerHTML = `
        <span class="badge-icon">${b.icon}</span>
        <span class="badge-name">${b.name}</span>
        <span class="badge-status">${isUnlocked ? '달성 완료 ✨' : '미달성'}</span>
      `;
      item.title = b.desc;
      badgeContainer.appendChild(item);
    });
  }

  $('btn-dash-back').addEventListener('click', () => {
    switchScreen('home');
  });
  $('btn-dash-play').addEventListener('click', () => {
    switchScreen('game');
    newGame();
  });

  // ==========================================================
  // 3. 인게임 세팅 & 타이머
  // ==========================================================
  const themeSelect = $('select-theme');
  Object.entries(THEMES).forEach(([key, t]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${t.icon} ${t.name}`;
    themeSelect.appendChild(opt);
  });
  themeSelect.value = state.theme;
  $('select-difficulty').value = state.difficulty;
  updateSoundBtn();
  updateBgmBtn();

  function startTimer() {
    stopTimer();
    state.startTime = Date.now() - state.elapsed;
    state.timerId = setInterval(() => {
      state.elapsed = Date.now() - state.startTime;
      $('stat-time').textContent = fmt(state.elapsed);
    }, 250);
  }
  function stopTimer() { clearInterval(state.timerId); state.timerId = null; }

  function showBest() {
    $('stat-best').textContent = getBest(state.difficulty);
  }

  function updateStats() {
    $('stat-remaining').textContent = state.board.remaining();
    // 힌트 횟수 뱃지 및 버튼 상태
    $('badge-hint').textContent = state.hintsLeft;
    $('btn-hint').disabled = state.hintsLeft <= 0 || state.finished;
    // 섞기 횟수 뱃지 및 버튼 상태
    $('badge-shuffle').textContent = state.shufflesLeft;
    $('btn-shuffle').disabled = state.shufflesLeft <= 0 || state.finished;
  }

  // ---------- 토스트 / 콤보 ----------
  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function showCombo(n) {
    const el = $('combo');
    el.textContent = n >= 5 ? `${n} Combo! 🔥` : `${n} Combo! ✨`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  // ==========================================================
  // 게임 루프 및 판정
  // ==========================================================
  function newGame() {
    const diff = DIFFICULTIES[state.difficulty];
    const rect = $('stage').getBoundingClientRect();
    const portrait = rect.height > rect.width * 1.1;
    // 세로 화면에서는 행/열을 바꿔 타일을 크게 보여준다
    const rows = portrait ? diff.cols : diff.rows;
    const cols = portrait ? diff.rows : diff.cols;

    state.board = new Board(rows, cols);
    state.selected = null;
    state.hintsLeft = MAX_HINTS;
    state.shufflesLeft = MAX_SHUFFLES;
    state.elapsed = 0;
    state.combo = 0;
    state.finished = false;
    $('stat-time').textContent = '00:00';
    $('clear-modal').hidden = true;
    renderer.build(state.board, state.theme);
    showBest();
    updateStats();
    startTimer();
  }

  function select(p) {
    state.selected = p;
    renderer.setSelected(p, true);
  }
  function deselect() {
    if (state.selected) renderer.setSelected(state.selected, false);
    state.selected = null;
  }

  function onTileClick(p) {
    if (state.finished) return;
    Sound.unlock();
    renderer.clearHints();
    const cur = state.selected;

    if (!cur) { select(p); Sound.select(); return; }
    if (cur.r === p.r && cur.c === p.c) { deselect(); return; }

    const board = state.board;
    if (board.get(cur.r, cur.c) !== board.get(p.r, p.c)) {
      // 다른 그림이면 새 타일로 선택 전환
      deselect();
      select(p);
      Sound.select();
      return;
    }

    const path = board.tryMatch(cur, p);
    if (!path) {
      // 같은 그림인데 연결 불가: 흔들고 선택 전환
      renderer.shake(p);
      renderer.shake(cur);
      Sound.fail();
      deselect();
      select(p);
      return;
    }

    // 매칭 성공
    const now = Date.now();
    state.combo = now - state.lastMatch <= COMBO_WINDOW ? state.combo + 1 : 1;
    state.lastMatch = now;
    state.selected = null;
    renderer.drawPath(path.points);
    renderer.removeTiles(cur, p, state.combo);
    Sound.match(state.combo);
    if (state.combo >= 2) showCombo(state.combo);

    // 대시보드 통계 누적
    stats.matchedPairs++;
    if (state.combo > stats.maxCombo) stats.maxCombo = state.combo;
    saveStats();

    updateStats();

    if (board.isCleared()) { finish(); return; }

    if (!board.hasMoves()) {
      setTimeout(() => {
        deselect();
        board.shuffle();
        renderer.refreshAll(board);
        Sound.shuffle();
        toast('더 이상 맞출 짝이 없어서 타일을 섞었어요! 🔀');
        updateStats();
      }, 450);
    }
  }

  function finish() {
    state.finished = true;
    stopTimer();
    updateStats();

    // 통계 기록 누적
    stats.totalClears++;
    stats.totalPlayMs += state.elapsed;
    const prev = Number(localStorage.getItem(bestKey(state.difficulty)));
    const isBest = !prev || state.elapsed < prev;
    if (isBest) localStorage.setItem(bestKey(state.difficulty), String(state.elapsed));
    saveStats();
    checkBadges(state.elapsed);
    showBest();

    setTimeout(() => {
      Sound.clear();
      $('clear-emoji').textContent = isBest ? '🏆' : '🎉';
      $('clear-title').textContent = isBest ? '최고 기록 달성!' : '모두 맞췄어요!';
      const msg = CLEAR_MESSAGES[Math.floor(Math.random() * CLEAR_MESSAGES.length)];
      $('clear-text').innerHTML =
        `${DIFFICULTIES[state.difficulty].name} 난이도를 <strong>${fmt(state.elapsed)}</strong> 만에 클리어!<br>${msg}`;
      $('clear-modal').hidden = false;
      $('btn-again').focus();
    }, 600);
  }

  // ---------- 스마트 터치 이벤트 ----------
  function handleBoardPointer(e) {
    if (state.finished) return;
    let tile = e.target.closest('.tile');
    if (!tile) {
      const rect = $('board').getBoundingClientRect();
      const cellW = rect.width / state.board.grid[0].length;
      const cellH = rect.height / state.board.grid.length;
      const touchX = e.clientX - rect.left;
      const touchY = e.clientY - rect.top;
      const c = Math.floor(touchX / cellW);
      const r = Math.floor(touchY / cellH);
      if (r >= 0 && r < state.board.grid.length && c >= 0 && c < state.board.grid[0].length) {
        if (state.board.get(r, c) !== 0) {
          tile = renderer.tileEl({ r, c });
        } else {
          let minDist = Infinity;
          let bestEl = null;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < state.board.grid.length && nc >= 0 && nc < state.board.grid[0].length) {
                if (state.board.get(nr, nc) !== 0) {
                  const el = renderer.tileEl({ r: nr, c: nc });
                  if (el && !el.classList.contains('removing')) {
                    const b = el.getBoundingClientRect();
                    const d = Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2));
                    if (d < minDist && d <= Math.max(cellW, cellH) * 1.1) {
                      minDist = d;
                      bestEl = el;
                    }
                  }
                }
              }
            }
          }
          tile = bestEl;
        }
      }
    }

    if (!tile || tile.classList.contains('removing')) return;
    onTileClick({ r: Number(tile.dataset.r), c: Number(tile.dataset.c) });
  }

  if (window.PointerEvent) {
    let lastPointerTime = 0;
    $('board').addEventListener('pointerdown', e => {
      if (e.button && e.button !== 0) return;
      lastPointerTime = Date.now();
      handleBoardPointer(e);
    });
    $('board').addEventListener('click', e => {
      if (Date.now() - lastPointerTime < 500) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  } else {
    $('board').addEventListener('click', handleBoardPointer);
  }

  // 하단 툴바 액션
  $('btn-hint').addEventListener('click', () => {
    if (state.finished) return;
    if (state.hintsLeft <= 0) {
      toast('힌트를 모두 사용했어요! (최대 5회) 💡');
      return;
    }
    const [pair] = state.board.availablePairs(1);
    if (!pair) return;
    state.hintsLeft--;
    deselect();
    renderer.hint(pair);
    Sound.hint();
    updateStats();
  });

  $('btn-shuffle').addEventListener('click', () => {
    if (state.finished) return;
    if (state.shufflesLeft <= 0) {
      toast('섞기를 모두 사용했어요! (최대 1회) 🔀');
      return;
    }
    state.shufflesLeft--;
    deselect();
    renderer.clearHints();
    state.board.shuffle();
    renderer.refreshAll(state.board);
    Sound.shuffle();
    updateStats();
  });

  $('btn-new').addEventListener('click', newGame);
  $('btn-again').addEventListener('click', newGame);
  $('btn-clear-dash').addEventListener('click', () => {
    $('clear-modal').hidden = true;
    switchScreen('dashboard');
  });

  // 상단 바 버튼들
  $('btn-game-home').addEventListener('click', () => {
    switchScreen('home');
  });
  $('btn-game-dash').addEventListener('click', () => {
    switchScreen('dashboard');
  });

  $('select-difficulty').addEventListener('change', e => {
    state.difficulty = e.target.value;
    saveSettings();
    newGame();
  });

  themeSelect.addEventListener('change', e => {
    state.theme = e.target.value;
    saveSettings();
    renderer.retheme(state.board, state.theme);
    $('board').blur();
  });

  function updateSoundBtn() {
    $('btn-sound').textContent = Sound.enabled ? '🔊' : '🔇';
    $('btn-sound').setAttribute('aria-pressed', String(Sound.enabled));
  }
  function updateBgmBtn() {
    $('btn-bgm').textContent = Sound.bgmEnabled ? '🎵' : '🔇';
    $('btn-bgm').setAttribute('aria-pressed', String(Sound.bgmEnabled));
  }

  $('btn-sound').addEventListener('click', () => {
    Sound.enabled = !Sound.enabled;
    updateSoundBtn();
    saveSettings();
    if (Sound.enabled) Sound.select();
  });

  $('btn-bgm').addEventListener('click', () => {
    Sound.unlock();
    Sound.bgmEnabled = !Sound.bgmEnabled;
    updateBgmBtn();
    saveSettings();
  });

  // 브라우저 오디오 언락
  const unlockAudioOnce = () => {
    Sound.unlock();
    ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
      document.removeEventListener(evt, unlockAudioOnce);
    });
  };
  ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
    document.addEventListener(evt, unlockAudioOnce, { passive: true });
  });

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT') return;
    if (e.key === 'h' || e.key === 'H') $('btn-hint').click();
    else if (e.key === 's' || e.key === 'S') $('btn-shuffle').click();
    else if (e.key === 'm' || e.key === 'M') $('btn-bgm').click();
    else if (e.key === 'Escape') deselect();
  });

  // 탭 숨김 처리
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTimer();
      Sound.stopBgm();
    } else {
      if (state.screen === 'game' && !state.finished) startTimer();
      if (Sound.bgmEnabled) Sound.startBgm();
    }
  });

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      if (state.screen === 'game') renderer.fit();
    });
  });

  // 최초 로드: 홈 화면으로 진입
  switchScreen('home');
})();
