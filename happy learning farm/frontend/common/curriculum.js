/* Happy Learning Farm — curriculum: question generators + school (house) definitions.
   Every school in DUNGEONS gets its own page: school-<id>.html (see REQUIREMENTS.md §6.1). */
/*GEN-START*/
const P4=['+','-','-','+'], P2=['+','-'], MINUS='−';
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const sg=s=>s==='+'?'+':MINUS;
const val=t=>t.s==='+'?t.n:-t.n;
const sumT=a=>a.reduce((x,t)=>x+val(t),0);
const range=(a,b)=>{const r=[];if(a>=b)for(let i=a;i>=b;i--)r.push(i);else for(let i=a;i<=b;i++)r.push(i);return r};
const makeTerms=(nums,pat)=>nums.map((n,i)=>({n,s:pat[i%pat.length]}));
function termsText(a,lead){return a.map((t,i)=>(i===0&&!lead?'':sg(t.s)+' ')+t.n).join(' ')}
function exprHTML(t,maxShow=14){
  const tok=(x,i)=>i===0?`${x.n}`:` <span class="${x.s==='+'?'p':'m'}">${sg(x.s)}</span> ${x.n}`;
  if(t.length<=maxShow)return t.map(tok).join('');
  const nx=t[8];
  return t.slice(0,8).map(tok).join('')+` <span class="${nx.s==='+'?'p':'m'}">${sg(nx.s)}</span> ⋯`+t.slice(-6).map((x,j)=>tok(x,t.length-6+j)).join('');
}
function groupSteps(t,g){
  const k=Math.floor(t.length/g),first=t.slice(0,g),gv=sumT(first);
  const st=[`Make groups of ${g}: (${termsText(first)}) = ${gv}`];
  const starts=[];for(let j=0;j<k;j++)starts.push(t[j*g].n);
  const sl=starts.length>5?`${starts.slice(0,3).join(', ')} … ${starts[starts.length-1]}`:starts.join(', ');
  st.push(`Groups start at ${sl}. That makes ${k} groups.`);
  const left=t.slice(k*g);
  if(!left.length)st.push(`${k} × ${gv} = ?`);
  else{const lv=sumT(left);st.push(`${k} × ${gv} = ${k*gv}`);st.push(`Left over: ${termsText(left,true)} = ${lv}`);st.push(`${k*gv} + ${lv} = ?`)}
  return st;
}
function termQ(t,steps,say){return{type:'input',html:exprHTML(t)+' = ?',answer:sumT(t),steps,say}}

