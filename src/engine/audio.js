// Komplett synthetisierter Sound: Effekte, Brabbel-Stimmen (wie bei N64-
// Plattformern üblich) und ein kleiner Musik-Sequencer mit eigenen Melodien.

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteFreq(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return 0;
  let s = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = 12 * (+m[3] + 1) + s;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
const midiFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function chordNotes(name) {
  const m = /^([A-G])([#b]?)(m?)(7?)$/.exec(name);
  if (!m) return null;
  const root = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const iv = m[3] ? [0, 3, 7] : [0, 4, 7];
  if (m[4]) iv.push(10);
  return { root, iv };
}

// ---------- Song-Beschreibung ----------
// Melodien: "E5:2 G5:2 .:4" (Note:Länge in Sechzehnteln, "." = Pause)
function melody(str, octShift = 0) {
  const ev = [];
  let step = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [n, l] = tok.split(':');
    const len = +(l || 1);
    if (n !== '.') {
      let f = noteFreq(n);
      if (octShift) f *= Math.pow(2, octShift);
      ev.push({ step, f, len });
    }
    step += len;
  }
  return { ev, length: step };
}

function drums(str) {
  const ev = [];
  let step = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [n, l] = tok.split(':');
    const len = +(l || 1);
    if (n !== '.') for (const d of n) ev.push({ step, drum: d, len: 1 });
    step += len;
  }
  return { ev, length: step };
}

// Begleitung aus Akkordfolge generieren. chords: "C F G C" (je Takt, "F/G" = halber Takt)
function accomp(chords, style, baseOct = 2) {
  const ev = [];
  const bars = chords.trim().split(/\s+/);
  bars.forEach((bar, bi) => {
    const parts = bar.split('/');
    parts.forEach((cn, pi) => {
      const c = chordNotes(cn);
      const len = 16 / parts.length;
      const start = bi * 16 + pi * len;
      const bass = (o, deg = 0) => midiFreq(12 * (baseOct + 1 + o) + c.root + (deg ? c.iv[deg] : 0));
      const add = (s, f, l) => { if (s < start + len) ev.push({ step: s, f, len: l }); };
      if (style === 'oompah') {
        add(start, bass(0), 3);
        add(start + 8, bass(0, 2), 3);
      } else if (style === 'stabs') {
        for (const s of [4, 12]) for (const d of [0, 1, 2]) add(start + s, bass(2, d), 1);
      } else if (style === 'calypso') {
        [[0, 0, 3], [3, 0, 3], [6, 2, 2], [8, 0, 3], [11, 0, 3], [14, 2, 2]].forEach(([s, d, l]) =>
          add(start + s, bass(0, d), l));
      } else if (style === 'pump') {
        for (let s = 0; s < len; s += 2) add(start + s, bass(0), 1);
      } else if (style === 'arp') {
        const seq = [0, 1, 2, 1];
        for (let s = 0; s < len; s += 2) add(start + s, bass(2, seq[(s / 2) % 4]), 2);
      } else if (style === 'walk') {
        const seq = [0, 2, 0, 1];
        for (let s = 0; s < len; s += 4) add(start + s, bass(0, seq[(s / 4) % 4]), 3);
      } else if (style === 'pad') {
        for (const d of [0, 1, 2]) add(start, bass(2, d), len);
      }
    });
  });
  return { ev, length: bars.length * 16 };
}

const SONGS = {
  hub: () => ({
    bpm: 112, swing: 0.12,
    tracks: [
      ['marimba', melody(`G4:2 C5:2 E5:2 G5:2 E5:2 C5:2 D5:2 E5:2  F5:4 A5:2 F5:2 C5:4 .:4
        D5:2 E5:2 F5:2 G5:2 B4:4 D5:4  C5:6 .:2 G4:2 A4:2 B4:2 .:2
        E5:2 G5:2 C6:4 B5:2 A5:2 G5:4  A5:3 G5:1 E5:4 C5:4 E5:4
        F5:2 A5:2 C6:4 B5:2 G5:2 D5:4  C6:8 .:8`), 0.5],
      ['tuba', accomp('C F G C C Am F/G C', 'oompah'), 0.55],
      ['pluck', accomp('C F G C C Am F/G C', 'stabs'), 0.18],
      ['drum', drums('k:4 h:4 k:2 k:2 h:4'), 0.4],
    ],
  }),
  pilz: () => ({
    bpm: 98, swing: 0.2,
    tracks: [
      ['flute', melody(`D5:3 F5:1 A5:4 G5:2 F5:2 E5:4  C5:3 E5:1 G5:4 F5:2 E5:2 D5:4
        Bb4:3 D5:1 F5:4 E5:2 D5:2 C5:2 D5:2  C#5:4 E5:4 A4:8
        A5:2 .:2 A5:2 G5:2 F5:2 G5:2 A5:4  G5:2 .:2 G5:2 F5:2 E5:2 F5:2 G5:4
        F5:2 E5:2 D5:2 F5:2 A5:4 Bb5:4  A5:4 G5:2 E5:2 C#5:4 A4:4`), 0.4],
      ['bass', accomp('Dm C Bb A Dm C Bb A', 'walk'), 0.6],
      ['pluck', accomp('Dm C Bb A Dm C Bb A', 'arp'), 0.14],
      ['drum', drums('k:4 c:2 c:2 s:4 c:2 c:2'), 0.3],
    ],
  }),
  beach: () => ({
    bpm: 124, swing: 0,
    tracks: [
      ['steel', melody(`B4:2 D5:1 G5:3 F#5:2 G5:2 A5:2 B5:4  C6:3 B5:1 A5:2 G5:2 E5:4 .:4
        F#5:2 A5:1 D6:3 C6:2 B5:2 A5:2 F#5:4  G5:6 D5:2 B4:2 D5:2 G5:4
        D6:2 B5:2 G5:2 B5:2 D6:3 C6:1 B5:4  E6:2 C6:2 G5:2 C6:2 E6:4 D6:4
        C6:2 B5:2 A5:2 F#5:2 A5:2 D6:2 C6:2 A5:2  G5:8 .:8`, -1), 0.5],
      ['bass', accomp('G C D G G C D G', 'calypso'), 0.6],
      ['marimba', accomp('G C D G G C D G', 'stabs'), 0.16],
      ['drum', drums('k:3 c:1 c:2 s:2 k:2 c:2 s:2 c:2'), 0.35],
    ],
  }),
  boss: () => ({
    bpm: 148, swing: 0,
    tracks: [
      ['lead', melody(`E5:2 .:1 E5:1 G5:2 B5:2 A5:2 G5:2 F#5:2 G5:2  E5:4 C5:4 E5:2 G5:2 C6:4
        D5:2 .:1 D5:1 F#5:2 A5:2 G5:2 F#5:2 E5:2 F#5:2  D#5:4 F#5:4 B5:8`), 0.32],
      ['tuba', accomp('Em C D B', 'pump'), 0.55],
      ['pad', accomp('Em C D B', 'pad', 1), 0.1],
      ['drum', drums('k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:2'), 0.45],
    ],
  }),
  title: () => ({
    bpm: 96, swing: 0.15,
    tracks: [
      ['pluck', melody(`G4:2 C5:2 E5:2 G5:2 E5:2 C5:2 D5:2 E5:2  F5:4 A5:2 F5:2 C5:4 .:4
        D5:2 E5:2 F5:2 G5:2 B4:4 D5:4  C5:6 .:2 G4:2 A4:2 B4:2 .:2`), 0.4],
      ['bass', accomp('C F G C', 'walk'), 0.5],
      ['pad', accomp('C F G C', 'pad', 1), 0.08],
    ],
  }),
  intro: () => ({
    bpm: 80, swing: 0,
    tracks: [
      ['flute', melody(`E5:4 D5:4 B4:8  C5:4 B4:4 G4:8  A4:4 B4:4 C5:4 D5:4  B4:16`), 0.35],
      ['pad', accomp('Em C Am B', 'pad', 1), 0.12],
      ['bass', accomp('Em C Am B', 'walk'), 0.4],
    ],
  }),
  victory: () => ({
    bpm: 120, swing: 0,
    tracks: [
      ['lead', melody(`C5:2 E5:2 G5:2 C6:6 .:4  A5:2 C6:2 F6:4 E6:2 D6:2 C6:4
        B5:2 C6:2 D6:4 G5:4 B5:4  C6:12 .:4`), 0.3],
      ['marimba', melody(`C5:2 E5:2 G5:2 C6:6 .:4  A5:2 C6:2 F6:4 E6:2 D6:2 C6:4
        B5:2 C6:2 D6:4 G5:4 B5:4  C6:12 .:4`, -1), 0.35],
      ['tuba', accomp('C F G C', 'oompah'), 0.5],
      ['drum', drums('k:4 s:4 k:4 s:2 s:2'), 0.4],
    ],
  }),
};

// Stimmen der Figuren (Brabbel-Sprache)
const VOICES = {
  bruno: { base: 150, type: 'sawtooth', spread: 0.25, formant: 900 },
  kiki: { base: 620, type: 'square', spread: 0.35, formant: 2400 },
  tilo: { base: 200, type: 'triangle', spread: 0.15, formant: 1000 },
  koenig: { base: 105, type: 'sawtooth', spread: 0.35, formant: 600 },
  pilz: { base: 520, type: 'square', spread: 0.25, formant: 2000 },
  lotti: { base: 380, type: 'triangle', spread: 0.3, formant: 1600 },
  igel: { base: 420, type: 'square', spread: 0.25, formant: 1800 },
  stupsi: { base: 700, type: 'square', spread: 0.3, formant: 2600 },
  eiche: { base: 70, type: 'sawtooth', spread: 0.12, formant: 500 },
  kapitaen: { base: 150, type: 'sawtooth', spread: 0.3, formant: 900 },
  knack: { base: 180, type: 'square', spread: 0.3, formant: 1000 },
  stein: { base: 300, type: 'sine', spread: 0.1, formant: 1400 },
  default: { base: 300, type: 'square', spread: 0.3, formant: 1500 },
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.6;
    this.sfxVol = 0.8;
    this.song = null;
    this.songId = null;
    this.duck = 1;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVol * 0.5;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.timer = setInterval(() => this.tick(), 25);
      if (this.pendingSong) this.playMusic(this.pendingSong);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolumes(music, sfx) {
    this.musicVol = music;
    this.sfxVol = sfx;
    if (this.ctx) {
      this.musicGain.gain.setTargetAtTime(music * 0.5 * this.duck, this.ctx.currentTime, 0.05);
      this.sfxGain.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
    }
  }

  // Musik kurz leiser (z.B. für Fanfaren)
  duckMusic(sec) {
    if (!this.ctx) return;
    const g = this.musicGain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(this.musicVol * 0.08, t, 0.05);
    g.setTargetAtTime(this.musicVol * 0.5, t + sec, 0.4);
  }

  // ---------- Grundbausteine ----------
  osc(type, f0, f1, t, dur, vol, dest, { attack = 0.005, curve = 'exp', filter, q = 1, release } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) {
      if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      else o.frequency.linearRampToValueAtTime(f1, t + dur);
    }
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (release ?? 0));
    let node = o;
    if (filter) {
      const fl = c.createBiquadFilter();
      fl.type = filter.type || 'lowpass';
      fl.frequency.value = filter.f;
      fl.Q.value = q;
      o.connect(fl);
      node = fl;
    }
    node.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + (release ?? 0) + 0.05);
    return o;
  }

  noise(t, dur, vol, dest, { type = 'bandpass', f = 1000, f1, q = 1, attack = 0.002 } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    s.playbackRate.value = 1;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    fl.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl);
    fl.connect(g);
    g.connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  // ---------- Soundeffekte ----------
  play(name, arg = 0) {
    if (!this.ctx || this.sfxVol <= 0) return;
    const t = this.ctx.currentTime + 0.005, d = this.sfxGain;
    switch (name) {
      case 'jump':
        this.osc('square', 260, 520, t, 0.13, 0.12, d, { filter: { f: 2200 } });
        this.osc('sawtooth', 180, 240, t, 0.08, 0.08, d, { filter: { f: 900 } });
        break;
      case 'highjump':
        this.osc('square', 200, 900, t, 0.3, 0.12, d, { filter: { f: 2600 } });
        break;
      case 'flutter':
        for (let i = 0; i < 6; i++) this.noise(t + i * 0.075, 0.06, 0.18, d, { f: 1400, q: 2 });
        this.osc('square', 1300, 1700, t, 0.08, 0.05, d);
        break;
      case 'land':
        this.noise(t, 0.08, 0.2, d, { type: 'lowpass', f: 400 });
        break;
      case 'roll':
        this.noise(t, 0.3, 0.2, d, { f: 600, f1: 2500, q: 3 });
        break;
      case 'peck':
        for (let i = 0; i < 4; i++) this.osc('square', 1900, 1500, t + i * 0.06, 0.04, 0.08, d);
        break;
      case 'poundStart':
        this.osc('sine', 500, 1400, t, 0.22, 0.12, d);
        break;
      case 'pound':
        this.noise(t, 0.35, 0.5, d, { type: 'lowpass', f: 500, f1: 80 });
        this.osc('sine', 110, 35, t, 0.35, 0.6, d);
        break;
      case 'berry': {
        const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
        const f = midiFreq(72 + scale[Math.min(arg, scale.length - 1)]);
        this.osc('sine', f, f, t, 0.25, 0.22, d);
        this.osc('sine', f * 4, f * 4, t, 0.08, 0.04, d);
        break;
      }
      case 'shard': {
        const notes = [60, 64, 67, 72, 67, 72, 76, 79];
        notes.forEach((n, i) => {
          const tt = t + i * 0.1 + (i >= 4 ? 0.15 : 0);
          this.osc('square', midiFreq(n), midiFreq(n), tt, i === 7 ? 0.9 : 0.12, 0.1, d, { filter: { f: 3000 } });
          this.osc('triangle', midiFreq(n - 12), midiFreq(n - 12), tt, i === 7 ? 0.9 : 0.12, 0.2, d);
        });
        break;
      }
      case 'firefly':
        for (let i = 0; i < 5; i++) this.osc('sine', 1800 + i * 300, 2600 + i * 300, t + i * 0.05, 0.1, 0.06, d);
        break;
      case 'fireflyCall':
        this.osc('sine', 2200, 3000, t, 0.12, 0.05, d);
        this.osc('sine', 2600, 3400, t + 0.15, 0.12, 0.04, d);
        break;
      case 'hurt':
        this.osc('sawtooth', 420, 140, t, 0.35, 0.18, d, { filter: { f: 1500 } });
        this.noise(t, 0.15, 0.2, d, { f: 900 });
        break;
      case 'pop':
        this.osc('square', 700, 90, t, 0.18, 0.15, d, { filter: { f: 2000 } });
        this.noise(t, 0.12, 0.25, d, { f: 1500 });
        break;
      case 'hit':
        this.noise(t, 0.1, 0.35, d, { f: 1200, q: 0.7 });
        this.osc('square', 300, 150, t, 0.1, 0.1, d);
        break;
      case 'splash':
        this.noise(t, 0.4, 0.3, d, { f: 1800, f1: 500, q: 0.8 });
        break;
      case 'health':
        this.osc('sine', 880, 880, t, 0.12, 0.15, d);
        this.osc('sine', 1320, 1320, t + 0.1, 0.25, 0.15, d);
        break;
      case 'boing':
        this.osc('sine', 180, 720, t, 0.3, 0.3, d, { curve: 'exp' });
        this.osc('triangle', 360, 1440, t, 0.2, 0.08, d);
        break;
      case 'portal':
        this.noise(t, 0.8, 0.25, d, { f: 300, f1: 3000, q: 4 });
        [60, 64, 67, 71].forEach((n, i) => this.osc('triangle', midiFreq(n), midiFreq(n), t + i * 0.08, 0.6, 0.08, d));
        break;
      case 'learn': {
        [67, 71, 74, 79, 83, 86].forEach((n, i) =>
          this.osc('sine', midiFreq(n), midiFreq(n), t + i * 0.09, 0.5, 0.12, d));
        break;
      }
      case 'switch':
        this.osc('square', 400, 400, t, 0.06, 0.1, d);
        this.osc('square', 600, 600, t + 0.08, 0.1, 0.1, d);
        break;
      case 'chest':
        [72, 76, 79, 84].forEach((n, i) => this.osc('square', midiFreq(n), midiFreq(n), t + i * 0.07, 0.2, 0.07, d));
        break;
      case 'secret':
        [79, 78, 75, 69, 68, 76, 80, 84].forEach((n, i) =>
          this.osc('triangle', midiFreq(n), midiFreq(n), t + i * 0.11, 0.15, 0.15, d));
        break;
      case 'bosshit':
        this.osc('sawtooth', 300, 60, t, 0.5, 0.3, d, { filter: { f: 1200 } });
        this.noise(t, 0.3, 0.35, d, { f: 700 });
        break;
      case 'zap':
        this.osc('sawtooth', 1200, 200, t, 0.35, 0.12, d, { filter: { f: 3000 } });
        break;
      case 'croak': {
        // tiefes, knarziges "Quaaak"
        const o = this.osc('sawtooth', 190, 120, t, 0.55, 0.28, d, { filter: { f: 700 }, q: 4, curve: 'lin' });
        this.vibrato(o, t, 0.55, 22, 25);
        this.osc('square', 95, 70, t, 0.5, 0.12, d, { filter: { f: 400 } });
        break;
      }
      case 'coin':
        this.osc('sine', 1760, 1760, t, 0.18, 0.1, d);
        this.osc('sine', 2640, 2640, t + 0.05, 0.25, 0.08, d);
        break;
      case 'buy':
        [72, 76, 79, 84, 88].forEach((n, i) => this.osc('square', midiFreq(n), midiFreq(n), t + i * 0.06, 0.12, 0.08, d, { filter: { f: 3000 } }));
        break;
      case 'sneeze':
        this.noise(t, 0.35, 0.12, d, { f: 900, f1: 1800, q: 2, attack: 0.3 });
        this.noise(t + 0.4, 0.25, 0.5, d, { f: 3000, f1: 1200, q: 0.6 });
        this.osc('sawtooth', 300, 120, t + 0.4, 0.2, 0.15, d, { filter: { f: 1500 } });
        break;
      case 'menu':
        this.osc('square', 880, 880, t, 0.04, 0.06, d);
        break;
      case 'ok':
        this.osc('square', 660, 660, t, 0.05, 0.08, d);
        this.osc('square', 990, 990, t + 0.06, 0.08, 0.08, d);
        break;
      case 'back':
        this.osc('square', 660, 440, t, 0.1, 0.07, d);
        break;
      case 'bubble':
        this.osc('sine', 400 + Math.random() * 300, 900, t, 0.08, 0.06, d);
        break;
      case 'shatter':
        for (let i = 0; i < 10; i++) this.osc('sine', 2000 + Math.random() * 2500, 800, t + i * 0.03, 0.2, 0.05, d);
        this.noise(t, 0.6, 0.3, d, { f: 4000, q: 0.5 });
        break;
    }
  }

  // Ein "Brabbel"-Laut beim Tippen der Dialoge
  voice(who) {
    if (!this.ctx || this.sfxVol <= 0) return;
    const v = VOICES[who] || VOICES.default;
    const t = this.ctx.currentTime + 0.005;
    const f = v.base * (1 + (Math.random() - 0.5) * 2 * v.spread);
    const dur = 0.05 + Math.random() * 0.04;
    this.osc(v.type, f, f * (0.85 + Math.random() * 0.3), t, dur, 0.12, this.sfxGain, {
      filter: { type: 'bandpass', f: v.formant * (0.8 + Math.random() * 0.5) }, q: 1.5, attack: 0.008,
    });
  }

  // ---------- Musik ----------
  playMusic(id) {
    if (!this.ctx) {
      this.pendingSong = id;
      return;
    }
    if (this.songId === id) return;
    this.stopMusic();
    const def = SONGS[id];
    if (!def) return;
    this.songId = id;
    const s = def();
    const bus = this.ctx.createGain();
    bus.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 0.6);
    bus.connect(this.musicGain);
    const tracks = s.tracks.map(([inst, pat, vol]) => {
      const byStep = new Map();
      for (const e of pat.ev) {
        if (!byStep.has(e.step)) byStep.set(e.step, []);
        byStep.get(e.step).push(e);
      }
      return { inst, byStep, length: pat.length, vol };
    });
    this.song = { tracks, bus, step: 0, next: this.ctx.currentTime + 0.1, stepDur: 60 / s.bpm / 4, swing: s.swing };
  }

  stopMusic() {
    if (this.song) {
      const bus = this.song.bus, t = this.ctx.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      setTimeout(() => bus.disconnect(), 700);
    }
    this.song = null;
    this.songId = null;
  }

  tick() {
    const s = this.song;
    if (!s || !this.ctx) return;
    const ahead = this.ctx.currentTime + 0.15;
    // Nach langer Pause (Tab im Hintergrund) nicht alles nachholen
    if (s.next < this.ctx.currentTime - 0.3) s.next = this.ctx.currentTime + 0.05;
    while (s.next < ahead) {
      const swingOff = s.step % 2 === 1 ? s.stepDur * s.swing : 0;
      const t = s.next + swingOff;
      for (const tr of s.tracks) {
        const evs = tr.byStep.get(s.step % tr.length);
        if (evs) for (const e of evs) this.instrument(tr.inst, e, t, e.len * s.stepDur, tr.vol, s.bus);
      }
      s.step++;
      s.next += s.stepDur;
    }
  }

  instrument(inst, e, t, dur, vol, dest) {
    const f = e.f;
    switch (inst) {
      case 'marimba':
        this.osc('sine', f, f, t, Math.min(0.5, dur + 0.15), vol * 0.5, dest);
        this.osc('sine', f * 4, f * 4, t, 0.06, vol * 0.12, dest);
        break;
      case 'tuba':
        this.osc('sawtooth', f, f, t, Math.max(0.12, dur * 0.8), vol * 0.35, dest, { filter: { f: 420 }, attack: 0.02 });
        break;
      case 'bass':
        this.osc('triangle', f, f, t, Math.max(0.15, dur * 0.9), vol * 0.6, dest, { attack: 0.01 });
        break;
      case 'pluck':
        this.osc('sawtooth', f, f, t, 0.22, vol * 0.3, dest, { filter: { f: f * 5 }, q: 2 });
        break;
      case 'lead': {
        const o = this.osc('square', f, f, t, Math.max(0.1, dur * 0.95), vol * 0.25, dest, { filter: { f: 2800 }, attack: 0.01 });
        this.vibrato(o, t, dur, 5.5, f * 0.008);
        break;
      }
      case 'flute': {
        const o = this.osc('triangle', f, f, t, Math.max(0.15, dur), vol * 0.55, dest, { attack: 0.04 });
        this.vibrato(o, t, dur, 5, f * 0.01);
        break;
      }
      case 'steel':
        this.osc('sine', f, f, t, Math.min(0.6, dur + 0.25), vol * 0.45, dest);
        this.osc('sine', f * 2, f * 2, t, 0.25, vol * 0.18, dest);
        this.osc('sine', f * 2.76, f * 2.76, t, 0.12, vol * 0.06, dest);
        break;
      case 'pad':
        this.osc('sawtooth', f, f, t, dur, vol * 0.3, dest, { filter: { f: 900 }, attack: Math.min(0.4, dur * 0.4) });
        this.osc('sawtooth', f * 1.006, f * 1.006, t, dur, vol * 0.3, dest, { filter: { f: 900 }, attack: Math.min(0.4, dur * 0.4) });
        break;
      case 'drum':
        if (e.drum === 'k') this.osc('sine', 130, 40, t, 0.16, vol * 0.9, dest);
        else if (e.drum === 's') {
          this.noise(t, 0.12, vol * 0.5, dest, { f: 1800, q: 0.6 });
          this.osc('triangle', 190, 160, t, 0.07, vol * 0.3, dest);
        } else if (e.drum === 'h') this.noise(t, 0.035, vol * 0.25, dest, { type: 'highpass', f: 7000 });
        else if (e.drum === 'c') this.noise(t, 0.06, vol * 0.18, dest, { type: 'highpass', f: 5000 });
        break;
    }
  }

  vibrato(o, t, dur, rate, depth) {
    if (dur < 0.25) return;
    const l = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    l.frequency.value = rate;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(depth, t + Math.min(0.3, dur));
    l.connect(g);
    g.connect(o.frequency);
    l.start(t);
    l.stop(t + dur + 0.1);
  }
}
