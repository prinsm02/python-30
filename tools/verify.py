"""Python 30: check every lesson, then build the app data.

    python tools\\verify.py            check all days, then build app\\lessons.js, app\\harness.js, tutor\\*.md
    python tools\\verify.py D06 D07    check only those days (no build)

A lesson passes when: the shape is right, every solution passes its tests,
every starter fails them, and there are no em dashes.
"""
import json, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LESSONS = ROOT / 'lessons'
HARNESS = ROOT / 'tools' / 'harness.py'
TIMEOUT = 10
# One editor tip per day (VS Code first, Cursor from Day 26). Merged into each lesson as L['editor'].
EDITOR = json.loads((LESSONS / 'editor.json').read_text(encoding='utf-8'))

RUNNER = r'''
import sys, json
src = open(sys.argv[1], encoding='utf-8').read()
g = {}
exec(compile(src, 'harness.py', 'exec'), g)
job = json.load(open(sys.argv[2], encoding='utf-8'))
g['_P30_WORK'] = job['work']
sys.stdout.reconfigure(encoding='utf-8')
print(g['_p30_run'](job['code'], job['inputs'], job['files'], job['seed']))
'''


def norm(s):
    lines = [ln.rstrip() for ln in str(s).replace('\r', '').split('\n')]
    while lines and lines[-1] == '':
        lines.pop()
    return '\n'.join(lines)


def run(code, test):
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        job = {'code': code, 'inputs': test.get('inputs', []), 'files': test.get('files', {}),
               'seed': test.get('seed'), 'work': str(td / 'work')}
        (td / 'job.json').write_text(json.dumps(job), encoding='utf-8')
        (td / 'runner.py').write_text(RUNNER, encoding='utf-8')
        try:
            p = subprocess.run([sys.executable, str(td / 'runner.py'), str(HARNESS), str(td / 'job.json')],
                               capture_output=True, text=True, encoding='utf-8', timeout=TIMEOUT, cwd=str(td))
        except subprocess.TimeoutExpired:
            return {'error': 'Timed out (loop never stops?)', 'out': '', 'files': {}, 'need_input': False, 'line': None}
        if p.returncode != 0:
            return {'error': 'runner crashed: ' + p.stderr[-300:], 'out': '', 'files': {}, 'need_input': False, 'line': None}
        return json.loads(p.stdout.strip().splitlines()[-1])


def check(code, task):
    """Same rules as app/engine.js checkTask. Returns '' on pass, or the reason."""
    for s in task.get('code_has', []):
        if s not in code:
            return 'code must use: ' + s
    for s in task.get('code_not', []):
        if s in code:
            return 'code must not use: ' + s
    for i, t in enumerate(task['tests'], 1):
        r = run(code, t)
        if r['error']:
            return 'test %d: %s (line %s)' % (i, r['error'], r['line'])
        if r['need_input']:
            return 'test %d: asked for more input than given' % i
        if 'expect' in t and norm(r['out']) != norm(t['expect']):
            return 'test %d: output differs.\n--- expected ---\n%s\n--- got ---\n%s' % (i, norm(t['expect']), norm(r['out']))
        for s in t.get('contains', []):
            if s not in r['out']:
                return 'test %d: output is missing: %s' % (i, s)
        for name, content in t.get('expect_files', {}).items():
            if name not in r['files']:
                return 'test %d: file not made: %s' % (i, name)
            if norm(r['files'][name]) != norm(content):
                return 'test %d: file %s differs.\n--- got ---\n%s' % (i, name, norm(r['files'][name]))
    return ''


def shape(L, fname):
    errs = []
    def need(cond, msg):
        if not cond:
            errs.append(msg)
    for k in ('id', 'day', 'week', 'title', 'hook', 'badge', 'warmup', 'why', 'watch', 'tasks', 'recap', 'words'):
        need(k in L, 'missing field: ' + k)
    if errs:
        return errs
    need(L['id'] == fname, 'id does not match file name')
    need(L['id'] == 'D%02d' % L['day'], 'id does not match day')
    need(len(L['warmup']) == 3, 'warmup must have 3 questions')
    for q in L['warmup']:
        need(len(q.get('options', [])) == 3 and q.get('answer') in (0, 1, 2) and q.get('q') and q.get('explain'), 'bad warmup question: ' + str(q.get('q')))
    need(3 <= len(L['why']) <= 5, 'why needs 3 to 5 cards')
    for c in L['why']:
        need(c.get('heading') and c.get('text'), 'why card needs heading and text')
        need(len(c.get('text', '')) <= 520, 'why card too long (max 520 chars): ' + str(c.get('heading')))
    w = L['watch']
    need(all(w.get(k) for k in ('intro', 'code', 'explain', 'break_it')), 'watch needs intro, code, explain, break_it')
    need(len(L['tasks']) == 3, 'needs exactly 3 tasks')
    for t in L['tasks']:
        need(all(k in t for k in ('title', 'task', 'starter', 'solution', 'hints', 'tests')), 'task missing fields: ' + str(t.get('title')))
        need(len(t.get('hints', [])) >= 2, 'task needs 2+ hints: ' + str(t.get('title')))
        need(len(t.get('tests', [])) >= 1, 'task needs 1+ tests: ' + str(t.get('title')))
        for ts in t.get('tests', []):
            need(any(k in ts for k in ('expect', 'contains', 'expect_files')), 'test checks nothing: ' + str(t.get('title')))
    need(3 <= len(L['recap']) <= 5, 'recap needs 3 to 5 lines')
    if 'pc' in L:
        need(L['pc'].get('title') and L['pc'].get('why') and len(L['pc'].get('steps', [])) >= 2, 'pc needs title, why, 2+ steps')
    raw = json.dumps(L, ensure_ascii=False)
    need('—' not in raw and '–' not in raw, 'contains an em or en dash (not allowed)')
    need('“' not in raw and '’' not in raw and '‘' not in raw and '”' not in raw, 'contains curly quotes (use straight quotes)')
    return errs


