// Level-Baukasten: Terrain, statische Requisiten (gebatcht), Wasser, Himmel,
// sowie Fabrikmethoden für alle Entities.
import * as THREE from 'three';
import { World } from '../engine/collision.js';
import { Batch, G, M, mat, mergeGeos } from '../engine/geo.js';
import { rng, fbm, lerp } from '../engine/util.js';
import { Terrain, defaultColorRule } from './terrain.js';
import {
  Shard, Firefly, Apple, BerryField, NPC, Lernstein, Beetle, Grimmpilz, Crab, FogImp, Portal,
  Trigger, Platform, Breakable, PoundSpot, Bouncer, Follower, signTexture,
} from './entities.js';

const C = (hex) => new THREE.Color(hex);

export class Level {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.root = new THREE.Group();
    this.world = new World();
    this.batch = new Batch(game.tex);
    this.entities = [];
    this.spawns = {};
    this.berryPos = [];
    this.killY = def.killY ?? -30;
    this.time = 0;
    this.T = null;
    this.waterMeshes = [];
    this.animated = [];
    this.fireflyTotal = 0;
    this.shardTotal = 0;
  }

  get save() { return this.game.save; }
  flag(k) { return !!this.save.data.flags[`${this.id}:${k}`]; }
  setFlag(k, v = true) {
    this.save.data.flags[`${this.id}:${k}`] = v;
    this.save.write();
  }

  // ---------- Terrain ----------
  terrain(opts) {
    this.T = new Terrain(opts);
    this.world.terrain = this.T;
    return this.T;
  }
  gy(x, z) { return this.T ? this.T.heightAt(x, z) : 0; }

  finishTerrain(rule = defaultColorRule(), tex = 'ground', texScale = 0.25) {
    const mesh = this.T.buildMesh(this.game.tex[tex], rule, texScale);
    this.root.add(mesh);
  }

  water({ y = 0, size = 900, color = 0x3aa0e0, opacity = 0.78, x0, x1, z0, z1, cx = 0, cz = 0, r } = {}) {
    let geo;
    if (x0 != null) geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, 1).translate((x0 + x1) / 2, -(z0 + z1) / 2, 0);
    else if (r) geo = new THREE.CircleGeometry(r, 24).translate(cx, -cz, 0);
    else geo = new THREE.PlaneGeometry(size, size, 1, 1);
    geo.rotateX(-Math.PI / 2);
    // eigene Kopie, weil jede Wasserfläche eigenständig animiert wird
    const tex = this.game.tex.water.clone();
    tex.needsUpdate = true;
    const uvScale = 1 / 8;
    const uv = geo.attributes.uv, pos = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) * uvScale, pos.getZ(i) * uvScale);
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
      color, map: tex, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
    }));
    m.position.y = y;
    m.renderOrder = 2;
    this.root.add(m);
    this.waterMeshes.push({ mesh: m, tex });
    this.world.addWater(x0 != null ? { y, x0, x1, z0, z1 } : r ? { y, cx, cz, r } : { y });
    return m;
  }

  // Himmelskuppel mit Farbverlauf + Wolken + Berg-Silhouetten
  sky({ top = 0x3b7fd9, bottom = 0xbfe3ff, clouds = 14, mountains = 0x7fa8c9, sun = true, seed = 5, mountainsH = 60 } = {}) {
    const geo = new THREE.SphereGeometry(520, 16, 12);
    const col = new Float32Array(geo.attributes.position.count * 3);
    const ct = C(top), cb = C(bottom), tmp = new THREE.Color();
    for (let i = 0; i < geo.attributes.position.count; i++) {
      const y = geo.attributes.position.getY(i) / 520;
      tmp.copy(cb).lerp(ct, Math.max(0, Math.min(1, y * 1.6 + 0.1)));
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
    const sky = new THREE.Mesh(geo, skyMat);
    sky.renderOrder = -10;
    this.skyMesh = sky;
    this.root.add(sky);
    const r = rng(seed);
    const cloudParts = [];
    const tmpObj = new THREE.Object3D();
    for (let i = 0; i < clouds; i++) {
      const a = r() * Math.PI * 2, d = 300 + r() * 150, y = 90 + r() * 90;
      tmpObj.position.set(Math.cos(a) * d, y, Math.sin(a) * d);
      tmpObj.lookAt(0, y, 0);
      tmpObj.updateMatrix();
      const n = 3 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const local = M((k - n / 2) * 16, r() * 6, r() * 8, 0, [1, 0.55, 1]);
        const rad = 14 + r() * 10;
        cloudParts.push({ geo: G.sphere(rad, 8, 6), matrix: tmpObj.matrix.clone().multiply(local) });
      }
    }
    const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.95 });
    const cloudGroup = new THREE.Group();
    if (cloudParts.length) cloudGroup.add(new THREE.Mesh(mergeGeos(cloudParts), cm));
    this.root.add(cloudGroup);
    this.clouds = cloudGroup;
    if (sun) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.game.tex.glow, color: 0xfff4c0, fog: false, depthWrite: false }));
      s.position.set(200, 260, -300);
      s.scale.setScalar(160);
      this.root.add(s);
      this.sunSprite = s;
    }
    if (mountains != null) {
      // ferner Bergkranz für Tiefe
      const parts = [];
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2 + r() * 0.1, d = 420;
        const h = mountainsH * (0.6 + r() * 0.8);
        parts.push({ geo: G.cone(40 + r() * 30, h, 5), matrix: M(Math.cos(a) * d, -10, Math.sin(a) * d) });
      }
      const mg = new THREE.Mesh(mergeGeos(parts), new THREE.MeshBasicMaterial({ color: mountains, fog: false }));
      this.root.add(mg);
      this.mountains = mg;
    }
  }

  // ---------- statische Geometrie ----------
  add(geo, matrix, color, tex = 'plain', uvScale = 0.5, opts) {
    this.batch.add(geo, matrix, color, tex, uvScale, opts);
  }

  box({ x = 0, y, z = 0, w = 1, h = 1, d = 1, rot = 0, color = 0xffffff, tex = 'wood', uv = 0.5, collide = true, walkable = true, camBlock = true, shade = 0.06 }) {
    y ??= this.gy(x, z);
    this.add(G.box(w, h, d), M(x, y, z, rot), color, tex, uv, { shade });
    if (collide) return this.world.addBox({ x, y, z, w, h, d, rot, walkable, camBlock });
  }

  cyl({ x = 0, y, z = 0, r = 1, rTop, h = 1, seg = 12, color = 0xffffff, tex = 'stone', uv = 0.5, collide = true, camBlock = true }) {
    y ??= this.gy(x, z);
    this.add(G.cyl(rTop ?? r, r, h, seg), M(x, y, z), color, tex, uv, { shade: 0.05 });
    if (collide) return this.world.addCyl({ x, y, z, r: Math.max(r, rTop ?? r), h, camBlock });
  }

  // ---------- Requisiten ----------
  tree(x, z, { s = 1, y, kind = 'round', seed, leaf = 0x3f9b2f, collide = true } = {}) {
    y ??= this.gy(x, z) - 0.2;
    const r = rng(seed ?? Math.floor(x * 131 + z * 71));
    const rot = r() * Math.PI * 2;
    const bark = 0x8a6440;
    if (kind === 'pine') {
      this.add(G.cyl(0.25 * s, 0.4 * s, 2.2 * s, 6), M(x, y, z, rot), bark, 'bark', 0.8);
      const lc = C(leaf).multiplyScalar(0.75);
      for (let i = 0; i < 3; i++) {
        const cy = y + (1.6 + i * 1.6) * s, cr = (2.3 - i * 0.6) * s;
        this.add(G.cone(cr, 2.6 * s, 7), M(x, cy, z, rot + i), lc, 'leaves', 0.5, { shade: 0.1, seed: i });
      }
    } else if (kind === 'palm') {
      let px = x, pz = z, py = y;
      const lean = r() * Math.PI * 2;
      for (let i = 0; i < 6; i++) {
        this.add(G.cyl(0.3 * s, 0.36 * s, 1.3 * s, 6), M(px, py, pz, rot, 1, Math.sin(lean) * 0.12 * i, Math.cos(lean) * 0.12 * i), 0x9a7650, 'bark', 0.9);
        py += 1.2 * s;
        px += Math.cos(lean) * 0.15 * i * s;
        pz += Math.sin(lean) * 0.15 * i * s;
      }
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const leafGeo = G.box(0.9 * s, 0.1 * s, 3.8 * s).translate(0, 0, 1.9 * s);
        this.add(leafGeo, M(px, py, pz, a, 1, 0.45), 0x46a83a, 'leaves', 0.6, { shade: 0.1 });
      }
      this.add(G.sphere(0.5 * s, 6, 4), M(px, py - 0.2, pz), 0x6b4a2a, 'plain');
      if (collide) this.world.addCyl({ x, z, y, r: 0.4 * s, h: 7 * s, camBlock: false });
      return;
    } else if (kind === 'dead') {
      this.add(G.cyl(0.25 * s, 0.45 * s, 4 * s, 6), M(x, y, z, rot), 0x6a5a4a, 'bark', 0.8);
      for (let i = 0; i < 3; i++) {
        this.add(G.cyl(0.08 * s, 0.16 * s, 1.8 * s, 5), M(x, y + (2 + i * 0.7) * s, z, rot + i * 2.1, 1, 0, 0.9), 0x6a5a4a, 'bark', 0.8);
      }
    } else {
      const th = (2 + r() * 0.8) * s;
      this.add(G.cyl(0.32 * s, 0.5 * s, th + 0.8 * s, 7), M(x, y, z, rot), bark, 'bark', 0.8);
      const lc = C(leaf);
      const blobs = [[0, th + 1.4, 0, 2.1], [0.9, th + 0.9, 0.4, 1.4], [-0.8, th + 1.0, -0.5, 1.5], [0.2, th + 2.4, -0.2, 1.4]];
      for (const [bx, by, bz, br] of blobs) {
        const c = lc.clone().multiplyScalar(0.85 + r() * 0.3);
        this.add(G.blob(br * s, Math.floor(r() * 99)), M(x + bx * s, y + by * s, z + bz * s, rot), c, 'leaves', 0.5, { shade: 0.08, seed: Math.floor(r() * 99) });
      }
    }
    if (collide) this.world.addCyl({ x, z, y, r: 0.45 * s, h: 4 * s, camBlock: false });
  }

  bush(x, z, { s = 1, y, color = 0x3f8f2c } = {}) {
    y ??= this.gy(x, z) - 0.1;
    const r = rng(Math.floor(x * 17 + z * 29));
    for (let i = 0; i < 3; i++) {
      const c = C(color).multiplyScalar(0.85 + r() * 0.3);
      this.add(G.blob((0.7 + r() * 0.4) * s, i), M(x + (r() - 0.5) * s, y + 0.4 * s, z + (r() - 0.5) * s, r() * 6, [1, 0.8, 1]), c, 'leaves', 0.7, { shade: 0.1 });
    }
  }

  rock(x, z, { s = 1, y, color = 0x9a958c, collide = true, sy = 1, seed } = {}) {
    y ??= this.gy(x, z);
    const r = rng(seed ?? Math.floor(x * 7 + z * 13));
    this.add(G.rock(1, Math.floor(r() * 999)), M(x, y + 0.3 * s * sy, z, r() * 6, [s, s * 0.8 * sy, s]), color, 'rock', 0.5, { flat: true, shade: 0.08 });
    if (collide) return this.world.addCyl({ x, z, y: y - 1, r: s * 0.9, h: s * 1.0 * sy + 1 });
  }

  flowers(x, z, n = 8, rad = 3, colors = [0xff5a8a, 0xffe14a, 0xffffff, 0x7a8aff]) {
    const r = rng(Math.floor(x * 3 + z * 5));
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad;
      const fx = x + Math.cos(a) * d, fz = z + Math.sin(a) * d, fy = this.gy(fx, fz);
      this.add(G.cyl(0.03, 0.03, 0.45, 3), M(fx, fy, fz), 0x3a8a2a, 'plain');
      const c = colors[Math.floor(r() * colors.length)];
      this.add(G.sphere(0.16, 5, 3), M(fx, fy + 0.48, fz, 0, [1, 0.5, 1]), c, 'plain');
      this.add(G.sphere(0.06, 4, 3), M(fx, fy + 0.55, fz), 0xffcc33, 'plain');
    }
  }

  grass(x, z, n = 10, rad = 4) {
    const r = rng(Math.floor(x * 11 + z * 3));
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad;
      const gx = x + Math.cos(a) * d, gz = z + Math.sin(a) * d, gy = this.gy(gx, gz);
      for (let k = 0; k < 3; k++) {
        this.add(G.cone(0.08, 0.6 + r() * 0.3, 3), M(gx + (r() - 0.5) * 0.3, gy - 0.05, gz + (r() - 0.5) * 0.3, r() * 6, 1, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5), 0x4faa2f, 'plain');
      }
    }
  }

  fence(points, { h = 1.1, color = 0x9b7650 } = {}) {
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i], [bx, bz] = points[i + 1];
      const len = Math.hypot(bx - ax, bz - az), rot = Math.atan2(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 2.2));
      for (let k = 0; k <= n; k++) {
        const t = k / n, px = lerp(ax, bx, t), pz = lerp(az, bz, t);
        this.add(G.box(0.22, h + 0.2, 0.22), M(px, this.gy(px, pz) - 0.2, pz, rot), color, 'wood', 0.8);
      }
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, my = this.gy(mx, mz);
      for (const hy of [0.45, 0.85]) this.add(G.box(0.1, 0.16, len), M(mx, my + hy * h, mz, rot), color, 'wood', 0.8);
      this.world.addBox({ x: mx, z: mz, y: my - 0.5, w: 0.3, d: len, h: h + 0.5, rot, camBlock: false });
    }
  }

  bridge(ax, az, bx, bz, y, { w = 3, color = 0xa07850 } = {}) {
    const len = Math.hypot(bx - ax, bz - az), rot = Math.atan2(bx - ax, bz - az);
    const n = Math.round(len / 0.8);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const sag = Math.sin(t * Math.PI) * -0.4;
      this.add(G.box(w, 0.2, 0.7), M(lerp(ax, bx, t), y - 0.2 + sag, lerp(az, bz, t), rot), C(color).multiplyScalar(0.85 + (i % 3) * 0.08), 'wood', 0.8);
    }
    for (const s of [-1, 1]) {
      const ox = Math.cos(rot) * s * (w / 2), oz = -Math.sin(rot) * s * (w / 2);
      for (const t of [0, 1]) {
        this.add(G.cyl(0.12, 0.14, 1.6, 5), M(lerp(ax, bx, t) + ox, y - 0.6, lerp(az, bz, t) + oz), 0x7a5a3a, 'bark');
      }
      this.add(G.box(0.08, 0.08, len), M((ax + bx) / 2 + ox, y + 0.8, (az + bz) / 2 + oz, rot), 0xd8c8a0, 'plain');
    }
    // Sanft durchhängende Lauffläche als mehrere Collider
    const segs = 4;
    for (let i = 0; i < segs; i++) {
      const t = (i + 0.5) / segs;
      const sag = Math.sin(t * Math.PI) * -0.4;
      this.world.addBox({ x: lerp(ax, bx, t), z: lerp(az, bz, t), y: y - 1.2 + sag, w, d: len / segs + 0.05, h: 1.1, rot, camBlock: false });
    }
    for (const s of [-1, 1]) {
      const ox = Math.cos(rot) * s * (w / 2 + 0.1), oz = -Math.sin(rot) * s * (w / 2 + 0.1);
      this.world.addBox({ x: (ax + bx) / 2 + ox, z: (az + bz) / 2 + oz, y: y - 0.2, w: 0.2, d: len, h: 1.2, rot, walkable: false, camBlock: false });
    }
  }

  mushroomDeco(x, z, { h = 3, r = 2, color = 0xd84a3a, y, collide = true } = {}) {
    y ??= this.gy(x, z);
    this.add(G.cyl(r * 0.28, r * 0.36, h, 9), M(x, y, z), 0xf3e6c8, 'plain', 0.5, { shade: 0.05 });
    this.add(G.hemi(r, 12, 5), M(x, y + h - 0.1, z, 0, [1, 0.6, 1]), color, 'mushroom', null, { uvRepeat: 2 });
    this.add(new THREE.CircleGeometry(r, 12).rotateX(Math.PI / 2), M(x, y + h - 0.1, z), 0xf0dcb0, 'plain');
    if (collide) {
      this.world.addCyl({ x, z, y, r: r * 0.32, h });
      return this.world.addCyl({ x, z, y: y + h - 0.4, r: r * 0.95, h: 0.4 + r * 0.55 });
    }
  }

  // Wegweiser mit Text
  sign(x, z, rot, text, sub = '') {
    const y = this.gy(x, z);
    this.add(G.cyl(0.14, 0.16, 2.2, 6), M(x, y - 0.2, z), 0x7a5a3a, 'bark');
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshLambertMaterial({ map: signTexture([text, sub]), side: THREE.DoubleSide }));
    board.position.set(x, y + 2.1, z);
    board.rotation.y = rot;
    this.root.add(board);
    this.world.addCyl({ x, z, y, r: 0.2, h: 2.5, camBlock: false });
  }

  // ---------- Entities ----------
  spawn(e) {
    this.entities.push(e);
    return e;
  }

  berry(x, y, z) {
    y ??= this.gy(x, z) + 0.9;
    this.berryPos.push([x, y, z]);
  }
  berryLine(ax, az, bx, bz, n, yOff = 0.9, fixedY) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = lerp(ax, bx, t), z = lerp(az, bz, t);
      this.berry(x, fixedY != null ? fixedY : this.groundTop(x, z) + yOff, z);
    }
  }
  berryRing(cx, cz, r, n, y) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      this.berry(x, y ?? this.groundTop(x, z) + 0.9, z);
    }
  }
  berryArc(ax, az, bx, bz, n, h, y0) {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = lerp(ax, bx, t), z = lerp(az, bz, t);
      const base = y0 ?? this.groundTop(x, z);
      this.berry(x, base + 0.9 + Math.sin(t * Math.PI) * h, z);
    }
  }
  groundTop(x, z) {
    return this.world.ground(x, z, 9999).y;
  }

  shard(id, x, y, z, opts) {
    this.shardTotal++;
    y ??= this.groundTop(x, z) + 1.3;
    if (this.save.hasShard(`${this.id}:${id}`)) return null;
    return this.spawn(new Shard(this, id, x, y, z, opts));
  }
  firefly(id, x, y, z) {
    this.fireflyTotal++;
    y ??= this.groundTop(x, z) + 1.4;
    if (this.save.data.fireflies[`${this.id}:${id}`]) return null;
    return this.spawn(new Firefly(this, id, x, y, z));
  }
  // Splitter, der erscheint, wenn alle Glühwürmchen gefunden sind
  fireflyShard(id, x, z, y) {
    this.ffShard = { id, x, z, y };
    this.shardTotal++;
  }
  spawnFireflyShard(hidden) {
    const d = this.ffShard;
    if (!d || this.save.hasShard(`${this.id}:${d.id}`)) return null;
    const y = d.y ?? this.groundTop(d.x, d.z) + 1.3;
    return this.spawn(new Shard(this, d.id, d.x, y, d.z, { hidden }));
  }
  apple(x, z, y, o) {
    y ??= this.groundTop(x, z);
    return this.spawn(new Apple(this, x, y, z, o));
  }
  npc(model, x, z, o = {}) {
    const y = o.y ?? this.groundTop(x, z);
    return this.spawn(new NPC(this, model, x, y, z, o));
  }
  follower(model, x, z, o = {}) {
    const y = o.y ?? this.groundTop(x, z);
    return this.spawn(new Follower(this, model, x, y, z, o));
  }
  lernstein(x, z, o) {
    return this.spawn(new Lernstein(this, x, o.y ?? this.groundTop(x, z), z, o));
  }
  beetle(x, z, o) { return this.spawn(new Beetle(this, x, z, o)); }
  grimmpilz(x, z, o) { return this.spawn(new Grimmpilz(this, x, z, o)); }
  crab(x, z, o) { return this.spawn(new Crab(this, x, z, o)); }
  fogImp(x, y, z, o) { return this.spawn(new FogImp(this, x, y, z, o)); }
  portal(x, z, o) { return this.spawn(new Portal(this, x, z, o)); }
  trigger(x, z, o) { return this.spawn(new Trigger(this, x, o.y ?? this.groundTop(x, z), z, o)); }
  platform(o) { return this.spawn(new Platform(this, o)); }
  breakable(x, z, o) { return this.spawn(new Breakable(this, x, o.y ?? this.gy(x, z), z, o)); }
  poundSpot(x, z, o) { return this.spawn(new PoundSpot(this, x, z, o)); }
  bouncer(x, z, o) { return this.spawn(new Bouncer(this, x, z, o)); }

  spawnPoint(name, x, z, facing = 0, y) {
    this.spawns[name] = { x, z, y, facing };
  }

  // ---------- Fertigstellen ----------
  build() {
    this.batch.build(this.root);
    if (this.ffShard && this.save.levelFireflies(this.id) >= this.fireflyTotal) this.spawnFireflyShard(false);
    const collected = this.save.data.berries[this.id] || [];
    this.berries = this.spawn(new BerryField(this, this.berryPos, collected));
    this.game.renderer.scene.add(this.root);
  }

  update(dt) {
    this.time += dt;
    for (const w of this.waterMeshes) {
      w.tex.offset.x = Math.sin(this.time * 0.3) * 0.08;
      w.tex.offset.y = this.time * 0.03;
    }
    if (this.clouds) this.clouds.rotation.y = this.time * 0.004;
    for (const a of this.animated) a(dt, this.time);
    for (const e of this.entities) if (e.alive) e.update(dt);
    if (this.entities.some((e) => !e.alive)) this.entities = this.entities.filter((e) => e.alive);
    this.def.update?.(this, dt);
  }

  dispose() {
    this.game.renderer.scene.remove(this.root);
    const sharedTex = new Set(Object.values(this.game.tex));
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (!o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m.userData.shared) continue;
        if (m.map && !sharedTex.has(m.map)) m.map.dispose();
        m.dispose();
      }
    });
  }
}

export { fbm };
