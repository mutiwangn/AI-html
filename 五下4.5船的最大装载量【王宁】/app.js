(function(){
'use strict';
var L=window.FloatLogic,V=window.VoyageLogic,W=window.FloatWorkbook;
var $=function(id){return document.getElementById(id);};
var STORE='mutiw-5down-4-5-v2',OLD_STORE='mutiw-5down-4-5-v1';
var ids=['fresh','mild','brine'],names={fresh:'清水',mild:'淡盐水',brine:'浓盐水'},regionIds=['yangtze','ocean','yellow'];
var words={up:'上浮',same:'不变',down:'下沉'};
var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var state=Object.assign({page:'observe',ruler:null,zoom:false,prediction:null,flood:V.createFlood(),visualDraft:2.6,keypad:false},W.create(1,'simulation'));
var storageOK=true,restoreNotice='',toastTimer=0,frameId=0,lastFrame=0,lastUI=0,travel=null,swap=null,draftMotion=null,drag=null,lastFocus=null,lastFloodStatus='dry';
try{
  var saved=localStorage.getItem(STORE),legacy=localStorage.getItem(OLD_STORE);
  if(saved)Object.assign(state,W.import(saved));
  else if(legacy){Object.assign(state,W.import(legacy));restoreNotice='已保留上一版的测量记录';}
}catch(e){restoreNotice='保存的记录暂不能读取，可重新导入备份';}
var renderer=new FloatRenderer($('scene'),{shipSrc:'assets/ship.webp',harborSrc:'assets/harbor.webp'});
function current(){return state.sessions[state.mode];}
function latest(id){var records=current().readings[id];for(var i=records.length-1;i>=0;i--)if(records[i].round===current().round)return records[i];return null;}
function values(){var out={};ids.forEach(function(id){var r=latest(id);out[id]=r?r.exposedCm:null;});return out;}
function fmt(v,places){return Number(v).toFixed(places==null?1:places);}
function recordText(r){return !r?'—':r.exposedCm===null?'待复测':fmt(r.exposedCm)+' cm';}
function persist(){try{localStorage.setItem(STORE,W.export(state));storageOK=true;}catch(e){if(storageOK)toast('记录暂不能自动保存，请导出备份');storageOK=false;}}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(function(){$('toast').hidden=true;},3100);}
function sourceName(){return state.mode==='simulation'?'模拟测量':'实物记录';}
function options(){return {conditions:state.conditions};}
function dryBoat(){return state.hold==='draft'?V.atDraft(state.region,state.targetDraft,options()):V.state(state.region,state.cargo,options());}
function cargoUnits(){return dryBoat().cargoUnits;}
function wetBoat(){return V.state(state.region,cargoUnits(),{conditions:state.conditions,floodMassG:state.flood.floodMassG,sinkProgress:state.flood.sinkProgress});}
function exposure(id){if(state.mode==='simulation')return L.floatState(id,current().instrument).exposedCm;var r=latest(id);return r&&r.exposedCm!==null?r.exposedCm:10;}
function geometry(){return renderer.getGeometry();}
function redraw(now){
  now=typeof now==='number'?now:performance.now();
  var id=V.ROUTE[state.routeIndex],boat,wave,fromRegion=id,p=1,fromLiquid=state.liquid;
  if(state.page==='observe'){
    if(travel){id=travel.to;fromRegion=travel.from;p=travel.progress;}
    boat=V.state(id,36,{conditions:'calm'});wave=V.wave(id,now/1000,{conditions:'calm'});
  }else if(state.page==='load'){boat=wetBoat();wave=state.flood.wave||V.wave(state.region,state.flood.elapsedSec,options());id=state.region;}
  if(swap&&state.page==='measure'){fromLiquid=swap.from;p=swap.progress;}
  var r=latest(state.liquid),model={page:state.page,region:id,fromRegion:fromRegion,liquid:state.liquid,fromLiquid:fromLiquid,transition:p,time:now/1000,
    boat:boat,wave:wave,draft:state.visualDraft,cargoUnits:boat?boat.cargoUnits:36,status:boat?boat.status:'safe',
    safeDraftCm:boat?boat.safeDraftCm:3.2,showSafety:state.page==='load',zoom:state.zoom,
    floatExposure:exposure(state.liquid),fromFloatExposure:swap?swap.fromExposure:exposure(state.liquid),
    markerExposure:r&&r.exposedCm!==null?r.exposedCm:null,ruler:state.ruler,
    readings:values(),align:state.alignment,source:state.mode==='simulation'?'model':'measured',
    breachAt:state.flood.breachAt,breach:state.page==='load'&&state.flood.breach,sinkProgress:state.page==='load'?state.flood.sinkProgress:0,reducedMotion:reduced};
  renderer.render(model);
  if(state.page==='measure')updateRulerStatus();
}
function stopFrames(){cancelAnimationFrame(frameId);frameId=0;lastFrame=0;}
function modalOpen(){return Array.from(document.querySelectorAll('.modal')).some(function(el){return !el.hidden;});}
function ensureFrames(){if(!frameId&&!document.hidden&&!modalOpen()){lastFrame=0;frameId=requestAnimationFrame(tick);}}
function tick(now){
  frameId=0;if(document.hidden||modalOpen())return;
  if(lastFrame&&now-lastFrame<32){frameId=requestAnimationFrame(tick);return;}
  var dt=lastFrame?Math.min(.08,(now-lastFrame)/1000):1/30;lastFrame=now;
  if(travel){travel.progress=Math.min(1,(now-travel.started)/travel.duration);var e=travel.progress*travel.progress*(3-2*travel.progress);state.visualDraft=travel.fromDraft+(travel.toDraft-travel.fromDraft)*e;if(travel.progress>=1)completeTravel();}
  if(swap){swap.progress=Math.min(1,(now-swap.started)/swap.duration);if(swap.progress>=1){swap=null;setMeasureBusy(false);}}
  if(draftMotion){var q=Math.min(1,(now-draftMotion.started)/draftMotion.duration);state.visualDraft=draftMotion.from+(draftMotion.to-draftMotion.from)*(1-Math.pow(1-q,3));if(q>=1)draftMotion=null;}
  if(state.page==='load'){
    if(!draftMotion){state.flood=V.stepFlood(state.flood,state.region,cargoUnits(),dt,options());state.visualDraft=state.flood.boat.draftCm;}
    else state.flood.wave=V.wave(state.region,state.flood.elapsedSec,options());
    if(now-lastUI>90){updateLoadStatus();lastUI=now;}
    if(state.flood.status!==lastFloodStatus){if(state.flood.floodMassG>0)buildLoadTable();lastFloodStatus=state.flood.status;}
  }
  redraw(now);
  if(travel||swap||draftMotion||state.page==='load')frameId=requestAnimationFrame(tick);
}
function animateDraft(){var b=wetBoat();draftMotion={from:state.visualDraft,to:b.draftCm,started:performance.now(),duration:reduced?80:600};ensureFrames();}
function pressed(selector,attribute,value){document.querySelectorAll(selector).forEach(function(el){var on=el.dataset[attribute]===value;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on));});}
function setPage(page,changeHash){
  if(['observe','measure','compare','load'].indexOf(page)<0)page='observe';
  stopFrames();travel=null;swap=null;draftMotion=null;drag=null;state.page=page;state.zoom=false;state.keypad=false;
  $('app').dataset.page=page;$('app').classList.remove('keypad-open');$('keypad').hidden=true;
  ['observe','measure','compare','load'].forEach(function(p){$(p+'Controls').hidden=p!==page;});
  document.querySelectorAll('.task-nav [data-page]').forEach(function(el){var active=el.dataset.page===page;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  $('journey').hidden=page!=='observe';$('predictionBar').hidden=page!=='observe';$('voyageResult').hidden=page!=='observe'||!state.voyageHistory.length;
  $('rulerTools').hidden=page!=='measure';$('stageMeasures').hidden=page!=='load';$('loadStatus').hidden=page!=='load';
  $('zoomButton').hidden=page!=='observe'&&page!=='load';$('zoomButton').classList.remove('selected');$('zoomButton').setAttribute('aria-label','放大吃水位置');
  $('sourceNote').textContent=page==='observe'?'水域数据为教学样本':page==='load'?'教学模型 · 船口未封闭 · 过程时间缩放':state.mode==='simulation'?'模拟测量 · 手动读数':'本组实物记录 · 图示';
  $('question').textContent={observe:'驶入海洋，船会怎样？',measure:'把0刻度对准液面',compare:'露出高度相差多少？',load:'相同条件，怎样比较？'}[page];
  $('scene').setAttribute('aria-label',page==='measure'?'无刻度吸管与可移动直尺。拖动直尺，零线对准液面；方向键可微调。':page==='compare'?'三种液体的浮标与测量数据标注':'轮船在不同水域中的航行与装载模型');
  if(page==='observe'){state.visualDraft=V.state(V.ROUTE[state.routeIndex],36).draftCm;syncVoyage();}
  if(page==='measure'){fillMeasurement();setMeasureBusy(false);}
  if(page==='compare')syncCompare();
  if(page==='load'){state.visualDraft=wetBoat().draftCm;syncLoad();ensureFrames();}
  if(changeHash!==false){try{history.replaceState(null,'','#'+page);}catch(e){}}
  persist();requestAnimationFrame(redraw);
}
document.querySelectorAll('.task-nav [data-page]').forEach(function(el){el.addEventListener('click',function(){setPage(el.dataset.page);});});
function syncVoyage(){
  var done=state.routeIndex>=2,next=V.ROUTE[Math.min(2,state.routeIndex+1)];
  $('question').textContent=done?'走过三个水域，发现了什么？':'驶入'+V.getRegion(next).name+'，船会怎样？';
  $('sailButton').textContent=travel?'航行中…':done?'重新航行 ↺':'驶入'+V.getRegion(next).name+' →';$('sailButton').disabled=!!travel;
  $('predictionBar').hidden=state.page!=='observe'||done;
  document.querySelectorAll('[data-prediction]').forEach(function(b){b.disabled=!!travel;});pressed('[data-prediction]','prediction',state.prediction);
  document.querySelectorAll('[data-stop]').forEach(function(el){var i=Number(el.dataset.stop);el.classList.toggle('current',i===state.routeIndex);el.classList.toggle('passed',i<state.routeIndex);});
  document.querySelectorAll('[data-sample]').forEach(function(el){var i=V.ROUTE.indexOf(el.dataset.sample);el.classList.toggle('current',i===state.routeIndex);el.classList.toggle('next',!done&&i===state.routeIndex+1);});
  var q=state.voyageHistory[state.voyageHistory.length-1];$('voyageResult').hidden=!q||state.page!=='observe';
  if(q){var a=V.state(q.from,36).draftM,b=V.state(q.to,36).draftM;var delta=Math.abs(a-b)*100;$('voyageResult').textContent=V.getRegion(q.to).name+'：'+words[q.result]+(q.result==='same'?'':' '+fmt(delta,1)+' cm')+' · 吃水 '+fmt(a,3)+' → '+fmt(b,3)+' m';}
}
document.querySelectorAll('[data-prediction]').forEach(function(el){el.addEventListener('click',function(){if(travel)return;state.prediction=el.dataset.prediction;pressed('[data-prediction]','prediction',state.prediction);});});
$('sailButton').addEventListener('click',function(){
  if(travel)return;
  if(state.routeIndex>=2){state.routeIndex=0;state.prediction=null;state.visualDraft=V.state('yangtze',36).draftCm;syncVoyage();$('voyageResult').hidden=true;redraw();persist();return;}
  if(!state.prediction){toast('先预测：上浮、不变，还是下沉？');return;}
  var from=V.ROUTE[state.routeIndex],to=V.ROUTE[state.routeIndex+1];
  travel={from:from,to:to,prediction:state.prediction,fromDraft:V.state(from,36).draftCm,toDraft:V.state(to,36).draftCm,progress:0,started:performance.now(),duration:reduced?300:3200};
  syncVoyage();ensureFrames();
});
function completeTravel(){var q=travel;state.routeIndex=V.ROUTE.indexOf(q.to);state.voyageHistory.push({from:q.from,to:q.to,prediction:q.prediction,result:V.predict(q.from,q.to,36),at:new Date().toISOString()});state.voyageHistory=state.voyageHistory.slice(-48);state.visualDraft=q.toDraft;state.prediction=null;travel=null;syncVoyage();persist();}
$('zoomButton').addEventListener('click',function(){state.zoom=!state.zoom;this.classList.toggle('selected',state.zoom);this.setAttribute('aria-label',state.zoom?'关闭吃水放大窗':'放大吃水位置');redraw();});
function readingRows(hostId,clickable){var host=$(hostId);host.replaceChildren();ids.forEach(function(id){var r=latest(id),row=document.createElement(clickable?'button':'div');row.className='reading-row'+(id===state.liquid?' current':'');var label=document.createElement('span');label.textContent=names[id];var value=document.createElement('strong');value.textContent=recordText(r);row.append(label,value);if(clickable){row.setAttribute('aria-label',names[id]+'记录 '+recordText(r));row.addEventListener('click',function(){chooseLiquid(id);});}host.appendChild(row);});}
function fillMeasurement(){var q=latest(state.liquid);$('heightInput').value=q&&q.exposedCm!==null?fmt(q.exposedCm):'';$('recordMode').value=state.mode;pressed('[data-liquid]','liquid',state.liquid);readingRows('readingTable',true);}
function chooseLiquid(id){if(ids.indexOf(id)<0||swap)return;if(id===state.liquid)return;var before=state.liquid,fromExposure=exposure(before);state.liquid=id;closeKeyboard();fillMeasurement();swap={from:before,to:id,fromExposure:fromExposure,progress:0,started:performance.now(),duration:reduced?250:1800};setMeasureBusy(true);persist();ensureFrames();}
document.querySelectorAll('[data-liquid]').forEach(function(el){el.addEventListener('click',function(){chooseLiquid(el.dataset.liquid);});});
function setMeasureBusy(busy){document.querySelectorAll('[data-liquid]').forEach(function(el){el.disabled=busy;});$('saveReading').disabled=busy;$('uncertainReading').disabled=busy;$('heightInput').disabled=busy;$('keyboardButton').disabled=busy;$('resetRuler').disabled=busy;}
function setMode(mode){if(mode!=='measured'&&mode!=='simulation')return;state.mode=mode;state.ruler=null;closeKeyboard();if(state.page==='measure')fillMeasurement();if(state.page==='compare')syncCompare();$('sourceNote').textContent=state.mode==='simulation'?'模拟测量 · 手动读数':'本组实物记录 · 图示';persist();redraw();}
$('recordMode').addEventListener('change',function(){if(swap){this.value=state.mode;return;}setMode(this.value);});$('compareMode').addEventListener('change',function(){setMode(this.value);});
function openKeyboard(){if(swap)return;state.keypad=true;$('keypad').hidden=false;$('app').classList.add('keypad-open');$('keyboardButton').setAttribute('aria-label','收起数字键盘');requestAnimationFrame(redraw);}
function closeKeyboard(){state.keypad=false;$('keypad').hidden=true;$('app').classList.remove('keypad-open');$('keyboardButton').setAttribute('aria-label','打开数字键盘');requestAnimationFrame(redraw);}
$('heightInput').addEventListener('click',openKeyboard);$('keyboardButton').addEventListener('click',function(){if(state.keypad)closeKeyboard();else openKeyboard();});
function inputKey(key){var input=$('heightInput'),str=input.value;if(key==='done'){closeKeyboard();return;}if(key==='clear'){input.value='';return;}if(key==='backspace'){input.value=str.slice(0,-1);return;}if(key==='.'){if(str.indexOf('.')>=0)return;input.value=(str||'0')+'.';return;}if(!/^\d$/.test(key))return;if(str==='0')str='';var next=str+key;if(/^\d{1,2}(\.\d?)?$/.test(next))input.value=next;}
document.querySelectorAll('[data-key]').forEach(function(el){el.addEventListener('click',function(){inputKey(el.dataset.key);});});
$('heightInput').addEventListener('keydown',function(e){if(/^[0-9.]$/.test(e.key)){e.preventDefault();openKeyboard();inputKey(e.key);}else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();inputKey(e.key==='Backspace'?'backspace':'clear');}else if(e.key==='Enter'){e.preventDefault();saveReading(false);}else if(e.key==='Escape')closeKeyboard();});
function updateRulerStatus(){var g=geometry(),el=$('alignmentState');if(!g)return;el.textContent=g.rulerAligned?'✓ 0线已对准液面':'0刻度对准液面';el.classList.toggle('aligned',!!g.rulerAligned);}
$('resetRuler').textContent='直尺归位';$('resetRuler').addEventListener('click',function(){state.ruler=null;redraw();});
$('scene').addEventListener('pointerdown',function(e){
  if(state.page!=='measure'||swap)return;var g=geometry(),rect=this.getBoundingClientRect();if(!g||!g.rulerRect)return;var x=e.clientX-rect.left,y=e.clientY-rect.top,r=g.rulerRect;
  if(x<r.x-14||x>r.x+r.width+14||y<r.y-12||y>r.y+r.height+12)return;
  drag={startX:x,startY:y,x:g.rulerX,y:g.rulerZeroY,width:rect.width,height:rect.height,rect:rect};try{this.setPointerCapture(e.pointerId);}catch(err){}e.preventDefault();
});
function placeRuler(x,y,rect,g){x=Math.max(rect.width*.06,Math.min(rect.width*.9,x));y=Math.max(rect.height*.24,Math.min(rect.height*.94,y));state.ruler={x:x/rect.width,y:y/rect.height,offsetXcm:(x-g.centerX)/g.pxPerCm,zeroOffsetCm:(y-g.waterY)/g.pxPerCm,nearFloat:Math.abs(x-g.centerX)<Math.max(94,g.pxPerCm*6)};}
$('scene').addEventListener('pointermove',function(e){if(!drag)return;var x=e.clientX-drag.rect.left,y=e.clientY-drag.rect.top;placeRuler(drag.x+x-drag.startX,drag.y+y-drag.startY,drag.rect,geometry());redraw();e.preventDefault();});
function endRulerDrag(){if(!drag)return;drag=null;var g=geometry(),rect=$('scene').getBoundingClientRect();if(g&&Math.abs(g.rulerX-g.centerX)<Math.max(94,g.pxPerCm*6)&&Math.abs(g.rulerZeroY-g.waterY)<Math.max(4,g.pxPerCm*.3)){placeRuler(g.rulerX,g.waterY,rect,g);}redraw();}
$('scene').addEventListener('pointerup',endRulerDrag);$('scene').addEventListener('pointercancel',endRulerDrag);
$('scene').addEventListener('keydown',function(e){if(state.page!=='measure'||swap)return;var moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},move=moves[e.key];if(!move)return;e.preventDefault();var g=geometry(),r=this.getBoundingClientRect(),step=e.shiftKey?1:5;placeRuler(g.rulerX+move[0]*step,g.rulerZeroY+move[1]*step,r,g);redraw();});
function saveReading(uncertain){
  if(swap)return;var str=$('heightInput').value,n=str===''?null:Number(str);
  if(!uncertain&&(n===null||!Number.isFinite(n)||n<0||n>24)){toast('请输入 0—24 cm 的读数');openKeyboard();return;}
  if(!uncertain&&state.mode==='simulation'){var g=geometry();if(!g||!g.rulerAligned){toast('先把直尺0刻度对准液面');closeKeyboard();return;}}
  try{var old=current().readings[state.liquid].map(function(r){return r.id;});state.sessions[state.mode]=L.addReading(current(),state.liquid,uncertain?null:n,{source:state.mode==='simulation'?'simulation':'measured',uncertain:uncertain});current().evidenceIds=current().evidenceIds.filter(function(id){return old.indexOf(id)<0;});persist();closeKeyboard();readingRows('readingTable',true);redraw();toast(uncertain?'已记为待复测':names[state.liquid]+' '+fmt(n)+' cm · 已记录');}catch(e){toast(e.message);}
}
$('saveReading').addEventListener('click',function(){saveReading(false);});$('uncertainReading').addEventListener('click',function(){saveReading(true);});
function comparison(){var a=ids.map(function(id){var r=latest(id);return{id:id,value:r?r.exposedCm:null};});var known=a.filter(function(r){return r.value!==null;});if(known.length<3)return {ready:false,label:'已记录 '+known.length+' / 3',detail:'用同一支浮标完成比较'};var sorted=known.slice().sort(function(a,b){return b.value-a.value;}),delta=sorted[0].value-sorted[2].value;return {ready:true,label:fmt(delta)+' cm',detail:'最高与最低相差',highest:delta<.05?'三次读数相同':known.filter(function(r){return Math.abs(r.value-sorted[0].value)<.05;}).map(function(r){return names[r.id];}).join('、')+'露出最高',values:a};}
function syncCompare(){
  $('compareMode').value=state.mode;readingRows('compareRecords',false);pressed('[data-align]','align',state.alignment);
  var c=comparison(),host=$('comparisonResult');host.replaceChildren();var span=document.createElement('span');span.textContent=c.ready?c.detail:'本组数据';var strong=document.createElement('strong');strong.textContent=c.label;var small=document.createElement('small');small.textContent=c.ready?c.highest:c.detail;host.append(span,strong,small);
}
document.querySelectorAll('[data-align]').forEach(function(el){el.addEventListener('click',function(){state.alignment=el.dataset.align;pressed('[data-align]','align',state.alignment);persist();redraw();});});
$('backMeasure').addEventListener('click',function(){setPage('measure');});
function syncLoad(){
  var b=dryBoat(),hold=state.hold==='cargo';if(!hold)state.cargo=b.cargoUnits;pressed('[data-region]','region',state.region);pressed('[data-hold]','hold',state.hold);
  $('adjustLabel').textContent=hold?'保持货物质量':'保持平均吃水';$('adjustValue').textContent=hold?fmt(b.cargoMassT,0):fmt(state.targetDraft,2);$('adjustUnit').textContent=hold?'t':'m';
  $('loadRange').min=hold?'0':'1.2';$('loadRange').max=hold?'80':'4.4';$('loadRange').step=hold?'1':'0.05';$('loadRange').value=hold?state.cargo:state.targetDraft;
  $('calmToggle').checked=state.conditions==='calm';$('waveLabel').textContent=state.conditions==='calm'?'平静水面':state.region==='ocean'?'海面有浪':'内河小浪';
  buildLoadTable();updateLoadStatus();
}
function buildLoadTable(){var rows=state.hold==='cargo'?V.compareAtLoad(state.cargo,options()):V.compareAtDraft(state.targetDraft,options());var host=$('loadTable');host.replaceChildren();var table=document.createElement('table');if(state.flood.floodMassG>0){var caption=document.createElement('caption');caption.textContent='进水前的同条件对比';table.appendChild(caption);}var tr=document.createElement('tr');['水域','载货 / t','吃水 / m'].forEach(function(s){var th=document.createElement('th');th.textContent=s;tr.appendChild(th);});var head=document.createElement('thead');head.appendChild(tr);table.appendChild(head);var body=document.createElement('tbody');rows.forEach(function(b){var row=document.createElement('tr');if(b.region===state.region)row.className='current';[V.getRegion(b.region).name,fmt(b.cargoMassT,0),fmt(b.draftM,3)].forEach(function(value,i){var td=document.createElement('td');td.textContent=value;if(i>0)td.className=(state.hold==='cargo'?i===2:i===1)?'changing':'fixed';row.appendChild(td);});body.appendChild(row);});table.appendChild(body);host.appendChild(table);}
function updateLoadStatus(){
  var b=wetBoat(),wet=state.flood.floodMassG>0||state.flood.sinkProgress>0;
  $('draftValue').textContent=b.sinkProgress>0?'—':fmt(b.draftM,3);$('freeboardValue').textContent=b.sinkProgress>0?'—':fmt(b.freeboardM,3);
  $('loadStatus').className='load-status '+b.status;
  $('loadStatusText').textContent=b.isSunk?'船已沉没':b.sinkProgress>0?'进水增重 · 正在下沉':wet?'浪越船舷 · 船内进水':b.safe?'安全线以内':'超过安全线';
  $('resetShip').hidden=!wet&&!b.swamped;
  document.querySelectorAll('[data-region],[data-hold]').forEach(function(el){el.disabled=wet;});$('calmToggle').disabled=wet;$('loadRange').disabled=wet;
  $('loadMinus').disabled=wet||(state.hold==='cargo'?state.cargo<=0:state.targetDraft<=1.2);$('loadPlus').disabled=wet||(state.hold==='cargo'?state.cargo>=80:state.targetDraft>=4.4);
  $('saveLoad').disabled=wet;$('saveLoad').textContent=b.safe?'记下这一组':wet?'复位后再比较':'先减小装载';
}
function adjustValue(delta){if(state.flood.floodMassG>0||state.flood.sinkProgress>0)return;if(state.hold==='cargo')state.cargo=Math.max(0,Math.min(80,Math.round(state.cargo)+delta));else state.targetDraft=Math.max(1.2,Math.min(4.4,Math.round((state.targetDraft+delta*.05)*100)/100));syncLoad();persist();animateDraft();}
function holdButton(el,delta){var delay,repeat,suppress=false;function stop(){clearTimeout(delay);clearInterval(repeat);}el.addEventListener('pointerdown',function(e){if(el.disabled)return;suppress=true;adjustValue(delta);try{el.setPointerCapture(e.pointerId);}catch(err){}delay=setTimeout(function(){repeat=setInterval(function(){if(el.disabled){stop();return;}adjustValue(delta);},120);},350);e.preventDefault();});el.addEventListener('pointerup',function(){stop();setTimeout(function(){suppress=false;},150);});el.addEventListener('pointercancel',stop);el.addEventListener('lostpointercapture',stop);el.addEventListener('click',function(e){if(!suppress&&e.detail===0)adjustValue(delta);});window.addEventListener('blur',stop);}
holdButton($('loadMinus'),-1);holdButton($('loadPlus'),1);
$('loadRange').addEventListener('input',function(){if(state.hold==='cargo')state.cargo=Number(this.value);else state.targetDraft=Number(this.value);syncLoad();persist();animateDraft();});
document.querySelectorAll('[data-region]').forEach(function(el){el.addEventListener('click',function(){if(state.flood.floodMassG>0)return;state.region=el.dataset.region;state.flood=V.createFlood();lastFloodStatus='dry';syncLoad();persist();animateDraft();});});
document.querySelectorAll('[data-hold]').forEach(function(el){el.addEventListener('click',function(){if(state.flood.floodMassG>0)return;var b=dryBoat();state.hold=el.dataset.hold;if(state.hold==='draft')state.targetDraft=Math.max(1.2,Math.min(4.4,Math.round(b.draftCm*20)/20));else state.cargo=Math.max(0,Math.min(80,Math.round(b.cargoUnits)));state.flood=V.createFlood();syncLoad();persist();animateDraft();});});
$('calmToggle').addEventListener('change',function(){state.conditions=this.checked?'calm':'region';state.flood=V.createFlood();lastFloodStatus='dry';syncLoad();persist();redraw();});
$('resetShip').addEventListener('click',function(){state.flood=V.createFlood();state.cargo=36;state.targetDraft=3.2;lastFloodStatus='dry';syncLoad();persist();animateDraft();toast('船已复位，可以重新比较');});
$('saveLoad').addEventListener('click',function(){var b=wetBoat();if(!b.safe||state.flood.floodMassG>0){toast('超过安全线，先减少货物');return;}state.loadRecords.push({region:state.region,hold:state.hold,cargoUnits:b.cargoUnits,draftCm:b.draftCm,conditions:state.conditions,at:new Date().toISOString()});state.loadRecords=state.loadRecords.slice(-24);persist();toast(V.getRegion(state.region).name+' · '+fmt(b.cargoMassT,0)+' t · 吃水 '+fmt(b.draftM,3)+' m');});
$('groupNumber').value=state.group;$('groupNumber').addEventListener('change',function(){state.group=Math.max(1,Math.min(99,parseInt(this.value,10)||1));this.value=state.group;['simulation','measured'].forEach(function(mode){state.sessions[mode].group='第'+state.group+'组';});persist();});
$('fullscreenButton').addEventListener('click',function(){if(document.fullscreenElement){if(document.exitFullscreen)document.exitFullscreen();return;}var el=document.documentElement,enter=el.requestFullscreen||el.webkitRequestFullscreen;if(enter){var promise=enter.call(el);if(promise&&promise.catch)promise.catch(function(){toast('可使用浏览器全屏功能');});}else toast('将平板横放可获得更大的实验画面');});
function showModal(id){stopFrames();lastFocus=document.activeElement;$(id).hidden=false;$(id).querySelector('.close-modal').focus();}
function closeModal(el){el.hidden=true;if(lastFocus&&lastFocus.focus)lastFocus.focus();if(travel)travel.started=performance.now()-travel.progress*travel.duration;if(swap)swap.started=performance.now()-swap.progress*swap.duration;if(state.page==='load'||travel||swap||draftMotion)ensureFrames();}
document.querySelectorAll('.modal').forEach(function(modal){modal.querySelector('.close-modal').addEventListener('click',function(){closeModal(modal);});modal.addEventListener('click',function(e){if(e.target===modal)closeModal(modal);});modal.addEventListener('keydown',function(e){if(e.key==='Escape'){closeModal(modal);e.preventDefault();}if(e.key==='Tab'){var f=Array.from(modal.querySelectorAll('button:not([disabled]),a[href],input:not([hidden]),select')).filter(function(el){return el.offsetParent!==null;});if(e.shiftKey&&document.activeElement===f[0]){f[f.length-1].focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===f[f.length-1]){f[0].focus();e.preventDefault();}}});});
var helps={observe:['同一艘船带着3600吨货物，从长江驶入海洋，再驶入本次浑浊黄河水样。','右侧三个水样体积都为1000毫升，先比较质量，再预测船会怎样。','吃水变化只有几厘米，可看局部放大与航行后的数值。'],measure:['吸管没有刻度。拖动直尺靠近吸管，把0刻度对准液面，读吸管顶端对应的刻度。','点击读数框，用数字键盘输入，再记下来；网页不会替你填正确读数。','换液体时仍用同一支浮标。做实物实验可切到“实物记录”，不清楚时保留待复测。'],compare:['水面对齐：比较露出的高度。浮标对齐：比较标记在吸管上的位置。','舞台标注来自本组记录，差值也按记录计算；数据不一致时回去复测。','不同组自制浮标可能不同，交流变化关系，不把绝对高度直接平均。'],load:['“同装载”保持货物质量，换水域看吃水；“同吃水”保持平均吃水，换水域看货物质量。','“统一平静”关闭波浪，并让三个水域采用相同安全吃水，单独比较液体的影响。','有浪海面要留出更多干舷，所以安全线较低；平静内河安全线可以更高，但仍低于船舷。','超过安全线不等于立即沉没。波浪越过开放船口会进水、增重；浮力储备不足后才逐渐沉没。','教学模型：船深4.4米，空船1600吨；货箱外观仅示意，装载质量以数值为准。']};
$('helpButton').addEventListener('click',function(){var host=$('helpContent');host.replaceChildren();helps[state.page].forEach(function(s){var p=document.createElement('p');p.textContent=s;host.appendChild(p);});showModal('helpModal');});
function appendHeading(host,title,text){var h=document.createElement('h3');h.textContent=title;var p=document.createElement('p');p.textContent=text;host.append(h,p);}
function fillNotes(){var host=$('notesContent');host.replaceChildren();$('notesTitle').textContent='第'+state.group+'组 · '+sourceName();var table=document.createElement('table'),head=document.createElement('tr');['液体','露出高度','次数'].forEach(function(s){var th=document.createElement('th');th.textContent=s;head.appendChild(th);});table.appendChild(head);ids.forEach(function(id){var row=document.createElement('tr');[names[id],recordText(latest(id)),current().readings[id].length].forEach(function(s){var td=document.createElement('td');td.textContent=s;row.appendChild(td);});table.appendChild(row);});host.appendChild(table);
  var c=comparison();appendHeading(host,'图上比较',c.ready?c.detail+' '+c.label+'；'+c.highest:c.label);
  if(state.voyageHistory.length)appendHeading(host,'航行预测',state.voyageHistory.slice(-6).map(function(q){return V.getRegion(q.from).name+' → '+V.getRegion(q.to).name+'：预测'+words[q.prediction]+'，观察'+words[q.result];}).join('；'));
  if(state.loadRecords.length)appendHeading(host,'模型装载记录',state.loadRecords.slice(-6).map(function(q){return V.getRegion(q.region).name+'：'+fmt(q.cargoUnits*100,0)+' t，吃水'+fmt(q.draftCm,3)+' m，'+(q.conditions==='calm'?'统一平静':'本次风浪');}).join('；'));
  var all=[];ids.forEach(function(id){current().readings[id].forEach(function(r,i){all.push(names[id]+'第'+(i+1)+'次 '+recordText(r));});});if(all.length>3)appendHeading(host,'保留的测量记录',all.join('；'));
  if(state.legacy&&Object.keys(state.legacy).length)appendHeading(host,'上一版记录','上一版的预测、装载和说明保留在完整备份中，与本次水域模型分开。');
}
$('notesButton').addEventListener('click',function(){fillNotes();showModal('notesModal');});
function download(blob,name){var a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},30000);}
$('exportJson').addEventListener('click',function(){try{download(new Blob([W.export(state)],{type:'application/json'}),'船的最大装载量_v2_第'+state.group+'组_完整记录.json');toast('完整记录已导出');}catch(e){toast(e.message);}});
$('importJson').addEventListener('click',function(){$('importFile').click();});
$('importFile').addEventListener('change',function(){var file=this.files&&this.files[0];this.value='';if(!file)return;if(file.size>524288){toast('记录文件过大');return;}var reader=new FileReader();reader.onload=function(){try{var restored=W.import(reader.result);Object.assign(state,restored);state.flood=V.createFlood();state.ruler=null;state.prediction=null;$('groupNumber').value=state.group;setPage(state.page);fillNotes();persist();toast('记录已恢复');}catch(e){toast('导入失败：'+e.message);}};reader.onerror=function(){toast('无法读取文件');};reader.readAsText(file);});
function evidenceImage(){
  var c=document.createElement('canvas');c.width=1400;c.height=1120;var g=c.getContext('2d');g.fillStyle='#f1f9fc';g.fillRect(0,0,c.width,c.height);g.fillStyle='#12314c';g.font='700 48px sans-serif';g.fillText('船的最大装载量',65,85);g.font='26px sans-serif';g.fillStyle='#537889';g.fillText('五下4.5 · 第'+state.group+'组 · '+sourceName()+' · v2.0',65,132);
  var vs=values(),cols=[270,700,1130],baseline=720,top=230,scale=17;g.strokeStyle='#bed7df';g.setLineDash([8,7]);g.beginPath();g.moveTo(80,baseline);g.lineTo(1320,baseline);g.stroke();g.setLineDash([]);
  ids.forEach(function(id,i){var x=cols[i],v=vs[id];g.fillStyle='#214b62';g.font='700 32px sans-serif';g.textAlign='center';g.fillText(names[id],x,205);if(v!==null){var h=v*scale;g.fillStyle=['#70b7c9','#7f9ecb','#9d91ba'][i];g.fillRect(x-60,baseline-h,120,h);g.fillStyle='#f6fcff';g.fillRect(x-4,baseline-h-15,8,h+55);g.fillStyle='#037f8c';g.font='700 38px sans-serif';g.fillText(fmt(v)+' cm',x,baseline-h-35);if(i>0&&vs.fresh!==null){g.fillStyle='#597c8d';g.font='24px sans-serif';var d=v-vs.fresh;g.fillText('比清水 '+(d>=0?'+':'')+fmt(d)+' cm',x,baseline+62);}}else{g.fillStyle='#98acb6';g.font='31px sans-serif';g.fillText('未记录',x,450);}});
  g.textAlign='left';var summary=comparison();g.fillStyle='#164960';g.font='700 30px sans-serif';g.fillText(summary.ready?summary.detail+' '+summary.label+' · '+summary.highest:summary.label,65,855);g.fillStyle='#678796';g.font='24px sans-serif';g.fillText('同一支浮标 · 露出高度由本组手动记录',65,916);g.fillText(new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}),65,1000);g.fillText('镇海区鲲池小学 王宁 · mutiw',65,1060);c.toBlob(function(blob){if(blob){download(blob,'船的最大装载量_第'+state.group+'组_证据卡_v2.png');toast('证据卡已保存');}else toast('暂时无法生成图片，请导出记录');},'image/png');
}
$('exportImage').addEventListener('click',evidenceImage);$('saveComparison').addEventListener('click',evidenceImage);
window.addEventListener('hashchange',function(){var page=location.hash.slice(1);if(['observe','measure','compare','load'].indexOf(page)>=0&&page!==state.page)setPage(page,false);});
window.addEventListener('resize',function(){requestAnimationFrame(redraw);});
document.addEventListener('visibilitychange',function(){if(document.hidden){stopFrames();persist();}else{if(travel)travel.started=performance.now()-travel.progress*travel.duration;if(swap)swap.started=performance.now()-swap.progress*swap.duration;if(state.page==='load'||travel||swap||draftMotion)ensureFrames();else redraw();}});
setPage(location.hash.slice(1)||'observe',false);if(restoreNotice)setTimeout(function(){toast(restoreNotice);},600);
})();
