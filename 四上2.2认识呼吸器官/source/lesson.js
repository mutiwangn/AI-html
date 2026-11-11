'use strict';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s)),V=(x,y,z=0)=>new THREE.Vector3(x,y,z);
const state={step:0,phase:0,playing:false,amount:0,rx:0,ry:-.12,zoom:1,low:matchMedia('(prefers-reduced-motion: reduce)').matches,route:0,part:'all',ghost:false};
const titles=['感受呼吸','空气的通路','器官的协作','用模型解释'];
const data=[
 ['呼吸时，哪里在动？','把手轻放在自己衣服外的胸部，保持舒适呼吸。能感受到什么变化？','也可以观察教师演示或教具。不憋气、不竞赛，不要求每个人做深呼吸。','一次吸气和一次呼气，合起来是一次呼吸。','先感受'],
 ['把现象留下来','打开点选记录，分别描述吸气和呼气时胸部的外部变化。','未观察就保留“未观察”，不把三维动画当作自己的实际感受。','胸部的外形可以观察；体内的器官需要借助模型解释。','只记观察'],
 ['由现象提出猜想','鼻子能感到空气通过，胸部会起伏。哪些器官可能一起参与？','先说说你的想法。下一步沿空气的通路，再用模型检验和修正。','观察是证据，解释还需要模型与资料支持。','提出猜想'],
 ['从鼻腔进入','本次沿鼻呼吸追踪。空气经过鼻腔、咽、喉，再进入气管。','嘴也能让空气进入。图中鼻腔、咽、喉分开标示，位置与大小经过简化。','鼻腔 → 咽 → 喉 → 气管。','上段气道'],
 ['接着会到哪里？','按顺序点选空气经过的部分，连接一条完整通路。','肺内还有更细的支气管和细支气管，空气最终到达肺内的肺泡。','空气在气道里移动，不穿过膈肌，也不沿食管进入胃。','连接通路'],
 ['肺在胸腔里','气管分成左右支气管，分别进入左右肺。肺泡是肺内结构。','肺位于胸腔。下方的膈肌把胸腔与腹腔分隔开，参与运动，却不是气道。','鼻腔、气管、肺等结构相互联系，共同参与呼吸。','位置关系'],
 ['吸气：空间增大','膈肌收缩、下降并变平；肋间肌等帮助胸廓向上、向外运动。','胸腔扩大，肺随之扩张，肺内气压暂时低于外界，空气沿气道进入。','膈肌下降 → 胸腔扩大 → 肺扩张 → 空气进入。','吸气'],
 ['安静呼气：回缩','膈肌和相关肌肉放松，膈肌恢复较高的拱形，胸廓和肺弹性回缩。','肺内气压暂时高于外界，空气沿气道排出。这里不演示用力呼气。','膈肌放松 → 胸腔变小 → 肺回缩 → 空气排出。','安静呼气'],
 ['一呼一吸，协同工作','播放一轮，比较膈肌、胸廓、肺和空气流动的变化。','肺不会像肌肉一样主动抽气。胸膜等参与联动的结构在图中省略。','空气进入和排出，伴随着胸腔、膈肌和肺的协调变化。','协作观察'],
 ['装置各部分像什么？','用瓶式模型把看不见的过程变得可观察。依次点选部件，找到对应关系。','管口与外界相通；瓶身保持密封。模型没有完整模拟鼻腔、咽喉与胸膜。','瓶体表示胸腔空间，管子表示气道，气球表示肺，底膜表示膈肌。','模型对应'],
 ['拉动底膜，观察变化','先猜：底膜下移时，气球会怎样？点选“向下拉”，再点“松回”比较。','不要对着管口吹气代替吸气。装置的空间变化才是本次要研究的条件。','底膜下移，瓶内空间增大，气球扩张；松回时气球回缩。','操纵模型'],
 ['模型能解释到哪里？','瓶壁固定，不能表现胸廓向上、向外的运动；气球的结构也不同于真实肺。','底膜由手拉动，人的膈肌主动收缩。模型只能帮助解释部分关系。','模型有相似之处，也有限制。用它修正猜想，而不是代替真实人体。','比较局限']
];
let scene,camera,renderer,root,human,bottle,chest,diaphragm,membrane,balloons=[],lungs=[],lungObjects=[],airways=[],particles=[],labels=[],ghost,webgl=true,dirty=true,last=0,drawn=0,modalId=null,returnFocus=null,airTubes=[];
const C={air:'#b9d5d0',lung:'#c9827d',bone:'#cbbda9',dia:'#e7aa72',particle:'#9ae4ed'};
function material(color,opacity=1){return new THREE.MeshStandardMaterial({color,roughness:.6,side:THREE.DoubleSide,transparent:opacity<1,opacity,depthWrite:opacity===1});}
function mesh(geo,color,parent,opacity=1){let o=new THREE.Mesh(geo,material(color,opacity));parent.add(o);return o;}
function ball(x,y,z,sx,sy,sz,color,parent,opacity=1){let o=mesh(new THREE.SphereGeometry(1,20,14),color,parent,opacity);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
function tube(points,r,color,parent,opacity=1){let curve=new THREE.CatmullRomCurve3(points.map(p=>V(...p)));let o=mesh(new THREE.TubeGeometry(curve,26,r,7,false),color,parent,opacity);return o;}
function airway(points,r,id,parent=human){let o=tube(points,r,C.air,parent);o.userData.part=id;airways.push(o);return o;}
function lungGeometry(side){const p=[],ix=[],N=24,M=20;for(let j=0;j<=M;j++){let v=j/M*Math.PI,ct=Math.cos(v),sn=Math.sin(v),y=ct*1.36;for(let i=0;i<=N;i++){let a=i/N*Math.PI*2,co=Math.cos(a),si=Math.sin(a);let width=.67*sn*(.92-.20*ct),x=co*width; // rounded base, tapered apex, medial concavity
 if(x*side<0)x*=.72;if(side===1&&x<0&&y<.4&&y>-.7)x*=.60;
 p.push(x,y,si*.65*sn*(1-.1*ct));}}
 for(let j=0;j<M;j++)for(let i=0;i<N;i++){let a=j*(N+1)+i,b=a+N+1;ix.push(a,b,a+1,b,b+1,a+1);}let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;}
function domeGeometry(){const p=[],ix=[],N=30,R=10;for(let r=0;r<=R;r++)for(let i=0;i<=N;i++){let f=r/R,a=i/N*Math.PI*2;p.push(Math.cos(a)*1.98*f,0,Math.sin(a)*1.08*f);}for(let j=0;j<R;j++)for(let i=0;i<N;i++){let a=j*(N+1)+i,b=a+N+1;ix.push(a,b,a+1,b,b+1,a+1);}let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);return g;}
function updateDome(o,amount,isBottle=false){let p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){let x=p.getX(i),z=p.getZ(i),f=Math.min(1,Math.sqrt((x/1.98)**2+(z/1.08)**2));p.setY(i,isBottle?-1.65-(1-f*f)*.65*amount:-1.75-.14*amount+(.50-.38*amount)*(1-f*f));}p.needsUpdate=true;o.geometry.computeVertexNormals();}
function label(text,p,target=human){let el=document.createElement('div');el.className='label';el.textContent=text;$('#labels').append(el);labels.push({el,p:V(...p),target});}
function addHuman(){human=new THREE.Group();root.add(human);chest=new THREE.Group();human.add(chest);
 // Anterior chest tissue and sternum omitted to expose the organs. No skin-transparency claim.
 tube([[-1.9,-1.7,-.6],[-2.05,.2,-.55],[-1.45,1.65,-.4],[-.52,2.0,-.35],[-.40,2.35,-.3]],.04,'#70818c',human);
 tube([[1.9,-1.7,-.6],[2.05,.2,-.55],[1.45,1.65,-.4],[.52,2.0,-.35],[.40,2.35,-.3]],.04,'#70818c',human);
 tube([[0,-1.4,-.75],[0,1.7,-.75]],.11,'#a99e8e',chest);
 for(let k=0;k<8;k++){let y=1.2-k*.36,w=1.45+.32*Math.sin(k/8*Math.PI);for(let side of [-1,1]){let pts=[];for(let j=0;j<=20;j++){let a=-1.52+j/20*2.60;pts.push([side*w*Math.cos(a),y-.14*Math.cos(a),.80*Math.sin(a)]);}tube(pts,.032,C.bone,chest,.52);}}
 // The left lung is the subject's left, seen on the viewer's right in the front view.
 for(let side of [-1,1]){let g=new THREE.Group();human.add(g);g.position.set(side*.86,.10,0);let lung=mesh(lungGeometry(side),C.lung,g,.46);lung.userData.part='lungs';if(side===1)g.scale.set(.9,.96,.93);lungs.push(g);lungObjects.push(lung);}
 diaphragm=mesh(domeGeometry(),C.dia,human,.82);diaphragm.userData.part='diaphragm';updateDome(diaphragm,0);
 // A reduced sagittal upper-airway segment connects nose to pharynx and larynx.
 tube([[.28,2.37,-.3],[.52,2.62,-.30],[.5,3.18,-.20],[.35,3.48,.0],[.05,3.55,.22],[-.22,3.42,.30],[-.34,3.1,.46],[-.25,2.86,.38],[-.20,2.60,.22],[0,2.38,.02]],.025,'#7c8d9a',human,.7);
 airway([[-.36,3.10,.45],[-.15,3.17,.22],[.15,3.12,-.1]],.10,'nose');
 airway([[.15,3.12,-.1],[.22,2.86,-.1],[.19,2.60,-.04]],.09,'pharynx');
 airway([[.19,2.60,-.04],[.12,2.42,.02],[0,2.28,.04]],.12,'larynx');
 airway([[0,2.28,.04],[0,1.8,.06],[0,1.25,.06],[0,.85,.07]],.11,'trachea');
 for(let i=0;i<10;i++){let ring=mesh(new THREE.TorusGeometry(.12,.018,5,14), '#e7d7b8',human);ring.rotation.x=Math.PI/2;ring.position.set(0,1+i*.12,.06);ring.userData.part='trachea';airways.push(ring);}
 for(let side of [-1,1]){airway([[0,.85,.07],[side*.45,.58,.04],[side*.78,.28,0]],.085,'bronchi');for(let k=0;k<3;k++){let sy=.55-k*.40;airway([[side*.55,.5,.03],[side*.82,sy,0],[side*1.25,sy-.18,.0]],.043,'bronchi');airway([[side*.82,.25,0],[side*.92,-.25,0],[side*1.17,-.75,.05]],.035,'bronchi');}
 const pts=[[-.36,3.10,.45],[-.15,3.17,.22],[.15,3.12,-.10],[.22,2.86,-.1],[.19,2.60,-.04],[.12,2.42,.02],[0,2.28,.04],[0,1.6,.06],[0,.85,.07],[side*.45,.58,.04],[side*.78,.28,0],[side*1.17,-.75,.05]];
 airTubes.push(new THREE.CatmullRomCurve3(pts.map(p=>V(...p))));}
 ghost=new THREE.Group();human.add(ghost);for(let side of [-1,1])tube([[side*.42,1.5,.08],[side*1.46,.96,.08],[side*1.71,-.2,.08],[side*1.60,-1.48,.08]],.022,'#9ed7db',ghost,.6);ghost.visible=false;
 for(let i=0;i<18;i++){let o=ball(0,0,0,.043,.043,.043,C.particle,human);particles.push(o);}
}
function addBottle(){bottle=new THREE.Group();root.add(bottle);bottle.visible=false;
 // Bottle outline is fixed. Pipe top open to outside, bottle neck sealed around pipe.
 for(let side of [-1,1])tube([[side*1.75,-1.65,-.50],[side*1.75,.85,-.50],[side*1.22,1.6,-.50],[side*.30,1.85,-.50],[side*.30,2.22,-.50]],.045,'#91bac2',bottle);
 for(let y of [-1.65,.85]){let pts=[];for(let i=0;i<=40;i++){let a=i/40*Math.PI*2;pts.push([Math.cos(a)*1.75,y,Math.sin(a)*1.0]);}tube(pts,.035,'#91bac2',bottle);}
 let stopper=mesh(new THREE.CylinderGeometry(.32,.32,.22,18), '#d4ad73',bottle);stopper.position.set(0,2.05,0);
 tube([[0,2.6,0],[0,1.1,0],[0,.65,0]],.095,C.air,bottle);
 for(let side of [-1,1]){tube([[0,.65,0],[side*.5,.3,0],[side*.75,.05,0]],.075,C.air,bottle);let g=new THREE.Group();bottle.add(g);g.position.set(side*.75,.05,0);ball(0,-.5,0,.51,.72,.49,side<0?'#e69a8b':'#c98f9e',g);balloons.push(g);}
 membrane=mesh(domeGeometry(),C.dia,bottle,.85);membrane.scale.set(.885,1,.93);updateDome(membrane,0,true);
}
function updateLabels(){root.updateMatrixWorld(true);for(let l of labels){let v=l.p.clone();l.target.localToWorld(v);v.project(camera);l.el.style.left=((v.x*.5+.5)*$('#view').clientWidth)+'px';l.el.style.top=((-v.y*.5+.5)*$('#view').clientHeight)+'px';l.el.hidden=v.z>1||v.x<-.96||v.x>.96||v.y<-.98||v.y>.98;}}
function labelsForStep(){labels=[];$('#labels').replaceChildren();let s=state.step;if(s>=9){label('管子',[.75,2.3,0],bottle);label('瓶体',[2.1,.5,0],bottle);label('气球',[-1.25,-.5,.4],bottle);label('底部橡皮膜',[-2.20,-1.85,.1],bottle);return;}
 if(s===3){label('鼻腔',[-.9,3.15,.5]);label('咽',[.92,2.9,0]);label('喉',[-.8,2.45,.1]);label('气管',[.9,1.8,.2]);}
 else if(s===4){label('鼻腔',[-.95,3.15,.4]);label('气管',[.9,1.9,.3]);label('支气管',[1.75,.85,.25]);label('肺内分支',[-1.65,-.6,.3]);}
 else if(s>=6){label('胸廓',[-2.1,.6,.25]);label('肺',[1.5,.45,.7]);label('膈肌',[-2.20,-1.65,.25]);}
 else{label('鼻腔',[-.9,3.16,.4]);label('气管',[.9,1.95,.3]);label('右肺',[-1.45,-.4,.6]);label('左肺',[1.45,-.4,.6]);label('膈肌',[-2.20,-1.65,.2]);}}
