/**
 * 어려움 난이도 테스트: node tests/hard.test.js
 */
const assert = require('assert');
const { Board, DIFFICULTIES, BRICK } = require('../js/board.js');
const PF = require('../js/pathfinder.js');

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ✓ ' + name); }

function seq(seed) {
  let a = seed >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
}

function hardBoard(seed) {
  const d = DIFFICULTIES.hard;
  return new Board(d.rows, d.cols, seq(seed), d.kinds, { pool: d.pool, bricks: d.bricks });
}

function counts(b) {
  const m = new Map();
  for (const row of b.grid) for (const v of row) if (v > 0) m.set(v, (m.get(v) || 0) + 1);
  return m;
}

test('어려움은 꼭짓점 벽돌 4칸 + 타일 76개 = 24종 (2장 10종 + 4장 14종)', () => {
  const b = hardBoard(1);
  const m = counts(b);
  const c = [...m.values()];
  assert.strictEqual(m.size, 24);
  assert.strictEqual(c.filter(x => x === 2).length, 10);
  assert.strictEqual(c.filter(x => x === 4).length, 14);
  assert.strictEqual(b.remaining(), 76);
  const bricks = [];
  b.grid.forEach((row, r) => row.forEach((v, c) => { if (v === BRICK) bricks.push(`${r},${c}`); }));
  assert.deepStrictEqual(bricks.sort(), ['1,1', '1,10', '8,1', '8,10'].sort());
});

test('그림은 1..36 중에서 판마다 다르게 24종을 고른다', () => {
  const seen = new Set();
  const sets = new Set();
  for (let s = 1; s <= 40; s++) {
    const ids = [...counts(hardBoard(Math.imul(s, 2654435761)))].map(([id]) => id).sort((a, b) => a - b);
    ids.forEach(id => { assert.ok(id >= 1 && id <= 36); seen.add(id); });
    sets.add(ids.join(','));
  }
  assert.ok(sets.size > 1, '매판 같은 24종이면 안 된다');
  assert.strictEqual(seen.size, 36, '여러 판에 걸쳐 36종이 모두 나와야 한다');
});

test('벽돌은 길을 막는다', () => {
  // 4x4 판, 맨 윗줄 (1,2)와 (1,4): 사이 (1,3)이 비어 있으면 바로 이어지지만, 벽돌이 있으면 막힌다
  const b = new Board(4, 4);
  b.grid = Array.from({ length: 6 }, () => new Array(6).fill(0));
  b.grid[1][2] = 7; b.grid[1][4] = 7;
  b.grid[2][2] = 9; b.grid[2][4] = 8; b.grid[2][3] = 5; // 아래로 돌아가는 길 차단
  assert.ok(PF.findPath(b.grid, { r: 1, c: 2 }, { r: 1, c: 4 }));
  b.grid[1][3] = BRICK; b.grid[0][3] = BRICK; // 위쪽 통로로 돌아가는 길도 차단
  assert.strictEqual(PF.findPath(b.grid, { r: 1, c: 2 }, { r: 1, c: 4 }), null);
});

test('벽돌은 짝으로 잡히지 않고 섞기에도 그대로 남는다', () => {
  const b = hardBoard(5);
  const mask = () => JSON.stringify(b.grid.map(row => row.map(v => v === BRICK)));
  const before = mask();
  for (const p of b.availablePairs()) assert.ok(b.get(p.a.r, p.a.c) > 0);
  b.shuffle();
  assert.strictEqual(mask(), before);
  assert.strictEqual(b.remaining(), 76);
});

test('중력: 벽돌은 고정되고 위 타일은 벽돌 위에 쌓인다', () => {
  const b = new Board(4, 4);
  b.grid = Array.from({ length: 6 }, () => new Array(6).fill(0));
  // 열 1: 위에서부터 3, 0, 0, 벽돌 → 3이 벽돌 바로 위(3행)로 떨어진다
  b.grid[1][1] = 3; b.grid[4][1] = BRICK;
  // 열 2: 벽돌(1행) 아래 타일은 바닥으로
  b.grid[1][2] = BRICK; b.grid[2][2] = 6;
  b.applyGravity();
  assert.strictEqual(b.grid[4][1], BRICK);
  assert.strictEqual(b.grid[3][1], 3);
  assert.strictEqual(b.grid[1][1], 0);
  assert.strictEqual(b.grid[1][2], BRICK);
  assert.strictEqual(b.grid[4][2], 6);
});

test('어려움 판: 힌트대로 맞추면 (막히면 섞기) 중력 모드에서도 반드시 클리어', () => {
  for (const gravity of [false, true]) {
    for (let s = 1; s <= 10; s++) {
      const b = hardBoard(s * 7919);
      for (let guard = 0; guard < 500 && !b.isCleared(); guard++) {
        const p = b.availablePairs(1)[0];
        if (!p) { b.shuffle(); continue; }
        b.tryMatch(p.a, p.b);
        if (gravity) b.applyGravity();
      }
      assert.ok(b.isCleared(), `seed ${s} gravity=${gravity}`);
    }
  }
});

test('보통·쉬움은 기존과 같다 (종류당 4장, 벽돌 없음)', () => {
  for (const key of ['easy', 'normal']) {
    const d = DIFFICULTIES[key];
    const b = new Board(d.rows, d.cols, seq(9), d.kinds, { pool: d.pool, bricks: d.bricks });
    const m = counts(b);
    assert.strictEqual(m.size, (d.rows * d.cols) / 4);
    assert.ok([...m.values()].every(x => x === 4));
    assert.ok(b.grid.every(row => row.every(v => v >= 0)));
  }
});

console.log(`\n${passed}개 테스트 통과`);
