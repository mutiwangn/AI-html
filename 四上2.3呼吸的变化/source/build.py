from pathlib import Path
p=Path(__file__).parent
s=(p/'template.html').read_text()
for token,name in [('THREE','three.min.js'),('ASSETS','assets.js'),('PARSER','parser.js'),('MODEL','model.js'),('APP','app.js')]:
 s=s.replace('/* '+token+' */',(p/name).read_text())
license=(p.parent/'LICENSE-THREE.txt').read_text()
s=s.replace('</body>','<!-- Three.js MIT license\n'+license+'\nOriginal anatomy models: Z-Anatomy / BodyParts3D; CC BY-SA 4.0. Adapted render, colour and animation.\n--></body>')
(p.parent/'release'/'index.html').write_text(s)
print(len(s.encode()),'bytes')
