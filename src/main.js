const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
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

const capData = [
  ['One possible expression of the pattern: immersive platforms where concept, interface and motion operate as one system.', 'STRATEGY · EXPERIENCE · INTERACTION'],
  ['When the signal calls for utility, product logic, interface and engineering resolve together.', 'PRODUCT LOGIC · UX/UI · FRONTEND'],
  ['When an idea needs space and depth, procedural form makes the experience explorable and responsive.', 'WEBGL · GLSL · CREATIVE CODE'],
  ['When familiar interfaces are not enough, prototypes turn new behaviors into dependable tools.', 'PROTOTYPING · R&D · TOOLING'],
  ['When intelligence adds real value, it enters with clear purpose, control and understandable behavior.', 'AI UX · SYSTEM DESIGN · INTEGRATION'],
  ['When identity must move, type, time and interaction become parts of the same expressive language.', 'DIRECTION · MOTION · IDENTITY'],
];
const lifeStages = ['ORIGIN / DORMANT','SIGNAL / RESPONDING','PATTERN / EMERGING','FORM / ORGANIZING','WORLDS / MULTIPLYING','PRINCIPLE / QUIET','METHOD / REVEALED','SYSTEM / CONNECTING','EVIDENCE / STABLE','WORLD / COMPLETE','FIELD / UNLOCKED','REST / IDLE'];
const methodStates = ['RAW SIGNAL / OBSERVATION / 01','ALIGNMENT / DEFINITION / 02','VISIBLE STRUCTURE / DESIGN / 03','RESOLVED MATTER / BUILD / 04','ADAPTIVE SYSTEM / EVOLVE / 05'];
let activeProject = 0;
let activeCapability = 0;
let labMatter = 0;
let labHeld = false;
let dragging = false;

function setCapability(index) {
  activeCapability = index;
  dom.capabilities.forEach((item, i) => item.classList.toggle('is-active', i === index));
  dom.capIndex.textContent = `CAP / ${String(index + 1).padStart(2, '0')}`;
  dom.capCopy.textContent = capData[index][0];
  dom.capMeta.textContent = capData[index][1];
}
dom.capabilities.forEach((item, index) => {
  item.addEventListener('mouseenter', () => setCapability(index));
  item.addEventListener('focus', () => setCapability(index));
  item.addEventListener('click', () => setCapability(index));
});

function setProject(index) {
  activeProject = (index + dom.projects.length) % dom.projects.length;
  dom.projects.forEach((project, i) => project.classList.toggle('is-active', i === activeProject));
  dom.projectCurrent.textContent = String(activeProject + 1).padStart(2, '0');
}
$('[data-project-prev]').addEventListener('click', () => setProject(activeProject - 1));
$('[data-project-next]').addEventListener('click', () => setProject(activeProject + 1));

function setLabHold(value) {
  labHeld = value;
  dom.labTrigger.classList.toggle('is-held', value);
  dom.cursor.classList.toggle('is-dragging', value || dragging);
}
dom.labTrigger.addEventListener('pointerdown', (event) => { event.preventDefault(); setLabHold(true); dom.labTrigger.setPointerCapture(event.pointerId); });
dom.labTrigger.addEventListener('pointerup', () => setLabHold(false));
dom.labTrigger.addEventListener('pointercancel', () => setLabHold(false));
dom.labTrigger.addEventListener('click', () => { labMatter = (labMatter + 1) % 3; dom.matter.textContent = ['FLUID','ELASTIC','CHARGED'][labMatter]; });

dom.menuToggle.addEventListener('click', () => {
  const open = !dom.mobileMenu.classList.contains('is-open');
  dom.mobileMenu.classList.toggle('is-open', open); dom.menuToggle.setAttribute('aria-expanded', open); dom.mobileMenu.setAttribute('aria-hidden', !open);
});

$$('a[href^="#"]').forEach((link) => link.addEventListener('click', (event) => {
  const target = $(link.getAttribute('href')); if (!target) return;
  event.preventDefault(); dom.mobileMenu.classList.remove('is-open'); dom.menuToggle.setAttribute('aria-expanded', 'false');
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

const activeObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (!entry.isIntersecting) return;
  const index = dom.movements.indexOf(entry.target);
  dom.movements.forEach((item) => item.classList.toggle('is-active', item === entry.target));
  dom.chapters.forEach((link, i) => link.classList.toggle('is-active', i === index));
  dom.lifeStatus.textContent = lifeStages[index] ?? lifeStages.at(-1);
  dom.navContext.textContent = entry.target.dataset.title ?? 'ASTRA';
}), { rootMargin: '-38% 0px -38% 0px', threshold: 0 });
dom.movements.forEach((item) => activeObserver.observe(item));

