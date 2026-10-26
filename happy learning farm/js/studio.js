/* Happy Learning Farm — Art Studio (studio.html): children replace their character and any icon
   with their own drawing or photo. Pictures are turned into game-style stickers right here in
   the browser (cut out the paper, brighten, gold + white outline) and saved by common/art.js. */
const ART_STYLES=[['sticker','✨ Sticker'],['cartoon','🖍️ Cartoon'],['pixel','👾 Pixel']];
const ART_PRAISE=['What a masterpiece! 🎨','Wow, that looks amazing on the farm!','You are a real artist!','I love those colours!','The farm looks more like YOU now!'];
let EDIT=null;   // {key, src: canvas|img, srcUrl, style, bg, url, note, dirty}

/* ---------- gallery ---------- */
const artItem=key=>{for(const g of artCatalog())for(const it of g.items)if(it.key===key)return it;return null};
function rStudio(){
  if(UI.edit)return rEditor();
  const cat=artCatalog(),tab=UI.tab||'me',G=cat.find(g=>g.id===tab)||cat[0];
  const total=cat.reduce((a,g)=>a+g.items.length,0),mine=cat.reduce((a,g)=>a+g.items.filter(i=>artOf(i.key)).length,0);
  const tabs=cat.map(g=>`<button class="b sm ${G.id===g.id?'':'ghost'}" data-act="atab" data-id="${g.id}">${g.name}</button>`).join('');
  const items=G.items.map(it=>{const a=artOf(it.key);
    return `<div class="item ${a?'using':''}"><div class="e">${ico(it.key,it.e)}</div><div class="nm">${esc(it.name)}</div>
      <button class="b sm" data-act="artEdit" data-id="${esc(it.key)}">${a?'✏️ Change':'🎨 Draw my own'}</button></div>`}).join('');
  const hello=mine?`You have made <b>${mine}</b> of ${total} pictures. Keep going!`:'Hello, little artist! Draw anything on paper: yourself, a cow, a magic hat. Take a photo, and I will turn it into a sticker for your farm!';
  $('#app').innerHTML=topBar('Art Studio','toTown')+npcHTML(ARTIST,UI.msg||hello)+
  `<div class="card" style="margin-bottom:14px"><b>🎨 My pictures: ${mine} / ${total}</b><div class="pbarw"><i style="width:${Math.round(mine/total*100)}%"></i></div></div>
   <div class="btns" style="margin:0 0 14px">${tabs}</div>${G.id==='me'?looksHTML():''}<div class="items">${items}</div>
   <p class="muted">Your pictures are saved only on this device. Each player has their own.</p>`;
}

function looksHTML(){const p=cur(),mine=!!artOf('me');
  return `<div class="card looks"><h3 style="margin-top:0">Pick your character</h3>
    <div class="lookgrid">${LOOKS.map(L=>`<button class="lookbtn ${p.look===L.id?'on':''}" data-act="pickLook" data-id="${L.id}" aria-pressed="${p.look===L.id}" title="${L.name}"><span>${L.e}</span><small>${L.name}</small></button>`).join('')}</div>
    ${mine?'<p class="muted" style="margin:10px 0 0">You are using your own drawing. To use a character from this list, open your drawing below and tap “Use the original”.</p>':'<p class="muted" style="margin:10px 0 0">Or draw yourself below!</p>'}</div>`}
