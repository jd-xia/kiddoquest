/* Happy Learning Farm — Farm Market (market.html): buy animals, decorations, outfits.
   The only things Mo buys are crops the child planted and harvested. A harvest is 4,
   and selling those 4 pays about 120% of the seed price. */
const HARVEST_COUNT=4;
const cropPay=(S,n)=>Math.max(1,Math.round(n*S.cost*1.2/HARVEST_COUNT));
function rMarket(){
  const p=cur(),f=farmOf(p),lv=farmLevel(f.xp).l,tab=UI.tab||'crops';
  const tabs=[['crops','🥕 Crops'],['animals','🐔 Animals'],['decor','🌷 Decorations'],['outfits','👒 Outfits']].map(([id,l])=>`<button class="b sm ${tab===id?'':'ghost'}" data-act="mtab" data-id="${id}">${l}</button>`).join('');
  let items='';
  if(tab==='crops'){
    const grown=SEEDS.filter(S=>(f.barn[S.id]||0)>0);
    items=grown.length?grown.map(S=>{const n=f.barn[S.id],pay=cropPay(S,n);
      return `<div class="item"><div class="e">${ico('seed:'+S.id,S.e)}</div><div class="nm">${S.name}</div><p class="muted" style="font-size:14px">You grew ${n}<br>Seed was ${S.cost} 🪙</p><div class="acts"><button class="b sm ghost" data-act="sellCrop" data-id="${S.id}">Sell ${n} for ${pay} 🪙</button></div></div>`}).join('')
      :'<p class="muted">Nothing to sell yet. Plant a seed, let it grow, then harvest it. Eggs, milk, wool, animals and clothes stay yours.</p>';
  }
  if(tab==='animals')items=ANIMALS.map(A=>{const n=f.animals.filter(a=>a.type===A.id).length,lock=lv<A.lv,full=n>=3,poor=p.gems<A.cost;
    const btn=lock?`<button class="b sm" disabled>Farm level ${A.lv}</button>`:full?'<button class="b sm" disabled>Pen is full</button>':`<button class="b sm" data-act="buyAnimal" data-id="${A.id}" ${poor?'disabled':''}>Buy ${A.cost} 🪙</button>`;
    return `<div class="item"><div class="e">${ico('animal:'+A.id,A.e)}</div><div class="nm">${A.name}</div><p class="muted" style="font-size:14px">Gives ${ico('prod:'+A.prod,A.pe)} every ${A.mins} min<br>You have ${n} / 3</p><div class="acts">${btn}</div></div>`}).join('');
  if(tab==='decor')items=DECOR.map(D=>{const own=f.decor.includes(D.id);
    return `<div class="item ${own?'using':''}"><div class="e">${ico('decor:'+D.id,D.e)}</div><div class="nm">${D.name}</div><div class="acts">${own?'<button class="b sm ghost" disabled>On your farm</button>':`<button class="b sm" data-act="buyDecor" data-id="${D.id}" ${p.gems<D.cost?'disabled':''}>Buy ${D.cost} 🪙</button>`}</div></div>`}).join('');
  if(tab==='outfits'){
    items=SHIRTS.map(([id,nm,c,cost])=>{const own=f.owned.includes('shirt:'+id),use=f.shirt===id;
      const main=use?'<button class="b sm ghost" disabled>Wearing</button>':own?`<button class="b sm" data-act="wear" data-id="shirt:${id}">Wear</button>`:`<button class="b sm" data-act="buyWear" data-id="shirt:${id}" ${p.gems<cost?'disabled':''}>Buy ${cost} 🪙</button>`;
      return `<div class="item ${use?'using':''}"><div class="e"><span class="swatch" style="background:${c}"></span></div><div class="nm">${nm} shirt</div><div class="acts">${main}</div></div>`}).join('')+
    HATS.map(([id,nm,e,cost])=>{const own=cost===0||f.owned.includes('hat:'+id),use=f.hat===id;   // free hats (and No hat) are always yours
      const main=use?'<button class="b sm ghost" disabled>Wearing</button>':own?`<button class="b sm" data-act="wear" data-id="hat:${id}">Wear</button>`:`<button class="b sm" data-act="buyWear" data-id="hat:${id}" ${p.gems<cost?'disabled':''}>Buy ${cost} 🪙</button>`;
      return `<div class="item ${use?'using':''}"><div class="e">${ico('hat:'+id,e)}</div><div class="nm">${nm}</div><div class="acts">${main}</div></div>`}).join('');
  }
  $('#app').innerHTML=topBar('Farm Market','toTown')+npcHTML(MERCHANT,UI.msg||`Welcome! You have ${p.gems} 🪙. I only buy crops you grew yourself. A harvest of ${HARVEST_COUNT} sells for about 120% of the seed price.`)+`<div class="btns" style="margin:0 0 14px">${tabs}</div><div class="items">${items}</div>`;
}
function buyAnimal(id){const p=cur(),f=farmOf(p),A=ANIMALS.find(a=>a.id===id);if(!A||p.gems<A.cost||farmLevel(f.xp).l<A.lv||f.animals.filter(a=>a.type===id).length>=3)return;
  p.gems-=A.cost;f.animals.push({type:id,last:Date.now()});save();UI.msg=`Your new ${A.name} ${A.e} is waiting in the animal pen!`;rMarket()}
function buyDecor(id){const p=cur(),f=farmOf(p),D=DECOR.find(d=>d.id===id);if(!D||p.gems<D.cost||f.decor.includes(id))return;
  p.gems-=D.cost;f.decor.push(id);save();UI.msg=`The ${D.name} ${D.e} have been added to your farm!`;rMarket()}
function sellCrop(id){
  const p=cur(),f=farmOf(p),S=SEEDS.find(s=>s.id===id),n=S?f.barn[id]||0:0;
  if(!S||n<1)return;
  const pay=cropPay(S,n);
  delete f.barn[id];
  p.gems+=pay;save();
  UI.msg=`Sold ${n} ${S.name.toLowerCase()}${n>1?'s':''} for ${pay} 🪙.`;rMarket();
}
function wear(key,buy){const p=cur(),f=farmOf(p),[kind,id]=key.split(':');
  const item=kind==='shirt'?SHIRTS.find(s=>s[0]===id):HATS.find(h=>h[0]===id);if(!item)return;const cost=item[3];
  if(buy){if(f.owned.includes(key)||p.gems<cost)return;p.gems-=cost;f.owned.push(key)}
  if(cost===0&&!f.owned.includes(key))f.owned.push(key);
  if(!f.owned.includes(key))return;f[kind]=id;save();UI.msg='Looking great!';rMarket()}

Object.assign(ACT,{
  mtab:d=>{UI.tab=d.id;UI.msg=null;rMarket()},buyAnimal:d=>buyAnimal(d.id),buyDecor:d=>buyDecor(d.id),
  sellCrop:d=>sellCrop(d.id),
  wear:d=>wear(d.id,false),buyWear:d=>wear(d.id,true)
});
startPage({market:rMarket,shop:rMarket},()=>({screen:'market'}));
