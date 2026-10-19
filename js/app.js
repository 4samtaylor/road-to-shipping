/* ─────────────────────────────────────────────────────────────
   v9 FRAME LOGIC — everything is derived from the document, so
   adding a phase or a task needs no changes here.
   ───────────────────────────────────────────────────────────── */
(function () {
'use strict';

var KEY = window.RTS_KEY || 'roadmap_v3';
var TOPBAR = 54;
var MIN_PER_TASK = 25;
var TASK = '.task:not([data-optional])';   // stretch tasks don't count toward progress

var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* ─── STATE ─── */
var state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
if (!state._notes) state._notes = {};

var saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function () {
    $$('.task[data-id]').forEach(function (t) { state[t.dataset.id] = t.classList.contains('done'); });
    $$('.cp-item[data-id]').forEach(function (c) { state[c.dataset.id] = c.classList.contains('done'); });
    var ph = {};
    $$('.phase[id]').forEach(function (p) { ph[p.id] = p.classList.contains('open'); });
    state._phases = ph;
    state._lastVisit = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    if (window.RTS && window.RTS.onSave) window.RTS.onSave(state);
  }, 120);
}

/* ─── SECTIONS ─── */
var GROUPS = window.RTS_GROUPS || [
  ['Setup', ['setup']],
  ['Reference', ['cheatsheet']],
  ['Sessions', ['session1', 'session2']],
  ['Phases', ['phase1', 'phase2', 'phase2b', 'phase3', 'phase3b', 'phase3c', 'phase4', 'phase4b', 'phase5', 'phase6', 'phase7']],
  ['The Handoff', ['godot-bridge', 'sync-agenda']]
];
var TINT = { cheatsheet: 'purple', 'sync-agenda': 'purple', session1: 'yellow', session2: 'yellow', 'godot-bridge': 'blue' };

var sections = $$('#setup, .phase[id]').map(function (el) {
  var t = $('.phase-title', el) || $('h2', el);
  return {
    el: el,
    id: el.id,
    num: (($('.phase-n', el) || {}).textContent || '00').trim(),
    title: (t ? t.textContent : el.id).trim(),
    week: (($('.phase-week', el) || {}).textContent || '').trim(),
    isPhase: el.classList.contains('phase')
  };
});
var byId = {};
sections.forEach(function (s) { byId[s.id] = s; });

function counts(s) {
  var t = $$(TASK, s.el), c = $$('.cp-item', s.el);
  return {
    tasks: t.length, done: t.filter(function (x) { return x.classList.contains('done'); }).length,
    cps: c.length, cpsDone: c.filter(function (x) { return x.classList.contains('done'); }).length
  };
}
function fmtMins(m) {
  if (m <= 0) return '0m';
  if (m < 60) return m + 'm';
  var h = m / 60;
  return (h < 10 ? Math.round(h * 10) / 10 : Math.round(h)) + 'h';
}

/* ─── CHROME: RAIL ─── */
function buildRail() {
  var rail = $('#rail'), used = {}, html = '';
  GROUPS.forEach(function (g) {
    var items = g[1].filter(function (id) { return byId[id]; });
    if (!items.length) return;
    items.forEach(function (id) { used[id] = 1; });
    html += group(g[0], items);
  });
  var rest = sections.filter(function (s) { return !used[s.id]; }).map(function (s) { return s.id; });
  if (rest.length) html += group('More', rest);
  rail.insertAdjacentHTML('beforeend', html);
}
function group(label, ids) {
  var h = '<div class="rl-grp"><div class="rl-grp-lbl"><span>' + label + '</span></div>';
  ids.forEach(function (id) {
    var s = byId[id], c = counts(s);
    h += '<button class="rl-item' + (TINT[id] ? ' tint-' + TINT[id] : '') + '" data-go="' + id + '" id="rl-' + id + '" title="' + esc(s.title) + '">' +
      '<span class="rl-num">' + esc(s.num) + '</span>' +
      '<span class="rl-ttl">' + esc(s.title) + '</span>' +
      '<span class="rl-cnt">' + (c.tasks ? c.done + '/' + c.tasks : (s.week || '')) + '</span>' +
      '<span class="rl-bar"><i></i></span></button>';
  });
  return h + '</div>';
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* ─── CHROME: TOP BAR SEGMENTS ─── */
function buildSegments() {
  var wrap = $('#tb-seg'), h = '';
  sections.forEach(function (s) {
    var c = counts(s);
    h += '<button class="seg" data-go="' + s.id + '" data-seg="' + s.id + '" style="flex-grow:' + Math.max(1, c.tasks || 2) + '"><i></i></button>';
  });
  wrap.innerHTML = h;
}

/* ─── IN-PHASE TOC + NOTE BUTTONS ─── */
function injectPerPhase() {
  sections.forEach(function (s) {
    if (!s.isPhase) return;
    var inner = $('.phase-inner', s.el);
    if (!inner) return;
    var blocks = $$('.section-block', s.el);
    if (blocks.length > 2 && !s.staged) {
      var h = '<div class="ptoc"><span class="ptoc-lbl">In this phase</span>';
      blocks.forEach(function (b, i) {
        var hd = $('.section-block-header', b);
        if (!hd) return;
        var badge = $('.badge', hd);
        var label = badge ? badge.textContent.trim() : (hd.textContent || '').trim().slice(0, 26);
        b.dataset.blockIdx = i;
        h += '<button data-block="' + s.id + ':' + i + '" title="' + esc((hd.textContent || '').trim()) + '">' + esc(label) + '</button>';
      });
      var cp = $('.checkpoint', s.el);
      if (cp) h += '<button data-cp="' + s.id + '">Checkpoint</button>';
      inner.insertAdjacentHTML('afterbegin', h + '</div>');
    }
  });

  $$('.task[data-id]').forEach(function (t) {
    var id = t.dataset.id;
    var has = !!(state._notes[id] && state._notes[id].trim());
    t.insertAdjacentHTML('beforeend',
      '<button class="tn-btn' + (has ? ' has' : '') + '" data-note="' + id + '">' + (has ? 'note ●' : 'note') + '</button>' +
      '<div class="tn-wrap" data-nw="' + id + '"><textarea placeholder="Notes for this task — what you tried, what broke, what to ask next session."></textarea>' +
      '<div class="tn-meta"><span>Saved</span><span data-nc="' + id + '"></span></div></div>');
  });
}

/* ─── PROGRESS ─── */
function refresh() {
  var all = $$(TASK), done = all.filter(function (t) { return t.classList.contains('done'); });
  var pct = all.length ? Math.round(done.length / all.length * 100) : 0;
  $('#tb-count').innerHTML = '<b>' + done.length + '</b><em> / ' + all.length + '</em><span class="tb-x"><em> tasks</em> · <b>' + pct + '%</b></span>';
  if ($('#strip-val')) $('#strip-val').textContent = done.length + ' / ' + all.length + ' tasks · ' + pct + '%';
  $('#tb-est').innerHTML = '<em>≈</em> <b>' + fmtMins((all.length - done.length) * MIN_PER_TASK) + '</b> <em>left</em>';

  sections.forEach(function (s) {
    var c = counts(s), full = c.tasks > 0 && c.done === c.tasks;
    var item = $('#rl-' + cssId(s.id));
    if (item) {
      var cnt = $('.rl-cnt', item);
      cnt.textContent = c.tasks ? c.done + '/' + c.tasks : (s.week || '');
      cnt.classList.toggle('full', full);
      $('.rl-bar i', item).style.width = (c.tasks ? c.done / c.tasks * 100 : 0) + '%';
    }
    var cell = $('.strip-cell[data-strip="' + cssId(s.id) + '"]');
    if (cell) { cell.classList.toggle('full', full); $('.bar i', cell).style.width = (c.tasks ? c.done / c.tasks * 100 : 0) + '%'; }
    var seg = $('.seg[data-seg="' + cssId(s.id) + '"]');
    if (seg) {
      seg.classList.toggle('full', full);
      $('i', seg).style.width = (c.tasks ? c.done / c.tasks * 100 : 0) + '%';
    }
    var pp = $('.ph-prog', s.el);
    if (pp && c.tasks) {
      pp.classList.toggle('full', full);
      $('b', pp).style.width = c.done / c.tasks * 100 + '%';
      $('span', pp).textContent = c.done + '/' + c.tasks;
    }
  });

  $$('.checkpoint').forEach(function (cp) {
    var items = $$('.cp-item', cp), d = items.filter(function (i) { return i.classList.contains('done'); });
    var counter = $('.cp-counter', cp);
    if (counter) {
      counter.textContent = d.length + '/' + items.length;
      counter.classList.toggle('complete', items.length > 0 && d.length === items.length);
    }
  });

  updateDock();
  updateNext();
  if (!currentView && $('#dash')) renderDash();
  var next = nextTask();
  var btn = $('#rl-resume');
  if (next) {
    var sec = byId[(next.closest('.phase') || {}).id] || null;
    $('.rl-resume-txt', btn).innerHTML = '<b>' + esc(taskLabel(next).slice(0, 40)) + '</b><small>' + esc(sec ? sec.num + ' · ' + sec.title : 'next task') + '</small>';
    btn.style.display = 'flex';
  } else {
    $('.rl-resume-txt', btn).innerHTML = '<b>All tasks complete</b><small>ship it</small>';
  }
}
function cssId(id) { return id.replace(/([^\w-])/g, '\\$1'); }
function nextTask() {
  var t = $$(TASK).filter(function (x) { return !x.classList.contains('done'); });
  return t.length ? t[0] : null;
}
function taskLabel(t) {
  var c = $('.task-text', t) || $('.task-content', t) || t;
  var clone = c.cloneNode(true);
  $$('.task-tag, .task-time, .tn-btn, .tn-wrap, .em-ctl', clone).forEach(function (n) { n.remove(); });
  return (clone.textContent || '').trim().replace(/\s+/g, ' ');
}
function cpLabel(c) {
  var t = $('.cp-text', c) || c;
  return (t.textContent || '').trim().replace(/\s+/g, ' ');
}

/* ─── PHASE HEADER EXTRAS ─── */
function decorateHeaders() {
  sections.forEach(function (s) {
    if (!s.isPhase) return;
    var right = $('.phase-right', s.el);
    var c = counts(s);
    if (!right || !c.tasks) return;
    right.insertAdjacentHTML('afterbegin', '<div class="ph-est">' + c.tasks + ' tasks · ≈' + fmtMins(c.tasks * MIN_PER_TASK) + '</div>');
  });
}

/* ─── OPEN / SCROLL ─── */
function setOpen(phase, open) {
  if (!phase.classList.contains('phase')) return;
  phase.classList.toggle('open', open);
  updateHelpFab();
}
function goTo(id, opts) {
  opts = opts || {};
  if (!byId[id]) return;
  navigate(id);   // every section is its own page now
  save();
  if (opts.flash) flash(byId[id].el);
}
function scrollToEl(el, offset) {
  revealPage(el);   // v22: switch to the page (or drawer) that holds it first
  var y = window.pageYOffset + el.getBoundingClientRect().top - (offset || TOPBAR + 78);
  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
}
function flash(el) {
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  setTimeout(function () { el.classList.remove('flash'); }, 1700);
}
function revealTask(t) {
  var home = t.closest('.phase, #setup');
  if (home) ensureSection(home.id);
  var phase = t.closest('.phase');
  if (phase) setOpen(phase, true);
  var acc = t.closest('.acc-section');
  if (acc) acc.classList.add('open');
  revealPage(t);
  setTimeout(function () { scrollToEl(t, TOPBAR + 110); flash(t); }, 60);
}

/* ─── CLICK DELEGATION (replaces every inline handler) ─── */
document.addEventListener('click', function (e) {
  var el;
  if (document.body.classList.contains('editing') && !e.target.closest('.tb, .tb-menu, .em-bar, .rl, .pal')) return;

  if ((el = e.target.closest('[data-go]'))) { goTo(el.dataset.go); closeRailMobile(); return; }

  if ((el = e.target.closest('[data-block]'))) {
    var parts = el.dataset.block.split(':');
    var block = $$('.section-block', byId[parts[0]].el)[+parts[1]];
    if (block) {
      if (block.classList.contains('acc-section')) block.classList.add('open');
      scrollToEl(block, TOPBAR + 74); flash(block);
    }
    return;
  }
  if ((el = e.target.closest('[data-cp]'))) {
    var cp = $('.checkpoint', byId[el.dataset.cp].el);
    if (cp) { scrollToEl(cp, TOPBAR + 74); flash(cp); }
    return;
  }

  if ((el = e.target.closest('.copy-btn'))) { copyCode(el); return; }
  if ((el = e.target.closest('.prompt-text'))) { copyPrompt(el); return; }

  if ((el = e.target.closest('.tn-btn'))) {
    var w = $('.tn-wrap[data-nw="' + el.dataset.note + '"]');
    w.classList.toggle('open');
    if (w.classList.contains('open')) $('textarea', w).focus();
    return;
  }
  if (e.target.closest('.tn-wrap')) return;

  if ((el = e.target.closest('.phase-header'))) {
    if (currentView) return;
    var ph = el.closest('.phase'), opening = !ph.classList.contains('open');
    if (opening && state._solo) {
      sections.forEach(function (o) { if (o.isPhase && o.el !== ph) setOpen(o.el, false); });
      setOpen(ph, true);
      scrollToEl(ph, TOPBAR + 6);
    } else setOpen(ph, opening);
    save();
    return;
  }
  if ((el = e.target.closest('[data-help]'))) { openHelp(el.dataset.help); return; }
  if ((el = e.target.closest('[data-notes]'))) { openNotes(el.dataset.notes); return; }
  if ((el = e.target.closest('[data-stage]'))) {
    // old stage links ("phase2-practice") now name a page; "-learn" means the concept you're on (or Overview)
    var st = document.getElementById(el.dataset.stage), sid = el.dataset.stage.replace(/-(learn|trace|practice|build|review)$/, ''), sp = byId[sid];
    if (st && st.classList.contains('pg')) showPage(sid, st.dataset.pg, { push: true });
    else if (sp && sp.pages && /-learn$/.test(el.dataset.stage)) showPage(sid, sp.pages[0].rung === undefined && sp.pages[0].key !== 'overview' ? sp.pages[0].key : (sp.ladder ? 'overview' : sp.pages[0].key), { push: true });
    else if (st) { revealPage(st); scrollToEl(st, TOPBAR + 20); flash(st); }
    return;
  }
  if ((el = e.target.closest('.section-block-header'))) {
    var acc = el.closest('.acc-section');
    if (acc) acc.classList.toggle('open');
    return;
  }
  if (window.RTS && window.RTS.viewing && e.target.closest('.task, .cp-item')) { toast('Read-only: you are viewing ' + window.RTS.viewing + '\'s progress'); return; }
  if ((el = e.target.closest('.task'))) {
    if (e.target.closest('a, button, textarea, input, summary, details, pre')) return;
    el.classList.toggle('done');
    if (el.classList.contains('done')) logDone();
    refresh(); save();
    return;
  }
  if ((el = e.target.closest('.cp-item'))) {
    if (e.target.closest('a, button, summary, details')) return;
    el.classList.toggle('done');
    refresh(); save();
    return;
  }
}, false);

/* notes typing */
document.addEventListener('input', function (e) {
  var w = e.target.closest('.tn-wrap');
  if (!w) return;
  var id = w.dataset.nw, v = e.target.value;
  state._notes[id] = v;
  var btn = $('.tn-btn[data-note="' + id + '"]');
  var has = !!v.trim();
  btn.classList.toggle('has', has);
  btn.textContent = has ? 'note ●' : 'note';
  $('[data-nc="' + id + '"]').textContent = v.length ? v.length + ' chars' : '';
  save();
});

/* ─── CLIPBOARD ─── */
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  return new Promise(function (res) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta); res();
  });
}
function flashBtn(btn, ok) {
  var old = btn.textContent;
  btn.textContent = ok ? 'Copied' : 'Press ⌘C';
  setTimeout(function () { btn.textContent = old; }, 1300);
}
function copyCode(btn) {
  var pre = $('pre', btn.closest('.code-wrap'));
  if (!pre) return;
  copyText(pre.innerText || pre.textContent).then(function () { flashBtn(btn, true); }, function () { flashBtn(btn, false); });
}
function copyPrompt(el) {
  var text = (el.innerText || el.textContent).replace(/\s*COPY\s*$/, '').trim();
  copyText(text).then(function () {
    var old = el.getAttribute('data-copied');
    el.setAttribute('data-copied', '1');
    el.style.borderColor = 'var(--accent)';
    setTimeout(function () { el.style.borderColor = ''; if (!old) el.removeAttribute('data-copied'); }, 1200);
    toast('Prompt copied to clipboard');
  });
}

/* ─── TOAST ─── */
var toastTimer = null;
function toast(msg, actionLabel, action) {
  var t = $('#toast');
  $('#toast-msg').textContent = msg;
  var b = $('#toast-act');
  if (actionLabel) { b.style.display = ''; b.textContent = actionLabel; b.onclick = function () { hideToast(); action(); }; }
  else b.style.display = 'none';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, actionLabel ? 14000 : 2600);
}
function hideToast() { $('#toast').classList.remove('show'); }

/* ─── THEME ─── */
/* ─── APPEARANCE: theme + fonts (this device only) ─── */
var THEMES = [
  { id: 'dark', name: 'Neon terminal', desc: 'The original: bright green on near-black, colour-coded labels.', sw: ['#080810', '#13131f', '#00ff88', '#ff7043', '#4fc3f7'], meta: '#0e0e1a', ui: 'jetbrains', display: "'Syne', sans-serif" },
  { id: 'light', name: 'Neon light', desc: 'The original palette on a warm light background.', sw: ['#f3f2f2', '#fbfaf9', '#1c7f52', '#a9522a', '#2a6a9e'], meta: '#fbfaf9', ui: 'jetbrains', display: "'Syne', sans-serif" },
  { id: 'graphite', name: 'Graphite', desc: 'Quiet dark greys with one soft sage accent.', sw: ['#15171b', '#22262c', '#8fd3b6', '#a3aab4', '#e3e5e9'], meta: '#1c1f24', ui: 'plexsans', code: 'plexmono', display: 'var(--font-mono)' },
  { id: 'paper', name: 'Paper', desc: 'Light and calm: ink on off-white with one blue.', sw: ['#f5f5f2', '#ffffff', '#3552c9', '#5c616b', '#1c1f24'], meta: '#ffffff', ui: 'atkinson', display: 'var(--font-mono)' },
  { id: 'dusk', name: 'Dusk', desc: 'Warm brown-black with an amber accent.', sw: ['#1a1714', '#2a2520', '#e3a35a', '#b0a699', '#ede6dc'], meta: '#221e1a', ui: 'grotesk', display: "'Space Grotesk', sans-serif" },
  { id: 'blueprint', name: 'Blueprint', desc: 'The terminal feel, calmer: navy with one sky blue.', sw: ['#0f1622', '#1a2535', '#6cb6f0', '#9db0c7', '#dbe4f0'], meta: '#141d2b', ui: 'jetbrains', display: "'Syne', sans-serif" }
];
var UI_FONTS = [
  { id: 'jetbrains', name: 'JetBrains Mono', note: 'monospace', css: "'JetBrains Mono', monospace" },
  { id: 'plexsans', name: 'IBM Plex Sans', note: 'clean sans', css: "'IBM Plex Sans', sans-serif", g: 'IBM+Plex+Sans:wght@400;500;600;700' },
  { id: 'atkinson', name: 'Atkinson Hyperlegible', note: 'made for legibility', css: "'Atkinson Hyperlegible', sans-serif", g: 'Atkinson+Hyperlegible:wght@400;700' },
  { id: 'inter', name: 'Inter', note: 'popular UI sans', css: "'Inter', sans-serif", g: 'Inter:wght@400;500;600;700' },
  { id: 'lexend', name: 'Lexend', note: 'easy reading', css: "'Lexend', sans-serif", g: 'Lexend:wght@400;500;600;700' },
  { id: 'sourcesans', name: 'Source Sans 3', note: 'friendly sans', css: "'Source Sans 3', sans-serif", g: 'Source+Sans+3:wght@400;500;600;700' },
  { id: 'grotesk', name: 'Space Grotesk', note: 'geometric', css: "'Space Grotesk', sans-serif", g: 'Space+Grotesk:wght@400;500;600;700' },
  { id: 'system', name: 'System font', note: 'your device default', css: "system-ui, -apple-system, 'Segoe UI', sans-serif" }
];
var CODE_FONTS = [
  { id: 'jetbrains', name: 'JetBrains Mono', css: "'JetBrains Mono', monospace" },
  { id: 'firacode', name: 'Fira Code', css: "'Fira Code', monospace", g: 'Fira+Code:wght@400;500' },
  { id: 'plexmono', name: 'IBM Plex Mono', css: "'IBM Plex Mono', monospace", g: 'IBM+Plex+Mono:wght@400;500' },
  { id: 'sourcecode', name: 'Source Code Pro', css: "'Source Code Pro', monospace", g: 'Source+Code+Pro:wght@400;500' },
  { id: 'robotomono', name: 'Roboto Mono', css: "'Roboto Mono', monospace", g: 'Roboto+Mono:wght@400;500' }
];
function byIdIn(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
function loadFont(f) {
  if (!f || !f.g || document.querySelector('link[data-font="' + f.id + '"]')) return;
  var l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=' + f.g + '&display=swap';
  l.setAttribute('data-font', f.id);
  document.head.appendChild(l);
}
function applyAppearance() {
  var th = byIdIn(THEMES, state._theme) || THEMES[0];
  var ui = byIdIn(UI_FONTS, state._font) || byIdIn(UI_FONTS, th.ui);
  var code = byIdIn(CODE_FONTS, state._codeFont) || byIdIn(CODE_FONTS, th.code || 'jetbrains');
  var root = document.documentElement;
  // switch instantly: no element fades from the old theme's colours
  root.classList.add('no-trans');
  setTimeout(function () { root.classList.remove('no-trans'); }, 60);
  root.setAttribute('data-theme', th.id);
  loadFont(ui); loadFont(code);
  root.style.setProperty('--font-mono', ui.css);
  root.style.setProperty('--font-code', code.css);
  root.style.setProperty('--font-display', th.display);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', th.meta);
  if (window.RTSPlay && RTSPlay.refresh) { try { RTSPlay.refresh(); } catch (e) {} }   // See It Run reads its colours from the tokens
}
function setTheme(mode) {
  state._theme = byIdIn(THEMES, mode) ? mode : 'dark';
  applyAppearance();
  save();
}
function appearanceHTML() {
  var th = byIdIn(THEMES, state._theme) || THEMES[0];
  return '<div class="ap-sec"><div class="ap-lbl">Theme</div><div class="ap-themes">' + THEMES.map(function (t) {
    return '<button class="ap-theme' + (t.id === th.id ? ' on' : '') + '" data-ap-theme="' + t.id + '" aria-pressed="' + (t.id === th.id) + '">' +
      '<span class="ap-swatch" style="background:' + t.sw[0] + '">' +
      '<i style="width:38%;height:100%;background:' + t.sw[1] + '"></i><i style="width:14px;height:60%;background:' + t.sw[2] + '"></i>' +
      '<i style="width:14px;height:40%;background:' + t.sw[3] + '"></i><i style="width:14px;height:25%;background:' + t.sw[4] + '"></i></span>' +
      '<span class="ap-name">' + esc(t.name) + '</span><span class="ap-desc">' + esc(t.desc) + '</span></button>';
  }).join('') + '</div></div>' +
  '<div class="ap-sec"><div class="ap-lbl">Reading font</div><div class="ap-fonts">' +
    '<button class="ap-font' + (!state._font ? ' on' : '') + '" data-ap-font=""><span>Theme default</span><small>' + esc(byIdIn(UI_FONTS, th.ui).name) + '</small></button>' +
    UI_FONTS.map(function (f) {
      return '<button class="ap-font' + (state._font === f.id ? ' on' : '') + '" data-ap-font="' + f.id + '" style="font-family:' + f.css.replace(/"/g, '&quot;') + '"><span>' + esc(f.name) + '</span><small>' + esc(f.note) + '</small></button>';
    }).join('') + '</div></div>' +
  '<div class="ap-sec"><div class="ap-lbl">Code font</div><div class="ap-fonts">' +
    '<button class="ap-font' + (!state._codeFont ? ' on' : '') + '" data-ap-code=""><span>Theme default</span><small>' + esc(byIdIn(CODE_FONTS, th.code || 'jetbrains').name) + '</small></button>' +
    CODE_FONTS.map(function (f) {
      return '<button class="ap-font' + (state._codeFont === f.id ? ' on' : '') + '" data-ap-code="' + f.id + '" style="font-family:' + f.css.replace(/"/g, '&quot;') + '"><span>' + esc(f.name) + '</span><small>while (i &lt; 10) i++;</small></button>';
    }).join('') + '</div></div>' +
  '<div class="ap-note">Saved on this device. Fonts other than JetBrains Mono load from Google Fonts the first time you pick them.</div>';
}
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-ap-theme], [data-ap-font], [data-ap-code], [data-appearance]');
  if (!el || document.body.classList.contains('editing')) return;
  e.stopPropagation();
  if (el.hasAttribute('data-appearance')) { closeMenu(); openAppearance(); return; }
  if (el.hasAttribute('data-ap-theme')) setTheme(el.dataset.apTheme);
  else if (el.hasAttribute('data-ap-font')) { state._font = el.dataset.apFont || undefined; applyAppearance(); save(); }
  else { state._codeFont = el.dataset.apCode || undefined; applyAppearance(); save(); }
  var body = $('#fw-body'), top = body ? body.scrollTop : 0;
  fwRender();
  if (body) body.scrollTop = top;
}, true);

