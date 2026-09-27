// Bruno & Kiki: Steuerung, Physik und Animation.
import * as THREE from 'three';
import { makeBruno } from './models.js';
import { mergeStatic } from '../engine/geo.js';
import { B } from '../engine/input.js';
import { clamp, damp, dampAngle, lerp } from '../engine/util.js';

const GRAV = 34;
const RUN = 9;
const STEP = 0.5;
const JUMP_V = 12.5;
const HIGH_V = 18;

const SHOULDER = new THREE.Vector3(0.44, 1.5, -0.1);
const ABOVE = new THREE.Vector3(0, 2.45, 0.05);

export class Player {
  constructor(game) {
    this.game = game;
    this.model = mergeStatic(makeBruno());
    this.rig = this.model.userData.rig;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.facing = 0;
    this.radius = 0.5;
    this.height = 1.8;
    this.state = 'idle';
    this.stateT = 0;
    this.onGround = true;
    this.groundCol = null;
    this.coyote = 0;
    this.health = 5;
    this.maxHealth = 5;
    this.invuln = 0;
    this.canFlutter = true;
    this.canPeck = true;
    this.jumpCut = false;
    this.crouchLinger = 0;
    this.rollCool = 0;
    this.swimming = false;
    this.diving = false;
    this.air = 1;
    this.airHurtT = 0;
    this.lastSafe = new THREE.Vector3();
    this.safeT = 0;
    this.walkPhase = 0;
    this.t = 0;
    this.kikiUp = 0;
    this.blinkT = 2;
    this.squash = 0;
    this.control = true;
    this.speedH = 0;
    this.attack = { active: false, kind: null, x: 0, y: 0, z: 0, r: 0 };
    this.fallStartY = 0;
    this.hintedDive = false;
  }

  get moves() {
    return this.game.save.data.moves;
  }

