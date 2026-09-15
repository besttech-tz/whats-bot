const canvas = document.querySelector('#scene');
const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
if (!gl) document.body.classList.add('no-webgl');

const vertex = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const fragment = `
precision highp float;
uniform vec2 r;
uniform float t;
uniform float s;
uniform float v;
uniform vec2 m;
#define PI 3.14159265

float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}
mat2 rot(float a){float c=cos(a),q=sin(a);return mat2(c,-q,q,c);}
float map(vec3 p){
  p.xz*=rot(s*6.2+m.x*.32+t*.08);p.xy*=rot(s*-2.5+m.y*.24);
  float chapter=s*3.;
  float breathing=.055*sin(t*1.4+chapter*2.);
  float n=noise(p*(2.2+sin(chapter)*.7)+t*.2)+.45*noise(p*5.-t*.16);
  p.y+=sin(p.x*2.4+t+chapter)*(.04+.09*smoothstep(.7,2.2,chapter));
  return length(p)-(1.48+breathing+n*(.13+.08*sin(chapter*PI*.5)));
}
vec3 normal(vec3 p){vec2 e=vec2(.002,0);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
void main(){
  vec2 uv=(gl_FragCoord.xy*2.-r)/r.y;
  float phase=s*PI*3.;
  vec2 shift=vec2(.58*cos(phase),.13*sin(phase*1.7));
  shift*=1.-smoothstep(.82,1.,s);
  uv-=shift;
  uv*=rot(.045*sin(phase)+v*.018);
  vec3 ro=vec3(m*.08,4.9-.45*sin(s*PI)),rd=normalize(vec3(uv,-2.25));
  float d=0.,hit=0.;vec3 p;
  for(int i=0;i<72;i++){p=ro+rd*d;float h=map(p);if(h<.002){hit=1.;break;}d+=h;if(d>9.)break;}
  vec3 col=vec3(.018);
  if(hit>0.){
    vec3 n=normal(p), l=normalize(vec3(-2.8,3.5,3.));
    float dif=max(dot(n,l),0.);
    float rim=pow(1.-max(dot(n,-rd),0.),2.3);
    float spec=pow(max(dot(reflect(-l,n),-rd),0.),42.);
    vec3 accent=mix(vec3(.56,.72,.12),vec3(.28,.42,1.),smoothstep(.3,.72,s));
    accent=mix(accent,vec3(.74,.3,.62),smoothstep(.72,1.,s));
    col=vec3(.055,.06,.045)+dif*vec3(.16,.17,.12)+rim*accent*(1.+v*.025)+spec*vec3(.9);
    col+=noise(p*7.)*.035;
  }
  float ring=abs(length(uv*vec2(1.,2.45))-2.0-v*.003);
  col+=mix(vec3(.55,.72,.12),vec3(.35,.4,1.),s)*smoothstep(.014,0.,ring)*(.28+.2*sin(t));
  float stars=step(.9975,hash(vec3(floor(gl_FragCoord.xy/2.),1.)))*(.35+.3*sin(t+uv.x*20.));
  col+=stars*vec3(.7,.75,.62)*(1.-hit);
  col*=1.-.28*length(uv);
  col=pow(col,vec3(.82));
  gl_FragColor=vec4(col,1.);
}`;

function shader(type, source) {
  const item = gl.createShader(type); gl.shaderSource(item, source); gl.compileShader(item);
  if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(item));
  return item;
}
const program = gl.createProgram();
gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
gl.linkProgram(program); gl.useProgram(program);
const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
const point=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(point);gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
const uniforms={r:gl.getUniformLocation(program,'r'),t:gl.getUniformLocation(program,'t'),s:gl.getUniformLocation(program,'s'),v:gl.getUniformLocation(program,'v'),m:gl.getUniformLocation(program,'m')};

let scroll=0, scrollTarget=0, scrollVelocity=0, mouse=[0,0], mouseTarget=[0,0];
function size(){const scale=Math.min(devicePixelRatio,1.35);canvas.width=innerWidth*scale;canvas.height=innerHeight*scale;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';gl.viewport(0,0,canvas.width,canvas.height);}
function updateScroll(){const max=document.documentElement.scrollHeight-innerHeight;scrollTarget=max?scrollY/max:0;}
addEventListener('resize',size);addEventListener('scroll',updateScroll,{passive:true});
addEventListener('pointermove',e=>{mouseTarget=[e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2];const c=document.querySelector('.cursor');c.style.left=e.clientX+'px';c.style.top=e.clientY+'px';});
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{const target=document.querySelector(link.getAttribute('href'));if(!target)return;event.preventDefault();target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
const panels=[...document.querySelectorAll('.panel')], chapterLinks=[...document.querySelectorAll('.chapters a')];
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;panels.forEach(panel=>panel.classList.toggle('is-active',panel===entry.target));chapterLinks.forEach((link,index)=>link.classList.toggle('is-active',panels[index]===entry.target));}),{threshold:.48});
panels.forEach(panel=>observer.observe(panel));
size();updateScroll();
const start=performance.now();
function frame(now){const previous=scroll;scroll+=(scrollTarget-scroll)*.065;scrollVelocity+=(Math.abs(scroll-previous)*850-scrollVelocity)*.08;mouse[0]+=(mouseTarget[0]-mouse[0])*.055;mouse[1]+=(mouseTarget[1]-mouse[1])*.055;document.querySelector('.progress span').style.height=`${scroll*100}%`;gl.uniform2f(uniforms.r,canvas.width,canvas.height);gl.uniform1f(uniforms.t,(now-start)/1000);gl.uniform1f(uniforms.s,scroll);gl.uniform1f(uniforms.v,Math.min(scrollVelocity,8));gl.uniform2f(uniforms.m,...mouse);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(frame);}requestAnimationFrame(frame);
