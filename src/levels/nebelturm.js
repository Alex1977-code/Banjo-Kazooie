// Krötenturm: Aufstieg über die Außentreppe und Endkampf gegen König Krötus.
import * as THREE from 'three';
import { G, M, mat, part } from '../engine/geo.js';
import { makeToadKing, makeCoin, makeCloud } from '../game/models.js';
import { Entity, BlobShadow, Beetle } from '../game/entities.js';
import { damp, dampAngle } from '../engine/util.js';

const R = 17;
const STAIR_R = 19.6;
const STEPS = 31;
const RISE = 0.45;
const BASE = -STEPS * RISE;
const A0 = Math.PI / 2;
const DA = 0.098;

export default {
  id: 'turm',
  name: 'Krötenturm',
  subtitle: 'Finale',
  music: 'boss',
  reverb: 'turm', // lang und steinern
  ambience: { id: 'turm' }, // Wind, Tropfen, fernes Grollen
  killY: BASE - 22,

  atmosphere() {
    return {
      sky: 0x6a5a8a, fog: 0x5a4a78, fogNear: 50, fogFar: 190,
      hemi: 0xc8b8ff, ground: 0x2a1a3a, sun: 0xd8c8ff, sunIntensity: 1.6, hemiIntensity: 1.6,
    };
  },

  build(L) {
    L.sky({ top: 0x1a1030, bottom: 0x6a5a8a, mountains: 0x3a2a5a, clouds: 20, sun: false, seed: 21, mountainsH: 40 });
    L.clouds.traverse((o) => { if (o.material) o.material = new THREE.MeshBasicMaterial({ color: 0x8a7aa8, fog: false, transparent: true, opacity: 0.9 }); });
    // Nebelmeer unten
    const sea = new THREE.Mesh(new THREE.CircleGeometry(600, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7a6a9a, map: L.game.tex.puff, transparent: true, opacity: 0.85 }));
    sea.material.map = L.game.tex.water.clone();
    sea.material.map.needsUpdate = true;
    sea.material.map.repeat.set(40, 40);
    sea.position.y = BASE - 16;
    L.root.add(sea);
    L.animated.push((dt, t) => {
      sea.material.map.offset.set(t * 0.01, t * 0.004);
      if (Math.random() < dt * 5) {
        const a = Math.random() * 6.28, d = 25 + Math.random() * 40;
        L.game.particles.emit('fog', Math.cos(a) * d, BASE - 12, Math.sin(a) * d, 1);
      }
    });

    // Turm
    L.add(G.cyl(R, R + 1.5, 70, 20), M(0, -70, 0), 0x6a6478, 'brick', 0.25);
    L.world.addCyl({ x: 0, z: 0, y: -70, r: R, h: 70 });
    L.add(G.cyl(R + 0.3, R + 0.3, 0.6, 24), M(0, -0.6, 0), 0x8a8498, 'stone', 0.3);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      L.add(G.box(1.6, 2.6, 0.4), M(Math.cos(a) * (R + 0.9), -10 - (i % 3) * 14, Math.sin(a) * (R + 0.9), Math.PI / 2 - a), 0xffe27a, 'plain');
    }
    // Zinnen mit Lücke, wo die Treppe ankommt
    const topA = A0 + (STEPS - 1) * DA;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const diff = Math.atan2(Math.sin(a - topA), Math.cos(a - topA));
      if (Math.abs(diff) < 0.22) continue;
      L.box({ x: Math.cos(a) * (R - 0.4), z: Math.sin(a) * (R - 0.4), y: 0, w: 1.1, h: 1.4, d: 2.4, rot: -a, color: 0x7a7488, tex: 'brick', uv: 0.4, camBlock: false });
    }
    // Goldener Thron und Münzhaufen – Krötus liebt Gold
    L.box({ x: 0, z: -13.5, y: 0, w: 3.2, h: 1.2, d: 2, color: 0xd9ab34, tex: 'plain' });
    L.box({ x: 0, z: -14.3, y: 1.2, w: 3.2, h: 3.4, d: 0.5, color: 0xd9ab34, tex: 'plain' });
    L.add(G.box(2.6, 0.3, 1.6), M(0, 1.2, -13.4), 0x8a2a4a, 'plain');
    for (const s of [-1, 1]) L.add(G.sphere(0.35, 8, 6), M(s * 1.6, 4.6, -14.3), 0xe0203a, 'plain');
    for (const [x, z, n] of [[5, -12, 6], [-5, -12, 5], [9, -9, 4], [-9, -9, 5]]) {
      for (let i = 0; i < n; i++) L.add(G.cyl(0.35, 0.35, 0.08, 10), M(x + Math.sin(i * 2.4) * 0.5, i * 0.08, z + Math.cos(i * 1.7) * 0.5), 0xf0c030, 'plain');
    }
    // Rune-Säulen
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      L.cyl({ x: Math.cos(a) * 11, z: Math.sin(a) * 11, y: 0, r: 0.8, h: 3.2, color: 0x5a5470, tex: 'rock' });
      L.add(G.torus(0.5, 0.12, 4, 10), M(Math.cos(a) * 11.85, 2.2, Math.sin(a) * 11.85, Math.PI / 2 - a), 0xb07aff, 'plain');
    }
    // Außentreppe
    for (let i = 0; i < STEPS; i++) {
      const a = A0 + i * DA;
      const top = BASE + RISE * (i + 1);
      L.box({ x: Math.cos(a) * STAIR_R, z: Math.sin(a) * STAIR_R, y: top - 0.4, w: 3.2, h: 0.4, d: 2.3, rot: -a, color: 0x8a8498, tex: 'stone', uv: 0.5, camBlock: false });
      if (i % 3 === 1) L.berry(Math.cos(a) * STAIR_R, top + 0.9, Math.sin(a) * STAIR_R);
      if (i % 6 === 0) L.add(G.cyl(0.12, 0.12, 1.4, 5), M(Math.cos(a) * (STAIR_R + 1.5), top, Math.sin(a) * (STAIR_R + 1.5)), 0x3a3448, 'plain');
    }
    // Landeplatz unten mit Heimweg-Portal
    L.box({ x: 0, z: 28, y: BASE - 1, w: 10, h: 1, d: 18, color: 0x7a7488, tex: 'stone', uv: 0.4 });
    L.add(G.box(10.4, 6, 18.4), M(0, BASE - 7, 28), 0x5a5468, 'rock', 0.3);
    L.portal(0, 35, { y: BASE, rot: Math.PI, to: 'hub', spawn: 'from-turm', label: 'Wurzelhügel', color: 0xffd24a });
    L.spawnPoint('start', 0, 25, Math.PI, BASE);
    L.spawnPoint('arena', 0, 8, Math.PI, 0);
    L.apple(3, 22, BASE);
    // Äpfel in der Arena (wachsen nach)
    for (const [x, z] of [[8, 8], [-8, 8], [8, -8], [-8, -8]]) L.apple(x, z, 0, { respawn: 25 });
    L.berryRing(0, 0, 6, 8, 0.9);

    // Wölkchen fliegt vom Landeplatz zu einer kleinen Bonus-Insel über dem Nebel
    const cloud = makeCloud();
    L.platform({
      shape: 'cyl', r: 1.35, h: 0.6, mesh: cloud,
      path: (t) => {
        const k = (1 - Math.cos(t * 0.55)) / 2;
        return { x: 7 + k * 12, y: BASE + 0.1 + k * 2.2 + Math.sin(t * 2.2) * 0.1, z: 28 + k * 5, rot: -Math.PI / 2 + 0.4 };
      },
    });
    L.animated.push((dt, t) => { cloud.userData.rig.star.rotation.y = t * 2; });
    L.add(G.rock(3.2, 9), M(22.5, BASE - 1, 34, 0, [1, 0.7, 1]), 0x6a6478, 'rock', 0.4, { flat: true });
    L.add(G.cyl(3, 2.8, 0.5, 10), M(22.5, BASE + 1.9, 34), 0x5a8a4a, 'ground', 0.4);
    L.world.addCyl({ x: 22.5, z: 34, y: BASE - 2, r: 2.9, h: 4.4 });
    L.berryRing(22.5, 34, 1.8, 6, BASE + 3.3);
    L.apple(22.5, 34, BASE + 2.4);

    // Blitze
    let flashT = 3;
    L.animated.push((dt) => {
      flashT -= dt;
      const r = L.game.renderer;
      if (flashT < 0) {
        flashT = 5 + Math.random() * 6;
        r.hemi.intensity = 4;
        L.game.audio.play('pound');
      }
      r.hemi.intensity = damp(r.hemi.intensity, 1.6, 4, dt);
    });

    if (!L.game.save.data.flags['turm:won']) {
      L.boss = L.spawn(new Boss(L));
      L.trigger(0, 0, { y: 0, r: 13, h: 5, onEnter: () => L.boss.start() });
    }
  },

  onEnter(L, g) {
    if (!L.flag('arrive')) {
      L.setFlag('arrive');
      g.cutscene(async () => {
        await g.camTo([30, BASE + 8, 40], [0, -4, 0], 0);
        await g.camTo([26, 6, 26], [0, 4, 0], 3.5);
        await g.say([
          { who: 'kiki', text: 'Brrr ... der Krötenturm. Hier oben thront also der alte Warzenkönig.' },
          { who: 'bruno', text: 'Die Treppe führt außen herum nach oben. Schön vorsichtig, da unten ist nur Nebel!' },
        ]);
      });
    }
  },

  onRespawn(L) {
    L.boss?.reset();
  },
};