const gl = dom.canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
if (!gl) document.body.classList.add('no-webgl');

let renderScene = () => {};
let resizeScene = () => {};
let sceneState = { scroll: 0, velocity: 0, mouse: [0, 0], interaction: 0, chapter: 0 };

if (gl) {
  const vertex = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fragment = `
precision highp float;
uniform vec2 r; uniform float t; uniform float s; uniform float v; uniform vec2 m; uniform float c; uniform float interact; uniform float quality;
#define PI 3.14159265
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}
mat2 rot(float a){float x=cos(a),y=sin(a);return mat2(x,-y,y,x);} float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float capsule(vec3 p,vec3 a,vec3 b,float radius){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-radius;}
float map(vec3 p){
  vec3 q=p; float chapter=c; float method=smoothstep(5.3,7.2,chapter); float lab=smoothstep(8.5,9.3,chapter)*(1.-smoothstep(10.,10.7,chapter));
  q.xz*=rot(s*7.8+m.x*(.2+interact*.45)+t*.075); q.xy*=rot(s*-2.8+m.y*.2+sin(t*.23)*.1);
  float breathing=.04*sin(t*1.25+chapter)+.035*interact*sin(t*3.); float n=noise(q*(2.15+method*.75)+t*.13)+.42*noise(q*5.1-t*.11);
  float radius=1.22+breathing+n*(.115+lab*.12); float core=length(q)-radius;
  float split=smoothstep(2.8,4.2,chapter)*(1.-smoothstep(5.1,6.,chapter)); split=max(split,smoothstep(6.,7.,chapter)*.6);
  vec3 axis=normalize(vec3(cos(t*.19+chapter),.3*sin(t*.27),sin(t*.19+chapter))); vec3 side=normalize(cross(axis,vec3(.1,1.,.2)));
  float childA=length(q-axis*split*(1.25+.15*sin(t*.6)))-radius*(.61+.04*sin(t)); float childB=length(q+axis*split*1.18+side*split*.45)-radius*.55;
  float body=mix(core,smin(smin(core,childA,.2),childB,.17),smoothstep(.05,.55,split));
  float structure=smoothstep(5.7,7.5,chapter); float filament=capsule(q,vec3(-1.8,-.7,.1),vec3(1.8,.65,-.15),.055+noise(q*3.)*.018);
  filament=min(filament,capsule(q,vec3(-1.3,1.1,.3),vec3(1.5,-1.,-.2),.038)); body=smin(body,filament,.11*structure+.001);
  vec3 o1=vec3(cos(t*.52+chapter)*2.1,sin(t*.67)*.62,sin(t*.52+chapter)*.7); vec3 o2=vec3(cos(-t*.35+1.7)*2.5,sin(t*.44+2.)*.9,sin(-t*.35)*.5); vec3 o3=vec3(cos(t*.25+4.)*1.9,sin(t*.52+4.)*1.35,sin(t*.32)*.75);
  float satellites=min(length(p-o1)-.11,min(length(p-o2)-.075,length(p-o3)-.065)); return smin(body,satellites,.1);
}
vec3 normal(vec3 p){vec2 e=vec2(.0025,0);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
void main(){
  vec2 screen=(gl_FragCoord.xy*2.-r)/r.y,uv=screen; float phase=s*PI*3.+t*.025; float scene=c/11.;
  vec2 cameraOffset=vec2(.43*sin(scene*PI*3.2),.12*cos(scene*PI*4.)); cameraOffset+=vec2(m.x,m.y)*.055; cameraOffset*=1.-smoothstep(9.8,11.,c); uv-=cameraOffset;
  uv*=1.+.12*sin(scene*PI*2.)-.08*smoothstep(9.5,11.,c); uv*=rot(.035*sin(phase)+v*.01);
  float cameraZ=4.8-.38*sin(scene*PI)+.45*smoothstep(9.4,11.,c); vec3 ro=vec3(.08*m.x,.07*m.y,cameraZ); vec3 rd=normalize(vec3(uv,-2.25));
  float d=0.,hit=0.;vec3 p=ro; for(int i=0;i<72;i++){if(float(i)>quality)break;p=ro+rd*d;float h=map(p);if(h<.0025){hit=1.;break;}d+=h*.88;if(d>9.)break;}
  vec3 lime=vec3(.55,.72,.12),blue=vec3(.2,.38,1.),pink=vec3(.92,.2,.58),gold=vec3(1.,.48,.08); vec3 chapterColor=mix(lime,blue,smoothstep(1.,3.5,c)); chapterColor=mix(chapterColor,pink,smoothstep(3.8,6.5,c)); chapterColor=mix(chapterColor,lime,smoothstep(7.,9.,c)); chapterColor=mix(chapterColor,gold,smoothstep(9.7,11.,c));
  float sky=noise(vec3(screen*1.2,t*.018+scene)); float aurora=pow(max(0.,sin(screen.x*2.1+sky*2.8+t*.09)-screen.y*.5),7.); vec3 col=vec3(.012,.013,.011)+chapterColor*aurora*.055;
  if(rd.y<-.035){float fd=(-1.68-ro.y)/rd.y;if(fd>0.){vec3 fp=ro+rd*fd;float wave=noise(vec3(fp.xz*.44,t*.1));vec2 grid=abs(fract(fp.xz*.38+wave*.06)-.5);float line=1.-smoothstep(.015,.035,min(grid.x,grid.y));float fade=exp(-fd*.25)*(1.-hit);col+=chapterColor*(line*.042+wave*.014)*fade;}}
  if(hit>0.){vec3 n=normal(p),l1=normalize(vec3(-2.8,3.5,3.)),l2=normalize(vec3(2.,-1.,2.));float dif=max(dot(n,l1),0.)+.2*max(dot(n,l2),0.);float rim=pow(1.-max(dot(n,-rd),0.),2.1);float spec=pow(max(dot(reflect(-l1,n),-rd),0.),32.-interact*10.);float rough=noise(p*(6.+scene*2.));col=vec3(.035,.041,.03)+dif*vec3(.13,.14,.09)+rim*chapterColor*(1.05+interact*.4)+spec*vec3(.9)*(1.-rough*.3);col+=rough*.03;}
  float ring=abs(length(uv*vec2(1.,2.4))-2.-v*.002);col+=chapterColor*smoothstep(.014,0.,ring)*(.12+.08*sin(t));float starDensity=mix(.9974,.9984,step(0.5,quality/60.));vec2 drift=gl_FragCoord.xy+vec2(t*5.,-t*2.);float stars=step(starDensity,hash(vec3(floor(drift/2.),floor(t*.05))))*(.25+.25*sin(t+uv.x*18.));col+=stars*vec3(.7,.75,.62)*(1.-hit);
  float halo=.022/max(.025,abs(length(uv)-.68-sin(t*.4)*.018));col+=chapterColor*halo*.032*(1.-hit);float fog=1.-exp(-d*d*.012);col=mix(col,vec3(.008,.009,.008)+chapterColor*.012,fog*.52);col*=1.-.25*length(screen);col=pow(max(col,0.),vec3(.82));gl_FragColor=vec4(col,1.);
}`;
  function makeShader(type, source) { const item=gl.createShader(type); gl.shaderSource(item,source); gl.compileShader(item); if(!gl.getShaderParameter(item,gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(item)); return item; }
  const program=gl.createProgram(); gl.attachShader(program,makeShader(gl.VERTEX_SHADER,vertex)); gl.attachShader(program,makeShader(gl.FRAGMENT_SHADER,fragment)); gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(program)); gl.useProgram(program);
  const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const point=gl.getAttribLocation(program,'p'); gl.enableVertexAttribArray(point); gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
  const names=['r','t','s','v','m','c','interact','quality']; const uniforms=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]));
  const cores=navigator.hardwareConcurrency||4; const memory=navigator.deviceMemory||4; const mobile=isCoarsePointer.matches; const tier=mobile||cores<=4||memory<=4?'low':cores>=8&&memory>=8?'high':'medium'; const dprCap={low:1,medium:1.2,high:1.45}[tier]; const marchSteps={low:52,medium:62,high:71}[tier];
  resizeScene=()=>{const scale=Math.min(devicePixelRatio||1,dprCap);dom.canvas.width=Math.round(innerWidth*scale);dom.canvas.height=Math.round(innerHeight*scale);dom.canvas.style.width=`${innerWidth}px`;dom.canvas.style.height=`${innerHeight}px`;gl.viewport(0,0,dom.canvas.width,dom.canvas.height);};
  renderScene=(seconds)=>{gl.uniform2f(uniforms.r,dom.canvas.width,dom.canvas.height);gl.uniform1f(uniforms.t,seconds);gl.uniform1f(uniforms.s,sceneState.scroll);gl.uniform1f(uniforms.v,Math.min(sceneState.velocity,8));gl.uniform2f(uniforms.m,...sceneState.mouse);gl.uniform1f(uniforms.c,sceneState.chapter+activeCapability*.035+activeProject*.025);gl.uniform1f(uniforms.interact,sceneState.interaction);gl.uniform1f(uniforms.quality,marchSteps);gl.drawArrays(gl.TRIANGLES,0,6);};
  resizeScene(); addEventListener('resize',resizeScene,{passive:true});
}

