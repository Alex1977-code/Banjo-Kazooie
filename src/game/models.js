// Low-Poly-Figuren aus Grundformen – so wurden viele N64-Charaktere gebaut.
import * as THREE from 'three';
import { G, mat, part, pivot, mergeGeos } from '../engine/geo.js';

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

// Federkleid des Rennkuckucks: braun mit dunklen Strichen und hellen Tupfen
let streakTex = null;
function streakTexture() {
  if (streakTex) return streakTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c29a6a';
  ctx.fillRect(0, 0, 64, 32);
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const x = r() * 64, y = r() * 32;
    ctx.fillStyle = r() < 0.6 ? 'rgba(46,30,16,0.9)' : 'rgba(250,240,215,0.95)';
    ctx.beginPath();
    ctx.ellipse(x, y, 0.9 + r(), 2.2 + r() * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  streakTex = new THREE.CanvasTexture(c);
  streakTex.colorSpace = THREE.SRGBColorSpace;
  streakTex.wrapS = streakTex.wrapT = THREE.RepeatWrapping;
  return streakTex;
}

// Kopf-Textur des Dachses: weißes Gesicht, graue Streifen über den Augen bis nach hinten
let badgerTex = null;
function badgerHeadTexture() {
  if (badgerTex) return badgerTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d');
  // u=0.25 ist vorne (+Z), v=0 oben
  ctx.fillStyle = '#f3efe7';
  ctx.fillRect(0, 0, 128, 64);
  const grey = '#50545d';
  // Hinterkopf grau
  const back = ctx.createLinearGradient(0, 0, 128, 0);
  back.addColorStop(0, 'rgba(80,84,93,0)');
  back.addColorStop(0.44, 'rgba(80,84,93,0)');
  back.addColorStop(0.56, 'rgba(80,84,93,1)');
  back.addColorStop(0.94, 'rgba(80,84,93,1)');
  back.addColorStop(1, 'rgba(80,84,93,0)');
  ctx.fillStyle = back;
  ctx.fillRect(0, 0, 128, 40);
  // breite graue Bänder über die Augen, zwischen ihnen der weiße Mittelstreifen
  ctx.fillStyle = grey;
  for (const s of [-1, 1]) {
    const cx = 32 + s * 10;
    ctx.beginPath();
    ctx.moveTo(cx - 6, 38);
    ctx.quadraticCurveTo(cx - 8, 16, cx + s * 16 - 7, 0);
    ctx.lineTo(cx + s * 16 + 9, 0);
    ctx.quadraticCurveTo(cx + 10, 18, cx + 7, 38);
    ctx.quadraticCurveTo(cx, 42, cx - 6, 38);
    ctx.fill();
  }
  badgerTex = new THREE.CanvasTexture(c);
  badgerTex.colorSpace = THREE.SRGBColorSpace;
  return badgerTex;
}

// ---------------- Bruno der Dachs ----------------
export function makeBruno() {
  const root = new THREE.Group();
  const grey = mat(0x50545d), cream = mat(0xf0e4cc), white = mat(0xf3efe7), pink = mat(0xd89a9a);
  const nose = mat(0x4a302c), dark = mat(0x2a1c18);
  const scarf = mat(0xd9772e), patch = mat(0xeaa064), glove = mat(0x7a4a2c), gold = mat(0xd9ab34);
  const leather = mat(0x6e4526), boot = mat(0x3d6b95), sole = mat(0x5a3418);

  const hips = pivot(root, 0, 0.72, 0);
  const body = pivot(hips, 0, 0, 0);
  // birnenförmiger Körper mit hellem Bauch
  part(body, G.sphere(0.55, 14, 10), grey, 0, 0.3, 0, 0, 0, 0, [1, 1.1, 0.92]);
  part(body, G.sphere(0.46, 12, 8), cream, 0, 0.2, 0.27, 0, 0, 0, [0.86, 1.02, 0.62]);
  // Gürtel mit Goldschnalle und zwei Taschen
  part(body, G.cyl(0.56, 0.54, 0.14, 14), leather, 0, -0.06, 0);
  part(body, G.box(0.22, 0.15, 0.05), gold, 0, -0.07, 0.53);
  part(body, G.box(0.12, 0.07, 0.06), leather, 0, -0.03, 0.54);
  for (const s of [-1, 1]) {
    part(body, G.box(0.22, 0.22, 0.14), glove, s * 0.37, -0.14, 0.38, 0, -s * 0.65, 0);
    part(body, G.box(0.24, 0.07, 0.16), leather, s * 0.37, 0.04, 0.38, 0, -s * 0.65, 0);
  }
  // oranges Halstuch mit Flicken
  part(body, G.torus(0.3, 0.09, 6, 12), scarf, 0, 0.72, 0.02, Math.PI / 2 + 0.2, 0, 0);
  part(body, G.cone(0.34, 0.42, 3), scarf, 0.04, 0.3, 0.42, 0.28, 0, Math.PI, [1, 1, 0.3]);
  part(body, G.box(0.11, 0.1, 0.03), patch, -0.08, 0.6, 0.5, -0.3, 0.2, 0.3);
  // Rucksack aus Leder – hier wohnt Kiki
  part(body, G.box(0.64, 0.64, 0.38), leather, 0, -0.02, -0.6, 0.08, 0, 0);
  part(body, G.box(0.68, 0.1, 0.42), mat(0x4e3018), 0, 0.58, -0.63, 0.08, 0, 0);
  part(body, G.box(0.16, 0.12, 0.03), gold, 0, 0.18, -0.8, 0.08, 0, 0);
  for (const s of [-1, 1]) part(body, G.box(0.07, 0.5, 0.06), leather, s * 0.22, 0.3, 0.33, -0.35, 0, s * 0.1);

  const head = pivot(body, 0, 0.98, 0.04);
  part(head, G.sphere(0.43, 16, 12), mat(0xffffff, { map: badgerHeadTexture() }), 0, 0, 0, 0, 0, 0, [1, 0.95, 1]);
  // weiße Schnauze, große dunkle Nase, Lächeln
  part(head, G.sphere(0.22, 12, 8), white, 0, -0.11, 0.32, 0, 0, 0, [1.05, 0.75, 1]);
  part(head, G.sphere(0.1, 10, 8), nose, 0, -0.03, 0.53, 0, 0, 0, [1.3, 0.9, 0.9]);
  part(head, G.torus(0.09, 0.018, 4, 8, Math.PI), dark, 0, -0.2, 0.46, 0, 0, Math.PI);
  const eyeL = eyeOn(head, [0.43, 0.41, 0.43], -0.15, 0.1, 0.095);
  const eyeR = eyeOn(head, [0.43, 0.41, 0.43], 0.15, 0.1, 0.095);
  // kleine runde Ohren mit rosa Innenseite
  for (const s of [-1, 1]) {
    part(head, G.sphere(0.12, 10, 8), grey, s * 0.3, 0.3, -0.06, 0, 0, 0, [1, 1, 0.55]);
    part(head, G.sphere(0.07, 8, 6), pink, s * 0.3, 0.3, -0.01, 0, 0, 0, [1, 1, 0.4]);
  }

  // Arme mit großen braunen Handschuhen und Goldringen
  const arms = [];
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.53, 0.56, 0);
    part(a, cap(0.14, 0.26), grey, s * 0.02, -0.2, 0, 0, 0, s * 0.15);
    part(a, G.cyl(0.19, 0.14, 0.2, 10), glove, s * 0.05, -0.47, 0.02, 0, 0, s * 0.15);
    part(a, G.torus(0.17, 0.035, 4, 10), gold, s * 0.06, -0.36, 0.02, Math.PI / 2, 0, 0);
    part(a, G.sphere(0.18, 8, 6), glove, s * 0.07, -0.58, 0.03, 0, 0, 0, [1, 1.05, 0.85]);
    arms.push(a);
  }
  // Beine mit blauen Stiefeln
  const legs = [];
  for (const s of [-1, 1]) {
    const l = pivot(hips, s * 0.25, -0.1, 0);
    part(l, cap(0.15, 0.18), grey, 0, -0.2, 0);
    part(l, G.cyl(0.17, 0.19, 0.26, 10), boot, 0, -0.56, 0.02);
    part(l, G.sphere(0.2, 8, 6), boot, 0, -0.53, 0.1, 0, 0, 0, [0.95, 0.55, 1.35]);
    part(l, G.box(0.36, 0.06, 0.5), sole, 0, -0.62, 0.08);
    part(l, G.box(0.13, 0.1, 0.03), gold, 0, -0.42, 0.18);
    legs.push(l);
  }

  // Kiki sitzt im Rucksack (hängt am Oberkörper und macht dessen Bewegungen mit)
  const kiki = makeKiki();
  body.add(kiki);
  kiki.position.set(0.05, 0.74, -0.62);
  kiki.scale.setScalar(1.3);

  root.userData.rig = {
    hips, body, head, armL: arms[0], armR: arms[1], legL: legs[0], legR: legs[1],
    eyes: [eyeL, eyeR], kiki,
  };
  return root;
}