function applyModel(){let a=state.amount;human.visible=state.step<9;bottle.visible=state.step>=9;chest.scale.set(1+.055*a,1+.025*a,1+.07*a);chest.position.y=.06*a;lungs.forEach((g,i)=>{let left=i===1;g.scale.set((left?.9:1)*(1+.085*a),(left?.96:1)*(1+.10*a),(left?.93:1)*(1+.08*a));g.position.y=.10-.095*a;});updateDome(diaphragm,a);updateDome(membrane,a,true);balloons.forEach(g=>g.scale.set(1+.35*a,1+.2*a,1+.35*a));ghost.visible=state.ghost&&state.step>=6&&state.step<=8;
 const highlighted=state.step===3?['nose','pharynx','larynx','trachea']:state.step===4?['nose','pharynx','larynx','trachea','bronchi','lungs'].slice(0,state.route):[];
 airways.forEach(o=>{o.material.color.set(highlighted.includes(o.userData.part)?'#f0c67f':C.air);});
 diaphragm.material.color.set(state.part==='膜'? '#ffe0a1':C.dia);membrane.material.color.set(state.part==='膜'?'#ffe0a1':C.dia);
 let moving=state.playing||(state.low&&state.phase>0&&state.phase<1);let entering=state.step===6?true:state.step===7?false:state.phase<.5;
 particles.forEach((p,i)=>{p.visible=state.step>=3&&state.step<=8&&moving;if(p.visible){let t=(state.phase*3+i/9)%1;if(!entering)t=1-t;p.position.copy(airTubes[i%2].getPoint(t));p.material.color.set(entering?'#a0e5ed':'#f0bd8d');}});
 root.rotation.set(state.rx,state.ry,0);root.scale.setScalar(state.zoom);root.position.y=state.step>=9?-.15:-.35;
 let phaseText=state.step>=9?(a>.5?'底膜下移 · 气球较大':'底膜松回 · 气球较小'):state.step>=6?(a<.01?'呼气末':a>.99?'吸气末':entering?'吸气中 · 空气进入':'呼气中 · 空气排出'):'人体左右按自身方向标注';
 $('#phaseBadge').textContent=phaseText;
}
function layout(){let s=Math.min(innerWidth/1600,innerHeight/900);$('#shell').style.transform=`translate(-50%,-50%) scale(${s})`;if(renderer){let r=$('#view').getBoundingClientRect();renderer.setPixelRatio(Math.min(devicePixelRatio||1,webgl?1.5:1));renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();dirty=true;}}
function initialize(){scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,.4,9.8);camera.lookAt(0,.4,0);root=new THREE.Group();scene.add(root);scene.add(new THREE.HemisphereLight(0xffe6d7,0x35495e,2.3));let k=new THREE.DirectionalLight(0xffe8d6,2.6);k.position.set(-4,6,6);scene.add(k);let f=new THREE.DirectionalLight(0x98cce6,1.5);f.position.set(4,3,-3);scene.add(f);
 let c=$('#canvas');try{const gl=c.getContext('webgl2',{alpha:true,antialias:true})||c.getContext('webgl',{alpha:true,antialias:true});if(!gl)throw Error('WebGL unavailable');renderer=new THREE.WebGLRenderer({canvas:c,context:gl,alpha:true,antialias:true});renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;}catch(e){webgl=false;let f=c.cloneNode();c.replaceWith(f);c=f;renderer=new MeshCanvasRenderer(c);$('#status').textContent='Canvas兼容绘制 · 离线可用';}
 c.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();$('#fallback').hidden=false;$('#status').textContent='绘图中断，请重新打开';});addHuman();addBottle();bindPointer(c);go(0);layout();requestAnimationFrame(frame);}
