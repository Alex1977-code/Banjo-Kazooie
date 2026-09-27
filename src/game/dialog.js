// Textboxen mit Tipp-Effekt und Brabbel-Stimmen.
import { B } from '../engine/input.js';

export const NAMES = {
  bruno: 'Bruno',
  kiki: 'Kiki',
  tilo: 'Opa Tilo',
  koenig: 'König Krötus',
  igel: 'Frau Stachelig',
  stupsi: 'Stupsi',
  eiche: 'Opa Eiche',
  kapitaen: 'Käpt\'n Barnabas',
  knack: 'Käpt\'n Knack',
  stein: 'Lernstein',
  pilz: 'Pauli Pilz',
  lotti: 'Lotti Langsam',
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

  // Frage mit Antwortmöglichkeiten – liefert den gewählten Index (letzte Option = Abbrechen)
  choose(who, text, options) {
    if (this.game.skipping) return Promise.resolve(options.length - 1);
    return new Promise((res) => {
      this.say([{ who, text }]).then(() => {});
      this.choice = { options, idx: 0, res };
      this.renderChoice();
    });
  }

  renderChoice() {
    let box = this.el.querySelector('.dlg-choices');
    if (!box) {
      box = document.createElement('div');
      box.className = 'dlg-choices';
      this.el.querySelector('.dlg-body').append(box);
    }
    box.innerHTML = '';
    this.choice.options.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'dlg-choice' + (i === this.choice.idx ? ' sel' : '');
      b.textContent = o;
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.choice.idx = i;
        this.pick();
      });
      box.append(b);
    });
    this.el.classList.add('choosing');
  }

  pick() {
    const c = this.choice;
    if (!c || this.shown < this.full.length) return;
    this.choice = null;
    this.el.classList.remove('choosing');
    this.el.querySelector('.dlg-choices')?.remove();
    this.game.audio.play('ok');
    this.idx = this.lines.length;
    this.close();
    c.res(c.idx);
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
    if (this.choice && this.shown >= this.full.length) return;
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
    if (this.choice) {
      const c = this.choice;
      this.choice = null;
      this.el.classList.remove('choosing');
      this.el.querySelector('.dlg-choices')?.remove();
      c.res(c.options.length - 1);
    }
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
    if (this.choice && this.shown >= this.full.length) {
      const c = this.choice, n = c.options.length;
      if (input.pressed(B.UP) || input.pressed(B.LEFT)) { c.idx = (c.idx + n - 1) % n; this.renderChoice(); this.game.audio.play('menu'); }
      if (input.pressed(B.DOWN) || input.pressed(B.RIGHT)) { c.idx = (c.idx + 1) % n; this.renderChoice(); this.game.audio.play('menu'); }
      // auf dem Handy nur per direktem Tipp auf eine Antwort (kein versehentlicher Kauf)
      if (input.pressed(B.JUMP) && this.inputCool <= 0 && this.game.input.device !== 'touch') this.pick();
      else if (input.pressed(B.ATTACK) && this.inputCool <= 0) { c.idx = n - 1; this.pick(); }
      return;
    }
    if (input.pressed(B.JUMP) || input.pressed(B.ATTACK)) this.advance();
  }
}