let scrollTarget=0, pointerTarget=[0,0], interactionTarget=0, chapterTarget=0, lastScroll=scrollY, visible=!document.hidden, rafId=0;
function updateTargets(){
  const max=document.documentElement.scrollHeight-innerHeight; scrollTarget=max?scrollY/max:0;
  const center=innerHeight*.5; let nearest=0, distance=Infinity; dom.movements.forEach((section,index)=>{const rect=section.getBoundingClientRect();const d=Math.abs(rect.top+rect.height*.5-center);if(d<distance){distance=d;nearest=index;}}); chapterTarget=nearest;
  if(dom.workSection){const rect=dom.workSection.getBoundingClientRect(),range=Math.max(1,rect.height-innerHeight);const local=Math.min(1,Math.max(0,-rect.top/range));if(local>.28)setProject(Math.min(2,Math.floor((local-.28)/.72*3)));}
  if(dom.methodSection){const rect=dom.methodSection.getBoundingClientRect(),range=Math.max(1,rect.height-innerHeight);const local=Math.min(1,Math.max(0,-rect.top/range));const index=Math.min(4,Math.floor(local*5));dom.methodSteps.forEach((step,i)=>step.classList.toggle('is-active',i===index));dom.methodCurrent.textContent=String(index+1).padStart(2,'0');dom.methodState.textContent=methodStates[index];}
}
addEventListener('scroll',updateTargets,{passive:true});
addEventListener('pointermove',(event)=>{pointerTarget=[event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2];dom.cursor.style.left=`${event.clientX}px`;dom.cursor.style.top=`${event.clientY}px`;if(dragging)interactionTarget=Math.min(1,interactionTarget+.05);});
addEventListener('pointerdown',(event)=>{if(event.target.closest('a,button'))return;dragging=true;dom.cursor.classList.add('is-dragging');});
addEventListener('pointerup',()=>{dragging=false;dom.cursor.classList.remove('is-dragging');});
addEventListener('wheel',(event)=>{if(dom.lab.classList.contains('is-active'))interactionTarget=Math.min(1,interactionTarget+Math.abs(event.deltaY)*.0008);},{passive:true});

