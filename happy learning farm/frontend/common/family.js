/* Happy Learning Farm — family: the main account (主账号) and the kids' play time. Loaded right after cloud.js.
   One Google account is one family. The parent marks one farm as the main farm: it has no time limit and
   only the parent PIN opens it. The parent sets each child's minutes a day and can add time today.
   While an account farm is on screen, a heartbeat every 30 seconds tells the farm server how long it was
   played (FamilyController); the server keeps the count, so reloading or another device does not reset it.
   5 minutes before the end a warning shows; at 0 the farm stops until tomorrow or until the parent adds time. */
const FAM={pin:null,up:false,warned:'',last:null,kids:null};
const FAM_MINUTES=[0,15,20,30,45,60,90,120];
const FAM_BEAT=30000;
function famDay(){const d=new Date(),z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())}
const famApi=p=>cloudConfig().dataBase+'/api/v1'+p;
const famMins=s=>Math.max(0,Math.ceil((s||0)/60));
const famKid=id=>(cloudKidList||[]).find(k=>k&&k.id===id);

/* ---------- play time ---------- */
async function famBeat(){
  if(!cloudIsAccount()||!cloudToken()||cloudScreenOff||document.hidden||cloudScreenFarm()!==cloudRead().childId)return;
  const now=Date.now(),seconds=FAM.last&&!FAM.up?Math.min(60,Math.round((now-FAM.last)/1000)):0;FAM.last=now;
  const id=cloudRead().childId;
  try{
    const t=await cloudFetch(famApi('/children/'+encodeURIComponent(id)+'/play'),{method:'POST',auth:true,json:{day:famDay(),seconds,screen:cloudScreenId()},timeoutMs:8000});
    if(cloudRead().childId===id)famShow(t);
  }catch(e){}   // an older farm server has no play time: play on as before
}
/* The time-left badge a child always sees on top of every page. Hidden for the main farm and with no limit. */
function famBadge(){
  let b=document.getElementById('famleft');
  const left=FAM.left==null?null:Math.max(0,FAM.left-(FAM.leftAt&&!document.hidden?Math.round((Date.now()-FAM.leftAt)/1000):0));
  if(left==null||!cloudIsAccount()){if(b)b.hidden=true;return}
  if(!b){b=document.createElement('div');b.id='famleft';b.className='famleft';b.setAttribute('role','status');document.body.appendChild(b)}
  const m=famMins(left);
  b.hidden=false;b.classList.toggle('low',left<=300);
  b.textContent=left<=0?'⏰ Time is up':`⏰ ${m} min left today`;
}
setInterval(famBadge,10000);
function famShow(t){
  FAM.left=t&&t.leftSeconds!=null?t.leftSeconds:null;FAM.leftAt=Date.now();famBadge();
  if(!t||t.leftSeconds==null){if(FAM.up)famResume();return}
  const left=t.leftSeconds;
  if(left<=0){famTimeUp(t);return}
  if(FAM.up)famResume();
  const key=t.day+'|'+(t.limitMinutes+t.bonusMinutes);
  /* while a friend's dialog is open, the warning waits for the next count */
  if(left<=300&&FAM.warned!==key&&!DLG){FAM.warned=key;cloudTell(`${famMins(left)} minute${famMins(left)===1?'':'s'} left today. Finish what you are doing and save your farm.`)}
}
function famTimeUp(t){
  if(FAM.up)return;FAM.up=true;t=t||FAM.t||{usedSeconds:0};FAM.t=t;
  DLG=null;   // time-up replaces any open friend's dialog
  const who=typeof cur==='function'&&cur()?cur().name:'This farm';
  const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Time is up for today ⏰</div>
    <p>${esc(who)} played ${famMins(t.usedSeconds)} minutes today. Great work! The farm opens again tomorrow.</p>
    <p class="muted">Your farm is saved. A parent can add more time with the parent PIN.</p>
    <div class="dlg-btns"><button class="b ghost sm" data-act="famAddAsk">👪 Parent: add time</button></div></div></div>`;
}
function famResume(){FAM.up=false;FAM.last=Date.now();const keep=FAM.pin;cloudClose();FAM.pin=keep}
/* While time is up, nothing closes the time-up screen except more time. */
{const keep=cloudClose;cloudClose=function(){if(FAM.up)return;return keep.apply(this,arguments)}}
/* The overlay stops taps; this stops the walking keys too, while time is up or another screen has the farm. */
document.addEventListener('keydown',e=>{
  if(!(FAM.up||cloudScreenOff)||(e.target&&e.target.id&&e.target.id.startsWith('fampin')))return;
  e.stopImmediatePropagation();if(typeof KEYS!=='undefined')KEYS.clear();
},true);
setInterval(famBeat,FAM_BEAT);
document.addEventListener('visibilitychange',()=>{FAM.last=document.hidden?null:Date.now()});

/* ---------- parent PIN ---------- */
function famPinBox(title,text,act,extra){
  const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">${esc(title)}</div><p>${esc(text)}</p>
    <input id="fampin" class="pininput" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••">
    ${extra||''}<p class="muted" id="famerr"></p>
    <div class="dlg-btns"><button class="b sm" data-act="${act}">OK</button><button class="b ghost sm" data-act="famCancel">Cancel</button></div></div></div>`;
  const i=$('#fampin');if(i){i.focus();i.addEventListener('keydown',e=>{if(e.key==='Enter'){const b=el.querySelector(`[data-act="${act}"]`);if(b)b.click()}})}
}
function famErr(t){const e=$('#famerr');if(e)e.textContent=t;const i=$('#fampin');if(i){i.value='';i.focus()}}
const famPinOk=v=>/^\d{4}$/.test(v||'');
function famPinMsg(e){return e.code==='pin_wait'?'Too many wrong PINs. Wait a minute, then try again.':e.code==='wrong_pin'?'That PIN is not right.':e.message||'That did not work. Try again.'}
async function famUnlock(after){
  const pin=($('#fampin')||{}).value;if(!famPinOk(pin)){famErr('The PIN is 4 digits.');return}
  try{await cloudFetch(famApi('/family/unlock'),{method:'POST',auth:true,json:{pin},timeoutMs:8000});FAM.pin=pin;after()}
  catch(e){
    if(e.code==='pin_missing'){FAM.after=after;famPinBox('Set a parent PIN','There is no parent PIN yet. Choose 4 digits only a parent knows.','famPinNew',FAM_AGAIN);return}
    famErr(famPinMsg(e));
  }
}
const FAM_AGAIN='<input id="fampin2" class="pininput" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="again">';
function famCancel(){FAM.pin=null;FAM.gate=null;if(FAM.up){FAM.up=false;famTimeUp();return}cloudClose()}

