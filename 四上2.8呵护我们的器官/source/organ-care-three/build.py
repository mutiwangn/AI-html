from pathlib import Path
import sys
p=Path(__file__).resolve().parent
app=(p/'app.js').read_text()
a=app.index('/* Original educational geometry.')
b=app.index('function drawScene(){',a)
app=app[:a]+(p/'model.js').read_text()+'\n'+app[b:]
(p/'app.js').write_text(app)
out=(p/'template.html').read_text()+'<script>'+(p/'three.min.js').read_text()+'</script><script>'+app+'</script></body></html>'
target=Path(sys.argv[1]) if len(sys.argv)>1 else p.parent.parent/'index.html'
target.write_text(out)
print(str(target),len(out.encode()),'bytes')
