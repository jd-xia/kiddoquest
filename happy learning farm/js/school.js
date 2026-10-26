/* Happy Math Farm — school engine shared by every school-<id>.html page:
   3D level island, battle arena, question screens and results.
   The page sets <body data-school="<id>"> to pick its entry in DUNGEONS (common/curriculum.js). */
const SCHOOL_ID=document.body.dataset.school||'tricks';
/* ===================== TRICK ISLAND (level map) ===================== */
const PLATS=[[-5.5,8.5,.35],[3.5,5.5,.75],[-3.5,1.6,1.15],[4.5,-2,1.55],[-3,-5.8,1.95],[1.5,-10.2,2.6]];
function jitter(geo,a){const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  let h=Math.sin(x*12.9898+y*78.233+z*37.719)*43758.5453;const r1=h-Math.floor(h);h=Math.sin(x*93.98+y*17.23+z*51.7)*24634.6345;const r2=h-Math.floor(h);
  p.setX(i,x+(r1-.5)*a);p.setZ(i,z+(r2-.5)*a);p.setY(i,y+(r1-r2)*a*.3)}geo.computeVertexNormals();return geo}
function buildMap(){
  if(!engine())return null;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,700);
  MAP={scene,camera,t:0,yaw:.35,zoom:1,hits:[],plats:[],fx:[],jump:null,heroAt:0,camT:new THREE.Vector3(0,1,0),
    update:mapUpdate,onTap:mapTap,onDrag:dx=>{MAP.yaw-=dx*.006},rotate:d=>{MAP.yaw+=d*Math.PI/6},zoom:d=>{MAP.zm=Math.max(.7,Math.min(MAP.camera.aspect<.8?2.6:1.9,(MAP.zm||1)*Math.pow(1.2,d)))},leave(){}};
  scene.add(skyDome('#4F7BE0','#FFD2B0','#2E86B8'));scene.fog=new THREE.Fog(col('#FFD8BC'),80,260);
  addLights(scene,{sky:'#DDEBFF',ground:'#3E6E8C',hemi:.62,sun:'#FFD7A8',si:1.9,pos:[-22,24,20],range:22});MAP.rim=new THREE.Color(1,.86,.7);MAP.bloom=.55;
  const sg=new THREE.PlaneGeometry(500,500,64,64);sg.rotateX(-Math.PI/2);
  MAP.sea=new THREE.Mesh(sg,addRim(new THREE.MeshStandardMaterial({color:col('#1F8CC4'),roughness:.08,metalness:.35,flatShading:true,emissive:col('#0A3F66'),emissiveIntensity:.3}),'0.55'));MAP.sea.position.y=-1.3;MAP.sea.receiveShadow=true;scene.add(MAP.sea);MAP.seaBase=sg.attributes.position.array.slice();
  scene.add(mesh(jitter(CYL(17.6,18.8,.6,36,1),.4),'#F0D9A6',0,-1.25,0,{flat:true,r:1}));
  scene.add(mesh(jitter(CYL(15.8,17.6,3.2,32,3),.6),'#C9A57A',0,-1.7,0,{flat:true,r:1}));
  scene.add(mesh(jitter(CYL(15.5,15.9,.7,32,1),.3),'#78C05A',0,-.35,0,{flat:true,r:1}));
  // path stones & platforms
  PLATS.forEach(([x,z,h],i)=>{
    const boss=i===PLATS.length-1,R=boss?1.9:1.4,g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
    g.add(mesh(jitter(CYL(R*.92,R*1.05,h+.6,12,2),.08),'#B9AE9E',0,(h-.6)/2,0,{flat:true}));
    const top=mesh(CYL(R,R,.3,32),'#9D7BFF',0,h,0,{r:.45});g.add(top);
    const rim=mesh(new THREE.TorusGeometry(R,.09,8,40),'#FFFFFF',0,h+.15,0,{r:.3});rim.rotation.x=Math.PI/2;g.add(rim);
    const glow=new THREE.Mesh(new THREE.RingGeometry(R*1.05,R*1.5,40),new THREE.MeshBasicMaterial({color:'#B99CFF',transparent:true,opacity:.0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));glow.rotation.x=-Math.PI/2;glow.position.y=h+.17;g.add(glow);
    const lock=emojiSprite('🔒',.9);lock.position.y=h+.9;g.add(lock);
    g.userData.act={kind:'plat',i};MAP.hits.push(g);
    MAP.plats.push({g,top,glow,lock,h,R,x,z,labels:[]});
    if(i<PLATS.length-1){const [nx,nz,nh]=PLATS[i+1];for(const t of[.3,.5,.7]){const sx=x+(nx-x)*t,sz=z+(nz-z)*t,sh=h+(nh-h)*t-.15;
      scene.add(mesh(jitter(CYL(.45,.55,sh+.6,8,1),.06),'#C8BDAE',sx,(sh-.6)/2,sz,{flat:true}))}}
  });
  // boss castle
  const cs=new THREE.Group();cs.position.set(1.5,0,-13.4);scene.add(cs);
  cs.add(mesh(rbox(5,3.2,1.4,.12),'#8E7AB8',0,3.4,0,{r:.8}));
  for(const x of[-2.6,2.6]){cs.add(mesh(CYL(.8,.9,5.4,12),'#7A65A8',x,3,0,{r:.8}));cs.add(mesh(new THREE.ConeGeometry(1.05,1.6,12),'#4B2E83',x,6.5,0,{flat:true}));cs.add(mesh(BOX(.04,.9,.04),'#888',x,7.7,0));cs.add(mesh(BOX(.5,.3,.03),'#FFD43B',x+.27,7.95,0))}
  cs.add(mesh(rbox(1.6,2.2,.4,.2),'#2E1A5C',0,3,.6));
  const crown=emojiSprite('👑',1.6);crown.position.set(0,5.8,0);cs.add(crown);MAP.crown=crown;
  const arch=signPlane('Trick Path','#7A4DE0',3.2);arch.position.set(-5.5,2.9,11.6);scene.add(arch);
  for(const x of[-7,-4])scene.add(mesh(CYL(.12,.14,3,8),'#8B5A2B',x,1.4,11.6));
  const keeper=dun(SCHOOL_ID).npc,hoot=iconSprite(npcKey(keeper),keeper.e,1.6);hoot.position.set(-8.6,.9,10.4);scene.add(hoot);MAP.hoot=hoot;scene.add(mesh(CYL(.6,.7,.3,14),'#8B5A2B',-8.6,0,10.4));
  const ok=(x,z)=>Math.hypot(x,z)<14.2&&PLATS.every(([px,pz])=>Math.hypot(x-px,z-pz)>2.6)&&Math.hypot(x-1.5,z+13.4)>4&&Math.hypot(x+5.5,z-11.6)>2;
  for(let k=0;k<26;k++){const a=k/26*Math.PI*2+Math.sin(k*3)*.1,r=11.8+((k*7)%3)*.9,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!ok(x,z))continue;scene.add(k%3?roundTree(x,z,.95+((k*5)%4)*.1):pine(x,z,1.05))}
  scatter(scene,new THREE.ConeGeometry(.07,.4,3).translate(0,.2,0),['#5DA544','#6DB650','#7CC35A'],1400,()=>{const x=(Math.random()-.5)*30,z=(Math.random()-.5)*30;return ok(x,z)?{x,z}:null},.8,1.4,false);
  scatter(scene,SPH(.1,6,5).translate(0,.28,0),['#FF7AA8','#FFD43B','#FFFFFF','#B98CFF'],220,()=>{const x=(Math.random()-.5)*30,z=(Math.random()-.5)*30;return ok(x,z)?{x,z}:null},.8,1.3,false,{flatShading:false});
  scatter(scene,ICO(.5,0).translate(0,.2,0),['#A7A3A0','#8F8C88'],26,()=>{const a=Math.random()*6.28,r=15+Math.random()*3;return{x:Math.cos(a)*r,z:Math.sin(a)*r,y:-1.2}},.6,1.6,true);
  MAP.clouds=[];for(let k=0;k<6;k++){const c=cloud(-80+k*30,18+(k%3)*5,-60+(k%2)*30,1.6);scene.add(c);MAP.clouds.push(c)}
  MAP.spark=sparkles(scene,120,{x:30,z:30,y0:.5,h:7},'#FFF0B8',.2);
  MAP.arrow=emojiSprite('👇',1);scene.add(MAP.arrow);
  return MAP;
}
function mapSync(D){
  const p=cur();
  if(MAP.hero){MAP.scene.remove(MAP.hero)}
  MAP.hero=buildHero(farmOf(p),false);MAP.scene.add(MAP.hero);
  let next=-1;
  MAP.plats.forEach((P,i)=>{
    const l=D.levels[i],r=p.lv[l.id]||{},open=unlocked(p,D,i),st=r.stars||0,boss=!!l.boss;
    P.open=open;P.top.material=mat(!open?'#8E8A98':st?(boss?'#FF6B9A':'#FFC93C'):(boss?'#E5484D':'#9D7BFF'),{r:.4,e:open&&!st?'#6A3CF0':undefined,ei:.25});
    P.lock.visible=!open;
    P.labels.forEach(s=>{P.g.remove(s);s.material.map.dispose();s.material.dispose()});P.labels=[];
    const nm=labelSprite(`${boss?'👑 ':''}${i+1}  ${l.name}`,{h:.72});nm.position.y=P.h+(boss?4.4:3.6);P.g.add(nm);P.labels.push(nm);
    if(open){const ss=labelSprite('★'.repeat(st)+'☆'.repeat(3-st),{h:.55,fg:'#FFD447'});ss.position.y=P.h+(boss?3.85:3.05);P.g.add(ss);P.labels.push(ss)}
    if(open&&!st&&next<0)next=i;
  });
  MAP.next=next;
  const at=UI.mapAt!=null?UI.mapAt:Math.max(0,next<0?PLATS.length-1:next);
  MAP.heroAt=at;const P=MAP.plats[at];MAP.hero.position.set(P.x,P.h+.15,P.z);MAP.hero.rotation.y=Math.PI*.15;MAP.jump=null;
  MAP.camT.set(P.x*.5,P.h,P.z*.5);
}
function mapTap(e){
  if(MAP.jump)return;
  const ray=rayFrom(e,MAP.camera),a=actOf(ray.intersectObjects(MAP.hits,true));
  if(a&&a.kind==='plat')mapGo(a.i);
}
function mapGo(i){
  const P=MAP.plats[i];if(!P)return;
  if(!P.open){toast(`Clear level ${i} first to open this one!`);return}
  if(MAP.jump)return;
  const path=[];if(i>MAP.heroAt)for(let k=MAP.heroAt+1;k<=i;k++)path.push(k);else if(i<MAP.heroAt)for(let k=MAP.heroAt-1;k>=i;k--)path.push(k);
  const done=()=>{UI.mapAt=i;startLevel(i)};
  if(!path.length){done();return}
  MAP.jump={path,k:0,t:0,from:MAP.hero.position.clone(),done};
}
function mapUpdate(dt){
  const t=MAP.t,h=MAP.hero;
  const a=MAP.sea.geometry.attributes.position,b=MAP.seaBase;
  for(let i=0;i<a.count;i++){const x=b[i*3],z=b[i*3+2];a.array[i*3+1]=Math.sin(x*.12+t*1.1)*.22+Math.cos(z*.1+t*.9)*.2}
  a.needsUpdate=true;
  if(MAP.jump){const J=MAP.jump,P=MAP.plats[J.path[J.k]];J.t+=dt/.42;const to=new THREE.Vector3(P.x,P.h+.15,P.z),u=Math.min(1,J.t);
    h.position.lerpVectors(J.from,to,u);h.position.y+=Math.sin(u*Math.PI)*1.4;h.rotation.y=Math.atan2(to.x-J.from.x,to.z-J.from.z);
    animHero(h,'walk',t,dt);
    if(u>=1){MAP.heroAt=J.path[J.k];J.k++;J.t=0;J.from=to.clone();if(J.k>=J.path.length){MAP.jump=null;h.rotation.y=Math.PI*.15;J.done()}}
  }else animHero(h,'idle',t,dt);
  MAP.plats.forEach((P,i)=>{P.glow.material.opacity=P.open&&i===MAP.next?.45+Math.sin(t*4)*.25:P.open?.12:0});
  const N=MAP.plats[MAP.next>=0?MAP.next:-1];
  if(N){MAP.arrow.visible=true;MAP.arrow.position.set(N.x,N.h+(MAP.next===PLATS.length-1?5.3:4.4)+Math.sin(t*4)*.2,N.z)}else MAP.arrow.visible=false;
  MAP.crown.position.y=5.8+Math.sin(t*2)*.2;MAP.hoot.position.y=.95+Math.abs(Math.sin(t*2))*.1;
  MAP.clouds.forEach(c=>{c.position.x+=dt*.8;if(c.position.x>110)c.position.x=-110});
  animSparkles(MAP.spark,t);
  const tgt=new THREE.Vector3(h.position.x*.55,h.position.y*.6+.6,h.position.z*.55);MAP.camT.lerp(tgt,Math.min(1,dt*2.5));
  const asp=MAP.camera.aspect,D=(asp<.8?33:28)*(MAP.zm||1);
  MAP.camera.position.set(MAP.camT.x+Math.sin(MAP.yaw)*D,MAP.camT.y+D*.72,MAP.camT.z+Math.cos(MAP.yaw)*D);MAP.camera.lookAt(MAP.camT);
  updFx(MAP,dt);
}
function rDungeon(){
  const p=cur(),D=dun(UI.did);
  if(!D.open){document.body.classList.remove('fullworld');$('#app').innerHTML=topBar(D.sign,'toTown')+npcHTML(D.npc,`The ${gradeName(D.grade)} levels of my school are still being built. Come back soon!`)+'<div class="btns"><button class="b" data-act="toTown">Back to the farm</button></div>';return}
  const list=D.levels.map((l,i)=>{const r=p.lv[l.id]||{},open=unlocked(p,D,i),st=r.stars||0;return `<button class="lvchip ${st?'done':open?'open':'locked'}" data-act="mapGo" data-i="${i}" ${open?'':'aria-disabled="true"'}><b>${open?(l.boss?'👑':i+1):'🔒'}</b><span>${l.name}</span><small>${'★'.repeat(st)}${'☆'.repeat(3-st)}</small></button>`}).join('');
  $('#app').innerHTML=topBar(D.sign,'toTown')+`<div class="world mapworld" id="world"><div class="wtop"><div class="flv">${ico(npcKey(D.npc),D.npc.e)} Tap a glowing stone to battle</div>${camCtl()}</div><div class="toast" id="toast" aria-live="polite"></div></div>
  <div class="dock"><div class="lvlist">${list}</div><div class="btns"><button class="b ghost sm" data-act="keeperTalk">${ico(npcKey(D.npc),D.npc.e)} Hear the welcome again</button></div></div>`;
  if(!MAP)buildMap();
  if(MAP&&mountStage(MAP,$('#world')))mapSync(D);else $('#world').insertAdjacentHTML('afterbegin','<div class="nogl">Pick a level from the list below.</div>');
  const seenKey=D.id+':'+D.grade;if(!p.seen[seenKey]){p.seen[seenKey]=1;save();dialog(D.npc,D.intro)}
}

