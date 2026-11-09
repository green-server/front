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
 * draw (`lib/orbit.ts`), and a ring carrying each server as a satellite. Drawn with shaders,
 * so there are no textures to load. Never unmounts.
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
      return () => img.remove();
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);

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
    let drawn: Satellite[] | null = null;
    const dots = new Map<number, THREE.Mesh>();
    const placeSatellites = () => {
      const { satellites } = getOrbit();
      if (satellites === drawn) return;
      drawn = satellites;
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

    let narrow = false;
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      narrow = window.innerWidth < NARROW;
      // Phones: the planet sits above the content, smaller, with no ring.
      camera.position.z = narrow ? 8 : 6.2;
      planet.position.y = narrow ? 0.9 : 0;
      ring.visible = !narrow;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const target = () => {
      const panel = getOrbit().panel && !narrow;
      return { x: panel ? -1.6 : 0, scale: panel ? 0.8 : 1 };
    };
    const onOrbit = () => {
      el.classList.toggle("is-dim", getOrbit().panel);
      placeSatellites();
    };
    onOrbit();
    const unsubscribe = subscribeOrbit(onOrbit);

    const positions = getLabelPositions();
    const world3 = new THREE.Vector3();
    const edge = new THREE.Vector3();
    const clock = new THREE.Clock();
    const frame = () => {
      const dt = Math.min(clock.getDelta(), 0.1);
      // Ease toward the new reading so a change reads as weather, not a cut.
      uniforms.health.value += (getOrbit().health - uniforms.health.value) * Math.min(1, dt * 0.8);
      // ~600 ms to settle when a panel opens or closes.
      const goal = target();
      const k = still.matches ? 1 : Math.min(1, dt * 7);
      world.position.x += (goal.x - world.position.x) * k;
      world.scale.setScalar(world.scale.x + (goal.scale - world.scale.x) * k);
      if (!still.matches) {
        uniforms.time.value += dt;
        surface.rotation.y += dt * 0.035;
        clouds.rotation.y += dt * 0.045;
        stars.rotation.y += dt * 0.002;
        spin.rotation.y += dt * 0.02;
      }
      renderer.render(scene, camera);

      positions.clear();
      if (ring.visible) {
        const { clientWidth: w, clientHeight: h } = el;
        const toScreen = (v: THREE.Vector3) => v.project(camera).set(((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h, 0);
        planet.getWorldPosition(world3);
        edge.copy(world3).addScaledVector(camera.up, world.scale.x);
        const centre = toScreen(world3.clone());
        const radius = toScreen(edge).distanceTo(centre);
        for (const [id, mesh] of dots) {
          mesh.getWorldPosition(world3);
          const hidden = world3.z < 0;
          const p = toScreen(world3);
          positions.set(id, { x: p.x, y: p.y, behind: hidden && p.distanceTo(centre) < radius });
        }
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
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="scene" aria-hidden="true" />;
}

export default OrbitScene;
