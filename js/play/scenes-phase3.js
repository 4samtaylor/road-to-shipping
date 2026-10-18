/* =====================================================================
   RTSPlay phase 3 scenes: functions, scope, prototypes, #define, arrays, strings,
   fgets, strcmp, 2D grids, files.  Canvas is 400x250 for all of them.
   Every action is { a:'<name>', ...params, at?, len? }.  Colours are palette tokens.

   p3-rooms     (functions, scope)  two rooms side by side: main and a function (a vending machine or a room)
     room  { i:0|1, on:true|false, name, sig, kind:'room'|'machine' }  show / hide a room (hiding wipes its variables)
     var   { i, n:'score', t:'int', v:'10', copy?:true }  create or change a variable card in room i
     clear { i }                         every variable in room i vanishes (function finished)
     tray  { i, v }                      machine's OUT tray shows v (v:null empties it)
     lit   { i }                         room i is the active one (i:-1 none)
     fly   { from:[i,'name'|'@tray'], to:[j,'name'|'@tray',row?], v:'10', copy?:true }   a sheet of paper flies between rooms
     cap   { t }                         caption line at the bottom

   p3-contents  (prototypes)  a contents page (prototypes), main, and the chapters (function bodies) lower in the file
     entry { i }  match { i }  body { i }  main { t }  look { i }  call { i, t }  ret { i, v }  cap { t }

   p3-define    (#define)  sticky notes, the preprocessor swapping names for numbers, a loop counted by pips
     note { k }  swap { k }  lives { v }  loop { i, done, chk, r }

   p3-lockers   (arrays, strings, fgets)  a row of numbered lockers with a cursor
     make { name, kind:'int'|'char', cells:[..], tail? }   set { i, v }   cur { i, from?, name, mark? }
     span { s0, b, t }  (s0:null clears)   tag { k, v }   read { i }   stdin { t:[chars] }   scoop { vals:[..] }   cap { t }

   p3-cmp       (strcmp)  two words as letter tiles with a comparing cursor
     words { a1, b, la, lb }  cmp { to }  res { v, w, col }  ans { t, r }

   p3-grid      (2D arrays)  a 3x5 tile map with a row/col cursor
     frame {}  row { r, s }  set { r, c, ch }  cur { r, c, from?, mark? }  fm { t }

   p3-save      (files)  a notebook in a drawer: open, write, close, read it back
     f { v }  open { mode:'w'|'r' }  chk { t, r }  write { t }  close {}  fread { t }  best { v }
   ===================================================================== */
