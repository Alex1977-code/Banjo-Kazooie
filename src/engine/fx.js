// Gemeinsame Shader-Erweiterungen für die bestehenden Lambert-Materialien:
// Wind (Blätter, Gras, Pilzhüte), Wasserwellen mit Glanzpunkten und Uferschaum.
// Alles hängt an einer gemeinsamen Zeit-Uniform und bleibt bewusst einfach
// (N64-Look). Teure Extras (zweite Texturebene, Glitzern, Schaummuster) gibt
// es erst ab der Grafikstufe "retro".

export const FX = {
  time: { value: 0 },
  wind: { value: 1 }, // Windstärke der aktuellen Welt
  detail: true, // false in der Stufe "n64"
  materials: new Set(), // Materialien mit Detail-Varianten (bei Stufenwechsel neu übersetzen)
};

export function updateFx(dt) {
  FX.time.value = (FX.time.value + dt) % 3600;
}

export function setFxDetail(on) {
  if (on === FX.detail) return;
  FX.detail = on;
  for (const m of FX.materials) m.needsUpdate = true;
}

// ---------- Wind ----------
// Die Geometrie braucht ein Attribut "wind" (0 = starr, 1 = wiegt voll mit).
// Fehlt es, liefert WebGL 0 – begehbare Teile bleiben also unverformt.
const WIND_VERT = `
{
  float w = wind * uWind;
  if (w > 0.0) {
    float ph = position.x * 0.21 + position.z * 0.17;
    float s = sin(uTime * 1.6 + ph) + 0.4 * sin(uTime * 3.3 + ph * 2.3);
    transformed.x += s * w * 0.12;
    transformed.z += cos(uTime * 1.25 + ph * 1.3) * w * 0.08;
    transformed.y -= abs(s) * w * 0.015;
  }
}`;

export function windMaterial(material) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = FX.time;
    sh.uniforms.uWind = FX.wind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float wind;\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>' + WIND_VERT);
  };
  material.customProgramCacheKey = () => 'wind';
  return material;
}

// ---------- Wasser ----------
// Sanfte Wellen (nur Optik, die Kollision bleibt flach), wanderndes zweites
// Muster und Glanzpunkte. amp = Wellenhöhe, glint = Stärke der Glanzpunkte.
export function waterMaterial(material, { amp = 0.12, glint = 1, speed = 1 } = {}) {
  const u = { uAmp: { value: amp }, uGlint: { value: glint }, uSpeed: { value: speed } };
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uTime: FX.time });
    const detail = FX.detail ? '#define WATER_DETAIL\n' : '';
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uAmp;\nuniform float uSpeed;\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
  float t = uTime * uSpeed;
  float h = sin(wp.x * 0.13 + t * 1.1) + 0.7 * sin(wp.z * 0.17 - t * 0.9) + 0.3 * sin((wp.x + wp.z) * 0.31 + t * 1.7);
  transformed.y += h * uAmp * 0.5;
  vWPos = wp;
}`);
    sh.fragmentShader = detail + sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uGlint;\nuniform float uSpeed;\nvarying vec3 vWPos;')
      .replace('#include <map_fragment>', `#include <map_fragment>
float glint = 0.0;
#ifdef WATER_DETAIL
{
  float t = uTime * uSpeed;
  vec4 t2 = texture2D(map, vWPos.xz * 0.09 + vec2(-t * 0.021, t * 0.013));
  diffuseColor.rgb *= mix(vec3(1.0), t2.rgb * 1.12, 0.5);
  float g = texture2D(map, vWPos.xz * 0.23 + vec2(t * 0.05, -t * 0.04)).r * t2.r;
  glint = smoothstep(0.8, 0.95, g) * uGlint;
}
#endif`)
      .replace('#include <opaque_fragment>', `outgoingLight += vec3(glint);
diffuseColor.a = max(diffuseColor.a, glint);
#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'water' + (FX.detail ? '1' : '0');
  material.userData.fx = u;
  FX.materials.add(material);
  return material;
}

// ---------- Uferschaum auf dem Terrain ----------
// Attribut "shore" pro Vertex: x = Stärke (0 = kein Ufer), y = Wasserhöhe,
// z = Farbe (0 = weißer Schaum, 1 = grünlicher Sumpfschaum).
export function foamMaterial(material) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = FX.time;
    const detail = FX.detail ? '#define FOAM_DETAIL\n' : '';
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 shore;\nvarying vec3 vShore;\nvarying vec3 vFoamPos;\nvarying float vFoamN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShore = shore;\nvFoamN = normal.y;\nvFoamPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = detail + sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vShore;\nvarying vec3 vFoamPos;\nvarying float vFoamN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
if (vShore.x > 0.01) {
  // Schaumband an der Wasserlinie, das mit den Wellen vor- und zurückläuft
  float wave = 0.09 * sin(uTime * 1.2 + vFoamPos.x * 0.13 + vFoamPos.z * 0.17);
  float d = vFoamPos.y - vShore.y - wave;
  // Höhenabstand über die Hangneigung in waagerechten Abstand zur Wasserlinie
  // umrechnen – so ist der Saum an flachen und steilen Ufern gleich breit
  float ny = clamp(vFoamN, 0.05, 0.995);
  float dist = d * ny / sqrt(1.0 - ny * ny);
  float band = smoothstep(-1.8, -0.3, dist) * (1.0 - smoothstep(0.0, 0.45, dist));
#ifdef FOAM_DETAIL
  band *= 0.55 + 0.45 * texture2D(map, vFoamPos.xz * 0.35 + vec2(uTime * 0.04, uTime * 0.03)).r;
#endif
  vec3 foamCol = mix(vec3(0.97, 0.99, 1.0), vec3(0.6, 0.85, 0.3), vShore.z);
  diffuseColor.rgb = mix(diffuseColor.rgb, foamCol, band * vShore.x * 0.7);
}`);
  };
  material.customProgramCacheKey = () => 'foam' + (FX.detail ? '1' : '0');
  FX.materials.add(material);
  return material;
}

// Materialien beim Levelwechsel vergessen (sonst wächst die Liste)
export function forgetFxMaterial(m) {
  FX.materials.delete(m);
}
