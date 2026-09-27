// Einstiegspunkt: lädt Schriften, baut das Spiel und startet den Titelbildschirm.
import { Game } from './game/game.js';

const bar = document.querySelector('.boot-bar div');
const setProgress = (p) => { bar.style.width = `${Math.round(p * 100)}%`; };

async function boot() {
  setProgress(0.1);
  try {
    await Promise.race([
      Promise.all([document.fonts.load('40px LuckiestGuy'), document.fonts.load('800 20px Nunito')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* Schriften sind nicht kritisch */ }
  setProgress(0.35);
  const game = new Game();
  window.game = game; // praktisch zum Debuggen
  setProgress(0.6);
  await game.loadTitleBackdrop();
  setProgress(1);
  game.start();
  const bootEl = document.getElementById('boot');
  bootEl.classList.add('gone');
  setTimeout(() => bootEl.remove(), 600);

  // Erste Berührung schaltet Audio frei (Browser-Vorgabe)
  const unlock = () => game.audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: false, passive: true });
  window.addEventListener('keydown', unlock, { passive: true });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot().catch((e) => {
  console.error(e);
  const b = document.getElementById('boot');
  if (b) b.insertAdjacentHTML('beforeend', `<p style="max-width:80vw;text-align:center">Fehler beim Start: ${String(e?.message || e)}</p>`);
});
