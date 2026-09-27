// Low-Poly-Figuren aus Grundformen – so wurden viele N64-Charaktere gebaut.
import * as THREE from 'three';
import { G, mat, part, pivot } from '../engine/geo.js';

const cap = (r, l, seg = 6) => new THREE.CapsuleGeometry(r, l, 3, seg);

function eye(parent, x, y, z, r = 0.1, look = 0) {
  const g = pivot(parent, x, y, z);
  part(g, G.sphere(r, 10, 8), mat(0xffffff, { emissive: 0x333333 }), 0, 0, 0, 0, 0, 0, [1, 1.2, 0.7]);
  part(g, G.sphere(r * 0.52, 8, 6), mat(0x111111), look * r * 0.3, 0, r * 0.62);
  part(g, G.sphere(r * 0.16, 6, 4), mat(0xffffff, { basic: true }), look * r * 0.3 + r * 0.15, r * 0.2, r * 0.85);
  return g;
}

// Auge so auf eine (ellipsoide) Kopfoberfläche setzen, dass es leicht herausschaut.
function eyeOn(parent, rad, x, y, r, look = 0, oy = 0) {
  const [rx, ry, rz] = rad;
  const z = rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (y / ry) ** 2));
  return eye(parent, x, y + oy, z - r * 0.3, r, look);
}

let badgerTex = null;
function badgerHeadTexture() {
  if (badgerTex) return badgerTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d');
  // u=0.25 ist vorne (+Z), v=0 oben
  ctx.fillStyle = '#f4f1e8';
  ctx.fillRect(0, 0, 128, 64);
  // Hinterkopf grau
  const back = ctx.createLinearGradient(0, 0, 128, 0);
  back.addColorStop(0, 'rgba(128,133,140,0)');
  back.addColorStop(0.42, 'rgba(128,133,140,0)');
  back.addColorStop(0.55, 'rgba(128,133,140,1)');
  back.addColorStop(0.95, 'rgba(128,133,140,1)');
  back.addColorStop(1, 'rgba(128,133,140,0)');
  ctx.fillStyle = back;
  ctx.fillRect(0, 0, 128, 64);
  // schwarze Streifen über die Augen bis nach hinten
  ctx.fillStyle = '#1d1e22';
  for (const s of [-1, 1]) {
    const cx = 32 + s * 9;
    ctx.beginPath();
    ctx.moveTo(cx - 4.5, 44);
    ctx.quadraticCurveTo(cx - 6, 20, cx + s * 14 - 5, 0);
    ctx.lineTo(cx + s * 14 + 6, 0);
    ctx.quadraticCurveTo(cx + 7, 20, cx + 5, 44);
    ctx.closePath();
    ctx.fill();
  }
  badgerTex = new THREE.CanvasTexture(c);
  badgerTex.colorSpace = THREE.SRGBColorSpace;
  return badgerTex;
}