// ---------------- Kiki der Rennkuckuck ----------------
export function makeKiki() {
  const root = new THREE.Group();
  const feathers = mat(0xffffff, { map: streakTexture() });
  const cream = mat(0xf1e4c4), crest = mat(0x3e2a18), beak = mat(0x2c2a28), bronze = mat(0x6a5a3a);
  const body = pivot(root, 0, 0, 0);
  part(body, G.sphere(0.17, 12, 8), feathers, 0, 0, 0, 0, 0, 0, [0.95, 1, 1.35]);
  part(body, G.sphere(0.13, 10, 8), cream, 0, -0.04, 0.09, 0, 0, 0, [0.9, 0.9, 1.1]);
  // langer Hals mit Kopf
  const neck = pivot(body, 0, 0.08, 0.13);
  part(neck, G.cyl(0.065, 0.085, 0.22, 8), feathers, 0, 0, 0, 0.25, 0, 0);
  const head = pivot(neck, 0, 0.24, 0.06);
  part(head, G.sphere(0.115, 12, 10), feathers, 0, 0, 0, 0, 0, 0, [0.9, 1, 1.15]);
  part(head, G.sphere(0.07, 8, 6), cream, 0, -0.06, 0.05, 0, 0, 0, [0.9, 0.6, 1]);
  // langer, gerader Schnabel
  part(head, G.cone(0.034, 0.32, 6), beak, 0, -0.01, 0.12, Math.PI / 2 - 0.08, 0, 0);
  eyeOn(head, [0.104, 0.115, 0.132], -0.052, 0.025, 0.046);
  eyeOn(head, [0.104, 0.115, 0.132], 0.052, 0.025, 0.046);
  // blau-oranger Fleck hinter dem Auge
  for (const s of [-1, 1]) {
    part(head, G.sphere(0.03, 6, 4), mat(0x3a7ad8), s * 0.095, 0.005, -0.02, 0, 0, 0, [0.35, 0.9, 1.2]);
    part(head, G.sphere(0.025, 6, 4), mat(0xe8582a), s * 0.092, -0.01, -0.06, 0, 0, 0, [0.35, 0.9, 1]);
  }
  // struppige Haube
  [[0, -0.45, 0.13], [0.03, -0.8, 0.12], [-0.03, -0.8, 0.12], [0, -1.15, 0.1], [0.02, -1.45, 0.08]].forEach(([x, rx, len]) =>
    part(head, G.cone(0.028, len * 1.3, 4), crest, x, 0.08, -0.03, rx, 0, x * 6));
  // Flügel zeigen seitlich nach außen und werden in Ruhe nach hinten angelegt
  const wings = [];
  for (const s of [-1, 1]) {
    const w = pivot(body, s * 0.13, 0.05, 0);
    part(w, G.sphere(0.16, 8, 6), feathers, s * 0.14, 0, 0, 0, 0, 0, [1.15, 0.28, 0.5]);
    for (let k = 0; k < 3; k++) part(w, G.sphere(0.03, 5, 4), cream, s * (0.08 + k * 0.07), 0.035, 0.02 - k * 0.01, 0, 0, 0, [1, 0.4, 1]);
    w.rotation.y = s * 1.35;
    wings.push(w);
  }
  // langer, sich verbreiternder Schwanz aus drei Federn mit hellen Spitzen
  const tail = pivot(body, 0, 0.05, -0.18);
  for (const [s, len] of [[0, 0.55], [-1, 0.46], [1, 0.46]]) {
    part(tail, G.cyl(0.07, 0.03, len, 6), bronze, s * 0.06, 0, 0, -Math.PI / 2, s * 0.18, 0, [1, 1, 0.35]);
    part(tail, G.sphere(0.07, 6, 4), cream, s * 0.06 - s * len * 0.18, 0, -len, 0, s * 0.18, 0, [1, 0.35, 0.5]);
  }
  tail.rotation.x = 0.6;
  // lange Beine (stecken im Rucksack, beim Flattern sieht man sie)
  const legs = [];
  for (const s of [-1, 1]) {
    const l = pivot(body, s * 0.06, -0.12, 0.02);
    part(l, G.cyl(0.018, 0.022, 0.3, 5), mat(0x7a8a9a), 0, -0.3, 0);
    part(l, G.box(0.03, 0.02, 0.14), mat(0x7a8a9a), 0, -0.31, 0.03, 0, 0.5, 0);
    part(l, G.box(0.03, 0.02, 0.14), mat(0x7a8a9a), 0, -0.31, 0.03, 0, -0.5, 0);
    legs.push(l);
  }
  root.userData.rig = { body, neck, head, wingL: wings[0], wingR: wings[1], tail, legs };
  return root;
}

