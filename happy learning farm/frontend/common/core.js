/* Happy Learning Farm — core: save data, players, router, dialog, shared farm data.
   Loaded by every page, after curriculum.js. No 3D code here. */
const MAYOR={name:'Bella the Bear',e:'🐻'}, MERCHANT={name:'Mo the Merchant',e:'🦝'};
const ELLIE={name:'Ellie the Elephant',e:'🐘'}, FARMER={name:'Farmer Gus',e:'🐴'}, ARTIST={name:'Polly the Parrot',e:'🦜'};
const AVATARS=[['chick','🐣','Chick',0],['cat','🐱','Cat',15],['dog','🐶','Puppy',15],['fox','🦊','Fox',25],['panda','🐼','Panda',25],['frog','🐸','Frog',30],['tiger','🐯','Tiger',40],['koala','🐨','Koala',40],['unicorn','🦄','Unicorn',60],['dragon','🐲','Dragon',80],['robot','🤖','Robot',100],['alien','👾','Space Bug',120]];
/* Characters a child can pick (Art Studio → Me). 'girl'/'boy' are full 3D farmers; the rest walk around
   as a stand-up cut-out of the emoji. A child's own drawing of 'me' always wins over the pick. */
const LOOKS=[
  {id:'girl',e:'👧',name:'Farm girl',hero:'girl'},{id:'boy',e:'👦',name:'Farm boy',hero:'boy'},
  {id:'farmgirl',e:'👩‍🌾',name:'Farmer girl',hero:'girl'},{id:'farmboy',e:'👨‍🌾',name:'Farmer boy',hero:'boy'},
  {id:'princess',e:'👸',name:'Princess'},{id:'prince',e:'🤴',name:'Prince'},{id:'fairy',e:'🧚‍♀️',name:'Fairy'},
  {id:'mermaid',e:'🧜‍♀️',name:'Mermaid'},{id:'herogirl',e:'🦸‍♀️',name:'Super girl'},{id:'heroboy',e:'🦸‍♂️',name:'Super boy'},
  {id:'witch',e:'🧙‍♀️',name:'Little witch'},{id:'astronaut',e:'🧑‍🚀',name:'Astronaut'},{id:'ninja',e:'🥷',name:'Ninja'},
  {id:'cat',e:'🐱',name:'Kitty'},{id:'bunny',e:'🐰',name:'Bunny'},{id:'dog',e:'🐶',name:'Puppy'},{id:'fox',e:'🦊',name:'Fox'},
  {id:'panda',e:'🐼',name:'Panda'},{id:'koala',e:'🐨',name:'Koala'},{id:'tiger',e:'🐯',name:'Tiger'},{id:'frog',e:'🐸',name:'Frog'},
  {id:'chick',e:'🐥',name:'Chick'},{id:'unicorn',e:'🦄',name:'Unicorn'},{id:'dragon',e:'🐲',name:'Dragon'},
  {id:'me3d',e:'🧍',name:'My 3D me',hero:'custom'}];   // the child's own design from the Character Maker
const lookOf=p=>{const L=LOOKS.find(l=>l.id===(p&&p.look));return L&&!(L.hero==='custom'&&!p.avatar3d)?L:LOOKS[1]};
/* Profile picture: the child's own drawing, else the 3D portrait of their own design, else the character emoji. */
const avE=p=>!artOf('me',p)&&lookOf(p).hero==='custom'&&artOf('portrait',p)?ico('portrait','🧍',p):ico('me',lookOf(p).e,p);
const PRAISE=['Hoo-ray! Spot on.','Brilliant trick work!','Exactly right!','You\'re getting sharp!','Super hunter move!','Nailed it!'];

/* ---------- data & saving ---------- */
const LS='mathstreet-v1';
function newPlayer(name,grade,look){return{id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,grade:grade||DEFAULT_GRADE,look:look||'boy',avatar:'chick',owned:['chick'],gems:0,seen:{},lv:{},sessions:[],time:0}}
function blank(){const a=newPlayer('Jayden','p1','boy'),b=newPlayer('Michelle',null,'girl');return{v:2,updated:0,current:null,players:[a,b]}}
let DATA=(()=>{try{const s=localStorage.getItem(LS);if(s){const d=JSON.parse(s);if(d&&d.players)return d}}catch(e){}return blank()})();
/* Save migration v1 → v2 (runs once): Michelle is a girl, Jayden is a boy in P1. Later changes made on the
   progress board or in the Art Studio are kept, because this only runs for older saves. */