// ---------------- Bruno der Dachs ----------------
export function makeBruno() {
  const root = new THREE.Group();
  const grey = mat(0x80858c), dark = mat(0x33363c), white = mat(0xf2efe6), black = mat(0x1d1e22);
  const leather = mat(0x7a4a22), scarf = mat(0xd8342a), boots = mat(0x5a3418), pack = mat(0x3f7f3a);

  const hips = pivot(root, 0, 0.72, 0);
  const body = pivot(hips, 0, 0, 0);
  part(body, G.sphere(0.5, 14, 10), grey, 0, 0.32, 0, 0, 0, 0, [1, 1.08, 0.9]);
  part(body, G.sphere(0.4, 12, 8), white, 0, 0.28, 0.2, 0, 0, 0, [0.85, 0.95, 0.6]);
  // Lederhose mit Hosenträgern
  part(body, G.cyl(0.5, 0.46, 0.34, 12), leather, 0, -0.08, 0);
  for (const s of [-1, 1]) {
    part(body, G.box(0.08, 0.62, 0.05), leather, s * 0.2, 0.08, 0.38, -0.25, 0, s * 0.08);
    part(body, G.box(0.08, 0.5, 0.05), leather, s * 0.2, 0.2, -0.4, 0.3, 0, s * 0.08);
  }
  part(body, G.box(0.36, 0.12, 0.06), leather, 0, 0.3, 0.44, -0.3, 0, 0);
  // Rucksack
  part(body, G.box(0.56, 0.56, 0.28), pack, 0, 0.18, -0.52, 0.1, 0, 0);
  part(body, G.box(0.58, 0.14, 0.3), mat(0x2f5f2a), 0, 0.66, -0.55, 0.1, 0, 0);
  // Halstuch
  part(body, G.torus(0.3, 0.1, 6, 12), scarf, 0, 0.72, 0.02, Math.PI / 2 + 0.2, 0, 0);
  part(body, G.cone(0.14, 0.3, 4), scarf, 0.12, 0.54, 0.3, 0.3, 0, Math.PI);

  const head = pivot(body, 0, 0.98, 0.04);
  // Kopf mit aufgemalter Dachs-Maske (so wie N64-Figuren ihre Gesichter bekamen)
  part(head, G.sphere(0.42, 16, 12), mat(0xffffff, { map: badgerHeadTexture() }), 0, 0, 0, 0, 0, 0, [1, 0.95, 1.02]);
  part(head, G.sphere(0.2, 10, 8), white, 0, -0.1, 0.36, 0, 0, 0, [0.95, 0.72, 1.1]);
  part(head, G.sphere(0.085, 8, 6), black, 0, -0.04, 0.57);
  part(head, G.torus(0.07, 0.018, 4, 8, Math.PI), dark, 0, -0.18, 0.47, 0, 0, Math.PI);
  const eyeL = eyeOn(head, [0.42, 0.4, 0.43], -0.15, 0.1, 0.105);
  const eyeR = eyeOn(head, [0.42, 0.4, 0.43], 0.15, 0.1, 0.105);
  for (const s of [-1, 1]) {
    part(head, G.sphere(0.12, 8, 6), dark, s * 0.3, 0.32, -0.08, 0, 0, 0, [1, 1, 0.5]);
    part(head, G.sphere(0.07, 6, 4), white, s * 0.31, 0.36, -0.03, 0, 0, 0, [1, 1, 0.5]);
  }
  // Tirolerhut mit Feder
  part(head, G.cyl(0.27, 0.34, 0.2, 10), mat(0x3b5b2e), 0, 0.3, -0.04, -0.15, 0, 0);
  part(head, G.cyl(0.46, 0.46, 0.04, 12), mat(0x3b5b2e), 0, 0.3, -0.04, -0.15, 0, 0);
  part(head, G.cyl(0.35, 0.35, 0.05, 10), mat(0xc0392b), 0, 0.33, -0.04, -0.15, 0, 0);
  part(head, G.box(0.03, 0.45, 0.1), mat(0x2a3f8a), 0.24, 0.45, -0.12, -0.5, 0, -0.35);

  const arms = [];
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.5, 0.56, 0);
    part(a, cap(0.13, 0.32), dark, s * 0.02, -0.26, 0, 0, 0, s * 0.15);
    part(a, G.sphere(0.16, 8, 6), dark, s * 0.06, -0.52, 0.02);
    arms.push(a);
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const l = pivot(hips, s * 0.24, -0.1, 0);
    part(l, cap(0.14, 0.28), dark, 0, -0.26, 0);
    part(l, G.sphere(0.18, 8, 6), boots, 0, -0.52, 0.07, 0, 0, 0, [1, 0.6, 1.45]);
    legs.push(l);
  }

  const kiki = makeKiki();
  root.add(kiki);
  kiki.scale.setScalar(0.95);

  root.userData.rig = {
    hips, body, head, armL: arms[0], armR: arms[1], legL: legs[0], legR: legs[1],
    eyes: [eyeL, eyeR], kiki,
  };
  return root;
}

