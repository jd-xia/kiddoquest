/* Happy Math Farm — core: save data, players, router, dialog, shared farm data.
   Loaded by every page, after curriculum.js. No 3D code here. */
const MAYOR={name:'Bella the Bear',e:'🐻'}, MERCHANT={name:'Mo the Merchant',e:'🦝'};
const ELLIE={name:'Ellie the Elephant',e:'🐘'}, FARMER={name:'Farmer Gus',e:'🐴'}, ARTIST={name:'Polly the Parrot',e:'🦜'};
const AVATARS=[['chick','🐣','Chick',0],['cat','🐱','Cat',15],['dog','🐶','Puppy',15],['fox','🦊','Fox',25],['panda','🐼','Panda',25],['frog','🐸','Frog',30],['tiger','🐯','Tiger',40],['koala','🐨','Koala',40],['unicorn','🦄','Unicorn',60],['dragon','🐲','Dragon',80],['robot','🤖','Robot',100],['alien','👾','Space Bug',120]];
const avE=p=>ico('me','🧑‍🌾',p);   // the player's own character picture, or the farmer emoji
const PRAISE=['Hoo-ray! Spot on.','Brilliant trick work!','Exactly right!','You\'re getting sharp!','Super hunter move!','Nailed it!'];

/* ---------- data & saving ---------- */
const LS='mathstreet-v1';
function newPlayer(name,grade){return{id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,grade:grade||DEFAULT_GRADE,avatar:'chick',owned:['chick'],gems:0,seen:{},lv:{},sessions:[],time:0}}
function blank(){const a=newPlayer('Jayden'),b=newPlayer('Michelle');return{v:1,updated:0,current:null,players:[a,b]}}
let DATA=(()=>{try{const s=localStorage.getItem(LS);if(s){const d=JSON.parse(s);if(d&&d.players)return d}}catch(e){}return blank()})();
let DBREF=null,dbSaving=false,dbPending=false,dbTimer=null,SYNC='device';
function save(){
  DATA.updated=Date.now();
  try{localStorage.setItem(LS,JSON.stringify(DATA))}catch(e){}
  clearTimeout(dbTimer);dbTimer=setTimeout(pushDb,700);
}
function pushDb(){
  if(!DBREF)return;
  if(dbSaving){dbPending=true;return}
  dbSaving=true;
  DBREF.set(JSON.parse(JSON.stringify(DATA))).then(()=>{SYNC='cloud'}).catch(()=>{}).finally(()=>{dbSaving=false;if(dbPending){dbPending=false;pushDb()}});
}
async function initDb(){
  try{
    if(!window.claude||!window.claude.use)return;
    const db=await window.claude.use('db');if(!db)return;
    const user=await window.claude.use('user');if(!user)return;
    const uid=await user.id();if(!uid)return;
    const ref=db.doc('data/users/'+uid+'/mathstreet');
    const snap=await ref.get();
    DBREF=ref;SYNC='cloud';
    if(snap.exists){
      const d=snap.data();
      if(d&&d.players&&(d.updated||0)>(DATA.updated||0)){
        DATA=JSON.parse(JSON.stringify(d));
        try{localStorage.setItem(LS,JSON.stringify(DATA))}catch(e){}
        if(!['level','result'].includes(UI.screen)&&!DLG)render();
      }else if((DATA.updated||0)>((d&&d.updated)||0))pushDb();
    }else if(DATA.updated)pushDb();
  }catch(e){}
}
const cur=()=>DATA.players.find(p=>p.id===DATA.current);
const dun=(id,p)=>{const D=DUNGEONS.find(d=>d.id===id);return D&&schoolFor(D,gradeOf(p||cur()))};   // school as the (current) player's grade sees it
const totalStars=p=>Object.values(p.lv).reduce((a,r)=>a+(r.stars||0),0);
const unlocked=(p,D,i)=>i===0||((p.lv[D.levels[i-1].id]||{}).stars>0);

/* ---------- ui state ---------- */
let UI={screen:'players'};
let DLG=null, PAD=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* ---------- multi-page router ----------
   Each screen lives on one page. go() renders locally when this page owns the screen,
   otherwise it hands the screen + extras to the next page through sessionStorage. */
