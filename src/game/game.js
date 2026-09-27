// Zentrale Spielklasse: Schleife, Levelwechsel, Cutscenes, Einsammeln, Tod.
import * as THREE from 'three';
import { Renderer } from '../engine/renderer.js';
import { makeTextures } from '../engine/textures.js';
import { Input, B } from '../engine/input.js';
import { TouchControls } from '../engine/touch.js';
import { Audio } from '../engine/audio.js';
import { CameraRig } from '../engine/camera.js';
import { Particles } from '../engine/particles.js';
import { Player } from './player.js';
import { Save } from './save.js';
import { Hud } from './hud.js';
import { Dialog } from './dialog.js';
import { Portraits } from './portraits.js';
import { Level } from './level.js';
import { BlobShadow } from './entities.js';
import { Menus } from './menus.js';
import { LEVELS } from '../levels/index.js';

const $ = (s) => document.querySelector(s);

export class Game {
  constructor() {
    this.canvas = $('#game');
    this.renderer = new Renderer(this.canvas);
    this.tex = makeTextures();
    this.input = new Input();
    this.touch = new TouchControls($('#touch'), this.input.touchPad);
    this.audio = new Audio();
    this.save = new Save();
    this.hud = new Hud();
    this.dialog = new Dialog(this);
    this.portraits = new Portraits(this.renderer);
    this.particles = new Particles(this.renderer.scene, this.tex);
    this.player = new Player(this);
    this.renderer.scene.add(this.player.model);
    this.camRig = new CameraRig(this.renderer.camera, null);
    this.level = null;
    this.mode = 'boot';
    this.cutsceneDepth = 0;
    this.skipping = false;
    this.timers = [];
    this.tweens = [];
    this.prompt = null;
    this.transitioning = false;
    this.tvMode = new URLSearchParams(location.search).has('tv');
    this.remote = null;
    this.saveDirtyT = 0;
    this.applySettings();
    this.menus = new Menus(this);
    this.input.onDeviceChange = () => this.updateTouchVisibility();
    this.input.onRumble = (ms) => this.remote?.rumble(ms);
    if (this.tvMode) document.body.classList.add('tv');
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play' && !this.cinematic && !this.transitioning) this.menus.openPause();
    });
    $('#skip-hint').addEventListener('pointerdown', () => { if (this.cutsceneDepth > 0) this.skipping = true; });
  }

  get cinematic() {
    return this.cutsceneDepth > 0 || this.dialog.active;
  }

  applySettings() {
    const s = this.save.data.settings;
    this.renderer.setQuality(s.quality);
    this.renderer.setPixelated(s.pixel);
    this.audio.setVolumes(s.music, s.sfx);
    this.input.vibrate = s.vibrate;
    this.camRig.invertY = s.invertY;
  }

  updateTouchVisibility() {
    const d = this.input.device;
    const show = this.mode === 'play' && d === 'touch' && !this.remoteConnected;
    this.touch.setVisible(show);
    document.body.classList.toggle('no-touch', !show);
  }

  start() {
    requestAnimationFrame(this.loop);
    this.menus.openTitle();
  }

  // ---------- Zeit & Cutscenes ----------
  wait(sec) {
    if (this.skipping) return Promise.resolve();
    return new Promise((res) => this.timers.push({ t: sec, res }));
  }

  async cutscene(fn) {
    this.cutsceneDepth++;
    $('#letterbox').classList.add('on');
    $('#skip-hint').hidden = false;
    this.hud.setPrompt(null);
    try {
      await fn();
    } catch (e) {
      console.error(e);
    } finally {
      this.cutsceneDepth--;
      if (this.cutsceneDepth === 0) {
        $('#letterbox').classList.remove('on');
        $('#skip-hint').hidden = true;
        this.skipping = false;
        this.dialog.flush();
        this.camRig.release(this.player);
      }
    }
  }

  camTo(pos, look, dur = 1) {
    this.camRig.focus(pos instanceof THREE.Vector3 ? pos : new THREE.Vector3(...pos), look instanceof THREE.Vector3 ? look : new THREE.Vector3(...look), this.skipping ? 0 : dur);
    return this.wait(dur);
  }

  say(lines) {
    return this.dialog.say(lines);
  }

  // Animiert fn(t) mit t von 0..1 über dur Sekunden
  tween(dur, fn) {
    if (this.skipping || dur <= 0) {
      fn(1);
      return Promise.resolve();
    }
    return new Promise((res) => this.tweens.push({ t: 0, dur, fn, res }));
  }

  toast(text, sec) {
    this.hud.toast(text, sec);
  }

  fade(on) {
    $('#fade').classList.toggle('on', on);
    return new Promise((r) => setTimeout(r, 480));
  }

  // Aktuelles Level samt laufender Szenen, Timer und Zustände abbauen
  teardownLevel() {
    this.levelToken = (this.levelToken || 0) + 1;
    this.dialog.flush();
    this.cutsceneDepth = 0;
    this.skipping = false;
    $('#letterbox').classList.remove('on');
    $('#skip-hint').hidden = true;
    if (this.level) this.level.dispose();
    this.level = null;
    this.particles.clear();
    this.timers.length = 0;
    this.tweens.length = 0;
    this.playerShadow = null;
    this.dying = false;
    this.falling = false;
    this.hud.setBoss(null);
  }

  // ---------- Level laden ----------
  async enterLevel(id, spawnName = 'start', { fromTitle = false } = {}) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.mode = 'loading';
    this.updateTouchVisibility();
    await this.fade(true);
    this.teardownLevel();
    const def = (await LEVELS[id]()).default;
    const L = new Level(this, def);
    this.level = L;
    def.build(L);
    L.build();
    this.camRig.world = L.world;
    this.renderer.setAtmosphere(def.atmosphere(L, this));
    this.underwater = false;
    this.hud.setBoss(null);
    this.playerShadow = new BlobShadow(L, 1.5);

    const sp = L.spawns[spawnName] || L.spawns.start;
    const y = sp.y ?? L.world.ground(sp.x, sp.z, 999).y;
    this.player.spawn(sp.x, y, sp.z, sp.facing);
    this.player.health = this.player.maxHealth = this.maxHealth();
    this.player.control = true;
    this.currentSpawn = spawnName;
    this.camRig.snapBehind(this.player);
    this.hud.setHealth(this.player.health, this.player.maxHealth);
    this.refreshCounters();
    this.hud.show(true);
    this.mode = 'play';
    document.body.classList.add('playing');
    this.updateTouchVisibility();
    this.audio.playMusic(def.music);
    this.save.data.lastLevel = id;
    this.save.write();
    await this.fade(false);
    this.transitioning = false;
    if (!fromTitle || id !== 'hub' || this.save.hasProgress()) this.hud.levelTitle(L.name, def.subtitle || '');
    def.onEnter?.(L, this, spawnName);
  }

  maxHealth() {
    return 5 + Object.keys(this.save.data.flags).filter((k) => k.endsWith(':allBerries')).length;
  }

  refreshCounters() {
    const L = this.level;
    this.hud.setShards(this.save.totalShards());
    this.hud.setBerries(L.berries.count, L.berries.total);
    this.hud.setFireflies(this.save.levelFireflies(L.id), L.fireflyTotal);
  }

  // ---------- Einsammeln ----------
  collectShard(shard) {
    this.save.addShard(shard.key);
    this.hud.setShards(this.save.totalShards());
    this.audio.play('shard');
    this.audio.duckMusic(2.2);
    this.input.rumble(300, 0.7);
    const L = this.level;
    this.hud.banner('Sonnensplitter!', `${this.save.levelShards(L.id)} von ${L.shardTotal} in ${L.name}`);
    this.particles.emit('sparkle', shard.pos.x, shard.pos.y, shard.pos.z, 40);
    const p = this.player;
    this.cutscene(async () => {
      p.vel.set(0, 0, 0);
      await this.wait(0.05);
      p.setState('dance');
      const f = p.facing;
      const front = new THREE.Vector3(p.pos.x + Math.sin(f) * 5, p.pos.y + 2, p.pos.z + Math.cos(f) * 5);
      await this.camTo(front, p.pos.clone().setY(p.pos.y + 1.2), 0.5);
      await this.wait(1.8);
      p.setState(p.diving ? 'dive' : p.swimming ? 'swim' : p.onGround ? 'idle' : 'fall');
      await L.def.onShard?.(L, this, shard.id);
    });
    for (const e of L.entities) if (e.refresh) e.refresh();
  }

  collectFirefly(f) {
    this.save.data.fireflies[f.key] = true;
    this.save.write();
    const L = this.level;
    const n = this.save.levelFireflies(L.id);
    this.audio.play('firefly');
    this.hud.setFireflies(n, L.fireflyTotal);
    this.particles.emit('sparkle', f.pos.x, f.pos.y, f.pos.z, 20, [0.85, 1, 0.4]);
    this.toast(`Glühwürmchen gefunden! (${n}/${L.fireflyTotal})`);
    if (n >= L.fireflyTotal) {
      const s = L.spawnFireflyShard(true);
      if (s) {
        this.cutscene(async () => {
          await this.wait(0.6);
          await this.say([{ who: 'kiki', text: 'Alle Glühwürmchen gefunden! Zusammen leuchten sie so hell ... da, sie zeigen uns einen Sonnensplitter!' }]);
          await this.camTo([s.pos.x + 6, s.pos.y + 4, s.pos.z + 8], s.pos, 1.2);
          s.reveal();
          await this.wait(1.2);
        });
      }
    }
  }

  collectBerry(i, field) {
    const L = this.level;
    this.save.data.berries[L.id] = [...field.got];
    this.saveDirtyT = 1;
    this.hud.setBerries(field.count, field.total);
    if (field.count === field.total && !L.flag('allBerries')) {
      L.setFlag('allBerries');
      this.player.maxHealth = this.maxHealth();
      this.player.heal(this.player.maxHealth);
      this.audio.play('secret');
      this.hud.banner('Alle Beeren!', 'Du bekommst ein zusätzliches Herz!', 3);
    }
  }

  // ---------- Interaktion ----------
  offerPrompt(entity, label) {
    const d = entity.distPlayer();
    if (!this.promptCand || d < this.promptCand.d) this.promptCand = { entity, label, d };
  }

  interact() {
    const e = this.prompt?.entity;
    if (!e) return;
    this.player.vel.x = this.player.vel.z = 0;
    this.player.facing = Math.atan2(e.pos.x - this.player.pos.x, e.pos.z - this.player.pos.z);
    e.interact();
  }

  // ---------- Tod & Absturz ----------
  onPlayerDeath() {
    if (this.dying) return;
    this.dying = true;
    this.audio.duckMusic(3);
    this.hud.banner('Autsch!', 'Nochmal versuchen ...', 2);
    const token = this.levelToken;
    setTimeout(async () => {
      if (token !== this.levelToken || !this.level) return;
      await this.fade(true);
      const L = this.level;
      const sp = L.spawns[this.currentSpawn] || L.spawns.start;
      this.player.spawn(sp.x, sp.y ?? L.world.ground(sp.x, sp.z, 999).y, sp.z, sp.facing);
      this.player.health = this.player.maxHealth;
      this.hud.setHealth(this.player.health, this.player.maxHealth);
      this.camRig.snapBehind(this.player);
      L.def.onRespawn?.(L, this);
      await this.fade(false);
      this.dying = false;
    }, 1800);
  }

  // Nach Gefahrenzonen: kurz ausblenden und am letzten sicheren Punkt weiter
  async returnToSafe() {
    if (this.falling || this.dying) return;
    this.falling = true;
    const p = this.player;
    p.vel.set(0, 8, 0);
    await this.wait(0.35);
    await this.fade(true);
    p.spawn(p.lastSafe.x, p.lastSafe.y + 0.1, p.lastSafe.z, p.facing);
    p.invuln = 1.5;
    this.camRig.snapBehind(p);
    await this.fade(false);
    this.falling = false;
  }

  async onPlayerFall() {
    if (this.falling || this.dying) return;
    this.falling = true;
    const p = this.player;
    p.health = Math.max(0, p.health - 1);
    this.hud.setHealth(p.health, p.maxHealth);
    this.audio.play('hurt');
    if (p.health <= 0) {
      this.falling = false;
      p.die();
      return;
    }
    await this.fade(true);
    p.spawn(p.lastSafe.x, p.lastSafe.y + 0.1, p.lastSafe.z, p.facing);
    p.invuln = 1.5;
    this.camRig.snapBehind(p);
    await this.fade(false);
    this.falling = false;
  }

  // ---------- Schleife ----------
  loop(now) {
    requestAnimationFrame(this.loop);
    let dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (dt <= 0) return;
    // in maximal 1/60-s-Schritte teilen, damit die Physik stabil bleibt
    const steps = Math.min(4, Math.ceil(dt / (1 / 60) - 0.01));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this.update(h, i === 0);
    this.particles.update(dt, this.renderer.internalHeight);
    this.hud.update(dt);
    this.menus.render?.(dt);
    this.renderer.render(dt);
  }

  update(dt, first) {
    // Eingabe nur einmal pro Frame auswerten, damit "gedrückt" nicht verloren geht
    if (first) this.input.update(dt);
    else this.input.pressedMask = 0;
    const input = this.input;

    if (this.mode === 'title' || this.mode === 'paused' || this.mode === 'menu') {
      if (first) this.menus.update(dt, input);
      if (this.mode === 'title') this.titleCamera(dt);
      return;
    }
    if (this.mode !== 'play' || !this.level) return;

    if (first && input.pressed(B.PAUSE) && !this.transitioning) {
      if (this.cutsceneDepth > 0) this.skipping = true;
      else if (!this.dialog.active) {
        this.menus.openPause();
        return;
      }
    }
    if (first && input.pressed(B.RECENTER)) this.camRig.recenter = true;

    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt;
      if (t.t <= 0 || this.skipping) {
        this.timers.splice(i, 1);
        t.res();
      }
    }

    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = this.skipping ? 1 : Math.min(1, tw.t / tw.dur);
      tw.fn(k);
      if (k >= 1) {
        this.tweens.splice(i, 1);
        tw.res();
      }
    }

    const L = this.level;
    L.world.clearDeltas();
    this.promptCand = null;
    L.update(dt);
    this.player.update(dt, input);
    if (!this.transitioning) this.dialog.update(dt, input);
    const inv = this.save.data.settings.invertY ? -1 : 1;
    const cs = this.save.data.settings.camSpeed;
    const camInput = { camX: input.camX * cs, camY: input.camY * inv * cs, camDragX: input.camDragX * cs, camDragY: input.camDragY * inv * cs };
    this.camRig.update(dt, this.player, camInput);
    this.playerShadow?.update(this.player.pos.x, this.player.pos.y, this.player.pos.z);

    // Unter Wasser: bläulicher, dichter Nebel
    if (L.def.underwater != null) {
      const c = this.renderer.camera.position;
      const under = c.y < L.world.waterAt(c.x, c.z) - 0.05;
      if (under !== this.underwater) {
        this.underwater = under;
        const uw = L.def.underwater;
        this.renderer.setAtmosphere(under ? { sky: uw, fog: uw, fogNear: 1, fogFar: 38, hemi: 0x9ad8ff, ground: 0x1a4a6a, sunIntensity: 1.2, hemiIntensity: 1.6 } : L.def.atmosphere(L, this));
      }
    }

    this.prompt = this.cinematic || !this.player.onGround ? null : this.promptCand;
    this.hud.setPrompt(this.prompt ? this.prompt.label : null, this.input.device === 'gamepad' ? 'B' : this.input.device === 'keyboard' ? 'J' : 'B');
    this.touch.setLabel('B', this.prompt ? this.prompt.label : 'Angriff');
    this.touch.setDialogMode(this.cinematic);
    this.hud.setAir(this.player.air, this.player.diving || this.player.air < 0.99);

    if (this.saveDirtyT > 0 && (this.saveDirtyT -= dt) <= 0) this.save.write();
    if (first) this.save.data.playTime += dt;
  }

  // Titelbildschirm: Kamera kreist langsam über dem Hub
  titleCamera(dt) {
    if (!this.level) return;
    this.titleT = (this.titleT || 0) + dt;
    const t = this.titleT * 0.06;
    const cam = this.renderer.camera;
    const c = this.level.def.titleCam || { x: 0, y: 14, z: 0, r: 50, h: 18 };
    cam.position.set(c.x + Math.sin(t) * c.r, c.y + c.h, c.z + Math.cos(t) * c.r);
    cam.lookAt(c.x, c.y, c.z);
    this.level.update(dt);
  }

  // Hub im Hintergrund des Titelbildschirms laden
  async loadTitleBackdrop() {
    this.teardownLevel();
    const def = (await LEVELS.hub()).default;
    const L = new Level(this, def);
    this.level = L;
    def.build(L);
    L.build();
    this.camRig.world = L.world;
    this.renderer.setAtmosphere(def.atmosphere(L, this));
    this.player.model.visible = false;
    this.player.pos.set(9999, -500, 9999);
  }
}