// ---------- Goldmünze (Wurfgeschoss) ----------
const GRAV = 16;
class Coin extends Entity {
  constructor(L, x, y, z, tx, tz, flight) {
    super(L, x, y, z);
    this.setObj(makeCoin());
    // Wurfbahn so berechnen, dass die Münze nach "flight" Sekunden beim Ziel landet
    this.vel = new THREE.Vector3((tx - x) / flight, (0.5 - y + 0.5 * GRAV * flight * flight) / flight, (tz - z) / flight);
    this.life = 5;
    this.shadow = new BlobShadow(L, 0.8);
  }
  update(dt) {
    const p = this.player;
    this.life -= dt;
    this.vel.y -= GRAV * dt;
    this.pos.addScaledVector(this.vel, dt);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y += dt * 14;
    this.shadow.update(this.pos.x, this.pos.y, this.pos.z);
    if (Math.random() < dt * 12) this.game.particles.emit('sparkle', this.pos.x, this.pos.y, this.pos.z, 1, [1, 0.85, 0.3]);
    const dx = p.pos.x - this.pos.x, dy = p.pos.y + 0.9 - this.pos.y, dz = p.pos.z - this.pos.z;
    if (p.attack.active && p.attackHits(this.pos, 0.6, 1)) return this.pop();
    if (dx * dx + dy * dy + dz * dz < 1.3) {
      p.hurt(this.pos);
      return this.pop();
    }
    const gy = this.level.world.ground(this.pos.x, this.pos.z, this.pos.y + 0.5).y;
    if (this.pos.y < gy + 0.2 || this.life <= 0) this.pop();
  }
  pop() {
    this.game.audio.play('coin', this.pos);
    this.game.particles.emit('sparkle', this.pos.x, this.pos.y + 0.2, this.pos.z, 8, [1, 0.8, 0.3]);
    this.remove();
  }
}

