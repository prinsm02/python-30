# Python 30 run harness. ONE source for both the web app (Pyodide) and tools/verify.py.
# Runs a learner program with scripted inputs and virtual files, and returns JSON.
import sys, io, json, os, shutil, traceback, random

_P30_WORK = '/work'
_P30_MAX_OUT = 20000


class _NeedInput(BaseException):
    pass


class _TooMuch(BaseException):
    pass


class _Out(io.StringIO):
    def write(self, s):
        if self.tell() > _P30_MAX_OUT:
            raise _TooMuch()
        return super().write(s)


def _p30_run(code, inputs, files, seed):
    inputs = [str(x) for x in list(inputs)]
    files = dict(files)
    home = os.getcwd()
    work = _P30_WORK
    try:
        os.chdir(os.path.dirname(work) or '/')
    except Exception:
        pass
    shutil.rmtree(work, ignore_errors=True)
    os.makedirs(work, exist_ok=True)
    os.chdir(work)
    for name, content in files.items():
        d = os.path.dirname(name)
        if d:
            os.makedirs(d, exist_ok=True)
        with open(name, 'w', encoding='utf-8', newline='') as fh:
            fh.write(content)
    out = _Out()
    state = {'i': 0}

    def _input(prompt=''):
        out.write(str(prompt))
        if state['i'] >= len(inputs):
            raise _NeedInput()
        v = inputs[state['i']]
        state['i'] += 1
        out.write(v + '\n')
        return v

    random.seed(30 if seed is None else seed)
    res = {'error': None, 'need_input': False, 'line': None}
    g = {'__name__': '__main__', 'input': _input}
    old = sys.stdout
    sys.stdout = out
    try:
        exec(compile(code, 'main.py', 'exec'), g)
    except _NeedInput:
        res['need_input'] = True
    except _TooMuch:
        res['error'] = 'Too much output. A loop is probably running forever.'
    except SyntaxError as e:
        res['error'] = '%s: %s' % (type(e).__name__, e.msg)
        res['line'] = e.lineno
    except BaseException as e:
        line = None
        for fr in traceback.extract_tb(e.__traceback__):
            if fr.filename == 'main.py':
                line = fr.lineno
        msg = str(e)
        res['error'] = type(e).__name__ + (': ' + msg if msg else '')
        res['line'] = line
    finally:
        sys.stdout = old
    res['out'] = out.getvalue()
    outfiles = {}
    for root, _dirs, fs in os.walk(work):
        for f in fs:
            p = os.path.join(root, f)
            rel = os.path.relpath(p, work).replace(os.sep, '/')
            try:
                with open(p, encoding='utf-8', newline='') as fh:
                    outfiles[rel] = fh.read()
            except Exception:
                pass
    res['files'] = outfiles
    try:
        os.chdir(home)
    except Exception:
        pass
    return json.dumps(res)
