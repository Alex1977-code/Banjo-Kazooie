// Wurzelhügel: Brunos Zuhause, Tutorial und Knotenpunkt zu allen Welten.
import * as THREE from 'three';
import { G, M, mat, part } from '../engine/geo.js';
import { defaultColorRule } from '../game/terrain.js';
import { makeTilda, makeNebelbart, makeShard } from '../game/models.js';
import { fbm, lerp, rng } from '../engine/util.js';

const SUN_HILL = { x: 0, z: -46, r: 11, h: 10 };
const PILLAR = { x: -28, z: -20 };
const SLAB = { x: 24, z: -24 };
const TOTAL_SHARDS = 14;

function gloomColors(L) {
  const g = L.game;
  const intro = L.flag('intro');
  const p = intro && !L.flag('restored') ? Math.min(1, g.save.totalShards() / 10) : 1;
  const gloom = 1 - p;
  const mix = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), gloom * 0.85).getHex();
  return {
    top: mix(0x3b7fd9, 0x5d6272),
    bottom: mix(0xbfe3ff, 0xa9adb6),
    fog: mix(0xcde9ff, 0xa4a8b0),
    sun: gloom,
  };
}

export default {
  id: 'hub',
  name: 'Wurzelhügel',
  subtitle: 'Brunos Zuhause',
  music: 'hub',
  titleCam: { x: 0, y: 6, z: -8, r: 58, h: 22 },

  atmosphere(L) {
    const c = gloomColors(L);
    return {
      sky: c.bottom, fog: c.fog, fogNear: 70, fogFar: 240,
      sunIntensity: 2.3 - c.sun * 1.1, hemiIntensity: 1.7 - c.sun * 0.4,
    };
  },

  build(L) {
    const T = L.terrain({ size: 220, cell: 2, base: 0 });
    T.noise(1.3, 0.035, 7);
    // Umrandende Klippen
    T.forEach((x, z, k) => {
      const d = Math.hypot(x, z);
      const edge = 76 + fbm(x * 0.05, z * 0.05, 3, 2) * 8;
      if (d > edge) T.h[k] += Math.min(28, (d - edge) * 1.8) + fbm(x * 0.1, z * 0.1, 4, 2) * 4;
    });
    // Sonnenhügel mit Rampe
    T.plateau(SUN_HILL.x, SUN_HILL.z, SUN_HILL.r, SUN_HILL.h, 2.5);
    T.ramp(22, -28, 0.6, 8.5, -44, SUN_HILL.h, 5.5, 2.5);
    // Brunos Hügel
    T.plateau(0, 32, 8, 4.5, 6);
    // Teich + Wasserfall-Klippe
    T.pit(-44, 8, 12, -4.2, 6);
    T.plateauRect(-66, 8, 14, 40, 10, 3);
    // flache Plätze für die Tore
    T.plateau(48, -8, 6, 0.6, 4, 'set');
    T.plateau(42, 38, 6, 0.4, 4, 'set');
    T.plateau(0, -73, 7, 1, 4, 'set');
    T.plateau(0, 12, 7, 0.3, 5, 'set');

    // Wege
    const dirt = 0xb0844e;
    T.path([[0, 20], [0, 4], [6, -10], [18, -22], [22, -28]], 3.2, dirt);
    T.path([[0, 4], [-18, 10], [-30, 14]], 2.6, dirt);
    T.path([[4, 2], [24, -2], [44, -8]], 2.8, dirt);
    T.path([[6, 14], [22, 26], [38, 37]], 2.6, dirt);
    T.path([[4, -8], [-10, -40], [-4, -62], [0, -70]], 2.6, dirt);
    T.paint(0, 12, 5, 0xa87a48, 3);
    T.paint(SUN_HILL.x, SUN_HILL.z, 5, 0xc9b98a, 3);
    L.finishTerrain(defaultColorRule({ grass: 0x5db53a, grass2: 0x8fcf45, rockSlope: 0.95, sand: 0xd8c07a, sandLevel: -0.8 }));
    L.world.bounds = { r: 86 };

    const col = gloomColors(L);
    L.sky({ top: col.top, bottom: col.bottom, mountains: 0x8aa6bf, seed: 11 });
    L.water({ cx: -44, cz: 8, r: 22, y: -0.8, color: 0x4aa8e8 });

    // ---------- Brunos Höhle im Hügel ----------
    const fy = L.gy(0, 23);
    L.box({ x: 0, z: 23.4, y: fy - 1, w: 8, h: 5.4, d: 1.6, color: 0xa39a8c, tex: 'stone', uv: 0.35 });
    L.add(G.cyl(1.9, 1.9, 0.35, 16).rotateX(Math.PI / 2), M(0, fy + 1.7, 22.5), 0x8a5a2e, 'wood', 0.6);
    L.add(G.torus(1.95, 0.22, 6, 16), M(0, fy + 1.7, 22.5), 0x6b6258, 'stone');
    L.add(G.sphere(0.18, 6, 4), M(0.9, fy + 1.7, 22.25), 0xffd24a, 'plain');
    for (const s of [-1, 1]) {
      L.add(G.cyl(0.6, 0.6, 0.2, 10).rotateX(Math.PI / 2), M(s * 3, fy + 2.8, 22.55), 0xffe08a, 'plain');
      L.add(G.torus(0.62, 0.12, 4, 10), M(s * 3, fy + 2.8, 22.5), 0x7a5a3a, 'wood');
    }
    L.add(G.box(2.4, 0.08, 1.2), M(0, fy - 0.02, 21.3), 0xc0392b, 'plain');
    L.cyl({ x: 3, z: 31, r: 0.6, h: 2.2, color: 0x8a4a3a, tex: 'brick' });
    L.animated.push((dt, t) => {
      if (Math.random() < dt * 3) L.game.particles.puff.spawn({ x: 3, y: L.gy(3, 31) + 2.4, z: 31, vx: 0.4, vy: 1.6, vz: 0.2, life: 2.5, s0: 0.8, s1: 2.5, r: 0.85, gg: 0.85, b: 0.9, a: 0.6 });
    });
    // Garten
    L.fence([[-7, 21], [-7, 15], [-3, 15]]);
    L.fence([[3, 15], [7, 15], [7, 21]]);
    L.flowers(-5, 18, 12, 1.8);
    L.flowers(5, 18, 12, 1.8);
    // Briefkasten
    L.add(G.cyl(0.08, 0.08, 1.2, 5), M(-3.6, L.gy(-3.6, 13), 13), 0x7a5a3a, 'wood');
    L.add(G.box(0.5, 0.45, 0.8), M(-3.6, L.gy(-3.6, 13) + 1.1, 13), 0x2f6fd0, 'plain');

    // ---------- Sonnenhügel ----------
    const hy = SUN_HILL.h;
    L.cyl({ x: SUN_HILL.x, z: SUN_HILL.z, y: hy - 0.2, r: 1.8, rTop: 1.5, h: 1.7, color: 0xc8c0b0, tex: 'stone' });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      L.box({ x: SUN_HILL.x + Math.cos(a) * 8, z: SUN_HILL.z + Math.sin(a) * 8, y: hy - 0.3, w: 1.1, h: 3.2, d: 1.1, rot: a, color: 0xb8b0a0, tex: 'rock' });
    }
    const stoneGroup = new THREE.Group();
    stoneGroup.position.set(SUN_HILL.x, hy + 3.2, SUN_HILL.z);
    L.root.add(stoneGroup);
    L.sunstone = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 1), mat(0xffd84a, { emissive: 0xcc8a00, flat: true }));
    L.sunstone.scale.y = 1.4;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: L.game.tex.glow, color: 0xffe08a, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(9);
    L.sunstone.add(halo);
    stoneGroup.add(L.sunstone);
    L.sunstone.visible = !L.flag('intro') || !!L.flag('restored');
    // gesammelte Splitter kreisen um den Sockel
    const orbit = new THREE.Group();
    stoneGroup.add(orbit);
    if (L.flag('intro') && !L.flag('restored')) {
      const n = L.game.save.totalShards();
      for (let i = 0; i < n; i++) {
        const s = makeShard();
        s.scale.setScalar(0.45);
        const a = (i / Math.max(1, n)) * Math.PI * 2;
        s.position.set(Math.cos(a) * 2.2, Math.sin(i * 1.7) * 0.3, Math.sin(a) * 2.2);
        orbit.add(s);
      }
    }
    L.animated.push((dt, t) => {
      orbit.rotation.y = t * 0.6;
      L.sunstone.rotation.y = t * 0.5;
      stoneGroup.position.y = hy + 3.2 + Math.sin(t * 1.5) * 0.15;
    });
    L.sign(18, -20, -0.6, 'Sonnenhügel', '');

    // ---------- Felsturm (Hochsprung-Aufgabe) ----------
    const py = L.gy(PILLAR.x, PILLAR.z);
    L.add(G.cyl(3.0, 3.6, 3.2, 8), M(PILLAR.x, py - 0.2, PILLAR.z), 0x9b9386, 'rock', 0.4, { flat: true, shade: 0.1 });
    L.add(G.cyl(1.9, 2.3, 5.4, 7), M(PILLAR.x, py + 2.8, PILLAR.z, 0.4), 0x8f887c, 'rock', 0.4, { flat: true, shade: 0.1 });
    L.world.addCyl({ x: PILLAR.x, z: PILLAR.z, y: py - 1, r: 3.4, h: 4 });
    L.world.addCyl({ x: PILLAR.x, z: PILLAR.z, y: py + 2.8, r: 2.1, h: 5.4 });
    L.rock(PILLAR.x + 4.5, PILLAR.z + 2, { s: 1.4 });
    L.shard('felsturm', PILLAR.x, py + 8.2 + 1.3, PILLAR.z);
    L.berryRing(PILLAR.x, PILLAR.z, 2.75, 6, py + 3 + 0.9);

    // ---------- Steinplatte (Stampfer-Aufgabe) ----------
    const sy = L.gy(SLAB.x, SLAB.z);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      L.box({ x: SLAB.x + Math.cos(a) * 4.5, z: SLAB.z + Math.sin(a) * 4.5, y: sy - 0.3, w: 1, h: 1.4 + (i % 2) * 1.2, d: 1, rot: a, color: 0xa8a090, tex: 'brick' });
    }
    const slabShard = L.shard('platte', SLAB.x, sy + 1.3, SLAB.z, { hidden: true });
    if (slabShard) {
      L.breakable(SLAB.x, SLAB.z, { y: sy - 0.1, w: 3.2, h: 0.7, d: 3.2, onBreak: () => slabShard.reveal() });
      L.animated.push((dt) => {
        if (slabShard.hidden && Math.random() < dt * 1.5) L.game.particles.emit('sparkle', SLAB.x + (Math.random() - 0.5) * 2, sy + 1, SLAB.z + (Math.random() - 0.5) * 2, 1);
      });
    }

    // ---------- Lernsteine ----------
    L.lernstein(-29, 24, {
      move: 'highjump', title: 'Hochsprung', facing: 0.8,
      lines: [{ who: 'tilda', text: 'Hochsprung! Halte Z gedrückt, damit Bruno in die Hocke geht, und drück dann A. So kommst du viel höher hinaus als mit einem normalen Sprung – perfekt für den Felsturm!' }],
    });
    L.lernstein(15, -16, {
      move: 'pound', title: 'Stampfer', facing: -0.6,
      lines: [{ who: 'tilda', text: 'Stampfer! Drück in der Luft Z, und Bruno saust mit voller Wucht nach unten. Damit zerbrichst du rissige Steinplatten – und Nebelkäfer mögen das auch nicht besonders.' }],
    });

    // ---------- Oma Tilda ----------
    const tilda = L.npc(makeTilda(), 6, 11, { who: 'tilda', facing: -2.2, talk: (g) => tildaTalk(L, g) });
    L.tilda = tilda;

    // ---------- Wasserfall ----------
    const wf = new THREE.Mesh(new THREE.PlaneGeometry(5, 11), new THREE.MeshLambertMaterial({
      map: L.game.tex.water.clone(), color: 0xbfe8ff, transparent: true, opacity: 0.85, depthWrite: false,
    }));
    wf.material.map.needsUpdate = true;
    wf.material.map.repeat.set(1, 2);
    wf.position.set(-58.6, 4.2, 8);
    wf.rotation.y = Math.PI / 2;
    L.root.add(wf);
    L.animated.push((dt, t) => {
      wf.material.map.offset.y = t * 1.2;
      if (Math.random() < dt * 8) L.game.particles.emit('splash', -57.5, -0.6, 8 + (Math.random() - 0.5) * 4, 1);
    });

    // ---------- Tore ----------
    L.portal(48, -8, { rot: -Math.PI / 2, to: 'pilz', spawn: 'start', need: 1, label: 'Pilzwald', color: 0x8adf5a });
    L.portal(42, 38, { rot: -Math.PI / 2 - 0.4, to: 'beach', spawn: 'start', need: 4, label: 'Muschelbucht', color: 0x5ad0ff });
    L.portal(0, -73, { rot: 0, to: 'turm', spawn: 'start', need: 10, label: 'Nebelturm', color: 0xa06aff });
    L.spawnPoint('start', 0, 12, Math.PI);
    L.spawnPoint('from-pilz', 37, -8, -Math.PI / 2);
    L.spawnPoint('from-beach', 32, 34, -Math.PI / 2 - 0.4);
    L.spawnPoint('from-turm', 0, -62, 0);
    L.sign(38, -2, -Math.PI / 2 - 0.3, 'Pilzwald', '→');
    L.sign(30, 30, -Math.PI / 2 - 0.9, 'Muschelbucht', '→');
    L.sign(-4, -62, 0.1, 'Nebelturm', 'Gefahr!');

    // Der Nebelturm am Horizont
    const tower = new THREE.Group();
    part(tower, G.cyl(9, 12, 80, 10), mat(0x4a4458, { map: L.game.tex.brick }), 0, -10, 0);
    part(tower, G.cone(13, 22, 10), mat(0x3a2a5a), 0, 70, 0);
    part(tower, G.cyl(13.5, 13.5, 3, 10), mat(0x3a3448), 0, 68, 0);
    for (let i = 0; i < 6; i++) part(tower, G.box(2, 3, 0.5), mat(0xffe27a, { emissive: 0x886600 }), Math.cos(i) * 9.8, 20 + i * 8, Math.sin(i) * 9.8, 0, -i + Math.PI / 2, 0);
    tower.position.set(0, 0, -150);
    L.root.add(tower);

    // ---------- Gegner ----------
    L.beetle(28, 12, { wander: 6 });
    L.beetle(-12, -30, { wander: 6 });
    L.beetle(-20, 34, { wander: 5 });

    // ---------- Beeren ----------
    L.berryLine(0, 8, 2, -18, 7);
    L.berryLine(20, -27, 9.5, -43, 6);
    L.berryRing(SUN_HILL.x, SUN_HILL.z, 5.5, 6);
    L.berryRing(-44, 8, 15, 8);
    L.berryLine(9, 2, 38, -6, 6);
    L.berryLine(10, 18, 34, 33, 5);
    L.berryLine(-6, -36, -2, -60, 5);
    L.apple(10, 26);
    L.apple(-36, -8);
    L.apple(4, -64);

    // ---------- Deko ----------
    const r = rng(42);
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, d = 62 + r() * 16;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x - 42) < 8 && Math.abs(z - 38) < 8) continue;
      if (Math.abs(x) < 8 && z < -60) continue;
      L.tree(x, z, { s: 1 + r() * 0.8, kind: r() < 0.35 ? 'pine' : 'round', leaf: r() < 0.5 ? 0x3f9b2f : 0x57a83a });
    }
    const groves = [[-18, -4], [30, 8], [-22, 40], [20, 50], [-40, -30], [32, -40], [-50, 30], [50, 16]];
    for (const [gx, gz] of groves) {
      for (let i = 0; i < 3; i++) L.tree(gx + (r() - 0.5) * 10, gz + (r() - 0.5) * 10, { s: 0.9 + r() * 0.5 });
      L.bush(gx + 4, gz - 3);
      L.flowers(gx, gz + 5, 10, 3);
    }
    for (let i = 0; i < 30; i++) {
      const x = (r() - 0.5) * 120, z = (r() - 0.5) * 120;
      if (Math.hypot(x, z) > 70) continue;
      if (L.gy(x, z) < 0) continue;
      r() < 0.5 ? L.grass(x, z, 5, 2) : L.flowers(x, z, 6, 2);
    }
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, d = 30 + r() * 40;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (L.gy(x, z) < 0 || Math.hypot(x - SUN_HILL.x, z - SUN_HILL.z) < 16) continue;
      L.rock(x, z, { s: 0.6 + r() * 0.9 });
    }
    L.rock(-50, -4, { s: 2 });
    L.rock(-52, 20, { s: 2.3 });

    // Nebelbart (nur fürs Intro)
    L.nebelbart = makeNebelbart();
    L.nebelbart.visible = false;
    L.root.add(L.nebelbart);
  },

  onEnter(L, g) {
    if (!L.flag('intro')) intro(L, g);
    else if (L.flag('restored') && !L.flag('ending')) ending(L, g);
  },

  async onShard(L, g) {
    const n = g.save.totalShards();
    if (n === 1 && !L.flag('firstShard')) {
      L.setFlag('firstShard');
      await g.say([{ who: 'kiki', text: 'Juhu, unser erster Sonnensplitter! Damit sollte sich das Pilztor im Osten öffnen lassen!' }]);
    }
  },
};

