// Alle Level werden erst bei Bedarf geladen.
export const LEVELS = {
  hub: () => import('./hub.js'),
  pilz: () => import('./pilzwald.js'),
  beach: () => import('./muschelbucht.js'),
  turm: () => import('./nebelturm.js'),
};
