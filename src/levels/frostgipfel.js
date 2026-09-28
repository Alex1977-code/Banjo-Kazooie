// Frostgipfel: verschneiter Berg mit Iglu-Dorf, Eissee, Eisgrotte, einem
// Spiralweg zum Gipfel und Bibber, dem Schneeball-Yeti.
import * as THREE from 'three';
import { G, M, mat, part } from '../engine/geo.js';
import { defaultColorRule } from '../game/terrain.js';
import { makePenguin, makeSnowman, makeYeti, makeSnowball } from '../game/models.js';
import { Entity, BlobShadow } from '../game/entities.js';
import { rng, fbm, damp, dampAngle, clamp } from '../engine/util.js';
import { waterMaterial } from '../engine/fx.js';

const VILLAGE = { x: 0, z: 56 };
const LAKE = { x: 0, z: 18, r: 20 };
const HOLE = { x: 9, z: 14, r: 5.5, y: -0.4 };
const GROTTO = { x: 48, z: 10, r: 9 };
const MT = { x: 0, z: -52, top: 26, rTop: 11, rBase: 27 }; // Berg
const SPIRE = { a: Math.PI * 1.25, d: 34, top: 19.5 }; // Eisnadel (nur per Gleitflug)
const LOOPS = 1.2; // Windungen des Spiralwegs
const ARENA_R = 9.5;

// Punkt auf dem Spiralweg: t = 0 (Fuß) … 1 (Gipfel)
function spiral(t) {
  const a = t * LOOPS * Math.PI * 2;
  const r = MT.rBase - (MT.rBase - MT.rTop - 1.5) * t;
  return { x: MT.x + Math.sin(a) * r, z: MT.z + Math.cos(a) * r, y: MT.top * t + 0.2, a };
}
const spirePos = () => ({ x: MT.x + Math.sin(SPIRE.a) * SPIRE.d, z: MT.z + Math.cos(SPIRE.a) * SPIRE.d });

