/**
 * sound.js — 테마별 Web Audio API 효과음 및 BGM 합성기
 * - fruit   : 과일 농장 — 톡톡 피치 마림바 & 도트 칩튠
 * - animal  : 동물 친구들 — 포근한 숲속 오르골 & 칼림바
 * - pokemon : 포켓몬 1세대 — 8비트 옐로우 팡파르 & 행진 칩튠 OST 느낌
 * - digimon : 디지몬 어드벤처 — 감성 오르골(뮤직박스) 발라드 OST & 디지바이스 SFX
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

  function playNoteOnTarget(a, target, freq, time, dur, type, vol, detune, attack) {
    if (!freq || !target) return;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, time);
    if (detune) osc.detune.setValueAtTime(detune, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol || 0.16, time + (attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.95);
    osc.connect(g).connect(target);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  /**
   * 실물 태엽 오르골(뮤직박스) 금속 빗살(Tine) 음색 합성:
   * - 빠른 타격음(attack 3ms) + 맑은 사인파 기본음 + 2배/3배 금속 배음의 긴 여운
   */
  function playMusicBoxTine(a, target, freq, time, ringSec, vol, isMelody) {
    if (!freq || !target) return;
    // 기본음 (따뜻하고 영롱한 순수 사인파)
    playNoteOnTarget(a, target, freq, time, ringSec, 'sine', vol, 0, 0.003);
    // 오르골 특유의 은은한 옥타브 위 빗살 배음
    if (isMelody) {
      playNoteOnTarget(a, target, freq * 2, time, Math.min(0.45, ringSec * 0.45), 'sine', vol * 0.28, 0, 0.002);
      playNoteOnTarget(a, target, freq * 3, time, 0.14, 'triangle', vol * 0.08, 0, 0.002);
    } else {
      playNoteOnTarget(a, target, freq * 2, time, Math.min(0.28, ringSec * 0.35), 'sine', vol * 0.18, 0, 0.003);
    }
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

  // 3) 포켓몬 1세대 (pokemon) — G 메이저 밝은 8비트 옐로우 팡파르·행진 OST 느낌 (128스텝, 16분음표 136 BPM)
  const POKEMON_MELODY = compileTrack([
    // Bar 1 (G): 쾌활한 타이틀 트럼펫 팡파르 호출
    'D5:2', 'G5:2', 'B5:2', 'D6:4', 'B5:2', 'G5:2', 'A5:2',
    // Bar 2 (C -> D): 산뜻한 응답 팡파르
    'E5:2', 'G5:2', 'C6:4', 'B5:2', 'A5:2', 'D6:4',
    // Bar 3 (G): 피카츄를 연상시키는 톡톡 튀는 마스코트 스킵
    'B5:2', 'G5', 'A5', 'B5:2', 'D6:2', 'G6:3', 'E6', 'D6:2', 'B5:2',
    // Bar 4 (Am -> D7): 경쾌한 턴어라운드
    'C6:2', 'A5:2', 'F#5:2', 'A5:2', 'G5:3', 'F#5', 'D5:4',
    // Bar 5 (G -> Em): 햇살 가득 행진 B파트
    'G5:2', 'A5:2', 'B5:2', 'D6:2', 'E6:2', 'D6:2', 'B5:4',
    // Bar 6 (C -> G): 신나는 스텝 상승
    'C6:2', 'E6:2', 'G6:2', 'E6:2', 'D6:2', 'B5:2', 'G5:4',
    // Bar 7 (Am -> D7): 화려한 피날레 빌드업
    'A5:2', 'B5:2', 'C6:2', 'E6:2', 'D6:2', 'C6:2', 'B5:2', 'A5:2',
    // Bar 8 (G): 밝은 옐로우 팡파르 마무리 + 픽업
    'G5:3', 'D5', 'G5:2', 'B5:2', 'G5:4', '.', '.', 'D5:2',
  ]);
  const POKEMON_HARM_BARS = compileTrack([
    // Bar 1 (16)
    'B4:2', 'D5:2', 'G5:2', 'B5:4', 'G5:2', 'D5:2', 'F#5:2',
    // Bar 2 (16)
    'C5:2', 'E5:2', 'G5:4', 'G5:2', 'F#5:2', 'A5:4',
    // Bar 3 (16)
    'G5:2', 'D5:2', 'G5:2', 'B5:2', 'D6:3', 'C6', 'B5:2', 'G5:2',
    // Bar 4 (16)
    'A5:2', 'E5:2', 'D5:2', 'F#5:2', 'E5:3', 'D5', 'A4:4',
    // Bar 5 (16)
    'G4', 'B4', 'D5', 'B4', 'G4', 'B4', 'D5', 'B4',
    'E4', 'G4', 'B4', 'G4', 'E4', 'G4', 'B4', 'G4',
    // Bar 6 (16)
    'C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G4', 'E4',
    'G4', 'B4', 'D5', 'B4', 'G4', 'B4', 'D5', 'B4',
    // Bar 7 (16)
    'A4', 'C5', 'E5', 'C5', 'A4', 'C5', 'E5', 'C5',
    'D4', 'F#4', 'A4', 'F#4', 'D4', 'F#4', 'A4', 'D5',
    // Bar 8 (16)
    'G4', 'B4', 'D5', 'B4', 'G4', 'B4', 'D5', 'B4',
    'G5:4', '.', '.', 'B4:2',
  ]);
  const POKEMON_BASS = compileTrack([
    'G2:2', 'G3:2', 'D3:2', 'G3:2', 'G2:2', 'D3:2', 'G3:2', 'D3:2',
    'C3:2', 'C4:2', 'G3:2', 'C4:2', 'D3:2', 'A3:2', 'D4:2', 'A3:2',
    'G2:2', 'G3:2', 'D3:2', 'G3:2', 'B2:2', 'B3:2', 'G3:2', 'D3:2',
    'A2:2', 'A3:2', 'D3:2', 'D4:2', 'G2:2', 'D3:2', 'G3:2', 'D3:2',
    'G2:2', 'G3:2', 'D3:2', 'G3:2', 'E2:2', 'E3:2', 'B2:2', 'E3:2',
    'C3:2', 'C4:2', 'G3:2', 'C4:2', 'G2:2', 'G3:2', 'D3:2', 'G3:2',
    'A2:2', 'A3:2', 'E3:2', 'A3:2', 'D3:2', 'D4:2', 'A3:2', 'D4:2',
    'G2:2', 'D3:2', 'G3:2', 'D3:2', 'G2:4', 'D3:2', 'D2:2',
  ]);

  // 4) 디지몬 어드벤처 (digimon) — 감성 오르골(뮤직박스) 발라드 버전 (128스텝, Em→C→D→G 서정적 진행)
  const DIGIMON_MELODY = compileTrack([
    // 1~4마디: 서정적인 오르골 메인 주제 (각 8스텝)
    'B4', 'E5', 'G5:2', 'F#5:2', 'E5:2',
    'D5', 'E5', 'G5:2', 'F#5:4',
    'B4', 'D5', 'G5:2', 'A5:2', 'B5:2',
    'A5:2', 'G5:2', 'F#5:4',
    // 5~8마디: 따뜻한 화답과 숨고르기
    'B4', 'E5', 'G5:2', 'F#5:2', 'E5:2',
    'D5', 'E5', 'A5:2', 'G5:4',
    'A5', 'B5', 'C6:2', 'B5:2', 'A5:2',
    'G5:2', 'F#5:2', 'E5:4',
    // 9~12마디: 벅차오르는 후렴 오르골 고음부
    'E6:3', 'D6', 'C6:2', 'B5:2',
    'D6:3', 'C6', 'B5:2', 'G5:2',
    'C6:2', 'B5', 'A5', 'B5:2', 'G5:2',
    'A5:3', 'B5', 'A5:4',
    // 13~16마디: 여운 깊은 클라이맥스 & 잔잔한 마무리
    'E6:3', 'D6', 'C6:2', 'B5:2',
    'D6:3', 'E6', 'B5:4',
    'C6:2', 'B5', 'A5', 'G5:2', 'F#5:2',
    'E5:6', '.', '.',
  ]);
  const DIGIMON_COMB_ARP = compileTrack([
    'E3', 'B3', 'E4', 'G4', 'B4', 'G4', 'E4', 'B3',
    'C3', 'G3', 'C4', 'E4', 'D3', 'A3', 'D4', 'F#4',
    'G3', 'D4', 'G4', 'B4', 'F#3', 'D4', 'F#4', 'A4',
    'E3', 'B3', 'E4', 'G4', 'B3', 'F#4', 'B4', 'D#4',
    'E3', 'B3', 'E4', 'G4', 'B4', 'G4', 'E4', 'B3',
    'C3', 'G3', 'C4', 'E4', 'G3', 'D4', 'G4', 'B4',
    'A3', 'E4', 'A4', 'C5', 'D3', 'A3', 'D4', 'F#4',
    'E3', 'B3', 'E4', 'G4', 'B4', 'E4', 'B3', 'E4',
    'C3', 'G3', 'C4', 'E4', 'G4', 'E4', 'C4', 'G3',
    'D3', 'A3', 'D4', 'F#4', 'G3', 'D4', 'G4', 'B4',
    'A3', 'E4', 'A4', 'C5', 'B3', 'F#4', 'B4', 'D5',
    'A3', 'E4', 'C5', 'E4', 'D3', 'A3', 'D4', 'F#4',
    'C3', 'G3', 'C4', 'E4', 'G4', 'E4', 'C4', 'G3',
    'D3', 'A3', 'D4', 'F#4', 'E3', 'B3', 'E4', 'G4',
    'C3', 'G3', 'E4', 'C4', 'D3', 'A3', 'F#4', 'D4',
    'E3', 'B3', 'E4', 'G4', 'B4', 'G4', 'E4', 'B3',
  ]);
  const DIGIMON_BASS = compileTrack([
    'E2:4', 'E3:4', 'C3:4', 'D3:4', 'G2:4', 'F#2:4', 'E2:4', 'B2:4',
    'E2:4', 'E3:4', 'C3:4', 'G2:4', 'A2:4', 'D3:4', 'E2:4', 'E3:4',
    'C3:4', 'G3:4', 'D3:4', 'G2:4', 'A2:4', 'B2:4', 'A2:4', 'D3:4',
    'C3:4', 'G3:4', 'D3:4', 'E3:4', 'C3:4', 'D3:4', 'E2:8',
  ]);

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
      stepSec: 60 / 136 / 4,
      cutoff: 4900,
      playStep(a, target, step, time) {
        const s = step % POKEMON_MELODY.length;
        const m = POKEMON_MELODY[s];
        if (m) {
          // 8비트 트럼펫 팡파르 리드 사각파
          playNoteOnTarget(a, target, m.freq, time, this.stepSec * m.dur * 0.86, 'square', 0.155);
        }
        const h = POKEMON_HARM_BARS[s];
        if (h) {
          // 화음/아르페지오 2nd 펄스 채널
          playNoteOnTarget(a, target, h.freq, time, this.stepSec * h.dur * 0.72, 'square', 0.055);
        }
        const b = POKEMON_BASS[s];
        if (b) {
          // 탄력 있는 게임보이 웨이브 행진 베이스
          playNoteOnTarget(a, target, b.freq, time, this.stepSec * b.dur * 0.85, 'triangle', 0.26);
        }
        // 행진곡 스네어 노이즈 리듬 (턴어라운드 마디엔 작은 드럼 롤)
        const barStep = s % 16;
        const barIdx = Math.floor(s / 16);
        if (barStep === 4 || barStep === 12) {
          playNoiseHit(a, target, time, 0.065, 2000, 'bandpass', 0.055);
        } else if ((barIdx === 3 || barIdx === 7) && (barStep === 14 || barStep === 15)) {
          playNoiseHit(a, target, time, 0.045, 2400, 'bandpass', 0.045);
        } else if (barStep % 4 === 2) {
          playNoiseHit(a, target, time, 0.028, 7000, 'highpass', 0.028);
        }
      },
    },
    digimon: {
      length: DIGIMON_MELODY.length,
      stepSec: 0.24,
      cutoff: 5400,
      playStep(a, target, step, time) {
        const s = step % DIGIMON_MELODY.length;
        const m = DIGIMON_MELODY[s];
        if (m) {
          // 메인 오르골 빗살: 여운이 길게 남는 맑은 벨 톤
          const ring = Math.max(0.68, this.stepSec * m.dur * 1.15);
          playMusicBoxTine(a, target, m.freq, time, ring, 0.23, true);
        }
        const arp = DIGIMON_COMB_ARP[s];
        if (arp) {
          // 잔잔히 흐르는 오르골 태엽 반주 아르페지오
          playMusicBoxTine(a, target, arp.freq, time, 0.56, 0.075, false);
        }
        const b = DIGIMON_BASS[s];
        if (b) {
          // 저음부 오르골 나무 공명음
          playNoteOnTarget(a, target, b.freq, time, 0.9, 'sine', 0.14, 0, 0.008);
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
  const DIGIMON_SCALE = ['E5', 'F#5', 'G5', 'B5', 'D6', 'E6', 'G6'].map(noteHz);

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
        // 밝은 8비트 옐로우 마스코트 커서 삐빅!
        tone(noteHz('D6'), 0, 0.032, { type: 'square', vol: 0.1 });
        tone(noteHz('G6'), 0.028, 0.055, { type: 'square', vol: 0.11 });
      },
      match(combo) {
        // 경쾌한 8비트 전격 스파클 G 메이저 아르페지오
        const base = Math.min(Math.max(0, (combo || 1) - 1), POKEMON_SCALE.length - 4);
        tone(POKEMON_SCALE[base], 0, 0.06, { type: 'square', vol: 0.12 });
        tone(POKEMON_SCALE[base + 1], 0.048, 0.06, { type: 'square', vol: 0.12 });
        tone(POKEMON_SCALE[base + 2], 0.096, 0.075, { type: 'square', vol: 0.13 });
        tone(POKEMON_SCALE[base + 3], 0.145, 0.26, { type: 'triangle', vol: 0.18 });
      },
      fail() {
        tone(noteHz('D3'), 0, 0.08, { type: 'square', vol: 0.1 });
        tone(noteHz('G2'), 0.07, 0.14, { type: 'square', vol: 0.1 });
      },
      shuffle() {
        ['D5', 'G5', 'B5', 'D6', 'B5', 'G6'].forEach((n, i) => {
          tone(noteHz(n), i * 0.042, 0.075, { type: 'square', vol: 0.11 });
        });
      },
      hint() {
        // 옐로우 마스코트 반짝 전격 트릴 핑!
        tone(noteHz('G6'), 0, 0.05, { type: 'square', vol: 0.1 });
        tone(noteHz('D6'), 0.05, 0.055, { type: 'square', vol: 0.1 });
        tone(noteHz('B6'), 0.105, 0.16, { type: 'square', vol: 0.11 });
      },
      clear() {
        // 옐로우 팡파르 빅토리! (G 메이저 8비트)
        const notes = [
          ['D5', 0, 0.09],
          ['G5', 0.085, 0.09],
          ['B5', 0.17, 0.09],
          ['D6', 0.255, 0.22],
          ['B5', 0.44, 0.11],
          ['G6', 0.55, 0.5],
        ];
        notes.forEach(([n, at, dur]) => {
          tone(noteHz(n), at, dur, { type: 'square', vol: 0.13 });
          tone(noteHz(n) * 0.5, at, dur, { type: 'triangle', vol: 0.15 });
        });
      },
    },
    digimon: {
      select() {
        // 맑은 오르골 빗살 + 디지바이스 유리알 핑
        tone(noteHz('B5'), 0, 0.16, { type: 'sine', vol: 0.15, attack: 0.003 });
        tone(noteHz('B6'), 0, 0.08, { type: 'sine', vol: 0.05, attack: 0.002 });
      },
      match(combo) {
        // 감성 오르골 아르페지오 하모니 울림
        const base = Math.min(Math.max(0, (combo || 1) - 1), DIGIMON_SCALE.length - 4);
        [0, 1, 2, 3].forEach(idx => {
          const f = DIGIMON_SCALE[base + idx];
          tone(f, idx * 0.055, 0.42, { type: 'sine', vol: 0.15, attack: 0.003 });
          tone(f * 2, idx * 0.055, 0.18, { type: 'sine', vol: 0.045, attack: 0.002 });
        });
      },
      fail() {
        // 오르골 빗살이 부드럽게 잦아드는 듯한 저음 2음
        tone(noteHz('D4'), 0, 0.14, { type: 'sine', vol: 0.14, attack: 0.004 });
        tone(noteHz('A3'), 0.08, 0.2, { type: 'sine', vol: 0.14, attack: 0.004 });
      },
      shuffle() {
        // 태엽 감기듯 반짝이는 오르골 상승 스케일
        ['E5', 'F#5', 'G5', 'B5', 'D6', 'E6', 'G6'].forEach((n, i) => {
          const f = noteHz(n);
          tone(f, i * 0.048, 0.34, { type: 'sine', vol: 0.13, attack: 0.003 });
          tone(f * 2, i * 0.048, 0.14, { type: 'sine', vol: 0.035, attack: 0.002 });
        });
      },
      hint() {
        // 영롱한 오르골 에코 차임
        tone(noteHz('B5'), 0, 0.32, { type: 'sine', vol: 0.14, attack: 0.003 });
        tone(noteHz('F#6'), 0.075, 0.38, { type: 'sine', vol: 0.13, attack: 0.003 });
        tone(noteHz('B6'), 0.15, 0.45, { type: 'sine', vol: 0.1, attack: 0.003 });
      },
      clear() {
        // 벅차오르는 오르골 발라드 엔딩 화음
        const notes = [
          ['E5', 0, 0.45],
          ['B5', 0.1, 0.45],
          ['E6', 0.2, 0.5],
          ['F#6', 0.32, 0.5],
          ['G6', 0.44, 0.85],
        ];
        notes.forEach(([n, at, dur]) => {
          const f = noteHz(n);
          tone(f, at, dur, { type: 'sine', vol: 0.16, attack: 0.003 });
          tone(f * 2, at, Math.min(0.32, dur * 0.45), { type: 'sine', vol: 0.05, attack: 0.002 });
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
      POKEMON_MELODY,
      POKEMON_HARM_BARS,
      POKEMON_BASS,
      DIGIMON_MELODY,
      DIGIMON_COMB_ARP,
      DIGIMON_BASS,
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Sound;
  else root.ShisenSound = Sound;
})(typeof window !== 'undefined' ? window : globalThis);