// Braunes Wabenmuster für den Panzer
let shellTex = null;
function shellTexture() {
  if (shellTex) return shellTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7a4424';
  ctx.fillRect(0, 0, 128, 64);
  const hex = (cx, cy, r) => {
    for (let k = 0; k < 3; k++) {
      const rr = r * (1 - k * 0.3);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = ['#b8733e', '#c4814a', '#b8733e'][k];
      ctx.fill();
      ctx.strokeStyle = k ? 'rgba(110,60,30,0.6)' : '#5a3018';
      ctx.lineWidth = k ? 1.2 : 3;
      ctx.stroke();
    }
  };
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) hex(x * 22 + (y % 2) * 11, y * 19 + 4, 11);
  shellTex = new THREE.CanvasTexture(c);
  shellTex.colorSpace = THREE.SRGBColorSpace;
  shellTex.wrapS = THREE.RepeatWrapping;
  return shellTex;
}

// ---------------- Opa Tilo (Schildkröte) ----------------
export function makeTilo() {
  const root = new THREE.Group();
  const skin = mat(0x8fb07a), belly = mat(0xe8c98a), line = mat(0x9a6a3a), white = mat(0xeeeae2);
  const scarf = mat(0xcf6a5a), gold = mat(0xd9ab34);
  const body = pivot(root, 0, 0, 0);
  // kurze, kräftige Beine mit Zehennägeln
  for (const s of [-1, 1]) {
    part(body, G.cyl(0.22, 0.25, 0.55, 10), skin, s * 0.3, 0, 0.05);
    for (let k = -1; k <= 1; k++) part(body, G.sphere(0.06, 6, 4), belly, s * 0.3 + k * 0.1, 0.03, 0.27, 0, 0, 0, [1, 0.8, 1]);
  }
  // Bauchpanzer mit Nähten
  part(body, G.sphere(0.58, 12, 10), belly, 0, 1.0, 0.1, 0, 0, 0, [1, 1.15, 0.62]);
  part(body, G.box(0.04, 1.05, 0.04), line, 0, 0.5, 0.45, -0.05, 0, 0);
  for (const y of [0.75, 1.05]) part(body, G.box(0.9, 0.04, 0.04), line, 0, y, 0.44, 0, 0, 0);
  // großer Rückenpanzer (ragt über den Kopf hinaus)
  part(body, G.sphere(0.8, 16, 12), mat(0xffffff, { map: shellTexture() }), 0, 1.25, -0.28, 0, 0, 0, [1.05, 1.35, 0.72]);
  // gestrickter roter Schal mit herabhängendem Ende
  part(body, G.torus(0.4, 0.13, 6, 14), scarf, 0, 1.62, 0.08, Math.PI / 2, 0, 0);
  part(body, G.box(0.18, 0.55, 0.08), scarf, -0.2, 1.2, 0.46, -0.15, 0, 0.1);
  // Kompass an einer Kette
  part(body, G.torus(0.2, 0.012, 3, 12, Math.PI), line, 0, 1.52, 0.42, 0.2, 0, Math.PI);
  part(body, G.cyl(0.1, 0.1, 0.03, 12), gold, 0, 1.2, 0.47, Math.PI / 2 - 0.1, 0, 0);
  part(body, G.cyl(0.075, 0.075, 0.035, 12), mat(0xf8f4e8), 0, 1.2, 0.475, Math.PI / 2 - 0.1, 0, 0);
  part(body, G.box(0.02, 0.1, 0.02), mat(0xc0392b), 0, 1.22, 0.5, 0, 0, 0.6);
  const head = pivot(body, 0, 1.92, 0.18);
  part(head, G.sphere(0.34, 12, 10), skin, 0, 0, 0, 0, 0, 0, [1, 0.92, 1.05]);
  part(head, G.sphere(0.12, 8, 6), skin, 0, -0.02, 0.32, 0, 0, 0, [1.1, 0.7, 0.8]);
  eyeOn(head, [0.34, 0.31, 0.36], -0.12, 0.08, 0.075);
  eyeOn(head, [0.34, 0.31, 0.36], 0.12, 0.08, 0.075);
  // runde Brille
  for (const s of [-1, 1]) part(head, G.torus(0.1, 0.018, 4, 12), gold, s * 0.12, 0.08, 0.35);
  part(head, G.box(0.05, 0.02, 0.02), gold, 0, 0.09, 0.36);
  // buschige weiße Augenbrauen, Schnurrbart und langer Bart
  for (const s of [-1, 1]) {
    part(head, G.sphere(0.1, 8, 6), white, s * 0.14, 0.22, 0.28, 0, 0, s * 0.3, [1.3, 0.55, 0.7]);
    part(head, G.sphere(0.13, 8, 6), white, s * 0.14, -0.12, 0.3, 0, 0, s * 0.5, [1.5, 0.55, 0.7]);
    part(head, G.cone(0.1, 0.62, 6), white, s * 0.22, -0.2, 0.22, Math.PI, 0, -s * 0.15);
  }
  part(head, G.torus(0.07, 0.015, 4, 8, Math.PI), mat(0x3a2a1a), 0, -0.2, 0.32, 0, 0, Math.PI);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.62, 1.4, 0.1);
    part(a, cap(0.13, 0.35), skin, s * 0.05, -0.26, 0.05, 0.1, 0, s * 0.25);
    for (let k = -1; k <= 1; k++) part(a, G.sphere(0.04, 5, 4), belly, s * 0.14 + k * 0.05, -0.55, 0.12);
    arms.push(a);
  }
  // Schriftrolle unter dem Arm
  part(arms[1], G.cyl(0.11, 0.11, 0.42, 10), mat(0xf0dfb4), 0.05, -0.42, 0.25, 0, 0, Math.PI / 2 - 0.2);
  part(arms[1], G.cyl(0.05, 0.05, 0.44, 6), mat(0x8a5a2a), 0.05, -0.42, 0.25, 0, 0, Math.PI / 2 - 0.2);
  root.userData.rig = { body, head, armL: arms[0], armR: arms[1] };
  return root;
}