/* ---------- parent settings ---------- */
async function famOpen(){
  if(!cloudToken()){cloudLogin();return}
  try{
    const f=await cloudFetch(famApi('/family?day='+famDay()),{auth:true,timeoutMs:8000});
    if(!f.pinSet)famPinBox('Set a parent PIN','Choose 4 digits only a parent knows. It opens the main farm and the kids\' play time.','famPinNew','<input id="fampin2" class="pininput" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="again">');
    else if(FAM.pin)famDraw(f);
    else famPinBox('Parent','Enter the parent PIN.','famUnlockSettings');
  }catch(e){cloudTell('The parent settings could not be loaded. Nothing was changed.')}
}
async function famPinNew(){
  const pin=($('#fampin')||{}).value,again=($('#fampin2')||{}).value;
  if(!famPinOk(pin)){famErr('The PIN is 4 digits.');return}
  if(pin!==again){famErr('The two PINs are not the same.');return}
  try{const f=await cloudFetch(famApi('/family/pin?day='+famDay()),{method:'POST',auth:true,json:{pin},timeoutMs:8000});FAM.pin=pin;
    const after=FAM.after;FAM.after=null;if(after)after();else famDraw(f)}   // set while opening the main farm: carry on opening it
  catch(e){famErr(famPinMsg(e))}
}
function famDraw(f){
  FAM.kids=f.kids||[];
  const el=$('#dlg');if(!el)return;el.className='show';
  const rows=FAM.kids.map(k=>{
    const choices=FAM_MINUTES.includes(k.dailyMinutes||0)?FAM_MINUTES:FAM_MINUTES.concat([k.dailyMinutes]).sort((a,b)=>a-b);
    const opts=choices.map(m=>`<option value="${m}" ${(k.dailyMinutes||0)===m?'selected':''}>${m?m+' min a day':'No limit'}</option>`).join('');
    const b=k.bonusMinutes||0;
    const today=`${famMins(k.usedSeconds)} min played today${b>0?` · ${b} min added`:b<0?` · ${-b} min taken away`:''}`;
    return `<div class="famrow"><div class="nm">${cloudLookEmoji(k.look)} ${esc(k.displayName)} ${k.username?`<span class="pcode">${esc(k.username)}</span>`:''}</div>
      ${k.main?'<p class="muted">⭐ Main account · no time limit · opens with the PIN</p>':`<div class="row"><select data-kid="${esc(k.id)}" class="famsel" aria-label="Minutes a day for ${esc(k.displayName)}">${opts}</select>
      <button class="b ghost sm" data-act="famMain" data-id="${esc(k.id)}">Make main</button></div>
      ${k.dailyMinutes?`<div class="row famtoday">Today:
        <button class="b ghost sm" data-act="famAdd" data-id="${esc(k.id)}" data-sign="-1" aria-label="Take minutes away from ${esc(k.displayName)} today">−</button>
        <input type="number" class="famn" data-kid="${esc(k.id)}" min="1" max="600" step="1" value="5" aria-label="Minutes">
        <button class="b ghost sm" data-act="famAdd" data-id="${esc(k.id)}" data-sign="1" aria-label="Add minutes for ${esc(k.displayName)} today">+</button> min</div>`:''}`}
      <p class="muted">${today}</p>
      <div class="row famtoday">🪙 <b>${k.coins==null?'–':esc(String(k.coins))}</b> coins
        <button class="b ghost sm" data-act="famCoins" data-id="${esc(k.id)}" data-sign="-1" aria-label="Take coins away from ${esc(k.displayName)}">−</button>
        <input type="number" class="famc" data-kid="${esc(k.id)}" min="1" max="100000" step="1" value="10" aria-label="Coins for ${esc(k.displayName)}">
        <button class="b ghost sm" data-act="famCoins" data-id="${esc(k.id)}" data-sign="1" aria-label="Give ${esc(k.displayName)} coins">+</button></div></div>`}).join('')||'<p class="muted">No farms on this account yet.</p>';
  el.innerHTML=`<div class="dlg famdlg"><div style="flex:1"><div class="dlg-name">👪 Parent settings</div>
    <p class="muted">The main account has no time limit. Each child plays up to their minutes a day; a warning shows 5 minutes before the end. A new day starts at midnight.</p>
    ${rows}<p class="syncwarn" id="famerr" aria-live="polite" style="display:none"></p>
    <div class="dlg-btns"><button class="b ghost sm" data-act="famBrain">🧠 Brain Boost for each child</button><button class="b ghost sm" data-act="famPinChangeAsk">Change PIN</button><button class="b sm" data-act="famDone">Done</button></div></div></div>`;
  el.querySelectorAll('.famsel').forEach(s=>s.addEventListener('change',()=>famWrite(s.dataset.kid,{dailyMinutes:Number(s.value)})));
}
async function famWrite(id,fields){
  if(!FAM.pin){famOpen();return}
  try{
    const f=await cloudFetch(famApi('/family/kids/'+encodeURIComponent(id)),{method:'POST',auth:true,json:Object.assign({pin:FAM.pin,day:famDay()},fields),timeoutMs:8000});
    famDraw(f);cloudLoadKidsNow();
    if(id===cloudRead().childId)famBeat();   // the farm on screen gets its new time at once
  }catch(e){FAM.pin=null;cloudTell(famPinMsg(e))}
}
/* The minutes box: a whole number from 1 to 600; anything else is pointed out, not guessed. */
function famN(input){
  const n=Number(input&&input.value);
  if(Number.isInteger(n)&&n>=1&&n<=600)return n;
  if(input){input.focus();input.select&&input.select()}
  const e=$('#famerr');if(e){e.textContent='Minutes must be a whole number from 1 to 600.';e.style.display=''}
  return 0;
}
/* Coins: the parent gives some (+) or takes some away (−) on the farm server; never below 0. The farm on this
   screen sends its last change first and then takes the server's copy, so the new total shows at once. */
