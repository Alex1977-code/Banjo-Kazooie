// Höhenfeld-Terrain mit "Stempel"-Werkzeugen (Hügel, Plateaus, Wege ...).
// Die Kollision benutzt exakt dieselbe Triangulierung wie das Mesh.
import * as THREE from 'three';
import { clamp, smoothstep, fbm, segDist, lerp } from '../engine/util.js';

export class Terrain {
  constructor({ size = 240, cell = 2, base = 0 } = {}) {
    this.size = size;
    this.cell = cell;
    this.n = Math.round(size / cell) + 1;
    this.half = size / 2;
    this.h = new Float32Array(this.n * this.n).fill(base);
    this.paintCol = new Float32Array(this.n * this.n * 3);
    this.paintW = new Float32Array(this.n * this.n);
  }

  forEach(fn) {
    const { n, cell, half } = this;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) fn(i * cell - half, j * cell - half, j * n + i);
    }
  }

  // Lokale Operationen nur im betroffenen Rechteck ausführen
  region(x, z, r, fn) {
    const { n, cell, half } = this;
    const i0 = clamp(Math.floor((x - r + half) / cell), 0, n - 1), i1 = clamp(Math.ceil((x + r + half) / cell), 0, n - 1);
    const j0 = clamp(Math.floor((z - r + half) / cell), 0, n - 1), j1 = clamp(Math.ceil((z + r + half) / cell), 0, n - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(i * cell - half, j * cell - half, j * n + i);
  }

  noise(amp, scale = 0.03, seed = 1) {
    this.forEach((x, z, k) => { this.h[k] += (fbm(x * scale, z * scale, seed, 3) - 0.5) * 2 * amp; });
  }

  // Weicher Hügel
  hill(x, z, r, height) {
    this.region(x, z, r, (px, pz, k) => {
      const d = Math.hypot(px - x, pz - z) / r;
      if (d < 1) this.h[k] += height * (Math.cos(d * Math.PI) * 0.5 + 0.5);
    });
  }

  // Plateau: setzt Höhe mindestens auf h, Rand mit Breite edge (klein = Klippe)
  plateau(x, z, r, height, edge = 3, mode = 'max') {
    this.region(x, z, r + edge, (px, pz, k) => {
      const d = Math.hypot(px - x, pz - z);
      const t = 1 - smoothstep(r, r + edge, d);
      if (t <= 0) return;
      const target = lerp(this.h[k], height, t);
      this.h[k] = mode === 'max' ? Math.max(this.h[k], target) : mode === 'min' ? Math.min(this.h[k], target) : target;
    });
  }

  // Rechteckiges Plateau (gedreht)
  plateauRect(x, z, w, d, height, edge = 3, rot = 0, mode = 'max') {
    const c = Math.cos(rot), s = Math.sin(rot);
    const r = Math.hypot(w, d) / 2 + edge;
    this.region(x, z, r, (px, pz, k) => {
      const dx = px - x, dz = pz - z;
      const lx = Math.abs(dx * c - dz * s) - w / 2, lz = Math.abs(dx * s + dz * c) - d / 2;
      const dist = Math.hypot(Math.max(lx, 0), Math.max(lz, 0));
      const t = 1 - smoothstep(0, edge, dist);
      if (t <= 0) return;
      const target = lerp(this.h[k], height, t);
      this.h[k] = mode === 'max' ? Math.max(this.h[k], target) : mode === 'min' ? Math.min(this.h[k], target) : target;
    });
  }

  // Grube / Senke
  pit(x, z, r, depth, edge = 3) {
    this.plateau(x, z, r, depth, edge, 'min');
  }

  // Rampe zwischen zwei Punkten (glättet auf eine lineare Höhe)
  ramp(ax, az, ay, bx, bz, by, width, edge = 2) {
    const len = Math.hypot(bx - ax, bz - az);
    this.region((ax + bx) / 2, (az + bz) / 2, len / 2 + width + edge, (px, pz, k) => {
      const dx = bx - ax, dz = bz - az;
      const t = clamp(((px - ax) * dx + (pz - az) * dz) / (len * len), 0, 1);
      const d = segDist(px, pz, ax, az, bx, bz);
      const w = 1 - smoothstep(width / 2, width / 2 + edge, d);
      if (w > 0) this.h[k] = lerp(this.h[k], lerp(ay, by, t), w);
    });
  }

  // Farbe aufmalen (weiche Kante)
  paint(x, z, r, color, soft = 2) {
    const c = new THREE.Color(color);
    this.region(x, z, r + soft, (px, pz, k) => {
      const d = Math.hypot(px - x, pz - z);
      const w = 1 - smoothstep(r, r + soft, d);
      this.applyPaint(k, c, w);
    });
  }

  applyPaint(k, c, w) {
    // Erste Farbe direkt setzen, weitere Farben darüber mischen
    const mix = this.paintW[k] > 0 ? w : 1;
    this.paintCol[k * 3] = lerp(this.paintCol[k * 3], c.r, mix);
    this.paintCol[k * 3 + 1] = lerp(this.paintCol[k * 3 + 1], c.g, mix);
    this.paintCol[k * 3 + 2] = lerp(this.paintCol[k * 3 + 2], c.b, mix);
    this.paintW[k] = Math.max(this.paintW[k], w);
  }

  // Weg entlang einer Punktliste malen (optional flach machen)
  path(points, width, color, soft = 1.5) {
    const c = new THREE.Color(color);
    for (let p = 0; p < points.length - 1; p++) {
      const [ax, az] = points[p], [bx, bz] = points[p + 1];
      const len = Math.hypot(bx - ax, bz - az);
      this.region((ax + bx) / 2, (az + bz) / 2, len / 2 + width + soft, (px, pz, k) => {
        const d = segDist(px, pz, ax, az, bx, bz);
        const w = 1 - smoothstep(width / 2, width / 2 + soft, d);
        if (w > 0) this.applyPaint(k, c, w);
      });
    }
  }

  get(i, j) {
    i = clamp(i, 0, this.n - 1);
    j = clamp(j, 0, this.n - 1);
    return this.h[j * this.n + i];
  }

  heightAt(x, z) {
    const fx = (x + this.half) / this.cell, fz = (z + this.half) / this.cell;
    const i = Math.floor(fx), j = Math.floor(fz);
    const u = fx - i, v = fz - j;
    const h00 = this.get(i, j), h10 = this.get(i + 1, j), h01 = this.get(i, j + 1), h11 = this.get(i + 1, j + 1);
    // gleiche Diagonale wie im Mesh (00 -> 11)
    if (u >= v) return h00 + (h10 - h00) * u + (h11 - h10) * v;
    return h00 + (h11 - h01) * u + (h01 - h00) * v;
  }

  slopeAt(x, z) {
    const e = this.cell * 0.5;
    const dx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const dz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return Math.hypot(dx, dz) / (2 * e);
  }

  // colorRule(x, z, h, slope) => THREE.Color
  buildMesh(texture, colorRule, texScale = 0.25) {
    const { n, cell, half } = this;
    const pos = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2), col = new Float32Array(n * n * 3);
    const tmp = new THREE.Color();
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i, x = i * cell - half, z = j * cell - half, h = this.h[k];
        pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
        uv[k * 2] = x * texScale; uv[k * 2 + 1] = z * texScale;
        const slope = this.slopeAt(x, z);
        const c = colorRule(x, z, h, slope, tmp);
        const w = this.paintW[k];
        col[k * 3] = lerp(c.r, this.paintCol[k * 3], w);
        col[k * 3 + 1] = lerp(c.g, this.paintCol[k * 3 + 1], w);
        col[k * 3 + 2] = lerp(c.b, this.paintCol[k * 3 + 2], w);
      }
    }
    const idx = new Uint32Array((n - 1) * (n - 1) * 6);
    let o = 0;
    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        // a=00 b=10 c=01 d=11 ; Dreiecke (00,11,10) und (00,01,11)
        idx[o++] = a; idx[o++] = d; idx[o++] = b;
        idx[o++] = a; idx[o++] = c; idx[o++] = d;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: texture, vertexColors: true }));
    m.matrixAutoUpdate = false;
    return m;
  }
}

