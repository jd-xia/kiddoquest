/* Happy Learning Farm — art: children's own pictures for their character and every icon.
   Pictures stay on this device (IndexedDB 'hmf-art'), one set per player; they are never uploaded.
   Loaded by every page right after core.js. HTML draws icons with ico(key, emoji);
   3D pages use iconSprite()/iconTex() in engine3d.js. See REQUIREMENTS.md §6.6. */
const ART_DB='hmf-art',ART_STORE='art';
let ART={};   // ART[playerId][key] = {id, pid, key, url, src, style, bg, t, img}
const npcKey=n=>'npc:'+n.name;

/* Every picture a child can redraw, grouped for the Art Studio. key -> default emoji + name. */
function artCatalog(){
  const npcs=[MAYOR,MERCHANT,ELLIE,FARMER,ARTIST,...SCHOOLS.map(d=>d.npc),...DUNGEONS.map(d=>d.npc)].filter((n,i,a)=>a.findIndex(m=>m.name===n.name)===i);
  return [
    {id:'me',name:`${lookOf(cur()).e} Me`,items:[{key:'me',e:lookOf(cur()).e,name:'My own drawing'}]},
    {id:'seeds',name:'🥕 Crops',items:SEEDS.map(s=>({key:'seed:'+s.id,e:s.e,name:s.name}))},
    {id:'animals',name:'🐔 Animals',items:ANIMALS.map(a=>({key:'animal:'+a.id,e:a.e,name:a.name}))},
    {id:'goods',name:'🥚 Farm goods',items:ANIMALS.map(a=>({key:'prod:'+a.prod,e:a.pe,name:a.pn}))},
    {id:'decor',name:'🌷 Decorations',items:DECOR.map(d=>({key:'decor:'+d.id,e:d.e,name:d.name}))},
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
/* Called by startPage() before the first render, so ico() and 3D textures are ready. */
function wipeArtNow(){ART={};return artTx('readwrite',s=>s.clear()).catch(()=>{})}
function loadArt(){
  let wipe=false;
  try{wipe=localStorage.getItem('hmf-reset-art')==='1';if(wipe)localStorage.removeItem('hmf-reset-art')}catch(e){}
  const read=wipe?wipeArtNow().then(()=>[]):artTx('readonly',s=>s.getAll());
  return read.then(rows=>{
    ART={};
    return Promise.all((rows||[]).map(r=>{(ART[r.pid]||(ART[r.pid]={}))[r.key]=r;return artImg(r)}));
  }).catch(()=>{});
}
function saveArt(pid,key,o){
  const rec={id:pid+'|'+key,pid,key,url:o.url,src:o.src,style:o.style,bg:o.bg,t:Date.now()};
  return artTx('readwrite',s=>s.put(rec)).then(()=>{(ART[pid]||(ART[pid]={}))[key]=rec;return artImg(rec)});
}
function deleteArt(pid,key){
  return artTx('readwrite',s=>s.delete(pid+'|'+key)).then(()=>{if(ART[pid])delete ART[pid][key]});
}
function dropPlayerArt(pid){
  const keys=Object.keys(ART[pid]||{});delete ART[pid];
  if(keys.length)artTx('readwrite',s=>{keys.forEach(k=>s.delete(pid+'|'+k))}).catch(()=>{});
}