/* ===================== BATTLE ARENA ===================== */
const SLIME_COLS=['#7ED957','#5EC8F2','#FF8FB1','#FFB547','#B58CFF','#5BE0C2','#FF7A6B','#9AD0FF'];
function buildBattle(){
  if(!engine())return null;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,400);
  BAT={scene,camera,t:0,tw:[],parts:[],fx:[],shake:0,mode:'idle',heroMode:'idle',update:batUpdate,leave(){}};
  scene.add(skyDome('#2F2A78','#FFAFC8','#2A2550'));scene.fog=new THREE.Fog(col('#D99AC0'),28,95);
  addLights(scene,{sky:'#E5DBFF',ground:'#3B4A3A',hemi:.6,sun:'#FFE1C2',si:1.7,pos:[7,12,10],range:12});BAT.rim=new THREE.Color(1,.75,.95);BAT.bloom=.85;BAT.efx=[];
  terrain(scene,{size:160,seg:70,height:(x,z)=>{const d=Math.hypot(x,z);return smooth(11,34,d)*(4+3*noise2(x*.08,z*.08))},c1:'#4E8E48',c2:'#5A9C50',c3:'#457F40',c4:'#6C8C70'});
  scene.add(mesh(CYL(6.2,6.7,.5,64),'#4A4472',0,0,0,{r:.55,m:.15}));
  scene.add(mesh(CYL(5.3,5.3,.06,64),'#5D5590',0,.27,0,{r:.28,m:.35}));
  for(let k=0;k<16;k++){const a=k/16*Math.PI*2;const s=mesh(rbox(.9,.18,.5,.06),'#7A70A6',Math.cos(a)*5.8,.3,Math.sin(a)*5.8,{r:.5,m:.2});s.rotation.y=-a;scene.add(s)}
  BAT.rune=new THREE.Mesh(new THREE.RingGeometry(4.5,4.75,96),new THREE.MeshBasicMaterial({color:new THREE.Color('#C9A7FF').multiplyScalar(1.8),transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));BAT.rune.rotation.x=-Math.PI/2;BAT.rune.position.y=.31;scene.add(BAT.rune);
  BAT.rune2=new THREE.Mesh(new THREE.RingGeometry(2.2,2.32,48),BAT.rune.material);BAT.rune2.rotation.x=-Math.PI/2;BAT.rune2.position.y=.31;scene.add(BAT.rune2);
  BAT.crystals=[];
  for(let k=0;k<6;k++){const a=Math.PI+.35+k/5*(Math.PI-.7);const x=Math.cos(a)*7.8,z=Math.sin(a)*7.8-.5;
    scene.add(mesh(rbox(.8,2.4,.8,.12),'#8C80A8',x,1.2,z,{r:.8}));
    const c=mesh(new THREE.OctahedronGeometry(.42,0),k%2?'#7FE3FF':'#FF9BEA',x,3.1,z,{r:.15,e:k%2?'#4FC8FF':'#FF6AD5',ei:1.3,flat:true});c.castShadow=false;scene.add(c);
    const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex(),color:k%2?'#7FE3FF':'#FF9BEA',transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));gl.scale.set(2.2,2.2,1);gl.position.set(x,3.1,z);scene.add(gl);
    BAT.crystals.push({c,gl,y:3.1,k})}
  BAT.torches=[];
  for(const x of[-4.6,4.6]){scene.add(mesh(CYL(.1,.14,2.2,8),'#5A3A22',x,1.1,-3.2));scene.add(mesh(CYL(.26,.16,.3,10),'#3A3A3A',x,2.3,-3.2,{m:.6,r:.4}));
    const f=new THREE.Mesh(new THREE.ConeGeometry(.2,.55,10),new THREE.MeshBasicMaterial({color:'#FFB347',toneMapped:false}));f.position.set(x,2.68,-3.2);scene.add(f);
    const L=new THREE.PointLight(col('#FFB060'),1.4,9,2);L.position.set(x,2.9,-3.2);scene.add(L);
    const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex(),color:'#FFB347',transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));gl.scale.set(1.8,1.8,1);gl.position.set(x,2.75,-3.2);scene.add(gl);
    BAT.torches.push({f,L,gl})}
  for(let k=0;k<30;k++){const a=k/30*Math.PI*2+Math.sin(k)*.1,r=13+((k*11)%7);const x=Math.cos(a)*r,z=Math.sin(a)*r;if(z>8&&Math.abs(x)<10)continue;const y=smooth(11,34,r)*(4+3*noise2(x*.08,z*.08));const t=k%3?pine(x,z,1.2+((k*3)%4)*.15):roundTree(x,z,1.1);t.position.y=y;scene.add(t)}
  for(let k=0;k<14;k++){const a=Math.random()*6.28,r=7+Math.random()*4;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(z>4)continue;const cc=k%2?'#FF7AD9':'#6FE7FF';
    scene.add(mesh(CYL(.06,.08,.35,6),'#F3E9DA',x,.17,z));const cap=mesh(new THREE.SphereGeometry(.22,12,8,0,Math.PI*2,0,Math.PI/2),cc,x,.32,z,{e:cc,ei:.8,r:.4});scene.add(cap)}
  scatter(scene,new THREE.ConeGeometry(.08,.45,3).translate(0,.22,0),['#4E8E48','#5DA050','#3F7A3B'],1200,()=>{const a=Math.random()*6.28,r=6.9+Math.random()*12;return{x:Math.cos(a)*r,z:Math.sin(a)*r,y:smooth(11,34,r)*3}},.8,1.5,false,{wind:.5});
  BAT.ff=sparkles(scene,90,{x:24,z:16,y0:.6,h:5},'#FFF3A8',.22);
  BAT.camPos=new THREE.Vector3(0,4,14);
  return BAT;
}
function buildSlime(color,boss){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const bm=new THREE.MeshStandardMaterial({color:col(color),roughness:.18,metalness:0,emissive:col(color),emissiveIntensity:.18,transparent:true,opacity:.96});
  const b=new THREE.Mesh(SPH(1,40,30),bm);b.scale.set(1.08,.86,1.08);b.position.y=.86;b.castShadow=true;body.add(b);
  const base=new THREE.Mesh(CYL(1.02,1.14,.26,40),bm);base.position.y=.13;base.castShadow=true;body.add(base);
  const sh=new THREE.Mesh(SPH(.24,14,10),new THREE.MeshBasicMaterial({color:'#FFFFFF',transparent:true,opacity:.75,toneMapped:false}));sh.scale.set(1,.55,.4);sh.position.set(-.42,1.42,.66);body.add(sh);
  const sh2=sh.clone();sh2.scale.set(.4,.25,.2);sh2.position.set(-.18,1.58,.72);body.add(sh2);
  const eyes=[];
  for(const s of[-1,1]){const e=new THREE.Group();e.position.set(s*.34,1.02,.82);e.add(mesh(SPH(.2,16,12),'#FFFFFF',0,0,0,{r:.25}));e.add(mesh(SPH(.115,14,10),'#24164A',0,-.01,.12,{r:.2}));
    const gl=new THREE.Mesh(SPH(.035,8,6),new THREE.MeshBasicMaterial({color:'#fff',toneMapped:false}));gl.position.set(.04,.04,.22);e.add(gl);body.add(e);eyes.push(e)}
  const mouth=mesh(new THREE.TorusGeometry(.13,.035,8,16,Math.PI),'#3A1A3A',0,.72,.95);mouth.rotation.z=Math.PI;body.add(mouth);
  for(const s of[-1,1])body.add(mesh(SPH(.1,10,8),'#FF8FB1',s*.58,.8,.8,{r:.8}));
  if(boss){for(const s of[-1,1]){const br=mesh(rbox(.34,.08,.06,.02),'#24164A',s*.34,1.3,.9);br.rotation.z=-s*.4;body.add(br);
      const horn=mesh(new THREE.ConeGeometry(.16,.5,10),'#FFF3D6',s*.62,1.75,.1,{r:.4});horn.rotation.z=-s*.5;body.add(horn)}
    const cr=new THREE.Group();cr.position.y=1.72;body.add(cr);cr.add(mesh(CYL(.42,.42,.26,18),'#F2B705',0,0,0,{r:.25,m:.7}));
    for(let k=0;k<5;k++){const a=k/5*Math.PI*2;cr.add(mesh(new THREE.ConeGeometry(.09,.26,8),'#F2B705',Math.cos(a)*.38,.25,Math.sin(a)*.38,{r:.25,m:.7}));cr.add(mesh(SPH(.06,8,6),'#E5333D',Math.cos(a)*.43,0,Math.sin(a)*.43))}}
  g.userData={body,mat:bm,eyes};return g;
}
function tween(st,dur,fn,done){st.tw.push({t:0,dur,fn,done})}
function bigText(text,c1,c2){const c=document.createElement('canvas'),g=c.getContext('2d'),F2='"Lilita One","Fredoka",sans-serif';g.font=`120px ${F2}`;
  const w=Math.ceil(g.measureText(text).width)+60;c.width=w;c.height=170;g.font=`120px ${F2}`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
  g.lineWidth=18;g.strokeStyle='#2A1600';g.strokeText(text,w/2,92);const gr=g.createLinearGradient(0,30,0,150);gr.addColorStop(0,'#FFFBE6');gr.addColorStop(.45,c1);gr.addColorStop(.55,c2);gr.addColorStop(1,c1);
  g.fillStyle=gr;g.fillText(text,w/2,90);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ctex(c),transparent:true,depthTest:false,toneMapped:false}));sp.userData.ar=w/170;sp.renderOrder=12;return sp}
