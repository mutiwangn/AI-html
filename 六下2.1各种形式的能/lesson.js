"use strict";const $=id=>document.getElementById(id);
function draw(){let deg=Number($('position').value),t=deg*Math.PI/180,h=2*(1-Math.cos(t)),u=Math.max(0,Math.min(9.8,9.8*h)),k=9.8-u,v=Math.sqrt(2*k),x=300+220*Math.sin(t),y=55+220*Math.cos(t),len=60*v/Math.sqrt(19.6);
$('string').setAttribute('d',`M300 55L${x} ${y}`);$('ball').setAttribute('cx',x);$('ball').setAttribute('cy',y);$('velocity').setAttribute('d',k<1e-9?'':`M${x} ${y}L${x+len*Math.cos(t)} ${y-len*Math.sin(t)}`);$('heightLine').setAttribute('d',`M450 ${y}V275 M443 ${y}H457 M443 275H457`);$('heightText').setAttribute('y',(y+275)/2-8);$('heightText').textContent=h.toFixed(2)+' m';
$('potential').setAttribute('width',380*u/9.8);$('kinetic').setAttribute('x',20+380*u/9.8);$('kinetic').setAttribute('width',380*k/9.8);$('uText').textContent=u.toFixed(2)+' J';$('kText').textContent=k.toFixed(2)+' J';$('positionValue').textContent=deg+'°';$('status').textContent=`相对最低点高 ${h.toFixed(2)} m；速度大小约 ${v.toFixed(2)} m/s。`;
$('feedback').textContent=Math.abs(deg)===60?'到达端点时，速度暂时为零，但重力势能最大。能量没有消失。':deg===0?'最低点时，按所选零点重力势能为零，动能最大；并不是物体没有能量。':deg<0?'从左端下摆至此，高度降低，重力势能减少、动能增加。':'从最低点上摆至此，高度升高，动能减少、重力势能增加。';
}
$('position').oninput=draw;for(let [id,d]of [['left',-60],['bottom',0],['right',60],['reset',-60]])$(id).onclick=()=>{$('position').value=d;draw();};draw();
