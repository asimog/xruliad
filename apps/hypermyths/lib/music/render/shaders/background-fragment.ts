export const backgroundFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform vec3 uTintA;
uniform vec3 uTintB;
uniform vec2 uResolution;

void main() {
  vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
  float dist = length(uv);

  // Deep space background — very dark, subtle tint from color palette
  vec3 bg = uTintB * 0.06 + uTintA * 0.02;

  // ── Central lantern core ──────────────────────────────────────────────────
  // Analytic inverse-square glow that blooms hard on bass hits
  float coreRadius = 0.04 + uBass * 0.22;
  float core = (coreRadius * coreRadius) / (dist * dist + coreRadius * coreRadius);
  core = pow(core, 1.6);

  // Core color: tintA → near-white on loud bass (warmth like a lantern flame)
  vec3 coreCol = mix(uTintA * 1.8, vec3(1.0, 0.97, 0.88), uBass * 0.85);

  // ── Wide radial halo ──────────────────────────────────────────────────────
  float haloFall = 3.2 - uBass * 2.2;
  float halo = exp(-dist * haloFall) * (0.06 + uBass * 0.22);
  vec3 haloCol = mix(uTintA * 0.9, uTintB * 0.6, 0.35);

  // ── Mid-frequency glowing ring ────────────────────────────────────────────
  // Sits at a dynamic radius; brightens with mids (snare / melodic energy)
  float ringRadius = 0.30 + uMid * 0.14;
  float ringWidth  = 0.045 + uHigh * 0.025;
  float ring = exp(-pow(abs(dist - ringRadius) / ringWidth, 2.0)) * uMid * 0.45;
  vec3 ringCol = mix(uTintA, uTintB, 0.5);

  // ── High-frequency sparkle corona ────────────────────────────────────────
  float corona = exp(-pow(abs(dist - 0.55 - uHigh * 0.12) / 0.06, 2.0)) * uHigh * 0.25;
  vec3 coronaCol = uTintB;

  // ── Compose ───────────────────────────────────────────────────────────────
  vec3 color = bg
    + coreCol * core
    + haloCol * halo
    + ringCol * ring
    + coronaCol * corona;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
