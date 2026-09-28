// Pilzwald: Dämmriger Zauberwald mit Riesenpilzen, Giftsumpf und Opa Eiche.
import * as THREE from 'three';
import { G, M, mat, part } from '../engine/geo.js';
import { defaultColorRule } from '../game/terrain.js';
import { makeHedgehog, makeCloud, makePilz, makeFliegenpilz } from '../game/models.js';
import { Entity, BlobShadow, Grimmpilz } from '../game/entities.js';
import { rng, fbm, damp, dampAngle } from '../engine/util.js';
import { waterMaterial } from '../engine/fx.js';

const OAK = { x: 0, z: -14, r: 5.2 };
const SWAMP = { x: -42, z: 10, r: 16, y: -0.7 };
const ISLAND = { x: -46, z: 10 };
const CLEARING = { x: 36, z: -46 };
const HOLLOW = { x: -46, z: -44 };
const MOM = { x: 12, z: 42 };
const ARENA = { x: 0, z: -50, r: 12 }; // Hexenring von Fürst Fliegenpilz

export default {
  id: 'pilz',
  name: 'Pilzwald',
  subtitle: 'Welt 1',
  music: 'pilz',
  reverb: 'pilz', // weich und dicht
  // Grillen, Käuzchen, Blubbern am Giftsumpf
  ambience: { id: 'pilz', spots: [{ x: SWAMP.x, y: SWAMP.y, z: SWAMP.z, r: SWAMP.r - 2, sound: 'blub', every: [0.25, 1.1], ref: 5, range: 32 }] },
  wind: 0.7, // im dichten Wald nur ein Lüftchen
  ambientFx: ['fireflies', 'spores'],

  atmosphere() {
    return {
      sky: 0x9aa8d8, fog: 0x8f9ccc, fogNear: 45, fogFar: 175,
      hemi: 0xd8d0ff, ground: 0x4a3a5a, sun: 0xffe0c0, sunIntensity: 1.6, hemiIntensity: 1.8,
    };
  },

  build(L) {
    const T = L.terrain({ size: 200, cell: 2, base: 0 });
    T.noise(1.6, 0.04, 21);
    T.forEach((x, z, k) => {
      const d = Math.hypot(x, z);
      const edge = 72 + fbm(x * 0.06, z * 0.06, 8, 2) * 8;
      if (d > edge) T.h[k] += Math.min(30, (d - edge) * 2) + fbm(x * 0.1, z * 0.1, 5, 2) * 5;
    });
    T.pit(SWAMP.x, SWAMP.z, SWAMP.r - 3, -2.4, 4);
    T.plateau(ISLAND.x, ISLAND.z, 4, 0.3, 1.5, 'set');
    T.plateau(42, -2, 4.5, 7, 1.2);
    T.plateau(28, 3, 2.5, 0.3, 2, 'set');
    T.pit(HOLLOW.x, HOLLOW.z, 7, -1.5, 5);
    T.plateau(0, 64, 6, 0.5, 4, 'set');
    T.plateau(OAK.x, OAK.z, 12, 0.5, 5, 'set');
    T.plateau(ARENA.x, ARENA.z, ARENA.r + 2, 0.4, 4, 'set');
    const dirt = 0x8a6a4a;
    T.path([[0, 62], [0, 40], [4, 20], [0, 4]], 3, dirt);
    T.path([[4, 30], [MOM.x, MOM.z]], 2.4, dirt);
    T.path([[4, 20], [20, 12], [32, 8]], 2.4, dirt);
    T.path([[0, 4], [20, -20], [CLEARING.x, CLEARING.z]], 2.4, dirt);
    T.path([[0, 4], [-20, -20], [HOLLOW.x, HOLLOW.z]], 2.4, dirt);
    T.path([[0, 30], [-24, 12]], 2.4, dirt);
    T.path([[0, -26], [0, ARENA.z + ARENA.r - 2]], 2.6, dirt);
    T.paint(ARENA.x, ARENA.z, ARENA.r - 1, 0x6a8a3a, 2);
    L.finishTerrain(defaultColorRule({ grass: 0x3f8f4a, grass2: 0x5a9a3a, rock: 0x6f6878, dirt: 0x7a5a3a, rockSlope: 0.9, seed: 9 }));
    L.world.bounds = { r: 80 };
    L.sky({ top: 0x3a3a7a, bottom: 0x9aa8d8, mountains: 0x5a5a8a, clouds: 8, sun: false, seed: 3, mountainsH: 80 });
    // Mond
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: L.game.tex.glow, color: 0xe8f0ff, fog: false, depthWrite: false }));
    moon.position.set(-220, 240, -260);
    moon.scale.setScalar(110);
    L.root.add(moon);

    // ---------- Giftsumpf ----------
    // zähe, langsame Wellen und grünlicher Schaum am Rand
    const swamp = new THREE.Mesh(new THREE.RingGeometry(0.01, SWAMP.r + 2, 28, 5).rotateX(-Math.PI / 2), waterMaterial(new THREE.MeshLambertMaterial({
      color: 0x6a9a2a, map: L.game.tex.water.clone(), transparent: true, opacity: 0.92, emissive: 0x1a300a,
    }), { amp: 0.06, speed: 0.5, glint: 0.4 }));
    L.foam({ cx: SWAMP.x, cz: SWAMP.z, r: SWAMP.r + 2, y: SWAMP.y, tint: 1 });
    swamp.material.map.needsUpdate = true;
    swamp.material.map.repeat.set(4, 4);
    swamp.position.set(SWAMP.x, SWAMP.y, SWAMP.z);
    L.root.add(swamp);
    L.animated.push((dt, t) => {
      swamp.material.map.offset.set(Math.sin(t * 0.2) * 0.1, t * 0.02);
      if (Math.random() < dt * 4) {
        const a = Math.random() * 6.28, d = Math.random() * SWAMP.r;
        L.game.particles.spark.spawn({ x: SWAMP.x + Math.cos(a) * d, y: SWAMP.y + 0.1, z: SWAMP.z + Math.sin(a) * d, vy: 0.8, life: 1, s0: 0.4, s1: 0.1, r: 0.6, gg: 1, b: 0.3 });
      }
    });
    L.hazardAt = (x, y, z) => Math.hypot(x - SWAMP.x, z - SWAMP.z) < SWAMP.r + 1 && y < SWAMP.y + 0.05 && L.gy(x, z) < SWAMP.y;
    // Seerosen-Pfad
    const pads = [[-27, 12], [-30.5, 8], [-34, 11.5]];
    for (const [x, z] of pads) {
      L.cyl({ x, z, y: SWAMP.y - 0.4, r: 1.6, h: 0.55, seg: 10, color: 0x4aa83a, tex: 'leaves' });
      L.add(G.sphere(0.3, 6, 4), M(x + 0.6, SWAMP.y + 0.3, z - 0.4), 0xff8ad0, 'plain');
    }
    // Wölkchen trägt Bruno über den Sumpf
    const cloud = makeCloud();
    L.platform({ shape: 'cyl', r: 1.35, h: 0.6, mesh: cloud, path: (t) => ({ x: -37.5, y: SWAMP.y + 0.9 + Math.sin(t * 2.2) * 0.12, z: 10 + Math.sin(t * 0.9) * 4, rot: Math.PI / 2 }) });
    L.animated.push((dt, t) => { cloud.userData.rig.star.rotation.y = t * 2; });
    L.berryLine(-25, 12, -37.5, 10, 5, 1, SWAMP.y + 1.2);
    // Baumstumpf mit Splitter auf der Sumpfinsel
    const stumpShard = L.shard('stumpf', ISLAND.x, L.gy(ISLAND.x, ISLAND.z) + 1.4, ISLAND.z, { hidden: true });
    if (stumpShard) {
      L.breakable(ISLAND.x, ISLAND.z, { w: 2.6, h: 1.3, d: 2.6, color: 0x8a6440, tex: 'bark', onBreak: () => stumpShard.reveal() });
    } else {
      L.add(G.cyl(1.4, 1.6, 0.5, 8), M(ISLAND.x, L.gy(ISLAND.x, ISLAND.z), ISLAND.z), 0x8a6440, 'bark');
    }
    L.firefly('f3', ISLAND.x - 1, null, ISLAND.z + 3);
    L.tree(ISLAND.x - 2, ISLAND.z - 2.5, { kind: 'dead', s: 0.8 });

    // ---------- Opa Eiche ----------
    const oy = L.gy(OAK.x, OAK.z);
    L.add(G.cyl(4.4, OAK.r + 0.6, 29, 12), M(OAK.x, oy - 0.5, OAK.z), 0x8a6a48, 'bark', 0.3, { shade: 0.05 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      L.add(G.cyl(0.5, 1.4, 5, 6), M(OAK.x + Math.cos(a) * 5.5, oy - 0.8, OAK.z + Math.sin(a) * 5.5, 0, 1, Math.sin(a) * 0.9, -Math.cos(a) * 0.9), 0x7a5a3a, 'bark', 0.5);
    }
    L.world.addCyl({ x: OAK.x, z: OAK.z, y: oy - 1, r: OAK.r, h: 28.5 });
    // Baumpilz-Stufen spiralförmig nach oben
    const steps = 13;
    const stepPos = [];
    for (let i = 0; i < steps; i++) {
      const a = Math.PI * 0.5 + i * 0.62;
      const top = oy + 2 * (i + 1);
      const x = OAK.x + Math.cos(a) * 6.3, z = OAK.z + Math.sin(a) * 6.3;
      L.add(G.cyl(1.9, 1.5, 0.5, 10), M(x, top - 0.5, z), i % 2 ? 0xe8b04a : 0xd89a3a, 'mushroom', 0.5);
      L.world.addCyl({ x, z, y: top - 0.5, r: 1.9, h: 0.5 });
      stepPos.push([x, top, z]);
      L.berry(x, top + 1, z);
    }
    // Krone
    const crown = oy + 28;
    L.add(G.cyl(5, 4.6, 0.8, 12), M(OAK.x, crown - 0.8, OAK.z), 0x7a5a3a, 'wood', 0.4);
    L.world.addCyl({ x: OAK.x, z: OAK.z, y: crown - 0.8, r: 5, h: 0.8 });
    L.add(G.torus(4.8, 0.35, 5, 14), M(OAK.x, crown, OAK.z, 0, 1, Math.PI / 2), 0x5a3a2a, 'bark');
    const cr = rng(7);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      L.add(G.blob(4 + cr() * 2, i), M(OAK.x + Math.cos(a) * 9, crown + 2 + cr() * 4, OAK.z + Math.sin(a) * 9), new THREE.Color(0x3f8a3a).multiplyScalar(0.8 + cr() * 0.3), 'leaves', 0.3, { shade: 0.1, wind: 0.6 });
    }
    L.add(G.blob(6, 3), M(OAK.x, crown + 9, OAK.z, 0, [1.4, 0.8, 1.4]), 0x4a9a3a, 'leaves', 0.3, { shade: 0.1, wind: 0.5 });
    L.shard('eiche', OAK.x, crown + 1.4, OAK.z);
    L.firefly('f2', stepPos[7][0], stepPos[7][1] + 1.5, stepPos[7][2]);
    // Gesicht der Eiche (redet!)
    const face = new THREE.Group();
    for (const s of [-1, 1]) {
      part(face, G.sphere(0.8, 10, 8), mat(0xffffff), s * 1.3, 0, 0, 0, 0, 0, [1, 1.2, 0.5]);
      part(face, G.sphere(0.38, 8, 6), mat(0x1a1a1a), s * 1.3, -0.1, 0.35);
      part(face, G.box(1.6, 0.35, 0.4), mat(0x5a3a1a), s * 1.3, 1.05, 0.1, 0, 0, s * -0.2);
    }
    part(face, G.sphere(0.6, 8, 6), mat(0x7a5a3a), 0, -0.9, 0.4, 0, 0, 0, [1, 0.8, 1]);
    const mouth = part(face, G.torus(0.9, 0.2, 5, 12, Math.PI), mat(0x3a2210), 0, -2, 0.2, 0, 0, Math.PI);
    face.userData.rig = { head: mouth };
    face.position.set(OAK.x, oy + 5, OAK.z + OAK.r - 0.2);
    const oak = L.npc(face, OAK.x, OAK.z + OAK.r + 1.5, { who: 'eiche', radius: 4, prompt: 'Reden', talk: (g) => oakTalk(L, g) });
    oak.lookAtPlayer = false;
    oak.shadow.mesh.visible = false;
    oak.update = function (dt) {
      this.t += dt;
      face.position.set(OAK.x, oy + 5 + Math.sin(this.t * 1.2) * 0.05, OAK.z + OAK.r - 0.2);
      mouth.scale.y = this.talking ? 0.6 + Math.abs(Math.sin(this.t * 12)) * 0.6 : 1;
      if (this.distPlayer() < this.talkRadius && Math.abs(this.player.pos.y - oy) < 2.5) this.game.offerPrompt(this, 'Reden');
    };
    L.firefly('f1', OAK.x - 2, null, OAK.z - OAK.r - 2.5);

    // ---------- Hüpfpilze zur schwebenden Insel ----------
    L.bouncer(34, 6, { power: 24, r: 1.8, h: 0.9, color: 0xe23b6b });
    L.bouncer(42, -2, { y: 7, power: 24, r: 1.7, h: 0.8, color: 0x3b8be2 });
    L.mushroomDeco(27, 3, { h: 4, r: 2.2, color: 0xd8a02a });
    L.firefly('f5', 27, null, 3);
    const isl = { x: 52, z: -13, y: 15 };
    L.add(G.rock(4.5, 17), M(isl.x, isl.y - 3, isl.z, 0, [1, 0.8, 1]), 0x7a7288, 'rock', 0.4, { flat: true });
    L.add(G.cyl(4.3, 4.0, 0.6, 10), M(isl.x, isl.y - 0.6, isl.z), 0x4f9a3a, 'ground', 0.4);
    L.world.addCyl({ x: isl.x, z: isl.z, y: isl.y - 4, r: 4.2, h: 4 });
    L.shard('insel', isl.x, isl.y + 1.4, isl.z);
    L.mushroomDeco(isl.x + 2, isl.z + 1.5, { y: isl.y, h: 1.2, r: 0.8, color: 0xff5a5a, collide: false });
    L.berryArc(34, 6, 42, -2, 5, 5, 3);
    L.berryArc(42, -2, 52, -13, 6, 7, 8.5);

    // ---------- Käferlichtung ----------
    let beetlesLeft = 5;
    const kaeferShard = L.shard('kaefer', CLEARING.x, null, CLEARING.z, { hidden: true });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      L.beetle(CLEARING.x + Math.cos(a) * 7, CLEARING.z + Math.sin(a) * 7, {
        wander: 8, color: 0x7a3f9f,
        onDefeat: () => {
          beetlesLeft--;
          if (kaeferShard && beetlesLeft > 0) L.game.toast(`Blechkäfer: noch ${beetlesLeft}`);
          if (beetlesLeft === 0 && kaeferShard) {
            L.game.cutscene(async () => {
              const g = L.game;
              await g.camTo([CLEARING.x + 8, L.gy(CLEARING.x, CLEARING.z) + 6, CLEARING.z + 10], kaeferShard.pos, 1);
              kaeferShard.reveal();
              await g.wait(1);
              await g.say([{ who: 'kiki', text: 'Alle Blechkäfer verschrottet! Und seht mal, was sie für Krötus bewacht haben!' }]);
            });
          }
        },
      });
    }
    L.sign(26, -32, -0.7, 'Käferlichtung', 'Vorsicht!');
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.2;
      L.mushroomDeco(CLEARING.x + Math.cos(a) * 14, CLEARING.z + Math.sin(a) * 14, { h: 2.5 + (i % 3), r: 1.6 + (i % 2), color: [0xd84a3a, 0x8a4ad8, 0xd8a02a][i % 3] });
    }
    L.berryRing(CLEARING.x, CLEARING.z, 9, 8);

    // ---------- Hexenring mit Fürst Fliegenpilz ----------
    buildArena(L);

    // ---------- Igel-Familie ----------
    const momShard = L.shard('stupsi', MOM.x + 2.5, null, MOM.z + 1, { hidden: true });
    const mom = L.npc(makeHedgehog(1, true), MOM.x, MOM.z, { who: 'igel', facing: Math.PI, talk: (g) => momTalk(L, g) });
    L.mom = mom;
    L.add(G.hemi(3.2, 12, 5), M(MOM.x - 2, L.gy(MOM.x - 2, MOM.z + 4), MOM.z + 4, 0, [1, 0.8, 1]), 0x6a8a3a, 'leaves', 0.5);
    L.add(G.cyl(0.9, 0.9, 0.2, 10).rotateX(Math.PI / 2), M(MOM.x - 2, L.gy(MOM.x - 2, MOM.z + 4) + 0.9, MOM.z + 0.9), 0x3a2410, 'plain');
    L.world.addCyl({ x: MOM.x - 2, z: MOM.z + 4, y: L.gy(MOM.x - 2, MOM.z + 4), r: 3, h: 2.2 });
    if (momShard) {
      const stupsi = L.follower(makeHedgehog(0.55), HOLLOW.x + 2, HOLLOW.z, { who: 'stupsi', talk: (g) => stupsiTalk(L, g, stupsi) });
      L.stupsi = stupsi;
      stupsi.onFollow = (s) => {
        const pl = L.game.player.pos;
        if (!s.reunited && (Math.hypot(s.pos.x - MOM.x, s.pos.z - MOM.z) < 7 || Math.hypot(pl.x - MOM.x, pl.z - MOM.z) < 5)) {
          s.reunited = true;
          reunion(L, s, momShard);
        }
      };
    } else {
      const baby = L.npc(makeHedgehog(0.55), MOM.x + 1.5, MOM.z - 1.5, { who: 'stupsi', talk: (g) => g.say([{ who: 'stupsi', text: 'Hihi! Ich bleib jetzt immer bei Mama. Versprochen!' }]) });
      baby.facing = Math.PI;
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      L.mushroomDeco(HOLLOW.x + Math.cos(a) * 9, HOLLOW.z + Math.sin(a) * 9, { h: 1.5 + (i % 2), r: 1, color: 0xf06aa0, collide: false });
    }
    // Stimmung: golden warm bei Opa Eiche, kalt und dämmrig unten in der Senke
    L.moodZone(OAK.x, OAK.z, { r: 11, fade: 10, atmo: { fog: 0xb4a896, hemi: 0xffe0b0, sun: 0xffd090, skyTint: 0xfff0d8, hemiIntensity: 2.0 } });
    L.moodZone(HOLLOW.x, HOLLOW.z, { r: 7, fade: 7, atmo: { fog: 0x6a7aa8, hemi: 0xa8c0ff, sun: 0xa0b8ff, skyTint: 0xc8d4ff, sunIntensity: 1.1, hemiIntensity: 1.4, fogNear: 25, fogFar: 120 } });
    // unten in der Senke hallt es
    L.soundZone(HOLLOW.x, HOLLOW.z, { r: 8, y: L.gy(HOLLOW.x, HOLLOW.z) - 0.5, h: 3.5, reverb: 0.3, lowpass: 6000 });
    L.firefly('f4', HOLLOW.x - 4, null, HOLLOW.z + 3);
    L.berryLine(-8, -8, -40, -40, 7);

    // ---------- Gegner ----------
    L.grimmpilz(24, 22, { wander: 6 });
    L.grimmpilz(-18, 30, { wander: 6 });
    L.grimmpilz(18, -22, { wander: 5 });
    L.grimmpilz(-22, -18, { wander: 5 });
    L.apple(15, 48);
    L.apple(-20, 5);
    L.apple(30, -34);
    L.apple(OAK.x + 3, OAK.z + 4, crown);

    // ---------- Beeren ----------
    L.berryLine(0, 52, 2, 32, 6);
    L.berryLine(6, 28, 26, 12, 5);
    L.berryLine(4, 0, 30, -34, 6);
    L.berryRing(OAK.x, OAK.z, 9, 6);
    L.berryLine(4, 32, -22, 14, 5);
    L.fireflyShard('gluehwuermchen', 3, 32);

    // ---------- Ausgang ----------
    L.portal(0, 68, { rot: Math.PI, to: 'hub', spawn: 'from-pilz', label: 'Wurzelhügel', color: 0xffd24a });
    L.spawnPoint('start', 0, 57, Math.PI);

    // ---------- Pauli Pilz gibt Tipps ----------
    L.npc(makePilz(), 5, 50, { who: 'pilz', facing: -2.4, talk: (g) => pauliTalk(L, g) });

    // ---------- Deko ----------
    const r = rng(77);
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, d = 58 + r() * 18;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < 7 && z > 60) continue;
      if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r + 4) continue;
      L.tree(x, z, { s: 1.1 + r() * 0.9, kind: r() < 0.5 ? 'pine' : 'round', leaf: r() < 0.5 ? 0x2f7a3a : 0x3a6a4a });
    }
    for (let i = 0; i < 40; i++) {
      const x = (r() - 0.5) * 110, z = (r() - 0.5) * 110;
      if (Math.hypot(x, z) > 58) continue;
      if (Math.hypot(x - SWAMP.x, z - SWAMP.z) < SWAMP.r + 3) continue;
      if (Math.hypot(x - OAK.x, z - OAK.z) < 12 || Math.hypot(x - CLEARING.x, z - CLEARING.z) < 12) continue;
      if (Math.abs(x) < 5 && z > 0) continue;
      if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r + 4 || (Math.abs(x) < 4 && z < -24 && z > -40)) continue;
      const k = r();
      if (k < 0.4) L.tree(x, z, { s: 0.9 + r() * 0.6, kind: r() < 0.5 ? 'pine' : 'round', leaf: 0x3a7a3a });
      else if (k < 0.7) L.mushroomDeco(x, z, { h: 1 + r() * 3, r: 0.8 + r() * 1.5, color: [0xd84a3a, 0x8a4ad8, 0xd8a02a, 0x3aa0d8][Math.floor(r() * 4)] });
      else L.bush(x, z, { color: 0x3a7a3a });
    }
    for (let i = 0; i < 25; i++) {
      const x = (r() - 0.5) * 110, z = (r() - 0.5) * 110;
      if (Math.hypot(x, z) > 60 || L.gy(x, z) < 0) continue;
      if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r + 2) continue;
      L.flowers(x, z, 5, 1.5, [0x9a6aff, 0xff8ad0, 0x6ae0ff]);
    }
  },

  onRespawn(L) {
    L.fuerst?.reset();
  },

  onEnter(L, g) {
    if (!L.flag('taunt')) {
      L.setFlag('taunt');
      g.cutscene(async () => {
        const p = g.player;
        await g.camTo([p.pos.x + 6, p.pos.y + 8, p.pos.z - 10], [OAK.x, 18, OAK.z], 0);
        await g.camTo([p.pos.x + 3, p.pos.y + 5, p.pos.z - 14], [OAK.x, 22, OAK.z], 3);
        g.audio.play('croak');
        await g.say([
          { who: 'koenig', text: 'QUAAAK! Ihr wollt meine Splitter? Im Pilzwald suchen meine Blechkäfer schon alles ab – ihr kommt zu spät, ihr Fellknäuel!' },
          { who: 'kiki', text: 'Seine Käfer sind aus Blech? Na, dann scheppert es hier gleich gewaltig!' },
          { who: 'bruno', text: 'Lass uns einfach alle Splitter vor ihnen finden. Der Pilz da vorne weiß bestimmt, wo wir suchen müssen.' },
        ]);
      });
    }
  },
};

