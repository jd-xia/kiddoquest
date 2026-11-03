/* Brain Boost quiz levels: questions written in topic.json (or by a grown-up in a child's profile) instead of
   made up by code. A quiz level page is a small index.html that loads level-kit.js and this file.
   A question is {text, options:[…] (2 to 6; none means type the answer), answer, hint, difficulty}.
   rules: hearts (3), questions (play only this many, picked at random, kept in order), shuffle (mix the choices).
   Opened on its own, the page finds its questions in ../topic.json by its folder name, for testing. */
(function(){
  const $=s=>document.querySelector(s);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const same=(a,b)=>String(a).trim().toLowerCase().replace(/\s+/g,' ')===String(b).trim().toLowerCase().replace(/\s+/g,' ');
  let S=null;
  function draw(){
    const q=S.qs[S.i];
    const choices=q.options&&q.options.length
      ?`<div class="lv-choices">${q.shown.map((c,k)=>`<button class="lv-choice ${q.tried.includes(c)?'wrong':''} ${S.done&&same(c,q.answer)?'right':''}" data-k="${k}" ${q.tried.includes(c)||S.done?'disabled':''}>${esc(c)}</button>`).join('')}</div>`
      :`<div class="lv-show" id="typed" aria-live="polite">${esc(S.typed)||'&nbsp;'}</div>${S.done?'':`<div class="lv-pad">${'123456789'.split('').map(n=>`<button data-key="${n}">${n}</button>`).join('')}<button data-key="back" aria-label="Delete">⌫</button><button data-key="0">0</button><button data-key="ok" class="ok">OK</button></div>
        <p class="lv-note">Type with the keyboard for words, a decimal point or a fraction.</p>`}`;
    $('#lv').innerHTML=`
    <div class="lv-top"><button class="lv-x" id="quit" aria-label="Leave level">✕</button><div class="lv-name">${esc(S.name)}</div>
     <div class="lv-prog" aria-label="Question ${S.i+1} of ${S.qs.length}">${S.qs.map((_,k)=>`<i class="${k<S.i?'ok':k===S.i?'on':''}"></i>`).join('')}</div>
     <div class="lv-hearts" aria-label="${S.hearts} hearts left">${'❤️'.repeat(S.hearts)}${'🖤'.repeat(S.max-S.hearts)}</div></div>
    ${S.preview?'<p class="lv-note">Preview: nothing is saved.</p>':''}
    <div class="lv-coach ${S.mood||''}"><span class="face" aria-hidden="true">${esc(S.face)}</span><div>${S.say||'Read carefully, then pick your answer.'}</div></div>
    <div class="lv-q lv-qtext">${esc(q.text)}</div>
    ${choices}
    ${S.done?`<button class="lv-btn" id="next">${S.i<S.qs.length-1?'Next ▸':'Finish ▸'}</button>`:''}`;
    $('#quit').onclick=()=>BBLevel.quit({answered:S.answered,correct:S.correct,total:S.qs.length});
    document.querySelectorAll('.lv-choice').forEach(b=>b.onclick=()=>choose(q.shown[+b.dataset.k]));
    document.querySelectorAll('.lv-pad button').forEach(b=>b.onclick=()=>key(b.dataset.key));
    const n=$('#next');if(n){n.onclick=next;n.focus()}
  }
  function key(k){
    if(!S||S.done||S.over)return;const q=S.qs[S.i];if(q.options&&q.options.length)return;
    if(k==='ok'){if(S.typed.trim())choose(S.typed);return}
    if(k==='back')S.typed=S.typed.slice(0,-1);else if(S.typed.length<40)S.typed+=k;
    const t=$('#typed');if(t)t.textContent=S.typed||' ';
  }
  function choose(v){
    const q=S.qs[S.i];if(S.done)return;
    if(!q.answered){q.answered=true;S.answered++}
    if(same(v,q.answer)){if(!q.tried.length)S.correct++;S.done=true;S.mood='good';S.say=`Yes! The answer is <b>${esc(q.answer)}</b>.`;S.typed='';draw();return}
    q.tried.push(v);S.hearts--;S.mood='bad';S.typed='';
    if(S.hearts<=0){end(false);return}
    S.say=`${esc(v)} is not it.${q.hint?' Hint: '+esc(q.hint):''} Try again!`;draw();
    const box=$('.lv-qtext');if(box)box.classList.add('shake');
  }
  function next(){if(S.i<S.qs.length-1){S.i++;S.done=false;S.mood='';S.say='';draw()}else end(true)}
  function end(ok){
    if(S.over)return;S.over=true;
    const stars=ok?BBLevel.stars(S.hearts,S.max):0;
    BBLevel.finish({cleared:ok,stars,correct:S.correct,total:S.qs.length,answered:S.answered});
    $('#lv').innerHTML=`<div class="lv-done"><h2>${ok?'Well done!':'Out of hearts'}</h2>
     ${ok?`<div class="lv-stars" aria-label="${stars} stars">${'⭐'.repeat(stars)}${'☆'.repeat(3-stars)}</div>`:''}
     <p>${S.correct} of ${S.qs.length} right first time.</p><p>${S.preview?'Preview finished. Nothing was saved.':BBLevel.alone?'Open this level from Brain Boost to save it.':'Saving…'}</p></div>`;
  }
  document.addEventListener('keydown',e=>{
    if(!S||S.done||S.over||e.ctrlKey||e.metaKey||e.altKey)return;const q=S.qs[S.i];if(q.options&&q.options.length)return;
    if(e.key==='Enter'){e.preventDefault();key('ok')}else if(e.key==='Backspace'){e.preventDefault();key('back')}else if(e.key.length===1&&!(e.target&&e.target.tagName==='BUTTON'&&e.key===' '))key(e.key);
  });
  function start(info,bank){
    const r=(info.level&&info.level.rules)||{},max=Math.max(1,Math.min(5,r.hearts||3));
    let list=(bank||[]).filter(q=>q&&q.text&&q.answer!=null&&q.answer!=='');
    if(!list.length){$('#lv').innerHTML='<div class="lv-done"><h2>No questions yet</h2><p>A grown-up can add questions in Brain Boost settings.</p></div>';return}
    const want=r.questions&&r.questions<list.length?r.questions:list.length;
    if(want<list.length){const keep=new Set(shuffle(list.map((_,k)=>k)).slice(0,want));list=list.filter((_,k)=>keep.has(k))}
    S={name:(info.level&&info.level.name)||document.title.split('·')[0].trim(),face:(info.topic&&info.topic.icon)||'🦉',preview:!!info.preview,
      qs:list.map(q=>Object.assign({},q,{answer:String(q.answer),tried:[],shown:q.options&&q.options.length?(r.shuffle?shuffle(q.options):q.options.slice()):null})),
      i:0,hearts:max,max,correct:0,answered:0,typed:'',done:false,over:false};
    draw();
  }
  BBLevel.ready(info=>{
    if(!info.alone)return start(info,info.level&&info.level.questions);
    const folder=location.pathname.replace(/\/(index\.html)?$/,'').split('/').pop();
    fetch('../topic.json',{cache:'no-cache'}).then(r=>r.json()).then(t=>{const L=(t.levels||[]).find(l=>l.id===folder)||{};start({level:L,topic:t},L.questions)})
      .catch(()=>start(info,[]));
  });
})();
