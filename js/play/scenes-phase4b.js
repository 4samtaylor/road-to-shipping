/* =====================================================================
   RTSPlay scenes for Phase 4b (ASCII Runner): rungs kbhit-getch, sleep, redraw-r,
   frame-buffer, game-loop, sentinel, state-machine, const-ptr, lnk2005.
   Canvas is 400x250 logical px. Colours come from the palette (theme aware).

   p4b-keys     letterbox + eye (_kbhit peeks, _getch takes), key/count cards, a lane that keeps moving
     key {v, clear?}   key card shows v          count {to}   count card + lane obstacle advance
     press {k}         a key flies from the keyboard into the letterbox
     peek {r:bool}     eye glances at the letterbox, badge "_kbhit() = 1|0"
     take {k}          the waiting key flies out of the letterbox into the key card
     say {t}           message strip (printf line)           quit {}  break banner
   p4b-clock    film strip of 30 frames, a clock that fills while Sleep runs, CPU bar
     chip {t}  ms {}  frame {n}  work {}  sleep {}  ff {from,to}  fps {}  done {}
   p4b-type     terminal row + stdout buffer tray (\r snaps the cursor back)
     var {v}  print {t}  flush {}  newline {}
   p4b-buffer   backstage char row (the frame buffer) and the screen
     alloc {}  var {}  fill {}  term {}  stamp {i,ch}  print {}
   p4b-beat     Input / Update / Render / Wait ring, variable cards, keys, mini lane
     show {}  beat {n}  set {k,v}  ff {...}
   p4b-lot      car park of four bays (-1 = cone)
     bays {}  cones {}  frame {n}  ptr {i}  set {i,v}  score {v}  banner {t}
   p4b-states   MENU / PLAYING / GAME OVER boxes
     keys {}  frame {n}  state {v}  look {}  go {to}  stay {}
   p4b-pass     Runner card + two functions holding a pointer
     card {}  field {name,v}  call {fn}  write {name,v}  read {names}  pass {}  ret {}
   p4b-link     main.c, runner.c, objects and the linker
     paste {}  mark {row,kind}  obj {}  link {}  fix {}
   ===================================================================== */