/* ─── v18: SETTINGS + RAIL FOOTER ─────────────────────────────
   One Settings window (the floating window) with tabs. The action
   buttons it shows are proxies for hidden buttons in #menu-src, which
   cloud.js and github.js still wire up by id, so their behaviour and
   visibility (signed in or not, GitHub connected or not) carry over.
   The rail ends in an account footer: who's signed in, sync status,
   and a Settings button.
   ───────────────────────────────────────────────────────────── */
var SET_TABS = [['appearance', 'Appearance'], ['account', 'Account'], ['editing', 'Editing'], ['data', 'Progress data'], ['keys', 'Shortcuts']];
// [source id, what it does, keep the window open after clicking]
var SET_ITEMS = {
  account: [
    ['m-account', 'Sync ticks, notes, skills and time between your PC and phone.'],
    ['m-import', 'One-time copy of progress saved to GitHub before accounts existed.'],
    ['m-signout', 'Progress stays in your account. This device goes back to local only.'],
    ['m-delete', 'Removes your account and everything synced to it. Can\u2019t be undone.']
  ],
  editing: [
    ['m-ask', 'Adds buttons that open claude.ai with your question already written. Uses your own Claude plan.', true],
    ['m-edit', 'Edit text and tasks right on the page. Press E anywhere.'],
    ['m-publish', 'Send your page edits to GitHub as a pull request.'],
    ['m-connect', 'Needed once per device before you can publish edits.'],
    ['m-download', 'Save the page with your edits as one HTML file.'],
    ['m-revert', 'Throw away edits on this device that haven\u2019t been published.']
  ],
  data: [
    ['m-export', 'Download all your progress as a JSON file.'],
    ['m-import-json', 'Load a JSON file and merge it with what\u2019s here.'],
    ['m-reset', 'Untick everything and clear notes on this device.']
  ]
};
var KEYS = [['Search', '\u2318K or /'], ['Previous / next section', '[ ]'], ['Edit mode', 'E'], ['Close a window', 'Esc']];

function acctInfo() {
  var C = window.RTS_CLOUD || {};
  var email = C.account ? C.account() : null;
  return { on: !!(C.enabled && C.enabled()), email: email, status: (($('#tb-sync') || {}).textContent || '').trim() };
}
function proxyHTML(row) {
  var src = document.getElementById(row[0]);
  if (!src || src.hidden) return '';
  var tag = $('span', src), label = (src.childNodes[0] && src.childNodes[0].nodeType === 3 ? src.childNodes[0].textContent : src.textContent).trim();
  return '<button class="set-act' + (src.classList.contains('danger') ? ' danger' : '') + '" data-proxy="' + row[0] + '"' + (row[2] ? ' data-stay' : '') + '>' +
    '<span class="set-act-l"><b>' + esc(label) + '</b><small>' + esc(row[1]) + '</small></span>' +
    (tag ? '<span class="set-act-tag">' + esc(tag.textContent) + '</span>' : '') + '</button>';
}
function settingsHTML() {
  var tab = lsGetv('rts_set_tab', 'appearance');
  if (!SET_TABS.some(function (t) { return t[0] === tab; })) tab = 'appearance';
  var h = '<div class="set-tabs" role="tablist">' + SET_TABS.map(function (t) {
    return '<button role="tab" data-settab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '"' + (t[0] === tab ? ' class="on"' : '') + '>' + t[1] + '</button>';
  }).join('') + '</div><div class="set-panel" role="tabpanel">';
  if (tab === 'appearance') h += appearanceHTML();
  else if (tab === 'keys') {
    h += '<div class="set-keys">' + KEYS.map(function (k) { return '<div><span>' + esc(k[0]) + '</span><kbd>' + esc(k[1]) + '</kbd></div>'; }).join('') + '</div>' +
      '<div class="ap-note">Keys work when you\u2019re not typing in a box.</div>';
  } else {
    if (tab === 'account') {
      var a = acctInfo();
      h += '<div class="set-who"><span class="set-av">' + esc(a.email ? a.email[0].toUpperCase() : '\u2022') + '</span><span><b>' +
        esc(a.email || (a.on ? 'Not signed in' : 'Accounts unavailable')) + '</b><small>' + esc(a.status || (a.email ? 'synced' : 'progress is saved on this device only')) + '</small></span></div>';
    }
    h += '<div class="set-acts">' + SET_ITEMS[tab].map(proxyHTML).join('') + '</div>';
    if (tab === 'account') h += '<a class="set-link" href="privacy.html">Privacy: what\u2019s stored and where \u203a</a>';
    if (tab === 'data') h += '<div class="ap-note">Theme, fonts, this tab and unpublished edits are saved per device. Ticks, notes, skills, time and the weekly checklist sync when you\u2019re signed in.</div>';
  }
  return h + '</div>';
}
function openSettings(tab) {
  if (tab) lsSetv('rts_set_tab', tab);
  closeMenu(); closeRailMobile();
  UI_FONTS.concat(CODE_FONTS).forEach(loadFont);
  fwOpen({ cls: 'fw--settings', kicker: 'Road to Shipping', title: 'Settings', html: settingsHTML }, false);
}
function openAppearance() { openSettings('appearance'); }
document.addEventListener('click', function (e) {
  var el;
  if ((el = e.target.closest('[data-settings]'))) { e.preventDefault(); e.stopPropagation(); openSettings(el.dataset.settings || ''); return; }
  if ((el = e.target.closest('[data-settab]'))) { e.stopPropagation(); lsSetv('rts_set_tab', el.dataset.settab); fwRender(); return; }
  if ((el = e.target.closest('[data-proxy]'))) {
    e.stopPropagation();
    var src = document.getElementById(el.dataset.proxy), stay = el.hasAttribute('data-stay');
    if (!src) return;
    if (!stay) fwClose();
    src.click();
    if (stay) { var body = $('#fw-body'), top = body.scrollTop; fwRender(); body.scrollTop = top; }
    return;
  }
  if ((el = e.target.closest('.rf-who'))) {
    e.stopPropagation();
    var a = acctInfo();
    if (a.on && !a.email && $('#m-account')) { closeRailMobile(); $('#m-account').click(); } else openSettings('account');
  }
}, true);

function renderRailFoot() {
  var rail = $('#rail');
  if (!rail) return;
  var f = $('#rl-foot');
  if (!f) { rail.insertAdjacentHTML('beforeend', '<div class="rl-foot" id="rl-foot"></div>'); f = $('#rl-foot'); }
  var a = acctInfo(), cls = /synced/.test(a.status) ? ' ok' : /offline|expired/.test(a.status) ? ' err' : '';
  f.innerHTML = '<button class="rf-who" title="' + (a.email ? 'Account' : 'Sign in to sync') + '"><span class="set-av">' + esc(a.email ? a.email[0].toUpperCase() : '\u2022') + '</span>' +
    '<span class="rf-txt"><b>' + esc(a.email || (a.on ? 'Sign in to sync' : 'This device only')) + '</b><small class="' + cls.trim() + '">' + esc(a.status || (a.email ? 'synced' : 'saved on this device')) + '</small></span></button>' +
    '<button class="rf-set" data-settings="" title="Settings" aria-label="Settings"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/></svg></button>';
}
(function () {
  var sync = $('#tb-sync');
  if (sync) new MutationObserver(function () { renderRailFoot(); }).observe(sync, { childList: true, characterData: true, subtree: true, attributes: true });
})();

/* ─── EXPAND / COLLAPSE / SOLO ─── */
function setAll(open) {
  sections.forEach(function (s) { if (s.isPhase) setOpen(s.el, open); });
  save();
}

/* ─── EXPORT / IMPORT / RESET ─── */
function exportState() {
  $$('.task[data-id]').forEach(function (t) { state[t.dataset.id] = t.classList.contains('done'); });
  $$('.cp-item[data-id]').forEach(function (c) { state[c.dataset.id] = c.classList.contains('done'); });
  var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'roadmap-progress-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  toast('Progress file downloaded — share it with your teammate');
}
function importState(file) {
  var r = new FileReader();
  r.onload = function () {
    var incoming;
    try { incoming = JSON.parse(r.result); } catch (e) { toast('That file is not valid progress JSON'); return; }
    if (!incoming || typeof incoming !== 'object') { toast('That file is not valid progress JSON'); return; }
    Object.keys(incoming).forEach(function (k) {
      if (k === '_notes') {
        Object.keys(incoming._notes || {}).forEach(function (n) {
          var mine = state._notes[n], theirs = incoming._notes[n];
          state._notes[n] = mine && theirs && mine !== theirs ? mine + '\n— merged —\n' + theirs : (theirs || mine);
        });
      } else if (k.charAt(0) !== '_' && incoming[k] === true) {
        state[k] = true;
      }
    });
    applyState();
    save();
    toast('Progress merged (completed tasks and notes combined)');
  };
  r.readAsText(file);
}
function resetState() {
  if (!window.confirm('Clear all completed tasks, checkpoints and notes on this device?')) return;
  state = { _notes: {}, _theme: state._theme };
  try { localStorage.removeItem(KEY); } catch (e) {}
  $$('.task.done, .cp-item.done').forEach(function (e) { e.classList.remove('done'); });
  $$('.tn-wrap textarea').forEach(function (t) { t.value = ''; });
  $$('.tn-btn').forEach(function (b) { b.classList.remove('has'); b.textContent = 'note'; });
  refresh(); save();
  toast('Progress cleared');
}
function applyState() {
  $$('.task[data-id]').forEach(function (t) { t.classList.toggle('done', !!state[t.dataset.id]); });
  $$('.cp-item[data-id]').forEach(function (c) { c.classList.toggle('done', !!state[c.dataset.id]); });
  $$('.tn-wrap').forEach(function (w) {
    var v = state._notes[w.dataset.nw] || '';
    $('textarea', w).value = v;
    var btn = $('.tn-btn[data-note="' + w.dataset.nw + '"]');
    btn.classList.toggle('has', !!v.trim());
    btn.textContent = v.trim() ? 'note ●' : 'note';
  });
  refresh();
}

/* ─── COMMAND PALETTE ─── */
var index = null, palRows = [], palSel = 0;
function buildIndex() {
  var out = [];
  sections.forEach(function (s) {
    out.push({ kind: 'phase', title: s.num + '  ' + s.title, where: s.week || '', run: function () { goTo(s.id); } });
    $$('.section-block', s.el).concat(s.help ? $$('.section-block', s.help) : [], s.notes ? $$('.section-block', s.notes) : []).forEach(function (b) {
      var hd = $('.section-block-header', b);
      if (!hd) return;
      var inHelp = !!(s.help && s.help.contains(b)), inNotes = !!(s.notes && s.notes.contains(b));
      out.push({
        kind: inHelp ? 'help' : inNotes ? 'notes' : 'section', title: (hd.textContent || '').trim().replace(/\s+/g, ' '), where: s.num + ' ' + s.title,
        run: function () {
          ensureSection(s.id);
          if (b.classList.contains('acc-section')) b.classList.add('open');
          if (inHelp) { openHelp(s.id); setTimeout(function () { b.scrollIntoView({ block: 'start' }); flash(b); }, 60); return; }
          if (inNotes) { openNotes(s.id); setTimeout(function () { b.scrollIntoView({ block: 'start' }); flash(b); }, 60); return; }
          if (s.isPhase) setOpen(s.el, true);
          setTimeout(function () { scrollToEl(b, TOPBAR + 74); flash(b); }, 60);
        }
      });
    });
    $$('.task', s.el).forEach(function (t) {
      out.push({ kind: 'task', title: taskLabel(t).slice(0, 120), where: s.num + ' ' + s.title, run: function () { revealTask(t); } });
    });
    $$('.cp-item', s.el).forEach(function (c) {
      out.push({ kind: 'check', title: cpLabel(c), where: s.num + ' ' + s.title, run: function () { revealTask(c); } });
    });
  });
  if (GLOSS) Object.keys(glossById).forEach(function (id) {
    var e = glossById[id], s = byId[e.phase];
    out.push({ kind: 'term', title: e.term + ' — ' + e.what, where: s ? s.num + ' ' + s.title : '', run: function () { openTerm(id, null); } });
  });
  return out;
}
function actions() {
  return [
    { kind: 'action', title: 'Resume — jump to next unfinished task', where: '', run: resume },
    { kind: 'action', title: 'Appearance: theme and fonts', where: '', run: openAppearance },
    { kind: 'action', title: 'Collapse all phases', where: '', run: function () { setAll(false); } },
    { kind: 'action', title: 'Expand all phases', where: '', run: function () { setAll(true); } },
    { kind: 'action', title: 'Export progress as JSON', where: '', run: exportState },
    { kind: 'action', title: 'Import a teammate’s progress', where: '', run: function () { $('#file-in').click(); } }
  ];
}
function openPal() {
  if (!index) index = buildIndex();
  $('#pal-bd').classList.add('open');
  var inp = $('#pal-in');
  inp.value = ''; inp.focus();
  renderPal('');
}
function closePal() { $('#pal-bd').classList.remove('open'); }
function renderPal(q) {
  q = q.trim().toLowerCase();
  var res;
  if (!q) {
    res = actions().concat(sections.map(function (s) {
      return { kind: 'phase', title: s.num + '  ' + s.title, where: s.week || '', run: function () { goTo(s.id); } };
    }));
  } else {
    var W = { phase: 0, action: 1, term: 2, section: 2, help: 2, notes: 2, task: 3, check: 4 };
    res = index.concat(actions()).map(function (r) {
      var i = r.title.toLowerCase().indexOf(q);
      if (i < 0) return null;
      return { r: r, score: (i === 0 ? 0 : 1) * 10 + W[r.kind] + i / 400, at: i };
    }).filter(Boolean).sort(function (a, b) { return a.score - b.score; }).slice(0, 60)
      .map(function (x) { x.r._at = x.at; return x.r; });
  }
  palRows = res; palSel = 0;
  var box = $('#pal-res');
  if (!res.length) { box.innerHTML = '<div class="pal-empty">Nothing matches “' + esc(q) + '”</div>'; return; }
  box.innerHTML = res.map(function (r, i) {
    var t = esc(r.title);
    if (q && r._at >= 0) {
      var a = esc(r.title.slice(0, r._at)), b = esc(r.title.slice(r._at, r._at + q.length)), c = esc(r.title.slice(r._at + q.length));
      t = a + '<mark>' + b + '</mark>' + c;
    }
    return '<div class="pal-row' + (i === 0 ? ' sel' : '') + '" data-i="' + i + '">' +
      '<span class="pal-kind">' + r.kind + '</span><span class="pal-ttl">' + t + '</span>' +
      '<span class="pal-where">' + esc(r.where || '') + '</span></div>';
  }).join('');
}
function movePal(d) {
  var rows = $$('.pal-row');
  if (!rows.length) return;
  palSel = (palSel + d + rows.length) % rows.length;
  rows.forEach(function (r, i) { r.classList.toggle('sel', i === palSel); });
  var sel = rows[palSel];
  sel.parentNode.scrollTop = Math.max(0, sel.offsetTop - 90);
}
function runPal(i) {
  var r = palRows[i];
  if (!r) return;
  closePal();
  setTimeout(r.run, 40);
}
$('#pal-in').addEventListener('input', function (e) { renderPal(e.target.value); });
$('#pal-res').addEventListener('click', function (e) {
  var row = e.target.closest('.pal-row');
  if (row) runPal(+row.dataset.i);
});
$('#pal-bd').addEventListener('mousedown', function (e) { if (e.target.id === 'pal-bd') closePal(); });

/* ─── RESUME ─── */
function resume() {
  var t = nextTask();
  if (!t) { toast('Every task is checked off. Ship it.'); return; }
  revealTask(t);
}

/* ─── SCROLL SPY ─── */
var spyPending = false, lastSpy = '';
function spy() {
  var cur = byId[currentView] || sections[0];
  if (cur.id !== lastSpy) {
    lastSpy = cur.id;
    $$('.rl-item').forEach(function (i) { i.classList.toggle('on', i.dataset.go === cur.id); });
    $$('.seg').forEach(function (i) { i.classList.toggle('on', i.dataset.seg === cur.id); });
    $$('.strip-cell').forEach(function (i) { i.classList.toggle('on', i.dataset.strip === cur.id); });
    updateDock();
    updateHelpFab();
    renderDockSheet();
    state._lastId = cur.id;
  }
  var h = document.documentElement.scrollHeight - window.innerHeight;
  $('#readbar').style.width = (h > 0 ? window.pageYOffset / h * 100 : 0) + '%';
  state._scroll = window.pageYOffset;
  spyPending = false;
}
window.addEventListener('scroll', function () {
  if (!spyPending) { spyPending = true; requestAnimationFrame(spy); }
}, { passive: true });
var scrollSaveTimer = setInterval(save, 4000);

/* ─── SEGMENT TOOLTIP ─── */
var tip = $('#seg-tip');
$('#tb-seg').addEventListener('mousemove', function (e) {
  var seg = e.target.closest('.seg');
  if (!seg) { tip.classList.remove('show'); return; }
  var s = byId[seg.dataset.seg], c = counts(s);
  tip.innerHTML = '<b>' + esc(s.num) + '</b> ' + esc(s.title) + (c.tasks ? ' — ' + c.done + '/' + c.tasks + ' tasks' : '') + (s.week ? ' · ' + esc(s.week) : '');
  var r = seg.getBoundingClientRect();
  tip.style.left = Math.min(window.innerWidth - 300, Math.max(8, r.left)) + 'px';
  tip.classList.add('show');
});
$('#tb-seg').addEventListener('mouseleave', function () { tip.classList.remove('show'); });

/* ─── KEYBOARD ─── */
document.addEventListener('keydown', function (e) {
  var typing = /^(input|textarea)$/i.test((e.target.tagName || '')) || e.target.isContentEditable;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPal(); return; }
  if ($('#pal-bd').classList.contains('open')) {
    if (e.key === 'Escape') { closePal(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); movePal(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); movePal(-1); return; }
    if (e.key === 'Enter') { e.preventDefault(); runPal(palSel); return; }
    return;
  }
  if (typing) return;
  if (e.key === '/') { e.preventDefault(); openPal(); return; }
  if (e.key.toLowerCase() === 'e' && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setEditing(!document.body.classList.contains('editing')); return; }
  if (e.key === 'Escape') { closeMenu(); closeRailMobile(); closeHelp(); closeNotes(); hideToast(); return; }
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
      !document.body.classList.contains('editing') && !($('#fw') && !$('#fw').hidden) && !e.target.closest('select, [role="slider"]')) {
    var sc = byId[currentView];
    if (sc && sc.pages && pageStep(e.key === 'ArrowRight' ? 1 : -1)) e.preventDefault();
    return;
  }
  if (e.key === ']' || e.key === '[') {
    e.preventDefault();
    var i = sections.findIndex(function (s) { return s.id === lastSpy; });
    if (i < 0) i = 0;
    var n = sections[Math.min(sections.length - 1, Math.max(0, i + (e.key === ']' ? 1 : -1)))];
    if (n) goTo(n.id);
  }
}, false);

/* ─── MENU / RAIL / BUTTONS ─── */
function closeMenu() { $('#tb-menu').classList.remove('open'); }
function closeRailMobile() { document.body.classList.remove('rail-open'); }
$('#tb-more').addEventListener('click', function (e) { e.stopPropagation(); $('#tb-menu').classList.toggle('open'); });
document.addEventListener('click', function (e) {
  if (!e.target.closest('.tb-menu-wrap')) closeMenu();
  if (document.body.classList.contains('rail-open') && !e.target.closest('.rl, #tb-rail')) closeRailMobile();
});
$('#tb-rail').addEventListener('click', function () {
  if (window.matchMedia('(max-width: 860px)').matches) document.body.classList.toggle('rail-open');
  else document.body.classList.toggle('rail-off');
});
$('#tb-theme').addEventListener('click', function () { openSettings('appearance'); });
$('#tb-search').addEventListener('click', openPal);
$('#rl-resume').addEventListener('click', resume);
if ($('#m-solo')) $('#m-solo').addEventListener('click', function () {
  state._solo = !state._solo;
  $('#m-solo span').textContent = state._solo ? 'on' : 'off';
  if (state._solo && lastSpy) goTo(lastSpy);
  save(); closeMenu();
});
$('#m-export').addEventListener('click', function () { exportState(); closeMenu(); });
$('#m-import-json').addEventListener('click', function () { $('#file-in').click(); closeMenu(); });
$('#m-reset').addEventListener('click', function () { closeMenu(); resetState(); });
$('#file-in').addEventListener('change', function (e) { if (e.target.files[0]) importState(e.target.files[0]); e.target.value = ''; });
$('#toast-x').addEventListener('click', hideToast);



