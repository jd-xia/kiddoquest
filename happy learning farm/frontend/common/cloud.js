/* Optional account sync. Loading this file does not contact a server.
   Network calls happen only after Sign in, Saved farms, Open, or Sync. */
function cloudConfig(){
  const cfg=window.HMF_CLOUD||{};
  return {googleClientId:cfg.googleClientId||'',authBase:String(cfg.authBase||'http://localhost:8080').replace(/\/$/,''),dataBase:String(cfg.dataBase||'http://localhost:8081').replace(/\/$/,'')};
}
function cloudDefault(){return {session:null,mode:'guest',childId:null}}
function cloudRead(){try{const c=JSON.parse(localStorage.getItem('hmf-cloud')||'null');if(c&&(c.mode==='guest'||c.mode==='account'))return Object.assign(cloudDefault(),c)}catch(e){}return cloudDefault()}
function cloudWrite(c){try{localStorage.setItem('hmf-cloud',JSON.stringify({session:c.session||null,mode:c.mode==='account'?'account':'guest',childId:c.childId||null}))}catch(e){}}
function cloudToken(){const s=cloudRead().session;if(!s||!s.accessToken)return null;if(s.expiresAt&&Date.now()>s.expiresAt-30000)return null;return s.accessToken}
function cloudIsAccount(){const c=cloudRead();return c.mode==='account'&&!!c.childId}
function cloudRevision(id){const n=Number(localStorage.getItem('hmf-rev-'+id)||'0');return Number.isFinite(n)&&n>=0?n:0}
function cloudSetRevision(id,rev){try{localStorage.setItem('hmf-rev-'+id,String(rev||0))}catch(e){}}
function cloudRememberActive(){try{const c=cloudRead();if(c.mode==='account'&&c.childId)localStorage.setItem('hmf-account-cache-'+c.childId,JSON.stringify(DATA))}catch(e){}}
function cloudStatusLine(){return cloudIsAccount()?'This farm is on this device. Tap Sync when you want to save it to the account. Nothing is sent until then.':'Progress is saved on this device. Sign-in is optional and is never required to play.'}
function cloudTopActions(){return cloudIsAccount()?'<button class="pill" data-act="cloudSync" aria-label="Sync this farm">☁️ Sync</button>':''}
function cloudBarHtml(){
  const c=cloudRead(),signed=!!cloudToken(),who=signed&&c.session&&c.session.displayName?`Signed in as ${esc(c.session.displayName)}. `:'';
  if(c.mode==='account')return `<div class="cloudbar"><h3>Saved farm</h3><p class="muted">${who}This farm stays on this device until you tap Sync.</p><div class="row">
    <button class="b" data-act="cloudSync">☁️ Sync</button><button class="b ghost" data-act="cloudChildren">Saved farms</button>
    <button class="b ghost" data-act="cloudAskGuest">Guest farm</button>
    ${signed?'<button class="b ghost" data-act="cloudLogout">Sign out</button>':'<button class="b" data-act="cloudLogin">Sign in</button>'}</div></div>`;
  return `<div class="cloudbar"><h3>On this device</h3><p class="muted">${who}No sign-in needed. The farm does not contact the server until you choose to.</p><div class="row">
    ${signed?'<button class="b" data-act="cloudChildren">Saved farms</button><button class="b ghost" data-act="cloudLogout">Sign out</button>':'<button class="b" data-act="cloudLogin">Sign in with Google</button>'}</div></div>`;
}
function cloudId(){if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();return ('k'+Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).slice(0,32)}
function cloudMaterial(){try{return JSON.stringify(cur()||null)}catch(e){return ''}}
function cloudBrief(p){if(!p)return 'empty';return (p.name||'Farm')+' · 🪙 '+(p.gems||0)+' · ⭐ '+(typeof totalStars==='function'?totalStars(p):0)}
function cloudTell(text){if($('#toast')){toast(text);return}const el=$('#dlg');if(!el||DLG)return;el.className='show';el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Farm</div><p>${esc(text)}</p><div class="dlg-btns"><button class="b sm" data-act="cloudClose">OK</button></div></div></div>`}
function cloudClose(){if(DLG)return;const el=$('#dlg');if(!el)return;el.className='';el.innerHTML=''}
function cloudRefresh(){if(typeof render==='function'&&typeof SCREENS!=='undefined'&&UI&&SCREENS[UI.screen])render();else if(typeof go==='function')go('town')}
function cloudWrap(player){const p=JSON.parse(JSON.stringify(player));return {v:2,updated:Date.now(),current:p.id,players:[p]}}
function cloudStash(){const c=cloudRead(),raw=JSON.stringify(DATA);if(c.mode==='account'&&c.childId)localStorage.setItem('hmf-account-cache-'+c.childId,raw);else localStorage.setItem('hmf-guest-backup',raw)}
function cloudCommit(mode,childId){const c=cloudRead();c.mode=mode;c.childId=childId||null;cloudWrite(c)}
function cloudAdopt(player,revision){const id=cloudRead().childId;DATA=cloudWrap(player);if(id)cloudSetRevision(id,revision||0);save()}
let cloudBusy=false,cloudPending=null,cloudLastKey=null,cloudLastMaterial=null,cloudCreateId='',cloudOpenId='',cloudOpenHow='load';
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
  cloudLoadGsi().then(()=>{const el=$('#dlg');if(!el)return;el.className='show';el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Sign in</div>
    <p>Sign in with Google when you want saved farms. Playing here stays on this device until you tap Sync.</p><div id="gsi"></div>
    <div class="dlg-btns"><button class="b ghost sm" data-act="cloudClose">Not now</button></div></div></div>`;
    google.accounts.id.initialize({client_id:cfg.googleClientId,callback:resp=>{if(resp&&resp.credential)cloudExchange(resp.credential)}});
    google.accounts.id.renderButton(document.getElementById('gsi'),{theme:'filled_blue',size:'large',text:'signin_with',width:280});
  }).catch(()=>cloudTell('Google sign-in did not load. This farm is still on this device.'));
}
async function cloudExchange(idToken){
  try{
    const res=await cloudFetch(cloudConfig().authBase+'/api/v1/auth/login',{method:'POST',json:{provider:'google',idToken}});
    const c=cloudRead();c.session={accessToken:res.accessToken,expiresAt:Date.now()+(res.expiresIn||0)*1000,userId:res.user&&res.user.id,displayName:res.user&&res.user.displayName};cloudWrite(c);
    await cloudShowChildren();
  }catch(e){cloudTell(e.status===503?'Google sign-in is not configured on the server. This farm was not changed.':'Sign-in did not finish. This farm was not changed.')}
}
function cloudLogout(){const c=cloudRead();c.session=null;cloudWrite(c);cloudClose();cloudTell('Signed out. The farm on this device is unchanged.');if(UI&&UI.screen==='players'&&typeof rPlayers==='function')rPlayers()}
async function cloudShowChildren(){
  if(DLG)return;if(!cloudToken()){cloudLogin();return}
  try{cloudDrawChildren(await cloudFetch(cloudConfig().dataBase+'/api/v1/children',{auth:true})||[])}
  catch(e){if(e.status===401){const c=cloudRead();c.session=null;cloudWrite(c)}cloudTell(e.status===401?'Please sign in again. This farm is still on this device.':'Saved farms could not be loaded. This farm is still on this device.')}
}
function cloudDrawChildren(list){
  const c=cloudRead(),guest=c.mode!=='account';
  const saves=guest?(DATA.players||[]).map(p=>`<button class="b ghost sm" data-act="cloudCreate" data-id="${esc(p.id)}">Save ${esc(p.name)} to this account</button>`).join(''):'';
  const rows=(list||[]).map(ch=>`<button class="player" data-act="cloudOpen" data-id="${esc(ch.id)}"><div class="nm">${esc(ch.displayName)}</div><div class="muted">${esc(ch.grade||'')} · saved copy ${Number(ch.revision)||0}</div></button>`).join('')||'<p class="muted">No saved farms yet.</p>';
  const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg cloudpick"><div style="flex:1"><div class="dlg-name">Saved farms</div>
    <p class="muted">Opening a farm does not upload this device until you tap Sync.</p><div class="players">${rows}</div>
    <div class="dlg-btns">${saves}<button class="b ghost sm" data-act="cloudCreateEmpty">New empty farm</button>
    ${c.mode==='account'?'<button class="b ghost sm" data-act="cloudAskGuest">Guest farm</button>':''}
    <button class="b ghost sm" data-act="cloudClose">Not now</button></div></div></div>`;
}
function cloudAskCreate(id){
  cloudCreateId=id||'';const p=id&&(DATA.players||[]).find(x=>x.id===id);const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Save a farm</div>
    <p>${p?`Save <b>${esc(p.name)}</b> to this account and play it now?`:'Create an empty farm on this account and play it now?'}</p>
    <p class="muted">The guest farm stays on this device.</p>
    <div class="dlg-btns"><button class="b sm" data-act="cloudCreateYes">Save</button><button class="b ghost sm" data-act="cloudChildren">Back</button></div></div></div>`;
}
async function cloudCreateYes(){
  if(cloudBusy)return;const id=cloudCreateId,p=id?(DATA.players||[]).find(x=>x.id===id):null;
  const body=p?{displayName:p.name,grade:gradeOf(p),look:p.look||'boy',player:p}:{displayName:'Farmer',grade:DEFAULT_GRADE,look:'girl'};
  cloudBusy=true;
  try{
    cloudStash();
    const created=await cloudFetch(cloudConfig().dataBase+'/api/v1/children',{method:'POST',auth:true,json:body});
    if(!created||!created.player)throw new Error('empty');
    DATA=cloudWrap(created.player);cloudSetRevision(created.id,created.revision||1);cloudCommit('account',created.id);save();cloudClose();go('town');
  }catch(e){cloudTell(e.status===422&&e.message?e.message:'The farm was not saved. This device was not changed.')}
  finally{cloudBusy=false}
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
    if(how==='cache'){const data=JSON.parse(localStorage.getItem('hmf-account-cache-'+id)||'null');if(!data||!data.players)throw new Error('cache');DATA=data;cloudCommit('account',id);save()}
    else{const state=await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id),{auth:true});if(!state||!state.player)throw new Error('empty');DATA=cloudWrap(state.player);cloudSetRevision(id,state.revision||0);cloudCommit('account',id);save()}
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
async function cloudRunSync(policy,reuse){
  if(cloudBusy||DLG)return;const c=cloudRead();
  if(c.mode!=='account'||!c.childId){cloudTell('Open a saved farm before syncing.');return}
  if(!cloudToken()){cloudLogin();return}
  const material=cloudMaterial();let key=cloudLastKey;
  if(!(reuse&&key&&cloudLastMaterial===material)){key=cloudId();cloudLastKey=policy==='upload'?key:null;cloudLastMaterial=material}
  cloudBusy=true;
  try{
    const res=await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(c.childId)+'/sync',{method:'POST',auth:true,json:{idempotencyKey:key,baseRevision:cloudRevision(c.childId),policy,player:cur()}});
    cloudLastKey=null;cloudLastMaterial=null;
    if(res.status==='conflict'){cloudPending=res;cloudDrawConflict(res);return}
    if((res.status==='synced'||res.status==='unchanged'||res.status==='server')&&res.player)cloudAdopt(res.player,res.revision);
    cloudClose();cloudRefresh();
    const notes=(res.notes||[]).filter(Boolean);
    if(notes.length)dialog(MAYOR,[res.status==='unchanged'?'Already up to date.':'Synced.'].concat(notes.slice(0,4)));
    else cloudTell(res.status==='unchanged'?'Already up to date.':'Synced.');
  }catch(e){
    if(e.status){cloudLastKey=null;cloudLastMaterial=null}
    if(e.status===401){const c2=cloudRead();c2.session=null;cloudWrite(c2);cloudTell('Please sign in again. This farm is still on this device.')}
    else cloudTell(e.status===422&&e.message?e.message:'Sync did not finish. This farm is still on this device.');
  }finally{cloudBusy=false}
}
function cloudKeepServer(){
  const res=cloudPending;if(!res||!res.serverPlayer){cloudClose();cloudTell('The saved farm is empty. This device was not changed.');return}
  cloudAdopt(res.serverPlayer,res.revision);cloudPending=null;cloudClose();cloudRefresh();cloudTell('Opened the saved farm. This device now matches it.');
}
Object.assign(ACT,{
  cloudLogin:()=>cloudLogin(),cloudLogout:()=>cloudLogout(),cloudSync:()=>cloudRunSync('upload',true),cloudChildren:()=>cloudShowChildren(),
  cloudCreate:d=>cloudAskCreate(d.id),cloudCreateEmpty:()=>cloudAskCreate(''),cloudCreateYes:()=>cloudCreateYes(),
  cloudOpen:d=>cloudAskOpen(d.id),cloudOpenYes:()=>cloudOpenYes(),cloudAskGuest:()=>cloudAskGuest(),cloudUseGuest:()=>cloudUseGuest(),
  cloudKeepLocal:()=>{cloudClose();cloudRunSync('keep_local',false)},cloudKeepServer:()=>cloudKeepServer(),cloudMerge:()=>{cloudClose();cloudRunSync('merge',false)},
  cloudClose:()=>cloudClose()
});
