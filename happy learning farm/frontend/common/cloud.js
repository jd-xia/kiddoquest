/* Accounts and saving. Signing in with Google is required to play, and the farm server is the one true copy:
   - Opening a child's farm always loads it from the server first (cloudOpenYes). This device's copy is only
     a cache for moving between pages.
   - Every save() is sent to the server a moment later (cloudQueuePush), and before leaving a page (navTo
     waits for it). An upload names the revision it started from; if the server has moved on (another device),
     the server's copy wins and this device takes it (cloudPush). Nothing is ever overwritten by guessing which
     copy is newer.
   Only one screen plays a farm at a time; opening it elsewhere says which account and device has it and signs
   that device out. A farm played without signing in (older versions) waits in hmf-guest-backup until it is
   saved to an account; it is never played. */
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
/* Called by save(): keeps the page-to-page cache, marks the farm as not yet on the server, and sends it soon. */
function cloudRememberActive(){
  try{const c=cloudRead();if(c.mode!=='account'||!c.childId)return;
    localStorage.setItem('hmf-account-cache-'+c.childId,JSON.stringify(DATA));
    if(!cloudScreenOff&&cloudMaterial()!==cloudSavedMaterial){cloudSetDirty(c.childId,true);cloudQueuePush()}}catch(e){}
}
function cloudStatusLine(){return cloudIsAccount()?'Your farm is saved on the farm server a moment after every change.':'Sign in with Google to play. Your farm is saved on the farm server.'}
function cloudTopActions(){return cloudIsAccount()?'<button class="pill" data-act="cloudSync" aria-label="Save this farm on the farm server now">☁️ Save</button>':''}
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
  return `<p class="syncnote">${esc(cloudSyncNotice())}</p><div class="players">${cloudKidList.map(ch=>{const when=cloudStamp(ch.updatedAt)?cloudWhen(ch.updatedAt):'';return `<div class="playerrow"><button class="player" data-act="cloudSwitch" data-id="${esc(ch.id)}"><div class="e">${cloudLookEmoji(ch.look)}</div><div class="nm">${esc(ch.displayName)}</div>${ch.username?`<div class="pcode">${esc(ch.username)}</div>`:''}<div class="muted"><span class="tag good">${esc(typeof gradeName==='function'?gradeName(ch.grade):ch.grade||'')}</span>${ch.main?' · ⭐ Main':''}${ch.id===active?' · Playing now':''}${when?` · Last sync ${esc(when)}`:' · Not synced yet'}</div></button><button class="b ghost sm" data-act="cloudCloseAsk" data-id="${esc(ch.id)}">Close</button></div>`}).join('')}</div><div class="row"><button class="b ghost sm" data-act="famOpen">👪 Parent settings</button><button class="b ghost sm" data-act="cloudDeviceAsk">💻 ${esc(cloudDeviceName())}</button></div>`;
}
function cloudSaveLocalHtml(){
  if(!cloudToken()||!cloudKidList||!cloudRoom())return '';
  const locals=cloudUnsavedLocals().slice(0,cloudRoom());
  if(!locals.length)return '';
  return `<div class="row">${locals.map(p=>`<button class="b ghost" data-act="cloudCreate" data-id="${esc(p.id)}">Save ${esc(p.name)} to this account</button>`).join('')}</div>`;
}
function cloudBarHtml(){
  const c=cloudRead(),signed=!!cloudToken(),label=c.session&&(c.session.email||c.session.displayName),who=signed&&label?`Signed in as ${esc(label)}. `:'';
  if(c.mode==='account')return `<div class="cloudbar"><h3>Saved farm</h3><p class="syncnote">${esc(cloudSyncNotice(c.childId))}</p><p class="muted">${who}Your farm is saved on the farm server a moment after every change.</p><div class="row">
    <button class="b" data-act="cloudSync">☁️ Save now</button><button class="b ghost" data-act="cloudChildren">Saved farms</button><button class="b ghost" data-act="cloudCloseCurrent">Close this child</button>
    ${signed?'<button class="b ghost" data-act="cloudSwitchAccount">Switch account</button><button class="b ghost" data-act="cloudLogout">Sign out</button>':'<button class="b" data-act="cloudLogin">Sign in</button>'}</div></div>`;
  return `<div class="cloudbar"><h3>Account</h3><p class="muted">${who}Every farm is saved on the farm server. ${signed?'Tap a child to play.':'Sign in to play.'}</p><div class="row">
    ${signed?'<button class="b ghost" data-act="cloudSwitchAccount">Switch account</button><button class="b ghost" data-act="cloudLogout">Sign out</button>':'<button class="b" data-act="cloudLogin">Sign in with Google</button>'}</div></div>`;
}
function cloudId(){if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();return ('k'+Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).slice(0,32)}
function cloudMaterial(){try{return JSON.stringify(cur()||null)}catch(e){return ''}}
function cloudBrief(p){if(!p)return 'empty';return (p.name||'Farm')+' · 🪙 '+(p.gems||0)+' · ⭐ '+(typeof totalStars==='function'?totalStars(p):0)}
function cloudTell(text){if($('#toast')){toast(text);return}const el=$('#dlg');if(!el||DLG)return;el.className='show';el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Farm</div><p>${esc(text)}</p><div class="dlg-btns"><button class="b sm" data-act="cloudClose">OK</button></div></div></div>`}
function cloudClose(){if(DLG||cloudScreenOff)return;cloudPickingAccount=false;const el=$('#dlg');if(!el)return;el.className='';el.innerHTML=''}
function cloudRefresh(){if(typeof render==='function'&&typeof SCREENS!=='undefined'&&UI&&SCREENS[UI.screen])render();else if(typeof go==='function')go('town')}
function cloudWrap(player){const p=JSON.parse(JSON.stringify(player));return {v:2,updated:Date.now(),current:p.id,players:[p]}}
function cloudStash(){const c=cloudRead();if(c.mode==='account'&&c.childId)localStorage.setItem('hmf-account-cache-'+c.childId,JSON.stringify(DATA))}   // with no farm open DATA is empty: the guest backup is left alone
function cloudCommit(mode,childId){const c=cloudRead();c.mode=mode;c.childId=childId||null;cloudWrite(c);
  if(mode==='account'&&childId&&c.session&&c.session.userId)try{localStorage.setItem('hmf-last-child-'+c.session.userId,childId)}catch(e){}}   // checked at the next sign-in (cloudSweepClosed)
function cloudAdopt(player,revision){const id=cloudRead().childId;const code=cloudPlayerCode(typeof cur==='function'?cur():null);DATA=cloudWrap(cloudKeepCode(player,(player&&player.code)||code));if(id)cloudSetRevision(id,revision||0);save()}
let cloudBusy=false,cloudCreateId='',cloudOpenId='',cloudPickingAccount=false,cloudSavedMaterial=null,cloudAutoHold=false,cloudScreenOff=false;
async function cloudFetch(url,opts){
  const ms=opts&&opts.timeoutMs||20000;
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),ms),headers={Accept:'application/json'};
  if(opts.json)headers['Content-Type']='application/json';
  if(opts.auth){const token=cloudToken();if(!token){const err=new Error('Sign in is required');err.status=401;throw err}headers.Authorization='Bearer '+token}
  try{
    const res=await fetch(url,{method:opts.method||'GET',headers,body:opts.json?JSON.stringify(opts.json):undefined,signal:ctrl.signal});
    const text=await res.text();let body=null;try{body=text?JSON.parse(text):null}catch(e){}
    if(!res.ok){const err=new Error(body&&body.message||'Request failed');err.status=res.status;err.code=body&&body.error||'';throw err}
    return body;
  }finally{clearTimeout(timer)}
}
function cloudLoadGsi(){
  if(window.google&&google.accounts&&google.accounts.id)return Promise.resolve();
  return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=()=>resolve();s.onerror=()=>reject(new Error('gsi'));document.head.appendChild(s)});
}
function cloudLogin(){
  if(DLG)return;const cfg=cloudConfig();
  if(!cfg.googleClientId){dialog(MAYOR,['Sign-in is not set up on this copy of the farm yet.','Ask a grown-up to add the Google client id in cloud-config.js.']);return}
  if(!cfg.authBase){dialog(MAYOR,['This published farm does not have the laptop address yet.','Add the https address in cloud-config.js.']);return}
  cloudLoadGsi().then(()=>{const el=$('#dlg');if(!el)return;const email=cloudRead().session&&cloudRead().session.email;el.className='show';el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">${cloudPickingAccount?'Switch account':'Sign in'}</div>
    <p>${cloudPickingAccount?`Choose a different email.${email?` <b>${esc(email)}</b> stays on this account.`:''} An email that is already linked cannot be moved.`:cloudIsAccount()?'Sign in again to keep saving this farm. Nothing you did is lost.':'Sign in with Google to open your farm. Every farm is saved on the farm server.'}</p>
    <div id="gsi"></div>
    <div class="dlg-btns"><button class="b ghost sm" data-act="cloudClose">Not now</button></div></div></div>`;
    google.accounts.id.initialize({client_id:cfg.googleClientId,auto_select:false,callback:resp=>{if(resp&&resp.credential)cloudExchange(resp.credential)}});
    google.accounts.id.disableAutoSelect();
    google.accounts.id.renderButton(document.getElementById('gsi'),{theme:'filled_blue',size:'large',text:'signin_with',width:280});
  }).catch(()=>cloudTell('Google sign-in did not load. Check the network and try again.'));
}
/* No farm is open: this tab shows only the sign-in and kids screens. */
function cloudEmpty(){return {v:3,updated:Date.now(),current:null,players:[]}}
function cloudDetachAccount(){
  const c=cloudRead();
  if(c.mode==='account'&&c.childId){
    cloudStash();
    DATA=cloudEmpty();try{localStorage.setItem(LS,JSON.stringify(DATA))}catch(e){}
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
    if(prev.session&&prev.session.userId===userId&&cloudIsAccount()){   // the sign-in ran out while playing
      const open=cloudRead().childId;
      try{const list=await cloudFetch(cloudConfig().dataBase+'/api/v1/children',{auth:true});cloudRememberKids(list||[]);
        if(!(list||[]).some(ch=>ch&&ch.id===open)){cloudChildGone(open);return}}catch(e){}
      cloudClose();cloudFlush();cloudTell('Signed in again. Your farm is saving.');return}
    await cloudAfterSignIn();
  }catch(e){cloudPickingAccount=false;cloudTell(e.status===409&&e.message?e.message:(e.status===503?'Google sign-in is not configured on the server. This farm was not changed.':'Sign-in did not finish. This account was not changed.'))}
}
/* After signing in: load this account's kids from the farm server, then show who is playing. Tapping a child
   loads that farm from the server (cloudOpenYes) and only then enters it. With no kids yet, the same screen
   asks for the first one. */
