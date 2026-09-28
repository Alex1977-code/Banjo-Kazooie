// Prozedurale Low-Res-Texturen im Stil von N64-Spielen.
// Die meisten Texturen sind hell/graustufig und werden über Vertex-Farben
// eingefärbt – genau so, wie es viele N64-Spiele gemacht haben.
import * as THREE from 'three';
import { rng, noise2 } from './util.js';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(c, { repeat = true, nearest = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  // N64 hatte bilineare Filterung – also bewusst "weich".
  t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
  t.minFilter = nearest ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
  t.anisotropy = 1;
  return t;
}

// Füllt Pixel über eine Funktion (x, y) => [r, g, b] oder [r, g, b, a] in 0..255.
function pixels(c, fn) {
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const p = fn(x, y);
      const i = (y * c.width + x) * 4;
      img.data[i] = p[0];
      img.data[i + 1] = p[1];
      img.data[i + 2] = p[2];
      img.data[i + 3] = p.length > 3 ? p[3] : 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return ctx;
}

// Kachelbares Noise: an den Rändern umbrechen.
function tileNoise(x, y, size, freq, seed) {
  const f = freq;
  const nx = (x / size) * f, ny = (y / size) * f;
  const a = noise2(nx, ny, seed), b = noise2(nx - f, ny, seed);
  const c = noise2(nx, ny - f, seed), d = noise2(nx - f, ny - f, seed);
  const u = x / size, v = y / size;
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

const g = (v) => [v, v, v];

function groundTex() {
  const S = 64, c = canvas(S), r = rng(11);
  const ctx = pixels(c, (x, y) => {
    const n = tileNoise(x, y, S, 8, 3) * 0.6 + tileNoise(x, y, S, 16, 5) * 0.4;
    return g(200 + n * 55);
  });
  // kleine Grashalme / Sprenkel
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, l = 2 + r() * 3;
    ctx.strokeStyle = r() < 0.5 ? 'rgba(120,120,120,0.35)' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 2, y - l);
    ctx.stroke();
  }
  return toTexture(c);
}

// Schnee: fast weiß mit weichen Verwehungen und Glitzerpunkten
function snowTex() {
  const S = 64, c = canvas(S), r = rng(17);
  const ctx = pixels(c, (x, y) => {
    const n = tileNoise(x, y, S, 5, 21) * 0.6 + tileNoise(x, y, S, 12, 23) * 0.4;
    const v = 222 + n * 33;
    return [v - 6, v, 255];
  });
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(180,210,255,0.5)';
    ctx.fillRect(Math.floor(r() * S), Math.floor(r() * S), 1, 1);
  }
  return toTexture(c);
}

