/* Run from repository root after checking out full Git history. */
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const html=fs.readFileSync('index.html','utf8');
const books=JSON.parse(html.match(/var books=(.*);\s*window.AIHTMLCatalog/s)[1]);
const result={}; const verified=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2],'utf8')):null;
for(const book of books) for(const r of book.lessons){
 const path=decodeURIComponent(r[4].replace(/^\.\//,'')).replace(/\/$/,'/index.html');
 if(path.startsWith('/')||path.includes('..')||/^https?:/.test(path))throw Error('Unexpected resource path '+path);
 let entry=verified&&verified[path];
 if(!verified){const log=cp.execFileSync('git',['log','-1','--format=%cI %H','--',path],{encoding:'utf8'}).trim().split(' ');entry={updatedAt:log[0],commit:log[1]};}
 if(!entry?.updatedAt||!entry?.commit||isNaN(Date.parse(entry.updatedAt)))throw Error('Missing verified timestamp '+path);
 result[r[4]]={id:crypto.createHash('sha256').update(path).digest('hex').slice(0,32),updatedAt:entry.updatedAt,commit:entry.commit};
}
fs.writeFileSync('lesson-metadata.js','window.AIHTML_METADATA = '+JSON.stringify(result,null,2)+';\n');
const ids=[...new Set(Object.values(result).map(x=>x.id))];
fs.mkdirSync('feedback-backend',{recursive:true}); fs.writeFileSync('feedback-backend/allowed.json',JSON.stringify(ids));
fs.writeFileSync('feedback-backend/seed.sql',ids.map(id=>`INSERT OR IGNORE INTO resources(resource_id) VALUES('${id}');`).join('\n')+'\n');
console.log(`Verified metadata for ${Object.keys(result).length} resource URLs; ${ids.length} identities.`);
