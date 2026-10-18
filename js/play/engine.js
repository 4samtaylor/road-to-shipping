/* =====================================================================
   RTSPlay: the "See it run" engine
   =====================================================================
   A tiny scene player. A SCENE (js/play/scenes-*.js) is the drawing code for one
   visual idea; a SPEC (content/play/<pid>.json) is a short timeline that drives a
   scene over a rung's code. See js/play/README.md for how to write both.

   PUBLIC API  (window.RTSPlay)
     RTSPlay.SCENES                      registry { name: sceneDef }
     RTSPlay.scene(name, def)            register a scene (see README for the contract)
     RTSPlay.load(pid)                   -> Promise<specs|null>. Fetches content/play/<pid>.json
                                         once ({ "<rungId>": spec }). A 404 / bad JSON is "no specs", silently.
     RTSPlay.has(pid, rungId)            SYNC boolean: true only when that phase's specs are loaded,
                                         the rung has a spec, and its scene is registered.
                                         First call for a pid starts the load in the background.
     RTSPlay.ready(pid, cb)              cb() once pid's specs have loaded (immediately if they have;
                                         never if the phase has none). Returns nothing.
     RTSPlay.open(host, pid, rungId)     mount a player into `host` (closing any player already there).
                                         Returns the player or null. Code comes from
                                         window.RTS_LADDERS[pid] (the ladder JSON object {rungs:[...]},
                                         or the rungs array) -> the rung with id === rungId -> .code,
                                         falling back to spec.code. Title/kick fall back to the rung's.
     RTSPlay.close(host)                 remove the player in `host` and its loop entry.
     RTSPlay.refresh()                   re-read theme colours (call after a theme switch; the engine
                                         also watches <html data-theme> itself).
     RTSPlay.mount(host, spec)           lower level: mount a fully formed spec (needs spec.code).
     RTSPlay.util                        drawing helpers for scenes (clamp, lerp, seg, EZ, rgba, txt, bg,
                                         pix, rrect, FONT)

   APP CONTRACT (how the app uses it)
     if (RTSPlay.has(pid, rungId)) { render a "See it run" button }
     on click:  RTSPlay.open(hostEl, pid, rungId);   when the rung is left: RTSPlay.close(hostEl)
     The first has() for a phase kicks off the load; when specs arrive the engine fires
        document.dispatchEvent(new CustomEvent('rtsplay:loaded', { detail: { pid } }))
     (only if the phase actually has specs). Re-render the rung on that event so the button appears.

   LOOP: one shared requestAnimationFrame loop. It only runs while at least one player is
   on screen (IntersectionObserver) and the tab is visible; otherwise no frames are scheduled.
   prefers-reduced-motion: each step is drawn at its end state (no tweening); Play still advances.
   ===================================================================== */
