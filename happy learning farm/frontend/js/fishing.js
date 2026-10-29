/* Happy Learning Farm — Fishing pond. Hook a fish, then reel from underwater while you answer. */
const POND_COST=24,WIDE_COST=36;
const RODS=[
  {id:'twig',name:'Twig rod',e:'🪵',cost:0,wait:1800,reel:34},
  {id:'bamboo',name:'Bamboo rod',e:'🎋',cost:12,wait:1200,reel:40},
  {id:'river',name:'River rod',e:'🎣',cost:28,wait:800,reel:46},
  {id:'gold',name:'Golden rod',e:'✨',cost:48,wait:500,reel:52}
];
const TACKLE=[
  {id:'bobber',name:'Red bobber',e:'🔴',cost:8,blurb:'A bright float'},
  {id:'net',name:'Landing net',e:'🥅',cost:16,blurb:'A miss does not pull as hard'},
  {id:'bucket',name:'Fish bucket',e:'🪣',cost:10,blurb:'Keep a tally of catches'},
  {id:'lantern',name:'Dock lantern',e:'🏮',cost:14,blurb:'Light for the evening bite'}
];
const FISHES=[
  {id:'minnow',name:'Minnow',e:'🐟',pond:1,start:48,tug:2,dive:22},
  {id:'carp',name:'Carp',e:'🐠',pond:1,start:56,tug:2,dive:24},
  {id:'bass',name:'Bass',e:'🐡',pond:1,start:62,tug:3,dive:26},
  {id:'koi',name:'Koi',e:'🎏',pond:2,start:66,tug:3,dive:28},
  {id:'octopus',name:'Octopus',e:'🐙',pond:2,start:72,tug:3,dive:30}
];
const EN={zero:0,oh:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
let fishTimer=null,fishTugTimer=null,fishRec=null;
function rodOf(fish){return RODS.find(r=>r.id===fish.rod)||RODS[0]}
function fishSources(p){const D=dun('tricks',p);if(!D||!D.levels)return [];return D.levels.filter(l=>!l.soon&&((p.lv[l.id]||{}).stars>0))}
function qTimes(p){
  const hi=gradeOf(p)==='p3'?9:5;
  const a=rnd(1,hi),b=rnd(1,hi);
  return {html:`${a} × ${b}`,answer:a*b,from:'Times table'};
}
function qFishFriends(S){let a;do{a=rnd(1,S-1)}while(a%10===0);return {html:`${a} + ${S-a}`,answer:S,from:'Best Friend Pairs'}}
function qFishHats(bases,count){
  const nums=Array.from({length:count},()=>{const base=bases[rnd(0,bases.length-1)];return base-rnd(1,base>=1000?9:4)});
  return {html:nums.join(' + '),answer:nums.reduce((s,n)=>s+n,0),from:'Hat and Cloak'};
}
function qFishJoin(a,b,c,from){if(b===c)c=b===1?2:b-1;return {html:`${a} × ${b} + ${a} × ${c}`,answer:a*(b+c),from}}
function qFishBreak(a,b,c){if(b===c)c=b===1?2:b-1;return {html:`${a} × (${b} + ${c})`,answer:a*(b+c),from:'Break It Up'}}
function qFromCleared(id){
  if(id==='c1-1')return qFishFriends(10*rnd(1,4));
  if(id==='c1-2')return qFishHats([100],rnd(2,3));
  if(id==='c1-3')return qFishJoin(rnd(2,4),rnd(1,5),rnd(1,5),'Same Basket');
  if(id==='c1-4')return rnd(0,1)?qFishBreak(rnd(2,4),rnd(1,5),rnd(1,5)):qFishBreak(rnd(2,6),rnd(1,4)*10,rnd(1,9));
  if(id==='c3-1'){
    const roll=rnd(1,3);
    if(roll===1){const a=rnd(105,895);return {html:`${a} + ${1000-a}`,answer:1000,from:'Best Friend Pairs'}}
    if(roll===2){const k=rnd(15,80),round=rnd(1,9)*100;return {html:`${round+k} ${MINUS} ${k}`,answer:round,from:'Best Friend Pairs'}}
    const a=rnd(10,40);return {html:`${MINUS}${a} ${MINUS} ${100-a}`,answer:-100,from:'Best Friend Pairs'};
  }
  if(id==='c3-2')return qFishHats([100,1000],rnd(2,3));
  if(id==='c3-3')return rnd(0,1)?qFishJoin(rnd(3,5),rnd(2,6),rnd(2,6),'Same Basket'):qFishJoin(rnd(0,1)?4:6,rnd(0,1)?120:200,rnd(0,1)?105:150,'Same Basket');
  if(id==='c3-4')return rnd(0,1)?qFishBreak(rnd(3,5),rnd(2,6),rnd(2,6)):qFishBreak(rnd(0,1)?4:6,rnd(0,1)?200:300,rnd(0,1)?25:50);
  return null;
}
function fishQuestion(p){
  const src=fishSources(p);
  if(!src.length)return qTimes(p);
  for(let i=0;i<6;i++){const q=qFromCleared(src[rnd(0,src.length-1)].id);if(q&&Number.isFinite(q.answer))return q}
  return qTimes(p);
}
function parseEn(text){
  const words=String(text||'').toLowerCase().replace(/-/g,' ').split(/[^a-z0-9]+/).filter(Boolean);
  let total=0,cur=0,any=false,neg=false;
  for(const w of words){
    if((w==='minus'||w==='negative')&&!any){neg=true;continue}
    if(w==='and')continue;
    if(w==='hundred'){cur=(cur||1)*100;any=true;continue}
    if(w==='thousand'){total+=(cur||1)*1000;cur=0;any=true;continue}
    if(/^\d+$/.test(w)){cur+=+w;any=true;continue}
    if(EN[w]!=null){cur+=EN[w];any=true}
  }
  return any?[neg?-(total+cur):total+cur]:[];
}
function parseZh(text){
  const d={零:0,〇:0,一:1,二:2,两:2,兩:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
  let s=String(text||'').replace(/[^\u4e00-\u9fff0-9]/g,''),neg=false;
  if(s[0]==='负'||s[0]==='負'){neg=true;s=s.slice(1)}
  let section=0,num=0,any=false,i=0;
  while(i<s.length){
    if(/\d/.test(s[i])){let n='';while(i<s.length&&/\d/.test(s[i]))n+=s[i++];num=+n;any=true;continue}
    if(s[i]==='千'){section+=(num||1)*1000;num=0;any=true;i++;continue}
    if(s[i]==='百'){section+=(num||1)*100;num=0;any=true;i++;continue}
    if(s[i]==='十'){section+=(num||1)*10;num=0;any=true;i++;continue}
    if(d[s[i]]!=null){num=d[s[i]];any=true;i++;continue}
    i++;
  }
  return any?[neg?-(section+num):section+num]:[];
}
function spokenNumbers(text){return [...parseEn(text),...parseZh(text)]}
function rFish(){
  const p=cur(),fish=fishOf(p),tab=UI.tab||'fish';
  const tabs=[['fish','🎣 Fish'],['shop','🧰 Tackle']].map(([id,l])=>`<button class="b sm ${tab===id?'':'ghost'}" data-act="fishTab" data-id="${id}">${l}</button>`).join('');
  let body='';
  if(fish.pond<1)body=`<div class="card"><h2>Empty shore</h2><p>Build a pond here. Then buy tackle and fish.</p><button class="b" data-act="fishBuild" ${p.gems<POND_COST?'disabled':''}>Build the pond · ${POND_COST} 🪙</button></div>`;
  else if(tab==='shop')body=shopHTML(p,fish);
  else body=castHTML(p,fish);
  const caught=FISH_CATCH.filter(f=>fish.catches[f.id]).map(f=>`${f.e} ${fish.catches[f.id]} · ${f.worth}🪙`).join('  ');
  $('#app').innerHTML=topBar('Fishing Pond','toTown')+npcHTML(ANGLER,UI.msg||(fish.pond?`The water is ready. You have ${fish.bait} worm${fish.bait===1?'':'s'}.`:'This shore is waiting for a pond.'))+
    `<div class="pond"><div class="btns" style="margin:0 0 14px">${tabs}</div>${body}${caught?`<p class="muted">Caught: ${caught}. Mo at the market buys each kind for a different price.</p>`:''}</div>`;
  if((UI.phase==='bite'||UI.phase==='land')&&UI.fight&&window.fishViewMount)fishViewMount();
  else if(window.fishViewHide)fishViewHide();
  if(UI.phase==='land'||(UI.phase==='caught'&&UI.land>=2)){
    window.scrollTo(0,0);
    const step=document.querySelector('.landdemo .demo-step:last-child')||document.querySelector('.landdemo');
    if(step)step.scrollIntoView({block:'center'});
  }
  if(UI.phase==='wait'||UI.phase==='strike'){const water=document.querySelector('.under');if(water)water.scrollIntoView({block:'center'})}
}
function shopHTML(p,fish){
  const worms=`<div class="item"><div class="e">🪱</div><div class="nm">Worms</div><p class="muted" style="font-size:14px">You have ${fish.bait}<br>3 worms · one cast each</p><div class="acts"><button class="b sm" data-act="fishWorms" ${p.gems<6?'disabled':''}>Buy 3 · 6 🪙</button></div></div>`;
  const rods=RODS.filter(r=>r.cost).map(r=>{
    const own=fish.owned.includes('rod:'+r.id),use=fish.rod===r.id;
    const btn=use?'<button class="b sm ghost" disabled>Using</button>':own?`<button class="b sm" data-act="fishEquip" data-id="${r.id}">Use</button>`:`<button class="b sm" data-act="fishBuy" data-id="rod:${r.id}" ${p.gems<r.cost?'disabled':''}>Buy ${r.cost} 🪙</button>`;
    return `<div class="item ${use?'using':''}"><div class="e">${r.e}</div><div class="nm">${r.name}</div><p class="muted" style="font-size:14px">Bites sooner and reels harder</p><div class="acts">${btn}</div></div>`;
  }).join('');
  const gear=TACKLE.map(t=>{
    const own=fish.owned.includes(t.id);
    const btn=own?'<button class="b sm ghost" disabled>Yours</button>':`<button class="b sm" data-act="fishBuy" data-id="${t.id}" ${p.gems<t.cost?'disabled':''}>Buy ${t.cost} 🪙</button>`;
    return `<div class="item ${own?'using':''}"><div class="e">${t.e}</div><div class="nm">${t.name}</div><p class="muted" style="font-size:14px">${t.blurb}</p><div class="acts">${btn}</div></div>`;
  }).join('');
  const wide=fish.pond<2?`<p><button class="b" data-act="fishWide" ${p.gems<WIDE_COST?'disabled':''}>Widen the pond · ${WIDE_COST} 🪙</button></p><p class="muted">A wider pond brings koi and an octopus.</p>`:'<p class="muted">The pond is as wide as it gets.</p>';
  return `${wide}<div class="items">${worms}${rods}${gear}</div>`;
}
function fishBlurb(p){
  const src=fishSources(p);
  if(!src.length)return 'No level cleared yet, so this cast is a times table. Clear one and the pond will ask from it.';
  return 'Questions come from '+src.map(l=>l.name).join(', ')+'.';
}
function fightSpot(depth){return depth<25?'near the light':depth<55?'midway':depth<78?'deep':'almost gone'}
function fightHTML(){
  const f=UI.fight,y=Math.max(8,Math.min(90,f.depth));
  const lit=fishOf(cur()).owned.includes('lantern')?' lit':'';
  const land=UI.phase==='land';
  const titles=['Hooked','Pulled up','Grabbed'];
  const over=land?`<div class="landover"><p>${titles[UI.land|0]||titles[0]}</p>${(UI.land|0)>=2?'<span class="hand">🤲</span>':''}</div>`:'';
  return `<div class="under${lit}${land?' landing':''}" aria-label="Under the pond. The ${f.fish.name} is ${fightSpot(y)}.">
    <div class="surf"></div><div class="rays"></div>
    <div class="hook">🪝</div>
    <div class="line" id="fightLine" style="height:${y}%"></div>
    <div class="fighter" id="fightFish" style="top:${y}%"><span class="swimmer">${f.fish.e}</span></div>
    <span class="bub b1"></span><span class="bub b2"></span><span class="bub b3"></span><span class="bub b4"></span>
    <span class="weed l">🌿</span><span class="weed r">🌿</span><div class="silt"></div>${over}
  </div>
  <div class="tugbar" title="A full bar means the fish is near the light"><span id="fightMeter" style="width:${Math.round(100-y)}%"></span></div>
  <p class="muted tugnote" id="fightNote">${f.fish.name} is ${fightSpot(y)}.${land?'':' Answer to reel up.'}</p>`;
}
function castHTML(p,fish){
  const rod=rodOf(fish);
  const lang=UI.lang==='zh-CN'?'zh-CN':'en-US';
  if(UI.phase==='bite'&&UI.q&&UI.fight){
    const keys=[1,2,3,4,5,6,7,8,9,0].map(n=>`<button type="button" data-act="fishKey" data-k="${n}">${n}</button>`).join('');
    return `${fightHTML()}<div class="pondstage"><p><b>${esc(UI.q.from)}</b></p><div class="ask">${esc(UI.q.html)}</div><p class="heard">${esc(UI.heard||'Say the answer to reel')}</p>
      <button class="b mic ${UI.hearing?'live':''}" data-act="fishHear">${UI.hearing?'Listening…':'🎙️ Say the answer'}</button>
      <p><button class="b ghost sm" data-act="fishLang">${lang==='zh-CN'?'Hearing Chinese · tap for English':'Hearing English · tap for 中文'}</button></p></div>
      <p class="muted">Or tap it.</p><div class="display" id="fishDisp">${esc(UI.typed||'')}</div><div class="pad">${keys}<button type="button" data-act="fishKey" data-k="sign">${MINUS}</button><button type="button" data-act="fishKey" data-k="back">⌫</button><button type="button" class="ok" data-act="fishKey" data-k="ok">OK</button></div>`;
  }
  if(UI.phase==='land'&&UI.fight&&UI.catch)return fishLandHTML()+fightHTML();
  if(UI.phase==='caught'&&UI.catch)return fishLandHTML()+`<div class="pondstage"><div class="ask">${UI.catch.e}</div><p>A ${UI.catch.name}! ${UI.paid?`+${UI.paid} 🪙`:''}</p><button class="b" data-act="fishCast">Cast again</button></div>`;
  if(UI.phase==='lost')return `<div class="pondstage"><div class="ask">💦</div><p>It got away.</p><button class="b" data-act="fishCast">Cast again</button></div>`;
  if(UI.phase==='wait'||UI.phase==='strike')return waitWater();
  return `<div class="pondstage"><div class="ask">${fish.pond>=2?'🎏':'🐟'}</div><p>${rod.e} ${rod.name} · ${fish.bait} worm${fish.bait===1?'':'s'}</p>
    <p>${fishBlurb(p)} When it bites, you go under and reel while you answer.</p>
    <button class="b" data-act="fishCast" ${fish.bait<1?'disabled':''}>${fish.bait<1?'Need worms':'Cast'}</button></div>`;
}
function fishBuild(){const p=cur(),fish=fishOf(p);if(fish.pond||p.gems<POND_COST)return;p.gems-=POND_COST;fish.pond=1;save();UI.msg='The pond is in! Walk back to the farm to see the water. Buy worms, then cast.';UI.tab='shop';rFish()}
function fishWide(){const p=cur(),fish=fishOf(p);if(fish.pond!==1||p.gems<WIDE_COST)return;p.gems-=WIDE_COST;fish.pond=2;save();UI.msg='The pond is wider. Koi and an octopus can bite now.';rFish()}
function fishWorms(){const p=cur();if(p.gems<6)return;p.gems-=6;fishOf(p).bait+=3;save();UI.msg='Three worms in the tin.';rFish()}
function fishBuy(id){const p=cur(),fish=fishOf(p);
  const rod=id.startsWith('rod:')?RODS.find(r=>r.id===id.slice(4)):null;
  const item=rod||TACKLE.find(t=>t.id===id);
  if(!item||fish.owned.includes(id)||p.gems<item.cost)return;
  p.gems-=item.cost;fish.owned.push(id);if(rod)fish.rod=rod.id;save();UI.msg=`${item.name} is yours.`;rFish()}
function fishEquip(id){const fish=fishOf(cur());if(!fish.owned.includes('rod:'+id))return;fish.rod=id;save();UI.msg='Rod ready.';rFish()}
const SCHOOL_SPOTS=[[8,58],[26,32],[44,68],[64,38],[80,56]];
function fishSchoolHTML(){
  const pond=Math.max(1,fishOf(cur()).pond||1),pool=FISHES.filter(f=>f.pond<=pond);
  const got=UI.phase==='strike'&&UI.fight?UI.fight.fish:null;
  let bitten=false;
  return `<div class="school">${SCHOOL_SPOTS.map((s,i)=>{
    const f=pool[i%pool.length];
    const bite=!!(got&&!bitten&&f.id===got.id);
    if(bite)bitten=true;
    return `<span class="schoolfish${bite?' biter':''}" data-id="${f.id}" style="left:${s[0]}%;top:${s[1]}%;animation-delay:${i*.35}s" aria-hidden="true">${f.e}</span>`;
  }).join('')}</div>`;
}
function waitWater(){
  const lit=fishOf(cur()).owned.includes('lantern')?' lit':'';
  const strike=UI.phase==='strike';
  return `<div class="under waiting${lit}" aria-label="The line is down. Several fish are swimming. Which one bites is still a secret.">
    <div class="surf"></div><div class="rays"></div>
    <div class="hook">🪝</div>
    <div class="line${strike?' down':' dropping'}"></div>
    ${fishSchoolHTML()}
    <span class="bub b1"></span><span class="bub b2"></span><span class="bub b3"></span><span class="bub b4"></span>
    <span class="weed l">🌿</span><span class="weed r">🌿</span><div class="silt"></div>
  </div>
  <p class="muted tugnote">${strike?'One fish is coming to the hook.':'Many fish are down there. You will not know which one bites.'}</p>`;
}
function fishSchoolMove(){
  const biter=document.querySelector('.schoolfish.biter');
  const others=[...document.querySelectorAll('.schoolfish:not(.biter)')];
  if(!biter)return;
  biter.style.animation='none';
  const from={l:parseFloat(biter.style.left),t:parseFloat(biter.style.top)},start=performance.now();
  const tick=()=>{
    if(UI.phase!=='strike'||!biter.isConnected)return;
    const k=Math.min(1,(performance.now()-start)/1800),e=1-Math.pow(1-k,3);
    biter.style.left=(from.l+(46-from.l)*e)+'%';
    biter.style.top=(from.t+(14-from.t)*e)+'%';
    biter.style.fontSize=(36+22*e)+'px';
    others.forEach(el=>{if(!el.isConnected)return;el.style.opacity=String(1-e)});
    if(k<1)setTimeout(tick,40);
  };
  tick();
}
function fishCast(){
  const p=cur(),fish=fishOf(p);if(fish.pond<1||fish.bait<1||UI.phase==='wait'||UI.phase==='bite'||UI.phase==='strike')return;
  if(UI.phase==='land')return;
  fishStop();fish.bait--;save();UI.phase='wait';UI.fight=null;UI.msg='The line goes down. Many fish are in the pond.';rFish();
  fishTimer=setTimeout(()=>{if(UI.screen!=='fishing'||UI.phase!=='wait')return;fishHook(p)},rodOf(fish).wait+1600);
}
function fishHook(p){
  const fish=fishOf(p),pool=FISHES.filter(f=>f.pond<=fish.pond),got=pool[rnd(0,pool.length-1)],rod=rodOf(fish);
  UI.fight={fish:got,depth:got.start,tug:got.tug,reel:rod.reel,dive:fish.owned.includes('net')?Math.round(got.dive/2):got.dive};
  UI.phase='strike';UI.q=null;UI.heard='';UI.typed='';
  UI.msg='A bite! Watch which fish takes the hook.';
  rFish();fishSchoolMove();
  clearTimeout(fishTimer);fishTimer=setTimeout(()=>{if(UI.screen!=='fishing'||UI.phase!=='strike')return;fishBiteStart(p)},2000);
}
function fishBiteStart(p){
  if(!UI.fight)return;
  UI.phase='bite';UI.q=fishQuestion(p);UI.heard='';UI.typed='';
  UI.msg=`A ${UI.fight.fish.name} is hooked! Look down. Pull it up to the light.`;
  rFish();
  clearTimeout(fishTugTimer);fishTugTimer=setTimeout(fishTug,2200);
}
function fishPaint(){
  const f=UI.fight;if(!f)return;
  const y=Math.max(8,Math.min(90,f.depth));
  const fish=$('#fightFish'),line=$('#fightLine'),meter=$('#fightMeter'),note=$('#fightNote');
  if(fish)fish.style.top=y+'%';
  if(line)line.style.height=y+'%';
  if(meter)meter.style.width=Math.round(100-y)+'%';
  if(note)note.textContent=UI.phase==='land'?`${f.fish.name} is ${fightSpot(f.depth)}.`:`${f.fish.name} is ${fightSpot(f.depth)}. Answer to reel up.`;
}
function fishTug(){
  if(UI.screen!=='fishing'||UI.phase!=='bite'||!UI.fight)return;
  UI.fight.depth=Math.min(100,UI.fight.depth+UI.fight.tug);
  if(UI.fight.depth>=92)return fishEscape(UI.q,null);
  fishPaint();
  const el=$('#fightFish');
  if(el){el.classList.add('tug');setTimeout(()=>el.classList.remove('tug'),420)}
  fishTugTimer=setTimeout(fishTug,2200);
}
let fishLandTimer=null;
function fishLandHTML(){
  const step=UI.land|0,got=UI.catch,show=UI.phase==='caught'?2:step;
  const block=(n,title,body)=>show>=n?`<section class="demo-step"><p class="demo-k">${n+1}. ${title}</p>${body}</section>`:'';
  return `<div class="basketdemo landdemo step${show}" aria-live="polite">${block(0,'Hooked',`<p class="demo-note">The hook catches the <b>${esc(got.name)}</b>.</p>`)}${block(1,'Pulled up',`<p class="demo-note">The line brings the <b>${esc(got.name)}</b> up to the light.</p>`)}${block(2,'Grabbed',`<p class="demo-note">Hands close. The <b>${esc(got.name)}</b> is yours.</p><div class="grab" aria-hidden="true"><span class="hand">🤲</span><span class="catchfish">${got.e}</span></div>`)}</div>`;
}
function fishLand(q){
  const got=UI.fight.fish;fishStop();
  const fish=fishOf(cur());
  fish.catches[got.id]=(fish.catches[got.id]||0)+1;
  const pay=fish.pond>=2?2:1,given=earnCoins(cur(),pay);save();
  UI.catch=got;UI.paid=given;UI.landQ=q;UI.land=0;UI.phase='land';
  UI.fight.depth=72;
  UI.msg=`Watch once. The hook catches the ${got.name}.`;
  rFish();
  clearTimeout(fishLandTimer);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){UI.land=2;UI.fight.depth=8;rFish();fishLandTimer=setTimeout(fishLandDone,400);return}
  fishLandTimer=setTimeout(()=>fishLandStep(1),2800);
}
function fishLandStep(step){
  if(UI.screen!=='fishing'||UI.phase!=='land'||!UI.fight||!UI.catch)return;
  UI.land=step;
  if(step===1){
    UI.msg=`The line pulls the ${UI.catch.name} up to the light.`;
    rFish();fishLandRise();
    clearTimeout(fishLandTimer);fishLandTimer=setTimeout(()=>fishLandStep(2),2800);return;
  }
  UI.fight.depth=8;
  UI.msg=`Hands close. The ${UI.catch.name} is yours.`;
  rFish();
  if(window.fishViewKick)fishViewKick(1);
  clearTimeout(fishLandTimer);fishLandTimer=setTimeout(fishLandDone,2800);
}
function fishLandRise(){
  const from=UI.fight?UI.fight.depth:72,to=14,start=performance.now();
  const tick=now=>{
    if(UI.phase!=='land'||!UI.fight||UI.land!==1)return;
    const t=Math.min(1,(now-start)/2600);
    UI.fight.depth=from+(to-from)*t;
    fishPaint();
    if(t<1)requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function fishLandDone(){
  if(UI.screen!=='fishing'||UI.phase!=='land'||!UI.catch)return;
  const q=UI.landQ,got=UI.catch;
  UI.phase='caught';UI.land=2;UI.fight=null;
  UI.msg=UI.paid?`${q.html} = ${q.answer}. The ${got.name} is yours.`:`${q.html} = ${q.answer}. Nice catch. Today's coins are full, so the fish is the prize.`;
  rFish();
}
function fishEscape(q,n){
  const name=UI.fight&&UI.fight.fish?UI.fight.fish.name:'fish';
  fishStop();UI.phase='lost';UI.fight=null;
  UI.msg=n==null?`The ${name} pulled down into the dark.`:`${n} isn't it. ${q.html} = ${q.answer}. The ${name} breaks away.`;
  rFish();
}
function fishStopRec(){if(fishRec){try{fishRec.onresult=null;fishRec.onerror=null;fishRec.stop()}catch(e){}fishRec=null}UI.hearing=false}
function fishStop(){clearTimeout(fishTimer);fishTimer=null;clearTimeout(fishTugTimer);fishTugTimer=null;clearTimeout(fishLandTimer);fishLandTimer=null;fishStopRec()}
function fishJudge(n){
  if(UI.phase!=='bite'||!UI.q||!UI.fight||n==null||Number.isNaN(n))return;
  fishStopRec();
  const q=UI.q;
  UI.typed='';UI.heard='';
  if(n===q.answer){
    UI.fight.depth=Math.max(0,UI.fight.depth-UI.fight.reel);
    if(UI.fight.depth<=10)return fishLand(q);
    UI.q=fishQuestion(cur());
    UI.msg=`${q.html} = ${q.answer}. You reel it closer.`;
    rFish();
    const el=$('#fightFish');if(el)el.classList.add('reel');
    if(window.fishViewKick)fishViewKick(1);
    return;
  }
  UI.fight.depth=Math.min(100,UI.fight.depth+UI.fight.dive);
  if(UI.fight.depth>=92)return fishEscape(q,n);
  const net=fishOf(cur()).owned.includes('net');
  UI.q=fishQuestion(cur());
  UI.msg=`${n} isn't it. ${q.html} = ${q.answer}. The fish dives${net?' — the net slows it':''}.`;
  rFish();
  const el=$('#fightFish');if(el)el.classList.add('tug');
  if(window.fishViewKick)fishViewKick(-1);
}
function fishHear(){
  if(UI.phase!=='bite')return;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){UI.msg='This browser cannot hear yet. Tap the answer instead.';return rFish()}
  fishStopRec();UI.phase='bite';UI.hearing=true;UI.heard='Listening…';rFish();
  const rec=new SR();fishRec=rec;rec.lang=UI.lang==='zh-CN'?'zh-CN':'en-US';rec.interimResults=false;rec.maxAlternatives=5;
  rec.onresult=ev=>{
    const alts=[...ev.results[0]].map(r=>r.transcript);
    UI.heard=alts[0]||'';
    const nums=alts.flatMap(spokenNumbers);
    const hit=nums.find(n=>n===UI.q.answer);
    fishJudge(hit!=null?hit:nums.length?nums[0]:NaN);
    if(!nums.length){UI.phase='bite';UI.msg='I heard you, but not a number. Try again, or tap it.';UI.heard=alts[0]||'';rFish()}
  };
  rec.onerror=()=>{UI.hearing=false;UI.msg='I could not hear. Tap the answer, or try the microphone again.';rFish()};
  rec.onend=()=>{UI.hearing=false};
  try{rec.start()}catch(e){UI.hearing=false;UI.msg='The microphone did not start. Tap the answer instead.';rFish()}
}
function fishKey(k){
  if(UI.phase!=='bite')return;
  if(k==='back')UI.typed=(UI.typed||'').slice(0,-1);
  else if(k==='sign')UI.typed=(UI.typed||'').startsWith(MINUS)?UI.typed.slice(1):MINUS+(UI.typed||'');
  else if(k==='ok'){if(UI.typed&&UI.typed!==MINUS)fishJudge(Number(String(UI.typed).replace(MINUS,'-')));return}
  else if(String(UI.typed||'').replace(MINUS,'').length<4)UI.typed=(UI.typed||'')+k;
  const d=$('#fishDisp');if(d)d.textContent=UI.typed||'';
}
Object.assign(ACT,{
  fishTab:d=>{fishStop();UI.tab=d.id;UI.phase='ready';UI.msg=null;rFish()},
  fishBuild:()=>fishBuild(),fishWide:()=>fishWide(),fishWorms:()=>fishWorms(),
  fishBuy:d=>fishBuy(d.id),fishEquip:d=>fishEquip(d.id),fishCast:()=>fishCast(),
  fishHear:()=>fishHear(),fishLang:()=>{UI.lang=UI.lang==='zh-CN'?'en-US':'zh-CN';rFish()},
  fishKey:d=>fishKey(d.k)
});
startPage({fishing:rFish},()=>({screen:'fishing',tab:'fish',phase:'ready',lang:'en-US'}));