/* Level 1: friends of 100 */
function qFriends(three){
  let a,b,c;
  do{a=rnd(12,88)}while(a===50||a%10===0);
  if(!three){
    do{b=rnd(12,88)}while(b===50||b%10===0||b===a||b===100-a);
    const nums=shuffle([a,100-a,b,100-b]);
    return{type:'pair',target:100,nums,html:nums.join(' + ')+' = ?',answer:200,
      steps:[`${a} + ${100-a} = 100`,`${b} + ${100-b} = 100`,`100 + 100 = ?`],say:'Tap two numbers that make 100 together.'};
  }
  do{c=rnd(13,89)}while(c===a||c===100-a||c===50);
  const nums=shuffle([a,100-a,c]);
  return{type:'pair',target:100,nums,html:nums.join(' + ')+' = ?',answer:100+c,
    steps:[`${a} + ${100-a} = 100`,`100 + ${c} = ?`],say:'Only one pair makes 100 this time. Find it!'};
}
/* Level 2: round and fix */
function qRound(){
  const add=Math.random()<.55;
  const [n,R,d]=pick(add?[[99,100,-1],[98,100,-2],[199,200,-1],[198,200,-2],[299,300,-1],[101,100,1],[102,100,2],[201,200,1]]
                         :[[99,100,-1],[98,100,-2],[199,200,-1],[198,200,-2],[101,100,1],[102,100,2]]);
  const ds=`${n} = ${R} ${d<0?MINUS:'+'} ${Math.abs(d)}`;
  if(add){
    const a=rnd(125,990-n);
    return{type:'input',html:`${a} + ${n} = ?`,answer:a+n,
      steps:[ds,`${a} + ${R} = ${a+R}`,`${a+R} ${d<0?MINUS:'+'} ${Math.abs(d)} = ?`],say:'Make the number round first, then fix it.'};
  }
  const a=rnd(n+120,950);
  return{type:'input',html:`${a} ${MINUS} ${n} = ?`,answer:a-n,
    steps:[ds,`${a} ${MINUS} ${R} = ${a-R}`,d<0?`We took away ${-d} too many, so give ${-d} back: ${a-R} + ${-d} = ?`:`We didn't take away enough, so take ${d} more: ${a-R} ${MINUS} ${d} = ?`],
    say:'Round it, then fix it. Careful with take-away!'};
}
/* Level 3: multiplying partners */
function qPartners(four){
  if(four){
    const f=shuffle([25,4,5,2]);
    return{type:'input',html:f.join(' × ')+' = ?',answer:1000,steps:['25 × 4 = 100','5 × 2 = 10','100 × 10 = ?'],say:'Two pairs of partners are hiding here.'};
  }
  const [p,q]=pick([[25,4],[5,2],[125,8],[50,2],[20,5]]);
  let x;do{x=p*q===1000?rnd(3,9):rnd(3,19)}while(x===p||x===q||x===10);
  const order=Math.random()<.7?shuffle([[p,x,q],[q,x,p]])[0]:shuffle([p,q,x]);
  return{type:'input',html:order.join(' × ')+' = ?',answer:p*q*x,
    steps:[`Partners first: ${p} × ${q} = ${p*q}`,`${p*q} × ${x} = ?`],say:'Find the multiplying partners first.'};
}
/* Level 4: pair up */
function qPairUp(kind){
  kind=kind||pick(['a','b','c','d']);
  if(kind==='a'){const N=2*rnd(5,15);const t=makeTerms(range(N,1),P2);return termQ(t,groupSteps(t,2),'Pair them up from the start.')}
  if(kind==='b'){const k=rnd(5,10);const t=makeTerms(range(100,100-2*k+1),P2);return termQ(t,groupSteps(t,2),'Big numbers, same trick: pair them up.')}
  if(kind==='d'){const k=rnd(4,8),S=2*rnd(20,30);const t=makeTerms(Array.from({length:2*k},(_,j)=>S-2*j),P2);return termQ(t,groupSteps(t,2),'What does each pair make this time?')}
  const n=2*rnd(5,12)+1,k=(n-1)/2;const t=makeTerms(range(1,n),P2);
  return termQ(t,[`Keep 1 by itself, then pair the rest backwards: 1 + (3 ${MINUS} 2) + (5 ${MINUS} 4) + … + (${n} ${MINUS} ${n-1})`,`Each pair makes 1. There are ${k} pairs.`,`1 + ${k} = ?`],'Tricky one! Try keeping the first number on its own.');
}
/* Level 5: zero boxes */
function qZeroBox(){const t=makeTerms(range(10,1),P4);return{type:'zerobox',terms:t,html:exprHTML(t)+' = ?',answer:1,
  steps:[`(10 ${MINUS} 9 ${MINUS} 8 + 7) = 0`,`(6 ${MINUS} 5 ${MINUS} 4 + 3) = 0`,`Left over: 2 ${MINUS} 1 = ?`],say:'Tap numbers side by side. If they make 0, pack them into a zero box!'}}
function qWorksheet(){const t=makeTerms(range(50,1),P4);return termQ(t,groupSteps(t,4),'This one is from your worksheet! Think in groups of 4.')}
function qGroup4(kind){
  kind=kind||pick(['down','up']);let t;
  if(kind==='down')t=makeTerms(range(rnd(16,40),1),P4);
  else{let n;do{n=rnd(13,41)}while(n%4!==0&&n%4!==1);t=makeTerms(range(1,n),P4)}
  return termQ(t,groupSteps(t,4),'Spot the + − − + pattern, then count the boxes.');
}
function bossSet(){
  const pool=[()=>qFriends(Math.random()<.5),qRound,()=>qPartners(Math.random()<.2),()=>qPairUp(),()=>qGroup4()];
  const list=shuffle(pool).concat([pick(pool),pick(pool),pick(pool)]);
  return shuffle(list).map(f=>{const q=f();q.say='Which trick fits this one?';return q});
}
/*GEN-END*/

