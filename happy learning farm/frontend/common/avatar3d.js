/* Happy Learning Farm — avatar3d: a solid 3D child for every human look, and a solid 3D animal
   for every neighbor and pet. Proportions are a real child (smaller head, longer legs), not a big-head cartoon.
   A design is a small object (see AV_PRESET). The child's own Character Maker design lives in Player.avatar3d.
   buildChibi() matches buildHero's userData so animHero() can walk it. Loaded after engine3d.js. */
const AV_SKIN=['#FFE3CF','#F5CBA7','#E8B48A','#C98E62','#9C6B45','#6E4A31'];
const AV_HAIR=['#2B1B12','#4A2F1C','#6B3A1E','#A0522D','#D9A066','#F2D16B','#E8E8E8','#FF7AB6','#8B6CFF','#3FA7FF'];
const AV_CLOTH=['#E5484D','#FF8A1F','#FFD43B','#2FA36B','#3E7BFA','#8B5CF6','#EC6FA9','#FFFFFF','#2E2E3A','#8B5A2B'];
const AV_OPTS={
  eyes:[['round','Round'],['sparkle','Sparkly'],['happy','Happy'],['wink','Wink']],
  mouth:[['smile','Smile'],['grin','Big grin'],['cat','Cat'],['o','Wow']],
  hair:[['short','Short'],['spiky','Spiky'],['bob','Bob'],['long','Long'],['pigtails','Pigtails'],['bun','Bun'],['ponytail','Ponytail'],['curly','Curly']],
  top:[['tee','T-shirt'],['hoodie','Hoodie'],['dress','Dress'],['overalls','Overalls'],['sweater','Sweater']],
  bottom:[['shorts','Shorts'],['pants','Trousers'],['skirt','Skirt']],
  extras:[['blush','Rosy cheeks'],['glasses','Glasses'],['bow','Hair bow'],['flower','Flower clip'],['backpack','Backpack'],['cape','Cape']]
};
/* topColor 'shirt' means "the shirt bought in the Farm Market". */
const AV_PRESET={
  boy:{skin:'#E7B48C',hair:'short',hairColor:'#3A2414',eyes:'round',mouth:'smile',top:'tee',topColor:'shirt',bottom:'pants',bottomColor:'#3D4F73',shoes:'#4A3428',extras:['blush'],face:false},
  girl:{skin:'#E7B48C',hair:'pigtails',hairColor:'#5C3318',eyes:'sparkle',mouth:'smile',top:'dress',topColor:'#C45B78',bottom:'skirt',bottomColor:'#C45B78',shoes:'#8C3A3A',extras:['blush','bow'],face:false},
  farmgirl:{skin:'#E0A878',hair:'ponytail',hairColor:'#6B3A1E',eyes:'round',mouth:'smile',top:'overalls',topColor:'#C45C3E',bottom:'pants',bottomColor:'#3E5C8C',shoes:'#5A3A22',extras:['blush'],face:false},
  farmboy:{skin:'#E0A878',hair:'short',hairColor:'#4A2F1C',eyes:'round',mouth:'smile',top:'overalls',topColor:'#3E6B45',bottom:'pants',bottomColor:'#3E5C8C',shoes:'#5A3A22',extras:[],face:false},
  princess:{skin:'#F0C7A4',hair:'long',hairColor:'#E2C16A',eyes:'sparkle',mouth:'smile',top:'dress',topColor:'#C9A24A',bottom:'skirt',bottomColor:'#C9A24A',shoes:'#F2E2B0',extras:['blush','bow'],face:false},
  prince:{skin:'#E7B48C',hair:'short',hairColor:'#3A2414',eyes:'round',mouth:'smile',top:'tee',topColor:'#2C4C8C',bottom:'pants',bottomColor:'#2C4C8C',shoes:'#3A2A22',extras:['cape'],face:false},
  fairy:{skin:'#F3D0B8',hair:'bob',hairColor:'#F2D16B',eyes:'sparkle',mouth:'smile',top:'dress',topColor:'#C9B6F0',bottom:'skirt',bottomColor:'#C9B6F0',shoes:'#F7E7F4',extras:['blush','flower'],face:false},
  mermaid:{skin:'#E7B48C',hair:'long',hairColor:'#3FA7A0',eyes:'sparkle',mouth:'smile',top:'dress',topColor:'#2E8C86',bottom:'skirt',bottomColor:'#1F6E78',shoes:'#1F6E78',extras:['blush'],face:false},
  herogirl:{skin:'#E7B48C',hair:'ponytail',hairColor:'#2B1B12',eyes:'round',mouth:'grin',top:'tee',topColor:'#B4333A',bottom:'pants',bottomColor:'#2E3A55',shoes:'#2E2E3A',extras:['cape'],face:false},
  heroboy:{skin:'#C98E62',hair:'spiky',hairColor:'#2B1B12',eyes:'round',mouth:'grin',top:'tee',topColor:'#2A4E9A',bottom:'pants',bottomColor:'#2A3348',shoes:'#2E2E3A',extras:['cape'],face:false},
  witch:{skin:'#E7B48C',hair:'long',hairColor:'#2B1B12',eyes:'happy',mouth:'smile',top:'dress',topColor:'#4A3470',bottom:'skirt',bottomColor:'#4A3470',shoes:'#2E2E3A',extras:['blush'],face:false},
  astronaut:{skin:'#E7B48C',hair:'short',hairColor:'#4A2F1C',eyes:'round',mouth:'o',top:'hoodie',topColor:'#E8EEF4',bottom:'pants',bottomColor:'#D5DDE6',shoes:'#8A93A0',extras:[],face:false},
  ninja:{skin:'#C98E62',hair:'short',hairColor:'#1A1A1A',eyes:'happy',mouth:'smile',top:'hoodie',topColor:'#2A2A32',bottom:'pants',bottomColor:'#2A2A32',shoes:'#1A1A1A',extras:[],face:false}
};
function cfgFor(p){const L=lookOf(p);if(L.hero==='custom'&&p.avatar3d)return p.avatar3d;return AV_PRESET[L.id]||AV_PRESET[L.hero]||AV_PRESET.boy}
const avHas=(c,x)=>(c.extras||[]).includes(x);
function faceTex(p){const a=artOf('face',p);if(!a||!a.img||!a.img.naturalWidth)return null;
  const k='face|'+a.id+'|'+a.t;if(TEX[k])return TEX[k];const t=new THREE.Texture(a.img);t.encoding=THREE.sRGBEncoding;t.needsUpdate=true;return TEX[k]=t}
