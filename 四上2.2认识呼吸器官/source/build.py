from pathlib import Path
root=Path(__file__).resolve().parent.parent
s=(root/'source/template.html').read_text()
for tag,path in [('STYLE','source/style.css'),('THREE','three.min.js'),('FALLBACK','source/fallback.js'),('LESSON','source/lesson.js'),('LICENSE','LICENSE-THREE.txt')]:s=s.replace('/* '+tag+' */',(root/path).read_text())
(root/'index.html').write_text(s)
print(len(s.encode()),'bytes')
