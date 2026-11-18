/**
 * 중력 모드 테스트: node tests/gravity.test.js
 */
const assert = require('assert');
const { Board } = require('../js/board.js');

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ✓ ' + name); }

function seq(seed) {
  let a = seed >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
}

test('빈 칸 위의 타일이 바닥으로 떨어지고 순서가 유지된다', () => {
  const b = new Board(4, 4);
  // 내부 4x4를 직접 구성 (열 1: 위에서부터 1,0,2,0 → 아래로 0,0,1,2)
  b.grid = [
    [0, 0, 0, 0, 0, 0],
    [0, 1, 3, 0, 0, 0],
    [0, 0, 3, 0, 0, 0],
    [0, 2, 0, 0, 0, 0],
    [0, 0, 4, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
  ];
  const moves = b.applyGravity();
  assert.deepStrictEqual(b.grid.map(r => r[1]), [0, 0, 0, 1, 2, 0]);
  assert.deepStrictEqual(b.grid.map(r => r[2]), [0, 0, 3, 3, 4, 0]);
  assert.deepStrictEqual(moves, [
    { from: { r: 3, c: 1 }, to: { r: 4, c: 1 }, value: 2 },
    { from: { r: 1, c: 1 }, to: { r: 3, c: 1 }, value: 1 },
    { from: { r: 2, c: 2 }, to: { r: 3, c: 2 }, value: 3 },
    { from: { r: 1, c: 2 }, to: { r: 2, c: 2 }, value: 3 },
  ]);
});

test('패딩 줄은 계속 비어 있고 타일 구성은 보존된다', () => {
  for (let s = 1; s <= 200; s++) {
    const rng = seq(s);
    const b = new Board(8, 10, rng);
    // 무작위 칸을 비운 뒤 중력 적용
    for (let r = 1; r <= 8; r++) for (let c = 1; c <= 10; c++) if (rng() < 0.4) b.grid[r][c] = 0;
    const before = b.grid.flat().filter(v => v).sort((x, y) => x - y);
    b.applyGravity();
    const after = b.grid.flat().filter(v => v).sort((x, y) => x - y);
    assert.deepStrictEqual(after, before);
    assert.ok(b.grid[0].every(v => v === 0) && b.grid[9].every(v => v === 0));
    for (let r = 0; r < 10; r++) assert.ok(b.grid[r][0] === 0 && b.grid[r][11] === 0);
    // 각 열에서 타일 아래에 빈 칸이 없다
    for (let c = 1; c <= 10; c++) {
      let seenTile = false;
      for (let r = 1; r <= 8; r++) {
        if (b.grid[r][c]) seenTile = true;
        else assert.ok(!seenTile, `열 ${c}: 타일 아래 빈 칸`);
      }
    }
    assert.deepStrictEqual(b.applyGravity(), [], '두 번째 적용은 아무것도 움직이지 않는다');
  }
});

test('중력 모드에서도 힌트대로 맞추면 (막히면 셔플) 반드시 클리어', () => {
  for (let s = 1; s <= 60; s++) {
    const b = new Board(8, 10, seq(s * 7));
    let guard = 0;
    while (!b.isCleared()) {
      assert.ok(guard++ < 500, '무한 루프');
      if (!b.hasMoves()) { b.shuffle(); continue; }
      const [pair] = b.availablePairs(1);
      assert.ok(b.tryMatch(pair.a, pair.b));
      b.applyGravity();
    }
  }
});

console.log(`\n${passed}개 테스트 통과`);