def verify_lesson(path):
    errs = []
    try:
        L = json.loads(path.read_text(encoding='utf-8'))
    except Exception as e:
        return None, ['not valid JSON: %s' % e]
    ed = EDITOR.get(path.stem)
    if not ed:
        errs.append('no editor tip for this day in lessons\\editor.json')
    else:
        L['editor'] = ed
        if not all(ed.get(k) for k in ('app', 'title', 'text', 'try')):
            errs.append('editor tip needs app, title, text, try')
        if len(ed.get('text', '')) > 480 or len(ed.get('try', '')) > 300:
            errs.append('editor tip too long (text max 480, try max 300)')
    errs += shape(L, path.stem)
    if errs:
        return L, errs
    if L['watch'].get('inputs') is not None or True:
        r = run(L['watch']['code'], {'inputs': L['watch'].get('inputs', []), 'files': L['watch'].get('files', {})})
        if r['error'] or r['need_input']:
            errs.append('watch example does not run: %s' % (r['error'] or 'needs more inputs (add watch.inputs)'))
    for n, t in enumerate(L['tasks'], 1):
        why = check(t['solution'], t)
        if why:
            errs.append('task %d solution FAILS: %s' % (n, why))
        if not t.get('starter_passes') and not check(t['starter'], t):
            errs.append('task %d starter already passes (make the tests stricter)' % n)
    return L, errs


def tutor_md(L):
    o = ['# Day %d: %s' % (L['day'], L['title']), '', 'Tutor notes for a helper model. Explain simply, give a hint before the answer, no em dashes.', '',
         '**Idea of the day:** ' + L['hook'], '', '## Key points']
    o += ['- ' + r for r in L['recap']]
    for n, t in enumerate(L['tasks'], 1):
        o += ['', '## Task %d: %s' % (n, t['title']), t['task'], '', 'Hints, in order:']
        o += ['%d. %s' % (i, h) for i, h in enumerate(t['hints'], 1)]
        o += ['', 'Answer:', '```python', t['solution'].rstrip(), '```']
    if 'editor' in L:
        e = L['editor']
        o += ['', '## Editor tip (%s): %s' % (e['app'], e['title']), e['text'], '', 'Try at the PC: ' + e['try']]
    if 'pc' in L:
        o += ['', '## On the PC: ' + L['pc']['title'], L['pc']['why'], '']
        o += ['%d. %s' % (i, s) for i, s in enumerate(L['pc']['steps'], 1)]
    return '\n'.join(o) + '\n'


def main():
    only = [a.upper() for a in sys.argv[1:]]
    paths = sorted(LESSONS.glob('D??.json'))
    if only:
        paths = [p for p in paths if p.stem in only]
    lessons, bad = [], 0
    for p in paths:
        L, errs = verify_lesson(p)
        if errs:
            bad += 1
            print('FAIL %s' % p.stem)
            for e in errs:
                print('   - ' + e.replace('\n', '\n     '))
        else:
            print('ok   %s  %s' % (p.stem, L['title']))
            lessons.append(L)
    print('\n%d checked, %d failed' % (len(paths), bad))
    if only:
        return 1 if bad else 0
    if bad:
        print('Not building: fix the failures first.')
        return 1
    app = ROOT / 'app'
    (app / 'lessons.js').write_text('window.P30_LESSONS = ' + json.dumps(lessons, ensure_ascii=False) + ';\n', encoding='utf-8')
    (app / 'harness.js').write_text('window.P30_HARNESS = ' + json.dumps(HARNESS.read_text(encoding='utf-8')) + ';\n', encoding='utf-8')
    for L in lessons:
        (ROOT / 'tutor' / (L['id'] + '.md')).write_text(tutor_md(L), encoding='utf-8')
    print('Built app\\lessons.js (%d days), app\\harness.js, tutor notes.' % len(lessons))
    return 0


if __name__ == '__main__':
    sys.exit(main())
