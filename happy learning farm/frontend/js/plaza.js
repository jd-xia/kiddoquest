/* Happy Learning Farm — 广场 / plaza (index.html): player select + the 3D farm square.
   Walking into a building opens that building's own page. */
/* ---------- players ---------- */
let NEWGRADE=DEFAULT_GRADE,NEWLOOK='girl';
function rPlayers(){
  const signed=typeof cloudToken==='function'&&!!cloudToken();
  const accountList=signed&&typeof cloudPlayersHtml==='function'?cloudPlayersHtml():null;
  const canAdd=signed?(typeof cloudKidCount==='function'&&cloudKidCount()!=null&&cloudKidCount()<CLOUD_KID_MAX):DATA.players.length<6;
  const addAct=signed?'cloudAddKid':'addPlayer';
  $('#app').innerHTML=`
  <div class="hallcorner">${typeof linkLampHTML==='function'?linkLampHTML():''}${typeof hallMarkHTML==='function'?hallMarkHTML('pill hallpill'):''}</div>
  <h1>Happy Learning Farm</h1>
  ${npcHTML(MAYOR,signed?`Hello! This Google account can have ${CLOUD_KID_MAX} kids. Tap who is playing.`:'Hello! Who is playing today? Tap your name.')}
  ${accountList!=null?accountList:`<div class="players">${DATA.players.map(p=>`<div class="playerrow"><button class="player" data-act="choose" data-id="${p.id}"><div class="e">${avE(p)}</div><div class="nm">${esc(p.name)}</div>${p.code?`<div class="pcode">${esc(p.code)}</div>`:''}<div class="muted"><span class="tag good">${gradeName(gradeOf(p))}</span> ⭐ ${totalStars(p)} · 🪙 ${p.gems}</div></button><button class="b ghost sm" data-act="cloudCloseAsk" data-id="${p.id}">Close</button></div>`).join('')}</div>`}
  ${signed&&typeof cloudSaveLocalHtml==='function'?cloudSaveLocalHtml():''}
  ${canAdd?`<h3>${signed?'Add a child':'New player'}</h3><div style="display:flex;gap:8px;flex-wrap:wrap;max-width:520px"><input type="text" id="newname" maxlength="16" placeholder="Name" aria-label="New player name">${GRADES.map(g=>`<button class="b ${NEWGRADE===g.id?'':'ghost'}" data-act="pickGrade" data-g="${g.id}" aria-pressed="${NEWGRADE===g.id}">${g.name}</button>`).join('')}${['girl','boy'].map(id=>{const L=LOOKS.find(l=>l.id===id);return `<button class="b ${NEWLOOK===id?'':'ghost'}" data-act="pickNewLook" data-id="${id}" aria-pressed="${NEWLOOK===id}" aria-label="${L.name}">${L.e}</button>`}).join('')}<button class="b" data-act="${addAct}">Add</button></div>`:''}
  ${typeof cloudBarHtml==='function'?cloudBarHtml():''}
  <div class="cloudbar"><h3>Start again</h3><p class="muted">Every child on this device goes back to a new farm with 1000 coins. A saved farm stays until you open Sync and tap Upload.</p>
  <button class="b ghost" data-act="resetAll">${resetArmed?'Tap again to reset every child':'Reset every child'}</button>
  <p class="muted">Close removes one child. Type the name again. A saved child is removed from this device and from the account.</p>
  <button class="b ghost" data-act="cloudCloseCurrent">Close this child</button></div>`;
}
const BOUND={x:26.5,z:17.5}, PEN={x0:9,x1:16.5,z0:-6,z1:3};
const SITES=[{id:'tricks',x:-17,z:-13},{id:'soon1',x:-6,z:-13},{id:'soon2',x:5,z:-13},{id:'soon3',x:16,z:-13}];

/* ===================== FARM ===================== */
function inField(x,z){return Math.abs(x)<6.7&&z>-6.2&&z<4.2}
function inMeadow(x,z){return x>-23.4&&x<-14.7&&z>11.1&&z<17.2}
function onPath(x,z){return (Math.abs(z+9.2)<1.9&&Math.abs(x)<26)||(Math.abs(x+11)<1.9&&z>-9.5&&z<9)||(Math.abs(z-7.2)<1.9&&x>-18&&x<22)||(Math.abs(x)<1.9&&z>7&&z<13.4)||(Math.abs(z-9.2)<1.9&&x>19&&x<22.5)}
function farmHeight(x,z){const d=Math.max(Math.abs(x)/29,Math.abs(z)/20);return smooth(1.05,1.9,d)*(3.2+2.6*noise2(x*.07,z*.07))+smooth(1.9,3.2,d)*6}
function buildFarm(){
  if(!engine())return null;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,600);
  F={scene,camera,hits:[],npcs:[],zones:[],baseObs:[],obs:[],plots:[],animals:[],fx:[],t:0,tick:0,camPos:new THREE.Vector3(),yaw:CAM.yaw,stuck:0,moving:false,
    update:farmUpdate,onTap:farmTap,hover:farmHover,unhover:hideMarks,onDrag:dx=>{CAM.yaw-=dx*.008},rotate:d=>{CAM.yaw+=d*Math.PI/4},zoom:d=>{CAM.zoom=Math.max(.6,Math.min(farmZoomMax(),CAM.zoom*Math.pow(1.22,d)))},
    leave(){if(F.player&&!LASTPOS)LASTPOS={x:F.player.position.x,z:F.player.position.z};KEYS.clear()}};
  scene.add(skyDome('#4E95E0','#FFE7C4','#BFD9A2'));scene.fog=new THREE.Fog(col('#F5E3C6'),60,170);
  F.sun=addLights(scene,{sky:'#E4EEF6',ground:'#6A8A52',hemi:.62,sun:'#FFF1DE',si:1.65,pos:[28,30,18],range:34});F.rim=new THREE.Color(.95,.93,.9);F.bloom=.14;F.vig=.2;F.sat=1.02;F.con=.05;
  buildFarmWorld();return F;
}
/* The farm's ground is painted onto one canvas like an illustration: mottled grass, little flowers,
   and wide winding dirt roads with soft darker edges and pebbles. Roads follow onPath() below. */
