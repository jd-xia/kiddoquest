/* Happy Learning Farm — school engine shared by every school-<id>.html page:
   island picker (one island per topic), 3D level island, battle arena, question screens and results.
   The page sets <body data-school="<id>"> to pick its entry in SCHOOLS (common/curriculum.js). */
const SCHOOL_ID=document.body.dataset.school||'tricks';
let SEA=null;   // the island picker stage (MAP is the level island, BAT the battle)
/* ===================== shared sea ===================== */
function jitter(geo,a){const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  let h=Math.sin(x*12.9898+y*78.233+z*37.719)*43758.5453;const r1=h-Math.floor(h);h=Math.sin(x*93.98+y*17.23+z*51.7)*24634.6345;const r2=h-Math.floor(h);
  p.setX(i,x+(r1-.5)*a);p.setZ(i,z+(r2-.5)*a);p.setY(i,y+(r1-r2)*a*.3)}geo.computeVertexNormals();return geo}
/* Sky, sea, sun and clouds shared by the island picker and the level islands. */
function seaStage(o){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,900);
  const st=Object.assign({scene,camera,t:0,yaw:.35,zm:1,hits:[],fx:[],camT:new THREE.Vector3(0,1,0),leave(){}},o);
  Object.assign(st,{onDrag:dx=>{st.yaw-=dx*.006},rotate:d=>{st.yaw+=d*Math.PI/6},zoom:d=>{st.zm=Math.max(.6,Math.min(st.zmax,st.zm*Math.pow(1.2,d)))}});
  scene.add(skyDome('#4F7BE0','#FFD2B0','#2E86B8'));scene.fog=new THREE.Fog(col('#FFD8BC'),90,320);
  addLights(scene,{sky:'#DDEBFF',ground:'#3E6E8C',hemi:.62,sun:'#FFD7A8',si:1.9,pos:[-22,24,20],range:o.range||22});st.rim=new THREE.Color(1,.86,.7);st.bloom=.55;
  const sg=new THREE.PlaneGeometry(600,600,72,72);sg.rotateX(-Math.PI/2);
  st.sea=new THREE.Mesh(sg,addRim(new THREE.MeshStandardMaterial({color:col('#1F8CC4'),roughness:.08,metalness:.35,flatShading:true,emissive:col('#0A3F66'),emissiveIntensity:.3}),'0.55'));st.sea.position.y=-1.3;st.sea.receiveShadow=true;scene.add(st.sea);st.seaBase=sg.attributes.position.array.slice();
  st.clouds=[];for(let k=0;k<6;k++){const c=cloud(-80+k*30,18+(k%3)*5,-60+(k%2)*30,1.6);scene.add(c);st.clouds.push(c)}
  return st;
}
function seaTick(st,dt){
  const t=st.t,a=st.sea.geometry.attributes.position,b=st.seaBase;
  for(let i=0;i<a.count;i++){const x=b[i*3],z=b[i*3+2];a.array[i*3+1]=Math.sin(x*.12+t*1.1)*.22+Math.cos(z*.1+t*.9)*.2}
  a.needsUpdate=true;
  st.clouds.forEach(c=>{c.position.x+=dt*.8;if(c.position.x>110)c.position.x=-110});
  (st.foams||[]).forEach((f,k)=>{const s=1+Math.sin(t*1.6+k)*.025;f.scale.set(s,1,s);f.material.opacity=.32+Math.sin(t*1.6+k)*.12});
  updFx(st,dt);
}
/* An island with grass radius r, added to `parent`: beach, two-tone layered cliffs, a domed meadow,
   rocks on the rim and a foam ring on the water (pushed to `foams` so seaTick can animate it). */
function islandBase(parent,r,grass,foams){const k=r/15.5,G=grass||'#78C05A';
  const foam=new THREE.Mesh(new THREE.RingGeometry(18.4*k,20.8*k,56).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#FFFFFF',transparent:true,opacity:.4,depthWrite:false,toneMapped:false}));
  foam.position.y=-1.12;parent.add(foam);if(foams)foams.push(foam);
  parent.add(mesh(jitter(CYL(17.6*k,18.8*k,.6,40),.4*k),'#F2DDB0',0,-1.25,0,{flat:true,r:1}));
  parent.add(mesh(jitter(CYL(16.7*k,17.6*k,1.8,36),.5*k),'#A97E55',0,-2.4,0,{flat:true,r:1}));
  parent.add(mesh(jitter(CYL(15.8*k,16.7*k,1.4,36),.45*k),'#CDA77A',0,-.8,0,{flat:true,r:1}));
  parent.add(mesh(jitter(CYL(r,15.9*k,.7,36),.3*k),G,0,-.35,0,{flat:true,r:1}));
  const dome=mesh(new THREE.SphereGeometry(r*.94,36,8,0,Math.PI*2,0,Math.PI/2),shade(G,.04),0,-.05,0,{flat:true,r:1});dome.scale.y=.1;parent.add(dome);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2+Math.sin(i*7)*.3,rr=16.4*k;
    const rk=mesh(ICO((.55+((i*5)%3)*.2)*Math.max(k,.35),0),i%2?'#9F9A94':'#B7B1AA',Math.cos(a)*rr,-.45,Math.sin(a)*rr,{flat:true});rk.rotation.set(i,i*2,0);parent.add(rk)}
  return foam;
}
/* A small palm tree. */
function palm(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);let px=0,py=0;
  for(let i=0;i<6;i++){const seg=mesh(CYL(.1*s,.14*s,.62*s,7),i%2?'#9C6B3F':'#8A5C34',px,py+.31*s,0,{flat:true});seg.rotation.z=-.07*i;g.add(seg);py+=.58*s;px+=.05*i*s}
  const top=new THREE.Group();top.position.set(px,py,0);g.add(top);
  for(let k=0;k<7;k++){const pv=new THREE.Group();pv.rotation.y=k/7*Math.PI*2;const l=mesh(new THREE.ConeGeometry(.3*s,1.8*s,4),k%2?'#3E9E4A':'#52B95C',.8*s,-.25*s,0,{flat:true});
    l.rotation.z=-(Math.PI/2+.5);l.scale.z=.3;pv.add(l);top.add(pv)}
  for(let k=0;k<3;k++)top.add(mesh(SPH(.13*s,8,6),'#6B4426',Math.cos(k*2.1)*.18*s,-.18*s,Math.sin(k*2.1)*.18*s));
  g.rotation.y=(x*7+z*3)%6;return g}
/* Ribbon banner floating over an island: the title on the topic colour, a sub-line pill below. */
function bannerSprite(title,sub,color,h){
  const W=680,H=210,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  g.shadowColor='rgba(8,10,30,.45)';g.shadowBlur=16;g.shadowOffsetY=6;
  const gr=g.createLinearGradient(0,10,0,138);gr.addColorStop(0,shade(color,.14));gr.addColorStop(1,shade(color,-.14));
  g.fillStyle=gr;rr(g,14,10,W-28,124,44);g.fill();g.shadowColor='transparent';g.lineWidth=6;g.strokeStyle='#F5C24C';g.stroke();
  g.lineWidth=2;g.strokeStyle='rgba(255,255,255,.35)';rr(g,24,20,W-48,104,36);g.stroke();
  let fs=64;g.font=`700 ${fs}px ${FONT}`;while(g.measureText(title).width>W-90&&fs>30){fs-=2;g.font=`700 ${fs}px ${FONT}`}
  g.textAlign='center';g.textBaseline='middle';g.lineWidth=7;g.strokeStyle='rgba(12,19,48,.55)';g.strokeText(title,W/2,74);g.fillStyle='#FFFFFF';g.fillText(title,W/2,74);
  if(sub){g.font=`600 40px ${FONT}`;const w=g.measureText(sub).width+64;g.fillStyle='rgba(12,19,48,.94)';rr(g,(W-w)/2,136,w,62,31);g.fill();g.lineWidth=3;g.strokeStyle='#F5C24C';g.stroke();g.fillStyle='#FFD447';g.fillText(sub,W/2,168)}
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ctex(c),transparent:true,depthTest:false,toneMapped:false}));sp.scale.set(h*W/H,h,1);sp.renderOrder=10;return sp;
}
/* Each topic island has its own landmark. Locked topics show it in grey, wrapped in scaffolding.
   Returns a group; anim(t) in userData makes it move. */
