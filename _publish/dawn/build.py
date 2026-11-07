"""One-shot build: preserve the verified v2.2 app and recompress its embedded Earth texture."""
from pathlib import Path
from importlib.metadata import distribution
import base64
import hashlib
import io
import json
import lzma
import os
import re
import subprocess
import tempfile
from PIL import Image

ROOT = Path.cwd()
STAGE = ROOT / '_publish' / 'dawn'
EXPECTED_TEMPLATE = '23dc69e22aca385ee4f54680e26697b71a9f4f23a8606d98507ed3ae6bb270ec'
EXPECTED_SOURCE = '10f5389b365d7ece89f68a73ce5653fb5692145fde181fc64596d0d87cb89bb8'
encoded = ''.join((STAGE / ('part%d.txt' % i)).read_text().strip() for i in range(4))
template_bytes = lzma.decompress(base64.b64decode(encoded, validate=True))
assert hashlib.sha256(template_bytes).hexdigest() == EXPECTED_TEMPLATE, 'Template transport checksum mismatch'
template = template_bytes.decode('utf-8')
assert template.count('__EARTH__') == 1

dist = distribution('basemap-data')
source_path = next(dist.locate_file(p) for p in dist.files if str(p).endswith('basemap_data/bmng.jpg'))
source = Path(source_path).read_bytes()
assert hashlib.sha256(source).hexdigest() == EXPECTED_SOURCE, 'Earth source checksum mismatch'
image = Image.open(io.BytesIO(source)).convert('RGB').resize((4096, 2048), Image.Resampling.LANCZOS)
texture = io.BytesIO()
image.save(texture, 'JPEG', quality=65, optimize=True, progressive=False)
html = template.replace('__EARTH__', 'data:image/jpeg;base64,' + base64.b64encode(texture.getvalue()).decode('ascii'))
output = html.encode('utf-8')
assert len(output) < 1000000, 'HTML exceeds the decimal 1 MB budget'
assert '__EARTH__' not in html
assert not re.search(r'<script[^>]+src\s*=|<link[^>]+rel=[\"\']stylesheet', html, re.I), 'External runtime dependency found'
for script in re.findall(r'<script\b[^>]*>(.*?)</script\s*>', html, re.S | re.I):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', encoding='utf-8') as f:
        f.write(script)
        f.flush()
        subprocess.run(['node', '--check', f.name], check=True)

lesson_dir = ROOT / '六上3.4谁先迎来黎明'
lesson_dir.mkdir(exist_ok=True)
(lesson_dir / 'index.html').write_bytes(output)

# Modify only the existing lesson array; preserve unrelated current catalog updates.
index_path = ROOT / 'index.html'
index = index_path.read_text(encoding='utf-8')
match = re.search(r'var\s+books\s*=\s*', index)
assert match, 'Catalog books array not found'
books, consumed = json.JSONDecoder().raw_decode(index[match.end():])
book = next(b for b in books if b.get('id') == '6-up')
row = ['3.4', '谁先迎来黎明', '', '三页探究：4K地球仪定位，手拉手、大蒜、汽车与转椅多视角模拟，24小时昼夜记录，以及两地小学真实历史作息差值对照；单文件离线小于1 MB。', './六上3.4谁先迎来黎明/']
old = next((i for i, item in enumerate(book['lessons']) if item[-1] == row[-1]), None)
if old is None:
    book['lessons'].append(row)
else:
    book['lessons'][old] = row
book['lessons'].sort(key=lambda item: tuple(int(v) for v in item[0].split('.')))
index = index[:match.end()] + json.dumps(books, ensure_ascii=False, separators=(',', ':')) + index[match.end() + consumed:]
index = re.sub(r'lesson-levels\.js\?v=[^\"\']+', 'lesson-levels.js?v=dawn-lite-20261107-v1', index)
index_path.write_text(index, encoding='utf-8')
levels_path = ROOT / 'lesson-levels.js'
levels = levels_path.read_text(encoding='utf-8')
key = '六上3.4谁先迎来黎明'
assert key not in levels, 'Inspect existing compatibility entry before replacing'
anchor = 'root.AIHTML_LEVELS = {'
assert anchor in levels
entry = "\n    '六上3.4谁先迎来黎明': { level: 2, note: 'Canvas兼容渲染、可选WebGL；4K地球、多视角实验、昼夜记录与作息差值；单文件离线，小于1 MB，无外部运行依赖' },"
levels_path.write_text(levels.replace(anchor, anchor + entry, 1), encoding='utf-8')
subprocess.run(['node', '--check', str(levels_path)], check=True)

sha = hashlib.sha256(output).hexdigest()
readme = f'''# 谁先迎来黎明 · v2.2 轻量版

六年级上册第三单元第4课。单文件 `index.html`，可直接离线打开，无外部运行依赖。

## 文件与画质

- HTML实际大小：{len(output):,} 字节，小于1,000,000字节。
- 地球贴图：4096×2048 JPEG，质量65优化编码。保留4K分辨率，采用有损压缩，不以外链素材规避体积要求。
- SHA-256：`{sha}`。
- 保留原v2.2的全部HTML/CSS/JavaScript教学交互；只替换贴图编码并更新版本标识。

## 三页功能

1. 观察：可缩放地球仪、北京与乌鲁木齐标记及经纬度，不显示昼夜半球。
2. 探究：手拉手、大蒜、汽车、转椅；默认第三视角，第二视角支持缩放；大蒜无人物。
3. 昼夜：北京时间24小时模拟，日出日落自动记录与CSV导出；点击才打开作息表，比较后显示+01:50等差值。

## 科学与资料边界

模拟采用太阳直射赤道、均时差为零的理想春秋分条件，日出日落以太阳中心经过理想地平线定义，不是任何实际日期的预报。北京星火小学与乌鲁木齐市第53小学的作息均是2021年秋季公开历史资料，不代表2026年现行安排；北京保留原公告教学区间，不编造逐节课时。

## 来源

- 地球影像：NASA Blue Marble Next Generation，经Matplotlib Basemap Data 2.0.0提供的bmng.jpg。
- https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/
- 北京星火小学：https://www.xschu.com/xiaoshengchu/31/43009.html
- 北京公开报道：https://bj.people.com.cn/n2/2021/0902/c82841-34895213.html
- 乌鲁木齐第53小学：https://wlmq.bendibao.com/news/2021831/47403.shtm

## 验证范围

轻量版在Playwright Chromium的Canvas兼容路径下完成39项本地检查：三页切换、四种实验与视角缩放、四次昼夜事件及去重、CSV、作息差值和六组横屏布局。未发现页面脚本错误或外部运行请求。WebGL硬件路径与具体希沃/iPad设备尚未实机验收。
'''
(lesson_dir / 'README.md').write_text(readme, encoding='utf-8')
report = {'html_bytes': len(output), 'html_sha256': sha, 'texture_size': [4096, 2048], 'texture_bytes': len(texture.getvalue()), 'template_sha256': EXPECTED_TEMPLATE, 'source_sha256': EXPECTED_SOURCE}
print(json.dumps(report, ensure_ascii=False, indent=2))
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
        f.write('## Verified dawn lesson\n\n```json\n' + json.dumps(report, indent=2) + '\n```\n')