const FARM_W=60,FARM_D=42,ROADS=[[[-24.5,-9.2],[24.5,-9.2]],[[-11,-9.2],[-11,7.2]],[[-16.5,7.2],[20.5,7.2]],[[0,7.2],[0,11.6]],[[20,7.2],[20.5,9.2],[22,9.2]]];
function paintGround(S){
  const ppu=32,W=FARM_W*ppu,H=FARM_D*ppu,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  const X=x=>(x+FARM_W/2)*ppu,Z=z=>(z+FARM_D/2)*ppu,R=()=>Math.random();
  g.fillStyle='#5DAF3C';g.fillRect(0,0,W,H);
  const greens=['#6CBF45','#4FA234','#77C84C','#58AA3A','#68B842'];
  for(let i=0;i<2600;i++){g.globalAlpha=.22;g.fillStyle=greens[i%5];g.beginPath();g.arc(R()*W,R()*H,8+R()*46,0,7);g.fill()}
  g.globalAlpha=.35;g.strokeStyle='#3E8A2E';g.lineWidth=2;g.lineCap='round';
  for(let i=0;i<9000;i++){const x=R()*W,y=R()*H;g.beginPath();g.moveTo(x,y);g.lineTo(x+(R()-.5)*5,y-5-R()*6);g.stroke()}
  g.globalAlpha=.9;for(let i=0;i<700;i++){g.fillStyle=['#FFFFFF','#FFE066','#FFB3D1'][i%3];g.beginPath();g.arc(R()*W,R()*H,1.6+R()*1.6,0,7);g.fill()}
  const wob=pts=>{const out=[];for(let k=0;k<pts.length-1;k++){const [ax,az]=pts[k],[bx,bz]=pts[k+1],n=Math.max(2,Math.round(Math.hypot(bx-ax,bz-az)/2));
    for(let s=0;s<n;s++){const t=s/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t,w=Math.sin(x*.7+z*1.3)*.22;out.push([x+(bz!==az?w:0),z+(bx!==ax?w:0)])}}out.push(pts[pts.length-1]);return out};
  const stroke=(pts,width,col)=>{g.strokeStyle=col;g.lineWidth=width*ppu;g.lineJoin=g.lineCap='round';g.beginPath();pts.forEach(([x,z],k)=>k?g.lineTo(X(x),Z(z)):g.moveTo(X(x),Z(z)));g.stroke()};
  const paths=ROADS.map(wob);g.globalAlpha=1;
  paths.forEach(p=>stroke(p,3.5,'#9A6634'));paths.forEach(p=>stroke(p,3,'#C08A50'));paths.forEach(p=>stroke(p,1.7,'#CC985C'));
  g.globalAlpha=.55;for(const p of paths)for(let i=0;i<p.length*6;i++){const [x,z]=p[Math.floor(R()*p.length)];   // pebbles and wheel marks
    g.fillStyle=['#A9763F','#DDB57A','#8E5E2E'][i%3];g.beginPath();g.arc(X(x+(R()-.5)*2.4),Z(z+(R()-.5)*2.4),1.5+R()*3,0,7);g.fill()}
  g.globalAlpha=1;
  const tex=ctex(c);tex.anisotropy=8;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(FARM_W,FARM_D).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:tex,roughness:.95}));
  m.position.y=.012;m.receiveShadow=true;S.add(m);F.groundPaint=m;
}
function buildFarmWorld(){
  const S=F.scene,markHit=(o,a)=>{o.userData.act=a;F.hits.push(o)};F.markHit=markHit;
  F.ground=terrain(S,{size:240,seg:120,height:farmHeight,c1:'#7CC753',c2:'#68B946',c3:'#8BD45E',c4:'#5AA03F'});
  const flat=(w,d,color,x,z,y)=>{const m=new THREE.Mesh(rbox(w,d,.06,.03),mat(color,{r:.95}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;S.add(m);return m};
  paintGround(S);
  const yard=new THREE.Mesh(new THREE.PlaneGeometry(13.4,10.4),earthMat('yard'));
  yard.rotation.x=-Math.PI/2;yard.position.set(0,.02,-1);yard.receiveShadow=true;S.add(yard);
  for(let k=0;k<22;k++){const a=k/22*Math.PI*2+Math.sin(k)*.15,R=100+(k%4)*12,h=20+((k*37)%25);
    const m=mesh(new THREE.ConeGeometry(16+(k%3)*6,h,7),k%2?'#7FA2C2':'#90B2D0',Math.cos(a)*R,h/2+4,Math.sin(a)*R,{flat:true,r:1});m.castShadow=false;S.add(m);
    if(h>34){const c=mesh(new THREE.ConeGeometry((16+(k%3)*6)*.32,h*.32,7),'#F4F7FB',Math.cos(a)*R,h+4-h*.16,Math.sin(a)*R,{flat:true,r:1});c.castShadow=false;S.add(c)}}
  const fence=new THREE.Group();S.add(fence);fenceRect(-27.5,27.5,-18.5,18.5,2.5,'#C9A27A',fence);
  for(const [x,z] of[[-31,-12],[-32,0],[-31,12],[31,-12],[32,0],[31,12],[-20,-22],[-8,-23],[4,-22],[18,-23],[-22,22],[-6,23],[10,22],[24,23],[-36,-22],[36,22],[-40,8],[40,-6],[0,-28],[-14,27]]){const y=farmHeight(x,z);const t=((x+z)&1)?pine(x,z,1.2):roundTree(x,z,1.15);t.position.y=y;S.add(t)}
  for(const [x,z] of[[-25,15],[25,-16],[-25,-16],[13.5,14]]){S.add(roundTree(x,z,1));F.baseObs.push({x0:x-.8,x1:x+.8,z0:z-.8,z1:z+.8})}
  F.clouds=[];for(let k=0;k<7;k++){const c=cloud(-70+k*22,24+(k%3)*4,-40+(k%2)*18-(k%3)*10,1.4+(k%3)*.4);S.add(c);F.clouds.push(c)}
  // buildings
  for(const s of SITES){const D=schoolView(s.id),g=D.open?buildSchool(D.color,D.sign):buildSite(D.color,D.sign);g.position.set(s.x,0,s.z);S.add(g);markHit(g,{kind:'zone',id:s.id});
    F.baseObs.push({x0:s.x-3.8,x1:s.x+3.8,z0:s.z-2.9,z1:s.z+2.7});
    F.zones.push({id:s.id,kind:D.open?'school':'closed',x:s.x,z:s.z+3.3,r:.9,out:{x:s.x,z:s.z+4.9},name:D.sign});
    const soonFor=D.topics.length?` for ${gradeName(gradeOf(cur()))}`:'';   // Brain Boost exists but has no islands for this grade yet
    addNPC({npc:D.npc,x:s.x+3.2,z:s.z+3.8,line:D.open?'Hoo! Earn coins here!':'Opening soon!',
      talk:D.open?[`Hoo-hoo! I'm ${D.npc.name}.`,`${D.name} has ${D.topics.length} maths islands. Number monsters are waiting on every one!`,'Every answer you get right first time earns a coin 🪙 for your farm. Walk through my door to start!']
                 :[`Hello! I'm ${D.npc.name}.`,`This ${D.sign}${soonFor} is still being built. Come back soon!`]})}
  const mk=buildMarket();mk.position.set(-17,0,5);mk.rotation.y=Math.PI/2;S.add(mk);markHit(mk,{kind:'zone',id:'market'});
  F.baseObs.push({x0:-18.3,x1:-16.1,z0:2.7,z1:7.3});
  F.zones.push({id:'market',kind:'market',x:-15.2,z:5,r:.9,out:{x:-13.6,z:5},name:'Farm Market'});
  addNPC({npc:MERCHANT,x:-15,z:8.2,line:'Animals, decor, outfits!',talk:['Mo the Merchant, at your service!','Spend your coins here on animals, decorations, new outfits and new land.','I buy crops you planted and harvested, and fish you caught. A harvest of 4 sells for about 120% of the seed price. Each fish has its own price.','Walk up to my stall to shop. The West Meadow is also for sale up the hill on the left.']});
  const barn=buildBarn();barn.position.set(22.5,0,-1);barn.rotation.y=-Math.PI/2;S.add(barn);markHit(barn,{kind:'zone',id:'barn'});
  F.baseObs.push({x0:19.9,x1:25.2,z0:-4.2,z1:2.2});
  F.zones.push({id:'barn',kind:'barn',x:19.3,z:-1,r:.9,out:{x:17.8,z:-1},name:'Barn'});
  const st=buildStudio();st.position.set(24,0,9.2);st.rotation.y=-Math.PI/2;S.add(st);markHit(st,{kind:'zone',id:'studio'});   // on the right edge, door facing the path, so it never hides the player
  F.baseObs.push({x0:21.6,x1:26.4,z0:6.4,z1:12}); 
  F.zones.push({id:'studio',kind:'studio',x:21.2,z:9.2,r:.9,out:{x:19.6,z:9.2},name:'Art Studio'});
  addNPC({npc:ARTIST,x:21,z:12.9,line:'Draw your own farm!',talk:["Squawk! I'm Polly, the artist.",'In my Art Studio you can draw yourself, your animals, crops and friends. Take a photo or draw right on the screen!','Or tap 🎨 Paint, then tap anything on the farm to redraw it.']});
  const bd=buildBoard();bd.position.set(-9,0,9);S.add(bd);markHit(bd,{kind:'zone',id:'board'});
  F.baseObs.push({x0:-10.5,x1:-7.5,z0:8.6,z1:9.4});
  F.zones.push({id:'board',kind:'board',x:-9,z:10,r:.8,out:{x:-9,z:11.6},name:'Progress Board'});
  addNPC({npc:ELLIE,x:-11.2,z:10.4,line:'Grown-ups: records here!',talk:['I\'m Ellie. I keep all the records.','Grown-ups can walk up to the board to see stars, scores and practice tips.']});
  addNPC({npc:MAYOR,x:2.6,z:11.4,line:'Welcome to the farm!',mayor:true});
  const pondLv=fishOf(cur()).pond,pond=buildPond(pondLv>=2);pond.position.set(8,0,15);F.scene.add(pond);F.markHit(pond,{kind:'zone',id:'fish'});
  const pw=pondLv>=2?4.2:2.8,pd=pondLv>=2?2.6:1.8;
  F.baseObs.push({x0:8-pw+0.4,x1:8+pw-0.4,z0:15-pd+0.3,z1:15+pd-0.2});
  F.zones.push({id:'fish',kind:'fish',x:8,z:15-pd-1.3,r:1.05,out:{x:8,z:15-pd-2.6},name:'Fishing Pond'});
  addNPC({npc:ANGLER,x:10.2,z:15-pd-1.1,line:pondLv?'The fish are biting!':'Build a pond here!',talk:pondLv?['I\'m Finn. The pond is yours.','Buy a rod and some worms, then cast.','Choose the 1 to 9 times table, or tricks you have cleared. Get 2 answers right in a row. A wrong answer does not scare the fish away. The time limit starts at 30 seconds, and you can change it.']:['I\'m Finn. This shore is empty.','Spend some coins to build a fishing pond.','Then you can buy tackle and fish.']});
  const ff=new THREE.Group();S.add(ff);   // wooden fence round the vegetable field, with a gap at the front
  for(const [ax,az,bx,bz] of[[-7,-6.6,7,-6.6],[-7,-6.6,-7,4.6],[7,-6.6,7,4.6],[-7,4.6,-1.6,4.6],[1.6,4.6,7,4.6]])fenceLine(ff,ax,az,bx,bz,'#B07A45');
  buildProps(S);
  const pen=new THREE.Group();S.add(pen);fenceRect(PEN.x0,PEN.x1,PEN.z0,PEN.z1,1.5,'#B07A45',pen);
  pen.add(mesh(rbox(1.8,.5,.6,.08),'#8B5A2B',PEN.x1-1.4,.25,PEN.z1-.8));pen.add(mesh(BOX(1.55,.05,.42),new THREE.MeshStandardMaterial({color:col('#4FB6E6'),roughness:.15}),PEN.x1-1.4,.5,PEN.z1-.8));
  for(const [x,z] of[[PEN.x0+1.2,PEN.z0+1.2],[PEN.x0+2.4,PEN.z0+.9]]){const h=mesh(CYL(.5,.5,.9,18),'#E9C46A',x,.45,z,{r:.95});h.rotation.x=Math.PI/2;h.rotation.z=.4;pen.add(h)}
  const ps=signPlane('Animal Pen','#2FA36B',2.4);ps.position.set((PEN.x0+PEN.x1)/2,1.45,PEN.z1+.06);pen.add(ps);
  const penFloor=new THREE.Mesh(rbox(PEN.x1-PEN.x0-.3,PEN.z1-PEN.z0-.3,.05,.02),mat('#C9B07A',{r:1}));penFloor.rotation.x=-Math.PI/2;penFloor.position.set((PEN.x0+PEN.x1)/2,.02,(PEN.z0+PEN.z1)/2);penFloor.receiveShadow=true;S.add(penFloor);
  F.baseObs.push({x0:PEN.x0,x1:PEN.x1,z0:PEN.z0,z1:PEN.z1});
  F.animalGroup=new THREE.Group();S.add(F.animalGroup);
  for(let i=0;i<HOME_PLOTS+LANDS.reduce((n,L)=>n+L.n,0);i++){const {x,z}=plotPos(i),g=new THREE.Group();g.position.set(x,0,z);S.add(g);
    const lip=new THREE.Mesh(new THREE.PlaneGeometry(2.32,2.32),earthMat('lip'));lip.rotation.x=-Math.PI/2;lip.position.y=.04;g.add(lip);
    const soil=new THREE.Mesh(tilledGeo(),earthMat('dry'));soil.rotation.x=-Math.PI/2;soil.position.y=.1;soil.receiveShadow=true;soil.castShadow=true;g.add(soil);markHit(soil,{kind:'plot',i});
    const ridges=new THREE.Group();g.add(ridges);
    const crop=new THREE.Group();g.add(crop);const spark=emojiSprite('✨',.9);spark.position.y=1.9;spark.visible=false;g.add(spark);
    const lock=emojiSprite('🔒',.8);lock.position.y=.8;lock.visible=false;g.add(lock);
    F.plots.push({g,soil,lip,ridges,crop,spark,lock,key:''})}
  buildMeadow(S,markHit);
  // nature scatter
  const okIn=(x,z)=>!inField(x,z)&&!inMeadow(x,z)&&!onPath(x,z)&&!F.baseObs.some(o=>x>o.x0-.6&&x<o.x1+.6&&z>o.z0-.6&&z<o.z1+.6)&&Math.hypot(x-(-3),z-14)>3.2&&Math.hypot(x+23,z+2)>2&&!(z>3&&z<7.4&&x>-19&&x<-12);
  scatter(S,new THREE.ConeGeometry(.06,.38,3).translate(0,.19,0),['#5DA544','#6DB650','#7CC35A','#4F9A3D'],2600,()=>{const x=(Math.random()-.5)*54,z=(Math.random()-.5)*36;return okIn(x,z)?{x,z}:null},.8,1.4,false,{wind:.5});
  scatter(S,new THREE.ConeGeometry(.08,.5,3).translate(0,.25,0),['#5DA544','#6DB650','#4F9A3D'],2200,()=>{const x=(Math.random()-.5)*110,z=(Math.random()-.5)*80;if(Math.abs(x)<28.5&&Math.abs(z)<19.5)return null;return{x,z,y:farmHeight(x,z)}},.9,1.6,false,{wind:.45});
  scatter(S,SPH(.09,6,5).translate(0,.28,0),['#FF7AA8','#FFD43B','#FFFFFF','#B98CFF','#FF9F45'],320,()=>{const x=(Math.random()-.5)*54,z=(Math.random()-.5)*36;return okIn(x,z)&&(Math.abs(x)>8||Math.abs(z)>8)?{x,z}:null},.8,1.3,false,{flatShading:false,roughness:.6});
  scatter(S,ICO(.6,0).translate(0,.35,0),['#3F8A3A','#4C9A44','#2F7A36'],60,()=>{const e=Math.random()<.5,x=e?(Math.random()<.5?-1:1)*(25.6+Math.random()*1.2):(Math.random()-.5)*52,z=e?(Math.random()-.5)*34:(Math.random()<.5?-1:1)*(16.6+Math.random()*1.2);return okIn(x,z)?{x,z}:null},.8,1.5,true);
  scatter(S,ICO(.45,0).translate(0,.15,0),['#A7A3A0','#8F8C88','#BEB9B2'],40,()=>{const x=(Math.random()-.5)*100,z=(Math.random()-.5)*70;if(Math.abs(x)<27&&Math.abs(z)<18&&!okIn(x,z))return null;return{x,z,y:Math.abs(x)<28&&Math.abs(z)<19?0:farmHeight(x,z)}},.6,1.6,true);
  F.dust=sparkles(S,140,{x:56,z:38,y0:.5,h:5},'#FFF4C2',.16);
  buildDecor();
  F.butterflies=[0,1,2].map(()=>{const b=emojiSprite('🦋',.6);S.add(b);return b});
  const ring=new THREE.Mesh(new THREE.RingGeometry(.3,.46,32),new THREE.MeshBasicMaterial({color:'#FFFFFF',transparent:true,opacity:0,depthWrite:false,toneMapped:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.06;S.add(ring);F.ring=ring;F.ringT=9;
  F.hoverMark=makeMark(.5,{opacity:.6});F.walkMark=makeMark(.55,{arrow:true,h:1.3});F.selMark=makeMark(1,{arrow:true});   // pointer marks (engine3d.js)
  S.add(F.hoverMark,F.walkMark,F.selMark);
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
/* Art Studio: a pastel cottage with a giant paint palette, a brush and an easel. Door faces +z. */
function buildStudio(){const g=new THREE.Group();
  g.add(mesh(rbox(5.6,.3,4.6,.08),'#CFC3B2',0,.15,0));
  g.add(mesh(rbox(5.2,3,4.2,.14),'#FFF0F6',0,1.75,0,{r:.85}));
  const roof=gableRoof(5.8,5,2.1,'#8B5CF6');roof.position.y=3.25;g.add(roof);
  g.add(mesh(rbox(5.9,.22,5.1,.08),'#FFFFFF',0,3.25,0));
  ['#E5484D','#FF8A1F','#FFD43B','#2FA36B','#3E7BFA'].forEach((c,k)=>g.add(mesh(SPH(.16,10,8),c,-2+k,3.33,2.55,{r:.4})));   // paint drips on the eave
  g.add(mesh(rbox(1.5,2.2,.2,.08),'#8B5CF6',0,1.25,2.12));g.add(mesh(rbox(1.1,1.85,.1,.05),'#4A3020',0,1.12,2.2,{r:.5}));
  for(const x of[-1.75,1.75]){g.add(mesh(rbox(1.1,1,.12,.05),'#FFFFFF',x,1.95,2.12));g.add(mesh(BOX(.9,.8,.08),new THREE.MeshStandardMaterial({color:col('#FFE3F1'),roughness:.15,emissive:col('#FFC8E4'),emissiveIntensity:.25}),x,1.95,2.16))}
  const pal=new THREE.Group();pal.position.set(0,4.15,2.05);g.add(pal);   // giant palette sign
  const pm=mesh(CYL(1.05,1.05,.14,32),'#E9C99A',0,0,0,{r:.7});pm.rotation.x=Math.PI/2;pm.scale.set(1.25,1,.85);pal.add(pm);
  [['#E5484D',-.75,.25],['#FFD43B',-.3,.5],['#2FA36B',.25,.5],['#3E7BFA',.75,.25],['#EC6FA9',.6,-.3]].forEach(([c,x,y])=>{const b=mesh(SPH(.17,12,10),c,x,y,.1,{r:.3});b.scale.z=.45;pal.add(b)});
  const br=new THREE.Group();br.position.set(1.9,1.4,2.4);br.rotation.z=-.5;g.add(br);   // a big brush leaning on the wall
  br.add(mesh(CYL(.08,.1,2.4,10),'#8B5CF6',0,0,0,{r:.5}));br.add(mesh(CYL(.12,.1,.3,10),'#F2B705',0,-1.3,0,{m:.6,r:.3}));br.add(mesh(new THREE.ConeGeometry(.14,.45,10),'#E5484D',0,-1.65,0,{r:.6}));
  const ea=new THREE.Group();ea.position.set(-2.8,0,2.6);ea.rotation.y=.4;g.add(ea);   // easel with a canvas
  for(const x of[-.35,.35]){const l=mesh(CYL(.04,.05,1.9,6),'#8B5A2B',x,.95,0);l.rotation.z=x*.25;ea.add(l)}
  ea.add(mesh(rbox(1,.8,.06,.02),'#FFFFFF',0,1.35,.06));ea.add(mesh(SPH(.18,10,8),'#FFD43B',-.2,1.45,.1));ea.add(mesh(BOX(.45,.1,.02),'#3E7BFA',.15,1.2,.1));
  const sign=signPlane('Art Studio','#8B5CF6',2.6);sign.position.set(0,2.95,2.2);g.add(sign);
  return g}
function paintTex(draw,w=128,h=128){
  const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  const t=ctex(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
const EARTH={};
function earthMat(kind){
  if(EARTH[kind])return EARTH[kind];
    const map=paintTex((g,w,h)=>{
    const sod=kind==='sod'||kind==='yard';
    const base=sod?(kind==='yard'?'#4C8636':'#5A9040'):kind==='wet'?'#3A2616':kind==='lip'?'#4A301C':kind==='ridge'?'#5C3A22':'#6E4528';
    g.fillStyle=base;g.fillRect(0,0,w,h);
      if(kind==='dry'||kind==='wet'){for(let row=0;row<3;row++){const y=h*((row+.25)/3),grd=g.createLinearGradient(0,y-h*.09,0,y+h*.09);
      grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(.5,kind==='wet'?'rgba(16,8,4,.6)':'rgba(36,20,10,.45)');grd.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=grd;g.fillRect(0,y-h*.09,w,h*.18)}}
    const specks=sod?['#6AAA46','#3C6E2A','#86B456','#2E5820','#8A7044']:kind==='wet'?['#2A1A10','#5A3A24','#1A100C','#6A4A30','#24160E']:['#8C5C36','#3E2616','#A66C40','#2A1A10','#C4A078','#5A3822'];
    for(let i=0;i<260;i++){g.globalAlpha=.2+((i*17)%10)/32;g.fillStyle=specks[i%specks.length];
      g.beginPath();g.ellipse((i*97)%w,(i*53)%h,2+(i*7)%16,1.4+(i*5)%10,(i%7)*.45,0,7);g.fill()}
    g.globalAlpha=.5;
    for(let i=0;i<30;i++){g.fillStyle=i%3?'#C8B496':'#24160E';
      g.beginPath();g.ellipse((i*61+20)%w,(i*47+11)%h,1.1+(i%3),.7+(i%2),i,0,7);g.fill()}
    if(!sod){g.globalAlpha=kind==='wet'?.32:.18;g.strokeStyle=kind==='wet'?'#1A100A':'#3A2416';g.lineWidth=1.1;
      for(let i=0;i<16;i++){const x=(i*29)%w,y=(i*41)%h;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+16,y-4,x+30,y+2);g.stroke()}}
    g.globalAlpha=1;
  },256,256);
  if(kind==='yard')map.repeat.set(3.2,2.5);
  const wet=kind==='wet';
  return EARTH[kind]=new THREE.MeshStandardMaterial({map,roughness:wet?.42:.97,metalness:wet?.04:0});
}
function tilledGeo(){
  if(EARTH.tilled)return EARTH.tilled;
  const geo=new THREE.PlaneGeometry(2.05,2.05,10,40),pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),v=y/2.05+.5;
    pos.setZ(i,Math.sin(v*Math.PI*6)*.072+Math.sin(x*8.4+y*2.2)*.012+Math.sin(x*3.1-y*6.5)*.008)}
  geo.computeVertexNormals();geo.userData.keep=true;return EARTH.tilled=geo;
}
function flatSoil(){
  if(EARTH.flatSoil)return EARTH.flatSoil;
  const geo=new THREE.PlaneGeometry(2.05,2.05);geo.userData.keep=true;return EARTH.flatSoil=geo;
}
function waterMat(){
  if(EARTH.water)return EARTH.water;
  const map=paintTex((g,w,h)=>{
    const grd=g.createRadialGradient(w*.46,h*.44,w*.02,w*.5,h*.52,w*.64);
    grd.addColorStop(0,'#6EB4C6');grd.addColorStop(.4,'#217090');grd.addColorStop(.78,'#0E455C');grd.addColorStop(1,'#082838');
    g.fillStyle=grd;g.fillRect(0,0,w,h);
    g.strokeStyle='rgba(198,230,236,.22)';g.lineWidth=1.3;
    for(let i=0;i<11;i++){g.beginPath();g.ellipse(w*(.28+(i*17)%50/100),h*(.26+(i*23)%48/100),w*(.06+(i%4)*.035),h*(.025+(i%3)*.018),i*.7,.2,4.4);g.stroke()}
    g.globalAlpha=.45;g.fillStyle='#D7F1F6';g.beginPath();g.ellipse(w*.4,h*.36,w*.055,h*.016,-.55,0,7);g.fill();
    g.globalAlpha=.16;g.fillStyle='#041E2C';
    for(let i=0;i<12;i++){g.beginPath();g.ellipse(w*(.16+(i*29)%68/100),h*(.18+(i*21)%64/100),w*.045,h*.02,i,0,7);g.fill()}
    g.globalAlpha=1;
  },256,256);
  const mat=new THREE.MeshStandardMaterial({map,roughness:.14,metalness:.1,transparent:true,opacity:.97,emissive:col('#0C3A4C'),emissiveIntensity:.08});
  mat.onBeforeCompile=shader=>{shader.uniforms.uTime=TIME;shader.fragmentShader='uniform float uTime;\n'+shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat ripple=sin(vUv.x*42.0+uTime*1.2)*sin(vUv.y*36.0-uTime*.85);\ndiffuseColor.rgb+=vec3(.045,.07,.08)*ripple;');};
  mat.customProgramCacheKey=()=>'pondwater';
  return EARTH.water=mat;
}
function pondSurface(){
  if(EARTH.pondGeo)return EARTH.pondGeo;
  const rings=14,segs=40,pos=[],uv=[],idx=[],row=segs+1;
  for(let r=0;r<=rings;r++){const t=r/rings;for(let s=0;s<=segs;s++){const a=s/segs*Math.PI*2,x=Math.cos(a)*t,y=Math.sin(a)*t;
    pos.push(x,y,Math.sin(a*5+t*9)*.012*(1-t));uv.push(x*.5+.5,y*.5+.5)}}
  for(let r=0;r<rings;r++)for(let s=0;s<segs;s++){const i=r*row+s;idx.push(i,i+row,i+1,i+1,i+row,i+row+1)}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(idx);geo.computeVertexNormals();geo.userData.keep=true;
  return EARTH.pondGeo=geo;
}
function lilyPad(x,z,sc,bloom){
  const g=new THREE.Group();g.position.set(x,.1,z);
  const pad=new THREE.Mesh(new THREE.CircleGeometry(.3*sc,14,0.35,5.6),new THREE.MeshStandardMaterial({color:col(bloom?'#3E8A44':'#2F7A38'),roughness:.72}));
  pad.rotation.x=-Math.PI/2;g.add(pad);
  const vein=new THREE.Mesh(new THREE.BoxGeometry(.02,.004,.42*sc),new THREE.MeshStandardMaterial({color:col('#1E5A28'),roughness:.8}));
  vein.rotation.x=-Math.PI/2;g.add(vein);
  if(bloom){const f=new THREE.Group();f.position.set(0,.04,0);g.add(f);
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2,p=mesh(SPH(.045,8,6),'#F6D5E4',Math.cos(a)*.06,.02,Math.sin(a)*.06,{r:.45});p.scale.set(1.2,.35,.6);f.add(p)}
    f.add(mesh(SPH(.03,8,6),'#F2C14E',0,.04,0,{r:.4}))}
  return g;
}
function bankFlower(petal,heart,h){
  const g=new THREE.Group();
  g.add(mesh(CYL(.028,.04,h,6),'#3C8C45',0,h*.5,0));
  for(const s of[-1,1]){const leaf=mesh(SPH(.12,8,6),'#4EAE55',s*.1,h*.42,0,{r:.55});leaf.scale.set(1.9,.28,.7);leaf.rotation.z=s*.9;g.add(leaf)}
  const head=new THREE.Group();head.position.set(0,h,.04);head.rotation.x=-.55;g.add(head);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,p=mesh(SPH(.085,8,6),petal,Math.cos(a)*.12,.02,Math.sin(a)*.12,{r:.4});p.scale.set(1.35,.28,.62);head.add(p)}
  head.add(mesh(SPH(.055,8,6),heart,0,.04,0,{r:.35}));
  return g;
}
function buildPond(wide){
  const g=new THREE.Group(),w=wide?4.2:2.8,d=wide?2.6:1.8;
  const bank=new THREE.Mesh(new THREE.CircleGeometry(1.16,48),earthMat('lip'));
  bank.rotation.x=-Math.PI/2;bank.scale.set(w,d,1);bank.position.y=.035;g.add(bank);
  const bowl=new THREE.Mesh(pondSurface(),waterMat());
  bowl.rotation.x=-Math.PI/2;bowl.scale.set(w,d,1);bowl.position.y=.06;g.add(bowl);
  for(let k=0;k<16;k++){const a=k/16*Math.PI*2+.15,rock=mesh(SPH(.13+(k%3)*.035,10,8),k%3?'#C4B6A4':'#8E8478',Math.cos(a)*w*1.06,.07,Math.sin(a)*d*1.06,{r:.9});
    rock.scale.set(1.25+(k%3)*.15,.38,.85);rock.rotation.y=a;g.add(rock)}
  [[-.32,.22,.85,1],[.5,-.12,.6,0],[-.08,-.32,.75,1],[.22,.4,.5,0]].forEach(([x,z,sc,bloom])=>g.add(lilyPad(x*w*.4,.0+z*d*.35,sc,bloom)));
  [[-.7,.5],[.75,.58],[-.15,.78],[.4,-.55]].forEach(([x,z],i)=>{
    const clump=new THREE.Group();clump.position.set(x*w*.7,0,z*d*.5);g.add(clump);
    for(let s=0;s<3;s++){const reed=mesh(CYL(.01,.016,.5+((i+s)%3)*.16,5),'#5E8A3C',(s-1)*.06,.28,s*.04,{r:.8});clump.add(reed);
      const head=mesh(CYL(.012,.02,.12,5),'#C4A15A',(s-1)*.06,.58+((i+s)%3)*.08,s*.04,{r:.7});clump.add(head)}
  });
  const dock=new THREE.Group();dock.position.set(0,0,-d-.15);g.add(dock);
  for(let k=0;k<4;k++)dock.add(mesh(rbox(1.35,.07,.28,.02),k%2?'#C49262':'#A87548',0,.16,-.2-k*.32,{r:.75}));
  for(const x of[-.62,.62]){dock.add(mesh(CYL(.055,.065,.55,6),'#6E4A2C',x,.28,-1.15));dock.add(mesh(SPH(.07,8,6),'#E7D3A1',x,.58,-1.15,{r:.6}))}
  const kinds=[['#FFF8F2','#FFD56A'],['#FF8FB8','#FFE7A0'],['#E4C6FF','#FFF1C2'],['#FFE56A','#C9842A'],['#FFB08A','#FFF3C4'],['#FFFFFF','#F2C14E']];
  [2.35,2.7,3.05,1.05,1.35,.78].forEach((a,i)=>{
    const f=bankFlower(kinds[i][0],kinds[i][1],1.05+(i%3)*.22);
    f.position.set(Math.cos(a)*w*1.28,0,Math.sin(a)*d*1.35);g.add(f);
  });
  const sign=signPlane(wide?'Big fishing pond':'Fishing pond','#1E6F9C',2.4);sign.position.set(-1.35,.95,-d-.15);sign.rotation.y=Math.PI;g.add(sign);
  return g;
}
function buildMeadow(S,markHit){
  const lot=new THREE.Mesh(new THREE.PlaneGeometry(8.6,6.1),earthMat('sod'));
  lot.rotation.x=-Math.PI/2;lot.position.set(-19.05,.03,14.08);lot.receiveShadow=true;S.add(lot);F.meadowLot=lot;
  const fence=new THREE.Group();S.add(fence);F.meadowFence=fence;
  const x0=-23.1,x1=-15,z0=11.45,z1=16.9;
  fenceLine(fence,x0,z0,-20.3,z0,'#B07A45');fenceLine(fence,-17.9,z0,x1,z0,'#B07A45');
  fenceLine(fence,x0,z0,x0,z1,'#B07A45');fenceLine(fence,x1,z0,x1,z1,'#B07A45');fenceLine(fence,x0,z1,x1,z1,'#B07A45');
  const sign=new THREE.Group();sign.position.set(-19.1,0,10.55);S.add(sign);F.landSign=sign;
  sign.add(mesh(CYL(.06,.07,1.15,6),'#8B5A2B',-.72,.55,0));sign.add(mesh(CYL(.06,.07,1.15,6),'#8B5A2B',.72,.55,0));
  const board=signPlane('Land for sale','#2FA36B',2.5);board.position.set(0,1.15,0);board.rotation.y=Math.PI;sign.add(board);
  markHit(board,{kind:'land',id:'meadow'});
}
function syncLand(){
  const own=hasLand(farmOf(cur()),'meadow');
  if(F.landSign)F.landSign.visible=!own;
  if(F.meadowFence)F.meadowFence.visible=own;
  if(F.meadowLot)F.meadowLot.material=earthMat(own?'dry':'sod');
}
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
    else if(stage===2){if(id==='corn'||id==='sunflower'){s.add(mesh(CYL(.05,.06,.7,6),'#4E9A45',0,.35,0));s.add(mesh(new THREE.ConeGeometry(.2,.4,7),'#5DBB4A',0,.62,0,{flat:true}))}else leafyBush(s,.75,false)}
    else if(artOf('seed:'+id)){const sp=iconSprite('seed:'+id,'',.62);sp.position.y=.34;s.add(sp)}   // the child's own crop picture
    else readyCrop(id,s);
    s.scale.setScalar([1,1.45,1.7,1.75][stage])}   // big, lush plants that fill the plot
  return g}
/* A round bush of big leaves (optionally with little white flowers), for the leafy crop rows. */
function leafyBush(s,k,flowers){const greens=['#3FA34D','#52B85A','#62C766','#48AD52'];
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2+(i%2)*.2,pv=new THREE.Group();pv.rotation.y=a;s.add(pv);
    const l=mesh(SPH(.2*k,12,8),greens[i%4],.17*k,.16*k+(i%2)*.05*k,0,{r:.55});l.scale.set(1.35,.32,.85);l.rotation.z=.45;pv.add(l)}
  const top=mesh(SPH(.17*k,12,10),'#5CC15E',0,.24*k,0,{r:.55});top.scale.y=.6;s.add(top);
  if(flowers)for(let i=0;i<3;i++){const a=i*2.1+.4;s.add(mesh(SPH(.055,8,6),'#FFFFFF',Math.cos(a)*.16*k,.32*k,Math.sin(a)*.16*k,{e:'#FFFFFF',ei:.2}));s.add(mesh(SPH(.025,6,4),'#FFD43B',Math.cos(a)*.16*k,.35*k,Math.sin(a)*.16*k))}
}
function readyCrop(id,s){
  if(id==='carrot'||id==='tomato'||id==='strawberry')leafyBush(s,id==='carrot'?.9:1,id!=='carrot');
  if(id==='carrot'){for(const a of[-.35,0,.35]){const l=mesh(new THREE.ConeGeometry(.05,.42,5),'#4E9A45',a*.3,.28,0,{flat:true});l.rotation.z=a;s.add(l)}const c=mesh(new THREE.ConeGeometry(.13,.3,10),'#FF8A1F',0,.06,0,{r:.5});c.rotation.x=Math.PI;s.add(c)}
  else if(id==='tomato'){s.add(mesh(ICO(.29,1),'#4E9A45',0,.3,0,{flat:true}));for(let k=0;k<4;k++){const a=k*Math.PI/2+.4;s.add(mesh(SPH(.1,12,10),'#E5333D',Math.cos(a)*.26,.28+(k%2)*.14,Math.sin(a)*.26,{r:.3}))}}
  else if(id==='sunflower'){s.add(mesh(CYL(.04,.05,1.3,6),'#4E9A45',0,.65,0));const f=mesh(CYL(.3,.3,.05,16),'#FFC93C',0,1.35,.05,{r:.6});f.rotation.x=Math.PI/2.6;s.add(f);const c=mesh(CYL(.14,.14,.07,12),'#6B3E1E',0,1.37,.08);c.rotation.x=Math.PI/2.6;s.add(c)}
  else if(id==='strawberry'){const b=mesh(ICO(.28,1),'#4E9A45',0,.1,0,{flat:true});b.scale.y=.5;s.add(b);for(let k=0;k<3;k++){const a=k*2.1;const c=mesh(new THREE.ConeGeometry(.09,.17,10),'#E5333D',Math.cos(a)*.22,.12,Math.sin(a)*.22,{r:.3});c.rotation.x=Math.PI;s.add(c)}}
  else if(id==='corn'){s.add(mesh(CYL(.06,.07,1.5,6),'#4E9A45',0,.75,0));for(const a of[0,2.1,4.2]){const l=mesh(BOX(.06,.6,.02),'#5DBB4A',Math.cos(a)*.12,.8,Math.sin(a)*.12);l.rotation.z=.6*Math.cos(a);l.rotation.x=.6*Math.sin(a);s.add(l)}s.add(mesh(CYL(.09,.09,.34,10),'#F2C230',.13,.95,0,{r:.5}))}
  else{const p=mesh(SPH(.31,16,12),'#F28C28',0,.18,0,{r:.5});p.scale.y=.75;s.add(p);s.add(mesh(CYL(.03,.04,.14,6),'#5A3A20',0,.42,0))}
}
function addNPC(o){const g=new THREE.Group();const sp=buildNpc(o.npc);g.add(sp);
  const tg=labelSprite(o.npc.name.replace(/^Professor /,'').split(' ')[0],{h:.42});tg.position.y=1.85;g.add(tg);
  const bub=labelSprite(o.line,{h:.5,border:'#F5C24C'});bub.position.y=2.35;bub.visible=false;g.add(bub);
  g.position.set(o.x,0,o.z);F.scene.add(g);F.markHit(g,{kind:'npc',n:o});g.userData.art=npcKey(o.npc);o.g=g;o.sp=sp;o.bub=bub;F.npcs.push(o)}
function fenceLine(parent,ax,az,bx,bz,color){const L=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(L/1.4));
  for(let k=0;k<=n;k++){const t=k/n;parent.add(mesh(rbox(.2,.85,.2,.05),color,ax+(bx-ax)*t,.42,az+(bz-az)*t))}
  for(const y of[.3,.62]){const r=mesh(BOX(L,.09,.06),color,(ax+bx)/2,y,(az+bz)/2);r.rotation.y=-Math.atan2(bz-az,bx-ax);parent.add(r)}}
