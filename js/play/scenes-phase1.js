/* =====================================================================
   RTSPlay phase 1 scenes: p1-recipe, p1-pipeline, p1-cursor, p1-compiler, p1-bat
   =====================================================================
   Load after scenes-core.js. Canvas is 400x250 logical px. Every scene lists its action names
   in `acts` (ignored by the engine, used by the spec checker).

   p1-recipe    (first program) a recipe card, a tool tray and a little screen
     tools {}                  the tool tray opens: #include <stdio.h> hands us printf
     start {}                  the "start here" flag lands on main
     pick  { i }               the printf tool goes to step i of the card and back
     tick  { i }               step i gets ticked
     show  { t }               the screen prints a line
     done  {}                  "done" stamp (return 0)
   p1-pipeline  (compile) hello_world.c -> compile -> .obj -> link -> .exe -> run, plus the folder and a screen
     cd    {}                  the folder window opens on p01
     dir   {}                  the folder's file list flashes
     cook  { k:1|2 }           1 = compile (.c -> .obj), 2 = link (.obj -> .exe)
     run   {}                  the .exe is started
     show  { t }               the screen prints a line (typed)
   p1-cursor    (escapes) a terminal, a cursor and a "key" caption
     key   { t, d }            the key cap t (like \t or %d) and what it does
     put   { t }               characters typed at the cursor (they overwrite what is under it)
     tab   {}  nl {}  cr {}    cursor jumps to the next tab stop / next line / start of this line
   p1-compiler  (errors) the compiler reads the broken program top to bottom
     read  { row }             the reading band moves to source row (1..7)
     wait  { row }             it has read row and is waiting for more (no ; yet)
     halt  { row }             it gives up on row
     blame { row }             dashed arrow to the end of row: the real mistake
     msg   {}                  the error message and "no program built"
     fix   {}                  the missing ; is added, everything goes green
   p1-bat       (build.bat) a script run in order: variable jar, the cl line, ERRORLEVEL note, the if gate
     quiet {}  set {}  cmd {}  expand {}  build {}  level { v }  gate { r:false }  ok {}
   ===================================================================== */
