// Stimmungszonen: Nebelfarbe, Licht und Himmel verschieben sich weich, je
// nachdem wo Bruno gerade steht (wärmer am Lagerfeuer, kälter in der Senke,
// dunkler beim Boss). Baut auf der Atmosphäre der Welt auf (setAtmosphere).
import * as THREE from 'three';
import { smoothstep } from '../engine/util.js';

// Werte, die der Renderer ohne Angabe benutzt
const DEFAULTS = {
  hemi: 0xdff2ff, ground: 0x5a4a30, sun: 0xfff2d8, skyTint: 0xffffff,
  fogNear: 60, fogFar: 260, sunIntensity: 2.2, hemiIntensity: 1.6,
};
const COLORS = ['fog', 'hemi', 'ground', 'sun', 'skyTint'];
const NUMS = ['fogNear', 'fogFar', 'sunIntensity', 'hemiIntensity'];

function state(a = {}, into) {
  const s = into || {};
  for (const k of COLORS) {
    const v = k === 'fog' ? a.fog ?? a.sky : a[k] ?? DEFAULTS[k];
    if (s[k]) s[k].set(v);
    else s[k] = new THREE.Color(v);
  }
  for (const k of NUMS) s[k] = a[k] ?? DEFAULTS[k];
  return s;
}

function copyState(src, dst) {
  for (const k of COLORS) dst[k].copy(src[k]);
  for (const k of NUMS) dst[k] = src[k];
}

export class Mood {
  constructor(game) {
    this.game = game;
    this.base = state();
    this.target = state();
    this.cur = state();
    this.baseT = 0;
    this.tmp = new THREE.Color();
  }

  // Beim Betreten eines Levels: sofort die Grundstimmung übernehmen
  reset(L) {
    for (const z of L.moodZones) z.atmoState = state({ ...this.baseRaw(L), ...z.atmo });
    state(this.baseRaw(L), this.base);
    copyState(this.base, this.cur);
    this.baseT = 0;
    this.active = L.moodZones.length > 0;
  }

  baseRaw(L) {
    return L.def.atmosphere(L, this.game);
  }

  update(dt) {
    const g = this.game, L = g.level;
    if (!this.active || !L || g.underwater) return;
    // Grundstimmung kann sich ändern (z.B. graues Tal im Wurzelhügel)
    if ((this.baseT -= dt) <= 0) {
      this.baseT = 0.25;
      state(this.baseRaw(L), this.base);
    }
    const t = this.target;
    copyState(this.base, t);
    const p = g.player.pos;
    for (const z of L.moodZones) {
      let w = 0;
      if (!z.cond || z.cond()) {
        const d = Math.hypot(p.x - z.x, p.z - z.z);
        w = 1 - smoothstep(z.r, z.r + z.fade, d);
      }
      if (w <= 0) continue;
      const a = z.atmo, zs = z.atmoState;
      for (const k of COLORS) if ((k === 'fog' ? a.fog ?? a.sky : a[k]) != null) t[k].lerp(zs[k], w);
      for (const k of NUMS) if (a[k] != null) t[k] += (a[k] - t[k]) * w;
    }
    // weich hinterherziehen (ca. 1 s)
    const k = 1 - Math.exp(-2.5 * dt);
    const c = this.cur;
    for (const key of COLORS) c[key].lerp(t[key], k);
    for (const key of NUMS) c[key] += (t[key] - c[key]) * k;
    this.apply();
  }

  apply() {
    const c = this.cur, r = this.game.renderer;
    r.setAtmosphere({
      fog: c.fog, fogNear: c.fogNear, fogFar: c.fogFar, hemi: c.hemi, ground: c.ground, sun: c.sun,
      sunIntensity: c.sunIntensity, hemiIntensity: c.hemiIntensity + (this.game.level?.lightFlash || 0),
    });
    const sky = this.game.level?.skyMesh;
    if (sky) sky.material.color.copy(c.skyTint);
  }
}