async function tildaTalk(L, g) {
  const s = g.save;
  const n = s.totalShards();
  if (!L.flag('tutorial')) {
    await g.say([
      { who: 'tilda', text: 'Na, da seid ihr ja. Hört gut zu, ich sage das nicht zweimal ... höchstens dreimal.' },
      { who: 'tilda', text: 'Mit A springst du. Drückst du in der Luft nochmal A und hältst ihn fest, flattert Kiki mit den Flügeln – der Flattersprung!' },
      { who: 'tilda', text: 'Mit B rollt Bruno los. In der Luft pickt Kiki mit ihrem Schnabel. Damit zeigt ihr den Nebelkäfern, wo es langgeht!' },
      { who: 'tilda', text: 'Überall wachsen leckere Waldbeeren – sammelt sie! Und wenn euch die Puste ausgeht, beißt in einen roten Apfel.' },
      { who: 'tilda', text: 'Die leuchtenden Lernsteine hat mein Urgroßvater aufgestellt. Sie bringen euch neue Tricks bei.' },
      { who: 'tilda', text: 'Ein Sonnensplitter glitzert oben auf dem Felsturm, westlich vom Sonnenhügel. Dafür braucht ihr den Hochsprung – der Lernstein am Teich zeigt ihn euch.' },
      { who: 'tilda', text: 'Mit einem Splitter öffnet sich das Pilztor im Osten. Na los, ab mit euch!' },
      { who: 'kiki', text: 'Jaja, Oma, wir haben es verstanden!' },
    ]);
    L.setFlag('tutorial');
    return;
  }
  if (L.flag('restored')) {
    await g.say([{ who: 'tilda', text: 'Seht nur, wie die Sonne wieder scheint! Ihr zwei seid die Helden des Wurzeltals. Und jetzt ab, es gibt bestimmt noch Beeren zu finden!' }]);
    return;
  }
  let hint;
  if (!s.hasShard('hub:felsturm')) hint = 'Der Splitter auf dem Felsturm wartet! Lern am Teich den Hochsprung: Z halten, dann A.';
  else if (!s.hasShard('hub:platte')) hint = 'Östlich vom Sonnenhügel liegt eine rissige Steinplatte. Mit dem Stampfer vom Lernstein daneben bekommst du sie kaputt!';
  else if (n < 4) hint = `Im Pilzwald hinter dem grünen Tor gibt es noch Splitter. Für die Muschelbucht braucht ihr 4, ihr habt ${n}.`;
  else if (n < 10) hint = `Die Muschelbucht ist offen! Für den Nebelturm braucht ihr 10 Splitter. Ihr habt schon ${n}.`;
  else hint = 'Ihr habt genug Splitter für den Nebelturm! Zeigt diesem Nebelbart, was eine Harke ist. Das Tor liegt im Norden.';
  await g.say([{ who: 'tilda', text: hint }]);
}

