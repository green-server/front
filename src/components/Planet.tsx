import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getOrbit } from "@/lib/orbit";

// 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT) and a 5-octave fbm on top of it.
const NOISE = /* glsl */ `
vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p) {
  float sum = 0.0, amp = 0.5;
  for (int i = 0; i < 5; i++) { sum += amp * snoise(p); p *= 2.03; amp *= 0.5; }
  return sum;
}
`;

const VERTEX = /* glsl */ `
varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vPos = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const SURFACE = /* glsl */ `
uniform float health;
uniform vec3 sun;
varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;
${NOISE}
void main() {
  vec3 p = normalize(vPos);
  float h = fbm(p * 1.7);
  float detail = fbm(p * 7.0 + 3.1);
  // A dry planet has given up its seas.
  float sea = mix(-0.16, 0.06, health);
  float land = smoothstep(sea, sea + 0.015, h);

  vec3 lushLow = vec3(0.09, 0.28, 0.11), lushHigh = vec3(0.34, 0.52, 0.2);
  vec3 dryLow = vec3(0.55, 0.4, 0.22), dryHigh = vec3(0.78, 0.63, 0.42);
  float rise = clamp((h - sea) * 3.0 + detail * 0.35, 0.0, 1.0);
  vec3 ground = mix(mix(dryLow, dryHigh, rise), mix(lushLow, lushHigh, rise), health);

  float depth = clamp((sea - h) * 4.0, 0.0, 1.0);
  vec3 water = mix(vec3(0.07, 0.33, 0.45), vec3(0.02, 0.09, 0.2), depth);
  water = mix(vec3(0.16, 0.2, 0.18), water, 0.35 + 0.65 * health);

  vec3 color = mix(water, ground, land);
  float ice = smoothstep(0.86 - 0.12 * health, 0.9 - 0.12 * health, abs(p.y) + detail * 0.06);
  color = mix(color, vec3(0.9, 0.94, 0.96), ice);

  vec3 n = normalize(vNormal);
  float ndl = dot(n, sun);
  float lit = smoothstep(-0.15, 0.35, ndl);
  vec3 halfway = normalize(sun + vView);
  float glint = pow(max(dot(n, halfway), 0.0), 70.0) * (1.0 - land) * (1.0 - ice) * step(0.0, ndl);
  float rim = pow(1.0 - max(dot(n, vView), 0.0), 3.0);
  vec3 air = mix(vec3(1.0, 0.62, 0.32), vec3(0.4, 0.75, 1.0), health);

  vec3 outColor = color * (0.03 + 0.97 * lit) + glint * 0.6 + air * rim * lit * 0.55;
  gl_FragColor = vec4(outColor, 1.0);
}
`;

const CLOUDS = /* glsl */ `
uniform float health;
uniform float time;
uniform vec3 sun;
varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;
${NOISE}
void main() {
  vec3 p = normalize(vPos);
  // Stretched along latitude bands, like weather systems.
  vec3 q = p * vec3(2.2, 5.0, 2.2) + vec3(time * 0.01, 0.0, time * 0.006);
  float c = fbm(q + 0.6 * fbm(q * 1.7));
  float alpha = smoothstep(0.18, 0.55, c) * mix(0.35, 0.8, health);
  float lit = smoothstep(-0.1, 0.4, dot(normalize(vNormal), sun));
  gl_FragColor = vec4(vec3(lit), alpha * (0.15 + 0.85 * lit));
}
`;

const HALO = /* glsl */ `
uniform float health;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  // Back faces: -dot is ~0.4 at the planet's rim and 0 at the halo's edge, a thin falloff.
  float glow = pow(clamp(-dot(normalize(vNormal), vView), 0.0, 1.0), 2.5);
  vec3 air = mix(vec3(1.0, 0.55, 0.25), vec3(0.35, 0.7, 1.0), health);
  gl_FragColor = vec4(air * glow * 2.4, 1.0);
}
`;

/**
 * A planet behind every page whose seas, forests and air follow the fleet's draw against
 * its 7-day average (`lib/orbit.ts`). Drawn with shaders, so there are no textures to load.
 */
export function Planet() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // No WebGL: the page is complete without the backdrop.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    const sun = new THREE.Vector3(-0.9, 0.45, 0.75).normalize();
    const uniforms = { health: { value: getOrbit().health }, time: { value: 0 }, sun: { value: sun } };
    const sphere = new THREE.SphereGeometry(1, 128, 96);

    const globe = new THREE.Group();
    globe.rotation.z = 0.41; // Earth's axial tilt.
    const surface = new THREE.Mesh(sphere, new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: SURFACE }));
    const clouds = new THREE.Mesh(
      sphere,
      new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: CLOUDS, transparent: true, depthWrite: false }),
    );
    clouds.scale.setScalar(1.012);
    globe.add(surface, clouds);

    const halo = new THREE.Mesh(
      sphere,
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERTEX,
        fragmentShader: HALO,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    halo.scale.setScalar(1.07);

    const starPositions = new Float32Array(1800 * 3);
    for (let i = 0; i < starPositions.length; i += 3) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(40);
      starPositions.set([v.x, v.y, v.z], i);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0.55 }),
    );

    const planet = new THREE.Group();
    planet.add(globe, halo);
    scene.add(stars, planet);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Wide screens keep the planet to the right of the content; narrow ones centre it.
      planet.position.x = camera.aspect > 1.1 ? 1.5 * camera.aspect - 0.6 : 0;
      planet.position.y = camera.aspect > 1.1 ? -0.35 : 0.4;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clock = new THREE.Clock();
    const frame = () => {
      const dt = Math.min(clock.getDelta(), 0.1);
      // Ease toward the new reading so a change reads as weather, not a cut.
      uniforms.health.value += (getOrbit().health - uniforms.health.value) * Math.min(1, dt * 0.8);
      if (!still.matches) {
        uniforms.time.value += dt;
        surface.rotation.y += dt * 0.035;
        clouds.rotation.y += dt * 0.045;
        stars.rotation.y += dt * 0.002;
      }
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(frame);

    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      sphere.dispose();
      starGeometry.dispose();
      [surface, clouds, halo].forEach((mesh) => (mesh.material as THREE.Material).dispose());
      (stars.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="planet" aria-hidden="true" />;
}