if((DATA.v||1)<2){DATA.players.forEach(p=>{const n=p.name.trim().toLowerCase();
  if(!p.look)p.look=n==='michelle'?'girl':'boy';if(n==='jayden'){p.look='boy';p.grade='p1'}});DATA.v=2;try{localStorage.setItem(LS,JSON.stringify(DATA))}catch(e){}}
DATA.players.forEach(p=>{if(!p.look)p.look='boy'});
/* Local-first: save() only writes this browser. Account sync runs from the Sync button in cloud.js. */
function save(){
  DATA.updated=Date.now();
  try{localStorage.setItem(LS,JSON.stringify(DATA))}catch(e){}
  if(typeof cloudRememberActive==='function')cloudRememberActive();
}
const cur=()=>DATA.players.find(p=>p.id===DATA.current);
const dun=(id,p)=>{const D=DUNGEONS.find(d=>d.id===id);return D&&schoolFor(D,gradeOf(p||cur()))};   // topic as the (current) player's grade sees it
/* A school building as the (current) player sees it: open when at least one of its topics has levels for their grade. */
const schoolView=(id,p)=>{const S=schoolById(id);if(!S)return null;const topics=S.topics.map(t=>dun(t,p));return Object.assign({},S,{topics,open:S.open&&topics.some(t=>t.open)})};
const totalStars=p=>Object.values(p.lv).reduce((a,r)=>a+(r.stars||0),0);
const unlocked=(p,D,i)=>!D.levels[i].soon&&(i===0||((p.lv[D.levels[i-1].id]||{}).stars>0));   // 'soon' levels are placeholders
const playable=D=>D.levels.filter(l=>!l.soon);

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
function pageFor(screen,extra){   // school screens live on school-<school id>.html; a topic (did) belongs to one school
  if(['school','dungeon','level','result'].includes(screen)){const e=extra||{},T=DUNGEONS.find(d=>d.id===(e.did||UI.did));return 'school-'+(e.sid||(T&&T.school)||UI.sid||'tricks')+'.html'}
  return PAGES[screen]||'index.html'}
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
function render(){if(UI.screen!=='players'&&!cur()){if(SCREENS.players)UI={screen:'players'};else{navTo('index.html',{screen:'players'});return}}if(!['town','school','dungeon','level','result'].includes(UI.screen)&&typeof unmountStage==='function')unmountStage();document.body.classList.toggle('inbattle',UI.screen==='level'||UI.screen==='result');document.body.classList.toggle('fullworld',['town','school','dungeon'].includes(UI.screen));const fn=SCREENS[UI.screen];if(fn)fn();else go(UI.screen,UI)}

