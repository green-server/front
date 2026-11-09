// Earth from NASA Blue Marble-based maps (three.js example textures, public/earth/).
// The real planet is the 7-day-average look; above the average its land dries toward desert,
// its seas turn murky and its air hazes orange.

export const VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

// 0 at or above the average (health >= 0.5), 1 when fully parched.
const DRYNESS = /* glsl */ `float dryness() { return smoothstep(0.5, 0.0, health); }`;

export const SURFACE = /* glsl */ `
uniform float health;
uniform vec3 sun;
uniform sampler2D dayMap;
uniform sampler2D waterMap;
uniform sampler2D lightsMap;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
${DRYNESS}
void main() {
  vec3 day = texture2D(dayMap, vUv).rgb;
  float water = texture2D(waterMap, vUv).r;
  float dry = dryness();

  // Land browns toward desert, keeping its light and shade; ice and snow stay white.
  float lum = dot(day, vec3(0.3, 0.59, 0.11));
  float snow = smoothstep(0.62, 0.8, lum);
  vec3 desert = vec3(0.86, 0.66, 0.42) * (0.25 + lum * 1.25);
  vec3 land = mix(day, desert, dry * 0.85 * (1.0 - snow));
  vec3 sea = mix(day, vec3(0.1, 0.16, 0.16) + day * 0.4, dry * 0.6);
  vec3 color = mix(land, sea, water);

  vec3 n = normalize(vNormal);
  float ndl = dot(n, sun);
  float lit = smoothstep(-0.12, 0.3, ndl);
  vec3 halfway = normalize(sun + vView);
  float glint = pow(max(dot(n, halfway), 0.0), 60.0) * water * step(0.0, ndl) * 0.5;
  vec3 night = texture2D(lightsMap, vUv).rgb * vec3(1.0, 0.82, 0.55) * (1.0 - lit) * 0.9;
  float rim = pow(1.0 - max(dot(n, vView), 0.0), 3.0);
  vec3 air = mix(vec3(0.4, 0.7, 1.0), vec3(1.0, 0.6, 0.3), dry);

  vec3 outColor = color * (0.02 + 0.98 * lit) + glint + night + air * rim * lit * 0.45;
  gl_FragColor = vec4(outColor, 1.0);
}
`;

export const CLOUDS = /* glsl */ `
uniform float health;
uniform vec3 sun;
uniform sampler2D cloudMap;
varying vec2 vUv;
varying vec3 vNormal;
${DRYNESS}
void main() {
  float c = texture2D(cloudMap, vUv).a;
  float alpha = c * mix(0.95, 0.45, dryness());
  float lit = smoothstep(-0.1, 0.4, dot(normalize(vNormal), sun));
  gl_FragColor = vec4(vec3(lit), alpha * (0.1 + 0.9 * lit));
}
`;

export const HALO = /* glsl */ `
uniform float health;
varying vec3 vNormal;
varying vec3 vView;
${DRYNESS}
void main() {
  // Back faces: -dot is ~0.4 at the planet's rim and 0 at the halo's edge, a thin falloff.
  float glow = pow(clamp(-dot(normalize(vNormal), vView), 0.0, 1.0), 2.5);
  vec3 air = mix(vec3(0.35, 0.7, 1.0), vec3(1.0, 0.55, 0.25), dryness());
  gl_FragColor = vec4(air * glow * 2.4, 1.0);
}
`;
