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
  // Bosskampf im Pilzwald: grantig-hüpfend in d-Moll
  pilzboss: () => ({
    bpm: 138, swing: 0.1,
    tracks: [
      ['lead', melody(`D5:2 F5:2 A5:2 F5:2 G#5:2 A5:2 .:4  D5:2 F5:2 A5:2 C6:2 A5:4 .:4
        Bb4:2 D5:2 F5:2 D5:2 E5:2 F5:2 .:4  C#5:2 E5:2 G5:2 E5:2 A5:6 .:2`), 0.28],
      ['tuba', accomp('Dm Dm Bb A', 'oompah'), 0.55],
      ['marimba', accomp('Dm Dm Bb A', 'arp'), 0.14],
      ['drum', drums('k:2 c:2 s:2 c:2 k:2 k:2 s:2 c:2'), 0.4],
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
  fuerst: { base: 125, type: 'sawtooth', spread: 0.3, formant: 750 },
  lotti: { base: 380, type: 'triangle', spread: 0.3, formant: 1600 },
  igel: { base: 420, type: 'square', spread: 0.25, formant: 1800 },
  stupsi: { base: 700, type: 'square', spread: 0.3, formant: 2600 },
  eiche: { base: 70, type: 'sawtooth', spread: 0.12, formant: 500 },
  kapitaen: { base: 150, type: 'sawtooth', spread: 0.3, formant: 900 },
  knack: { base: 180, type: 'square', spread: 0.3, formant: 1000 },
  stein: { base: 300, type: 'sine', spread: 0.1, formant: 1400 },
  default: { base: 300, type: 'square', spread: 0.3, formant: 1500 },
};

// Hallräume pro Welt. time = Nachhall in s, decay = wie schnell er abklingt,
// damp = wie dumpf er mit der Zeit wird (0 hell … 1 dunkel), early = harte
// frühe Echos (Stein), wet = Hall-Anteil, pre = Vorverzögerung in s.
export const REVERB = {
  hub: { time: 1.6, decay: 2.6, damp: 0.45, early: 0.15, wet: 0.2, pre: 0.015 },
  pilz: { time: 2.4, decay: 2.1, damp: 0.8, early: 0, wet: 0.3, pre: 0.02 },
  beach: { time: 0.7, decay: 3.4, damp: 0.25, early: 0, wet: 0.09, pre: 0.005 },
  turm: { time: 3.6, decay: 1.7, damp: 0.2, early: 0.6, wet: 0.34, pre: 0.03 },
};

// Umgebungsgeräusche pro Welt: durchgehende Flächen (beds) und zufällige
// Einzelereignisse (events: [Name, minimaler Abstand, maximaler Abstand]).
const AMBIENCE = {
  hub: { beds: [['wind', 0.05]], events: [['bird', 1.2, 4.5], ['songbird', 7, 16], ['gust', 3, 7]] },
  pilz: { beds: [['night', 0.05]], events: [['cricket', 0.35, 0.9], ['owl', 12, 26]] },
  beach: { beds: [['surf', 0.065]], events: [['wave', 5.5, 8.5], ['gull', 4, 11]] },
  turm: { beds: [['howl', 0.24], ['wind', 0.04]], events: [['gust', 2.5, 6], ['drip', 0.8, 3.5], ['rumble', 14, 30]] },
};

// Menügeräusche laufen am Hall und Unterwasserfilter vorbei
const UI_SOUNDS = new Set(['menu', 'ok', 'back']);
const rand = (a, b) => a + Math.random() * (b - a);

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.6;
    this.sfxVol = 0.8;
    this.ambVol = 0.7;
    this.song = null;
    this.songId = null;
    this.duck = 1;
    this.lite = false; // sparsamer Hall für schwache Geräte (Grafikstufe "n64")
    this.reverbId = null;
    this.space = null; // Höhlen/Senken: zusätzlicher Hall, optional Tiefpass
    this.underwater = false;
    this.listener = null;
    this.amb = null;
    this.ambSpec = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = (this.ctx = new AC());
      // Musik, Effekte, Umgebung -> trocken + Hall -> Umgebungsfilter -> Ausgang
      this.master = c.createGain();
      this.master.connect(c.destination);
      this.envFilter = c.createBiquadFilter();
      this.envFilter.type = 'lowpass';
      this.envFilter.frequency.value = 20000;
      this.envFilter.Q.value = 0.7;
      this.envFilter.connect(this.master);
      this.dry = c.createGain();
      this.dry.connect(this.envFilter);
      this.convolver = c.createConvolver();
      this.wet = c.createGain();
      this.wet.gain.value = 0;
      this.convolver.connect(this.wet);
      this.wet.connect(this.envFilter);
      this.verbIn = c.createGain();
      this.verbIn.connect(this.convolver);
      const bus = (vol, send) => {
        const g = c.createGain();
        g.gain.value = vol;
        g.connect(this.dry);
        const s = c.createGain();
        s.gain.value = send;
        g.connect(s);
        s.connect(this.verbIn);
        return g;
      };
      this.musicGain = bus(this.musicVol * 0.5, 0.9);
      this.sfxGain = bus(this.sfxVol, 0.7);
      this.ambGain = bus(this.ambVol * 0.6, 0.45);
      this.uiGain = c.createGain();
      this.uiGain.gain.value = this.sfxVol;
      this.uiGain.connect(this.master);
      this.hasPanner = typeof c.createStereoPanner === 'function';
      const len = c.sampleRate;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // längeres, weicheres (rosa) Rauschen für Wind und Brandung – ohne hörbare Schleife
      const blen = c.sampleRate * 5;
      this.bedBuf = c.createBuffer(1, blen, c.sampleRate);
      const bd = this.bedBuf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < blen; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099;
        b1 = 0.963 * b1 + w * 0.2965;
        b2 = 0.57 * b2 + w * 1.0526;
        bd[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      }
      // Übergang am Schleifenende weich machen
      const fadeN = 2000;
      for (let i = 0; i < fadeN; i++) {
        const k = i / fadeN;
        bd[blen - fadeN + i] = bd[blen - fadeN + i] * (1 - k) + bd[i] * k;
      }
      this.timer = setInterval(() => this.tick(), 25);
      if (this.reverbId) this.applyReverb(this.reverbId, true);
      if (this.pendingSong) this.playMusic(this.pendingSong);
      if (this.ambSpec) this.startAmbience(this.ambSpec);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolumes(music, sfx, amb = this.ambVol) {
    const wasSilent = this.ambVol <= 0;
    this.musicVol = music;
    this.sfxVol = sfx;
    this.ambVol = amb;
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.musicGain.gain.setTargetAtTime(music * 0.5 * this.duck, t, 0.05);
      this.sfxGain.gain.setTargetAtTime(sfx, t, 0.05);
      this.uiGain.gain.setTargetAtTime(sfx, t, 0.05);
      this.ambGain.gain.setTargetAtTime(amb * 0.6, t, 0.05);
      // ausgeschaltete Umgebung kostet keine Rechenzeit
      if (amb <= 0) this.stopAmbience();
      else if (wasSilent && this.ambSpec) this.startAmbience(this.ambSpec);
    }
  }

  // Grafikstufe "n64": kürzerer Mono-Hall, spart Rechenzeit auf schwachen Handys
  setLite(lite) {
    if (lite === this.lite) return;
    this.lite = lite;
    if (this.ctx && this.reverbId) this.applyReverb(this.reverbId, true);
  }

  // ---------- Hall ----------
  // Impulsantwort aus abklingendem, zunehmend gedämpftem Rauschen (keine Audiodatei)
  makeImpulse({ time, decay, damp, early, pre = 0.01 }) {
    const c = this.ctx, sr = c.sampleRate;
    const len = Math.floor(sr * Math.min(time, this.lite ? 1.1 : 4));
    const chans = this.lite ? 1 : 2;
    const buf = c.createBuffer(chans, len, sr);
    const preN = Math.floor(pre * sr);
    for (let ch = 0; ch < chans; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = preN; i < len; i++) {
        const x = (i - preN) / (len - preN);
        const env = Math.pow(1 - x, decay);
        const a = 1 - Math.min(0.985, damp * (0.3 + 0.7 * x));
        lp += a * (Math.random() * 2 - 1 - lp);
        d[i] = lp * env;
      }
      // frühe Reflexionen: harte Echos wie von Steinwänden
      if (early > 0) {
        for (let k = 0; k < 10; k++) {
          const i = preN + Math.floor(sr * (0.008 + k * 0.021 + Math.random() * 0.012));
          if (i < len) d[i] += (Math.random() < 0.5 ? -1 : 1) * early * (1 - k / 12) * 0.8;
        }
      }
    }
    return buf;
  }

  applyReverb(id, force = false) {
    if (!force && id === this.reverbId && this.convolver?.buffer) return;
    this.reverbId = id;
    if (!this.ctx) return;
    const p = typeof id === 'object' ? id : REVERB[id] || REVERB.hub;
    this.reverb = p;
    this.convolver.buffer = this.makeImpulse(p);
    this.updateEnv(0.05);
  }

  // Welt wechseln: Hall + Umgebungsgeräusche. ambience = { id, spots }
  setWorld(reverb, ambience) {
    this.space = null;
    this.underwater = false;
    this.applyReverb(reverb || 'hub');
    this.setAmbience(ambience);
    if (this.ctx) this.updateEnv(0.05);
  }

  // Höhle, Senke, Wrack: mehr Hall (reverb = zusätzlicher Anteil), optional dumpfer
  setSpace(space) {
    this.space = space;
    this.updateEnv();
  }

  setUnderwater(on) {
    if (on === this.underwater) return;
    this.underwater = on;
    this.updateEnv();
  }

  // Filter und Hall-Anteil weich (ca. 0,5 s) an die Umgebung anpassen
  updateEnv(fadeSec = 0.5) {
    if (!this.ctx || !this.envFilter) return;
    const t = this.ctx.currentTime;
    const base = this.reverb?.wet ?? 0.2;
    const wet = Math.min(0.8, base + (this.space?.reverb || 0) + (this.underwater ? 0.12 : 0));
    let f = this.space?.lowpass || 20000;
    if (this.underwater) f = Math.min(f, 650);
    const fq = this.envFilter.frequency;
    fq.cancelScheduledValues(t);
    fq.setValueAtTime(Math.max(20, fq.value), t);
    fq.exponentialRampToValueAtTime(f, t + fadeSec);
    const wg = this.wet.gain;
    wg.cancelScheduledValues(t);
    wg.setValueAtTime(wg.value, t);
    wg.linearRampToValueAtTime(wet, t + fadeSec);
  }

  // ---------- Richtungshören ----------
  // Kamera (für links/rechts) und Spieler (für die Entfernung), jedes Bild
  setListener(cam, rightX, rightZ, player) {
    const l = Math.hypot(rightX, rightZ) || 1;
    const L = this.listener || (this.listener = {});
    L.cx = cam.x; L.cy = cam.y; L.cz = cam.z;
    L.rx = rightX / l; L.rz = rightZ / l;
    L.px = player.x; L.py = player.y; L.pz = player.z;
    if (this.amb && this.ctx && this.ctx.currentTime >= (this.amb.loopUpd || 0)) {
      this.amb.loopUpd = this.ctx.currentTime + 0.1;
      this.updateLoopSpots();
    }
  }

  // Lautstärke und Stereo-Position einer Quelle; null = zu weit weg
  spatial(pos, ref = 7, max = 55) {
    const L = this.listener;
    if (!L) return null;
    const dp = Math.hypot(pos.x - L.px, (pos.y - L.py) * 0.6, pos.z - L.pz);
    const dc = Math.hypot(pos.x - L.cx, (pos.y - L.cy) * 0.6, pos.z - L.cz);
    const dist = Math.min(dp, dc);
    if (dist > max) return null;
    let gain = dist <= ref ? 1 : Math.pow(ref / dist, 1.3);
    gain *= Math.min(1, (max - dist) / (max * 0.3));
    const dx = pos.x - L.cx, dz = pos.z - L.cz, hd = Math.hypot(dx, dz);
    const pan = hd < 0.01 ? 0 : Math.max(-1, Math.min(1, (dx * L.rx + dz * L.rz) / hd)) * Math.min(1, hd / 3) * 0.8;
    return { gain, pan };
  }

  // Zwischenknoten (Lautstärke + Panorama) für einen Einzelklang
  panNode(gain, pan, dest) {
    const c = this.ctx;
    const g = c.createGain();
    g.gain.value = gain;
    if (this.hasPanner && pan) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      p.connect(dest);
    } else g.connect(dest);
    return g;
  }

  // Ziel für einen Klang an Position pos (null = zu weit weg, nicht abspielen)
  placeAt(pos, dest, ref, max) {
    if (!this.listener) return dest;
    const s = this.spatial(pos, ref, max);
    return s ? this.panNode(s.gain, s.pan, dest) : null;
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
    s.loop = true; // längere Geräusche (Grollen, Gischt) dürfen länger als der Puffer sein
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
  // play(name), play(name, arg) oder mit Position: play(name, arg, pos) / play(name, pos)
  play(name, arg = 0, pos = null) {
    if (!this.ctx || this.sfxVol <= 0) return;
    if (arg && typeof arg === 'object') { pos = arg; arg = 0; }
    const t = this.ctx.currentTime + 0.005;
    let d = UI_SOUNDS.has(name) ? this.uiGain : this.sfxGain;
    if (pos) {
      d = this.placeAt(pos, d);
      if (!d) return;
    }
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
      // ---- Gegner (meist mit Position, damit man sie orten kann) ----
      case 'beetleAlert': {
        // Aufziehwerk schnarrt los
        const o = this.osc('square', 90, 140, t, 0.45, 0.07, d, { filter: { f: 900 }, curve: 'lin' });
        this.vibrato(o, t, 0.45, 30, 40);
        break;
      }
      case 'beetleTick':
        for (let i = 0; i < 3; i++) this.osc('square', 2400, 1800, t + i * 0.09, 0.015, 0.05, d, { filter: { type: 'bandpass', f: 2200 }, q: 3 });
        break;
      case 'crabAlert':
      case 'crabClack':
        for (let i = 0; i < (name === 'crabAlert' ? 4 : 2); i++) this.noise(t + i * 0.08, 0.03, 0.25, d, { f: 2600, q: 4 });
        break;
      case 'cactusAlert': {
        const o = this.osc('sawtooth', 240, 420, t, 0.25, 0.12, d, { filter: { f: 1500 }, q: 3, curve: 'lin' });
        this.vibrato(o, t, 0.25, 18, 30);
        this.osc('sine', 3200, 3000, t + 0.05, 0.3, 0.03, d);
        break;
      }
      case 'cactusSpur':
        // klimpernde Sporen
        this.osc('sine', 3600, 3400, t, 0.18, 0.03, d);
        this.osc('sine', 4300, 4100, t + 0.03, 0.14, 0.02, d);
        break;
      case 'grumble': {
        // Fürst Fliegenpilz holt Luft und grummelt
        const o = this.osc('sawtooth', 115, 80, t, 0.6, 0.2, d, { filter: { f: 600 }, q: 3, curve: 'lin', attack: 0.05 });
        this.vibrato(o, t, 0.6, 14, 12);
        this.noise(t, 0.5, 0.08, d, { f: 400, q: 1.5, attack: 0.1 });
        break;
      }
      case 'spores':
        // Sporenwolke pufft aus dem Hut
        this.noise(t, 0.5, 0.25, d, { f: 900, f1: 300, q: 0.8, attack: 0.02 });
        this.osc('sine', 220, 90, t, 0.3, 0.12, d);
        break;
      case 'grimmAlert':
        this.osc('square', 500, 900, t, 0.12, 0.06, d, { filter: { f: 1800 } });
        this.osc('square', 700, 1200, t + 0.13, 0.12, 0.05, d, { filter: { f: 1800 } });
        break;
    }
  }

  // Ein "Brabbel"-Laut beim Tippen der Dialoge
  voice(who, pos = null, delay = 0) {
    if (!this.ctx || this.sfxVol <= 0) return;
    const v = VOICES[who] || VOICES.default;
    const t = this.ctx.currentTime + 0.005 + delay;
    const dest = pos ? this.placeAt(pos, this.sfxGain, 5, 30) : this.sfxGain;
    if (!dest) return;
    const f = v.base * (1 + (Math.random() - 0.5) * 2 * v.spread);
    const dur = 0.05 + Math.random() * 0.04;
    this.osc(v.type, f, f * (0.85 + Math.random() * 0.3), t, dur, 0.12, dest, {
      filter: { type: 'bandpass', f: v.formant * (0.8 + Math.random() * 0.5) }, q: 1.5, attack: 0.008,
    });
  }

  // ---------- Umgebungsgeräusche ----------
  // spec = { id: 'pilz', spots: [{ x, y, z, r, sound, every: [min, max] } | { x, y, z, loop, vol }] }
  setAmbience(spec) {
    const same = spec && this.ambSpec && spec.id === this.ambSpec.id && spec.spots === this.ambSpec.spots;
    if (same && this.amb) return;
    this.ambSpec = spec || null;
    this.stopAmbience();
    if (spec && this.ctx) this.startAmbience(spec);
  }

  startAmbience(spec) {
    if (!this.ctx || this.ambVol <= 0) return;
    this.stopAmbience();
    const def = AMBIENCE[spec.id];
    if (!def) return;
    const now = this.ctx.currentTime;
    const amb = (this.amb = { beds: {}, events: [], spots: [], loops: [], crickets: [] });
    for (const [kind, vol] of def.beds) amb.beds[kind] = this.makeBed(kind, vol, this.ambGain);
    for (const [name, a, b] of def.events) amb.events.push({ name, a, b, next: now + rand(0.3, b) });
    for (let i = 0; i < 3; i++) amb.crickets.push({ pan: rand(-0.9, 0.9), f: rand(4200, 5200) });
    for (const sp of spec.spots || []) {
      if (sp.loop) {
        const dest = this.hasPanner ? this.ctx.createStereoPanner() : null;
        if (dest) dest.connect(this.ambGain);
        const bed = this.makeBed(sp.loop, 0, dest || this.ambGain);
        amb.loops.push({ ...sp, bed, pan: dest });
      } else amb.spots.push({ ...sp, next: now + rand(0, sp.every[1]) });
    }
    this.updateLoopSpots();
  }

  stopAmbience() {
    const amb = this.amb;
    this.amb = null;
    if (!amb || !this.ctx) return;
    const t = this.ctx.currentTime;
    const beds = [...Object.values(amb.beds), ...amb.loops.map((l) => l.bed)];
    for (const b of beds) {
      b.gain.gain.cancelScheduledValues(t);
      b.gain.gain.setTargetAtTime(0.0001, t, 0.25);
      b.src.stop(t + 1.2);
    }
  }

  // Endlose Rauschfläche: Wind, Brandung, Wasserfall …
  makeBed(kind, vol, dest) {
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.bedBuf;
    src.loop = true;
    src.playbackRate.value = rand(0.85, 1.1);
    const f = c.createBiquadFilter();
    const g = c.createGain();
    const set = { wind: ['lowpass', 420, 0.5], night: ['lowpass', 260, 0.5], surf: ['lowpass', 600, 0.6], howl: ['bandpass', 480, 7], falls: ['bandpass', 1100, 0.45] }[kind] || ['lowpass', 500, 0.5];
    f.type = set[0];
    f.frequency.value = set[1];
    f.Q.value = set[2];
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    g.gain.setValueAtTime(0.0001, t);
    if (vol > 0) g.gain.setTargetAtTime(vol, t, 0.8);
    src.start(t, Math.random() * 4);
    return { src, filter: f, gain: g, vol, kind, f0: set[1] };
  }

  // Wasserfall & Co.: Lautstärke und Richtung folgen dem Spieler
  updateLoopSpots() {
    const amb = this.amb;
    if (!amb || !amb.loops.length) return;
    const t = this.ctx.currentTime;
    for (const l of amb.loops) {
      const s = this.spatial(l, l.ref ?? 8, l.range ?? 50);
      l.bed.gain.gain.setTargetAtTime(s ? s.gain * (l.vol ?? 0.3) : 0.0001, t, 0.15);
      if (l.pan && s) l.pan.pan.setTargetAtTime(s.pan, t, 0.15);
    }
  }

  tickAmbience() {
    const amb = this.amb, now = this.ctx.currentTime;
    for (const e of amb.events) {
      if (now < e.next) continue;
      e.next = now + rand(e.a, e.b);
      this.ambEvent(e.name, now + 0.05);
    }
    for (const sp of amb.spots) {
      if (now < sp.next) continue;
      sp.next = now + rand(sp.every[0], sp.every[1]);
      if (!this.listener) continue;
      // zufälliger Punkt in der Quelle (z.B. irgendwo im Sumpf)
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (sp.r || 0);
      const pos = { x: sp.x + Math.cos(a) * r, y: sp.y, z: sp.z + Math.sin(a) * r };
      const d = this.placeAt(pos, this.ambGain, sp.ref ?? 6, sp.range ?? 35);
      if (d) this.ambEvent(sp.sound, now + 0.05, d);
    }
  }

  ambEvent(name, t, dest) {
    const amb = this.amb;
    const out = (pan, gain = 1) => dest || this.panNode(gain, pan, this.ambGain);
    switch (name) {
      case 'bird': {
        const d = out(rand(-0.9, 0.9), rand(0.5, 1));
        const base = rand(2600, 4200), n = 2 + Math.floor(Math.random() * 4), up = Math.random() < 0.5;
        for (let i = 0; i < n; i++) {
          const tt = t + i * rand(0.08, 0.13), f = base * rand(0.92, 1.08);
          this.osc('sine', up ? f : f * 1.3, up ? f * 1.35 : f * 0.8, tt, 0.06, 0.05, d);
        }
        break;
      }
      case 'songbird': {
        // kleine Melodie mit Triller
        const d = out(rand(-0.8, 0.8), rand(0.5, 0.9));
        const base = rand(2200, 3000);
        [1, 1.25, 1.12, 1.5].forEach((m, i) => this.osc('sine', base * m, base * m * 1.05, t + i * 0.14, 0.11, 0.045, d));
        const o = this.osc('sine', base * 1.7, base * 1.6, t + 0.6, 0.4, 0.04, d);
        this.vibrato(o, t + 0.6, 0.4, 28, base * 0.08);
        break;
      }
      case 'gust':
        for (const b of Object.values(amb.beds)) {
          if (b.kind !== 'wind' && b.kind !== 'howl') continue;
          const k = rand(0.5, 1.5);
          b.gain.gain.setTargetAtTime(b.vol * k, t, rand(0.6, 1.5));
          b.filter.frequency.setTargetAtTime(b.f0 * rand(0.7, 1.6), t, rand(0.8, 2));
        }
        break;
      case 'cricket': {
        const cr = amb.crickets[Math.floor(Math.random() * amb.crickets.length)];
        const d = out(cr.pan, rand(0.6, 1));
        for (let i = 0; i < 3; i++) this.osc('sine', cr.f, cr.f * 0.98, t + i * 0.035, 0.018, 0.02, d, { attack: 0.003 });
        break;
      }
      case 'owl': {
        // Käuzchen: "huu … hu-huuuu"
        const d = out(rand(-0.8, 0.8), rand(0.6, 1));
        this.osc('sine', 420, 385, t, 0.4, 0.07, d, { attack: 0.08, curve: 'lin' });
        this.osc('triangle', 840, 770, t, 0.4, 0.01, d, { attack: 0.08, curve: 'lin' });
        this.osc('sine', 400, 380, t + 0.75, 0.16, 0.05, d, { attack: 0.03, curve: 'lin' });
        const o = this.osc('sine', 410, 360, t + 1.0, 1.0, 0.07, d, { attack: 0.1, curve: 'lin' });
        this.vibrato(o, t + 1.0, 1.0, 7, 6);
        break;
      }
      case 'crackle': {
        // knisterndes Lagerfeuer
        const d = out(0);
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) this.noise(t + i * rand(0.02, 0.07), 0.015, rand(0.15, 0.35), d, { type: 'highpass', f: rand(1500, 3500), attack: 0.001 });
        if (Math.random() < 0.15) this.noise(t, 0.12, 0.2, d, { type: 'lowpass', f: 300, attack: 0.005 });
        break;
      }
      case 'blub': {
        const d = out(0);
        const f = rand(110, 180);
        this.osc('sine', f, f * 3.5, t, 0.09, 0.22, d, { attack: 0.01 });
        if (Math.random() < 0.5) this.osc('sine', f * 1.4, f * 4, t + 0.12, 0.07, 0.12, d, { attack: 0.01 });
        break;
      }
      case 'wave': {
        // Welle rollt an und bricht: Brandung schwillt an, wird heller, zischt aus
        const b = amb.beds.surf;
        if (b) {
          const g = b.gain.gain, f = b.filter.frequency;
          g.cancelScheduledValues(t);
          g.setTargetAtTime(b.vol * rand(1.6, 2.4), t, 0.7);
          g.setTargetAtTime(b.vol * 0.5, t + 1.8, 1.2);
          f.cancelScheduledValues(t);
          f.setTargetAtTime(rand(1300, 1900), t, 0.8);
          f.setTargetAtTime(450, t + 1.8, 1.4);
        }
        this.noise(t + 1.4, 2.2, 0.035, out(rand(-0.5, 0.5)), { type: 'highpass', f: 2500, attack: 0.5 });
        break;
      }
      case 'gull': {
        const d = out(rand(-0.9, 0.9), rand(0.5, 1));
        const n = 2 + Math.floor(Math.random() * 3), f = rand(1000, 1300);
        for (let i = 0; i < n; i++) {
          const tt = t + i * rand(0.28, 0.4);
          this.osc('sawtooth', f * 0.8, f * 1.2, tt, 0.1, 0.04, d, { filter: { type: 'bandpass', f: 1800 }, q: 3, curve: 'lin' });
          this.osc('sawtooth', f * 1.2, f * 0.7, tt + 0.1, 0.16, 0.04, d, { filter: { type: 'bandpass', f: 1600 }, q: 3, curve: 'lin' });
        }
        break;
      }
      case 'drip': {
        const d = out(rand(-0.8, 0.8), rand(0.4, 1));
        const f = rand(1800, 2600);
        this.osc('sine', f, f * 0.5, t, 0.05, 0.07, d, { attack: 0.002 });
        if (Math.random() < 0.4) this.osc('sine', f * 1.3, f * 0.7, t + 0.2, 0.04, 0.03, d, { attack: 0.002 });
        break;
      }
      case 'rumble': {
        // fernes Grollen
        const d = out(rand(-0.6, 0.6));
        this.noise(t, 3.5, 0.3, d, { type: 'lowpass', f: 160, f1: 70, attack: 1.1 });
        this.osc('sine', 48, 38, t, 3, 0.12, d, { attack: 0.9 });
        break;
      }
    }
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
    if (this.amb && this.ctx) this.tickAmbience();
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
