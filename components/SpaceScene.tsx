"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const VERTEX = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

// Low Earth orbit at orbital sunrise. Sizes are in Earth radii; the atmosphere is scaled about
// three times thicker than life so it survives a dozen ray-march steps.
const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 R; uniform float T; out vec4 o;
const vec3 SUN = normalize(vec3(.3, -.235, -1.));
const vec3 RO = vec3(0., 1.075, 0.);
const float RA = 1.022, HR = .0027, HM = .0007;
const vec3 BR = vec3(14., 33., 82.); const float BM = 26.;

float h1(vec3 p){ p = fract(p*.3183099+.1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h1(i),h1(i+vec3(1,0,0)),f.x),mix(h1(i+vec3(0,1,0)),h1(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h1(i+vec3(0,0,1)),h1(i+vec3(1,0,1)),f.x),mix(h1(i+vec3(0,1,1)),h1(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p, int n){ float a=.5, s=0.; for(int i=0;i<n;i++){ s+=a*vn(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s; }
vec2 sph(vec3 ro, vec3 rd, float r){ float b=dot(ro,rd), c=dot(ro,ro)-r*r, d=b*b-c; if(d<0.) return vec2(1e9,-1e9); d=sqrt(d); return vec2(-b-d,-b+d); }
mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0,-s, 0,1,0, s,0,c); }
vec3 odSun(vec3 p, float h){ float mu=dot(normalize(p),SUN); float f=1./max(mu+.12*exp(-max(mu,0.)*6.)+.02,.02);
  return BR*HR*exp(-h/HR)*f + vec3(BM*1.1*HM*exp(-h/HM)*f); }

// Samples crowd toward the lowest point of the ray: the air is a thin shell, and even steps
// would overshoot it and burn the planet white.
void scatter(vec3 ro, vec3 rd, float tMax, bool hit, out vec3 sum, out vec3 trans){
  vec2 a=sph(ro,rd,RA); float t0=max(a.x,0.), t1=min(a.y,tMax); sum=vec3(0.); trans=vec3(1.);
  if(t1<=t0) return;
  const int N=18; float mu=dot(rd,SUN);
  float pr=.0597*(1.+mu*mu), g=.76, pm=.1194*(1.-g*g)*(1.+mu*mu)/((2.+g*g)*pow(1.+g*g-2.*g*mu,1.5));
  float tc=clamp(-dot(ro,rd),t0,t1), span=t1-t0; vec3 odv=vec3(0.), acc=vec3(0.);
  for(int i=0;i<N;i++){ float u=(float(i)+.5)/float(N), t, ds;
    if(hit){ float w=1.-u; t=t1-span*w*w; ds=span*2.*w/float(N); }
    else { float v=2.*u-1., side=v<0.?tc-t0:t1-tc; t=tc+sign(v)*v*v*side; ds=side*abs(v)*4./float(N); }
    vec3 q=ro+rd*t; float h=max(length(q)-1.,0.), dr=exp(-h/HR)*ds, dm=exp(-h/HM)*ds;
    odv+=BR*dr+vec3(BM*1.1*dm);
    float along=dot(q,SUN), vis=along>0.?1.:smoothstep(.992,1.006,length(q-SUN*along));
    acc+=vis*exp(-odv-odSun(q,h))*(BR*dr*pr+vec3(BM*dm*pm)*(hit?.22:1.)); }
  sum=acc*(hit?2.1:14.); trans=hit?mix(exp(-odv),vec3(1.),.72):exp(-odv);
}

vec3 surface(vec3 n, vec3 rd){
  vec3 q=rotY(T*.0016)*n, c=rotY(T*.0021)*n;
  float warp=fbm(q*3.1,4), cont=fbm(q*2.3+warp*1.1,6), land=smoothstep(.505,.53,cont);
  float rough=fbm(q*14.,5), lat=abs(n.z);
  vec3 ocean=mix(vec3(.003,.018,.062),vec3(.005,.036,.09),fbm(q*5.,3));
  vec3 ground=mix(vec3(.018,.04,.016),vec3(.13,.095,.055),smoothstep(.42,.62,rough+.25*(1.-lat)));
  vec3 alb=mix(ocean,ground,land);
  float cw=fbm(c*5.,5), cl=fbm(c*vec3(15.,23.,15.)+cw*4.2,8)+.16*(fbm(c*2.1,3)-.5), cov=smoothstep(.43,.6,cl);
  float shade=fbm(rotY(T*.0021)*normalize(n+SUN*.01)*vec3(15.,23.,15.)+cw*4.2,5);
  float nl=dot(n,SUN), lit=max(nl,0.), gl=smoothstep(-.02,.1,nl);
  vec3 sunT=exp(-odSun(n*1.0005,.0005)*.5), col=alb*lit*sunT*3.4*(1.-.7*smoothstep(.42,.58,shade));
  vec3 hv=normalize(SUN-rd); col+=(1.-land)*(1.-cov)*sunT*pow(max(dot(n,hv),0.),420.)*6.*gl;
  col=mix(col,vec3(.95,.96,1.)*(lit*1.5+.018)*sunT*(.72+.5*smoothstep(.5,.72,cl)),cov);
  float night=smoothstep(.02,-.07,nl), grid=vn(q*1100.)*vn(q*430.), city=smoothstep(.3,.62,grid)*smoothstep(.45,.58,fbm(q*16.,4));
  col+=night*land*(1.-cov*.9)*city*vec3(1.,.7,.38)*3.2;
  col+=night*cov*vec3(.012,.016,.03);
  return col;
}

vec3 sky(vec3 rd){
  vec3 axis=normalize(vec3(.62,.42,-.66)); float b=dot(rd,axis), band=exp(-b*b*16.), dust=fbm(rd*9.,6);
  float lane=smoothstep(.56,.34,dust)*.8+.2, dense=band*lane;
  vec3 g=rd*640., id=floor(g), f=fract(g)-.5; float h=h1(id/640.*97.), s=0.; vec3 tint=vec3(1.);
  if(h>.982-dense*.2){ float m=pow(h1(id/640.*53.),26.), d=length(f);
    s=(.006+m*6.)*exp(-d*d*11.); tint=mix(vec3(1.,.82,.62),vec3(.74,.84,1.),h1(id/640.*31.)); }
  vec3 mw=band*lane*vec3(.03,.028,.033);
  return tint*s+mw;
}

vec3 aces(vec3 x){ return clamp(x*(2.51*x+.03)/(x*(2.43*x+.59)+.14),0.,1.); }

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; float r=.075, c=cos(r), s=sin(r); uv=mat2(c,-s,s,c)*uv;
  vec3 rd=normalize(vec3(uv.x*.92, uv.y*.92-.145, -1.));
  vec2 e=sph(RO,rd,1.); bool hit=e.x<e.y && e.x>0.;
  vec3 ins, tr; scatter(RO,rd,hit?e.x:1e9,hit,ins,tr);
  vec3 col;
  if(hit) col=surface(normalize(RO+rd*e.x),rd);
  else { col=sky(rd); float mu=max(dot(rd,SUN),0.); col+=vec3(1.,.97,.9)*smoothstep(.99995,.99998,mu)*900.; }
  col=col*tr+ins;
  // Glare happens in the lens, so it lies over the limb too: a soft bloom plus faint aperture spikes.
  vec3 sx=normalize(cross(SUN,vec3(0,1,0))), sy=cross(sx,SUN); vec2 q=vec2(dot(rd,sx),dot(rd,sy))/max(dot(rd,SUN),.001);
  float dist=length(q), ang=atan(q.y,q.x)+.3, spike=pow(abs(cos(ang*3.)),90.)*exp(-dist*34.);
  float seen=hit?.5:1.;
  col+=vec3(1.,.9,.76)*(.00016/(dist*dist+.0007)+exp(-dist*34.)*.3+spike*.45)*seen*step(0.,dot(rd,SUN));
  col=aces(col*1.05); col=pow(col,vec3(1./2.2));
  o=vec4(col+(fract(52.9829*fract(dot(gl_FragCoord.xy,vec2(.0671,.00584))))-.5)/255.,1.);
}`;

const FRAME_MS = 220; // ponytail: fixed cadence; drop the render scale if weak GPUs struggle

function compile(gl: WebGL2RenderingContext) {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
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

/** The 우주 theme's view from orbit. Without WebGL2 the theme's CSS sky stays visible behind it. */
export function SpaceScene() {
  const active = useSyncExternalStore(onTheme, () => document.documentElement.dataset.theme === "space", () => false);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const el = canvas.current!;
    const gl = el.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
    const program = gl && compile(gl);
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
      const scale = Math.min(devicePixelRatio, 1.5);
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
    // Earth turns too slowly to need 60 frames; an idle tab draws nothing.
    const timer = still ? undefined : setInterval(() => !document.hidden && draw(), FRAME_MS);
    return () => {
      clearInterval(timer);
      removeEventListener("resize", draw);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [active]);

  // Keyed so the lost context is never reused when the theme returns.
  return active ? <canvas key="space" ref={canvas} className="space-scene" aria-hidden="true" /> : null;
}
