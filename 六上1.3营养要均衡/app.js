'use strict';const $=s=>document.querySelector(s);const dishes=[['白粥',['大米']],['米饭',['大米']],['蒸蛋',['鸡蛋']],['番茄炒蛋',['番茄','鸡蛋']],['牛奶',['牛奶']],['蔬菜豆腐汤',['青菜','豆腐']],['苹果',['苹果']],['清蒸鱼',['鱼']],['玉米红薯',['玉米','红薯']],['胡萝卜鸡肉',['胡萝卜','鸡肉']]];const groups={'大米':'谷薯','玉米':'谷薯','红薯':'谷薯','番茄':'蔬菜','青菜':'蔬菜','胡萝卜':'蔬菜','苹果':'水果','鸡蛋':'鱼肉蛋','鱼':'鱼肉蛋','鸡肉':'鱼肉蛋','牛奶':'奶与豆制品','豆腐':'奶与豆制品'};let meals=[[],[],[]],before=null,after=null;const mealNames=['早餐','午餐','晚餐'];document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('section').forEach(s=>s.hidden=s.id!==b.dataset.tab);document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',x===b));});
function summary(m){let ing=[...new Set(m.flatMap(ids=>ids.flatMap(i=>dishes[i][1])))];return{ing,gs:[...new Set(ing.map(x=>groups[x]))]};}
function draw(){
 let k=Number($('#meal').value);
 $('#dishes').innerHTML=dishes.map((d,i)=>`<button data-dish="${i}" aria-pressed="${meals[k].includes(i)}">${d[0]}</button>`).join('');
 document.querySelectorAll('[data-dish]').forEach(b=>b.onclick=()=>{let i=Number(b.dataset.dish);meals[k]=meals[k].includes(i)?meals[k].filter(x=>x!==i):[...meals[k],i];$('#dishDetail').textContent=dishes[i][0]+' → '+dishes[i][1].join('、')+'。仅列主要食材，配方、份量和烹调用油盐另需核查。';draw();});
 $('#day').innerHTML=meals.map((m,i)=>`<p><strong>${mealNames[i]}：</strong>${m.length?m.map(j=>dishes[j][0]).join('、'):'未安排'}</p>`).join('');
 let s=summary(meals);$('#ingredients').innerHTML=s.ing.map(n=>`<span class="tag">${n}</span> `).join('')||'尚无食材。';$('#count').textContent=`主要食材去重后 ${s.ing.length} 种。这是食材计数，不是营养或健康分数。`;
 $('#groups').innerHTML=['谷薯','蔬菜','水果','鱼肉蛋','奶与豆制品'].map(g=>`<p>${g}：${s.ing.filter(x=>groups[x]===g).join('、')||'这份主要食材表未出现'}</p>`).join('');
}
$('#meal').onchange=draw;
$('#reset').onclick=()=>{meals=[[],[],[]];$('#dishDetail').textContent='三餐已清空；已保存的对照不受影响。';draw();};
function snapshot(){return meals.map(x=>[...x]);}
function displayCompare(){let html='';[['原方案',before],['改进方案',after]].forEach(([name,m])=>{if(!m){html+=`<h3>${name}：未保存</h3>`;return;}let s=summary(m);html+=`<h3>${name}</h3>`+m.map((ids,i)=>`<p>${mealNames[i]}：${ids.map(j=>dishes[j][0]).join('、')||'未安排'}</p>`).join('')+`<p>主要食材${s.ing.length}种；出现类别：${s.gs.join('、')||'无'}。</p>`;});$('#comparison').innerHTML=html;}
$('#saveBefore').onclick=()=>{before=snapshot();displayCompare();};
$('#saveAfter').onclick=()=>{after=snapshot();displayCompare();};
$('#clearCompare').onclick=()=>{before=null;after=null;$('#comparison').textContent='方案对照已清空。';$('#reviewResult').textContent='';};
$('#review').onclick=()=>{if(!before||!after){$('#reviewResult').textContent='请分别保存原方案和改进方案，才能检查改变。';return;}let a=summary(before),b=summary(after),added=b.ing.filter(x=>!a.ing.includes(x)),removed=a.ing.filter(x=>!b.ing.includes(x));$('#reviewResult').textContent=`新增主要食材：${added.join('、')||'无'}；移除：${removed.join('、')||'无'}。${$('#note').value.trim()?'已填写理由。':'请补充修改理由或仍缺的信息。'}即使类别更全，也不能据此判断份量适宜或营养达标。`;};
const claims=[['菜名越多，食材种类就一定越多。','不一定。米饭和白粥都含大米，蒸蛋和番茄炒蛋都含鸡蛋，要拆分并去重再比较。'],['把这五类都选上，就证明一天营养完全足够。','不能。这里未记录真实份量、配比、油盐、饮水或个体需要，类别覆盖只提供一个观察角度。'],['为了均衡，可以只多吃某一种“特别有营养”的食物。','不能靠单一食物替代多样饮食。不同食物提供不同组合的营养，也要考虑适宜份量，不能把“更多”直接当作“更好”。']];
$('#claims').innerHTML=claims.map((c,i)=>`<button data-claim="${i}">${c[0]}</button>`).join('');
document.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>{$('#claimResult').textContent=claims[Number(b.dataset.claim)][1];});
$('#export').onclick=()=>{let rows=[['版本','餐次','菜肴','主要食材']];[['原方案',before],['改进方案',after]].forEach(([n,m])=>{if(!m){rows.push([n,'未保存','','']);return;}m.forEach((ids,i)=>rows.push([n,mealNames[i],ids.map(j=>dishes[j][0]).join('、'),[...new Set(ids.flatMap(j=>dishes[j][1]))].join('、')]));});rows.push(['修改理由',$('#note').value,'','']);let csv='\uFEFF'+rows.map(r=>r.map(x=>'"'+x.replace(/"/g,'""')+'"').join(',')).join('\r\n'),u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='营养均衡-虚构方案.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
draw();
