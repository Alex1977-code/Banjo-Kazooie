// Touch-Steuerung: dynamischer Joystick links, A/B/Z-Knöpfe rechts,
// Wischen auf der rechten Seite dreht die Kamera.
import { B } from './input.js';

export class TouchControls {
  constructor(root, pad) {
    this.pad = pad;
    this.root = root;
    this.visible = false;
    this.pointers = new Map();
    this.stickId = null;
    this.R = 56;

    root.innerHTML = `
      <div class="stick-base" hidden><div class="stick-knob"></div></div>
      <div class="stick-hint">Bewegen</div>
      <button class="tbtn tbtn-a" data-btn="${B.JUMP}"><b>A</b><small>Sprung</small></button>
      <button class="tbtn tbtn-b" data-btn="${B.ATTACK}"><b>B</b><small>Angriff</small></button>
      <button class="tbtn tbtn-z" data-btn="${B.CROUCH}"><b>Z</b><small>Ducken</small></button>
      <button class="tbtn tbtn-cam" data-btn="${B.RECENTER}" aria-label="Kamera zentrieren">
        <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm8 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/></svg>
      </button>
      <button class="tbtn tbtn-pause" data-btn="${B.PAUSE}" aria-label="Pause">
        <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>
      </button>`;
    this.base = root.querySelector('.stick-base');
    this.knob = root.querySelector('.stick-knob');
    this.hint = root.querySelector('.stick-hint');
    this.btnB = root.querySelector('.tbtn-b small');

    const opts = { passive: false };
    root.addEventListener('pointerdown', (e) => this.down(e), opts);
    root.addEventListener('pointermove', (e) => this.move(e), opts);
    root.addEventListener('pointerup', (e) => this.up(e), opts);
    root.addEventListener('pointercancel', (e) => this.up(e), opts);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setVisible(v) {
    this.visible = v;
    this.root.hidden = !v;
    if (!v) {
      this.pointers.clear();
      this.stickId = null;
      this.base.hidden = true;
      this.pad.reset();
    }
  }

  // Während Dialogen/Cutscenes: Knöpfe ausblenden, jeder Tipp blättert weiter
  setDialogMode(on) {
    if (this.dialogMode === on) return;
    this.dialogMode = on;
    this.root.classList.toggle('dialog-mode', on);
    if (on) {
      this.stickId = null;
      this.base.hidden = true;
      this.pad.mx = this.pad.my = 0;
    }
  }

  setLabel(which, text) {
    if (which === 'B' && this.btnB.textContent !== text) this.btnB.textContent = text;
  }

  btnAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const b = el?.closest?.('.tbtn');
    return b && this.root.contains(b) ? b : null;
  }

  recomputeHeld() {
    let h = 0;
    for (const p of this.pointers.values()) if (p.kind === 'btn' && p.btn) h |= +p.btn.dataset.btn;
    this.pad.tapped |= h & ~this.pad.held;
    this.pad.held = h;
    for (const b of this.root.querySelectorAll('.tbtn')) {
      let on = false;
      for (const p of this.pointers.values()) if (p.btn === b) on = true;
      b.classList.toggle('on', on);
    }
  }

  down(e) {
    e.preventDefault();
    this.pad.touch();
    this.root.setPointerCapture?.(e.pointerId);
    const btn = this.btnAt(e.clientX, e.clientY);
    if (this.dialogMode && !btn?.classList.contains('tbtn-pause')) {
      this.pad.tapped |= B.JUMP;
      return;
    }
    if (btn) {
      this.pointers.set(e.pointerId, { kind: 'btn', btn });
      this.recomputeHeld();
      return;
    }
    const w = window.innerWidth;
    if (e.clientX < w * 0.5 && this.stickId == null) {
      this.stickId = e.pointerId;
      const x = Math.max(this.R + 10, Math.min(w * 0.5 - this.R, e.clientX));
      const y = Math.max(this.R + 10, Math.min(window.innerHeight - this.R - 10, e.clientY));
      this.pointers.set(e.pointerId, { kind: 'stick', ox: x, oy: y });
      this.base.hidden = false;
      this.base.style.transform = `translate(${x - this.R}px, ${y - this.R}px)`;
      this.knob.style.transform = 'translate(0px, 0px)';
      this.hint.classList.add('gone');
      this.move(e);
    } else {
      this.pointers.set(e.pointerId, { kind: 'cam', lx: e.clientX, ly: e.clientY });
    }
  }

  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    this.pad.touch();
    if (p.kind === 'stick') {
      let dx = e.clientX - p.ox, dy = e.clientY - p.oy;
      const d = Math.hypot(dx, dy);
      if (d > this.R) { dx *= this.R / d; dy *= this.R / d; }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      let mx = dx / this.R, my = -dy / this.R;
      const m = Math.hypot(mx, my);
      if (m < 0.12) mx = my = 0;
      this.pad.mx = mx;
      this.pad.my = my;
    } else if (p.kind === 'cam') {
      const dx = e.clientX - p.lx, dy = e.clientY - p.ly;
      p.lx = e.clientX; p.ly = e.clientY;
      const s = 3.2 / window.innerWidth;
      this.pad.dragX += dx * s;
      this.pad.dragY += dy * s * 0.7;
    } else if (p.kind === 'btn') {
      // Zwischen Knöpfen wischen (z.B. Z -> A für den Hochsprung)
      const b = this.btnAt(e.clientX, e.clientY);
      if (b && b !== p.btn && !b.classList.contains('tbtn-pause') && !b.classList.contains('tbtn-cam')) {
        p.btn = b;
        this.recomputeHeld();
      }
    }
  }

  up(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (p.kind === 'stick') {
      this.stickId = null;
      this.base.hidden = true;
      this.pad.mx = this.pad.my = 0;
    }
    this.recomputeHeld();
  }
}
