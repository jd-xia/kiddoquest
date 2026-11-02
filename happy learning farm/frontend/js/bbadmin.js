/* Happy Learning Farm — Brain Boost for each child (brain-boost-admin.html): the Main Account's set-up page.
   A grown-up (parent PIN) picks a child and builds that child's Brain Boost Profile in three columns:
   - Library: the topic and level modules (brain-boost/topics) and the P1–P6 templates to start from.
   - Workspace: the child's topics and levels. Drag from the library to add, drag ⠿ to change the order.
     A level module is in one place per child, so dragging it somewhere else moves it there.
   - Configuration & Preview: names, rules and, for quiz levels, the questions; ▶ Preview plays the level as it
     is now, saving nothing.
   Save draft keeps the work on the farm server without the child seeing it; Publish shows it to the child.
   Stars and scores belong to each level module, so nothing here can lose them. */
const ADM={kids:[],kid:null,state:null,work:null,source:'',dirty:false,sel:null,filter:'all',open:{},openQ:-1,preview:null,previewNote:'',locked:true,busy:false,problems:[]};
const bbaQ=new URLSearchParams(location.search);
try{sessionStorage.removeItem('hmf-nav');sessionStorage.removeItem('hmf-screen-farm')}catch(e){}   // this page plays no farm: no play time, no farm saves
const bbaClone=o=>JSON.parse(JSON.stringify(o));
const bbaRand=()=>Math.random().toString(36).slice(2,8).replace(/[^a-z0-9]/g,'x');
const bbaApi=p=>cloudConfig().dataBase+'/api/v1/children/'+encodeURIComponent(ADM.kid.id)+'/brain-boost'+p;
const bbaGrade=()=>BBP_GRADES.includes(ADM.kid&&ADM.kid.grade)?ADM.kid.grade:'p3';
const bbaWhen=v=>v?cloudWhen(v):'';

/* ---------- start: signed in, then the parent PIN ---------- */
function bbaBoot(){
  if(!cloudToken()){
    $('#app').innerHTML=`<div class="bba-head"><h1>🧠 Brain Boost for each child</h1></div>${npcHTML(MAYOR,'Sign in on the farm first, then open Parent settings → Brain Boost for each child.')}<div class="btns"><a class="b" href="index.html">Go to the farm</a></div>`;return}
  bbaLocked();bbaAsk();
}
function bbaLocked(){$('#app').innerHTML=`<div class="bba-head"><h1>🧠 Brain Boost for each child</h1></div>${npcHTML(MAYOR,'This page is for grown-ups. Enter the parent PIN to choose each child\'s topics, levels and questions.')}<div class="btns"><button class="b" data-act="bbaAsk">Enter the parent PIN</button><button class="b ghost" data-act="bbaFarm">Back to the farm</button></div>`}
function bbaAsk(){famPinBox('Brain Boost for each child','Enter the parent PIN to set up Brain Boost.','bbaPin')}
async function bbaStart(){
  cloudClose();ADM.locked=false;
  $('#app').innerHTML='<div class="boot"><span class="coin">🧠</span><p>Loading the library and your children…</p></div>';
  await bbpCatalog();await Promise.all(BBP_GRADES.map(g=>bbpTemplate(g)));
  try{ADM.kids=await cloudFetch(cloudConfig().dataBase+'/api/v1/children',{auth:true})||[]}
  catch(e){$('#app').innerHTML=npcHTML(MAYOR,e.status===401?'Please sign in again on the farm.':'The farm server did not answer. Try again in a moment.')+'<div class="btns"><button class="b" data-act="bbaFarm">Back to the farm</button></div>';return}
  if(!ADM.kids.length){$('#app').innerHTML=npcHTML(MAYOR,'This account has no children yet. Add one on the farm first.')+'<div class="btns"><button class="b" data-act="bbaFarm">Back to the farm</button></div>';return}
  const want=bbaQ.get('child')||cloudRead().childId,first=ADM.kids.find(k=>k.id===want)||ADM.kids[0];
  await bbaLoadKid(first.id);
}
async function bbaLoadKid(id){
  ADM.kid=ADM.kids.find(k=>k.id===id);ADM.busy=true;
  try{ADM.state=await bbpLoadState(id)}catch(e){ADM.state={profile:null,draft:null,progress:[]}}
  ADM.busy=false;bbaFromState();
}
/* The working copy: the draft if there is one, else what the child plays now, else their grade's template. */
function bbaFromState(){
  const s=ADM.state||{};
  if(s.draft){ADM.work=bbpNormal(s.draft);ADM.source='draft'}
  else if(s.profile){ADM.work=bbpNormal(s.profile);ADM.source='published'}
  else{ADM.work=bbaClone(BBP.templates[bbaGrade()]);delete ADM.work.about;delete ADM.work.grade;ADM.source='template'}
  ADM.dirty=false;ADM.sel=null;ADM.openQ=-1;ADM.preview=null;ADM.problems=[];ADM.open={};
  ADM.work.topics.forEach(t=>ADM.open[t.id]=true);
  bbaDraw();
}
function bbaChange(redraw){ADM.dirty=true;ADM.problems=[];if(redraw!==false)bbaDraw();else bbaStatus()}

/* ---------- finding things ---------- */
const bbaTopicName=t=>t.name||((bbpTopicMod(t.id)||{}).name)||'My topic';
const bbaTopicIcon=t=>t.icon||((bbpTopicMod(t.id)||{}).icon)||'⭐';
const bbaTopicColor=t=>t.color||((bbpTopicMod(t.id)||{}).color)||'#8B5CF6';
function bbaWhere(from){for(let i=0;i<ADM.work.topics.length;i++){const j=ADM.work.topics[i].levels.findIndex(l=>l.from===from);if(j>=0)return {t:i,l:j}}return null}
const bbaSelTopic=()=>ADM.sel&&ADM.work.topics[ADM.sel.t];
const bbaSelLevel=()=>{const t=bbaSelTopic();return t&&ADM.sel.l!=null?t.levels[ADM.sel.l]:null};
const bbaGradeTag=g=>g?`<span class="bba-badge">${esc(gradeName(g))}</span>`:'';