function glowSprite(color,s,k){const m=new THREE.SpriteMaterial({map:dotTex(),color:new THREE.Color(color).multiplyScalar(k||1),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});const sp=new THREE.Sprite(m);sp.scale.set(s,s,1);return sp}
function fxShock(st,x,y,z,color,size){const m=new THREE.Mesh(new THREE.RingGeometry(.55,.75,64),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(2.2),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
  m.position.set(x,y,z);m.rotation.x=-Math.PI/2;st.scene.add(m);tween(st,.55,u=>{const s=.4+ease(u)*(size||3.2);m.scale.set(s,s,s);m.material.opacity=(1-u)*.95},()=>{st.scene.remove(m);m.geometry.dispose();m.material.dispose()})}
function fxFlash(st,x,y,z,color,s){const f=glowSprite(color,s||3,2.4);f.position.set(x,y,z);st.scene.add(f);tween(st,.28,u=>{f.scale.setScalar((s||3)*(1+u*.8));f.material.opacity=1-u},()=>{st.scene.remove(f);f.material.dispose()})}
function fxWord(st,text,x,y,z,c1,c2,h){const sp=bigText(text,c1||'#FFD447',c2||'#E8960F');const H=h||1.1;sp.position.set(x,y,z);st.scene.add(sp);
  tween(st,1.1,u=>{const p=u<.18?ease(u/.18)*1.25:1.25-.25*ease(Math.min(1,(u-.18)/.2));sp.scale.set(H*sp.userData.ar*p,H*p,1);sp.position.y=y+u*.9;sp.material.opacity=u>.7?1-(u-.7)/.3:1},()=>{st.scene.remove(sp);sp.material.map.dispose();sp.material.dispose()})}
function fxPillar(st,x,z,color){const m=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.3,12,32,1,true),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(1.6),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
  m.position.set(x,6.3,z);st.scene.add(m);tween(st,2.2,u=>{m.material.opacity=Math.sin(u*Math.PI)*.45;m.scale.set(1-u*.4,1,1-u*.4)},()=>{st.scene.remove(m);m.geometry.dispose();m.material.dispose()})}
