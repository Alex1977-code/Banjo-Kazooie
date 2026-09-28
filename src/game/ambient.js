// Umgebungspartikel rund um Bruno: Pollen und Schmetterlinge im Wurzelhügel,
// Glühwürmchen und Sporen im Pilzwald, Gischt und Blasen in der Muschelbucht,
// Nebelschwaden und Asche am Krötenturm. Es wird nur in der Nähe des Spielers
// erzeugt und die Anzahl ist begrenzt (in der Stufe "n64" halbiert).
import * as THREE from 'three';
import { FX } from '../engine/fx.js';

const R = Math.random;
const rand = (a, b) => a + R() * (b - a);

// Zufälliger Punkt auf einer Kreisscheibe um den Spieler
function around(p, r0, r1) {
  const a = R() * Math.PI * 2, d = Math.sqrt(rand((r0 / r1) ** 2, 1)) * r1;
  return [p.x + Math.cos(a) * d, p.z + Math.sin(a) * d];
}

// Pro Art: Pool, Rate (pro s), Höchstzahl gleichzeitig, Erzeuger
const KINDS = {
  pollen: {
    pool: 'dot', rate: 5, max: 36,
    make(g, L, p) {
      const [x, z] = around(p, 2, 16);
      return { x, y: L.gy(x, z) + rand(0.6, 4), z, vx: 0.25 * g.fxWind, vy: rand(-0.05, 0.1), vz: 0.1, wob: 0.5, drag: 0.8,
        life: rand(6, 9), fadeIn: 1.5, s0: rand(0.1, 0.16), s1: 0.1, r: 1, gg: 0.95, b: 0.7, a: 0.55 };
    },
  },
  fireflies: {
    pool: 'dot', rate: 4, max: 28,
    make(g, L, p) {
      const [x, z] = around(p, 3, 18);
      return { x, y: L.gy(x, z) + rand(0.5, 3), z, wob: 1.2, drag: 1.2, life: rand(5, 8), fadeIn: 1,
        flick: rand(0.4, 0.9), s0: 0.22, s1: 0.18, r: 0.8, gg: 1, b: 0.35, a: 0.9 };
    },
  },
  spores: {
    pool: 'dot', rate: 5, max: 34,
    make(g, L, p) {
      const [x, z] = around(p, 1, 14);
      const c = [[0.4, 0.9, 1], [1, 0.5, 0.9], [0.7, 0.5, 1]][Math.floor(R() * 3)];
      return { x, y: L.gy(x, z) + rand(0.2, 1.5), z, vy: rand(0.15, 0.35), wob: 0.3, drag: 0.5, life: rand(6, 10), fadeIn: 2,
        flick: 0.15, s0: rand(0.1, 0.15), s1: 0.06, r: c[0], gg: c[1], b: c[2], a: 0.8 };
    },
  },
  spray: {
    // Gischt dort, wo die Brandung aufs Ufer trifft
    pool: 'puff', rate: 3, max: 36, burst: true,
    make(g, L, p) {
      const pts = L.shorePts;
      if (g.underwater || !pts?.length) return null;
      for (let i = 0; i < 8; i++) {
        const [x, z, w] = pts[Math.floor(R() * pts.length)];
        if (Math.hypot(x - p.x, z - p.z) > 26) continue;
        const out = [];
        for (let k = 0; k < 4; k++) {
          out.push({ x: x + rand(-0.6, 0.6), y: w + 0.1, z: z + rand(-0.6, 0.6), vx: rand(-0.8, 0.8), vy: rand(2, 3.5), vz: rand(-0.8, 0.8),
            g: 7, drag: 0.6, life: rand(0.6, 0.9), s0: 0.5, s1: 1.3, r: 0.95, gg: 0.98, b: 1, a: 0.75 });
        }
        return out;
      }
      return null;
    },
  },
  bubbles: {
    pool: 'dot', rate: 7, max: 30,
    make(g, L, p) {
      if (!g.underwater) return null;
      const [x, z] = around(p, 0.5, 7);
      const w = L.world.waterAt(x, z);
      return { x, y: p.y + rand(-2, 1.5), z, vy: rand(1, 1.8), wob: 0.6, drag: 0.4, life: Math.max(0.5, Math.min(3, (w - p.y) / 1.4)),
        s0: rand(0.2, 0.32), s1: 0.24, r: 0.75, gg: 0.92, b: 1, a: 0.75 };
    },
  },
  wisps: {
    // Nebelschwaden ziehen über den Turm
    pool: 'puff', rate: 1.2, max: 12,
    make(g, L, p) {
      const [x, z] = around(p, 6, 26);
      return { x, y: p.y + rand(-2, 5), z, vx: rand(1, 2) * g.fxWind, vz: rand(-0.4, 0.4), drag: 0.1, life: rand(6, 9), fadeIn: 2,
        s0: rand(3, 4.5), s1: rand(5, 7), r: 0.78, gg: 0.72, b: 0.88, a: 0.28 };
    },
  },
  ash: {
    pool: 'puff', rate: 8, max: 46,
    make(g, L, p) {
      const [x, z] = around(p, 1, 16);
      return { x, y: p.y + rand(2, 8), z, vx: 0.6 * g.fxWind, vy: rand(-0.6, -0.3), wob: 0.8, drag: 0.6, life: rand(5, 8), fadeIn: 1,
        s0: rand(0.14, 0.22), s1: 0.12, r: 0.28, gg: 0.25, b: 0.3, a: 0.85 };
    },
  },
  embers: {
    pool: 'dot', rate: 1.5, max: 10,
    make(g, L, p) {
      const [x, z] = around(p, 2, 14);
      return { x, y: p.y + rand(-1, 4), z, vx: 0.5 * g.fxWind, vy: rand(0.2, 0.6), wob: 0.7, drag: 0.5, life: rand(3, 5), fadeIn: 0.5,
        flick: 1.5, s0: 0.14, s1: 0.05, r: 1, gg: 0.5, b: 0.2, a: 0.9 };
    },
  },
};

