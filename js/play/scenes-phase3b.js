/* =====================================================================
   RTSPlay scenes for Phase 3b (Pointers & Structs)
   =====================================================================
   Register with RTSPlay.scene(). Every action is { a:'<name>', ...params, at?, len? }.
   Canvas is 400x250 logical px. Colours are palette tokens only.

   ---------------------------------------------------------------------
   SCENE "p3b-struct"  (cards = structs: one form with labelled fields)
     frame  { id, t, x, y, w, h }          dashed zone with a label (e.g. "main()"); { id, off:true } removes it
     card   { id, title, sub, fields:[[type,name,value|null],...], x, y, w, kind:'bp'|'real', col, copy:'<id>' }
                                           a card appears. kind 'bp' = dashed blueprint. null value = "?" (garbage).
                                           copy:'<id>' = photocopy: fields are copied from that card, a scan bar sweeps it
     set    { id, f, v, exp }              field f (0-based) becomes v; exp = caption such as "hero.health = 100"
     pulse  { id, f? }                     a row (or the whole card) flashes
     drop   { id }                         card fades away (a copy being thrown away)

   SCENE "p3b-mem"  (memory as addressed boxes; pointers are arrows)
     frame  { id, t, x, y, w, h }          dashed function/stack-frame zone; { id, off:true } removes
     cell   { id, kind:'int'|'ptr'|'group', name, type, addr, v, x, y, w, h, col, side, bow, to, pv, nul }
                                           a box appears. to:'<id>' = pointer arrow to that box, pv = text shown in the pointer
                                           (e.g. "0x1000"). nul:true = a NULL pointer (no arrow, dead-end stub)
     point  { id, to, pv }                 point an existing pointer at a box (the arrow draws in)
     nul    { id }                         make a pointer NULL (arrow retracts)
     set    { id, v, from? }               a box takes a new value; from:'<id>' flies a copy of that box's value in
     deref  { p, v?, to?, lbl? }           "*p": a token follows the arrow; v = write v into the target (to = a box inside the target)
     tag    { id, t, col? }                a bubble over a box for a moment
     pulse  { id }                         a box flashes
     cap    { t }                          top caption (empty string = default heading)
     hide   { ids:[..], fr:[..] }          boxes / frames fade away (function returns)

   SCENE "p3b-dial"   enum names on a rotary dial + list      (names {n}, needle {to}, lives {v}, chk {t,r}, hl {row,sweep}, ints, pulse {row})
   SCENE "p3b-debug"  debugger window (code, Locals, Call Stack, keys)   (key {k}, bp {on}, go {to,line}, arrow {to,via}, locals {title,rows,hot}, stack {rows,sel})
   SCENE "p3b-files"  header sheets pasted into .c sheets      (show {sheet}, hl {sheet,rows}, paste {sheet}, call {}, build {})
   SCENE "p3b-link"   compile to .obj, link by name (LNK2019)  (cmd {t,main,player}, compile {f}, scan {}, err {n}, clear {}, link {})
   ===================================================================== */