// ---------------- Kiki die Elster ----------------
export function makeKiki() {
  const root = new THREE.Group();
  const black = mat(0x1a1d2c), white = mat(0xf4f4f4), blue = mat(0x2d3f9a), beak = mat(0x3a3a3a);
  const body = pivot(root, 0, 0, 0);
  part(body, G.sphere(0.18, 10, 8), black, 0, 0, 0, 0, 0, 0, [1, 1, 1.3]);
  part(body, G.sphere(0.14, 8, 6), white, 0, -0.03, 0.08, 0, 0, 0, [1, 0.9, 1.1]);
  const head = pivot(body, 0, 0.17, 0.12);
  part(head, G.sphere(0.13, 10, 8), black);
  part(head, G.cone(0.045, 0.2, 6), beak, 0, -0.02, 0.18, Math.PI / 2, 0, 0);
  eyeOn(head, [0.13, 0.13, 0.13], -0.06, 0.03, 0.05);
  eyeOn(head, [0.13, 0.13, 0.13], 0.06, 0.03, 0.05);
  // freche Haartolle
  part(head, G.cone(0.04, 0.14, 4), black, 0, 0.14, -0.02, -0.4, 0, 0);
  part(head, G.cone(0.035, 0.12, 4), black, 0.03, 0.13, -0.05, -0.8, 0, 0.3);
  const wings = [];
  for (const s of [-1, 1]) {
    const w = pivot(body, s * 0.15, 0.05, 0);
    part(w, G.sphere(0.16, 8, 6), blue, s * 0.12, 0, -0.02, 0, 0, 0, [1.3, 0.25, 0.9]);
    part(w, G.sphere(0.08, 6, 4), white, s * 0.1, 0.02, 0.03, 0, 0, 0, [1.2, 0.3, 0.8]);
    wings.push(w);
  }
  const tail = pivot(body, 0, 0.02, -0.2);
  part(tail, G.box(0.1, 0.03, 0.42), blue, 0, 0, -0.18, 0.35, 0, 0);
  for (const s of [-1, 1]) part(body, G.cyl(0.018, 0.018, 0.14, 4), beak, s * 0.06, -0.26, 0.02);
  root.userData.rig = { body, head, wingL: wings[0], wingR: wings[1], tail };
  return root;
}

// ---------------- Oma Tilda (Schildkröte) ----------------
export function makeTilda() {
  const root = new THREE.Group();
  const skin = mat(0x9ccf6a), belly = mat(0xf0dc9a), shawl = mat(0x8e4fa8);
  const body = pivot(root, 0, 0, 0);
  part(body, G.sphere(0.6, 12, 10), belly, 0, 0.9, 0.05, 0, 0, 0, [1, 1.15, 0.8]);
  const shell = new THREE.Mesh(G.sphere(0.72, 14, 10), new THREE.MeshLambertMaterial({ map: null, color: 0x6aa84f }));
  shell.position.set(0, 0.95, -0.22);
  shell.scale.set(1, 1.2, 0.75);
  body.add(shell);
  root.userData.shell = shell;
  part(body, G.torus(0.45, 0.12, 6, 14), shawl, 0, 1.55, 0, Math.PI / 2, 0, 0);
  const head = pivot(body, 0, 1.95, 0.12);
  part(head, G.sphere(0.36, 12, 10), skin, 0, 0, 0, 0, 0, 0, [1, 0.9, 1.1]);
  part(head, G.sphere(0.2, 10, 8), skin, 0, -0.1, 0.3, 0, 0, 0, [1.1, 0.7, 0.8]);
  eyeOn(head, [0.36, 0.32, 0.4], -0.13, 0.08, 0.085);
  eyeOn(head, [0.36, 0.32, 0.4], 0.13, 0.08, 0.085);
  // Brille
  for (const s of [-1, 1]) part(head, G.torus(0.11, 0.02, 4, 12), mat(0x8a6a2a), s * 0.13, 0.08, 0.39);
  part(head, G.box(0.06, 0.025, 0.025), mat(0x8a6a2a), 0, 0.09, 0.4);
  // Dutt
  part(head, G.sphere(0.14, 8, 6), mat(0xdedede), 0, 0.33, -0.12);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.58, 1.35, 0.1);
    part(a, cap(0.11, 0.35), skin, 0, -0.25, 0.05, 0.3, 0, s * 0.2);
    arms.push(a);
  }
  // Gehstock
  part(arms[1], G.cyl(0.035, 0.035, 1.3, 6), mat(0x6b4423), 0.1, -1.2, 0.3);
  part(arms[1], G.torus(0.1, 0.035, 4, 8, Math.PI), mat(0x6b4423), 0.0, 0.1, 0.3, 0, 0, 0);
  for (const s of [-1, 1]) part(body, G.sphere(0.22, 8, 6), skin, s * 0.3, 0.15, 0.1, 0, 0, 0, [1, 0.7, 1.3]);
  root.userData.rig = { body, head, armL: arms[0], armR: arms[1] };
  return root;
}

