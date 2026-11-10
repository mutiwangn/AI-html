'use strict';const $=s=>document.querySelector(s);let design={tip:'magnet',mouth:'iron',joint:'secure',length:'short'},rev=1,trials=['未试','未试'],safe=[false,false,false],trialChecks=[null,null],trialIncidents=[false,false],history=[],fix='',order=[];const labels={magnet:'磁铁',wood:'木块',iron:'铁回形针',plastic:'塑料片',secure:'教师检查胶带固定',loose:'松放',short:'较短绳',long:'稍长绳'},opts=['未试','提起并移到旁边','没吸起','提起后掉落','连接松开','看不清'];const safetyLabels=['纸鱼和铁片连接牢固','磁铁、短绳和钓竿连接牢固','教师已检查安全，可以试'];const steps=['选择材料，讲清理由','制作纸鱼，固定铁回形针','把磁铁、短绳和短杆固定好','请教师检查，再试钓'];
function desc(){return Object.values(design).map(v=>labels[v]).join(' / ');}
function trialRecords(){return trials.map((observation,i)=>({observation,checksAtFirstRecord:trialChecks[i]?[...trialChecks[i]]:null,connectionCameLoose:trialIncidents[i]}));}
function resetTrials(){trials=['未试','未试'];trialChecks=[null,null];trialIncidents=[false,false];}
function archive(reason){
  if(trialChecks.some(Boolean))history.push({version:rev,design:desc(),checksAtArchive:[...safe],observations:[...trials],trialRecords:trialRecords(),reason});
  resetTrials();safe=[false,false,false];rev++;renderTrials();renderSafe();
}
function draw(){let yy=design.length==='short'?140:195;$('#scene').innerHTML=`<path d="M100 60H410" stroke="#a77b4a" stroke-width="18" stroke-linecap="round"/><path d="M380 60V${yy}" stroke="#667984" stroke-width="3"/><rect x="350" y="${yy}" width="60" height="35" rx="4" fill="${design.tip==='magnet'?'#ba5d52':'#b18a61'}"/><text x="380" y="${yy+25}" text-anchor="middle" font-size="20" fill="white">${labels[design.tip]}</text><ellipse cx="280" cy="285" rx="100" ry="42" fill="#76b5ac"/><path d="M180 285l-55-35v70z" fill="#76b5ac"/><circle cx="335" cy="275" r="6" fill="#244c44"/><path d="M370 278v16" stroke="${design.mouth==='iron'?'#526572':'#dfbe5e'}" stroke-width="10"/><text x="450" y="320" text-anchor="middle" font-size="23">${labels[design.mouth]}</text>`;$('#designNote').textContent='第 '+rev+' 版：'+desc();Object.keys(design).forEach(k=>document.querySelectorAll('[data-'+k+']').forEach(b=>b.setAttribute('aria-pressed',b.dataset[k]===design[k])));$('#feedback').textContent='';}
Object.keys(design).forEach(k=>document.querySelectorAll('[data-'+k+']').forEach(b=>b.onclick=()=>{if(design[k]===b.dataset[k])return;archive('修改设计前');design[k]=b.dataset[k];draw();renderTrials();}));$('#check').onclick=()=>$('#feedback').textContent=design.joint==='loose'?'先解决连接：松放的磁铁或铁片容易掉落，不能直接试。请教师协助固定。':design.tip!=='magnet'||design.mouth!=='iron'?'想一想哪里产生磁力、哪里能被吸引。这里的木块或塑料片不能替代磁铁与铁回形针的组合。':'材料有科学依据，连接计划也更安全。但能否钓起、移动并放下，还要制作后真实试验。';
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!==b.dataset.page);document.querySelectorAll('[data-page]').forEach(t=>t.setAttribute('aria-pressed',t===b));});function renderSteps(){ $('#steps').innerHTML=steps.map((s,i)=>`<button data-step="${i}" ${order.includes(i)?'disabled':''}>${s}</button>`).join('');document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{let i=+b.dataset.step;if((i===0&&order.length!==0)||(i===1&&!order.includes(0))||(i===2&&!order.includes(0))||(i===3&&order.length!==3)){$('#sequence').textContent='先完成前面的准备。想想：材料还没选好，能直接试吗？';return;}order.push(i);renderSteps();});$('#sequence').textContent=order.length?'已排：'+order.map(i=>steps[i]).join(' → ')+(order.length===4?'。接下来实际制作，不是点完就做好了。':''):'从选材料开始。';}$('#redo').onclick=()=>{order=[];renderSteps();};function renderSafe(){document.querySelectorAll('[data-safe]').forEach(b=>{let i=+b.dataset.safe;b.setAttribute('aria-pressed',safe[i]);b.textContent=b.textContent.replace(/^[□✓]/,safe[i]?'✓':'□');});$('#safeNote').textContent=safe.every(Boolean)?'已记录教师检查完成；试验中发现松动就停下来。':'还有检查未完成，先不要实际试钓。';}document.querySelectorAll('[data-safe]').forEach(b=>b.onclick=()=>{let i=+b.dataset.safe;safe[i]=!safe[i];renderSafe();renderTrials();});
function recordObservation(i,value){
  if(trials[i]===value)return;
  // A later correction or safety tick must never rewrite the original check snapshot.
  if(value!=='未试'&&!trialChecks[i])trialChecks[i]=[...safe];
  trials[i]=value;
  if(value==='连接松开'){
    trialIncidents[i]=true;
    safe[2]=false;
    renderSafe();
  }
  renderTrials();
}
function trialEvidence(i){
  if(!trialChecks[i])return '还没有观察记录；首次记录时会一起保存当时的检查状态。';
  const checks=safetyLabels.map((label,j)=>(trialChecks[i][j]?'已确认：':'未确认：')+label).join('；');
  return '首次记录时的检查：'+checks+'。'+
    (trialChecks[i].every(Boolean)?'':'当时检查未齐，本次不计作通过验收；之后补勾不会改变本次记录。')+
    (trialIncidents[i]?'本次曾记录连接松开，不能通过修改现象或补勾恢复验收。':'');
}
function renderTrials(){
  $('#trials').innerHTML=trials.map((v,i)=>`<div class="recordbox"><h3>第 ${rev} 版 · 第 ${i+1} 次</h3><div class="row">${opts.map(o=>`<button data-trial="${i}" data-v="${o}" aria-pressed="${v===o}">${o}</button>`).join('')}</div><p class="muted">${trialEvidence(i)}</p></div>`).join('');
  document.querySelectorAll('[data-trial]').forEach(b=>b.onclick=()=>recordObservation(+b.dataset.trial,b.dataset.v));
  $('#result').textContent=design.joint==='loose'?'设计仍是松放连接，先修正并固定，不要实际试钓。':
    !safe.every(Boolean)?'安全检查未完成或已失效。先停下，请教师检查；已有观察保留，不计作通过验收。':
    trialChecks.some((checks,i)=>checks&&(!checks.every(Boolean)||trialIncidents[i]))?'已有观察首次记录时检查未齐，或曾出现连接松开，不计作通过验收。补勾检查不追溯旧记录；请保存这一轮，实际改进并重新检查后再试。':
    trials.includes('未试')?'还有未试的次数，先完成两次观察。':
    trials.every(v=>v==='提起并移到旁边')?'这两次完成了提起和移动。完整目标还要确认能方便地放下、连接可靠；不能据两次试验保证永远成功。':
    '记录出现不同现象或未完成目标。根据实际问题改一个地方，再试，不改写原记录。';
  $('#beforeNote').textContent=history.length?'已保留旧轮次：'+history.map(h=>`第${h.version}版（${h.design}）：`+h.trialRecords.map((t,i)=>`第${i+1}次 ${t.observation}［首次记录时检查${t.checksAtFirstRecord?(t.checksAtFirstRecord.every(Boolean)?'齐全':'未齐'):'未记录'}${t.connectionCameLoose?'；曾连接松开':''}］`).join('；')).join('；'):'还没有保存的旧轮次。';
}
document.querySelectorAll('[data-fix]').forEach(b=>b.onclick=()=>{fix=b.dataset.fix;$('#fixNote').textContent='准备改进：'+fix+'。请实际操作，再开始新一轮。';});$('#saveBefore').onclick=()=>{if(!fix){$('#fixNote').textContent='先按观察选择一个改进。';return;}archive('改进：'+fix);draw();$('#fixNote').textContent='上一轮已保留。实际完成“'+fix+'”后重新进行安全检查，再试。';fix='';};$('#clear').onclick=()=>{resetTrials();history=[];safe=[false,false,false];renderSafe();renderTrials();};$('#export').onclick=()=>{const data={格式版本:2,说明:'真实观察，不是模拟；教师检查由使用者确认。每次首次记录时独立保存检查状态，后补勾不追溯。当前检查清单和归档时检查不代表先前各次试验的状态。',检查项目:safetyLabels,当前:{版本:rev,设计:desc(),当前检查清单:[...safe],观察:[...trials],逐次试验:trialRecords()},历史:history};let u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='钓鱼玩具设计与试验.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};draw();renderSteps();renderSafe();renderTrials();