/* Little farm things from the picture: a tree stump with an axe, a crate of vegetables, a barrel
   and a red mailbox. The flowers sit on the banks of the fishing pond. */
function buildProps(S){
  const stump=new THREE.Group();stump.position.set(-6.9,0,10.9);S.add(stump);
  stump.add(mesh(CYL(.55,.65,.6,14),'#8B5A2B',0,.3,0,{r:.8}));const top=mesh(CYL(.5,.5,.04,14),'#E2B97A',0,.61,0,{r:.9});stump.add(top);
  for(const r of[.18,.34]){const ring=mesh(new THREE.TorusGeometry(r,.015,6,24),'#B8854C',0,.635,0);ring.rotation.x=Math.PI/2;stump.add(ring)}   // tree rings
  const axe=new THREE.Group();axe.position.set(.12,.62,0);axe.rotation.z=-.5;stump.add(axe);axe.add(mesh(CYL(.04,.05,.9,8),'#9C6B3F',0,.45,0));axe.add(mesh(rbox(.32,.22,.06,.02),'#B8C2CC',.14,.82,0,{m:.7,r:.3}));
  const crate=new THREE.Group();crate.position.set(-7.4,0,12.9);crate.rotation.y=.3;S.add(crate);
  crate.add(mesh(rbox(1.1,.55,.8,.04),'#C68B4E',0,.28,0,{r:.8}));for(const y of[.18,.4])crate.add(mesh(BOX(1.12,.06,.82),'#9C6B3F',0,y,0));
  [['#FF8A1F',-.3,0],['#E5333D',0,.1],['#FFD43B',.3,-.05]].forEach(([c,x,z])=>crate.add(mesh(SPH(.16,10,8),c,x,.6,z,{r:.4})));
  const barrel=new THREE.Group();barrel.position.set(-8.7,0,11.7);S.add(barrel);
  barrel.add(mesh(CYL(.42,.42,.95,16),'#A0683A',0,.48,0,{r:.7}));for(const y of[.18,.78]){const hoop=mesh(new THREE.TorusGeometry(.43,.03,6,24),'#5A5A5A',0,y,0,{m:.6});hoop.rotation.x=Math.PI/2;barrel.add(hoop)}
  const mb=new THREE.Group();mb.position.set(1.9,0,9.4);S.add(mb);
  mb.add(mesh(CYL(.06,.07,1,8),'#8B5A2B',0,.5,0));mb.add(mesh(rbox(.36,.32,.55,.12),'#D9452F',0,1.1,0,{r:.5}));mb.add(mesh(BOX(.04,.2,.1),'#FFD43B',.2,1.25,-.15));
  F.baseObs.push({x0:-7.6,x1:-6.2,z0:10.2,z1:11.6},{x0:-8.1,x1:-6.7,z0:12.4,z1:13.4},{x0:-9.2,x1:-8.2,z0:11.2,z1:12.2});
}
function buildDecor(){
  const S=F.scene;F.decor={};const add=(id,g)=>{g.visible=false;g.userData.art='decor:'+id;S.add(g);F.decor[id]=g};
  let g=new THREE.Group();const fc=['#FF6B9A','#FFD43B','#B56BFF','#FF8A3D','#FFFFFF'];
  for(const bx of[-7.7,7.7]){g.add(mesh(rbox(.9,.25,10,.08),'#7B4D2B',bx,.12,-.9));for(let k=0;k<10;k++){const z=-5.3+k*.95,x=bx+(k%2?.2:-.2);g.add(mesh(CYL(.03,.03,.4,4),'#3E8E41',x,.4,z));g.add(mesh(SPH(.17,10,8),fc[k%5],x,.65,z,{r:.5}))}}
  add('flowers',g);
  g=new THREE.Group();F.lanterns=[];for(const [x,z] of[[-12.6,-5],[-12.6,0],[-12.6,4],[-6,8.8],[6,8.8],[12,8.8]]){g.add(mesh(CYL(.06,.07,2,8),'#3A3A3A',x,1,z,{m:.5,r:.4}));g.add(mesh(rbox(.42,.5,.42,.06),'#3A3A3A',x,2.1,z,{m:.5,r:.4}));const l=new THREE.Mesh(SPH(.17,12,10),new THREE.MeshBasicMaterial({color:'#FFE08A',toneMapped:false}));l.position.set(x,2.1,z);g.add(l);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex(),color:'#FFD27A',transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));glow.scale.set(1.6,1.6,1);glow.position.set(x,2.1,z);g.add(glow);F.lanterns.push(glow)}
  add('lanterns',g);
  g=new THREE.Group();g.position.set(0,0,-7);g.add(mesh(CYL(.07,.07,2.2,6),'#8B5A2B',0,1.1,0));g.add(mesh(BOX(1.6,.1,.1),'#8B5A2B',0,1.5,0));
  g.add(mesh(rbox(.7,.8,.35,.08),'#3E7BFA',0,1.45,0));g.add(mesh(SPH(.28,14,12),'#E8C99A',0,2.2,0));g.add(mesh(new THREE.ConeGeometry(.45,.45,14),'#E9C46A',0,2.55,0));
  add('scarecrow',g);
  g=new THREE.Group();for(const [x,z] of[[-22,10],[-22,-9],[22,15]])g.add(roundTree(x,z,1.1,true));add('apples',g);
  g=new THREE.Group();g.position.set(-3,0,14);
  const shore=new THREE.Mesh(new THREE.CircleGeometry(3.05,40),earthMat('lip'));shore.rotation.x=-Math.PI/2;shore.position.y=.03;g.add(shore);
  const wtr=new THREE.Mesh(pondSurface(),waterMat());wtr.rotation.x=-Math.PI/2;wtr.scale.set(2.55,2.55,1);wtr.position.y=.055;wtr.receiveShadow=true;g.add(wtr);F.water=wtr;
  for(let k=0;k<14;k++){const a=k/14*Math.PI*2,rock=mesh(SPH(.2+(k%3)*.05,10,8),'#A39C94',Math.cos(a)*2.9,.08,Math.sin(a)*2.9,{r:.9});rock.scale.set(1.3,.42,.9);rock.rotation.y=a;g.add(rock)}
  [[.7,-.5,1,1],[-1.1,.7,.8,0],[1.2,.6,.65,1],[-.4,-1.2,.7,0]].forEach(([x,z,sc,bloom])=>g.add(lilyPad(x,z,sc,bloom)));
  const dock=new THREE.Group();dock.position.set(1.4,0,-1.2);dock.rotation.y=-.6;g.add(dock);   // a little wooden dock
  for(let k=0;k<5;k++)dock.add(mesh(rbox(1.2,.08,.32,.02),k%2?'#B98250':'#A97646',0,.22,-k*.36));
  for(const [x,z] of[[-.55,0],[.55,0],[-.55,-1.45],[.55,-1.45]])dock.add(mesh(CYL(.06,.07,.6,6),'#8B5A2B',x,.1,z));
  F.ducks=[0,1].map(()=>{const d=buildBeast(BEAST.duck);d.position.y=.08;g.add(d);return d});add('pond',g);
  g=new THREE.Group();g.position.set(-23,0,-2);g.add(mesh(CYL(.7,1.3,5,10),'#F3EEE6',0,2.5,0,{flat:true}));g.add(mesh(new THREE.ConeGeometry(1.15,1.3,10),'#C8442E',0,5.65,0,{flat:true}));
  const bl=new THREE.Group();bl.position.set(0,4.6,1.15);for(let k=0;k<4;k++){const pv=new THREE.Group();pv.rotation.z=k*Math.PI/2;pv.add(mesh(rbox(.38,2.6,.06,.02),'#FFFFFF',0,1.3,0));bl.add(pv)}
  bl.add(mesh(SPH(.18,10,8),'#C8442E'));g.add(bl);F.blades=bl;add('windmill',g);
}
function decorObstacles(f){const o=[],has=id=>f.decor.includes(id);
  if(has('apples'))for(const [x,z] of[[-22,10],[-22,-9],[22,15]])o.push({x0:x-.8,x1:x+.8,z0:z-.8,z1:z+.8});
  if(has('pond'))o.push({x0:-5.6,x1:-.4,z0:11.4,z1:16.6});
  if(has('windmill'))o.push({x0:-24.3,x1:-21.7,z0:-3.3,z1:-.7});
  if(has('scarecrow'))o.push({x0:-.3,x1:.3,z0:-7.3,z1:-6.7});
  return o}