// ---------------- König Krötus (Krötenkönig) ----------------
export function makeToadKing() {
  const root = new THREE.Group();
  const skin = mat(0x8c8a50), wart = mat(0x6e6c3a), belly = mat(0xe6d8a8), gold = mat(0xf0c030, { emissive: 0x3a2800 });
  const purple = mat(0x6a3aa0, { side: THREE.DoubleSide }), fur = mat(0xf2eee6), leather = mat(0x6a3e22);
  const body = pivot(root, 0, 0, 0);
  // Beine und Stiefel
  const legs = [];
  for (const s of [-1, 1]) {
    const l = pivot(body, s * 0.34, 0.62, 0);
    part(l, cap(0.17, 0.2), skin, 0, -0.18, 0);
    part(l, G.cyl(0.22, 0.24, 0.4, 10), leather, 0, -0.62, 0.02);
    part(l, G.box(0.46, 0.14, 0.6), leather, 0, -0.62, 0.1);
    part(l, G.box(0.16, 0.12, 0.03), gold, 0, -0.44, 0.24);
    legs.push(l);
  }
  // dicker Bauch mit Warzen
  part(body, G.sphere(0.85, 16, 12), skin, 0, 1.08, 0, 0, 0, 0, [1, 0.95, 0.85]);
  part(body, G.sphere(0.7, 14, 10), belly, 0, 0.98, 0.28, 0, 0, 0, [0.92, 1, 0.62]);
  [[-0.7, 1.3, 0.1], [0.72, 1.1, 0.05], [-0.6, 0.8, 0.35], [0.55, 1.45, 0.3], [0.62, 0.75, 0.38], [-0.45, 1.55, 0.25]].forEach(([x, y, z]) =>
    part(body, G.sphere(0.06, 6, 4), wart, x, y, z));
  // Gürtel mit Taschen voller Goldmünzen
  part(body, G.cyl(0.8, 0.78, 0.18, 16), leather, 0, 0.62, 0.02);
  part(body, G.box(0.3, 0.22, 0.06), gold, 0, 0.62, 0.8);
  part(body, G.box(0.16, 0.1, 0.07), leather, 0, 0.64, 0.81);
  for (const s of [-1, 1]) {
    part(body, G.box(0.28, 0.3, 0.2), leather, s * 0.55, 0.48, 0.52, 0, -s * 0.6, 0);
    for (let k = 0; k < 3; k++) part(body, G.cyl(0.07, 0.07, 0.025, 10), gold, s * (0.5 + k * 0.05), 0.8 + k * 0.03, 0.55 - k * 0.04, 0.6, 0, 0.3 * s);
  }
  // Königsumhang mit Pelzkragen
  const cape = new THREE.CylinderGeometry(0.95, 1.25, 1.75, 16, 1, true, Math.PI - 1.9, 3.8).translate(0, 0.88, 0);
  part(body, cape, purple, 0, 0.3, -0.05);
  part(body, G.torus(0.74, 0.19, 8, 16), fur, 0, 1.6, -0.02, Math.PI / 2 + 0.15, 0, 0);
  // goldene Kette mit Edelsteinen
  for (const s of [-1, 1]) {
    part(body, G.torus(0.1, 0.035, 4, 10), gold, s * 0.42, 1.5, 0.66);
    part(body, G.sphere(0.07, 6, 4), mat(0x6ab0f0, { emissive: 0x103050 }), s * 0.42, 1.5, 0.7);
  }
  for (let k = 0; k < 7; k++) part(body, G.torus(0.035, 0.012, 3, 6), gold, -0.3 + k * 0.1, 1.44 - Math.sin((k / 6) * Math.PI) * 0.08, 0.72, 0, 0, k % 2 ? 0 : Math.PI / 2);
  // breiter Krötenkopf
  const head = pivot(body, 0, 2.08, 0.1);
  part(head, G.sphere(0.56, 14, 10), skin, 0, 0, 0, 0, 0, 0, [1.15, 0.72, 0.95]);
  part(head, G.sphere(0.45, 12, 8), belly, 0, -0.12, 0.2, 0, 0, 0, [1.1, 0.5, 0.8]);
  part(head, G.torus(0.3, 0.025, 4, 12, Math.PI), mat(0x3a2a1a), 0, -0.1, 0.48, Math.PI * 0.08, 0, Math.PI);
  // Schnurrbart
  for (const s of [-1, 1]) part(head, G.sphere(0.13, 8, 6), mat(0x5a3a22), s * 0.16, -0.02, 0.5, 0, s * 0.3, s * 0.35, [1.7, 0.5, 0.6]);
  // hervorstehende Augen mit schweren Lidern
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = pivot(head, s * 0.3, 0.28, 0.26);
    part(e, G.sphere(0.16, 10, 8), mat(0xe8a040), 0, 0, 0);
    part(e, G.box(0.16, 0.035, 0.03), mat(0x111111), 0, 0, 0.15);
    part(e, G.hemi(0.17, 10, 5), skin, 0, 0.01, 0, -0.35, 0, 0);
    eyes.push(e);
  }
  // Monokel mit Kette
  part(eyes[0], G.torus(0.14, 0.022, 4, 12), gold, 0, 0, 0.14);
  part(eyes[0], G.cyl(0.13, 0.13, 0.01, 12), mat(0xcfe8ff, { transparent: true, opacity: 0.45 }), 0, 0, 0.14, Math.PI / 2, 0, 0);
  part(head, G.cyl(0.012, 0.012, 0.55, 4), gold, -0.42, -0.1, 0.32, 0.2, 0, 0.3);
  // Krone mit Rubin
  const crown = pivot(head, 0, 0.36, -0.02);
  part(crown, G.cyl(0.3, 0.33, 0.16, 12), gold, 0, 0, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    part(crown, G.cone(0.08, 0.24, 4), gold, Math.cos(a) * 0.29, 0.16, Math.sin(a) * 0.29);
  }
  part(crown, new THREE.OctahedronGeometry(0.07, 0), mat(0xe0203a, { emissive: 0x400010 }), 0, 0.08, 0.32);
  for (const s of [-1, 1]) part(crown, new THREE.OctahedronGeometry(0.045, 0), mat(0x3a6ae0, { emissive: 0x101a40 }), s * 0.22, 0.08, 0.23);
  // Arme mit Goldreifen
  const arms = [];
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.78, 1.55, 0.05);
    part(a, cap(0.16, 0.5), skin, s * 0.08, -0.4, 0.05, 0.1, 0, s * 0.2);
    part(a, G.torus(0.15, 0.05, 4, 10), gold, s * 0.16, -0.74, 0.1, Math.PI / 2, 0, 0);
    part(a, G.sphere(0.17, 8, 6), skin, s * 0.2, -0.9, 0.12, 0, 0, 0, [1, 1.1, 0.8]);
    arms.push(a);
  }
  root.userData.rig = { body, head, armL: arms[0], armR: arms[1], legs, crown };
  return root;
}

