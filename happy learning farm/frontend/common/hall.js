/* Leaderboard and live chat. The lamp checks the farm server. The board lists every saved child.
   Rank = levels cleared × first-try accuracy, after five answers. Chat needs a signed-in saved child. */
let LINK='wait';
const HALL={open:false,rows:[],thread:null,lines:[],note:'',unread:0,ws:null,opening:false,ready:false,childId:null};
let HALL_WAIT=1500,HALL_POLL=null;

function linkLampHTML(){
  const label=LINK==='on'?'Server connected':LINK==='off'?'Server not connected':'Checking the server';
  return `<button type="button" class="linklamp ${LINK}" data-act="linkLamp" aria-label="${label}" title="${label}"></button>`;
}
function hallMarkHTML(cls){
  return `<button type="button" class="${cls}" data-act="hallOpen" aria-label="Leaderboard">🏆${HALL.unread?'<i class="halldot" aria-hidden="true"></i>':''}</button>`;
}
function linkSet(next){
  if(LINK===next)return;
  LINK=next;
  document.querySelectorAll('.linklamp').forEach(el=>{
    el.className='linklamp '+LINK;
    const label=LINK==='on'?'Server connected':LINK==='off'?'Server not connected':'Checking the server';
    el.setAttribute('aria-label',label);el.title=label;
  });
}
function linkWatch(){
  const ping=()=>{
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),4000);
    const base=typeof cloudConfig==='function'?cloudConfig().dataBase:'';
    fetch(base+'/api/v1/health',{cache:'no-store',signal:ctrl.signal}).then(res=>{clearTimeout(timer);linkSet(res.ok?'on':'off')}).catch(()=>{clearTimeout(timer);linkSet('off')});
  };
  ping();
  setInterval(ping,12000);
}
function linkLamp(){
  const text=LINK==='on'?'The farm server is connected.':LINK==='off'?'The farm server is not connected.':'Still checking the farm server.';
  if(typeof toast==='function'&&$('#toast'))toast(text,3200);
  else if(typeof notice==='function')notice(text);
}
function hallPaintMarks(){
  document.querySelectorAll('[data-act="hallOpen"]').forEach(btn=>{
    const dot=btn.querySelector('.halldot');
    if(HALL.unread&&!dot)btn.insertAdjacentHTML('beforeend','<i class="halldot" aria-hidden="true"></i>');
    if(!HALL.unread&&dot)dot.remove();
  });
}
function hallMine(){
  try{if(typeof cloudPlayerCode==='function'&&typeof cur==='function')return cloudPlayerCode(cur())||''}catch(e){}
  return '';
}
function hallLook(look){try{if(typeof cloudLookEmoji==='function')return cloudLookEmoji(look)}catch(e){}return '🧒'}
function hallWhen(iso){
  const d=new Date(iso);if(Number.isNaN(d.getTime()))return '';
  return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
}
function hallAcc(row){return row.accuracy==null?'–':row.accuracy+'%'}
function hallEnsure(){
  if($('#hall'))return;
  document.body.insertAdjacentHTML('beforeend',`<div id="hall" class="hallpanel" hidden>
    <button type="button" class="hallback" data-act="hallClose" aria-label="Close the leaderboard"></button>
    <div class="hallbox" data-act="hallHold" role="dialog" aria-modal="true" aria-label="Leaderboard">
      <header class="halltop"><b>Leaderboard</b><button type="button" class="b ghost sm" data-act="hallClose" aria-label="Close">✕</button></header>
      <p class="hallrule">Rank = levels cleared × first-try accuracy. Five answers are needed before accuracy counts. Stars break a tie. Coins stay off this list.</p>
      <div class="hallsplit">
        <div class="hallside"><div class="halllist" id="hallList"></div><button type="button" class="b hallall" data-act="hallHall">Farm chat</button></div>
        <section class="hallchat" id="hallChat" hidden>
          <header class="halltop"><button type="button" class="b ghost sm hallbackbtn" data-act="hallList">←</button><b id="hallTitle">Farm chat</b></header>
          <div class="halllog" id="hallLog" aria-live="polite"></div>
          <form class="hallform" id="hallForm"><input id="hallText" maxlength="180" autocomplete="off" placeholder="Say something kind" aria-label="Message"><button class="b sm" type="submit">Send</button></form>
          <p class="hallfine" id="hallFine"></p>
        </section>
      </div>
    </div>
  </div>`);
  $('#hallForm').addEventListener('submit',e=>{e.preventDefault();hallSend()});
}
function hallOpen(){
  hallEnsure();
  HALL.open=true;HALL.unread=0;hallPaintMarks();
  $('#hall').hidden=false;$('#hall').classList.add('show');
  hallLoad();hallConnect();
  clearInterval(HALL_POLL);HALL_POLL=setInterval(()=>{if(HALL.open)hallLoad(true)},20000);
}
function hallClose(){
  HALL.open=false;HALL.thread=null;HALL.note='';
  const el=$('#hall');if(el){el.classList.remove('show','split');el.hidden=true}
  const chat=$('#hallChat');if(chat)chat.hidden=true;
  clearInterval(HALL_POLL);HALL_POLL=null;
}
function hallHold(){}
function hallList(){HALL.thread=null;HALL.note='';hallPaint()}
function hallMe(){if(typeof toast==='function'&&$('#toast'))toast('This row is your farm.');else if(typeof notice==='function')notice('This row is your farm.')}
function hallRank(n){return n===1?'🥇':n===2?'🥈':n===3?'🥉':String(n)}
function hallPaintList(){
  const el=$('#hallList');if(!el)return;
  const mine=hallMine();
  if(HALL.note&&!HALL.rows.length){el.innerHTML=`<p class="muted">${esc(HALL.note)}</p>`;return}
  if(!HALL.rows.length){el.innerHTML='<p class="muted">No saved farms yet. Sign in and sync a child to appear here.</p>';return}
  el.innerHTML=HALL.rows.map(r=>{
    const me=r.username&&r.username===mine;
    return `<button type="button" class="hallrow${me?' me':''}" data-act="${me?'hallMe':'hallChat'}" data-id="${esc(r.username)}">
      <b class="hallrank">${hallRank(r.rank)}</b><span class="halle">${hallLook(r.look)}</span>
      <span class="hallwho"><b>${esc(r.name||'Farmer')}${r.online?'<i class="ondot" title="Online"></i>':''}</b><small>${esc(r.username||'')} · ${esc(typeof gradeName==='function'?gradeName(r.grade):r.grade||'')}${me?' · You':''}</small></span>
      <span class="hallstat"><b>${r.score}</b><small>${hallAcc(r)} · ${r.cleared} levels · ${r.stars} ★</small></span>
    </button>`;
  }).join('');
}
function hallPaintChat(){
  const box=$('#hallChat'),title=$('#hallTitle'),log=$('#hallLog'),fine=$('#hallFine');
  const root=$('#hall');if(!box||!root)return;
  const on=!!HALL.thread;
  root.classList.toggle('split',on);box.hidden=!on;if(!on)return;
  const row=(HALL.rows||[]).find(r=>r.username===HALL.thread);
  title.textContent=HALL.thread==='hall'?'Farm chat':(row&&row.name)||HALL.thread;
  const mine=hallMine(),signed=typeof cloudIsAccount==='function'&&cloudIsAccount();
  log.innerHTML=(HALL.lines||[]).map(m=>`<div class="hallmsg${m.from===mine?' mine':''}"><span class="halle">${hallLook(m.look)}</span><div><b>${esc(m.name||m.from||'')}</b> <small>${esc(hallWhen(m.at))}</small><p>${esc(m.text||'')}</p></div></div>`).join('')||`<p class="muted">${signed?'No messages yet. Say hello.':'Sign in and open a saved child to chat.'}</p>`;
  log.scrollTop=log.scrollHeight;
  const form=$('#hallForm');
  if(form)form.hidden=!signed;
  fine.textContent=signed?(HALL.ready?'Be kind. A grown-up can read this chat.':'Connecting the chat…'):'Sign in and open a saved child to chat.';
}
function hallPaint(){hallPaintList();hallPaintChat()}
async function hallLoad(quiet){
  try{
    const rows=await cloudFetch(cloudConfig().dataBase+'/api/v1/board',{});
    HALL.rows=Array.isArray(rows)?rows:[];HALL.note='';
  }catch(e){if(!quiet){HALL.rows=[];HALL.note='The leaderboard did not load.'}}
  if(HALL.open)hallPaintList();
}
async function hallOpenThread(id){
  HALL.thread=id;HALL.lines=[];HALL.note='';hallPaint();
  if(!(typeof cloudIsAccount==='function'&&cloudIsAccount()))return;
  const as=cloudRead().childId;
  try{
    const lines=await cloudFetch(cloudConfig().dataBase+'/api/v1/chat/history?as='+encodeURIComponent(as)+'&with='+encodeURIComponent(id),{auth:true});
    if(HALL.thread===id){HALL.lines=Array.isArray(lines)?lines:[];hallPaintChat()}
  }catch(e){if(HALL.thread===id){HALL.lines=[];hallPaintChat();const fine=$('#hallFine');if(fine)fine.textContent=e&&e.message?e.message:'Chat did not load.'}}
}
function hallChat(d){if(d&&d.id)hallOpenThread(d.id)}
function hallHall(){hallOpenThread('hall')}
function hallIncoming(msg){
  if(!msg||msg.type!=='chat')return;
  if(HALL.open&&HALL.thread===msg.room){
    if(!HALL.lines.some(l=>l.id===msg.id))HALL.lines.push(msg);
    hallPaintChat();return;
  }
  if(!HALL.open){HALL.unread++;hallPaintMarks()}
  if(typeof toast==='function')toast((msg.name||'Farmer')+': '+String(msg.text||'').slice(0,80));
}
function hallDrop(){
  HALL.ready=false;HALL.childId=null;
  const ws=HALL.ws;HALL.ws=null;
  if(ws){ws.onclose=null;try{ws.close()}catch(e){}}
}
function hallConnect(){
  if(typeof cloudToken!=='function'||!cloudToken()||!cloudIsAccount()){hallDrop();return}
  if(HALL.ws||HALL.opening)return;
  HALL.opening=true;
  cloudFetch(cloudConfig().dataBase+'/api/v1/chat/ticket',{method:'POST',auth:true}).then(res=>{
    HALL.opening=false;
    if(!res||!res.ticket||!cloudToken())return;
    const u=new URL(cloudConfig().dataBase+'/api/v1/ws');
    u.protocol=u.protocol==='https:'?'wss:':'ws:';
    u.searchParams.set('ticket',res.ticket);
    const ws=new WebSocket(u);
    HALL.ws=ws;
    ws.onopen=()=>{HALL_WAIT=1500;const id=cloudRead().childId;HALL.childId=id;ws.send(JSON.stringify({type:'join',childId:id}))};
    ws.onmessage=ev=>{
      let msg=null;try{msg=JSON.parse(ev.data)}catch(e){return}
      if(!msg)return;
      if(msg.type==='joined'){HALL.ready=true;if(HALL.open)hallPaintChat()}
      else if(msg.type==='chat')hallIncoming(msg);
      else if(msg.type==='presence'){const row=(HALL.rows||[]).find(r=>r.username===msg.username);if(row)row.online=!!msg.online;if(HALL.open)hallPaintList()}
      else if(msg.type==='error'){const fine=$('#hallFine');if(fine&&HALL.open)fine.textContent=msg.message||'Chat did not send.';else if(typeof toast==='function')toast(msg.message||'Chat did not send.')}
    };
    ws.onclose=()=>{if(HALL.ws!==ws)return;HALL.ws=null;HALL.ready=false;setTimeout(()=>hallConnect(),HALL_WAIT);HALL_WAIT=Math.min(15000,HALL_WAIT*2)};
  }).catch(()=>{HALL.opening=false;setTimeout(()=>hallConnect(),HALL_WAIT);HALL_WAIT=Math.min(15000,HALL_WAIT*2)});
}
function hallSend(){
  const input=$('#hallText');if(!input||!HALL.thread)return;
  const text=input.value.trim();if(!text)return;
  if(!HALL.ws||HALL.ws.readyState!==1||!HALL.ready){const fine=$('#hallFine');if(fine)fine.textContent='Chat is still connecting.';return}
  HALL.ws.send(JSON.stringify({type:'send',to:HALL.thread,text}));
  input.value='';
}
document.addEventListener('keydown',e=>{
  if(e.target&&e.target.id==='hallText'&&e.key==='Enter'){e.preventDefault();e.stopPropagation();hallSend()}
  else if(e.key==='Escape'&&HALL.open&&!(typeof DLG!=='undefined'&&DLG)){
    e.preventDefault();e.stopPropagation();
    if(HALL.thread&&window.innerWidth<720)hallList();else hallClose();
  }
},true);
setInterval(()=>{if(HALL.ws&&HALL.ws.readyState===1)HALL.ws.send('{"type":"ping"}')},20000);
setInterval(()=>{if((!HALL.ws||HALL.ws.readyState>1)&&!HALL.opening)hallConnect()},8000);
Object.assign(ACT,{linkLamp,hallOpen,hallClose,hallHold,hallChat,hallHall,hallList,hallMe});
linkWatch();
hallConnect();
