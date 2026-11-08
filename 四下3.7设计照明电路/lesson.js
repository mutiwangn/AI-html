"use strict";
const $=id=>document.getElementById(id), names=['都不亮','只亮 A','只亮 B','两盏都亮'];
let separate=false,target=0,passed=new Set();
function state(){let a=$('s1').checked,b=separate?$('s2').checked:a;return [a,b];}
function draw(){let [a,b]=state(),s=$('s1').checked,t=$('s2').checked;
$('common').setAttribute('aria-pressed',!separate);$('separate').setAttribute('aria-pressed',separate);
$('s2').disabled=!separate;$('name1').textContent=separate?'闭合 A 支路开关':'闭合公共开关';$('name2').textContent=separate?'闭合 B 支路开关':'方案 A 无第二个开关';
$('switchA').setAttribute('d',!separate||s?'M190 130H250':'M190 130L242 105');$('switchB').setAttribute('d',!separate||t?'M190 230H250':'M190 230L242 205');$('switchC').setAttribute('d',separate||s?'M90 280V320':'M90 280L65 315');
$('labelA').textContent=separate?'开关 A':'';$('labelB').textContent=separate?'开关 B':'';$('labelC').textContent=separate?'':'公共';
$('lampA').setAttribute('fill',a?'#ffe077':'#e8ebe7');$('lampB').setAttribute('fill',b?'#ffe077':'#e8ebe7');
$('status').textContent=`当前：灯 A ${a?'亮':'不亮'}，灯 B ${b?'亮':'不亮'}。`;
$('task').textContent='当前需求：'+names[target];for(let i=0;i<4;i++)$('target'+i).setAttribute('aria-pressed',i===target);
$('records').textContent='本方案已通过：'+(passed.size?[...passed].sort().map(i=>names[i]).join('、'):'暂无')+(passed.size===4?'。四项需求均达到：可以分别控制两灯。':'。需实际达到并逐项检验。');}
function reset(){passed.clear();target=0;$('s1').checked=false;$('s2').checked=false;$('feedback').textContent='开关已断开，记录已清空。';draw();}
$('common').onclick=()=>{separate=false;reset();};$('separate').onclick=()=>{separate=true;reset();};$('reset').onclick=reset;
for(let i=0;i<4;i++)$('target'+i).onclick=()=>{target=i;$('feedback').textContent='请操作开关，再检验当前需求。';draw();};
for(let id of ['s1','s2'])$(id).onchange=()=>{$('feedback').textContent='开关状态已改变，请重新检验。';draw();};
$('check').onclick=()=>{let[a,b]=state(),actual=Number(a)+2*Number(b);if(actual===target){passed.add(target);$('feedback').textContent='达到需求：'+names[target]+'。记录已保存。';}else $('feedback').textContent='尚未达到：当前是“'+names[actual]+'”。'+(!separate&&(target===1||target===2)?'公共开关同时接通或断开两条支路，不能让一盏单独亮。试试改进开关位置。':'再调整开关，沿导线检查回路。');draw();};draw();
