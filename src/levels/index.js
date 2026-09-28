// Alle Level werden erst bei Bedarf geladen.

// Anzahl aller Sonnensplitter und Goldfedern im Spiel (bei Änderungen hier anpassen)
export const TOTAL_SHARDS = 19;
export const FEATHER_TOTAL = 4;

// Reihenfolge und Namen für die Fortschrittsübersicht im Pausenmenü
export const WORLDS = [
  { id: 'hub', name: 'Wurzelhügel' },
  { id: 'pilz', name: 'Pilzwald' },
  { id: 'beach', name: 'Muschelbucht' },
  { id: 'frost', name: 'Frostgipfel' },
  { id: 'turm', name: 'Krötenturm' },
];

export const LEVELS = {
  hub: () => import('./hub.js'),
  pilz: () => import('./pilzwald.js'),
  beach: () => import('./muschelbucht.js'),
  frost: () => import('./frostgipfel.js'),
  turm: () => import('./nebelturm.js'),
};