/* ---------- editor ---------- */
function rEditor(){
  const it=artItem(UI.edit);if(!it){UI.edit=null;return rStudio()}
  const a=artOf(it.key);
  if(!EDIT||EDIT.key!==it.key){
    EDIT={key:it.key,src:null,srcUrl:a&&a.src,style:(a&&a.style)||'sticker',bg:a?a.bg!==false:true,url:a&&a.url,note:'',dirty:false};
    if(a&&a.src){const i=new Image();i.onload=()=>{if(EDIT&&EDIT.key===it.key)EDIT.src=i};i.src=a.src}
  }
  if(UI.drawing)return rPad(it);
  const tip=it.key==='me'?'Draw yourself from head to toe. You will walk around the farm and fight monsters as your own drawing!'
    :`Draw your own ${esc(it.name)}! Big shapes, thick lines and bright colours work best.`;
  const styles=ART_STYLES.map(([id,l])=>`<button class="b sm ${EDIT.style===id?'':'ghost'}" data-act="artStyle" data-id="${id}" aria-pressed="${EDIT.style===id}">${l}</button>`).join('');
  $('#app').innerHTML=topBar('Art Studio','artBack')+npcHTML(ARTIST,tip)+
  `<div class="card">
    <div class="ed-row">
      <div class="ed-box"><small>Now</small><div class="ed-pic">${ico(it.key,it.e)}</div></div>
      <div class="ed-arrow" aria-hidden="true">➜</div>
      <div class="ed-box"><small>Your picture</small><div class="ed-pic">${EDIT.url?`<img class="ico" src="${EDIT.url}" alt="Your picture">`:'<span class="muted" style="font-size:15px">No picture yet</span>'}</div></div>
    </div>
    <div class="btns" style="justify-content:center"><button class="b" data-act="padOpen">✏️ Draw it here</button><label class="b ghost" for="artFile" tabindex="0">📷 Take a photo or pick a picture</label><input type="file" id="artFile" accept="image/*" hidden></div>
    <h3>Style</h3><div class="btns" style="margin-top:0">${styles}</div>
    <div class="btns"><button class="b sm ${EDIT.bg?'':'ghost'}" data-act="artBg" aria-pressed="${EDIT.bg}">✂️ Cut out the paper</button></div>
    ${EDIT.note?`<p class="muted">${EDIT.note}</p>`:''}
    <div class="btns">
      <button class="b" data-act="artSave" ${EDIT.dirty&&EDIT.url?'':'disabled'}>💾 Use it in my game</button>
      ${a?`<button class="b ghost" data-act="artReset" ${UI.resetting?'style="border-color:var(--minus);color:var(--minus)"':''}>${UI.resetting?'Tap again to go back':'↩️ Use the original'}</button>`:''}
      <button class="b ghost" data-act="artBack">Back</button>
    </div>
  </div>`;
}
/* ---------- drawing pad ----------
   Kids draw straight onto a transparent 512×512 canvas (white paper is only the CSS background),
   so "Done" hands a ready cut-out to the same stylize() as a photo. If the picture already has
   a photo or drawing, it is loaded so they can draw on top of it. */
const PEN_COLOURS=['#222222','#E5484D','#FF8A1F','#FFD43B','#2FA36B','#5EC8F2','#3E7BFA','#8B5CF6','#EC6FA9','#8B5A2B','#F5CBA7','#FFFFFF'];
const PEN_SIZES=[['Small',6],['Medium',14],['Big',28]];
const DRAW_PX=512;
let DRAW=null;   // {c, g, colour, size, erase, undo:[ImageData], last, mid, msg}
function newPad(){
  const c=cv(DRAW_PX,DRAW_PX);c.id='drawCanvas';c.setAttribute('aria-label','Drawing pad');
  DRAW={c,g:c.getContext('2d'),colour:PEN_COLOURS[0],size:14,erase:false,undo:[],last:null,mid:null,msg:''};
  if(EDIT.src){const w=EDIT.src.naturalWidth||EDIT.src.width,h=EDIT.src.naturalHeight||EDIT.src.height,k=DRAW_PX/Math.max(w,h);
    DRAW.g.drawImage(EDIT.src,(DRAW_PX-w*k)/2,(DRAW_PX-h*k)/2,w*k,h*k)}
  const pos=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*DRAW_PX/r.width,(e.clientY-r.top)*DRAW_PX/r.height]};
  c.addEventListener('pointerdown',e=>{e.preventDefault();c.setPointerCapture(e.pointerId);padSnap();const u=$('[data-act="padUndo"]');if(u)u.disabled=false;
    const p=pos(e);DRAW.last=DRAW.mid=p;penInk(()=>{DRAW.g.beginPath();DRAW.g.arc(p[0],p[1],penWidth()/2,0,Math.PI*2);DRAW.g.fill()})});
  c.addEventListener('pointermove',e=>{if(!DRAW.last)return;const p=pos(e),m=[(DRAW.last[0]+p[0])/2,(DRAW.last[1]+p[1])/2];
    penLine(DRAW.mid,DRAW.last,m);DRAW.mid=m;DRAW.last=p});
  const up=()=>{if(!DRAW.last)return;penLine(DRAW.mid,DRAW.last,DRAW.last);DRAW.last=null};
  c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
}
const penWidth=()=>DRAW.size*(DRAW.erase?1.6:1);
function penInk(fn){const g=DRAW.g;g.globalCompositeOperation=DRAW.erase?'destination-out':'source-over';g.strokeStyle=g.fillStyle=DRAW.colour;
  g.lineWidth=penWidth();g.lineCap=g.lineJoin='round';fn();g.globalCompositeOperation='source-over'}
