import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getLabelPositions, getOrbit, publishFrame, subscribeOrbit, type Satellite } from "@/lib/orbit";
import { CLOUDS, HALO, SURFACE, VERTEX } from "./planetShaders";
import "@/styles/scene.css";

export { getLabelPositions, subscribeFrame } from "@/lib/orbit";

const RING_RADIUS = 1.75;
const NARROW = 760;

/**
 * The one scene behind every page: the planet, whose seas, forests and air follow the fleet's
 * draw (`lib/orbit.ts`), and a ring carrying each server as a satellite. Never unmounts.
 */
export function OrbitScene() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      // No WebGL: a still of the planet; the labels stay hidden and the pages list the servers.
      const img = document.createElement("img");
      img.src = "/planet.png";
      img.className = "scene-fallback";
      img.alt = "";
      el.appendChild(img);
      // Lets the home page show its server list in place of the satellites.
      document.documentElement.classList.add("no-webgl");
      const dim = () => el.classList.toggle("is-dim", getOrbit().panel);
      dim();
      const stop = subscribeOrbit(dim);
      return () => {
        stop();
        img.remove();
        document.documentElement.classList.remove("no-webgl");
      };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    const sun = new THREE.Vector3(-0.9, 0.45, 0.75).normalize();
    const loader = new THREE.TextureLoader();
    const map = (name: string) => {
      const texture = loader.load(`/earth/${name}`, () => markDirty());
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return texture;
    };
    const textures = [map("day.jpg"), map("water.jpg"), map("lights.jpg"), map("clouds.png")];
    const [dayMap, waterMap, lightsMap, cloudMap] = textures;
    const uniforms = {
      health: { value: getOrbit().health },
      blight: { value: getOrbit().blight },
      sun: { value: sun },
      dayMap: { value: dayMap },
      waterMap: { value: waterMap },
      lightsMap: { value: lightsMap },
      cloudMap: { value: cloudMap },
    };
    const sphere = new THREE.SphereGeometry(1, 128, 96);

    const globe = new THREE.Group();
    globe.rotation.z = 0.41; // Earth's axial tilt.
    const surface = new THREE.Mesh(sphere, new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: SURFACE }));
    const clouds = new THREE.Mesh(
      sphere,
      new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: CLOUDS, transparent: true, depthWrite: false }),
    );
    clouds.scale.setScalar(1.012);
    // Start with Korea (127°E) facing the viewer.
    surface.rotation.y = clouds.rotation.y = Math.PI / 2 - Math.PI * 2 * (0.5 + 127 / 360);
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

    // The ring lies in the planet's equatorial-ish plane, tipped so its near half crosses the lower planet.
    const ring = new THREE.Group();
    ring.rotation.x = 0.35;
    const ringPoints = Array.from({ length: 128 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * RING_RADIUS, 0, Math.sin(a) * RING_RADIUS);
    });
    const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
    const ringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false });
    const spin = new THREE.Group();
    ring.add(new THREE.LineLoop(ringGeometry, ringMaterial), spin);

    const dot = new THREE.SphereGeometry(1, 16, 12);
    const onlineMaterial = new THREE.MeshBasicMaterial({ color: 0xeef2f6 });
    const offlineMaterial = new THREE.MeshBasicMaterial({ color: 0x5b6675 });
    let drawn: Satellite[] = [];
    let narrow = false;
    // No servers (or signed out): no ring to hang them on. Phones never show it.
    const showRing = () => {
      ring.visible = !narrow && drawn.length > 0;
    };
    const dots = new Map<number, THREE.Mesh>();
    const placeSatellites = () => {
      const { satellites } = getOrbit();
      if (satellites === drawn) return;
      drawn = satellites;
      showRing();
      spin.clear();
      dots.clear();
      for (const s of satellites) {
        const mesh = new THREE.Mesh(dot, s.online ? onlineMaterial : offlineMaterial);
        mesh.scale.setScalar(0.025 * s.size);
        mesh.position.set(Math.cos(s.angle) * RING_RADIUS, 0, Math.sin(s.angle) * RING_RADIUS);
        spin.add(mesh);
        dots.set(s.id, mesh);
      }
    };
    placeSatellites();

    const planet = new THREE.Group();
    planet.add(globe, halo);
    const world = new THREE.Group();
    world.add(planet, ring);
    scene.add(stars, world);

    let dirty = true;
    const markDirty = () => void (dirty = true);
    let width = 1;
    let height = 1;
    const resize = () => {
      width = el.clientWidth;
      height = el.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      narrow = window.innerWidth < NARROW;
      // Phones: the planet sits above the content, smaller, with no ring.
      camera.position.z = narrow ? 8 : 6.2;
      planet.position.y = narrow ? 0.9 : 0;
      showRing();
      camera.updateProjectionMatrix();
      dirty = true;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    // World units per CSS pixel at the planet's depth.
    const unitsPerPx = () => (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / height;
    const target = () => {
      const { panel, auth } = getOrbit();
      if (narrow) return { x: 0, scale: 1 };
      if (panel) return { x: -1.6, scale: 0.8 };
      // Half the sign-in card (340px) and its gap (96px); auth.css places the card to match.
      return { x: auth ? -218 * unitsPerPx() : 0, scale: 1 };
    };
    const onOrbit = () => {
      el.classList.toggle("is-dim", getOrbit().panel);
      placeSatellites();
      markDirty();
    };
    onOrbit();
    const unsubscribe = subscribeOrbit(onOrbit);

    const positions = getLabelPositions();
    // Scratch vectors, reused every frame.
    const world3 = new THREE.Vector3();
    const edge = new THREE.Vector3();
    const centre = new THREE.Vector3();
    const toScreen = (v: THREE.Vector3) => v.project(camera).set(((v.x + 1) / 2) * width, ((1 - v.y) / 2) * height, 0);
    const clock = new THREE.Clock();
    // Reduced motion draws only when something moved; a phone sheet covers the scene, so it draws nothing.
    const frame = () => {
      const covered = narrow && getOrbit().panel;
      if (covered) return;
      const settling =
        Math.abs(getOrbit().health - uniforms.health.value) > 1e-3 ||
        Math.abs(getOrbit().blight - uniforms.blight.value) > 1e-3 ||
        Math.abs(target().x - world.position.x) > 1e-3 ||
        Math.abs(target().scale - world.scale.x) > 1e-3;
      if (still.matches && !dirty && !settling) return;
      dirty = false;
      const dt = Math.min(clock.getDelta(), 0.1);
      // Ease toward the new reading so a change reads as weather, not a cut.
      uniforms.health.value += (getOrbit().health - uniforms.health.value) * Math.min(1, dt * 0.8);
      uniforms.blight.value += (getOrbit().blight - uniforms.blight.value) * Math.min(1, dt * 0.8);
      // ~600 ms to settle when a panel opens or closes.
      const goal = target();
      const k = still.matches ? 1 : Math.min(1, dt * 7);
      world.position.x += (goal.x - world.position.x) * k;
      world.scale.setScalar(world.scale.x + (goal.scale - world.scale.x) * k);
      if (!still.matches) {
        surface.rotation.y += dt * 0.035;
        clouds.rotation.y += dt * 0.045;
        stars.rotation.y += dt * 0.002;
        spin.rotation.y += dt * 0.02;
      }
      renderer.render(scene, camera);

      if (ring.visible) {
        planet.getWorldPosition(centre);
        edge.copy(centre).addScaledVector(camera.up, world.scale.x);
        toScreen(centre);
        const radius = toScreen(edge).distanceTo(centre);
        for (const [id, mesh] of dots) {
          mesh.getWorldPosition(world3);
          const hidden = world3.z < 0;
          const p = toScreen(world3);
          const behind = hidden && p.distanceTo(centre) < radius;
          const entry = positions.get(id);
          if (entry) {
            entry.x = p.x;
            entry.y = p.y;
            entry.behind = behind;
          } else {
            positions.set(id, { x: p.x, y: p.y, behind });
          }
        }
        for (const id of positions.keys()) if (!dots.has(id)) positions.delete(id);
      } else {
        positions.clear();
      }
      publishFrame();
    };
    renderer.setAnimationLoop(frame);

    return () => {
      renderer.setAnimationLoop(null);
      unsubscribe();
      observer.disconnect();
      positions.clear();
      publishFrame();
      [sphere, starGeometry, ringGeometry, dot].forEach((g) => g.dispose());
      [surface, clouds, halo, stars].forEach((o) => (o.material as THREE.Material).dispose());
      [ringMaterial, onlineMaterial, offlineMaterial].forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="scene" aria-hidden="true" />;
}

export default OrbitScene;
