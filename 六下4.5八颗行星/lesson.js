"use strict";
// Distance unit: million km, from NASA rounded educational values; diameter: km.
const data=[['水星',58,4880,'#99958d'],['金星',108,12104,'#ccad72'],['地球',149.7,12756,'#5c9cad'],['火星',227.9,6792,'#bd7661'],['木星',778,142984,'#b79a7d'],['土星',1400,120536,'#c5b686'],['天王星',2900,51118,'#7caeb5'],['海王星',4500,49528,'#6280b4']],$=id=>document.getElementById(id);
let chosen=2,limit=50;
$('choose').innerHTML=data.map((p,i)=>`<button id="planet${i}">${i+1}. ${p[0]}</button>`).join('');
function draw(){let rows='';data.forEach((p,i)=>{let d=p[1]/100,y=45+i*38,x=100+560*d/limit,visible=d<=limit,sel=i===chosen;rows+=`<text x="10" y="${y+6}" font-size="17" fill="${sel?'#a34e2f':'#354c42'}">${p[0]}</text><path d="M100 ${y}H660" stroke="#e0e6dd"/><path d="M100 ${y}H${visible?x:660}" stroke="${sel?'#a34e2f':'#91a69a'}" stroke-width="${sel?4:2}"/>`+(visible?`<circle id="dot${i}" cx="${x}" cy="${y}" r="${sel?7:4}" fill="${sel?'#a34e2f':p[3]}"/>`:`<path id="beyond${i}" d="M649 ${y-7}L660 ${y}L649 ${y+7}" fill="none" stroke="#697d71" stroke-width="3"/>`);});$('plot').innerHTML=rows;
let ticks=limit===50?[0,10,20,30,40,50]:[0,.5,1,1.5,2,2.5,3];$('axis').innerHTML='<path d="M100 365H660" stroke="#4c6859"/>'+ticks.map(t=>{let x=100+560*t/limit;return `<path d="M${x} 360V371" stroke="#4c6859"/><text x="${x}" y="392" text-anchor="middle">${t}</text>`}).join('')+'<text x="660" y="416" text-anchor="end">亿千米（0为太阳）</text>';
$('all').setAttribute('aria-pressed',limit===50);$('inner').setAttribute('aria-pressed',limit===3);$('scale').textContent=limit===50?'全览同一比例：内侧四颗挤在左侧，但并未重合或等距排列。':'放大到 0–3 亿千米：外侧四颗超出右边界，未消失。';
for(let i=0;i<8;i++)$('planet'+i).setAttribute('aria-pressed',i===chosen);
let p=data[chosen],max=Math.max(p[2],12756);$('name').textContent=p[0];$('detail').textContent=`按离太阳由近到远排第 ${chosen+1}。平均日距约 ${(p[1]/100).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')} 亿千米；赤道直径约 ${p[2].toLocaleString('en-US')} 千米。`;
$('selectedDisk').setAttribute('r',80*p[2]/max);$('selectedDisk').setAttribute('fill',p[3]);$('earthDisk').setAttribute('r',80*12756/max);$('sizeName').textContent=p[0];$('ratio').textContent=`${p[0]}赤道直径约为地球的 ${(p[2]/12756).toFixed(2)} 倍。`;
}
for(let i=0;i<8;i++)$('planet'+i).onclick=()=>{chosen=i;draw();};$('all').onclick=()=>{limit=50;draw();};$('inner').onclick=()=>{limit=3;draw();};$('reset').onclick=()=>{chosen=2;limit=50;draw();};draw();