export default {
  id: 'frost',
  name: 'Frostgipfel',
  subtitle: 'Welt 3',
  music: 'frost',
  reverb: 'frost',
  ambience: { id: 'frost' },
  wind: 1.4,
  ambientFx: ['snow'],
  killY: -20,

  atmosphere() {
    return {
      sky: 0xdcecfa, fog: 0xe2eefa, fogNear: 60, fogFar: 230,
      hemi: 0xf0f6ff, ground: 0x8aa0c0, sun: 0xfff8f0, sunIntensity: 2.3, hemiIntensity: 1.8,
    };
  },

  build(L) {
    // ---------- Gelände ----------
    const T = L.terrain({ size: 240, cell: 2, base: 0.6 });
    T.noise(1.1, 0.04, 31);
    T.forEach((x, z, k) => {
      const d = Math.hypot(x, z);
      const edge = 84 + fbm(x * 0.05, z * 0.05, 4, 2) * 6;
      if (d > edge) T.h[k] += Math.min(34, (d - edge) * 2) + fbm(x * 0.1, z * 0.1, 6, 2) * 5;
      // Berg: flacher Gipfel, steile (nicht begehbare) Flanken
      const dm = Math.hypot(x - MT.x, z - MT.z);
      if (dm < MT.rBase + 1) {
        const k2 = clamp(1 - (dm - MT.rTop) / (MT.rBase - MT.rTop), 0, 1);
        const rough = dm > MT.rTop ? (fbm(x * 0.2, z * 0.2, 7, 2) - 0.5) * 1.6 : 0;
        T.h[k] = Math.max(T.h[k], MT.top * k2 + rough);
      }
    });
    T.plateau(VILLAGE.x, VILLAGE.z, 15, 0.8, 4, 'set');
    T.plateau(LAKE.x, LAKE.z, LAKE.r, 0, 3, 'set');
    T.pit(HOLE.x, HOLE.z, HOLE.r - 1, -3, 1.2);
    T.plateau(GROTTO.x, GROTTO.z, GROTTO.r + 2, 1.2, 3, 'set');
    T.plateau(MT.x, MT.z, MT.rTop, MT.top, 0.5, 'set');
    // Spiralweg als Folge von Rampen in die Bergflanke
    const N = 28;
    for (let i = 0; i < N; i++) {
      const a = spiral(i / N), b = spiral((i + 1) / N);
      T.ramp(a.x, a.z, a.y - 0.2, b.x, b.z, b.y - 0.2, 3.8, 1.2);
    }
    const snowPath = 0xc8d8ec;
    T.path([[0, 70], [0, 42], [0, 38]], 3, snowPath);
    T.path([[16, 16], [38, 10]], 2.6, snowPath);
    T.path([[0, -2], [0, -25]], 3, snowPath);
    T.paint(LAKE.x, LAKE.z, LAKE.r, 0x9ac8ee, 2);
    L.finishTerrain(defaultColorRule({ grass: 0xf2f6fc, grass2: 0xe2ecf8, rock: 0x8a94a6, dirt: 0xd0dcec, rockSlope: 1.15, seed: 13 }), 'snow', 0.2);
    L.world.bounds = { r: 88 };
    L.sky({ top: 0x5a9ee8, bottom: 0xd8eafa, mountains: 0xc8d6ea, clouds: 10, seed: 12, mountainsH: 110 });

    // ---------- Eissee (spiegelglatt) ----------
    const iceMesh = new THREE.Mesh(new THREE.CircleGeometry(LAKE.r - 0.5, 32).rotateX(-Math.PI / 2), waterMaterial(new THREE.MeshLambertMaterial({
      color: 0xcfe8ff, map: L.game.tex.ice, transparent: true, opacity: 0.55, depthWrite: false,
    }), { amp: 0, glint: 0.7, speed: 0.15 }));
    iceMesh.material.map = L.game.tex.ice.clone();
    iceMesh.material.map.needsUpdate = true;
    iceMesh.material.map.repeat.set(5, 5);
    iceMesh.position.set(LAKE.x, 0.04, LAKE.z);
    iceMesh.renderOrder = 1;
    L.root.add(iceMesh);
    L.slipperyAt = (x, z, y) => Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r - 0.5 && y < 0.3 && Math.hypot(x - HOLE.x, z - HOLE.z) > HOLE.r;
    // Eisloch mit eiskaltem Wasser, Eisschollen und einer Mini-Insel
    L.water({ cx: HOLE.x, cz: HOLE.z, r: HOLE.r, y: HOLE.y, color: 0x3a8ad0, opacity: 0.85, waves: 0.05 });
    L.hazardAt = (x, y, z) => Math.hypot(x - HOLE.x, z - HOLE.z) < HOLE.r - 0.3 && y < HOLE.y + 0.1;
    L.cyl({ x: HOLE.x, z: HOLE.z, y: HOLE.y - 2, r: 1.2, h: 2.6, color: 0xdcecff, tex: 'ice' });
    for (let i = 0; i < 3; i++) {
      const ph = (i / 3) * Math.PI * 2;
      L.platform({
        shape: 'cyl', r: 1.3, h: 0.5, color: 0xeaf4ff, tex: 'ice',
        path: (t) => ({ x: HOLE.x + Math.cos(t * 0.45 + ph) * 3.3, y: HOLE.y + 0.55 + Math.sin(t * 1.3 + i) * 0.05, z: HOLE.z + Math.sin(t * 0.45 + ph) * 3.3 }),
      });
    }
    questItem(L, 'nase', HOLE.x, HOLE.y + 1.3, HOLE.z);
    L.berryRing(LAKE.x, LAKE.z, LAKE.r - 3, 12, 1);
    L.fireflyShard('gluehwuermchen', LAKE.x - 6, LAKE.z - 4);

    // ---------- Iglu-Dorf ----------
    for (const [x, z, rot] of [[-16, 62, 0.6], [16, 52, -0.8], [-14, 46, 1.4]]) igloo(L, x, z, rot);
    L.firefly('f1', -16, L.gy(-16, 62) + 3.4, 62);
    L.npc(makePenguin(), 7, 57, { who: 'pippo', facing: -2.6, talk: (g) => pippoTalk(L, g) });
    L.lernstein(-8, 52, {
      move: 'glide', title: 'Gleitflug', facing: 0.8,
      lines: [{ who: 'tilo', text: 'Gleitflug! Flattere mit A und halte A danach einfach weiter gedrückt: Kiki breitet die Flügel aus und ihr segelt weit durch die Luft. Mit dem Stick lenkt ihr. Am besten von ganz oben losgleiten!' }],
    });
    const snowman = makeSnowman();
    L.schnuppi = L.npc(snowman, -5, 46, { who: 'schnuppi', facing: 0.4, talk: (g) => schnuppiTalk(L, g) });
    L.schnuppi.lookAtPlayer = false;
    dressSnowman(L);
    L.schnuppiShard = L.shard('schnuppi', -2.5, null, 44, { hidden: !L.flag('schnuppi') });
    L.sign(4, 44, 0.2, 'Frostgipfel', 'Iglu-Dorf');
    L.berryLine(0, 64, 0, 44, 6);

    // ---------- Eisgrotte ----------
    const gy = L.gy(GROTTO.x, GROTTO.z);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.45) continue; // Eingang nach Westen
      const x = GROTTO.x + Math.cos(a) * GROTTO.r, z = GROTTO.z + Math.sin(a) * GROTTO.r;
      crystal(L, x, z, gy - 0.5, 5 + (i % 3) * 1.8, 1.4, a);
      L.world.addCyl({ x, z, y: gy - 1, r: 1.3, h: 8 });
    }
    // überhängende Eiszapfen am Rand – fast wie eine Höhle
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      const x = GROTTO.x + Math.cos(a) * (GROTTO.r - 2.5), z = GROTTO.z + Math.sin(a) * (GROTTO.r - 2.5);
      L.add(G.cone(0.35, 1.8, 5).rotateX(Math.PI), M(x, gy + 7.2, z), 0xbfe4ff, 'ice', 0.5);
    }
    L.cyl({ x: GROTTO.x + 2, z: GROTTO.z, y: gy, r: 1, h: 1.2, color: 0xcfe8ff, tex: 'ice' });
    questItem(L, 'hut', GROTTO.x + 2, gy + 2.2, GROTTO.z);
    L.firefly('f3', GROTTO.x - 1, gy + 1.6, GROTTO.z + 4);
    L.soundZone(GROTTO.x, GROTTO.z, { r: GROTTO.r - 1, y: gy - 1, h: 6, reverb: 0.35 });
    L.moodZone(GROTTO.x, GROTTO.z, { r: GROTTO.r - 3, fade: 6, atmo: { fog: 0x9ac8f0, hemi: 0xb8dcff, sun: 0xa8d0ff, skyTint: 0xc8e0ff, sunIntensity: 1.5, hemiIntensity: 2.1 } });
    L.berryRing(GROTTO.x, GROTTO.z, 5, 6);
    L.sign(34, 13, -1.6, 'Eisgrotte', '');

    // ---------- Spiralweg zum Gipfel ----------
    for (let i = 1; i < 26; i++) {
      const p = spiral(i / 26);
      if (i % 2) L.berry(p.x, p.y + 1, p.z);
    }
    const sc = spiral(0.42);
    questItem(L, 'schal', sc.x, sc.y + 1.2, sc.z);
    const fp = spiral(0.7);
    L.firefly('f4', fp.x, fp.y + 1.4, fp.z);
    L.sign(-3, -22, 0, 'Gipfelweg', 'Windig!');
    // Schneewände rund um die Gipfel-Arena – Lücken für den Weg und die Absprungstelle
    const arrive = spiral(1).a;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const gap = (b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.28;
      if (gap(arrive) || gap(SPIRE.a)) continue;
      L.box({ x: MT.x + Math.sin(a) * (MT.rTop - 0.4), z: MT.z + Math.cos(a) * (MT.rTop - 0.4), y: MT.top, w: 2.9, h: 1.1, d: 0.9, rot: a + Math.PI / 2, color: 0xf2f6fc, tex: 'snow', camBlock: false });
    }
    // Absprung-Markierung Richtung Eisnadel
    const lx = MT.x + Math.sin(SPIRE.a) * (MT.rTop - 0.6), lz = MT.z + Math.cos(SPIRE.a) * (MT.rTop - 0.6);
    L.add(G.cyl(0.08, 0.08, 1.6, 5), M(lx + 1.6, MT.top, lz), 0x6a4a2a, 'bark');
    L.add(G.cone(0.35, 0.8, 3).rotateZ(-Math.PI / 2), M(lx + 1.6, MT.top + 1.3, lz, SPIRE.a - Math.PI / 2), 0xd83a3a, 'plain');

    // ---------- Eisnadel (Splitter nur per Gleitflug) ----------
    const sp = spirePos();
    const sg = L.gy(sp.x, sp.z);
    L.add(G.cyl(2.2, 3.2, SPIRE.top - sg + 0.5, 8), M(sp.x, sg - 0.5, sp.z), 0xa8d4f4, 'ice', 0.3, { flat: true, shade: 0.1 });
    for (let i = 0; i < 5; i++) crystal(L, sp.x + Math.cos(i * 1.3) * 1.2, sp.z + Math.sin(i * 1.3) * 1.2, SPIRE.top - 0.2, 1 + (i % 2) * 0.6, 0.35, i);
    L.world.addCyl({ x: sp.x, z: sp.z, y: sg - 1, r: 2.3, h: SPIRE.top - sg + 1 });
    L.shard('eisnadel', sp.x, SPIRE.top + 1.4, sp.z);
    L.firefly('f5', sp.x + 6, null, sp.z + 6);

    // ---------- Bibber, der Schneeball-Yeti ----------
    buildBoss(L);

    // ---------- mehr Beeren entlang der Wege, fünftes Eislicht bei den Westkiefern ----------
    L.berryLine(-22, 18, -42, 22, 5);
    L.berryLine(17, 15, 36, 10, 5);
    L.berryLine(0, -4, 0, -21, 5);
    L.berryRing(VILLAGE.x, VILLAGE.z - 2, 11, 8);
    L.firefly('f2', -46, null, 24);

    // ---------- Gegner, Äpfel ----------
    L.beetle(22, 30, { wander: 6 });
    L.beetle(-24, 18, { wander: 6 });
    L.beetle(40, 22, { wander: 5 });
    L.beetle(-20, -14, { wander: 5 });
    L.apple(10, 40);
    L.apple(GROTTO.x - 6, GROTTO.z - 4);
    const mid = spiral(0.55);
    L.apple(mid.x, mid.z, mid.y);

    // ---------- Zeitrennen rund um den Eissee (glatt!) ----------
    L.raceCourse({
      flag: [10, 62, -0.5], start: [4, 46, Math.PI - 0.4], target: 16, who: 'pippo',
      points: [[12, 34], [20, 22], [18, 4], [4, -2], [-12, 2], [-19, 16], [-14, 32], [-3, 40]],
    });

    // ---------- Ausgang & Deko ----------
    L.portal(0, 76, { rot: Math.PI, to: 'hub', spawn: 'from-frost', label: 'Wurzelhügel', color: 0xffd24a });
    L.spawnPoint('start', 0, 67, Math.PI);
    const r = rng(41);
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, d = 20 + r() * 64;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 4) continue;
      if (Math.hypot(x - MT.x, z - MT.z) < MT.rBase + 5) continue;
      if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 17 || Math.hypot(x - GROTTO.x, z - GROTTO.z) < GROTTO.r + 5) continue;
      if (Math.abs(x) < 5 || (z > 5 && z < 16 && x > 12 && x < 40)) continue;
      const s = sp;
      if (Math.hypot(x - s.x, z - s.z) < 5) continue;
      snowPine(L, x, z, 0.9 + r() * 0.8);
    }
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, d = 30 + r() * 50;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - MT.x, z - MT.z) < MT.rBase + 3 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 3) continue;
      L.rock(x, z, { s: 0.8 + r() * 1.2, color: 0xa8b4c8 });
    }
  },

  // Windböen am oberen Spiralweg
  update(L, dt) {
    const g = L.game, p = g.player;
    L.gustT = (L.gustT ?? 4) - dt;
    if (L.gustT < -1.6) L.gustT = 5 + Math.random() * 4;
    const high = p.pos.y > 12 && Math.hypot(p.pos.x - MT.x, p.pos.z - MT.z) > MT.rTop + 0.5;
    if (L.gustT < 0.8 && L.gustT > -1.6 && high && !g.cinematic) {
      if (!L.gustOn) {
        L.gustOn = true;
        L.gustDir = Math.random() < 0.5 ? 1 : -1;
        g.audio.play('glide');
      }
      // Böe schiebt sanft den Weg entlang (Streifen aus Schneegestöber zeigen die Richtung)
      const a = Math.atan2(p.pos.x - MT.x, p.pos.z - MT.z);
      const tx = Math.cos(a) * L.gustDir, tz = -Math.sin(a) * L.gustDir;
      if (L.gustT < 0 && p.onGround) {
        p.pos.x += tx * 1.6 * dt;
        p.pos.z += tz * 1.6 * dt;
      }
      if (Math.random() < dt * 25) {
        g.particles.puff.spawn({ x: p.pos.x - tx * 6 + (Math.random() - 0.5) * 4, y: p.pos.y + 0.5 + Math.random() * 2.5, z: p.pos.z - tz * 6 + (Math.random() - 0.5) * 4,
          vx: tx * 9, vz: tz * 9, life: 1.2, s0: 0.3, s1: 0.1, r: 1, gg: 1, b: 1, a: 0.8 });
      }
    } else L.gustOn = false;
  },

  onRespawn(L) {
    L.bibber?.reset();
  },

  onEnter(L, g) {
    if (!L.flag('arrive')) {
      L.setFlag('arrive');
      g.cutscene(async () => {
        await g.camTo([30, 30, 80], [0, 10, -20], 0);
        await g.camTo([14, 16, 50], [0, 18, -45], 3.5);
        await g.say([
          { who: 'kiki', text: 'Brrr! Meine Schwanzfedern frieren gleich fest. Ist das dort oben auf dem Gipfel ... ein Yeti?' },
          { who: 'bruno', text: 'Und er sitzt auf etwas Goldenem. Lass uns erst mal den Pinguin da vorne fragen.' },
        ]);
      });
    }
  },
};

