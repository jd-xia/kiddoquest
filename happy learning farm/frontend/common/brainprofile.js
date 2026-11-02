/* Happy Learning Farm — Brain Boost profiles, shared by the island screen (school-tricks.html) and the grown-ups'
   Brain Boost page (brain-boost-admin.html). Loaded after cloud.js.
   - The module library is files: brain-boost/topics/index.json lists the topics; each topic folder has a
     topic.json (name, island, levels with rules and, for quiz levels, questions) and one folder per level.
   - Each child's Brain Boost Profile says which topics they see, in what order, which level modules each topic
     holds (any module from any topic, P1 revision next to a P5 challenge), and the grown-up's own names, rules and
     questions. It is kept on the farm server; a grown-up saves drafts and publishes, and the child only ever plays
     the published profile. A child with no published profile plays brain-boost/profiles/<grade>.json.
   - Progress belongs to a level module (topic/level, or custom/<id> for a grown-up's own quiz), so moving,
     renaming or taking a level out never loses its stars. */
const BBP_ROOT='brain-boost/';
const BBP_ID=/^[a-z0-9][a-z0-9-]{0,39}$/;
const BBP_HTML=/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\.html$/;   // a level page inside its topic folder, never ../
const BBP_GRADES=['p1','p2','p3','p4','p5','p6'];
const BBP={cat:null,catErr:'',templates:{},states:{},playing:null};
const bbpInt=(v,lo,hi)=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):lo};

/* ---------- the module library and the grade templates ---------- */
async function bbpJson(path){const r=await fetch(path,{cache:'no-cache'});if(!r.ok)throw new Error(path+' '+r.status);return r.json()}
async function bbpCatalog(){
  if(BBP.cat)return BBP.cat;
  try{
    const idx=await bbpJson(BBP_ROOT+'topics/index.json');
    const ids=(idx.topics||[]).filter(id=>BBP_ID.test(id));
    const topics=await Promise.all(ids.map(id=>bbpJson(BBP_ROOT+'topics/'+id+'/topic.json').then(t=>{
      t.id=id;t.levels=(t.levels||[]).filter(l=>l&&BBP_ID.test(l.id)&&BBP_HTML.test(l.html||'')).map(l=>Object.assign(l,{from:id+'/'+l.id,topic:id}));return t
    }).catch(e=>{console.warn('Brain Boost topic did not load:',id,e);return null})));
    BBP.cat=topics.filter(Boolean);BBP.catErr='';
  }catch(e){BBP.cat=[];BBP.catErr='The Brain Boost topics did not load. Check the network and try again.'}
  return BBP.cat;
}
const bbpTopicMod=id=>(BBP.cat||[]).find(t=>t.id===id);
function bbpLevelMod(from){const [t,l]=String(from||'').split('/');const T=bbpTopicMod(t);return T&&T.levels.find(x=>x.id===l)||null}
async function bbpTemplate(grade){
  const g=BBP_GRADES.includes(grade)?grade:'p3';
  if(!BBP.templates[g]){
    try{BBP.templates[g]=bbpNormal(await bbpJson(BBP_ROOT+'profiles/'+g+'.json'))}
    catch(e){await bbpCatalog();BBP.templates[g]=bbpNormal({topics:(BBP.cat||[]).map(t=>({id:t.id,enabled:true,levels:[]}))})}
  }
  return BBP.templates[g];
}
/* Every profile in one shape: levels named by "from", and an empty level list spelled out as every level. */
function bbpNormal(raw){
  const out={topics:[]},used=new Set();
  for(const t of (raw&&raw.topics)||[]){
    if(!t||!BBP_ID.test(t.id||'')||out.topics.some(x=>x.id===t.id))continue;
    const T=Object.assign({},t,{enabled:t.enabled!==false,levels:[]});
    let list=t.levels||[];
    if(!list.length&&!t.custom){const M=bbpTopicMod(t.id);list=M?M.levels.map(l=>({from:l.from})):[]}
    for(const l of list){
      const from=l.from||(l.id?t.id+'/'+l.id:'');
      if(!/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/.test(from)||used.has(from))continue;
      used.add(from);T.levels.push(Object.assign({},l,{from,enabled:l.enabled!==false}));
    }
    out.topics.push(T);
  }
  return out;
}

