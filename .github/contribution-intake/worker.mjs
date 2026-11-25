const LIMIT = 5_000_000, BODY_LIMIT = LIMIT + 16_384;
const encoder = new TextEncoder();
const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const common = {
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()','X-Frame-Options':'DENY',
  'X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};
const style = 'html{color-scheme:light}*{box-sizing:border-box}body{font:16px/1.55 system-ui,sans-serif;background:#f3f7f4;color:#18332a;margin:0}main{max-width:680px;margin:30px auto;padding:26px;background:#fff;border:1px solid #dbe6de;border-radius:18px}h1{line-height:1.15}label{display:block;font-weight:650;margin:15px 0}input:not([type=checkbox]),textarea,select{display:block;width:100%;font:inherit;padding:8px;border:1px solid #81998b;border-radius:7px;background:white;color:#18332a}textarea{min-height:65px}fieldset{border:1px solid #81998b;border-radius:8px}button{font:inherit;background:#126047;color:white;border:0;padding:10px 20px;border-radius:8px;font-weight:750}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #367aab}a{color:#126047}small{display:block}pre,li{white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:700px){main{margin:10px;padding:18px}}';
const back = '<a href="https://mutiwangn.github.io/AI-html/">返回课件目录</a>';
function page(title, content, status=200, extra={}, csp='') {
  return new Response('<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safe(title)+'</title><style>'+style+'</style></head><body><main><h1>'+safe(title)+'</h1>'+content+'</main></body></html>',{status,headers:{...common,'Content-Security-Policy':common['Content-Security-Policy']+csp,'Content-Type':'text/html; charset=utf-8',...extra}});
}
const fail=(status,msg)=>page('未提交', '<p>'+safe(msg)+'</p><p><a href="/">返回投稿表</a></p>',status);
const protect=async(a,b)=>{
  if(typeof a!=='string'||typeof b!=='string'||a.length>160||b.length<10)return false;
  const x=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(a)));
  const y=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(b)));
  let d=0; for(let i=0;i<x.length;i++)d|=x[i]^y[i]; return !d;
};
async function readBounded(request, max=BODY_LIMIT) {
  if(Number(request.headers.get('Content-Length')||0)>max) return null;
  const reader=request.body?.getReader(); if(!reader)return null;
  let chunks=[], size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){try{await reader.cancel()}catch{}return null}chunks.push(value)}
  return new Response(new Blob(chunks),{headers:{'Content-Type':request.headers.get('Content-Type')}});
}
const VIEWER='https://aihtml-community.mutiwangn.workers.dev';
const tiers=['初步感知','原理解读','实验操作','观察记录','互动游戏','综合应用'];
const licenses={site:'仅授权本站展示，不授权站外再发布',by:'CC BY 4.0（允许分享与改编，须署名）',bync:'CC BY-NC 4.0（限非商业分享与改编，须署名）'};
const cookieName='__Host-aihtml-contributor';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const ttl=1800;
const ip=r=>r.headers.get('CF-Connecting-IP')||'unknown';
const same=(r,u)=>r.headers.get('Origin')===u.origin;
const throttle=()=>page('操作过于频繁','<p>请稍后再试。</p>',429,{'Retry-After':'60'});
function signKey(env){return crypto.subtle.importKey('raw',encoder.encode(env.PILOT_CODE),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function contributorCookie(env){
  const payload=String(Math.floor(Date.now()/1000)+ttl)+'.'+crypto.randomUUID();
  const raw=new Uint8Array(await crypto.subtle.sign('HMAC',await signKey(env),encoder.encode(payload)));
  return payload+'.'+Array.from(raw,b=>b.toString(16).padStart(2,'0')).join('');
}
async function contributor(req,env){
  if(typeof env.PILOT_CODE!=='string'||env.PILOT_CODE.length<10)return false;
  const raw=(req.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
  const match=raw.match(/^(\d{10})\.([0-9a-f-]{36})\.([0-9a-f]{64})$/);
  if(!match)return false;
  const now=Math.floor(Date.now()/1000),exp=Number(match[1]);
  if(exp<=now||exp>now+ttl)return false;
  return crypto.subtle.verify('HMAC',await signKey(env),Uint8Array.from(match[3].match(/../g),s=>parseInt(s,16)),encoder.encode(match[1]+'.'+match[2]));
}
function entry(){
  return page('投稿互动课件','<p>输入邀请码即可投稿。不需要 GitHub 账号。</p><form action="/enter" method="post"><label>邀请码<input type="password" name="code" required maxlength="64" autocomplete="off"></label><button>进入投稿</button></form><p>'+back+' · <a href="/review">管理员后台</a></p>');
}
function compose(){
  return page('投稿互动课件', `<p>填写下方四项，发布后会直接出现在 AI HTML 首页的「教师投稿」。课件名称从 HTML 的标题读取。</p>
<form action="/submit" method="post" enctype="multipart/form-data">
<label>署名（可用笔名）<input name="author" required maxlength="30" autocomplete="nickname"></label>
<label>单一 HTML 源文件（≤5 MB）<input id="lesson-file" name="file" type="file" accept=".html,.htm,text/html" required></label>
<label>授权范围<select name="license" required><option value="">请选择</option>${Object.entries(licenses).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')}</select></label>
<label>课件使用层次<select name="tier" required><option value="">请选择</option>${tiers.map(x=>'<option>'+x+'</option>').join('')}</select></label>
<p><small>请上传 UTF-8 单文件 HTML（5,000,000 字节以内），将图片、音频等内嵌。隔离播放不允许联网、麦克风、摄像头或本地存储。不上传学生姓名、照片、课堂记录或密钥。点击「直接发布」表示你有权公开该文件及素材，并同意以所选授权、署名公开。本区未经人工审核，管理员可下架。</small></p>
<button>直接发布</button>
</form><p>${back}</p><script src="/form.js" defer></script>`,200,{},"; script-src 'self'");
}
async function enter(req,env,url){
  if(!same(req,url))return fail(403,'请从邀请码页面提交。');
  const [client,location]=await Promise.all([env.ENTRY_LIMIT.limit({key:'enter:'+ip(req)}),env.ENTRY_GLOBAL.limit({key:'enter-all'})]);
  if(!client.success||!location.success)return throttle();
  if(!/^application\/x-www-form-urlencoded\b/i.test(req.headers.get('Content-Type')||''))return fail(400,'请从邀请码页面提交。');
  const body=await readBounded(req,2048);
  if(!body)return fail(400,'邀请码无效。');
  const code=new URLSearchParams(await body.text()).get('code')?.trim();
  if(!await protect(code,env.PILOT_CODE))return fail(403,'邀请码不正确。');
  const sig=await contributorCookie(env);
  return new Response(null,{status:303,headers:{...common,Location:'/','Set-Cookie':cookieName+'='+sig+'; Max-Age='+ttl+'; Path=/; Secure; HttpOnly; SameSite=Strict'}});
}
function inferTitle(html,file){
  const m=html.slice(0,32768).match(/<title(?:\s[^>]*)?>([\s\S]{0,300}?)<\/title\s*>/i);
  const raw=m?.[1]?.replace(/<[^>]*>/g,'').replace(/&(amp|lt|gt|quot|apos);/g,(_,v)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[v]);
  return (raw?.trim()||file.name.replace(/\.html?$/i,'')).replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]+/g,' ').trim().slice(0,64)||'互动课件';
}
async function submit(req,env,url){
  if(!same(req,url)||!await contributor(req,env))return fail(403,'请先从投稿入口输入邀请码。');
  const [client,location]=await Promise.all([env.ENTRY_LIMIT.limit({key:'publish:'+ip(req)}),env.ENTRY_GLOBAL.limit({key:'publish-all'})]);
  if(!client.success||!location.success)return throttle();
  if(!/^multipart\/form-data;\s*boundary=/i.test(req.headers.get('Content-Type')||''))return fail(400,'请从投稿页面提交。');
  let data;
  try{const body=await readBounded(req);if(!body)return fail(413,'单个文件不得超过 5 MB。');data=await body.formData()}catch{return fail(400,'无法读取文件，请重新选择。')}
  const val=k=>typeof data.get(k)==='string'?data.get(k).trim():'';
  const files=data.getAll('file'),file=files[0];
  if(files.length!==1||typeof file?.size!=='number'||!file.size||!/\.html?$/i.test(file.name))return fail(400,'请提交一份 HTML（.html 或 .htm）。');
  if(file.size>LIMIT)return fail(413,'单个文件不得超过 5 MB（5,000,000 字节）。');
  const author=val('author'),tier=val('tier'),license=val('license');
  if(!author||author.length>30||/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/.test(author)||!tiers.includes(tier)||!Object.hasOwn(licenses,license))return fail(422,'请检查署名、授权范围和使用层次。');
  const bytes=await file.arrayBuffer();let html;
  try{html=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{return fail(422,'请把文件另存为 UTF-8 编码的 HTML。')}
  if(html.includes('\0')||!/^\s*(?:<!--[\s\S]*?-->\s*)*(?:<!doctype\s+html\b|<html[\s>])/i.test(html.slice(0,8192)))return fail(422,'请上传完整 HTML 文档。');
  const title=inferTitle(html,file),id=crypto.randomUUID(),key='html:'+id;
  const count=await env.COMMUNITY_DB.prepare('SELECT count(*) AS n FROM submissions').first();
  if(count.n>=60)return fail(503,'投稿区已满，请联系管理员。');
  await env.COMMUNITY_FILES.put(key,bytes);
  try{await env.COMMUNITY_DB.prepare('INSERT INTO submissions(id,title,author,tier,license,created_at,bytes) VALUES(?,?,?,?,?,?,?)').bind(id,title,author,tier,license,Date.now(),bytes.byteLength).run();}
  catch(e){await env.COMMUNITY_FILES.delete(key).catch(()=>{});return fail(503,'未能发布课件，请稍后重试。');}
  return page('课件已发布','<p>'+safe(title)+' 已列入教师投稿区。</p><p><a href="'+VIEWER+'/play/'+id+'">打开课件</a> · '+back+'</p>',201);
}
function reviewLine(m,key) {
  const names={network:'联网',microphone:'麦克风',camera:'摄像头'};
  return '<li><strong>'+safe(m.title)+'</strong> · '+safe(m.grade+m.semester+' '+m.lesson+' · '+m.kind)+'<br>署名：'+safe(m.author)+' · 联系：'+safe(m.contact||'未填写')+'<br>'+safe(m.description)+'<br>授权：'+safe(m.license)+'<br>声明：'+safe((m.requirements||[]).map(k=>names[k]).join('、')||'无')+'<br>编号：'+safe(m.id)+' · '+safe(m.at)+' · '+safe(m.bytes)+' 字节<br><a href="/review/download?key='+encodeURIComponent(key)+'">下载原稿（不在线预览）</a></li>';
}
async function review(req,env,url) {
  const auth = req.headers.get('authorization')||'';
  let user='', pass='';
  try{if(/^Basic /i.test(auth)){const s=atob(auth.slice(6));const p=s.indexOf(':');if(p>=0){user=s.slice(0,p);pass=s.slice(p+1)}}}catch{}
  if(!env.REVIEW_USER || user!==env.REVIEW_USER || !await protect(pass,env.REVIEW_PASSWORD)) {
    const ip=req.headers.get('CF-Connecting-IP')||'unknown';
    const [client, location]=await Promise.all([env.REVIEW_CLIENT_LIMIT.limit({key:'client:'+ip}),env.REVIEW_LOCATION_LIMIT.limit({key:'review-failed'})]);
    if(!client.success || !location.success) return page('登录尝试过多','<p>请稍后再试。</p>',429,{'Retry-After':'60'});
    return page('维护者登录','<p>需要独立的审核凭据。</p>',401,{'WWW-Authenticate':'Basic realm="AI HTML private review", charset="UTF-8"'});
  }
  if(req.method==='POST'){
    if(!same(req,url))return fail(403,'请从管理员后台下架课件。');
    if(!/^application\/x-www-form-urlencoded\b/i.test(req.headers.get('Content-Type')||''))return fail(400,'请求无效。');
    const body=await readBounded(req,2048);if(!body)return fail(400,'请求无效。');
    const fields=new URLSearchParams(await body.text()),id=fields.get('id');
    if(!uuid.test(id||''))return fail(400,'课件编号无效。');
    if(fields.get('confirm')!=='yes')return page('确认删除课件','<p>删除后，课件将从首页消失，播放链接也会失效。</p><form method="post" action="/review/delete"><input type="hidden" name="id" value="'+id+'"><input type="hidden" name="confirm" value="yes"><button>确认删除</button></form><p><a href="/review">取消并返回</a></p>');
    await env.COMMUNITY_DB.prepare('DELETE FROM submissions WHERE id = ?').bind(id).run();
    let message='已下架，首页和播放链接不再提供该课件。';
    try{await env.COMMUNITY_FILES.delete('html:'+id);}catch{message='已下架，播放链接已失效，后台文件清理暂未完成。';}
    return page('课件已删除','<p>'+message+'</p><p><a href="/review">返回管理员后台</a></p>');
  }
  if(url.pathname==='/review/download'){
    const key=url.searchParams.get('key')||'';
    if(!/^submission:\d{13}:[\da-f-]{36}$/.test(key)) return fail(404,'找不到该稿件。');
    const entry=await env.INBOX.getWithMetadata(key,{type:'arrayBuffer'});
    if(!entry.value)return fail(404,'稿件不存在或已超过保留期。');
    const id=key.split(':').at(-1);
    return new Response(entry.value,{headers:{...common,'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="submission-'+id+'.html"','Content-Security-Policy':"sandbox; default-src 'none'"}});
  }
  const cursor=url.searchParams.get('cursor');
  if(cursor&&cursor.length>2000)return fail(400,'翻页参数无效。');
  const {keys,list_complete,cursor:next}=await env.INBOX.list({prefix:'submission:',limit:50,...(cursor?{cursor}:{})});
  const entries=keys.reverse().filter(x=>x.metadata).map(x=>reviewLine(x.metadata,x.name));
  const {results}=await env.COMMUNITY_DB.prepare('SELECT id,title,author,tier,created_at FROM submissions ORDER BY created_at DESC,id DESC LIMIT 60').all();
  const live=results.map(r=>'<li><a href="'+VIEWER+'/play/'+r.id+'">'+safe(r.title)+'</a> · '+safe(r.author)+' · '+safe(r.tier)
    +'<form method="post" action="/review/delete"><input type="hidden" name="id" value="'+r.id+'"><button>删除</button></form></li>');
  return page('投稿管理','<h2>已公开的教师投稿</h2><p>新投稿无需审核，异常稿件可在此删除。</p>'
    +(live.length?'<ul>'+live.join('')+'</ul>':'<p>暂无公开投稿。</p>')
    +'<h2>旧版待审稿</h2><p>旧稿仍私密，不会自动公开。</p>'
    +(entries.length?'<ul>'+entries.join('')+'</ul>':'<p>暂无旧稿。</p>')
    +(!list_complete&&next?'<p><a href="/review?cursor='+encodeURIComponent(next)+'">旧稿下一页</a></p>':''));
}
export default {async fetch(req,env){
  const url=new URL(req.url);
  try{
    if(req.method==='GET'&&url.pathname==='/')return await contributor(req,env)?compose():entry();
    if(req.method==='POST'&&url.pathname==='/enter')return await enter(req,env,url);
    if(req.method==='GET'&&url.pathname==='/form.js')return new Response(
      "const input=document.getElementById('lesson-file');input.addEventListener('change',()=>{const file=input.files[0];input.setCustomValidity(file && file.size > 5000000 ? '单个课件不得超过 5 MB。' : '');if(!input.validity.valid)input.reportValidity()});",
      {headers:{...common,'Content-Type':'text/javascript; charset=utf-8'}});
    if(req.method==='POST'&&url.pathname==='/submit')return await submit(req,env,url);
    if(req.method==='GET'&&['/review','/review/download'].includes(url.pathname))return await review(req,env,url);
    if(req.method==='POST'&&url.pathname==='/review/delete')return await review(req,env,url);
    return fail(404,'该入口不存在。');
  }catch{return fail(503,'服务暂不可用，请稍后重试。')}
}};

