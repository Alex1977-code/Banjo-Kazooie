// Alle Level werden erst bei Bedarf geladen.

// Anzahl aller Sonnensplitter im Spiel (bei neuen Splittern hier anpassen)
export const TOTAL_SHARDS = 15;
export const LEVELS = {
  hub: () => import('./hub.js'),
  pilz: () => import('./pilzwald.js'),
  beach: () => import('./muschelbucht.js'),
  turm: () => import('./nebelturm.js'),
};
