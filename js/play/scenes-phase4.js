/* =====================================================================
   RTSPlay scene "git-graph"  (phases 1 and 4: Git and your partner)
   =====================================================================
   Self-contained: needs only engine.js. Phase 1's git rung loads this same file.

   The picture: up to three PLACES stacked as bands: your laptop, GitHub, your partner's laptop.
   Commits are dots on a line (lane 0 = main, lane 1 = a feature branch), branches are labelled
   flags on a dot, push / pull send commits flying between bands, a merge conflict is two edits
   colliding on one line, and .gitignore is a filter that files bounce off.

   Every action is { a:'<name>', ...params, at?, len? }.  p = place index (0 you, 1 GitHub, 2 partner).

   STATE ACTIONS (instant result, small pop animation)
     show    { vis:[1,1,1], names:['Your PC','GitHub',"Sam's PC"] }  band weights (0 hides a band, animated) + titles
     world   { p, cs:[[id,col,lane,[parents],{lab,hash,kind,rate}]], br:[[name,commitId,isRemote]],
               head:'main', files:[[name,st]], log:true, big:true, fy:'top'|'bot', tag:'' }
                                      replace place p wholesale (use as the first step to set the scene).
                                      col 0..7 is the x slot; lane 0/1 is the line.
     commit  { p, id, col, lane, par:[ids], hash, lab, kind:'merge'|'ghost', br:name|false }
                                      a new dot; moves the current branch flag onto it (br:false = flag stays)
     branch  { p, n, on }             new branch flag on commit `on`
     switch  { p, n }                 HEAD moves to branch n (its flag fills in)
     flag    { p, n, h, r }           move or create flag n on commit h (r:true = remote-tracking, dashed)
     drop    { p, n }                 delete flag n
     fly     { from, to, ids:[..]|'all', ln:{id:lane}, mv:[[name,commitId,isRemote]] }
                                      copies commits from one band to another as flying dots, then moves flags
     files   { p, list:[[name,st]] }  file chips / cards. st: '??' new, 'M' modified, 'S' staged, 'ok' tracked,
                                      'ign' ignored, 'gone' not on this branch
     tag     { p, t }                 small orange label beside the band title ('' clears)
     rate    { p, id, v:'good'|'vague' }   verdict badge on a log row
     card    { mode:'collide'|'markers'|'fixed'|'off', n:0..5, hl:row, st:true }   merge-conflict file card
     rule    { t:'*.exe' }            adds a pattern to the .gitignore filter bar (needs a big place 0)
     hot     { i }                    highlights rule i
     bounce  { p, name, to:'ign', thru:true, msg }   file card runs at the filter; bounces back (thru: slips through)
   TRANSIENT (animation only)
     hl      { p, id | n | name }     ring pulse on a commit dot, flag, or file chip
     say     { p, t, x }              short label rising inside band p
     ping    { from, to }             a small message flies there and back (git asking GitHub)
   ===================================================================== */