function buildChibi(c,f,o={}){
  const p=o.player||cur(),g=new THREE.Group(),skin=c.skin,shoes=c.shoes||'#5A3A22',bot=c.bottomColor,cloth={r:.84};
  const top=c.topColor==='shirt'?(SHIRTS.find(s=>s[0]===f.shirt)||SHIRTS[0])[2]:c.topColor;
  const longSleeves=c.top==='hoodie'||c.top==='sweater',legs=[],arms=[],eyes=[];
  const legCloth=c.bottom==='pants'&&c.top!=='dress';
  for(const s of[-1,1]){const pv=new THREE.Group();pv.position.set(s*.11,.78,0);g.add(pv);
    pv.add(mesh(CYL(.075,.08,.36,12),legCloth?bot:skin,0,-.2,0,cloth));
    pv.add(mesh(CYL(.055,.062,.34,12),legCloth?shade(bot,-.08):skin,0,-.52,0,{r:.8}));
    pv.add(mesh(rbox(.16,.08,.26,.03),shoes,0,-.72,.04,{r:.55}));legs.push(pv)}
  const body=new THREE.Group();g.add(body);
  body.add(mesh(CYL(.15,.18,.28,16),top,0,.9,0,cloth));
  body.add(mesh(SPH(.2,18,12),top,0,1.08,0,cloth));
  body.add(mesh(CYL(.055,.07,.14,10),skin,0,1.24,0,{r:.62}));
  if(c.top==='dress')body.add(mesh(CYL(.16,.42,.5,24),top,0,.62,0,cloth));
  else if(c.bottom==='skirt')body.add(mesh(CYL(.16,.36,.32,24),bot,0,.64,0,cloth));
  else if(c.bottom==='shorts')body.add(mesh(CYL(.17,.19,.2,16),bot,0,.7,0,cloth));
  else body.add(mesh(CYL(.16,.17,.16,16),bot,0,.74,0,cloth));
  if(c.top==='overalls'){body.add(mesh(CYL(.17,.18,.22,16),bot,0,.78,0,cloth));body.add(mesh(rbox(.22,.22,.05,.03),bot,0,.98,.16,cloth));
    for(const s of[-1,1]){body.add(mesh(BOX(.045,.28,.03),bot,s*.09,1.12,.12));body.add(mesh(SPH(.025,8,6),'#C9A15A',s*.08,1.02,.16,{m:.35}))}}
  if(c.top==='hoodie'){const hood=mesh(new THREE.TorusGeometry(.16,.07,10,18),shade(top,-.08),0,1.28,-.08,cloth);hood.rotation.x=1.15;body.add(hood);
    body.add(mesh(rbox(.18,.08,.04,.03),shade(top,-.12),0,.86,.16,cloth))}
  if(c.top==='sweater'){const col=mesh(new THREE.TorusGeometry(.11,.035,8,16),shade(top,-.12),0,1.22,0,{r:.75});col.rotation.x=Math.PI/2;body.add(col);
    for(const y of[.78,.96])body.add(mesh(CYL(.185,.185,.03,16),shade(top,.08),0,y,0,{r:.75}))}
  if(c.top==='tee')body.add(mesh(SPH(.02,8,6),'#F4F1EA',0,1.02,.18,{r:.5}));
  for(const s of[-1,1]){const pv=new THREE.Group();pv.position.set(s*.24,1.08,0);body.add(pv);
    pv.add(mesh(CYL(.045,.05,longSleeves?.32:.16,10),top,0,longSleeves?-.16:-.08,0,cloth));
    if(!longSleeves)pv.add(mesh(CYL(.038,.042,.2,10),skin,0,-.26,0,{r:.62}));
    pv.add(mesh(SPH(.055,12,10),skin,0,-.4,0,{r:.58}));arms.push(pv)}
  if(avHas(c,'cape')){const cp=new THREE.Mesh(new THREE.PlaneGeometry(.42,.7),new THREE.MeshStandardMaterial({color:col('#8E2E34'),roughness:.86,side:THREE.DoubleSide}));
    cp.position.set(0,.78,-.2);cp.rotation.x=.08;cp.castShadow=true;body.add(cp);body.add(mesh(new THREE.TorusGeometry(.12,.02,6,16,Math.PI),'#C9A15A',0,1.16,-.04,{m:.3}))}
  if(avHas(c,'backpack')){body.add(mesh(rbox(.28,.32,.14,.05),'#C47A3A',0,.9,-.22,cloth));body.add(mesh(rbox(.18,.1,.04,.02),'#E6C48A',0,.84,-.3,{r:.7}))}
  const head=new THREE.Group();head.position.set(0,1.5,0);body.add(head);
  head.add(mesh(SPH(.52,28,22),skin,0,0,0,{r:.58}));
  for(const s of[-1,1])head.add(mesh(SPH(.09,10,8),skin,s*.48,-.02,-.02,{r:.6}));
  const ft=c.face&&faceTex(p);
  if(ft){   // the child's own photo face, wrapped onto the front of the head
    const m=new THREE.Mesh(new THREE.SphereGeometry(.528,32,20,Math.PI/2-.95,1.9,Math.PI/2-.9,1.75),new THREE.MeshStandardMaterial({map:ft,transparent:true,roughness:.85}));head.add(m);
  }else{
    const eye=(s,kind)=>{const e=new THREE.Group();e.position.set(s*.18,.03,.46);head.add(e);
      if(kind==='happy'){const a=mesh(new THREE.TorusGeometry(.065,.022,6,14,Math.PI),'#2A1B4A',0,-.02,.02);e.add(a);return}
      const big=kind==='sparkle';const w=mesh(SPH(big?.11:.09,14,12),'#FFFFFF',0,0,0,{r:.3});w.scale.z=.6;e.add(w);
      const pu=mesh(SPH(big?.085:.065,14,12),'#2A1B4A',0,-.005,.04,{r:.2});pu.scale.z=.6;e.add(pu);
      const gl=(x,y,r)=>{const m=new THREE.Mesh(SPH(r,6,6),new THREE.MeshBasicMaterial({color:'#fff',toneMapped:false}));m.position.set(x,y,.09);e.add(m)};
      gl(.025,.03,big?.026:.02);if(big)gl(-.03,-.03,.014);eyes.push(e)};
    if(c.eyes==='wink'){eye(-1,'round');eye(1,'happy')}else for(const s of[-1,1])eye(s,c.eyes||'round');
    head.add(mesh(SPH(.035,8,6),shade(skin,-.08),0,-.06,.515));
    const mz=.49,my=-.17;
    if(c.mouth==='grin'){const m=new THREE.Mesh(new THREE.CircleGeometry(.085,18,Math.PI,Math.PI),mat('#8A2E3B'));m.position.set(0,my+.02,mz+.01);head.add(m);
      const t=new THREE.Mesh(new THREE.PlaneGeometry(.11,.025),mat('#FFFFFF'));t.position.set(0,my+.007,mz+.015);head.add(t)}
    else if(c.mouth==='cat'){for(const s of[-1,1]){const a=mesh(new THREE.TorusGeometry(.035,.012,6,10,Math.PI),'#8A3B3B',s*.035,my,mz);a.rotation.z=Math.PI;head.add(a)}}
    else if(c.mouth==='o')head.add(mesh(new THREE.TorusGeometry(.035,.014,8,16),'#8A3B3B',0,my,mz));
    else{const a=mesh(new THREE.TorusGeometry(.075,.018,8,16,Math.PI),'#8A3B3B',0,my+.02,mz);a.rotation.z=Math.PI;head.add(a)}
    if(avHas(c,'blush'))for(const s of[-1,1]){const b=mesh(SPH(.075,10,8),'#FF9DB0',s*.31,-.1,.4,{r:.8});b.scale.z=.4;head.add(b)}
  }
  // hair
  const H=c.hairColor||'#4A2F1C',hm=(geo,x,y,z,sx,sy,sz)=>{const m=mesh(geo,H,x,y,z,{r:.6});if(sx)m.scale.set(sx,sy,sz);head.add(m);return m};
  hm(new THREE.SphereGeometry(.545,32,16,0,Math.PI*2,0,Math.PI/2.3),0,.04,-.02);
  hm(SPH(.34,18,10),0,.28,.3,1.35,.42,.6);   // fringe
  const hs=c.hair||'short';
  if(hs==='spiky')for(let k=0;k<8;k++){const a=k/8*Math.PI*2,cn=hm(new THREE.ConeGeometry(.12,.32,6),Math.cos(a)*.3,.42,Math.sin(a)*.3-.05);cn.rotation.set(Math.sin(a)*.6,0,-Math.cos(a)*.6)}
  if(hs==='bob'||hs==='long'){hm(SPH(.55,22,16),0,-.1,-.1,1.02,hs==='long'?1.2:.88,.88);for(const s of[-1,1])hm(SPH(.2,12,10),s*.44,-.22,.06,.7,hs==='long'?2:1.35,1)}
  if(hs==='long')hm(SPH(.42,18,14),0,-.55,-.2,1.05,1.2,.7);
  if(hs==='pigtails')for(const s of[-1,1]){hm(SPH(.18,14,12),s*.5,-.2,-.06);hm(SPH(.19,14,12),s*.72,-.4,-.06,1,1.5,1)}
  if(hs==='bun'){hm(SPH(.21,16,12),0,.58,-.12);hm(SPH(.55,22,16),0,-.06,-.08,1.02,.85,.9)}
  if(hs==='ponytail'){hm(SPH(.15,12,10),0,.1,-.55);hm(SPH(.16,12,10),0,-.22,-.66,1,1.7,1)}
  if(hs==='curly'){for(let k=0;k<16;k++){const a=k/16*Math.PI*2,y=k%2?.1:-.12;hm(SPH(.15,10,8),Math.cos(a)*.5,y,Math.sin(a)*.5-.04)}hm(SPH(.18,10,8),0,.5,0)}
  if(hs==='short'||hs==='spiky'||hs==='curly')hm(SPH(.5,20,14),0,-.02,-.14,1.04,.9,.85);
  // head extras
  if(avHas(c,'glasses')&&!ft){for(const s of[-1,1])head.add(mesh(new THREE.TorusGeometry(.12,.018,8,24),'#2E2E3A',s*.18,.03,.5,{m:.4}));head.add(mesh(BOX(.12,.02,.02),'#2E2E3A',0,.05,.52))}
  if(avHas(c,'bow')){const bw=new THREE.Group();bw.position.set(.3,.42,.12);bw.rotation.z=-.4;head.add(bw);
    for(const k of[-1,1]){const b=mesh(new THREE.ConeGeometry(.1,.2,10),'#FF6FA8',k*.09,0,0,{r:.4});b.rotation.z=k*Math.PI/2;bw.add(b)}bw.add(mesh(SPH(.055,8,6),'#FF3D8B'))}
  if(avHas(c,'flower')){const fl=new THREE.Group();fl.position.set(-.4,.28,.25);head.add(fl);
    for(let k=0;k<5;k++){const a=k/5*Math.PI*2;fl.add(mesh(SPH(.055,8,6),'#FFFFFF',Math.cos(a)*.07,Math.sin(a)*.07,0))}fl.add(mesh(SPH(.045,8,6),'#FFD43B',0,0,.02))}
  const hat=buildHat(f.hat);hat.scale.setScalar(.85);hat.position.y=.02;head.add(hat);
  if(o.showTag!==false){const tag=labelSprite(p.name,{bg:'rgba(214,150,30,.95)',fg:'#FFFFFF',border:'#FFF1B8',h:.45});tag.position.y=2.15;g.add(tag)}
  g.add(shadowDisc(.38));
  head.scale.setScalar(.58);
  g.userData={legs,arms,body,head,eyes,bodyBase:0};
  return g;
}
/* Solid animals. One builder covers the farm neighbors, the school teachers, and the animal looks. */
const BEAST={
  cat:{color:'#C4844A',belly:'#F3E2CF',ears:'point',snout:.06,tail:'thin',nLegs:4,leg:.26,hr:.15,hy:.58,hz:.24},
  bunny:{color:'#F4F0EA',belly:'#FFFFFF',ears:'long',ear:'#F4C9D0',snout:.05,tail:'bush',tailColor:'#FFFFFF',nLegs:4,leg:.22,hr:.15,hy:.55,hz:.2},
  dog:{color:'#C4965A',belly:'#F0E0C8',ears:'long',snout:.08,tail:'thin',nLegs:4,leg:.28,hr:.16,hy:.6,hz:.26},
  fox:{color:'#E07A2F',belly:'#F7F1E6',ears:'point',ear:'#2A2A2A',snout:.07,snoutColor:'#F7F1E6',tail:'bush',tailColor:'#E07A2F',nLegs:4,leg:.26,hr:.15,hy:.58,hz:.24},
  panda:{color:'#F7F7F5',belly:'#F7F7F5',ears:'round',ear:'#2A2A2A',mask:true,snout:.06,nLegs:4,leg:.24,legColor:'#2A2A2A',hr:.17,hy:.6,hz:.22},
  koala:{color:'#9AA4AE',belly:'#E4E8EC',ears:'round',ear:'#E4E8EC',snout:.08,snoutColor:'#3A3A3A',nose:'#3A3A3A',nLegs:4,leg:.2,hr:.18,hy:.55,hz:.2},
  tiger:{color:'#E8A04A',belly:'#F7F1E6',ears:'round',stripes:true,snout:.07,tail:'thin',nLegs:4,leg:.28,hr:.16,hy:.62,hz:.26},
  frog:{color:'#5C9A45',belly:'#E4F0C8',eyes:true,snout:.04,nLegs:4,leg:.16,hr:.14,hy:.42,hz:.22,bx:.4,byy:.22},
  chick:{color:'#F2C14A',belly:'#FFE08A',beak:'#E07A1A',comb:true,nLegs:2,leg:.2,legColor:'#E07A1A',hr:.14,hy:.48,hz:.16,wings:true,wing:'#E2B03A'},
  chicken:{color:'#F4F1EA',belly:'#FFFFFF',beak:'#E07A1A',comb:true,nLegs:2,leg:.24,legColor:'#E07A1A',hr:.14,hy:.52,hz:.16,wings:true,wing:'#E6E0D4'},
  unicorn:{color:'#F7F4EE',belly:'#FFFFFF',ears:'point',horn:true,mane:'#F2B7D4',tail:'thin',tailColor:'#F2B7D4',nLegs:4,leg:.36,hoof:'#E7D7C4',hr:.14,hy:.78,hz:.32},
  dragon:{color:'#5C8A4A',belly:'#D7E2A8',ears:'point',horn:true,wings:true,wing:'#6E9A58',tail:'thin',nLegs:4,leg:.26,hr:.16,hy:.64,hz:.28},
  bear:{color:'#8A5A32',belly:'#E6C8A4',ears:'round',snout:.1,snoutColor:'#E6C8A4',nose:'#3A2A24',nLegs:4,leg:.3,hr:.2,hy:.72,hz:.26,bx:.48,byy:.34,bz:.36},
  raccoon:{color:'#8E8A86',belly:'#E8E4DE',ears:'round',mask:true,snout:.06,tail:'bush',tailColor:'#6E6A66',stripes:true,nLegs:4,leg:.24,hr:.15,hy:.58,hz:.22},
  elephant:{color:'#B7B8BE',belly:'#D5D6DC',ears:'round',ear:'#C8C9D0',trunk:true,snout:.04,nLegs:4,leg:.34,hr:.18,hy:.78,hz:.3,bx:.5,byy:.32},
  horse:{color:'#8C5A32',belly:'#E4CDB0',ears:'point',mane:'#3A2416',tail:'thin',tailColor:'#3A2416',hoof:'#2A211C',nLegs:4,leg:.4,hr:.13,hy:.86,hz:.36,bx:.46,bz:.28},
  parrot:{color:'#3E9A4A',belly:'#F2E27A',beak:'#E07A1A',wings:true,wing:'#2E7A3A',tail:'thin',tailColor:'#2E7A3A',nLegs:2,leg:.18,legColor:'#C9A15A',hr:.13,hy:.5,hz:.16},
  otter:{color:'#7A5340',belly:'#E6D2C0',ears:'round',snout:.06,tail:'thin',nLegs:4,leg:.18,hr:.14,hy:.42,hz:.26,bx:.46,byy:.2,bz:.22},
  owl:{color:'#C4A574',belly:'#F4EBD8',ears:'point',ear:'#C4A574',beak:'#E0A030',wings:true,wing:'#A88858',nLegs:2,leg:.16,legColor:'#E0A030',hr:.18,hy:.55,hz:.12,eye:'#E8A020'},
  turtle:{color:'#6E8A4A',belly:'#E6D8A8',shell:'#6B4A32',snout:.05,nLegs:4,leg:.14,hr:.12,hy:.4,hz:.28,bx:.4,byy:.18},
  lion:{color:'#E0A85A',belly:'#F6E6C4',ears:'round',mane:'#C4843A',snout:.07,tail:'thin',tailColor:'#C4843A',nLegs:4,leg:.32,hr:.15,hy:.7,hz:.28},
  penguin:{color:'#2C3038',belly:'#F4F6F8',beak:'#E07A2A',flippers:true,nLegs:2,leg:.16,legColor:'#E07A2A',hr:.15,hy:.55,hz:.14,bx:.28,byy:.36},
  zebra:{color:'#F4F4F2',belly:'#F7F7F5',ears:'point',mane:'#2A2A2A',stripes:true,tail:'thin',hoof:'#2A2A2A',nLegs:4,leg:.38,hr:.13,hy:.82,hz:.32},
  octopus:{color:'#C45B78',belly:'#F0C2CE',tentacles:8,nLegs:0,hr:.2,hy:.55,hz:.1,bx:.32,byy:.28,eyes:true},
  beaver:{color:'#8C5A32',belly:'#E6CDB0',ears:'round',snout:.06,tail:'flat',tailColor:'#6B4228',nLegs:4,leg:.2,hr:.15,hy:.5,hz:.24},
  dino:{color:'#6E9A58',belly:'#D5E2B0',snout:.1,tail:'thin',nLegs:4,leg:.3,hr:.14,hy:.85,hz:.34,bx:.4,bz:.28},
  sheep:{color:'#F7F6F2',belly:'#F7F6F2',ears:'round',snout:.07,snoutColor:'#3A3A3A',nose:'#3A3A3A',legColor:'#3A3A3A',nLegs:4,leg:.26,hr:.16,hy:.62,hz:.24,bx:.4,byy:.3},
  cow:{color:'#F4F1EA',belly:'#F7F4EE',ears:'round',snout:.1,snoutColor:'#F0B0B4',nose:'#E08A90',spots:true,nLegs:4,leg:.36,hr:.16,hy:.78,hz:.3,bx:.5,byy:.32},
  duck:{color:'#F2C14A',belly:'#F7E7A0',beak:'#E07A1A',wings:true,wing:'#E2B03A',nLegs:2,leg:.12,legColor:'#E07A1A',hr:.12,hy:.36,hz:.16,bx:.28,byy:.18}
};
const NPC_KIND={'🐻':'bear','🦝':'raccoon','🐘':'elephant','🐴':'horse','🦜':'parrot','🦦':'otter','🦉':'owl','🐢':'turtle','🦁':'lion','🐧':'penguin','🦓':'zebra','🐙':'octopus','🦊':'fox','🦫':'beaver','🦕':'dino','🐝':'chick'};
function buildBeast(o){
  const g=new THREE.Group(),skin=o.color,rough=.8;
  const body=new THREE.Group();g.add(body);
  const by=o.by==null?0.58:o.by,bx=o.bx||.4,byy=o.byy||.28,bz=o.bz||.3;
  const hips=mesh(SPH(1,18,14),skin,0,by-.04,-bz*.15,{r:rough});hips.scale.set(bx*.95,byy*.9,bz*.85);body.add(hips);
  const chest=mesh(SPH(1,18,12),skin,0,by+byy*.45,bz*.15,{r:rough});chest.scale.set(bx*.7,byy*.8,bz*.62);body.add(chest);
  if(o.belly){const b=mesh(SPH(1,14,10),o.belly,0,by-.02,bz*.55,{r:.75});b.scale.set(bx*.5,byy*.45,.08);body.add(b)}
  if(o.spots)for(const [x,y,z,s] of [[.12,.08,.08,.08],[-.16,.02,-.04,.1],[.05,-.06,.12,.06]]){const p=mesh(SPH(s,8,6),'#6E5344',x,by+y,z,{r:rough});body.add(p)}
  if(o.shell){const sh=mesh(SPH(.32,16,12),o.shell,0,by+.1,-.02,{r:.62});sh.scale.set(1.2,.62,1.05);body.add(sh)}
  if(o.stripes)for(let k=0;k<4;k++){const s=mesh(BOX(.035,byy*1.7,.02),'#2A2A2A',(k-1.5)*.11,by,bz*.2,{r:.7});body.add(s)}
  const legs=[],n=o.nLegs==null?4:o.nLegs,legH=o.leg||.26;
  const xs=n<=2?[-.09,.09]:[-.15,.15,-.15,.15],zs=n<=2?[.02,.02]:[.1,.1,-.12,-.12];
  for(let i=0;i<n;i++){const pv=new THREE.Group();pv.position.set(xs[i],legH,zs[i]);body.add(pv);
    const rad=Math.min(.075,Math.max(.035,legH*.22));
    pv.add(mesh(CYL(rad,rad*1.05,legH*.52,8),o.legColor||shade(skin,-.1),0,-legH*.26,0,{r:rough}));
    pv.add(mesh(CYL(rad*.75,rad*.8,legH*.5,8),o.legColor||shade(skin,-.14),0,-legH*.74,0,{r:rough}));
    if(o.hoof)pv.add(mesh(CYL(.06,.062,.05,8),o.hoof,0,-legH,0,{r:.55}));
    legs.push(pv)}
  if(o.wings)for(const s of[-1,1]){const w=mesh(SPH(.2,12,8),o.wing||shade(skin,-.1),s*(bx+.02),by,.02,{r:rough});w.scale.set(.28,.85,.12);w.rotation.z=s*.35;body.add(w)}
  if(o.flippers)for(const s of[-1,1]){const w=mesh(SPH(.1,10,8),skin,s*(bx*.7),by-.02,.04,{r:rough});w.scale.set(.45,1.3,.28);w.rotation.z=s*.9;body.add(w)}
  if(o.tentacles)for(let k=0;k<o.tentacles;k++){const a=k/o.tentacles*Math.PI*2;const t=mesh(CYL(.028,.016,.42,6),shade(skin,-.08),Math.cos(a)*.14,by-.32,Math.sin(a)*.14,{r:rough});t.rotation.x=.25*Math.sin(a);body.add(t)}
  if(o.tail==='bush')body.add(mesh(SPH(.13,10,8),o.tailColor||skin,0,by+.02,-bz-.06,{r:.85}));
  else if(o.tail==='thin'){const t=mesh(CYL(.02,.015,.32,6),o.tailColor||skin,.04,by+.04,-bz-.08,{r:rough});t.rotation.x=1.15;body.add(t)}
  else if(o.tail==='flat')body.add(mesh(BOX(.18,.035,.24),o.tailColor||skin,0,by-.04,-bz-.08,{r:.6}));
  const hr=o.hr||.16,head=new THREE.Group();head.position.set(0,o.hy||(by+byy*.8),o.hz||bz);body.add(head);
  body.add(mesh(CYL(hr*.42,hr*.5,hr*.7,8),o.head||skin,0,(o.hy||(by+byy*.8))-hr*.55,(o.hz||bz)*.35,{r:rough}));
  head.add(mesh(SPH(hr,18,14),o.head||skin,0,0,0,{r:.7}));
  const eyes=[];
  if(o.eyes!==false)for(const s of[-1,1]){const e=new THREE.Group();e.position.set(s*hr*.52,hr*.12,hr*.78);head.add(e);
    const w=mesh(SPH(hr*.32,10,8),'#F7F4EE',0,0,0,{r:.4});w.scale.z=.5;e.add(w);
    const pu=mesh(SPH(hr*.16,10,8),o.eye||'#24180F',0,-.01,.035,{r:.35});pu.scale.z=.45;e.add(pu);eyes.push(e)}
  if(o.ears==='point')for(const s of[-1,1])head.add(mesh(new THREE.ConeGeometry(hr*.38,hr*1.15,8),o.ear||skin,s*hr*.72,hr*.9,0,{r:rough}));
  else if(o.ears==='long')for(const s of[-1,1]){const e=mesh(SPH(hr*.42,10,8),o.ear||skin,s*hr*.45,hr*1.35,-.02,{r:rough});e.scale.set(.4,1.7,.32);head.add(e)}
  else if(o.ears==='round')for(const s of[-1,1])head.add(mesh(SPH(hr*.48,10,8),o.ear||skin,s*hr*.85,hr*.55,0,{r:rough}));
  if(o.snout){const sn=mesh(SPH(o.snout,10,8),o.snoutColor||o.belly||skin,0,-hr*.05,hr+o.snout*.35,{r:.65});sn.scale.set(1.15,.65,.75);head.add(sn);
    head.add(mesh(SPH(o.snout*.38,8,6),o.nose||'#3A2A28',0,.01,hr+o.snout*.85,{r:.45}))}
  if(o.beak){const bk=mesh(new THREE.ConeGeometry(hr*.38,hr*.75,8),o.beak,0,-hr*.05,hr*.95,{r:.5});bk.rotation.x=Math.PI/2;head.add(bk)}
  if(o.trunk){const tr=mesh(CYL(.045,.03,.42,8),o.head||skin,0,-hr*.35,hr+.08,{r:rough});tr.rotation.x=.85;head.add(tr)}
  if(o.mane){const m=mesh(SPH(hr*1.45,14,10),o.mane,0,.02,-.04,{r:.88});head.add(m)}
  if(o.horn)head.add(mesh(new THREE.ConeGeometry(.035,.26,8),'#F3E6C4',0,hr+.08,.02,{r:.4}));
  if(o.mask)for(const s of[-1,1]){const m=mesh(SPH(hr*.48,8,6),'#2A2A2E',s*hr*.48,hr*.05,hr*.45,{r:.55});m.scale.z=.3;head.add(m)}
  if(o.comb)head.add(mesh(new THREE.ConeGeometry(.045,.12,6),'#D64545',0,hr*.95,.02,{r:.5}));
  g.userData={legs:legs.length?legs:[new THREE.Object3D(),new THREE.Object3D()],arms:[new THREE.Object3D(),new THREE.Object3D()],body,head,eyes};
  g.add(shadowDisc(o.shadow||.42));
  return g;
}
/* A child's own animal picture as a solid 3D cut-out: the picture on the front and back, darker layers
   between them for a thick edge, standing on its feet. userData matches buildBeast so animHero can bob it;
   userData.pic is the cut-out, which the farm turns toward the camera so it never shows its thin side. */