// ---------------- Zauberer Nebelbart ----------------
export function makeNebelbart() {
  const root = new THREE.Group();
  const robe = mat(0x4f3f78), robeDark = mat(0x352a55), skin = mat(0xd8c0a0), beard = mat(0xd8d8e4);
  const body = pivot(root, 0, 0, 0);
  // Wolke
  const cloud = pivot(root, 0, 0, 0);
  const cm = mat(0x9a9aae, { transparent: true, opacity: 0.92 });
  [[0, 0, 0, 0.7], [0.6, 0.05, 0.1, 0.5], [-0.6, 0.05, -0.1, 0.55], [0.1, 0.1, 0.5, 0.5], [-0.1, 0.05, -0.5, 0.5]].forEach(
    ([x, y, z, r]) => part(cloud, G.sphere(r, 10, 8), cm, x, y, z, 0, 0, 0, [1, 0.6, 1]));
  part(body, G.cone(0.75, 1.7, 12), robe, 0, 0.1, 0);
  part(body, G.torus(0.62, 0.08, 6, 14), robeDark, 0, 0.35, 0, Math.PI / 2, 0, 0);
  const head = pivot(body, 0, 1.95, 0);
  part(head, G.sphere(0.36, 12, 10), skin);
  part(head, G.cone(0.1, 0.45, 6), skin, 0, -0.05, 0.35, Math.PI / 2 + 0.4, 0, 0);
  for (const s of [-1, 1]) {
    const e = pivot(head, s * 0.14, 0.08, 0.3);
    part(e, G.sphere(0.07, 8, 6), mat(0xfff27a, { emissive: 0xaa9900 }), 0, 0, 0, 0, 0, 0, [1, 0.7, 0.6]);
    part(head, G.box(0.18, 0.05, 0.05), mat(0x777788), s * 0.15, 0.19, 0.3, 0, 0, -s * 0.35);
  }
  // Bart
  part(head, G.cone(0.34, 1.3, 8), beard, 0, -1.45, 0.14, Math.PI, 0, 0);
  part(head, G.sphere(0.3, 10, 8), beard, 0, -0.22, 0.15, 0, 0, 0, [1.1, 0.8, 0.8]);
  // Hut
  const hat = pivot(head, 0, 0.22, -0.05);
  part(hat, G.cyl(0.62, 0.62, 0.06, 14), robeDark, 0, 0, 0);
  part(hat, G.cone(0.4, 1.3, 10), robe, 0, 0, 0, -0.25, 0, 0.12);
  part(hat, G.torus(0.37, 0.05, 4, 12), mat(0xc9b037), 0, 0.12, 0, Math.PI / 2, 0, 0);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.45, 1.5, 0);
    part(a, cap(0.13, 0.5), robe, s * 0.12, -0.3, 0.1, 0.4, 0, s * 0.5);
    part(a, G.sphere(0.11, 8, 6), skin, s * 0.32, -0.55, 0.3);
    arms.push(a);
  }
  // Zauberstab
  const staff = pivot(arms[1], 0.32, -0.55, 0.3);
  part(staff, G.cyl(0.04, 0.04, 1.8, 6), mat(0x4b3621), 0, -0.9, 0);
  const orb = part(staff, G.sphere(0.16, 10, 8), mat(0xb79cff, { emissive: 0x6a3cff }), 0, 0.98, 0);
  root.userData.rig = { body, head, cloud, armL: arms[0], armR: arms[1], orb, hat };
  return root;
}

