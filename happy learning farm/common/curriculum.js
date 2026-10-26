/* Happy Math Farm — curriculum: question generators + school (house) definitions.
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

/* ---------- grades ----------
   Each player picks a grade. Every school keeps one set of levels per grade in `grades`,
   so the same building opens a different 副本 for a P1 player and a P3 player.
   A school with no levels for the player's grade shows as "opening soon".
   Level ids must be unique across all grades (they are the keys in Player.lv). */
const GRADES=[
  {id:'p1',name:'P1',label:'Primary 1'},
  {id:'p3',name:'P3',label:'Primary 3'}
];
const DEFAULT_GRADE='p3';   // players saved before grades existed played the P3 content

const DUNGEONS=[
  {id:'tricks',name:'Brain Boost',sign:'Brain Boost',color:'#7A4DE0',open:true,
   npc:{name:'Professor Hoot',e:'🦉'},blurb:'Shortcuts that make big sums tiny',
   grades:{
   p1:null,   // P1 副本: content to be planned (max 6 levels, one per stone on the island)
   p3:{
   intro:['Hoo-hoo! Welcome to my Trick Shop.','In here, we never add numbers one by one. We hunt for shortcuts that make big sums tiny.','Clear a level to open the next one. The Trick Master boss waits at the end!'],
   levels:[
    {id:'t1',name:'Friends of 100',count:5,gen:i=>qFriends(i>=2&&i%2===0),
     intro:['Some numbers are best friends: together they make 100. Like <span class="ex">37 + 63 = 100</span>.',
            'Here\'s a secret: the ones digits make 10 (7 + 3), and the tens make 9 (3 + 6).',
            'In <span class="ex">37 + 48 + 63 + 52</span>, find the friends first: 37 + 63 = 100 and 48 + 52 = 100. So the answer is 200!',
            'Tap two numbers to make a friend pair, then add up what you have.']},
    {id:'t2',name:'Round and Fix',count:5,gen:()=>qRound(),
     intro:['Numbers like 99 and 198 are almost round. Round numbers are easy to add!',
            'To add 99, add 100 and take 1 away: <span class="ex">356 + 99 = 356 + 100 − 1 = 455</span>.',
            'To take away 98, take away 100, then give 2 back: <span class="ex">523 − 98 = 523 − 100 + 2 = 425</span>.',
            'Remember: if you took away too much, give it back!']},
    {id:'t3',name:'Multiplying Partners',count:5,gen:i=>qPartners(i===4),
     intro:['Some numbers are magic partners when you multiply: <span class="ex">25 × 4 = 100</span> <span class="ex">5 × 2 = 10</span> <span class="ex">125 × 8 = 1000</span>.',
            'In <span class="ex">25 × 13 × 4</span>, multiply the partners first: 25 × 4 = 100. Then 100 × 13 = 1300.',
            'You can multiply in any order, so the partners can be far apart. Hunt them down!']},
    {id:'t4',name:'Pair Them Up',count:5,gen:i=>qPairUp(['a','b','d','c','a'][i]),
     intro:['Look at <span class="ex">20 − 19 + 18 − 17 + … + 2 − 1</span>. So many numbers!',
            'Pair them up: (20 − 19) = 1, (18 − 17) = 1 … every pair makes 1.',
            'There are 20 numbers, so there are 10 pairs. The answer is 10!',
            'Count the numbers, then halve it to count the pairs.']},
    {id:'t5',name:'Zero Boxes',count:5,gen:i=>[qZeroBox,qWorksheet,()=>qGroup4('down'),()=>qGroup4('up'),()=>qGroup4('down')][i](),
     intro:['Now the signs go <span class="ex">+ − − +</span> and then repeat.',
            'Like <span class="ex">10 − 9 − 8 + 7 + 6 − 5 − 4 + 3 + 2 − 1</span>.',
            'Each group of 4 makes 0! <span class="ex">(10 − 9 − 8 + 7) = 0</span>. I call them zero boxes.',
            'Pack the zero boxes, and only the leftovers matter. Let\'s try!']},
    {id:'t6',name:'Boss: Trick Master',count:8,boss:true,set:bossSet,
     intro:['This is the Trick Master challenge!','All the tricks are mixed up. Read each question and choose the right trick.','You have 3 hearts. Good luck, hunter!']}
   ]}}},
  {id:'patterns',name:'Patterns & Sequences',sign:'Pattern Garden',color:'#0B8F80',open:false,npc:{name:'Tilly the Turtle',e:'🐢'},blurb:'Opening soon',grades:{}},
  {id:'words',name:'Word Problem Quests',sign:'Word Problem Quests',color:'#E07A1F',open:false,npc:{name:'Leo the Lion',e:'🦁'},blurb:'Opening soon',grades:{}},
  {id:'fractions',name:'Fraction Bakery',sign:'Fraction Bakery',color:'#D93652',open:false,npc:{name:'Pip the Penguin',e:'🐧'},blurb:'Opening soon',grades:{}}
];
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
