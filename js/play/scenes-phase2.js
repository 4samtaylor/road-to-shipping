/* =====================================================================
   RTSPlay phase 2 scenes: p2-form, p2-scanf, p2-doors, p2-slope, p2-calc, p2-tape
   =====================================================================
   Load after scenes-core.js. Canvas is 400x250 logical px. Each scene also lists its action
   names in `acts` (ignored by the engine, used by the spec checker).

   p2-form   (printf)  a form with shaped holes filled left to right from variable boxes
     var   { i:0..2, val }                  box i (0 int score, 1 float speed, 2 char key) appears holding val
     form  { parts:[ 'text', {h:'%d', v:'120', k:'sq'}, '\\n' ] }
                                            the format string as a form; objects are holes (k = sq|ci|tr, v = final text)
     fill  { h, i, tok, text, tok2?, k2? }  a token flies from box i into hole #h and shows `text`
                                            (tok2/k2: the token changes into that after half way, e.g. char -> number)
     print { t }                            the finished line appears on the paper strip at the top
   p2-scanf  (scanf)   keyboard buffer -> scanf -> the variable's address
     decl  { i:0|1 }                        box 0 "int guess" / box 1 "char again" appears holding ?
     cap   { t }                            small caption under the buffer
     type  { t }                            the player types t into the keyboard buffer (\n shows as a return mark)
     aim   { i, call }                      the scanf call pill appears with an arrow to box i's address
     skip  { n }                            the first n buffer chars (whitespace) are skipped
     take  { n, i, val }                    first n buffer chars become `val` and ride the arrow into box i
   p2-doors  (if / else)  three doors checked top to bottom
     set   { n:'secret'|'guess', val }
     walk  { to:x }                         runner walks along the floor
     knock { door, v, r:true|false }        the door's sign is tested: v is the sum with values, r the verdict
     enter { door, room }                   door opens, runner goes in, the other doors dim
     say   { t }   hop {}
   p2-slope  (switch)  case labels on a slope, break walls
     choice{ val }                          HUD value
     scan  { row, r:true|false }            label `row` (0 case 1, 1 case 2, 2 case 3, 3 default) is tried
     go    { to:[x,y], arc? }               runner jumps / runs to a point
     bump  { row }                          runner hits the break wall of that row
     say   { t }
   p2-calc   (maths)  operands + operator -> result, types colour the tokens
     vars  { a, b }                         HUD
     expr  { x:{v,t}, op, y:{v,t}, label }  sets the sum (t = int | float | type); op may be 'sizeof' (a only)
     cast  { side:'a'|'b'|'r', v, t, tag }  that token changes type (flip), tag = small caption over it
     calc  { v, t, frac? }                  the result appears (frac = a fraction that gets chopped off and falls)
     rule  { t, good? }                     rule line at the bottom
   p2-tape   (rand)  fixed list of numbers + a start spot chosen by the clock
     clock { val }                          clock chip with the time value
     srand {}                               the clock picks the start spot; the list slides in
     pull  { i }                            cell i is read (pointer moves on)
     calc  { raw, m, v, box }               raw % m + 1 = v and v drops into box 0|1
   ===================================================================== */
