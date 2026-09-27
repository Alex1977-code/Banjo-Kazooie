// Vereinheitlichte Eingabe: Tastatur, Touch, Gamepads und Handy-Controller.
import { clamp } from './util.js';

export const B = {
  JUMP: 1,     // A
  ATTACK: 2,   // B
  CROUCH: 4,   // Z
  PAUSE: 8,    // Start
  RECENTER: 16,
  UP: 32, DOWN: 64, LEFT: 128, RIGHT: 256, // Menü / Steuerkreuz
  BACK: 512,
};

const KEYMAP = {
  Space: B.JUMP, KeyK: B.JUMP, Enter: B.JUMP,
  KeyJ: B.ATTACK, KeyX: B.ATTACK, KeyF: B.ATTACK,
  ShiftLeft: B.CROUCH, ShiftRight: B.CROUCH, KeyL: B.CROUCH, KeyC: B.CROUCH,
  Escape: B.PAUSE | B.BACK, KeyP: B.PAUSE, Backspace: B.BACK,
  KeyR: B.RECENTER, Tab: B.RECENTER,
  ArrowUp: B.UP, ArrowDown: B.DOWN, ArrowLeft: B.LEFT, ArrowRight: B.RIGHT,
  KeyW: B.UP, KeyS: B.DOWN, KeyA: B.LEFT, KeyD: B.RIGHT,
};

function dead(v, dz = 0.18) {
  const a = Math.abs(v);
  if (a < dz) return 0;
  return Math.sign(v) * Math.min(1, (a - dz) / (1 - dz));
}

// Eine Quelle, die von außen befüllt wird (Touch oder Handy-Controller).
export class VirtualPad {
  constructor(name) {
    this.name = name;
    this.mx = 0; this.my = 0; this.cx = 0; this.cy = 0;
    this.dragX = 0; this.dragY = 0;
    this.held = 0;
    this.tapped = 0; // kurze Tipps zwischen zwei Frames nicht verlieren
    this.lastActive = 0;
  }
  touch() { this.lastActive = performance.now(); }
  press(bits) { this.held |= bits; this.tapped |= bits; }
  reset() { this.mx = this.my = this.cx = this.cy = 0; this.held = 0; }
}

export class Input {
  constructor() {
    this.keys = new Set();
    this.keyTaps = new Set();
    this.touchPad = new VirtualPad('touch');
    this.remotePad = new VirtualPad('remote');
    this.moveX = 0; this.moveY = 0;
    this.camX = 0; this.camY = 0;
    this.camDragX = 0; this.camDragY = 0;
    this.held = 0; this.prev = 0; this.pressedMask = 0;
    this.device = matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard';
    this.gamepadConnected = false;
    this.onDeviceChange = null;
    this.navRepeat = 0;
    this.navHeldDir = 0;

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (KEYMAP[e.code] != null || e.code.startsWith('Arrow')) e.preventDefault();
      this.keys.add(e.code);
      this.keyTaps.add(e.code);
      this.setDevice('keyboard');
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    // Tippt jemand auf den Bildschirm, gilt wieder Touch (z.B. nach Trennen eines Controllers)
    window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') this.setDevice('touch'); }, { capture: true, passive: true });
    window.addEventListener('gamepadconnected', () => {
      this.gamepadConnected = true;
      this.setDevice('gamepad');
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadConnected = [...(navigator.getGamepads?.() || [])].some(Boolean);
      if (!this.gamepadConnected && this.device === 'gamepad') this.fallbackDevice();
    });
  }