/* ─── ROADMAP STRIP ─── */
function buildStrip() {
  var hero = $('.hero');
  if (!hero) return;
  var h = '<div class="strip"><div class="strip-hd"><span class="lbl">The whole road</span><span class="val" id="strip-val"></span></div><div class="strip-row">';
  sections.forEach(function (s) {
    h += '<button class="strip-cell" data-strip="' + s.id + '" data-go="' + s.id + '" title="' + esc(s.num + ' · ' + s.title + (s.week ? ' · ' + s.week : '')) + '">' +
      '<span class="n">' + esc(s.num) + '</span><span class="bar"><i></i></span></button>';
  });
  var weeks = sections.filter(function (s) { return /week/i.test(s.week); });
  var first = weeks[0];
  var last = weeks[weeks.length - 1];
  h += '</div><div class="strip-weeks"><span>' + esc(first ? first.week : 'Start') + '</span><span>Setup → Hello World → Systems → Godot</span><span>' + esc(last ? last.week : 'Ship') + '</span></div></div>';
  hero.insertAdjacentHTML('afterend', h);
}

/* ─── RIGHT DOCK ─── */
function buildDock() {
  var shell = $('.shell');
  shell.insertAdjacentHTML('beforeend',
    '<aside class="dock" id="dock">' +
    '<div class="dk-sec"><div class="dk-lbl"><span>This session</span><b id="dk-closed"></b></div>' +
    '<button class="dk-card dk-session" data-time title="Where your time went"><div class="dk-clock" id="dk-clock">0m</div><div class="dk-sub" id="dk-sub"></div></button></div>' +
    '<div class="dk-sec"><div class="dk-lbl"><span>Library</span><b id="dk-sheet-where"></b></div><div id="dk-sheet" class="dk-sheet"></div></div>' +
    '<div class="dk-sec"><div class="dk-lbl"><span>Session scratchpad</span></div>' +
    '<textarea id="dk-pad" placeholder="Loose thoughts, errors to chase, questions for next session."></textarea></div>' +
    '<div class="dk-sec"><div class="dk-lbl"><span>Next checkpoint</span></div><div class="dk-card dk-cp" id="dk-cp"></div></div>' +
    '<div class="dk-sec"><div class="dk-lbl"><span>Prompts for this phase</span></div><div id="dk-prompts"></div></div>' +
    '</aside>');
  document.body.classList.add('has-dock');
  $('#dk-pad').value = state._scratch || '';
  $('#dk-pad').addEventListener('input', function (e) { state._scratch = e.target.value; save(); });
}
function promptsIn(o) { return o ? $$('.prompt-item', o.el).concat(o.help ? $$('.prompt-item', o.help) : []) : []; }
function updateDock() {
  if (!$('#dock')) return;
  var t = nextTask();
  var sec = t ? byId[(t.closest('.phase') || {}).id] : null;

  var here = byId[lastSpy] || sec || sections[0];
  var cp = null;
  if (here) cp = $$('.cp-item', here.el).filter(function (c) { return !c.classList.contains('done'); })[0];
  if (!cp) cp = $$('.cp-item').filter(function (c) { return !c.classList.contains('done'); })[0];
  $('#dk-cp').innerHTML = cp ? esc(cpLabel(cp).slice(0, 190)) : '<em>All checkpoints cleared.</em>';

  var host = promptsIn(here).length ? here : (promptsIn(sec).length ? sec : null);
  var prompts = promptsIn(host).slice(0, 3);
  $('#dk-prompts').innerHTML = prompts.length ? prompts.map(function (p, i) {
    var lbl = ($('.prompt-label', p) || {}).textContent || 'Prompt';
    return '<button class="dk-prompt" data-dkp="' + i + '">' + esc(lbl.trim().slice(0, 90)) + '<span>click to copy</span></button>';
  }).join('') : '<div class="dk-cp"><em>No prompts in this section.</em></div>';
  $('#dk-prompts').dataset.host = host ? host.id : '';
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-dkp]');
  if (!b) return;
  var host = byId[$('#dk-prompts').dataset.host];
  if (!host) return;
  var p = promptsIn(host)[+b.dataset.dkp];
  var txt = $('.prompt-text', p);
  if (txt) copyPrompt(txt);
});

/* ─── SESSION LOG ─── */
function logDone() {
  var d = new Date().toISOString().slice(0, 10);
  if (!state._log) state._log = {};
  state._log[d] = (state._log[d] || 0) + 1;
  if (state._logDay !== d) { state._logDay = d; state._closed = 0; }
  state._closed = (+state._closed || 0) + 1;
  save();
  renderLog();
}
function renderLog() {
  var box = $('#rl-log');
  if (!box) return;
  var days = Object.keys(state._log || {}).sort().reverse().slice(0, 6);
  if (!days.length) {
    box.innerHTML = '<div class="rl-log-lbl">Session log</div><div class="rl-log-empty">Tasks you close will show up here, day by day.</div>';
    return;
  }
  var max = Math.max.apply(null, days.map(function (d) { return state._log[d]; }));
  box.innerHTML = '<div class="rl-log-lbl">Session log</div>' + days.map(function (d) {
    var n = state._log[d];
    var lbl = new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return '<div class="rl-log-row"><b>' + lbl + '</b><i style="width:' + Math.round(n / max * 92) + 'px"></i>' + n + '</div>';
  }).join('');
}

/* ─── WHAT'S NEXT ─── */
function buildNext() {
  var main = $('.main');
  main.insertAdjacentHTML('beforeend',
    '<div class="wn"><div class="kick">Where you are</div><h3 id="wn-h">Next up</h3>' +
    '<div class="wn-grid">' +
    '<div class="wn-item"><div class="k">Next task</div><div class="v" id="wn-task"></div></div>' +
    '<div class="wn-item"><div class="k">Next checkpoint</div><div class="v" id="wn-cp"></div></div>' +
    '<div class="wn-item"><div class="k">Remaining</div><div class="v" id="wn-rem"></div></div>' +
    '<div class="wn-item"><div class="k">Phases cleared</div><div class="v" id="wn-ph"></div></div>' +
    '</div><div class="wn-act">' +
    '<button class="tb-btn primary" id="wn-go">Take me there</button>' +
    '<button class="tb-btn" id="wn-top">Back to top</button>' +
    '<button class="tb-btn" id="wn-search">Search everything <kbd>⌘K</kbd></button>' +
    '</div></div>');
  $('#wn-go').addEventListener('click', resume);
  $('#wn-top').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('#wn-search').addEventListener('click', openPal);
}
function updateNext() {
  if (!$('#wn-task')) return;
  var t = nextTask();
  var sec = t ? byId[(t.closest('.phase') || {}).id] : null;
  $('#wn-h').textContent = t ? (sec ? sec.num + ' · ' + sec.title : 'Next up') : 'Roadmap complete';
  $('#wn-task').innerHTML = t ? esc(taskLabel(t).slice(0, 130)) : '<em>Nothing left.</em>';
  var cp = $$('.cp-item').filter(function (c) { return !c.classList.contains('done'); })[0];
  $('#wn-cp').innerHTML = cp ? esc(cpLabel(cp).slice(0, 130)) : '<em>All cleared.</em>';
  var all = $$(TASK), done = all.filter(function (x) { return x.classList.contains('done'); });
  $('#wn-rem').innerHTML = (all.length - done.length) + ' tasks <em>· ≈' + fmtMins((all.length - done.length) * MIN_PER_TASK) + ' of work</em>';
  var ph = sections.filter(function (s) { var c = counts(s); return c.tasks > 0; });
  var cleared = ph.filter(function (s) { var c = counts(s); return c.done === c.tasks; });
  $('#wn-ph').innerHTML = cleared.length + ' of ' + ph.length + ' <em>· ' + (state._log ? Object.keys(state._log).length : 0) + ' working days logged</em>';
}

/* ─── v22: PAGES INSIDE PHASES ────────────────────────────────
   A phase is no longer one long scroll. Each phase with a concept
   ladder is an ordered list of pages:
     Overview · Concept 1…N · Trace · Build · Practice · Review
   Overview is the table of contents (goals, concepts, later pages,
   King reading, one Start / Continue button). A concept page is one
   ladder rung plus the blocks tagged data-page="concept:<rungId>".
   Every other top-level block of the phase carries data-page =
   overview | concept:<rungId> | trace | build | practice | review |
   notes | help. "notes" blocks live in the Section notes drawer and
   "help" blocks in the Stuck? drawer (same pattern, both outside the
   page). A block with no data-page falls back to the old badge rule
   (stageOf: learn → notes, so the app works with either state of the
   content). Pages with no blocks are skipped; phases without a ladder
   get Learn / Trace / Build / Practice / Review pages the same way.
   All blocks stay in the DOM (non-current pages are `hidden`), so
   task counts, progress, search, the library and sync keep working;
   anything that scrolls to an element switches to its page first
   (revealPage). The saved page is state._pages[pid]; the URL is
   #/<pid>/<key> (overview, 1…N, trace, build, practice, review).
   Content files stay untouched by this code: blocks move after
   markAnchors(), so edit keys (phase:blkN) still map to the source.
   ───────────────────────────────────────────────────────────── */
var LATER = ['trace', 'build', 'practice', 'review'];
var PAGE_NAMES = { overview: 'Overview', learn: 'Learn', trace: 'Trace', build: 'Build', practice: 'Practice', review: 'Review' };
var PAGE_HINTS = { trace: 'predict the output', build: 'starter code and setup', practice: 'tasks', review: 'quiz and checkpoint' };
function stageOf(block) {
  var b = (($('.badge', block) || {}).textContent || '').trim().toLowerCase();
  if (/^stuck|claude code prompts/.test(b)) return 'help';
  if (/predict/.test(b)) return 'trace';
  if (/^tasks|^exercises|^build spec/.test(b)) return 'practice';
  if (/starter code|^git|build\.bat|tooling|prompt templates|^build|^stretch/.test(b)) return 'build';
  if (/quiz|mixed review/.test(b)) return 'review';
  return 'learn';
}
function pageOf(k) {
  var p = ((k.dataset && k.dataset.page) || '').trim();
  if (p) return p;
  if (k.classList.contains('checkpoint')) return 'review';
  if (k.classList.contains('section-block')) { var st = stageOf(k); return st === 'learn' ? 'notes' : st; }
  return 'notes';
}
function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
function stageSize(key, els) {
  var box = document.createElement('div');
  els.forEach(function (e) { box.appendChild(e.cloneNode(true)); });
  if (key === 'learn') {
    var words = (box.textContent.match(/\S+/g) || []).length;
    return plural(els.length, 'read') + ' · ~' + Math.max(1, Math.round(words / 200)) + ' min';
  }
  if (key === 'trace') {
    var d = $$('.quiz-item', box).length;
    return plural(d, 'drill') + ' · ~' + Math.max(5, Math.round(d * 2.5)) + ' min';
  }
  if (key === 'practice') {
    var t = $$(TASK, box).length, m = 0;
    $$(TASK + ' .task-time', box).forEach(function (x) {
      var n = /(\d+(?:\.\d+)?)\s*(h|min)/i.exec(x.textContent);   // "~20 min", "~1.5 hrs"
      if (n) m += /^h/i.test(n[2]) ? Math.round(+n[1] * 60) : +n[1];
    });
    m = m || t * MIN_PER_TASK;
    return t ? plural(t, 'task') + ' · ~' + (m < 120 ? m + ' min' : fmtMins(m)) : plural($$('.quiz-item', box).length, 'exercise');
  }
  if (key === 'build') {
    var c = $$('.code-wrap', box).length, x = $$('.task[data-optional]', box).length;
    return (c ? plural(c, 'file') + ' · ' : '') + plural(els.length, 'section') + (x ? ' · ' + x + ' stretch' : '');
  }
  var q = $$('.quiz-item', box).length, cp = $$('.cp-item', box).length;
  return [q ? plural(q, 'question') : '', cp ? plural(cp, 'check') : ''].filter(Boolean).join(' · ');
}
function stagePhase(s) {
  var inner = $('.phase-inner', s.el);
  if (!inner || !$('.tasks, .checkpoint', inner)) return;
  var bins = {};
  Array.prototype.slice.call(inner.children).forEach(function (k) {
    var p = pageOf(k);
    (bins[p] = bins[p] || []).push(k);
  });
  // within a page, source order wins unless a block asks to go first (data-order="-1");
  // the checkpoint always closes Review
  var weight = function (k) { return k.classList.contains('checkpoint') ? 99 : +(k.dataset.order || 0); };
  Object.keys(bins).forEach(function (key) {
    bins[key] = bins[key].map(function (k, i) { return [k, i]; })
      .sort(function (a, b) { return weight(a[0]) - weight(b[0]) || a[1] - b[1]; })
      .map(function (x) { return x[0]; });
  });
  s.ladder = !!s.el.dataset.ladder;
  s.bins = bins;
  s.cps = $$('.cp-item', inner).map(function (c) { return [($('.cp-text', c) || c).textContent.trim(), c.dataset.id || '']; });

  var html = '<div class="ph-time" data-time role="button" tabindex="0" title="Where your time went"></div>' +
    '<div class="pg-top"><nav class="pg-strip" aria-label="Pages in this phase"></nav>' +
    '<div class="stage-nav pg-tools" aria-label="Phase tools">' +
    '<button class="stage-notes" data-notes="' + s.id + '" hidden>Section notes</button>' +
    '<button class="stage-help" data-help="' + s.id + '"' + ((bins.help || []).length ? '' : ' hidden') + '>Stuck? Help</button></div></div>' +
    '<div class="pg-area" data-phase="' + s.id + '">' + (s.ladder ? '<div class="pg-loading">Loading concepts…</div>' : '') + '</div>' +
    '<nav class="pg-foot" aria-label="Previous and next page"></nav>' +
    '<div class="pg-hold" hidden></div>';
  Array.prototype.slice.call(inner.children).forEach(function (k) { k.remove(); });
  inner.innerHTML = html;
  var hold = $('.pg-hold', inner);
  Object.keys(bins).forEach(function (key) {
    if (key === 'help') return;
    bins[key].forEach(function (e) { hold.appendChild(e); });
  });

  if ((bins.help || []).length) {
    var set = document.createElement('div');
    set.className = 'help-set';
    set.hidden = true;
    bins.help.forEach(function (b) { b.classList.add('open'); set.appendChild(b); });
    $('#help-body').appendChild(set);
    s.help = set;
  }
  s.staged = true;
  s.hasPages = true;
  if (!s.ladder) buildPages(s);
}
function stageAll() { sections.forEach(function (s) { if (s.isPhase) stagePhase(s); }); }

/* notes drawer: a sibling of the help drawer, created here so index.html stays as it is */
function ensureNotesDrawer() {
  if ($('#notes')) return;
  $('#help').insertAdjacentHTML('afterend',
    '<aside class="help notes" id="notes" role="dialog" aria-modal="false" aria-labelledby="notes-title" hidden>' +
    '<div class="help-hd"><div><div class="help-kick">Section notes</div><h2 id="notes-title"></h2></div>' +
    '<button class="icb" id="notes-x" aria-label="Close section notes">✕</button></div>' +
    '<div class="help-body" id="notes-body"></div></aside>');
  $('#notes-x').addEventListener('click', closeNotes);
}
function notesSet(s) {
  if (s.notes) return s.notes;
  ensureNotesDrawer();
  var set = document.createElement('div');
  set.className = 'notes-set';
  set.hidden = true;
  set.dataset.phase = s.id;
  $('#notes-body').appendChild(set);
  s.notes = set;
  return set;
}
function toNotes(s, els) {
  if (!els.length) return;
  var set = notesSet(s);
  els.forEach(function (b) { if (b.classList.contains('section-block')) b.classList.add('open'); set.appendChild(b); });
}

