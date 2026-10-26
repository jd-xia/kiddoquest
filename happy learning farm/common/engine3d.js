/* Happy Learning Farm — 3D engine: renderer, post-processing (bloom + colour grade), materials,
   shared builders (trees, hero, labels). Used by index.html (plaza) and school-*.html. */
const EMO='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const FONT='"Fredoka",ui-rounded,"Segoe UI",sans-serif';
const CAM={yaw:0,zoom:innerWidth<600?1.15:1};
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
function noise2(x,z){return (Math.sin(x*1.1+Math.cos(z*.7))*Math.cos(z*1.3-x*.4)+.5*Math.sin(x*2.3+z*1.7))/1.5}
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;


const RIM={value:new THREE.Color(1,.92,.78)},TIME={value:0};
const GRADE={
  uniforms:{tDiffuse:{value:null},uSat:{value:1.05},uCon:{value:.2},uVig:{value:.42},uLift:{value:new THREE.Vector3(.012,.016,.032)}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform sampler2D tDiffuse;uniform float uSat,uCon,uVig;uniform vec3 uLift;varying vec2 vUv;'+
   'vec3 enc(vec3 c){c=max(c,0.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));}'+
   'void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,uSat);'+
   'vec3 s=clamp(enc(c),0.,1.);s=mix(s,s*s*(3.-2.*s),uCon);'+
   's=mix(s*vec3(.95,.98,1.05)+uLift,s*vec3(1.04,1.,.94),smoothstep(.15,.85,dot(s,vec3(.3,.59,.11))));'+
   'vec2 d=(vUv-.5)*vec2(1.,.85);s*=mix(1.-uVig,1.,smoothstep(.78,.28,length(d)));gl_FragColor=vec4(s,1.);}'
};
function makePost(r){
  if(!THREE.EffectComposer||!THREE.UnrealBloomPass||!THREE.ShaderPass)return null;
  try{
    const gl2=r.capabilities.isWebGL2,type=gl2||r.extensions.has('EXT_color_buffer_half_float')?THREE.HalfFloatType:THREE.UnsignedByteType;
    const o={type,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter};
    const rt=gl2&&THREE.WebGLMultisampleRenderTarget?Object.assign(new THREE.WebGLMultisampleRenderTarget(2,2,o),{samples:4}):new THREE.WebGLRenderTarget(2,2,o);
    const c=new THREE.EffectComposer(r,rt),rp=new THREE.RenderPass(new THREE.Scene(),new THREE.PerspectiveCamera());
    const bloom=new THREE.UnrealBloomPass(new THREE.Vector2(256,256),.62,.55,.86),grade=new THREE.ShaderPass(GRADE);
    c.addPass(rp);c.addPass(bloom);c.addPass(grade);
    return {c,rp,bloom,grade,slow:0,fps:[]};
  }catch(e){console.warn('post off',e);return null}
}
function postQuality(dt){const P=G.post;if(!P||P.low)return;P.fps.push(dt);if(P.fps.length<120)return;
  const avg=P.fps.reduce((a,b)=>a+b,0)/P.fps.length;P.fps.length=0;
  if(avg>1/34){P.low=true;P.bloom.enabled=false;G.r.setPixelRatio(Math.min(1.25,window.devicePixelRatio||1));G.resize()}}
function addRim(m,k){m.onBeforeCompile=s=>{s.uniforms.uRim=RIM;s.fragmentShader='uniform vec3 uRim;\n'+s.fragmentShader.replace('#include <output_fragment>',
  '{float fr=1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0);outgoingLight+=uRim*pow(fr,3.0)*'+(k||'0.30')+';}\n#include <output_fragment>')};
  m.customProgramCacheKey=()=>'rim'+(k||'');return m}
function addWind(m,amp){m.onBeforeCompile=s=>{s.uniforms.uTime=TIME;s.vertexShader='uniform float uTime;\n'+s.vertexShader.replace('#include <begin_vertex>',
  '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec3 ip=instanceMatrix[3].xyz;float wv=sin(uTime*1.7+ip.x*.45+ip.z*.31)+.45*sin(uTime*3.3+ip.x*1.7-ip.z);transformed.x+=wv*transformed.y*'+amp+';transformed.z+=wv*transformed.y*'+amp+'*.45;\n#endif')};
  m.customProgramCacheKey=()=>'wind'+amp;return m}
function skyEnv(scene,sky){
  try{const U=sky.material.uniforms,top=U.top.value,hor=U.hor.value,bot=U.bot.value,sun=U.sun.value,sc=U.sunC.value,N=32,v=new THREE.Vector3(),c=new THREE.Color();
    const enc=x=>Math.round(255*Math.min(1,x<=.0031308?x*12.92:1.055*Math.pow(x,1/2.4)-.055));
    const face=(f)=>{const cv=document.createElement('canvas');cv.width=cv.height=N;const g=cv.getContext('2d'),im=g.createImageData(N,N);
      for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=(i+.5)/N*2-1,b=(j+.5)/N*2-1;
        [[1,-b,-a],[-1,-b,a],[a,1,b],[a,-1,-b],[a,-b,1],[-a,-b,-1]][f].forEach((x,k)=>v.setComponent(k,x));v.normalize();
        const h=v.y;if(h>0)c.copy(hor).lerp(top,Math.pow(h,.5));else c.copy(hor).lerp(bot,Math.pow(-h,.4));
        const sd=Math.max(0,v.dot(sun));c.r+=sc.r*Math.pow(sd,6)*.9;c.g+=sc.g*Math.pow(sd,6)*.9;c.b+=sc.b*Math.pow(sd,6)*.9;
        const o=(j*N+i)*4;im.data[o]=enc(c.r);im.data[o+1]=enc(c.g);im.data[o+2]=enc(c.b);im.data[o+3]=255}
      g.putImageData(im,0,0);return cv};
    const cube=new THREE.CubeTexture([0,1,2,3,4,5].map(face));cube.encoding=THREE.sRGBEncoding;cube.needsUpdate=true;scene.environment=cube}catch(e){console.warn(e)}}
