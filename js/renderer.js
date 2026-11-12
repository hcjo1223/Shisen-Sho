/**
 * renderer.js — 타일 DOM, SVG 연결선, 파티클 연출
 */
(function (root) {
  const { THEMES, TINTS } = root.ShisenThemes;
  const SPARKLES = ['✨', '💖', '⭐', '🌟', '💫', '🎀'];

  class Renderer {
    constructor(els) {
      this.boardEl = els.board;
      this.pathEl = els.path;
      this.fxEl = els.fx;
      this.frameEl = els.frame;
      this.stageEl = els.stage;
      this.cells = [];
      this.themeKey = 'fruit';
      this.gridRows = 0;
      this.gridCols = 0;
      this.pathTimer = null;
    }

    emoji(v) { return THEMES[this.themeKey].tiles[(v - 1) % THEMES[this.themeKey].tiles.length]; }
    tint(v) { return TINTS[(v - 1) % TINTS.length]; }

    /** 보드 전체를 새로 그린다 (패딩 칸 포함) */
    build(board, themeKey) {
      this.themeKey = themeKey;
      this.gridRows = board.grid.length;
      this.gridCols = board.grid[0].length;
      this.boardEl.style.setProperty('--rows', this.gridRows);
      this.boardEl.style.setProperty('--cols', this.gridCols);
      this.frameEl.style.setProperty('--rows', this.gridRows);
      this.frameEl.style.setProperty('--cols', this.gridCols);
      this.pathEl.setAttribute('viewBox', `0 0 ${this.gridCols} ${this.gridRows}`);
      this.clearPath();
      this.fxEl.innerHTML = '';
      this.boardEl.innerHTML = '';
      this.cells = [];
      const frag = document.createDocumentFragment();
      for (let r = 0; r < this.gridRows; r++) {
        const row = [];
        for (let c = 0; c < this.gridCols; c++) {
          const cell = document.createElement('div');
          cell.className = 'cell';
          row.push(cell);
          frag.appendChild(cell);
        }
        this.cells.push(row);
      }
      this.boardEl.appendChild(frag);
      for (let r = 0; r < this.gridRows; r++) {
        for (let c = 0; c < this.gridCols; c++) {
          const v = board.get(r, c);
          if (v) this.placeTile(r, c, v, (r + c) * 18);
        }
      }
      this.fit();
    }

    placeTile(r, c, v, delay) {
      const cell = this.cells[r][c];
      cell.innerHTML = '';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile';
      btn.id = `tile-${r}-${c}`;
      btn.dataset.r = r;
      btn.dataset.c = c;
      btn.textContent = this.emoji(v);
      btn.setAttribute('aria-label', `${this.emoji(v)} 타일`);
      btn.style.setProperty('--tint', this.tint(v));
      btn.style.setProperty('--delay', `${delay || 0}ms`);
      cell.appendChild(btn);
      return btn;
    }

    tileEl(p) { return this.cells[p.r] && this.cells[p.r][p.c] && this.cells[p.r][p.c].firstChild; }

    /** 화면 크기에 맞게 칸 크기 계산 (스크롤 없음) */
    fit() {
      if (!this.gridRows) return;
      const rect = this.stageEl.getBoundingClientRect();
      // 패딩 보드(바깥 1줄)를 감안해 모바일에서 무대 전체를 가득 채우도록 계산
      const availableW = Math.max(rect.width - 4, 120);
      const availableH = Math.max(rect.height - 4, 120);
      const cell = Math.floor(Math.min(
        availableW / this.gridCols,
        availableH / this.gridRows,
        96
      ));
      document.documentElement.style.setProperty('--cell', `${Math.max(cell, 24)}px`);
    }

    setSelected(p, on) {
      const el = this.tileEl(p);
      if (el) el.classList.toggle('selected', on);
    }

    shake(p) {
      const el = this.tileEl(p);
      if (!el) return;
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
    }

    hint(pair) {
      this.clearHints();
      [pair.a, pair.b].forEach(p => {
        const el = this.tileEl(p);
        if (!el) return;
        el.classList.add('hint');
        el.addEventListener('animationend', () => el.classList.remove('hint'), { once: true });
      });
    }

    clearHints() {
      this.boardEl.querySelectorAll('.tile.hint').forEach(el => el.classList.remove('hint'));
    }

    drawPath(points) {
      clearTimeout(this.pathTimer);
      const d = points.map((p, i) => `${i ? 'L' : 'M'}${p.c + 0.5} ${p.r + 0.5}`).join(' ');
      this.pathEl.classList.remove('fade');
      this.pathEl.innerHTML =
        `<path class="path-line glow" d="${d}"/><path class="path-line core" d="${d}"/>`;
      this.pathTimer = setTimeout(() => {
        this.pathEl.classList.add('fade');
        this.pathTimer = setTimeout(() => this.clearPath(), 260);
      }, 280);
    }

    clearPath() {
      clearTimeout(this.pathTimer);
      this.pathEl.classList.remove('fade');
      this.pathEl.innerHTML = '';
    }

    removeTiles(a, b, intensity) {
      [a, b].forEach(p => {
        const el = this.tileEl(p);
        if (!el) return;
        el.classList.remove('selected', 'hint');
        el.classList.add('removing');
        el.addEventListener('animationend', () => el.remove(), { once: true });
        this.burst(p, intensity);
      });
    }

    burst(p, intensity) {
      const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell'));
      const count = 5 + Math.min(intensity || 1, 6) * 2;
      for (let i = 0; i < count; i++) {
        const s = document.createElement('span');
        s.className = 'particle';
        s.textContent = SPARKLES[Math.floor(Math.random() * SPARKLES.length)];
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const dist = cell * (0.6 + Math.random() * 0.7);
        s.style.left = `${(p.c + 0.5) * cell}px`;
        s.style.top = `${(p.r + 0.5) * cell}px`;
        s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
        s.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
        s.style.setProperty('--rot', `${Math.random() * 180 - 90}deg`);
        this.fxEl.appendChild(s);
        s.addEventListener('animationend', () => s.remove(), { once: true });
      }
    }

    /** 셔플 후 내용물 교체 (뒤집히는 연출) */
    refreshAll(board) {
      for (let r = 0; r < this.gridRows; r++) {
        for (let c = 0; c < this.gridCols; c++) {
          const v = board.get(r, c);
          const el = this.tileEl({ r, c });
          if (!v) { if (el) el.remove(); continue; }
          const btn = el || this.placeTile(r, c, v, 0);
          btn.className = 'tile flip';
          btn.style.setProperty('--delay', `${(r + c) * 12}ms`);
          setTimeout(() => {
            btn.textContent = this.emoji(v);
            btn.setAttribute('aria-label', `${this.emoji(v)} 타일`);
            btn.style.setProperty('--tint', this.tint(v));
          }, 250 + (r + c) * 12);
          btn.addEventListener('animationend', () => btn.classList.remove('flip'), { once: true });
        }
      }
    }

    /** 테마만 바꿔서 다시 칠하기 */
    retheme(board, themeKey) {
      this.themeKey = themeKey;
      for (let r = 0; r < this.gridRows; r++) {
        for (let c = 0; c < this.gridCols; c++) {
          const v = board.get(r, c);
          const el = this.tileEl({ r, c });
          if (v && el) {
            el.textContent = this.emoji(v);
            el.setAttribute('aria-label', `${this.emoji(v)} 타일`);
            el.style.setProperty('--tint', this.tint(v));
          }
        }
      }
    }
  }

  root.ShisenRenderer = Renderer;
})(window);
