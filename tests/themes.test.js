/**
 * 테마 프리셋 검증 테스트: node tests/themes.test.js
 */
const assert = require('assert');
const { THEMES } = require('../js/themes.js');
const { DIFFICULTIES } = require('../js/board.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ✓ ' + name);
}

const maxKinds = Math.max(
  ...Object.values(DIFFICULTIES).map(d => d.pool || (d.rows * d.cols) / 4),
);

test('모든 테마 프리셋이 존재한다', () => {
  assert.deepStrictEqual(Object.keys(THEMES), ['fruit', 'animal', 'pokemon', 'digimon']);
});

test('각 테마는 중복 없는 36개 이상의 타일과 틴트·스파클을 가진다', () => {
  for (const [key, theme] of Object.entries(THEMES)) {
    assert.ok(theme.name && theme.name.length > 0, `${key}: name 비어 있음`);
    assert.ok(theme.icon && theme.icon.length > 0, `${key}: icon 비어 있음`);
    assert.strictEqual(theme.tiles.length, 36, `${key}: tiles 길이`);
    assert.strictEqual(new Set(theme.tiles).size, 36, `${key}: 중복 타일 존재`);
    assert.ok(theme.tiles.length >= maxKinds, `${key}: 어려움 난이도(${maxKinds}종) 지원 부족`);
    assert.ok(Array.isArray(theme.tints) && theme.tints.length > 0, `${key}: tints 부족`);
    assert.ok(Array.isArray(theme.sparkles) && theme.sparkles.length > 0, `${key}: sparkles 부족`);
    if (theme.kind === 'sprite') {
      assert.strictEqual(theme.spriteCols, 6, `${key}: spriteCols`);
      assert.strictEqual(theme.spriteRows, 6, `${key}: spriteRows`);
      assert.strictEqual(theme.spriteCols * theme.spriteRows, theme.tiles.length, `${key}: sprite 격자 크기`);
    }
  }
});

console.log(`\n${passed}개 테스트 통과`);
