"use strict";
const $=id=>document.getElementById(id);let counts=[1,1,1,1], selected=0;
const ys=[105,205,305,405];
$('nodeButtons').innerHTML=ys.map((y,i)=>`<button id="node${i}">第 ${i+1} 节</button>`).join('');
function render(){
let leaves='',nodes='';counts.forEach((n,i)=>{const y=ys[i];const sides=n===1?[i%2===0?-1:1]:[-1,1];sides.forEach(s=>{const end=300+s*155;leaves+=`<path d="M300 ${y} Q${300+s*50} ${y-5} ${300+s*65} ${y-20}" fill="none" stroke="#42754d" stroke-width="4"/><path d="M${300+s*65} ${y-20} Q${300+s*100} ${y-85} ${end} ${y-60} Q${300+s*125} ${y-5} ${300+s*65} ${y-20}" fill="#83b66c" stroke="#346c48" stroke-width="2"/><path d="M${300+s*65} ${y-20}L${end} ${y-60}" stroke="#457448" stroke-width="2"/>`;});if(n===3)leaves+=`<path d="M300 ${y}L345 ${y-52}" stroke="#42754d" stroke-width="4"/><path d="M345 ${y-52}Q325 ${y-85} 370 ${y-95}Q385 ${y-65} 345 ${y-52}" fill="#c6dc8c" stroke="#346c48" stroke-width="2"/>`;nodes+=`<circle cx="300" cy="${y}" r="${selected===i?12:8}" fill="${selected===i?'#d57a32':'#e4bc62'}"/><text x="480" y="${y}" font-size="20" fill="#315741">第 ${i+1} 节 · ${n} 叶</text>`;$('node'+i).setAttribute('aria-pressed',String(selected===i));});
$('leaves').innerHTML=leaves;$('nodes').innerHTML=nodes;$('nodes').setAttribute('visibility',$('showNodes').checked?'visible':'hidden');
$('detail').textContent=`当前选择第 ${selected+1} 节：${counts[selected]} 片叶连接在这个节上。沿茎向上、向下比较其他节，不把相邻节的叶算到同一节。`;
for(let n=1;n<=3;n++)$('count'+n).setAttribute('aria-pressed',String(counts[selected]===n));}
function changed(){ $('feedback').textContent='图形已改变，请重新观察每个节后核对。';render();}
for(let i=0;i<4;i++)$('node'+i).onclick=()=>{selected=i;render();};
for(let n=1;n<=3;n++)$('count'+n).onclick=()=>{counts[selected]=n;changed();};
function preset(n){counts=[n,n,n,n];selected=0;changed();}
$('alternate').onclick=()=>preset(1);$('opposite').onclick=()=>preset(2);$('whorled').onclick=()=>preset(3);
$('showNodes').onchange=render;
$('check').onclick=()=>{const n=counts[0],same=counts.every(v=>v===n);$('feedback').textContent=same?(['','四个节都是一叶，且图中左右交替：这是本页的互生示例。','四个节都是两叶，图中同节两叶相对：这是对生示例。','四个节都是三叶：这是轮生示例。真实轮生也可以每节多于三叶。'][n]):'四个节的叶数不同。这是自由组合的假想示意，不能套用本页单一排列示例，也不能由此确定物种。';};
$('reset').onclick=()=>{counts=[1,1,1,1];selected=0;$('showNodes').checked=true;$('feedback').textContent='先观察每个节上的叶数，再核对。';render();};render();
