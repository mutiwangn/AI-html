/* 口腔里的消化：同源局域网课堂。课堂身份与教学模拟分离，不伪造学生记录。 */
(function (global) {
  'use strict';
  var STORAGE_KEY = 'mutiw.oral.classroom.v1';
  var DOWNLOAD_URL = 'https://mutiwangn.github.io/AI-html/四上2.5口腔里的消化/口腔消化局域网课堂_v1.0.zip';
  var current = null, state = null, callbacks = {}, pollTimer = null, pendingSync = null;
  var initialized = false, connected = false, serviceAvailable = false, probePromise = null;
  var serviceLanOrigins = [];
  var photoCache = {}, lastStatus = '', lastConnected = null, modalRevision = 0;
  var storageNoticeShown = false, uploadPending = false;
  var stages = ['1', '5', '10'];

  function el(id) { return document.getElementById(id); }
  function app() { return global.App; }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function safeMessage(error) { return error && error.message || '操作没有完成，请重试。'; }
  function modal(title, html, onReady, size) { modalRevision++; app().showModal(title, html, onReady, size); return modalRevision; }
  function hasRecord(group) { return state && state.members.filter(function (r) { return r.group === group && r.member === 'A'; })[0] || null; }
  function sessionEqual(saved) { return !!current && current.code === saved.code && current.token === saved.token; }
  function student() { return !!current && current.role === 'student'; }
  function teacher() { return !!current && current.role === 'teacher'; }
  function writable() { return !!(state && state.status === 'active'); }
  function choices(max, selected, countOnly) { var s = ''; for (var i = 1; i <= max; i++) s += '<option value="' + i + '"' + (i === selected ? ' selected' : '') + '>' + (countOnly ? i + '组' : '第 ' + i + ' 组') + '</option>'; return s; }
  function candidateOrigin() { return /^https?:$/.test(location.protocol) && !/(^|\.)github\.io$/i.test(location.hostname); }
  function statusLabel() { if (!current) return '本机记录'; if (state && state.status === 'closed') return '课堂已结束'; if (state && state.status === 'archived') return '课堂已暂停'; return teacher() ? '课堂 ' + current.code : '第 ' + current.group + ' 组已连接'; }
  function notify(label, online) {
    connected = !!online;
    if (lastStatus !== label || lastConnected !== connected) { lastStatus = label; lastConnected = connected; if (callbacks.onStatus) callbacks.onStatus(label, connected); }
    updateSessionPanel();
    if (el('oral-board-status')) el('oral-board-status').textContent = connected ? statusLabel() : label;
  }
  function saveSession() {
    try { if (current) localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); else localStorage.removeItem(STORAGE_KEY); }
    catch (error) { if (!storageNoticeShown) { storageNoticeShown = true; app().toast('浏览器无法保存课堂身份，请保持本页打开。'); } }
  }
  function readSession() {
    try {
      var s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!s || !/^[0-9]{6}$/.test(s.code || '') || typeof s.token !== 'string' || s.token.length < 24 || s.token.length > 256 || ['teacher', 'student'].indexOf(s.role) < 0) return null;
      if (s.role === 'student' && (s.group % 1 || s.group < 1 || s.group > 12)) return null;
      return {code:s.code, token:s.token, role:s.role, group:s.role === 'student' ? Number(s.group) : null, member:s.role === 'student' ? 'A' : null};
    } catch (error) { return null; }
  }
  function forgetSession() {
    current = null; state = null; connected = false; photoCache = {}; pendingSync = null;
    if (pollTimer) clearInterval(pollTimer); pollTimer = null;
    saveSession(); notify('本机记录', false); if (callbacks.onState) callbacks.onState(null);
  }
  function timedFetch(url, config, timeout) {
    return new Promise(function (resolve, reject) {
      var done = false, controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (controller) config.signal = controller.signal;
      var timer = setTimeout(function () { if (done) return; done = true; if (controller) controller.abort(); var e = new Error('连接超时，尚未确认上传。请检查局域网后重试。'); e.network = true; reject(e); }, timeout || 10000);
      fetch(url, config).then(function (response) { if (done) return; done = true; clearTimeout(timer); resolve(response); }, function () { if (done) return; done = true; clearTimeout(timer); var e = new Error('课堂连接中断，尚未确认上传。请检查网络后重试。'); e.network = true; reject(e); });
    });
  }
  function api(method, path, body, token, timeout) {
    if (!candidateOrigin()) return Promise.reject(new Error('请从教师电脑显示的局域网课堂网址打开本页。'));
    var config = {method:method, credentials:'same-origin', cache:'no-store', headers:{}};
    if (token) config.headers.Authorization = 'Bearer ' + token;
    if (body !== undefined) { config.headers['Content-Type'] = 'application/json'; config.body = JSON.stringify(body); }
    return timedFetch(path, config, timeout).then(function (response) {
      return response.text().then(function (raw) {
        var data; try { data = JSON.parse(raw); } catch (ignored) { var e = new Error('未收到课堂服务的数据，请使用启动窗口显示的课堂网址。'); e.network = true; throw e; }
        if (!response.ok) { var error = new Error(data.error && data.error.message || '服务未完成此操作，请重试。'); error.status = response.status; error.code = data.error && data.error.code; throw error; }
        return data;
      });
    });
  }
  function connectionError(error, saved) {
    if (!sessionEqual(saved)) return;
    if (error.status === 401) { if (pollTimer) clearInterval(pollTimer); pollTimer = null; notify('课堂身份已失效，请退出后重新加入', false); }
    else if (error.status === 404 && error.code === 'ROOM_NOT_FOUND') { if (pollTimer) clearInterval(pollTimer); pollTimer = null; notify('课堂服务已重启，请重新加入', false); }
    else if (error.network) notify('课堂连接中断', false);
  }
  function acceptState(next, saved) {
    if (!sessionEqual(saved)) throw new Error('课堂已切换，请在当前课堂重新操作。');
    if (!next || next.code !== saved.code || !Array.isArray(next.members)) { var e = new Error('课堂数据不完整，请重新连接。'); e.network = true; throw e; }
    if (!state || Number(next.revision) > Number(state.revision)) { state = clone(next); if (callbacks.onState) callbacks.onState(clone(state)); renderBoardRows(); }
    refreshStudentDetail();
    notify(statusLabel(), true); return clone(state);
  }
  function requestState(method, suffix, body) {
    if (!current) return Promise.reject(new Error('请先创建或加入局域网课堂。'));
    var saved = clone(current);
    return api(method, '/api/rooms/' + saved.code + (suffix || ''), body, saved.token).then(function (data) { return acceptState(data.state, saved); }).catch(function (e) { connectionError(e, saved); throw e; });
  }
  function sync() {
    if (!current) return Promise.resolve(null);
    if (pendingSync) return pendingSync;
    pendingSync = requestState('GET', '').then(function (data) { pendingSync = null; return data; }, function (e) { pendingSync = null; throw e; });
    return pendingSync;
  }
  function startPolling() { if (pollTimer) clearInterval(pollTimer); pollTimer = setInterval(function () { if (current && !document.hidden) sync().catch(function () {}); }, 2000); }
  function probe() {
    if (!candidateOrigin() || typeof fetch !== 'function') { serviceAvailable = false; serviceLanOrigins = []; return Promise.resolve(false); }
    if (probePromise) return probePromise;
    probePromise = api('GET', '/api/health', undefined, null, 3500).then(function (data) { serviceAvailable = !!(data.ok && data.service === 'oral-classroom'); serviceLanOrigins = serviceAvailable ? validLanOrigins(data.lanUrls) : []; probePromise = null; updateSessionPanel(); return serviceAvailable; }, function () { probePromise = null; serviceAvailable = false; serviceLanOrigins = []; updateSessionPanel(); return false; });
    return probePromise;
  }
  function adopt(session, nextState) { current = session; state = null; pendingSync = null; photoCache = {}; saveSession(); acceptState(nextState, clone(current)); startPolling(); }
  function bind(id, handler, busyLabel) {
    var node = el(id); if (!node) return;
    node.addEventListener('click', function () {
      if (node.disabled) return;
      var text = node.textContent, result;
      node.disabled = true; if (busyLabel) node.textContent = busyLabel;
      if (el('oral-error')) el('oral-error').textContent = '';
      try { result = handler(); } catch (e) { result = Promise.reject(e); }
      Promise.resolve(result).then(function () { node.disabled = false; node.textContent = text; updateSessionPanel(); }, function (error) { node.disabled = false; node.textContent = text; updateSessionPanel(); if (el('oral-error')) el('oral-error').textContent = safeMessage(error); else app().toast(safeMessage(error)); });
    });
  }
  function errorSlot() { return '<div id="oral-error" class="key-error" role="status" aria-live="polite"></div>'; }
  function showHelp() {
    modal('连接局域网课堂', '<p>小组上传记录和照片，需要教师电脑启动课堂运行包。</p><ol><li>下载并解压运行包，双击“启动课堂”。</li><li>教师和学生都打开启动窗口中的同一个局域网网址。</li><li>教师创建课堂码，学生输入课堂码并选择小组。</li></ol><p class="fine-print">电脑需要 Python 3.8 或更新版本。GitHub 在线页和直接打开 HTML 可单机使用；相同课堂码只有在运行中的局域网课堂内才会互联。</p><div class="modal-actions"><a class="primary" href="' + DOWNLOAD_URL + '" download="口腔消化局域网课堂_v1.0.zip">下载课堂运行包</a><button id="oral-help-retry" class="secondary">重新检查</button></div>', function () { bind('oral-help-retry', openPanel, '正在检查'); });
  }
  function showRoles() {
    modal('局域网课堂', '<p>每组使用一台平板记录，共同观察真实食物。</p><div class="oral-roles"><button id="oral-teacher" class="primary">我是教师</button><button id="oral-student" class="secondary">我是学生</button></div><p class="fine-print">不填写姓名。照片和记录保存在教师电脑，关闭服务前请导出。</p>', function () { bind('oral-teacher', showCreate); bind('oral-student', function () { showJoin(''); }); });
  }
  function showCreate() {
    modal('创建教师课堂', '<div class="form-row"><div><label for="oral-create-groups">小组数量</label><select id="oral-create-groups">' + choices(12, 6, true) + '</select></div></div>' + errorSlot() + '<div class="modal-actions"><button id="oral-create-back" class="secondary">返回</button><button id="oral-create-go" class="primary">创建课堂</button></div>', function () {
      bind('oral-create-back', showRoles); bind('oral-create-go', function () { return api('POST', '/api/rooms', {groups:Number(el('oral-create-groups').value)}).then(function (data) { adopt({code:data.code,token:data.teacherToken,role:'teacher',group:null,member:null}, data.state); showSession(); }); }, '正在创建');
    }, 'narrow');
  }
  function showJoin(code) {
    modal('加入学生课堂', '<div class="form-row"><div><label for="oral-join-code">6位课堂码</label><input id="oral-join-code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="off" placeholder="输入老师的课堂码" value="' + esc(code) + '"></div></div><div class="form-row"><div><label for="oral-join-group">我们是第几组</label><select id="oral-join-group">' + choices(12, 1) + '</select></div></div><p class="fine-print">每个小组使用一个记录端；已加入的平板刷新后会保留身份。</p>' + errorSlot() + '<div class="modal-actions"><button id="oral-join-back" class="secondary">返回</button><button id="oral-join-go" class="primary">加入课堂</button></div>', function () {
      el('oral-join-code').addEventListener('input', function () { this.value = this.value.replace(/[^0-9]/g, '').slice(0, 6); });
      bind('oral-join-back', showRoles); bind('oral-join-go', function () {
        var c = el('oral-join-code').value.trim(), g = Number(el('oral-join-group').value);
        if (!/^[0-9]{6}$/.test(c)) throw new Error('请输入老师给出的6位课堂码。');
        return api('POST', '/api/rooms/' + c + '/join', {group:g,member:'A'}).then(function (data) { adopt({code:c,token:data.studentToken,role:'student',group:g,member:'A'}, data.state); app().closeModal(); app().toast('已加入第 ' + g + ' 组。完成观察后再点击上传记录。'); }).catch(function (e) { if (e.code === 'MEMBER_IN_USE') e.message = '这个小组已有记录端。请使用原平板，或让老师先在小组详情中释放身份。'; throw e; });
      }, '正在加入');
    }, 'narrow');
  }
  function localOnlyOrigin() {
    var host = location.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return /(^|\.)localhost\.?$/.test(host) || /^127\./.test(host) || host === '::1' || host === '0.0.0.0' || host === '::';
  }
  function validLanOrigins(values) {
    var valid = [];
    if (!Array.isArray(values)) return valid;
    values.forEach(function (value) {
      if (typeof value !== 'string' || /\s/.test(value)) return;
      try {
        var url = new URL(value), host = url.hostname;
        if (['http:', 'https:'].indexOf(url.protocol) < 0 || url.username || url.password || url.search || url.hash || (url.pathname && url.pathname !== '/')) return;
        if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return;
        var octets = host.split('.').map(Number);
        if (octets.some(function (v) { return v < 0 || v > 255; }) || octets[0] === 0 || octets[0] === 127 || octets[0] >= 224) return;
        if (valid.indexOf(url.origin) < 0) valid.push(url.origin);
      } catch (ignored) {}
    });
    return valid;
  }
  function shareUrl() {
    if (!current) return '';
    var origin = localOnlyOrigin() ? (serviceLanOrigins[0] || '') : location.origin;
    return origin ? origin + '/?join=' + current.code : '';
  }
  function copyLink() {
    var text = shareUrl();
    if (!text) { app().toast('学生请使用启动窗口中的局域网地址。当前本机地址不能发给学生。'); return Promise.resolve(); }
    function fallback() { var t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} document.body.removeChild(t); app().toast(ok ? '课堂网址已复制。' : '请长按课堂网址，选中后复制。'); }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { app().toast('课堂网址已复制。'); }, fallback);
    fallback(); return Promise.resolve();
  }
  function updateSessionPanel() {
    if (!el('oral-session') || !current) return;
    if (el('oral-session-status')) el('oral-session-status').textContent = connected ? statusLabel() : lastStatus + ' · 正在尝试重连';
    var studentUrl = shareUrl();
    if (el('oral-share-url')) el('oral-share-url').textContent = studentUrl || '学生请使用启动窗口中的局域网地址';
    if (el('oral-copy')) el('oral-copy').disabled = !studentUrl;
    if (!state) return;
    if (el('oral-group-count')) el('oral-group-count').textContent = state.groups;
    if (el('oral-count')) el('oral-count').textContent = state.members.filter(function (r) { return r.joined; }).length + ' 组已加入';
    if (el('oral-minus')) el('oral-minus').disabled = state.groups <= 1 || state.status === 'closed';
    if (el('oral-plus')) el('oral-plus').disabled = state.groups >= 12 || state.status === 'closed';
    if (el('oral-pause')) { el('oral-pause').disabled = state.status === 'closed'; el('oral-pause').textContent = state.status === 'archived' ? '继续课堂' : '暂停上传'; }
    if (el('oral-end')) el('oral-end').disabled = state.status === 'closed';
    if (el('oral-upload-now')) el('oral-upload-now').disabled = !writable();
    if (el('oral-my-photo')) el('oral-my-photo').disabled = !writable();
  }
  function showSession() {
    if (!current) return showRoles();
    var t = teacher(), html = '<div id="oral-session"><div class="oral-code">' + current.code + '</div><p id="oral-session-status" class="oral-status"></p>';
    if (t) {
      html += '<p id="oral-count" class="fine-print"></p><p id="oral-share-url" class="oral-url">' + esc(shareUrl() || '学生请使用启动窗口中的局域网地址') + '</p>' + (localOnlyOrigin() ? '<p class="fine-print">教师可继续使用本机页面。学生应打开上方局域网课堂网址，或使用启动窗口显示的“学生平板”地址。</p>' : '') + '<div class="modal-actions"><button id="oral-copy" class="secondary">复制课堂网址</button><button id="oral-board" class="primary">全班观察记录</button></div><div class="oral-group-controls"><span>小组数 <strong id="oral-group-count">' + (state ? state.groups : '—') + '</strong></span><button id="oral-minus" class="secondary">减少一组</button><button id="oral-plus" class="secondary">增加一组</button></div><div class="modal-actions"><button id="oral-pause" class="secondary">暂停上传</button><button id="oral-export" class="secondary">导出记录和照片</button><button id="oral-end" class="secondary">结束课堂</button></div>';
    } else {
      html += '<h3>第 ' + current.group + ' 组</h3><p>把真实食物的观察填入本机记录，再上传到老师的大屏。</p><div class="modal-actions"><button id="oral-upload-now" class="primary">上传本组记录</button><button id="oral-my-photo" class="secondary">上传过程照片</button></div><div class="modal-actions"><button id="oral-my-detail" class="secondary">查看记录和点评</button><button id="oral-board" class="secondary">全班观察记录</button></div>';
    }
    html += errorSlot() + '<div class="modal-actions"><button id="oral-leave" class="secondary">离开课堂</button><button id="oral-done" class="primary">回到探究</button></div></div>';
    modal(t ? '教师课堂' : '我的课堂', html, function () {
      updateSessionPanel(); bind('oral-copy', copyLink); bind('oral-board', showBoard); bind('oral-done', function () { app().closeModal(); });
      bind('oral-minus', function () { return requestState('PATCH', '', {groups:state.groups - 1}); }, '正在更新');
      bind('oral-plus', function () { return requestState('PATCH', '', {groups:state.groups + 1}); }, '正在更新');
      bind('oral-pause', function () { return requestState('PATCH', '', {status:state.status === 'archived' ? 'active' : 'archived'}).then(showSession); }, '正在更新');
      bind('oral-export', exportArchive, '正在收集照片'); bind('oral-end', showEnd); bind('oral-leave', showLeave);
      bind('oral-upload-now', function () { return uploadRecord(); }, '正在上传');
      bind('oral-my-photo', function () { showPhotoUpload(current.group); }); bind('oral-my-detail', function () { showDetail(current.group); });
    });
  }
  function showEnd() {
    modal('结束课堂？', '<p>结束后保留只读记录，学生不能继续上传。请先导出记录和照片，再关闭教师电脑上的服务窗口。</p>' + errorSlot() + '<div class="modal-actions"><button id="oral-end-back" class="secondary">返回</button><button id="oral-end-export" class="secondary">先导出</button><button id="oral-end-confirm" class="primary">确认结束</button></div>', function () { bind('oral-end-back', showSession); bind('oral-end-export', exportArchive, '正在收集照片'); bind('oral-end-confirm', function () { return requestState('PATCH', '', {status:'closed'}).then(showSession); }, '正在结束'); });
  }
  function showLeave() {
    var t = teacher();
    modal('离开课堂？', '<p>' + (t ? '离开会移除这台设备的教师身份，课堂码不能恢复教师权限。请先导出记录和照片。' : '离开后释放本组记录端身份，老师端保留已上传的观察与照片。') + '</p>' + errorSlot() + '<div class="modal-actions"><button id="oral-leave-back" class="secondary">返回</button>' + (t ? '<button id="oral-leave-export" class="secondary">先导出</button>' : '') + '<button id="oral-leave-confirm" class="primary">确认离开</button></div>', function () {
      bind('oral-leave-back', showSession); bind('oral-leave-export', exportArchive, '正在收集照片'); bind('oral-leave-confirm', function () {
        if (!current) return;
        var saved = clone(current);
        if (saved.role === 'teacher') { forgetSession(); app().closeModal(); app().toast('已离开教师课堂，本机观察仍保留。'); return; }
        return api('POST', '/api/rooms/' + saved.code + '/leave', {}, saved.token).then(function () { if (!sessionEqual(saved)) return; forgetSession(); app().closeModal(); app().toast('已离开课堂，本机观察仍保留。'); }).catch(function (e) { connectionError(e, saved); if (e.status === 401 || (e.status === 404 && e.code === 'ROOM_NOT_FOUND')) { forgetSession(); app().closeModal(); app().toast('课堂身份已失效，已返回本机记录。'); return; } throw e; });
      }, '正在离开');
    });
  }
  function getLocalRecord() {
    if (typeof callbacks.getRecord !== 'function') throw new Error('本机记录尚未就绪，请回到观察页再试。');
    var source = callbacks.getRecord(), out = {observations:{}, note:''}, found = false;
    if (!source || typeof source !== 'object') throw new Error('请先记录真实食物的变化。');
    stages.forEach(function (stage) {
      var row = source.observations && source.observations[stage] || {};
      var next = {};
      ['size','texture','moisture'].forEach(function (key) { next[key] = row[key] == null ? '' : row[key]; if (next[key] !== '') found = true; });
      out.observations[stage] = next;
    });
    out.note = String(source.note || '').trim(); if (out.note) found = true;
    if (!found) throw new Error('记录还是空白。请先观察真实食物，再填写和上传。');
    if (out.note.length > 200) throw new Error('观察补充请控制在200字以内。');
    return out;
  }
  function submitRecord(group) {
    if (!writable()) return Promise.reject(new Error('课堂已暂停或结束，目前不能上传。'));
    var data; try { data = getLocalRecord(); } catch (e) { return Promise.reject(e); }
    return requestState('PATCH', '/records/' + group + '/A', data).then(function () { app().toast('第 ' + group + ' 组记录已上传。'); return true; });
  }
  function uploadRecord() {
    if (!current) { openPanel(); return Promise.resolve(false); }
    if (uploadPending) return Promise.resolve(false);
    if (teacher()) {
      var data; try { data = getLocalRecord(); } catch (e) { app().toast(e.message); return Promise.reject(e); }
      modal('上传本机观察', '<p>选择这份真实观察所属的小组。</p><div class="form-row"><select id="oral-upload-group">' + choices(state.groups, 1) + '</select></div>' + errorSlot() + '<div class="modal-actions"><button id="oral-upload-cancel" class="secondary">返回</button><button id="oral-upload-confirm" class="primary">上传记录</button></div>', function () { bind('oral-upload-cancel', showSession); bind('oral-upload-confirm', function () { return submitRecord(Number(el('oral-upload-group').value)).then(showBoard); }, '正在上传'); }, 'narrow');
      return Promise.resolve(false);
    }
    uploadPending = true;
    return submitRecord(current.group).then(function (result) { uploadPending = false; return result; }, function (e) { uploadPending = false; throw e; });
  }
  function observationHtml(observation) {
    if (!observation) return '<span class="oral-empty">未记录</span>';
    var values = [observation.size, observation.texture, observation.moisture].filter(function (x) { return x != null && x !== ''; });
    return values.length ? values.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') : '<span class="oral-empty">未记录</span>';
  }
  function recordRows() {
    if (!state) return '';
    var s = '';
    for (var group = 1; group <= state.groups; group++) {
      var record = hasRecord(group), obs = record && record.observations || {};
      s += '<tr' + (record && record.highlight ? ' class="oral-highlight"' : '') + '><th scope="row"><button class="oral-group-link" data-oral-group="' + group + '">第' + group + '组' + (record && record.highlight ? '<small>重点证据</small>' : '') + '</button></th>';
      stages.forEach(function (stage) { s += '<td><div class="oral-observation">' + observationHtml(obs[stage]) + '</div></td>'; });
      s += '<td><button class="oral-detail-button secondary" data-oral-group="' + group + '">' + (record && record.photoVersion ? '照片 · ' : '') + (record && record.comment ? '已有点评' : '查看') + '</button></td></tr>';
    }
    return s;
  }
  function renderBoardRows() {
    var body = el('oral-board-body'); if (!body || !current || !state) return;
    var scroller = el('oral-board-scroll'), top = scroller ? scroller.scrollTop : 0;
    body.innerHTML = recordRows();
    Array.prototype.forEach.call(body.querySelectorAll('[data-oral-group]'), function (node) { node.addEventListener('click', function () { showDetail(Number(node.getAttribute('data-oral-group'))); }); });
    if (scroller) scroller.scrollTop = top;
    if (el('oral-board-subtitle')) el('oral-board-subtitle').textContent = '课堂 ' + current.code + ' · ' + state.members.filter(function (r) { return r.joined; }).length + ' 组已加入';
  }
  function showBoard() {
    if (!current) return openPanel();
    var html = '<div class="oral-board-head"><p id="oral-board-subtitle"></p><span id="oral-board-status" class="fine-print">' + esc(statusLabel()) + '</span></div><div id="oral-board-scroll" class="oral-board-scroll"><table class="oral-board-table"><thead><tr><th>小组</th><th>咀嚼1次</th><th>咀嚼5次</th><th>咀嚼10次</th><th>证据与点评</th></tr></thead><tbody id="oral-board-body"></tbody></table></div><p class="fine-print">每格依次显示颗粒大小、软硬、干湿；空白表示尚未提交，具体变化以真实观察为准。</p>' + errorSlot() + '<div class="modal-actions"><button id="oral-board-back" class="secondary">课堂设置</button><button id="oral-board-export" class="secondary">导出记录和照片</button><button id="oral-board-close" class="primary">回到探究</button></div>';
    modal('全班观察记录', html, function () { renderBoardRows(); bind('oral-board-back', showSession); bind('oral-board-export', exportArchive, '正在收集照片'); bind('oral-board-close', function () { app().closeModal(); }); }, 'wide');
    return sync().catch(function (e) { if (el('oral-error')) el('oral-error').textContent = safeMessage(e); });
  }
  function getPhoto(group, record, saved) {
    if (!record || !record.photoVersion) return Promise.resolve(null);
    var key = group + '/A', version = record.photoVersion;
    if (photoCache[key] && photoCache[key].version === version) return Promise.resolve(photoCache[key].dataUrl);
    return timedFetch('/api/rooms/' + saved.code + '/photos/' + key, {method:'GET',credentials:'same-origin',cache:'no-store',headers:{Authorization:'Bearer ' + saved.token}}, 12000).then(function (response) {
      if (!response.ok) return response.text().then(function (raw) { var data; try {data=JSON.parse(raw);}catch(e){data={};} var error = new Error(data.error && data.error.message || '照片读取失败，请重试。'); error.status = response.status; error.code = data.error && data.error.code; throw error; });
      var type = (response.headers.get('Content-Type') || '').split(';')[0]; if (['image/jpeg','image/png','image/webp'].indexOf(type) < 0) throw new Error('照片格式不正确。'); return response.blob();
    }).then(function (blob) { return new Promise(function (resolve, reject) { var reader = new FileReader(); reader.onload = function () { if (!sessionEqual(saved)) return reject(new Error('课堂已切换，请重新打开照片。')); photoCache[key] = {version:version,dataUrl:reader.result}; resolve(reader.result); }; reader.onerror = function () { reject(new Error('照片读取失败。')); }; reader.readAsDataURL(blob); }); }).catch(function (e) { connectionError(e, saved); throw e; });
  }
  function detailTable(record) { var obs = record && record.observations || {}; return '<table class="oral-detail-table"><thead><tr><th></th><th>1次</th><th>5次</th><th>10次</th></tr></thead><tbody>' + [['size','大小'],['texture','软硬'],['moisture','干湿']].map(function (pair) { return '<tr><th>' + pair[1] + '</th>' + stages.map(function (s) { return '<td>' + esc(obs[s] && obs[s][pair[0]] || '—') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>'; }
  function detailFingerprint(group) { return JSON.stringify([state && state.status, hasRecord(group)]); }
  function refreshStudentDetail() {
    // 教师的点评 textarea 可能正在编辑，后台轮询绝不重建教师详情。
    if (!student()) return;
    var panel = el('oral-detail-layout');
    if (!panel || !panel.getClientRects().length) return;
    var group = Number(panel.getAttribute('data-group'));
    if (panel._oralFingerprint === detailFingerprint(group)) return;
    var body = document.querySelector('.modal-body') || el('modal-body');
    var top = body ? body.scrollTop : 0, focusedId = document.activeElement && document.activeElement.id;
    showDetail(group);
    body = document.querySelector('.modal-body') || el('modal-body');
    if (body) body.scrollTop = top;
    var focusTarget = focusedId && el(focusedId);
    if (focusTarget && focusTarget.getClientRects().length) {
      try { focusTarget.focus({preventScroll:true}); } catch (ignored) { focusTarget.focus(); }
      if (body) body.scrollTop = top;
    }
  }
  function showDetail(group) {
    if (!current) return openPanel();
    var record = hasRecord(group), canEdit = teacher() && state && state.status !== 'closed', own = teacher() || current.group === group;
    var html = '<div id="oral-detail-layout" class="oral-detail-layout" data-group="' + group + '"><div><div class="oral-photo" id="oral-photo-area"><span>' + (record && record.photoVersion ? '正在读取照片…' : '还没有过程照片') + '</span></div>' + (own && writable() ? '<div class="modal-actions"><button id="oral-photo-add" class="secondary">' + (record && record.photoVersion ? '更换过程照片' : '上传过程照片') + '</button>' + (record && record.photoVersion ? '<button id="oral-photo-delete" class="secondary">删除照片</button>' : '') + '</div>' : '') + '</div><div>' + detailTable(record) + '<p class="oral-note">' + esc(record && record.note || '暂无补充观察。') + '</p>';
    if (canEdit) html += '<label for="oral-comment">教师点评</label><textarea id="oral-comment" maxlength="200" rows="3" placeholder="指出观察依据或下一步建议">' + esc(record && record.comment || '') + '</textarea><label class="oral-highlight-control"><input id="oral-highlight" type="checkbox"' + (record && record.highlight ? ' checked' : '') + '> 作为重点证据展示</label>';
    else html += '<h3>教师点评</h3><p class="oral-comment-view">' + esc(record && record.comment || '等待老师点评。') + '</p>';
    html += '</div></div>' + errorSlot() + '<div class="modal-actions"><button id="oral-detail-back" class="secondary">返回全班记录</button>' + (teacher() && record && writable() ? '<button id="oral-clear-group" class="secondary">清空并释放本组</button>' : '') + (canEdit ? '<button id="oral-comment-save" class="primary">保存点评</button>' : '<button id="oral-detail-done" class="primary">回到探究</button>') + '</div>';
    var rev = modal('第 ' + group + ' 组的观察证据' + (record && record.highlight ? ' · 重点证据' : ''), html, function () {
      el('oral-detail-layout')._oralFingerprint = detailFingerprint(group);
      bind('oral-detail-back', showBoard); bind('oral-detail-done', function () { app().closeModal(); }); bind('oral-photo-add', function () { showPhotoUpload(group); }); bind('oral-photo-delete', function () { confirmDeletePhoto(group); }); bind('oral-clear-group', function () { confirmClearGroup(group); });
      bind('oral-comment-save', function () { var patch = {comment:el('oral-comment').value,highlight:el('oral-highlight').checked}; return requestState('PATCH','/records/' + group + '/A',patch).then(function () { app().toast('点评已保存。'); showDetail(group); }); }, '正在保存');
    }, 'wide');
    if (record && record.photoVersion) {
      var saved = clone(current);
      getPhoto(group, record, saved).then(function (dataUrl) { if (modalRevision !== rev || !el('oral-photo-area')) return; var img=document.createElement('img');img.alt='第'+group+'组的过程照片';img.src=dataUrl;el('oral-photo-area').innerHTML='';el('oral-photo-area').appendChild(img); }).catch(function (e) { if (modalRevision === rev && el('oral-photo-area')) el('oral-photo-area').textContent = safeMessage(e); });
    }
  }
  function confirmDeletePhoto(group) {
    modal('删除这张照片？', '<p>删除第 ' + group + ' 组的过程照片，保留观察记录和点评。</p>' + errorSlot() + '<div class="modal-actions"><button id="oral-photo-delete-back" class="secondary">返回</button><button id="oral-photo-delete-confirm" class="primary">确认删除照片</button></div>', function () { bind('oral-photo-delete-back', function () { showDetail(group); }); bind('oral-photo-delete-confirm', function () { return requestState('DELETE','/photos/' + group + '/A').then(function () { delete photoCache[group+'/A']; showDetail(group); }); }, '正在删除'); });
  }
  function confirmClearGroup(group) {
    modal('清空第 ' + group + ' 组？', '<p>这会删除该组已上传的观察、照片、点评，并让原平板退出身份。请先导出需要的资料；之后可由新的平板重新加入。</p>' + errorSlot() + '<div class="modal-actions"><button id="oral-clear-back" class="secondary">返回</button><button id="oral-clear-export" class="secondary">先导出全班记录</button><button id="oral-clear-confirm" class="primary">确认清空并释放</button></div>', function () { bind('oral-clear-back', function () { showDetail(group); }); bind('oral-clear-export', exportArchive, '正在收集照片'); bind('oral-clear-confirm', function () { return requestState('DELETE','/records/' + group + '/A').then(function () { delete photoCache[group+'/A']; app().toast('第 ' + group + ' 组已释放，可重新加入。'); showBoard(); }); }, '正在清空'); });
  }
  function compressPhoto(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('请选择照片文件。'));
      if (file.size > 25 * 1024 * 1024) return reject(new Error('原始照片过大，请选一张小于25MB的照片。'));
      var reader = new FileReader(); reader.onerror = function () { reject(new Error('无法读取照片，请重新选择。')); };
      reader.onload = function () { var img = new Image(); img.onerror = function () { reject(new Error('无法打开这张照片，请使用JPEG、PNG或WebP图片。')); }; img.onload = function () {
        try { var scale = Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight)), canvas = document.createElement('canvas'); canvas.width = Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale)); var ctx=canvas.getContext('2d'); if(!ctx)throw new Error('当前浏览器不能处理照片。');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);var data=canvas.toDataURL('image/jpeg',.76);if(data.length*0.75>1258291)data=canvas.toDataURL('image/jpeg',.55);if(data.length*0.75>1258291)throw new Error('压缩后的照片仍过大，请换一张较小照片。');resolve(data);}catch(e){reject(e);}
      }; img.src=reader.result; }; reader.readAsDataURL(file);
    });
  }
  function showPhotoUpload(group) {
    if (!writable()) { app().toast('课堂已暂停或结束，不能上传照片。'); return; }
    var pendingPhoto = null, saved = clone(current), selection = 0;
    var html = '<p>拍摄食物和观察过程，上传前先检查照片。</p><div class="oral-photo oral-photo-preview" id="oral-upload-preview"><span>选择一张照片</span></div><input id="oral-photo-file" type="file" accept="image/*" hidden><input id="oral-photo-camera" type="file" accept="image/*" capture="environment" hidden><div class="modal-actions"><button id="oral-choose-file" class="secondary">选择照片</button><button id="oral-take-photo" class="secondary">拍摄照片</button></div>' + errorSlot() + '<div class="modal-actions"><button id="oral-photo-cancel" class="secondary">返回</button><button id="oral-photo-submit" class="primary" disabled>确认上传</button></div>';
    var rev = modal('第 ' + group + ' 组 · 过程照片',html,function(){
      function select(file) { var run=++selection;pendingPhoto=null;el('oral-photo-submit').disabled=true;el('oral-upload-preview').textContent='正在处理照片…';el('oral-error').textContent='';compressPhoto(file).then(function(data){if(run!==selection||rev!==modalRevision)return;pendingPhoto=data;var img=document.createElement('img');img.src=data;img.alt='待上传照片预览';el('oral-upload-preview').innerHTML='';el('oral-upload-preview').appendChild(img);el('oral-photo-submit').disabled=false;}).catch(function(e){if(run!==selection||rev!==modalRevision)return;el('oral-upload-preview').textContent='请选择照片';el('oral-error').textContent=safeMessage(e);});}
      el('oral-photo-file').addEventListener('change',function(){if(this.files[0])select(this.files[0]);});el('oral-photo-camera').addEventListener('change',function(){if(this.files[0])select(this.files[0]);});
      bind('oral-choose-file',function(){el('oral-photo-file').click();});bind('oral-take-photo',function(){el('oral-photo-camera').click();});bind('oral-photo-cancel',function(){showDetail(group);});
      bind('oral-photo-submit',function(){if(!pendingPhoto)throw new Error('请先选择照片。');if(!sessionEqual(saved))throw new Error('课堂已切换，请重新选择照片。');var ensure=hasRecord(group)?Promise.resolve():requestState('PATCH','/records/'+group+'/A',{note:''});return ensure.then(function(){return requestState('POST','/photos/'+group+'/A',{dataUrl:pendingPhoto});}).then(function(){delete photoCache[group+'/A'];app().toast('第 '+group+' 组照片已上传。');showDetail(group);});},'正在上传');
    });
  }
  function downloadFile(name, body, type) {
    var blob = new Blob([body],{type:type}), url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},10000);
  }
  function exportArchive() {
    if (!current) return Promise.reject(new Error('请先加入课堂。'));
    var saved=clone(current), snapshot;
    return sync().then(function(next){snapshot=next;return Promise.all(snapshot.members.map(function(record){return getPhoto(record.group,record,saved).then(function(data){return {record:record,photo:data};});}));}).then(function(entries){
      if(!sessionEqual(saved))throw new Error('课堂已切换，请重新导出。');
      var now=new Date(), when=now.toLocaleString('zh-CN'), content='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>口腔里的消化 · 课堂观察记录</title><style>body{font-family:system-ui,"Microsoft YaHei",sans-serif;max-width:1100px;margin:30px auto;padding:0 22px;color:#183e42;line-height:1.65;background:#fff}h1{font-size:30px}h2{font-size:25px;border-bottom:2px solid #d8e8e8;padding-bottom:8px}section{page-break-inside:avoid;margin:32px 0}table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{padding:12px;border:1px solid #cfdddd;text-align:center;font-size:19px;overflow-wrap:anywhere}th{background:#f1f7f6}img{max-width:100%;max-height:680px;object-fit:contain;display:block;margin:20px auto}p{white-space:pre-wrap;overflow-wrap:anywhere}.muted{color:#5c7477}.mark{font-weight:700;color:#9b6128}@media print{body{margin:0;max-width:none}section{break-inside:avoid}}</style><h1>口腔里的消化 · 课堂观察记录</h1><p class="muted">课堂 '+esc(snapshot.code)+' · 导出时间 '+esc(when)+' · 共 '+snapshot.groups+' 组</p><p>这些内容来自课堂真实观察。咀嚼次数用于比较观察阶段，不表示统一的进食标准。</p>';
      if(!entries.length)content+='<p>本次导出时还没有小组提交记录。</p>';
      entries.forEach(function(entry){var r=entry.record,obs=r.observations||{};content+='<section><h2>第 '+r.group+' 组'+(r.highlight?' <span class="mark">· 重点证据</span>':'')+'</h2><table><thead><tr><th>观察项目</th><th>咀嚼1次</th><th>咀嚼5次</th><th>咀嚼10次</th></tr></thead><tbody>'+[['size','颗粒大小'],['texture','软硬'],['moisture','干湿']].map(function(pair){return '<tr><th>'+pair[1]+'</th>'+stages.map(function(s){return '<td>'+esc(obs[s]&&obs[s][pair[0]]||'未记录')+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table><p><strong>补充观察：</strong>'+esc(r.note||'未填写')+'</p><p><strong>教师点评：</strong>'+esc(r.comment||'尚未点评')+'</p>'+(entry.photo?'<img src="'+entry.photo+'" alt="第'+r.group+'组过程照片">':'<p class="muted">无过程照片</p>')+'</section>';});
      content+='</html>';var stamp=now.getFullYear()+('0'+(now.getMonth()+1)).slice(-2)+('0'+now.getDate()).slice(-2)+'_'+('0'+now.getHours()).slice(-2)+('0'+now.getMinutes()).slice(-2);downloadFile('口腔消化_课堂'+snapshot.code+'_记录和照片_'+stamp+'.html',content,'text/html;charset=utf-8');app().toast('已生成含全部照片的离线记录文件，请确认浏览器已保存。');
    }).catch(function(e){throw new Error('导出未完成：'+safeMessage(e)+' 请保持课堂服务运行后重试。');});
  }
  function openPanel() {
    if(current){showSession();sync().catch(function(){});return Promise.resolve();}
    if(!candidateOrigin()){showHelp();return Promise.resolve();}
    if(serviceAvailable){showRoles();return Promise.resolve();}
    var rev=modal('局域网课堂','<p id="oral-probe">正在检查课堂服务…</p>',null,'narrow');return probe().then(function(ready){var marker=el('oral-probe');if(modalRevision!==rev||!marker||!marker.getClientRects().length)return;if(ready)showRoles();else showHelp();});
  }
  function injectStyles() {
    if(el('oral-room-style'))return;var style=document.createElement('style');style.id='oral-room-style';style.textContent='.oral-roles{display:flex;gap:18px;margin:22px 0}.oral-roles>*{flex:1;min-height:85px}.oral-code{font-size:64px;font-weight:800;text-align:center;letter-spacing:.12em;color:#157873;line-height:1.3}.oral-status{text-align:center;color:#157873;font-size:20px}.oral-url{word-break:break-all;background:#eff6f5;padding:12px 16px;border-radius:10px;font-size:18px}.oral-group-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:22px 0}.oral-group-controls>span{margin-right:auto;font-size:23px}.oral-group-controls button{font-size:20px;min-height:48px}.oral-board-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.oral-board-scroll{max-height:52vh;overflow:auto;border:1px solid #d5e4e3;border-radius:12px}.oral-board-table{border-collapse:collapse;width:100%;table-layout:fixed}.oral-board-table th,.oral-board-table td{padding:12px 8px;border-bottom:1px solid #dce8e6;text-align:center;font-size:21px;vertical-align:middle}.oral-board-table thead th{position:sticky;top:0;background:#edf6f4;z-index:1}.oral-board-table th:first-child{width:14%}.oral-board-table th:last-child{width:21%}.oral-group-link{border:0;background:transparent;color:#176c66;font-weight:700;font-size:22px;min-height:48px;cursor:pointer;padding:4px}.oral-group-link small{display:block;font-size:14px;color:#926128}.oral-observation{display:flex;flex-direction:column;gap:2px;line-height:1.45}.oral-empty{color:#8d9e9c;font-size:18px}.oral-highlight{background:#fff8e7}.oral-detail-button{font-size:18px!important;min-height:48px!important;padding:8px!important}.oral-detail-layout{display:grid;grid-template-columns:1fr 1.1fr;gap:24px}.oral-photo{background:#f0f6f5;border:1px dashed #aac8c3;border-radius:14px;min-height:220px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#66807b;font-size:20px;position:relative;text-align:center}.oral-photo img{display:block;width:100%;height:100%;object-fit:contain;position:absolute;inset:0}.oral-photo-preview{max-height:37vh;aspect-ratio:auto;min-height:200px}.oral-detail-table{width:100%;border-collapse:collapse;table-layout:fixed}.oral-detail-table th,.oral-detail-table td{padding:10px 5px;border-bottom:1px solid #dce8e6;text-align:center;font-size:20px}.oral-detail-table th{color:#537671}.oral-note,.oral-comment-view{white-space:pre-wrap;overflow-wrap:anywhere;font-size:20px;line-height:1.65;margin-top:16px}.oral-highlight-control{display:flex!important;gap:10px;align-items:center;margin:12px 0;font-size:18px!important}.oral-highlight-control input{width:23px;height:23px;flex:none}.oral-detail-layout textarea{width:100%;font:inherit;line-height:1.6;resize:vertical;max-height:170px;box-sizing:border-box}.oral-board-scroll .secondary{border:1px solid #b9d2ce;background:white;color:#286e65}@media(max-width:700px){.oral-code{font-size:48px}.oral-detail-layout{grid-template-columns:1fr;gap:18px}.oral-photo{min-height:180px;max-height:32vh}.oral-board-table th,.oral-board-table td{font-size:15px;padding:8px 3px}.oral-group-link{font-size:17px}.oral-detail-button{font-size:14px!important;padding:6px 3px!important}.oral-observation{font-size:16px}.oral-empty{font-size:14px}.oral-board-table th:last-child{width:20%}.oral-board-scroll{max-height:47vh}.oral-group-controls button{font-size:17px}.oral-roles{gap:10px}.oral-detail-table th,.oral-detail-table td{font-size:18px}}';document.head.appendChild(style);
  }
  function init(config) {
    callbacks=config||{};injectStyles();if(initialized)return;initialized=true;current=readSession();
    if(current){notify('正在恢复课堂',false);startPolling();sync().catch(function(){});probe().catch(function(){});}else{notify('本机记录',false);var join='';try{join=new URLSearchParams(location.search).get('join')||'';}catch(e){}probe().then(function(ready){if(/^[0-9]{6}$/.test(join)&&!current){if(ready)showJoin(join);else showHelp();}});}
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&current)sync().catch(function(){});});global.addEventListener('online',function(){if(current)sync().catch(function(){});});
  }
  global.OralRoom={init:init,openPanel:openPanel,uploadRecord:uploadRecord,isStudent:student,isTeacher:teacher,showBoard:showBoard,session:function(){return current?clone(current):null;},state:function(){return state?clone(state):null;},showPhotoUpload:function(){if(!current)return openPanel();if(student())showPhotoUpload(current.group);else showBoard();},exportRecords:exportArchive};
}(window));
