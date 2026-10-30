/* Happy Learning Farm — Fishing pond. Hook a fish, then reel from underwater while you answer. */
const POND_COST=24,WIDE_COST=36;
const RODS=[
  {id:'twig',name:'Twig rod',e:'🪵',cost:0,wait:1800,reel:34},
  {id:'bamboo',name:'Bamboo rod',e:'🎋',cost:12,wait:1200,reel:40},
  {id:'river',name:'River rod',e:'🎣',cost:28,wait:800,reel:46},
  {id:'gold',name:'Golden rod',e:'✨',cost:48,wait:500,reel:52}
];
const TACKLE=[
  {id:'bobber',name:'Red bobber',e:'🔴',cost:8,blurb:'The pull bar waits a little longer before it slips'},
  {id:'net',name:'Landing net',e:'🥅',cost:16,blurb:'The pull bar slips down slower'},
  {id:'bucket',name:'Fish bucket',e:'🪣',cost:10,blurb:'A catch pays 2 more coins'},
  {id:'lantern',name:'Dock lantern',e:'🏮',cost:14,blurb:'Lights the water, and the bar slips a little slower'}
];
const FISHES=[
  {id:'minnow',name:'Minnow',e:'🐟',pond:1,start:48,tug:2,dive:22},
  {id:'carp',name:'Carp',e:'🐠',pond:1,start:56,tug:2,dive:24},
  {id:'bass',name:'Bass',e:'🐡',pond:1,start:62,tug:3,dive:26},
  {id:'koi',name:'Koi',e:'🎏',pond:2,start:66,tug:3,dive:28},
  {id:'octopus',name:'Octopus',e:'🐙',pond:2,start:72,tug:3,dive:30}
];
let fishTimer=null,fishTugTimer=null,fishClock=null,fishPullTimer=null;
function rodOf(fish){return RODS.find(r=>r.id===fish.rod)||RODS[0]}
function fishTapFill(rod){return Math.round((((rod&&rod.reel)||34)-22)/2)}
function qTimes(){
  const a=rnd(1,9),b=rnd(1,9);
  return {html:`${a} × ${b}`,answer:a*b,from:'Times table'};
}
function fishSources(p){const D=dun('tricks',p);if(!D||!D.levels)return [];return D.levels.filter(l=>!l.soon&&((p.lv[l.id]||{}).stars>0))}
function qFishFriends(S){let a;do{a=rnd(1,S-1)}while(a%10===0);return {html:`${a} + ${S-a}`,answer:S,from:'Best Friend Pairs'}}
function qFishHats(bases,count){
  const nums=Array.from({length:count},()=>{const base=bases[rnd(0,bases.length-1)];return base-rnd(1,base>=1000?9:4)});
  return {html:nums.join(' + '),answer:nums.reduce((s,n)=>s+n,0),from:'Hat and Cloak'};
}
function qFromLevel(q,from){return q?{html:q.html,answer:q.answer,from}:null}
function qFromCleared(id){
  if(id==='c1-1')return qFishFriends(10*rnd(1,4));
  if(id==='c1-2')return qFishHats([100],rnd(2,3));
  if(id==='c1-3')return qFromLevel(qBasketP1(rnd(0,4)),'Same Basket');
  if(id==='c1-4')return qFromLevel(qBreakP1(rnd(0,4)),'Break It Up');
  if(id==='c3-1'){
    const roll=rnd(1,3);
    if(roll===1){const a=rnd(105,895);return {html:`${a} + ${1000-a}`,answer:1000,from:'Best Friend Pairs'}}
    if(roll===2){const k=rnd(15,80),round=rnd(1,9)*100;return {html:`${round+k} ${MINUS} ${k}`,answer:round,from:'Best Friend Pairs'}}
    const a=rnd(10,40);return {html:`${MINUS}${a} ${MINUS} ${100-a}`,answer:-100,from:'Best Friend Pairs'};
  }
  if(id==='c3-2')return qFishHats([100,1000],rnd(2,3));
  if(id==='c3-3')return qFromLevel(qBasketP3(rnd(0,4)),'Same Basket');
  if(id==='c3-4')return qFromLevel(qBreakP3(rnd(0,4)),'Break It Up');
  return null;
}
function fishQuestion(p){
  p=p||cur();
  if(UI.quiz==='unlocked'){
    const src=fishSources(p);
    for(let i=0;i<6&&src.length;i++){const q=qFromCleared(src[rnd(0,src.length-1)].id);if(q&&Number.isFinite(q.answer))return q}
  }
  return qTimes();
}
function rFish(){
  const p=cur(),fish=fishOf(p),tab=UI.tab||'fish';
  if(tab==='fish'&&UI.phase==='bite'&&UI.q&&!UI.hearing&&!UI.voiceMiss&&(UI.voiceForce||!voiceBlocked)){UI.hearing=true;UI.voice=true;UI.heard='';UI.heardNums=[];UI.voicePending=true}
  const tabs=[['fish','🎣 Fish'],['shop','🧰 Tackle']].map(([id,l])=>`<button class="b sm ${tab===id?'':'ghost'}" data-act="fishTab" data-id="${id}">${l}</button>`).join('');
  let body='';
  if(fish.pond<1)body=`<div class="card"><h2>Empty shore</h2><p>Build a pond here. Then buy tackle and fish.</p><button class="b" data-act="fishBuild" ${p.gems<POND_COST?'disabled':''}>Build the pond · ${POND_COST} 🪙</button></div>`;
  else if(tab==='shop')body=shopHTML(p,fish);
  else body=castHTML(p,fish);
  const caught=FISH_CATCH.filter(f=>fish.catches[f.id]).map(f=>`${f.e} ${fish.catches[f.id]} · ${f.worth}🪙`).join('  ');
  $('#app').innerHTML=topBar('Fishing Pond','toTown')+npcHTML(ANGLER,UI.msg||(fish.pond?`The water is ready. You have ${fish.bait} worm${fish.bait===1?'':'s'}.`:'This shore is waiting for a pond.'))+
    `<div class="pond"><div class="btns" style="margin:0 0 14px">${tabs}</div>${body}${caught?`<p class="muted">Caught: ${caught}. Mo at the market buys each kind for a different price.</p>`:''}</div>`;
  const pulling=UI.phase==='land'&&(UI.land|0)===1;
  const leaping=UI.phase==='land'&&(UI.land|0)>=2;
  if((UI.phase==='bite'||UI.phase==='mark'||pulling)&&UI.fight&&window.fishViewMount)fishViewMount();
  else if(window.fishViewHide)fishViewHide();
  if(UI.phase==='mark'){const log=document.querySelector('.fishlog');if(log)log.scrollIntoView({block:'center'})}
  if(pulling){const water=document.querySelector('.under');if(water)water.scrollIntoView({block:'center'})}
  else if(leaping||(UI.phase==='caught'&&UI.land>=2)){
    window.scrollTo(0,0);
    const step=document.querySelector('.leapshow')||document.querySelector('.landdemo .demo-step:last-child')||document.querySelector('.landdemo');
    if(step)step.scrollIntoView({block:'center'});
  }
  if(UI.phase==='wait'||UI.phase==='strike'){const water=document.querySelector('.under');if(water)water.scrollIntoView({block:'center'})}
  if(UI.voicePending){UI.voicePending=false;fishStartRec()}
}
function shopHTML(p,fish){
  const worms=`<div class="item"><div class="e">🪱</div><div class="nm">Worms</div><p class="muted" style="font-size:14px">You have ${fish.bait}<br>3 worms · one cast each</p><div class="acts"><button class="b sm" data-act="fishWorms" ${p.gems<6?'disabled':''}>Buy 3 · 6 🪙</button></div></div>`;
  const rods=RODS.filter(r=>r.cost).map(r=>{
    const own=fish.owned.includes('rod:'+r.id),use=fish.rod===r.id;
    const btn=use?'<button class="b sm ghost" disabled>Using</button>':own?`<button class="b sm" data-act="fishEquip" data-id="${r.id}">Use</button>`:`<button class="b sm" data-act="fishBuy" data-id="rod:${r.id}" ${p.gems<r.cost?'disabled':''}>Buy ${r.cost} 🪙</button>`;
    return `<div class="item ${use?'using':''}"><div class="e">${r.e}</div><div class="nm">${r.name}</div><p class="muted" style="font-size:14px">Bites sooner. Each tap fills ${fishTapFill(r)} of the pull bar.</p><div class="acts">${btn}</div></div>`;
  }).join('');
  const gear=TACKLE.map(t=>{
    const own=fish.owned.includes(t.id);
    const btn=own?'<button class="b sm ghost" disabled>Yours</button>':`<button class="b sm" data-act="fishBuy" data-id="${t.id}" ${p.gems<t.cost?'disabled':''}>Buy ${t.cost} 🪙</button>`;
    return `<div class="item ${own?'using':''}"><div class="e">${t.e}</div><div class="nm">${t.name}</div><p class="muted" style="font-size:14px">${t.blurb}</p><div class="acts">${btn}</div></div>`;
  }).join('');
  const wide=fish.pond<2?`<p><button class="b" data-act="fishWide" ${p.gems<WIDE_COST?'disabled':''}>Widen the pond · ${WIDE_COST} 🪙</button></p><p class="muted">A wider pond brings koi and an octopus. They slip the pull bar down faster.</p>`:'<p class="muted">The pond is as wide as it gets. Koi and the octopus still slip the bar faster.</p>';
  return `${wide}<div class="items">${worms}${rods}${gear}</div>`;
}
function fishBlurb(p){
  const src=fishSources(p),mode=UI.quiz==='unlocked'&&src.length?'Unlocked tricks':'1 to 9 times table';
  const time=UI.limit?`${UI.limit} seconds`:'no time limit';
  return `${mode}. Get 2 correct in a row to hook the fish, then keep tapping until the pull bar is full. A wrong answer does not scare it away. Time: ${time}.`;
}
function fishLimitHTML(){
  const cur=UI.limit==null?30:UI.limit|0;
  const opts=[[15,'15s'],[30,'30s'],[45,'45s'],[60,'60s'],[0,'No limit']];
  return `<p class="muted">Time for this fish</p><div class="btns" style="justify-content:center;margin:8px 0">${opts.map(([n,lab])=>`<button type="button" class="b sm ${cur===n?'':'ghost'}" data-act="fishLimit" data-id="${n}">${lab}</button>`).join('')}</div>`;
}
function heardHTML(hint){
  if(UI.hearing){
    const text=UI.heard||'';
    const nums=UI.heardNums&&UI.heardNums.length?UI.heardNums.join(', '):'';
    return `<p class="heard heard-live" id="heardLive">${text?`Heard: ${esc(text)}`:'Listening…'}</p><p class="heard" id="heardNum">${nums?`Number: ${esc(nums)}`:''}</p>`;
  }
  if(UI.mark&&UI.heard){
    const ok=UI.mark==='good';
    const label=UI.voice?'Heard':'Entered';
    const nums=UI.voice?(UI.heardNums&&UI.heardNums.length?UI.heardNums.join(', '):'none'):'';
    const numLine=UI.voice?`<p class="heard ${nums==='none'?'bad':UI.mark}">Number: ${esc(nums)}</p>`:'';
    return `<p class="heard ${UI.mark}">${label}: ${esc(UI.heard)}</p>${numLine}<p class="verdict ${UI.mark}">${ok?'Correct':'Wrong'}</p>`;
  }
  return hint?`<p class="heard">${esc(hint)}</p>`:'';
}
function fishLogHTML(withHead){
  const log=UI.log||[];
  if(!log.length)return '';
  const last=log[log.length-1];
  const head=!withHead?'':UI.pending==='land'
    ?'<p class="verdict good">Two correct in a row</p>'
    :UI.pending==='lost'
      ?'<p class="verdict bad">Time is up</p>'
      :`<p class="verdict ${last.ok?'good':'bad'}">${last.ok?'Correct':'Wrong'}</p>`;
  const rows=log.map((r,i)=>{
    const bits=[];
    if(r.time)bits.push("Time's up");
    else if(r.heard)bits.push(`${r.voice?'Heard':'Entered'}: ${esc(r.heard)}`);
    if(r.voice)bits.push(`Number: ${esc(r.nums&&r.nums.length?r.nums.join(', '):'none')}`);
    return `<li class="${r.ok?'good':'bad'}"><b>${i+1}. ${esc(String(r.html))} = ${r.answer}</b><span>${r.ok?'Correct':'Wrong'}</span>${bits.length?`<small>${bits.join(' · ')}</small>`:''}</li>`;
  }).join('');
  return `<div class="fishlog" aria-live="polite">${head}<ol>${rows}</ol><p class="muted">Correct in a row: ${UI.streak|0} of 2.</p></div>`;
}
function fightSpot(depth){return depth<25?'near the light':depth<55?'midway':depth<78?'deep':'almost gone'}
function fightHTML(){
  const f=UI.fight,y=Math.max(8,Math.min(90,f.depth));
  const lit=fishOf(cur()).owned.includes('lantern')?' lit':'';
  const land=UI.phase==='land',pulling=land&&(UI.land|0)===1;
  if(land&&(UI.land|0)>=2&&UI.catch)return fishLeapHTML();
  const titles=['Hooked','Pull up','Jump'];
  const meter=pulling?Math.round(UI.pull||0):Math.round(100-y);
  const over=land?`<div class="landover"><p>${titles[UI.land|0]||titles[0]}</p></div>`:'';
  const note=pulling?`Keep tapping. ${meter}%. The bar slips if you stop.`:`${f.fish.name} is ${fightSpot(y)}.${land?'':` Correct in a row ${UI.streak|0} of 2.${UI.limit?` ${Math.max(0,UI.left|0)}s left.`:''}`}`;
  return `<div class="under${lit}${land?' landing':''}${pulling?' pulling':''}" aria-label="${pulling?'Tap to pull the fish up.':`Under the pond. The ${f.fish.name} is ${fightSpot(y)}.`}" >
    <div class="surf"></div><div class="rays"></div>
    <div class="hook">🪝</div>
    <div class="line" id="fightLine" style="height:${y}%"></div>
    <div class="fighter" id="fightFish" style="top:${y}%"><span class="swimmer">${f.fish.e}</span></div>
    <span class="bub b1"></span><span class="bub b2"></span><span class="bub b3"></span><span class="bub b4"></span>
    <span class="weed l">🌿</span><span class="weed r">🌿</span><div class="silt"></div>${over}
  </div>
  <div class="tugbar${pulling?' live':''}" title="Fill the bar to pull the fish out"><span id="fightMeter" style="width:${meter}%"></span></div>
  <p class="muted tugnote" id="fightNote">${note}</p>`;
}
function castHTML(p,fish){
  const rod=rodOf(fish);
  const lang=UI.lang==='zh-CN'?'zh-CN':'en-US';
  if(UI.phase==='bite'&&UI.q&&UI.fight){
    const keys=[1,2,3,4,5,6,7,8,9,0].map(n=>`<button type="button" data-act="fishKey" data-k="${n}">${n}</button>`).join('');
    const clock=UI.limit?`<span id="fishClock">${Math.max(0,UI.left|0)}s left</span>`:'<span id="fishClock">No time limit</span>';
    return `${fightHTML()}<div class="pondstage"><p><b>${esc(UI.q.from)}</b> · correct in a row ${UI.streak|0} of 2 · ${clock}</p><div class="ask">${esc(UI.q.html)}</div>${heardHTML(lang==='zh-CN'?'说出得数，例如「五十六」':'Say the number, like “fifty-six”')}
      <button class="b mic ${UI.hearing?'live':''}" data-act="fishHear">${UI.hearing?'Listening…':'🎙️ Say the answer'}</button>
      <p><button class="b ghost sm" data-act="fishLang">${lang==='zh-CN'?'Hearing Chinese · tap for English':'Hearing English · tap for 中文'}</button></p></div>
      <p class="muted">Or tap it.</p><div class="display" id="fishDisp">${esc(UI.typed||'')}</div><div class="pad">${keys}<button type="button" data-act="fishKey" data-k="sign">${MINUS}</button><button type="button" data-act="fishKey" data-k="back">⌫</button><button type="button" class="ok" data-act="fishKey" data-k="ok">OK</button></div>`;
  }
  if(UI.phase==='mark'&&UI.fight){
    const btn=UI.pending==='land'?'Catch the fish':UI.pending==='lost'?'The fish got away':'Next question';
    const wait=UI.limit&&UI.pending==='next'?`<p class="muted">${Math.max(0,UI.left|0)}s left. The clock waits while you read.</p>`:'';
    return `${fightHTML()}<div class="pondstage">${fishLogHTML(true)}${wait}<button class="b" data-act="fishNext">${btn}</button></div>`;
  }
  if(UI.phase==='land'&&UI.fight&&UI.catch)return fishLogHTML(false)+heardHTML()+fishLandHTML()+fightHTML();
  if(UI.phase==='caught'&&UI.catch)return fishLogHTML(false)+heardHTML()+fishLandHTML()+`<div class="pondstage"><div class="ask">${UI.catch.e}</div><p>A ${UI.catch.name}! ${UI.paid?`+${UI.paid} 🪙`:''}</p><button class="b" data-act="fishCast">Cast again</button></div>`;
  if(UI.phase==='lost')return fishLogHTML(false)+`<div class="pondstage"><div class="ask">💦</div><p>It got away.</p><button class="b" data-act="fishCast">Cast again</button></div>`;
  if(UI.phase==='wait'||UI.phase==='strike')return waitWater();
  const src=fishSources(p),quiz=UI.quiz==='unlocked'&&src.length?'unlocked':'times';
  const pick=`<div class="btns" style="justify-content:center;margin:8px 0"><button class="b sm ${quiz==='times'?'':'ghost'}" data-act="fishQuiz" data-id="times">1 to 9 times table</button><button class="b sm ${quiz==='unlocked'?'':'ghost'}" data-act="fishQuiz" data-id="unlocked" ${src.length?'':'disabled'}>Unlocked tricks</button></div><p class="muted">${src.length?`Unlocked: ${src.map(l=>l.name).join(', ')}.`:'Clear a trick level to unlock those questions.'}</p>`;
  return `<div class="pondstage"><div class="ask">${fish.pond>=2?'🎏':'🐟'}</div><p>${rod.e} ${rod.name} · each tap fills ${fishTapFill(rod)} · ${fish.bait} worm${fish.bait===1?'':'s'}</p>
    ${pick}
    ${fishLimitHTML()}
    <p>${fishBlurb(p)}</p>
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
  UI.phase='strike';UI.q=null;UI.heard='';UI.typed='';UI.mark='';UI.voice=false;UI.heardNums=null;
  UI.msg='A bite! Watch which fish takes the hook.';
  rFish();fishSchoolMove();
  clearTimeout(fishTimer);fishTimer=setTimeout(()=>{if(UI.screen!=='fishing'||UI.phase!=='strike')return;fishBiteStart(p)},2000);
}
function fishBiteStart(p){
  if(!UI.fight)return;
  if(UI.limit==null)UI.limit=30;
  UI.phase='bite';UI.q=fishQuestion(p);UI.streak=0;UI.log=[];UI.left=UI.limit;
  UI.heard='';UI.typed='';UI.mark='';UI.voice=false;UI.heardNums=null;UI.pending='next';UI.voiceMiss=false;
  UI.msg=`A ${UI.fight.fish.name} is hooked! Get 2 correct in a row. A wrong answer does not scare it away.${UI.limit?` ${UI.limit} seconds.`:''}`;
  rFish();fishClockStart();
}
function fishPaint(){
  const f=UI.fight;if(!f)return;
  const y=Math.max(8,Math.min(90,f.depth));
  const fish=$('#fightFish'),line=$('#fightLine'),meter=$('#fightMeter'),note=$('#fightNote');
  if(fish)fish.style.top=y+'%';
  if(line)line.style.height=y+'%';
  const pulling=UI.phase==='land'&&(UI.land|0)===1;
  const pct=Math.round(UI.pull||0);
  if(meter)meter.style.width=(pulling?pct:Math.round(100-y))+'%';
  if(note)note.textContent=pulling?`Keep tapping. ${pct}%. The bar slips if you stop.`:`${f.fish.name}. Correct in a row ${UI.streak|0} of 2.${UI.limit?` ${Math.max(0,UI.left|0)}s left.`:''}`;
  const lab=document.getElementById('pullPct');if(lab)lab.textContent=pct+'%';
}
let fishLandTimer=null;
function fishLandHTML(){
  const step=UI.land|0,got=UI.catch,show=UI.phase==='caught'?2:step;
  const pct=Math.round(UI.pull||0);
  const block=(n,title,body)=>show>=n?`<section class="demo-step"><p class="demo-k">${n+1}. ${title}</p>${body}</section>`:'';
  return `<div class="basketdemo landdemo step${show}" aria-live="polite">${block(0,'Hooked',`<p class="demo-note">The hook catches the <b>${esc(got.name)}</b>.</p>`)}${block(1,'Pull up',`<p class="demo-note">Keep tapping the screen. The bar is <b id="pullPct">${pct}%</b>. It slips down if you stop.</p>${step===1?'<button type="button" class="b" data-act="fishPull">Tap to pull</button>':''}`)}${block(2,'Jump',`<p class="demo-note">The <b>${esc(got.name)}</b> jumps out. Hold on while it fights.</p>`)}</div>`;
}
function fishLeapHTML(){
  const got=UI.catch;
  return `<div class="leapshow" aria-label="The ${esc(got.name)} jumps out of the water and struggles in your hands.">
    <div class="leap-pond"><div class="leap-splash"></div><div class="leap-fish">${got.e}</div></div>
    <div class="struggle"><span class="spray">💦</span><span class="hold"><span class="hand">🤲</span><span class="catchfish">${got.e}</span></span><span class="spray r">💦</span></div>
    <p class="leap-cap">It jumps clear. Hold on — it is still fighting.</p>
  </div>`;
}
function fishPullDepth(pull){return 90-Math.max(0,Math.min(100,pull))*0.82}
function fishPullDropAmount(){
  const own=fishOf(cur()).owned||[];
  let drop=(UI.fight&&UI.fight.tug?UI.fight.tug:2)*1.15;
  if(own.includes('net'))drop*=0.55;
  if(own.includes('lantern'))drop*=0.82;
  return drop;
}
function fishPullDisarm(){
  clearInterval(fishPullTimer);fishPullTimer=null;
  window.removeEventListener('pointerdown',fishPullPointer,true);
}
function fishPullArm(){
  fishPullDisarm();
  UI.pullAt=performance.now();
  fishPullTimer=setInterval(fishPullDrop,100);
  window.addEventListener('pointerdown',fishPullPointer,true);
}
function fishPullPointer(ev){
  if(UI.phase!=='land'||(UI.land|0)!==1)return;
  const t=ev.target;
  if(t&&t.closest&&t.closest('button,a,input,textarea,select'))return;
  fishPullTap();
}
function fishPullDrop(){
  if(UI.screen!=='fishing'||UI.phase!=='land'||(UI.land|0)!==1||!UI.fight)return;
  const grace=(fishOf(cur()).owned||[]).includes('bobber')?420:160;
  if(performance.now()-(UI.pullAt||0)<grace)return;
  UI.pull=Math.max(0,(UI.pull||0)-fishPullDropAmount());
  UI.fight.depth=fishPullDepth(UI.pull);
  fishPaint();
}
function fishPullTap(){
  if(UI.phase!=='land'||(UI.land|0)!==1||!UI.fight)return;
  UI.pull=Math.min(100,(UI.pull||0)+fishTapFill(rodOf(fishOf(cur()))));
  UI.pullAt=performance.now();
  UI.fight.depth=fishPullDepth(UI.pull);
  fishPaint();
  const el=document.getElementById('fightFish');
  if(el){el.classList.remove('reel');void el.offsetWidth;el.classList.add('reel')}
  if(window.fishViewKick)fishViewKick(1);
  if(UI.pull>=100)fishPullDone();
}
function fishPullDone(){
  fishPullDisarm();
  fishLandStep(2);
}
function fishLand(q){
  const got=UI.fight.fish;fishStop();
  UI.catch=got;UI.paid=0;UI.landQ=q;UI.land=0;UI.phase='land';
  UI.pull=22;UI.fight.depth=fishPullDepth(22);
  UI.msg=`The hook catches the ${got.name}. Get ready to pull.`;
  rFish();
  clearTimeout(fishLandTimer);
  fishLandTimer=setTimeout(fishPullBegin,matchMedia('(prefers-reduced-motion: reduce)').matches?700:1400);
}
function fishPullBegin(){
  if(UI.screen!=='fishing'||UI.phase!=='land'||!UI.fight||!UI.catch)return;
  UI.land=1;UI.pullAt=performance.now();
  UI.msg=`Keep tapping. The ${UI.catch.name} slips down if you stop.`;
  rFish();fishPullArm();
}
function fishLandStep(step){
  if(UI.screen!=='fishing'||UI.phase!=='land'||!UI.fight||!UI.catch)return;
  if(step!==2)return;
  fishPullDisarm();
  UI.land=2;UI.pull=100;UI.fight.depth=8;
  UI.msg=`The ${UI.catch.name} jumps out. Hold on — it is still fighting.`;
  rFish();
  clearTimeout(fishLandTimer);
  fishLandTimer=setTimeout(fishLandDone,matchMedia('(prefers-reduced-motion: reduce)').matches?1600:3600);
}
function fishLandDone(){
  if(UI.screen!=='fishing'||UI.phase!=='land'||!UI.catch)return;
  const q=UI.landQ,got=UI.catch,fish=fishOf(cur());
  fish.catches[got.id]=(fish.catches[got.id]||0)+1;
  let pay=fish.pond>=2?2:1;
  if((fish.owned||[]).includes('bucket'))pay+=2;
  const given=earnCoins(cur(),pay);save();
  UI.paid=given;UI.phase='caught';UI.land=2;UI.fight=null;
  UI.msg=given?`${q.html} = ${q.answer}. The ${got.name} is yours.`:`${q.html} = ${q.answer}. Nice catch. Today's coins are full, so the fish is the prize.`;
  rFish();
}
function fishEscape(){
  const name=UI.fight&&UI.fight.fish?UI.fight.fish.name:'fish';
  fishStop();UI.phase='lost';UI.fight=null;
  UI.msg=`Time's up. The ${name} gets away.`;
  rFish();
}
function fishStopRec(){if(typeof voiceStop==='function')voiceStop();UI.hearing=false;UI.voicePending=false}
function fishPauseClock(){clearInterval(fishClock);fishClock=null}
function fishClockStart(){
  fishPauseClock();
  if(!UI.limit||UI.phase!=='bite')return;
  fishClock=setInterval(()=>{
    if(UI.screen!=='fishing'||UI.phase!=='bite')return;
    UI.left=(UI.left|0)-1;
    const el=document.getElementById('fishClock');
    if(el)el.textContent=`${Math.max(0,UI.left)}s left`;
    if(UI.left<=0)fishTimeout();
  },1000);
}
function fishStop(){clearTimeout(fishTimer);fishTimer=null;clearTimeout(fishTugTimer);fishTugTimer=null;clearTimeout(fishLandTimer);fishLandTimer=null;fishPullDisarm();fishPauseClock();fishStopRec()}
function fishHold(ok,q){
  fishStopRec();fishPauseClock();
  UI.log=UI.log||[];
  UI.log.push({html:q.html,answer:q.answer,ok:!!ok,heard:UI.heard||'',nums:UI.heardNums?UI.heardNums.slice():[],voice:!!UI.voice,time:false});
  UI.streak=ok?(UI.streak||0)+1:0;
  UI.pending=UI.streak>=2?'land':'next';
  UI.phase='mark';
  const quote=UI.voice&&UI.heard?` Heard “${UI.heard}”.`:'';
  UI.msg=ok?`Correct.${quote} ${q.html} = ${q.answer}. Correct in a row: ${UI.streak} of 2.`:`Wrong.${quote} ${q.html} = ${q.answer}. The fish stays on the line. Correct in a row: 0 of 2.`;
  rFish();
}
function fishTimeout(){
  if(UI.phase!=='bite'||!UI.q||!UI.fight)return;
  fishStopRec();fishPauseClock();
  UI.voice=false;UI.heard="Time's up";UI.heardNums=[];UI.mark='bad';UI.typed='';UI.left=0;
  UI.log=UI.log||[];
  UI.log.push({html:UI.q.html,answer:UI.q.answer,ok:false,heard:"Time's up",nums:[],voice:false,time:true});
  UI.streak=0;UI.pending='lost';UI.phase='mark';
  UI.msg=`Time's up. ${UI.q.html} = ${UI.q.answer}. Look over the questions, then the fish gets away.`;
  rFish();
}
function fishMarkNext(){
  if(UI.phase!=='mark'||!UI.fight)return;
  if(UI.pending==='land'){const last=UI.log[UI.log.length-1];return fishLand({html:last.html,answer:last.answer})}
  if(UI.pending==='lost')return fishEscape();
  UI.phase='bite';UI.q=fishQuestion(cur());
  UI.heard='';UI.typed='';UI.mark='';UI.voice=false;UI.heardNums=null;UI.voiceMiss=false;
  UI.msg=`Correct in a row: ${UI.streak|0} of 2.${UI.limit?` ${UI.left|0}s left.`:''}`;
  rFish();fishClockStart();
}
function fishLive(text){
  const said=(text||'').trim();
  const nums=spokenNumbers(said);
  UI.heard=said;UI.heardNums=nums;
  const h=document.getElementById('heardLive'),n=document.getElementById('heardNum');
  if(h)h.textContent=said?`Heard: ${said}`:'Listening…';
  if(n)n.textContent=nums.length?`Number: ${nums.join(', ')}`:'';
}
function fishJudge(n,said,voice,nums){
  if(UI.phase!=='bite'||!UI.q||!UI.fight||n==null||Number.isNaN(n))return;
  fishStopRec();
  const q=UI.q,ok=n===q.answer;
  UI.typed='';UI.voice=!!voice;UI.heard=said||'';UI.heardNums=voice?(nums&&nums.length?nums:[n]):null;UI.mark=ok?'good':'bad';
  fishHold(ok,q);
}
function fishStartRec(){
  const force=!!UI.voiceForce;UI.voiceForce=false;
  const started=voiceListen({
    force,lang:UI.lang,
    keep:()=>UI.screen==='fishing'&&UI.phase==='bite'&&!!UI.q&&!UI.mark,
    onLive:fishLive,
    onFinal:(text,nums)=>{
      if(UI.phase!=='bite'||!UI.q)return;
      if(!nums.length){UI.hearing=false;UI.voice=true;UI.heard=text;UI.heardNums=[];UI.mark='bad';fishHold(false,UI.q);return}
      const hit=nums.find(n=>n===UI.q.answer);
      fishJudge(hit!=null?hit:nums[nums.length-1],text,true,nums);
    },
    onError:()=>{
      UI.hearing=false;
      if(UI.phase!=='bite'||!voiceBlocked)return;
      UI.voiceMiss=true;UI.msg='The microphone is blocked. Tap the answer instead.';rFish();
    },
    onEnd:()=>{if(UI.phase==='bite'&&!voiceRec)UI.hearing=false}
  });
  if(started)return;
  UI.hearing=false;UI.voiceMiss=true;
  UI.msg='This browser cannot hear yet. Tap the answer instead.';
  rFish();
}
function fishHear(){
  if(UI.phase!=='bite')return;
  fishStopRec();UI.voiceForce=true;UI.voiceMiss=false;UI.hearing=false;rFish();
}
function fishKey(k){
  if(UI.phase!=='bite')return;
  if(k==='back')UI.typed=(UI.typed||'').slice(0,-1);
  else if(k==='sign')UI.typed=(UI.typed||'').startsWith(MINUS)?UI.typed.slice(1):MINUS+(UI.typed||'');
  else if(k==='ok'){if(UI.typed&&UI.typed!==MINUS)fishJudge(Number(String(UI.typed).replace(MINUS,'-')),UI.typed,false);return}
  else if(String(UI.typed||'').replace(MINUS,'').length<4)UI.typed=(UI.typed||'')+k;
  const d=$('#fishDisp');if(d)d.textContent=UI.typed||'';
}
Object.assign(ACT,{
  fishTab:d=>{fishStop();UI.tab=d.id;UI.phase='ready';UI.msg=null;rFish()},
  fishBuild:()=>fishBuild(),fishWide:()=>fishWide(),fishWorms:()=>fishWorms(),
  fishBuy:d=>fishBuy(d.id),fishEquip:d=>fishEquip(d.id),fishCast:()=>fishCast(),
  fishHear:()=>fishHear(),fishLang:()=>{UI.lang=UI.lang==='zh-CN'?'en-US':'zh-CN';if(UI.phase==='bite'){fishStopRec();UI.voiceMiss=false;UI.hearing=false}rFish()},
  fishNext:()=>fishMarkNext(),fishPull:()=>fishPullTap(),
  fishLimit:d=>{
    if(UI.phase==='bite'||UI.phase==='wait'||UI.phase==='strike'||UI.phase==='land'||UI.phase==='mark')return;
    const n=Number(d.id);
    UI.limit=[15,30,45,60,0].includes(n)?n:30;
    UI.left=UI.limit;
    UI.msg=UI.limit?`This fish has ${UI.limit} seconds.`:'This fish has no time limit.';
    rFish();
  },
  fishQuiz:d=>{
    if(UI.phase==='bite'||UI.phase==='wait'||UI.phase==='strike'||UI.phase==='land'||UI.phase==='mark')return;
    if(d.id==='unlocked'&&!fishSources(cur()).length){UI.quiz='times';UI.msg='Clear a trick level first. Questions stay on the times table.';return rFish()}
    UI.quiz=d.id==='unlocked'?'unlocked':'times';
    UI.msg=UI.quiz==='unlocked'?'This cast uses tricks you have cleared.':'This cast uses the 1 to 9 times table.';
    rFish();
  },
  fishKey:d=>fishKey(d.k)
});
startPage({fishing:rFish},()=>({screen:'fishing',tab:'fish',phase:'ready',lang:'zh-CN',quiz:'times',limit:30}));