function landmark(id,color,locked){
  const g=new THREE.Group(),c=locked?'#A8A2B4':color,lite=locked?'#D9D5E0':'#FFF6E3',gold=locked?'#C8C3D0':'#F7C548',movers=[];
  const M=(geo,col,x,y,z,o)=>{const m=mesh(geo,col,x,y,z,o);g.add(m);return m};
  if(id==='tricks'){   // a magic tower with + − × ÷ circling it
    M(CYL(.85,1.05,2.7,16),lite,0,1.35,0,{r:.7});M(CYL(1,1,.22,16),gold,0,2.75,0,{m:.5,r:.3});M(new THREE.ConeGeometry(1.2,1.7,16),c,0,3.7,0,{flat:true});
    M(SPH(.2,12,10),gold,0,4.7,0,{m:.6,r:.2,e:locked?undefined:'#FFB000',ei:.6});M(rbox(.6,1,.12,.05),'#4A3020',0,.55,1);
    for(const a of[.6,2.2,3.8,5.4])M(rbox(.3,.45,.1,.04),locked?'#C9C6D2':'#BFE6FF',Math.sin(a)*.95,1.9,Math.cos(a)*.95).rotation.y=a;
    if(!locked){const sy=['➕','➖','✖️','➗'].map(e=>{const sp=emojiSprite(e,.8);g.add(sp);return sp});
      movers.push(t=>sy.forEach((sp,k)=>{const a=t*.9+k*Math.PI/2;sp.position.set(Math.cos(a)*1.9,2.4+Math.sin(t*2+k)*.25,Math.sin(a)*1.9)}))}
  }else if(id==='patterns'){   // a spiral of blocks that repeat a colour pattern
    M(CYL(.32,.42,3.8,10),lite,0,1.9,0,{r:.6});
    for(let i=0;i<12;i++){const a=i*.62,b=M(rbox(.62,.42,.62,.08),[c,lite,gold][i%3],Math.cos(a)*1.15,.3+i*.29,Math.sin(a)*1.15,{r:.5});b.rotation.y=-a}
    const top=M(SPH(.42,16,12),gold,0,4.05,0,{m:.6,r:.25,e:locked?undefined:'#FFB000',ei:.4});movers.push(t=>{top.position.y=4.05+Math.sin(t*2)*.12});
  }else if(id==='fractions'){   // a giant pie with one slice lifted out
    M(CYL(1.25,1.45,.8,20),'#B9AE9E',0,.4,0,{flat:true});
    const n=8;let lifted=null;
    for(let i=0;i<n;i++){const geo=new THREE.CylinderGeometry(1.7,1.7,.6,24,1,false,i/n*Math.PI*2,Math.PI*2/n*.94);const m=M(geo,i%2?c:lite,0,1.1,0,{r:.6});
      if(i===1){const a=(i+.5)/n*Math.PI*2;m.userData.dir=[Math.sin(a),Math.cos(a)];lifted=m}}
    M(new THREE.TorusGeometry(1.7,.09,8,40),gold,0,1.4,0,{r:.4}).rotation.x=Math.PI/2;
    movers.push(t=>{const u=.5+Math.sin(t*1.6)*.5;lifted.position.set(lifted.userData.dir[0]*(.35+u*.25),1.1+.45+u*.35,lifted.userData.dir[1]*(.35+u*.25))});
  }else if(id==='compare'){   // a balance scale
    M(CYL(.95,1.15,.3,16),c,0,.15,0,{r:.6});M(CYL(.15,.2,3,10),gold,0,1.65,0,{m:.6,r:.3});M(SPH(.22,12,10),gold,0,3.2,0,{m:.6,r:.3});
    const beam=new THREE.Group();beam.position.y=3.05;g.add(beam);beam.add(mesh(rbox(3.6,.16,.16,.06),gold,0,0,0,{m:.6,r:.3}));
    const pans=[-1.7,1.7].map((x,k)=>{const pg=new THREE.Group();pg.position.x=x;beam.add(pg);
      for(const dx of[-.35,.35])pg.add(mesh(CYL(.02,.02,1,4),'#555',dx,-.5,0));
      pg.add(mesh(CYL(.6,.42,.14,18),lite,0,-1.05,0,{r:.5}));
      if(k===0){for(const [a,b] of[[-.2,0],[.2,0],[0,.3]])pg.add(mesh(rbox(.3,.3,.3,.05),c,a,-.82+b,0))}else pg.add(mesh(SPH(.32,14,12),c,0,-.72,0,{r:.4}));
      return pg});
    movers.push(t=>{const r=Math.sin(t*1.2)*.16;beam.rotation.z=r;pans.forEach(pg=>pg.rotation.z=-r)});
  }else if(id==='models'){   // bar-model blocks: bars cut into equal units
    M(rbox(.18,2.6,.18,.05),'#8B5A2B',-1.85,1.3,0);M(rbox(3.9,.18,1,.06),'#8B5A2B',0,.09,0);
    [[4,c,.55],[3,lite,1.25],[5,gold,1.95]].forEach(([n,col,y])=>{for(let i=0;i<n;i++)M(rbox(.68,.5,.8,.08),col,-1.4+i*.72,y,0,{r:.5})});
    const bar=g.children[g.children.length-1];movers.push(t=>{bar.position.y=1.95+Math.abs(Math.sin(t*2))*.25});
  }else if(id==='age'){   // a clock tower
    M(rbox(1.7,3.3,1.7,.12),lite,0,1.65,0,{r:.8});M(rbox(1.95,.25,1.95,.06),gold,0,3.35,0,{m:.4,r:.4});
    const roof=M(new THREE.ConeGeometry(1.45,1.5,4),c,0,4.2,0,{flat:true});roof.rotation.y=Math.PI/4;
    const face=M(CYL(.6,.6,.08,28),'#FFFFFF',0,2.45,.88,{r:.4});face.rotation.x=Math.PI/2;
    const rim=M(new THREE.TorusGeometry(.6,.06,8,30),gold,0,2.45,.9,{m:.5,r:.3});
    const hands=[[.42,.05],[.3,.07]].map(([l,w])=>{const pv=new THREE.Group();pv.position.set(0,2.45,.95);g.add(pv);pv.add(mesh(BOX(w,l,.03),'#2E1A5C',0,l/2,0));return pv});
    M(rbox(.6,1,.12,.05),'#4A3020',0,.55,.88);
    movers.push(t=>{hands[0].rotation.z=-t*1.2;hands[1].rotation.z=-t*.1});
  }
  if(locked){   // scaffolding around a landmark still being built
    for(const [x,z] of[[-1.6,-1.6],[1.6,-1.6],[-1.6,1.6],[1.6,1.6]])M(CYL(.06,.06,4.4,6),'#9AA3AD',x,2.2,z,{m:.6,r:.4});
    for(const y of[1.4,2.9])for(const z of[-1.6,1.6])M(rbox(3.4,.1,.35,.03),'#C68B4E',0,y,z);
  }
  g.userData.anim=t=>movers.forEach(f=>f(t));
  return g;
}
/* Camera distance that fits a w×d area on this screen. */
function fitDist(cam,w,d){const tv=Math.tan(20*Math.PI/180),a=cam.aspect||1.5;return Math.max(w/2/(tv*a),d/2/tv)/1.23}
function orbit(st,dt,target,D){st.camT.lerp(target,Math.min(1,dt*2.5));
  st.camera.position.set(st.camT.x+Math.sin(st.yaw)*D,st.camT.y+D*.72,st.camT.z+Math.cos(st.yaw)*D);st.camera.lookAt(st.camT)}

