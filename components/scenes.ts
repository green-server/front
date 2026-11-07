// Fragment shaders for the themes that are real places. Each draws one full-screen triangle.

export type Scene = {
  fragment: string;
  /** Slow scenes need few frames, and an idle dashboard should not spin the GPU. */
  frameMs: number;
  /** Render size against CSS pixels; soft scenes get away with less. */
  scale: number;
};

// Low Earth orbit at orbital sunrise. Sizes are in Earth radii; the atmosphere is scaled about
// three times thicker than life so it survives a dozen ray-march steps.
const SPACE = `#version 300 es
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

const HEAD = `#version 300 es
precision highp float;
uniform vec2 R; uniform float T; out vec4 o;
float h21(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float n2(vec2 x){ vec2 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p,int n){ float a=.5,s=0.; for(int i=0;i<n;i++){ s+=a*n2(p); p=mat2(1.6,1.2,-1.2,1.6)*p+7.1; a*=.5; } return s; }
vec3 aces(vec3 x){ return clamp(x*(2.51*x+.03)/(x*(2.43*x+.59)+.14),0.,1.); }
float ign(vec2 p){ return fract(52.9829*fract(dot(p,vec2(.0671,.00584)))); }
void show(vec3 c){ o=vec4(pow(aces(c),vec3(1./2.2))+(ign(gl_FragCoord.xy)-.5)/255.,1.); }
`;

// An arctic lake at night. The curtains stand on a plane about 100 km up, so they fold toward the
// horizon by perspective alone. Colour is the real emission: oxygen green low, oxygen red high,
// and a nitrogen pink rim on the lower border when a curtain is bright.
const AURORA = HEAD + `
// March through depth, not height: a ray then crosses each thin vertical sheet at one spot, so
// the rays stay sharp and an edge-on fold brightens by itself, as it does in the sky.
vec3 curtain(vec3 rd, float jit){
  vec3 sum=vec3(0.);
  const int N=34;
  for(int i=0;i<N;i++){
    float z=2.2+(float(i)+jit)/float(N)*15., t=z/-rd.z, x=rd.x*t, alt=rd.y*t;
    if(alt<.5||alt>12.) continue;
    float w=fbm(vec2(x*.1+T*.008,z*.05),2);
    float zc=7.2+3.1*sin(x*.27+w*5.+T*.019)+1.2*sin(x*.83-T*.031);
    float zd=12.6+2.2*sin(x*.19-w*4.+T*.014);
    float s=exp(-pow(z-zc,2.)*3.2)+.7*exp(-pow(z-zd,2.)*2.2);
    if(s<.01) continue;
    float xs=x+z*.4, f=n2(vec2(xs*4.3,T*.05)), g=n2(vec2(xs*1.1-T*.03,3.)), l=n2(vec2(xs*13.,T*.08));
    float rays=.08+2.6*pow(f*g,1.2)+.9*pow(l,3.)*(.3+g);
    float h=(alt-1.-.28*n2(vec2(x*.9,T*.03)))*(.55+.1*sin(x));
    float prof=smoothstep(-.03,.05,h)*exp(-max(h,0.)*(.75+.4*g));
    vec3 c=mix(vec3(.05,1.,.42),vec3(.5,.05,.4),smoothstep(.75,2.6,h));
    c+=vec3(1.,.07,.36)*exp(-max(h,0.)*16.)*max(rays-.7,0.)*.55;
    sum+=c*s*rays*prof;
  }
  return sum*.085;
}

vec3 night(vec3 rd){
  float az=atan(rd.x,-rd.z), el=rd.y;
  vec3 c=mix(vec3(.0028,.0065,.014),vec3(.0009,.0016,.0045),smoothstep(0.,.45,el));
  for(int i=0;i<2;i++){ float k=i==0?560.:230.;
    vec2 g=vec2(az,el)*k, id=floor(g), f=fract(g)-.5; float h=h21(id+float(i)*11.);
    if(h>(i==0?.93:.988)){ f-=(vec2(h21(id+1.),h21(id+2.))-.5)*.6;
      float m=pow(h21(id+7.),9.), tw=.82+.18*sin(T*(1.+h*3.)+h*40.);
      c+=mix(vec3(1.,.82,.62),vec3(.72,.84,1.),h21(id+3.))*(.006+m*(i==0?.5:3.))*exp(-dot(f,f)*(i==0?9.:22.))*tw; } }
  float band=exp(-pow(el-.34+az*.42,2.)*30.), dust=smoothstep(.36,.62,fbm(vec2(az-el,el+az)*9.,5));
  return c+band*(.25+dust)*vec3(.006,.0058,.0085)*smoothstep(.03,.22,el);
}

// Ridged noise gives sharp crests instead of rolling hills.
float crest(float a, float s){ float v=0., m=.5; for(int i=0;i<6;i++){ v+=m*(1.-abs(2.*n2(vec2(a,s))-1.)); a=a*2.07+1.3; m*=.48; } return v; }

// Moonless: rock stays black and snow only holds the green the sky puts on it.
vec3 slope(float a, float e, float top, vec3 tint){
  float gully=crest(a*7.+e*24.,4.), body=fbm(vec2(a*5.,e*22.),3);
  return tint*(.12+pow(gully*.8,3.2)*(.55+body))*exp(-(top-e)*3.2);
}

vec3 above(vec3 rd, float jit, float glow){
  float a=atan(rd.x,-rd.z), e=rd.y;
  float far=.03+.3*pow(crest(a*1.45+2.,1.)*.86,4.2);
  float near=.008+.13*pow(crest(a*2.6+8.,9.)*.86,4.6);
  float trees=.004+.01*smoothstep(.3,.7,n2(vec2(a*7.,5.)))*(.4+.6*n2(vec2(a*180.,1.)))+.012*pow(n2(vec2(a*520.,2.)),2.);
  if(e<trees) return vec3(.0007,.0012,.0016);
  if(e<near) return slope(a,e,near,vec3(.012,.036,.03)*glow)+vec3(.0012,.002,.0026);
  if(e<far) return slope(a,e,far,vec3(.035,.13,.1)*glow)+vec3(.002,.0044,.0058);
  return night(rd)+curtain(rd,jit);
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; float jit=ign(gl_FragCoord.xy);
  vec3 rd=normalize(vec3(uv+vec2(0.,.3),-.9));
  float glow=.9+.3*sin(T*.03);
  if(rd.y>=0.){ show(above(rd,jit,glow)); return; }
  float t=.25/-rd.y; vec2 p=rd.xz*t;
  float w=fbm(p*vec2(.9,4.5)+vec2(0.,T*.04),3)-.5, w2=fbm(p*vec2(2.2,11.)-vec2(T*.02,0.),2)-.5;
  float calm=smoothstep(.0,.18,-rd.y);
  vec3 m=normalize(vec3(rd.x+w*.012*calm,-rd.y+(w+w2*.6)*.05*calm,rd.z)); m.y=max(m.y,.0005);
  float fres=.26+.6*pow(1.+rd.y,10.);
  show(above(m,jit,glow)*fres+vec3(.0007,.0016,.0024));
}`;

// Four thousand metres down, seen from a tethered vehicle. Nothing is lit but what its two lamps
// reach; the water eats red first, and marine snow only shows inside the beams.
const ABYSS = HEAD + `
const vec3 ABS=vec3(.2,.075,.07);
const vec3 L1=vec3(-1.5,.7,-.6), L2=vec3(1.45,.85,-.4), AIM=vec3(.5,-1.4,-4.6);
float rough(vec2 p){ float big=fbm(p*.16,3), mid=fbm(p*.55+big*1.6,3); return -1.8+big*1.15+mid*mid*.3; }
// Manganese nodules: dark lumps strewn over the sediment, the real floor of the abyssal plain.
float nodules(vec2 p){ float s=0.;
  for(int i=0;i<2;i++){ float k=i==0?3.1:6.7; vec2 g=p*k+float(i)*3.7, id=floor(g), f=fract(g)-.5; float h=h21(id);
    if(h>.3){ f-=(vec2(h21(id+1.),h21(id+2.))-.5)*.5; float a=atan(f.y,f.x)+h*9., d=length(f*vec2(1.,1.2))/(.11+.2*h21(id+3.))*(1.+.11*sin(a*3.)+.06*sin(a*7.)); s=max(s,sqrt(max(1.-d*d,0.))); } }
  return s; }
float bed(vec2 p){ return rough(p)+.03*fbm(p*3.,3)+.006*n2(p*19.)+.075*nodules(p); }
float beam(vec3 p, vec3 l){ vec3 v=p-l; float d=length(v), c=dot(v/d,normalize(AIM-l));
  return smoothstep(.8,.99,c)*exp(-d*.2)/(.5+d*d*.1); }
float light(vec3 p){ return beam(p,L1)+.9*beam(p,L2); }

vec3 floorAt(vec3 p, float t){
  vec2 e=vec2(.012,0.);
  vec3 n=normalize(vec3(bed(p.xz-e)-bed(p.xz+e),2.*e.x,bed(p.xz-e.yx)-bed(p.xz+e.yx)));
  float grain=fbm(p.xz*26.,3), lump=nodules(p.xz);
  float diff=max(dot(n,normalize(L1-p)),0.)+max(dot(n,normalize(L2-p)),0.);
  float sh=1.-.6*nodules(p.xz+normalize(p.xz-L1.xz)*.05);
  vec3 alb=vec3(.7,.65,.56)*(.72+.42*grain)*sh;
  alb=mix(alb,vec3(.15,.125,.1)*(.6+.8*grain),smoothstep(.0,.12,lump));
  vec3 h=normalize(normalize(L1-p)-normalize(p));
  float gloss=lump>.05?pow(max(dot(n,h),0.),26.)*.3:0.;
  return (alb*(.03+diff*.95)+gloss)*light(p)*exp(-ABS*t)*1.25;
}

vec3 snow(vec2 uv, vec3 rd){
  vec3 s=vec3(0.);
  for(int i=0;i<5;i++){
    float z=.8+float(i)*.95, k=9.*z; vec2 g=uv*k+vec2(sin(T*.05+z)*.4+float(i)*7.3,T*(.16/z+.04));
    vec2 id=floor(g), f=fract(g)-.5; float h=h21(id+float(i)*31.);
    if(h<.3) continue;
    f-=(vec2(h21(id+1.),h21(id+2.))-.5)*.72;
    float r=(.012+.04*pow(h21(id+5.),7.))*(1.4-z*.14);
    s+=smoothstep(r,r*.15,length(f*vec2(1.,.8+.5*h)))*(light(rd*z*1.9)*2.4+.0009)*exp(-ABS*z*.7);
  }
  return s;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; float jit=ign(gl_FragCoord.xy);
  uv+=.004*vec2(sin(T*.11),cos(T*.09));
  vec3 rd=normalize(vec3(uv.x,uv.y-.13,-1.)), c=vec3(0.);
  float t=.5+jit*.02, hit=-1.;
  for(int i=0;i<26;i++){ vec3 p=rd*t; float d=p.y-rough(p.xz); if(d<.004*t){ hit=t; break; } t+=max(d*.8,.03+t*.01); if(t>13.) break; }
  if(hit>0.) c=floorAt(rd*hit,hit);
  float end=hit>0.?hit:11., acc=0.;
  for(int i=0;i<10;i++){ float s=(float(i)+jit)/10.; vec3 p=rd*s*end;
    acc+=light(p)*(.45+n2(p.xz*1.6+vec2(p.y*2.,T*.04))*.9)*exp(-s*end*.16); }
  c+=vec3(.1,.28,.3)*acc*end/10.*.05;
  c+=snow(uv,rd)*vec3(.86,1.,.97)*1.4;
  vec2 g=uv*7.+vec2(1.7,T*.012), id=floor(g), f=fract(g)-.5; float h=h21(id);
  if(h>.82){ f-=(vec2(h21(id+3.),h21(id+4.))-.5)*.6; float tw=pow(.5+.5*sin(T*(.4+h)+h*90.),7.);
    c+=vec3(.05,.75,1.)*exp(-dot(f,f)*2600.)*tw*.8*smoothstep(-.02,.2,uv.y); }
  show(c+vec3(.00015,.0009,.0017));
}`;

// A lava field at night, from a ridge above it. Cooled crust breaks into plates and the melt shows
// through the seams: the colour is a blackbody ramp, so hot means bright, not just orange.
const LAVA = HEAD + `
vec2 h22(vec2 p){ return vec2(h21(p),h21(p+19.7)); }
vec3 plates(vec2 p){
  vec2 n=floor(p), f=fract(p), mg=vec2(0.), mr=vec2(0.); float md=8.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(i,j), o=h22(n+g), r=g+.5+.42*sin(T*.05+6.28*o)-f; float d=dot(r,r);
    if(d<md){ md=d; mr=r; mg=g; } }
  float e=8.;
  for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ vec2 g=mg+vec2(i,j), o=h22(n+g), r=g+.5+.42*sin(T*.05+6.28*o)-f;
    if(dot(mr-r,mr-r)>1e-5) e=min(e,dot(.5*(mr+r),normalize(r-mr))); }
  return vec3(e,h22(n+mg));
}
// Blackbody-ish: dull red at the edge of visibility, orange at 1000 degrees, yellow only at the core.
vec3 hot(float x){ x=clamp(x,0.,1.); return vec3(.26*x+1.5*x*x+2.4*x*x*x, .02*x+.5*x*x*x+1.1*pow(x,6.), .18*pow(x,8.)); }

