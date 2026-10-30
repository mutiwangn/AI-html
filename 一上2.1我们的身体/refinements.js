/* Classroom refinements: real media, observation position, accessible controls. */
(function(){
  if(!window.BODY_OFFLINE){DATA.heart='heart.mp3';DATA.breath='breath.mp3';}
  function accessibleFigures(){
    all('.figurebox > svg,.detail-art > svg,.animalart > svg').forEach(function(s){s.removeAttribute('aria-hidden');s.setAttribute('role','group');});
    all('[data-method]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.method===method?'true':'false');});
    all('[data-layer]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.layer===layer?'true':'false');});
    all('[data-animal]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.animal===animal?'true':'false');});
  }
  var originalObserve=drawObserve;
  drawObserve=function(){
    if(method==='listen')back=obsPart==='lungs';
    else if(method!=='look')back=false;
    originalObserve();E('turnBody').hidden=method!=='look';
    if(method==='listen'&&obsPart==='lungs')E('observeDetail').querySelector('.caption').textContent='呼吸示范音 · 不是肺部听诊音';
    accessibleFigures();
  };
  var originalInside=drawInside;
  drawInside=function(){originalInside();accessibleFigures();};
  var originalCompare=drawCompare;
  drawCompare=function(){originalCompare();accessibleFigures();};
  var originalBend=runBend;
  runBend=function(container,muscle,knee){
    if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){
      armAngle=armAngle?0:(knee?60:90);
      E(container).querySelector('.detail-art').innerHTML=jointDiagram(muscle,armAngle,knee);accessibleFigures();
    }else originalBend(container,muscle,knee);
  };
  all('.tabs button').forEach(function(b,i){
    b.setAttribute('aria-controls','page'+i);
    b.addEventListener('keydown',function(e){
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
        e.preventDefault();var n=(i+(e.key==='ArrowRight'?1:2))%3;changePage(n);all('.tabs button')[n].focus();
      }
    });
  });
  E('modal').addEventListener('keydown',function(e){
    if(e.key!=='Tab')return;
    var focusables=E('modal').querySelectorAll('button,a[href]');
    if(!focusables.length)return;
    var first=focusables[0],last=focusables[focusables.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  drawObserve();
})();