const G={r:null,stage:null,raf:0,last:0,host:null,inLoop:false,pd:null};
function engine(){
  if(G.r!==null)return !!G.r;
  if(!window.THREE){G.r=false;return false}
  try{
    const r=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    r.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
    r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
    r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=.98;
    G.r=r;G.post=makePost(r);const cv=r.domElement;
    const ptrs=new Map(),spread=()=>{const [a,b]=[...ptrs.values()];return Math.hypot(a.x-b.x,a.y-b.y)};   // two fingers = pinch zoom
    const lift=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)G.pinch=null};
    cv.addEventListener('pointerdown',e=>{ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(e.pointerType==='touch')tapPointer(e);else ptrEl().classList.add('press');
      if(ptrs.size===2){G.pd=null;G.pinch=spread();return}
      G.pd={x:e.clientX,y:e.clientY,lx:e.clientX,drag:false};try{cv.setPointerCapture(e.pointerId)}catch(_){}});
    cv.addEventListener('pointermove',e=>{if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(G.pinch&&ptrs.size===2){const s=spread();if(G.stage&&G.stage.zoom&&s>0)G.stage.zoom(-Math.log(s/G.pinch)/Math.log(1.22));G.pinch=s;return}
      if(e.pointerType!=='touch'){movePointer(e);if(!G.pd){G.hoverEv=e;if(!G.hoverRaf)G.hoverRaf=requestAnimationFrame(doHover)}}
      const pd=G.pd;if(!pd)return;if(Math.abs(e.clientX-pd.x)>10||Math.abs(e.clientY-pd.y)>10){if(!pd.drag&&e.pointerType!=='touch')setPointer({cursor:'drag'},e);pd.drag=true}if(pd.drag&&G.stage&&G.stage.onDrag)G.stage.onDrag(e.clientX-pd.lx);pd.lx=e.clientX});
    cv.addEventListener('wheel',e=>{if(!G.stage||!G.stage.zoom)return;e.preventDefault();G.stage.zoom(Math.max(-1,Math.min(1,e.deltaY/(e.ctrlKey?25:120))))},{passive:false});
    cv.addEventListener('pointerup',e=>{lift(e);if(G.ptr)G.ptr.classList.remove('press');const pd=G.pd;G.pd=null;if(pd&&!pd.drag&&G.stage&&G.stage.onTap&&!DLG)G.stage.onTap(e)});
    cv.addEventListener('pointercancel',e=>{lift(e);G.pd=null});
    cv.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')endHover()});
    window.addEventListener('resize',()=>G.resize());
    return true;
  }catch(e){console.error(e);G.r=false;return false}
}
G.resize=()=>{if(!G.stage||!G.host||!G.host.isConnected)return;const w=G.host.clientWidth,h=G.host.clientHeight;if(!w||!h)return;G.r.setSize(w,h);if(G.post){G.post.c.setPixelRatio(G.r.getPixelRatio());G.post.c.setSize(w,h)}G.stage.camera.aspect=w/h;G.stage.camera.updateProjectionMatrix()};
function mountStage(st,host){
  if(!st||!engine())return false;
  if(G.stage!==st)endHover();
  if(G.stage&&G.stage!==st&&G.stage.leave)G.stage.leave();
  G.stage=st;G.host=host;host.prepend(G.r.domElement);G.resize();
  if(!G.raf&&!G.inLoop){G.last=performance.now();G.raf=requestAnimationFrame(loop3d)}
  return true;
}
/* ---------- game pointer ----------
   Over 3D scenes the system cursor is replaced by a drawn pointer that follows the mouse:
   a gold arrow to walk ('move'), the arrow with a spinning ring to pick ('select'), a paint brush
   ('paint'), a grey arrow with a lock ('locked') and a turning badge while dragging the camera ('drag').
   A stage may define hover(e) -> {cursor, label} and unhover(); the label floats next to the pointer.
   Touch screens have no hover: a tap shows the pointer briefly where the finger landed. */
