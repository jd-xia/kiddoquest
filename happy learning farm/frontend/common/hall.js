/* Farm Chat. The lamp checks the farm server. The list shows every saved child, with farm level, stars, and coins.
   Chat needs a signed-in saved child. A voice message is a short recording. */
let LINK='wait';
const HALL={open:false,rows:[],thread:null,lines:[],note:'',unread:0,ws:null,opening:false,ready:false,childId:null,lens:{}};
let HALL_WAIT=1500,HALL_POLL=null;

/* Signed out, the lamp stays gray. Signed in, it shows the server check. */
function linkSigned(){try{return typeof cloudToken==='function'&&!!cloudToken()}catch(e){return false}}
function linkShown(){return linkSigned()?LINK:'idle'}
function linkLabel(s){return s==='idle'?'Not signed in':s==='on'?'Server connected':s==='off'?'Server not connected':'Checking the server'}
function linkLampHTML(){
  const s=linkShown(),label=linkLabel(s);
  return `<button type="button" class="linklamp ${s}" data-act="linkLamp" aria-label="${label}" title="${label}"></button>`;
}
function linkPaint(){
  const s=linkShown(),label=linkLabel(s);
  document.querySelectorAll('.linklamp').forEach(el=>{
    if(el.className==='linklamp '+s)return;
    el.className='linklamp '+s;el.setAttribute('aria-label',label);el.title=label;
  });
}
function hallMarkHTML(cls){
  return `<button type="button" class="${cls}" data-act="hallOpen" aria-label="Farm Chat">💬${HALL.unread?'<i class="halldot" aria-hidden="true"></i>':''}</button>`;
}
function linkSet(next){
  if(LINK===next)return;
  LINK=next;
  linkPaint();
}
function linkWatch(){
  const ping=()=>{
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),4000);
    const base=typeof cloudConfig==='function'?cloudConfig().dataBase:'';
    fetch(base+'/api/v1/health',{cache:'no-store',signal:ctrl.signal}).then(res=>{clearTimeout(timer);linkSet(res.ok?'on':'off')}).catch(()=>{clearTimeout(timer);linkSet('off')});
  };
  ping();
  setInterval(ping,12000);
  setInterval(linkPaint,1000);
}
function linkLamp(){
  const text=!linkSigned()?'Sign in to connect to the farm server.':LINK==='on'?'The farm server is connected.':LINK==='off'?'The farm server is not connected.':'Still checking the farm server.';
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
function hallEnsure(){
  if($('#hall'))return;
  document.body.insertAdjacentHTML('beforeend',`<div id="hall" class="hallpanel" hidden>
    <button type="button" class="hallback" data-act="hallClose" aria-label="Close Farm Chat"></button>
    <div class="hallbox" data-act="hallHold" role="dialog" aria-modal="true" aria-label="Farm Chat">
      <header class="halltop"><b>Farm Chat</b><button type="button" class="b ghost sm" data-act="hallClose" aria-label="Close">✕</button></header>
      <p class="hallrule">Tap a farmer to chat. Each row keeps their farm level, stars, and coins.</p>
      <div class="hallsplit">
        <div class="hallside"><div class="halllist" id="hallList"></div><button type="button" class="b hallall" data-act="hallHall">Everyone</button></div>
        <section class="hallchat" id="hallChat" hidden>
          <header class="halltop"><button type="button" class="b ghost sm hallbackbtn" data-act="hallList">←</button><div class="halltitle"><b id="hallTitle">Farm Chat</b><small id="hallPeer"></small></div></header>
          <div class="halllog" id="hallLog" aria-live="polite"></div>
          <form class="hallform" id="hallForm"><button type="button" class="b sm hallmic" data-act="hallMic" aria-label="Record a voice message">🎙️</button><input id="hallText" maxlength="180" autocomplete="off" placeholder="Say something kind" aria-label="Message"><button class="b sm" type="submit">Send</button></form>
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
  hallSilence();
  const el=$('#hall');if(el){el.classList.remove('show','split');el.hidden=true}
  const chat=$('#hallChat');if(chat)chat.hidden=true;
  clearInterval(HALL_POLL);HALL_POLL=null;
}
function hallHold(){}
function hallList(){hallVoiceCancel();HALL.thread=null;HALL.note='';hallPaint()}
function hallMe(){if(typeof toast==='function'&&$('#toast'))toast('This row is your farm.');else if(typeof notice==='function')notice('This row is your farm.')}
function hallStats(r){return `Lv ${r&&r.level||1} · ⭐ ${r&&r.stars||0} · 🪙 ${r&&r.coins||0}`}
function hallPaintList(){
  const el=$('#hallList');if(!el)return;
  const mine=hallMine();
  if(HALL.note&&!HALL.rows.length){el.innerHTML=`<p class="muted">${esc(HALL.note)}</p>`;return}
  if(!HALL.rows.length){el.innerHTML='<p class="muted">No saved farms yet. Sign in and sync a child to appear here.</p>';return}
  el.innerHTML=HALL.rows.map(r=>{
    const me=r.username&&r.username===mine;
    const grade=typeof gradeName==='function'?gradeName(r.grade):r.grade||'';
    return `<button type="button" class="hallrow${me?' me':''}" data-act="${me?'hallMe':'hallChat'}" data-id="${esc(r.username)}">
      <span class="halle">${hallLook(r.look)}</span>
      <span class="hallwho"><b>${esc(r.name||'Farmer')}${r.online?'<i class="ondot" title="Online"></i>':''}</b><small>${esc(r.username||'')}${grade?' · '+esc(grade):''}${me?' · You':''}</small></span>
      <span class="hallstat"><b>Lv ${r.level||1}</b><small>⭐ ${r.stars||0} · 🪙 ${r.coins||0}</small></span>
    </button>`;
  }).join('');
  hallPaintPeer();
}
function hallPaintChat(){
  const box=$('#hallChat'),title=$('#hallTitle'),log=$('#hallLog'),fine=$('#hallFine');
  const root=$('#hall');if(!box||!root)return;
  const on=!!HALL.thread;
  root.classList.toggle('split',on);box.hidden=!on;if(!on)return;
  const row=(HALL.rows||[]).find(r=>r.username===HALL.thread);
  title.textContent=HALL.thread==='hall'?'Everyone':(row&&row.name)||HALL.thread;
  hallPaintPeer();
  const mine=hallMine(),signed=typeof cloudIsAccount==='function'&&cloudIsAccount();
  log.innerHTML=(HALL.lines||[]).map(m=>{
    const body=m.kind==='voice'||m.voice?hallVoiceHTML(m):`<p>${esc(m.text||'')}</p>`;
    return `<div class="hallmsg${m.from===mine?' mine':''}"><span class="halle">${hallLook(m.look)}</span><div><b>${esc(m.name||m.from||'')}</b> <small>${esc(hallWhen(m.at))}</small>${body}</div></div>`;
  }).join('')||`<p class="muted">${signed?'No messages yet. Say hello, or send a voice message.':'Sign in and open a saved child to chat.'}</p>`;
  log.scrollTop=log.scrollHeight;
  (HALL.lines||[]).forEach(m=>{if(m.voice&&!(m.id in HALL.lens))hallVoiceMeasure(m)});
  const form=$('#hallForm');
  if(form)form.hidden=!signed;
  if(!HALL.voiceRec)fine.textContent=signed?(HALL.ready?'Be kind. A grown-up can read this chat. Tap the mic to send a voice message.':'Connecting the chat…'):'Sign in and open a saved child to chat.';
}
function hallPaintPeer(){
  const sub=$('#hallPeer');if(!sub)return;
  const row=(HALL.rows||[]).find(r=>r.username===HALL.thread);
  sub.textContent=row?hallStats(row):'';
}
function hallPaint(){hallPaintList();hallPaintChat()}
async function hallLoad(quiet){
  try{
    const rows=await cloudFetch(cloudConfig().dataBase+'/api/v1/board',{});
    HALL.rows=Array.isArray(rows)?rows:[];HALL.note='';
  }catch(e){if(!quiet){HALL.rows=[];HALL.note='Farm Chat did not load.'}}
  if(HALL.open)hallPaintList();
}
async function hallOpenThread(id){
  hallVoiceCancel();
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
async function hallVoiceFill(msg){
  if(!msg||!(msg.kind==='voice'||msg.voice)||msg.voice||!cloudIsAccount())return msg;
  const as=cloudRead().childId,withId=HALL.thread;
  if(!as||!withId)return msg;
  try{
    const lines=await cloudFetch(cloudConfig().dataBase+'/api/v1/chat/history?as='+encodeURIComponent(as)+'&with='+encodeURIComponent(withId),{auth:true});
    const full=Array.isArray(lines)?lines.find(l=>l.id===msg.id):null;
    if(full&&full.voice)return full;
  }catch(e){}
  return msg;
}
function hallIncoming(msg){
  if(!msg||msg.type!=='chat')return;
  if(msg.kind==='voice'||msg.voice)HALL.voiceWaiting=false;
  if(HALL.open&&HALL.thread===msg.room){
    hallVoiceFill(msg).then(m=>{
      if(!HALL.open||HALL.thread!==msg.room)return;
      if(!HALL.lines.some(l=>l.id===m.id))HALL.lines.push(m);
      hallPaintChat();
      if(m.kind==='voice'&&m.voice)hallFine('Voice message sent.');
    });
    return;
  }
  if(!HALL.open){HALL.unread++;hallPaintMarks()}
  const preview=msg.kind==='voice'||msg.voice?'Voice message':String(msg.text||'').slice(0,80);
  if(typeof toast==='function')toast((msg.name||'Farmer')+': '+preview);
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
      else if(msg.type==='error'){HALL.voiceWaiting=false;const fine=$('#hallFine');if(fine&&HALL.open)fine.textContent=msg.message||'Chat did not send.';else if(typeof toast==='function')toast(msg.message||'Chat did not send.')}
    };
    ws.onclose=()=>{
      if(HALL.ws!==ws)return;
      const waiting=HALL.voiceWaiting;HALL.voiceWaiting=false;
      HALL.ws=null;HALL.ready=false;
      if(waiting&&HALL.open)hallFine('The voice message did not send. Try a shorter one.');
      setTimeout(()=>hallConnect(),HALL_WAIT);HALL_WAIT=Math.min(15000,HALL_WAIT*2);
    };
  }).catch(()=>{HALL.opening=false;setTimeout(()=>hallConnect(),HALL_WAIT);HALL_WAIT=Math.min(15000,HALL_WAIT*2)});
}
function hallSend(){
  if(HALL.voiceRec){hallVoiceFinish(true);return}
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
function hallFine(text){const fine=$('#hallFine');if(fine)fine.textContent=text}
function hallSilence(){
  hallVoiceCancel();
  if(HALL.audio){try{HALL.audio.pause()}catch(e){}HALL.audio=null;HALL.audioId=null}
}
function hallVoiceCancel(){
  HALL.voiceGen=(HALL.voiceGen||0)+1;
  HALL.voiceSend=false;HALL.voiceStopping=false;HALL.voiceCapped=false;HALL.voiceStopPending=false;
  clearTimeout(HALL.voiceTimer);HALL.voiceTimer=null;
  const rec=HALL.voiceRec;HALL.voiceRec=null;
  if(rec){try{rec.ondataavailable=null;rec.onstop=null;if(rec.state!=='inactive')rec.stop()}catch(e){}}
  const stream=HALL.voiceStream;HALL.voiceStream=null;
  if(stream)stream.getTracks().forEach(t=>{try{t.stop()}catch(e){}});
  hallVoicePaint(false);
}
function hallVoiceMime(){
  if(typeof MediaRecorder==='undefined'||!MediaRecorder.isTypeSupported)return '';
  if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))return 'audio/webm;codecs=opus';
  if(MediaRecorder.isTypeSupported('audio/mp4'))return 'audio/mp4';
  if(MediaRecorder.isTypeSupported('audio/webm'))return 'audio/webm';
  return '';
}
function hallVoiceCleanMime(raw){return String(raw||'audio/webm').split(';')[0].trim().toLowerCase()||'audio/webm'}
function hallVoicePaint(on){
  const btn=document.querySelector('#hallForm .hallmic');if(!btn)return;
  btn.classList.toggle('live',!!on);
  btn.textContent=on?'⏹️':'🎙️';
  btn.setAttribute('aria-label',on?'Send the voice message':'Record a voice message');
  if(on)hallFine('Recording… tap the mic or Send. It stops after 15 seconds.');
}
function hallMic(){
  if(!HALL.thread)return;
  if(HALL.voiceRec){hallVoiceFinish(true);return}
  if(!(typeof cloudIsAccount==='function'&&cloudIsAccount())){hallFine('Sign in and open a saved child to chat.');return}
  const as=cloudRead().childId;
  if(!as||!cloudToken()){hallFine('Sign in and open a saved child to chat.');return}
  hallVoiceBegin();
}
function hallVoiceBegin(){
  if(typeof voiceStop==='function')voiceStop();
  if(!navigator.mediaDevices||typeof MediaRecorder==='undefined'){hallFine('This browser cannot record a voice message.');return}
  const gen=(HALL.voiceGen||0)+1;HALL.voiceGen=gen;
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    if(gen!==HALL.voiceGen||!HALL.open||!HALL.thread){stream.getTracks().forEach(t=>t.stop());return}
    const pick=hallVoiceMime();
    let rec;
    try{rec=pick?new MediaRecorder(stream,{mimeType:pick,audioBitsPerSecond:20000}):new MediaRecorder(stream,{audioBitsPerSecond:20000})}
    catch(e){try{rec=new MediaRecorder(stream)}catch(err){stream.getTracks().forEach(t=>t.stop());hallFine('This browser cannot record a voice message.');return}}
    const chunks=[];let size=0;
    HALL.voiceStream=stream;HALL.voiceRec=rec;HALL.voiceSend=false;HALL.voiceStopping=false;HALL.voiceCapped=false;HALL.voiceStopPending=false;
    rec.ondataavailable=ev=>{
      if(!ev.data||!ev.data.size||HALL.voiceCapped)return;
      chunks.push(ev.data);size+=ev.data.size;
      if(size>360000){HALL.voiceCapped=true;hallVoiceFinish(true)}
    };
    rec.onstop=()=>{
      stream.getTracks().forEach(t=>{try{t.stop()}catch(e){}});
      if(HALL.voiceStream===stream)HALL.voiceStream=null;
      const send=HALL.voiceSend;HALL.voiceSend=false;HALL.voiceRec=null;HALL.voiceStopping=false;
      hallVoicePaint(false);
      if(!send||!HALL.thread)return;
      const blob=new Blob(chunks,{type:rec.mimeType||pick||'audio/webm'});
      if(blob.size<400){hallFine('Hold a little longer, then tap the mic to send.');return}
      if(blob.size>400000){hallFine('That voice message is too long. Try a shorter one.');return}
      const secs=Math.max(1,Math.min(15,Math.round((Date.now()-(HALL.voiceT0||Date.now()))/1000)));
      const reader=new FileReader();
      reader.onload=()=>{const s=String(reader.result||''),i=s.indexOf(',');hallSendVoice(i>=0?s.slice(i+1):s,hallVoiceCleanMime(blob.type),secs)};
      reader.onerror=()=>hallFine('That voice message did not send.');
      reader.readAsDataURL(blob);
    };
    try{rec.start(250);HALL.voiceT0=Date.now()}catch(e){hallVoiceCancel();hallFine('This browser cannot record a voice message.');return}
    hallVoicePaint(true);
    if(HALL.voiceStopPending){HALL.voiceStopPending=false;hallVoiceFinish(true);return}
    HALL.voiceTimer=setTimeout(()=>hallVoiceFinish(true),15000);
  }).catch(()=>hallFine('Allow the microphone to send a voice message.'));
}
function hallVoiceFinish(send){
  const rec=HALL.voiceRec;if(!rec)return;
  HALL.voiceSend=!!send;
  clearTimeout(HALL.voiceTimer);HALL.voiceTimer=null;
  if(rec.state==='inactive'){HALL.voiceStopPending=true;return}
  if(HALL.voiceStopping)return;
  HALL.voiceStopping=true;
  try{if(typeof rec.requestData==='function')rec.requestData();rec.stop()}catch(e){hallVoiceCancel();hallFine('That voice message did not send.')}
}
async function hallSendVoice(b64,mime,secs){
  if(!HALL.thread||!b64)return;
  if(!(typeof cloudIsAccount==='function'&&cloudIsAccount())){hallFine('Sign in and open a saved child to chat.');return}
  const c=cloudRead(),as=c.childId;
  if(!as||!cloudToken()){hallFine('Sign in and open a saved child to chat.');return}
  hallFine('Sending the voice message…');
  try{
    const line=await cloudFetch(cloudConfig().dataBase+'/api/v1/chat/voice',{method:'POST',auth:true,timeoutMs:90000,json:{as, to:HALL.thread, voice:b64, mime:mime||'audio/webm'}});
    HALL.voiceWaiting=false;
    if(line&&line.id&&secs)HALL.lens[line.id]=secs;
    if(HALL.open&&HALL.thread){
      if(!HALL.lines.some(l=>l.id===line.id))HALL.lines.push(line);
      hallPaintChat();
    }
    hallFine('Voice message sent.');
  }catch(e){
    HALL.voiceWaiting=false;
    let msg=e&&e.message?e.message:'That voice message did not send.';
    if(e&&e.name==='AbortError')msg='The voice upload took too long. Try a shorter clip or check the network.';
    hallFine(msg);
  }
}
/* Voice bubble like WeChat: ▶ to play, ■ to stop, length in seconds, wider for longer clips. */
function hallVoiceSrc(m){return 'data:'+hallVoiceCleanMime(m.mime||'audio/webm')+';base64,'+m.voice}
function hallVoiceHTML(m){
  const secs=HALL.lens[m.id],playing=HALL.audioId===m.id&&HALL.audio&&!HALL.audio.paused;
  const w=secs?Math.min(220,84+secs*9):96;
  return `<button type="button" class="hallvoice${playing?' playing':''}" data-act="hallPlay" data-id="${esc(m.id)}" style="width:${w}px" aria-label="${playing?'Stop':'Play'} voice message${secs?', '+secs+' seconds':''}"><i class="hvicon" aria-hidden="true"></i><span class="hvwave" aria-hidden="true"><i></i><i></i><i></i></span><span class="hvlen">${secs?secs+'″':''}</span></button>`;
}
function hallVoiceMark(id){
  const m=(HALL.lines||[]).find(l=>l.id===id);if(!m)return;
  const log=$('#hallLog');if(!log)return;
  log.querySelectorAll('.hallvoice').forEach(btn=>{if(btn.dataset.id===String(id))btn.outerHTML=hallVoiceHTML(m)});
}
function hallVoiceMeasure(m){
  HALL.lens[m.id]=0;
  const a=new Audio();a.preload='metadata';
  const done=sec=>{a.onloadedmetadata=a.ontimeupdate=a.onerror=null;if(sec>0&&Number.isFinite(sec)){HALL.lens[m.id]=Math.max(1,Math.round(sec));hallVoiceMark(m.id)}};
  a.onloadedmetadata=()=>{
    if(Number.isFinite(a.duration)&&a.duration>0)return done(a.duration);
    /* Recorder webm has no length in its header. Seeking to the end makes the browser work it out. */
    a.ontimeupdate=()=>{if(Number.isFinite(a.duration)&&a.duration>0){done(a.duration);try{a.currentTime=0}catch(e){}}};
    try{a.currentTime=1e7}catch(e){}
  };
  a.onerror=()=>done(0);
  a.src=hallVoiceSrc(m);
}
function hallPlay(d){
  const m=(HALL.lines||[]).find(l=>l.id===d.id);if(!m||!m.voice)return;
  const prev=HALL.audioId;
  if(HALL.audio&&HALL.audioId===m.id&&!HALL.audio.paused){HALL.audio.pause();HALL.audio=null;HALL.audioId=null;hallVoiceMark(m.id);return}
  if(HALL.audio){try{HALL.audio.pause()}catch(e){}HALL.audio=null;HALL.audioId=null;if(prev)hallVoiceMark(prev)}
  const audio=new Audio(hallVoiceSrc(m));
  HALL.audio=audio;HALL.audioId=m.id;
  const end=()=>{if(HALL.audio!==audio)return;HALL.audio=null;HALL.audioId=null;hallVoiceMark(m.id)};
  audio.onended=end;audio.onerror=end;
  audio.play().then(()=>hallVoiceMark(m.id)).catch(()=>{end();hallFine('This voice message could not play.')});
}
Object.assign(ACT,{linkLamp,hallOpen,hallClose,hallHold,hallChat,hallHall,hallList,hallMe,hallMic,hallPlay});
linkWatch();
hallConnect();