async function cloudAfterSignIn(){
  cloudClose();
  const el=$('#app');if(el&&UI&&UI.screen==='players')el.innerHTML='<div class="boot"><span class="coin">🌾</span><p>Loading your farms…</p></div>';
  cloudKidLoading=true;
  let gone=[];
  try{const list=await cloudFetch(cloudConfig().dataBase+'/api/v1/children',{auth:true});cloudRememberKids(list||[]);cloudStampListedCode(list||[]);gone=cloudSweepClosed(list||[])}
  catch(e){cloudKidList=null;cloudKidStamp=0}   // the players screen loads them again and says so
  finally{cloudKidLoading=false}
  if(typeof go==='function')go('players');else if(typeof rPlayers==='function')rPlayers();
  if(gone.length)cloudTell(`${gone.join(' and ')} ${gone.length>1?'were':'was'} closed, so ${gone.length>1?'they are':'it is'} gone from this device too. Pick who is playing.`);
}
/* A child closed on another device (or earlier) is forgotten here too: the farm that was open on this device,
   and the last child this account opened here, if the server's list no longer has them. Returns their names. */
function cloudSweepClosed(list){
  const c=cloudRead(),uid=c.session&&c.session.userId,ids=new Set();
  if(c.mode==='account'&&c.childId)ids.add(c.childId);
  try{const last=uid&&localStorage.getItem('hmf-last-child-'+uid);if(last)ids.add(last)}catch(e){}
  const names=[];
  for(const id of ids){
    if(list.some(ch=>ch&&ch.id===id))continue;
    names.push(cloudGoneName(id));cloudForgetRemote(id);
  }
  return names;
}
function cloudGoneName(id){
  try{const d=JSON.parse(localStorage.getItem('hmf-account-cache-'+id)||'null'),p=d&&d.players&&d.players[0];if(p&&p.name)return p.name}catch(e){}
  const p=cloudRead().childId===id&&typeof cur==='function'?cur():null;return p&&p.name||'That farm';
}
/* The farm server no longer has this child (it was closed): forget it on this device and show who is playing. */
function cloudChildGone(id){
  if(!id)return;
  const name=cloudGoneName(id),open=cloudRead().childId===id;
  if(open&&typeof hallDrop==='function')hallDrop();
  cloudForgetRemote(id);cloudKidStamp=0;
  const msg=`${name} was closed, so it is gone from this device too. Pick who is playing.`;
  cloudClose();
  if(typeof SCREENS!=='undefined'&&SCREENS.players&&typeof go==='function'){go('players');cloudTell(msg)}
  else{try{sessionStorage.setItem('hmf-left',msg)}catch(e){}if(typeof go==='function')go('players')}   // the next page says it (cloudBoot)
}
async function cloudLogout(){
  if(cloudIsAccount()&&cloudToken()&&!(await cloudFlush(8000))){cloudTell('The farm server did not answer, so you are still signed in. Your last change is not saved yet. Check the network and try again.');return}   // never sign out with a change that is only on this device
  {const c0=cloudRead();if(c0.mode==='account'&&c0.childId&&cloudScreenFarm()===c0.childId)cloudReleaseScreen(c0.childId)}   // while still signed in
  if(typeof hallDrop==='function')hallDrop();try{sessionStorage.removeItem('hmf-screen-farm')}catch(e){}
  cloudDetachAccount();const c=cloudRead();c.session=null;c.mode='guest';c.childId=null;cloudWrite(c);cloudKidList=null;cloudKidStamp=0;cloudClose();cloudTell('Signed out. Your farm is saved on the farm server.');if(typeof go==='function')go('players');else if(typeof rPlayers==='function')rPlayers()}
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
/* Everything this device kept for one saved child: its farm copy, sync marks, club, Brain Boost results and screen. */
function cloudForgetRemote(childId){
  ['hmf-account-cache-','hmf-rev-','hmf-sync-at-','hmf-sync-base-','hmf-dirty-','hmf-club-','hmf-bb-state-','hmf-bb-queue-','hmf-screen-'].forEach(p=>{try{localStorage.removeItem(p+childId)}catch(e){}});
  try{const uid=cloudRead().session&&cloudRead().session.userId;if(uid&&localStorage.getItem('hmf-last-child-'+uid)===childId)localStorage.removeItem('hmf-last-child-'+uid);
    if(sessionStorage.getItem('hmf-screen-farm')===childId)sessionStorage.removeItem('hmf-screen-farm')}catch(e){}
  const localId=cloudLocalIdFor(childId);
  const links=cloudLinks();
  Object.keys(links).forEach(k=>{if(links[k]===childId||k===localId)delete links[k]});
  try{localStorage.setItem(cloudLinkKey(),JSON.stringify(links))}catch(e){}
  if(localId)cloudWipeArt(localId);
  const c=cloudRead();
  if(c.mode==='account'&&c.childId===childId){
    DATA=cloudEmpty();
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
  const rows=(cloudKidList||[]).map(ch=>{const when=cloudStamp(ch.updatedAt)?cloudWhen(ch.updatedAt):'Not synced yet';return `<div class="playerrow"><button class="player" data-act="cloudSwitch" data-id="${esc(ch.id)}"><div class="nm">${esc(ch.displayName)}</div>${ch.username?`<div class="pcode">${esc(ch.username)}</div>`:''}<div class="muted">${esc(typeof gradeName==='function'?gradeName(ch.grade):ch.grade||'')}${ch.main?' · ⭐ Main':''} · Last sync ${esc(when)}</div></button><button class="b ghost sm" data-act="cloudCloseAsk" data-id="${esc(ch.id)}">Close</button></div>`}).join('')||'<p class="muted">No kids on this account yet.</p>';
  const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg cloudpick"><div style="flex:1"><div class="dlg-name">Kids on this account</div>
    <p class="syncnote">${esc(cloudSyncNotice())}</p>
    <p class="muted">One Google account keeps up to ${CLOUD_KID_MAX} kids. Each farm is loaded from the farm server when it opens and saved there after every change. A farm plays on one device at a time.</p><div class="players">${rows}</div>
    ${room?'':`<p class="muted">This Google account already has its ${CLOUD_KID_MAX} kids.</p>`}
    <div class="dlg-btns">${saves}${room?'<button class="b ghost sm" data-act="cloudCreateEmpty">Add a child</button>':''}
    <button class="b ghost sm" data-act="famOpen">👪 Parent</button>
    <button class="b ghost sm" data-act="cloudDeviceAsk">💻 ${esc(cloudDeviceName())}</button>
    <button class="b ghost sm" data-act="cloudSwitchAccount">Switch account</button>
    <button class="b ghost sm" data-act="cloudClose">Not now</button></div></div></div>`;
}
function cloudAskCreate(id){
  cloudCreateId=id||'';const p=id?cloudFindLocal(id):null;const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Save a farm</div>
    <p>${p?`Save <b>${esc(p.name)}</b> to this account and play it now?`:'Create an empty farm on this account and play it now?'}</p>
    <p class="muted">From then on it is saved on the farm server.</p>
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
    DATA=cloudWrap(cloudKeepCode(created.player,created.username));cloudCommit('account',created.id);cloudMarkSynced(created.id,created.revision||1);save();
    await cloudClaimScreen(created.id,true);cloudClose();go('town');
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
/* Does this farm belong to that child? Checked with the player code (P0000003), else the name.
   An older bug could save one child's farm under another child's name; such a copy is not used. */
function cloudFarmFits(id,data){
  const p=data&&data.players&&data.players[0];if(!p)return false;
  const ch=(cloudKidList||[]).find(k=>k&&k.id===id);if(!ch)return true;
  if(cloudCodeOk(p.code)&&cloudCodeOk(ch.username))return p.code===ch.username;
  return !ch.displayName||p.name===ch.displayName;
}
function cloudCacheOf(id){try{const d=JSON.parse(localStorage.getItem('hmf-account-cache-'+id)||'null');return d&&d.players&&cloudFarmFits(id,d)?d:null}catch(e){return null}}
/* Open here means this tab took the farm too: a second tab shares the first tab's farm in localStorage,
   but must still take it (asking about the other screen) before it plays. */
const cloudIsOpen=id=>{const c=cloudRead();return c.mode==='account'&&c.childId===id&&cloudScreenFarm()===id&&!cloudScreenOff&&typeof DATA!=='undefined'&&cloudFarmFits(id,DATA)};
/* Opening a farm never stops without a reason: each step is written to the console as [farm-open]. */
function cloudOpenLog(...a){try{console.info('[farm-open]',...a)}catch(e){}}
async function cloudSwitch(id){
  cloudOpenLog('tap',id,{mode:cloudRead().mode,open:cloudRead().childId,tabFarm:cloudScreenFarm(),stopped:cloudScreenOff,busy:cloudBusy,signedIn:!!cloudToken()});
  if(!id)return;
  if(cloudIsOpen(id)){cloudOpenLog('already open in this tab: showing it');cloudClose();go('town');return}
  cloudOpenId=id;
  await cloudOpenYes();
}
function cloudAskOpen(id){return cloudSwitch(id)}
/* Opens a child's farm from the server, never from this device's copy. If this device still holds a change
   that never reached the server (the network dropped last time) and the server has not moved on since, that
   change is sent first; otherwise the server's copy wins. */
async function cloudOpenYes(){
  if(cloudBusy){cloudOpenLog('stopped: a save is still running');cloudTell('Still saving. Tap the farm again in a moment.');return}
  if(!cloudToken()){cloudLogin();return}
  const id=cloudOpenId;
  cloudOpenLog('opening',id,'from the farm server');
  const was=cloudRead(),prev=was.mode==='account'?was.childId:null,owned=!!prev&&cloudScreenFarm()===prev;   // before the claim changes it
  if(prev&&prev!==id&&!(await cloudFlush(8000))){cloudTell('The last farm is not saved yet. Check the network and try again.');return}
  if(!(await cloudClaimScreen(id))){cloudOpenLog('stopped: left on the other device');return}   // the child chose to leave it there
  cloudBusy=true;
  try{
    const c=cloudRead();
    if(!(c.mode==='account'&&c.childId&&!cloudFarmFits(c.childId,DATA)))cloudStash();   // never file one child's farm under another child
    const url=cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id);
    let state=await cloudFetch(url,{auth:true});
    if(!state||!state.player)throw new Error('empty');
    const left=cloudDirty(id)?cloudCacheOf(id):null,mine=left&&left.players[0];
    if(mine&&cloudRevision(id)===(Number(state.revision)||0)){   // the server is still where this change started
      cloudOpenLog('sending the change this device kept from last time');
      const res=await cloudFetch(url+'/sync',{method:'POST',auth:true,json:{idempotencyKey:cloudId(),baseRevision:cloudRevision(id),policy:'upload',player:mine,screen:cloudScreenId()}});
      if(res&&res.status==='synced'&&res.player)state=Object.assign({},state,{player:res.player,revision:res.revision});
    }
    DATA=cloudWrap(cloudKeepCode(state.player,state.username));cloudLink(state.player.id,id);cloudCommit('account',id);
    cloudMarkSynced(id,state.revision||0);save();
    cloudOpenLog('opened',id,'revision',state.revision);cloudFarmChanged(prev,owned);cloudClose();go('town');
  }catch(e){console.warn('Farm did not open:',id,e);if(e.status===404){cloudBusy=false;cloudChildGone(id);return}cloudTell(e.status===401?'Please sign in again.':'That farm did not open. The farm server did not answer. Try again in a moment.')}
  finally{cloudBusy=false}
}
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
function cloudBaseKey(id){return 'hmf-sync-base-'+id}
function cloudReadBase(id){try{return localStorage.getItem(cloudBaseKey(id))}catch(e){return null}}
function cloudWriteBase(id,material){if(!id)return;try{localStorage.setItem(cloudBaseKey(id),material==null?cloudMaterial():material)}catch(e){}}
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
  cloudSavedMaterial=mat;cloudWriteBase(id,mat);cloudSetDirty(id,false);
}
/* ---------- saving: every change goes to the farm server ----------
   hmf-dirty-<child> is set while this device has a change the server does not have yet. It survives a page
   change or a closed tab, so the change is sent from the next page (or the next time the farm opens). */
function cloudDirty(id){try{return !!id&&localStorage.getItem('hmf-dirty-'+id)==='1'}catch(e){return false}}
function cloudSetDirty(id,on){if(!id)return;try{if(on)localStorage.setItem('hmf-dirty-'+id,'1');else localStorage.removeItem('hmf-dirty-'+id)}catch(e){}}
let cloudPushTimer=null,cloudPushing=null,cloudRetry=2000,cloudNeedShown=false;
function cloudQueuePush(ms){clearTimeout(cloudPushTimer);cloudPushTimer=setTimeout(()=>{cloudPushTimer=null;cloudPush()},ms==null?1200:ms)}
/* Sends this farm to the server with the revision it started from. synced: the server has it. conflict:
   another device saved first, so the server's copy wins and this device takes it. Resolves true when the
   server answered. */
function cloudPush(){
  if(cloudPushing)return cloudPushing;   // one save at a time; a change made meanwhile is sent right after
  const c=cloudRead(),id=c.childId;
  if(c.mode!=='account'||!id||cloudScreenOff||!cloudDirty(id))return Promise.resolve(true);
  if(cloudScreenFarm()!==id)return Promise.resolve(false);   // this tab has not opened the farm yet
  if(!cloudToken()){cloudNeedSignIn();return Promise.resolve(false)}
  const player=typeof cur==='function'?cur():null,material=cloudMaterial();
  if(!player)return Promise.resolve(false);
  cloudPushing=(async()=>{
    try{
      const res=await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id)+'/sync',{method:'POST',auth:true,json:{idempotencyKey:cloudId(),baseRevision:cloudRevision(id),policy:'upload',player,screen:cloudScreenId()}});
      cloudRetry=2000;
      if(cloudRead().childId!==id)return true;
      if(res.status==='conflict'){
        if(res.serverPlayer){cloudAdopt(res.serverPlayer,res.revision);cloudMarkSynced(id,res.revision);cloudRefresh()}
        cloudTell('This farm was saved on another device first, so the farm from the server is shown now.');
        return true;
      }
      cloudSetRevision(id,res.revision);
      if(cloudMaterial()===material)cloudMarkSynced(id,res.revision,material);
      else{cloudRememberSync(id);cloudPaintId();cloudQueuePush(300)}   // more changed while this was on its way
      return true;
    }catch(e){
      if(e.code==='screen_taken'){cloudScreenGone();return false}
      if(e.status===401){cloudNeedSignIn();return false}
      if(e.status===404){cloudChildGone(id);return false}   // closed on another device: nothing to save it to
      if(e.status===422){cloudRetry=30000;cloudTell(e.message||'The farm server did not take this change.')}
      cloudQueuePush(cloudRetry);cloudRetry=Math.min(30000,cloudRetry*2);   // offline or busy: try again later
      return false;
    }finally{cloudPushing=null}
  })();
  return cloudPushing;
}
/* Waits up to ms until the farm's last change is on the server. true: nothing is left to send. */
async function cloudFlush(ms){
  const id=cloudIsAccount()?cloudRead().childId:null;if(!id)return true;
  clearTimeout(cloudPushTimer);cloudPushTimer=null;
  const end=Date.now()+(ms||5000);
  while(cloudDirty(id)&&Date.now()<end&&!cloudScreenOff&&cloudToken()){
    const ok=await Promise.race([cloudPush(),new Promise(r=>setTimeout(()=>r(false),Math.max(0,end-Date.now())))]);
    if(!ok)await new Promise(r=>setTimeout(r,400));
  }
  return !cloudDirty(id);
}
/* The sign-in ran out (or was refused). Changes stay marked and are sent after signing in again. */
function cloudNeedSignIn(){
  const c=cloudRead();if(c.session&&c.session.expiresAt!==1){c.session.expiresAt=1;cloudWrite(c)}   // keep who it was, so signing in again continues this farm
  if(cloudNeedShown)return;cloudNeedShown=true;setTimeout(()=>{cloudNeedShown=false},60000);
  cloudLogin();
}
/* Page start (and ☁️ Save now): send any change this device kept, then make sure this device has the server's
   revision. If the server has a different revision, its copy is the farm. */
async function cloudCheckServer(manual){
  const c=cloudRead(),id=c.childId;
  if(c.mode!=='account'||!id||cloudScreenOff)return;
  if(!cloudToken()){if(manual)cloudLogin();else if(cloudDirty(id))cloudNeedSignIn();return}
  if(cloudScreenFarm()!==id)return;
  if(cloudDirty(id)){await cloudPush();if(cloudDirty(id)){if(manual)cloudTell('The farm server did not answer. Your change is kept here and is sent as soon as it answers.');return}}
  try{
    const state=await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id),{auth:true});
    if(cloudRead().childId!==id||cloudDirty(id))return;   // a newer change is on its way
    const rev=Number(state&&state.revision)||0;
    if(state&&state.player&&rev!==cloudRevision(id)){
      cloudAdopt(cloudKeepCode(state.player,state.username),rev);cloudMarkSynced(id,rev);cloudRefresh();
      if(!manual&&$('#toast'))toast('Loaded the newest farm from the farm server.');
    }else cloudMarkSynced(id,rev);
    if(manual){cloudClose();cloudTell('Saved. Your farm is on the farm server (revision '+rev+').')}
  }catch(e){
    if(e.status===401)cloudNeedSignIn();
    else if(e.status===404)cloudChildGone(id);   // closed on another device
    else if(manual)cloudTell('The farm server did not answer. Try again in a moment.');
  }
}
function cloudSyncNow(){if(DLG)return;if(!cloudIsAccount()){cloudTell('Open a saved farm first.');return}return cloudCheckServer(true)}
function cloudBoot(){
  cloudLoadKids();cloudPaintId();
  let left=null;try{left=sessionStorage.getItem('hmf-left');sessionStorage.removeItem('hmf-left')}catch(e){}
  if(left)cloudTell(left);   // another device took the farm (cloudLostFarm)
  if(cloudIsAccount())cloudStartScreen().then(()=>cloudCheckServer());
}
/* A safety net for a save that failed, and a save when the page goes into the background. */
setInterval(()=>{if(!cloudPushTimer&&!cloudPushing&&cloudIsAccount()&&cloudDirty(cloudRead().childId))cloudPush()},20000);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&cloudIsAccount()){clearTimeout(cloudPushTimer);cloudPushTimer=null;cloudPush()}});
/* Leaving a page waits (a few seconds at most) until the last change is on the server. */
let cloudLeaving=false;
{const keepNav=navTo;navTo=function(file,nav){
  const id=cloudIsAccount()?cloudRead().childId:null;
  if(!id||!cloudDirty(id)||cloudScreenOff||!cloudToken())return keepNav(file,nav);
  if(cloudLeaving)return;cloudLeaving=true;
  if($('#toast'))toast('Saving your farm…');
  cloudFlush(4000).then(()=>{cloudLeaving=false;keepNav(file,nav)});
}}
/* The tab is closing with a change still unsent: one last try that outlives the page. If it did not arrive,
   the change is still marked and is sent next time. */
window.addEventListener('pagehide',()=>{
  const c=cloudRead(),id=c.childId,token=cloudToken();
  if(c.mode!=='account'||!id||!cloudDirty(id)||cloudPushing||cloudScreenOff||!token||typeof cur!=='function'||!cur())return;
  try{
    const body=JSON.stringify({idempotencyKey:cloudId(),baseRevision:cloudRevision(id),policy:'upload',player:cur(),screen:cloudScreenId()});
    if(body.length<60000)fetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id)+'/sync',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:'Bearer '+token},body});
  }catch(e){}
});
/* Signing in is required to play: with no farm open, this page holds no farm at all. A farm from an older
   version that was played without signing in is kept in hmf-guest-backup, to be saved to an account. */
(function cloudGuestAside(){
  if(cloudIsAccount()&&!cloudToken()){
    /* The page opened without a valid sign-in (signed out, or the sign-in ran out): back to the sign-in page.
       This device's copy and its "not on the server yet" mark stay, so a change that was not sent yet goes
       up when the farm is opened again after signing in (cloudOpenYes). */
    const c=cloudRead();
    try{localStorage.setItem('hmf-account-cache-'+c.childId,JSON.stringify(DATA));sessionStorage.removeItem('hmf-screen-farm')}catch(e){}
    c.mode='guest';c.childId=null;cloudWrite(c);
    DATA=cloudEmpty();try{localStorage.setItem(LS,JSON.stringify(DATA))}catch(e){}
    return;
  }
  if(cloudIsAccount()){cloudSavedMaterial=cloudReadBase(cloudRead().childId);return}
  const players=(DATA&&DATA.players)||[];
  if(players.length&&DATA.updated){   // updated 0: the sample farms of a new device, never played
    try{
      const keep=JSON.parse(localStorage.getItem('hmf-guest-backup')||'null')||{v:3,updated:Date.now(),current:null,players:[]};
      keep.players=keep.players||[];
      players.forEach(p=>{if(p&&p.id&&!keep.players.some(q=>q&&q.id===p.id))keep.players.push(p)});
      localStorage.setItem('hmf-guest-backup',JSON.stringify(keep));
    }catch(e){return}   // could not set it aside: leave this device's data as it is
  }
  DATA=cloudEmpty();try{localStorage.setItem(LS,JSON.stringify(DATA))}catch(e){}
})();
/* ---------- one screen per farm ----------
   A screen is one browser tab; its id stays in sessionStorage, so it follows the tab from page to page.
   The newest screen to open a child's farm takes it (POST /children/{id}/screen). An older screen of the
   same child, on this computer or another one, sees that within 10 seconds (at once in this browser),
   stops saving and offers to play here instead. The server refuses syncs from a screen that lost the farm. */
function cloudScreenId(){try{let s=sessionStorage.getItem('hmf-screen');if(!s){s=cloudId().replace(/[^A-Za-z0-9_-]/g,'').slice(0,40);sessionStorage.setItem('hmf-screen',s)}return s}catch(e){return null}}
function cloudScreenFarm(){try{return sessionStorage.getItem('hmf-screen-farm')}catch(e){return null}}
/* A screen that synced or counted play time within 2 minutes is still in use. */
const CLOUD_SCREEN_LIVE=120000;
/* A page cannot read the computer's host name, so each device can be given a name ("Dad's MacBook").
   Without one it is the browser and system, like "Safari on Mac". */
function cloudDeviceName(){
  try{const n=localStorage.getItem('hmf-device-name');if(n)return n.slice(0,80)}catch(e){}
  return cloudDeviceGuess();
}
function cloudAskDeviceName(){
  const el=$('#dlg');if(!el)return;el.className='show';
  let mine='';try{mine=localStorage.getItem('hmf-device-name')||''}catch(e){}
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">💻 Name this device</div>
    <p>When this device has a farm open and another device opens it, the other device shows this name.</p>
    <div class="row"><input id="devname" type="text" maxlength="40" placeholder="${esc(cloudDeviceGuess())}" value="${esc(mine)}"></div>
    <p class="muted">For example Dad's MacBook or Living room PC. Leave it empty to use ${esc(cloudDeviceGuess())}.</p>
    <div class="dlg-btns"><button class="b sm" data-act="cloudDeviceSave">Save</button><button class="b ghost sm" data-act="cloudClose">Cancel</button></div></div></div>`;
  const i=$('#devname');if(i){i.focus();i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();cloudSaveDeviceName()}})}
}
async function cloudSaveDeviceName(){
  const v=(($('#devname')||{}).value||'').trim().slice(0,40);
  try{if(v)localStorage.setItem('hmf-device-name',v);else localStorage.removeItem('hmf-device-name')}catch(e){}
  cloudClose();
  const id=cloudRead().childId;
  if(cloudIsAccount()&&cloudScreenFarm()===id&&!cloudScreenOff)await cloudClaimScreen(id,true);   // the open farm shows the new name at once
  if(UI&&UI.screen==='players'&&typeof rPlayers==='function')rPlayers();
  cloudTell('This device is now called '+cloudDeviceName()+'.');
}
function cloudDeviceGuess(){
  const u=navigator.userAgent||'';
  const b=/Edg\//.test(u)?'Edge':/OPR\//.test(u)?'Opera':/Firefox\//.test(u)?'Firefox':/Chrome\//.test(u)?'Chrome':/Safari\//.test(u)?'Safari':'Browser';
  const o=/iPad/.test(u)?'iPad':/iPhone/.test(u)?'iPhone':/Android/.test(u)?'Android':/Windows/.test(u)?'Windows':/Mac OS X/.test(u)?(navigator.maxTouchPoints>1?'iPad':'Mac'):/CrOS/.test(u)?'Chromebook':/Linux/.test(u)?'Linux':'';
  return (b+(o?' on '+o:'')).slice(0,80);
}
/* Takes the farm for this screen. If another device still uses it, asks first and says which account and
   device that is; false means the child chose to leave it there. force skips the question. */
