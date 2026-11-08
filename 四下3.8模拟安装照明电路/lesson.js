"use strict";
const $=id=>document.getElementById(id), names=['都不亮','只亮 A','只亮 B','两盏都亮'],paths=['M90 130H190','M250 130H363','M417 130H510','M90 230H190','M250 230H363','M417 230H510'];
let installed=Array(6).fill(false),target=0,passed=new Set();
$('wiring').innerHTML=paths.map((d,i)=>`<path id="wire${i}" d="${d}"/>`).join('');$('wires').innerHTML=paths.map((_,i)=>`<button id="install${i}">安装导线 ${i+1}</button>`).join('');
function state(){return [0,1].map(i=>$('power').checked&&$('s'+(i+1)).checked&&installed.slice(i*3,i*3+3).every(Boolean));}
function draw(){let power=$('power').checked,[a,b]=state();for(let i=0;i<6;i++){$('wire'+i).setAttribute('stroke-dasharray',installed[i]?'none':'7 7');$('wire'+i).setAttribute('stroke',installed[i]?'#296d52':'#b8c7bd');$('install'+i).disabled=power;$('install'+i).textContent=(installed[i]?'拆除':'安装')+'导线 '+(i+1);$('install'+i).setAttribute('aria-pressed',installed[i]);}
$('battery').setAttribute('d',power?'M280 328V372 M310 338V362':'');$('batteryLabel').textContent=power?'已装入匹配的低压电池':'电池已取出，电源处断开';$('switchA').setAttribute('d',$('s1').checked?'M190 130H250':'M190 130L242 105');$('switchB').setAttribute('d',$('s2').checked?'M190 230H250':'M190 230L242 205');$('lampA').setAttribute('fill',a?'#ffe077':'#e8ebe7');$('lampB').setAttribute('fill',b?'#ffe077':'#e8ebe7');$('status').textContent=`灯 A ${a?'亮':'不亮'}，灯 B ${b?'亮':'不亮'}。`;
$('guide').textContent=`已装 ${installed.filter(Boolean).length}/6 段。`+(power?'模拟通电中：接线与拆除已锁定，改线前先取出电池。':'电池已取出，可以接线或拆除。');$('reset').disabled=power;
$('task').textContent='当前需求：'+names[target];for(let i=0;i<4;i++)$('target'+i).setAttribute('aria-pressed',i===target);
$('records').textContent='本次接线已通过：'+(passed.size?[...passed].sort().map(i=>names[i]).join('、'):'暂无')+(passed.size===4?'。四项全部通过；真实作品仍需教师验收。':'。需六段齐全、装入电池并逐项检验。');}
for(let i=0;i<6;i++)$('install'+i).onclick=()=>{if($('power').checked)return;installed[i]=!installed[i];passed.clear();$('feedback').textContent='接线改变，验收记录已清空。';draw();};
for(let id of ['power','s1','s2'])$(id).onchange=()=>{$('feedback').textContent='状态已改变，请检验。';draw();};
for(let i=0;i<4;i++)$('target'+i).onclick=()=>{target=i;$('feedback').textContent='操作开关达到需求，再检验。';draw();};
$('check').onclick=()=>{let[a,b]=state(),actual=Number(a)+2*Number(b);if(!installed.every(Boolean)||!$('power').checked)$('feedback').textContent='尚不能验收：先装齐六段导线并装入电池。灯不亮也可能是接线未完成。';else if(actual===target){passed.add(target);$('feedback').textContent='达到需求：'+names[target]+'。';}else $('feedback').textContent='尚未达到：当前是“'+names[actual]+'”。检查开关状态。';draw();};
$('reset').onclick=()=>{if($('power').checked)return;installed.fill(false);passed.clear();target=0;$('s1').checked=false;$('s2').checked=false;$('feedback').textContent='导线已拆除，记录已清空。';draw();};draw();