// ---------- Deko-Bausteine ----------
function snowPine(L, x, z, s) {
  const y = L.gy(x, z) - 0.2;
  const sway = { wind: 1, windBase: y + 1 * s, windH: 5 * s };
  L.add(G.cyl(0.22 * s, 0.36 * s, 1.8 * s, 6), M(x, y, z), 0x6a4a30, 'bark', 0.8);
  for (let i = 0; i < 3; i++) {
    const cy = y + (1.3 + i * 1.4) * s, cr = (2.1 - i * 0.55) * s;
    L.add(G.cone(cr, 2.3 * s, 7), M(x, cy, z, i), 0x2e5a4a, 'leaves', 0.5, { shade: 0.1, seed: i, ...sway });
    L.add(G.cone(cr * 0.75, 1.1 * s, 7), M(x, cy + 1.3 * s, z, i + 0.3), 0xf4f8ff, 'snow', 0.5, sway);
  }
  L.world.addCyl({ x, z, y, r: 0.4 * s, h: 4 * s, camBlock: false });
}

function crystal(L, x, z, y, h, r, rot) {
  L.add(G.cone(r, h, 5), M(x, y, z, rot, 1, 0.08 * Math.sin(rot * 3), 0.08 * Math.cos(rot * 2)), 0xa8d8ff, 'ice', 0.4, { flat: true, shade: 0.12 });
  L.add(G.cone(r * 0.5, h * 0.6, 4), M(x + r * 0.6, y, z + r * 0.3, rot + 1), 0xcfe8ff, 'ice', 0.4, { flat: true });
}

