/* Runs one of the original Calculation Tricks levels (js/school.js) as its own Brain Boost level page.
   The page sets <body data-legacy="c3-1"> and loads this file after core.js and before school.js.
   Here the level never saves the farm: when it ends it tells the hub (level-kit.js), and the hub saves the
   result and pays the coins, so the farm on screen and the farm server always agree. */
(function(){
  const LEGACY=document.body.dataset.legacy||'';
  save=function(){};   // this frame shares the farm's storage with the hub: only the hub writes it
  /* the level's own copy of the child, set to the class the level belongs to (a P1 child may play a P3 level) */
  function findLevel(){
    for(const D of DUNGEONS)for(const g in D.grades||{}){const i=(D.grades[g].levels||[]).findIndex(l=>l.id===LEGACY);if(i>=0)return {did:D.id,grade:g,i}}
    return null;
  }
  function wait(text){$('#app').innerHTML=`<div class="boot"><span class="coin">🦉</span><p>${esc(text)}</p></div>`}
  function summary(){
    const q=UI.qs||[];
    return {answered:UI.answered||0,correct:UI.first||0,total:q.length,coins:UI.paid?(UI.mergeCoins||0):undefined};
  }
  startPage=function(screens){
    SCREENS=screens;
    wait('Getting the level ready…');
    /* every way out of the level goes back to the hub */
    go=function(){if(typeof basketStopRec==='function')basketStopRec();BBLevel.quit(summary())};
    navTo=go;
    finishLevel=function(ok){
      if(UI.screen!=='level')return;
      UI.screen='done';PAD=null;
      if(typeof basketStopRec==='function')basketStopRec();clearTimeout(UI.basketTimer);
      const r=summary();
      BBLevel.finish(Object.assign(r,{cleared:!!ok,stars:ok?Math.max(1,Math.min(3,UI.hearts)):0}));
      if(BBLevel.alone)wait(ok?`Cleared with ${Math.max(1,UI.hearts)} stars. Open this level from Brain Boost to save it.`:'Out of hearts. Open this level from Brain Boost to save it.');
      else wait('Saving…');
    };
    quitLevel=function(){if(typeof basketStopRec==='function')basketStopRec();clearTimeout(UI.basketTimer);BBLevel.quit(summary())};
    BBLevel.ready(info=>{
      const at=findLevel();
      if(!at){wait('This level is missing. Go back to Brain Boost.');return}
      if(!cur()){const p=newPlayer((info.child&&info.child.name)||'Tester',at.grade,'girl');DATA={v:3,updated:0,current:p.id,players:[p]}}
      cur().grade=at.grade;
      const fonts=Promise.race([document.fonts?document.fonts.load('600 48px Fredoka'):Promise.resolve(),new Promise(r=>setTimeout(r,1800))]).catch(()=>{});
      Promise.all([fonts,typeof loadArt==='function'?loadArt():null]).then(()=>{
        const D=dun(at.did),l=D.levels[at.i];
        UI={screen:'dungeon',did:D.id,mapAt:at.i};
        wait(l.name);
        dialog(D.npc,l.intro,()=>beginLevel(at.i));
      });
    });
  };
})();