vec3 ground(vec2 p, float d){
  vec2 flow=vec2(T*.016,-T*.005);
  vec2 q=p+vec2(fbm(p*.7+flow,3),fbm(p*.7+vec2(5.,2.)-flow,3))*1.5;
  // Ropes of pahoehoe: crust stretched along the flow.
  float rope=sin((q.y+fbm(q*.9,3)*3.4)*17.+fbm(q*2.,2)*5.)*.5+.5;
  vec3 a=plates(q*.9+flow), b=plates(q*2.9+flow*2.+a.yz*3.);
  float zone=fbm(p*.2+vec2(flow.x*.3,3.),3), open=smoothstep(.45,.62,zone);
  float along=fbm(q*2.3+flow,3), vary=smoothstep(.3,.68,along);
  float seam=exp(-a.x/(.006+.075*vary*vary+.05*open))*smoothstep(.2,.5,along+open*.5);
  float fine=exp(-b.x/.017)*vary*(.3+.7*open)*smoothstep(.0,.25,.3-a.x+open*.2)*.75;
  float pool=open*smoothstep(.38,.7,fbm(q*1.4-flow,4))*.86;
  float pulse=.86+.14*sin(T*.2+a.y*6.28)*sin(T*.13+a.z*6.28);
  float far=smoothstep(14.,36.,d);
  float heat=max(max(seam,fine)*pulse,pool);
  heat=mix(heat,max(smoothstep(.42,.6,fbm(p*.5+flow,3))*.58*pulse,heat*.5),far);
  float h0=fbm(q*6.,3), e=.02, hx=fbm((q+vec2(e,0.))*6.,3), hy=fbm((q+vec2(0.,e))*6.,3);
  vec3 n=normalize(vec3((h0-hx)/e*.1+(rope-.5)*.3,1.,(h0-hy)/e*.1));
  vec3 rock=vec3(.018,.0155,.0165)*(.45+h0*.8)*(.72+.4*rope);
  rock*=.35+.9*max(dot(n,normalize(vec3(.4,.55,-.5))),0.);
  rock+=vec3(.42,.08,.012)*(exp(-a.x*5.5)*vary*.3+.05*open+.09*smoothstep(.2,.8,heat))*(.35+.8*max(dot(n,vec3(0.,.8,.6)),0.));
  return rock+hot(heat)*smoothstep(.02,.26,heat);
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  float hz=.385, y=hz-uv.y; vec3 c;
  if(y>0.){ float wav=.0012*sin(uv.y*70.+T*1.8)*smoothstep(0.,.25,y);
    float d=.72/(y+.016); vec2 p=vec2((uv.x+wav)*d*.9,d*1.45);
    c=ground(p,d);
    float haze=1.-exp(-d*.022);
    c=mix(c,vec3(.075,.016,.008),haze*.9); }
  else { float e=-y, a=uv.x;
    float ridgeL=.03+.09*fbm(vec2(a*2.3,1.),6)+.012*n2(vec2(a*42.,3.));
    float cone=.015+.135*exp(-abs(a-.34)*2.5)+.018*fbm(vec2(a*9.,2.),5);
    float top=max(ridgeL*.65,cone);
    float sm=fbm(vec2(a*1.7-T*.004,e*3.-T*.012)+fbm(vec2(a,e)*2.6-T*.008,4)*1.4,5);
    vec3 sky=mix(vec3(.06,.014,.008),vec3(.0025,.0028,.006),smoothstep(0.,.16,e));
    float plume=smoothstep(.35,.7,sm)*exp(-pow((a-.34-e*.5)*3.2,2.));
    sky=mix(sky,vec3(.17,.04,.016)*exp(-e*5.5)+.004,plume);
    c=e<top?vec3(.0035,.0028,.003)+vec3(.09,.016,.005)*exp(-(top-e)*30.)*.0+vec3(.05,.01,.004)*smoothstep(.04,.0,e):sky; }
  for(int i=0;i<4;i++){ float z=1.+float(i)*.8, k=8.*z; vec2 g=uv*k+vec2(sin(T*.14+uv.y*3.+z)*.25+float(i)*9.,-T*(.2/z+.05));
    vec2 id=floor(g), f=fract(g)-.5; float h=h21(id+float(i)*17.);
    if(h>.93){ f-=(h22(id)-.5)*.7; float tw=.5+.5*sin(T*(1.+h*4.)+h*60.);
      c+=vec3(1.,.3,.05)*exp(-dot(f,f)*(1100.+z*700.))*(.4+tw)*(1.3/z)*smoothstep(.42,-.3,uv.y); } }
  show(c*.82);
}`;

export const SCENES: Record<string, Scene> = {
  space: { fragment: SPACE, frameMs: 220, scale: 1.5 },
  aurora: { fragment: AURORA, frameMs: 140, scale: 1 },
  abyss: { fragment: ABYSS, frameMs: 100, scale: .7 },
  lava: { fragment: LAVA, frameMs: 120, scale: 1 },
};