function igloo(L, x, z, rot) {
  const y = L.gy(x, z);
  L.add(G.hemi(2.4, 14, 6), M(x, y - 0.1, z, 0, [1, 0.82, 1]), 0xf4f8ff, 'snow', 0.5, { shade: 0.04 });
  for (let i = 1; i < 4; i++) L.add(G.torus(2.4 * Math.cos(i * 0.36), 0.04, 3, 18), M(x, y - 0.1 + Math.sin(i * 0.36) * 2.4 * 0.82, z, 0, 1, Math.PI / 2), 0xc8d8ec, 'plain');
  const ex = x + Math.sin(rot) * 2.2, ez = z + Math.cos(rot) * 2.2;
  L.add(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(rot + Math.PI / 2), M(ex, y + 0.1, ez), 0xeef4fc, 'snow', 0.5);
  L.add(new THREE.CircleGeometry(0.7, 10, 0, Math.PI), M(ex + Math.sin(rot) * 0.81, y + 0.1, ez + Math.cos(rot) * 0.81, rot), 0x2a3448, 'plain');
  L.world.addCyl({ x, z, y: y - 0.5, r: 2.3, h: 2.4 });
}

// ---------- Schnuppis verlorene Sachen ----------
const ITEMS = {
  nase: { name: 'Karottennase', make: () => { const g = new THREE.Group(); part(g, G.cone(0.14, 0.7, 6), mat(0xf07a1a), 0, 0, 0, 0, 0, Math.PI / 2); part(g, G.cone(0.12, 0.2, 4), mat(0x3a9a3a), -0.4, 0, 0, 0, 0, -Math.PI / 2); return g; } },
  hut: { name: 'Zylinder', make: () => { const g = new THREE.Group(); part(g, G.cyl(0.55, 0.55, 0.06, 14), mat(0x2a2a30), 0, 0, 0); part(g, G.cyl(0.34, 0.36, 0.6, 12), mat(0x2a2a30), 0, 0.04, 0); part(g, G.cyl(0.37, 0.37, 0.12, 12), mat(0xd83a3a), 0, 0.1, 0); return g; } },
  schal: { name: 'Schal', make: () => { const g = new THREE.Group(); part(g, G.torus(0.4, 0.12, 5, 14), mat(0x2aa04a), 0, 0, 0, Math.PI / 2, 0, 0); part(g, G.box(0.22, 0.6, 0.08), mat(0x2aa04a), 0.25, -0.3, 0.3, 0, 0, -0.2); return g; } },
};

class QuestItem extends Entity {
  constructor(L, id, x, y, z) {
    super(L, x, y, z);
    this.id = id;
    this.setObj(ITEMS[id].make());
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: L.game.tex.glow, color: 0xbfe8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(2.2);
    this.obj.add(glow);
    this.shadow = new BlobShadow(L, 0.9);
  }
  update(dt) {
    this.t += dt;
    this.obj.rotation.y = this.t * 1.6;
    this.obj.position.y = this.pos.y + Math.sin(this.t * 2.4) * 0.15;
    this.shadow.update(this.pos.x, this.pos.y - 0.6, this.pos.z);
    if (this.player.state !== 'dead' && this.touchingPlayer(1, 1.6)) {
      const L = this.level, g = this.game;
      this.remove();
      L.setFlag(`item:${this.id}`);
      g.audio.play('chest', this.pos);
      g.particles.emit('sparkle', this.pos.x, this.pos.y, this.pos.z, 20, [0.7, 0.9, 1]);
      const n = Object.keys(ITEMS).filter((k) => L.flag(`item:${k}`)).length;
      g.toast(n < 3 ? `Schnuppis ${ITEMS[this.id].name} gefunden! (${n}/3)` : `Schnuppis ${ITEMS[this.id].name} – alles beisammen! Ab zu Schnuppi!`, 3);
    }
  }
}

function questItem(L, id, x, y, z) {
  if (L.flag(`item:${id}`)) return null;
  return L.spawn(new QuestItem(L, id, x, y, z));
}

// Schneemann trägt nur, was er schon zurückbekommen hat
function dressSnowman(L) {
  const rig = L.schnuppi.model.userData.rig, done = L.flag('schnuppi');
  rig.nose.visible = done;
  rig.hat.visible = done;
  rig.scarf.visible = done;
}

