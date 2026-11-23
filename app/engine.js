/* Python 30 lesson player. No build step, no server, no tokens: lessons are in lessons.js,
   real Python runs in the page (Pyodide in a worker), progress lives in this browser. */
(function () {
  'use strict';
  var LESSONS = (window.P30_LESSONS || []).slice().sort(function (a, b) { return a.day - b.day; });
  var TOTAL = 30;
  var DEV = /[?&]dev\b/.test(location.search);
  var PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  var KEY = 'python30.v1';
  var app = document.getElementById('app');

  // ---------- saved progress ----------
  var S = { done: {}, tasks: {}, code: {}, warm: {}, pos: {}, pc: {}, pcTodo: {}, ed: {}, edOpen: false, xp: 0, streak: 0, last: null };
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) S[k] = o[k]; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  // ---------- small helpers ----------
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function md(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>');
  }
  function norm(s) {
    var lines = String(s).replace(/\r/g, '').split('\n').map(function (l) { return l.replace(/\s+$/, ''); });
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines.join('\n');
  }
  function lesson(id) { for (var i = 0; i < LESSONS.length; i++) if (LESSONS[i].id === id) return LESSONS[i]; return null; }
  function did(n) { return 'D' + (n < 10 ? '0' : '') + n; }
  function unlocked(L) { return DEV || L.day === 1 || !!S.done[did(L.day - 1)]; }
  function nextLesson() { for (var i = 0; i < LESSONS.length; i++) if (!S.done[LESSONS[i].id]) return LESSONS[i]; return null; }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function weekdaysBetween(a, b) { // weekdays after a, up to and including b
    var n = 0, d = new Date(a.getTime());
    while (d < b) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6) n++; }
    return n;
  }
  function bumpStreak() {
    var t = today(); if (S.last === t) return;
    if (S.last) {
      var p = S.last.split('-'), a = new Date(+p[0], +p[1] - 1, +p[2]), n = new Date(); n.setHours(0, 0, 0, 0);
      S.streak = weekdaysBetween(a, n) <= 1 ? S.streak + 1 : 1;
    } else S.streak = 1;
    S.last = t;
  }

  // ---------- Python runner (Pyodide in a worker, so an endless loop cannot freeze the page) ----------
  var worker = null, ready = null, waiting = {}, jobId = 0;
  function workerMain() {
    /* global importScripts, loadPyodide, HARNESS, PYODIDE */
    var py, boot;
    try { importScripts(PYODIDE + 'pyodide.js'); } catch (e) { postMessage({ type: 'fail', msg: 'Could not load Python. Check your internet and reload.' }); return; }
    boot = loadPyodide({ indexURL: PYODIDE }).then(function (p) { py = p; py.runPython(HARNESS); postMessage({ type: 'ready' }); })
      .catch(function (e) { postMessage({ type: 'fail', msg: String(e) }); });
    onmessage = function (e) {
      boot.then(function () {
        var j = e.data, res;
        try {
          py.globals.set('_j', JSON.stringify(j));
          res = JSON.parse(py.runPython("import json as _json\n_a = _json.loads(_j)\n_p30_run(_a['code'], _a['inputs'], _a['files'], _a['seed'])"));
        } catch (err) { res = { error: String(err), out: '', files: {}, need_input: false, line: null }; }
        postMessage({ type: 'done', id: j.id, res: res });
      });
    };
  }
  function boot() {
    var src = 'var HARNESS=' + JSON.stringify(window.P30_HARNESS || '') + ';var PYODIDE=' + JSON.stringify(PYODIDE) + ';(' + workerMain.toString() + ')();';
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    ready = new Promise(function (resolve, reject) {
      worker.onmessage = function (e) {
        var m = e.data;
        if (m.type === 'ready') resolve();
        else if (m.type === 'fail') reject(new Error(m.msg));
        else if (m.type === 'done' && waiting[m.id]) { var f = waiting[m.id]; delete waiting[m.id]; f(m.res); }
      };
      worker.onerror = function () { reject(new Error('Could not start Python. Check your internet and reload.')); };
    });
    ready.catch(function () {});
  }
  function runPy(code, test) {
    if (!worker) boot();
    return ready.then(function () {
      return new Promise(function (resolve) {
        var id = ++jobId;
        var timer = setTimeout(function () {
          delete waiting[id]; worker.terminate(); worker = null;
          resolve({ error: 'Stopped after 8 seconds. A loop is probably running forever: check that something inside the loop changes.', out: '', files: {}, need_input: false, line: null });
        }, 8000);
        waiting[id] = function (res) { clearTimeout(timer); resolve(res); };
        worker.postMessage({ id: id, code: code, inputs: test.inputs || [], files: test.files || {}, seed: test.seed == null ? null : test.seed });
      });
    }, function (err) {
      worker = null;
      return { error: err.message, out: '', files: {}, need_input: false, line: null };
    });
  }

  var PLAIN = {
    SyntaxError: 'Python could not read that line. Check the quotes, brackets and colons.',
    IndentationError: 'The spaces at the start of the line are wrong. Lines inside a block need 4 spaces.',
    TabError: 'Mixed tabs and spaces at the start of a line. Use 4 spaces.',
    NameError: 'Python does not know that name. Check the spelling and capital letters, or you forgot the quotes.',
    TypeError: 'Two kinds of value do not fit together here, like text plus a number.',
    ValueError: 'The value is the wrong kind, like int("seven").',
    IndexError: 'That position is not in the list. Positions start at 0.',
    KeyError: 'That key is not in the dictionary. Check the spelling.',
    ZeroDivisionError: 'You cannot divide by zero.',
    FileNotFoundError: 'There is no file with that name. Check the spelling of the file name.',
    AttributeError: 'That thing does not have that tool. Check the spelling after the dot.',
    ModuleNotFoundError: 'That module is not available here. Check the spelling of the import.'
  };
  function errHtml(r) {
    var name = String(r.error).split(':')[0];
    return '<span class="err">' + (r.line ? 'Line ' + r.line + ': ' : '') + esc(r.error) + '</span>' +
      (PLAIN[name] ? '\n<span class="wait">' + esc(PLAIN[name]) + '</span>' : '');
  }

  // Same rules as tools/verify.py check(). Returns {ok, html}.
  function checkTask(code, task) {
    var i, has = task.code_has || [], not = task.code_not || [];
    for (i = 0; i < has.length; i++) if (code.indexOf(has[i]) < 0) return Promise.resolve({ ok: false, html: 'Your code needs to use <code>' + esc(has[i].trim()) + '</code> for this one.' });
    for (i = 0; i < not.length; i++) if (code.indexOf(not[i]) >= 0) return Promise.resolve({ ok: false, html: 'Do this one without <code>' + esc(not[i].trim()) + '</code>.' });
    var tests = task.tests, n = 0;
    function step() {
      if (n >= tests.length) return { ok: true };
      var t = tests[n++], label = tests.length > 1 ? 'Test ' + n + ' of ' + tests.length + ': ' : '';
      return runPy(code, t).then(function (r) {
        var j, name;
        if (r.error) return { ok: false, html: label + 'your program stopped with an error.<div class="out">' + esc(r.out) + errHtml(r) + '</div>' };
        if (r.need_input) return { ok: false, html: label + 'your program asked for more answers than it should. Count your input() lines.' };
        if (t.expect != null && norm(r.out) !== norm(t.expect)) {
          var e = norm(t.expect).split('\n'), g = norm(r.out).split('\n'), d = 0;
          while (d < e.length && d < g.length && e[d] === g[d]) d++;
          return { ok: false, html: label + 'the output is not quite right. First difference: line ' + (d + 1) + '. Spaces, capitals and punctuation count.' +
            '<div class="cmp"><div><div class="out-label">It should show</div><div class="out">' + esc(norm(t.expect)) + '</div></div>' +
            '<div><div class="out-label">Yours shows</div><div class="out">' + (esc(norm(r.out)) || '<span class="wait">(nothing)</span>') + '</div></div></div>' };
        }
        var c = t.contains || [];
        for (j = 0; j < c.length; j++) if (r.out.indexOf(c[j]) < 0) return { ok: false, html: label + 'the output should include <code>' + esc(c[j]) + '</code>.<div class="out">' + esc(r.out) + '</div>' };
        var f = t.expect_files || {};
        for (name in f) {
          if (!(name in r.files)) return { ok: false, html: label + 'your program did not make the file <code>' + esc(name) + '</code>.' };
          if (norm(r.files[name]) !== norm(f[name])) return { ok: false, html: label + 'the file <code>' + esc(name) + '</code> is not right yet.' +
            '<div class="cmp"><div><div class="out-label">It should hold</div><div class="out">' + esc(norm(f[name])) + '</div></div>' +
            '<div><div class="out-label">Yours holds</div><div class="out">' + esc(norm(r.files[name])) + '</div></div></div>' };
        }
        return step();
      });
    }
    return Promise.resolve(step());
  }

  // Run for the learner: input() pauses, shows a box, then replays with the answers so far.
  function runLive(code, files, outEl, inEl) {
    var inputs = [], seed = Math.floor(Math.random() * 100000);
    inEl.innerHTML = '';
    outEl.innerHTML = '<span class="wait">Running... (the first run of the day loads Python, give it a few seconds)</span>';
    function go() {
      return runPy(code, { inputs: inputs, files: files || {}, seed: seed }).then(function (r) {
        outEl.innerHTML = esc(r.out) + (r.error ? errHtml(r) : '') || '<span class="wait">(no output: nothing was printed)</span>';
        outEl.scrollTop = outEl.scrollHeight;
        if (!r.need_input) { inEl.innerHTML = ''; return r; }
        return new Promise(function (resolve) {
          inEl.innerHTML = '<form class="inrow"><input autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Type your answer here" aria-label="Answer for input"><button class="btn primary sm">Enter</button></form>';
          var form = inEl.firstChild, box = form.firstChild; box.focus();
          form.onsubmit = function (ev) { ev.preventDefault(); inputs.push(box.value); inEl.innerHTML = ''; resolve(go()); };
        });
      });
    }
    return go();
  }

  // ---------- code editor ----------
  var KEYS = ['Tab', '(', ')', '"', ':', '=', '[', ']', '{', '}', '#', '_', "'", ',', '.', '+', '-', '*', '/', '<', '>', '!', '%'];
  function editorHtml(id, code) {
    return '<div class="ed"><textarea id="' + id + '" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Your code">' + esc(code) + '</textarea>' +
      '<div class="keys">' + KEYS.map(function (k) { return '<button type="button" data-key="' + esc(k) + '" data-for="' + id + '">' + (k === 'Tab' ? 'tab' : esc(k)) + '</button>'; }).join('') + '</div></div>';
  }
  function insert(ta, text, back) {
    var s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
    ta.selectionStart = ta.selectionEnd = s + text.length - (back || 0);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-key]'); if (!b) return;
    var ta = document.getElementById(b.getAttribute('data-for')), k = b.getAttribute('data-key');
    ta.focus();
    if (k === 'Tab') insert(ta, '    ');
    else if (k === '(') insert(ta, '()', 1);
    else if (k === '"') insert(ta, '""', 1);
    else if (k === '[') insert(ta, '[]', 1);
    else if (k === '{') insert(ta, '{}', 1);
    else insert(ta, k);
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.target.tagName === 'TEXTAREA' && ev.key === 'Tab') { ev.preventDefault(); insert(ev.target, '    '); }
  });
  document.addEventListener('beforeinput', function (ev) {   // keep the indent on Enter, add 4 spaces after a colon
    var ta = ev.target; if (ta.tagName !== 'TEXTAREA' || ev.inputType !== 'insertLineBreak') return;
    ev.preventDefault();
    var before = ta.value.slice(0, ta.selectionStart), line = before.slice(before.lastIndexOf('\n') + 1);
    var ind = (line.match(/^ */) || [''])[0];
    if (/:\s*$/.test(line)) ind += '    ';
    insert(ta, '\n' + ind);
  });
  document.addEventListener('input', function (ev) {         // phones turn " into curly quotes: undo that
    var ta = ev.target; if (ta.tagName !== 'TEXTAREA' && !(ta.tagName === 'INPUT' && ta.closest('.inrow'))) return;
    var v = ta.value, fixed = v.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/ /g, ' ');
    if (fixed !== v) { var p = ta.selectionStart; ta.value = fixed; ta.selectionStart = ta.selectionEnd = p; }
    var key = ta.getAttribute('data-save'); if (key) { S.code[key] = ta.value; save(); }
  });

  // ---------- screens ----------
  var cur = null; // {L, step, i, ...}
  function stepsFor(L) {
    var s = ['warm', 'why', 'watch', 'do'];
    if (L.editor) s.push('tool');
    if (L.pc) s.push('pc');
    s.push('win'); return s;
  }
  var STEP_NAME = { warm: 'Warm-up', why: 'Why', watch: 'Watch', do: 'Do', tool: 'Editor', pc: 'On the PC', win: 'Win' };

  function home() {
    cur = null; window.scrollTo(0, 0);
    var doneN = Object.keys(S.done).length, nx = nextLesson(), h = '';
    h += '<h1>Python 30</h1><p class="dim">20 minutes a morning. Real Python, right here in the page.</p>';
    h += '<div class="stats"><div class="stat"><b>' + doneN + '/' + TOTAL + '</b><span>Days</span></div><div class="stat"><b>' + (S.streak || 0) + '</b><span>Streak</span></div><div class="stat"><b>' + (S.xp || 0) + '</b><span>XP</span></div></div>';
    if (nx) h += '<button class="next" data-open="' + nx.id + '"><small>' + (doneN ? 'Continue' : 'Start here') + ': Day ' + nx.day + '</small><b>' + esc(nx.title) + '</b><span>' + esc(nx.hook) + '</span></button>';
    else if (doneN) h += '<div class="card win"><div class="big">Done.</div><p>All ' + doneN + ' days finished. Redo any day below to keep it fresh.</p></div>';
    var todo = Object.keys(S.pcTodo || {}).filter(function (id) { return S.pcTodo[id] && lesson(id); });
    if (todo.length) {
      h += '<h3>Waiting for you at the PC</h3><div class="card">' + todo.map(function (id) { var L = lesson(id); return '<div class="row" style="margin:6px 0"><span class="grow">Day ' + L.day + ': ' + esc(L.pc.title) + '</span><button class="btn sm" data-pc="' + id + '">Open</button></div>'; }).join('') + '</div>';
    }
    var tips = LESSONS.filter(function (L) { return L.editor && (S.done[L.id] || DEV); });
    if (tips.length) {
      var tried = tips.filter(function (L) { return S.ed[L.id]; }).length;
      h += '<details class="card skills"' + (S.edOpen ? ' open' : '') + '><summary><strong>Editor skills</strong> <span class="dim">' + tried + ' of ' + tips.length + ' tried at the PC</span></summary>' +
        '<p class="dim small" style="margin:10px 0 0">One small VS Code or Cursor skill per day. Tick each one after you have done it on the PC.</p>' +
        tips.map(function (L) {
          var e = L.editor;
          return '<label class="check"><input type="checkbox" data-ed="' + L.id + '"' + (S.ed[L.id] ? ' checked' : '') + '><span><strong>Day ' + L.day + ': ' + esc(e.title) + '</strong> <span class="dim small">(' + esc(e.app) + ')</span><br><span class="small">' + md(e.try) + '</span></span></label>';
        }).join('') + '</details>';
    }
    var WEEKS = ['Talk to the computer', 'Decisions and repeats', 'Holding lots of things', 'Your own tools', 'Real files', 'Work-ready kit'];
    for (var w = 1; w <= 6; w++) {
      h += '<h3>Week ' + w + ': ' + WEEKS[w - 1] + '</h3><div class="days">';
      for (var d = (w - 1) * 5 + 1; d <= w * 5; d++) {
        var L = lesson(did(d)), cls = 'day' + (d % 5 === 0 ? ' boss' : '');
        if (!L) { h += '<button class="' + cls + ' lock" disabled>' + d + '<small>soon</small></button>'; continue; }
        var open = unlocked(L);
        cls += S.done[L.id] ? ' done' : open ? (nx && nx.id === L.id ? ' now' : '') : ' lock';
        h += '<button class="' + cls + '"' + (open ? ' data-open="' + L.id + '"' : ' disabled') + ' aria-label="Day ' + d + ': ' + esc(L.title) + '">' + d + '<small>' + (S.done[L.id] ? 'done' : d % 5 === 0 ? 'boss' : open ? 'open' : 'locked') + '</small></button>';
      }
      h += '</div>';
    }
    h += '<div class="foot"><p class="dim small">Each day: warm-up, why, watch, do, win. The next day unlocks when you pass. Progress is saved on this device.</p>' +
      '<button class="btn ghost sm" data-act="reset">Reset my progress</button></div>';
    app.innerHTML = h;
  }

  function openDay(id, step) {
    var L = lesson(id); if (!L || !unlocked(L)) return home();
    var steps = stepsFor(L), at = step || S.pos[id] || 'warm';
    if (steps.indexOf(at) < 0 || at === 'win') at = 'warm';
    cur = { L: L, step: at, i: 0, picked: null, task: 0, fails: [0, 0, 0], hints: [0, 0, 0] };
    var t = S.tasks[id] || []; cur.task = Math.max(0, [0, 1, 2].filter(function (n) { return !t[n]; })[0] || 0);
    render();
  }
  function go(step) { cur.step = step; cur.i = 0; cur.picked = null; S.pos[cur.L.id] = step; save(); render(); }
  function nextStep() { var st = stepsFor(cur.L), n = st[st.indexOf(cur.step) + 1]; if (n === 'win') return finishDay(); go(n); }

  function render() {
    var L = cur.L, steps = stepsFor(L), at = steps.indexOf(cur.step), h = '';
    h += '<div class="top"><button class="btn sm ghost" data-act="home" aria-label="Back to all days">&larr;</button><div class="title">Day ' + L.day + ': ' + esc(L.title) + '</div><span class="dim small">' + STEP_NAME[cur.step] + '</span></div>';
    h += '<div class="steps">' + steps.map(function (s, n) { return '<i class="' + (n < at ? 'past' : n === at ? 'on' : '') + '"></i>'; }).join('') + '</div>';
    h += VIEW[cur.step](L);
    app.innerHTML = h;
    window.scrollTo(0, 0);
    if (cur.step === 'do' || cur.step === 'watch') { if (!worker) boot(); }
  }

  var VIEW = {
    warm: function (L) {
      var q = L.warmup[cur.i], h = '<div class="kicker">' + (L.day === 1 ? 'Before we start' : 'Warm-up') + ' ' + (cur.i + 1) + ' of 3</div><div class="card"><h2>' + md(q.q) + '</h2>';
      q.options.forEach(function (o, n) {
        var cls = 'opt'; if (cur.picked != null) { if (n === q.answer) cls += ' right'; else if (n === cur.picked) cls += ' wrong'; }
        h += '<button class="' + cls + '" data-pick="' + n + '"' + (cur.picked != null ? ' disabled' : '') + '>' + md(o) + '</button>';
      });
      if (cur.picked != null) h += '<div class="note ' + (cur.picked === q.answer ? 'good' : 'bad') + '"><strong>' + (cur.picked === q.answer ? 'Yes.' : 'Not quite.') + '</strong> ' + md(q.explain) + '</div><button class="btn primary full" data-act="warmnext">' + (cur.i < 2 ? 'Next question' : 'On to today') + '</button>';
      return h + '</div>';
    },
    why: function (L) {
      var c = L.why[cur.i], last = cur.i === L.why.length - 1;
      return '<div class="kicker">Why this exists</div><div class="card"><h2>' + esc(c.heading) + '</h2><p>' + md(c.text) + '</p></div>' +
        '<div class="dots">' + L.why.map(function (_, n) { return '<i class="' + (n === cur.i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        '<div class="row">' + (cur.i ? '<button class="btn" data-act="whyback">Back</button>' : '') + '<button class="btn primary grow" data-act="whynext">' + (last ? 'Show me an example' : 'Next') + '</button></div>';
    },
    watch: function (L) {
      var w = L.watch;
      return '<div class="kicker">Watch, then break it</div><div class="card"><p>' + md(w.intro) + '</p>' + editorHtml('code', w.code) +
        '<div class="row"><button class="btn primary grow" data-act="runwatch">Run</button><button class="btn" data-act="resetwatch">Reset</button></div>' +
        '<div class="out-label">Output</div><div class="out" id="out"><span class="wait">Tap Run.</span></div><div id="in"></div>' +
        '<ul class="clean">' + w.explain.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul>' +
        '<div class="note"><strong>Break it.</strong> ' + md(w.break_it) + '</div></div>' +
        '<button class="btn primary full" data-act="next">My turn</button>';
    },
    do: function (L) {
      var done = S.tasks[L.id] || [], n = cur.task, t = L.tasks[n], key = L.id + '-' + n;
      var code = S.code[key] != null ? S.code[key] : t.starter, all = done[0] && done[1] && done[2], h = '';
      h += '<div class="tabs">' + L.tasks.map(function (_, i) { return '<button class="tab' + (done[i] ? ' ok' : '') + (i === n ? ' on' : '') + '" data-task="' + i + '">Task ' + (i + 1) + (done[i] ? ' done' : '') + '</button>'; }).join('') + '</div>';
      h += '<div class="card"><h2>' + esc(t.title) + '</h2><p>' + md(t.task) + '</p>' + editorHtml('code', code).replace('<textarea', '<textarea data-save="' + key + '"') +
        '<div class="row"><button class="btn grow" data-act="run">Run</button><button class="btn primary grow" data-act="check">Check</button></div>' +
        '<div class="out-label">Output</div><div class="out" id="out"><span class="wait">Run shows what your code does. Check marks it.</span></div><div id="in"></div><div id="verdict"></div>' +
        '<div id="hints">' + hintsHtml(t, n) + '</div>' +
        '<div class="row" style="margin-top:12px"><button class="btn sm" data-act="hint">Hint</button><button class="btn sm" data-act="tutor">Ask the tutor</button><button class="btn sm ghost" data-act="resettask">Start again</button></div></div>';
      if (all) h += '<button class="btn good full" data-act="next">All three done. Continue</button>';
      return h;
    },
    tool: function (L) {
      var e = L.editor;
      return '<div class="kicker">' + esc(e.app) + ' minute</div><div class="card"><h2>' + esc(e.title) + '</h2><p>' + md(e.text) + '</p>' +
        '<div class="note"><strong>Next time you are at the PC (2 minutes).</strong> ' + md(e.try) + '</div>' +
        '<p class="dim small" style="margin:0">It is saved under Editor skills on the home screen. Tick it there once you have tried it.</p></div>' +
        '<button class="btn primary full" data-act="next">Got it</button>';
    },
    pc: function (L) {
      var p = L.pc, ticks = S.pc[L.id] || [], all = p.steps.every(function (_, i) { return ticks[i]; });
      return '<div class="kicker">On the PC</div><div class="card"><h2>' + esc(p.title) + '</h2><p>' + md(p.why) + '</p>' +
        p.steps.map(function (s, i) { return '<label class="check"><input type="checkbox" data-tick="' + i + '"' + (ticks[i] ? ' checked' : '') + '><span>' + md(s) + '</span></label>'; }).join('') + '</div>' +
        '<button class="btn primary full" data-act="pcdone"' + (all ? '' : ' disabled') + '>Done on the PC</button>' +
        (S.done[L.id] ? '' : '<p style="margin-top:10px"><button class="btn ghost full" data-act="pclater">I am on my phone. Save this for the PC</button></p>');
    },
    win: function (L) {
      var nx = lesson(did(L.day + 1));
      return '<div class="card win"><div class="dim small">Day ' + L.day + ' of ' + TOTAL + ' complete</div><div class="big">+' + cur.gain + ' XP</div><div class="badge">' + esc(L.badge) + '</div>' +
        '<p>Streak: <strong>' + S.streak + '</strong> ' + (S.streak === 1 ? 'day' : 'days') + '. Total: <strong>' + S.xp + ' XP</strong>.</p></div>' +
        '<div class="card"><h3 style="margin-top:0">What you now know</h3><ul class="clean">' + L.recap.map(function (r) { return '<li>' + md(r) + '</li>'; }).join('') + '</ul>' +
        '<h3>Words</h3><dl class="words">' + L.words.map(function (w) { return '<dt>' + esc(w.term) + '</dt><dd>' + md(w.meaning) + '</dd>'; }).join('') + '</dl></div>' +
        (nx ? '<p class="dim" style="text-align:center">Tomorrow: Day ' + nx.day + ', ' + esc(nx.title) + '.</p>' : '') +
        '<button class="btn primary full" data-act="home">Back to the map</button>';
    }
  };
  function hintsHtml(t, n) {
    var h = '';
    for (var i = 0; i < cur.hints[n] && i < t.hints.length; i++) h += '<div class="note"><strong>Hint ' + (i + 1) + '.</strong> ' + md(t.hints[i]) + '</div>';
    if (cur.hints[n] > t.hints.length) h += '<div class="note"><strong>The answer.</strong> Type it yourself, do not paste: typing is how it sticks.<div class="out">' + esc(t.solution) + '</div></div>';
    return h;
  }

  function finishDay() {
    var L = cur.L, first = !S.done[L.id];
    cur.gain = first ? 20 : 0;
    if (first) { S.xp += 20; cur.gain += (S.tasks[L.id] || []).filter(Boolean).length * 10 + (S.warm[L.id] || 0) * 5; bumpStreak(); S.done[L.id] = today(); }
    delete S.pos[L.id]; save();
    cur.step = 'win'; render();
  }

  function tutorText() {
    var L = cur.L, t = L.tasks[cur.task], code = document.getElementById('code').value, out = document.getElementById('out').innerText;
    return 'You are my patient Python tutor. I am a complete beginner on Day ' + L.day + ' of a 30 day course ("' + L.title + '").\n' +
      'So far I only know what a beginner knows by this day, so do not use anything more advanced.\n\n' +
      'The task: ' + t.task + '\n\nMy code:\n' + code + '\n\nWhat happened when I ran it:\n' + out + '\n\n' +
      'Tell me in simple words what is wrong and why. Give me one hint first, not the full answer. Keep it short.';
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {} ta.remove(); return Promise.resolve();
  }

  // ---------- clicks ----------
  app.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-open],[data-pc],[data-pick],[data-task],[data-act]'); if (!el || el.disabled) return;
    var a = el.getAttribute('data-act'), L = cur && cur.L, t, n;
    if (el.hasAttribute('data-open')) return openDay(el.getAttribute('data-open'));
    if (el.hasAttribute('data-pc')) return openDay(el.getAttribute('data-pc'), 'pc');
    if (el.hasAttribute('data-pick')) {
      if (cur.picked != null) return;
      cur.picked = +el.getAttribute('data-pick');
      if (cur.picked === L.warmup[cur.i].answer && !S.done[L.id]) { S.warm[L.id] = Math.min(3, (S.warm[L.id] || 0) + 1); S.xp += 5; save(); }
      return render();
    }
    if (el.hasAttribute('data-task')) { cur.task = +el.getAttribute('data-task'); return render(); }
    if (a === 'home') return home();
    if (a === 'reset') { if (confirm('Wipe all progress on this device and start from Day 1?')) { localStorage.removeItem(KEY); location.reload(); } return; }
    if (a === 'warmnext') { if (cur.i < 2) { cur.i++; cur.picked = null; return render(); } return nextStep(); }
    if (a === 'whynext') { if (cur.i < L.why.length - 1) { cur.i++; return render(); } return nextStep(); }
    if (a === 'whyback') { cur.i--; return render(); }
    if (a === 'next') return nextStep();
    if (a === 'runwatch') return void runLive(document.getElementById('code').value, L.watch.files, document.getElementById('out'), document.getElementById('in'));
    if (a === 'resetwatch') { document.getElementById('code').value = L.watch.code; return; }
    n = cur.task; t = L && L.tasks[n];
    if (a === 'run') { document.getElementById('verdict').innerHTML = ''; return void runLive(document.getElementById('code').value, (t.tests[0] || {}).files, document.getElementById('out'), document.getElementById('in')); }
    if (a === 'check') {
      var v = document.getElementById('verdict'), code = document.getElementById('code').value;
      el.disabled = true; v.innerHTML = '<div class="note">Checking...</div>';
      return void checkTask(code, t).then(function (r) {
        if (!cur || cur.L !== L || cur.task !== n) return;
        if (r.ok) {
          var arr = S.tasks[L.id] || (S.tasks[L.id] = []), first = !arr[n]; arr[n] = true; if (first && !S.done[L.id]) S.xp += 10; save();
          var left = [0, 1, 2].filter(function (i) { return !arr[i]; });
          if (left.length) { cur.task = left[0]; render(); toast('Task ' + (n + 1) + ' passed. +10 XP'); }
          else { render(); toast('All three passed.'); window.scrollTo(0, document.body.scrollHeight); }
        } else {
          cur.fails[n]++; el.disabled = false;
          v.innerHTML = '<div class="note bad"><strong>Not yet.</strong> ' + r.html + (cur.fails[n] >= 2 && cur.hints[n] <= t.hints.length ? '<p style="margin:8px 0 0">Stuck? Tap <strong>Hint</strong>.</p>' : '') + '</div>';
        }
      });
    }
    if (a === 'hint') { if (cur.hints[n] <= t.hints.length) cur.hints[n]++; document.getElementById('hints').innerHTML = hintsHtml(t, n); return; }
    if (a === 'resettask') { if (confirm('Put the starting code back?')) { delete S.code[L.id + '-' + n]; save(); render(); } return; }
    if (a === 'tutor') return void copy(tutorText()).then(function () {
      document.getElementById('verdict').innerHTML = '<div class="note"><strong>Copied.</strong> Your task, code and error are on the clipboard. Open Claude, choose the Haiku model, paste, send. <a href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude</a></div>';
    });
    if (a === 'pcdone') { delete S.pcTodo[L.id]; save(); if (S.done[L.id]) { toast('PC part done.'); return home(); } return finishDay(); }
    if (a === 'pclater') { S.pcTodo[L.id] = true; save(); return finishDay(); }
  });
  app.addEventListener('change', function (ev) {
    var el = ev.target; if (!el.hasAttribute) return;
    if (el.hasAttribute('data-ed')) { S.ed[el.getAttribute('data-ed')] = el.checked; S.edOpen = true; save(); return home(); }
    if (!el.hasAttribute('data-tick')) return;
    var arr = S.pc[cur.L.id] || (S.pc[cur.L.id] = []); arr[+el.getAttribute('data-tick')] = el.checked; save();
    var all = cur.L.pc.steps.every(function (_, i) { return arr[i]; });
    app.querySelector('[data-act="pcdone"]').disabled = !all;
  });

  if (DEV) window.P30_TEST = { checkTask: checkTask, runPy: runPy };
  if (!LESSONS.length) app.innerHTML = '<p class="boot">No lessons found. Run tools\\verify.py to build them.</p>';
  else home();
})();
