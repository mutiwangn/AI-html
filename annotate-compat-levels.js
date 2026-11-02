#!/usr/bin/env node
// 批量为课程入口页添加轻量、无依赖的技术等级标记；不修改课件脚本或教材内容。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = __dirname;
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'lesson-levels.js'), 'utf8'), context);
const levels = context.window.AIHTML_LEVELS;
const names = context.window.AIHTML_LEVEL_NAMES;
const start = '<!-- AIHTML-COMPAT-GRADE:START -->';
const end = '<!-- AIHTML-COMPAT-GRADE:END -->';
let changed = 0;
let checked = 0;
for (const dir of Object.keys(levels)) {
  const meta = levels[dir];
  const entries = [path.join(root, dir, 'index.html')];
  if (fs.existsSync(path.join(root, dir, 'server', 'index.html'))) {
    entries.push(path.join(root, dir, 'server', 'index.html'));
  }
  for (const target of entries) {
    if (!fs.existsSync(target)) throw new Error('找不到课程入口：' + target);
    let html = fs.readFileSync(target, 'utf8');
    checked++;
    const title = 'T' + meta.level + ' · ' + names[meta.level];
    const extra = meta.camera ? ' · 摄像头' : '';
    const label = title + extra;
    const snippet = '\n' + start + '\n' +
      '<div aria-label="本课技术需求：' + label + '" title="本课最低技术需求：' + label + '" ' +
      'style="position:fixed;left:8px;bottom:7px;z-index:8;pointer-events:none;max-width:calc(100% - 16px);' +
      'padding:3px 8px;border:1px solid rgba(255,255,255,.36);border-radius:6px;' +
      'background:rgba(17,59,46,.76);color:#fff;font:700 11px/1.4 Arial,\'Microsoft YaHei\',sans-serif;' +
      'letter-spacing:.1px;box-shadow:0 1px 5px rgba(0,0,0,.12)">' + label + '</div>\n' + end + '\n';
    const markerStart = html.indexOf(start);
    if (markerStart >= 0) {
      const markerEnd = html.indexOf(end, markerStart);
      if (markerEnd < 0) throw new Error('等级标记不完整：' + target);
      const blockStart = markerStart > 0 && html.charAt(markerStart - 1) === '\n' ? markerStart - 1 : markerStart;
      const endAfter = markerEnd + end.length;
      const blockEnd = html.charAt(endAfter) === '\n' ? endAfter + 1 : endAfter;
      html = html.slice(0, blockStart) + html.slice(blockEnd);
    }
    const closing = html.toLowerCase().lastIndexOf('</body>');
    if (closing < 0) throw new Error('HTML 缺少 </body>：' + target);
    const updated = html.slice(0, closing) + snippet + html.slice(closing);
    if (updated !== fs.readFileSync(target, 'utf8')) {
      fs.writeFileSync(target, updated, 'utf8');
      changed++;
    }
  }
}
console.log('技术等级标注完成：检查 ' + checked + ' 页，修改 ' + changed + ' 页。');