// ---------------- Igel ----------------
export function makeHedgehog(scale = 1, apron = false) {
  const root = new THREE.Group();
  const brown = mat(0x8b5a2b), spike = mat(0x4a2e14), face = mat(0xf0c89a);
  const body = pivot(root, 0, 0, 0);
  part(body, G.sphere(0.5, 12, 10), face, 0, 0.5, 0.05, 0, 0, 0, [0.9, 1, 0.8]);
  part(body, G.sphere(0.55, 12, 10), brown, 0, 0.55, -0.12, 0, 0, 0, [1, 1, 0.9]);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 * 3.1, t = (i % 7) / 7;
    const rx = -0.6 - t * 1.4, ry = Math.sin(a) * 0.9;
    const s = pivot(body, 0, 0.55, -0.12);
    s.rotation.set(rx, ry, 0);
    part(s, G.cone(0.1, 0.45, 4), spike, 0, 0.42, 0);
  }
  const head = pivot(body, 0, 0.72, 0.28);
  part(head, G.cone(0.16, 0.4, 8), face, 0, 0, 0.1, Math.PI / 2, 0, 0);
  part(head, G.sphere(0.07, 6, 4), mat(0x222222), 0, 0, 0.5);
  eye(head, -0.13, 0.1, 0.05, 0.07);
  eye(head, 0.13, 0.1, 0.05, 0.07);
  if (apron) {
    part(body, G.sphere(0.4, 10, 8), mat(0xf6f0ff), 0, 0.35, 0.22, 0, 0, 0, [0.9, 0.9, 0.5]);
    part(head, G.torus(0.2, 0.05, 4, 10), mat(0xe24a8a), 0, 0.22, -0.12, 1.2, 0, 0);
  }
  for (const s of [-1, 1]) part(body, G.sphere(0.12, 6, 4), face, s * 0.22, 0.05, 0.1, 0, 0, 0, [1, 0.6, 1.4]);
  root.scale.setScalar(scale);
  root.userData.rig = { body, head };
  return root;
}

// ---------------- Pedro der Pelikan (Pirat) ----------------
export function makePelican() {
  const root = new THREE.Group();
  const white = mat(0xf4f1ea), orange = mat(0xf29a2e), black = mat(0x1a1a1a);
  const body = pivot(root, 0, 0, 0);
  part(body, G.sphere(0.55, 12, 10), white, 0, 0.9, 0, 0, 0, 0, [0.9, 1.1, 1.1]);
  for (const s of [-1, 1]) {
    part(body, G.cyl(0.05, 0.05, 0.5, 5), orange, s * 0.2, 0.05, 0);
    part(body, G.box(0.22, 0.05, 0.3), orange, s * 0.2, 0.0, 0.1);
    part(body, G.sphere(0.35, 8, 6), mat(0xdedad0), s * 0.45, 0.95, -0.05, 0, 0, 0, [0.3, 0.8, 1.1]);
  }
  const head = pivot(body, 0, 1.7, 0.2);
  part(head, cap(0.18, 0.35), white, 0, -0.2, 0);
  part(head, G.sphere(0.25, 10, 8), white);
  part(head, G.cone(0.1, 0.8, 6), orange, 0, -0.02, 0.5, Math.PI / 2 + 0.15, 0, 0);
  part(head, G.sphere(0.2, 8, 6), mat(0xf5b55a), 0, -0.17, 0.4, 0, 0, 0, [0.7, 0.6, 1.6]);
  eyeOn(head, [0.25, 0.25, 0.25], 0.12, 0.08, 0.07);
  // Augenklappe
  part(head, G.cyl(0.08, 0.08, 0.03, 8), black, -0.12, 0.08, 0.2, Math.PI / 2 - 0.3, 0, 0);
  part(head, G.torus(0.25, 0.012, 3, 12), black, 0, 0.06, 0.02, 0.3, 0, 0);
  // Piratenhut
  part(head, G.box(0.7, 0.2, 0.3), black, 0, 0.26, -0.02);
  part(head, G.sphere(0.2, 8, 6), black, 0, 0.3, -0.02, 0, 0, 0, [1.2, 1, 0.8]);
  part(head, G.box(0.14, 0.1, 0.02), white, 0, 0.3, 0.14);
  root.userData.rig = { body, head };
  return root;
}

