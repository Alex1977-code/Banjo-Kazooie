// Anzeige am Bildschirmrand: Herzen, Zähler, Hinweise, Banner.
const $ = (s) => document.querySelector(s);

export class Hud {
  constructor() {
    this.el = $('#hud');
    this.hearts = $('#hearts');
    this.shards = $('#cnt-shards');
    this.berries = $('#cnt-berries');
    this.fireflies = $('#cnt-fireflies');
    this.toastEl = $('#toast');
    this.bannerEl = $('#banner');
    this.titleEl = $('#level-title');
    this.promptEl = $('#prompt');
    // Stoppuhr fürs Zeitrennen
    this.raceEl = document.createElement('div');
    this.raceEl.id = 'race';
    this.raceEl.hidden = true;
    this.raceEl.innerHTML = '<b></b><small></small>';
    this.el.append(this.raceEl);
    this.air = $('#air');
    this.airFill = this.air.querySelector('.air-fill');
    this.toastT = 0;
    this.bannerT = 0;
    this.titleT = 0;
    this.health = -1;
  }

  show(v) { this.el.hidden = !v; }

  setHealth(h, max) {
    if (this.hearts.children.length !== max) {
      this.hearts.innerHTML = '';
      for (let i = 0; i < max; i++) {
        const d = document.createElement('div');
        d.className = 'heart';
        this.hearts.appendChild(d);
      }
    }
    [...this.hearts.children].forEach((d, i) => {
      const full = i < h;
      if (full && d.classList.contains('empty')) {
        d.classList.remove('pop');
        void d.offsetWidth;
        d.classList.add('pop');
      }
      d.classList.toggle('empty', !full);
    });
    this.health = h;
  }

  bump(el, text) {
    const span = el.querySelector('span');
    if (span.textContent !== String(text)) {
      span.textContent = text;
      el.classList.add('bump');
      setTimeout(() => el.classList.remove('bump'), 150);
    }
  }
  setRace(main, sub = '') {
    this.raceEl.hidden = main == null;
    if (main == null) return;
    this.raceEl.firstChild.textContent = main;
    this.raceEl.lastChild.textContent = sub;
  }

  setShards(n) { this.bump(this.shards, n); }
  setBerries(n, total) { this.bump(this.berries, total ? `${n}/${total}` : n); }
  setFireflies(n, total) {
    this.fireflies.hidden = !total;
    if (total) this.bump(this.fireflies, `${n}/${total}`);
  }

  toast(text, sec = 2.5) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastT = sec;
  }

  banner(text, sub = '', sec = 2.5) {
    this.bannerEl.innerHTML = '';
    this.bannerEl.append(text);
    if (sub) {
      const s = document.createElement('small');
      s.textContent = sub;
      this.bannerEl.append(s);
    }
    this.bannerEl.classList.add('show');
    this.bannerT = sec;
  }

  levelTitle(name, sub = '') {
    this.titleEl.querySelector('span').textContent = name;
    this.titleEl.querySelector('small').textContent = sub;
    this.titleEl.classList.add('show');
    this.titleT = 3;
  }

  setPrompt(label, key = 'B') {
    if (!label) {
      this.promptEl.classList.remove('show');
      this.promptLabel = null;
      return;
    }
    if (this.promptLabel !== label || this.promptKey !== key) {
      this.promptEl.innerHTML = `<b>${key}</b><span></span>`;
      this.promptEl.querySelector('span').textContent = label;
      this.promptLabel = label;
      this.promptKey = key;
    }
    this.promptEl.classList.add('show');
  }

  setBoss(frac, name) {
    const el = $('#bossbar');
    if (frac == null) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    if (name) el.querySelector('span').textContent = name;
    el.querySelector('.fill').style.width = `${Math.max(0, frac) * 100}%`;
  }

  setAir(v, show) {
    this.air.hidden = !show;
    if (show) this.airFill.style.width = `${Math.round(v * 100)}%`;
  }

  update(dt) {
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) this.toastEl.classList.remove('show');
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) this.bannerEl.classList.remove('show');
    if (this.titleT > 0 && (this.titleT -= dt) <= 0) this.titleEl.classList.remove('show');
  }
}