(function () {
  'use strict';
  if (!window.RTSPlay) return;
  var U = RTSPlay.util;
  var clamp = U.clamp, lerp = U.lerp, seg = U.seg, EZ = U.EZ, rgba = U.rgba, txt = U.txt, bg = U.bg, pix = U.pix, rrect = U.rrect;
  var W = 400, H = 250, PI = Math.PI;
  var pulse = function (t) { return Math.sin(PI * clamp(t)); };

  /* ---------- shared drawing helpers ---------- */
  function win(c, C, x, y, w, h, title) {
    rrect(c, x, y, w, h, 4); c.fillStyle = C.surface2; c.fill(); c.lineWidth = 1.5; c.strokeStyle = C.border2; c.stroke();
    c.fillStyle = rgba(C.border2, .8); c.fillRect(x + 1, y + 1, w - 2, 13);
    [C.orange, C.yellow, C.accent].forEach(function (col, i) { c.fillStyle = rgba(col, .7); c.beginPath(); c.arc(x + 8 + i * 8, y + 7.5, 2.2, 0, 7); c.fill(); });
    if (title) txt(c, title, x + 36, y + 8, { size: 8, col: C.muted2, align: 'left' });
  }
  function card(c, C, x, y, w, h, label, val, col, pop, dim) {
    c.save(); if (dim) c.globalAlpha = .5;
    rrect(c, x, y, w, h, 3); c.fillStyle = rgba(col, .1); c.fill(); c.lineWidth = 1.2; c.strokeStyle = rgba(col, .6); c.stroke();
    txt(c, label, x + 8, y + h / 2, { size: 10, col: C.muted2, align: 'left' });
    var k = 1 + .3 * (pop || 0);
    c.translate(x + w - 10, y + h / 2); c.scale(k, k);
    txt(c, String(val), 0, 0, { size: 15, w: 700, col: val === '?' ? C.muted : C.text, align: 'right' });
    c.restore();
  }
  function tile(c, C, x, y, s, ch, col, al) {
    c.save(); if (al != null) c.globalAlpha *= al;
    rrect(c, x - s / 2, y - s / 2, s, s, 4); c.fillStyle = col; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.5)'; c.stroke();
    txt(c, ch, x, y + 1, { size: s * .55, w: 800, col: C.ink }); c.restore();
  }
  function badge(c, C, x, y, w, h, t, col, k) {
    if (k <= 0) return;
    c.save(); c.font = '700 9.5px ' + U.FONT; w = Math.max(w, c.measureText(t).width + 18);
    c.translate(x, y); c.scale(k, k); rrect(c, -w / 2, -h / 2, w, h, 3); c.fillStyle = rgba(col, .16); c.fill(); c.lineWidth = 1; c.strokeStyle = rgba(col, .7); c.stroke();
    txt(c, t, 0, 1, { size: 9.5, w: 700, col: col }); c.restore();
  }
  function arrow(c, col, x1, y1, x2, y2, w, dash) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w || 1.6; if (dash) c.setLineDash(dash);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - Math.cos(a) * 3, y2 - Math.sin(a) * 3); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 7 * Math.cos(a - .45), y2 - 7 * Math.sin(a - .45)); c.lineTo(x2 - 7 * Math.cos(a + .45), y2 - 7 * Math.sin(a + .45)); c.closePath(); c.fill(); c.restore();
  }
  function eye(c, C, x, y, look, lk) {
    c.save(); c.translate(x, y); var ry = 3 + 5 * (lk == null ? 1 : lk);
    c.beginPath(); c.ellipse(0, 0, 11, ry, 0, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = C.muted2; c.stroke();
    c.beginPath(); c.arc(look * 4, 0, Math.min(4, ry - .5), 0, 7); c.fillStyle = C.accentDk; c.fill();
    c.beginPath(); c.arc(look * 4, 0, Math.min(2, ry - 1.5), 0, 7); c.fillStyle = C.ink; c.fill(); c.restore();
  }
  function pxScale(c, spr, cx, cy, u, cols, sx, sy, al) {
    var w = spr[0].length * u, h = spr.length * u;
    c.save(); c.translate(cx, cy + h / 2); c.scale(sx == null ? 1 : sx, sy == null ? 1 : sy); pix(c, spr, -w / 2, -h, u, cols, al); c.restore();
  }
  var CONE = ['0001000', '0012100', '0011100', '0122210', '0111110', '1111111'];
  var CAR = ['00011111000', '00122122100', '01111111110', '11111111111', '11311111311', '01100000110'];

  /* ====================================================================
     p4b-keys
     ==================================================================== */
  var KB = { slot: [84, 128], keyCard: [310, 113], caps: { j: [43, 214], q: [81, 214] } };
  RTSPlay.scene('p4b-keys', {
    W: W, H: H,
    init: function () { return { key: '?', count: null, mail: null, peek: null, say: '', quit: false }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'key': S.key = a.v; if (a.clear) S.peek = null; break;
        case 'count': S.count = a.to; break;
        case 'press': S.mail = a.k; S.peek = null; break;
        case 'peek': S.peek = a.r; break;
        case 'take': S.mail = null; S.key = a.k; break;
        case 'say': S.say = a.t; break;
        case 'quit': S.quit = true; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'key': V.key = lp >= .4 ? a.v : S.key; V.keyPop = pulse(seg(lp, .3, 1)); if (a.clear && lp >= .4) V.peek = null; break;
        case 'count': V.cx = lerp(S.count == null ? 0 : S.count, a.to, EZ.io(lp)); V.count = lp >= .4 ? a.to : S.count; V.countPop = pulse(seg(lp, .3, 1)); break;
        case 'press': {
          var cp = KB.caps[a.k] || KB.caps.j, t = seg(lp, .18, .8);
          V.press = { k: a.k, d: pulse(seg(lp, 0, .3)) };
          if (lp > 0 && lp < .8) V.fly = { x: lerp(cp[0], KB.slot[0], EZ.io(t)), y: lerp(cp[1] - 18, KB.slot[1], EZ.io(t)) - 34 * pulse(t), k: a.k };
          if (lp >= .8) { V.mail = a.k; V.mailPop = pulse(seg(lp, .8, 1)); }
          V.peek = null; break;
        }
        case 'peek': V.peekK = EZ.back(seg(lp, .35, .7)); V.peek = lp >= .35 ? a.r : S.peek; V.lk = pulse(lp); V.looking = lp > 0 && lp < 1 ? 1 : 0; break;
        case 'take': {
          var t2 = seg(lp, .05, .85);
          if (lp > 0) V.mail = null;
          if (lp > 0 && lp < .85) V.fly = { x: lerp(KB.slot[0], KB.keyCard[0] + 10, EZ.io(t2)), y: lerp(KB.slot[1], KB.keyCard[1], EZ.io(t2)) - 30 * pulse(t2), k: a.k };
          if (lp >= .85) { V.key = a.k; V.keyPop = pulse(seg(lp, .85, 1)); } break;
        }
        case 'say': V.say = lp >= .3 ? a.t : S.say; V.sayK = EZ.back(seg(lp, .3, .7)); break;
        case 'quit': V.quitK = EZ.back(lp); break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      /* lane */
      win(c, C, 10, 6, 380, 66, 'lane  (the world keeps moving every loop)');
      var cxn = V.cx != null ? V.cx : (V.count || 0), ox = 30 + (17 - 3 * cxn) * 17;
      for (var i = 0; i < 20; i++) txt(c, '.', 38.5 + i * 17, 54, { size: 14, col: C.muted });
      txt(c, 'A', 38.5 + 2 * 17, 49, { size: 15, w: 800, col: C.accent });
      if (ox > 38) txt(c, '#', ox + 8.5, 49, { size: 15, w: 800, col: C.orange });
      if (V.quit || V.quitK > 0) { var qk = V.quitK == null ? 1 : V.quitK; badge(c, C, 322, 27, 128, 16, 'break: leave the loop', C.orange, qk); }
      /* letterbox */
      var sx = KB.slot[0], sy = KB.slot[1];
      rrect(c, 24, 98, 120, 46, 4); c.fillStyle = rgba(C.accent, .08); c.fill(); c.lineWidth = 1.5; c.strokeStyle = rgba(C.accent, .6); c.stroke();
      c.fillStyle = C.ink; c.fillRect(40, 103, 88, 4);
      var mail = V.mail;
      if (mail) { var mp = 1 + .25 * (V.mailPop || 0); tile(c, C, sx, sy + 6, 24 * mp, mail, C.accent); }
      txt(c, 'keyboard buffer', 84, 156, { size: 8, col: C.muted2 });
      /* eye + badge */
      eye(c, C, 176, 121, -(V.looking ? 1 : .2), V.lk);
      txt(c, '_kbhit()', 176, 140, { size: 8, col: C.muted2 });
      if (V.looking) arrow(c, rgba(C.accent, .5), 164, 121, 148, 121, 1.2, [3, 3]);
      if (V.peek !== null && V.peek !== undefined) badge(c, C, 84, 174, 126, 18, '_kbhit() = ' + (V.peek ? 1 : 0), V.peek ? C.accent : C.orange, V.peekK == null ? 1 : V.peekK);
      /* cards */
      card(c, C, 222, 94, 166, 34, 'key', V.key === '0' ? '0' : (V.key === '?' ? '?' : "'" + V.key + "'"), C.yellow, V.keyPop);
      card(c, C, 222, 136, 166, 34, 'count', V.count == null ? '?' : V.count, C.purple, V.countPop);
      /* message */
      if (V.say) { var sk = V.sayK == null ? 1 : V.sayK; badge(c, C, 305, 196, 150, 20, V.say, C.accent, sk); }
      /* keyboard */
      ['j', 'q'].forEach(function (k) {
        var p = KB.caps[k], d = V.press && V.press.k === k ? V.press.d * 3 : 0;
        rrect(c, p[0] - 13, p[1] - 11 + d, 26, 24, 4); c.fillStyle = C.surface2; c.fill(); c.lineWidth = 1.5; c.strokeStyle = C.border2; c.stroke();
        c.fillStyle = C.border2; c.fillRect(p[0] - 13, p[1] + 10 + d - (d ? 0 : 0), 26, 3);
        txt(c, k, p[0], p[1] + d, { size: 13, w: 700, col: C.text });
      });
      txt(c, 'you at the keyboard', 62, 240, { size: 8, col: C.muted2 });
      if (V.fly) tile(c, C, V.fly.x, V.fly.y, 24, V.fly.k, C.accent);
    }
  });

  /* ====================================================================
     p4b-clock
     ==================================================================== */
  RTSPlay.scene('p4b-clock', {
    W: W, H: H,
    init: function () { return { frame: 0, ms: false, wedge: 0, chip: '', fps: false, done: false }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'chip': S.chip = a.t; break;
        case 'ms': S.ms = true; S.chip = 'FRAME_MS = 33 milliseconds'; break;
        case 'frame': S.frame = a.n; S.wedge = 0; break;
        case 'sleep': S.wedge = 1; break;
        case 'ff': S.frame = a.to; S.wedge = 1; break;
        case 'fps': S.fps = true; break;
        case 'done': S.done = true; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'chip': V.chip = lp >= .3 ? a.t : S.chip; V.chipK = EZ.back(seg(lp, .3, .7)); break;
        case 'ms': V.msK = EZ.back(seg(lp, 0, .5)); V.ms = lp > 0; V.chip = lp >= .3 ? 'FRAME_MS = 33 milliseconds' : S.chip; V.chipK = EZ.back(seg(lp, .3, .7)); break;
        case 'frame': V.fr = a.n; V.frPop = pulse(seg(lp, 0, 1)); V.frame = lp >= .1 ? a.n : S.frame; V.wedge = lp >= .1 ? 0 : S.wedge; break;
        case 'work': V.workK = pulse(lp); V.work = lp > 0 && lp < 1 ? 1 : 0; break;
        case 'sleep': V.wedge = lp; V.sleepNow = lp > 0 && lp < 1 ? 1 : 0; break;
        case 'ff': { V.frF = lerp(a.from, a.to, EZ.lin(lp)); var w = lp * 5; V.wedge = lp >= 1 ? 1 : w % 1; V.sleepNow = lp > 0 && lp < 1 ? 1 : 0; V.spin = lp > 0 && lp < 1 ? 1 : 0; V.frame = a.to; break; }
        case 'fps': V.fpsK = EZ.back(lp); V.fps = lp > 0; break;
        case 'done': V.doneK = EZ.back(lp); V.done = lp > 0; break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      /* film strip */
      txt(c, 'frames', 34, 8, { size: 8, col: C.muted, align: 'left' });
      var fr = V.frF != null ? V.frF : V.frame, fl = Math.floor(fr + .0001);
      for (var i = 0; i < 30; i++) {
        var x = 34 + i * 11.7, cur = i === fl - 1, on = i < fl, pop = cur && V.frPop ? V.frPop : 0;
        c.save(); c.translate(x + 4.5, 24); c.scale(1 + .35 * pop, 1 + .35 * pop);
        c.fillStyle = cur ? C.accent : on ? rgba(C.accent, .35) : C.surface2; c.fillRect(-4.5, -7, 9, 14);
        c.lineWidth = 1; c.strokeStyle = on ? rgba(C.accent, .7) : C.border2; c.strokeRect(-4, -6.5, 8, 13); c.restore();
      }
      txt(c, '1', 38, 40, { size: 7.5, col: C.muted }); txt(c, '30', 34 + 29 * 11.7 + 4.5, 40, { size: 7.5, col: C.muted });
      txt(c, 'frame ' + (fl > 0 ? fl : '-'), 360, 8, { size: 9, w: 700, col: C.text, align: 'right' });
      /* clock */
      var cx = 96, cy = 120, R = 42, wd = clamp(V.wedge || 0);
      c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fillStyle = C.surface2; c.fill();
      if (wd > 0) { c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R - 2, -PI / 2, -PI / 2 + wd * 2 * PI); c.closePath(); c.fillStyle = rgba(C.accent, .35); c.fill(); }
      c.lineWidth = 2; c.strokeStyle = V.sleepNow ? C.accent : C.border2; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
      for (var k = 0; k < 12; k++) { var an = k / 12 * 2 * PI; c.fillStyle = C.muted; c.fillRect(cx + Math.sin(an) * (R - 6) - 1, cy - Math.cos(an) * (R - 6) - 1, 2, 2); }
      if (V.ms || V.msK > 0) {
        c.save(); c.translate(cx, cy - 3); var mk = V.msK == null ? 1 : V.msK; c.scale(mk, mk);
        txt(c, '33', 0, 0, { size: 20, w: 800, col: C.text }); txt(c, 'ms', 0, 14, { size: 9, col: C.muted2 }); c.restore();
      } else txt(c, '?', cx, cy, { size: 20, w: 800, col: C.muted });
      var ha = -PI / 2 + wd * 2 * PI; c.strokeStyle = C.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ha) * (R - 6), cy + Math.sin(ha) * (R - 6)); c.stroke();
      txt(c, 'Sleep(FRAME_MS)', cx, cy + R + 14, { size: 9, col: C.muted2 });
      /* CPU bar */
      var bx = 186, bw = 198, by = 78, bh = 24, wk = 10;
      txt(c, 'CPU time in one frame', bx, 64, { size: 8.5, col: C.muted2, align: 'left' });
      rrect(c, bx, by, bw, bh, 3); c.fillStyle = C.surface2; c.fill();
      c.save(); rrect(c, bx, by, bw, bh, 3); c.clip();
      c.fillStyle = rgba(C.muted, .22); for (var s = bx + wk; s < bx + bw + bh; s += 7) { c.beginPath(); c.moveTo(s, by + bh); c.lineTo(s + bh, by); c.lineTo(s + bh + 3, by); c.lineTo(s + 3, by + bh); c.fill(); }
      c.fillStyle = C.accent; c.fillRect(bx, by, wk, bh); c.restore();
      rrect(c, bx, by, bw, bh, 3); c.lineWidth = 1.2; c.strokeStyle = C.border2; c.stroke();
      if (V.work) { c.fillStyle = rgba('#ffffff', .6 * V.workK); c.fillRect(bx, by, wk, bh); }
      txt(c, 'work', bx + 1, by + bh + 9, { size: 8, col: C.accent, align: 'left' });
      txt(c, 'asleep: others get the CPU', bx + bw - 1, by + bh + 9, { size: 8, col: C.muted2, align: 'right' });
      if (fl > 0) { var px = bx + wk + wd * (bw - wk); c.fillStyle = C.text; c.fillRect(px - 1, by - 5, 2, bh + 10); c.beginPath(); c.moveTo(px - 4, by - 7); c.lineTo(px + 4, by - 7); c.lineTo(px, by - 1); c.fill(); }
      /* other programs */
      var oth = [{ n: 'music', col: C.purple }, { n: 'browser', col: C.blue }, { n: 'chat', col: C.yellow }];
      oth.forEach(function (o, j) {
        var ox = bx + j * 68, glow = V.sleepNow ? .6 + .4 * Math.sin(T / 140 + j * 2) : .25; if (rm) glow = V.sleepNow ? 1 : .25;
        rrect(c, ox, 138, 60, 28, 3); c.fillStyle = rgba(o.col, .12 + .2 * (V.sleepNow ? 1 : 0)); c.fill(); c.lineWidth = 1.2; c.strokeStyle = rgba(o.col, glow); c.stroke();
        txt(c, o.n, ox + 30, 152, { size: 8.5, col: V.sleepNow ? C.text : C.muted2 });
      });
      txt(c, 'other programs', bx, 178, { size: 8, col: C.muted, align: 'left' });
      /* chips */
      if (V.fps || V.fpsK > 0) badge(c, C, 290, 198, 196, 20, '1000 / 33 = about 30 frames a second', C.accent, V.fpsK == null ? 1 : V.fpsK);
      if (V.chip) badge(c, C, 96, 214, 176, 20, V.chip, C.purple, V.chipK == null ? 1 : V.chipK);
      if (V.done || V.doneK > 0) badge(c, C, 290, 226, 100, 20, 'Done.', C.accent, V.doneK == null ? 1 : V.doneK);
    }
  });

  /* ====================================================================
     p4b-type  (carriage return)
     ==================================================================== */
  var TX0 = 44, TCW = 26;
  function typeInto(cells, gens, col, str, gen) {
    for (var i = 0; i < str.length; i++) { cells[col] = str[i]; gens[col] = gen; col++; }
    return col;
  }
  RTSPlay.scene('p4b-type', {
    W: W, H: H,
    init: function () { var e = [], g = []; for (var i = 0; i < 12; i++) { e.push(''); g.push(0); } return { cells: e, gens: g, gen: 0, col: 0, row: 0, tray: '', score: '?' }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'var': S.score = a.v; break;
        case 'print': S.tray = a.t; break;
        case 'flush': {
          var t = S.tray, col = S.col; S.gen++;
          if (t.charAt(0) === '\r') { col = 0; t = t.slice(1); }
          S.col = typeInto(S.cells, S.gens, col, t, S.gen); S.tray = ''; break;
        }
        case 'newline': S.row = 1; S.col = 0; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'var': V.score = lp >= .3 ? a.v : S.score; V.pop = pulse(seg(lp, .2, 1)); break;
        case 'print': V.tray = lp > 0 ? a.t : S.tray; V.trayN = Math.floor(a.t.length * EZ.lin(seg(lp, 0, .8)) + .0001); if (lp >= 1) V.trayN = a.t.length; break;
        case 'flush': {
          var t = S.tray, col = S.col, snap = false;
          if (t.charAt(0) === '\r') { snap = true; t = t.slice(1); }
          var tSnap = snap ? seg(lp, .1, .35) : 1, tType = seg(lp, snap ? .35 : .1, 1);
          V.tray = S.tray; V.trayN = S.tray.length; V.trayOff = -26 * EZ.in(seg(lp, 0, .5)); V.trayA = 1 - seg(lp, .35, .6);
          if (lp > 0) {
            var startCol = snap ? 0 : col, n = Math.floor(t.length * tType + .0001), cells = V.cells.slice(), gens = V.gens.slice();
            if (lp >= 1) n = t.length;
            for (var i = 0; i < n; i++) { cells[startCol + i] = t[i]; gens[startCol + i] = S.gen + 1; }
            V.cells = cells; V.gens = gens; V.gen = S.gen + 1; V.col = snap ? (n > 0 ? startCol + n : lerp(col, 0, EZ.out(tSnap))) : startCol + n;
            if (snap && lp > 0 && lp < .5) V.crK = pulse(seg(lp, .05, .5));
          }
          break;
        }
        case 'newline': V.row = lp >= .4 ? 1 : S.row; V.col = lp >= .4 ? 0 : S.col; V.nlK = pulse(lp); break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      win(c, C, 20, 10, 360, 104, 'terminal');
      var rowY = [54, 90];
      for (var i = 0; i < 12; i++) txt(c, String(i), TX0 + i * TCW + TCW / 2 - 1, 36, { size: 7, col: C.muted });
      for (var j = 0; j < 12; j++) {
        var x = TX0 + j * TCW, ch = V.cells[j], stale = ch && V.gens[j] !== V.gen && V.gen > 0;
        rrect(c, x + 1, rowY[0] - 13, TCW - 2, 26, 2); c.fillStyle = stale ? rgba(C.orange, .22) : rgba(C.border2, .5); c.fill();
        c.lineWidth = 1; c.strokeStyle = stale ? C.orange : C.border2; c.stroke();
        if (ch) txt(c, ch === ' ' ? '' : ch, x + TCW / 2, rowY[0] + 1, { size: 15, w: 700, col: stale ? C.orange : C.text });
      }
      if (V.row === 1 || V.nlK > 0) txt(c, '$', TX0 + 6, rowY[1] + 1, { size: 15, w: 700, col: C.muted2, align: 'left', al: V.row === 1 ? 1 : 0 });
      var curRow = V.row === 1 ? 1 : 0, cxp = TX0 + V.col * TCW, blink = rm ? 1 : .55 + .45 * Math.sin(T / 220);
      c.save(); c.globalAlpha = blink; c.lineWidth = 2; c.strokeStyle = C.accent; c.strokeRect(cxp + 1.5, rowY[curRow] - 12, TCW - 3, 24); c.fillStyle = rgba(C.accent, .18); c.fillRect(cxp + 1.5, rowY[curRow] - 12, TCW - 3, 24); c.restore();
      if (V.crK > 0) badge(c, C, TX0 + 2.5 * TCW, 24, 90, 14, '\\r: back to column 0', C.purple, V.crK);
      var stale = false; for (var q = 0; q < 12; q++) if (V.cells[q] && V.gens[q] !== V.gen && V.gen > 0) stale = true;
      if (stale) txt(c, 'old character left behind: the new line was shorter', 200, 126, { size: 8.5, w: 700, col: C.orange });
      /* tray */
      txt(c, 'stdout buffer (printf puts text here first)', 44, 142, { size: 8, col: C.muted2, align: 'left' });
      rrect(c, 44, 150, 312, 34, 3); c.fillStyle = rgba(C.purple, .08); c.fill(); c.lineWidth = 1.2; c.setLineDash([4, 3]); c.strokeStyle = rgba(C.purple, .6); c.stroke(); c.setLineDash([]);
      var tr = V.tray || '', n = V.trayN == null ? tr.length : V.trayN, off = V.trayOff || 0, ta = V.trayA == null ? 1 : V.trayA;
      for (var m = 0; m < Math.min(n, tr.length); m++) {
        var ch2 = tr[m], isCr = ch2 === '\r', lab = isCr ? '\\r' : ch2 === ' ' ? '' : ch2;
        c.save(); c.globalAlpha = ta; var tx = 62 + m * 23, ty = 167 + off;
        rrect(c, tx - 10, ty - 11, 20, 22, 3); c.fillStyle = isCr ? rgba(C.purple, .35) : rgba(C.accent, .14); c.fill(); c.lineWidth = 1; c.strokeStyle = isCr ? C.purple : rgba(C.accent, .5); c.stroke();
        txt(c, lab, tx, ty + 1, { size: isCr ? 10 : 13, w: 700, col: isCr ? C.purple : C.text }); c.restore();
      }
      if (V.trayA != null && V.trayA < 1 && V.trayA > 0) arrow(c, rgba(C.accent, .7), 200, 148, 200, 118, 1.6);
      card(c, C, 44, 200, 140, 30, 'score', V.score, C.yellow, V.pop);
    }
  });

  /* ====================================================================
     p4b-buffer
     ==================================================================== */
  var BX0 = 31, BCW = 26;
  RTSPlay.scene('p4b-buffer', {
    W: W, H: H,
    init: function () { return { cells: null, obs: false, screen: '' }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'alloc': S.cells = []; for (var i = 0; i < 13; i++) S.cells.push('?'); break;
        case 'var': S.obs = true; break;
        case 'fill': for (var j = 0; j < 12; j++) S.cells[j] = '.'; break;
        case 'term': S.cells[12] = '\\0'; break;
        case 'stamp': S.cells[a.i] = a.ch; break;
        case 'print': S.screen = S.cells.slice(0, 12).join(''); break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'alloc': V.allocK = EZ.back(lp); V.alloc = lp > 0; break;
        case 'var': V.obsK = EZ.back(lp); V.obs = lp > 0; break;
        case 'fill': { var n = Math.floor(12 * lp + .0001); if (lp >= 1) n = 12; V.cells = V.cells.slice(); for (var i = 0; i < n; i++) V.cells[i] = '.'; V.sweep = lp > 0 && lp < 1 ? lp * 12 : -1; break; }
        case 'term': V.cells = V.cells.slice(); if (lp >= .5) V.cells[12] = '\\0'; V.popI = 12; V.pop = pulse(seg(lp, .4, 1)); break;
        case 'stamp': {
          V.cells = V.cells.slice(); V.stamp = { i: a.i, ch: a.ch, y: lerp(-34, 0, EZ.in(seg(lp, 0, .45))), a: 1 - seg(lp, .7, 1) };
          if (lp >= .45) { V.cells[a.i] = a.ch; V.popI = a.i; V.pop = pulse(seg(lp, .45, 1)); } if (lp <= 0) V.stamp = null; break;
        }
        case 'print': V.printK = lp; V.screen = lp >= .55 ? S.cells.slice(0, 12).join('') : S.screen; V.screenGlow = pulse(seg(lp, .5, 1)); break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      win(c, C, 20, 8, 360, 100, 'lane[13]   (backstage, in memory)');
      var cells = V.cells, ry = 40;
      if (cells && (V.allocK == null || V.allocK > 0)) {
        var k0 = V.allocK == null ? 1 : V.allocK;
        for (var i = 0; i < 13; i++) {
          var x = BX0 + i * BCW, ch = cells[i], col = ch === '#' ? C.orange : ch === 'A' ? C.accent : ch === '\\0' ? C.purple : ch === '?' ? C.muted : C.text;
          var pp = V.popI === i && V.pop > 0 ? 1 + .3 * V.pop : 1, sw = V.sweep != null && V.sweep >= 0 && i < V.sweep && i >= V.sweep - 1.2;
          c.save(); c.globalAlpha = clamp(k0); c.translate(x + BCW / 2, ry + 15); c.scale(pp, pp);
          rrect(c, -BCW / 2 + 1, -15, BCW - 2, 30, 2); c.fillStyle = ch === '#' || ch === 'A' || ch === '\\0' ? rgba(col, .2) : rgba(C.border2, .55); c.fill();
          c.lineWidth = sw ? 2 : 1; c.strokeStyle = sw ? C.accent : ch === '#' || ch === 'A' || ch === '\\0' ? col : C.border2; c.stroke();
          txt(c, ch, 0, 1, { size: ch === '\\0' ? 11 : 16, w: 700, col: ch === '.' ? C.muted2 : col }); c.restore();
          txt(c, String(i), x + BCW / 2, ry + 38, { size: 8, col: C.muted });
        }
        txt(c, 'slot 12 is the spare', BX0 + 12 * BCW + BCW / 2 - 40, ry + 52, { size: 7.5, col: C.muted, al: .001 });
        if (cells[12] === '\\0') txt(c, 'string ends here', BX0 + 12 * BCW + BCW / 2 - 18, ry + 52, { size: 8, col: C.purple, align: 'right' });
        else txt(c, 'index', BX0 - 2, ry + 52, { size: 7.5, col: C.muted, align: 'left' });
      }
      if (V.stamp) { var s = V.stamp, sx = BX0 + s.i * BCW + BCW / 2;
        c.save(); c.globalAlpha = s.a; c.fillStyle = C.yellow; c.fillRect(sx - 9, ry + s.y - 6, 18, 8); c.fillRect(sx - 2.5, ry + s.y - 16, 5, 10); c.fillStyle = C.accentDk; c.fillRect(sx - 9, ry + s.y + 2, 18, 3); c.restore(); }
      /* constants and variables */
      txt(c, 'LANE_LEN = 12', 24, 122, { size: 8.5, col: C.muted2, align: 'left' });
      txt(c, 'PLAYER_COL = 2', 24, 134, { size: 8.5, col: C.muted2, align: 'left' });
      if (V.obs || V.obsK > 0) { c.save(); c.translate(150, 128); var ok = V.obsK == null ? 1 : V.obsK; c.scale(ok, ok); rrect(c, -4, -11, 104, 22, 3); c.fillStyle = rgba(C.yellow, .12); c.fill(); c.strokeStyle = rgba(C.yellow, .7); c.lineWidth = 1; c.stroke(); txt(c, 'obs_col = 8', 48, 1, { size: 10, w: 700, col: C.text }); c.restore(); }
      /* arrow and screen */
      var pk = V.printK || 0;
      arrow(c, rgba(C.accent, .35 + .5 * pulse(pk)), 200, 144, 200, 166, 2);
      txt(c, 'one printf', 214, 155, { size: 8, col: C.muted2, align: 'left' });
      if (pk > 0 && pk < 1 && cells) {
        var gy = lerp(ry + 15, 194, EZ.io(seg(pk, 0, .6)));
        c.save(); c.globalAlpha = 1 - seg(pk, .5, .75);
        for (var g = 0; g < 12; g++) txt(c, cells[g], BX0 + g * BCW + BCW / 2, gy, { size: 16, w: 700, col: C.accent });
        c.restore();
      }
      win(c, C, 20, 164, 360, 76, 'screen');
      var sc = V.screen || '';
      for (var q = 0; q < 12; q++) {
        var chh = sc[q] || '', colr = chh === '#' ? C.orange : chh === 'A' ? C.accent : C.text;
        if (chh) txt(c, chh, BX0 + q * BCW + BCW / 2, 205, { size: 18, w: 700, col: chh === '.' ? C.muted2 : colr });
      }
      if (sc && V.screenGlow > 0) { c.save(); c.globalAlpha = .5 * V.screenGlow; c.strokeStyle = C.accent; c.lineWidth = 2; c.strokeRect(BX0 - 2, 191, 12 * BCW + 4, 28); c.restore(); }
      if (!sc) txt(c, 'nothing drawn yet', 200, 205, { size: 9, col: C.muted });
    }
  });

  /* ====================================================================
     p4b-beat  (the four-step game loop)
     ==================================================================== */
  var ND = [{ n: '1 Input', x: 108, y: 54 }, { n: '2 Update', x: 172, y: 92 }, { n: '3 Render', x: 108, y: 130 }, { n: '4 Wait', x: 44, y: 92 }];
  RTSPlay.scene('p4b-beat', {
    W: W, H: H,
    init: function () { return { node: -1, frame: '-', key: '?', duck: '?', pos: '?', keys: false, cur: -1 }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'show': S.keys = true; break;
        case 'beat': S.node = a.n; break;
        case 'set': S[a.k] = a.v; if (a.k === 'frame') S.cur = a.v; break;
        case 'ff': S.frame = a.frame; S.cur = a.frame; S.key = a.key; S.duck = a.duck; S.pos = a.pos; S.node = 3; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'show': V.keysK = lp; V.keys = lp > 0; break;
        case 'beat': V.node = lp >= .3 ? a.n : S.node; V.from = S.node; V.nt = EZ.io(seg(lp, 0, .35)); V.nk = pulse(seg(lp, .3, 1)); break;
        case 'set': V.pops = Object.assign({}, V.pops); V.pops[a.k] = pulse(seg(lp, .3, 1)); V[a.k] = lp >= .3 ? a.v : S[a.k]; if (a.k === 'frame') V.cur = lp >= .3 ? a.v : S.cur; break;
        case 'ff': {
          if (lp <= 0) break;
          if (lp >= .5) { V.frame = a.frame; V.cur = a.frame; V.key = a.key; V.duck = a.duck; V.pos = a.pos; V.pops = Object.assign({}, V.pops, { frame: 1, pos: 1 }); }
          V.node = lp < 1 ? Math.floor(lp * 4) % 4 : 3; V.nk = .6; V.ffNow = lp < 1 ? 1 : 0; break;
        }
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      var ecx = 108, ecy = 92, erx = 64, ery = 38;
      c.lineWidth = 2; c.strokeStyle = C.border2; c.beginPath(); c.ellipse(ecx, ecy, erx, ery, 0, 0, 7); c.stroke();
      /* direction chevrons */
      [[ecx + erx * .72, ecy - ery * .7, 0.8], [ecx + erx * .72, ecy + ery * .7, 2.4], [ecx - erx * .72, ecy + ery * .7, 3.9], [ecx - erx * .72, ecy - ery * .7, 5.5]].forEach(function (p) {
        c.save(); c.translate(p[0], p[1]); c.rotate(p[2]); c.fillStyle = C.muted; c.beginPath(); c.moveTo(4, 0); c.lineTo(-3, -3.5); c.lineTo(-3, 3.5); c.fill(); c.restore();
      });
      txt(c, 'frame', ecx, ecy - 8, { size: 8, col: C.muted });
      txt(c, String(V.frame), ecx, ecy + 8, { size: 16, w: 800, col: C.text });
      ND.forEach(function (n, i) {
        var on = V.node === i, k = on ? 1 + .12 * (V.nk || 0) : 1;
        c.save(); c.translate(n.x + (i === 1 ? 4 : i === 3 ? -4 : 0), n.y); c.scale(k, k);
        rrect(c, -30, -11, 60, 22, 4); c.fillStyle = on ? C.accent : C.surface2; c.fill(); c.lineWidth = 1.5; c.strokeStyle = on ? C.accent : C.border2; c.stroke();
        txt(c, n.n, 0, 1, { size: 10, w: 700, col: on ? C.ink : C.muted2 }); c.restore();
      });
      if (V.ffNow && !rm) txt(c, 'again and again', ecx, ecy + 56, { size: 8.5, col: C.muted2 });
      /* cards */
      var P = V.pops || {};
      card(c, C, 222, 10, 166, 24, 'frame', V.frame, C.purple, P.frame);
      card(c, C, 222, 38, 166, 24, 'key', V.key === '?' ? '?' : "'" + V.key + "'", C.yellow, P.key);
      card(c, C, 222, 66, 166, 24, 'ducking', V.duck, C.orange, P.duck);
      card(c, C, 222, 94, 166, 24, 'pos', V.pos, C.accent, P.pos);
      /* keys strip */
      if (V.keys) {
        txt(c, 'keys[]', 222, 134, { size: 8.5, col: C.muted2, align: 'left' });
        var ks = '..d..';
        for (var i = 0; i < 5; i++) {
          var x = 222 + i * 34, cur = V.cur === i;
          rrect(c, x, 142, 30, 26, 3); c.fillStyle = cur ? rgba(C.yellow, .25) : rgba(C.border2, .5); c.fill(); c.lineWidth = cur ? 2 : 1; c.strokeStyle = cur ? C.yellow : C.border2; c.stroke();
          txt(c, ks[i], x + 15, 156, { size: 15, w: 700, col: ks[i] === 'd' ? C.yellow : C.muted2 });
          txt(c, String(i), x + 15, 177, { size: 7.5, col: C.muted });
        }
      }
      /* mini lane */
      rrect(c, 12, 190, 376, 50, 4); c.fillStyle = rgba(C.surface2, 1); c.fill(); c.lineWidth = 1; c.strokeStyle = C.border2; c.stroke();
      for (var j = 0; j < 6; j++) { txt(c, String(j), 40 + j * 62, 233, { size: 7.5, col: C.muted }); c.fillStyle = C.border2; c.fillRect(30 + j * 62, 214, 20, 2); }
      txt(c, 'lane', 18, 197, { size: 8, col: C.muted, align: 'left' });
      var pos = typeof V.pos === 'number' ? V.pos : 0, du = V.duck === 1 ? 1 : 0, rx = 40 + pos * 62;
      if (V.pos !== '?') {
        var h2 = du ? 8 : 16, w2 = du ? 18 : 12;
        c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(rx, 215, 9, 2.4, 0, 0, 7); c.fill();
        c.fillStyle = C.accent; c.fillRect(rx - w2 / 2, 213 - h2, w2, h2); c.fillStyle = C.accentDk; c.fillRect(rx - w2 / 2, 211, w2, 2);
        c.fillStyle = '#fff'; c.fillRect(rx + 1, 213 - h2 + 3, 4, 3); c.fillStyle = C.ink; c.fillRect(rx + 3, 213 - h2 + 4, 2, 2);
        if (du) txt(c, 'ducking', rx, 200, { size: 8, w: 700, col: C.orange });
      }
    }
  });

  /* ====================================================================
     p4b-lot  (fixed bays, -1 = cone)
     ==================================================================== */
  var BAYX = [70, 156, 242, 328];
  RTSPlay.scene('p4b-lot', {
    W: W, H: H,
    init: function () { return { vis: false, v: [null, null, null, null], frame: '-', score: '?', ptr: -1 }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'bays': S.vis = true; break;
        case 'cones': S.v = [-1, -1, -1, -1]; break;
        case 'frame': S.frame = a.n; S.ptr = -1; break;
        case 'ptr': S.ptr = a.to != null ? a.to : a.i; break;
        case 'set': S.v[a.i] = a.v; break;
        case 'score': S.score = a.v; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'bays': V.visK = EZ.back(lp); V.vis = lp > 0; break;
        case 'cones': V.v = V.v.slice(); V.v.forEach(function (x, i) { if (lp >= (i + 1) / 5) V.v[i] = -1; }); V.pops = V.pops || {}; for (var i = 0; i < 4; i++) V.pops[i] = pulse(seg(lp, (i + .4) / 5, (i + 1.6) / 5)); break;
        case 'frame': V.frame = lp >= .3 ? a.n : S.frame; V.fPop = pulse(seg(lp, .2, 1)); V.ptr = -1; break;
        case 'ptr': V.ptrX = lerp(a.i, a.to != null ? a.to : a.i, EZ.io(seg(lp, .1, 1))); V.ptr = Math.round(V.ptrX); V.ptrK = EZ.back(seg(lp, 0, .5)); break;
        case 'set': {
          var from = S.v[a.i], i = a.i; V.v = V.v.slice(); V.v[i] = lp >= .5 ? a.v : from; V.pops = V.pops || {}; V.pops[i] = pulse(seg(lp, .4, 1));
          if (from === -1 && a.v !== -1) V.drop = { i: i, y: lerp(-40, 0, EZ.bounce(seg(lp, 0, .6))) };
          if (from !== -1 && a.v === -1) V.leave = { i: i, x: -EZ.in(seg(lp, .0, .6)) * 80, al: 1 - seg(lp, .35, .6), v: from };
          if (from !== -1 && a.v !== -1) V.shift = { i: i, x: lerp((from - 2) * 6, (a.v - 2) * 6, EZ.io(seg(lp, 0, .6))) };
          break;
        }
        case 'score': V.score = lp >= .4 ? a.v : S.score; V.sPop = pulse(seg(lp, .3, 1)); V.plus = lp > 0 && lp < 1 ? lp : 0; break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      txt(c, 'frame', 14, 16, { size: 9, col: C.muted2, align: 'left' });
      var fp = 1 + .3 * (V.fPop || 0); c.save(); c.translate(54, 16); c.scale(fp, fp); txt(c, String(V.frame), 0, 0, { size: 14, w: 800, col: C.purple, align: 'left' }); c.restore();
      txt(c, 'score', 322, 16, { size: 9, col: C.muted2, align: 'right' });
      var sp = 1 + .3 * (V.sPop || 0); c.save(); c.translate(332, 16); c.scale(sp, sp); txt(c, String(V.score), 0, 0, { size: 14, w: 800, col: V.score === '?' ? C.muted : C.accent, align: 'left' }); c.restore();
      if (V.plus > 0) txt(c, '+1', 350, 16 - V.plus * 14, { size: 11, w: 800, col: C.accent, al: 1 - V.plus });
      var vk = V.visK == null ? (V.vis ? 1 : 0) : V.visK;
      if (vk > 0) {
        for (var i = 0; i < 4; i++) {
          var cx = BAYX[i], val = V.v[i], pp = 1 + .25 * ((V.pops && V.pops[i]) || 0);
          c.save(); c.globalAlpha = clamp(vk); c.translate(cx, 134); c.scale(vk, vk);
          rrect(c, -37, -44, 74, 88, 4); c.fillStyle = rgba(C.border2, .4); c.fill(); c.lineWidth = 1.5; c.setLineDash([5, 4]); c.strokeStyle = V.ptr === i ? C.accent : C.border2; c.stroke(); c.setLineDash([]);
          if (V.ptr === i) { c.lineWidth = 2; c.strokeStyle = C.accent; rrect(c, -37, -44, 74, 88, 4); c.stroke(); }
          c.fillStyle = rgba(C.yellow, .35); c.fillRect(-24, 38, 48, 2);
          c.restore();
          txt(c, 'obs[' + i + ']', cx, 80, { size: 9.5, w: 700, col: V.ptr === i ? C.accent : C.muted2, al: clamp(vk) });
          c.save(); c.globalAlpha = clamp(vk); c.translate(cx, 134);
          if (val === null) txt(c, '?', 0, -4, { size: 20, w: 800, col: C.muted });
          else if (val === -1) {
            if (!(V.leave && V.leave.i === i && V.leave.al > 0)) { }
            var cs = V.pops && V.pops[i] ? pp : 1; pxScale(c, CONE, 0, -4, 3, ['', C.orange, C.text], cs, cs);
            txt(c, '-1', 0, 28, { size: 12, w: 700, col: C.orange });
          } else {
            var sh = V.shift && V.shift.i === i ? V.shift.x : (val - 2) * 6, dy = V.drop && V.drop.i === i ? V.drop.y : 0;
            pxScale(c, CAR, sh, -6 + dy, 3, ['', C.accent, C.blue, C.ink], 1, 1);
            txt(c, String(val), 0, 28, { size: 14, w: 800, col: C.text, al: 1 }); c.save(); c.restore();
          }
          if (V.leave && V.leave.i === i && V.leave.al > 0) { c.globalAlpha = V.leave.al; pxScale(c, CAR, V.leave.x - 6, -6, 3, ['', C.accent, C.blue, C.ink], 1, 1); }
          c.restore();
        }
        txt(c, '< the player is this way', 14, 196, { size: 8.5, col: C.muted, align: 'left' });
        if (V.ptr >= 0) { var fx = V.ptrX != null ? V.ptrX : V.ptr, px = lerp(BAYX[Math.floor(fx)], BAYX[Math.min(3, Math.ceil(fx))], fx - Math.floor(fx)), k = V.ptrK == null ? 1 : V.ptrK; c.save(); c.translate(px, 70 + 0); c.scale(k, k); c.fillStyle = C.accent; c.beginPath(); c.moveTo(-5, -9); c.lineTo(5, -9); c.lineTo(0, -2); c.fill(); c.restore(); txt(c, 'i = ' + V.ptr, px, 56, { size: 9, w: 700, col: C.accent, al: k }); }
        txt(c, 'car = a column number    cone = -1 = free', 200, 226, { size: 8.5, col: C.muted2 });
      }
    }
  });

  /* ====================================================================
     p4b-states
     ==================================================================== */
  var SB = [{ n: 'MENU', k: 'STATE_MENU = 0', l: 'any key', x: 64 }, { n: 'PLAYING', k: 'STATE_PLAYING = 1', l: 'h', x: 200 }, { n: 'GAME OVER', k: 'STATE_GAME_OVER = 2', l: 'r', x: 336 }];
  var SBY = 118;
  function edgePt(from, to, t) {
    if (from === 0 && to === 1) return [lerp(112, 152, t), SBY];
    if (from === 1 && to === 2) return [lerp(248, 288, t), SBY];
    var u = 1 - t, p0 = [336, SBY + 30], p1 = [268, 214], p2 = [200, SBY + 30]; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  }
  RTSPlay.scene('p4b-states', {
    W: W, H: H,
    init: function () { return { keys: false, cur: -1, st: -1 }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'keys': S.keys = true; break;
        case 'frame': S.cur = a.n; break;
        case 'state': S.st = a.v; break;
        case 'go': S.st = a.to; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'keys': V.keysK = lp; V.keys = lp > 0; break;
        case 'frame': V.cur = a.n; V.curK = pulse(seg(lp, 0, .6)); break;
        case 'state': V.st = lp >= .3 ? a.v : S.st; V.stK = pulse(seg(lp, .2, 1)); V.litK = seg(lp, .2, .7); break;
        case 'look': V.look = pulse(lp); break;
        case 'go': { V.tok = { from: S.st, to: a.to, t: EZ.io(seg(lp, .05, .75)) }; V.st = lp >= .75 ? a.to : S.st; V.stK = pulse(seg(lp, .7, 1)); V.edge = { from: S.st, to: a.to, k: pulse(seg(lp, 0, 1)) }; if (lp <= 0 || lp >= .78) V.tok = null; break; }
        case 'stay': V.stay = pulse(lp); break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      /* keys strip */
      if (V.keys) {
        txt(c, 'keys', 24, 34, { size: 9, col: C.muted2, align: 'left' });
        var ks = '.x.hxr';
        for (var i = 0; i < 6; i++) {
          var x = 62 + i * 46, cur = V.cur === i, pk = cur && V.curK ? 1 + .15 * V.curK : 1;
          txt(c, 'frame ' + i, x + 19, 12, { size: 7, col: cur ? C.text : C.muted });
          c.save(); c.translate(x + 19, 31); c.scale(pk, pk);
          rrect(c, -19, -12, 38, 24, 3); c.fillStyle = cur ? rgba(C.yellow, .25) : rgba(C.border2, .5); c.fill(); c.lineWidth = cur ? 2 : 1; c.strokeStyle = cur ? C.yellow : C.border2; c.stroke();
          txt(c, ks[i], 0, 1, { size: 15, w: 700, col: ks[i] === '.' ? C.muted : C.text }); c.restore();
        }
      }
      /* arrows */
      var ed = V.edge || {}, lit = function (f, t) { return ed.from === f && ed.to === t ? ed.k : 0; };
      arrow(c, lit(0, 1) ? C.accent : C.muted, 114, SBY, 150, SBY, 1.8); txt(c, 'any key', 132, SBY - 10, { size: 8, col: C.muted2 });
      arrow(c, lit(1, 2) ? C.accent : C.muted, 250, SBY, 286, SBY, 1.8); txt(c, 'h', 268, SBY - 10, { size: 8, w: 700, col: C.muted2 });
      c.save(); c.strokeStyle = lit(2, 1) ? C.accent : C.muted; c.lineWidth = 1.8; c.beginPath(); c.moveTo(336, SBY + 29); c.quadraticCurveTo(268, 214, 206, SBY + 32); c.stroke();
      c.fillStyle = c.strokeStyle; c.beginPath(); c.moveTo(201, SBY + 30); c.lineTo(211, SBY + 40); c.lineTo(212, SBY + 28); c.fill(); c.restore();
      txt(c, 'r', 268, 190, { size: 8, w: 700, col: C.muted2 });
      /* boxes */
      SB.forEach(function (b, i) {
        var on = V.st === i, lk = on ? (V.litK == null ? 1 : V.litK) : 0, sy = on && V.stay ? 1 + .06 * V.stay : 1, dim = V.st === -1;
        c.save(); c.translate(b.x, SBY); c.scale(sy, sy);
        rrect(c, -48, -29, 96, 58, 5); c.fillStyle = on ? rgba(C.accent, .22) : C.surface2; c.fill(); c.lineWidth = on ? 2.5 : 1.5; c.strokeStyle = on ? C.accent : C.border2; c.stroke();
        txt(c, b.n, 0, -13, { size: 11, w: 800, col: on ? C.accent : C.muted2 });
        txt(c, b.k, 0, 2, { size: 7, col: on ? C.text : C.muted });
        txt(c, 'waits for: ' + b.l, 0, 17, { size: 7.5, w: on ? 700 : 500, col: on ? C.yellow : C.muted });
        c.restore();
        if (on && V.look > 0) { c.save(); c.globalAlpha = V.look; c.strokeStyle = C.yellow; c.lineWidth = 2; c.setLineDash([4, 3]); rrect(c, b.x - 53, SBY - 34, 106, 68, 6); c.stroke(); c.restore(); }
        if (on && V.stay > 0) txt(c, 'key ignored', b.x, SBY - 42, { size: 8.5, w: 700, col: C.muted2, al: V.stay });
      });
      if (V.look > 0) { var bx = SB[Math.max(V.st, 0)].x; txt(c, 'switch (state)', bx, SBY - 42, { size: 8.5, w: 700, col: C.yellow, al: V.look }); }
      if (V.tok) { var p = edgePt(V.tok.from, V.tok.to, V.tok.t); c.save(); c.translate(p[0], p[1]); c.rotate(PI / 4); c.fillStyle = C.accent; c.fillRect(-5, -5, 10, 10); c.restore(); }
      /* state memory */
      var kk = 1 + .3 * (V.stK || 0), sv = V.st === -1 ? '?' : V.st + '  (' + ['MENU', 'PLAYING', 'GAME OVER'][V.st] + ')';
      c.save(); c.translate(200, 232); rrect(c, -90, -12, 180, 24, 4); c.fillStyle = rgba(C.purple, .12); c.fill(); c.lineWidth = 1.2; c.strokeStyle = rgba(C.purple, .7); c.stroke();
      txt(c, 'state =', -82, 1, { size: 10, col: C.muted2, align: 'left' }); c.scale(kk, kk); txt(c, sv, -36, 1, { size: 11, w: 700, col: V.st === -1 ? C.muted : C.text, align: 'left' }); c.restore();
    }
  });

  /* ====================================================================
     p4b-pass  (const pointer)
     ==================================================================== */
  var FN = { update: { x: 10, y: 10, w: 140, n: 'runner_update', p: '(Runner* r)', t: 'can read and change', col: 'orange' }, render: { x: 250, y: 10, w: 140, n: 'runner_render', p: '(const Runner* r)', t: 'can only look', col: 'blue' } };
  RTSPlay.scene('p4b-pass', {
    W: W, H: H,
    init: function () { return { card: false, f: { score: '?', frame: '?' }, call: null, pass: false }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'card': S.card = true; break;
        case 'field': S.f[a.name] = a.v; break;
        case 'call': S.call = a.fn; S.pass = false; break;
        case 'write': S.f[a.name] = a.v; break;
        case 'pass': S.pass = true; break;
        case 'ret': S.call = null; S.pass = false; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'card': V.cardK = EZ.back(lp); V.card = lp > 0; break;
        case 'field': V.f = Object.assign({}, V.f); V.f[a.name] = lp >= .4 ? a.v : S.f[a.name]; V.hot = { n: a.name, k: pulse(seg(lp, .3, 1)), m: 'set' }; break;
        case 'call': V.call = a.fn; V.callK = EZ.out(seg(lp, 0, .6)); V.pass = false; break;
        case 'write': V.f = Object.assign({}, V.f); V.f[a.name] = lp >= .45 ? a.v : S.f[a.name]; V.hot = { n: a.name, k: pulse(seg(lp, .2, 1)), m: 'write' }; break;
        case 'read': V.hot = { n: a.names, k: pulse(lp), m: 'read' }; break;
        case 'pass': V.pass = true; V.passK = pulse(seg(lp, 0, .8)); break;
        case 'ret': V.retK = 1 - seg(lp, 0, .7); V.call = lp < .7 ? S.call : null; break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      /* function chips */
      Object.keys(FN).forEach(function (k) {
        var f = FN[k], on = V.call === k, col = C[f.col];
        c.save(); c.globalAlpha = on || !V.call ? 1 : .45;
        rrect(c, f.x, f.y, f.w, 56, 4); c.fillStyle = on ? rgba(col, .18) : C.surface2; c.fill(); c.lineWidth = on ? 2.2 : 1.5; c.strokeStyle = on ? col : C.border2; c.stroke();
        txt(c, f.n, f.x + f.w / 2, f.y + 13, { size: 10.5, w: 800, col: on ? C.text : C.muted2 });
        txt(c, f.p, f.x + f.w / 2, f.y + 28, { size: 9, col: on ? col : C.muted2 });
        /* icon + permission */
        var ix = f.x + 14, iy = f.y + 44;
        if (k === 'update') { c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.8; c.beginPath(); c.arc(ix, iy, 3, 0, 7); c.stroke(); c.fillRect(ix + 3, iy - 1, 9, 2); c.fillRect(ix + 9, iy, 2, 3); }
        else { eye(c, C, ix + 2, iy, 0, .5); }
        txt(c, f.t, ix + 18, iy + 1, { size: 8.5, col: on ? C.text : C.muted, align: 'left' });
        c.restore();
      });
      /* the card */
      var ck = V.cardK == null ? (V.card ? 1 : 0) : V.cardK, cx = 200, cy = 140;
      if (ck > 0) {
        c.save(); c.translate(cx, cy); c.scale(ck, ck);
        rrect(c, -62, -44, 124, 96, 5); c.fillStyle = rgba(C.purple, .1); c.fill(); c.lineWidth = 2; c.strokeStyle = rgba(C.purple, .8); c.stroke();
        c.fillStyle = rgba(C.purple, .25); c.fillRect(-60, -42, 120, 20); txt(c, 'Runner r', 0, -32, { size: 11, w: 800, col: C.purple });
        txt(c, 'lives in main', 0, 62, { size: 8, col: C.muted });
        ['score', 'frame'].forEach(function (nm, i) {
          var y = -12 + i * 30, hot = V.hot && (V.hot.n === nm || (Array.isArray(V.hot.n) && V.hot.n.indexOf(nm) >= 0)) ? V.hot : null, hc = hot ? (hot.m === 'write' ? C.orange : hot.m === 'read' ? C.blue : C.accent) : null;
          rrect(c, -52, y - 11, 104, 24, 3); c.fillStyle = hot ? rgba(hc, .12 + .3 * hot.k) : rgba(C.border2, .5); c.fill(); c.lineWidth = hot ? 1 + 1.5 * hot.k : 1; c.strokeStyle = hot ? hc : C.border2; c.stroke();
          txt(c, nm, -44, y + 1, { size: 10, col: C.muted2, align: 'left' });
          txt(c, String(V.f[nm]), 44, y + 1, { size: 15, w: 800, col: V.f[nm] === '?' ? C.muted : C.text, align: 'right' });
          if (hot && hot.m === 'read') eye(c, C, 14, y + 1, 0, .3 + .5 * hot.k);
          if (hot && hot.m === 'write') txt(c, '!', 6, y + 1, { size: 14, w: 800, col: C.orange, al: hot.k });
        });
        c.restore();
      }
      /* pointer arrows */
      if (V.call) {
        var f2 = FN[V.call], col2 = C[f2.col], k2 = V.callK == null ? 1 : V.callK, rk = V.retK == null ? 1 : V.retK;
        var sx = f2.x + f2.w / 2 + (V.call === 'update' ? 10 : -10), sy = f2.y + 56, tx = V.call === 'update' ? 150 : 250, ty = 116;
        var ex = lerp(sx, tx, k2), ey = lerp(sy, ty, k2);
        c.save(); c.globalAlpha = rk; c.fillStyle = col2; c.beginPath(); c.arc(sx, sy, 3.5, 0, 7); c.fill(); arrow(c, col2, sx, sy, ex, ey, 2.2);
        txt(c, 'r', lerp(sx, tx, .45) + (V.call === 'update' ? -9 : 9), lerp(sy, ty, .45), { size: 10, w: 800, col: col2 });
        if (V.pass) { var pk = 1 + .2 * (V.passK || 0); c.translate(lerp(sx, tx, .6), lerp(sy, ty, .6)); c.scale(pk, pk); c.translate(V.call === 'update' ? -40 : 40, 4); rrect(c, -44, -9, 88, 18, 3); c.fillStyle = rgba(C.blue, .2); c.fill(); c.lineWidth = 1; c.strokeStyle = C.blue; c.stroke(); txt(c, 'const = look only', 0, 1, { size: 8.5, w: 700, col: C.text }); }
        c.restore();
      }
      if (V.pass) {
        /* padlock on the card */
        var lx = 258, ly = 126; c.save(); c.translate(lx, ly); c.strokeStyle = C.muted2; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -3, 5, PI, 0); c.stroke(); c.fillStyle = C.yellow; c.fillRect(-8, -3, 16, 12); c.fillStyle = C.ink; c.fillRect(-1.5, 1, 3, 4); c.restore();
      }
    }
  });

  /* ====================================================================
     p4b-link  (two files, one header, one linker)
     ==================================================================== */
  var LROWS = [
    { t: '#include "runner.h"' }, { t: '#pragma once' }, { t: '#define LANE_LEN 50' }, { t: 'typedef struct {...} Runner;' },
    { t: 'int best_score = 0;' }, { t: 'void runner_reset(Runner* r);' }
  ];
  RTSPlay.scene('p4b-link', {
    W: W, H: H,
    init: function () { return { rows: 1, kinds: {}, focus: -1, obj: false, link: 0, fixed: false }; },
    apply: function (S, a) {
      switch (a.a) {
        case 'paste': S.rows = 6; break;
        case 'mark': S.kinds[a.row] = a.kind; S.focus = a.row; break;
        case 'obj': S.obj = true; break;
        case 'link': S.link = 1; S.focus = 4; break;
        case 'fix': S.fixed = true; S.link = 2; S.kinds[4] = 'ok'; break;
      }
    },
    tween: function (V, a, lp, S) {
      switch (a.a) {
        case 'paste': V.rowsF = 1 + 5 * EZ.lin(seg(lp, .1, .9)); break;
        case 'mark': V.kinds = Object.assign({}, V.kinds); V.kinds[a.row] = lp >= .2 ? a.kind : S.kinds[a.row]; V.focus = a.row; V.fk = pulse(seg(lp, 0, 1)); break;
        case 'obj': V.objK = EZ.back(seg(lp, .2, 1)); V.obj = lp > 0; V.focus = -1; break;
        case 'link': V.linkK = lp; V.link = lp > 0 ? 1 : 0; break;
        case 'fix': V.fixK = lp; V.fixed = lp >= .4; V.link = lp >= .7 ? 2 : S.link; V.okK = EZ.back(seg(lp, .7, 1)); if (lp >= .4) V.kinds = Object.assign({}, V.kinds, { 4: 'ok' }); break;
      }
    },
    draw: function (c, V, T, C, rm) {
      bg(c, C, W, H);
      var fixed = V.fixed, fileX = [10, 208], titles = ['main.c', 'runner.c'];
      var rowsF = V.rowsF != null ? V.rowsF : V.rows;
      fileX.forEach(function (fx, fi) {
        win(c, C, fx, 6, 182, 124, titles[fi]);
        for (var r = 0; r < LROWS.length; r++) {
          if (r + 1 > rowsF + .001 && r > 0) continue;
          var ry = 30 + r * 14.5, al = r === 0 ? 1 : clamp(rowsF - r), kind = V.kinds[r], foc = V.focus === r;
          var txtv = LROWS[r].t, col = r === 0 ? C.muted2 : C.text;
          if (r === 4 && fixed) txtv = 'extern int best_score;';
          if (kind === 'bad') col = C.orange; else if (kind === 'ok') col = C.accent; else if (kind === 'shield') col = C.blue;
          if (foc) { c.fillStyle = rgba(kind === 'bad' ? C.orange : C.yellow, .16 + .14 * (V.fk || 0)); c.fillRect(fx + 4, ry - 7, 174, 14); }
          if (kind) { c.fillStyle = col; c.beginPath(); if (kind === 'shield') { c.moveTo(fx + 9, ry - 5); c.lineTo(fx + 14, ry - 3); c.lineTo(fx + 14, ry + 1); c.lineTo(fx + 11.5, ry + 5); c.lineTo(fx + 9, ry + 1); c.closePath(); } else c.arc(fx + 11, ry, 3, 0, 7); c.fill(); }
          txt(c, txtv, fx + 20, ry + .5, { size: 7.8, w: r === 4 ? 700 : 500, col: col, align: 'left', al: al });
        }
        if (fi === 1 && fixed) {
          var ak = clamp(V.fixK == null ? 1 : seg(V.fixK, .3, .7));
          c.fillStyle = rgba(C.accent, .16 * ak); c.fillRect(fx + 4, 30 + 6.6 * 14.5 - 7, 174, 14);
          txt(c, 'int best_score = 0;', fx + 20, 30 + 6.6 * 14.5 + .5, { size: 7.8, w: 700, col: C.accent, align: 'left', al: ak });
          txt(c, 'the one definition', fx + 176, 30 + 6.6 * 14.5 + 12, { size: 7, col: C.accent, align: 'right', al: ak });
        }
      });
      /* arrows + objects */
      var ok = V.objK == null ? (V.obj ? 1 : 0) : V.objK;
      if (ok > 0) {
        fileX.forEach(function (fx, fi) {
          var w = 182, ocx = fx + w / 2;
          arrow(c, rgba(C.muted2, ok), ocx, 133, ocx, 147, 1.6); txt(c, 'compile', ocx + 8, 140, { size: 7, col: C.muted, align: 'left', al: ok });
          c.save(); c.globalAlpha = clamp(ok); rrect(c, fx, 150, w, 40, 4); c.fillStyle = C.surface2; c.fill(); c.lineWidth = 1.5; c.strokeStyle = C.border2; c.stroke();
          txt(c, titles[fi].replace('.c', '.obj'), fx + 8, 160, { size: 8, col: C.muted2, align: 'left' });
          var def = !fixed || fi === 1, col = def ? C.orange : C.muted2;
          rrect(c, fx + 10, 168, 150, 16, 3); c.fillStyle = def ? rgba(col, .25) : 'rgba(0,0,0,0)'; c.fill(); c.lineWidth = 1.2; if (!def) c.setLineDash([3, 3]); c.strokeStyle = col; c.stroke(); c.setLineDash([]);
          txt(c, def ? 'best_score  (defined)' : 'best_score  (just named)', fx + 16, 176.5, { size: 8, w: def ? 700 : 500, col: def ? C.text : C.muted2, align: 'left' });
          c.restore();
        });
      }
      /* linker */
      var lk = V.link, ly = 206;
      rrect(c, 10, ly, 380, 38, 4); c.fillStyle = lk === 1 ? rgba(C.orange, .12) : lk === 2 ? rgba(C.accent, .12) : C.surface2; c.fill(); c.lineWidth = 1.8; c.strokeStyle = lk === 1 ? C.orange : lk === 2 ? C.accent : C.border2; c.stroke();
      txt(c, 'linker', 20, ly + 11, { size: 8.5, col: C.muted2, align: 'left' });
      if (lk === 0) txt(c, 'waits for every .obj, then joins them', 200, ly + 24, { size: 9, col: C.muted });
      if (lk === 1) { var k = V.linkK == null ? 1 : EZ.back(seg(V.linkK, .3, .7)); c.save(); c.translate(200, ly + 22); c.scale(k, k);
        txt(c, 'two best_score found: LNK2005', 0, -3, { size: 11, w: 800, col: C.orange }); txt(c, 'it cannot pick one, so it stops (LNK1169)', 0, 11, { size: 8.5, col: C.text }); c.restore(); }
      if (lk === 2) { var k2 = V.okK == null ? 1 : V.okK; c.save(); c.translate(200, ly + 22); c.scale(clamp(k2, 0, 1.2), clamp(k2, 0, 1.2));
        txt(c, 'one definition: linked', 0, -3, { size: 11, w: 800, col: C.accent }); txt(c, 'every other file just points at it', 0, 11, { size: 8.5, col: C.text }); c.restore(); }
      if (lk === 1 && ok > 0 && V.linkK > 0 && V.linkK < .6) {
        var t = EZ.io(seg(V.linkK, 0, .5));
        [[101, 176], [299, 176]].forEach(function (p, i) { c.fillStyle = C.orange; c.beginPath(); c.arc(lerp(p[0], 200, t), lerp(p[1], 222, t), 5, 0, 7); c.fill(); });
      }
    }
  });
})();
