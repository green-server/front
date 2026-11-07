"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { SCENES, type Scene } from "./scenes";

const VERTEX = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

function compile(gl: WebGL2RenderingContext, fragment: string) {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, fragment]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

const onTheme = (notify: () => void) => {
  window.addEventListener("themechange", notify);
  return () => window.removeEventListener("themechange", notify);
};

function Canvas({ scene }: { scene: Scene }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current!;
    const gl = el.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
    const program = gl && compile(gl, scene.fragment);
    if (!gl || !program) return;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    const res = gl.getUniformLocation(program, "R");
    const time = gl.getUniformLocation(program, "T");

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now() - 40_000 * 1000 * Math.random();
    const draw = () => {
      const scale = Math.min(devicePixelRatio, scene.scale);
      const width = Math.round(innerWidth * scale);
      const height = Math.round(innerHeight * scale);
      if (el.width !== width || el.height !== height) {
        el.width = width;
        el.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform2f(res, width, height);
      gl.uniform1f(time, (performance.now() - started) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    draw();
    addEventListener("resize", draw);
    // An idle tab draws nothing.
    const timer = still ? undefined : setInterval(() => !document.hidden && draw(), scene.frameMs);
    return () => {
      clearInterval(timer);
      removeEventListener("resize", draw);
    };
  }, [scene]);

  return <canvas ref={canvas} className="theme-scene" aria-hidden="true" />;
}

/** The themes that are places. Without WebGL2 each theme's CSS background stays visible. */
export function ThemeScene() {
  const theme = useSyncExternalStore(onTheme, () => document.documentElement.dataset.theme ?? "", () => "");
  const scene = SCENES[theme];
  // Keyed so each scene starts on its own canvas.
  return scene ? <Canvas key={theme} scene={scene} /> : null;
}