const PTR_ICON={
  arrow:(id,a,b,c)=>`<svg viewBox="0 0 48 48"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><path d="M6 4L6 36L14.5 28.5L20 41L26.5 38L21 25.5L32.5 25.5Z" fill="url(#${id})" stroke="#0C1330" stroke-width="3" stroke-linejoin="round"/><path d="M10 12V27" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".75"/></svg>`,
  brush:'<svg viewBox="0 0 48 48"><g stroke="#0C1330" stroke-width="2.6" stroke-linejoin="round"><path d="M23 25L40 6.5Q43 4 45 6Q46.5 8.5 43.5 11L26 28Z" fill="#9B6BFF"/><path d="M17.5 30.5L23 25L26 28L20.5 33.5Z" fill="#F7C548"/><path d="M17.5 30.5C12 31 8 34.5 6.5 39.5L4 45L9.5 42.5C14.5 41 18 37 20.5 33.5Z" fill="#FF5C8A"/></g><path d="M30 21.5L40.5 10" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/></svg>'
};
const GOLD_ARROW=()=>PTR_ICON.arrow('pgGold','#FFF4C2','#F7C548','#D98E1C');
const PTR_LOOK={   // icon + hot spot (the pixel that points) inside the pointer's 44px box
  move:{icon:GOLD_ARROW,hx:5,hy:3.5},select:{icon:GOLD_ARROW,hx:5,hy:3.5},drag:{icon:GOLD_ARROW,hx:5,hy:3.5},
  locked:{icon:()=>PTR_ICON.arrow('pgGrey','#F1F4FF','#B8C2DE','#7D88A8'),hx:5,hy:3.5},
  paint:{icon:()=>PTR_ICON.brush,hx:3.7,hy:41}
};
function ptrEl(){
  if(!G.ptr){G.ptr=document.createElement('div');G.ptr.className='gptr';G.ptr.setAttribute('aria-hidden','true');
    G.ptr.innerHTML='<i class="pring"></i><span class="pico"></span><b class="pbadge"></b>';document.body.appendChild(G.ptr)}
  return G.ptr;
}
function lookPointer(state){const el=ptrEl(),L=PTR_LOOK[state]||PTR_LOOK.move;
  if(el.dataset.state!==state){el.dataset.state=state;el.querySelector('.pico').innerHTML=L.icon();el.style.setProperty('--hx',L.hx+'px');el.style.setProperty('--hy',L.hy+'px')}
  return L}
function movePointer(e){const el=ptrEl(),L=PTR_LOOK[el.dataset.state]||PTR_LOOK.move;el.style.transform=`translate(${e.clientX-L.hx}px,${e.clientY-L.hy}px)`}
function doHover(){G.hoverRaf=0;const e=G.hoverEv;
  if(!e||!G.stage||!G.stage.hover||DLG||G.pd)return setPointer(e&&G.stage&&G.stage.hover&&!DLG?{cursor:'move'}:null,e);
  setPointer(G.stage.hover(e)||{cursor:'move'},e)}
