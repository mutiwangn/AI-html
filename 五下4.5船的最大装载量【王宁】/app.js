(function(){
'use strict';
var L=window.FloatLogic, $=function(id){return document.getElementById(id);};
var STORE='mutiw-5down-4-5-v1', liquids=['fresh','mild','brine'], names={fresh:'清水',mild:'淡盐水',brine:'浓盐水'};
var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var state={page:'observe',group:1,mode:'measured',liquid:'fresh',observeLiquid:'fresh',cargo:36,align:'water',zoom:false,prediction:null,observations:[],loadRecords:{},draft:2.6,marker:null,measuredPose:10,sessions:{measured:L.createSession('第1组'),simulation:L.createSession('第1组')}};
var toastTimer, animation=0, drag=null, lastFocus=null, storageOK=true;
try{var old=JSON.parse(localStorage.getItem(STORE)||'null');if(old&&old.schema==='float-ui-v1'){
  var restoredSessions={measured:validateModeSession(old.sessions.measured,'measured'),simulation:validateModeSession(old.sessions.simulation,'simulation')};
  if(restoredSessions.measured.group!==restoredSessions.simulation.group)throw new Error('保存的记录组号不一致');
  var restoredLoads=rebuildLoadRecords(old.loadRecords),restoredObservations=rebuildObservations(old.observations);
  state.sessions=restoredSessions;
  state.group=Math.max(1,Math.min(99,parseInt(old.group,10)||1));state.mode=old.mode==='simulation'?'simulation':'measured';
  if(liquids.indexOf(old.liquid)>=0)state.liquid=old.liquid;if(liquids.indexOf(old.observeLiquid)>=0)state.observeLiquid=old.observeLiquid;
  if(Number.isInteger(old.cargo)&&old.cargo>=0&&old.cargo<=72)state.cargo=old.cargo;
  state.loadRecords=restoredLoads;
  state.observations=restoredObservations;
}}catch(e){storageOK=false;}
var renderer=new FloatRenderer($('scene'),{shipSrc:'assets/ship.webp',harborSrc:'assets/harbor.webp'});
function current(){return state.sessions[state.mode];}
// Record boundary helpers: validate before replacing a group's saved workbook.
function validateModeSession(raw,mode){
  if(mode!=='measured'&&mode!=='simulation')throw new Error('记录来源不正确');
  var session=L.validateSession(raw);
  liquids.forEach(function(id){session.readings[id].forEach(function(r){if(mode==='simulation'?r.source!=='simulation':r.source==='simulation')throw new Error('实测和模型记录不能混在一起');});});
  return session;
}
function rebuildLoadRecords(raw){
  if(raw==null)return {};
  if(typeof raw!=='object'||Array.isArray(raw))throw new Error('装载记录格式不正确');
  var out={};
  liquids.forEach(function(id){
    if(!Object.prototype.hasOwnProperty.call(raw,id))return;
    var q=raw[id];
    if(!q||typeof q!=='object'||Array.isArray(q)||!Number.isInteger(q.count)||q.count<0||q.count>72)throw new Error('装载数量不正确');
    if(q.source!=null&&q.source!=='simulation')throw new Error('装载记录须来自课堂模型');
    if(typeof q.at!=='string'||q.at.length>40||!Number.isFinite(Date.parse(q.at)))throw new Error('装载时间不正确');
    var boat=L.boatState(id,q.count);
    if(!boat.safe)throw new Error('装载记录超过本次安全线');
    out[id]={count:q.count,at:new Date(q.at).toISOString(),verified:q.count<72&&!L.boatState(id,q.count+1).safe,source:'simulation'};
  });
  return out;
}
function rebuildObservations(raw){
  if(raw==null)return [];
  if(!Array.isArray(raw)||raw.length>12)throw new Error('换水观察记录格式不正确');
  return raw.map(function(q){
    if(!q||typeof q!=='object'||Array.isArray(q)||liquids.indexOf(q.from)<0||liquids.indexOf(q.to)<0||['up','same','down'].indexOf(q.prediction)<0||['up','same','down'].indexOf(q.result)<0)throw new Error('换水预测记录不正确');
    if(q.source!=null&&q.source!=='simulation')throw new Error('换水观察须标为课堂模型');
    var before=L.boatState(q.from,36).draftCm,after=L.boatState(q.to,36).draftCm,result=Math.abs(after-before)<0.0001?'same':after<before?'up':'down';
    if(q.result!==result)throw new Error('换水模型结果与液体条件不一致');
    return {from:q.from,to:q.to,prediction:q.prediction,result:q.result,source:'simulation'};
  });
}
function makeWorkbook(ui){
  var mode=ui.mode==='simulation'?'simulation':'measured',sessions={measured:validateModeSession(ui.sessions.measured,'measured'),simulation:validateModeSession(ui.sessions.simulation,'simulation')};
  if(sessions.measured.group!==sessions.simulation.group)throw new Error('两套记录的组号不同，请先核对组号');
  return {schema:'mutiw-float-workbook-v1',session:sessions[mode],sessions:sessions,mode:mode,liquid:ui.liquid,observeLiquid:ui.observeLiquid,cargo:ui.cargo,loadRecords:rebuildLoadRecords(ui.loadRecords),observations:rebuildObservations(ui.observations)};
}
function readWorkbook(json){
  if(typeof json!=='string'||json.length>262144)throw new Error('记录文件过大');
  var obj=JSON.parse(json),session,mode,sessions,wrapped=obj&&obj.schema==='mutiw-float-workbook-v1';
  if(wrapped){
    mode=obj.mode;
    if(mode!=='measured'&&mode!=='simulation')throw new Error('记录来源不正确');
    if(obj.sessions){sessions={measured:validateModeSession(obj.sessions.measured,'measured'),simulation:validateModeSession(obj.sessions.simulation,'simulation')};session=sessions[mode];if(sessions.measured.group!==sessions.simulation.group)throw new Error('文件包含不同小组的记录');}
    else{session=validateModeSession(obj.session,mode);sessions={measured:L.createSession(session.group),simulation:L.createSession(session.group)};sessions[mode]=session;}
  }else{
    session=L.importSession(json);
    var records=liquids.reduce(function(a,id){return a.concat(session.readings[id]);},[]);
    mode=records.length&&records.every(function(r){return r.source==='simulation';})?'simulation':'measured';
    session=validateModeSession(session,mode);sessions={measured:L.createSession(session.group),simulation:L.createSession(session.group)};sessions[mode]=session;
  }
  var match=session.group.match(/\d+/),group=match?Math.max(1,Math.min(99,Number(match[0]))):1;
  return {mode:mode,group:group,sessions:sessions,loadRecords:wrapped?rebuildLoadRecords(obj.loadRecords):{},observations:wrapped?rebuildObservations(obj.observations):[],liquid:wrapped&&liquids.indexOf(obj.liquid)>=0?obj.liquid:'fresh',observeLiquid:wrapped&&liquids.indexOf(obj.observeLiquid)>=0?obj.observeLiquid:'fresh',cargo:wrapped&&Number.isInteger(obj.cargo)&&obj.cargo>=0&&obj.cargo<=72?obj.cargo:36};
}
// End record boundary helpers.
function persist(){try{localStorage.setItem(STORE,JSON.stringify({schema:'float-ui-v1',group:state.group,mode:state.mode,liquid:state.liquid,observeLiquid:state.observeLiquid,cargo:state.cargo,sessions:state.sessions,loadRecords:state.loadRecords,observations:state.observations}));storageOK=true;}catch(e){if(storageOK)toast('记录暂不能自动保存，请导出记录');storageOK=false;}}
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(function(){$('toast').hidden=true;},2900);}
function latest(id){var all=current().readings[id];for(var i=all.length-1;i>=0;i--)if(all[i].round===current().round)return all[i];return null;}
function readingValues(){var out={};liquids.forEach(function(id){var r=latest(id);out[id]=r?r.exposedCm:null;});return out;}
function shownHeight(){var str=$('heightInput').value.trim();if(str==='')return null;var n=Number(str);return Number.isFinite(n)&&n>=0&&n<=24?n:null;}
function textValue(r){return !r?'—':r.exposedCm===null?'待复测':r.exposedCm.toFixed(1)+' cm';}
function activeBoatLiquid(){return state.page==='observe'?state.observeLiquid:state.liquid;}
function redraw(){var b=L.boatState(activeBoatLiquid(),state.page==='observe'?36:state.cargo);var float=L.floatState(state.liquid,current().instrument);renderer.render({page:state.page,liquid:state.liquid,draft:state.draft,cargoUnits:state.page==='observe'?36:state.cargo,status:b.status,floatExposure:state.mode==='simulation'?float.exposedCm:state.measuredPose,markerExposure:state.marker,readings:readingValues(),align:state.align,source:state.mode==='simulation'?'model':'measured',showSafety:state.page==='load',zoom:state.zoom,reducedMotion:reduced});}
function animateDraft(target){cancelAnimationFrame(animation);var from=state.draft,start=performance.now();if(reduced){state.draft=target;redraw();return;}function step(now){var p=Math.min(1,(now-start)/780),v=1-Math.pow(1-p,3);state.draft=from+(target-from)*v;redraw();if(p<1)animation=requestAnimationFrame(step);}animation=requestAnimationFrame(step);}
function syncLiquidButtons(){document.querySelectorAll('[data-liquid]').forEach(function(el){var on=el.dataset.liquid===state.liquid;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on));});}
function syncPrediction(){document.querySelectorAll('[data-prediction]').forEach(function(el){var on=el.dataset.prediction===state.prediction;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on));});}
function strip(){var el=$('recordStrip');el.replaceChildren();if(state.page!=='measure'&&state.page!=='load'){el.hidden=true;return;}el.hidden=false;liquids.forEach(function(id){var button=document.createElement('button');button.className='record-item'+(id===state.liquid?' current':'');var q=state.page==='load'?state.loadRecords[id]:latest(id);if(q)button.classList.add('has-record');var dot=document.createElement('span');dot.className='mini-dot';var name=document.createElement('span');name.textContent=names[id];var val=document.createElement('strong');val.textContent=state.page==='load'?(q?q.count+' 箱':'—'):textValue(q);button.append(dot,name,val);button.setAttribute('aria-label',names[id]+'记录 '+val.textContent);button.addEventListener('click',function(){chooseLiquid(id);});el.appendChild(button);});}
function fillMeasurement(){var q=latest(state.liquid);$('heightInput').value=q&&q.exposedCm!==null?q.exposedCm.toFixed(1):'';state.marker=q?q.exposedCm:null;state.measuredPose=q&&q.exposedCm!==null?q.exposedCm:10;$('recordMode').value=state.mode;}
function evidence(){var host=$('evidencePicker');host.replaceChildren();liquids.forEach(function(id){var r=latest(id),button=document.createElement('button');button.className='evidence-button';button.disabled=!r||r.exposedCm===null;var checked=!!(r&&current().evidenceIds.indexOf(r.id)>=0);button.classList.toggle('selected',checked);button.setAttribute('aria-pressed',String(checked));var label=document.createElement('span');label.textContent=names[id];var value=document.createElement('strong');value.textContent=textValue(r);button.append(label,value);button.addEventListener('click',function(){var s=current(),i=s.evidenceIds.indexOf(r.id);if(i<0)s.evidenceIds.push(r.id);else s.evidenceIds.splice(i,1);persist();evidence();});host.appendChild(button);});$('compareSource').textContent=state.mode==='simulation'?'本组模型记录':'本组实测';$('explanation').value=current().explanation;}
function loadUI(){var b=L.boatState(state.liquid,state.cargo);$('cargoCount').textContent=state.cargo;$('cargoRange').value=state.cargo;$('cargoMinus').disabled=state.cargo===0;$('cargoPlus').disabled=state.cargo===72;$('loadStatus').className='load-status '+b.status;$('loadStatusText').textContent=b.swamped?'水到船口了':b.safe?'安全线以内':'超过安全线';$('saveLoad').textContent=b.safe?'记下装载量':'先减一些货物';}
function setPage(page,updateHash){if(['observe','measure','compare','load'].indexOf(page)<0)page='observe';cancelAnimationFrame(animation);state.page=page;$('app').dataset.page=page;state.zoom=false;var boat=page==='observe'||page==='load';$('question').textContent={observe:'换一种水，会怎样？',measure:'液面在哪里？',compare:'我们的记录说明什么？',load:'不越过安全线，能装多少？'}[page];
  ['observe','measure','compare','load'].forEach(function(p){$(p+'Controls').hidden=p!==page;});
  document.querySelectorAll('[data-page]').forEach(function(el){var on=el.dataset.page===page;el.classList.toggle('active',on);if(on)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  $('liquidPicker').hidden=page==='compare';$('predictionBar').hidden=page!=='observe';$('stageHint').hidden=page!=='measure';$('alignControls').hidden=page!=='compare';$('loadStatus').hidden=page!=='load';$('zoomButton').hidden=!boat;$('zoomButton').classList.remove('selected');
  $('sourceNote').textContent=boat?'课堂模型':state.mode==='simulation'?'模型练习':'本组实测 · 图示记录';
  $('scene').setAttribute('aria-label',page==='measure'?'同一支浮标，拖动标线记录露出液面的长度':page==='compare'?'三种液体中的本组浮标记录，可切换对齐方式':'同一艘轮船的漂浮与装载模型');
  if(page==='measure')fillMeasurement();if(page==='compare')evidence();if(page==='load')loadUI();syncLiquidButtons();syncPrediction();strip();
  state.draft=L.boatState(activeBoatLiquid(),page==='observe'?36:state.cargo).draftCm;requestAnimationFrame(redraw);
  if(updateHash!==false){try{history.replaceState(null,'','#'+page);}catch(e){}}persist();
}
function chooseLiquid(id){if(liquids.indexOf(id)<0)return;state.liquid=id;state.prediction=null;syncLiquidButtons();syncPrediction();if(state.page==='measure')fillMeasurement();if(state.page==='load')loadUI();strip();persist();if(state.page==='load')animateDraft(L.boatState(id,state.cargo).draftCm);else redraw();if(state.page==='observe')$('observeContext').textContent=names[state.observeLiquid]+' → '+names[id];}
document.querySelectorAll('[data-page]').forEach(function(el){el.addEventListener('click',function(){setPage(el.dataset.page);});});
document.querySelectorAll('[data-liquid]').forEach(function(el){el.addEventListener('click',function(){chooseLiquid(el.dataset.liquid);});});
document.querySelectorAll('[data-prediction]').forEach(function(el){el.addEventListener('click',function(){state.prediction=el.dataset.prediction;syncPrediction();});});
$('observeButton').addEventListener('click',function(){if(state.liquid===state.observeLiquid){toast('先选另一种液体');return;}if(!state.prediction){toast('先选：上浮、不变，还是下沉？');return;}var from=state.observeLiquid,to=state.liquid,before=L.boatState(from,36).draftCm,after=L.boatState(to,36).draftCm,answer=Math.abs(after-before)<0.0001?'same':after<before?'up':'down';state.observations.push({from:from,to:to,prediction:state.prediction,result:answer,source:'simulation'});state.observations=state.observations.slice(-12);var words={up:'上浮',same:'不变',down:'下沉'};current().prediction={choice:'unsure',reason:names[from]+'换成'+names[to]+'，我预测'+words[state.prediction]};state.observeLiquid=to;$('observeContext').textContent='同一艘船 · 货物不变';persist();animateDraft(after);toast(answer==='up'?'船浮高了一点':answer==='down'?'船吃水更深了一点':'船的位置没有改变');});
$('zoomButton').addEventListener('click',function(){state.zoom=!state.zoom;this.classList.toggle('selected',state.zoom);this.setAttribute('aria-label',state.zoom?'关闭吃水放大窗':'放大吃水位置');redraw();});
function setMarker(value){value=Math.max(0,Math.min(24,Math.round(value*10)/10));state.marker=value;$('heightInput').value=value.toFixed(1);if(!drag&&state.mode==='measured')state.measuredPose=value;redraw();}
$('heightInput').addEventListener('input',function(){var v=shownHeight();state.marker=v;redraw();});
$('heightInput').addEventListener('change',function(){var v=shownHeight();if(v===null&&this.value!==''){toast('请输入 0 到 24 厘米');return;}if(state.mode==='measured'&&v!==null)state.measuredPose=v;redraw();});
$('heightMinus').addEventListener('click',function(){setMarker((shownHeight()===null?10:shownHeight())-.1);});
$('heightPlus').addEventListener('click',function(){setMarker((shownHeight()===null?10:shownHeight())+.1);});
$('recordMode').addEventListener('change',function(){state.mode=this.value;fillMeasurement();strip();$('sourceNote').textContent=state.mode==='simulation'?'模型练习':'本组实测 · 图示记录';$('stageHint').textContent=state.mode==='simulation'?'拖动标线，读出浮标露出高度':'拖动标线，或输入实测高度';persist();redraw();});
function saveReading(uncertain){var v=shownHeight();if(!uncertain&&v===null){toast('先标出液面，或输入读数');$('heightInput').focus();return;}try{var previousIds=current().readings[state.liquid].map(function(r){return r.id;});state.sessions[state.mode]=L.addReading(current(),state.liquid,uncertain?null:v,{source:state.mode==='simulation'?'simulation':'measured',uncertain:uncertain});current().evidenceIds=current().evidenceIds.filter(function(id){return previousIds.indexOf(id)<0;});persist();strip();toast(uncertain?'已记录：还需要复测':names[state.liquid]+' '+v.toFixed(1)+' cm · 已记录');}catch(e){toast(e.message);}}
$('saveReading').addEventListener('click',function(){saveReading(false);});$('uncertainReading').addEventListener('click',function(){saveReading(true);});
$('scene').addEventListener('pointerdown',function(e){if(state.page!=='measure')return;var g=renderer.getGeometry(),rect=this.getBoundingClientRect();if(!g)return;var x=e.clientX-rect.left,y=e.clientY-rect.top;if(x<g.centerX-100||x>g.centerX+150||y<g.floatTopY-20)return;drag={top:g.floatTopY,scale:g.pxPerCm,rect:rect};try{this.setPointerCapture(e.pointerId);}catch(err){}setMarker((y-drag.top)/drag.scale);e.preventDefault();});
$('scene').addEventListener('pointermove',function(e){if(!drag)return;setMarker((e.clientY-drag.rect.top-drag.top)/drag.scale);e.preventDefault();});
function endDrag(){if(!drag)return;drag=null;if(state.mode==='measured'&&state.marker!==null)state.measuredPose=state.marker;redraw();}$('scene').addEventListener('pointerup',endDrag);$('scene').addEventListener('pointercancel',endDrag);
document.querySelectorAll('[data-align]').forEach(function(el){el.addEventListener('click',function(){state.align=el.dataset.align;document.querySelectorAll('[data-align]').forEach(function(b){var on=b.dataset.align===state.align;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});redraw();});});
$('explanation').addEventListener('input',function(){current().explanation=this.value.slice(0,800);persist();});
$('saveExplanation').addEventListener('click',function(){if(!current().evidenceIds.length){toast('先点选一条支持观点的记录');return;}if(!$('explanation').value.trim()){toast('再用一句话说明你们的发现');$('explanation').focus();return;}current().explanation=$('explanation').value.slice(0,800);current().updatedAt=new Date().toISOString();persist();toast('观点和证据已保存');});
$('backMeasure').addEventListener('click',function(){setPage('measure');});
function cargoChange(delta){state.cargo=Math.max(0,Math.min(72,state.cargo+delta));loadUI();persist();animateDraft(L.boatState(state.liquid,state.cargo).draftCm);}
function holdButton(el,delta){var delay=null,interval=null,suppress=false;function stop(){clearTimeout(delay);clearInterval(interval);delay=null;interval=null;}el.addEventListener('pointerdown',function(e){if(el.disabled)return;suppress=true;cargoChange(delta);try{el.setPointerCapture(e.pointerId);}catch(err){}delay=setTimeout(function(){interval=setInterval(function(){cargoChange(delta);if(state.cargo===0||state.cargo===72)stop();},120);},350);e.preventDefault();});el.addEventListener('pointerup',function(){stop();setTimeout(function(){suppress=false;},200);});el.addEventListener('pointercancel',stop);el.addEventListener('lostpointercapture',stop);el.addEventListener('click',function(e){if(!suppress&&e.detail===0)cargoChange(delta);});window.addEventListener('blur',stop);}
holdButton($('cargoMinus'),-1);holdButton($('cargoPlus'),1);
$('cargoRange').addEventListener('input',function(){state.cargo=Number(this.value);loadUI();persist();animateDraft(L.boatState(state.liquid,state.cargo).draftCm);});
$('saveLoad').addEventListener('click',function(){var b=L.boatState(state.liquid,state.cargo);if(!b.safe){toast('已超过安全线，减一些货物再检查');return;}var next=state.cargo<72?L.boatState(state.liquid,state.cargo+1):b;state.loadRecords[state.liquid]={count:state.cargo,at:new Date().toISOString(),verified:!next.safe,source:'simulation'};current().loadDecision={from:state.liquid,to:'fresh',cargoUnits:state.cargo,decision:'模型：在'+names[state.liquid]+'中记录'+state.cargo+'箱',reason:!next.safe?'再加一箱就超过本次安全线':'本次记录在安全线以内'};persist();strip();toast(next.safe?'已记录，还可以试着加一箱':'已记录，再加一箱就越线');});
$('groupNumber').value=state.group;$('groupNumber').addEventListener('change',function(){state.group=Math.max(1,Math.min(99,parseInt(this.value,10)||1));this.value=state.group;['measured','simulation'].forEach(function(m){state.sessions[m].group='第'+state.group+'组';});persist();});
$('fullscreenButton').addEventListener('click',function(){if(document.fullscreenElement){if(document.exitFullscreen)document.exitFullscreen();return;}var el=document.documentElement;var enter=el.requestFullscreen||el.webkitRequestFullscreen;if(enter){var q=enter.call(el);if(q&&q.catch)q.catch(function(){toast('可使用浏览器的全屏功能');});}else toast('将平板横放，或使用浏览器全屏');});
function showModal(id){lastFocus=document.activeElement;$(id).hidden=false;$(id).querySelector('.close-modal').focus();}
function closeModal(el){el.hidden=true;if(lastFocus&&lastFocus.focus)lastFocus.focus();}
document.querySelectorAll('.modal').forEach(function(modal){modal.querySelector('.close-modal').addEventListener('click',function(){closeModal(modal);});modal.addEventListener('click',function(e){if(e.target===modal)closeModal(modal);});modal.addEventListener('keydown',function(e){if(e.key==='Escape'){closeModal(modal);e.preventDefault();}if(e.key==='Tab'){var focusables=Array.from(modal.querySelectorAll('button:not([disabled]),a[href],input:not([hidden]),select,textarea')).filter(function(x){return x.offsetParent!==null;}),first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}}});});
var helps={observe:['选另一种液体，先猜一猜，再点“换水观察”。','船和货物保持不变。点“看吃水”放大水线。'],measure:['把橡皮泥固定在吸管下端，调到能直立、自由漂浮。','同一轮用同一支浮标：不碰底、不碰壁，等稳定再读。','实测：填写自己测得的露出长度。模型：拖动标线练习读数。'],compare:['“对齐水面”看露出长度；“对齐浮标”看三条标记的位置。','点击右侧记录选作证据，再写下你们的发现。','不同组的浮标可能不同，比较各组的高低关系，不比谁的数字大。'],load:['按住加减按钮，或拖动滑杆装卸货物。','水面不越过船身上的安全线，再记下装载量。','换液体时货物保持不变。安全线是本次模型的统一比较标准。']};
$('helpButton').addEventListener('click',function(){var c=$('helpContent');c.replaceChildren();helps[state.page].forEach(function(line){var p=document.createElement('p');p.textContent=line;c.appendChild(p);});showModal('helpModal');});
function noteTable(rows){var table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');['液体','露出高度','次数'].forEach(function(label){var th=document.createElement('th');th.textContent=label;tr.appendChild(th);});head.appendChild(tr);table.appendChild(head);var tbody=document.createElement('tbody');rows.forEach(function(row){var t=document.createElement('tr');row.forEach(function(cell){var td=document.createElement('td');td.textContent=cell;t.appendChild(td);});tbody.appendChild(t);});table.appendChild(tbody);return table;}
function fillNotes(){var host=$('notesContent');host.replaceChildren();$('notesTitle').textContent='第'+state.group+'组 · '+(state.mode==='simulation'?'模型记录':'实测记录');var rows=liquids.map(function(id){return[names[id],textValue(latest(id)),String(current().readings[id].length)];});host.appendChild(noteTable(rows));
  var s=current(),h=document.createElement('h3');h.textContent='我们的发现';var p=document.createElement('p');p.textContent=s.explanation||'还没有填写观点。';host.append(h,p);
  var h2=document.createElement('h3');h2.textContent='模型装载记录';host.appendChild(h2);var p2=document.createElement('p');p2.textContent=liquids.map(function(id){var r=state.loadRecords[id];return names[id]+'：'+(r?r.count+' 箱'+(r.verified?'（再加一箱会越线）':''):'—');}).join('　');host.appendChild(p2);
  if(state.observations.length){var h3=document.createElement('h3');h3.textContent='模型换水观察';host.appendChild(h3);var p3=document.createElement('p'),word={up:'上浮',same:'不变',down:'下沉'};p3.textContent=state.observations.map(function(q){return names[q.from]+' → '+names[q.to]+'：预测'+word[q.prediction]+'，模型显示'+word[q.result];}).join('；');host.appendChild(p3);}
  var all=[];liquids.forEach(function(id){current().readings[id].forEach(function(r,i){all.push(names[id]+' 第'+(i+1)+'次：'+textValue(r));});});if(all.length>3){var h4=document.createElement('h3');h4.textContent='保留的测量记录';var p4=document.createElement('p');p4.textContent=all.join('；');host.append(h4,p4);}
}
$('notesButton').addEventListener('click',function(){fillNotes();showModal('notesModal');});
function download(blob,name){var link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},30000);}
$('exportJson').addEventListener('click',function(){try{var packet=makeWorkbook(state);download(new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),'船的最大装载量_第'+state.group+'组_完整记录.json');toast('实测、模型和预测记录已导出');}catch(e){toast(e.message);}});
$('importJson').addEventListener('click',function(){$('importFile').click();});
$('importFile').addEventListener('change',function(){var f=this.files&&this.files[0];this.value='';if(!f)return;if(f.size>262144){toast('记录文件过大');return;}var reader=new FileReader();reader.onload=function(){try{var restored=readWorkbook(reader.result);state.sessions=restored.sessions;state.mode=restored.mode;state.group=restored.group;state.loadRecords=restored.loadRecords;state.observations=restored.observations;state.liquid=restored.liquid;state.observeLiquid=restored.observeLiquid;state.cargo=restored.cargo;state.prediction=null;$('groupNumber').value=state.group;persist();setPage(state.page);fillNotes();toast('记录已恢复');}catch(e){toast('导入失败：'+e.message);}};reader.onerror=function(){toast('无法读取该文件');};reader.readAsText(f);});
function wrapText(ctx,text,x,y,width,lineHeight,maxLines){var line='',n=0;Array.from(text).forEach(function(char){if(ctx.measureText(line+char).width>width&&line){if(n<maxLines)ctx.fillText(line,x,y+n*lineHeight);line=char;n++;}else line+=char;});if(line&&n<maxLines)ctx.fillText(line,x,y+n*lineHeight);return y+(Math.min(n+1,maxLines))*lineHeight;}
$('exportImage').addEventListener('click',function(){var c=document.createElement('canvas');c.width=1400;c.height=1200;var g=c.getContext('2d');g.fillStyle='#f1f9fc';g.fillRect(0,0,1400,1200);g.fillStyle='#102c4c';g.font='700 48px sans-serif';g.fillText('船的最大装载量',70,95);g.font='27px sans-serif';g.fillStyle='#58788c';g.fillText('五下 4.5  ·  第'+state.group+'组  ·  '+(state.mode==='simulation'?'模型练习记录':'小组实测记录'),70,148);g.fillText(new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}),70,190);
 g.fillStyle='#fff';g.fillRect(60,235,1280,270);g.fillStyle='#0b8792';g.font='700 30px sans-serif';g.fillText('浮标露出高度',90,286);liquids.forEach(function(id,i){var x=100+i*425;g.fillStyle='#264962';g.font='30px sans-serif';g.fillText(names[id],x,365);g.fillStyle='#007d87';g.font='700 45px sans-serif';g.fillText(textValue(latest(id)),x,438);});
 g.fillStyle='#102c4c';g.font='700 31px sans-serif';g.fillText('我们的发现',70,565);g.font='28px sans-serif';g.fillStyle='#375a71';var y=wrapText(g,current().explanation||'尚未填写',70,617,1250,42,5);
 y=Math.max(850,y+35);g.fillStyle='#102c4c';g.font='700 31px sans-serif';g.fillText('模型装载 · 同一条安全线',70,y);g.font='27px sans-serif';g.fillStyle='#375a71';liquids.forEach(function(id,i){var r=state.loadRecords[id];g.fillText(names[id]+'：'+(r?r.count+' 箱':'—'),70+i*430,y+65);});
 g.font='23px sans-serif';g.fillStyle='#7892a2';g.fillText('实测由小组填写；换水与装载为课堂模型。',70,1090);g.fillText('镇海区鲲池小学 王宁 · mutiw    v1.0',70,1140);c.toBlob(function(blob){if(blob){download(blob,'船的最大装载量_第'+state.group+'组_证据卡.png');toast('证据卡已保存');}else toast('暂时无法生成图片，请导出记录');},'image/png');});
window.addEventListener('hashchange',function(){var hash=location.hash.slice(1);if(['observe','measure','compare','load'].indexOf(hash)>=0&&hash!==state.page)setPage(hash,false);});
window.addEventListener('resize',function(){requestAnimationFrame(redraw);});
document.addEventListener('visibilitychange',function(){if(document.hidden)persist();else redraw();});
setPage(location.hash.slice(1)||'observe',false);
})();
