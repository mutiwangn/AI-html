import allowed from './allowed.json' with {type:'json'};
const ids = new Set(allowed);
const ORIGIN = 'https://mutiwangn.github.io';
const HEX = /^[a-f0-9]{32}$/;
const encode = new TextEncoder();
function reply(data,status=200) {return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':ORIGIN,'vary':'Origin','cache-control':'no-store','x-content-type-options':'nosniff'}});}
export default {
 async fetch(request,env) {
  const url=new URL(request.url), origin=request.headers.get('Origin');
  if(origin && origin!==ORIGIN) return reply({error:'origin_not_allowed'},403);
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:{'access-control-allow-origin':ORIGIN,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type','access-control-max-age':'600','vary':'Origin'}});
  try {
   const ip=request.headers.get('CF-Connecting-IP')||'unknown';
   if(!(await env.IP_LIMIT.limit({key:ip})).success) return reply({error:'rate_limited'},429);
   if(url.pathname==='/health'&&request.method==='GET') return reply({ok:true,version:1});
   if(url.pathname==='/counts'&&request.method==='GET') {
    const raw=url.searchParams.get('ids')||'';
    if(raw.length>3300) return reply({error:'invalid_ids'},400);
    const selected=[...new Set(raw.split(','))];
    if(!selected.length||selected.length>100||selected.some(id=>!HEX.test(id)||!ids.has(id))) return reply({error:'invalid_ids'},400);
    const marks=selected.map(()=>'?').join(',');
    const rows=await env.DB.prepare(`SELECT resource_id, count FROM resources WHERE resource_id IN (${marks})`).bind(...selected).all();
    const counts={}; for(const row of rows.results) counts[row.resource_id]=row.count;
    return reply({counts});
   }
   if(url.pathname==='/likes'&&request.method==='POST') {
    if(origin!==ORIGIN) return reply({error:'origin_required'},403);
    if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||'')) return reply({error:'json_required'},415);
    // Read at most 2048 bytes, even without Content-Length.
    const reader=request.body?.getReader(); if(!reader) return reply({error:'invalid_body'},400);
    let size=0,chunks=[]; while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>2048){await reader.cancel();return reply({error:'body_too_large'},413);}chunks.push(chunk.value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    let body; try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply({error:'invalid_json'},400);}
    const {resource,visitor}=body||{};
    if(!HEX.test(resource)||!ids.has(resource)) return reply({error:'unknown_resource'},404);
    if(!HEX.test(visitor)) return reply({error:'invalid_visitor'},400);
    if(!(await env.VISITOR_LIMIT.limit({key:visitor})).success) return reply({error:'rate_limited'},429);
    const digest=await crypto.subtle.digest('SHA-256',encode.encode(resource+':'+visitor));
    const voter=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
    const result=await env.DB.batch([
     env.DB.prepare('INSERT OR IGNORE INTO likes(resource_id,voter_hash) SELECT resource_id,? FROM resources WHERE resource_id=?').bind(voter,resource),
     env.DB.prepare('SELECT count FROM resources WHERE resource_id=?').bind(resource)
    ]);
    if(!result[1].results.length) return reply({error:'resource_not_ready'},503);
    return reply({count:result[1].results[0].count,liked:true,already:result[0].meta.changes===0});
   }
   return reply({error:'not_found'},404);
  } catch(error) {console.error(JSON.stringify({event:'feedback_error',type:error?.name||'Error'}));return reply({error:'temporarily_unavailable'},503);}
 }
};