function endHover(){G.hoverEv=null;setPointer(null);if(G.stage&&G.stage.unhover)G.stage.unhover()}
function setPointer(r,e){
  const on=!!(r&&r.cursor);if(G.r)G.r.domElement.dataset.cur=on?'game':'';
  const el=ptrEl();el.classList.toggle('show',on&&!!e);if(on){lookPointer(r.cursor);if(e)movePointer(e)}
  if(!G.tip){G.tip=document.createElement('div');G.tip.className='gtip';G.tip.setAttribute('aria-hidden','true');document.body.appendChild(G.tip)}
  const show=!!(r&&r.label&&e);G.tip.classList.toggle('show',show);
  if(show){G.tip.textContent=r.label;G.tip.style.left=Math.min(e.clientX+26,innerWidth-G.tip.offsetWidth-8)+'px';G.tip.style.top=Math.min(e.clientY+30,innerHeight-44)+'px'}
}
function tapPointer(e){   // touch: flash the pointer (and the stage's highlight) where the finger landed
  if(!G.stage||!G.stage.hover||DLG)return;const r=G.stage.hover(e)||{cursor:'move'},el=ptrEl();
  lookPointer(r.cursor);movePointer(e);el.classList.remove('tap');void el.offsetWidth;el.classList.add('show','tap');
  clearTimeout(G.tapT);G.tapT=setTimeout(()=>{el.classList.remove('show','tap');if(G.stage&&G.stage.unhover)G.stage.unhover()},750);
}
/* 3D pointer marks: a glowing ring on the ground with a turning dashed halo, and an optional bouncing gold arrow above. */
function makeMark(r,o={}){
  const g=new THREE.Group(),disc=new THREE.Group(),color=o.color||'#FFD447',op=o.opacity||.95;g.visible=false;g.add(disc);
  const flat=geo=>{geo.rotateX(-Math.PI/2);return geo};
  const M=a=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:a,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
  const ring=new THREE.Mesh(flat(new THREE.RingGeometry(r*.8,r,48)),M(op));disc.add(ring);
  const glow=new THREE.Mesh(flat(new THREE.CircleGeometry(r*.8,40)),M(.18));glow.material.blending=THREE.AdditiveBlending;disc.add(glow);
  const dash=new THREE.Group();disc.add(dash);for(let k=0;k<6;k++)dash.add(new THREE.Mesh(flat(new THREE.RingGeometry(r*1.14,r*1.28,12,1,k*Math.PI/3,Math.PI/5)),M(op*.85)));
  [ring,glow,...dash.children].forEach(m=>m.renderOrder=4);
  let chev=null;
  if(o.arrow){chev=new THREE.Group();const c=mesh(new THREE.ConeGeometry(.3,.62,4),'#FFD447',0,0,0,{e:'#FFB000',ei:.9,r:.3});c.rotation.x=Math.PI;c.castShadow=false;chev.add(c);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex(),color:'#FFE27A',transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));s.scale.set(1.3,1.3,1);chev.add(s);g.add(chev)}
  g.userData={disc,ring,dash,glow,chev,r0:r,h:o.h||2};return g;
}
function placeMark(m,x,y,z,r,h){const U=m.userData;m.visible=true;m.position.set(x,y+.08,z);U.disc.scale.setScalar((r||U.r0)/U.r0);if(h!=null)U.h=h}
function animMark(m,t){if(!m||!m.visible)return;const U=m.userData,s=1+Math.sin(t*5)*.05;
  U.ring.scale.set(s,1,s);U.dash.rotation.y=t*.9;U.glow.material.opacity=.14+Math.sin(t*5)*.06;
  if(U.chev){U.chev.position.y=U.h+Math.abs(Math.sin(t*3.2))*.4;U.chev.rotation.y=t*2}}
function unmountStage(){endHover();if(G.stage&&G.stage.leave)G.stage.leave();G.stage=null;G.host=null;KEYS.clear();if(!G.inLoop&&G.raf){cancelAnimationFrame(G.raf);G.raf=0}}
function loop3d(now){
  G.raf=0;const st=G.stage;if(!st)return;
  const dt=Math.min(.05,(now-G.last)/1000);G.last=now;st.t=(st.t||0)+dt;TIME.value+=dt;postQuality(dt);if(st.rim)RIM.value.copy(st.rim);
  G.inLoop=true;try{st.update(dt)}catch(e){console.error(e)}G.inLoop=false;
  if(!G.stage)return;
  if(G.stage===st){const P=G.post;if(P){P.rp.scene=st.scene;P.rp.camera=st.camera;P.bloom.strength=st.bloom??.62;const U=P.grade.uniforms;U.uVig.value=st.vig??.42;U.uSat.value=st.sat??1.05;U.uCon.value=st.con??.2;P.c.render(dt)}else G.r.render(st.scene,st.camera)}
  G.raf=requestAnimationFrame(loop3d);
}
function rayFrom(e,cam){const r=G.r.domElement.getBoundingClientRect();const v=new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(v,cam);return ray}
function actOf(hits){for(const h of hits){let o=h.object;while(o&&!o.userData.act)o=o.parent;if(o&&o.visible)return o.userData.act}return null}