async function cloudClaimScreen(id,force){
  const s=cloudScreenId();if(!id||!s||!cloudToken())return true;
  const url=cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id)+'/screen';
  try{
    if(!force){
      const st=await cloudFetch(url,{auth:true,timeoutMs:8000});
      const live=st&&st.screen&&st.screen!==s&&Date.now()-cloudStamp(st.seen||st.at)<CLOUD_SCREEN_LIVE;
      if(live&&!(await cloudAskTakeOver(id,st)))return false;
    }
    await cloudFetch(url,{method:'POST',auth:true,json:{screen:s,device:cloudDeviceName()},timeoutMs:8000});
    localStorage.setItem('hmf-screen-'+id,s);   // other tabs in this browser hear it at once
  }catch(e){cloudOpenLog('screen check failed, opening anyway',e.status||'',e.message)}   // an older farm server has no screens, or it is offline: the server still refuses a lost screen
  try{sessionStorage.setItem('hmf-screen-farm',id)}catch(e){}
  return true;
}
let cloudTakeOver=null;
function cloudAskTakeOver(id,st){return new Promise(res=>{
  const el=$('#dlg');if(!el){res(true);return}
  cloudTakeOver=res;
  const p=cloudRead().childId===id&&typeof cur==='function'?cur():null;   // page start: the kids list may not be loaded yet
  const k=(cloudKidList||[]).find(c=>c&&c.id===id)||(p&&{displayName:p.name,username:p.code});
  const name=(k?k.displayName:'This farm')+(k&&k.username?' ('+k.username+')':'');
  const mins=Math.max(0,Math.round((Date.now()-cloudStamp(st.seen||st.at))/60000));
  el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Already open on another device</div>
    <p><b>${esc(name)}</b> is still open somewhere else.</p>
    <p>Signed in as <b>${esc(st.email||'this Google account')}</b><br>Device: <b>${esc(st.device||'Unknown device')}</b>${st.ip?`<br>Network address: <b>${esc(st.ip)}</b>`:''}<br>Last active: <b>${mins?mins+' min ago':'just now'}</b> · ${esc(cloudWhen(st.seen||st.at))}</p>
    <p class="muted">To play here, that device is signed out of this farm. It stops and saves nothing more, and this device keeps the newer copy.</p>
    <div class="dlg-btns"><button class="b sm" data-act="cloudTakeYes">Sign out there and play here</button><button class="b ghost sm" data-act="cloudTakeNo">Cancel</button></div></div></div>`;
})}
function cloudTakeAnswer(yes){const r=cloudTakeOver;cloudTakeOver=null;cloudClose();if(r)r(yes)}
async function cloudCheckScreen(){
  if(cloudScreenOff||document.hidden||!cloudIsAccount()||!cloudToken())return;
  const id=cloudRead().childId,s=cloudScreenId();if(!s||cloudTakeOver||cloudScreenFarm()!==id)return;   // not opened in this tab yet: page start takes or asks
  try{
    const st=await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id)+'/screen',{auth:true,timeoutMs:8000});
    if(cloudRead().childId!==id)return;
    if(!st||!st.screen)await cloudClaimScreen(id,true);
    else if(st.screen!==s)cloudLostFarm(id,st);
  }catch(e){}
}
/* At page start: a farm this tab has not opened yet is taken now; one it opened before is checked. */
async function cloudStartScreen(){
  const id=cloudRead().childId;
  let force=false;try{force=sessionStorage.getItem('hmf-screen-force')==='1';sessionStorage.removeItem('hmf-screen-force')}catch(e){}
  if(cloudScreenFarm()===id)return cloudCheckScreen();
  if(!(await cloudClaimScreen(id,force))){cloudStopScreen('This farm stays on the other device. Nothing here was saved to it.');return}
  if(typeof famBeat==='function')famBeat();   // the time-left badge at once
}
function cloudStopScreen(why){
  if(cloudScreenOff)return;cloudScreenOff=true;cloudAutoHold=true;
  const who=typeof cur==='function'&&cur()?cur().name:'This farm';
  const el=$('#dlg');if(!el)return;el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Playing somewhere else</div>
    <p>${esc(why||who+' was opened on another screen.')}</p>
    <p class="muted">This screen stopped and saves nothing, so the two screens cannot overwrite each other. You can close it.</p>
    <div class="dlg-btns"><button class="b sm" data-act="cloudScreenHere">Play here instead</button></div></div></div>`;
}
/* Another screen took this farm. Another tab of this browser shares this tab's storage, so this tab only
   stops. Another device: this device leaves the farm for real and goes back to the kids list, saying who
   took it, so the two devices cannot keep grabbing the farm back from each other. */
function cloudLostFarm(id,st){
  const who=typeof cur==='function'&&cur()?cur().name:'This farm';
  const where=`${st&&st.device||'another device'}${st&&st.ip?' at '+st.ip:''}${st&&st.email?' ('+st.email+')':''}`;
  let sameBrowser=false;try{sameBrowser=!!st&&localStorage.getItem('hmf-screen-'+id)===st.screen}catch(e){}
  if(sameBrowser){cloudStopScreen('This farm was opened in another tab in this browser.');return}
  if(cloudScreenOff)return;cloudScreenOff=true;cloudAutoHold=true;
  try{
    localStorage.setItem('hmf-account-cache-'+id,JSON.stringify(DATA));   // this device's copy; the server's copy is loaded when it opens again
    localStorage.setItem(LS,JSON.stringify(cloudEmpty()));
    cloudCommit('guest',null);
    sessionStorage.removeItem('hmf-screen-farm');
    sessionStorage.setItem('hmf-left',`${who} was opened on ${where}, so this device left the farm. Tap a farm to play here again.`);
    sessionStorage.setItem('hmf-nav',JSON.stringify({screen:'players',extra:{}}));
  }catch(e){}
  location.replace('index.html');
}
async function cloudScreenGone(){
  const id=cloudRead().childId;
  try{cloudLostFarm(id,await cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id)+'/screen',{auth:true,timeoutMs:8000}))}
  catch(e){cloudStopScreen()}
}
/* This tab moved from one farm to another (or to the guest farm). The old farm's session ends: the server
   frees it, so another device can open it with no question, and the chat connection, which speaks as one
   child, closes and opens again as the new one. prev is the farm this tab had; owned: it had taken it. */
