// Alles, was im Level lebt: Sammelobjekte, NPCs, Gegner, Tore, Schalter ...
import * as THREE from 'three';
import {
  makeShard, makeApple, makeBeetle, makeGrimmpilz, makeCrab, makeFogImp, makeLernstein,
} from './models.js';
import { G, mat, part, mergeStatic } from '../engine/geo.js';
import { damp, dampAngle, clamp } from '../engine/util.js';

// ---------- Blob-Schatten ----------
// Alle runden N64-Schatten eines Levels teilen sich ein Instanced-Mesh (1 Draw-Call).
const _m4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
class ShadowPool {
  constructor(level, max = 160) {
    const mat = new THREE.MeshBasicMaterial({
      map: level.game.tex.shadow, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat, max);
    this.mesh.renderOrder = 1;
    this.mesh.frustumCulled = false;
    this.free = [];
    for (let i = max - 1; i >= 0; i--) {
      this.free.push(i);
      this.hide(i);
    }
    level.root.add(this.mesh);
  }
  alloc() { return this.free.pop() ?? -1; }
  release(i) {
    if (i < 0) return;
    this.hide(i);
    this.free.push(i);
  }
  hide(i) {
    _m4.makeScale(0, 0, 0);
    this.mesh.setMatrixAt(i, _m4);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  set(i, x, y, z, s) {
    if (i < 0) return;
    _m4.compose(_pos.set(x, y, z), _quat, _scl.set(s, 1, s));
    this.mesh.setMatrixAt(i, _m4);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class BlobShadow {
  constructor(level, size = 1) {
    this.level = level;
    this.size = size;
    if (!level.shadowPool) level.shadowPool = new ShadowPool(level);
    this.pool = level.shadowPool;
    this.idx = this.pool.alloc();
    // Kompatibilität: mesh.visible zum Ein-/Ausblenden
    const self = this;
    this.mesh = {
      get visible() { return self.shown !== false; },
      set visible(v) { self.shown = v; if (!v) self.pool.hide(self.idx); },
    };
  }
  update(x, y, z) {
    if (this.shown === false) return;
    const w = this.level.world;
    const g = w.ground(x, z, y + 0.3).y;
    const wy = w.waterAt(x, z);
    const gy = Math.max(g, wy > -Infinity ? wy : g);
    const h = y - gy;
    if (h > 25) {
      this.pool.hide(this.idx);
      return;
    }
    const k = clamp(1 - h / 12, 0.25, 1);
    this.pool.set(this.idx, x, gy + 0.04, z, this.size * k);
  }
  remove() {
    this.pool.release(this.idx);
    this.idx = -1;
  }
}

// ---------- Basis ----------
export class Entity {
  constructor(level, x = 0, y = 0, z = 0) {
    this.level = level;
    this.game = level.game;
    this.pos = new THREE.Vector3(x, y, z);
    this.alive = true;
    this.radius = 0.8;
    this.obj = null;
    this.shadow = null;
    this.t = Math.random() * 10;
  }
  setObj(o) {
    mergeStatic(o);
    this.obj = o;
    o.position.copy(this.pos);
    this.level.root.add(o);
    return o;
  }
  get player() { return this.game.player; }
  distPlayer() {
    const p = this.player.pos;
    return Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
  }
  touchingPlayer(r = this.radius, h = 1.6) {
    const p = this.player.pos;
    return this.distPlayer() < r + this.player.radius && p.y < this.pos.y + h && p.y + this.player.height > this.pos.y - 0.2;
  }
  update() {}
  remove() {
    this.alive = false;
    if (this.obj) this.level.root.remove(this.obj);
    this.shadow?.remove();
  }
}

// ---------- Sonnensplitter ----------
export class Shard extends Entity {
  constructor(level, id, x, y, z, { hidden = false } = {}) {
    super(level, x, y, z);
    this.id = id;
    this.key = `${level.id}:${id}`;
    this.radius = 1.0;
    this.setObj(makeShard());
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.game.tex.glow, color: 0xffd24a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.setScalar(3.2);
    this.obj.add(glow);
    this.shadow = new BlobShadow(level, 1.2);
    this.hidden = hidden;
    this.obj.visible = !hidden;
    this.shadow.mesh.visible = !hidden;
  }
  reveal() {
    this.hidden = false;
    this.obj.visible = true;
    this.shadow.mesh.visible = true;
    this.game.particles.emit('sparkle', this.pos.x, this.pos.y, this.pos.z, 30);
    this.game.audio.play('secret');
  }
  update(dt) {
    this.t += dt;
    if (this.hidden) return;
    this.obj.rotation.y = this.t * 2.2;
    this.obj.position.y = this.pos.y + Math.sin(this.t * 2.5) * 0.18;
    this.shadow.update(this.pos.x, this.pos.y, this.pos.z);
    if (Math.random() < dt * 3) this.game.particles.emit('sparkle', this.pos.x, this.pos.y, this.pos.z, 1);
    if (this.player.state !== 'dead' && this.touchingPlayer(1.0, 1.4)) this.collect();
  }
  collect() {
    this.remove();
    this.game.collectShard(this);
  }
}

// ---------- Glühwürmchen ----------
export class Firefly extends Entity {
  constructor(level, id, x, y, z) {
    super(level, x, y, z);
    this.id = id;
    this.key = `${level.id}:${id}`;
    this.home = this.pos.clone();
    const g = new THREE.Group();
    part(g, G.sphere(0.14, 8, 6), mat(0x3a2a18), 0, 0, 0, 0, 0, 0, [1, 1, 1.4]);
    part(g, G.sphere(0.13, 8, 6), mat(0xeaff7a, { emissive: 0xaacc22 }), 0, -0.02, -0.18);
    for (const s of [-1, 1]) part(g, G.sphere(0.12, 6, 4), mat(0xddeeff, { transparent: true, opacity: 0.6 }), s * 0.12, 0.1, 0, 0, 0, 0, [1, 0.2, 0.6]);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.game.tex.glow, color: 0xd6ff5a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.setScalar(1.6);
    g.add(glow);
    this.glow = glow;
    this.setObj(g);
    this.callT = 0;
  }
  update(dt) {
    this.t += dt;
    const t = this.t;
    this.pos.set(this.home.x + Math.sin(t * 0.9) * 0.9, this.home.y + Math.sin(t * 1.7) * 0.35, this.home.z + Math.cos(t * 1.3) * 0.9);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = t * 1.5;
    this.glow.material.opacity = 0.6 + Math.sin(t * 6) * 0.4;
    const d = this.distPlayer();
    this.callT -= dt;
    if (d < 18 && this.callT <= 0) {
      this.callT = 3 + Math.random() * 2;
      this.game.audio.play('fireflyCall');
    }
    if (this.touchingPlayer(0.9, 1.5)) {
      this.remove();
      this.game.collectFirefly(this);
    }
  }
}

// ---------- Apfel (Energie) ----------
export class Apple extends Entity {
  constructor(level, x, y, z, { respawn = 0 } = {}) {
    super(level, x, y, z);
    this.setObj(makeApple());
    this.shadow = new BlobShadow(level, 0.7);
    this.respawn = respawn;
    this.cool = 0;
  }
  update(dt) {
    this.t += dt;
    if (this.cool > 0) {
      this.cool -= dt;
      if (this.cool <= 0) this.obj.visible = true;
      return;
    }
    this.obj.rotation.y = this.t * 1.5;
    this.obj.position.y = this.pos.y + 0.4 + Math.sin(this.t * 3) * 0.1;
    this.shadow.update(this.pos.x, this.pos.y + 0.4, this.pos.z);
    const p = this.player;
    if (this.touchingPlayer(0.8, 1.2) && p.health < p.maxHealth) {
      p.heal(1);
      this.game.audio.play('health');
      this.game.particles.emit('sparkle', this.pos.x, this.pos.y + 0.5, this.pos.z, 10, [1, 0.4, 0.4]);
      if (this.respawn) {
        this.cool = this.respawn;
        this.obj.visible = false;
      } else this.remove();
    }
  }
}

// ---------- Beeren (viele Sprites in einem Draw-Call) ----------
const BERRY_VERT = `
attribute float phase;
attribute float visible;
uniform float time;
uniform float scale;
varying float vVis;
void main() {
  vec3 p = position;
  p.y += sin(time * 3.0 + phase) * 0.12;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vVis = visible;
  gl_PointSize = visible * 0.9 * scale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const BERRY_FRAG = `
uniform sampler2D map;
varying float vVis;
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  if (t.a < 0.5 || vVis < 0.5) discard;
  gl_FragColor = t;
  #include <colorspace_fragment>
}`;

export class BerryField extends Entity {
  constructor(level, positions, collected) {
    super(level);
    this.list = positions;
    this.got = new Set(collected);
    const n = positions.length;
    const pos = new Float32Array(n * 3), phase = new Float32Array(n), vis = new Float32Array(n);
    positions.forEach((p, i) => {
      pos.set(p, i * 3);
      phase[i] = i * 0.7;
      vis[i] = this.got.has(i) ? 0 : 1;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('visible', new THREE.BufferAttribute(vis, 1));
    this.visAttr = geo.attributes.visible;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.game.tex.berry }, time: { value: 0 }, scale: { value: 300 } },
      vertexShader: BERRY_VERT, fragmentShader: BERRY_FRAG,
    });
    const pts = new THREE.Points(geo, this.mat);
    pts.frustumCulled = false;
    this.setObj(pts);
    this.obj.position.set(0, 0, 0);
    this.combo = 0;
    this.comboT = 0;
  }
  get total() { return this.list.length; }
  get count() { return this.got.size; }
  update(dt) {
    this.t += dt;
    this.mat.uniforms.time.value = this.t;
    this.mat.uniforms.scale.value = this.game.renderer.internalHeight * 0.9;
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;
    const p = this.player.pos;
    for (let i = 0; i < this.list.length; i++) {
      if (this.got.has(i)) continue;
      const b = this.list[i];
      const dx = b[0] - p.x, dz = b[2] - p.z, dy = b[1] - (p.y + 0.8);
      if (dx * dx + dz * dz < 1.1 && Math.abs(dy) < 1.3) {
        this.got.add(i);
        this.visAttr.setX(i, 0);
        this.visAttr.needsUpdate = true;
        this.game.audio.play('berry', this.combo);
        this.combo++;
        this.comboT = 0.7;
        this.game.particles.emit('sparkle', b[0], b[1], b[2], 5, [1, 0.4, 0.5]);
        this.game.collectBerry(i, this);
      }
    }
  }
}

// ---------- NPC ----------
export class NPC extends Entity {
  constructor(level, model, x, y, z, { name = '', who = 'default', talk, facing = 0, radius = 2.8, prompt = 'Reden', idle } = {}) {
    super(level, x, y, z);
    this.setObj(model);
    this.model = model;
    this.name = name;
    this.who = who;
    this.talk = talk;
    this.facing = facing;
    this.obj.rotation.y = facing;
    this.talkRadius = radius;
    this.promptLabel = prompt;
    this.idleFn = idle;
    this.shadow = new BlobShadow(level, 1.6);
    this.shadow.update(x, y, z);
    this.lookAtPlayer = true;
    this.talking = false;
  }
  update(dt) {
    this.t += dt;
    const d = this.distPlayer();
    const rig = this.model.userData.rig;
    if (this.lookAtPlayer && d < 10) {
      const p = this.player.pos;
      const a = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
      this.obj.rotation.y = dampAngle(this.obj.rotation.y, a, 4, dt);
    } else this.obj.rotation.y = dampAngle(this.obj.rotation.y, this.facing, 2, dt);
    if (rig?.body) {
      rig.body.position.y = Math.abs(Math.sin(this.t * (this.talking ? 9 : 2))) * (this.talking ? 0.06 : 0.03);
    }
    if (rig?.head && this.talking) rig.head.rotation.x = Math.sin(this.t * 14) * 0.08;
    this.idleFn?.(this, dt);
    this.obj.position.copy(this.pos);
    if (this.talk && d < this.talkRadius && Math.abs(this.player.pos.y - this.pos.y) < 2.5) this.game.offerPrompt(this, this.promptLabel);
  }
  async interact() {
    if (!this.talk) return;
    this.talking = true;
    try {
      await this.talk(this.game, this);
    } finally {
      this.talking = false;
    }
  }
}

// ---------- Lernstein (neue Fähigkeit) ----------
export class Lernstein extends Entity {
  constructor(level, x, y, z, { move, title, lines, facing = 0 }) {
    super(level, x, y, z);
    this.model = this.setObj(makeLernstein());
    this.obj.rotation.y = facing;
    this.move = move;
    this.title = title;
    this.lines = lines;
    level.world.addCyl({ x, y, z, r: 0.75, h: 2.2 });
    this.talkRadius = 2.6;
    this.busy = false;
  }
  update(dt) {
    this.t += dt;
    const learned = this.game.save.data.moves[this.move];
    const rune = this.model.userData.rune;
    rune.rotation.z = this.t;
    rune.material.emissive.setHex(learned ? 0x224455 : 0x2aa0cc);
    if (!learned && Math.random() < dt * 4) this.game.particles.emit('sparkle', this.pos.x, this.pos.y + 1.5, this.pos.z, 1, [0.5, 0.9, 1]);
    const d = this.distPlayer();
    if (d < this.talkRadius && !this.busy) this.game.offerPrompt(this, learned ? 'Lesen' : 'Lernen');
  }
  async interact() {
    this.busy = true;
    const g = this.game;
    const learned = g.save.data.moves[this.move];
    if (!learned) {
      g.audio.play('learn');
      await g.dialog.say([{ who: 'stein', name: 'Lernstein', text: `Ein alter Lernstein! Er leuchtet ... Tildas Stimme ertönt:` }, ...this.lines]);
      g.save.data.moves[this.move] = true;
      g.save.write();
      g.audio.play('learn');
      g.particles.emit('sparkle', g.player.pos.x, g.player.pos.y + 1, g.player.pos.z, 40, [0.6, 0.9, 1]);
      g.toast(`Neue Fähigkeit: ${this.title}!`, 3);
    } else {
      await g.dialog.say(this.lines.slice(-1));
    }
    this.busy = false;
  }
}

// ---------- Gegner ----------
export class Enemy extends Entity {
  constructor(level, x, z, { model, hp = 1, speed = 2.5, chase = 9, wander = 6, radius = 0.7, height = 1, y, onDefeat, hurtsOnTouch = true, stompable = true } = {}) {
    const w = level.world;
    super(level, x, y ?? w.ground(x, z, 999).y, z);
    this.model = model;
    this.rig = model.userData.rig;
    this.setObj(model);
    this.home = this.pos.clone();
    this.hp = hp;
    this.speed = speed;
    this.chaseR = chase;
    this.wanderR = wander;
    this.radius = radius;
    this.height = height;
    this.dir = Math.random() * Math.PI * 2;
    this.facing = this.dir;
    this.turnT = 0;
    this.dead = false;
    this.deadT = 0;
    this.hitCool = 0;
    this.onDefeat = onDefeat;
    this.hurtsOnTouch = hurtsOnTouch;
    this.stompable = stompable;
    this.shadow = new BlobShadow(level, radius * 2.2);
    this.vy = 0;
    this.onGround = true;
  }

  ai(dt) {
    // Standard: wandern, bei Nähe verfolgen
    const p = this.player.pos;
    const dHome = Math.hypot(p.x - this.home.x, p.z - this.home.z);
    const d = this.distPlayer();
    let tx, tz, sp = this.speed;
    if (d < this.chaseR && dHome < this.wanderR + this.chaseR && this.player.state !== 'dead' && Math.abs(p.y - this.pos.y) < 4) {
      tx = p.x - this.pos.x;
      tz = p.z - this.pos.z;
      sp *= 1.5;
      this.chasing = true;
    } else {
      this.chasing = false;
      this.turnT -= dt;
      if (this.turnT <= 0) {
        this.turnT = 1.5 + Math.random() * 2.5;
        const back = Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > this.wanderR;
        this.dir = back ? Math.atan2(this.home.x - this.pos.x, this.home.z - this.pos.z) : Math.random() * Math.PI * 2;
        this.pause = Math.random() < 0.3 ? 0.8 : 0;
      }
      if (this.pause > 0) { this.pause -= dt; sp = 0; }
      tx = Math.sin(this.dir);
      tz = Math.cos(this.dir);
    }
    this.moveDir(dt, tx, tz, sp);
  }

  moveDir(dt, tx, tz, sp) {
    const l = Math.hypot(tx, tz);
    if (l < 0.01 || sp <= 0) { this.moving = 0; return; }
    tx /= l; tz /= l;
    this.facing = dampAngle(this.facing, Math.atan2(tx, tz), 6, dt);
    const nx = this.pos.x + Math.sin(this.facing) * sp * dt;
    const nz = this.pos.z + Math.cos(this.facing) * sp * dt;
    const w = this.level.world;
    const ng = w.ground(nx, nz, this.pos.y + 0.6).y;
    // nicht ins Wasser / nicht von Kanten fallen / nicht Wände hoch
    if (w.waterAt(nx, nz) > ng + 0.3 || ng < this.pos.y - 1.5 || ng > this.pos.y + 0.6) {
      this.dir += Math.PI * (0.5 + Math.random());
      this.turnT = 1;
      this.moving = 0;
      return;
    }
    this.pos.x = nx;
    this.pos.z = nz;
    w.pushOut(this.pos, this.radius * 0.8, this.height, 0.5);
    this.moving = sp;
  }

  update(dt) {
    this.t += dt;
    const w = this.level.world;
    if (this.dead) {
      this.deadT += dt;
      this.obj.scale.set(1 + this.deadT * 3, Math.max(0.05, 1 - this.deadT * 5), 1 + this.deadT * 3);
      if (this.deadT > 0.2) this.remove();
      return;
    }
    this.hitCool -= dt;
    if (this.stun > 0) this.stun -= dt;
    else this.ai(dt);
    if (!this.flying) {
      this.vy -= 30 * dt;
      this.pos.y += this.vy * dt;
      const g = w.ground(this.pos.x, this.pos.z, this.pos.y + 0.6).y;
      if (this.pos.y <= g) { this.pos.y = g; this.vy = 0; this.onGround = true; }
      else this.onGround = false;
    }
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.facing;
    this.animate(dt);
    this.shadow.update(this.pos.x, this.pos.y, this.pos.z);
    this.checkPlayer();
  }

  animate() {
    const r = this.rig;
    if (r?.legs) r.legs.forEach((l, i) => { l.rotation.x = Math.sin(this.t * 14 + i * 2) * 0.5 * (this.moving ? 1 : 0.1); });
    if (r?.body) r.body.position.y = Math.abs(Math.sin(this.t * 10)) * 0.05 * (this.moving ? 1 : 0);
  }

  checkPlayer() {
    const pl = this.player;
    if (pl.state === 'dead' || this.hitCool > 0) return;
    if (pl.attackHits(this.pos, this.radius, this.height)) {
      this.hit(pl.attack.kind);
      return;
    }
    const d = this.distPlayer();
    const r = this.radius + pl.radius;
    if (d < r) {
      const top = this.pos.y + this.height;
      if (this.stompable && pl.vel.y < -1 && pl.pos.y > top - 0.5) {
        pl.bounce(11);
        this.hit('stomp');
      } else if (this.hurtsOnTouch && pl.pos.y < top && pl.pos.y + pl.height > this.pos.y) {
        pl.hurt(this.pos);
      }
    }
  }

  hit(kind) {
    this.hp--;
    this.hitCool = 0.4;
    this.game.audio.play('hit');
    this.game.input.rumble(60, 0.4);
    if (this.hp <= 0) this.defeat();
    else {
      const p = this.player.pos;
      const a = Math.atan2(this.pos.x - p.x, this.pos.z - p.z);
      this.pos.x += Math.sin(a) * 1.2;
      this.pos.z += Math.cos(a) * 1.2;
      this.stun = 0.6;
    }
  }

  defeat() {
    this.dead = true;
    this.game.audio.play('pop');
    this.game.particles.emit('pop', this.pos.x, this.pos.y + 0.5, this.pos.z, 10, this.popColor);
    this.onDefeat?.(this);
  }
}

export class Beetle extends Enemy {
  constructor(level, x, z, o = {}) {
    super(level, x, z, { model: makeBeetle(o.color), speed: 2.2, radius: 0.7, height: 0.9, ...o });
    this.popColor = [0.6, 0.5, 0.8];
  }
}

export class Grimmpilz extends Enemy {
  constructor(level, x, z, o = {}) {
    super(level, x, z, { model: makeGrimmpilz(), speed: 3, radius: 0.65, height: 1.1, chase: 10, ...o });
    this.hopT = Math.random();
    this.popColor = [0.8, 0.5, 0.9];
  }
  ai(dt) {
    this.hopT -= dt;
    if (this.onGround && this.hopT <= 0) {
      this.hopT = 0.9;
      this.vy = 7;
      this.onGround = false;
    }
    if (!this.onGround) super.ai(dt);
    else this.moving = 0;
  }
  animate() {
    const s = this.onGround ? 1 - Math.max(0, 0.2 - (0.9 - this.hopT)) : 1.1;
    this.rig.body.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
  }
}

export class Crab extends Enemy {
  constructor(level, x, z, o = {}) {
    super(level, x, z, { model: makeCrab(false), speed: 3, radius: 0.75, height: 0.9, ...o });
    this.popColor = [1, 0.5, 0.4];
  }
  animate() {
    const r = this.rig;
    r.claws.forEach((c, i) => { c.rotation.x = Math.sin(this.t * 6 + i) * 0.3 - 0.2; });
    r.body.rotation.z = Math.sin(this.t * 12) * 0.08 * (this.moving ? 1 : 0.2);
    this.obj.rotation.y = this.facing + Math.PI / 2; // seitwärts laufen
  }
}

export class FogImp extends Enemy {
  constructor(level, x, y, z, o = {}) {
    super(level, x, z, { model: makeFogImp(), speed: 3.2, radius: 0.6, height: 1, chase: 30, wander: 30, y, ...o });
    this.flying = true;
    this.popColor = [0.8, 0.8, 0.9];
  }
  ai(dt) {
    const p = this.player.pos;
    const tx = p.x - this.pos.x, tz = p.z - this.pos.z;
    const d = Math.hypot(tx, tz);
    if (d > 0.5) {
      this.facing = dampAngle(this.facing, Math.atan2(tx, tz), 3, dt);
      this.pos.x += Math.sin(this.facing) * this.speed * dt;
      this.pos.z += Math.cos(this.facing) * this.speed * dt;
    }
    this.pos.y = damp(this.pos.y, p.y + 0.4 + Math.sin(this.t * 3) * 0.3, 2, dt);
    this.moving = 1;
    if (Math.random() < dt * 5) this.game.particles.emit('fog', this.pos.x, this.pos.y, this.pos.z, 1);
  }
  animate() {
    this.rig.body.rotation.z = Math.sin(this.t * 4) * 0.2;
  }
}

// ---------- Welt-Tor ----------
export function signTexture(lines, color = '#ffe28a') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#3d2412';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 118);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '38px LuckiestGuy, Impact, sans-serif';
  ctx.fillText(lines[0], 128, lines[1] ? 44 : 64);
  if (lines[1]) {
    ctx.font = '30px LuckiestGuy, Impact, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lines[1], 128, 92);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Portal extends Entity {
  constructor(level, x, z, { rot = 0, to, spawn = 'start', need = 0, label = '', y, color = 0x9a6bff } = {}) {
    super(level, x, y ?? level.world.terrainHeight(x, z), z);
    this.to = to;
    this.spawn = spawn;
    this.need = need;
    this.rot = rot;
    const g = new THREE.Group();
    const stone = mat(0x9a9488, { flat: true });
    for (const s of [-1, 1]) {
      part(g, G.box(0.9, 4.2, 0.9), stone, s * 1.9, 0, 0);
      level.world.addBox({ x: x + Math.cos(rot) * s * 1.9, z: z - Math.sin(rot) * s * 1.9, y: this.pos.y, w: 0.9, h: 4.2, d: 0.9, rot });
    }
    part(g, G.box(4.8, 0.9, 1.1), stone, 0, 4.1, 0);
    level.world.addBox({ x, z, y: this.pos.y + 4.1, w: 4.8, h: 0.9, d: 1.1, rot });
    part(g, G.cyl(0.35, 0.35, 0.3, 8), mat(0xffc93a, { emissive: 0x664400 }), 0, 4.4, 0.5, Math.PI / 2, 0, 0);
    this.swirl = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20), new THREE.MeshBasicMaterial({
      map: this.game.tex.portal, color, transparent: true, opacity: 0.92, side: THREE.DoubleSide,
    }));
    this.swirl.position.y = 2.1;
    this.swirl.scale.y = 1.35;
    g.add(this.swirl);
    this.door = new THREE.Group();
    part(this.door, G.box(3, 4.1, 0.25), mat(0x7a5230), 0, 0, 0);
    for (let i = 0; i < 3; i++) part(this.door, G.box(3.1, 0.3, 0.35), mat(0x4a2e14), 0, 0.8 + i * 1.2, 0);
    part(this.door, G.torus(0.3, 0.08, 4, 10), mat(0xbdbdbd), 0, 2, 0.25);
    g.add(this.door);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({
      map: signTexture([label, need ? `${need} Splitter` : '']),
    }));
    sign.position.set(0, 5.35, 0.3);
    g.add(sign);
    const signBack = sign.clone();
    signBack.rotation.y = Math.PI;
    signBack.position.z = -0.3;
    g.add(signBack);
    g.rotation.y = rot;
    this.setObj(g);
    this.doorCol = level.world.addBox({ x, z, y: this.pos.y, w: 3, h: 4, d: 0.4, rot });
    this.msgCool = 0;
    this.refresh();
  }
  get open() {
    return this.game.save.totalShards() >= this.need;
  }
  refresh() {
    const open = this.open;
    this.swirl.visible = open;
    this.door.visible = !open;
    this.doorCol.enabled = !open;
  }
  update(dt) {
    this.t += dt;
    this.swirl.rotation.z = -this.t * 1.5;
    this.msgCool -= dt;
    if (this.door.visible && this.open) this.refresh();
    const p = this.player.pos;
    // lokale Koordinaten relativ zum Tor
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    const c = Math.cos(this.rot), s = Math.sin(this.rot);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (this.open) {
      if (Math.abs(lx) < 1.4 && Math.abs(lz) < 0.6 && p.y < this.pos.y + 3 && !this.game.transitioning) {
        this.game.audio.play('portal');
        this.game.enterLevel(this.to, this.spawn);
      }
    } else if (Math.abs(lx) < 2.5 && Math.abs(lz) < 2.2 && this.msgCool <= 0 && !this.game.cinematic) {
      this.msgCool = 8;
      const have = this.game.save.totalShards();
      this.game.dialog.say([{ who: 'kiki', text: `Verschlossen! Für dieses Tor brauchen wir ${this.need} Sonnensplitter. Wir haben erst ${have}.` }]);
    }
  }
}

// ---------- Trigger ----------
export class Trigger extends Entity {
  constructor(level, x, y, z, { r = 3, h = 4, once = true, onEnter, cond }) {
    super(level, x, y, z);
    this.r = r;
    this.h = h;
    this.once = once;
    this.onEnter = onEnter;
    this.cond = cond;
    this.inside = false;
  }
  update() {
    const p = this.player.pos;
    const inside = Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < this.r && p.y > this.pos.y - 1 && p.y < this.pos.y + this.h;
    if (inside && !this.inside && !this.game.cinematic && (!this.cond || this.cond())) {
      this.onEnter(this.game, this);
      if (this.once) this.alive = false;
    }
    this.inside = inside;
  }
}

// ---------- Bewegliche Plattform ----------
export class Platform extends Entity {
  // path(t) => {x, y, z, rot}
  constructor(level, { w = 3, h = 0.6, d = 3, r, color = 0x9b6b3d, tex = 'wood', path, shape = 'box', mesh }) {
    const p0 = path(0);
    super(level, p0.x, p0.y, p0.z);
    this.path = path;
    const m = mat(color, { map: level.game.tex[tex] });
    let obj = mesh;
    if (!obj) {
      if (shape === 'cyl') obj = new THREE.Mesh(G.cyl(r, r * 0.9, h, 14), m);
      else obj = new THREE.Mesh(G.box(w, h, d), m);
      obj.geometry.translate(0, -h, 0);
    }
    this.setObj(obj);
    this.col = shape === 'cyl'
      ? level.world.addCyl({ x: p0.x, z: p0.z, y: p0.y - h, r, h })
      : level.world.addBox({ x: p0.x, z: p0.z, y: p0.y - h, w, h, d, rot: p0.rot ?? 0 });
    this.h = h;
    this.time = 0;
  }
  update(dt) {
    this.time += dt;
    const p = this.path(this.time);
    this.pos.set(p.x, p.y, p.z);
    this.col.moveTo(p.x, p.y - this.h, p.z, p.rot);
    this.obj.position.copy(this.pos);
    if (p.rot != null) this.obj.rotation.y = p.rot;
  }
}

// ---------- Zerbrechliches (mit Stampfer) ----------
export class Breakable extends Entity {
  constructor(level, x, y, z, { w = 2, h = 1, d = 2, color = 0x8f8a80, tex = 'rock', onBreak, cracked = true, needPound = true }) {
    super(level, x, y, z);
    const g = new THREE.Group();
    part(g, G.box(w, h, d), mat(color, { map: level.game.tex[tex] }));
    if (cracked) {
      const cm = mat(0x2b2620);
      part(g, G.box(w * 0.7, 0.03, 0.06), cm, 0, h + 0.01, 0, 0, 0.5, 0);
      part(g, G.box(w * 0.4, 0.03, 0.06), cm, w * 0.12, h + 0.01, d * 0.1, 0, -0.7, 0);
      part(g, G.box(w * 0.3, 0.03, 0.06), cm, -w * 0.15, h + 0.01, -d * 0.12, 0, 1.3, 0);
    }
    this.setObj(g);
    this.col = level.world.addBox({ x, z, y, w, h, d });
    this.col.onLand = (pl, kind) => {
      if (kind === 'pound' || !needPound) this.break();
      else if (kind === 'land' && !this.hinted) {
        this.hinted = true;
        if (!this.game.save.data.moves.pound) this.game.toast('Der Stein ist rissig ... Vielleicht mit mehr Wucht?');
      }
    };
    this.onBreak = onBreak;
    this.dims = [w, h, d];
  }
  break() {
    if (!this.alive) return;
    this.level.world.remove(this.col);
    this.remove();
    this.game.audio.play('shatter');
    this.game.renderer.shake = 0.6;
    this.game.particles.emit('pop', this.pos.x, this.pos.y + 0.5, this.pos.z, 16, [0.7, 0.65, 0.6]);
    this.onBreak?.(this);
  }
}

// ---------- Stampf-Schalter / X-Markierung ----------
export class PoundSpot extends Entity {
  constructor(level, x, z, { kind = 'x', onPound, y } = {}) {
    super(level, x, y ?? level.world.terrainHeight(x, z), z);
    const g = new THREE.Group();
    if (kind === 'x') {
      const m = mat(0xc0392b);
      part(g, G.box(1.8, 0.05, 0.35), m, 0, 0.03, 0, 0, Math.PI / 4, 0);
      part(g, G.box(1.8, 0.05, 0.35), m, 0, 0.03, 0, 0, -Math.PI / 4, 0);
    } else {
      part(g, G.cyl(1.1, 1.2, 0.2, 14), mat(0x777777), 0, 0, 0);
      this.button = part(g, G.cyl(0.8, 0.8, 0.3, 14), mat(0xe8b830, { emissive: 0x442200 }), 0, 0.2, 0);
    }
    this.setObj(g);
    this.kind = kind;
    this.onPound = onPound;
    this.done = false;
  }
  update() {
    const p = this.player;
    if (!this.done && p.state === 'poundland' && p.stateT < 0.05 && this.distPlayer() < 1.6 && Math.abs(p.pos.y - this.pos.y) < 1) {
      this.done = true;
      if (this.button) this.button.position.y = 0.02;
      this.game.audio.play(this.kind === 'x' ? 'chest' : 'switch');
      this.game.particles.emit('sparkle', this.pos.x, this.pos.y + 0.5, this.pos.z, 20);
      if (this.kind === 'x') this.obj.visible = false;
      this.onPound?.(this);
    }
  }
}

// ---------- Hüpf-Pilz ----------
export class Bouncer extends Entity {
  constructor(level, x, z, { y, r = 1.6, h = 2.5, power = 20, color = 0xe23b3b } = {}) {
    super(level, x, y ?? level.world.terrainHeight(x, z), z);
    const g = new THREE.Group();
    part(g, G.cyl(r * 0.35, r * 0.45, h, 10), mat(0xf3e6c8), 0, 0, 0);
    this.cap = new THREE.Group();
    this.cap.position.y = h;
    g.add(this.cap);
    const capMesh = part(this.cap, G.hemi(r, 14, 6), mat(color, { map: level.game.tex.mushroom }), 0, -0.15, 0, 0, 0, 0, [1, 0.55, 1]);
    capMesh.geometry = capMesh.geometry.clone();
    this.setObj(g);
    level.world.addCyl({ x, z, y: this.pos.y, r: r * 0.4, h });
    this.col = level.world.addCyl({ x, z, y: this.pos.y + h - 0.2, r, h: 0.5, bounce: power });
    this.col.onLand = () => { this.squish = 1; };
    this.squish = 0;
  }
  update(dt) {
    this.squish = damp(this.squish, 0, 6, dt);
    const s = Math.sin(this.squish * Math.PI * 3) * this.squish * 0.35;
    this.cap.scale.set(1 + s, 1 - s, 1 + s);
  }
}

// ---------- Folgender NPC (z.B. verlorenes Igelkind) ----------
export class Follower extends NPC {
  constructor(level, model, x, y, z, o) {
    super(level, model, x, y, z, o);
    this.following = false;
    this.hop = 0;
  }
  update(dt) {
    if (!this.following) return super.update(dt);
    this.t += dt;
    const p = this.player.pos, w = this.level.world;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d > 2.2) {
      const sp = Math.min(10, d * 2.2);
      const nx = this.pos.x + (dx / d) * sp * dt, nz = this.pos.z + (dz / d) * sp * dt;
      const g = w.ground(nx, nz, this.pos.y + 3).y;
      if (w.waterAt(nx, nz) < g + 0.2) {
        this.pos.x = nx;
        this.pos.z = nz;
        this.pos.y = damp(this.pos.y, g, 12, dt);
      }
      this.hop += dt * 12;
    }
    // Falls Abstand zu groß (z.B. Spieler hochgesprungen): hinterher-teleportieren
    if (d > 14 || Math.abs(p.y - this.pos.y) > 6) {
      if (this.player.onGround) {
        this.pos.set(p.x - Math.sin(this.player.facing) * 1.5, p.y, p.z - Math.cos(this.player.facing) * 1.5);
        this.game.particles.emit('dust', this.pos.x, this.pos.y, this.pos.z, 5);
      }
    }
    this.obj.position.copy(this.pos);
    this.obj.position.y += Math.abs(Math.sin(this.hop)) * 0.2;
    this.obj.rotation.y = Math.atan2(dx, dz);
    this.shadow.update(this.pos.x, this.pos.y, this.pos.z);
    this.onFollow?.(this, dt);
  }
}
