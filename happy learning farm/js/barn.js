/* Happy Math Farm — Barn (barn.html): harvest store and farm level. */
function barnHTML(){
  const f=farmOf(cur()),L=farmLevel(f.xp);
  const prods=[...SEEDS.map(s=>[s.id,ico('seed:'+s.id,s.e),s.name]),...ANIMALS.map(a=>[a.prod,ico('prod:'+a.prod,a.pe),a.pn])];
  return `<p>Farm level <b>${L.l}</b>: ${L.into} / ${L.need} XP to the next level</p><div class="pbarw"><i style="width:${Math.round(L.into/L.need*100)}%"></i></div>
  <div class="barn">${prods.map(([id,e,nm])=>`<div class="bi"><span class="e">${e}</span><b>${f.barn[id]||0}</b><small>${nm}</small></div>`).join('')}</div>
  <p class="muted">Harvest crops and collect from animals to earn XP. Higher farm levels unlock new seeds and animals.</p>`;
}
function rBarn(){
  const f=farmOf(cur()),total=Object.values(f.barn).reduce((a,n)=>a+n,0);
  $('#app').innerHTML=topBar('Barn','toTown')+npcHTML(FARMER,total?`You have stored ${total} things so far. Nice work!`:'The barn is empty. Plant seeds on the farm and harvest them to fill it up!')+`<div class="card">${barnHTML()}</div>
  <div class="btns"><button class="b" data-act="toTown">🌾 Back to the farm</button></div>`;
}
startPage({barn:rBarn},()=>({screen:'barn'}));
