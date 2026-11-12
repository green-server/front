import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getOrbit, subscribeOrbit, type OrbitState } from "@/lib/orbit";
import { subsolar } from "@/lib/sun";
import { ASCII, ASCII_VERTEX, AURORA, CLOUDS, HALO, METEOR, METEOR_VERTEX, MOON, SPARKLE, SPARKLE_VERTEX, SURFACE, VERTEX } from "./planetShaders";
import "@/styles/scene.css";

const NARROW = 760;
// Live global cloud cover, a geostationary satellite composite refreshed about every 3 hours.
const LIVE_CLOUDS = "https://clouds.matteason.co.uk/images/2048x1024/clouds.jpg";
const CLOUD_REFRESH = 3 * 3600_000;
// The scene is shown as text: one glyph per cell of this size (CSS px), darkest to brightest.
const CELL = { w: 5, h: 9 };
const RAMP = " .:-=+*#%@";

/** The ramp's glyphs side by side, white on black, one cell each, as a texture. */
function glyphAtlas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w * RAMP.length;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(h * 0.82)}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  [...RAMP].forEach((glyph, i) => ctx.fillText(glyph, (i + 0.5) * w, h / 2));
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  return texture;
}

/**
 * The one scene behind every page: the planet, whose seas, forests and air follow the fleet's
 * draw (`lib/orbit.ts`). Never unmounts.
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
      // No WebGL: a still of the planet.
      const img = document.createElement("img");
      img.src = "/planet.png";
      img.className = "scene-fallback";
      img.alt = "";
      el.appendChild(img);
      const dim = () => el.classList.toggle("is-dim", getOrbit().panel);
      dim();
      const stop = subscribeOrbit(dim);
      return () => {
        stop();
        img.remove();
      };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    // The real sun: its overhead point in the globe's own frame, turned into the scene each frame.
    const sunLocal = new THREE.Vector3();
    // A place in the globe's own frame. Matches SphereGeometry's UVs: longitude L sits at (cos L, 0, -sin L).
    const toLocal = (lat: number, lon: number, v: THREE.Vector3) => {
      const b = THREE.MathUtils.degToRad(lat);
      const l = THREE.MathUtils.degToRad(lon);
      return v.set(Math.cos(b) * Math.cos(l), Math.sin(b), -Math.cos(b) * Math.sin(l));
    };
    // Surface turn that brings longitude `lon` to face the camera.
    const facing = (lon: number) => Math.PI / 2 - Math.PI * 2 * (0.5 + lon / 360);
    const placeSun = () => {
      const { lat, lon } = subsolar(new Date());
      toLocal(lat, lon, sunLocal);
    };
    placeSun();
    const sun = new THREE.Vector3();
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
      liveClouds: { value: 0 },
    };
    // Today's clouds replace the bundled still once they arrive; a failed fetch keeps the still.
    let liveMap: THREE.Texture | null = null;
    const loadClouds = () => {
      const bucket = Math.floor(Date.now() / CLOUD_REFRESH);
      loader.load(`${LIVE_CLOUDS}?t=${bucket}`, (texture) => {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        liveMap?.dispose();
        liveMap = texture;
        uniforms.cloudMap.value = texture;
        uniforms.liveClouds.value = 1;
        markDirty();
      });
    };
    loadClouds();
    const cloudTimer = window.setInterval(loadClouds, CLOUD_REFRESH);
    // The terminator creeps ~0.25° a minute; reduced motion redraws for it once a minute.
    const sunTimer = window.setInterval(() => {
      placeSun();
      markDirty();
    }, 60_000);
    const sphere = new THREE.SphereGeometry(1, 128, 96);

    const globe = new THREE.Group();
    const TILT = 0.41; // Earth's axial tilt, for show; a pinned place straightens it.
    globe.rotation.z = TILT;
    const surface = new THREE.Mesh(sphere, new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: SURFACE }));
    const clouds = new THREE.Mesh(
      sphere,
      new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: CLOUDS, transparent: true, depthWrite: false }),
    );
    clouds.scale.setScalar(1.012);
    // Start with Korea (127°E) facing the viewer.
    surface.rotation.y = clouds.rotation.y = facing(127);
    globe.add(surface, clouds);

    // The open server's place: a green dot on a dark rim, riding the surface.
    const pinGeometry = new THREE.SphereGeometry(1, 16, 12);
    const pinMaterial = new THREE.MeshBasicMaterial({ color: 0x5fd7ff });
    const pinRimMaterial = new THREE.MeshBasicMaterial({ color: 0x05080d });
    const pin = new THREE.Group();
    const pinDot = new THREE.Mesh(pinGeometry, pinMaterial);
    pinDot.scale.setScalar(0.039);
    const pinRim = new THREE.Mesh(pinGeometry, pinRimMaterial);
    pinRim.scale.setScalar(0.04);
    pin.add(pinRim, pinDot);
    pin.visible = false;
    surface.add(pin);

    // Aurora over both poles, riding the surface; it shows for about 25 s in every 40.
    // Seven stacked shells from 2% to 16% of the radius above the ground make one standing curtain.
    const auroraUniforms = { sun: uniforms.sun, time: { value: 0 }, strength: { value: 0 } };
    const AURORA_LAYERS = 7;
    const aurora = Array.from({ length: AURORA_LAYERS }, (_, i) => {
      const height = i / (AURORA_LAYERS - 1);
      const layer = new THREE.Mesh(
        sphere,
        new THREE.ShaderMaterial({
          uniforms: { ...auroraUniforms, height: { value: height } },
          vertexShader: VERTEX,
          fragmentShader: AURORA,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      layer.scale.setScalar(1.02 + 0.14 * height);
      surface.add(layer);
      return layer;
    });
    const AURORA_CYCLE = 40;
    // The first display starts a few seconds after load.
    const auroraStrength = (t: number) => {
      const phase = ((t + AURORA_CYCLE - 3) % AURORA_CYCLE) / AURORA_CYCLE;
      return THREE.MathUtils.smoothstep(phase, 0, 0.08) * (1 - THREE.MathUtils.smoothstep(phase, 0.55, 0.65));
    };
    let pinned: OrbitState["pin"] = null;
    const placePin = () => {
      const next = getOrbit().pin;
      if (next === pinned) return;
      pinned = next;
      pin.visible = next !== null;
      if (!next) return;
      toLocal(next.lat, next.lon, pin.position).multiplyScalar(1.02);
      // The dot sits a little further out than its rim, so the rim reads as an outline.
      pinDot.position.copy(pin.position).normalize().multiplyScalar(0.02);
    };
    // Shortest signed turn from `from` to `to`.
    const turn = (from: number, to: number) => ((((to - from + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;

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

    let narrow = false;

    const planet = new THREE.Group();
    // A small moon on a tilted orbit, passing behind the planet and lit by the same sun.
    const moonGeometry = new THREE.SphereGeometry(1, 48, 32);
    const moon = new THREE.Mesh(moonGeometry, new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: MOON }));
    moon.scale.setScalar(0.2);
    moon.position.set(1.95, 0, 0);
    const moonOrbit = new THREE.Group();
    moonOrbit.rotation.set(0.32, 0.9, -0.12);
    moonOrbit.add(moon);

    planet.add(globe, halo, moonOrbit);
    const world = new THREE.Group();
    world.add(planet);
    // Sparkling stars ride with the rest of the sky; see SPARKLE in planetShaders.
    // The camera sees about 1/25 of the sky, so 600 leaves a couple dozen in view, about one flaring at a time.
    const SPARKLES = 600;
    const sparkleGeometry = new THREE.BufferGeometry();
    const sparklePositions = new Float32Array(SPARKLES * 3);
    for (let i = 0; i < sparklePositions.length; i += 3) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(40);
      sparklePositions.set([v.x, v.y, v.z], i);
    }
    sparkleGeometry.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
    sparkleGeometry.setAttribute("phase", new THREE.BufferAttribute(Float32Array.from({ length: SPARKLES }, () => Math.random() * Math.PI * 2), 1));
    sparkleGeometry.setAttribute("speed", new THREE.BufferAttribute(Float32Array.from({ length: SPARKLES }, () => 0.1 + Math.random() * 0.2), 1));
    const sparkleUniforms = { time: { value: 0 }, pixelRatio: { value: 1 } };
    const sparkles = new THREE.Points(
      sparkleGeometry,
      new THREE.ShaderMaterial({
        uniforms: sparkleUniforms,
        vertexShader: SPARKLE_VERTEX,
        fragmentShader: SPARKLE,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    stars.add(sparkles);

    // A shooting star now and then, far behind the planet, crossing the sky on a downward slant.
    const METEOR_DEPTH = -15;
    const METEOR_LENGTH = 3;
    const METEOR_SPEED = 18; // world units per second at that depth
    const METEOR_LIFE = 0.9;
    const meteorGeometry = new THREE.PlaneGeometry(1, 1);
    const meteorUniforms = { life: { value: 0 } };
    const meteor = new THREE.Mesh(
      meteorGeometry,
      new THREE.ShaderMaterial({
        uniforms: meteorUniforms,
        vertexShader: METEOR_VERTEX,
        fragmentShader: METEOR,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    // About two text rows thick, so the ASCII pass always catches it.
    meteor.scale.set(METEOR_LENGTH, 0.22, 1);
    meteor.visible = false;
    const meteorFrom = new THREE.Vector3();
    const meteorDir = new THREE.Vector3();
    let meteorAge = -1;
    let meteorWait = 3 + Math.random() * 4;

    scene.add(stars, world, meteor);

    // The scene draws into an offscreen target; a full-screen pass turns that into glyphs.
    const target3d = new THREE.WebGLRenderTarget(1, 1);
    const asciiUniforms = {
      scene: { value: target3d.texture },
      glyphs: { value: null as THREE.Texture | null },
      resolution: { value: new THREE.Vector2(1, 1) },
      cell: { value: new THREE.Vector2(CELL.w, CELL.h) },
      count: { value: RAMP.length },
    };
    const asciiQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ uniforms: asciiUniforms, vertexShader: ASCII_VERTEX, fragmentShader: ASCII, blending: THREE.NoBlending, depthTest: false }),
    );
    const asciiScene = new THREE.Scene().add(asciiQuad);
    const asciiCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const sizeAscii = () => {
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      target3d.setSize(size.x, size.y);
      asciiUniforms.resolution.value.copy(size);
      const ratio = renderer.getPixelRatio();
      sparkleUniforms.pixelRatio.value = ratio;
      const w = Math.round(CELL.w * ratio);
      const h = Math.round(CELL.h * ratio);
      if (asciiUniforms.cell.value.x !== w || asciiUniforms.cell.value.y !== h || !asciiUniforms.glyphs.value) {
        asciiUniforms.glyphs.value?.dispose();
        asciiUniforms.glyphs.value = glyphAtlas(w, h);
        asciiUniforms.cell.value.set(w, h);
      }
    };

    let dirty = true;
    const markDirty = () => void (dirty = true);
    let width = 1;
    let height = 1;
    // Left edge of the open panel in CSS px, read when the layout can change rather than per frame.
    let panelLeft: number | null = null;
    const measurePanel = () => {
      const node = document.querySelector<HTMLElement>(".panel");
      panelLeft = node ? node.offsetLeft : null;
    };
    const resize = () => {
      width = el.clientWidth;
      height = el.clientHeight;
      renderer.setSize(width, height, false);
      sizeAscii();
      camera.aspect = width / height;
      narrow = window.innerWidth < NARROW;
      // Phones: the planet sits above the content, smaller.
      camera.position.z = narrow ? 8 : 6.2;
      planet.position.y = narrow ? 0.9 : 0;
      measurePanel();
      camera.updateProjectionMatrix();
      dirty = true;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    // A flare is motion; a still sky has none, rather than a few stars frozen mid-flare.
    sparkles.visible = !still.matches;
    const updateMeteor = (dt: number) => {
      if (meteorAge < 0) {
        meteorWait -= dt;
        if (meteorWait > 0) return;
        // Start somewhere in the upper sky and head down-left or down-right at 20-50°.
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - METEOR_DEPTH);
        const halfW = halfH * camera.aspect;
        const side = Math.random() < 0.5 ? -1 : 1;
        const slant = THREE.MathUtils.degToRad(20 + Math.random() * 30);
        meteorDir.set(side * Math.cos(slant), -Math.sin(slant), 0);
        meteorFrom.set((Math.random() * 1.4 - 0.7) * halfW - side * halfW * 0.2, (0.3 + Math.random() * 0.6) * halfH, METEOR_DEPTH);
        meteor.rotation.z = Math.atan2(meteorDir.y, meteorDir.x);
        meteor.visible = true;
        meteorAge = 0;
      }
      meteorAge += dt;
      const t = meteorAge / METEOR_LIFE;
      if (t >= 1) {
        meteor.visible = false;
        meteorAge = -1;
        meteorWait = 4 + Math.random() * 8;
        return;
      }
      meteorUniforms.life.value = Math.sin(Math.PI * t);
      // The head runs ahead; the mesh's centre trails it by half a length.
      meteor.position.copy(meteorFrom).addScaledVector(meteorDir, METEOR_SPEED * meteorAge - METEOR_LENGTH / 2);
    };
    // World units per CSS pixel at the planet's depth.
    const unitsPerPx = () => (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / height;
    const target = () => {
      const { panel, auth } = getOrbit();
      if (narrow) return { x: 0, scale: 1 };
      // A panel open: the planet centres in the space left of it, sized to fit, so page zoom
      // and window width move it with the panel.
      if (panel) {
        const free = panelLeft ?? width * 0.4;
        return { x: (free / 2 - width / 2) * unitsPerPx(), scale: Math.min(0.8, free * 0.36 * unitsPerPx()) };
      }
      // Sign-in: the planet centres in the left half (auth.css centres the card in the right),
      // shrinking on narrow windows so it stays inside its half.
      if (auth) return { x: -(width / 4) * unitsPerPx(), scale: Math.min(1, width * 0.2 * unitsPerPx()) };
      return { x: 0, scale: 1 };
    };
    const onOrbit = () => {
      measurePanel();
      placePin();
      markDirty();
    };
    onOrbit();
    const unsubscribe = subscribeOrbit(onOrbit);

    const clock = new THREE.Clock();

    // Mouse drag turns the planet: the point under the cursor follows it. Window listeners, since
    // the page sits above the scene; drags that start on a control or a panel are left alone.
    const ray = new THREE.Raycaster();
    const ball = new THREE.Sphere();
    const ndc = new THREE.Vector2();
    const overPlanet = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      ndc.set(((e.clientX - box.left) / width) * 2 - 1, -((e.clientY - box.top) / height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      planet.getWorldPosition(ball.center);
      ball.radius = world.scale.x;
      return ray.ray.intersectsSphere(ball);
    };
    const onControl = (e: PointerEvent) =>
      e.target instanceof Element && !!e.target.closest("a, button, input, textarea, select, label, .panel");
    let drag: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0 || narrow || onControl(e) || !overPlanet(e)) return;
      drag = { x: e.clientX, y: e.clientY };
      document.documentElement.style.cursor = "grabbing";
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) {
        if (e.pointerType !== "touch" && !narrow) {
          document.documentElement.style.cursor = !onControl(e) && overPlanet(e) ? "grab" : "";
        }
        return;
      }
      const k = unitsPerPx() / world.scale.x; // arc length over radius
      surface.rotation.y += (e.clientX - drag.x) * k;
      globe.rotation.x = THREE.MathUtils.clamp(globe.rotation.x + (e.clientY - drag.y) * k, -1.2, 1.2);
      drag = { x: e.clientX, y: e.clientY };
      markDirty();
    };
    const onUp = () => {
      if (!drag) return;
      drag = null;
      document.documentElement.style.cursor = "";
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    // Reduced motion draws only when something moved; a phone sheet covers the scene, so it draws nothing.
    // Off to the side the planet's visible centre faces the camera, not straight ahead: turn that much further.
    const pinGoal = (lon: number) => facing(lon) + Math.atan2(-target().x, camera.position.z);
    // Pinned: no axial tilt, and the place's latitude tipped toward the viewer.
    const tiltGoal = () => (pinned ? { x: THREE.MathUtils.degToRad(pinned.lat), z: 0 } : { x: 0, z: TILT });
    const frame = () => {
      const covered = narrow && getOrbit().panel;
      if (covered) return;
      const settling =
        Math.abs(getOrbit().health - uniforms.health.value) > 1e-3 ||
        Math.abs(getOrbit().blight - uniforms.blight.value) > 1e-3 ||
        Math.abs(target().x - world.position.x) > 1e-3 ||
        Math.abs(target().scale - world.scale.x) > 1e-3 ||
        (pinned !== null && Math.abs(turn(surface.rotation.y, pinGoal(pinned.lon))) > 1e-3) ||
        Math.abs(tiltGoal().x - globe.rotation.x) > 1e-3 ||
        Math.abs(tiltGoal().z - globe.rotation.z) > 1e-3;
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
      const ease = drag ? 0 : still.matches ? 1 : Math.min(1, dt * 3);
      const tilt = tiltGoal();
      globe.rotation.x += (tilt.x - globe.rotation.x) * ease;
      globe.rotation.z += (tilt.z - globe.rotation.z) * ease;
      if (drag) {
        // The hand holds the planet.
      } else if (pinned) {
        // A server is open: the planet stops and turns its place to the front.
        surface.rotation.y += turn(surface.rotation.y, pinGoal(pinned.lon)) * ease;
      } else if (!still.matches) {
        surface.rotation.y += dt * 0.035;
      }
      // Clouds are pinned to the map they were photographed on, so they turn with the ground.
      clouds.rotation.y = surface.rotation.y;
      if (!still.matches) {
        stars.rotation.y += dt * 0.002;
        sparkleUniforms.time.value += dt;
        auroraUniforms.time.value += dt;
        auroraUniforms.strength.value = auroraStrength(auroraUniforms.time.value);
        updateMeteor(dt);
        moonOrbit.rotation.y += dt * 0.06;
      }
      world.updateMatrixWorld();
      sun.copy(sunLocal).transformDirection(surface.matrixWorld);
      renderer.setRenderTarget(target3d);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(asciiScene, asciiCamera);
    };
    renderer.setAnimationLoop(frame);

    return () => {
      renderer.setAnimationLoop(null);
      window.clearInterval(cloudTimer);
      window.clearInterval(sunTimer);
      liveMap?.dispose();
      unsubscribe();
      observer.disconnect();
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.documentElement.style.cursor = "";
      [sphere, starGeometry, sparkleGeometry, pinGeometry, moonGeometry, meteorGeometry].forEach((g) => g.dispose());
      [surface, clouds, halo, ...aurora, stars, sparkles, moon, meteor].forEach((o) => (o.material as THREE.Material).dispose());
      [pinMaterial, pinRimMaterial].forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      target3d.dispose();
      asciiQuad.geometry.dispose();
      asciiQuad.material.dispose();
      asciiUniforms.glyphs.value?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="scene" aria-hidden="true" />;
}

export default OrbitScene;