const HITWORDS=['GREAT!','SUPER!','PERFECT!','NICE!','AWESOME!'];

function burst(st,x,y,z,colors,n,speed){
  for(let i=0;i<n;i++){const m=new THREE.Mesh(i%3?BOX(.12,.12,.04):ICO(.09,0),new THREE.MeshBasicMaterial({color:colors[i%colors.length],toneMapped:false}));m.position.set(x,y,z);
    const a=Math.random()*6.28,e=Math.random()*1.2+.2,s=(speed||5)*(.5+Math.random()*.7);
    st.scene.add(m);st.parts.push({m,v:new THREE.Vector3(Math.cos(a)*Math.cos(e)*s,Math.sin(e)*s+2,Math.sin(a)*Math.cos(e)*s),life:1.2+Math.random()*.6,spin:Math.random()*10})}
}
function batReset(){
  const B=BAT;
  B.tw.length=0;B.parts.forEach(p=>B.scene.remove(p.m));B.parts.length=0;
  if(B.hero)B.scene.remove(B.hero);if(B.mon)B.scene.remove(B.mon.g);B.mon=null;
  if(B.qlabel){B.scene.remove(B.qlabel);B.qlabel=null}
  B.hero=buildHero(farmOf(cur()),false);B.hero.position.set(-2.3,.3,0);B.hero.rotation.y=Math.PI/2-.45;B.scene.add(B.hero);B.snap=true;B.confetti=0;
  B.heroMode='idle';B.boss=!!dun(UI.did).levels[UI.li].boss;B.hp=B.boss?UI.qs.length:1;
}
function setQLabel(text,color){const B=BAT;if(B.qlabel){B.scene.remove(B.qlabel);B.qlabel.material.map.dispose()}
  if(!B.mon)return;B.qlabel=labelSprite(text,{h:B.boss?.75:.62,border:color||'#FFD43B',fg:'#FFFFFF'});B.qlabel.position.set(2.3,B.boss?3.9:2.75,0);B.scene.add(B.qlabel)}