/* ---------- shared builders ---------- */
const col=c=>new THREE.Color(c).convertSRGBToLinear();
const MATS={};
function mat(c,o={}){
  const k=[c,o.flat?1:0,o.r??'',o.e||'',o.ei||'',o.m||''].join('|');if(MATS[k])return MATS[k];
  const p={color:col(c),roughness:o.r??.78,metalness:o.m||0,flatShading:!!o.flat,envMapIntensity:.5};
  if(o.e){p.emissive=col(o.e);p.emissiveIntensity=o.ei||1}
  return MATS[k]=addRim(new THREE.MeshStandardMaterial(p));
}
function mesh(geo,color,x=0,y=0,z=0,o){const m=new THREE.Mesh(geo,typeof color==='string'?mat(color,o):color);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m}
const BOX=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const CYL=(a,b,h,n=12)=>new THREE.CylinderGeometry(a,b,h,n);
const SPH=(r,a=16,b=12)=>new THREE.SphereGeometry(r,a,b);
const ICO=(r,d=1)=>new THREE.IcosahedronGeometry(r,d);
const RB={};
function rbox(w,h,d,r=.1){
  const k=[w,h,d,r].join();if(RB[k])return RB[k];
  const s=new THREE.Shape(),W=w-2*r,H=h-2*r,c=Math.min(r*.8,W/2,H/2),x=-W/2,y=-H/2;
  s.moveTo(x+c,y);s.lineTo(x+W-c,y);s.quadraticCurveTo(x+W,y,x+W,y+c);s.lineTo(x+W,y+H-c);s.quadraticCurveTo(x+W,y+H,x+W-c,y+H);
  s.lineTo(x+c,y+H);s.quadraticCurveTo(x,y+H,x,y+H-c);s.lineTo(x,y+c);s.quadraticCurveTo(x,y,x+c,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:Math.max(.001,d-2*r),bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,curveSegments:3});
  g.translate(0,0,-Math.max(.001,d-2*r)/2);g.computeVertexNormals();g.userData.keep=true;return RB[k]=g;
}
const TEX={};
function ctex(c){const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t}
function emojiTex(e){if(TEX[e])return TEX[e];const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.font=`100px ${EMO}`;g.textAlign='center';g.textBaseline='middle';g.fillText(e,64,72);return TEX[e]=ctex(c)}
function emojiSprite(e,s){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex(e),transparent:true,toneMapped:false}));sp.scale.set(s,s,1);return sp}
/* The player's own picture for an icon (common/art.js), falling back to the emoji. */
function iconTex(key,e){const a=artOf(key);if(!a||!a.img||!a.img.naturalWidth)return emojiTex(e);
  const k='art|'+a.id+'|'+a.t;if(TEX[k])return TEX[k];const t=new THREE.Texture(a.img);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;t.needsUpdate=true;return TEX[k]=t}