async function oakTalk(L, g) {
  const has = g.save.hasShard('pilz:eiche');
  if (has) {
    await g.say([{ who: 'eiche', text: 'Hohoho ... ohne das Gekitzel in meiner Krone schlafe ich wieder wie ein Stein. Oder wie ein Baum. Hohoho.' }]);
    return;
  }
  await g.say([
    { who: 'eiche', text: 'Hohoho ... wer klopft denn da an meine Rinde? Ein Dachs mit einem Rennkuckuck im Rucksack, wie ungewöhnlich.' },
    { who: 'eiche', text: 'Seit heute Morgen kitzelt es fürchterlich in meiner Krone. Irgendetwas Goldenes ist dort oben gelandet.' },
    { who: 'eiche', text: 'Klettert doch über die Baumpilze an meinem Stamm nach oben und nehmt es mit. Aber tretet mir nicht auf die Äste!' },
  ]);
}

async function momTalk(L, g) {
  if (g.save.hasShard('pilz:stupsi') || L.stupsi?.reunited) {
    await g.say([{ who: 'igel', text: 'Danke nochmal, ihr beiden! Stupsi darf jetzt eine Woche lang nicht mehr allein in den Wald.' }]);
    return;
  }
  if (L.stupsi?.following) {
    await g.say([{ who: 'igel', text: 'Ist das ... Stupsi? Bringt ihn ganz nah zu mir!' }]);
    return;
  }
  await g.say([
    { who: 'igel', text: 'Oh je, oh je! Habt ihr meinen kleinen Stupsi gesehen? Er wollte unbedingt die leuchtenden Pilze im Nordwesten ansehen ...' },
    { who: 'igel', text: 'Seit der Nebel kam, ist er nicht mehr zurück! Bitte bringt ihn nach Hause. Ich habe auch etwas Glitzerndes für euch!' },
    { who: 'kiki', text: 'Keine Sorge, Frau Stachelig. Wir finden ihn!' },
  ]);
}