(function () {
  'use strict';
  if (!window.RTSPlay) return;
  var U = RTSPlay.util;
  var clamp = U.clamp, lerp = U.lerp, seg = U.seg, EZ = U.EZ, rgba = U.rgba, txt = U.txt, bg = U.bg, pix = U.pix, rrect = U.rrect;
  var W = 400, H = 250;
  var INK = '#04040a';
  var inst = function (lp) { return lp >= 0.05; };     // "instant" actions flip just after the step starts

  /* a sheet of paper with a folded corner, centred on x,y */
  function paper(c, C, x, y, w, h, text, o) {
    o = o || {};
    c.save(); c.globalAlpha *= (o.al == null ? 1 : o.al); c.translate(x, y); if (o.s) c.scale(o.s, o.s);
    if (o.copy) { rrect(c, -w / 2 + 5, -h / 2 + 5, w, h, 3); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1; c.stroke(); }
    rrect(c, -w / 2, -h / 2, w, h, 3); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = o.col || C.accent; c.lineWidth = 1.5; c.stroke();
    c.beginPath(); c.moveTo(w / 2 - 7, -h / 2); c.lineTo(w / 2, -h / 2 + 7); c.lineTo(w / 2 - 7, -h / 2 + 7); c.closePath(); c.fillStyle = rgba(o.col || C.accent, 0.4); c.fill();
    txt(c, text, -1, 1, { size: o.size || 12, w: 700, col: C.text });
    c.restore();
  }
  function tick(c, x, y, s, col) { c.save(); c.strokeStyle = col; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 4 * s, y); c.lineTo(x - 1 * s, y + 3 * s); c.lineTo(x + 5 * s, y - 4 * s); c.stroke(); c.restore(); }
  function arrow(c, x1, y1, x2, y2, col, dash) {
    c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.5; if (dash) c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]);
    var a = Math.atan2(y2 - y1, x2 - x1); c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 7 * Math.cos(a - 0.4), y2 - 7 * Math.sin(a - 0.4)); c.lineTo(x2 - 7 * Math.cos(a + 0.4), y2 - 7 * Math.sin(a + 0.4)); c.closePath(); c.fill(); c.restore();
  }
  function badge(c, C, x, y, word, col, k) {
    c.save(); c.translate(x, y); c.scale(k == null ? 1 : k, k == null ? 1 : k); var w = word.length * 6.4 + 14;
    rrect(c, -w / 2, -8, w, 16, 3); c.fillStyle = rgba(col, 0.16); c.fill(); c.strokeStyle = rgba(col, 0.6); c.lineWidth = 1; c.stroke();
    txt(c, word, 0, 0.5, { size: 10, w: 700, col: col }); c.restore();
  }
  function capDraw(c, C, t, a) { if (t) txt(c, t, W / 2, 234, { size: 10, w: 700, col: C.accent, al: a == null ? 1 : a }); }

  /* ===================== p3-rooms ===================== */
  (function () {
    var RY = 22, RH = 190, RX = [10, 225], RW = 165;
    var rowTop = function (r) { return RY + 50 + r * 36; };
    function anchor(S, p) {
      var i = p[0];
      if (p[1] === '@tray') return [RX[i] + RW / 2, RY + RH - 23];
      var R = S.rooms[i], r = p[2];
      if (r == null) { r = R.vars.findIndex(function (v) { return v.n === p[1]; }); if (r < 0) r = R.vars.length; }
      return [RX[i] + RW / 2, rowTop(r) + 16];
    }
    function blank() { return { vis: false, name: '', sig: '', kind: 'room', vars: [], tray: null }; }
    RTSPlay.scene('p3-rooms', {
      W: W, H: H,
      init: function () { return { rooms: [blank(), blank()], lit: -1, cap: '' }; },
      apply: function (S, a) {
        var R = S.rooms[a.i];
        switch (a.a) {
          case 'room': R.vis = a.on !== false; if (R.vis) { R.name = a.name; R.sig = a.sig || ''; R.kind = a.kind || 'room'; } else { R.vars = []; R.tray = null; } break;
          case 'var': { var v = R.vars.find(function (x) { return x.n === a.n; });
            if (v) { v.v = a.v; } else R.vars.push({ n: a.n, t: a.t || 'int', v: a.v, copy: !!a.copy }); break; }
          case 'clear': R.vars = []; break;
          case 'tray': R.tray = a.v; break;
          case 'lit': S.lit = a.i; break;
          case 'cap': S.cap = a.t; break;
        }
      },
      tween: function (V, a, lp, S) {
        var R = a.i != null ? V.rooms[a.i] : null;
        switch (a.a) {
          case 'room':
            if (a.on !== false) { R.vis = true; R.name = a.name; R.sig = a.sig || ''; R.kind = a.kind || 'room'; R.k = EZ.back(lp); }
            else R.fade = 1 - lp;
            break;
          case 'var': {
            var v = R.vars.find(function (x) { return x.n === a.n; });
            if (v) { if (lp >= 0.5) v.v = a.v; v.pop = Math.sin(Math.PI * seg(lp, 0.5, 1)); }
            else R.vars.push({ n: a.n, t: a.t || 'int', v: a.v, copy: !!a.copy, grow: EZ.back(lp) });
            break; }
          case 'clear': R.varsA = 1 - lp; break;
          case 'tray': if (lp >= 0.5) R.tray = a.v; R.trayPop = Math.sin(Math.PI * seg(lp, 0.5, 1)); break;
          case 'lit': if (inst(lp)) V.lit = a.i; break;
          case 'cap': if (inst(lp)) { V.cap = a.t; V.capA = seg(lp, 0.05, 0.4); } break;
          case 'fly': {
            if (lp <= 0 || lp >= 1) break;
            var p = anchor(S, a.from), q = anchor(S, a.to), e = EZ.io(lp);
            (V.fl = V.fl || []).push({ x: lerp(p[0], q[0], e), y: lerp(p[1], q[1], e) - 26 * Math.sin(Math.PI * e), v: a.v, copy: !!a.copy, al: 1 - seg(lp, 0.9, 1) });
            break; }
        }
      },
      draw: function (c, V, T, C) {
        bg(c, C, W, H);
        V.rooms.forEach(function (R, i) {
          if (!R.vis) return;
          var k = R.k == null ? 1 : R.k, lit = V.lit === i, al = (R.fade == null ? 1 : R.fade) * (V.lit >= 0 && !lit ? 0.6 : 1);
          var cx = RX[i] + RW / 2, cy = RY + RH / 2, mach = R.kind === 'machine';
          c.save(); c.globalAlpha = Math.max(0, al); c.translate(cx, cy); c.scale(Math.max(k, 0), Math.max(k, 0)); c.translate(-cx, -cy);
          rrect(c, RX[i], RY, RW, RH, 8); c.fillStyle = C.surface2; c.fill(); c.lineWidth = lit ? 2.5 : 1.5; c.strokeStyle = lit ? C.accent : C.border2; c.stroke();
          if (mach) { rrect(c, RX[i] + 1, RY + 1, RW - 2, 38, 7); c.fillStyle = rgba(C.accent, 0.16); c.fill(); }
          txt(c, R.name, cx, RY + 15, { size: 12, w: 700, col: lit ? C.accent : C.text });
          if (R.sig) txt(c, R.sig, cx, RY + 29, { size: 8, col: C.muted2 });
          if (mach) {
            c.fillStyle = INK; rrect(c, cx - 30, RY + 41, 60, 5, 2); c.fill();
            rrect(c, RX[i] + 14, RY + RH - 40, RW - 28, 32, 4); c.fillStyle = 'rgba(4,4,10,.45)'; c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1; c.stroke();
            txt(c, 'OUT', RX[i] + 22, RY + RH - 32, { size: 7, col: C.muted, align: 'left' });
            if (R.tray != null) { var tp = R.trayPop ? 1 + 0.25 * R.trayPop : 1; paper(c, C, cx, RY + RH - 22, 44, 22, String(R.tray), { col: C.orange, s: tp }); }
          } else {
            c.save(); c.strokeStyle = C.border2; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(RX[i] + 12, RY + RH - 12); c.lineTo(RX[i] + RW - 12, RY + RH - 12); c.stroke(); c.restore();
          }
          c.save(); if (R.varsA != null) c.globalAlpha *= Math.max(0, R.varsA);
          R.vars.forEach(function (v, r) {
            var g = v.grow == null ? 1 : v.grow, pp = 1 + 0.12 * (v.pop || 0), x = RX[i] + 10, y = rowTop(r), w = RW - 20, h = 32;
            c.save(); c.translate(x + w / 2, y + h / 2); c.scale(Math.max(g, 0) * pp, Math.max(g, 0) * pp); c.translate(-w / 2, -h / 2);
            rrect(c, 0, 0, w, h, 5); c.fillStyle = rgba(C.accent, 0.13); c.fill(); c.strokeStyle = rgba(C.accent, 0.7); c.lineWidth = 1.5; c.stroke();
            txt(c, v.t, 8, v.copy ? 10 : 16, { size: 8, col: C.muted, align: 'left' });
            txt(c, v.n, 32, v.copy ? 10 : 16, { size: 11, w: 600, col: C.text, align: 'left' });
            if (v.copy) txt(c, 'a copy', 8, 24, { size: 7, w: 700, col: C.orange, align: 'left' });
            txt(c, v.v == null ? '?' : String(v.v), w - 10, 17, { size: 15, w: 700, col: v.v == null ? C.muted : C.text, align: 'right' });
            c.restore();
          });
          c.restore(); c.restore();
        });
        (V.fl || []).forEach(function (f) { paper(c, C, f.x, f.y, 44, 24, String(f.v), { copy: f.copy, al: f.al, col: C.purple }); });
        capDraw(c, C, V.cap, V.capA);
      }
    });
  })();

  /* ===================== p3-contents ===================== */
  (function () {
    var ENT = ['void print_menu(void);', 'int square(int n);'];
    var CH = [{ name: 'print_menu', body: 'printf("1 Play  2 Quit\\n");' }, { name: 'square', body: 'return n * n;' }];
    var CX = [10, 214], CW = 176, CY = 150, CHH = 66;
    var entY = function (i) { return 66 + i * 24; };
    RTSPlay.scene('p3-contents', {
      W: W, H: H,
      init: function () { return { ent: [0, 0], body: [0, 0], match: [0, 0], lit: -1, mainT: '', got: '', cap: '' }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'entry': S.ent[a.i] = 1; break;
          case 'match': S.match[a.i] = 1; break;
          case 'body': S.body[a.i] = 1; break;
          case 'main': S.mainT = a.t; S.got = ''; S.lit = -1; break;
          case 'call': S.lit = a.i; break;
          case 'ret': S.lit = -1; S.got = a.v == null ? 'nothing' : a.v; break;
          case 'cap': S.cap = a.t; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'entry': V.entR = V.entR || [1, 1]; V.entR[a.i] = seg(lp, 0, 0.8); if (lp <= 0) V.ent[a.i] = 0; else V.ent[a.i] = 1; break;
          case 'body': V.bodyR = V.bodyR || [1, 1]; V.bodyR[a.i] = seg(lp, 0, 0.8); V.body[a.i] = lp > 0 ? 1 : 0; break;
          case 'match': V.matchK = V.matchK || [1, 1]; V.matchK[a.i] = EZ.back(seg(lp, 0.2, 0.8)); V.match[a.i] = lp > 0 ? 1 : 0; break;
          case 'main': if (inst(lp)) { V.mainT = a.t; V.got = ''; V.lit = -1; } break;
          case 'look': if (lp > 0 && lp < 1) V.look = { i: a.i, lp: lp }; break;
          case 'call': if (inst(lp) && lp > 0.4) V.lit = a.i;
            if (lp > 0 && lp < 1) { var e = EZ.io(lp); V.fl = { x: lerp(302, CX[a.i] + CW / 2, e), y: lerp(122, CY - 2, e), t: a.t || '( )', al: 1 - seg(lp, 0.9, 1) }; } break;
          case 'ret': if (lp > 0.5) { V.lit = -1; V.got = a.v == null ? 'nothing' : a.v; }
            if (lp > 0 && lp < 1) { var e2 = EZ.io(lp); V.fl = { x: lerp(CX[a.i] + CW / 2, 302, e2), y: lerp(CY - 2, 122, e2), t: a.v == null ? 'void' : a.v, al: 1 - seg(lp, 0.9, 1), ret: 1 }; } break;
          case 'cap': if (inst(lp)) { V.cap = a.t; V.capA = seg(lp, 0.05, 0.4); } break;
        }
      },
      draw: function (c, V, T, C) {
        bg(c, C, W, H);
        /* contents page */
        rrect(c, 10, 26, 176, 100, 6); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1.5; c.stroke();
        txt(c, 'CONTENTS', 22, 40, { size: 10, w: 700, col: C.yellow, align: 'left' });
        txt(c, 'the prototypes', 22, 52, { size: 7, col: C.muted, align: 'left' });
        ENT.forEach(function (s, i) {
          var y = entY(i) + 12, r = V.entR ? V.entR[i] : 1, shown = V.ent[i];
          c.save(); c.setLineDash([2, 3]); c.strokeStyle = C.border2; c.beginPath(); c.moveTo(20, y + 8); c.lineTo(176, y + 8); c.stroke(); c.restore();
          if (shown) { var str = s.slice(0, Math.ceil(s.length * clamp(r))); txt(c, str, 20, y, { size: 8.5, w: 600, col: C.text, align: 'left' });
            if (V.match[i]) { var k = V.matchK ? V.matchK[i] : 1; c.save(); c.translate(0, 0); tick(c, 172, y + 20, Math.max(k, 0) * 0.9, C.accent); c.restore(); } }
        });
        /* main */
        rrect(c, 214, 26, 176, 100, 6); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.accent; c.lineWidth = 1.5; c.stroke();
        txt(c, 'main', 226, 40, { size: 11, w: 700, col: C.accent, align: 'left' });
        txt(c, 'comes first in the file', 226, 52, { size: 7, col: C.muted, align: 'left' });
        if (V.mainT) { rrect(c, 224, 62, 156, 26, 4); c.fillStyle = rgba(C.accent, 0.12); c.fill(); txt(c, V.mainT, 232, 75, { size: 9, w: 600, col: C.text, align: 'left' }); }
        if (V.got) { txt(c, 'got back:', 226, 106, { size: 8, col: C.muted2, align: 'left' }); txt(c, V.got, 380, 106, { size: V.got === 'nothing' ? 9 : 15, w: 700, col: V.got === 'nothing' ? C.muted2 : C.orange, align: 'right' }); }
        /* chapters */
        txt(c, 'further down the file: the real functions', 10, 140, { size: 8, col: C.muted, align: 'left' });
        CH.forEach(function (ch, i) {
          var x = CX[i], lit = V.lit === i, shown = V.body[i], r = V.bodyR ? V.bodyR[i] : 1;
          rrect(c, x, CY, CW, CHH, 6);
          if (shown) { c.fillStyle = C.surface2; c.fill(); c.strokeStyle = lit ? C.accent : C.border2; c.lineWidth = lit ? 2.5 : 1.5; c.stroke(); }
          else { c.save(); c.setLineDash([4, 4]); c.strokeStyle = C.border2; c.lineWidth = 1.5; c.stroke(); c.restore(); }
          txt(c, ch.name, x + 12, CY + 14, { size: 10, w: 700, col: shown ? (lit ? C.accent : C.text) : C.muted, align: 'left' });
          if (shown) { var bstr = ch.body.slice(0, Math.ceil(ch.body.length * clamp(r)));
            rrect(c, x + 8, CY + 28, CW - 16, 26, 4); c.fillStyle = rgba(C.accent, 0.1); c.fill();
            txt(c, bstr, x + 14, CY + 41, { size: 8, w: 600, col: C.text, align: 'left' });
            if (V.match[i]) { var k2 = V.matchK ? V.matchK[i] : 1; tick(c, x + CW - 14, CY + 14, Math.max(k2, 0), C.accent); } }
          else txt(c, 'not read yet', x + CW / 2, CY + 40, { size: 8, col: C.muted });
        });
        /* compiler peeks at contents */
        if (V.look) { var L = V.look, p = L.lp, y2 = entY(L.i) + 12;
          c.save(); c.globalAlpha = Math.sin(Math.PI * p); arrow(c, 214, 74, 190 + 4, y2, C.yellow, true);
          txt(c, 'known!', 200, y2 - 11 + (L.i ? 6 : 0), { size: 8, w: 700, col: C.yellow }); c.restore(); }
        if (V.fl) paper(c, C, V.fl.x, V.fl.y, 44, 22, String(V.fl.t), { col: V.fl.ret ? C.orange : C.purple, al: V.fl.al, size: 11 });
        capDraw(c, C, V.cap, V.capA);
      }
    });
  })();

  /* ===================== p3-define ===================== */
  (function () {
    var NOTES = [{ w: 'MAX_SCORES', n: '5' }, { w: 'START_LIVES', n: '3' }];
    var STRIPS = [{ pre: 'int lives = ', w: 'START_LIVES', post: ';', n: '3', note: 1 }, { pre: 'for (...; i < ', w: 'MAX_SCORES', post: '; ...)', n: '5', note: 0 }];
    var SY = [70, 106];
    RTSPlay.scene('p3-define', {
      W: W, H: H,
      init: function () { return { notes: [0, 0], sw: [0, 0], lives: null, loop: null }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'note': S.notes[a.k] = 1; break;
          case 'swap': S.sw[a.k] = 1; break;
          case 'lives': S.lives = a.v; break;
          case 'loop': S.loop = { i: a.i, done: a.done, chk: a.chk || null, r: a.r }; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'note': V.noteK = V.noteK || [1, 1]; V.noteK[a.k] = EZ.back(lp); V.notes[a.k] = lp > 0 ? 1 : 0; break;
          case 'swap': V.swK = V.swK || {}; V.swK[a.k] = lp; V.sw[a.k] = lp > 0 ? 1 : 0; break;
          case 'lives': if (lp >= 0.3) V.lives = a.v; V.livesPop = lp >= 0.3 ? Math.sin(Math.PI * seg(lp, 0.3, 1)) : 0; break;
          case 'loop': if (inst(lp)) { V.loop = { i: a.i, done: a.done, chk: a.chk || null, r: a.r }; V.loopK = EZ.back(seg(lp, 0.05, 0.6)); } break;
        }
      },
      draw: function (c, V, T, C) {
        bg(c, C, W, H);
        /* sticky notes */
        NOTES.forEach(function (nt, k) {
          if (!V.notes[k]) return; var kk = V.noteK ? V.noteK[k] : 1, x = 10 + k * 197, cx = x + 93, cy = 30;
          c.save(); c.translate(cx, cy); c.scale(Math.max(kk, 0), Math.max(kk, 0)); c.rotate(k ? 0.02 : -0.02);
          rrect(c, -93, -17, 186, 34, 3); c.fillStyle = rgba(C.yellow, 0.22); c.fill(); c.strokeStyle = rgba(C.yellow, 0.8); c.lineWidth = 1.5; c.stroke();
          txt(c, nt.w + '  =  ' + nt.n, 0, 1, { size: 11, w: 700, col: C.text }); c.restore();
        });
        txt(c, 'what the compiler sees after find-and-replace', 20, 56, { size: 8, col: C.muted, align: 'left' });
        STRIPS.forEach(function (s, k) {
          if (!V.sw[k]) return; var p = V.swK ? V.swK[k] : 1, flip = p >= 0.55, y = SY[k] + 12;
          var word = flip ? s.n : s.w, a0 = clamp(p / 0.2);
          c.save(); c.globalAlpha = a0; rrect(c, 20, y - 14, 250, 28, 5); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1.5; c.stroke();
          var sz = 12; c.font = '500 ' + sz + 'px ' + U.FONT; var w1 = c.measureText(s.pre).width, w2 = c.measureText(word).width, w3 = c.measureText(s.post).width;
          var x0 = 20 + 125 - (w1 + w2 + w3) / 2;
          txt(c, s.pre, x0, y + 1, { size: sz, col: C.muted2, align: 'left' });
          var pulse = p > 0.4 && p < 0.8 ? 1 + 0.2 * Math.sin(Math.PI * seg(p, 0.4, 0.8)) : 1;
          c.save(); c.translate(x0 + w1 + w2 / 2, y + 1); c.scale(pulse, pulse);
          if (flip) { rrect(c, -w2 / 2 - 3, -10, w2 + 6, 20, 3); c.fillStyle = rgba(C.accent, 0.25); c.fill(); }
          txt(c, word, 0, 0, { size: sz, w: 700, col: flip ? C.accent : C.yellow }); c.restore();
          txt(c, s.post, x0 + w1 + w2, y + 1, { size: sz, col: C.muted2, align: 'left' });
          c.restore();
        });
        if (V.lives != null) { var lp2 = V.livesPop ? 1 + 0.25 * V.livesPop : 1;
          c.save(); c.translate(335, 82); c.scale(lp2, lp2); rrect(c, -50, -16, 100, 32, 5); c.fillStyle = rgba(C.orange, 0.14); c.fill(); c.strokeStyle = rgba(C.orange, 0.7); c.lineWidth = 1.5; c.stroke();
          txt(c, 'lives', -42, 0, { size: 9, col: C.muted2, align: 'left' }); txt(c, String(V.lives), 40, 1, { size: 17, w: 700, col: C.text, align: 'right' }); c.restore(); }
        /* loop pips */
        var L = V.loop;
        c.save(); c.strokeStyle = C.border2; c.setLineDash([3, 5]); c.beginPath(); c.moveTo(10, 146); c.lineTo(W - 10, 146); c.stroke(); c.restore();
        txt(c, 'the loop', W - 12, 156, { size: 8, col: C.muted, align: 'right' });
        for (var q = 0; q < 5; q++) {
          var px = 60 + q * 58, py = 176, on = L && q < L.done, fresh = L && q === L.done - 1 && V.loopK != null ? clamp(V.loopK) : 1;
          c.save(); c.translate(px + 24, py + 15); c.scale(on ? fresh : 1, on ? fresh : 1);
          rrect(c, -24, -15, 48, 30, 5);
          if (on) { c.fillStyle = rgba(C.accent, 0.25); c.fill(); c.strokeStyle = C.accent; } else { c.fillStyle = rgba(C.border2, 0.35); c.fill(); c.strokeStyle = C.border2; }
          c.lineWidth = 1.5; c.stroke(); txt(c, 'Slot ' + q, 0, 1, { size: 9, w: 700, col: on ? C.text : C.muted }); c.restore();
        }
        if (L && L.i != null) { var mi = Math.min(L.i, 5), mx = 60 + mi * 58 + 24;
          arrow(c, mx, 222, mx, 213, L.i > 4 ? C.orange : C.purple); txt(c, 'i = ' + L.i, mx, 234, { size: 10, w: 700, col: L.i > 4 ? C.orange : C.purple }); }
        if (L && L.chk) { txt(c, L.chk, 150, 133, { size: 11, w: 700, col: C.text }); badge(c, C, 240, 133, L.r ? 'true' : 'false', L.r ? C.accent : C.orange, 1); }
      }
    });
  })();

  /* ===================== p3-lockers ===================== */
  (function () {
    var LY = 98, LH = 72;
    function geom(n, tail) { var cw = Math.min(64, Math.floor((tail ? 330 : 368) / Math.max(n, 1))), total = n * cw + (tail ? 46 : 0); return { cw: cw, x0: Math.round((W - total) / 2) }; }
    function octa(c, x, y, r) { c.beginPath(); for (var k = 0; k < 8; k++) { var a = Math.PI / 8 + k * Math.PI / 4; c[k ? 'lineTo' : 'moveTo'](x + r * Math.cos(a), y + r * Math.sin(a)); } c.closePath(); }
    var isStop = function (v) { return v === '\\0'; };
    RTSPlay.scene('p3-lockers', {
      W: W, H: H,
      init: function () { return { name: '', kind: 'int', cells: [], tail: null, cur: null, mark: null, span: null, tags: {}, stdin: [], sin: 0, cap: '' }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'make': S.name = a.name; S.kind = a.kind || 'int'; S.cells = a.cells.slice(); S.tail = a.tail || null; S.cur = null; S.mark = null; S.span = null; break;
          case 'set': S.cells[a.i] = a.v; S.mark = null; break;
          case 'cur': S.cur = a.i == null ? null : { i: a.i, name: a.name || '' }; S.mark = a.mark ? [a.from == null ? a.i : a.from, a.i] : null; break;
          case 'span': S.span = a.s0 == null ? null : { a: a.s0, b: a.b, t: a.t }; S.mark = null; break;
          case 'tag': if (a.v == null) delete S.tags[a.k]; else S.tags[a.k] = a.v; break;
          case 'stdin': S.stdin = a.t.slice(); S.sin = 1; break;
          case 'scoop': a.vals.forEach(function (v, j) { S.cells[j] = v; }); S.stdin = []; break;
          case 'cap': S.cap = a.t; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'make': V.name = a.name; V.kind = a.kind || 'int'; V.cells = a.cells.slice(); V.tail = a.tail || null; V.grow = a.cells.map(function (_, i) { return EZ.back(seg(lp, i * 0.07, i * 0.07 + 0.4)); }); V.cur = null; V.mark = null; V.span = null; break;
          case 'set': if (lp >= 0.5) V.cells[a.i] = a.v; V.pop = { i: a.i, k: Math.sin(Math.PI * seg(lp, 0.4, 1)) }; if (inst(lp)) V.mark = null; break;
          case 'cur': {
            if (a.i == null) { if (S.cur) V.curA = 1 - lp; if (lp >= 1) V.cur = null; break; }
            var from = a.from != null ? a.from : (S.cur ? S.cur.i : a.i), e = a.from != null ? lp : EZ.io(lp), x = lerp(from, a.i, e);
            V.cur = { i: x, name: a.name || '' }; V.curA = S.cur || a.from != null ? 1 : seg(lp, 0, 0.4);
            V.mark = a.mark ? [from, x] : null; break; }
          case 'span': {
            if (a.s0 == null) { if (S.span) { V.span = { a: S.span.a, b: S.span.b, t: S.span.t, k: 1 - lp }; } else V.span = null; }
            else if (lp > 0) V.span = { a: a.s0, b: a.b, t: a.t, k: EZ.out(lp) };
            break; }
          case 'tag': V.tagPop = V.tagPop || {}; if (lp >= 0.4) { if (a.v == null) delete V.tags[a.k]; else V.tags[a.k] = a.v; } V.tagPop[a.k] = Math.sin(Math.PI * seg(lp, 0.4, 1)); break;
          case 'read': if (lp > 0 && lp < 1) V.lift = { i: a.i, lp: lp }; break;
          case 'stdin': V.stdin = a.t.slice(); V.sin = 1; V.stdinN = Math.ceil(a.t.length * seg(lp, 0, 0.9)); break;
          case 'scoop': {
            V.fly = []; V.gone = [];
            a.vals.forEach(function (v, j) {
              var q = seg(lp, j * 0.13, j * 0.13 + 0.45);
              if (q >= 1) V.cells[j] = v;
              if (q > 0 && j < S.stdin.length) { V.gone[j] = 1; if (q < 1) V.fly.push({ j: j, q: EZ.io(q), v: S.stdin[j] }); }
            });
            break; }
          case 'cap': if (inst(lp)) { V.cap = a.t; V.capA = seg(lp, 0.05, 0.4); } break;
        }
      },
      draw: function (c, V, T, C) {
        bg(c, C, W, H);
        var n = V.cells.length, g = geom(n, V.tail), cw = g.cw, x0 = g.x0;
        var col = V.kind === 'char' ? C.yellow : C.accent;
        var cx = function (i) { return x0 + i * cw + cw / 2; };
        /* stdin strip */
        if (V.sin || V.stdinN != null) {
          txt(c, 'stdin', 12, 25, { size: 8, col: C.muted2, align: 'left' });
          var m = V.stdinN == null ? V.stdin.length : V.stdinN;
          V.stdin.forEach(function (ch, j) {
            if (j >= m || (V.gone && V.gone[j])) return;
            rrect(c, 48 + j * 26, 12, 23, 24, 3); c.fillStyle = rgba(C.purple, 0.2); c.fill(); c.strokeStyle = C.purple; c.lineWidth = 1.2; c.stroke();
            txt(c, ch, 48 + j * 26 + 11.5, 25, { size: ch.length > 1 ? 9 : 12, w: 700, col: C.text });
          });
        }
        /* tags */
        var tk = Object.keys(V.tags), tx = W - 12;
        tk.slice().reverse().forEach(function (k) {
          var s = k + ' = ' + V.tags[k], w = s.length * 6.6 + 16, pp = V.tagPop && V.tagPop[k] ? 1 + 0.2 * V.tagPop[k] : 1;
          c.save(); c.translate(tx - w / 2, 24); c.scale(pp, pp); rrect(c, -w / 2, -11, w, 22, 4); c.fillStyle = rgba(C.purple, 0.15); c.fill(); c.strokeStyle = rgba(C.purple, 0.7); c.lineWidth = 1.2; c.stroke();
          txt(c, s, 0, 1, { size: 10.5, w: 700, col: C.text }); c.restore(); tx -= w + 8;
        });
        if (V.name) txt(c, V.name, 12, 52, { size: 11, w: 700, col: col, align: 'left' });
        /* span bracket */
        if (V.span) { var sp = V.span, xa = cx(sp.a) - cw / 2 + 4, xb = cx(sp.b) + cw / 2 - 4, k = sp.k == null ? 1 : clamp(sp.k), xm = (xa + xb) / 2, hw = (xb - xa) / 2 * k;
          c.save(); c.strokeStyle = C.orange; c.lineWidth = 2; c.beginPath(); c.moveTo(xm - hw, 94); c.lineTo(xm - hw, 88); c.lineTo(xm + hw, 88); c.lineTo(xm + hw, 94); c.stroke(); c.restore();
          txt(c, sp.t, xm, 76, { size: 10, w: 700, col: C.orange, al: k }); }
        /* lockers */
        var firstStop = -1; V.cells.forEach(function (v, i) { if (firstStop < 0 && isStop(v)) firstStop = i; });
        V.cells.forEach(function (v, i) {
          var gk = V.grow ? V.grow[i] : 1, x = cx(i), pp = V.pop && V.pop.i === i ? 1 + 0.18 * V.pop.k : 1, sc = Math.max(gk, 0) * pp;
          var active = V.cur && Math.abs(V.cur.i - i) < 0.5, marked = V.mark && i >= Math.min(V.mark[0], V.mark[1]) - 0.01 && i <= Math.max(V.mark[0], V.mark[1]) + 0.3;
          c.save(); c.translate(x, LY + LH / 2); c.scale(sc, sc); c.translate(-x, -(LY + LH / 2));
          var bw = cw - 6;
          rrect(c, x - bw / 2, LY, bw, LH, 4); c.fillStyle = rgba(col, marked ? 0.3 : 0.12); c.fill(); c.strokeStyle = active ? C.text : rgba(col, 0.8); c.lineWidth = active ? 2.5 : 1.5; c.stroke();
          c.fillStyle = rgba(col, 0.35); for (var s = 0; s < 3; s++) c.fillRect(x - bw / 2 + 6, LY + 6 + s * 4, bw - 12, 1.5);
          if (isStop(v)) {
            var first = i === firstStop, al = first ? 1 : 0.4, r = first ? 17 : 12;
            c.save(); c.globalAlpha *= al; octa(c, x, LY + 44, r); c.fillStyle = C.orange; c.fill(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.5; c.stroke();
            txt(c, '\\0', x, LY + 45, { size: first ? 12 : 9, w: 800, col: C.ink }); c.restore();
          } else if (v === '?') txt(c, '?', x, LY + 44, { size: 18, w: 700, col: C.muted });
          else txt(c, v, x, LY + 44, { size: String(v).length > 2 ? 12 : (String(v).length > 1 ? 15 : 22), w: 700, col: C.text });
          c.restore();
          txt(c, String(i), x, 183, { size: 10, w: 600, col: active ? C.text : C.muted2 });
        });
        if (V.tail) { var tx2 = x0 + n * cw + 22; txt(c, '...', tx2, LY + 40, { size: 16, w: 700, col: C.muted }); txt(c, V.tail, tx2, 183, { size: 9, col: C.muted2 }); }
        /* lift */
        if (V.lift) { var L = V.lift, v2 = V.cells[L.i]; txt(c, isStop(v2) ? '\\0' : String(v2), cx(L.i), lerp(LY - 4, 66, EZ.out(L.lp)), { size: 16, w: 700, col: C.accent, al: 1 - seg(L.lp, 0.6, 1) }); }
        /* flying scooped letters */
        (V.fly || []).forEach(function (f) { var fx = lerp(48 + f.j * 26 + 11.5, cx(f.j), f.q), fy = lerp(25, LY + 44, f.q) - 18 * Math.sin(Math.PI * f.q);
          txt(c, f.v, fx, fy, { size: f.v.length > 1 ? 12 : 18, w: 700, col: C.purple }); });
        /* cursor */
        if (V.cur) { var ca = V.curA == null ? 1 : V.curA, px = x0 + (V.cur.i + 0.5) * cw;
          c.save(); c.globalAlpha *= clamp(ca); arrow(c, px, 214, px, 196, C.purple); txt(c, V.cur.name, px, 226, { size: 10, w: 700, col: C.purple }); c.restore(); }
        capDraw(c, C, V.cap, V.capA);
      }
    });
  })();

  /* ===================== p3-cmp ===================== */
  (function () {
    var TX = 70, PITCH = 42, TW = 38, AY = 52, BY = 126;
    var code = function (ch) { return ch === '\\0' ? 0 : ch.charCodeAt(0); };
    function chars(s) { return s.split('').concat(['\\0']); }
    RTSPlay.scene('p3-cmp', {
      W: W, H: H,
      init: function () { return { A: null, B: null, la: '', lb: '', col: -1, res: null, ans: null }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'words': S.A = chars(a.a1); S.B = chars(a.b); S.la = a.la; S.lb = a.lb; S.col = -1; S.res = null; S.ans = null; break;
          case 'cmp': S.col = a.to; break;
          case 'res': S.res = { v: a.v, w: a.w, col: a.col }; break;
          case 'ans': S.ans = { t: a.t, r: a.r }; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'words': V.A = chars(a.a1); V.B = chars(a.b); V.la = a.la; V.lb = a.lb; V.col = -1; V.res = null; V.ans = null;
            V.grow = V.A.map(function (_, i) { return EZ.back(seg(lp, i * 0.06, i * 0.06 + 0.4)); }); V.growB = V.B.map(function (_, i) { return EZ.back(seg(lp, i * 0.06 + 0.1, i * 0.06 + 0.5)); }); break;
          case 'cmp': V.col = lerp(S.col, a.to, a.to === S.col ? 1 : EZ.io(lp)); if (lp > 0) V.cmpMoving = lp < 1; break;
          case 'res': V.resK = EZ.back(seg(lp, 0.1, 0.6)); if (lp > 0) V.res = { v: a.v, w: a.w, col: a.col }; break;
          case 'ans': V.ansK = EZ.back(seg(lp, 0.1, 0.6)); if (lp > 0) V.ans = { t: a.t, r: a.r }; break;
        }
      },
      draw: function (c, V, T, C) {
        bg(c, C, W, H);
        if (!V.A) { txt(c, 'two strings, compared letter by letter', W / 2, 110, { size: 11, col: C.muted }); return; }
        txt(c, V.la, 12, AY + 19, { size: 9, w: 700, col: C.accent, align: 'left' });
        txt(c, V.lb, 12, BY + 19, { size: 9, w: 700, col: C.purple, align: 'left' });
        var maxc = Math.max(V.A.length, V.B.length);
        for (var i = 0; i < maxc; i++) {
          var x = TX + i * PITCH, passed = V.col >= i - 0.0001, active = Math.abs(V.col - i) < 0.5 && V.col >= -0.3;
          var ca = V.A[i], cb = V.B[i], same = ca === cb, st = passed ? (same ? C.accent : C.orange) : null;
          if (V.col >= 0 && active) { rrect(c, x - 3, AY - 6, TW + 6, BY - AY + TW + 12, 6); c.fillStyle = rgba(st || C.text, 0.09); c.fill(); c.strokeStyle = rgba(C.text, 0.4); c.lineWidth = 1; c.setLineDash([3, 3]); c.stroke(); c.setLineDash([]); }
          [[ca, AY, V.grow, C.accent], [cb, BY, V.growB, C.purple]].forEach(function (t) {
            var ch = t[0]; if (ch == null) return; var gk = t[2] ? t[2][i] : 1; if (gk == null) gk = 1;
            c.save(); c.translate(x + TW / 2, t[1] + TW / 2); c.scale(Math.max(gk, 0), Math.max(gk, 0));
            rrect(c, -TW / 2, -TW / 2, TW, TW, 5); c.fillStyle = ch === '\\0' ? rgba(C.orange, 0.25) : rgba(t[3], 0.14); c.fill();
            c.strokeStyle = passed && st ? st : rgba(t[3], 0.7); c.lineWidth = passed ? 2.2 : 1.5; c.stroke();
            txt(c, ch, 0, 1, { size: ch === '\\0' ? 13 : 20, w: 700, col: ch === '\\0' ? C.orange : C.text }); c.restore();
          });
          if (passed) {
            if (ca != null) txt(c, String(code(ca)), x + TW / 2, AY + TW + 8, { size: 8, col: C.muted2 });
            if (cb != null) txt(c, String(code(cb)), x + TW / 2, BY - 8, { size: 8, col: C.muted2 });
            txt(c, same ? '=' : '!=', x + TW / 2, (AY + TW + BY) / 2, { size: 11, w: 800, col: same ? C.accent : C.orange });
          }
        }
        if (V.res) { var k = V.resK == null ? 1 : V.resK, rc = C[V.res.col] || C.accent;
          c.save(); c.translate(W / 2, 190); c.scale(Math.max(k, 0), Math.max(k, 0)); rrect(c, -170, -14, 340, 28, 5); c.fillStyle = rgba(rc, 0.14); c.fill(); c.strokeStyle = rgba(rc, 0.7); c.lineWidth = 1.5; c.stroke();
          txt(c, 'strcmp gives', -160, 1, { size: 10, col: C.muted2, align: 'left' }); txt(c, V.res.v, -70, 1, { size: 13, w: 800, col: rc, align: 'left' }); txt(c, V.res.w, 160, 1, { size: 9, col: C.muted2, align: 'right' }); c.restore(); }
        if (V.ans) { var k2 = V.ansK == null ? 1 : V.ansK; txt(c, V.ans.t, 120, 224, { size: 12, w: 700, col: C.text });
          badge(c, C, 270, 224, V.ans.r ? 'true' : 'false', V.ans.r ? C.accent : C.orange, k2); }
      }
    });
  })();

  /* ===================== p3-grid ===================== */
  (function () {
    var GX = 84, GY = 62, CS = 46, NR = 3, NC = 5;
    var PL = ['00111100', '01111110', '01211210', '01111110', '00111100', '01111110', '01011010', '01011010'];
    var EX = ['01111110', '11111111', '11222211', '11222211', '11223211', '11222211', '11222211', '11111111'];
    RTSPlay.scene('p3-grid', {
      W: W, H: H,
      init: function () { var cells = []; for (var r = 0; r < NR; r++) cells.push([null, null, null, null, null]); return { shown: false, cells: cells, cur: null, pr: [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]], fm: null }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'frame': S.shown = true; break;
          case 'row': for (var k = 0; k < NC; k++) S.cells[a.r][k] = a.s[k]; break;
          case 'set': S.cells[a.r][a.c] = a.ch; break;
          case 'cur': S.cur = { r: a.r, c: a.c }; S.fm = null; if (a.mark) { var f = a.from == null ? a.c : a.from; for (var q = Math.min(f, a.c); q <= Math.max(f, a.c); q++) S.pr[a.r][q] = 1; } break;
          case 'fm': S.fm = a.t; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'frame': V.shown = true; V.frameA = lp; break;
          case 'row': V.rowK = V.rowK || {}; for (var k = 0; k < NC; k++) { V.cells[a.r][k] = lp > 0 ? a.s[k] : null; V.rowK[a.r + ',' + k] = EZ.back(seg(lp, k * 0.12, k * 0.12 + 0.4)); } break;
          case 'set': if (lp >= 0.5) V.cells[a.r][a.c] = a.ch; V.setPop = { r: a.r, c: a.c, k: Math.sin(Math.PI * seg(lp, 0.4, 1)) }; break;
          case 'cur': {
            var from = a.from != null ? a.from : (S.cur && S.cur.r === a.r ? S.cur.c : a.c), sweep = a.from != null, e = sweep ? lp : EZ.io(lp);
            var cc = lerp(from, a.c, e), rr = (S.cur && !sweep && S.cur.r !== a.r) ? lerp(S.cur.r, a.r, e) : a.r;
            V.cur = { r: rr, c: cc }; V.curA = S.cur || sweep ? 1 : seg(lp, 0, 0.4); V.fm = null;
            if (a.mark) { for (var q = Math.min(from, a.c); q <= Math.max(from, a.c); q++) if (q <= cc + 0.45 || lp >= 1) V.pr[a.r][q] = 1; } break; }
          case 'fm': if (inst(lp)) V.fm = a.t; break;
        }
      },
      draw: function (c, V, T, C) {
        bg(c, C, W, H);
        if (!V.shown) { txt(c, 'a map: rows of tiles', W / 2, 110, { size: 11, col: C.muted }); return; }
        var fa = V.frameA == null ? 1 : V.frameA; c.save(); c.globalAlpha = fa;
        txt(c, 'COLS = 5', GX + NC * CS / 2, 24, { size: 8, col: C.muted });
        txt(c, 'ROWS', 30, GY + NR * CS / 2 - 6, { size: 8, col: C.muted }); txt(c, '= 3', 30, GY + NR * CS / 2 + 6, { size: 8, col: C.muted });
        var cr = V.cur ? Math.round(V.cur.r) : -1, cc = V.cur ? Math.round(V.cur.c) : -1;
        for (var q = 0; q < NC; q++) txt(c, String(q), GX + q * CS + CS / 2, 50, { size: 10, w: q === cc ? 800 : 500, col: q === cc ? C.purple : C.muted2 });
        for (var r = 0; r < NR; r++) txt(c, String(r), GX - 14, GY + r * CS + CS / 2, { size: 10, w: r === cr ? 800 : 500, col: r === cr ? C.purple : C.muted2 });
        c.restore();
        c.save(); c.globalAlpha = fa;
        for (r = 0; r < NR; r++) for (q = 0; q < NC; q++) {
          var x = GX + q * CS, y = GY + r * CS, ch = V.cells[r][q], gk = V.rowK && V.rowK[r + ',' + q] != null ? V.rowK[r + ',' + q] : 1;
          var pp = V.setPop && V.setPop.r === r && V.setPop.c === q ? 1 + 0.25 * V.setPop.k : 1, sc = Math.max(gk, 0) * pp;
          c.save(); c.translate(x + CS / 2, y + CS / 2); c.scale(sc, sc); c.translate(-CS / 2, -CS / 2);
          var m = CS - 3;
          if (ch == null) { c.save(); c.setLineDash([3, 3]); c.strokeStyle = C.border2; c.lineWidth = 1.2; rrect(c, 1.5, 1.5, m, m, 4); c.stroke(); c.restore(); }
          else {
            rrect(c, 1.5, 1.5, m, m, 4);
            if (ch === '#') { c.fillStyle = rgba(C.muted, 0.38); c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1.2; c.stroke(); c.strokeStyle = rgba(C.border2, 0.9); c.beginPath(); c.moveTo(3, CS / 2); c.lineTo(CS - 3, CS / 2); c.moveTo(CS / 3, 3); c.lineTo(CS / 3, CS / 2); c.moveTo(CS * 2 / 3, CS / 2); c.lineTo(CS * 2 / 3, CS - 3); c.stroke(); }
            else { c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1.2; c.stroke(); }
            if (ch === '.') { c.fillStyle = rgba(C.muted2, 0.5); c.fillRect(CS / 2 - 2, CS / 2 - 2, 4, 4); }
            if (ch === 'P') pix(c, PL, CS / 2 - 12, CS / 2 - 12, 3, ['', C.accent, C.ink]);
            if (ch === 'E') pix(c, EX, CS / 2 - 12, CS / 2 - 12, 3, ['', C.orange, '#2a1a10', C.yellow]);
            if (V.pr[r][q]) { rrect(c, 1.5, 1.5, m, m, 4); c.fillStyle = rgba(C.accent, 0.2); c.fill(); }
            txt(c, ch, 8, 9, { size: 8, w: 700, col: C.muted2 });
          }
          c.restore();
        }
        c.restore();
        if (V.cur) {
          var ca = V.curA == null ? 1 : V.curA, x2 = GX + V.cur.c * CS, y2 = GY + V.cur.r * CS;
          c.save(); c.globalAlpha *= clamp(ca);
          rrect(c, GX - 1, y2 - 1, NC * CS + 2, CS + 2, 5); c.fillStyle = rgba(C.purple, 0.07); c.fill();
          rrect(c, x2 - 1, y2 - 1, CS + 2, CS + 2, 6); c.strokeStyle = C.purple; c.lineWidth = 3; c.stroke();
          c.restore();
        }
        var ftxt = V.fm || (V.cur ? 'map[' + Math.round(V.cur.r) + '][' + Math.round(V.cur.c) + ']' : null);
        if (ftxt) { var cell = V.cur ? V.cells[Math.round(V.cur.r)][Math.round(V.cur.c)] : null; var show = V.fm ? ftxt : (cell ? ftxt + "  =  '" + cell + "'" : ftxt);
          txt(c, show, W / 2, 222, { size: 14, w: 700, col: C.text }); }
        if (V.cur && !V.fm) { txt(c, 'r = ' + Math.round(V.cur.r), 12, 14, { size: 10, w: 700, col: C.purple, align: 'left' }); txt(c, 'c = ' + Math.round(V.cur.c), 64, 14, { size: 10, w: 700, col: C.purple, align: 'left' }); }
      }
    });
  })();

  /* ===================== p3-save ===================== */
  (function () {
    var NX = 170, NW = 220;
    RTSPlay.scene('p3-save', {
      W: W, H: H,
      init: function () { return { f: '?', open: null, exists: false, lines: [], best: 0, chk: null, leash: false }; },
      apply: function (S, a) {
        switch (a.a) {
          case 'f': S.f = a.v; break;
          case 'open': S.open = a.mode; S.leash = true; if (a.mode === 'w') { S.exists = true; S.lines = []; } break;
          case 'chk': S.chk = { t: a.t, r: a.r }; break;
          case 'write': S.lines.push(a.t); S.chk = null; break;
          case 'close': S.open = null; S.leash = false; S.chk = null; break;
          case 'best': S.best = a.v; break;
        }
      },
      tween: function (V, a, lp, S) {
        switch (a.a) {
          case 'f': if (lp >= 0.3) V.f = a.v; V.fPop = lp >= 0.3 ? Math.sin(Math.PI * seg(lp, 0.3, 1)) : 0; break;
          case 'open': V.nbk = EZ.io(lp); V.open = a.mode; V.leash = lp > 0.6; if (a.mode === 'w') { V.exists = true; if (lp > 0) V.lines = []; } break;
          case 'chk': V.chk = { t: a.t, r: a.r }; V.chkK = EZ.back(seg(lp, 0.2, 0.7)); if (lp <= 0) V.chk = S.chk; break;
          case 'write': V.typeN = seg(lp, 0.05, 0.9); V.typing = 1; V.lines = S.lines.concat([a.t]); V.chk = null; break;
          case 'close': V.nbk = 1 - EZ.io(lp); V.leash = lp < 0.3; if (lp >= 0.5) V.open = null; V.chk = null; break;
          case 'fread': if (lp > 0 && lp < 1) { var e = EZ.io(lp); V.tok = { x: lerp(300, 78, e), y: lerp(110, 168, e) - 22 * Math.sin(Math.PI * e), t: a.t, al: 1 - seg(lp, 0.92, 1) }; } break;
          case 'best': if (lp >= 0.3) V.best = a.v; V.bestPop = lp >= 0.3 ? Math.sin(Math.PI * seg(lp, 0.3, 1)) : 0; break;
        }
      },
      draw: function (c, V, T, C, rm) {
        bg(c, C, W, H);
        var nbk = V.nbk != null ? V.nbk : (V.open ? 1 : 0);
        /* variables on the left */
        var fp = V.fPop ? 1 + 0.2 * V.fPop : 1;
        c.save(); c.translate(80, 56); c.scale(fp, fp); rrect(c, -68, -22, 136, 44, 6); c.fillStyle = rgba(C.purple, 0.13); c.fill(); c.strokeStyle = rgba(C.purple, 0.75); c.lineWidth = 1.5; c.stroke();
        txt(c, 'FILE *f', -60, -9, { size: 8, col: C.muted2, align: 'left' }); txt(c, V.f, 0, 8, { size: V.f.length > 6 ? 11 : 14, w: 700, col: V.f === 'NULL' ? C.orange : C.text }); c.restore();
        var bp = V.bestPop ? 1 + 0.2 * V.bestPop : 1;
        c.save(); c.translate(80, 176); c.scale(bp, bp); rrect(c, -68, -22, 136, 44, 6); c.fillStyle = rgba(C.accent, 0.13); c.fill(); c.strokeStyle = rgba(C.accent, 0.75); c.lineWidth = 1.5; c.stroke();
        txt(c, 'int best', -60, -9, { size: 8, col: C.muted2, align: 'left' }); txt(c, String(V.best), 0, 8, { size: 15, w: 700, col: C.text }); c.restore();
        if (V.chk) { var k = V.chkK == null ? 1 : V.chkK; txt(c, V.chk.t, 80, 104, { size: 10, w: 700, col: C.text }); badge(c, C, 80, 124, V.chk.r ? 'true' : 'false', V.chk.r ? C.accent : C.orange, k); }
        /* drawer */
                var ny = lerp(206, 100, nbk);
        if (nbk < 0.5) {
          var sy = lerp(206, 150, nbk * 2); c.save();
          rrect(c, NX + 20, sy - 14, NW - 40, 30, 4); c.fillStyle = rgba(C.yellow, 0.25); c.fill(); c.strokeStyle = C.yellow; c.lineWidth = 1.5; c.stroke();
          txt(c, 'best.txt', NX + NW / 2, sy + 1, { size: 11, w: 700, col: C.text }); c.restore();
        } else {
          var k2 = seg(nbk, 0.5, 1), nh = 150 * k2 + 20, top = 150 - nh + 10;
          c.save(); c.globalAlpha = 1;
          rrect(c, NX, top, NW, nh, 6); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.yellow; c.lineWidth = 2; c.stroke();
          if (k2 > 0.7) {
            c.strokeStyle = C.border2; c.lineWidth = 1.5; c.beginPath(); c.moveTo(NX + NW / 2, top + 4); c.lineTo(NX + NW / 2, top + nh - 4); c.stroke();
            txt(c, 'best.txt', NX + NW / 4, top + 14, { size: 9, w: 700, col: C.muted2 });
            var md = V.open === 'w' ? 'w  writing' : 'r  reading', mc = V.open === 'w' ? C.orange : C.accent;
            badge(c, C, NX + NW * 3 / 4, top + 14, md, mc, 1);
            var lines = V.lines || [];
            for (var i = 0; i < 4; i++) { c.fillStyle = rgba(C.border2, 0.8); c.fillRect(NX + NW / 2 + 12, top + 52 + i * 22, NW / 2 - 24, 1.5); }
            lines.forEach(function (ln, i) { var isLast = V.typing && i === lines.length - 1;
              var shown = isLast ? ln.slice(0, Math.ceil(ln.length * V.typeN)) : ln; txt(c, shown, NX + NW / 2 + 16, top + 46 + i * 22, { size: 14, w: 700, col: C.text, align: 'left' });
              if (isLast && V.typeN < 1) { c.fillStyle = C.orange; c.fillRect(NX + NW / 2 + 16 + shown.length * 8.4, top + 38 + i * 22, 2, 14); } });
            if (!lines.length) txt(c, V.open === 'w' ? 'a fresh blank page' : '(empty)', NX + NW * 3 / 4, top + 70, { size: 8, col: C.muted });
          }
          c.restore();
        }
        /* drawer front */
        rrect(c, NX - 6, 210, NW + 12, 32, 4); c.fillStyle = C.border2; c.fill(); c.strokeStyle = C.muted; c.lineWidth = 1.2; c.stroke();
        rrect(c, NX + NW / 2 - 22, 220, 44, 8, 3); c.fillStyle = C.muted2; c.fill();
        txt(c, 'disk', NX + 8, 226, { size: 8, col: C.muted2, align: 'left' });
        /* leash */
        if (V.leash) { c.save(); c.strokeStyle = C.purple; c.lineWidth = 2; c.setLineDash([5, 4]); c.lineDashOffset = rm ? 0 : -T / 60; c.beginPath(); c.moveTo(148, 56); c.bezierCurveTo(165, 56, 160, 90, NX + 4, 100); c.stroke(); c.restore(); }
        if (V.tok) paper(c, C, V.tok.x, V.tok.y, 44, 22, V.tok.t, { col: C.purple, al: V.tok.al, size: 13 });
      }
    });
  })();
})();