function syncWorld(){
  const p=cur(),f=farmOf(p);
  if(F.player){F.scene.remove(F.player);F.player.traverse(o=>{if(o.geometry&&!o.geometry.userData.keep)o.geometry.dispose()})}
  F.player=buildHero(f);F.player.userData.art='me';F.scene.add(F.player);
  const sp=LASTPOS||{x:0,z:12.4};LASTPOS=null;F.player.position.set(sp.x,0,sp.z);F.player.rotation.y=Math.PI;
  F.target=null;F.pending=null;
  for(const id in F.decor)F.decor[id].visible=f.decor.includes(id);
  F.obs=F.baseObs.concat(decorObstacles(f));
  syncAnimals();syncPlots(true);syncLand();
  for(const z of F.zones)z.inside=Math.hypot(z.x-sp.x,z.z-sp.z)<z.r;
  F.yaw=CAM.yaw;placeCamera(1);updateHud();
}
function syncPlots(force){
  const f=farmOf(cur());
  F.plots.forEach((P,i)=>{
    const mine=i<HOME_PLOTS||hasLand(f,'meadow'),locked=mine&&!plotOpen(f,i),pl=f.plots[i],info=plotInfo(pl);
    P.g.visible=mine;
    const key=locked?'L':!pl?'E':`${pl.crop}${info.stage}${pl.watered?'w':''}`;
    if(!force&&key===P.key)return;P.key=key;
    P.soil.geometry=locked?flatSoil():tilledGeo();
    P.soil.material=earthMat(locked?'sod':pl&&pl.watered?'wet':'dry');
    P.lip.material=earthMat(locked?'sod':'lip');
    P.ridges.visible=!locked;
    clearGroup(P.crop);if(pl)P.crop.add(cropMesh(pl.crop,info.stage));P.crop.userData.art=pl?'seed:'+pl.crop:null;
    P.spark.visible=!!info&&info.stage===3;P.lock.visible=locked&&i===f.unlocked&&i<HOME_PLOTS;
  });
}
function syncAnimals(){
  const f=farmOf(cur());clearGroup(F.animalGroup);
  F.hits=F.hits.filter(h=>!(h.userData.act&&h.userData.act.kind==='animal'));
  F.animals=f.animals.map((a,idx)=>{const A=ANIMALS.find(x=>x.id===a.type),key='animal:'+A.id;
    let g;if(artOf(key))g=buildPicBeast(key,{chicken:.95,sheep:1.1,cow:1.25}[A.id]||1);   // the child's own animal picture, as a 3D cut-out
    else{g=buildBeast(BEAST[A.id]||BEAST.chicken);g.scale.setScalar(A.id==='cow'?1.2:1)}
    const pr=iconSprite('prod:'+A.prod,A.pe,.7);g.userData.art=key;pr.userData.art='prod:'+A.prod;pr.position.y=1.35;pr.visible=false;g.add(pr);
    const x=PEN.x0+1+Math.random()*(PEN.x1-PEN.x0-2),z=PEN.z0+1+Math.random()*(PEN.z1-PEN.z0-2);g.position.set(x,0,z);
    F.animalGroup.add(g);g.userData.act={kind:'animal',idx};F.hits.push(g);
    return{g,sp:g,pr,a,A,tx:x,tz:z,wait:Math.random()*3}});
}
/* ---------- farm HUD: profile card, coins and stars, Art Studio and settings buttons ---------- */
function farmHud(){const p=cur();
  const code=typeof cloudPlayerCode==='function'?cloudPlayerCode(p):'';
  const sync=typeof cloudSyncLine==='function'?cloudSyncLine():'';
  return `<div class="fhud${code||sync?' hasid':''}">
    <button class="fcard" data-act="toPlayers" aria-label="Switch player"><span class="fav">${avE(p)}</span>
      <span class="fmeta"><b class="fname">${esc(p.name)}</b><span class="fcode" id="fcode"${code?'':' hidden'}>${esc(code)}</span><span class="fsync" id="fsync"${sync?'':' hidden'}>${esc(sync)}</span><span class="flvl" id="flvl"></span></span></button>
    <div class="fright"><span class="fpill" id="coins">🪙 ${p.gems}</span><span class="fpill">⭐ ${totalStars(p)}</span>
      ${typeof linkLampHTML==='function'?linkLampHTML():''}
      ${typeof hallMarkHTML==='function'?hallMarkHTML('fround hallbtn'):''}
      <button class="fround art" data-act="toStudio" aria-label="Art Studio: draw your own pictures" title="Art Studio">🎨</button>
      <button class="fround" data-act="openProgress" aria-label="Progress board and settings" title="Progress board">⚙️</button></div>
  </div>`}