async function stupsiTalk(L, g, s) {
  if (s.reunited) {
    await g.say([{ who: 'stupsi', text: 'Hihi! Danke, dass ihr mich nach Hause gebracht habt!' }]);
    return;
  }
  if (s.following) {
    await g.say([{ who: 'stupsi', text: 'Wie weit ist es noch zu Mama?' }]);
    return;
  }
  await g.say([
    { who: 'stupsi', text: 'Schnief ... Hallo? Ich hab mich verlaufen. Überall ist Nebel und alles sieht gleich aus ...' },
    { who: 'bruno', text: 'Keine Angst, Kleiner. Deine Mama wartet schon auf dich. Bleib einfach dicht hinter uns!' },
    { who: 'stupsi', text: 'Au ja! Ich lauf ganz schnell hinterher!' },
  ]);
  s.following = true;
  s.talk = (gg) => stupsiTalk(L, gg, s);
  g.toast('Bring Stupsi zu seiner Mama!', 3);
}

async function reunion(L, s, shard) {
  const g = L.game;
  await g.cutscene(async () => {
    s.following = false;
    s.pos.set(MOM.x + 1.5, L.gy(MOM.x + 1.5, MOM.z - 1.5), MOM.z - 1.5);
    s.obj.position.copy(s.pos);
    await g.camTo([MOM.x + 5, L.gy(MOM.x, MOM.z) + 3, MOM.z - 6], [MOM.x, L.gy(MOM.x, MOM.z) + 1, MOM.z], 1);
    await g.say([
      { who: 'stupsi', text: 'Mamaaa!' },
      { who: 'igel', text: 'Stupsi! Mein kleiner Stachelball! Mach das nie wieder!' },
      { who: 'igel', text: 'Ihr zwei seid wahre Helden. Hier – Stupsi hat das heute Morgen gefunden. Ich glaube, das gehört euch.' },
    ]);
    shard.reveal();
    await g.wait(1);
  });
}

