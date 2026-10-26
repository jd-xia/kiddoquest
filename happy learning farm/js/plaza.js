/* Happy Math Farm — 广场 / plaza (index.html): player select + the 3D farm square.
   Walking into a building opens that building's own page. */
/* ---------- players ---------- */
let NEWGRADE=DEFAULT_GRADE;
function rPlayers(){
  $('#app').innerHTML=`
  <h1>Happy Math Farm</h1>
  ${npcHTML(MAYOR,'Hello! Who is playing today? Tap your name.')}
  <div class="players">${DATA.players.map(p=>`<button class="player" data-act="choose" data-id="${p.id}"><div class="e">${avE(p)}</div><div class="nm">${esc(p.name)}</div><div class="muted"><span class="tag good">${gradeName(gradeOf(p))}</span> ⭐ ${totalStars(p)} · 🪙 ${p.gems}</div></button>`).join('')}</div>
  ${DATA.players.length<6?`<h3>New player</h3><div style="display:flex;gap:8px;max-width:420px"><input type="text" id="newname" maxlength="16" placeholder="Name" aria-label="New player name">${GRADES.map(g=>`<button class="b ${NEWGRADE===g.id?'':'ghost'}" data-act="pickGrade" data-g="${g.id}" aria-pressed="${NEWGRADE===g.id}">${g.name}</button>`).join('')}<button class="b" data-act="addPlayer">Add</button></div>`:''}`;
}
const BOUND={x:26.5,z:17.5}, PEN={x0:9,x1:16.5,z0:-6,z1:3};
const SITES=[{id:'tricks',x:-17,z:-13},{id:'patterns',x:-6,z:-13},{id:'words',x:5,z:-13},{id:'fractions',x:16,z:-13}];

