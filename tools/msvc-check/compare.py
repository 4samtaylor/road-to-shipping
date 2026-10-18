"""Compare results.txt from run.bat with expected.json and print a table."""
import json, re, sys
from pathlib import Path
here = Path(__file__).parent
exp = json.loads((here / 'expected.json').read_text())
txt = Path(sys.argv[1] if len(sys.argv) > 1 else here / 'results.txt').read_text(encoding='utf-8', errors='ignore')
blocks = re.split(r'^==== (\S+)\s*$', txt, flags=re.M)
got = {blocks[i]: blocks[i + 1] for i in range(1, len(blocks) - 1, 2)}
ok = bad = 0
for name, want in exp.items():
    out = got.get(name, '')
    codes = sorted(set(re.findall(r'\b([CL](?:NK)?\d{4})\b', out)))
    hit = (not codes) if want == 'none' else (want in codes)
    ok += hit; bad += not hit
    print(f"{'OK ' if hit else 'XX '} {name:32} want {want:6} got {', '.join(codes) or 'none'}")
print(f'\n{ok} held, {bad} differ')
if 'facts' in got:
    print('\nfacts:\n' + got['facts'].strip())