const PAGE_FILE=document.body.dataset.page||'index.html';
const PAGES={players:'index.html',town:'index.html',market:'market.html',shop:'market.html',barn:'barn.html',progress:'board.html',studio:'studio.html'};
function pageFor(screen,extra){if(['dungeon','level','result'].includes(screen))return 'school-'+((extra&&extra.did)||UI.did||'tricks')+'.html';return PAGES[screen]||'index.html'}
let SCREENS={};
function go(screen,extra){
  const file=pageFor(screen,extra);
  if(SCREENS[screen]&&file===PAGE_FILE){UI=Object.assign({screen},extra||{});PAD=null;render();window.scrollTo({top:0});return}
  navTo(file,{screen,extra:extra||{}});
}
function navTo(file,nav){
  if(typeof unmountStage==='function')unmountStage();
  try{sessionStorage.setItem('hmf-nav',JSON.stringify(nav));
    if(LASTPOS)sessionStorage.setItem('hmf-lastpos',JSON.stringify(LASTPOS));else sessionStorage.removeItem('hmf-lastpos')}catch(e){}
  location.href=file;
}
function render(){if(UI.screen!=='players'&&!cur()){if(SCREENS.players)UI={screen:'players'};else{navTo('index.html',{screen:'players'});return}}if(!['town','dungeon','level','result'].includes(UI.screen)&&typeof unmountStage==='function')unmountStage();document.body.classList.toggle('inbattle',UI.screen==='level'||UI.screen==='result');document.body.classList.toggle('fullworld',UI.screen==='town'||UI.screen==='dungeon');const fn=SCREENS[UI.screen];if(fn)fn();else go(UI.screen,UI)}

function topBar(title,backAct){
  const p=cur();
  return `<div class="top">${backAct?`<button class="back" data-act="${backAct}" aria-label="Back">←</button>`:''}
  <div class="title">${title}</div>
  <span class="stat" aria-label="Stars">⭐ ${totalStars(p)}</span><span class="stat" id="coins" aria-label="Coins">🪙 ${p.gems}</span>
  <button class="pill" data-act="toPlayers" aria-label="Switch player"><span class="av">${avE(p)}</span>${esc(p.name)}</button></div>`;
}
function npcHTML(npc,html,kind){return `<div class="npc"><div class="face" aria-hidden="true">${ico(npcKey(npc),npc.e)}</div><div class="bubble ${kind||''}"><div class="who">${npc.name}</div>${html}</div></div>`}

/* ---------- dialog ---------- */
function dialog(npc,lines,done){DLG={npc,lines,i:0,done};drawDlg()}
function drawDlg(){
  const el=$('#dlg');
  if(!DLG){el.className='';el.innerHTML='';return}
  const last=DLG.i===DLG.lines.length-1;
  el.className='show';
  el.innerHTML=`<div class="dlg"><div class="face" aria-hidden="true">${ico(npcKey(DLG.npc),DLG.npc.e)}</div><div style="flex:1">
   <div class="dlg-name">${DLG.npc.name}</div><div class="dlg-text">${DLG.lines[DLG.i]}</div>
   <div class="dlg-btns"><span class="dlg-count">${DLG.i+1} / ${DLG.lines.length}</span>
   ${last?'':'<button class="b ghost sm" data-act="dlgSkip">Skip</button>'}
   <button class="b sm" data-act="dlgNext" id="dlgNext">${last?'Let\'s go!':'Next'}</button></div></div></div>`;
  $('#dlgNext').focus({preventScroll:true});
}
function dlgEnd(){const d=DLG;DLG=null;drawDlg();d&&d.done&&d.done()}

/* ---------- shared farm data (market, barn, plaza all read these) ---------- */
const SEEDS=[
  {id:'carrot',name:'Carrot',e:'🥕',cost:2,mins:2,xp:3,lv:1},
  {id:'tomato',name:'Tomato',e:'🍅',cost:4,mins:4,xp:5,lv:1},
  {id:'sunflower',name:'Sunflower',e:'🌻',cost:5,mins:5,xp:6,lv:2},
  {id:'strawberry',name:'Strawberry',e:'🍓',cost:6,mins:6,xp:8,lv:3},
  {id:'corn',name:'Corn',e:'🌽',cost:8,mins:8,xp:10,lv:4},
  {id:'pumpkin',name:'Pumpkin',e:'🎃',cost:12,mins:15,xp:16,lv:5}];
const ANIMALS=[
  {id:'chicken',name:'Chicken',e:'🐔',cost:20,lv:2,prod:'egg',pn:'Eggs',pe:'🥚',mins:3,xp:4},
  {id:'sheep',name:'Sheep',e:'🐑',cost:35,lv:3,prod:'wool',pn:'Wool',pe:'🧶',mins:6,xp:8},
  {id:'cow',name:'Cow',e:'🐄',cost:50,lv:4,prod:'milk',pn:'Milk',pe:'🥛',mins:8,xp:12}];
const DECOR=[
  {id:'flowers',name:'Flower beds',e:'🌷',cost:8},{id:'lanterns',name:'Path lanterns',e:'🏮',cost:10},
  {id:'scarecrow',name:'Scarecrow',e:'🎃',cost:12},{id:'apples',name:'Apple trees',e:'🍎',cost:18},
  {id:'pond',name:'Duck pond',e:'🦆',cost:25},{id:'windmill',name:'Windmill',e:'🌬️',cost:40}];
