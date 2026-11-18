/**
 * 일일 챌린지 유틸 테스트 — node tests/daily.test.mjs
 * (src/utils/daily.ts는 import 없는 순수 TS라 Node의 타입 제거 기능으로 바로 불러온다)
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {
  currentStreak,
  dailySeed,
  longestStreak,
  seededRng,
  transposeGrid,
} from '../src/utils/daily.ts';

const require = createRequire(import.meta.url);
const {Board} = require('../js/board.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

const gridOf = key => new Board(8, 10, seededRng(dailySeed(key))).grid;

test('같은 날짜 → 같은 판, 다른 날짜 → 다른 판', () => {
  assert.deepEqual(gridOf('2026-11-18'), gridOf('2026-11-18'));
  assert.notDeepEqual(gridOf('2026-11-18'), gridOf('2026-11-19'));
});

test('시드 난수는 [0, 1) 범위', () => {
  const rng = seededRng('x');
  for (let i = 0; i < 10000; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1);
  }
});

test('행·열을 바꾼 판도 연결 가능한 짝이 같다 (세로 화면 = 같은 퍼즐)', () => {
  for (let d = 1; d <= 30; d++) {
    const key = `2026-12-${String(d).padStart(2, '0')}`;
    const a = new Board(8, 10, seededRng(dailySeed(key)));
    const b = new Board(10, 8);
    b.grid = transposeGrid(a.grid);
    const norm = (pairs, swap) =>
      pairs
        .map(({a: p, b: q}) => {
          const [x, y] = swap ? [{r: p.c, c: p.r}, {r: q.c, c: q.r}] : [p, q];
          return [x, y].map(t => `${t.r},${t.c}`).sort().join('-');
        })
        .sort();
    assert.deepEqual(norm(b.availablePairs(), true), norm(a.availablePairs(), false));
  }
});

test('연속 일수: 오늘 미완료면 어제까지의 연속, 끊기면 0', () => {
  const rec = {
    '2026-11-15': {bestMs: 1, hintsUsed: 0, clears: 1},
    '2026-11-16': {bestMs: 1, hintsUsed: 0, clears: 1},
    '2026-11-17': {bestMs: 1, hintsUsed: 0, clears: 1},
  };
  assert.equal(currentStreak(rec, '2026-11-17'), 3);
  assert.equal(currentStreak(rec, '2026-11-18'), 3);
  assert.equal(currentStreak(rec, '2026-11-19'), 0);
  assert.equal(longestStreak({...rec, '2026-11-20': {bestMs: 1, hintsUsed: 0, clears: 1}}), 3);
});

test('연속 일수는 월·연 경계를 넘어 이어진다', () => {
  const rec = {
    '2026-12-31': {bestMs: 1, hintsUsed: 0, clears: 1},
    '2027-01-01': {bestMs: 1, hintsUsed: 0, clears: 1},
  };
  assert.equal(currentStreak(rec, '2027-01-01'), 2);
  assert.equal(longestStreak(rec), 2);
});

console.log(`\n${passed}개 테스트 통과`);