function penLine(a,ctrl,b){penInk(()=>{const g=DRAW.g;g.beginPath();g.moveTo(a[0],a[1]);g.quadraticCurveTo(ctrl[0],ctrl[1],b[0],b[1]);g.stroke()})}
function padSnap(){DRAW.undo.push(DRAW.g.getImageData(0,0,DRAW_PX,DRAW_PX));if(DRAW.undo.length>15)DRAW.undo.shift()}
function padEmpty(){const d=DRAW.g.getImageData(0,0,DRAW_PX,DRAW_PX).data;for(let i=3;i<d.length;i+=4)if(d[i]>20)return false;return true}
function rPad(it){
  if(!DRAW)newPad();
  const tip=DRAW.msg||(it.key==='me'?'Draw yourself big: head, body, arms and legs. Fill the whole page!':`Draw a big ${esc(it.name)}. Use thick lines and fill in the colours!`);
  const colours=PEN_COLOURS.map(c=>`<button class="swatchbtn ${!DRAW.erase&&DRAW.colour===c?'on':''}" data-act="penColour" data-id="${c}" style="background:${c}" aria-label="Colour ${c}" aria-pressed="${!DRAW.erase&&DRAW.colour===c}"></button>`).join('');
  const sizes=PEN_SIZES.map(([nm,s])=>`<button class="b sm ${DRAW.size===s?'':'ghost'} pensize" data-act="penSize" data-id="${s}" aria-label="${nm} brush" aria-pressed="${DRAW.size===s}"><i style="width:${Math.max(6,s*.7)}px;height:${Math.max(6,s*.7)}px"></i></button>`).join('');
  $('#app').innerHTML=topBar('Art Studio','padCancel')+npcHTML(ARTIST,tip)+
  `<div class="card">
    <div class="pad-tools"><div class="swatches">${colours}</div>
      <div class="btns" style="margin-top:8px">${sizes}
        <button class="b sm ${DRAW.erase?'':'ghost'}" data-act="penErase" aria-pressed="${DRAW.erase}">🧽 Eraser</button>
        <button class="b sm ghost" data-act="padUndo" ${DRAW.undo.length?'':'disabled'}>↶ Undo</button>
        <button class="b sm ghost" data-act="padClear">🗑️ Clear</button></div></div>
    <div class="pad-wrap"></div>
    <div class="btns" style="justify-content:center"><button class="b" data-act="padDone">✅ Done</button><button class="b ghost" data-act="padCancel">Cancel</button></div>
  </div>`;
  $('.pad-wrap').appendChild(DRAW.c);   // the same canvas survives every re-render
}
function readFile(f){
  const u=URL.createObjectURL(f),i=new Image();
  i.onload=()=>{URL.revokeObjectURL(u);
    const k=Math.min(1,480/Math.max(i.naturalWidth,i.naturalHeight)),c=cv(Math.round(i.naturalWidth*k),Math.round(i.naturalHeight*k));
    c.getContext('2d').drawImage(i,0,0,c.width,c.height);
    EDIT.src=c;EDIT.srcUrl=encode(c,.85);restyle()};
  i.onerror=()=>{URL.revokeObjectURL(u);EDIT.note='Hmm, I could not open that picture. Try another one!';rEditor()};
  i.src=u;
}
function restyle(){if(!EDIT||!EDIT.src)return rEditor();const r=stylize(EDIT.src,EDIT);EDIT.url=r.url;EDIT.note=r.note;EDIT.dirty=true;rEditor()}