/* ===================== FARM ===================== */
function inField(x,z){return Math.abs(x)<6.7&&z>-6.2&&z<4.2}
function onPath(x,z){return (Math.abs(z+9.2)<1.4&&Math.abs(x)<24.5)||(Math.abs(x+11)<1.4&&z>-9&&z<9)||(Math.abs(z-7.2)<1.4&&x>-16.5&&x<20.5)||(Math.abs(x)<1.4&&z>7&&z<11.6)}
function farmHeight(x,z){const d=Math.max(Math.abs(x)/29,Math.abs(z)/20);return smooth(1.05,1.9,d)*(3.2+2.6*noise2(x*.07,z*.07))+smooth(1.9,3.2,d)*6}
function buildFarm(){
  if(!engine())return null;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,600);
  F={scene,camera,hits:[],npcs:[],zones:[],baseObs:[],obs:[],plots:[],animals:[],fx:[],t:0,tick:0,camPos:new THREE.Vector3(),yaw:CAM.yaw,stuck:0,moving:false,
    update:farmUpdate,onTap:farmTap,onDrag:dx=>{CAM.yaw-=dx*.008},rotate:d=>{CAM.yaw+=d*Math.PI/4},zoom:d=>{CAM.zoom=Math.max(.6,Math.min(farmZoomMax(),CAM.zoom*Math.pow(1.22,d)))},
    leave(){if(F.player&&!LASTPOS)LASTPOS={x:F.player.position.x,z:F.player.position.z};KEYS.clear()}};
  scene.add(skyDome('#4E95E0','#FFE7C4','#BFD9A2'));scene.fog=new THREE.Fog(col('#F5E3C6'),60,170);
  F.sun=addLights(scene,{sky:'#D6EAFF',ground:'#5E7F44',hemi:.62,sun:'#FFE4BC',si:1.9,pos:[28,26,18],range:32});F.rim=new THREE.Color(1,.9,.72);F.bloom=.5;
  buildFarmWorld();return F;
}
function buildFarmWorld(){
  const S=F.scene,markHit=(o,a)=>{o.userData.act=a;F.hits.push(o)};F.markHit=markHit;
  F.ground=terrain(S,{size:240,seg:120,height:farmHeight,c1:'#64A84A',c2:'#55963F',c3:'#74B556',c4:'#4E8A44'});
  const flat=(w,d,color,x,z,y)=>{const m=new THREE.Mesh(rbox(w,d,.06,.03),mat(color,{r:.95}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;S.add(m);return m};
  flat(48,2.2,'#E6CC9C',0,-9.2,.02);flat(2.2,18,'#E6CC9C',-11,0,.021);flat(36,2.2,'#E6CC9C',2,7.2,.022);flat(2.2,4.4,'#E6CC9C',0,9.4,.021);
  flat(13.4,10.4,'#9C6B42',0,-1,.018);
  for(let k=0;k<22;k++){const a=k/22*Math.PI*2+Math.sin(k)*.15,R=100+(k%4)*12,h=20+((k*37)%25);
    const m=mesh(new THREE.ConeGeometry(16+(k%3)*6,h,7),k%2?'#7FA2C2':'#90B2D0',Math.cos(a)*R,h/2+4,Math.sin(a)*R,{flat:true,r:1});m.castShadow=false;S.add(m);
    if(h>34){const c=mesh(new THREE.ConeGeometry((16+(k%3)*6)*.32,h*.32,7),'#F4F7FB',Math.cos(a)*R,h+4-h*.16,Math.sin(a)*R,{flat:true,r:1});c.castShadow=false;S.add(c)}}
  const fence=new THREE.Group();S.add(fence);fenceRect(-27.5,27.5,-18.5,18.5,2.5,'#C9A27A',fence);
  for(const [x,z] of[[-31,-12],[-32,0],[-31,12],[31,-12],[32,0],[31,12],[-20,-22],[-8,-23],[4,-22],[18,-23],[-22,22],[-6,23],[10,22],[24,23],[-36,-22],[36,22],[-40,8],[40,-6],[0,-28],[-14,27]]){const y=farmHeight(x,z);const t=((x+z)&1)?pine(x,z,1.2):roundTree(x,z,1.15);t.position.y=y;S.add(t)}
  for(const [x,z] of[[-25,15],[25,-16],[-25,-16],[13.5,14]]){S.add(roundTree(x,z,1));F.baseObs.push({x0:x-.8,x1:x+.8,z0:z-.8,z1:z+.8})}
  F.clouds=[];for(let k=0;k<7;k++){const c=cloud(-70+k*22,24+(k%3)*4,-40+(k%2)*18-(k%3)*10,1.4+(k%3)*.4);S.add(c);F.clouds.push(c)}
  // buildings
  for(const s of SITES){const D=dun(s.id),g=D.open?buildSchool(D.color,D.sign):buildSite(D.color,D.sign);g.position.set(s.x,0,s.z);S.add(g);markHit(g,{kind:'zone',id:s.id});
    F.baseObs.push({x0:s.x-3.8,x1:s.x+3.8,z0:s.z-2.9,z1:s.z+2.7});
    F.zones.push({id:s.id,kind:D.open?'dungeon':'closed',x:s.x,z:s.z+3.3,r:.9,out:{x:s.x,z:s.z+4.9},name:D.sign});
    addNPC({npc:D.npc,x:s.x+3.2,z:s.z+3.8,line:D.open?'Hoo! Earn coins here!':'Opening soon!',
      talk:D.open?['Hoo-hoo! I\'m Professor Hoot.','Inside my school, number monsters are waiting. Beat them with clever maths tricks!','Every answer you get right first time earns a coin 🪙 for your farm. Walk through my door to start!']:[`Hello! I'm ${D.npc.name}.`,D.grades&&D.grades[D.grade]===null?`My ${D.sign} for ${gradeName(D.grade)} is still being built. Come back soon!`:`My ${D.sign} is still being built. Come back soon!`]})}
  const mk=buildMarket();mk.position.set(-17,0,5);mk.rotation.y=Math.PI/2;S.add(mk);markHit(mk,{kind:'zone',id:'market'});
  F.baseObs.push({x0:-18.3,x1:-16.1,z0:2.7,z1:7.3});
  F.zones.push({id:'market',kind:'market',x:-15.2,z:5,r:.9,out:{x:-13.6,z:5},name:'Farm Market'});
  addNPC({npc:MERCHANT,x:-15,z:8.2,line:'Animals, decor, outfits!',talk:['Mo the Merchant, at your service!','Spend your coins here on animals, decorations and new outfits. Walk up to my stall to shop.']});
  const barn=buildBarn();barn.position.set(22.5,0,-1);barn.rotation.y=-Math.PI/2;S.add(barn);markHit(barn,{kind:'zone',id:'barn'});
  F.baseObs.push({x0:19.9,x1:25.2,z0:-4.2,z1:2.2});
  F.zones.push({id:'barn',kind:'barn',x:19.3,z:-1,r:.9,out:{x:17.8,z:-1},name:'Barn'});
  const bd=buildBoard();bd.position.set(-9,0,9);S.add(bd);markHit(bd,{kind:'zone',id:'board'});
  F.baseObs.push({x0:-10.5,x1:-7.5,z0:8.6,z1:9.4});
  F.zones.push({id:'board',kind:'board',x:-9,z:10,r:.8,out:{x:-9,z:11.6},name:'Progress Board'});
  addNPC({npc:ELLIE,x:-11.2,z:10.4,line:'Grown-ups: records here!',talk:['I\'m Ellie. I keep all the records.','Grown-ups can walk up to the board to see stars, scores and practice tips.']});
  addNPC({npc:MAYOR,x:2.6,z:11.4,line:'Welcome to the farm!',mayor:true});
  const pen=new THREE.Group();S.add(pen);fenceRect(PEN.x0,PEN.x1,PEN.z0,PEN.z1,1.5,'#FFFFFF',pen);
  pen.add(mesh(rbox(1.8,.5,.6,.08),'#8B5A2B',PEN.x1-1.4,.25,PEN.z1-.8));pen.add(mesh(BOX(1.55,.05,.42),new THREE.MeshStandardMaterial({color:col('#4FB6E6'),roughness:.15}),PEN.x1-1.4,.5,PEN.z1-.8));
  for(const [x,z] of[[PEN.x0+1.2,PEN.z0+1.2],[PEN.x0+2.4,PEN.z0+.9]]){const h=mesh(CYL(.5,.5,.9,18),'#E9C46A',x,.45,z,{r:.95});h.rotation.x=Math.PI/2;h.rotation.z=.4;pen.add(h)}
  const ps=signPlane('Animal Pen','#2FA36B',2.4);ps.position.set((PEN.x0+PEN.x1)/2,1.45,PEN.z1+.06);pen.add(ps);
  const penFloor=new THREE.Mesh(rbox(PEN.x1-PEN.x0-.3,PEN.z1-PEN.z0-.3,.05,.02),mat('#C9B07A',{r:1}));penFloor.rotation.x=-Math.PI/2;penFloor.position.set((PEN.x0+PEN.x1)/2,.02,(PEN.z0+PEN.z1)/2);penFloor.receiveShadow=true;S.add(penFloor);
  F.baseObs.push({x0:PEN.x0,x1:PEN.x1,z0:PEN.z0,z1:PEN.z1});
  F.animalGroup=new THREE.Group();S.add(F.animalGroup);
  for(let i=0;i<12;i++){const {x,z}=plotPos(i),g=new THREE.Group();g.position.set(x,0,z);S.add(g);
    const soil=mesh(rbox(2.25,.3,2.25,.09),'#6E4426',0,.12,0,{r:1});g.add(soil);markHit(soil,{kind:'plot',i});
    const ridges=new THREE.Group();for(const dz of[-.6,0,.6])ridges.add(mesh(rbox(1.9,.12,.3,.05),'#7B4D2B',0,.29,dz,{r:1}));g.add(ridges);
    const crop=new THREE.Group();g.add(crop);const spark=emojiSprite('✨',.9);spark.position.y=1.9;spark.visible=false;g.add(spark);
    const lock=emojiSprite('🔒',.8);lock.position.y=.8;lock.visible=false;g.add(lock);
    F.plots.push({g,soil,ridges,crop,spark,lock,key:''})}
  // nature scatter
  const okIn=(x,z)=>!inField(x,z)&&!onPath(x,z)&&!F.baseObs.some(o=>x>o.x0-.6&&x<o.x1+.6&&z>o.z0-.6&&z<o.z1+.6)&&Math.hypot(x-(-3),z-14)>3.2&&Math.hypot(x+23,z+2)>2&&!(z>3&&z<7.4&&x>-19&&x<-12);
  scatter(S,new THREE.ConeGeometry(.06,.38,3).translate(0,.19,0),['#5DA544','#6DB650','#7CC35A','#4F9A3D'],2600,()=>{const x=(Math.random()-.5)*54,z=(Math.random()-.5)*36;return okIn(x,z)?{x,z}:null},.8,1.4,false,{wind:.5});
  scatter(S,new THREE.ConeGeometry(.08,.5,3).translate(0,.25,0),['#5DA544','#6DB650','#4F9A3D'],2200,()=>{const x=(Math.random()-.5)*110,z=(Math.random()-.5)*80;if(Math.abs(x)<28.5&&Math.abs(z)<19.5)return null;return{x,z,y:farmHeight(x,z)}},.9,1.6,false,{wind:.45});
  scatter(S,SPH(.09,6,5).translate(0,.28,0),['#FF7AA8','#FFD43B','#FFFFFF','#B98CFF','#FF9F45'],320,()=>{const x=(Math.random()-.5)*54,z=(Math.random()-.5)*36;return okIn(x,z)&&(Math.abs(x)>8||Math.abs(z)>8)?{x,z}:null},.8,1.3,false,{flatShading:false,roughness:.6});
  scatter(S,ICO(.6,0).translate(0,.35,0),['#3F8A3A','#4C9A44','#2F7A36'],60,()=>{const e=Math.random()<.5,x=e?(Math.random()<.5?-1:1)*(25.6+Math.random()*1.2):(Math.random()-.5)*52,z=e?(Math.random()-.5)*34:(Math.random()<.5?-1:1)*(16.6+Math.random()*1.2);return okIn(x,z)?{x,z}:null},.8,1.5,true);
  scatter(S,ICO(.45,0).translate(0,.15,0),['#A7A3A0','#8F8C88','#BEB9B2'],40,()=>{const x=(Math.random()-.5)*100,z=(Math.random()-.5)*70;if(Math.abs(x)<27&&Math.abs(z)<18&&!okIn(x,z))return null;return{x,z,y:Math.abs(x)<28&&Math.abs(z)<19?0:farmHeight(x,z)}},.6,1.6,true);
  F.dust=sparkles(S,140,{x:56,z:38,y0:.5,h:5},'#FFF4C2',.16);
  buildDecor();
  F.butterflies=[0,1,2].map(()=>{const b=emojiSprite('🦋',.6);S.add(b);return b});
  const ring=new THREE.Mesh(new THREE.RingGeometry(.3,.46,32),new THREE.MeshBasicMaterial({color:'#FFFFFF',transparent:true,opacity:0,depthWrite:false,toneMapped:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.06;S.add(ring);F.ring=ring;F.ringT=9;
  F.smoke=[];for(let k=0;k<6;k++){const p=new THREE.Mesh(ICO(.3,1),new THREE.MeshStandardMaterial({color:col('#FFFFFF'),transparent:true,opacity:.5,flatShading:true,roughness:1}));S.add(p);F.smoke.push({p,o:k/6})}
}
function buildSchool(color,name){const g=new THREE.Group(),dark=shade(color,-.12);
  g.add(mesh(rbox(7.6,.45,5.6,.12),'#CFC3B2',0,.22,0,{r:.9}));
  g.add(mesh(rbox(7,3.4,5,.14),'#FFF3DF',0,2.1,0,{r:.85}));
  const roof=gableRoof(7.8,6,2.3,dark);roof.position.y=3.75;g.add(roof);
  g.add(mesh(rbox(7.9,.25,6.1,.08),'#FFFFFF',0,3.75,0));
  g.add(mesh(rbox(1.9,2.5,.3,.1),color,0,1.5,2.52));g.add(mesh(rbox(1.4,2.1,.12,.05),'#4A3020',0,1.35,2.66,{r:.5}));
  g.add(mesh(SPH(.08,10,8),'#FFD43B',.48,1.45,2.75,{r:.3,m:.6}));
  g.add(mesh(rbox(2.4,.2,.9,.06),'#CFC3B2',0,.48,3.1));g.add(mesh(rbox(2.0,.2,.6,.06),'#CFC3B2',0,.3,3.4));
  for(const x of[-2.45,2.45]){g.add(mesh(rbox(1.5,1.25,.14,.05),'#FFFFFF',x,2.2,2.55));g.add(mesh(BOX(1.25,1.0,.1),new THREE.MeshStandardMaterial({color:col('#BFE6FF'),roughness:.1,metalness:.2,emissive:col('#BFE6FF'),emissiveIntensity:.15}),x,2.2,2.6));g.add(mesh(rbox(1.7,.18,.4,.05),color,x,1.52,2.7));
    for(let k=0;k<3;k++)g.add(mesh(SPH(.13,10,8),['#FF6B9A','#FFD43B','#B56BFF'][k],x-.45+k*.45,1.7,2.75,{r:.5}))}
  const sign=signPlane(name,color,4);sign.position.set(0,3.17,2.69);g.add(sign);
  g.add(mesh(rbox(1.3,1.5,1.3,.08),'#FFF3DF',0,5.6,0));const c=mesh(new THREE.ConeGeometry(1.05,1.2,4),dark,0,6.95,0,{flat:true});c.rotation.y=Math.PI/4;g.add(c);
  const clock=mesh(CYL(.36,.36,.08,24),'#FFFFFF',0,5.65,.68);clock.rotation.x=Math.PI/2;g.add(clock);
  const hand=mesh(BOX(.04,.26,.04),'#2E1A5C',0,5.75,.74);g.add(hand);
  const flag=mesh(BOX(.04,1.1,.04),'#8B8B8B',0,7.9,0);g.add(flag);const fl=mesh(BOX(.6,.36,.03),'#FFD43B',.32,8.25,0);g.add(fl);
  return g}
function buildSite(color,name){const g=new THREE.Group();
  g.add(mesh(rbox(7.2,.3,5.2,.08),'#C9C2B8',0,.15,0,{r:1}));
  g.add(mesh(rbox(7,2.4,.3,.06),'#EADBC8',0,1.45,-2.3));
  g.add(mesh(rbox(.3,1.5,4.6,.06),'#EADBC8',-3.35,1,0));g.add(mesh(rbox(.3,.9,4.6,.06),'#EADBC8',3.35,.7,0));
  for(const [x,z] of[[-3.6,2.6],[3.6,2.6],[-3.6,-2.6],[3.6,-2.6]])g.add(mesh(CYL(.08,.08,4.2,8),'#9AA3AD',x,2.1,z,{r:.4,m:.6}));
  for(const y of[1.7,3.3])g.add(mesh(rbox(7.4,.12,.5,.04),'#C68B4E',0,y,2.6));
  for(const x of[-2.2,2.2]){g.add(mesh(new THREE.ConeGeometry(.25,.6,12),'#FF8A3D',x,.6,3.2));g.add(mesh(CYL(.2,.2,.1,12),'#FFFFFF',x,.62,3.2))}
  g.add(mesh(rbox(1,.6,.7,.06),'#C68B4E',1.5,.6,-1));g.add(mesh(rbox(.8,.5,.6,.06),'#C68B4E',-1.4,.55,-.6));
  const s1=signPlane(name,color,4.2);s1.position.set(0,2.75,2.9);g.add(s1);
  const s2=signPlane('Opening soon','#E0A800',2.6);s2.position.set(0,1.25,2.9);g.add(s2);
  return g}
function buildMarket(){const g=new THREE.Group();
  g.add(mesh(rbox(4.4,1,1.3,.1),'#B07A45',0,.5,.4));g.add(mesh(rbox(4.6,.12,1.5,.05),'#8B5A2B',0,1.04,.4));
  for(const [x,z] of[[-2.1,-.9],[2.1,-.9],[-2.1,1],[2.1,1]])g.add(mesh(CYL(.09,.09,2.8,8),'#8B5A2B',x,1.4,z));
  for(let k=0;k<6;k++){const s=mesh(rbox(.76,.12,2.5,.04),k%2?'#FFFFFF':'#E5484D',-1.9+k*.76,2.85,.05);s.rotation.x=-.18;g.add(s)}
  g.add(mesh(rbox(1,.7,.8,.06),'#C68B4E',-1.3,.35,-.6));g.add(mesh(rbox(1,.7,.8,.06),'#C68B4E',1.2,.35,-.6));
  [['🥕',-1.4],['🍅',0],['🍎',1.4]].forEach(([e,x])=>{const s=emojiSprite(e,.7);s.position.set(x,1.42,.4);g.add(s)});
  const sign=signPlane('Farm Market','#E0A800',3);sign.position.set(0,3.45,1.25);g.add(sign);
  return g}
function buildBarn(){const g=new THREE.Group();
  g.add(mesh(rbox(6.3,.3,5.3,.08),'#CFC3B2',0,.15,0));
  g.add(mesh(rbox(6,3.4,5,.12),'#C8442E',0,1.9,0,{r:.85}));
  const roof=gableRoof(6.6,5.9,2.3,'#5E3328');roof.position.y=3.55;g.add(roof);
  g.add(mesh(rbox(2.4,2.8,.2,.06),'#F4EDE4',0,1.55,2.55));g.add(mesh(BOX(1.95,2.35,.1),'#A8321F',0,1.45,2.64));
  const L=Math.hypot(1.9,2.3),a=Math.atan2(2.3,1.9);
  for(const s of[1,-1]){const b=mesh(BOX(L,.14,.06),'#F4EDE4',0,1.45,2.7);b.rotation.z=s*a;g.add(b)}
  const sign=signPlane('Barn','#5E3328',1.6);sign.position.set(0,3.15,2.62);g.add(sign);
  g.add(mesh(rbox(.7,1.4,.7,.06),'#8A8A8A',-2,5,-.8));
  for(const [x,z] of[[3.8,1.6],[3.8,.4]]){const h=mesh(CYL(.5,.5,.9,18),'#E9C46A',x,.5,z,{r:.95});h.rotation.x=Math.PI/2;g.add(h)}
  return g}
function buildBoard(){const g=new THREE.Group();
  for(const x of[-1.25,1.25])g.add(mesh(CYL(.08,.1,2.4,8),'#8B5A2B',x,1.2,0));
  g.add(mesh(rbox(2.8,1.6,.16,.06),'#C68B4E',0,1.55,0));
  for(const [x,y,c] of[[-.8,1.75,'#FFFFFF'],[.1,1.45,'#FFF3B0'],[.85,1.8,'#FFFFFF'],[-.35,1.2,'#D7F5F0']])g.add(mesh(BOX(.55,.45,.02),c,x,y,.09));
  const s=signPlane('Progress Board','#5B6B8C',2.8);s.position.set(0,2.65,.1);g.add(s);
  return g}
function cropMesh(id,stage){const g=new THREE.Group();
  for(const [x,z] of[[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]]){const s=new THREE.Group();s.position.set(x,.28,z);g.add(s);
    if(stage===0){const m=mesh(SPH(.17,10,8),'#4E3018');m.scale.y=.45;s.add(m)}
    else if(stage===1){for(const d of[-.07,.07]){const m=mesh(new THREE.ConeGeometry(.05,.26,6),'#5DBB4A',d,.13,0,{flat:true});m.rotation.z=d*4;s.add(m)}}
    else if(stage===2){if(id==='corn'||id==='sunflower'){s.add(mesh(CYL(.05,.06,.7,6),'#4E9A45',0,.35,0));s.add(mesh(new THREE.ConeGeometry(.2,.4,7),'#5DBB4A',0,.62,0,{flat:true}))}else s.add(mesh(ICO(.24,1),'#5DBB4A',0,.18,0,{flat:true}))}
    else if(artOf('seed:'+id)){const sp=iconSprite('seed:'+id,'',.62);sp.position.y=.34;s.add(sp)}   // the child's own crop picture
    else readyCrop(id,s)}
  return g}
function readyCrop(id,s){
  if(id==='carrot'){for(const a of[-.35,0,.35]){const l=mesh(new THREE.ConeGeometry(.05,.42,5),'#4E9A45',a*.3,.28,0,{flat:true});l.rotation.z=a;s.add(l)}const c=mesh(new THREE.ConeGeometry(.13,.3,10),'#FF8A1F',0,.06,0,{r:.5});c.rotation.x=Math.PI;s.add(c)}
  else if(id==='tomato'){s.add(mesh(ICO(.29,1),'#4E9A45',0,.3,0,{flat:true}));for(let k=0;k<4;k++){const a=k*Math.PI/2+.4;s.add(mesh(SPH(.1,12,10),'#E5333D',Math.cos(a)*.26,.28+(k%2)*.14,Math.sin(a)*.26,{r:.3}))}}
  else if(id==='sunflower'){s.add(mesh(CYL(.04,.05,1.3,6),'#4E9A45',0,.65,0));const f=mesh(CYL(.3,.3,.05,16),'#FFC93C',0,1.35,.05,{r:.6});f.rotation.x=Math.PI/2.6;s.add(f);const c=mesh(CYL(.14,.14,.07,12),'#6B3E1E',0,1.37,.08);c.rotation.x=Math.PI/2.6;s.add(c)}
  else if(id==='strawberry'){const b=mesh(ICO(.28,1),'#4E9A45',0,.1,0,{flat:true});b.scale.y=.5;s.add(b);for(let k=0;k<3;k++){const a=k*2.1;const c=mesh(new THREE.ConeGeometry(.09,.17,10),'#E5333D',Math.cos(a)*.22,.12,Math.sin(a)*.22,{r:.3});c.rotation.x=Math.PI;s.add(c)}}
  else if(id==='corn'){s.add(mesh(CYL(.06,.07,1.5,6),'#4E9A45',0,.75,0));for(const a of[0,2.1,4.2]){const l=mesh(BOX(.06,.6,.02),'#5DBB4A',Math.cos(a)*.12,.8,Math.sin(a)*.12);l.rotation.z=.6*Math.cos(a);l.rotation.x=.6*Math.sin(a);s.add(l)}s.add(mesh(CYL(.09,.09,.34,10),'#F2C230',.13,.95,0,{r:.5}))}
  else{const p=mesh(SPH(.31,16,12),'#F28C28',0,.18,0,{r:.5});p.scale.y=.75;s.add(p);s.add(mesh(CYL(.03,.04,.14,6),'#5A3A20',0,.42,0))}
}
function addNPC(o){const g=new THREE.Group();const sp=iconSprite(npcKey(o.npc),o.npc.e,1.7);sp.position.y=.95;g.add(sp);
  const tg=labelSprite(o.npc.name.replace(/^Professor /,'').split(' ')[0],{h:.42});tg.position.y=2.05;g.add(tg);
  const bub=labelSprite(o.line,{h:.5,border:'#F5C24C'});bub.position.y=2.65;bub.visible=false;g.add(bub);
  g.add(shadowDisc(.6));g.position.set(o.x,0,o.z);F.scene.add(g);F.markHit(sp,{kind:'npc',n:o});o.g=g;o.sp=sp;o.bub=bub;F.npcs.push(o)}
function buildDecor(){
  const S=F.scene;F.decor={};const add=(id,g)=>{g.visible=false;S.add(g);F.decor[id]=g};
  let g=new THREE.Group();const fc=['#FF6B9A','#FFD43B','#B56BFF','#FF8A3D','#FFFFFF'];
  for(const bx of[-7.7,7.7]){g.add(mesh(rbox(.9,.25,10,.08),'#7B4D2B',bx,.12,-.9));for(let k=0;k<10;k++){const z=-5.3+k*.95,x=bx+(k%2?.2:-.2);g.add(mesh(CYL(.03,.03,.4,4),'#3E8E41',x,.4,z));g.add(mesh(SPH(.17,10,8),fc[k%5],x,.65,z,{r:.5}))}}
  add('flowers',g);
  g=new THREE.Group();F.lanterns=[];for(const [x,z] of[[-12.6,-5],[-12.6,0],[-12.6,4],[-6,8.8],[6,8.8],[12,8.8]]){g.add(mesh(CYL(.06,.07,2,8),'#3A3A3A',x,1,z,{m:.5,r:.4}));g.add(mesh(rbox(.42,.5,.42,.06),'#3A3A3A',x,2.1,z,{m:.5,r:.4}));const l=new THREE.Mesh(SPH(.17,12,10),new THREE.MeshBasicMaterial({color:'#FFE08A',toneMapped:false}));l.position.set(x,2.1,z);g.add(l);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex(),color:'#FFD27A',transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));glow.scale.set(1.6,1.6,1);glow.position.set(x,2.1,z);g.add(glow);F.lanterns.push(glow)}
  add('lanterns',g);
  g=new THREE.Group();g.position.set(0,0,-7);g.add(mesh(CYL(.07,.07,2.2,6),'#8B5A2B',0,1.1,0));g.add(mesh(BOX(1.6,.1,.1),'#8B5A2B',0,1.5,0));
  g.add(mesh(rbox(.7,.8,.35,.08),'#3E7BFA',0,1.45,0));g.add(mesh(SPH(.28,14,12),'#E8C99A',0,2.2,0));g.add(mesh(new THREE.ConeGeometry(.45,.45,14),'#E9C46A',0,2.55,0));
  add('scarecrow',g);
  g=new THREE.Group();for(const [x,z] of[[-22,10],[-22,-9],[22,11]])g.add(roundTree(x,z,1.1,true));add('apples',g);
  g=new THREE.Group();g.position.set(-3,0,14);
  const w=new THREE.Mesh(new THREE.CircleGeometry(2.6,40),new THREE.MeshStandardMaterial({color:col('#3FA7DD'),roughness:.08,metalness:.25,emissive:col('#1E6E9E'),emissiveIntensity:.25}));w.rotation.x=-Math.PI/2;w.position.y=.05;w.receiveShadow=true;g.add(w);F.water=w;
  for(let k=0;k<18;k++){const a=k/18*Math.PI*2;g.add(mesh(ICO(.3,0),'#A9A39C',Math.cos(a)*2.75,.1,Math.sin(a)*2.75,{flat:true}))}
  for(const [x,z] of[[.8,-.6],[-1.2,.9]]){const p=new THREE.Mesh(new THREE.CircleGeometry(.35,14),mat('#4E9A45'));p.rotation.x=-Math.PI/2;p.position.set(x,.07,z);g.add(p)}
  F.ducks=[0,1].map(()=>{const d=emojiSprite('🦆',.9);d.position.y=.45;g.add(d);return d});add('pond',g);
  g=new THREE.Group();g.position.set(-23,0,-2);g.add(mesh(CYL(.7,1.3,5,10),'#F3EEE6',0,2.5,0,{flat:true}));g.add(mesh(new THREE.ConeGeometry(1.15,1.3,10),'#C8442E',0,5.65,0,{flat:true}));
  const bl=new THREE.Group();bl.position.set(0,4.6,1.15);for(let k=0;k<4;k++){const pv=new THREE.Group();pv.rotation.z=k*Math.PI/2;pv.add(mesh(rbox(.38,2.6,.06,.02),'#FFFFFF',0,1.3,0));bl.add(pv)}
  bl.add(mesh(SPH(.18,10,8),'#C8442E'));g.add(bl);F.blades=bl;add('windmill',g);
}
function decorObstacles(f){const o=[],has=id=>f.decor.includes(id);
  if(has('apples'))for(const [x,z] of[[-22,10],[-22,-9],[22,11]])o.push({x0:x-.8,x1:x+.8,z0:z-.8,z1:z+.8});
  if(has('pond'))o.push({x0:-5.6,x1:-.4,z0:11.4,z1:16.6});
  if(has('windmill'))o.push({x0:-24.3,x1:-21.7,z0:-3.3,z1:-.7});
  if(has('scarecrow'))o.push({x0:-.3,x1:.3,z0:-7.3,z1:-6.7});
  return o}
function syncWorld(){
  const p=cur(),f=farmOf(p);
  if(F.player){F.scene.remove(F.player);F.player.traverse(o=>{if(o.geometry&&!o.geometry.userData.keep)o.geometry.dispose()})}
  F.player=buildHero(f);F.scene.add(F.player);
  const sp=LASTPOS||{x:0,z:12.4};LASTPOS=null;F.player.position.set(sp.x,0,sp.z);F.player.rotation.y=Math.PI;
  F.target=null;F.pending=null;
  for(const id in F.decor)F.decor[id].visible=f.decor.includes(id);
  F.obs=F.baseObs.concat(decorObstacles(f));
  syncAnimals();syncPlots(true);
  for(const z of F.zones)z.inside=Math.hypot(z.x-sp.x,z.z-sp.z)<z.r;
  F.yaw=CAM.yaw;placeCamera(1);updateHud();
}
function syncPlots(force){
  const f=farmOf(cur());
  F.plots.forEach((P,i)=>{
    const locked=i>=f.unlocked,pl=f.plots[i],info=plotInfo(pl);
    const key=locked?'L':!pl?'E':`${pl.crop}${info.stage}${pl.watered?'w':''}`;
    if(!force&&key===P.key)return;P.key=key;
    P.soil.material=mat(locked?'#86B866':pl&&pl.watered?'#4A2C17':'#6E4426',{r:1});
    P.soil.scale.y=locked?.35:1;P.ridges.visible=!locked;
    clearGroup(P.crop);if(pl)P.crop.add(cropMesh(pl.crop,info.stage));
    P.spark.visible=!!info&&info.stage===3;P.lock.visible=locked&&i===f.unlocked;
  });
}
function syncAnimals(){
  const f=farmOf(cur());clearGroup(F.animalGroup);
  F.hits=F.hits.filter(h=>!(h.userData.act&&h.userData.act.kind==='animal'));
  F.animals=f.animals.map((a,idx)=>{const A=ANIMALS.find(x=>x.id===a.type),g=new THREE.Group();
    const sp=iconSprite('animal:'+A.id,A.e,A.id==='cow'?1.5:1.15);sp.position.y=A.id==='cow'?.75:.6;g.add(sp);g.add(shadowDisc(.45));
    const pr=iconSprite('prod:'+A.prod,A.pe,.7);pr.position.y=1.75;pr.visible=false;g.add(pr);
    const x=PEN.x0+1+Math.random()*(PEN.x1-PEN.x0-2),z=PEN.z0+1+Math.random()*(PEN.z1-PEN.z0-2);g.position.set(x,0,z);
    F.animalGroup.add(g);sp.userData.act={kind:'animal',idx};F.hits.push(sp);
    return{g,sp,pr,a,A,tx:x,tz:z,wait:Math.random()*3}});
}
function updateHud(){
  const p=cur(),f=farmOf(p),L=farmLevel(f.xp);
  const fl=$('#flv');if(fl)fl.innerHTML=`🌾 Farm level ${L.l}<span class="xpbar"><i style="width:${Math.round(L.into/L.need*100)}%"></i></span><small>${L.into}/${L.need} XP</small>`;
  const c=$('#coins');if(c)c.textContent='🪙 '+p.gems;
}
function rTown(){
  const quick=[['tricks','🦉 Math School'],['market','🛒 Farm Market'],['barn','🌾 Barn'],['studio','🎨 Art Studio'],['board','📋 Progress Board']].map(([id,l])=>`<button class="b ghost sm" data-act="quick" data-id="${id}">${l}</button>`).join('');
  $('#app').innerHTML=topBar('Happy Math Farm')+`
  <div class="world" id="world">
    <div class="wtop"><div class="flv" id="flv"></div>${camCtl('<button class="wide" data-act="overview" aria-label="See the whole farm">🗺️</button>')}</div>
    <div class="toast" id="toast" aria-live="polite"></div>
    <div class="sheet" id="sheet"></div>
  </div>
  <p class="muted townhint">Tap the ground to walk and drag sideways to turn the camera. Tap a field patch to plant. Walk into a building to go inside. Coins 🪙 only come from Math School!</p>
  <div class="quick dock">${quick}<button class="b ghost sm" data-act="mayorTalk">🐻 How to play</button></div>`;
  const fkey=cur().id+':'+gradeOf(cur());   // schools depend on the grade, NPC/animal pictures on the player
  if(F&&F.key!==fkey)F=null;
  if(!F){buildFarm();if(F)F.key=fkey}
  if(!F||!mountStage(F,$('#world'))){$('#world').insertAdjacentHTML('afterbegin','<div class="nogl">The 3D farm can\'t start on this device. Use the buttons below to visit each place.</div>');updateHud();return}
  F.sheet=null;syncWorld();
  const p=cur();if(!p.seen.farm){p.seen.farm=1;save();mayorTalk()}
}
function mayorTalk(){dialog(MAYOR,[
  'Welcome to Happy Math Farm! I\'m Bella, the mayor.',
  'Tap the ground to walk. Drag sideways to turn the camera. On a computer, the arrow keys work too.',
  'Seeds, animals and decorations cost coins 🪙. The only way to earn coins is at Math School: beat number monsters by answering questions! Every answer right first time earns a coin, and clearing a level earns a bonus.',
  'Tap a field patch to plant seeds. Crops grow in real time, so come back later to harvest! Watering 💧 makes them grow faster.',
  'Harvests earn XP to level up your farm and unlock new seeds and animals. Mo\'s Farm Market sells animals, decorations and outfits.',
  'Start at Professor Hoot\'s Math School, at the top left of the farm. Good luck!'])}
function farmTap(e){
  const ray=rayFrom(e,F.camera);
  const a=actOf(ray.intersectObjects(F.hits,true));
  if(a&&doAct(a))return;
  const g=ray.intersectObject(F.ground);if(g.length)walkTo(g[0].point.x,g[0].point.z,null);
}
function doAct(a){
  const me=F.player.position;
  if(a.kind==='plot'){const {x,z}=plotPos(a.i);walkTo(x,z+1.6,{sheet:['plot',a.i]});return true}
  if(a.kind==='npc'){const n=a.n,side=me.x<n.x?-1.1:1.1;walkTo(n.x+side,n.z+.4,{talk:n});return true}
  if(a.kind==='animal'){tapAnimal(a.idx);return true}
  if(a.kind==='zone'){const z=F.zones.find(z=>z.id===a.id);walkTo(z.x,z.z,null);return true}
  return false;
}
function walkTo(x,z,pending){
  closeSheet();
  F.target={x:Math.max(-BOUND.x,Math.min(BOUND.x,x)),z:Math.max(-BOUND.z,Math.min(BOUND.z,z))};F.pending=pending;F.stuck=0;
  F.ring.position.set(F.target.x,.06,F.target.z);F.ringT=0;
}
function blocked(x,z){if(Math.abs(x)>BOUND.x||Math.abs(z)>BOUND.z)return true;const r=.35;for(const o of F.obs)if(x>o.x0-r&&x<o.x1+r&&z>o.z0-r&&z<o.z1+r)return true;return false}
function moveBy(dx,dz){const p=F.player.position,nx=p.x+dx,nz=p.z+dz;
  if(!blocked(nx,nz)){p.x=nx;p.z=nz;return true}
  if(Math.abs(dx)>1e-4&&!blocked(nx,p.z)){p.x=nx;return true}
  if(Math.abs(dz)>1e-4&&!blocked(p.x,nz)){p.z=nz;return true}
  return false}
/* How far the camera may zoom out: just far enough to see the whole farm on this screen shape
   (wide screens need less, a portrait phone needs more). */
const camFit=()=>F.camera.aspect<.8?1.15:1;
function farmZoomMax(){
  const a=F.camera.aspect||1.5,tv=Math.tan(21*Math.PI/180),s=Math.abs(Math.sin(CAM.yaw)),c=Math.abs(Math.cos(CAM.yaw));
  const hx=28*c+19*s,hz=28*s+19*c;   // half the farm's size across and into the screen at this camera angle
  return Math.min(7,Math.max(2.2,Math.max(hx/(tv*a),hz/tv)*1.1/1.47/(15*camFit())));
}
function placeCamera(snap){
  const p=F.player.position,zmax=farmZoomMax();if(CAM.zoom>zmax)CAM.zoom=zmax;
  const o=Math.max(0,Math.min(1,(CAM.zoom-1.4)/(zmax-1.4)));   // 0 = follow the player, 1 = whole-farm overview
  const d=15*CAM.zoom*camFit(),lx=p.x*(1-o),lz=p.z*(1-o)-o,ly=1.2*(1-o);
  const hd=d*(1-.5*o),tx=lx+Math.sin(F.yaw)*hd,tz=lz+Math.cos(F.yaw)*hd,ty=d*(.68+.7*o)+1;   // the camera tilts down as it rises
  if(snap===1)F.camPos.set(tx,ty,tz);else F.camPos.lerp(new THREE.Vector3(tx,ty,tz),snap);
  F.camera.position.copy(F.camPos);F.camera.lookAt(lx,ly,lz);
  F.scene.fog.near=60+d*.8;F.scene.fog.far=170+d*1.6;
  F.sun.position.set(lx+28,32,lz+18);F.sun.target.position.set(lx,0,lz);
}
function triggerZone(z){
  if(z.kind==='closed'){toast(`${z.name} is opening soon!`);F.target={x:z.out.x,z:z.out.z};F.pending=null;return}
  LASTPOS={x:z.out.x,z:z.out.z};
  if(z.kind==='dungeon')go('dungeon',{did:z.id});
  else if(z.kind==='market')go('market');
  else if(z.kind==='board')go('progress');
  else if(z.kind==='barn')go('barn');
}
function farmUpdate(dt){
  const me=F.player,P=me.position,SP=6,t=F.t;
  F.yaw+=(CAM.yaw-F.yaw)*Math.min(1,dt*8);
  let kx=0,kz=0;
  if(!DLG){if(KEYS.has('ArrowLeft')||KEYS.has('a'))kx-=1;if(KEYS.has('ArrowRight')||KEYS.has('d'))kx+=1;if(KEYS.has('ArrowUp')||KEYS.has('w'))kz+=1;if(KEYS.has('ArrowDown')||KEYS.has('s'))kz-=1}
  let moving=false,dx=0,dz=0;
  if(kx||kz){F.target=null;F.pending=null;const s=Math.sin(F.yaw),c=Math.cos(F.yaw);dx=kz*-s+kx*c;dz=kz*-c+kx*-s;const m=Math.hypot(dx,dz);dx/=m;dz/=m;
    if(moveBy(dx*SP*dt,dz*SP*dt))moving=true;if(F.sheet)closeSheet()}
  else if(F.target&&!DLG){
    const tx=F.target.x-P.x,tz=F.target.z-P.z,d=Math.hypot(tx,tz);
    if(d<.08){F.target=null;const pd=F.pending;F.pending=null;
      if(pd&&pd.sheet)openSheet(...pd.sheet);
      if(pd&&pd.talk){const n=pd.talk;me.rotation.y=Math.atan2(n.x-P.x,n.z-P.z);n.mayor?mayorTalk():dialog(n.npc,n.talk)}}
    else{dx=tx/d;dz=tz/d;const st=Math.min(d,SP*dt);if(moveBy(dx*st,dz*st)){moving=true;F.stuck=0}else{F.stuck+=dt;if(F.stuck>.4){F.target=null;F.pending=null}}}
  }
  if(moving){const want=Math.atan2(dx,dz);let diff=want-me.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));me.rotation.y+=diff*Math.min(1,dt*12)}
  F.walkT=(F.walkT||0)+(moving?dt:0);
  animHero(me,moving?'walk':'idle',moving?F.walkT:t,dt);
  for(const z of F.zones){const inside=Math.hypot(z.x-P.x,z.z-P.z)<z.r;if(inside&&!z.inside){z.inside=true;triggerZone(z);if(G.stage!==F)return}else z.inside=inside}
  for(const n of F.npcs){const d=Math.hypot(n.x-P.x,n.z-P.z);n.bub.visible=d<4.5&&!DLG;n.sp.position.y=.95+Math.sin(t*2+n.x)*.05}
  const now=Date.now();
  for(const an of F.animals){
    const g=an.g;
    if(an.wait>0)an.wait-=dt;else{const ddx=an.tx-g.position.x,ddz=an.tz-g.position.z,d=Math.hypot(ddx,ddz);
      if(d<.05){an.wait=1+Math.random()*4;an.tx=PEN.x0+1+Math.random()*(PEN.x1-PEN.x0-2);an.tz=PEN.z0+1+Math.random()*(PEN.z1-PEN.z0-2)}
      else{const st=Math.min(d,1.1*dt);g.position.x+=ddx/d*st;g.position.z+=ddz/d*st;an.sp.position.y=(an.A.id==='cow'?.75:.6)+Math.abs(Math.sin(t*8))*.06}}
    an.pr.visible=now-an.a.last>=an.A.mins*60000;an.pr.position.y=1.75+Math.sin(t*3)*.08;
  }
  if(F.blades)F.blades.rotation.z-=dt*.8;
  F.ducks.forEach((d,k)=>{const a=t*.3+k*Math.PI;d.position.set(Math.cos(a)*1.4,.45+Math.sin(t*2+k)*.04,Math.sin(a)*1.1)});
  F.butterflies.forEach((b,k)=>{const a=t*.5+k*2.1;b.position.set(Math.cos(a)*(5+k)+(k-1)*2,1.4+Math.sin(t*3+k)*.4,Math.sin(a*1.3)*4-1)});
  F.clouds.forEach(c=>{c.position.x+=dt*.7;if(c.position.x>90)c.position.x=-90});
  F.lanterns.forEach((l,k)=>{const s=1.5+Math.sin(t*3+k)*.15;l.scale.set(s,s,1)});
  if(F.water)F.water.material.emissiveIntensity=.22+Math.sin(t*1.5)*.06;
  F.smoke.forEach(s=>{const k=(t*.25+s.o)%1;s.p.position.set(20.5+k*.6,5.6+k*3.2,-2.8+Math.sin(k*6)*.3);const sc=.4+k*1.1;s.p.scale.setScalar(sc);s.p.material.opacity=.45*(1-k)});
  animSparkles(F.dust,t);
  for(const P2 of F.plots)if(P2.spark.visible)P2.spark.position.y=1.9+Math.sin(t*3)*.12;
  F.ringT+=dt;F.ring.material.opacity=Math.max(0,.9-F.ringT*1.3);F.ring.scale.setScalar(1+F.ringT*1.5);
  updFx(F,dt);
  F.tick+=dt;if(F.tick>.5){F.tick=0;syncPlots(false);refreshSheet()}
  placeCamera(Math.min(1,dt*5));
}
function addXP(n){const f=farmOf(cur()),b=farmLevel(f.xp).l;f.xp+=n;const a=farmLevel(f.xp).l;
  if(a>b){const s=SEEDS.filter(x=>x.lv===a).map(x=>x.e+' '+x.name),an=ANIMALS.filter(x=>x.lv===a).map(x=>x.e+' '+x.name);
    setTimeout(()=>dialog(MAYOR,[`🎉 Your farm reached level ${a}!`,(s.length||an.length)?`New on your farm: ${[...s,...an].join(', ')}.`:'Keep growing! More things unlock at higher levels.']),700)}}
function tapAnimal(idx){
  const an=F.animals[idx];if(!an)return;const left=an.A.mins*60000-(Date.now()-an.a.last);
  if(left>0){toast(`${an.A.e} ${an.A.name}: ${an.A.pe} ready in ${fmtLeft(left)}`);return}
  const f=farmOf(cur());an.a.last=Date.now();f.barn[an.A.prod]=(f.barn[an.A.prod]||0)+1;addXP(an.A.xp);save();
  const p=an.g.position;addFx(F,`+1 ${an.A.pe}  +${an.A.xp} XP`,p.x,2,p.z);updateHud();
}
function openSheet(kind,arg){F.sheet={kind,arg};F.sheetKey='';refreshSheet(true)}
function closeSheet(){if(F)F.sheet=null;const el=$('#sheet');if(el){el.className='sheet';el.innerHTML=''}}
function refreshSheet(force){
  if(!F||!F.sheet)return;const el=$('#sheet');if(!el)return;
  const {kind,arg}=F.sheet,f=farmOf(cur());let key=kind,live=null;
  if(kind==='plot'){const pl=f.plots[arg],info=plotInfo(pl);key+=arg+(arg>=f.unlocked?'L'+cur().gems:!pl?'E'+cur().gems:pl.crop+info.stage+pl.watered);if(info&&info.stage<3)live=info}
  if(!force&&key===F.sheetKey){if(live){const l=$('#left'),b=$('#pbar');if(l)l.textContent=fmtLeft(live.left);if(b)b.style.width=Math.round(live.prog*100)+'%'}return}
  F.sheetKey=key;el.className='sheet show';
  el.innerHTML=`<button class="sheet-x" data-act="closeSheet" aria-label="Close">✕</button>`+(kind==='plot'?sheetPlot(arg):sheetBarn());
}
function needCoins(n){return `<p class="muted">You need ${n} more 🪙. Coins come from Math School.</p><button class="b sm" data-act="quick" data-id="tricks">🦉 Walk to Math School</button>`}
function sheetPlot(i){
  const p=cur(),f=farmOf(p),lv=farmLevel(f.xp).l;
  if(i>=f.unlocked){const cost=plotCost(f);
    return `<h3>New field patch</h3><p>Grow more at once with another patch of soil.</p><button class="b" data-act="buyPlot" ${p.gems<cost?'disabled':''}>Buy a patch for ${cost} 🪙</button>${p.gems<cost?needCoins(cost-p.gems):''}`}
  const pl=f.plots[i],info=plotInfo(pl);
  if(!pl){const cheapest=Math.min(...SEEDS.filter(s=>s.lv<=lv).map(s=>s.cost));
    return `<h3>What shall we plant?</h3><div class="seedgrid">${SEEDS.map(S=>{const lock=lv<S.lv,poor=p.gems<S.cost;
      return `<button class="seed" data-act="plant" data-i="${i}" data-id="${S.id}" ${lock||poor?'disabled':''}><span class="e">${lock?'🔒':ico('seed:'+S.id,S.e)}</span><b>${S.name}</b><small>${lock?`Farm level ${S.lv}`:`${S.cost} 🪙 · ${S.mins} min`}</small></button>`}).join('')}</div>${p.gems<cheapest?needCoins(cheapest-p.gems):''}`}
  if(info.stage<3)return `<h3>${ico('seed:'+info.S.id,info.S.e)} ${info.S.name} is growing</h3><div class="pbarw"><i id="pbar" style="width:${Math.round(info.prog*100)}%"></i></div><p>Ready in <b id="left">${fmtLeft(info.left)}</b></p>${pl.watered?'<p class="muted">💧 Watered! It\'s growing faster.</p>':`<button class="b" data-act="water" data-i="${i}">💧 Water it to grow faster</button>`}<p class="muted">While you wait, earn more coins at Math School.</p>`;
  return `<h3>${ico('seed:'+info.S.id,info.S.e)} ${info.S.name} is ready!</h3><button class="b" data-act="harvest" data-i="${i}">🧺 Harvest</button>`;
}
function sheetBarn(){
  const f=farmOf(cur()),L=farmLevel(f.xp);
  const prods=[...SEEDS.map(s=>[s.id,s.e,s.name]),...ANIMALS.map(a=>[a.prod,a.pe,a.pn])];
  return `<h3>🌾 Barn</h3><p>Farm level <b>${L.l}</b>: ${L.into} / ${L.need} XP to the next level</p><div class="pbarw"><i style="width:${Math.round(L.into/L.need*100)}%"></i></div>
  <div class="barn">${prods.map(([id,e,nm])=>`<div class="bi"><span class="e">${e}</span><b>${f.barn[id]||0}</b><small>${nm}</small></div>`).join('')}</div>
  <p class="muted">Harvest crops and collect from animals to earn XP. Higher farm levels unlock new seeds and animals.</p>`;
}
function plant(i,id){const p=cur(),f=farmOf(p),S=SEEDS.find(s=>s.id===id);
  if(!S||p.gems<S.cost||farmLevel(f.xp).l<S.lv||f.plots[i]||i>=f.unlocked)return;
  p.gems-=S.cost;f.plots[i]={crop:id,planted:Date.now(),watered:false};save();syncPlots(false);updateHud();
  const {x,z}=plotPos(i);addFx(F,`🌱 −${S.cost} 🪙`,x,1.6,z);refreshSheet(true)}
function water(i){const f=farmOf(cur()),pl=f.plots[i];if(!pl||pl.watered)return;pl.watered=true;save();syncPlots(false);const {x,z}=plotPos(i);addFx(F,'💧💧💧',x,1.6,z);refreshSheet(true)}
function harvest(i){const f=farmOf(cur()),pl=f.plots[i],info=plotInfo(pl);if(!info||info.stage<3)return;
  f.barn[pl.crop]=(f.barn[pl.crop]||0)+4;f.plots[i]=null;addXP(info.S.xp);save();syncPlots(false);updateHud();
  const {x,z}=plotPos(i);addFx(F,`+4 ${info.S.e}  +${info.S.xp} XP`,x,1.8,z);refreshSheet(true)}
function buyPlot(){const p=cur(),f=farmOf(p),c=plotCost(f);if(p.gems<c||f.unlocked>=12)return;p.gems-=c;f.unlocked++;save();syncPlots(false);updateHud();closeSheet();toast('New patch ready to plant!')}

Object.assign(ACT,{
  choose:d=>{DATA.current=d.id;LASTPOS=null;save();go('town')},
  pickGrade:d=>{const v=$('#newname').value;NEWGRADE=d.g;rPlayers();$('#newname').value=v},
  overview:()=>{   // toggle the whole-farm view; on a tall screen, turn so the farm's long side runs down the screen
    if(CAM.back){CAM.zoom=CAM.back.zoom;CAM.yaw=CAM.back.yaw;CAM.back=null;return}
    CAM.back={zoom:CAM.zoom,yaw:CAM.yaw};
    if(F.camera.aspect<1)CAM.yaw=Math.round((CAM.yaw-Math.PI/2)/Math.PI)*Math.PI+Math.PI/2;
    CAM.zoom=farmZoomMax()},
  addPlayer:()=>{const v=($('#newname').value||'').trim();if(!v)return $('#newname').focus();const p=newPlayer(v.slice(0,16),NEWGRADE);DATA.players.push(p);save();rPlayers()},
  mayorTalk:()=>mayorTalk(),
  quick:(q=>d=>{if(F&&G.stage===F){const z=F.zones.find(z=>z.id===d.id);if(z){if(Math.hypot(z.x-F.player.position.x,z.z-F.player.position.z)<z.r)triggerZone(z);else walkTo(z.x,z.z,null)}return}q(d)})(ACT.quick),
  closeSheet:()=>closeSheet(),
  plant:d=>plant(+d.i,d.id),water:d=>water(+d.i),harvest:d=>harvest(+d.i),buyPlot:()=>buyPlot()
});
onPageKey=e=>{if(UI.screen==='town'&&F&&G.stage===F){const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s'].includes(k)){e.preventDefault();KEYS.add(k)}}};
startPage({players:rPlayers,town:rTown},()=>cur()?{screen:'town'}:{screen:'players'});
