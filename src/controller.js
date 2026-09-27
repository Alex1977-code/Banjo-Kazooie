// Handy-Controller: schickt Touch-Eingaben per WebRTC an das Spiel am Fernseher.
import { VirtualPad } from './engine/input.js';
import { TouchControls } from './engine/touch.js';
import { PEER_PREFIX, loadScript } from './engine/remote.js';

const $ = (s) => document.querySelector(s);
const statusEl = $('#status');
const codeInput = $('#code');
const pad = new VirtualPad('remote');
let conn = null;
let peer = null;
let sendTimer = null;
let wakeLock = null;

codeInput.value = (location.hash || '').replace('#', '').slice(0, 4);

async function connect() {
  const code = codeInput.value.trim();
  if (!/^\d{4}$/.test(code)) {
    statusEl.textContent = 'Der Code hat 4 Ziffern.';
    return;
  }
  statusEl.textContent = 'Verbinde ...';
  document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  try {
    await loadScript('vendor/peerjs.min.js');
  } catch (e) {
    statusEl.textContent = e.message;
    return;
  }
  /* global Peer */
  if (peer) peer.destroy();
  peer = new Peer({ debug: 0 });
  peer.on('error', (err) => {
    statusEl.textContent = err.type === 'peer-unavailable'
      ? 'Kein Spiel mit diesem Code gefunden. Stimmt der Code?'
      : `Fehler: ${err.type || err.message}`;
    showConnect();
  });
  peer.on('open', () => {
    conn = peer.connect(PEER_PREFIX + code, { reliable: true, serialization: 'json' });
    conn.on('open', () => {
      $('#code-label').textContent = code;
      showPad();
      startSending();
      navigator.vibrate?.(60);
    });
    conn.on('data', (m) => {
      if (m?.t === 'rumble') navigator.vibrate?.(Math.min(200, m.ms || 80));
    });
    conn.on('close', () => {
      statusEl.textContent = 'Verbindung beendet.';
      showConnect();
    });
  });
}

function showPad() {
  $('#connect').hidden = true;
  $('#pad').hidden = false;
  document.body.classList.add('playing');
  touch.setVisible(true);
  requestWake();
}

function showConnect() {
  stopSending();
  $('#connect').hidden = false;
  $('#pad').hidden = true;
  document.body.classList.remove('playing');
  touch.setVisible(false);
}

let last = '';
function startSending() {
  stopSending();
  sendTimer = setInterval(() => sendState(false), 33);
}
function stopSending() {
  if (sendTimer) clearInterval(sendTimer);
  sendTimer = null;
}

function sendState(force) {
  if (!conn || !conn.open) return;
  const b = pad.held | pad.tapped;
  pad.tapped = 0;
  const msg = {
    t: 'in',
    mx: +pad.mx.toFixed(2), my: +pad.my.toFixed(2),
    cx: 0, cy: 0,
    b,
    dx: +pad.dragX.toFixed(4), dy: +pad.dragY.toFixed(4),
  };
  pad.dragX = pad.dragY = 0;
  const key = `${msg.mx},${msg.my},${msg.b},${msg.dx},${msg.dy}`;
  if (!force && key === last && !msg.dx && !msg.dy) return;
  last = key;
  conn.send(msg);
}

async function requestWake() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch { /* nicht schlimm */ }
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !$('#pad').hidden) requestWake();
});

const touch = new TouchControls($('#touch'), pad);
touch.setVisible(false);
// Knopfdrücke sofort senden (nicht erst im nächsten Takt)
$('#touch').addEventListener('pointerdown', () => setTimeout(() => sendState(true), 0));
$('#touch').addEventListener('pointerup', () => setTimeout(() => sendState(true), 0));

$('#go').addEventListener('click', connect);
codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') connect(); });
// Über den QR-Code kommt der Code gleich mit – dann direkt verbinden
if (codeInput.value.length === 4) connect();
void wakeLock;