/* ---------- turning a photo into a game sticker ---------- */
const S_OUT=256,S_PAD=24,S_IN=S_OUT-2*S_PAD;
const cv=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
function encode(c,q){const u=c.toDataURL('image/webp',q||.9);return u.startsWith('data:image/webp')?u:c.toDataURL('image/png')}
function stylize(src,o){
  const w=src.naturalWidth||src.width,h=src.naturalHeight||src.height,k=S_IN/Math.max(w,h),dw=Math.round(w*k),dh=Math.round(h*k),x0=(S_IN-dw)>>1,y0=(S_IN-dh)>>1;
  let c=cv(S_IN,S_IN);const g=c.getContext('2d');g.drawImage(src,x0,y0,dw,dh);
  let note='',cut=false;
  if(o.bg){const r=cutBackground(c,[x0,y0,x0+dw-1,y0+dh-1]);note=r.note;cut=r.cut}
  if(!cut){g.globalCompositeOperation='destination-in';g.beginPath();g.roundRect?g.roundRect(x0,y0,dw,dh,26):g.rect(x0,y0,dw,dh);g.fill();g.globalCompositeOperation='source-over'}
  c=trimToContent(c);
  c=o.style==='pixel'?pixelate(c):tone(c,o.style==='cartoon');
  return{url:encode(frame(c,o.style==='pixel')),note};
}
/* Flood-fill the paper colour in from the picture's edges and make it transparent. */
function cutBackground(c,[x0,y0,x1,y1]){
  const W=c.width,H=c.height,g=c.getContext('2d'),im=g.getImageData(0,0,W,H),d=im.data;
  const edge=[];for(let x=x0;x<=x1;x++)edge.push(y0*W+x,y1*W+x);for(let y=y0;y<=y1;y++)edge.push(y*W+x0,y*W+x1);
  const opaque=edge.filter(i=>d[i*4+3]>200);
  if(opaque.length<edge.length*.3)return{cut:true,note:''};   // already a cut-out (transparent PNG)
  const med=ch=>{const v=opaque.map(i=>d[i*4+ch]).sort((a,b)=>a-b);return v[v.length>>1]};
  const bg=[med(0),med(1),med(2)];
  const dist=(i,r,gg,b)=>Math.hypot(d[i*4]-r,d[i*4+1]-gg,d[i*4+2]-b),toBg=i=>dist(i,bg[0],bg[1],bg[2]);
  const spread=opaque.reduce((a,i)=>a+toBg(i),0)/opaque.length;
  if(spread>60)return{cut:false,note:'The background is busy, so I kept it. Tip: draw on plain white paper!'};
  const tol=Math.min(110,Math.max(45,spread*2.2+35)),gone=new Uint8Array(W*H),q=new Int32Array(W*H);let qh=0,qt=0;
  const pass=(n,from)=>d[n*4+3]<20||toBg(n)<tol||(from>=0&&dist(n,d[from*4],d[from*4+1],d[from*4+2])<12&&toBg(n)<tol*1.8);
  for(const i of edge)if(!gone[i]&&pass(i,-1)){gone[i]=1;q[qt++]=i}
  while(qh<qt){const i=q[qh++],x=i%W,y=(i/W)|0;
    for(const n of[x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1])if(n>=0&&!gone[n]&&pass(n,i)){gone[n]=1;q[qt++]=n}}
  let kept=0;for(let i=0;i<W*H;i++)if(!gone[i]&&d[i*4+3]>20)kept++;
  if(kept<(x1-x0)*(y1-y0)*.03)return{cut:false,note:'I could not find your drawing. Try thicker, darker lines!'};
  for(let i=0;i<W*H;i++){
    if(gone[i]){d[i*4+3]=0;continue}
    const x=i%W,y=(i/W)|0;   // soften the paper-coloured halo around the drawing
    if(((x>0&&gone[i-1])||(x<W-1&&gone[i+1])||(y>0&&gone[i-W])||(y<H-1&&gone[i+W]))&&toBg(i)<tol*1.5)d[i*4+3]=0;
  }
  g.putImageData(im,0,0);return{cut:true,note:''};
}
/* Crop to the drawing and blow it up so it fills the icon. */
function trimToContent(c){
  const W=c.width,H=c.height,d=c.getContext('2d').getImageData(0,0,W,H).data;let a=W,b=H,e=-1,f=-1;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(d[(y*W+x)*4+3]>24){if(x<a)a=x;if(x>e)e=x;if(y<b)b=y;if(y>f)f=y}
  if(e<0)return c;
  const w=e-a+1,h=f-b+1,k=S_IN/Math.max(w,h),o=cv(S_IN,S_IN);
  o.getContext('2d').drawImage(c,a,b,w,h,(S_IN-w*k)/2,(S_IN-h*k)/2,w*k,h*k);return o;
}
const clamp=v=>v<0?0:v>255?255:v;
function colourise(d,i,sat,con,levels){
  let r=d[i],g=d[i+1],b=d[i+2];const l=.299*r+.587*g+.114*b;
  r=(l+(r-l)*sat-128)*con+128;g=(l+(g-l)*sat-128)*con+128;b=(l+(b-l)*sat-128)*con+128;
  if(levels){const s=255/(levels-1);r=Math.round(clamp(r)/s)*s;g=Math.round(clamp(g)/s)*s;b=Math.round(clamp(b)/s)*s}
  d[i]=clamp(r);d[i+1]=clamp(g);d[i+2]=clamp(b);
}
/* Sticker: a little brighter. Cartoon: bold flat colours with dark ink lines. */
function tone(c,cartoon){
  let s=c;
  if(cartoon){s=cv(S_IN,S_IN);const sg=s.getContext('2d');if('filter' in sg)sg.filter='blur(1.2px)';sg.drawImage(c,0,0)}
  const g=s.getContext('2d'),im=g.getImageData(0,0,S_IN,S_IN),d=im.data,lum=new Float32Array(S_IN*S_IN);
  for(let i=0;i<S_IN*S_IN;i++)lum[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];
  for(let i=0;i<S_IN*S_IN;i++){if(!d[i*4+3])continue;
    colourise(d,i*4,cartoon?1.5:1.18,cartoon?1.15:1.06,cartoon?6:0);
    if(cartoon){const x=i%S_IN,y=(i/S_IN)|0;if(x>0&&y>0&&x<S_IN-1&&y<S_IN-1){
      const gx=lum[i+1]-lum[i-1],gy=lum[i+S_IN]-lum[i-S_IN];
      if(Math.hypot(gx,gy)>70){d[i*4]*=.3;d[i*4+1]*=.25;d[i*4+2]*=.4}}}
  }
  g.putImageData(im,0,0);return s;
}
/* Pixel: 32×32 pixel art, scaled up crisp. */
function pixelate(c){
  const N=32,s=cv(N,N),sg=s.getContext('2d');sg.drawImage(c,0,0,N,N);
  const im=sg.getImageData(0,0,N,N),d=im.data;
  for(let i=0;i<N*N;i++){d[i*4+3]=d[i*4+3]>110?255:0;if(d[i*4+3])colourise(d,i*4,1.3,1.1,5)}
  sg.putImageData(im,0,0);
  const o=cv(S_IN,S_IN),og=o.getContext('2d');og.imageSmoothingEnabled=false;og.drawImage(s,0,0,S_IN,S_IN);return o;
}
/* Outline like the game's panels: soft shadow, gold rim, white sticker edge. */
function frame(c,square){
  const out=cv(S_OUT,S_OUT),g=out.getContext('2d');
  const sil=col=>{const s=cv(S_IN,S_IN),sg=s.getContext('2d');sg.drawImage(c,0,0);sg.globalCompositeOperation='source-in';sg.fillStyle=col;sg.fillRect(0,0,S_IN,S_IN);return s};
  const ring=(s,r,dy)=>{const n=square?8:28;for(let k=0;k<n;k++){const a=k/n*Math.PI*2;g.drawImage(s,S_PAD+Math.cos(a)*r,S_PAD+Math.sin(a)*r+(dy||0))}};
  g.globalAlpha=.3;ring(sil('#0C1330'),10,6);g.globalAlpha=1;
  ring(sil('#F5C24C'),10);ring(sil('#FFFFFF'),6);
  g.drawImage(c,S_PAD,S_PAD);return out;
}