function buildPicBeast(key,h){
  const tex=iconTex(key,''),img=tex.image||{},iw=img.naturalWidth||img.width||1,ih=img.naturalHeight||img.height||1;
  const g=new THREE.Group(),body=new THREE.Group(),pic=new THREE.Group();g.add(body);body.add(pic);
  const geo=new THREE.PlaneGeometry(h*iw/ih,h);geo.translate(0,h/2,0);geo.userData.keep=true;
  const face=new THREE.MeshStandardMaterial({map:tex,alphaTest:.5,side:THREE.DoubleSide,roughness:.7});
  const edge=new THREE.MeshStandardMaterial({map:tex,alphaTest:.5,side:THREE.DoubleSide,roughness:.85,color:col('#8E8478')});
  const N=12,depth=h*.12;
  for(let k=0;k<N;k++){const m=new THREE.Mesh(geo,k===0||k===N-1?face:edge);m.position.z=depth*(k/(N-1)-.5);pic.add(m)}
  const front=pic.children[N-1];front.castShadow=true;   // its shadow follows the picture's shape, not the square
  front.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:tex,alphaTest:.5});
  g.add(shadowDisc(h*.38));
  const stub=()=>new THREE.Object3D();
  g.userData={legs:[stub(),stub()],arms:[stub(),stub()],body,head:stub(),eyes:[],pic,top:h};
  return g;
}
/* A child's own 3D animal model (modelOf in art.js), h tall, facing +z like buildBeast. userData.anim plays
   the model's own walk and idle animations, if it has them; animHero only bobs it. */
function buildModelBeast(obj,h){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);body.add(fitModel(obj,{h,w:h*1.8,d:h*1.8}));
  g.add(shadowDisc(h*.42));
  const stub=()=>new THREE.Object3D();
  g.userData={legs:[stub(),stub()],arms:[stub(),stub()],body,head:stub(),eyes:[],anim:modelAnim(obj),top:h};
  return g;
}
function buildNpc(npc){const id=NPC_KIND[npc&&npc.e]||'bear';const g=buildBeast(BEAST[id]||BEAST.bear);g.scale.setScalar(1.35);return g}