// ---------- Schockwelle ----------
class Shockwave extends Entity {
  constructor(L, x, y, z) {
    super(L, x, y, z);
    this.r = 1;
    this.mesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.35, 6, 32), mat(0xf0d060, { emissive: 0x806000, transparent: true, opacity: 0.8 }));
    this.mesh.rotation.x = Math.PI / 2;
    this.setObj(this.mesh);
    this.obj.position.y = y + 0.3;
  }
  update(dt) {
    this.r += dt * 9;
    this.mesh.scale.set(this.r, this.r, 1);
    const p = this.player;
    const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    if (Math.abs(d - this.r) < 0.7 && p.pos.y < this.pos.y + 0.8) p.hurt(this.pos);
    if (this.r > R + 2) this.remove();
  }
}

// ---------- Endgegner König Krötus ----------
// Ablauf: hüpft am Rand entlang und wirft Münzen -> großer Bauchplatscher ->
// liegt benommen am Boden (verwundbar) -> nach Treffer ruft er Blechkäfer.
class Boss extends Entity {
  constructor(L) {
    super(L, 0, 0, -8);
    this.model = makeToadKing();
    this.model.scale.setScalar(1.5);
    this.rig = this.model.userData.rig;
    this.setObj(this.model);
    this.shadow = new BlobShadow(L, 4);
    this.maxHp = 6;
    this.hp = this.maxHp;
    this.state = 'idle';
    this.st = 0;
    this.angle = -Math.PI / 2;
    this.casts = 0;
    this.active = false;
    this.facing = 0;
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();
  }