function cloudFarmChanged(prev,owned){
  const now=cloudIsAccount()?cloudRead().childId:null;
  if(prev&&prev!==now&&owned)cloudReleaseScreen(prev);
  if(!now)try{sessionStorage.removeItem('hmf-screen-farm')}catch(e){}
  if(typeof hallDrop==='function'&&typeof HALL!=='undefined'&&HALL.childId!==now){hallDrop();if(now&&typeof hallConnect==='function')hallConnect()}
  if(typeof FAM!=='undefined'){FAM.left=null;FAM.up=false;FAM.warned='';if(typeof famBadge==='function')famBadge()}
}
function cloudReleaseScreen(id){
  if(!id||!cloudToken())return;
  cloudFetch(cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(id)+'/screen?screen='+encodeURIComponent(cloudScreenId()),{method:'DELETE',auth:true,timeoutMs:8000})
    .then(()=>cloudOpenLog('left',id)).catch(e=>cloudOpenLog('leaving',id,'did not reach the server',e.status||'',e.message));
}
/* Takes the farm back: the page starts again, claims it, and compares with the saved farm as usual. */
function cloudScreenHere(){try{sessionStorage.removeItem('hmf-screen-farm');sessionStorage.setItem('hmf-screen-force','1')}catch(e){}location.reload()}
/* While stopped, this tab writes nothing, not even to localStorage, which other tabs share. */
{const keep=save;save=function(){if(cloudScreenOff)return;return keep.apply(this,arguments)}}
setInterval(cloudCheckScreen,10000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)cloudCheckScreen()});
window.addEventListener('storage',e=>{
  /* Every tab shares localStorage, so a browser shows one farm at a time. When another tab opens a
     different farm (or the guest farm), this tab stops instead of saving the old child under the new name. */
  if(e.key==='hmf-cloud'){
    const farm=v=>{try{const c=JSON.parse(v||'null');return c&&c.mode==='account'?'account|'+(c.childId||''):'guest'}catch(x){return 'guest'}};
    if(farm(e.oldValue)!==farm(e.newValue))cloudStopScreen('Another tab in this browser opened a different farm.');
    return;
  }
  const id=cloudIsAccount()&&cloudRead().childId;
  if(id&&e.key==='hmf-screen-'+id&&e.newValue&&e.newValue!==cloudScreenId()&&cloudScreenFarm()===id)cloudStopScreen('This farm was opened in another tab in this browser.');
});
Object.assign(ACT,{
  cloudLogin:()=>cloudLogin(),cloudLogout:()=>cloudLogout(),cloudSwitchAccount:()=>cloudSwitchAccount(),cloudSwitchAccountYes:()=>cloudSwitchAccountYes(),cloudSync:()=>cloudSyncNow(),cloudChildren:()=>cloudShowChildren(),
  cloudCreate:d=>cloudAskCreate(d.id),cloudCreateEmpty:()=>{cloudClose();if(typeof go==='function')go('players')},cloudCreateYes:()=>cloudCreateYes(),cloudAddKid:()=>cloudAddKid(),
  cloudOpen:d=>cloudAskOpen(d.id),cloudOpenYes:()=>cloudOpenYes(),cloudSwitch:d=>cloudSwitch(d.id),
  cloudScreenHere:()=>cloudScreenHere(),cloudTakeYes:()=>cloudTakeAnswer(true),cloudDeviceAsk:()=>cloudAskDeviceName(),cloudDeviceSave:()=>cloudSaveDeviceName(),cloudTakeNo:()=>cloudTakeAnswer(false),
  cloudClose:()=>cloudClose(),cloudCloseAsk:d=>cloudCloseAsk(d.id),cloudCloseCurrent:()=>cloudCloseCurrent(),cloudCloseYes:()=>cloudCloseYes()
});
