#!/usr/bin/env node
// 维护课件隐藏兼容元数据，技术等级只在目录/设备检测页展示，不注入课内徽标。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = __dirname;
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'lesson-levels.js'), 'utf8'), context);
const levels = context.window.AIHTML_LEVELS;
const start = '<!-- AIHTML-COMPAT-GRADE:START -->';
const end = '<!-- AIHTML-COMPAT-GRADE:END -->';
let changed = 0, checked = 0;
for (const dir of Object.keys(levels)) {
  const meta = levels[dir];
  const entries = [path.join(root, dir, 'index.html')];
  const server = path.join(root, dir, 'server', 'index.html');
  if (fs.existsSync(server)) entries.push(server);
  for (const target of entries) {
    if (!fs.existsSync(target)) throw new Error('找不到课程入口：' + target);
    const original = fs.readFileSync(target, 'utf8');
    let html = original;
    checked++;
    while (html.includes(start)) {
      const a = html.indexOf(start), b = html.indexOf(end, a);
      if (b < 0) throw new Error('等级标记不完整：' + target);
      html = html.slice(0, a) + html.slice(b + end.length);
    }
    const hidden = '<meta name="aihtml-compat-level" content="' + meta.level + '">';
    const existing = /<meta\b(?=[^>]*\bname\s*=\s*["']aihtml-compat-level["'])[^>]*>/i;
    if (existing.test(html)) html = html.replace(existing, hidden);
    else {
      const closing = html.toLowerCase().indexOf('</head>');
      if (closing < 0) throw new Error('HTML 缺少 </head>：' + target);
      html = html.slice(0, closing) + hidden + '\n' + html.slice(closing);
    }
    if (html !== original) { fs.writeFileSync(target, html, 'utf8'); changed++; }
  }
}
console.log('兼容元数据维护完成：检查 ' + checked + ' 页，修改 ' + changed + ' 页；课内不显示技术等级。');