export class Ambient {
  constructor(game) {
    this.game = game;
    this.kinds = [];
    this.butterflies = null;
  }

  // def.ambientFx = ['pollen', 'butterflies', …]
  setup(L) {
    this.kinds = [];
    this.butterflies = null;
    for (const name of L.def.ambientFx || []) {
      if (name === 'butterflies') this.butterflies = this.makeButterflies(L);
      else if (KINDS[name]) this.kinds.push({ name, def: KINDS[name], acc: 0, live: [] });
      if (name === 'spray') L.shorePts = this.findShore(L);
    }
  }

  // Uferlinie einmal vorab suchen: Terrainpunkte knapp an der Wasserlinie
  findShore(L) {
    const T = L.T, pts = [];
    if (!T) return pts;
    T.forEach((x, z, k) => {
      const w = L.world.waterAt(x, z), h = T.h[k];
      if (w > -Infinity && h > w - 0.45 && h < w + 0.15) pts.push([x, z, w]);
    });
    return pts;
  }

  get scale() {
    const q = this.game.save.data.settings.quality;
    return q === 'n64' ? 0.5 : q === 'hd' ? 1.3 : 1;
  }

  update(dt) {
    const g = this.game, L = g.level;
    if (!L || g.mode !== 'play') return;
    const p = g.player.pos, sc = this.scale;
    for (const k of this.kinds) {
      k.live = k.live.filter((q) => q.life > 0 && q.tag === k);
      const max = Math.round(k.def.max * sc);
      k.acc += k.def.rate * sc * dt;
      while (k.acc >= 1) {
        k.acc -= 1;
        if (k.live.length >= max) { k.acc = 0; break; }
        const o = k.def.make(g, L, p);
        if (!o) continue;
        const pool = g.particles[k.def.pool];
        for (const one of Array.isArray(o) ? o : [o]) {
          one.tag = k;
          k.live.push(pool.spawn(one));
        }
      }
    }
    if (this.butterflies) this.updateButterflies(dt);
  }

  // ---------- Schmetterlinge (ein Draw-Call, Flügelschlag im Shader) ----------
  makeButterflies(L) {
    const n = Math.round(6 * (this.scale > 0.6 ? 1 : 0.5));
    // zwei Flügel aus je zwei Dreiecken, Körper in der Mitte
    const v = [];
    for (const s of [-1, 1]) {
      v.push(0, 0, 0.05, s * 0.34, 0, 0.22, s * 0.3, 0, -0.08);
      v.push(0, 0, -0.02, s * 0.3, 0, -0.08, s * 0.2, 0, -0.26);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = FX.time;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
float f = sin(uTime * 17.0 + float(gl_InstanceID) * 2.1);
transformed.y += abs(transformed.x) * f * 1.1;
transformed.x *= 1.0 - 0.45 * abs(f);`);
    };
    mat.customProgramCacheKey = () => 'butterfly';
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.frustumCulled = false;
    const cols = [0xffa13a, 0xffe14a, 0x6ab0ff, 0xffffff, 0xff7ad0, 0xb58aff];
    const list = [];
    for (let i = 0; i < n; i++) {
      mesh.setColorAt(i, new THREE.Color(cols[i % cols.length]));
      list.push({ hx: 9999, hz: 9999, hy: 0, t: R() * 10, a: rand(0.7, 1.3), b: rand(0.8, 1.6), yaw: 0, x: 0, y: 0, z: 0 });
    }
    L.root.add(mesh);
    return { mesh, list, obj: new THREE.Object3D() };
  }

  updateButterflies(dt) {
    const { mesh, list, obj } = this.butterflies;
    const g = this.game, L = g.level, p = g.player.pos;
    list.forEach((b, i) => {
      // zu weit weg? Dann in der Nähe von Bruno neu auftauchen lassen
      if (Math.hypot(b.hx - p.x, b.hz - p.z) > 28) {
        [b.hx, b.hz] = around(p, 6, 18);
        b.hy = L.gy(b.hx, b.hz) + rand(0.8, 1.8);
      }
      b.t += dt;
      const x = b.hx + Math.sin(b.t * 0.5 * b.a) * 2.5 + Math.sin(b.t * 1.3) * 0.4;
      const z = b.hz + Math.cos(b.t * 0.4 * b.b) * 2.5;
      const y = b.hy + Math.sin(b.t * 2.3 * b.a) * 0.35;
      const dx = x - b.x, dz = z - b.z;
      if (dx * dx + dz * dz > 1e-6) b.yaw = Math.atan2(dx, dz);
      b.x = x; b.y = y; b.z = z;
      obj.position.set(x, y, z);
      obj.rotation.set(0.2, b.yaw, 0);
      obj.updateMatrix();
      mesh.setMatrixAt(i, obj.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}
