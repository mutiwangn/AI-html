/* 船的最大装载量 · 航行与安全装载模型 v2.0.
 * Pure, deterministic calculation; no DOM, storage or network side effects.
 * Internal g/cm units preserve the v1 drawing geometry. Display mapping:
 *   1 model cm = 1 displayed m; 1 model g = 20 displayed t.
 * This implies a displayed waterplane area of 2000 m² and 100 t per cargo unit.
 * Region densities, waves, margins and flooding rates are teaching parameters,
 * not measurements of the named rivers, legal load lines or real ship design.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VoyageLogic = api;
}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var EPS = 1e-9, TAU = Math.PI * 2;
  var MODEL_NOTICE = '水域数据为教学样本；黄河水的密度随含沙量等条件变化。';
  var FLOOD_NOTICE = '进水演示假设船口未封闭，过程时间经过缩放。';
  var DEFAULT_BOAT = Object.freeze({
    waterplaneAreaCm2: 100, emptyMassG: 80, cargoMassG: 5,
    hullDepthCm: 4.4, maxCargoUnits: 80, calmSafeDraftCm: 4.0,
    displayMetersPerModelCm: 1, displayTonnesPerModelGram: 20,
    waterplaneAreaM2: 2000, emptyMassT: 1600, cargoMassPerUnitT: 100,
    hullDepthM: 4.4, calmSafeDraftM: 4.0,
    // Sprite geometry: hull depth = 0.27 of sprite height; aspect = 1942 / 809.
    // Samples at +/-0.43 ship widths therefore have the following lever arm.
    renderedShipLengthCm: 4.4 / 0.27 * 1942 / 809,
    waveSampleX: 0.43
  });
  var REGIONS = Object.freeze([
    Object.freeze({ id: 'yangtze', name: '长江', density: 1.000,
      sampleVolumeMl: 1000, sampleMassG: 1000, detail: '本次水样：含沙较少',
      safeDraftCm: 4.0, safeDraftM: 4.0, waveAmplitudeCm: 0.08,
      waveAmplitudeM: 0.08, wavePeriodSec: 4.8, heaveAmplitudeCm: 0.025,
      pitchAmplitudeRad: 0.001, color: '#5a9b9f', waterColor: '#74b7bc' }),
    Object.freeze({ id: 'ocean', name: '海洋', density: 1.025,
      sampleVolumeMl: 1000, sampleMassG: 1025, detail: '本次水样：含有盐分',
      safeDraftCm: 3.2, safeDraftM: 3.2, waveAmplitudeCm: 0.85,
      waveAmplitudeM: 0.85, wavePeriodSec: 3.4, heaveAmplitudeCm: 0.12,
      pitchAmplitudeRad: 0.004, color: '#287da5', waterColor: '#408cbb' }),
    Object.freeze({ id: 'yellow', name: '黄河', density: 1.050,
      sampleVolumeMl: 1000, sampleMassG: 1050, detail: '本次水样：含沙较多',
      safeDraftCm: 4.0, safeDraftM: 4.0, waveAmplitudeCm: 0.08,
      waveAmplitudeM: 0.08, wavePeriodSec: 4.8, heaveAmplitudeCm: 0.025,
      pitchAmplitudeRad: 0.001, color: '#b28b45', waterColor: '#c6a46a' })
  ]);
  var ROUTE = Object.freeze(['yangtze', 'ocean', 'yellow']);
  function fail(message) { throw new Error(message); }
  function number(value, name, min, max) {
    if (typeof value !== 'number' || !isFinite(value) || value < min || value > max) fail(name + '超出有效范围');
    return value;
  }
  function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
  function getRegion(id) {
    for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].id === id) return REGIONS[i];
    fail('未知水域');
  }
  function conditions(options) {
    var c = options && own(options, 'conditions') ? options.conditions : 'region';
    if (c !== 'region' && c !== 'calm') fail('未知风浪条件');
    return c;
  }
  function safetyDraft(region, options) {
    return conditions(options) === 'calm' ? DEFAULT_BOAT.calmSafeDraftCm : region.safeDraftCm;
  }
  function waveSample(w, xNormalized) {
    number(xNormalized, '水面位置', -10000, 10000);
    return w.amplitudeCm * (0.82 * Math.sin(w.phase + TAU * 1.35 * xNormalized)
      + 0.18 * Math.sin(2 * w.phase + TAU * 2.7 * xNormalized + 0.4));
  }
  function wave(id, timeSec, options) {
    var r = getRegion(id), calm = conditions(options) === 'calm';
    number(timeSec, '实验时间', 0, 1e10);
    var phase = (timeSec % r.wavePeriodSec) * TAU / r.wavePeriodSec;
    var amplitude = calm ? 0 : r.waveAmplitudeCm;
    var heave = calm ? 0 : r.heaveAmplitudeCm * Math.sin(phase + 0.2);
    var pitch = calm ? 0 : r.pitchAmplitudeRad * Math.sin(phase - 0.3);
    var lever = DEFAULT_BOAT.renderedShipLengthCm * DEFAULT_BOAT.waveSampleX;
    var tilt = Math.sin(pitch) * lever;
    var w = {
      region: id, timeSec: timeSec, conditions: calm ? 'calm' : 'region',
      phase: phase, cyclesPerShip: 1.35, amplitudeCm: amplitude,
      amplitudeM: amplitude, waveAmplitudeCm: amplitude, waveAmplitudeM: amplitude,
      periodSec: r.wavePeriodSec, heaveCm: heave, heaveM: heave,
      pitchRad: pitch, leverArmCm: lever,
      bowLiftCm: heave + tilt, sternLiftCm: heave - tilt
    };
    w.surfaceAtBowCm = waveSample(w, DEFAULT_BOAT.waveSampleX);
    w.surfaceAtSternCm = waveSample(w, -DEFAULT_BOAT.waveSampleX);
    w.relativeBowCrestCm = w.surfaceAtBowCm - w.bowLiftCm;
    w.relativeSternCrestCm = w.surfaceAtSternCm - w.sternLiftCm;
    w.maxRelativeCrestCm = Math.max(w.relativeBowCrestCm, w.relativeSternCrestCm);
    return w;
  }
  function state(id, cargoUnits, options) {
    var r = getRegion(id), b = DEFAULT_BOAT, o = options || {}, c = conditions(o);
    number(cargoUnits, '货物数量', 0, b.maxCargoUnits);
    var flood = own(o, 'floodMassG') ? number(o.floodMassG, '进水质量', 0, 10000) : 0;
    var sink = own(o, 'sinkProgress') ? number(o.sinkProgress, '沉没进度', 0, 1) : 0;
    var cargo = cargoUnits * b.cargoMassG, dry = b.emptyMassG + cargo, total = dry + flood;
    var requiredDraft = total / (r.density * b.waterplaneAreaCm2);
    var limit = safetyDraft(r, o), maxBuoyant = r.density * b.waterplaneAreaCm2 * b.hullDepthCm;
    var safeCargo = Math.max(0, r.density * b.waterplaneAreaCm2 * limit - b.emptyMassG - flood);
    var safe = requiredDraft <= limit + EPS && sink === 0;
    var swamped = requiredDraft >= b.hullDepthCm - EPS;
    var isSunk = sink >= 1 - EPS;
    var status = isSunk ? 'sunk' : sink > 0 ? 'sinking' : flood > EPS ? 'flooding' : swamped ? 'swamped' : safe ? 'safe' : 'overloaded';
    return {
      region: id, density: r.density, conditions: c,
      cargoUnits: cargoUnits, cargoMassG: cargo, cargoMassT: cargo * 20,
      dryMassG: dry, dryMassT: dry * 20, totalMassG: total, totalMassT: total * 20,
      floodMassG: flood, floodMassT: flood * 20, sinkProgress: sink,
      requiredDraftCm: requiredDraft, requiredDraftM: requiredDraft,
      draftCm: Math.min(requiredDraft, b.hullDepthCm), draftM: Math.min(requiredDraft, b.hullDepthCm),
      freeboardCm: Math.max(0, b.hullDepthCm - requiredDraft), freeboardM: Math.max(0, b.hullDepthCm - requiredDraft),
      safeDraftCm: limit, safeDraftM: limit, hullDepthCm: b.hullDepthCm, hullDepthM: b.hullDepthCm,
      marginCm: limit - requiredDraft, marginM: limit - requiredDraft,
      maxSafeCargoMassG: safeCargo, maxSafeCargoMassT: safeCargo * 20,
      maxSafeCargoUnits: Math.min(b.maxCargoUnits, Math.max(0, Math.floor((safeCargo + EPS) / b.cargoMassG))),
      waveAmplitudeCm: c === 'calm' ? 0 : r.waveAmplitudeCm,
      waveAmplitudeM: c === 'calm' ? 0 : r.waveAmplitudeCm,
      reserveMassG: Math.max(0, maxBuoyant - total), reserveMassT: Math.max(0, maxBuoyant - total) * 20,
      requiredDisplacedVolumeCm3: total / r.density,
      displacedVolumeM3: Math.min(total / r.density, b.waterplaneAreaCm2 * b.hullDepthCm) * 20,
      weightN: total * 0.00980665,
      buoyancyN: Math.min(total, maxBuoyant) * 0.00980665,
      safe: safe, floating: !swamped && !isSunk, swamped: swamped,
      hydrostaticLost: swamped, isSunk: isSunk, breach: swamped,
      status: status, modelNotice: MODEL_NOTICE
    };
  }
  function atDraft(id, draftCm, options) {
    var r = getRegion(id), b = DEFAULT_BOAT, o = options || {};
    number(draftCm, '吃水深度', 0, b.hullDepthCm);
    var flood = own(o, 'floodMassG') ? number(o.floodMassG, '进水质量', 0, 10000) : 0;
    var cargo = r.density * b.waterplaneAreaCm2 * draftCm - b.emptyMassG - flood;
    if (cargo < -EPS || cargo > b.cargoMassG * b.maxCargoUnits + EPS) fail('该吃水无法由本模型货物范围实现');
    var s = state(id, Math.max(0, cargo) / b.cargoMassG, o);
    s.targetDraftCm = draftCm; s.targetDraftM = draftCm;
    return s;
  }
  function compareAtLoad(cargoUnits, options) {
    return ROUTE.map(function (id) { return state(id, cargoUnits, options); });
  }
  function compareAtDraft(draftCm, options) {
    return ROUTE.map(function (id) { return atDraft(id, draftCm, options); });
  }
  function predict(from, to, cargoUnits) {
    var a = state(from, cargoUnits, { conditions: 'calm' }).requiredDraftCm;
    var b = state(to, cargoUnits, { conditions: 'calm' }).requiredDraftCm;
    return Math.abs(a - b) < EPS ? 'same' : b < a ? 'up' : 'down';
  }
  function createFlood() {
    return { elapsedSec: 0, floodMassG: 0, floodMassT: 0, sinkProgress: 0,
      breach: false, breachDepthCm: 0, breachAt: null, everBreached: false,
      isSunk: false, status: 'dry' };
  }
  function stepFlood(previous, id, cargoUnits, dtSec, options) {
    var p = previous || createFlood(), r = getRegion(id), b = DEFAULT_BOAT;
    var elapsed = number(p.elapsedSec, '累计时间', 0, 1e10);
    var flood = number(p.floodMassG, '进水质量', 0, 10000);
    var sink = number(p.sinkProgress, '沉没进度', 0, 1);
    // A hidden tab or long frame must not skip directly to a sunk vessel.
    var dt = Math.min(number(dtSec, '时间间隔', 0, 1e8), 0.1);
    var o = { conditions: conditions(options), floodMassG: flood, sinkProgress: sink };
    var oldBoat = state(id, cargoUnits, o);
    var w = wave(id, elapsed + dt, o);
    var bow = oldBoat.requiredDraftCm + w.relativeBowCrestCm - b.hullDepthCm;
    var stern = oldBoat.requiredDraftCm + w.relativeSternCrestCm - b.hullDepthCm;
    var staticBreach = oldBoat.requiredDraftCm - b.hullDepthCm;
    var breachDepth = Math.max(0, bow, stern, staticBreach);
    // At the exact rim the open model admits water; merely crossing the lower
    // safety mark does not. Water mass remains after a wave passes or unloading.
    var breach = breachDepth > EPS || oldBoat.swamped;
    if (breach && sink < 1) {
      var intake = Math.max(breachDepth, oldBoat.swamped ? 0.04 : 0) * 120 * r.density * dt;
      // The model has a finite open hull volume. Preserve already-carried water
      // if the surrounding liquid changes, but do not create unlimited water.
      var waterCapacity = r.density * b.waterplaneAreaCm2 * b.hullDepthCm;
      flood = Math.min(Math.max(flood, waterCapacity), flood + intake);
    }
    var boat = state(id, cargoUnits, { conditions: o.conditions, floodMassG: flood, sinkProgress: sink });
    if ((boat.hydrostaticLost || sink > 0) && sink < 1) {
      // Reserve buoyancy has been used up. The visible submergence is a gradual
      // classroom animation, not a real-world time-to-sink prediction.
      sink = Math.min(1, sink + dt * (0.20 + Math.min(0.20, Math.max(0, boat.requiredDraftCm - b.hullDepthCm) * 0.10)));
    }
    boat = state(id, cargoUnits, { conditions: o.conditions, floodMassG: flood, sinkProgress: sink });
    boat.breach = breach;
    var out = {
      elapsedSec: elapsed + dt, floodMassG: flood, floodMassT: flood * 20,
      sinkProgress: sink, breach: breach, breachDepthCm: breachDepth,
      breachAt: breach ? (bow >= stern ? 'bow' : 'stern') : null,
      everBreached: p.everBreached === true || breach,
      isSunk: boat.isSunk,
      status: boat.isSunk ? 'sunk' : sink > 0 ? 'sinking' : flood > EPS ? 'flooding' : 'dry',
      boat: boat, wave: w, floodNotice: FLOOD_NOTICE
    };
    return out;
  }
  return Object.freeze({
    version: '2.0', REGIONS: REGIONS, ROUTE: ROUTE, DEFAULT_BOAT: DEFAULT_BOAT,
    modelNotice: MODEL_NOTICE, floodNotice: FLOOD_NOTICE,
    getRegion: getRegion, state: state, boatState: state, atDraft: atDraft,
    compareAtLoad: compareAtLoad, compareAtDraft: compareAtDraft, predict: predict,
    wave: wave, waveSample: waveSample, createFlood: createFlood, stepFlood: stepFlood
  });
}));
