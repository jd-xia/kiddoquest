/* Happy Learning Farm — Progress Board (board.html): grown-up view of stars, accuracy and history. */
/* ---------- progress board ---------- */
const pct=(a,b)=>b?Math.round(a/b*100):null;
const when=t=>new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
function rProgress(){
  const sections=DATA.players.map(p=>{
    const allQ=Object.values(p.lv).reduce((a,r)=>a+r.qs,0),allF=Object.values(p.lv).reduce((a,r)=>a+r.first,0);
    const cleared=Object.values(p.lv).filter(r=>r.stars>0).length;
    const schools=DUNGEONS.map(d=>dun(d.id,p)).filter(d=>d.open);
    const maxStars=schools.reduce((a,d)=>a+playable(d).length*3,0),shownStars=schools.reduce((a,d)=>a+playable(d).reduce((b,l)=>b+((p.lv[l.id]||{}).stars||0),0),0);
    const weak=[],strong=[];
    const rows=schools.map(D=>`<tr><th colspan="5" style="padding-top:14px;color:var(--ink)">${D.name}</th></tr>`+playable(D).map(l=>{
      const r=p.lv[l.id];
      if(!r)return `<tr><td>${l.name}</td><td class="muted" colspan="4">Not started</td></tr>`;
      const a=pct(r.first,r.qs);
      if(a!==null&&r.qs>=5&&a<70)weak.push(`${l.name} (${a}%)`);
      if(a!==null&&r.qs>=5&&a>=90)strong.push(l.name);
      return `<tr><td>${l.name}</td><td>${'★'.repeat(r.stars)}${'☆'.repeat(3-r.stars)}</td><td>${a===null?'–':`<span class="bar"><i class="${a<70?'low':''}" style="width:${a}%"></i></span>${a}%`}</td><td>${r.plays}</td><td class="muted">${when(r.last)}</td></tr>`;
    }).join('')).join('');
    const recent=p.sessions.slice(0,10).map(s=>{const l=levelById(s.lv);return `<tr><td class="muted">${when(s.t)}</td><td>${l?l.name:s.lv}</td><td>${s.ok?'⭐'.repeat(s.stars):'<span class="tag">Not finished</span>'}</td><td>${s.qs?`${s.first}/${s.qs} first try`:'–'}</td><td class="muted">${Math.max(1,Math.round(s.secs/60))} min</td></tr>`}).join('');
    const renaming=UI.renaming===p.id,removing=UI.removing===p.id;
    return `<div class="card section">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="font-size:40px">${avE(p)}</span>
      ${renaming?`<input type="text" id="rename" value="${esc(p.name)}" maxlength="16" aria-label="New name"><button class="b sm" data-act="renameSave" data-id="${p.id}">Save</button>`:`<h2 style="margin:0;flex:1">${esc(p.name)}</h2><button class="b ghost sm" data-act="renameStart" data-id="${p.id}">Rename</button>`}
      <button class="b ghost sm" data-act="remove" data-id="${p.id}" ${removing?'style="border-color:var(--minus);color:var(--minus)"':''}>${removing?'Tap again to remove':'Remove'}</button></div>
      <p>Grade: ${GRADES.map(g=>`<button class="b ${gradeOf(p)===g.id?'':'ghost'} sm" data-act="setGrade" data-id="${p.id}" data-g="${g.id}" aria-pressed="${gradeOf(p)===g.id}">${g.name}</button>`).join(' ')}
        <span class="muted">Each grade has its own levels in every school. Stars from other grades are kept.</span></p>
      <div class="kpis">
        <div class="kpi"><b>${shownStars}<small style="font-size:15px"> / ${maxStars}</small></b><span>Stars</span></div>
        <div class="kpi"><b>${cleared}</b><span>Levels cleared</span></div>
        <div class="kpi"><b>${pct(allF,allQ)===null?'–':pct(allF,allQ)+'%'}</b><span>Right first try</span></div>
        <div class="kpi"><b>${Math.round(p.time/60)}</b><span>Minutes of maths</span></div>
        <div class="kpi"><b>${farmLevel(farmOf(p).xp).l}</b><span>Farm level</span></div>
        <div class="kpi"><b>${artCount(p)}</b><span>Pictures drawn 🎨</span></div>
        <div class="kpi"><b>${Object.values(farmOf(p).barn).reduce((a,b)=>a+b,0)}</b><span>Farm goods collected</span></div>
      </div>
      ${weak.length?`<p><span class="tag">Needs practice</span> ${weak.join(', ')}</p>`:''}
      ${strong.length?`<p><span class="tag good">Strong</span> ${strong.join(', ')}</p>`:''}
      <div class="scroll"><table class="table"><tr><th>Level</th><th>Best</th><th>Right first try</th><th>Plays</th><th>Last played</th></tr>${rows}</table></div>
      <h3>Recent activity</h3>
      ${recent?`<div class="scroll"><table class="table">${recent}</table></div>`:'<p class="muted">No games played yet.</p>'}
    </div>`;
  }).join('');
  $('#app').innerHTML=topBar('Progress Board','toTown')+`<p class="muted">“Right first try” counts questions answered correctly without losing a heart. Levels below 70% are flagged for practice. ${typeof cloudStatusLine==='function'?cloudStatusLine():'Progress is saved on this device.'}</p>`+sections+
  `<div class="card section"><h2>Start again</h2><p class="muted">Every child on this device goes back to a new farm with 1000 coins. Stars, crops and earned coins are cleared. A saved farm stays until you open Sync and tap Upload.</p><button class="b ghost" data-act="resetAll">${resetArmed?'Tap again to reset every child':'Reset every child'}</button><p class="muted">Close removes this child after the name is typed again. A saved child is removed here and on the account.</p><button class="b ghost" data-act="cloudCloseCurrent">Close this child</button></div>`;
}

Object.assign(ACT,{
  setGrade:d=>{DATA.players.find(p=>p.id===d.id).grade=d.g;save();rProgress()},
  renameStart:d=>{UI.renaming=d.id;UI.removing=null;rProgress();$('#rename').focus()},
  renameSave:d=>{const v=($('#rename').value||'').trim();if(v){DATA.players.find(p=>p.id===d.id).name=v.slice(0,16);save()}UI.renaming=null;rProgress()},
  remove:d=>{
    if(UI.removing!==d.id){UI.removing=d.id;return rProgress()}
    DATA.players=DATA.players.filter(p=>p.id!==d.id);dropPlayerArt(d.id);
    if(!DATA.players.length)DATA.players.push(newPlayer('Player 1'));
    if(!cur())DATA.current=DATA.players[0].id;
    UI.removing=null;save();rProgress();
  }
});
startPage({progress:rProgress},()=>({screen:'progress'}));