function breathe(t){return (1-Math.cos(t*2*Math.PI))/2;}
function amountAt(t){return state.step===6?(1-Math.cos(t*Math.PI))/2:state.step===7?(1+Math.cos(t*Math.PI))/2:breathe(t);}
function frame(time){const dt=Math.min(.07,(time-last)/1000||0);last=time;if(state.playing){state.phase=Math.min(1,state.phase+dt/(state.step===6||state.step===7?4:8));state.amount=amountAt(state.phase);dirty=true;if(state.phase>=1){state.playing=false;$('#play').textContent='↻ 再看一轮';}}
 if(dirty&&(webgl||time-drawn>110)){applyModel();renderer.render(scene,camera);updateLabels();dirty=false;drawn=time;}requestAnimationFrame(frame);}
function stop(){state.playing=false;$('#play').textContent=state.low?'前进一帧 →':'▶ 播放一轮';dirty=true;}
function play(){if(state.low){state.phase=state.phase>=1?0:Math.min(1,state.phase+.125);state.amount=amountAt(state.phase);dirty=true;return;}if(state.playing){stop();$('#play').textContent='▶ 继续观察';return;}if(state.phase>=1)state.phase=0;state.playing=true;$('#play').textContent='Ⅱ 暂停观察';}
function button(where,text,fn,pressed){let b=document.createElement('button');b.textContent=text;b.onclick=fn;if(pressed!==undefined)b.setAttribute('aria-pressed',String(pressed));$(where).append(b);return b;}
function go(s){stop();state.step=Math.max(0,Math.min(11,s));state.phase=0;state.amount=s===7?1:0;state.route=0;state.part='all';state.ghost=false;state.rx=0;state.ry=-.12;state.zoom=1;$('#adjustPanel').hidden=true;$('#adjust').setAttribute('aria-expanded','false');let d=data[state.step];$('#stageTitle').textContent=d[0];$('#explanation').textContent=d[1];$('#focus').textContent=d[2];$('#caption').textContent=d[3];$('#sceneKind').textContent=d[4];$('#sceneLabel').textContent=s<9?'原创三维 · 呼吸结构示意':'原创三维 · 瓶式装置示意';$('#stepCounter').textContent=`${state.step%3+1} / 3　${titles[Math.floor(state.step/3)]}`;$('#overall').textContent=`${s+1} / 12`;$('#progress').style.width=((s+1)/12*100)+'%';$('#previous').hidden=s===0;$('#next').textContent=s===11?'回到开始 ↻':'下一步 →';$('#play').hidden=!(s>=6&&s<=8);$('#play').textContent=state.low?'前进一帧 →':'▶ 播放一轮';$('#feedback').textContent='';$('#localControls').replaceChildren();$('#contextActions').replaceChildren();$$('[data-topic]').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.topic)===Math.floor(s/3))));
 if(s<=2)button('#contextActions','点选观察记录',()=>{renderRecords();openModal('records');});
 if(s===4)renderRoute();
 if(s>=6&&s<=8){button('#localControls','吸气末',()=>{stop();state.amount=1;state.phase=s===7?0:s===6?1:.5;dirty=true;});button('#localControls','呼气末',()=>{stop();state.amount=0;state.phase=s===6?0:1;dirty=true;});button('#contextActions','叠加吸气末轮廓',e=>{state.ghost=!state.ghost;$('#contextActions button').setAttribute('aria-pressed',String(state.ghost));dirty=true;},false);}
 if(s===9){const maps={瓶体:'瓶体：表示胸腔空间。瓶壁固定，不像胸廓会运动。',管子:'管子：表示气管、支气管，管口与外界相通。',气球:'气球：表示肺。真实肺有很多细小分支和肺泡。',膜:'底部橡皮膜：表示膈肌的运动作用，外力拉动并非肌肉收缩。'};Object.keys(maps).forEach(key=>button('#localControls',key==='膜'?'底膜':key,()=>{state.part=key;$('#feedback').textContent=maps[key];$$('#localControls button').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===(key==='膜'?'底膜':key))));dirty=true;},false));}
 if(s===10){button('#localControls','↓ 向下拉底膜',()=>{state.amount=1;$('#feedback').textContent='瓶内空间增大，压强变化使空气经管子进入气球。';dirty=true;});button('#localControls','↑ 松回底膜',()=>{state.amount=0;$('#feedback').textContent='空间减小，气球回缩，空气经管子排出。';dirty=true;});}
 if(s===11){button('#localControls','人体会动，瓶壁不动',()=>$('#feedback').textContent='对。胸廓也参与呼吸，固定瓶壁没有表现这一点。');button('#localControls','肺是完全相同的气球',()=>$('#feedback').textContent='再想想：气球是简化替代物，真实肺的形状与内部结构不同。');button('#contextActions','拓展：动物怎样呼吸',()=>openModal('extension'));}
 labelsForStep();dirty=true;}
