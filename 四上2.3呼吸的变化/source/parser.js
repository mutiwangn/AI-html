/* MUTIW offline WebGL1 engine. Reused from the preceding breathing-organs lesson.
 * Public API: V, M, Node3D, WebGLScene, geometry helpers,
 * parseEmbeddedGLB(base64), cloneNode3D(node,parent), OrbitController.
 * Every GLB mesh is baked to a common Y-up world coordinate system. Each mesh
 * is centred at node.pos, so scale/rotation animate about the mesh's own centre.
 * No textures, network, imports, WebGL2, Draco, or ES2020 syntax are required.
 */
'use strict';
/* A small, dependency-free WebGL renderer. All geometry lives in this HTML file. */
const V={
 add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
 dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 length:a=>Math.hypot(...a),norm:a=>{let d=Math.hypot(...a)||1;return a.map(v=>v/d)},lerp:(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t)
};
const M={
 identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 multiply:(a,b)=>{let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o},
 compose:(p,r,s)=>{let [x,y,z]=r,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);let o=M.identity();o[0]=(cy*cz)*s[0];o[1]=(sx*sy*cz+cx*sz)*s[0];o[2]=(-cx*sy*cz+sx*sz)*s[0];o[4]=-cy*sz*s[1];o[5]=(-sx*sy*sz+cx*cz)*s[1];o[6]=(cx*sy*sz+sx*cz)*s[1];o[8]=sy*s[2];o[9]=-sx*cy*s[2];o[10]=cx*cy*s[2];o[12]=p[0];o[13]=p[1];o[14]=p[2];return o},
 point:(m,p)=>{let w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return [(m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12])/w,(m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13])/w,(m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14])/w]},
 direction:(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2],m[1]*p[0]+m[5]*p[1]+m[9]*p[2],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]],
 perspective:(fov,aspect,near,far)=>{let f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])},
 lookAt:(eye,target)=>{let z=V.norm(V.sub(eye,target)),x=V.norm(V.cross([0,1,0],z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1])},
 inverse:(a)=>{let out=new Float32Array(16),a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];let b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!det)return M.identity();det=1/det;out[0]=(a11*b11-a12*b10+a13*b09)*det;out[1]=(a02*b10-a01*b11-a03*b09)*det;out[2]=(a31*b05-a32*b04+a33*b03)*det;out[3]=(a22*b04-a21*b05-a23*b03)*det;out[4]=(a12*b08-a10*b11-a13*b07)*det;out[5]=(a00*b11-a02*b08+a03*b07)*det;out[6]=(a32*b02-a30*b05-a33*b01)*det;out[7]=(a20*b05-a22*b02+a23*b01)*det;out[8]=(a10*b10-a11*b08+a13*b06)*det;out[9]=(a01*b08-a00*b10-a03*b06)*det;out[10]=(a30*b04-a31*b02+a33*b00)*det;out[11]=(a21*b02-a20*b04-a23*b00)*det;out[12]=(a11*b07-a10*b09-a12*b06)*det;out[13]=(a00*b09-a01*b07+a02*b06)*det;out[14]=(a31*b01-a30*b03-a32*b00)*det;out[15]=(a20*b03-a21*b01+a22*b00)*det;return out},
 normal:(m)=>{let n=M.inverse(m);return new Float32Array([n[0],n[4],n[8],n[1],n[5],n[9],n[2],n[6],n[10]])}
};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),mix=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;
function hexColor(c){if(Array.isArray(c))return c;return [parseInt(c.slice(1,3),16)/255,parseInt(c.slice(3,5),16)/255,parseInt(c.slice(5,7),16)/255]}
function calcNormals(g){let n=new Float32Array(g.p.length);for(let i=0;i<g.i.length;i+=3){let a=g.i[i]*3,b=g.i[i+1]*3,c=g.i[i+2]*3;let ab=[g.p[b]-g.p[a],g.p[b+1]-g.p[a+1],g.p[b+2]-g.p[a+2]],ac=[g.p[c]-g.p[a],g.p[c+1]-g.p[a+1],g.p[c+2]-g.p[a+2]],nn=V.cross(ab,ac);for(let j of [a,b,c]){n[j]+=nn[0];n[j+1]+=nn[1];n[j+2]+=nn[2]}}for(let i=0;i<n.length;i+=3){let d=Math.hypot(n[i],n[i+1],n[i+2])||1;n[i]/=d;n[i+1]/=d;n[i+2]/=d}g.n=n;return g}
function parametric(fn,uSeg=32,vSeg=24,closedU=true){let p=[],i=[];for(let v=0;v<=vSeg;v++)for(let u=0;u<=uSeg;u++)p.push(...fn(u/uSeg,v/vSeg));for(let v=0;v<vSeg;v++)for(let u=0;u<uSeg;u++){let a=v*(uSeg+1)+u,b=a+1,c=a+uSeg+1,d=c+1;i.push(a,b,c,b,d,c)}let g=calcNormals({p:new Float32Array(p),i:new Uint16Array(i)});if(closedU){for(let v=0;v<=vSeg;v++){let a=v*(uSeg+1)*3,b=a+uSeg*3,nn=V.norm([g.n[a]+g.n[b],g.n[a+1]+g.n[b+1],g.n[a+2]+g.n[b+2]]);g.n.set(nn,a);g.n.set(nn,b)}}return g}
function sphereGeom(rx=1,ry=1,rz=1,segments=28,rings=20){return parametric((u,v)=>{let t=u*TAU,f=v*Math.PI;return [rx*Math.sin(f)*Math.cos(t),ry*Math.cos(f),rz*Math.sin(f)*Math.sin(t)]},segments,rings)}
function transformGeom(g,mat){let p=new Float32Array(g.p.length),n=new Float32Array(g.n.length),norm=M.normal(mat);for(let i=0;i<g.p.length;i+=3){p.set(M.point(mat,[g.p[i],g.p[i+1],g.p[i+2]]),i);let a=g.n[i],b=g.n[i+1],c=g.n[i+2];n.set(V.norm([norm[0]*a+norm[3]*b+norm[6]*c,norm[1]*a+norm[4]*b+norm[7]*c,norm[2]*a+norm[5]*b+norm[8]*c]),i)}return {p,n,i:g.i}}
function joinGeom(gs){let p=[],n=[],ind=[],off=0;for(let g of gs){p.push(...g.p);n.push(...g.n);for(let index of g.i)ind.push(index+off);off+=g.p.length/3}if(off>65535)throw Error('Geometry vertex budget exceeded');return {p:new Float32Array(p),n:new Float32Array(n),i:new Uint16Array(ind)}}
function curvePoint(points,t){let q=clamp(t,0,1)*(points.length-1),k=Math.min(points.length-2,Math.floor(q)),f=q-k;let p0=points[Math.max(0,k-1)],p1=points[k],p2=points[k+1],p3=points[Math.min(points.length-1,k+2)];return p1.map((v,j)=>.5*((2*v)+(-p0[j]+p2[j])*f+(2*p0[j]-5*v+4*p2[j]-p3[j])*f*f+(-p0[j]+3*v-3*p2[j]+p3[j])*f*f*f))}
function tubeGeom(points,radius=.05,steps=24,sides=8,endRadius=radius){let centers=[],basis=[];for(let j=0;j<=steps;j++){let t=j/steps,c=curvePoint(points,t),tangent=V.norm(V.sub(curvePoint(points,Math.min(1,t+.002)),curvePoint(points,Math.max(0,t-.002))));let ref=Math.abs(tangent[1])<.95?[0,1,0]:[1,0,0],a=j?V.norm(V.sub(basis[j-1][0],V.mul(tangent,V.dot(basis[j-1][0],tangent)))):V.norm(V.cross(tangent,ref)),b=V.cross(tangent,a);centers.push(c);basis.push([a,b])}return parametric((u,v)=>{let j=Math.round(v*steps),r=mix(radius,endRadius,v),a=basis[j][0],b=basis[j][1],c=centers[j];return V.add(c,V.add(V.mul(a,r*Math.cos(TAU*u)),V.mul(b,r*Math.sin(TAU*u))))},sides,steps)}
function latheGeom(profile,sides=48){profile=profile.slice().sort((a,b)=>b[1]-a[1]);return parametric((u,v)=>{let f=v*(profile.length-1),k=Math.min(profile.length-2,Math.floor(f)),a=profile[k],b=profile[k+1],t=f-k;let r=mix(a[0],b[0],t),y=mix(a[1],b[1],t);return [r*Math.cos(TAU*u),y,r*Math.sin(TAU*u)]},sides,profile.length*3)}
class Node3D{
 constructor(parent=null){this.parent=parent;this.children=[];this.pos=[0,0,0];this.rot=[0,0,0];this.scale=[1,1,1];this.world=M.identity();this.visible=true;this.mesh=null;this.tag='';if(parent)parent.children.push(this)}
 add(g,color='#ffffff',alpha=1,tag='',opts={}){let n=new Node3D(this);n.mesh={g,color:hexColor(color),alpha,...opts};n.tag=tag;return n}
 update(parentWorld=M.identity(),visible=true,list=[]){this.world=M.multiply(parentWorld,M.compose(this.pos,this.rot,this.scale));this.worldVisible=visible&&this.visible;if(this.worldVisible&&this.mesh&&this.mesh.alpha>.001)list.push(this);for(let c of this.children)c.update(this.world,this.worldVisible,list);return list}
}
function parseEmbeddedGLB(input,options){
 options=options||{};
 let raw;
 if(typeof input==='string'){
  let s=input.indexOf(',')>=0?input.slice(input.indexOf(',')+1):input;
  let bin=atob(s),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);raw=bytes.buffer;
 }else if(input instanceof ArrayBuffer){raw=input}
 else if(input&&input.buffer){raw=input.buffer.slice(input.byteOffset||0,(input.byteOffset||0)+input.byteLength)}
 else throw Error('GLB 输入无效');
 const view=new DataView(raw);
 if(view.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2)throw Error('不是 glTF 2.0 GLB 文件');
 if(view.getUint32(8,true)!==view.byteLength)throw Error('GLB 长度不完整');
 let documentData=null,binary=null;
 for(let offset=12;offset+8<=view.byteLength;){
  let length=view.getUint32(offset,true),kind=view.getUint32(offset+4,true);offset+=8;if(offset+length>view.byteLength)throw Error('GLB 数据块越界');
  const bytes=new Uint8Array(raw,offset,length);
  if(kind===0x4e4f534a){
   let json;if(typeof TextDecoder!=='undefined')json=new TextDecoder('utf-8').decode(bytes);else{let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);try{json=decodeURIComponent(escape(s))}catch(e){json=s}}
   documentData=JSON.parse(json.replace(/\u0000+$/,''));
  }else if(kind===0x004e4942)binary=new DataView(raw,offset,length);
  offset+=length;
 }
 if(!documentData||!binary)throw Error('GLB 缺少模型或内嵌数据');
 const doc=documentData,componentSize={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
 function readNumber(offset,type){
  if(type===5120)return binary.getInt8(offset);if(type===5121)return binary.getUint8(offset);
  if(type===5122)return binary.getInt16(offset,true);if(type===5123)return binary.getUint16(offset,true);
  if(type===5125)return binary.getUint32(offset,true);if(type===5126)return binary.getFloat32(offset,true);
  throw Error('不支持的 GLB 分量类型 '+type);
 }
 function normalizeValue(v,type){if(type===5120)return Math.max(-1,v/127);if(type===5121)return v/255;if(type===5122)return Math.max(-1,v/32767);if(type===5123)return v/65535;if(type===5125)return v/4294967295;return v}
 function accessor(index){
  let a=doc.accessors[index];if(!a)throw Error('GLB accessor 缺失 '+index);
  const size=componentSize[a.componentType],width=widths[a.type];if(!size||!width)throw Error('GLB accessor 格式不支持');
  let values=(a.type==='SCALAR'&&!a.normalized&&a.componentType!==5126)?new Uint32Array(a.count):new Float32Array(a.count*width);
  if(a.bufferView!==undefined){
   let b=doc.bufferViews[a.bufferView];if(!b||(b.buffer||0)!==0)throw Error('GLB 需要外部 buffer');
   let start=(b.byteOffset||0)+(a.byteOffset||0),stride=b.byteStride||size*width;
   if(start+(a.count-1)*stride+size*width>binary.byteLength)throw Error('GLB accessor 数据越界');
   for(let r=0;r<a.count;r++)for(let c=0;c<width;c++){let v=readNumber(start+r*stride+c*size,a.componentType);values[r*width+c]=a.normalized?normalizeValue(v,a.componentType):v}
  }
  if(a.sparse){
   const sp=a.sparse,ib=doc.bufferViews[sp.indices.bufferView],vb=doc.bufferViews[sp.values.bufferView],it=sp.indices.componentType,is=componentSize[it];
   if((ib.buffer||0)!==0||(vb.buffer||0)!==0)throw Error('GLB sparse 需要外部 buffer');
   for(let r=0;r<sp.count;r++){let index=readNumber((ib.byteOffset||0)+(sp.indices.byteOffset||0)+r*is,it);for(let c=0;c<width;c++){let v=readNumber((vb.byteOffset||0)+(sp.values.byteOffset||0)+(r*width+c)*size,a.componentType);values[index*width+c]=a.normalized?normalizeValue(v,a.componentType):v}}
  }
  return values;
 }
 function nodeMatrix(node){
  if(node.matrix)return new Float32Array(node.matrix);
  let q=node.rotation||[0,0,0,1],p=node.translation||[0,0,0],s=node.scale||[1,1,1];
  let x=q[0],y=q[1],z=q[2],w=q[3],x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
  return new Float32Array([(1-(yy+zz))*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,(xy-wz)*s[1],(1-(xx+zz))*s[1],(yz+wx)*s[1],0,(xz+wy)*s[2],(yz-wx)*s[2],(1-(xx+yy))*s[2],0,p[0],p[1],p[2],1]);
 }
 function determinant3(m){return m[0]*(m[5]*m[10]-m[9]*m[6])-m[4]*(m[1]*m[10]-m[9]*m[2])+m[8]*(m[1]*m[6]-m[5]*m[2])}
 function split16(geometry){
  let vertexCount=geometry.p.length/3;if(vertexCount<=65535)return [{p:geometry.p,n:geometry.n,i:new Uint16Array(geometry.i)}];
  let out=[],positions=[],normals=[],indices=[],map=new Map();
  function flush(){if(indices.length)out.push({p:new Float32Array(positions),n:new Float32Array(normals),i:new Uint16Array(indices)});positions=[];normals=[];indices=[];map=new Map()}
  for(let j=0;j<geometry.i.length;j+=3){
   let need=0;for(let k=0;k<3;k++)if(!map.has(geometry.i[j+k]))need++;
   if(map.size+need>65535)flush();
   for(let k=0;k<3;k++){let old=geometry.i[j+k],next=map.get(old);if(next===undefined){next=map.size;map.set(old,next);for(let c=0;c<3;c++){positions.push(geometry.p[old*3+c]);normals.push(geometry.n[old*3+c])}}indices.push(next)}
  }flush();return out;
 }
 function rgbDisplay(v){return v<=.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-.055}
 let root=new Node3D(),resultNodes=[],byName=Object.create(null),allMin=[Infinity,Infinity,Infinity],allMax=[-Infinity,-Infinity,-Infinity];
 root.name=options.name||'GLB';
 function visit(index,parentMatrix,ancestry){
  if(ancestry.indexOf(index)>=0)throw Error('GLB 节点出现循环');
  let src=doc.nodes[index];if(!src)return;let matrix=M.multiply(parentMatrix,nodeMatrix(src));
  if(src.mesh!==undefined){
   let sourceMesh=doc.meshes[src.mesh];if(!sourceMesh)throw Error('GLB mesh 缺失');
   for(let pIndex=0;pIndex<sourceMesh.primitives.length;pIndex++){
    let primitive=sourceMesh.primitives[pIndex];if(primitive.mode!==undefined&&primitive.mode!==4)continue;
    if(primitive.extensions&&primitive.extensions.KHR_draco_mesh_compression)throw Error('当前离线模型不能使用 Draco 压缩');
    if(primitive.attributes.POSITION===undefined)continue;
    let positions=new Float32Array(accessor(primitive.attributes.POSITION)),normals=primitive.attributes.NORMAL!==undefined?new Float32Array(accessor(primitive.attributes.NORMAL)):null;
    let indices;if(primitive.indices!==undefined)indices=new Uint32Array(accessor(primitive.indices));else{indices=new Uint32Array(positions.length/3);for(let i=0;i<indices.length;i++)indices[i]=i}
    if(indices.length%3)throw Error('GLB 三角面索引不完整');
    for(let i=0;i<indices.length;i++)if(indices[i]*3>=positions.length)throw Error('GLB 顶点索引越界');
    let geometry={p:positions,n:normals,i:indices};if(!normals)calcNormals(geometry);geometry=transformGeom(geometry,matrix);
    if(determinant3(matrix)<0)for(let i=0;i<geometry.i.length;i+=3){let temp=geometry.i[i+1];geometry.i[i+1]=geometry.i[i+2];geometry.i[i+2]=temp}
    let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<geometry.p.length;i+=3)for(let k=0;k<3;k++){let v=geometry.p[i+k];min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);allMin[k]=Math.min(allMin[k],v);allMax[k]=Math.max(allMax[k],v)}
    let center=V.mul(V.add(min,max),.5);
    for(let i=0;i<geometry.p.length;i+=3)for(let k=0;k<3;k++)geometry.p[i+k]-=center[k];
    let mat=(doc.materials||[])[primitive.material]||{},pbr=mat.pbrMetallicRoughness||{},rgba=pbr.baseColorFactor||[.72,.74,.76,1],color=rgba.slice(0,3);
    if(options.linearColors!==false)color=color.map(rgbDisplay);
    let alpha=mat.alphaMode==='BLEND'?rgba[3]:1;if(alpha===undefined)alpha=1;
    let name=src.name||sourceMesh.name||('mesh_'+index);if(sourceMesh.primitives.length>1)name+=':p'+pIndex;
    const parts=split16(geometry);
    for(let i=0;i<parts.length;i++){
     let partName=name+(parts.length>1?':part'+i:''),node=root.add(parts[i],color,alpha,partName,{doubleSided:mat.doubleSided||alpha<1,shine:.1+.6*(1-(pbr.roughnessFactor===undefined?.7:pbr.roughnessFactor))});
     node.name=partName;node.pos=center.slice();node.basePos=center.slice();node.sourceName=src.name||name;
     let descriptor={name:partName,sourceName:node.sourceName,node:node,center:center.slice(),bounds:{min:min.slice(),max:max.slice()},material:mat.name||''};
     resultNodes.push(descriptor);byName[partName]=node;
    }
   }
  }
  let next=ancestry.concat(index);for(let i=0;i<(src.children||[]).length;i++)visit(src.children[i],matrix,next);
 }
 let scene=(doc.scenes||[])[doc.scene||0],roots=scene&&scene.nodes;
 if(!roots){let childSet=new Set();for(let i=0;i<doc.nodes.length;i++)for(let j=0;j<(doc.nodes[i].children||[]).length;j++)childSet.add(doc.nodes[i].children[j]);roots=[];for(let i=0;i<doc.nodes.length;i++)if(!childSet.has(i))roots.push(i)}
 for(let i=0;i<roots.length;i++)visit(roots[i],M.identity(),[]);
 if(!resultNodes.length)throw Error('GLB 没有可显示的三角网格');
 root.update();return {root:root,nodes:resultNodes,byName:byName,bounds:{min:allMin,max:allMax},asset:doc.asset||{}};
}

