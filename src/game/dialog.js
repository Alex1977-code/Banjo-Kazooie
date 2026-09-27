// Textboxen mit Tipp-Effekt und Brabbel-Stimmen.
import { B } from '../engine/input.js';

export const NAMES = {
  bruno: 'Bruno',
  kiki: 'Kiki',
  tilda: 'Oma Tilda',
  nebelbart: 'Nebelbart',
  igel: 'Frau Stachelig',
  stupsi: 'Stupsi',
  eiche: 'Opa Eiche',
  pedro: 'Käpt\'n Pedro',
  knack: 'Käpt\'n Knack',
  stein: 'Lernstein',
};

export class Dialog {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('dialog');
    this.nameEl = this.el.querySelector('.dlg-name');
    this.textEl = this.el.querySelector('.dlg-text');
    this.portrait = this.el.querySelector('canvas');
    this.active = false;
    this.queue = [];
    this.resolve = null;
    this.el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.advance();
    });
  }

  // lines: [{who, text, name?}] – liefert ein Promise, das nach der letzten Zeile erfüllt ist.
  say(lines) {
    if (!Array.isArray(lines)) lines = [lines];
    if (this.game.skipping) return Promise.resolve();
    return new Promise((res) => {
      const run = () => {
        this.active = true;
        this.lines = lines;
        this.idx = 0;
        this.resolve = res;
        this.el.hidden = false;
        this.show();
      };
      if (this.active) this.queue.push(run);
      else run();
    });
  }

  show() {
    const l = this.lines[this.idx];
    this.who = l.who || 'default';
    this.nameEl.textContent = l.name || NAMES[this.who] || '';
    this.full = this.game.keyText(l.text);
    this.shown = 0;
    this.textEl.textContent = '';
    this.el.classList.remove('done');
    this.voiceCount = 0;
    this.game.portraits.draw(this.portrait, this.who);
    this.inputCool = 0.15;
  }

  advance() {
    if (!this.active || this.inputCool > 0) return;
    if (this.shown < this.full.length) {
      this.shown = this.full.length;
      this.textEl.textContent = this.full;
      this.el.classList.add('done');
      return;
    }
    this.game.audio.play('menu');
    this.idx++;
    if (this.idx < this.lines.length) this.show();
    else this.close();
  }

  close() {
    this.active = false;
    this.el.hidden = true;
    const r = this.resolve;
    this.resolve = null;
    r?.();
    const next = this.queue.shift();
    if (next) next();
  }

  // Sofort alles schließen (z.B. beim Überspringen)
  flush() {
    while (this.active) {
      this.idx = this.lines.length;
      this.close();
    }
  }

  update(dt, input) {
    if (!this.active) return;
    this.inputCool -= dt;
    if (this.game.skipping) {
      this.flush();
      return;
    }
    if (this.shown < this.full.length) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.full.length, this.shown + dt * 42);
      const now = Math.floor(this.shown);
      if (now !== before) {
        this.textEl.textContent = this.full.slice(0, now);
        for (let i = before; i < now; i++) {
          const ch = this.full[i];
          if (/[a-zäöüß]/i.test(ch) && this.voiceCount++ % 3 === 0) this.game.audio.voice(this.who);
        }
      }
      if (this.shown >= this.full.length) this.el.classList.add('done');
    }
    if (input.pressed(B.JUMP) || input.pressed(B.ATTACK)) this.advance();
  }
}
