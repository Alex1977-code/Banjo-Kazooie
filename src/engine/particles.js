// Partikel als Punkt-Sprites (ein Draw-Call pro Textur).
import * as THREE from 'three';

const VERT = `
attribute float size;
attribute vec4 pcolor;
varying vec4 vColor;
uniform float scale;
void main() {
  vColor = pcolor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * scale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform sampler2D map;
varying vec4 vColor;
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  gl_FragColor = vec4(t.rgb * vColor.rgb, t.a * vColor.a);
  if (gl_FragColor.a < 0.02) discard;
  #include <colorspace_fragment>
}`;

class Pool {
  constructor(scene, tex, max, additive) {
    this.max = max;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.col = new Float32Array(max * 4);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 300 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.parts = [];
    for (let i = 0; i < max; i++) this.parts.push({ life: 0 });
    this.cursor = 0;
  }

  spawn(o) {
    const p = this.parts[this.cursor];
    this.cursor = (this.cursor + 1) % this.max;
    p.x = o.x; p.y = o.y; p.z = o.z;
    p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.g = o.g ?? 0;
    p.drag = o.drag ?? 0;
    p.life = p.max = o.life ?? 1;
    p.s0 = o.s0 ?? 1; p.s1 = o.s1 ?? 0;
    p.r = o.r ?? 1; p.gg = o.gg ?? 1; p.b = o.b ?? 1;
    p.a0 = o.a ?? 1;
  }

  update(dt, scale) {
    this.mat.uniforms.scale.value = scale;
    for (let i = 0; i < this.max; i++) {
      const p = this.parts[i];
      if (p.life <= 0) {
        this.size[i] = 0;
        continue;
      }
      p.life -= dt;
      p.vy -= p.g * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vy *= d; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const t = 1 - Math.max(0, p.life) / p.max;
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.size[i] = p.life > 0 ? p.s0 + (p.s1 - p.s0) * t : 0;
      this.col[i * 4] = p.r; this.col[i * 4 + 1] = p.gg; this.col[i * 4 + 2] = p.b;
      this.col[i * 4 + 3] = p.a0 * (1 - t * t);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
    this.geo.attributes.pcolor.needsUpdate = true;
  }

  clear() {
    for (const p of this.parts) p.life = 0;
  }
}

export class Particles {
  constructor(scene, tex) {
    this.spark = new Pool(scene, tex.spark, 220, true);
    this.puff = new Pool(scene, tex.puff, 160, false);
  }

  update(dt, renderHeight) {
    const scale = renderHeight * 0.9;
    this.spark.update(dt, scale);
    this.puff.update(dt, scale);
  }

  clear() {
    this.spark.clear();
    this.puff.clear();
  }

  // Vorgefertigte Effekte
  emit(type, x, y, z, n = 10, color) {
    const R = Math.random;
    if (type === 'dust') {
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, s = 1.5 + R() * 2;
        this.puff.spawn({ x, y: y + 0.1, z, vx: Math.cos(a) * s, vy: 0.5 + R(), vz: Math.sin(a) * s, drag: 3,
          life: 0.5 + R() * 0.3, s0: 0.7, s1: 1.6, r: 0.9, gg: 0.85, b: 0.75, a: 0.7 });
      }
    } else if (type === 'sparkle') {
      const c = color || [1, 0.9, 0.4];
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, s = 1 + R() * 4, u = R() * 4 - 1;
        this.spark.spawn({ x, y, z, vx: Math.cos(a) * s, vy: u + 2, vz: Math.sin(a) * s, g: 6, drag: 1.5,
          life: 0.6 + R() * 0.5, s0: 0.6 + R() * 0.4, s1: 0, r: c[0], gg: c[1], b: c[2] });
      }
    } else if (type === 'splash') {
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, s = 1 + R() * 3;
        this.puff.spawn({ x, y, z, vx: Math.cos(a) * s, vy: 4 + R() * 4, vz: Math.sin(a) * s, g: 18,
          life: 0.6, s0: 0.6, s1: 0.2, r: 0.8, gg: 0.92, b: 1, a: 0.9 });
      }
    } else if (type === 'pop') {
      const c = color || [0.8, 0.7, 1];
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, s = 2 + R() * 4;
        this.puff.spawn({ x, y, z, vx: Math.cos(a) * s, vy: R() * 4, vz: Math.sin(a) * s, drag: 2.5,
          life: 0.5 + R() * 0.4, s0: 1.2, s1: 2.2, r: c[0], gg: c[1], b: c[2], a: 0.85 });
        this.spark.spawn({ x, y, z, vx: Math.cos(a) * s * 1.5, vy: 3 + R() * 3, vz: Math.sin(a) * s * 1.5, g: 10,
          life: 0.5, s0: 0.5, s1: 0, r: 1, gg: 1, b: 0.8 });
      }
    } else if (type === 'ring') {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        this.puff.spawn({ x: x + Math.cos(a) * 0.6, y: y + 0.15, z: z + Math.sin(a) * 0.6,
          vx: Math.cos(a) * 7, vy: 0.3, vz: Math.sin(a) * 7, drag: 4,
          life: 0.55, s0: 1, s1: 2, r: 0.95, gg: 0.9, b: 0.8, a: 0.8 });
      }
    } else if (type === 'feather') {
      for (let i = 0; i < n; i++) {
        this.puff.spawn({ x: x + (R() - 0.5) * 0.4, y, z: z + (R() - 0.5) * 0.4,
          vx: (R() - 0.5) * 2, vy: -0.5 - R(), vz: (R() - 0.5) * 2, drag: 2,
          life: 0.5, s0: 0.35, s1: 0.1, r: 0.2, gg: 0.25, b: 0.5, a: 0.9 });
      }
    } else if (type === 'bubble') {
      for (let i = 0; i < n; i++) {
        this.spark.spawn({ x: x + (R() - 0.5) * 0.4, y, z: z + (R() - 0.5) * 0.4,
          vx: (R() - 0.5), vy: 2 + R() * 2, vz: (R() - 0.5),
          life: 0.8, s0: 0.3, s1: 0.2, r: 0.6, gg: 0.8, b: 1 });
      }
    } else if (type === 'fog') {
      for (let i = 0; i < n; i++) {
        this.puff.spawn({ x: x + (R() - 0.5), y: y + (R() - 0.5), z: z + (R() - 0.5),
          vx: (R() - 0.5) * 2, vy: R(), vz: (R() - 0.5) * 2, drag: 1,
          life: 0.8 + R() * 0.6, s0: 1.5, s1: 3, r: 0.7, gg: 0.68, b: 0.8, a: 0.6 });
      }
    }
  }
}
