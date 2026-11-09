'use strict';
const $=id=>document.getElementById(id);
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!==b.dataset.tab);document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',x===b));});
document.querySelectorAll('[data-guess]').forEach(b=>b.onclick=()=>{$('guessResult').textContent=b.dataset.guess==='unknown'?'合理：线索不足，先保留多种解释，尊重角色的表达。':'这个判断太确定了。类似表情也可能出现在担心、疲倦或认真思考时。';$('reveal').disabled=false;});
$('reveal').onclick=()=>{$('story').textContent='虚构角色说：“刚才我的作品没有成功，我有点失望，也担心下一次做不好。我想先安静一下。”这补充了他的表达，不代表所有相同表情的人都有同样感受。';};
$('resetClue').onclick=()=>{$('guessResult').textContent='先选择你的判断。';$('story').textContent='尚未查看。';$('reveal').disabled=true;};
const actions=[['推搡对方或摔东西','可能伤人或损坏物品，还会让冲突升级。可以有生气的感受，但不能用伤害来处理。先保持安全距离，必要时找成人帮助。'],['停一停，尝试舒适的慢呼吸','有时能帮助身体慢慢平静一些，但不保证马上有效。不强行深呼吸或憋气；不适就停止，也可换安静活动。随后仍需沟通或求助。'],['说清感受，询问经过','可以说“我很失望，想知道刚才发生了什么”。先核实事实，避免直接断定对方故意。平静不等于放弃合理需要。'],['暂时转移注意，再回到问题','短暂散步、画画或安静休息可能有帮助。暂时离开不等于永远逃避，之后可商量修复作品；危险情境先求助。'],['找可信任成人帮助','当自己难以处理、冲突继续或有安全风险时，求助是合理选择。无需独自忍耐，也不要把帮助当成告状或失败。']];
actions.forEach(([name,text],i)=>{const b=document.createElement('button');b.textContent=name;b.id='action'+i;b.onclick=()=>{$('outcome').textContent=text;};$('actions').append(b);});
$('context').onclick=()=>{$('newInfo').textContent='同伴说：“我后退时没看到模型，不是故意的。我愿意一起修。”这是新的表达，还可结合现场情况了解。角色仍可能失望，但不必继续把“故意破坏”当成已确定事实。';};
function review(){const ids=['first','method','talk'];if(ids.some(id=>!$(id).value))return '请先完成三个步骤。';if($('first').value==='hit')return '先修改安全步骤：推搡会伤人。感受可以表达，伤害行为需要停止。';if($('method').value==='hide')return '不必要求永远隐藏感受。可以选择暂时安静，也应保留表达和求助的空间。';if($('talk').value==='label')return '把对人的标签换成具体事件、自己的感受与合理请求。尚未核实的信息不要当作事实。';return '这是一份可尝试的方案：保证安全、选择适合的方法、表达需要。之后再观察是否有帮助；没有立即好转也可调整或求助，不做情绪成绩评分。';}
$('review').onclick=()=>{$('planResult').textContent=review();};
['first','method','talk'].forEach(id=>$(id).onchange=()=>{$('planResult').textContent='方案已变更，请重新检查。';$('saveResult').textContent='';});
$('clear').onclick=()=>{['first','method','talk'].forEach(id=>$(id).value='');$('planResult').textContent='尚未检查。';$('saveResult').textContent='';};
$('export').onclick=()=>{if(['first','method','talk'].some(id=>!$(id).value)){$('saveResult').textContent='请先选择完整方案，再导出。';return;}const lines=['虚构角色讨论方案（不是个人情绪记录）',...['first','method','talk'].map(id=>$(id).selectedOptions[0].textContent),'讨论反馈：'+review(),'课堂辅助探究稿；教材教参细节待核。'];const u=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='虚构角色应对方案.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);$('saveResult').textContent='已生成预设虚构方案文件，无个人资料。';};
