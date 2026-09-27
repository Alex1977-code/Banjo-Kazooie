// Nebelturm: Aufstieg über die Außentreppe und Endkampf gegen Nebelbart.
import * as THREE from 'three';
import { G, M, mat, part } from '../engine/geo.js';
import { makeNebelbart } from '../game/models.js';
import { Entity, BlobShadow, FogImp } from '../game/entities.js';
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
  name: 'Nebelturm',
  subtitle: 'Finale',
  music: 'boss',
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
          { who: 'kiki', text: 'Brrr ... der Nebelturm. Hier oben wohnt also der alte Nebelsack.' },
          { who: 'bruno', text: 'Die Treppe führt außen herum nach oben. Schön vorsichtig, da unten ist nur Nebel!' },
        ]);
      });
    }
  },

  onRespawn(L) {
    L.boss?.reset();
  },
};

// ---------- Nebelkugel ----------
class Orb extends Entity {
  constructor(L, x, y, z, vx, vy, vz, homing = 0) {
    super(L, x, y, z);
    const g = new THREE.Group();
    part(g, G.sphere(0.45, 10, 8), mat(0x9a7aff, { emissive: 0x5a2aff, transparent: true, opacity: 0.85 }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: L.game.tex.glow, color: 0xb08aff, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(2.2);
    g.add(glow);
    this.setObj(g);
    this.vel = new THREE.Vector3(vx, vy, vz);
    this.homing = homing;
    this.life = 6;
    this.shadow = new BlobShadow(L, 0.9);
  }
  update(dt) {
    const p = this.player;
    this.life -= dt;
    if (this.homing) {
      const to = new THREE.Vector3(p.pos.x - this.pos.x, p.pos.y + 0.9 - this.pos.y, p.pos.z - this.pos.z).normalize();
      const sp = this.vel.length();
      this.vel.lerp(to.multiplyScalar(sp), Math.min(1, dt * this.homing));
    }
    this.pos.addScaledVector(this.vel, dt);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y += dt * 5;
    this.shadow.update(this.pos.x, this.pos.y, this.pos.z);
    if (Math.random() < dt * 20) this.game.particles.emit('fog', this.pos.x, this.pos.y, this.pos.z, 1);
    const dx = p.pos.x - this.pos.x, dy = p.pos.y + 0.9 - this.pos.y, dz = p.pos.z - this.pos.z;
    if (p.attack.active && p.attackHits(this.pos, 0.6, 1)) return this.pop();
    if (dx * dx + dy * dy + dz * dz < 1.2) {
      p.hurt(this.pos);
      return this.pop();
    }
    const gy = this.level.world.ground(this.pos.x, this.pos.z, this.pos.y + 0.5).y;
    if (this.pos.y < gy + 0.3 || this.life <= 0) this.pop();
  }
  pop() {
    this.game.particles.emit('pop', this.pos.x, this.pos.y, this.pos.z, 6, [0.7, 0.55, 1]);
    this.remove();
  }
}

// ---------- Schockwelle ----------
class Shockwave extends Entity {
  constructor(L, x, y, z) {
    super(L, x, y, z);
    this.r = 1;
    this.mesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.35, 6, 32), mat(0xc0a0ff, { emissive: 0x6a3aff, transparent: true, opacity: 0.8 }));
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

// ---------- Endgegner Nebelbart ----------
class Boss extends Entity {
  constructor(L) {
    super(L, 0, 7, -8);
    this.model = makeNebelbart();
    this.model.scale.setScalar(1.6);
    this.rig = this.model.userData.rig;
    this.setObj(this.model);
    this.shadow = new BlobShadow(L, 3.5);
    this.maxHp = 6;
    this.hp = this.maxHp;
    this.state = 'idle';
    this.st = 0;
    this.angle = -Math.PI / 2;
    this.casts = 0;
    this.active = false;
    this.facing = 0;
    this.ground = new THREE.Vector3();
  }

  get phase() { return this.hp > 4 ? 1 : this.hp > 2 ? 2 : 3; }

  set(s) {
    this.state = s;
    this.st = 0;
  }

  reset() {
    if (this.state === 'dead') return;
    this.active = false;
    this.hp = this.maxHp;
    this.set('idle');
    this.pos.set(0, 7, -8);
    for (const e of this.level.entities) if (e instanceof Orb || e instanceof Shockwave || e instanceof FogImp) e.remove();
    this.level.trigger(0, 0, { y: 0, r: 13, h: 5, onEnter: () => this.start() });
    this.game.hud.setBoss?.(null);
  }

  async start() {
    if (this.active) return;
    const g = this.game;
    await g.cutscene(async () => {
      await g.camTo([6, 5, 6], [this.pos.x, this.pos.y + 2, this.pos.z], 1.2);
      if (!this.level.flag('bossIntro')) {
        this.level.setFlag('bossIntro');
        await g.say([
          { who: 'nebelbart', text: 'Ihr schon wieder?! HATSCHI! Wie seid ihr an meinen Nebelkäfern und dem Krabbenkäpt\'n vorbeigekommen?' },
          { who: 'kiki', text: 'Mit Köpfchen, Schnabel und einem sehr dicken Dachs!' },
          { who: 'bruno', text: 'Hey! ... Aber sie hat recht. Gib den Sonnenstein zurück, Nebelbart!' },
          { who: 'nebelbart', text: 'Niemals! Das Wurzeltal bleibt grau! Ich blase euch mit meinen Nebelkugeln vom Turm! Hatschi!' },
        ]);
      } else {
        await g.say([{ who: 'nebelbart', text: 'Zurück für eine zweite Runde? Diesmal pust ich euch weg! Hatschi!' }]);
      }
      await g.say([{ who: 'kiki', text: 'Er niest die ganze Zeit ... wenn er richtig heftig niest, verliert er bestimmt das Gleichgewicht. Dann schnappen wir ihn uns!' }]);
    });
    this.active = true;
    this.set('fly');
    g.hud.setBoss?.(this.hp / this.maxHp, 'Nebelbart');
  }

  update(dt) {
    this.t += dt;
    this.st += dt;
    const g = this.game, p = this.player, rig = this.rig;
    const toP = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    rig.cloud.rotation.y = this.t;
    rig.orb.material.emissiveIntensity = 1 + Math.sin(this.t * 8) * 0.5;

    if (this.state === 'idle') {
      this.pos.y = 7 + Math.sin(this.t * 1.5) * 0.4;
      this.facing = dampAngle(this.facing, toP, 2, dt);
    } else if (this.state === 'fly') {
      const ph = this.phase;
      this.angle += dt * (0.35 + ph * 0.12);
      const tx = Math.cos(this.angle) * 11, tz = Math.sin(this.angle) * 11;
      this.pos.x = damp(this.pos.x, tx, 2, dt);
      this.pos.z = damp(this.pos.z, tz, 2, dt);
      this.pos.y = damp(this.pos.y, 6.5 + Math.sin(this.t * 1.7) * 0.8, 3, dt);
      this.facing = dampAngle(this.facing, toP, 5, dt);
      const interval = [0, 2.1, 1.7, 1.35][ph];
      if (this.st > interval) {
        this.st = 0;
        this.cast();
        this.casts++;
        if (this.casts >= [0, 4, 5, 6][ph]) {
          this.casts = 0;
          this.set('sneeze');
          g.audio.play('sneeze');
          g.say([{ who: 'nebelbart', text: ['Hatschi!', 'HAAA ... HAAATSCHI!', 'Hah ... hah ... HAAAAATSCHIII!'][ph - 1] }]);
        }
      }
      rig.armR.rotation.x = damp(rig.armR.rotation.x, 0, 4, dt);
    } else if (this.state === 'sneeze') {
      // Holt Luft ... und stürzt dann ab
      rig.head.rotation.x = this.st < 0.5 ? -this.st * 0.8 : 0.6;
      if (this.st > 0.6) {
        this.pos.y -= dt * 18;
        this.facing += dt * 10;
        if (this.pos.y <= 0.2) {
          this.pos.y = 0;
          this.set('dizzy');
          g.audio.play('pound');
          g.renderer.shake = 1;
          g.particles.emit('ring', this.pos.x, 0, this.pos.z, 20);
          if (this.phase === 3) this.level.spawn(new Shockwave(this.level, this.pos.x, 0, this.pos.z));
        }
      }
    } else if (this.state === 'dizzy') {
      rig.head.rotation.x = 0;
      rig.head.rotation.z = Math.sin(this.t * 6) * 0.3;
      this.facing += dt * 1.5;
      if (Math.random() < dt * 8) g.particles.emit('sparkle', this.pos.x + Math.sin(this.t * 5) * 1, 4.2, this.pos.z + Math.cos(this.t * 5) * 1, 1, [1, 1, 0.5]);
      if (this.st > [0, 4, 3.4, 3][this.phase]) {
        rig.head.rotation.z = 0;
        this.set('fly');
        g.say([{ who: 'nebelbart', text: 'Ha! Zu langsam, ihr Pelzpuschel!' }]);
      }
    } else if (this.state === 'hurt') {
      rig.head.rotation.z = 0;
      this.pos.y = damp(this.pos.y, 7, 3, dt);
      this.facing += dt * 14;
      if (this.st > 1.3) {
        this.set('fly');
        const imps = this.phase === 2 ? 2 : this.phase === 3 ? 3 : 0;
        for (let i = 0; i < imps; i++) {
          const a = Math.random() * Math.PI * 2;
          this.level.spawn(new FogImp(this.level, Math.cos(a) * 9, 3, Math.sin(a) * 9, { speed: 3 + this.phase * 0.5 }));
        }
      }
    } else if (this.state === 'dead') {
      return;
    }

    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.facing;
    this.shadow.update(this.pos.x, this.pos.y, this.pos.z);
    if (!this.active) return;

    // Kontakt & Treffer
    const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    const bodyH = 3.5;
    const close = d < 1.8 && p.pos.y < this.pos.y + bodyH + 0.5 && p.pos.y + p.height > this.pos.y;
    if (this.state === 'dizzy') {
      const stomp = d < 2 && p.vel.y < -1 && p.pos.y > this.pos.y + bodyH - 1;
      if (p.attackHits(this.pos, 1.4, bodyH) || stomp) this.hit();
    } else if (close && this.state === 'fly') {
      p.hurt(this.pos);
    }
  }

  cast() {
    const g = this.game, p = this.player, ph = this.phase;
    g.audio.play('zap');
    this.rig.armR.rotation.x = -1.4;
    const ox = this.pos.x, oy = this.pos.y + 2.5, oz = this.pos.z;
    const base = Math.atan2(p.pos.x - ox, p.pos.z - oz);
    const dist = Math.hypot(p.pos.x - ox, p.pos.z - oz);
    const sp = 8 + ph * 1.5;
    const tFlight = dist / sp;
    const vy = (p.pos.y + 0.9 - oy) / Math.max(0.5, tFlight);
    const spread = ph === 1 ? [0] : [-0.35, 0, 0.35];
    for (const s of spread) {
      const a = base + s;
      this.level.spawn(new Orb(this.level, ox, oy, oz, Math.sin(a) * sp, vy, Math.cos(a) * sp, ph === 3 && s === 0 ? 1.2 : 0));
    }
  }

  hit() {
    const g = this.game;
    this.hp--;
    g.audio.play('bosshit');
    g.renderer.shake = 1;
    g.input.rumble(300, 1);
    g.particles.emit('pop', this.pos.x, this.pos.y + 2, this.pos.z, 16, [0.8, 0.7, 1]);
    this.player.bounce(10);
    g.hud.setBoss?.(this.hp / this.maxHp, 'Nebelbart');
    if (this.hp <= 0) {
      this.set('dead');
      this.active = false;
      this.victory();
      return;
    }
    this.set('hurt');
    const lines = {
      5: 'Autsch! Mein Bart! Das war nur Glück!',
      4: 'Jetzt reicht\'s! Nebelgeister, zu mir!',
      3: 'Aua! Hört auf, das kitzelt ... und tut weh!',
      2: 'Genug gespielt! Jetzt wird es richtig neblig!',
      1: 'Nein, nein, NEIN! Ich bin der große Nebelbart!',
    }[this.hp];
    if (lines) g.say([{ who: 'nebelbart', text: lines }]);
  }

  async victory() {
    const g = this.game, L = this.level;
    for (const e of L.entities) if (e instanceof Orb || e instanceof Shockwave || e instanceof FogImp) e.remove();
    g.hud.setBoss?.(null);
    g.audio.stopMusic();
    // beide Flags sofort, damit ein Abbruch in der Szene das Ende nicht verhindert
    g.save.data.flags['turm:won'] = true;
    g.save.data.flags['hub:restored'] = true;
    g.save.write();
    await g.cutscene(async () => {
      const b = this.pos.clone();
      await g.camTo([b.x + 6, 4, b.z + 6], [b.x, 2, b.z], 1);
      await g.say([
        { who: 'nebelbart', text: 'Neiiin! Mein wunderschöner, grauer, gemütlicher Nebel ...' },
        { who: 'nebelbart', text: 'Hah ... hah ... HAAAAAATSCHIIIIII!' },
      ]);
      g.audio.play('sneeze');
      // Er niest sich selbst vom Turm
      await g.tween(2.2, (k) => {
        this.pos.set(b.x + k * 40, 2 + k * 30 - k * k * 10, b.z - k * 60);
        this.obj.position.copy(this.pos);
        this.obj.rotation.y = k * 30;
        this.obj.rotation.z = k * 8;
      });
      this.remove();
      g.audio.playMusic('victory');
      await g.say([
        { who: 'kiki', text: 'Und tschüss! Gute Reise, Nebelnase!' },
        { who: 'bruno', text: 'Seht mal, der Nebel lichtet sich! Schnell, zurück zum Sonnenhügel!' },
      ]);
    });
    g.enterLevel('hub', 'start');
  }
}