(function () {
  'use strict';
  if (window.RTSPlay) return;

  var BASE = (function () {
    try { return new URL('../../content/play/', document.currentScript.src).href; } catch (e) { return 'content/play/'; }
  })();

  /* ---------- helpers ---------- */
  var clamp = function (x, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return Math.min(b, Math.max(a, x)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var outBounce = function (t) { var n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
  var startE = function (t) { return t < .2 ? 2.7778 * t * t : .1111 + (t - .2) * 1.1111; };   // accelerate, then constant speed
  var EZ = {
    lin: function (t) { return t; }, in: function (t) { return t * t; }, out: function (t) { return 1 - (1 - t) * (1 - t); },
    io: function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    back: function (t) { var c = 2.70158; return 1 + c * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2); },
    bounce: outBounce, start: startE, end: function (t) { return 1 - startE(1 - t); }
  };
  function rgba(hex, a) { var n = parseInt(String(hex).replace('#', ''), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  var FONT = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  function txt(c, s, x, y, o) {
    o = o || {}; c.save(); c.font = (o.w || 500) + ' ' + (o.size || 11) + 'px ' + FONT;
    c.textAlign = o.align || 'center'; c.textBaseline = o.base || 'middle'; c.fillStyle = o.col || '#fff';
    if (o.al != null) c.globalAlpha *= o.al; c.fillText(s, x, y); c.restore();
  }
  function bg(c, C, W, H) {
    c.fillStyle = C.surface; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(154,154,186,.08)';
    for (var x = 10; x < W; x += 20) for (var y = 10; y < H; y += 20) c.fillRect(x, y, 1.5, 1.5);
  }
  function pix(c, rows, x, y, u, cols, al) {   // pixel-art sprite from strings; digits index into cols ('0' = empty)
    c.save(); if (al != null) c.globalAlpha *= al;
    rows.forEach(function (r, j) { for (var i = 0; i < r.length; i++) { var ch = r[i]; if (ch !== '0') { c.fillStyle = cols[+ch]; c.fillRect(x + i * u, y + j * u, u, u); } } });
    c.restore();
  }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---------- palette (theme tokens -> canvas colours) ---------- */
  var probe = null;
  function toHex(v, fb) {   // normalise any CSS colour to #rrggbb so rgba() works on every theme
    v = (v || '').trim(); if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    try {
      probe = probe || document.createElement('canvas').getContext('2d');
      probe.fillStyle = '#000'; probe.fillStyle = v; var s = probe.fillStyle;
      if (/^#/.test(s)) return s;
      var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s); if (m) return '#' + [m[1], m[2], m[3]].map(function (n) { return ('0' + (+n).toString(16)).slice(-2); }).join('');
    } catch (e) {}
    return fb;
  }
  function mix(hex, to, t) {
    var a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16), f = function (s) { return Math.round(lerp(a >> s & 255, b >> s & 255, t)); };
    return '#' + [16, 8, 0].map(function (s) { return ('0' + f(s).toString(16)).slice(-2); }).join('');
  }
  function palette() {
    var cs = getComputedStyle(document.documentElement), g = function (k, fb) { return toHex(cs.getPropertyValue(k), fb); };
    var P = { bg: g('--bg', '#080810'), surface: g('--surface', '#0e0e1a'), surface2: g('--surface2', '#13131f'),
      border: g('--border', '#1c1c30'), border2: g('--border2', '#252540'), text: g('--text', '#dde1f0'),
      muted: g('--muted', '#7c7ca0'), muted2: g('--muted2', '#9a9aba'), accent: g('--accent', '#00ff88'),
      orange: g('--orange', '#ff7043'), purple: g('--purple', '#b39ddb'), yellow: g('--yellow', '#ffd54f'), blue: g('--blue', '#4fc3f7') };
    P.ink = '#080810';                       // dark text/outline that sits on top of a coloured fill
    P.accentDk = mix(P.accent, '#000000', .42);   // darker accent (legs, shading)
    return P;
  }

  /* ---------- ligature guard: the code font fuses -> <= >= != == into one glyph. Canvas has no
     font-variant-ligatures, but a non-zero letterSpacing turns ligatures off (Chrome/Safari/Firefox);
     where letterSpacing is unsupported, fall back to a zero-width non-joiner between the characters ---------- */
  function nl(t) { return typeof t === 'string' ? t.replace(/->|<=|>=|!=|==/g, function (m) { return m[0] + '\u200C' + m[1]; }) : t; }
  function noLig(c) {
    var ls = 'letterSpacing' in c, f1 = c.fillText, f2 = c.strokeText, mt = c.measureText;
    function wrap(f) { return function (t) { if (ls) c.letterSpacing = '0.01px'; else arguments[0] = nl(t); return f.apply(c, arguments); }; }
    c.fillText = wrap(f1); c.strokeText = wrap(f2);
    c.measureText = function (t) { if (ls) c.letterSpacing = '0.01px'; else t = nl(t); return mt.call(c, t); };
  }

  /* ---------- highlighter (same rules and classes as the ladder code panel) ---------- */
  var KW = /^(return|if|else|while|for|switch|case|break|default|do|true|false|sizeof)$/, TY = /^(int|float|char|bool|double|void|unsigned)$/;
  function hl(line) {
    var out = '', m, last = 0, re = /(____)|(\/\/.*$)|(#\w+)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)')|\b(\d+(?:\.\d+)?f?)\b|\b([A-Za-z_]\w*)\b(?=\s*\()|\b([A-Za-z_]\w*)\b/g;
    while ((m = re.exec(line))) {
      out += esc(line.slice(last, m.index)); last = re.lastIndex;
      var t = esc(m[0]);
      if (m[1]) out += '<span class="lad-blank">____</span>';
      else if (m[2]) out += '<span class="c-cm">' + t + '</span>';
      else if (m[3]) out += '<span class="c-pp">' + t + '</span>';
      else if (m[4]) out += '<span class="c-str">' + t.replace(/____/g, '<span class="lad-blank">____</span>') + '</span>';
      else if (m[5]) out += '<span class="c-num">' + t + '</span>';
      else if (m[6]) out += KW.test(m[6]) ? '<span class="c-kw">' + t + '</span>' : '<span class="c-fn">' + t + '</span>';
      else if (m[7]) out += TY.test(m[7]) ? '<span class="c-type">' + t + '</span>' : KW.test(m[7]) ? '<span class="c-kw">' + t + '</span>' : t;
    }
    return out + esc(line.slice(last));
  }

  /* ---------- injected CSS (tokens only, so all themes work) ---------- */
  function injectCSS() {
    if (document.getElementById('rtsp-style')) return;
    var st = document.createElement('style'); st.id = 'rtsp-style';
    st.textContent = [
      '.rtsp{background:var(--surface);border:1px solid var(--border);border-top:2px solid var(--purple,var(--accent));min-width:0;font-family:var(--font-mono,monospace);color:var(--text)}',
      '.rtsp *{box-sizing:border-box}',
      '.rtsp-hd{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border)}',
      '.rtsp-badge{font-size:11px;color:var(--purple);border:1px solid var(--purple-line-strong,var(--border2));background:var(--purple-wash,transparent);padding:4px 10px}',
      '.rtsp-ttl{font-size:11px;color:var(--muted2);letter-spacing:.04em}',
      '.rtsp-body{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:12px 14px 14px}',
      '.rtsp.wide .rtsp-body{grid-template-columns:minmax(0,1fr) minmax(0,1.12fr);align-items:start}',
      '.rtsp-code,.rtsp-stage{min-width:0}',
      '.rtsp-stage{display:flex;flex-direction:column;gap:10px}',
      '.rtsp-codebox{position:relative;background:var(--code-bg);border:1px solid var(--code-line);overflow:auto;max-height:340px;font-family:var(--font-code,var(--font-mono,monospace));font-size:12.5px;line-height:1.75;padding:8px 0;color:var(--code-text)}',
      '.rtsp-codebox,.rtsp-con,.rtsp-note{font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0}',
      '.rtsp-ln{display:grid;grid-template-columns:32px max-content;padding-right:14px;border-left:2px solid transparent;min-width:100%;width:max-content;transition:opacity .15s}',
      '.rtsp-ln i{font-style:normal;text-align:right;padding-right:12px;color:var(--syn-cm);opacity:.7;font-size:11px;user-select:none}',
      '.rtsp-ln span{white-space:pre}',
      '.rtsp-ln.hi{background:var(--accent-wash);border-left-color:var(--accent);opacity:1}',
      '.rtsp-ln.dim{opacity:.62}',
      '.rtsp .c-kw{color:var(--syn-kw)}.rtsp .c-fn{color:var(--syn-fn)}.rtsp .c-str{color:var(--syn-str)}.rtsp .c-num{color:var(--syn-num)}',
      '.rtsp .c-cm{color:var(--syn-cm)}.rtsp .c-type{color:var(--syn-type)}.rtsp .c-pp{color:var(--syn-pp)}',
      '.rtsp-cv{position:relative;width:100%;aspect-ratio:400/250;background:var(--surface);border:1px solid var(--code-line);overflow:hidden}',
      '.rtsp-cv canvas{position:absolute;inset:0;width:100%;height:100%;display:block}',
      '.rtsp-note{font-size:13px;line-height:1.55;color:var(--text);min-height:3.1em;padding:8px 12px;background:var(--surface2);border:1px solid var(--border)}',
      '.rtsp-note small{display:block;font-size:10.5px;color:var(--muted);letter-spacing:.04em}',
      '.rtsp-conwrap{position:relative}',
      '.rtsp-conwrap::after{content:"console";position:absolute;right:8px;top:4px;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);pointer-events:none}',
      '.rtsp-con{background:var(--code-bg);border:1px solid var(--code-line);font-family:var(--font-code,var(--font-mono,monospace));font-size:12.5px;line-height:1.5;padding:6px 12px;height:calc(4.5em + 14px);overflow-y:auto;color:var(--syn-str);white-space:pre-wrap}',
      '.rtsp-con .pr{color:var(--muted)}',
      '.rtsp-con .cur{display:inline-block;width:.55em;height:1em;vertical-align:-.15em;background:var(--accent);opacity:.8;animation:rtsp-blink 1.1s steps(2) infinite}',
      '@keyframes rtsp-blink{50%{opacity:0}}',
      '.rtsp-ctl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
      '.rtsp-btn{font-family:var(--font-mono,monospace);font-size:12.5px;padding:8px 14px;cursor:pointer;white-space:nowrap;border:1px solid var(--border2);background:var(--surface);color:var(--text);min-height:36px}',
      '.rtsp-btn:hover:not(:disabled){border-color:var(--accent);color:var(--accent)}',
      '.rtsp-btn:disabled{opacity:.4;cursor:default}',
      '.rtsp-btn.go{border-color:var(--accent-line-strong);background:var(--accent-wash);color:var(--accent);min-width:104px}',
      '.rtsp-btn:focus-visible,.rtsp-codebox:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
      '.rtsp-pos{margin-left:auto;font-size:11px;color:var(--muted)}',
      '@media (max-width:480px){.rtsp-body{padding:10px 10px 12px}.rtsp-hd{padding:8px 10px}.rtsp-btn{padding:8px 11px}.rtsp-pos{flex-basis:100%;margin-left:0}}',
      '@media (prefers-reduced-motion:reduce){.rtsp-con .cur{animation:none}.rtsp-ln{transition:none}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- registry + spec loading ---------- */
  var SCENES = {}, SPECS = {}, STATE = {}, PROMISES = {}, WAIT = {};   // STATE[pid]: 'loading' | 'loaded' | 'none'
  function scene(name, def) {
    if (!def || typeof def.init !== 'function' || typeof def.apply !== 'function' || typeof def.tween !== 'function' || typeof def.draw !== 'function' || !def.W || !def.H) {
      if (window.console) console.warn('RTSPlay.scene("' + name + '"): needs W, H, init, apply, tween, draw');
      return;
    }
    SCENES[name] = def;
  }
  function load(pid) {
    if (PROMISES[pid]) return PROMISES[pid];
    STATE[pid] = 'loading';
    PROMISES[pid] = fetch(BASE + encodeURIComponent(pid) + '.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) {
        var ok = d && typeof d === 'object' && Object.keys(d).some(function (k) { return k.charAt(0) !== '_'; });
        if (!ok) { STATE[pid] = 'none'; return null; }
        SPECS[pid] = d; STATE[pid] = 'loaded';
        (WAIT[pid] || []).splice(0).forEach(function (cb) { try { cb(); } catch (e) { if (window.console) console.error(e); } });
        try { document.dispatchEvent(new CustomEvent('rtsplay:loaded', { detail: { pid: pid } })); } catch (e) {}
        return d;
      });
    return PROMISES[pid];
  }
  function ready(pid, cb) {
    if (STATE[pid] === 'loaded') { cb(); return; }
    (WAIT[pid] = WAIT[pid] || []).push(cb);
    load(pid);
  }
  function specFor(pid, rungId) { var s = SPECS[pid] && SPECS[pid][rungId]; return s && typeof s === 'object' ? s : null; }
  function has(pid, rungId) {
    if (!STATE[pid]) { load(pid); return false; }
    var s = specFor(pid, rungId);
    return !!(s && SCENES[s.scene] && s.steps && s.steps.length);
  }
  function rungOf(pid, rungId) {
    var L = window.RTS_LADDERS && window.RTS_LADDERS[pid]; if (!L) return null;
    var arr = Array.isArray(L) ? L : L.rungs; if (!arr) return null;
    for (var i = 0; i < arr.length; i++) if (arr[i].id === rungId) return arr[i];
    return null;
  }

  /* ---------- players + shared loop ---------- */
  var reduced = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var players = [], raf = 0, lastT = 0;
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { var p = e.target._rtsp; if (p) p.visible = e.isIntersecting; });
    kick();
  }, { threshold: 0 }) : null;

  function anyActive() { if (document.hidden) return false; for (var i = 0; i < players.length; i++) if (players[i].visible) return true; return false; }
  function kick() { if (!raf && anyActive()) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }
  function loop(now) {
    raf = 0;
    var dt = Math.min(60, now - lastT); lastT = now;
    players.slice().forEach(function (pl) { if (pl.visible) { pl.tick(dt); pl.ui(); pl.draw(now); } });
    if (anyActive()) raf = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else kick(); });

  function mount(host, spec) {
    injectCSS();
    var sc = SCENES[spec.scene]; if (!sc) { if (window.console) console.warn('RTSPlay: unknown scene "' + spec.scene + '"'); return null; }
    var n = spec.steps.length, lines = String(spec.code || '').split('\n');
    var root = document.createElement('div'); root.className = 'rtsp';
    root.innerHTML =
      '<div class="rtsp-hd"><span class="rtsp-badge">&#9654; See it run</span><span class="rtsp-ttl"></span></div>' +
      '<div class="rtsp-body">' +
      '<div class="rtsp-code"><div class="rtsp-codebox" tabindex="0" role="region" aria-label="Program code"></div></div>' +
      '<div class="rtsp-stage">' +
      '<div class="rtsp-cv"><canvas role="img"></canvas></div>' +
      '<div class="rtsp-note" aria-live="polite"></div>' +
      '<div class="rtsp-conwrap"><div class="rtsp-con" role="log" aria-label="Program output so far"></div></div>' +
      '<div class="rtsp-ctl">' +
      '<button class="rtsp-btn go" data-k="play" type="button"></button>' +
      '<button class="rtsp-btn" data-k="step" type="button" title="Run one line (Right arrow)">Step &#9658;|</button>' +
      '<button class="rtsp-btn" data-k="reset" type="button">&#10226; Reset</button>' +
      '<button class="rtsp-btn" data-k="speed" type="button"></button>' +
      '<span class="rtsp-pos" aria-live="off"></span></div></div></div>';
    root.querySelector('.rtsp-ttl').textContent = spec.title || '';
    host.appendChild(root);
    var $ = function (s) { return root.querySelector(s); }, codeEl = $('.rtsp-codebox'), cv = $('canvas'), noteEl = $('.rtsp-note'), conEl = $('.rtsp-con'), posEl = $('.rtsp-pos');
    var btn = function (k) { return root.querySelector('[data-k=' + k + ']'); };
    var lineEls = lines.map(function (t, i) { var d = document.createElement('div'); d.className = 'rtsp-ln'; d.innerHTML = '<i>' + (i + 1) + '</i><span>' + (hl(t) || ' ') + '</span>'; codeEl.appendChild(d); return d; });
    cv.setAttribute('aria-label', (spec.title || 'Program') + ' animation. Press Play or Step to run the program.');
    var ctx = cv.getContext('2d'), C = palette(), scale = 1;
    noLig(ctx);
    function resize() {
      var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, w = Math.max(1, Math.round(r.width * dpr)), h = Math.round(w * sc.H / sc.W);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } scale = w / sc.W;
      root.classList.toggle('wide', root.getBoundingClientRect().width >= 760);
    }
    var ro = window.ResizeObserver ? new ResizeObserver(function () { resize(); render(); }) : null;
    if (ro) { ro.observe(root); ro.observe(cv); }
    resize();

    var idx = -1, p = 0, playing = false, once = false, speed = 1, lastOut = null, lastIdx = -2;
    var states = [sc.init()];
    function stateAt(i) { while (states.length <= i) { var s = clone(states[states.length - 1]); spec.steps[states.length - 1].do.forEach(function (a) { sc.apply(s, a); }); states.push(s); } return states[i]; }
    var finished = function () { return idx === n - 1 && p >= 1; };

    function reset() { idx = -1; p = 0; playing = false; once = false; render(); }
    function play() { if (finished()) reset(); playing = true; once = false; if (idx < 0) { idx = 0; p = 0; } kick(); render(); }
    function pause() { playing = false; render(); }
    function step() {
      if (idx >= 0 && p < 1) { p = 1; playing = false; render(); return; }   // finish the current line first
      if (idx >= n - 1) return;
      idx++; p = 0; playing = true; once = true; kick(); render();
    }
    function tick(dt) {
      if (!playing) return;
      p += dt * speed / (spec.steps[idx].ms || 1000);
      if (p >= 1) { p = 1; if (once || idx >= n - 1) playing = false; else { idx++; p = 0; } }
    }
    btn('play').onclick = function () { playing ? pause() : play(); };
    btn('step').onclick = step; btn('reset').onclick = reset;
    btn('speed').onclick = function () { speed = speed === 1 ? .5 : 1; render(); };
    root.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' && !e.altKey && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'BUTTON') { e.preventDefault(); step(); } });

    var prompt = spec.prompt == null ? '> game.exe' : String(spec.prompt);
    function term(str) {   // terminal model: \n = new line, \r = back to column 0, chars overwrite in place
      var lines = [[]], col = 0;
      for (var i = 0; i < str.length; i++) {
        var ch = str[i], L = lines[lines.length - 1];
        if (ch === '\n') { lines.push([]); col = 0; }
        else if (ch === '\r') col = 0;
        else { while (L.length < col) L.push(' '); L[col++] = ch; }
      }
      return lines.map(function (l) { return l.join(''); }).join('\n');
    }
    function consoleText() {
      var s = ''; for (var k = 0; k < idx; k++) s += spec.steps[k].out || '';
      if (idx >= 0) { var st = spec.steps[idx]; if (st.out && (reduced.matches || p >= (st.outAt == null ? .5 : st.outAt))) s += st.out; }
      return s;
    }
    var endFired = false;   // 'rtsplay:ended' bubbles from the host the first time the last step completes
    function ui() {
      if (!endFired && finished()) { endFired = true; try { host.dispatchEvent(new CustomEvent('rtsplay:ended', { bubbles: true })); } catch (e) {} }
      btn('play').innerHTML = playing ? '&#10074;&#10074; Pause' : (finished() ? '&#9654; Replay' : '&#9654; Play');
      btn('step').disabled = idx >= n - 1 && p >= 1; btn('reset').disabled = idx < 0;
      btn('speed').textContent = (speed === 1 ? '1×' : '0.5×') + ' speed';
      btn('speed').setAttribute('aria-label', 'Playback speed ' + (speed === 1 ? 'normal' : 'half') + '. Press to switch to ' + (speed === 1 ? 'half' : 'normal') + ' speed.');
      posEl.textContent = idx < 0 ? n + ' steps' : 'step ' + (idx + 1) + ' / ' + n;
      if (idx !== lastIdx) {
        lastIdx = idx; var cur = idx >= 0 ? spec.steps[idx].line : -1;
        lineEls.forEach(function (el, i) { el.classList.toggle('hi', i + 1 === cur); el.classList.toggle('dim', cur > 0 && i + 1 !== cur); });
        if (cur > 0 && lineEls[cur - 1]) { var el = lineEls[cur - 1], top = el.offsetTop, h = el.offsetHeight;
          if (top < codeEl.scrollTop || top + h > codeEl.scrollTop + codeEl.clientHeight) codeEl.scrollTop = Math.max(0, top - codeEl.clientHeight / 2); }
        var nt = idx >= 0 ? spec.steps[idx].note : 'Press Play to watch the program run, or Step to go one line at a time.';
        noteEl.innerHTML = '<small>' + (idx >= 0 ? 'Line ' + spec.steps[idx].line : 'Ready') + '</small>'; noteEl.append(nt || '');
        cv.setAttribute('aria-label', (spec.title || 'Program') + ' animation. ' + (nt || ''));
      }
      var out = consoleText();
      if (out !== lastOut) { lastOut = out;
        conEl.innerHTML = (prompt ? '<span class="pr">' + esc(prompt) + '</span>\n' : '') + esc(term(out)) + '<span class="cur"></span>';
        conEl.scrollTop = conEl.scrollHeight; }
    }
    function draw(T) {
      var rm = reduced.matches, S = stateAt(Math.max(idx, 0)), V = clone(S);
      if (sc.prep) sc.prep(V, S);
      if (idx >= 0) { var pp = rm ? 1 : p; spec.steps[idx].do.forEach(function (a) { var at = a.at || 0, len = a.len || (1 - at); sc.tween(V, a, clamp((pp - at) / len), S, C); }); }
      ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.clearRect(0, 0, sc.W, sc.H);
      sc.draw(ctx, V, T, C, rm);
    }
    function render() { ui(); draw(performance.now()); }   // one-off paint (used when the loop is idle)

    var player = {
      host: host, root: root, visible: !io, tick: tick, draw: draw, ui: ui, render: render,
      refreshColours: function () { C = palette(); render(); },
      destroy: function () { if (ro) ro.disconnect(); if (io) io.unobserve(root); },
      api: { play: play, pause: pause, reset: reset, step: step, get state() { return { idx: idx, p: p, playing: playing, speed: speed }; } }
    };
    root._rtsp = player; host._rtsp = player;
    players.push(player);
    if (io) io.observe(root);
    render(); kick();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (players.indexOf(player) >= 0) player.refreshColours(); });
    return player;
  }

  function close(host) {
    var pl = host && host._rtsp; if (!pl) return;
    pl.destroy(); var i = players.indexOf(pl); if (i >= 0) players.splice(i, 1);
    if (pl.root.parentNode) pl.root.parentNode.removeChild(pl.root);
    host._rtsp = null;
    if (!players.length && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function open(host, pid, rungId) {
    if (!host) return null;
    close(host);
    var s = specFor(pid, rungId); if (!s || !SCENES[s.scene]) return null;
    var r = rungOf(pid, rungId), spec = Object.assign({}, s);
    spec.code = (r && r.code) || s.code || '';
    spec.title = s.title || (r && r.title) || '';
    return mount(host, spec);
  }
  function refresh() { players.forEach(function (p) { p.refreshColours(); }); }
  if (window.MutationObserver) new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

  window.RTSPlay = { SCENES: SCENES, scene: scene, load: load, ready: ready, has: has, open: open, close: close, refresh: refresh, mount: mount,
    util: { clamp: clamp, lerp: lerp, seg: seg, EZ: EZ, rgba: rgba, txt: txt, bg: bg, pix: pix, rrect: rrect, FONT: FONT, clone: clone } };
})();
