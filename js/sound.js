/**
 * sound.js — Web Audio API 기반 효과음 및 8비트 칩튠(도트) BGM 합성기
 */
(function (root) {
  let ctx = null;
  let sfxEnabled = true;
  let bgmEnabled = true;

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

  /** 마림바/실로폰 느낌의 짧은 효과음 톤 */
  function tone(freq, start, dur, opts) {
    const a = ac();
    if (!a || !sfxEnabled) return;
    const o = opts || {};
    const t0 = a.currentTime + (start || 0);
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(o.vol || 0.22, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  const NOTE = {
    // 3옥타브 (베이스)
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    // 4옥타브
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    // 5옥타브 (멜로디)
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    // 6옥타브
    C6: 1046.5, D6: 1174.7, E6: 1318.5, G6: 1568.0,
  };
  const SCALE = [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.C6, NOTE.E6, NOTE.G6];

  function vibrate(ms) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  // =========================================================================
  // 8비트 칩튠 (도트 감성) BGM 엔진
  // =========================================================================
  const TEMPO = 118; // BPM
  const STEP = 60 / TEMPO / 2; // 16분음표 길이 (~0.127초)

  // 16비트 단위 멜로디 (C 메이저 경쾌한 테마, 0 = 쉼표)
  const MELODY = [
    NOTE.E5, 0, NOTE.G5, NOTE.C6,  NOTE.E6, 0, NOTE.D6, 0,
    NOTE.C6, NOTE.A5, NOTE.G5, 0,  NOTE.E5, NOTE.G5, NOTE.A5, 0,

    NOTE.F5, 0, NOTE.A5, NOTE.C6,  NOTE.D6, 0, NOTE.C6, 0,
    NOTE.B5, NOTE.G5, NOTE.A5, NOTE.B5, NOTE.C6, 0, 0, 0,

    NOTE.E5, NOTE.G5, NOTE.E5, NOTE.D5, NOTE.C5, 0, NOTE.E5, NOTE.G5,
    NOTE.A5, NOTE.C6, NOTE.A5, NOTE.G5, NOTE.E5, 0, NOTE.G5, 0,

    NOTE.D5, NOTE.E5, NOTE.F5, NOTE.A5, NOTE.G5, NOTE.E5, NOTE.D5, 0,
    NOTE.C5, NOTE.E5, NOTE.G5, NOTE.D5, NOTE.C5, 0, 0, 0,
  ];

  // 8분음표 베이스라인
  const BASS = [
    NOTE.C3, NOTE.G3, NOTE.C4, NOTE.G3,  NOTE.A3, NOTE.E3, NOTE.A3, NOTE.E3,
    NOTE.F3, NOTE.C3, NOTE.F3, NOTE.C3,  NOTE.G3, NOTE.D3, NOTE.G3, NOTE.B3,
    NOTE.C3, NOTE.G3, NOTE.C4, NOTE.G3,  NOTE.A3, NOTE.E3, NOTE.A3, NOTE.E3,
    NOTE.F3, NOTE.A3, NOTE.G3, NOTE.B3,  NOTE.C3, NOTE.G3, NOTE.C4, NOTE.C3,
  ];

  let bgmMasterGain = null;
  let bgmTimer = null;
  let bgmNextTime = 0;
  let bgmStep = 0;
  let isPlayingBgm = false;

  function initBgmNodes() {
    const a = ac();
    if (!a) return;
    if (!bgmMasterGain) {
      bgmMasterGain = a.createGain();
      // 스마트폰 스피커에서도 똑똑히 들리도록 게인 상향 (0.08 -> 0.22)
      bgmMasterGain.gain.setValueAtTime(bgmEnabled ? 0.22 : 0.0001, a.currentTime);
      bgmMasterGain.connect(a.destination);
    }
  }

  function play8bitChirp(freq, time, dur, type, vol) {
    const a = ac();
    if (!a || !freq || !bgmMasterGain) return;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(vol || 0.18, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.95);
    osc.connect(g).connect(bgmMasterGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  function scheduleBgm() {
    const a = ac();
    if (!a || !isPlayingBgm) return;
    // 과거 시간으로 밀렸을 경우 즉시 현재 시간으로 보정
    if (bgmNextTime < a.currentTime) {
      bgmNextTime = a.currentTime + 0.02;
    }
    // 0.3초 앞서서 버퍼 스케줄링
    while (bgmNextTime < a.currentTime + 0.3) {
      const melodyFreq = MELODY[bgmStep % MELODY.length];
      if (melodyFreq) {
        // 리드 채널: 8비트 사각파
        play8bitChirp(melodyFreq, bgmNextTime, STEP * 0.85, 'square', 0.2);
      }
      // 베이스 채널: 삼각파
      if (bgmStep % 2 === 0) {
        const bassIdx = Math.floor((bgmStep / 2) % BASS.length);
        const bassFreq = BASS[bassIdx];
        if (bassFreq) {
          play8bitChirp(bassFreq, bgmNextTime, STEP * 1.7, 'triangle', 0.28);
        }
      }
      bgmNextTime += STEP;
      bgmStep++;
    }
    bgmTimer = setTimeout(scheduleBgm, 70);
  }

  function startBgm() {
    const a = ac();
    if (!a || isPlayingBgm) return;
    initBgmNodes();
    isPlayingBgm = true;
    bgmNextTime = a.currentTime + 0.05;
    bgmStep = 0;
    scheduleBgm();
  }

  function stopBgm() {
    isPlayingBgm = false;
    clearTimeout(bgmTimer);
    bgmTimer = null;
  }

  const Sound = {
    get enabled() { return sfxEnabled; },
    set enabled(v) { sfxEnabled = !!v; },
    get bgmEnabled() { return bgmEnabled; },
    set bgmEnabled(v) {
      bgmEnabled = !!v;
      if (bgmMasterGain && ctx) {
        bgmMasterGain.gain.setValueAtTime(bgmEnabled ? 0.22 : 0.0001, ctx.currentTime);
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
      tone(NOTE.A5, 0, 0.12, { type: 'triangle', vol: 0.12 });
    },
    match(combo) {
      vibrate([18, 40, 24]);
      const base = Math.min(combo - 1, SCALE.length - 3);
      tone(SCALE[base], 0, 0.25, { type: 'triangle' });
      tone(SCALE[base + 1], 0.07, 0.25, { type: 'triangle' });
      tone(SCALE[base + 2], 0.14, 0.35, { type: 'triangle' });
    },
    fail() {
      vibrate(45);
      tone(330, 0, 0.12, { type: 'sine', vol: 0.12 });
      tone(277, 0.08, 0.16, { type: 'sine', vol: 0.12 });
    },
    shuffle() {
      vibrate([15, 30, 15, 30, 20]);
      [0, 1, 2, 3, 4].forEach(i => tone(SCALE[(i * 3) % 6], i * 0.05, 0.12, { type: 'triangle', vol: 0.1 }));
    },
    hint() {
      vibrate(20);
      tone(NOTE.E6, 0, 0.2, { type: 'sine', vol: 0.12 });
      tone(NOTE.G6, 0.1, 0.25, { type: 'sine', vol: 0.1 });
    },
    clear() {
      vibrate([50, 60, 50, 60, 120]);
      const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.C6, NOTE.E6];
      seq.forEach((f, i) => tone(f, i * 0.12, 0.4, { type: 'triangle', vol: 0.16 }));
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Sound;
  else root.ShisenSound = Sound;
})(typeof window !== 'undefined' ? window : globalThis);
