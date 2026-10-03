"""Checks the roadmap content before it goes live.

Run locally:  python tools/validate.py
Runs in CI on every pull request and before every deploy.
"""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOID = {'br', 'img', 'input', 'hr', 'meta', 'link', 'wbr', 'source', 'col', 'area', 'base', 'embed', 'param', 'track'}
BANNED_TAGS = {'script', 'iframe', 'object', 'embed', 'form', 'style', 'link', 'meta', 'base'}
errors = []


class Check(HTMLParser):
    def __init__(self, name):
        super().__init__(convert_charrefs=True)
        self.name, self.stack, self.ids, self.data_ids = name, [], [], []

    def handle_starttag(self, tag, attrs):
        line = self.getpos()[0]
        if tag in BANNED_TAGS:
            errors.append(f'{self.name}:{line} <{tag}> is not allowed in content')
        for k, v in attrs:
            if k.startswith('on'):
                errors.append(f'{self.name}:{line} inline event handler {k}= is not allowed')
            if k in ('href', 'src') and v and re.match(r'\s*javascript:', v, re.I):
                errors.append(f'{self.name}:{line} javascript: link is not allowed')
            if k == 'id':
                self.ids.append(v)
            if k == 'data-id':
                self.data_ids.append(v)
        if tag not in VOID:
            self.stack.append((tag, line))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.stack:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack or self.stack[-1][0] != tag:
            want = self.stack[-1] if self.stack else None
            errors.append(f'{self.name}:{self.getpos()[0]} </{tag}> does not match ' +
                          (f'<{want[0]}> from line {want[1]}' if want else 'any open tag'))
            # recover: unwind to the matching tag if it exists
            for i in range(len(self.stack) - 1, -1, -1):
                if self.stack[i][0] == tag:
                    del self.stack[i:]
                    break
            return
        self.stack.pop()


def main():
    man_path = ROOT / 'content' / 'manifest.json'
    try:
        man = json.loads(man_path.read_text(encoding='utf-8'))
    except Exception as e:
        print(f'content/manifest.json: {e}')
        return 1
    all_ids, all_data_ids = {}, {}
    for f in man.get('files', []):
        p = ROOT / 'content' / f
        if not p.exists():
            errors.append(f'manifest lists {f}, but content/{f} does not exist')
            continue
        c = Check(f'content/{f}')
        c.feed(p.read_text(encoding='utf-8'))
        c.close()
        for tag, line in c.stack:
            errors.append(f'content/{f}:{line} <{tag}> is never closed')
        for i in c.ids:
            if i in all_ids:
                errors.append(f'id="{i}" appears in both {all_ids[i]} and {f}')
            all_ids[i] = f
        for i in c.data_ids:
            if i in all_data_ids:
                errors.append(f'data-id="{i}" appears twice ({all_data_ids[i]}, {f}); progress would collide')
            all_data_ids[i] = f
    listed = set(man.get('files', []))
    for p in (ROOT / 'content').glob('*.html'):
        if p.name not in listed:
            errors.append(f'content/{p.name} is not listed in manifest.json, so it will not show up')
    for g in man.get('groups', []):
        for sid in g[1]:
            if sid not in all_ids:
                errors.append(f'manifest group "{g[0]}" points at #{sid}, which no content file defines')
    for p in (ROOT / 'progress').glob('*.json'):
        try:
            doc = json.loads(p.read_text(encoding='utf-8'))
            assert isinstance(doc.get('state'), dict)
        except Exception:
            errors.append(f'progress/{p.name} is not a valid progress file')

    if errors:
        print('Content check failed:\n  ' + '\n  '.join(errors))
        return 1
    print(f'Content check passed: {len(listed)} files, {len(all_data_ids)} tracked items.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