(function () {
  'use strict';
  if (!window.RTSPlay) return;
  var U = RTSPlay.util, clamp = U.clamp, lerp = U.lerp, seg = U.seg, EZ = U.EZ, rgba = U.rgba, txt = U.txt, bg = U.bg, rrect = U.rrect, FONT = U.FONT;
  var W = 400, H = 250;
  function reg(name, def) { def.W = W; def.H = H; RTSPlay.scene(name, def); }

  var KCOL = { sq: 'accent', ci: 'purple', tr: 'yellow', di: 'orange' };
  function kc(C, k) { return C[KCOL[k] || 'accent']; }
  function shape(c, k, x, y, r, sx, sy) {
    c.save(); c.translate(x, y); c.scale(sx || 1, sy || 1); c.beginPath();
    if (k === 'sq') c.rect(-r, -r, 2 * r, 2 * r);
    else if (k === 'ci') c.arc(0, 0, r, 0, 7);
    else if (k === 'tr') { c.moveTo(0, -r * 1.1); c.lineTo(r * 1.15, r * .9); c.lineTo(-r * 1.15, r * .9); c.closePath(); }
    else { c.moveTo(0, -r * 1.2); c.lineTo(r * 1.2, 0); c.lineTo(0, r * 1.2); c.lineTo(-r * 1.2, 0); c.closePath(); }
    c.restore();
  }
  function token(c, t, C) {   // {k,x,y,r,text,sx,sy,al,size}
    c.save(); c.globalAlpha = t.al == null ? 1 : t.al; c.translate(t.x, t.y); c.scale(t.sx || 1, t.sy || 1);
    shape(c, t.k, 0, 0, t.r, 1, 1); c.fillStyle = kc(C, t.k); c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke();
    txt(c, t.text, 0, t.k === 'tr' ? t.r * .22 : 1, { size: t.size || (String(t.text).length > 3 ? 9 : 11), w: 700, col: C.ink }); c.restore();
  }
  function runner(c, x, y, f, ph, mv, T, C, rm, hop, sc) {
    sc = sc == null ? 1 : sc; hop = hop || 0;
    c.save(); c.translate(x, y); c.scale(sc, sc); x = 0; y = 0;
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(x, y + 1.5 + hop, 7 - hop * .15, 2.4, 0, 0, 7); c.fill();
    y -= hop;
    var s = mv ? Math.sin(ph) : 0, lift = function (v) { return Math.max(0, v) * 2.4; };
    c.fillStyle = C.accentDk; c.fillRect(x - 4, y - 5 - lift(s), 3, 5 + lift(s)); c.fillRect(x + 1, y - 5 - lift(-s), 3, 5 + lift(-s));
    var wav = rm ? 0 : Math.sin(T / 90 + ph) * (mv ? 1.5 : .6);
    c.fillStyle = C.yellow; c.fillRect(x - f * 6 - (f > 0 ? 7 : 0), y - 13 + wav, 7, 3); c.fillRect(x - f * 12 - (f > 0 ? 5 : 0), y - 12 - wav, 5, 3);
    c.fillStyle = C.accent; c.fillRect(x - 6, y - 17, 12, 12); c.fillStyle = C.accentDk; c.fillRect(x - 6, y - 7, 12, 2);
    c.fillStyle = '#fff'; c.fillRect(x + (f > 0 ? 0 : -5), y - 14, 5, 4); c.fillStyle = C.ink; c.fillRect(x + (f > 0 ? 3 : -5), y - 13, 2, 3);
    c.restore();
  }
  function pill(c, C, x, y, w, h, col, a) { rrect(c, x - w / 2, y - h / 2, w, h, 3); c.fillStyle = rgba(col, a == null ? .16 : a); c.fill(); c.strokeStyle = rgba(col, .65); c.lineWidth = 1; c.stroke(); }
  function box(c, C, cx, top, w, h, col, type, name, val, pop, shapeK) {   // variable box with a shape icon
    c.fillStyle = rgba(col, .1); c.fillRect(cx - w / 2, top, w, h); c.strokeStyle = rgba(col, .6); c.lineWidth = 1.5; c.strokeRect(cx - w / 2 + .75, top + .75, w - 1.5, h - 1.5);
    c.fillStyle = rgba(col, .22); c.fillRect(cx - w / 2, top, w, 5);
    shape(c, shapeK, cx - w / 2 + 11, top + 17, 4.5, 1, 1); c.fillStyle = col; c.fill();
    txt(c, type + ' ' + name, cx - w / 2 + 20, top + 17, { size: 10, w: 700, col: col, align: 'left' });
    var k = pop > 0 && pop < 1 ? 1 + .35 * Math.sin(Math.PI * pop) : 1;
    c.save(); c.translate(cx, top + h - 15); c.scale(k, k);
    txt(c, val == null ? '?' : String(val), 0, 0, { size: String(val).length > 4 ? 13 : 18, w: 700, col: val == null ? C.muted : C.text }); c.restore();
  }

  /* ================= p2-form : printf ================= */
  (function () {
    var VARS = [{ type: 'int', name: 'score', k: 'sq' }, { type: 'float', name: 'speed', k: 'ci' }, { type: 'char', name: 'key', k: 'tr' }];
    var VX = [64, 200, 336], BT = 168, BH = 56, CW = 7.8, HY = 100;
    function holeW(p) { return Math.max(46, String(p.v || p.h).length * CW + 16); }
    function layout(parts) {
      var xs = [], tot = 0, hi = 0;
      parts.forEach(function (p) { var w = typeof p === 'string' ? (p === '\\n' ? 26 : p.length * CW) : holeW(p); xs.push({ w: w, hole: typeof p !== 'string' ? hi++ : -1 }); tot += w + 4; });
      var x = (W - tot + 4) / 2; xs.forEach(function (q) { q.x = x; x += q.w + 4; });
      return xs;
    }
    function holeShape(c, x, y, w, h, k) {
      c.beginPath();
      if (k === 'ci') { rrect(c, x, y, w, h, h / 2); }
      else if (k === 'tr') { c.moveTo(x + 8, y); c.lineTo(x + w - 8, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); }
      else rrect(c, x, y, w, h, 2);
    }
    reg('p2-form', {
      acts: ['var', 'form', 'fill', 'print'],
      init: function () { return { vars: VARS.map(function () { return { vis: false, val: null, pop: 0, app: 1 }; }), form: null, fv: {}, paper: null }; },
      apply: function (S, a) {
        if (a.a === 'var') { S.vars[a.i].vis = true; S.vars[a.i].val = a.val; }
        else if (a.a === 'form') { S.form = a.parts; S.fv = {}; }
        else if (a.a === 'fill') S.fv[a.h] = a.text;
        else if (a.a === 'print') S.paper = a.t;
      },
      tween: function (V, a, lp, S) {
        if (a.a === 'var') { var v = V.vars[a.i]; v.vis = true; v.app = EZ.back(seg(lp, 0, .5)); if (lp >= .5) { v.val = a.val; v.pop = seg(lp, .5, 1); } else v.val = S.vars[a.i].val; }
        else if (a.a === 'form') { V.form = a.parts; V.fv = {}; V.formK = EZ.out(lp); }
        else if (a.a === 'fill') {
          V.fv = Object.assign({}, S.fv); var L = layout(V.form || S.form), q = L.filter(function (z) { return z.hole === a.h; })[0]; if (!q) return;
          var fly = seg(lp, 0, .8), sx = VX[a.i], hx = q.x + q.w / 2;
          if (lp >= .8) { V.fv[a.h] = a.text; V.holePop = { h: a.h, p: seg(lp, .8, 1) }; }
          if (lp > 0 && lp < .8) {
            var e = EZ.io(fly), sw = lp > .5 && a.k2;
            (V.toks = V.toks || []).push({ k: sw ? a.k2 : VARS[a.i].k, x: lerp(sx, hx, e), y: lerp(BT - 6, HY, e) - Math.sin(Math.PI * e) * 26, r: 11, text: sw ? a.tok2 : a.tok, sx: sw ? 1 + .25 * Math.sin(Math.PI * seg(lp, .5, .62)) : 1, sy: 1 });
          }
          V.hl = a.h;
        }
        else if (a.a === 'print') { V.paper = a.t; V.paperN = Math.floor(lp * (a.t.length + 1)); V.paperK = lp; }
      },
      prep: function (V, S) { V.paperN = null; },
      draw: function (c, V, T, C, rm) {
        bg(c, C, W, H);
        /* paper strip */
        c.fillStyle = C.surface2; c.fillRect(20, 12, 360, 36); c.strokeStyle = C.border2; c.lineWidth = 1; c.strokeRect(20.5, 12.5, 359, 35);
        txt(c, 'screen', 28, 21, { size: 8, col: C.muted, align: 'left' });
        if (V.paper != null) {
          var s = V.paper.replace(/\n$/, ''), n = V.paperN == null ? s.length : Math.min(s.length, V.paperN);
          txt(c, s.slice(0, n), 28, 36, { size: 13, w: 700, col: C.accent, align: 'left' });
        }
        /* form */
        if (V.form) {
          var k = V.formK == null ? 1 : V.formK;
          c.save(); c.globalAlpha = clamp(k * 1.4); c.translate(0, (1 - k) * -10);
          c.fillStyle = C.surface2; c.fillRect(20, 62, 360, 78); c.strokeStyle = rgba(C.accent, .5); c.lineWidth = 1.5; c.strokeRect(20.75, 62.75, 358.5, 76.5);
          txt(c, 'the format string, with holes', 28, 72, { size: 8, col: C.muted, align: 'left' });
          var L = layout(V.form);
          V.form.forEach(function (p, i) {
            var q = L[i];
            if (typeof p === 'string') {
              if (p === '\\n') { pill(c, C, q.x + q.w / 2, HY + 10, q.w, 16, C.muted, .12); txt(c, '\\n', q.x + q.w / 2, HY + 10, { size: 10, col: C.muted2 }); }
              else txt(c, p, q.x, HY + 10, { size: 13, col: C.text, align: 'left' });
            } else {
              var col = kc(C, p.k), fv = V.fv && V.fv[q.hole], act = V.hl === q.hole, pp = V.holePop && V.holePop.h === q.hole ? V.holePop.p : 1;
              holeShape(c, q.x, HY - 6, q.w, 30, p.k); c.fillStyle = fv != null ? rgba(col, .22) : '#04040a'; c.fill();
              c.strokeStyle = col; c.lineWidth = act ? 2.5 : 1.5; c.stroke();
              if (fv != null) { var kk = pp > 0 && pp < 1 ? 1 + .3 * Math.sin(Math.PI * pp) : 1; c.save(); c.translate(q.x + q.w / 2, HY + 9); c.scale(kk, kk); txt(c, fv, 0, 0, { size: 13, w: 700, col: C.text }); c.restore(); }
              else txt(c, p.h, q.x + q.w / 2, HY + 9, { size: 12, w: 700, col: rgba(col, .75) });
              txt(c, String(q.hole + 1), q.x + q.w / 2, HY - 14, { size: 9, w: 700, col: C.muted2 });
            }
          });
          txt(c, 'holes fill left to right', 372, 132, { size: 8, col: C.muted, align: 'right' });
          c.restore();
        }
        /* variable boxes */
        c.fillStyle = C.border2; c.fillRect(8, BT + BH + 6, W - 16, 3);
        V.vars.forEach(function (v, i) {
          if (!v.vis) { c.save(); c.globalAlpha = .35; c.strokeStyle = C.muted; c.setLineDash([3, 4]); c.strokeRect(VX[i] - 46.5, BT + .5, 92, BH); c.restore(); return; }
          var sc = v.app == null ? 1 : v.app;
          c.save(); c.translate(VX[i], BT + BH + 6); c.scale(Math.max(sc, 0), Math.max(sc, 0)); c.translate(-VX[i], -(BT + BH + 6));
          box(c, C, VX[i], BT, 92, BH, C[KCOL[VARS[i].k]], VARS[i].type, VARS[i].name, v.val, v.pop, VARS[i].k); c.restore();
        });
        (V.toks || []).forEach(function (t) { token(c, t, C); });
      }
    });
  })();

  /* ================= p2-scanf ================= */
  (function () {
    var BX = [110, 290], BT = 158, BH = 56, TX = 24, CELL = 18, TY = 30, PX = 200, PY = 106;
    var BOXES = [{ type: 'int', name: 'guess', k: 'sq', addr: 1000 }, { type: 'char', name: 'again', k: 'tr', addr: 1004 }];
    function ch(s) { return s === '\n' ? '↵' : s === ' ' ? '␣' : s; }
    reg('p2-scanf', {
      acts: ['decl', 'cap', 'type', 'aim', 'skip', 'take'],
      init: function () { return { buf: '', boxes: [{ vis: false, val: null }, { vis: false, val: null }], aim: null, cap: null }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'decl': S.boxes[a.i].vis = true; break;
          case 'cap': S.cap = a.t; break;
          case 'type': S.buf += a.t; S.cap = null; break;
          case 'aim': S.aim = { i: a.i, call: a.call }; break;
          case 'skip': S.buf = S.buf.slice(a.n); break;
          case 'take': S.buf = S.buf.slice(a.n); S.boxes[a.i].val = a.val; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'decl': V.boxes[a.i].vis = true; V.boxes[a.i].app = EZ.back(seg(lp, 0, .6)); break;
          case 'cap': V.capA = lp; V.cap = a.t; break;
          case 'type': { V.cap = lp > 0 ? null : S.cap; var n = Math.floor(lp * a.t.length + 1e-6); V.buf = S.buf + a.t.slice(0, n); V.fresh = n > 0 ? S.buf.length + n - 1 : -1; V.fresh0 = V.fresh; break; }
          case 'aim': V.aim = { i: a.i, call: a.call }; V.aimK = EZ.out(lp); break;
          case 'skip': { var e = EZ.io(seg(lp, .3, 1)); V.skipN = lp > 0 ? a.n : 0; V.shift = a.n * CELL * (1 - e); V.fly = { n: a.n, lp: seg(lp, 0, .5), mode: 'skip', buf: S.buf }; break; }
          case 'take': {
            var e2 = EZ.io(seg(lp, .5, 1)); V.skipN = lp > 0 ? a.n : 0; V.shift = a.n * CELL * (1 - e2);
            V.fly = { n: a.n, lp: lp, mode: 'take', i: a.i, val: a.val, buf: S.buf };
            if (lp >= .9) { V.boxes[a.i].val = a.val; V.boxes[a.i].pop = seg(lp, .9, 1); }
            break;
          }
        }
      },
      prep: function (V, S) { V.skipN = 0; V.shift = 0; V.fly = null; V.fresh = -1; },
      draw: function (c, V, T, C, rm) {
        bg(c, C, W, H);
        /* keyboard buffer */
        txt(c, 'keyboard buffer (what the player has typed)', 20, 14, { size: 9, col: C.muted, align: 'left' });
        c.fillStyle = C.surface2; c.fillRect(18, TY - 4, 364, 32); c.strokeStyle = C.border2; c.lineWidth = 1; c.strokeRect(18.5, TY - 3.5, 363, 31);
        var skip = V.skipN || 0, sh = V.shift || 0;
        c.save(); c.beginPath(); c.rect(19, TY - 3, 362, 30); c.clip();
        for (var i = skip; i < V.buf.length; i++) {
          var x = TX + (i - skip) * CELL + sh + CELL / 2, isNl = V.buf[i] === '\n', isSp = V.buf[i] === ' ';
          var sc = V.fresh === i ? 1 + .3 * Math.sin(Math.PI * clamp((V.buf.length - i))) : 1;
          rrect(c, x - 7.5, TY + 1, 15, 22, 2); c.fillStyle = isNl || isSp ? rgba(C.muted, .18) : rgba(C.accent, .16); c.fill();
          c.strokeStyle = isNl || isSp ? rgba(C.muted, .6) : rgba(C.accent, .7); c.lineWidth = 1; c.stroke();
          txt(c, ch(V.buf[i]), x, TY + 12.5, { size: 12, w: 700, col: isNl || isSp ? C.muted2 : C.text });
        }
        c.restore();
        if (!V.buf.length) txt(c, '(empty)', 28, TY + 12, { size: 9, col: C.muted, align: 'left' });
        if (V.cap) txt(c, V.cap, 20, 70, { size: 9, w: 700, col: C.orange, align: 'left', al: V.capA == null ? 1 : V.capA });
        /* boxes */
        c.fillStyle = C.border2; c.fillRect(8, BT + BH + 28, W - 16, 3);
        V.boxes.forEach(function (b, i) {
          if (!b.vis) { c.save(); c.globalAlpha = .3; c.strokeStyle = C.muted; c.setLineDash([3, 4]); c.strokeRect(BX[i] - 50.5, BT + .5, 100, BH); c.restore(); return; }
          var sc2 = b.app == null ? 1 : b.app, bb = BOXES[i];
          c.save(); c.translate(BX[i], BT + BH + 28); c.scale(Math.max(sc2, 0), Math.max(sc2, 0)); c.translate(-BX[i], -(BT + BH + 28));
          box(c, C, BX[i], BT, 100, BH, C[KCOL[bb.k]], bb.type, bb.name, b.val, b.pop, bb.k);
          pill(c, C, BX[i], BT + BH + 14, 98, 15, C.blue, .12); txt(c, 'address ' + bb.addr, BX[i], BT + BH + 14.5, { size: 9, w: 700, col: C.blue });
          c.restore();
        });
        /* scanf pill + arrow to the address */
        if (V.aim) {
          var k = V.aimK == null ? 1 : V.aimK, tx = BX[V.aim.i], ty = BT - 3;
          var w = V.aim.call.length * 6.7 + 22;
          c.save(); c.globalAlpha = clamp(k * 1.5);
          c.strokeStyle = rgba(C.blue, .9); c.lineWidth = 2; c.setLineDash([5, 4]); c.lineDashOffset = rm ? 0 : -T / 60;
          var ex = lerp(PX, tx, k), ey = lerp(PY + 12, ty - 6, k);
          c.beginPath(); c.moveTo(PX, PY + 12); c.lineTo(ex, ey); c.stroke(); c.setLineDash([]);
          if (k > .99) { c.fillStyle = C.blue; c.beginPath(); var ang = Math.atan2(ty - 6 - PY - 12, tx - PX); c.save(); c.translate(tx, ty - 3); c.rotate(ang); c.moveTo(0, 0); c.lineTo(-9, -5); c.lineTo(-9, 5); c.closePath(); c.fill(); c.restore(); }
          c.restore();
          c.save(); c.translate(PX, PY); c.scale(k, k); pill(c, C, 0, 0, w, 24, C.blue, .2); txt(c, V.aim.call, 0, 1, { size: 11, w: 700, col: C.text }); c.restore();
        }
        /* flying chars */
        var f = V.fly;
        if (f && f.lp > 0 && f.lp < 1) {
          var txs = V.aim ? BX[V.aim.i] : PX;
          if (f.mode === 'skip') {
            for (var j = 0; j < f.n; j++) { var x0 = TX + j * CELL + CELL / 2, q = f.lp;
              c.save(); c.globalAlpha = 1 - q; c.translate(x0 + 14 * q, TY + 12 - 8 * q); c.rotate(q * 1.4); c.scale(1 - .4 * q, 1 - .4 * q);
              rrect(c, -7.5, -10, 15, 20, 2); c.fillStyle = rgba(C.muted, .3); c.fill(); txt(c, ch(f.buf[j]), 0, 1, { size: 12, col: C.muted2 }); c.restore(); }
          } else {
            var q1 = seg(f.lp, 0, .4), q2 = seg(f.lp, .45, .9);
            if (f.lp < .45) {
              for (var j2 = 0; j2 < f.n; j2++) { var ch0 = f.buf[j2], x1 = TX + j2 * CELL + CELL / 2, e1 = EZ.io(q1);
                var xx = lerp(x1, PX + (j2 - (f.n - 1) / 2) * 9, e1), yy = lerp(TY + 12, PY - 4, e1);
                rrect(c, xx - 7.5, yy - 10, 15, 20, 2); c.fillStyle = rgba(C.accent, .25); c.fill(); c.strokeStyle = rgba(C.accent, .8); c.lineWidth = 1; c.stroke();
                txt(c, ch(ch0), xx, yy + 1, { size: 12, w: 700, col: C.text }); }
            } else {
              var e2 = EZ.io(q2), bb2 = BOXES[f.i], kk = bb2.k;
              token(c, { k: kk, x: lerp(PX, txs, e2), y: lerp(PY + 12, BT + 28, e2), r: 12, text: f.val, sx: 1 - .25 * seg(q2, .8, 1), sy: 1 - .5 * seg(q2, .8, 1), al: 1 - seg(q2, .88, 1) }, C);
            }
          }
        }
      }
    });
  })();

  /* ================= p2-doors : if / else ================= */
  (function () {
    var DX = [72, 200, 328], DT = 88, DH = 84, FY = 172, SIGN = ['guess == secret', 'guess < secret', 'else'], LAB = ['if', 'else if', 'else'];
    reg('p2-doors', {
      acts: ['set', 'walk', 'knock', 'enter', 'say', 'hop'],
      init: function () { return { secret: null, guess: null, doors: [{ r: null, v: '', open: 0, dim: 0, room: '' }, { r: null, v: '', open: 0, dim: 0, room: '' }, { r: null, v: '', open: 0, dim: 0, room: '' }], run: { x: 34, y: 226, f: 1, sc: 1, hide: 0 }, hudPop: null } },
      apply: function (S, a) {
        switch (a.a) {
          case 'set': S[a.n] = a.val; break;
          case 'walk': S.run.f = Math.sign(a.to - S.run.x) || S.run.f; S.run.x = a.to; break;
          case 'knock': S.doors[a.door].r = a.r; S.doors[a.door].v = a.v; S.doors[a.door].test = true; break;
          case 'enter': S.doors.forEach(function (d, i) { if (i === a.door) { d.open = 1; d.room = a.room; } else d.dim = 1; }); S.run.x = DX[a.door]; S.run.y = FY - 2; S.run.sc = .7; S.run.f = 1; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'set': V.hudPop = { n: a.n, p: seg(lp, .3, 1) }; V[a.n] = lp >= .3 ? a.val : S[a.n]; break;
          case 'walk': { var e = EZ.io(lp), mv = lp > 0 && lp < 1; V.run = Object.assign({}, S.run, { x: lerp(S.run.x, a.to, e), f: Math.sign(a.to - S.run.x) || S.run.f, mv: mv ? 1 : 0, ph: lp * 20 }); break; }
          case 'knock': { var d = V.doors[a.door]; d.v = a.v; d.r = lp >= .35 ? a.r : null; d.rp = EZ.back(seg(lp, .35, .65)); d.shake = a.r === false && lp > .35 && lp < .7 ? Math.sin(lp * 70) * 2.4 * (1 - seg(lp, .35, .7)) : 0; d.test = true; break; }
          case 'enter': {
            var e1 = EZ.io(seg(lp, 0, .35)), e2 = EZ.io(seg(lp, .35, 1));
            V.doors.forEach(function (dd, i) { if (i === a.door) { dd.open = e1; dd.room = a.room; } else dd.dim = e1; });
            V.run = Object.assign({}, S.run, { x: lerp(S.run.x, DX[a.door], EZ.io(seg(lp, 0, .35))), y: lerp(S.run.y, FY - 2, e2), sc: lerp(1, .7, e2), f: 1, mv: lp < .35 && lp > 0 ? 1 : 0, ph: lp * 20 }); break;
          }
          case 'say': V.say = { t: a.t, lp: lp }; break;
          case 'hop': V.run = Object.assign({}, V.run, { hop: Math.sin(Math.PI * lp) * 12 }); break;
        }
      },
      prep: function (V, S) { V.hudPop = null; V.say = null; },
      draw: function (c, V, T, C, rm) {
        bg(c, C, W, H);
        /* HUD */
        [['secret', 12], ['guess', 130]].forEach(function (h) {
          var v = V[h[0]], pop = V.hudPop && V.hudPop.n === h[0] && V.hudPop.p > 0 && V.hudPop.p < 1 ? 1 + .35 * Math.sin(Math.PI * V.hudPop.p) : 1;
          txt(c, h[0] + ' = ', h[1], 18, { size: 12, col: C.muted2, align: 'left' });
          c.save(); c.translate(h[1] + (h[0].length + 3) * 7.2, 18); c.scale(pop, pop); txt(c, v == null ? '?' : String(v), 0, 0, { size: 15, w: 700, col: v == null ? C.muted : C.purple, align: 'left' }); c.restore();
        });
        /* floor */
        c.fillStyle = C.border2; c.fillRect(8, FY, W - 16, 3);
        V.doors.forEach(function (d, i) {
          var x = DX[i], sh = d.shake || 0, al = 1 - .6 * (d.dim || 0);
          c.save(); c.globalAlpha = al; c.translate(sh, 0);
          /* sign */
          pill(c, C, x, 56, 112, 18, i === 2 ? C.muted : C.yellow, .14);
          txt(c, SIGN[i], x, 56.5, { size: 10, w: 700, col: C.text });
          c.strokeStyle = C.border2; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, 65); c.lineTo(x, DT); c.stroke();
          /* door frame + leaf */
          var fw = 62; c.fillStyle = '#04040a'; c.fillRect(x - fw / 2, DT, fw, DH);
          if (d.open > 0) { txt(c, d.room, x, DT + 28, { size: 10, w: 700, col: C.accent, al: clamp(d.open * 1.6 - .3) }); }
          var leaf = fw * (1 - .86 * (d.open || 0));
          c.fillStyle = rgba(i === 2 ? C.muted : C.blue, .34); c.fillRect(x - fw / 2, DT, leaf, DH);
          c.strokeStyle = rgba(i === 2 ? C.muted : C.blue, .85); c.lineWidth = 1.5; c.strokeRect(x - fw / 2 + .75, DT + .75, fw - 1.5, DH - 1.5);
          if (d.open < .5) { c.fillStyle = C.yellow; c.fillRect(x + fw / 2 - 11, DT + 44, 4, 4); }
          txt(c, LAB[i], x - fw / 2 + 5 + (d.open > 0 ? 0 : 0), DT + 12, { size: 9, w: 700, col: C.text, align: 'left', al: 1 - (d.open || 0) });
          c.restore();
          /* verdict */
          if (d.test) { c.save(); c.globalAlpha = al; txt(c, d.v, x, 74, { size: 9, col: C.muted2 }); c.restore(); }
          if (d.r != null) {
            var col = d.r ? C.accent : C.orange, k = d.rp == null ? 1 : d.rp, word = d.r ? 'true' : 'false';
            c.save(); c.globalAlpha = al; c.translate(x, DT + DH + 24); c.scale(k, k); var w = 52;
            rrect(c, -w / 2, -8, w, 16, 3); c.fillStyle = rgba(col, .18); c.fill(); c.strokeStyle = rgba(col, .65); c.lineWidth = 1; c.stroke(); txt(c, word, 0, .5, { size: 10, w: 700, col: col }); c.restore();
          }
          if (d.dim && !d.open && d.r == null) txt(c, 'skipped', x, DT + DH + 24, { size: 9, col: C.muted2, al: d.dim });
        });
        /* runner */
        var r = V.run, bob = !rm && !r.mv ? Math.sin(T / 260) * .8 : 0;
        runner(c, r.x, r.y + bob, r.f, r.ph || 0, r.mv, T, C, rm, r.hop, r.sc);
        if (V.say && V.say.lp > 0 && V.say.lp < 1) { var q = V.say.lp; txt(c, V.say.t, clamp(r.x, 40, W - 40), r.y - 34 - 14 * EZ.out(q), { size: 11, w: 700, col: C.accent, al: 1 - seg(q, .6, 1) }); }
      }
    });
  })();

  /* ================= p2-slope : switch ================= */
  (function () {
    var RY = [66, 110, 154, 198], LBL = ['case 1', 'case 2', 'case 3', 'default'], MSG = ['Starting...', 'High scores', 'Bye', 'Not an option'], PX0 = 100, WX = 296, DEPART = [360, 232];
    var start = [30, 36];
    reg('p2-slope', {
      acts: ['choice', 'scan', 'go', 'bump', 'say'],
      init: function () { return { choice: null, tried: [null, null, null, null], run: { x: start[0], y: start[1], f: 1 }, bumped: -1 }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'choice': S.choice = a.val; break;
          case 'scan': S.tried[a.row] = a.r; break;
          case 'go': S.run = { x: a.to[0], y: a.to[1], f: Math.sign(a.to[0] - S.run.x) || S.run.f }; break;
          case 'bump': S.bumped = a.row; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'choice': V.choice = lp >= .3 ? a.val : S.choice; V.pop = seg(lp, .3, 1); break;
          case 'scan': V.tried[a.row] = lp >= .4 ? a.r : null; V.scanK = { row: a.row, p: seg(lp, 0, .4) }; break;
          case 'go': {
            var e = EZ.io(lp), arc = a.arc == null ? 0 : a.arc, mv = lp > 0 && lp < 1, f = Math.sign(a.to[0] - S.run.x) || S.run.f;
            V.run = { x: lerp(S.run.x, a.to[0], e), y: lerp(S.run.y, a.to[1], e) - Math.sin(Math.PI * e) * arc, f: f, mv: mv ? 1 : 0, ph: lp * 24 }; break;
          }
          case 'bump': { V.bump = { row: a.row, p: lp }; var k = Math.sin(Math.PI * seg(lp, .15, .55)); V.run = Object.assign({}, V.run, { x: S.run.x - k * 7 }); V.bumped = lp > .15 ? a.row : S.bumped; break; }
          case 'say': V.say = { t: a.t, lp: lp }; break;
        }
      },
      prep: function (V, S) { V.say = null; V.bump = null; V.scanK = null; V.pop = null; },
      draw: function (c, V, T, C, rm) {
        bg(c, C, W, H);
        txt(c, 'choice = ', W - 52, 18, { size: 12, col: C.muted2, align: 'right' });
        var pp = V.pop > 0 && V.pop < 1 ? 1 + .35 * Math.sin(Math.PI * V.pop) : 1;
        c.save(); c.translate(W - 40, 18); c.scale(pp, pp); txt(c, V.choice == null ? '?' : String(V.choice), 0, 0, { size: 15, w: 700, col: V.choice == null ? C.muted : C.purple }); c.restore();
        txt(c, 'orange wall = break', W - 12, 38, { size: 8.5, col: C.muted2, align: 'right' });
        for (var i = 0; i < 4; i++) {
          var y = RY[i], tr = V.tried[i];
          /* platform */
          c.fillStyle = C.border2; c.fillRect(PX0 - 8, y, 252 + (i < 3 ? 40 : 10), 5);
          c.fillStyle = rgba(C.muted, .1); c.fillRect(PX0 - 8, y + 5, 252 + (i < 3 ? 40 : 10), 8);
          /* label chip */
          var col = tr === true ? C.accent : tr === false ? C.muted : C.yellow, isScan = V.scanK && V.scanK.row === i;
          rrect(c, 12, y - 18, 74, 20, 3); c.fillStyle = rgba(col, tr === false ? .08 : .18); c.fill(); c.strokeStyle = rgba(col, isScan ? 1 : .7); c.lineWidth = isScan ? 2 : 1; c.stroke();
          txt(c, LBL[i] + (tr === true ? ' ✓' : tr === false ? ' ✗' : ''), 49, y - 7.5, { size: 10, w: 700, col: tr === false ? C.muted2 : C.text });
          /* the case body */
          txt(c, 'printf("' + MSG[i] + '")', PX0 + 6, y - 7, { size: 9, col: tr === false ? C.muted : C.muted2, align: 'left' });
          if (i < 3) {
            /* break wall */
            var hit = V.bumped === i, bp = V.bump && V.bump.row === i ? Math.sin(Math.PI * seg(V.bump.p, .15, .6)) : 0;
            c.save(); c.translate(0, 0); c.fillStyle = C.orange; c.fillRect(WX - 1 - bp * 2, y - 26, 8, 26);
            c.fillStyle = 'rgba(0,0,0,.28)'; for (var b = 0; b < 3; b++) c.fillRect(WX - 1 - bp * 2, y - 26 + b * 9 + 4, 8, 2);
            c.restore();
            if (hit) { c.save(); c.strokeStyle = rgba(C.orange, .5 + .5 * bp); c.lineWidth = 2; c.strokeRect(WX - 3.5, y - 28, 13, 30); c.restore(); }
            /* the way down to the next case, if there were no break */
            var ax = WX + 34; c.save(); c.strokeStyle = C.muted; c.globalAlpha = .6; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(ax, y - 6); c.lineTo(ax, RY[i + 1] - 20); c.stroke(); c.setLineDash([]);
            c.fillStyle = C.muted; c.beginPath(); c.moveTo(ax, RY[i + 1] - 13); c.lineTo(ax - 5, RY[i + 1] - 21); c.lineTo(ax + 5, RY[i + 1] - 21); c.closePath(); c.fill(); c.restore();
          }
        }
        /* exit flag */
        c.fillStyle = C.border2; c.fillRect(DEPART[0] - 30, DEPART[1] + 4, 60, 3);
        c.fillStyle = C.accent; c.fillRect(DEPART[0] + 10, DEPART[1] - 24, 2, 28); c.fillRect(DEPART[0] - 4, DEPART[1] - 24, 14, 9);
        txt(c, 'after the switch', DEPART[0] - 4, DEPART[1] + 16, { size: 8, col: C.muted2 });
        /* runner */
        var r = V.run, bob = !rm && !r.mv ? Math.sin(T / 260) * .8 : 0;
        runner(c, r.x, r.y + bob, r.f, r.ph || 0, r.mv, T, C, rm, 0, 1);
        if (V.say && V.say.lp > 0 && V.say.lp < 1) { var q = V.say.lp; txt(c, V.say.t, clamp(r.x + 30, 50, W - 60), r.y - 36 - 12 * EZ.out(q), { size: 11, w: 700, col: C.accent, al: 1 - seg(q, .6, 1) }); }
      }
    });
    RTSPlay.SCENES['p2-slope'].rows = RY;
  })();

  /* ================= p2-calc : integer maths and casting ================= */
  (function () {
    var TY = { int: { k: 'sq', col: 'accent' }, float: { k: 'ci', col: 'purple' }, size_t: { k: 'tr', col: 'yellow' }, type: { k: 'sq', col: 'accent' } };
    var XS = { a: 72, b: 206, r: 336, op: 139, eq: 271 }, YC = 104, R = 23;
    function tk(o) { return o ? { v: o.v, t: o.t, tag: o.tag || null, flip: 0 } : null; }
    reg('p2-calc', {
      acts: ['vars', 'expr', 'cast', 'calc', 'rule'],
      init: function () { return { hud: null, label: null, a: null, b: null, r: null, op: null, rule: null }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'vars': S.hud = a.t; break;
          case 'expr': S.a = tk(a.x); S.b = tk(a.y); S.op = a.op; S.label = a.label; S.r = null; S.rule = null; break;
          case 'cast': S[{ a: 'a', b: 'b', r: 'r' }[a.side]] = { v: a.v, t: a.t, tag: a.tag || null, flip: 0 }; break;
          case 'calc': S.r = { v: a.v, t: a.t, tag: null, flip: 0 }; break;
          case 'rule': S.rule = { t: a.t, good: !!a.good }; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'vars': V.hud = a.t; break;
          case 'expr': V.a = tk(a.x); V.b = tk(a.y); V.op = a.op; V.label = a.label; V.r = null; V.rule = null; V.exprK = EZ.out(lp); break;
          case 'cast': {
            var key = { a: 'a', b: 'b', r: 'r' }[a.side], old = S[key] || { v: a.v, t: a.t };
            var to = { v: a.v, t: a.t, tag: a.tag || null };
            V[key] = lp >= .5 ? Object.assign({}, to) : old;
            V[key] = Object.assign({}, V[key], { flip: Math.sin(Math.PI * seg(lp, .15, .85)) });
            break;
          }
          case 'calc': V.r = { v: a.v, t: a.t, tag: null, flip: 0, k: EZ.back(seg(lp, 0, .5)) }; if (a.frac) V.frac = { t: a.frac, p: seg(lp, .45, 1) }; V.opGlow = Math.sin(Math.PI * seg(lp, 0, .45)); break;
          case 'rule': V.rule = { t: a.t, good: !!a.good }; V.ruleA = lp; break;
        }
      },
      prep: function (V, S) { V.frac = null; V.opGlow = 0; V.exprK = null; V.ruleA = null; },
      draw: function (c, V, T, C, rm) {
        bg(c, C, W, H);
        if (V.hud) txt(c, V.hud, 12, 16, { size: 11, w: 700, col: C.purple, align: 'left' });
        if (V.label) txt(c, V.label, W / 2, 48, { size: 18, w: 700, col: C.text, al: V.exprK == null ? 1 : V.exprK });
        var ek = V.exprK == null ? 1 : V.exprK, sz = V.op === 'sizeof';
        var tokDraw = function (t, x, key) {
          if (!t) return; var m = TY[t.t] || TY.int, fl = Math.max(0, 1 - (t.flip || 0)), kk = t.k == null ? 1 : t.k;
          var lab = t.t === 'type' ? 'type' : t.t;
          c.save(); c.globalAlpha = clamp(ek * 1.5); c.translate(x, YC + (1 - ek) * 10);
          token(c, { k: m.k, x: 0, y: 0, r: R, text: t.v, sx: fl * kk, sy: kk, size: String(t.v).length > 3 ? 12 : 17 }, C);
          txt(c, lab, 0, R + 16, { size: 10, w: 700, col: C[m.col] });
          if (t.tag) txt(c, t.tag, 0, -R - 12, { size: 10, w: 700, col: C.orange });
          c.restore();
        };
        if (sz) { txt(c, 'sizeof(', XS.a + 18, YC, { size: 14, w: 700, col: C.muted2, align: 'right' }); tokDraw(V.a, XS.a + 52 + 18, 'a'); txt(c, ')', XS.a + 52 + 18 + 32, YC, { size: 14, w: 700, col: C.muted2 }); }
        else {
          tokDraw(V.a, XS.a, 'a');
          if (V.op) { c.save(); var og = 1 + .35 * (V.opGlow || 0); c.translate(XS.op, YC); c.scale(og, og); txt(c, V.op, 0, 0, { size: 24, w: 700, col: C.orange }); c.restore(); }
          tokDraw(V.b, XS.b, 'b');
        }
        if (V.a) txt(c, '=', XS.eq, YC, { size: 22, w: 700, col: C.muted2 });
        if (V.a && !V.r) { c.save(); c.strokeStyle = C.border2; c.setLineDash([4, 4]); c.lineWidth = 1.5; c.strokeRect(XS.r - R + .75, YC - R + .75, 2 * R - 1.5, 2 * R - 1.5); c.restore(); txt(c, '?', XS.r, YC, { size: 18, col: C.muted }); }
        if (V.r) tokDraw(V.r, XS.r, 'r');
        if (V.frac) { var p = V.frac.p; if (p > 0 && p < 1) { token(c, { k: 'ci', x: XS.r + 14 + 40 * p, y: YC + 6 + 120 * p * p, r: 10, text: V.frac.t, al: 1 - seg(p, .6, 1), size: 10 }, Object.assign({}, C)); } }
        if (V.rule) { var ra = V.ruleA == null ? 1 : V.ruleA, col = V.rule.good ? C.accent : C.orange;
          c.save(); c.globalAlpha = clamp(ra * 1.5); var wd = Math.min(372, V.rule.t.length * 7 + 28); rrect(c, W / 2 - wd / 2, 178, wd, 30, 4); c.fillStyle = rgba(col, .14); c.fill(); c.strokeStyle = rgba(col, .6); c.lineWidth = 1; c.stroke();
          txt(c, V.rule.t, W / 2, 193.5, { size: 11, w: 700, col: col }); c.restore(); }
        txt(c, 'the types going in decide the type coming out', W / 2, 236, { size: 9, col: C.muted });
      }
    });
  })();

  /* ================= p2-tape : random numbers ================= */
  (function () {
    var TAPE = ['708751583', '286884797', '1500726753', '2029542795', '1992164192', '89733111'], CX = 8, CWD = 62, CY = 78;
    var BX = [130, 270];
    reg('p2-tape', {
      acts: ['clock', 'srand', 'pull', 'calc'],
      init: function () { return { clock: null, tape: false, ptr: 0, hold: null, eq: null, boxes: [null, null] }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'clock': S.clock = a.val; break;
          case 'srand': S.tape = true; S.ptr = 0; break;
          case 'pull': S.ptr = a.i + 1; S.hold = TAPE[a.i]; S.eq = null; break;
          case 'calc': S.hold = null; S.eq = a.raw + ' % ' + a.m + ' + 1 = ' + a.v; S.boxes[a.box] = a.v; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'clock': V.clock = a.val; V.clockK = EZ.back(seg(lp, 0, .6)); break;
          case 'srand': V.tape = true; V.slide = 1 - EZ.out(seg(lp, .25, 1)); V.chipK = seg(lp, 0, .3); V.ptr = 0; break;
          case 'pull': V.pullK = { i: a.i, p: lp }; V.ptr = lp >= .6 ? a.i + 1 : a.i; if (lp >= .6) V.hold = TAPE[a.i]; V.eq = null; break;
          case 'calc': V.hold = lp < .45 ? S.hold : null; V.calcK = seg(lp, .2, .5); V.eq = a.raw + ' % ' + a.m + ' + 1 = ' + a.v; V.calcAl = seg(lp, .15, .45);
            if (lp >= .75) { V.boxes[a.box] = a.v; V.boxPop = { i: a.box, p: seg(lp, .75, 1) }; } V.drop = { i: a.box, v: a.v, p: seg(lp, .5, .78) }; break;
        }
      },
      prep: function (V, S) { V.pullK = null; V.slide = 0; V.calcK = null; V.calcAl = null; V.drop = null; V.boxPop = null; V.clockK = null; V.chipK = null; },
      draw: function (c, V, T, C, rm) {
        bg(c, C, W, H);
        /* clock chip */
        if (V.clock != null) { var k = V.clockK == null ? 1 : V.clockK; c.save(); c.translate(12 + 80, 24); c.scale(k, k); pill(c, C, 0, 0, 160, 22, C.yellow, .16);
          c.strokeStyle = C.yellow; c.lineWidth = 1.5; c.beginPath(); c.arc(-68, 0, 6, 0, 7); c.moveTo(-68, 0); c.lineTo(-68, -4); c.moveTo(-68, 0); c.lineTo(-65, 2); c.stroke();
          txt(c, 'clock: ' + V.clock, 8, 1, { size: 11, w: 700, col: C.text }); c.restore(); }
        txt(c, 'a long, fixed list of numbers', W - 12, 14, { size: 9, col: C.muted, align: 'right' });
        /* tape */
        c.fillStyle = C.surface2; c.fillRect(0, CY - 8, W, 52);
        c.fillStyle = C.border2; c.fillRect(0, CY - 8, W, 1); c.fillRect(0, CY + 43, W, 1);
        var sl = (V.slide || 0) * 320;
        for (var i = 0; i < 6; i++) {
          var x = CX + i * (CWD + 2) + sl, used = V.tape && i < V.ptr, nxt = V.tape && i === V.ptr;
          c.save(); c.globalAlpha = used ? .38 : 1;
          rrect(c, x, CY, CWD, 34, 3); c.fillStyle = V.tape ? rgba(nxt ? C.accent : C.purple, nxt ? .2 : .1) : rgba(C.muted, .08); c.fill();
          c.strokeStyle = V.tape ? rgba(nxt ? C.accent : C.purple, nxt ? .95 : .5) : rgba(C.muted, .35); c.lineWidth = nxt ? 2 : 1; c.stroke();
          var lift = V.pullK && V.pullK.i === i ? Math.sin(Math.PI * V.pullK.p) * 12 : 0;
          txt(c, V.tape ? TAPE[i] : '?', x + CWD / 2, CY + 17 - lift, { size: TAPE[i].length > 9 ? 9 : 10, w: 700, col: V.tape ? C.text : C.muted });
          c.restore();
        }
        /* next marker */
        if (V.tape && V.ptr < 6) { var mx = CX + V.ptr * (CWD + 2) + CWD / 2 + sl; c.fillStyle = C.accent; c.beginPath(); c.moveTo(mx, CY - 4); c.lineTo(mx - 5, CY - 12); c.lineTo(mx + 5, CY - 12); c.closePath(); c.fill(); txt(c, 'next', mx, CY - 20, { size: 8, w: 700, col: C.accent }); }
        /* srand chip flying in */
        if (V.chipK != null && V.chipK > 0 && V.chipK < 1) { var t = EZ.io(V.chipK); c.save(); c.globalAlpha = 1 - V.chipK * .3; txt(c, 'srand( ' + V.clock + ' )', lerp(92, CX + CWD / 2 + 60, t), lerp(24, CY - 22, t), { size: 10, w: 700, col: C.yellow }); c.restore(); }
        if (V.tape && !V.eq && !V.hold) txt(c, 'srand picks where to start', W / 2, 140, { size: 10, col: C.muted2 });
        /* hold + equation */
        if (V.hold) { var hp = V.pullK ? EZ.io(seg(V.pullK.p, .2, .8)) : 1; c.save(); c.globalAlpha = hp; pill(c, C, W / 2, 148 + (1 - hp) * -18, 128, 28, C.purple, .22); txt(c, V.hold, W / 2, 148.5 + (1 - hp) * -18, { size: 14, w: 700, col: C.text }); c.restore(); txt(c, 'rand() gave this', W / 2, 168, { size: 9, col: C.muted2, al: hp }); }
        if (V.eq) { var al = V.calcAl == null ? 1 : V.calcAl; txt(c, V.eq, W / 2, 148, { size: 14, w: 700, col: C.text, al: al }); txt(c, 'squeeze it into a range', W / 2, 168, { size: 9, col: C.muted2, al: al }); }
        /* variable boxes */
        c.fillStyle = C.border2; c.fillRect(8, 238, W - 16, 3);
        [['secret', 0], ['roll', 1]].forEach(function (b) {
          var i = b[1], pp = V.boxPop && V.boxPop.i === i ? V.boxPop.p : 0;
          box(c, C, BX[i], 180, 100, 56, C.accent, 'int', b[0], V.boxes[i], pp, 'sq');
        });
        if (V.drop && V.drop.p > 0 && V.drop.p < 1) { var d = V.drop, e = EZ.in(d.p); token(c, { k: 'sq', x: lerp(W / 2, BX[d.i], EZ.io(d.p)), y: lerp(152, 214, e), r: 11, text: d.v, sx: 1, sy: 1, al: 1 - seg(d.p, .85, 1) }, C); }
      }
    });
  })();
})();