const SHIRTS=[['red','Red','#E5484D',0],['blue','Blue','#3E7BFA',6],['green','Green','#2FA36B',6],['yellow','Yellow','#F2B705',6],['purple','Purple','#8B5CF6',8],['pink','Pink','#EC6FA9',8]];
const HATS=[['straw','Straw hat','👒',0],['cap','Cap','🧢',10],['flowers','Flower crown','💐',15],['crown','Gold crown','👑',40]];
let F=null,MAP=null,BAT=null,LASTPOS=null;const KEYS=new Set();
function farmOf(p){if(!p.farm)p.farm={plots:[],unlocked:6,animals:[],decor:[],shirt:'red',hat:'straw',owned:['shirt:red','hat:straw'],xp:0,barn:{}};return p.farm}
function farmLevel(xp){let l=1,need=20;while(xp>=need){xp-=need;l++;need=20*l}return{l,into:xp,need}}
function plotInfo(pl){if(!pl)return null;const S=SEEDS.find(s=>s.id===pl.crop);const dur=S.mins*60000*(pl.watered?.7:1),el=Date.now()-pl.planted,prog=Math.min(1,el/dur);return{S,prog,left:Math.max(0,dur-el),stage:prog>=1?3:prog>=.5?2:prog>=.15?1:0}}
const fmtLeft=ms=>{const s=Math.ceil(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const plotCost=f=>12+4*(f.unlocked-6);
const plotPos=i=>({x:-3.9+(i%4)*2.6,z:-3.6+Math.floor(i/4)*2.6});
let toastTimer=null;
function toast(t){const el=$('#toast');if(!el)return;el.textContent=t;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400)}

/* ---------- actions shared by every page; pages add their own with Object.assign(ACT,{...}) ---------- */
const ACT={
  toPlayers:()=>go('players'),
  toTown:()=>go('town'),
  openDungeon:d=>go('dungeon',{did:d.id}),
  openProgress:()=>go('progress'),
  quick:d=>{const s={tricks:['dungeon',{did:'tricks'}],market:['market'],board:['progress'],barn:['barn'],studio:['studio']}[d.id];if(s)go(s[0],s[1])},
  camL:()=>{if(typeof G!=='undefined')G.stage&&G.stage.rotate&&G.stage.rotate(1)},camR:()=>{if(typeof G!=='undefined')G.stage&&G.stage.rotate&&G.stage.rotate(-1)},
  zoomIn:()=>{if(typeof G!=='undefined')G.stage&&G.stage.zoom&&G.stage.zoom(-1)},zoomOut:()=>{if(typeof G!=='undefined')G.stage&&G.stage.zoom&&G.stage.zoom(1)},
  dlgNext:()=>{if(!DLG)return;if(DLG.i<DLG.lines.length-1){DLG.i++;drawDlg()}else dlgEnd()},
  dlgSkip:()=>dlgEnd()
};
let onPageKey=null;
document.addEventListener('click',e=>{
  const pk=e.target.closest('#pad button');if(pk&&typeof padKey==='function'){padKey(pk.dataset.k);return}
  const a=e.target.closest('[data-act]');if(!a||a.disabled||a.getAttribute('aria-disabled')==='true')return;
  const f=ACT[a.dataset.act];if(f)f(a.dataset);
});
document.addEventListener('keydown',e=>{
  if(DLG){if(e.key==='Enter'||e.key===' '){e.preventDefault();ACT.dlgNext()}else if(e.key==='Escape')dlgEnd();return}
  if(e.target.tagName==='INPUT'){if(e.key==='Enter'){if(e.target.id==='newname'&&ACT.addPlayer)ACT.addPlayer();if(e.target.id==='rename'){const b=$('[data-act="renameSave"]');if(b)b.click()}}return}
  if(onPageKey)onPageKey(e);
});
document.addEventListener('keyup',e=>{KEYS.delete(e.key.length===1?e.key.toLowerCase():e.key)});
window.addEventListener('blur',()=>KEYS.clear());

/* startPage(screens, defaultUI): every page calls this once at the bottom of its script. */
function startPage(screens,def){
  SCREENS=screens;let nav=null;
  try{nav=JSON.parse(sessionStorage.getItem('hmf-nav')||'null');sessionStorage.removeItem('hmf-nav');LASTPOS=JSON.parse(sessionStorage.getItem('hmf-lastpos')||'null')}catch(e){}
  UI=nav&&screens[nav.screen]?Object.assign({screen:nav.screen},nav.extra||{}):def();
  $('#app').innerHTML='<div class="boot"><span class="coin">🌾</span><p>Loading Happy Math Farm…</p></div>';
  Promise.all([Promise.race([document.fonts?document.fonts.load('600 48px Fredoka'):Promise.resolve(),new Promise(r=>setTimeout(r,1800))]).catch(()=>{}),loadArt()]).then(()=>{render();setTimeout(initDb,0)});
}
