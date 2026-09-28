// Rendert kleine Portraits der Figuren (für die Textboxen) direkt aus den 3D-Modellen.
import * as THREE from 'three';
import { makeBruno, makeKiki, makeTilo, makeToadKing, makeHedgehog, makeCaptain, makeCrab, makeLernstein, makePilz, makeSnail, makeFliegenpilz } from './models.js';

const CONF = {
  bruno: { make: makeBruno, y: 1.75, dist: 2.2, bg: 0x6aa7e8 },
  kiki: { make: makeKiki, y: 0.3, dist: 1.05, bg: 0xffd28a },
  tilo: { make: makeTilo, y: 1.95, dist: 2.3, bg: 0xa8e08a },
  koenig: { make: makeToadKing, y: 2.05, dist: 3.1, bg: 0x6a4f9a },
  pilz: { make: makePilz, y: 1.45, dist: 2.3, bg: 0xb8f0e8 },
  fuerst: { make: makeFliegenpilz, y: 1.35, dist: 3.2, bg: 0xf0c8d8 },
  lotti: { make: makeSnail, y: 1.25, dist: 2.1, bg: 0xf0c8ff },
  igel: { make: () => makeHedgehog(1, true), y: 0.75, dist: 2.1, bg: 0xf0c890 },
  stupsi: { make: () => makeHedgehog(0.6), y: 0.45, dist: 1.4, bg: 0xfff0a0 },
  kapitaen: { make: makeCaptain, y: 1.95, dist: 2.4, bg: 0x7fd4ff },
  knack: { make: () => makeCrab(true), y: 0.75, dist: 2.6, bg: 0xffd08a },
  stein: { make: makeLernstein, y: 1.1, dist: 3, bg: 0x2a4a6a },
  eiche: { make: null, bg: 0x6b8a3a },
};

export class Portraits {
  constructor(renderer) {
    this.r = renderer;
    this.cache = new Map();
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x665544, 2));
    const d = new THREE.DirectionalLight(0xffffff, 2);
    d.position.set(1, 2, 3);
    this.scene.add(d);
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  }

  make(who) {
    const c = CONF[who] || CONF.bruno;
    const out = document.createElement('canvas');
    out.width = out.height = 96;
    const ctx = out.getContext('2d');
    if (!c.make) {
      // Opa Eiche: gezeichnetes Baumgesicht
      ctx.fillStyle = '#6b8a3a';
      ctx.fillRect(0, 0, 96, 96);
      ctx.fillStyle = '#8a6440';
      ctx.fillRect(18, 0, 60, 96);
      ctx.fillStyle = '#fff';
      for (const x of [36, 60]) { ctx.beginPath(); ctx.arc(x, 40, 9, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#222';
      for (const x of [37, 61]) { ctx.beginPath(); ctx.arc(x, 42, 4, 0, 7); ctx.fill(); }
      ctx.strokeStyle = '#3a2410';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(48, 62, 12, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = '#4a9a2a';
      ctx.beginPath(); ctx.arc(20, 8, 26, 0, 7); ctx.arc(76, 8, 26, 0, 7); ctx.fill();
      return out;
    }
    const model = c.make();
    this.scene.add(model);
    model.rotation.y = -0.35;
    this.cam.position.set(Math.sin(-0.1) * c.dist, c.y + 0.1, c.dist);
    this.cam.lookAt(0, c.y, 0);

    const gl = this.r.gl;
    const size = Math.min(128, gl.domElement.height);
    const prevColor = new THREE.Color();
    gl.getClearColor(prevColor);
    const prevAlpha = gl.getClearAlpha();
    const vp = new THREE.Vector4();
    gl.getViewport(vp);
    gl.setScissorTest(true);
    gl.setScissor(0, 0, size, size);
    gl.setViewport(0, 0, size, size);
    gl.setClearColor(c.bg, 1);
    gl.clear();
    gl.render(this.scene, this.cam);
    ctx.drawImage(gl.domElement, 0, gl.domElement.height - size, size, size, 0, 0, 96, 96);
    gl.setScissorTest(false);
    gl.setViewport(vp);
    gl.setClearColor(prevColor, prevAlpha);
    this.scene.remove(model);
    return out;
  }

  draw(canvas, who) {
    let img = this.cache.get(who);
    if (!img) {
      img = this.make(who);
      this.cache.set(who, img);
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
}
