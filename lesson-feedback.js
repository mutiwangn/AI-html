/* Anonymous browser likes: not a count of unique people. ES5-compatible catalogue UI. */
(function(w,d){'use strict';
 var api=(w.AIHTML_FEEDBACK_API||'').replace(/\/$/,''), metadata=w.AIHTML_METADATA||{};
 var key='aihtml-anonymous-visitor-v1', voteKey='aihtml-liked-resources-v1';
 var pending={},counts={},liked={};
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function restore(){try{liked=JSON.parse(w.localStorage.getItem(voteKey)||'{}')||{};}catch(e){liked={};}}
 restore();
 function date(iso){var n=new Date(new Date(iso).getTime()+8*3600000);function p(v){return ('0'+v).slice(-2);}return n.getUTCFullYear()+'-'+p(n.getUTCMonth()+1)+'-'+p(n.getUTCDate())+' '+p(n.getUTCHours())+':'+p(n.getUTCMinutes());}
 function visitor(){var value=w.localStorage.getItem(key);if(!/^[a-f0-9]{32}$/.test(value||'')){if(!w.crypto||!w.crypto.getRandomValues)throw Error('请使用支持安全随机数的浏览器');var a=new Uint8Array(16);w.crypto.getRandomValues(a);value=Array.prototype.map.call(a,function(n){return ('0'+n.toString(16)).slice(-2);}).join('');w.localStorage.setItem(key,value);}if(w.localStorage.getItem(key)!==value)throw Error('浏览器未允许保存点赞记录');return value;}
 function request(method,path,body,callback){var xhr=new XMLHttpRequest();xhr.open(method,api+path,true);xhr.timeout=12000;if(body)xhr.setRequestHeader('Content-Type','application/json');xhr.onload=function(){var data;try{data=JSON.parse(xhr.responseText);}catch(e){callback('服务暂不可用');return;}if(xhr.status<200||xhr.status>=300){callback(xhr.status===429?'操作较频繁，请稍后再试':'服务暂不可用');return;}callback(null,data);};xhr.onerror=xhr.ontimeout=function(){callback('网络未连接，请稍后重试');};xhr.send(body?JSON.stringify(body):null);}
 function paint(root){var buttons=(root||d).querySelectorAll('[data-like-id]');Array.prototype.forEach.call(buttons,function(b){var id=b.getAttribute('data-like-id'), n=counts[id];b.disabled=!api||!!pending[id]||!!liked[id];b.setAttribute('aria-pressed',liked[id]?'true':'false');b.textContent=(pending[id]?'提交中':liked[id]?'已赞':'赞')+' · '+(typeof n==='number'?n:'—');if(!api)b.textContent='点赞待启用';});}
 function message(button,text){var el=button.parentNode.querySelector('.feedback-message');if(el)el.textContent=text;}
 function click(event){var button=event.currentTarget,id=button.getAttribute('data-like-id'),v;if(!api||pending[id]||liked[id])return;try{v=visitor();}catch(e){message(button,'需要允许浏览器保存记录才能点赞');return;}
  pending[id]=true;message(button,'');paint();request('POST','/likes',{resource:id,visitor:v},function(error,data){delete pending[id];if(error){message(button,error+'，未增加本地计数');paint();return;}if(!data||!data.liked||typeof data.count!=='number'||data.count<0){message(button,'返回数据异常，请稍后重试');paint();return;}counts[id]=data.count;liked[id]=true;try{w.localStorage.setItem(voteKey,JSON.stringify(liked));}catch(e){}message(button,data.already?'本浏览器已赞过，谢谢支持':'感谢支持');paint();});
 }
 w.AIHTMLFeedback={
  render:function(href){var m=metadata[href];if(!m)return '<aside class="resource-feedback"><span class="resource-updated">更新时间待核实</span></aside>';
   return '<aside class="resource-feedback"><time class="resource-updated" datetime="'+esc(m.updatedAt)+'" title="课件入口文件最近一次提交时间，北京时间">最近更新<br>'+date(m.updatedAt)+'</time><button type="button" class="resource-like" data-like-id="'+m.id+'" aria-pressed="false" title="免登录点赞；同一浏览器每份课件一次，清除数据或换设备后可能重复">赞 · —</button><small class="feedback-scope">免登录 · 每浏览器一次</small><small class="feedback-message" role="status" aria-live="polite"></small></aside>';
  },
  mount:function(root){var list=[],buttons=root.querySelectorAll('[data-like-id]');Array.prototype.forEach.call(buttons,function(b){if(!b._likeBound){b.addEventListener('click',click);b._likeBound=true;}var id=b.getAttribute('data-like-id');if(list.indexOf(id)<0)list.push(id);});paint(root);if(!api||!list.length)return;
   // One request per visible book, bounded to the service's batch limit.
   for(var i=0;i<list.length;i+=100)(function(ids){request('GET','/counts?ids='+ids.join(','),null,function(error,data){if(error){Array.prototype.forEach.call(buttons,function(b){message(b,error);});return;}if(data&&data.counts)Object.keys(data.counts).forEach(function(id){var n=data.counts[id];if(typeof n==='number'&&n>=0)counts[id]=n;});paint(root);});})(list.slice(i,i+100));
  }
 };
 w.addEventListener('storage',function(event){if(event.key===voteKey){restore();paint();}});
})(window,document);
