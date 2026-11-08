"use strict";
const $=id=>document.getElementById(id),center=[400,220],earth=[70,220],radius=65;let far=true;
function clear(a,b){let dx=b[0]-a[0],dy=b[1]-a[1],t=((center[0]-a[0])*dx+(center[1]-a[1])*dy)/(dx*dx+dy*dy);t=Math.max(0,Math.min(1,t));return Math.hypot(a[0]+t*dx-center[0],a[1]+t*dy-center[1])>=radius-1e-7;}
function segment(id,a,b,ok,direct=false){$(id).setAttribute('d',`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`);$(id).setAttribute('stroke',direct?'#8b9590':ok?'#287651':'#ba574b');$(id).setAttribute('stroke-dasharray',direct?'2 8':ok?'none':'9 7');}
function draw(){let deg=Number($('angle').value),a=deg*Math.PI/180,r=[400+160*Math.cos(a),220-160*Math.sin(a)],p=[400+(far?65:-65),220],d=clear(earth,p),e=clear(earth,r),q=clear(r,p);segment('direct',earth,p,d,true);segment('earthRelay',earth,r,e);segment('relayProbe',r,p,q);
$('probe').setAttribute('cx',p[0]);$('probeText').setAttribute('x',p[0]);$('probeText').textContent=far?'背面点':'正面点';$('relay').setAttribute('x',r[0]-8);$('relay').setAttribute('y',r[1]-8);$('relayText').setAttribute('x',r[0]);$('relayText').setAttribute('y',r[1]-18);$('angleValue').textContent=deg+'°（示意角度）';$('far').setAttribute('aria-pressed',far);$('near').setAttribute('aria-pressed',!far);
$('links').textContent=`直连比较：${d?'未被月球遮挡':'被月球遮挡'}。地球端→中继：${e?'未遮挡':'被遮挡'}；中继→探测点：${q?'未遮挡':'被遮挡'}。`;
$('feedback').textContent=e&&q?'两段中继路径都未被遮挡，满足本模型的视线条件。真实通信还要满足设备、轨道等条件。':'当前中继路径尚不满足：'+(!e?'地球端与中继之间被月球挡住。':'')+(!q?'中继与探测点之间被月球挡住。':'');
}
$('angle').oninput=draw;for(let d of [0,60,180])$('pos'+d).onclick=()=>{$('angle').value=d;draw();};$('far').onclick=()=>{far=true;draw();};$('near').onclick=()=>{far=false;draw();};$('reset').onclick=()=>{far=true;$('angle').value=0;draw();};draw();
