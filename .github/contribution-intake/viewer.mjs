const HOME='https://mutiwangn.github.io/AI-html/';
const cors='https://mutiwangn.github.io';
const idRe=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const license={site:'仅授权本站展示',by:'CC BY 4.0',bync:'CC BY-NC 4.0'};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()','X-Robots-Tag':'noindex, nofollow',
  'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"};
const style='*{box-sizing:border-box}body{margin:0;background:#f4f8f6;color:#17322b;font:15px/1.45 system-ui,sans-serif}main{margin:0 auto;max-width:980px;padding:18px}a{color:#126047}li{margin:10px 0;overflow-wrap:anywhere}h1{margin:5px 0;overflow-wrap:anywhere}header{padding:9px 14px;background:#f4f8f6;overflow-wrap:anywhere}iframe{display:block;width:100%;height:calc(100dvh - 88px);min-height:400px;border:0;background:white}small{display:block}';
function page(title,body,status=200) {
  return new Response('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(title)+'</title><style>'+style+'</style><body>'+body+'</body></html>',{status,headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
}
export default {async fetch(req,env) {
  const u=new URL(req.url); if(req.method!=='GET')return new Response(null,{status:405,headers});
  try {
    if(u.pathname==='/'||u.pathname==='/api/catalog'){
      const {results}=await env.COMMUNITY_DB.prepare('SELECT id,title,author,tier,license FROM submissions ORDER BY created_at DESC,id DESC LIMIT 60').all();
      if(u.pathname==='/api/catalog')return Response.json({items:results.map(r=>({...r,license:license[r.license]}))},{headers:{...headers,'Access-Control-Allow-Origin':cors}});
      const cards=results.map(r=>'<li><a href="/play/'+r.id+'">'+escape(r.title)+'</a> · '+escape(r.author)+' · '+escape(r.tier)+' · '+escape(license[r.license])+'</li>');
      return page('教师投稿课件','<main><p><a href="'+HOME+'">返回 AI HTML 首页</a></p><h1>教师投稿课件</h1><p>以下为教师自行提交的课件，未经平台审核。</p>'+(cards.length?'<ul>'+cards.join('')+'</ul>':'<p>暂时没有投稿。</p>')+'</main>');
    }
    const m=u.pathname.match(/^\/(play|file)\/([^/]+)$/); if(!m||!idRe.test(m[2]))return page('课件不可用','<main><p>未找到课件。</p><a href="/">返回教师投稿</a></main>',404);
    const row=await env.COMMUNITY_DB.prepare('SELECT id,title,author,tier,license FROM submissions WHERE id = ?').bind(m[2]).first();
    if(!row)return page('课件不可用','<main><p>此课件不存在或已下架。</p><a href="/">返回教师投稿</a></main>',404);
    if(m[1]==='play')return page(row.title,'<header><a href="/">教师投稿</a> · <strong>'+escape(row.title)+'</strong> · '+escape(row.author)+' · '+escape(row.tier)+' · '+escape(license[row.license])+'<small>未经平台审核；隔离播放不开放联网、摄像头、麦克风或本地存储。</small></header><iframe title="互动课件" sandbox="allow-scripts" allowfullscreen src="/file/'+row.id+'"></iframe>');
    if(req.headers.get('Sec-Fetch-Dest')!=='iframe'||req.headers.get('Sec-Fetch-Site')!=='same-origin')return new Response('Open the lesson player instead.',{status:403,headers});
    const blob=await env.COMMUNITY_FILES.get('html:'+row.id,{type:'stream'});
    if(!blob)return page('正在同步','<main>课件刚上传，正文可能仍在同步。请稍后刷新播放页。</main>',503);
    return new Response(blob,{headers:{...headers,'Content-Type':'text/html; charset=utf-8',
      'Content-Security-Policy':"sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; worker-src 'none'; frame-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'"}});
  }catch(e){return page('暂不可用','<main>课件列表暂不可用，请稍后刷新。</main>',503);}
}};
