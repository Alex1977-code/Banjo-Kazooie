// Handy als Controller: Das Spiel (z.B. im Browser am Fernseher) wartet auf
// Verbindungen, das Handy öffnet controller.html und schickt Eingaben per
// WebRTC-Datenkanal (PeerJS). Die Verbindung selbst läuft direkt im WLAN.

export const PEER_PREFIX = 'bruno-kiki-tv-';

// Optional eigener PeerJS-Server: ?peer=host:port oder ?peer=https://host/pfad
export function peerOptions() {
  const v = new URLSearchParams(location.search).get('peer');
  if (!v) return {};
  try {
    const u = new URL(v.includes('://') ? v : `${location.protocol}//${v}`);
    return {
      host: u.hostname,
      port: +u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname || '/',
      secure: u.protocol === 'https:',
    };
  } catch {
    return {};
  }
}

const loaded = new Map();
export function loadScript(src) {
  if (!loaded.has(src)) {
    loaded.set(src, new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error(`${src} konnte nicht geladen werden`));
      document.head.appendChild(s);
    }));
  }
  return loaded.get(src);
}

export function makeQrCanvas(text, scale = 6) {
  /* global qrcode */
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const c = document.createElement('canvas');
  c.width = c.height = n * scale;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (qr.isDark(r, col)) ctx.fillRect(col * scale, r * scale, scale, scale);
  return c;
}

function randomCode() {
  const digits = '23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += digits[Math.floor(Math.random() * digits.length)];
  return s;
}

export class RemoteHost {
  constructor(game) {
    this.game = game;
    this.conns = new Set();
    this.code = null;
    this.peer = null;
  }

  async start({ onCode, onStatus }) {
    this.onCode = onCode;
    this.onStatus = onStatus;
    if (this.peer && this.code && !this.peer.destroyed) {
      this.announce();
      return;
    }
    await Promise.all([loadScript('vendor/peerjs.min.js'), loadScript('vendor/qrcode.js')]);
    this.open(randomCode());
  }

  open(code) {
    /* global Peer */
    this.code = code;
    const peer = new Peer(PEER_PREFIX + code, { debug: 0, ...peerOptions() });
    this.peer = peer;
    peer.on('open', () => this.announce());
    peer.on('connection', (conn) => this.attach(conn));
    peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        peer.destroy();
        this.open(randomCode());
      } else {
        this.onStatus?.(`Fehler: ${err.type || err.message}`);
      }
    });
  }

  controllerUrl() {
    const u = new URL('controller.html', location.href);
    const peer = new URLSearchParams(location.search).get('peer');
    u.search = peer ? `?peer=${encodeURIComponent(peer)}` : '';
    u.hash = this.code;
    return u.toString();
  }

  announce() {
    const url = this.controllerUrl();
    let qr = null;
    try { qr = makeQrCanvas(url); } catch { /* ohne QR geht es auch */ }
    this.onCode?.(this.code, url, qr);
    if (this.conns.size) this.onStatus?.(`${this.conns.size} Handy-Controller verbunden ✔`);
  }

  attach(conn) {
    const g = this.game;
    conn.on('open', () => {
      this.conns.add(conn);
      g.remoteConnected = true;
      g.input.setDevice('remote');
      g.updateTouchVisibility();
      g.toast('Handy-Controller verbunden!', 3);
      g.audio.play('ok');
      this.onStatus?.(`${this.conns.size} Handy-Controller verbunden ✔ – du kannst das Menü schließen.`);
      conn.send({ t: 'hello' });
    });
    conn.on('data', (m) => this.onData(m));
    const drop = () => {
      if (!this.conns.delete(conn)) return;
      if (!this.conns.size) {
        g.remoteConnected = false;
        g.input.remotePad.reset();
        g.updateTouchVisibility();
        g.toast('Handy-Controller getrennt', 3);
      }
    };
    conn.on('close', drop);
    conn.on('error', drop);
  }

  onData(m) {
    if (!m || m.t !== 'in') return;
    const p = this.game.input.remotePad;
    p.mx = +m.mx || 0;
    p.my = +m.my || 0;
    p.cx = +m.cx || 0;
    p.cy = +m.cy || 0;
    const b = m.b | 0;
    p.tapped |= b & ~p.held;
    p.held = b;
    p.dragX += +m.dx || 0;
    p.dragY += +m.dy || 0;
    p.touch();
    if (b || m.mx || m.my) this.game.input.setDevice('remote');
  }

  rumble(ms) {
    for (const c of this.conns) {
      try { c.send({ t: 'rumble', ms }); } catch { /* ignorieren */ }
    }
  }
}
