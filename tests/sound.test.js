/**
 * 테마별 BGM · SFX 오디오 엔진 테스트: node tests/sound.test.js
 */
const assert = require('assert');

function makeMockAudioContext() {
  const created = { oscs: [], noises: 0, filters: [], gains: [] };
  let t = 10;

  function makeParam(initial = 0) {
    return {
      value: initial,
      setValueAtTime(v) {
        assert.ok(Number.isFinite(v), `Invalid audio param value: ${v}`);
        this.value = v;
      },
      exponentialRampToValueAtTime(v) {
        assert.ok(Number.isFinite(v) && v > 0, `Invalid exponentialRamp value: ${v}`);
        this.value = v;
      },
      setTargetAtTime(v) {
        assert.ok(Number.isFinite(v), `Invalid setTarget value: ${v}`);
        this.value = v;
      },
      cancelScheduledValues() {},
    };
  }

  class MockNode {
    connect(dest) { return dest; }
    disconnect() {}
  }

  class MockOscillator extends MockNode {
    constructor() {
      super();
      this.type = 'sine';
      this.frequency = makeParam(440);
      this.detune = makeParam(0);
      created.oscs.push(this);
    }
    start() {}
    stop() {}
  }

  class MockGain extends MockNode {
    constructor() {
      super();
      this.gain = makeParam(1);
      created.gains.push(this);
    }
  }

  class MockFilter extends MockNode {
    constructor() {
      super();
      this.type = 'lowpass';
      this.frequency = makeParam(1000);
      this.Q = makeParam(0.7);
      created.filters.push(this);
    }
  }

  class MockBufferSource extends MockNode {
    constructor() {
      super();
      this.buffer = null;
      created.noises++;
    }
    start() {}
    stop() {}
  }

  class MockAudioContext {
    constructor() {
      this.sampleRate = 44100;
      this.state = 'running';
      this.destination = new MockNode();
    }
    get currentTime() { return t; }
    resume() { return Promise.resolve(); }
    createOscillator() { return new MockOscillator(); }
    createGain() { return new MockGain(); }
    createBiquadFilter() { return new MockFilter(); }
    createBuffer(ch, len) {
      return { getChannelData: () => new Float32Array(len) };
    }
    createBufferSource() { return new MockBufferSource(); }
  }

  return { MockAudioContext, created, advance(sec) { t += sec; } };
}

const mock = makeMockAudioContext();
global.AudioContext = mock.MockAudioContext;

const Sound = require('../js/sound.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ✓ ' + name);
}

test('4개 테마 트랙과 효과음 세트가 모두 정의되어 있다', () => {
  const keys = ['fruit', 'animal', 'pokemon', 'digimon'];
  assert.deepStrictEqual(Object.keys(Sound._debug.TRACKS), keys);
  assert.deepStrictEqual(Object.keys(Sound._debug.SFX), keys);
  assert.strictEqual(Sound._debug.TRACKS.fruit.length, 64);
  assert.strictEqual(Sound._debug.TRACKS.animal.length, 64);
  assert.strictEqual(Sound._debug.TRACKS.pokemon.length, 128);
  assert.strictEqual(Sound._debug.TRACKS.digimon.length, 128);
  assert.strictEqual(Sound._debug.POKEMON_MELODY.length, 128);
  assert.strictEqual(Sound._debug.POKEMON_HARM_BARS.length, 128);
  assert.strictEqual(Sound._debug.POKEMON_BASS.length, 128);
  assert.strictEqual(Sound._debug.DIGIMON_MELODY.length, 128);
  assert.strictEqual(Sound._debug.DIGIMON_COMB_ARP.length, 128);
  assert.strictEqual(Sound._debug.DIGIMON_BASS.length, 128);
});

test('알 수 없는 테마를 지정해도 fruit로 안전하게 폴백한다', () => {
  Sound.theme = 'unknown';
  assert.strictEqual(Sound.theme, 'fruit');
});

test('포켓몬(8비트 팡파르)·디지몬(오르골) BGM 트랙이 각 스텝마다 유효한 음향 노드를 생성한다', async () => {
  Sound.bgmEnabled = false;
  await Sound.unlock();

  const signatures = {};
  for (const theme of ['fruit', 'animal', 'pokemon', 'digimon']) {
    const startOscIdx = mock.created.oscs.length;
    const startNoise = mock.created.noises;
    const track = Sound._debug.TRACKS[theme];
    const dummyGain = new mock.MockAudioContext().createGain();
    const dummyAc = new mock.MockAudioContext();

    for (let s = 0; s < track.length; s++) {
      track.playStep(dummyAc, dummyGain, s, 10 + s * track.stepSec);
    }

    const slice = mock.created.oscs.slice(startOscIdx);
    const waveSet = new Set(slice.map(o => o.type));
    assert.ok(slice.length > 30, `${theme}: 생성된 오실레이터 수가 너무 적음`);
    assert.ok(slice.every(o => o.frequency.value > 20 && o.frequency.value < 10000), `${theme}: 음역대 이탈`);
    signatures[theme] = { waves: [...waveSet].sort(), noises: mock.created.noises - startNoise };
  }

  // 포켓몬 = 8비트 사각파/삼각파 팡파르 + 행진 노이즈 타악
  assert.ok(signatures.pokemon.waves.includes('square'));
  assert.ok(signatures.pokemon.noises > 0, '포켓몬 BGM은 8비트 행진 노이즈 타악을 포함해야 함');
  // 디지몬 = 감성 오르골(사인파 + 벨 배음 삼각파, 톱니파·드럼 노이즈 없음)
  assert.ok(signatures.digimon.waves.includes('sine') && !signatures.digimon.waves.includes('sawtooth'));
  assert.strictEqual(signatures.digimon.noises, 0, '디지몬 오르골은 노이즈 드럼을 쓰지 않음');
  assert.ok(signatures.animal.waves.includes('sine') && !signatures.animal.waves.includes('sawtooth'));
});

test('모든 테마에서 SFX 6종이 정상 작동하고 테마 전환이 즉시 반영된다', () => {
  Sound.enabled = true;
  for (const theme of ['fruit', 'animal', 'pokemon', 'digimon']) {
    Sound.theme = theme;
    assert.strictEqual(Sound.theme, theme);
    const before = mock.created.oscs.length;
    Sound.select();
    Sound.match(1);
    Sound.match(4);
    Sound.fail();
    Sound.shuffle();
    Sound.hint();
    Sound.clear();
    assert.ok(mock.created.oscs.length > before + 10, `${theme}: SFX 노드가 생성되지 않음`);
  }

  Sound.enabled = false;
  const mutedCount = mock.created.oscs.length;
  Sound.select();
  Sound.match(2);
  Sound.clear();
  assert.strictEqual(mock.created.oscs.length, mutedCount, 'SFX 꺼짐 상태에서 오실레이터가 생성되면 안 됨');
  Sound.enabled = true;
});

console.log(`\n${passed}개 테스트 통과`);
