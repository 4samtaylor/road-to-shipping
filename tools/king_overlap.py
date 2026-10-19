"""Copyright guard: find 7-word runs shared between new content and King's book text.

King's text is never committed. Keep it outside the repo (e.g. one chNN.txt per chapter)
and pass that folder:  python tools/king_overlap.py PATH/TO/king [base-branch]
It scans lines added since base-branch (default main) in content/ and js/, and also flags
em dashes and banned words. Exit code 1 if anything is found."""
import html, re, subprocess, sys
from pathlib import Path
if len(sys.argv) < 2: sys.exit(__doc__)
king, base = Path(sys.argv[1]), (sys.argv[2] if len(sys.argv) > 2 else 'main')
def toks(t): return re.findall(r"[a-z0-9']+", html.unescape(re.sub(r'<[^>]+>', ' ', t)).lower())
K = set()
for f in king.glob('*.txt'):
    w = toks(f.read_text(errors='ignore')); K.update(tuple(w[i:i + 7]) for i in range(len(w) - 6))
if not K: sys.exit('no King text found in ' + str(king))
diff = subprocess.run(['git', 'diff', base, '--', 'content', 'js'], capture_output=True, text=True).stdout
new = subprocess.run(['git', 'ls-files', '--others', '--exclude-standard', 'content', 'js'], capture_output=True, text=True).stdout.split()
added = '\n'.join(l[1:] for l in diff.split('\n') if l.startswith('+') and not l.startswith('+++'))
added += '\n' + '\n'.join(Path(f).read_text(encoding='utf-8', errors='ignore') for f in new)
w = toks(added)
hits = sorted({' '.join(w[i:i + 7]) for i in range(len(w) - 6) if tuple(w[i:i + 7]) in K})
bad = sorted(set(m.group(0) for m in re.finditer(r'\b(delve|leverage|foster|seamless|robust|innovative|comprehensive|pivotal|harness|streamline|elevate|empower|unlock|landscape|holistic|synergy|paradigm)\b|—', added, re.I)))
print(f'{len(hits)} 7-word overlaps with King'); [print('  ', h) for h in hits[:50]]
print('voice:', bad or 'clean')
sys.exit(1 if hits or bad else 0)