/* ---------- P3 Calculation Tricks ---------- */
/* Best Friend Pairs: two terms are best friends when together they make a round hundred or thousand.
   'add': a + b = 100 or 1000      'same': +a − b, same last two digits      'neg': −a − b = −(round number) */
function friendPair(kind){
  if(kind==='add'){const R=pick([100,1000,1000]);let a;do{a=R===100?rnd(11,89):rnd(101,899)}while(a%10===0);return[{n:a,s:'+'},{n:R-a,s:'+'}]}
  if(kind==='same'){let b;do{b=rnd(112,480)}while(b%10===0);return[{n:b+100*rnd(1,3),s:'+'},{n:b,s:'-'}]}
  let a;do{a=rnd(12,89)}while(a%10===0);return[{n:a,s:'-'},{n:100*rnd(2,4)-a,s:'-'}];
}
const pairText=(p,plain)=>plain?`${p[0].n} + ${p[1].n} = ${sumT(p)}`:`${sg(p[0].s)}${p[0].n} ${sg(p[1].s)} ${p[1].n} = ${sumT(p)>0?'+':MINUS}${Math.abs(sumT(p))}`;
function friendsQ(pairs,terms,say,unit){
  const plain=terms.every(t=>t.s==='+'),vals=pairs.map(sumT),last=vals.map((v,k)=>(k?(v<0?` ${MINUS} `:' + '):'')+Math.abs(v)).join('');
  return{type:'friends',unit:unit||100,plain,terms,html:exprHTML(terms)+' = ?',answer:sumT(terms),steps:[...pairs.map(p=>pairText(p,plain)),`${last} = ?`],say};
}
function qBestFriends(kinds){
  for(;;){const pairs=kinds.map(friendPair),terms=shuffle(pairs.flat());
    const first=terms.findIndex(t=>t.s==='+'&&t.n>300);if(first<0)continue;terms.unshift(terms.splice(first,1)[0]);   // start with a big + number
    let run=0;if(terms.some(t=>(run+=val(t))<0))continue;   // never dips below zero on the way
    return friendsQ(pairs,terms,'Tap two best friends that make a round number.')}
}
function qFriendsWorksheet(){
  const t=makeTerms([785,349,36,249,364,215],['+','+','-','-','-','+']);
  return friendsQ([[t[0],t[5]],[t[1],t[3]],[t[2],t[4]]],t,'This one is from your worksheet! Find all three pairs of best friends.');
}
/* Hat and Cloak: a near-round number puts on a hat (it grows to the round number) and its cloak
   remembers how much it grew: 998 = 1000 − 2. Add the hats, then take off the cloaks. */
function hatQ(nums,say){
  const hats=nums.map(n=>{let R=1;while(R<n)R*=10;return{R,d:R-n}}),round=hats.reduce((a,h)=>a+h.R,0),cloak=hats.reduce((a,h)=>a+h.d,0);
  return{type:'hats',nums,hats,html:nums.join(' + ')+' = ?',answer:round-cloak,
    steps:[...nums.map((n,k)=>`${n} = ${hats[k].R} ${MINUS} ${hats[k].d}`),`Hats: ${hats.map(h=>h.R).join(' + ')} = ${round}`,`Cloaks: ${hats.map(h=>h.d).join(' + ')} = ${cloak}`,`${round} ${MINUS} ${cloak} = ?`],say};
}
function qHatCloak(count,maxPow){
  const nums=Array.from({length:count},()=>Math.pow(10,rnd(2,maxPow))-rnd(1,3)).sort((a,b)=>a-b);
  return hatQ(nums,'Tap each number to give it a hat.');
}
function qHatWorksheet(){return hatQ([98,998,998,99998,999998],'This one is from your worksheet! Five numbers need hats.')}

