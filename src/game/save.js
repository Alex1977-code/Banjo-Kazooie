// Spielstand im localStorage.
const KEY = 'bruno-kiki-save-v1';

export const DEFAULT_SETTINGS = {
  quality: 'retro',
  pixel: false,
  music: 0.6,
  sfx: 0.8,
  ambience: 0.7,
  vibrate: true,
  invertY: false,
  camSpeed: 1,
};

function fresh() {
  return {
    version: 1,
    moves: { highjump: false, pound: false, dive: false },
    shards: {},
    fireflies: {},
    berries: {},
    flags: {},
    hearts: 0, // bei Lotti gekaufte Extra-Herzen
    spent: 0, // dafür ausgegebene Beeren
    settings: { ...DEFAULT_SETTINGS },
    playTime: 0,
  };
}

export class Save {
  constructor() {
    this.data = fresh();
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const f = fresh();
        this.data = { ...f, ...d, moves: { ...f.moves, ...d.moves }, settings: { ...f.settings, ...d.settings } };
      }
    } catch {
      this.data = fresh();
    }
  }

  write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* privater Modus o.ä. – dann eben ohne Speichern */
    }
  }

  hasProgress() {
    return !!this.data.flags['hub:intro'];
  }

  reset() {
    const settings = this.data.settings;
    this.data = fresh();
    this.data.settings = settings;
    this.write();
  }

  hasShard(key) { return !!this.data.shards[key]; }
  addShard(key) {
    this.data.shards[key] = true;
    this.write();
  }
  totalShards() { return Object.keys(this.data.shards).length; }
  levelShards(id) { return Object.keys(this.data.shards).filter((k) => k.startsWith(id + ':')).length; }
  levelFireflies(id) { return Object.keys(this.data.fireflies).filter((k) => k.startsWith(id + ':')).length; }
  totalBerries() { return Object.values(this.data.berries).reduce((a, b) => a + b.length, 0); }
  wallet() { return this.totalBerries() - (this.data.spent || 0); }
}