// Pauli Pilz verrät, wo der nächste fehlende Splitter steckt
async function pauliTalk(L, g) {
  const has = (id) => g.save.hasShard(`pilz:${id}`);
  if (!L.flag('pauli')) {
    L.setFlag('pauli');
    await g.say([
      { who: 'pilz', text: 'Oh, Besuch! Ich bin Pauli Pilz. Willkommen im Pilzwald – hier bin ich aufgewachsen, sozusagen aus dem Boden geschossen!' },
      { who: 'pilz', text: 'Seit die Blechkäfer vom Krötenkönig hier herumklappern, traut sich keiner mehr raus. Sieben Sonnensplitter sollen im Wald liegen.' },
    ]);
  }
  const hints = [
    ['eiche', 'Opa Eiche in der Mitte des Waldes jammert, dass es in seiner Krone kitzelt. Klettert über die Baumpilze an seinem Stamm nach oben!'],
    ['insel', 'Im Osten stehen Hüpfpilze. Springt drauf und lenkt in der Luft – ganz oben schwebt eine Insel mit einem Splitter.'],
    ['stupsi', 'Frau Stachelig im Süden sucht ihren kleinen Stupsi. Der wollte zu den leuchtenden Pilzen im Nordwesten.'],
    ['kaefer', 'Auf der Käferlichtung im Nordosten bewachen fünf Blechkäfer etwas Goldenes. Verschrottet sie alle!'],
    ['stumpf', 'Mitten im Giftsumpf im Westen steht ein rissiger Baumstumpf. Nehmt die Seerosen und mein Wolkenfreund Wölkchen trägt euch rüber. Dann: Stampfer!'],
    ['fuerst', 'Im Norden, hinter Opa Eiche, liegt ein Hexenring. Dort thront mein Onkel, Fürst Fliegenpilz. Seit er den Splitter als Krone trägt, ist er riesig und grantig! Springt über seine Sporenwellen und wartet, bis er aus der Puste ist.'],
    ['gluehwuermchen', 'Fünf Glühwürmchen haben sich im Wald versteckt. Wenn ihr alle findet, zeigen sie euch einen Splitter.'],
  ];
  const next = hints.find(([id]) => !has(id));
  await g.say([{ who: 'pilz', text: next ? next[1] : 'Ihr habt alle Splitter aus dem Pilzwald gefunden! Ihr seid ja schneller als ein Pilz wächst!' }]);
}

