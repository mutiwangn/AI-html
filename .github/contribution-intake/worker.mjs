const LIMIT = 5_000_000, BODY_LIMIT = LIMIT + 16_384, TTL = 30*86400;
const encoder = new TextEncoder();
const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const common = {
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()','X-Frame-Options':'DENY',
  'X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};
const style = 'html{color-scheme:light}*{box-sizing:border-box}body{font:16px/1.55 system-ui,sans-serif;background:#f3f7f4;color:#18332a;margin:0}main{max-width:680px;margin:30px auto;padding:26px;background:#fff;border:1px solid #dbe6de;border-radius:18px}h1{line-height:1.15}label{display:block;font-weight:650;margin:15px 0}input:not([type=checkbox]),textarea,select{display:block;width:100%;font:inherit;padding:8px;border:1px solid #81998b;border-radius:7px;background:white;color:#18332a}textarea{min-height:65px}fieldset{border:1px solid #81998b;border-radius:8px}button{font:inherit;background:#126047;color:white;border:0;padding:10px 20px;border-radius:8px;font-weight:750}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #367aab}a{color:#126047}small{display:block}pre,li{white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:700px){main{margin:10px;padding:18px}}';
const back = '<a href="https://mutiwangn.github.io/AI-html/">返回课件目录</a>';
function page(title, content, status=200, extra={}, csp='') {
  return new Response('<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safe(title)+'</title><style>'+style+'</style></head><body><main><h1>'+safe(title)+'</h1>'+content+'</main></body></html>',{status,headers:{...common,'Content-Security-Policy':common['Content-Security-Policy']+csp,'Content-Type':'text/html; charset=utf-8',...extra}});
}
const grades = ['一','二','三','四','五','六'];
const types = ['原理解读','实验操作','互动游戏','观察记录','其他'];
const opts = (xs)=>'<option value="">请选择</option>'+xs.map(x=>'<option>'+x+'</option>').join('');
const form = `<p>教科版小学科学 · 邀请试投</p>
<p>每次提交一份 UTF-8 单文件 HTML（.html 或 .htm），最大 <strong>5 MB（5,000,000 字节）</strong>。请把必要素材内嵌；如需联网、设备权限或外部素材，请说明。</p>
<p>只有维护者可以查看原稿。投稿不会自动上线；通过审核后，公开版可按填写的署名单独列在对应课时，不覆盖原有课件。待审稿件和表单信息在收稿箱保留 30 天；联系邮箱不公开。请勿提交学生姓名、照片、课堂记录或密钥。</p>
<form action="/submit" method="post" enctype="multipart/form-data">
<label>试投邀请码<input name="code" type="password" required maxlength="64" autocomplete="off"></label>
<label>课件标题<input name="title" required maxlength="48"></label>
<label>年级<select name="grade" required>${opts(grades)}</select></label>
<label>册次<select name="semester" required>${opts(['上册','下册'])}</select></label>
<label>课次（例如 2.8）<input name="lesson" required maxlength="5" pattern="[1-9][0-9]?[.][1-9][0-9]?" placeholder="2.8"></label>
<label>课件用途<select name="kind" required>${opts(types)}</select></label>
<label>一句话教学用途<textarea name="description" required maxlength="120"></textarea></label>
<label>公开署名（可填笔名）<input name="author" required maxlength="30"></label>
<label>联系邮箱（选填，不公开）<input name="contact" type="email" maxlength="100" autocomplete="email"></label>
<label>素材及授权说明<textarea name="license" required maxlength="120" placeholder="请说明是原创，或填写素材来源及许可。"></textarea></label>
<fieldset><legend>用到的功能（没有可不选）</legend><label><input type="checkbox" name="network" value="yes"> 需要联网</label><label><input type="checkbox" name="microphone" value="yes"> 使用麦克风</label><label><input type="checkbox" name="camera" value="yes"> 使用摄像头</label></fieldset>
<label>HTML 文件<input id="lesson-file" name="file" type="file" accept=".html,.htm,text/html" required></label>
<label><input type="checkbox" name="agreement" value="yes" required> 我有权提交本作品及素材，同意审核通过后按上述署名公开课件及其 HTML，不含学生或他人的个人信息。</label>
<button>提交待审核</button>
</form><p>${back}</p><script src="/form.js" defer></script>`;
const fail=(status,msg)=>page('未提交', '<p>'+safe(msg)+'</p><p><a href="/">返回投稿表</a></p>',status);
const protect=async(a,b)=>{
  if(typeof a!=='string'||typeof b!=='string'||a.length>160||b.length<10)return false;
  const x=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(a)));
  const y=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(b)));
  let d=0; for(let i=0;i<x.length;i++)d|=x[i]^y[i]; return !d;
};
async function readBounded(request) {
  if(Number(request.headers.get('Content-Length')||0)>BODY_LIMIT) return null;
  const reader=request.body?.getReader(); if(!reader)return null;
  let chunks=[], size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>BODY_LIMIT){try{await reader.cancel()}catch{}return null}chunks.push(value)}
  return new Response(new Blob(chunks),{headers:{'Content-Type':request.headers.get('Content-Type')}});
}
async function submit(req, env, url) {
  if(req.headers.get('origin')!==url.origin) return fail(403,'请从投稿表提交。');
  if(!/^multipart\/form-data;\s*boundary=/i.test(req.headers.get('Content-Type')||''))return fail(400,'请从投稿表提交。');
  let body, data;
  try{body=await readBounded(req);if(!body)return fail(413,'单个文件不得超过 5 MB。');data=await body.formData()}catch{return fail(400,'无法读取投稿表，请重新选择文件。')}
  const val=k=>typeof data.get(k)==='string'?data.get(k).trim():'';
  if(!await protect(val('code'),env.PILOT_CODE)) return fail(403,'邀请码不正确，或本轮试投尚未开启。');
  const files=data.getAll('file'), file=files[0];
  if(files.length!==1||typeof file?.size!=='number'||!file.size|| !/\.html?$/i.test(file.name))return fail(400,'请提交一份 .html 或 .htm 文件。');
  if(file.size>LIMIT)return fail(413,'单个文件不得超过 5 MB（5,000,000 字节）。');
  const m={title:val('title'), grade:val('grade'), semester:val('semester'), lesson:val('lesson'), kind:val('kind'), description:val('description'), author:val('author'), contact:val('contact'), license:val('license'), requirements:['network','microphone','camera'].filter(k=>val(k)==='yes'), at:new Date().toISOString(), bytes:file.size};
  const required={title:48,description:120,author:30,license:120};
  if(Object.entries(required).some(([k,max])=>!m[k]||m[k].length>max)||
     !grades.includes(m.grade)||!['上册','下册'].includes(m.semester)||!types.includes(m.kind)||
     !/^[1-9]\d?\.[1-9]\d?$/.test(m.lesson)||m.contact.length>100||
     (m.contact&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.contact))||val('agreement')!=='yes')return fail(422,'请检查必填信息、授权确认和课次格式。');
  const bytes=await file.arrayBuffer();
  let html;
  try{html=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{return fail(422,'请把文件另存为 UTF-8 编码的 HTML。')}
  if(html.includes('\0')||!/^\s*(?:<!--[\s\S]*?-->\s*)*(?:<!doctype\s+html\b|<html[\s>])/i.test(html.slice(0,8192)))return fail(422,'文件须是完整 HTML 文档（以 HTML 文档声明或 html 标签开头）。');
  const id=crypto.randomUUID(), key='submission:'+Date.now()+':'+id;
  m.id=id; m.consent='公开课件 HTML、素材授权、不含个人数据，v1';
  if(encoder.encode(JSON.stringify(m)).byteLength>1024)return fail(422,'文字说明过长，请缩短署名或说明后重试。');
  try{await env.INBOX.put(key,bytes,{metadata:m,expirationTtl:TTL})}catch{return fail(503,'收稿箱暂不可用，未确认收件。请稍后重试。')}
  return page('投稿已收到','<p>状态：待审核，尚未发布。</p><p>投稿编号：<strong>'+safe(id)+'</strong></p><p>请留存编号。原稿和表单资料不会公开。</p><p>'+back+'</p>',201);
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
  return page('投稿审核箱','<p>原稿仅供下载、离线审查。审核通过后，由维护者另开 PR 收录。</p>'+
    (entries.length?'<ul>'+entries.join('')+'</ul>':'<p>暂无投稿。</p>')+
    (!list_complete&&next?'<p><a href="/review?cursor='+encodeURIComponent(next)+'">下一页</a></p>':''));
}
export default {async fetch(req,env){
  const url=new URL(req.url);
  try{
    if(req.method==='GET'&&url.pathname==='/')return page('投稿互动课件',form,200,{"Referrer-Policy":"same-origin"},"; script-src 'self'");
    if(req.method==='GET'&&url.pathname==='/form.js')return new Response(
      "const input=document.getElementById('lesson-file');input.addEventListener('change',()=>{const file=input.files[0];input.setCustomValidity(file && file.size > 5000000 ? '单个课件不得超过 5 MB。' : '');if(!input.validity.valid)input.reportValidity()});",
      {headers:{...common,'Content-Type':'text/javascript; charset=utf-8'}});
    if(req.method==='POST'&&url.pathname==='/submit')return await submit(req,env,url);
    if(req.method==='GET'&&['/review','/review/download'].includes(url.pathname))return await review(req,env,url);
    return fail(404,'该入口不存在。');
  }catch{return fail(503,'服务暂不可用，请稍后重试。')}
}};
