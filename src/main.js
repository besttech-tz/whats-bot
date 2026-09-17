const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const clamp01 = (value) => clamp(value, 0, 1);
const damp = (current, target, speed, delta) => current + (target - current) * (1 - Math.exp(-speed * delta));
const mix = (from, to, amount) => from.map((value, index) => value + (to[index] - value) * amount);
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isCoarsePointer = matchMedia('(pointer: coarse)');

const dom = {
  canvas: $('#scene'), loader: $('.loader'), progress: $('.progress span'), coordinate: $('[data-coordinate]'), cursor: $('.cursor'),
  lifeStatus: $('[data-life-status]'), navContext: $('[data-nav-context]'), movements: $$('.movement'), chapters: $$('.chapters a'),
  capabilities: $$('.capability'), capIndex: $('[data-cap-index]'), capCopy: $('[data-cap-copy]'), capMeta: $('[data-cap-meta]'),
  projects: $$('.project'), projectCurrent: $('[data-project-current]'), methodSteps: $$('.method-step'), methodCurrent: $('[data-method-current]'),
  methodState: $('[data-method-state]'), methodSection: $('.method'), workSection: $('.selected-work'), lab: $('.lab'), labTrigger: $('[data-lab-trigger]'),
  energy: $('[data-energy]'), matter: $('[data-matter]'), menuToggle: $('.menu-toggle'), mobileMenu: $('.mobile-menu'),
};
const sceneSections = new Map(dom.movements.map((section) => [Number(section.dataset.scene), section]));
const chapterLinks = new Map(dom.chapters.map((link) => [Number($(link.getAttribute('href')).dataset.scene), link]));

const capData = [
  ['One possible expression of the pattern: immersive platforms where concept, interface and motion operate as one system.', 'STRATEGY · EXPERIENCE · INTERACTION'],
  ['When the signal calls for utility, product logic, interface and engineering resolve together.', 'PRODUCT LOGIC · UX/UI · FRONTEND'],
  ['When an idea needs space and depth, procedural form makes the experience explorable and responsive.', 'WEBGL · GLSL · CREATIVE CODE'],
  ['When familiar interfaces are not enough, prototypes turn new behaviors into dependable tools.', 'PROTOTYPING · R&D · TOOLING'],
  ['When intelligence adds real value, it enters with clear purpose, control and understandable behavior.', 'AI UX · SYSTEM DESIGN · INTEGRATION'],
  ['When identity must move, type, time and interaction become parts of the same expressive language.', 'DIRECTION · MOTION · IDENTITY'],
];
// structure, noise amplitude, noise frequency, satellite spread, satellite speed, filament, symmetry, pulse
const capabilityPresets = [
  [0.35, 0.62, 0.45, 0.72, 0.45, 0.34, 0.22, 0.48],
  [0.88, 0.22, 0.28, 0.42, 0.22, 0.56, 0.82, 0.20],
  [0.48, 0.52, 0.72, 1.00, 0.38, 0.36, 0.28, 0.38],
  [0.38, 0.78, 0.64, 0.66, 0.68, 0.88, 0.12, 0.58],
  [0.74, 0.36, 0.50, 0.58, 0.42, 1.00, 0.64, 0.52],
  [0.62, 0.42, 0.82, 0.54, 0.76, 0.48, 0.92, 1.00],
];
// width, orbit, duplication, filament, depth, cool, pink, flow
const projectPresets = [
  [1.00, 0.14, 0.08, 0.44, 0.32, 0.06, 0.03, 1.00],
  [0.08, 1.00, 0.16, 0.82, 1.00, 0.78, 0.04, 0.26],
  [0.18, 0.22, 1.00, 0.52, 0.46, 0.10, 0.88, 0.62],
];
const lifeStages = ['ORIGIN / DORMANT','SIGNAL / RESPONDING','PATTERN / EMERGING','FORM / ORGANIZING','WORLDS / MULTIPLYING','PRINCIPLE / QUIET','METHOD / REVEALED','SYSTEM / CONNECTING','EVIDENCE / STABLE','WORLD / COMPLETE','FIELD / UNLOCKED','REST / IDLE'];
const methodStates = ['RAW SIGNAL / OBSERVATION / 01','ALIGNMENT / DEFINITION / 02','VISIBLE STRUCTURE / DESIGN / 03','RESOLVED MATTER / BUILD / 04','ADAPTIVE SYSTEM / EVOLVE / 05'];