async function schnuppiTalk(L, g) {
  if (L.flag('schnuppi')) {
    await g.say([{ who: 'schnuppi', text: 'Ich fühle mich wie neu gebaut! Danke, ihr zwei. Wenn ihr mal eine Schneeballschlacht braucht – ich bin dabei!' }]);
    return;
  }
  const have = Object.keys(ITEMS).filter((k) => L.flag(`item:${k}`));
  if (!L.flag('schnuppiMet')) {
    L.setFlag('schnuppiMet');
    await g.say([
      { who: 'schnuppi', text: 'Oh, hallo! Ich bin Schnuppi. Ein fieser Windstoß hat mir Nase, Hut und Schal weggepustet!' },
      { who: 'schnuppi', text: 'Ohne meine Sachen bin ich doch nur ein ganz gewöhnlicher Schneehaufen ... Könnt ihr sie mir wiederbringen?' },
      { who: 'kiki', text: 'Na klar! Eine Karotte, einen Hut und einen Schal. Das kann ja nicht so schwer sein.' },
      { who: 'schnuppi', text: 'Die Nase ist irgendwo beim Eisloch im See gelandet, der Hut in der Eisgrotte – und mein Schal flatterte den Gipfelweg hinauf.' },
    ]);
    if (!have.length) return;
  }
  if (have.length < 3) {
    await g.say([{ who: 'schnuppi', text: have.length ? `Ihr habt schon ${have.length} von 3 Sachen! Mir fehlt noch: ${Object.keys(ITEMS).filter((k) => !have.includes(k)).map((k) => ITEMS[k].name).join(' und ')}.` : 'Nase beim Eisloch, Hut in der Grotte, Schal am Gipfelweg. Ich warte hier. Ich kann ja eh nicht weg.' }]);
    return;
  }
  // alles da: Schnuppi wird angezogen
  await g.cutscene(async () => {
    const s = L.schnuppi, rig = s.model.userData.rig;
    await g.camTo([s.pos.x + 3, s.pos.y + 2.4, s.pos.z + 5], [s.pos.x, s.pos.y + 1.8, s.pos.z], 0.8);
    for (const part of [rig.scarf, rig.nose, rig.hat]) {
      part.visible = true;
      g.audio.play('switch', s.pos);
      g.particles.emit('sparkle', s.pos.x, s.pos.y + 2.2, s.pos.z, 12, [0.8, 0.95, 1]);
      await g.wait(0.45);
    }
    L.setFlag('schnuppi');
    await g.say([
      { who: 'schnuppi', text: 'Nase: da! Hut: da! Schal: da! Ich bin wieder ein richtiger Schneemann!' },
      { who: 'schnuppi', text: 'Hier, das habe ich im Schnee gefunden, als ich noch ein Haufen war. Es ist so warm, dass mir ganz schwummrig wurde.' },
    ]);
    if (L.schnuppiShard) {
      await g.camTo([L.schnuppiShard.pos.x + 3, L.schnuppiShard.pos.y + 2, L.schnuppiShard.pos.z + 4], L.schnuppiShard.pos, 0.6);
      L.schnuppiShard.reveal();
      await g.wait(0.8);
    }
  });
}

async function pippoTalk(L, g) {
  const has = (id) => g.save.hasShard(`frost:${id}`);
  if (!L.flag('pippo')) {
    L.setFlag('pippo');
    await g.say([
      { who: 'pippo', text: 'Tach auch! Pippo mein Name, Postbote, Rennleiter und schnellster Pinguin am Frostgipfel.' },
      { who: 'pippo', text: 'Seit Bibber da oben auf dem Gipfel dieses goldene Ding bewacht, ist er unausstehlich. Und er wirft mit Schneebällen!' },
      { who: 'pippo', text: 'Der Lernstein da drüben bringt euch den Gleitflug bei. Ohne den kommt ihr an die Eisnadel hinter dem Gipfel nie ran.' },
      { who: 'pippo', text: 'Und wenn ihr Lust auf ein Wettrennen habt: An meiner Zielflagge stoppe ich die Zeit – einmal rund um den spiegelglatten See!' },
    ]);
  }
  const hints = [
    ['schnuppi', 'Schnuppi, der Schneemann neben dem Lernstein, hat seine Sachen verloren. Hilf ihm doch!'],
    ['bibber', 'Der Spiralweg führt hinauf zu Bibber. Oben pfeift der Wind – bleibt in der Wegmitte!'],
    ['eisnadel', 'Von der Gipfel-Arena aus sieht man die Eisnadel. Beim roten Wimpel abspringen, flattern und A gedrückt halten – dann gleitet ihr rüber!'],
    ['gluehwuermchen', 'Fünf Eislichter schwirren hier herum: auf einem Iglu, in der Grotte, am Gipfelweg, bei der Eisnadel ... und eines bei den Kiefern im Westen.'],
  ];
  const next = hints.find(([id]) => !has(id));
  await g.say([{ who: 'pippo', text: next ? next[1] : 'Alle Splitter vom Frostgipfel! Ihr seid ja schneller als ich – fast.' }]);
}

// ================= Boss: Bibber, der Schneeball-Yeti =================
// Muster: Er stapft auf Bruno zu und wirft Schneebälle (Schatten zeigen, wo
// sie landen). Dann hebt er einen Riesenschneeball über den Kopf (Vorwarnung)
// und schleudert ihn – der rollt geradeaus über den Gipfel (ausweichen!).
// Danach rutscht er aus und steckt mit dem Kopf im Schnee: Jetzt stampfen,
// draufspringen, rollen oder picken. Ab Phase 2 fallen dabei Eiszapfen, in
// Phase 3 wirft er zwei Riesenbälle.
const BOSS_SCALE = 1.5;

class Snowball extends Entity {
  constructor(L, x, y, z, tx, tz, flight) {
    super(L, x, y, z);
    this.setObj(makeSnowball(0.45));
    const ty = L.gy(tx, tz);
    this.vel = new THREE.Vector3((tx - x) / flight, (ty - y + 0.5 * 18 * flight * flight) / flight, (tz - z) / flight);
    this.mark = warnMark(L, tx, ty, tz, 1.1);
    this.fall = flight;
    this.t = 0;
    this.shadow = new BlobShadow(L, 0.8);
  }
  update(dt) {
    this.t += dt;
    this.vel.y -= 18 * dt;
    this.pos.addScaledVector(this.vel, dt);
    this.obj.position.copy(this.pos);
    this.shadow.update(this.pos.x, this.level.gy(this.pos.x, this.pos.z), this.pos.z);
    this.mark.scale.setScalar(0.4 + Math.min(1, this.t / this.fall) * 0.6);
    const p = this.player.pos;
    const d2 = (p.x - this.pos.x) ** 2 + (p.y + 0.9 - this.pos.y) ** 2 + (p.z - this.pos.z) ** 2;
    if (d2 < 1.2) this.player.hurt(this.pos);
    if (d2 < 1.2 || this.t >= this.fall) this.burst();
  }
  burst() {
    const g = this.game;
    g.audio.play('land', this.pos);
    g.particles.emit('pop', this.pos.x, this.pos.y, this.pos.z, 8, [1, 1, 1]);
    const p = this.player.pos;
    if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 1.1 && p.y < this.pos.y + 1) this.player.hurt(this.pos);
    this.remove();
  }
  remove() {
    super.remove();
    this.level.root.remove(this.mark);
  }
}