async function intro(L, g) {
  const p = g.player;
  const nb = L.nebelbart;
  const hx = SUN_HILL.x, hz = SUN_HILL.z, hy = SUN_HILL.h;
  let floating = true;
  L.animated.push((dt, t) => {
    if (!nb.visible || !floating) return;
    nb.userData.rig.cloud.rotation.y = t * 0.8;
    nb.userData.rig.orb.material.emissiveIntensity = 1 + Math.sin(t * 6) * 0.5;
  });
  await g.cutscene(async () => {
    g.audio.playMusic('hub');
    await g.camTo([34, 26, 44], [0, 6, -20], 0);
    await g.camTo([16, 17, -22], [hx, hy + 3, hz], 4.5);
    g.audio.playMusic('intro');
    nb.visible = true;
    nb.position.set(hx, hy + 14, hz - 2);
    nb.rotation.y = 0.3;
    g.particles.emit('fog', hx, hy + 14, hz - 2, 30);
    g.audio.play('sneeze');
    await g.tween(1.8, (k) => { nb.position.y = lerp(hy + 14, hy + 6.5, k * (2 - k)); });
    await g.camTo([hx + 7, hy + 7, hz + 10], [hx, hy + 7.5, hz - 1], 1.2);
    await g.say([
      { who: 'nebelbart', text: 'HATSCHI! Pfui Deibel, dieses grässliche Sonnenlicht! Überall Blümchen, Vogelgezwitscher und gute Laune ...' },
      { who: 'nebelbart', text: 'Damit ist jetzt Schluss! Ich, der große Nebelbart, verwandle dieses Tal in eine herrlich graue Suppe!' },
      { who: 'nebelbart', text: 'Und dieser alberne Sonnenstein ist mir schon lange ein Dorn im Auge. Weg damit!' },
    ]);
    g.audio.play('zap');
    const rig = nb.userData.rig;
    rig.armR.rotation.x = -1.2;
    g.renderer.shake = 1;
    for (let i = 0; i < 6; i++) g.particles.emit('sparkle', lerp(hx, hx, i / 6), hy + 6 - i * 0.5, hz, 6, [0.8, 0.6, 1]);
    await g.wait(0.7);
    g.audio.play('shatter');
    L.sunstone.visible = false;
    g.renderer.shake = 1.5;
    g.particles.emit('sparkle', hx, hy + 3.2, hz, 80);
    // Splitter fliegen in alle Richtungen davon
    const flyers = [];
    for (let i = 0; i < TOTAL_SHARDS; i++) {
      const s = makeShard();
      s.scale.setScalar(0.5);
      s.position.set(hx, hy + 3.2, hz);
      L.root.add(s);
      const a = (i / TOTAL_SHARDS) * Math.PI * 2;
      flyers.push({ s, vx: Math.cos(a) * 30, vz: Math.sin(a) * 30, vy: 14 + (i % 3) * 5 });
    }
    rig.armR.rotation.x = 0;
    g.tween(2.5, (k) => {
      for (const f of flyers) {
        f.s.position.set(hx + f.vx * k * 3, hy + 3.2 + f.vy * k * 3 - 20 * k * k, hz + f.vz * k * 3);
        f.s.rotation.y = k * 20;
        if (k >= 1) L.root.remove(f.s);
      }
    });
    await g.wait(1.2);
    // Das Tal wird grau
    L.setFlag('intro');
    const c = gloomColors(L);
    g.renderer.setAtmosphere(L.def.atmosphere(L));
    L.root.remove(L.skyMesh);
    L.root.remove(L.clouds);
    L.root.remove(L.mountains);
    if (L.sunSprite) L.root.remove(L.sunSprite);
    L.sky({ top: c.top, bottom: c.bottom, mountains: 0x8a94a0, seed: 11, sun: false });
    await g.say([{ who: 'nebelbart', text: 'Hahaha! Die Splitter verstreue ich in alle Winde! Ohne Sonnenstein wird das Tal grau und trüb – genau wie ich es mag! Hatschi!' }]);
    g.audio.play('sneeze');
    await g.tween(2, (k) => {
      nb.position.set(hx, hy + 6.5 + k * 30, hz - k * 90);
      nb.scale.setScalar(1 - k * 0.6);
    });
    nb.visible = false;
    floating = false;

    // Bruno & Kiki vor dem Haus
    p.spawn(0, L.gy(0, 16), 16, 0);
    const f = p.facing;
    await g.camTo([p.pos.x + Math.sin(f) * 5 + 1.5, p.pos.y + 2.2, p.pos.z + Math.cos(f) * 5], [p.pos.x, p.pos.y + 1.3, p.pos.z], 0);
    g.audio.playMusic('hub');
    await g.say([
      { who: 'kiki', text: 'Bruno! BRUNO! Wach auf, du Schlafmütze!' },
      { who: 'bruno', text: 'Hmpf ... Was ist denn, Kiki? Die Sonne ist ja noch nicht mal ... Moment. Warum ist alles so grau?' },
      { who: 'kiki', text: 'Na, weil dieser miese Nebelbart gerade den Sonnenstein zerschmettert hat! Die Splitter sind überall verstreut!' },
      { who: 'bruno', text: 'Oh nein! Ohne den Sonnenstein wird es im Wurzeltal nie wieder warm und bunt!' },
      { who: 'kiki', text: 'Genau! Also los, Rucksack auf und ich hüpf rein! Wir holen uns die Splitter zurück und zupfen dem alten Nebelsack den Bart!' },
    ]);
    await g.camTo([8, p.pos.y + 3, 22], [5, p.pos.y + 1.5, 12], 1);
    await g.say([{ who: 'tilda', text: 'Nicht so hastig, ihr zwei Wirbelwinde! Kommt erst mal zu mir. Ich bringe euch bei, was ihr wissen müsst.' }]);
    p.facing = Math.atan2(6 - p.pos.x, 11 - p.pos.z);
  });
  g.toast('Sprich mit Oma Tilda (B)', 4);
}