function pageId(s, key, rung) { return s.id + '-' + (rung !== undefined ? 'c' + (rung + 1) : key); }
function buildPages(s) {
  var area = $('.pg-area', s.el), hold = $('.pg-hold', s.el), bins = s.bins, d = s.ladder && LADDERS[s.id], pages = [];
  if (!area) return;
  area.innerHTML = '';
  var mk = function (key, rung, label) {
    var el = document.createElement('section');
    el.className = 'pg' + (rung !== undefined ? ' pg-concept' : key === 'overview' ? ' pg-overview' : '');
    el.id = pageId(s, key, rung);
    el.dataset.pg = key; el.dataset.phase = s.id; el.hidden = true;
    area.appendChild(el);
    var pg = { key: key, label: label || PAGE_NAMES[key] || key, el: el, rung: rung };
    pages.push(pg);
    return pg;
  };
  var put = function (host, els) { (els || []).forEach(function (e) { host.appendChild(e); }); };
  var head = function (pg, els) {
    pg.size = stageSize(pg.key, els);
    pg.count = els.length;
    pg.el.insertAdjacentHTML('afterbegin', '<div class="stage-hd"><span class="stage-name">' + esc(pg.label) + '</span>' +
      (PAGE_HINTS[pg.key] ? '<span class="stage-hint">' + esc(PAGE_HINTS[pg.key]) + '</span>' : '') +
      '<span class="stage-size">' + esc(pg.size) + '</span></div>');
    put(pg.el, els);
  };
  var used = { help: 1, notes: 1 };
  if (d) {
    var ov = mk('overview');
    ov.el.innerHTML = '<div class="pg-ov-gen"></div><div class="pg-ov-blocks"></div>';
    put($('.pg-ov-blocks', ov.el), bins.overview); used.overview = 1;
    d.rungs.forEach(function (r, k) {
      var pg = mk(String(k + 1), k, 'Concept ' + (k + 1));
      pg.title = r.title;
      pg.el.innerHTML = '<div class="lad" data-ladder-mount="' + esc(s.id) + '" data-rung="' + k + '"></div><div class="pg-cblocks"></div>';
      var mine = bins['concept:' + r.id] || [];
      mine.forEach(function (b) { if (b.classList.contains('acc-section') && $('.task', b)) b.classList.add('open'); });
      put($('.pg-cblocks', pg.el), mine); used['concept:' + r.id] = 1;
    });
    LATER.forEach(function (key) {
      if (!(bins[key] || []).length) return;
      head(mk(key), bins[key]); used[key] = 1;
    });
    // anything tagged for a page that doesn't exist goes to the notes drawer so nothing is lost
    Object.keys(bins).forEach(function (key) { if (!used[key]) toNotes(s, bins[key]); });
    toNotes(s, bins.notes || []);
  } else {
    // no ladder (or it failed to load): Learn · Trace · Build · Practice · Review
    var learn = [];
    ['overview', 'learn'].forEach(function (k) { learn = learn.concat(bins[k] || []); used[k] = 1; });
    Object.keys(bins).forEach(function (key) { if (/^concept:/.test(key)) { learn = learn.concat(bins[key]); used[key] = 1; } });
    learn = learn.concat(bins.notes || []);
    if (s.notes) learn = learn.concat(Array.prototype.slice.call(s.notes.children));
    if (s.notes) { s.notes.remove(); s.notes = null; }
    if (learn.length) head(mk('learn'), learn);
    LATER.forEach(function (key) { if ((bins[key] || []).length) { head(mk(key), bins[key]); used[key] = 1; } });
    if (pages[0] && s.cps.length) pages[0].el.insertAdjacentHTML('afterbegin', goalsHTML(s, null));
  }
  s.pages = pages;
  var nb = $('.stage-notes', s.el);
  if (nb) nb.hidden = !s.notes;
  if (hold && !hold.children.length) hold.remove();
  if (currentView === s.id) showPage(s.id, s.want, { keepScroll: true });
  index = null;
}
function pageIndex(s, key) {
  for (var i = 0; i < s.pages.length; i++) if (s.pages[i].key === String(key)) return i;
  return -1;
}
function savedPage(s) {
  if (!state._pages || typeof state._pages !== 'object') state._pages = {};
  var k = state._pages[s.id];
  return k !== undefined && pageIndex(s, k) >= 0 ? String(k) : s.pages[0].key;
}
function closePlay(root) {
  if (!window.RTSPlay || !RTSPlay.close) return;
  $$('.lad-play-host', root).forEach(function (h) { try { RTSPlay.close(h); } catch (e) {} });
}
function pageHash(pid, key) { return '#/' + encodeURIComponent(pid) + '/' + encodeURIComponent(key); }
function showPage(pid, key, o) {
  o = o || {};
  var s = byId[pid];
  if (!s || !s.pages || !s.pages.length) return;
  var i = key !== undefined && key !== null && key !== '' ? pageIndex(s, key) : -1;
  if (i < 0) i = pageIndex(s, savedPage(s));
  var pg = s.pages[i];
  s.pages.forEach(function (p) {
    if (p !== pg && !p.el.hidden) closePlay(p.el);
    p.el.hidden = p !== pg;
  });
  s.want = undefined;
  if (pg.rung === undefined || ladState(pid).cur !== pg.rung) ladUI(pid).watch = null;   // the player closes when the concept or page changes
  if (!state._pages || typeof state._pages !== 'object') state._pages = {};
  state._pages[pid] = pg.key;
  if (pg.rung !== undefined) ladState(pid).cur = pg.rung;
  if (pg.rung !== undefined) renderLadder(pid);
  else if (pg.key === 'overview') renderOverview(pid);
  renderStrip(s);
  renderFoot(s);
  if (currentView === pid) {
    var h = pageHash(pid, pg.key);
    if (location.hash !== h) {
      try { if (o.push) history.pushState(null, '', h); else history.replaceState(null, '', h); } catch (e) {}
    }
  }
  if (!o.keepScroll) {
    var anchor = $('.pg-top', s.el) || pg.el, hd = $('.phase-header', s.el);   // the phase header is sticky: land just under it
    window.scrollTo(0, Math.max(0, window.pageYOffset + anchor.getBoundingClientRect().top - (TOPBAR + (hd ? hd.offsetHeight : 0) + 10)));
  }
  libRender();
  save();
}
// make sure the page holding `el` is showing (called before anything scrolls to it)
function revealPage(el) {
  if (!el || !el.closest) return;
  var pg = el.closest('.pg');
  if (pg && pg.hidden) {
    var s = byId[pg.dataset.phase];
    if (s && currentView !== s.id) navigate(s.id);
    showPage(pg.dataset.phase, pg.dataset.pg, { push: true, keepScroll: true });
    return;
  }
  var ns = el.closest('.notes-set');
  if (ns) { openNotes(ns.dataset.phase); return; }
  var hs = el.closest('.help-set');
  if (hs) { var hp = sections.filter(function (x) { return x.help === hs; })[0]; if (hp) openHelp(hp.id); }
}
function renderStrip(s) {
  var strip = $('.pg-strip', s.el);
  if (!strip || !s.pages) return;
  if (s.pages.length < 2) { strip.innerHTML = ''; strip.hidden = true; return; }
  strip.hidden = false;
  var cur = savedPage(s), l = s.ladder && LADDERS[s.id] ? ladState(s.id) : null, h = '', sep = false;
  s.pages.forEach(function (p) {
    var isC = p.rung !== undefined, done = isC && l && l.done[LADDERS[s.id].rungs[p.rung].id];
    if (!isC && p.key !== 'overview' && !sep && s.ladder) { h += '<span class="pg-sep" aria-hidden="true"></span>'; sep = true; }
    h += '<button class="pg-b' + (isC ? ' pg-n' : '') + (p.key === cur ? ' cur' : '') + (done ? ' done' : '') + '" data-pg-go="' + p.key + '"' +
      (p.key === cur ? ' aria-current="page"' : '') + (isC ? ' title="' + esc(p.title || '') + '" aria-label="Concept ' + (p.rung + 1) + (p.title ? ': ' + esc(p.title) : '') + (done ? ' (done)' : '') + '"' : '') + '>' +
      (isC ? (done ? '✓' : (p.rung + 1)) : esc(p.label)) + '</button>';
  });
  strip.innerHTML = h;
  var cb = $('.pg-b.cur', strip);   // phones: the strip is one scrolling row, keep the current pill in view
  if (cb && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = Math.max(0, cb.offsetLeft - (strip.clientWidth - cb.offsetWidth) / 2);
}
function renderFoot(s) {
  var foot = $('.pg-foot', s.el);
  if (!foot || !s.pages) return;
  var i = pageIndex(s, savedPage(s)), prev = s.pages[i - 1], next = s.pages[i + 1];
  var si = sections.indexOf(s), ps = sections[si - 1], ns = sections[si + 1];
  var name = function (p) { return p.rung !== undefined ? 'Concept ' + (p.rung + 1) + (p.title ? ': ' + p.title : '') : p.label; };
  var secName = function (x) { return x.num + ' · ' + x.title; };
  var h = '';
  if (prev) h += '<button class="sf-btn pg-prev" data-pg-go="' + prev.key + '"><small>‹ Back</small>' + esc(name(prev)) + '</button>';
  else if (ps) h += '<button class="sf-btn pg-prev" data-go="' + ps.id + '"><small>‹ Previous section</small>' + esc(secName(ps)) + '</button>';
  else h += '<span></span>';
  if (next) h += '<button class="sf-btn pg-next" data-pg-go="' + next.key + '"><small>Next ›</small>' + esc(name(next)) + '</button>';
  else if (ns) h += '<button class="sf-btn pg-next" data-go="' + ns.id + '"><small>Next section ›</small>' + esc(secName(ns)) + '</button>';
  else h += '<span></span>';
  foot.innerHTML = h;
}
function pageStep(d) {
  var s = byId[currentView];
  if (!s || !s.pages) return false;
  var i = pageIndex(s, savedPage(s)) + d;
  if (s.pages[i]) { showPage(s.id, s.pages[i].key, { push: true }); return true; }
  var si = sections.indexOf(s), to = sections[si + d];
  if (to) { goTo(to.id); return true; }
  return false;
}
function goalsHTML(s, d) {
  if (!s.cps.length) return '';
  var l = d ? ladState(s.id) : null;
  return '<div class="goals"><div class="goals-lbl">By the end of this phase</div><ul>' + s.cps.map(function (t) {
    var nums = d ? ladGoalNums(d, (d.goals || {})[t[1]]) : null, pills = '';
    if (nums && nums.length) pills = '<span class="lad-pills">' + nums.map(function (n) {
      var x = d.rungs[n - 1]; if (!x) return '';
      return '<button class="lad-pill' + (l.done[x.id] ? ' done' : '') + '" data-lad-go="' + (n - 1) + '" title="' + esc(x.title) + '">' + n + '</button>';
    }).join('') + '</span>';
    return '<li data-cp="' + esc(t[1]) + '"><span class="goal-t">' + esc(t[0]) + '</span>' + pills + '</li>';
  }).join('') + '</ul></div>';
}
function renderOverview(pid) {
  var s = byId[pid], d = LADDERS[pid], gen = s && s.pages && $('.pg-ov-gen', s.el);
  if (!gen || !d) return;
  var l = ladState(pid), rungs = d.rungs, doneN = rungs.filter(function (x) { return l.done[x.id]; }).length;
  var mins = rungs.reduce(function (a, r) { return a + (+r.mins || 0); }, 0);
  var tasks = counts(s);
  // Start / Continue: first unfinished concept (the one you were on if it's unfinished), else the first later page
  var cur = Math.max(0, Math.min(rungs.length - 1, +l.cur || 0)), target = null, started = doneN > 0 || (state._pages && state._pages[pid] && state._pages[pid] !== 'overview');
  if (!l.done[rungs[cur].id]) target = String(cur + 1);
  else { for (var k = 0; k < rungs.length; k++) if (!l.done[rungs[k].id]) { target = String(k + 1); break; } }
  var laterPages = s.pages.filter(function (p) { return p.rung === undefined && p.key !== 'overview'; });
  var label;
  if (target) label = (started ? 'Continue' : 'Start') + ' · Concept ' + target + ' ›';
  else { target = laterPages[0] ? laterPages[0].key : '1'; label = 'Continue · ' + (laterPages[0] ? laterPages[0].label : 'Concept 1') + ' ›'; }
  // the sticky phase header above already shows number, tag and title, so the overview adds only the numbers and the one button
  var h = '<header class="pg-ov-hd">' +
    '<div class="pg-ov-meta"><span>' + plural(rungs.length, 'concept') + ' · ~' + mins + ' min</span>' +
    (tasks.tasks ? '<span>' + plural(tasks.tasks, 'task') + ' · ≈' + fmtMins(tasks.tasks * MIN_PER_TASK) + '</span>' : '') +
    '<span>' + doneN + ' of ' + rungs.length + ' concepts done</span></div>' +
    '<button class="lad-btn go pg-start" data-pg-go="' + target + '">' + label + '</button></header>';
  h += goalsHTML(s, d);
  h += '<section class="pg-ov-sec"><div class="pg-ov-lbl">Concepts</div><ol class="lad-toc" aria-label="Concepts in this phase">' +
    rungs.map(function (x, k) {
      var cls = (k === cur && started ? ' cur' : '') + (l.done[x.id] ? ' done' : '');
      return '<li><button class="lad-row' + cls + '" data-lad-go="' + k + '"><span class="lad-n">' + (l.done[x.id] ? '✓' : k + 1) + '</span>' +
        '<span class="lad-t">' + esc(x.title) + '<small>' + esc(x.kick) + '</small></span><span class="lad-m">~' + x.mins + 'm</span></button></li>';
    }).join('') + '</ol></section>';
  if (laterPages.length) h += '<section class="pg-ov-sec"><div class="pg-ov-lbl">Then</div><ul class="pg-later">' + laterPages.map(function (p) {
    return '<li><button class="lad-row" data-pg-go="' + p.key + '"><span class="lad-n pg-dot">›</span><span class="lad-t">' + esc(p.label) +
      '<small>' + esc(PAGE_HINTS[p.key] || '') + '</small></span><span class="lad-m">' + esc(p.size || '') + '</span></button></li>';
  }).join('') + '</ul></section>';
  gen.innerHTML = h;
}

function openHelp(id) {
  var s = byId[id];
  if (!s || !s.help) return;
  closeNotes();
  $$('.help-set').forEach(function (h) { h.hidden = h !== s.help; });
  $('#help-title').textContent = s.num + ' · ' + s.title;
  $('#help').hidden = false;
  document.body.classList.add('help-open');
  $('#help-body').scrollTop = 0;
  $('#help-x').focus({ preventScroll: true });
}
function closeHelp() {
  if ($('#help').hidden) return;
  $('#help').hidden = true;
  document.body.classList.remove('help-open');
}
function openNotes(id) {
  var s = byId[id];
  if (!s || !s.notes) return;
  closeHelp();
  $$('.notes-set').forEach(function (h) { h.hidden = h !== s.notes; });
  $('#notes-title').textContent = s.num + ' · ' + s.title;
  $('#notes').hidden = false;
  document.body.classList.add('help-open');
  $('#notes-body').scrollTop = 0;
  $('#notes-x').focus({ preventScroll: true });
}
function closeNotes() {
  var n = $('#notes');
  if (!n || n.hidden) return;
  n.hidden = true;
  if ($('#help').hidden) document.body.classList.remove('help-open');
}
function updateHelpFab() {
  var s = byId[currentView], fab = $('#help-fab');
  fab.hidden = !(s && s.help);
  if (!fab.hidden) fab.dataset.help = s.id;
}
$('#help-x').addEventListener('click', closeHelp);
document.addEventListener('click', function (e) {
  if (!$('#help').hidden && !e.target.closest('#help, [data-help], .pal-bd, .toast')) closeHelp();
  if ($('#notes') && !$('#notes').hidden && !e.target.closest('#notes, [data-notes], .pal-bd, .toast')) closeNotes();
});

/* ─── v15: CHEAT SHEETS, EXPLAINERS, TIME, DASHBOARD ──────────
   content/glossary.json lists the concepts each phase introduces.
   Inline code that matches an entry links to an explainer (three tabs:
   definition, mental model, in our game) in a floating window, the
   same window that shows a phase's whole cheat sheet and the time
   breakdown. Skill levels live on the cheat-sheet list (state._skills
   → skills table). Time on each phase is counted while you're active
   on it (state._time → user_state "_time:<phase>"); the current
   session stays on this device (state._session).
   The app opens on a dashboard of every section; each section is its
   own page at #/<id>.
   ───────────────────────────────────────────────────────────── */
var GLOSS = null, glossById = {}, glossAlias = {};
var LEVELS = ['Not started', 'Practiced', 'Solid'];
var KIND_ORDER = ['concept', 'syntax', 'type', 'function', 'tool'];
var TABS = [['def', 'Definition'], ['model', 'Mental model'], ['game', 'In our game']];
if (!state._skills) state._skills = {};
if (!state._time) state._time = {};

function fmtDur(sec) {
  sec = Math.round(sec || 0);
  if (sec < 60) return sec ? '<1m' : '0m';
  var m = Math.floor(sec / 60);
  if (m < 60) return m + 'm';
  return (Math.floor(m / 60) + 'h ' + (m % 60 ? (m % 60) + 'm' : '')).trim();
}
function lsGetv(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
function lsSetv(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

/* ─── glossary ─── */
function loadGlossary() {
  return fetch('content/glossary.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (g) {
      if (!g || !g.phases) return;
      GLOSS = g;
      Object.keys(g.phases).forEach(function (pid) {
        g.phases[pid].forEach(function (e) {
          e.phase = pid;
          glossById[e.id] = e;
          (e.aliases || []).forEach(function (a) { (glossAlias[a] = glossAlias[a] || []).push(e); });
          if (e.match) { try { e.re = new RegExp(e.match); } catch (x) {} }
        });
      });
      linkTerms();
      $$('.stage-nav').forEach(function (nav) {
        var pid = nav.closest('.phase').id;
        if (g.phases[pid]) nav.insertAdjacentHTML('beforeend', '<button class="stage-sheet" data-sheet="' + pid + '">Cheat sheet</button>');
      });
      renderDockSheet();
      renderWeekly();
      index = null;
    })
    .catch(function () {});
}
function findEntry(text, pid) {
  var t = text.trim().replace(/\s+/g, ' ');
  var tries = [t, t.replace(/;$/, ''), t.replace(/\(.*$/, ''), t.split(' ')[0]];
  var pick = function (list) { return list.filter(function (e) { return e.phase === pid; })[0] || list[0]; };
  for (var i = 0; i < tries.length; i++) if (glossAlias[tries[i]]) return pick(glossAlias[tries[i]]);
  var hits = Object.keys(glossById).map(function (k) { return glossById[k]; }).filter(function (e) { return e.re && e.re.test(t); });
  return hits.length ? pick(hits) : null;
}
function linkTerms() {
  sections.forEach(function (s) {
    [s.el].concat(s.help ? [s.help] : [], s.notes ? [s.notes] : []).forEach(function (root) {
      $$('.cmd', root).forEach(function (el) {
        if (el.closest('pre, .term') || el.dataset.term) return;
        var e = findEntry(el.textContent || '', s.id);
        if (!e) return;
        // link a term once per section, so the page isn't a sea of underlines
        var block = el.closest('.section-block, .checkpoint, .setup-guide') || root;
        var seen = block._terms || (block._terms = {});
        if (seen[e.id]) return;
        seen[e.id] = 1;
        el.classList.add('term');
        el.dataset.term = e.id;
        el.setAttribute('role', 'button');
        el.tabIndex = 0;
      });
    });
  });
}

/* ─── skill levels (on the cheat-sheet list) ─── */
function skillHTML(id) {
  var lv = +state._skills[id] || 0;
  return '<div class="skill skill--dots" data-skill="' + id + '" role="group" aria-label="How well do you know it?">' +
    LEVELS.map(function (l, i) {
      return '<button data-lv="' + i + '" class="lv' + i + (lv === i ? ' on' : '') + '" title="' + l + '" aria-label="' + l + '" aria-pressed="' + (lv === i) + '"></button>';
    }).join('') + '</div>';
}
function setSkill(id, lv) {
  state._skills[id] = lv;
  $$('.skill[data-skill="' + id + '"] button').forEach(function (b) {
    var on = +b.dataset.lv === lv;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  $$('.cs-count').forEach(function (c) { c.textContent = sheetCount(c.dataset.phase); });
  libCounts();
  save();
}
function sheetCount(pid) {
  var list = (GLOSS && GLOSS.phases[pid]) || [];
  var solid = list.filter(function (e) { return +state._skills[e.id] === 2; }).length;
  var practiced = list.filter(function (e) { return +state._skills[e.id] === 1; }).length;
  return list.length + ' concepts · ' + solid + ' solid · ' + practiced + ' practiced';
}
function csItem(e) {
  return '<div class="cs-item" data-cs="' + e.id + '">' +
    '<button class="cs-row" aria-expanded="false"><span class="cs-chev" aria-hidden="true">▸</span><span class="cs-term">' + esc(e.term) + '</span></button>' +
    skillHTML(e.id) +
    '<div class="cs-more"><div class="cs-what">' + esc(e.what) + '</div>' +
    '<button class="cs-explain" data-term="' + e.id + '">Explain it three ways ›</button></div></div>';
}
function sheetHTML(pid) {
  var list = (GLOSS && GLOSS.phases[pid]) || [];
  if (!list.length) return '<div class="cs-empty">No cheat sheet for this section.</div>';
  var h = '<div class="cs-head"><span class="cs-count" data-phase="' + pid + '">' + sheetCount(pid) + '</span>' +
    '<span class="cs-legend"><i class="lv0"></i>not started <i class="lv1"></i>practiced <i class="lv2"></i>solid</span></div>';
  KIND_ORDER.forEach(function (k) {
    var items = list.filter(function (e) { return e.kind === k; });
    if (!items.length) return;
    h += '<div class="cs-kind">' + esc(GLOSS.kinds[k] || k) + '</div>';
    items.forEach(function (e) { h += csItem(e); });
  });
  return h;
}

/* ─── floating window: explainers, cheat sheets, time ─── */
var fwStack = [];
function fwEl() {
  var w = $('#fw');
  if (w) return w;
  document.body.insertAdjacentHTML('beforeend',
    '<div class="fw-scrim" id="fw-scrim" hidden></div>' +
    '<div class="fw" id="fw" role="dialog" aria-modal="true" aria-labelledby="fw-title" hidden>' +
    '<div class="fw-hd"><button class="fw-back" id="fw-back" aria-label="Back" hidden>‹</button>' +
    '<div class="fw-hd-txt"><div class="fw-kick" id="fw-kick"></div><h2 class="fw-title" id="fw-title"></h2></div>' +
    '<button class="fw-x" id="fw-x" type="button" aria-label="Close">✕</button></div>' +
    '<div class="fw-body" id="fw-body"></div></div>');
  // Close and back get their own listeners so they work no matter what else handles clicks or taps
  $('#fw-x').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fwClose(); });
  $('#fw-back').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fwBack(); });
  $('#fw-scrim').addEventListener('click', function (e) { e.stopPropagation(); fwClose(); });
  return $('#fw');
}
function fwOpen(view, push) {
  var w = fwEl();
  if (!push) fwStack = [];
  fwStack.push(view);
  fwRender();
  w.hidden = false;
  $('#fw-scrim').hidden = false;
  document.body.classList.add('fw-open');
  $('#fw-x').focus({ preventScroll: true });
}
function fwRender() {
  var v = fwStack[fwStack.length - 1];
  if (!v) return;
  $('#fw').className = 'fw' + (v.cls ? ' ' + v.cls : '');
  $('#fw-kick').textContent = v.kicker || '';
  $('#fw-title').textContent = v.title || '';
  $('#fw-body').innerHTML = v.html();
  if ($('#fw-body .lib')) libRender();
  $('#fw-body').scrollTop = 0;
  $('#fw-back').hidden = fwStack.length < 2;
}
function fwBack() { if (fwStack.length > 1) { fwStack.pop(); fwRender(); } }
function fwClose() {
  var w = $('#fw');
  if (!w || w.hidden) return;
  w.hidden = true;
  $('#fw-scrim').hidden = true;
  document.body.classList.remove('fw-open');
  fwStack = [];
}

function openTerm(id, fromSheet) {
  var e = glossById[id];
  if (!e) return;
  var s = byId[e.phase];
  fwOpen({
    cls: 'fw--term',
    kicker: (GLOSS.kinds[e.kind] || e.kind).replace(/s$/, '').replace(/ & commands$/, ''),
    title: e.term,
    html: function () {
      var tab = lsGetv('rts_explain_tab', 'def');
      if (!e[tab]) tab = 'def';
      var body = function (key) {
        if (key === 'def') return '<p>' + esc(e.def || e.what) + '</p>' + (e.example ? '<pre class="fw-code">' + esc(e.example) + '</pre>' : '');
        if (key === 'model') return '<p>' + esc(e.model || '') + '</p>';
        return '<p>' + esc(e.game || '') + '</p>' + (e.gameCode ? '<pre class="fw-code">' + esc(e.gameCode) + '</pre>' : '');
      };
      return '<p class="ex-sum">' + esc(e.what) + '</p>' +
        '<div class="ex-tabs" role="tablist">' + TABS.map(function (t) {
          return '<button role="tab" data-extab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '"' + (t[0] === tab ? ' class="on"' : '') + '>' + t[1] + '</button>';
        }).join('') + '</div>' +
        TABS.map(function (t) { return '<div class="ex-panel" role="tabpanel" data-expanel="' + t[0] + '"' + (t[0] === tab ? '' : ' hidden') + '>' + body(t[0]) + '</div>'; }).join('') +
        (e.gotcha ? '<div class="ex-gotcha"><b>Watch out:</b> ' + esc(e.gotcha) + '</div>' : '') +
        '<div class="fw-foot"><span>From ' + esc(s ? s.num + ' · ' + s.title : e.phase) + '</span><span class="fw-acts">' +
        (askOn() ? '<a class="fw-btn ask" target="_blank" rel="noopener" href="' + askURL(askTermPrompt(e)) + '">Ask Claude</a>' : '') +
        (fromSheet ? '' : '<button class="fw-btn" data-sheet="' + e.phase + '">Cheat sheet</button>') + '</span></div>';
    }
  }, !!fromSheet);
}
function openSheet(pid) {
  var s = byId[pid];
  fwOpen({ cls: 'fw--sheet', kicker: 'Cheat sheet', title: s ? s.num + ' · ' + s.title : '', html: function () { return sheetHTML(pid); } }, false);
}
function openTime() {
  fwOpen({ cls: 'fw--time', kicker: 'Time', title: 'Where your time went', html: timeHTML }, false);
}

/* ─── time on task ─── */
var ACTIVE_MS = 5 * 60 * 1000, SESSION_GAP = 30 * 60 * 1000;
var lastInput = Date.now(), lastTick = Date.now(), unsavedSecs = 0;
['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (ev) {
  window.addEventListener(ev, function () { lastInput = Date.now(); }, { passive: true });
});
function activePhase() {
  var s = byId[currentView];
  return s && s.isPhase && $('.tasks, .checkpoint', s.el) ? s.id : null;
}
function session() {
  var now = Date.now(), ss = state._session;
  if (!ss || now - ss.last > SESSION_GAP) ss = state._session = { start: now, last: now, by: {} };
  return ss;
}
function tickTime() {
  var now = Date.now(), dt = Math.min(now - lastTick, 15000);
  lastTick = now;
  if (document.hidden || now - lastInput > ACTIVE_MS) { updateTimeUI(); return; }
  var pid = activePhase();
  if (pid) {
    var secs = dt / 1000, ss = session();
    state._time[pid] = Math.round(((+state._time[pid] || 0) + secs) * 10) / 10;
    ss.by[pid] = (ss.by[pid] || 0) + secs;
    ss.last = now;
    unsavedSecs += secs;
    if (unsavedSecs >= 60) { unsavedSecs = 0; save(); }
  }
  updateTimeUI();
}
function phaseDone(s) {
  var c = counts(s);
  return (c.tasks + c.cps) > 0 && c.done === c.tasks && c.cpsDone === c.cps;
}
function sessionSecs() {
  var ss = state._session;
  if (!ss || Date.now() - ss.last > SESSION_GAP) return 0;
  return Object.keys(ss.by).reduce(function (a, k) { return a + ss.by[k]; }, 0);
}
function totalSecs() { return Object.keys(state._time).reduce(function (a, k) { return a + (+state._time[k] || 0); }, 0); }
function updateTimeUI() {
  var cur = sessionSecs();
  var chip = $('#tb-time');
  if (chip) chip.innerHTML = '<em>session</em> <b>' + fmtDur(cur) + '</b>';
  sections.forEach(function (s) {
    if (!s.isPhase) return;
    var spent = +state._time[s.id] || 0, done = phaseDone(s);
    var line = $('.ph-time', s.el);
    if (line) {
      line.classList.toggle('done', done);
      line.innerHTML = done
        ? '✓ Phase complete · <b>' + fmtDur(spent) + '</b> total'
        : 'Time on this phase <b>' + fmtDur(spent) + '</b>' + (state._session && state._session.by[s.id] ? ' · this session <b>' + fmtDur(state._session.by[s.id]) + '</b>' : '');
    }
    var est = $('.ph-est', s.el);
    if (est && spent >= 60) est.textContent = done ? '✓ ' + fmtDur(spent) : fmtDur(spent) + ' spent';
  });
  var dk = $('#dk-clock');
  if (dk) {
    dk.textContent = fmtDur(cur);
    var pid = activePhase();
    $('#dk-sub').textContent = pid ? 'on ' + byId[pid].num + ' · ' + fmtDur(+state._time[pid] || 0) + ' total' : 'open a phase to start counting';
    var today = new Date().toISOString().slice(0, 10);
    $('#dk-closed').textContent = (state._logDay === today && +state._closed || 0) + ' closed today';
  }
  var ds = $('#dash-time');
  if (ds) ds.textContent = fmtDur(totalSecs());
  var dss = $('#dash-session');
  if (dss) dss.textContent = fmtDur(cur);
}
function timeHTML() {
  var ss = state._session, live = ss && Date.now() - ss.last <= SESSION_GAP;
  var h = '<div class="tm-sec"><div class="tm-lbl">This session' + (live ? ' · since ' + new Date(ss.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '') + '</div>';
  if (live && sessionSecs() > 0) {
    h += Object.keys(ss.by).sort(function (a, b) { return ss.by[b] - ss.by[a]; }).map(function (pid) {
      var s = byId[pid];
      return s ? '<div class="tm-row"><span>' + esc(s.num + ' · ' + s.title) + '</span><b>' + fmtDur(ss.by[pid]) + '</b></div>' : '';
    }).join('') + '<div class="tm-row tm-total"><span>Total</span><b>' + fmtDur(sessionSecs()) + '</b></div>';
  } else h += '<div class="tm-empty">Nothing yet. Time counts while you\'re active in an open phase.</div>';
  h += '</div><div class="tm-sec"><div class="tm-lbl">All time, by phase</div>';
  sections.forEach(function (s) {
    if (!s.isPhase || !$('.tasks, .checkpoint', s.el)) return;
    var t = +state._time[s.id] || 0;
    h += '<div class="tm-row' + (phaseDone(s) ? ' done' : '') + '"><span>' + (phaseDone(s) ? '✓ ' : '') + esc(s.num + ' · ' + s.title) + '</span><b>' + fmtDur(t) + '</b></div>';
  });
  h += '<div class="tm-row tm-total"><span>Total</span><b>' + fmtDur(totalSecs()) + '</b></div></div>' +
    '<div class="tm-note">Counted while a phase is open and you\'ve used the page in the last 5 minutes. A 30-minute break starts a new session.</div>';
  return h;
}
document.addEventListener('visibilitychange', function () {
  if (document.hidden) { unsavedSecs = 0; save(); } else { lastTick = Date.now(); }
});
setInterval(tickTime, 5000);

/* ─── Ask Claude (optional): opens claude.ai with the question written ─── */
function askOn() { return lsGetv('rts_ask_claude', '0') === '1'; }
function askURL(text) { return 'https://claude.ai/new?q=' + encodeURIComponent(text.slice(0, 1800)); }
var ASK_INTRO = 'I\'m teaching myself C (beginner, Windows + MSVC, building a small terminal game, then a Win32 window). ';
function askTermPrompt(e) {
  return ASK_INTRO + 'Explain "' + e.term + '" (' + e.what + ') in plain English, give me a mental model, and show a tiny example from a simple terminal game. ' +
    'Then ask me one question to check I understood. Don\'t write my project code for me.';
}
function askPhasePrompt(s) {
  var t = $$(TASK, s.el).filter(function (x) { return !x.classList.contains('done'); })[0];
  return ASK_INTRO + 'I\'m on "' + s.num + ' · ' + s.title + '" of my roadmap.' + (t ? ' My current task: ' + taskLabel(t) + '.' : '') +
    ' My question: \n\n(Teach me and give hints — don\'t just hand me the finished code.)';
}
function renderAsk() {
  var on = askOn();
  var mi = $('#m-ask');
  if (mi) $('span', mi).textContent = on ? 'on' : 'off';
  $$('.stage-ask, .prompt-ask').forEach(function (n) { n.remove(); });
  if (!on) return;
  $$('.stage-nav').forEach(function (nav) {
    var s = byId[nav.closest('.phase').id];
    if (s) nav.insertAdjacentHTML('beforeend', '<a class="stage-ask" target="_blank" rel="noopener" href="' + askURL(askPhasePrompt(s)) + '">Ask Claude</a>');
  });
  $$('.prompt-item').forEach(function (p) {
    var t = $('.prompt-text', p);
    if (t) p.insertAdjacentHTML('beforeend', '<a class="prompt-ask" target="_blank" rel="noopener" href="' + askURL((t.innerText || t.textContent).trim()) + '">Open in Claude ›</a>');
  });
}

/* ─── dashboard and section pages ─── */
var currentView = null;   // null = dashboard, else a section id
function sectionFromHash() {
  var m = /^#\/([^\/]+)/.exec(location.hash || '');
  var id = m ? decodeURIComponent(m[1]) : null;
  return id && byId[id] ? id : null;
}
function pageFromHash() {
  var m = /^#\/[^\/]+\/([^\/]+)/.exec(location.hash || '');
  return m ? decodeURIComponent(m[1]) : null;
}
function showView(id, opts) {
  opts = opts || {};
  currentView = id || null;
  document.body.classList.toggle('view-dash', !currentView);
  document.body.classList.toggle('view-section', !!currentView);
  sections.forEach(function (s) { s.el.classList.toggle('is-current', s.id === currentView); });
  var weekly = $('.weekly');
  if (weekly) weekly.classList.toggle('is-current', currentView === 'sync-agenda');
  if (currentView && byId[currentView].isPhase) setOpen(byId[currentView].el, true);
  var vs = byId[currentView];
  if (vs && vs.hasPages) {
    if (vs.pages) showPage(vs.id, opts.page, { keepScroll: true });   // opens the saved page unless the URL names one
    else vs.want = opts.page;                                          // ladder still loading: buildPages opens it
  }
  if (!currentView) renderDash();
  if (currentView === 'sync-agenda') renderWeekly();
  renderSecbar();
  if (!opts.keepScroll) window.scrollTo(0, 0);
  closeRailMobile(); closeHelp(); fwClose();
  lastSpy = '';
  spy();
  updateTimeUI();
}
function navigate(id, page) {
  var hash = id ? '#/' + encodeURIComponent(id) + (page ? '/' + encodeURIComponent(page) : '') : '#/';
  if (location.hash !== hash) history.pushState(null, '', hash);
  showView(id, { page: page });
}
function ensureSection(id) { if (currentView !== id) navigate(id); }
window.addEventListener('popstate', function () { showView(sectionFromHash(), { page: pageFromHash() }); });

function renderSecbar() {
  var bar = $('#secbar'), foot = $('#secfoot');
  if (!bar) {
    $('.main').insertAdjacentHTML('afterbegin', '<nav class="secbar" id="secbar" aria-label="Section"></nav>');
    $('.main').insertAdjacentHTML('beforeend', '<nav class="secfoot" id="secfoot" aria-label="Next section"></nav>');
    bar = $('#secbar'); foot = $('#secfoot');
  }
  if (!currentView) { bar.innerHTML = ''; foot.innerHTML = ''; return; }
  var i = sections.findIndex(function (s) { return s.id === currentView; });
  var prev = sections[i - 1], next = sections[i + 1];
  bar.innerHTML = '<button class="sb-back" data-dash>‹ All sections</button>' +
    '<span class="sb-pos">' + (i + 1) + ' of ' + sections.length + '</span>';
  var paged = byId[currentView].hasPages;   // paged phases carry Back / Next page buttons of their own
  foot.innerHTML = paged ? '<button class="sf-btn sf-dash" data-dash><small>Back to</small>All sections</button>' : ((prev ? '<button class="sf-btn" data-go="' + prev.id + '"><small>‹ Previous</small>' + esc(prev.num + ' · ' + prev.title) + '</button>' : '<span></span>') +
    '<button class="sf-btn sf-dash" data-dash><small>Back to</small>All sections</button>' +
    (next ? '<button class="sf-btn sf-next" data-go="' + next.id + '"><small>Next ›</small>' + esc(next.num + ' · ' + next.title) + '</button>' : '<span></span>'));
}

function renderDash() {
  var dash = $('#dash');
  if (!dash) {
    $('.main').insertAdjacentHTML('afterbegin', '<section class="dash" id="dash" aria-label="All sections"></section>');
    dash = $('#dash');
  }
  var all = $$(TASK), done = all.filter(function (t) { return t.classList.contains('done'); });
  var pct = all.length ? Math.round(done.length / all.length * 100) : 0;
  var next = nextTask(), nextSec = next ? byId[(next.closest('.phase') || {}).id] : null;
  var phases = sections.filter(function (s) { return s.isPhase && $('.tasks, .checkpoint', s.el); });
  var cleared = phases.filter(phaseDone).length;
  var h = '<header class="dash-hd"><div class="dash-kick">// C/C++ · Game dev · Road to shipping</div>' +
    '<h1 class="dash-title">Your roadmap</h1>' +
    '<div class="dash-stats">' +
    '<div class="ds"><b>' + done.length + '<em> / ' + all.length + '</em></b><span>tasks · ' + pct + '%</span></div>' +
    '<div class="ds"><b>' + cleared + '<em> / ' + phases.length + '</em></b><span>phases cleared</span></div>' +
    '<button class="ds ds-btn" data-time><b id="dash-time">' + fmtDur(totalSecs()) + '</b><span>time spent ›</span></button>' +
    '<button class="ds ds-btn" data-time><b id="dash-session">' + fmtDur(sessionSecs()) + '</b><span>this session ›</span></button>' +
    '</div>' +
    (next ? '<button class="dash-go" ' + (nextSec && nextSec.hasPages ? 'data-continue="' + nextSec.id + '"' : 'data-resume') + '><small>Continue · ' + esc(nextSec ? nextSec.num + ' ' + nextSec.title : '') + contPageLabel(nextSec) + '</small>' + esc(taskLabel(next).slice(0, 110)) + '</button>'
          : '<div class="dash-go done"><small>All done</small>Every task is checked off. Ship it.</div>') +
    '</header>';
  var used = {}, rows = [];
  GROUPS.forEach(function (g) {
    var ids = g[1].filter(function (id) { return byId[id]; });
    if (!ids.length) return;
    ids.forEach(function (id) { used[id] = 1; });
    var last = rows[rows.length - 1];
    // small neighbouring groups (Setup, Reference, Sessions) share one row
    if (last && ids.length <= 2 && last.ids.length + ids.length <= 4 && last.small) { last.label += ' · ' + g[0]; last.ids = last.ids.concat(ids); }
    else rows.push({ label: g[0], ids: ids, small: ids.length <= 2 });
  });
  rows.forEach(function (r) { h += dashGroup(r.label, r.ids, nextSec); });
  var rest = sections.filter(function (s) { return !used[s.id]; }).map(function (s) { return s.id; });
  if (rest.length) h += dashGroup('More', rest, nextSec);
  dash.innerHTML = h;
}
function contPageLabel(s) {
  if (!s || !s.pages) return '';
  var p = s.pages[pageIndex(s, savedPage(s))];
  return p ? ' · ' + (p.rung !== undefined ? 'Concept ' + (p.rung + 1) : p.label) : '';
}
function dashGroup(label, ids, nextSec) {
  return '<div class="dash-grp"><div class="dash-grp-lbl">' + esc(label) + '</div><div class="dash-grid">' + ids.map(function (id) {
    var s = byId[id], c = counts(s), spent = +state._time[id] || 0, done = phaseDone(s), cur = nextSec && nextSec.id === id;
    var tag = (($('.phase-tag', s.el) || {}).textContent || '').trim();
    var meta = [s.week, c.tasks ? plural(c.tasks, 'task') : ''].filter(Boolean).join(' · ');
    var status = done ? '✓ Complete' : cur ? 'Up next' : c.done ? 'In progress' : (c.tasks ? 'Not started' : 'Reference');
    var wkc = id === 'sync-agenda' ? weeklyCount() : null;
    if (wkc) { status = wkc.done === wkc.total ? '✓ Week done' : 'This week ' + wkc.done + '/' + wkc.total; meta = 'Resets Mondays · 3 exercises'; }
    return '<button class="dcard' + (done ? ' done' : '') + (cur ? ' cur' : '') + (TINT[id] ? ' tint-' + TINT[id] : '') + '" data-go="' + id + '">' +
      '<span class="dc-top"><span class="dc-num">' + esc(s.num) + '</span><span class="dc-status">' + status + '</span></span>' +
      (tag ? '<span class="dc-tag">' + esc(tag) + '</span>' : '') +
      '<span class="dc-title">' + esc(s.title) + '</span>' +
      (meta ? '<span class="dc-meta">' + esc(meta) + '</span>' : '') +
      (wkc ? '<span class="dc-bar"><i style="width:' + Math.round(wkc.done / wkc.total * 100) + '%"></i></span>' : '') +
      (c.tasks ? '<span class="dc-bar"><i style="width:' + Math.round(c.done / c.tasks * 100) + '%"></i></span>' +
        '<span class="dc-foot"><span>' + c.done + '/' + c.tasks + ' tasks</span><span>' + (spent >= 60 ? fmtDur(spent) : '') + '</span></span>' : '') +
      '</button>';
  }).join('') + '</div></div>';
}

/* ─── clicks ─── */
document.addEventListener('click', function (e) {
  if (document.body.classList.contains('editing')) return;
  var el;
  if (e.target.closest('#fw-x, #fw-back, #fw-scrim')) return;   // handled by their own listeners
  if ((el = e.target.closest('.skill [data-lv]'))) { e.stopPropagation(); setSkill(el.closest('.skill').dataset.skill, +el.dataset.lv); return; }
  if ((el = e.target.closest('[data-extab]'))) {
    e.stopPropagation();
    var tab = el.dataset.extab;
    lsSetv('rts_explain_tab', tab);
    $$('[data-extab]', el.parentNode).forEach(function (b) { var on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $$('[data-expanel]', $('#fw-body')).forEach(function (p) { p.hidden = p.dataset.expanel !== tab; });
    return;
  }
  if ((el = e.target.closest('[data-lib-mode]'))) { e.stopPropagation(); libSet({ mode: el.dataset.libMode, ov: {} }); return; }
  if ((el = e.target.closest('[data-lib-tog]'))) {
    e.stopPropagation();
    var lk = el.dataset.libTog, lo = el.getAttribute('aria-expanded') !== 'true';
    LIB.ov[lk] = lo; libSave();
    var lw = el.parentNode;
    lw.classList.toggle('open', lo);
    el.setAttribute('aria-expanded', lo);
    return;
  }
  if ((el = e.target.closest('[data-library]'))) { e.stopPropagation(); closeMenu(); openLibrary(); return; }
  if ((el = e.target.closest('.cs-row'))) {
    e.stopPropagation();
    var item = el.closest('.cs-item'), open = !item.classList.contains('open');
    item.classList.toggle('open', open);
    el.setAttribute('aria-expanded', open);
    return;
  }
  if ((el = e.target.closest('[data-term]'))) {
    e.preventDefault(); e.stopPropagation();
    openTerm(el.dataset.term, !!el.closest('#fw'));
    return;
  }
  if ((el = e.target.closest('[data-sheet]'))) { e.stopPropagation(); openSheet(el.dataset.sheet); return; }
  if ((el = e.target.closest('[data-time]'))) { e.stopPropagation(); closeMenu(); openTime(); return; }
  if ((el = e.target.closest('[data-dash]'))) { e.stopPropagation(); navigate(null); return; }
  if ((el = e.target.closest('[data-resume]'))) { e.stopPropagation(); resume(); return; }
  if ((el = e.target.closest('[data-continue]'))) { e.stopPropagation(); navigate(el.dataset.continue); return; }
  if ((el = e.target.closest('[data-pg-go]'))) {
    e.stopPropagation();
    var pgph = el.closest('.phase');
    if (pgph) showPage(pgph.id, el.dataset.pgGo, { push: true });
    return;
  }
  if ((el = e.target.closest('#m-ask'))) {
    e.stopPropagation(); closeMenu();
    lsSetv('rts_ask_claude', askOn() ? '0' : '1');
    renderAsk();
    toast(askOn() ? 'Ask Claude is on: buttons open claude.ai with your question written' : 'Ask Claude is off');
    return;
  }
}, true);
document.addEventListener('input', function (e) {
  if (e.target.classList && e.target.classList.contains('lib-q')) { LIB.q = e.target.value; libRender(e.target); }
});
document.addEventListener('change', function (e) {
  if (e.target.classList && e.target.classList.contains('lib-sel')) libSet({ mode: 'phase', phase: e.target.value, ov: {} });
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && $('#fw') && !$('#fw').hidden) { e.stopPropagation(); fwClose(); }
}, true);

/* ─── LIBRARY (v21) ───────────────────────────────────────────
   The right-hand panel (and ⋯ → Library on phones, in the floating
   window) lists every glossary term, grouped by phase in roadmap
   order and, inside a phase, by concept: the rung of
   content/ladders/<pid>.json whose `skills` include the term's id
   (first match wins; leftovers go under "More"). Phases with no
   ladder file fall back to the KIND_ORDER grouping. Ladder files are
   fetched for every glossary phase (404s ignored) so new ladders
   show up without code changes.
   Filter: Focus (default; all phases listed, only the phase you're on
   open, with its current concept, state._ladder[pid].cur, open and
   marked), This phase, All, or Phase… (pick one). The search box
   matches term/what across all phases and auto-opens matches.
   Mode, picked phase and manual open/close choices (LIB.ov) live in
   localStorage "rts_library". Rows are the same .cs-item rows as the
   single-phase cheat sheet, so skill dots and explainers just work.
   ───────────────────────────────────────────────────────────── */
var LIB = { mode: 'focus', phase: '', ov: {}, q: '' }, LIBLAD = {}, libFetched = false;
(function () {
  try {
    var v = JSON.parse(lsGetv('rts_library', '{}')) || {};
    if (['focus', 'this', 'all', 'phase'].indexOf(v.mode) >= 0) LIB.mode = v.mode;
    if (typeof v.phase === 'string') LIB.phase = v.phase;
    if (v.ov && typeof v.ov === 'object') LIB.ov = v.ov;
  } catch (e) {}
})();
function libSave() { lsSetv('rts_library', JSON.stringify({ mode: LIB.mode, phase: LIB.phase, ov: LIB.ov })); }
function libSet(o) { Object.keys(o).forEach(function (k) { LIB[k] = o[k]; }); libSave(); libRender(); }
function libLad(pid) { return LIBLAD[pid] || LADDERS[pid] || null; }
function libPhases() {
  var out = [];
  sections.forEach(function (s) { if (GLOSS.phases[s.id]) out.push(s.id); });
  Object.keys(GLOSS.phases).forEach(function (p) { if (out.indexOf(p) < 0) out.push(p); });
  return out;
}
function libFocus() {
  var s = byId[currentView], order = libPhases(), i;
  if (s && GLOSS.phases[s.id]) return s.id;
  for (i = 0; i < order.length; i++) {
    var d = libLad(order[i]);
    if (d && d.rungs.some(function (r) { return !ladState(order[i]).done[r.id]; })) return order[i];
  }
  return GLOSS.phases.phase1 ? 'phase1' : order[0];
}
function libFetchLadders() {
  if (libFetched || !GLOSS) return;
  libFetched = true;
  libPhases().forEach(function (pid) {
    fetch('content/ladders/' + pid + '.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.rungs && d.rungs.length) { LIBLAD[pid] = d; libRender(); } })
      .catch(function () {});
  });
}
function libGroups(pid, list) {
  var d = libLad(pid);
  if (!d) return null;
  var seen = {}, groups = [];
  d.rungs.forEach(function (r, i) {
    var its = list.filter(function (e) { return !seen[e.id] && (r.skills || []).indexOf(e.id) >= 0; });
    its.forEach(function (e) { seen[e.id] = 1; });
    if (its.length) groups.push({ key: r.id, title: r.title, idx: i, items: its });
  });
  var rest = list.filter(function (e) { return !seen[e.id]; });
  if (rest.length) groups.push({ key: '_more', title: 'More', idx: -1, items: rest });
  return groups;
}
function libCount(pid) {
  var list = GLOSS.phases[pid] || [];
  var solid = list.filter(function (e) { return +state._skills[e.id] === 2; }).length;
  return solid + '/' + list.length;
}
function libCounts() {
  if (!GLOSS) return;
  $$('.lib-n[data-phase]').forEach(function (n) { n.textContent = libCount(n.dataset.phase); });
}
function libHTML() {
  var h = '<div class="lib"><div class="lib-ctl"><div class="lib-seg" role="group" aria-label="Show">' +
    [['focus', 'Focus'], ['this', 'This phase'], ['all', 'All'], ['phase', 'Phase…']].map(function (m) {
      return '<button class="lib-mode" data-lib-mode="' + m[0] + '">' + m[1] + '</button>';
    }).join('') + '</div>' +
    '<select class="lib-sel" aria-label="Phase">' + libPhases().map(function (p) {
      var s = byId[p];
      return '<option value="' + p + '">' + esc(s ? s.num + ' · ' + s.title : p) + '</option>';
    }).join('') + '</select>' +
    '<input class="lib-q" type="search" placeholder="Search terms" aria-label="Search terms" autocomplete="off" spellcheck="false">' +
    '<span class="cs-legend"><i class="lv0"></i>not started <i class="lv1"></i>practiced <i class="lv2"></i>solid</span></div>' +
    '<div class="lib-list"></div></div>';
  return h;
}
function libListHTML() {
  var q = LIB.q.trim().toLowerCase(), focus = libFocus(), mode = LIB.mode, order = libPhases(), h = '';
  var pick = LIB.phase && GLOSS.phases[LIB.phase] ? LIB.phase : focus;
  var shown = q ? order : mode === 'this' ? [focus] : mode === 'phase' ? [pick] : order;
  var open = function (key, def) { return q ? true : (key in LIB.ov ? !!LIB.ov[key] : def); };
  shown.forEach(function (pid) {
    var all = GLOSS.phases[pid] || [], s = byId[pid];
    var list = q ? all.filter(function (e) { return (e.term + ' ' + e.what + ' ' + (e.aliases || []).join(' ')).toLowerCase().indexOf(q) >= 0; }) : all;
    if (!list.length) return;
    var pOpen = open('p:' + pid, mode !== 'focus' || pid === focus);
    h += '<section class="lib-ph' + (pOpen ? ' open' : '') + (pid === focus ? ' now' : '') + '" data-lib-phase="' + pid + '">' +
      '<button class="lib-hd" data-lib-tog="p:' + pid + '" aria-expanded="' + pOpen + '"><span class="cs-chev" aria-hidden="true">▸</span>' +
      '<span class="lib-num">' + esc(s ? s.num : pid) + '</span><span class="lib-ttl">' + esc(s ? s.title : pid) + '</span>' +
      '<span class="lib-n" data-phase="' + pid + '" title="solid / total">' + libCount(pid) + '</span></button><div class="lib-body">';
    var groups = libGroups(pid, list);
    if (!groups) {
      KIND_ORDER.forEach(function (k) {
        var items = list.filter(function (e) { return e.kind === k; });
        if (!items.length) return;
        h += '<div class="cs-kind">' + esc(GLOSS.kinds[k] || k) + '</div>' + items.map(csItem).join('');
      });
    } else {
      var cur = Math.max(0, +ladState(pid).cur || 0);
      groups.forEach(function (g) {
        var isCur = g.idx === cur && pid === focus && !!libLad(pid);
        var gOpen = open('c:' + pid + ':' + g.key, mode !== 'focus' || pid !== focus ? true : isCur);
        h += '<div class="lib-cn' + (gOpen ? ' open' : '') + (isCur ? ' cur' : '') + '">' +
          '<button class="lib-cb" data-lib-tog="c:' + pid + ':' + g.key + '" aria-expanded="' + gOpen + '"><span class="cs-chev" aria-hidden="true">▸</span>' +
          '<span class="lib-cname">' + esc(g.title) + '</span>' + (isCur ? '<span class="lib-now">now</span>' : '') +
          '<span class="lib-cn-n">' + g.items.length + '</span></button><div class="lib-body">' + g.items.map(csItem).join('') + '</div></div>';
      });
    }
    h += '</div></section>';
  });
  return h || '<div class="cs-empty">Nothing matches.</div>';
}
function libRender(skip) {
  if (!GLOSS) return;
  libFetchLadders();
  $$('.lib').forEach(function (box) {
    var list = $('.lib-list', box);
    if (!list) return;
    var scroller = box.closest('.dock, .fw-body'), top = scroller ? scroller.scrollTop : 0;
    var opened = {};
    $$('.cs-item.open', list).forEach(function (n) { opened[n.dataset.cs] = 1; });
    list.innerHTML = libListHTML();
    $$('.cs-item', list).forEach(function (n) {
      if (opened[n.dataset.cs]) { n.classList.add('open'); $('.cs-row', n).setAttribute('aria-expanded', 'true'); }
    });
    $$('[data-lib-mode]', box).forEach(function (b) {
      var on = b.dataset.libMode === LIB.mode;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });
    var sel = $('.lib-sel', box);
    sel.value = LIB.phase && GLOSS.phases[LIB.phase] ? LIB.phase : libFocus();
    sel.hidden = LIB.mode !== 'phase';
    var qi = $('.lib-q', box);
    if (qi !== skip && qi.value !== LIB.q) qi.value = LIB.q;
    if (scroller) scroller.scrollTop = top;
  });
}
function openLibrary() {
  fwOpen({ cls: 'fw--sheet fw--lib', kicker: 'Library', title: 'Terms by phase and concept', html: function () { return libHTML(); } }, false);
  libRender();
}
function renderDockSheet() {
  var box = $('#dk-sheet');
  if (!box || !GLOSS) return;
  if (!$('.lib', box)) box.innerHTML = libHTML();
  libRender();
}

/* ─── CONTENT EDITING ─────────────────────────────────────────
   Anchors are stable containers; an edit stores that anchor's
   innerHTML (with runtime UI stripped) under state._edits.
   ───────────────────────────────────────────────────────────── */
if (!state._edits) state._edits = {};
var INJECTED = '.pg-top, .pg-foot, .pg-ov-gen, .pg-loading, .stage-hint, .lib, .wk-live, .lad, .lad-pills, .tn-btn, .tn-wrap, .ptoc, .ph-prog, .ph-est, .em-ctl, .em-add, .goals, .stage-nav, .stage-hd, .ph-time, .dash, .secbar, .secfoot, .prompt-ask, .stage-ask';

function markAnchors() {
  sections.forEach(function (s) {
    var k = s.id;
    var hdr = $('.phase-header', s.el);
    if (hdr) hdr.setAttribute('data-ek', k + ':hdr');
    $$('.section-block', s.el).forEach(function (b, i) { b.setAttribute('data-ek', k + ':blk' + i); });
    var ci = $('.checkpoint-items', s.el);
    if (ci) ci.setAttribute('data-ek', k + ':cps');
    var ss = $('.setup-steps', s.el);
    if (ss) ss.setAttribute('data-ek', k + ':steps');
  });
  var hero = $('.hero');
  if (hero) hero.setAttribute('data-ek', 'hero');
}
function cleanHTML(el) {
  var c = el.cloneNode(true);
  $$(INJECTED, c).forEach(function (n) { n.remove(); });
  $$('[contenteditable]', c).forEach(function (n) { n.removeAttribute('contenteditable'); });
  $$('.flash', c).forEach(function (n) { n.classList.remove('flash'); });
  $$('.term', c).forEach(function (n) { n.classList.remove('term'); n.removeAttribute('data-term'); });
  $$('[role], [tabindex], [aria-checked], [aria-expanded], [aria-description]', c).forEach(function (n) {
    ['role', 'tabindex', 'aria-checked', 'aria-expanded', 'aria-description'].forEach(function (a) { n.removeAttribute(a); });
  });
  return c.innerHTML;
}

/* v9 -> v10 migration for saved edits: stored blocks still carry v9 inline
   styles, so map each one to the v10 classes before restoring it. */
var V10_STYLE_MAP = {"cursor:default":[[],"cursor:default"],"display:none":[[],"display:none"],"color:var(--text)":[["t-text"],""],"border-top:2px solid var(--purple)":[[],"border-top:2px solid var(--purple)"],"font-size:30px;color:var(--purple)":[["t-purple"],"font-size:30px"],"color:var(--purple)":[["t-purple"],""],"color:var(--blue)":[["t-blue"],""],"color:var(--orange)":[["t-orange"],""],"margin-top:0":[[],"margin-top:0"],"color:var(--yellow)":[["t-yellow"],""],"display:flex;flex-direction:column;gap:10px":[["stack","gap-10"],""],"background:rgba(79,195,247,0.04);border:1px solid rgba(79,195,247,0.15);border-left:3px solid var(--blue);padding:14px 16px":[["callout","callout--blue","callout--bar"],""],"font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--blue);margin-bottom:8px":[["eyebrow","eyebrow--md","t-blue","mb-8"],""],"font-size:12.5px;color:var(--text);line-height:1.7":[["prose","t-text"],""],"color:var(--accent)":[["t-accent"],""],"background:rgba(179,157,219,0.05);border:1px solid rgba(179,157,219,0.2);border-left:3px solid var(--purple);padding:14px 16px":[["callout","callout--purple","callout--bar"],""],"font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--purple);margin-bottom:6px":[["eyebrow","eyebrow--md","t-purple","mb-6"],""],"font-size:12.5px;color:var(--muted2);line-height:1.7;font-style:italic":[["prose","t-muted2","italic"],""],"background:var(--surface2);border:1px solid var(--border);padding:14px 16px":[["panel"],"padding:14px 16px"],"font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted2);margin-bottom:10px":[["eyebrow","eyebrow--md","t-muted2","mb-10"],""],"display:flex;align-items:center;gap:8px;flex-wrap:wrap":[["row","gap-8"],"align-items:center;flex-wrap:wrap"],"background:var(--bg);border:1px solid var(--border2);padding:6px 12px;font-size:11px":[["keycap"],""],"color:var(--muted)":[["t-muted"],""],"font-size:10px;color:var(--muted);margin-top:10px":[["fs-10","t-muted","mt-10"],""],"background:var(--code-bg);border-top:1px solid var(--border);padding:14px 16px":[["code-island"],"border-top:1px solid var(--border);padding:14px 16px"],"background:var(--bg);border:1px solid var(--border);padding:12px 14px;font-size:11px;line-height:1.8;color:var(--accent)":[["code-inset","fs-11","lh-18","t-accent"],""],"color:var(--muted2)":[["t-muted2"],""],"background:rgba(179,157,219,0.05);border:1px solid rgba(179,157,219,0.2);border-left:3px solid var(--purple);padding:14px 16px;margin-bottom:16px":[["callout","callout--purple","callout--bar","mb-16"],""],"font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--purple);margin-bottom:8px":[["eyebrow","eyebrow--md","t-purple","mb-8"],""],"background:rgba(255,112,67,0.06);border:1px solid rgba(255,112,67,0.2);padding:14px 16px;margin-bottom:16px":[["callout","callout--orange","mb-16"],""],"font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--orange);margin-bottom:8px":[["eyebrow","eyebrow--md","t-orange","mb-8"],""],"font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted2);margin-bottom:12px":[["eyebrow","eyebrow--md","t-muted2","mb-12"],""],"background:rgba(0,255,136,0.03);border:1px solid rgba(0,255,136,0.15);padding:14px 16px;margin-top:16px":[["callout","callout--accent","mt-16"],""],"font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--accent);margin-bottom:8px":[["eyebrow","eyebrow--md","t-accent","mb-8"],""],"display:flex;flex-direction:column;gap:8px;font-size:11px":[["stack","gap-8","fs-11"],""],"display:grid;grid-template-columns:120px 1fr;gap:8px":[["kv","kv--120"],""],"color:var(--accent);font-weight:500":[["t-accent","fw-500"],""],"background:var(--code-bg);border:1px solid var(--border);padding:14px 16px;font-size:11px;line-height:1.8;color:var(--accent)":[["code-island","fs-11","lh-18","t-accent"],"border:1px solid var(--border);padding:14px 16px"],"display:flex;flex-direction:column;gap:8px;margin-top:12px;font-size:12.5px;color:var(--muted2)":[["stack","gap-8","mt-12","fs-12-5","t-muted2"],""],"margin-top:12px;font-size:10px;color:var(--muted)":[["mt-12","fs-10","t-muted"],""],"background:rgba(79,195,247,0.04);border:1px solid rgba(79,195,247,0.15);border-left:3px solid var(--blue);padding:14px 16px;margin-bottom:14px":[["callout","callout--blue","callout--bar","mb-14"],""],"display:block;background:var(--bg);border:1px solid var(--border2);padding:6px 12px;margin:8px 0;color:var(--accent);font-size:11px":[["keycap","t-accent"],"display:block;margin:8px 0"],"background:rgba(179,157,219,0.05);border:1px solid rgba(179,157,219,0.2);border-left:3px solid var(--purple);padding:14px 16px;margin-bottom:14px":[["callout","callout--purple","callout--bar","mb-14"],""],"font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted2);margin-bottom:10px":[["eyebrow","eyebrow--tight","eyebrow--lg","t-muted2","mb-10"],""],"font-size:12.5px;color:var(--text);line-height:1.7;margin-bottom:12px":[["prose","t-text","mb-12"],""],"margin-bottom:14px":[["mb-14"],""],"background:var(--code-bg);padding:16px;font-size:11px;line-height:1.8;color:#c8d0e8;overflow-x:auto":[["code-panel","fs-11"],"overflow-x:auto"],"color:#45475a":[["c-cm"],""],"color:#a6e3a1":[["c-str"],""],"color:#fab387":[["c-num"],""],"color:#89b4fa":[["c-kw"],""],"display:block;background:var(--bg);border:1px solid var(--border2);padding:8px 14px;margin:8px 0;color:var(--accent);font-size:11px":[["t-accent","fs-11"],"display:block;background:var(--bg);border:1px solid var(--border2);padding:8px 14px;margin:8px 0"],"color:#f2cdcd":[["c-pp"],""],"background:rgba(255,213,79,0.06);border:1px solid rgba(255,213,79,0.2);padding:14px 16px":[["callout","callout--yellow"],""],"font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--yellow);margin-bottom:8px":[["eyebrow","eyebrow--md","t-yellow","mb-8"],""],"background:rgba(0,255,136,0.04);border:1px solid rgba(0,255,136,0.15);padding:12px 16px;margin-top:14px":[["callout","callout--accent","mt-14"],"padding:12px 16px"],"background:var(--bg);border:1px solid rgba(0,255,136,0.4);padding:6px 12px;font-size:11px;color:var(--accent)":[["fs-11","t-accent"],"background:var(--bg);border:1px solid var(--accent-line-strong);padding:6px 12px"],"margin-top:14px;background:rgba(255,112,67,0.06);border:1px solid rgba(255,112,67,0.2);padding:12px 16px":[["callout","callout--orange","mt-14"],"padding:12px 16px"],"font-size:12.5px;color:var(--muted2);line-height:1.6":[["prose","prose--tight","t-muted2"],""],"background:rgba(255,213,79,0.04);border:1px solid rgba(255,213,79,0.2);padding:12px 14px;margin-bottom:14px":[["callout","callout--yellow","callout--sm","mb-14"],""],"font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--yellow);margin-bottom:6px":[["eyebrow","eyebrow--md","t-yellow","mb-6"],""],"font-size:12px;color:var(--muted2);line-height:1.7":[["prose","prose--sm","t-muted2"],""],"padding:12px;font-size:12px;margin:0 0 10px 0":[["p-12","fs-12","mb-10"],""],"padding:12px;font-size:12px;margin:10px 0":[["p-12","fs-12"],"margin:10px 0"],"border-top:2px solid var(--yellow)":[[],"border-top:2px solid var(--yellow)"],"font-size:20px;color:var(--yellow)":[["t-yellow"],"font-size:20px"],"background:rgba(255,213,79,0.06);border:1px solid rgba(255,213,79,0.25);border-left:3px solid var(--yellow);padding:20px 24px":[["callout","callout--yellow","callout--bar"],"padding:20px 24px"],"font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--yellow);margin-bottom:12px":[["eyebrow","eyebrow--md","t-yellow","mb-12"],""],"margin-top:12px;font-size:12.5px;color:var(--muted2);line-height:1.7":[["prose","mt-12","t-muted2"],""],"display:flex;flex-direction:column;gap:14px":[["stack","gap-14"],""],"background:rgba(255,112,67,0.08);border:1px solid rgba(255,112,67,0.25);border-left:3px solid var(--orange);padding:14px 16px":[["callout","callout--orange","callout--bar"],""],"display:flex;flex-direction:column;gap:12px":[["stack","gap-12"],""],"border-left:2px solid var(--orange);padding:12px 16px;background:var(--orange-dim)":[[],"border-left:2px solid var(--orange);padding:12px 16px;background:var(--orange-dim)"],"font-size:11px;color:var(--orange);font-weight:500;margin-bottom:6px":[["fs-11","t-orange","fw-500","mb-6"],""],"margin-top:16px;background:rgba(0,255,136,0.04);border:1px solid rgba(0,255,136,0.15);padding:14px 16px":[["callout","callout--accent","mt-16"],""],"display:flex;gap:10px":[["row","gap-10"],""],"color:var(--accent);flex-shrink:0":[["t-accent","shrink-0"],""],"background:rgba(255,213,79,0.06);border:1px solid rgba(255,213,79,0.25);border-left:3px solid var(--yellow);padding:16px 20px":[["callout","callout--yellow","callout--bar"],"padding:16px 20px"],"font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--yellow);margin-bottom:10px":[["eyebrow","eyebrow--md","t-yellow","mb-10"],""],"font-size:12.5px;color:var(--muted2);line-height:1.8;font-style:italic":[["prose","prose--loose","t-muted2","italic"],""],"border:1px dashed var(--border2);padding:14px 16px;font-size:12.5px;color:var(--muted);line-height:1.7":[["prose","t-muted"],"border:1px dashed var(--border2);padding:14px 16px"],"background:rgba(179,157,219,0.05);border:1px solid rgba(179,157,219,0.2);border-left:3px solid var(--purple);padding:12px 14px":[["callout","callout--purple","callout--bar","callout--sm"],""],"display:grid;grid-template-columns:1fr 1fr;gap:10px":[["gap-10"],"display:grid;grid-template-columns:1fr 1fr"],"background:var(--surface2);border:1px solid var(--border);padding:14px":[["panel"],""],"font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);margin-bottom:6px":[["eyebrow","eyebrow--tight","eyebrow--lg","t-accent","mb-6"],""],"font-size:10px;color:var(--muted2);margin-bottom:8px":[["fs-10","t-muted2","mb-8"],""],"background:var(--code-bg);padding:10px;font-size:10px;line-height:1.6;color:#a6e3a1;border:1px solid var(--border)":[["code-panel","code-panel--sm","c-str"],""],"font-size:10px;color:var(--muted);margin-top:8px":[["fs-10","t-muted","mt-8"],""],"font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);margin-bottom:8px":[["eyebrow","eyebrow--tight","eyebrow--lg","t-accent","mb-8"],""],"display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start":[["gap-12"],"display:grid;grid-template-columns:1fr 1fr;align-items:start"],"background:rgba(255,213,79,0.04);border:1px solid rgba(255,213,79,0.2);padding:14px":[["callout","callout--yellow"],"padding:14px"],"display:grid;grid-template-columns:90px 90px 1fr;gap:6px 12px;font-size:10px;align-items:center":[["fs-10"],"display:grid;grid-template-columns:90px 90px 1fr;gap:6px 12px;align-items:center"],"color:var(--muted2);padding:4px 0;border-bottom:1px solid var(--border)":[["t-muted2","py-4","bb"],""],"margin-top:10px;font-size:11px;color:var(--orange);background:rgba(255,112,67,0.06);padding:10px 12px;border:1px solid rgba(255,112,67,0.2)":[["callout","callout--orange","mt-10","fs-11","t-orange"],"padding:10px 12px"],"background:rgba(255,112,67,0.06);border:1px solid rgba(255,112,67,0.2);border-left:3px solid var(--orange);padding:14px":[["callout","callout--orange","callout--bar"],"padding:14px"],"font-size:12.5px;color:var(--text);line-height:1.7;margin-bottom:10px":[["prose","t-text","mb-10"],""],"background:var(--code-bg);padding:12px;font-size:10px;line-height:1.7;color:#a6e3a1;border:1px solid var(--border)":[["code-panel","p-12","fs-10","lh-17","c-str"],""],"font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted2);margin-bottom:8px":[["eyebrow","eyebrow--md","t-muted2","mb-8"],""],"background:rgba(0,255,136,0.03);border:1px solid rgba(0,255,136,0.15);padding:14px":[["callout","callout--accent"],"padding:14px"],"display:grid;grid-template-columns:1fr auto;gap:6px 24px;font-size:10px":[["fs-10"],"display:grid;grid-template-columns:1fr auto;gap:6px 24px"],"font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--blue);margin-bottom:8px":[["eyebrow","eyebrow--lg","t-blue","mb-8"],""],"font-size:12.5px;color:var(--text);line-height:1.8":[["prose","prose--loose","t-text"],""],"background:var(--code-bg);padding:16px;font-size:12.5px;line-height:1.8;color:#c8d0e8;border:1px solid var(--border);margin-top:12px":[["code-panel","mt-12"],""],"display:flex;flex-direction:column;gap:8px;margin-top:12px;font-size:12.5px;color:var(--muted2);line-height:1.7":[["prose","stack","gap-8","mt-12","t-muted2"],""],"color:var(--text);margin-top:4px":[["t-text","mt-4"],""],"background:rgba(255,213,79,0.04);border:1px solid rgba(255,213,79,0.2);padding:14px 16px":[["callout","callout--yellow"],""],"font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--yellow);margin-bottom:8px":[["eyebrow","eyebrow--lg","t-yellow","mb-8"],""],"display:grid;grid-template-columns:1fr auto;gap:6px 24px;font-size:11px":[["fs-11"],"display:grid;grid-template-columns:1fr auto;gap:6px 24px"],"font-size:11px;color:var(--muted);margin-top:10px":[["fs-11","t-muted","mt-10"],""],"background:var(--code-bg);padding:16px;font-size:12.5px;line-height:1.8;color:#c8d0e8;border:1px solid var(--border);margin:12px 0":[["code-panel"],"margin:12px 0"],"display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:var(--muted2);line-height:1.7":[["prose","stack","gap-8","t-muted2"],""],"display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:var(--text);line-height:1.7":[["prose","stack","gap-8","t-text"],""],"font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--purple);margin-bottom:8px":[["eyebrow","eyebrow--lg","t-purple","mb-8"],""],"font-style:normal":[["upright"],""],"font-size:12.5px;color:var(--text);line-height:1.8;margin-bottom:12px":[["prose","prose--loose","t-text","mb-12"],""],"display:grid;grid-template-columns:1fr 1fr;gap:2px;font-size:12.5px":[["gap-2","fs-12-5"],"display:grid;grid-template-columns:1fr 1fr"],"background:var(--surface2);border:1px solid var(--border);padding:12px;color:var(--muted2)":[["panel","p-12","t-muted2"],""],"background:var(--surface2);border:1px solid var(--border);padding:12px;color:var(--accent);font-weight:500;text-align:center":[["panel","p-12","t-accent","fw-500"],"text-align:center"],"background:var(--surface2);border:1px solid var(--border);padding:12px;color:var(--text);text-align:center":[["panel","p-12","t-text"],"text-align:center"],"font-size:12.5px;color:var(--muted2);line-height:1.7;margin-top:12px":[["prose","t-muted2","mt-12"],""],"background:rgba(0,255,136,0.03);border:1px solid rgba(0,255,136,0.15);padding:14px 16px":[["callout","callout--accent"],""],"font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--accent);margin-bottom:8px":[["eyebrow","eyebrow--lg","t-accent","mb-8"],""],"background:var(--code-bg);padding:16px;font-size:12.5px;line-height:1.8;color:#c8d0e8;border:1px solid var(--border)":[["code-panel"],""],"font-size:12.5px;color:var(--text);line-height:1.7;margin-top:12px":[["prose","t-text","mt-12"],""],"margin-top:2px":[["mt-2"],""],"font-size:12.5px;color:var(--muted2);line-height:1.8":[["prose","prose--loose","t-muted2"],""],"background:rgba(255,112,67,0.06);border:1px solid rgba(255,112,67,0.2);border-left:3px solid var(--orange);padding:14px 16px":[["callout","callout--orange","callout--bar"],""],"font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--orange);margin-bottom:8px":[["eyebrow","eyebrow--lg","t-orange","mb-8"],""],"font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--blue);margin-bottom:10px":[["eyebrow","eyebrow--lg","t-blue","mb-10"],""],"display:grid;grid-template-columns:22px 1fr;gap:8px 12px;font-size:12.5px;color:var(--muted2);line-height:1.7":[["prose","t-muted2"],"display:grid;grid-template-columns:22px 1fr;gap:8px 12px"],"background:var(--code-bg);border:1px solid var(--border);padding:14px 16px":[["code-island"],"border:1px solid var(--border);padding:14px 16px"],"display:grid;grid-template-columns:110px 1fr;gap:6px 18px;font-size:12px;align-items:baseline":[["fs-12"],"display:grid;grid-template-columns:110px 1fr;gap:6px 18px;align-items:baseline"],"font-size:12px;color:var(--muted2);line-height:1.7;margin-top:12px":[["prose","prose--sm","t-muted2","mt-12"],""],"font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--purple);margin-bottom:10px":[["eyebrow","eyebrow--lg","t-purple","mb-10"],""],"display:flex;flex-direction:column;gap:10px;font-size:11px":[["stack","gap-10","fs-11"],""],"border-left:2px solid var(--orange);padding:8px 12px;background:rgba(255,112,67,0.05)":[[],"border-left:2px solid var(--orange);padding:8px 12px;background:var(--orange-wash)"],"color:var(--orange);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px":[["eyebrow","eyebrow--tight","eyebrow--md","t-orange","mb-4"],""],"color:var(--muted);font-size:10px;margin-top:4px":[["t-muted","fs-10","mt-4"],""],"border-left:2px solid var(--accent);padding:8px 12px;background:rgba(0,255,136,0.04)":[[],"border-left:2px solid var(--accent);padding:8px 12px;background:var(--accent-wash)"],"color:var(--accent);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px":[["eyebrow","eyebrow--tight","eyebrow--md","t-accent","mb-4"],""],"background:var(--bg);border:1px solid var(--border2);padding:6px 12px;display:block;margin:8px 0;color:var(--accent);font-size:11px":[["keycap","t-accent"],"display:block;margin:8px 0"],"font-size:12.5px;color:var(--text);line-height:1.8;margin-bottom:10px":[["prose","prose--loose","t-text","mb-10"],""],"border-left-color:var(--orange);background:rgba(255,112,67,0.06)":[[],"border-left-color:var(--orange);background:var(--orange-wash)"],"display:grid;grid-template-columns:1fr 1fr;gap:2px;font-size:11.5px":[["gap-2","fs-11-5"],"display:grid;grid-template-columns:1fr 1fr"],"background:var(--surface2);border:1px solid var(--border);padding:10px 12px;color:var(--accent);font-weight:500":[["panel","panel--sm","t-accent","fw-500"],""],"background:var(--surface2);border:1px solid var(--border);padding:10px 12px;color:var(--muted2)":[["panel","panel--sm","t-muted2"],""],"background:var(--bg);border:1px solid var(--border2);padding:12px 14px;font-size:12.5px;color:var(--text);line-height:1.7":[["prose","t-text"],"background:var(--bg);border:1px solid var(--border2);padding:12px 14px"],"display:grid;grid-template-columns:80px 1fr;gap:8px;align-items:start":[["kv","kv--80"],""],"color:var(--yellow);font-weight:500":[["t-yellow","fw-500"],""],"background:rgba(179,157,219,0.05);border:1px solid rgba(179,157,219,0.2);border-left:3px solid var(--purple);padding:14px 16px;margin-bottom:18px":[["callout","callout--purple","callout--bar","mb-18"],""],"border:1px solid var(--border);margin-bottom:16px":[["mb-16"],"border:1px solid var(--border)"],"background:var(--surface2);padding:10px 16px;border-bottom:1px solid var(--border);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent)":[["eyebrow","eyebrow--tight","eyebrow--xl","bb","t-accent"],"background:var(--surface2);padding:10px 16px"],"padding:16px":[["p-16"],""],"font-size:12.5px;color:var(--muted2);line-height:1.7;margin-bottom:12px":[["prose","t-muted2","mb-12"],""],"margin-top:12px;border:1px solid rgba(79,195,247,0.2)":[["mt-12"],"border:1px solid var(--blue-line)"],"background:var(--blue-dim);color:var(--blue)":[["t-blue"],"background:var(--blue-dim)"],"font-size:10px":[["fs-10"],""],"padding:14px 16px":[[],"padding:14px 16px"],"font-size:12.5px":[["fs-12-5"],""],"font-size:12px;color:var(--muted2);line-height:1.7;margin-top:10px":[["prose","prose--sm","t-muted2","mt-10"],""],"background:rgba(255,112,67,0.06);border:1px solid rgba(255,112,67,0.25);border-left:3px solid var(--orange);padding:16px 18px":[["callout","callout--orange","callout--bar"],"padding:16px 18px"],"font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--orange);margin-bottom:10px":[["eyebrow","eyebrow--lg","t-orange","mb-10"],""],"border-top:2px solid var(--blue)":[[],"border-top:2px solid var(--blue)"],"font-size:30px;color:var(--blue)":[["t-blue"],"font-size:30px"],"display:flex;flex-direction:column;gap:10px;font-size:12.5px;color:var(--muted2);line-height:1.7":[["prose","stack","gap-10","t-muted2"],""],"font-size:12.5px;color:var(--text);line-height:1.8;font-style:italic":[["prose","prose--loose","t-text","italic"],""],"display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:6px 20px;font-size:11.5px":[["fs-11-5"],"display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:6px 20px"],"color:var(--muted2);padding:5px 0;border-bottom:1px solid var(--border)":[["t-muted2","bb"],"padding:5px 0"],"color:var(--text);padding:4px 0":[["t-text","py-4"],""],"color:var(--muted2);padding:4px 0":[["t-muted2","py-4"],""],"display:flex;flex-direction:column;gap:18px":[["stack","gap-18"],""],"display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px":[["gap-2"],"display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)"],"background:var(--surface2);border:1px solid var(--border);padding:8px 12px;font-size:10px;color:var(--accent)":[["panel","fs-10","t-accent"],"padding:8px 12px"],"border:1px solid var(--border);border-top:none;font-size:11.5px;line-height:1.7":[["fs-11-5","lh-17"],"border:1px solid var(--border);border-top:none"],"background:var(--surface2);border:1px solid var(--border);padding:8px 12px;font-size:10px;color:var(--blue)":[["panel","fs-10","t-blue"],"padding:8px 12px"],"background:rgba(255,112,67,0.06);border:1px solid rgba(255,112,67,0.2);border-left:3px solid var(--orange);padding:14px 16px;margin-bottom:14px":[["callout","callout--orange","callout--bar","mb-14"],""],"display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px 20px;font-size:11.5px":[["fs-11-5"],"display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px 20px"],"border-top:2px solid var(--purple);margin-top:4px":[["mt-4"],"border-top:2px solid var(--purple)"],"margin-top:14px;font-style:italic":[["mt-14","italic"],""]};
function migrateEditHTML(html) {
  if (html.indexOf('style=') < 0) return html;
  var box = document.createElement('div'); box.innerHTML = html;
  $$('[style]', box).forEach(function (n) {
    var key = n.getAttribute('style').split(';').map(function (s) { return s.trim(); }).filter(Boolean).join(';');
    var hit = V10_STYLE_MAP[key];
    if (!hit) return;
    hit[0].forEach(function (c) { n.classList.add(c); });
    if (hit[1]) n.setAttribute('style', hit[1]); else n.removeAttribute('style');
  });
  return box.innerHTML;
}

function sameHTML(a, b) {
  var x = document.createElement('template'), y = document.createElement('template');
  x.innerHTML = a; y.innerHTML = b;
  return x.innerHTML.replace(/\s+/g, ' ').trim() === y.innerHTML.replace(/\s+/g, ' ').trim();
}
function restoreEdits() {
  // v13 swapped Phases 3 and 3.5, so block positions in those two files moved and
  // unpublished edits saved against the old layout would land on the wrong blocks.
  if ((state._editsLayout || 0) < 13) {
    var stale = Object.keys(state._edits).filter(function (k) { return /^phase3[bc]?:/.test(k); });
    stale.forEach(function (k) { delete state._edits[k]; });
    state._editsLayout = 13;
    if (stale.length) setTimeout(function () { toast(plural(stale.length, 'unpublished edit') + ' in Phase 3 / 3.5 cleared — those phases were reorganised'); }, 900);
  }
  Object.keys(state._edits).forEach(function (k) {
    var el = document.querySelector('[data-ek="' + k.replace(/"/g, '') + '"]');
    if (!el) return;
    var html = migrateEditHTML(state._edits[k]);
    if (sameHTML(el.innerHTML, html)) { delete state._edits[k]; return; }   // already merged into the live content
    el.innerHTML = html;
  });
}
function captureEdit(anchor) {
  if (!anchor) return;
  state._edits[anchor.getAttribute('data-ek')] = cleanHTML(anchor);
  save();
}
function setEditing(on) {
  document.body.classList.toggle('editing', on);
  if (on) closePlay(document);
  $('#tb-edit').classList.toggle('editing-on', on);
  $$('[data-ek]').forEach(function (a) {
    if (on) a.setAttribute('contenteditable', 'true');
    else a.removeAttribute('contenteditable');
  });
  if (on) {
    injectEditControls();
    toast('Edit mode on — text is editable, tasks can be added, duplicated or deleted');
  } else {
    $$('.em-ctl, .em-add').forEach(function (n) { n.remove(); });
    reindex();
    renderWeekly();
  }
  state._editing = on;
  save();
}
function injectEditControls() {
  $$('.task, .cp-item').forEach(function (t) {
    if ($('.em-ctl', t)) return;
    t.insertAdjacentHTML('beforeend',
      '<span class="em-ctl" contenteditable="false"><button data-dup="1" title="Duplicate">⧉</button>' +
      '<button class="del" data-del="1" title="Delete">×</button></span>');
  });
  $$('.tasks, .checkpoint-items').forEach(function (c) {
    if (c.nextElementSibling && c.nextElementSibling.classList.contains('em-add')) return;
    var isCp = c.classList.contains('checkpoint-items');
    c.insertAdjacentHTML('afterend',
      '<button class="em-add" contenteditable="false" data-add="' + (isCp ? 'cp' : 'task') + '">+ add ' + (isCp ? 'checkpoint item' : 'task') + '</button>');
  });
}
function newId(prefix) { return prefix + '-custom-' + Date.now().toString(36); }
function reindex() { index = null; refresh(); }

document.addEventListener('click', function (e) {
  if (!document.body.classList.contains('editing')) return;
  var b;
  if ((b = e.target.closest('[data-dup]'))) {
    e.stopPropagation();
    var row = b.closest('.task, .cp-item');
    var copy = row.cloneNode(true);
    copy.classList.remove('done');
    copy.dataset.id = newId(row.classList.contains('task') ? 'task' : 'cp');
    $$('.tn-wrap, .tn-btn', copy).forEach(function (n) { n.remove(); });
    row.after(copy);
    afterStructureChange(copy);
    return;
  }
  if ((b = e.target.closest('[data-del]'))) {
    e.stopPropagation();
    var r = b.closest('.task, .cp-item'), host = r.parentNode;
    r.remove();
    afterStructureChange(host);
    return;
  }
  if ((b = e.target.closest('[data-add]'))) {
    e.stopPropagation();
    var isCp = b.dataset.add === 'cp';
    var host2 = b.previousElementSibling;
    var el = document.createElement('div');
    if (isCp) {
      el.className = 'cp-item';
      el.dataset.id = newId('cp');
      el.innerHTML = '<span class="cp-cb">✓</span><span class="cp-text">New checkpoint — describe what you should be able to do</span>';
    } else {
      el.className = 'task';
      el.dataset.id = newId('task');
      el.innerHTML = '<div class="task-cb">✓</div><div class="task-content"><div class="task-text">New task — click to rename</div>' +
        '<div class="task-note">What exactly to do, and how you know it worked.</div></div>';
    }
    host2.appendChild(el);
    afterStructureChange(el);
    var target = $('.task-text, .cp-text', el);
    if (target) { var rg = document.createRange(); rg.selectNodeContents(target); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg); }
    return;
  }
}, true);

function afterStructureChange(node) {
  injectNotesFor(node.closest ? node.closest('[data-ek]') : null);
  injectEditControls();
  captureEdit(node.closest ? node.closest('[data-ek]') : null);
  reindex();
}
function injectNotesFor(scope) {
  $$('.task[data-id]', scope || document).forEach(function (t) {
    if ($('.tn-btn', t)) return;
    var id = t.dataset.id, v = state._notes[id] || '';
    t.insertAdjacentHTML('beforeend',
      '<button class="tn-btn' + (v.trim() ? ' has' : '') + '" data-note="' + id + '">' + (v.trim() ? 'note ●' : 'note') + '</button>' +
      '<div class="tn-wrap" data-nw="' + id + '"><textarea placeholder="Notes for this task.">' + esc(v) + '</textarea>' +
      '<div class="tn-meta"><span>Saved</span><span data-nc="' + id + '"></span></div></div>');
  });
}

var editTimer = null;
document.addEventListener('input', function (e) {
  if (!document.body.classList.contains('editing')) return;
  var a = e.target.closest('[data-ek]');
  if (!a) return;
  clearTimeout(editTimer);
  editTimer = setTimeout(function () { captureEdit(a); reindex(); }, 500);
});

function revertEdits() {
  if (!window.confirm('Discard your text and task edits and restore the original wording?')) return;
  state._edits = {};
  save();
  location.reload();
}

/* ─── DOWNLOAD EDITED HTML ─── */
function downloadHTML() {
  var doc = document.documentElement.cloneNode(true);
  $$(INJECTED, doc).forEach(function (n) { n.remove(); });
  $$('[contenteditable]', doc).forEach(function (n) { n.removeAttribute('contenteditable'); });
  $$('.flash', doc).forEach(function (n) { n.classList.remove('flash'); });
  $$('.term', doc).forEach(function (n) { n.classList.remove('term'); ['data-term', 'role', 'tabindex'].forEach(function (a) { n.removeAttribute(a); }); });
  var rail = $('#rail', doc);
  if (rail) rail.innerHTML = '<button class="rl-resume" id="rl-resume"><span class="rl-resume-txt"></span></button><div class="rl-lastvisit" id="rl-lastvisit"></div>';
  var seg = $('#tb-seg', doc); if (seg) seg.innerHTML = '';
  var res = $('#pal-res', doc); if (res) res.innerHTML = '';
  var body = $('body', doc); if (body) body.className = '';
  $$('.done', doc).forEach(function (n) { n.classList.remove('done'); });
  var out = '<!DOCTYPE html>\n' + doc.outerHTML;
  var blob = new Blob([out], { type: 'text/html' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'game-dev-roadmap-edited-' + new Date().toISOString().slice(0, 10) + '.html';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  toast('Downloaded — your edits are baked into that file');
}

$('#tb-edit').addEventListener('click', function () { setEditing(!document.body.classList.contains('editing')); });
$('#m-edit').addEventListener('click', function () { closeMenu(); setEditing(!document.body.classList.contains('editing')); });
$('#m-download').addEventListener('click', function () { closeMenu(); downloadHTML(); });
$('#m-revert').addEventListener('click', function () { closeMenu(); revertEdits(); });
$('#em-done').addEventListener('click', function () { setEditing(false); });
$('#em-download').addEventListener('click', downloadHTML);

/* ─── v17: WEEKLY PRACTICE ────────────────────────────────────
   The Weekly Practice page (#sync-agenda) is a self-study checklist
   that resets every Monday, plus three exercise picks from
   content/exercises.json chosen from the phases you've reached:
   one from where you are now, one review from an earlier phase,
   one that breaks something on purpose. Picks are seeded by the week
   so every device shows the same ones, and they skip exercises you've
   already done. state._week (this week's ticks, picks, target) and
   state._exDone (exercise id → week it was done) sync as user_state.
   ───────────────────────────────────────────────────────────── */
var EX = null, exById = {};
var WK_ITEMS = [
  ['ex', 'Do this week’s exercises', 'At least one of the three picks below. All three if you have the time.'],
  ['rebuild', 'Rebuild one thing from memory', 'Pick a task you’ve finished, close the page, and write it again in a blank file. Compare when it works.'],
  ['skills', 'Rate your skills honestly', 'Go down the cheat sheet for where you are and move the dots. Practiced means you’ve done it. Solid means you could do it cold.'],
  ['confused', 'Write down what confused you', 'One thing that cost you time this week, what you tried, and what fixed it. A task note is a good home for it.'],
  ['push', 'Commit and push the week’s work', 'Small commits, messages that say what changed. Then set next week’s target below.']
];
var WK_SLOTS = [['now', 'Now'], ['review', 'Review'], ['break', 'Break it']];
if (!state._exDone) state._exDone = {};

function isoWeek(d) {
  var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var day = (t.getDay() + 6) % 7;                // Monday = 0
  t.setDate(t.getDate() - day + 3);              // Thursday decides the year
  var y = t.getFullYear(), jan4 = new Date(y, 0, 4);
  var n = 1 + Math.round(((t - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return y + '-W' + (n < 10 ? '0' : '') + n;
}
function weekStart() {
  var d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return d;
}
function curWeek() {
  var wk = isoWeek(new Date()), w = state._week;
  if (!w || typeof w !== 'object' || w.wk !== wk) {
    var last = w && typeof w === 'object' ? (w.wk ? w.target : w.lastTarget) : '';
    state._week = { wk: wk, check: {}, picks: null, basis: '', swaps: [0, 0, 0], target: '', lastTarget: last || '' };
  }
  if (!state._exDone || typeof state._exDone !== 'object') state._exDone = {};
  if (!state._week.check) state._week.check = {};
  if (!state._week.swaps) state._week.swaps = [0, 0, 0];
  return state._week;
}
function hashStr(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; }

function loadExercises() {
  return fetch('content/exercises.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (x) {
      if (!x || !x.exercises) return;
      EX = x;
      x.exercises.forEach(function (e) { exById[e.id] = e; });
      renderWeekly();
      if (!currentView && $('#dash')) renderDash();
    })
    .catch(function () {});
}

/* where you are: the phase you're working in, and every phase you've started */
function reachInfo() {
  var g = GROUPS.filter(function (x) { return x[0] === 'Phases'; })[0];
  var order = (g ? g[1] : []).filter(function (id) { return byId[id]; });
  var started = order.filter(function (id) { var c = counts(byId[id]); return c.done + c.cpsDone > 0; });
  var next = nextTask(), nextPh = next ? (next.closest('.phase') || {}).id : null;
  // Phase 7 runs alongside everything from week 3, so it doesn't set "now" unless it's all you've touched
  var main = started.filter(function (id) { return id !== 'phase7'; });
  var now = nextPh && started.indexOf(nextPh) >= 0 ? nextPh : (main[main.length - 1] || started[0] || order[0]);
  var reached = started.slice();
  if (now && reached.indexOf(now) < 0) reached.push(now);
  return { now: now, reached: reached, started: started, order: order };
}
function exPool(phases, kinds, avoid) {
  return EX.exercises.filter(function (e) {
    return phases.indexOf(e.phase) >= 0 && (!kinds || kinds.indexOf(e.kind) >= 0) && avoid.indexOf(e.id) < 0;
  });
}
function pickOne(list, seed) {
  if (!list.length) return null;
  var fresh = list.filter(function (e) { return !state._exDone[e.id]; });
  var from = fresh.length ? fresh : list;
  return from[hashStr(seed) % from.length];
}
function pickSlot(i, info, w, avoid) {
  var seed = w.wk + ':' + i + ':' + (w.swaps[i] || 0), e = null;
  if (i === 0) e = pickOne(exPool([info.now], null, avoid), seed);
  if (i === 1) {
    var earlier = info.reached.filter(function (id) { return id !== info.now; });
    e = pickOne(exPool(earlier.length ? earlier : [info.now], null, avoid), seed);
  }
  if (i === 2) e = pickOne(exPool(info.reached, ['break', 'predict'], avoid), seed) || pickOne(exPool(info.reached, null, avoid), seed);
  return e || pickOne(exPool(info.reached, null, avoid), seed) || pickOne(exPool(info.reached, null, []), seed);
}
/* this week's three picks; kept for the week, but a slot you haven't done yet
   moves with you when you start a new phase */
function weekPicks() {
  var w = curWeek(), info = reachInfo(), changed = false;
  var picks = (w.picks || []).slice(0, 3);
  var basis = info.now + '|' + info.reached.join(',');
  for (var i = 0; i < 3; i++) {
    var cur = exById[picks[i]], doneNow = cur && state._exDone[cur.id] === w.wk;
    if (cur && (doneNow || w.basis === basis)) continue;
    var avoid = picks.filter(function (p, j) { return j !== i && p; });
    var e = pickSlot(i, info, w, avoid);
    if (e && e.id !== picks[i]) { picks[i] = e.id; changed = true; }
  }
  if (changed || w.basis !== basis || !w.picks) { w.picks = picks; w.basis = basis; save(); }
  return { picks: picks, info: info };
}
function weekExDone(w) {
  return (w.picks || []).filter(function (id) { return id && state._exDone[id] === w.wk; }).length;
}
function weeklyCount() {
  var w = curWeek(), n = 0;
  WK_ITEMS.forEach(function (it) { if (it[0] === 'ex' ? (w.check.ex || weekExDone(w) > 0) : w.check[it[0]]) n++; });
  return { done: n, total: WK_ITEMS.length };
}
function plainText(html) { var d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }

function renderWeekly() {
  var boxC = $('[data-weekly="checklist"]'), boxE = $('[data-weekly="exercises"]');
  if (!boxC || !boxE || document.body.classList.contains('editing')) return;
  var w = curWeek(), wc = weeklyCount();
  var info = EX ? weekPicks() : null, nowSec = info ? byId[info.info.now] : null;
  var exDoneN = weekExDone(w);
  var ws = weekStart(), we = new Date(ws); we.setDate(ws.getDate() + 6);
  var fmt = function (d) { return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };

  var h = '<div class="wk-live"><div class="wk-head"><span class="wk-when">' + fmt(ws) + ' – ' + fmt(we) + '</span>' +
    '<span class="wk-count' + (wc.done === wc.total ? ' full' : '') + '">' + wc.done + ' / ' + wc.total + '</span></div>' +
    '<div class="wk-bar"><i style="width:' + Math.round(wc.done / wc.total * 100) + '%"></i></div><ul class="wk-list">';
  WK_ITEMS.forEach(function (it) {
    var on = it[0] === 'ex' ? (w.check.ex || exDoneN > 0) : !!w.check[it[0]];
    var act = '';
    if (it[0] === 'ex') act = '<span class="wk-note">' + exDoneN + ' of 3 picks done</span>';
    if (it[0] === 'skills' && nowSec && GLOSS && GLOSS.phases[nowSec.id]) act = '<button class="wk-link" data-sheet="' + nowSec.id + '">Open the ' + esc(nowSec.num) + ' cheat sheet</button>';
    if (it[0] === 'confused' && byId.session2) act = '<button class="wk-link" data-go="session2">Session notes</button>';
    h += '<li class="wk-row"><button class="wk-item' + (on ? ' done' : '') + '" data-wk="' + it[0] + '" role="checkbox" aria-checked="' + on + '">' +
      '<span class="wk-cb" aria-hidden="true">' + (on ? '✓' : '') + '</span><span class="wk-txt"><b>' + esc(it[1]) + '</b><small>' + esc(it[2]) + '</small></span></button>' +
      (act ? '<div class="wk-act">' + act + '</div>' : '') + '</li>';
  });
  h += '</ul><div class="wk-target"><label for="wk-target">Next week’s target</label>' +
    '<input id="wk-target" type="text" maxlength="160" autocomplete="off" placeholder="A specific task or checkpoint, e.g. finish the 03 high-score build" value="' + esc(w.target || '') + '">' +
    (w.lastTarget ? '<small>Last week you aimed for: <b>' + esc(w.lastTarget) + '</b></small>' : '') + '</div></div>';
  boxC.innerHTML = h;

  if (!EX) { boxE.innerHTML = '<div class="wk-live"><div class="prose t-muted">Loading exercises…</div></div>'; return; }
  var reachedTxt = info.info.reached.map(function (id) { return byId[id] ? byId[id].num : id; }).join(', ');
  var e = '<div class="wk-live"><div class="wk-basis">Picked for where you are: <b>' + esc(nowSec ? nowSec.num + ' · ' + nowSec.title : '') + '</b>' +
    (info.info.reached.length > 1 ? '<span>Review from: ' + esc(reachedTxt) + '</span>' : '') + '</div><div class="wk-exs">';
  info.picks.forEach(function (id, i) {
    var x = exById[id];
    if (!x) return;
    var done = state._exDone[id] === w.wk, ps = byId[x.phase];
    var ask = askOn() ? '<a class="wk-ask" target="_blank" rel="noopener" href="' + askURL('I’m learning C (MSVC on Windows). Give me a hint, not the answer, for this exercise.\n\n' +
      x.title + '\n' + plainText(x.what) + '\nSteps:\n' + x.steps.map(function (s, k) { return (k + 1) + '. ' + plainText(s); }).join('\n') + '\nDone when: ' + plainText(x.done)) + '">Ask Claude for a hint</a>' : '';
    e += '<article class="wk-ex' + (done ? ' done' : '') + '">' +
      '<div class="wk-ex-top"><span class="wk-slot">' + WK_SLOTS[i][1] + '</span>' + (i === 2 && x.kind === 'break' ? '' : '<span class="wk-kind">' + esc(EX.kinds[x.kind] || x.kind) + '</span>') + '<span class="wk-mins">~' + x.mins + ' min</span></div>' +
      (ps ? '<button class="wk-ex-ph" data-go="' + ps.id + '">' + esc(ps.num + ' · ' + ps.title) + '</button>' : '') +
      '<h4 class="wk-ex-title">' + esc(x.title) + '</h4>' +
      '<p class="wk-ex-what">' + x.what + '</p>' +
      '<ol class="wk-ex-steps">' + x.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
      '<div class="wk-ex-done"><b>Done when</b> ' + x.done + '</div>' +
      '<div class="wk-ex-act"><button class="wk-tick' + (done ? ' on' : '') + '" data-exdone="' + id + '" aria-pressed="' + done + '">' + (done ? '✓ Done this week' : 'Mark done') + '</button>' +
      (done ? '' : '<button class="wk-swap" data-exswap="' + i + '">Swap</button>') + ask + '</div></article>';
  });
  boxE.innerHTML = e + '</div></div>';
}

document.addEventListener('click', function (e) {
  if (document.body.classList.contains('editing')) return;
  var el;
  if ((el = e.target.closest('.wk-item[data-wk]'))) {
    e.stopPropagation();
    var w = curWeek(), k = el.dataset.wk;
    if (k === 'ex' && weekExDone(w) > 0) { toast('This one ticks itself when you mark an exercise done'); return; }
    w.check[k] = !w.check[k];
    save(); renderWeekly();
    if (!currentView && $('#dash')) renderDash();
    return;
  }
  if ((el = e.target.closest('[data-exdone]'))) {
    e.stopPropagation();
    var wk = curWeek(), id = el.dataset.exdone;
    if (state._exDone[id] === wk.wk) delete state._exDone[id];
    else { state._exDone[id] = wk.wk; logDone(); }
    state._exDone = Object.assign({}, state._exDone);   // new object, so sync sees the change
    save(); renderWeekly();
    return;
  }
  if ((el = e.target.closest('[data-exswap]'))) {
    e.stopPropagation();
    var ww = curWeek(), i = +el.dataset.exswap, before = (ww.picks || [])[i];
    var info = reachInfo(), avoid = (ww.picks || []).filter(function (p, j) { return j !== i && p; }).concat(before ? [before] : []);
    var pick = null;
    for (var tries = 0; tries < 8 && !pick; tries++) {
      ww.swaps[i] = (ww.swaps[i] || 0) + 1;
      pick = pickSlot(i, info, ww, avoid);
      if (pick && pick.id === before) pick = null;
    }
    if (!pick) { toast('No other exercise fits this slot yet'); return; }
    ww.picks = ww.picks.slice(); ww.picks[i] = pick.id;
    save(); renderWeekly();
    return;
  }
}, true);
document.addEventListener('input', function (e) {
  if (e.target.id !== 'wk-target') return;
  curWeek().target = e.target.value;
  save();
});

/* ─── v19/v22: CONCEPT LADDER ─────────────────────────────────
   A phase with data-ladder="<id>" teaches from content/ladders/<id>.json:
   one concept (rung) per page, each with why → a program you step
   through (optionally ▶ See it run, when window.RTSPlay has a scene
   for it) → one check → a small try-it → optional Q&A → a line
   pointing at the next page. renderLadder(pid) draws only the rung
   you're on (state._ladder[pid].cur) into that concept page's mount;
   the table of contents (lad-toc), goals and Start / Continue live on
   the Overview page (renderOverview). Passing a check moves that
   rung's glossary skills to Practiced. Which rungs are done and which
   one is open sync as user_state "_ladder"; the page you were on is
   "_pages". Walkthrough position and answers stay on this page view.
   ───────────────────────────────────────────────────────────── */
var LADDERS = {}, LAD_UI = {};
window.RTS_LADDERS = LADDERS;   // the See It Run engine reads rung code from here
/* v23: when a concept moves to another phase (Phase 2 split, Phase 3.5 split),
   its tick moves with it. Each entry runs once per _ladder object; the flag
   lives inside _ladder so a cloud copy from before the move is migrated too.
   Format: { id: 'unique-name', from: 'phase2', to: 'phase2b', rungs: ['if', 'loops'] } */
var LAD_MIGRATIONS = [
  { id: 'v23-phase2-split', from: 'phase2', to: 'phase2b', rungs: ['if', 'switch', 'loops', 'rand'] },
  { id: 'v23-phase3b-split', from: 'phase3b', to: 'phase3c', rungs: ['enum', 'headers', 'linker', 'debugger'] }
];
var ladMigSeen = null;
function ladMigrate() {
  var lad = state._ladder;
  if (!lad || lad === ladMigSeen) return;
  ladMigSeen = lad;
  var mig = lad._mig && typeof lad._mig === 'object' ? lad._mig : (lad._mig = {}), changed = false;
  LAD_MIGRATIONS.forEach(function (m) {
    if (mig[m.id]) return;
    var from = lad[m.from], to = lad[m.to] || (lad[m.to] = { done: {}, cur: 0 });
    if (!to.done || typeof to.done !== 'object') to.done = {};
    if (from && from.done) m.rungs.forEach(function (rid) {
      if (from.done[rid]) { to.done[rid] = from.done[rid]; delete from.done[rid]; }
    });
    mig[m.id] = true; changed = true;
  });
  if (changed) save();
}
/* goals map a checkpoint to the concepts behind it, by rung id ("variables") or by
   1-based position (older ladders). Ids survive reordering; positions don't. */
function ladGoalNums(d, list) {
  if (!list || !list.length) return null;
  return list.map(function (g) {
    if (typeof g === 'number') return g;
    for (var k = 0; k < d.rungs.length; k++) if (d.rungs[k].id === g) return k + 1;
    return 0;
  }).filter(function (n) { return n > 0; });
}
function ladState(pid) {
  if (!state._ladder || typeof state._ladder !== 'object') state._ladder = {};
  ladMigrate();
  var l = state._ladder[pid];
  if (!l || typeof l !== 'object') l = state._ladder[pid] = { done: {}, cur: 0 };
  if (!l.done || typeof l.done !== 'object') l.done = {};
  return l;
}
/* v23 "Learn it": the textbook explanation, between Why and the walkthrough.
   r.learn = { parts: [[heading, html], ...], king: "§2.4, §2.7" }. Open until the
   concept is passed, then folded so a return visit lands on the code. */
function ladLearnHTML(r, passed) {
  var L = r.learn, words = 0;
  var body = L.parts.map(function (p) {
    words += String(p[1]).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    return (p[0] ? '<h4 class="lad-lh">' + esc(p[0]) + '</h4>' : '') + '<div class="lad-lt">' + p[1] + '</div>';
  }).join('');
  var mins = Math.max(1, Math.round(words / 200));
  return '<section class="lad-part lad-learn"><details class="lad-lbox"' + (passed ? '' : ' open') + '>' +
    '<summary class="lad-ph"><b>2</b>Learn it<span class="lad-lmin">~' + mins + ' min read</span></summary>' +
    '<div class="lad-lbody">' + body + (L.king ? '<p class="lad-king">King’s version: <b>' + esc(L.king) + '</b></p>' : '') + '</div></details></section>';
}
function ladUI(pid) { return LAD_UI[pid] || (LAD_UI[pid] = { step: {}, ans: {}, rev: {} }); }
function loadLadders() {
  sections.forEach(function (s) {
    if (!s.isPhase || !s.ladder || !s.hasPages) return;
    var pid = s.id;
    fetch('content/ladders/' + pid + '.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) {
        if (d && d.rungs && d.rungs.length) LADDERS[pid] = d;
        else s.ladder = false;   // no ladder: Learn / Trace / Build / Practice / Review pages
        buildPages(s);
        if (LADDERS[pid]) renderLadder(pid);
      });
  });
}
var LAD_KW = /^(return|if|else|while|for|switch|case|break|default|do|true|false|sizeof)$/, LAD_TY = /^(int|float|char|bool|double|void|unsigned)$/;
function ladHL(line) {
  var out = '', m, last = 0, re = /(____)|(\/\/.*$)|(#\w+)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)')|\b(\d+(?:\.\d+)?f?)\b|\b([A-Za-z_]\w*)\b(?=\s*\()|\b([A-Za-z_]\w*)\b/g;
  while ((m = re.exec(line))) {
    out += esc(line.slice(last, m.index)); last = re.lastIndex;
    var t = esc(m[0]);
    if (m[1]) out += '<span class="lad-blank">____</span>';
    else if (m[2]) out += '<span class="c-cm">' + t + '</span>';
    else if (m[3]) out += '<span class="c-pp">' + t + '</span>';
    else if (m[4]) out += '<span class="c-str">' + t.replace(/____/g, '<span class="lad-blank">____</span>') + '</span>';
    else if (m[5]) out += '<span class="c-num">' + t + '</span>';
    else if (m[6]) out += LAD_KW.test(m[6]) ? '<span class="c-kw">' + t + '</span>' : '<span class="c-fn">' + t + '</span>';
    else if (m[7]) out += LAD_TY.test(m[7]) ? '<span class="c-type">' + t + '</span>' : LAD_KW.test(m[7]) ? '<span class="c-kw">' + t + '</span>' : t;
  }
  return out + esc(line.slice(last));
}
function ladCode(src, hi) {
  return '<div class="lad-code">' + src.split('\n').map(function (l, i) {
    var n = i + 1;
    return '<div class="lad-ln' + (hi ? (n === hi ? ' hi' : ' dim') : '') + '"><i>' + n + '</i><span>' + (ladHL(l) || ' ') + '</span></div>';
  }).join('') + '</div>';
}
function ladSkillNames(ids) {
  return ids.map(function (id) { return glossById[id] ? glossById[id].term : id; }).join(', ');
}
function renderLadder(pid) {
  libRender(); // the Library highlights the current concept
  var d = LADDERS[pid], s = byId[pid];
  if (!d || !s || !s.pages || document.body.classList.contains('editing')) return;
  var l = ladState(pid), ui = ladUI(pid), rungs = d.rungs;
  var i = Math.max(0, Math.min(rungs.length - 1, +l.cur || 0)), r = rungs[i];
  var mounts = $$('[data-ladder-mount="' + pid + '"]'), m = null;
  mounts.forEach(function (x) {
    if (+x.dataset.rung === i) { m = x; return; }
    if (x.innerHTML) { closePlay(x); x.innerHTML = ''; }   // only the concept you're on is drawn
  });
  if (!m) return;
  // an open See It Run player survives a redraw of the same concept: lift its host out, put it back after
  var keep = $('.lad-play-host', m);
  if (keep && !keep.firstChild) keep = null;
  if (keep && keep.parentNode) keep.parentNode.removeChild(keep);

  var h = '<div class="lad-live">';
  var step = ui.step[r.id] || 0, walkDone = step >= r.walk.length, ans = ui.ans[r.id], done = !!l.done[r.id];
  var tries = (ans && ans.tries) || [], right = tries.indexOf(r.check.a) >= 0;
  var hideWalk = ans && ans.skipped && right && tries.length === 1 && !ui.rev['walk' + r.id];
  var showCheck = walkDone || done || ans;
  var canPlay = !!(window.RTSPlay && RTSPlay.has && RTSPlay.has(pid, r.id));

  h += '<article class="lad-rung"><header class="lad-hd"><div><div class="lad-kick">Concept ' + (i + 1) + ' of ' + rungs.length + ' · ' + esc(r.kick) + ' · ~' + r.mins + ' min</div>' +
    '<h3 class="lad-title">' + esc(r.title) + '</h3><div class="lad-builds"><b>Builds on</b> ' + r.builds + '</div></div>' +
    (done || right ? '' : '<button class="lad-quiz" data-lad-quiz>I know this: quiz me</button>') + '</header>';
  h += '<section class="lad-part"><div class="lad-ph"><b>1</b>Why you need it</div><p class="lad-why">' + r.why + '</p></section>';
  var off = r.learn && r.learn.parts && r.learn.parts.length ? 1 : 0;   // v23: "Learn it" pushes the later part numbers down one
  if (off) h += ladLearnHTML(r, done || right);

  if (!hideWalk) {
    var at = step > 0 ? r.walk[Math.min(step, r.walk.length) - 1] : null;
    var watch = canPlay && ui.watch === r.id;   // one view: either the step-through or the player, never both
    h += '<section class="lad-part"><div class="lad-ph lad-ph2"><span><b>' + (2 + off) + '</b>See it, one line at a time</span>' +
      (canPlay ? '<span class="lad-seg" role="group" aria-label="How to see it"><button data-lad-mode="step" aria-pressed="' + !watch + '"' + (watch ? '' : ' class="on"') + '>Step through</button>' +
        '<button data-lad-mode="watch" aria-pressed="' + watch + '"' + (watch ? ' class="on"' : '') + '>▶ Watch it run</button></span>' : '') + '</div>' +
      (watch ? '<div class="lad-play-host"></div>' : ladCode(r.code, at ? at[0] : 0) +
      '<div class="lad-walk"><div class="lad-note">' + (at ? '<small>Line ' + at[0] + ' · stop ' + Math.min(step, r.walk.length) + ' of ' + r.walk.length + '</small>' + at[1]
        : '<small>' + r.walk.length + ' stops</small>Read the whole program once. Then step through the lines that matter.') + '</div>' +
      '<div class="lad-ctl"><button class="lad-btn" data-lad-walk="-1"' + (step === 0 ? ' disabled' : '') + '>Back</button>' +
      (step < r.walk.length ? '<button class="lad-btn go" data-lad-walk="1">' + (step === 0 ? 'Start' : 'Next line') + '</button>' : '<button class="lad-btn" data-lad-walk="restart">From the top</button>') +
      '</div></div>' + (walkDone ? '<p class="lad-model">' + r.model + '</p>' : '')) + '</section>';
  }

  if (!showCheck) {
    h += '<section class="lad-part lad-wait"><div class="lad-ph"><b>' + (3 + off) + '</b>Check, try, curious</div><p>These open when you finish the walkthrough' + (canPlay ? ' or watch it run to the end' : '') + ', or straight away with <b>I know this: quiz me</b>.</p></section>';
  } else {
    var c = r.check;
    h += '<section class="lad-part" data-lad-check><div class="lad-ph"><b>' + (3 + off) + '</b>Check: predict it</div><div class="lad-q">' + esc(c.q) + '</div><div class="lad-opts">' +
      c.opts.map(function (o, k) {
        var st = tries.indexOf(k) >= 0 ? (k === c.a ? ' right' : ' wrong') : (done && k === c.a && !tries.length ? ' right' : '');
        return '<button class="lad-opt' + st + '" data-lad-opt="' + k + '"' + (right ? ' disabled' : '') + '>' + esc(o) + '</button>';
      }).join('') + '</div>';
    if (!right) {
      var lastWrong = tries.length ? tries[tries.length - 1] : null;
      if (lastWrong !== null) h += '<div class="lad-fb miss">' + esc((c.miss || {})[lastWrong] || 'Not quite. Try another.') + '</div>';
      h += ans && ans.hint ? '<div class="lad-hint">Hint: ' + esc(c.hint) + '</div>' : '<button class="lad-link" data-lad-hint>Show a hint</button>';
      if (done && !tries.length) h += '<div class="lad-note-done">You passed this one before. Answer again for practice, or move on.</div>';
    } else {
      h += '<div class="lad-fb"><b>' + (tries.length === 1 ? 'Right first time.' : 'Got it.') + '</b> ' + esc(c.why) + '</div>' +
        (hideWalk ? '<button class="lad-link" data-lad-showwalk>Show the walkthrough anyway</button>' : '') +
        (r.skills && r.skills.length ? '<div class="lad-skill"><i></i>' + esc(ladSkillNames(r.skills)) + ' → Practiced on your cheat sheet</div>' : '');
    }
    h += '</section>';
    if (right || done) {
      var rev = ui.rev[r.id];
      h += '<section class="lad-part"><div class="lad-ph"><b>' + (4 + off) + '</b>Try it in VS Code</div><p class="lad-p">' + esc(r.tryit.task) + '</p>' + ladCode(r.tryit.code, 0) +
        (rev ? '<div class="lad-ans"><small>One answer</small><pre>' + esc(r.tryit.answer) + '</pre></div>' : '<button class="lad-link" data-lad-reveal>Show one answer</button>') + '</section>';
      h += '<section class="lad-part"><div class="lad-ph"><b>' + (5 + off) + '</b>Curious? (optional)</div><div class="lad-qas">' +
        r.qa.map(function (q) { return '<details class="lad-qa"><summary>' + esc(q[0]) + '</summary><div>' + q[1] + '</div></details>'; }).join('') + '</div></section>';
      var nextP = s.pages[pageIndex(s, String(i + 1)) + 1];
      h += '<div class="lad-bridge"><p>' + r.bridge + '</p>' + (nextP
        ? '<button class="lad-btn go" data-pg-go="' + nextP.key + '">' + esc(nextP.rung !== undefined ? 'Concept ' + (nextP.rung + 1) : nextP.label) + ' ›</button>' : '') + '</div>';
    }
  }
  m.innerHTML = h + '</article></div>';
  if (keep) {
    var nh = $('.lad-play-host', m);
    if (nh) nh.parentNode.replaceChild(keep, nh);
    else if (window.RTSPlay) RTSPlay.close(keep);   // the walkthrough part is gone, so the player goes too
  } else if (canPlay && ui.watch === r.id) {
    var wh = $('.lad-play-host', m);
    if (wh && window.RTSPlay) RTSPlay.open(wh, pid, r.id);
  }
  renderOverview(pid);   // done ticks, pills and Start / Continue follow the ladder state
  renderStrip(s);
}
// watching See It Run to the end counts as finishing the walkthrough, so the check opens
document.addEventListener('rtsplay:ended', function (e) {
  var ph = e.target.closest && e.target.closest('.phase'), pid = ph && ph.dataset.ladder, d = pid && LADDERS[pid];
  if (!d) return;
  var r = d.rungs[Math.max(0, Math.min(d.rungs.length - 1, +ladState(pid).cur || 0))], ui = ladUI(pid);
  if ((ui.step[r.id] || 0) >= r.walk.length) return;
  ui.step[r.id] = r.walk.length;
  renderLadder(pid);
});
document.addEventListener('click', function (e) {
  if (document.body.classList.contains('editing')) return;
  var el = e.target.closest('[data-lad-go], [data-lad-walk], [data-lad-quiz], [data-lad-opt], [data-lad-hint], [data-lad-reveal], [data-lad-showwalk], [data-lad-mode]');
  if (!el) return;
  var ph = el.closest('.phase'), pid = ph && ph.dataset.ladder && ph.id, d = pid && LADDERS[pid];
  if (!d) return;
  e.stopPropagation();
  var l = ladState(pid), ui = ladUI(pid), r = d.rungs[Math.max(0, Math.min(d.rungs.length - 1, +l.cur || 0))];
  if (el.hasAttribute('data-lad-go')) {
    showPage(pid, String(+el.dataset.ladGo + 1), { push: true });   // sets cur, redraws, scrolls to the top of the page
    return;
  }
  if (el.hasAttribute('data-lad-walk')) {
    var v = el.dataset.ladWalk;
    ui.step[r.id] = v === 'restart' ? 1 : Math.max(0, Math.min(r.walk.length, (ui.step[r.id] || 0) + (+v)));
    renderLadder(pid); return;
  }
  if (el.hasAttribute('data-lad-quiz')) {
    var a = ui.ans[r.id] = ui.ans[r.id] || { tries: [] }; a.skipped = true;
    renderLadder(pid);
    var ck = document.querySelector('[data-ladder-mount="' + pid + '"] [data-lad-check]');
    if (ck) scrollToEl(ck, TOPBAR + 90);
    return;
  }
  if (el.hasAttribute('data-lad-mode')) {
    if (el.dataset.ladMode === 'watch') ui.watch = r.id;
    else { ui.watch = null; closePlay(el.closest('.lad-part')); }   // back to the walkthrough where you left it
    renderLadder(pid);
    return;
  }
  if (el.hasAttribute('data-lad-opt')) {
    var an = ui.ans[r.id] = ui.ans[r.id] || { tries: [] }, k = +el.dataset.ladOpt;
    if (an.tries.indexOf(k) < 0) an.tries.push(k);
    if (k === r.check.a) {
      if (!l.done[r.id]) { l.done[r.id] = true; logDone(); }
      (r.skills || []).forEach(function (id) { if ((+state._skills[id] || 0) < 1) setSkill(id, 1); });
      save();
    }
    renderLadder(pid); return;
  }
  if (el.hasAttribute('data-lad-hint')) { (ui.ans[r.id] = ui.ans[r.id] || { tries: [] }).hint = true; renderLadder(pid); return; }
  if (el.hasAttribute('data-lad-reveal')) { ui.rev[r.id] = true; renderLadder(pid); return; }
  if (el.hasAttribute('data-lad-showwalk')) { ui.rev['walk' + r.id] = true; renderLadder(pid); return; }
}, true);

/* ─── BOOT ─── */
markAnchors();
restoreEdits();
stageAll();
buildRail();
$('#rail').insertAdjacentHTML('beforeend', '<div class="rl-log" id="rl-log"></div>');
renderRailFoot();
buildDock();
buildNext();
renderLog();
buildSegments();
decorateHeaders();
injectPerPhase();
applyState();
applyAppearance();
sections.forEach(function (s) { if (s.isPhase) setOpen(s.el, true); });   // only the current section is shown
renderAsk();
showView(sectionFromHash(), { keepScroll: false, page: pageFromHash() });
if (state._lastVisit) {
  var d = new Date(state._lastVisit);
  $('#rl-lastvisit').textContent = 'Last session: ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
spy();

/* ─── ACCESSIBILITY: keyboard + screen-reader semantics for clickable rows ───
   Tasks and checkpoint items behave as checkboxes; phase and section headers
   as disclosure buttons; prompt boxes as copy buttons. Enter/Space activate. */
function a11ySync() {
  var editing = document.body.classList.contains('editing');
  $$('.task, .cp-item').forEach(function (el) {
    el.setAttribute('role', 'checkbox');
    el.setAttribute('aria-checked', el.classList.contains('done') ? 'true' : 'false');
    el.tabIndex = editing ? -1 : 0;
  });
  $$('.phase-header').forEach(function (h) {
    h.setAttribute('role', 'button'); h.tabIndex = 0;
    var p = h.closest('.phase');
    h.setAttribute('aria-expanded', p && p.classList.contains('open') ? 'true' : 'false');
  });
  $$('.section-block-header').forEach(function (h) {
    var acc = h.closest('.acc-section');
    if (!acc) return;
    h.setAttribute('role', 'button'); h.tabIndex = 0;
    h.setAttribute('aria-expanded', acc.classList.contains('open') ? 'true' : 'false');
  });
  $$('.prompt-text').forEach(function (p) {
    p.setAttribute('role', 'button'); p.tabIndex = editing ? -1 : 0;
    if (!p.hasAttribute('aria-description')) p.setAttribute('aria-description', 'Copies this prompt');
  });
}
var a11yQueued = false;
new MutationObserver(function () {
  if (a11yQueued) return; a11yQueued = true;
  requestAnimationFrame(function () { a11yQueued = false; a11ySync(); });
}).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  var t = e.target;
  if (!t || t.isContentEditable || /^(input|textarea|button|a|summary|select)$/i.test(t.tagName)) return;
  if (!t.matches('[role="checkbox"], [role="button"]')) return;
  e.preventDefault(); t.click();
});
a11ySync();
loadGlossary();
loadExercises();
loadLadders();
document.addEventListener('rtsplay:loaded', function (e) {
  // the player's specs arrived after the concept page drew: redraw so the ▶ button shows up
  var pid = e && e.detail && e.detail.pid, s = pid && byId[pid];
  if (s && s.pages && currentView === pid && LADDERS[pid]) renderLadder(pid);
});
renderWeekly();
updateTimeUI();


/* ─── hooks for js/cloud.js and js/github.js ─── */
window.RTS_app = {
  getState: function () { return state; },
  setState: function (s) {
    var keep = { _edits: state._edits, _theme: state._theme, _font: state._font, _codeFont: state._codeFont, _phases: state._phases, _solo: state._solo, _session: state._session };
    state = s; Object.keys(keep).forEach(function (k) { if (keep[k] !== undefined && !(k in s)) state[k] = keep[k]; });
    if (!state._notes) state._notes = {};
    if (!state._skills) state._skills = {};
    if (!state._time) state._time = {};
    if (!state._exDone) state._exDone = {};
    applyState();
    renderWeekly();
    Object.keys(LADDERS).forEach(renderLadder);
    $$('.skill[data-skill]').forEach(function (g) { var lv = +state._skills[g.dataset.skill] || 0; $$('button', g).forEach(function (b) { b.classList.toggle('on', +b.dataset.lv === lv); }); });
    $$('.cs-count').forEach(function (c) { c.textContent = sheetCount(c.dataset.phase); });
    libRender();
    updateTimeUI();
    if (!currentView && $('#dash')) renderDash();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  },
  toast: toast,
  edits: function () { return state._edits || {}; },
  clearEdits: function (keys) { keys.forEach(function (k) { delete state._edits[k]; }); save(); }
};
document.dispatchEvent(new CustomEvent('rts:ready'));
})();
