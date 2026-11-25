(function () {
  'use strict';
  var list = document.getElementById('teacher-community-list');
  var status = document.getElementById('teacher-community-status');
  var menu = document.getElementById('teacher-community-menu');
  var close = document.getElementById('teacher-community-close');
  if (!list || !status || !menu) return;
  var trigger = menu.querySelector('summary');
  function hide(restoreFocus) {
    menu.open = false;
    if (restoreFocus && trigger) trigger.focus();
  }
  if (close) close.addEventListener('click', function () { hide(true); });
  document.addEventListener('click', function (event) {
    if (menu.open && !menu.contains(event.target)) hide(false);
  });
  document.addEventListener('keydown', function (event) {
    if (menu.open && event.key === 'Escape') { event.preventDefault(); hide(true); }
  });
  if (!window.fetch) return;
  var base = 'https://aihtml-community.mutiwangn.workers.dev';
  var idPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
  var busy = false;
  function refresh() {
    if (busy || !menu.open) return;
    busy = true;
    fetch(base + '/api/catalog', {cache:'no-store',credentials:'omit'})
      .then(function (r) { if (!r.ok) throw new Error('catalog'); return r.json(); })
      .then(function (d) {
        if (!Array.isArray(d.items)) throw new Error('catalog');
        var records = d.items.filter(function (x) { return x && idPattern.test(x.id) && typeof x.title === 'string' && typeof x.author === 'string' && typeof x.tier === 'string' && typeof x.license === 'string'; });
        var fragment = document.createDocumentFragment();
        records.slice(0, 8).forEach(function (x) {
          var card = document.createElement('li');
          var link = document.createElement('a');
          var info = document.createElement('span');
          link.href = base + '/play/' + x.id;
          link.textContent = x.title;
          info.textContent = x.author + ' · ' + x.tier + ' · ' + x.license;
          card.appendChild(link);
          card.appendChild(info);
          fragment.appendChild(card);
        });
        list.textContent = '';
        list.appendChild(fragment);
        status.textContent = records.length ? '' : '还没有公开投稿。';
        busy = false;
      }).catch(function () {
        list.textContent = '';
        status.textContent = '暂时未能加载，可点击「查看全部」。';
        busy = false;
      });
  }
  menu.addEventListener('toggle', refresh);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  window.addEventListener('pageshow', function (event) { if (event.persisted) refresh(); });
}());