async function famCoins(id,sign){
  if(!FAM.pin){famOpen();return}
  const input=$(`.famc[data-kid="${id}"]`),n=Number(input&&input.value),e=$('#famerr');
  if(!(Number.isInteger(n)&&n>=1&&n<=100000)){if(e){e.textContent='Coins must be a whole number from 1 to 100000.';e.style.display=''}if(input)input.focus();return}
  const here=cloudIsAccount()&&cloudRead().childId===id;
  if(here&&!(await cloudFlush(6000))){if(e){e.textContent='This farm has a change that is not on the farm server yet. Try again in a moment.';e.style.display=''}return}
  try{
    const f=await cloudFetch(famApi('/family/kids/'+encodeURIComponent(id)+'/coins'),{method:'POST',auth:true,json:{pin:FAM.pin,day:famDay(),add:n*sign},timeoutMs:8000});
    famDraw(f);cloudLoadKidsNow();
    if(here)await cloudCheckServer();   // takes the server's copy with the new coins
    const k=(f.kids||[]).find(x=>x.id===id);if(k)toast(`${k.displayName} has ${k.coins} coins now.`);
  }catch(err){if(err.code==='wrong_pin'||err.code==='pin_wait'){FAM.pin=null;cloudTell(famPinMsg(err));return}if(e){e.textContent=err.message||'The coins were not changed. Try again.';e.style.display=''}}
}
function cloudLoadKidsNow(){cloudKidStamp=0;cloudLoadKids()}
function famDone(){FAM.pin=null;cloudClose();if(UI&&UI.screen==='players'&&typeof rPlayers==='function')rPlayers()}
async function famPinChange(){
  const oldPin=FAM.pin,pin=($('#fampin')||{}).value,again=($('#fampin2')||{}).value;
  if(!famPinOk(pin)){famErr('The PIN is 4 digits.');return}
  if(pin!==again){famErr('The two PINs are not the same.');return}
  try{const f=await cloudFetch(famApi('/family/pin?day='+famDay()),{method:'POST',auth:true,json:{oldPin,pin},timeoutMs:8000});FAM.pin=pin;famDraw(f)}
  catch(e){famErr(famPinMsg(e))}
}
/* Time is up: the parent adds 15 minutes for the farm on screen. */
function famAddAsk(){famPinBox('Add time','Enter the parent PIN and how many minutes to add for today.','famAddNow',
  '<label class="row famtoday">Add <input id="fampinmin" type="number" class="famn" min="1" max="600" step="1" value="15" aria-label="Minutes to add"> min</label>')}