function tasksOpen(){try{const v=sessionStorage.getItem('hmf-tasks');if(v)return v==='1'}catch(e){}return innerWidth>=600}
function tasksHTML(){const p=cur(),D=dailyOf(p),T=tasksFor(p),done=T.filter(t=>(D.n[t.id]||0)>=t.goal).length,st=streakDays(p);
  const end=D.chest?`<div class="tasks-end">🎉 All done today!${st?` <b>🔥 ${st} day${st>1?'s':''}</b>`:''}</div>`
    :done===T.length?'<button class="b chestbtn" data-act="openChest">🎁 Open today\'s chest!</button>'
    :`<div class="tasks-coins">🪙 Today: ${D.coins} / ${COIN_DAY_MAX}</div>`;
  return `<button class="tasks-head ${done===T.length&&!D.chest?'ready':''}" data-act="tasksToggle" aria-label="Today's tasks"><span>📋 Today's Tasks${st?` · 🔥${st}`:''}</span><b>${done}/${T.length}</b></button>
  <div class="tasks-list">${T.map(t=>{const n=D.n[t.id]||0,ok=n>=t.goal;return `<div class="task ${ok?'ok':''}"><span class="te">${t.e}</span><span class="tn">${t.name}</span><b>${ok?'✓':`${n}/${t.goal}`}</b></div>`}).join('')}${end}</div>`}