// Goldmünze (Wurfgeschoss des Krötenkönigs)
export function makeCoin() {
  const g = new THREE.Group();
  part(g, G.cyl(0.32, 0.32, 0.08, 14), mat(0xf0c030, { emissive: 0x5a3a00 }), 0, -0.04, 0, Math.PI / 2, 0, 0);
  part(g, G.box(0.12, 0.3, 0.1), mat(0xc89820, { emissive: 0x3a2800 }), 0, -0.15, 0);
  return g;
}

// ---------------- Igel ----------------
export function makeHedgehog(scale = 1, apron = false) {
  const root = new THREE.Group();
  const brown = mat(0x8b5a2b), spike = mat(0x4a2e14), face = mat(0xf0c89a);
  const body = pivot(root, 0, 0, 0);
  part(body, G.sphere(0.5, 12, 10), face, 0, 0.5, 0.05, 0, 0, 0, [0.9, 1, 0.8]);
  part(body, G.sphere(0.55, 12, 10), brown, 0, 0.55, -0.12, 0, 0, 0, [1, 1, 0.9]);
  const spikes = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 * 3.1, t = (i % 7) / 7;
    const rx = -0.6 - t * 1.4, ry = Math.sin(a) * 0.9;
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, 0))
      .multiply(new THREE.Matrix4().makeTranslation(0, 0.42, 0));
    m.premultiply(new THREE.Matrix4().makeTranslation(0, 0.55, -0.12));
    spikes.push({ geo: G.cone(0.1, 0.45, 4), matrix: m });
  }
  body.add(new THREE.Mesh(mergeGeos(spikes), spike));
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

let stripeTex = null;
function stripeTexture() {
  if (stripeTex) return stripeTex;
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 32;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#f4f0e8' : '#d8342a';
    ctx.fillRect(0, i * 4, 8, 4);
  }
  stripeTex = new THREE.CanvasTexture(c);
  stripeTex.colorSpace = THREE.SRGBColorSpace;
  return stripeTex;
}

// ---------------- Käpt'n Barnabas ----------------
export function makeCaptain() {
  const root = new THREE.Group();
  const coat = mat(0x33508f), trim = mat(0xd9ab34), skin = mat(0xb07a50), white = mat(0xf0ece4);
  const pants = mat(0x4a7a4a), boot = mat(0x6a3e22), wood = mat(0x7a5030);
  const body = pivot(root, 0, 0, 0);
  for (const s of [-1, 1]) {
    part(body, G.cyl(0.2, 0.18, 0.5, 10), pants, s * 0.24, 0.35, 0);
    part(body, G.cyl(0.19, 0.2, 0.36, 10), boot, s * 0.24, 0, 0.02);
    part(body, G.box(0.34, 0.1, 0.46), boot, s * 0.24, 0, 0.08);
    part(body, G.box(0.12, 0.08, 0.03), trim, s * 0.24, 0.18, 0.2);
  }
  // blauer Mantel mit Goldborte, darunter gestreiftes Hemd
  part(body, G.cyl(0.5, 0.62, 1.15, 14), coat, 0, 0.55, 0);
  part(body, G.box(0.46, 0.7, 0.1), mat(0xffffff, { map: stripeTexture() }), 0, 0.95, 0.52);
  part(body, G.torus(0.62, 0.04, 4, 16), trim, 0, 0.57, 0, Math.PI / 2, 0, 0);
  part(body, G.box(0.5, 0.1, 0.1), mat(0x6a4a2a), 0, 0.82, 0.55);
  part(body, G.box(0.1, 0.08, 0.11), mat(0xbfc4c8), 0, 0.82, 0.56);
  for (const s of [-1, 1]) {
    part(body, G.box(0.06, 1.05, 0.06), trim, s * 0.27, 0.6, 0.55, 0, 0, 0);
    for (let k = 0; k < 3; k++) part(body, G.sphere(0.045, 6, 4), trim, s * 0.35, 0.72 + k * 0.22, 0.55);
    part(body, G.box(0.3, 0.06, 0.26), trim, s * 0.5, 1.7, 0);
  }
  part(body, G.cyl(0.08, 0.08, 0.03, 12), trim, 0, 1.2, 0.58, Math.PI / 2, 0, 0);
  const head = pivot(body, 0, 1.95, 0.02);
  part(head, G.sphere(0.32, 12, 10), skin);
  part(head, G.sphere(0.12, 8, 6), mat(0x8a5a40), 0, -0.02, 0.32, 0, 0, 0, [1.1, 0.9, 1]);
  eyeOn(head, [0.32, 0.32, 0.32], -0.12, 0.08, 0.06);
  eyeOn(head, [0.32, 0.32, 0.32], 0.12, 0.08, 0.06);
  for (const s of [-1, 1]) part(head, G.sphere(0.07, 6, 4), white, s * 0.13, 0.18, 0.26, 0, 0, s * 0.3, [1.5, 0.6, 0.7]);
  // großer weißer Rauschebart mit Schnurrbart
  part(head, G.sphere(0.36, 12, 10), white, 0, -0.34, 0.14, 0, 0, 0, [1.15, 1.1, 0.72]);
  for (const s of [-1, 1]) part(head, G.sphere(0.14, 8, 6), white, s * 0.14, -0.09, 0.3, 0, 0, s * 0.4, [1.5, 0.6, 0.7]);
  part(head, G.sphere(0.07, 6, 4), mat(0xa04a3a), 0, -0.16, 0.34, 0, 0, 0, [1.4, 0.6, 0.6]);
  // Kapitänsmütze mit Anker
  part(head, G.cyl(0.33, 0.3, 0.2, 12), coat, 0, 0.2, -0.02);
  part(head, G.box(0.9, 0.12, 0.4), coat, 0, 0.36, -0.02);
  part(head, G.box(0.92, 0.04, 0.42), trim, 0, 0.47, -0.02);
  part(head, G.torus(0.05, 0.015, 3, 8), white, 0, 0.36, 0.2);
  part(head, G.box(0.02, 0.12, 0.02), white, 0, 0.32, 0.2);
  part(head, G.box(0.1, 0.02, 0.02), white, 0, 0.28, 0.2);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.6, 1.55, 0.05);
    part(a, cap(0.16, 0.4), coat, s * 0.06, -0.32, 0.05, 0.3, 0, s * 0.2);
    part(a, G.torus(0.15, 0.04, 4, 10), trim, s * 0.12, -0.56, 0.2, Math.PI / 2 - 0.3, 0, 0);
    part(a, G.sphere(0.14, 8, 6), skin, s * 0.14, -0.66, 0.28);
    arms.push(a);
  }
  // Steuerrad in der Hand
  const wheel = pivot(arms[0], -0.2, -0.66, 0.42);
  part(wheel, G.torus(0.34, 0.04, 4, 16), wood, 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    part(wheel, G.cyl(0.02, 0.02, 0.5, 4), wood, Math.cos(a) * 0.21, Math.sin(a) * 0.21, 0, 0, 0, a - Math.PI / 2);
  }
  part(wheel, G.cyl(0.07, 0.07, 0.06, 8), wood, 0, 0, 0, Math.PI / 2, 0, 0);
  wheel.rotation.y = 0.5;
  // Fernrohr
  part(arms[1], G.cyl(0.07, 0.09, 0.45, 10), trim, 0.18, -0.66, 0.32, Math.PI / 2 - 0.2, 0, 0);
  root.userData.rig = { body, head };
  return root;
}

