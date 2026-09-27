// Muschelbucht: Sonnige Insel mit Leuchtturm, Schiffswrack, Käpt'n Barnabas, Kaktus-Banditen
// und dem grantigen Käpt'n Knack.
import * as THREE from 'three';
import { G, M, mat, part } from '../engine/geo.js';
import { defaultColorRule } from '../game/terrain.js';
import { makeCaptain, makeCrab } from '../game/models.js';
import { Entity, BlobShadow } from '../game/entities.js';
import { rng, fbm, damp, dampAngle, lerp } from '../engine/util.js';

const LIGHT = { x: 38, z: -38 };
const ARENA = { x: -30, z: 18, r: 11 };
const WRECK = { x: -22, z: -50, rot: 0.3 };
const PIER = { x: 20, z: 30 };
const ROCK = { x: 47, z: 26 };

export default {
  id: 'beach',
  name: 'Muschelbucht',
  subtitle: 'Welt 2',
  music: 'beach',
  reverb: 'beach', // kurz und offen
  ambience: { id: 'beach' }, // Brandung, Möwen
  underwater: 0x1f6aa8,

  atmosphere() {
    return {
      sky: 0xa8dcff, fog: 0xb8e4ff, fogNear: 80, fogFar: 300,
      hemi: 0xe8f6ff, ground: 0xb89a6a, sun: 0xfff0d0, sunIntensity: 2.6, hemiIntensity: 1.7,
    };
  },

  build(L) {
    const T = L.terrain({ size: 240, cell: 2, base: -14 });
    // Insel mit flachem Strand
    T.plateau(0, -4, 40, 1.2, 12);
    T.forEach((x, z, k) => {
      const d = Math.hypot(x, z + 4);
      const wob = fbm(x * 0.04, z * 0.04, 12, 2);
      if (d < 50 + wob * 10) T.h[k] = Math.max(T.h[k], lerp(-14, 1.2, Math.min(1, Math.max(0, 1 - (d - 34 - wob * 10) / 16))));
    });
    T.hill(-16, -14, 18, 6);
    T.hill(10, -22, 14, 3.5);
    T.noise(0.5, 0.06, 31);
    // Leuchtturm-Kap
    T.plateau(LIGHT.x - 1, LIGHT.z + 1, 10, 5.5, 2.5);
    T.ramp(20, -18, 1.3, 30, -30, 5.5, 5, 2);
    // Arena
    T.plateau(ARENA.x, ARENA.z, ARENA.r + 1, 0.6, 3, 'set');
    // Wrack-Untergrund
    T.plateau(WRECK.x, WRECK.z, 12, -10.5, 6, 'set');
    // Felsinsel
    T.plateau(ROCK.x, ROCK.z, 3.6, 2.6, 1.5);
    // Portalplatz
    T.plateau(0, 34, 6, 1.4, 4, 'set');

    L.finishTerrain(defaultColorRule({ grass: 0x74c24a, grass2: 0x9ad24a, rock: 0x9a8a72, sand: 0xf0dc9a, sandLevel: 1.6, rockSlope: 0.85, seed: 13 }), 'sand', 0.2);
    L.world.bounds = { r: 88 };
    L.sky({ top: 0x2f8ae8, bottom: 0xb8e4ff, mountains: null, clouds: 18, seed: 9 });
    L.water({ y: 0, size: 1200, color: 0x2fa8e8, opacity: 0.75 });
    L.killY = -40;

    // ---------- Leuchtturm mit Wendeltreppe ----------
    const ly = L.gy(LIGHT.x, LIGHT.z);
    L.add(G.cyl(2.9, 3.5, 22, 14), M(LIGHT.x, ly - 0.3, LIGHT.z), (x, y) => new THREE.Color(Math.floor((y - ly) / 3.5) % 2 ? 0xd83a2a : 0xf4f0e8), 'brick', 0.4);
    L.world.addCyl({ x: LIGHT.x, z: LIGHT.z, y: ly - 1, r: 3.3, h: 23 });
    const steps = 48, rise = 0.46;
    let firstStep = null;
    for (let i = 0; i < steps; i++) {
      const a = -Math.PI * 0.75 + i * 0.4;
      const top = ly + rise * (i + 1);
      const x = LIGHT.x + Math.cos(a) * 4.4, z = LIGHT.z + Math.sin(a) * 4.4;
      L.box({ x, z, y: top - 0.35, w: 2.1, h: 0.35, d: 2.2, rot: -a, color: 0xb09a7a, tex: 'wood', uv: 0.8, camBlock: false });
      if (i % 4 === 0) L.berry(x, top + 0.9, z);
      if (!firstStep) firstStep = [x, z];
    }
    const topY = ly + rise * steps;
    // Balkon mit Luke, durch die die Treppe nach oben führt (von unten durchlässig)
    const lastA = -Math.PI * 0.75 + (steps - 1) * 0.4;
    const gapFrom = lastA - 1.75, gapTo = lastA + 0.15;
    const inGap = (a) => {
      const d = Math.atan2(Math.sin(a - (gapFrom + gapTo) / 2), Math.cos(a - (gapFrom + gapTo) / 2));
      return Math.abs(d) < (gapTo - gapFrom) / 2;
    };
    const thetaStart = Math.PI / 2 - gapFrom;
    const ringGeo = new THREE.CylinderGeometry(5.4, 5.4, 0.5, 20, 1, false, thetaStart, Math.PI * 2 - (gapTo - gapFrom)).translate(0, 0.25, 0);
    L.add(ringGeo, M(LIGHT.x, topY - 0.5, LIGHT.z), 0x8a8a8a, 'stone');
    L.world.addCyl({ x: LIGHT.x, z: LIGHT.z, y: topY - 0.5, r: 5.4, h: 0.5, camBlock: false, solid: false });
    L.add(G.cyl(2.2, 2.2, 3.2, 10), M(LIGHT.x, topY, LIGHT.z), 0xfff6c0, 'plain');
    L.add(G.cone(2.8, 2.2, 10), M(LIGHT.x, topY + 3.2, LIGHT.z), 0xd83a2a, 'tiles');
    L.world.addCyl({ x: LIGHT.x, z: LIGHT.z, y: topY, r: 2.2, h: 5.4 });
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      if (inGap(a)) continue;
      L.add(G.cyl(0.06, 0.06, 1, 4), M(LIGHT.x + Math.cos(a) * 5.2, topY, LIGHT.z + Math.sin(a) * 5.2), 0x333333, 'plain');
    }
    const beam = new THREE.Mesh(new THREE.ConeGeometry(3, 26, 12, 1, true).rotateZ(Math.PI / 2).translate(13, 0, 0), new THREE.MeshBasicMaterial({
      color: 0xfff6b0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    beam.position.set(LIGHT.x, topY + 1.6, LIGHT.z);
    L.root.add(beam);
    L.animated.push((dt, t) => { beam.rotation.y = t * 0.6; });
    L.shard('leuchtturm', LIGHT.x + Math.cos(lastA + 2.4) * 3.8, topY + 1.3, LIGHT.z + Math.sin(lastA + 2.4) * 3.8);
    L.firefly('f1', LIGHT.x + Math.cos(-Math.PI * 0.75 + 20 * 0.4) * 4.4, ly + rise * 21 + 1.4, LIGHT.z + Math.sin(-Math.PI * 0.75 + 20 * 0.4) * 4.4);
    L.sign(24, -18, -0.9, 'Leuchtturm', '');
    void firstStep;

    // ---------- Käpt'n Knack ----------
    const ay = L.gy(ARENA.x, ARENA.z);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      if (Math.abs(((a - 0.3 + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.35) continue; // Eingang Richtung Osten
      L.rock(ARENA.x + Math.cos(a) * (ARENA.r + 1.5), ARENA.z + Math.sin(a) * (ARENA.r + 1.5), { s: 1.6 + (i % 3) * 0.4, sy: 1.4, color: 0xb0a080 });
    }
    const knackShard = L.shard('knack', ARENA.x, ay + 1.4, ARENA.z, { hidden: true });
    if (knackShard) {
      const boss = L.spawn(new Knack(L, ARENA.x - 3, ARENA.z - 2, knackShard));
      L.boss = boss;
      L.trigger(ARENA.x, ARENA.z, { r: ARENA.r - 2, onEnter: () => boss.start() });
    }
    L.firefly('f3', ARENA.x - 6, null, ARENA.z + ARENA.r + 5);
    L.berryRing(ARENA.x, ARENA.z, ARENA.r + 4.5, 10);

    // ---------- Schiffswrack ----------
    const wx = WRECK.x, wz = WRECK.z, wr = WRECK.rot;
    const c = Math.cos(wr), s = Math.sin(wr);
    const loc = (lx, lz) => [wx + lx * c + lz * s, wz - lx * s + lz * c];
    const hullC = 0x6a4a2a;
    const floorY = -10.3;
    L.box({ x: wx, z: wz, y: floorY, w: 7, h: 0.6, d: 16, rot: wr, color: hullC, tex: 'wood', uv: 0.6 });
    for (const sx of [-1, 1]) {
      // Seitenwand mit Loch auf der linken Seite
      if (sx < 0) {
        for (const [lz, len] of [[-5, 6], [5.5, 5]]) {
          const [bx, bz] = loc(-3.5, lz);
          L.box({ x: bx, z: bz, y: floorY, w: 0.6, h: 8, d: len, rot: wr, color: hullC, tex: 'wood', uv: 0.6 });
        }
      } else {
        const [bx, bz] = loc(3.5, 0);
        L.box({ x: bx, z: bz, y: floorY, w: 0.6, h: 8, d: 16, rot: wr, color: hullC, tex: 'wood', uv: 0.6 });
      }
    }
    for (const lz of [-8, 8]) {
      const [bx, bz] = loc(0, lz);
      L.box({ x: bx, z: bz, y: floorY, w: 7, h: 8.5, d: 0.6, rot: wr, color: hullC, tex: 'wood', uv: 0.6 });
    }
    // Mast mit zerrissenem Segel ragt aus dem Wasser
    const [mx, mz] = loc(0, -2);
    L.add(G.cyl(0.35, 0.45, 20, 8), M(mx, floorY, mz, 0, 1, 0.12, 0.05), 0x5a3a1a, 'bark');
    L.add(G.box(7, 0.35, 0.35), M(mx + 0.8, 6.5, mz, wr), 0x5a3a1a, 'wood');
    L.add(G.box(6, 4, 0.08), M(mx + 0.8, 2.4, mz + 0.1, wr), 0xe8e0c8, 'plain', 0.5, { doubleSide: true });
    L.add(G.cyl(1.4, 1.2, 1, 10, true), M(mx + 1.2, 7.5, mz, 0, 1, 0.12), 0x5a3a1a, 'wood', 0.5, { doubleSide: true });
    L.world.addCyl({ x: mx, z: mz, y: floorY, r: 0.5, h: 20 });
    // Piratenflagge
    L.add(G.box(1.8, 1.1, 0.05), M(mx + 1.8, 9.5, mz, wr), 0x1a1a1a, 'plain');
    L.add(G.sphere(0.25, 6, 4), M(mx + 1.8, 10, mz + 0.05, wr), 0xffffff, 'plain');
    L.shard('wrack', wx, floorY + 1.6, wz);
    // im Rumpf des Wracks klingt alles hohl
    L.soundZone(wx, wz, { r: 8.5, y: floorY, h: 8.5, reverb: 0.25 });
    L.berryLine(loc(0, -6)[0], loc(0, -6)[1], loc(0, 6)[0], loc(0, 6)[1], 4, 0, floorY + 1.2);
    // Seegras
    const sr = rng(5);
    for (let i = 0; i < 24; i++) {
      const a = sr() * Math.PI * 2, d = 9 + sr() * 12;
      const x = wx + Math.cos(a) * d, z = wz + Math.sin(a) * d;
      L.add(G.cone(0.4, 2 + sr() * 3, 4), M(x, L.gy(x, z), z, sr() * 6, 1, (sr() - 0.5) * 0.4), 0x2a8a4a, 'leaves');
    }
    L.lernstein(-14, -33, {
      move: 'dive', title: 'Tauchen', facing: Math.PI + 0.4,
      lines: [{ who: 'tilo', text: 'Tauchen! Drück im Wasser Z, um abzutauchen. Mit A schwimmst du nach oben, mit Z oder B tiefer. Behalte deine Luft im Auge – an der Oberfläche füllt sie sich wieder auf!' }],
    });

    // ---------- Käpt'n Barnabas' Steg & Schatzsuche ----------
    const pierY = 1.3;
    for (let i = 0; i < 6; i++) {
      const x = PIER.x - 4 + i * 1.8, z = PIER.z - 4 + i * 1.8;
      L.add(G.box(3, 0.3, 1.6), M(x, pierY - 0.3, z, Math.PI / 4), 0xb08a5a, 'wood', 0.8);
      if (i % 2 === 0) for (const sx of [-1, 1]) L.add(G.cyl(0.18, 0.18, 6, 5), M(x + sx * 1.1, -4.5, z - sx * 1.1), 0x6a4a2a, 'bark');
    }
    L.world.addBox({ x: PIER.x + 0.5, z: PIER.z + 0.5, y: pierY - 3, w: 3, h: 3, d: 11.5, rot: Math.PI / 4, camBlock: false });
    const capPos = [PIER.x + 4, PIER.z + 4];
    const schatzShard = L.shard('schatz', capPos[0] - 1.5, pierY + 1.3, capPos[1] - 2.5, { hidden: true });
    let xLeft = 3;
    L.npc(makeCaptain(), capPos[0], capPos[1], { y: pierY, who: 'kapitaen', facing: -Math.PI * 0.75, talk: (g) => captainTalk(L, g) });
    for (const [x, z] of [[-6, 8], [24, -6], [-36, -6]]) {
      L.poundSpot(x, z, {
        kind: 'x',
        onPound: () => {
          xLeft--;
          const g = L.game;
          if (!schatzShard) return;
          if (xLeft > 0) g.toast(`Schatz-Markierung gefunden! Noch ${xLeft}`);
          else {
            g.cutscene(async () => {
              await g.say([{ who: 'kapitaen', text: 'Donnerwetter! Ich hab es bis hierher gehört! Das war die letzte Markierung! Kommt her, ihr Landratten, der Schatz ist geborgen!' }]);
              await g.camTo([schatzShard.pos.x + 5, schatzShard.pos.y + 3, schatzShard.pos.z - 5], schatzShard.pos, 0.8);
              schatzShard.reveal();
              await g.wait(1);
            });
          }
        },
      });
    }
    // Hütte
    const hx = 10, hz = 24, hy = L.gy(hx, hz);
    L.box({ x: hx, z: hz, y: hy - 0.2, w: 5, h: 3.2, d: 4, rot: 0.6, color: 0xc8a070, tex: 'wood' });
    L.add(G.cone(4.2, 2.4, 4), M(hx, hy + 3, hz, 0.6 + Math.PI / 4), 0xe8d08a, 'leaves', 0.5);
    L.add(G.box(1.2, 2, 0.1), M(hx + Math.sin(0.6) * 2.05, hy - 0.2, hz + Math.cos(0.6) * 2.05, 0.6), 0x4a2e14, 'plain');

    // ---------- Fässer zur Felsinsel ----------
    // Fässer vom Ufer bis zur Felsinsel – erst dort, wo wirklich Wasser ist
    const dirX = ROCK.x / Math.hypot(ROCK.x, ROCK.z + 4), dirZ = (ROCK.z + 4) / Math.hypot(ROCK.x, ROCK.z + 4);
    const rockD = Math.hypot(ROCK.x, ROCK.z + 4);
    let d0 = 34;
    while (L.gy(dirX * d0, -4 + dirZ * d0) > -0.6 && d0 < rockD - 8) d0 += 0.5;
    const barrels = [];
    for (let d = d0 + 1.3; d < rockD - 4.2; d += 3.3) barrels.push([dirX * d, -4 + dirZ * d]);
    barrels.forEach(([x, z], i) => {
      const mesh = new THREE.Group();
      part(mesh, G.cyl(1.05, 1.05, 1.4, 10), mat(0x9a6a3a, { map: L.game.tex.wood }), 0, -1.4, 0);
      for (const y of [-1.2, -0.3]) part(mesh, G.torus(1.07, 0.06, 3, 12), mat(0x555555), 0, y, 0, Math.PI / 2, 0, 0);
      L.platform({ shape: 'cyl', r: 1.05, h: 1.4, mesh, path: (t) => ({ x, y: 0.55 + Math.sin(t * 1.6 + i * 1.3) * 0.3, z }) });
    });
    L.add(G.rock(4, 3), M(ROCK.x, 0.8, ROCK.z, 0, [1, 0.7, 1]), 0x9a8a72, 'rock', 0.5, { flat: true });
    L.tree(ROCK.x + 1, ROCK.z + 1, { kind: 'palm', s: 0.8, y: 2.4 });
    L.shard('fass', ROCK.x - 0.5, 2.6 + 1.3, ROCK.z - 1);
    L.firefly('f2', ROCK.x + 1.5, 2.6 + 1.6, ROCK.z - 2);
    for (const [x, z] of barrels) L.berry(x, 2.2, z);

    // ---------- Gegner & Äpfel ----------
    L.crab(14, 14, { wander: 6 });
    L.crab(-24, -22, { wander: 6 });
    L.crab(4, -34, { wander: 5 });
    // Kaktus-Banditen treiben sich auf dem trockenen Hügel herum
    L.cactus(-12, -10, { wander: 6 });
    L.cactus(-22, -18, { wander: 6 });
    L.cactus(12, -20, { wander: 5 });
    for (const [x, z, h] of [[-8, -18, 2.2], [-20, -8, 1.6], [-26, -14, 2.6], [8, -24, 1.8], [15, -16, 2.1], [-14, -24, 1.4]]) {
      const y = L.gy(x, z);
      L.add(G.cyl(0.32, 0.36, h, 8), M(x, y - 0.1, z), 0x5aa83a, 'leaves', 0.6);
      L.add(G.sphere(0.32, 8, 5), M(x, y + h - 0.1, z), 0x5aa83a, 'leaves', 0.6);
      for (const s of [-1, 1]) {
        L.add(G.cyl(0.16, 0.18, 0.7, 6), M(x + s * 0.45, y + h * 0.45, z, 0, 1, 0, s * 0.2), 0x5aa83a, 'leaves', 0.6);
        L.add(G.cyl(0.18, 0.18, 0.4, 6), M(x + s * 0.28, y + h * 0.42, z, 0, 1, 0, s * 1.4), 0x5aa83a, 'leaves', 0.6);
      }
      L.world.addCyl({ x, z, y: y - 0.5, r: 0.45, h: h + 0.5, camBlock: false, hazard: 1 });
    }
    L.apple(-4, 20);
    L.apple(30, -24);
    L.apple(-20, -30);
    L.apple(LIGHT.x + Math.cos(lastA + 3.6) * 3.8, LIGHT.z + Math.sin(lastA + 3.6) * 3.8, topY);

    // ---------- Glühwürmchen ----------
    L.firefly('f4', -16, null, -14);
    L.firefly('f5', 6, null, -40);
    L.fireflyShard('gluehwuermchen', 0, 10);

    // ---------- Beeren ----------
    L.berryLine(0, 18, 0, 0, 5);
    L.berryLine(4, 16, 18, 22, 4);
    L.berryLine(2, -4, 18, -16, 5);
    L.berryRing(-16, -14, 6, 6);
    L.berryLine(-8, 4, -20, 12, 4);
    L.berryLine(-8, -20, -14, -30, 3);

    // ---------- Ausgang ----------
    L.portal(0, 36, { rot: Math.PI, to: 'hub', spawn: 'from-beach', label: 'Wurzelhügel', color: 0xffd24a });
    L.spawnPoint('start', 0, 25, Math.PI);

    // ---------- Deko ----------
    const r = rng(99);
    for (let i = 0; i < 45; i++) {
      const a = r() * Math.PI * 2, d = 14 + r() * 26;
      const x = Math.cos(a) * d, z = Math.sin(a) * d - 4;
      if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r + 4) continue;
      if (Math.hypot(x - LIGHT.x, z - LIGHT.z) < 9 || (Math.abs(x) < 6 && z > 18)) continue;
      if (L.gy(x, z) < 0.6) continue;
      L.tree(x, z, { kind: 'palm', s: 0.9 + r() * 0.5 });
    }
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, d = 20 + r() * 28;
      const x = Math.cos(a) * d, z = Math.sin(a) * d - 4;
      const y = L.gy(x, z);
      if (y < 0 || y > 2) continue;
      const col = [0xffc0d0, 0xfff0e0, 0xffb080][i % 3];
      L.add(G.cone(0.35, 0.3, 6), M(x, y, z, r() * 6, 1, Math.PI / 2 - 0.3), col, 'plain');
    }
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, d = 34 + r() * 14;
      const x = Math.cos(a) * d, z = Math.sin(a) * d - 4;
      L.rock(x, z, { s: 1 + r() * 1.5, color: 0xa89a82 });
    }
    L.grass(-16, -14, 8, 6);
    L.grass(10, -22, 6, 5);
    L.flowers(-20, -8, 10, 4, [0xff6a3a, 0xffe14a, 0xff5ad0]);
  },

  onRespawn(L) {
    L.boss?.reset();
  },

  onEnter(L, g) {
    if (!L.flag('taunt')) {
      L.setFlag('taunt');
      g.cutscene(async () => {
        const p = g.player;
        await g.camTo([10, 12, 30], [LIGHT.x, 16, LIGHT.z], 0);
        await g.camTo([4, 8, 20], [LIGHT.x, 20, LIGHT.z], 3);
        g.audio.play('croak');
        await g.say([
          { who: 'koenig', text: 'QUAAAK! Salzwasser, Sand und Sonnenbrand – hoffentlich spülen euch die Wellen davon! Und meine Kaktus-Banditen piksen euch den Rest!' },
          { who: 'kiki', text: 'Ich bin ein Vogel, du Warzenkönig. Ich kann gar nicht ertrinken! ... Oder, Bruno?' },
          { who: 'bruno', text: 'Sicherheitshalber lernen wir am Lernstein beim Wrack erst mal Tauchen.' },
        ]);
        void p;
      });
    }
  },
};

async function captainTalk(L, g) {
  if (g.save.hasShard('beach:schatz')) {
    await g.say([{ who: 'kapitaen', text: 'Mit euch zwei segle ich jederzeit über die sieben Pfützen! Ahoi!' }]);
    return;
  }
  if (!L.flag('kapitaen')) {
    L.setFlag('kapitaen');
    await g.say([
      { who: 'kapitaen', text: 'Ahoi, Landratten! Ich bin Käpt\'n Barnabas, der bärtigste Kapitän der sieben Pfützen!' },
      { who: 'kiki', text: 'Den Bart sieht man schon von Weitem.' },
      { who: 'kapitaen', text: 'Hohoho! Seht her: eine echte Schatzkarte! Drei rote X sind hier auf der Insel eingezeichnet.' },
      { who: 'kapitaen', text: 'Leider ist mein alter Rücken zu steif zum Graben. Stampft kräftig auf alle drei X, und wir teilen die Beute!' },
    ]);
    return;
  }
  const left = L.entities.filter((e) => e.kind === 'x' && !e.done).length;
  await g.say([{ who: 'kapitaen', text: `Stampft auf die roten X im Sand! Mit dem Stampfer: springen und dann Z. Laut meinem Fernrohr fehlen noch ${left}.` }]);
}

// ---------- Boss: Käpt'n Knack ----------
class Knack extends Entity {
  constructor(L, x, z, shard) {
    super(L, x, L.gy(x, z), z);
    this.model = makeCrab(true);
    this.model.scale.setScalar(2.3);
    this.rig = this.model.userData.rig;
    this.setObj(this.model);
    this.shadow = new BlobShadow(L, 5);
    this.shard = shard;
    this.hp = 3;
    this.state = 'idle';
    this.st = 0;
    this.facing = 0;
    this.radius = 2.2;
    this.active = false;
    this.dirX = 0;
    this.dirZ = 0;
  }

  async start() {
    if (this.active || this.state === 'dead') return;
    const g = this.game;
    await g.cutscene(async () => {
      await g.camTo([this.pos.x + 7, this.pos.y + 4, this.pos.z + 8], [this.pos.x, this.pos.y + 1.5, this.pos.z], 1);
      g.audio.playMusic('boss');
      await g.say([
        { who: 'knack', text: 'Wer wagt es, meinen Strand zu betreten?! Ich bin Käpt\'n Knack, Schrecken der Gezeiten!' },
        { who: 'knack', text: 'Dieses goldene Glitzerding hat mir König Krötus zum Bewachen gegeben. Wollt ihr es haben? Dann holt es euch aus meinen Scheren!' },
        { who: 'kiki', text: 'Bruno, pass auf! Wenn er losstürmt und in den Felsen kracht, bleibt er stecken. Dann gibt\'s eins auf die Schale!' },
      ]);
    });
    this.active = true;
    this.set('walk');
    g.hud.setBoss(1, 'Käpt\'n Knack');
  }

  set(s) {
    this.state = s;
    this.st = 0;
  }

  reset() {
    if (!this.active) return;
    this.active = false;
    this.hp = 3;
    this.set('idle');
    this.pos.set(ARENA.x - 3, this.level.gy(ARENA.x - 3, ARENA.z - 2), ARENA.z - 2);
    this.game.audio.playMusic('beach');
    this.game.hud.setBoss(null);
    this.level.trigger(ARENA.x, ARENA.z, { r: ARENA.r - 2, onEnter: () => this.start() });
  }

  update(dt) {
    this.t += dt;
    this.st += dt;
    const g = this.game, p = this.player;
    const rig = this.rig;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    let speed = 0;
    if (this.state === 'dead') {
      this.obj.scale.setScalar(Math.max(0.01, 2.3 * (1 - this.st)));
      this.obj.rotation.y += dt * 12;
      if (this.st > 1) this.finish();
      return;
    }
    if (!this.active) {
      rig.claws.forEach((c, i) => { c.rotation.x = Math.sin(this.t * 2 + i) * 0.2; });
    } else if (this.state === 'walk') {
      this.facing = dampAngle(this.facing, Math.atan2(dx, dz), 3, dt);
      speed = 3 + (3 - this.hp) * 0.8;
      this.dirX = Math.sin(this.facing);
      this.dirZ = Math.cos(this.facing);
      if (this.st > 2.2 + Math.random() * 0.3) this.set('windup');
    } else if (this.state === 'windup') {
      this.facing = dampAngle(this.facing, Math.atan2(dx, dz), 6, dt);
      rig.claws.forEach((c) => { c.rotation.x = -1 + Math.sin(this.t * 30) * 0.3; });
      if (this.st > 0.8) {
        this.dirX = Math.sin(this.facing);
        this.dirZ = Math.cos(this.facing);
        this.set('charge');
        g.audio.play('roll', this.pos);
      }
    } else if (this.state === 'charge') {
      speed = 15 + (3 - this.hp) * 2;
      const cd = Math.hypot(this.pos.x - ARENA.x, this.pos.z - ARENA.z);
      if (cd > ARENA.r - 2.2 || this.st > 1.5) {
        this.set('stuck');
        g.audio.play('pound', this.pos);
        g.renderer.shake = 0.7;
        g.particles.emit('dust', this.pos.x, this.pos.y, this.pos.z, 14);
      }
    } else if (this.state === 'stuck') {
      rig.claws.forEach((c, i) => { c.rotation.x = 0.8 + Math.sin(this.t * 20 + i) * 0.1; });
      rig.body.rotation.z = Math.sin(this.t * 25) * 0.1;
      if (Math.random() < dt * 6) g.particles.emit('sparkle', this.pos.x, this.pos.y + 3.2, this.pos.z, 1, [1, 1, 0.6]);
      if (this.st > 2.6) this.set('walk');
    } else if (this.state === 'hurt') {
      rig.body.rotation.z = 0;
      this.pos.y = this.baseY + Math.sin(Math.min(1, this.st) * Math.PI) * 2;
      if (this.st > 1.1) {
        this.pos.y = this.baseY;
        this.set('walk');
      }
    }
    if (this.state !== 'stuck') rig.body.rotation.z = Math.sin(this.t * 14) * 0.06 * (speed ? 1 : 0);
    if (speed) {
      this.pos.x += this.dirX * speed * dt;
      this.pos.z += this.dirZ * speed * dt;
      const cd = Math.hypot(this.pos.x - ARENA.x, this.pos.z - ARENA.z), max = ARENA.r - 2;
      if (cd > max) {
        this.pos.x = ARENA.x + ((this.pos.x - ARENA.x) / cd) * max;
        this.pos.z = ARENA.z + ((this.pos.z - ARENA.z) / cd) * max;
      }
    }
    if (this.state !== 'hurt') this.pos.y = this.baseY = this.level.gy(this.pos.x, this.pos.z);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.facing + (this.state === 'walk' ? Math.PI / 2 : 0);
    this.shadow.update(this.pos.x, this.pos.y, this.pos.z);
    if (!this.active || this.state === 'hurt') return;

    // Treffer & Schaden
    const vulnerable = this.state === 'stuck';
    const top = this.pos.y + 2.2;
    if (p.attackHits(this.pos, this.radius, 2.2) || (d < this.radius + 0.5 && p.vel.y < -1 && p.pos.y > top - 0.6)) {
      if (vulnerable) this.hit();
      else if (!this.clangCool || this.t > this.clangCool) {
        this.clangCool = this.t + 0.5;
        g.audio.play('hit', this.pos);
        p.vel.x = (dx / d) * 10;
        p.vel.z = (dz / d) * 10;
        if (p.vel.y < 0) p.bounce(9);
        g.toast('Die Schale ist zu hart! Warte, bis er feststeckt.', 2);
      }
      return;
    }
    if (d < this.radius + p.radius - 0.2 && p.pos.y < top) p.hurt(this.pos);
  }

  hit() {
    const g = this.game;
    this.hp--;
    g.audio.play('bosshit', this.pos);
    g.renderer.shake = 0.8;
    g.input.rumble(250, 1);
    g.particles.emit('pop', this.pos.x, this.pos.y + 2, this.pos.z, 14, [1, 0.5, 0.4]);
    const p = this.player;
    p.bounce(10);
    g.hud.setBoss(this.hp / 3, 'Käpt\'n Knack');
    if (this.hp <= 0) {
      g.hud.setBoss(null);
      this.active = false;
      this.set('dead');
      g.audio.play('pop', this.pos);
      return;
    }
    this.set('hurt');
    const lines = [
      [{ who: 'knack', text: 'AUA! Meine schöne Schale! Na warte!' }],
      [{ who: 'knack', text: 'Grrr! Jetzt werde ich richtig knackig!' }],
    ][2 - this.hp];
    if (lines) g.say(lines);
  }

  async finish() {
    if (!this.alive) return;
    this.remove();
    const g = this.game;
    g.audio.playMusic('beach');
    await g.cutscene(async () => {
      await g.say([{ who: 'knack', text: 'Schon gut, schon gut! Ich ergebe mich! Nehmt das Glitzerding ... und erzählt bloß keinem, dass mich ein Dachs mit einem Vogel im Rucksack besiegt hat!' }]);
      await g.camTo([ARENA.x + 6, this.level.gy(ARENA.x, ARENA.z) + 4, ARENA.z + 7], this.shard.pos, 0.8);
      this.shard.reveal();
      await g.wait(1);
    });
  }
}
