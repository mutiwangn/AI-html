/* 船的最大装载量 · deterministic Canvas 2D scientific scenes · v1.0
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
    if (this.model.page === 'measure') this.drawMeasure(this.model);
    else if (this.model.page === 'compare') this.drawCompare(this.model);
    else this.drawShip(this.model);
  };
  FloatRenderer.prototype.getGeometry = function () {
    if (!this.geometry) return null;
    return { floatTopY: this.geometry.floatTopY, pxPerCm: this.geometry.pxPerCm, waterY: this.geometry.waterY, centerX: this.geometry.centerX,
      markRect: Object.assign({}, this.geometry.markRect), markerY: this.geometry.markerY, totalLengthCm: 24 };
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
    var sw = clamp(scale * .82, 8, 23), stemH = scale * 22, ballastH = scale * 2, ballastW = sw * 2.6;
    c.save(); if (options.faint) c.globalAlpha = .20;
    var shade = c.createLinearGradient(x - sw / 2, 0, x + sw / 2, 0);
    shade.addColorStop(0, '#b8c9d3'); shade.addColorStop(.24, '#f4f8fa'); shade.addColorStop(.49, '#fff'); shade.addColorStop(.8, '#e6eef2'); shade.addColorStop(1, '#adbfca');
    c.fillStyle = shade; rr(c, x - sw / 2, top, sw, stemH + ballastH * .2, sw * .15); c.fill();
    line(c, x - sw / 2 + 1, top + 3, x - sw / 2 + 1, top + stemH, 'rgba(255,255,255,.9)', 1);
    ellipse(c, x, top + 1, sw / 2, Math.max(2, sw * .12)); c.fillStyle = '#e4edf2'; c.fill();
    ellipse(c, x, top + 1, sw * .30, Math.max(1, sw * .075)); c.fillStyle = '#aebec7'; c.fill();
    for (var k = 1; k < 22; k++) {
      var ty = top + k * scale, major = k % 5 === 0;
      line(c, x - sw * .33, ty, x + sw * (major ? .32 : .06), ty, 'rgba(29,53,73,.75)', major ? 1.5 : 1);
      if (major && options.numbers) label(c, String(k), x + sw * .9 + 7, ty, clamp(scale * .72, 11, 14), '#6b8293', 'left', 500);
    }
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
  FloatRenderer.prototype.drawMeasure = function (m) {
    var c = this.ctx, w = this.width, h = this.height;
    this.labBackground();
    var exposure = clamp(n(m.floatExposure, 10), 0, 24);
    var marginTop = Math.min(80, h * .13), marginBottom = Math.min(94, h * .16);
    var above = Math.max(14, exposure + 1), below = Math.max(16, 24 - exposure + 3.5);
    var scale = Math.max(2, (h - marginTop - marginBottom - 18) / (above + below));
    var waterY = marginTop + above * scale, top = waterY - exposure * scale;
    var center = w * (w > 480 ? .43 : .44), glassWidth = Math.min(w * .43, scale * 22);
    var glassTop = Math.max(marginTop + 2, Math.min(top + scale * 3, waterY - scale * 3.5));
    var glassBottom = waterY + below * scale;
    this.beakerBack(center, glassTop, glassWidth, glassBottom, waterY, false);
    this.straw(center, top, scale, { numbers: true });
    this.beakerFront(center, glassTop, glassWidth, glassBottom, waterY);
    var chosen = m.markerExposure == null ? null : clamp(n(m.markerExposure, exposure), 0, 24);
    var markY = top + (chosen == null ? exposure : chosen) * scale;
    var markerColor = COLORS[m.liquid] || COLORS.teal;
    // Wide hit target is supplied through getGeometry; visible handle remains precise.
    line(c, center - scale * .8, markY, center + Math.max(30, scale * 2.2), markY, markerColor, 3.5, chosen == null ? [5, 4] : null);
    c.save(); c.fillStyle = '#fff'; c.strokeStyle = markerColor; c.lineWidth = 3;
    ellipse(c, center + Math.max(30, scale * 2.2), markY, 9, 9); c.fill(); c.stroke(); c.restore();
    var magR = clamp(Math.min(w * .145, h * .17), 43, 106), magX = w - magR - Math.max(18, w * .04), magY = marginTop + magR + 4;
    if (w >= 450 && h >= 340) this.magnifier({ x: magX, y: magY, r: magR, sourceX: center, sourceY: waterY, scale: scale,
      floatTopY: top, markerY: markY, color: markerColor, hasMarker: chosen != null });
    this.geometry = { floatTopY: top, pxPerCm: scale, waterY: waterY, centerX: center, markerY: markY,
      markRect: { x: center - 38, y: top - 12, width: 96, height: 24 * scale + 24 } };
  };
  FloatRenderer.prototype.magnifier = function (g) {
    var c = this.ctx, z = 3.1;
    c.save();
    line(c, g.sourceX + 10, g.sourceY, g.x - g.r * .64, g.y + g.r * .7, 'rgba(24,120,135,.55)', 1.5);
    c.shadowColor = 'rgba(37,71,91,.12)'; c.shadowBlur = 12; c.shadowOffsetY = 5;
    ellipse(c, g.x, g.y, g.r, g.r); c.fillStyle = '#f6fbfd'; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.save(); ellipse(c, g.x, g.y, g.r - 2, g.r - 2); c.clip();
    var water = c.createLinearGradient(0, g.y, 0, g.y + g.r); water.addColorStop(0, '#d2eef5'); water.addColorStop(1, '#8bcbdc');
    c.fillStyle = water; c.fillRect(g.x - g.r, g.y, g.r * 2, g.r);
    var sw = clamp(g.scale * .82, 8, 23) * z;
    var shade = c.createLinearGradient(g.x - sw / 2, 0, g.x + sw / 2, 0); shade.addColorStop(0, '#b7cbd4'); shade.addColorStop(.35, '#fff'); shade.addColorStop(.7, '#f8fbfd'); shade.addColorStop(1, '#bdcfd8');
    c.fillStyle = shade; c.fillRect(g.x - sw / 2, g.y - g.r, sw, g.r * 2);
    for (var k = 0; k <= 22; k++) {
      var py = g.y + (g.floatTopY + k * g.scale - g.sourceY) * z;
      if (py > g.y - g.r && py < g.y + g.r) line(c, g.x - sw * .33, py, g.x + sw * (k % 5 ? .08 : .33), py, '#344e63', k % 5 ? 1.8 : 2.7);
    }
    line(c, g.x - g.r, g.y, g.x + g.r, g.y, 'rgba(32,146,174,.65)', 2.5);
    line(c, g.x - g.r, g.y + 3, g.x + g.r, g.y + 3, 'rgba(255,255,255,.85)', 2);
    var my = g.y + (g.markerY - g.sourceY) * z;
    line(c, g.x - sw * .75, my, g.x + sw * .75, my, g.color, 5, g.hasMarker ? null : [7, 6]);
    c.restore(); ellipse(c, g.x, g.y, g.r); c.strokeStyle = '#1a7e8b'; c.lineWidth = 2.7; c.stroke();
    ellipse(c, g.x, g.y, g.r - 4); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.stroke();
    c.restore();
  };
  FloatRenderer.prototype.drawCompare = function (m) {
    var c = this.ctx, w = this.width, h = this.height; this.labBackground();
    var readings = m.readings || {}, values = IDS.map(function (id) { var v = readings[id]; return typeof v === 'number' && isFinite(v) ? clamp(v, 0, 24) : null; });
    var valid = values.filter(function (v) { return v != null; });
    var topMargin = Math.min(94, h * .17), bottomMargin = Math.min(106, h * .2);
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
      } else {
        this.straw(x, floatTop, scale, { faint: true });
        c.save(); c.strokeStyle = '#bfced8'; c.lineWidth = 1.5; c.setLineDash([5, 5]);
        rr(c, x - sceneWidth / 2, topMargin + scale * 3, sceneWidth, 24 * scale, 18); c.stroke(); c.restore();
        label(c, '？', x, topMargin + scale * 13, clamp(colW * .12, 28, 44), '#9aafbc', 'center', 400);
      }
      ys.push(waterY);
      var labelY = h - bottomMargin + Math.min(37, bottomMargin * .4);
      label(c, NAMES[id], x, labelY, clamp(colW * .095, 19, 27), COLORS.ink, 'center', 650);
      label(c, value == null ? '未记录' : value.toFixed(1) + ' cm', x, labelY + 34, clamp(colW * .075, 17, 24), value == null ? '#9babb7' : COLORS[id], 'center', 650);
    }
    if (m.align === 'float' && valid.length) {
      line(c, colW * .18, fixedTop, w - colW * .18, fixedTop, 'rgba(107,131,148,.28)', 1.2, [6, 6]);
    }
  };
  FloatRenderer.prototype.drawShip = function (m) {
    var c = this.ctx, w = this.width, h = this.height, im = this.images.shipSrc, background = this.images.harborSrc;
    if (!this.coverImage(background, 0, 0, w, h)) {
      var sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#d7edf7'); sky.addColorStop(.5, '#edf7fa'); sky.addColorStop(.501, '#a7dae4'); sky.addColorStop(1, '#d7f1f3');
      c.fillStyle = sky; c.fillRect(0, 0, w, h);
    }
    var waterY = h * .62;
    if (!im || !im.width) { label(c, '正在准备场景', w * .5, h * .45, 22, '#577a91', 'center', 500); return; }
    var asset = this.options.shipAnchors || { keel: .895, deck: .625, hullDepth: .27, cargoLeft: .265, cargoRight: .80 };
    var imageW = w * .91, imageH = imageW * im.height / im.width;
    if (imageH > h * .62) { imageH = h * .62; imageW = imageH * im.width / im.height; }
    var depthPx = imageH * asset.hullDepth, scale = depthPx / 4.4, draft = clamp(n(m.draft, 2.3), .3, 5.2);
    var keelY = waterY + draft * scale, imageX = (w - imageW) / 2, imageY = keelY - imageH * asset.keel;
    var cargo = clamp(Math.round(n(m.cargoUnits, 30)), 0, 72);
    var deckY = imageY + imageH * asset.deck, cargoLeft = imageX + imageW * asset.cargoLeft;
    var cargoSpan = imageW * (asset.cargoRight - asset.cargoLeft), cols = 12, cw = cargoSpan / cols, ch = cw * .51;
    var cargoColors = ['#547f90', '#438c94', '#c59748', '#657f9d', '#5c999f', '#b77e49'];
    c.save(); c.beginPath(); c.rect(0, waterY, w, h - waterY); c.clip();
    c.globalAlpha = .12; c.translate(0, waterY * 1.7 + 3); c.scale(1, -.7);
    c.drawImage(im, imageX, imageY, imageW, imageH); c.restore();
    c.drawImage(im, imageX, imageY, imageW, imageH);
    var centerOrder = [5, 6, 4, 7, 3, 8, 2, 9, 1, 10, 0, 11];
    for (var k = 0; k < cargo; k++) {
      var row = Math.floor(k / cols), col = centerOrder[k % cols], x = cargoLeft + col * cw, y = deckY - (row + 1) * ch;
      this.container(x, y, cw - 1.4, ch - 1.4, cargoColors[(col + row * 3) % cargoColors.length]);
    }
    // A fixed world water surface covers the submerged hull while the ship moves.
    var sea = c.createLinearGradient(0, waterY, 0, h);
    sea.addColorStop(0, 'rgba(90,182,198,.23)'); sea.addColorStop(.35, 'rgba(111,201,214,.35)'); sea.addColorStop(1, 'rgba(201,236,239,.7)');
    c.fillStyle = sea; c.fillRect(0, waterY, w, h - waterY);
    line(c, 0, waterY, w, waterY, 'rgba(230,254,255,.82)', 2);
    for (var j = 0; j < 10; j++) {
      var waveY = waterY + 10 + j * (h - waterY) / 13;
      c.save(); c.globalAlpha = .16 - j * .009; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath();
      for (var px = 0; px <= w; px += 10) { var py = waveY + Math.sin(px / (30 + j * 4) + j * 1.8) * (1.2 + j * .1); if (!px) c.moveTo(px, py); else c.lineTo(px, py); } c.stroke(); c.restore();
    }
    if (m.showSafety || m.page === 'load') {
      var safeY = keelY - 3.2 * scale, color = m.status === 'overloaded' || m.status === 'swamped' ? COLORS.red : COLORS.amber;
      var sx = imageX + imageW * .64, ex = imageX + imageW * .91;
      line(c, sx, safeY, ex, safeY, color, 3.5, [9, 5]);
      c.save(); c.fillStyle = 'rgba(255,255,255,.92)'; rr(c, ex - 64, safeY - 36, 78, 29, 8); c.fill(); c.restore();
      label(c, '安全线', ex - 25, safeY - 21, 17, color, 'center', 700);
    }
    if (m.zoom) this.shipMagnifier({ x: w * .81, y: h * .23, r: Math.min(w * .13, h * .15), sourceX: imageX + imageW * .80, sourceY: waterY, keelY: keelY, scale: scale, showSafety: !!m.showSafety || m.page === 'load', status: m.status });
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
    var hullTopY = keelY - 4.4 * scale, sy = keelY - 3.2 * scale;
    var hull = c.createLinearGradient(0, hullTopY, 0, keelY); hull.addColorStop(0, '#123951'); hull.addColorStop(.6, '#264d5e'); hull.addColorStop(.61, '#91504a'); hull.addColorStop(1, '#6b4041');
    c.fillStyle = hull; c.fillRect(g.x - r, hullTopY, 2 * r, 4.4 * scale);
    // Quarter-centimetre marks share the main scene's physical scale and keel origin.
    for (var i = 0; i <= 17; i++) {
      var ty = keelY - i * .25 * scale;
      if (ty < g.y - r || ty > g.y + r) continue;
      line(c, g.x + 10, ty, g.x + (i % 4 === 0 ? 34 : i % 2 === 0 ? 27 : 21), ty, 'rgba(250,253,255,.92)', 2.4);
    }
    c.fillStyle = 'rgba(141,214,223,.55)'; c.fillRect(g.x - r, g.y, 2 * r, r);
    line(c, g.x - r, g.y, g.x + r, g.y, '#ecffff', 3);
    if (g.showSafety) line(c, g.x - r, sy, g.x + r, sy, g.status === 'overloaded' || g.status === 'swamped' ? COLORS.red : COLORS.amber, 3.8, [11, 6]);
    c.restore(); ellipse(c, g.x, g.y, r, r); c.strokeStyle = '#197e90'; c.lineWidth = 2.5; c.stroke(); c.restore();
  };
  root.FloatRenderer = FloatRenderer;
  if (typeof module === 'object' && module.exports) module.exports = FloatRenderer;
}(typeof window !== 'undefined' ? window : this));