/* ---------- a child's profile and progress (farm server) ---------- */
const bbpCacheKey=id=>'hmf-bb-state-'+id;
async function bbpLoadState(childId){
  try{
    const s=await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(childId)+'/brain-boost',{auth:true});
    BBP.states[childId]=s;BBP.stateErr='';try{localStorage.setItem(bbpCacheKey(childId),JSON.stringify(s))}catch(e){}
  }catch(e){
    if(e.status===401&&typeof cloudNeedSignIn==='function')cloudNeedSignIn();
    let s=null;try{s=JSON.parse(localStorage.getItem(bbpCacheKey(childId))||'null')}catch(x){}
    BBP.states[childId]=s||{profile:null,draft:null,progress:[]};
    BBP.stateErr='The farm server did not answer, so this shows the last progress this device saw.';
    if(e.status&&e.status!==401&&e.status<500)throw e;
  }
  return BBP.states[childId];
}
/* The profile the child plays: the published one, else their grade's template. */
async function bbpPlayed(childId,grade){
  await bbpCatalog();
  const s=BBP.states[childId]||await bbpLoadState(childId).catch(()=>BBP.states[childId]);
  return s&&s.profile?bbpNormal(s.profile):await bbpTemplate(grade);
}
/* Resolves a profile against the library: only switched-on topics and levels, with the grown-up's changes. */
function bbpResolve(profile,opts){
  const all=opts&&opts.all,out=[];
  for(const t of (profile&&profile.topics)||[]){
    if(!all&&t.enabled===false)continue;
    const M=bbpTopicMod(t.id);if(!M&&!t.custom)continue;
    const levels=[];
    for(const l of t.levels||[]){
      if(!all&&l.enabled===false)continue;
      const R=bbpLevel(l);if(R)levels.push(R);
    }
    out.push({id:t.id,custom:!!t.custom,enabled:t.enabled!==false,name:t.name||(M&&M.name)||'My topic',description:t.description||(M&&M.description)||'',
      icon:t.icon||(M&&M.icon)||'⭐',color:t.color||(M&&M.color)||'#8B5CF6',npc:(M&&M.npc)||'Professor Hoot',island:(M&&M.island)||'',
      openLevels:M?M.openLevels||1:1,levels});
  }
  return out;
}
/* One level as it is played: the module, with the grown-up's name, rules and questions on top. */
function bbpLevel(l){
  const [src,id]=l.from.split('/'),custom=src==='custom',M=custom?null:bbpLevelMod(l.from);
  if(!custom&&!M)return null;
  const quiz=custom||(M&&M.kind==='quiz');
  return {from:l.from,topic:src,level:id,custom,enabled:l.enabled!==false,kind:quiz?'quiz':'game',legacy:M&&M.legacy||null,grade:M&&M.grade||'',
    name:l.name||(M&&M.name)||'My quiz',description:l.description||(M&&M.description)||'',difficulty:bbpInt(l.difficulty||(M&&M.difficulty)||2,1,5),
    rules:Object.assign({},M&&M.rules||{},l.rules||{}),questions:quiz?(l.questions||(M&&M.questions)||[]):null,
    url:custom?BBP_ROOT+'kit/quiz/index.html':BBP_ROOT+'topics/'+src+'/'+M.html};
}
/* Best stars: the farm server's record, or the farm's own record from the first Calculation Tricks levels. */
function bbpStars(childId,L,p){
  const s=BBP.states[childId],row=((s&&s.progress)||[]).find(r=>r.topic===L.topic&&r.level===L.level);
  const old=L.legacy&&p&&p.lv&&p.lv[L.legacy];
  return Math.max(row?row.stars:0,old?old.stars||0:0);
}
const bbpOpen=(childId,T,i,p)=>i<Math.max(1,T.openLevels||1)||bbpStars(childId,T.levels[i-1],p)>0;
const bbpTopicStars=(childId,T,p)=>T.levels.reduce((a,L)=>a+bbpStars(childId,L,p),0);

/* ---------- playing a level (the child's own farm is open) ---------- */
/* The level page fills the screen in a frame over the island. When it ends, coins go into the farm like every
   farm change and the result goes to the farm server. o.onClose(back) runs when the child leaves the result. */