class Icicle extends Entity {
  constructor(L, x, z) {
    const y = L.gy(x, z);
    super(L, x, y, z);
    const m = new THREE.Group();
    part(m, G.cone(0.35, 1.8, 6).rotateX(Math.PI).translate(0, 1.8, 0), mat(0xbfe4ff), 0, 0, 0);
    this.setObj(m);
    this.mark = warnMark(L, x, y, z, 1.2);
    this.t = 0;
    this.fall = 1.1;
  }
  update(dt) {
    this.t += dt;
    const k = Math.min(1, this.t / this.fall);
    this.mark.scale.setScalar(0.4 + k * 0.6);
    this.obj.position.set(this.pos.x, this.pos.y + 12 * (1 - k * k), this.pos.z);
    if (k < 1) return;
    const g = this.game, p = this.player.pos;
    g.audio.play('shatter', this.pos);
    g.particles.emit('sparkle', this.pos.x, this.pos.y + 0.3, this.pos.z, 10, [0.8, 0.9, 1]);
    if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 1.3 && p.y < this.pos.y + 1.4) this.player.hurt(this.pos);
    this.remove();
  }
  remove() {
    super.remove();
    this.level.root.remove(this.mark);
  }
}

// Riesenschneeball: rollt geradeaus, bis er über den Gipfelrand kullert
class BigSnowball extends Entity {
  constructor(L, x, z, dx, dz, speed) {
    super(L, x, MT.top, z);
    this.r = 1.4;
    this.setObj(makeSnowball(this.r));
    this.dir = new THREE.Vector3(dx, 0, dz).normalize();
    this.speed = speed;
    this.shadow = new BlobShadow(L, 2.6);
    this.vy = 0;
    this.off = false;
  }
  update(dt) {
    this.pos.x += this.dir.x * this.speed * dt;
    this.pos.z += this.dir.z * this.speed * dt;
    const d = Math.hypot(this.pos.x - MT.x, this.pos.z - MT.z);
    if (d > MT.rTop - 0.5) this.off = true;
    if (this.off) {
      this.vy -= 30 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y < MT.top - 25) return this.remove();
    }
    this.obj.position.set(this.pos.x, this.pos.y + this.r, this.pos.z);
    this.obj.rotation.x += this.speed * dt / this.r * this.dir.z;
    this.obj.rotation.z -= this.speed * dt / this.r * this.dir.x;
    this.shadow.update(this.pos.x, MT.top, this.pos.z);
    if (Math.random() < dt * 20) this.game.particles.emit('dust', this.pos.x, this.pos.y, this.pos.z, 1);
    const p = this.player.pos;
    if (!this.off && Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < this.r + 0.4 && p.y < this.pos.y + this.r * 1.6) this.player.hurt(this.pos);
  }
}

function warnMark(L, x, y, z, r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a3a6a, transparent: true, opacity: 0.4, depthWrite: false }));
  m.position.set(x, y + 0.06, z);
  L.root.add(m);
  return m;
}

class Bibber extends Entity {
  constructor(L, shard) {
    super(L, MT.x, MT.top, MT.z - 3);
    this.model = makeYeti();
    this.model.scale.setScalar(BOSS_SCALE);
    this.rig = this.model.userData.rig;
    this.setObj(this.model);
    this.shadow = new BlobShadow(L, 3.4);
    this.shard = shard;
    this.maxHp = 3;
    this.hp = 3;
    this.active = false;
    this.facing = 0;
    this.spawned = [];
    this.set('idle');
    // Schneehaufen, in dem er stecken bleibt
    this.pile = new THREE.Mesh(G.hemi(1.6, 12, 6), mat(0xf4f8ff, { map: L.game.tex.snow }));
    this.pile.scale.y = 0.7;
    this.pile.visible = false;
    L.root.add(this.pile);
  }

  get phase() { return this.maxHp - this.hp + 1; }

  set(s) {
    this.state = s;
    this.st = 0;
  }

  async start() {
    if (this.active || this.state === 'dead') return;
    const g = this.game, L = this.level;
    await g.cutscene(async () => {
      await g.camTo([this.pos.x + 6, this.pos.y + 4, this.pos.z + 9], [this.pos.x, this.pos.y + 3, this.pos.z], 1.2);
      g.audio.playMusic('boss');
      g.audio.play('grumble', this.pos);
      if (!L.flag('bibberIntro')) {
        L.setFlag('bibberIntro');
        await g.say([
          { who: 'bibber', text: 'Brrrr! Wer stört mich beim Bibbern? Ich bin Bibber, der gefürchtetste Yeti der Welt! Hatschi!' },
          { who: 'bibber', text: 'König Krötus hat mir diesen warmen, goldenen Stein geschenkt. Er ist das Einzige, was mich hier oben wärmt – den kriegt ihr nicht!' },
          { who: 'kiki', text: 'Weich seinen Schneebällen aus, Bruno! Die Schatten zeigen, wo sie landen.' },
          { who: 'kiki', text: 'Und wenn er nach dem Riesenwurf ausrutscht und mit dem Kopf im Schnee steckt: drauf mit Stampfer, Rolle oder Schnabel!' },
        ]);
      } else {
        await g.say([{ who: 'bibber', text: 'Ihr schon wieder?! Brrr ... dann gibt es eben noch eine Ladung Schnee!' }]);
      }
    });
    this.active = true;
    this.hp = this.maxHp;
    this.set('walk');
    g.hud.setBoss(1, 'Bibber, der Schneeball-Yeti');
  }

  reset() {
    if (!this.active) return;
    this.active = false;
    this.clearSpawned();
    this.hp = this.maxHp;
    this.set('idle');
    this.pos.set(MT.x, MT.top, MT.z - 3);
    this.pile.visible = false;
    this.game.audio.playMusic('frost');
    this.game.hud.setBoss(null);
    this.addTrigger();
  }

  addTrigger() {
    this.level.trigger(MT.x, MT.z, { y: MT.top, r: MT.rTop - 2.5, h: 4, onEnter: () => this.start() });
  }