async function ending(L, g) {
  L.setFlag('ending');
  const hx = SUN_HILL.x, hz = SUN_HILL.z, hy = SUN_HILL.h;
  const p = g.player;
  await g.cutscene(async () => {
    g.audio.playMusic('victory');
    await g.camTo([hx + 16, hy + 8, hz + 18], [hx, hy + 3, hz], 0);
    await g.camTo([hx + 8, hy + 5, hz + 10], [hx, hy + 3.5, hz], 3);
    g.particles.emit('sparkle', hx, hy + 3.2, hz, 80);
    g.audio.play('shard');
    await g.wait(1);
    p.spawn(hx + 2, hy, hz + 4, Math.PI + 0.4);
    L.tilda.pos.set(hx - 2.5, hy, hz + 4);
    await g.camTo([hx + 1, hy + 2.6, hz + 10], [hx, hy + 1.5, hz + 3], 1.2);
    await g.say([
      { who: 'tilda', text: 'Ihr habt es wirklich geschafft! Ohne Nebelbarts Zauber hat sich der Sonnenstein wieder zusammengefügt!' },
      { who: 'kiki', text: 'Na klar! Mit meinem Köpfchen und Brunos ... äh ... Bauch.' },
      { who: 'bruno', text: 'Hey! ... Ach, egal. Hauptsache, im Wurzeltal ist es wieder warm und bunt.' },
      { who: 'tilda', text: 'Und das Beste: Heute Abend gibt es Beerenkuchen für alle! Aber vorher ... sammelt ihr bestimmt noch die restlichen Splitter, oder?' },
      { who: 'kiki', text: 'Kuchen?! Bruno, schneller!' },
    ]);
    p.setState('dance');
    await g.wait(1.5);
    p.setState('idle');
  });
  const s = g.save;
  const t = Math.round(s.data.playTime / 60);
  g.menus.openCredits({ shards: `${s.totalShards()} / 14`, berries: s.totalBerries(), time: `${Math.floor(t / 60)} h ${t % 60} min` });
}