// Eis: bläulich mit hellen Rissen
function iceTex() {
  const S = 64, c = canvas(S), r = rng(29);
  const ctx = pixels(c, (x, y) => {
    const n = tileNoise(x, y, S, 4, 31);
    const v = 200 + n * 50;
    return [v * 0.86, v * 0.95, v];
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    let x = r() * S, y = r() * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (r() - 0.5) * 18;
      y += (r() - 0.5) * 18;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return toTexture(c);
}

function sandTex() {
  const S = 64, c = canvas(S);
  const r = rng(5);
  pixels(c, (x, y) => {
    const n = tileNoise(x, y, S, 6, 9);
    const sp = r() < 0.08 ? -30 : r() < 0.05 ? 20 : 0;
    // leichte Rippel
    const rip = Math.sin((y / S) * Math.PI * 8 + n * 4) * 8;
    return g(Math.min(255, 215 + n * 30 + sp + rip));
  });
  return toTexture(c);
}

function rockTex() {
  const S = 64, c = canvas(S), r = rng(21);
  const ctx = pixels(c, (x, y) => {
    const n = tileNoise(x, y, S, 4, 7) * 0.5 + tileNoise(x, y, S, 12, 8) * 0.5;
    return g(150 + n * 100);
  });
  ctx.strokeStyle = 'rgba(60,60,60,0.55)';
  for (let i = 0; i < 9; i++) {
    let x = r() * S, y = r() * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (r() - 0.5) * 18;
      y += (r() - 0.5) * 18;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return toTexture(c);
}

function woodTex() {
  const S = 64, c = canvas(S);
  const ctx = pixels(c, (x, y) => {
    const plank = Math.floor(y / 16);
    const grain = Math.sin(x * 0.35 + plank * 3 + Math.sin(y * 0.8) * 0.8) * 0.5 + 0.5;
    const n = tileNoise(x, y, S, 8, 13 + plank);
    let v = 185 + grain * 35 + n * 30;
    if (y % 16 === 0 || y % 16 === 15) v -= 80;
    return g(Math.min(255, v));
  });
  // Nagelköpfe
  ctx.fillStyle = 'rgba(70,70,70,0.8)';
  for (let p = 0; p < 4; p++) {
    ctx.fillRect(4, p * 16 + 7, 2, 2);
    ctx.fillRect(58, p * 16 + 7, 2, 2);
  }
  return toTexture(c);
}

function barkTex() {
  const S = 64, c = canvas(S);
  pixels(c, (x, y) => {
    const n = tileNoise(x, y, S, 6, 31);
    const groove = Math.abs(Math.sin((x / S) * Math.PI * 6 + tileNoise(x, y, S, 3, 32) * 3));
    return g(120 + groove * 90 + n * 40);
  });
  return toTexture(c);
}

function leavesTex() {
  const S = 64, c = canvas(S), r = rng(41);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(170,170,170)';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 140; i++) {
    const x = r() * S, y = r() * S, s = 3 + r() * 5;
    const v = Math.floor(150 + r() * 105);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.6, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    // Kacheln: an Rändern duplizieren
    if (x < s || x > S - s || y < s || y > S - s) {
      for (const [ox, oy] of [[S, 0], [-S, 0], [0, S], [0, -S]]) {
        ctx.beginPath();
        ctx.ellipse(x + ox, y + oy, s, s * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return toTexture(c);
}

function brickTex() {
  const S = 64, c = canvas(S);
  pixels(c, (x, y) => {
    const row = Math.floor(y / 11);
    const off = row % 2 ? 11 : 0;
    const bx = (x + off) % 22, by = y % 11;
    const mortar = bx < 2 || by < 2;
    const n = tileNoise(x, y, S, 10, 51 + row);
    return g(mortar ? 120 : 190 + n * 55);
  });
  return toTexture(c);
}

function tilesTex() {
  const S = 64, c = canvas(S);
  pixels(c, (x, y) => {
    const row = Math.floor(y / 10);
    const off = row % 2 ? 8 : 0;
    const bx = (x + off) % 16, by = y % 10;
    const shade = 150 + by * 10 - (bx < 1 ? 60 : 0);
    const n = tileNoise(x, y, S, 12, 61);
    return g(Math.min(255, shade + n * 30));
  });
  return toTexture(c);
}

function stoneTex() {
  // grobe Pflastersteine
  const S = 64, c = canvas(S), r = rng(71);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(110,110,110)';
  ctx.fillRect(0, 0, S, S);
  for (let yy = 0; yy < 4; yy++) {
    for (let xx = 0; xx < 4; xx++) {
      const v = Math.floor(175 + r() * 60);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      const x = xx * 16 + (yy % 2) * 8, y = yy * 16;
      for (const ox of [0, -S]) {
        ctx.beginPath();
        ctx.roundRect(x + ox + 1.5, y + 1.5, 13, 13, 4);
        ctx.fill();
      }
    }
  }
  return toTexture(c);
}

function waterTex() {
  const S = 64, c = canvas(S);
  pixels(c, (x, y) => {
    const n = tileNoise(x, y, S, 4, 81);
    const w = Math.sin((x / S) * Math.PI * 4 + n * 6) * Math.sin((y / S) * Math.PI * 4 + n * 5);
    const v = w > 0.55 ? 255 : 200 + n * 40;
    return [v * 0.8, v * 0.95, v, 255];
  });
  return toTexture(c);
}

function mushroomTex() {
  const S = 64, c = canvas(S), r = rng(91);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, S, S);
  // Grundton wird per Vertexfarbe gesetzt; Punkte bleiben durch "screen" hell.
  ctx.fillStyle = 'rgb(205,205,205)';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) {
    const x = (i % 3) * 22 + 8 + r() * 4, y = Math.floor(i / 3) * 32 + 10 + r() * 6;
    ctx.beginPath();
    ctx.arc(x, y, 5 + r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c);
}

function shellTex() {
  const S = 64, c = canvas(S);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7dbb4a';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#3e6b22';
  ctx.lineWidth = 3;
  const hex = (cx, cy, s) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
    }
    ctx.closePath();
    ctx.fillStyle = '#95d15d';
    ctx.fill();
    ctx.stroke();
  };
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) hex(x * 18 + (y % 2) * 9, y * 16 + 8, 8);
  return toTexture(c);
}

function portalTex() {
  const S = 128, c = canvas(S);
  pixels(c, (x, y) => {
    const dx = x / S - 0.5, dy = y / S - 0.5;
    const a = Math.atan2(dy, dx), d = Math.hypot(dx, dy);
    const s = Math.sin(a * 3 + d * 30) * 0.5 + 0.5;
    return [120 + s * 135, 60 + s * 120, 200 + s * 55, 255];
  });
  return toTexture(c, { repeat: true });
}

function plainTex() {
  const c = canvas(4);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 4, 4);
  return toTexture(c);
}

// ---------- Sprite-Texturen ----------

function radial(S, stops) {
  const c = canvas(S), ctx = c.getContext('2d');
  const gr = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, S, S);
  return c;
}