/* ---------- P1 Calculation Tricks ---------- */
/* Best Friend Pairs for P1: only adding, and best friends make a round ten (10, 20, 30, 40). */
function tenPair(){const S=10*rnd(1,4);let a;do{a=rnd(1,S-1)}while(a%10===0);return[{n:a,s:'+'},{n:S-a,s:'+'}]}
function qTenFriends(n){const pairs=Array.from({length:n},tenPair);return friendsQ(pairs,shuffle(pairs.flat()),'Tap two best friends that make 10, 20, 30…',10)}
function qTenWorksheet(){
  const t=makeTerms([19,6,12,13,21,4,8,17],['+']);
  return friendsQ([[t[0],t[4]],[t[1],t[5]],[t[2],t[6]],[t[3],t[7]]],t,'This one is from your worksheet! Find four pairs of best friends.',10);
}
/* Hat and Cloak for P1: numbers just under 100. */
function qHatsP1(count){return hatQ(Array.from({length:count},()=>100-rnd(1,4)),'Tap each number to give it a hat.')}
function qHatWorksheetP1(){return hatQ([99,97,98,96,98],'This one is from your worksheet! Five numbers need hats.')}
/* Same Basket: A baskets of B fruit, and A baskets of C fruit. Drag one from each orchard into the
   same big basket. A stays A. B and C join, so A×B + A×C becomes A×(B+C). Then a short demo, and the child types the product. */
function basketQ(a,b,c,say){
  return{type:'basket',a,b,c,html:`${a} × ${b} + ${a} × ${c}`,answer:a*(b+c),
    say:say||'Drag one basket from each orchard into the same place in the magic basket.'};
}
function qBasketFruit(){
  for(;;){const a=rnd(2,4),b=rnd(1,5),c=rnd(1,5);if(b!==c&&a*(b+c)<=24)return basketQ(a,b,c)}
}
function qBasketSheetP1(){return basketQ(3,4,2,'Three baskets of 4 red apples, and three baskets of 2 green apples. Drag one of each into the same big basket.')}
function qBasketNums(a,b,c,say){
  const q=basketQ(a,b,c,say||'No apples this time. Drag both numbers into the same basket. The shared count stays in front.');
  q.hard=true;return q;
}
function qBasketP1(i){
  if(i===0)return qBasketSheetP1();
  if(i<3)return qBasketFruit();
  return i===3?qBasketNums(4,12,16,'Four groups of 12 and four groups of 16. These are two-digit numbers.'):qBasketNums(3,25,15,'Three groups of 25 and three groups of 15.');
}
function qBasketFruitP3(){
  for(;;){const a=rnd(3,5),b=rnd(2,6),c=rnd(2,6);if(b!==c)return basketQ(a,b,c,'Same number of baskets in each orchard. Drag one from each into the same big basket.')}
}
function qBasketP3(i){
  if(i===0)return basketQ(4,6,4,'Four baskets of 6 red apples, and four baskets of 4 green apples. Drag one from each into the same big basket.');
  if(i<3)return qBasketFruitP3();
  return i===3?qBasketNums(4,120,105,'Four groups of 120 and four groups of 105. These are three-digit numbers.'):qBasketNums(6,200,150,'Six groups of 200 and six groups of 150.');
}
/* Break It Up: the other way from Same Basket. A × (B + C) = A × B + A × C.
   Each mixed basket holds B red and C green. Drag the two kinds apart. A stays A.
   Then a short demo, and the child types A×B + A×C. */