  get phase() { return this.hp > 4 ? 1 : this.hp > 2 ? 2 : 3; }

  set(s) {
    this.state = s;
    this.st = 0;
  }

  clearAttacks() {
    for (const e of this.level.entities) if (e instanceof Coin || e instanceof Shockwave || e instanceof Beetle) e.remove();
  }

  reset() {
    if (this.state === 'dead') return;
    this.active = false;
    this.hp = this.maxHp;
    this.set('idle');
    this.pos.set(0, 0, -8);
    this.model.rotation.set(0, 0, 0);
    this.clearAttacks();
    this.level.trigger(0, 0, { y: 0, r: 13, h: 5, onEnter: () => this.start() });
    this.game.hud.setBoss(null);
  }

  async start() {
    if (this.active) return;
    const g = this.game;
    await g.cutscene(async () => {
      await g.camTo([6, 5, 4], [this.pos.x, this.pos.y + 2.8, this.pos.z], 1.2);
      g.audio.play('croak');
      if (!this.level.flag('bossIntro')) {
        this.level.setFlag('bossIntro');
        await g.say([
          { who: 'koenig', text: 'Ihr schon wieder?! QUAAAK! Wie seid ihr an meinen Blechkäfern und dem Krabbenkäpt\'n vorbeigekommen?' },
          { who: 'kiki', text: 'Mit Köpfchen, Schnabel und einem sehr dicken Dachs!' },
          { who: 'bruno', text: 'Hey! ... Aber sie hat recht. Gib den Sonnenstein zurück, Krötus!' },
          { who: 'koenig', text: 'Niemals! Alles, was glänzt, gehört MIR! Ich bewerfe euch mit meinem Gold, bis ihr vom Turm purzelt!' },
        ]);
      } else {
        await g.say([{ who: 'koenig', text: 'Zurück für eine zweite Runde? Diesmal kostet es euch das letzte Hemd! QUAAAK!' }]);
      }
      await g.say([{ who: 'kiki', text: 'Achtung, Münzen! Wenn er seinen großen Bauchplatscher macht, ist er danach ganz benommen. Dann schnappen wir ihn uns!' }]);
    });
    this.active = true;
    this.hopT = 0.4;
    this.set('hop');
    g.hud.setBoss(this.hp / this.maxHp, 'König Krötus');
  }

  // Parabel-Sprung von "from" nach "to"
  jumpTo(x, z, h, dur) {
    this.from.copy(this.pos);
    this.to.set(x, 0, z);
    this.jumpH = h;
    this.jumpDur = dur;
    this.jumpT = 0;
  }

  updateJump(dt) {
    this.jumpT = Math.min(this.jumpDur, this.jumpT + dt);
    const k = this.jumpT / this.jumpDur;
    this.pos.lerpVectors(this.from, this.to, k);
    this.pos.y = Math.sin(k * Math.PI) * this.jumpH;
    return k >= 1;
  }

