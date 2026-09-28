// Zeitrennen: an der Startfahne eines NPCs starten, alle Ringe der Reihe nach
// durchlaufen, Bestzeit wird gespeichert. Wer die Pokal-Zeit schafft, bekommt
// einen Pokal (einmal pro Welt).
import * as THREE from 'three';
import { G } from '../engine/geo.js';

const fmt = (t) => t.toFixed(1).replace('.', ',') + ' s';

export class Race {
  constructor(game) {
    this.game = game;
    this.course = null;
    this.active = false;
  }

  // Dialog an der Startfahne
  async offer(course) {
    const g = this.game, s = g.save.data;
    const best = s.times[course.id];
    const trophy = s.trophies[course.id];
    const text = `Zeitrennen! Lauf durch alle ${course.points.length} Ringe ins Ziel. `
      + `Pokal-Zeit: ${fmt(course.target)}. ${best ? `Deine Bestzeit: ${fmt(best)}${trophy ? ' – Pokal schon gewonnen' : ''}.` : 'Noch keine Bestzeit.'} Los?`;
    const pick = await g.dialog.choose(course.who, text, ['Los geht\'s!', 'Lieber nicht']);
    if (pick === 0) this.start(course);
  }

  start(course) {
    const g = this.game, p = g.player, L = course.level;
    this.stop();
    this.course = course;
    this.active = true;
    this.next = 0;
    this.time = 0;
    this.countdown = 3;
    this.lastShown = null;
    // Ringe aufstellen, jeweils zum nächsten Ring ausgerichtet
    const geo = G.torus(1.9, 0.18, 6, 20);
    this.rings = course.points.map((pt, i) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.35, depthWrite: false }));
      const nx = course.points[i + 1] || pt, prev = course.points[i - 1] || course.start;
      const dx = (nx.x - prev.x), dz = (nx.z - prev.z);
      m.position.set(pt.x, pt.y, pt.z);
      m.rotation.y = Math.atan2(dx, dz);
      L.root.add(m);
      return m;
    });
    this.ringGeo = geo;
    p.spawn(course.start.x, L.groundTop(course.start.x, course.start.z), course.start.z, course.start.facing);
    g.camRig.snapBehind(p);
    p.control = false;
    g.hud.setRace('3');
    g.audio.play('menu');
  }

  stop(msg) {
    const g = this.game;
    if (this.rings) {
      for (const m of this.rings) {
        m.parent?.remove(m);
        m.material.dispose();
      }
      this.ringGeo.dispose();
    }
    this.rings = null;
    if (this.active) g.player.control = true;
    this.active = false;
    this.course = null;
    g.hud.setRace(null);
    if (msg) g.toast(msg, 2.5);
  }

  update(dt) {
    if (!this.active) return;
    const g = this.game, p = g.player;
    // abbrechen bei Sturz, Tod oder Levelwechsel
    if (g.dying || g.falling || g.transitioning || this.course.level !== g.level) {
      this.stop('Rennen abgebrochen!');
      return;
    }
    if (this.countdown > 0) {
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      if (n !== this.lastShown && n > 0) {
        this.lastShown = n;
        g.hud.setRace(String(n));
        g.audio.play('menu');
      }
      if (this.countdown <= 0) {
        p.control = true;
        g.hud.setRace('Los!');
        g.audio.play('ok');
      }
      this.highlight(dt);
      return;
    }
    this.time += dt;
    if (this.time > this.course.target * 3) {
      this.stop('Zu langsam – das Rennen ist vorbei.');
      return;
    }
    g.hud.setRace(fmt(this.time), `Ring ${this.next + 1}/${this.rings.length}`);
    const pt = this.course.points[this.next];
    const dx = p.pos.x - pt.x, dz = p.pos.z - pt.z, dy = p.pos.y + 0.9 - pt.y;
    if (dx * dx + dz * dz < 2.3 * 2.3 && Math.abs(dy) < 2.4) {
      g.audio.play('berry', Math.min(10, this.next));
      g.particles.emit('sparkle', pt.x, pt.y, pt.z, 12);
      this.rings[this.next].visible = false;
      this.next++;
      if (this.next >= this.rings.length) return this.finish();
    }
    this.highlight(dt);
  }

  highlight() {
    const t = performance.now() / 1000;
    this.rings.forEach((m, i) => {
      const cur = i === this.next;
      m.material.opacity = cur ? 0.85 : i === this.next + 1 ? 0.45 : 0.2;
      m.material.color.setHex(cur ? 0xffe070 : 0xffd24a);
      m.scale.setScalar(cur ? 1 + Math.sin(t * 6) * 0.06 : 0.9);
    });
  }

  finish() {
    const g = this.game, c = this.course, s = g.save.data, t = this.time;
    const best = s.times[c.id];
    const record = !best || t < best;
    if (record) s.times[c.id] = +t.toFixed(2);
    const trophy = t <= c.target && !s.trophies[c.id];
    if (trophy) s.trophies[c.id] = true;
    g.save.write();
    this.stop();
    g.audio.play(trophy ? 'secret' : 'chest');
    g.hud.banner(trophy ? 'Pokal gewonnen!' : 'Ziel!', `${fmt(t)}${record ? ' – neue Bestzeit!' : ` (Bestzeit ${fmt(best)})`}`, 3);
    g.particles.emit('sparkle', g.player.pos.x, g.player.pos.y + 1, g.player.pos.z, trophy ? 40 : 20);
  }
}