// ================= Boss: Fürst Fliegenpilz =================
// Muster: Er hüpft auf Bruno zu, holt Luft (Grummeln + Ducken) und stampft –
// eine Sporenwelle läuft über den Boden (drüberspringen!). Nach einigen
// Stampfern ist er aus der Puste und niest: Dann ist er verwundbar – auf den
// Hut springen oder gegen den Stiel rollen/picken. Ab dem 2. Treffer lässt er
// zusätzlich Sporenbälle regnen (Schatten zeigen, wo sie landen), beim letzten
// ruft er zwei Grimmpilze zu Hilfe.
const BOSS_SCALE = 1.9;
const BOSS_HOME = { x: ARENA.x, z: ARENA.z - 4 };

// Sporenwelle: ein Ring aus Sporennebel, der sich vom Boss aus ausbreitet
class SporeRing extends Entity {
  constructor(L, x, y, z, speed) {
    super(L, x, y, z);
    this.r = 1.8;
    this.speed = speed;
    this.hitDone = false;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.7, 40, 1, true).translate(0, 0.35, 0), new THREE.MeshBasicMaterial({
      color: 0xb07ae0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
    }));
    this.setObj(m);
  }
  update(dt) {
    this.r += this.speed * dt;
    this.obj.scale.set(this.r, 1, this.r);
    this.obj.material.opacity = 0.55 * Math.min(1, (ARENA.r + 1.5 - this.r) / 3);
    const g = this.game;
    // Sporenwölkchen entlang des Rings
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      g.particles.puff.spawn({ x: this.pos.x + Math.cos(a) * this.r, y: this.pos.y + 0.3, z: this.pos.z + Math.sin(a) * this.r,
        vy: 0.8, drag: 1, life: 0.6, s0: 0.8, s1: 1.4, r: 0.75, gg: 0.55, b: 0.95, a: 0.6 });
    }
    const p = this.player.pos;
    const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    if (!this.hitDone && Math.abs(d - this.r) < 0.55 && p.y < this.pos.y + 0.75) {
      this.hitDone = this.player.hurt(this.pos);
    }
    if (this.r > ARENA.r + 1.5) this.remove();
  }
  remove() {
    super.remove();
    this.obj.geometry.dispose();
    this.obj.material.dispose();
  }
}