  update(dt) {
    this.t += dt;
    this.st += dt;
    const g = this.game, p = this.player, rig = this.rig;
    const toP = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    // Atmen/Aufblähen
    rig.body.scale.set(1 + Math.sin(this.t * 3) * 0.03, 1 - Math.sin(this.t * 3) * 0.02, 1 + Math.sin(this.t * 3) * 0.03);

    if (this.state === 'idle') {
      this.facing = dampAngle(this.facing, toP, 2, dt);
    } else if (this.state === 'hop') {
      const ph = this.phase;
      this.facing = dampAngle(this.facing, toP, 6, dt);
      if (this.jumpDur && this.jumpT < this.jumpDur) {
        if (this.updateJump(dt)) {
          g.particles.emit('dust', this.pos.x, 0, this.pos.z, 6);
          g.audio.play('land', this.pos);
        }
      } else {
        this.hopT -= dt;
        if (this.hopT <= 0) {
          this.hopT = [0, 1.3, 1.05, 0.85][ph];
          this.angle += 0.75;
          this.jumpTo(Math.cos(this.angle) * 10, Math.sin(this.angle) * 10, 2.6, 0.55);
        }
      }
      this.castT = (this.castT ?? 1.2) - dt;
      if (this.castT <= 0) {
        this.castT = [0, 2, 1.6, 1.3][ph];
        this.cast();
        this.casts++;
        if (this.casts >= [0, 4, 5, 6][ph]) {
          this.casts = 0;
          this.set('windup');
          g.audio.play('croak', this.pos);
          g.say([{ who: 'koenig', text: ['QUAAAK!', 'QUAAAAAAK!', 'BAUCHPLATSCHER!'][ph - 1] }]);
        }
      }
      rig.armR.rotation.x = damp(rig.armR.rotation.x, 0, 4, dt);
    } else if (this.state === 'windup') {
      // bläst sich auf und duckt sich
      const k = Math.min(1, this.st / 0.7);
      this.model.scale.set(1.5 * (1 + k * 0.25), 1.5 * (1 - k * 0.2), 1.5 * (1 + k * 0.25));
      if (this.st > 0.7) {
        this.model.scale.setScalar(1.5);
        // Ziel: in Richtung Spieler, aber innerhalb der Arena
        let tx = p.pos.x, tz = p.pos.z;
        const d = Math.hypot(tx, tz);
        if (d > 9) { tx *= 9 / d; tz *= 9 / d; }
        this.jumpTo(tx, tz, 11, 1.25);
        this.set('bigjump');
      }
    } else if (this.state === 'bigjump') {
      this.facing += dt * 8;
      if (this.updateJump(dt)) {
        this.set('dizzy');
        g.audio.play('pound', this.pos);
        g.renderer.shake = 1.2;
        g.input.rumble(300, 1);
        g.particles.emit('ring', this.pos.x, 0, this.pos.z, 24);
        if (this.phase >= 2) this.level.spawn(new Shockwave(this.level, this.pos.x, 0, this.pos.z));
      }
    } else if (this.state === 'dizzy') {
      // liegt benommen auf dem Rücken
      this.model.rotation.x = damp(this.model.rotation.x, -1.2, 8, dt);
      rig.head.rotation.z = Math.sin(this.t * 6) * 0.3;
      if (Math.random() < dt * 8) g.particles.emit('sparkle', this.pos.x + Math.sin(this.t * 5), 3.2, this.pos.z + Math.cos(this.t * 5), 1, [1, 1, 0.5]);
      if (this.st > [0, 4, 3.4, 3][this.phase]) {
        this.model.rotation.x = 0;
        rig.head.rotation.z = 0;
        this.set('hop');
        g.say([{ who: 'koenig', text: 'Ha! Zu langsam, ihr Pelzpuschel! QUAAAK!' }]);
      }
    } else if (this.state === 'hurt') {
      this.model.rotation.x = damp(this.model.rotation.x, 0, 10, dt);
      rig.head.rotation.z = 0;
      this.facing += dt * 12;
      this.pos.y = Math.sin(Math.min(1, this.st / 1.2) * Math.PI) * 2.5;
      if (this.st > 1.2) {
        this.pos.y = 0;
        this.set('hop');
        this.hopT = 0.3;
        const n = this.phase === 2 ? 2 : this.phase === 3 ? 3 : 0;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const b = this.level.spawn(new Beetle(this.level, Math.cos(a) * 8, Math.sin(a) * 8, { chase: 30, wander: 12, speed: 2.4 + this.phase * 0.4 }));
          this.game.particles.emit('pop', b.pos.x, 0.5, b.pos.z, 6, [1, 0.6, 0.35]);
        }
        if (n) g.audio.play('switch');
      }
    } else if (this.state === 'dead') {
      return;
    }

    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.facing;
    this.shadow.update(this.pos.x, this.pos.y, this.pos.z);
    if (!this.active) return;

