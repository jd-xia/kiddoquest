/* Optional account sync. Loading this file does not contact a server.
   After a Google account is linked and a child farm is open, that farm is saved about once a minute.
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
function cloudStatusLine(){return cloudIsAccount()?'This farm is linked to the Google account and is saved about once a minute. Tap Sync to save now.':'Progress is saved on this device. Sign-in is optional and is never required to play.'}
function cloudTopActions(){return cloudIsAccount()?'<button class="pill" data-act="cloudSync" aria-label="Sync this farm">☁️ Sync</button>':''}
const CLOUD_KID_MAX=2;
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
  cloudFetch(cloudConfig().dataBase+'/api/v1/children',{auth:true}).then(list=>{cloudKidLoading=false;cloudRememberKids(list||[]);if(UI&&UI.screen==='players'&&typeof rPlayers==='function')rPlayers()}).catch(()=>{cloudKidLoading=false;if(!cloudKidList)cloudRememberKids([]);if(UI&&UI.screen==='players'&&typeof rPlayers==='function')rPlayers()});
}
function cloudLookEmoji(look){try{const L=LOOKS.find(l=>l.id===look);if(L)return L.e}catch(e){}return look==='boy'?'👦':'👧'}
function cloudPlayersHtml(){
  if(!cloudToken())return null;
  if(!cloudKidList){cloudLoadKids();return '<p class="muted">Loading the kids on this Google account…</p>'}
  if(!cloudKidList.length)return '<p class="muted">This Google account has no kids yet. Add the first child below.</p>';
  const active=cloudIsAccount()?cloudRead().childId:null;
  return `<div class="players">${cloudKidList.map(ch=>`<button class="player" data-act="cloudSwitch" data-id="${esc(ch.id)}"><div class="e">${cloudLookEmoji(ch.look)}</div><div class="nm">${esc(ch.displayName)}</div><div class="muted"><span class="tag good">${esc(typeof gradeName==='function'?gradeName(ch.grade):ch.grade||'')}</span>${ch.id===active?' · Playing now':''}</div></button>`).join('')}</div>`;
}
function cloudSaveLocalHtml(){
  if(!cloudToken()||!cloudKidList||!cloudRoom())return '';
  const locals=cloudUnsavedLocals().slice(0,cloudRoom());
  if(!locals.length)return '';
  return `<div class="row">${locals.map(p=>`<button class="b ghost" data-act="cloudCreate" data-id="${esc(p.id)}">Save ${esc(p.name)} to this account</button>`).join('')}</div>`;
}
function cloudBarHtml(){
  const c=cloudRead(),signed=!!cloudToken(),label=c.session&&(c.session.email||c.session.displayName),who=signed&&label?`Signed in as ${esc(label)}. `:'';
  if(c.mode==='account')return `<div class="cloudbar"><h3>Saved farm</h3><p class="muted">${who}This farm is saved to the Google account about once a minute.</p><div class="row">
    <button class="b" data-act="cloudSync">☁️ Sync</button><button class="b ghost" data-act="cloudChildren">Saved farms</button>
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
function cloudAdopt(player,revision){const id=cloudRead().childId;DATA=cloudWrap(player);if(id)cloudSetRevision(id,revision||0);save()}
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
    <p>${cloudPickingAccount?`Choose a different email.${email?` <b>${esc(email)}</b> stays on this account.`:''} An email that is already linked cannot be moved.`:'Sign in with Google when you want saved farms. Playing here stays on this device until you tap Sync.'}</p><div id="gsi"></div>
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
  const rows=(cloudKidList||[]).map(ch=>`<button class="player" data-act="cloudSwitch" data-id="${esc(ch.id)}"><div class="nm">${esc(ch.displayName)}</div><div class="muted">${esc(typeof gradeName==='function'?gradeName(ch.grade):ch.grade||'')} · saved copy ${Number(ch.revision)||0}</div></button>`).join('')||'<p class="muted">No kids on this account yet.</p>';
  const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg cloudpick"><div style="flex:1"><div class="dlg-name">Kids on this account</div>
    <p class="muted">One Google account keeps 2 separate kids. Opening one does not upload this device until you tap Sync.</p><div class="players">${rows}</div>
    ${room?'':`<p class="muted">This Google account already has its 2 kids.</p>`}
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
async function cloudSubmitChild(body,localId){
  if(cloudBusy)return;
  if(cloudKidList&&cloudKidList.length>=CLOUD_KID_MAX){cloudTell('This Google account already has 2 kids.');return}
  cloudBusy=true;
  try{
    cloudStash();
    const created=await cloudFetch(cloudConfig().dataBase+'/api/v1/children',{method:'POST',auth:true,json:body});
    if(!created||!created.player)throw new Error('empty');
    if(localId)cloudLink(localId,created.id);
    cloudRememberKids((cloudKidList||[]).filter(ch=>ch.id!==created.id).concat([{id:created.id,displayName:created.displayName||body.displayName,grade:created.grade||body.grade,look:created.look||body.look,revision:created.revision||1}]));
    DATA=cloudWrap(created.player);cloudSetRevision(created.id,created.revision||1);cloudCommit('account',created.id);cloudSavedMaterial=cloudMaterial();save();cloudClose();go('town');
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
    if(how==='cache'){const data=JSON.parse(localStorage.getItem('hmf-account-cache-'+id)||'null');if(!data||!data.players)throw new Error('cache');DATA=data;cloudLink(data.players[0]&&data.players[0].id,id);cloudCommit('account',id);save()}
    else{const state=await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id),{auth:true});if(!state||!state.player)throw new Error('empty');DATA=cloudWrap(state.player);cloudLink(state.player.id,id);cloudSetRevision(id,state.revision||0);cloudCommit('account',id);cloudSavedMaterial=cloudMaterial();save()}
    cloudClose();go('town');
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
function cloudDrawConflict(res){
  const server=res&&res.serverPlayer,el=$('#dlg');if(!el){cloudTell('Sync found two different farms. Nothing was overwritten.');return}
  el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Sync</div>
    <p>${esc(res.notes&&res.notes[0]||'This device and the saved farm both changed. Nothing was overwritten.')}</p>
    <p>This device: <b>${esc(cloudBrief(cur()))}</b></p><p>Saved farm: <b>${esc(server?cloudBrief(server):'empty')}</b></p>
    <div class="dlg-btns"><button class="b sm" data-act="cloudKeepLocal">Keep this device</button>
    ${server?'<button class="b ghost sm" data-act="cloudKeepServer">Keep saved farm</button><button class="b ghost sm" data-act="cloudMerge">Merge progress</button>':''}
    <button class="b ghost sm" data-act="cloudClose">Not now</button></div></div></div>`;
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
    if(res.status==='conflict'){cloudAutoHold=true;cloudPending=res;cloudDrawConflict(res);return}
    if((res.status==='synced'||res.status==='unchanged'||res.status==='server')&&res.player)cloudAdopt(res.player,res.revision);
    cloudSavedMaterial=cloudMaterial();cloudAutoHold=false;
    if(quiet){if(res.status!=='unchanged')cloudRefresh();return}
    cloudClose();cloudRefresh();
    const notes=(res.notes||[]).filter(Boolean);
    if(notes.length)dialog(MAYOR,[res.status==='unchanged'?'Already up to date.':'Synced.'].concat(notes.slice(0,4)));
    else cloudTell(res.status==='unchanged'?'Already up to date.':'Synced.');
  }catch(e){
    if(e.status){cloudLastKey=null;cloudLastMaterial=null}
    if(e.status===401){const c2=cloudRead();c2.session=null;cloudWrite(c2);cloudTell('Please sign in again. This farm is still on this device.')}
    else if(!quiet||e.status===422){if(e.status===422)cloudAutoHold=true;cloudTell(e.status===422&&e.message?e.message:'Sync did not finish. This farm is still on this device.')}
  }finally{cloudBusy=false}
}
function cloudAutoSave(){
  const el=$('#dlg');if(cloudAutoHold||cloudBusy||DLG||(el&&el.classList.contains('show')))return;
  if(!cloudIsAccount()||!cloudToken())return;
  if(cloudSavedMaterial!==null&&cloudMaterial()===cloudSavedMaterial)return;
  cloudRunSync('upload',true,true);
}
setInterval(cloudAutoSave,60000);
function cloudKeepServer(){
  const res=cloudPending;if(!res||!res.serverPlayer){cloudClose();cloudTell('The saved farm is empty. This device was not changed.');return}
  cloudAdopt(res.serverPlayer,res.revision);cloudPending=null;cloudClose();cloudRefresh();cloudTell('Opened the saved farm. This device now matches it.');
}
Object.assign(ACT,{
  cloudLogin:()=>cloudLogin(),cloudLogout:()=>cloudLogout(),cloudSwitchAccount:()=>cloudSwitchAccount(),cloudSwitchAccountYes:()=>cloudSwitchAccountYes(),cloudSync:()=>cloudRunSync('upload',true),cloudChildren:()=>cloudShowChildren(),
  cloudCreate:d=>cloudAskCreate(d.id),cloudCreateEmpty:()=>{cloudClose();if(typeof go==='function')go('players')},cloudCreateYes:()=>cloudCreateYes(),cloudAddKid:()=>cloudAddKid(),
  cloudOpen:d=>cloudAskOpen(d.id),cloudOpenYes:()=>cloudOpenYes(),cloudSwitch:d=>cloudSwitch(d.id),cloudAskGuest:()=>cloudAskGuest(),cloudUseGuest:()=>cloudUseGuest(),
  cloudKeepLocal:()=>{cloudClose();cloudRunSync('keep_local',false)},cloudKeepServer:()=>cloudKeepServer(),cloudMerge:()=>{cloudClose();cloudRunSync('merge',false)},
  cloudClose:()=>cloudClose()
});