// ---------------- Gegner ----------------
export function makeBeetle() {
  // Blechkäfer: Kupferpanzer mit leuchtenden Nähten, Uhrwerk-Beine
  const root = new THREE.Group();
  const copper = mat(0xc27a4a), glowLine = mat(0x6ff0e0, { emissive: 0x2a8a80 }), metal = mat(0x3a3c42), brass = mat(0xb08a3a);
  const body = pivot(root, 0, 0, 0);
  part(body, G.hemi(0.58, 14, 6), copper, 0, 0.3, -0.05, 0, 0, 0, [1, 0.88, 1.15]);
  part(body, G.torus(0.5, 0.025, 3, 16, Math.PI), glowLine, 0, 0.3, -0.05, 0, Math.PI / 2, 0, [1, 1, 1.28]);
  part(body, G.box(0.04, 0.025, 1.2), glowLine, 0, 0.8, -0.08, 0, 0, 0);
  for (const s of [-1, 1]) part(body, G.torus(0.42, 0.02, 3, 12, Math.PI * 0.6), glowLine, s * 0.2, 0.32, -0.05, Math.PI / 2, 0, s * 0.9);
  part(body, G.sphere(0.46, 10, 8), metal, 0, 0.3, 0, 0, 0, 0, [1.05, 0.45, 1.2]);
  // durchscheinende Flügel
  const wings = [];
  for (const s of [-1, 1]) {
    const w = pivot(body, s * 0.35, 0.7, -0.25);
    part(w, G.sphere(0.35, 8, 6), mat(0x9ff0e8, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }), s * 0.3, 0, 0, 0, 0, 0, [1, 0.08, 0.6]);
    wings.push(w);
  }
  const head = pivot(body, 0, 0.36, 0.56);
  part(head, G.sphere(0.27, 10, 8), metal, 0, 0, 0, 0, 0, 0, [1.1, 0.85, 0.9]);
  for (const s of [-1, 1]) {
    // leuchtende runde Linsenaugen
    part(head, G.torus(0.1, 0.03, 4, 12), brass, s * 0.12, 0.02, 0.2);
    part(head, G.cyl(0.085, 0.085, 0.03, 12), mat(0xffb030, { emissive: 0xaa5a00 }), s * 0.12, 0.02, 0.21, Math.PI / 2, 0, 0);
    part(head, G.cyl(0.012, 0.012, 0.32, 4), metal, s * 0.1, 0.22, 0.08, -0.5, 0, s * 0.4);
    part(head, G.sphere(0.035, 6, 4), glowLine, s * 0.17, 0.35, 0.18);
    part(head, G.box(0.05, 0.08, 0.04), mat(0xdddddd), s * 0.05, -0.18, 0.2);
  }
  const legs = [];
  for (let i = 0; i < 6; i++) {
    const s = i < 3 ? -1 : 1, k = i % 3;
    const l = pivot(body, s * 0.38, 0.25, -0.3 + k * 0.3);
    part(l, G.cyl(0.06, 0.06, 0.1, 6), brass, s * 0.04, 0, 0, 0, 0, Math.PI / 2);
    part(l, G.box(0.1, 0.32, 0.12), metal, s * 0.18, -0.12, 0, 0, 0, s * 0.6);
    legs.push(l);
  }
  root.userData.rig = { body, head, legs, wings };
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

