/* 船的最大装载量 · physical model and evidence records, v1.0.
 * No UI, network, storage, or third-party dependencies.
 * Quantities use g, cm, cm³, g/cm³. These are classroom model parameters.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FloatLogic = api;
}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var SCHEMA = 'mutiw.float.v1';
  var LESSON = '五下4.5船的最大装载量';
  var MODEL_NOTICE = '课堂模型：液体参数用于比较，不代表真实海水的实测值。';
  var EPS = 1e-9;
  var LIMITS = Object.freeze({ jsonBytes: 65536, readingsPerLiquid: 10, note: 240, explanation: 800, group: 24 });
  var LIQUIDS = Object.freeze([
    Object.freeze({ id: 'fresh', name: '清水', density: 1.00, color: '#159ec4' }),
    Object.freeze({ id: 'mild', name: '淡盐水', density: 1.05, color: '#4e82c4' }),
    Object.freeze({ id: 'brine', name: '浓盐水', density: 1.15, color: '#7560b5' })
  ]);
  var DEFAULT_BOAT = Object.freeze({ waterplaneAreaCm2: 100, emptyMassG: 80, safeDraftCm: 3.2, hullDepthCm: 4.4, cargoMassG: 5, maxCargoUnits: 72 });
  var DEFAULT_FLOAT = Object.freeze({ totalMassG: 10, totalLengthCm: 24, bottomVolumeCm3: 4, bottomHeightCm: 2, stemAreaCm2: 0.5 });

  function fail(message) { throw new Error(message); }
  function finite(value, name, min, max) {
    if (typeof value !== 'number' || !isFinite(value) || value < min || value > max) fail(name + '超出有效范围');
    return value;
  }
  function integer(value, name, min, max) {
    finite(value, name, min, max);
    if (Math.floor(value) !== value) fail(name + '须为整数');
    return value;
  }
  function own(o, key) { return Object.prototype.hasOwnProperty.call(o, key); }
  function object(value, name) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(name + '格式不正确');
    return value;
  }
  function text(value, max, name) {
    if (typeof value !== 'string') fail((name || '文字') + '格式不正确');
    if (value.length > max) fail((name || '文字') + '过长');
    return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  }
  function safeText(value, max) {
    return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max == null ? 240 : max);
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function liquid(id) {
    for (var i = 0; i < LIQUIDS.length; i++) if (LIQUIDS[i].id === id) return LIQUIDS[i];
    fail('未知液体');
  }
  function density(value) {
    return typeof value === 'string' ? liquid(value).density : finite(value, '液体密度', 0.5, 2);
  }
  function boatOptions(options) {
    var o = options || {}, d = DEFAULT_BOAT;
    var result = {
      waterplaneAreaCm2: finite(own(o, 'waterplaneAreaCm2') ? o.waterplaneAreaCm2 : d.waterplaneAreaCm2, '船底面积', 1, 10000),
      emptyMassG: finite(own(o, 'emptyMassG') ? o.emptyMassG : d.emptyMassG, '船体质量', 0.1, 100000),
      safeDraftCm: finite(own(o, 'safeDraftCm') ? o.safeDraftCm : d.safeDraftCm, '安全吃水', 0.01, 100),
      hullDepthCm: finite(own(o, 'hullDepthCm') ? o.hullDepthCm : d.hullDepthCm, '船体高度', 0.01, 100),
      cargoMassG: finite(own(o, 'cargoMassG') ? o.cargoMassG : d.cargoMassG, '单件货物质量', 0.01, 10000),
      maxCargoUnits: integer(own(o, 'maxCargoUnits') ? o.maxCargoUnits : d.maxCargoUnits, '货物数量上限', 1, 10000)
    };
    if (result.safeDraftCm >= result.hullDepthCm) fail('安全吃水须低于船口');
    return result;
  }
  function boatCapacity(liquidOrDensity, options) {
    var rho = density(liquidOrDensity), o = boatOptions(options);
    var safeTotal = rho * o.waterplaneAreaCm2 * o.safeDraftCm;
    var safeCargo = Math.max(0, safeTotal - o.emptyMassG);
    return {
      density: rho,
      safeTotalMassG: safeTotal,
      maxSafeCargoMassG: safeCargo,
      maxSafeCargoUnits: Math.min(o.maxCargoUnits, Math.max(0, Math.floor((safeTotal - o.emptyMassG + EPS) / o.cargoMassG))),
      emptyBoatSafe: o.emptyMassG <= safeTotal + EPS,
      safeDraftCm: o.safeDraftCm,
      modelNotice: MODEL_NOTICE
    };
  }
  function boatState(liquidOrDensity, cargoUnits, options) {
    var rho = density(liquidOrDensity), o = boatOptions(options);
    integer(cargoUnits, '货物数量', 0, o.maxCargoUnits);
    var cargo = cargoUnits * o.cargoMassG, total = o.emptyMassG + cargo;
    var requiredVolume = total / rho;
    var requiredDraft = requiredVolume / o.waterplaneAreaCm2;
    var swamped = requiredDraft >= o.hullDepthCm - EPS;
    var safe = requiredDraft <= o.safeDraftCm + EPS;
    var capacity = boatCapacity(rho, o);
    return {
      density: rho, cargoUnits: cargoUnits, cargoMassG: cargo, totalMassG: total,
      requiredDisplacedVolumeCm3: requiredVolume,
      requiredDraftCm: requiredDraft,
      draftCm: Math.min(requiredDraft, o.hullDepthCm),
      freeboardCm: Math.max(0, o.hullDepthCm - requiredDraft),
      safeDraftCm: o.safeDraftCm,
      marginCm: o.safeDraftCm - requiredDraft,
      remainingSafeCargoMassG: capacity.maxSafeCargoMassG - cargo,
      maxSafeCargoUnits: capacity.maxSafeCargoUnits,
      weightN: total * 0.00980665,
      buoyancyN: Math.min(requiredVolume, o.waterplaneAreaCm2 * o.hullDepthCm) * rho * 0.00980665,
      floating: !swamped, safe: safe, swamped: swamped,
      status: swamped ? 'swamped' : safe ? 'safe' : 'overloaded',
      modelNotice: MODEL_NOTICE
    };
  }
  function floatOptions(options) {
    var o = options || {}, d = DEFAULT_FLOAT;
    var result = {
      totalMassG: finite(own(o, 'totalMassG') ? o.totalMassG : d.totalMassG, '浮标总质量', 0.1, 200),
      totalLengthCm: finite(own(o, 'totalLengthCm') ? o.totalLengthCm : d.totalLengthCm, '浮标总长', 3, 60),
      bottomVolumeCm3: finite(own(o, 'bottomVolumeCm3') ? o.bottomVolumeCm3 : d.bottomVolumeCm3, '底部体积', 0.01, 100),
      bottomHeightCm: finite(own(o, 'bottomHeightCm') ? o.bottomHeightCm : d.bottomHeightCm, '底部高度', 0.01, 59),
      stemAreaCm2: finite(own(o, 'stemAreaCm2') ? o.stemAreaCm2 : d.stemAreaCm2, '吸管截面积', 0.01, 10)
    };
    if (result.bottomHeightCm >= result.totalLengthCm) fail('底部高度须小于浮标总长');
    return result;
  }
  function floatState(liquidOrDensity, options) {
    var rho = density(liquidOrDensity), o = floatOptions(options);
    var volume = o.totalMassG / rho;
    var maxVolume = o.bottomVolumeCm3 + (o.totalLengthCm - o.bottomHeightCm) * o.stemAreaCm2;
    var immersion = volume <= o.bottomVolumeCm3 ? volume / o.bottomVolumeCm3 * o.bottomHeightCm : o.bottomHeightCm + (volume - o.bottomVolumeCm3) / o.stemAreaCm2;
    var floating = immersion < o.totalLengthCm - EPS;
    return {
      density: rho, totalMassG: o.totalMassG, totalLengthCm: o.totalLengthCm,
      displacedVolumeCm3: Math.min(volume, maxVolume), requiredDisplacedVolumeCm3: volume,
      immersedCm: Math.min(immersion, o.totalLengthCm),
      exposedCm: Math.max(0, o.totalLengthCm - immersion),
      markFromBottomCm: Math.min(immersion, o.totalLengthCm),
      markFromTopCm: Math.max(0, o.totalLengthCm - immersion),
      floating: floating, status: floating ? 'floating' : 'submerged',
      weightN: o.totalMassG * 0.00980665,
      buoyancyN: Math.min(volume, maxVolume) * rho * 0.00980665,
      modelNotice: MODEL_NOTICE
    };
  }
  function iso(value) {
    if (typeof value !== 'string' || value.length > 32 || !isFinite(Date.parse(value))) fail('记录时间格式不正确');
    return new Date(value).toISOString();
  }
  function now() { return new Date().toISOString(); }
  function oneOf(value, allowed, name) {
    if (allowed.indexOf(value) === -1) fail(name + '不正确');
    return value;
  }
  function createSession(group) {
    var at = now();
    return {
      schema: SCHEMA, lesson: LESSON, version: '1.0', group: safeText(group, LIMITS.group),
      createdAt: at, updatedAt: at, round: 1,
      instrument: floatOptions(),
      prediction: { choice: 'unsure', reason: '' },
      readings: { fresh: [], mild: [], brine: [] },
      explanation: '', evidenceIds: [],
      loadDecision: { from: 'brine', to: 'fresh', cargoUnits: 48, decision: '', reason: '' }
    };
  }
  function validateSession(input) {
    var s = object(input, '记录');
    if (s.schema !== SCHEMA || s.version !== '1.0' || s.lesson !== LESSON) fail('不是本课支持的记录文件');
    var p = object(s.prediction, '预测'), r = object(s.readings, '测量记录'), ld = object(s.loadDecision, '装载决定');
    var out = {
      schema: SCHEMA, lesson: LESSON, version: '1.0', group: text(s.group, LIMITS.group, '组号'),
      createdAt: iso(s.createdAt), updatedAt: iso(s.updatedAt),
      round: integer(s.round, '测量轮次', 1, 1000), instrument: floatOptions(object(s.instrument, '浮标参数')),
      prediction: { choice: oneOf(p.choice, ['fresh', 'mild', 'brine', 'same', 'unsure'], '预测'), reason: text(p.reason, LIMITS.note, '预测理由') },
      readings: { fresh: [], mild: [], brine: [] },
      explanation: text(s.explanation, LIMITS.explanation, '解释'), evidenceIds: [],
      loadDecision: { from: liquid(ld.from).id, to: liquid(ld.to).id, cargoUnits: integer(ld.cargoUnits, '装载数量', 0, DEFAULT_BOAT.maxCargoUnits), decision: text(ld.decision, 80, '装载决定'), reason: text(ld.reason, LIMITS.note, '装载理由') }
    };
    var seen = Object.create(null);
    LIQUIDS.forEach(function (l) {
      if (!Array.isArray(r[l.id]) || r[l.id].length > LIMITS.readingsPerLiquid) fail('每种液体最多保留' + LIMITS.readingsPerLiquid + '次记录');
      out.readings[l.id] = r[l.id].map(function (record) {
        var q = object(record, '单次记录');
        var id = text(q.id, 64, '记录编号');
        if (!id || seen[id]) fail('记录编号重复或缺失');
        seen[id] = true;
        var instrument = floatOptions(object(q.instrument, '记录的浮标参数'));
        return {
          id: id, liquidId: l.id, round: integer(q.round, '测量轮次', 1, out.round),
          exposedCm: q.exposedCm === null ? null : finite(q.exposedCm, '浮出高度', 0, instrument.totalLengthCm),
          source: oneOf(q.source, ['measured', 'simulation', 'sketch'], '记录来源'),
          uncertain: q.uncertain === true,
          note: text(q.note, LIMITS.note, '记录说明'), at: iso(q.at), instrument: instrument
        };
      });
    });
    if (!Array.isArray(s.evidenceIds) || s.evidenceIds.length > 30) fail('证据列表格式不正确');
    out.evidenceIds = s.evidenceIds.map(function (id) {
      text(id, 64, '证据编号');
      if (!seen[id]) fail('引用的证据不存在');
      return id;
    }).filter(function (id, index, all) { return all.indexOf(id) === index; });
    return out;
  }
  function addReading(session, liquidId, exposedCm, options) {
    var s = validateSession(session), l = liquid(liquidId), o = options || {};
    if (s.readings[l.id].length >= LIMITS.readingsPerLiquid) fail('本液体已有10次记录，请先导出保存');
    if (exposedCm !== null) finite(exposedCm, '浮出高度', 0, s.instrument.totalLengthCm);
    var total = LIQUIDS.reduce(function (n, q) { return n + s.readings[q.id].length; }, 0);
    var stamp = o.at ? iso(o.at) : now();
    s.readings[l.id].push({
      id: 'r-' + Date.now().toString(36) + '-' + (total + 1),
      liquidId: l.id, round: s.round, exposedCm: exposedCm,
      source: oneOf(o.source || 'measured', ['measured', 'simulation', 'sketch'], '记录来源'),
      uncertain: o.uncertain === true || exposedCm === null,
      note: safeText(o.note, LIMITS.note), at: stamp, instrument: floatOptions(s.instrument)
    });
    s.updatedAt = stamp;
    return s;
  }
  function beginRound(session, instrument) {
    var s = validateSession(session);
    s.round = integer(s.round + 1, '测量轮次', 1, 1000);
    s.instrument = floatOptions(instrument || s.instrument);
    s.updatedAt = now();
    return s;
  }
  function latestReadings(session, round) {
    var s = validateSession(session), activeRound = round == null ? s.round : integer(round, '测量轮次', 1, s.round);
    var result = {};
    LIQUIDS.forEach(function (l) {
      var candidates = s.readings[l.id].filter(function (r) { return r.round === activeRound; });
      result[l.id] = candidates.length ? candidates[candidates.length - 1] : null;
    });
    return result;
  }
  function compareReadings(session, toleranceCm) {
    var t = toleranceCm == null ? 0.15 : finite(toleranceCm, '比较容差', 0, 2);
    var latest = latestReadings(session), list = LIQUIDS.map(function (l) { return latest[l.id]; });
    var result = { status: 'incomplete', message: '还有液体没有记录', readings: latest, toleranceCm: t, order: [], spreadCm: null };
    if (list.some(function (r) { return !r; })) return result;
    if (list.some(function (r) { return r.exposedCm === null || r.uncertain; })) {
      result.status = 'uncertain'; result.message = '有记录尚不清楚，可以复测'; return result;
    }
    if (list.some(function (r) { return JSON.stringify(r.instrument) !== JSON.stringify(list[0].instrument); })) {
      result.status = 'different-instruments'; result.message = '浮标条件发生变化，请用同一浮标重新比较'; return result;
    }
    if (list.some(function (r) { return r.source !== list[0].source; })) {
      result.status = 'mixed-sources'; result.message = '请分别比较实测记录和模型记录'; return result;
    }
    var values = list.map(function (r) { return r.exposedCm; });
    result.spreadCm = Math.max.apply(null, values) - Math.min.apply(null, values);
    result.order = LIQUIDS.map(function (l, i) { return { liquidId: l.id, exposedCm: values[i] }; }).sort(function (a, b) { return b.exposedCm - a.exposedCm; });
    var d1 = values[1] - values[0], d2 = values[2] - values[1];
    if (result.spreadCm <= t) { result.status = 'indistinguishable'; result.message = '差异不明显，暂时不能区分'; }
    else if (d1 > t && d2 > t) { result.status = 'consistent'; result.message = '记录显示：浓盐水露出较多，清水较少'; }
    else if (d1 >= -t && d2 >= -t) { result.status = 'partly-distinguishable'; result.message = '部分差异还不清楚，可以复测'; }
    else { result.status = 'needs-review'; result.message = '记录出现不同的顺序，请检查条件并复测'; }
    return result;
  }
  function utf8Size(str) {
    var bytes = 0;
    for (var i = 0; i < str.length; i++) {
      var n = str.charCodeAt(i);
      if (n < 128) bytes++;
      else if (n < 2048) bytes += 2;
      else if (n >= 0xD800 && n <= 0xDBFF && i + 1 < str.length && str.charCodeAt(i + 1) >= 0xDC00 && str.charCodeAt(i + 1) <= 0xDFFF) { bytes += 4; i++; }
      else bytes += 3;
    }
    return bytes;
  }
  function exportSession(session) {
    var json = JSON.stringify(validateSession(session), null, 2);
    if (utf8Size(json) > LIMITS.jsonBytes) fail('记录文件超过大小上限');
    return json;
  }
  function importSession(json) {
    if (typeof json !== 'string' || json.length > LIMITS.jsonBytes || utf8Size(json) > LIMITS.jsonBytes) fail('记录文件过大或格式不正确');
    var parsed;
    try { parsed = JSON.parse(json); } catch (e) { fail('无法读取JSON记录文件'); }
    return validateSession(parsed);
  }
  return Object.freeze({
    version: '1.0', schema: SCHEMA, lesson: LESSON, modelNotice: MODEL_NOTICE,
    LIQUIDS: LIQUIDS, DEFAULT_BOAT: DEFAULT_BOAT, DEFAULT_FLOAT: DEFAULT_FLOAT, LIMITS: LIMITS,
    getLiquid: liquid, boatState: boatState, boatCapacity: boatCapacity,
    floatState: floatState, createSession: createSession, validateSession: validateSession,
    addReading: addReading, beginRound: beginRound, latestReadings: latestReadings,
    compareReadings: compareReadings, exportSession: exportSession, importSession: importSession,
    safeText: safeText, escapeHtml: escapeHtml
  });
}));