// Sporenball: fällt vom Himmel, ein Schatten kündigt die Landestelle an
class SporeBomb extends Entity {
  constructor(L, x, z, y, fall = 1.2) {
    super(L, x, y, z);
    this.fall = fall;
    this.t = 0;
    const ball = new THREE.Group();
    part(ball, G.sphere(0.55, 10, 8), mat(0x9a5ac8), 0, 0, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(ball, G.sphere(0.14, 6, 4), mat(0xf0e0ff), Math.cos(a) * 0.45, 0.25, Math.sin(a) * 0.45);
    }
    this.ball = ball;
    this.setObj(ball);
    this.mark = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
      color: 0x5a1a6a, transparent: true, opacity: 0.35, depthWrite: false,
    }));
    this.mark.position.set(x, y + 0.06, z);
    L.root.add(this.mark);
  }
  update(dt) {
    this.t += dt;
    const k = Math.min(1, this.t / this.fall);
    this.mark.scale.setScalar(0.35 + k * 0.65);
    this.mark.material.opacity = 0.2 + k * 0.35;
    this.obj.position.set(this.pos.x, this.pos.y + 11 * (1 - k * k), this.pos.z);
    this.obj.rotation.y += dt * 4;
    if (k < 1) return;
    const g = this.game, p = this.player.pos;
    g.audio.play('spores', this.pos);
    g.particles.emit('pop', this.pos.x, this.pos.y + 0.4, this.pos.z, 10, [0.7, 0.45, 0.95]);
    if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 1.6 && p.y < this.pos.y + 1.3) this.player.hurt(this.pos);
    this.remove();
  }
  remove() {
    super.remove();
    this.level.root.remove(this.mark);
    this.mark.geometry.dispose();
    this.mark.material.dispose();
  }
}

