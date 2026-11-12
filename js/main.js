/**
 * main.js — 게임 상태 관리 및 이벤트 바인딩
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

  const renderer = new window.ShisenRenderer({
    board: $('board'), path: $('path-layer'), fx: $('fx-layer'),
    frame: $('board-frame'), stage: $('stage'),
  });

  const saved = JSON.parse(localStorage.getItem('shisen-settings') || '{}');
  const state = {
    board: null,
    difficulty: saved.difficulty || 'easy',
    theme: saved.theme || 'fruit',
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
  Sound.enabled = saved.sound !== false;
  Sound.bgmEnabled = saved.bgm !== false;

  // ---------- 초기 UI ----------
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

  function saveSettings() {
    localStorage.setItem('shisen-settings', JSON.stringify({
      difficulty: state.difficulty,
      theme: state.theme,
      sound: Sound.enabled,
      bgm: Sound.bgmEnabled,
    }));
  }

  // ---------- 타이머 ----------
  function fmt(ms) {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  function startTimer() {
    stopTimer();
    state.startTime = Date.now() - state.elapsed;
    state.timerId = setInterval(() => {
      state.elapsed = Date.now() - state.startTime;
      $('stat-time').textContent = fmt(state.elapsed);
    }, 250);
  }
  function stopTimer() { clearInterval(state.timerId); state.timerId = null; }

  function bestKey() { return `shisen-best-${state.difficulty}`; }
  function showBest() {
    const best = Number(localStorage.getItem(bestKey()));
    $('stat-best').textContent = best ? fmt(best) : '--:--';
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

  // ---------- 게임 흐름 ----------
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
    const prev = Number(localStorage.getItem(bestKey()));
    const isBest = !prev || state.elapsed < prev;
    if (isBest) localStorage.setItem(bestKey(), String(state.elapsed));
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

  // ---------- 이벤트 (즉각 반응 + 스마트 근접 터치) ----------
  function handleBoardPointer(e) {
    if (state.finished) return;
    // 터치 대상 판정: 직접 타일을 눌렀거나, 근처 빈 공간을 누른 경우 가장 가까운 타일 찾기
    let tile = e.target.closest('.tile');
    if (!tile) {
      const rect = $('board').getBoundingClientRect();
      const cellW = rect.width / state.board.grid[0].length;
      const cellH = rect.height / state.board.grid.length;
      const touchX = e.clientX - rect.left;
      const touchY = e.clientY - rect.top;
      const c = Math.floor(touchX / cellW);
      const r = Math.floor(touchY / cellH);
      // 터치한 칸에 타일이 있으면 바로 선택
      if (r >= 0 && r < state.board.grid.length && c >= 0 && c < state.board.grid[0].length) {
        if (state.board.get(r, c) !== 0) {
          tile = renderer.tileEl({ r, c });
        } else {
          // 주변 1칸 범위 내 가장 가까운 타일 검색 (터치 보정)
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

  // pointerdown 지원 시 0ms 반응, 미지원 브라우저는 click 폴백
  if (window.PointerEvent) {
    let lastPointerTime = 0;
    $('board').addEventListener('pointerdown', e => {
      // 마우스 우클릭 등 제외
      if (e.button && e.button !== 0) return;
      lastPointerTime = Date.now();
      handleBoardPointer(e);
    });
    // pointerdown 후 중복 click 발생 방지
    $('board').addEventListener('click', e => {
      if (Date.now() - lastPointerTime < 500) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  } else {
    $('board').addEventListener('click', handleBoardPointer);
  }

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

  // 사용자의 첫 인터랙션 시 오디오 컨텍스트 및 BGM 자동 잠금 해제 (모바일 사파리/크롬 대응)
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

  // 탭이 숨겨지면 타이머 및 BGM 일시정지
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTimer();
      Sound.stopBgm();
    } else {
      if (!state.finished) startTimer();
      if (Sound.bgmEnabled) Sound.startBgm();
    }
  });

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => renderer.fit());
  });

  newGame();
})();
