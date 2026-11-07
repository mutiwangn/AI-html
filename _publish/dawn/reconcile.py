from pathlib import Path
import hashlib, json, re, subprocess

def git(*args, check=True):
    return subprocess.run(['git', *args], check=check, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

# Keep the exact tested lesson; use main as source of truth for shared files.
lesson = Path('六上3.4谁先迎来黎明/index.html').read_bytes()
assert len(lesson) == 976453
assert hashlib.sha256(lesson).hexdigest() == '5b6cdcec2d6284944236affcc74e71e08e821ae3032aa5c4863eccb8073d0818'
git('fetch', 'origin', 'main')
r = git('merge', '--no-commit', '--no-ff', 'origin/main', check=False)
print(r.stdout)
conflicts = set(git('diff', '--name-only', '--diff-filter=U').stdout.splitlines())
assert conflicts <= {'index.html', 'lesson-levels.js'}, 'Unexpected conflict: ' + str(conflicts)
assert r.returncode == 0 or conflicts, 'Merge failed without a resolvable catalog conflict'
git('checkout', 'origin/main', '--', 'index.html', 'lesson-levels.js')
p = Path('index.html')
s = p.read_text(encoding='utf-8')
m = re.search(r'var\s+books\s*=\s*', s)
assert m
books, count = json.JSONDecoder().raw_decode(s[m.end():])
book = next(b for b in books if b['id'] == '6-up')
row = ['3.4', '谁先迎来黎明', '', '三页探究：4K地球仪定位，手拉手、大蒜、汽车与转椅多视角模拟，24小时昼夜记录，以及两地小学真实历史作息差值对照；单文件离线小于1 MB。', './六上3.4谁先迎来黎明/']
book['lessons'] = [x for x in book['lessons'] if x[-1] != row[-1]] + [row]
book['lessons'].sort(key=lambda x: tuple(int(v) for v in x[0].split('.')))
s = s[:m.end()] + json.dumps(books, ensure_ascii=False, separators=(',', ':')) + s[m.end()+count:]
s = re.sub(r'lesson-levels\.js\?v=[^\"\']+', 'lesson-levels.js?v=dawn-lite-20261107-v1', s)
p.write_text(s, encoding='utf-8')
p = Path('lesson-levels.js')
s = p.read_text(encoding='utf-8')
key = '六上3.4谁先迎来黎明'
if key not in s:
    anchor = 'root.AIHTML_LEVELS = {'
    assert anchor in s
    entry = "\n    '六上3.4谁先迎来黎明': { level: 2, note: 'Canvas兼容渲染、可选WebGL；4K地球、多视角实验、昼夜记录与作息差值；单文件离线，小于1 MB，无外部运行依赖' },"
    s = s.replace(anchor, anchor + entry, 1)
p.write_text(s, encoding='utf-8')
subprocess.run(['node', '--check', str(p)], check=True)
assert Path('六上3.4谁先迎来黎明/index.html').read_bytes() == lesson
print('Latest main retained; dawn entry added; tested HTML unchanged.')
