/**
 * sound.js — 테마별 Web Audio API 효과음 및 BGM 합성기
 * - fruit   : 과일 농장 — 톡톡 피치 마림바 & 도트 칩튠
 * - animal  : 동물 친구들 — 포근한 숲속 오르골 & 칼림바
 * - pokemon : 포켓몬 1세대 — 8비트 휴대용 콘솔 모험 칩튠 OST 느낌
 * - digimon : 디지몬 어드벤처 — 디지바이스 사이버 신스 & 애니 록 OST 느낌
 */
(function (root) {
  let ctx = null;
  let sfxEnabled = true;
  let bgmEnabled = true;
  let currentTheme = 'fruit';

  const VALID_THEMES = { fruit: true, animal: true, pokemon: true, digimon: true };
  function normalizeTheme(theme) {
    return VALID_THEMES[theme] ? theme : 'fruit';
  }

  // =========================================================================
  // 음계 주파수 변환 & 패턴 컴파일러
  // =========================================================================
  const SEMITONES = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
    'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
  };

  function noteHz(name) {
    if (!name) return 0;
    if (typeof name === 'number') return name;
    const m = /^([A-G][#b]?)(-?\d)$/.exec(String(name).trim());
    if (!m) return 0;
    const semi = SEMITONES[m[1]];
    if (semi === undefined) return 0;
    const midi = (Number(m[2]) + 1) * 12 + semi;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /** 토큰('C5', 'C5:3', '.') 배열을 스텝별 재생 목록으로 펼친다 */
  function compileTrack(tokens) {
    const out = [];
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (!tok || tok === '.') {
        out.push(null);
        continue;
      }
      const parts = String(tok).split(':');
      const freq = noteHz(parts[0]);
      const dur = Math.max(1, Number(parts[1] || 1));
      out.push(freq > 0 ? { freq, dur } : null);
      for (let k = 1; k < dur; k++) out.push(null);
    }
    return out;
  }

  /** 마디별 코드 아르페지오 생성기 (예: [['C4','E4','G4'], ...], 마디당 스텝 수) */
  function compileArp(chords, stepsPerChord) {
    const out = [];
    for (let c = 0; c < chords.length; c++) {
      const chord = chords[c];
      for (let s = 0; s < stepsPerChord; s++) {
        const freq = chord && chord.length ? noteHz(chord[s % chord.length]) : 0;
        out.push(freq > 0 ? { freq, dur: 1 } : null);
      }
    }
    return out;
  }

  // =========================================================================
  // AudioContext & 버스 노드 (스피커 보호용 로우패스 + 클릭 없는 트랙 전환)
  // =========================================================================
  let bgmMasterGain = null;
  let bgmFilter = null;
  let sfxFilter = null;
  let trackGain = null;
  let noiseBuffer = null;

  let bgmTimer = null;
  let bgmNextTime = 0;
  let bgmStep = 0;
  let isPlayingBgm = false;

  function ac() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function ensureNoiseBuffer(a) {
    if (noiseBuffer) return noiseBuffer;
    const len = Math.max(1, Math.floor(a.sampleRate * 0.25));
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffer = buf;
    return noiseBuffer;
  }

  function initSfxBus(a) {
    if (sfxFilter) return sfxFilter;
    sfxFilter = a.createBiquadFilter();
    sfxFilter.type = 'lowpass';
    sfxFilter.frequency.setValueAtTime(5600, a.currentTime);
    sfxFilter.Q.setValueAtTime(0.7, a.currentTime);
    sfxFilter.connect(a.destination);
    return sfxFilter;
  }

  function initBgmNodes() {
    const a = ac();
    if (!a) return;
    if (!bgmMasterGain) {
      bgmFilter = a.createBiquadFilter();
      bgmFilter.type = 'lowpass';
      bgmFilter.frequency.setValueAtTime(TRACKS[currentTheme].cutoff, a.currentTime);
      bgmFilter.Q.setValueAtTime(0.7, a.currentTime);

      bgmMasterGain = a.createGain();
      bgmMasterGain.gain.setValueAtTime(bgmEnabled ? 0.22 : 0.0001, a.currentTime);
      bgmFilter.connect(bgmMasterGain).connect(a.destination);
    }
    if (!trackGain) {
      trackGain = a.createGain();
      trackGain.gain.setValueAtTime(1, a.currentTime);
      trackGain.connect(bgmFilter);
    }
  }

  function tone(freq, start, dur, opts) {
    const a = ac();
    if (!a || !sfxEnabled || !freq) return;
    const o = opts || {};
    const dest = initSfxBus(a);
    const t0 = a.currentTime + (start || 0);
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t0);
    if (o.endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.endFreq), t0 + dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(o.vol || 0.22, t0 + (o.attack || 0.008));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function playNoteOnTarget(a, target, freq, time, dur, type, vol, detune) {
    if (!freq || !target) return;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, time);
    if (detune) osc.detune.setValueAtTime(detune, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol || 0.16, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.95);
    osc.connect(g).connect(target);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function playNoiseHit(a, target, time, dur, cutoff, filterType, vol) {
    if (!target) return;
    const buf = ensureNoiseBuffer(a);
    const src = a.createBufferSource();
    src.buffer = buf;
    const filter = a.createBiquadFilter();
    filter.type = filterType || 'highpass';
    filter.frequency.setValueAtTime(cutoff || 6000, time);
    const g = a.createGain();
    g.gain.setValueAtTime(vol || 0.04, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filter).connect(g).connect(target);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  function playKick(a, target, time, dur, vol) {
    if (!target) return;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.085);
    g.gain.setValueAtTime(vol || 0.24, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g).connect(target);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function vibrate(ms) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  // =========================================================================
  // 4개 테마별 BGM 악곡 데이터
  // =========================================================================

  // 1) 과일 농장 (fruit) — C 메이저 경쾌한 마림바·칩튠 (64스텝, 8분음표 기준)
  const FRUIT_MELODY = compileTrack([
    'E5', '.', 'G5', 'C6', 'E6', '.', 'D6', '.',
    'C6', 'A5', 'G5', '.', 'E5', 'G5', 'A5', '.',
    'F5', '.', 'A5', 'C6', 'D6', '.', 'C6', '.',
    'B5', 'G5', 'A5', 'B5', 'C6:3', '.',
    'E5', 'G5', 'E5', 'D5', 'C5', '.', 'E5', 'G5',
    'A5', 'C6', 'A5', 'G5', 'E5', '.', 'G5', '.',
    'D5', 'E5', 'F5', 'A5', 'G5', 'E5', 'D5', '.',
    'C5', 'E5', 'G5', 'D5', 'C5:3', '.',
  ]);
  const FRUIT_BASS = compileTrack([
    'C3:2', 'G3:2', 'C4:2', 'G3:2', 'A3:2', 'E3:2', 'A3:2', 'E3:2',
    'F3:2', 'C3:2', 'F3:2', 'C3:2', 'G3:2', 'D3:2', 'G3:2', 'B3:2',
    'C3:2', 'G3:2', 'C4:2', 'G3:2', 'A3:2', 'E3:2', 'A3:2', 'E3:2',
    'F3:2', 'A3:2', 'G3:2', 'B3:2', 'C3:2', 'G3:2', 'C4:2', 'C3:2',
  ]);

  // 2) 동물 친구들 (animal) — F 메이저 포근한 숲속 오르골·칼림바 (64스텝, 8분음표 기준)
  const ANIMAL_MELODY = compileTrack([
    'C5', 'F5', 'A5:2', 'G5', 'F5', 'G5', 'E5',
    'C5:2', 'F5:2', 'C5:4',
    'D5', 'F5', 'A5:2', 'G5', 'F5', 'G5', 'A5',
    'F5:2', 'D5:2', 'C5:4',
    'D5', 'Bb5', 'A5:2', 'G5', 'F5', 'G5', 'C6',
    'A5:2', 'G5:2', 'F5:4',
    'G5', 'A5', 'Bb5:2', 'A5', 'G5', 'F5', 'E5',
    'F5', 'A5', 'C6', 'G5', 'F5:4',
  ]);
  const ANIMAL_BASS = compileTrack([
    'F3:2', 'C4:2', 'A3:2', 'C4:2', 'C3:2', 'G3:2', 'A3:2', 'C4:2',
    'D3:2', 'A3:2', 'F3:2', 'A3:2', 'Bb3:2', 'F3:2', 'C3:2', 'G3:2',
    'Bb3:2', 'F4:2', 'A3:2', 'C4:2', 'F3:2', 'C4:2', 'D4:2', 'A3:2',
    'G3:2', 'D4:2', 'C3:2', 'G3:2', 'F3:2', 'C4:2', 'F3:4',
  ]);
  const ANIMAL_ARP = compileArp(
    [
      ['F4', 'A4', 'C5'],
      ['C4', 'E4', 'G4'],
      ['D4', 'F4', 'A4'],
      ['Bb4', 'D5', 'C5'],
      ['Bb4', 'D5', 'F5'],
      ['F4', 'A4', 'C5'],
      ['G4', 'Bb4', 'C5'],
      ['F4', 'A4', 'C5'],
    ],
    8,
  );

  // 3) 포켓몬 1세대 (pokemon) — 8비트 콘솔 모험 OST 느낌 (128스텝, 16분음표 139 BPM)
  const POKEMON_MELODY = compileTrack([
    // Bar 1 (C): 씩씩한 모험의 시작
    'C5:2', 'E5:2', 'G5:2', 'C6:2', 'G5:3', 'E5', 'G5:2', 'A5:2',
    // Bar 2 (Bb): 클래식 레트로 bVII 도약
    'Bb5:2', 'A5:2', 'G5:2', 'F5:2', 'G5:2', 'F5:2', 'D5:4',
    // Bar 3 (F -> G): 힘찬 상승 라인
    'F5:2', 'A5:2', 'C6:2', 'A5:2', 'G5:2', 'B5:2', 'D6:4',
    // Bar 4 (C -> G): 빠른 16비트 턴어라운드
    'E6:2', 'D6:2', 'C6:2', 'G5:2', 'A5', 'G5', 'F5', 'E5', 'D5:4',
    // Bar 5 (Am -> Em): 긴장감 있는 브리지
    'A5:2', 'E5:2', 'A5:2', 'C6:2', 'B5:2', 'A5:2', 'G5:2', 'E5:2',
    // Bar 6 (F -> G): 결의에 찬 전진
    'F5:2', 'G5:2', 'A5:2', 'C6:2', 'D6:2', 'C6:2', 'A5:2', 'G5:2',
    // Bar 7 (Dm -> G7): 클라이맥스 빌드업
    'F5:2', 'E5:2', 'D5:2', 'F5:2', 'G5:2', 'A5:2', 'B5:2', 'D6:2',
    // Bar 8 (C): 당당한 승리 팡파르 루프
    'C6:3', 'G5', 'E5:2', 'G5:2', 'C6:4', '.', '.', 'G5:2',
  ]);
  const POKEMON_BASS = compileTrack([
    'C3:2', 'C4:2', 'G3:2', 'C4:2', 'C3:2', 'G3:2', 'C4:2', 'G3:2',
    'Bb2:2', 'Bb3:2', 'F3:2', 'Bb3:2', 'Bb2:2', 'F3:2', 'G3:2', 'B3:2',
    'F3:2', 'F4:2', 'C4:2', 'F4:2', 'G3:2', 'G4:2', 'D4:2', 'G4:2',
    'C3:2', 'G3:2', 'C4:2', 'E3:2', 'G3:2', 'D3:2', 'G3:2', 'B3:2',
    'A2:2', 'A3:2', 'E3:2', 'A3:2', 'E3:2', 'E4:2', 'B3:2', 'E4:2',
    'F3:2', 'F4:2', 'C4:2', 'F4:2', 'G3:2', 'G4:2', 'D4:2', 'G4:2',
    'D3:2', 'D4:2', 'A3:2', 'D4:2', 'G3:2', 'G4:2', 'D4:2', 'B3:2',
    'C3:2', 'C4:2', 'G3:2', 'E3:2', 'C3:4', 'G3:2', 'G2:2',
  ]);
  const POKEMON_ARP = compileArp(
    [
      ['C4', 'E4', 'G4'],
      ['Bb3', 'D4', 'F4'],
      ['F3', 'A3', 'C4'],
      ['C4', 'E4', 'G4'],
      ['A3', 'C4', 'E4'],
      ['F3', 'A3', 'C4'],
      ['D4', 'F4', 'A4'],
      ['C4', 'E4', 'G4'],
    ],
    16,
  );

  // 4) 디지몬 어드벤처 (digimon) — 디지바이스 사이버 신스 + 애니 록 OST 느낌 (128스텝, 16분음표 144 BPM)
  const DIGIMON_MELODY = compileTrack([
    // Bar 1 (Am): 에너지 넘치는 질주 오프닝
    'E5:2', 'E5:2', 'A5:2', 'B5:2', 'C6:3', 'B5', 'A5:2', 'E5:2',
    // Bar 2 (F): 벅차오르는 도약
    'F5:2', 'F5:2', 'A5:2', 'C6:2', 'B5:2', 'A5:2', 'G5:4',
    // Bar 3 (G): 시원하게 뻗는 멜로디
    'G5:2', 'G5:2', 'B5:2', 'D6:2', 'C6:3', 'B5', 'A5:2', 'G5:2',
    // Bar 4 (Em -> Am): 디지바이스 싱코페이션
    'E5:2', 'G5:2', 'B5:2', 'G5:2', 'A5:4', 'E5:4',
    // Bar 5 (Dm): 진화 직전의 긴박한 빌드
    'D6:3', 'C6', 'B5:2', 'A5:2', 'D6:2', 'C6:2', 'A5:2', 'F5:2',
    // Bar 6 (F -> G): 서스펜스 상승
    'C6:2', 'B5:2', 'A5:2', 'B5:2', 'D6:4', 'D6:3', '.',
    // Bar 7 (Am -> G): 후렴 하이라이트
    'E6:3', 'D6', 'C6:2', 'A5:2', 'D6:3', 'C6', 'B5:2', 'G5:2',
    // Bar 8 (E7): 드라마틱 턴어라운드
    'A5:2', 'G#5:2', 'B5:2', 'D6:2', 'E6:5', '.', 'C6', 'D6',
  ]);
  const DIGIMON_BASS = compileTrack([
    'A2:2', 'A3:2', 'A2:2', 'A3:2', 'A2:2', 'A3:2', 'E2:2', 'A3:2',
    'F2:2', 'F3:2', 'F2:2', 'F3:2', 'F2:2', 'F3:2', 'C3:2', 'F3:2',
    'G2:2', 'G3:2', 'G2:2', 'G3:2', 'G2:2', 'G3:2', 'D3:2', 'G3:2',
    'E2:2', 'E3:2', 'E2:2', 'E3:2', 'A2:2', 'A3:2', 'E2:2', 'G2:2',
    'D3:2', 'D4:2', 'D3:2', 'D4:2', 'D3:2', 'D4:2', 'A2:2', 'D3:2',
    'F2:2', 'F3:2', 'F2:2', 'F3:2', 'G2:2', 'G3:2', 'G2:2', 'D3:2',
    'A2:2', 'A3:2', 'E3:2', 'A3:2', 'G2:2', 'G3:2', 'D3:2', 'G3:2',
    'F2:2', 'E2:2', 'G#2:2', 'B2:2', 'E3:2', 'B2:2', 'E2:4',
  ]);
  const DIGIMON_ARP = compileArp(
    [
      ['A5', 'E6', 'A5', 'C6'],
      ['F5', 'C6', 'F5', 'A5'],
      ['G5', 'D6', 'G5', 'B5'],
      ['E5', 'B5', 'A5', 'E6'],
      ['D5', 'A5', 'D6', 'F5'],
      ['F5', 'C6', 'G5', 'D6'],
      ['A5', 'E6', 'G5', 'D6'],
      ['E5', 'G#5', 'B5', 'E6'],
    ],
    16,
  );

  // 각 테마 BGM 스케줄러 정의
  const TRACKS = {
    fruit: {
      length: FRUIT_MELODY.length,
      stepSec: 60 / 118 / 2,
      cutoff: 5200,
      playStep(a, target, step, time) {
        const s = step % FRUIT_MELODY.length;
        const m = FRUIT_MELODY[s];
        if (m) {
          playNoteOnTarget(a, target, m.freq, time, this.stepSec * m.dur * 0.85, 'square', 0.17);
        }
        const b = FRUIT_BASS[s];
        if (b) {
          playNoteOnTarget(a, target, b.freq, time, this.stepSec * b.dur * 0.85, 'triangle', 0.27);
        }
      },
    },
    animal: {
      length: ANIMAL_MELODY.length,
      stepSec: 60 / 124 / 2,
      cutoff: 3800,
      playStep(a, target, step, time) {
        const s = step % ANIMAL_MELODY.length;
        const m = ANIMAL_MELODY[s];
        if (m) {
          // 오르골/칼림바: 따뜻한 삼각파 + 옥타브 위 맑은 사인 배음
          playNoteOnTarget(a, target, m.freq, time, this.stepSec * m.dur * 1.15, 'triangle', 0.25);
          playNoteOnTarget(a, target, m.freq * 2, time, this.stepSec * 0.65, 'sine', 0.04);
        }
        const arp = ANIMAL_ARP[s];
        if (arp && s % 2 === 1) {
          playNoteOnTarget(a, target, arp.freq, time, this.stepSec * 0.85, 'sine', 0.065);
        }
        const b = ANIMAL_BASS[s];
        if (b) {
          playNoteOnTarget(a, target, b.freq, time, this.stepSec * b.dur * 0.9, 'sine', 0.28);
        }
      },
    },
    pokemon: {
      length: POKEMON_MELODY.length,
      stepSec: 60 / 139 / 4,
      cutoff: 4800,
      playStep(a, target, step, time) {
        const s = step % POKEMON_MELODY.length;
        const m = POKEMON_MELODY[s];
        if (m) {
          // 레트로 휴대용 콘솔 리드 사각파
          playNoteOnTarget(a, target, m.freq, time, this.stepSec * m.dur * 0.88, 'square', 0.155);
        }
        const arp = POKEMON_ARP[s];
        if (arp) {
          // 특징적인 16비트 빠른 코드 아르페지오 채널
          playNoteOnTarget(a, target, arp.freq, time, this.stepSec * 0.65, 'square', 0.05);
        }
        const b = POKEMON_BASS[s];
        if (b) {
          // 파형 채널 옥타브 어드벤처 베이스
          playNoteOnTarget(a, target, b.freq, time, this.stepSec * b.dur * 0.86, 'triangle', 0.26);
        }
        // 레트로 노이즈 채널 리듬
        const barStep = s % 16;
        if (barStep === 4 || barStep === 12) {
          playNoiseHit(a, target, time, 0.07, 1900, 'bandpass', 0.055);
        } else if (barStep % 4 === 2) {
          playNoiseHit(a, target, time, 0.032, 6800, 'highpass', 0.03);
        }
      },
    },
    digimon: {
      length: DIGIMON_MELODY.length,
      stepSec: 60 / 144 / 4,
      cutoff: 3900,
      playStep(a, target, step, time) {
        const s = step % DIGIMON_MELODY.length;
        const m = DIGIMON_MELODY[s];
        if (m) {
          // 디튠 듀얼 톱니파 애니 록 리드 신스
          const d = this.stepSec * m.dur * 0.9;
          playNoteOnTarget(a, target, m.freq, time, d, 'sawtooth', 0.088, -6);
          playNoteOnTarget(a, target, m.freq, time, d, 'sawtooth', 0.088, 6);
        }
        const arp = DIGIMON_ARP[s];
        if (arp && s % 2 === 0) {
          // 반짝이는 디지바이스 크리스탈 신스 아르페지오
          playNoteOnTarget(a, target, arp.freq, time, this.stepSec * 1.1, 'sine', 0.068);
          playNoteOnTarget(a, target, arp.freq, time, this.stepSec * 0.7, 'triangle', 0.03);
        }
        const b = DIGIMON_BASS[s];
        if (b) {
          // 질주감 있는 신스 록 베이스
          const bd = this.stepSec * b.dur * 0.88;
          playNoteOnTarget(a, target, b.freq, time, bd, 'triangle', 0.25);
          playNoteOnTarget(a, target, b.freq, time, bd * 0.75, 'sawtooth', 0.055);
        }
        // 일렉트로닉 애니 록 드럼
        const barStep = s % 16;
        if (barStep === 0 || barStep === 6 || barStep === 8 || barStep === 10) {
          playKick(a, target, time, 0.095, 0.22);
        }
        if (barStep === 4 || barStep === 12) {
          playNoiseHit(a, target, time, 0.085, 2200, 'bandpass', 0.065);
        } else if (barStep % 2 === 1) {
          playNoiseHit(a, target, time, 0.028, 7500, 'highpass', 0.024);
        }
      },
    },
  };

  function scheduleBgm() {
    const a = ac();
    if (!a || !isPlayingBgm) return;
    initBgmNodes();
    const track = TRACKS[currentTheme] || TRACKS.fruit;
    if (bgmNextTime < a.currentTime) {
      bgmNextTime = a.currentTime + 0.02;
    }
    while (bgmNextTime < a.currentTime + 0.28) {
      track.playStep(a, trackGain, bgmStep, bgmNextTime);
      bgmNextTime += track.stepSec;
      bgmStep++;
    }
    bgmTimer = setTimeout(scheduleBgm, 65);
  }

  function rotateTrackGain(a, now) {
    const oldTrackGain = trackGain;
    const freshTrackGain = a.createGain();
    freshTrackGain.gain.setValueAtTime(0.0001, now);
    freshTrackGain.gain.exponentialRampToValueAtTime(1, now + 0.05);
    freshTrackGain.connect(bgmFilter);
    trackGain = freshTrackGain;

    if (oldTrackGain) {
      try {
        oldTrackGain.gain.cancelScheduledValues(now);
        oldTrackGain.gain.setValueAtTime(Math.max(0.0001, oldTrackGain.gain.value), now);
        oldTrackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      } catch (e) {}
      setTimeout(() => {
        try { oldTrackGain.disconnect(); } catch (e) {}
      }, 120);
    }
  }

  function startBgm() {
    const a = ac();
    if (!a || isPlayingBgm) return;
    initBgmNodes();
    const now = a.currentTime;
    const track = TRACKS[currentTheme] || TRACKS.fruit;
    bgmFilter.frequency.setTargetAtTime(track.cutoff, now, 0.04);
    rotateTrackGain(a, now);
    isPlayingBgm = true;
    bgmNextTime = now + 0.05;
    bgmStep = 0;
    scheduleBgm();
  }

  function stopBgm() {
    isPlayingBgm = false;
    clearTimeout(bgmTimer);
    bgmTimer = null;
  }

  function transitionTrack(nextTheme) {
    const normalized = normalizeTheme(nextTheme);
    if (normalized === currentTheme) return;
    currentTheme = normalized;

    const a = ctx;
    if (!a || !bgmFilter) return;

    const now = a.currentTime;
    const track = TRACKS[currentTheme] || TRACKS.fruit;
    bgmFilter.frequency.setTargetAtTime(track.cutoff, now, 0.04);

    if (isPlayingBgm) {
      rotateTrackGain(a, now);
      clearTimeout(bgmTimer);
      bgmNextTime = now + 0.05;
      bgmStep = 0;
      scheduleBgm();
    }
  }

  // =========================================================================
  // 테마별 효과음 (SFX) 세트
  // =========================================================================
  const FRUIT_SCALE = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'E6', 'G6'].map(noteHz);
  const ANIMAL_SCALE = ['F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'A6'].map(noteHz);
  const POKEMON_SCALE = ['G5', 'A5', 'B5', 'D6', 'E6', 'G6', 'B6'].map(noteHz);
  const DIGIMON_SCALE = ['A5', 'B5', 'C#6', 'E6', 'F#6', 'A6', 'B6'].map(noteHz);

  const SFX = {
    fruit: {
      select() {
        tone(noteHz('A5'), 0, 0.12, { type: 'triangle', vol: 0.12 });
      },
      match(combo) {
        const base = Math.min(Math.max(0, (combo || 1) - 1), FRUIT_SCALE.length - 3);
        tone(FRUIT_SCALE[base], 0, 0.25, { type: 'triangle' });
        tone(FRUIT_SCALE[base + 1], 0.07, 0.25, { type: 'triangle' });
        tone(FRUIT_SCALE[base + 2], 0.14, 0.35, { type: 'triangle' });
      },
      fail() {
        tone(330, 0, 0.12, { type: 'sine', vol: 0.12 });
        tone(277, 0.08, 0.16, { type: 'sine', vol: 0.12 });
      },
      shuffle() {
        [0, 1, 2, 3, 4].forEach(i => tone(FRUIT_SCALE[(i * 3) % 6], i * 0.05, 0.12, { type: 'triangle', vol: 0.1 }));
      },
      hint() {
        tone(noteHz('E6'), 0, 0.2, { type: 'sine', vol: 0.12 });
        tone(noteHz('G6'), 0.1, 0.25, { type: 'sine', vol: 0.1 });
      },
      clear() {
        ['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6'].forEach((n, i) => {
          tone(noteHz(n), i * 0.12, 0.4, { type: 'triangle', vol: 0.16 });
        });
      },
    },
    animal: {
      select() {
        // 포근한 칼림바·우드블록 톡!
        tone(noteHz('F5'), 0, 0.11, { type: 'triangle', vol: 0.14 });
        tone(noteHz('C6'), 0, 0.06, { type: 'sine', vol: 0.06 });
      },
      match(combo) {
        const base = Math.min(Math.max(0, (combo || 1) - 1), ANIMAL_SCALE.length - 3);
        tone(ANIMAL_SCALE[base], 0, 0.24, { type: 'sine', vol: 0.18 });
        tone(ANIMAL_SCALE[base + 1], 0.065, 0.26, { type: 'triangle', vol: 0.16 });
        tone(ANIMAL_SCALE[base + 2], 0.13, 0.36, { type: 'sine', vol: 0.18 });
      },
      fail() {
        tone(noteHz('D4'), 0, 0.11, { type: 'triangle', vol: 0.12 });
        tone(noteHz('Bb3'), 0.075, 0.15, { type: 'triangle', vol: 0.12 });
      },
      shuffle() {
        ['F5', 'A5', 'C6', 'D6', 'F6'].forEach((n, i) => {
          tone(noteHz(n), i * 0.055, 0.16, { type: 'sine', vol: 0.12 });
        });
      },
      hint() {
        // 숲속 작은 새 지저귐 2음 차임
        tone(noteHz('G6'), 0, 0.11, { type: 'sine', vol: 0.11, endFreq: noteHz('A6') });
        tone(noteHz('Bb6'), 0.1, 0.18, { type: 'sine', vol: 0.11, endFreq: noteHz('C7') });
      },
      clear() {
        ['F5', 'A5', 'C6', 'D6', 'C6', 'F6'].forEach((n, i) => {
          tone(noteHz(n), i * 0.115, 0.42, { type: 'sine', vol: 0.18 });
          tone(noteHz(n) * 2, i * 0.115, 0.2, { type: 'sine', vol: 0.04 });
        });
      },
    },
    pokemon: {
      select() {
        // 8비트 콘솔 RPG 메뉴 커서 삐빅!
        tone(noteHz('B5'), 0, 0.032, { type: 'square', vol: 0.1 });
        tone(noteHz('E6'), 0.028, 0.055, { type: 'square', vol: 0.11 });
      },
      match(combo) {
        // 아이템 획득 / 경험치 업 8비트 스파클 아르페지오
        const base = Math.min(Math.max(0, (combo || 1) - 1), POKEMON_SCALE.length - 4);
        tone(POKEMON_SCALE[base], 0, 0.065, { type: 'square', vol: 0.12 });
        tone(POKEMON_SCALE[base + 1], 0.05, 0.065, { type: 'square', vol: 0.12 });
        tone(POKEMON_SCALE[base + 2], 0.1, 0.075, { type: 'square', vol: 0.13 });
        tone(POKEMON_SCALE[base + 3], 0.15, 0.26, { type: 'triangle', vol: 0.18 });
      },
      fail() {
        // 고전 게임보이 "선택 불가" 저음 버저
        tone(noteHz('E3'), 0, 0.08, { type: 'square', vol: 0.1 });
        tone(noteHz('C3'), 0.07, 0.14, { type: 'square', vol: 0.1 });
      },
      shuffle() {
        // PC 박스 / 순간이동 8비트 스윕
        ['C5', 'G5', 'E5', 'B5', 'G5', 'C6'].forEach((n, i) => {
          tone(noteHz(n), i * 0.042, 0.07, { type: 'square', vol: 0.11 });
        });
      },
      hint() {
        // 도감 스캔 / 트레이너 발견 3연타 핑!
        tone(noteHz('A5'), 0, 0.055, { type: 'square', vol: 0.1 });
        tone(noteHz('E6'), 0.055, 0.06, { type: 'square', vol: 0.11 });
        tone(noteHz('A6'), 0.115, 0.16, { type: 'square', vol: 0.11 });
      },
      clear() {
        // 체육관 배지 획득풍 8비트 팡파르!
        const notes = [
          ['C5', 0, 0.1],
          ['E5', 0.09, 0.1],
          ['G5', 0.18, 0.1],
          ['C6', 0.27, 0.22],
          ['G5', 0.45, 0.11],
          ['C6', 0.56, 0.48],
        ];
        notes.forEach(([n, at, dur]) => {
          tone(noteHz(n), at, dur, { type: 'square', vol: 0.13 });
          tone(noteHz(n) * 0.5, at, dur, { type: 'triangle', vol: 0.15 });
        });
      },
    },
    digimon: {
      select() {
        // 디지바이스 디지털 버튼 크리스탈 첩
        tone(noteHz('E6'), 0, 0.04, { type: 'sine', vol: 0.14 });
        tone(noteHz('B6'), 0.025, 0.07, { type: 'triangle', vol: 0.13 });
      },
      match(combo) {
        // 디지볼루션 데이터 링크 반짝임
        const base = Math.min(Math.max(0, (combo || 1) - 1), DIGIMON_SCALE.length - 4);
        tone(DIGIMON_SCALE[base], 0, 0.09, { type: 'sawtooth', vol: 0.08 });
        tone(DIGIMON_SCALE[base + 1], 0.045, 0.11, { type: 'triangle', vol: 0.14 });
        tone(DIGIMON_SCALE[base + 2], 0.09, 0.14, { type: 'sine', vol: 0.16 });
        tone(DIGIMON_SCALE[base + 3], 0.135, 0.3, { type: 'sine', vol: 0.16 });
      },
      fail() {
        // 디지털 방화벽 글리치 드롭
        tone(noteHz('Eb4'), 0, 0.085, { type: 'sawtooth', vol: 0.09, endFreq: noteHz('A3') });
        tone(noteHz('A3'), 0.075, 0.13, { type: 'square', vol: 0.07 });
      },
      shuffle() {
        // 디지털 게이트 / 매트릭스 재구성 캐스케이드
        ['A4', 'E5', 'B5', 'C#6', 'E6', 'A6'].forEach((n, i) => {
          tone(noteHz(n), i * 0.04, 0.11, { type: 'sine', vol: 0.13 });
          tone(noteHz(n), i * 0.04, 0.08, { type: 'sawtooth', vol: 0.045 });
        });
      },
      hint() {
        // 디지바이스 레이더 신호 탐색 에코 핑
        tone(noteHz('G#6'), 0, 0.16, { type: 'sine', vol: 0.14 });
        tone(noteHz('E6'), 0.05, 0.14, { type: 'triangle', vol: 0.08 });
        tone(noteHz('B6'), 0.11, 0.24, { type: 'sine', vol: 0.11 });
      },
      clear() {
        // 진화 완료 / 디지털 히어로 빅토리 팡파르
        const notes = [
          ['E5', 0, 0.11],
          ['F#5', 0.1, 0.11],
          ['G#5', 0.2, 0.11],
          ['A5', 0.3, 0.15],
          ['B5', 0.44, 0.16],
          ['E6', 0.58, 0.55],
        ];
        notes.forEach(([n, at, dur]) => {
          const f = noteHz(n);
          tone(f, at, dur, { type: 'sawtooth', vol: 0.08, detune: -5 });
          tone(f, at, dur, { type: 'sawtooth', vol: 0.08, detune: 5 });
          tone(f * 2, at, dur * 0.75, { type: 'sine', vol: 0.06 });
        });
      },
    },
  };

  function sfxSet() {
    return SFX[currentTheme] || SFX.fruit;
  }

  const Sound = {
    get enabled() { return sfxEnabled; },
    set enabled(v) { sfxEnabled = !!v; },
    get theme() { return currentTheme; },
    set theme(v) { transitionTrack(v); },
    setTheme(v) { transitionTrack(v); },
    get bgmEnabled() { return bgmEnabled; },
    set bgmEnabled(v) {
      bgmEnabled = !!v;
      if (bgmMasterGain && ctx) {
        const now = ctx.currentTime;
        bgmMasterGain.gain.cancelScheduledValues(now);
        bgmMasterGain.gain.setTargetAtTime(bgmEnabled ? 0.22 : 0.0001, now, 0.03);
      }
      if (bgmEnabled && !isPlayingBgm) {
        startBgm();
      } else if (!bgmEnabled && isPlayingBgm) {
        stopBgm();
      }
    },
    async unlock() {
      const a = ac();
      if (a && a.state === 'suspended') {
        try { await a.resume(); } catch (e) {}
      }
      initBgmNodes();
      if (bgmEnabled && !isPlayingBgm) startBgm();
    },
    startBgm,
    stopBgm,
    select() {
      vibrate(12);
      sfxSet().select();
    },
    match(combo) {
      vibrate([18, 40, 24]);
      sfxSet().match(combo);
    },
    fail() {
      vibrate(45);
      sfxSet().fail();
    },
    shuffle() {
      vibrate([15, 30, 15, 30, 20]);
      sfxSet().shuffle();
    },
    hint() {
      vibrate(20);
      sfxSet().hint();
    },
    clear() {
      vibrate([50, 60, 50, 60, 120]);
      sfxSet().clear();
    },
    _debug: {
      noteHz,
      compileTrack,
      compileArp,
      TRACKS,
      SFX,
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Sound;
  else root.ShisenSound = Sound;
})(typeof window !== 'undefined' ? window : globalThis);