/* All of today's tasks done: the chest gives coins, counts the streak and may hand out a streak gift. */
function openChest(){
  const p=cur(),D=dailyOf(p);if(D.chest||!allTasksDone(p))return;
  D.chest=true;const g=earnCoins(p,COIN_CHEST),s=bumpStreak(p),gift=streakGift(p,s.days);save();
  if(F&&F.decor)for(const id in F.decor)F.decor[id].visible=farmOf(p).decor.includes(id);
  updateHud();if(F)F.obs=F.baseObs.concat(decorObstacles(farmOf(p)));
  const lines=[`🎁 You opened today's chest${g?`: +${g} 🪙`:''}!`,`🔥 That's ${s.days} day${s.days>1?'s':''} in a row!${s.days<3?' Keep going: day 3 brings a surprise.':s.days<7?' Day 7 brings a big prize!':''}`];
  if(gift)lines.push(`🎀 Streak gift: ${gift}! ${gift.startsWith('⭐')?'':'Look on your farm and in the market.'}`);
  lines.push('Great job today! Your crops will be waiting tomorrow. See you then! 👋');
  dialog(MAYOR,lines);
}
function taskDone(T){if(!T)return;addXP(TASK_XP);toast(`✅ ${T.name}: done! +${TASK_XP} XP`)}
/* ---------- virtual joystick: drag the knob to walk, it springs back to the middle when let go ---------- */
const JOY={x:0,y:0,id:null};
function bindJoystick(){
  const el=$('#joy'),knob=$('#joyKnob');if(!el)return;JOY.x=JOY.y=0;JOY.id=null;
  const set=e=>{const r=el.querySelector('.joy-ring').getBoundingClientRect(),max=r.width*.3;
    let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const d=Math.hypot(dx,dy);if(d>max){dx*=max/d;dy*=max/d}
    knob.style.transform=`translate(${dx}px,${dy}px)`;const m=Math.hypot(dx,dy)/max;JOY.x=m<.15?0:dx/max;JOY.y=m<.15?0:dy/max;
    el.dataset.dir=m<.15?'':Math.abs(dx)>Math.abs(dy)?(dx>0?'rt':'lf'):(dy>0?'dn':'up')};
  el.addEventListener('pointerdown',e=>{e.preventDefault();JOY.id=e.pointerId;try{el.setPointerCapture(e.pointerId)}catch(_){}el.classList.add('on');set(e);
    if(F){F.target=null;F.pending=null}const tip=$('#joyTip');if(tip){tip.remove();const p=cur();p.seen.joy=1;save()}});
  el.addEventListener('pointermove',e=>{if(e.pointerId===JOY.id)set(e)});
  const end=e=>{if(e.pointerId!==JOY.id)return;JOY.id=null;JOY.x=JOY.y=0;knob.style.transform='';el.classList.remove('on');el.dataset.dir=''};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}
function updateHud(){
  const p=cur(),f=farmOf(p),L=farmLevel(f.xp);
  const lv=$('#flvl');if(lv)lv.innerHTML=`<span class="fstar">⭐</span>Lv. ${L.l}<span class="fxp" title="${L.into}/${L.need} XP"><i style="width:${Math.round(L.into/L.need*100)}%"></i></span>`;
  const c=$('#coins');if(c)c.textContent='🪙 '+p.gems;
  const tk=$('#tasks');if(tk)tk.innerHTML=tasksHTML();
}
function rTown(){
  const quick=[['tricks','🦉 Brain Boost'],['market','🛒 Farm Market'],['barn','🌾 Barn'],['fish','🎣 Fishing Pond'],['studio','🎨 Art Studio'],['board','📋 Progress Board']].map(([id,l])=>`<button class="b ghost sm" data-act="quick" data-id="${id}">${l}</button>`).join('');
  $('#app').innerHTML=farmHud()+`
  <div class="world" id="world">
    <div class="wtop farmtop">${camCtl(`<button class="wide" data-act="overview" aria-label="See the whole farm">🗺️</button><button class="wide ${CAM.eye?'on':''}" data-act="eyeView" aria-pressed="${!!CAM.eye}" aria-label="Eye-level view: see your face">👀</button>`)}<div class="tasks ${tasksOpen()?'':'closed'}" id="tasks">${tasksHTML()}</div></div>
    <div class="toast" id="toast" aria-live="polite"></div>
    <div class="sheet" id="sheet"></div>
    <div class="paintbar" id="paintbar">🎨 Paint mode: tap anyone or anything on the farm to draw your own!</div>
  </div>
  <p class="muted townhint">Tap the ground to walk and drag sideways to turn the camera. Tap a field patch to plant. Walk into a building to go inside. Harvested crops can be sold at the market.</p>
  <div class="places" id="places" role="menu"><b class="places-title">🗺️ Go to…</b>${quick}<button class="b ghost sm" data-act="hallOpen">💬 Farm Chat</button><button class="b ghost sm" data-act="mayorTalk">🐻 How to play</button></div>
  <div class="sidebtns">${typeof cloudIsAccount==='function'&&cloudIsAccount()?'<button class="sbtn" data-act="cloudSync" aria-label="Sync this farm">☁️<span>Sync</span></button>':''}<button class="sbtn" data-act="places" aria-label="Places" aria-expanded="false">🗺️<span>Places</span></button>
    <button class="sbtn paintbtn ${PAINT?'on':''}" data-act="paint" aria-pressed="${PAINT}" aria-label="Paint the farm">🖌️<span>Paint</span></button>
    <button class="sbtn bag" data-act="quick" data-id="barn" aria-label="Backpack: open the barn">🎒<span>Backpack</span></button></div>
  <div class="joy" id="joy" role="application" aria-label="Joystick: drag to walk"><div class="joy-ring"><i class="ja up"></i><i class="ja dn"></i><i class="ja lf"></i><i class="ja rt"></i><span class="joy-cross"></span><span class="joy-knob" id="joyKnob"></span></div>
    ${cur().seen.joy?'':'<div class="joy-tip" id="joyTip">Drag to walk.<br>Let go and it springs back!</div>'}</div>
`;
  bindJoystick();setPaint(PAINT);
  const fkey=cur().id+':'+gradeOf(cur());   // schools depend on the grade, NPC/animal pictures on the player
  if(F&&F.key!==fkey)F=null;
  if(!F){buildFarm();if(F)F.key=fkey}
  if(!F||!mountStage(F,$('#world'))){$('#world').insertAdjacentHTML('afterbegin','<div class="nogl">The 3D farm can\'t start on this device. Use the buttons below to visit each place.</div>');updateHud();return}
  F.sheet=null;syncWorld();
  const p=cur();if(!p.seen.farm){p.seen.farm=1;save();mayorTalk()}
}
function mayorTalk(){dialog(MAYOR,[
  'Welcome to Happy Learning Farm! I\'m Bella, the mayor.',
  'Tap the ground to walk. Drag sideways to turn the camera. On a computer, the arrow keys work too.',
  'Seeds, animals and decorations cost coins 🪙. Mo buys crops you grew, for about 120% of the seed price, and fish you caught. Each fish has its own price. More coins come from Math School: every answer right first time earns a coin, and clearing a level earns a bonus.',
  'Tap a field patch to plant seeds. Crops grow in real time, so come back later to harvest! Watering 💧 makes them grow faster.',
  'The fishing pond is at the bottom of the farm. Build it, buy tackle, then choose the 1 to 9 times table or tricks you have cleared. Get 2 answers right in a row. A wrong answer does not scare the fish away. The time limit starts at 30 seconds, and you can change it.',
  'New land is for sale up the hill on the left. The sign says Land for sale. Mo sells that meadow too, on his Land tab.',
  'Harvests earn XP to level up your farm and unlock new seeds and animals. Mo\'s Farm Market sells animals, decorations and outfits.',
  'Start at Professor Hoot\'s Math School, at the top left of the farm. Good luck!'])}
