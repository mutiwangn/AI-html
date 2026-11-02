from pathlib import Path
import re

root = Path(__file__).resolve().parent
parts = root / 'revision'
html = (parts / 'shell.html').read_text(encoding='utf-8')
css = '\n'.join((parts / name).read_text(encoding='utf-8') for name in ['app.css','measure.css','health.css','instruments.css'])
html = html.replace('/*__CSS__*/', css)
for section in ['measure','health','instruments']:
    section_html = (parts / (section+'.html')).read_text(encoding='utf-8')
    if section == 'instruments':
        for device in ['water','bag','electronic']:
            section_html = section_html.replace('<!--__'+device.upper()+'_SCENE__-->', (parts / (device+'-scene.svg')).read_text(encoding='utf-8'))
    html = html.replace('<!--__'+section.upper()+'_HTML__-->', section_html)
for key, name in [('APP','app.js'),('MEASURE','measure.js'),('ANATOMY_DATA','anatomy-data.js'),('HEALTH','health.js'),('INSTRUMENTS','instruments.js')]:
    html = html.replace('/*__'+key+'_JS__*/', (parts / name).read_text(encoding='utf-8'))
assert not re.search(r'__[A-Z_]+__', html)
assert '<script src=' not in html and '<link rel="stylesheet"' not in html
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'index.html').write_text(html, encoding='utf-8')
print('Built single HTML:', len(html.encode('utf-8')), 'bytes')