function batSpawn(i,instant){
  const B=BAT;
  if(B.boss&&B.mon){setQLabel('?');return}
  if(B.mon)B.scene.remove(B.mon.g);
  const g=buildSlime(B.boss?'#9B6BFF':SLIME_COLS[i%SLIME_COLS.length],B.boss);const sc=B.boss?1.45:1;g.scale.setScalar(sc);
  g.position.set(2.3,.3,0);g.rotation.y=-Math.PI/2+.6;B.scene.add(g);B.mon={g,sc,base:.3};
  if(!instant){g.position.y=7;tween(B,.45,u=>{g.position.y=.3+7*(1-u*u)},()=>{tween(B,.35,u=>{const s=1+Math.sin(u*Math.PI)*.25;g.userData.body.scale.set(1+(s-1)*.6,2-s,1+(s-1)*.6)},()=>g.userData.body.scale.set(1,1,1))})}
  setQLabel('?');
}
function batAttack(ans,last){
  const B=BAT;if(!B.mon)return;const mon=B.mon;
  B.heroMode='cast';
  const orb=new THREE.Group();const core=new THREE.Mesh(SPH(.22,20,14),new THREE.MeshBasicMaterial({color:new THREE.Color('#FFF6B0').multiplyScalar(3),toneMapped:false}));orb.add(core);orb.add(glowSprite('#FFB830',2.6,1.4));fxFlash(B,-1.85,2.2,0,'#FFD45A',1.6);
  const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex(),color:'#FFD45A',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));gl.scale.set(1.6,1.6,1);orb.add(gl);
  const L=new THREE.PointLight(col('#FFD86B'),2.2,7,2);orb.add(L);B.scene.add(orb);
  const from=new THREE.Vector3(-1.85,2.2,0),to=new THREE.Vector3(2.2,1.2*mon.sc,0);
  tween(B,.38,u=>{orb.position.lerpVectors(from,to,u);orb.position.y+=Math.sin(u*Math.PI)*1.1;gl.material.rotation=u*6;
      if(Math.random()<.6)burst(B,orb.position.x,orb.position.y,orb.position.z,['#FFF3A0','#FFD45A'],1,.8);
      {const tr=glowSprite('#FFC24A',.9,1.6);tr.position.copy(orb.position);B.scene.add(tr);tween(B,.35,v=>{tr.material.opacity=(1-v)*.8;tr.scale.setScalar(.9*(1-v*.7))},()=>{B.scene.remove(tr);tr.material.dispose()})}},
    ()=>{B.scene.remove(orb);B.heroMode='idle';
      burst(B,to.x,to.y,to.z,['#FFFFFF','#FFD43B',B.boss?'#B58CFF':'#7ED957','#FF8FB1','#5EC8F2'],28,6);B.shake=.32;B.stop=.09;B.kick=1;
      fxFlash(B,to.x,to.y,to.z,'#FFE9A0',3.4);fxShock(B,to.x,.36,to.z,'#FFD45A',3.6);fxWord(B,HITWORDS[(Math.random()*HITWORDS.length)|0],to.x-.6,to.y+2.7+(B.boss?.9:0),to.z+.6);
      const bm=mon.g.userData.mat;bm.emissiveIntensity=1.4;
      tween(B,.3,u=>{bm.emissiveIntensity=.18+1.2*(1-u);mon.g.position.x=2.3+Math.sin(u*Math.PI)*.5});
      setQLabel('= '+ans,'#3FD6C2');
      if(B.boss){B.hp--;if(!last)return}
      tween(B,.55,u=>{const s=mon.sc*(1-ease(u));mon.g.scale.set(s*(1+u*.4),s,s*(1+u*.4));mon.g.position.y=.3+u*.6},()=>{B.scene.remove(mon.g);if(B.mon===mon)B.mon=null;if(B.qlabel){B.scene.remove(B.qlabel);B.qlabel=null}
        burst(B,2.3,1,0,['#FFD43B','#FFE98A','#FFFFFF'],18,4);
        for(let k=0;k<3;k++){const c=emojiSprite('🪙',.6);c.position.set(2.3,1,0);B.scene.add(c);const d=(k-1)*.8;tween(B,.9,u=>{c.position.set(2.3+d*u,1+u*3.2,0);c.material.opacity=1-u*u},()=>B.scene.remove(c))}});
    });
}
function batHurt(){
  const B=BAT;if(!B.mon)return;const g=B.mon.g;setTimeout(()=>{if(BAT===B){fxShock(B,-1.9,.36,0,'#FF4A63',2.4);fxFlash(B,-1.9,1.4,0,'#FF5A6E',2.4)}},280);
  tween(B,.28,u=>{g.position.x=2.3-ease(u)*2.6;g.position.y=.3+Math.sin(u*Math.PI)*.9},()=>{
    B.shake=.4;burst(B,-1.6,1.4,0,['#FF5A6E','#FF9AA8','#FFFFFF'],18,4);B.heroMode='hurt';
    tween(B,.4,u=>{B.hero.rotation.z=Math.sin(u*Math.PI)*.35;B.hero.position.x=-2.3-Math.sin(u*Math.PI)*.4},()=>{B.hero.rotation.z=0;B.heroMode='idle'});
    tween(B,.35,u=>{g.position.x=-.3+ease(u)*2.6;g.position.y=.3+Math.sin(u*Math.PI)*.5});
  });
}
function batSparkle(){const B=BAT;burst(B,-1.9,2.3,0,['#FFF3A0','#9DFFE8','#FFFFFF'],14,3);B.heroMode='cast';setTimeout(()=>{if(B.heroMode==='cast')B.heroMode='idle'},350)}
function batVictory(){const B=BAT;B.heroMode='cheer';B.confetti=3.2;fxPillar(B,B.hero?B.hero.position.x:-2.3,0,'#FFD45A');fxShock(B,B.hero?B.hero.position.x:-2.3,.36,0,'#FFE9A0',4.5);if(B.mon){const g=B.mon.g;B.mon=null;tween(B,.4,u=>g.scale.setScalar(Math.max(.001,(1-u)*1.45)),()=>B.scene.remove(g));burst(B,2.3,1,0,['#FFD43B','#FFFFFF','#FF8FB1'],18,4)}if(B.qlabel){B.scene.remove(B.qlabel);B.qlabel=null}}
function batDefeat(){const B=BAT;B.heroMode='sad';if(!B.mon){batSpawn(UI.idx||0,true)}}
function batUpdate(dt){
  const B=BAT,t=B.t;if(B.stop>0){B.stop-=dt;dt*=.1}
  for(let i=B.tw.length-1;i>=0;i--){const w=B.tw[i];w.t+=dt;const u=Math.min(1,w.t/w.dur);w.fn(u);if(u>=1){B.tw.splice(i,1);w.done&&w.done()}}
  for(let i=B.parts.length-1;i>=0;i--){const p=B.parts[i];p.life-=dt;p.v.y-=9*dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=p.spin*dt;p.m.rotation.y+=p.spin*dt;
    if(p.m.position.y<.32){p.m.position.y=.32;p.v.multiplyScalar(.4);p.v.y*=-.3}
    if(p.life<=0){B.scene.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();B.parts.splice(i,1)}}
  if(B.confetti>0){B.confetti-=dt;if(Math.random()<.7){const m=new THREE.Mesh(BOX(.14,.2,.02),new THREE.MeshBasicMaterial({color:['#FFD43B','#FF6B9A','#5EC8F2','#7ED957','#B58CFF'][(Math.random()*5)|0],toneMapped:false,side:THREE.DoubleSide}));m.position.set((Math.random()-.5)*9,7,(Math.random()-.5)*3);B.scene.add(m);B.parts.push({m,v:new THREE.Vector3((Math.random()-.5),-1.2,0),life:3.2,spin:4+Math.random()*6})}}
  if(B.hero){const hm=B.heroMode==='hurt'?'idle':B.heroMode;animHero(B.hero,hm,t,dt);if(hm==='cheer'){B.hero.position.y=.3;B.hero.rotation.y+=dt*1.5}}
  if(B.mon){const body=B.mon.g.userData.body;if(!B.tw.length){const s=Math.sin(t*3.2)*.045;body.scale.set(1+s,1-s,1+s)}
    B.mon.g.userData.eyes.forEach(e=>e.scale.y=(t%4.2)<.12?.15:1)}
  if(B.qlabel)B.qlabel.position.y=(B.boss?3.9:2.75)+Math.sin(t*2.5)*.08;
  BAT.rune.rotation.z+=dt*.25;BAT.rune2.rotation.z-=dt*.4;BAT.rune.material.opacity=.55+Math.sin(t*2)*.2;
  B.crystals.forEach(c=>{c.c.position.y=c.y+Math.sin(t*1.6+c.k)*.18;c.c.rotation.y+=dt*.8;c.gl.position.y=c.c.position.y;c.gl.material.opacity=.45+Math.sin(t*2.4+c.k)*.18});
  B.torches.forEach((o,k)=>{const f=1+Math.sin(t*17+k*3)*.08+Math.sin(t*11+k)*.06;o.f.scale.set(f,f*1.1,f);o.L.intensity=1.2+Math.sin(t*13+k)*.25;o.gl.material.opacity=.6+Math.sin(t*9+k)*.12});
  animSparkles(B.ff,t);
  const asp=B.camera.aspect,hf=Math.atan(Math.tan(THREE.MathUtils.degToRad(B.camera.fov/2))*asp);
  let d=Math.max(10.5,4.5/Math.tan(hf));d=Math.min(d,28);
  const sway=Math.sin(t*.35)*.5,cp=new THREE.Vector3(sway,1.6+d*.2,d);if(B.snap){B.camPos.copy(cp);B.snap=false}else B.camPos.lerp(cp,Math.min(1,dt*3));
  B.camera.position.copy(B.camPos);
  if(B.shake>0){B.shake-=dt;B.camera.position.x+=(Math.random()-.5)*B.shake*.6;B.camera.position.y+=(Math.random()-.5)*B.shake*.6}
  B.camera.lookAt(0,1.35,0);
  if(B.kick>0){B.kick=Math.max(0,B.kick-dt*3.5)}const fv=36-Math.sin(Math.min(1,B.kick||0)*Math.PI)*3.5;if(Math.abs(B.camera.fov-fv)>.01){B.camera.fov=fv;B.camera.updateProjectionMatrix()}
}
const bat=(fn,...a)=>{if(BAT&&G.stage===BAT)fn(...a)};