/* ---------- changes ---------- */
function bbaAddTopic(id,at){
  const have=ADM.work.topics.findIndex(t=>t.id===id);
  if(have>=0){ADM.open[id]=true;ADM.sel={t:have};return bbaDraw()}
  const M=bbpTopicMod(id);if(!M)return;
  const g=bbaGrade(),free=M.levels.filter(l=>!bbaWhere(l.from)),mine=free.filter(l=>!l.grade||l.grade===g);
  const t={id,enabled:true,levels:(mine.length?mine:free).map(l=>({from:l.from,enabled:true}))};
  at=at==null?ADM.work.topics.length:at;ADM.work.topics.splice(at,0,t);ADM.open[id]=true;ADM.sel={t:at};
  bbaChange();toast(`${M.name} added with ${t.levels.length} level${t.levels.length===1?'':'s'}.`);
}
/* A level module lives in one place: adding it where it already is elsewhere moves it, settings and all. */
function bbaAddLevel(from,ti,at){
  let t=ADM.work.topics[ti];if(!t)return;
  const was=bbaWhere(from);let item={from,enabled:true};
  if(was){item=ADM.work.topics[was.t].levels.splice(was.l,1)[0];if(was.t===ti&&at!=null&&was.l<at)at--}
  at=at==null?t.levels.length:Math.min(at,t.levels.length);t.levels.splice(at,0,item);
  ADM.open[t.id]=true;ADM.sel={t:ti,l:at};ADM.openQ=-1;
  bbaChange();if(was&&was.t!==ti)toast('Moved. A level is in one place per child; its stars go with it.');
}
function bbaMoveTopic(i,at){const t=ADM.work.topics.splice(i,1)[0];if(at>i)at--;ADM.work.topics.splice(at,0,t);ADM.sel={t:at};bbaChange()}
function bbaMoveLevel(i,j,ti,at){
  const item=ADM.work.topics[i].levels.splice(j,1)[0];if(i===ti&&at>j)at--;
  ADM.work.topics[ti].levels.splice(at,0,item);ADM.open[ADM.work.topics[ti].id]=true;ADM.sel={t:ti,l:at};bbaChange();
}
const bbaHasOwnWork=l=>l.custom||Array.isArray(l.questions);
function bbaDelTopic(i){
  const t=ADM.work.topics[i],lose=t.levels.filter(bbaHasOwnWork).length;
  const go=()=>{ADM.work.topics.splice(i,1);ADM.sel=null;ADM.preview=null;bbaChange();toast(`${bbaTopicName(t)} taken out. Its levels keep their stars.`)};
  if(!lose)return go();
  bbaConfirm(`Take out ${bbaTopicName(t)}?`,`${lose} level${lose===1?' has':'s have'} your own questions; they go too. Stars and scores stay.`,'Take it out',go);
}
function bbaDelLevel(i,j){
  const l=ADM.work.topics[i].levels[j],R=bbpLevel(l),name=R?R.name:l.from;
  const go=()=>{ADM.work.topics[i].levels.splice(j,1);ADM.sel={t:i};ADM.preview=null;bbaChange()};
  if(!bbaHasOwnWork(l))return go();
  bbaConfirm(`Take out ${name}?`,'Your own questions for this level go too. Its stars and scores stay.','Take it out',go);
}
function bbaNewTopic(){
  ADM.work.topics.push({id:'my-'+bbaRand(),custom:true,enabled:true,name:'My topic',icon:'⭐',color:'#8B5CF6',levels:[]});
  const i=ADM.work.topics.length-1;ADM.open[ADM.work.topics[i].id]=true;ADM.sel={t:i};bbaChange();
}
function bbaNewQuiz(ti){
  const t=ADM.work.topics[ti];if(!t)return;
  t.levels.push({from:'custom/c-'+bbaRand(),custom:true,enabled:true,name:'My quiz',difficulty:2,questions:[{text:'What is 2 + 3?',options:['4','5','6'],answer:'5',hint:'Count on from 2.'}]});
  ADM.open[t.id]=true;ADM.sel={t:ti,l:t.levels.length-1};ADM.openQ=0;bbaChange();
}
function bbaTemplate(g){
  const go=()=>{ADM.work=bbaClone(BBP.templates[g]);delete ADM.work.about;delete ADM.work.grade;ADM.open={};ADM.work.topics.forEach(t=>ADM.open[t.id]=true);ADM.sel=null;ADM.preview=null;bbaChange();toast(`Started from the ${gradeName(g)} template. Change anything, then save or publish.`)};
  bbaConfirm(`Start from the ${gradeName(g)} template?`,`${esc(ADM.kid.displayName)}'s list below is replaced by the ${gradeName(g)} topics and levels. Nothing is saved until you save or publish, and stars stay.`,'Use this template',go);
}
/* Quiz levels: the module's own questions are used until a grown-up changes one; then this child gets a copy. */
function bbaOwnQuestions(l){if(!Array.isArray(l.questions)){const M=bbpLevelMod(l.from);l.questions=bbaClone((M&&M.questions)||[])}return l.questions}

