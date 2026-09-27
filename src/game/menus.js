// Menüs: Titel, Pause, Optionen, Steuerung, TV-Modus. Bedienbar per Touch,
// Maus, Tastatur und Controller.
import { B } from '../engine/input.js';
import { QUALITY } from '../engine/renderer.js';

const $ = (s) => document.querySelector(s);

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  for (const c of children) if (c != null) el.append(c);
  return el;
}

export class Menus {
  constructor(game) {
    this.game = game;
    this.root = $('#screens');
    this.stack = [];
  }

  get top() { return this.stack[this.stack.length - 1]; }

  push(screen) {
    if (this.top) this.top.el.hidden = true;
    this.stack.push(screen);
    this.root.append(screen.el);
    screen.focus = 0;
    this.focusItem(0);
  }

  pop() {
    const s = this.stack.pop();
    s?.el.remove();
    s?.onClose?.();
    if (this.top) {
      this.top.el.hidden = false;
      this.top.refresh?.();
      this.focusItem(this.top.focus || 0);
    }
  }

  clear() {
    while (this.stack.length) this.pop();
  }

  focusItem(i) {
    const s = this.top;
    if (!s || !s.items.length) return;
    s.focus = (i + s.items.length) % s.items.length;
    s.items.forEach((it, k) => it.el.classList.toggle('focus', k === s.focus && this.game.input.device !== 'touch'));
    s.items[s.focus].el.scrollIntoView?.({ block: 'nearest' });
  }

  update(dt, input) {
    const s = this.top;
    if (!s) return;
    const a = this.game.audio;
    if (input.pressed(B.UP)) { this.focusItem(s.focus - 1); a.play('menu'); }
    if (input.pressed(B.DOWN)) { this.focusItem(s.focus + 1); a.play('menu'); }
    const it = s.items[s.focus];
    if (input.pressed(B.LEFT) && it?.left) { it.left(); a.play('menu'); }
    if (input.pressed(B.RIGHT) && it?.right) { it.right(); a.play('menu'); }
    if (input.pressed(B.JUMP) && it) {
      a.unlock();
      a.play('ok');
      it.act?.();
    }
    if ((input.pressed(B.BACK) || input.pressed(B.ATTACK) || (input.pressed(B.PAUSE) && s.pauseCloses)) && s.back) {
      a.play('back');
      s.back();
    }
  }

  // ---------- Bausteine ----------
  button(label, act, cls = '') {
    const el = h('button', { class: `mbtn ${cls}` }, label);
    const item = { el, act };
    el.addEventListener('click', () => {
      this.game.audio.unlock();
      this.game.audio.play('ok');
      act();
    });
    el.addEventListener('pointerenter', () => {
      const s = this.top;
      if (s) {
        const i = s.items.indexOf(item);
        if (i >= 0 && this.game.input.device !== 'touch') this.focusItem(i);
      }
    });
    return item;
  }

  option(label, get, values, set) {
    const valEl = h('span');
    const upd = () => { valEl.textContent = values.find((v) => v[0] === get())?.[1] ?? String(get()); };
    const step = (d) => {
      const i = values.findIndex((v) => v[0] === get());
      const n = values[(i + d + values.length) % values.length][0];
      set(n);
      upd();
    };
    const el = h('div', { class: 'opt' },
      h('label', {}, label),
      h('div', { class: 'val' },
        h('button', { onclick: () => step(-1), 'aria-label': 'weniger' }, '‹'),
        valEl,
        h('button', { onclick: () => step(1), 'aria-label': 'mehr' }, '›')));
    upd();
    return { el, left: () => step(-1), right: () => step(1), act: () => step(1) };
  }

  screen({ dim = true, items = [], content = [], back, pauseCloses = false }) {
    const el = h('div', { class: `screen${dim ? ' dim' : ''}` }, ...content);
    return { el, items, back, pauseCloses };
  }