/* ===================== LEVEL SCREENS ===================== */
function ensureBattle(){
  if($('#battle')&&(!BAT||G.stage===BAT))return;
  $('#app').innerHTML=`<div class="battle" id="battle"><div class="bstage" id="bstage"><div class="bhud" id="bhud"></div><div class="qcard" id="qcard"></div><div class="toast" id="toast" aria-live="polite"></div></div><div class="bpanel" id="bpanel"></div><div class="bresult" id="bresult"></div></div>`;
  if(!BAT)buildBattle();
  if(BAT&&mountStage(BAT,$('#bstage'))){batReset();if(UI.screen==='level')batSpawn(UI.idx,true)}
  else $('#bstage').insertAdjacentHTML('afterbegin','<div class="nogl" style="color:#fff">Battle mode needs 3D. You can still answer below!</div>');
}
function startLevel(i){
  const p=cur(),D=dun(UI.did),l=D.levels[i];
  if(!unlocked(p,D,i)){return}
  dialog(D.npc,l.intro,()=>beginLevel(i));
}
function beginLevel(i){
  const D=dun(UI.did),l=D.levels[i];
  const qs=l.set?l.set():Array.from({length:l.count},(_,k)=>l.gen(k));
  UI={screen:'level',did:D.id,li:i,qs,idx:0,hearts:3,first:0,answered:0,start:Date.now(),mapAt:i};
  setupQ();render();
}
function setupQ(){
  const q=UI.qs[UI.idx];
  q.sel=[];q.pairs=[];q.boxes=[];
  UI.phase=q.type==='input'?'answer':'work';
  UI.bubble={kind:'',html:q.say||'Type your answer.'};
  PAD=null;
}
function hudHTML(){const l=dun(UI.did).levels[UI.li];
  return `<button class="bx" data-act="quitLevel" aria-label="Leave level">✕</button><div class="bmid"><div class="bname">${l.boss?'👑 ':''}${l.name}</div><div class="bprog">${UI.qs.map((_,k)=>`<i class="${k<UI.idx||(UI.screen==='result'&&UI.ok)?'ok':k===UI.idx?'on':''}"></i>`).join('')}</div></div><div class="bhearts" aria-label="${UI.hearts} hearts left">${'❤️'.repeat(Math.max(0,UI.hearts))}${'🖤'.repeat(3-Math.max(0,UI.hearts))}</div>`}