/* ---------- drawing ---------- */
function bbaDraw(){
  if(ADM.locked||!ADM.kid)return;
  const kids=ADM.kids.map(k=>`<button class="bba-kid" data-act="bbaKid" data-id="${esc(k.id)}" aria-pressed="${k.id===ADM.kid.id}">${cloudLookEmoji(k.look)} ${esc(k.displayName)} <small>${esc(gradeName(k.grade))}</small></button>`).join('');
  $('#app').innerHTML=`<div class="bba-head"><h1>🧠 Brain Boost for each child</h1>
    <button class="b ghost sm" data-act="bbaFarm">Back to the farm</button>
    <div class="bba-kids" role="group" aria-label="Child">${kids}</div>
    <div class="bba-bar"><span class="bba-status" id="bbaStatus"></span>
     <button class="b ghost sm" data-act="bbaDraft">💾 Save draft</button>
     <button class="b sm" data-act="bbaPublishAsk">🚀 Publish…</button>
     ${ADM.state&&ADM.state.draft?'<button class="b ghost sm" data-act="bbaDiscard">Discard draft</button>':''}</div>
    ${ADM.problems.length?`<ul class="bba-problems">${ADM.problems.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`:''}</div>
   <div class="bba-cols"><section class="bba-col" aria-label="Topic and level library">${bbaLibrary()}</section>
    <section class="bba-col" aria-label="${esc(ADM.kid.displayName)}'s profile">${bbaWorkspace()}</section>
    <section class="bba-col bba-config" aria-label="Configuration and preview">${bbaConfig()}</section></div>`;
  bbaStatus();
}
function bbaStatus(){
  const el=document.getElementById('bbaStatus');if(!el)return;const s=ADM.state||{},k=ADM.kid;
  const now=s.profile?`${esc(k.displayName)} plays <b>your published list</b> (${esc(bbaWhen(s.profileUpdatedAt))})`:`${esc(k.displayName)} plays <b>the ${esc(gradeName(bbaGrade()))} template</b>`;
  const draft=s.draft?` · Draft saved ${esc(bbaWhen(s.draftUpdatedAt))}`:'';
  const edit=ADM.dirty?' · <span class="dirty">Unsaved changes</span>':ADM.source==='draft'?' · Editing the draft':ADM.source==='template'?' · Editing a copy of the template':'';
  el.innerHTML=now+draft+edit;
}
function bbaLibrary(){
  const f=ADM.filter,chips=['all',...BBP_GRADES].map(g=>`<button class="bba-chip" data-act="bbaFilter" data-g="${g}" aria-pressed="${f===g}">${g==='all'?'All':esc(gradeName(g))}</button>`).join('');
  const tpls=BBP_GRADES.map(g=>`<button class="bba-chip" data-act="bbaTpl" data-g="${g}" title="Start ${esc(ADM.kid.displayName)}'s list from the ${esc(gradeName(g))} template">${esc(gradeName(g))}</button>`).join('');
  const mods=(BBP.cat||[]).map(T=>{
    const lv=T.levels.filter(l=>f==='all'||!l.grade||l.grade===f);
    if(!lv.length&&f!=='all')return '';
    return `<div class="bba-mod" style="--tc:${esc(T.color||'#8B5CF6')}" data-drag="lib-topic:${esc(T.id)}">
      <div class="bba-modhead"><span class="bba-grip" aria-hidden="true">⠿</span><span class="bba-ico" aria-hidden="true">${esc(T.icon||'🧠')}</span><b>${esc(T.name)}</b>
       <button class="bba-mini" data-act="bbaAddTopic" data-id="${esc(T.id)}" aria-label="Add ${esc(T.name)} to ${esc(ADM.kid.displayName)}">＋</button></div>
      ${lv.map(l=>{const at=bbaWhere(l.from),where=at?bbaTopicName(ADM.work.topics[at.t]):'';return `<div class="bba-lvl${at?' used':''}" data-drag="lib-level:${esc(l.from)}" title="${esc(l.description||'')}">
        <span class="bba-grip" aria-hidden="true">⠿</span><span class="nm">${esc(l.name)}</span>${bbaGradeTag(l.grade)}${l.kind==='quiz'?'<span class="bba-badge quiz">✎ quiz</span>':''}${at?`<span class="bba-badge where" title="In ${esc(where)}">✓ added</span>`:''}
        <button class="bba-mini" data-act="bbaAddLevel" data-from="${esc(l.from)}" aria-label="Add ${esc(l.name)}${at?' (moves it from '+esc(where)+')':''}">＋</button></div>`}).join('')||'<p class="bba-note">No levels for this year.</p>'}</div>`}).join('');
  return `<h2>📚 Library</h2><p class="muted">Drag a topic or a level into ${esc(ADM.kid.displayName)}'s list, or tap ＋. ＋ on a level adds it to the topic you picked.</p>
    <div class="bba-chips" role="group" aria-label="Show levels for">${chips}</div>
    <p class="bba-note">Start from a year's template:</p><div class="bba-chips">${tpls}</div>${mods}`;
}
function bbaWorkspace(){
  const k=ADM.kid,topics=ADM.work.topics.map((t,i)=>{
    const sel=ADM.sel&&ADM.sel.t===i&&ADM.sel.l==null,open=ADM.open[t.id],on=t.levels.filter(l=>l.enabled!==false).length;
    const levels=t.levels.map((l,j)=>{const R=bbpLevel(l),s=ADM.sel&&ADM.sel.t===i&&ADM.sel.l===j;
      return `<div class="bba-level${s?' sel':''}${l.enabled===false?' off':''}" data-drag="ws-level:${i}:${j}" data-act="bbaSel" data-t="${i}" data-l="${j}">
        <div class="bba-lrow"><span class="bba-grip" aria-hidden="true">⠿</span><span class="num">${j+1}</span><span class="nm" data-nm="l:${i}:${j}">${esc(R?R.name:l.from+' (missing)')}</span>
         ${R?bbaGradeTag(R.grade):''}${R&&R.kind==='quiz'?`<span class="bba-badge quiz">✎ ${(R.questions||[]).length}</span>`:''}
         <label class="bba-switch" title="Show this level"><input type="checkbox" data-ed="l-enabled" data-t="${i}" data-l="${j}" ${l.enabled!==false?'checked':''} aria-label="Show ${esc(R?R.name:l.from)}"></label>
         <button class="bba-mini" data-act="bbaMoveL" data-t="${i}" data-l="${j}" data-d="-1" aria-label="Move up" ${j?'':'disabled'}>▲</button>
         <button class="bba-mini" data-act="bbaMoveL" data-t="${i}" data-l="${j}" data-d="1" aria-label="Move down" ${j<t.levels.length-1?'':'disabled'}>▼</button>
         <button class="bba-mini" data-act="bbaDelLevel" data-t="${i}" data-l="${j}" aria-label="Take out ${esc(R?R.name:l.from)}">✕</button></div></div>`}).join('');
    return `<div class="bba-topic${sel?' sel':''}${t.enabled===false?' off':''}" style="--tc:${esc(bbaTopicColor(t))}" data-drag="ws-topic:${i}">
      <div class="bba-thead" data-act="bbaSel" data-t="${i}"><span class="bba-grip" aria-hidden="true">⠿</span><span class="bba-ico" aria-hidden="true">${esc(bbaTopicIcon(t))}</span><span class="nm" data-nm="t:${i}">${esc(bbaTopicName(t))}</span>
       <span class="cnt">${on} of ${t.levels.length}</span>
       <label class="bba-switch" title="Show this topic as an island"><input type="checkbox" data-ed="t-enabled" data-t="${i}" ${t.enabled!==false?'checked':''} aria-label="Show ${esc(bbaTopicName(t))}"></label>
       <button class="bba-mini" data-act="bbaMoveT" data-t="${i}" data-d="-1" aria-label="Move up" ${i?'':'disabled'}>▲</button>
       <button class="bba-mini" data-act="bbaMoveT" data-t="${i}" data-d="1" aria-label="Move down" ${i<ADM.work.topics.length-1?'':'disabled'}>▼</button>
       <button class="bba-mini" data-act="bbaOpenT" data-t="${i}" aria-expanded="${!!open}" aria-label="${open?'Hide':'Show'} levels">${open?'▾':'▸'}</button>
       <button class="bba-mini" data-act="bbaDelTopic" data-t="${i}" aria-label="Take out ${esc(bbaTopicName(t))}">✕</button></div>
      ${open?`<div class="bba-levels" data-drop="levels:${i}">${levels||'<div class="bba-empty">Drag levels here</div>'}</div>
       <div class="row" style="margin:6px 0 0 18px"><button class="bba-mini" data-act="bbaNewQuiz" data-t="${i}">＋ My own quiz level</button></div>`:''}</div>`}).join('');
  return `<h2>🧒 ${esc(k.displayName)}'s Brain Boost</h2><p class="muted">Each switched-on topic is an island, and its switched-on levels are the stones, in this order. Drag ⠿ to reorder.</p>
    <div class="bba-topics" data-drop="topics">${topics||'<div class="bba-empty">Drag a topic here from the library</div>'}</div>
    <div class="row"><button class="b ghost sm" data-act="bbaNewTopic">＋ New topic</button></div>`;
}
function bbaField(label,html){return `<label class="bba-field">${label}${html}</label>`}
function bbaConfig(){
  const t=bbaSelTopic(),l=bbaSelLevel();
  if(!t)return `<h2>⚙️ Configuration & Preview</h2><p class="muted">Pick a topic or a level in ${esc(ADM.kid.displayName)}'s list to change its name, rules and questions, and to preview it.</p>
    <p class="bba-note">Changes are only for ${esc(ADM.kid.displayName)}. Other children keep their own lists, and stars and scores always stay.</p>`;
  if(!l){
    const M=bbpTopicMod(t.id),i=ADM.sel.t;
    return `<h2>⚙️ Topic</h2><p class="bba-note">${M?`Module: ${esc(M.name)} (${esc(M.id)})`:'Your own topic'}</p>
      ${bbaField('Name',`<input data-ed="t-name" data-t="${i}" maxlength="40" value="${esc(t.name||'')}" placeholder="${esc(M?M.name:'My topic')}">`)}
      ${bbaField('Description',`<input data-ed="t-description" data-t="${i}" maxlength="160" value="${esc(t.description||'')}" placeholder="${esc(M?M.description||'':'')}">`)}
      <div class="bba-row2">${bbaField('Icon',`<input data-ed="t-icon" data-t="${i}" maxlength="8" value="${esc(t.icon||'')}" placeholder="${esc(M?M.icon||'':'⭐')}">`)}
       ${bbaField('Colour',`<input type="color" data-ed="t-color" data-t="${i}" value="${esc(bbaTopicColor(t))}">`)}</div>
      <label class="bba-switch"><input type="checkbox" data-ed="t-enabled" data-t="${i}" ${t.enabled!==false?'checked':''}> Show this island to ${esc(ADM.kid.displayName)}</label>
      <p class="bba-note">${t.levels.length} level${t.levels.length===1?'':'s'}. Pick a level to change it.</p>`;
  }
  const R=bbpLevel(l),M=bbpLevelMod(l.from),i=ADM.sel.t,j=ADM.sel.l;
  if(!R)return `<h2>⚙️ Level</h2><p class="bba-note">The module ${esc(l.from)} is not in the library any more. Take it out of the list.</p>`;
  const r=l.rules||{},mr=(M&&M.rules)||{},quiz=R.kind==='quiz';
  const num=(key,label,min,max,ph)=>bbaField(label,`<input type="number" data-ed="l-rule" data-key="${key}" data-t="${i}" data-l="${j}" min="${min}" max="${max}" value="${r[key]!=null?r[key]:''}" placeholder="${ph!=null?ph:''}">`);
  const from=M?`${esc(bbpTopicMod(R.topic).name)} · ${esc(M.name)}${M.grade?' · '+esc(gradeName(M.grade)):''}`:'Your own quiz level';
  let qs='';
  if(quiz){
    const own=Array.isArray(l.questions),list=own?l.questions:((M&&M.questions)||[]);
    qs=`<h3>Questions</h3><p class="bba-note">${own?`${esc(ADM.kid.displayName)}'s own questions.`:'The module\'s questions. Changing one gives this child their own copy.'} Drag ⠿ to reorder.</p>
      ${own&&!l.custom?'<button class="b ghost sm" data-act="bbaQReset">Use the module\'s questions again</button>':''}
      <div data-drop="questions">${list.map((q,k)=>bbaQuestion(q,k,list.length)).join('')}</div>
      <button class="b ghost sm" data-act="bbaQAdd">＋ Add question</button>`;
  }else qs=`<p class="bba-note">This level makes new questions every time it is played. You can change its name and rules.</p>`;
  return `<h2>⚙️ Level</h2><p class="bba-note">From: ${from} · ${quiz?'quiz':'game'}</p>
    ${bbaField('Name',`<input data-ed="l-name" data-t="${i}" data-l="${j}" maxlength="40" value="${esc(l.name||'')}" placeholder="${esc(M?M.name:'My quiz')}">`)}
    ${bbaField('Description',`<input data-ed="l-description" data-t="${i}" data-l="${j}" maxlength="160" value="${esc(l.description||'')}" placeholder="${esc(M?M.description||'':'')}">`)}
    <div class="bba-row2">${bbaField('Difficulty',`<select data-ed="l-difficulty" data-t="${i}" data-l="${j}"><option value="">Module's (${M?bbpInt(M.difficulty||2,1,5):2})</option>${[1,2,3,4,5].map(d=>`<option value="${d}" ${l.difficulty===d?'selected':''}>${'●'.repeat(d)} ${d}</option>`).join('')}</select>`)}
     ${num('hearts','Hearts',1,5,mr.hearts||3)}</div>
    <div class="bba-row2">${num('questions','Questions per game',1,50,mr.questions||'all')}${mr.seconds!=null?num('seconds','Seconds',10,1800,mr.seconds):quiz?bbaField('Choices',`<select data-ed="l-shuffle" data-t="${i}" data-l="${j}"><option value="">In order</option><option value="1" ${r.shuffle?'selected':''}>Mixed up</option></select>`):''}</div>
    <label class="bba-switch"><input type="checkbox" data-ed="l-enabled" data-t="${i}" data-l="${j}" ${l.enabled!==false?'checked':''}> Show this level to ${esc(ADM.kid.displayName)}</label>
    ${qs}
    <h3>Preview</h3><p class="bba-note">Plays the level as it is set up now, as ${esc(ADM.kid.displayName)} would see it. Nothing is saved.</p>
    <button class="b sm" data-act="bbaPreview">▶ Preview this level</button>
    ${ADM.preview?`<p class="bba-note" id="bbaPrevNote">${esc(ADM.previewNote||'')}</p><div class="bba-preview"><iframe id="bbaFrame" title="Preview of ${esc(R.name)}" src="${esc(R.url)}?preview=1"></iframe></div>`:''}`;
}
function bbaQuestion(q,k,n){
  const open=ADM.openQ===k,opts=q.options||[];
  const answer=opts.length?`<select data-ed="q-answer" data-k="${k}">${opts.map(o=>`<option ${o===q.answer?'selected':''}>${esc(o)}</option>`).join('')}${opts.includes(q.answer)?'':'<option value="" selected>Pick the right choice</option>'}</select>`
    :`<input data-ed="q-answer" data-k="${k}" maxlength="80" value="${esc(q.answer||'')}" placeholder="The answer the child types">`;
  return `<div class="bba-q${open?' open':''}" data-drag="q:${k}">
    <div class="bba-qhead" data-act="bbaQOpen" data-k="${k}"><span class="bba-grip" aria-hidden="true">⠿</span><span class="nm" data-nm="q:${k}">${k+1}. ${esc(q.text||'New question')}</span>
     <button class="bba-mini" data-act="bbaQMove" data-k="${k}" data-d="-1" aria-label="Move question up" ${k?'':'disabled'}>▲</button>
     <button class="bba-mini" data-act="bbaQMove" data-k="${k}" data-d="1" aria-label="Move question down" ${k<n-1?'':'disabled'}>▼</button>
     <button class="bba-mini" data-act="bbaQDel" data-k="${k}" aria-label="Delete question ${k+1}">✕</button></div>
    ${open?`${bbaField('Question',`<textarea data-ed="q-text" data-k="${k}" maxlength="240">${esc(q.text||'')}</textarea>`)}
     ${bbaField('Choices, one per line (leave empty to type the answer)',`<textarea data-ed="q-options" data-k="${k}">${esc(opts.join('\n'))}</textarea>`)}
     ${bbaField('Right answer',answer)}
     ${bbaField('Hint (shown after a wrong answer)',`<input data-ed="q-hint" data-k="${k}" maxlength="240" value="${esc(q.hint||'')}">`)}
     ${bbaField('Difficulty',`<select data-ed="q-difficulty" data-k="${k}"><option value="">–</option>${[1,2,3,4,5].map(d=>`<option value="${d}" ${q.difficulty===d?'selected':''}>${d}</option>`).join('')}</select>`)}`:''}</div>`;
}

/* ---------- typing in the configuration ---------- */
function bbaEdit(e,final){
  const d=e.target.dataset;if(!d||!d.ed||!ADM.work)return;
  const v=e.target.type==='checkbox'?e.target.checked:e.target.value;
  const t=ADM.work.topics[+d.t],l=t&&d.l!=null?t.levels[+d.l]:bbaSelLevel();
  const put=(o,k,val)=>{if(val===''||val==null)delete o[k];else o[k]=val};
  switch(d.ed){
    case 't-enabled':t.enabled=v;return bbaChange();
    case 'l-enabled':l.enabled=v;return bbaChange();
    case 't-name':case 't-description':case 't-icon':put(t,d.ed.slice(2),v.trim()?v:'');bbaLabels();return bbaChange(false);
    case 't-color':t.color=v;return bbaChange(false);
    case 'l-name':case 'l-description':put(l,d.ed.slice(2),v.trim()?v:'');bbaLabels();return bbaChange(false);
    case 'l-difficulty':put(l,'difficulty',v?+v:'');return bbaChange(false);
    case 'l-shuffle':l.rules=l.rules||{};put(l.rules,'shuffle',v?true:'');if(!Object.keys(l.rules).length)delete l.rules;return bbaChange(false);
    case 'l-rule':{l.rules=l.rules||{};const n=v===''?'':Math.round(Number(v));put(l.rules,d.key,Number.isFinite(n)?n:'');if(!Object.keys(l.rules).length)delete l.rules;return bbaChange(false)}
  }
  if(d.ed.startsWith('q-')){
    const qs=bbaOwnQuestions(l),q=qs[+d.k];if(!q)return;
    if(d.ed==='q-text')q.text=v;
    else if(d.ed==='q-hint')put(q,'hint',v);
    else if(d.ed==='q-difficulty')put(q,'difficulty',v?+v:'');
    else if(d.ed==='q-answer')q.answer=v;
    else if(d.ed==='q-options'){const o=v.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,6);if(o.length)q.options=o;else delete q.options;if(final&&q.options&&!q.options.includes(q.answer))q.answer=''}
    bbaLabels();bbaChange(final&&d.ed==='q-options');   // new choices change the answer list
  }
}
/* Names typed in the configuration show in the list at once, without redrawing under the grown-up's fingers. */
function bbaLabels(){
  document.querySelectorAll('[data-nm]').forEach(el=>{const [k,a,b]=el.dataset.nm.split(':');
    if(k==='t'){const t=ADM.work.topics[+a];if(t)el.textContent=bbaTopicName(t)}
    else if(k==='l'){const l=(ADM.work.topics[+a]||{levels:[]}).levels[+b],R=l&&bbpLevel(l);if(R)el.textContent=R.name}
    else if(k==='q'){const l=bbaSelLevel(),q=l&&Array.isArray(l.questions)&&l.questions[+a];if(q)el.textContent=`${+a+1}. ${q.text||'New question'}`}});
}
document.addEventListener('input',e=>{if(e.target.matches('textarea,input[type=text],input:not([type]),input[type=number],input[type=color]'))bbaEdit(e,false)});
document.addEventListener('change',e=>bbaEdit(e,true));

/* ---------- drag and drop (mouse, pen and touch) ---------- */
let DRAG=null,bbaSwallow=false;
document.addEventListener('pointerdown',e=>{
  if(e.button!==0||ADM.locked)return;const src=e.target.closest('[data-drag]');if(!src)return;
  if(e.target.closest('input,textarea,select,button,label'))return;
  if(e.pointerType!=='mouse'&&!e.target.closest('.bba-grip,.bba-lvl'))return;   // on a touch screen, only ⠿ and library rows drag; the rest scrolls
  DRAG={src,kind:src.dataset.drag,x:e.clientX,y:e.clientY,started:false};
});
document.addEventListener('pointermove',e=>{
  if(!DRAG)return;
  if(!DRAG.started){if(Math.hypot(e.clientX-DRAG.x,e.clientY-DRAG.y)<6)return;
    DRAG.started=true;const g=DRAG.src.cloneNode(true);g.classList.add('bba-ghost');g.style.width=Math.min(300,DRAG.src.offsetWidth)+'px';document.body.appendChild(g);DRAG.ghost=g;document.body.classList.add('bba-dragging')}
  e.preventDefault();DRAG.ghost.style.left=(e.clientX+8)+'px';DRAG.ghost.style.top=(e.clientY+8)+'px';
  DRAG.target=bbaDropAt(e.clientX,e.clientY);bbaMark(DRAG.target);
  if(e.clientY<60)window.scrollBy(0,-12);else if(e.clientY>innerHeight-60)window.scrollBy(0,12);
},{passive:false});
document.addEventListener('pointerup',()=>{
  const D=DRAG;DRAG=null;if(!D||!D.started)return;
  D.ghost.remove();document.body.classList.remove('bba-dragging');bbaMark(null);bbaSwallow=true;setTimeout(()=>{bbaSwallow=false},0);
  if(D.target)bbaDrop(D.kind,D.target);
});
document.addEventListener('pointercancel',()=>{if(DRAG&&DRAG.ghost){DRAG.ghost.remove();document.body.classList.remove('bba-dragging');bbaMark(null)}DRAG=null});
document.addEventListener('click',e=>{
  if(bbaSwallow){e.stopPropagation();e.preventDefault();return}
  if(e.target.closest('.bba-switch'))e.stopPropagation();   // an on/off switch inside a row only switches; selecting the row would redraw it first
},true);
/* Where a drop would land: {box, index, ti} for a list, or {card, ti} to add at the end of a topic. */
function bbaDropAt(x,y){
  const kind=DRAG.kind.split(':')[0],el=document.elementFromPoint(x,y);if(!el)return null;
  const indexIn=(box,sel)=>{const items=[...box.querySelectorAll(':scope>'+sel)];let k=items.findIndex(it=>{const r=it.getBoundingClientRect();return y<r.top+r.height/2});return {box,index:k<0?items.length:k,items}};
  if(kind==='lib-topic'||kind==='ws-topic'){const box=document.querySelector('[data-drop="topics"]'),r=box.getBoundingClientRect();
    if(x<r.left-30||x>r.right+30||y<r.top-40||y>r.bottom+40)return null;return Object.assign(indexIn(box,'.bba-topic'),{list:'topics'})}
  if(kind==='lib-level'||kind==='ws-level'){
    const box=el.closest('[data-drop^="levels:"]');if(box)return Object.assign(indexIn(box,'.bba-level'),{list:'levels',ti:+box.dataset.drop.split(':')[1]});
    const card=el.closest('.bba-topic');if(card)return {card,ti:+card.dataset.drag.split(':')[1]};
    return null;
  }
  if(kind==='q'){const box=el.closest('[data-drop="questions"]');return box?Object.assign(indexIn(box,'.bba-q'),{list:'q'}):null}
  return null;
}
function bbaMark(t){
  document.querySelectorAll('.bba-insert').forEach(n=>n.remove());document.querySelectorAll('.bba-over').forEach(n=>n.classList.remove('bba-over'));
  if(!t)return;if(t.card){t.card.classList.add('bba-over');return}
  const line=document.createElement('div');line.className='bba-insert';
  if(t.index<t.items.length)t.box.insertBefore(line,t.items[t.index]);else t.box.appendChild(line);
}
function bbaDrop(kind,t){
  const [k,a,b]=kind.split(':').length>2?kind.split(':'):[kind.split(':')[0],kind.slice(kind.indexOf(':')+1)];
  if(k==='lib-topic')return bbaAddTopic(a,t.index);
  if(k==='ws-topic')return bbaMoveTopic(+a,t.index);
  const ti=t.ti,at=t.card?ADM.work.topics[ti].levels.length:t.index;
  if(k==='lib-level')return bbaAddLevel(a,ti,at);
  if(k==='ws-level')return bbaMoveLevel(+a,+b,ti,at);
  if(k==='q'){const l=bbaSelLevel(),qs=bbaOwnQuestions(l),from=+a;let to=t.index;const q=qs.splice(from,1)[0];if(to>from)to--;qs.splice(to,0,q);ADM.openQ=to;bbaChange()}
}

/* ---------- preview ---------- */
window.addEventListener('message',e=>{
  const f=document.getElementById('bbaFrame');if(!f||e.source!==f.contentWindow||e.origin!==location.origin||!ADM.preview)return;
  const m=e.data||{},note=document.getElementById('bbaPrevNote');
  if(m.type==='bb:ready'){
    const t=bbaSelTopic(),l=bbaSelLevel(),R=l&&bbpLevel(l);if(!R)return;
    const T={id:t.id,name:bbaTopicName(t),icon:bbaTopicIcon(t)};
    f.contentWindow.postMessage(bbpStartMsg(T,R,{name:ADM.kid.displayName,grade:bbaGrade(),look:ADM.kid.look},true),location.origin);
  }else if(m.type==='bb:finish'||m.type==='bb:quit'){
    ADM.previewNote=`Preview ${m.type==='bb:quit'?'stopped':'finished'}: ${bbpInt(m.correct,0,500)} of ${bbpInt(m.total,0,500)} right${m.cleared?`, ${bbpInt(m.stars,0,3)} stars`:''}. Nothing was saved.`;
    if(note)note.textContent=ADM.previewNote;
  }
});

/* ---------- checks, save draft, publish ---------- */
/* What the farm server would refuse, said in plain words. */
function bbaCheck(){
  const out=[];
  ADM.work.topics.forEach(t=>t.levels.forEach(l=>{
    if(!Array.isArray(l.questions))return;const R=bbpLevel(l),name=`${bbaTopicName(t)} → ${R?R.name:l.from}`;
    l.questions.forEach((q,k)=>{
      if(!String(q.text||'').trim())out.push(`${name}: question ${k+1} has no question.`);
      if(!String(q.answer||'').trim())out.push(`${name}: question ${k+1} has no right answer.`);
      if(q.options&&q.options.length===1)out.push(`${name}: question ${k+1} needs at least 2 choices.`);
      if(q.options&&q.options.length>1&&!q.options.includes(q.answer))out.push(`${name}: the answer to question ${k+1} is not one of its choices.`);
    });
  }));
  return out;
}
function bbaOut(){
  const clean=s=>String(s||'').trim();
  return {topics:ADM.work.topics.map(t=>{const o={id:t.id,enabled:t.enabled!==false,levels:[]};if(t.custom)o.custom=true;
    ['name','description','icon','color'].forEach(k=>{if(clean(t[k]))o[k]=clean(t[k])});
    o.levels=t.levels.map(l=>{const x={from:l.from,enabled:l.enabled!==false};if(l.custom)x.custom=true;
      ['name','description'].forEach(k=>{if(clean(l[k]))x[k]=clean(l[k])});
      if(l.difficulty)x.difficulty=l.difficulty;if(l.rules&&Object.keys(l.rules).length)x.rules=l.rules;
      if(Array.isArray(l.questions))x.questions=l.questions.map(q=>{const y={text:clean(q.text),answer:clean(q.answer)};if(q.options&&q.options.length)y.options=q.options;if(clean(q.hint))y.hint=clean(q.hint);if(q.difficulty)y.difficulty=q.difficulty;return y});
      return x});
    return o})};
}
async function bbaSend(path,profile,ok){
  if(!FAM.pin){famPinBox('Parent PIN','Enter the parent PIN again to save.','bbaPinSave');ADM.after=()=>bbaSend(path,profile,ok);return}
  try{ADM.state=await cloudFetch(bbaApi(path),{method:'POST',auth:true,json:{pin:FAM.pin,profile},timeoutMs:15000});
    try{localStorage.setItem(bbpCacheKey(ADM.kid.id),JSON.stringify(ADM.state))}catch(e){}BBP.states[ADM.kid.id]=ADM.state;ok()}
  catch(e){
    if(e.code==='wrong_pin'||e.code==='pin_wait'||e.code==='pin_missing'){FAM.pin=null;cloudTell(famPinMsg(e));return}
    ADM.problems=[e.status===422&&e.message?e.message:'The farm server did not save this. Nothing was changed. Try again in a moment.'];bbaDraw();
  }
}
function bbaDraft(){
  ADM.problems=bbaCheck();if(ADM.problems.length)return bbaDraw();
  bbaSend('/profile/draft',bbaOut(),()=>{ADM.dirty=false;ADM.source='draft';bbaDraw();toast(`Draft saved. ${ADM.kid.displayName} still plays the published list.`)});
}
function bbaPublishAsk(){
  ADM.problems=bbaCheck();if(ADM.problems.length)return bbaDraw();
  const on=ADM.work.topics.filter(t=>t.enabled!==false),warn=[];
  on.forEach(t=>{const n=t.levels.filter(l=>l.enabled!==false).length;if(!n)warn.push(`${bbaTopicName(t)} has no levels switched on, so its island says "No levels yet".`)});
  if(!on.length)warn.push(`No topic is switched on: ${ADM.kid.displayName} will see no islands.`);
  const lines=on.map(t=>`<li>${esc(bbaTopicIcon(t))} <b>${esc(bbaTopicName(t))}</b>: ${(n=>`${n} level${n===1?'':'s'}`)(t.levels.filter(l=>l.enabled!==false).length)}</li>`).join('');
  const el=$('#dlg');el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Publish for ${esc(ADM.kid.displayName)}?</div>
    <p>${esc(ADM.kid.displayName)} sees these islands the next time Brain Boost opens:</p><ul>${lines||'<li>No islands</li>'}</ul>
    ${warn.length?`<ul class="bba-problems">${warn.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:''}
    <p class="muted">Stars and scores are kept: they belong to each level, so a level you take out keeps its stars and has them again when it comes back. Other children are not changed.</p>
    <div class="dlg-btns"><button class="b sm" data-act="bbaPublish">Publish</button><button class="b ghost sm" data-act="cloudClose">Not yet</button></div></div></div>`;
}
function bbaPublish(){cloudClose();bbaSend('/profile',bbaOut(),()=>{bbaFromState();toast(`Published. ${ADM.kid.displayName} plays the new list from now on.`)})}
function bbaDiscard(){
  bbaConfirm('Discard the draft?',`${ADM.kid.displayName} keeps playing the published list. Unsaved changes on this page go too.`,'Discard',()=>bbaSend('/profile/draft',null,()=>{bbaFromState();toast('Draft discarded.')}));
}
function bbaConfirm(title,text,yes,fn){
  ADM.confirm=fn;const el=$('#dlg');el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">${esc(title)}</div><p>${esc(text)}</p>
    <div class="dlg-btns"><button class="b sm" data-act="bbaYes">${esc(yes)}</button><button class="b ghost sm" data-act="cloudClose">Cancel</button></div></div></div>`;
}
/* Switching child with unsaved changes asks first. */
function bbaKid(id){
  if(id===ADM.kid.id)return;
  if(!ADM.dirty)return bbaLoadKid(id);
  ADM.nextKid=id;const el=$('#dlg');el.className='show';
  el.innerHTML=`<div class="dlg"><div style="flex:1"><div class="dlg-name">Unsaved changes</div><p>${esc(ADM.kid.displayName)}'s list has changes that are not saved.</p>
    <div class="dlg-btns"><button class="b sm" data-act="bbaSwitchSave">Save draft and switch</button><button class="b ghost sm" data-act="bbaSwitchDrop">Switch without saving</button><button class="b ghost sm" data-act="cloudClose">Stay here</button></div></div></div>`;
}
window.addEventListener('beforeunload',e=>{if(ADM.dirty){e.preventDefault();e.returnValue=''}});

Object.assign(ACT,{
  bbaAsk:()=>bbaAsk(),
  bbaPin:()=>famUnlock(()=>bbaStart()),
  bbaPinSave:()=>famUnlock(()=>{cloudClose();const f=ADM.after;ADM.after=null;if(f)f()}),
  bbaFarm:()=>{const go=()=>{ADM.dirty=false;navTo('index.html',{screen:cur()?'town':'players'})};if(!ADM.dirty)return go();bbaConfirm('Leave without saving?','Your changes on this page are not saved yet.','Leave',go)},
  bbaKid:d=>bbaKid(d.id),
  bbaSwitchSave:()=>{cloudClose();ADM.problems=bbaCheck();if(ADM.problems.length)return bbaDraw();const id=ADM.nextKid;bbaSend('/profile/draft',bbaOut(),()=>{ADM.dirty=false;bbaLoadKid(id)})},
  bbaSwitchDrop:()=>{cloudClose();ADM.dirty=false;bbaLoadKid(ADM.nextKid)},
  bbaFilter:d=>{ADM.filter=d.g;bbaDraw()},
  bbaTpl:d=>bbaTemplate(d.g),
  bbaAddTopic:d=>bbaAddTopic(d.id),
  bbaAddLevel:d=>{let ti=ADM.sel?ADM.sel.t:-1;if(ti<0){const topic=d.from.split('/')[0];ti=ADM.work.topics.findIndex(t=>t.id===topic);if(ti<0){bbaAddTopic(topic);return}}bbaAddLevel(d.from,ti)},
  bbaSel:d=>{const l=d.l!=null?+d.l:null;ADM.sel={t:+d.t,l};ADM.openQ=-1;if(!ADM.preview||ADM.preview.t!==+d.t||ADM.preview.l!==l)ADM.preview=null;bbaDraw()},
  bbaOpenT:d=>{const t=ADM.work.topics[+d.t];ADM.open[t.id]=!ADM.open[t.id];bbaDraw()},
  bbaMoveT:d=>{const i=+d.t,j=i+Number(d.d);if(j<0||j>=ADM.work.topics.length)return;bbaMoveTopic(i,j>i?j+1:j)},
  bbaMoveL:d=>{const i=+d.t,j=+d.l,k=j+Number(d.d),n=ADM.work.topics[i].levels.length;if(k<0||k>=n)return;bbaMoveLevel(i,j,i,k>j?k+1:k)},
  bbaDelTopic:d=>bbaDelTopic(+d.t),
  bbaDelLevel:d=>bbaDelLevel(+d.t,+d.l),
  bbaNewTopic:()=>bbaNewTopic(),
  bbaNewQuiz:d=>bbaNewQuiz(+d.t),
  bbaQOpen:d=>{ADM.openQ=ADM.openQ===+d.k?-1:+d.k;bbaDraw()},
  bbaQMove:d=>{const qs=bbaOwnQuestions(bbaSelLevel()),i=+d.k,j=i+Number(d.d);if(j<0||j>=qs.length)return;[qs[i],qs[j]]=[qs[j],qs[i]];ADM.openQ=j;bbaChange()},
  bbaQDel:d=>{const qs=bbaOwnQuestions(bbaSelLevel());qs.splice(+d.k,1);ADM.openQ=-1;bbaChange()},
  bbaQAdd:()=>{const qs=bbaOwnQuestions(bbaSelLevel());qs.push({text:'',options:['',''].filter(Boolean),answer:''});ADM.openQ=qs.length-1;bbaChange()},
  bbaQReset:()=>{const l=bbaSelLevel();delete l.questions;ADM.openQ=-1;bbaChange()},
  bbaPreview:()=>{ADM.preview={t:ADM.sel.t,l:ADM.sel.l};ADM.previewNote='';bbaDraw();const f=document.getElementById('bbaFrame');if(f)f.scrollIntoView({block:'nearest',behavior:'smooth'})},
  bbaDraft:()=>bbaDraft(),
  bbaPublishAsk:()=>bbaPublishAsk(),
  bbaPublish:()=>bbaPublish(),
  bbaDiscard:()=>bbaDiscard(),
  bbaYes:()=>{cloudClose();const f=ADM.confirm;ADM.confirm=null;if(f)f()}
});
/* Cancel on the PIN box leaves the page locked. */
{const keep=ACT.famCancel;ACT.famCancel=()=>{keep();if(ADM.locked)bbaLocked()}}
bbaBoot();