/* ===================== ISLAND PICKER (one island per topic) ===================== */
function topicStars(p,T){return T.levels.reduce((a,l)=>a+((p.lv[l.id]||{}).stars||0),0)}
function buildSea(S){
  if(!engine())return null;
  const p=cur(),tall=innerWidth/innerHeight<.8,cols=tall?2:3,n=S.topics.length,rows=Math.ceil(n/cols),gapX=tall?15:16,gapZ=tall?18:16;
  SEA=seaStage({update:seaUpdate,onTap:seaTap,hover:seaHover,unhover:()=>{SEA.hot=null;SEA.selMark.visible=false},range:40,sid:S.id,islands:[],foams:[],zmax:1.6,hot:null,yaw:0});
  const front=(rows-1)/2*gapZ+9,W=(cols-1)*gapX+14,Dp=(rows-1)*gapZ+14+9;   // islands in a grid, the boat in front
  SEA.fit=()=>fitDist(SEA.camera,W,Dp)*1.05;SEA.mid=new THREE.Vector3(0,0,4.5);
  S.topics.forEach((T,i)=>{
    const r=Math.floor(i/cols),c=i%cols,inRow=Math.min(cols,n-r*cols),x=(c-(inRow-1)/2)*gapX,z=(r-(rows-1)/2)*gapZ;
    const g=new THREE.Group();g.position.set(x,0,z);SEA.scene.add(g);
    islandBase(g,5.2,T.open?'#6FBF55':'#8FAE7C',SEA.foams);
    const lm=landmark(T.id,T.color,!T.open);lm.position.set(.5,0,-1);lm.scale.setScalar(1.4);g.add(lm);
    const pt=[[-3.5,-1.4],[3.6,1.2],[-2.6,2.9]];pt.forEach(([a,b],k)=>g.add(T.open?(k===2?roundTree(a,b,.55):palm(a,b,.8)):pine(a,b,.6)));
    if(T.open)for(let f=0;f<14;f++){const a=f*2.4,rr=2.2+(f%4)*.7;g.add(mesh(SPH(.09,6,5),['#FF7AA8','#FFD43B','#FFFFFF','#B98CFF'][f%4],Math.cos(a)*rr,.12,Math.sin(a)*rr+.8))}
    else{const cl=cloud(2.2,5.6,-1.6,.5);g.add(cl)}
    const keeper=iconSprite(npcKey(T.npc),T.npc.e,1.7);keeper.position.set(-1.9,1,1.6);g.add(keeper);
    const ban=bannerSprite(`${i+1}. ${T.name}`,T.open?`★ ${topicStars(p,T)} / ${playable(T).length*3}`:'🚧 Coming soon',T.open?T.color:'#6B6F86',2.3);ban.position.y=8.4;g.add(ban);
    g.userData.act={kind:'topic',id:T.id};SEA.hits.push(g);
    SEA.islands.push({g,lm,keeper,T,x,z});
  });
  const boat=new THREE.Group();boat.position.set(0,-1.15,front);SEA.scene.add(boat);SEA.boat=boat;   // the teacher and the player wait in a little boat
  const hull=mesh(new THREE.SphereGeometry(2.3,28,12,0,Math.PI*2,Math.PI/2,Math.PI/2),'#8B5A2B',0,.95,0,{r:.7});hull.scale.set(1,.5,.6);boat.add(hull);
  const deck=mesh(CYL(2.2,2.2,.14,28),'#C68B4E',0,.95,0,{r:.8});deck.scale.z=.58;boat.add(deck);
  const trim=mesh(new THREE.TorusGeometry(2.25,.08,8,40),'#F7C548',0,1.02,0,{m:.5,r:.3});trim.rotation.x=Math.PI/2;trim.scale.set(1,.58,1);boat.add(trim);
  boat.add(mesh(CYL(.07,.09,3.4,8),'#6B4426',1.1,2.6,-.2));
  const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(0,2.6);sh.lineTo(-1.9,0);sh.lineTo(0,0);
  const sail=new THREE.Mesh(new THREE.ShapeGeometry(sh),new THREE.MeshStandardMaterial({color:col('#FFFDF5'),side:THREE.DoubleSide,roughness:.8}));sail.position.set(1.05,1.25,-.2);sail.castShadow=true;boat.add(sail);
  const pen=mesh(BOX(.7,.4,.03),S.color,1.45,4.1,-.2,{r:.6});boat.add(pen);SEA.pennant=pen;
  SEA.host=iconSprite(npcKey(S.npc),S.npc.e,1.7);SEA.host.position.set(-.9,1.85,.2);boat.add(SEA.host);
  SEA.hero=buildHero(farmOf(p),false);SEA.hero.position.set(.1,1.02,.3);SEA.hero.rotation.y=Math.PI;SEA.hero.scale.setScalar(.85);boat.add(SEA.hero);
  SEA.selMark=makeMark(7.4,{opacity:.85});SEA.scene.add(SEA.selMark);
  SEA.camT.copy(SEA.mid);
  return SEA;
}
function seaUpdate(dt){
  seaTick(SEA,dt);const t=SEA.t;
  SEA.islands.forEach((I,k)=>{I.lm.userData.anim(t);I.keeper.position.y=1+Math.abs(Math.sin(t*2+k))*.12;
    const up=I===SEA.hot?.45:0;I.g.position.y+=(up+Math.sin(t*1.1+k)*.06-I.g.position.y)*Math.min(1,dt*6)});
  animMark(SEA.selMark,t);
  SEA.boat.position.y=-1.15+Math.sin(t*1.5)*.08;SEA.boat.rotation.z=Math.sin(t*1.2)*.035;SEA.pennant.rotation.y=Math.sin(t*3)*.4;
  SEA.host.position.y=1.85+Math.abs(Math.sin(t*2))*.1;animHero(SEA.hero,'idle',t,dt);
  orbit(SEA,dt,SEA.mid,SEA.fit()*SEA.zm);
}
function seaPick(e){const a=actOf(rayFrom(e,SEA.camera).intersectObjects(SEA.hits,true));return a&&a.kind==='topic'?a.id:null}
function seaTap(e){const id=seaPick(e);if(id)ACT.openTopic({id})}
function seaHover(e){const id=seaPick(e),I=SEA.islands.find(I=>I.T.id===id)||null;SEA.hot=I;
  if(I)placeMark(SEA.selMark,I.x,-1.25,I.z);else SEA.selMark.visible=false;
  return I?{cursor:I.T.open?'select':'locked',label:I.T.open?`${I.T.name} · ${playable(I.T).length} levels`:`${I.T.name} · coming soon`}:{cursor:'move'}}
