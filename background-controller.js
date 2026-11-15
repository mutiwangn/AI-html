/* Unit-keyed backgrounds, no preload storm and no navigation on hover. */
(function(){'use strict';
var map=window.AIHTML_UNIT_BACKGROUNDS||{},host=document.querySelector('.atmosphere');if(!host)return;
var layers=[document.createElement('div'),document.createElement('div')];layers.forEach(function(el){el.className='atmosphere-layer';host.appendChild(el)});
var front=0,shown='',selected='1-up-1',preview='',timer=null,revision=0,cache={},cacheOrder=[],lastByBook={};
function hashKey(){var m=location.hash.match(/^#book-(\d-(?:up|down))(?:\/unit-(\d+))?/);if(m)return m[1]+'-'+(m[2]||lastByBook[m[1]]||1);return location.hash==='#books-down'?'1-down-1':'1-up-1'}
function elementKey(el){if(!el||!el.closest)return '';var link=el.closest('.book-unit-link');if(link){var m=(link.getAttribute('href')||'').match(/book-(\d-(?:up|down))\/unit-(\d+)/);return m?m[1]+'-'+m[2]:''}var summary=el.closest('.unit-summary');if(summary){var b=location.hash.match(/^#book-(\d-(?:up|down))/);var d=summary.closest('[data-unit]');return b&&d?b[1]+'-'+d.getAttribute('data-unit'):''}return ''}
function load(key){if(cache[key])return cache[key];cache[key]=new Promise(function(resolve){var im=new Image;im.onload=function(){cacheOrder.push(key);while(cacheOrder.length>6){var stale=cacheOrder.shift();if(stale!==key)delete cache[stale]}resolve(im)};im.onerror=function(){delete cache[key];resolve(null)};im.decoding='async';im.src=map[key].url});return cache[key]}
function show(key){if(!map[key]||shown===key)return;var ticket=++revision;load(key).then(function(im){if(!im||ticket!==revision)return;var next=1-front;layers[next].style.backgroundImage='url("'+map[key].url+'")';layers[next].classList.add('is-visible');layers[front].classList.remove('is-visible');front=next;shown=key;document.body.setAttribute('data-background-unit',key);document.body.setAttribute('data-background-title',map[key].title)})}
function queue(key,delay){clearTimeout(timer);++revision;timer=setTimeout(function(){show(key)},delay)}
function choose(key){if(!map[key])return;selected=key;var parts=key.split('-');lastByBook[parts[0]+'-'+parts[1]]=parts[2];preview='';queue(selected,0)}
function enter(key){if(!key||!map[key]||preview===key)return;preview=key;queue(key,180)}
function leave(){preview='';queue(selected,320)}
document.addEventListener('pointerover',function(e){if(e.pointerType==='touch')return;enter(elementKey(e.target))});
document.addEventListener('pointerout',function(e){if(e.pointerType==='touch')return;var from=elementKey(e.target),to=elementKey(e.relatedTarget);if(from&&from!==to){if(to)enter(to);else leave()}});
document.addEventListener('focusin',function(e){enter(elementKey(e.target))});
document.addEventListener('focusout',function(e){if(elementKey(e.target)&&!elementKey(e.relatedTarget))leave()});
document.addEventListener('click',function(e){var key=elementKey(e.target);if(key)choose(key)},true);
document.addEventListener('toggle',function(e){if(e.target.matches&&e.target.matches('.unit-node')&&e.target.open){var s=e.target.querySelector('.unit-summary');choose(elementKey(s))}},true);
window.addEventListener('hashchange',function(){choose(hashKey())});
window.addEventListener('blur',leave);
choose(hashKey());
})();