class Fuerst extends Entity {
  constructor(L, shard) {
    super(L, BOSS_HOME.x, L.gy(BOSS_HOME.x, BOSS_HOME.z), BOSS_HOME.z);
    this.model = makeFliegenpilz();
    this.model.scale.setScalar(BOSS_SCALE);
    this.rig = this.model.userData.rig;
    this.setObj(this.model);
    this.shadow = new BlobShadow(L, 4.6);
    this.shard = shard;
    this.maxHp = 3;
    this.hp = 3;
    this.active = false;
    this.facing = 0;
    this.spawned = [];
    this.set('idle');
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
      await g.camTo([this.pos.x + 7, this.pos.y + 5, this.pos.z + 11], [this.pos.x, this.pos.y + 3, this.pos.z], 1.2);
      g.audio.playMusic('pilzboss');
      g.audio.play('grumble', this.pos);
      if (!L.flag('fuerstIntro')) {
        L.setFlag('fuerstIntro');
        await g.say([
          { who: 'fuerst', text: 'Wer trampelt da durch meinen Hexenring?! Ich bin Fürst Fliegenpilz, Herrscher über jeden Hut in diesem Wald!' },
          { who: 'fuerst', text: 'Seht ihr meine Krone? König Krötus hat mir diesen funkelnden Stein geschenkt. Seitdem bin ich GROSS! Und mächtig! Und ... hatschi! ... ein bisschen verschnupft.' },
          { who: 'kiki', text: 'Das ist ein Sonnensplitter! Der hat ihn so aufgeblasen, Bruno.' },
          { who: 'fuerst', text: 'Den gebe ich nicht her! Nehmt euch in Acht vor meinen Sporen!' },
          { who: 'kiki', text: 'Spring über die Sporenwellen! Und wenn er aus der Puste ist und niest, hüpf ihm auf den Hut – oder roll ihm gegen den Stiel!' },
        ]);
      } else {
        await g.say([{ who: 'fuerst', text: 'Ihr schon wieder?! Hatschi! Diesmal puste ich euch aus meinem Wald!' }]);
      }
    });
    this.active = true;
    this.hp = this.maxHp;
    this.slams = 0;
    this.set('walk');
    g.hud.setBoss(1, 'Fürst Fliegenpilz');
  }

  // Nach Brunos Tod: alles zurück auf Anfang
  reset() {
    if (!this.active) return;
    this.active = false;
    this.clearSpawned();
    this.hp = this.maxHp;
    this.set('idle');
    this.pos.set(BOSS_HOME.x, this.level.gy(BOSS_HOME.x, BOSS_HOME.z), BOSS_HOME.z);
    this.facing = 0;
    this.game.audio.playMusic('pilz');
    this.game.hud.setBoss(null);
    this.addTrigger();
  }

  addTrigger() {
    this.level.trigger(ARENA.x, ARENA.z, { r: ARENA.r - 2.5, onEnter: () => this.start() });
  }

  clearSpawned() {
    for (const e of this.spawned) if (e.alive) e.remove();
    this.spawned = [];
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
    const ground = L.gy(this.pos.x, this.pos.z);
    let hop = 0, squash = 1, hatTilt = 0, speed = 0;
    rig.jewel.rotation.y = this.t * 2;
    this.spawned = this.spawned.filter((e) => e.alive);

    if (this.state === 'idle') {
      // döst vor sich hin
      squash = 1 + Math.sin(this.t * 1.5) * 0.03;
      hatTilt = 0.08;
      if (Math.random() < dt * 0.6) g.particles.puff.spawn({ x: this.pos.x + 1, y: this.pos.y + 4.8, z: this.pos.z + 0.5, vx: 0.3, vy: 0.6, life: 1.5, s0: 0.4, s1: 0.9, r: 0.9, gg: 0.9, b: 1, a: 0.6 });
    } else if (this.state === 'walk') {
      this.facing = dampAngle(this.facing, Math.atan2(dx, dz), 3, dt);
      speed = d > 3 ? [0, 2.6, 3.2, 3.8][this.phase] : 0;
      hop = Math.abs(Math.sin(this.t * 7)) * 0.35;
      if (this.st > [0, 2.2, 1.8, 1.5][this.phase]) {
        this.set('windup');
        g.audio.play('grumble', this.pos);
      }
    } else if (this.state === 'windup') {
      this.facing = dampAngle(this.facing, Math.atan2(dx, dz), 6, dt);
      const dur = [0, 0.8, 0.65, 0.55][this.phase];
      squash = 1 - Math.min(1, this.st / dur) * 0.25;
      rig.armL.rotation.z = rig.armR.rotation.z = 0;
      rig.armL.rotation.x = rig.armR.rotation.x = -Math.min(1, this.st / dur) * 2.2;
      if (this.st > dur) {
        // ab Phase 2 springt er Bruno hinterher
        const reach = this.phase > 1 ? Math.min(d - 1.5, 6) : 0;
        this.jumpFrom = [this.pos.x, this.pos.z];
        this.jumpTo = [this.pos.x + (dx / d) * Math.max(0, reach), this.pos.z + (dz / d) * Math.max(0, reach)];
        this.set('jump');
        g.audio.play('boing', this.pos);
      }
    } else if (this.state === 'jump') {
      const k = Math.min(1, this.st / 0.8);
      hop = Math.sin(k * Math.PI) * 3.4;
      squash = 1.1;
      this.pos.x = this.jumpFrom[0] + (this.jumpTo[0] - this.jumpFrom[0]) * k;
      this.pos.z = this.jumpFrom[1] + (this.jumpTo[1] - this.jumpFrom[1]) * k;
      if (k >= 1) this.land();
    } else if (this.state === 'bombs') {
      // schüttelt den Hut, Sporenbälle regnen
      hatTilt = Math.sin(this.t * 22) * 0.18;
      this.bombT = (this.bombT ?? 0) - dt;
      const total = [0, 0, 4, 6][this.phase];
      if (this.bombT <= 0 && this.bombs < total) {
        this.bombT = 0.32;
        const first = this.bombs === 0;
        let tx = p.pos.x + (first ? 0 : (Math.random() - 0.5) * 5), tz = p.pos.z + (first ? 0 : (Math.random() - 0.5) * 5);
        const cd = Math.hypot(tx - ARENA.x, tz - ARENA.z), max = ARENA.r - 1;
        if (cd > max) { tx = ARENA.x + ((tx - ARENA.x) / cd) * max; tz = ARENA.z + ((tz - ARENA.z) / cd) * max; }
        this.spawn(new SporeBomb(L, tx, tz, L.gy(tx, tz)));
        g.audio.play('spores', this.pos);
        this.bombs++;
      }
      if (this.bombs >= total && this.st > total * 0.32 + 0.6) this.set('walk');
    } else if (this.state === 'tired') {
      // aus der Puste: Hut hängt, er niest – jetzt ist er verwundbar
      const dur = [0, 3.4, 3.0, 2.7][this.phase];
      squash = 0.8 + Math.sin(this.t * 5) * 0.03;
      hatTilt = 0.55;
      if (Math.random() < dt * 5) g.particles.emit('sparkle', this.pos.x + Math.cos(this.t * 4) * 1.4, this.pos.y + 3.6, this.pos.z + Math.sin(this.t * 4) * 1.4, 1, [1, 1, 0.6]);
      if (this.st > dur) {
        this.slams = 0;
        this.set('walk');
      }
    } else if (this.state === 'hurt') {
      hop = Math.sin(Math.min(1, this.st / 0.9) * Math.PI) * 2;
      squash = 1.1;
      if (this.st > 1) {
        this.slams = 0;
        this.set('walk');
      }
    } else if (this.state === 'dead') {
      const k = Math.min(1, this.st / 1.6);
      this.model.scale.setScalar(BOSS_SCALE + (0.7 - BOSS_SCALE) * k);
      this.model.rotation.y = this.facing + k * Math.PI * 6;
      if (Math.random() < dt * 20) g.particles.emit('sparkle', this.pos.x, this.pos.y + 1 + Math.random() * 3, this.pos.z, 1);
      if (this.st > 1.8) this.finish();
      this.obj.position.copy(this.pos);
      return;
    }

    if (speed) {
      this.pos.x += Math.sin(this.facing) * speed * dt;
      this.pos.z += Math.cos(this.facing) * speed * dt;
    }
    // in der Arena bleiben
    const cd = Math.hypot(this.pos.x - ARENA.x, this.pos.z - ARENA.z), max = ARENA.r - 3;
    if (cd > max) {
      this.pos.x = ARENA.x + ((this.pos.x - ARENA.x) / cd) * max;
      this.pos.z = ARENA.z + ((this.pos.z - ARENA.z) / cd) * max;
    }
    this.pos.y = L.gy(this.pos.x, this.pos.z);
    this.obj.position.set(this.pos.x, this.pos.y + hop, this.pos.z);
    this.obj.rotation.y = this.facing;
    rig.body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    rig.hat.rotation.x = damp(rig.hat.rotation.x, hatTilt, 6, dt);
    rig.feet.forEach((f, i) => { f.rotation.x = speed ? Math.sin(this.t * 14 + i * Math.PI) * 0.5 : 0; });
    if (this.state !== 'windup') {
      rig.armL.rotation.x = rig.armR.rotation.x = damp(rig.armL.rotation.x, 0, 8, dt);
      rig.armL.rotation.z = Math.sin(this.t * 6) * 0.2;
      rig.armR.rotation.z = -Math.sin(this.t * 6) * 0.2;
    }
    rig.brows.forEach((b, i) => { b.rotation.z = (i ? -1 : 1) * (this.state === 'tired' ? -0.15 : 0.35); });
    this.shadow.update(this.pos.x, this.pos.y, this.pos.z);
    this.collide(d, dx, dz, hop);
  }

  // Landung nach dem Stampfer: Sporenwelle, Beben – und irgendwann ist die Puste weg
  land() {
    const g = this.game, L = this.level;
    g.audio.play('pound', this.pos);
    g.renderer.shake = 1;
    g.particles.emit('dust', this.pos.x, this.pos.y, this.pos.z, 16);
    this.spawn(new SporeRing(L, this.pos.x, this.pos.y, this.pos.z, [0, 7, 8, 9][this.phase]));
    const p = this.player.pos;
    if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 2.6 && p.y < this.pos.y + 1.5) this.player.hurt(this.pos);
    this.slams++;
    if (this.slams >= [0, 2, 2, 3][this.phase]) {
      this.set('tired');
      g.audio.play('sneeze', this.pos);
    } else if (this.phase > 1 && this.slams === 1) {
      this.bombs = 0;
      this.bombT = 0.2;
      this.set('bombs');
    } else this.set('walk');
  }

  collide(d, dx, dz, hop) {
    const g = this.game, p = this.player;
    if (!this.active || this.state === 'hurt') {
      this.pushOut(d, dx, dz);
      return;
    }
    const tired = this.state === 'tired';
    const hatTop = this.pos.y + hop + (tired ? 3.5 : 4.4);
    const stomp = d < 2.3 && p.vel.y < -1 && p.pos.y > hatTop - 0.9 && p.pos.y < hatTop + 1.5;
    const attack = p.attackHits(this.pos, 1.2, 2.6);
    if (stomp || attack) {
      if (tired) return this.hit();
      if (!this.hintCool || this.t > this.hintCool) {
        this.hintCool = this.t + 0.6;
        g.audio.play('boing', this.pos);
        if (stomp) p.bounce(13);
        else {
          p.vel.x = (dx / d) * 9;
          p.vel.z = (dz / d) * 9;
        }
        g.toast('Sein Hut federt alles ab! Warte, bis er aus der Puste ist.', 2);
      }
      return;
    }
    // am Stiel verbrennt man sich die Pfoten (außer wenn er erschöpft ist)
    if (d < 1.2 + p.radius && p.pos.y < this.pos.y + hop + 2.8) {
      if (tired) this.pushOut(d, dx, dz);
      else p.hurt(this.pos);
    }
  }

  pushOut(d, dx, dz) {
    const p = this.player, min = 1.2 + p.radius;
    if (d < min && p.pos.y < this.pos.y + 3) {
      p.pos.x = this.pos.x + (dx / d) * min;
      p.pos.z = this.pos.z + (dz / d) * min;
    }
  }

  hit() {
    const g = this.game, L = this.level;
    this.hp--;
    g.audio.play('bosshit', this.pos);
    g.renderer.shake = 0.9;
    g.input.rumble(250, 1);
    g.particles.emit('pop', this.pos.x, this.pos.y + 3, this.pos.z, 14, [1, 0.35, 0.3]);
    this.player.bounce(11);
    g.hud.setBoss(this.hp / this.maxHp, 'Fürst Fliegenpilz');
    this.clearSpawned();
    if (this.hp <= 0) {
      g.hud.setBoss(null);
      this.active = false;
      this.set('dead');
      g.audio.stopMusic();
      g.audio.play('shatter', this.pos);
      return;
    }
    this.set('hurt');
    if (this.hp === 2) {
      g.say([{ who: 'fuerst', text: 'Au! Mein schöner Hut! Na wartet – jetzt regnet es Sporen!' }]);
    } else if (this.hp === 1) {
      g.say([{ who: 'fuerst', text: 'Grrr! Wachen! Äh ... Pilzwachen! Zu Hilfe!' }]);
      for (const s of [-1, 1]) {
        const x = ARENA.x + s * 7, z = ARENA.z + 3;
        const e = this.spawn(new Grimmpilz(L, x, z, { wander: 8, chase: 20 }));
        g.particles.emit('pop', e.pos.x, e.pos.y + 0.5, e.pos.z, 8, [0.8, 0.5, 0.9]);
      }
    }
  }

  async finish() {
    if (!this.alive) return;
    const g = this.game, L = this.level;
    L.setFlag('fuerst');
    this.remove();
    // Bruno ein Stück zur Seite, damit der kleine Fürst nicht in ihm steht
    const p = this.player.pos, dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < 3) {
      const k = d > 0.1 ? 3 / d : 0;
      this.player.spawn(this.pos.x + (k ? dx * k : 3), this.pos.y, this.pos.z + (k ? dz * k : 0), Math.atan2(-dx, -dz));
    }
    const small = makeFuerstNpc(L, this.pos.x, this.pos.z);
    g.audio.playMusic('pilz');
    await g.cutscene(async () => {
      await g.camTo([this.pos.x + 4, this.pos.y + 2.5, this.pos.z + 6], [this.pos.x, this.pos.y + 1, this.pos.z], 0.8);
      g.audio.play('sneeze', this.pos);
      await g.say([
        { who: 'fuerst', text: 'Hatschi! ... Oh. Ich bin ja wieder klein. Und mein Kopf ist so klar wie Morgentau.' },
        { who: 'fuerst', text: 'Nehmt den Stein. Größe steht mir sowieso nicht – da oben war mir immer ganz schwindelig.' },
        { who: 'kiki', text: 'Und König Krötus hat einen Untertan weniger!' },
      ]);
      small.lookAtPlayer = true;
      if (this.shard) {
        await g.camTo([ARENA.x + 6, L.gy(ARENA.x, ARENA.z) + 4, ARENA.z + 8], this.shard.pos, 0.8);
        this.shard.reveal();
        await g.wait(1);
      }
    });
  }
}

