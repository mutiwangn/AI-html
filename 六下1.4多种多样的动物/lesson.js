"use strict";
const $=id=>document.getElementById(id);let mode='insect',marked=new Set(),inspect=false;
function render(){const insect=mode==='insect',pairs=insect?3:4;let legs='',buttons='';for(let i=0;i<pairs;i++)for(let side=0;side<2;side++){const id=i*2+side,s=side===0?-1:1,y=insect?190+i*25:160+i*30;const tipY=95+i*(insect?115:85),x=300+s*190;const on=marked.has(id);legs+=`<path id="leg${id}" d="M${300+s*30} ${y} L${300+s*120} ${tipY+25} L${x} ${tipY}" fill="none" stroke="${on?'#dd792e':'#466e68'}" stroke-width="${on?10:7}" stroke-linecap="round"/><text x="${x+(s<0?-30:15)}" y="${tipY+6}" font-size="19" fill="#335c55">${side===0?'左':'右'}${i+1}</text>`;buttons+=`<button id="mark${id}" aria-pressed="${on}">${side===0?'左':'右'} ${i+1} 足${on?' ✓':''}</button>`;}
$('legs').innerHTML=legs;$('legButtons').innerHTML=buttons;
$('body').innerHTML=insect?'<ellipse cx="300" cy="340" rx="65" ry="85" fill="#d6bd7c" stroke="#5d6655" stroke-width="3"/><ellipse cx="300" cy="220" rx="45" ry="60" fill="#89bfa0" stroke="#5d6655" stroke-width="3"/><circle cx="300" cy="120" r="40" fill="#c7dcab" stroke="#5d6655" stroke-width="3"/>':'<ellipse cx="300" cy="345" rx="80" ry="80" fill="#d6bd7c" stroke="#5d6655" stroke-width="3"/><ellipse cx="300" cy="200" rx="60" ry="80" fill="#89bfa0" stroke="#5d6655" stroke-width="3"/>';
$('front').innerHTML=`<path d="${insect?'M280 90 Q260 55 230 40 M320 90 Q340 55 370 40':'M280 133 L267 110 L260 90 M320 133 L333 110 L340 90'}" fill="none" stroke="${inspect?'#a4499e':'#796e93'}" stroke-width="${inspect?9:5}" stroke-linecap="round"/>`;
$('labels').innerHTML=insect?'<text x="285" y="127" font-size="22">头</text><text x="285" y="227" font-size="22">胸</text><text x="285" y="347" font-size="22">腹</text>':'<text x="267" y="207" font-size="21">头胸部</text><text x="279" y="352" font-size="21">腹部</text>';$('labels').setAttribute('visibility',$('showLabels').checked?'visible':'hidden');
$('heading').textContent=insect?'典型成虫示意':'蜘蛛示意';$('detail').textContent=insect?'从足的连接处看：三对足都接在胸部，不接在腹部。此图不是某种昆虫的等比例画像。':'从足的连接处看：四对步足都接在头胸部。前端短小的紫色附属结构是触肢，不是触角。';
$('counter').textContent=`已标记 ${marked.size} / ${pairs*2} 条步足`+(marked.size===pairs*2?'，左右成对，观察完整。':'。逐一核对，避免漏数或重数。');
$('insect').setAttribute('aria-pressed',String(insect));$('spider').setAttribute('aria-pressed',String(!insect));
for(let id=0;id<pairs*2;id++)$('mark'+id).onclick=()=>{marked.has(id)?marked.delete(id):marked.add(id);render();};}
function select(m){mode=m;marked.clear();inspect=false;$('feedback').textContent='已切换示例，步足标记清空。请重新观察。';render();}
$('insect').onclick=()=>select('insect');$('spider').onclick=()=>select('spider');$('showLabels').onchange=render;
$('frontInspect').onclick=()=>{inspect=!inspect;$('feedback').textContent=inspect?(mode==='insect'?'高亮的是头上的一对触角，不是足。把触角加进足数会数错。':'高亮的是一对触肢，不是触角，也不计入八条步足。蜘蛛并没有十条步足。'):'已取消前端高亮，步足标记保持不变。';render();};
$('clear').onclick=()=>{marked.clear();render();};$('reset').onclick=()=>{$('showLabels').checked=true;select('insect');};render();
