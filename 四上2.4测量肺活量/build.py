from pathlib import Path
import re

root = Path(__file__).resolve().parent
parts = root / 'parts'
html = (parts / 'shell.html').read_text(encoding='utf-8')
css = (parts / 'main.css').read_text(encoding='utf-8') + '\n' + (parts / 'explain.css').read_text(encoding='utf-8')
core = (parts / 'core.js').read_text(encoding='utf-8') + '\n' + (parts / 'room.js').read_text(encoding='utf-8') + '\nwindow.LungApp.initRoom();\n'
html = html.replace('/*__CSS__*/', css).replace('<!--__EXPLAIN_HTML__-->', (parts / 'explain.html').read_text(encoding='utf-8')).replace('/*__CORE_JS__*/', core).replace('/*__EXPLAIN_JS__*/', (parts / 'explain.js').read_text(encoding='utf-8'))
assert not re.search(r'__(CSS|CORE_JS|EXPLAIN)', html)
assert '<script src=' not in html and '<link rel="stylesheet"' not in html
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'index.html').write_text(html, encoding='utf-8')
print('Built single HTML:', len(html.encode('utf-8')), 'bytes')
