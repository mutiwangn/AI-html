from pathlib import Path
import argparse
p=Path(__file__).resolve().parent
root=p.parent
text=(p/'template.html').read_text()
text=text.replace('/* THREE_INLINE */',(p/'three.min.js').read_text()).replace('/* LESSON_INLINE */',(p/'lesson.js').read_text()).replace('THREE_LICENSE_TEXT',(p/'LICENSE-THREE.txt').read_text())
ap=argparse.ArgumentParser();ap.add_argument('--output',default=str(root/'index.html'));args=ap.parse_args()
Path(args.output).write_text(text)
print('Built',len(text.encode()),'bytes')
