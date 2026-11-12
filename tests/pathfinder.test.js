/**
 * 경로 탐색 검증 테스트: node tests/pathfinder.test.js
 * BFS 결과를 "꺾이는 지점 후보 전수 조사" 방식의 정답 판정기와 무작위 보드에서 비교한다.
 */
const assert = require('assert');
const { findPath, findAvailablePairs } = require('../js/pathfinder.js');
const { Board } = require('../js/board.js');

// ---- 정답 판정기: a -> p1 -> p2 -> b (각 구간은 직선) ----
function clearLine(board, p, q, a, b) {
  // p, q 사이(양 끝 포함)가 모두 빈 칸인지. 단 a, b 자리는 허용.
  if (p.r !== q.r && p.c !== q.c) return false;
  const dr = Math.sign(q.r - p.r), dc = Math.sign(q.c - p.c);
  let r = p.r, c = p.c;
  while (true) {
    const isEnd = (r === a.r && c === a.c) || (r === b.r && c === b.c);
    if (!isEnd && board[r][c] !== 0) return false;
    if (r === q.r && c === q.c) break;
    r += dr; c += dc;
  }
  return true;
}
function bruteForce(board, a, b) {
  if (a.r === b.r && a.c === b.c) return false;
  if (board[a.r][a.c] === 0 || board[a.r][a.c] !== board[b.r][b.c]) return false;
  const rows = board.length, cols = board[0].length;
  for (let r = 0; r < rows; r++) {
    const p1 = { r, c: a.c }, p2 = { r, c: b.c };
    if (clearLine(board, a, p1, a, b) && clearLine(board, p1, p2, a, b) && clearLine(board, p2, b, a, b)) return true;
  }
  for (let c = 0; c < cols; c++) {
    const p1 = { r: a.r, c }, p2 = { r: b.r, c };
    if (clearLine(board, a, p1, a, b) && clearLine(board, p1, p2, a, b) && clearLine(board, p2, b, a, b)) return true;
  }
  return false;
}

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ✓ ' + name); }

// 패딩 포함 보드를 문자열로 작성 ('.' = 빈 칸)
function parse(rows) {
  return rows.map(line => line.split(' ').map(t => (t === '.' ? 0 : Number(t))));
}

test('0회 꺾임: 직선 연결', () => {
  const b = parse([
    '. . . . .',
    '. 1 . 1 .',
    '. 2 3 4 .',
    '. . . . .',
  ]);
  const p = findPath(b, { r: 1, c: 1 }, { r: 1, c: 3 });
  assert.ok(p); assert.strictEqual(p.turns, 0);
});

test('직선 사이에 장애물이 있으면 직선 불가 (우회는 가능)', () => {
  const b = parse([
    '. . . . .',
    '. 1 2 1 .',
    '. 3 3 3 .',
    '. . . . .',
  ]);
  const p = findPath(b, { r: 1, c: 1 }, { r: 1, c: 3 });
  assert.ok(p); assert.strictEqual(p.turns, 2); // 위쪽 패딩으로 U자 우회
});

test('1회 꺾임: L자', () => {
  const b = parse([
    '. . . . .',
    '. 1 . . .',
    '. 2 2 1 .',
    '. . . . .',
  ]);
  // (1,1) -> 오른쪽 (1,3) -> 아래 (2,3)
  const p = findPath(b, { r: 1, c: 1 }, { r: 2, c: 3 });
  assert.ok(p); assert.strictEqual(p.turns, 1);
});

test('2회 꺾임: 외곽 패딩을 경유하는 U자', () => {
  const b = parse([
    '. . . . . .',
    '. 1 2 3 1 .',
    '. 4 5 6 7 .',
    '. 4 5 6 7 .',
    '. . . . . .',
  ]);
  const p = findPath(b, { r: 1, c: 1 }, { r: 1, c: 4 });
  assert.ok(p); assert.strictEqual(p.turns, 2);
  assert.strictEqual(p.points[1].r, 0); // 위쪽 패딩 행을 지나감
});