  fallbackDevice() {
    this.setDevice(matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard');
  }

  setDevice(d) {
    if (this.device === d) return;
    this.device = d;
    this.onDeviceChange?.(d);
  }

  pressed(b) { return (this.pressedMask & b) !== 0; }
  isHeld(b) { return (this.held & b) !== 0; }

  // Einmal pro Frame aufrufen.
  update(dt) {
    let held = 0, mx = 0, my = 0, cx = 0, cy = 0;

    // Tastatur
    for (const k of this.keys) held |= KEYMAP[k] || 0;
    for (const k of this.keyTaps) held |= KEYMAP[k] || 0;
    this.keyTaps.clear();
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my -= 1;
    if (this.keys.has('KeyQ')) cx -= 1;
    if (this.keys.has('KeyE')) cx += 1;
    if (this.keys.has('PageUp')) cy -= 1;
    if (this.keys.has('PageDown')) cy += 1;
    const km = Math.hypot(mx, my);
    if (km > 1) { mx /= km; my /= km; }

    // Gamepads
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      const bt = (i) => gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5);
      let gh = 0;
      if (bt(0)) gh |= B.JUMP;
      if (bt(1) || bt(2)) gh |= B.ATTACK;
      if (bt(4) || bt(5) || bt(6) || bt(7)) gh |= B.CROUCH;
      if (bt(3) || bt(10) || bt(11)) gh |= B.RECENTER;
      if (bt(9)) gh |= B.PAUSE;
      if (bt(8)) gh |= B.PAUSE;
      if (bt(1)) gh |= B.BACK;
      if (bt(12)) gh |= B.UP;
      if (bt(13)) gh |= B.DOWN;
      if (bt(14)) gh |= B.LEFT;
      if (bt(15)) gh |= B.RIGHT;
      const ax = dead(gp.axes[0] || 0), ay = dead(gp.axes[1] || 0);
      const rx = dead(gp.axes[2] || 0), ry = dead(gp.axes[3] || 0);
      if (gh || ax || ay || rx || ry) this.setDevice('gamepad');
      held |= gh;
      if (Math.hypot(ax, ay) > Math.hypot(mx, my)) { mx = ax; my = -ay; }
      // D-Pad bewegt auch die Figur (für einfache Controller)
      if (!ax && !ay) {
        if (gh & B.LEFT) mx = -1;
        if (gh & B.RIGHT) mx = 1;
        if (gh & B.UP) my = 1;
        if (gh & B.DOWN) my = -1;
      }
      if (Math.abs(rx) > Math.abs(cx)) cx = rx;
      if (Math.abs(ry) > Math.abs(cy)) cy = ry;
    }

    // Handy-Controller: kommt länger nichts an (Handy gesperrt, WLAN weg), loslassen
    const rp = this.remotePad;
    if (rp.lastActive && performance.now() - rp.lastActive > 800 && (rp.held || rp.mx || rp.my)) rp.reset();

    // Touch & Handy-Controller
    for (const p of [this.touchPad, this.remotePad]) {
      held |= p.held | p.tapped;
      p.tapped = 0;
      if (Math.hypot(p.mx, p.my) > Math.hypot(mx, my)) { mx = p.mx; my = p.my; }
      if (Math.abs(p.cx) > Math.abs(cx)) cx = p.cx;
      if (Math.abs(p.cy) > Math.abs(cy)) cy = p.cy;
    }
    this.camDragX = this.touchPad.dragX + this.remotePad.dragX;
    this.camDragY = this.touchPad.dragY + this.remotePad.dragY;
    this.touchPad.dragX = this.touchPad.dragY = 0;
    this.remotePad.dragX = this.remotePad.dragY = 0;

    this.moveX = clamp(mx, -1, 1);
    this.moveY = clamp(my, -1, 1);
    this.camX = cx;
    this.camY = cy;

    // Menü-Navigation mit Stick (inkl. Wiederholung beim Halten)
    let dir = 0;
    if (my > 0.6) dir = B.UP;
    else if (my < -0.6) dir = B.DOWN;
    else if (mx < -0.6) dir = B.LEFT;
    else if (mx > 0.6) dir = B.RIGHT;
    let navPressed = 0;
    if (dir && dir !== this.navHeldDir) {
      navPressed = dir;
      this.navRepeat = 0.4;
    } else if (dir) {
      this.navRepeat -= dt;
      if (this.navRepeat <= 0) {
        navPressed = dir;
        this.navRepeat = 0.14;
      }
    }
    this.navHeldDir = dir;

    this.prev = this.held;
    this.held = held;
    this.pressedMask = (held & ~this.prev) | navPressed;
  }

  // Controller-Vibration (Gamepad + Handy-Controller + Touch-Handy)
  rumble(ms = 120, strength = 0.6) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      gp?.vibrationActuator?.playEffect?.('dual-rumble', {
        duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6,
      }).catch?.(() => {});
    }
    this.onRumble?.(ms);
    if (this.device === 'touch' && this.vibrate && navigator.vibrate) navigator.vibrate(Math.min(ms, 80));
  }
}