function breakQ(a,b,c,say){
  return{type:'break',a,b,c,html:`${a} × (${b} + ${c})`,answer:a*(b+c),
    say:say||'Drag the red apples to the red orchard and the green apples to the green orchard.'};
}
function qBreakFruit(){
  for(;;){const a=rnd(2,4),b=rnd(1,5),c=rnd(1,5);if(b!==c&&a*(b+c)<=24)return breakQ(a,b,c)}
}
function qBreakSheetP1(){return breakQ(3,4,2,'Three baskets. Each holds 4 red apples and 2 green apples. Break them apart.')}
function qBreakNums(a,n,b,c,bad,say){
  const q=breakQ(a,b,c,say||`Break ${n} so both parts are easy to multiply by ${a}.`);
  q.hard=true;q.n=n;q.picks=[[b,c],...bad];q.html=`${a} × ${n}`;return q;
}
function qBreakP1(i){
  if(i===0)return qBreakSheetP1();
  if(i<3)return qBreakFruit();
  return i===3
    ?qBreakNums(4,28,20,8,[[10,18],[15,13]],'28 is a two-digit number. Pick the split with a ten.')
    :qBreakNums(6,45,40,5,[[20,25],[30,15]],'45 is a two-digit number. Pick the split with a ten.');
}
function qBreakFruitP3(){
  for(;;){const a=rnd(3,5),b=rnd(2,6),c=rnd(2,6);if(b!==c)return breakQ(a,b,c,'Break each basket into the two kinds of apples. The number of baskets stays the same.')}
}
function qBreakP3(i){
  if(i===0)return breakQ(4,6,4,'Four baskets. Each holds 6 red apples and 4 green apples. Break them apart.');
  if(i<3)return qBreakFruitP3();
  return i===3
    ?qBreakNums(4,225,200,25,[[180,45],[150,75]],'225 is a three-digit number. Pick the split with a hundred.')
    :qBreakNums(6,350,300,50,[[180,170],[240,110]],'350 is a three-digit number. Pick the split with a hundred.');
}

/* ---------- grades ----------
   Each player picks a grade. Every school keeps one set of levels per grade in `grades`,
   so the same island opens a different 副本 for a P1 player and a P3 player.
   A topic with no levels for the player's grade shows as "coming soon".
   Level ids must be unique across all grades (they are the keys in Player.lv). */
const GRADES=[
  {id:'p1',name:'P1',label:'Primary 1'},
  {id:'p3',name:'P3',label:'Primary 3'}
];
const DEFAULT_GRADE='p3';   // players saved before grades existed played the P3 content

/* ---------- schools and topics ----------
   SCHOOLS are the buildings on the farm. Brain Boost opens onto a sea of islands, one island per
   maths topic (listed in `topics`). DUNGEONS are those topics: each has up to MAX_LEVELS levels per
   grade. A topic id is also its save key prefix (Player.seen, sessions), so never rename one. */