  clearSpawned() {
    for (const e of this.spawned) if (e.alive) e.remove();
    this.spawned = [];
    if (this.held) {
      this.level.root.remove(this.held);
      this.held = null;
    }
  }

  spawn(e) {
    this.spawned.push(this.level.spawn(e));
    return e;
  }

  update(dt) {
    this.t += dt;
    this.st += dt;
    const g = this.game, p = this.player, rig = this.rig, L = this.level;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    this.spawned = this.spawned.filter((e) => e.alive);
    let speed = 0, bob = 0, lean = 0, armsUp = 0;
    const ph = this.phase;

    if (this.state === 'idle') {
      // zittert vor Kälte
      bob = Math.sin(this.t * 30) * 0.02;
      armsUp = 0.3;
    } else if (this.state === 'walk') {
      this.facing = dampAngle(this.facing, Math.atan2(dx, dz), 3, dt);
      speed = d > 3.5 ? 2.4 + ph * 0.3 : 0;
      bob = Math.abs(Math.sin(this.t * 6)) * 0.12;
      if (this.st > 1.4) {
        this.set('throw');
        this.throws = 0;
        this.throwT = 0.2;
      }
    } else if (this.state === 'throw') {
      this.facing = dampAngle(this.facing, Math.atan2(dx, dz), 5, dt);
      this.throwT -= dt;
      armsUp = this.throwT < 0.15 ? 2.6 : 1.2;
      const total = [0, 3, 4, 5][ph];
      if (this.throwT <= 0 && this.throws < total) {
        this.throwT = [0, 0.6, 0.5, 0.42][ph];
        const lead = this.throws === 0 ? 0 : 1.5;
        let tx = p.pos.x + p.vel.x * 0.3 * lead + (this.throws ? (Math.random() - 0.5) * 2 : 0);
        let tz = p.pos.z + p.vel.z * 0.3 * lead + (this.throws ? (Math.random() - 0.5) * 2 : 0);
        const cd = Math.hypot(tx - MT.x, tz - MT.z), max = ARENA_R;
        if (cd > max) { tx = MT.x + ((tx - MT.x) / cd) * max; tz = MT.z + ((tz - MT.z) / cd) * max; }
        this.spawn(new Snowball(L, this.pos.x, this.pos.y + 4, this.pos.z, tx, tz, 1.0));
        g.audio.play('peck', this.pos);
        this.throws++;
        // ab Phase 2 lösen sich dabei Eiszapfen
        if (ph >= 2 && this.throws % 2 === 1) {
          const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 3;
          let ix = p.pos.x + Math.cos(a) * r, iz = p.pos.z + Math.sin(a) * r;
          const ic = Math.hypot(ix - MT.x, iz - MT.z);
          if (ic > ARENA_R) { ix = MT.x + ((ix - MT.x) / ic) * ARENA_R; iz = MT.z + ((iz - MT.z) / ic) * ARENA_R; }
          this.spawn(new Icicle(L, ix, iz));
        }
      }
      if (this.throws >= total && this.throwT <= 0) {
        this.set('scoop');
        g.audio.play('grumble', this.pos);
      }
    } else if (this.state === 'scoop') {
      // hebt einen Riesenschneeball über den Kopf – deutliche Vorwarnung
      this.facing = dampAngle(this.facing, Math.atan2(dx, dz), 4, dt);
      armsUp = 2.9;
      const dur = [0, 1.2, 1.0, 0.9][ph];
      if (!this.held) {
        this.held = makeSnowball(1.4);
        L.root.add(this.held);
      }
      const k = Math.min(1, this.st / dur);
      this.held.scale.setScalar(0.3 + k * 0.7);
      this.held.position.set(this.pos.x, this.pos.y + 4.8 * BOSS_SCALE / 1.5 + 1, this.pos.z);
      if (this.st > dur) this.hurl();
    } else if (this.state === 'slip') {
      // rutscht aus und landet kopfüber im Schnee
      const k = Math.min(1, this.st / 0.5);
      lean = k * 1.35;
      if (this.st > 0.5) {
        this.set('stuck');
        this.pile.visible = true;
        g.audio.play('pound', this.pos);
        g.renderer.shake = 0.7;
        g.particles.emit('pop', this.pos.x, this.pos.y + 0.5, this.pos.z, 14, [1, 1, 1]);
      }
    } else if (this.state === 'stuck') {
      lean = 1.35;
      bob = Math.sin(this.t * 18) * 0.03;
      const dur = [0, 3.4, 3.0, 2.6][ph];
      const hx = this.pos.x + Math.sin(this.facing) * 2.3, hz = this.pos.z + Math.cos(this.facing) * 2.3;
      this.pile.position.set(hx, this.pos.y - 0.2, hz);
      if (Math.random() < dt * 5) g.particles.emit('sparkle', hx, this.pos.y + 1.5, hz, 1, [1, 1, 0.6]);
      if (this.st > dur) {
        this.pile.visible = false;
        this.set('walk');
      }
    } else if (this.state === 'hurt') {
      bob = Math.sin(Math.min(1, this.st) * Math.PI) * 1.2;
      this.pile.visible = false;
      if (this.st > 1) this.set('walk');
    } else if (this.state === 'dead') {
      const k = Math.min(1, this.st / 1.2);
      lean = -k * 0.3;
      if (Math.random() < dt * 15) g.particles.emit('sparkle', this.pos.x, this.pos.y + 3, this.pos.z, 1);
      if (this.st > 1.4) this.finish();
    }

    if (speed) {
      this.pos.x += Math.sin(this.facing) * speed * dt;
      this.pos.z += Math.cos(this.facing) * speed * dt;
    }
    const cd = Math.hypot(this.pos.x - MT.x, this.pos.z - MT.z), max = ARENA_R - 2.5;
    if (cd > max) {
      this.pos.x = MT.x + ((this.pos.x - MT.x) / cd) * max;
      this.pos.z = MT.z + ((this.pos.z - MT.z) / cd) * max;
    }
    this.obj.position.set(this.pos.x, this.pos.y + bob, this.pos.z);
    this.obj.rotation.set(lean, this.facing, 0, 'YXZ');
    rig.armL.rotation.z = damp(rig.armL.rotation.z, -armsUp, 8, dt);
    rig.armR.rotation.z = damp(rig.armR.rotation.z, armsUp, 8, dt);
    rig.legs.forEach((l, i) => { l.rotation.x = speed ? Math.sin(this.t * 10 + i * Math.PI) * 0.4 : 0; });
    this.shadow.update(this.pos.x, this.pos.y, this.pos.z);
    this.collide(d, dx, dz);
  }

