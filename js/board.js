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
    // 어려움: 판 크기는 보통과 같지만 36종(32종×2장 + 4종×4장)을 섞는다.
    // 대부분의 타일이 짝이 딱 하나뿐이라 찾기 어렵고 순서를 잘못 고르면 쉽게 막힌다.
    hard:   { name: '어려움', rows: 8, cols: 10, kinds: 36 }, // 80개
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
     * @param {number} [kinds] 타일 종류 수. 생략하면 종류당 4장.
     *   (타일 수/4)보다 크면 일부 종류를 2장만 넣는다: 4장 종류 = (타일 수 - 2*kinds)/2
     */
    constructor(rows, cols, rng, kinds) {
      const total = rows * cols;
      if (total % COPIES !== 0) throw new Error('타일 수는 4의 배수여야 합니다');
      const k = kinds || total / COPIES;
      if (k < total / COPIES || k > total / 2) throw new Error('타일 종류 수가 올바르지 않습니다');
      this.rows = rows;
      this.cols = cols;
      this.rng = rng || Math.random;
      this.kinds = k;
      // 앞쪽 종류부터 4장, 나머지는 2장 (어느 종류가 4장인지는 셔플로 감춰진다)
      this.quadKinds = (total - 2 * k) / 2;
      this.history = [];
      this.grid = [];
      this.generate();
    }

    /** 패딩 포함 (rows+2) x (cols+2) 그리드에 타일을 새로 깐다 */
    generate() {
      const tiles = [];
      for (let k = 1; k <= this.kinds; k++) {
        const copies = k <= this.quadKinds ? COPIES : 2;
        for (let n = 0; n < copies; n++) tiles.push(k);
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
     * 중력 모드: 각 열에서 빈 칸 위의 타일을 아래(행 번호가 큰 쪽)로 떨어뜨린다.
     * 패딩 줄(0행·마지막 행)은 그대로 비워 둔다.
     * @returns {{from: {r:number,c:number}, to: {r:number,c:number}, value: number}[]} 움직인 타일 목록
     */
    applyGravity() {
      const moves = [];
      for (let c = 1; c <= this.cols; c++) {
        let write = this.rows; // 다음 타일이 놓일 가장 아래 칸
        for (let r = this.rows; r >= 1; r--) {
          const v = this.grid[r][c];
          if (v === 0) continue;
          if (r !== write) {
            this.grid[write][c] = v;
            this.grid[r][c] = 0;
            moves.push({ from: { r, c }, to: { r: write, c }, value: v });
          }
          write--;
        }
      }
      // 위치가 바뀌었으므로 되돌리기 기록은 무의미해진다
      if (moves.length) this.history = [];
      return moves;
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