(function () {
  'use strict';
  if (!window.RTSPlay) return;
  var U = RTSPlay.util, clamp = U.clamp, lerp = U.lerp, seg = U.seg, EZ = U.EZ, rgba = U.rgba, txt = U.txt, bg = U.bg, pix = U.pix, rrect = U.rrect, FONT = U.FONT;
  var W = 400, H = 250;
  function reg(name, def) { def.W = W; def.H = H; RTSPlay.scene(name, def); }
  function pill(c, x, y, w, h, col, a, lw) { rrect(c, x - w / 2, y - h / 2, w, h, 3); c.fillStyle = rgba(col, a == null ? .16 : a); c.fill(); c.strokeStyle = rgba(col, .7); c.lineWidth = lw || 1; c.stroke(); }
  function pop(p) { return p > 0 && p < 1 ? 1 + .3 * Math.sin(Math.PI * p) : 1; }
  function doc(c, C, x, y, col, label, name, have, k, ext) {   // a file icon centred at x,y
    c.save(); c.translate(x, y); c.scale(k == null ? 1 : k, k == null ? 1 : k);
    if (!have) { c.strokeStyle = C.muted; c.globalAlpha = .45; c.setLineDash([3, 4]); c.lineWidth = 1.5; c.strokeRect(-15.5, -20.5, 31, 41); c.setLineDash([]); txt(c, '?', 0, 0, { size: 16, col: C.muted }); c.restore(); txt(c, name, x, y + 33, { size: 8, col: C.muted }); return; }
    c.beginPath(); c.moveTo(-15, -20); c.lineTo(8, -20); c.lineTo(15, -13); c.lineTo(15, 20); c.lineTo(-15, 20); c.closePath(); c.fillStyle = rgba(col, .2); c.fill(); c.strokeStyle = col; c.lineWidth = 1.5; c.stroke();
    c.beginPath(); c.moveTo(8, -20); c.lineTo(8, -13); c.lineTo(15, -13); c.strokeStyle = col; c.stroke();
    txt(c, label, 0, 4, { size: 11, w: 800, col: col });
    c.restore(); txt(c, name, x, y + 33, { size: 8, col: C.muted2 });
  }
  function gear(c, x, y, r, a, col) {
    c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col;
    for (var i = 0; i < 8; i++) { c.save(); c.rotate(i * Math.PI / 4); c.fillRect(-2.5, -r - 3, 5, 6); c.restore(); }
    c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(0, 0, r * .4, 0, 7); c.fill(); c.restore();
  }

  /* ================= p1-recipe ================= */
  (function () {
    var ROWS = ['show Hello, World!', 'show Ready to ship.', 'return 0 (all done)'], RY = [124, 156, 188];
    reg('p1-recipe', {
      acts: ['tools', 'start', 'pick', 'tick', 'show', 'done'],
      init: function () { return { tools: false, start: false, tick: [false, false, false], screen: [], done: false }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'tools': S.tools = true; break;
          case 'start': S.start = true; break;
          case 'tick': S.tick[a.i] = true; break;
          case 'show': S.screen.push(a.t); break;
          case 'done': S.done = true; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'tools': V.tools = true; V.toolsK = EZ.back(seg(lp, 0, .6)); break;
          case 'start': V.start = true; V.flagK = EZ.bounce(seg(lp, 0, .7)); break;
          case 'pick': V.pick = { i: a.i, p: lp }; break;
          case 'tick': V.tick[a.i] = lp >= .4; V.tickK = { i: a.i, p: seg(lp, .4, 1) }; break;
          case 'show': { var n = Math.floor(lp * (a.t.length + 1) + 1e-6); V.screen = S.screen.concat([a.t.slice(0, n)]); break; }
          case 'done': V.done = true; V.doneK = EZ.back(lp); break;
        }
      },
      prep: function (V, S) { V.pick = null; V.toolsK = null; V.flagK = null; V.tickK = null; V.doneK = null; },
      draw: function (c, V, T, C, rm) {
        bg(c, C, W, H);
        /* tool tray */
        txt(c, '#include <stdio.h>', 14, 16, { size: 10, w: 700, col: C.purple, align: 'left' });
        c.fillStyle = C.surface2; c.fillRect(14, 28, 372, 36); c.strokeStyle = V.tools ? rgba(C.purple, .6) : C.border2; c.lineWidth = 1.2;
        if (!V.tools) c.setLineDash([4, 4]); c.strokeRect(14.5, 28.5, 371, 35); c.setLineDash([]);
        if (!V.tools) txt(c, 'tool tray (empty)', 200, 46, { size: 10, col: C.muted });
        else {
          var k = V.toolsK == null ? 1 : V.toolsK, pk = V.pick, pos = [54, 46];
          txt(c, 'stdio.h gives us:', 28, 46, { size: 9, col: C.muted2, align: 'left' });
          if (!(pk && pk.p > 0 && pk.p < 1)) { c.save(); c.translate(172, 46); c.scale(k, k); pill(c, 0, 0, 58, 20, C.purple, .22); txt(c, 'printf', 0, 1, { size: 11, w: 700, col: C.text }); c.restore(); }
          else { var t = pk.p, out = Math.sin(Math.PI * t), ty = RY[pk.i]; var x = lerp(172, 112, EZ.io(out)), y = lerp(46, ty, EZ.io(out)); pill(c, 172, 46, 58, 20, C.purple, .06); c.save(); c.translate(x, y); pill(c, 0, 0, 58, 20, C.purple, .4, 2); txt(c, 'printf', 0, 1, { size: 11, w: 700, col: C.text }); c.restore(); }
        }
        /* recipe card */
        c.fillStyle = C.surface2; c.fillRect(14, 78, 196, 156); c.strokeStyle = C.border2; c.lineWidth = 1.2; c.strokeRect(14.5, 78.5, 195, 155);
        c.fillStyle = rgba(C.accent, .16); c.fillRect(14.5, 78.5, 195, 24);
        txt(c, 'main', 24, 90.5, { size: 12, w: 800, col: C.accent, align: 'left' });
        if (V.start) { var fk = V.flagK == null ? 1 : V.flagK; c.save(); c.translate(0, -(1 - fk) * 24); c.fillStyle = C.orange; c.fillRect(150, 82, 2, 17); c.fillRect(152, 82, 50, 9); txt(c, 'start here', 177, 86.7, { size: 7.5, w: 800, col: C.ink }); c.restore(); }
        ROWS.forEach(function (r, i) {
          var y = RY[i], on = V.tick[i], tk = V.tickK && V.tickK.i === i ? V.tickK.p : (on ? 1 : 0);
          txt(c, String(i + 1), 26, y, { size: 11, w: 700, col: C.muted });
          c.strokeStyle = on ? C.accent : C.muted; c.lineWidth = 1.5; c.strokeRect(190.5, y - 8.5, 17, 17);
          if (tk > 0) { c.save(); c.strokeStyle = C.accent; c.lineWidth = 2.5; c.beginPath(); c.moveTo(193, y); c.lineTo(196.5, y + 4); c.lineTo(204, y - 6 * tk); c.stroke(); c.restore(); }
          txt(c, r, 38, y, { size: 9.5, col: on ? C.text : C.muted2, align: 'left' });
        });
        /* screen */
        c.fillStyle = '#04040a'; c.fillRect(226, 78, 160, 112); c.strokeStyle = C.border2; c.lineWidth = 2; c.strokeRect(227, 79, 158, 110);
        txt(c, 'screen', 234, 90, { size: 8, col: C.muted, align: 'left' });
        V.screen.forEach(function (l, i) { txt(c, l, 234, 112 + i * 20, { size: 11, w: 700, col: C.accent, align: 'left' }); });
        if (V.screen.length && !rm && !V.done) { var lastW = V.screen[V.screen.length - 1].length * 6.6; if (Math.floor(T / 450) % 2) { c.fillStyle = rgba(C.accent, .8); c.fillRect(234 + lastW + 2, 106 + (V.screen.length - 1) * 20, 6, 12); } }
        /* done stamp */
        if (V.done) { var dk = V.doneK == null ? 1 : V.doneK; c.save(); c.translate(306, 216); c.rotate(-.08); c.scale(Math.max(dk, 0), Math.max(dk, 0)); rrect(c, -50, -15, 100, 30, 4);
          c.strokeStyle = C.accent; c.lineWidth = 2.5; c.stroke(); txt(c, 'DONE', 0, 1, { size: 17, w: 800, col: C.accent }); c.restore(); }
      }
    });
  })();

  /* ================= p1-pipeline ================= */
  (function () {
    var IX = [46, 200, 354], IY = 54, MX = [123, 277];
    var FILES = ['hello_world.c', 'hello_world.obj', 'hello_world.exe'];
    reg('p1-pipeline', {
      acts: ['cd', 'dir', 'cook', 'run', 'show'],
      init: function () { return { cd: false, have: [true, false, false], screen: [], ran: false }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'cd': S.cd = true; break;
          case 'cook': S.have[a.k] = true; break;
          case 'run': S.ran = true; break;
          case 'show': S.screen.push(a.t); break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'cd': V.cd = lp > .1; V.cdK = EZ.back(seg(lp, 0, .7)); break;
          case 'dir': V.dirK = Math.sin(Math.PI * lp); break;
          case 'cook': V.cook = { k: a.k, p: lp }; V.have[a.k] = lp >= .7; V.haveK = a.k; V.haveP = seg(lp, .7, 1); break;
          case 'run': V.runK = lp; break;
          case 'show': { var n = Math.floor(lp * (a.t.length + 1) + 1e-6); V.screen = S.screen.concat([a.t.slice(0, n)]); break; }
        }
      },
      prep: function (V, S) { V.cook = null; V.haveK = -1; V.haveP = 1; V.dirK = 0; V.runK = null; V.cdK = null; },
      draw: function (c, V, T, C, rm) {
        bg(c, C, W, H);
        var cols = [C.accent, C.purple, C.orange], ext = ['.c', '.obj', '.exe'];
        /* machines */
        [['compile', 'cl'], ['link', 'link']].forEach(function (m, i) {
          var x = MX[i], y = IY, run = V.cook && V.cook.k === i + 1 ? V.cook.p : 0, act = run > .3 && run < .75, sh = act && !rm ? Math.sin(T / 30) * 1.2 : 0;
          c.save(); c.translate(sh, 0); c.fillStyle = C.surface2; c.fillRect(x - 25, y - 22, 50, 44); c.strokeStyle = act ? C.accent : C.border2; c.lineWidth = act ? 2 : 1.5; c.strokeRect(x - 24.5, y - 21.5, 49, 43);
          gear(c, x, y - 3, 8, act ? T / 160 : 0.4, rgba(act ? C.accent : C.muted, .9)); txt(c, m[1], x, y + 14, { size: 10, w: 800, col: C.text }); c.restore();
          txt(c, m[0], x, y - 30, { size: 8, col: C.muted2 });
          /* arrows */
          var ax0 = IX[i] + 22, ax1 = x - 28, bx0 = x + 28, bx1 = IX[i + 1] - 22;
          c.strokeStyle = C.muted; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ax0, y); c.lineTo(ax1, y); c.moveTo(bx0, y); c.lineTo(bx1, y); c.stroke();
          c.fillStyle = C.muted; [ax1, bx1].forEach(function (xx) { c.beginPath(); c.moveTo(xx + 1, y); c.lineTo(xx - 6, y - 4); c.lineTo(xx - 6, y + 4); c.closePath(); c.fill(); });
        });
        /* bracket: cl does both */
        c.strokeStyle = rgba(C.accent, .5); c.lineWidth = 1.2; c.beginPath(); c.moveTo(MX[0] - 25, 96); c.lineTo(MX[0] - 25, 100); c.lineTo(MX[1] + 25, 100); c.lineTo(MX[1] + 25, 96); c.stroke();
        txt(c, 'one command, cl, does both steps', 200, 111, { size: 9, col: C.accent });
        /* files */
        for (var i = 0; i < 3; i++) {
          var have = V.have[i], k = V.haveK === i ? EZ.back(V.haveP) : 1;
          var runPulse = i === 2 && V.runK != null ? 1 + .12 * Math.sin(Math.PI * V.runK * 2) : 1;
          doc(c, C, IX[i], IY, cols[i], ext[i], FILES[i], have, (V.haveK === i ? k : 1) * runPulse);
        }
        /* flying copy */
        if (V.cook && V.cook.p > 0 && V.cook.p < .35) { var q = EZ.io(V.cook.p / .35), s = V.cook.k - 1; doc(c, C, lerp(IX[s], MX[s], q), IY, cols[s], ext[s], '', true, 1 - .3 * q); }
        if (V.cook && V.cook.p >= .65 && V.cook.p < 1) { var q2 = seg(V.cook.p, .65, 1), s2 = V.cook.k; c.save(); c.globalAlpha = 1 - q2; c.strokeStyle = cols[s2]; c.lineWidth = 2; c.beginPath(); c.arc(IX[s2], IY, 24 + 20 * q2, 0, 7); c.stroke(); c.restore(); }
        /* folder window */
        c.fillStyle = C.surface2; c.fillRect(14, 126, 188, 110); c.strokeStyle = C.border2; c.lineWidth = 1.2; c.strokeRect(14.5, 126.5, 187, 109);
        c.fillStyle = rgba(C.yellow, .15); c.fillRect(14.5, 126.5, 187, 18);
        var cdk = V.cdK == null ? (V.cd ? 1 : 0) : V.cdK;
        txt(c, V.cd ? '\\game-dev-exercises\\p01' : 'folder: not in p01 yet', 22, 135.5, { size: 8.5, w: 700, col: V.cd ? C.yellow : C.muted, align: 'left' });
        if (V.cd) {
          var rows = []; V.have.forEach(function (h, i) { if (h) rows.push(i); });
          rows.forEach(function (fi, j) {
            var y = 158 + j * 24, k2 = V.haveK === fi ? EZ.back(V.haveP) : 1, fl = V.dirK || 0;
            c.save(); c.translate(0, y); c.scale(1, Math.max(k2, 0)); rrect(c, 20, -9, 176, 20, 3); c.fillStyle = rgba(cols[fi], .08 + .22 * fl); c.fill(); c.strokeStyle = rgba(cols[fi], .35 + .5 * fl); c.lineWidth = 1; c.stroke();
            txt(c, FILES[fi], 28, 1, { size: 10, w: 600, col: C.text, align: 'left' }); c.restore();
          });
        }
        /* screen */
        c.fillStyle = '#04040a'; c.fillRect(216, 126, 170, 110); c.strokeStyle = C.border2; c.lineWidth = 2; c.strokeRect(217, 127, 168, 108);
        txt(c, V.ran || V.runK != null ? 'hello_world.exe says:' : 'program output', 224, 138, { size: 8.5, col: C.muted, align: 'left' });
        V.screen.forEach(function (l, i) { txt(c, l, 224, 162 + i * 22, { size: 11, w: 700, col: C.accent, align: 'left' }); });
        if (V.runK != null && V.runK > 0 && V.runK < 1) { var px = lerp(IX[2], 300, EZ.io(V.runK)), py = lerp(IY + 26, 150, EZ.io(V.runK)); c.save(); c.globalAlpha = 1 - V.runK * .5; pill(c, px, py, 30, 14, C.orange, .35); txt(c, 'run', px, py + .5, { size: 9, w: 700, col: C.text }); c.restore(); }
      }
    });
  })();

  /* ================= p1-cursor ================= */
  (function () {
    var X0 = 30, CWd = 8.4, Y0 = 108, LH = 28, ROWS = 4;
    function put(S, t) {
      for (var i = 0; i < t.length; i++) { var r = S.cur.r, row = S.rows[r]; while (row.length < S.cur.c) row += ' '; S.rows[r] = row.slice(0, S.cur.c) + t[i] + row.slice(S.cur.c + 1); S.cur.c++; }
    }
    reg('p1-cursor', {
      acts: ['key', 'put', 'tab', 'nl', 'cr'],
      init: function () { return { rows: ['', '', '', ''], cur: { r: 0, c: 0 }, key: null }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'key': S.key = { t: a.t, d: a.d }; break;
          case 'put': put(S, a.t); break;
          case 'tab': S.cur.c = (Math.floor(S.cur.c / 8) + 1) * 8; break;
          case 'nl': S.cur.r++; S.cur.c = 0; break;
          case 'cr': S.cur.c = 0; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'key': V.key = { t: a.t, d: a.d }; V.keyK = EZ.back(seg(lp, 0, .5)); break;
          case 'put': {
            var n = Math.floor(lp * a.t.length + 1e-6), part = a.t.slice(0, n), r = V.cur.r, c0 = V.cur.c;
            (V.ghost = V.ghost || []);
            for (var i = 0; i < n; i++) { var old = V.rows[r][c0 + i]; if (old && old !== ' ') V.ghost.push({ r: r, c: c0 + i, ch: old, p: seg(lp * a.t.length - i, 0, 1) }); }
            if (n > 0) { put(V, part); V.cx = null; V.cy = null; }
            break;
          }
          case 'tab': { var to = (Math.floor(S.cur.c / 8) + 1) * 8, e = EZ.io(lp); V.cx = lerp(S.cur.c, to, e); V.cy = V.cur.r; V.cur.c = to; V.tabK = lp; break; }
          case 'nl': { var e2 = EZ.io(lp); V.cx = lerp(S.cur.c, 0, e2); V.cy = lerp(S.cur.r, S.cur.r + 1, e2); V.cur.r = S.cur.r + 1; V.cur.c = 0; break; }
          case 'cr': { var e3 = EZ.io(lp); V.cx = lerp(S.cur.c, 0, e3); V.cy = V.cur.r; V.cur.c = 0; V.crK = lp; break; }
        }
      },
      prep: function (V, S) { V.ghost = null; V.cx = null; V.cy = null; V.keyK = null; V.tabK = null; V.crK = null; },
      draw: function (c, V, T, C, rm) {
        bg(c, C, W, H);
        /* key cap */
        if (V.key) {
          var k = V.keyK == null ? 1 : V.keyK;
          c.save(); c.translate(54, 34); c.scale(Math.max(k, 0), Math.max(k, 0)); rrect(c, -30, -17, 60, 32, 5); c.fillStyle = rgba(C.yellow, .2); c.fill(); c.strokeStyle = C.yellow; c.lineWidth = 2; c.stroke();
          c.fillStyle = rgba(C.yellow, .5); c.fillRect(-28, 10, 56, 3);
          txt(c, V.key.t, 0, -2, { size: 17, w: 800, col: C.text }); c.restore();
          txt(c, V.key.d, 94, 34, { size: 10, w: 600, col: C.text, align: 'left', al: clamp(k) });
        } else txt(c, 'what the code says shows up here', 20, 34, { size: 10, col: C.muted, align: 'left' });
        /* terminal */
        c.fillStyle = '#04040a'; c.fillRect(20, 66, 360, 170); c.strokeStyle = C.border2; c.lineWidth = 2; c.strokeRect(21, 67, 358, 168);
        c.fillStyle = C.border; c.fillRect(21, 67, 358, 14); [0, 1, 2].forEach(function (i) { c.fillStyle = [C.orange, C.yellow, C.accent][i]; c.fillRect(28 + i * 11, 71, 6, 6); });
        txt(c, 'terminal', 372, 74, { size: 8, col: C.muted, align: 'right' });
        /* tab stops */
        for (var t = 8; t <= 32; t += 8) { c.strokeStyle = rgba(C.muted, .22); c.setLineDash([2, 4]); c.beginPath(); c.moveTo(X0 + t * CWd, 86); c.lineTo(X0 + t * CWd, 230); c.stroke(); c.setLineDash([]); if (t === 8) txt(c, 'tab stops', X0 + t * CWd + 3, 91, { size: 7, col: C.muted, align: 'left' }); }
        var tabHot = V.tabK != null && V.tabK > 0 && V.tabK < 1;
        for (var r = 0; r < ROWS; r++) txt(c, V.rows[r], X0, Y0 + r * LH, { size: 14, w: 700, col: C.accent, align: 'left', base: 'middle' });
        (V.ghost || []).forEach(function (g) { txt(c, g.ch, X0 + g.c * CWd + CWd / 2 - 0.5, Y0 + g.r * LH - 9 * g.p, { size: 14, w: 700, col: C.orange, al: 1 - g.p }); });
        /* cursor */
        var cx = V.cx != null ? V.cx : V.cur.c, cy = V.cy != null ? V.cy : V.cur.r;
        var on = rm || Math.floor(T / 450) % 2 === 0 || V.cx != null;
        if (on) { c.fillStyle = rgba(C.text, .75); c.fillRect(X0 + cx * CWd - 1, Y0 + cy * LH - 10, CWd, 20); }
        if (tabHot) { c.strokeStyle = C.yellow; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X0 + 2, Y0 + V.cur.r * LH + 14); c.lineTo(X0 + V.cur.c * CWd, Y0 + V.cur.r * LH + 14); c.stroke(); }
        if (V.crK != null && V.crK > 0 && V.crK < 1) { c.strokeStyle = C.yellow; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X0 + cx * CWd, Y0 + cy * LH + 14); c.lineTo(X0 + (S2(V)) * CWd, Y0 + cy * LH + 14); c.stroke(); }
      }
    });
    function S2(V) { return V.crFrom == null ? 4 : V.crFrom; }
  })();

  /* ================= p1-compiler ================= */
  (function () {
    var SRC = ['#include <stdio.h>', '', 'int main() {', '    printf("Hello\\n");', '    printf("World\\n")', '    return 0;', '}'];
    var Y0 = 32, LH = 21, CW = 7.3, TX = 46;
    function rowY(r) { return Y0 + (r - 1) * LH; }
    reg('p1-compiler', {
      acts: ['read', 'wait', 'halt', 'blame', 'msg', 'fix'],
      init: function () { return { read: 0, wait: 0, err: 0, blame: 0, msg: false, fixed: false }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'read': S.read = a.row; break;
          case 'wait': S.wait = a.row; break;
          case 'halt': S.err = a.row; break;
          case 'blame': S.blame = a.row; break;
          case 'msg': S.msg = true; break;
          case 'fix': S.fixed = true; S.wait = 0; S.err = 0; S.blame = 0; S.msg = false; S.read = 8; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'read': { var e = EZ.io(lp); V.bandY = lerp(S.read ? rowY(S.read) : rowY(a.row), rowY(a.row), e); V.read = a.row; V.readLp = lp; break; }
          case 'wait': V.wait = a.row; V.waitK = EZ.back(lp); break;
          case 'halt': V.err = a.row; V.errK = EZ.back(lp); break;
          case 'blame': V.blame = a.row; V.blameK = lp; break;
          case 'msg': V.msg = true; V.msgK = EZ.out(lp); break;
          case 'fix': { V.fixK = lp; V.fixed = lp >= .35; V.wait = lp >= .35 ? 0 : S.wait; V.err = lp >= .35 ? 0 : S.err; V.blame = lp >= .35 ? 0 : S.blame; V.msg = lp < .35 ? S.msg : true; V.read = lp >= .5 ? 8 : S.read; V.bandY = lerp(S.read ? rowY(S.read) : rowY(1), rowY(7), EZ.io(lp)); V.okMsg = lp >= .5; V.msgK = EZ.out(seg(lp, .5, 1)); break; }
        }
      },
      prep: function (V, S) { V.bandY = S.read ? (S.read >= 8 ? rowY(7) : rowY(S.read)) : null; V.msgK = null; V.waitK = null; V.errK = null; V.blameK = null; V.fixK = null; V.okMsg = S.fixed; },
      draw: function (c, V, T, C, rm) {
        bg(c, C, W, H);
        /* page */
        c.fillStyle = C.surface2; c.fillRect(14, 12, 372, 158); c.strokeStyle = C.border2; c.lineWidth = 1.2; c.strokeRect(14.5, 12.5, 371, 157);
        var errRow = V.err, bad = errRow > 0;
        if (V.read > 0 && V.bandY != null) {
          var col = bad ? C.orange : V.fixed ? C.accent : C.blue;
          c.fillStyle = rgba(col, .16); c.fillRect(15, V.bandY - LH / 2, 370, LH); c.fillStyle = col; c.fillRect(15, V.bandY - LH / 2, 3, LH);
        }
        SRC.forEach(function (line, i) {
          var r = i + 1, y = rowY(r);
          txt(c, String(r), 38, y, { size: 10, col: C.muted, align: 'right' });
          var okRow = r !== 2 && V.read > r && r !== V.wait && r !== V.err;
          if (V.fixed && r !== 2 && V.read > r) okRow = true;
          if (okRow) { c.save(); c.strokeStyle = C.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(20, y); c.lineTo(23, y + 3.5); c.lineTo(29, y - 4); c.stroke(); c.restore(); }
          txt(c, line, TX, y, { size: 12, col: C.text, align: 'left' });
        });
        /* semicolon fix */
        if (V.fixed) { var fk = V.fixK == null ? 1 : EZ.back(seg(V.fixK, .1, .4)); txt(c, ';', TX + SRC[4].length * CW + 1, rowY(5), { size: 12 * Math.max(fk, 0.01), w: 800, col: C.accent, align: 'left' }); }
        /* waiting on row */
        if (V.wait) { var wk = V.waitK == null ? 1 : V.waitK, wx = TX + SRC[V.wait - 1].length * CW + 12; c.save(); c.translate(wx, rowY(V.wait)); c.scale(Math.max(wk, 0), Math.max(wk, 0)); pill(c, 0, 0, 120, 16, C.yellow, .18);
          txt(c, 'not finished... more?', 0, .5, { size: 8.5, w: 700, col: C.yellow }); c.restore(); }
        /* halt */
        if (V.err) { var ek = V.errK == null ? 1 : V.errK, ex = TX + SRC[V.err - 1].length * CW + 12; c.save(); c.translate(ex, rowY(V.err)); c.scale(Math.max(ek, 0), Math.max(ek, 0)); pill(c, 0, 0, 82, 16, C.orange, .22); txt(c, 'cannot read!', 0, .5, { size: 8.5, w: 700, col: C.orange }); c.restore(); }
        /* blame arrow */
        if (V.blame) {
          var bk = V.blameK == null ? 1 : V.blameK, bx = TX + SRC[V.blame - 1].length * CW + 3 + 120 * 0, by = rowY(V.blame - 1) + 11;
          c.save(); c.globalAlpha = clamp(bk * 2); c.strokeStyle = C.orange; c.lineWidth = 1.8; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(TX + SRC[V.blame - 1].length * CW + 3, rowY(V.blame - 1) - 8); c.lineTo(TX + SRC[V.blame - 1].length * CW + 3, rowY(V.blame - 1) - 1); c.stroke(); c.setLineDash([]);
          txt(c, '^ the ; belongs here', TX + SRC[V.blame - 1].length * CW - 1, rowY(V.blame - 1) + 12.5, { size: 9, w: 700, col: C.orange, align: 'left' }); c.restore();
        }
        /* robot */
        var ry = V.bandY != null && V.read < 8 ? V.bandY : rowY(1);
        if (V.read > 0 && V.read < 8) {
          var rx = 362; c.fillStyle = bad ? C.orange : C.blue; c.fillRect(rx - 8, ry - 7, 16, 14); c.fillStyle = '#fff'; c.fillRect(rx - 5, ry - 3, 4, 4); c.fillRect(rx + 1, ry - 3, 4, 4); c.fillStyle = C.ink; c.fillRect(rx - 4, ry - 2, 2, 2); c.fillRect(rx + 2, ry - 2, 2, 2);
          if (bad) { c.fillStyle = C.ink; c.fillRect(rx - 4, ry + 3, 8, 1.5); }
          c.fillStyle = bad ? C.orange : C.blue; c.fillRect(rx - 1, ry - 10, 2, 3);
        }
        if (V.read === 0) txt(c, 'the compiler reads top to bottom', 200, 98, { size: 10, col: C.muted, al: .0 });
        /* message panel */
        var mk = V.msgK == null ? 1 : V.msgK;
        if (V.msg && !V.okMsg) { c.save(); c.globalAlpha = clamp(mk * 1.6); c.translate(0, (1 - mk) * 10); c.fillStyle = rgba(C.orange, .1); c.fillRect(14, 182, 372, 54); c.strokeStyle = C.orange; c.lineWidth = 1.5; c.strokeRect(14.75, 182.75, 370.5, 52.5);
          txt(c, 'hello_world.c(6): error C2143:', 24, 197, { size: 10.5, w: 700, col: C.orange, align: 'left' }); txt(c, "syntax error: missing ';' before 'return'", 24, 213, { size: 10.5, w: 700, col: C.text, align: 'left' });
          txt(c, 'no hello_world.exe was built', 24, 228, { size: 9, col: C.muted2, align: 'left' }); c.restore(); }
        if (V.okMsg && V.fixed) { c.save(); c.globalAlpha = clamp(mk * 1.6); c.fillStyle = rgba(C.accent, .1); c.fillRect(14, 182, 372, 54); c.strokeStyle = C.accent; c.lineWidth = 1.5; c.strokeRect(14.75, 182.75, 370.5, 52.5);
          txt(c, 'no errors', 24, 200, { size: 12, w: 800, col: C.accent, align: 'left' }); txt(c, 'hello_world.exe is built', 24, 220, { size: 10.5, w: 600, col: C.text, align: 'left' }); c.restore(); }
        if (!V.msg && !V.okMsg) txt(c, 'compiler messages show up here', 200, 210, { size: 9, col: C.muted });
      }
    });
  })();

  /* ================= p1-bat ================= */
  (function () {
    var FL = '/W4 /WX /Zi /Od', RAW = 'cl %FLAGS% hello_world.c /Fe:hello_world.exe', FULL = 'cl ' + FL + ' hello_world.c /Fe:hello_world.exe', CW = 6;
    reg('p1-bat', {
      acts: ['quiet', 'set', 'cmd', 'expand', 'build', 'level', 'gate', 'ok'],
      init: function () { return { quiet: false, jar: false, cmd: 0, built: false, level: null, gate: null, ok: false }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'quiet': S.quiet = true; break;
          case 'set': S.jar = true; break;
          case 'cmd': S.cmd = 1; break;
          case 'expand': S.cmd = 2; break;
          case 'build': S.built = true; break;
          case 'level': S.level = a.v; break;
          case 'gate': S.gate = a.r; break;
          case 'ok': S.ok = true; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'quiet': V.quiet = true; V.quietK = EZ.back(lp); break;
          case 'set': V.jar = true; V.jarK = lp; break;
          case 'cmd': V.cmd = 1; V.cmdK = EZ.out(lp); break;
          case 'expand': V.cmd = lp >= .55 ? 2 : 1; V.expK = lp; break;
          case 'build': V.build = lp; V.built = lp >= 1; break;
          case 'level': V.level = a.v; V.levelK = EZ.back(lp); break;
          case 'gate': V.gateK = lp; V.gate = lp >= .5 ? a.r : null; V.gateShow = true; break;
          case 'ok': V.ok = true; V.okK = EZ.back(lp); break;
        }
      },
      prep: function (V, S) { V.quietK = null; V.jarK = null; V.cmdK = null; V.expK = null; V.build = null; V.levelK = null; V.gateK = null; V.gateShow = S.gate != null; V.okK = null; },
      draw: function (c, V, T, C, rm) {
        bg(c, C, W, H);
        /* echo off chip */
        var qk = V.quietK == null ? 1 : V.quietK;
        if (V.quiet) { c.save(); c.translate(198, 40); c.scale(Math.max(qk, 0), Math.max(qk, 0)); pill(c, 0, 0, 120, 38, C.muted, .12); txt(c, '@echo off', 0, -7, { size: 10.5, w: 700, col: C.text }); txt(c, 'no command echo', 0, 8, { size: 8.5, col: C.muted2 }); c.restore(); }
        else { c.save(); c.globalAlpha = .45; c.strokeStyle = C.muted; c.setLineDash([3, 4]); c.strokeRect(138.5, 21.5, 120, 38); c.restore(); }
        /* jar */
        c.fillStyle = V.jar ? rgba(C.purple, .1) : 'transparent'; c.fillRect(14, 18, 112, 54); c.strokeStyle = V.jar ? C.purple : rgba(C.muted, .5); c.lineWidth = 1.5; if (!V.jar) c.setLineDash([3, 4]); c.strokeRect(14.75, 18.75, 110.5, 52.5); c.setLineDash([]);
        txt(c, 'FLAGS', 22, 29, { size: 10, w: 800, col: V.jar ? C.purple : C.muted, align: 'left' });
        if (V.jar) { var jk = V.jarK == null ? 1 : V.jarK, n = Math.floor(jk * (FL.length + 1)); txt(c, FL.slice(0, n), 22, 52, { size: 9.5, w: 700, col: C.text, align: 'left' }); }
        else txt(c, 'empty', 22, 52, { size: 9, col: C.muted, align: 'left' });
        /* sticky note */
        var lk = V.levelK == null ? 1 : V.levelK;
        if (V.level != null) { c.save(); c.translate(328, 44); c.rotate(.05); c.scale(Math.max(lk, 0), Math.max(lk, 0)); c.fillStyle = C.yellow; c.fillRect(-52, -27, 104, 54); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(-52, 22, 104, 5);
          txt(c, 'ERRORLEVEL', 0, -13, { size: 9.5, w: 800, col: C.ink }); txt(c, String(V.level), 0, 7, { size: 20, w: 800, col: C.ink }); txt(c, '0 = it worked', 0, 20, { size: 7.5, col: C.ink }); c.restore(); }
        else { c.save(); c.globalAlpha = .45; c.strokeStyle = C.muted; c.setLineDash([3, 4]); c.strokeRect(277.5, 18.5, 102, 52); c.restore(); txt(c, 'ERRORLEVEL', 328, 40, { size: 9, col: C.muted }); txt(c, '(not set yet)', 328, 54, { size: 8, col: C.muted }); }
        /* cl command strip */
        c.fillStyle = C.surface2; c.fillRect(14, 90, 372, 32); c.strokeStyle = V.cmd ? rgba(C.accent, .6) : C.border2; c.lineWidth = 1.2; c.strokeRect(14.5, 90.5, 371, 31);
        if (V.cmd) {
          var ck = V.cmdK == null ? 1 : V.cmdK, full = V.cmd === 2, str = full ? FULL : RAW, x0 = 24;
          c.save(); c.globalAlpha = clamp(ck * 1.5);
          var pre = 'cl ', post = ' hello_world.c /Fe:hello_world.exe', mid = full ? FL : '%FLAGS%';
          txt(c, pre, x0, 106, { size: 10, w: 700, col: C.text, align: 'left' });
          var mx = x0 + pre.length * CW, mw = mid.length * CW + 8;
          pill(c, mx + mw / 2 - 3, 106, mw, 18, full ? C.purple : C.yellow, .22);
          txt(c, mid, mx + mw / 2 - 3, 106.5, { size: 10, w: 700, col: C.text });
          txt(c, post, mx + mw - 3 + 2, 106, { size: 10, w: 700, col: C.text, align: 'left' });
          c.restore();
          if (V.expK != null && V.expK > 0 && V.expK < 1) { var e = EZ.io(V.expK); c.save(); c.globalAlpha = Math.sin(Math.PI * e); pill(c, lerp(70, 90, e), lerp(60, 98, e), 82, 15, C.purple, .4); txt(c, FL.slice(0, 11) + '..', lerp(70, 90, e), lerp(60, 98, e) + .5, { size: 8, w: 700, col: C.text }); c.restore(); }
        } else txt(c, 'the command line waits here', 200, 106, { size: 9, col: C.muted });
        /* build bar */
        var bp = V.build != null ? V.build : (V.built ? 1 : 0);
        c.fillStyle = C.surface2; c.fillRect(14, 134, 296, 14); c.strokeStyle = C.border2; c.lineWidth = 1; c.strokeRect(14.5, 134.5, 295, 13);
        c.fillStyle = rgba(C.accent, .8); c.fillRect(15, 135, 294 * bp, 12);
        txt(c, bp >= 1 ? 'cl: compiled and linked' : bp > 0 ? 'cl is working...' : 'cl has not run yet', 22, 141, { size: 8.5, w: 700, col: bp > .15 ? C.ink : C.muted2, align: 'left' });
        var exeOn = bp >= 1 || V.built;
        c.save(); c.translate(350, 141); if (exeOn) { c.scale(1, 1); c.beginPath(); c.moveTo(-9, -12); c.lineTo(4, -12); c.lineTo(9, -7); c.lineTo(9, 12); c.lineTo(-9, 12); c.closePath(); c.fillStyle = rgba(C.orange, .22); c.fill(); c.strokeStyle = C.orange; c.lineWidth = 1.5; c.stroke(); txt(c, 'exe', 0, 2, { size: 8, w: 800, col: C.orange }); }
        else { c.strokeStyle = C.muted; c.globalAlpha = .45; c.setLineDash([3, 4]); c.strokeRect(-9.5, -12.5, 19, 25); } c.restore();
        txt(c, 'hello_world.exe', 350, 161, { size: 7.5, col: exeOn ? C.muted2 : C.muted });
        /* gate */
        var gk = V.gateK == null ? 1 : V.gateK;
        c.fillStyle = C.surface2; c.fillRect(14, 172, 150, 64); c.strokeStyle = V.gate != null ? rgba(C.blue, .7) : C.border2; c.lineWidth = 1.2; c.strokeRect(14.5, 172.5, 149, 63);
        txt(c, 'if %ERRORLEVEL% neq 0', 22, 184, { size: 9, w: 700, col: C.blue, align: 'left' });
        if (V.gateShow || V.gate != null) {
          txt(c, V.level + ' neq 0', 89, 204, { size: 13, w: 800, col: C.text, al: clamp(gk * 2) });
          if (V.gate != null) { var word = V.gate ? 'true' : 'false', col = V.gate ? C.accent : C.orange; c.save(); c.translate(89, 222); c.scale(EZ.back(seg(gk, .5, 1)), EZ.back(seg(gk, .5, 1))); pill(c, 0, 0, 56, 16, col, .18); txt(c, word, 0, .5, { size: 10, w: 800, col: col }); c.restore(); }
        } else txt(c, 'waiting for a number', 89, 210, { size: 9, col: C.muted });
        /* the block */
        var skipped = V.gate === false;
        c.save(); c.strokeStyle = skipped ? C.muted : C.border2; c.setLineDash([4, 4]); c.lineWidth = 1.2; c.strokeRect(176.5, 172.5, 126, 64); c.restore();
        c.save(); c.globalAlpha = skipped ? .4 : .9; txt(c, 'echo BUILD FAILED', 184, 190, { size: 9, col: C.text, align: 'left' }); txt(c, 'exit /b 1', 184, 206, { size: 9, col: C.text, align: 'left' }); c.restore();
        if (skipped) { c.strokeStyle = rgba(C.orange, .8); c.lineWidth = 2; c.beginPath(); c.moveTo(182, 226 - 36); c.lineTo(298, 226 - 8); c.stroke(); txt(c, 'skipped', 240, 226, { size: 9, w: 700, col: C.orange, al: clamp(gk * 2) }); }
        /* banner */
        if (V.ok) { var ok = V.okK == null ? 1 : V.okK; c.save(); c.translate(346, 204); c.scale(Math.max(ok, 0), Math.max(ok, 0)); pill(c, 0, 0, 74, 40, C.accent, .2, 2); txt(c, 'BUILD OK', 0, 1, { size: 12, w: 800, col: C.accent }); c.restore(); }
        else { c.save(); c.globalAlpha = .4; c.strokeStyle = C.muted; c.setLineDash([3, 4]); c.strokeRect(309.5, 184.5, 74, 40); c.restore(); }
      }
    });
  })();
})();