function rLevel(){
  ensureBattle();$('#battle').classList.remove('result','lose');
  const D=dun(UI.did),l=D.levels[UI.li],q=UI.qs[UI.idx];
  $('#bhud').innerHTML=hudHTML();
  $('#qcard').innerHTML=`<div class="qlabel">${l.boss?`Boss HP ${UI.qs.length-UI.idx} / ${UI.qs.length}`:`Monster ${UI.idx+1} of ${UI.qs.length}`}</div><div class="qexpr">${q.html}</div>`;
  let work='';
  if(q.type==='pair')work=pairHTML(q);
  if(q.type==='zerobox')work=zeroHTML(q);
  const pad=UI.phase==='answer'?`<div class="display" id="disp" aria-live="polite"></div><div class="pad" id="pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-k="${n}">${n}</button>`).join('')}<button data-k="back" aria-label="Delete">⌫</button><button data-k="0">0</button><button data-k="ok" class="ok" aria-label="Attack">⚡</button></div>`:'';
  const next=UI.phase==='right'?`<button class="b big-next" data-act="nextQ" id="nextBtn">${UI.idx<UI.qs.length-1?(l.boss?'Attack again ▸':'Next monster ▸'):'Finish level ▸'}</button>`:'';
  $('#bpanel').innerHTML=`<div class="bnpc ${UI.bubble.kind||''}"><span class="bface">${ico(npcKey(D.npc),D.npc.e)}</span><div>${UI.bubble.html}</div></div>${work}${pad}${next}`;
  if(UI.phase==='answer')PAD={v:''};
  if(UI.phase==='right')$('#nextBtn').focus({preventScroll:true});
}
function pairHTML(q){
  const used=new Set(q.pairs.flat());
  const chips=q.nums.map((n,i)=>`<button class="chip ${used.has(i)?'used':''} ${q.sel.includes(i)?'sel':''}" data-act="pairTap" data-i="${i}" ${used.has(i)?'disabled':''}><span class="n">${n}</span></button>`).join('');
  const coins=q.pairs.map(([a,b],k)=>`<span class="coinwrap"><span class="coin wide ${k===q.pairs.length-1&&q.justMade?'pop':''}">${q.target}</span><small>${q.nums[a]} + ${q.nums[b]}</small></span>`).join('');
  q.justMade=false;
  return `<div class="row">${chips}</div>${coins?`<div class="row">${coins}</div>`:''}`;
}
function pairLeft(q){
  const used=new Set(q.pairs.flat()),free=q.nums.map((_,i)=>i).filter(i=>!used.has(i));
  for(let a=0;a<free.length;a++)for(let b=a+1;b<free.length;b++)if(q.nums[free[a]]+q.nums[free[b]]===q.target)return true;
  return false;
}
function pairTap(i){
  const q=UI.qs[UI.idx];if(UI.phase!=='work')return;
  q.sel=q.sel.includes(i)?q.sel.filter(x=>x!==i):[...q.sel,i];
  if(q.sel.length===2){
    const [a,b]=q.sel,s=q.nums[a]+q.nums[b];
    if(s===q.target){
      q.pairs.push([a,b]);q.justMade=true;q.sel=[];bat(batSparkle);
      if(pairLeft(q))UI.bubble={kind:'good',html:`${q.nums[a]} + ${q.nums[b]} = ${q.target}! Find another pair.`};
      else{UI.phase='answer';UI.bubble={kind:'good',html:`${q.nums[a]} + ${q.nums[b]} = ${q.target}! Now add everything up and attack ⚡`}}
    }else{q.sel=[];UI.bubble={kind:'bad',html:`${q.nums[a]} + ${q.nums[b]} = ${s}, not ${q.target}. Look for ones digits that make 10.`}}
  }
  rLevel();
}
function zeroHTML(q){
  const t=q.terms;let html='',i=0;
  while(i<t.length){
    const box=q.boxes.find(x=>x[0]===i);
    if(box){html+=`<span class="coinwrap"><span class="coin ${box[0]===q.newest?'pop':''}">0</span><small>${box.map(k=>t[k].n).join(' ')}</small></span>`;i=box[box.length-1]+1;continue}
    const x=t[i];
    html+=`<button class="chip ${x.s==='+'?'plus':'minus'} ${q.sel.includes(i)?'sel':''}" data-act="zeroTap" data-i="${i}" ${UI.phase!=='work'?'disabled':''}><span class="s ${i===0?'ghost':''}">${sg(x.s)}</span><span class="n">${x.n}</span></button>`;i++;
  }
  q.newest=null;
  const sel=[...q.sel].sort((a,b)=>a-b);
  const live=sel.length?termsText(sel.map(k=>t[k]),t[sel[0]].s!=='+')+' = '+sumT(sel.map(k=>t[k])):'Tap numbers to start a group.';
  return `<div class="row">${html}</div>${UI.phase==='work'?`<div class="livesum">${live}</div><div class="btns"><button class="b" data-act="zeroBox">Make a zero box</button><button class="b ghost" data-act="zeroClear">Clear</button></div>`:''}`;
}
function zeroTap(i){const q=UI.qs[UI.idx];q.sel=q.sel.includes(i)?q.sel.filter(x=>x!==i):[...q.sel,i];rLevel()}
function zeroRunLeft(q){
  const b=new Set(q.boxes.flat()),t=q.terms;
  for(let i=0;i<t.length;i++){if(b.has(i))continue;let s=val(t[i]);for(let j=i+1;j<t.length&&!b.has(j);j++){s+=val(t[j]);if(s===0)return true}}
  return false;
}
function zeroBox(){
  const q=UI.qs[UI.idx],t=q.terms,sel=[...q.sel].sort((a,b)=>a-b);
  if(sel.length<2){UI.bubble={kind:'bad',html:'Pick at least two numbers that sit side by side.'};return rLevel()}
  if(!sel.every((k,j)=>j===0||k===sel[j-1]+1)){UI.bubble={kind:'bad',html:'A zero box needs numbers that sit side by side.'};return rLevel()}
  const s=sumT(sel.map(k=>t[k]));
  if(s!==0){UI.bubble={kind:'bad',html:`That group makes ${s}, not 0. Try 4 in a row, starting with a + number.`};return rLevel()}
  q.boxes.push(sel);q.boxes.sort((a,b)=>a[0]-b[0]);q.newest=sel[0];q.sel=[];bat(batSparkle);
  if(zeroRunLeft(q))UI.bubble={kind:'good',html:'Zero box! Find another one.'};
  else{UI.phase='answer';UI.bubble={kind:'good',html:'No more zero boxes. Zero adds nothing, so what do the leftovers make? Attack ⚡'}}
  rLevel();
}
function padKey(k){
  if(!PAD||UI.screen!=='level'||UI.phase!=='answer')return;
  if(k==='back')PAD.v=PAD.v.slice(0,-1);
  else if(k==='ok'){if(PAD.v!=='')submit(parseInt(PAD.v,10));return}
  else if(PAD.v.length<5)PAD.v=(PAD.v==='0'?'':PAD.v)+k;
  $('#disp').textContent=PAD.v;
}
function submit(v){
  const q=UI.qs[UI.idx];
  if(!q.answered){q.answered=true;UI.answered++}
  if(v===q.answer){
    if(!q.wrong)UI.first++;
    UI.phase='right';UI.bubble={kind:'good',html:`${pick(PRAISE)} The answer is <b>${q.answer}</b>.${q.wrong?'':' <span class="coinhint">+1 🪙</span>'}`};
    bat(batAttack,q.answer,UI.idx===UI.qs.length-1);rLevel();
  }else{
    q.wrong=true;UI.hearts--;bat(batHurt);
    if(UI.hearts<=0){setTimeout(()=>finishLevel(false),650);UI.phase='wait';UI.bubble={kind:'bad',html:'Oh no, out of hearts!'};rLevel();return}
    UI.bubble={kind:'bad',html:`Hoo, ${v} isn't it. Let's go step by step:<ol>${q.steps.map(s=>`<li>${s}</li>`).join('')}</ol>Now you try again!`};
    rLevel();const d=$('#disp');if(d)d.classList.add('shake');
  }
}
function nextQ(){if(UI.idx<UI.qs.length-1){UI.idx++;setupQ();bat(batSpawn,UI.idx,false);rLevel()}else finishLevel(true)}
function record(ok){
  const p=cur(),D=dun(UI.did),l=D.levels[UI.li];
  const secs=Math.round((Date.now()-UI.start)/1000);
  const r=p.lv[l.id]||(p.lv[l.id]={stars:0,plays:0,clears:0,qs:0,first:0,last:0});
  r.plays++;r.qs+=UI.answered;r.first+=UI.first;r.last=Date.now();
  let stars=0,bonus=0,firstClear=false;
  if(ok){stars=UI.hearts;firstClear=r.clears===0;bonus=firstClear?stars*5:(stars>r.stars?(stars-r.stars)*5:0);r.clears++;r.stars=Math.max(r.stars,stars)}
  const gems=UI.first+bonus;
  p.gems+=gems;p.time+=secs;
  p.sessions.unshift({t:Date.now(),d:D.id,lv:l.id,stars,qs:UI.answered,first:UI.first,secs,ok});
  p.sessions=p.sessions.slice(0,60);
  save();
  return{stars,gems,firstClear};
}
function finishLevel(ok){
  if(UI.screen!=='level')return;
  const r=record(ok);
  Object.assign(UI,{screen:'result',ok,stars:r.stars,gems:r.gems,firstClear:r.firstClear});PAD=null;
  render();
}
function quitLevel(){if(UI.answered>0)record(false);go('dungeon',{did:UI.did,mapAt:UI.li})}
function rResult(){
  ensureBattle();
  const B=$('#battle');B.classList.add('result');B.classList.toggle('lose',!UI.ok);
  bat(UI.ok?batVictory:batDefeat);
  const D=dun(UI.did),l=D.levels[UI.li],hasNext=UI.ok&&UI.li<D.levels.length-1;
  const line=!UI.ok?'Out of hearts! That\'s okay. Every try makes your brain stronger.'
    :UI.stars===3?'Perfect! Not a single mistake. You\'re a true trick hunter!'
    :UI.stars===2?'Great work! One more try could get you 3 stars.'
    :'You made it through! Practice makes the trick feel easy.';
  $('#bhud').innerHTML=hudHTML();
  $('#bresult').innerHTML=`<div class="rcard">
   <div class="rtitle">${UI.ok?'Victory!':'Try again'}</div>
   <p class="rsub">${l.name}</p>
   ${UI.ok?`<div class="bigstars" aria-label="${UI.stars} stars">${[0,1,2].map(k=>`<span class="pop" style="animation-delay:${200+k*220}ms">${k<UI.stars?'⭐':'☆'}</span>`).join('')}</div>`:''}
   ${UI.gems?`<div class="rcoins pop" style="animation-delay:900ms">+${UI.gems} 🪙</div><p class="rsub">${UI.firstClear?'Includes a first-clear bonus! ':''}Spend your coins on the farm.</p>`:''}
   <p>${line}</p>
   <div class="btns" style="justify-content:center">
    ${hasNext?`<button class="b" data-act="startLevel" data-i="${UI.li+1}">Next level ▸</button>`:''}
    <button class="b ${hasNext?'ghost':''}" data-act="startLevel" data-i="${UI.li}">${UI.ok?'Play again':'Try again'}</button>
    <button class="b ghost" data-act="toDungeon">Level map</button>
    <button class="b ghost" data-act="toTown">🌾 Farm</button>
   </div></div>`;
}

Object.assign(ACT,{
  mapGo:d=>{if(MAP&&G.stage===MAP)mapGo(+d.i);else startLevel(+d.i)},
  keeperTalk:()=>{const D=dun(UI.did);dialog(D.npc,D.intro)},
  toDungeon:()=>go('dungeon',{did:UI.did,mapAt:UI.li}),
  startLevel:d=>{const i=+d.i;if(UI.screen!=='dungeon')UI={screen:'dungeon',did:UI.did,mapAt:i};startLevel(i);if(UI.screen==='dungeon')render()},
  quitLevel:()=>quitLevel(),
  nextQ:()=>nextQ(),
  pairTap:d=>pairTap(+d.i),
  zeroTap:d=>zeroTap(+d.i),
  zeroBox:()=>zeroBox(),
  zeroClear:()=>{UI.qs[UI.idx].sel=[];rLevel()}
});
onPageKey=e=>{if(UI.screen==='level'){
  if(/^[0-9]$/.test(e.key))padKey(e.key);
  else if(e.key==='Backspace')padKey('back');
  else if(e.key==='Enter'){if(UI.phase==='answer')padKey('ok');else if(UI.phase==='right')nextQ()}}};
startPage({dungeon:rDungeon,level:rLevel,result:rResult},()=>({screen:'dungeon',did:SCHOOL_ID}));