document.addEventListener('change',e=>{if(e.target.id==='artFile'&&e.target.files[0]&&EDIT)readFile(e.target.files[0])});
document.addEventListener('keydown',e=>{if(e.target.matches&&e.target.matches('label[for="artFile"]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();$('#artFile').click()}});
Object.assign(ACT,{
  atab:d=>{UI.tab=d.id;UI.msg=null;rStudio()},
  pickLook:d=>{const p=cur(),L=LOOKS.find(l=>l.id===d.id);if(!L)return;p.look=L.id;save();UI.msg=`Hello, ${L.e} ${esc(p.name)}! That's you on the farm now.`;rStudio()},
  artEdit:d=>{UI.edit=d.id;UI.msg=null;UI.resetting=false;UI.drawing=false;EDIT=null;DRAW=null;render();window.scrollTo({top:0})},
  artBack:()=>{if(UI.from==='town')return go('town');   // opened from paint mode on the farm
    UI.edit=null;EDIT=null;UI.resetting=false;UI.drawing=false;DRAW=null;rStudio()},
  padOpen:()=>{UI.drawing=true;DRAW=null;rEditor();window.scrollTo({top:0})},
  padCancel:()=>{UI.drawing=false;DRAW=null;rEditor()},
  penColour:d=>{DRAW.colour=d.id;DRAW.erase=false;rEditor()},
  penSize:d=>{DRAW.size=+d.id;rEditor()},
  penErase:()=>{DRAW.erase=!DRAW.erase;rEditor()},
  padUndo:()=>{const im=DRAW.undo.pop();if(im)DRAW.g.putImageData(im,0,0);rEditor()},
  padClear:()=>{padSnap();DRAW.g.clearRect(0,0,DRAW_PX,DRAW_PX);rEditor()},
  padDone:()=>{if(padEmpty()){DRAW.msg='The page is empty! Draw something first.';return rEditor()}
    const c=cv(DRAW_PX,DRAW_PX);c.getContext('2d').drawImage(DRAW.c,0,0);
    EDIT.src=c;EDIT.srcUrl=encode(c,.9);UI.drawing=false;DRAW=null;restyle()},
  artStyle:d=>{EDIT.style=d.id;restyle()},
  artBg:()=>{EDIT.bg=!EDIT.bg;restyle()},
  artSave:()=>{if(!EDIT||!EDIT.dirty||!EDIT.url)return;
    saveArt(cur().id,EDIT.key,{url:EDIT.url,src:EDIT.srcUrl,style:EDIT.style,bg:EDIT.bg})
      .then(()=>{if(UI.from==='town')return go('town');UI.msg=pick(ART_PRAISE);UI.edit=null;EDIT=null;rStudio()})
      .catch(()=>{EDIT.note='Sorry, I could not save it on this device.';rEditor()})},
  artReset:()=>{if(!UI.resetting){UI.resetting=true;return rEditor()}
    deleteArt(cur().id,EDIT.key).catch(()=>{}).then(()=>{if(UI.from==='town')return go('town');UI.resetting=false;UI.edit=null;EDIT=null;UI.msg='Back to the original. You can draw a new one any time!';rStudio()})}
});
onPageKey=e=>{if(UI.drawing&&DRAW&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();ACT.padUndo()}};
startPage({studio:rStudio},()=>({screen:'studio'}));
