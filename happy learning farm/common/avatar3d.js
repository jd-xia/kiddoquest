/* Happy Learning Farm — avatar3d: the cute big-head (Q版) 3D kid used for every human character.
   A design is a small object (see AV_PRESET); the Farm girl/boy looks use a preset, and a child's own
   design from the Character Maker (js/studio.js) lives in Player.avatar3d. buildChibi() turns a design
   into a model with the same userData shape as buildHero, so animHero() works on it.
   Loaded after engine3d.js on every page that draws 3D. */
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
  boy:{skin:'#F5CBA7',hair:'short',hairColor:'#4A2F1C',eyes:'round',mouth:'smile',top:'tee',topColor:'shirt',bottom:'pants',bottomColor:'#34539E',shoes:'#5A3A22',extras:['blush'],face:false},
  girl:{skin:'#F5CBA7',hair:'pigtails',hairColor:'#6B3A1E',eyes:'sparkle',mouth:'smile',top:'dress',topColor:'#EC6FA9',bottom:'skirt',bottomColor:'#EC6FA9',shoes:'#E5484D',extras:['blush','bow'],face:false}
};
function cfgFor(p){const L=lookOf(p);if(L.hero==='custom'&&p.avatar3d)return p.avatar3d;return AV_PRESET[L.hero==='girl'?'girl':'boy']}
const avHas=(c,x)=>(c.extras||[]).includes(x);
function faceTex(p){const a=artOf('face',p);if(!a||!a.img||!a.img.naturalWidth)return null;
  const k='face|'+a.id+'|'+a.t;if(TEX[k])return TEX[k];const t=new THREE.Texture(a.img);t.encoding=THREE.sRGBEncoding;t.needsUpdate=true;return TEX[k]=t}
function buildChibi(c,f,o={}){
  const p=o.player||cur(),g=new THREE.Group(),skin=c.skin,shoes=c.shoes||'#5A3A22',bot=c.bottomColor;
  const top=c.topColor==='shirt'?(SHIRTS.find(s=>s[0]===f.shirt)||SHIRTS[0])[2]:c.topColor;
  const longSleeves=c.top==='hoodie'||c.top==='sweater',legs=[],arms=[],eyes=[];
  // legs and shoes
  for(const s of[-1,1]){const pv=new THREE.Group();pv.position.set(s*.13,.44,0);g.add(pv);
    pv.add(mesh(rbox(.19,.34,.21,.07),c.bottom==='pants'&&c.top!=='dress'?bot:skin,0,-.19,0,{r:.7}));
    pv.add(mesh(rbox(.23,.13,.32,.06),shoes,0,-.38,.05,{r:.5}));legs.push(pv)}
  const body=new THREE.Group();g.add(body);
  // body and clothes
  body.add(mesh(CYL(.26,.31,.5,20),top,0,.74,0,{r:.7}));body.add(mesh(SPH(.26,20,10),top,0,.98,0,{r:.7}));
  if(c.top==='dress')body.add(mesh(CYL(.3,.54,.44,24),top,0,.42,0,{r:.7}));
  else if(c.bottom==='skirt')body.add(mesh(CYL(.3,.47,.26,24),bot,0,.44,0,{r:.7}));
  else if(c.bottom==='shorts')body.add(mesh(CYL(.29,.32,.22,20),bot,0,.48,0,{r:.7}));
  else body.add(mesh(CYL(.29,.3,.16,20),bot,0,.5,0,{r:.7}));
  if(c.top==='overalls'){body.add(mesh(CYL(.285,.3,.24,20),bot,0,.56,0,{r:.7}));body.add(mesh(rbox(.32,.28,.07,.04),bot,0,.78,.26,{r:.7}));
    for(const s of[-1,1]){body.add(mesh(BOX(.06,.34,.04),bot,s*.13,.96,.2));body.add(mesh(SPH(.03,8,6),'#FFD43B',s*.12,.86,.3,{m:.6}))}}
  if(c.top==='hoodie'){const hood=mesh(new THREE.TorusGeometry(.22,.09,10,20),shade(top,-.06),0,1.12,-.12,{r:.7});hood.rotation.x=1.2;body.add(hood);
    body.add(mesh(rbox(.26,.12,.06,.04),shade(top,-.12),0,.66,.29,{r:.7}))}
  if(c.top==='sweater'){const col=mesh(new THREE.TorusGeometry(.17,.05,8,20),shade(top,-.15),0,1.14,0,{r:.8});col.rotation.x=Math.PI/2;body.add(col);
    for(const y of[.62,.8])body.add(mesh(CYL(.305,.305,.04,20),shade(top,.12),0,y,0,{r:.8}))}
  if(c.top==='tee')body.add(mesh(SPH(.035,8,6),'#FFFFFF',0,.88,.29,{r:.4}));
  // arms
  for(const s of[-1,1]){const pv=new THREE.Group();pv.position.set(s*.33,.98,0);body.add(pv);
    pv.add(mesh(rbox(.15,longSleeves?.36:.17,.16,.06),top,0,longSleeves?-.17:-.08,0,{r:.7}));
    if(!longSleeves)pv.add(mesh(rbox(.12,.2,.13,.05),skin,0,-.25,0,{r:.6}));
    pv.add(mesh(SPH(.085,12,10),skin,0,-.39,0,{r:.6}));arms.push(pv)}
  if(avHas(c,'cape')){const cp=new THREE.Mesh(new THREE.PlaneGeometry(.66,.8),new THREE.MeshStandardMaterial({color:col('#E5484D'),roughness:.8,side:THREE.DoubleSide}));
    cp.position.set(0,.66,-.31);cp.rotation.x=.14;cp.castShadow=true;body.add(cp);body.add(mesh(new THREE.TorusGeometry(.2,.03,6,16,Math.PI),'#F7C548',0,1.08,-.05,{m:.5}))}
  if(avHas(c,'backpack')){body.add(mesh(rbox(.42,.44,.2,.08),'#FF8A1F',0,.8,-.33,{r:.7}));body.add(mesh(rbox(.3,.16,.06,.04),'#FFD43B',0,.72,-.44,{r:.7}))}
  // head
  const head=new THREE.Group();head.position.y=1.48;body.add(head);
  head.add(mesh(SPH(.52,32,24),skin,0,0,0,{r:.6}));
  for(const s of[-1,1])head.add(mesh(SPH(.1,10,8),skin,s*.5,-.03,0,{r:.6}));
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
  const hat=buildHat(f.hat);hat.scale.setScalar(1.2);hat.position.y=.05;head.add(hat);
  if(o.showTag!==false){const tag=labelSprite(p.name,{bg:'rgba(214,150,30,.95)',fg:'#FFFFFF',border:'#FFF1B8',h:.45});tag.position.y=2.8;g.add(tag)}
  g.add(shadowDisc(.45));
  g.userData={legs,arms,body,head,eyes};return g;
}