// Standard-Farbregel: Gras, Erde, Fels, Sand – mit Rauschen.
export function defaultColorRule({
  grass = 0x5cb338, grass2 = 0x86c940, rock = 0x8c8478, sand = 0xe8d49a, sandLevel = -Infinity,
  dirt = 0x9b6b3d, rockSlope = 0.9, seed = 3,
} = {}) {
  const cg = new THREE.Color(grass), cg2 = new THREE.Color(grass2), cr = new THREE.Color(rock);
  const cs = new THREE.Color(sand), cd = new THREE.Color(dirt);
  const tmp = new THREE.Color();
  return (x, z, h, slope, out) => {
    const n = fbm(x * 0.05, z * 0.05, seed, 2);
    out.copy(cg).lerp(cg2, smoothstep(0.35, 0.7, n));
    const r = smoothstep(rockSlope * 0.7, rockSlope * 1.2, slope);
    if (r > 0) {
      // Felswände mit leichten Farbbändern (Gesteinsschichten)
      const band = 0.88 + Math.sin(h * 0.9 + n * 3) * 0.08 + fbm(x * 0.15, z * 0.15, seed + 9, 1) * 0.1;
      tmp.copy(cr).multiplyScalar(band).lerp(cd, smoothstep(0.62, 0.8, n) * 0.35);
      out.lerp(tmp, r);
    }
    if (h < sandLevel + 1.2) out.lerp(cs, smoothstep(sandLevel + 1.2, sandLevel + 0.2, h));
    const v = 0.92 + fbm(x * 0.3, z * 0.3, seed + 5, 1) * 0.16;
    out.multiplyScalar(v);
    return out;
  };
}