test('3회 꺾임이 필요하면 연결 불가', () => {
  const b = parse([
    '. . . . . .',
    '. 9 9 9 9 .',
    '. 1 9 . 9 .',
    '. 9 9 1 9 .',
    '. 9 9 9 9 .',
    '. . . . . .',
  ]);
  assert.strictEqual(findPath(b, { r: 2, c: 1 }, { r: 3, c: 3 }), null);
});

test('다른 종류 / 같은 칸은 연결 불가', () => {
  const b = parse(['. . . .', '. 1 2 .', '. . . .']);
  assert.strictEqual(findPath(b, { r: 1, c: 1 }, { r: 1, c: 2 }), null);
  assert.strictEqual(findPath(b, { r: 1, c: 1 }, { r: 1, c: 1 }), null);
});

test('같은 꺾임 수에서는 가장 짧은 경로 선택', () => {
  const b = parse([
    '. . . . . .',
    '. 1 . . . .',
    '. 2 2 2 . .',
    '. 1 . . . .',
    '. . . . . .',
  ]);
  const p = findPath(b, { r: 1, c: 1 }, { r: 3, c: 1 });
  assert.ok(p); assert.strictEqual(p.turns, 2);
  assert.strictEqual(p.length, 4); // 왼쪽 패딩으로 돌아가는 최단 경로 (오른쪽 우회는 8)
  assert.strictEqual(p.points[1].c, 0);
});

test('무작위 보드 5,000쌍: BFS 결과 == 전수 조사 정답', () => {
  let seed = 12345;
  const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let checked = 0;
  for (let t = 0; t < 400; t++) {
    const R = 3 + Math.floor(rng() * 6), C = 3 + Math.floor(rng() * 6);
    const board = [];
    for (let r = 0; r < R + 2; r++) {
      const row = [];
      for (let c = 0; c < C + 2; c++) {
        const inner = r > 0 && r <= R && c > 0 && c <= C;
        row.push(inner && rng() < 0.6 ? 1 + Math.floor(rng() * 3) : 0);
      }
      board.push(row);
    }
    const cells = [];
    board.forEach((row, r) => row.forEach((v, c) => v && cells.push({ r, c })));
    for (let i = 0; i < cells.length && checked < 5000; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const got = findPath(board, cells[i], cells[j]) !== null;
        const want = bruteForce(board, cells[i], cells[j]);
        assert.strictEqual(got, want, `불일치 at ${JSON.stringify([cells[i], cells[j]])}\n${board.map(r => r.join(' ')).join('\n')}`);
        checked++;
      }
    }
  }
  assert.ok(checked >= 5000);
});

test('Board: 생성 시 항상 맞출 짝 존재 + 셔플 후에도 존재', () => {
  for (let i = 0; i < 30; i++) {
    const board = new Board(10, 12);
    assert.strictEqual(board.remaining(), 120);
    assert.ok(board.hasMoves());
    board.shuffle();
    assert.strictEqual(board.remaining(), 120);
    assert.ok(board.hasMoves());
  }
});

test('Board: 힌트대로 계속 맞추면 (막히면 셔플) 반드시 클리어', () => {
  for (let i = 0; i < 20; i++) {
    const board = new Board(8, 10);
    let guard = 0;
    while (!board.isCleared() && guard++ < 1000) {
      const [pair] = board.availablePairs(1);
      if (!pair) { board.shuffle(); continue; }
      assert.ok(board.tryMatch(pair.a, pair.b));
    }
    assert.ok(board.isCleared());
  }
});

test('Board: 되돌리기', () => {
  const board = new Board(6, 8);
  const [pair] = board.availablePairs(1);
  const v = board.get(pair.a.r, pair.a.c);
  board.tryMatch(pair.a, pair.b);
  assert.strictEqual(board.remaining(), 46);
  board.undo();
  assert.strictEqual(board.remaining(), 48);
  assert.strictEqual(board.get(pair.b.r, pair.b.c), v);
});

test('성능: 120타일 보드 전체 짝 탐색 < 20ms', () => {
  const board = new Board(10, 12);
  const t0 = process.hrtime.bigint();
  findAvailablePairs(board.grid);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`    (전체 탐색 ${ms.toFixed(2)}ms)`);
  assert.ok(ms < 20);
});

console.log(`\n${passed}개 테스트 통과`);