const sceneTarget = {
  globalProgress: 0, chapter: 0, chapterProgress: 0, capability: 0, project: 0, projectProgress: 0,
  methodProgress: 0, matter: 0, interaction: 0, pointer: [0, 0], velocity: 0,
  capabilityParams: [...capabilityPresets[0]], projectParams: [...projectPresets[0]],
};
const sceneState = {
  globalProgress: 0, chapter: 0, chapterProgress: 0, capability: 0, capabilityMix: 1, project: 0, projectMix: 1,
  projectProgress: 0, methodProgress: 0, matter: 0, interaction: 0, pointer: [0, 0], velocity: 0,
  capabilityParams: [...capabilityPresets[0]], projectParams: [...projectPresets[0]],
};
let capabilityFrom = [...capabilityPresets[0]];
let projectFrom = [...projectPresets[0]];
let labHeld = false;
let dragging = false;
let activeSection = sceneSections.get(0);
let projectManualOrigin = null;
let previousScrollY = scrollY;

function sectionProgress(section) {
  const rect = section.getBoundingClientRect();
  return clamp01((innerHeight - rect.top) / Math.max(1, innerHeight + rect.height));
}
function stickyProgress(section) {
  const rect = section.getBoundingClientRect();
  const range = Math.max(1, rect.height - innerHeight);
  return clamp01(-rect.top / range);
}
function setCapability(index) {
  const next = clamp(Math.round(index), 0, capabilityPresets.length - 1);
  if (next !== sceneTarget.capability) {
    capabilityFrom = [...sceneState.capabilityParams];
    sceneState.capabilityMix = 0;
    sceneTarget.capability = next;
    sceneTarget.capabilityParams = [...capabilityPresets[next]];
  }
  dom.capabilities.forEach((item, i) => item.classList.toggle('is-active', i === next));
  dom.capIndex.textContent = `CAP / ${String(next + 1).padStart(2, '0')}`;
  dom.capCopy.textContent = capData[next][0];
  dom.capMeta.textContent = capData[next][1];
}
dom.capabilities.forEach((item, index) => {
  item.addEventListener('mouseenter', () => setCapability(index));
  item.addEventListener('focus', () => setCapability(index));
  item.addEventListener('click', () => setCapability(index));
});

function setProject(index, source = 'scroll') {
  const next = (Math.round(index) + dom.projects.length) % dom.projects.length;
  if (source === 'scroll' && projectManualOrigin !== null) return;
  if (source === 'manual') projectManualOrigin = stickyProgress(dom.workSection);
  if (next !== sceneTarget.project) {
    projectFrom = [...sceneState.projectParams];
    sceneState.projectMix = 0;
    sceneTarget.project = next;
    sceneTarget.projectParams = [...projectPresets[next]];
  }
  dom.projects.forEach((project, i) => project.classList.toggle('is-active', i === next));
  dom.projectCurrent.textContent = String(next + 1).padStart(2, '0');
}
$('[data-project-prev]').addEventListener('click', () => setProject(sceneTarget.project - 1, 'manual'));
$('[data-project-next]').addEventListener('click', () => setProject(sceneTarget.project + 1, 'manual'));

function setLabHold(value) {
  labHeld = value;
  dom.labTrigger.classList.toggle('is-held', value);
  dom.cursor.classList.toggle('is-dragging', value || dragging);
}
dom.labTrigger.addEventListener('pointerdown', (event) => { event.preventDefault(); setLabHold(true); dom.labTrigger.setPointerCapture(event.pointerId); });
dom.labTrigger.addEventListener('pointerup', () => setLabHold(false));
dom.labTrigger.addEventListener('pointercancel', () => setLabHold(false));
dom.labTrigger.addEventListener('click', () => {
  sceneTarget.matter = (sceneTarget.matter + 1) % 3;
  dom.matter.textContent = ['FLUID','ELASTIC','CHARGED'][sceneTarget.matter];
});