function famAddNow(){const n=famN($('#fampinmin'));if(!n)return;famUnlock(async()=>{
  const id=cloudRead().childId;
  try{await cloudFetch(famApi('/family/kids/'+encodeURIComponent(id)),{method:'POST',auth:true,json:{pin:FAM.pin,day:famDay(),addMinutes:n},timeoutMs:8000})}catch(e){}
  FAM.pin=null;FAM.up=false;famTimeUp();famBeat();   // the next count closes the time-up screen if time was added
})}

/* ---------- the main farm opens only with the PIN ---------- */
{const keepSwitch=cloudSwitch,keepAsk=cloudAskOpen;
  const gate=(keep,id)=>{const k=famKid(id);if(!k||!k.main||FAM.pin||cloudIsOpen(id))return keep(id);
    cloudOpenLog('main account: asking for the parent PIN');
    FAM.gate=()=>keep(id);famPinBox('Main account',`${k.displayName} is the main account. Enter the parent PIN to open it.`,'famGateOk')};
  cloudSwitch=id=>gate(keepSwitch,id);cloudAskOpen=id=>gate(keepAsk,id)}
function famGateOk(){famUnlock(()=>{const go=FAM.gate;FAM.gate=null;cloudClose();FAM.pin=null;if(go)go()})}

Object.assign(ACT,{
  famOpen:()=>famOpen(),famPinNew:()=>famPinNew(),famUnlockSettings:()=>famUnlock(famOpen),famCancel:()=>famCancel(),
  famAdd:d=>{const n=famN($(`.famn[data-kid="${d.id}"]`));if(n)famWrite(d.id,{addMinutes:n*Number(d.sign||1)})},famMain:d=>famWrite(d.id,{main:true}),famDone:()=>famDone(),
  famPinChangeAsk:()=>famPinBox('Change PIN','Choose a new 4-digit parent PIN.','famPinChange','<input id="fampin2" class="pininput" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="again">'),
  /* The PIN was just entered here, so the Brain Boost page does not ask again: it is handed over in this tab only,
     for two minutes, and the Brain Boost page removes it as soon as it reads it. */
  famBrain:()=>{try{if(FAM.pin)sessionStorage.setItem('hmf-parent-pass',JSON.stringify({pin:FAM.pin,until:Date.now()+120000}))}catch(e){}
    FAM.pin=null;cloudClose();navTo('brain-boost-admin.html',{screen:'admin'})},
  famCoins:d=>famCoins(d.id,Number(d.sign||1)),
  famPinChange:()=>famPinChange(),famAddAsk:()=>famAddAsk(),famAddNow:()=>famAddNow(),famGateOk:()=>famGateOk()
});
/* First count right after the page starts, so a child whose time is up sees it at once. */
setTimeout(()=>{FAM.last=Date.now();famBeat()},1500);
