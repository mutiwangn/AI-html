(function(){
  'use strict';
  var root=document.getElementById('page-instruments');
  if(!root)return;
  function el(id){return document.getElementById('ins-'+id);}
  function set(node,attrs){Object.keys(attrs).forEach(function(k){node.setAttribute(k,attrs[k]);});}
  var frames=window.requestAnimationFrame||function(fn){return setTimeout(function(){fn(Date.now());},16);};
  var cancel=window.cancelAnimationFrame||clearTimeout;
  var state={device:'water',target:2250,value:0,phase:0,started:0,running:false,complete:false,request:0,detail:null};
  var configs={
    water:{title:'排水式肺活量仪',description:'瓶内先灌满水并倒置。尽力吸气后，一口气吹入，等水面稳定再读数。',conclusion:'收集气体占据的空间，可以用排出的水来表示。',initial:'先观察：气体从哪里进入，水从哪里排出？',parts:[
      {title:'1 · 进气长管',text:'每人使用独立吹嘴。尽力吸气后，只向长管吹气；长管把气体送入倒置瓶的上部。不要用嘴吸水。'},
      {title:'2 · 瓶身与刻度',text:'教师用书建议选5000毫升以上的瓶子，用已知水量逐次标定。倒置后，刻度从封闭的瓶底向下增大。'},
      {title:'3 · 排水短管与密封',text:'瓶盖的两处管口都要密封，瓶盖浸在槽水中。空气进入后，水从下部短管排出；水面稳定后读取气体体积。'}]},
    bag:{title:'袋式肺活量仪',description:'插入短直吸管，一次尽力呼气。拔管后捏口密封，向内卷到饱满，再读数。',conclusion:'把气体完整收集在袋里，用标定刻度读取体积。',initial:'先排空袋子，使用各自的短直吸管或吹嘴。',parts:[
      {title:'1 · 短直吸管',text:'先排空袋子，再插入短直吸管。离开吸管尽力吸气，然后对准吹嘴一次尽力呼出，中途不补吹。'},
      {title:'2 · 刻度测量袋',text:'透明袋收集这一口气。刻度表示气体体积，单位是毫升；此处每格250毫升，实际读数以器材刻度为准。'},
      {title:'3 · 密封与卷袋',text:'拔出吸管后马上捏紧袋口，再向充气方向卷到不能再卷。气体要留在袋内，读取鼓起袋体对应的最大刻度。'}]},
    electronic:{title:'流量式电子肺活量计',description:'换用个人吹嘴，按仪器说明调到测量状态。尽力吸气后一次呼出，仪器累计本次气体体积。',conclusion:'把整次呼气的气流逐步累计，得到总体积。',initial:'这里展示常见流量式原理，不代替真实仪器测量。',parts:[
      {title:'1 · 个人吹嘴',text:'空气从个人吹嘴经过测量通道。不同人应更换各自的吹嘴，具体使用与清洁按器材说明执行。'},
      {title:'2 · 气流感应部件',text:'流量式仪器检测气流，再转换为信号。不同型号可用不同传感方式，图中仅表示“检测气流”这一步。'},
      {title:'3 · 累计与显示',text:'仪器把各小段时间通过的气量累加，显示整次呼气体积。数字来自传感器测量，不能只按吹气时间换算。'}]}
  };
  /* This axisymmetric demonstration bottle is calibrated by its geometry.
     The displayed volume is collected gas volume, with no claim of a real
     calibration. Body radius 125, body height 300; a 60-unit tapered shoulder
     ends at radius 40, followed by a 40-unit neck. The model capacity is 5000 mL.
     Up to 4500 mL the air/water interface remains within the straight body.
     Real water-displacement readings are affected by leaks, pressure and temperature. */
  var bodyIntegral=125*125*300;
  var shoulderIntegral=(125*125+125*40+40*40)*60/3;
  var shapeIntegral=bodyIntegral+shoulderIntegral+40*40*40;
  function levelFor(ml){
    var s=Math.max(0,Math.min(5000,ml))/5000*shapeIntegral;
    if(s<=bodyIntegral)return 45+s/15625;
    if(s<=bodyIntegral+shoulderIntegral){
      var lo=0,hi=60,k=85/60;
      for(var i=0;i<24;i++){var m=(lo+hi)/2,a=15625*m-125*k*m*m+k*k*m*m*m/3;if(bodyIntegral+a<s)lo=m;else hi=m;}
      return 345+(lo+hi)/2;
    }
    return 405+(s-bodyIntegral-shoulderIntegral)/1600;
  }
  var scale='';
  for(var v=0;v<=5000;v+=250){
    var y=levelFor(v),major=v%500===0;
    scale+='<line x1="590" y1="'+y+'" x2="'+(major?613:603)+'" y2="'+y+'" stroke="#7098a4" stroke-width="'+(major?2:1.2)+'"/>';
    if(major)scale+='<text x="620" y="'+(y+7)+'">'+v+'</text>';
  }
  scale+='<text x="617" y="27" font-size="18">mL</text>';
  el('water-scale').innerHTML=scale;
  function describe(){
    var conf=configs[state.device],item=state.detail===null?conf:conf.parts[state.detail];
    el('title').textContent=item.title;
    el('description').textContent=state.detail===null?conf.description:item.text;
    el('close-detail').hidden=state.detail===null;
    el('hotspot-hint').hidden=state.detail!==null;
    Array.prototype.forEach.call(root.querySelectorAll('[data-ins-hotspot]'),function(n){n.classList.toggle('ins-hot-active',n.getAttribute('data-ins-hotspot')===state.device+'-'+state.detail);});
    Array.prototype.forEach.call(root.querySelectorAll('[data-ins-focus]'),function(n){n.classList.toggle('ins-part-active',n.getAttribute('data-ins-focus')===state.device+'-'+state.detail);});
  }
  function paintWater(ml,moving){
    var level=levelFor(ml),basin=432-ml/100;
    set(el('bottle-water'),{y:level,height:447-level});set(el('bottle-surface'),{d:'M330 '+level+'H580'});
    set(el('basin-water'),{y:basin,height:537-basin});set(el('basin-surface'),{d:'M205 '+basin+'H795'});
    el('bottle-meniscus').setAttribute('cy',level);
    el('air-dots').setAttribute('opacity',ml>250?'.55':'0');
    Array.prototype.forEach.call(el('air-dots').querySelectorAll('circle'),function(dot,i){dot.setAttribute('cy',45+(level-45)*[.32,.61,.43][i]);});
    var ripple=moving?Math.sin(Date.now()/170)*1.5:0;
    set(el('basin-ripple'),{d:'M630 '+(basin+ripple)+'q30-7 60 0m-82 6q52-10 104 0',opacity:ml>0?'.7':'0'});
    el('water-bubbles').setAttribute('opacity',moving&&level<73?'.85':'0');
    Array.prototype.forEach.call(el('water-bubbles').querySelectorAll('circle'),function(dot,i){dot.setAttribute('cy',level+(75-level)*(.25+((Date.now()/900+i*.4)%1)*.6));});
    el('water-direction').setAttribute('opacity',moving?'.9':'0');
    set(el('inlet-flow'),{opacity:moving?'1':'0','stroke-dashoffset':-(Date.now()%1400)/12});
    set(el('outlet-flow'),{opacity:moving?'1':'0','stroke-dashoffset':-(Date.now()%1100)/10});
    set(el('water-read-line'),{d:'M330 '+level+'H674',opacity:ml>0?'.8':'0'});
    el('water-result').setAttribute('opacity','1');
    el('water-result-value').textContent=Math.round(ml);
  }
  function paintBag(ml,phase){
    var maxSpan=655,bagCapacity=5000,roll=phase<=.67?0:Math.min(1,(phase-.67)/.33),end=830,start=175+(1-state.target/bagCapacity)*maxSpan*roll,len=end-start;
    var half=ml>0?Math.min(80,80*Math.sqrt(ml/bagCapacity*maxSpan/Math.max(30,len))):8,cy=300;
    function profile(h){return 'M'+(start-25)+' '+(cy-h*.18)+' Q'+(start-6)+' '+(cy-h)+' '+(start+18)+' '+(cy-h)+' H815 Q830 '+(cy-h)+' 830 300 Q830 '+(cy+h)+' 815 '+(cy+h)+' H'+(start+18)+' Q'+(start-6)+' '+(cy+h)+' '+(start-25)+' '+(cy+h*.18)+'Z';}
    var envelope=profile(80);
    set(el('bag-envelope'),{d:envelope});set(el('bag-body-highlight'),{d:envelope});set(el('bag-clip-shape'),{d:envelope});
    set(el('bag-shape'),{d:profile(half),opacity:ml>0?'.95':'0'});
    set(el('bag-shine'),{d:'M'+(start+20)+' 247Q'+((start+end)/2)+' 229 810 250'});
    set(el('bag-seam'),{d:'M830 232V368'});
    el('bag-wrinkles').setAttribute('opacity',.52*(1-roll));
    el('bag-ghost').setAttribute('opacity',roll>0?'.7':'0');
    el('bag-mouth').setAttribute('opacity',phase<.6?'1':'0');
    var s='';
    for(var n=0;n<=bagCapacity;n+=250){var x=end-n/bagCapacity*maxSpan;if(x<start-1)continue;var major=n%500===0,edge=phase>=1&&n===state.target;s+='<line x1="'+x+'" y1="'+(cy-(major?17:10))+'" x2="'+x+'" y2="'+(cy+2)+'" stroke="#178694" stroke-width="2"/>';if(major)s+='<text x="'+(edge?x+18:x)+'" y="'+(edge?cy-35:cy+30)+'" text-anchor="'+(edge?'start':'middle')+'" font-size="20">'+n+'</text>';}
    el('bag-scale').innerHTML=s;
    var pulled=Math.max(0,Math.min(1,(phase-.55)/.12)),tubeTransform='translate('+(-10*pulled)+','+(-80*pulled)+')';
    set(el('bag-guide-tube'),{d:'M94 185L'+(118-10*pulled)+' '+(292-80*pulled)});set(el('bag-guide-body'),{d:'M712 178L'+Math.max(682,start+12)+' 225'});set(el('bag-guide-roll'),{d:'M236 425L'+(start+6)+' 379'});
    set(el('bag-tube'),{transform:tubeTransform});set(el('bag-tube-highlight'),{transform:tubeTransform});
    set(el('bag-flow'),{opacity:state.running&&phase<.55?'1':'0','stroke-dashoffset':-(Date.now()%900)/10});
    el('bag-roll').setAttribute('opacity',phase>=.6?'1':'0');
    set(el('bag-roller'),{transform:'translate('+(start-175)+',0)'});
    set(el('bag-roll-highlight'),{transform:'translate('+(start-175)+',0)'});
    el('bag-read-mark').setAttribute('opacity',phase>=1?'1':'0');
    set(el('bag-read-line'),{d:'M'+start+' 204V409'});set(el('bag-read-tick'),{d:'M'+start+' '+(cy-17)+'V'+(cy+2)});set(el('bag-read-arrow'),{d:'M'+start+' 408l-7 11h14Z'});
    el('bag-step').textContent=phase===0?'先排空袋内空气':phase<.55?'一次尽力呼出':phase<.67?'袋体还松软 · 拔管并密封':phase<1?'向内卷袋，直到饱满':'卷到饱满，读取对应刻度';
    el('bag-result').textContent=phase>=1?state.target+' mL':'— mL';
  }
  function paintElectronic(ml,moving){
    el('electronic-value').textContent=ml>0?Math.round(ml):'—';
    set(el('electronic-flow'),{opacity:moving?'1':'0','stroke-dashoffset':-(Date.now()%1000)/9});
    set(el('electronic-progress'),{d:'M375 395H'+(375+290*Math.min(1,ml/state.target))});
    el('electronic-sensor-pulse').setAttribute('opacity',moving?String(.35+.25*(1+Math.sin(Date.now()/180))):'.18');
    set(el('electronic-signal-flow'),{opacity:moving?'.9':'0','stroke-dashoffset':-(Date.now()%1000)/18});
  }
  function paint(ml,phase,moving){state.value=ml;state.phase=phase;if(state.device==='water')paintWater(ml,moving);else if(state.device==='bag')paintBag(ml,phase);else paintElectronic(ml,moving);}
  function pause(){
    if(state.request){cancel(state.request);state.request=0;}
    var wasRunning=state.running;state.running=false;
    el('volume').disabled=false;el('start').disabled=false;
    paint(state.value,state.phase,false);
    if(wasRunning){el('start').textContent='重新演示';el('status').textContent='演示已暂停，点“重新演示”从头观察。';}
  }
  function reset(){
    pause();state.target=Number(el('volume').value)||2250;state.value=0;state.phase=0;state.complete=false;state.started=0;
    el('volume-value').textContent=state.target;
    el('start').textContent='开始演示';el('status').textContent=configs[state.device].initial;el('conclusion').textContent=configs[state.device].conclusion;
    paint(0,0,false);
  }
  function selectDevice(device){
    if(!configs[device])return;pause();state.device=device;state.detail=null;
    ['water','bag','electronic'].forEach(function(name){var visible=name===device,scene=el(name+'-svg');if(visible)scene.removeAttribute('hidden');else scene.setAttribute('hidden','');scene.setAttribute('aria-hidden',visible?'false':'true');var b=el('choose-'+name);b.classList.toggle('ins-selected',visible);b.setAttribute('aria-pressed',String(visible));});
    describe();reset();
  }
  function finish(){
    state.running=false;state.request=0;state.complete=true;paint(state.target,1,false);el('volume').disabled=false;el('start').disabled=false;el('start').textContent='再看一次';
    if(state.device==='water'){
      el('conclusion').textContent=state.target+' mL 气体占据空间，排出约 '+state.target+' mL 水。';
      el('status').textContent='这是忽略漏气、温差与压差的原理示意。';
    }else if(state.device==='bag'){
      el('conclusion').textContent='密封、卷到饱满后，此袋读数为 '+state.target+' mL。';
      el('status').textContent='真实测量三次取最大值；每次之前重新排空。';
    }else{
      el('conclusion').textContent='这一口气累计为 '+state.target+' mL，气流结束后停止增加。';
      el('status').textContent='真实仪器的使用与校准，以厂家说明为准。';
    }
  }
  function begin(){
    reset();state.running=true;el('volume').disabled=true;el('start').disabled=true;el('start').textContent='演示中…';
    el('status').textContent=state.device==='water'?'气体沿长管进入上部，水沿短管排出。':state.device==='bag'?'观察：短直吸管 → 一次呼气 → 拔管密封 → 向内卷袋。':'气流通过感应部件，本次体积持续累计。';
    var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?1600:state.device==='bag'?6600:5600;
    function tick(t){
      if(!state.running)return;if(!state.started)state.started=t;
      var f=Math.min(1,(t-state.started)/duration),flowFraction=state.device==='bag'?Math.min(1,f/.55):f,quantity=state.target*(1-Math.pow(1-flowFraction,1.6));
      paint(quantity,f,true);if(f>=1){finish();return;}state.request=frames(tick);
    }
    state.request=frames(tick);
  }
  Array.prototype.forEach.call(root.querySelectorAll('[data-ins-device]'),function(button){button.addEventListener('click',function(){selectDevice(button.getAttribute('data-ins-device'));});});
  Array.prototype.forEach.call(root.querySelectorAll('[data-ins-hotspot]'),function(node){
    function open(){var key=node.getAttribute('data-ins-hotspot').split('-');if(key[0]!==state.device)return;state.detail=Number(key[1]);describe();}
    node.addEventListener('click',open);node.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  });
  el('close-detail').addEventListener('click',function(){state.detail=null;describe();});
  el('start').addEventListener('click',begin);el('reset').addEventListener('click',reset);
  el('volume').addEventListener('input',reset);el('volume').addEventListener('change',reset);
  document.addEventListener('visibilitychange',function(){if(document.hidden)pause();});
  window.LungInstruments={onShow:function(){describe();paint(state.value,state.phase,state.running);},pause:pause};
  selectDevice('water');
}());