dom.menuToggle.addEventListener('click', () => {
  const open = !dom.mobileMenu.classList.contains('is-open');
  dom.mobileMenu.classList.toggle('is-open', open); dom.menuToggle.setAttribute('aria-expanded', open); dom.mobileMenu.setAttribute('aria-hidden', !open);
});
$$('a[href^="#"]').forEach((link) => link.addEventListener('click', (event) => {
  const target = $(link.getAttribute('href')); if (!target) return;
  event.preventDefault(); dom.mobileMenu.classList.remove('is-open'); dom.menuToggle.setAttribute('aria-expanded', 'false'); dom.mobileMenu.setAttribute('aria-hidden', 'true');
  target.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
}));
$$('a, button').forEach((item) => {
  item.addEventListener('mouseenter', () => dom.cursor.classList.add('is-interactive'));
  item.addEventListener('mouseleave', () => dom.cursor.classList.remove('is-interactive'));
});
$$('.magnetic').forEach((item) => {
  item.addEventListener('pointermove', (event) => { if (isCoarsePointer.matches || prefersReducedMotion.matches) return; const rect = item.getBoundingClientRect(); item.style.transform = `translate(${(event.clientX - rect.left - rect.width / 2) * .12}px, ${(event.clientY - rect.top - rect.height / 2) * .12}px)`; });
  item.addEventListener('pointerleave', () => { item.style.transform = ''; });
});

function activateSection(section) {
  const scene = clamp(Number(section.dataset.scene), 0, 11);
  activeSection = section;
  sceneTarget.chapter = scene;
  dom.movements.forEach((item) => item.classList.toggle('is-active', item === section));
  chapterLinks.forEach((link, id) => link.classList.toggle('is-active', id === scene));
  dom.lifeStatus.textContent = lifeStages[scene] ?? lifeStages.at(-1);
  dom.navContext.textContent = section.dataset.title ?? 'ASTRA';
}
const activeObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) activateSection(entry.target);
}), { rootMargin: '-38% 0px -38% 0px', threshold: 0 });
dom.movements.forEach((item) => activeObserver.observe(item));

function updateScrollTargets() {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  sceneTarget.globalProgress = clamp01(scrollY / max);
  const scrollDelta = Math.abs(scrollY - previousScrollY) / Math.max(1, innerHeight);
  sceneTarget.velocity = clamp(scrollDelta * 42, 0, 4);
  previousScrollY = scrollY;

  let nearest = activeSection;
  let nearestDistance = Infinity;
  dom.movements.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const distance = Math.abs(rect.top + rect.height * .5 - innerHeight * .5);
    if (distance < nearestDistance) { nearest = section; nearestDistance = distance; }
  });
  if (nearest) {
    const scene = clamp(Number(nearest.dataset.scene), 0, 11);
    sceneTarget.chapter = scene;
    sceneTarget.chapterProgress = (scene === 4 || scene === 6) ? stickyProgress(nearest) : sectionProgress(nearest);
  }

  const workProgress = stickyProgress(dom.workSection);
  sceneTarget.projectProgress = workProgress;
  if (projectManualOrigin !== null && Math.abs(workProgress - projectManualOrigin) > .075) projectManualOrigin = null;
  if (workProgress > .26 && workProgress < 1) {
    const projectScroll = clamp01((workProgress - .26) / .74);
    setProject(Math.min(2, Math.floor(projectScroll * 3)), 'scroll');
  }

  const methodProgress = stickyProgress(dom.methodSection);
  sceneTarget.methodProgress = methodProgress;
  const methodIndex = Math.min(4, Math.floor(methodProgress * 5));
  dom.methodSteps.forEach((step, index) => step.classList.toggle('is-active', index === methodIndex));
  dom.methodCurrent.textContent = String(methodIndex + 1).padStart(2, '0');
  dom.methodState.textContent = methodStates[methodIndex];
}
addEventListener('scroll', updateScrollTargets, { passive: true });
addEventListener('resize', updateScrollTargets, { passive: true });
addEventListener('pointermove', (event) => {
  sceneTarget.pointer = [clamp(event.clientX / innerWidth * 2 - 1, -1, 1), clamp(1 - event.clientY / innerHeight * 2, -1, 1)];
  dom.cursor.style.left = `${event.clientX}px`; dom.cursor.style.top = `${event.clientY}px`;
  if (dragging && sceneTarget.chapter === 10) sceneTarget.interaction = clamp01(sceneTarget.interaction + .08);
});
addEventListener('pointerdown', (event) => {
  if (event.target.closest('a,button')) return;
  dragging = true; dom.cursor.classList.add('is-dragging');
});
addEventListener('pointerup', () => { dragging = false; dom.cursor.classList.remove('is-dragging'); });
addEventListener('wheel', (event) => {
  if (sceneTarget.chapter === 10) sceneTarget.interaction = clamp01(sceneTarget.interaction + Math.abs(event.deltaY) * .0007);
}, { passive: true });

