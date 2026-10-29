/* Happy Learning Farm — 3D fish for the underwater tug-of-war. */
const FISH_LOOK={
  minnow:{body:'#1B7FBE',belly:'#D7F3FF',fin:'#0E5C96',dark:'#0A3E66',fat:0.82,long:1.22,wide:0.58,eye:1.15,scales:true},
  carp:{body:'#E08A00',belly:'#FFE08A',fin:'#C2410C',dark:'#8A4B00',fat:1.2,long:1.02,wide:0.72,eye:1.15,scales:true,whiskers:true},
  bass:{body:'#1F7A3A',belly:'#D5F0B0',fin:'#14532D',dark:'#0F2E18',fat:1.05,long:1.12,wide:0.66,eye:1.15,scales:true,bars:true,jaw:true},
  koi:{body:'#E23B1A',belly:'#FFE4D6',fin:'#BE123C',dark:'#9F1239',fat:1,long:1.16,wide:0.6,eye:1.15,scales:true,spots:true,flow:1.45},
  octopus:{body:'#B44EC8',belly:'#F8D4FA',fin:'#7A2A88',dark:'#4E1658',eye:1.25}
};
let fishGL=null;
const fishUp=new THREE.Vector3(0,1,0),fishA=new THREE.Vector3(),fishB=new THREE.Vector3();
function fishHex(hex,k){
  const n=parseInt(String(hex).slice(1),16),ch=i=>Math.max(0,Math.min(255,Math.round(((n>>i)&255)*k)));
  return '#'+[16,8,0].map(i=>ch(i).toString(16).padStart(2,'0')).join('');
}
function fishMat(color,o){
  o=o||{};
  const opt={color:new THREE.Color(color),roughness:o.r==null?0.38:o.r,metalness:o.m||0.06,emissive:new THREE.Color(o.e||'#000000'),emissiveIntensity:o.ei||0,side:o.side||THREE.FrontSide,transparent:!!o.transparent,opacity:o.opacity==null?1:o.opacity};
  if(THREE.MeshPhysicalMaterial){opt.clearcoat=o.coat==null?0.18:o.coat;opt.clearcoatRoughness=0.45;return new THREE.MeshPhysicalMaterial(opt)}
  return new THREE.MeshStandardMaterial(opt);
}
function fishMesh(geo,color,o){const m=new THREE.Mesh(geo,fishMat(color,o));m.castShadow=false;m.receiveShadow=false;return m}
function fishFin(pts){
  const s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],pts[i][1]);
  return new THREE.ShapeGeometry(s,10);
}
function fishDispose(obj){
  obj.traverse(m=>{
    if(m.geometry)m.geometry.dispose();
    if(m.material)[].concat(m.material).forEach(x=>x.dispose());
  });
}
function fishBody(spec){
  const pts=[],n=36;
  for(let i=0;i<=n;i++){
    const t=i/n,y=-1.05+t*2.15;
    let r=Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,t))),0.7)*0.4*spec.fat;
    if(t<0.16)r*=0.45+t*3.4;
    if(t>0.8)r*=Math.pow((1-t)/0.2,0.55);
    pts.push(new THREE.Vector2(Math.max(0.03,r),y));
  }
  const geo=new THREE.LatheGeometry(pts,32);
  geo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI/2));
  geo.scale(spec.long,1,spec.wide);
  geo.computeVertexNormals();
  const nose=new THREE.Vector3(1.05*spec.long,0,0),tail=new THREE.Vector3(-1.1*spec.long,0,0);
  return {geo,nose,tail,top:0.4*spec.fat,wide:0.4*spec.fat*spec.wide};
}
function fishLerp(nose,tail,t){return nose+(tail-nose)*t}
function makeFish(spec){
  const g=new THREE.Group(),body=fishBody(spec),flow=spec.flow||1;
  const hull=fishMesh(body.geo,spec.body,{r:0.32,m:0.08,coat:0.55});
  g.add(hull);
  const belly=fishMesh(new THREE.SphereGeometry(0.28,20,14),spec.belly,{r:0.42,coat:0.1});
  belly.scale.set(spec.long*0.95,0.28*spec.fat,spec.wide*0.7);
  belly.position.set(fishLerp(body.nose.x,body.tail.x,0.46),-body.top*0.72,0);
  g.add(belly);
  const lx=t=>fishLerp(body.nose.x,body.tail.x,t);
  const eyeAt=(z,side)=>{
    const e=new THREE.Group();
    e.add(fishMesh(new THREE.SphereGeometry(0.1*spec.eye,16,12),'#F7FBFF',{r:0.18,coat:0.4}));
    const iris=fishMesh(new THREE.SphereGeometry(0.058*spec.eye,12,10),spec.dark,{r:0.25});
    iris.position.z=0.05*side;e.add(iris);
    const pupil=fishMesh(new THREE.SphereGeometry(0.032*spec.eye,10,8),'#141414',{r:0.2});
    pupil.position.set(0.012*side,-0.006,0.078*side);e.add(pupil);
    const glint=fishMesh(new THREE.SphereGeometry(0.016*spec.eye,6,6),'#FFFFFF',{r:0.1,e:'#FFFFFF',ei:0.8,coat:0});
    glint.position.set(0.028*side,0.03,0.095*side);e.add(glint);
    e.position.set(lx(0.2),body.top*0.28,z);
    g.add(e);
  };
  eyeAt(body.wide*0.92,1);eyeAt(-body.wide*0.92,-1);
  [-1,1].forEach(side=>{
    const gill=fishMesh(new THREE.SphereGeometry(0.16,14,10),fishHex(spec.body,0.86),{r:0.4});
    gill.scale.set(0.42,0.85,0.55);gill.position.set(lx(0.28),-0.02,side*body.wide*0.72);g.add(gill);
  });
  const mouth=fishMesh(new THREE.SphereGeometry(0.05,10,8),spec.dark,{r:0.5});
  mouth.scale.set(0.7,0.45,1);mouth.position.set(body.nose.x-0.02,-0.03,0);g.add(mouth);
  if(spec.jaw){
    const jaw=fishMesh(new THREE.SphereGeometry(0.12,12,8),fishHex(spec.body,0.9),{r:0.4});
    jaw.scale.set(1.1,0.45,0.7);jaw.position.set(lx(0.08),-body.top*0.35,0);g.add(jaw);
  }
  const lateral=fishMesh(new THREE.CylinderGeometry(0.012,0.01,Math.abs(body.tail.x-body.nose.x)*0.5,6),spec.dark,{r:0.45,coat:0});
  lateral.rotation.z=Math.PI/2;lateral.position.set(lx(0.55),0.03,body.wide*0.96);g.add(lateral);
  if(spec.scales){
    const geo=new THREE.SphereGeometry(0.055,8,6);geo.scale(1.35,1,0.55);
    const im=new THREE.InstancedMesh(geo,fishMat(fishHex(spec.body,0.72),{r:0.32,m:0.08,coat:0.25}),42);
    const dummy=new THREE.Object3D();let n=0;
    for(let row=0;row<7;row++)for(let col=0;col<6;col++){
      const u=(row+0.5)/7,v=(col+0.5)/6;
      const x=lx(0.28+u*0.5),y=-body.top*0.2+body.top*0.95*(1-v);
      dummy.position.set(x,y,body.wide*(0.55+0.4*Math.sin(v*Math.PI)));
      dummy.rotation.set(0,0,(row%2)*0.15);
      dummy.scale.setScalar(0.85+(row%2)*0.12);
      dummy.updateMatrix();im.setMatrixAt(n++,dummy.matrix);
    }
    im.instanceMatrix.needsUpdate=true;g.add(im);
  }
  if(spec.bars){
    for(let i=0;i<4;i++){
      const bar=fishMesh(new THREE.BoxGeometry(0.05,body.top*1.7,body.wide*2.15),spec.dark,{r:0.5,coat:0.1});
      bar.position.set(lx(0.34+i*0.12),0.02,0);g.add(bar);
    }
  }
  if(spec.spots){
    const cols=['#FFF8F3','#FFFFFF','#F6B9A4'];
    for(let i=0;i<6;i++){
      const s=fishMesh(new THREE.SphereGeometry(0.06+(i%3)*0.018,10,8),cols[i%3],{r:0.35,coat:0.3});
      s.scale.z=0.45;s.position.set(lx(0.32+(i%3)*0.16),(i%2?0.1:-0.04),body.wide*0.9);g.add(s);
    }
  }
  const finM=o=>fishMat(spec.fin,Object.assign({r:0.42,side:THREE.DoubleSide,transparent:true,opacity:0.94,coat:0.15},o));
  const dorsal=new THREE.Mesh(fishFin([[0,0],[-0.16,0.34*flow],[-0.55,0.46*flow],[-0.78,0.08],[-0.5,0]]),finM());
  dorsal.position.set(lx(0.38),body.top*0.62,0);g.add(dorsal);
  const anal=new THREE.Mesh(fishFin([[0,0],[-0.22,-0.16],[-0.05,-0.2]]),finM());
  anal.position.set(lx(0.62),-body.top*0.45,0);g.add(anal);
  const pecGeo=fishFin([[0,0],[-0.26,0.08],[-0.38,-0.06],[-0.08,-0.16]]);
  const pecL=new THREE.Group(),pecR=new THREE.Group();
  pecL.add(new THREE.Mesh(pecGeo,finM()));pecR.add(new THREE.Mesh(pecGeo.clone(),finM()));
  pecL.position.set(lx(0.32),-0.02,body.wide*0.7);pecR.position.set(lx(0.32),-0.02,-body.wide*0.7);
  pecL.rotation.y=-0.5;pecR.rotation.y=0.5;g.add(pecL);g.add(pecR);
  const tailP=new THREE.Group();
  tailP.position.set(lx(0.86),0,0);
  const tail=new THREE.Mesh(fishFin([[0,0],[-(0.32*flow),0.52*flow],[-(0.62*flow),0.2],[-(0.36*flow),0],[-(0.62*flow),-0.2],[-(0.32*flow),-0.52*flow]]),finM());
  tailP.add(tail);g.add(tailP);
  const whiskers=[];
  if(spec.whiskers){
    [-1,1].forEach(side=>{
      const w=fishMesh(new THREE.CylinderGeometry(0.012,0.004,0.36,6),spec.dark,{r:0.55,coat:0});
      w.position.set(lx(0.06),-0.08,side*0.06);w.rotation.z=1.1;w.rotation.y=side*0.5;g.add(w);whiskers.push(w);
    });
  }
  const hook=new THREE.Group();
  const hk=fishMesh(new THREE.TorusGeometry(0.055,0.012,8,14,Math.PI*1.35),'#F2C14E',{m:0.65,r:0.22,coat:0.8});
  hk.rotation.y=Math.PI/2;hk.rotation.z=0.6;hook.add(hk);
  hook.position.set(body.nose.x+0.02,-0.04,0);g.add(hook);
  g.userData={tail:tailP,pecL,pecR,whiskers};
  return {group:g,mouth:hook};
}
function makeOctopus(spec){
  const g=new THREE.Group();
  const mantle=fishMesh(new THREE.SphereGeometry(0.42,28,20),spec.body,{r:0.28,m:0.05,coat:0.65});
  mantle.scale.set(1,1.15,0.9);g.add(mantle);
  const belly=fishMesh(new THREE.SphereGeometry(0.28,16,12),spec.belly,{r:0.4,coat:0.2});
  belly.position.y=-0.12;belly.scale.set(0.9,0.7,0.75);g.add(belly);
  const eye=(x,z)=>{
    const e=new THREE.Group();
    e.add(fishMesh(new THREE.SphereGeometry(0.11,16,12),'#F7FBFF',{r:0.15,coat:0.5}));
    const iris=fishMesh(new THREE.SphereGeometry(0.062,12,8),spec.dark,{r:0.25});iris.position.z=0.06;e.add(iris);
    const pupil=fishMesh(new THREE.SphereGeometry(0.034,10,8),'#141414');pupil.position.set(0,-0.01,0.09);e.add(pupil);
    const glint=fishMesh(new THREE.SphereGeometry(0.018,6,6),'#FFFFFF',{e:'#FFFFFF',ei:0.9,coat:0});glint.position.set(0.03,0.03,0.1);e.add(glint);
    e.position.set(x,0.12,z);g.add(e);
  };
  eye(-0.16,0.28);eye(0.16,0.28);
  const tents=[];
  for(let i=0;i<8;i++){
    const ang=(i/8)*Math.PI*2,tent=new THREE.Group(),segs=[];
    for(let s=0;s<8;s++){
      const t=s/7,rad=0.1+t*0.62,y=-0.18-t*0.62;
      const seg=fishMesh(new THREE.SphereGeometry(0.085*(1-t*0.62),8,6),s%2?fishHex(spec.body,0.9):spec.body,{r:0.35,coat:0.4});
      seg.position.set(Math.cos(ang)*rad,y,Math.sin(ang)*rad*0.72);
      seg.scale.set(1,0.78,0.78);tent.add(seg);segs.push(seg);
      if(s>0&&s%2===0){
        const suck=fishMesh(new THREE.SphereGeometry(0.03,6,4),spec.belly,{r:0.3,coat:0});
        suck.position.copy(seg.position);suck.position.y-=0.045;tent.add(suck);
      }
    }
    tent.userData.segs=segs;tent.userData.base=segs.map(m=>m.position.clone());
    g.add(tent);tents.push(tent);
  }
  const hook=new THREE.Group();
  const hk=fishMesh(new THREE.TorusGeometry(0.05,0.011,8,12,Math.PI*1.3),'#F2C14E',{m:0.65,r:0.22,coat:0.8});
  hk.rotation.x=Math.PI/2;hook.add(hk);hook.position.set(0,-0.05,0.4);g.add(hook);
  g.userData={tents};g.scale.setScalar(0.92);
  return {group:g,mouth:hook};
}
function fishDepthY(){
  const d=UI.fight?UI.fight.depth:50;
  return 0.72-(Math.max(0,Math.min(100,d))/100)*1.44;
}
function fishViewEnsure(){
  if(fishGL||!window.THREE)return fishGL;
  const r=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  r.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  r.setClearColor(0x000000,0);
  r.outputEncoding=THREE.sRGBEncoding;
  r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=0.9;
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xD7F4FF,0x0C3A66,0.5));
  const sun=new THREE.DirectionalLight(0xFFF6E4,0.72);sun.position.set(-1.4,3.2,2.2);scene.add(sun);
  const fill=new THREE.DirectionalLight(0x7EB6E8,0.28);fill.position.set(2,-0.4,1.4);scene.add(fill);
  const camera=new THREE.PerspectiveCamera(30,1,0.1,30);
  camera.position.set(0.2,0.02,4.7);
  const rod=fishMesh(new THREE.CylinderGeometry(0.012,0.012,1,8),'#F7FBFF',{r:0.15,m:0.2,coat:0.8,e:'#EAF6FF',ei:0.15});
  scene.add(rod);
  const cv=r.domElement;cv.className='fish3d';cv.setAttribute('aria-hidden','true');cv.style.pointerEvents='none';
  document.body.appendChild(cv);
  fishGL={r,scene,camera,rod,fish:null,mouth:null,kind:'',on:false,raf:0,t:0,y:0,lean:0,kick:0,anchor:0,last:0,w:0,h:0};
  return fishGL;
}
function fishViewSpecies(id){
  const g=fishViewEnsure();if(!g)return;
  const look=FISH_LOOK[id]||FISH_LOOK.minnow;
  if(g.kind===id&&g.fish)return;
  if(g.fish){g.scene.remove(g.fish);fishDispose(g.fish);g.fish=null}
  const built=id==='octopus'?makeOctopus(look):makeFish(look);
  if(id!=='octopus')built.group.scale.setScalar(1.18);
  g.scene.add(built.group);g.fish=built.group;g.mouth=built.mouth;g.kind=id;
  g.anchor=-built.mouth.position.x*(built.group.scale.x||1);
  g.y=fishDepthY();built.group.position.set(g.anchor,g.y,0);
}
function fishViewPlace(){
  const g=fishGL,host=document.querySelector('.under');
  if(!g||!host)return false;
  const b=host.getBoundingClientRect();
  if(b.width<20||b.height<20)return false;
  const cv=g.r.domElement;
  cv.style.display='block';cv.style.position='fixed';cv.style.left=b.left+'px';cv.style.top=b.top+'px';
  cv.style.width=b.width+'px';cv.style.height=b.height+'px';cv.style.borderRadius='22px';cv.style.zIndex='6';
  if(g.w!==b.width||g.h!==b.height){g.w=b.width;g.h=b.height;g.r.setSize(b.width,b.height,false);g.camera.aspect=b.width/b.height;g.camera.updateProjectionMatrix()}
  host.classList.add('has3d');
  return true;
}
function fishAim(mesh,from,to){
  fishA.copy(to).sub(from);const len=fishA.length();if(len<0.001)return;
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(fishUp,fishB.copy(fishA).multiplyScalar(1/len));
  mesh.scale.set(1,len,1);
}
function fishViewFrame(now){
  const g=fishGL;if(!g||!g.on)return;
  g.raf=requestAnimationFrame(fishViewFrame);
  if((UI.phase!=='bite'&&UI.phase!=='land')||!UI.fight)return fishViewHide();
  if(!fishViewPlace()||!g.fish)return;
  const dt=Math.min(0.05,((now||performance.now())-(g.last||now))/1000)||0.016;g.last=now;g.t+=dt;
  const t=g.t,calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wag=calm?0.15:1;
  g.y+=(fishDepthY()-g.y)*Math.min(1,dt*4);
  g.lean=(g.lean||0)+(g.kick||0);g.kick=0;g.lean*=Math.pow(0.08,dt);
  const fish=g.fish,ud=fish.userData;
  fish.position.x=g.anchor+Math.sin(t*0.8)*0.03*wag;
  fish.position.y=g.y+Math.sin(t*1.6)*0.03*wag;
  fish.rotation.y=(g.kind==='octopus'?0.15:0.48)+Math.sin(t*0.9)*0.07*wag;
  fish.rotation.z=Math.sin(t*1.2)*0.05*wag+g.lean*0.22;
  if(ud.tail)ud.tail.rotation.y=Math.sin(t*7)*0.55*wag;
  if(ud.pecL){ud.pecL.rotation.z=Math.sin(t*5)*0.35*wag;ud.pecR.rotation.z=-Math.sin(t*5)*0.35*wag}
  if(ud.whiskers)ud.whiskers.forEach((w,i)=>{w.rotation.z=1.1+Math.sin(t*3+i)*0.15*wag});
  if(ud.tents)ud.tents.forEach((tent,i)=>tent.userData.segs.forEach((seg,s)=>{
    const base=tent.userData.base[s];
    seg.position.x=base.x+Math.sin(t*2.1+i+s*0.45)*0.035*s*wag;
    seg.position.z=base.z+Math.cos(t*1.7+i*0.8+s)*0.03*s*wag;
  }));
  g.mouth.updateWorldMatrix(true,false);
  const mouth=new THREE.Vector3();g.mouth.getWorldPosition(mouth);
  fishAim(g.rod,new THREE.Vector3(0,1.28,0),mouth);
  g.camera.lookAt(0,g.y*0.15,0);
  g.r.render(g.scene,g.camera);
}
function fishViewMount(){
  if(!UI.fight)return;
  try{
    const g=fishViewEnsure();if(!g)return;
    fishViewSpecies(UI.fight.fish.id);
    g.on=true;g.last=performance.now();
    if(!g.raf)g.raf=requestAnimationFrame(fishViewFrame);
    fishViewPlace();
  }catch(e){console.warn('fish 3d off',e);fishViewHide()}
}
function fishViewHide(){
  if(!fishGL)return;
  fishGL.on=false;
  if(fishGL.raf)cancelAnimationFrame(fishGL.raf);
  fishGL.raf=0;
  fishGL.r.domElement.style.display='none';
  const host=document.querySelector('.under');if(host)host.classList.remove('has3d');
}
function fishViewKick(dir){if(fishGL)fishGL.kick=(fishGL.kick||0)+dir}