// Der geschrumpfte, jetzt freundliche Fürst
function makeFuerstNpc(L, x, z) {
  const m = makeFliegenpilz();
  m.scale.setScalar(0.7);
  return L.npc(m, x, z, {
    who: 'fuerst', facing: 0,
    talk: (g) => g.say([{ who: 'fuerst', text: 'Hatschi! Danke, dass ihr mich von dem Stein befreit habt. Grüßt mir meinen Neffen Pauli – und passt auf euch auf!' }]),
  });
}

// Arena, Hexenring und der Boss selbst
function buildArena(L) {
  const ay = L.gy(ARENA.x, ARENA.z);
  // Hexenring aus Pilzen mit einer Lücke Richtung Opa Eiche (Süden)
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.3) continue;
    const x = ARENA.x + Math.cos(a) * (ARENA.r + 1.4), z = ARENA.z + Math.sin(a) * (ARENA.r + 1.4);
    L.mushroomDeco(x, z, { h: 1.6 + (i % 3) * 0.6, r: 1.3, color: i % 2 ? 0xd8262a : 0xe8b830 });
  }
  L.sign(ARENA.x + 3.5, ARENA.z + ARENA.r + 3, 0.2, 'Hexenring', 'Zutritt verboten!');
  L.berryRing(ARENA.x, ARENA.z, ARENA.r + 4.5, 12);
  L.apple(ARENA.x - 4, ARENA.z + ARENA.r + 4);
  const won = L.flag('fuerst');
  const shard = L.shard('fuerst', ARENA.x, ay + 1.4, ARENA.z, { hidden: !won });
  if (won) {
    makeFuerstNpc(L, BOSS_HOME.x, BOSS_HOME.z);
    return;
  }
  const boss = L.spawn(new Fuerst(L, shard));
  L.fuerst = boss;
  boss.addTrigger();
  // während des Kampfes wird es düster und giftig-violett
  L.moodZone(ARENA.x, ARENA.z, { r: ARENA.r, fade: 10, cond: () => boss.active, atmo: { fog: 0x6a5a8a, hemi: 0xc8a8ff, sun: 0xd8a0ff, skyTint: 0xb8a8d8, sunIntensity: 1.2, hemiIntensity: 1.5, fogNear: 30, fogFar: 140 } });
}
