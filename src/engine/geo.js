// Geometrie-Helfer und statisches Batching.
// Alle unbeweglichen Deko-Objekte eines Levels werden pro Textur zu einem
// einzigen Mesh zusammengefasst – das hält die Draw-Calls auf Handys niedrig.
import * as THREE from 'three';
import { rng } from './util.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

// Matrix aus Position, Rotation (Y, X, Z) und Skalierung.
export function M(x = 0, y = 0, z = 0, ry = 0, s = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  if (Array.isArray(s)) _s.set(s[0], s[1], s[2]);
  else _s.set(s, s, s);
  return new THREE.Matrix4().compose(_v.set(x, y, z), _q, _s);
}

export const G = {
  // Ursprung jeweils unten mittig – praktisch zum Aufstellen.
  box(w, h, d) {
    return new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
  },
  cyl(rTop, rBot, h, seg = 8, open = false) {
    return new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open).translate(0, h / 2, 0);
  },
  cone(r, h, seg = 8) {
    return new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0);
  },
  sphere(r, ws = 10, hs = 8) {
    return new THREE.SphereGeometry(r, ws, hs);
  },
  hemi(r, ws = 12, hs = 6) {
    return new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, Math.PI / 2);
  },
  torus(r, tube, rs = 6, ts = 12, arc = Math.PI * 2) {
    return new THREE.TorusGeometry(r, tube, rs, ts, arc);
  },
  rock(r = 1, seed = 1, detail = 0) {
    const g = new THREE.IcosahedronGeometry(r, detail);
    jitter(g, r * 0.28, seed);
    g.computeVertexNormals();
    return g;
  },
  blob(r = 1, seed = 1) {
    const g = new THREE.IcosahedronGeometry(r, 1);
    jitter(g, r * 0.15, seed);
    g.computeVertexNormals();
    return g;
  },
};

// Verschiebt Vertices zufällig, aber gleiche Positionen gleich (Mesh bleibt geschlossen).
export function jitter(geo, amount, seed = 1) {
  const r = rng(seed);
  const pos = geo.attributes.position;
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let off = map.get(key);
    if (!off) {
      off = [(r() - 0.5) * 2 * amount, (r() - 0.5) * 2 * amount, (r() - 0.5) * 2 * amount];
      map.set(key, off);
    }
    pos.setXYZ(i, pos.getX(i) + off[0], pos.getY(i) + off[1], pos.getZ(i) + off[2]);
  }
  pos.needsUpdate = true;
  return geo;
}

// Weltkoordinaten-basierte UVs (Box-Projektion), damit Texturen gleichmäßig kacheln.
export function worldUV(geo, scale) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 3) {
    // pro Dreieck die dominante Normalenachse wählen
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < 3; k++) {
      nx += Math.abs(nor.getX(i + k));
      ny += Math.abs(nor.getY(i + k));
      nz += Math.abs(nor.getZ(i + k));
    }
    for (let k = 0; k < 3; k++) {
      const j = i + k;
      const x = pos.getX(j), y = pos.getY(j), z = pos.getZ(j);
      let u, v;
      if (ny >= nx && ny >= nz) { u = x; v = z; }
      else if (nx >= nz) { u = z; v = y; }
      else { u = x; v = y; }
      uv[j * 2] = u * scale;
      uv[j * 2 + 1] = v * scale;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

const tmpColor = new THREE.Color();
export function toColor(c) {
  if (c instanceof THREE.Color) return c;
  return tmpColor.set(c);
}

export class Batch {
  constructor(textures) {
    this.textures = textures;
    this.groups = new Map();
  }

  // color: Hex/Color oder Funktion (x, y, z) => THREE.Color
  // uvScale: Zahl = Welt-UVs, null = UVs der Geometrie behalten (skaliert mit uvRepeat)
  add(geo, matrix, color = 0xffffff, tex = 'plain', uvScale = 0.5, opts = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(matrix);
    if (opts.flat) g.computeVertexNormals();
    if (uvScale != null) worldUV(g, uvScale);
    else if (!g.attributes.uv) worldUV(g, 0.5);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const pos = g.attributes.position;
    const fn = typeof color === 'function' ? color : null;
    const base = fn ? null : toColor(color).clone();
    const shadeVar = opts.shade ?? 0;
    const r = shadeVar ? rng(opts.seed ?? n) : null;
    let k = 1;
    for (let i = 0; i < n; i++) {
      // Helligkeit pro Dreieck leicht variieren (typischer Low-Poly-Look)
      if (r && i % 3 === 0) k = 1 - shadeVar + r() * shadeVar * 2;
      const c = fn ? fn(pos.getX(i), pos.getY(i), pos.getZ(i)) : base;
      col[i * 3] = c.r * k;
      col[i * 3 + 1] = c.g * k;
      col[i * 3 + 2] = c.b * k;
    }
    const key = tex + (opts.transparent ? ':t' : '') + (opts.doubleSide ? ':d' : '');
    let grp = this.groups.get(key);
    if (!grp) {
      grp = { tex, opts, parts: [] };
      this.groups.set(key, grp);
    }
    const uvAttr = g.attributes.uv;
    const uvArr = new Float32Array(uvAttr.count * 2);
    const rep = opts.uvRepeat ?? 1;
    for (let i = 0; i < uvAttr.count; i++) {
      uvArr[i * 2] = uvAttr.getX(i) * rep;
      uvArr[i * 2 + 1] = uvAttr.getY(i) * rep;
    }
    grp.parts.push({
      pos: g.attributes.position.array,
      nor: g.attributes.normal.array,
      uv: uvArr,
      col,
    });
    g.dispose();
  }

  build(parent) {
    const meshes = [];
    for (const grp of this.groups.values()) {
      let n = 0;
      for (const p of grp.parts) n += p.pos.length;
      const pos = new Float32Array(n), nor = new Float32Array(n), col = new Float32Array(n);
      const uv = new Float32Array((n / 3) * 2);
      let o = 0, ou = 0;
      for (const p of grp.parts) {
        pos.set(p.pos, o);
        nor.set(p.nor, o);
        col.set(p.col, o);
        uv.set(p.uv, ou);
        o += p.pos.length;
        ou += p.uv.length;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      const mat = new THREE.MeshLambertMaterial({
        map: this.textures[grp.tex] || this.textures.plain,
        vertexColors: true,
        transparent: !!grp.opts.transparent,
        alphaTest: grp.opts.alphaTest ?? 0,
        side: grp.opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.groups.clear();
    return meshes;
  }
}

// Material-Cache für Figuren und bewegliche Objekte.
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts, (k, v) => (v && v.isTexture ? v.uuid : v));
  let m = matCache.get(key);
  if (!m) {
    const { emissive, map, flat, transparent, opacity, side, basic } = opts;
    const Ctor = basic ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial;
    m = new Ctor({ color });
    if (emissive != null && !basic) m.emissive = new THREE.Color(emissive);
    if (map) m.map = map;
    if (flat) m.flatShading = true;
    if (transparent) {
      m.transparent = true;
      m.opacity = opacity ?? 1;
    }
    if (side) m.side = side;
    matCache.set(key, m);
  }
  return m;
}

// Kleiner Baukasten für hierarchische Figuren.
export function part(parent, geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  if (Array.isArray(s)) mesh.scale.set(s[0], s[1], s[2]);
  else mesh.scale.setScalar(s);
  parent.add(mesh);
  return mesh;
}

export function pivot(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
