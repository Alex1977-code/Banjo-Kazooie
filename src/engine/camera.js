// Third-Person-Kamera im Stil klassischer N64-Plattformer:
// "an der Leine" hinter der Figur, dreht bei Seitwärtslauf mit,
// lässt sich per Stick/Wischen frei drehen.
import * as THREE from 'three';
import { clamp, damp, dampAngle, angleDiff } from './util.js';

const _v = new THREE.Vector3();

export class CameraRig {
  constructor(camera, world) {
    this.cam = camera;
    this.world = world;
    this.yaw = 0;
    this.pitch = 0.32;
    this.dist = 10;
    this.curDist = 10;
    this.target = new THREE.Vector3();
    this.pos = new THREE.Vector3(0, 5, 10);
    this.manualTimer = 0;
    this.recenter = false;
    this.override = null;
    this.look = new THREE.Vector3();
    this.minPitch = -0.15;
    this.maxPitch = 1.15;
  }

  snapBehind(player) {
    this.yaw = player.facing + Math.PI;
    this.target.copy(player.pos).y += 1.5;
    this.curDist = this.dist;
    this.placeFromYaw(this.curDist);
    this.override = null;
    this.cam.position.copy(this.pos);
    this.look.copy(this.target);
    this.cam.lookAt(this.look);
  }

  placeFromYaw(d) {
    const h = Math.cos(this.pitch) * d;
    this.pos.set(
      this.target.x + Math.sin(this.yaw) * h,
      this.target.y + Math.sin(this.pitch) * d,
      this.target.z + Math.cos(this.yaw) * h
    );
  }

  // Filmkamera: sanft zu Position/Blickpunkt fahren.
  focus(pos, look, dur = 1) {
    const from = this.override ? this.override.pos.clone() : this.cam.position.clone();
    const fromLook = this.override ? this.override.look.clone() : this.look.clone();
    this.override = {
      from, fromLook,
      pos: pos.clone(), look: look.clone(),
      t: 0, dur: Math.max(0.0001, dur),
      curPos: from.clone(), curLook: fromLook.clone(),
    };
  }

  release(player) {
    if (!this.override) return;
    // Aus der Filmposition weich in die Leinen-Kamera übergehen
    this.pos.copy(this.cam.position);
    this.yaw = Math.atan2(this.pos.x - player.pos.x, this.pos.z - player.pos.z);
    this.override = null;
  }

  update(dt, player, input) {
    const o = this.override;
    if (o) {
      o.t = Math.min(o.dur, o.t + dt);
      let k = o.t / o.dur;
      k = k * k * (3 - 2 * k);
      o.curPos.lerpVectors(o.from, o.pos, k);
      o.curLook.lerpVectors(o.fromLook, o.look, k);
      this.cam.position.copy(o.curPos);
      this.look.copy(o.curLook);
      this.cam.lookAt(this.look);
      return;
    }

    // Ziel (etwas über der Figur) nachziehen
    const ty = player.pos.y + 1.5;
    let yRate = player.onGround || player.swimming ? 7 : 2.2;
    if (ty < this.target.y - 2.5) yRate = 9;
    if (ty > this.target.y + 4) yRate = 5;
    this.target.x = damp(this.target.x, player.pos.x, 14, dt);
    this.target.z = damp(this.target.z, player.pos.z, 14, dt);
    this.target.y = damp(this.target.y, ty, yRate, dt);

    // Leinen-Prinzip: Winkel aus aktueller Kameraposition ableiten
    const dx = this.pos.x - this.target.x, dz = this.pos.z - this.target.z;
    if (dx * dx + dz * dz > 0.01) this.yaw = Math.atan2(dx, dz);

    // Manuelle Steuerung
    const camX = input.camX, camY = input.camY;
    const manual = Math.abs(camX) > 0.15 || Math.abs(camY) > 0.15 || input.camDragX || input.camDragY;
    this.yaw -= camX * 2.6 * dt + input.camDragX;
    this.pitch = clamp(this.pitch + camY * 1.4 * dt + input.camDragY, this.minPitch, this.maxPitch);
    if (manual) this.manualTimer = 1.4;
    else this.manualTimer -= dt;

    // Zentrieren hinter der Figur
    const behind = player.facing + Math.PI;
    if (this.recenter) {
      this.yaw = dampAngle(this.yaw, behind, 10, dt);
      this.pitch = damp(this.pitch, 0.32, 6, dt);
      if (Math.abs(angleDiff(this.yaw, behind)) < 0.03) this.recenter = false;
    } else if (this.manualTimer <= 0 && player.speedH > 2 && !player.swimming) {
      // leicht hinter die Figur drehen, aber nicht bei Lauf auf die Kamera zu
      const diff = angleDiff(this.yaw, behind);
      if (Math.abs(diff) < 1.9) this.yaw += diff * Math.min(1, dt * 0.9 * (player.speedH / 9));
    }

    // Kollision: Kamera näher heranholen, wenn etwas im Weg ist
    let want = this.dist;
    const steps = 14;
    this.placeFromYaw(want);
    for (let i = 3; i <= steps; i++) {
      const f = i / steps;
      _v.lerpVectors(this.target, this.pos, f);
      if (this.world.pointBlocked(_v.x, _v.y, _v.z)) {
        want = Math.max(2.2, this.dist * (f - 1 / steps));
        break;
      }
    }
    this.curDist = want < this.curDist ? damp(this.curDist, want, 18, dt) : damp(this.curDist, want, 3, dt);
    this.placeFromYaw(this.curDist);

    // Nicht unter den Boden / unter Wasser (außer beim Tauchen)
    const gy = this.world.terrainHeight(this.pos.x, this.pos.z) + 0.6;
    if (this.pos.y < gy) this.pos.y = gy;
    const wy = this.world.waterAt(this.pos.x, this.pos.z);
    if (!player.diving && this.pos.y < wy + 0.4 && wy > -Infinity) this.pos.y = wy + 0.4;

    this.cam.position.copy(this.pos);
    this.look.copy(this.target);
    this.cam.lookAt(this.look);
  }
}
