/* 同局域网课堂连接；仅处理会话与API，不写入本机测量数据。 */
(function (global) {
  'use strict';
  var STORAGE_KEY = 'mutiw.lung.classroom.v1';
  var DOWNLOAD_URL = 'https://mutiwangn.github.io/AI-html/四上2.4测量肺活量/肺活量局域网课堂_v1.0.zip';
  var current = null, state = null, callbacks = {}, timer = null;
  var pendingSync = null, probePromise = null, serviceAvailable = false;
  var connected = false, initialized = false, storageNoticeShown = false;
  var lastStatus = '', lastConnected = null, photoCache = {};

  function el(id) { return document.getElementById(id); }
  function app() { return global.App; }
  function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function options(from, to, selected, prefix) {
    var result = '';
    for (var i = from; i <= to; i++) {
      result += '<option value="' + i + '"' + (i === selected ? ' selected' : '') + '>' + (prefix || '') + i + '</option>';
    }
    return result;
  }
  function notify(text, isConnected) {
    connected = !!isConnected;
    if (lastStatus !== text || lastConnected !== connected) {
      lastStatus = text; lastConnected = connected;
      if (callbacks.onStatus) callbacks.onStatus(text, connected);
    }
    updateSessionPanel();
  }
  function goodStatus() {
    if (!current) return '本机记录';
    if (state && state.status === 'closed') return '课堂已结束';
    if (state && state.status === 'archived') return '课堂已封存';
    return current.role === 'teacher' ? '课堂 ' + current.code : '第' + current.group + '组 ' + current.member;
  }
  function candidateOrigin() {
    return /^https?:$/.test(location.protocol) && !/(^|\.)github\.io$/i.test(location.hostname);
  }
  function storageWrite() {
    try {
      if (current) localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      if (!storageNoticeShown && app()) {
        app().toast('浏览器无法保存课堂身份，请保持本页打开。');
        storageNoticeShown = true;
      }
    }
  }
  function storageRead() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || !/^[0-9]{6}$/.test(saved.code || '') || typeof saved.token !== 'string' || saved.token.length < 24 || saved.token.length > 256) return null;
      if (saved.role !== 'teacher' && saved.role !== 'student') return null;
      if (saved.role === 'student' && (!(saved.group >= 1 && saved.group <= 12) || !/^[A-H]$/.test(saved.member || ''))) return null;
      return { code: saved.code, role: saved.role, token: saved.token,
        group: saved.role === 'student' ? Number(saved.group) : null,
        member: saved.role === 'student' ? saved.member : null };
    } catch (error) { return null; }
  }
  function timedFetch(url, config, milliseconds) {
    return new Promise(function (resolve, reject) {
      var done = false, controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (controller) config.signal = controller.signal;
      var deadline = setTimeout(function () {
        if (done) return;
        done = true;
        if (controller) controller.abort();
        var error = new Error('课堂连接超时，请检查教师电脑和局域网。');
        error.network = true;
        reject(error);
      }, milliseconds || 8000);
      fetch(url, config).then(function (response) {
        if (done) return;
        done = true; clearTimeout(deadline); resolve(response);
      }, function () {
        if (done) return;
        done = true; clearTimeout(deadline);
        var error = new Error('课堂连接中断，记录尚未上传。请检查网络后重试。');
        error.network = true;
        reject(error);
      });
    });
  }
  function api(method, path, body, token, milliseconds) {
    if (!candidateOrigin()) return Promise.reject(new Error('请从教师电脑显示的局域网课堂网址打开本页。'));
    var config = { method: method, credentials: 'same-origin', cache: 'no-store', headers: {} };
    if (token) config.headers.Authorization = 'Bearer ' + token;
    if (body !== undefined) {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(body);
    }
    return timedFetch(path, config, milliseconds).then(function (response) {
      return response.text().then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (ignored) {
          var formatError = new Error('没有收到课堂服务的数据，请确认从局域网课堂网址打开页面。');
          formatError.status = response.status; formatError.network = true;
          throw formatError;
        }
        if (!response.ok) {
          var error = new Error(data.error && data.error.message || '课堂服务未完成此操作，请重试。');
          error.status = response.status;
          error.code = data.error && data.error.code;
          throw error;
        }
        return data;
      });
    });
  }
  function sameSession(captured) {
    return !!current && current.code === captured.code && current.token === captured.token;
  }
  function acceptState(next, captured) {
    if (!sameSession(captured)) throw new Error('课堂已切换，请在当前课堂重新操作。');
    if (!next || next.code !== current.code || !Array.isArray(next.members)) {
      var invalidState = new Error('课堂数据不完整，请重新连接。');
      invalidState.network = true; throw invalidState;
    }
    var changed = !state || Number(next.revision) > Number(state.revision);
    if (changed) {
      state = clone(next);
      if (callbacks.onState) callbacks.onState(clone(state));
    }
    notify(goodStatus(), true);
    return state ? clone(state) : null;
  }
  function handleConnectionError(error, captured) {
    if (!sameSession(captured)) return;
    if (error.network) notify('课堂连接中断', false);
    else if (error.status === 401) notify('课堂身份已失效', false);
    else if (error.status === 404 && error.code === 'ROOM_NOT_FOUND') notify('课堂服务已重启', false);
    else if (error.status === 403 && (error.code === 'BAD_HOST' || error.code === 'CROSS_ORIGIN' || error.code === 'BAD_ORIGIN')) notify('请使用课堂网址', false);
    else if (!state) notify('等待课堂连接', false);
  }
  function requestState(method, suffix, body) {
    if (!current) return Promise.reject(new Error('当前未加入局域网课堂。'));
    var captured = clone(current);
    return api(method, '/api/rooms/' + captured.code + (suffix || ''), body, captured.token).then(function (data) {
      return acceptState(data.state, captured);
    }).catch(function (error) {
      handleConnectionError(error, captured);
      throw error;
    });
  }
  function synchronize() {
    if (!current) return Promise.resolve(null);
    if (pendingSync) return pendingSync;
    var attempt = requestState('GET', '');
    pendingSync = attempt.then(function (value) { pendingSync = null; return value; }, function (error) { pendingSync = null; throw error; });
    return pendingSync;
  }
  function beginPolling() {
    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      if (current && !document.hidden) synchronize().catch(function () {});
    }, 2000);
  }
  function probe() {
    if (!candidateOrigin() || typeof fetch !== 'function') {
      serviceAvailable = false; return Promise.resolve(false);
    }
    if (probePromise) return probePromise;
    probePromise = api('GET', '/api/health', undefined, null, 3000).then(function (data) {
      serviceAvailable = !!(data.ok && data.service === 'lung-classroom');
      probePromise = null; return serviceAvailable;
    }, function () { serviceAvailable = false; probePromise = null; return false; });
    return probePromise;
  }
  function adopt(nextSession, nextState) {
    current = nextSession; state = null; photoCache = {}; pendingSync = null;
    storageWrite(); acceptState(nextState, clone(current)); beginPolling();
  }
  function button(id, handler, pendingText) {
    var target = el(id);
    if (!target) return;
    target.addEventListener('click', function () {
      if (target.disabled) return;
      var previous = target.textContent;
      target.disabled = true;
      if (pendingText) target.textContent = pendingText;
      var outcome;
      try { outcome = handler(); } catch (error) { outcome = Promise.reject(error); }
      Promise.resolve(outcome).then(function () {
        target.disabled = false; target.textContent = previous; updateSessionPanel();
      }, function (error) {
        target.disabled = false; target.textContent = previous; updateSessionPanel();
        if (el('room-error')) el('room-error').textContent = error.message || '操作没有完成，请重试。';
        else if (app()) app().toast(error.message || '操作没有完成，请重试。');
      });
    });
  }
  function showHelp() {
    app().showModal('连接局域网课堂',
      '<p>教师电脑启动课堂服务后，学生平板就能上传读数和照片。</p>' +
      '<ol><li>下载并解压课堂运行包。</li><li>在教师电脑启动“启动课堂”，保持窗口打开。</li><li>所有设备用浏览器打开窗口中的局域网地址，再输入同一个课堂码。</li></ol>' +
      '<p class="fine-print">教师电脑需要Python 3.8或更新版本。当前页面可以继续离线演示和记录。</p>' +
      '<div class="modal-actions"><a class="primary" href="' + escapeHtml(DOWNLOAD_URL) + '" download="肺活量局域网课堂_v1.0.zip">下载课堂运行包</a><button id="room-probe-again" class="secondary">重新检查</button></div>',
      function () { button('room-probe-again', openPanel, '正在检查'); });
  }
  function showRoleChoices() {
    app().showModal('局域网课堂',
      '<p>教师创建课堂，学生用相同课堂码加入自己的小组。</p>' +
      '<div class="role-choices"><button id="room-role-teacher" class="primary">我是教师</button><button id="room-role-student" class="secondary">我是学生</button></div>' +
      '<p class="fine-print" style="margin-top:20px">记录与照片保存在教师电脑，结束服务前请导出。</p>',
      function () {
        button('room-role-teacher', showCreate);
        button('room-role-student', function () { showJoin(''); });
      });
  }
  function showCreate() {
    app().showModal('创建教师课堂',
      '<div class="form-row"><div><label for="room-create-groups">小组数量</label><select id="room-create-groups">' + options(1, 12, 6) + '</select></div></div>' +
      '<p class="fine-print">每组可使用A–H八个匿名成员代号。</p><div id="room-error" class="key-error" role="status"></div>' +
      '<div class="modal-actions"><button id="room-create-back" class="secondary">返回</button><button id="room-create-submit" class="primary">创建课堂</button></div>',
      function () {
        button('room-create-back', showRoleChoices);
        button('room-create-submit', function () {
          return api('POST', '/api/rooms', { groups: Number(el('room-create-groups').value) }).then(function (data) {
            adopt({ code: data.code, role: 'teacher', token: data.teacherToken, group: null, member: null }, data.state);
            showSession();
          });
        }, '正在创建');
      }, 'narrow');
  }
  function showJoin(code) {
    var memberOptions = '';
    'ABCDEFGH'.split('').forEach(function (member) { memberOptions += '<option value="' + member + '">' + member + '</option>'; });
    app().showModal('加入学生课堂',
      '<div class="form-row"><div><label for="room-join-code">6位课堂码</label><input id="room-join-code" type="text" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" value="' + escapeHtml(code) + '" placeholder="输入课堂码"></div></div>' +
      '<div class="form-row"><div><label for="room-join-group">第几组</label><select id="room-join-group">' + options(1, 12, 1) + '</select></div><div><label for="room-join-member">成员代号</label><select id="room-join-member">' + memberOptions + '</select></div></div>' +
      '<p class="fine-print">选择自己的组和未被占用的代号，不需要填写姓名。</p><div id="room-error" class="key-error" role="status"></div>' +
      '<div class="modal-actions"><button id="room-join-back" class="secondary">返回</button><button id="room-join-submit" class="primary">加入课堂</button></div>',
      function () {
        el('room-join-code').addEventListener('input', function () { this.value = this.value.replace(/[^0-9]/g, '').slice(0, 6); });
        button('room-join-back', showRoleChoices);
        button('room-join-submit', function () {
          var requestedCode = el('room-join-code').value.trim();
          if (!/^[0-9]{6}$/.test(requestedCode)) throw new Error('请输入老师给出的6位课堂码。');
          var group = Number(el('room-join-group').value), member = el('room-join-member').value;
          return api('POST', '/api/rooms/' + requestedCode + '/join', { group: group, member: member }).then(function (data) {
            adopt({ code: requestedCode, role: 'student', token: data.studentToken, group: group, member: member }, data.state);
            app().closeModal(); app().toast('已加入第' + group + '组，成员' + member + '。');
          });
        }, '正在加入');
      }, 'narrow');
  }
  function shareUrl() { return location.origin + '/?join=' + current.code; }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { app().toast('课堂网址已复制。'); }, function () { copyFallback(text); });
    }
    copyFallback(text); return Promise.resolve();
  }
  function copyFallback(text) {
    var temporary = document.createElement('textarea');
    temporary.value = text;
    temporary.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(temporary);
    temporary.focus(); temporary.select();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (ignored) {}
    temporary.remove();
    app().toast(copied ? '课堂网址已复制。' : '请长按上方课堂网址，选中后复制。');
  }
  function exportRecords() {
    app().closeModal();
    var exportButton = el('records-export');
    if (exportButton) exportButton.click();
    else app().toast('请在“记录比较”页面点击“导出”。');
  }
  function updateSessionPanel() {
    var panel = el('room-session-panel');
    if (!panel || !current || panel.getAttribute('data-code') !== current.code) return;
    var statusText = !connected ? '连接暂时中断 · 身份已保留，正在重连' :
      !state ? '正在同步课堂' : state.status === 'closed' ? '课堂已结束 · 只读查看与导出' :
        state.status === 'archived' ? '课堂已封存 · 暂停上传' : '课堂进行中';
    var statusElement = el('room-live-status');
    if (statusElement) {
      statusElement.textContent = statusText;
      statusElement.className = connected ? 'status-line' : 'status-line connection-warning';
    }
    if (!state) return;
    if (el('room-group-count')) el('room-group-count').textContent = state.groups;
    if (el('room-member-count')) el('room-member-count').textContent = state.members.filter(function (record) { return record.joined; }).length + ' 位已加入 · ' + state.members.filter(function (record) { return record.completed; }).length + ' 人完成';
    if (el('room-minus-group')) el('room-minus-group').disabled = state.status === 'closed' || state.groups <= 1;
    if (el('room-plus-group')) el('room-plus-group').disabled = state.status === 'closed' || state.groups >= 12;
    if (el('room-pause')) {
      el('room-pause').textContent = state.status === 'archived' ? '继续课堂' : '封存课堂';
      el('room-pause').disabled = state.status === 'closed';
    }
    if (el('room-end')) el('room-end').disabled = state.status === 'closed';
  }
  function showSession() {
    if (!current) return showRoleChoices();
    var isTeacher = current.role === 'teacher';
    var loopback = /^(localhost|127\.0\.0\.1|\[?::1\]?)$/i.test(location.hostname);
    var body = '<div id="room-session-panel" data-code="' + current.code + '"><div class="room-code">' + current.code + '</div>' +
      '<p id="room-live-status" class="status-line"></p>';
    if (isTeacher) {
      body += '<p id="room-member-count" class="fine-print"></p><p class="join-url" id="room-join-url">' + escapeHtml(shareUrl()) + '</p>' +
        (loopback ? '<p class="fine-print">当前是本机地址。学生请使用启动窗口显示的局域网地址打开页面。</p>' : '') +
        '<div class="modal-actions" style="margin-top:12px"><button id="room-copy-link" class="small-button">复制课堂网址</button><button id="room-export" class="small-button">导出记录</button></div>' +
        '<div class="form-row" style="align-items:center;margin-top:22px"><div>小组数量：<strong id="room-group-count">' + (state ? state.groups : '—') + '</strong></div><button id="room-minus-group" class="small-button" aria-label="减少一组">－ 一组</button><button id="room-plus-group" class="small-button" aria-label="增加一组">＋ 一组</button></div>' +
        '<div class="modal-actions"><button id="room-pause" class="secondary">封存课堂</button><button id="room-end" class="secondary">结束课堂</button></div>';
    } else {
      body += '<h3>第' + current.group + '组 · 成员' + escapeHtml(current.member) + '</h3><p>回到“记录比较”，录入自己的三次测量。点击自己的成员代号可上传过程照片。</p>';
    }
    body += '<div id="room-error" class="key-error" role="status"></div><div class="modal-actions"><button id="room-leave" class="text-button">离开这间课堂</button><button id="room-done" class="primary">回到课堂</button></div></div>';
    app().showModal(isTeacher ? '教师课堂' : '我的课堂', body, function () {
      updateSessionPanel();
      button('room-done', function () { app().closeModal(); });
      button('room-copy-link', function () { return copyText(shareUrl()); });
      button('room-export', exportRecords);
      button('room-minus-group', function () { return setGroups(state.groups - 1); });
      button('room-plus-group', function () { return setGroups(state.groups + 1); });
      button('room-pause', function () {
        return requestState('PATCH', '', { status: state.status === 'archived' ? 'active' : 'archived' }).then(function () { showSession(); });
      }, '正在更新');
      button('room-end', showEndConfirmation);
      button('room-leave', showLeaveConfirmation);
    });
  }
  function showEndConfirmation() {
    app().showModal('结束这间课堂？',
      '<p>结束后保留只读查看和导出，学生不能继续上传，也不能重新开启这间课堂。</p><p>请先导出需要的记录和照片。关闭服务窗口后，课堂临时数据会清除。</p>' +
      '<div id="room-error" class="key-error" role="status"></div><div class="modal-actions"><button id="room-end-back" class="secondary">返回</button><button id="room-end-export" class="secondary">先导出</button><button id="room-end-confirm" class="primary">确认结束</button></div>',
      function () {
        button('room-end-back', showSession);
        button('room-end-export', exportRecords);
        button('room-end-confirm', function () { return requestState('PATCH', '', { status: 'closed' }).then(showSession); }, '正在结束');
      });
  }
  function showLeaveConfirmation() {
    var isTeacher = current && current.role === 'teacher';
    app().showModal('离开这间课堂？',
      '<p>' + (isTeacher ? '这台设备将移除教师身份。仅凭课堂码无法恢复管理权限，请先导出记录和照片。' : '这台设备将移除学生身份。下次需选择空闲成员代号，或请老师清空原成员后重新加入。') + '</p>' +
      '<p class="fine-print">离开只影响这台设备，服务器上的课堂不会因此结束。</p><div class="modal-actions"><button id="room-leave-back" class="secondary">返回</button>' +
      (isTeacher ? '<button id="room-leave-export" class="secondary">先导出</button>' : '') +
      '<button id="room-leave-confirm" class="primary">确认离开</button></div>',
      function () {
        button('room-leave-back', showSession);
        button('room-leave-export', exportRecords);
        button('room-leave-confirm', function () {
          current = null; state = null; photoCache = {}; pendingSync = null;
          if (timer) clearInterval(timer); timer = null;
          storageWrite(); notify('本机记录', false); app().closeModal();
          app().toast('已离开课堂，回到本机记录。');
        });
      });
  }
  function openPanel() {
    if (current) { showSession(); synchronize().catch(function () {}); return Promise.resolve(); }
    if (!candidateOrigin()) { showHelp(); return Promise.resolve(); }
    if (serviceAvailable) { showRoleChoices(); return Promise.resolve(); }
    app().showModal('局域网课堂', '<p id="room-panel-probe">正在检查本机课堂服务…</p>', null, 'narrow');
    return probe().then(function (available) {
      if (!el('room-panel-probe') || (el('modal-backdrop') && el('modal-backdrop').hidden)) return;
      if (available) showRoleChoices(); else showHelp();
    });
  }
  function checkMember(group, member) {
    if (typeof group !== 'number' || group % 1 || group < 1 || group > 12 || !/^[A-H]$/.test(member || '')) throw new Error('小组或成员代号不正确。');
    return '/' + group + '/' + member;
  }
  function saveRecord(group, member, patch) {
    try { return requestState('PATCH', '/records' + checkMember(group, member), patch); }
    catch (error) { return Promise.reject(error); }
  }
  function setGroups(count) {
    if (!current || current.role !== 'teacher') return Promise.reject(new Error('只有教师可以增减小组。'));
    if (typeof count !== 'number' || count % 1 || count < 1 || count > 12) return Promise.reject(new Error('小组数量应为1至12。'));
    return requestState('PATCH', '', { groups: count });
  }
  function uploadPhoto(group, member, dataUrl) {
    try {
      return requestState('POST', '/photos' + checkMember(group, member), { dataUrl: dataUrl }).then(function (result) {
        delete photoCache[group + '/' + member]; return result;
      });
    } catch (error) { return Promise.reject(error); }
  }
  function getPhoto(group, member) {
    if (!current) return Promise.reject(new Error('当前未加入局域网课堂。'));
    var suffix;
    try { suffix = checkMember(group, member); } catch (error) { return Promise.reject(error); }
    var record = state && state.members.filter(function (entry) { return entry.group === group && entry.member === member; })[0];
    if (!record || !record.photoVersion) return Promise.resolve(null);
    var key = group + '/' + member, cached = photoCache[key], captured = clone(current);
    if (cached && cached.version === record.photoVersion) return Promise.resolve(cached.dataUrl);
    var version = record.photoVersion;
    return timedFetch('/api/rooms/' + current.code + '/photos' + suffix, {
      method: 'GET', credentials: 'same-origin', cache: 'no-store', headers: { Authorization: 'Bearer ' + current.token }
    }, 10000).then(function (response) {
      if (!response.ok) {
        return response.text().then(function (text) {
          var data; try { data = JSON.parse(text); } catch (ignored) { data = {}; }
          var error = new Error(data.error && data.error.message || '照片读取失败，请重试。');
          error.status = response.status; error.code = data.error && data.error.code; throw error;
        });
      }
      var mime = (response.headers.get('Content-Type') || '').split(';')[0].trim();
      if (['image/jpeg', 'image/png', 'image/webp'].indexOf(mime) < 0) throw new Error('照片格式不正确。');
      return response.blob();
    }).then(function (blob) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
          if (!sameSession(captured)) { reject(new Error('课堂已切换，请重新打开照片。')); return; }
          photoCache[key] = { version: version, dataUrl: reader.result };
          resolve(reader.result);
        };
        reader.onerror = function () { reject(new Error('照片读取失败，请重新打开。')); };
        reader.readAsDataURL(blob);
      });
    }).catch(function (error) { handleConnectionError(error, captured); throw error; });
  }
  function deletePhoto(group, member) {
    try {
      return requestState('DELETE', '/photos' + checkMember(group, member)).then(function (result) {
        delete photoCache[group + '/' + member]; return result;
      });
    } catch (error) { return Promise.reject(error); }
  }
  function deleteRecord(group, member) {
    try {
      return requestState('DELETE', '/records' + checkMember(group, member)).then(function (result) {
        delete photoCache[group + '/' + member]; return result;
      });
    } catch (error) { return Promise.reject(error); }
  }
  function init(nextCallbacks) {
    callbacks = nextCallbacks || {};
    if (initialized) return;
    initialized = true; current = storageRead();
    if (current) {
      notify('正在恢复课堂', false); beginPolling();
      synchronize().catch(function () {});
    } else {
      notify('本机记录', false);
      var join = '';
      try { join = new URLSearchParams(location.search).get('join') || ''; } catch (ignored) {}
      probe().then(function (available) {
        if (/^[0-9]{6}$/.test(join) && !current) {
          if (available) showJoin(join); else showHelp();
        }
      });
    }
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && current) synchronize().catch(function () {});
    });
    global.addEventListener('online', function () {
      if (current) synchronize().catch(function () {});
    });
  }
  global.LungRoom = {
    init: init,
    openPanel: openPanel,
    session: function () { return current ? clone(current) : null; },
    online: function () { return !!current; },
    writable: function () { return !current || !!(state && state.status === 'active'); },
    teacher: function () { return !current || current.role === 'teacher'; },
    saveRecord: saveRecord,
    setGroups: setGroups,
    uploadPhoto: uploadPhoto,
    getPhoto: getPhoto,
    deletePhoto: deletePhoto,
    deleteRecord: deleteRecord
  };
}(window));
