/* Happy Learning Farm — art: children's own pictures for their character and every icon.
   Pictures stay on this device (IndexedDB 'hmf-art'), one set per player; they are never uploaded.
   Loaded by every page right after core.js. HTML draws icons with ico(key, emoji);
   3D pages use iconSprite()/iconTex() in engine3d.js. See REQUIREMENTS.md §6.6. */
const ART_DB='hmf-art',ART_STORE='art';
let ART={};   // ART[playerId][key] = {id, pid, key, url, src, style, bg, t, img, model?, obj?, clips?}
const npcKey=n=>'npc:'+n.name;
/* Farm buildings a child can replace with their own 3D model. 'school' covers every school house. */
const BUILDINGS=[['school','🏫','School houses'],['barn','🏚️','Barn'],['market','🏪','Farm Market'],['studio','🎨','Art Studio'],['board','📋','Progress Board'],['pond','🎣','Fishing pond']];
/* Only things that stand on the farm or swim in the pond can be a 3D model; the rest stay pictures. */
const MODEL_KINDS=['animal','decor','building','fish'];
const canModel=key=>MODEL_KINDS.includes(String(key).split(':')[0]);
const MODEL_MAX=20*1024*1024;

/* Every picture a child can redraw, grouped for the Art Studio. key -> default emoji + name. */
function artCatalog(){
  const npcs=[MAYOR,MERCHANT,ELLIE,FARMER,ARTIST,...SCHOOLS.map(d=>d.npc),...DUNGEONS.map(d=>d.npc)].filter((n,i,a)=>a.findIndex(m=>m.name===n.name)===i);
  return [
    {id:'me',name:`${lookOf(cur()).e} Me`,items:[{key:'me',e:lookOf(cur()).e,name:'My own drawing'}]},
    {id:'seeds',name:'🥕 Crops',items:SEEDS.map(s=>({key:'seed:'+s.id,e:s.e,name:s.name}))},
    {id:'animals',name:'🐔 Animals',items:ANIMALS.map(a=>({key:'animal:'+a.id,e:a.e,name:a.name}))},
    {id:'goods',name:'🥚 Farm goods',items:ANIMALS.map(a=>({key:'prod:'+a.prod,e:a.pe,name:a.pn}))},
    {id:'decor',name:'🌷 Decorations',items:DECOR.map(d=>({key:'decor:'+d.id,e:d.e,name:d.name}))},
    {id:'buildings',name:'🏠 Buildings',items:BUILDINGS.map(([id,e,name])=>({key:'building:'+id,e,name}))},
    {id:'fish',name:'🐟 Fish',items:FISH_CATCH.map(f=>({key:'fish:'+f.id,e:f.e,name:f.name}))},
    {id:'hats',name:'👒 Hats',items:HATS.filter(h=>h[0]!=='none').map(h=>({key:'hat:'+h[0],e:h[2],name:h[1]}))},
    {id:'friends',name:'🦉 Friends',items:npcs.map(n=>({key:npcKey(n),e:n.e,name:n.name}))}
  ];
}
function artName(key){for(const g of artCatalog())for(const it of g.items)if(it.key===key)return it.name;return ''}
function artOf(key,p){p=p||cur();const a=p&&ART[p.id];return a&&a[key]||null}
function ico(key,e,p){const a=artOf(key,p);return a?`<img class="ico" src="${a.url}" alt="">`:e}
const artCount=p=>Object.keys(ART[p.id]||{}).filter(k=>k!=='face'&&k!=='portrait').length;   // the 3D maker's photo face and portrait are not drawings

/* ---------- storage ---------- */
let ARTDB=null;
function artDb(){
  if(ARTDB)return ARTDB;
  return ARTDB=new Promise((res,rej)=>{
    if(!window.indexedDB)return rej(new Error('no indexedDB'));
    const r=indexedDB.open(ART_DB,1);
    r.onupgradeneeded=()=>r.result.createObjectStore(ART_STORE,{keyPath:'id'});
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
  });
}
function artTx(mode,fn){return artDb().then(db=>new Promise((res,rej)=>{
  const t=db.transaction(ART_STORE,mode),req=fn(t.objectStore(ART_STORE));
  t.oncomplete=()=>res(req&&req.result);t.onerror=t.onabort=()=>rej(t.error);
}))}
function artImg(r){return new Promise(res=>{const i=new Image();i.onload=i.onerror=()=>res(r);i.src=r.url;r.img=i})}
/* A 3D model (.glb, or a .gltf with everything inside it) a child uploaded. Pages with three.js and
   GLTFLoader read it once into r.obj; modelOf() hands out copies. Pages without 3D show r.url, a snapshot. */