/* ---------- paint mode: tap anything on the farm to redraw its picture in the Art Studio ---------- */
let PAINT=false;try{PAINT=sessionStorage.getItem('hmf-paint')==='1'}catch(e){}
function paintTargets(){return [F.player,...F.npcs.map(n=>n.g),F.animalGroup,...F.plots.map(P=>P.crop),...Object.values(F.decor).filter(g=>g.visible)]}
function artAt(ray){   // -> {key, obj} of the paintable thing under the pointer
  for(const h of ray.intersectObjects(paintTargets(),true)){let o=h.object;while(o&&!o.userData.art)o=o.parent;if(o&&o.visible)return{key:o.userData.art,obj:h.object}}
  return null;
}
function hideMarks(){if(!F)return;F.hoverMark.visible=false;F.selMark.visible=false}
/* Where the selection ring and arrow go for a thing the pointer is over: [x, z, ring radius, arrow height]. */
function markFor(a){
  if(a.kind==='zone'){const z=F.zones.find(z=>z.id===a.id);return z&&[z.x,z.z,1.2,2.2]}
  if(a.kind==='npc'){const p=a.n.g.position;return[p.x,p.z,.9,3.2]}
  if(a.kind==='animal'){const an=F.animals[a.idx];return an&&[an.g.position.x,an.g.position.z,.85,2.4]}
  if(a.kind==='plot'){const {x,z}=plotPos(a.i);return[x,z,1.35,1.5]}
  if(a.kind==='land'&&F.landSign){const p=F.landSign.position;return[p.x,p.z,1.2,2.2]}
  return null;
}
function setPaint(on){PAINT=on;try{sessionStorage.setItem('hmf-paint',on?'1':'0')}catch(e){}
  const b=$('[data-act="paint"]');if(b){b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)}
  const bar=$('#paintbar');if(bar)bar.classList.toggle('show',on);if(F&&F.selMark)hideMarks()}
/* What the pointer is over: the cursor to show and a name label (engine3d.js draws both). */
function farmHover(e){
  const ray=rayFrom(e,F.camera);F.hoverMark.visible=false;F.selMark.visible=false;
  if(PAINT){const hit=artAt(ray);if(!hit)return{cursor:'paint'};
    const w=new THREE.Vector3();hit.obj.getWorldPosition(w);placeMark(F.selMark,w.x,0,w.z,hit.key.startsWith('seed:')?.9:1,hit.key.startsWith('seed:')?1.3:2.8);
    return{cursor:'paint',label:hit.key==='me'?'🎨 Draw yourself':`🎨 Draw my own ${artName(hit.key)}`}}
  const a=actOf(ray.intersectObjects(F.hits,true));
  if(a){const m=markFor(a);if(m)placeMark(F.selMark,m[0],0,m[1],m[2],m[3]);
    const f=farmOf(cur()),locked=a.kind==='plot'&&a.i<HOME_PLOTS&&a.i>f.unlocked;return{cursor:locked?'locked':'select',label:actLabel(a)}}
  const g=ray.intersectObject(F.ground);
  if(g.length)placeMark(F.hoverMark,g[0].point.x,g[0].point.y,g[0].point.z);
  return{cursor:'move',label:''};
}
function actLabel(a){
  if(a.kind==='zone')return (F.zones.find(z=>z.id===a.id)||{}).name||'';
  if(a.kind==='npc')return a.n.npc.name;
  if(a.kind==='animal'){const an=F.animals[a.idx];return an?an.A.name:''}
  if(a.kind==='land'){const L=LANDS.find(x=>x.id===a.id);return L?`Buy ${L.name} · ${L.cost} 🪙`:''}
  if(a.kind==='plot'){const f=farmOf(cur()),pl=f.plots[a.i];
    if(a.i<HOME_PLOTS&&a.i>=f.unlocked)return a.i===f.unlocked?`Buy this field · ${plotCost(f)} 🪙`:'Locked field';
    if(!pl)return 'Empty field · plant here';
    const info=plotInfo(pl);return `${info.S.name} · ${info.stage===3?'ready to harvest!':'growing'}`}
  return '';
}
function farmTap(e){
  const ray=rayFrom(e,F.camera);
  if(PAINT){const hit=artAt(ray);if(hit)go('studio',{edit:hit.key,from:'town'});else toast('🎨 Tap a person, animal, crop or decoration to draw it!');return}
  const a=actOf(ray.intersectObjects(F.hits,true));
  if(a&&doAct(a))return;
  const g=ray.intersectObject(F.ground);if(g.length)walkTo(g[0].point.x,g[0].point.z,null);
}
function doAct(a){
  const me=F.player.position;
  if(a.kind==='plot'){const {x,z}=plotPos(a.i);walkTo(x,z+1.6,{sheet:['plot',a.i]});return true}
  if(a.kind==='land'){walkTo(-19.1,9.7,{sheet:['land',a.id]});return true}
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
  if(CAM.eye)return placeEyeCamera(snap);
  const p=F.player.position,zmax=farmZoomMax();if(CAM.zoom>zmax)CAM.zoom=zmax;
  const o=Math.max(0,Math.min(1,(CAM.zoom-1.4)/(zmax-1.4)));   // 0 = follow the player, 1 = whole-farm overview
  const d=15*CAM.zoom*camFit(),lx=p.x*(1-o),lz=p.z*(1-o)-o,ly=1.2*(1-o);
  const hd=d*(.7-.3*o),tx=lx+Math.sin(F.yaw)*hd,tz=lz+Math.cos(F.yaw)*hd,ty=d*(1.3+.4*o)+1;   // the camera tilts down as it rises
  if(snap===1)F.camPos.set(tx,ty,tz);else F.camPos.lerp(new THREE.Vector3(tx,ty,tz),snap);
  F.camera.position.copy(F.camPos);F.camera.lookAt(lx,ly,lz);
  F.scene.fog.near=60+d*.8;F.scene.fog.far=170+d*1.6;
  F.sun.position.set(lx+28,32,lz+18);F.sun.target.position.set(lx,0,lz);
}
/* Eye-level view: the camera drops to the height of the player's face, so you can see it (and the farm
   from the side). Zoom still works, the whole-farm view is not used here. */
