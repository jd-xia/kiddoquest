/* Happy Math Farm — TEMPLATE for a new house page.
   1. Copy house-template.html  -> <your-house>.html  and set data-page to that file name.
   2. Copy js/house-template.js -> js/<your-house>.js and point the HTML's last <script> at it.
   3. Give the screen a name (below: 'workshop'), add it to PAGES in common/core.js,
      and add a building + zone on the plaza (js/plaza.js, buildFarmWorld) — see REQUIREMENTS.md §6.2. */
const KEEPER={name:'Builder Bea',e:'🐝'};
function rHouse(){
  const p=cur();
  $('#app').innerHTML=topBar('New House','toTown')+npcHTML(KEEPER,`Hi ${esc(p.name)}! This house is still empty. Build something fun here.`)+
  `<div class="card"><h2>Coming soon</h2><p class="muted">Put this house's content here.</p>
   <div class="btns"><button class="b" data-act="toTown">🌾 Back to the farm</button></div></div>`;
}
Object.assign(ACT,{/* house actions go here: myAction:d=>{...} */});
startPage({workshop:rHouse},()=>({screen:'workshop'}));