// ---------------- Glühwürmchen ----------------
export function makeFirefly() {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  part(body, G.sphere(0.23, 12, 10), mat(0xfff2a0, { emissive: 0xc8a030 }), 0, -0.1, 0, 0, 0, 0, [1, 0.95, 0.95]);
  part(body, G.sphere(0.22, 12, 10), mat(0xf08a5a), 0, 0.1, 0, 0, 0, 0, [1, 1.05, 0.95]);
  part(body, G.sphere(0.2, 12, 10), mat(0xf6c89a), 0, 0.1, 0.05, 0, 0, 0, [0.95, 0.9, 0.9]);
  for (const s of [-1, 1]) {
    part(body, G.sphere(0.038, 6, 4), mat(0x111111), s * 0.07, 0.13, 0.22);
    part(body, G.sphere(0.012, 4, 3), mat(0xffffff, { basic: true }), s * 0.07 + 0.012, 0.145, 0.25);
    // geschwungene Fühler mit leuchtender Spitze
    part(body, G.cyl(0.008, 0.008, 0.2, 4), mat(0x3a3a5a), s * 0.08, 0.28, 0, 0, 0, -s * 0.35);
    part(body, G.torus(0.035, 0.008, 3, 8, Math.PI * 1.4), mat(0x3a3a5a), s * 0.15, 0.46, 0, 0, 0, s > 0 ? 0 : Math.PI);
    part(body, G.sphere(0.028, 6, 4), mat(0xbfe8ff, { emissive: 0x6aa0c0 }), s * 0.19, 0.44, 0);
  }
  part(body, G.torus(0.04, 0.008, 3, 8, Math.PI), mat(0xb04a3a), 0, 0.08, 0.215, 0, 0, Math.PI);
  const wm = mat(0xdcecff, { transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const wings = [];
  for (const s of [-1, 1]) {
    const w = pivot(body, s * 0.12, 0.15, -0.08);
    part(w, G.sphere(0.2, 8, 6), wm, s * 0.2, 0.06, 0, 0, 0, s * 0.35, [1, 0.08, 0.55]);
    part(w, G.sphere(0.12, 8, 6), wm, s * 0.14, -0.1, 0, 0, 0, -s * 0.3, [1, 0.08, 0.5]);
    wings.push(w);
  }
  root.userData.rig = { body, wings };
  return root;
}

// ---------------- Pauli Pilz ----------------
let swirlTex = null;
function swirlTexture() {
  if (swirlTex) return swirlTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5ec8bf';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#f0993a';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  for (const [cx, cy, r] of [[16, 30, 11], [52, 18, 9], [84, 34, 11], [116, 16, 9], [36, 50, 7], [100, 54, 7]]) {
    ctx.beginPath();
    for (let t = 0; t < 14; t++) {
      const a = t * 0.9, rr = (t / 14) * r;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.stroke();
  }
  swirlTex = new THREE.CanvasTexture(c);
  swirlTex.colorSpace = THREE.SRGBColorSpace;
  swirlTex.wrapS = THREE.RepeatWrapping;
  return swirlTex;
}

export function makePilz() {
  const root = new THREE.Group();
  const stem = mat(0xf2eee6), glove = mat(0x7a4a2c), boot = mat(0x3f8a3f);
  const body = pivot(root, 0, 0, 0);
  for (const s of [-1, 1]) {
    part(body, G.cyl(0.13, 0.13, 0.35, 8), stem, s * 0.18, 0.2, 0);
    part(body, G.cyl(0.17, 0.19, 0.24, 10), boot, s * 0.18, 0, 0.02);
    part(body, G.sphere(0.18, 8, 6), boot, s * 0.18, 0.05, 0.1, 0, 0, 0, [0.95, 0.6, 1.3]);
    part(body, G.torus(0.05, 0.015, 3, 8), mat(0x2f6a2f), s * 0.18 + 0.03, 0.22, 0.18);
  }
  part(body, G.sphere(0.46, 12, 10), stem, 0, 0.72, 0, 0, 0, 0, [1, 1.1, 0.9]);
  part(body, G.cyl(0.33, 0.4, 0.6, 12), stem, 0, 0.9, 0);
  const head = pivot(body, 0, 1.3, 0);
  for (const s of [-1, 1]) {
    part(head, G.sphere(0.035, 6, 4), mat(0x111111), s * 0.1, 0.02, 0.33);
    part(head, G.sphere(0.07, 6, 4), mat(0xf2a0a0), s * 0.17, -0.07, 0.3, 0, 0, 0, [1, 0.6, 0.3]);
  }
  part(head, G.torus(0.06, 0.012, 3, 8, Math.PI), mat(0xb04a3a), 0, -0.05, 0.335, 0, 0, Math.PI);
  // türkiser Hut mit orangen Spiralen
  part(head, G.hemi(0.72, 16, 7), mat(0xffffff, { map: swirlTexture() }), 0, 0.2, 0, 0, 0, 0, [1, 0.62, 1]);
  part(head, new THREE.CircleGeometry(0.72, 16).rotateX(Math.PI / 2), mat(0xf2e6cc), 0, 0.2, 0);
  part(head, G.torus(0.52, 0.05, 3, 16), mat(0xe8dcc0), 0, 0.18, 0, Math.PI / 2, 0, 0);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.4, 1.0, 0);
    part(a, cap(0.07, 0.26), stem, s * 0.08, -0.18, 0, 0, 0, s * 0.5);
    part(a, G.sphere(0.12, 8, 6), glove, s * 0.2, -0.36, 0.02);
    arms.push(a);
  }
  root.userData.rig = { body, head, armL: arms[0], armR: arms[1] };
  return root;
}

// ---------------- Lotti Langsam (Schnecken-Händlerin) ----------------
export function makeSnail() {
  const root = new THREE.Group();
  const purple = mat(0xb07ad8), brass = mat(0xb07a3a);
  const body = pivot(root, 0, 0, 0);
  for (const s of [-1, 1]) {
    part(body, G.cyl(0.15, 0.17, 0.2, 10), mat(0x7a4a2c), s * 0.2, 0, 0.05);
    part(body, G.torus(0.15, 0.03, 3, 10), mat(0x3f8a3f), s * 0.2, 0.17, 0.05, Math.PI / 2, 0, 0);
  }
  part(body, G.cyl(0.36, 0.48, 0.95, 14), purple, 0, 0.15, 0);
  part(body, G.sphere(0.37, 12, 10), purple, 0, 1.1, 0, 0, 0, 0, [1, 0.9, 1]);
  const head = pivot(body, 0, 1.12, 0.1);
  // Schutzbrille
  for (const s of [-1, 1]) {
    part(head, G.torus(0.12, 0.035, 4, 12), brass, s * 0.13, 0.05, 0.27);
    part(head, G.cyl(0.1, 0.1, 0.03, 12), mat(0x9ff0f8, { emissive: 0x2a6a70 }), s * 0.13, 0.05, 0.27, Math.PI / 2, 0, 0);
    // Stielaugen mit Laternen
    part(head, G.cyl(0.035, 0.045, 0.55, 6), purple, s * 0.14, 0.3, -0.02, -0.15, 0, -s * 0.35);
    part(head, G.cyl(0.08, 0.08, 0.14, 8), mat(0xfff0a0, { emissive: 0xc8a040 }), s * 0.26, 0.58, 0.05);
    part(head, G.cone(0.1, 0.06, 8), brass, s * 0.26, 0.72, 0.05);
  }
  part(head, G.box(0.46, 0.04, 0.3), mat(0x5a3a22), 0, 0.05, 0.12);
  part(head, G.torus(0.1, 0.02, 3, 8, Math.PI), mat(0x5a1a3a), 0, -0.13, 0.32, 0, 0, Math.PI);
  part(head, G.box(0.045, 0.05, 0.02), mat(0xffffff), 0, -0.17, 0.33);
  for (let i = 0; i < 5; i++) part(head, G.cone(0.05, 0.16, 4), mat(0xf06a9a), -0.12 + i * 0.06, 0.28, -0.05, 0, 0, (i - 2) * 0.25);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.38, 0.8, 0.05);
    part(a, cap(0.09, 0.22), purple, s * 0.06, -0.14, 0.04, 0.3, 0, s * 0.6);
    arms.push(a);
  }
  // Rad-Laden auf dem Rücken mit Markise und Obst
  const shop = pivot(body, 0, 0, -0.55);
  part(shop, G.cyl(0.85, 0.85, 0.4, 18), mat(0xa0703e), 0, 1.0, 0, Math.PI / 2, 0, 0);
  part(shop, G.torus(0.85, 0.06, 4, 18), mat(0x6a4422), 0, 1.0, 0.2);
  for (let i = 0; i < 4; i++) part(shop, new THREE.BoxGeometry(0.05, 1.6, 0.03), mat(0x6a4422), 0, 1.0, 0.22, 0, 0, (i / 4) * Math.PI);
  for (const s of [-1, 1]) part(shop, G.cyl(0.04, 0.04, 1.1, 5), mat(0x8a5a2a), s * 0.62, 1.7, 0);
  const cols = [0x4ec8c0, 0xf0874a, 0x9ad84a];
  cols.forEach((c, i) => part(shop, G.box(0.52, 0.08, 0.7), mat(c), -0.52 + i * 0.52, 2.8, 0.1, 0.25, 0, 0));
  part(shop, G.box(1.4, 0.18, 0.5), mat(0x8a5a2a), 0, 2.02, 0.05);
  [0xf08a2a, 0x9ad84a, 0xe8302a, 0xf0c030, 0xf08a2a].forEach((c, i) => part(shop, G.sphere(0.1, 6, 4), mat(c), -0.5 + i * 0.25, 2.3, 0.1));
  for (const s of [-1, 1]) {
    part(shop, G.cyl(0.16, 0.12, 0.16, 8), mat(0xc89a5a), s * 1.05, 1.5, 0.1);
    part(shop, G.sphere(0.08, 6, 4), mat(s > 0 ? 0xe8302a : 0xb05ad8), s * 1.05, 1.62, 0.1);
  }
  root.userData.rig = { body, head, armL: arms[0], armR: arms[1] };
  return root;
}

