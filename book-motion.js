/* Shelf pickup and page opening. Decorative CSS animation; all navigation remains semantic. */
(function(){'use strict';
var ownNavigation=false,busy=false,overlay=null,timers=[],source=null,reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
function cancel(){timers.forEach(clearTimeout);timers=[];if(overlay&&overlay.parentNode)overlay.parentNode.removeChild(overlay);overlay=null;if(source)source.style.opacity='';source=null;busy=false;document.body.classList.remove('book-in-transit');}
function later(fn,ms){timers.push(setTimeout(fn,ms));}
function closest(el,selector){while(el&&el!==document){if(el.matches&&el.matches(selector))return el;el=el.parentNode;}return null;}
function make(img,rect,title,units){
 var wrap=document.createElement('div');wrap.className='book-flight';wrap.setAttribute('aria-hidden','true');
 wrap.style.cssText='left:'+rect.left+'px;top:'+rect.top+'px;width:'+rect.width+'px;height:'+rect.height+'px';
 var pages=document.createElement('div');pages.className='flight-pages';var heading=document.createElement('strong');heading.textContent=title;pages.appendChild(heading);var caption=document.createElement('small');caption.textContent='单元目录';pages.appendChild(caption);
 units.forEach(function(u){var row=document.createElement('span');row.textContent=('0'+u.number).slice(-2)+'  '+u.title;pages.appendChild(row);});
 var cover=document.createElement('div');cover.className='flight-cover';var image=img.cloneNode();image.removeAttribute('id');cover.appendChild(image);var inner=document.createElement('div');inner.className='flight-inner';cover.appendChild(inner);wrap.appendChild(pages);wrap.appendChild(cover);document.body.appendChild(wrap);return wrap;
}
function pickup(link,event){
 var entry=closest(link,'[data-book]');var img=entry&&entry.querySelector('.book-cover-link img');if(!img||!img.complete||!img.naturalWidth)return;
 if(busy){event.preventDefault();return;}if(reduce.matches||document.body.getAttribute('data-motion')==='paused')return;
 event.preventDefault();busy=true;source=img;var href=link.getAttribute('href'),id=entry.getAttribute('data-book');var book=(window.AIHTML_CURRICULUM.books||[]).filter(function(b){return b.id===id;})[0];var r=img.getBoundingClientRect();overlay=make(img,r,book?book.title:img.alt,book?book.units:[]);source.style.opacity='.16';document.body.classList.add('book-in-transit');
 var scale=Math.min(innerWidth<700?1.16:1.32,innerHeight*.64/r.height,(innerWidth*.38)/r.width);var dx=innerWidth*.49-r.left-r.width/2,dy=innerHeight*.49-r.top-r.height/2;
 var slow=location.search.indexOf('motion=slow')!==-1;var duration=slow?3400:450;overlay.style.setProperty('--flight-duration',duration+'ms');
 requestAnimationFrame(function(){if(!overlay)return;overlay.classList.add('is-picked');overlay.style.transform='translate('+dx+'px,'+dy+'px) scale('+scale+') rotate(-2deg)';});
 later(function(){if(overlay)overlay.classList.add('is-open');},duration*.8);
 later(function(){ownNavigation=true;window.location.hash=href;},duration*1.8);
 later(function(){if(overlay)overlay.classList.add('is-leaving');},duration*1.95);
 later(cancel,duration*2.3);
}
document.addEventListener('click',function(e){var link=closest(e.target,'.book-cover-link');if(link&&document.body.getAttribute('data-view')==='library')pickup(link,e);else if(busy&&closest(e.target,'a,button'))cancel();},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&busy){cancel();e.preventDefault();}},true);
document.addEventListener('aihtml:motion',function(e){if(e.detail.paused&&busy)cancel();});
window.addEventListener('hashchange',function(){if(busy&&!ownNavigation)cancel();ownNavigation=false;});window.addEventListener('pagehide',cancel);window.addEventListener('resize',function(){if(busy)cancel();});
})();