function placeEyeCamera(snap){
  const p=F.player.position;CAM.zoom=Math.max(.6,Math.min(1.8,CAM.zoom));
  const d=7.5*CAM.zoom*(F.camera.aspect<.8?1.7:1),tx=p.x+Math.sin(F.yaw)*d,tz=p.z+Math.cos(F.yaw)*d,ty=1.9+d*.16;
  if(snap===1)F.camPos.set(tx,ty,tz);else F.camPos.lerp(new THREE.Vector3(tx,ty,tz),snap);
  F.camera.position.copy(F.camPos);F.camera.lookAt(p.x,1.3,p.z);
  F.scene.fog.near=60;F.scene.fog.far=170;
  F.sun.position.set(p.x+28,32,p.z+18);F.sun.target.position.set(p.x,0,p.z);
}
function triggerZone(z){
  if(z.kind==='closed'){toast(`${z.name} is opening soon!`);F.target={x:z.out.x,z:z.out.z};F.pending=null;return}
  LASTPOS={x:z.out.x,z:z.out.z};
  if(z.kind==='school')go('school',{sid:z.id});
  else if(z.kind==='market')go('market');
  else if(z.kind==='board')go('progress');
  else if(z.kind==='barn')go('barn');
  else if(z.kind==='studio')go('studio');
  else if(z.kind==='fish')go('fishing');
}
function farmUpdate(dt){
  const me=F.player,P=me.position,SP=6,t=F.t;
  F.yaw+=(CAM.yaw-F.yaw)*Math.min(1,dt*8);
  let kx=0,kz=0;
  if(!DLG){if(KEYS.has('ArrowLeft')||KEYS.has('a'))kx-=1;if(KEYS.has('ArrowRight')||KEYS.has('d'))kx+=1;if(KEYS.has('ArrowUp')||KEYS.has('w'))kz+=1;if(KEYS.has('ArrowDown')||KEYS.has('s'))kz-=1;
    kx+=JOY.x;kz-=JOY.y}   // the on-screen joystick adds to the arrow keys
  let moving=false,dx=0,dz=0;
  if(kx||kz){F.target=null;F.pending=null;const s=Math.sin(F.yaw),c=Math.cos(F.yaw);dx=kz*-s+kx*c;dz=kz*-c+kx*-s;const m=Math.hypot(dx,dz),amt=Math.min(1,Math.hypot(kx,kz));dx/=m;dz/=m;
    if(moveBy(dx*SP*amt*dt,dz*SP*amt*dt))moving=true;if(F.sheet)closeSheet()}
  else if(F.target&&!DLG){
    const tx=F.target.x-P.x,tz=F.target.z-P.z,d=Math.hypot(tx,tz);
    if(d<.08){F.target=null;const pd=F.pending;F.pending=null;
      if(pd&&pd.sheet)openSheet(...pd.sheet);
      if(pd&&pd.talk){const n=pd.talk;me.rotation.y=Math.atan2(n.x-P.x,n.z-P.z);n.mayor?mayorTalk():dialog(n.npc,n.talk)}}
    else{dx=tx/d;dz=tz/d;const st=Math.min(d,SP*dt);if(moveBy(dx*st,dz*st)){moving=true;F.stuck=0}else{F.stuck+=dt;if(F.stuck>.4){F.target=null;F.pending=null}}}
  }
  if(moving){const want=Math.atan2(dx,dz);let diff=want-me.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));me.rotation.y+=diff*Math.min(1,dt*12)}
  else if(CAM.eye&&!F.target){let diff=F.yaw-me.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));me.rotation.y+=diff*Math.min(1,dt*3)}   // eye-level view: stand and smile at the camera
  F.walkT=(F.walkT||0)+(moving?dt:0);
  animHero(me,moving?'walk':'idle',moving?F.walkT:t,dt);
  for(const z of F.zones){const inside=Math.hypot(z.x-P.x,z.z-P.z)<z.r;if(inside&&!z.inside){z.inside=true;triggerZone(z);if(G.stage!==F)return}else z.inside=inside}
  for(const n of F.npcs){const d=Math.hypot(n.x-P.x,n.z-P.z);n.bub.visible=d<4.5&&!DLG;n.sp.position.y=Math.sin(t*2+n.x)*.03}
  const now=Date.now();
  for(const an of F.animals){
    const g=an.g;
    if(an.wait>0)an.wait-=dt;else{const ddx=an.tx-g.position.x,ddz=an.tz-g.position.z,d=Math.hypot(ddx,ddz);
      if(d<.05){an.wait=1+Math.random()*4;an.tx=PEN.x0+1+Math.random()*(PEN.x1-PEN.x0-2);an.tz=PEN.z0+1+Math.random()*(PEN.z1-PEN.z0-2)}
      else{const st=Math.min(d,1.1*dt);g.position.x+=ddx/d*st;g.position.z+=ddz/d*st;g.position.y=Math.abs(Math.sin(t*8))*.04;if(g.userData.legs)animHero(g,'walk',t,dt)}}
    if(an.wait>0)g.position.y=0;
    const pic=g.userData.pic;if(pic){const cp=F.camera.position;pic.rotation.y=Math.atan2(cp.x-g.position.x,cp.z-g.position.z);
      pic.rotation.z=an.wait>0?Math.sin(t*2+an.tx)*.03:Math.sin(t*8)*.08}   // a picture waddles instead of moving its legs
    an.pr.visible=now-an.a.last>=an.A.mins*60000;an.pr.position.y=1.45+Math.sin(t*3)*.08;
  }
  if(F.blades)F.blades.rotation.z-=dt*.8;
  F.ducks.forEach((d,k)=>{const a=t*.3+k*Math.PI;d.position.set(Math.cos(a)*1.4,.08+Math.sin(t*2+k)*.03,Math.sin(a)*1.1)});
  F.butterflies.forEach((b,k)=>{const a=t*.5+k*2.1;b.position.set(Math.cos(a)*(5+k)+(k-1)*2,1.4+Math.sin(t*3+k)*.4,Math.sin(a*1.3)*4-1)});
  F.clouds.forEach(c=>{c.position.x+=dt*.7;if(c.position.x>90)c.position.x=-90});
  F.lanterns.forEach((l,k)=>{const s=1.5+Math.sin(t*3+k)*.15;l.scale.set(s,s,1)});
  if(F.water)F.water.material.emissiveIntensity=.1+Math.sin(t*1.4)*.04;
  F.smoke.forEach(s=>{const k=(t*.25+s.o)%1;s.p.position.set(20.5+k*.6,5.6+k*3.2,-2.8+Math.sin(k*6)*.3);const sc=.4+k*1.1;s.p.scale.setScalar(sc);s.p.material.opacity=.45*(1-k)});
  animSparkles(F.dust,t);
  for(const P2 of F.plots)if(P2.spark.visible)P2.spark.position.y=1.9+Math.sin(t*3)*.12;
  const T=F.t;animMark(F.hoverMark,T);animMark(F.selMark,T);   // the walk marker stays on the target until we arrive
  if(F.target){placeMark(F.walkMark,F.target.x,0,F.target.z);animMark(F.walkMark,T)}else F.walkMark.visible=false;
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
function openSheet(kind,arg){F.sheet={kind,arg};F.sheetKey='';refreshSheet(true);document.body.classList.add('sheeton')}
function closeSheet(){document.body.classList.remove('sheeton');if(F)F.sheet=null;const el=$('#sheet');if(el){el.className='sheet';el.innerHTML=''}}
function refreshSheet(force){
  if(!F||!F.sheet)return;const el=$('#sheet');if(!el)return;
  const {kind,arg}=F.sheet,f=farmOf(cur());let key=kind,live=null;
  if(kind==='plot'){const pl=f.plots[arg],info=plotInfo(pl);key+=arg+(arg<HOME_PLOTS&&arg>=f.unlocked?'L'+cur().gems:!pl?'E'+cur().gems:pl.crop+info.stage+pl.watered);if(info&&info.stage<3)live=info}
  if(kind==='land')key+=arg+(hasLand(f,arg)?1:0)+cur().gems;
  if(!force&&key===F.sheetKey){if(live){const l=$('#left'),b=$('#pbar');if(l)l.textContent=fmtLeft(live.left);if(b)b.style.width=Math.round(live.prog*100)+'%'}return}
  F.sheetKey=key;el.className='sheet show';
  el.innerHTML=`<button class="sheet-x" data-act="closeSheet" aria-label="Close">✕</button>`+(kind==='plot'?sheetPlot(arg):kind==='land'?sheetLand(arg):sheetBarn());
}
function needCoins(n){return `<p class="muted">You need ${n} more 🪙. Coins come from Math School.</p><button class="b sm" data-act="quick" data-id="tricks">🦉 Walk to Math School</button>`}
function sheetPlot(i){
  const p=cur(),f=farmOf(p),lv=farmLevel(f.xp).l;
  if(i<HOME_PLOTS&&i>=f.unlocked){const cost=plotCost(f);
    return `<h3>New field patch</h3><p>Grow more at once with another patch of soil.</p><button class="b" data-act="buyPlot" ${p.gems<cost?'disabled':''}>Buy a patch for ${cost} 🪙</button>${p.gems<cost?needCoins(cost-p.gems):''}`}
  const pl=f.plots[i],info=plotInfo(pl);
  if(!pl){const cheapest=Math.min(...SEEDS.filter(s=>s.lv<=lv).map(s=>s.cost));
    return `<h3>What shall we plant?</h3><div class="seedgrid">${SEEDS.map(S=>{const lock=lv<S.lv,poor=p.gems<S.cost;
      return `<button class="seed" data-act="plant" data-i="${i}" data-id="${S.id}" ${lock||poor?'disabled':''}><span class="e">${lock?'🔒':ico('seed:'+S.id,S.e)}</span><b>${S.name}</b><small>${lock?`Farm level ${S.lv}`:`${S.cost} 🪙 · ${S.mins} min`}</small></button>`}).join('')}</div>${p.gems<cheapest?needCoins(cheapest-p.gems):''}`}
  if(info.stage<3)return `<h3>${ico('seed:'+info.S.id,info.S.e)} ${info.S.name} is growing</h3><div class="pbarw"><i id="pbar" style="width:${Math.round(info.prog*100)}%"></i></div><p>Ready in <b id="left">${fmtLeft(info.left)}</b></p>${pl.watered?'<p class="muted">💧 Watered! It\'s growing faster.</p>':`<button class="b" data-act="water" data-i="${i}">💧 Water it to grow faster</button>`}<p class="muted">While you wait, earn more coins at Math School.</p>`;
  return `<h3>${ico('seed:'+info.S.id,info.S.e)} ${info.S.name} is ready!</h3><button class="b" data-act="harvest" data-i="${i}">🧺 Harvest</button>`;
}
function sheetLand(id){
  const L=LANDS.find(x=>x.id===id),p=cur(),f=farmOf(p);if(!L)return '';
  if(hasLand(f,id))return `<h3>${L.e} ${L.name}</h3><p>This land is yours. Tap a patch to plant.</p>`;
  return `<h3>${L.e} ${L.name}</h3><p>${L.blurb} Buying it opens ${L.n} new patches.</p><button class="b" data-act="buyLand" data-id="${id}" ${p.gems<L.cost?'disabled':''}>Buy this land · ${L.cost} 🪙</button>${p.gems<L.cost?needCoins(L.cost-p.gems):''}`;
}
function sheetBarn(){
  const f=farmOf(cur()),L=farmLevel(f.xp);
  const prods=[...SEEDS.map(s=>[s.id,s.e,s.name]),...ANIMALS.map(a=>[a.prod,a.pe,a.pn])];
  return `<h3>🌾 Barn</h3><p>Farm level <b>${L.l}</b>: ${L.into} / ${L.need} XP to the next level</p><div class="pbarw"><i style="width:${Math.round(L.into/L.need*100)}%"></i></div>
  <div class="barn">${prods.map(([id,e,nm])=>`<div class="bi"><span class="e">${e}</span><b>${f.barn[id]||0}</b><small>${nm}</small></div>`).join('')}</div>
  <p class="muted">Harvest crops and collect from animals to earn XP. Mo buys only the crops you grew.</p>`;
}
function plant(i,id){const p=cur(),f=farmOf(p),S=SEEDS.find(s=>s.id===id);
  if(!S||p.gems<S.cost||farmLevel(f.xp).l<S.lv||f.plots[i]||!plotOpen(f,i))return;
  p.gems-=S.cost;f.plots[i]={crop:id,planted:Date.now(),watered:false};taskDone(taskStep('plant'));save();syncPlots(false);updateHud();
  const {x,z}=plotPos(i);addFx(F,`🌱 −${S.cost} 🪙`,x,1.6,z);refreshSheet(true)}
function water(i){const f=farmOf(cur()),pl=f.plots[i];if(!pl||pl.watered)return;pl.watered=true;save();syncPlots(false);const {x,z}=plotPos(i);addFx(F,'💧💧💧',x,1.6,z);refreshSheet(true)}
function harvest(i){const f=farmOf(cur()),pl=f.plots[i],info=plotInfo(pl);if(!info||info.stage<3)return;
  f.barn[pl.crop]=(f.barn[pl.crop]||0)+4;f.plots[i]=null;addXP(info.S.xp);taskDone(taskStep('harvest'));save();syncPlots(false);updateHud();
  const {x,z}=plotPos(i);addFx(F,`+4 ${info.S.e}  +${info.S.xp} XP`,x,1.8,z);refreshSheet(true)}
function buyPlot(){if(purchasePlot()===false)return;syncPlots(false);updateHud();closeSheet();toast('New patch ready to plant!')}
function buyLand(id){const L=LANDS.find(x=>x.id===id);if(!purchaseLand(id))return;syncPlots(true);syncLand();updateHud();closeSheet();toast(`${L.name} is yours! Tap a patch to plant.`)}

Object.assign(ACT,{
  choose:d=>{DATA.current=d.id;LASTPOS=null;save();go('town')},
  pickNewLook:d=>{const v=$('#newname').value;NEWLOOK=d.id;rPlayers();$('#newname').value=v},
  pickGrade:d=>{const v=$('#newname').value;NEWGRADE=d.g;rPlayers();$('#newname').value=v},
  paint:()=>setPaint(!PAINT),
  eyeView:()=>{CAM.eye=!CAM.eye;if(CAM.eye){CAM.back=null;CAM.zoom=Math.min(CAM.zoom,1.2);CAM.yaw=F.player.rotation.y}   // swing round to the front of the player
    const b=$('[data-act="eyeView"]');if(b){b.classList.toggle('on',CAM.eye);b.setAttribute('aria-pressed',CAM.eye)}toast(CAM.eye?'👀 Eye-level view: drag to look around':'🦅 Back to the view from above')},
  openChest:()=>openChest(),
  places:()=>{const el=$('#places'),b=$('[data-act="places"]');if(!el)return;const open=el.classList.toggle('open');if(b)b.setAttribute('aria-expanded',open)},
  tasksToggle:()=>{const el=$('#tasks');if(!el)return;el.classList.toggle('closed');try{sessionStorage.setItem('hmf-tasks',el.classList.contains('closed')?'0':'1')}catch(e){}},
  overview:()=>{   // toggle the whole-farm view; on a tall screen, turn so the farm's long side runs down the screen
    if(CAM.eye){CAM.eye=false;const b=$('[data-act="eyeView"]');if(b)b.classList.remove('on')}
    if(CAM.back){CAM.zoom=CAM.back.zoom;CAM.yaw=CAM.back.yaw;CAM.back=null;return}
    CAM.back={zoom:CAM.zoom,yaw:CAM.yaw};
    if(F.camera.aspect<1)CAM.yaw=Math.round((CAM.yaw-Math.PI/2)/Math.PI)*Math.PI+Math.PI/2;
    CAM.zoom=farmZoomMax()},
  addPlayer:()=>{const v=($('#newname').value||'').trim();if(!v)return $('#newname').focus();const p=newPlayer(v.slice(0,16),NEWGRADE,NEWLOOK);DATA.players.push(p);save();rPlayers()},
  mayorTalk:()=>mayorTalk(),
  quick:(q=>d=>{if(F&&G.stage===F){const z=F.zones.find(z=>z.id===d.id);if(z){if(Math.hypot(z.x-F.player.position.x,z.z-F.player.position.z)<z.r)triggerZone(z);else walkTo(z.x,z.z,null)}return}q(d)})(ACT.quick),
  closeSheet:()=>closeSheet(),
  plant:d=>plant(+d.i,d.id),water:d=>water(+d.i),harvest:d=>harvest(+d.i),buyPlot:()=>buyPlot(),buyLand:d=>buyLand(d.id)
});
onPageKey=e=>{if(UI.screen==='town'&&F&&G.stage===F){const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s'].includes(k)){e.preventDefault();KEYS.add(k)}}};
startPage({players:rPlayers,town:rTown},()=>cur()?{screen:'town'}:{screen:'players'});