function rSchool(){
  const p=cur(),S=schoolView(UI.sid||SCHOOL_ID);
  if(!S.open){document.body.classList.remove('fullworld');$('#app').innerHTML=topBar(S.sign,'toTown')+npcHTML(S.npc,`The ${gradeName(gradeOf(p))} islands of ${S.name} are still being built. Come back soon!`)+'<div class="btns"><button class="b" data-act="toTown">Back to the farm</button></div>';return}
  const list=S.topics.map((T,i)=>`<button class="lvchip ${T.open?(topicStars(p,T)?'done':'open'):'locked'}" data-act="openTopic" data-id="${T.id}"><b>${T.open?i+1:'🚧'}</b><span>${T.name}</span><small>${T.open?`★ ${topicStars(p,T)}/${playable(T).length*3}`:'Soon'}</small></button>`).join('');
  $('#app').innerHTML=topBar(S.sign,'toTown')+`<div class="world mapworld" id="world"><div class="wtop"><div class="flv">${ico(npcKey(S.npc),S.npc.e)} Pick an island to explore</div>${camCtl()}</div><div class="toast" id="toast" aria-live="polite"></div></div>
  <div class="dock"><div class="lvlist">${list}</div><div class="btns"><button class="b ghost sm" data-act="schoolTalk">${ico(npcKey(S.npc),S.npc.e)} Hear the welcome again</button></div></div>`;
  buildSea(S);   // rebuilt on every visit so the star counts are fresh
  if(!SEA||!mountStage(SEA,$('#world')))$('#world').insertAdjacentHTML('afterbegin','<div class="nogl">Pick an island from the list below.</div>');
  if(!p.seen['school:'+S.id]){p.seen['school:'+S.id]=1;save();dialog(S.npc,S.intro)}
}

/* ===================== LEVEL ISLAND (one per topic, up to MAX_LEVELS stones) ===================== */
/* Stones zig-zag in rows of three from the front of the island to the back; a boss level sits by the castle. */
function platLayout(levels){
  const boss=!!(levels.length&&levels[levels.length-1].boss),m=levels.length-(boss?1:0),rows=Math.max(1,Math.ceil(m/3)),out=[];
  const slots={1:[0],2:[-2.8,2.8],3:[-5.6,0,5.6]};
  for(let i=0;i<m;i++){const row=Math.floor(i/3),k=i%3,inRow=Math.min(3,m-row*3),xs=slots[inRow],x=xs[row%2?inRow-1-k:k];
    const z=rows===1?3:9-row*((boss?14:18)/(rows-1));out.push([x,z,.35+i*.22])}
  if(boss)out.push([0,-10.2,.35+m*.22+.3]);
  return{plats:out,boss};
}
function buildMap(D){
  if(!engine())return null;
  const L=platLayout(D.levels),PL=L.plats;
  MAP=seaStage({update:mapUpdate,onTap:mapTap,hover:mapHover,did:D.id,plats:[],jump:null,heroAt:0,hot:-1,zmax:innerWidth/innerHeight<.8?2.6:1.9});
  const scene=MAP.scene;
  MAP.foams=[];islandBase(scene,15.5,null,MAP.foams);
  MAP.selMark=makeMark(1);scene.add(MAP.selMark);MAP.unhover=()=>{MAP.hot=-1;MAP.selMark.visible=false};
  PL.forEach(([x,z,h],i)=>{
    const boss=L.boss&&i===PL.length-1,R=boss?1.9:1.4,g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
    g.add(mesh(jitter(CYL(R*.92,R*1.05,h+.6,12,2),.08),'#B9AE9E',0,(h-.6)/2,0,{flat:true}));
    const top=mesh(CYL(R,R,.3,32),D.color,0,h,0,{r:.45});g.add(top);
    const rim=mesh(new THREE.TorusGeometry(R,.09,8,40),'#FFFFFF',0,h+.15,0,{r:.3});rim.rotation.x=Math.PI/2;g.add(rim);
    const glow=new THREE.Mesh(new THREE.RingGeometry(R*1.05,R*1.5,40),new THREE.MeshBasicMaterial({color:'#B99CFF',transparent:true,opacity:.0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));glow.rotation.x=-Math.PI/2;glow.position.y=h+.17;g.add(glow);
    const lock=emojiSprite('🔒',.9);lock.position.y=h+.9;g.add(lock);
    g.userData.act={kind:'plat',i};MAP.hits.push(g);
    MAP.plats.push({g,top,glow,lock,h,R,x,z,boss,labels:[]});
    if(i<PL.length-1){const [nx,nz,nh]=PL[i+1],n=Math.max(2,Math.round(Math.hypot(nx-x,nz-z)/2.4)-1);
      for(let s=1;s<=n;s++){const t=s/(n+1),sx=x+(nx-x)*t,sz=z+(nz-z)*t,sh=h+(nh-h)*t-.15;scene.add(mesh(jitter(CYL(.45,.55,sh+.6,8,1),.06),'#C8BDAE',sx,(sh-.6)/2,sz,{flat:true}))}}
  });
  if(L.boss){   // boss castle behind the last stone
    const cs=new THREE.Group();cs.position.set(0,0,-13.4);scene.add(cs);
    cs.add(mesh(rbox(5,3.2,1.4,.12),'#8E7AB8',0,3.4,0,{r:.8}));
    for(const x of[-2.6,2.6]){cs.add(mesh(CYL(.8,.9,5.4,12),'#7A65A8',x,3,0,{r:.8}));cs.add(mesh(new THREE.ConeGeometry(1.05,1.6,12),'#4B2E83',x,6.5,0,{flat:true}));cs.add(mesh(BOX(.04,.9,.04),'#888',x,7.7,0));cs.add(mesh(BOX(.5,.3,.03),'#FFD43B',x+.27,7.95,0))}
    cs.add(mesh(rbox(1.6,2.2,.4,.2),'#2E1A5C',0,3,.6));
    MAP.crown=emojiSprite('👑',1.6);MAP.crown.position.set(0,5.8,0);cs.add(MAP.crown);
  }
  const arch=signPlane(D.name,D.color,4.2);arch.position.set(-5.5,2.9,12.6);scene.add(arch);
  for(const x of[-7.6,-3.4])scene.add(mesh(CYL(.12,.14,3,8),'#8B5A2B',x,1.4,12.6));
  MAP.keeper=iconSprite(npcKey(D.npc),D.npc.e,1.6);MAP.keeper.position.set(-9.6,.9,10.2);scene.add(MAP.keeper);scene.add(mesh(CYL(.6,.7,.3,14),'#8B5A2B',-9.6,0,10.2));
  const ok=(x,z)=>Math.hypot(x,z)<14.2&&PL.every(([px,pz])=>Math.hypot(x-px,z-pz)>2.6)&&(!L.boss||Math.hypot(x,z+13.4)>4)&&Math.hypot(x+5.5,z-12.6)>2.6&&Math.hypot(x+9.6,z-10.2)>1.4;
  for(let k=0;k<26;k++){const a=k/26*Math.PI*2+Math.sin(k*3)*.1,r=11.8+((k*7)%3)*.9,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!ok(x,z))continue;scene.add(k%3?roundTree(x,z,.95+((k*5)%4)*.1):pine(x,z,1.05))}
  scatter(scene,new THREE.ConeGeometry(.07,.4,3).translate(0,.2,0),['#5DA544','#6DB650','#7CC35A'],1400,()=>{const x=(Math.random()-.5)*30,z=(Math.random()-.5)*30;return ok(x,z)?{x,z}:null},.8,1.4,false);
  scatter(scene,SPH(.1,6,5).translate(0,.28,0),['#FF7AA8','#FFD43B','#FFFFFF','#B98CFF'],220,()=>{const x=(Math.random()-.5)*30,z=(Math.random()-.5)*30;return ok(x,z)?{x,z}:null},.8,1.3,false,{flatShading:false});
  scatter(scene,ICO(.5,0).translate(0,.2,0),['#A7A3A0','#8F8C88'],26,()=>{const a=Math.random()*6.28,r=15+Math.random()*3;return{x:Math.cos(a)*r,z:Math.sin(a)*r,y:-1.2}},.8,1.6,true);
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
    P.open=open;P.top.material=mat(!open?'#8E8A98':st?(boss?'#FF6B9A':'#FFC93C'):(boss?'#E5484D':D.color),{r:.4,e:open&&!st?D.color:undefined,ei:.25});
    P.lock.visible=!open;
    P.labels.forEach(s=>{P.g.remove(s);s.material.map.dispose();s.material.dispose()});P.labels=[];
    P.soon=!!l.soon;P.lock.material.map=emojiTex(l.soon?'🚧':'🔒');
    const nm=labelSprite(l.soon?`${i+1}  Coming soon`:`${boss?'👑 ':''}${i+1}  ${l.name}`,{h:.72});nm.position.y=P.h+(boss?4.4:3.6);P.g.add(nm);P.labels.push(nm);
    if(open){const ss=labelSprite('★'.repeat(st)+'☆'.repeat(3-st),{h:.55,fg:'#FFD447'});ss.position.y=P.h+(boss?3.85:3.05);P.g.add(ss);P.labels.push(ss)}
    if(open&&!st&&next<0)next=i;
  });
  MAP.next=next;
  const at=UI.mapAt!=null&&UI.mapAt<MAP.plats.length?UI.mapAt:Math.max(0,next<0?MAP.plats.length-1:next);
  MAP.heroAt=at;const P=MAP.plats[at];MAP.hero.position.set(P.x,P.h+.15,P.z);MAP.hero.rotation.y=Math.PI*.15;MAP.jump=null;
  MAP.camT.set(P.x*.5,P.h,P.z*.5);
}
function platAt(e){const a=actOf(rayFrom(e,MAP.camera).intersectObjects(MAP.hits,true));return a&&a.kind==='plat'?a.i:-1}
function mapTap(e){if(MAP.jump)return;const i=platAt(e);if(i>=0)mapGo(i)}
function mapHover(e){const i=platAt(e);MAP.hot=i;if(i<0){MAP.selMark.visible=false;return{cursor:'move'}}
  const l=dun(MAP.did).levels[i],P=MAP.plats[i];placeMark(MAP.selMark,P.x,P.h+.1,P.z,P.R*1.3);return{cursor:P.open?'select':'locked',label:l.soon?`${i+1}. Coming soon 🚧`:`${i+1}. ${l.name}${P.open?'':' 🔒'}`}}
