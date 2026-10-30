/* 船的最大装载量 · deterministic Canvas 2D scientific scenes · v2.0
 * Instrument geometry is drawn from lengths, not raster pixels.
 * No external dependencies or WebGL. Assets are optional same-origin images.
 */
(function (root) {
  'use strict';
  var COLORS = { ink: '#112a4b', muted: '#668099', teal: '#008f98', fresh: '#169abf', mild: '#4d7fc2', brine: '#7861b2', amber: '#d58b31', red: '#d25148' };
  var IDS = ['fresh', 'mild', 'brine'];
  var NAMES = { fresh: '清水', mild: '淡盐水', brine: '浓盐水' };
  var FONT = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
  function n(v, fallback) { return typeof v === 'number' && isFinite(v) ? v : fallback; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rr(c, x, y, w, h, radius) {
    var r = Math.min(radius || 0, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function ellipse(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0, rx), Math.max(0, ry == null ? rx : ry), 0, 0, Math.PI * 2); }
  function line(c, x1, y1, x2, y2, color, width, dash) {
    c.save(); c.strokeStyle = color; c.lineWidth = width || 1; c.lineCap = 'round';
    if (dash) c.setLineDash(dash); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore();
  }
  function label(c, text, x, y, size, color, align, weight) {
    var weightValue = Math.round((weight || 600) / 100) * 100;
    c.save(); c.font = weightValue + ' ' + size + 'px ' + FONT; c.textAlign = align || 'center';
    c.textBaseline = 'middle'; c.fillStyle = color || COLORS.ink; c.fillText(text, x, y); c.restore();
  }
  function FloatRenderer(canvas, options) {
    if (!canvas || !canvas.getContext) throw new Error('需要Canvas画布');
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    if (!this.ctx) throw new Error('设备不支持Canvas 2D');
    this.options = options || {}; this.images = {}; this.model = null; this.geometry = null; this.destroyed = false;
    var self = this;
    this.resizeHandler = function () { if (self.model && !self.destroyed) self.render(self.model); };
    if (typeof ResizeObserver !== 'undefined') { this.observer = new ResizeObserver(this.resizeHandler); this.observer.observe(canvas); }
    else if (root.addEventListener) root.addEventListener('resize', this.resizeHandler);
    this.setAssets(this.options);
  }
  FloatRenderer.prototype.setAssets = function (options) {
    var self = this; options = options || {};
    ['shipSrc', 'harborSrc', 'labSrc'].forEach(function (key) {
      if (!options[key]) return;
      self.options[key] = options[key]; var im = new Image();
      im.onload = function () { if (self.destroyed) return; self.images[key] = im; if (self.model) self.render(self.model); };
      im.onerror = function () { self.images[key] = null; if (self.model) self.render(self.model); };
      im.src = options[key];
    });
  };
  FloatRenderer.prototype.resize = function () {
    var box = this.canvas.getBoundingClientRect();
    var w = Math.max(1, box.width || this.canvas.clientWidth || 800), h = Math.max(1, box.height || this.canvas.clientHeight || 600);
    var dpr = Math.min(2, Math.max(1, root.devicePixelRatio || 1));
    var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) { this.canvas.width = pw; this.canvas.height = ph; }
    this.width = w; this.height = h; this.dpr = dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { width: w, height: h };
  };
  FloatRenderer.prototype.render = function (model) {
    if (this.destroyed) return;
    this.model = model || {}; this.resize(); this.geometry = null;
    var c = this.ctx; c.clearRect(0, 0, this.width, this.height);
    if (this.model.page === 'bridge') this.drawBridge(this.model);
    else if (this.model.page === 'measure') this.drawMeasure(this.model);
    else if (this.model.page === 'compare') this.drawCompare(this.model);
    else this.drawShip(this.model);
  };
  FloatRenderer.prototype.getGeometry = function () {
    if (!this.geometry) return null;
    var result = {};
    Object.keys(this.geometry).forEach(function (key) {
      var value = this.geometry[key];
      result[key] = value && typeof value === 'object' ? Object.assign({}, value) : value;
    }, this);
    return result;
  };
  FloatRenderer.prototype.destroy = function () {
    this.destroyed = true; if (this.observer) this.observer.disconnect();
    if (root.removeEventListener) root.removeEventListener('resize', this.resizeHandler);
    this.model = null; this.images = {}; this.geometry = null;
  };
  FloatRenderer.prototype.coverImage = function (im, x, y, w, h) {
    if (!im || !im.width) return false;
    var scale = Math.max(w / im.width, h / im.height), sw = w / scale, sh = h / scale;
    this.ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h); return true;
  };
  FloatRenderer.prototype.labBackground = function () {
    var c = this.ctx, w = this.width, h = this.height;
    if (this.coverImage(this.images.labSrc, 0, 0, w, h)) return;
    var bg = c.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#f5fbff'); bg.addColorStop(0.55, '#edf6fa'); bg.addColorStop(1, '#dcebf2');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    var floor = c.createLinearGradient(0, h * 0.68, 0, h); floor.addColorStop(0, 'rgba(255,255,255,0)'); floor.addColorStop(0.16, 'rgba(255,255,255,.85)'); floor.addColorStop(1, '#eaf3f7');
    c.fillStyle = floor; c.fillRect(0, h * 0.68, w, h * 0.32);
    line(c, 0, h * 0.77, w, h * 0.77, 'rgba(185,207,218,.25)', 1);
  };
  FloatRenderer.prototype.beakerBack = function (x, top, width, bottom, waterY, subtle) {
    var c = this.ctx, left = x - width / 2, right = x + width / 2, ry = clamp(width * 0.055, 9, 19);
    c.save();
    c.shadowColor = 'rgba(40,75,98,.15)'; c.shadowBlur = 18; c.shadowOffsetY = 8;
    ellipse(c, x, bottom + 5, width * 0.57, ry * 1.02); c.fillStyle = 'rgba(52,91,116,.10)'; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
    var glass = c.createLinearGradient(left, 0, right, 0);
    glass.addColorStop(0, 'rgba(119,169,190,.13)'); glass.addColorStop(.10, 'rgba(255,255,255,.32)');
    glass.addColorStop(.4, 'rgba(255,255,255,.07)'); glass.addColorStop(.88, 'rgba(255,255,255,.43)'); glass.addColorStop(1, 'rgba(91,147,171,.18)');
    c.fillStyle = glass; rr(c, left, top, width, bottom - top, width * .07); c.fill();
    var water = c.createLinearGradient(0, waterY, 0, bottom);
    water.addColorStop(0, subtle ? 'rgba(113,201,223,.17)' : 'rgba(93,192,217,.22)');
    water.addColorStop(.8, subtle ? 'rgba(90,182,207,.21)' : 'rgba(63,170,198,.29)'); water.addColorStop(1, 'rgba(74,160,188,.30)');
    c.beginPath(); c.moveTo(left + 4, waterY); c.lineTo(left + 4, bottom - ry);
    c.quadraticCurveTo(left + 8, bottom + 4, x, bottom + 3);
    c.quadraticCurveTo(right - 8, bottom + 4, right - 4, bottom - ry); c.lineTo(right - 4, waterY); c.closePath();
    c.fillStyle = water; c.fill();
    ellipse(c, x, waterY, width / 2 - 4, ry * .72); c.fillStyle = 'rgba(200,239,245,.48)'; c.fill();
    c.strokeStyle = 'rgba(75,160,185,.35)'; c.lineWidth = 1; c.stroke();
    // Far rim, behind the instrument.
    ellipse(c, x, top, width / 2, ry); c.fillStyle = 'rgba(244,252,255,.24)'; c.fill(); c.strokeStyle = 'rgba(95,145,164,.5)'; c.lineWidth = 2; c.stroke();
    c.restore();
  };
  FloatRenderer.prototype.beakerFront = function (x, top, width, bottom, waterY) {
    var c = this.ctx, left = x - width / 2, right = x + width / 2, ry = clamp(width * .055, 9, 19);
    c.save();
    // Glass thickness, specular strips and the front rim are independent of water density.
    line(c, left, top, left + 3, bottom - ry, 'rgba(72,126,147,.42)', 2.5);
    line(c, left + 6, top + 8, left + 8, bottom - ry, 'rgba(255,255,255,.9)', 3.5);
    line(c, left + 13, top + 13, left + 15, bottom - ry - 9, 'rgba(255,255,255,.4)', 4);
    line(c, right, top, right - 3, bottom - ry, 'rgba(75,124,143,.48)', 2.5);
    line(c, right - 7, top + 9, right - 9, bottom - ry, 'rgba(255,255,255,.85)', 3);
    c.beginPath(); c.ellipse(x, bottom - ry * .15, width / 2 - 3, ry * .85, 0, 0, Math.PI);
    c.strokeStyle = 'rgba(79,133,154,.55)'; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.ellipse(x, bottom - ry * .15 - 5, width / 2 - 8, ry * .7, 0, 0, Math.PI);
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.ellipse(x, top, width / 2, ry, 0, 0, Math.PI);
    c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 5; c.stroke();
    c.strokeStyle = 'rgba(71,130,153,.55)'; c.lineWidth = 1.6; c.stroke();
    // A front meniscus line crosses the straw exactly at its reading height.
    line(c, left + 5, waterY, right - 5, waterY, 'rgba(33,150,182,.35)', 1.5);
    line(c, left + 9, waterY + 2.5, right - 9, waterY + 2.5, 'rgba(255,255,255,.82)', 1.3);
    c.restore();
  };
  FloatRenderer.prototype.straw = function (x, top, scale, options) {
    var c = this.ctx; options = options || {};
    var sw = clamp(scale * .95, 12, 23), stemH = scale * 22, ballastH = scale * 2, ballastW = sw * 2.6;
    c.save(); if (options.faint) c.globalAlpha = .20;
    var shade = c.createLinearGradient(x - sw / 2, 0, x + sw / 2, 0);
    shade.addColorStop(0, '#b8c9d3'); shade.addColorStop(.24, '#f4f8fa'); shade.addColorStop(.49, '#fff'); shade.addColorStop(.8, '#e6eef2'); shade.addColorStop(1, '#adbfca');
    c.fillStyle = shade; rr(c, x - sw / 2, top, sw, stemH + ballastH * .2, sw * .15); c.fill();
    line(c, x - sw / 2 + 1, top + 3, x - sw / 2 + 1, top + stemH, 'rgba(255,255,255,.9)', 1);
    ellipse(c, x, top + 1, sw / 2, Math.max(2, sw * .12)); c.fillStyle = '#e4edf2'; c.fill();
    ellipse(c, x, top + 1, sw * .30, Math.max(1, sw * .075)); c.fillStyle = '#aebec7'; c.fill();
    // The straw is deliberately ungraduated; students use an independent ruler.
    // Clay ballast is two centimetres high; its bottom is the float's 24 cm endpoint.
    var by = top + stemH, br = ballastW * .28;
    var clay = c.createLinearGradient(x - ballastW / 2, by, x + ballastW / 2, by + ballastH);
    clay.addColorStop(0, '#4ba5ac'); clay.addColorStop(.37, '#29848d'); clay.addColorStop(1, '#155260');
    c.fillStyle = clay;
    c.beginPath(); c.moveTo(x - ballastW * .39, by + ballastH * .02);
    c.bezierCurveTo(x - ballastW * .62, by + ballastH * .25, x - ballastW * .52, by + ballastH * .92, x - ballastW * .23, by + ballastH);
    c.bezierCurveTo(x + ballastW * .34, by + ballastH * 1.03, x + ballastW * .59, by + ballastH * .87, x + ballastW * .48, by + ballastH * .31);
    c.bezierCurveTo(x + ballastW * .44, by - ballastH * .03, x + ballastW * .18, by - ballastH * .04, x, by + ballastH * .06);
    c.bezierCurveTo(x - ballastW * .08, by - ballastH * .02, x - ballastW * .25, by - ballastH * .06, x - ballastW * .39, by + ballastH * .02);
    c.fill();
    line(c, x - ballastW * .3, by + ballastH * .25, x - ballastW * .24, by + ballastH * .67, 'rgba(158,222,218,.25)', Math.max(1, br * .3));
    c.restore(); return { width: sw, bottom: top + scale * 24 };
  };
  function ease(v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }
  FloatRenderer.prototype.drawRuler = function (x, zeroY, scale, options) {
    var c = this.ctx; options = options || {};
    var width = options.width || clamp(scale * 4.1, 47, 66), length = 24;
    var left = x - width / 2, top = zeroY - length * scale - 28;
    c.save(); c.globalAlpha = n(options.alpha, 1);
    c.shadowColor = 'rgba(41,79,96,.13)'; c.shadowBlur = 8; c.shadowOffsetX = 3; c.shadowOffsetY = 3;
    var fill = c.createLinearGradient(left, 0, left + width, 0);
    fill.addColorStop(0, 'rgba(246,225,153,.92)'); fill.addColorStop(.52, 'rgba(255,245,198,.96)'); fill.addColorStop(1, 'rgba(228,202,118,.88)');
    rr(c, left, top, width, length * scale + 40, 8); c.fillStyle = fill; c.fill(); c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0;
    c.strokeStyle = 'rgba(139,115,49,.45)'; c.lineWidth = 1.2; c.stroke();
    // Zero at the bottom. Numbers increase upwards to measure exposed height.
    for (var k = 0; k <= length * 10; k++) {
      var y = zeroY - k * scale / 10, major = k % 10 === 0, half = k % 5 === 0;
      if (!major && !half && scale < 12 && !options.fine) continue;
      line(c, left + 2, y, left + (major ? width * .37 : half ? width * .26 : width * .15), y, '#6e633d', major ? 1.5 : .8);
      if (major && (k % 20 === 0 || scale >= 18)) label(c, String(k / 10), left + width * .63, y, (scale < 8 ? 9 : clamp(scale * .96, 12, 18)), '#5e552f', 'center', k === 0 ? 700 : 500);
    }
    line(c, left, zeroY, left + width, zeroY, '#d18b14', 2.5);
    label(c, 'cm', x, top + 11, 12, '#8c7940', 'center', 500);
    c.restore();
    return { x: left - 7, y: top - 4, width: width + 14, height: length * scale + 48 };
  };
  FloatRenderer.prototype.drawMeasure = function (m) {
    var c = this.ctx, w = this.width, h = this.height; this.labBackground();
    var exposure = clamp(n(m.floatExposure, 10), 0, 24);
    // Fixed geometry across liquids: both the complete 24 cm ruler and a freely
    // floating 24 cm instrument fit, including the full accepted measurement range.
    var marginTop = Math.min(78, h * .15), marginBottom = Math.min(64, h * .14);
    var above = 26, below = 26;
    var scale = Math.max(1.8, (h - marginTop - marginBottom) / (above + below));
    var waterY = marginTop + above * scale, floatTop = waterY - exposure * scale;
    var center = w * .41, glassWidth = Math.min(w * .44, scale * 22.5);
    var glassTop = marginTop + 4 * scale, glassBottom = waterY + below * scale;
    var p = clamp(n(m.transition, 1), 0, 1), changing = p < .999 && m.fromLiquid && m.fromLiquid !== m.liquid;
    if (changing && p < .55) floatTop = waterY - clamp(n(m.fromFloatExposure, exposure), 0, 24) * scale;
    var cupProgress = changing ? ease((p - .20) / .52) : 1;
    var lift = 0;
    if (changing) lift = (floatTop + 24 * scale - glassTop + 24) * (p < .27 ? ease(p / .27) : p > .72 ? 1 - ease((p - .72) / .28) : 1);
    function cup(renderer, x, id) {
      renderer.beakerBack(x, glassTop, glassWidth, glassBottom, waterY, false);
      renderer.beakerFront(x, glassTop, glassWidth, glassBottom, waterY);
      var tagW = Math.min(120, glassWidth * .62), tagH = clamp(scale * 2.5, 27, 38);
      c.save(); c.fillStyle = 'rgba(255,255,255,.90)'; rr(c, x - tagW / 2, glassBottom - tagH - 12, tagW, tagH, 8); c.fill();
      label(c, NAMES[id] || '', x, glassBottom - tagH / 2 - 12, clamp(scale * 1.35, 15, 22), COLORS[id] || COLORS.teal, 'center', 700); c.restore();
    }
    if (changing) {
      cup(this, center - cupProgress * w * 1.02, m.fromLiquid);
      cup(this, center + (1 - cupProgress) * w * 1.02, m.liquid);
    } else this.beakerBack(center, glassTop, glassWidth, glassBottom, waterY, false);
    this.straw(center, floatTop - lift, scale, {});
    if (!changing) {
      this.beakerFront(center, glassTop, glassWidth, glassBottom, waterY);
      var tagW = Math.min(120, glassWidth * .62), tagH = clamp(scale * 2.5, 27, 38);
      c.fillStyle = 'rgba(255,255,255,.90)'; rr(c, center - tagW / 2, glassBottom - tagH - 12, tagW, tagH, 8); c.fill();
      label(c, NAMES[m.liquid] || '', center, glassBottom - tagH / 2 - 12, clamp(scale * 1.35, 15, 22), COLORS[m.liquid] || COLORS.teal, 'center', 700);
    }
    if (changing && lift > 1) {
      // The same instrument is lifted clear before its container is replaced.
      line(c, center - 7, floatTop - lift - 10, center - 7, floatTop - lift + 8, '#597f91', 3);
      line(c, center + 7, floatTop - lift - 10, center + 7, floatTop - lift + 8, '#597f91', 3);
    }
    var ruler = m.ruler || {}, hasX = Number.isFinite(ruler.offsetXcm), hasY = Number.isFinite(ruler.zeroOffsetCm);
    var rulerX = hasX ? clamp(center + ruler.offsetXcm * scale, .06 * w, .94 * w) : clamp(n(ruler.x, .61), .06, .94) * w;
    if (ruler.nearFloat) { var nearLimit = Math.max(94, scale * 6) - 4; rulerX = clamp(rulerX, center - nearLimit, center + nearLimit); }
    var rulerZeroY = hasY ? clamp(waterY + ruler.zeroOffsetCm * scale, .04 * h, .96 * h) : clamp(n(ruler.y, (waterY + 3 * scale) / h), .04, .96) * h;
    var rulerWidth = clamp(scale * 4.1, 47, 66);
    var rulerRect = this.drawRuler(rulerX, rulerZeroY, scale, { width: rulerWidth, alpha: changing ? .25 : 1 });
    var near = Math.abs(rulerX - center) < Math.max(94, scale * 6), aligned = !changing && near && Math.abs(rulerZeroY - waterY) <= Math.max(3, scale * .18);
    if (!changing) {
      line(c, center - 18, waterY, rulerX + rulerWidth * .5, waterY, 'rgba(31,155,176,.38)', 1.3, [5, 5]);
      line(c, rulerX - rulerWidth * .5 - 14, rulerZeroY, rulerX - rulerWidth * .5, rulerZeroY, '#ca8a18', 2.5);
      var chosen = m.markerExposure == null ? null : clamp(n(m.markerExposure, exposure), 0, 24);
      if (chosen != null) line(c, center - 10, waterY - chosen * scale, center + 16, waterY - chosen * scale, COLORS[m.liquid] || COLORS.teal, 3);
      var magR = clamp(Math.min(w * .135, h * .165), 42, 102), magX = w - magR - Math.max(16, w * .035), magY = marginTop + magR + 3;
      if (w >= 320 && h >= 300) this.measureMagnifier({ x: magX, y: magY, r: magR, centerX: center, floatTopY: floatTop, rulerX: rulerX, rulerZeroY: rulerZeroY, rulerWidth: rulerWidth, waterY: waterY, scale: scale, near: near });
    }
    this.geometry = { floatTopY: floatTop, pxPerCm: scale, waterY: waterY, centerX: center,
      totalLengthCm: 24, rulerRect: rulerRect, rulerX: rulerX, rulerZeroY: rulerZeroY,
      rulerReadingCm: (rulerZeroY - floatTop) / scale, rulerAligned: aligned, transitioning: changing,
      markerY: waterY - n(m.markerExposure, exposure) * scale,
      markRect: { x: center - 35, y: floatTop - 10, width: 70, height: exposure * scale + 20 } };
  };
  FloatRenderer.prototype.measureMagnifier = function (g) {
    var c = this.ctx, z = 2.0;
    var sourceX = g.near ? (g.r < 75 ? g.rulerX - g.rulerWidth * .05 : (g.centerX + g.rulerX + g.rulerWidth * .45) / 2) : g.centerX;
    c.save();
    line(c, g.centerX + 7, g.floatTopY, g.x - g.r * .6, g.y + g.r * .66, 'rgba(31,122,139,.45)', 1.3);
    c.shadowColor = 'rgba(37,71,91,.12)'; c.shadowBlur = 12; c.shadowOffsetY = 5;
    ellipse(c, g.x, g.y, g.r); c.fillStyle = '#f7fcff'; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.save(); ellipse(c, g.x, g.y, g.r - 2); c.clip();
    c.translate(g.x, g.y); c.scale(z, z); c.translate(-sourceX, -g.floatTopY);
    this.straw(g.centerX, g.floatTopY, g.scale, {});
    if (g.near) this.drawRuler(g.rulerX, g.rulerZeroY, g.scale, { width: g.rulerWidth, fine: true });
    line(c, g.centerX - 10, g.floatTopY, g.rulerX + g.rulerWidth / 2, g.floatTopY, 'rgba(0,132,147,.7)', 1.1, [4, 3]);
    c.restore();
    ellipse(c, g.x, g.y, g.r); c.strokeStyle = '#197e8b'; c.lineWidth = 2.5; c.stroke();
    ellipse(c, g.x, g.y, g.r - 4); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.5; c.stroke(); c.restore();
  };
  FloatRenderer.prototype.drawCompare = function (m) {
    var c = this.ctx, w = this.width, h = this.height; this.labBackground();
    var readings = m.readings || {}, values = IDS.map(function (id) { var v = readings[id]; return typeof v === 'number' && isFinite(v) ? clamp(v, 0, 24) : null; });
    var valid = values.filter(function (v) { return v != null; });
    var topMargin = Math.min(150, Math.max(115, h * .20)), bottomMargin = Math.min(78, h * .18);
    var above = Math.max(14, valid.length ? Math.max.apply(null, valid) + 1 : 14);
    var below = Math.max(16, valid.length ? 24 - Math.min.apply(null, valid) + 3 : 16);
    var scale = Math.max(2, (h - topMargin - bottomMargin) / (m.align === 'float' ? 28 : above + below));
    var commonWater = topMargin + above * scale, fixedTop = topMargin + 1.0 * scale;
    var colW = w / 3, sceneWidth = Math.min(colW * .70, scale * 15), ys = [];
    var leastExposure = valid.length ? Math.min.apply(null, valid) : 10;
    var commonGlassTop = m.align === 'float'
      ? Math.min(fixedTop + 3 * scale, fixedTop + leastExposure * scale - 1.5 * scale)
      : topMargin + 3 * scale;
    if (m.align !== 'float') line(c, colW * .18, commonWater, w - colW * .18, commonWater, 'rgba(40,153,181,.36)', 1.5, [7, 6]);
    for (var i = 0; i < 3; i++) {
      var id = IDS[i], x = colW * (i + .5), value = values[i];
      var floatTop = m.align === 'float' ? fixedTop : commonWater - (value == null ? 10 : value) * scale;
      var waterY = m.align === 'float' ? fixedTop + (value == null ? 10 : value) * scale : commonWater;
      var glassTop = commonGlassTop;
      var bottom = m.align === 'float' ? fixedTop + 27 * scale : commonWater + below * scale;
      if (value != null) {
        this.beakerBack(x, glassTop, sceneWidth, bottom, waterY, true);
        this.straw(x, floatTop, scale, { numbers: false });
        this.beakerFront(x, glassTop, sceneWidth, bottom, waterY);
        line(c, x - sceneWidth * .36, waterY, x + sceneWidth * .36, waterY, COLORS[id], 3.2);
        // Bracket measures the exposed part, never the water mark's absolute screen height.
        var bx = x + sceneWidth * .32;
        line(c, bx, floatTop, bx, waterY, COLORS[id], 1.8);
        line(c, bx - 5, floatTop, bx + 5, floatTop, COLORS[id], 1.8);
        line(c, bx - 5, waterY, bx + 5, waterY, COLORS[id], 1.8);
        label(c, '0', bx + 9, waterY, clamp(colW * .065, 13, 17), COLORS[id], 'left', 500);
        // Endpoint markers connect the numerical annotation to the exposed span.
        ellipse(c, bx, floatTop, 3.3); c.fillStyle = COLORS[id]; c.fill();
      } else {
        this.straw(x, floatTop, scale, { faint: true });
        c.save(); c.strokeStyle = '#bfced8'; c.lineWidth = 1.5; c.setLineDash([5, 5]);
        rr(c, x - sceneWidth / 2, topMargin + scale * 3, sceneWidth, 24 * scale, 18); c.stroke(); c.restore();
        label(c, '？', x, topMargin + scale * 13, clamp(colW * .12, 28, 44), '#9aafbc', 'center', 400);
      }
      ys.push(waterY);
      var labelY = h - Math.max(27, bottomMargin * .40);
      label(c, NAMES[id], x, labelY, clamp(colW * .105, 18, 29), COLORS.ink, 'center', 700);
      var annotationY = topMargin - 32, annotationW = Math.min(150, colW * .78), annotationH = clamp(h * .075, 34, 44);
      c.save(); c.fillStyle = '#ffffffeb'; c.strokeStyle = value == null ? '#d7e2e9' : COLORS[id]; c.lineWidth = 1.4;
      rr(c, x - annotationW / 2, annotationY - annotationH / 2, annotationW, annotationH, 12); c.fill(); c.stroke(); c.restore();
      label(c, value == null ? '未记录' : value.toFixed(1) + ' cm', x, annotationY, clamp(colW * .11, 19, 30), value == null ? '#9babb7' : COLORS[id], 'center', 700);
      if (value != null) line(c, x, annotationY + annotationH / 2 + 3, x, floatTop - 6, 'rgba(77,125,145,.25)', 1.1, [3, 4]);
    }
    if (m.align === 'float' && valid.length) {
      line(c, colW * .18, fixedTop, w - colW * .18, fixedTop, 'rgba(107,131,148,.28)', 1.2, [6, 6]);
    }
  };
  var REGIONS = {
    yangtze: { sky: '#d7eef7', horizon: '#b8dce6', water: '#639ca8', deep: '#a3d5d4', land: '#8ba9ac' },
    ocean: { sky: '#c6e5fa', horizon: '#d6eff9', water: '#2e8eb5', deep: '#70bed3', land: '#95bfcd' },
    yellow: { sky: '#e9e6d3', horizon: '#e3d8b9', water: '#ad9569', deep: '#cfbb89', land: '#b1a17d' }
  };
  FloatRenderer.prototype.drawEnvironment = function (region, time, pan) {
    var c = this.ctx, w = this.width, h = this.height, colors = REGIONS[region] || REGIONS.yangtze;
    if (region === 'yangtze' && this.images.harborSrc && this.images.harborSrc.width) {
      c.save(); c.translate(n(pan, 0), 0); this.coverImage(this.images.harborSrc, -w * .08, 0, w * 1.16, h); c.restore();
      c.fillStyle = 'rgba(171,213,211,.13)'; c.fillRect(0, h * .43, w, h * .57);
      return;
    }
    var sky = c.createLinearGradient(0, 0, 0, h * .48); sky.addColorStop(0, colors.sky); sky.addColorStop(1, colors.horizon);
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    var horizon = h * .44, source = this.images.harborSrc;
    // Reuse the existing sky and surface texture; crop away the harbor for the open sea.
    if (source && source.width) {
      var srcH = source.height * .25, srcW = Math.min(source.width, srcH * w / horizon);
      c.drawImage(source, (source.width - srcW) / 2, 0, srcW, srcH, 0, 0, w, horizon);
      if (region === 'yellow') { c.fillStyle = 'rgba(226,213,177,.27)'; c.fillRect(0, 0, w, horizon); }
    } else {
      c.save(); c.globalAlpha = .24; c.fillStyle = '#fff';
      for (var i = 0; i < 5; i++) {
        var x = ((i * .22 + .06) * w + n(pan, 0) * .2) % (w * 1.15), y = h * (.14 + (i % 3) * .055);
        ellipse(c, x, y, w * .07, h * .020); c.fill(); ellipse(c, x + w * .027, y + 2, w * .042, h * .027); c.fill();
      } c.restore();
    }
    if (region === 'yellow') {
      c.save(); c.fillStyle = colors.land; c.globalAlpha = .43; c.beginPath(); c.moveTo(0, horizon);
      for (var j = 0; j <= 16; j++) { var px = w * j / 16, py = horizon - h * (.025 + .085 * Math.pow(Math.sin(j * 1.73 + .8), 2)); c.lineTo(px + n(pan, 0) * .10, py); }
      c.lineTo(w, horizon + 5); c.closePath(); c.fill(); c.restore();
      c.fillStyle = '#c5b995'; c.fillRect(0, horizon - 3, w, 7);
    } else {
      line(c, 0, horizon, w, horizon, 'rgba(110,161,190,.42)', 1.2);
    }
    var sea = c.createLinearGradient(0, horizon, 0, h); sea.addColorStop(0, colors.water); sea.addColorStop(1, colors.deep);
    c.fillStyle = sea; c.fillRect(0, horizon, w, h - horizon);
    if (source && source.width) {
      c.save(); c.globalAlpha = region === 'yellow' ? .40 : .58; c.globalCompositeOperation = 'luminosity';
      c.drawImage(source, 0, source.height * .51, source.width, source.height * .49, 0, horizon, w, h - horizon); c.restore();
    }
    for (var k = 0; k < 17; k++) {
      var yy = horizon + (h - horizon) * Math.pow((k + 1) / 18, 1.55);
      c.save(); c.strokeStyle = k % 3 ? 'rgba(255,255,255,.16)' : 'rgba(32,92,114,.10)'; c.lineWidth = Math.min(2.3, .5 + k * .12); c.beginPath();
      for (var x2 = 0; x2 <= w + 15; x2 += 15) { var y2 = yy + Math.sin(x2 / (23 + k * 6) + n(time, 0) * .5 + k) * (1 + k * .16); if (!x2) c.moveTo(x2, y2); else c.lineTo(x2, y2); }
      c.stroke(); c.restore();
    }
  };
  FloatRenderer.prototype.waveOffset = function (wave, xNorm) {
    if (!wave) return 0;
    if (root.VoyageLogic && root.VoyageLogic.waveSample) return root.VoyageLogic.waveSample(wave, xNorm);
    var a = n(wave.amplitudeCm, n(wave.amplitudeM, 0)), phase = n(wave.phase, 0), cycles = n(wave.cyclesPerShip, 1.35);
    return a * (.82 * Math.sin(phase + Math.PI * 2 * cycles * xNorm) + .18 * Math.sin(2 * phase + Math.PI * 4 * cycles * xNorm + .4));
  };
  FloatRenderer.prototype.drawShip = function (m) {
    var c = this.ctx, w = this.width, h = this.height, im = this.images.shipSrc, b = m.boat || {};
    var region = REGIONS[m.region] ? m.region : 'yangtze', time = n(m.time, 0), p = clamp(n(m.transition, 1), 0, 1);
    var sailing = m.page === 'observe' && p < .999 && m.fromRegion && m.fromRegion !== region;
    var pan = sailing ? -w * .07 * p : 0;
    if (sailing) { this.drawEnvironment(m.fromRegion, time, pan); c.save(); c.globalAlpha = ease(p); this.drawEnvironment(region, time, w * .07 * (1 - p)); c.restore(); }
    else this.drawEnvironment(region, time, 0);
    var waterY = h * .61;
    if (!im || !im.width) { label(c, '正在准备场景', w * .5, h * .45, 22, '#577a91', 'center', 500); return; }
    var asset = this.options.shipAnchors || { keel: .895, deck: .625, hullDepth: .27, cargoLeft: .265, cargoRight: .80 };
    var imageW = w * .90, imageH = imageW * im.height / im.width;
    if (imageH > h * .60) { imageH = h * .60; imageW = imageH * im.width / im.height; }
    var hullDepth = n(b.hullDepthCm, n(b.hullDepthM, 4.4)), safeDraft = n(b.safeDraftCm, n(b.safeDraftM, 3.2));
    var scale = imageH * asset.hullDepth / hullDepth, draft = Math.max(0, n(m.draft, n(b.draftCm, n(b.draftM, 2.6))));
    var wave = m.wave || {}, heave = n(wave.heaveCm, n(wave.heaveM, 0)), pitch = n(wave.pitchRad, 0);
    var sink = clamp(n(m.sinkProgress, n(b.sinkProgress, 0)), 0, 1), cargo = clamp(Math.round(n(b.cargoUnits, n(m.cargoUnits, 36))), 0, 80);
    var centerX = w * .5 + (sailing ? Math.sin(p * Math.PI) * w * .025 : 0);
    var keelY = waterY + draft * scale - heave * scale + sink * imageH * 1.30;
    var imageX = centerX - imageW / 2, imageY = keelY - imageH * asset.keel;
    var rotation = -pitch - sink * .14;
    var status = b.status || m.status || 'safe', over = status === 'overloaded' || status === 'swamped' || status === 'flooding' || status === 'sinking' || status === 'sunk';
    var safeColor = over ? COLORS.red : COLORS.amber;
    var deckY = keelY - hullDepth * scale, safeY = keelY - safeDraft * scale;
    // Boat and its safety reference move as one body. The wave remains in world coordinates.
    c.save(); c.translate(centerX, keelY); c.rotate(rotation); c.translate(-centerX, -keelY);
    c.globalAlpha = 1 - Math.max(0, sink - .65) / .35;
    c.drawImage(im, imageX, imageY, imageW, imageH);
    var cargoDeckY = imageY + imageH * asset.deck, cargoLeft = imageX + imageW * asset.cargoLeft;
    var cargoSpan = imageW * (asset.cargoRight - asset.cargoLeft), cols = 12, cw = cargoSpan / cols, ch = cw * .51;
    var cargoColors = ['#547f90', '#438c94', '#c59748', '#657f9d', '#5c999f', '#b77e49'], centerOrder = [5, 6, 4, 7, 3, 8, 2, 9, 1, 10, 0, 11];
    for (var k = 0; k < cargo; k++) { var row = Math.floor(k / cols), col = centerOrder[k % cols]; this.container(cargoLeft + col * cw, cargoDeckY - (row + 1) * ch, cw - 1.4, ch - 1.4, cargoColors[(col + row * 3) % cargoColors.length]); }
    if (m.page === 'load' || m.showSafety) {
      var sx = imageX + imageW * .57, ex = imageX + imageW * .90;
      line(c, sx, safeY, ex, safeY, safeColor, 3, [9, 5]);
      c.fillStyle = '#ffffffed'; rr(c, ex - 80, safeY - 34, 88, 27, 7); c.fill();
      label(c, '安全线', ex - 36, safeY - 20, 17, safeColor, 'center', 700);
      // Rail height and the safety line are distinct even in calm inland water.
      line(c, imageX + imageW * .64, deckY, imageX + imageW * .90, deckY, 'rgba(246,249,253,.62)', 1.2);
    }
    c.restore();
    var self = this, colors = REGIONS[region];
    function surfaceAt(x) { return waterY - self.waveOffset(wave, (x - centerX) / imageW) * scale; }
    // A continuous crest/trough surface masks the submerged hull and animates with
    // exactly the same phase and spatial formula as the flooding model.
    c.save(); c.beginPath(); c.moveTo(0, surfaceAt(0));
    for (var x = 8; x <= w + 8; x += 8) c.lineTo(x, surfaceAt(x));
    c.lineTo(w, h); c.lineTo(0, h); c.closePath();
    var sea = c.createLinearGradient(0, waterY - n(wave.amplitudeCm, 0) * scale, 0, h);
    sea.addColorStop(0, region === 'yellow' ? 'rgba(173,149,105,.64)' : region === 'ocean' ? 'rgba(49,139,174,.48)' : 'rgba(95,166,178,.39)');
    sea.addColorStop(1, region === 'yellow' ? 'rgba(207,187,137,.96)' : region === 'ocean' ? 'rgba(112,190,211,.95)' : 'rgba(180,222,224,.90)');
    c.fillStyle = sea; c.fill(); c.restore();
    c.save(); c.beginPath();
    for (var xx = 0; xx <= w + 8; xx += 8) { var yy = surfaceAt(xx); if (!xx) c.moveTo(xx, yy); else c.lineTo(xx, yy); }
    c.strokeStyle = region === 'yellow' ? 'rgba(255,244,207,.85)' : 'rgba(235,255,255,.9)'; c.lineWidth = region === 'ocean' ? 2.8 : 1.6; c.stroke(); c.restore();
    for (var j = 0; j < 7; j++) {
      c.save(); c.globalAlpha = .18 - j * .014; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath();
      for (var px = 0; px <= w + 10; px += 10) { var py = waterY + 16 + j * (h - waterY) / 9 - this.waveOffset(wave, (px - centerX) / imageW + j * .21) * scale * .60 + Math.sin(px / 55 - time * 1.2 + j) * 1.5; if (!px) c.moveTo(px, py); else c.lineTo(px, py); }
      c.stroke(); c.restore();
    }
    if (sailing || (m.page === 'observe' && n(m.speed, 0) > 0)) {
      c.save(); c.globalAlpha = .42 * (1 - sink);
      for (var wk = 0; wk < 4; wk++) line(c, imageX - 18 - wk * 12, waterY + 5 + wk * 5, imageX + imageW * .12, waterY + 3 + wk * 5, '#fff', 1.3);
      c.restore();
    }
    var breachAt = m.breachAt || b.breachAt || (b.breach ? 'bow' : null);
    if (breachAt && sink < .8) {
      var sign = breachAt === 'stern' ? -1 : 1, breachX = centerX + sign * imageW * .43;
      var rimY = deckY - sign * Math.sin(pitch) * imageW * .43;
      c.save(); c.strokeStyle = 'rgba(219,249,255,.9)'; c.lineWidth = 3; c.lineCap = 'round';
      for (var q = 0; q < 6; q++) { var t = (time * 1.2 + q / 6) % 1; c.beginPath(); c.moveTo(breachX + sign * 12, surfaceAt(breachX)); c.quadraticCurveTo(breachX - sign * 9, rimY - 11, breachX - sign * (18 + t * 40), rimY + t * 21); c.stroke(); }
      c.restore();
    }
    if (sink > .3 && sink < 1) {
      c.save(); c.strokeStyle = 'rgba(235,255,255,.75)'; c.lineWidth = 1.7;
      for (var q2 = 0; q2 < 10; q2++) { var bt = (time * .45 + q2 * .13) % 1, bx = centerX + Math.sin(q2 * 2.4) * imageW * .27, by = waterY + 40 - bt * 95; ellipse(c, bx, by, 2 + (1 - bt) * 3.5); c.stroke(); } c.restore();
    }
    if (m.page === 'load' && sink < .35) {
      var gx = imageX + imageW * .965, physicalKeel = waterY + draft * scale;
      line(c, gx, waterY, gx, physicalKeel, '#153f58', 1.8);
      line(c, gx - 5, waterY, gx + 5, waterY, '#153f58', 1.8); line(c, gx - 5, physicalKeel, gx + 5, physicalKeel, '#153f58', 1.8);
      var textY = Math.min(h - 46, physicalKeel + 24);
      c.fillStyle = '#ffffffdf'; rr(c, gx - 126, textY - 20, 140, 38, 11); c.fill();
      label(c, draft.toFixed(2) + ' m', gx - 56, textY - 1, 23, '#17475f', 'center', 700);
    }
    var lensR = Math.min(w * .12, h * .13), lensTop = m.page === 'observe' ? 112 : 72;
    if (m.zoom && sink < .30) this.shipMagnifier({ x: w * .81, y: Math.max(h * .23, lensTop + lensR), r: lensR, sourceX: centerX + imageW * .35, sourceY: waterY, keelY: keelY, scale: scale, hullDepth: hullDepth, safeDraft: safeDraft, waveOffset: this.waveOffset(wave, .35), showSafety: m.page === 'load' || !!m.showSafety, status: status });
    this.geometry = { waterY: waterY, centerX: centerX, shipWidth: imageW, pxPerCm: scale, keelY: keelY, safeY: safeY, deckY: deckY, draftCm: draft };
  };
  /* A shape-simplification bridge, not a physical ship-compression experiment.
   * Z references are fixed in screen coordinates throughout this diagram.
   * Y is first represented as a side projection, then X narrows to a column.
   */
  FloatRenderer.prototype.drawBridge = function (m) {
    var c = this.ctx, w = this.width, h = this.height, p = clamp(n(m.progress, 0), 0, 1);
    var im = this.images.shipSrc, region = REGIONS[m.region] ? m.region : 'yangtze';
    var topSafe = Math.min(130, h * .26), bottomSafe = Math.min(120, h * .24), availableH = Math.max(70, h - topSafe - bottomSafe);
    var aspect = 1910 / 653, maxShipW = w * .80, maxHeight = Math.min(availableH * .82, maxShipW / aspect);
    var measureScale = Math.max(1.8, (h - Math.min(78, h * .15) - Math.min(64, h * .14)) / 52);
    var defaultHeight = Math.min(maxHeight, 24 * measureScale);
    var targetHeight = n(m.targetFloatHeight, defaultHeight);
    if (targetHeight < 55 || targetHeight > maxHeight + 1) targetHeight = defaultHeight;
    var objectH = Math.max(36, targetHeight), initialW = objectH * aspect;
    var targetTop = n(m.targetFloatTopY, Math.min(78, h * .15) + 16 * measureScale);
    if (targetTop < topSafe || targetTop + objectH > h - bottomSafe - 10) targetTop = topSafe + Math.max(0, (availableH - objectH) * .45);
    var zTop = targetTop, zBottom = zTop + objectH;
    var targetCenter = n(m.targetCenterX, w * (w > h ? .36 : .41));
    if (targetCenter < 68 || targetCenter > w - 68) targetCenter = w * .45;
    var fullDepth = Math.min(46, w * .045), startCenter = clamp(targetCenter * 1.22, initialW / 2 + 30, w - initialW / 2 - fullDepth - 18);
    var yFlatten = ease((p - .18) / .25), xNarrow = ease((p - .50) / .32), columnMix = ease((p - .78) / .16);
    var photoMix = im && im.width ? 1 - ease((p - .19) / .23) : 0;
    var labMix = ease((p - .12) / .48), cupMix = ease((p - .87) / .13);
    var centerX = startCenter + (targetCenter - startCenter) * ease((p - .50) / .42);
    var stemWidth = clamp(objectH / 24 * .95, 12, 23), finalWidth = stemWidth * 1.45;
    var currentW = initialW + (finalWidth - initialW) * xNarrow, xScale = currentW / initialW;
    var depthX = fullDepth * (1 - yFlatten), depthY = -depthX * .34;
    var regionDraft = 2.6;
    if (root.VoyageLogic) { try { regionDraft = root.VoyageLogic.state(region, n(m.cargoUnits, 36), { conditions: 'calm' }).draftCm; } catch (ignore) {} }
    var shipWaterY = zBottom - objectH * .328 * regionDraft / 4.4;
    var targetWaterY = n(m.targetWaterY, zTop + objectH * 10 / 24);
    if (targetWaterY < zTop + objectH * .08 || targetWaterY > zBottom - objectH * .08) targetWaterY = zTop + objectH * 10 / 24;
    var rulerX = Math.max(18, Math.min(startCenter - initialW / 2 - 22, targetCenter - 78, w * .075));
    var guideRight = Math.max(startCenter + initialW / 2 + depthX + 14, targetCenter + objectH * .46);
    guideRight = Math.min(w - 14, guideRight);
    this.drawEnvironment(region, m.reducedMotion ? 0 : n(m.time, 0), 0);
    c.save(); c.globalAlpha = labMix; this.labBackground(); c.restore();
    // The horizontal reference pair is never translated, stretched, or tilted.
    line(c, rulerX + 5, zTop, guideRight, zTop, 'rgba(45,126,151,.37)', 1.4, [7, 6]);
    line(c, rulerX + 5, zBottom, guideRight, zBottom, 'rgba(45,126,151,.37)', 1.4, [7, 6]);
    function path(points, dx, dy) {
      c.beginPath(); points.forEach(function (pt, i) { var x = centerX + pt[0] * initialW * xScale + (dx || 0), y = zTop + pt[1] * objectH + (dy || 0); if (!i) c.moveTo(x, y); else c.lineTo(x, y); }); c.closePath();
    }
    var hull = [[-.49,.70],[-.475,.89],[-.44,.985],[-.40,1],[.40,1],[.465,.85],[.50,.665],[.40,.69],[.31,.72],[-.19,.72],[-.22,.69]];
    var house = [[-.405,.69],[-.405,.38],[-.36,.34],[-.23,.365],[-.21,.42],[-.21,.69]];
    // Rear hull and connecting edges give a visible Y dimension without changing
    // the front mast/keel Z bounds. Their depth disappears before X narrows.
    if (depthX > .2) {
      c.save(); c.globalAlpha = (1 - columnMix) * .78;
      path(hull, depthX, depthY); c.fillStyle = '#6aa4b0'; c.fill(); c.strokeStyle = '#4b899a'; c.lineWidth = 1.5; c.stroke();
      path(house, depthX * .65, depthY * .65); c.fillStyle = '#c5e0e6'; c.fill(); c.stroke();
      for (var di = 0; di < hull.length; di += 2) {
        var pt = hull[di]; line(c, centerX + pt[0] * initialW, zTop + pt[1] * objectH, centerX + pt[0] * initialW + depthX, zTop + pt[1] * objectH + depthY, '#76a9b5', 1.2);
      } c.restore();
    }
    c.save(); c.globalAlpha = (1 - columnMix) * (1 - photoMix * .55);
    path(hull); c.fillStyle = '#d9edf1'; c.fill(); c.strokeStyle = '#20647d'; c.lineWidth = 2.1; c.stroke();
    path(house); c.fillStyle = '#f4fbfe'; c.fill(); c.strokeStyle = '#397b91'; c.lineWidth = 1.7; c.stroke();
    var mastX = centerX - .33 * currentW, houseTop = zTop + .36 * objectH;
    line(c, mastX, zTop, mastX, houseTop, '#2a7188', 2);
    line(c, mastX - .027 * currentW, zTop + .12 * objectH, mastX + .035 * currentW, zTop + .12 * objectH, '#2a7188', 1.5);
    line(c, mastX - .02 * currentW, zTop + .23 * objectH, mastX + .025 * currentW, zTop + .23 * objectH, '#2a7188', 1.5);
    var bowMastX = centerX + .425 * currentW;
    line(c, bowMastX, zTop + .34 * objectH, bowMastX, zTop + .70 * objectH, '#397b91', 1.6);
    line(c, bowMastX - .014 * currentW, zTop + .40 * objectH, bowMastX + .015 * currentW, zTop + .40 * objectH, '#397b91', 1.2);
    if (currentW > 120) {
      for (var wy = 0; wy < 3; wy++) for (var wx = 0; wx < 4; wx++) {
        var winX = centerX + (-.385 + wx * .036) * currentW, winY = zTop + (.41 + wy * .075) * objectH;
        c.fillStyle = '#6fa4b5'; c.fillRect(winX, winY, currentW * .016, objectH * .025);
      }
    }
    c.restore();
    if (photoMix > .001 && im && im.width) {
      c.save(); c.globalAlpha = photoMix; c.drawImage(im, 19, 67, 1910, 653, centerX - initialW / 2, zTop, initialW, objectH); c.restore();
    }
    // Cargo follows the same X compression while its vertical sizes stay fixed.
    var cargo = clamp(Math.round(n(m.cargoUnits, 36)), 0, 80), cols = 12, cargoSpan = initialW * .544, cw = cargoSpan / cols, ch = cw * .51;
    var cargoLeft = centerX - initialW * .240, deckY = zTop + objectH * .672;
    var order = [5, 6, 4, 7, 3, 8, 2, 9, 1, 10, 0, 11], hues = ['#547f90','#438c94','#c59748','#657f9d','#5c999f','#b77e49'];
    c.save(); c.globalAlpha = 1 - columnMix; c.translate(centerX, 0); c.scale(xScale, 1); c.translate(-centerX, 0);
    for (var ci = 0; ci < cargo; ci++) {
      var row = Math.floor(ci / cols), col = order[ci % cols], cx = cargoLeft + col * cw, cy = deckY - (row + 1) * ch;
      if (photoMix > .08) this.container(cx, cy, cw - 1.3, ch - 1.3, hues[(col + row * 3) % hues.length]);
      else { c.fillStyle = '#dceef2'; c.strokeStyle = '#4e8ba0'; c.lineWidth = 1.15; c.fillRect(cx, cy, cw - 1, ch - 1); c.strokeRect(cx, cy, cw - 1, ch - 1); }
    } c.restore();
    // The initial water context fades as the scene becomes an abstract projection.
    if (labMix < .999) {
      c.save(); c.globalAlpha = (1 - labMix) * .43; c.fillStyle = region === 'yellow' ? '#c1a36a' : '#82c7d2'; c.fillRect(0, shipWaterY, w, h - shipWaterY); c.restore();
      line(c, 0, shipWaterY, w, shipWaterY, 'rgba(232,253,255,' + ((1 - labMix) * .72).toFixed(3) + ')', 1.7);
    }
    var cupWidth = Math.min(objectH * .96, w * .36), cupTop = Math.max(topSafe, zTop - objectH * .12), cupBottom = Math.min(h - bottomSafe + 2, zBottom + objectH * .18);
    if (cupMix > .001) { c.save(); c.globalAlpha = cupMix; this.beakerBack(targetCenter, cupTop, cupWidth, cupBottom, targetWaterY, true); c.restore(); }
    if (columnMix > .001) {
      c.save(); c.globalAlpha = columnMix; this.straw(centerX, zTop, objectH / 24, {}); c.restore();
    }
    if (cupMix > .001) { c.save(); c.globalAlpha = cupMix; this.beakerFront(targetCenter, cupTop, cupWidth, cupBottom, targetWaterY); c.restore(); }
    function arrow(x1, y1, x2, y2, color, doubleHead, alpha) {
      c.save(); c.globalAlpha = alpha == null ? 1 : alpha; line(c, x1, y1, x2, y2, color, 1.7);
      var angle = Math.atan2(y2-y1,x2-x1), head = 6;
      function tip(x,y,a) { c.beginPath(); c.moveTo(x,y); c.lineTo(x-head*Math.cos(a-.48),y-head*Math.sin(a-.48)); c.lineTo(x-head*Math.cos(a+.48),y-head*Math.sin(a+.48)); c.closePath(); c.fillStyle=color; c.fill(); }
      tip(x2,y2,angle);if(doubleHead)tip(x1,y1,angle+Math.PI);c.restore();
    }
    // Z remains a full, fixed-height reference through every key frame.
    arrow(rulerX,zBottom,rulerX,zTop,'#257a91',true,1);
    label(c,'Z',rulerX,zTop-15,clamp(w*.024,16,23),'#176b82','center',700);
    var verticalText='竖直高度', charSize=clamp(w*.018,12,17), textTop=zTop+objectH/2-charSize*1.7;
    for (var zi=0;zi<verticalText.length;zi++) label(c,verticalText[zi],rulerX-12,textTop+zi*charSize*1.2,charSize,'#386e82','center',500);
    var axisY = Math.min(h-bottomSafe+43,zBottom+42), halfAxis=Math.max(15,currentW*.49);
    arrow(centerX-halfAxis,axisY,centerX+halfAxis,axisY,'#56839a',true,.90);
    label(c,'X',centerX,axisY+18,clamp(w*.024,16,22),'#477c94','center',700);
    var shownDepth = Math.max(depthX, columnMix * 12), axisOriginX = Math.min(w-35,centerX+halfAxis);
    var yAlpha = .22 + .78 * Math.max(1-yFlatten,columnMix*.65);
    if (shownDepth > 1) arrow(axisOriginX,axisY,Math.min(w-12,axisOriginX+shownDepth),axisY-Math.max(9,shownDepth*.48),'#8a7b50',true,yAlpha);
    label(c,'Y',Math.min(w-13,axisOriginX+Math.max(14,shownDepth*.52)),axisY-Math.max(19,shownDepth*.5)-7,clamp(w*.022,15,21),'#9c8c62','center',600);
    if (p < .78) {
      var badge = p < .25 ? '3D' : '2D', badgeY = Math.max(topSafe-8,zTop-35);
      c.save(); c.fillStyle='#ffffffdf'; rr(c,centerX-28,badgeY-17,56,34,11); c.fill(); c.restore();
      label(c,badge,centerX,badgeY,21,'#346e86','center',700);
    }
    // Brackets communicate inward X motion without adding instruction paragraphs.
    if (p > .52 && p < .83 && currentW < initialW*.86) {
      var midY=zTop+objectH*.53, offset=Math.min(56,initialW*.08), gap=currentW/2+18;
      arrow(centerX-gap-offset,midY,centerX-gap,midY,'#6eaaa9',false,.75);
      arrow(centerX+gap+offset,midY,centerX+gap,midY,'#6eaaa9',false,.75);
    }
    this.geometry = { bridgeProgress:p, bridgeStage:p<.25?'3d':p<.50?'side':p<.80?'narrow':'column',
      referenceTopY:zTop,referenceBottomY:zBottom,referenceHeight:objectH,
      bridgeWidth:currentW,bridgeDepth:depthX,centerX:centerX,floatTopY:zTop,
      targetCenterX:targetCenter,targetWaterY:targetWaterY,cylinderAlpha:columnMix,
      referenceRect:{x:rulerX,y:zTop,width:guideRight-rulerX,height:objectH} };
  };
  FloatRenderer.prototype.container = function (x, y, w, h, color) {
    var c = this.ctx, t = Math.min(3, w * .12);
    c.save(); c.fillStyle = color; c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(255,255,255,.20)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + t, y - t); c.lineTo(x + w + t, y - t); c.lineTo(x + w, y); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,28,50,.22)'; c.beginPath(); c.moveTo(x + w, y); c.lineTo(x + w + t, y - t); c.lineTo(x + w + t, y + h - t); c.lineTo(x + w, y + h); c.closePath(); c.fill();
    for (var i = 4; i < w - 2; i += 4) { line(c, x + i, y + 2, x + i, y + h - 2, 'rgba(8,39,55,.2)', 1); line(c, x + i + .8, y + 2, x + i + .8, y + h - 2, 'rgba(255,255,255,.12)', .7); }
    line(c, x + 1, y + 1, x + w - 1, y + 1, 'rgba(238,247,248,.3)', 1); c.restore();
  };
  FloatRenderer.prototype.shipMagnifier = function (g) {
    var c = this.ctx, r = g.r, z = 2.8;
    c.save(); line(c, g.sourceX, g.sourceY, g.x - r * .5, g.y + r * .8, 'rgba(25,119,139,.65)', 1.5);
    ellipse(c, g.x, g.y, r, r); c.fillStyle = '#eaf7fb'; c.fill(); c.save(); c.clip();
    // The lens stays on the world waterline; every hull feature moves with the keel.
    var scale = g.scale * z, keelY = g.y + (g.keelY - g.sourceY) * z;
    var hullDepth = n(g.hullDepth, 4.4), safeDraft = n(g.safeDraft, 3.2);
    var hullTopY = keelY - hullDepth * scale, sy = keelY - safeDraft * scale;
    var hull = c.createLinearGradient(0, hullTopY, 0, keelY); hull.addColorStop(0, '#123951'); hull.addColorStop(.6, '#264d5e'); hull.addColorStop(.61, '#91504a'); hull.addColorStop(1, '#6b4041');
    c.fillStyle = hull; c.fillRect(g.x - r, hullTopY, 2 * r, hullDepth * scale);
    // Quarter-centimetre marks share the main scene's physical scale and keel origin.
    for (var i = 0; i <= 17; i++) {
      var ty = keelY - i * .25 * scale;
      if (ty < g.y - r || ty > g.y + r) continue;
      line(c, g.x + 10, ty, g.x + (i % 4 === 0 ? 34 : i % 2 === 0 ? 27 : 21), ty, 'rgba(250,253,255,.92)', 2.4);
    }
    var lensWaterY = g.y - n(g.waveOffset, 0) * scale;
    c.fillStyle = 'rgba(141,214,223,.55)'; c.fillRect(g.x - r, lensWaterY, 2 * r, g.y + r - lensWaterY);
    line(c, g.x - r, lensWaterY, g.x + r, lensWaterY, '#ecffff', 3);
    if (g.showSafety) line(c, g.x - r, sy, g.x + r, sy, g.status !== 'safe' ? COLORS.red : COLORS.amber, 3.8, [11, 6]);
    c.restore(); ellipse(c, g.x, g.y, r, r); c.strokeStyle = '#197e90'; c.lineWidth = 2.5; c.stroke(); c.restore();
  };
  root.FloatRenderer = FloatRenderer;
  if (typeof module === 'object' && module.exports) module.exports = FloatRenderer;
}(typeof window !== 'undefined' ? window : this));
