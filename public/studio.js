/* Canvas artwork, uploaded photos and draft configurations stay in browser memory. */
function mountStudio(root, listen) {
  const $ = selector => root.querySelector(selector);
  if (!$('#atelier')) return null;
  const W = 600, H = 850, MARGIN = 32;
  const palette = [['#243c30','Vert forêt'],['#203957','Bleu marine'],['#f1f0e9','Blanc'],['#252629','Noir'],['#693a59','Prune']];
  const inkPalette = [['#f0e8d0','Crème'],['#ffffff','Blanc'],['#22362b','Vert foncé'],['#e2ec7b','Lime'],['#ed994e','Orange']];
  const bgPalette = [['#aed3eb','Bleu ciel'],['#243c30','Vert forêt'],['#e9e5d7','Crème'],['#d8b5ca','Rose'],['#e9b077','Abricot']];
  const fonts = {sport:['900','Arial, sans-serif','Sport'],classic:['600','Georgia, serif','Classique'],script:['500','cursive','Manuscrite']};
  const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
  const shirtDefault = () => ({model:'yonex-10726-navy',color:'#243c30',view:'back',front:{text:'',color:'#f0e8d0',font:'sport',placement:'center',size:40},back:{text:'CAMILLE',color:'#f0e8d0',font:'sport',placement:'upper',size:40}});
  const textLayer = (text,y=.23) => ({id:crypto.randomUUID(),type:'text',text,color:'#22362b',font:'sport',x:.5,y,size:64,rotation:0});
  const tubeDefault = () => {const a=textLayer('ALEX'),b=textLayer('PLAY YOUR WAY',.79);b.size=50;return {color:'#aed3eb',layers:[a,b],selected:a.id};};
  const state = root.__badonlineStudioState || {tab:'shirt',shirt:shirtDefault(),tube:tubeDefault(),creations:[],uploadVersion:0};
  root.__badonlineStudioState = state;
  const shirtCanvas=$('#shirt-canvas'),labelCanvas=$('#label-canvas'),tubeCanvas=$('#tube-canvas');
  const flat=document.createElement('canvas');flat.width=W;flat.height=H;
  const ctx=flat.getContext('2d');
  let drag=null;
  const notice = text => {$('#studio-status').textContent=text;};
  function colorName(value,choices) {return choices.find(([color])=>color===value)?.[1] || value;}
  function swatches(selector,choices,get,set){
    const box=$(selector);box.replaceChildren();
    choices.forEach(([color,name])=>{const b=document.createElement('button');b.type='button';b.style.backgroundColor=color;b.dataset.color=color;b.setAttribute('aria-label',name);b.title=name;b.setAttribute('aria-pressed',String(get()===color));listen(b,'click',()=>{set(color);render();});box.append(b);});
  }
  function refreshSwatches(selector,value){$(selector).querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===value)));}
  const selectedModel = () => BADONLINE_SHIRTS.find(m=>m.id===state.shirt.model);
  const photos = new Map();
  function photo(src){
    if(!photos.has(src)){
      const image=new Image();const entry={image,ready:false,error:false};photos.set(src,entry);
      image.onload=()=>{entry.ready=true;if(root.isConnected!==false)render();};
      image.onerror=()=>{entry.error=true;if(root.isConnected!==false)render();};image.src=src;
    }
    return photos.get(src);
  }
  function photosReady(){const m=selectedModel();return !m || [photo(m.front),photo(m.back)].every(p=>p.ready);}
  function syncCatalog(){
    const m=selectedModel(),brand=m?.brand || 'generic';$('#shirt-brand').value=brand;
    const select=$('#shirt-model');
    if(select.dataset.brand!==brand){
      select.replaceChildren();
      const models=BADONLINE_SHIRTS.filter(x=>x.brand===brand);
      if(!models.length){const o=document.createElement('option');o.value='generic';o.textContent='Mon propre textile — aperçu uni';select.append(o);}
      models.forEach(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=`${x.code} · ${x.color}`;select.append(o);});
      select.dataset.brand=brand;
    }
    select.value=m?.id || 'generic';
    $('#shirt-generic-colors').hidden=Boolean(m);
    $('#shirt-model-info').textContent=m?`${m.brand} ${m.code} · ${m.color} · Collection ${m.season}`:'Aperçu générique de votre vêtement.';
    const link=$('#shirt-model-source');link.hidden=!m;if(m)link.href=m.source;
    const ready=photosReady();$('#shirt-download').disabled=!ready;
    $('#shirt-add').disabled=!ready || (!state.shirt.front.text.trim()&&!state.shirt.back.text.trim());
  }
  function drawProductShirt(canvas,view,m){
    const c=canvas.getContext('2d'),d=state.shirt[view],p=photo(m[view]);c.clearRect(0,0,840,850);
    canvas.setAttribute('aria-label',`${m.brand} ${m.code}, ${m.color}, ${view==='front'?'face':'dos'}, texte : ${d.text || 'aucun'}`);
    if(!p.ready){c.fillStyle='#22362b';c.font='22px Arial';c.textAlign='center';c.fillText(p.error?'Photo indisponible. Rechargez la page.':'Chargement du modèle…',420,410);return false;}
    const ratio=Math.min(780/p.image.naturalWidth,810/p.image.naturalHeight),w=p.image.naturalWidth*ratio,h=p.image.naturalHeight*ratio,x=(840-w)/2,y=(850-h)/2;
    c.drawImage(p.image,x,y,w,h);
    const positions=view==='front'?{chest:[.36,.30,.19],center:[.5,.47,.48]}:{upper:[.5,.29,.48],center:[.5,.46,.48]};
    const [rx,ry,rw]=positions[d.placement]||positions.center;
    const [weight,family]=fonts[d.font];let actual=d.size;c.font=`${weight} ${actual}px ${family}`;
    while(c.measureText(d.text).width>w*rw && actual>9){actual-=.5;c.font=`${weight} ${actual}px ${family}`;}
    c.fillStyle=d.color;c.textAlign='center';c.textBaseline='middle';c.fillText(d.text,x+w*rx,y+h*ry,w*rw);return actual<d.size;
  }
  function drawShirt(canvas,view=state.shirt.view){
    const model=selectedModel();if(model)return drawProductShirt(canvas,view,model);
    const c=canvas.getContext('2d'),s=state.shirt,d=s[view];
    c.clearRect(0,0,840,850);
    const shape=new Path2D('M290 110 L186 157 L71 342 L193 411 L240 330 L218 750 Q420 796 622 750 L600 330 L647 411 L769 342 L654 157 L550 110 Q420 152 290 110 Z');
    c.save();c.shadowColor='#26382c35';c.shadowBlur=25;c.shadowOffsetY=17;c.fillStyle=s.color;c.fill(shape);c.restore();
    c.save();c.clip(shape);c.fillStyle=s.color;c.fillRect(0,0,840,850);
    const light=c.createLinearGradient(190,0,670,0);light.addColorStop(0,'#00000032');light.addColorStop(.2,'#ffffff18');light.addColorStop(.44,'#ffffff04');light.addColorStop(.75,'#00000007');light.addColorStop(1,'#00000038');c.fillStyle=light;c.fillRect(0,0,840,850);
    c.strokeStyle='#ffffff08';c.lineWidth=1;for(let y=120;y<800;y+=5){c.beginPath();c.moveTo(60,y);c.lineTo(780,y);c.stroke();}
    c.strokeStyle='#ffffff19';c.lineWidth=3;c.beginPath();c.moveTo(186,164);c.quadraticCurveTo(242,215,240,327);c.moveTo(654,164);c.quadraticCurveTo(598,215,600,327);c.moveTo(223,735);c.quadraticCurveTo(420,774,617,735);c.stroke();
    c.strokeStyle='#00000028';c.lineWidth=2;c.beginPath();c.moveTo(115,338);c.lineTo(195,383);c.moveTo(725,338);c.lineTo(645,383);c.stroke();c.restore();
    c.beginPath();c.moveTo(290,110);c.quadraticCurveTo(420,view==='front'?260:194,550,110);c.quadraticCurveTo(420,157,290,110);c.fillStyle='#00000030';c.fill();c.strokeStyle='#ffffff18';c.lineWidth=3;c.stroke();
    const positions=view==='front'?{chest:[493,264,155],center:[420,340,325]}:{upper:[420,247,335],center:[420,390,335]};
    const [x,y,maxWidth]=positions[d.placement] || positions.center;
    const [weight,family]=fonts[d.font];let actual=d.size;c.font=`${weight} ${actual}px ${family}`;
    while(c.measureText(d.text).width>maxWidth && actual>9){actual-=.5;c.font=`${weight} ${actual}px ${family}`;}
    c.fillStyle=d.color;c.textAlign='center';c.textBaseline='middle';c.fillText(d.text,x,y,maxWidth);
    canvas.setAttribute('aria-label',`T-shirt ${colorName(s.color,palette)}, ${view==='front'?'face':'dos'}, texte : ${d.text || 'aucun'}`);
    return actual<d.size;
  }
  function layerDimensions(layer){
    const width=W*layer.size/100;
    if(layer.type==='photo')return {w:width,h:layer.crop==='cover'?width:width*layer.image.height/layer.image.width};
    const [weight,family]=fonts[layer.font];ctx.font=`${weight} 100px ${family}`;
    const fontSize=Math.min(110,width/Math.max(1,ctx.measureText(layer.text || ' ').width)*100);
    return {w:Math.min(width,ctx.measureText(layer.text || ' ').width*fontSize/100),h:fontSize*1.2,fontSize};
  }
  function keepInside(layer){
    let dims=layerDimensions(layer),rad=layer.rotation*Math.PI/180;
    let bw=Math.abs(dims.w*Math.cos(rad))+Math.abs(dims.h*Math.sin(rad));
    let bh=Math.abs(dims.w*Math.sin(rad))+Math.abs(dims.h*Math.cos(rad));
    const factor=Math.min(1,(W-MARGIN*2)/Math.max(bw,1),(H-MARGIN*2)/Math.max(bh,1));
    if(factor<1){layer.size=Math.max(5,layer.size*factor);dims=layerDimensions(layer);bw=Math.abs(dims.w*Math.cos(rad))+Math.abs(dims.h*Math.sin(rad));bh=Math.abs(dims.w*Math.sin(rad))+Math.abs(dims.h*Math.cos(rad));}
    layer.x=clamp(layer.x,(MARGIN+bw/2)/W,1-(MARGIN+bw/2)/W);
    layer.y=clamp(layer.y,(MARGIN+bh/2)/H,1-(MARGIN+bh/2)/H);
    return dims;
  }
  function paintLayer(c,l){
    const d=keepInside(l);c.save();c.translate(l.x*W,l.y*H);c.rotate(l.rotation*Math.PI/180);
    if(l.type==='text'){
      const [weight,family]=fonts[l.font];c.font=`${weight} ${d.fontSize}px ${family}`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=l.color;c.fillText(l.text,0,0,d.w);
    } else if(l.crop==='cover'){
      const side=Math.min(l.image.width,l.image.height),sx=(l.image.width-side)*l.cropX/100,sy=(l.image.height-side)*l.cropY/100;
      c.drawImage(l.image,sx,sy,side,side,-d.w/2,-d.h/2,d.w,d.h);
    } else c.drawImage(l.image,-d.w/2,-d.h/2,d.w,d.h);
    c.restore();
  }
  function paintTube(canvas){
    const c=canvas.getContext('2d');c.clearRect(0,0,330,850);
    c.save();c.shadowColor='#22362b30';c.shadowBlur=18;c.shadowOffsetX=7;c.shadowOffsetY=10;c.fillStyle='#d0d6ca';c.beginPath();c.roundRect(70,57,190,720,12);c.fill();c.restore();
    // Project the flat artwork onto the rounded front of the illustrative cylinder.
    for(let x=0;x<190;x++){
      const u=clamp((x/189)*2-1,-1,1),sx=(Math.asin(u)/Math.PI+.5)*(W-1);
      c.drawImage(flat,sx,0,Math.max(1,W/190),H,70+x,66,1.4,701);
    }
    const g=c.createLinearGradient(70,0,260,0);g.addColorStop(0,'#0000004d');g.addColorStop(.2,'#ffffff20');g.addColorStop(.47,'#ffffff00');g.addColorStop(.78,'#00000010');g.addColorStop(1,'#00000050');c.fillStyle=g;c.fillRect(70,66,190,701);
    for(const [y,color] of [[65,'#dbe0d6'],[767,'#bfc8bc']]){c.beginPath();c.ellipse(165,y,95,15,0,0,Math.PI*2);c.fillStyle=color;c.fill();c.strokeStyle='#768473';c.lineWidth=2;c.stroke();}
    c.beginPath();c.ellipse(165,63,84,10,0,0,Math.PI*2);c.fillStyle='#eff2e9';c.fill();
  }
  function drawTube(){
    ctx.fillStyle=state.tube.color;ctx.fillRect(0,0,W,H);state.tube.layers.forEach(l=>paintLayer(ctx,l));
    paintTube(tubeCanvas);
    const c=labelCanvas.getContext('2d');c.clearRect(0,0,W,H);c.drawImage(flat,0,0);c.save();c.strokeStyle='#53635390';c.setLineDash([7,7]);c.lineWidth=2;c.strokeRect(MARGIN,MARGIN,W-MARGIN*2,H-MARGIN*2);c.restore();
    const l=selected();if(l){const d=layerDimensions(l);c.save();c.translate(l.x*W,l.y*H);c.rotate(l.rotation*Math.PI/180);c.strokeStyle='#567238';c.lineWidth=3;c.strokeRect(-d.w/2-7,-d.h/2-7,d.w+14,d.h+14);for(const x of [-d.w/2-7,d.w/2+7])for(const y of [-d.h/2-7,d.h/2+7]){c.fillStyle='#fff';c.fillRect(x-5,y-5,10,10);c.strokeRect(x-5,y-5,10,10);}c.beginPath();c.moveTo(0,-d.h/2-7);c.lineTo(0,-d.h/2-35);c.stroke();c.beginPath();c.arc(0,-d.h/2-38,8,0,Math.PI*2);c.fillStyle='#ffffff';c.fill();c.stroke();c.restore();}
    const texts=state.tube.layers.filter(l=>l.type==='text').map(l=>l.text).join(', ');
    tubeCanvas.setAttribute('aria-label',`Tube ${colorName(state.tube.color,bgPalette)}, textes : ${texts}, ${state.tube.layers.some(l=>l.type==='photo')?'avec photo':'sans photo'}`);
  }
  function selected(){return state.tube.layers.find(l=>l.id===state.tube.selected);}
  function syncLayerOptions(){
    const select=$('#tube-layer');select.replaceChildren();
    state.tube.layers.forEach((l,i)=>{const o=document.createElement('option');o.value=l.id;o.textContent=l.type==='photo'?'Photo importée':`Texte ${i+1} : ${l.text || '(vide)'}`;select.append(o);});
    if(!state.tube.layers.length){const o=document.createElement('option');o.textContent='Ajoutez un texte ou une photo';o.value='';select.append(o);}
    select.value=state.tube.selected || '';
  }
  function syncControls(){
    const l=selected();
    $('#tube-text-options').hidden=!l || l.type!=='text';$('#tube-photo-options').hidden=!l || l.type!=='photo';
    ['#tube-size','#tube-rotation','#tube-x','#tube-y','#tube-forward','#tube-delete'].forEach(id=>$(id).disabled=!l);
    root.querySelectorAll('[data-tube-align]').forEach(b=>b.disabled=!l);
    if(l){$('#tube-size').value=l.size;$('#tube-size-value').textContent=Math.round(l.size)+' %';$('#tube-rotation').value=l.rotation;$('#tube-rotation-value').textContent=l.rotation+'°';$('#tube-x').value=l.x*100;$('#tube-y').value=l.y*100;
      if(l.type==='text'){$('#tube-text').value=l.text;$('#tube-font').value=l.font;$('#tube-ink').value=l.color;}
      else{$('#photo-crop').value=l.crop;$('#photo-crop-position').hidden=l.crop!=='cover';$('#photo-crop-x').value=l.cropX;$('#photo-crop-y').value=l.cropY;}
    }
    $('#tube-add-text').disabled=state.tube.layers.filter(l=>l.type==='text').length>=3;
    $('#tube-add').disabled=state.tube.layers.every(l=>l.type==='text'&&!l.text.trim());
  }
  function syncShirt(){
    const s=state.shirt,d=s[s.view];$('#shirt-text').value=d.text;$('#shirt-font').value=d.font;$('#shirt-size').value=d.size;$('#shirt-size-value').textContent=d.size;
    const placement=$('#shirt-placement');placement.replaceChildren();const options=s.view==='front'?[['center','Centre devant'],['chest','Petite poitrine']]:[['upper','Haut du dos'],['center','Centre du dos']];
    options.forEach(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;placement.append(o);});placement.value=d.placement;
    root.querySelectorAll('[data-shirt-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shirtView===s.view)));
    refreshSwatches('#shirt-colors',s.color);refreshSwatches('#shirt-ink-colors',d.color);
    $('#shirt-add').disabled=!s.front.text.trim()&&!s.back.text.trim();
  }
  function setTab(tab){
    state.tab=tab;root.querySelectorAll('[data-studio-tab]').forEach(b=>{const active=b.dataset.studioTab===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
    $('#panel-shirt').hidden=tab!=='shirt';$('#panel-tube').hidden=tab!=='tube';render();
  }
  function render(){syncShirt();syncCatalog();const fitted=drawShirt(shirtCanvas);$('#shirt-fit-note').textContent=fitted?'Le texte a été réduit pour rester dans la zone de marquage.':(selectedModel()?'Photographie du modèle officiel. Placement indicatif à valider avant marquage.':'La couleur du vêtement est une simulation de votre textile.');drawTube();refreshSwatches('#tube-colors',state.tube.color);syncControls();}
  function jpeg(canvas){const value=canvas.toDataURL('image/jpeg',.85);if(value.length>1400000)throw new Error('Image trop volumineuse');return value;}
  function shirtSheet(){
    if(!photosReady())throw new Error('Attendez le chargement des photos du textile.');
    const out=document.createElement('canvas');out.width=1200;out.height=690;const c=out.getContext('2d');c.fillStyle='#e8ece9';c.fillRect(0,0,1200,690);
    const each=document.createElement('canvas');each.width=840;each.height=850;
    for(const [i,view] of ['front','back'].entries()){drawShirt(each,view);c.drawImage(each,0,0,840,850,i*600+30,20,540,547);c.fillStyle='#22362b';c.font='bold 22px Arial';c.textAlign='center';c.fillText(view==='front'?'FACE':'DOS',i*600+300,600);}
    const model=selectedModel();if(model){c.font='18px Arial';c.fillText(`${model.brand} ${model.code} · ${model.color} · ${model.season}`,600,626);}
    c.font='18px Arial';c.fillText('BADONLINE · Simulation indicative · Textile non fourni, apporté par le client',600,654);return out;
  }
  function tubeSheet(){
    const out=document.createElement('canvas');out.width=1050;out.height=950;const c=out.getContext('2d');c.fillStyle='#e8ece9';c.fillRect(0,0,1050,950);c.drawImage(flat,40,25,600,850);c.drawImage(tubeCanvas,685,25,330,850);c.font='20px Arial';c.fillStyle='#22362b';c.textAlign='center';c.fillText('BADONLINE · Simulation indicative — maquette finale à valider',525,920);return out;
  }
  function summary(kind){
    if(kind==='shirt'){
      const s=state.shirt,m=selectedModel();return `T-shirt — textile fourni par le client. ${m?`Référence : ${m.brand} ${m.code}, collection ${m.season}, coloris ${m.color}.`:`Textile générique. Couleur simulée : ${colorName(s.color,palette)}.`} `+['front','back'].map(view=>{const d=s[view];return `${view==='front'?'Face':'Dos'} : ${d.text || 'aucun texte'}, ${fonts[d.font][2]}, couleur ${d.color}, position ${{upper:'haut du dos',center:'centre',chest:'petite poitrine'}[d.placement]}, taille visuelle ${d.size}.`;}).join(' ');
    }
    return `Tube — fond ${colorName(state.tube.color,bgPalette)}. `+state.tube.layers.map(l=>`${l.type==='text'?`Texte « ${l.text} », ${fonts[l.font][2]}, couleur ${l.color}`:`Photo, cadrage ${l.crop==='cover'?'carré':'photo entière'}, recadrage horizontal ${l.cropX} %, vertical ${l.cropY} %`}, x ${Math.round(l.x*100)} %, y ${Math.round(l.y*100)} %, taille ${Math.round(l.size)} %, rotation ${l.rotation}°.`).join(' ');
  }
  function download(canvas,name){const a=document.createElement('a');a.href=jpeg(canvas);a.download=name;a.click();}
  function renderCreations(){
    const box=$('#creation-list');box.replaceChildren();$('#creation-summary').hidden=!state.creations.length;
    for(const creation of state.creations){
      const item=document.createElement('div');item.className='creation-item';
      const img=document.createElement('img');img.src=creation.preview;img.alt=`Aperçu joint : ${creation.kind==='shirt'?'t-shirt':'tube'}`;
      const info=document.createElement('div'),title=document.createElement('strong'),p=document.createElement('p');title.textContent=creation.kind==='shirt'?'Mon t-shirt — textile non fourni':'Mon tube personnalisé';p.textContent=creation.summary;info.append(title,p);
      const a=document.createElement('a');a.href=creation.preview;a.download=`badonline-${creation.kind}.jpg`;a.textContent='Télécharger';info.append(a);
      const remove=document.createElement('button');remove.type='button';remove.className='plain-button';remove.textContent='Retirer';remove.setAttribute('aria-label',`Retirer la création ${creation.kind==='shirt'?'t-shirt':'tube'}`);listen(remove,'click',()=>{state.creations=state.creations.filter(x=>x.kind!==creation.kind);renderCreations();notice('Création retirée de la demande.');});
      item.append(img,info,remove);box.append(item);
    }
  }
  function addCreation(kind){
    render();
    if(kind==='shirt'&&!state.shirt.front.text.trim()&&!state.shirt.back.text.trim()){notice('Ajoutez un texte sur la face ou le dos du t-shirt.');return;}
    if(kind==='tube'&&state.tube.layers.every(l=>l.type==='text'&&!l.text.trim())){notice('Ajoutez du texte ou une photo à votre tube.');return;}
    try{
      const creation={kind,summary:summary(kind),preview:jpeg(kind==='shirt'?shirtSheet():tubeSheet())};
      if(kind==='tube'){const photo=state.tube.layers.find(l=>l.type==='photo');if(photo)creation.photo=photo.source;}
      state.creations=state.creations.filter(c=>c.kind!==kind);state.creations.push(creation);renderCreations();
      $('#quote-form [name=project]').value=state.creations.length===2?'Textiles et tubes de volants':kind==='shirt'?'Textiles de badminton':'Tubes de volants';
      const personal=$('#quote-form [name=personalization]');personal.value=kind==='shirt'?[state.shirt.front.text,state.shirt.back.text].filter(Boolean).join(' / ').slice(0,160):state.tube.layers.filter(l=>l.type==='text').map(l=>l.text).join(' / ').slice(0,160);
      const message=$('#quote-form [name=message]');if(!message.value.trim())message.value='Bonjour, je souhaite un devis pour la personnalisation jointe à cette demande.';
      notice('Création ajoutée à votre demande. Après une modification, ajoutez-la de nouveau pour mettre à jour l’aperçu.');
      $('#contact').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }catch{notice('Impossible de préparer cet aperçu. Réduisez la taille de la photo puis réessayez.');}
  }
  listen($('#shirt-brand'),'change',e=>{const model=BADONLINE_SHIRTS.find(m=>m.brand===e.target.value);state.shirt.model=model?.id || 'generic';render();});
  listen($('#shirt-model'),'change',e=>{state.shirt.model=e.target.value;if(selectedModel()?.color==='Blanc'){state.shirt.front.color='#22362b';state.shirt.back.color='#22362b';}else{state.shirt.front.color='#ffffff';state.shirt.back.color='#ffffff';}render();});
  swatches('#shirt-colors',palette,()=>state.shirt.color,v=>state.shirt.color=v);
  swatches('#shirt-ink-colors',inkPalette,()=>state.shirt[state.shirt.view].color,v=>state.shirt[state.shirt.view].color=v);
  swatches('#tube-colors',bgPalette,()=>state.tube.color,v=>state.tube.color=v);
  root.querySelectorAll('[data-studio-tab]').forEach(b=>{listen(b,'click',()=>setTab(b.dataset.studioTab));listen(b,'keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tab=e.key==='Home'?'shirt':e.key==='End'?'tube':state.tab==='shirt'?'tube':'shirt';setTab(tab);$('#tab-'+tab).focus();}});});
  root.querySelectorAll('[data-shirt-view]').forEach(b=>listen(b,'click',()=>{state.shirt.view=b.dataset.shirtView;render();}));
  for(const [id,key] of [['shirt-text','text'],['shirt-font','font'],['shirt-placement','placement'],['shirt-size','size']])listen($('#'+id),'input',e=>{state.shirt[state.shirt.view][key]=key==='size'?Number(e.target.value):e.target.value;render();});
  listen($('#shirt-reset'),'click',()=>{state.shirt=shirtDefault();render();notice('Atelier t-shirt réinitialisé. Les créations déjà jointes restent inchangées.');});
  listen($('#shirt-download'),'click',()=>download(shirtSheet(),'badonline-tshirt.jpg'));
  listen($('#shirt-add'),'click',()=>addCreation('shirt'));
  listen($('#tube-add'),'click',()=>addCreation('tube'));
  listen($('#tube-download'),'click',()=>download(tubeSheet(),'badonline-tube.jpg'));
  listen($('#tube-add-text'),'click',()=>{if(state.tube.layers.filter(l=>l.type==='text').length>=3)return;const l=textLayer('Votre texte',.5);l.size=50;state.tube.layers.push(l);state.tube.selected=l.id;syncLayerOptions();render();$('#tube-text').focus();$('#tube-text').select();});
  listen($('#tube-layer'),'change',e=>{state.tube.selected=e.target.value;render();});
  for(const [id,key] of [['tube-text','text'],['tube-font','font'],['tube-ink','color'],['tube-size','size'],['tube-rotation','rotation'],['tube-x','x'],['tube-y','y'],['photo-crop','crop'],['photo-crop-x','cropX'],['photo-crop-y','cropY']])listen($('#'+id),'input',e=>{
    const l=selected();if(!l)return;let value=e.target.value;if(['size','rotation','x','y','cropX','cropY'].includes(key))value=Number(value);if(['x','y'].includes(key))value/=100;l[key]=value;keepInside(l);if(key==='text')syncLayerOptions();render();
  });
  root.querySelectorAll('[data-tube-align]').forEach(b=>listen(b,'click',()=>{const l=selected();if(!l)return;l.x=.5;l.y={top:.13,center:.5,bottom:.87}[b.dataset.tubeAlign];render();}));
  listen($('#tube-forward'),'click',()=>{const l=selected();if(!l)return;state.tube.layers=state.tube.layers.filter(x=>x!==l);state.tube.layers.push(l);syncLayerOptions();render();});
  listen($('#tube-delete'),'click',()=>{const l=selected();if(!l)return;if(l.type==='photo'){$('#tube-photo').value='';$('#photo-feedback').textContent='Photo retirée.';state.uploadVersion++;}state.tube.layers=state.tube.layers.filter(x=>x!==l);state.tube.selected=state.tube.layers.at(-1)?.id || '';syncLayerOptions();render();});
  listen($('#tube-reset'),'click',()=>{state.uploadVersion++;state.tube=tubeDefault();$('#tube-photo').value='';$('#photo-feedback').textContent='';syncLayerOptions();render();notice('Atelier tube réinitialisé. Les créations déjà jointes restent inchangées.');});
  listen($('#tube-photo'),'change',async e=>{
    const file=e.target.files?.[0];if(!file)return;const version=++state.uploadVersion;
    const feedback=$('#photo-feedback');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){feedback.textContent='Choisissez une image JPG, PNG ou WebP de 5 Mo maximum.';e.target.value='';return;}
    feedback.textContent='Préparation de la photo…';let bitmap;
    try{
      bitmap=await createImageBitmap(file);if(version!==state.uploadVersion){bitmap.close();return;}
      if(bitmap.width*bitmap.height>40000000)throw new Error('Dimensions');
      const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height)),photo=document.createElement('canvas');photo.width=Math.max(1,Math.round(bitmap.width*scale));photo.height=Math.max(1,Math.round(bitmap.height*scale));const c=photo.getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,photo.width,photo.height);c.drawImage(bitmap,0,0,photo.width,photo.height);
      const small=Math.min(bitmap.width,bitmap.height)<600;bitmap.close();bitmap=null;
      const l={id:crypto.randomUUID(),type:'photo',image:photo,source:jpeg(photo),crop:'contain',cropX:50,cropY:50,x:.5,y:.5,size:60,rotation:0};
      state.tube.layers=state.tube.layers.filter(x=>x.type!=='photo');state.tube.layers.unshift(l);state.tube.selected=l.id;syncLayerOptions();render();feedback.textContent=small?'Photo importée. Sa résolution est faible : un original plus grand pourra être nécessaire pour l’impression.':'Photo importée. Déplacez-la directement sur l’étiquette ou utilisez les réglages.';
    }catch{if(bitmap)bitmap.close();feedback.textContent='Cette photo ne peut pas être lue. Essayez une image JPG ou PNG moins volumineuse.';e.target.value='';}
  });
  function point(e){const r=labelCanvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
  function hit(l,p){const d=layerDimensions(l),angle=-l.rotation*Math.PI/180,dx=p.x-l.x*W,dy=p.y-l.y*H;return Math.abs(dx*Math.cos(angle)-dy*Math.sin(angle))<=d.w/2+14 && Math.abs(dx*Math.sin(angle)+dy*Math.cos(angle))<=d.h/2+14;}
  listen(labelCanvas,'pointerdown',e=>{
    const p=point(e);let l=selected(),mode='move';
    if(l){
      const d=layerDimensions(l),angle=-l.rotation*Math.PI/180,dx=p.x-l.x*W,dy=p.y-l.y*H;
      const local={x:dx*Math.cos(angle)-dy*Math.sin(angle),y:dx*Math.sin(angle)+dy*Math.cos(angle)};
      if(Math.hypot(local.x,local.y+d.h/2+38)<20)mode='rotate';
      else if([-1,1].some(x=>[-1,1].some(y=>Math.hypot(local.x-x*(d.w/2+7),local.y-y*(d.h/2+7))<20)))mode='resize';
      else l=null;
    }
    if(!l)l=[...state.tube.layers].reverse().find(layer=>hit(layer,p));
    if(!l)return;
    state.tube.selected=l.id;drag={id:e.pointerId,mode,dx:p.x-l.x*W,dy:p.y-l.y*H,size:l.size,distance:Math.max(1,Math.hypot(p.x-l.x*W,p.y-l.y*H))};
    labelCanvas.setPointerCapture(e.pointerId);labelCanvas.focus();syncLayerOptions();render();
  });
  listen(labelCanvas,'pointermove',e=>{
    if(!drag || drag.id!==e.pointerId)return;const l=selected(),p=point(e);if(!l)return;
    if(drag.mode==='rotate')l.rotation=Math.round((Math.atan2(p.y-l.y*H,p.x-l.x*W)*180/Math.PI+90+540)%360-180);
    else if(drag.mode==='resize')l.size=clamp(drag.size*Math.hypot(p.x-l.x*W,p.y-l.y*H)/drag.distance,10,80);
    else{l.x=(p.x-drag.dx)/W;l.y=(p.y-drag.dy)/H;}
    render();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(labelCanvas,event,()=>{drag=null;});
  listen(labelCanvas,'keydown',e=>{const l=selected();if(!l || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const step=e.shiftKey?10:2;l.x+=({ArrowLeft:-step,ArrowRight:step}[e.key]||0)/W;l.y+=({ArrowUp:-step,ArrowDown:step}[e.key]||0)/H;render();});
  syncLayerOptions();renderCreations();setTab(state.tab);
  return {
    creations:()=>state.creations.map(c=>({...c})),
    clearCreations:()=>{state.creations=[];renderCreations();},
    open:(kind,example='')=>{
      if(example){const presets={Camille:['#243c30','CAMILLE'],Alex:['#203957','ALEX'],Léa:['#f1f0e9','LÉA'],Hugo:['#252629','HUGO 07']};const key=Object.keys(presets).find(k=>example.includes(k));if(key){state.shirt.model='generic';state.shirt.color=presets[key][0];state.shirt.view='back';state.shirt.back.text=presets[key][1];state.shirt.back.color=key==='Léa'?'#693a59':key==='Hugo'?'#ed994e':'#f0e8d0';}}
      setTab(kind);$('#atelier').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
  };
}
