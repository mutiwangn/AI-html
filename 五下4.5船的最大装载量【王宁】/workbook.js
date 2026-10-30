/* 船的最大装载量 v2.0 · pure workbook validation and version migration.
 * Load after logic.js and voyage.js. Browser: FloatWorkbook; Node: require().
 * No DOM, network, browser storage or hidden UI state is read or changed.
 */
(function (root, factory) {
  'use strict';
  var L = root && root.FloatLogic, V = root && root.VoyageLogic;
  if (typeof module === 'object' && module.exports) {
    L = require('./logic.js'); V = require('./voyage.js');
  }
  var api = factory(L, V);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FloatWorkbook = api;
}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function (L, V) {
  'use strict';
  if (!L || !V) throw new Error('请先加载浮标与航行计算模块');
  var SCHEMA = 'mutiw-float-workbook-v2';
  var LIMITS = Object.freeze({ jsonBytes: 524288, loadRecords: 24, voyageHistory: 48 });
  var MODES = ['measured', 'simulation'], LIQUIDS = ['fresh', 'mild', 'brine'];
  var REGIONS = ['yangtze', 'ocean', 'yellow'], PREDICTIONS = ['up', 'same', 'down'];
  var FIELDS = ['group', 'mode', 'liquid', 'sessions', 'routeIndex', 'voyageHistory', 'region', 'hold', 'cargo', 'targetDraft', 'conditions', 'loadRecords', 'alignment', 'legacy'];
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function fail(message) { throw new Error(message); }
  function obj(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(label + '格式不正确');
    return value;
  }
  function num(value, label, min, max) {
    if (typeof value !== 'number' || !isFinite(value) || value < min || value > max) fail(label + '超出有效范围');
    return value;
  }
  function int(value, label, min, max) {
    num(value, label, min, max); if (Math.floor(value) !== value) fail(label + '须为整数'); return value;
  }
  function one(value, choices, label) {
    if (choices.indexOf(value) < 0) fail(label + '不正确'); return value;
  }
  function iso(value, label) {
    if (typeof value !== 'string' || value.length > 40 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) fail(label + '须为ISO时间');
    var t = Date.parse(value); if (!isFinite(t)) fail(label + '不正确');
    var year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8, 10));
    var days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > days[month - 1]) fail(label + '日期不正确');
    return new Date(t).toISOString();
  }
  function utf8Bytes(str) {
    var count = 0;
    for (var i = 0; i < str.length; i++) {
      var n = str.charCodeAt(i);
      if (n < 128) count++;
      else if (n < 2048) count += 2;
      else if (n >= 0xD800 && n <= 0xDBFF && i + 1 < str.length && str.charCodeAt(i + 1) >= 0xDC00 && str.charCodeAt(i + 1) <= 0xDFFF) { count += 4; i++; }
      else count += 3;
    }
    return count;
  }
  function modeSession(raw, mode) {
    one(mode, MODES, '记录来源');
    var s = L.validateSession(raw);
    LIQUIDS.forEach(function (id) {
      s.readings[id].forEach(function (r) {
        if (mode === 'simulation' ? r.source !== 'simulation' : r.source === 'simulation') fail('实测和模型记录不能混在一起');
      });
    });
    return s;
  }
  function sessions(raw) {
    obj(raw, '浮标记录');
    var out = { measured: modeSession(raw.measured, 'measured'), simulation: modeSession(raw.simulation, 'simulation') };
    if (out.measured.group !== out.simulation.group) fail('两套记录的组号不一致');
    return out;
  }
  function inferredGroup(label) {
    var m = typeof label === 'string' && label.match(/\d+/);
    return m ? Math.max(1, Math.min(99, Number(m[0]) || 1)) : 1;
  }
  function create(group, mode) {
    var g = group == null ? 1 : int(group, '组号', 1, 99);
    var m = mode == null ? 'measured' : one(mode, MODES, '记录来源');
    var label = '第' + g + '组';
    return { group: g, mode: m, liquid: 'fresh',
      sessions: { measured: L.createSession(label), simulation: L.createSession(label) },
      routeIndex: 0, voyageHistory: [], region: 'yangtze', hold: 'cargo', cargo: 36,
      targetDraft: 3.2, conditions: 'region', loadRecords: [], alignment: 'water', legacy: {} };
  }
  function voyageHistory(raw) {
    if (!Array.isArray(raw) || raw.length > LIMITS.voyageHistory) fail('航行记录最多保留' + LIMITS.voyageHistory + '条');
    return raw.map(function (q) {
      obj(q, '航行记录');
      var from = one(q.from, REGIONS, '出发水域'), to = one(q.to, REGIONS, '到达水域');
      var prediction = one(q.prediction, PREDICTIONS, '航行预测'), result = one(q.result, PREDICTIONS, '航行结果');
      if (result !== V.predict(from, to, 36)) fail('航行结果与本次水域样本不一致');
      return { from: from, to: to, prediction: prediction, result: result, at: iso(q.at, '航行时间') };
    });
  }
  function loads(raw) {
    if (!Array.isArray(raw) || raw.length > LIMITS.loadRecords) fail('装载记录最多保留' + LIMITS.loadRecords + '条');
    return raw.map(function (q) {
      obj(q, '装载记录');
      var region = one(q.region, REGIONS, '装载水域');
      var hold = one(q.hold, ['cargo', 'draft'], '比较条件');
      var conditions = one(q.conditions, ['region', 'calm'], '风浪条件');
      var cargo = num(q.cargoUnits, '记录货物箱数', 0, 80);
      var draft = num(q.draftCm, '记录吃水', 0, 4.4);
      var at = iso(q.at, '装载时间');
      var boat = V.state(region, cargo, { conditions: conditions });
      if (!boat.safe) fail('装载记录超过本次安全线');
      if (Math.abs(boat.requiredDraftCm - draft) > 1e-6) fail('记录吃水与货物、水域不一致');
      if (hold === 'draft') {
        var sameDraft = V.atDraft(region, draft, { conditions: conditions });
        if (Math.abs(sameDraft.cargoUnits - cargo) > 1e-6) fail('相同吃水记录的货物质量不一致');
      }
      return { region: region, hold: hold, cargoUnits: cargo, draftCm: draft, conditions: conditions, at: at };
    });
  }
  function legacyLoads(raw) {
    if (raw == null) return {};
    obj(raw, '旧版装载记录');
    var out = {};
    LIQUIDS.forEach(function (id) {
      if (!own(raw, id)) return;
      var q = obj(raw[id], '旧版装载记录');
      var count = int(q.count, '旧版货物数量', 0, 72);
      if (q.source != null && q.source !== 'simulation') fail('旧版装载记录须为模型');
      var boat = L.boatState(id, count);
      if (!boat.safe) fail('旧版装载记录超过原安全线');
      out[id] = { count: count, at: iso(q.at, '旧版装载时间'), source: 'simulation',
        verified: count < 72 && !L.boatState(id, count + 1).safe };
    });
    return out;
  }
  function legacyObservations(raw) {
    if (raw == null) return [];
    if (!Array.isArray(raw) || raw.length > 12) fail('旧版换水记录格式不正确');
    return raw.map(function (q) {
      obj(q, '旧版换水记录');
      var from = one(q.from, LIQUIDS, '旧版液体'), to = one(q.to, LIQUIDS, '旧版液体');
      var prediction = one(q.prediction, PREDICTIONS, '旧版预测'), result = one(q.result, PREDICTIONS, '旧版结果');
      if (q.source != null && q.source !== 'simulation') fail('旧版换水记录须为模型');
      var a = L.boatState(from, 36).draftCm, b = L.boatState(to, 36).draftCm;
      var expected = Math.abs(a - b) < 1e-9 ? 'same' : b < a ? 'up' : 'down';
      if (result !== expected) fail('旧版换水结果与液体不一致');
      return { from: from, to: to, prediction: prediction, result: result, source: 'simulation' };
    });
  }
  function legacy(raw) {
    if (raw == null) return {};
    obj(raw, '旧版归档'); var out = {};
    if (own(raw, 'loadRecords')) out.loadRecords = legacyLoads(raw.loadRecords);
    if (own(raw, 'observations')) out.observations = legacyObservations(raw.observations);
    return out;
  }
  function current(raw) {
    var g = int(raw.group, '组号', 1, 99), pair = sessions(raw.sessions);
    var canonicalLabel = pair.measured.group.match(/^第([1-9]\d?)组$/);
    if (canonicalLabel && Number(canonicalLabel[1]) !== g) fail('记录组号与小组编号不一致');
    var hold = one(raw.hold, ['cargo', 'draft'], '比较条件');
    var cargo = num(raw.cargo, '货物箱数', 0, 80), target = num(raw.targetDraft, '目标吃水', 0.8, 4.4);
    var region = one(raw.region, REGIONS, '水域'), conditions = one(raw.conditions, ['region', 'calm'], '风浪条件');
    if (hold === 'draft') {
      var b = V.atDraft(region, target, { conditions: conditions });
      if (Math.abs(b.cargoUnits - cargo) > 1e-6) fail('当前货物与保持的吃水不一致');
    } else V.state(region, cargo, { conditions: conditions });
    return { group: g, mode: one(raw.mode, MODES, '记录来源'),
      liquid: one(raw.liquid, LIQUIDS, '液体'), sessions: pair,
      routeIndex: int(raw.routeIndex, '航行位置', 0, 2), voyageHistory: voyageHistory(raw.voyageHistory),
      region: region, hold: hold, cargo: cargo, targetDraft: target, conditions: conditions,
      loadRecords: loads(raw.loadRecords), alignment: one(raw.alignment, ['water', 'float'], '对齐方式'),
      legacy: legacy(raw.legacy) };
  }
  function migrate(raw) {
    var isUi = raw.schema === 'float-ui-v1', isBook = raw.schema === 'mutiw-float-workbook-v1';
    var pair, m, s;
    if (isUi || isBook) {
      m = one(raw.mode, MODES, '旧版记录来源');
      if (raw.sessions != null) pair = sessions(raw.sessions);
      else {
        if (isUi) fail('旧版浏览器记录缺少浮标数据');
        s = modeSession(raw.session, m);
        pair = { measured: L.createSession(s.group), simulation: L.createSession(s.group) };
        pair[m] = s;
      }
    } else {
      s = L.validateSession(raw);
      var records = [];
      LIQUIDS.forEach(function (id) { records = records.concat(s.readings[id]); });
      m = records.length && records.every(function (r) { return r.source === 'simulation'; }) ? 'simulation' : 'measured';
      s = modeSession(s, m);
      pair = { measured: L.createSession(s.group), simulation: L.createSession(s.group) };
      pair[m] = s;
    }
    var group = isUi && own(raw, 'group') ? int(raw.group, '旧版组号', 1, 99) : inferredGroup(pair[m].group);
    var out = create(group, m); out.sessions = pair;
    if (own(raw, 'liquid')) out.liquid = one(raw.liquid, LIQUIDS, '旧版液体');
    if (own(raw, 'align')) out.alignment = one(raw.align, ['water', 'float'], '旧版对齐方式');
    if (isUi || isBook) out.legacy = { loadRecords: legacyLoads(raw.loadRecords), observations: legacyObservations(raw.observations) };
    // The old density choices and cargo records belong to a different model.
    // Do not relabel them as Yangtze/ocean/Yellow River measurements.
    return current(out);
  }
  function normalize(raw) {
    obj(raw, '记录文件');
    if (!own(raw, 'schema')) fail('记录文件缺少版本标记');
    if (raw.schema === SCHEMA) return current(raw);
    if (raw.schema === 'float-ui-v1' || raw.schema === 'mutiw-float-workbook-v1' || raw.schema === L.schema) return migrate(raw);
    fail('不是本课支持的记录文件');
  }
  function exportWorkbook(state) {
    obj(state, '小组状态');
    // Explicitly select persistent keys before validation. UI and animation
    // objects may contain cycles and must never become workbook data.
    var packet = { schema: SCHEMA };
    FIELDS.forEach(function (key) { if (own(state, key)) packet[key] = state[key]; });
    var normalized = normalize(packet), out = { schema: SCHEMA };
    FIELDS.forEach(function (key) { out[key] = normalized[key]; });
    var json = JSON.stringify(out, null, 2);
    if (utf8Bytes(json) > LIMITS.jsonBytes) fail('记录文件超过512KB');
    return json;
  }
  function importWorkbook(json) {
    if (typeof json !== 'string' || json.length > LIMITS.jsonBytes || utf8Bytes(json) > LIMITS.jsonBytes) fail('记录文件超过512KB或格式不正确');
    var raw; try { raw = JSON.parse(json); } catch (e) { fail('无法读取JSON记录文件'); }
    return normalize(raw);
  }
  return Object.freeze({ version: '2.0', schema: SCHEMA, LIMITS: LIMITS,
    create: create, normalize: normalize, export: exportWorkbook, import: importWorkbook });
}));
