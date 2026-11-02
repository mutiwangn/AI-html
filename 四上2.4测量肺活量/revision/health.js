/* Derived from the uploaded Z-Anatomy respiratory page.
 * Source WebGL matrix, mesh-shader, normal, breath-delta and draw logic retained.
 * Adaptation and source geometry: CC BY-SA 4.0. See embedded model sources.
 * No sphere, generated lung or substitute body geometry is used.
 */
(function(global){
'use strict';
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
class Node3D{
 constructor(parent=null){this.parent=parent;this.children=[];this.pos=[0,0,0];this.rot=[0,0,0];this.scale=[1,1,1];this.world=M.identity();this.visible=true;this.mesh=null;this.tag='';if(parent)parent.children.push(this)}
 add(g,color='#ffffff',alpha=1,tag='',opts={}){let n=new Node3D(this);n.mesh={g,color:hexColor(color),alpha,...opts};n.tag=tag;return n}
 update(parentWorld=M.identity(),visible=true,list=[]){this.world=M.multiply(parentWorld,M.compose(this.pos,this.rot,this.scale));this.worldVisible=visible&&this.visible;if(this.worldVisible&&this.mesh&&this.mesh.alpha>.001)list.push(this);for(let c of this.children)c.update(this.world,this.worldVisible,list);return list}
}
class WebGLScene{
 constructor(canvas){this.canvas=canvas;let gl;try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true})||canvas.getContext('experimental-webgl');}catch(error){error.healthStage='context-create';throw error;}if(!gl){let unavailable=Error(contextCreationNote||'Browser returned no WebGL context');unavailable.healthStage='webgl-unavailable';throw unavailable;}this.gl=gl;$('render-note').setAttribute('data-webgl-version',String(gl.getParameter(gl.VERSION)||''));this.root=new Node3D();this.eye=[0,0,20];this.target=[0,0,0];this.width=1;this.height=1;this.dpr=1;this.vp=M.identity();this.selected='';this.rendered=[];this.buffers=new WeakMap();this.stats={drawCalls:0,triangles:0};this.program=this.makeProgram(`
 attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aDelta;attribute vec3 aDNormal;uniform float uBreath;varying vec3 vLocal;uniform mat4 uModel;uniform mat4 uVP;uniform mat3 uNormal;varying vec3 vNormal;varying vec3 vWorld;
 void main(){vec3 pos=aPosition+aDelta*uBreath;vLocal=pos;vec4 world=uModel*vec4(pos,1.0);vWorld=world.xyz;vNormal=normalize(uNormal*(aNormal+aDNormal*uBreath));gl_Position=uVP*world;}`,`
 precision mediump float;varying vec3 vNormal;varying vec3 vWorld;varying vec3 vLocal;uniform float uCut;uniform float uLower;uniform float uSkin;uniform vec3 uColor;uniform vec3 uEye;uniform float uAlpha;uniform float uSelected;uniform float uShine;
 void main(){if(uCut>.5&&vLocal.x<.015)discard;if(vLocal.y<uLower)discard;vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;vec3 V=normalize(uEye-vWorld);vec3 L=normalize(vec3(-.5,.9,1.2));vec3 L2=normalize(vec3(.9,.3,-.4));float diff=max(dot(N,L),0.0);float secondary=max(dot(N,L2),0.0);float spec=pow(max(dot(N,normalize(L+V)),0.0),42.0)*uShine;float rim=pow(1.0-abs(dot(N,V)),2.2);vec3 color=uColor*(.50+.47*diff+.13*secondary)+vec3(spec*.4);color=mix(color,vec3(.19,.68,.69),uSelected*rim*.55);color+=vec3(.025,.04,.036)*rim;if(uSkin>.5&&uSkin<1.5){float grain=sin(vLocal.x*235.0)*sin(vLocal.y*211.0)*sin(vLocal.z*227.0);color+=vec3(.009,.006,.004)*grain;color+=vec3(.045,.012,.004)*pow(1.0-diff,2.0);}float alpha=uAlpha;if(uSkin>.5&&uAlpha<.995)alpha*=.18+.82*pow(1.0-abs(dot(N,V)),1.6);if(uSkin>1.5){if(vLocal.y>1.7||vLocal.y< -2.8||abs(vLocal.x)>1.9)discard;alpha*=pow(1.0-abs(dot(N,V)),2.0);}gl_FragColor=vec4(clamp(color,0.0,1.0),alpha);}`);
 this.loc={};for(let n of ['aPosition','aNormal','aDelta','aDNormal'])this.loc[n]=gl.getAttribLocation(this.program,n);for(let n of ['uModel','uVP','uNormal','uColor','uEye','uAlpha','uSelected','uShine','uBreath','uCut','uLower','uSkin'])this.loc[n]=gl.getUniformLocation(this.program,n);
 for(let required of ['aPosition','aNormal','aDelta','aDNormal']){if(this.loc[required]<0){let error=Error('Required vertex attribute is inactive: '+required);error.healthStage='vertex-attributes';throw error;}}$('render-note').setAttribute('data-webgl-attributes',String(gl.getParameter(gl.MAX_VERTEX_ATTRIBS)));
 this.pointProgram=this.makeProgram(`attribute vec3 aPosition;attribute vec3 aColor;uniform mat4 uVP;uniform float uSize;varying vec3 vColor;void main(){vec4 pos=uVP*vec4(aPosition,1.0);gl_Position=pos;gl_PointSize=uSize;vColor=aColor;}`,`precision mediump float;varying vec3 vColor;void main(){float d=length(gl_PointCoord-vec2(.5))*2.0;if(d>1.0)discard;float a=1.0-smoothstep(.94,1.0,d);vec3 c=vColor;if(d>.68)c=vec3(1.0);if(d>.88)c=vec3(.065,.13,.22);gl_FragColor=vec4(c,a);}`);
 this.pointLoc={};for(let n of ['aPosition','aColor'])this.pointLoc[n]=gl.getAttribLocation(this.pointProgram,n);for(let n of ['uVP','uSize'])this.pointLoc[n]=gl.getUniformLocation(this.pointProgram,n);this.pointBuffer=gl.createBuffer();this.colorBuffer=gl.createBuffer();gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);this.fov=32*Math.PI/180;
 }
 makeProgram(vs,fs){let gl=this.gl;function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){let error=Error(gl.getShaderInfoLog(s)||'Shader compilation failed');error.healthStage=type===gl.VERTEX_SHADER?'vertex-shader':'fragment-shader';throw error;}return s}let p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){let error=Error(gl.getProgramInfoLog(p)||'Program link failed');error.healthStage='shader-link';throw error;}return p}
 resize(){let rect=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.6,2200/Math.max(1,rect.width),1600/Math.max(1,rect.height));if(rect.width<=0||rect.height<=0)return;this.width=rect.width;this.height=rect.height;this.dpr=dpr;let w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h}this.gl.viewport(0,0,w,h)}
 buffer(g){let gl=this.gl,b=this.buffers.get(g);if(!b){b={p:gl.createBuffer(),n:gl.createBuffer(),i:gl.createBuffer(),dp:gl.createBuffer(),dn:gl.createBuffer()};gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.bufferData(gl.ARRAY_BUFFER,g.p,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,b.n);gl.bufferData(gl.ARRAY_BUFFER,g.n,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,g.i,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,b.dp);gl.bufferData(gl.ARRAY_BUFFER,g.dp||new Float32Array(g.p.length),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,b.dn);gl.bufferData(gl.ARRAY_BUFFER,g.dn||new Float32Array(g.p.length),gl.STATIC_DRAW);this.buffers.set(g,b)}if(g.dirty){gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.bufferData(gl.ARRAY_BUFFER,g.p,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,b.n);gl.bufferData(gl.ARRAY_BUFFER,g.n,gl.DYNAMIC_DRAW);g.dirty=false}return b}
 prepare(eye,target){this.eye=eye;this.target=target;this.vp=M.multiply(M.perspective(this.fov,this.width/this.height,.1,150),M.lookAt(eye,target));this.rendered=this.root.update()}
 draw(){let gl=this.gl;this.stats={drawCalls:0,triangles:0};gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniformMatrix4fv(this.loc.uVP,false,this.vp);gl.uniform3fv(this.loc.uEye,this.eye);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);let opaque=this.rendered.filter(n=>n.mesh.alpha>=.995),transparent=this.rendered.filter(n=>n.mesh.alpha<.995);transparent.sort((a,b)=>{let A=M.point(a.world,a.mesh.center||[0,0,0]),B=M.point(b.world,b.mesh.center||[0,0,0]);return V.length(V.sub(B,this.eye))-V.length(V.sub(A,this.eye))});for(let list of [opaque,transparent]){gl.depthMask(list===opaque);for(let n of list){let m=n.mesh,b=this.buffer(m.g);gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.enableVertexAttribArray(this.loc.aPosition);gl.vertexAttribPointer(this.loc.aPosition,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,b.n);gl.enableVertexAttribArray(this.loc.aNormal);gl.vertexAttribPointer(this.loc.aNormal,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,b.dp);gl.enableVertexAttribArray(this.loc.aDelta);gl.vertexAttribPointer(this.loc.aDelta,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,b.dn);gl.enableVertexAttribArray(this.loc.aDNormal);gl.vertexAttribPointer(this.loc.aDNormal,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.i);gl.uniformMatrix4fv(this.loc.uModel,false,n.world);gl.uniformMatrix3fv(this.loc.uNormal,false,M.normal(n.world));gl.uniform3fv(this.loc.uColor,m.color);gl.uniform1f(this.loc.uAlpha,m.alpha);gl.uniform1f(this.loc.uBreath,m.breath||0);gl.uniform1f(this.loc.uCut,m.cut||0);gl.uniform1f(this.loc.uLower,m.lower===undefined?-100:m.lower);gl.uniform1f(this.loc.uSkin,m.skin||0);gl.uniform1f(this.loc.uShine,m.shine===undefined?.4:m.shine);gl.uniform1f(this.loc.uSelected,n.tag&&(this.selectedTags?this.selectedTags.has(n.tag):n.tag===this.selected)?1:0);if(m.doubleSided){gl.disable(gl.CULL_FACE)}else{gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK)}gl.drawElements(gl.TRIANGLES,m.g.i.length,gl.UNSIGNED_SHORT,0);this.stats.drawCalls++;this.stats.triangles+=m.g.i.length/3}}gl.depthMask(true);gl.disable(gl.CULL_FACE)}
 points(positions,colors,size=7){if(!positions.length)return;let gl=this.gl;gl.useProgram(this.pointProgram);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.uniformMatrix4fv(this.pointLoc.uVP,false,this.vp);gl.uniform1f(this.pointLoc.uSize,size*this.dpr);gl.bindBuffer(gl.ARRAY_BUFFER,this.pointBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(positions),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(this.pointLoc.aPosition);gl.vertexAttribPointer(this.pointLoc.aPosition,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,this.colorBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(colors),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(this.pointLoc.aColor);gl.vertexAttribPointer(this.pointLoc.aColor,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,positions.length/3);gl.depthMask(true);gl.enable(gl.DEPTH_TEST)}
 project(p,node=null){let pos=node?M.point(node.world,p):p,ndc=M.point(this.vp,pos);return {x:(ndc[0]*.5+.5)*this.width,y:(.5-ndc[1]*.5)*this.height,z:ndc[2]}}
}

var settings={visible:false,ready:false,playing:false,mode:'normal',scenario:'calm',capacity:60,
  elapsed:0,finished:false,yaw:.13,pitch:.035,ribs:true,fallback:false,legacyImages:false};
var scene=null,meshNodes=[],sourceMeshes=[],loaded=null,frame=0,lastTime=0,lastDraw=0,initialized=false;
var imagePoseLow=-1,imagePoseHigh=-1,lastImageGroup='',focusBeforeDetails=null,contextCreationNote='';
var palette={skin:'#b7cdd1',lung:'#dc7c8e',trachea:'#dcb98b',bronchi:'#b18656',diaphragm:'#9f77b0',ribs:'#bdb49b',spine:'#b4a793'};
function $(id){return document.getElementById('health-'+id);}
function setText(id,text){var node=$(id);if(node&&node.textContent!==text)node.textContent=text;}
function maximumQ(){return .88+.77*settings.capacity/100;}
function smooth(t){t=clamp(t,0,1);return t*t*(3-2*t);}
function currentBreath(){
  if(settings.mode==='vital'){
    var time=settings.elapsed,peak=maximumQ();
    if(time<.6)return .25;
    if(time<3.1)return mix(.25,peak,smooth((time-.6)/2.5));
    if(time<4)return peak;
    if(time<7.7)return peak*(1-smooth((time-4)/3.7));
    return 0;
  }
  var duration=settings.scenario==='active'?4.6:7.2;
  var phase=(settings.elapsed%duration)/duration;
  var fraction=(1-Math.cos(phase*TAU))/2;
  return settings.scenario==='active'?mix(.18,.83,fraction):mix(.25,.51,fraction);
}
function describe(){
  var q=currentBreath(),peak=maximumQ(),maximumWidth=56+34*settings.capacity/100;
  if(settings.mode==='vital'){
    var t=settings.elapsed;
    if(t<.6){setText('phase','准备测肺活量');setText('motion-caption','先尽力吸气，再一次尽力呼出');}
    else if(t<3.1){setText('phase','尽力吸气');setText('motion-caption','胸腔扩大，肺随着扩张');}
    else if(t<4){setText('phase','已经尽力吸气');setText('motion-caption','接下来，一次尽力呼出');}
    else if(t<7.7){setText('phase','一次尽力呼出');setText('motion-caption','观察橙色表示的呼出气量');}
    else{setText('phase','尽力呼气后');setText('motion-caption','肺没有变空，仍留有一些气体');}
    setText('context-note','尽力吸气后，一次尽力呼出的气量，就是肺活量。');
    setText('volume-note',t>=4?'橙色表示这一口尽力呼出的气量；肺内仍留有气体。':'最大可呼出量与平常一口气的进出量不同。');
    $('exhaled-fill').style.width=(t<4?0:maximumWidth*clamp((peak-q)/peak,0,1))+'%';
    $('residual').hidden=t<7.4;
    setText('play',settings.playing?'暂停演示':settings.finished?'再看一次最大呼出':'继续演示');
    setText('vital','返回日常呼吸');
  }else{
    var duration=settings.scenario==='active'?4.6:7.2;
    var inhaling=(settings.elapsed%duration)/duration<.5;
    setText('phase',settings.playing?(inhaling?'吸气，肺扩张':'呼气，肺回缩'):(settings.scenario==='active'?'运动后的呼吸':'安静呼吸'));
    setText('motion-caption',settings.playing?(inhaling?'膈肌收缩下降，胸腔扩大':'膈肌放松回升，胸腔回落'):'观察肺和膈肌的变化');
    setText('context-note',settings.scenario==='active'?'活动时需要更多氧气，呼吸通常更深、更快。':'安静时，呼吸较平缓。');
    setText('volume-note',settings.scenario==='active'?'活动后通气增加，不表示肺活量立刻变大。':'平常每一口的进出量，只占最大可呼出量的一部分。');
    $('exhaled-fill').style.width='0%';
    $('residual').hidden=true;
    setText('play',settings.playing?'暂停演示':'播放呼吸');
    setText('vital','看一次最大呼出');
  }
  $('tidal-fill').style.width=(settings.scenario==='active'?31:17)+'%';
  $('vital-fill').style.width=maximumWidth+'%';
  $('calm').classList.toggle('active',settings.mode==='normal'&&settings.scenario==='calm');
  $('active').classList.toggle('active',settings.mode==='normal'&&settings.scenario==='active');
  $('calm').setAttribute('aria-pressed',String(settings.mode==='normal'&&settings.scenario==='calm'));
  $('active').setAttribute('aria-pressed',String(settings.mode==='normal'&&settings.scenario==='active'));
  $('vital').setAttribute('aria-pressed',String(settings.mode==='vital'));
  $('play').setAttribute('aria-pressed',String(settings.playing));
  return q;
}
function buildGL(){
  scene=new WebGLScene($('canvas'));
  scene.fov=32*Math.PI/180;meshNodes=[];
  sourceMeshes.forEach(function(mesh){
    var kind=mesh.kind,alpha={skin:.105,lung:.80,trachea:1,bronchi:.96,diaphragm:.85,ribs:.24,spine:.29}[kind];
    var node=scene.root.add(mesh,palette[kind],alpha,'',{
      shine:kind==='lung'?.26:.15,doubleSided:kind==='skin'||kind==='diaphragm',
      skin:kind==='skin'?1:0,center:mesh.bounds[0].map(function(value,i){return(value+mesh.bounds[1][i])/2;})
    });
    node.cls=kind;meshNodes.push(node);
  });
  settings.fallback=false;
  $('canvas').hidden=false;$('fallback').hidden=true;$('render-note').hidden=true;
  $('reset').disabled=false;
  setText('drag-hint','拖动旋转 · 呼吸运动与节奏均为教学示意');
}
function activateFallback(error,stage){
  stage=(error&&error.healthStage)||stage||'unknown';
  var message=error&&error.message?String(error.message).slice(0,360):'No additional detail';
  $('render-note').setAttribute('data-render-reason',stage+': '+message);
  var copy=stage==='webgl-unavailable'?'当前浏览器未提供WebGL，显示真实模型二维投影':stage==='forced-projection'?'真实模型二维投影 · 已选择二维观察':stage==='data-decode'?'三维数据未能展开，显示内嵌真实模型投影':stage==='context-lost'?'三维显示暂时中断，已切换真实模型投影':'三维渲染未完成，已切换真实模型投影';
  setText('render-note',copy);
  if(global.console&&console.warn)console.warn('[LungHealth '+stage+'] '+message);
  settings.fallback=true;scene=null;
  $('canvas').hidden=true;$('fallback').hidden=false;$('render-note').hidden=false;
  $('reset').disabled=true;
  setText('drag-hint','真实网格投影 · 气量变化仍可观察');
  imagePoseLow=-1;imagePoseHigh=-1;lastImageGroup='';
  var test=new Image();
  test.onerror=function(){settings.legacyImages=true;imagePoseLow=-1;imagePoseHigh=-1;renderNow();};
  test.src=global.LungAnatomyData.fallback.withRibs[0];
}
function renderProjection(q){
  var fallback=global.LungAnatomyData.fallback;
  var poses=settings.legacyImages?[0,1.7]:fallback.poses;
  var group=settings.legacyImages?(settings.ribs?'legacyWithRibs':'legacyWithoutRibs'):(settings.ribs?'withRibs':'withoutRibs');
  var images=fallback[group],low=0;
  while(low<poses.length-2&&q>poses[low+1])low++;
  var high=Math.min(low+1,poses.length-1),blend=clamp((q-poses[low])/(poses[high]-poses[low]||1),0,1);
  if(imagePoseLow!==low||lastImageGroup!==group){$('frame-low').src=images[low];imagePoseLow=low;}
  if(imagePoseHigh!==high||lastImageGroup!==group){$('frame-high').src=images[high];imagePoseHigh=high;}
  lastImageGroup=group;$('frame-high').style.opacity=String(blend);
}
function renderNow(){
  if(!settings.visible||!initialized)return;
  var q=describe();
  if(!settings.ready)return;
  if(settings.fallback){renderProjection(q);return;}
  if(!scene)return;
  try{
    scene.resize();
    if(scene.width<2||scene.height<2)return;
    scene.root.rot=[settings.pitch,settings.yaw,0];
    meshNodes.forEach(function(node){node.mesh.breath=q;node.visible=settings.ribs||!(node.cls==='ribs'||node.cls==='spine');});
    var aspect=scene.width/scene.height,tan=Math.tan(scene.fov/2);
    var distance=Math.max(6.2/(2*tan),5.2/(2*tan*aspect))*1.03;
    scene.prepare([0,-.63,distance],[0,-.63,0]);scene.draw();
  }catch(error){activateFallback(error,'render');renderProjection(q);}
}
function tick(time){
  frame=0;
  if(!settings.visible||!settings.playing||document.hidden){lastTime=0;return;}
  if(lastTime){settings.elapsed+=Math.max(0,(time-lastTime)/1000);}
  lastTime=time;
  if(settings.mode==='vital'&&settings.elapsed>=9){settings.elapsed=9;settings.finished=true;settings.playing=false;}
  if(time-lastDraw>(settings.fallback?65:30)||!settings.playing){lastDraw=time;renderNow();}
  if(settings.playing)frame=requestAnimationFrame(tick);
}
function schedule(){
  renderNow();
  if(settings.playing&&settings.visible&&!frame&&!document.hidden){lastTime=0;frame=requestAnimationFrame(tick);}
}
function stopFrame(){if(frame)cancelAnimationFrame(frame);frame=0;lastTime=0;}
function chooseScenario(name){
  settings.scenario=name;settings.mode='normal';settings.elapsed=0;settings.finished=false;settings.playing=true;schedule();
}
function showDetails(title,html){
  focusBeforeDetails=document.activeElement;
  $('details-title').textContent=title;$('details-body').innerHTML=html;$('details').hidden=false;$('details-close').focus();
}
function closeDetails(restore){
  if(!$('details'))return;
  $('details').hidden=true;
  if(restore!==false&&focusBeforeDetails&&focusBeforeDetails.focus)focusBeforeDetails.focus();
}
function anatomyCreditsHtml(){
  var source=global.LungAnatomyData?global.LungAnatomyData.source:{meshes:14,triangles:321054};
  return '<p>这里使用附件中的<strong>Z-Anatomy / BodyParts3D真实解剖网格</strong>，保留五个肺叶、气管、支气管、膈肌、胸廓、脊柱和胸部体表。</p>'+
    '<p>本次删去与本课无关的头面结构、身体下段和多余控制；原三角网格经过16位量化压缩，呼吸形变沿用来源文件的位移数据。人体基础大小不随气量滑杆改变。</p>'+
    '<p><strong>解剖来源：</strong>Kousaku OKUBO、Gauthier KERVYN、Marcin ZIELINSKI。Z-Anatomy及本模块改编遵循CC BY-SA 4.0；BodyParts3D原归因按该素材的CC BY-SA 2.1 Japan保留。</p>'+
    '<p><a href="https://github.com/Z-Anatomy/Models-of-human-anatomy" target="_blank" rel="noopener">Z-Anatomy模型项目</a> · <a href="https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/Readme.md" target="_blank" rel="noopener">原项目作者与许可</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a></p>'+
    '<p><small>离线解压备用：pako 0.2.9，MIT许可，Copyright (C) 2014–2016 by Vitaly Puzrin。完整MIT许可已保留在单文件源码注释中。当前保留'+source.meshes+'个网格，'+source.triangles.toLocaleString()+'个三角形；二维降级图也由这些真实网格投影生成。</small></p>';
}
function sourceDetails(){showDetails('真实模型与来源',global.LUNG_ANATOMY_CREDITS);}
function aboutDetails(){
  showDetails('怎样看待肺活量数值',
    '<p><strong>肺活量是尽力吸气后，一次尽力呼出的气体体积。</strong>平常一口气的进出量通常只是其中一部分；尽力呼气后，肺内仍留有气体。</p>'+
    '<p>肺活量反映呼吸功能的一个方面。看待差异时，还要考虑<strong>身高、生长发育、测量方法和配合程度</strong>，不能只凭一个数值判断健康。</p>'+
    '<p>活动时身体需要更多氧气，呼吸通常更深、更快。这是通气增加，不表示肺活量马上变大。活动表现及恢复还与心脏、训练程度和运动强度等因素有关。</p>'+
    '<p>滑杆用于比较<strong>同一体型的最大可呼出气量</strong>，没有健康等级，也不计算血氧或恢复时间。动画节奏已为观察作了调整，不需要跟随模型呼吸。</p>'+
    '<p><small>科学依据：<a href="https://www.nhlbi.nih.gov/science/pulmonary-function-lab/tests" target="_blank" rel="noopener">NHLBI肺容积定义</a> · <a href="https://site.thoracic.org/advocacy-patients/patient-resources/pulmonary-function-tests" target="_blank" rel="noopener">ATS肺功能检查</a> · <a href="https://medlineplus.gov/lab-tests/lung-function-tests/" target="_blank" rel="noopener">MedlinePlus肺功能检查</a> · <a href="https://europeanlung.org/en/information-hub/keeping-lungs-healthy/your-lungs-and-exercise/" target="_blank" rel="noopener">欧洲肺脏基金会运动与肺</a>。</small></p>');
}
function bindRotation(){
  var canvas=$('canvas'),drag=null;
  function start(x,y,id){if(settings.fallback)return;drag={x:x,y:y,id:id};}
  function move(x,y){if(!drag)return;settings.yaw+=(x-drag.x)*.008;settings.pitch=clamp(settings.pitch+(y-drag.y)*.006,-.52,.52);drag.x=x;drag.y=y;renderNow();}
  if(global.PointerEvent){
    canvas.addEventListener('pointerdown',function(event){if(event.isPrimary===false)return;start(event.clientX,event.clientY,event.pointerId);if(canvas.setPointerCapture)canvas.setPointerCapture(event.pointerId);});
    canvas.addEventListener('pointermove',function(event){if(drag&&drag.id===event.pointerId){event.preventDefault();move(event.clientX,event.clientY);}});
    canvas.addEventListener('pointerup',function(){drag=null;});canvas.addEventListener('pointercancel',function(){drag=null;});
  }else{
    canvas.addEventListener('mousedown',function(event){start(event.clientX,event.clientY,0);});
    global.addEventListener('mousemove',function(event){if(drag)move(event.clientX,event.clientY);});
    global.addEventListener('mouseup',function(){drag=null;});
    canvas.addEventListener('touchstart',function(event){if(event.touches.length===1)start(event.touches[0].clientX,event.touches[0].clientY,0);},{passive:true});
    canvas.addEventListener('touchmove',function(event){if(event.touches.length===1&&drag){event.preventDefault();move(event.touches[0].clientX,event.touches[0].clientY);}},{passive:false});
    canvas.addEventListener('touchend',function(){drag=null;});
  }
  canvas.addEventListener('keydown',function(event){
    if(settings.fallback)return;
    if(event.key==='ArrowLeft')settings.yaw-=.13;
    else if(event.key==='ArrowRight')settings.yaw+=.13;
    else if(event.key==='ArrowUp')settings.pitch=clamp(settings.pitch-.09,-.52,.52);
    else if(event.key==='ArrowDown')settings.pitch=clamp(settings.pitch+.09,-.52,.52);
    else return;
    event.preventDefault();renderNow();
  });
  canvas.addEventListener('webglcontextcreationerror',function(event){contextCreationNote=String(event.statusMessage||'WebGL context creation error');});
  canvas.addEventListener('webglcontextlost',function(event){event.preventDefault();activateFallback(Error('WebGL context was lost'),'context-lost');renderNow();});
}
function initialize(){
  if(initialized)return;
  if(!document.getElementById('page-health'))return;
  initialized=true;
  $('calm').addEventListener('click',function(){chooseScenario('calm');});
  $('active').addEventListener('click',function(){chooseScenario('active');});
  $('capacity').addEventListener('input',function(){settings.capacity=Number(this.value);renderNow();});
  $('play').addEventListener('click',function(){
    if(settings.mode==='vital'&&settings.finished){settings.elapsed=0;settings.finished=false;}
    settings.playing=!settings.playing;
    if(!settings.playing)stopFrame();schedule();
  });
  $('vital').addEventListener('click',function(){
    if(settings.mode==='vital'){chooseScenario(settings.scenario);return;}
    settings.mode='vital';settings.elapsed=0;settings.finished=false;settings.playing=true;schedule();
  });
  $('ribs').addEventListener('click',function(){settings.ribs=!settings.ribs;this.setAttribute('aria-pressed',String(settings.ribs));renderNow();});
  $('reset').addEventListener('click',function(){settings.yaw=.13;settings.pitch=.035;renderNow();});
  $('source').addEventListener('click',sourceDetails);$('about').addEventListener('click',aboutDetails);
  $('details-close').addEventListener('click',function(){closeDetails();});$('details-shade').addEventListener('click',function(){closeDetails();});
  $('details').addEventListener('keydown',function(event){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDetails();}
    if(event.key==='Tab'){
      var targets=$('details').querySelectorAll('button,a[href]');
      if(!targets.length)return;
      var first=targets[0],last=targets[targets.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  bindRotation();
  if(global.ResizeObserver){var observer=new ResizeObserver(function(){if(settings.visible)renderNow();});observer.observe($('viewport'));}
  else global.addEventListener('resize',function(){if(settings.visible)renderNow();});
  document.addEventListener('visibilitychange',function(){if(document.hidden)stopFrame();else if(settings.visible)schedule();});
}
function onShow(){
  initialize();if(!initialized)return Promise.resolve();settings.visible=true;
  if(!global.LungAnatomyData){setText('loading','人体模型资源未装入，请使用完整HTML文件。');return Promise.resolve();}
  if(!loaded){
    $('play').disabled=true;$('vital').disabled=true;
    loaded=global.LungAnatomyData.load().then(function(meshes){
      sourceMeshes=meshes;
      var forced=false;try{forced=new URLSearchParams(location.search).get('health2d')==='1';}catch(ignore){}
      try{if(forced){var forcedError=Error('Projection mode requested through health2d');forcedError.healthStage='forced-projection';throw forcedError;}buildGL();$('render-note').setAttribute('data-render-reason','ready: WebGL initialized');}catch(error){activateFallback(error,'renderer-create');}
      settings.ready=true;$('loading').hidden=true;$('play').disabled=false;$('vital').disabled=false;renderNow();schedule();
    }).catch(function(error){
      activateFallback(error,'data-decode');settings.ready=true;$('loading').hidden=true;$('play').disabled=false;$('vital').disabled=false;renderNow();schedule();
    });
  }else{schedule();}
  return loaded;
}
function pause(){settings.visible=false;stopFrame();closeDetails(false);}
global.LUNG_ANATOMY_CREDITS=anatomyCreditsHtml();
global.LungHealth={onShow:onShow,pause:pause};
})(window);
