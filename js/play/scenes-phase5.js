/* =====================================================================
   RTSPlay scenes for Phase 5 (Win32 window)
   =====================================================================
   p5-window   WNDCLASS form -> registry -> window outline -> HWND claim ticket (winmain-hwnd)
   p5-desk     window + message queue belt + WindowProc receptionist (wndproc, message-loop, gdi-invalidate)
   p5-libs     windows.h menu, user32/gdi32 kitchens, the linker waiter (link-libs)
   p5-clock    stopwatch: freq, last, now, lap bars (frame-time)
   p5-curtain  window on screen + hidden back card, flipped in one go (double-buffer)
   All colours come from the palette (C). Canvas is 400x250.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.RTSPlay) return;
  var U = RTSPlay.util;
  var clamp = U.clamp, lerp = U.lerp, seg = U.seg, EZ = U.EZ, rgba = U.rgba, txt = U.txt, bg = U.bg, pix = U.pix, rrect = U.rrect;
  var W = 400, H = 250;

  /* ---------- shared drawing helpers ---------- */
  function panel(c, x, y, w, h, fill, stroke, lw, dash) {
    c.save(); rrect(c, x, y, w, h, 3); c.fillStyle = fill; c.fill();
    c.lineWidth = lw || 1.2; c.strokeStyle = stroke; if (dash) c.setLineDash(dash); c.stroke(); c.restore();
  }
  var ENVC = { WM_PAINT: 'accent', WM_KEYDOWN: 'yellow', WM_DESTROY: 'orange', WM_QUIT: 'purple' };
  function env(c, C, m, sub, x, y, sc, al) {
    c.save(); c.globalAlpha *= al == null ? 1 : al; c.translate(x, y); c.scale(sc || 1, sc || 1);
    var col = C[ENVC[m] || 'blue'], w = 58, h = sub ? 32 : 28;
    rrect(c, -w / 2, -h / 2, w, h, 3); c.fillStyle = C.surface; c.fill(); c.fillStyle = rgba(col, .2); c.fill();
    c.lineWidth = 1.4; c.strokeStyle = col; c.stroke();
    c.beginPath(); c.moveTo(-w / 2 + 1, -h / 2 + 1); c.lineTo(0, -h / 2 + 11); c.lineTo(w / 2 - 1, -h / 2 + 1); c.stroke();
    txt(c, m, 0, sub ? 3 : 5, { size: 8, w: 700, col: C.text });
    if (sub) txt(c, sub, 0, 12, { size: 8, col: C.muted2 });
    c.restore();
  }
  function winFrame(c, C, x, y, w, h, title, o) {   // returns nothing; client = (x+2, y+18, w-4, h-20)
    o = o || {};
    c.save(); c.globalAlpha *= o.al == null ? 1 : o.al;
    if (o.sc && o.sc !== 1) { c.translate(x + w / 2, y + h / 2); c.scale(o.sc, o.sc); c.translate(-x - w / 2, -y - h / 2); }
    rrect(c, x, y, w, h, 3); c.fillStyle = C.border2; c.fill();
    c.fillStyle = C.bg; c.fillRect(x + 2, y + 18, w - 4, h - 20);
    if (!o.notitle) {
      txt(c, title || '', x + 8, y + 9, { size: 8, col: C.text, align: 'left' });
      c.fillStyle = C.muted; c.fillRect(x + w - 34, y + 6, 6, 6); c.fillRect(x + w - 24, y + 6, 6, 6);
      c.fillStyle = C.orange; c.fillRect(x + w - 14, y + 6, 6, 6);
    }
    c.lineWidth = 1.2; c.strokeStyle = o.stroke || C.muted; if (o.dash) c.setLineDash(o.dash); rrect(c, x, y, w, h, 3); c.stroke();
    c.restore();
  }
  function chip(c, C, x, y, w, h, label, col, al) {
    c.save(); c.globalAlpha *= al == null ? 1 : al;
    rrect(c, x, y, w, h, 3); c.fillStyle = rgba(col, .16); c.fill(); c.lineWidth = 1; c.strokeStyle = rgba(col, .8); c.stroke();
    txt(c, label, x + w / 2, y + h / 2 + .5, { size: 8, w: 700, col: col }); c.restore();
  }
  function ticket(c, C, x, y, w, h, label, col) {
    c.save(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w, y + h / 2 - 3); c.arc(x + w, y + h / 2, 3, -Math.PI / 2, Math.PI / 2, true);
    c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.lineTo(x, y + h / 2 + 3); c.arc(x, y + h / 2, 3, Math.PI / 2, -Math.PI / 2, true); c.closePath();
    c.fillStyle = rgba(col, .18); c.fill(); c.lineWidth = 1.3; c.strokeStyle = col; c.stroke(); c.restore();
    txt(c, label, x + w / 2, y + h / 2 + .5, { size: 9, w: 700, col: col });
  }
  function pop(p) { return p > 0 && p < 1 ? 1 + .3 * Math.sin(Math.PI * p) : 1; }

  /* =====================================================================
     p5-window
       form    { }                   the WNDCLASS form appears, every field 0
       fill    { i:0|1|2 }           field i gets its value (WindowProc / hInst / "GameWindow")
       register{ }                   form is handed to Windows and filed on the shelf
       chips   { }                   hInst / nShow chips appear (WinMain's parameters)
       tkt0    { }                   the g_hwnd slot shows NULL
       win     { s:'hid'|'on' }      window outline (dashed) / real window
       style   { }                   title bar + buttons appear
       size    { }                   800 x 600 label
       hwnd    { v:'0x00A2' }        claim ticket is stored in g_hwnd
       loop    { t, e:'WM_PAINT'|null, def:true|false }   bottom strip: message loop status
       flash   { }                   window repaints itself (DefWindowProc)
     ===================================================================== */
  RTSPlay.scene('p5-window', {
    W: W, H: H,
    init: function () { return { form: false, fill: [0, 0, 0], reg: false, chips: false, tk0: false, win: 'off', style: false, size: false, hwnd: null, loopT: '', loopE: null, def: false, running: false }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'form': S.form = true; break;
        case 'fill': S.fill[a.i] = 1; break;
        case 'register': S.reg = true; break;
        case 'chips': S.chips = true; break;
        case 'tkt0': S.tk0 = true; break;
        case 'win': S.win = a.s; break;
        case 'style': S.style = true; break;
        case 'size': S.size = true; break;
        case 'hwnd': S.hwnd = a.v; break;
        case 'loop': S.loopT = a.t; S.loopE = a.e || null; S.def = !!a.def; S.running = true; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'form': V.formP = lp; break;
        case 'fill': V.fillP = { i: a.i, p: lp }; break;
        case 'register': V.regP = lp; break;
        case 'chips': V.chipsP = lp; break;
        case 'tkt0': V.tk0P = lp; break;
        case 'win': V.winP = lp; if (lp > 0) V.win = a.s; break;
        case 'style': V.styleP = lp; if (lp > 0) V.style = true; break;
        case 'size': V.sizeP = lp; if (lp > 0) V.size = true; break;
        case 'hwnd': V.hwndP = lp; if (lp >= .5) V.hwnd = a.v; break;
        case 'loop': V.loopP = lp; if (lp >= .3) { V.loopT = a.t; V.loopE = a.e || null; V.def = !!a.def; V.running = true; } break;
        case 'flash': V.flash = Math.sin(Math.PI * lp); break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      /* form card (WNDCLASS) */
      var fx = 10, fy = 10, fw = 124, fh = 114;
      var fa = V.form ? 1 : 0, fs = 1, fcx = fx + fw / 2, fcy = fy + fh / 2;
      if (V.formP != null && !V.form) { fa = EZ.out(V.formP); fs = lerp(.85, 1, EZ.back(V.formP)); }
      var regP = V.reg ? 1 : (V.regP || 0);
      if (V.regP != null && V.regP > 0 && !V.reg) { var q = EZ.io(seg(V.regP, 0, .8)); fs = lerp(1, .18, q); fcx = lerp(fcx, 72, q); fcy = lerp(fcy, 160, q); fa = 1 - seg(V.regP, .55, .85); }
      else if (V.reg) fa = 0;
      if (fa > 0) {
        c.save(); c.globalAlpha = fa; c.translate(fcx, fcy); c.scale(fs, fs); c.translate(-fw / 2, -fh / 2);
        panel(c, 0, 0, fw, fh, rgba(C.purple, .1), C.purple, 1.4);
        txt(c, 'WNDCLASS wc', 8, 11, { size: 9, w: 700, col: C.purple, align: 'left' });
        var labs = ['lpfnWndProc', 'hInstance', 'lpszClassName'], vals = ['WindowProc', 'hInst', '"GameWindow"'];
        for (var i = 0; i < 3; i++) {
          var y = 24 + i * 30, filled = V.fill[i] || (V.fillP && V.fillP.i === i && V.fillP.p >= .5);
          txt(c, labs[i], 8, y + 3, { size: 8, col: C.muted2, align: 'left' });
          var pp = V.fillP && V.fillP.i === i ? pop(V.fillP.p) : 1;
          c.save(); c.translate(64, y + 17); c.scale(pp, pp); rrect(c, -56, -8, 112, 16, 3);
          c.fillStyle = filled ? rgba(C.accent, .16) : rgba(C.text, .05); c.fill(); c.lineWidth = 1; c.strokeStyle = filled ? C.accent : C.border2; c.stroke();
          txt(c, filled ? vals[i] : '0', 0, .5, { size: 9, w: filled ? 700 : 500, col: filled ? C.text : C.muted }); c.restore();
        }
        c.restore();
      }
      /* registry shelf */
      panel(c, 10, 134, 124, 58, rgba(C.text, .03), C.border2, 1, [3, 4]);
      txt(c, "Windows' list of", 72, 143, { size: 8, col: C.muted, w: 500 }); txt(c, 'window kinds', 72, 153, { size: 8, col: C.muted });
      var rp = V.reg ? 1 : (V.regP != null && V.regP > .7 ? seg(V.regP, .7, 1) : 0);
      if (V.reg && V.regP == null) rp = 1;
      if (rp > 0) { var pr = pop(V.regP != null && V.regP < 1 ? seg(V.regP, .7, 1) : 1); c.save(); c.translate(72, 175); c.scale(pr, pr);
        rrect(c, -52, -9, 104, 18, 3); c.fillStyle = rgba(C.accent, .16); c.fill(); c.strokeStyle = C.accent; c.lineWidth = 1.2; c.stroke();
        txt(c, 'GameWindow', 0, .5, { size: 9, w: 700, col: C.accent }); c.restore(); }
      /* desktop window */
      var wx = 150, wy = 10, ww = 242, wh = 148;
      if (V.win !== 'off') {
        var hid = V.win === 'hid', al = hid ? .5 : 1, sc = 1;
        if (V.winP != null && V.winP > 0 && V.winP < 1) { al = hid ? .5 * EZ.out(V.winP) : lerp(.5, 1, V.winP); sc = V.win === 'on' ? 1 : lerp(.8, 1, EZ.back(V.winP)); }
        var st = V.style || V.win === 'on';
        c.save(); c.globalAlpha *= al;
        if (sc !== 1) { c.translate(wx + ww / 2, wy + wh / 2); c.scale(sc, sc); c.translate(-wx - ww / 2, -wy - wh / 2); }
        if (st) { var sp = V.styleP != null && V.styleP < 1 && V.win !== 'on' ? EZ.out(V.styleP) : 1; c.globalAlpha *= sp; winFrame(c, C, wx, wy, ww, wh, 'My First Window', { dash: hid ? [4, 4] : null, stroke: hid ? C.muted2 : C.muted }); }
        else { rrect(c, wx, wy, ww, wh, 3); c.fillStyle = rgba(C.text, .04); c.fill(); c.lineWidth = 1.4; c.strokeStyle = C.muted2; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]); }
        if (V.size) { txt(c, '800 x 600', wx + ww / 2, wy + wh / 2 + 8, { size: 12, w: 700, col: C.muted2, al: V.sizeP != null ? V.sizeP : 1 }); }
        if (V.flash > 0) { c.fillStyle = rgba(C.accent, .25 * V.flash); c.fillRect(wx + 2, wy + 18, ww - 4, wh - 20); }
        c.restore();
      } else txt(c, 'no window yet', wx + ww / 2, wy + wh / 2, { size: 9, col: C.muted });
      /* g_hwnd slot + ticket */
      txt(c, 'g_hwnd', 150, 175, { size: 9, w: 700, col: C.purple, align: 'left' });
      rrect(c, 202, 165, 126, 20, 3); c.fillStyle = rgba(C.text, .04); c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1; c.stroke();
      if (V.tk0 && !V.hwnd) txt(c, 'NULL', 265, 175.5, { size: 10, col: C.muted, w: 700, al: V.tk0P != null && !S0(V) ? V.tk0P : 1 });
      if (V.hwnd) { var tp = V.hwndP != null && V.hwndP < 1 ? EZ.back(seg(V.hwndP, .1, .9)) : 1; c.save(); c.translate(265, 175); c.scale(tp, tp); ticket(c, C, -46, -9, 92, 18, V.hwnd, C.accent); c.restore();
        txt(c, '(a claim ticket)', 336, 175, { size: 8, col: C.muted, align: 'left' }); }
      /* bottom: chips and message loop */
      if (V.chips) { var cp = V.chipsP != null && V.chipsP < 1 ? V.chipsP : 1;
        c.save(); c.globalAlpha *= cp;
        txt(c, 'WinMain gets', 10, 204, { size: 8, col: C.muted, align: 'left' });
        chip(c, C, 10, 212, 124, 15, 'hInst = this program', C.blue); chip(c, C, 10, 230, 124, 15, 'nShow = how to appear', C.blue); c.restore(); }
      if (V.running || V.loopT) {
        panel(c, 150, 200, 242, 44, rgba(C.text, .03), C.border2, 1);
        txt(c, 'message loop', 158, 209, { size: 8, col: C.muted, align: 'left' });
        var lines = String(V.loopT || '').split('|');
        lines.forEach(function (t, k) { txt(c, t, 158, 223 + k * 12, { size: 9, w: 700, col: C.text, align: 'left' }); });
        if (V.loopE) { var bob = rm ? 0 : Math.sin(T / 300) * 1.5; env(c, C, V.loopE, '', 292, 224 + bob, .8, 1); }
        chip(c, C, 322, 216, 64, 16, 'WindowProc', V.def ? C.accent : C.muted, V.def ? 1 : .6);
        if (V.def) { txt(c, '-> DefWindowProc', 354, 238, { size: 7, col: C.accent }); }
        c.strokeStyle = V.def ? C.accent : C.border2; c.lineWidth = 1.2; c.beginPath(); c.moveTo(324 - 12, 224); c.lineTo(322, 224); c.stroke();
      }
    }
  });
  function S0(V) { return !!V.hwnd; }
  RTSPlay.SCENES['p5-window'].prep = function (V, S) { };

  /* =====================================================================
     p5-desk   window (left), WindowProc rows (right), message belt (bottom)
       rows   { list:[...] }                 the receptionist's rows (case labels)
       win    { s:'off'|'hid'|'on'|'gone' }
       title  { t }                          window title text
       x      { to }                         g_rect_x variable
       post   { m, sub?, key? }               an envelope joins the back of the belt (key = keycap that caused it)
       take   { }                             front envelope is picked up by the loop (now "in hand")
       give   { row }                         the envelope in hand goes to the WindowProc row, row lights up
       send   { m, row }                      Windows hands a message straight to WindowProc (not via the belt)
       hl     { row|null }                    row highlight on/off
       loop   { name, t }                     loop box: function name + status lines (| = line break)
       stat   { t }                           loop box status only
       fr     { n }                           frame = n
       wet    { on }                          "wet paint" sign
       hdc    { on }, brush { on }            chips inside the window
       erase  { }                             old square wiped
       ink    { v }                           square painted at value v
       target { v|null }                      dashed outline where the square will go
       flash  { }                             window repaints itself (default handling)
       sleep  { }                             Sleep() zzz
       banner { t, k:'ok'|'warn' }            line at the bottom
     ===================================================================== */
  var WX = 10, WY = 10, WW = 214, WH = 130, SLOT0 = 262, SLOTD = 64, BY = 198, HX = 348, HY = 148;
  var slotX = function (k) { return SLOT0 - SLOTD * k; };
  var rowY = function (i) { return 41 + i * 15; };
  var rectX = function (v) { return WX + 12 + (v - 100) * 3; };
  var deskDef = {
    W: W, H: H,
    init: function () { return { win: 'on', title: 'My First Window', gx: null, px: null, tg: null, rows: [], hl: null, q: [], hand: null, loop: 'GetMessage', stat: '', fr: null, wet: false, hdc: false, brush: false, banner: null, bk: 'ok' }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'rows': S.rows = a.list; break;
        case 'win': S.win = a.s; break;
        case 'title': S.title = a.t; break;
        case 'x': S.gx = a.to; break;
        case 'post': S.q.push({ m: a.m, sub: a.sub || '' }); break;
        case 'take': if (S.q.length) S.hand = S.q.shift(); break;
        case 'give': S.hand = null; S.hl = a.row; break;
        case 'send': S.hl = a.row; break;
        case 'hl': S.hl = a.row || null; break;
        case 'bin': S.hand = null; break;
        case 'loop': S.loop = a.name; S.stat = a.t || ''; break;
        case 'stat': S.stat = a.t || ''; break;
        case 'fr': S.fr = a.n; break;
        case 'wet': S.wet = !!a.on; break;
        case 'hdc': S.hdc = !!a.on; break;
        case 'brush': S.brush = !!a.on; break;
        case 'erase': S.px = null; break;
        case 'ink': S.px = a.v; break;
        case 'target': S.tg = a.v == null ? null : a.v; break;
        case 'banner': S.banner = a.t; S.bk = a.k || 'ok'; break;
      }
    },
    tween: function (V, a, lp, S) {
      var i;
      switch (a.a) {
        case 'rows': V.rowsP = lp; if (lp > 0) V.rows = a.list; break;
        case 'win': V.winP = lp; V.winFrom = S.win; if (lp >= .5) V.win = a.s; break;
        case 'title': if (lp >= .5) V.title = a.t; V.titlePop = Math.sin(Math.PI * lp); break;
        case 'x': if (lp >= .5) V.gx = a.to; V.gxPop = Math.sin(Math.PI * lp); break;
        case 'post':
          if (lp > 0) V.q.push({ m: a.m, sub: a.sub || '', x: lerp(-40, slotX(S.q.length), EZ.out(lp)) });
          if (a.key) V.key = { t: a.key, al: Math.sin(Math.PI * clamp(lp * 1.1)) };
          break;
        case 'take': {
          if (lp <= 0 || !V.q.length) break;
          var it = V.q.shift(), p = EZ.io(lp);
          for (i = 0; i < V.q.length; i++) V.q[i].x = lerp(slotX(i + 1), slotX(i), p);
          V.hand = { m: it.m, sub: it.sub, x: lerp(slotX(0), HX, p), y: lerp(BY - 16, HY, p), sc: 1, al: 1 };
          break; }
        case 'give': {
          if (lp <= 0 || !V.hand) break;
          var ri = Math.max(0, V.rows.indexOf(a.row)), p2 = EZ.io(seg(lp, 0, .7));
          V.hand = { m: V.hand.m, sub: V.hand.sub, x: lerp(HX, 313, p2), y: lerp(HY, rowY(ri), p2), sc: lerp(1, .45, p2), al: 1 - seg(lp, .6, .78) };
          if (lp >= .7) V.hl = a.row;
          if (lp >= 1) V.hand = null;
          break; }
        case 'send': {
          if (lp <= 0) break;
          var rj = Math.max(0, V.rows.indexOf(a.row)), p3 = EZ.io(seg(lp, 0, .7));
          V.fly = { m: a.m, x: lerp(150, 313, p3), y: lerp(30, rowY(rj), p3), sc: lerp(.9, .5, p3), al: 1 - seg(lp, .62, .78) };
          if (lp >= .7) V.hl = a.row;
          if (lp >= 1) V.fly = null;
          break; }
        case 'hl': if (lp > 0) V.hl = a.row || null; break;
        case 'bin': if (V.hand) { if (lp >= 1) V.hand = null; else V.hand = Object.assign({}, V.hand, { al: 1 - lp, y: V.hand.y - 10 * lp, sc: 1 - .3 * lp }); } break;
        case 'loop': V.loopPop = Math.sin(Math.PI * lp); if (lp >= .4) { V.loop = a.name; V.stat = a.t || ''; } break;
        case 'stat': V.statPop = Math.sin(Math.PI * lp); if (lp >= .4) V.stat = a.t || ''; break;
        case 'fr': V.frPop = Math.sin(Math.PI * lp); if (lp >= .4) V.fr = a.n; break;
        case 'wet': V.wetA = a.on ? lp : 1 - lp; V.wet = a.on || lp < 1; break;
        case 'hdc': V.hdcA = a.on ? lp : 1 - lp; V.hdc = a.on || lp < 1; break;
        case 'brush': V.brushA = a.on ? lp : 1 - lp; V.brush = a.on || lp < 1; break;
        case 'erase': if (lp >= 1) V.px = null; else V.pxA = 1 - lp; V.sweep = lp; break;
        case 'ink': if (lp > 0) { V.px = a.v; V.inkP = lp; } break;
        case 'target': V.tgA = lp; if (lp > 0) V.tg = a.v == null ? null : a.v; break;
        case 'flash': V.flash = Math.sin(Math.PI * lp); break;
        case 'sleep': V.zz = lp; break;
        case 'banner': V.banA = lp; if (lp > 0) { V.banner = a.t; V.bk = a.k || 'ok'; } break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      /* ---- window ---- */
      var win = V.win, al = win === 'on' || win === 'hid' ? 1 : 0, ghost = win === 'gone' ? 1 : 0;
      if (V.winP != null && V.winP > 0 && V.winP < 1) {
        var f = V.winFrom, tw = V.win, look = function (s) { return { a: s === 'on' ? 1 : s === 'hid' ? .5 : 0, g: s === 'gone' ? 1 : 0 }; };
        var lf = look(f), lt = look(a_to(V, tw)); al = lerp(lf.a, lt.a, V.winP); ghost = lerp(lf.g, lt.g, V.winP);
      }
      if (win === 'off' && !al && !ghost) txt(c, 'no window yet', WX + WW / 2, WY + WH / 2, { size: 9, col: C.muted });
      if (al > 0) {
        var sc = 1 + .03 * Math.sin(Math.PI * (V.winP || 0));
        var tp = V.titlePop ? ' ' : '';
        winFrame(c, C, WX, WY, WW, WH, V.title, { al: al, sc: sc, dash: win === 'hid' ? [4, 4] : null });
        var cx = WX + 2, cy = WY + 18, cw = WW - 4, ch = WH - 20;
        c.save(); c.beginPath(); c.rect(cx, cy, cw, ch); c.clip(); c.globalAlpha *= al;
        // target outline
        if (V.tg != null) { c.save(); c.globalAlpha *= V.tgA != null ? V.tgA : 1; c.strokeStyle = C.accent; c.setLineDash([3, 3]); c.lineWidth = 1.2; c.strokeRect(rectX(V.tg) + .5, WY + 56 + .5, 33, 33); c.restore(); }
        // painted square
        if (V.px != null) {
          var pa = V.pxA != null ? V.pxA : 1, ip = V.inkP != null ? EZ.back(V.inkP) : 1;
          if (V.erase0) pa = 0;
          c.save(); c.globalAlpha *= pa; var rx = rectX(V.px) + 17, ry = WY + 73; c.translate(rx, ry); c.scale(ip, ip);
          c.fillStyle = C.accent; c.fillRect(-17, -17, 34, 34); c.fillStyle = rgba('#ffffff', .25); c.fillRect(-17, -17, 34, 4); c.restore();
        }
        if (V.sweep > 0 && V.sweep < 1) { var sx = cx + cw * V.sweep; c.fillStyle = rgba(C.text, .12); c.fillRect(sx - 8, cy, 16, ch); }
        if (V.flash > 0) { c.fillStyle = rgba(C.accent, .22 * V.flash); c.fillRect(cx, cy, cw, ch); }
        // wet paint sign
        if (V.wet) { var wa = V.wetA != null ? V.wetA : 1; c.save(); c.globalAlpha *= wa; c.translate(cx + cw - 32, cy + 17 + (1 - wa) * -6);
          rrect(c, -27, -11, 54, 22, 3); c.fillStyle = rgba(C.yellow, .28); c.fill(); c.lineWidth = 1.2; c.strokeStyle = C.yellow; c.stroke();
          txt(c, 'WET PAINT', 0, -3, { size: 8, w: 700, col: C.text }); txt(c, 'redo me', 0, 6, { size: 8, col: C.muted2 }); c.restore(); }
        // variable + chips inside client bottom strip
        if (V.gx != null) { var gp = pop(V.gxPop ? V.gxPop : 0) ; var k = 1 + .3 * (V.gxPop || 0);
          c.save(); c.translate(cx + 6, cy + ch - 9); txt(c, 'g_rect_x = ', 0, 0, { size: 9, col: C.muted2, align: 'left' });
          c.translate(54, 0); c.scale(k, k); txt(c, String(V.gx), 0, 0, { size: 10, w: 700, col: C.purple, align: 'left' }); c.restore(); }
        if (V.hdc) chip(c, C, cx + cw - 90, cy + ch - 17, 34, 14, 'hdc', C.blue, V.hdcA != null ? V.hdcA : 1);
        if (V.brush) { var ba = V.brushA != null ? V.brushA : 1; c.save(); c.globalAlpha *= ba; chip(c, C, cx + cw - 52, cy + ch - 17, 48, 14, 'brush', C.accent, 1); c.fillStyle = C.accent; c.fillRect(cx + cw - 49, cy + ch - 13, 5, 6); c.restore(); }
        c.restore();
      }
      if (ghost > 0) { c.save(); c.globalAlpha *= ghost; rrect(c, WX, WY, WW, WH, 3); c.strokeStyle = C.muted; c.lineWidth = 1.2; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]);
        txt(c, 'window destroyed', WX + WW / 2, WY + WH / 2, { size: 10, w: 700, col: C.muted2 }); c.restore(); }
      /* keycap */
      if (V.key && V.key.al > 0) { c.save(); c.globalAlpha *= V.key.al; rrect(c, 12, 146, 36, 16, 3); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.yellow; c.lineWidth = 1.4; c.stroke();
        txt(c, V.key.t, 30, 154.5, { size: 8, w: 700, col: C.text }); c.restore(); }
      /* ---- WindowProc receptionist ---- */
      panel(c, 236, 10, 154, 118, rgba(C.accent, .05), C.border2, 1.2);
      var rpa = V.rowsP != null ? V.rowsP : 1;
      txt(c, 'WindowProc', 313, 22, { size: 9, w: 700, col: C.accent });
      c.save(); c.globalAlpha *= V.rows.length ? rpa : 0;
      V.rows.forEach(function (r, i) {
        var on = V.hl === r, y = rowY(i);
        rrect(c, 244, y - 6.5, 138, 13, 3); c.fillStyle = on ? C.accent : rgba(C.text, .05); c.fill(); c.lineWidth = 1; c.strokeStyle = on ? C.accent : C.border2; c.stroke();
        txt(c, r, 250, y + .5, { size: 8, w: on ? 700 : 500, col: on ? C.ink : C.muted2, align: 'left' });
      });
      c.restore();
      if (!V.rows.length) txt(c, '(not set yet)', 313, 70, { size: 8, col: C.muted });
      /* ---- belt ---- */
      c.fillStyle = C.border2; c.fillRect(10, BY, 292, 5);
      for (var d = 0; d < 28; d++) { c.fillStyle = C.surface2; c.fillRect(14 + d * 10.4 + (rm ? 0 : (T / 90) % 10.4) - 0, BY + 1, 3, 3); }
      c.fillStyle = C.surface; c.fillRect(0, BY - 1, 10, 8); c.fillRect(302, BY - 1, 2, 8);
      txt(c, 'MESSAGE QUEUE', 10, 213, { size: 8, col: C.muted, align: 'left' });
      txt(c, '>', 296, 213, { size: 9, w: 700, col: C.muted });
      V.q.forEach(function (e, i) { var x = e.x != null ? e.x : slotX(i); if (x > -30) env(c, C, e.m, e.sub, x, BY - 16, 1, 1); });
      /* ---- loop box ---- */
      panel(c, 306, 168, 86, 56, rgba(C.text, .03), C.border2, 1.2);
      var lk = 1 + .12 * (V.loopPop || 0);
      c.save(); c.translate(349, 179); c.scale(lk, lk); txt(c, V.loop, 0, 0, { size: 9, w: 700, col: C.accent }); c.restore();
      String(V.stat || '').split('|').forEach(function (t, i) { txt(c, t, 349, 192 + i * 10, { size: 8, col: C.muted2, al: V.statPop ? 1 - .5 * V.statPop : 1 }); });
      if (V.fr != null) { var fk = 1 + .25 * (V.frPop || 0); c.save(); c.translate(349, 214); c.scale(fk, fk); txt(c, 'frame = ' + V.fr, 0, 0, { size: 9, w: 700, col: C.purple }); c.restore(); }
      if (V.zz > 0 && V.zz < 1) { txt(c, 'z', 330 + V.zz * 26, 160 - V.zz * 10, { size: 9, w: 700, col: C.blue, al: 1 - V.zz }); txt(c, 'Z', 342 + V.zz * 26, 154 - V.zz * 12, { size: 11, w: 700, col: C.blue, al: 1 - V.zz }); }
      /* envelopes in flight */
      if (V.hand) env(c, C, V.hand.m, V.hand.sub, V.hand.x, V.hand.y, V.hand.sc, V.hand.al);
      if (V.fly) env(c, C, V.fly.m, '', V.fly.x, V.fly.y, V.fly.sc, V.fly.al);
      /* banner */
      if (V.banner) { var col = V.bk === 'warn' ? C.orange : C.accent; txt(c, V.banner, 200, 236, { size: 9, w: 700, col: col, al: V.banA != null ? V.banA : 1 }); }
    }
  };
  function a_to(V, s) { return s; }
  function deskVariant(name, over) {
    var d = Object.assign({}, deskDef);
    d.init = function () { var s = deskDef.init(); Object.keys(over).forEach(function (k) { s[k] = JSON.parse(JSON.stringify(over[k])); }); return s; };
    RTSPlay.scene(name, d);
  }
  deskVariant('p5-desk-wndproc', { win: 'off', rows: [] });
  deskVariant('p5-desk-loop', { rows: ['WM_DESTROY: PostQuitMessage', 'default: DefWindowProc'], loop: 'PeekMessage', stat: '' });
  deskVariant('p5-desk-paint', { rows: ['case WM_KEYDOWN', 'case WM_PAINT', 'case WM_DESTROY', 'default'] });

  /* =====================================================================
     p5-libs   menu (windows.h) -> kitchens (user32 / gdi32); the linker is the waiter
       kitchens { u:true|false, g:true|false }
       link     { }                    linker checks every dish
       reset    { }                    clear verdicts
       badge    { w:'compile'|'link', v:'ok'|'fail'|null, t }
       decode   { on:true|false }      __imp__CreateSolidBrush@4 -> CreateSolidBrush
       ring     { ds:[3,4] }           pulse some dishes
       decodeB  (second decode for CreateWindowExA is not needed)
     ===================================================================== */
  var DISH = [['CreateWindowEx', 'u'], ['GetMessage', 'u'], ['FillRect', 'u'], ['CreateSolidBrush', 'g'], ['DeleteObject', 'g']];
  var dishY = function (i) { return 58 + i * 30; };
  var kitEnd = function (i) { return DISH[i][1] === 'u' ? [262, 75 + (i - 1) * 11] : [262, 165 + (i - 3.5) * 11]; };
  RTSPlay.scene('p5-libs', {
    W: W, H: H,
    init: function () { return { u: false, g: false, d: [0, 0, 0, 0, 0], bc: null, bl: null, dec: false }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'kitchens': S.u = a.u; S.g = a.g; break;
        case 'link': S.d = DISH.map(function (d) { return (d[1] === 'u' ? S.u : S.g) ? 1 : 2; }); break;
        case 'reset': S.d = [0, 0, 0, 0, 0]; S.bc = null; S.bl = null; S.dec = false; break;
        case 'badge': if (a.w === 'compile') S.bc = a.v ? { v: a.v, t: a.t } : null; else S.bl = a.v ? { v: a.v, t: a.t } : null; break;
        case 'decode': S.dec = !!a.on; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'kitchens': V.kitP = lp; if (lp >= .3) { V.u = a.u; V.g = a.g; } break;
        case 'link': if (lp > 0 && lp < 1) { V.pulse = lp; V.pu = a.u == null ? S.u : a.u; V.pg = a.g == null ? S.g : a.g; V.d = S.d.slice(); }
          else if (lp >= 1) V.d = DISH.map(function (d) { return (d[1] === 'u' ? S.u : S.g) ? 1 : 2; }); break;
        case 'reset': if (lp >= .5) { V.d = [0, 0, 0, 0, 0]; V.bc = null; V.bl = null; V.dec = false; } break;
        case 'badge': V.badP = lp; V.badW = a.w; if (lp >= .3) { var o = a.v ? { v: a.v, t: a.t } : null; if (a.w === 'compile') V.bc = o; else V.bl = o; } break;
        case 'decode': V.decP = lp; if (lp > 0) V.dec = !!a.on; break;
        case 'ring': V.ring = { ds: a.ds, p: lp }; break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      /* menu */
      panel(c, 10, 10, 138, 196, rgba(C.text, .03), C.border2, 1.2);
      txt(c, 'windows.h', 79, 24, { size: 9, w: 700, col: C.text }); txt(c, '(the menu)', 79, 35, { size: 8, col: C.muted });
      /* arrows */
      DISH.forEach(function (d, i) {
        var y = dishY(i) + 30 - 30, e = kitEnd(i), st = V.d[i], x0 = 148;
        var col = st === 1 ? C.accent : st === 2 ? C.orange : C.border2, pr = V.pulse;
        c.save(); c.strokeStyle = col; c.lineWidth = st ? 1.6 : 1.1; if (!st) c.setLineDash([3, 4]);
        c.beginPath(); c.moveTo(x0, y); c.lineTo(e[0], e[1]); c.stroke(); c.setLineDash([]);
        var ok = (d[1] === 'u' ? V.pu : V.pg);
        if (pr > 0 && pr < 1) {
          var tt = ok ? EZ.io(pr) : (pr < .5 ? EZ.out(pr / .5) * .55 : .55 - (pr - .5) / .5 * .55 * 1);
          var px = lerp(x0, e[0], tt), py = lerp(y, e[1], tt);
          c.fillStyle = ok ? C.accent : C.orange; c.beginPath(); c.arc(px, py, 3.4, 0, 7); c.fill();
          if (!ok && pr > .4 && pr < .9) txt(c, '?', px + 8, py - 6, { size: 11, w: 800, col: C.orange });
        }
        if (st === 2) { var mx = lerp(x0, e[0], .55), my = lerp(y, e[1], .55); c.strokeStyle = C.orange; c.lineWidth = 2.2; c.beginPath(); c.moveTo(mx - 4, my - 4); c.lineTo(mx + 4, my + 4); c.moveTo(mx + 4, my - 4); c.lineTo(mx - 4, my + 4); c.stroke(); }
        c.restore();
      });
      /* dishes */
      DISH.forEach(function (d, i) {
        var y = dishY(i), st = V.d[i], col = st === 1 ? C.accent : st === 2 ? C.orange : C.muted2;
        var rg = V.ring && V.ring.ds.indexOf(i) >= 0 ? Math.sin(Math.PI * V.ring.p) : 0;
        c.save(); c.translate(79, y); c.scale(1 + .06 * rg, 1 + .06 * rg);
        rrect(c, -62, -11, 124, 22, 3); c.fillStyle = rgba(st ? col : C.text, st ? .14 : .05); c.fill(); c.lineWidth = rg ? 2 : 1.1; c.strokeStyle = st ? col : C.border2; c.stroke();
        txt(c, d[0], 0, .5, { size: 9, w: 700, col: C.text }); c.restore();
      });
      /* kitchens */
      [['u', 'user32.lib', 'windows, messages, input', 18, 'accent'], ['g', 'gdi32.lib', 'drawing objects', 108, 'blue']].forEach(function (k) {
        var on = V[k[0]], y = k[3], col = C[k[4]], kp = V.kitP != null && V.kitP < 1 ? EZ.back(V.kitP) : 1;
        c.save(); c.translate(327, y + 45); var s = on && V.kitP != null && V.kitP < 1 ? lerp(.9, 1, kp) : 1; c.scale(s, s); c.translate(-327, -y - 45);
        c.globalAlpha *= on ? 1 : .55;
        rrect(c, 262, y, 128, 90, 4); c.fillStyle = on ? rgba(col, .12) : rgba(C.text, .03); c.fill(); c.lineWidth = 1.4; c.strokeStyle = on ? col : C.muted; if (!on) c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]);
        pix(c, ['00100100', '01111110', '01000010', '01111110', '01000010', '01111110'], 270, y + 6, 2.6, ['', on ? col : C.muted]);
        txt(c, k[1], 330, y + 15, { size: 10, w: 700, col: on ? col : C.muted2, align: 'left' });
        txt(c, k[2], 326, y + 74, { size: 8, col: C.muted2 });
        if (!on) { txt(c, 'left off the', 326, y + 45, { size: 9, col: C.orange, w: 700 }); txt(c, 'command line', 326, y + 57, { size: 9, col: C.orange, w: 700 }); }
        c.restore();
      });
      /* badges */
      var bd = function (x, y, label, o) {
        var col = !o ? C.muted : o.v === 'ok' ? C.accent : C.orange; var t = o ? o.t : '...';
        rrect(c, x, y, 104, 17, 3); c.fillStyle = rgba(col, o ? .16 : .04); c.fill(); c.lineWidth = 1; c.strokeStyle = o ? col : C.border2; c.stroke();
        txt(c, label, x + 6, y + 9, { size: 8, col: C.muted2, align: 'left' }); txt(c, t, x + 98, y + 9, { size: 8, w: 700, col: o ? col : C.muted, align: 'right' });
      };
      bd(154, 12, 'compile', V.bc); bd(154, 33, 'link', V.bl);
      /* decode strip */
      if (V.dec) { var da = V.decP != null ? EZ.out(V.decP) : 1; c.save(); c.globalAlpha *= da;
        panel(c, 10, 214, 380, 30, rgba(C.text, .04), C.border2, 1);
        c.font = '500 11px ' + U.FONT; var a1 = '__imp__', a2 = 'CreateSolidBrush', a3 = '@4';
        var w1 = c.measureText(a1).width, w2 = c.measureText(a2).width, w3 = c.measureText(a3).width, x0 = 200 - (w1 + w2 + w3) / 2;
        txt(c, a1, x0, 229, { size: 11, col: C.muted, align: 'left' }); txt(c, a2, x0 + w1, 229, { size: 11, w: 700, col: C.accent, align: 'left' }); txt(c, a3, x0 + w1 + w2, 229, { size: 11, col: C.muted, align: 'left' });
        c.strokeStyle = C.orange; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, 229); c.lineTo(x0 + w1, 229); c.moveTo(x0 + w1 + w2, 229); c.lineTo(x0 + w1 + w2 + w3, 229); c.stroke();
        c.restore(); }
    }
  });

  /* =====================================================================
     p5-clock   registers freq / last / now, a timeline, lap bars
       reg   { name:'freq'|'last'|'now', val }     a register gets a reading
       decl  { }                                    three empty registers appear
       sleep { ms }                                 time passes: cursor travels along the timeline
       calc  { ms:'16.8' }                          (now - last) * 1000 / freq
       copy  { }                                    last = now (new lap starts)
       lap   { ms:'16.8' }                          bar added (printf)
       ban   { t }                                  text line in the middle
     ===================================================================== */
  var CK_X0 = 30, CK_PX = 13;
  RTSPlay.scene('p5-clock', {
    W: W, H: H,
    init: function () { return { decl: false, freq: null, last: null, now: null, cur: null, res: null, laps: [], ban: null }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'decl': S.decl = true; break;
        case 'reg': S[a.name] = a.val; if (a.name === 'last') { S.cur = 0; S.now = null; S.res = null; } break;
        case 'sleep': S.cur = a.ms; break;
        case 'calc': S.res = a.ms; break;
        case 'copy': S.last = S.now; S.now = null; S.cur = 0; S.res = null; break;
        case 'lap': S.laps.push(a.ms); break;
        case 'ban': S.ban = a.t; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'decl': V.declP = lp; if (lp > 0) V.decl = true; break;
        case 'reg': V.regN = a.name; V.regP = lp; if (lp >= .5) { V[a.name] = a.val; if (a.name === 'last') { V.cur = 0; V.now = null; V.res = null; } } break;
        case 'sleep': V.cur = lerp(S.cur || 0, a.ms, EZ.lin(lp)); V.slp = lp; break;
        case 'calc': V.calcP = lp; if (lp >= .6) V.res = a.ms; break;
        case 'copy': V.cpP = lp; if (lp >= .5) { V.last = S.now; V.now = null; V.cur = 0; V.res = null; } break;
        case 'lap': V.lapP = lp; if (lp > 0) V.laps = S.laps.concat([a.ms]); break;
        case 'ban': V.banP = lp; if (lp > 0) V.ban = a.t; break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      var cards = [['freq', 'ticks per second', 10, C.purple], ['last', 'earlier reading', 140, C.blue], ['now', 'latest reading', 270, C.orange]];
      cards.forEach(function (k) {
        var v = V[k[0]], x = k[2], has = v != null, pp = V.regN === k[0] && V.regP != null ? pop(V.regP) : 1, dp = V.declP != null ? V.declP : 1;
        if (!V.decl) return;
        c.save(); c.globalAlpha *= dp; c.translate(x + 60, 31); c.scale(pp, pp);
        rrect(c, -60, -21, 120, 42, 3); c.fillStyle = has ? rgba(k[3], .13) : rgba(C.text, .04); c.fill(); c.lineWidth = 1.3; c.strokeStyle = has ? k[3] : C.border2; if (!has) c.setLineDash([3, 3]); c.stroke(); c.setLineDash([]);
        txt(c, k[0], -54, -12, { size: 9, w: 700, col: k[3], align: 'left' }); txt(c, k[1], 54, -12, { size: 7, col: C.muted, align: 'right' });
        txt(c, has ? v : '?', 0, 7, { size: has && v.length > 9 ? 12 : 13, w: 700, col: has ? C.text : C.muted }); c.restore();
      });
      /* timeline */
      var ty = 98;
      txt(c, 'real time passing  >', 20, ty - 22, { size: 8, col: C.muted, align: 'left' });
      c.fillStyle = C.border2; c.fillRect(20, ty, 360, 4);
      for (var i = 0; i <= 36; i++) { c.fillStyle = i % 5 === 0 ? C.muted : C.border2; c.fillRect(20 + i * 10, ty + 6, 1.4, i % 5 === 0 ? 7 : 4); }
      var hasLast = V.cur != null && V.last != null;
      if (hasLast) {
        var lx = CK_X0, nx = CK_X0 + V.cur * CK_PX;
        flag(c, C, lx, ty, 'last', C.blue);
        if (V.res != null || V.now != null) flag(c, C, nx, ty, 'now', C.orange);
        if (V.cur > .3) { c.fillStyle = rgba(C.accent, .35); c.fillRect(lx, ty - 5, nx - lx, 3);
          if (V.now != null && nx - lx > 80) txt(c, 'ticks elapsed', (lx + nx) / 2, ty - 14, { size: 8, col: C.accent }); }
        /* cursor */
        if (V.slp > 0 && V.slp < 1) { c.fillStyle = C.yellow; c.beginPath(); c.arc(nx, ty + 2, 4, 0, 7); c.fill();
          txt(c, 'Sleep(16)', nx, ty + 26, { size: 8, w: 700, col: C.yellow }); }
      }
      /* formula + result */
      if (V.decl) {
        txt(c, '(now - last) x 1000 / freq', 200, 142, { size: 10, col: C.muted2, al: V.res != null ? 1 : .5 });
        if (V.res != null) { var rp = V.calcP != null && V.calcP < 1 ? EZ.back(seg(V.calcP, .5, 1)) : 1; c.save(); c.translate(200, 166); c.scale(rp, rp);
          txt(c, '= ' + V.res + ' ms', 0, 0, { size: 17, w: 800, col: C.accent }); c.restore(); }
      }
      if (V.ban) txt(c, V.ban, 200, 130, { size: 9, w: 700, col: C.orange, al: V.banP != null ? V.banP : 1 });
      /* laps */
      var laps = V.laps;
      txt(c, 'frame times so far', 10, 191, { size: 8, col: C.muted, align: 'left' });
      c.strokeStyle = rgba(C.yellow, .55); c.setLineDash([3, 3]); c.lineWidth = 1; c.beginPath(); c.moveTo(10, 244 - 16.7 * 1.9); c.lineTo(390, 244 - 16.7 * 1.9); c.stroke(); c.setLineDash([]);
      txt(c, '60 fps = 16.7 ms', 390, 244 - 16.7 * 1.9 - 7, { size: 7, col: C.yellow, align: 'right' });
      laps.forEach(function (m, i) {
        var h = parseFloat(m) * 1.9, x = 14 + i * 44, gp = i === laps.length - 1 && V.lapP != null ? EZ.out(V.lapP) : 1;
        c.fillStyle = rgba(C.accent, .75); c.fillRect(x, 244 - h * gp, 34, h * gp);
        txt(c, m, x + 17, 244 - h * gp - 7, { size: 8, w: 700, col: C.text, al: gp });
      });
    }
  });
  function flag(c, C, x, y, label, col) {
    c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x, y + 14); c.stroke();
    c.fillStyle = col; c.fillRect(x, y - 12, label.length * 5 + 6, 9); txt(c, label, x + 3, y - 7, { size: 7, w: 700, col: C.ink, align: 'left' });
  }

  /* =====================================================================
     p5-curtain   window (what you see) + hidden back card
       x     { to }
       msg   { m|null }               message chip top right
       hdc   { on }
       dims  { on }                   w x h measuring arrows
       dc    { }  bmp { }  sel { on } card pieces
       cfill { }                      card wiped to window colour
       ctarget { v }  cbrush { on }  cink { v }
       blit  { v }                    card copied to the window in one go
       drop  { what:'bmp'|'dc' }
     ===================================================================== */
  var PL = { x: 10, y: 56, w: 176, h: 112 }, PR = { x: 214, y: 56, w: 176, h: 112 };
  var sqx = function (P, v) { return P.x + 16 + (v - 100) * 3.4; };
  RTSPlay.scene('p5-curtain', {
    W: W, H: H,
    init: function () { return { gx: null, wInk: 100, msg: null, hdc: false, dims: false, card: 'none', sel: false, cInk: null, cTg: null, brush: false }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'x': S.gx = a.to; break;
        case 'msg': S.msg = a.m || null; break;
        case 'hdc': S.hdc = !!a.on; break;
        case 'dims': S.dims = !!a.on; break;
        case 'dc': S.card = 'dc'; break;
        case 'bmp': S.card = 'bmp'; break;
        case 'sel': S.sel = !!a.on; break;
        case 'cfill': S.cInk = null; break;
        case 'ctarget': S.cTg = a.v == null ? null : a.v; break;
        case 'cbrush': S.brush = !!a.on; break;
        case 'cink': S.cInk = a.v; S.cTg = null; break;
        case 'blit': S.wInk = a.v; break;
        case 'drop': if (a.what === 'bmp') { S.card = 'dc'; S.cInk = null; S.cTg = null; } else S.card = 'none'; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'x': if (lp >= .5) V.gx = a.to; V.gxPop = Math.sin(Math.PI * lp); break;
        case 'msg': V.msgPop = Math.sin(Math.PI * lp); if (lp >= .4) V.msg = a.m || null; break;
        case 'hdc': V.hdcA = a.on ? lp : 1 - lp; V.hdc = a.on || lp < 1; break;
        case 'dims': V.dimsA = a.on ? lp : 1 - lp; V.dims = a.on || lp < 1; break;
        case 'dc': V.cardP = lp; if (lp > 0) V.card = 'dc'; break;
        case 'bmp': V.bmpP = lp; if (lp > 0) V.card = 'bmp'; break;
        case 'sel': V.selP = a.on ? lp : 1 - lp; V.sel = a.on || lp < 1; break;
        case 'cfill': V.wipe = lp; if (lp >= 1) V.cInk = null; break;
        case 'ctarget': V.tgA = lp; if (lp > 0) V.cTg = a.v; break;
        case 'cbrush': V.brushA = a.on ? lp : 1 - lp; V.brush = a.on || lp < 1; break;
        case 'cink': if (lp > 0) { V.cInk = a.v; V.cTg = null; V.inkP = lp; } break;
        case 'blit': V.blit = lp; V.blitV = a.v; if (lp >= .7) V.wInk = a.v; break;
        case 'drop': V.dropP = lp; V.dropW = a.what; if (lp >= .6) { if (a.what === 'bmp') { V.card = 'dc'; V.cInk = null; V.cTg = null; } else V.card = 'none'; } break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      if (V.gx != null) { var k = 1 + .3 * (V.gxPop || 0); txt(c, 'g_rect_x = ', 10, 18, { size: 10, col: C.muted2, align: 'left' });
        c.save(); c.translate(76, 18); c.scale(k, k); txt(c, String(V.gx), 0, 0, { size: 12, w: 700, col: C.purple, align: 'left' }); c.restore(); }
      if (V.msg) { var mk = 1 + .15 * (V.msgPop || 0); env(c, C, V.msg, '', 356, 21, .8 * mk, 1); txt(c, 'now handling', 292, 21, { size: 8, col: C.muted, align: 'right' }); }
      /* left panel: the window */
      txt(c, 'THE WINDOW', PL.x, 46, { size: 8, w: 700, col: C.muted2, align: 'left' }); txt(c, '(what the player sees)', PL.x + 66, 46, { size: 8, col: C.muted, align: 'left' });
      winFrame(c, C, PL.x, PL.y - 2, PL.w, PL.h + 2, 'My First Window', {});
      var cx = PL.x + 2, cy = PL.y + 16, cw = PL.w - 4, ch = PL.h - 18;
      c.save(); c.beginPath(); c.rect(cx, cy, cw, ch); c.clip();
      var wv = V.wInk, bl = V.blit;
      sq(c, C, PL, wv, 1);
      if (bl > .45 && bl < 1) { c.fillStyle = rgba(C.accent, .28 * Math.sin(Math.PI * seg(bl, .45, 1))); c.fillRect(cx, cy, cw, ch); }
      c.restore();
      if (V.hdc) { var ha = V.hdcA != null ? V.hdcA : 1; chip(c, C, PL.x + 4, PL.y + PL.h + 6, 74, 15, 'hdc = window', C.blue, ha); }
      if (V.dims) { var da = V.dimsA != null ? V.dimsA : 1; c.save(); c.globalAlpha *= da; c.strokeStyle = C.orange; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(cx + 3, cy + 5); c.lineTo(cx + cw - 3, cy + 5); c.moveTo(cx + cw - 8, cy + 2); c.lineTo(cx + cw - 3, cy + 5); c.lineTo(cx + cw - 8, cy + 8);
        c.moveTo(cx + 5, cy + 3); c.lineTo(cx + 5, cy + ch - 3); c.moveTo(cx + 2, cy + ch - 8); c.lineTo(cx + 5, cy + ch - 3); c.lineTo(cx + 8, cy + ch - 8); c.stroke();
        txt(c, 'w', cx + cw / 2, cy + 14, { size: 9, w: 700, col: C.orange }); txt(c, 'h', cx + 14, cy + ch / 2, { size: 9, w: 700, col: C.orange }); c.restore(); }
      /* right panel: the back card */
      txt(c, 'BACK CARD', PR.x, 46, { size: 8, w: 700, col: C.muted2, align: 'left' }); txt(c, '(off screen, hidden)', PR.x + 58, 46, { size: 8, col: C.muted, align: 'left' });
      var card = V.card, cardA = 1;
      if (card === 'none') {
        if (V.dropP != null && V.dropP > 0 && V.dropP < 1 && V.dropW === 'dc') { cardA = 1 - V.dropP; }
        else cardA = 0;
      }
      if (card === 'none' && cardA === 0) { panel(c, PR.x, PR.y, PR.w, PR.h, rgba(C.text, .02), C.border2, 1, [3, 5]); txt(c, 'no card yet', PR.x + PR.w / 2, PR.y + PR.h / 2, { size: 9, col: C.muted }); }
      else {
        c.save(); c.globalAlpha *= cardA;
        var solid = card === 'bmp' || (V.dropP != null && V.dropW === 'bmp' && V.dropP > 0 && V.dropP < .6);
        var dcOnly = !solid;
        rrect(c, PR.x, PR.y, PR.w, PR.h, 3); c.fillStyle = solid ? C.bg : rgba(C.text, .03); c.fill();
        c.lineWidth = 1.4; c.strokeStyle = solid ? C.accent : C.muted2; if (dcOnly) c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]);
        if (dcOnly) txt(c, 'a drawing surface with', PR.x + PR.w / 2, PR.y + PR.h / 2 - 6, { size: 8, col: C.muted2 }), txt(c, 'no pixels yet', PR.x + PR.w / 2, PR.y + PR.h / 2 + 6, { size: 8, col: C.muted2 });
        else {
          c.save(); c.beginPath(); c.rect(PR.x + 1, PR.y + 1, PR.w - 2, PR.h - 2); c.clip();
          if (V.cTg != null) { c.save(); c.globalAlpha *= V.tgA != null ? V.tgA : 1; c.strokeStyle = C.accent; c.setLineDash([3, 3]); c.lineWidth = 1.2; c.strokeRect(sqx(PR, V.cTg) + .5, PR.y + 30 + .5, 37, 37); c.restore(); }
          if (V.cInk != null) sq(c, C, PR, V.cInk, V.inkP != null && V.inkP < 1 ? EZ.back(V.inkP) : 1);
          if (V.wipe > 0 && V.wipe < 1) { c.fillStyle = rgba(C.text, .14); c.fillRect(PR.x + PR.w * V.wipe - 10, PR.y, 20, PR.h); }
          if (bl > 0 && bl < .7) { c.fillStyle = rgba(C.accent, .18 * Math.sin(Math.PI * bl / .7)); c.fillRect(PR.x, PR.y, PR.w, PR.h); }
          c.restore();
        }
        c.restore();
      }
      /* curtains around the card */
      drape(c, C, PR.x - 8, PR.y - 6, 20, PR.h + 12, 1); drape(c, C, PR.x + PR.w - 12, PR.y - 6, 20, PR.h + 12, -1);
      c.fillStyle = rgba(C.orange, .5); c.fillRect(PR.x - 8, PR.y - 10, PR.w + 16, 6);
      /* bitmap/dc chips + links */
      if (card !== 'none') { chip(c, C, PR.x + 4, PR.y + PR.h + 6, 74, 15, 'back = DC', C.blue, 1); }
      if (card === 'bmp') { var bk = V.bmpP != null && V.bmpP < 1 ? V.bmpP : 1; chip(c, C, PR.x + 84, PR.y + PR.h + 6, 80, 15, 'bmp = pixels', C.accent, bk); }
      if (V.sel) { var sa = V.selP != null ? V.selP : 1; c.save(); c.globalAlpha *= sa;
        c.strokeStyle = C.accent; c.lineWidth = 1.6; c.beginPath(); c.moveTo(PR.x + 78, PR.y + PR.h + 13.5); c.lineTo(PR.x + 84, PR.y + PR.h + 13.5); c.stroke();
        chip(c, C, PR.x + 84, PR.y + PR.h + 26, 80, 15, 'old = spare', C.muted2, 1); c.restore(); }
      if (V.brush) { var ba = V.brushA != null ? V.brushA : 1; c.save(); c.globalAlpha *= ba; chip(c, C, PR.x + 4, PR.y + PR.h + 26, 50, 15, 'brush', C.accent, 1); c.fillStyle = C.accent; c.fillRect(PR.x + 7, PR.y + PR.h + 30, 5, 6); c.restore(); }
      /* BitBlt arrow + copy */
      var bp = V.blit;
      c.strokeStyle = bp > 0 && bp < 1 ? C.accent : C.border2; c.lineWidth = 1.6; c.beginPath(); c.moveTo(210, PR.y + PR.h / 2); c.lineTo(190, PR.y + PR.h / 2); c.moveTo(195, PR.y + PR.h / 2 - 4); c.lineTo(190, PR.y + PR.h / 2); c.lineTo(195, PR.y + PR.h / 2 + 4); c.stroke();
      if (bp > 0 && bp < 1) { var q = EZ.io(seg(bp, 0, .7)); c.save(); c.globalAlpha = 1 - seg(bp, .6, .75); var gx0 = lerp(PR.x, PL.x, q), gy0 = PR.y + 20;
        rrect(c, gx0, gy0, 60, 40, 3); c.fillStyle = rgba(C.accent, .25); c.fill(); c.strokeStyle = C.accent; c.lineWidth = 1.4; c.stroke(); txt(c, 'BitBlt', gx0 + 30, gy0 + 20, { size: 9, w: 700, col: C.text }); c.restore(); }
      txt(c, 'the audience only ever sees the window', 200, 238, { size: 8, col: C.muted });
    }
  });
  function sq(c, C, P, v, k) {
    if (v == null) return; c.save(); c.translate(sqx(P, v) + 18.5, P.y + 48.5); c.scale(k, k);
    c.fillStyle = C.accent; c.fillRect(-18.5, -18.5, 37, 37); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-18.5, -18.5, 37, 4); c.restore();
  }
  function drape(c, C, x, y, w, h, dir) {
    c.save(); c.fillStyle = rgba(C.orange, .22); c.fillRect(x, y, w, h);
    c.strokeStyle = rgba(C.orange, .6); c.lineWidth = 1;
    for (var i = 1; i < 4; i++) { var px = x + (w * i) / 4; c.beginPath(); c.moveTo(px, y); c.lineTo(px, y + h); c.stroke(); }
    c.restore();
  }
})();