// ---------------- Gegner ----------------
export function makeBeetle(color = 0x5b3f8f) {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  part(body, G.hemi(0.55, 12, 6), mat(color), 0, 0.3, -0.05, 0, 0, 0, [1, 0.9, 1.2]);
  part(body, G.box(0.03, 0.02, 1.2), mat(0x2b1f45), 0, 0.8, -0.05, 0, 0, 0);
  part(body, G.sphere(0.42, 10, 8), mat(0x2a2a33), 0, 0.3, 0, 0, 0, 0, [1.05, 0.5, 1.2]);
  const head = pivot(body, 0, 0.38, 0.55);
  part(head, G.sphere(0.25, 10, 8), mat(0x2a2a33));
  for (const s of [-1, 1]) {
    const e = pivot(head, s * 0.11, 0.08, 0.18);
    part(e, G.sphere(0.08, 8, 6), mat(0xff4a3a, { emissive: 0x991100 }), 0, 0, 0, 0, 0, 0, [1, 0.7, 0.6]);
    part(head, G.box(0.14, 0.04, 0.04), mat(0x111111), s * 0.11, 0.18, 0.18, 0, 0, s * 0.4);
    part(head, G.cyl(0.015, 0.015, 0.4, 4), mat(0x111111), s * 0.1, 0.15, 0.05, -0.5, 0, s * 0.4);
    part(head, G.cone(0.05, 0.15, 4), mat(0xdddddd), s * 0.1, -0.12, 0.2, 2.6, 0, 0);
  }
  const legs = [];
  for (let i = 0; i < 6; i++) {
    const s = i < 3 ? -1 : 1, k = i % 3;
    const l = pivot(body, s * 0.38, 0.25, -0.3 + k * 0.3);
    part(l, G.cyl(0.04, 0.03, 0.35, 4), mat(0x111111), s * 0.12, -0.2, 0, 0, 0, s * 0.7);
    legs.push(l);
  }
  root.userData.rig = { body, head, legs };
  return root;
}

export function makeGrimmpilz() {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  part(body, G.cyl(0.3, 0.38, 0.7, 10), mat(0xf1e3c6), 0, 0, 0);
  const capMesh = new THREE.Mesh(G.hemi(0.6, 12, 6), mat(0x8e2a9e));
  capMesh.position.y = 0.65;
  capMesh.scale.set(1, 0.75, 1);
  body.add(capMesh);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(body, G.sphere(0.09, 6, 4), mat(0xfff2c0), Math.cos(a) * 0.38, 0.85, Math.sin(a) * 0.38, 0, 0, 0, [1, 0.5, 1]);
  }
  for (const s of [-1, 1]) {
    eye(body, s * 0.12, 0.42, 0.33, 0.08, -s);
    part(body, G.box(0.16, 0.04, 0.04), mat(0x331111), s * 0.12, 0.55, 0.33, 0, 0, s * 0.5);
  }
  part(body, G.box(0.2, 0.05, 0.05), mat(0x331111), 0, 0.22, 0.34);
  root.userData.rig = { body };
  return root;
}

