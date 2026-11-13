/**
 * board.js — 패딩 보드 생성, 셔플, 막힘(Deadlock) 감지, 되돌리기
 */
(function (root) {
  const PF = (typeof module !== 'undefined' && module.exports)
    ? require('./pathfinder.js')
    : root.ShisenPathfinder;

  const DIFFICULTIES = {
    easy:   { name: '쉬움',  rows: 6, cols: 8 },   // 48개 (비율 3:4)
    normal: { name: '보통',  rows: 8, cols: 10 },  // 80개 (비율 4:5)
    hard:   { name: '어려움', rows: 10, cols: 12 }, // 120개 (모바일 세로 10열×12행 / PC 10행×12열)
  };
  const COPIES = 4; // 이모지 한 종류당 4장

  function shuffleArray(arr, rng) {
    const rand = rng || Math.random;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  class Board {
    /**
     * @param {number} rows 내부 행 수
     * @param {number} cols 내부 열 수
     * @param {() => number} [rng]
     */
    constructor(rows, cols, rng) {
      if ((rows * cols) % COPIES !== 0) throw new Error('타일 수는 4의 배수여야 합니다');
      this.rows = rows;
      this.cols = cols;
      this.rng = rng || Math.random;
      this.kinds = (rows * cols) / COPIES;
      this.history = [];
      this.grid = [];
      this.generate();
    }

    /** 패딩 포함 (rows+2) x (cols+2) 그리드에 타일을 새로 깐다 */
    generate() {
      const tiles = [];
      for (let k = 1; k <= this.kinds; k++) {
        for (let n = 0; n < COPIES; n++) tiles.push(k);
      }
      for (let attempt = 0; attempt < 200; attempt++) {
        shuffleArray(tiles, this.rng);
        this.grid = [];
        for (let r = 0; r < this.rows + 2; r++) {
          const row = new Array(this.cols + 2).fill(0);
          if (r > 0 && r <= this.rows) {
            for (let c = 1; c <= this.cols; c++) {
              row[c] = tiles[(r - 1) * this.cols + (c - 1)];
            }
          }
          this.grid.push(row);
        }
        if (this.hasMoves()) break;
      }
      this.history = [];
    }

    get(r, c) { return this.grid[r][c]; }

    remaining() {
      let n = 0;
      for (const row of this.grid) for (const v of row) if (v !== 0) n++;
      return n;
    }

    isCleared() { return this.remaining() === 0; }

    findPath(a, b) { return PF.findPath(this.grid, a, b); }

    availablePairs(limit) { return PF.findAvailablePairs(this.grid, { limit }); }

    hasMoves() { return this.availablePairs(1).length > 0; }

    /** 연결 가능하면 두 타일을 제거하고 경로를 반환 */
    tryMatch(a, b) {
      const path = this.findPath(a, b);
      if (!path) return null;
      const value = this.grid[a.r][a.c];
      this.grid[a.r][a.c] = 0;
      this.grid[b.r][b.c] = 0;
      this.history.push({ a, b, value });
      return path;
    }

    /** 마지막 제거를 되돌린다 */
    undo() {
      const last = this.history.pop();
      if (!last) return null;
      this.grid[last.a.r][last.a.c] = last.value;
      this.grid[last.b.r][last.b.c] = last.value;
      return last;
    }

    /**
     * 남은 타일의 위치는 그대로 두고 내용물만 섞는다.
     * 맞출 짝이 생길 때까지 반복.
     */
    shuffle() {
      const cells = [];
      const values = [];
      for (let r = 0; r < this.grid.length; r++) {
        for (let c = 0; c < this.grid[r].length; c++) {
          if (this.grid[r][c] !== 0) {
            cells.push({ r, c });
            values.push(this.grid[r][c]);
          }
        }
      }
      if (values.length === 0) return;
      for (let attempt = 0; attempt < 200; attempt++) {
        shuffleArray(values, this.rng);
        cells.forEach((p, i) => { this.grid[p.r][p.c] = values[i]; });
        if (this.hasMoves()) break;
      }
      // 섞은 뒤에는 이전 위치 정보가 무의미해지므로 되돌리기 기록 초기화
      this.history = [];
    }
  }

  const api = { Board, DIFFICULTIES, shuffleArray };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShisenBoard = api;
})(typeof window !== 'undefined' ? window : globalThis);
