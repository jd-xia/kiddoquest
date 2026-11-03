/* Happy Learning Farm — Clubs: friends share one farm map (index.html only; the 3D part is in plaza.js).
   Shared space, separate farms: every child keeps their own fields and animals. Club mates see them, with the
   owner's name on each field and animal, but only the owner can plant, harvest, feed or sell (the server only
   lets a child's own account save that child's farm; see ClubService).
   The map: every child's own fields, meadow and animal pen are in a lot in the lane outside the farm, through the
   gate in the south fence; the middle of the farm is a square everyone shares. Farming alone, your farm is lot 0.
   In a club each member has the lot of their slot (0 to 3), so every screen shows every lot in the same place.
   Positions go over the chat socket with the player code of the lot a child stands in ('area'), measured from
   that lot's middle, so each screen draws them on the right lot. */
const CLUB_MAX=4;
/* Where each slot's lot sits: added to the lot's own field, meadow and pen positions (plaza.js lotPlot, PEN). */
const CLUB_LOT=[{x:-20,z:27},{x:12,z:27},{x:-20,z:43},{x:12,z:43}];
/* One lot: the field, the meadow and the animal pen together. A child inside it is on that child's farm. */
const CLUB_HOME={x0:-7.4,x1:16.9,z0:-6.9,z1:6.6};
/* The farm lane with every lot, and the gate in the farm's south fence that leads to it. */
const CLUB_LANE={x0:-29.5,x1:30.5,z0:19.6,z1:50.5};
const CLUB_GATE={x0:0,x1:3.2,z0:17,z1:19.8};
const CLUB={club:null,members:[],loaded:false,loading:false,at:0,mates:{},sentAt:0,sent:'',reload:null};
function clubCacheKey(){return 'hmf-club-'+((typeof cloudRead==='function'&&cloudRead().childId)||'')}
(function clubFromCache(){   // the last club this device saw, so the farm can be built with the lane at once
  try{const c=JSON.parse(localStorage.getItem(clubCacheKey())||'null');if(c&&c.club){CLUB.club=c.club;CLUB.members=c.members||[]}}catch(e){}
})();
const clubOn=()=>!!CLUB.club&&typeof cloudIsAccount==='function'&&cloudIsAccount();
function clubMe(){
  const code=typeof cloudPlayerCode==='function'&&typeof cur==='function'&&cur()?cloudPlayerCode(cur()):'';
  if(code)return code;const m=CLUB.members.find(x=>x&&x.me);return m?m.username:'';   // the server marks this child as me
}
function clubMember(u){return CLUB.members.find(m=>m&&m.username===u)||null}
function clubOthers(){const me=clubMe();return CLUB.members.filter(m=>m&&m.username&&m.username!==me&&!m.me)}
function clubMySlot(){const m=clubMember(clubMe());return m?m.slot:-1}
/* What the farm scene is built from; when it changes, the scene is built again. */
function clubSig(){return clubOn()?CLUB.club.id+':'+CLUB.members.map(m=>m.username+'@'+m.slot).join(','):''}
function clubLotRect(slot){const o=CLUB_LOT[slot];return o&&{x0:CLUB_HOME.x0+o.x,x1:CLUB_HOME.x1+o.x,z0:CLUB_HOME.z0+o.z,z1:CLUB_HOME.z1+o.z}}
const clubIn=(r,x,z)=>!!r&&x>r.x0&&x<r.x1&&z>r.z0&&z<r.z1;
/* This screen's position → what club mates are told: whose lot (yours too), and where in it. */
function clubAreaOf(x,z){
  for(const m of CLUB.members){if(!m||!m.username)continue;const r=clubLotRect(m.slot);if(clubIn(r,x,z)){const o=CLUB_LOT[m.slot];return {area:m.username,x:x-o.x,z:z-o.z}}}
  return {area:'',x,z};
}
/* What a club mate said → where on this screen: on that member's lot, or in the shared farm. */
function clubToWorld(area,x,z){
  const m=area&&clubMember(area),o=m&&CLUB_LOT[m.slot];
  return o?{x:x+o.x,z:z+o.z}:{x,z};
}
async function clubLoad(force){
  if(!(typeof cloudIsAccount==='function'&&cloudIsAccount())||!cloudToken())return;
  if(CLUB.loading||(!force&&CLUB.loaded&&Date.now()-CLUB.at<4000))return;
  CLUB.loading=true;const before=clubSig(),as=cloudRead().childId;
  try{
    const res=await cloudFetch(cloudConfig().dataBase+'/api/v1/clubs/mine?as='+encodeURIComponent(as),{auth:true});
    if(cloudRead().childId!==as)return;
    CLUB.club=res&&res.club||null;CLUB.members=res&&Array.isArray(res.members)?res.members:[];
    CLUB.loaded=true;CLUB.at=Date.now();
    try{localStorage.setItem(clubCacheKey(),JSON.stringify({club:CLUB.club,members:CLUB.members}))}catch(e){}
    Object.keys(CLUB.mates).forEach(u=>{if(!clubMember(u)||u===clubMe())delete CLUB.mates[u]});
    if(typeof clubRedraw==='function')clubRedraw(clubSig()!==before);
    if($('#clubdlg'))clubPaint();
  }catch(e){if(e.status===404){CLUB.club=null;CLUB.members=[]}}
  finally{CLUB.loading=false}
}
function clubSoon(){clearTimeout(CLUB.reload);CLUB.reload=setTimeout(()=>clubLoad(true),600)}
/* Messages from the chat socket (hall.js). */
function clubSocket(msg){
  if(msg.type==='club')clubSoon();   // someone joined or left
  else if(msg.type==='club-farm')clubSoon();   // a member's fields or animals changed
  else if(msg.type==='club-move'&&clubOn()&&msg.username&&msg.username!==clubMe()){
    const at=clubToWorld(msg.area,Number(msg.x)||0,Number(msg.z)||0);
    CLUB.mates[msg.username]={x:at.x,z:at.z,ry:Number(msg.ry)||0,walk:!!msg.walk,at:Date.now(),name:msg.name,look:msg.look};
    const m=clubMember(msg.username);if(m)m.online=true;else clubSoon();
  }
}
function clubPresence(msg){const m=clubMember(msg.username);if(!m)return;m.online=!!msg.online;if(!m.online)delete CLUB.mates[msg.username];if($('#clubdlg'))clubPaint()}
/* Called by the farm every frame with this child's position; sends at most about 8 a second while walking,
   and once every 2 seconds while standing, so club mates who arrive later see where you are. */