const gl = dom.canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
if (!gl) document.body.classList.add('no-webgl');
let renderScene = () => {};
let resizeScene = () => {};

if (gl) {
  const vertex = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fragment = `
precision highp float;
uniform vec2 r; uniform float t; uniform float gp; uniform float v; uniform vec2 pointer;
uniform float chapter; uniform float chapterProgress; uniform float capability; uniform float capabilityMix;
uniform vec4 capA; uniform vec4 capB; uniform float project; uniform float projectMix; uniform float projectProgress;
uniform vec4 projA; uniform vec4 projB; uniform float methodProgress; uniform float matter; uniform float interaction;
uniform float quality; uniform float motionScale; uniform float detailScale;
#define PI 3.14159265
float saturate(float x){return clamp(x,0.,1.);} float sceneWeight(float id){return 1.-smoothstep(.52,1.18,abs(chapter-id));}
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}
mat2 rot(float a){float x=cos(a),y=sin(a);return mat2(x,-y,y,x);} float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float capsule(vec3 p,vec3 a,vec3 b,float radius){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-radius;}
float coreDistance(vec3 q,float radius,float deformation,float frequency){float primary=noise(q*frequency+t*.10*motionScale);float detail=noise(q*(frequency*2.35)-t*.075*motionScale);return length(q)-radius-(primary+.35*detail-.5)*deformation;}
float filamentDistance(vec3 q,float strength){float a=capsule(q,vec3(-1.75,-.72,.12),vec3(1.72,.64,-.16),.026+.036*strength);float b=capsule(q,vec3(-1.22,1.08,.28),vec3(1.42,-.92,-.2),.018+.027*strength);return min(a,b);}
float satelliteDistance(vec3 p,float amount,float spread,float speed,float orbit,float charged){
  float clock=t*motionScale*speed; vec3 o1=vec3(cos(clock*.71+1.)*2.0,sin(clock*.83)*.62,sin(clock*.57)*spread);
  vec3 o2=vec3(cos(-clock*.43+2.1)*2.42,sin(clock*.51+2.)*.92,cos(clock*.39)*spread*1.3);
  vec3 o3=vec3(cos(clock*.31+4.)*1.72,sin(clock*.67+4.)*1.28,sin(clock*.47)*spread*.8);
  o1.xz*=rot(orbit*.55);o2.xy*=rot(orbit*.8);float radius=(.025+.09*amount)*(1.+charged*.22*sin(t*4.));
  return min(length(p-o1)-radius,min(length(p-o2)-radius*.78,length(p-o3)-radius*.64));
}
float map(vec3 p){
  float wOrigin=sceneWeight(0.),wSignal=sceneWeight(1.),wPattern=sceneWeight(2.),wForm=sceneWeight(3.),wWorlds=sceneWeight(4.);
  float wQuiet=sceneWeight(5.),wMethod=sceneWeight(6.),wSystem=sceneWeight(7.),wEvidence=sceneWeight(8.),wWorld=sceneWeight(9.),wField=sceneWeight(10.),wRest=sceneWeight(11.);
  float fluid=1.-smoothstep(.0,1.,abs(matter));float elastic=1.-smoothstep(.0,1.,abs(matter-1.));float charged=1.-smoothstep(.0,1.,abs(matter-2.));
  float methodExplore=wMethod*(1.-smoothstep(.08,.3,methodProgress));float methodDefine=wMethod*smoothstep(.08,.3,methodProgress)*(1.-smoothstep(.32,.5,methodProgress));
  float methodDesign=wMethod*smoothstep(.3,.54,methodProgress)*(1.-smoothstep(.56,.7,methodProgress));float methodBuild=wMethod*smoothstep(.52,.78,methodProgress);float methodEvolve=wMethod*smoothstep(.78,1.,methodProgress);
  float structure=wForm*chapterProgress+capA.x*wPattern+methodDefine*.55+methodDesign*.9+methodBuild+wSystem*.8+wEvidence+wWorld*.86;
  float transitionEnergy=(1.-capabilityMix)*wPattern+4.*projectMix*(1.-projectMix)*wWorlds;float noiseAmount=.075+wOrigin*.055+wSignal*.07+wPattern*(.035+.11*capA.y)+wWorlds*.075+transitionEnergy*.055+wQuiet*(-.045)+methodExplore*.11+methodBuild*(-.045)+wEvidence*(-.04)+wField*interaction*(.08*fluid+.045*elastic+.09*charged);
  float frequency=2.05+wPattern*capA.z*1.7+methodDesign*1.15+wField*(elastic*1.4+charged*2.1);
  float pulse=.025*sin(t*(.72+wSignal*.75+capB.w*wPattern*1.4+charged*wField*3.)*motionScale+chapter)+interaction*wField*(.075*fluid+.035*elastic+.045*charged)*sin(t*(1.4+elastic*2.2));
  vec3 q=p; float pointerStrength=.025+wSignal*.035+wPattern*.025+wField*(.12+interaction*.24);q.xy-=pointer*pointerStrength*interaction;
  float symmetry=capB.z*wPattern+structure*.45;q.xz*=rot(t*.055*motionScale+gp*4.8+pointer.x*(.08+wField*.3)+wPattern*capability*.035+wWorlds*projectProgress*.12);q.xy*=rot(-t*.035*motionScale+pointer.y*.07);
  q.x=mix(q.x,abs(q.x)*sign(sin(t*.34+q.y*2.)),wWorlds*projA.z*.22);q.y+=sin(q.x*(2.2+symmetry*1.8)+t*motionScale)*(.025+wSignal*.035+wPattern*capA.y*.04+methodExplore*.06);
  q.x*=1.-wWorlds*projA.x*.22;q.z*=1.+wWorlds*projA.x*.12;float radius=1.18+pulse+wWorld*.08+wEvidence*.025-wRest*.12;
  float body=coreDistance(q,radius,max(.025,noiseAmount),frequency);
  float split=wWorlds*projA.z*.88+methodExplore*.45+methodDefine*.22;vec3 axis=normalize(vec3(cos(t*.17),.3,sin(t*.17)));float a=length(q-axis*(.55+split*.78))-radius*(.48+.08*split);float b=length(q+axis*(.52+split*.7))-radius*(.43+.09*split);body=mix(body,smin(smin(body,a,.18),b,.16),saturate(split));
  float filament=wForm*chapterProgress*.5+wWorlds*projA.w+wPattern*capB.y*.7+methodDesign*.85+methodEvolve*.35+wSystem+wWorld*.78;float fd=filamentDistance(q,filament);body=mix(body,smin(body,fd,.1),saturate(filament));
  float satAmount=wSignal*.2+wPattern*(.42+capA.w*.45)+wWorlds*(.36+projA.y*.55)+methodExplore*.35+methodEvolve*.45+wSystem*.82+wWorld*.72+wField*(.45+charged*.45)-wQuiet*.65-wRest*.8;satAmount*=mix(1.,.88+.12*sin(projectProgress*PI*3.+project),wWorlds);
  float sd=satelliteDistance(p,saturate(satAmount),.35+capA.w*.7+projB.x*wWorlds,.25+capB.x*.9+projA.y*wWorlds,projA.y*wWorlds+wSystem*.35,charged*wField);
  float satWeight=saturate(satAmount);return mix(body,smin(body,sd,max(.002,.075*satWeight)),satWeight);
}
vec3 normal(vec3 p){vec2 e=vec2(.0025,0);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
void main(){
  float wOrigin=sceneWeight(0.),wSignal=sceneWeight(1.),wPattern=sceneWeight(2.),wForm=sceneWeight(3.),wWorlds=sceneWeight(4.),wQuiet=sceneWeight(5.),wMethod=sceneWeight(6.),wSystem=sceneWeight(7.),wEvidence=sceneWeight(8.),wWorld=sceneWeight(9.),wField=sceneWeight(10.),wRest=sceneWeight(11.);
  float fluid=1.-smoothstep(.0,1.,abs(matter));float elastic=1.-smoothstep(.0,1.,abs(matter-1.));float charged=1.-smoothstep(.0,1.,abs(matter-2.));
  vec2 screen=(gl_FragCoord.xy*2.-r)/r.y,uv=screen;float scene=chapter/11.;vec2 cameraOffset=vec2(.36*sin(scene*PI*3.2),.1*cos(scene*PI*4.));cameraOffset+=pointer*(.018+wField*.055);cameraOffset*=1.-wWorld;uv-=cameraOffset;uv*=1.+.1*sin(scene*PI*2.)-.06*wWorld;uv*=rot(v*.006);
  float cameraZ=4.82-.3*sin(scene*PI)+.34*wWorld;vec3 ro=vec3(0.,0.,cameraZ);vec3 rd=normalize(vec3(uv,-2.25));float d=0.,hit=0.;vec3 p=ro;
  for(int i=0;i<72;i++){if(float(i)>quality)break;p=ro+rd*d;float h=map(p);if(h<.0025){hit=1.;break;}d+=h*.88;if(d>9.)break;}
  vec3 lime=vec3(.55,.72,.12),blue=vec3(.2,.38,1.),pink=vec3(.92,.2,.58),amber=vec3(1.,.48,.08);vec3 accent=lime;accent=mix(accent,blue,wWorlds*projB.y*.68);accent=mix(accent,pink,wWorlds*projB.z*.72);accent=mix(accent,amber,wWorld*.2);accent=mix(accent,vec3(.62,.68,.48),wQuiet*.42);accent=mix(accent,lime,wField*(1.-charged*.35));accent=mix(accent,vec3(.78,.55,.16),wField*charged*.38);
  float environment=.12+wSignal*.12+wPattern*.34+wForm*.25+wWorlds*.45+wQuiet*(-.1)+wMethod*.24+wSystem*.5+wEvidence*.18+wWorld*.55+wField*(.38+interaction*.25)-wRest*.1;
  float sky=noise(vec3(screen*1.2,t*.018*motionScale+scene));float aurora=pow(max(0.,sin(screen.x*2.1+sky*2.8+t*.09*motionScale)-screen.y*.5),7.);vec3 col=vec3(.012,.013,.011)+accent*aurora*.07*environment;
  if(rd.y<-.035){float fd=(-1.68-ro.y)/rd.y;if(fd>0.){vec3 fp=ro+rd*fd;float wave=noise(vec3(fp.xz*.44,t*.1*motionScale));vec2 grid=abs(fract(fp.xz*(.28+wForm*.16+wSystem*.12)+wave*.04)-.5);float line=1.-smoothstep(.015,.035,min(grid.x,grid.y));float fade=exp(-fd*.25)*(1.-hit);col+=accent*(line*.05*(wForm+wMethod*.5+wSystem+wEvidence*.6+wWorld*.8)+wave*.012*environment)*fade;}}
  if(hit>0.){vec3 n=normal(p),l1=normalize(vec3(-2.8,3.5,3.)),l2=normalize(vec3(2.,-1.,2.));float dif=max(dot(n,l1),0.)+.2*max(dot(n,l2),0.);float rim=pow(1.-max(dot(n,-rd),0.),2.15);float sharpness=36.+wEvidence*22.+wQuiet*12.-wField*fluid*16.+wField*elastic*10.;float spec=pow(max(dot(reflect(-l1,n),-rd),0.),sharpness);float rough=noise(p*(5.5+wPattern*capA.z*3.+wField*charged*3.));float contour=.5+.5*sin(p.y*(10.+wMethod*methodProgress*8.));col=vec3(.032,.037,.028)+dif*vec3(.13,.14,.09)+rim*accent*(.7+wSystem*.38+wWorld*.4+wField*charged*(.45+interaction*.55))+spec*vec3(.9)*(1.-rough*(.3-wEvidence*.16));col+=rough*.025+contour*methodProgress*wMethod*.025;}
  float ring=abs(length(uv*vec2(1.,2.4))-2.-v*.0015);col+=accent*smoothstep(.014,0.,ring)*(.035+.09*environment);float starDensity=mix(.9985,.9975,detailScale*environment);vec2 drift=gl_FragCoord.xy+vec2(t*4.*motionScale,-t*1.5*motionScale);float stars=step(starDensity,hash(vec3(floor(drift/2.),floor(t*.04))))*(.2+.2*sin(t+uv.x*18.));col+=stars*vec3(.7,.75,.62)*(1.-hit)*environment;
  float halo=.018/max(.026,abs(length(uv)-.68-sin(t*.35*motionScale)*.015));col+=accent*halo*.025*environment*(1.-hit);float fog=1.-exp(-d*d*.012);col=mix(col,vec3(.008,.009,.008)+accent*.01,fog*(.42+wWorld*.12));col*=1.-.25*length(screen);col=pow(max(col,0.),vec3(.82));gl_FragColor=vec4(col,1.);
}`;
  function makeShader(type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(shader)); document.body.classList.add('no-webgl'); }
    return shader;
  }
  const program = gl.createProgram(); gl.attachShader(program, makeShader(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, makeShader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(program)); document.body.classList.add('no-webgl'); }
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const point = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(point); gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
  const names = ['r','t','gp','v','pointer','chapter','chapterProgress','capability','capabilityMix','capA','capB','project','projectMix','projectProgress','projA','projB','methodProgress','matter','interaction','quality','motionScale','detailScale'];
  const uniforms = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
  const cores = navigator.hardwareConcurrency || 4; const memory = navigator.deviceMemory || 4; const mobile = isCoarsePointer.matches;
  const tier = mobile || cores <= 4 || memory <= 4 ? 'low' : cores >= 8 && memory >= 8 ? 'high' : 'medium';
  const dprCap = { low:1, medium:1.2, high:1.45 }[tier]; const marchSteps = { low:52, medium:62, high:71 }[tier]; const detailScale = { low:.45, medium:.72, high:1 }[tier];
  resizeScene = () => { const scale=Math.min(devicePixelRatio||1,dprCap); dom.canvas.width=Math.round(innerWidth*scale); dom.canvas.height=Math.round(innerHeight*scale); dom.canvas.style.width=`${innerWidth}px`; dom.canvas.style.height=`${innerHeight}px`; gl.viewport(0,0,dom.canvas.width,dom.canvas.height); };
  renderScene = (seconds) => {
    gl.uniform2f(uniforms.r,dom.canvas.width,dom.canvas.height); gl.uniform1f(uniforms.t,seconds); gl.uniform1f(uniforms.gp,sceneState.globalProgress); gl.uniform1f(uniforms.v,sceneState.velocity); gl.uniform2f(uniforms.pointer,...sceneState.pointer);
    gl.uniform1f(uniforms.chapter,sceneState.chapter); gl.uniform1f(uniforms.chapterProgress,sceneState.chapterProgress); gl.uniform1f(uniforms.capability,sceneTarget.capability); gl.uniform1f(uniforms.capabilityMix,sceneState.capabilityMix);
    gl.uniform4fv(uniforms.capA,sceneState.capabilityParams.slice(0,4)); gl.uniform4fv(uniforms.capB,sceneState.capabilityParams.slice(4,8)); gl.uniform1f(uniforms.project,sceneTarget.project); gl.uniform1f(uniforms.projectMix,sceneState.projectMix); gl.uniform1f(uniforms.projectProgress,sceneState.projectProgress);
    gl.uniform4fv(uniforms.projA,sceneState.projectParams.slice(0,4)); gl.uniform4fv(uniforms.projB,sceneState.projectParams.slice(4,8)); gl.uniform1f(uniforms.methodProgress,sceneState.methodProgress); gl.uniform1f(uniforms.matter,sceneState.matter); gl.uniform1f(uniforms.interaction,sceneState.interaction);
    gl.uniform1f(uniforms.quality,marchSteps); gl.uniform1f(uniforms.motionScale,prefersReducedMotion.matches?.18:1); gl.uniform1f(uniforms.detailScale,detailScale); gl.drawArrays(gl.TRIANGLES,0,6);
  };
  resizeScene(); addEventListener('resize', resizeScene, { passive:true });
}