function iconSprite(key,e,s){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:iconTex(key,e),transparent:true,toneMapped:false}));sp.scale.set(s,s,1);return sp}
function labelSprite(text,o={}){
  const bg=o.bg||'rgba(18,27,64,.92)',fg=o.fg||'#FFF3C8',bd=o.border||'#F5C24C',h=o.h||.5;
  const c=document.createElement('canvas'),g=c.getContext('2d');g.font=`600 46px ${FONT}`;
  const w=Math.ceil(g.measureText(text).width)+56;c.width=w;c.height=80;
  g.font=`600 46px ${FONT}`;g.shadowColor='rgba(30,10,60,.35)';g.shadowBlur=8;g.shadowOffsetY=3;
  g.fillStyle=bg;rr(g,6,6,w-12,64,32);g.fill();g.shadowColor='transparent';g.lineWidth=4;g.strokeStyle=bd;g.stroke();
  g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,40);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ctex(c),transparent:true,depthTest:false,toneMapped:false}));
  sp.scale.set(h*w/80,h,1);sp.renderOrder=10;return sp;
}
function signPlane(text,bg,w){
  const c=document.createElement('canvas');c.width=512;c.height=112;const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,112);gr.addColorStop(0,bg);gr.addColorStop(1,shade(bg,-.18));
  g.fillStyle=gr;rr(g,0,0,512,112,26);g.fill();g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=5;rr(g,8,8,496,96,20);g.stroke();
  g.fillStyle='#FFFFFF';let fs=56;g.font=`700 ${fs}px ${FONT}`;
  while(g.measureText(text).width>450&&fs>24){fs-=2;g.font=`700 ${fs}px ${FONT}`}
  g.shadowColor='rgba(0,0,0,.25)';g.shadowBlur=4;g.shadowOffsetY=2;g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,60);
  return new THREE.Mesh(new THREE.PlaneGeometry(w,w*112/512),new THREE.MeshBasicMaterial({map:ctex(c),transparent:true,side:THREE.DoubleSide,toneMapped:false}));
}
function shade(hex,amt){const c=new THREE.Color(hex);const hsl={};c.getHSL(hsl);c.setHSL(hsl.h,hsl.s,Math.max(0,Math.min(1,hsl.l+amt)));return '#'+c.getHexString()}
function dotTex(){if(TEX.__dot)return TEX.__dot;const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return TEX.__dot=ctex(c)}
function shadowDisc(r){const m=new THREE.Mesh(new THREE.CircleGeometry(r,24),new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.2,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.035;return m}
function gableRoof(width,depth,height,color){const s=new THREE.Shape();s.moveTo(-depth/2,0);s.lineTo(depth/2,0);s.lineTo(0,height);s.lineTo(-depth/2,0);
  const m=mesh(new THREE.ExtrudeGeometry(s,{depth:width,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:2}),color,0,0,0,{flat:true,r:.6});m.rotation.y=Math.PI/2;m.position.x=-width/2;return m}
function clearGroup(g){while(g.children.length){const c=g.children[0];g.remove(c);c.traverse(o=>{if(o.geometry&&!o.geometry.userData.keep)o.geometry.dispose()})}}
function skyDome(top,hor,bot){
  const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:col(top)},hor:{value:col(hor)},bot:{value:col(bot)},sun:{value:new THREE.Vector3(0,.5,1).normalize()},sunC:{value:col('#FFE2B0')}},
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top;uniform vec3 hor;uniform vec3 bot;uniform vec3 sun;uniform vec3 sunC;varying vec3 vP;void main(){vec3 d=normalize(vP);float h=d.y;vec3 c=h>0.?mix(hor,top,pow(clamp(h,0.,1.),.5)):mix(hor,bot,pow(clamp(-h,0.,1.),.4));float sd=max(dot(d,sun),0.);c+=sunC*(pow(sd,900.)*6.+pow(sd,24.)*.35+pow(sd,4.)*.12);c+=hor*pow(1.-abs(h),10.)*.18;gl_FragColor=vec4(c,1.);}'});
  const s=new THREE.Mesh(new THREE.SphereGeometry(300,48,24),m);s.renderOrder=-1;s.userData.sky=true;return s;
}
function addLights(scene,o){
  const sky=scene.children.find(c=>c.userData.sky);if(sky){sky.material.uniforms.sun.value.set(...o.pos).normalize();sky.material.uniforms.sunC.value.copy(col(o.sun));if(G.post)skyEnv(scene,sky)}
  scene.add(new THREE.HemisphereLight(col(o.sky),col(o.ground),o.hemi*(scene.environment?.6:1)));
  const s=new THREE.DirectionalLight(col(o.sun),o.si);s.position.set(...o.pos);s.castShadow=true;
  const r=o.range;Object.assign(s.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:1,far:140});
  s.shadow.mapSize.set(2048,2048);s.shadow.bias=-.0004;s.shadow.normalBias=.03;s.shadow.radius=4;scene.add(s);scene.add(s.target);return s;
}
function terrain(scene,o){
  const g=new THREE.PlaneGeometry(o.size,o.size,o.seg,o.seg);g.rotateX(-Math.PI/2);
  const pos=g.attributes.position,cols=[],c=new THREE.Color();
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=o.height(x,z);pos.setY(i,h);
    const n=noise2(x*.35,z*.35),n2=noise2(x*.09+3,z*.09-1);c.copy(col(o.c2)).lerp(col(o.c1),Math.max(0,n)).lerp(col(o.c3),Math.max(0,-n)*.9).multiplyScalar(.84+.16*n2);if(o.c4&&h>2)c.lerp(col(o.c4),Math.min(1,(h-2)/5));cols.push(c.r,c.g,c.b)}
  g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));g.computeVertexNormals();
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,envMapIntensity:.4}));m.receiveShadow=true;scene.add(m);return m;
}
function scatter(scene,geo,cols,count,accept,smin,smax,shadow,matO){
  const mo=Object.assign({flatShading:true,roughness:.9},matO||{}),wind=mo.wind;delete mo.wind;const sm=new THREE.MeshStandardMaterial(mo);if(wind)addWind(sm,wind);
  const im=new THREE.InstancedMesh(geo,sm,count);
  const d=new THREE.Object3D();let n=0,tries=0;
  while(n<count&&tries<count*25){tries++;const p=accept();if(!p)continue;
    d.position.set(p.x,p.y||0,p.z);d.rotation.set(0,Math.random()*6.28,0);const s=smin+Math.random()*(smax-smin);d.scale.set(s,s*(.75+Math.random()*.6),s);d.updateMatrix();
    im.setMatrixAt(n,d.matrix);im.setColorAt(n,col(cols[(Math.random()*cols.length)|0]));n++}
  im.count=n;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
  im.castShadow=!!shadow;im.receiveShadow=true;scene.add(im);return im;
}
function sparkles(scene,n,area,color,size){
  const g=new THREE.BufferGeometry(),p=new Float32Array(n*3),seed=[];
  for(let i=0;i<n;i++){p[i*3]=(Math.random()-.5)*area.x;p[i*3+1]=area.y0+Math.random()*area.h;p[i*3+2]=(Math.random()-.5)*area.z;seed.push(Math.random()*6.28)}
  g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const m=new THREE.PointsMaterial({size:size||.18,color:col(color),map:dotTex(),transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  const pts=new THREE.Points(g,m);pts.userData={seed,base:p.slice()};scene.add(pts);return pts;
}
function animSparkles(pts,t){const a=pts.geometry.attributes.position,b=pts.userData.base,s=pts.userData.seed;
  for(let i=0;i<s.length;i++){a.array[i*3]=b[i*3]+Math.sin(t*.4+s[i])*.9;a.array[i*3+1]=b[i*3+1]+Math.sin(t*.7+s[i]*2)*.4;a.array[i*3+2]=b[i*3+2]+Math.cos(t*.33+s[i])*.9}
  a.needsUpdate=true;pts.material.opacity=.65+.25*Math.sin(t*1.7)}
function roundTree(x,z,s=1,apples){const g=new THREE.Group();g.add(mesh(CYL(.16*s,.27*s,1.5*s,7),'#7A4E2D',0,.75*s,0,{flat:true}));
  const gr=['#4C9443','#5DAA4D','#6CBD58'];
  [[0,2,0,1.15],[.6,2.45,.2,.82],[-.55,2.4,-.25,.78],[.08,3,-.08,.72]].forEach(([a,b,c,r],k)=>g.add(mesh(ICO(r*s,1),gr[k%3],a*s,b*s,c*s,{flat:true})));
  if(apples)for(let k=0;k<8;k++){const a=k/8*Math.PI*2;g.add(mesh(SPH(.15,10,8),'#E5333D',Math.cos(a)*1.05*s,1.9*s+(k%3)*.35,Math.sin(a)*1.05*s,{r:.35}))}
  g.position.set(x,0,z);g.rotation.y=(x*13+z*7)%6;return g}
function pine(x,z,s=1){const g=new THREE.Group();g.add(mesh(CYL(.14*s,.22*s,1.2*s,6),'#6B4426',0,.6*s,0,{flat:true}));
  ['#2F7D4A','#38905A','#46A366'].forEach((c,k)=>g.add(mesh(new THREE.ConeGeometry((1.3-k*.32)*s,1.6*s,7),c,0,(1.5+k*.85)*s,0,{flat:true})));
  g.position.set(x,0,z);g.rotation.y=(x*7+z*3)%6;return g}
function cloud(x,y,z,s){const g=new THREE.Group();[[0,0,0,1.6],[1.5,-.2,.2,1.2],[-1.5,-.25,-.1,1.1],[.6,.6,-.2,1.1],[-.5,.5,.3,1]].forEach(([a,b,c,r])=>{const m=new THREE.Mesh(ICO(r*s,1),mat('#FFFFFF',{flat:true,r:1,e:'#FFFFFF',ei:.25}));m.position.set(a*s,b*s,c*s);g.add(m)});g.position.set(x,y,z);return g}
function fenceRect(x0,x1,z0,z1,step,color,parent){
  const side=(ax,az,bx,bz)=>{const L=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(L/step));
    for(let k=0;k<=n;k++){const t=k/n;parent.add(mesh(rbox(.2,1.05,.2,.05),color,ax+(bx-ax)*t,.52,az+(bz-az)*t))}
    for(const y of[.36,.78]){const r=mesh(BOX(L,.1,.07),color,(ax+bx)/2,y,(az+bz)/2);r.rotation.y=-Math.atan2(bz-az,bx-ax);parent.add(r)}};
  side(x0,z0,x1,z0);side(x1,z0,x1,z1);side(x1,z1,x0,z1);side(x0,z1,x0,z0)}
/* The player on the farm, the islands and in battle: their own drawing or an emoji character as a
   stand-up cut-out, otherwise the big-head 3D kid from avatar3d.js (a preset or their own design). */
function buildHero(f,showTag){
  const p=cur(),L=lookOf(p);
  if(artOf('me'))return buildPaperHero(showTag);
  if(!L.hero)return buildPaperHero(showTag,L.e);
  return buildChibi(cfgFor(p),f,{showTag,player:p});
}
/* The child's own character drawing as a paper cut-out. Same userData shape as buildHero so animHero works. */
function buildPaperHero(showTag,emoji){
  const g=new THREE.Group(),body=new THREE.Group(),head=new THREE.Object3D();g.add(body);body.add(head);
  const sp=emoji?emojiSprite(emoji,2.3):iconSprite('me','🧑‍🌾',2.7);sp.center.set(.5,.06);body.add(sp);   // anchored at the feet, so squash and wobble start from the ground
  if(showTag!==false){const tag=labelSprite(cur().name,{bg:'rgba(214,150,30,.95)',fg:'#FFFFFF',border:'#FFF1B8',h:.45});tag.position.y=2.95;g.add(tag)}
  g.add(shadowDisc(.55));
  const stub=()=>new THREE.Object3D();
  g.userData={legs:[stub(),stub()],arms:[stub(),stub()],body,head,eyes:[],paper:sp,paperSize:emoji?2.3:2.7};return g;
}
function buildHat(h){const g=new THREE.Group();
  if(h==='cap'){g.add(mesh(new THREE.SphereGeometry(.47,20,10,0,Math.PI*2,0,Math.PI/2),'#3E7BFA',0,.1,0,{r:.6}));g.add(mesh(rbox(.52,.06,.42,.025),'#3E7BFA',0,.12,.44))}
  else if(h==='flowers'){const cs=['#FF6B9A','#FFD43B','#B56BFF','#FFFFFF'];for(let k=0;k<12;k++){const a=k/12*Math.PI*2;g.add(mesh(SPH(.09,10,8),cs[k%4],Math.cos(a)*.38,.28,Math.sin(a)*.38,{r:.5}))}}
  else if(h==='crown'){g.add(mesh(CYL(.32,.32,.24,16),'#F2B705',0,.44,0,{r:.25,m:.7}));for(let k=0;k<5;k++){const a=k/5*Math.PI*2;g.add(mesh(new THREE.ConeGeometry(.075,.24,8),'#F2B705',Math.cos(a)*.29,.66,Math.sin(a)*.29,{r:.25,m:.7}));g.add(mesh(SPH(.05,8,6),'#E5333D',Math.cos(a)*.33,.44,Math.sin(a)*.33,{r:.2}))}}
  else{g.add(mesh(CYL(.76,.78,.05,28),'#E9C46A',0,.3,0,{r:.85}));g.add(mesh(CYL(.33,.38,.34,20),'#E9C46A',0,.47,0,{r:.85}));g.add(mesh(CYL(.385,.385,.09,20),'#E5484D',0,.36,0))}
  return g}
function animHero(h,mode,t,dt){
  const U=h.userData;let lw=0,aw=0,by=0,ar=0,hx=0;
  if(mode==='walk'){const s=Math.sin(t*11);lw=s*.7;aw=-s*.6;by=Math.abs(Math.sin(t*11))*.07}
  else if(mode==='cheer'){const s=Math.abs(Math.sin(t*6));by=s*.45;ar=-2.6;}
  else if(mode==='cast'){ar=-1.6}
  else if(mode==='sad'){hx=.45;by=-.08}
  else{by=Math.sin(t*2.2)*.02}
  U.legs[0].rotation.x=lw;U.legs[1].rotation.x=-lw;
  if(ar){U.arms[0].rotation.x+=(ar-U.arms[0].rotation.x)*Math.min(1,dt*12);U.arms[1].rotation.x+=(ar-U.arms[1].rotation.x)*Math.min(1,dt*12);U.arms[0].rotation.z=-.25;U.arms[1].rotation.z=.25}
  else{U.arms[0].rotation.x=aw;U.arms[1].rotation.x=-aw;U.arms[0].rotation.z=0;U.arms[1].rotation.z=0}
  U.body.position.y=by;U.head.rotation.x+=(hx-U.head.rotation.x)*Math.min(1,dt*6);
  const blink=(t%3.6)<.12?.1:1;U.eyes.forEach(e=>e.scale.y=blink);
  if(U.paper){const sq=mode==='walk'?Math.abs(Math.sin(t*11))*.06:mode==='cheer'?Math.abs(Math.sin(t*6))*.1:0;   // paper cut-out: wobble and squash instead of limbs
    U.paper.material.rotation=mode==='walk'?Math.sin(t*11)*.1:mode==='sad'?.22:mode==='cast'?-.14:Math.sin(t*2.2)*.03;
    const k=U.paperSize||2.7;U.paper.scale.set(k*(1+sq*.5),k*(1-sq*.5),1)}
}
function addFx(st,text,x,y,z){const s=labelSprite(text,{h:.55,border:'#2FA36B'});s.position.set(x,y,z);st.scene.add(s);st.fx.push({s,t:0})}
function updFx(st,dt){for(let i=st.fx.length-1;i>=0;i--){const e=st.fx[i];e.t+=dt;e.s.position.y+=dt*1.1;e.s.material.opacity=Math.min(1,(1.6-e.t)*2);if(e.t>1.6){st.scene.remove(e.s);e.s.material.map.dispose();e.s.material.dispose();st.fx.splice(i,1)}}}
function camCtl(extra){return `<div class="camctl"><button data-act="camL" aria-label="Turn camera left">⟲</button><button data-act="camR" aria-label="Turn camera right">⟳</button><button data-act="zoomIn" aria-label="Zoom in">＋</button><button data-act="zoomOut" aria-label="Zoom out">－</button>${extra||''}</div>`}
