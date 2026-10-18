/* =====================================================================
   RTSPlay scenes for Phase 6 (prototype)
   =====================================================================
   p6-ref      referee (update) and camera (render) around the Game card (update-render)
   p6-dt       two PCs, 30 and 60 fps, same distance in one second (delta-time)
   p6-states   three state boxes, a token, a sticky note for next_state (next-state)
   p6-aabb     boxes on a plane, x and y shadows, four conditions (aabb)
   p6-label    snprintf into buf, TextOut onto the window (textout)
   Colours come from the palette. Canvas is 400x250.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.RTSPlay) return;
  var U = RTSPlay.util;
  var clamp = U.clamp, lerp = U.lerp, seg = U.seg, EZ = U.EZ, rgba = U.rgba, txt = U.txt, bg = U.bg, pix = U.pix, rrect = U.rrect;
  var W = 400, H = 250;
  function panel(c, x, y, w, h, fill, stroke, lw, dash) {
    c.save(); rrect(c, x, y, w, h, 3); c.fillStyle = fill; c.fill(); c.lineWidth = lw || 1.2; c.strokeStyle = stroke; if (dash) c.setLineDash(dash); c.stroke(); c.restore();
  }
  function pop(p) { return p > 0 && p < 1 ? 1 + .3 * Math.sin(Math.PI * p) : 1; }
  function guy(c, C, x, y, al, hop) {   // little runner, feet at (x, y)
    c.save(); c.globalAlpha *= al == null ? 1 : al; y -= hop || 0;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y + (hop || 0) + 1, 6, 2, 0, 0, 7); c.fill();
    c.fillStyle = C.accentDk; c.fillRect(x - 4, y - 4, 3, 4); c.fillRect(x + 1, y - 4, 3, 4);
    c.fillStyle = C.accent; c.fillRect(x - 6, y - 15, 12, 12); c.fillStyle = C.accentDk; c.fillRect(x - 6, y - 6, 12, 2);
    c.fillStyle = '#fff'; c.fillRect(x, y - 12, 5, 4); c.fillStyle = C.ink; c.fillRect(x + 3, y - 11, 2, 3); c.restore();
  }

  /* =====================================================================
     p6-ref
       game   { }                         the Game card appears (x = 0, paused = 0)
       frame  { n }                       frame strip highlight
       paused { n, to }                   paused flag set for frame n
       ref    { rest:true|false }         referee works / sits out
       upd    { to }                      referee changes x
       snap   { v }                       camera films: screen shows x = v
       ban    { t, k }                    caption at the bottom
     ===================================================================== */
  var REF = ['0001100', '0011110', '0011110', '0001100', '0222220', '2121212', '2121212', '0222220', '0030030', '0030030'];
  RTSPlay.scene('p6-ref', {
    W: W, H: H,
    init: function () { return { card: false, x: 0, pz: 0, f: 0, pf: [0, 0, 0, 0, 0], sx: null, rest: false, ban: null, bk: 'ok' }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'game': S.card = true; break;
        case 'frame': S.f = a.n; break;
        case 'paused': S.pz = a.to; S.pf[a.n - 1] = a.to; break;
        case 'ref': S.rest = !!a.rest; break;
        case 'upd': S.x = a.to; break;
        case 'snap': S.sx = a.v; break;
        case 'ban': S.ban = a.t; S.bk = a.k || 'ok'; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'game': V.cardP = lp; if (lp > 0) V.card = true; break;
        case 'frame': V.fP = lp; if (lp >= .3) V.f = a.n; break;
        case 'paused': V.pzP = lp; if (lp >= .5) { V.pz = a.to; V.pf = S.pf.slice(); V.pf[a.n - 1] = a.to; } break;
        case 'ref': V.restP = lp; if (lp >= .4) V.rest = !!a.rest; break;
        case 'upd': V.updP = lp; if (lp >= .5) V.x = a.to; V.xPop = Math.sin(Math.PI * seg(lp, .4, 1)); break;
        case 'snap': V.snapP = lp; if (lp >= .45) V.sx = a.v; break;
        case 'ban': V.banP = lp; if (lp > 0) { V.ban = a.t; V.bk = a.k || 'ok'; } break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      /* frame strip */
      for (var i = 0; i < 5; i++) {
        var x = 10 + i * 78, on = V.f === i + 1, pz = V.pf[i];
        rrect(c, x, 8, 72, 22, 3); c.fillStyle = pz ? rgba(C.orange, .14) : on ? rgba(C.accent, .14) : rgba(C.text, .04); c.fill();
        c.lineWidth = on ? 1.8 : 1; c.strokeStyle = on ? C.accent : pz ? C.orange : C.border2; c.stroke();
        txt(c, 'frame ' + (i + 1), x + 36, pz ? 15 : 19, { size: 9, w: on ? 700 : 500, col: on ? C.accent : C.muted2 });
        if (pz) txt(c, 'paused', x + 36, 25, { size: 7, col: C.orange });
      }
      /* referee */
      var rest = V.rest, ra = rest ? .45 : 1;
      panel(c, 10, 44, 112, 122, rgba(C.text, .03), C.border2, 1.2);
      var bob = rest || rm ? 0 : Math.sin(T / 300) * 1;
      var sw = V.updP > 0 && V.updP < 1 ? Math.sin(Math.PI * V.updP) * 5 : 0;
      pix(c, REF, 40, 56 + bob - sw * .3, 5, ['', C.text, C.blue, C.orange], ra);
      c.save(); c.globalAlpha *= ra; c.fillStyle = C.yellow; c.fillRect(66 + sw, 70, 6, 3); c.restore();
      if (rest) { var zz = rm ? 0 : T / 500 % 1; txt(c, 'z', 92 + zz * 10, 66 - zz * 10, { size: 10, w: 700, col: C.blue, al: 1 - zz }); txt(c, 'Z', 98, 56, { size: 11, w: 700, col: C.blue }); }
      txt(c, 'update(&g)', 66, 128, { size: 10, w: 700, col: rest ? C.muted : C.accent }); txt(c, rest ? 'off duty' : 'the referee', 66, 141, { size: 8, col: rest ? C.orange : C.muted2 });
      txt(c, rest ? 'skips this frame' : 'changes the game', 66, 153, { size: 8, col: C.muted });
      /* game card */
      var ca = V.card ? (V.cardP != null && V.cardP < 1 ? EZ.out(V.cardP) : 1) : 0;
      if (ca > 0) { c.save(); c.globalAlpha *= ca;
        panel(c, 134, 44, 132, 122, rgba(C.purple, .09), C.purple, 1.4);
        txt(c, 'Game g', 200, 57, { size: 10, w: 700, col: C.purple }); txt(c, '(the truth)', 200, 69, { size: 8, col: C.muted });
        txt(c, 'x', 146, 90, { size: 10, col: C.muted2, align: 'left' });
        var xk = 1 + .35 * (V.xPop || 0); c.save(); c.translate(240, 92); c.scale(xk, xk); txt(c, String(V.x), 0, 0, { size: 22, w: 800, col: C.text, align: 'right' }); c.restore();
        txt(c, 'paused', 146, 132, { size: 10, col: C.muted2, align: 'left' });
        var pk = 1 + .3 * (V.pzP != null && V.pzP < 1 ? Math.sin(Math.PI * V.pzP) : 0); c.save(); c.translate(240, 134); c.scale(pk, pk); txt(c, String(V.pz), 0, 0, { size: 18, w: 800, col: V.pz ? C.orange : C.text, align: 'right' }); c.restore();
        c.restore(); }
      /* arrows referee -> card (changes) and card -> camera (reads) */
      c.strokeStyle = C.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(123, 100); c.lineTo(133, 100); c.stroke();
      if (V.updP > 0 && V.updP < 1) { c.fillStyle = C.accent; c.beginPath(); c.arc(lerp(112, 150, V.updP), 100, 3.5, 0, 7); c.fill(); }
      c.strokeStyle = C.blue; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(267, 100); c.lineTo(281, 100); c.stroke(); c.setLineDash([]);
      /* camera + screen */
      panel(c, 282, 44, 108, 122, rgba(C.text, .03), C.border2, 1.2);
      c.fillStyle = C.blue; c.fillRect(318, 52, 36, 18); c.fillRect(326, 48, 12, 5); c.fillStyle = C.ink; c.beginPath(); c.arc(336, 61, 5, 0, 7); c.fill(); c.fillStyle = C.blue; c.beginPath(); c.arc(336, 61, 3, 0, 7); c.fill();
      rrect(c, 290, 78, 92, 44, 3); c.fillStyle = C.bg; c.fill(); c.strokeStyle = C.muted; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = C.border2; c.fillRect(296, 112, 80, 2);
      if (V.sx == null) txt(c, 'screen: blank', 336, 98, { size: 8, col: C.muted });
      else { c.fillStyle = C.accent; var gx = 298 + V.sx * 1.5; c.fillRect(gx, 100, 12, 12); c.fillStyle = C.ink; c.fillRect(gx + 7, 103, 3, 3); txt(c, 'x = ' + V.sx, 336, 88, { size: 8, col: C.muted2 }); }
      if (V.snapP > 0 && V.snapP < 1) { c.fillStyle = rgba('#ffffff', .55 * Math.sin(Math.PI * V.snapP)); rrect(c, 290, 78, 92, 44, 3); c.fill(); }
      txt(c, 'render(&g)', 336, 138, { size: 10, w: 700, col: C.blue }); txt(c, 'the camera', 336, 151, { size: 8, col: C.muted2 }); txt(c, 'only films', 336, 162, { size: 8, col: C.muted });
      /* banner */
      if (V.ban) txt(c, V.ban, 200, 200, { size: 10, w: 700, col: V.bk === 'warn' ? C.orange : C.accent, al: V.banP != null ? V.banP : 1 });
      txt(c, 'frames run in order, left to right', 200, 232, { size: 8, col: C.muted });
    }
  });

  /* =====================================================================
     p6-dt
       start { i }          lane i is the one running now
       dt    { i }          dt label + frame slices appear
       step  { i, k, x }    k frames done, x position (value)
       ret   { i }          return x
       ban   { t }
     ===================================================================== */
  var LANES = [{ fps: 30, oy: 22, key: 'orange', name: 'OLD PC' }, { fps: 60, oy: 124, key: 'accent', name: 'FAST PC' }];
  RTSPlay.scene('p6-dt', {
    W: W, H: H,
    init: function () { return { l: [{ on: 0, dt: 0, x: 0, k: 0, ret: 0 }, { on: 0, dt: 0, x: 0, k: 0, ret: 0 }], ban: null }; },
    apply: function (S, a) {
      var L = S.l[a.i];
      switch (a.a) {
        case 'start': L.on = 1; break;
        case 'dt': L.dt = 1; break;
        case 'step': L.k = a.k; L.x = a.x; break;
        case 'ret': L.ret = 1; break;
        case 'ban': S.ban = a.t; break;
      }
    },
    tween: function (V, a, lp, S) {
      var L = V.l[a.i];
      switch (a.a) {
        case 'start': L.onP = lp; if (lp > 0) L.on = 1; break;
        case 'dt': L.dtP = lp; if (lp > 0) L.dt = 1; break;
        case 'step': L.k = lerp(S.l[a.i].k, a.k, EZ.lin(lp)); L.x = lerp(S.l[a.i].x, a.x, EZ.lin(lp)); L.run = lp > 0 && lp < 1; L.runP = lp; break;
        case 'ret': L.retP = lp; if (lp > 0) L.ret = 1; break;
        case 'ban': V.banP = lp; if (lp > 0) V.ban = a.t; break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      LANES.forEach(function (ln, i) {
        var L = V.l[i], col = C[ln.key], oy = ln.oy, fps = ln.fps, al = L.on ? 1 : .4;
        c.save(); c.globalAlpha *= al;
        txt(c, ln.name + '  ' + fps + ' fps', 20, oy + 6, { size: 10, w: 700, col: col, align: 'left' });
        if (L.dt) txt(c, 'dt = 1/' + fps + ' s', 200, oy + 6, { size: 9, col: C.muted2, al: L.dtP != null ? L.dtP : 1 });
        c.save(); c.translate(380, oy + 6); var hk = 1 + (L.retP > 0 && L.retP < 1 ? .3 * Math.sin(Math.PI * L.retP) : 0); c.scale(hk, hk);
        txt(c, 'x = ', -44, 0, { size: 9, col: C.muted2, align: 'right' }); txt(c, L.x.toFixed(1), 0, 0, { size: 11, w: 700, col: C.purple, align: 'right' }); c.restore();
        /* frame slices (one second) */
        var sw = 360 / fps;
        for (var j = 0; j < fps; j++) { var done = j < Math.floor(L.k + 1e-6), cur = L.run && j === Math.floor(L.k);
          c.fillStyle = done ? rgba(col, .85) : cur ? C.yellow : rgba(C.text, .08); c.fillRect(20 + j * sw, oy + 20, Math.max(1.5, sw - 1.2), 8); }
        if (L.dt) txt(c, 'one second = ' + fps + ' frames', 20, oy + 38, { size: 8, col: C.muted, align: 'left', al: L.dtP != null ? L.dtP : 1 });
        /* track */
        var gy = oy + 70;
        c.fillStyle = C.border2; c.fillRect(20, gy, 360, 2);
        txt(c, '0', 20, gy + 11, { size: 8, col: C.muted }); txt(c, '120', 380, gy + 11, { size: 8, col: C.muted, align: 'right' });
        for (var q = 1; q <= Math.floor(L.k + 1e-6); q++) { c.fillStyle = rgba(col, .8); c.fillRect(20 + q * sw - .5, gy - 4, 1.5, 6); }
        if (L.x >= 119.95) { c.strokeStyle = col; c.lineWidth = 1; c.setLineDash([2, 2]); c.beginPath(); c.moveTo(380, gy - 20); c.lineTo(380, gy); c.stroke(); c.setLineDash([]); }
        guy(c, C, 20 + L.x * 3, gy - 1, 1, L.run && !rm ? Math.abs(Math.sin(T / 60)) * 2 : 0);
        c.restore();
      });
      if (V.ban) txt(c, V.ban, 200, 232, { size: 10, w: 700, col: C.accent, al: V.banP != null ? V.banP : 1 });
    }
  });

  /* =====================================================================
     p6-states
       frame { n }    frame counter
       nx    { to }   sticky note next_state := to (0 MENU, 1 PLAYING, 2 GAME_OVER)
       spot  { i }    switch looks at state i (null = off)
       say   { t }    printf text rises from the state chip
       swap  { to }   state = next_state (token moves, note slides over)
       ban   { t }
     ===================================================================== */
  var SN = ['MENU', 'PLAYING', 'GAME_OVER'], SBX = function (i) { return 14 + i * 130; };
  RTSPlay.scene('p6-states', {
    W: W, H: H,
    init: function () { return { cur: 0, nx: null, f: 0, spot: null, ban: null }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'frame': S.f = a.n; break;
        case 'nx': S.nx = a.to; break;
        case 'spot': S.spot = a.i == null ? null : a.i; break;
        case 'swap': S.cur = a.to; break;
        case 'ban': S.ban = a.t; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'frame': V.fPop = Math.sin(Math.PI * lp); if (lp >= .4) V.f = a.n; break;
        case 'nx': V.nxPop = Math.sin(Math.PI * lp); if (lp >= .4) V.nx = a.to; break;
        case 'spot': V.spotA = a.i == null ? 1 - lp : lp; if (lp > 0) V.spot = a.i == null ? S.spot : a.i; if (a.i == null && lp >= 1) V.spot = null; break;
        case 'say': V.say = { t: a.t, lp: lp }; break;
        case 'swap': V.swapP = lp; V.swapFrom = S.cur; if (lp >= .5) V.cur = a.to; break;
        case 'ban': V.banP = lp; if (lp > 0) V.ban = a.t; break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      txt(c, 'frame ' + V.f, 14, 16, { size: 11 * (1 + .2 * (V.fPop || 0)), w: 700, col: C.purple, align: 'left' });
      /* arcs with conditions */
      [[0, 1, 'frame == 2'], [1, 2, 'frame == 4']].forEach(function (e) {
        var x0 = SBX(e[0]) + 56, x1 = SBX(e[1]) + 56, on = V.nx === e[1] && V.cur === e[0];
        c.strokeStyle = on ? C.accent : C.border2; c.lineWidth = on ? 2 : 1.4; c.beginPath(); c.moveTo(x0 + 10, 66); c.quadraticCurveTo((x0 + x1) / 2, 28, x1 - 10, 62); c.stroke();
        c.fillStyle = c.strokeStyle; c.beginPath(); c.moveTo(x1 - 10, 66); c.lineTo(x1 - 17, 58); c.lineTo(x1 - 6, 58); c.closePath(); c.fill();
        txt(c, e[2], (x0 + x1) / 2, 36, { size: 8, w: 700, col: on ? C.accent : C.muted2 });
      });
      /* state boxes */
      for (var i = 0; i < 3; i++) {
        var x = SBX(i), on = V.cur === i;
        var sp = V.spot === i ? (V.spotA != null ? V.spotA : 1) : 0;
        if (sp > 0) { c.save(); c.globalAlpha = .5 * sp * (rm ? 1 : .7 + .3 * Math.sin(T / 160)); rrect(c, x - 4, 62, 120, 62, 5); c.lineWidth = 3; c.strokeStyle = C.yellow; c.stroke(); c.restore(); }
        rrect(c, x, 66, 112, 54, 4); c.fillStyle = on ? rgba(C.accent, .14) : rgba(C.text, .04); c.fill(); c.lineWidth = on ? 2 : 1.2; c.strokeStyle = on ? C.accent : C.border2; c.stroke();
        txt(c, SN[i], x + 56, 80, { size: 11, w: 700, col: on ? C.accent : C.muted2 });
        txt(c, 'names[' + i + ']', x + 56, 132, { size: 8, col: C.muted });
      }
      if (V.spot != null && V.spotA > 0) txt(c, 'switch (state)', SBX(V.spot) + 56, 148, { size: 8, w: 700, col: C.yellow, al: V.spotA });
      /* token */
      var tx = SBX(V.cur) + 56, hop = 0;
      if (V.swapP > 0 && V.swapP < 1) { var p = EZ.io(V.swapP); tx = lerp(SBX(V.swapFrom) + 56, SBX(V.swapDest) + 56, p); hop = V.swapFrom === V.swapDest ? 0 : Math.sin(Math.PI * V.swapP) * 14; }
      guy(c, C, tx, 112, 1, hop);
      /* state chip + sticky */
      panel(c, 14, 158, 120, 46, rgba(C.text, .04), C.border2, 1.2);
      txt(c, 'state', 22, 169, { size: 8, col: C.muted2, align: 'left' }); txt(c, SN[V.cur], 74, 189, { size: 12, w: 700, col: C.accent });
      c.save(); c.translate(235, 181); c.rotate(-.03);
      rrect(c, -85, -24, 170, 48, 2); c.fillStyle = rgba(C.yellow, .22); c.fill(); c.strokeStyle = C.yellow; c.lineWidth = 1.3; c.stroke();
      txt(c, 'next_state', -77, -13, { size: 8, col: C.muted2, align: 'left' });
      var nk = 1 + .2 * (V.nxPop || 0);
      c.save(); c.translate(0, 7); c.scale(nk, nk); txt(c, V.nx == null ? '(not set yet)' : SN[V.nx], 0, 0, { size: 12, w: 700, col: V.nx == null ? C.muted : C.text }); c.restore(); c.restore();
      if (V.swapP > 0 && V.swapP < 1) { var q = EZ.io(V.swapP); txt(c, SN[V.swapDest], lerp(235, 74, q), lerp(188, 189, q), { size: 12, w: 700, col: C.yellow, al: 1 - seg(V.swapP, .7, 1) }); }
      if (V.say && V.say.lp > 0 && V.say.lp < 1) { var sq = V.say.lp; txt(c, V.say.t, 74, 156 - 22 * EZ.out(sq), { size: 10, w: 700, col: C.accent, al: 1 - seg(sq, .6, 1) }); }
      if (V.ban) txt(c, V.ban, 200, 228, { size: 10, w: 700, col: C.orange, al: V.banP != null ? V.banP : 1 });
    }
  });
  /* the swap needs the destination while tweening */
  (function () { var d = RTSPlay.SCENES['p6-states'], t0 = d.tween; d.tween = function (V, a, lp, S, C) { if (a.a === 'swap') V.swapDest = a.to; t0(V, a, lp, S, C); }; })();

  /* =====================================================================
     p6-aabb
       declare { b }        box b appears on the plane
       focus   { b }        box b is the one being tested against the player; clears the checks
       cond    { i, r:'yes'|'no'|'skip', t }   condition i (0..3) result
       verdict { v }        overlap() returns v
     ===================================================================== */
  var BOX = { player: [10, 10, 20, 20], corner: [25, 25, 20, 20], touching: [30, 10, 20, 20], far_away: [50, 50, 10, 10], inside: [15, 15, 5, 5] };
  var BCOL = { player: 'accent', corner: 'orange', touching: 'purple', far_away: 'blue', inside: 'yellow' };
  var PU = 2.9, PX0 = 14, PY0 = 26, RX0 = 214;
  var CL = ['a.x < b.x + b.w', 'a.x + a.w > b.x', 'a.y < b.y + b.h', 'a.y + a.h > b.y'];
  RTSPlay.scene('p6-aabb', {
    W: W, H: H,
    init: function () { return { shown: [], focus: null, ch: [null, null, null, null], v: null }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'declare': S.shown.push(a.b); break;
        case 'focus': S.focus = a.b; S.ch = [null, null, null, null]; S.v = null; break;
        case 'cond': S.ch[a.i] = { r: a.r, t: a.t }; break;
        case 'verdict': S.v = a.v; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'declare': V.decl = { b: a.b, p: lp }; if (lp > 0) V.shown.push(a.b); break;
        case 'focus': V.focusP = lp; if (lp > 0) { V.focus = a.b; V.ch = [null, null, null, null]; V.v = null; } break;
        case 'cond': V.condP = V.condP || {}; V.condP[a.i] = lp; if (lp > 0) V.ch[a.i] = { r: a.r, t: a.t }; break;
        case 'verdict': V.vP = lp; if (lp > 0) V.v = a.v; break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      /* plane */
      var s = PU, pw = 60 * s;
      rrect(c, PX0, PY0, pw, pw, 2); c.fillStyle = C.bg; c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1.2; c.stroke();
      c.strokeStyle = rgba(C.text, .07); c.lineWidth = 1;
      for (var g = 10; g < 60; g += 10) { c.beginPath(); c.moveTo(PX0 + g * s, PY0); c.lineTo(PX0 + g * s, PY0 + pw); c.moveTo(PX0, PY0 + g * s); c.lineTo(PX0 + pw, PY0 + g * s); c.stroke(); }
      txt(c, 'x >', PX0, 16, { size: 8, col: C.muted, align: 'left' }); txt(c, '(0,0) top-left, y goes down', PX0 + 174, 16, { size: 8, col: C.muted, align: 'right' });
      V.shown.forEach(function (b) {
        var bx = BOX[b], col = C[BCOL[b]], dim = V.focus && b !== V.focus && b !== 'player' ? .28 : 1, sc = 1;
        if (V.decl && V.decl.b === b && V.decl.p < 1) sc = EZ.back(V.decl.p);
        c.save(); c.globalAlpha *= dim; var cx = PX0 + (bx[0] + bx[2] / 2) * s, cy = PY0 + (bx[1] + bx[3] / 2) * s; c.translate(cx, cy); c.scale(sc, sc);
        c.fillStyle = rgba(col, b === 'player' ? .3 : .26); c.fillRect(-bx[2] * s / 2, -bx[3] * s / 2, bx[2] * s, bx[3] * s); c.lineWidth = V.focus === b || b === 'player' ? 2 : 1.2; c.strokeStyle = col; c.strokeRect(-bx[2] * s / 2, -bx[3] * s / 2, bx[2] * s, bx[3] * s);
        c.restore();
      });
      V.shown.forEach(function (b) { var bx = BOX[b]; if (V.focus && b !== V.focus && b !== 'player') return;
        if (b === 'inside' || b === 'far_away') txt(c, b === 'inside' ? 'inside' : 'far_away', PX0 + (bx[0] + bx[2] / 2) * s, PY0 + (bx[1] + bx[3]) * s + 8, { size: 7, col: C[BCOL[b]] });
        else txt(c, b, PX0 + (bx[0] + bx[2] / 2) * s, PY0 + (bx[1] + bx[3] / 2) * s, { size: 8, w: 700, col: C.text }); });
      /* shadows */
      var f = V.focus, A = BOX.player, B = f ? BOX[f] : null;
      [['x', 'x shadows (on the floor)', 20, 0, 2], ['y', 'y shadows (on the wall)', 76, 1, 3]].forEach(function (st) {
        var ax = st[3], y0 = st[2], i0 = ax === 0 ? 0 : 1, len = ax === 0 ? 2 : 3;
        txt(c, st[1], RX0, y0 - 2, { size: 8, col: C.muted2, align: 'left' });
        c.fillStyle = C.border2; c.fillRect(RX0, y0 + 30, 60 * s, 1.5);
        var rowA = y0 + 8, rowB = y0 + 17;
        c.fillStyle = rgba(C.accent, .75); c.fillRect(RX0 + A[i0] * s, rowA, A[len] * s, 6);
        if (B) { c.fillStyle = rgba(C[BCOL[f]], .8); c.fillRect(RX0 + B[i0] * s, rowB, B[len] * s, 6);
          var lo = Math.max(A[i0], B[i0]), hi = Math.min(A[i0] + A[len], B[i0] + B[len]);
          var c1 = V.ch[ax * 2], c2 = V.ch[ax * 2 + 1];
          if (c1 && c2) { if (c1.r === 'yes' && c2.r === 'yes') { c.fillStyle = rgba(C.accent, .28); c.fillRect(RX0 + lo * s, y0 + 4, (hi - lo) * s, 24); c.strokeStyle = C.accent; c.lineWidth = 1.2; c.strokeRect(RX0 + lo * s + .5, y0 + 4.5, (hi - lo) * s, 23); txt(c, 'overlap', RX0 + (lo + hi) / 2 * s, y0 + 38, { size: 8, w: 700, col: C.accent }); }
            else { var mx = hi < lo ? RX0 + (hi + lo) / 2 * s : RX0 + hi * s; txt(c, hi === lo ? 'edges only touch' : 'no overlap', RX0 + 87, y0 + 38, { size: 8, w: 700, col: C.orange }); } }
        }
      });
      /* conditions */
      for (var k = 0; k < 4; k++) {
        var y = 114 + k * 25, ch = V.ch[k], col = !ch ? C.border2 : ch.r === 'yes' ? C.accent : ch.r === 'no' ? C.orange : C.muted;
        var pp = V.condP && V.condP[k] != null && V.condP[k] < 1 && ch ? EZ.back(V.condP[k]) : 1;
        c.save(); c.translate(RX0 + 87, y + 10); c.scale(pp, pp);
        rrect(c, -87, -10, 174, 20, 3); c.fillStyle = ch ? rgba(col, ch.r === 'skip' ? .05 : .15) : rgba(C.text, .03); c.fill(); c.lineWidth = 1.2; c.strokeStyle = col; c.stroke();
        txt(c, CL[k], -81, .5, { size: 8, col: ch ? C.muted2 : C.muted, align: 'left' });
        if (ch) txt(c, ch.r === 'skip' ? 'skipped' : ch.t + (ch.r === 'yes' ? '  yes' : '  no'), 81, .5, { size: 9, w: 700, col: col, align: 'right' }); c.restore();
      }
      txt(c, '&& stops at the first "no"', RX0 + 87, 224, { size: 8, col: C.muted });
      /* verdict */
      if (f) txt(c, 'overlap(player, ' + f + ')', PX0, 224, { size: 9, col: C.muted2, align: 'left' });
      if (V.v != null) { var vk = V.vP != null && V.vP < 1 ? EZ.back(V.vP) : 1; c.save(); c.translate(PX0 + 130, 240); c.scale(vk, vk);
        txt(c, '= ' + V.v, 0, 0, { size: 14, w: 800, col: V.v ? C.accent : C.orange }); c.restore(); }
    }
  });

  /* =====================================================================
     p6-label
       score { }        score = 12 chip
       win   { }        window appears
       msg   { m }      message chip (null clears)
       hdc   { on }
       cells { }        buf[32] appears
       snp   { }        snprintf fills buf with "Score: 12"
       len   { }        strlen bracket
       draw  { }        TextOut: three inputs light up, text appears in the window
     ===================================================================== */
  var TXT = 'Score: 12';
  RTSPlay.scene('p6-label', {
    W: W, H: H,
    init: function () { return { score: false, win: false, msg: null, hdc: false, cells: false, n: 0, len: false, drawn: false }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'score': S.score = true; break;
        case 'win': S.win = true; break;
        case 'msg': S.msg = a.m || null; break;
        case 'hdc': S.hdc = !!a.on; break;
        case 'cells': S.cells = true; break;
        case 'snp': S.n = 10; break;
        case 'len': S.len = true; break;
        case 'draw': S.drawn = true; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'score': V.scP = lp; if (lp > 0) V.score = true; break;
        case 'win': V.winP = lp; if (lp > 0) V.win = true; break;
        case 'msg': V.msgP = lp; if (lp >= .4) V.msg = a.m || null; break;
        case 'hdc': V.hdcP = a.on ? lp : 1 - lp; V.hdc = a.on || lp < 1; break;
        case 'cells': V.cellP = lp; if (lp > 0) V.cells = true; break;
        case 'snp': V.n = Math.round(lerp(S.n, 10, EZ.lin(lp))); V.snpP = lp; break;
        case 'len': V.lenP = lp; if (lp > 0) V.len = true; break;
        case 'draw': V.drawP = lp; if (lp > .6) V.drawn = true; break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      if (V.score) { var k = pop(V.scP); c.save(); c.translate(64, 20); c.scale(k, k); rrect(c, -50, -11, 100, 22, 3); c.fillStyle = rgba(C.purple, .14); c.fill(); c.strokeStyle = C.purple; c.lineWidth = 1.2; c.stroke();
        txt(c, 'score = 12', 0, .5, { size: 10, w: 700, col: C.purple }); c.restore(); }
      if (V.msg) { c.save(); c.globalAlpha *= V.msgP != null && V.msgP < .4 ? 1 : 1; rrect(c, 250, 9, 136, 22, 3); c.fillStyle = rgba(C.accent, .14); c.fill(); c.strokeStyle = C.accent; c.lineWidth = 1.2; c.stroke(); txt(c, V.msg, 318, 20.5, { size: 9, w: 700, col: C.accent }); c.restore(); }
      /* buf */
      if (V.cells) { var ca = V.cellP != null ? V.cellP : 1;
        txt(c, 'char buf[32]', 14, 46, { size: 8, w: 700, col: C.muted2, align: 'left', al: ca });
        for (var i = 0; i < 32; i++) {
          var x = 14 + i * 11.6, has = i < V.n, term = i === 9 && V.n >= 10;
          c.save(); c.globalAlpha *= ca; rrect(c, x, 52, 10.6, 20, 2); c.fillStyle = has ? rgba(term ? C.muted : C.accent, .16) : rgba(C.text, .04); c.fill(); c.lineWidth = 1; c.strokeStyle = has ? (term ? C.muted : C.accent) : C.border2; c.stroke();
          if (has) txt(c, term ? '\\0' : TXT[i], x + 5.3, 62.5, { size: term ? 7 : 10, w: 700, col: term ? C.muted : C.text }); c.restore();
        }
        if (V.len) { var lp = V.lenP != null ? V.lenP : 1; c.save(); c.strokeStyle = C.yellow; c.lineWidth = 1.5; c.beginPath(); c.moveTo(14, 78); c.lineTo(14, 82); c.lineTo(14 + 9 * 11.6 * lp - 1, 82); c.lineTo(14 + 9 * 11.6 * lp - 1, 78); c.stroke();
          txt(c, 'strlen(buf) = 9', 14 + 4.5 * 11.6, 92, { size: 9, w: 700, col: C.yellow, al: lp }); c.restore(); }
      }
      /* window */
      if (V.win) { var wp = V.winP != null && V.winP < 1 ? V.winP : 1;
        winFrame(c, C, 14, 108, 244, 124, 'Score', wp);
        var cx = 16, cy = 126;
        if (V.drawn || (V.drawP > 0)) { var dp = V.drawn && !(V.drawP > 0 && V.drawP < 1) ? 1 : V.drawP;
          c.save(); c.strokeStyle = C.orange; c.setLineDash([2, 2]); c.lineWidth = 1; c.globalAlpha *= Math.min(1, dp * 2);
          c.beginPath(); c.moveTo(cx, cy + 10); c.lineTo(cx + 10, cy + 10); c.moveTo(cx + 10, cy); c.lineTo(cx + 10, cy + 10); c.stroke(); c.setLineDash([]);
          txt(c, '10', cx + 5, cy + 22, { size: 7, col: C.orange }); txt(c, '10', cx + 20, cy + 4, { size: 7, col: C.orange }); c.restore();
          txt(c, TXT, cx + 10, cy + 10 + 6, { size: 12, w: 700, col: C.text, align: 'left', al: V.drawn && !(V.drawP > 0 && V.drawP < 1) ? 1 : seg(V.drawP, .4, 1) }); }
        if (V.hdc) chip(c, C, 200, 213, 54, 14, 'hdc', C.blue, V.hdcP != null ? V.hdcP : 1);
      }
      /* label printer */
      panel(c, 270, 108, 120, 124, rgba(C.text, .03), C.border2, 1.2);
      txt(c, 'TextOut', 330, 121, { size: 10, w: 700, col: C.accent }); txt(c, 'the label printer', 330, 133, { size: 8, col: C.muted });
      var dp2 = V.drawP > 0 && V.drawP < 1 ? V.drawP : (V.drawn ? 1 : 0);
      [['hdc', 'where: the window'], ['10, 10', 'how far across, down'], ['buf, 9', 'the words + count']].forEach(function (r, i) {
        var y = 152 + i * 26, lit = dp2 > i * .25 && dp2 > 0;
        rrect(c, 278, y - 10, 104, 22, 3); c.fillStyle = lit ? rgba(C.accent, .16) : rgba(C.text, .04); c.fill(); c.strokeStyle = lit ? C.accent : C.border2; c.lineWidth = 1.1; c.stroke();
        txt(c, r[0], 286, y - 2, { size: 9, w: 700, col: lit ? C.accent : C.muted2, align: 'left' }); txt(c, r[1], 286, y + 7, { size: 7, col: C.muted, align: 'left' });
      });
    }
  });
  function winFrame(c, C, x, y, w, h, title, al) {
    c.save(); c.globalAlpha *= al == null ? 1 : al;
    rrect(c, x, y, w, h, 3); c.fillStyle = C.border2; c.fill(); c.fillStyle = C.bg; c.fillRect(x + 2, y + 18, w - 4, h - 20);
    txt(c, title, x + 8, y + 9, { size: 8, col: C.text, align: 'left' });
    c.fillStyle = C.muted; c.fillRect(x + w - 34, y + 6, 6, 6); c.fillRect(x + w - 24, y + 6, 6, 6); c.fillStyle = C.orange; c.fillRect(x + w - 14, y + 6, 6, 6);
    c.lineWidth = 1.2; c.strokeStyle = C.muted; rrect(c, x, y, w, h, 3); c.stroke(); c.restore();
  }
  function chip(c, C, x, y, w, h, label, col, al) {
    c.save(); c.globalAlpha *= al == null ? 1 : al; rrect(c, x, y, w, h, 3); c.fillStyle = rgba(col, .16); c.fill(); c.lineWidth = 1; c.strokeStyle = rgba(col, .8); c.stroke();
    txt(c, label, x + w / 2, y + h / 2 + .5, { size: 8, w: 700, col: col }); c.restore();
  }
})();