let visible = !document.hidden;
let rafId = 0;
let lastTime = performance.now();
let elapsed = 0;
function updateState(delta) {
  const transitionSpeed = prefersReducedMotion.matches ? 18 : 2.8;
  sceneState.globalProgress = damp(sceneState.globalProgress, sceneTarget.globalProgress, 7, delta);
  sceneState.chapter = damp(sceneState.chapter, sceneTarget.chapter, transitionSpeed, delta);
  sceneState.chapterProgress = damp(sceneState.chapterProgress, sceneTarget.chapterProgress, 5, delta);
  sceneState.velocity = damp(sceneState.velocity, sceneTarget.velocity, 7, delta); sceneTarget.velocity = damp(sceneTarget.velocity, 0, 10, delta);
  const pointerSpeed = prefersReducedMotion.matches ? 18 : 9;
  sceneState.pointer[0] = damp(sceneState.pointer[0], sceneTarget.pointer[0], pointerSpeed, delta); sceneState.pointer[1] = damp(sceneState.pointer[1], sceneTarget.pointer[1], pointerSpeed, delta);
  sceneState.capabilityMix = damp(sceneState.capabilityMix, 1, 4.5, delta); sceneState.capabilityParams = mix(capabilityFrom, sceneTarget.capabilityParams, sceneState.capabilityMix); sceneState.capability = sceneTarget.capability;
  sceneState.projectMix = damp(sceneState.projectMix, 1, 2.7, delta); sceneState.projectParams = mix(projectFrom, sceneTarget.projectParams, sceneState.projectMix); sceneState.project = sceneTarget.project;
  sceneState.projectProgress = damp(sceneState.projectProgress, sceneTarget.projectProgress, 4, delta); sceneState.methodProgress = damp(sceneState.methodProgress, sceneTarget.methodProgress, 3.8, delta);
  sceneState.matter = damp(sceneState.matter, sceneTarget.matter, 3.6, delta);
  const fieldActive = sceneTarget.chapter === 10; const inputTarget = fieldActive ? Math.max(labHeld ? 1 : 0, dragging ? .72 : 0, sceneTarget.interaction) : (dragging ? .14 : 0);
  sceneState.interaction = damp(sceneState.interaction, inputTarget, inputTarget > sceneState.interaction ? 6.5 : 2.8, delta); sceneTarget.interaction = damp(sceneTarget.interaction, 0, 2.6, delta);
  Object.keys(sceneState).forEach((key) => { if (typeof sceneState[key] === 'number' && !Number.isFinite(sceneState[key])) sceneState[key] = 0; });
}
function frame(now) {
  if (!visible) return;
  const delta = Math.min(.05, Math.max(.001, (now-lastTime)/1000)); lastTime=now; elapsed += delta * (prefersReducedMotion.matches ? .18 : 1);
  updateState(delta); dom.progress.style.height=`${sceneState.globalProgress*100}%`; dom.coordinate.textContent=(sceneState.globalProgress*100).toFixed(3); dom.energy.textContent=(.42+sceneState.interaction*.58).toFixed(2);
  renderScene(elapsed); rafId=requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { visible=!document.hidden; if(visible){lastTime=performance.now();rafId=requestAnimationFrame(frame);}else cancelAnimationFrame(rafId); });
updateScrollTargets(); requestAnimationFrame(frame);
addEventListener('load',()=>setTimeout(()=>dom.loader.classList.add('is-gone'),250));
setTimeout(()=>dom.loader.classList.add('is-gone'),1600);