  hurl() {
    const g = this.game, L = this.level, p = this.player.pos;
    if (this.held) {
      L.root.remove(this.held);
      this.held = null;
    }
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    const base = Math.atan2(dx, dz);
    const dirs = this.phase >= 3 ? [base - 0.35, base + 0.35] : [base];
    for (const a of dirs) this.spawn(new BigSnowball(L, this.pos.x + Math.sin(a) * 2, this.pos.z + Math.cos(a) * 2, Math.sin(a), Math.cos(a), [0, 9, 10.5, 11][this.phase]));
    g.audio.play('boing', this.pos);
    this.set('slip');
  }

  collide(d, dx, dz) {
    const g = this.game, p = this.player;
    const push = () => {
      const min = 1.4 + p.radius;
      if (d < min && p.pos.y < this.pos.y + 3.5) {
        p.pos.x = this.pos.x + (dx / d) * min;
        p.pos.z = this.pos.z + (dz / d) * min;
      }
    };
    if (!this.active || this.state === 'hurt' || this.state === 'dead') return push();
    const stuck = this.state === 'stuck';
    // steckt er fest, ist sein Rücken die Zielscheibe
    const cx = stuck ? this.pos.x + Math.sin(this.facing) * 1 : this.pos.x;
    const cz = stuck ? this.pos.z + Math.cos(this.facing) * 1 : this.pos.z;
    const dd = Math.hypot(p.pos.x - cx, p.pos.z - cz);
    const top = this.pos.y + (stuck ? 2.2 : 4.3);
    const stomp = dd < 2 && p.vel.y < -1 && p.pos.y > top - 1 && p.pos.y < top + 1.5;
    const attack = p.attackHits(new THREE.Vector3(cx, this.pos.y, cz), 1.5, 3);
    if (stomp || attack) {
      if (stuck) return this.hit();
      if (!this.hintCool || this.t > this.hintCool) {
        this.hintCool = this.t + 0.7;
        g.audio.play('hit', this.pos);
        if (stomp) p.bounce(12);
        else { p.vel.x = (dx / d) * 9; p.vel.z = (dz / d) * 9; }
        g.toast('Sein Fell ist zu dick! Warte, bis er im Schnee steckt.', 2);
      }
      return;
    }
    if (!stuck && d < 1.3 + p.radius && p.pos.y < this.pos.y + 3.5) p.hurt(this.pos);
    else push();
  }

  hit() {
    const g = this.game;
    this.hp--;
    g.audio.play('bosshit', this.pos);
    g.renderer.shake = 0.9;
    g.input.rumble(250, 1);
    g.particles.emit('pop', this.pos.x, this.pos.y + 2, this.pos.z, 14, [0.8, 0.9, 1]);
    this.player.bounce(11);
    g.hud.setBoss(this.hp / this.maxHp, 'Bibber, der Schneeball-Yeti');
    this.clearSpawned();
    this.pile.visible = false;
    if (this.hp <= 0) {
      g.hud.setBoss(null);
      this.active = false;
      this.set('dead');
      g.audio.stopMusic();
      return;
    }
    this.set('hurt');
    g.say([[{ who: 'bibber', text: 'Au! Schnee in den Ohren! Jetzt hagelt es Eiszapfen!' }], [{ who: 'bibber', text: 'GRRR! Doppelte Portion Schnee!' }]][2 - this.hp]);
  }

  async finish() {
    if (!this.alive) return;
    const g = this.game, L = this.level;
    L.setFlag('bibber');
    this.remove();
    L.root.remove(this.pile);
    makeBibberNpc(L, this.pos.x, this.pos.z, this.facing);
    g.audio.playMusic('frost');
    await g.cutscene(async () => {
      await g.camTo([this.pos.x + 5, this.pos.y + 3.5, this.pos.z + 7], [this.pos.x, this.pos.y + 2.5, this.pos.z], 0.8);
      await g.say([
        { who: 'bibber', text: 'Uff ... schon gut, ihr habt gewonnen. Hatschi! Nehmt den Stein.' },
        { who: 'bibber', text: 'Ehrlich gesagt ist mir sowieso nur kalt, weil ich immer allein hier oben sitze.' },
        { who: 'kiki', text: 'Dann komm doch mal runter ins Iglu-Dorf! Pippo freut sich bestimmt über einen Rennpartner.' },
        { who: 'bibber', text: 'Wirklich? ... Brrr, das wärmt mich mehr als jeder Stein.' },
      ]);
      if (this.shard) {
        await g.camTo([MT.x + 5, MT.top + 3.5, MT.z + 7], this.shard.pos, 0.8);
        this.shard.reveal();
        await g.wait(1);
      }
    });
  }
}

function makeBibberNpc(L, x, z, facing = 0) {
  const m = makeYeti();
  m.scale.setScalar(BOSS_SCALE);
  const npc = L.npc(m, x, z, {
    y: MT.top, who: 'bibber', facing, radius: 3.4,
    talk: (g) => g.say([{ who: 'bibber', text: 'Von hier oben sieht man die Eisnadel. Wer mutig ist, springt beim roten Wimpel ab und gleitet rüber. Ich bleib lieber hier. Hatschi!' }]),
  });
  return npc;
}

function buildBoss(L) {
  const won = L.flag('bibber');
  const shard = L.shard('bibber', MT.x, MT.top + 1.4, MT.z + 2, { hidden: !won });
  if (won) {
    makeBibberNpc(L, MT.x - 4, MT.z - 4, 0.6);
    return;
  }
  const boss = L.spawn(new Bibber(L, shard));
  L.bibber = boss;
  boss.addTrigger();
  L.moodZone(MT.x, MT.z, { r: MT.rTop, fade: 8, cond: () => boss.active, atmo: { fog: 0xa8b4c8, hemi: 0xc8d4e8, sun: 0xd8e0f0, skyTint: 0xb8c4d8, sunIntensity: 1.6, hemiIntensity: 1.5, fogNear: 30, fogFar: 150 } });
}
