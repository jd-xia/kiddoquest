/* Brain Boost level kit: how a level page talks to the Brain Boost hub (brain-boost.html).
   A level is one HTML page that the hub shows in a frame. It may load this file or send the same messages itself:
     level → hub  {type:'bb:ready'}                                        the page can start
     hub → level  {type:'bb:start', child, topic, level}                   level.rules: this level's rules from topic.json
     level → hub  {type:'bb:finish', cleared, stars, correct, total, secs}  stars 0 to 3; cleared false = out of hearts or time
     level → hub  {type:'bb:quit', answered, correct, total, secs}          the child left early
   The hub saves the result on the farm server and pays the coins; a level never saves anything itself.
   Opened on its own (not in a frame), a level plays with its default rules and saves nothing, for testing. */
const BBLevel=(()=>{
  const inHub=window.parent!==window;
  let startAt=Date.now();
  const send=msg=>{if(inHub)window.parent.postMessage(msg,location.origin)};
  const secs=()=>Math.round((Date.now()-startAt)/1000);
  function ready(cb){
    let done=false;
    const begin=info=>{if(done)return;done=true;startAt=Date.now();cb(info)};
    window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==window.parent)return;const m=e.data||{};if(m.type==='bb:start')begin(m)});
    if(inHub)send({type:'bb:ready'});
    else begin({alone:true,child:{name:'Tester',grade:new URLSearchParams(location.search).get('grade')||'p3'},topic:{},level:{rules:{}}});
  }
  return {
    alone:!inHub,
    ready,
    finish:r=>send(Object.assign({type:'bb:finish',secs:secs()},r)),
    quit:r=>send(Object.assign({type:'bb:quit',secs:secs()},r||{})),
    /* stars from hearts left: a cleared level always has at least one */
    stars:(hearts,max)=>Math.max(1,Math.min(3,Math.round(3*hearts/(max||3))))
  };
})();
