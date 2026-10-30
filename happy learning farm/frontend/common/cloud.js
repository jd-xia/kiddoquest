/* Optional account sync. Loading this file does not contact a server.
   After a Google account is linked and a child farm is open, that farm is checked about once a minute.
   Same sync copy with new changes on this device: upload quietly. Different sync copies: a dialog
   shows both asset lists, the total value, and a recommendation. The player chooses.
   Guest play never calls the server. */
function cloudConfig(){
  const cfg=window.HMF_CLOUD||{};
  const base=v=>v==null?'http://localhost:8080':String(v).replace(/\/$/,'');
  return {googleClientId:cfg.googleClientId||'',authBase:base(cfg.authBase),dataBase:base(cfg.dataBase==null?cfg.authBase:cfg.dataBase)};
}
function cloudDefault(){return {session:null,mode:'guest',childId:null}}
function cloudRead(){try{const c=JSON.parse(localStorage.getItem('hmf-cloud')||'null');if(c&&(c.mode==='guest'||c.mode==='account'))return Object.assign(cloudDefault(),c)}catch(e){}return cloudDefault()}
function cloudWrite(c){try{localStorage.setItem('hmf-cloud',JSON.stringify({session:c.session||null,mode:c.mode==='account'?'account':'guest',childId:c.childId||null}))}catch(e){}}
function cloudToken(){const s=cloudRead().session;if(!s||!s.accessToken)return null;if(s.expiresAt&&Date.now()>s.expiresAt-30000)return null;return s.accessToken}
function cloudIsAccount(){const c=cloudRead();return c.mode==='account'&&!!c.childId}
function cloudRevision(id){const n=Number(localStorage.getItem('hmf-rev-'+id)||'0');return Number.isFinite(n)&&n>=0?n:0}
function cloudSetRevision(id,rev){try{localStorage.setItem('hmf-rev-'+id,String(rev||0))}catch(e){}}
function cloudRememberActive(){try{const c=cloudRead();if(c.mode==='account'&&c.childId)localStorage.setItem('hmf-account-cache-'+c.childId,JSON.stringify(DATA))}catch(e){}}
function cloudStatusLine(){return cloudIsAccount()?'After sign-in, a new change on the same sync copy uploads by itself. If the sync copies differ, you choose. The dialog recommends the copy with the higher total value.':'Progress is saved on this device. Sign-in is optional and is never required to play.'}
function cloudTopActions(){return cloudIsAccount()?'<button class="pill" data-act="cloudSync" aria-label="Compare and sync this farm">☁️ Sync</button>':''}
const CLOUD_KID_MAX=5;
let cloudKidList=null,cloudKidLoading=false,cloudKidStamp=0;
function cloudLinkKey(){const id=cloudRead().session&&cloudRead().session.userId;return 'hmf-kid-links-'+(id||'none')}
function cloudLinks(){try{const m=JSON.parse(localStorage.getItem(cloudLinkKey())||'{}');return m&&typeof m==='object'?m:{}}catch(e){return {}}}
function cloudLink(localId,childId){if(!localId||!childId)return;const m=cloudLinks();m[localId]=childId;try{localStorage.setItem(cloudLinkKey(),JSON.stringify(m))}catch(e){}}
function cloudRememberKids(list){cloudKidList=Array.isArray(list)?list.slice(0,CLOUD_KID_MAX):[];cloudKidStamp=Date.now()}
function cloudKidCount(){return cloudKidList?cloudKidList.length:null}
function cloudRoom(){return cloudKidList?Math.max(0,CLOUD_KID_MAX-cloudKidList.length):0}
function cloudFindLocal(id){
  if(!id)return null;const pools=[typeof DATA!=='undefined'?DATA:null];
  try{pools.push(JSON.parse(localStorage.getItem('hmf-guest-backup')||'null'))}catch(e){}
  for(const data of pools){const p=data&&(data.players||[]).find(x=>x.id===id);if(p)return p}
  return null;
}
function cloudUnsavedLocals(){
  const seen={},out=[],links=cloudLinks();
  const activeId=cloudIsAccount()&&typeof DATA!=='undefined'&&DATA.players&&DATA.players[0]?DATA.players[0].id:null;
  function add(data){(data&&data.players||[]).forEach(p=>{if(!p||!p.id||seen[p.id]||links[p.id]||p.id===activeId)return;seen[p.id]=1;out.push(p)})}
  if(typeof DATA!=='undefined')add(DATA);
  try{add(JSON.parse(localStorage.getItem('hmf-guest-backup')||'null'))}catch(e){}
  return out;
}
function cloudLoadKids(){
  if(!cloudToken()){cloudKidList=null;return}
  if(cloudKidLoading||(cloudKidList&&Date.now()-cloudKidStamp<4000))return;
  cloudKidLoading=true;
  cloudFetch(cloudConfig().dataBase+'/api/v1/children',{auth:true}).then(list=>{cloudKidLoading=false;cloudRememberKids(list||[]);cloudStampListedCode(list||[]);cloudPaintId();if(UI&&UI.screen==='players'&&typeof rPlayers==='function')rPlayers()}).catch(()=>{cloudKidLoading=false;if(!cloudKidList)cloudRememberKids([]);if(UI&&UI.screen==='players'&&typeof rPlayers==='function')rPlayers()});
}
function cloudLookEmoji(look){try{const L=LOOKS.find(l=>l.id===look);if(L)return L.e}catch(e){}return look==='boy'?'👦':'👧'}
function cloudPlayersHtml(){
  if(!cloudToken())return null;
  if(!cloudKidList){cloudLoadKids();return '<p class="muted">Loading the kids on this Google account…</p>'}
  if(!cloudKidList.length)return '<p class="muted">This Google account has no kids yet. Add the first child below.</p>';
  const active=cloudIsAccount()?cloudRead().childId:null;
  return `<p class="syncnote">${esc(cloudSyncNotice())}</p><div class="players">${cloudKidList.map(ch=>{const when=cloudStamp(ch.updatedAt)?cloudWhen(ch.updatedAt):'';return `<div class="playerrow"><button class="player" data-act="cloudSwitch" data-id="${esc(ch.id)}"><div class="e">${cloudLookEmoji(ch.look)}</div><div class="nm">${esc(ch.displayName)}</div>${ch.username?`<div class="pcode">${esc(ch.username)}</div>`:''}<div class="muted"><span class="tag good">${esc(typeof gradeName==='function'?gradeName(ch.grade):ch.grade||'')}</span>${ch.id===active?' · Playing now':''}${when?` · Last sync ${esc(when)}`:' · Not synced yet'}</div></button><button class="b ghost sm" data-act="cloudCloseAsk" data-id="${esc(ch.id)}">Close</button></div>`}).join('')}</div>`;
}
function cloudSaveLocalHtml(){
  if(!cloudToken()||!cloudKidList||!cloudRoom())return '';
  const locals=cloudUnsavedLocals().slice(0,cloudRoom());
  if(!locals.length)return '';
  return `<div class="row">${locals.map(p=>`<button class="b ghost" data-act="cloudCreate" data-id="${esc(p.id)}">Save ${esc(p.name)} to this account</button>`).join('')}</div>`;
}
function cloudBarHtml(){
  const c=cloudRead(),signed=!!cloudToken(),label=c.session&&(c.session.email||c.session.displayName),who=signed&&label?`Signed in as ${esc(label)}. `:'';
  if(c.mode==='account')return `<div class="cloudbar"><h3>Saved farm</h3><p class="syncnote">${esc(cloudSyncNotice(c.childId))}</p><p class="muted">${who}A new change on the same sync copy uploads by itself. If the sync copies differ, you choose. The dialog recommends the copy worth more.</p><div class="row">
    <button class="b" data-act="cloudSync">☁️ Sync</button><button class="b ghost" data-act="cloudChildren">Saved farms</button><button class="b ghost" data-act="cloudCloseCurrent">Close this child</button>
    <button class="b ghost" data-act="cloudAskGuest">Guest farm</button>
    ${signed?'<button class="b ghost" data-act="cloudSwitchAccount">Switch account</button><button class="b ghost" data-act="cloudLogout">Sign out</button>':'<button class="b" data-act="cloudLogin">Sign in</button>'}</div></div>`;
  return `<div class="cloudbar"><h3>On this device</h3><p class="muted">${who}No sign-in needed. The farm does not contact the server until you choose to.</p><div class="row">
    ${signed?'<button class="b" data-act="cloudChildren">Saved farms</button><button class="b ghost" data-act="cloudSwitchAccount">Switch account</button><button class="b ghost" data-act="cloudLogout">Sign out</button>':'<button class="b" data-act="cloudLogin">Sign in with Google</button>'}</div></div>`;
}
function cloudId(){if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();return ('k'+Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).slice(0,32)}
function cloudMaterial(){try{return JSON.stringify(cur()||null)}catch(e){return ''}}
function cloudBrief(p){if(!p)return 'empty';return (p.name||'Farm')+' · 🪙 '+(p.gems||0)+' · ⭐ '+(typeof totalStars==='function'?totalStars(p):0)}
function cloudTell(text){if($('#toast')){toast(text);return}const el=$('#dlg');if(!el||DLG)return;el.className='show';el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Farm</div><p>${esc(text)}</p><div class="dlg-btns"><button class="b sm" data-act="cloudClose">OK</button></div></div></div>`}
function cloudClose(){if(DLG)return;cloudPickingAccount=false;const el=$('#dlg');if(!el)return;el.className='';el.innerHTML=''}
function cloudRefresh(){if(typeof render==='function'&&typeof SCREENS!=='undefined'&&UI&&SCREENS[UI.screen])render();else if(typeof go==='function')go('town')}
function cloudWrap(player){const p=JSON.parse(JSON.stringify(player));return {v:2,updated:Date.now(),current:p.id,players:[p]}}
function cloudStash(){const c=cloudRead(),raw=JSON.stringify(DATA);if(c.mode==='account'&&c.childId)localStorage.setItem('hmf-account-cache-'+c.childId,raw);else localStorage.setItem('hmf-guest-backup',raw)}
function cloudCommit(mode,childId){const c=cloudRead();c.mode=mode;c.childId=childId||null;cloudWrite(c)}
function cloudAdopt(player,revision){const id=cloudRead().childId;const code=cloudPlayerCode(typeof cur==='function'?cur():null);DATA=cloudWrap(cloudKeepCode(player,(player&&player.code)||code));if(id)cloudSetRevision(id,revision||0);save()}
let cloudBusy=false,cloudPending=null,cloudLastKey=null,cloudLastMaterial=null,cloudCreateId='',cloudOpenId='',cloudOpenHow='load',cloudPickingAccount=false,cloudSavedMaterial=null,cloudAutoHold=false;
async function cloudFetch(url,opts){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000),headers={Accept:'application/json'};
  if(opts.json)headers['Content-Type']='application/json';
  if(opts.auth){const token=cloudToken();if(!token){const err=new Error('Sign in is required');err.status=401;throw err}headers.Authorization='Bearer '+token}
  try{
    const res=await fetch(url,{method:opts.method||'GET',headers,body:opts.json?JSON.stringify(opts.json):undefined,signal:ctrl.signal});
    const text=await res.text();let body=null;try{body=text?JSON.parse(text):null}catch(e){}
    if(!res.ok){const err=new Error(body&&body.message||'Request failed');err.status=res.status;throw err}
    return body;
  }finally{clearTimeout(timer)}
}
function cloudLoadGsi(){
  if(window.google&&google.accounts&&google.accounts.id)return Promise.resolve();
  return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=()=>resolve();s.onerror=()=>reject(new Error('gsi'));document.head.appendChild(s)});
}
function cloudLogin(){
  if(DLG)return;const cfg=cloudConfig();
  if(!cfg.googleClientId){dialog(MAYOR,['Sign-in is not set up on this copy of the farm yet.','You can keep playing on this device. Nothing is sent anywhere.']);return}
  if(!cfg.authBase){dialog(MAYOR,['This published farm does not have the laptop address yet.','Add the https address in cloud-config.js. You can keep playing on this device.']);return}
  cloudLoadGsi().then(()=>{const el=$('#dlg');if(!el)return;const email=cloudRead().session&&cloudRead().session.email;el.className='show';el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">${cloudPickingAccount?'Switch account':'Sign in'}</div>
    <p>${cloudPickingAccount?`Choose a different email.${email?` <b>${esc(email)}</b> stays on this account.`:''} An email that is already linked cannot be moved.`:'Sign in with Google when you want saved farms. Playing here stays on this device until you tap Sync.'}</p>
    <p class="syncnote">${esc(cloudSyncNotice())}</p><div id="gsi"></div>
    <div class="dlg-btns"><button class="b ghost sm" data-act="cloudClose">Not now</button></div></div></div>`;
    google.accounts.id.initialize({client_id:cfg.googleClientId,auto_select:false,callback:resp=>{if(resp&&resp.credential)cloudExchange(resp.credential)}});
    google.accounts.id.disableAutoSelect();
    google.accounts.id.renderButton(document.getElementById('gsi'),{theme:'filled_blue',size:'large',text:'signin_with',width:280});
  }).catch(()=>cloudTell('Google sign-in did not load. This farm is still on this device.'));
}
function cloudDetachAccount(){
  const c=cloudRead();
  if(c.mode==='account'&&c.childId){
    cloudStash();
    try{const guest=JSON.parse(localStorage.getItem('hmf-guest-backup')||'null');if(guest&&guest.players){DATA=guest;save()}}catch(e){}
    c.mode='guest';c.childId=null;cloudWrite(c);
  }
  cloudKidList=null;cloudKidStamp=0;
}
async function cloudExchange(idToken){
  try{
    const res=await cloudFetch(cloudConfig().authBase+'/api/v1/auth/login',{method:'POST',json:{provider:'google',idToken}});
    const prev=cloudRead(),userId=res.user&&res.user.id,picking=cloudPickingAccount;
    cloudPickingAccount=false;
    const session={accessToken:res.accessToken,expiresAt:Date.now()+(res.expiresIn||0)*1000,userId,displayName:res.user&&res.user.displayName,email:res.user&&res.user.email};
    if(prev.session&&prev.session.userId&&prev.session.userId!==userId)cloudDetachAccount();
    const c=cloudRead();c.session=session;
    if(prev.session&&prev.session.userId&&prev.session.userId!==userId){c.mode='guest';c.childId=null;cloudKidList=null;cloudKidStamp=0}
    cloudWrite(c);
    if(picking&&prev.session&&prev.session.userId===userId){cloudClose();cloudTell('That email is already linked to this account.');if(UI&&UI.screen==='players'&&typeof rPlayers==='function')rPlayers();return}
    await cloudShowChildren();
  }catch(e){cloudPickingAccount=false;cloudTell(e.status===409&&e.message?e.message:(e.status===503?'Google sign-in is not configured on the server. This farm was not changed.':'Sign-in did not finish. This account was not changed.'))}
}
function cloudLogout(){cloudDetachAccount();const c=cloudRead();c.session=null;c.mode='guest';c.childId=null;cloudWrite(c);cloudKidList=null;cloudKidStamp=0;cloudClose();cloudTell('Signed out. This Google account stays saved. The farm on this device is unchanged.');if(typeof go==='function')go('players');else if(typeof rPlayers==='function')rPlayers()}
let cloudCloseId='',cloudCloseName='',cloudCloseRemote=false;
function cloudChildLabel(id){
  const ch=(cloudKidList||[]).find(k=>k&&k.id===id);
  if(ch)return {name:(ch.displayName||'').trim(),remote:true};
  const pools=[typeof DATA!=='undefined'?DATA:null];
  try{pools.push(JSON.parse(localStorage.getItem('hmf-guest-backup')||'null'))}catch(e){}
  for(const data of pools){const p=data&&(data.players||[]).find(x=>x&&x.id===id);if(p)return {name:(p.name||'').trim(),remote:false}}
  if(cloudIsAccount()&&cloudRead().childId===id&&typeof cur==='function'&&cur())return {name:(cur().name||'').trim(),remote:true};
  return null;
}
function cloudCloseReady(){
  const input=document.getElementById('closeName'),btn=document.getElementById('closeYes');
  if(!btn)return;
  const typed=(input&&input.value||'').trim().toLowerCase();
  btn.disabled=!cloudCloseName||typed!==cloudCloseName.trim().toLowerCase();
}
function cloudCloseCurrent(){
  const c=cloudRead();
  if(c.mode==='account'&&c.childId)return cloudCloseAsk(c.childId);
  const p=typeof cur==='function'?cur():null;
  if(p)return cloudCloseAsk(p.id);
  cloudTell('Choose a child first.');
}
function cloudCloseAsk(id){
  const who=cloudChildLabel(id);
  if(!who||!who.name){cloudTell('Choose a child first.');return}
  cloudCloseId=id;cloudCloseName=who.name;cloudCloseRemote=!!who.remote;
  const el=$('#dlg');if(!el||DLG)return;el.className='show';
  const where=who.remote?'this device and the saved account':'this device';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Close this child</div>
    <p>Type <b>${esc(who.name)}</b> to remove this farm from ${where}. Coins, stars and progress go with it.</p>
    <p><input id="closeName" maxlength="16" autocomplete="off" autocapitalize="off" placeholder="Type the name" aria-label="Type the child name to confirm"></p>
    <div class="dlg-btns"><button class="b sm" id="closeYes" data-act="cloudCloseYes" disabled>Close</button><button class="b ghost sm" data-act="cloudClose">Not now</button></div></div></div>`;
  const input=document.getElementById('closeName');
  if(input){input.addEventListener('input',cloudCloseReady);input.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();cloudCloseYes()}});input.focus()}
}
function cloudWipeArt(pid){
  if(!pid||typeof ART==='undefined')return;
  Object.keys(ART[pid]||{}).forEach(k=>{if(typeof deleteArt==='function')deleteArt(pid,k)});
}
function cloudLocalIdFor(childId){
  const links=cloudLinks();
  const hit=Object.keys(links).find(k=>links[k]===childId);
  if(hit)return hit;
  if(cloudIsAccount()&&cloudRead().childId===childId&&typeof DATA!=='undefined'&&DATA.players&&DATA.players[0])return DATA.players[0].id;
  return null;
}
function cloudForgetRemote(childId){
  ['hmf-account-cache-','hmf-rev-','hmf-sync-at-','hmf-sync-base-'].forEach(p=>{try{localStorage.removeItem(p+childId)}catch(e){}});
  const localId=cloudLocalIdFor(childId);
  const links=cloudLinks();
  Object.keys(links).forEach(k=>{if(links[k]===childId||k===localId)delete links[k]});
  try{localStorage.setItem(cloudLinkKey(),JSON.stringify(links))}catch(e){}
  if(localId)cloudWipeArt(localId);
  const c=cloudRead();
  if(c.mode==='account'&&c.childId===childId){
    let next=null;
    try{next=JSON.parse(localStorage.getItem('hmf-guest-backup')||'null')}catch(e){}
    DATA=next&&next.players?next:{v:3,updated:Date.now(),current:null,players:[]};
    c.mode='guest';c.childId=null;cloudWrite(c);
  }else if(localId&&typeof DATA!=='undefined'){
    DATA.players=(DATA.players||[]).filter(p=>p.id!==localId);
    if(DATA.current===localId)DATA.current=DATA.players[0]?DATA.players[0].id:null;
  }
  if(cloudKidList)cloudKidList=cloudKidList.filter(ch=>ch.id!==childId);
  save();
}
function cloudForgetGuest(localId){
  if(typeof DATA==='undefined'||!localId)return;
  cloudWipeArt(localId);
  DATA.players=(DATA.players||[]).filter(p=>p.id!==localId);
  if(DATA.current===localId)DATA.current=DATA.players[0]?DATA.players[0].id:null;
  try{const g=JSON.parse(localStorage.getItem('hmf-guest-backup')||'null');if(g&&g.players){g.players=g.players.filter(p=>p.id!==localId);localStorage.setItem('hmf-guest-backup',JSON.stringify(g))}}catch(e){}
  save();
}
async function cloudCloseYes(){
  cloudCloseReady();
  const btn=document.getElementById('closeYes');
  if(!cloudCloseId||!cloudCloseName||(btn&&btn.disabled)){cloudTell('Type the child\'s name to close the farm.');return}
  const id=cloudCloseId,name=cloudCloseName,remote=cloudCloseRemote;
  if(remote){
    if(!cloudToken()){cloudTell('Sign in again before closing this saved child.');return}
    if(cloudBusy)return;
    cloudBusy=true;cloudAutoHold=true;
    try{
      await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id),{method:'DELETE',auth:true});
    }catch(e){
      if(e.status!==404){cloudBusy=false;cloudAutoHold=false;cloudTell(e.status===401?'Please sign in again. Nothing was closed.':'The saved farm could not be closed. Nothing was removed.');return}
    }
    cloudForgetRemote(id);
    cloudBusy=false;cloudAutoHold=false;
  }else cloudForgetGuest(id);
  cloudCloseId='';cloudCloseName='';cloudCloseRemote=false;
  cloudClose();
  cloudTell(name+' is closed. The farm is gone from '+(remote?'this device and the saved account.':'this device.'));
  if(typeof go==='function')go('players');
  else if(typeof rPlayers==='function')rPlayers();
}
function cloudSwitchAccount(){
  const el=$('#dlg');if(!el||DLG)return;const who=cloudRead().session&&(cloudRead().session.email||cloudRead().session.displayName);
  el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Switch account</div>
    <p>${who?`Signed in as <b>${esc(who)}</b>. `:''}This email stays on this account. Choose a different email to open another account.</p>
    <p class="muted">This account's farms stay saved. Nothing is uploaded.</p>
    <div class="dlg-btns"><button class="b sm" data-act="cloudSwitchAccountYes">Use a different email</button><button class="b ghost sm" data-act="cloudClose">Not now</button></div></div></div>`;
}
function cloudSwitchAccountYes(){
  cloudClose();cloudPickingAccount=true;cloudLogin();
}
async function cloudShowChildren(){
  if(DLG)return;if(!cloudToken()){cloudLogin();return}
  try{cloudDrawChildren(await cloudFetch(cloudConfig().dataBase+'/api/v1/children',{auth:true})||[])}
  catch(e){if(e.status===401){const c=cloudRead();c.session=null;cloudWrite(c)}cloudTell(e.status===401?'Please sign in again. This farm is still on this device.':'Saved farms could not be loaded. This farm is still on this device.')}
}
function cloudDrawChildren(list){
  cloudRememberKids(list||[]);
  const c=cloudRead(),room=cloudRoom();
  const saves=cloudUnsavedLocals().slice(0,room).map(p=>`<button class="b ghost sm" data-act="cloudCreate" data-id="${esc(p.id)}">Save ${esc(p.name)} to this account</button>`).join('');
  const rows=(cloudKidList||[]).map(ch=>{const when=cloudStamp(ch.updatedAt)?cloudWhen(ch.updatedAt):'Not synced yet';return `<div class="playerrow"><button class="player" data-act="cloudSwitch" data-id="${esc(ch.id)}"><div class="nm">${esc(ch.displayName)}</div>${ch.username?`<div class="pcode">${esc(ch.username)}</div>`:''}<div class="muted">${esc(typeof gradeName==='function'?gradeName(ch.grade):ch.grade||'')} · Last sync ${esc(when)}</div></button><button class="b ghost sm" data-act="cloudCloseAsk" data-id="${esc(ch.id)}">Close</button></div>`}).join('')||'<p class="muted">No kids on this account yet.</p>';
  const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg cloudpick"><div style="flex:1"><div class="dlg-name">Kids on this account</div>
    <p class="syncnote">${esc(cloudSyncNotice())}</p>
    <p class="muted">One Google account keeps up to ${CLOUD_KID_MAX} kids. A new change on the same sync copy uploads by itself. If the sync copies differ, you choose.</p><div class="players">${rows}</div>
    ${room?'':`<p class="muted">This Google account already has its ${CLOUD_KID_MAX} kids.</p>`}
    <div class="dlg-btns">${saves}${room?'<button class="b ghost sm" data-act="cloudCreateEmpty">Add a child</button>':''}
    ${c.mode==='account'?'<button class="b ghost sm" data-act="cloudAskGuest">Guest farm</button>':''}
    <button class="b ghost sm" data-act="cloudSwitchAccount">Switch account</button>
    <button class="b ghost sm" data-act="cloudClose">Not now</button></div></div></div>`;
}
function cloudAskCreate(id){
  cloudCreateId=id||'';const p=id?cloudFindLocal(id):null;const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Save a farm</div>
    <p>${p?`Save <b>${esc(p.name)}</b> to this account and play it now?`:'Create an empty farm on this account and play it now?'}</p>
    <p class="muted">The guest farm stays on this device.</p>
    <div class="dlg-btns"><button class="b sm" data-act="cloudCreateYes">Save</button><button class="b ghost sm" data-act="cloudChildren">Back</button></div></div></div>`;
}
function cloudNameTaken(name){
  const n=(name||'').trim().toLowerCase();
  if(!n||!cloudKidList)return false;
  return cloudKidList.some(ch=>ch&&(ch.displayName||'').trim().toLowerCase()===n);
}
async function cloudSubmitChild(body,localId){
  if(cloudBusy)return;
  if(cloudKidList&&cloudKidList.length>=CLOUD_KID_MAX){cloudTell('This Google account already has '+CLOUD_KID_MAX+' kids.');return}
  if(cloudNameTaken(body&&body.displayName)){cloudTell('This account already has a child named '+((body.displayName||'').trim())+'.');return}
  cloudBusy=true;
  try{
    cloudStash();
    const created=await cloudFetch(cloudConfig().dataBase+'/api/v1/children',{method:'POST',auth:true,json:body});
    if(!created||!created.player)throw new Error('empty');
    if(localId)cloudLink(localId,created.id);
    cloudRememberKids((cloudKidList||[]).filter(ch=>ch.id!==created.id).concat([{id:created.id,username:created.username,displayName:created.displayName||body.displayName,grade:created.grade||body.grade,look:created.look||body.look,revision:created.revision||1,updatedAt:created.updatedAt}]));
    DATA=cloudWrap(cloudKeepCode(created.player,created.username));cloudCommit('account',created.id);cloudMarkSynced(created.id,created.revision||1);save();cloudClose();go('town');
  }catch(e){cloudTell(e.status===422&&e.message?e.message:'The child was not added. This device was not changed.')}
  finally{cloudBusy=false}
}
function cloudCreateYes(){
  const id=cloudCreateId,p=id?cloudFindLocal(id):null;
  const body=p?{displayName:p.name,grade:gradeOf(p),look:p.look||'boy',player:p}:{displayName:'Farmer',grade:DEFAULT_GRADE,look:'girl'};
  return cloudSubmitChild(body,p&&p.id);
}
function cloudAddKid(){
  const input=$('#newname');const name=(input&&input.value||'').trim().slice(0,16);
  if(!name){if(input)input.focus();return}
  const grade=typeof NEWGRADE!=='undefined'?NEWGRADE:DEFAULT_GRADE,look=typeof NEWLOOK!=='undefined'?NEWLOOK:'girl';
  return cloudSubmitChild({displayName:name,grade,look},null);
}
async function cloudSwitch(id){
  if(!id)return;const c=cloudRead();
  if(c.mode==='account'&&c.childId===id){cloudClose();go('town');return}
  cloudOpenId=id;cloudOpenHow=localStorage.getItem('hmf-account-cache-'+id)?'cache':'load';
  await cloudOpenYes();
}
function cloudAskOpen(id){
  const c=cloudRead();if(c.mode==='account'&&c.childId===id){cloudClose();go('town');return}
  cloudOpenId=id;cloudOpenHow=localStorage.getItem('hmf-account-cache-'+id)?'cache':'load';
  const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Open farm</div>
    <p>${cloudOpenHow==='cache'?'This device already has a copy of this farm. Open it here? Use Sync when you want to compare it with the saved farm.':'Load the saved farm onto this device?'}</p>
    <p class="muted">The guest farm stays on this device.</p>
    <div class="dlg-btns"><button class="b sm" data-act="cloudOpenYes">Open</button><button class="b ghost sm" data-act="cloudChildren">Back</button></div></div></div>`;
}
async function cloudOpenYes(){
  if(cloudBusy)return;const id=cloudOpenId,how=cloudOpenHow;cloudBusy=true;
  try{
    cloudStash();
    let fresh=false;
    if(how==='cache'){const data=JSON.parse(localStorage.getItem('hmf-account-cache-'+id)||'null');if(!data||!data.players)throw new Error('cache');const stamp=data.updated||0;DATA=data;cloudLink(data.players[0]&&data.players[0].id,id);cloudCommit('account',id);save();DATA.updated=stamp;try{localStorage.setItem(LS,JSON.stringify(DATA))}catch(e){}}
    else{const state=await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id),{auth:true});if(!state||!state.player)throw new Error('empty');DATA=cloudWrap(cloudKeepCode(state.player,state.username));cloudLink(state.player.id,id);cloudCommit('account',id);cloudMarkSynced(id,state.revision||0);fresh=true;save()}
    cloudClose();go('town');
    if(!fresh)cloudReconcile();
  }catch(e){cloudTell('That farm did not open. This device was not changed.')}
  finally{cloudBusy=false}
}
function cloudAskGuest(){
  const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Guest farm</div>
    <p>Switch back to the guest farm on this device? This saved farm stays here.</p>
    <div class="dlg-btns"><button class="b sm" data-act="cloudUseGuest">Switch</button><button class="b ghost sm" data-act="cloudClose">Not now</button></div></div></div>`;
}
function cloudUseGuest(){
  const c=cloudRead();if(c.mode!=='account'||!c.childId){cloudClose();go('players');return}
  const raw=localStorage.getItem('hmf-guest-backup');if(!raw){cloudTell('The guest farm is not on this device.');return}
  try{localStorage.setItem('hmf-account-cache-'+c.childId,JSON.stringify(DATA));const guest=JSON.parse(raw);if(!guest||!guest.players)throw new Error('guest');DATA=guest;cloudCommit('guest',null);save();cloudClose();go('players')}
  catch(e){cloudTell('The guest farm could not be opened. This device was not changed.')}
}
let cloudSyncRemote=null;
function cloudStamp(v){if(v==null||v==='')return 0;const n=typeof v==='number'?v:Date.parse(v);return Number.isFinite(n)?n:0}
function cloudWhen(v){const n=cloudStamp(v);if(!n)return 'No time saved';return new Date(n).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
function cloudRememberSync(id,when){
  const n=cloudStamp(when)||Date.now();
  try{
    if(id)localStorage.setItem('hmf-sync-at-'+id,String(n));
    if(n>=cloudLastSync())localStorage.setItem('hmf-sync-at-device',String(n));
  }catch(e){}
}
function cloudLastSync(id){const n=Number(localStorage.getItem('hmf-sync-at-'+(id||'device'))||'0');return Number.isFinite(n)&&n>0?n:0}
function cloudSyncNotice(id){
  let ms=cloudLastSync(id);
  const kids=id&&cloudKidList?[cloudKidList.find(ch=>ch&&ch.id===id)].filter(Boolean):(cloudKidList||[]);
  kids.forEach(ch=>{ms=Math.max(ms,cloudStamp(ch.updatedAt))});
  if(!id)ms=Math.max(ms,cloudLastSync());
  return ms?`Last sync ${cloudWhen(ms)}.`:'No sync yet.';
}
function cloudStarsOf(p){if(!p||!p.lv)return 0;return Object.values(p.lv).reduce((a,r)=>a+(r&&r.stars||0),0)}
function cloudBaseKey(id){return 'hmf-sync-base-'+id}
function cloudReadBase(id){try{return localStorage.getItem(cloudBaseKey(id))}catch(e){return null}}
function cloudWriteBase(id,material){if(!id)return;try{localStorage.setItem(cloudBaseKey(id),material==null?cloudMaterial():material)}catch(e){}}
function cloudSameFarm(a,b){
  if(!a||!b)return false;
  const pick=p=>({gems:p.gems||0,time:p.time||0,name:p.name||'',grade:p.grade||'',look:p.look||'',lv:p.lv||{},farm:p.farm||{},sessions:p.sessions||[],seen:p.seen||{}});
  try{return JSON.stringify(pick(a))===JSON.stringify(pick(b))}catch(e){return false}
}
function cloudCropValue(cost,n){return n>0?Math.max(1,Math.round(n*cost*1.2/4)):0}
function cloudWorth(p){
  const lines=[];
  if(!p)return {lines,total:0,stars:0};
  const f=p.farm||{},barn=f.barn||{};
  const add=(label,detail,coins)=>{lines.push({label,detail:detail==null?'':String(detail),coins:coins||0})};
  const coins=Number(p.gems)||0;
  add('Coins',coins+' 🪙',coins);
  let cropCoins=0;const cropBits=[];
  (typeof SEEDS==='undefined'?[]:SEEDS).forEach(S=>{const n=Number(barn[S.id])||0;if(n<1)return;const pay=cloudCropValue(S.cost,n);cropCoins+=pay;cropBits.push(S.name+' '+n+' = '+pay)});
  if(cropBits.length)add('Crops',cropBits.join(', '),cropCoins);
  let fishCoins=0;const fishBits=[];
  const catches=f.fish&&f.fish.catches||{};
  (typeof FISH_CATCH==='undefined'?[]:FISH_CATCH).forEach(F=>{const n=Number(catches[F.id])||0;if(n<1)return;const pay=F.worth*n;fishCoins+=pay;fishBits.push(F.name+' '+n+' = '+pay)});
  if(fishBits.length)add('Fish',fishBits.join(', '),fishCoins);
  let animalCoins=0;const animalBits=[];
  (f.animals||[]).forEach(a=>{const A=typeof ANIMALS!=='undefined'&&ANIMALS.find(x=>x.id===a.type);if(!A)return;animalCoins+=A.cost;animalBits.push(A.name)});
  if(animalBits.length)add('Animals',animalBits.join(', '),animalCoins);
  let decorCoins=0;const decorBits=[];
  (f.decor||[]).forEach(id=>{const D=typeof DECOR!=='undefined'&&DECOR.find(d=>d.id===id);if(!D)return;decorCoins+=D.cost;decorBits.push(D.name)});
  if(decorBits.length)add('Decorations',decorBits.join(', '),decorCoins);
  let landCoins=0;const landBits=[];
  const unlocked=Number(f.unlocked)||6;
  for(let u=6;u<unlocked&&u<12;u++){const c=12+4*(u-6);landCoins+=c;landBits.push('patch '+c)}
  (f.lands||[]).forEach(id=>{const L=typeof LANDS!=='undefined'&&LANDS.find(x=>x.id===id);if(!L)return;landCoins+=L.cost;landBits.push(L.name)});
  if(landCoins)add('Land',landBits.join(', '),landCoins);
  let clothCoins=0;const clothBits=[];
  (f.owned||[]).forEach(key=>{const parts=String(key).split(':'),kind=parts[0],id=parts[1];
    const item=kind==='shirt'?(typeof SHIRTS!=='undefined'&&SHIRTS.find(s=>s[0]===id)):(typeof HATS!=='undefined'&&HATS.find(h=>h[0]===id));
    if(!item||!item[3])return;clothCoins+=item[3];clothBits.push(item[1])});
  if(clothCoins)add('Clothes',clothBits.join(', '),clothCoins);
  const fish=f.fish||{};
  let gear=0;const gearBits=[];
  if((fish.pond||0)>=1){gear+=24;gearBits.push('pond 24')}
  if((fish.pond||0)>=2){gear+=36;gearBits.push('wide pond 36')}
  const rods={bamboo:12,river:28,gold:48},tackle={bobber:8,net:16,bucket:10,lantern:14};
  (fish.owned||[]).forEach(id=>{if(String(id).indexOf('rod:')===0){const c=rods[id.slice(4)]||0;if(c){gear+=c;gearBits.push(id.slice(4)+' '+c)}}else if(tackle[id]){gear+=tackle[id];gearBits.push(id+' '+tackle[id])}});
  if(gear)add('Fishing gear',gearBits.join(', '),gear);
  let grow=0,growN=0;
  (f.plots||[]).forEach(pl=>{if(!pl||!pl.crop)return;const S=typeof SEEDS!=='undefined'&&SEEDS.find(s=>s.id===pl.crop);if(!S)return;grow+=cloudCropValue(S.cost,4);growN++});
  if(growN)add('Crops growing',growN+(growN===1?' plot':' plots'),grow);
  const goods=[];
  (typeof ANIMALS==='undefined'?[]:ANIMALS).forEach(A=>{const n=Number(barn[A.prod])||0;if(n)goods.push(A.pn+' '+n)});
  if(goods.length)add('Animal goods, kept',goods.join(', '),0);
  const stars=cloudStarsOf(p);
  add('Stars',stars,0);
  const level=typeof farmLevel==='function'?farmLevel((f.xp||0)).l:1;
  add('Farm level',level,0);
  return {lines,total:coins+cropCoins+fishCoins+animalCoins+decorCoins+landCoins+clothCoins+gear+grow,stars};
}
function cloudAdvice(local,remote){
  const a=cloudWorth(local),b=cloudWorth(remote);
  if(!remote)return {side:'local',text:'There is no saved farm yet. Recommended: keep this device.'};
  if(a.total!==b.total){
    const side=a.total>b.total?'local':'server';
    const high=Math.max(a.total,b.total),low=Math.min(a.total,b.total);
    const who=side==='local'?'This device':'The saved farm';
    return {side,text:who+' is worth more ('+high+' 🪙 vs '+low+' 🪙). Recommended: keep '+(side==='local'?'this device':'the saved farm')+'.'};
  }
  if(a.stars!==b.stars){
    const side=a.stars>b.stars?'local':'server';
    return {side,text:'Both are worth '+a.total+' 🪙. '+(side==='local'?'This device':'The saved farm')+' has more stars ('+Math.max(a.stars,b.stars)+' vs '+Math.min(a.stars,b.stars)+'). Recommended: keep '+(side==='local'?'this device':'the saved farm')+'.'};
  }
  return {side:null,text:'Both are worth '+a.total+' 🪙, with '+a.stars+' stars. Either copy is fine.'};
}
function cloudSideHtml(title,p,when,copy,recommended){
  const w=cloudWorth(p);
  const lines=p?w.lines.map(l=>{const extra=l.coins&&!String(l.detail).includes('🪙')?' · '+l.coins+' 🪙':'';return `<p>${esc(l.label)}: <b>${esc(l.detail)}</b>${extra}</p>`}).join('')+`<p class="synctotal">Total value: <b>${w.total} 🪙</b></p>`:'<p>Nothing saved yet</p>';
  return `<div class="synccard${recommended?' newer':''}"><div class="syncwho">${esc(title)}${recommended?' <span class="tag good">Recommended</span>':''}</div><p><b>${esc(p&&p.name||'Farm')}</b></p>${lines}<p class="muted">${esc(when)}</p><p class="muted">${esc(copy)}</p></div>`;
}
/* same: the farms match. upload: same sync copy, this device has new changes. conflict: the sync copies differ. */
function cloudChoose(localRev,serverRev,same){
  if(same)return 'same';
  if(Number(serverRev)===Number(localRev))return 'upload';
  return 'conflict';
}
function cloudDrawSync(remote){
  const el=$('#dlg');if(!el)return;
  const local=typeof cur==='function'?cur():null;
  const localRev=cloudRevision(cloudRead().childId);
  const remoteRev=remote&&Number(remote.revision)||0;
  const localMs=cloudStamp(typeof DATA!=='undefined'?DATA.updated:0);
  const serverMs=cloudStamp(remote&&remote.updatedAt);
  const advice=cloudAdvice(local,remote&&remote.player);
  cloudSyncRemote=remote&&remote.player?{player:remote.player,revision:remoteRev,updatedAt:remote.updatedAt||null}:null;
  const keepLocal=`<button class="b${advice.side==='server'?' ghost':''} sm" data-act="cloudUpload" ${local?'':'disabled'}>Keep this device</button>`;
  const keepServer=`<button class="b${advice.side==='local'?' ghost':''} sm" data-act="cloudDownload" ${cloudSyncRemote?'':'disabled'}>Keep the saved farm</button>`;
  el.className='show';
  el.innerHTML=`<div class="dlg syncdlg"><div style="flex:1"><div class="dlg-name">Which copy should we keep?</div>
    <p>${esc(advice.text)}</p>
    <p class="muted syncmath">Total value adds coins, crops at the market sell price, fish at their prices, animals, decorations, land, clothes, fishing gear, and crops still growing. Stars and animal goods are shown, and they are not added as coins.</p>
    <div class="synccards">
      ${cloudSideHtml('This device',local,cloudWhen(localMs),'Sync copy '+localRev,advice.side==='local')}
      ${cloudSideHtml('Saved farm',remote&&remote.player,cloudWhen(serverMs),remote&&remote.player?'Sync copy '+remoteRev:'Not on the server yet',advice.side==='server')}
    </div>
    <div class="dlg-btns">
      ${advice.side==='server'?keepServer+keepLocal:keepLocal+keepServer}
      <button class="b ghost sm" data-act="cloudClose">Not now</button>
    </div></div></div>`;
}
function cloudCodeOk(code){return /^P\d{7}$/.test(code||'')}
function cloudKeepCode(player,username){if(player&&cloudCodeOk(username))player.code=username;return player}
function cloudPlayerCode(p){
  if(p&&cloudCodeOk(p.code))return p.code;
  if(!cloudIsAccount()||!cloudKidList)return '';
  const ch=cloudKidList.find(k=>k&&k.id===cloudRead().childId);
  return ch&&cloudCodeOk(ch.username)?ch.username:'';
}
function cloudSyncLine(){
  if(!cloudIsAccount())return '';
  const ms=cloudLastSync(cloudRead().childId);
  return ms?'Synced '+cloudWhen(ms):'Not synced yet';
}
function cloudStampListedCode(list){
  if(!cloudIsAccount()||typeof cur!=='function')return;
  const ch=(list||[]).find(k=>k&&k.id===cloudRead().childId);
  const p=cur();
  if(!ch||!p||!cloudCodeOk(ch.username)||p.code===ch.username)return;
  p.code=ch.username;save();
}
function cloudPaintId(){
  const p=typeof cur==='function'?cur():null;
  const code=cloudPlayerCode(p),sync=cloudSyncLine();
  const fc=document.getElementById('fcode'),fs=document.getElementById('fsync');
  if(fc){fc.textContent=code;fc.hidden=!code}
  if(fs){fs.textContent=sync;fs.hidden=!sync}
  const hud=document.querySelector('.fhud');if(hud)hud.classList.toggle('hasid',!!(code||sync));
  document.querySelectorAll('.pillcode').forEach(el=>{el.textContent=code;el.hidden=!code});
  document.querySelectorAll('.synctime').forEach(el=>{el.textContent=sync;el.hidden=!sync});
}
function cloudMarkSynced(id,revision,material){
  if(id)cloudSetRevision(id,revision||0);
  cloudRememberSync(id);
  cloudPaintId();
  const mat=material==null?cloudMaterial():material;
  cloudSavedMaterial=mat;cloudWriteBase(id,mat);cloudConflictSig=null;cloudAutoHold=false;cloudPending=null;
}
async function cloudOpenSync(){
  if(DLG||cloudBusy)return;
  const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Sync</div><p>Checking this device and the saved farm…</p></div></div>`;
  await cloudReconcile({manual:true});
}
function cloudUpload(){if(DLG||cloudBusy)return;cloudAutoHold=false;return cloudRunSync('keep_local',false)}
function cloudDownload(){
  const r=cloudSyncRemote;if(!r||!r.player){cloudTell('There is no saved farm yet. This device was not changed.');return}
  cloudAdopt(r.player,r.revision);cloudMarkSynced(cloudRead().childId,r.revision);cloudClose();cloudRefresh();
  cloudTell('Downloaded. This device now matches the saved farm.');
}
async function cloudRunSync(policy,reuse,quiet){
  if(cloudBusy||DLG)return;const c=cloudRead();
  if(!quiet)cloudAutoHold=false;
  if(c.mode!=='account'||!c.childId){if(!quiet)cloudTell('Open a saved farm before syncing.');return}
  if(!cloudToken()){if(!quiet)cloudLogin();return}
  const material=cloudMaterial();let key=cloudLastKey;
  if(!(reuse&&key&&cloudLastMaterial===material)){key=cloudId();cloudLastKey=policy==='upload'?key:null;cloudLastMaterial=material}
  cloudBusy=true;
  try{
    const res=await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(c.childId)+'/sync',{method:'POST',auth:true,json:{idempotencyKey:key,baseRevision:cloudRevision(c.childId),policy,player:cur()}});
    cloudLastKey=null;cloudLastMaterial=null;
    if(res.status==='conflict'){cloudAutoHold=true;cloudPending=res;cloudConflictSig=(res.revision||0)+'|'+material;cloudDrawSync({player:res.serverPlayer,revision:res.revision,updatedAt:res.updatedAt,conflict:true});
      cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(c.childId),{auth:true}).then(state=>{
        if(cloudBusy||!state||!$('#dlg')||!$('#dlg').classList.contains('show'))return;
        cloudDrawSync({player:state.player||res.serverPlayer,revision:state.revision,updatedAt:state.updatedAt,conflict:true});
      }).catch(()=>{});
      return}
    if(quiet){
      if((res.status==='synced'||res.status==='unchanged')&&c.childId&&cloudMaterial()===material)cloudMarkSynced(c.childId,res.revision,material);
      return}
    if((res.status==='synced'||res.status==='unchanged'||res.status==='server')&&res.player)cloudAdopt(res.player,res.revision);
    cloudMarkSynced(c.childId,res.revision);
    cloudClose();cloudRefresh();
    const notes=(res.notes||[]).filter(Boolean);
    const done=res.status==='unchanged'?'Already up to date.':policy==='keep_local'||policy==='upload'?'Uploaded. The saved farm now matches this device.':'Synced.';
    if(notes.length)dialog(MAYOR,[done].concat(notes.slice(0,4)));
    else cloudTell(done);
  }catch(e){
    if(e.status){cloudLastKey=null;cloudLastMaterial=null}
    if(e.status===401){const c2=cloudRead();c2.session=null;cloudWrite(c2);cloudTell('Please sign in again. This farm is still on this device.')}
    else if(!quiet||e.status===422){if(e.status===422)cloudAutoHold=true;cloudTell(e.status===422&&e.message?e.message:'Sync did not finish. This farm is still on this device.')}
  }finally{cloudBusy=false}
}
let cloudConflictSig=null;
async function cloudReconcile(opts){
  opts=opts||{};const manual=!!opts.manual;
  const el=$('#dlg');
  if(cloudBusy)return;
  if(!manual&&(DLG||(el&&el.classList.contains('show'))))return;
  const c=cloudRead();
  if(c.mode!=='account'||!c.childId||!cloudToken()){if(manual)cloudTell('Open a saved farm before syncing.');return}
  const local=typeof cur==='function'?cur():null;
  if(!local){if(manual)cloudTell('Open a saved farm before syncing.');return}
  const material=cloudMaterial();
  if(!manual&&cloudSavedMaterial!==null&&material===cloudSavedMaterial)return;
  cloudBusy=true;
  try{
    const state=await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(c.childId),{auth:true});
    const localRev=cloudRevision(c.childId),serverRev=Number(state&&state.revision)||0;
    const same=!!(state&&state.player&&cloudSameFarm(local,state.player));
    const choice=cloudChoose(localRev,serverRev,same);
    if(choice==='same'){
      cloudKeepCode(local,state&&state.username);if(local&&local.code)save();
      cloudMarkSynced(c.childId,serverRev,material);
      if(manual){cloudClose();cloudTell('Already the same. Nothing was changed.')}
      return;
    }
    if(choice==='upload'){
      cloudBusy=false;
      await cloudRunSync('upload',true,true);
      if(manual&&!cloudAutoHold){cloudClose();cloudTell('Uploaded. The saved farm now matches this device.')}
      return;
    }
    const sig=serverRev+'|'+material;
    if(!manual&&cloudConflictSig===sig)return;
    cloudConflictSig=sig;cloudAutoHold=true;
    cloudPending={serverPlayer:state&&state.player,revision:serverRev,updatedAt:state&&state.updatedAt};
    cloudDrawSync({player:state&&state.player,revision:serverRev,updatedAt:state&&state.updatedAt,conflict:true});
  }catch(e){
    if(e.status===401){const c2=cloudRead();c2.session=null;cloudWrite(c2);cloudTell('Please sign in again. This farm is still on this device.')}
    else if(manual)cloudTell('The saved farm could not be loaded. This device was not changed.');
  }finally{cloudBusy=false}
}
function cloudAutoSave(){return cloudReconcile()}
function cloudBoot(){cloudLoadKids();cloudPaintId();if(cloudIsAccount())cloudReconcile()}
setInterval(cloudAutoSave,60000);
Object.assign(ACT,{
  cloudLogin:()=>cloudLogin(),cloudLogout:()=>cloudLogout(),cloudSwitchAccount:()=>cloudSwitchAccount(),cloudSwitchAccountYes:()=>cloudSwitchAccountYes(),cloudSync:()=>cloudOpenSync(),cloudChildren:()=>cloudShowChildren(),
  cloudCreate:d=>cloudAskCreate(d.id),cloudCreateEmpty:()=>{cloudClose();if(typeof go==='function')go('players')},cloudCreateYes:()=>cloudCreateYes(),cloudAddKid:()=>cloudAddKid(),
  cloudOpen:d=>cloudAskOpen(d.id),cloudOpenYes:()=>cloudOpenYes(),cloudSwitch:d=>cloudSwitch(d.id),cloudAskGuest:()=>cloudAskGuest(),cloudUseGuest:()=>cloudUseGuest(),
  cloudUpload:()=>cloudUpload(),cloudDownload:()=>cloudDownload(),
  cloudKeepLocal:()=>cloudUpload(),cloudKeepServer:()=>cloudDownload(),cloudMerge:()=>{cloudClose();cloudRunSync('merge',false)},
  cloudClose:()=>cloudClose(),cloudCloseAsk:d=>cloudCloseAsk(d.id),cloudCloseCurrent:()=>cloudCloseCurrent(),cloudCloseYes:()=>cloudCloseYes()
});
