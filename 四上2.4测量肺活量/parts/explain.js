(function () {
  'use strict';
  var root = document.getElementById('page-explain');
  if (!root) { return; }
  function el(id) { return document.getElementById(id); }
  var ns = 'http://www.w3.org/2000/svg';
  var volume = el('le-volume');
  var volumeOutput = el('le-volume-output');
  var start = el('le-start');
  var reset = el('le-reset');
  var explain = el('le-explain');
  var status = el('le-stage-status');
  var hint = el('le-control-hint');
  var equation = el('le-equation');
  var prompt = el('le-observe-prompt');
  var state = { target: 2250, value: 0, running: false, complete: false, explanation: 0, started: 0, request: 0 };
  var raf = window.requestAnimationFrame || function (fn) { return window.setTimeout(function () { fn(Date.now()); }, 16); };
  var caf = window.cancelAnimationFrame || window.clearTimeout;
  var duration = 5600;
  var lastFocus = null;

  /* Calibrated axisymmetric bottle: straight body, tapered shoulder, short neck.
     Up to 4500 mL, the air/water interface remains in the straight body.
     The 5000 mL mark includes the narrower shoulder and neck volume. */
  var shapeIntegral = 5495700;
  function levelFor(ml) {
    var s = Math.max(0, Math.min(5000, ml)) / 5000 * shapeIntegral;
    if (s <= 5000000) { return 90 + s / 15625; }
    if (s <= 5444500) {
      var lo = 0, hi = 60, k = 85 / 60, i, mid, a;
      for (i = 0; i < 22; i += 1) {
        mid = (lo + hi) / 2;
        a = 15625 * mid - 125 * k * mid * mid + k * k * mid * mid * mid / 3;
        if (5000000 + a < s) { lo = mid; } else { hi = mid; }
      }
      return 410 + (lo + hi) / 2;
    }
    return 470 + (s - 5444500) / 1600;
  }
  function svgNode(name, attrs, txt) {
    var n = document.createElementNS(ns, name), key;
    for (key in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, key)) { n.setAttribute(key, attrs[key]); } }
    if (typeof txt !== 'undefined') { n.textContent = txt; }
    return n;
  }
  var scale = el('le-scale'), m, y;
  scale.appendChild(svgNode('text', { x: 586, y: 66, 'font-size': 20 }, 'mL'));
  for (m = 0; m <= 5000; m += 250) {
    y = levelFor(m);
    scale.appendChild(svgNode('line', { x1: 538, y1: y, x2: m % 500 === 0 ? 563 : 552, y2: y, stroke: '#7897a4', 'stroke-width': m % 500 === 0 ? 2 : 1.3 }));
    if (m % 500 === 0) { scale.appendChild(svgNode('text', { x: 576, y: y + 7 }, String(m))); }
  }
  function paint(ml, motion) {
    var waterY = levelFor(ml), basinY = 490 - ml / 100;
    state.value = ml;
    el('le-inner-water').setAttribute('y', waterY);
    el('le-inner-water').setAttribute('height', 504 - waterY);
    el('le-water-surface').setAttribute('d', 'M280 ' + waterY + 'H530');
    el('le-basin-water').setAttribute('y', basinY);
    el('le-basin-water').setAttribute('height', 605 - basinY);
    el('le-basin-surface').setAttribute('d', 'M220 ' + basinY + 'H690');
    el('le-air-marks').setAttribute('opacity', ml > 650 ? 0.75 : 0);
    el('le-interface-label').setAttribute('opacity', ml > 450 ? 1 : 0);
    el('le-interface-guide').setAttribute('d', 'M278 ' + waterY + 'H227');
    el('le-air-label').setAttribute('y', Math.max(123, waterY - 20));
    el('le-water-label').setAttribute('y', waterY + 31);
    el('le-inlet-flow').setAttribute('opacity', motion ? 1 : 0);
    el('le-outlet-flow').setAttribute('opacity', motion ? 1 : 0);
    el('le-bubbles').setAttribute('opacity', motion ? 0.9 : 0);
    if (motion) {
      var tick = (Date.now() % 1800) / 1800, travel = Math.max(20, 464 - waterY), i;
      var bubbles = [el('le-bubble-a'), el('le-bubble-b'), el('le-bubble-c')];
      for (i = 0; i < bubbles.length; i += 1) { bubbles[i].setAttribute('cy', 465 - ((tick + i / 3) % 1) * travel); }
      el('le-inlet-flow').setAttribute('stroke-dashoffset', -(Date.now() % 1400) / 12);
      el('le-outlet-flow').setAttribute('stroke-dashoffset', -(Date.now() % 1100) / 10);
    }
  }
  function clearExplanation() {
    state.explanation = 0;
    equation.hidden = true;
    prompt.hidden = false;
    prompt.textContent = '观察：哪里增加了，哪里减少了？';
    explain.textContent = '说说你的解释';
    el('le-air-value').textContent = '？';
    el('le-water-value').textContent = '？';
    el('le-equal-sign').textContent = '？';
  }
  function halt() {
    if (state.request) { caf(state.request); state.request = 0; }
    state.running = false;
    volume.disabled = false;
    start.disabled = false;
    paint(state.value, false);
  }
  function resetDemo() {
    halt();
    state.complete = false;
    state.target = Number(volume.value) || 2250;
    volumeOutput.textContent = String(state.target);
    clearExplanation();
    paint(0, false);
    start.textContent = '开始排水';
    explain.disabled = true;
    status.textContent = '瓶里先装满水，再倒过来。';
    hint.textContent = '先看完一次，再一起解释。';
  }
  function finish() {
    halt();
    state.complete = true;
    paint(state.target, false);
    start.textContent = '再看一次';
    explain.disabled = false;
    status.textContent = '一口气结束了，等水面稳定再读数。';
    hint.textContent = '水被排出后，原来的空间被谁占据？';
  }
  function animate(stamp) {
    if (!state.running) { return; }
    if (!state.started) { state.started = stamp; }
    var t = Math.min(1, (stamp - state.started) / duration);
    /* Ease out illustrates decreasing flow from one finite breath, never extra breaths. */
    var f = 1 - Math.pow(1 - t, 1.55);
    paint(state.target * f, true);
    if (t >= 1) { finish(); return; }
    state.request = raf(animate);
  }
  function begin() {
    resetDemo();
    state.running = true;
    state.started = 0;
    volume.disabled = true;
    start.disabled = true;
    start.textContent = '正在排水…';
    status.textContent = '气体进入上部，水从短管排出。';
    hint.textContent = '关注瓶内水面与水槽水面的变化。';
    duration = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 900 : 5600;
    state.request = raf(animate);
  }
  function explainStep() {
    if (!state.complete) { return; }
    if (state.explanation === 0) {
      state.explanation = 1;
      equation.hidden = false;
      prompt.hidden = true;
      explain.textContent = '显示体积关系';
      status.textContent = '空气占据的空间，与排出的水有什么关系？';
      hint.textContent = '先用自己的话说一说，再揭示关系。';
    } else if (state.explanation === 1) {
      state.explanation = 2;
      el('le-air-value').textContent = String(state.target);
      el('le-water-value').textContent = String(state.target);
      el('le-equal-sign').textContent = '=';
      explain.textContent = '隐藏解释';
      status.textContent = '空气占据空间，可以用排出水的体积来估测。';
      hint.textContent = '这是忽略漏气、温差与压差的原理示意。';
    } else {
      clearExplanation();
      status.textContent = '一口气结束了，等水面稳定再读数。';
      hint.textContent = '水被排出后，原来的空间被谁占据？';
    }
  }
  start.addEventListener('click', begin);
  reset.addEventListener('click', resetDemo);
  volume.addEventListener('input', resetDemo);
  volume.addEventListener('change', resetDemo);
  explain.addEventListener('click', explainStep);

  var modal = el('le-plan-modal');
  var dialog = modal.querySelector('.le-modal-dialog');
  function openPlan() {
    halt();
    if (!state.complete && state.value > 0) { start.textContent = '重新演示'; status.textContent = '演示已暂停，可以重新开始。'; }
    lastFocus = document.activeElement;
    modal.hidden = false;
    el('le-plan-close').focus();
  }
  function closePlan() {
    modal.hidden = true;
    if (lastFocus && typeof lastFocus.focus === 'function') { lastFocus.focus(); }
  }
  el('le-plan-open').addEventListener('click', openPlan);
  el('le-plan-close').addEventListener('click', closePlan);
  modal.addEventListener('click', function (event) { if (event.target.getAttribute('data-le-close') === '1') { closePlan(); } });
  modal.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.keyCode === 27) { event.preventDefault(); closePlan(); return; }
    if (event.key === 'Tab' || event.keyCode === 9) {
      var nodes = dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]');
      if (!nodes.length) { return; }
      var first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  el('le-plan-generate').addEventListener('click', function () {
    var result = el('le-plan-result');
    result.hidden = false;
    if (!el('le-check-person').checked || !el('le-check-device').checked || !el('le-check-rest').checked) {
      result.textContent = '先想一想：换了人、换了测法，或刚运动完就测，结果还能直接比较吗？请把这三项条件保持一致，再形成方案。';
      return;
    }
    var sport = el('le-plan-sport').value;
    var weeks = el('le-plan-weeks').value;
    result.textContent = '我们计划用 ' + weeks + ' 周持续观察，选择适合自己的' + sport + '，记录运动情况。在开始时和 ' + weeks + ' 周后，为同一个人在休息、呼吸平静时，用同一种器材和方法，各做三次规范的有效测量，取最大值进行比较。测量中轮换休息；同时记录身高和测量条件的变化。结果是否改变，由实际数据回答。';
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state.running) {
      halt();
      start.textContent = '重新演示';
      status.textContent = '演示已暂停，可以重新开始。';
    }
  });
  window.LungExplain = {
    pause: function () {
      if (state.running) { halt(); start.textContent = '重新演示'; status.textContent = '演示已暂停，可以重新开始。'; }
      if (!modal.hidden) { modal.hidden = true; }
    },
    reset: resetDemo
  };
  resetDemo();
}());