const MAX_LEVELS=10;
const SCHOOLS=[
  {id:'tricks',name:'Brain Boost',sign:'Brain Boost',color:'#7A4DE0',open:true,npc:{name:'Professor Hoot',e:'🦉'},
   blurb:'Six maths islands to explore',
   intro:['Hoo-hoo! Welcome to Brain Boost!','Every island out there is a maths topic. Sail to an island, then clear its levels one by one.','Each answer you get right first time earns a coin 🪙 for your farm.'],
   topics:['tricks','patterns','fractions','compare','models','age']},
  {id:'soon1',name:'New School',sign:'New School',color:'#0B8F80',open:false,npc:{name:'Tilly the Turtle',e:'🐢'},blurb:'Opening soon',topics:[]},
  {id:'soon2',name:'New School',sign:'New School',color:'#E07A1F',open:false,npc:{name:'Leo the Lion',e:'🦁'},blurb:'Opening soon',topics:[]},
  {id:'soon3',name:'New School',sign:'New School',color:'#D93652',open:false,npc:{name:'Pip the Penguin',e:'🐧'},blurb:'Opening soon',topics:[]}
];
const DUNGEONS=[
  {id:'tricks',school:'tricks',name:'Calculation Tricks',sign:'Calculation Tricks',color:'#7A4DE0',open:true,
   npc:{name:'Professor Hoot',e:'🦉'},blurb:'Shortcuts that make big sums tiny',
   grades:{
   p1:{
   intro:['Hoo-hoo! Welcome to my Trick Shop.','We don\'t add numbers one by one here. We look for clever shortcuts!','Best Friend Pairs, Hat and Cloak, and Same Basket are open. Clear Same Basket to open Break It Up.'],
   levels:[
    {id:'c1-1',name:'Best Friend Pairs',count:5,gen:i=>i===4?qTenWorksheet():qTenFriends([2,3,3,4][i]),
     intro:['Some numbers are best friends: together they make a round ten!',
            '<span class="ex">6 + 4 = 10</span> <span class="ex">12 + 8 = 20</span> <span class="ex">19 + 21 = 40</span>',
            'Look at the ones: 6 and 4 make 10. 2 and 8 make 10. 9 and 1 make 10.',
            'Tap two best friends to join them. When everyone has a friend, add up the tens!']},
    {id:'c1-2',name:'Hat and Cloak',count:5,gen:i=>i===4?qHatWorksheetP1():qHatsP1([2,3,3,4][i]),
     intro:['99 and 98 are almost 100. Let\'s dress them up!',
            'Put a hat on 98 and it grows into 100. Its cloak remembers the 2 we added: <span class="ex">98 = 100 − 2</span>',
            'Add up the hundreds first, then take off the cloaks.',
            '<span class="ex">99 + 98 = 100 + 100 − 1 − 2 = 197</span>']},
    {id:'c1-3',name:'Same Basket',count:5,gen:i=>qBasketP1(i),
     intro:['You are a little knight on the Magic Basket Challenge!',
            'The first three questions use apples. <span class="ex">3 × 4 + 3 × 2</span> means 3 baskets of 4, and 3 baskets of 2.',
            'Drag one from each orchard into the same big basket. 4 and 2 join. The 3 stays 3: <span class="ex">3 × (4 + 2)</span>',
            'The last two questions use two-digit numbers, like <span class="ex">4 × 12 + 4 × 16</span>.']},
    {id:'c1-4',name:'Break It Up',count:5,gen:i=>qBreakP1(i),
     intro:['Now break a full basket apart!',
            '<span class="ex">3 × (4 + 2) = 3 × 4 + 3 × 2</span>',
            'Drag each kind to its own orchard. Then watch: the number in front stays, and the basket splits in two.',
            'Type the answer. The last two questions are two-digit numbers. Pick the split with a ten first.']},
    {id:'c1-5',name:'Coming soon',soon:true},
    {id:'c1-6',name:'Coming soon',soon:true},
    {id:'c1-7',name:'Coming soon',soon:true},
    {id:'c1-8',name:'Coming soon',soon:true},
    {id:'c1-9',name:'Coming soon',soon:true},
    {id:'c1-10',name:'Coming soon',soon:true},
   ]},
   p3:{
   intro:['Hoo-hoo! Welcome to my Trick Shop.','In here, we never add numbers one by one. We hunt for shortcuts that make big sums tiny.','Best Friend Pairs, Hat and Cloak, and Same Basket are open. Clear Same Basket to open Break It Up.'],
   levels:[
    {id:'c3-1',name:'Best Friend Pairs',count:5,gen:i=>i===4?qFriendsWorksheet():qBestFriends([['add','same'],['add','neg'],['add','same','neg'],['add','neg','same'],null][i]),
     intro:['Some numbers are best friends: together they make a round number!',
            '<span class="ex">785 + 215 = 1000</span> The ones make 10, the tens make 9, and the hundreds make 9.',
            'Friends can share a minus sign too: <span class="ex">+349 − 249 = +100</span> <span class="ex">−36 − 364 = −400</span>',
            'Tap two best friends to join them. When everyone has a friend, add up the round numbers!']},
    {id:'c3-2',name:'Hat and Cloak',count:5,gen:i=>i===4?qHatWorksheet():qHatCloak([3,3,4,4][i],[3,4,5,6][i]),
     intro:['Numbers like 98 and 998 are almost round. Let\'s dress them up!',
            'Put a hat on 98 and it grows into 100. Its cloak remembers the 2 we added: <span class="ex">98 = 100 − 2</span>',
            'Add up all the round numbers first, then take off the cloaks.',
            '<span class="ex">98 + 998 = 100 + 1000 − 2 − 2 = 1094</span>']},
    {id:'c3-3',name:'Same Basket',count:5,gen:i=>qBasketP3(i),
     intro:['Same Basket starts with apples, just like the little knights.',
            '<span class="ex">4 × 6 + 4 × 4 = 4 × (6 + 4)</span>',
            'The first three questions are fruit. Drag one from each orchard into the same basket.',
            'The last two use three-digit numbers: <span class="ex">4 × 120 + 4 × 105</span>.']},
    {id:'c3-4',name:'Break It Up',count:5,gen:i=>qBreakP3(i),
     intro:['Break the basket apart again.',
            'Drag each kind to its own orchard. Then watch it split, and type the answer.',
            'The last two are three-digit numbers, like <span class="ex">4 × 225</span>.',
            'Every choice adds up. Pick the one with a hundred, then drag the two parts apart.']},
    {id:'c3-5',name:'Coming soon',soon:true},
    {id:'c3-6',name:'Coming soon',soon:true},
    {id:'c3-7',name:'Coming soon',soon:true},
    {id:'c3-8',name:'Coming soon',soon:true},
    {id:'c3-9',name:'Coming soon',soon:true},
    {id:'c3-10',name:'Coming soon',soon:true},
   ]}}},
  /* Topics still to be written: add {intro, levels} under a grade to open the island (REQUIREMENTS.md §6.1). */
  {id:'patterns',school:'tricks',name:'Number and Figure Patterns',sign:'Number and Figure Patterns',color:'#0B8F80',open:true,npc:{name:'Zara the Zebra',e:'🦓'},blurb:'Spot the rule, find what comes next',grades:{}},
  {id:'fractions',school:'tricks',name:'Fractions',sign:'Fractions',color:'#D93652',open:true,npc:{name:'Otto the Octopus',e:'🐙'},blurb:'Halves, quarters and more',grades:{}},
  {id:'compare',school:'tricks',name:'Comparison and Replacement',sign:'Comparison and Replacement',color:'#E07A1F',open:true,npc:{name:'Felix the Fox',e:'🦊'},blurb:'Swap one thing for another to solve it',grades:{}},
  {id:'models',school:'tricks',name:'Mastering Models',sign:'Mastering Models',color:'#2F7FD6',open:true,npc:{name:'Benny the Beaver',e:'🦫'},blurb:'Draw bar models to crack word problems',grades:{}},
  {id:'age',school:'tricks',name:'Age Problems',sign:'Age Problems',color:'#8B5CF6',open:true,npc:{name:'Dino the Dinosaur',e:'🦕'},blurb:'How old will they be?',grades:{}}
];
const schoolById=id=>SCHOOLS.find(s=>s.id===id);
/* The daily 10-minute practice: two levels, 5 questions each. Today's Tasks ask for these. */
const DAILY_LEVELS={p1:['c1-1','c1-2'],p3:['c3-1','c3-2']};
const gradeOf=p=>p&&GRADES.some(g=>g.id===p.grade)?p.grade:DEFAULT_GRADE;
const gradeName=id=>(GRADES.find(g=>g.id===id)||{}).name||id;
/* A school as one grade sees it: base info + that grade's intro/levels.
   open = the school has a page AND this grade has levels in it. */
function schoolFor(D,grade){
  const c=(D.grades||{})[grade];
  return Object.assign({},D,{intro:[],levels:[]},c||{},{grade,open:!!(D.open&&c&&c.levels&&c.levels.length)});
}
/* Find a level by id in any grade (progress board shows history from every grade). */
function levelById(id){
  for(const D of DUNGEONS)for(const g in D.grades||{}){const c=D.grades[g];const l=c&&c.levels.find(x=>x.id===id);if(l)return l}
  return null;
}
