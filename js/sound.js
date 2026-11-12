/**
 * sound.js — Web Audio API 기반 효과음 (외부 파일 없음)
 */
(function (root) {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** 마림바 느낌의 짧은 톤 */
  function tone(freq, start, dur, opts) {
    const a = ac();
    if (!a || !enabled) return;
    const o = opts || {};
    const t0 = a.currentTime + (start || 0);
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(o.vol || 0.18, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  const NOTE = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };
  const SCALE = [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.C6, NOTE.E6, NOTE.G6];

  function vibrate(ms) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  const Sound = {
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; },
    unlock() { ac(); },
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

  root.ShisenSound = Sound;
})(window);
