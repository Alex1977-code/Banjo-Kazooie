// Einfache, aber robuste Kollisionswelt für einen 3D-Plattformer:
// Höhenfeld-Terrain + (gedrehte) Quader + Zylinder + Wasserflächen.

export class Collider {
  constructor(type, o) {
    this.type = type;
    this.cx = o.x ?? 0;
    this.cz = o.z ?? 0;
    this.y0 = o.y ?? 0;
    this.y1 = this.y0 + (o.h ?? 1);
    this.solid = o.solid ?? true;
    this.walkable = o.walkable ?? true;
    this.camBlock = o.camBlock ?? true;
    this.bounce = o.bounce ?? 0;
    this.hazard = o.hazard ?? 0;
    this.onLand = o.onLand ?? null;
    this.tag = o.tag ?? null;
    this.enabled = true;
    // Bewegung seit letztem Frame (für bewegliche Plattformen)
    this.dx = 0; this.dy = 0; this.dz = 0; this.drot = 0;
    if (type === 'box') {
      this.hx = (o.w ?? 1) / 2;
      this.hz = (o.d ?? 1) / 2;
      this.setRot(o.rot ?? 0);
    } else {
      this.r = o.r ?? 0.5;
    }
  }

  setRot(r) {
    this.rot = r;
    this.c = Math.cos(r);
    this.s = Math.sin(r);
  }

  // Bewegt den Collider und merkt sich das Delta, damit Spieler mitfahren.
  moveTo(x, y, z, rot) {
    this.dx += x - this.cx;
    this.dy += y - this.y0;
    this.dz += z - this.cz;
    const h = this.y1 - this.y0;
    this.cx = x; this.cz = z; this.y0 = y; this.y1 = y + h;
    if (rot != null && this.type === 'box') {
      this.drot += rot - this.rot;
      this.setRot(rot);
    }
  }

  // Liegt (x,z) auf der Grundfläche (erweitert um pad)?
  contains(x, z, pad = 0) {
    const dx = x - this.cx, dz = z - this.cz;
    if (this.type === 'box') {
      const lx = dx * this.c - dz * this.s;
      const lz = dx * this.s + dz * this.c;
      return Math.abs(lx) <= this.hx + pad && Math.abs(lz) <= this.hz + pad;
    }
    return dx * dx + dz * dz <= (this.r + pad) * (this.r + pad);
  }

  // Schiebt einen Kreis (x,z,r) aus der Grundfläche heraus. Gibt [px, pz] oder null zurück.
  push(x, z, r) {
    const dx = x - this.cx, dz = z - this.cz;
    if (this.type === 'cyl') {
      const d = Math.hypot(dx, dz), min = this.r + r;
      if (d >= min) return null;
      if (d < 1e-5) return [min, 0];
      const k = (min - d) / d;
      return [dx * k, dz * k];
    }
    const lx = dx * this.c - dz * this.s;
    const lz = dx * this.s + dz * this.c;
    const qx = Math.max(-this.hx, Math.min(this.hx, lx));
    const qz = Math.max(-this.hz, Math.min(this.hz, lz));
    let ox = lx - qx, oz = lz - qz;
    const d = Math.hypot(ox, oz);
    let px, pz;
    if (d > 1e-5) {
      if (d >= r) return null;
      const k = (r - d) / d;
      px = ox * k; pz = oz * k;
    } else {
      // Mittelpunkt steckt drin: entlang der kleinsten Eindringtiefe raus
      const ex = this.hx - Math.abs(lx), ez = this.hz - Math.abs(lz);
      if (ex < ez) { px = (ex + r) * Math.sign(lx || 1); pz = 0; }
      else { px = 0; pz = (ez + r) * Math.sign(lz || 1); }
    }
    // zurück in Weltkoordinaten
    return [px * this.c + pz * this.s, -px * this.s + pz * this.c];
  }

  containsPoint(x, y, z) {
    return y >= this.y0 && y <= this.y1 && this.contains(x, z);
  }
}

export class World {
  constructor() {
    this.terrain = null;
    this.colliders = [];
    this.waters = [];
    this.bounds = null;
  }

  addBox(o) {
    const c = new Collider('box', o);
    this.colliders.push(c);
    return c;
  }

  addCyl(o) {
    const c = new Collider('cyl', o);
    this.colliders.push(c);
    return c;
  }

  remove(c) {
    const i = this.colliders.indexOf(c);
    if (i >= 0) this.colliders.splice(i, 1);
  }

  // Wasser: {y, x0, x1, z0, z1} (ohne Grenzen = überall)
  addWater(w) {
    this.waters.push(w);
    return w;
  }

  waterAt(x, z) {
    let best = -Infinity;
    for (const w of this.waters) {
      if (w.x0 != null && (x < w.x0 || x > w.x1 || z < w.z0 || z > w.z1)) continue;
      if (w.cx != null && Math.hypot(x - w.cx, z - w.cz) > w.r) continue;
      if (w.y > best) best = w.y;
    }
    return best;
  }

  terrainHeight(x, z) {
    return this.terrain ? this.terrain.heightAt(x, z) : -1000;
  }

  // Höchste begehbare Fläche unter (x,z), deren Oberkante <= maxY liegt.
  ground(x, z, maxY, pad = 0.25) {
    let y = this.terrainHeight(x, z), col = null;
    for (const c of this.colliders) {
      if (!c.enabled || !c.walkable) continue;
      if (c.y1 > maxY || c.y1 <= y) continue;
      if (c.contains(x, z, pad)) {
        y = c.y1;
        col = c;
      }
    }
    return { y, col };
  }

  // Horizontale Kollision eines stehenden Zylinders (Füße bei y).
  pushOut(pos, r, height, stepUp = 0.45) {
    let hit = false;
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.colliders) {
        if (!c.enabled || !c.solid) continue;
        if (pos.y + stepUp >= c.y1 || pos.y + height <= c.y0) continue;
        const p = c.push(pos.x, pos.z, r);
        if (p) {
          pos.x += p[0];
          pos.z += p[1];
          hit = true;
        }
      }
    }
    if (this.bounds) {
      const b = this.bounds;
      if (b.r) {
        const d = Math.hypot(pos.x - (b.cx ?? 0), pos.z - (b.cz ?? 0));
        if (d > b.r) {
          pos.x = (b.cx ?? 0) + ((pos.x - (b.cx ?? 0)) / d) * b.r;
          pos.z = (b.cz ?? 0) + ((pos.z - (b.cz ?? 0)) / d) * b.r;
        }
      } else {
        pos.x = Math.max(b.x0, Math.min(b.x1, pos.x));
        pos.z = Math.max(b.z0, Math.min(b.z1, pos.z));
      }
    }
    return hit;
  }

  // Unterkante des niedrigsten Colliders, gegen den der Kopf stößt.
  ceiling(x, z, headFrom, headTo, pad = -0.15) {
    let y = Infinity;
    for (const c of this.colliders) {
      if (!c.enabled || !c.solid) continue;
      if (c.y0 < headFrom - 0.05 || c.y0 > headTo) continue;
      if (c.contains(x, z, pad) && c.y0 < y) y = c.y0;
    }
    return y;
  }

  // Ist ein Punkt im Inneren von Terrain/Collider? (für die Kamera)
  pointBlocked(x, y, z) {
    if (y < this.terrainHeight(x, z) + 0.3) return true;
    for (const c of this.colliders) {
      if (c.enabled && c.camBlock && c.containsPoint(x, y, z)) return true;
    }
    return false;
  }

  clearDeltas() {
    for (const c of this.colliders) c.dx = c.dy = c.dz = c.drot = 0;
  }
}