function bbpPlay(T,i,o){
  const L=T.levels[i],childId=cloudRead().childId;if(!L||!childId)return;
  if(typeof unmountStage==='function')unmountStage();
  const P=BBP.playing={T,i,L,o:o||{},childId,attempt:cloudId(),ready:false,timer:null,preview:false};
  let el=document.getElementById('bbplay');
  if(!el){el=document.createElement('div');el.id='bbplay';el.className='bbplay';document.body.appendChild(el)}
  el.innerHTML=`<iframe id="bbframe" title="${esc(L.name)}" src="${esc(L.url)}"></iframe>
    <div class="bbstuck" id="bbstuck" hidden><p>This level did not open.</p><button class="b" data-act="bbpClose">Back to the island</button></div>`;
  document.body.classList.add('bbplaying');
  P.timer=setTimeout(()=>{const s=document.getElementById('bbstuck');if(BBP.playing===P&&!P.ready&&s)s.hidden=false},10000);
}
function bbpClose(back){
  const P=BBP.playing;BBP.playing=null;if(P)clearTimeout(P.timer);
  const el=document.getElementById('bbplay');if(el)el.remove();document.body.classList.remove('bbplaying');
  if(P&&P.o.onClose)P.o.onClose(back||'map',P.i);
}
/* What a level page is told when it starts. Preview pages get the same, marked as a preview. */
function bbpStartMsg(T,L,child,preview){
  return {type:'bb:start',preview:!!preview,child,topic:{id:T.id,name:T.name,icon:T.icon},
    level:{id:L.from,name:L.name,description:L.description,difficulty:L.difficulty,rules:L.rules||{},questions:L.questions||undefined}};
}
window.addEventListener('message',e=>{
  const P=BBP.playing,f=document.getElementById('bbframe');
  if(!P||!f||e.source!==f.contentWindow||e.origin!==location.origin)return;
  const m=e.data||{},p=cur();
  if(m.type==='bb:ready'){P.ready=true;f.contentWindow.postMessage(bbpStartMsg(P.T,P.L,{name:p.name,grade:gradeOf(p),look:p.look}),location.origin)}
  else if(m.type==='bb:finish')bbpDone(m,false);
  else if(m.type==='bb:quit')bbpDone(m,true);
});
function bbpDone(m,quit){
  const P=BBP.playing;if(!P||P.done)return;P.done=true;clearTimeout(P.timer);
  const {T,L}=P,total=bbpInt(m.total,0,500),correct=Math.min(bbpInt(m.correct,0,500),total),answered=bbpInt(m.answered==null?total:m.answered,0,500),secs=bbpInt(m.secs,0,36000);
  const cleared=!quit&&!!m.cleared,stars=cleared?bbpInt(m.stars,1,3):0;
  if(quit&&!answered)return bbpClose('map');   // left before answering anything: no record
  const p=cur(),key=L.legacy||L.from.replace('/',':'),day=dailyOf(p);
  let levelBonus=false;
  if(cleared&&!day.levels[key]){day.levels[key]=true;levelBonus=true;if(L.legacy&&taskStep('lv:'+L.legacy))farmOf(p).xp+=TASK_XP}   // first finish of this level today
  const base=L.legacy&&m.coins!=null?bbpInt(m.coins,0,COIN_DAY_MAX):correct*COIN_RIGHT;   // the basket levels pay a coin per basket instead
  const want=base+(levelBonus?COIN_LEVEL:0),gems=earnCoins(p,want);
  p.time=(p.time||0)+secs;todayLog(p,'answered',answered);todayLog(p,'right',correct);if(cleared)todayLog(p,'levels');
  if(L.legacy){   // the Progress Board and Today's Tasks still read the farm's own level record
    const r=p.lv[L.legacy]||(p.lv[L.legacy]={stars:0,plays:0,clears:0,qs:0,first:0,last:0});
    r.plays++;r.qs+=answered;r.first+=correct;r.last=Date.now();if(cleared){r.clears++;r.stars=Math.max(r.stars,stars)}
    p.sessions.unshift({t:Date.now(),d:'tricks',lv:L.legacy,stars,qs:answered,first:correct,secs,ok:cleared});p.sessions=p.sessions.slice(0,60);
  }
  save();
  bbpRemember(P.childId,L,cleared,stars,correct,total);
  bbpQueue({attemptId:P.attempt,topic:L.topic,level:L.level,cleared,stars,correct,total,secs});
  if(quit){bbpClose('map');if(gems)toast(`+${gems} 🪙 for the answers you got right.`);return}
  bbpResult(P,{cleared,stars,correct,total,gems,levelBonus,capped:gems<want});
}
function bbpResult(P,r){
  const el=document.getElementById('bbplay');if(!el)return;
  const next=P.T.levels[P.i+1],hasNext=r.cleared&&next&&bbpOpen(P.childId,P.T,P.i+1,cur());
  el.innerHTML=`<div class="bbresult"><div class="rcard">
    <div class="rtitle">${r.cleared?'Level cleared!':'Try again'}</div><p class="rsub">${esc(P.L.name)}</p>
    ${r.cleared?`<div class="bigstars" aria-label="${r.stars} stars">${[0,1,2].map(k=>`<span class="pop" style="animation-delay:${200+k*220}ms">${k<r.stars?'⭐':'☆'}</span>`).join('')}</div>`:''}
    <p>${r.correct} of ${r.total} right first time.</p>
    ${r.gems?`<div class="rcoins pop" style="animation-delay:900ms">+${r.gems} 🪙</div><p class="rsub">${r.levelBonus?`Includes +${COIN_LEVEL} for finishing this level today! `:''}Spend your coins on the farm.</p>`:''}
    ${r.capped?`<p class="rsub">🪙 Today's coins are full (${COIN_DAY_MAX})! Stars still count.</p>`:''}
    <p class="muted" id="bbsaved">${bbpQueueRead(P.childId).length?'Saving your progress…':'Saved on the farm server.'}</p>
    <div class="btns" style="justify-content:center">
     ${hasNext?'<button class="b" data-act="bbpAgain" data-d="1">Next level ▸</button>':''}
     <button class="b ${hasNext?'ghost':''}" data-act="bbpAgain" data-d="0">${r.cleared?'Play again':'Try again'}</button>
     <button class="b ghost" data-act="bbpClose">Level map</button><button class="b ghost" data-act="bbpClose" data-back="islands">🏝️ Islands</button>
    </div></div></div>`;
  const b=el.querySelector('.btns .b');if(b)b.focus({preventScroll:true});
}
function bbpAgain(d){const P=BBP.playing;if(!P)return;const i=P.i+(+d||0),T=P.T,o=P.o;BBP.playing=null;bbpPlay(T,i,o)}
/* Shows the result at once; the farm server's answer replaces it when it arrives. */
function bbpRemember(childId,L,cleared,stars,correct,total){
  const s=BBP.states[childId]||(BBP.states[childId]={profile:null,progress:[]}),list=s.progress||(s.progress=[]);
  let row=list.find(r=>r.topic===L.topic&&r.level===L.level);
  if(!row){row={topic:L.topic,level:L.level,stars:0,bestCorrect:0,bestTotal:0,plays:0,clears:0};list.push(row)}
  row.plays++;if(cleared)row.clears++;row.stars=Math.max(row.stars,stars);
  if(total&&(!row.bestTotal||correct/total>row.bestCorrect/row.bestTotal)){row.bestCorrect=correct;row.bestTotal=total}
}

/* ---------- results waiting for the farm server (hmf-bb-queue-<child>) ---------- */
const bbpQueueKey=id=>'hmf-bb-queue-'+id;
function bbpQueueRead(id){id=id||cloudRead().childId;if(!id)return [];try{const q=JSON.parse(localStorage.getItem(bbpQueueKey(id))||'[]');return Array.isArray(q)?q:[]}catch(e){return []}}
function bbpQueueWrite(id,q){try{localStorage.setItem(bbpQueueKey(id),JSON.stringify(q.slice(-200)))}catch(e){}}
function bbpQueue(r){const id=cloudRead().childId;const q=bbpQueueRead(id);q.push(r);bbpQueueWrite(id,q);bbpFlush()}
let bbpFlushing=null;
/* Sends waiting results one by one. Resolves true when nothing is left to send. */
function bbpFlush(){
  if(bbpFlushing)return bbpFlushing;
  const id=cloudIsAccount()?cloudRead().childId:null;if(!id||!cloudToken())return Promise.resolve(!bbpQueueRead(id).length);
  const run=(async()=>{
    for(let q=bbpQueueRead(id);q.length&&cloudRead().childId===id;q=bbpQueueRead(id)){
      const r=q[0];
      try{
        const res=await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id)+'/brain-boost/results',{method:'POST',auth:true,json:r,timeoutMs:10000});
        const row=res&&res.progress,s=BBP.states[id];
        if(row&&s){const list=s.progress||(s.progress=[]),k=list.findIndex(x=>x.topic===row.topic&&x.level===row.level);if(k>=0)list[k]=row;else list.push(row)}
      }catch(e){
        if(e.status===401){if(typeof cloudNeedSignIn==='function')cloudNeedSignIn();break}
        if(!(e.status===400||e.status===404||e.status===422))break;   // offline or busy: try again later. Refused: the server will never take it.
        console.warn('Brain Boost result refused:',r,e);
      }
      bbpQueueWrite(id,bbpQueueRead(id).filter(x=>x.attemptId!==r.attemptId));
    }
    const left=bbpQueueRead(id).length,s=document.getElementById('bbsaved');
    if(s)s.textContent=left?'Your progress is kept on this device and is sent when the farm server answers.':'Saved on the farm server.';
    try{if(!left&&BBP.states[id])localStorage.setItem(bbpCacheKey(id),JSON.stringify(BBP.states[id]))}catch(e){}
    return !left;
  })();
  bbpFlushing=run;
  run.catch(()=>{}).then(()=>{if(bbpFlushing===run)bbpFlushing=null});   // cleared after it is set, even when nothing had to wait
  return run;
}
setInterval(()=>{if(bbpQueueRead().length)bbpFlush()},20000);
/* Leaving the page waits (a few seconds at most) for results still on their way. */
{const keepNav=navTo;navTo=function(file,nav){
  if(!bbpQueueRead().length||!cloudToken())return keepNav(file,nav);
  Promise.race([bbpFlush(),new Promise(r=>setTimeout(r,3000))]).then(()=>keepNav(file,nav));
}}
Object.assign(ACT,{
  bbpClose:d=>bbpClose(d&&d.back),
  bbpAgain:d=>bbpAgain(d&&d.d)
});