const routeNames=['鼻腔','咽','喉','气管','支气管','肺内分支与肺泡'];
function renderRoute(){ $('#localControls').replaceChildren();['气管','鼻腔','膈肌','支气管','咽','肺内分支与肺泡','喉','胃'].forEach(name=>{let b=button('#localControls',name,()=>{if(state.route===6)return;if(name===routeNames[state.route]){state.route++;$('#feedback').textContent=state.route===6?'已连接完整通路。肺泡是肺内的一部分。':'已到：'+routeNames[state.route-1]+'。继续下一站。';renderRoute();dirty=true;}else $('#feedback').textContent=(name==='膈肌'||name==='胃')?name+'不属于这条空气通路。再沿气道想一想。':'顺序还需调整，请接着上一站。';});b.disabled=routeNames.slice(0,state.route).includes(name);});button('#contextActions','重新连接',()=>{state.route=0;$('#feedback').textContent='从鼻腔开始。';renderRoute();dirty=true;}); // remove duplicate reset during repeated route renders
 const resets=$$('#contextActions button');resets.slice(0,-1).forEach(b=>b.remove());}
const record={source:'未观察',rows:[null,null]};
function renderRecords(){$('#recordSource').replaceChildren();['未观察','自己的外部感受','教师演示或教具'].forEach(v=>button('#recordSource',v,()=>{record.source=v;renderRecords();},record.source===v));$('#recordGrid').replaceChildren();['吸气时胸部','呼气时胸部'].forEach((t,i)=>{let sec=document.createElement('section');sec.innerHTML='<h3>'+t+'</h3><div class="choices" id="row'+i+'"></div>';$('#recordGrid').append(sec);['向外扩张','向内回缩','未分辨清楚'].forEach(v=>button('#row'+i,v,()=>{record.rows[i]=v;renderRecords();},record.rows[i]===v));});$('#recordStatus').textContent=record.source==='未观察'?'当前来源：未观察。请不要把模型过程当成实际观察。':`来源：${record.source}。已点选 ${record.rows.filter(Boolean).length}/2 项。外部变化不能直接显示体内全部过程。`;}
function openModal(id){stop();if(modalId)$('#'+modalId).hidden=true;else returnFocus=document.activeElement;modalId=id;$('#'+id).hidden=false;document.querySelectorAll('header, main, footer').forEach(e=>e.inert=true);$('#'+id+' [data-close]').focus();}
function closeModal(){if(!modalId)return;$('#'+modalId).hidden=true;modalId=null;document.querySelectorAll('header, main, footer').forEach(e=>e.inert=false);returnFocus?.focus();}
function bindPointer(c){let points=new Map(),oldDist=0,oldX=0,oldY=0;c.addEventListener('pointerdown',e=>{points.set(e.pointerId,{x:e.clientX,y:e.clientY});c.setPointerCapture(e.pointerId);oldX=e.clientX;oldY=e.clientY;if(points.size===2){let a=[...points.values()];oldDist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}});c.addEventListener('pointermove',e=>{if(!points.has(e.pointerId))return;points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(points.size===2){let a=[...points.values()],dist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(oldDist)state.zoom=Math.max(.75,Math.min(1.35,state.zoom*dist/oldDist));oldDist=dist;}else{state.ry=Math.max(-1.6,Math.min(1.6,state.ry+(e.clientX-oldX)*.006));state.rx=Math.max(-.35,Math.min(.35,state.rx+(e.clientY-oldY)*.004));}oldX=e.clientX;oldY=e.clientY;dirty=true;});const end=e=>{points.delete(e.pointerId);oldDist=0;if(points.size){let p=[...points.values()][0];oldX=p.x;oldY=p.y;}};c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);c.addEventListener('lostpointercapture',end);c.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.max(.75,Math.min(1.35,state.zoom-e.deltaY*.001));dirty=true;},{passive:false});}
$$('[data-topic]').forEach(b=>b.onclick=()=>go(Number(b.dataset.topic)*3));$('#next').onclick=()=>go(state.step===11?0:state.step+1);$('#previous').onclick=()=>go(state.step-1);$('#play').onclick=play;$('#settingsOpen').onclick=()=>openModal('settings');$('#sourcesOpen').onclick=()=>openModal('sources');$$('[data-close]').forEach(b=>b.onclick=closeModal);$('#recordClear').onclick=()=>{record.source='未观察';record.rows=[null,null];renderRecords();};
$('#motionToggle').onclick=()=>{stop();state.low=!state.low;$('#motionToggle').textContent='低动态：'+(state.low?'开启':'关闭');$('#motionToggle').setAttribute('aria-pressed',String(state.low));$('#play').textContent=state.low?'前进一帧 →':'▶ 播放一轮';};$('#motionToggle').textContent='低动态：'+(state.low?'开启':'关闭');$('#motionToggle').setAttribute('aria-pressed',String(state.low));
$('#adjust').onclick=()=>{let p=$('#adjustPanel');p.hidden=!p.hidden;$('#adjust').setAttribute('aria-expanded',String(!p.hidden));};$('#front').onclick=()=>{state.rx=0;state.ry=0;dirty=true;};$('#side').onclick=()=>{state.rx=0;state.ry=1.45;dirty=true;};$('#zoomIn').onclick=()=>{state.zoom=Math.min(1.35,state.zoom+.1);dirty=true;};$('#zoomOut').onclick=()=>{state.zoom=Math.max(.75,state.zoom-.1);dirty=true;};$('#home').onclick=()=>{state.zoom=1;state.rx=0;state.ry=-.12;dirty=true;};$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){$('#status').textContent='全屏未开启，可用浏览器全屏';}};document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'⛶ 退出全屏':'⛶ 全屏';layout();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();return;}if(modalId&&e.key==='Tab'){let a=$$('#'+modalId+' button:not([disabled]),#'+modalId+' a,#'+modalId+' summary').filter(e=>e.getClientRects().length),first=a[0],last=a[a.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});addEventListener('pagehide',stop);addEventListener('resize',layout);
window.lessonQA={state,go,amountAt,record,snapshot:()=>({step:state.step,amount:state.amount,diaphragmCenter:diaphragm.geometry.attributes.position.getY(0),lungScaleY:lungs[0].scale.y,thoraxScaleX:chest.scale.x,playing:state.playing,webgl,triangles:renderer.info?.render?.triangles??null})};
try{initialize();}catch(e){$('#fallback').hidden=false;$('#status').textContent='模型初始化失败';console.error(e);}