(function () {
'use strict';
const U = RTSPlay.util, clamp = U.clamp, lerp = U.lerp, seg = U.seg, EZ = U.EZ, rgba = U.rgba, txt = U.txt, rrect = U.rrect, FONT = U.FONT;
const W = 400, H = 250;
const find = (arr, id) => { for (let i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; };
const remove = (arr, id) => { const i = arr.findIndex(o => o.id === id); if (i >= 0) arr.splice(i, 1); };

function parts(c, ps, x, y, align) {          // ps: [[text, colour, size, weight], ...] laid out left to right
  let tot = 0; const ws = ps.map(p => { c.font = (p[3] || 500) + ' ' + (p[2] || 10) + 'px ' + FONT; const w = c.measureText(p[0]).width; tot += w; return w; });
  let cx = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x;
  c.save(); c.textAlign = 'left'; c.textBaseline = 'middle';
  ps.forEach((p, i) => { c.font = (p[3] || 500) + ' ' + (p[2] || 10) + 'px ' + FONT; c.fillStyle = p[1]; c.fillText(p[0], cx, y); cx += ws[i]; });
  c.restore(); return tot;
}
function bubble(c, C, s, x, y, col, al, size, flip) {   // little speech chip centred on x; tail tip at y (chip above, or below when flip)
  size = size || 9.5; c.save(); c.globalAlpha *= clamp(al == null ? 1 : al); c.font = '700 ' + size + 'px ' + FONT;
  const w = c.measureText(s).width + 14, h = size + 9, top = flip ? y + 4 : y - h - 4;
  rrect(c, x - w / 2, top, w, h, 4); c.fillStyle = C.surface2; c.fill(); c.lineWidth = 1.25; c.strokeStyle = col; c.stroke();
  c.beginPath(); if (flip) { c.moveTo(x - 3.5, top + .5); c.lineTo(x + 3.5, top + .5); c.lineTo(x, y); } else { c.moveTo(x - 3.5, top + h - .5); c.lineTo(x + 3.5, top + h - .5); c.lineTo(x, y); } c.closePath(); c.fillStyle = col; c.fill();
  txt(c, s, x, top + h / 2 + .5, { size, w: 700, col }); c.restore();
}
function frameDraw(c, C, f, al) {
  c.save(); c.globalAlpha *= clamp(al == null ? 1 : al);
  rrect(c, f.x, f.y, f.w, f.h, 5); c.fillStyle = rgba(C.border, .22); c.fill();
  c.setLineDash([4, 4]); c.strokeStyle = C.border2; c.lineWidth = 1.25; c.stroke(); c.setLineDash([]);
  txt(c, f.t, f.x + 8, f.y + 9, { size: 9, w: 700, col: C.muted2, align: 'left' }); c.restore();
}
const B = (p0, c1, p1, t) => { const u = 1 - t; return [u * u * p0[0] + 2 * u * t * c1[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c1[1] + t * t * p1[1]]; };
function arrowHead(c, col, x, y, ang) {
  c.save(); c.translate(x, y); c.rotate(ang); c.beginPath(); c.moveTo(0, 0); c.lineTo(-9, -5); c.lineTo(-6.5, 0); c.lineTo(-9, 5); c.closePath(); c.fillStyle = col; c.fill(); c.restore();
}
function curve(c, G, k, col, lw) {   // draws the arrow geometry G from 0 to k
  if (k <= 0) return; const n = 28; c.save(); c.strokeStyle = col; c.lineWidth = lw || 2; c.lineCap = 'round'; c.beginPath();
  for (let i = 0; i <= n; i++) { const p = B(G.p0, G.c, G.p1, k * i / n); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke();
  const e = B(G.p0, G.c, G.p1, k), e2 = B(G.p0, G.c, G.p1, Math.max(0, k - .04));
  if (k > .35) arrowHead(c, col, e[0], e[1], Math.atan2(e[1] - e2[1], e[0] - e2[0]));
  c.restore();
}
function popScale(k) { return 1 + .22 * Math.sin(Math.PI * clamp(k)); }

/* =====================================================================
   p3b-struct
   ===================================================================== */
(function () {
  const HDR = 28, ROW = 30;
  const hOf = cd => HDR + cd.fields.length * ROW + 8;
  const mk = a => ({ id: a.id, title: a.title, sub: a.sub || '', fields: (a.fields || []).map(f => ({ t: f[0], n: f[1], v: f[2] == null ? null : String(f[2]), pop: 0 })), x: a.x, y: a.y, w: a.w || 116, kind: a.kind || 'real', col: a.col || 'accent', al: 1, sc: 1, scan: -1, nm: a.nm || a.title.split(' ').pop() });
  RTSPlay.scene('p3b-struct', {
    W, H,
    init: () => ({ cards: [], frames: [], exp: null }),
    apply(S, a) {
      switch (a.a) {
        case 'frame': if (a.off) remove(S.frames, a.id); else S.frames.push({ id: a.id, t: a.t, x: a.x, y: a.y, w: a.w, h: a.h }); break;
        case 'card': { const cd = mk(a); if (a.copy) { const src = find(S.cards, a.copy); cd.fields = src.fields.map(f => ({ t: f.t, n: f.n, v: f.v, pop: 0 })); } S.cards.push(cd); break; }
        case 'set': { const cd = find(S.cards, a.id); cd.fields[a.f].v = String(a.v); S.exp = a.exp || null; break; }
        case 'drop': remove(S.cards, a.id); S.exp = null; break;
        case 'pulse': S.exp = a.exp || null; break;
      }
    },
    tween(V, a, lp, S) {
      V.pulses = V.pulses || [];
      switch (a.a) {
        case 'frame': if (a.off) { const f = find(V.frames, a.id); if (f) f.al = 1 - lp; } else if (lp > 0 && !find(V.frames, a.id)) V.frames.push({ id: a.id, t: a.t, x: a.x, y: a.y, w: a.w, h: a.h, al: lp }); break;
        case 'card': {
          if (lp <= 0) break; const cd = mk(a); let src = null;
          if (a.copy) { src = find(S.cards, a.copy); cd.fields = src.fields.map(f => ({ t: f.t, n: f.n, v: f.v, pop: 0 })); }
          const e = EZ.out(seg(lp, a.copy ? .35 : 0, 1));
          if (src) { cd.x = lerp(src.x, a.x, e); cd.y = lerp(src.y, a.y, e); V.scanId = a.copy; V.scanK = seg(lp, 0, .5); }
          else { cd.sc = .7 + .3 * EZ.back(seg(lp, 0, .7)); }
          cd.al = src ? seg(lp, .3, .55) : seg(lp, 0, .35); V.cards.push(cd); break;
        }
        case 'set': { const cd = find(V.cards, a.id); if (lp > 0) { cd.fields[a.f].v = lp >= .5 ? String(a.v) : cd.fields[a.f].v; cd.fields[a.f].pop = seg(lp, .5, 1); V.pulses.push({ id: a.id, f: a.f, k: Math.sin(Math.PI * seg(lp, 0, 1)) }); if (a.exp) { V.exp = a.exp; V.expK = seg(lp, 0, .25); } } break; }
        case 'pulse': if (lp > 0) { V.pulses.push({ id: a.id, f: a.f == null ? -1 : a.f, k: Math.sin(Math.PI * lp) }); if (a.exp) { V.exp = a.exp; V.expK = seg(lp, 0, .25); } } break;
        case 'drop': { const cd = find(V.cards, a.id); cd.al = 1 - EZ.in(lp); cd.sc = 1 - .25 * lp; cd.y += lp * 26; cd.rot = lp * .35; break; }
      }
    },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      V.frames.forEach(f => frameDraw(c, C, f, f.al));
      V.cards.forEach(cd => {
        const col = C[cd.col], h = hOf(cd), bp = cd.kind === 'bp';
        c.save(); c.globalAlpha *= clamp(cd.al); c.translate(cd.x + cd.w / 2, cd.y + h / 2); c.rotate(cd.rot || 0); c.scale(cd.sc, cd.sc); c.translate(-cd.w / 2, -h / 2);
        rrect(c, 0, 0, cd.w, h, 5); c.fillStyle = bp ? rgba(C.muted, .08) : rgba(col, .1); c.fill();
        if (bp) c.setLineDash([5, 4]); c.lineWidth = 1.5; c.strokeStyle = bp ? C.muted2 : rgba(col, .85); c.stroke(); c.setLineDash([]);
        const pulseCard = V.pulses.filter(p => p.id === cd.id && p.f === -1).reduce((m, p) => Math.max(m, p.k), 0);
        if (pulseCard > 0) { rrect(c, -2, -2, cd.w + 4, h + 4, 7); c.strokeStyle = rgba(C.yellow, .9 * pulseCard); c.lineWidth = 2; c.stroke(); }
        txt(c, cd.title, 9, 14, { size: 11.5, w: 700, col: bp ? C.muted2 : col, align: 'left' });
        txt(c, cd.sub, cd.w - 8, 14, { size: 8.5, col: C.muted, align: 'right' });
        c.fillStyle = bp ? rgba(C.muted2, .4) : rgba(col, .35); c.fillRect(6, HDR - 5, cd.w - 12, 1);
        cd.fields.forEach((f, i) => {
          const y0 = HDR + i * ROW, pk = V.pulses.filter(p => p.id === cd.id && p.f === i).reduce((m, p) => Math.max(m, p.k), 0);
          if (pk > 0) { c.fillStyle = rgba(C.yellow, .22 * pk); c.fillRect(3, y0, cd.w - 6, ROW - 2); }
          parts(c, [[f.t + ' ', C.muted, 8, 500], [f.n, bp ? C.muted2 : C.text, 10, 700]], 9, y0 + ROW / 2 - 1, 'left');
          const vx = cd.w - 46, vy = y0 + 4, vh = ROW - 10;
          rrect(c, vx, vy, 38, vh, 3);
          if (bp) { c.setLineDash([3, 3]); c.strokeStyle = C.muted; c.lineWidth = 1; c.stroke(); c.setLineDash([]); }
          else { c.fillStyle = rgba(col, .2); c.fill(); c.strokeStyle = rgba(col, .7); c.lineWidth = 1; c.stroke(); }
          if (!bp) { c.save(); c.translate(vx + 19, vy + vh / 2 + .5); const ps = f.pop > 0 && f.pop < 1 ? popScale(f.pop) : 1; c.scale(ps, ps);
            if (f.v == null) txt(c, '?', 0, 0, { size: 13, w: 700, col: C.muted }); else txt(c, f.v, 0, 0, { size: f.v.length > 3 ? 11 : 13, w: 700, col: C.text }); c.restore(); }
        });
        c.restore();
      });
      if (V.scanId && V.scanK > 0 && V.scanK < 1) {          // photocopier scan bar over the source card
        const s = find(V.cards, V.scanId); if (s) { const h = hOf(s), y = s.y + h * V.scanK;
          c.save(); c.fillStyle = rgba('#ffffff', .75); c.fillRect(s.x - 4, y - 1, s.w + 8, 2.5);
          const g = c.createLinearGradient(0, y - 22, 0, y); g.addColorStop(0, rgba(C.yellow, 0)); g.addColorStop(1, rgba(C.yellow, .38)); c.fillStyle = g; c.fillRect(s.x, Math.max(s.y, y - 22), s.w, Math.min(22, y - s.y)); c.restore(); } }
      if (V.exp) {
        const al = V.expK == null ? 1 : V.expK, i = V.exp.indexOf('.'); c.save(); c.globalAlpha *= clamp(al);
        if (i > 0 && /^[a-z]/i.test(V.exp)) { parts(c, [[V.exp.slice(0, i), C.text, 15, 700], ['.', C.orange, 22, 800], [V.exp.slice(i + 1), C.text, 15, 700]], W / 2, 222, 'center'); }
        else txt(c, V.exp, W / 2, 222, { size: 15, w: 700, col: C.text });
        c.restore(); }
    }
  });
  RTSPlay.SCENES['p3b-struct'].prep = (V, S) => { V.exp = S.exp; V.expK = 1; V.pulses = []; V.scanId = null; };
})();

/* =====================================================================
   p3b-mem
   ===================================================================== */
(function () {
  const DEF = 'memory: every box has an address';
  const addrOf = (S, id) => { const t = find(S.items, id); return t ? String(t.addr || '').replace('@', '') : '?'; };
  const mk = a => ({ id: a.id, kind: a.kind || 'int', name: a.name || '', type: a.type || '', addr: a.addr || '', v: a.v == null ? '' : String(a.v), x: a.x, y: a.y, w: a.w || 108, h: a.h || 62,
    tgt: null, nul: false, nulK: 0, ak: 0, col: a.col || (a.kind === 'ptr' ? 'purple' : a.kind === 'group' ? 'blue' : 'accent'), side: a.side || 'auto', bow: a.bow || 0, al: 1, sc: 1, pop: 0, inner: !!a.inner });
  function geom(items, it) {
    const t = it.tgt && find(items, it.tgt); if (!t) return null;
    const pcx = it.x + it.w / 2, pcy = it.y + it.h / 2, tcx = t.x + t.w / 2, tcy = t.y + t.h / 2;
    const side = it.side === 'auto' ? (Math.abs(tcy - pcy) < 20 ? 'top' : (tcy < pcy ? 'up' : 'down')) : it.side;
    let p0, p1, c;
    if (side === 'top') { p0 = [pcx, it.y]; p1 = [tcx, t.y]; const lift = 56 + Math.abs(tcx - pcx) * .12; c = [(p0[0] + p1[0]) / 2, Math.min(p0[1], p1[1]) - lift]; }
    else if (side === 'up') { p0 = [pcx, it.y]; p1 = [clamp(pcx, t.x + 10, t.x + t.w - 10), t.y + t.h]; c = [(p0[0] + p1[0]) / 2 + it.bow, (p0[1] + p1[1]) / 2]; }
    else { p0 = [pcx, it.y + it.h]; p1 = [clamp(pcx, t.x + 10, t.x + t.w - 10), t.y]; c = [(p0[0] + p1[0]) / 2 + it.bow, (p0[1] + p1[1]) / 2]; }
    return { p0, c, p1 };
  }
  RTSPlay.scene('p3b-mem', {
    W, H,
    init: () => ({ items: [], frames: [], cap: DEF }),
    apply(S, a) {
      switch (a.a) {
        case 'frame': if (a.off) remove(S.frames, a.id); else S.frames.push({ id: a.id, t: a.t, x: a.x, y: a.y, w: a.w, h: a.h }); break;
        case 'cell': { const it = mk(a); S.items.push(it); if (a.to) { it.tgt = a.to; it.v = a.pv || addrOf(S, a.to); it.ak = 1; } if (a.nul) { it.nul = true; it.v = 'NULL'; } break; }
        case 'point': { const it = find(S.items, a.id); it.tgt = a.to; it.v = a.pv || addrOf(S, a.to); it.ak = 1; it.nul = false; it.nulK = 0; break; }
        case 'nul': { const it = find(S.items, a.id); it.tgt = null; it.v = 'NULL'; it.ak = 0; it.nul = true; break; }
        case 'set': find(S.items, a.id).v = String(a.v); break;
        case 'deref': if (a.v != null) { const p = find(S.items, a.p); find(S.items, a.to || p.tgt).v = String(a.v); } break;
        case 'cap': S.cap = a.t || DEF; break;
        case 'hide': (a.ids || []).forEach(i => remove(S.items, i)); (a.fr || []).forEach(i => remove(S.frames, i)); break;
      }
    },
    tween(V, a, lp, S) {
      V.toks = V.toks || []; V.tags = V.tags || []; V.flash = V.flash || [];
      switch (a.a) {
        case 'frame': if (a.off) { const f = find(V.frames, a.id); if (f) f.al = 1 - lp; } else if (lp > 0 && !find(V.frames, a.id)) V.frames.push({ id: a.id, t: a.t, x: a.x, y: a.y, w: a.w, h: a.h, al: lp }); break;
        case 'cell': {
          if (lp <= 0) break; const it = mk(a); it.al = seg(lp, 0, .3); it.sc = .7 + .3 * EZ.back(seg(lp, 0, .6));
          if (a.to) { it.tgt = a.to; it.v = a.pv || addrOf(S, a.to); it.ak = seg(lp, .45, 1); }
          if (a.nul) { it.nul = true; it.v = 'NULL'; it.nulK = seg(lp, .5, 1); }
          V.items.push(it); break;
        }
        case 'point': { if (lp <= 0) break; const it = find(V.items, a.id); it.tgt = a.to; it.ak = seg(lp, .1, 1); if (lp >= .3) it.v = a.pv || addrOf(S, a.to); it.nul = false; it.nulK = 0; it.pop = seg(lp, .3, .8); break; }
        case 'nul': { if (lp <= 0) break; const it = find(V.items, a.id); it.ak = 1 - EZ.in(lp); if (lp >= .5) it.v = 'NULL'; it.nulK = seg(lp, .4, 1); it.pop = seg(lp, .5, 1); break; }
        case 'set': {
          if (lp <= 0) break; const it = find(V.items, a.id);
          if (lp >= .55) it.v = String(a.v); it.pop = seg(lp, .55, 1); V.flash.push({ id: a.id, k: Math.sin(Math.PI * seg(lp, .4, 1)) });
          if (a.from) { const f = find(V.items, a.from), k = EZ.io(seg(lp, 0, .55)); if (lp < .55) V.toks.push({ x: lerp(f.x + f.w / 2, it.x + it.w / 2, k), y: lerp(f.y + f.h / 2, it.y + it.h / 2, k) - 16 * Math.sin(Math.PI * k), t: String(a.v) }); }
          break;
        }
        case 'deref': {
          if (lp <= 0) break; const p = find(V.items, a.p), G = geom(V.items, p), tg = find(V.items, a.to || p.tgt), arrowEnd = find(V.items, p.tgt);
          const lbl = a.lbl || ('*' + p.name), k1 = EZ.io(seg(lp, 0, .5));
          let x, y;
          if (G) { const q = B(G.p0, G.c, G.p1, k1); x = q[0]; y = q[1]; }
          if (a.to && lp > .5) { const k2 = EZ.io(seg(lp, .5, .66)), e = B(G.p0, G.c, G.p1, 1); x = lerp(e[0], tg.x + tg.w / 2, k2); y = lerp(e[1], tg.y + tg.h / 2, k2); }
          const born = seg(lp, 0, .08), gone = 1 - seg(lp, .88, 1);
          if (G && gone > 0) V.toks.push({ x, y, t: lbl, tok: true, al: Math.min(born, gone) });
          V.flash.push({ id: tg.id, k: Math.sin(Math.PI * seg(lp, a.to ? .62 : .45, 1)) });
          if (a.v != null && lp >= .72) { tg.v = String(a.v); tg.pop = seg(lp, .72, 1); }
          break;
        }
        case 'tag': if (lp > 0 && lp < 1) V.tags.push({ id: a.id, t: a.t, below: !!a.below, col: a.col || 'yellow', al: Math.min(seg(lp, 0, .18), 1 - seg(lp, .82, 1)) }); break;
        case 'pulse': if (lp > 0) V.flash.push({ id: a.id, k: Math.sin(Math.PI * lp) }); break;
        case 'cap': V.cap = a.t || DEF; V.capK = seg(lp, 0, .3); break;
        case 'hide': (a.ids || []).forEach(i => { const it = find(V.items, i); if (it) it.al = 1 - lp; }); (a.fr || []).forEach(i => { const f = find(V.frames, i); if (f) f.al = 1 - lp; }); break;
      }
    },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      V.frames.forEach(f => frameDraw(c, C, f, f.al));
      const flash = id => { const k = (V.flash || []).filter(f => f.id === id).reduce((m, f) => Math.max(m, f.k), 0); return k < .02 ? 0 : k; };
      const items = V.items, groups = items.filter(i => i.kind === 'group'), cells = items.filter(i => i.kind !== 'group');
      const drawBox = it => {
        const col = C[it.col], fk = flash(it.id), cx = it.x + it.w / 2, cy = it.y + it.h / 2;
        c.save(); c.globalAlpha *= clamp(it.al); c.translate(cx, cy); c.scale(it.sc, it.sc); c.translate(-cx, -cy);
        if (it.kind === 'group') {
          rrect(c, it.x, it.y, it.w, it.h, 5); c.fillStyle = rgba(col, .07 + .2 * fk); c.fill(); c.strokeStyle = rgba(col, .75); c.lineWidth = 1.5; c.stroke();
          txt(c, it.type + ' ' + it.name, it.x + 8, it.y + 10, { size: 9.5, w: 700, col, align: 'left' });
          if (it.addr && it.w >= 150) txt(c, '@' + it.addr, it.x + it.w - 7, it.y + 10, { size: 8.5, col: C.muted, align: 'right' });
        } else {
          rrect(c, it.x, it.y, it.w, it.h, 4); c.fillStyle = rgba(col, .14 + .34 * fk); c.fill(); c.strokeStyle = rgba(fk > 0 ? C.yellow : col, fk > 0 ? .5 + .5 * fk : .9); c.lineWidth = 1.5 + fk; c.stroke();
          const small = it.h < 50;
          parts(c, [[it.type ? it.type + ' ' : '', C.muted2, 9, 500], [it.name, col, 9.5, 700]], it.x + 7, it.y + 10, 'left');
          const ps = it.pop > 0 && it.pop < 1 ? popScale(it.pop) : 1, isP = it.kind === 'ptr', nul = isP && (it.v === 'NULL');
          c.save(); c.translate(cx, it.y + (small ? it.h * .66 : it.h * .55)); c.scale(ps, ps);
          txt(c, it.v, 0, 0, { size: isP ? (nul ? 14 : 13) : (it.v.length > 3 ? 14 : 18), w: 700, col: nul ? C.orange : C.text }); c.restore();
          if (it.addr && !small) txt(c, '@' + it.addr, it.x + it.w - 6, it.y + it.h - 8, { size: 8.5, col: C.muted, align: 'right' });
        }
        c.restore();
      };
      groups.forEach(drawBox); cells.forEach(drawBox);
      // arrows + NULL stubs
      cells.forEach(it => {
        if (it.kind !== 'ptr') return; c.save(); c.globalAlpha *= clamp(it.al);
        const G = geom(items, it), col = C[it.col];
        if (G && it.ak > 0) { curve(c, G, it.ak, col, 2.2); c.beginPath(); c.arc(G.p0[0], G.p0[1], 3.6, 0, 7); c.fillStyle = col; c.fill(); }
        const nk = it.nul ? (it.nulK > 0 && it.nulK < 1 ? it.nulK : 1) : it.nulK;
        if (nk > 0 && !(G && it.ak > 0)) {
          const x = it.x + it.w / 2, y = it.y, a = clamp(nk); c.globalAlpha *= a; c.strokeStyle = C.orange; c.lineWidth = 2; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 14); c.stroke(); c.setLineDash([]);
          c.beginPath(); c.arc(x, y, 3.6, 0, 7); c.fillStyle = C.orange; c.fill();
          c.beginPath(); c.moveTo(x - 6, y - 20); c.lineTo(x + 6, y - 8); c.moveTo(x + 6, y - 20); c.lineTo(x - 6, y - 8); c.stroke();
          txt(c, 'nothing here', x + 12, y - 14, { size: 8.5, col: C.orange, align: 'left' });
        }
        c.restore();
      });
      (V.toks || []).forEach(t => {
        c.save(); c.globalAlpha *= clamp(t.al == null ? 1 : t.al); c.font = '700 10px ' + FONT; const w = c.measureText(t.t).width + 12;
        rrect(c, t.x - w / 2, t.y - 8, w, 16, 4); c.fillStyle = C.yellow; c.fill(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1; c.stroke();
        txt(c, t.t, t.x, t.y + .5, { size: 10, w: 700, col: C.ink }); c.restore();
      });
      (V.tags || []).forEach(t => { const it = find(items, t.id); if (it) bubble(c, C, t.t, it.x + it.w / 2, t.below ? it.y + it.h + 1 : it.y - 1, C[t.col], t.al, 9.5, t.below); });
      txt(c, V.cap, 12, 11, { size: 9.5, w: V.cap === DEF ? 500 : 700, col: V.cap === DEF ? C.muted : C.orange, align: 'left', al: V.cap === DEF ? 1 : (V.capK == null ? 1 : V.capK) });
    }
  });
  RTSPlay.SCENES['p3b-mem'].prep = (V, S) => { V.cap = S.cap; V.capK = 1; V.toks = []; V.tags = []; V.flash = []; };
})();

/* =====================================================================
   p3b-dial  (enum)
   ===================================================================== */
(function () {
  const NAMES = ['STATE_MENU', 'STATE_PLAYING', 'STATE_GAMEOVER'], ANG = [-2.35, -1.5708, -0.79], CX = 100, CY = 134, R = 46;
  const rowY = i => 34 + i * 42;
  RTSPlay.scene('p3b-dial', {
    W, H,
    init: () => ({ names: 0, ang: 1.5708, pos: -1, lives: '?', chk: null, hl: -1 }),
    apply(S, a) {
      switch (a.a) {
        case 'names': S.names = a.n; break;
        case 'needle': S.pos = a.to; S.ang = ANG[a.to]; break;
        case 'lives': S.lives = String(a.v); break;
        case 'chk': S.chk = { t: a.t, r: a.r }; break;
        case 'hl': S.hl = a.row; break;
      }
    },
    tween(V, a, lp, S) {
      switch (a.a) {
        case 'names': V.nameK = lp; V.namesN = a.n; break;
        case 'needle': if (lp > 0) { V.ang = lerp(S.ang, ANG[a.to], EZ.back(lp)); V.pos = lp >= .55 ? a.to : S.pos; V.chipPop = seg(lp, .55, 1); } break;
        case 'lives': if (lp >= .5) V.lives = String(a.v); V.livesPop = seg(lp, .5, 1); break;
        case 'chk': if (lp > 0) { V.chk = { t: a.t, r: a.r }; V.chkK = EZ.back(seg(lp, 0, .5)); } break;
        case 'hl': if (lp > 0) { if (a.sweep) { V.hl = a.row; V.hlY = lerp(rowY(0), rowY(a.row), EZ.io(seg(lp, .1, .9))); V.hlA = seg(lp, 0, .15); } else { V.hl = a.row; V.hlY = rowY(a.row); V.hlA = seg(lp, 0, .4); } } break;
        case 'ints': V.numK = Math.sin(Math.PI * lp); break;
        case 'pulse': if (lp > 0) { V.rowP = a.row; V.rowPK = Math.sin(Math.PI * lp); } break;
      }
    },
    prep(V, S) { V.nameK = 1; V.namesN = S.names; V.numK = 0; V.rowPK = 0; V.chkK = 1; V.hlA = 1; V.hlY = S.hl >= 0 ? rowY(S.hl) : 0; V.chipPop = 1; V.livesPop = 1; },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      // dial
      c.save(); c.beginPath(); c.arc(CX, CY, R + 10, 0, 7); c.fillStyle = rgba(C.blue, .1); c.fill(); c.strokeStyle = rgba(C.blue, .7); c.lineWidth = 2; c.stroke();
      c.beginPath(); c.arc(CX, CY, R - 8, 0, 7); c.strokeStyle = rgba(C.blue, .25); c.lineWidth = 1; c.stroke(); c.restore();
      ANG.forEach((an, i) => {
        const on = V.pos === i, ca = Math.cos(an), sa = Math.sin(an);
        c.save(); c.strokeStyle = on ? C.yellow : C.muted2; c.lineWidth = on ? 3 : 2; c.beginPath(); c.moveTo(CX + ca * (R + 10), CY + sa * (R + 10)); c.lineTo(CX + ca * (R + 19), CY + sa * (R + 19)); c.stroke(); c.restore();
        txt(c, String(i), CX + ca * (R + 30), CY + sa * (R + 30), { size: 13, w: 700, col: on ? C.yellow : C.muted2 });
      });
      // needle
      const an = V.ang, nx = CX + Math.cos(an) * (R - 4), ny = CY + Math.sin(an) * (R - 4);
      c.save(); c.strokeStyle = V.pos >= 0 ? C.yellow : C.muted; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(CX, CY); c.lineTo(nx, ny); c.stroke();
      c.beginPath(); c.arc(CX, CY, 7, 0, 7); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.blue; c.lineWidth = 2; c.stroke(); c.restore();
      // state chip
      const sc = V.chipPop > 0 && V.chipPop < 1 ? popScale(V.chipPop) : 1;
      c.save(); c.translate(CX, 208); c.scale(sc, sc); rrect(c, -86, -13, 172, 26, 4); c.fillStyle = rgba(C.blue, .12); c.fill(); c.strokeStyle = rgba(C.blue, .7); c.lineWidth = 1.25; c.stroke();
      parts(c, [['state = ', C.muted2, 10.5, 500], [V.pos >= 0 ? NAMES[V.pos] : '?', V.pos >= 0 ? C.text : C.muted, 10.5, 700]], 0, 0.5, 'center'); c.restore();
      // list
      for (let i = 0; i < 3; i++) {
        const al = V.namesN > i ? (V.nameK === 1 ? 1 : seg(V.nameK, i * .28, i * .28 + .4)) : 0; if (al <= 0) continue;
        const y = rowY(i), np = V.numK > 0 ? popScale(V.numK) : 1;
        c.save(); c.globalAlpha *= al; rrect(c, 188, y, 204, 32, 4); c.fillStyle = rgba(C.border, .35); c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1; c.stroke();
        c.beginPath(); c.arc(208, y + 16, 11 * np, 0, 7); c.fillStyle = V.pos === i ? rgba(C.yellow, .3) : rgba(C.blue, .22); c.fill(); c.strokeStyle = V.pos === i ? C.yellow : C.blue; c.lineWidth = 1.5; c.stroke();
        txt(c, String(i), 208, y + 16.5, { size: 12 * np, w: 700, col: C.text });
        txt(c, NAMES[i], 228, y + 16.5, { size: 11, w: 700, col: V.pos === i ? C.text : C.muted2, align: 'left' });
        if (V.rowP === i && V.rowPK > 0) { rrect(c, 186, y - 2, 208, 36, 5); c.strokeStyle = rgba(C.accent, V.rowPK); c.lineWidth = 2; c.stroke(); }
        c.restore();
      }
      if (V.hl >= 0 && V.hlA > 0) { c.save(); c.globalAlpha *= clamp(V.hlA); rrect(c, 185, V.hlY - 3, 210, 38, 5); c.strokeStyle = C.yellow; c.lineWidth = 2.25; c.stroke(); c.fillStyle = rgba(C.yellow, .1); c.fill(); c.restore(); }
      if (V.pos >= 0 && V.namesN >= 3) { const y = rowY(V.pos) + 16; c.save(); c.fillStyle = C.yellow; c.beginPath(); c.moveTo(184, y); c.lineTo(177, y - 5); c.lineTo(177, y + 5); c.closePath(); c.fill(); c.restore(); }
      // lives
      const lp2 = V.livesPop > 0 && V.livesPop < 1 ? popScale(V.livesPop) : 1;
      c.save(); c.translate(290, 180); c.scale(lp2, lp2); rrect(c, -50, -13, 100, 26, 4); c.fillStyle = rgba(C.accent, .12); c.fill(); c.strokeStyle = rgba(C.accent, .7); c.lineWidth = 1.25; c.stroke();
      parts(c, [['lives = ', C.muted2, 10.5, 500], [V.lives, C.text, 12, 700]], 0, .5, 'center'); c.restore();
      if (V.chk) { const k = V.chkK == null ? 1 : V.chkK; c.save(); c.translate(290, 218); c.scale(Math.max(k, .01), Math.max(k, .01)); c.globalAlpha *= clamp(k);
        const col = V.chk.r ? C.accent : C.orange; c.font = '700 10px ' + FONT; const s = V.chk.t + '  ' + (V.chk.r ? 'true' : 'false'), w = c.measureText(s).width + 16;
        rrect(c, -w / 2, -11, w, 22, 11); c.fillStyle = rgba(col, .16); c.fill(); c.strokeStyle = col; c.lineWidth = 1.25; c.stroke();
        parts(c, [[V.chk.t + '  ', C.text, 10, 500], [V.chk.r ? 'true' : 'false', col, 10, 800]], 0, .5, 'center'); c.restore(); }
      txt(c, 'an enum is a dial of named positions', 12, 11, { size: 9.5, col: C.muted, align: 'left' });
    }
  });
})();

/* =====================================================================
   p3b-debug
   ===================================================================== */
(function () {
  const CODE = [[7, 'void damage(Player* p, int amount) {'], [8, '  p->health = p->health - amount;'], [9, '}'], [10, ''], [11, 'int main() {'], [12, '  Player hero;'], [13, '  hero.health = 100;'],
    [14, '  damage(&hero, 30);'], [15, '  damage(&hero, 30);'], [16, '  printf("health %d\\n", hero.health);'], [17, '  return 0;']];
  const PX = 6, PY = 24, PW = 232, PH = 158, RH = 13.2, TOP = PY + 9;
  const lineY = L => TOP + (L - 7) * RH + RH / 2;
  const KEYS = [['F9', 'breakpoint'], ['F5', 'run / go'], ['F10', 'step over'], ['F11', 'step into']];
  const STAT = { idle: 'not running', paused: 'PAUSED', running: 'RUNNING', exited: 'EXITED' };
  RTSPlay.scene('p3b-debug', {
    W, H,
    init: () => ({ bp: false, run: 'idle', arrow: 0, title: 'Locals', rows: [], stack: [], sel: 0, key: null, hint: 'not running yet' }),
    apply(S, a) {
      switch (a.a) {
        case 'key': S.key = a.k; break;
        case 'bp': S.bp = a.on; break;
        case 'go': S.run = a.to; S.arrow = a.line || 0; if (a.to !== 'paused') { S.title = 'Locals'; S.rows = []; S.stack = []; } else { S.title = a.title; S.rows = a.rows; S.stack = a.stack; S.sel = 0; } break;
        case 'arrow': S.arrow = a.to; break;
        case 'locals': S.title = a.title; S.rows = a.rows; break;
        case 'stack': S.stack = a.rows; S.sel = a.sel || 0; break;
      }
    },
    tween(V, a, lp, S) {
      switch (a.a) {
        case 'key': if (lp > 0) { V.keyK = Math.sin(Math.PI * lp); V.key = a.k; } break;
        case 'bp': if (lp > 0) { V.bp = a.on; V.bpK = EZ.back(lp); } break;
        case 'go': if (lp > 0) { V.run = lp < .45 && a.to !== 'running' ? 'running' : a.to; V.arrowA = a.to === 'paused' ? EZ.back(seg(lp, .45, 1)) : 1 - seg(lp, 0, .5); V.arrow = a.to === 'paused' ? a.line : S.arrow; if (a.to !== 'paused' && lp > .5) { V.rows = []; V.stack = []; V.title = 'Locals'; } else if (a.to === 'paused') { V.rows = a.rows || []; V.title = a.title || 'Locals'; V.stack = a.stack || []; V.sel = 0; V.rowsK = seg(lp, .5, 1); } } break;
        case 'arrow': { if (lp <= 0) break; const path = [S.arrow].concat(a.via || [], [a.to]), seglen = 1 / (path.length - 1), e = EZ.io(lp), i = Math.min(path.length - 2, Math.floor(e / seglen)), t = (e - i * seglen) / seglen; V.arrow = lerp(path[i], path[i + 1], EZ.io(t)); V.arrowFast = (a.via && a.via.length) ? 1 : 0; break; }
        case 'locals': if (lp > 0) { V.rows = lp >= .35 ? a.rows : S.rows; V.title = lp >= .35 ? a.title : S.title; V.hot = a.hot || []; V.hotK = Math.sin(Math.PI * seg(lp, .3, 1)); } break;
        case 'stack': if (lp > 0) { V.stack = a.rows; V.sel = a.sel || 0; V.stackK = EZ.out(seg(lp, 0, .6)); } break;
      }
    },
    prep(V, S) { V.hot = []; V.hotK = 0; V.keyK = 0; V.bpK = 1; V.arrowA = 1; V.rowsK = 1; V.stackK = 1; V.arrowFast = 0; },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      txt(c, 'debugger', 8, 11, { size: 9.5, col: C.muted, align: 'left' });
      const sc = V.run === 'paused' ? C.yellow : V.run === 'running' ? C.accent : C.muted2;
      c.save(); rrect(c, 292, 3, 102, 17, 8.5); c.fillStyle = rgba(sc, .16); c.fill(); c.strokeStyle = sc; c.lineWidth = 1.25; c.stroke();
      c.beginPath(); c.arc(303, 11.5, 3.2, 0, 7); c.fillStyle = sc; c.fill(); txt(c, STAT[V.run], 311, 12, { size: 9.5, w: 700, col: sc, align: 'left' }); c.restore();
      // code pane
      rrect(c, PX, PY, PW, PH, 4); c.fillStyle = rgba(C.border, .35); c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1; c.stroke();
      const cur = V.arrow > 0 ? V.arrow : 0, fy = cur ? lineY(cur) : 0;
      if (cur && (V.arrowA == null || V.arrowA > 0)) { c.save(); c.globalAlpha *= clamp(V.arrowA == null ? 1 : V.arrowA); c.fillStyle = rgba(C.yellow, .22); c.fillRect(PX + 1, fy - RH / 2, PW - 2, RH); c.restore(); }
      CODE.forEach(([L, s]) => {
        const y = lineY(L);
        txt(c, String(L), PX + 36, y + .5, { size: 8, col: C.muted, align: 'right' });
        txt(c, s, PX + 42, y + .5, { size: 8.5, col: cur === Math.round(cur) && Math.round(cur) === L ? C.text : C.muted2, align: 'left' });
        if (L === 14 && V.bp) { const k = V.bpK == null ? 1 : V.bpK; c.beginPath(); c.arc(PX + 12, y, 4.4 * Math.max(k, 0), 0, 7); c.fillStyle = C.orange; c.fill(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.stroke(); }
      });
      if (cur && (V.arrowA == null || V.arrowA > 0)) { c.save(); c.globalAlpha *= clamp(V.arrowA == null ? 1 : V.arrowA); const ax = PX + 21 + (V.arrowFast ? 0 : 0); c.fillStyle = C.yellow; c.beginPath(); c.moveTo(ax + 7, fy); c.lineTo(ax - 3, fy - 5.5); c.lineTo(ax - 3, fy + 5.5); c.closePath(); c.fill(); c.strokeStyle = C.ink; c.lineWidth = .8; c.stroke(); c.restore(); }
      // locals
      const RX = 246, RW = 148;
      rrect(c, RX, PY, RW, 98, 4); c.fillStyle = rgba(C.border, .35); c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1; c.stroke();
      txt(c, V.title || 'Locals', RX + 8, PY + 10, { size: 9, w: 700, col: C.blue, align: 'left' });
      c.fillStyle = C.border2; c.fillRect(RX + 6, PY + 19, RW - 12, 1);
      if (!V.rows.length) txt(c, V.run === 'paused' ? '(nothing yet)' : V.run === 'idle' ? 'not running yet' : V.run === 'exited' ? 'program finished' : 'running...', RX + RW / 2, PY + 52, { size: 9, col: C.muted });
      V.rows.forEach((r, i) => {
        const y = PY + 31 + i * 16, hot = (V.hot || []).indexOf(i) >= 0 ? V.hotK : 0, w = r[2] === 'w', al = V.rowsK == null ? 1 : V.rowsK;
        if (hot > 0) { c.fillStyle = rgba(C.yellow, .28 * hot); c.fillRect(RX + 3, y - 8, RW - 6, 16); }
        txt(c, r[0], RX + 8, y, { size: 9, w: 700, col: w ? C.purple : C.text, align: 'left', al });
        const v = r[1]; c.save(); c.translate(RX + RW - 8, y); const ps = hot > 0 ? 1 + .12 * hot : 1; c.scale(ps, ps); txt(c, v, 0, 0, { size: 9, w: 700, col: hot > 0 ? C.yellow : C.accent, align: 'right', al }); c.restore();
      });
      // call stack
      rrect(c, RX, 128, RW, 54, 4); c.fillStyle = rgba(C.border, .35); c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1; c.stroke();
      txt(c, 'Call Stack', RX + 8, 138, { size: 9, w: 700, col: C.blue, align: 'left' });
      V.stack.forEach((nm, i) => {
        const y = 152 + i * 14, on = V.sel === i;
        if (on) { c.fillStyle = rgba(C.yellow, .2); c.fillRect(RX + 3, y - 7, RW - 6, 14); }
        txt(c, nm + (i === 0 && V.stack.length > 1 ? '  (top)' : ''), RX + 10, y, { size: 9, w: on ? 700 : 500, col: on ? C.text : C.muted2, align: 'left', al: V.stackK == null ? 1 : V.stackK });
      });
      if (!V.stack.length) txt(c, '-', RX + RW / 2, 156, { size: 9, col: C.muted });
      // keys
      KEYS.forEach(([k, d], i) => {
        const x = 6 + i * 98.5, y = 188, on = V.key === k, kk = on ? V.keyK || 0 : 0;
        c.save(); c.translate(x + 45, y + 27); const s = 1 + .08 * kk; c.scale(s, s);
        rrect(c, -45, -25, 90, 52, 5); c.fillStyle = on ? rgba(C.yellow, .12 + .2 * kk) : rgba(C.border, .3); c.fill(); c.strokeStyle = on ? C.yellow : C.border2; c.lineWidth = on ? 2 : 1; c.stroke();
        rrect(c, -20, -19, 40, 26, 4); c.fillStyle = on ? C.yellow : C.surface2; c.fill(); c.strokeStyle = on ? C.yellow : C.muted2; c.lineWidth = 1.5; c.stroke();
        txt(c, k, 0, -5.5, { size: 13, w: 800, col: on ? C.ink : C.text });
        txt(c, d, 0, 17, { size: 9, w: 600, col: on ? C.yellow : C.muted2 }); c.restore();
      });
    }
  });
})();

/* =====================================================================
   p3b-files  (headers: #include pastes the header's text into each .c)
   ===================================================================== */
(function () {
  const RH = 10, TH = 16;
  const HDR = ['#pragma once', 'typedef struct {', '    int health;', '} Player;', 'void player_heal(', '    Player* p, int amount);'];
  const PASTE = ['#pragma once', 'typedef struct {', '    int health;', '} Player;', 'void player_heal(Player* p, int amount);'];
  const SHEETS = {
    h: { x: 6, y: 8, w: 150, name: 'player.h', col: 'orange' },
    c: { x: 172, y: 8, w: 222, name: 'player.c', col: 'blue', pre: [], inc: '#include "player.h"', post: ['void player_heal(Player* p, int amount) {', '    p->health = p->health + amount;', '}'] },
    m: { x: 172, y: 0, w: 222, name: 'main.c', col: 'accent', pre: ['#include <stdio.h>'], inc: '#include "player.h"', post: ['int main() {', '    player_heal(&hero, 25);', '}'] }
  };
  const rk = (pk, i) => seg(pk, i / PASTE.length * .5, i / PASTE.length * .5 + .5);
  const rowsOf = id => {
    const s = SHEETS[id], out = [];
    if (id === 'h') { HDR.forEach((t, gi) => out.push({ t, kind: 'h', gi })); return out; }
    s.pre.forEach((t, gi) => out.push({ t, kind: 'pre', gi }));
    out.push({ t: s.inc, kind: 'inc', gi: 0 });
    PASTE.forEach((t, gi) => out.push({ t, kind: 'pasted', gi }));
    s.post.forEach((t, gi) => out.push({ t, kind: 'post', gi }));
    return out;
  };
  const heightOf = (id, pk) => {
    if (id === 'h') return TH + 8 + HDR.length * RH + 4;
    return TH + 8 + rowsOf(id).reduce((h, r) => h + (r.kind === 'inc' ? RH * (1 - pk) : r.kind === 'pasted' ? RH * rk(pk, r.gi) : RH), 0) + 4;
  };
  RTSPlay.scene('p3b-files', {
    W, H,
    init: () => ({ show: { h: 0, c: 0, m: 0 }, paste: { c: 0, m: 0 }, hl: null, call: 0, build: 0 }),
    apply(S, a) {
      switch (a.a) {
        case 'show': S.show[a.sheet] = 1; break;
        case 'hl': S.hl = a.sheet ? { sheet: a.sheet, rows: a.rows || null, kind: a.kind || null } : null; break;
        case 'paste': S.paste[a.sheet] = 1; break;
        case 'call': S.call = 1; break;
        case 'build': S.build = 1; break;
      }
    },
    tween(V, a, lp, S) {
      switch (a.a) {
        case 'show': V.show[a.sheet] = EZ.out(lp); break;
        case 'hl': if (lp > 0) { V.hl = a.sheet ? { sheet: a.sheet, rows: a.rows || null, kind: a.kind || null } : null; V.hlK = a.sheet ? seg(lp, 0, .4) : 1; } break;
        case 'paste': V.paste[a.sheet] = EZ.io(lp); break;
        case 'call': V.call = lp; break;
        case 'build': V.build = lp; break;
      }
    },
    prep(V, S) { V.hlK = 1; },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      const pos = {};
      ['h', 'c', 'm'].forEach(id => {
        const s = SHEETS[id], sh = V.show[id]; if (sh <= 0) return;
        const pk = id === 'h' ? 0 : V.paste[id], h = heightOf(id, pk), col = C[s.col];
        const y0 = id === 'm' ? 8 + heightOf('c', V.paste.c) + 8 : s.y; pos[id] = { x: s.x, y: y0, w: s.w, h, rows: {} };
        c.save(); c.globalAlpha *= clamp(sh); c.translate(0, (1 - sh) * 10);
        rrect(c, s.x, y0, s.w, h, 4); c.fillStyle = rgba(col, .07); c.fill(); c.strokeStyle = rgba(col, .8); c.lineWidth = 1.5; c.stroke();
        c.fillStyle = rgba(col, .22); c.fillRect(s.x + 1, y0 + 1, s.w - 2, TH - 3);
        txt(c, s.name, s.x + 8, y0 + 8, { size: 10, w: 700, col, align: 'left' });
        if (id !== 'h' && pk > .6) txt(c, 'orange = pasted from player.h', s.x + s.w - 6, y0 + 8, { size: 7.5, col: C.orange, align: 'right', al: seg(pk, .6, 1) });
        let y = y0 + TH + 4;
        rowsOf(id).forEach(r => {
          let hgt = RH, al = 1;
          if (r.kind === 'inc') { al = 1 - pk; hgt = RH * al; }
          if (r.kind === 'pasted') { al = rk(pk, r.gi); hgt = RH * al; }
          pos[id].rows[r.kind + r.gi] = y + hgt / 2;
          const sel = V.hl && V.hl.sheet === id && (V.hl.kind ? V.hl.kind === r.kind : true) && (!V.hl.rows || V.hl.rows.indexOf(r.gi) >= 0);
          if (al > 0.02) {
            if (r.kind === 'pasted') { c.fillStyle = rgba(C.orange, .13 * al); c.fillRect(s.x + 3, y, s.w - 6, hgt); }
            if (sel) { c.fillStyle = rgba(C.yellow, .28 * (V.hlK == null ? 1 : V.hlK)); c.fillRect(s.x + 3, y, s.w - 6, Math.max(hgt, 2)); }
            txt(c, r.t, s.x + 8, y + RH / 2, { size: 8, col: r.kind === 'pasted' ? C.orange : (r.kind === 'post' || r.kind === 'pre') && id !== 'h' ? C.muted2 : C.text, align: 'left', al });
            if (r.kind === 'inc' && pk > 0) { c.save(); c.globalAlpha *= 1 - pk; c.fillStyle = C.orange; c.fillRect(s.x + 8, y + RH / 2, 100, 1); c.restore(); }
          }
          y += hgt;
        });
        c.restore();
      });
      if (V.call > 0 && pos.m && pos.c) {
        const my = pos.m.y + (pos.m.rows.post1 || 0) - pos.m.y, cy = pos.c.rows.post0, myAbs = pos.m.rows.post1, x = 164;
        c.save(); c.globalAlpha *= clamp(V.call); c.strokeStyle = C.purple; c.lineWidth = 1.75; c.setLineDash([4, 3]);
        c.beginPath(); c.moveTo(pos.m.x + 2, myAbs); c.lineTo(x, myAbs); c.lineTo(x, cy); c.lineTo(pos.c.x - 1, cy); c.stroke(); c.setLineDash([]);
        arrowHead(c, C.purple, pos.c.x - 1, cy, 0); c.restore();
        bubble(c, C, 'body found later', 86, 152, C.purple, V.call, 9);
      }
      if (V.build > 0) {
        c.save(); c.globalAlpha *= clamp(V.build); c.translate(0, (1 - V.build) * 8);
        rrect(c, 8, 196, 152, 46, 5); c.fillStyle = rgba(C.accent, .12); c.fill(); c.strokeStyle = C.accent; c.lineWidth = 1.5; c.stroke();
        txt(c, 'cl main.c player.c', 84, 211, { size: 9.5, w: 700, col: C.text }); txt(c, 'build ALL the .c files', 84, 228, { size: 8.5, col: C.accent });
        c.restore();
      }
    }
  });
})();

/* =====================================================================
   p3b-link  (compile to .obj, then the linker matches names)
   ===================================================================== */
(function () {
  const OBJ = { main: { x: 62, y: 98, w: 128 }, player: { x: 222, y: 98, w: 128 } }, OH = 62;
  const SRC = { main: { x: 62, y: 30 }, player: { x: 222, y: 30 } }, SW = 128, SH = 34;
  RTSPlay.scene('p3b-link', {
    W, H,
    init: () => ({ cmd: '', inb: { main: false, player: false }, obj: { main: 0, player: 0 }, err1: 0, err2: 0, linked: 0 }),
    apply(S, a) {
      switch (a.a) {
        case 'cmd': S.cmd = a.t; S.inb.main = !!a.main; S.inb.player = !!a.player; break;
        case 'compile': S.obj[a.f] = 1; break;
        case 'err': if (a.n === 1) S.err1 = 1; else S.err2 = 1; break;
        case 'clear': S.obj.main = 0; S.obj.player = 0; S.err1 = 0; S.err2 = 0; S.linked = 0; break;
        case 'link': S.linked = 1; break;
      }
    },
    tween(V, a, lp, S) {
      switch (a.a) {
        case 'cmd': if (lp > 0) { V.cmd = lp >= .3 ? a.t : S.cmd; V.cmdK = seg(lp, 0, .6); V.inb = { main: !!a.main, player: !!a.player }; V.inbK = seg(lp, .3, 1); } break;
        case 'compile': V.cmpF = a.f; V.cmpK = lp; V.obj[a.f] = EZ.out(seg(lp, .3, 1)); break;
        case 'scan': V.scanK = lp; break;
        case 'err': if (lp > 0) { if (a.n === 1) V.err1 = EZ.back(seg(lp, 0, .5)); else V.err2 = EZ.back(seg(lp, 0, .5)); } break;
        case 'clear': if (lp > 0) { V.obj.main = 1 - lp; V.obj.player = 1 - lp; V.err1 = 1 - lp; V.err2 = 1 - lp; V.linked = 1 - lp; } break;
        case 'link': V.linked = EZ.io(lp); V.linkFlash = Math.sin(Math.PI * seg(lp, .5, 1)); break;
      }
    },
    prep(V, S) { V.cmpK = 0; V.cmpF = null; V.scanK = 0; V.linkFlash = 0; V.cmdK = 1; V.inbK = 1; },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      // command strip
      rrect(c, 6, 4, 388, 20, 4); c.fillStyle = rgba(C.border, .45); c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1; c.stroke();
      txt(c, V.cmd ? '> ' + V.cmd : '> ', 14, 14.5, { size: 10, w: 600, col: C.text, align: 'left', al: V.cmd ? 1 : .5 });
      const dock = V.linked * 24;
      // sources
      ['main', 'player'].forEach(f => {
        const s = SRC[f], on = V.inb[f], col = f === 'main' ? C.accent : C.blue, isC = V.cmpF === f && V.cmpK > 0 && V.cmpK < 1;
        c.save(); c.globalAlpha *= on ? 1 : .55; rrect(c, s.x, s.y, SW, SH, 4); c.fillStyle = rgba(col, on ? .12 : .04); c.fill();
        if (!on) c.setLineDash([4, 3]); c.strokeStyle = on ? col : C.muted; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]);
        txt(c, f + '.c', s.x + 8, s.y + 10, { size: 10.5, w: 700, col: on ? col : C.muted2, align: 'left' });
        txt(c, on ? (f === 'main' ? 'calls player_heal()' : 'has player_heal()') : 'not in this build', s.x + 8, s.y + 24, { size: 8.5, col: on ? C.muted2 : C.orange, align: 'left' });
        c.restore();
        // compile arrow
        const k = V.obj[f] > 0 ? 1 : 0, cx = s.x + SW / 2;
        if (on || k) { c.save(); c.strokeStyle = on ? C.muted : C.border2; c.lineWidth = 1.5; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(cx, s.y + SH + 2); c.lineTo(cx, OBJ[f].y - 4); c.stroke(); c.setLineDash([]);
          if (isC) { const y = lerp(s.y + SH + 2, OBJ[f].y - 4, EZ.io(V.cmpK)); c.beginPath(); c.arc(cx, y, 4, 0, 7); c.fillStyle = C.yellow; c.fill(); }
          arrowHead(c, on ? C.muted : C.border2, cx, OBJ[f].y - 3, Math.PI / 2); txt(c, 'compile', cx + 10, (s.y + SH + OBJ[f].y) / 2, { size: 8.5, col: C.muted, align: 'left' }); c.restore(); }
      });
      // obj: main
      const mo = V.obj.main, po = V.obj.player, m = OBJ.main, p = OBJ.player, py = p.x - dock;
      const socketY = m.y + 44;
      // empty slot for player.obj
      if (po < 1 && dock === 0) { c.save(); c.globalAlpha *= 1 - po; rrect(c, p.x, p.y, p.w, OH, 5); c.setLineDash([5, 4]); c.strokeStyle = C.muted; c.lineWidth = 1.25; c.stroke(); c.setLineDash([]);
        txt(c, V.inb.player ? 'player.obj' : 'player.obj ???', p.x + p.w / 2, p.y + OH / 2, { size: 10, col: C.muted, w: 600 }); c.restore(); }
      const drawObj = (o, x, y, title, has, needs, col, al, plug) => {
        c.save(); c.globalAlpha *= clamp(al); c.translate(0, (1 - clamp(al)) * -8);
        rrect(c, x, y, 128, OH, 5); c.fillStyle = rgba(col, .14); c.fill(); c.strokeStyle = col; c.lineWidth = 1.75; c.stroke();
        txt(c, title, x + 8, y + 11, { size: 10.5, w: 700, col, align: 'left' });
        txt(c, 'has:   ' + has, x + 8, y + 27, { size: 8.5, col: C.text, align: 'left' });
        if (needs) txt(c, 'needs: ' + needs, x + 8, y + 44, { size: 8.5, w: 700, col: V.linked > .5 ? C.accent : C.orange, align: 'left' });
        c.restore();
      };
      if (mo > 0) drawObj(null, m.x, m.y, 'main.obj', '_main', '_player_heal', C.accent, mo);
      if (po > 0) drawObj(null, py, p.y, 'player.obj', '_player_heal', '', C.blue, po);
      // socket on main.obj (right edge) and plug on player.obj (left edge)
      if (mo > 0) { c.save(); c.globalAlpha *= clamp(mo); const open = V.linked < .1;
        c.beginPath(); c.arc(m.x + m.w, socketY, 7, -Math.PI / 2, Math.PI / 2); c.lineTo(m.x + m.w, socketY - 7); c.fillStyle = open ? '#04040a' : rgba(C.accent, .5); c.fill(); c.strokeStyle = open ? C.orange : C.accent; c.lineWidth = 2; c.stroke();
        if (open && !po && (V.err1 > 0)) { const pk = rm ? 1 : .5 + .5 * Math.sin(T / 160); c.beginPath(); c.arc(m.x + m.w, socketY, 11 + 3 * pk, 0, 7); c.strokeStyle = rgba(C.orange, .5 * pk + .2); c.lineWidth = 2; c.stroke(); }
        c.restore(); }
      if (po > 0) { c.save(); c.globalAlpha *= clamp(po); c.beginPath(); c.arc(py, socketY, 7, 0, Math.PI * 2); c.fillStyle = rgba(C.blue, .5); c.fill(); c.strokeStyle = C.blue; c.lineWidth = 2; c.stroke();
        c.restore(); }
      if (V.linkFlash > 0 && po > 0) { c.save(); c.beginPath(); c.arc(m.x + m.w, socketY, 10 + 12 * V.linkFlash, 0, 7); c.strokeStyle = rgba(C.accent, 1 - V.linkFlash); c.lineWidth = 3; c.stroke(); c.restore(); }
      // probe (the linker looking for the name)
      if (V.scanK > 0 && V.scanK < 1) { const k = EZ.io(V.scanK), x = lerp(m.x + m.w + 6, p.x + 40, Math.min(1, k * 1.2)), y = socketY + 4 * Math.sin(k * 14);
        c.save(); c.strokeStyle = C.yellow; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y - 4, 8, 0, 7); c.stroke(); c.beginPath(); c.moveTo(x + 6, y + 2); c.lineTo(x + 13, y + 9); c.stroke();
        txt(c, '_player_heal ?', x, y - 20, { size: 8.5, w: 700, col: C.yellow }); c.restore(); }
      // output: game.exe
      const ex = 140, ey = 184, ew = 120, eh = 48, ok = V.linked;
      if (mo > 0 || po > 0) { c.save(); c.strokeStyle = ok > .5 ? C.accent : C.muted; c.lineWidth = 1.5; c.setLineDash(ok > .5 ? [] : [3, 3]);
        const e1 = [ex + 36, ey - 2];
        if (mo > 0) { c.beginPath(); c.moveTo(m.x + 40, m.y + OH + 2); c.lineTo(e1[0], e1[1]); c.stroke(); }
        if (po > 0) { c.beginPath(); c.moveTo(py + 90, p.y + OH + 2); c.lineTo(ex + 84, ey - 2); c.stroke(); }
        c.setLineDash([]); c.restore();
        txt(c, 'link', 110, 172, { size: 8.5, col: C.muted, align: 'right' }); }
      c.save(); if (ok < .5) c.setLineDash([5, 4]);
      rrect(c, ex, ey, ew, eh, 5); c.fillStyle = ok > .5 ? rgba(C.accent, .16) : rgba(C.border, .3); c.fill(); c.strokeStyle = ok > .5 ? C.accent : C.muted; c.lineWidth = 1.75; c.stroke(); c.setLineDash([]);
      c.globalAlpha *= ok > .5 ? 1 : .8; txt(c, 'game.exe', ex + ew / 2, ey + eh / 2, { size: 12, w: 700, col: ok > .5 ? C.accent : C.muted2 }); c.restore();
      if (ok > .5) { const k = EZ.back(seg(ok, .5, 1)); c.save(); c.translate(ex + ew - 10, ey + 8); c.scale(k, k); c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fillStyle = C.accent; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-4, 0); c.lineTo(-1, 3.5); c.lineTo(4.5, -3.5); c.stroke(); c.restore(); }
      if (V.err2 > 0) { c.save(); c.globalAlpha *= clamp(V.err2); c.strokeStyle = C.orange; c.lineWidth = 3; c.beginPath(); c.moveTo(ex + 20, ey + 10); c.lineTo(ex + ew - 20, ey + eh - 10); c.moveTo(ex + ew - 20, ey + 10); c.lineTo(ex + 20, ey + eh - 10); c.stroke(); c.restore();
        txt(c, 'LNK1120: 1 unresolved external', W / 2, 242, { size: 9, w: 700, col: C.orange, al: clamp(V.err2) }); }
      if (V.err1 > 0) { const k = Math.max(V.err1, .01); c.save(); c.translate(314, 178); c.rotate(-.08); c.scale(k, k); c.globalAlpha *= clamp(k);
        rrect(c, -54, -22, 108, 44, 5); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.orange; c.lineWidth = 2.5; c.stroke();
        txt(c, 'LNK2019', 0, -8, { size: 14, w: 800, col: C.orange }); txt(c, 'no body for', 0, 6, { size: 8.5, col: C.text }); txt(c, '_player_heal', 0, 16, { size: 8.5, w: 700, col: C.text }); c.restore(); }
    }
  });
})();

})();