function mapGo(i){
  const P=MAP.plats[i];if(!P)return;
  if(P.soon){toast(`Level ${i+1} is coming soon!`);return}
  if(!P.open){toast(`Clear level ${i} first to open this one!`);return}
  if(MAP.jump)return;
  const path=[];if(i>MAP.heroAt)for(let k=MAP.heroAt+1;k<=i;k++)path.push(k);else if(i<MAP.heroAt)for(let k=MAP.heroAt-1;k>=i;k--)path.push(k);
  const done=()=>{UI.mapAt=i;startLevel(i)};
  if(!path.length){done();return}
  MAP.jump={path,k:0,t:0,from:MAP.hero.position.clone(),done};
}
function mapUpdate(dt){
  seaTick(MAP,dt);const t=MAP.t,h=MAP.hero;
  if(MAP.jump){const J=MAP.jump,P=MAP.plats[J.path[J.k]];J.t+=dt/.42;const to=new THREE.Vector3(P.x,P.h+.15,P.z),u=Math.min(1,J.t);
    h.position.lerpVectors(J.from,to,u);h.position.y+=Math.sin(u*Math.PI)*1.4;h.rotation.y=Math.atan2(to.x-J.from.x,to.z-J.from.z);
    animHero(h,'walk',t,dt);
    if(u>=1){MAP.heroAt=J.path[J.k];J.k++;J.t=0;J.from=to.clone();if(J.k>=J.path.length){MAP.jump=null;h.rotation.y=Math.PI*.15;J.done()}}
  }else animHero(h,'idle',t,dt);
  MAP.plats.forEach((P,i)=>{P.glow.material.opacity=P.open&&(i===MAP.next||i===MAP.hot)?.45+Math.sin(t*4)*.25:P.open?.12:0});
  const N=MAP.plats[MAP.next>=0?MAP.next:-1];
  if(N){MAP.arrow.visible=true;MAP.arrow.position.set(N.x,N.h+(N.boss?5.3:4.4)+Math.sin(t*4)*.2,N.z)}else MAP.arrow.visible=false;
  if(MAP.crown)MAP.crown.position.y=5.8+Math.sin(t*2)*.2;
  MAP.keeper.position.y=.95+Math.abs(Math.sin(t*2))*.1;
  animSparkles(MAP.spark,t);animMark(MAP.selMark,t);
  orbit(MAP,dt,new THREE.Vector3(h.position.x*.55,h.position.y*.6+.6,h.position.z*.55),(MAP.camera.aspect<.8?33:28)*MAP.zm);
}
function rDungeon(){
  const p=cur(),D=dun(UI.did);
  if(!D.open){document.body.classList.remove('fullworld');$('#app').innerHTML=topBar(D.sign,'toSchool')+npcHTML(D.npc,`The ${gradeName(D.grade)} levels of ${D.name} are still being built. Come back soon!`)+'<div class="btns"><button class="b" data-act="toSchool">Back to the islands</button></div>';return}
  const list=D.levels.map((l,i)=>{const r=p.lv[l.id]||{},open=unlocked(p,D,i),st=r.stars||0;return l.soon?`<button class="lvchip locked soon" data-act="mapGo" data-i="${i}" aria-disabled="true"><b>🚧</b><span>${i+1}. Coming soon</span></button>`:`<button class="lvchip ${st?'done':open?'open':'locked'}" data-act="mapGo" data-i="${i}" ${open?'':'aria-disabled="true"'}><b>${open?(l.boss?'👑':i+1):'🔒'}</b><span>${l.name}</span><small>${'★'.repeat(st)}${'☆'.repeat(3-st)}</small></button>`}).join('');
  $('#app').innerHTML=topBar(D.sign,'toSchool')+`<div class="world mapworld" id="world"><div class="wtop"><div class="flv">${ico(npcKey(D.npc),D.npc.e)} Tap a glowing stone to battle</div>${camCtl()}</div><div class="toast" id="toast" aria-live="polite"></div></div>
  <div class="dock"><div class="lvlist">${list}</div><div class="btns"><button class="b ghost sm" data-act="keeperTalk">${ico(npcKey(D.npc),D.npc.e)} Hear the welcome again</button></div></div>`;
  if(!MAP||MAP.did!==D.id)buildMap(D);
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
  if(q.type==='hats'&&!q.hatsInfo){const H=q.hats;q.hatsInfo=i=>H[i]}   // generator's {R,d} list; q.hats becomes the tapped list
  q.sel=[];q.pairs=[];q.boxes=[];q.hats=[];
  if(q.type==='dist'){q.in=[];q.picked=false}
  UI.phase=q.type==='input'?'answer':'work';
  UI.bubble={kind:'',html:q.say||'Type your answer.'};
  PAD=null;
}
function hudHTML(){const l=dun(UI.did).levels[UI.li];
  return `<button class="bx" data-act="quitLevel" aria-label="Leave level">✕</button><div class="bmid"><div class="bname">${l.boss?'👑 ':''}${l.name}</div><div class="bprog">${UI.qs.map((_,k)=>`<i class="${k<UI.idx||(UI.screen==='result'&&UI.ok)?'ok':k===UI.idx?'on':''}"></i>`).join('')}</div></div><div class="bhearts" aria-label="${UI.hearts} hearts left">${'❤️'.repeat(Math.max(0,UI.hearts))}${'🖤'.repeat(3-Math.max(0,UI.hearts))}</div>`}