function clubSendMove(x,z,ry,walk){
  if(!clubOn()||typeof hallSendRaw!=='function')return;
  const now=Date.now(),a=clubAreaOf(x,z),key=a.area+'|'+a.x.toFixed(2)+'|'+a.z.toFixed(2)+'|'+ry.toFixed(2);
  if(now-CLUB.sentAt<(key===CLUB.sent?2000:120))return;
  if(hallSendRaw({type:'move',x:+a.x.toFixed(2),z:+a.z.toFixed(2),ry:+ry.toFixed(2),area:a.area,walk:!!walk})){CLUB.sentAt=now;CLUB.sent=key}
}
/* ---------- the Club panel ---------- */
let CLUB_FOUND=null,CLUB_BUSY=false,CLUB_LEAVE=false;
function clubOpen(){
  if(!(typeof cloudIsAccount==='function'&&cloudIsAccount())){cloudTell('Open a saved farm first.');return}
  const el=$('#dlg');if(!el||DLG)return;CLUB_FOUND=null;CLUB_LEAVE=false;
  el.className='show';el.innerHTML='<div class="dlg clubdlg" id="clubdlg"><div style="flex:1" id="clubbody"></div></div>';
  clubPaint();clubLoad(true);
}
function clubPaint(){
  const box=$('#clubbody');if(!box)return;const me=clubMe();
  if(clubOn()){
    const rows=CLUB.members.slice().sort((a,b)=>a.slot-b.slot).map(m=>`<div class="clubrow"><span class="clube">${typeof cloudLookEmoji==='function'?cloudLookEmoji(m.look):'🧑‍🌾'}</span>
      <span class="clubwho"><b>${esc(m.name||'Farmer')}${m.online||m.username===me?'<i class="ondot" title="Online"></i>':''}</b><small>${esc(m.username||'')}${m.username===me?' · You':''} · Lot ${m.slot+1}</small></span>
      ${m.username!==me?`<button class="b ghost sm" data-act="clubChat" data-id="${esc(m.username)}">💬</button>`:''}</div>`).join('');
    box.innerHTML=`<div class="dlg-name">🏡 ${esc(CLUB.club.name)}</div>
      <p>${CLUB.members.length} of ${CLUB_MAX} farmers. Everyone walks the same farm. Walk through the gate at the bottom of the farm to the lane: your own farm and your friends' farms are there, each with a name sign.</p>
      <p class="muted">Each field and animal shows its owner's name. You can look at a friend's farm, but only the owner can plant, harvest, feed or sell.</p>
      <div class="clublist">${rows}</div>
      <div class="dlg-btns">${CLUB_LEAVE?'<button class="b sm" data-act="clubLeaveYes">Yes, leave the club</button><button class="b ghost sm" data-act="clubLeaveNo">Stay</button>':'<button class="b ghost sm" data-act="clubLeave">Leave the club</button>'}<button class="b ghost sm" data-act="cloudClose">Close</button></div>`;
    return;
  }
  const found=CLUB_FOUND==null?'':CLUB_FOUND.length?CLUB_FOUND.map(c=>`<div class="clubrow"><span class="clube">🏡</span><span class="clubwho"><b>${esc(c.name)}</b><small>${c.members} of ${c.max} farmers</small></span>
      <button class="b sm" data-act="clubJoin" data-id="${esc(c.id)}" ${c.members>=c.max?'disabled':''}>${c.members>=c.max?'Full':'Join'}</button></div>`).join(''):'<p class="muted">No club has that name yet. You can make it!</p>';
  box.innerHTML=`<div class="dlg-name">🏡 Club</div>
    <p>A club is a farm you share with up to ${CLUB_MAX-1} friends. You all walk the same farm and see each other. Your fields and animals stay yours.</p>
    <h4>Find a club</h4><div class="row"><input id="clubFind" maxlength="20" autocomplete="off" placeholder="Club name" aria-label="Club name to find"><button class="b sm" data-act="clubSearch">Search</button></div>
    <div class="clublist">${found}</div>
    <h4>Make a club</h4><div class="row"><input id="clubName" maxlength="20" autocomplete="off" placeholder="A new club name" aria-label="New club name"><button class="b sm" data-act="clubCreate">Make it</button></div>
    <p class="muted">3 to 20 letters or numbers. Nobody else can have the same name.</p>
    <div class="dlg-btns"><button class="b ghost sm" data-act="cloudClose">Close</button></div>`;
  for(const [id,act] of [['clubFind',clubSearch],['clubName',clubCreate]]){const i=$('#'+id);if(i)i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();act()}})}
}
async function clubSearch(){
  const q=(($('#clubFind')||{}).value||'').trim();
  try{CLUB_FOUND=await cloudFetch(cloudConfig().dataBase+'/api/v1/clubs?q='+encodeURIComponent(q),{auth:true})||[]}
  catch(e){CLUB_FOUND=null;cloudTell('Clubs could not be loaded. Try again in a moment.');return}
  clubPaint();const i=$('#clubFind');if(i){i.value=q;i.focus()}
}
async function clubCall(url,json){
  if(CLUB_BUSY)return null;CLUB_BUSY=true;
  try{return await cloudFetch(cloudConfig().dataBase+url,{method:'POST',auth:true,json})}
  catch(e){cloudTell(e.status===422&&e.message?e.message:e.status===404?'That club is gone. Search again.':'The farm server did not answer. Try again in a moment.');return null}
  finally{CLUB_BUSY=false}
}
function clubTook(res){
  if(!res)return;const before=clubSig();
  CLUB.club=res.club||null;CLUB.members=res.members||[];CLUB.loaded=true;CLUB.at=Date.now();
  try{localStorage.setItem(clubCacheKey(),JSON.stringify({club:CLUB.club,members:CLUB.members}))}catch(e){}
  clubPaint();if(typeof clubRedraw==='function')clubRedraw(clubSig()!==before);
}
async function clubCreate(){
  const name=(($('#clubName')||{}).value||'').trim();if(!name){const i=$('#clubName');if(i)i.focus();return}
  const res=await clubCall('/api/v1/clubs',{as:cloudRead().childId,name});
  if(res){clubTook(res);toast&&$('#toast')&&toast('🏡 '+res.club.name+' is ready! Tell your friends its name.')}
}
async function clubJoin(id){const res=await clubCall('/api/v1/clubs/'+encodeURIComponent(id)+'/join',{as:cloudRead().childId});if(res){clubTook(res);if($('#toast'))toast('🏡 Welcome to '+res.club.name+'!')}}
async function clubLeave(){
  if(CLUB_BUSY)return;CLUB_BUSY=true;
  try{await cloudFetch(cloudConfig().dataBase+'/api/v1/clubs/leave',{method:'POST',auth:true,json:{as:cloudRead().childId}})}
  catch(e){CLUB_BUSY=false;cloudTell('The farm server did not answer. You are still in the club.');return}
  CLUB_BUSY=false;CLUB_LEAVE=false;clubTook({club:null,members:[]});
}
function clubChat(u){cloudClose();if(typeof hallOpen==='function'){hallOpen();hallOpenThread(u)}}
Object.assign(ACT,{
  clubOpen:()=>clubOpen(),clubSearch:()=>clubSearch(),clubCreate:()=>clubCreate(),clubJoin:d=>clubJoin(d.id),
  clubLeave:()=>{CLUB_LEAVE=true;clubPaint()},clubLeaveNo:()=>{CLUB_LEAVE=false;clubPaint()},clubLeaveYes:()=>clubLeave(),clubChat:d=>clubChat(d.id)
});
/* Fields grow and friends come and go: check the club now and then while the farm is open. */
setInterval(()=>{if(typeof UI!=='undefined'&&UI.screen==='town'&&!document.hidden)clubLoad()},30000);
