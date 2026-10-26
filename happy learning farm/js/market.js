/* Happy Math Farm — Farm Market (market.html): animals, decorations, outfits. */
/* market */
function rMarket(){
  const p=cur(),f=farmOf(p),lv=farmLevel(f.xp).l,tab=UI.tab||'animals';
  const tabs=[['animals','🐔 Animals'],['decor','🌷 Decorations'],['outfits','👒 Outfits']].map(([id,l])=>`<button class="b sm ${tab===id?'':'ghost'}" data-act="mtab" data-id="${id}">${l}</button>`).join('');
  let items='';
  if(tab==='animals')items=ANIMALS.map(A=>{const n=f.animals.filter(a=>a.type===A.id).length,lock=lv<A.lv,full=n>=3,poor=p.gems<A.cost;
    const btn=lock?`<button class="b sm" disabled>Farm level ${A.lv}</button>`:full?'<button class="b sm" disabled>Pen is full</button>':`<button class="b sm" data-act="buyAnimal" data-id="${A.id}" ${poor?'disabled':''}>Buy ${A.cost} 🪙</button>`;
    return `<div class="item"><div class="e">${ico('animal:'+A.id,A.e)}</div><div class="nm">${A.name}</div><p class="muted" style="font-size:14px">Gives ${ico('prod:'+A.prod,A.pe)} every ${A.mins} min<br>You have ${n} / 3</p>${btn}</div>`}).join('');
  if(tab==='decor')items=DECOR.map(D=>{const own=f.decor.includes(D.id);
    return `<div class="item ${own?'using':''}"><div class="e">${ico('decor:'+D.id,D.e)}</div><div class="nm">${D.name}</div>${own?'<button class="b sm ghost" disabled>On your farm ✓</button>':`<button class="b sm" data-act="buyDecor" data-id="${D.id}" ${p.gems<D.cost?'disabled':''}>Buy ${D.cost} 🪙</button>`}</div>`}).join('');
  if(tab==='outfits'){
    items=SHIRTS.map(([id,nm,c,cost])=>{const own=f.owned.includes('shirt:'+id),use=f.shirt===id;
      return `<div class="item ${use?'using':''}"><div class="e"><span class="swatch" style="background:${c}"></span></div><div class="nm">${nm} shirt</div>${use?'<button class="b sm ghost" disabled>Wearing</button>':own?`<button class="b sm" data-act="wear" data-id="shirt:${id}">Wear</button>`:`<button class="b sm" data-act="buyWear" data-id="shirt:${id}" ${p.gems<cost?'disabled':''}>Buy ${cost} 🪙</button>`}</div>`}).join('')+
    HATS.map(([id,nm,e,cost])=>{const own=f.owned.includes('hat:'+id),use=f.hat===id;
      return `<div class="item ${use?'using':''}"><div class="e">${ico('hat:'+id,e)}</div><div class="nm">${nm}</div>${use?'<button class="b sm ghost" disabled>Wearing</button>':own?`<button class="b sm" data-act="wear" data-id="hat:${id}">Wear</button>`:`<button class="b sm" data-act="buyWear" data-id="hat:${id}" ${p.gems<cost?'disabled':''}>Buy ${cost} 🪙</button>`}</div>`}).join('');
  }
  $('#app').innerHTML=topBar('Farm Market','toTown')+npcHTML(MERCHANT,UI.msg||`Welcome to my market! You have ${p.gems} 🪙. Need more? Every right answer at Math School earns coins.`)+`<div class="btns" style="margin:0 0 14px">${tabs}</div><div class="items">${items}</div>`;
}
function buyAnimal(id){const p=cur(),f=farmOf(p),A=ANIMALS.find(a=>a.id===id);if(!A||p.gems<A.cost||farmLevel(f.xp).l<A.lv||f.animals.filter(a=>a.type===id).length>=3)return;
  p.gems-=A.cost;f.animals.push({type:id,last:Date.now()});save();UI.msg=`Your new ${A.name} ${A.e} is waiting in the animal pen!`;rMarket()}
function buyDecor(id){const p=cur(),f=farmOf(p),D=DECOR.find(d=>d.id===id);if(!D||p.gems<D.cost||f.decor.includes(id))return;
  p.gems-=D.cost;f.decor.push(id);save();UI.msg=`The ${D.name} ${D.e} have been added to your farm!`;rMarket()}
function wear(key,buy){const p=cur(),f=farmOf(p),[kind,id]=key.split(':');
  const item=kind==='shirt'?SHIRTS.find(s=>s[0]===id):HATS.find(h=>h[0]===id);if(!item)return;const cost=item[3];
  if(buy){if(f.owned.includes(key)||p.gems<cost)return;p.gems-=cost;f.owned.push(key)}
  if(!f.owned.includes(key))return;f[kind]=id;save();UI.msg='Looking great!';rMarket()}

Object.assign(ACT,{
  mtab:d=>{UI.tab=d.id;UI.msg=null;rMarket()},buyAnimal:d=>buyAnimal(d.id),buyDecor:d=>buyDecor(d.id),
  wear:d=>wear(d.id,false),buyWear:d=>wear(d.id,true)
});
startPage({market:rMarket,shop:rMarket},()=>({screen:'market'}));
