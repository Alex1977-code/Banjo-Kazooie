// Kleine Mathe- und Zufallshelfer, die überall gebraucht werden.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// Framerate-unabhängiges Nachziehen: nach 1/rate Sekunden ~63% des Weges.
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

export const TAU = Math.PI * 2;
export function wrapAngle(a) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}
export const angleDiff = (from, to) => wrapAngle(to - from);
export const dampAngle = (a, b, rate, dt) => a + angleDiff(a, b) * (1 - Math.exp(-rate * dt));

// Deterministischer Zufall, damit Level jedes Mal gleich aussehen.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, z, seed) {
  let h = Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Einfaches Value-Noise, reicht für Hügel und Farbvariation.
export function noise2(x, z, seed = 0) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi, seed), b = hash2(xi + 1, zi, seed);
  const c = hash2(xi, zi + 1, seed), d = hash2(xi + 1, zi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x, z, seed = 0, oct = 3) {
  let amp = 1, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += noise2(x * f, z * f, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

export const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// Punkt-zu-Strecke-Abstand in der XZ-Ebene (für Wege).
export function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz || 1;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function choice(r, arr) {
  return arr[Math.floor(r() * arr.length) % arr.length];
}