function parseModel(data){return new Promise((res,rej)=>{
  if(!window.THREE||!THREE.GLTFLoader)return rej(new Error('no 3D'));
  try{new THREE.GLTFLoader().parse(data,'',g=>res(g),e=>rej(e||new Error('bad model')))}catch(e){rej(e)}})}
function artModel(r){
  if(!r.model||!window.THREE||!THREE.GLTFLoader)return Promise.resolve(r);
  return parseModel(r.model).then(g=>{r.obj=g.scene;r.clips=g.animations||[];
    r.obj.traverse(m=>{if(m.geometry)m.geometry.userData.keep=true});   // copies share it: clearGroup() must not dispose it
    return r}).catch(()=>r);
}
function modelOf(key,p){const a=artOf(key,p);if(!a||!a.obj)return null;
  const o=THREE.SkeletonUtils?THREE.SkeletonUtils.clone(a.obj):a.obj.clone(true);o.userData.clips=a.clips||[];return o}
/* Scales a model to fit a box {w,h,d} (any of them), centred on x/z and standing on y=0.
   Models come in every size and unit, so only the fit decides how big they are. */
function fitModel(obj,box){
  const g=new THREE.Group(),m=new THREE.Group();g.add(m);m.add(obj);m.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(m),s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
  let k=Infinity;if(box.w&&s.x)k=Math.min(k,box.w/s.x);if(box.h&&s.y)k=Math.min(k,box.h/s.y);if(box.d&&s.z)k=Math.min(k,box.d/s.z);
  if(!isFinite(k)||k<=0)k=1;
  m.scale.setScalar(k);m.position.set(-c.x*k,-b.min.y*k,-c.z*k);
  obj.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return g}
/* Plays a model's own animations, if it has any. play(/walk/i) picks a clip by name, else the first one. */
function modelAnim(obj){
  const clips=obj.userData.clips||[];if(!clips.length)return null;
  const mx=new THREE.AnimationMixer(obj);let cur=null;
  return{mx,play(re){const c=(re&&clips.find(x=>re.test(x.name)))||clips[0];if(c===cur)return;
    const a=mx.clipAction(c);a.reset().fadeIn(.25).play();if(cur)mx.clipAction(cur).fadeOut(.25);cur=c}};
}
/* Called by startPage() before the first render, so ico() and 3D textures are ready. */
function wipeArtNow(){ART={};return artTx('readwrite',s=>s.clear()).catch(()=>{})}
function loadArt(){
  let wipe=false;
  try{wipe=localStorage.getItem('hmf-reset-art')==='1';if(wipe)localStorage.removeItem('hmf-reset-art')}catch(e){}
  const read=wipe?wipeArtNow().then(()=>[]):artTx('readonly',s=>s.getAll());
  return read.then(rows=>{
    ART={};
    return Promise.all((rows||[]).map(r=>{(ART[r.pid]||(ART[r.pid]={}))[r.key]=r;return artImg(r).then(artModel)}));
  }).catch(()=>{});
}
function saveArt(pid,key,o){
  const rec={id:pid+'|'+key,pid,key,url:o.url,src:o.src,style:o.style,bg:o.bg,t:Date.now()};
  if(o.model){rec.model=o.model;rec.mname=o.mname||''}
  return artTx('readwrite',s=>s.put(rec)).then(()=>{(ART[pid]||(ART[pid]={}))[key]=rec;return artImg(rec).then(artModel)});
}
function deleteArt(pid,key){
  return artTx('readwrite',s=>s.delete(pid+'|'+key)).then(()=>{if(ART[pid])delete ART[pid][key]});
}
function dropPlayerArt(pid){
  const keys=Object.keys(ART[pid]||{});delete ART[pid];
  if(keys.length)artTx('readwrite',s=>{keys.forEach(k=>s.delete(pid+'|'+k))}).catch(()=>{});
}