function berrySprite() {
  const S = 64, c = canvas(S), ctx = c.getContext('2d');
  // Himbeer-artige Beere aus Kügelchen + Blatt
  const drupe = (x, y, r) => {
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, '#ffb3c7');
    gr.addColorStop(0.4, '#ff2d55');
    gr.addColorStop(1, '#8a0020');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.fillStyle = '#5a0012';
  ctx.beginPath();
  ctx.ellipse(32, 38, 20, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  const pts = [[24, 28], [36, 26], [44, 34], [20, 40], [32, 38], [42, 46], [26, 50], [36, 54]];
  for (const [x, y] of pts) drupe(x, y, 8);
  ctx.fillStyle = '#2fae3a';
  ctx.strokeStyle = '#145a1a';
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(32 + s * 8, 14, 9, 4, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  return toTexture(c, { repeat: false });
}

function sparkSprite() {
  const S = 32, c = canvas(S), ctx = c.getContext('2d');
  const gr = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(16, 0); ctx.lineTo(18, 14); ctx.lineTo(32, 16); ctx.lineTo(18, 18);
  ctx.lineTo(16, 32); ctx.lineTo(14, 18); ctx.lineTo(0, 16); ctx.lineTo(14, 14);
  ctx.closePath();
  ctx.fill();
  return toTexture(c, { repeat: false });
}

function puffSprite() {
  const S = 32, c = canvas(S), ctx = c.getContext('2d');
  const r = rng(3);
  for (let i = 0; i < 6; i++) {
    const x = 10 + r() * 12, y = 10 + r() * 12, rad = 6 + r() * 6;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, S, S);
  }
  return toTexture(c, { repeat: false });
}

export function makeTextures() {
  return {
    ground: groundTex(),
    sand: sandTex(),
    rock: rockTex(),
    wood: woodTex(),
    bark: barkTex(),
    leaves: leavesTex(),
    brick: brickTex(),
    tiles: tilesTex(),
    stone: stoneTex(),
    water: waterTex(),
    snow: snowTex(),
    ice: iceTex(),
    mushroom: mushroomTex(),
    shell: shellTex(),
    portal: portalTex(),
    plain: plainTex(),
    // Sprites
    berry: berrySprite(),
    spark: sparkSprite(),
    puff: puffSprite(),
    glow: toTexture(radial(64, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]), { repeat: false }),
    shadow: toTexture(radial(64, [[0, 'rgba(0,0,0,0.78)'], [0.55, 'rgba(0,0,0,0.62)'], [0.8, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]), { repeat: false }),
  };
}