(function () {
  'use strict';
  var U = RTSPlay.util, clamp = U.clamp, lerp = U.lerp, seg = U.seg, EZ = U.EZ, rgba = U.rgba, txt = U.txt, rr = U.rrect, pix = U.pix;
  var W = 400, H = 250, NP = 3;
  var X = function (col) { return 82 + col * 40; };

  function newPlace() { return { cs: [], br: [], head: 'main', files: [], log: false, big: false, fy: 'top', tag: '' }; }
  function mk(it) {
    if (Array.isArray(it)) { var o = { id: it[0], col: it[1], lane: it[2] || 0, par: it[3] || [] }; if (it[4]) for (var k in it[4]) o[k] = it[4][k]; return o; }
    return Object.assign({ par: [], lane: 0 }, it);
  }
  function findC(pl, id) { for (var i = 0; i < pl.cs.length; i++) if (pl.cs[i].id === id) return pl.cs[i]; return null; }
  function addC(pl, it) { var o = findC(pl, it.id); if (o) Object.assign(o, it); else pl.cs.push(it); }
  function setFlag(pl, n, h, r) {
    for (var i = 0; i < pl.br.length; i++) if (pl.br[i].n === n) { pl.br[i].h = h; if (r != null) pl.br[i].r = !!r; return; }
    pl.br.push({ n: n, h: h, r: !!r });
  }
  function flyIds(S, a) {
    var src = S.pl[a.from], dst = S.pl[a.to];
    var ids = a.ids === 'all' ? src.cs.filter(function (c) { return !findC(dst, c.id); }).map(function (c) { return c.id; }) : a.ids.slice();
    return ids.filter(function (id) { return findC(src, id); });
  }
  function flyCopy(S, a, id) {
    var it = JSON.parse(JSON.stringify(findC(S.pl[a.from], id)));
    if (a.ln && a.ln[id] != null) it.lane = a.ln[id];
    if (it.kind === 'ghost') delete it.kind;
    return it;
  }
  function flyFlags(S, a) {
    var dst = S.pl[a.to];
    (a.mv || []).forEach(function (m) { setFlag(dst, m[0], m[1], m[2]); });
    if (a.head) dst.head = a.head;
  }

  /* ---------- layout ---------- */
  function lay(vis) {
    var tot = 0, cnt = 0, i;
    for (i = 0; i < NP; i++) { var w = Math.max(0, vis[i]); tot += w; if (w > .02) cnt++; }
    var gap = 4, avail = H - 4 - gap * Math.max(0, cnt - 1), y = 2, Y = [], Hh = [];
    for (i = 0; i < NP; i++) { var ww = Math.max(0, vis[i]); Y.push(y); var h = tot > 0 ? avail * ww / tot : 0; Hh.push(h); if (ww > .02) y += h + gap; }
    return { y: Y, h: Hh };
  }
  function laneY(y, h, lane) { var base = y + h * .48, gap = clamp(h * .26, 18, 34); return lane ? base + gap : base; }
  var popv = function (V, k) { var v = V.pop && V.pop[k]; return v == null ? 1 : v; };

  /* ---------- chips ---------- */
  function chipStyle(st, C) {
    switch (st) {
      case '??': return { pre: '?? ', fill: null, line: C.muted2, text: C.muted2, dash: true };
      case 'M': return { pre: 'M ', fill: rgba(C.orange, .18), line: C.orange, text: C.orange };
      case 'S': return { pre: 'staged ', fill: rgba(C.accent, .2), line: C.accent, text: C.accent };
      case 'ign': return { pre: '', fill: rgba(C.purple, .16), line: C.purple, text: C.purple, dash: true, strike: true };
      case 'gone': return { pre: '', fill: null, line: C.muted, text: C.muted, dash: true, strike: true };
      default: return { pre: '', fill: rgba(C.text, .07), line: C.border2, text: C.text };
    }
  }
  var BIGLAB = { '??': 'untracked', ok: 'tracked', S: 'staged', ign: 'ignored', gone: 'not on this branch', M: 'changed' };

  var SPEC_ICON = {
    pc: ['01111110', '01000010', '01000010', '01111110', '11111111', '10000001'],
    hub: ['00111000', '01111110', '11111111', '11111111', '01111110']
  };

  RTSPlay.scene('git-graph', {
    W: W, H: H,
    init: function () {
      return { names: ['Your PC', 'GitHub', "Partner's PC"], vis: [1, 1, 1], pl: [newPlace(), newPlace(), newPlace()], card: null, gate: { on: false, rules: [], hot: -1 } };
    },
    apply: apply, tween: tween, draw: draw
  });

  function apply(S, a) {
    var pl = a.p != null ? S.pl[a.p] : null;
    switch (a.a) {
      case 'world': {
        var np = newPlace();
        np.cs = (a.cs || []).map(mk);
        np.br = (a.br || []).map(function (b) { return { n: b[0], h: b[1], r: !!b[2] }; });
        np.head = a.head || 'main';
        np.files = (a.files || []).map(function (f) { return { n: f[0], st: f[1] }; });
        ['log', 'big', 'fy', 'tag'].forEach(function (k) { if (a[k] != null) np[k] = a[k]; });
        S.pl[a.p] = np; break;
      }
      case 'show': if (a.vis) S.vis = a.vis.slice(); if (a.names) S.names = a.names.slice(); break;
      case 'commit':
        addC(pl, mk({ id: a.id, col: a.col, lane: a.lane || 0, par: a.par || [], lab: a.lab, hash: a.hash, kind: a.kind, rate: a.rate }));
        if (a.br !== false) setFlag(pl, a.br || pl.head, a.id);
        break;
      case 'branch': setFlag(pl, a.n, a.on); break;
      case 'switch': pl.head = a.n; break;
      case 'flag': setFlag(pl, a.n, a.h, a.r); break;
      case 'drop': pl.br = pl.br.filter(function (b) { return b.n !== a.n; }); break;
      case 'fly': flyIds(S, a).forEach(function (id) { addC(S.pl[a.to], flyCopy(S, a, id)); }); flyFlags(S, a); break;
      case 'files': pl.files = a.list.map(function (f) { return { n: f[0], st: f[1] }; }); break;
      case 'card': S.card = a.mode === 'off' ? null : { mode: a.mode, n: a.n == null ? 5 : a.n, hl: a.hl == null ? -1 : a.hl, st: !!a.st }; break;
      case 'rule': S.gate.on = true; S.gate.rules.push(a.t); break;
      case 'hot': S.gate.hot = a.i; break;
      case 'tag': pl.tag = a.t || ''; break;
      case 'rate': { var c = findC(pl, a.id); if (c) c.rate = a.v; break; }
      case 'bounce': if (a.to) pl.files.forEach(function (f) { if (f.n === a.name) f.st = a.to; }); break;
    }
  }

  /* ---------- tweens ---------- */
  function tween(V, a, lp, S) {
    V.pop = V.pop || {}; V.fl = V.fl || []; V.hls = V.hls || [];
    var p = a.p;
    switch (a.a) {
      case 'world':
        if (lp >= .2) {
          apply(V, a); var pl = V.pl[p], k = 0;
          pl.cs.forEach(function (c) { V.pop['d' + p + c.id] = seg(lp, .2 + k * .04, .5 + k * .04); k++; });
          pl.br.forEach(function (b) { V.pop['f' + p + b.n] = seg(lp, .4, .8); });
          pl.files.forEach(function (f) { V.pop['c' + p + f.n] = seg(lp, .3, .7); });
        }
        break;
      case 'show': {
        var e = EZ.io(lp); V.vis = S.vis.map(function (v, i) { return lerp(v, a.vis[i], e); });
        if (a.names && lp >= .3) V.names = a.names.slice();
        break;
      }
      case 'commit':
        if (lp >= .3) { apply(V, a); var q = seg(lp, .3, 1); V.pop['d' + p + a.id] = q; V.ring = { p: p, id: a.id, t: q }; }
        break;
      case 'branch': if (lp >= .3) { apply(V, a); V.pop['f' + p + a.n] = seg(lp, .3, 1); } break;
      case 'switch': V.sw = { p: p, from: S.pl[p].head, to: a.n, t: lp }; if (lp >= .5) apply(V, a); break;
      case 'flag': if (lp >= .4) { apply(V, a); V.pop['f' + p + a.n] = seg(lp, .4, 1); } break;
      case 'drop': V.drop = { p: p, n: a.n, t: lp }; if (lp >= 1) apply(V, a); break;
      case 'files':
        if (lp >= .3) {
          var before = {}; S.pl[p].files.forEach(function (f) { before[f.n] = f.st; });
          apply(V, a); V.pl[p].files.forEach(function (f) { if (before[f.n] !== f.st) V.pop['c' + p + f.n] = seg(lp, .3, 1); });
        }
        break;
      case 'tag': if (lp >= .3) apply(V, a); break;
      case 'rate': if (lp >= .3) { apply(V, a); V.pop['r' + p + a.id] = seg(lp, .3, 1); } break;
      case 'rule': if (lp >= .3) { apply(V, a); V.pop['g' + (V.gate.rules.length - 1)] = seg(lp, .3, 1); } break;
      case 'hot': if (lp >= .1) apply(V, a); break;
      case 'bounce': V.bn = { p: p, name: a.name, t: lp, thru: !!a.thru, msg: a.msg || '' }; if (lp >= .5) apply(V, a); break;
      case 'hl': V.hls.push({ p: p, id: a.id, n: a.n, name: a.name, t: lp }); break;
      case 'say': V.say = { p: p, t: a.t, x: a.x, lp: lp }; break;
      case 'ping': V.pg = { from: a.from, to: a.to, t: lp }; break;
      case 'card': {
        if (a.mode === 'off') { if (S.card) { V.card = S.card; V.cardA = 1 - lp; if (lp >= 1) V.card = null; } }
        else { if (lp > 0) apply(V, a); V.cardK = S.card && S.card.mode === a.mode ? 1 : lp; V.cardA = S.card ? 1 : seg(lp, 0, .2); if (lp <= 0) V.card = S.card; }
        break;
      }
      case 'fly': {
        var ids = flyIds(S, a), n = ids.length, dur = .62, step = n > 1 ? (1 - dur - .12) / (n - 1) : 0;
        ids.forEach(function (id, i) {
          var t = seg(lp, i * step, i * step + dur);
          if (t > 0 && t < 1) V.fl.push({ id: id, from: a.from, to: a.to, t: t, col: findC(S.pl[a.from], id).col, laneS: findC(S.pl[a.from], id).lane, laneD: a.ln && a.ln[id] != null ? a.ln[id] : findC(S.pl[a.from], id).lane, ghost: findC(S.pl[a.from], id).kind === 'ghost' });
          if (t >= 1) { addC(V.pl[a.to], flyCopy(S, a, id)); V.pop['d' + a.to + id] = seg(lp, i * step + dur, i * step + dur + .12); }
        });
        if (lp >= .9) { flyFlags(V, a); (a.mv || []).forEach(function (m) { V.pop['f' + a.to + m[0]] = seg(lp, .9, 1); }); }
        break;
      }
    }
  }

  /* ---------- drawing ---------- */
  var laneCol = function (lane, C) { return lane ? C.purple : C.accent; };

  function draw(c, V, T, C, rm) {
    U.bg(c, C, W, H);
    var L = lay(V.vis);
    V.rect = {}; V.dots = {}; V.flg = {};
    var i;
    for (i = 0; i < NP; i++) if (L.h[i] > 12) band(c, V, C, L, i);
    for (i = 0; i < NP; i++) if (L.h[i] > 12) content(c, V, T, C, rm, L, i);
    gate(c, V, T, C, rm, L);
    flights(c, V, T, C, rm, L);
    bounceDraw(c, V, C, L);
    pulses(c, V, C, L);
    transient(c, V, T, C, rm, L);
    if (V.card) cardDraw(c, V, C, T, rm);
  }

  function band(c, V, C, L, p) {
    var y = L.y[p], h = L.h[p], al = clamp(V.vis[p] * 2.5);
    c.save(); c.globalAlpha = al;
    rr(c, 6, y, W - 12, h, 6); c.fillStyle = rgba(C.bg, .55); c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1; c.stroke();
    c.restore();
  }

  function content(c, V, T, C, rm, L, p) {
    var pl = V.pl[p], y = L.y[p], h = L.h[p], al = clamp(V.vis[p] * 2.5), name = V.names[p] || '';
    c.save(); c.globalAlpha = al;
    pix(c, p === 1 ? SPEC_ICON.hub : SPEC_ICON.pc, 14, y + 4, 2, ['', p === 1 ? C.purple : C.accent], 1);
    txt(c, name.toUpperCase(), 34, y + 10, { size: 8.5, w: 700, col: C.muted2, align: 'left' });
    var tx = 34 + name.length * 5.1 + 8;
    if (pl.tag) {
      var tw = pl.tag.length * 5 + 10;
      rr(c, tx, y + 4, tw, 12, 3); c.fillStyle = rgba(C.orange, .2); c.fill(); c.strokeStyle = C.orange; c.lineWidth = 1; c.stroke();
      txt(c, pl.tag, tx + tw / 2, y + 10.5, { size: 8, w: 700, col: C.orange }); tx += tw + 6;
    }
    var locals = pl.br.filter(function (b) { return !b.r; }).length;
    if (locals > 1 && !pl.big) txt(c, 'filled flag = you are here', tx, y + 10, { size: 7.5, col: C.muted, align: 'left' });

    if (pl.log) logDraw(c, V, C, pl, p, y, h);
    else if (pl.cs.length) graphDraw(c, V, T, C, rm, pl, p, y, h);
    else if (!pl.big && !pl.files.length) txt(c, 'nothing here yet', W / 2, y + h / 2 + 4, { size: 9.5, col: C.muted });

    if (pl.big) bigFiles(c, V, C, pl, p, y, h); else chipRow(c, V, C, pl, p, y);
    c.restore();
  }

  function chipRow(c, V, C, pl, p, y) {
    var fs = 8, ws = pl.files.map(function (f) { return (chipStyle(f.st, C).pre + f.n).length * fs * .6 + 10; });
    var total = ws.reduce(function (a, b) { return a + b + 4; }, -4), x = W - 14 - total;
    pl.files.forEach(function (f, i) {
      var st = chipStyle(f.st, C), pp = popv(V, 'c' + p + f.n), w = ws[i], cy = y + 10;
      c.save(); c.translate(x + w / 2, cy); var s = EZ.back(pp); c.scale(s, s);
      rr(c, -w / 2, -7, w, 14, 4);
      if (st.fill) { c.fillStyle = st.fill; c.fill(); }
      c.strokeStyle = st.line; c.lineWidth = 1; if (st.dash) c.setLineDash([3, 2]); c.stroke(); c.setLineDash([]);
      txt(c, st.pre + f.n, 0, 0.5, { size: fs, w: 600, col: st.text });
      if (st.strike) { c.strokeStyle = st.text; c.beginPath(); c.moveTo(-w / 2 + 5, 0.5); c.lineTo(w / 2 - 5, 0.5); c.stroke(); }
      c.restore();
      V.rect[p + ':' + f.n] = { x: x, y: cy - 7, w: w, h: 14 };
      x += w + 4;
    });
  }

  function bigFiles(c, V, C, pl, p, y, h) {
    var bn = V.bn, gateY = y + h - 13;
    pl.files.forEach(function (f, i) {
      var col = i % 4, row = Math.floor(i / 4), x = 12 + col * 95, w = 88, ch = 23;
      var cy = pl.fy === 'bot' ? y + h - 44 - (Math.ceil(pl.files.length / 4) - 1 - row) * 38 : y + 26 + row * 38;
      var st = chipStyle(f.st, C), pp = popv(V, 'c' + p + f.n), dy = 0, flash = 0;
      if (bn && bn.p === p && bn.name === f.n) {
        var d = gateY - 14 - (cy + ch) + (bn.thru ? 30 : 0), t = bn.t, tri = t < .5 ? EZ.out(t * 2) : 1 - EZ.in((t - .5) * 2);
        dy = d * tri; flash = bn.thru ? 0 : Math.max(0, 1 - Math.abs(t - .5) * 6);
      }
      c.save(); c.translate(x + w / 2, cy + ch / 2 + dy); var s = EZ.back(pp); c.scale(s, s);
      if (flash > 0) c.translate(Math.sin(flash * 40) * 2 * flash, 0);
      rr(c, -w / 2, -ch / 2, w, ch, 4);
      if (st.fill) { c.fillStyle = st.fill; c.fill(); }
      c.strokeStyle = flash > 0 ? C.orange : st.line; c.lineWidth = flash > 0 ? 2 : 1.2; if (st.dash) c.setLineDash([4, 3]); c.stroke(); c.setLineDash([]);
      txt(c, f.n, 0, 1, { size: 9.5, w: 600, col: st.text });
      if (st.strike) { c.strokeStyle = st.text; c.globalAlpha *= .7; c.beginPath(); c.moveTo(-w / 2 + 6, 1); c.lineTo(w / 2 - 6, 1); c.stroke(); }
      c.restore();
      if (!dy) txt(c, BIGLAB[f.st] || '', x + w / 2, cy + ch + 8, { size: 7.5, col: C.muted, al: clamp(pp) });
      V.rect[p + ':' + f.n] = { x: x, y: cy + dy, w: w, h: ch };
    });
  }

  function logDraw(c, V, C, pl, p, y, h) {
    var n = pl.cs.length, rowH = h > 150 ? 32 : 26, y0 = y + 34, x0 = 28;
    var last = n - 1;
    c.save(); c.strokeStyle = C.border2; c.lineWidth = 2; c.beginPath();
    c.moveTo(x0, y0); c.lineTo(x0, y0 + (n - 1) * rowH - 2); c.stroke(); c.restore();
    pl.cs.forEach(function (cm, i) {
      var ri = last - i, yy = y0 + ri * rowH;
      var isNew = V.ring && V.ring.p === p && V.ring.id === cm.id;
      var t = V.ring && V.ring.p === p ? V.ring.t : 1;
      if (V.ring && V.ring.p === p) yy = y0 + (ri - (1 - t)) * rowH;
      var al = isNew ? clamp(t * 1.5) : 1;
      c.save(); c.globalAlpha *= al;
      var hl = V.hls.filter(function (q) { return q.p === p && q.id === cm.id; })[0];
      if (hl) { rr(c, 14, yy - 11, W - 28, 22, 4); c.fillStyle = rgba(C.accent, .14 * Math.sin(Math.PI * hl.t)); c.fill(); }
      c.beginPath(); c.arc(x0, yy, 5, 0, 7); c.fillStyle = C.accent; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 1; c.stroke();
      var hash = cm.hash || cm.id;
      txt(c, hash, 42, yy, { size: 9.5, w: 700, col: C.accent, align: 'left' });
      txt(c, cm.lab || '', 42 + hash.length * 5.7 + 8, yy, { size: 9.5, col: C.text, align: 'left' });
      c.restore();
      if (cm.rate) {
        var rp = popv(V, 'r' + p + cm.id), good = cm.rate === 'good', col = good ? C.accent : C.orange, bw = 38;
        c.save(); c.translate(W - 14 - bw / 2, yy + 12); var s = EZ.back(rp); c.scale(s, s);
        rr(c, -bw / 2, -5.5, bw, 11, 3); c.fillStyle = rgba(col, .2); c.fill(); c.strokeStyle = col; c.lineWidth = 1; c.stroke();
        txt(c, good ? 'clear' : 'vague', 0, .5, { size: 7.5, w: 700, col: col }); c.restore();
      }
      V.dots[p + cm.id] = { x: x0, y: yy };
    });
  }

  function graphDraw(c, V, T, C, rm, pl, p, y, h) {
    var byId = {}; pl.cs.forEach(function (it) { byId[it.id] = it; });
    pl.cs.forEach(function (it) {
      var s = popv(V, 'd' + p + it.id); if (s <= .02) return;
      var x = X(it.col), yy = laneY(y, h, it.lane);
      it.par.forEach(function (pid) {
        var pr = byId[pid]; if (!pr) return;
        var px = X(pr.col), py = laneY(y, h, pr.lane);
        c.save(); c.globalAlpha *= Math.min(1, s * 1.6); c.lineWidth = 2.2; c.lineCap = 'round';
        c.strokeStyle = rgba(laneCol(Math.max(it.lane, pr.lane), C), .8); c.beginPath(); c.moveTo(px, py);
        if (pr.lane === it.lane) c.lineTo(x, yy); else c.bezierCurveTo(px + 16, py, x - 16, yy, x, yy);
        c.stroke(); c.restore();
      });
    });
    pl.cs.forEach(function (it) {
      var s = popv(V, 'd' + p + it.id); if (s <= .02) return;
      var x = X(it.col), yy = laneY(y, h, it.lane), col = laneCol(it.lane, C), k = EZ.back(s);
      V.dots[p + it.id] = { x: x, y: yy };
      c.save(); c.translate(x, yy); c.scale(k, k);
      if (it.kind === 'ghost') {
        c.beginPath(); c.arc(0, 0, 5.5, 0, 7); c.setLineDash([2, 2]); c.strokeStyle = col; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]);
      } else {
        if (it.kind === 'merge') { c.beginPath(); c.arc(0, 0, 8.5, 0, 7); c.strokeStyle = C.yellow; c.lineWidth = 1.5; c.stroke(); }
        c.beginPath(); c.arc(0, 0, 5.5, 0, 7); c.fillStyle = col; c.fill(); c.lineWidth = 1.2; c.strokeStyle = C.ink; c.stroke();
      }
      c.restore();
      if (V.ring && V.ring.p === p && V.ring.id === it.id && V.ring.t < 1) {
        c.save(); c.globalAlpha = 1 - V.ring.t; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(x, yy, 6 + V.ring.t * 14, 0, 7); c.stroke(); c.restore();
      }
    });
    flags(c, V, T, C, rm, pl, p, y, h, byId);
  }

  function flags(c, V, T, C, rm, pl, p, y, h, byId) {
    var groups = {};
    pl.br.forEach(function (b) { if (byId[b.h]) (groups[b.h] = groups[b.h] || []).push(b); });
    Object.keys(groups).forEach(function (hid) {
      var cm = byId[hid], list = groups[hid].slice().sort(function (a, b) { return (a.r ? 1 : 0) - (b.r ? 1 : 0); });
      var fs = 8, ws = list.map(function (b) { return b.n.length * fs * .6 + 9; }), total = ws.reduce(function (a, b) { return a + b + 3; }, -3);
      var cx = X(cm.col), cy = laneY(y, h, cm.lane), x = clamp(cx - total / 2, 12, W - 12 - total), fy = cy + (cm.lane ? 14 : -14);
      var lcol = laneCol(cm.lane, C);
      list.forEach(function (b, i) {
        var w = ws[i], pp = popv(V, 'f' + p + b.n), dr = V.drop && V.drop.p === p && V.drop.n === b.n ? V.drop.t : 0;
        var hot = !b.r && b.n === pl.head ? 1 : 0;
        if (V.sw && V.sw.p === p && !b.r) { if (b.n === V.sw.to) hot = V.sw.t; else if (b.n === V.sw.from) hot = 1 - V.sw.t; else hot = 0; }
        var s = EZ.back(pp) * (1 - dr), fx = x + w / 2;
        if (s > .02) {
          c.save(); c.translate(fx, fy); c.scale(s, s); c.globalAlpha *= 1 - dr;
          rr(c, -w / 2, -5.5, w, 11, 4);
          if (b.r) { c.setLineDash([2, 2]); c.strokeStyle = C.muted2; c.lineWidth = 1; c.stroke(); c.setLineDash([]); txt(c, b.n, 0, .5, { size: fs, w: 600, col: C.muted2 }); }
          else {
            c.fillStyle = hot > 0 ? rgba(lcol, .15 + .85 * hot) : rgba(lcol, .12); c.fill(); c.strokeStyle = lcol; c.lineWidth = 1; c.stroke();
            txt(c, b.n, 0, .5, { size: fs, w: 700, col: hot > .5 ? C.ink : lcol });
          }
          c.restore();
        }
        V.flg[p + ':' + b.n] = { x: fx, y: fy };
        x += w + 3;
      });
    });
  }

  function gate(c, V, T, C, rm, L) {
    var g = V.gate; if (!g || !g.on) return;
    var y = L.y[0], h = L.h[0], gy = y + h - 13, al = clamp(V.vis[0] * 2.5);
    c.save(); c.globalAlpha = al;
    c.strokeStyle = rgba(C.purple, .7); c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(12, gy); c.lineTo(W - 12, gy); c.stroke(); c.setLineDash([]);
    txt(c, '.gitignore', 14, gy - 0, { size: 8, w: 700, col: C.purple, align: 'left', base: 'middle' });
    var x = 14 + 10 * 4.8 + 8;
    g.rules.forEach(function (r, i) {
      var w = r.length * 5.2 + 10, pp = popv(V, 'g' + i), hot = g.hot === i;
      c.save(); c.translate(x + w / 2, gy); var s = EZ.back(pp); c.scale(s, s);
      rr(c, -w / 2, -7, w, 14, 4); c.fillStyle = hot ? C.purple : C.surface; c.fill(); c.strokeStyle = C.purple; c.lineWidth = 1.2; c.stroke();
      txt(c, r, 0, .5, { size: 8.5, w: 700, col: hot ? C.ink : C.purple }); c.restore();
      V.rect['g' + i] = { x: x, y: gy - 7, w: w, h: 14 };
      x += w + 6;
    });
    c.restore();
  }

  function flights(c, V, T, C, rm, L) {
    (V.fl || []).forEach(function (f) {
      var xs = X(f.col), ys = laneY(L.y[f.from], L.h[f.from], f.laneS), yd = laneY(L.y[f.to], L.h[f.to], f.laneD);
      var t = EZ.io(f.t), x = xs + Math.sin(Math.PI * t) * 12, y = lerp(ys, yd, t), col = laneCol(f.laneD, C);
      for (var k = 4; k >= 1; k--) { var tt = EZ.io(Math.max(0, f.t - k * .05)); c.beginPath(); c.arc(xs + Math.sin(Math.PI * tt) * 12, lerp(ys, yd, tt), 5.5 - k * .8, 0, 7); c.fillStyle = rgba(col, .18); c.fill(); }
      c.beginPath(); c.arc(x, y, 6, 0, 7); c.fillStyle = col; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.arc(x, y, 9, 0, 7); c.strokeStyle = rgba(col, .45); c.lineWidth = 1; c.stroke();
    });
    var g = V.pg; if (g && g.t > 0 && g.t < 1) {
      var ys2 = laneY(L.y[g.from], L.h[g.from], 0), yd2 = laneY(L.y[g.to], L.h[g.to], 0), t2 = g.t < .5 ? EZ.io(g.t * 2) : 1 - EZ.io((g.t - .5) * 2), px = 340, py = lerp(ys2, yd2, t2);
      c.save(); c.translate(px, py); rr(c, -8, -5.5, 16, 11, 2); c.fillStyle = g.t < .5 ? C.yellow : C.blue; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 1; c.stroke();
      c.beginPath(); c.moveTo(-8, -5.5); c.lineTo(0, 1); c.lineTo(8, -5.5); c.stroke(); c.restore();
      txt(c, g.t < .5 ? 'anything new?' : 'no, same as you', px - 14, py, { size: 8, col: C.muted2, align: 'right', al: 1 });
    }
  }

  function bounceDraw(c, V, C, L) {
    var b = V.bn; if (!b || b.t <= 0 || b.t >= 1) return;
    var r = V.rect[b.p + ':' + b.name]; if (!r) return;
    var gy = L.y[b.p] + L.h[b.p] - 13;
    if (!b.thru) {
      var f = seg(b.t, .42, .9); if (f > 0 && f < 1) {
        c.save(); c.globalAlpha = 1 - f; c.strokeStyle = C.orange; c.lineWidth = 2;
        var cx = r.x + r.w / 2;
        for (var k = 0; k < 6; k++) { var an = -Math.PI + k * Math.PI / 5, d1 = 4 + f * 4, d2 = 8 + f * 12; c.beginPath(); c.moveTo(cx + Math.cos(an) * d1, gy - 4 + Math.sin(an) * d1); c.lineTo(cx + Math.cos(an) * d2, gy - 4 + Math.sin(an) * d2); c.stroke(); }
        c.restore();
      }
      txt(c, b.msg || 'blocked', r.x + r.w / 2, gy - 38, { size: 8.5, w: 700, col: C.orange, al: seg(b.t, .35, .5) * (1 - seg(b.t, .85, 1)) });
    } else {
      txt(c, b.msg || 'still tracked', r.x + r.w / 2, gy + 18, { size: 8.5, w: 700, col: C.yellow, al: seg(b.t, .3, .5) * (1 - seg(b.t, .85, 1)) });
    }
  }

  function pulses(c, V, C, L) {
    (V.hls || []).forEach(function (q) {
      if (q.t <= 0 || q.t >= 1) return;
      var pt = null, r = 7;
      if (q.id != null) pt = V.dots[q.p + q.id]; else if (q.n != null) { pt = V.flg[q.p + ':' + q.n]; r = 14; } else if (q.name != null) { var rc = V.rect[q.p + ':' + q.name]; if (rc) { rr(c, rc.x - 3 - q.t * 4, rc.y - 3 - q.t * 4, rc.w + 6 + q.t * 8, rc.h + 6 + q.t * 8, 6); c.save(); c.globalAlpha = 1 - q.t; c.strokeStyle = C.yellow; c.lineWidth = 2; c.stroke(); c.restore(); return; } }
      if (!pt) return;
      c.save(); c.globalAlpha = 1 - q.t; c.strokeStyle = C.yellow; c.lineWidth = 2;
      if (q.n != null) { rr(c, pt.x - 22 - q.t * 4, pt.y - 8 - q.t * 3, 44 + q.t * 8, 16 + q.t * 6, 6); c.stroke(); }
      else if (V.pl[q.p].log) { }
      else { c.beginPath(); c.arc(pt.x, pt.y, r + q.t * 12, 0, 7); c.stroke(); }
      c.restore();
    });
  }

  function transient(c, V, T, C, rm, L) {
    var s = V.say; if (s && s.lp > 0 && s.lp < 1) {
      var y = L.y[s.p] + L.h[s.p] * .68 - 10 * EZ.out(s.lp), x = s.x == null ? 270 : s.x, w = s.t.length * 5.4 + 14, al = seg(s.lp, 0, .15) * (1 - seg(s.lp, .8, 1));
      c.save(); c.globalAlpha = al; rr(c, x - w / 2, y - 8, w, 16, 5); c.fillStyle = rgba(C.bg, .92); c.fill(); c.strokeStyle = C.accent; c.lineWidth = 1; c.stroke();
      txt(c, s.t, x, y + .5, { size: 9, w: 700, col: C.accent }); c.restore();
    }
  }

  function cardDraw(c, V, C, T, rm) {
    var cd = V.card, K = V.cardK == null ? 1 : V.cardK, A = V.cardA == null ? 1 : V.cardA;
    c.save(); c.globalAlpha = A * .72; c.fillStyle = C.bg; c.fillRect(0, 0, W, H); c.restore();
    var x = 62, y = 48, w = 276, h = 150;
    c.save(); c.globalAlpha = A;
    rr(c, x, y, w, h, 7); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1.5; c.stroke();
    rr(c, x, y, w, 20, 7); c.fillStyle = rgba(C.text, .08); c.fill();
    [C.orange, C.yellow, C.accent].forEach(function (cl, i) { c.beginPath(); c.arc(x + 12 + i * 10, y + 10, 3, 0, 7); c.fillStyle = cl; c.fill(); });
    txt(c, 'runner.c', x + w / 2, y + 10.5, { size: 9.5, w: 700, col: C.muted2 });
    var r0 = y + 40, rh = 20;
    var rows = [['<<<<<<< HEAD', C.muted2, null], ['#define FRAME_MS 20', C.accent, 'yours'], ['=======', C.muted2, null], ['#define FRAME_MS 16', C.orange, 'theirs'], ['>>>>>>> cb284f6', C.muted2, null]];
    if (cd.mode === 'collide') {
      txt(c, '// timing', x + 14, r0 - 4, { size: 10, col: C.muted, align: 'left' });
      var ly = r0 + 16;
      rr(c, x + 8, ly - 11, w - 16, 22, 4); c.fillStyle = rgba(C.yellow, .1); c.fill(); c.strokeStyle = rgba(C.yellow, .6); c.lineWidth = 1; c.stroke();
      txt(c, '#define FRAME_MS 33', x + 16, ly, { size: 10.5, col: C.text, align: 'left', al: 1 - seg(K, .5, .6) * .75 });
      var m = seg(K, .05, .55), e = EZ.out(m), cx = x + w / 2, sh = seg(K, .55, .85) * Math.sin(K * 60) * 2.5 * (1 - seg(K, .8, 1));
      var lx = lerp(x - 40, cx - 36, e) + sh, rx = lerp(x + w + 40, cx + 36, e) - sh;
      [[lx, 'you: 20', C.accent], [rx, 'partner: 16', C.orange]].forEach(function (q) {
        var tw = q[1].length * 6 + 12; c.save(); c.translate(q[0], ly - 28 * (1 - e) * 0 + 0); rr(c, -tw / 2, -9, tw, 18, 5); c.fillStyle = q[2]; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 1.2; c.stroke();
        txt(c, q[1], 0, .5, { size: 9.5, w: 700, col: C.ink }); c.restore();
      });
      var st = seg(K, .55, .8);
      if (st > 0) { var sc = EZ.back(st); c.save(); c.translate(cx, ly + 36); c.rotate(-.06); c.scale(sc, sc); rr(c, -62, -12, 124, 24, 4); c.strokeStyle = C.orange; c.lineWidth = 2; c.stroke(); txt(c, 'CONFLICT', 0, 1, { size: 14, w: 800, col: C.orange }); c.restore();
        txt(c, 'same line, two different edits', cx, ly + 64, { size: 8.5, col: C.muted2, al: seg(K, .8, 1) }); }
    } else if (cd.mode === 'markers') {
      txt(c, '// timing', x + 14, r0 - 4, { size: 10, col: C.muted, align: 'left' });
      rows.forEach(function (rw, i) {
        if (i >= cd.n) return;
        var yy = r0 + 12 + i * rh, hl = cd.hl === i;
        if (rw[2]) { rr(c, x + 8, yy - 9, w - 16, 18, 3); c.fillStyle = rgba(rw[1], .13); c.fill(); }
        if (hl) { rr(c, x + 6, yy - 10, w - 12, 20, 4); c.strokeStyle = C.yellow; c.lineWidth = 1.5; c.stroke(); }
        txt(c, rw[0], x + 16, yy, { size: 10, col: rw[1], align: 'left', w: rw[2] ? 700 : 500 });
        if (rw[2]) txt(c, rw[2], x + w - 14, yy, { size: 8, w: 700, col: rw[1], align: 'right' });
      });
      if (cd.n === 0) txt(c, '...', x + 16, r0 + 12, { size: 12, col: C.muted, align: 'left' });
    } else if (cd.mode === 'fixed') {
      txt(c, '// timing', x + 14, r0 - 4, { size: 10, col: C.muted, align: 'left' });
      rows.forEach(function (rw, i) {
        if (i === 3) return;
        var yy = r0 + 12 + i * rh, a = 1 - K;
        if (a <= 0) return;
        c.save(); c.globalAlpha *= a; if (rw[2]) { rr(c, x + 8, yy - 9, w - 16, 18, 3); c.fillStyle = rgba(rw[1], .13); c.fill(); }
        txt(c, rw[0], x + 16, yy, { size: 10, col: rw[1], align: 'left' }); c.restore();
      });
      var ky = lerp(r0 + 12 + 3 * rh, r0 + 12, EZ.io(seg(K, .25, 1)));
      rr(c, x + 8, ky - 9, w - 16, 18, 3); c.fillStyle = rgba(C.accent, .14 * seg(K, .5, 1)); c.fill();
      txt(c, '#define FRAME_MS 16', x + 16, ky, { size: 10, w: 700, col: K > .6 ? C.accent : C.orange, align: 'left' });
      txt(c, 'one line left, no markers', x + w / 2, y + h - 36, { size: 8.5, col: C.muted2, al: seg(K, .6, 1) });
      if (cd.st) { var pw = 62; rr(c, x + w - pw - 10, y + h - 24, pw, 15, 4); c.fillStyle = rgba(C.accent, .22); c.fill(); c.strokeStyle = C.accent; c.lineWidth = 1; c.stroke(); txt(c, 'staged', x + w - pw / 2 - 10, y + h - 16, { size: 8.5, w: 700, col: C.accent }); }
    }
    c.restore();
  }
})();