  // ---------- Titel ----------
  openTitle() {
    const g = this.game;
    g.mode = 'title';
    this.clear();
    const hasSave = g.save.hasProgress();
    const menu = h('div', { class: 'menu' });
    const items = [];
    const startGame = async (fresh) => {
      g.audio.unlock();
      this.requestFullscreen();
      if (fresh) g.save.reset();
      this.clear();
      g.mode = 'loading';
      await g.enterLevel(fresh ? 'hub' : 'hub', fresh ? 'start' : 'start', { fromTitle: true });
    };
    if (hasSave) items.push(this.button('Weiterspielen', () => startGame(false)));
    items.push(this.button('Neues Spiel', () => {
      if (hasSave) this.confirm('Neues Spiel beginnen? Der alte Spielstand wird gelöscht.', () => startGame(true));
      else startGame(true);
    }, hasSave ? 'secondary' : ''));
    items.push(this.button('Optionen', () => this.openOptions(), 'secondary'));
    items.push(this.button('Steuerung', () => this.openHelp(), 'secondary'));
    items.push(this.button('Fernseher & Controller', () => this.openTV(), 'secondary'));
    items.forEach((i) => menu.append(i.el));
    const s = this.screen({
      dim: false,
      items,
      content: [
        h('div', { class: 'logo', html: 'Bruno <em>&amp;</em> Kiki' }),
        h('div', { class: 'subtitle' }, 'Das Geheimnis des Sonnensteins'),
        menu,
      ],
    });
    this.push(s);
    g.hud.show(false);
    g.touch.setVisible(false);
    document.body.classList.remove('playing');
    g.audio.playMusic('title');
  }

  requestFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen && matchMedia('(pointer: coarse)').matches) {
      el.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
    }
  }

  confirm(text, yes) {
    const items = [
      this.button('Ja', () => { this.pop(); yes(); }),
      this.button('Nein', () => this.pop(), 'secondary'),
    ];
    const menu = h('div', { class: 'menu' });
    items.forEach((i) => menu.append(i.el));
    this.push(this.screen({ items, back: () => this.pop(), content: [h('div', { class: 'panel' }, h('h2', {}, 'Sicher?'), h('p', { class: 'help' }, text), menu)] }));
  }

  // ---------- Pause ----------
  openPause() {
    const g = this.game;
    if (g.mode !== 'play') return;
    g.mode = 'paused';
    g.audio.play('back');
    g.touch.setVisible(false);
    const L = g.level;
    const resume = () => {
      this.clear();
      g.mode = 'play';
      g.updateTouchVisibility();
    };
    const items = [this.button('Weiter', resume)];
    if (L.id !== 'hub') {
      items.push(this.button('Zurück zum Wurzelhügel', () => {
        this.clear();
        g.mode = 'play';
        g.enterLevel('hub', `from-${L.id}`);
      }, 'secondary'));
    }
    items.push(this.button('Optionen', () => this.openOptions(), 'secondary'));
    items.push(this.button('Steuerung', () => this.openHelp(), 'secondary'));
    items.push(this.button('Fernseher & Controller', () => this.openTV(), 'secondary'));
    items.push(this.button('Hauptmenü', () => {
      this.clear();
      g.save.write();
      g.mode = 'title';
      g.loadTitleBackdrop().then(() => this.openTitle());
    }, 'secondary'));
    const menu = h('div', { class: 'menu' });
    items.forEach((i) => menu.append(i.el));
    const moves = g.save.data.moves;
    const learned = ['Sprung', 'Flattersprung', 'Rolle', 'Schnabelhieb']
      .concat(moves.highjump ? ['Hochsprung'] : [], moves.pound ? ['Stampfer'] : [], moves.dive ? ['Tauchen'] : []);
    const stat = (ico, val, label) => h('div', { class: 'stat' }, h('i', { class: `ico ${ico}` }), h('b', {}, val), h('small', {}, label));
    const panel = h('div', { class: 'panel' },
      h('h2', {}, L.name),
      h('div', { class: 'stats' },
        stat('ico-shard', `${g.save.levelShards(L.id)}/${L.shardTotal}`, 'Splitter hier'),
        stat('ico-shard', `${g.save.totalShards()}`, 'Splitter gesamt'),
        stat('ico-berry', `${L.berries.count}/${L.berries.total}`, 'Beeren hier'),
        L.fireflyTotal ? stat('ico-firefly', `${g.save.levelFireflies(L.id)}/${L.fireflyTotal}`, 'Glühwürmchen') : null),
      h('p', { class: 'help', style: 'text-align:center;margin:0 0 12px' }, `Fähigkeiten: ${learned.join(' · ')}`),
      menu);
    this.push(this.screen({ items, back: resume, pauseCloses: true, content: [panel] }));
  }

  // ---------- Optionen ----------
  openOptions() {
    const g = this.game, s = g.save.data.settings;
    const set = (k) => (v) => { s[k] = v; g.save.write(); g.applySettings(); };
    const vol = [...Array(11)].map((_, i) => [i / 10, i === 0 ? 'Aus' : `${i * 10} %`]);
    const onoff = [[true, 'An'], [false, 'Aus']];
    const items = [
      this.option('Grafik', () => s.quality, Object.entries(QUALITY).map(([k, v]) => [k, v.label]), set('quality')),
      this.option('Pixel-Look', () => s.pixel, onoff, set('pixel')),
      this.option('Musik', () => s.music, vol, set('music')),
      this.option('Effekte', () => s.sfx, vol, set('sfx')),
      this.option('Vibration', () => s.vibrate, onoff, set('vibrate')),
      this.option('Kamera hoch/runter umkehren', () => s.invertY, onoff, set('invertY')),
      this.option('Kamera-Tempo', () => s.camSpeed, [[0.5, 'Langsam'], [0.75, 'Gemütlich'], [1, 'Normal'], [1.5, 'Schnell']], set('camSpeed')),
    ];
    const reset = this.button('Spielstand löschen', () => this.confirm('Wirklich den kompletten Spielstand löschen?', () => {
      g.save.reset();
      location.reload();
    }), 'secondary');
    const back = this.button('Zurück', () => this.pop());
    items.push(reset, back);
    const panel = h('div', { class: 'panel' }, h('h2', {}, 'Optionen'));
    items.forEach((i) => panel.append(i.el));
    reset.el.style.marginTop = '10px';
    reset.el.style.width = back.el.style.width = '100%';
    back.el.style.marginTop = '8px';
    this.push(this.screen({ items, back: () => this.pop(), content: [panel] }));
  }

  // ---------- Steuerung ----------
  openHelp() {
    const back = this.button('Zurück', () => this.pop());
    back.el.style.width = '100%';
    const panel = h('div', { class: 'panel help', html: `
      <h2>Steuerung</h2>
      <table>
        <tr><td></td><td><b>Handy</b></td><td><b>Controller</b></td><td><b>Tastatur</b></td></tr>
        <tr><td>Laufen</td><td>linke Hälfte wischen</td><td>linker Stick</td><td>WASD / Pfeile</td></tr>
        <tr><td>Kamera</td><td>rechte Hälfte wischen</td><td>rechter Stick</td><td>Q / E</td></tr>
        <tr><td>Springen</td><td>A</td><td>A / Kreuz</td><td>Leertaste</td></tr>
        <tr><td>Angriff / Reden</td><td>B</td><td>B / X</td><td>J</td></tr>
        <tr><td>Ducken</td><td>Z</td><td>Schultertasten</td><td>Shift / K</td></tr>
        <tr><td>Pause</td><td>II oben rechts</td><td>Start</td><td>Esc</td></tr>
      </table>
      <h3>Bewegungen</h3>
      <table>
        <tr><td>Flattersprung</td><td>In der Luft nochmal A drücken und halten – Kiki flattert.</td></tr>
        <tr><td>Rolle</td><td>B am Boden – rollt in Gegner hinein.</td></tr>
        <tr><td>Schnabelhieb</td><td>B in der Luft – Kiki pickt nach vorn.</td></tr>
        <tr><td>Hochsprung*</td><td>Z halten, dann A – ganz hoch hinaus.</td></tr>
        <tr><td>Stampfer*</td><td>Z in der Luft – zerbricht rissige Steine.</td></tr>
        <tr><td>Tauchen*</td><td>Z im Wasser, A schwimmt nach oben.</td></tr>
      </table>
      <p>* lernst du an den leuchtenden Lernsteinen.</p>` });
    panel.append(back.el);
    this.push(this.screen({ items: [back], back: () => this.pop(), content: [panel] }));
  }

  // ---------- Fernseher & Controller ----------
  openTV() {
    const g = this.game;
    const status = h('div', { class: 'tv-status' }, '');
    const codeEl = h('div', { class: 'tv-code' }, '····');
    const qr = h('div', { class: 'tv-qr' });
    const urlEl = h('div', { class: 'tv-url' });
    const hostArea = h('div', {}, codeEl, qr, urlEl, status);
    hostArea.hidden = true;
    const startHost = this.button('Handy als Controller verbinden', async () => {
      hostArea.hidden = false;
      startHost.el.hidden = true;
      status.textContent = 'Verbinde mit dem Server ...';
      try {
        const { RemoteHost } = await import('../engine/remote.js');
        if (!g.remote) g.remote = new RemoteHost(g);
        await g.remote.start({
          onCode: (code, url, qrCanvas) => {
            codeEl.textContent = code;
            urlEl.textContent = url;
            qr.innerHTML = '';
            if (qrCanvas) qr.append(qrCanvas);
            status.textContent = 'Scanne den QR-Code mit dem Handy oder öffne die Adresse und gib den Code ein.';
          },
          onStatus: (t) => { status.textContent = t; },
        });
      } catch (e) {
        status.textContent = 'Verbindung nicht möglich (Internet nötig): ' + (e?.message || e);
      }
    }, 'secondary');
    const back = this.button('Zurück', () => this.pop());
    const panel = h('div', { class: 'panel help', html: `
      <h2>Fernseher & Controller</h2>
      <h3>1. Handy auf den Fernseher streamen</h3>
      <p>Bildschirm spiegeln (Android: „Smart View“/„Übertragen“, iPhone: „AirPlay“ bzw. „Bildschirmsynchronisierung“) und einen Bluetooth-Controller mit dem Handy koppeln. Das Spiel erkennt den Controller automatisch und blendet die Touch-Knöpfe aus.</p>
      <h3>2. Spiel direkt am Fernseher, Handy als Controller</h3>
      <p>Öffne das Spiel im Browser des Fernsehers, der Konsole oder eines Laptops am HDMI-Anschluss. Dort hier auf „Handy als Controller verbinden“ tippen und den QR-Code mit dem Handy scannen. Controller am Fernseher/PC funktionieren natürlich auch direkt.</p>` });
    const menu = h('div', { class: 'menu' }, startHost.el, back.el);
    panel.append(hostArea, menu);
    if (g.remote?.code) {
      startHost.act();
    }
    this.push(this.screen({ items: [startHost, back], back: () => this.pop(), content: [panel] }));
  }

  // ---------- Abspann ----------
  openCredits(stats) {
    const g = this.game;
    g.mode = 'menu';
    g.touch.setVisible(false);
    const cont = this.button('Weiter erkunden', () => {
      this.clear();
      g.mode = 'play';
      g.updateTouchVisibility();
    });
    const panel = h('div', { class: 'panel credits' },
      h('h2', {}, 'Ende'),
      h('p', {}, 'Der Sonnenstein strahlt wieder über dem Wurzeltal!'),
      h('p', {}, `Sonnensplitter: ${stats.shards} · Beeren: ${stats.berries} · Spielzeit: ${stats.time}`),
      h('p', { style: 'opacity:.8;font-size:15px' }, 'Bruno & Kiki – ein Fan-Projekt im Geiste der N64-Jump\'n\'Runs. Alle Figuren, Musik und Grafiken sind eigens für dieses Spiel erstellt.'),
      h('div', { class: 'menu' }, cont.el));
    this.push(this.screen({ items: [cont], content: [panel] }));
  }
}