export function makeCrab(big = false) {
  const root = new THREE.Group();
  const red = mat(big ? 0xd23a2a : 0xe8553a), dark = mat(0x8a1a12);
  const body = pivot(root, 0, 0, 0);
  part(body, G.sphere(0.55, 12, 8), red, 0, 0.45, 0, 0, 0, 0, [1.3, 0.6, 1]);
  const claws = [];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const l = pivot(body, s * 0.55, 0.35, -0.25 + k * 0.25);
      part(l, G.cyl(0.05, 0.04, 0.5, 4), dark, s * 0.2, -0.15, 0, 0, 0, s * 1.0);
    }
    const c = pivot(body, s * 0.6, 0.55, 0.45);
    part(c, cap(0.08, 0.3), red, 0, 0, 0.1, 1.2, 0, 0);
    part(c, G.sphere(0.25, 10, 8), red, 0, 0.05, 0.4, 0, 0, 0, [0.9, 0.7, 1.2]);
    part(c, G.cone(0.1, 0.3, 5), dark, s * -0.06, 0.12, 0.62, 1.4, 0, 0);
    claws.push(c);
    const st = pivot(body, s * 0.18, 0.7, 0.3);
    part(st, G.cyl(0.04, 0.04, 0.3, 4), red, 0, 0, 0);
    eye(st, 0, 0.35, 0, 0.1);
  }
  if (big) {
    // Piratenkapitän
    part(body, G.box(1.1, 0.3, 0.5), mat(0x1a1a1a), 0, 0.85, 0);
    part(body, G.sphere(0.35, 8, 6), mat(0x1a1a1a), 0, 0.9, 0, 0, 0, 0, [1.4, 1, 0.8]);
    part(body, G.box(0.2, 0.14, 0.02), mat(0xffffff), 0, 1.05, 0.27);
  }
  root.userData.rig = { body, claws };
  return root;
}

export function makeFogImp() {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  const m = mat(0xb6b0d0, { transparent: true, opacity: 0.85, emissive: 0x302850 });
  part(body, G.sphere(0.45, 12, 10), m, 0, 0, 0);
  part(body, G.cone(0.3, 0.8, 8), m, 0, -0.2, -0.2, 2.4, 0, 0);
  for (const s of [-1, 1]) {
    part(body, G.sphere(0.1, 8, 6), mat(0xffee44, { emissive: 0xaa8800 }), s * 0.15, 0.1, 0.38, 0, 0, 0, [1, 0.6, 0.6]);
    part(body, G.cone(0.08, 0.22, 4), m, s * 0.3, 0.35, 0, 0, 0, -s * 0.5);
  }
  part(body, G.box(0.24, 0.06, 0.05), mat(0x221a33), 0, -0.1, 0.42);
  root.userData.rig = { body };
  return root;
}

// ---------------- Sammelobjekte ----------------
export function makeShard() {
  const root = new THREE.Group();
  const gold = mat(0xffc93a, { emissive: 0x996600 });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), gold);
  core.scale.set(0.75, 1.3, 0.35);
  root.add(core);
  // Strahlen
  const rayMat = mat(0xfff08a, { emissive: 0xaa8a00 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = part(root, G.cone(0.12, 0.35, 4), rayMat, Math.cos(a) * 0.62, Math.sin(a) * 0.75, 0, 0, 0, a - Math.PI / 2, 1);
    r.scale.z = 0.4;
  }
  eye(root, -0.14, 0.12, 0.17, 0.1);
  eye(root, 0.14, 0.12, 0.17, 0.1);
  part(root, G.torus(0.1, 0.03, 4, 8, Math.PI), mat(0x7a4a00), 0, -0.1, 0.18, 0, 0, Math.PI);
  return root;
}

export function makeApple() {
  const root = new THREE.Group();
  part(root, G.sphere(0.3, 10, 8), mat(0xe0302a, { emissive: 0x330000 }), 0, 0, 0, 0, 0, 0, [1, 0.9, 1]);
  part(root, G.cyl(0.03, 0.03, 0.2, 4), mat(0x5a3a1a), 0, 0.22, 0);
  part(root, G.sphere(0.1, 6, 4), mat(0x3cae3c), 0.1, 0.3, 0, 0, 0, 0.5, [1.3, 0.3, 0.7]);
  return root;
}

export function makeLernstein() {
  const root = new THREE.Group();
  part(root, G.rock(0.9, 7), mat(0x8a8f99, { flat: true }), 0, 0.9, 0, 0, 0, 0, [0.8, 1.4, 0.7]);
  // eigenes Material, weil die Rune je nach Zustand anders leuchtet
  const rune = part(root, G.torus(0.25, 0.06, 4, 10), mat(0x7af0ff, { emissive: 0x2aa0cc }).clone(), 0, 1.1, 0.5);
  part(root, G.box(0.06, 0.4, 0.06), mat(0x7af0ff, { emissive: 0x2aa0cc }), 0, 0.9, 0.52);
  root.userData.rune = rune;
  return root;
}