// ---------------- Kaktus-Bandit ----------------
export function makeCactus() {
  const root = new THREE.Group();
  const green = mat(0x6ab83a), spike = mat(0xf0d060), leather = mat(0x6a4428);
  const body = pivot(root, 0, 0, 0);
  const legs = [];
  for (const s of [-1, 1]) {
    const l = pivot(body, s * 0.2, 0.4, 0);
    part(l, cap(0.13, 0.2), green, 0, -0.2, 0);
    part(l, G.sphere(0.15, 8, 6), green, 0, -0.38, 0.06, 0, 0, 0, [1, 0.6, 1.3]);
    legs.push(l);
  }
  // gerippter Kaktuskörper (ist zugleich der Kopf)
  part(body, G.cyl(0.42, 0.44, 1.05, 8), green, 0, 0.45, 0);
  part(body, G.hemi(0.42, 8, 5), green, 0, 1.5, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    part(body, G.box(0.05, 1.1, 0.05), mat(0x4e9a2a), Math.cos(a) * 0.43, 0.45, Math.sin(a) * 0.43, 0, -a, 0);
  }
  [[0.45, 0.7, 0.1], [-0.45, 0.9, 0.05], [0.3, 1.35, 0.3], [-0.3, 1.3, 0.3], [0.42, 1.1, -0.2], [-0.4, 0.55, -0.2]].forEach(([x, y, z]) =>
    part(body, G.cone(0.03, 0.12, 4), spike, x, y, z, 0, 0, x > 0 ? -1.4 : 1.4));
  // Gesicht mit grimmigen Brauen
  for (const s of [-1, 1]) {
    eye(body, s * 0.13, 1.3, 0.37, 0.08);
    part(body, G.box(0.17, 0.05, 0.05), mat(0x1a1a1a), s * 0.13, 1.43, 0.41, 0, 0, s * 0.35);
  }
  part(body, G.torus(0.08, 0.015, 3, 8, Math.PI), mat(0x2a4a1a), 0, 1.17, 0.42, 0, 0, Math.PI);
  // Sombrero
  part(body, G.cyl(0.8, 0.8, 0.06, 16), mat(0xe0c090), 0, 1.72, 0);
  part(body, G.cone(0.34, 0.5, 12), mat(0xe0c090), 0, 1.76, 0);
  part(body, G.torus(0.3, 0.04, 4, 12), mat(0xc83a2a), 0, 1.84, 0, Math.PI / 2, 0, 0);
  part(body, G.torus(0.72, 0.03, 4, 16), mat(0xc83a2a), 0, 1.76, 0, Math.PI / 2, 0, 0);
  // Poncho und rotes Halstuch
  part(body, G.cone(0.72, 0.42, 8), leather, 0, 0.78, 0);
  part(body, G.torus(0.62, 0.03, 3, 8), mat(0xe07a3a), 0, 0.84, 0, Math.PI / 2, 0, 0);
  part(body, G.cone(0.26, 0.3, 3), mat(0xc83a2a), 0, 0.95, 0.4, 0.3, 0, Math.PI, [1, 1, 0.35]);
  part(body, G.box(0.35, 0.05, 0.08), mat(0xc83a2a), 0.4, 1.14, -0.1, 0, 0.4, -0.2);
  // Gürtel mit Goldschnalle
  part(body, G.cyl(0.45, 0.45, 0.1, 10), leather, 0, 0.42, 0);
  part(body, G.box(0.18, 0.13, 0.04), mat(0xf0c030), 0, 0.41, 0.45);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.5, 0.95, 0);
    part(a, cap(0.13, 0.3), green, s * 0.06, -0.22, 0.02, 0, 0, s * 0.2);
    part(a, G.cyl(0.15, 0.13, 0.22, 8), leather, s * 0.1, -0.45, 0.03, 0, 0, s * 0.2);
    part(a, G.sphere(0.1, 6, 4), mat(0xe8b888), s * 0.12, -0.6, 0.06);
    arms.push(a);
  }
  root.userData.rig = { body, legs, armL: arms[0], armR: arms[1] };
  return root;
}

// ---------------- Wölkchen (schwebende Plattform) ----------------
export function makeCloud() {
  const root = new THREE.Group();
  const white = mat(0xffffff, { emissive: 0x303038 });
  // Oberseite liegt bei y = 0, damit man darauf stehen kann
  [[0, -0.35, 0, 0.85], [-0.8, -0.4, 0.1, 0.62], [0.8, -0.4, 0.1, 0.62], [0, -0.4, -0.7, 0.62], [0, -0.55, 0.65, 0.6]].forEach(([x, y, z, r]) =>
    part(root, G.sphere(r, 12, 8), white, x, y, z, 0, 0, 0, [1, 0.65, 1]));
  for (const s of [-1, 1]) part(root, G.sphere(0.32, 10, 8), white, s * 1.15, -0.05, 0.25, 0, 0, s * -0.6, [0.7, 1.1, 0.7]);
  // Gesicht an der Vorderseite
  for (const s of [-1, 1]) {
    part(root, G.sphere(0.08, 6, 4), mat(0x111111), s * 0.24, -0.3, 1.08, 0, 0, 0, [1, 1.4, 0.6]);
    part(root, G.sphere(0.13, 6, 4), mat(0xf2b0c0), s * 0.42, -0.46, 1.02, 0, 0, 0, [1, 0.6, 0.3]);
  }
  part(root, G.sphere(0.13, 8, 6), mat(0x3a1a1a), 0, -0.5, 1.08, 0, 0, 0, [1, 0.8, 0.5]);
  part(root, G.sphere(0.07, 6, 4), mat(0xf07a9a), 0, -0.55, 1.14, 0, 0, 0, [1, 0.6, 0.5]);
  // Sternchen darüber
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.1 : 0.24;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const star = pivot(root, 0, 0.7, 0.95);
  part(star, new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false }), mat(0xffe070, { emissive: 0x6a5000 }), 0, 0, -0.04);
  root.userData.rig = { star };
  return root;
}
