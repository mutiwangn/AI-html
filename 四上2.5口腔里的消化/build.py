#!/usr/bin/env python3
"""Build the offline, single-file classroom HTML; no package manager is needed."""
import base64
from pathlib import Path
ROOT = Path(__file__).resolve().parent
html = (ROOT / 'parts/shell.html').read_text(encoding='utf-8')
for marker, source in [('/*__STYLE__*/', 'parts/style.css'), ('/*__CORE__*/', 'parts/core.js'), ('/*__ROOM__*/', 'parts/room.js')]:
    html = html.replace(marker, (ROOT / source).read_text(encoding='utf-8'))
asset = base64.b64encode((ROOT / 'assets/mantou-plate.png').read_bytes()).decode('ascii')
html = html.replace('__BREAD_ASSET__', 'data:image/png;base64,' + asset)
assert '/*__' not in html and '__BREAD_ASSET__' not in html
(ROOT / 'index.html').write_text(html, encoding='utf-8')
(ROOT / 'dist').mkdir(exist_ok=True)
(ROOT / 'dist/index.html').write_text(html, encoding='utf-8')
print('Built index.html:', len(html.encode('utf-8')), 'bytes')