function topBar(title,backAct){
  const p=cur();
  return `<div class="top">${backAct?`<button class="back" data-act="${backAct}" aria-label="Back">←</button>`:''}
  <div class="title">${title}</div>
  <span class="stat" aria-label="Stars">⭐ ${totalStars(p)}</span><span class="stat" id="coins" aria-label="Coins">🪙 ${p.gems}</span>
  ${PAGE_FILE==='studio.html'?'':'<button class="pill artpill" data-act="toStudio" aria-label="Art Studio: draw your own pictures" title="Art Studio">🎨</button>'}
  ${typeof cloudTopActions==='function'?cloudTopActions():''}
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
const HATS=[['none','No hat','🚫',0],['straw','Straw hat','👒',0],['cap','Cap','🧢',10],['flowers','Flower crown','💐',15],['crown','Gold crown','👑',40]];
/* ---------- the daily 10 minutes: coins, Today's Tasks, the chest and the streak (REQUIREMENTS.md §8.3) ----------
   Coins come only from learning: +2 per answer right first try, +5 the first time each level is finished
   today, +10 from the chest once every task is done. A day pays at most COIN_DAY_MAX; after that play
   still earns stars. Everything for today lives in Player.daily and resets at midnight. */
const COIN_RIGHT=2,COIN_LEVEL=5,COIN_CHEST=10,COIN_DAY_MAX=40,TASK_XP=10;
const today=(d)=>(d||new Date()).toLocaleDateString('en-CA');
function dailyOf(p){if(!p.daily||p.daily.d!==today())p.daily={d:today(),n:{},coins:0,levels:{},chest:false};
  const D=p.daily;D.n=D.n||{};D.coins=D.coins||0;D.levels=D.levels||{};return D}
const coinsLeft=p=>Math.max(0,COIN_DAY_MAX-dailyOf(p).coins);
function earnCoins(p,n){const g=Math.min(n,coinsLeft(p));p.gems+=g;dailyOf(p).coins+=g;return g}   // -> coins actually given
/* Today's Tasks follow the routine: plant first, play the two practice levels while crops grow, then harvest. */
function tasksFor(p){const lv=(DAILY_LEVELS[gradeOf(p)]||[]).map(id=>levelById(id)).filter(Boolean);
  return [{id:'plant',e:'🌱',name:'Plant seeds',goal:3},
    ...lv.map((l,k)=>({id:'lv:'+l.id,e:['🤝','🎩'][k]||'🧠',name:`Finish ${l.name}`,goal:1})),
    {id:'harvest',e:'🧺',name:'Harvest crops',goal:3}]}
const allTasksDone=p=>{const D=dailyOf(p);return tasksFor(p).every(t=>(D.n[t.id]||0)>=t.goal)};
/* Count one step of a task; returns the task when this step finished it (the caller gives the XP and saves). */
function taskStep(id,n){const p=cur();if(!p)return null;const D=dailyOf(p),T=tasksFor(p).find(t=>t.id===id),had=D.n[id]||0;
  if(!T||had>=T.goal)return null;D.n[id]=Math.min(T.goal,had+(n||1));return D.n[id]>=T.goal?T:null}
/* Streak: days in a row with every task done (counted when the chest is opened). */
function bumpStreak(p){const s=p.streak||(p.streak={last:'',days:0,best:0}),t=today();if(s.last===t)return s;
  const y=new Date();y.setDate(y.getDate()-1);s.days=s.last===today(y)?s.days+1:1;s.last=t;s.best=Math.max(s.best,s.days);return s}
const streakDays=p=>{const s=p.streak;if(!s)return 0;const y=new Date();y.setDate(y.getDate()-1);return s.last===today()||s.last===today(y)?s.days:0};
/* Streak gifts: day 3 a flower crown, every 7th day a big farm prize. Gifts never are coins. */
function streakGift(p,days){const f=farmOf(p);
  const give=key=>{const [kind,id]=key.split(':');if(kind==='decor'){if(f.decor.includes(id))return null;f.decor.push(id);return DECOR.find(d=>d.id===id)}
    if(f.owned.includes(key))return null;f.owned.push(key);const h=HATS.find(h=>h[0]===id);return h&&{name:h[1],e:h[2]}};
  let g=null;
  if(days===3)g=give('hat:flowers');
  else if(days%7===0)for(const k of['decor:windmill','hat:crown','decor:pond','decor:apples']){g=give(k);if(g)break}
  if(g)return `${g.e} ${g.name}`;
  if(days===3||days%7===0){f.xp+=30;return '⭐ 30 bonus XP'}
  return null}
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
  toStudio:()=>go('studio'),
  openDungeon:d=>go('dungeon',{did:d.id}),
  openSchool:d=>go('school',{sid:d.id}),
  openProgress:()=>go('progress'),
  quick:d=>{const s={tricks:['school',{sid:'tricks'}],market:['market'],board:['progress'],barn:['barn'],studio:['studio']}[d.id];if(s)go(s[0],s[1])},
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
  $('#app').innerHTML='<div class="boot"><span class="coin">🌾</span><p>Loading Happy Learning Farm…</p></div>';
  Promise.all([Promise.race([document.fonts?document.fonts.load('600 48px Fredoka'):Promise.resolve(),new Promise(r=>setTimeout(r,1800))]).catch(()=>{}),loadArt()]).then(()=>{render()});
}
