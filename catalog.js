/* 静态课件目录：保持 ES5 语法，供教室中的旧版浏览器使用。 */
(function (window, document) {
  'use strict';

  function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character];
    });
  }
  function each(nodes, callback) {
    Array.prototype.forEach.call(nodes, callback);
  }
  function focusWithoutScroll(element) {
    if (!element) return;
    try { element.focus({preventScroll: true}); } catch (ignore) { element.focus(); }
  }
  function findAttribute(element, attribute) {
    while (element && element !== document) {
      if (element.hasAttribute && element.hasAttribute(attribute)) return element;
      element = element.parentNode;
    }
    return null;
  }

  window.AIHTMLCatalog = {
    init: function (bookResources) {
      var curriculum = window.AIHTML_CURRICULUM || {books: []};
      var structures = {};
      each(curriculum.books || [], function (book) { structures[book.id] = book; });
      var books = [];
      var bookById = {};
      each(bookResources, function (book) {
        var compiled = {
          id: book.id,
          title: book.title,
          cover: book.cover,
          lessons: book.lessons || [],
          units: structures[book.id] ? structures[book.id].units : []
        };
        books.push(compiled);
        bookById[compiled.id] = compiled;
      });

      var library = document.getElementById('library-view');
      var grid = document.getElementById('books');
      var focusView = document.getElementById('focus-view');
      var focusLayout = document.getElementById('focus-layout');
      var directory = document.getElementById('directory-scroll');
      var directoryTitle = document.getElementById('directory-title');
      var closeLink = document.getElementById('close-focus');
      var previousButton = document.getElementById('focus-prev');
      var nextButton = document.getElementById('focus-next');
      var touchOrigin = null;
      var status = document.getElementById('catalog-status');
      var semesterButtons = document.querySelectorAll('.semester-button');
      var semesterKey = 'aihtml-catalog-semester-v1';
      var semester = 'up';
      var renderedSemester = null;
      var activeBook = null;
      var lastOpeners = {};
      var shelfScroll = 0;
      var currentUnit = null;
      var supportsDetails = 'open' in document.createElement('details');

      try {
        var savedSemester = localStorage.getItem(semesterKey);
        if (savedSemester === 'up' || savedSemester === 'down') semester = savedSemester;
      } catch (ignore) {}

      var levels = window.AIHTML_LEVELS || {};
      var levelNames = window.AIHTML_LEVEL_NAMES || {1:'基础交互', 2:'二维绘图', 3:'轻量三维', 4:'进阶三维'};
      var deviceGrade = null;
      try {
        deviceGrade = JSON.parse(localStorage.getItem('aihtml-compat-v1') || 'null');
        if (deviceGrade && Date.now() - deviceGrade.ts > 7 * 86400000) deviceGrade = null;
      } catch (ignore) { deviceGrade = null; }
      if (deviceGrade && typeof deviceGrade.level === 'number') {
        document.getElementById('device-grade-caption').textContent = '已检测：本机 T' + deviceGrade.level;
      }

      var chevron = '<svg class="chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var arrow = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var folder = '<svg class="folder-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" fill="currentColor" fill-opacity=".15" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

      function resourceGrade(resource) {
        var key = resource[4].replace(/^\.\//, '').replace(/\/$/, '');
        var requirement = levels[key] || {level: 1, note: '基础交互'};
        var value = Math.max(1, Math.min(4, Number(requirement.level) || 1));
        var chips = '<span class="lesson-grade grade-t' + value + '" title="最低技术需求：T' + value + ' ' + escapeHTML(levelNames[value]) + '">T' + value + ' · ' + escapeHTML(levelNames[value]) + '</span>';
        if (requirement.camera) chips += '<span class="lesson-feature">需摄像头 · HTTPS</span>';
        if (requirement.highLoad) chips += '<span class="lesson-feature">较高设备负载</span>';
        if (deviceGrade && typeof deviceGrade.level === 'number') {
          var pendingCamera = !!requirement.camera && !!deviceGrade.camera && deviceGrade.cameraState !== '已授权并读取';
          var match = deviceGrade.level >= value && (!requirement.camera || deviceGrade.camera) && !pendingCamera;
          chips += '<span class="lesson-match ' + (match ? 'is-ok' : 'is-limited') + '">' + (pendingCamera ? '摄像头仍需授权实测' : match ? '本机技术条件基本符合' : '本机需验证或不满足') + '</span>';
        }
        return chips;
      }

      function resourcesFor(book, code) {
        return book.lessons.filter(function (lesson) { return lesson[0] === code; });
      }

      function shelfHTML(book) {
        var bookHref = '#book-' + book.id;
        var count = book.lessons.length;
        return '<article class="book-entry" data-book="' + book.id + '">' +
          '<a class="book-cover-link" id="cover-link-' + book.id + '" data-book-link href="' + bookHref + '" aria-label="展开' + escapeHTML(book.title) + '的单元与课时">' +
            '<img src="' + escapeHTML(book.cover) + '" alt="' + escapeHTML(book.title) + '《科学》教材封面" width="520" height="735" decoding="async">' +
          '</a>' +
          '<div class="book-heading"><h2><a id="grade-link-' + book.id + '" data-book-link href="' + bookHref + '">' + escapeHTML(book.title.replace(/[上下]册$/, '')) + '</a></h2>' +
            (count ? '<span class="book-resource-count">' + count + ' 份课件</span>' : '') + '</div>' +
          '<ol class="book-units" aria-label="' + escapeHTML(book.title) + '的单元">' +
            book.units.map(function (unit) {
              return '<li><a class="book-unit-link" id="unit-link-' + book.id + '-' + unit.number + '" data-book-link href="' + bookHref + '/unit-' + unit.number + '" aria-label="展开' + escapeHTML(book.title) + '第' + unit.number + '单元' + escapeHTML(unit.title) + '">' +
                '<span class="book-unit-number" aria-hidden="true">0' + unit.number + '</span><span class="book-unit-title">' + escapeHTML(unit.title) + '</span>' + chevron + '</a></li>';
            }).join('') +
          '</ol></article>';
      }

      function setSemester(value) {
        semester = value === 'down' ? 'down' : 'up';
        each(semesterButtons, function (button) {
          button.setAttribute('aria-pressed', String(button.getAttribute('data-semester') === semester));
        });
        document.body.setAttribute('data-semester', semester);
        library.setAttribute('aria-label', (semester === 'up' ? '秋季学期上册' : '春季学期下册') + '教材目录');
        try { localStorage.setItem(semesterKey, semester); } catch (ignore) {}
        if (renderedSemester !== semester) {
          grid.innerHTML = books.filter(function (book) {
            return book.id.split('-')[1] === semester;
          }).map(shelfHTML).join('');
          renderedSemester = semester;
        }
      }

      function resourceHTML(book, resource) {
        var author = (resource[2] || '').replace(/^【|】$/g, '').trim();
        return '<article class="resource-card"><div class="resource-content">' +
          '<div class="resource-top"><h5>' + escapeHTML(resource[1]) + '</h5>' +
            (author ? '<span class="resource-author">' + escapeHTML(author) + '</span>' : '') + '</div>' +
          '<p class="resource-description">' + escapeHTML(resource[3]) + '</p>' +
          '<div class="resource-bottom"><div class="resource-tech">' + resourceGrade(resource) + '</div>' +
            '<a class="lesson-open" href="' + escapeHTML(resource[4]) + '" aria-label="进入' + escapeHTML(book.title) + resource[0] + '《' + escapeHTML(resource[1]) + '》' + (author ? '，' + escapeHTML(author) : '') + '的交互课件">进入课件' + arrow + '</a></div>' +
          '</div>' + (window.AIHTMLFeedback ? window.AIHTMLFeedback.render(resource[4]) : '') + '</article>';
      }

      function unitHTML(book, unit, initialUnit) {
        var unitOpen = unit.number === initialUnit;
        var unitId = 'directory-' + book.id + '-unit-' + unit.number;
        return '<details class="unit-node" data-unit="' + unit.number + '"' + (unitOpen ? ' open' : '') + '>' +
          '<summary class="unit-summary" aria-expanded="' + unitOpen + '" aria-controls="' + unitId + '">' + chevron + folder +
            '<h3><span class="unit-number">0' + unit.number + '</span>' + escapeHTML(unit.title) + '</h3><span class="unit-lesson-count">' + unit.lessons.length + ' 课</span>' +
          '</summary>' +
          '<div class="unit-lessons" id="' + unitId + '">' +
            unit.lessons.map(function (lesson) {
              var resources = resourcesFor(book, lesson.code);
              var lessonId = 'resources-' + book.id + '-' + lesson.code.replace('.', '-');
              return '<details class="lesson-node' + (resources.length ? ' has-resources' : '') + '" data-lesson="' + escapeHTML(lesson.code) + '">' +
                '<summary class="lesson-summary" aria-expanded="false" aria-controls="' + lessonId + '">' +
                  '<span class="lesson-code">' + escapeHTML(lesson.code) + '</span><h4>' + escapeHTML(lesson.title) + '</h4>' +
                  (resources.length ? '<span class="resource-count" aria-label="' + resources.length + '份交互课件">' + resources.length + ' 份</span>' : '') + chevron +
                '</summary>' +
                '<div class="lesson-resources" id="' + lessonId + '">' +
                  (resources.length ? resources.map(function (resource) { return resourceHTML(book, resource); }).join('') : '<p class="empty-lesson">这一课的交互课件待补充。</p>') +
                '</div></details>';
            }).join('') +
          '</div></details>';
      }

      function changeDisclosure(node, open) {
        if (open) node.setAttribute('open', '');
        else {
          node.removeAttribute('open');
          /* 收起上一级时清除子级选择，下次展开仍从课时列表开始。 */
          each(node.querySelectorAll('details[open]'), function (child) {
            child.removeAttribute('open');
            child.querySelector('summary').setAttribute('aria-expanded', 'false');
          });
        }
        node.querySelector('summary').setAttribute('aria-expanded', String(open));
      }

      function bindDisclosures() {
        each(directory.querySelectorAll('details'), function (node) {
          var summary = node.querySelector('summary');
          function synchronize() {
            var isOpen = node.hasAttribute('open');
            summary.setAttribute('aria-expanded', String(isOpen));
            if (!isOpen) {
              changeDisclosure(node, false);
              return;
            }
            /* 每一层只聚焦一个展开项；同一课的多个作品始终同时保留。 */
            each(node.parentNode.children, function (sibling) {
              if (sibling !== node && sibling.tagName === 'DETAILS') changeDisclosure(sibling, false);
            });
          }
          node.addEventListener('toggle', synchronize);
          if (!supportsDetails) {
            summary.setAttribute('role', 'button');
            summary.setAttribute('tabindex', '0');
            summary.addEventListener('click', function (event) {
              event.preventDefault();
              changeDisclosure(node, !node.hasAttribute('open'));
              synchronize();
            });
            summary.addEventListener('keydown', function (event) {
              if (event.key === ' ' || event.key === 'Enter' || event.keyCode === 32 || event.keyCode === 13) {
                event.preventDefault();
                summary.click();
              }
            });
          }
        });
      }

      function renderFocus(book, requestedUnit) {
        /* 只有显式点击单元入口才展开单元，绝不替使用者选择课时。 */
        var initialUnit = null;
        var totalLessons = 0;
        var selectedUnit = null;
        each(book.units, function (unit) {
          totalLessons += unit.lessons.length;
          if (Number(requestedUnit) === unit.number) selectedUnit = unit;
        });
        if (selectedUnit) initialUnit = selectedUnit.number;
        directoryTitle.textContent = book.title;
        document.getElementById('directory-meta').textContent = book.units.length + ' 个单元 · ' + totalLessons + ' 个课时 · ' + book.lessons.length + ' 份课件';
        document.getElementById('focused-book').innerHTML =
          '<div class="focused-cover"><img src="' + escapeHTML(book.cover) + '" alt="' + escapeHTML(book.title) + '《科学》教材封面" width="520" height="735"></div>' +
          '<div class="focused-book-label"><h3>' + escapeHTML(book.title.replace(/[上下]册$/, '')) + '</h3><p>' + (semester === 'up' ? '秋季学期 · 上册' : '春季学期 · 下册') + '</p></div>';
        closeLink.setAttribute('href', '#books-' + semester);
        directory.innerHTML = book.units.map(function (unit) {
          return unitHTML(book, unit, initialUnit);
        }).join('');
        bindDisclosures();
        if (window.AIHTMLFeedback) window.AIHTMLFeedback.mount(directory);
        directory.scrollTop = 0;
        if (requestedUnit && selectedUnit) {
          var unitNode = directory.querySelector('[data-unit="' + selectedUnit.number + '"]');
          if (unitNode) directory.scrollTop = unitNode.getBoundingClientRect().top - directory.getBoundingClientRect().top - 10;
        }
      }

      /* 左右换书仅改变年级，学期保持不变，目录恢复为未展开状态。 */
      function changeFocusedBook(step) {
        if (!activeBook || (step !== -1 && step !== 1)) return;
        var grade = parseInt(activeBook.id, 10);
        var target = bookById[(grade + step) + '-' + semester];
        if (target) window.location.hash = '#book-' + target.id;
      }

      function updateBookNavigation(book) {
        var grade = parseInt(book.id, 10);
        var before = bookById[(grade - 1) + '-' + semester];
        var after = bookById[(grade + 1) + '-' + semester];
        previousButton.disabled = !before;
        nextButton.disabled = !after;
        previousButton.setAttribute('aria-label', before ? '上一册：' + before.title : '已到一年级');
        nextButton.setAttribute('aria-label', after ? '下一册：' + after.title : '已到六年级');
        previousButton.title = before ? before.title : '已到第一册';
        nextButton.title = after ? after.title : '已到最后一册';
      }

      function animateBookChange(fromBook, toBook) {
        var direction = parseInt(toBook.id, 10) > parseInt(fromBook.id, 10) ? 'next' : 'prev';
        focusLayout.className = focusLayout.className.replace(' is-switching', '');
        focusLayout.setAttribute('data-slide', direction);
        /* 同方向连续切换时，强制从第一帧重新播放。 */
        focusLayout.offsetWidth;
        focusLayout.className += ' is-switching';
      }

      function measureChrome() {
        var root = document.documentElement;
        root.style.setProperty('--header-size', document.querySelector('.site-header').offsetHeight + 'px');
        root.style.setProperty('--footer-size', document.querySelector('.site-footer').offsetHeight + 'px');
      }

      function setBackgroundInactive(inactive) {
        /* inert 有原生支持时拦截触摸与焦点；旧浏览器同步移除背景链接的 Tab 入口。 */
        library.inert = inactive;
        if (inactive) library.setAttribute('aria-hidden', 'true');
        else library.removeAttribute('aria-hidden');
        each(library.querySelectorAll('a'), function (link) {
          if (inactive) link.setAttribute('tabindex', '-1');
          else link.removeAttribute('tabindex');
        });
      }

      function render() {
        var match = /^#book-([1-6]-(up|down))(?:\/unit-([1-9]\d*))?$/.exec(window.location.hash);
        var shelf = /^#books-(up|down)$/.exec(window.location.hash);
        var book = match && bookById[match[1]];
        var previousBook = activeBook;
        var previousSemester = semester;
        var requestedUnit = match ? match[3] : null;
        setSemester(book ? match[2] : shelf ? shelf[1] : semester);
        if (!book && !shelf) {
          try { window.history.replaceState(null, '', '#books-' + semester); } catch (ignore) {}
        }

        if (book) {
          if (!previousBook) shelfScroll = window.pageYOffset || 0;
          document.body.setAttribute('data-view', 'focus');
          focusView.hidden = false;
          measureChrome();
          if (!previousBook || previousBook.id !== book.id || currentUnit !== requestedUnit) {
            renderFocus(book, requestedUnit);
          }
          updateBookNavigation(book);
          if (previousBook && previousBook.id !== book.id) animateBookChange(previousBook, book);
          else if (!previousBook) {
            focusLayout.className = focusLayout.className.replace(' is-switching', '');
            focusLayout.removeAttribute('data-slide');
          }
          activeBook = book;
          currentUnit = requestedUnit;
          focusWithoutScroll(directoryTitle);
          setBackgroundInactive(true);
          status.textContent = book.title + '，已打开教材目录。可使用左右切换按钮或左右滑动查看其他年级。';
          document.title = book.title + ' · 教科版-小学科学-交互课件';
        } else {
          setBackgroundInactive(false);
          focusView.hidden = true;
          document.body.setAttribute('data-view', 'library');
          activeBook = null;
          currentUnit = null;
          measureChrome();
          if (previousBook) {
            var openerId = lastOpeners[previousBook.id];
            var opener = openerId && document.getElementById(openerId);
            if (!opener && previousSemester === semester) opener = document.getElementById('cover-link-' + previousBook.id);
            if (!opener || previousSemester !== semester) opener = document.getElementById('semester-' + semester);
            focusWithoutScroll(opener);
            window.scrollTo(0, previousSemester === semester ? shelfScroll : 0);
          } else if (previousSemester !== semester) {
            window.scrollTo(0, 0);
          }
          status.textContent = (semester === 'up' ? '秋季学期，上册' : '春季学期，下册') + '，六个年级的教材与单元目录。';
          document.title = (semester === 'up' ? '秋季学期（上册）' : '春季学期（下册）') + ' · 教科版-小学科学-交互课件';
        }
      }

      function returnToShelf() {
        window.location.hash = '#books-' + semester;
      }
      each(semesterButtons, function (button) {
        button.addEventListener('click', function () {
          var target = '#books-' + button.getAttribute('data-semester');
          if (window.location.hash === target) render();
          else window.location.hash = target;
        });
      });
      library.addEventListener('click', function (event) {
        var opener = findAttribute(event.target, 'data-book-link');
        var bookEntry = opener && findAttribute(opener, 'data-book');
        if (opener && bookEntry) lastOpeners[bookEntry.getAttribute('data-book')] = opener.id;
      });
      focusView.addEventListener('click', function (event) {
        if (findAttribute(event.target, 'data-close-focus') || event.target === focusView || event.target === focusLayout) returnToShelf();
      });
      previousButton.addEventListener('click', function () { changeFocusedBook(-1); });
      nextButton.addEventListener('click', function () { changeFocusedBook(1); });

      /* 手指横向划动：距离阈值 + 方向判定，避免目录纵向滚动误触。 */
      focusView.addEventListener('touchstart', function (event) {
        if (!activeBook || !event.touches || event.touches.length !== 1 ||
            findAttribute(event.target, 'data-swipe-block')) {
          touchOrigin = null;
          return;
        }
        touchOrigin = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
          at: Date.now()
        };
      }, false);
      focusView.addEventListener('touchend', function (event) {
        if (!touchOrigin || !activeBook || !event.changedTouches || !event.changedTouches.length) return;
        var start = touchOrigin;
        touchOrigin = null;
        var dx = event.changedTouches[0].clientX - start.x;
        var dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) >= 76 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - start.at < 1200) {
          changeFocusedBook(dx < 0 ? 1 : -1);
        }
      }, false);
      focusView.addEventListener('touchcancel', function () { touchOrigin = null; }, false);
      document.addEventListener('keydown', function (event) {
        if (activeBook && !event.defaultPrevented && (event.key === 'Escape' || event.keyCode === 27)) {
          event.preventDefault();
          returnToShelf();
        }
      });
      window.addEventListener('hashchange', render);
      window.addEventListener('resize', measureChrome);
      window.addEventListener('pageshow', measureChrome);
      render();
      /* 标题字体完成加载后重新测量，避免窄屏换行改变顶栏高度。 */
      if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
        document.fonts.ready.then(measureChrome);
      }
    }
  };
})(window, document);