function rLevel(){
  if(UI.qs[UI.idx]&&UI.qs[UI.idx].type==='dist'){rFactory();return}
  ensureBattle();$('#battle').classList.remove('result','lose');
  const D=dun(UI.did),l=D.levels[UI.li],q=UI.qs[UI.idx];
  $('#bhud').innerHTML=hudHTML();
  $('#qcard').innerHTML=`<div class="qlabel">${l.boss?`Boss HP ${UI.qs.length-UI.idx} / ${UI.qs.length}`:`Monster ${UI.idx+1} of ${UI.qs.length}`}</div><div class="qexpr">${q.html}</div>`;
  let work='';
  if(q.type==='pair')work=pairHTML(q);
  if(q.type==='zerobox')work=zeroHTML(q);
  if(q.type==='friends')work=friendsHTML(q);
  if(q.type==='hats')work=hatsHTML(q);
  if(q.type==='dist')work=distHTML(q);
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
/* ---------- Best Friend Pairs: tap two terms that join into a round number ---------- */
function friendsHTML(q){
  const used=new Set(q.pairs.flat()),t=q.terms;
  const chips=t.map((x,i)=>used.has(i)?'':`<button class="chip ${x.s==='+'?'plus':'minus'} ${q.sel.includes(i)?'sel':''}" data-act="friendTap" data-i="${i}" ${UI.phase!=='work'?'disabled':''}>${q.plain?'':`<span class="s">${sg(x.s)}</span>`}<span class="n">${x.n}</span></button>`).join('');
  const joined=q.pairs.map(([a,b],k)=>{const v=val(t[a])+val(t[b]);return `<span class="coinwrap"><span class="coin wide ${v<0?'neg':''} ${k===q.pairs.length-1&&q.justMade?'pop':''}">${q.plain?'':v<0?MINUS:'+'}${Math.abs(v)}</span><small>${q.plain?`${t[a].n} + ${t[b].n}`:`${sg(t[a].s)}${t[a].n} ${sg(t[b].s)} ${t[b].n}`}</small></span>`}).join('');
  q.justMade=false;
  return `${chips?`<div class="row">${chips}</div>`:''}${joined?`<div class="row friends">${joined}</div>`:''}`;
}
/* Can the terms not yet used all still be paired into round numbers? (keeps a child from getting stuck) */
function friendsCanFinish(q,used){
  const free=q.terms.map((_,i)=>i).filter(i=>!used.has(i));if(!free.length)return true;
  const a=free[0];for(const b of free.slice(1))if((val(q.terms[a])+val(q.terms[b]))%q.unit===0){const u=new Set(used);u.add(a);u.add(b);if(friendsCanFinish(q,u))return true}
  return false;
}
function friendTap(i){
  const q=UI.qs[UI.idx],t=q.terms;if(UI.phase!=='work')return;
  q.sel=q.sel.includes(i)?q.sel.filter(x=>x!==i):[...q.sel,i];
  if(q.sel.length===2){
    const [a,b]=q.sel,v=val(t[a])+val(t[b]),txt=q.plain?`${t[a].n} + ${t[b].n}`:`${sg(t[a].s)}${t[a].n} ${sg(t[b].s)} ${t[b].n}`;q.sel=[];
    if(v%q.unit!==0)UI.bubble={kind:'bad',html:q.unit===10?`${txt} = ${v}. Not a round ten! Look at the ones: they should make 10.`:`${txt} = ${v}. Not round! Best friends make 100, 200, 1000… Look at the last two digits.`};
    else{const used=new Set(q.pairs.flat());used.add(a);used.add(b);
      if(!friendsCanFinish(q,used))UI.bubble={kind:'bad',html:`${txt} is round, but then someone is left with no friend. Try another pair!`};
      else{q.pairs.push([a,b]);q.justMade=true;bat(batSparkle);const r=`${txt} = <b>${q.plain?'':v<0?MINUS:'+'}${Math.abs(v)}</b>`;
        if(used.size<t.length)UI.bubble={kind:'good',html:`Best friends! ${r}. Find the next pair.`};
        else{UI.phase='answer';UI.bubble={kind:'good',html:`Best friends! ${r}. Now add up the round numbers and attack ⚡`}}}}
  }
  rLevel();
}
/* ---------- Hat and Cloak: tap each number to put on a hat (round it up); the cloak keeps what was added ---------- */
function hatsHTML(q){
  const chips=q.nums.map((n,i)=>{const on=q.hats.includes(i),h=q.hatsInfo(i);
    return `<button class="chip hatchip ${on?'on':''}" data-act="hatTap" data-i="${i}" ${on||UI.phase!=='work'?'disabled':''}>${on?`<span class="hat" aria-hidden="true">🎩</span><span class="n">${h.R}</span><span class="cloak">${MINUS}${h.d}</span>`:`<span class="n">${n}</span>`}</button>`}).join('<span class="plusjoin">+</span>');
  let sum='';
  if(q.hats.length===q.nums.length){const H=q.nums.map((_,i)=>q.hatsInfo(i));
    sum=`<div class="livesum">🎩 ${H.map(h=>h.R).join(' + ')} = <b>${H.reduce((a,h)=>a+h.R,0)}</b><br>🧥 ${H.map(h=>h.d).join(' + ')} = <b>${H.reduce((a,h)=>a+h.d,0)}</b></div>`}
  return `<div class="row hats">${chips}</div>${sum}`;
}
/* ---------- Distributive Property: drag A×B and A×C into the factory, pull out A, merge B and C ---------- */
function distTerm(t){return `<b>${t.a}</b><span>×</span><b>${t.n}</b>`}
function distHTML(q){
  const made=UI.phase==='answer'||UI.phase==='right';
  const tray=q.terms.map((t,i)=>q.in.includes(i)?'':`<div class="term out" data-i="${i}" role="button" aria-label="${t.a} times ${t.n}">${distTerm(t)}</div>`).join('');
  let body;
  if(made)body=`<div class="made pop">${q.a} × (${q.terms[0].n} + ${q.terms[1].n})</div>`;
  else if(!q.in.length)body='<p class="factory-hint">Drag both sums here</p>';
  else if(q.in.length<2)body=q.terms.filter((_,i)=>q.in.includes(i)).map(t=>`<div class="term in">${distTerm(t)}</div>`).join('')+'<p class="factory-hint">One more</p>';
  else if(!q.picked)body=q.terms.map((t,i)=>`<span class="term in"><button class="nbtn" data-act="distPick" data-i="${i}" data-part="a">${t.a}</button><span>×</span><button class="nbtn" data-act="distPick" data-i="${i}" data-part="n">${t.n}</button></span>`).join('<span class="plusjoin">+</span>');
  else body=`<span class="factor">${q.a}</span><span class="times">×</span><span class="paren">(</span>${q.terms.map((t,i)=>`<button class="chip ${q.sel.includes(i)?'sel':''}" data-act="distMerge" data-i="${i}">${t.n}</button>`).join('<span class="plusjoin">+</span>')}<span class="paren">)</span>`;
  return `<div class="dist"><div class="dist-tray">${tray}</div><div class="factory ${q.in.length?'hot':''} ${made?'done':''}" id="factory"><div class="factory-roof">🏭 Factory</div><div class="factory-body">${body}</div></div></div>`;
}
function distOver(f,ev){if(!f)return false;const r=f.getBoundingClientRect();return ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom}
function distDrop(i){
  const q=UI.qs[UI.idx];if(UI.phase!=='work'||!q||q.type!=='dist'||q.in.includes(i))return;
  q.in.push(i);bat(batSparkle);
  UI.bubble=q.in.length<2?{kind:'good',html:'In the factory! Drag the other sum in too.'}:{kind:'good',html:'Both sums are in. Tap the number that is in <b>both</b>. That number is A.'};
  rLevel();
}
function distPick(d){
  const q=UI.qs[UI.idx];if(UI.phase!=='work'||q.in.length<2||q.picked)return;
  const t=q.terms[+d.i],n=d.part==='a'?t.a:t.n;
  if(d.part==='a'){q.picked=true;bat(batSparkle);UI.bubble={kind:'good',html:`<b>${q.a}</b> is in both sums, so it comes out in front. Now tap <b>${q.terms[0].n}</b> and <b>${q.terms[1].n}</b> to merge them.`}}
  else UI.bubble={kind:'bad',html:`${n} is only in one sum. Look for the number you see twice.`};
  rLevel();
}
function distMerge(i){
  const q=UI.qs[UI.idx];if(UI.phase!=='work'||!q.picked)return;
  q.sel=q.sel.includes(i)?q.sel.filter(x=>x!==i):[...q.sel,i];
  if(q.sel.length===2){UI.phase='answer';bat(batSparkle);UI.bubble={kind:'good',html:`The factory made <b>${q.a} × (${q.terms[0].n} + ${q.terms[1].n})</b>. Work that out, then press ✓`}}
  else UI.bubble={kind:'',html:`${q.terms[i].n} is in. Tap the other number to merge.`};
  rLevel();
}
document.addEventListener('pointerdown',e=>{
  const el=e.target.closest('.term.out');if(!el||!el.closest('.dist')||UI.screen!=='level'||UI.phase!=='work')return;
  const q=UI.qs&&UI.qs[UI.idx];if(!q||q.type!=='dist')return;
  const i=+el.dataset.i,x0=e.clientX,y0=e.clientY,ghost=el.cloneNode(true);
  ghost.classList.add('ghosting');document.body.appendChild(ghost);
  const place=ev=>{ghost.style.left=ev.clientX+'px';ghost.style.top=ev.clientY+'px';const f=$('#factory');if(f)f.classList.toggle('over',distOver(f,ev))};
  const end=ev=>{ghost.remove();const f=$('#factory');if(f)f.classList.remove('over');el.removeEventListener('pointermove',place);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);if(distOver(f,ev)||Math.hypot(ev.clientX-x0,ev.clientY-y0)<12)distDrop(i)};
  place(e);try{el.setPointerCapture(e.pointerId)}catch(err){}
  el.addEventListener('pointermove',place);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
});
function hatTap(i){
  const q=UI.qs[UI.idx];if(UI.phase!=='work'||q.hats.includes(i))return;
  q.hats.push(i);bat(batSparkle);const h=q.hatsInfo(i);
  if(q.hats.length<q.nums.length)UI.bubble={kind:'good',html:`${q.nums[i]} puts on a hat and grows to <b>${h.R}</b>. Its cloak remembers ${MINUS}${h.d}.`};
  else{UI.phase='answer';UI.bubble={kind:'good',html:'Everyone has a hat! Add the hats, take away the cloaks, and attack ⚡'}}
  rLevel();
}
function padKey(k){
  if(!PAD||UI.screen!=='level'||UI.phase!=='answer')return;
  if(k==='back')PAD.v=PAD.v.slice(0,-1);
  else if(k==='ok'){if(PAD.v!=='')submit(parseInt(PAD.v,10));return}
  else if(PAD.v.length<8)PAD.v=(PAD.v==='0'?'':PAD.v)+k;
  $('#disp').textContent=PAD.v;
}
function submit(v){
  const q=UI.qs[UI.idx];
  if(!q.answered){q.answered=true;UI.answered++}
  if(v===q.answer){
    if(!q.wrong)UI.first++;
    UI.phase='right';UI.bubble={kind:'good',html:`${pick(PRAISE)} The answer is <b>${q.answer}</b>.${q.wrong?'':coinsLeft(cur())>=UI.first*COIN_RIGHT?` <span class="coinhint">+${COIN_RIGHT} 🪙</span>`:' <span class="coinhint">⭐</span>'}`};
    bat(batAttack,q.answer,UI.idx===UI.qs.length-1);rLevel();
  }else if(q.type==='dist'){
    q.wrong=true;if(UI.hearts>1)UI.hearts--;
    UI.bubble={kind:'bad',html:`${v} isn't it yet. Let's go step by step:<ol>${q.steps.map(s=>`<li>${s}</li>`).join('')}</ol>The factory is still waiting. Try again!`};
    rLevel();const d=$('#disp');if(d)d.classList.add('shake');
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
  let stars=0,levelBonus=false,firstClear=false;const day=dailyOf(p);
  if(ok){stars=UI.hearts;firstClear=r.clears===0;r.clears++;r.stars=Math.max(r.stars,stars);
    if(!day.levels[l.id]){day.levels[l.id]=true;levelBonus=true;if(taskStep('lv:'+l.id))farmOf(p).xp+=TASK_XP}}   // first finish of this level today
  const want=UI.first*COIN_RIGHT+(levelBonus?COIN_LEVEL:0),gems=earnCoins(p,want);
  p.time+=secs;
  p.sessions.unshift({t:Date.now(),d:D.id,lv:l.id,stars,qs:UI.answered,first:UI.first,secs,ok});
  p.sessions=p.sessions.slice(0,60);
  save();
  return{stars,gems,firstClear,levelBonus,capped:gems<want};
}
function finishLevel(ok){
  if(UI.screen!=='level')return;
  const r=record(ok);
  Object.assign(UI,{screen:'result',ok,stars:r.stars,gems:r.gems,firstClear:r.firstClear,levelBonus:r.levelBonus,capped:r.capped});PAD=null;
  render();
}
function quitLevel(){if(UI.answered>0)record(false);go('dungeon',{did:UI.did,mapAt:UI.li})}
function shopHud(){
  const l=dun(UI.did).levels[UI.li];
  return `<button class="bx" data-act="quitLevel" aria-label="Leave level">✕</button><div class="bmid"><div class="bname">${l.name}</div><div class="bprog">${UI.qs.map((_,k)=>`<i class="${k<UI.idx||(UI.screen==='result'&&UI.ok)?'ok':k===UI.idx?'on':''}"></i>`).join('')}</div></div>`;
}
function rFactory(){
  const D=dun(UI.did),q=UI.qs[UI.idx];
  const pad=UI.phase==='answer'?`<div class="display" id="disp" aria-live="polite"></div><div class="pad" id="pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-k="${n}">${n}</button>`).join('')}<button data-k="back" aria-label="Delete">⌫</button><button data-k="0">0</button><button data-k="ok" class="ok" aria-label="Check">✓</button></div>`:'';
  const next=UI.phase==='right'?`<button class="b big-next" data-act="nextQ" id="nextBtn">${UI.idx<UI.qs.length-1?'Next sum ▸':'Finish ▸'}</button>`:'';
  $('#app').innerHTML=`<div class="workshop"><header class="shop-hud">${shopHud()}</header><div class="shop-main"><p class="shop-kicker">Sum ${UI.idx+1} of ${UI.qs.length}</p><div class="shop-expr">${q.html}</div><div class="bnpc ${UI.bubble.kind||''}"><span class="bface">${ico(npcKey(D.npc),D.npc.e)}</span><div>${UI.bubble.html}</div></div>${distHTML(q)}</div>${pad||next?`<div class="shop-dock">${pad}${next}</div>`:''}</div>`;
  if(UI.phase==='answer')PAD={v:''};
  if(UI.phase==='right')$('#nextBtn').focus({preventScroll:true});
}
function rFactoryResult(){
  const l=dun(UI.did).levels[UI.li],nx=dun(UI.did).levels[UI.li+1],hasNext=!!nx&&!nx.soon;
  const line=UI.stars===3?'Every sum went through the factory with no mistakes.'
    :UI.stars===2?'The factory finished them. One cleaner run would be 3 stars.'
    :'The factory finished the job. Another visit will make the trick feel easy.';
  $('#app').innerHTML=`<div class="workshop"><header class="shop-hud">${shopHud()}</header><div class="shop-main"><div class="rcard">
   <div class="rtitle">Packed!</div>
   <p class="rsub">${l.name}</p>
   <div class="bigstars" aria-label="${UI.stars} stars">${[0,1,2].map(k=>`<span class="pop" style="animation-delay:${200+k*220}ms">${k<UI.stars?'⭐':'☆'}</span>`).join('')}</div>
   ${UI.gems?`<div class="rcoins pop" style="animation-delay:900ms">+${UI.gems} 🪙</div><p class="rsub">${UI.levelBonus?`Includes +${COIN_LEVEL} for finishing this level today! `:''}Spend your coins on the farm.</p>`:''}
   ${UI.capped?`<p class="rsub">🪙 Today's coins are full (${COIN_DAY_MAX})! Stars still count. Come back tomorrow for more coins.</p>`:''}
   <p>${line}</p>
   <div class="btns" style="justify-content:center">
    ${hasNext?`<button class="b" data-act="startLevel" data-i="${UI.li+1}">Next level ▸</button>`:''}
    <button class="b ${hasNext?'ghost':''}" data-act="startLevel" data-i="${UI.li}">Play again</button>
    <button class="b ghost" data-act="toDungeon">Level map</button>
    <button class="b ghost" data-act="toSchool">🏝️ Islands</button>
    <button class="b ghost" data-act="toTown">🌾 Farm</button>
   </div></div></div></div>`;
}
function rResult(){
  if(UI.qs&&UI.qs[0]&&UI.qs[0].type==='dist'){rFactoryResult();return}
  ensureBattle();
  const B=$('#battle');B.classList.add('result');B.classList.toggle('lose',!UI.ok);
  bat(UI.ok?batVictory:batDefeat);
  const D=dun(UI.did),l=D.levels[UI.li],nx=D.levels[UI.li+1],hasNext=UI.ok&&!!nx&&!nx.soon;
  const line=!UI.ok?'Out of hearts! That\'s okay. Every try makes your brain stronger.'
    :UI.stars===3?'Perfect! Not a single mistake. You\'re a true trick hunter!'
    :UI.stars===2?'Great work! One more try could get you 3 stars.'
    :'You made it through! Practice makes the trick feel easy.';
  $('#bhud').innerHTML=hudHTML();
  $('#bresult').innerHTML=`<div class="rcard">
   <div class="rtitle">${UI.ok?'Victory!':'Try again'}</div>
   <p class="rsub">${l.name}</p>
   ${UI.ok?`<div class="bigstars" aria-label="${UI.stars} stars">${[0,1,2].map(k=>`<span class="pop" style="animation-delay:${200+k*220}ms">${k<UI.stars?'⭐':'☆'}</span>`).join('')}</div>`:''}
   ${UI.gems?`<div class="rcoins pop" style="animation-delay:900ms">+${UI.gems} 🪙</div><p class="rsub">${UI.levelBonus?`Includes +${COIN_LEVEL} for finishing this level today! `:''}Spend your coins on the farm.</p>`:''}
   ${UI.capped?`<p class="rsub">🪙 Today's coins are full (${COIN_DAY_MAX})! Stars still count. Come back tomorrow for more coins.</p>`:''}
   <p>${line}</p>
   <div class="btns" style="justify-content:center">
    ${hasNext?`<button class="b" data-act="startLevel" data-i="${UI.li+1}">Next level ▸</button>`:''}
    <button class="b ${hasNext?'ghost':''}" data-act="startLevel" data-i="${UI.li}">${UI.ok?'Play again':'Try again'}</button>
    <button class="b ghost" data-act="toDungeon">Level map</button>
    <button class="b ghost" data-act="toSchool">🏝️ Islands</button>
    <button class="b ghost" data-act="toTown">🌾 Farm</button>
   </div></div>`;
}

Object.assign(ACT,{
  mapGo:d=>{if(MAP&&G.stage===MAP)mapGo(+d.i);else startLevel(+d.i)},
  keeperTalk:()=>{const D=dun(UI.did);dialog(D.npc,D.intro)},
  schoolTalk:()=>{const S=schoolById(UI.sid||SCHOOL_ID);dialog(S.npc,S.intro)},
  toSchool:()=>go('school',{sid:SCHOOL_ID}),
  openTopic:d=>{const T=dun(d.id);if(!T)return;if(!T.open){toast(`${T.name} is coming soon!`);return}go('dungeon',{did:T.id})},
  toDungeon:()=>go('dungeon',{did:UI.did,mapAt:UI.li}),
  startLevel:d=>{const i=+d.i;if(UI.screen!=='dungeon')UI={screen:'dungeon',did:UI.did,mapAt:i};startLevel(i);if(UI.screen==='dungeon')render()},
  quitLevel:()=>quitLevel(),
  nextQ:()=>nextQ(),
  pairTap:d=>pairTap(+d.i),
  friendTap:d=>friendTap(+d.i),
  hatTap:d=>hatTap(+d.i),
  distPick:d=>distPick(d),
  distMerge:d=>distMerge(+d.i),
  zeroTap:d=>zeroTap(+d.i),
  zeroBox:()=>zeroBox(),
  zeroClear:()=>{UI.qs[UI.idx].sel=[];rLevel()}
});
onPageKey=e=>{if(UI.screen==='level'){
  if(/^[0-9]$/.test(e.key))padKey(e.key);
  else if(e.key==='Backspace')padKey('back');
  else if(e.key==='Enter'){if(UI.phase==='answer')padKey('ok');else if(UI.phase==='right')nextQ()}}};
startPage({school:rSchool,dungeon:rDungeon,level:rLevel,result:rResult},()=>({screen:'school',sid:SCHOOL_ID}));