  spawn(x, y, z, facing = 0) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.facing = facing;
    this.setState('idle');
    this.onGround = false;
    this.swimming = this.diving = false;
    this.air = 1;
    this.invuln = 0;
    this.lastSafe.set(x, y, z);
    this.model.visible = true;
    this.model.rotation.set(0, facing, 0);
    this.model.position.copy(this.pos);
  }

  setState(s) {
    this.state = s;
    this.stateT = 0;
  }

  // ---------- Schaden & Tod ----------
  hurt(from, dmg = 1) {
    if (this.invuln > 0 || this.state === 'dead' || this.game.cinematic) return false;
    this.health = Math.max(0, this.health - dmg);
    this.game.audio.play('hurt');
    this.game.input.rumble(220, 0.8);
    this.game.hud.setHealth(this.health, this.maxHealth);
    if (this.health <= 0) {
      this.die();
      return true;
    }
    this.invuln = 1.8;
    const dx = this.pos.x - (from?.x ?? this.pos.x), dz = this.pos.z - (from?.z ?? this.pos.z);
    const d = Math.hypot(dx, dz) || 1;
    if (!this.swimming && !this.diving) {
      this.vel.set((dx / d) * 7, 8, (dz / d) * 7);
      this.onGround = false;
      this.setState('hurt');
    }
    return true;
  }

  die() {
    this.setState('dead');
    this.vel.set(0, 10, 0);
    this.onGround = false;
    this.game.audio.play('hurt');
    this.game.onPlayerDeath();
  }

  heal(n = 1) {
    this.health = Math.min(this.maxHealth, this.health + n);
    this.game.hud.setHealth(this.health, this.maxHealth);
  }

  bounce(v = 11) {
    this.vel.y = v;
    this.onGround = false;
    this.canFlutter = true;
    this.canPeck = true;
    this.jumpCut = true;
    this.setState('jump');
  }

  attackHits(p, r, dy = 1.2) {
    const a = this.attack;
    if (!a.active) return false;
    const dx = p.x - a.x, dz = p.z - a.z;
    return dx * dx + dz * dz < (r + a.r) * (r + a.r) && Math.abs(p.y + dy * 0.5 - a.y) < dy + a.r;
  }

  // ---------- Haupt-Update ----------
  update(dt, input) {
    const game = this.game, world = game.level.world;
    this.t += dt;
    this.stateT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.rollCool = Math.max(0, this.rollCool - dt);
    this.crouchLinger = Math.max(0, this.crouchLinger - dt);
    this.coyote = Math.max(0, this.coyote - dt);

    const ctl = this.control && !game.cinematic && this.state !== 'dead' && this.state !== 'dance';
    const held = (b) => ctl && input.isHeld(b);
    const pressed = (b) => ctl && input.pressed(b);

    // Wunschrichtung relativ zur Kamera
    let mx = ctl ? input.moveX : 0, my = ctl ? input.moveY : 0;
    const yaw = game.camRig.yaw;
    let wx = -Math.sin(yaw) * my + Math.cos(yaw) * mx;
    let wz = -Math.cos(yaw) * my - Math.sin(yaw) * mx;
    let wl = Math.hypot(wx, wz);
    if (wl > 1) { wx /= wl; wz /= wl; wl = 1; }
    if (wl < 0.05) { wx = wz = 0; wl = 0; }
    if (this.moveOverride) {
      ({ x: wx, z: wz } = this.moveOverride);
      wl = Math.hypot(wx, wz);
    }

    if (held(B.CROUCH)) this.crouchLinger = 0.22;

    // Mitfahren auf beweglichen Plattformen
    const gc = this.groundCol;
    if (this.onGround && gc && (gc.dx || gc.dy || gc.dz || gc.drot)) {
      if (gc.drot) {
        const rx = this.pos.x - gc.cx, rz = this.pos.z - gc.cz;
        const c = Math.cos(-gc.drot), s = Math.sin(-gc.drot);
        this.pos.x = gc.cx + rx * c - rz * s;
        this.pos.z = gc.cz + rx * s + rz * c;
        this.facing += gc.drot;
      }
      this.pos.x += gc.dx;
      this.pos.y += gc.dy;
      this.pos.z += gc.dz;
    }

    const waterY = world.waterAt(this.pos.x, this.pos.z);
    const wasSwim = this.swimming || this.diving;
    this.attack.active = false;

    if (this.state === 'dead') {
      this.vel.y -= GRAV * dt;
      this.pos.addScaledVector(this.vel, dt);
      const gy = world.ground(this.pos.x, this.pos.z, this.pos.y + 1).y;
      if (this.pos.y < gy) { this.pos.y = gy; this.vel.set(0, 0, 0); }
      this.animate(dt);
      return;
    }

    // Wasser betreten?
    if (!this.diving && this.pos.y < waterY - 1.0 && this.state !== 'hurt') {
      if (!this.swimming) {
        game.audio.play('splash');
        game.particles.emit('splash', this.pos.x, waterY, this.pos.z, 14);
        this.setState('swim');
      }
      this.swimming = true;
    }
    if (this.swimming && this.pos.y > waterY - 0.6) this.swimming = false;

    if (this.diving) this.updateDive(dt, wx, wz, wl, held, pressed, waterY);
    else if (this.swimming) this.updateSwim(dt, wx, wz, wl, held, pressed, waterY);
    else this.updateLand(dt, wx, wz, wl, held, pressed);

    if (!this.diving) {
      this.air = Math.min(1, this.air + dt * 0.5);
      this.airHurtT = 0;
    }

    // ---------- Integration & Kollision ----------
    const ox = this.pos.x, oz = this.pos.z;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.terrainBlock(world, ox, oz);
    world.pushOut(this.pos, this.radius, this.height, STEP);

    const oldHead = this.pos.y + this.height;
    if (!this.swimming && !this.diving) {
      if (!(this.state === 'pound' && this.stateT < 0.22) && this.state !== 'flutter') {
        this.vel.y = Math.max(-32, this.vel.y - GRAV * dt);
      }
    }
    this.pos.y += this.vel.y * dt;

    if (this.vel.y > 0) {
      const cy = world.ceiling(this.pos.x, this.pos.z, oldHead, this.pos.y + this.height);
      if (cy < Infinity) {
        this.pos.y = cy - this.height;
        this.vel.y = 0;
      }
    }

    const wasGround = this.onGround;
    const probe = this.vel.y <= 0 ? this.pos.y + STEP : this.pos.y + 0.05;
    const g = world.ground(this.pos.x, this.pos.z, probe);
    const snap = wasGround && this.vel.y <= 0 && !this.swimming ? 0.6 : 0;
    if (this.diving) {
      if (this.pos.y < g.y) { this.pos.y = g.y; if (this.vel.y < 0) this.vel.y = 0; }
      this.onGround = false;
      this.groundCol = null;
    } else if (this.vel.y <= 0 && this.pos.y <= g.y + snap) {
      this.pos.y = g.y;
      const impact = -this.vel.y;
      this.vel.y = 0;
      this.onGround = true;
      this.groundCol = g.col;
      this.coyote = 0.12;
      if (!wasGround) this.land(g.col, impact);
    } else {
      if (wasGround && this.vel.y <= 0 && this.state !== 'swim') this.fallStartY = this.pos.y;
      this.onGround = false;
      this.groundCol = null;
    }

    // Gefahrenzonen (z.B. Giftsumpf)
    const hz = game.level.hazardAt?.(this.pos.x, this.pos.y, this.pos.z);

    // Sicherer Punkt zum Wiederbeleben
    if (this.onGround && !hz && !this.swimming && (!this.groundCol || !this.groundCol.dx) && this.state !== 'hurt') {
      this.safeT += dt;
      if (this.safeT > 0.4 && world.terrainHeight(this.pos.x, this.pos.z) > waterY - 0.8 && !this.groundCol?.hazard) {
        this.lastSafe.copy(this.pos);
        this.safeT = 0;
      }
    } else if (!this.onGround) this.safeT = 0;

    if ((hz || (this.onGround && this.groundCol?.hazard)) && this.invuln <= 0) {
      // Autsch – zurück ans sichere Ufer
      if (this.hurt(this.pos) && this.health > 0) game.returnToSafe();
    }

    // In den Abgrund gefallen
    if (this.pos.y < game.level.killY) game.onPlayerFall();

    if (wasSwim && !this.swimming && !this.diving && this.state === 'swim') this.setState('idle');
    this.speedH = Math.hypot(this.vel.x, this.vel.z);
    this.animate(dt);
  }

  terrainBlock(world, ox, oz) {
    const lim = this.pos.y + STEP;
    const h = world.terrainHeight(this.pos.x, this.pos.z);
    const h0 = world.terrainHeight(ox, oz);
    const d = Math.hypot(this.pos.x - ox, this.pos.z - oz) || 1e-6;
    const tooSteep = (hh, dist) => hh > lim || (this.onGround && !this.groundCol && hh > this.pos.y + 0.05 && (hh - h0) / dist > 1.5);
    if (!tooSteep(h, d)) return;
    const nx = this.pos.x, nz = this.pos.z;
    // an der Wand entlang rutschen
    if (!tooSteep(world.terrainHeight(nx, oz), Math.abs(nx - ox) || 1e-6)) { this.pos.z = oz; return; }
    if (!tooSteep(world.terrainHeight(ox, nz), Math.abs(nz - oz) || 1e-6)) { this.pos.x = ox; return; }
    this.pos.x = ox;
    this.pos.z = oz;
  }

  land(col, impact) {
    const game = this.game;
    this.canFlutter = true;
    this.canPeck = true;
    this.jumpCut = false;
    if (col?.bounce) {
      this.vel.y = col.bounce;
      this.onGround = false;
      this.groundCol = null;
      this.setState('jump');
      this.jumpCut = true;
      game.audio.play('boing');
      col.onLand?.(this, 'bounce');
      return;
    }
    if (this.state === 'pound') {
      this.setState('poundland');
      game.audio.play('pound');
      game.renderer.shake = 0.8;
      game.input.rumble(200, 1);
      game.particles.emit('ring', this.pos.x, this.pos.y, this.pos.z, 16);
      this.attack = { active: true, kind: 'pound', x: this.pos.x, y: this.pos.y + 0.5, z: this.pos.z, r: 2.4 };
      col?.onLand?.(this, 'pound');
      game.level.onPound?.(this.pos);
      return;
    }
    col?.onLand?.(this, 'land');
    if (impact > 8) {
      game.audio.play('land');
      game.particles.emit('dust', this.pos.x, this.pos.y, this.pos.z, 5);
      this.squash = Math.min(0.35, impact / 60);
    }
    if (this.state !== 'roll') this.setState(this.speedH > 0.5 ? 'run' : 'idle');
  }

  // ---------- Land & Luft ----------
  updateLand(dt, wx, wz, wl, held, pressed) {
    const game = this.game;
    const s = this.state;
    const inAir = !this.onGround;

    // Reden statt Angreifen, wenn jemand in der Nähe ist
    if (pressed(B.ATTACK) && game.prompt && this.onGround && s !== 'roll') {
      game.interact();
      return;
    }

    if (s === 'hurt') {
      if (this.stateT > 0.45 && this.onGround) this.setState('idle');
      this.vel.x = damp(this.vel.x, 0, 2, dt);
      this.vel.z = damp(this.vel.z, 0, 2, dt);
      return;
    }
    if (s === 'dance') {
      this.vel.x = this.vel.z = 0;
      return;
    }
    if (s === 'poundland') {
      this.vel.x = this.vel.z = 0;
      if (this.stateT > 0.3) this.setState('idle');
      if (this.stateT < 0.1) this.attack.active = true;
      return;
    }

    if (!inAir) {
      // --- am Boden ---
      if (pressed(B.JUMP) || (this.bufferJump > 0)) {
        this.bufferJump = 0;
        const crouched = s === 'crouch' || this.crouchLinger > 0;
        if (crouched && this.moves.highjump) {
          this.vel.y = HIGH_V;
          this.vel.x *= 0.3;
          this.vel.z *= 0.3;
          this.setState('highjump');
          game.audio.play('highjump');
          game.particles.emit('dust', this.pos.x, this.pos.y, this.pos.z, 8);
        } else {
          this.vel.y = JUMP_V + Math.min(1.5, this.speedH * 0.1);
          this.setState(s === 'roll' ? 'longjump' : 'jump');
          game.audio.play('jump');
        }
        this.onGround = false;
        this.groundCol = null;
        this.jumpCut = false;
        return;
      }
      if (pressed(B.ATTACK) && this.rollCool <= 0 && s !== 'roll') {
        this.setState('roll');
        this.rollCool = 0.65;
        if (wl > 0.1) this.facing = Math.atan2(wx, wz);
        game.audio.play('roll');
      }
      if (this.state === 'roll') {
        const sp = this.stateT < 0.42 ? 13 : 4;
        if (wl > 0.1) this.facing = dampAngle(this.facing, Math.atan2(wx, wz), 4, dt);
        this.vel.x = Math.sin(this.facing) * sp;
        this.vel.z = Math.cos(this.facing) * sp;
        this.attack = { active: this.stateT < 0.45, kind: 'roll', x: this.pos.x + Math.sin(this.facing) * 0.4, y: this.pos.y + 0.6, z: this.pos.z + Math.cos(this.facing) * 0.4, r: 0.9 };
        if (this.stateT > 0.5) this.setState(wl > 0.1 ? 'run' : 'idle');
        if (Math.random() < 0.3) game.particles.emit('dust', this.pos.x, this.pos.y, this.pos.z, 1);
        return;
      }
      const crouch = held(B.CROUCH);
      if (crouch && s !== 'crouch') this.setState('crouch');
      if (!crouch && s === 'crouch') this.setState('idle');
      const max = (this.state === 'crouch' ? 2.5 : RUN) * wl;
      this.accelerate(dt, wx, wz, wl, max, wl > 0 ? 55 : 40);
      if (wl > 0.1) this.facing = dampAngle(this.facing, Math.atan2(wx, wz), 14, dt);
      if (this.state !== 'crouch') this.state = this.speedH > 0.6 ? 'run' : 'idle';

      // zu steil? runterrutschen
      if (!this.groundCol) {
        const w = game.level.world;
        const sl = w.terrain?.slopeAt(this.pos.x, this.pos.z) ?? 0;
        if (sl > 1.25) {
          const e = 0.5;
          const gx = w.terrainHeight(this.pos.x + e, this.pos.z) - w.terrainHeight(this.pos.x - e, this.pos.z);
          const gz = w.terrainHeight(this.pos.x, this.pos.z + e) - w.terrainHeight(this.pos.x, this.pos.z - e);
          this.vel.x -= gx * 18 * dt;
          this.vel.z -= gz * 18 * dt;
        }
      }
      return;
    }

    // --- in der Luft ---
    if (this.coyote > 0 && pressed(B.JUMP) && s !== 'jump' && s !== 'highjump' && s !== 'flutter') {
      this.vel.y = JUMP_V;
      this.setState('jump');
      game.audio.play('jump');
      return;
    }
    if (s === 'fall' && pressed(B.JUMP)) this.bufferJump = 0.12;
    this.bufferJump = Math.max(0, (this.bufferJump || 0) - dt);

    if ((s === 'jump' || s === 'longjump') && !held(B.JUMP) && this.vel.y > 3 && !this.jumpCut) {
      this.vel.y *= 0.5;
      this.jumpCut = true;
    }

    // Flattersprung mit Kiki
    if (pressed(B.JUMP) && this.canFlutter && ['jump', 'fall', 'highjump', 'longjump', 'peck'].includes(s) && this.vel.y < 6) {
      this.canFlutter = false;
      this.bufferJump = 0;
      this.setState('flutter');
      game.audio.play('flutter');
    }
    if (this.state === 'flutter') {
      if (!held(B.JUMP) || this.stateT > 1.15) this.setState('fall');
      else {
        const target = this.stateT < 0.55 ? 3.4 : 0.6;
        this.vel.y += (target - this.vel.y) * Math.min(1, dt * 9);
        if (Math.floor(this.stateT * 10) !== Math.floor((this.stateT - dt) * 10) && this.stateT > 0.5) game.audio.play('flutter');
        if (Math.random() < 0.3) game.particles.emit('feather', this.pos.x, this.pos.y + 2.4, this.pos.z, 1);
      }
    }

    // Schnabel-Attacke in der Luft
    if (pressed(B.ATTACK) && this.canPeck && s !== 'pound') {
      this.canPeck = false;
      this.setState('peck');
      this.vel.y = Math.max(this.vel.y, 3);
      game.audio.play('peck');
    }
    if (this.state === 'peck') {
      this.vel.y = Math.max(this.vel.y, this.stateT < 0.35 ? 0.5 : this.vel.y);
      this.attack = { active: this.stateT < 0.4, kind: 'peck', x: this.pos.x + Math.sin(this.facing) * 0.9, y: this.pos.y + 0.9, z: this.pos.z + Math.cos(this.facing) * 0.9, r: 1.1 };
      if (this.stateT > 0.4) this.setState('fall');
    }

    // Stampfer
    if (pressed(B.CROUCH) && this.moves.pound && this.state !== 'pound') {
      this.setState('pound');
      this.vel.set(0, 0, 0);
      game.audio.play('poundStart');
    }
    if (this.state === 'pound') {
      if (this.stateT >= 0.22) this.vel.y = -34;
      this.vel.x = this.vel.z = 0;
      this.attack = { active: this.stateT >= 0.22, kind: 'pound', x: this.pos.x, y: this.pos.y + 0.2, z: this.pos.z, r: 0.9 };
      return;
    }

    const airMax = this.state === 'flutter' ? 6 : this.state === 'longjump' ? 11 : 8.5;
    this.accelerate(dt, wx, wz, wl, airMax * wl, this.state === 'longjump' ? 10 : 22);
    if (wl > 0.1) this.facing = dampAngle(this.facing, Math.atan2(wx, wz), 7, dt);
    if (['jump', 'highjump', 'longjump'].includes(this.state) && this.vel.y < -2) this.state = this.state === 'longjump' ? 'longjump' : 'fall';
    if (this.state === 'idle' || this.state === 'run' || this.state === 'crouch' || this.state === 'roll') this.state = 'fall';
  }

  accelerate(dt, wx, wz, wl, max, accel) {
    const tx = wx * (wl > 0 ? max / wl : 0), tz = wz * (wl > 0 ? max / wl : 0);
    const dx = tx - this.vel.x, dz = tz - this.vel.z;
    const d = Math.hypot(dx, dz);
    const step = accel * dt;
    if (d <= step) { this.vel.x = tx; this.vel.z = tz; }
    else { this.vel.x += (dx / d) * step; this.vel.z += (dz / d) * step; }
  }

  // ---------- Schwimmen ----------
  updateSwim(dt, wx, wz, wl, held, pressed, waterY) {
    const game = this.game;
    if (this.state !== 'swim' && this.state !== 'hurt') this.setState('swim');
    const surf = waterY - 1.05;
    this.vel.y = damp(this.vel.y, (surf - this.pos.y) * 6, 8, dt);
    this.accelerate(dt, wx, wz, wl, 5.5 * wl, 14);
    if (wl > 0.1) this.facing = dampAngle(this.facing, Math.atan2(wx, wz), 6, dt);
    if (wl > 0.3 && Math.random() < dt * 6) game.particles.emit('splash', this.pos.x, waterY, this.pos.z, 1);
    if (pressed(B.JUMP)) {
      this.swimming = false;
      this.vel.y = 11;
      this.pos.y = Math.max(this.pos.y, surf + 0.1);
      this.setState('jump');
      this.jumpCut = true;
      game.audio.play('jump');
      game.particles.emit('splash', this.pos.x, waterY, this.pos.z, 8);
      return;
    }
    if (pressed(B.CROUCH) || pressed(B.ATTACK)) {
      if (this.moves.dive) {
        this.diving = true;
        this.swimming = false;
        this.setState('dive');
        this.vel.y = -5;
        game.audio.play('splash');
      } else if (!this.hintedDive) {
        this.hintedDive = true;
        game.toast('Tauchen hast du noch nicht gelernt!');
      }
    }
  }

  updateDive(dt, wx, wz, wl, held, pressed, waterY) {
    const game = this.game;
    let vy = 0.6;
    if (held(B.JUMP)) vy = 5;
    if (held(B.CROUCH) || held(B.ATTACK)) vy = -5;
    this.vel.y = damp(this.vel.y, vy, 4, dt);
    this.accelerate(dt, wx, wz, wl, 5.5 * wl, 10);
    if (wl > 0.1) this.facing = dampAngle(this.facing, Math.atan2(wx, wz), 5, dt);
    this.air -= dt / 14;
    if (Math.random() < dt * 2) {
      game.particles.emit('bubble', this.pos.x, this.pos.y + 1.4, this.pos.z, 2);
      game.audio.play('bubble');
    }
    if (this.air <= 0) {
      this.air = 0;
      this.airHurtT -= dt;
      if (this.airHurtT <= 0) {
        this.airHurtT = 1.5;
        this.invuln = 0;
        this.hurt(null);
      }
    }
    if (this.pos.y > waterY - 1.0 && this.vel.y > 0) {
      this.diving = false;
      this.swimming = true;
      this.setState('swim');
      game.particles.emit('splash', this.pos.x, waterY, this.pos.z, 8);
    }
    if (this.pos.y > waterY + 0.2) {
      this.diving = false;
    }
  }

  // ---------- Animation ----------
  animate(dt) {
    const r = this.rig, m = this.model, s = this.state, t = this.t;
    m.position.copy(this.pos);
    m.rotation.y = this.facing;
    const sp = this.speedH;

    let legA = 0, armA = 0, armSpread = 0.15, bodyPitch = 0, hipsY = 0.72, bodyRoll = 0, armUp = 0;
    let kikiTarget = 0, kikiFlap = 0, pitchAll = 0, spinY = 0;

    if (s === 'run') {
      this.walkPhase += dt * (4 + sp * 1.15);
      const k = Math.min(1, sp / RUN);
      legA = Math.sin(this.walkPhase) * 0.95 * k;
      armA = -legA * 0.8;
      hipsY += Math.abs(Math.cos(this.walkPhase)) * 0.09 * k;
      bodyPitch = 0.12 * k;
      bodyRoll = Math.sin(this.walkPhase) * 0.05 * k;
    } else if (s === 'idle') {
      hipsY += Math.sin(t * 2.2) * 0.012;
      armA = Math.sin(t * 2.2) * 0.04;
    } else if (s === 'crouch') {
      hipsY = 0.5;
      bodyPitch = 0.35;
      legA = 0.3;
      this.walkPhase += dt * sp * 2;
      legA += Math.sin(this.walkPhase) * 0.3 * Math.min(1, sp);
    } else if (s === 'jump' || s === 'highjump' || s === 'longjump') {
      legA = 0.5;
      armUp = s === 'highjump' ? 2.6 : 1.3;
      armSpread = 0.5;
      bodyPitch = s === 'longjump' ? 0.5 : -0.1;
    } else if (s === 'fall' || s === 'hurt') {
      legA = -0.3;
      armUp = 1.9 + Math.sin(t * 20) * (s === 'hurt' ? 0.6 : 0.1);
      armSpread = 0.9;
      bodyPitch = s === 'hurt' ? -0.4 : 0.05;
    } else if (s === 'flutter') {
      kikiTarget = 1;
      kikiFlap = 1;
      armUp = 2.9;
      armSpread = 0.15;
      legA = Math.sin(t * 16) * 0.5;
    } else if (s === 'roll') {
      hipsY = 0.62;
      pitchAll = Math.min(1, this.stateT / 0.45) * Math.PI * 2 * 1.5;
      legA = 1.2;
      armUp = 0.6;
    } else if (s === 'peck') {
      bodyPitch = 0.3;
      legA = 0.4;
      armSpread = 0.8;
      armUp = 1.2;
      kikiTarget = -1;
    } else if (s === 'pound') {
      if (this.stateT < 0.22) pitchAll = (this.stateT / 0.22) * Math.PI * 2;
      legA = 0;
      armUp = 3.0;
      armSpread = 0.2;
      kikiFlap = 0.4;
    } else if (s === 'poundland') {
      hipsY = 0.55;
      armSpread = 1.2;
    } else if (s === 'swim') {
      this.walkPhase += dt * (3 + sp * 1.5);
      hipsY = 0.9;
      bodyPitch = 0.9;
      legA = Math.sin(this.walkPhase * 2) * 0.6;
      armA = Math.sin(this.walkPhase) * 1.2;
      armSpread = 0.9;
      kikiTarget = 0.3;
    } else if (s === 'dive') {
      this.walkPhase += dt * (4 + sp);
      hipsY = 0.9;
      bodyPitch = 1.4 - clamp(this.vel.y / 5, -1, 1) * 0.6;
      legA = Math.sin(this.walkPhase * 2) * 0.7;
      armA = Math.sin(this.walkPhase) * 1.4;
      armSpread = 1.0;
    } else if (s === 'dance') {
      spinY = Math.min(1, this.stateT / 0.6) * Math.PI * 2;
      armUp = 2.8 + Math.sin(t * 12) * 0.2;
      armSpread = 0.4;
      hipsY += Math.abs(Math.sin(t * 8)) * 0.15;
      kikiTarget = 0.7;
      kikiFlap = 0.6;
    } else if (s === 'dead') {
      pitchAll = Math.min(1, this.stateT * 2) * -Math.PI / 2;
      spinY = this.stateT * 6;
      armUp = 2;
      armSpread = 1.2;
    } else if (s === 'talk') {
      hipsY += Math.sin(t * 2.2) * 0.012;
    }

    // Squash & Stretch nach der Landung
    this.squash = damp(this.squash, 0, 10, dt);
    m.scale.set(1 + this.squash * 0.6, 1 - this.squash, 1 + this.squash * 0.6);

    r.hips.position.y = damp(r.hips.position.y, hipsY, 20, dt);
    r.hips.rotation.x = pitchAll;
    r.body.rotation.x = damp(r.body.rotation.x, bodyPitch, 14, dt);
    r.body.rotation.z = bodyRoll;
    r.hips.rotation.y = spinY;
    r.legL.rotation.x = legA;
    r.legR.rotation.x = -legA;
    if (s === 'jump' || s === 'highjump' || s === 'crouch' || s === 'longjump') r.legR.rotation.x = legA * 0.4;
    r.armL.rotation.x = damp(r.armL.rotation.x, armA, 16, dt);
    r.armR.rotation.x = damp(r.armR.rotation.x, -armA, 16, dt);
    // Arme: z-Rotation spreizt seitlich, ~3 heißt "über dem Kopf"
    r.armL.rotation.z = damp(r.armL.rotation.z, -(armSpread + armUp), 14, dt);
    r.armR.rotation.z = damp(r.armR.rotation.z, armSpread + armUp, 14, dt);
    r.head.rotation.x = damp(r.head.rotation.x, -bodyPitch * 0.6, 10, dt);

    // Blinzeln
    this.blinkT -= dt;
    const blink = this.blinkT < 0.12;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3;
    for (const e of r.eyes) e.scale.y = blink ? 0.15 : 1;

    // Kiki: auf der Schulter, beim Flattern über dem Kopf, beim Picken vorne
    this.kikiUp = damp(this.kikiUp, kikiTarget, 14, dt);
    const k = r.kiki, kr = k.userData.rig;
    if (this.kikiUp >= 0) {
      k.position.lerpVectors(SHOULDER, ABOVE, this.kikiUp);
    } else {
      k.position.set(lerp(SHOULDER.x, 0, -this.kikiUp), lerp(SHOULDER.y, 1.3, -this.kikiUp), lerp(SHOULDER.z, 0.75, -this.kikiUp));
    }
    k.position.y += (r.hips.position.y - 0.72);
    k.rotation.x = s === 'peck' ? 0.5 + Math.sin(t * 50) * 0.35 : 0;
    k.rotation.y = s === 'idle' ? Math.sin(t * 0.8) * 0.5 : 0;
    if (pitchAll) {
      // Beim Rollen/Stampfen mitdrehen
      k.visible = s !== 'roll';
    } else k.visible = true;
    const flap = kikiFlap ? Math.sin(t * 42) * 1.1 * kikiFlap : Math.sin(t * 3) * 0.05 - 0.1;
    kr.wingL.rotation.z = flap;
    kr.wingR.rotation.z = -flap;
    kr.head.rotation.y = s === 'idle' ? Math.sin(t * 1.3) * 0.6 : 0;

    // Unverwundbarkeit: blinken
    m.visible = this.invuln > 0 && s !== 'dead' ? Math.floor(t * 16) % 2 === 0 : true;
  }
}
