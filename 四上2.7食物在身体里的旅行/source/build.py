from pathlib import Path
p=Path(__file__).parent
s=(p/'template.html').read_text();lib=(p/'three.min.js').read_text();license=(p.parent/'LICENSE-THREE.txt').read_text()
s=s.replace('/* THREE_LIBRARY */','/*!\n'+license+'*/\n'+lib)
assert len(s.encode())<10_000_000
(p.parent/'index.html').write_text(s)
print('Bundled',len(s.encode()),'bytes')
