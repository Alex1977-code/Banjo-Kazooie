// Renderer mit absichtlich niedriger Auflösung (N64: 320x240) und
// weicher Hochskalierung – das erzeugt den typischen Look.
import * as THREE from 'three';

export const QUALITY = {
  n64: { h: 240, label: 'N64 (240p)' },
  retro: { h: 360, label: 'Retro (360p)' },
  hd: { h: 720, label: 'Scharf (720p)' },
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.gl.setPixelRatio(1);
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 4 / 3, 0.15, 700);
    this.quality = 'retro';
    this.pixelated = false;

    this.hemi = new THREE.HemisphereLight(0xdff2ff, 0x5a4a30, 1.6);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
    this.sun.position.set(40, 80, 25);
    this.scene.add(this.hemi, this.sun);
    this.scene.fog = new THREE.Fog(0xbfe3ff, 60, 260);
    this.shake = 0;

    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.resize();
  }

  setQuality(q) {
    if (!QUALITY[q]) q = 'retro';
    this.quality = q;
    this.resize();
  }

  setPixelated(on) {
    this.pixelated = on;
    this.canvas.style.imageRendering = on ? 'pixelated' : 'auto';
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const target = Math.min(QUALITY[this.quality].h, Math.round(h * Math.min(window.devicePixelRatio || 1, 2)));
    const ih = Math.max(160, target);
    const iw = Math.round((ih * w) / h);
    this.gl.setSize(iw, ih, false);
    this.camera.aspect = w / h;
    // Auf schmalen Hochkant-Bildschirmen etwas weiter aufziehen
    this.camera.fov = w < h ? 75 : 62;
    this.camera.updateProjectionMatrix();
    this.internalHeight = ih;
  }

  setAtmosphere({ sky, fog, fogNear = 60, fogFar = 260, hemi, ground, sun, sunIntensity, hemiIntensity }) {
    this.scene.fog.color.set(fog ?? sky);
    this.scene.fog.near = fogNear;
    this.scene.fog.far = fogFar;
    this.gl.setClearColor(fog ?? sky);
    if (hemi != null) this.hemi.color.set(hemi);
    if (ground != null) this.hemi.groundColor.set(ground);
    if (sun != null) this.sun.color.set(sun);
    this.sun.intensity = sunIntensity ?? 2.2;
    this.hemi.intensity = hemiIntensity ?? 1.6;
  }

  render(dt) {
    const cam = this.camera;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * this.shake * 0.5;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
    }
    this.gl.render(this.scene, cam);
  }
}
