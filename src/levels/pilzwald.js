// Pilzwald: Dämmriger Zauberwald mit Riesenpilzen, Giftsumpf und Opa Eiche.
import * as THREE from 'three';
import { G, M, mat, part } from '../engine/geo.js';
import { defaultColorRule } from '../game/terrain.js';
import { makeHedgehog } from '../game/models.js';
import { rng, fbm } from '../engine/util.js';

const OAK = { x: 0, z: -14, r: 5.2 };
const SWAMP = { x: -42, z: 10, r: 16, y: -0.7 };
const ISLAND = { x: -46, z: 10 };
const CLEARING = { x: 36, z: -46 };
const HOLLOW = { x: -46, z: -44 };
const MOM = { x: 12, z: 42 };

export default {
  id: 'pilz',
  name: 'Pilzwald',
  subtitle: 'Welt 1',
  music: 'pilz',

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
    const dirt = 0x8a6a4a;
    T.path([[0, 62], [0, 40], [4, 20], [0, 4]], 3, dirt);
    T.path([[4, 30], [MOM.x, MOM.z]], 2.4, dirt);
    T.path([[4, 20], [20, 12], [32, 8]], 2.4, dirt);
    T.path([[0, 4], [20, -20], [CLEARING.x, CLEARING.z]], 2.4, dirt);
    T.path([[0, 4], [-20, -20], [HOLLOW.x, HOLLOW.z]], 2.4, dirt);
    T.path([[0, 30], [-24, 12]], 2.4, dirt);
    L.finishTerrain(defaultColorRule({ grass: 0x3f8f4a, grass2: 0x5a9a3a, rock: 0x6f6878, dirt: 0x7a5a3a, rockSlope: 0.9, seed: 9 }));
    L.world.bounds = { r: 80 };
    L.sky({ top: 0x3a3a7a, bottom: 0x9aa8d8, mountains: 0x5a5a8a, clouds: 8, sun: false, seed: 3, mountainsH: 80 });
    // Mond
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: L.game.tex.glow, color: 0xe8f0ff, fog: false, depthWrite: false }));
    moon.position.set(-220, 240, -260);
    moon.scale.setScalar(110);
    L.root.add(moon);

    // ---------- Giftsumpf ----------
    const swamp = new THREE.Mesh(new THREE.CircleGeometry(SWAMP.r + 2, 28).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({
      color: 0x6a9a2a, map: L.game.tex.water.clone(), transparent: true, opacity: 0.92, emissive: 0x1a300a,
    }));
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
    L.platform({ w: 3.4, h: 0.6, d: 1.6, color: 0x8a6440, tex: 'bark', path: (t) => ({ x: -37.5, y: SWAMP.y + 0.25, z: 10 + Math.sin(t * 0.9) * 4 }) });
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
      L.add(G.blob(4 + cr() * 2, i), M(OAK.x + Math.cos(a) * 9, crown + 2 + cr() * 4, OAK.z + Math.sin(a) * 9), new THREE.Color(0x3f8a3a).multiplyScalar(0.8 + cr() * 0.3), 'leaves', 0.3, { shade: 0.1 });
    }
    L.add(G.blob(6, 3), M(OAK.x, crown + 9, OAK.z, 0, [1.4, 0.8, 1.4]), 0x4a9a3a, 'leaves', 0.3, { shade: 0.1 });
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
      if (this.distPlayer() < this.talkRadius) this.game.offerPrompt(this, 'Reden');
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
          if (kaeferShard && beetlesLeft > 0) L.game.toast(`Nebelkäfer: noch ${beetlesLeft}`);
          if (beetlesLeft === 0 && kaeferShard) {
            L.game.cutscene(async () => {
              const g = L.game;
              await g.camTo([CLEARING.x + 8, L.gy(CLEARING.x, CLEARING.z) + 6, CLEARING.z + 10], kaeferShard.pos, 1);
              kaeferShard.reveal();
              await g.wait(1);
              await g.say([{ who: 'kiki', text: 'Alle Nebelkäfer erledigt! Und seht mal, was sie bewacht haben!' }]);
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

    // ---------- Deko ----------
    const r = rng(77);
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, d = 58 + r() * 18;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < 7 && z > 60) continue;
      L.tree(x, z, { s: 1.1 + r() * 0.9, kind: r() < 0.5 ? 'pine' : 'round', leaf: r() < 0.5 ? 0x2f7a3a : 0x3a6a4a });
    }
    for (let i = 0; i < 40; i++) {
      const x = (r() - 0.5) * 110, z = (r() - 0.5) * 110;
      if (Math.hypot(x, z) > 58) continue;
      if (Math.hypot(x - SWAMP.x, z - SWAMP.z) < SWAMP.r + 3) continue;
      if (Math.hypot(x - OAK.x, z - OAK.z) < 12 || Math.hypot(x - CLEARING.x, z - CLEARING.z) < 12) continue;
      if (Math.abs(x) < 5 && z > 0) continue;
      const k = r();
      if (k < 0.4) L.tree(x, z, { s: 0.9 + r() * 0.6, kind: r() < 0.5 ? 'pine' : 'round', leaf: 0x3a7a3a });
      else if (k < 0.7) L.mushroomDeco(x, z, { h: 1 + r() * 3, r: 0.8 + r() * 1.5, color: [0xd84a3a, 0x8a4ad8, 0xd8a02a, 0x3aa0d8][Math.floor(r() * 4)] });
      else L.bush(x, z, { color: 0x3a7a3a });
    }
    for (let i = 0; i < 25; i++) {
      const x = (r() - 0.5) * 110, z = (r() - 0.5) * 110;
      if (Math.hypot(x, z) > 60 || L.gy(x, z) < 0) continue;
      L.flowers(x, z, 5, 1.5, [0x9a6aff, 0xff8ad0, 0x6ae0ff]);
    }
  },

  onEnter(L, g) {
    if (!L.flag('taunt')) {
      L.setFlag('taunt');
      g.cutscene(async () => {
        const p = g.player;
        await g.camTo([p.pos.x + 6, p.pos.y + 8, p.pos.z - 10], [OAK.x, 18, OAK.z], 0);
        await g.camTo([p.pos.x + 3, p.pos.y + 5, p.pos.z - 14], [OAK.x, 22, OAK.z], 3);
        g.audio.play('sneeze');
        await g.say([
          { who: 'nebelbart', text: 'Hatschi! Ihr wollt meine Splitter zurück? Im Pilzwald verirrt ihr euch bestimmt, ihr pelzigen Trottel!' },
          { who: 'kiki', text: 'Pff! Wir verirren uns nie! ... Bruno, wo ist eigentlich Norden?' },
          { who: 'bruno', text: 'Äh ... da, wo der riesige Baum steht? Lass uns einfach alle Splitter einsammeln.' },
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
    { who: 'eiche', text: 'Hohoho ... wer klopft denn da an meine Rinde? Ein Dachs und eine Elster, wie ungewöhnlich.' },
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