document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible){lastTime=performance.now();rafId=requestAnimationFrame(frame);}else cancelAnimationFrame(rafId);});
let lastTime=performance.now(), elapsed=0;
function frame(now){
  if(!visible)return; const delta=Math.min(.05,(now-lastTime)/1000);lastTime=now;elapsed+=delta*(prefersReducedMotion.matches?.15:1);
  const previous=sceneState.scroll;sceneState.scroll+=(scrollTarget-sceneState.scroll)*(prefersReducedMotion.matches?1:.065);sceneState.velocity+=(Math.abs(sceneState.scroll-previous)*850-sceneState.velocity)*.08;
  sceneState.mouse[0]+=(pointerTarget[0]-sceneState.mouse[0])*.055;sceneState.mouse[1]+=(pointerTarget[1]-sceneState.mouse[1])*.055;sceneState.chapter+=(chapterTarget-sceneState.chapter)*(prefersReducedMotion.matches?.4:.045);
  interactionTarget=Math.max(labHeld?1:0,interactionTarget-.012);sceneState.interaction+=(interactionTarget-sceneState.interaction)*.09;
  dom.progress.style.height=`${sceneState.scroll*100}%`;dom.coordinate.textContent=(sceneState.scroll*100).toFixed(3);dom.energy.textContent=(.42+sceneState.interaction*.58).toFixed(2);
  renderScene(elapsed);rafId=requestAnimationFrame(frame);
}
updateTargets(); requestAnimationFrame(frame);
addEventListener('load',()=>setTimeout(()=>dom.loader.classList.add('is-gone'),250));
setTimeout(()=>dom.loader.classList.add('is-gone'),1600);
