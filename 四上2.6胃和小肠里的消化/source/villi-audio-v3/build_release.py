"""Rebuild from maintained sources, preserving the published Three.js and Blender data.
Run from this folder after editing template.html / lesson.js. No network needed.
"""
from pathlib import Path
import re
p=Path(__file__).resolve().parent
lesson=p.parents[1]
original=(lesson/'index.html').read_text()
scripts=re.findall(r'<script>(.*?)</script>',original,re.S)
assert len(scripts)==3 and scripts[1].startswith('const ANATOMY=')
anatomy=scripts[1][len('const ANATOMY='):].strip().removesuffix(';')
html=(p/'template.html').read_text().replace('THREE_LICENSE_TEXT',(lesson/'LICENSE-THREE.txt').read_text()).replace('/* THREE_INLINE */',scripts[0]).replace('/* ANATOMY_INLINE */',anatomy).replace('/* LESSON_INLINE */',(p/'lesson.js').read_text())
assert len(html.encode())<10_000_000
(lesson/'index.html').write_text(html)
# These ignored/local helpers let Node tests use the exact same embedded sources.
(p/'three.min.js').write_text(scripts[0]);(p/'models').mkdir(exist_ok=True);(p/'models/anatomy.json').write_text(anatomy)
print(len(html.encode()),'bytes')