    // Treffer & Schaden
    const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    const bodyH = 3.4;
    if (this.state === 'dizzy') {
      const stomp = d < 2.2 && p.vel.y < -1 && p.pos.y > this.pos.y + 1;
      if (p.attackHits(this.pos, 1.8, 2) || stomp) this.hit();
    } else if (d < 1.9 && p.pos.y < this.pos.y + bodyH && p.pos.y + p.height > this.pos.y && this.state !== 'hurt') {
      p.hurt(this.pos);
    }
  }

  cast() {
    const g = this.game, p = this.player, ph = this.phase;
    g.audio.play('coin', this.pos);
    this.rig.armR.rotation.x = -1.6;
    const ox = this.pos.x, oy = this.pos.y + 3.2, oz = this.pos.z;
    const spread = ph === 1 ? [0] : ph === 2 ? [-0.3, 0, 0.3] : [-0.5, -0.25, 0, 0.25, 0.5];
    const dx = p.pos.x - ox, dz = p.pos.z - oz;
    const dist = Math.hypot(dx, dz) || 1;
    const flight = Math.min(1.4, 0.55 + dist / 16);
    for (const s of spread) {
      const c = Math.cos(s), sn = Math.sin(s);
      // Ziel um die Spielerposition fächerförmig verteilen
      const tx = ox + dx * c - dz * sn, tz = oz + dx * sn + dz * c;
      this.level.spawn(new Coin(this.level, ox, oy, oz, tx, tz, flight));
    }
  }

  hit() {
    const g = this.game;
    this.hp--;
    g.audio.play('bosshit', this.pos);
    g.renderer.shake = 1;
    g.input.rumble(300, 1);
    g.particles.emit('pop', this.pos.x, this.pos.y + 2, this.pos.z, 16, [0.7, 0.8, 0.4]);
    g.particles.emit('sparkle', this.pos.x, this.pos.y + 2, this.pos.z, 20, [1, 0.85, 0.3]);
    this.player.bounce(10);
    g.hud.setBoss(this.hp / this.maxHp, 'König Krötus');
    if (this.hp <= 0) {
      this.set('dead');
      this.active = false;
      this.victory();
      return;
    }
    this.set('hurt');
    const lines = {
      5: 'Autsch! Meine Krone! Das war nur Glück!',
      4: 'Jetzt reicht\'s! Blechkäfer, zu mir!',
      3: 'Aua! Mein schönes Monokel! Das kostet euch was!',
      2: 'Genug gespielt! Jetzt wird es richtig teuer!',
      1: 'Nein, nein, NEIN! Ich bin der prächtige König Krötus!',
    }[this.hp];
    if (lines) g.say([{ who: 'koenig', text: lines }]);
  }

  async victory() {
    const g = this.game, L = this.level;
    this.clearAttacks();
    g.hud.setBoss(null);
    g.audio.stopMusic();
    // beide Flags sofort, damit ein Abbruch in der Szene das Ende nicht verhindert
    g.save.data.flags['turm:won'] = true;
    g.save.data.flags['hub:restored'] = true;
    g.save.write();
    await g.cutscene(async () => {
      this.model.rotation.set(0, 0, 0);
      this.pos.y = 0;
      this.obj.position.copy(this.pos);
      const b = this.pos.clone();
      await g.camTo([b.x + 6, 4, b.z + 7], [b.x, 2.5, b.z], 1);
      await g.say([
        { who: 'koenig', text: 'Neiiin! Mein Gold, meine Krone, mein wunderschöner Sonnenstein ...' },
        { who: 'koenig', text: 'Das ist noch nicht vorbei, hört ihr? Ich komme wieder! QUAAAAAAK!' },
      ]);
      g.audio.play('croak');
      // Mit einem riesigen Sprung ab in den Nebel
      await g.tween(2.2, (k) => {
        this.pos.set(b.x + k * 40, Math.sin(k * Math.PI * 0.8) * 18 - k * k * 20, b.z - k * 60);
        this.obj.position.copy(this.pos);
        this.obj.rotation.y = k * 20;
      });
      this.remove();
      g.audio.playMusic('victory');
      await g.say([
        { who: 'kiki', text: 'Und tschüss, Warzenkönig! Gute Landung im Nebel!' },
        { who: 'bruno', text: 'Seht mal, die Wolken reißen auf! Schnell, zurück zum Sonnenhügel!' },
      ]);
    });
    g.enterLevel('hub', 'start');
  }
}
