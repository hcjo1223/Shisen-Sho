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

test('어려움은 80개 = 30종 (2장 20종 + 4장 10종)', () => {
  const m = counts(hardBoard(1));
  const c = [...m.values()];
  assert.strictEqual(m.size, 30);
  assert.strictEqual(c.filter(x => x === 2).length, 20);
  assert.strictEqual(c.filter(x => x === 4).length, 10);
  assert.strictEqual(c.reduce((a, x) => a + x, 0), 80);
});

test('그림은 1..36 중에서 판마다 다르게 30종을 고른다', () => {
  const seen = new Set();
  const sets = new Set();
  for (let s = 1; s <= 40; s++) {
    const ids = [...counts(hardBoard(Math.imul(s, 2654435761))).keys()].sort((a, b) => a - b);
    ids.forEach(id => { assert.ok(id >= 1 && id <= 36); seen.add(id); });
    sets.add(ids.join(','));
  }
  assert.ok(sets.size > 1, '매판 같은 30종이면 안 된다');
  assert.strictEqual(seen.size, 36, '여러 판에 걸쳐 36종이 모두 나와야 한다');
});

test('바깥 통로 네 모서리에 ㄱ자 벽돌 12개, 안쪽에는 없다', () => {
  const b = hardBoard(3);
  const last = b.rows + 1, right = b.cols + 1;
  const bricks = [];
  b.grid.forEach((row, r) => row.forEach((v, c) => { if (v === BRICK) bricks.push(`${r},${c}`); }));
  assert.strictEqual(bricks.length, 12);
  for (const [r, c] of [[0, 0], [1, 0], [0, 1], [0, right], [1, right], [0, right - 1],
    [last, 0], [last - 1, 0], [last, 1], [last, right], [last - 1, right], [last, right - 1]]) {
    assert.ok(bricks.includes(`${r},${c}`), `${r},${c} 에 벽돌`);
  }
  assert.strictEqual(b.remaining(), 80, '벽돌은 남은 타일 수에 들어가지 않는다');
});

test('벽돌은 길을 막는다 (모서리 옆 통로로 돌아가는 경로 불가)', () => {
  // 4x4 판, 왼쪽 열 맨 위·맨 아래 타일이 같은 그림: 사이와 오른쪽이 막혀 왼쪽 통로로만 이어진다
  const b = new Board(4, 4);
  b.grid = Array.from({ length: 6 }, () => new Array(6).fill(0));
  b.grid[1][1] = 7; b.grid[4][1] = 7;
  b.grid[2][1] = 9; b.grid[3][1] = 9;
  b.grid[1][2] = 8; b.grid[4][2] = 8;
  assert.ok(PF.findPath(b.grid, { r: 1, c: 1 }, { r: 4, c: 1 }), '벽돌이 없으면 왼쪽 통로로 돌아간다');
  b.placeBricks();
  assert.strictEqual(PF.findPath(b.grid, { r: 1, c: 1 }, { r: 4, c: 1 }), null);
});

test('벽돌은 짝으로 잡히지 않고 섞기·중력에도 그대로 남는다', () => {
  const b = hardBoard(5);
  const before = JSON.stringify(b.grid.map(row => row.map(v => v === BRICK)));
  for (const p of b.availablePairs()) assert.ok(b.get(p.a.r, p.a.c) > 0);
  b.shuffle();
  b.applyGravity();
  assert.strictEqual(JSON.stringify(b.grid.map(row => row.map(v => v === BRICK))), before);
  assert.strictEqual(b.remaining(), 80);
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
