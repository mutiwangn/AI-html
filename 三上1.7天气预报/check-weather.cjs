const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'unique IDs');
assert(!/<(?:script|img)[^>]+src="https?:/.test(html), 'no external runtime resources');
assert(!/\bfetch\s*\(/.test(code), 'no network requests');
assert(!/王宁|镇海区|鲲池/.test(html), 'no author or school attribution');
let count = 4;
function element(id = '') {
  return { id, value: '', hidden: false, disabled: false, innerHTML: '', textContent: '', dataset: {}, style: {}, attrs: {}, events: {}, classList: { add() {}, remove() {} },
    setAttribute(k, v) { this.attrs[k] = String(v); }, removeAttribute(k) { delete this.attrs[k]; }, addEventListener(k, f) { this.events[k] = f; }, focus() { this.focused = true; }, append() {}, remove() {}, click() { this.onclick?.(); }, showModal() { this.attrs.open = ''; }, close() { delete this.attrs.open; }
  };
}
function boot(initial = {}, brokenStorage = false) {
  const els = Object.fromEntries(ids.map(id => [id, element(id)]));
  const tabs = ['read', 'track', 'decide'].map(n => Object.assign(els['tab-' + n], { dataset: { tab: n } }));
  const panes = ['read', 'track', 'decide'].map(n => els['pane-' + n]);
  const fields = ['place', 'date', 'weather', 'temperature', 'wind', 'publish'].map(n => Object.assign(element(), { dataset: { field: n } }));
  const storage = { 'aihtml-weather-forecast-v1': JSON.stringify(initial) };
  const downloads = [];
  const doc = { getElementById: id => { assert(els[id], 'known DOM id: ' + id); return els[id]; },
    querySelectorAll: sel => ({ '[data-field]': fields, '[role=tab]': tabs, '[data-tab]': tabs, '.pane': panes }[sel] || []),
    addEventListener() {}, body: element('body'), documentElement: {}, createElement() { return element(); } };
  let tick, confirmOK = true;
  const ctx = { document: doc, localStorage: { getItem(k) { if (brokenStorage) throw Error(); return storage[k]; }, setItem(k,v) { if (brokenStorage) throw Error(); storage[k]=v; } },
    setTimeout() {}, clearTimeout() {}, setInterval(fn) { tick=fn; return 1; }, clearInterval() { tick=null; }, confirm() { return confirmOK; },
    Blob, URL: { createObjectURL(blob) { downloads.push(blob); return 'blob:test'; }, revokeObjectURL() {} }, console,
  };
  vm.createContext(ctx);
  vm.runInContext(code.replace(/\}\)\(\);\s*$/, 'globalThis.testAPI={CASES,TEMP,TIMES,WEATHER,FORCE,icon,esc,csvCell,renderTime,renderPins,tab,state,saveIdea,renderCase,states,getIndex:()=>index,getTimer:()=>timer,getPins:()=>pins,comparison,saveReal,renderComparison};})();'), ctx);
  return { a: ctx.testAPI, e: els, tabs, panes, storage, downloads, tick: () => tick?.(), confirm: v => confirmOK=v, fields };
}
const t = boot();
const {a,e} = t;
assert.equal(Math.min(...a.TEMP),16);assert.equal(Math.max(...a.TEMP),24);count+=2;
assert.equal(a.TEMP.length,a.TIMES.length);assert.equal(a.WEATHER.length,a.TIMES.length);count+=2;
for (let i=0;i<7;i++){ e.timeRange.oninput({target:{value:String(i)}});assert.equal(e.metricTemp.textContent,a.TEMP[i]+'℃');assert.equal(e.metricWeather.textContent,a.WEATHER[i]);assert.equal(e.timeText.textContent,String(a.TIMES[i]).padStart(2,'0')+':00');count+=3; }
assert(e.nextBtn.disabled);e.nextBtn.onclick();assert.equal(a.getIndex(),6);count+=2;
e.timeRange.oninput({target:{value:'0'}});assert(e.backBtn.disabled);e.backBtn.onclick();assert.equal(a.getIndex(),0);count+=2;
e.pinA.onclick();e.pinB.onclick();assert(e.pinQuestion.textContent.includes('同一时刻'));count++;
e.timeRange.oninput({target:{value:'5'}});e.pinB.onclick();assert(e.pinQuestion.textContent.includes('15 小时'));count++;
e.clearPins.onclick();assert.equal(a.getPins().A,null);assert.equal(a.getPins().B,null);count+=2;
e.playBtn.onclick();assert(a.getTimer());t.tick();assert.equal(a.getIndex(),6);assert.equal(a.getTimer(),null);count+=3;
e.playBtn.onclick();assert.equal(a.getIndex(),0);t.tick();assert.equal(a.getIndex(),1);a.tab('decide');assert.equal(a.getTimer(),null);assert(t.panes[0].hidden);assert(!t.panes[2].hidden);count+=5;
e.saveFirst.onclick();assert(!a.state().first);count++;
e.firstChoice.value='调整活动时间';e.saveFirst.onclick();assert(!a.state().first);count++;
e.firstReason.value='原预报说下午阴，晚上才有小雨。';e.saveFirst.onclick();assert(a.state().first);assert(!e.revealUpdate.disabled);assert(e.firstForm.hidden);count+=3;
const before = a.state().first.reason;e.revealUpdate.onclick();assert(a.state().revealed);assert(!e.updateContent.hidden);count+=2;
e.secondChoice.value='改在室内观察';e.secondReason.value='<script>alert(1)</script> 小雨提前。';e.saveSecond.onclick();assert.equal(a.state().first.reason,before);assert(a.state().second);assert(!e.revealActual.disabled);count+=3;
e.revealActual.onclick();assert(a.state().actual);e.revealActual.onclick();assert(!a.state().actual);count+=2;
e.exportSvg.onclick();e.exportCsv.onclick();assert.equal(t.downloads.length,2);count++;
assert(a.esc('<x> & "').includes('&lt;x&gt;'));assert(a.csvCell('=1+1').startsWith('"\''));count+=2;
e.caseSelect.onchange({target:{value:'steady'}});assert(!a.state().first);assert(e.revealUpdate.disabled);count+=2;
e.caseSelect.onchange({target:{value:'change'}});assert.equal(a.state().first.reason,before);count++;
t.confirm(false);e.resetCase.onclick();assert(a.state().first);t.confirm(true);e.resetCase.onclick();assert(!a.state().first);count+=2;
const saved = boot(JSON.parse(t.storage['aihtml-weather-forecast-v1']));assert(!saved.a.state().first);count++;
const resumed=boot({change:{first:{choice:'保留原方案',reason:'有依据'},revealed:true,second:{choice:'修改',reason:'新依据'},actual:true}});assert(resumed.a.state().actual);assert(resumed.e.firstForm.hidden);assert(!resumed.e.actualText.hidden);count+=3;
const malformed=boot({change:{second:{choice:'x',reason:'y'},revealed:true,actual:true}});assert(!malformed.a.state().revealed);assert(!malformed.a.state().second);count+=2;
const core=boot();
assert.equal(core.a.comparison().temp,'15');assert.equal(core.e.cmpForecastTemp.textContent,'9～18℃');count+=2;
core.e.afternoonObs.onclick();assert.equal(core.a.comparison().sky,'乌云密布');assert.equal(core.e.cmpObserveTemp.textContent,'17℃');count+=2;
core.e.realCompare.onclick();assert.equal(core.e.realTemp.value,'');assert.equal(core.a.saveReal(),false);count+=2;
for(const [k,v] of Object.entries({Place:'校园所在镇',Date:'2026-11-07',Time:'10:00',Source:'当地气象台',Published:'2026-11-06 18:00',Period:'11月7日00:00—24:00',Low:'20',High:'10',Sky:'<cloud>'}))core.e['real'+k].value=v;
assert.equal(core.a.saveReal(),false);count++;
core.e.realLow.value='9';core.e.realHigh.value='18';assert.equal(core.a.saveReal(),true);assert(core.a.comparison().real);assert.equal(core.e.cmpObserveTemp.textContent,'未测 / 未记录');assert.equal(core.e.cmpObserveSky.textContent,'<cloud>');count+=4;
core.e.exportCompare.onclick();assert.equal(core.downloads.length,1);assert(core.storage['aihtml-weather-comparison-v1']);count+=2;
core.e.exampleCompare.onclick();assert(!core.a.comparison().real);core.e.useSavedReal.onclick();assert(core.a.comparison().real);assert.equal(core.a.comparison().place,'校园所在镇');count+=3;
core.e.realCompare.onclick();core.e.realTemp.value='100';assert.equal(core.a.saveReal(),false);core.e.realTemp.value='';core.e.realLow.value='';assert.equal(core.a.saveReal(),false);core.e.realHigh.value='';assert(core.a.saveReal());assert.equal(core.e.cmpForecastTemp.textContent,'未记录');count+=4;
const broken=boot({},true);assert(broken.e.saveStatus.textContent.includes('不可用'));count++;
Promise.all(t.downloads.map(b=>b.text())).then(([svg,csv])=>{assert(svg.includes('&lt;script&gt;'));assert(!svg.includes('<script>'));assert(svg.endsWith('</svg>'));assert(csv.includes('课堂记录'));assert(csv.includes('原预报'));count+=5;console.log('PASS '+count+' static/data/interaction assertions (mock DOM; not a layout/browser test).');});
