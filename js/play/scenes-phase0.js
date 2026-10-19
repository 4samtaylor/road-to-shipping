/* =====================================================================
   RTSPlay phase 00 scenes (how a computer works)
   =====================================================================
   Load after scenes-core.js. Canvas is 400x250 logical px. Colours are palette tokens only
   (the one exception is the colour swatch in p0-counter, which shows the program's own RGB value).
   Every scene lists its action names in `acts` (ignored by the engine, used by the spec checker).
   The memory rung reuses p3b-mem (scenes-phase3b.js).

   p0-switches  (bits) rows of light switches, one row per variable, 8 switches per byte
     row   { id, name, type, bytes, v }   a row of bytes*8 switches slides in showing v's bit pattern
     size  { id, t }                      a bracket under that row, labelled t ("1 byte")
     count { bits, n }                    top right counter doubles 2, 4, 8 ... up to "bits bits = n patterns"
     pulse { id? }                        a row flashes (no id = every row)
   p0-counter   (binary and hex) one value shown as DEC, BIN (grouped in fours) and HEX
     set    { v, bits:8|24, src? }        the value; bits flip with a ripple. src = how the code spells it
     group  {}                            brackets join each 4-bit group to its hex digit
     swatch { rgb:'FF8800' }              a colour chip; the three bytes get R G B labels
     tick   { from, to, bits? }           the readouts count up from -> to (bits switches the width first)
     say    { t }                         the printf strip at the top
   p0-cpu       (fetch, decode, execute) instruction rows in memory, a CPU chip with RIP, EAX and the cycle ring
     cap   { t }                          top strip text
     rip   { to:'0x1000' }                RIP shows to; the arrow points at that row
     phase { k:'fetch'|'decode'|'execute'|'next' }   the ring segment lights (fetch flies the row's bytes in)
     reg   { v, from?:'mem' }             EAX shows v (from:'mem' = loaded from score)
     mem   { v }                          score shows v (flies from EAX when it changes)
   p0-stack     (call stack) registers on the left, a stack column that grows down, RSP arrow
     push  { id, fn, vars:[[name,v],..], ret? }   a frame drops in below the lowest; RSP moves down
     set   { id, name, v, from?:'EAX' }   a variable in a frame changes
     reg   { r:'RCX'|'EAX', v }           register shows v; v:null clears it
     pop   { id }                         the frame slides off; RSP moves up
     cap   { t }                          caption bottom left
   p0-build     (toolchain) a folder, two sources through preprocess and compile, link with the C library
     cmd     { t }                        the terminal strip shows the command
     files   { list:[..], hot:[..], tag? } the folder card lists files; hot ones glow (tag = small label beside them)
     compile { f:'game'|'player' }        that source goes through 1 preprocess, 2 compile, out comes its .obj
     link    {}                           both .obj files and the C library flow into link; game.exe appears
   p0-os        (operating system) a Windows band with a core and scheduler, process boxes, a console, a folder
     proc   { id, name, pid, dim? }       a process box appears with its own memory pages and one thread
     core   { id }                        the core swings to that process's thread
     folder { files:[..] }                the folder card lists files
     ask    { id, t }                     a request card flies from the process up to Windows
     reply  { id, ok, t }                 Windows answers: a ticket (ok) or an orange NULL slip
     check  { id, t }                     a bubble over the answer slip (the program's check)
     say    { id, t }                     printf text appears in the console
     end    { id }                        the process box folds; its pages go back to Windows
   p0-keys      (keyboard input) keyboard, console, stdin queue, the program with a key card, stdout tray
     decl  {}                             the key card appears as int key = ?
     print { t }                          text goes program -> stdout -> console
     wait  {}                             the program shows an hourglass on getchar
     press { k }                          a key flies from the keyboard to the console (echo)
     enter {}                             the held line plus a newline drops into stdin, each with its code
     take  { v?, code? }                  the first stdin slot flies into the key card
     left  {}                             what is left in stdin pulses: still waiting
   p0-map       (why C) C features on the left, the machine part they map to on the right
     byte  { id, name, v }                an 8-switch byte with its decimal value
     wrap  { id, from, add, to }          the byte counts up; the ninth (carry) bit falls away; lands on to
     box   { id, name, v }                an int box
     ptr   { id, name, to }               a pointer box with an arrow to box `to`
     via   { p, v }                       a token follows the arrow and writes v into the target
     map   { row, c, hw }                 that row's C chip lights and joins its hardware picture
     size  { t }                          an 8-byte strip labelled t
   ===================================================================== */
(function () {
'use strict';
if (!window.RTSPlay) return;
const U = RTSPlay.util, clamp = U.clamp, lerp = U.lerp, seg = U.seg, EZ = U.EZ, rgba = U.rgba, txt = U.txt, rrect = U.rrect, FONT = U.FONT;
const W = 400, H = 250;
function reg(name, def) { def.W = W; def.H = H; RTSPlay.scene(name, def); }
const find = (arr, id) => { for (let i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; };
const pop = p => p > 0 && p < 1 ? 1 + .3 * Math.sin(Math.PI * p) : 1;
const bump = p => Math.sin(Math.PI * clamp(p));
let MC = null;   // an offscreen context, so tweens can measure text too
function tw(c, s, size, w) { MC = MC || document.createElement('canvas').getContext('2d'); MC.font = (w || 500) + ' ' + size + 'px ' + FONT; return MC.measureText(String(s)).width; }
function win(c, C, x, y, w, h, title, hot) {   // a small window with a title bar
  rrect(c, x, y, w, h, 4); c.fillStyle = C.surface2; c.fill(); c.lineWidth = 1.5; c.strokeStyle = hot ? rgba(hot, .8) : C.border2; c.stroke();
  c.fillStyle = rgba(C.border2, .8); c.fillRect(x + 1, y + 1, w - 2, 13);
  [C.orange, C.yellow, C.accent].forEach((col, i) => { c.fillStyle = rgba(col, .7); c.beginPath(); c.arc(x + 8 + i * 8, y + 7.5, 2.2, 0, 7); c.fill(); });
  if (title) txt(c, title, x + 36, y + 8, { size: 8, col: C.muted2, align: 'left' });
}
function box(c, x, y, w, h, col, a, lw, dash) {
  rrect(c, x, y, w, h, 4); c.fillStyle = rgba(col, a == null ? .12 : a); c.fill();
  if (dash) c.setLineDash(dash); c.strokeStyle = col; c.lineWidth = lw || 1.5; c.stroke(); c.setLineDash([]);
}
function token(c, C, s, x, y, al, sc) {   // the yellow travelling value chip (same look as p3b-mem)
  c.save(); c.globalAlpha *= clamp(al == null ? 1 : al); const w = tw(c, s, 10, 700) + 12;
  if (sc != null && sc !== 1) { c.translate(x, y); c.scale(sc, sc); c.translate(-x, -y); }
  rrect(c, x - w / 2, y - 8, w, 16, 4); c.fillStyle = C.yellow; c.fill(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1; c.stroke();
  txt(c, s, x, y + .5, { size: 10, w: 700, col: C.ink }); c.restore();
}
function arrowHead(c, col, x, y, ang, s) {
  s = s || 1; c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s); c.beginPath(); c.moveTo(0, 0); c.lineTo(-8, -4.5); c.lineTo(-5.5, 0); c.lineTo(-8, 4.5); c.closePath(); c.fillStyle = col; c.fill(); c.restore();
}
function arrow(c, col, x0, y0, x1, y1, dash, lw) {
  c.save(); c.strokeStyle = col; c.lineWidth = lw || 1.5; if (dash) c.setLineDash(dash); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.setLineDash([]);
  arrowHead(c, col, x1, y1, Math.atan2(y1 - y0, x1 - x0)); c.restore();
}
function bubble(c, C, s, x, y, col, al, size) {   // speech chip above (x, y), tail tip at y
  size = size || 9; c.save(); c.globalAlpha *= clamp(al == null ? 1 : al);
  const w = tw(c, s, size, 700) + 14, h = size + 9, top = y - h - 4;
  rrect(c, x - w / 2, top, w, h, 4); c.fillStyle = C.surface2; c.fill(); c.lineWidth = 1.25; c.strokeStyle = col; c.stroke();
  c.beginPath(); c.moveTo(x - 3.5, top + h - .5); c.lineTo(x + 3.5, top + h - .5); c.lineTo(x, y); c.closePath(); c.fillStyle = col; c.fill();
  txt(c, s, x, top + h / 2 + .5, { size, w: 700, col }); c.restore();
}
function toggle(c, C, x, y, k, glow) {   // one light switch centred at x,y; k: 0 = off, 1 = on
  const on = k > .5;
  rrect(c, x - 5.5, y - 9, 11, 18, 3); c.fillStyle = on ? rgba(C.accent, .16) : C.surface2; c.fill();
  c.lineWidth = glow ? 1.5 : 1; c.strokeStyle = glow ? C.yellow : (on ? rgba(C.accent, .7) : C.border2); c.stroke();
  const ky = lerp(y + 4.5, y - 4.5, clamp(k));
  rrect(c, x - 3.8, ky - 3.4, 7.6, 6.8, 2); c.fillStyle = on ? C.accent : rgba(C.muted, .55); c.fill();
}

/* ================= p0-switches ================= */
(function () {
  const ROWY = [52, 104, 156], LX = 126;
  const swX = j => LX + j * 16 + (j >= 8 ? 6 : 0);
  const bitOf = (v, i) => Math.floor(v / Math.pow(2, i)) % 2;
  const lines = r => r.bytes > 2 ? 2 : 1;
  const perLine = r => r.bytes > 2 ? 16 : r.bytes * 8;
  reg('p0-switches', {
    acts: ['row', 'size', 'count', 'pulse'],
    init: () => ({ rows: [], count: null }),
    apply(S, a) {
      switch (a.a) {
        case 'row': S.rows.push({ id: a.id, name: a.name, type: a.type, bytes: a.bytes, v: a.v, size: null }); break;
        case 'size': find(S.rows, a.id).size = a.t; break;
        case 'count': S.count = { bits: a.bits, n: a.n }; break;
      }
    },
    tween(V, a, lp, S) {
      if (lp <= 0) return;
      switch (a.a) {
        case 'row': { const r = { id: a.id, name: a.name, type: a.type, bytes: a.bytes, v: a.v, size: null, al: seg(lp, 0, .3), dx: (1 - EZ.out(seg(lp, 0, .4))) * 24, flip: lp, vk: seg(lp, .8, 1) }; V.rows.push(r); break; }
        case 'size': { const r = find(V.rows, a.id); r.size = a.t; r.sizeK = seg(lp, 0, .6); break; }
        case 'count': V.count = { bits: a.bits, n: a.n }; V.countK = lp; break;
        case 'pulse': V.rows.forEach(r => { if (!a.id || r.id === a.id) r.fl = bump(lp); }); break;
      }
    },
    prep(V) { V.countK = null; },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      txt(c, '1 switch = 1 bit: off is 0, on is 1', 12, 15, { size: 8.5, col: C.muted, align: 'left' });
      // counter (top right)
      if (V.count) {
        const ck = V.countK, bits = ck == null ? V.count.bits : Math.max(1, Math.min(V.count.bits, Math.floor(ck * V.count.bits * 1.15) + 1));
        const n = ck == null ? V.count.n : Math.pow(2, bits), s1 = bits + (bits === 1 ? ' bit = ' : ' bits = '), s2 = String(n), s3 = ' patterns';
        const w1 = tw(c, s1, 9.5, 600), w2 = tw(c, s2, 12, 800), w3 = tw(c, s3, 9.5, 600), x0 = 388 - w1 - w2 - w3;
        txt(c, s1, x0, 15, { size: 9.5, w: 600, col: C.text, align: 'left' });
        c.save(); c.translate(x0 + w1 + w2 / 2, 15); const pk = ck != null && ck < 1 ? 1 + .25 * Math.sin(Math.PI * ((ck * V.count.bits * 1.15) % 1)) : 1; c.scale(pk, pk);
        txt(c, s2, 0, 0, { size: 12, w: 800, col: C.yellow }); c.restore();
        txt(c, s3, x0 + w1 + w2, 15, { size: 9.5, w: 600, col: C.text, align: 'left' });
        V.glowN = ck == null || ck >= 1 ? 0 : bits;
      } else V.glowN = 0;
      V.rows.forEach((r, ri) => {
        const y0 = ROWY[ri], al = r.al == null ? 1 : r.al, dx = r.dx || 0, fl = r.fl || 0, n = r.bytes * 8, pl = perLine(r);
        c.save(); c.globalAlpha *= al; c.translate(dx, 0);
        if (fl > .02) { rrect(c, 6, y0 - 20, 388, lines(r) * 28 + 12, 5); c.fillStyle = rgba(C.yellow, .12 * fl); c.fill(); }
        txt(c, r.type, 12, y0 - 7, { size: 8, col: C.muted2, align: 'left' });
        const nw = tw(c, r.name, 11, 700); txt(c, r.name, 12, y0 + 7, { size: 11, w: 700, col: C.accent, align: 'left' });
        const vk = r.vk == null ? 1 : r.vk;
        if (vk > 0) txt(c, ' = ' + r.v, 12 + nw, y0 + 7, { size: 11, w: 700, col: C.text, align: 'left', al: vk });
        for (let L = 0; L < lines(r); L++) {
          const y = y0 + L * 28;
          for (let j = 0; j < pl; j++) {
            const q = L * pl + j, bi = n - 1 - q, b = bitOf(r.v, bi);
            const fk = r.flip == null ? 1 : seg(r.flip, .3 + q / n * .45, .3 + q / n * .45 + .12);
            const glow = ri === 0 && q < V.glowN;
            toggle(c, C, swX(j), y, b * fk, glow);
            txt(c, String(b * (fk > .5 ? 1 : 0)), swX(j), y + 15.5, { size: 7, w: 600, col: b && fk > .5 ? C.accent : C.muted });
          }
        }
        if (r.size) {
          const sk = r.sizeK == null ? 1 : EZ.out(r.sizeK), yb = y0 + (lines(r) - 1) * 28 + 24, x0 = swX(0) - 6, x1 = swX(pl - 1) + 6, xm = lerp(x0, x1, sk);
          c.strokeStyle = C.purple; c.lineWidth = 1.25; c.beginPath(); c.moveTo(x0, yb - 3); c.lineTo(x0, yb); c.lineTo(xm, yb); if (sk >= 1) c.lineTo(x1, yb - 3); c.stroke();
          const s = r.size + (lines(r) > 1 ? ' (both lines)' : '');
          const lw = tw(c, s, 8.5, 700) + 10, lx = (x0 + x1) / 2;
          c.save(); c.globalAlpha *= sk; rrect(c, lx - lw / 2, yb - 5, lw, 11, 3); c.fillStyle = C.surface; c.fill(); c.restore();
          txt(c, s, lx, yb + .5, { size: 8.5, w: 700, col: C.purple, al: sk });
        }
        c.restore();
      });
    }
  });
})();

/* ================= p0-counter ================= */
(function () {
  const BY = 120, HY = 172;
  const cx = i => 380 - i * 13 - Math.floor(i / 4) * 6;
  const bitOf = (v, i) => Math.floor(v / Math.pow(2, i)) % 2;
  const hexOf = (v, bits) => { let s = Math.max(0, v).toString(16); while (s.length < bits / 4) s = '0' + s; return s.slice(-bits / 4); };
  const shortHex = v => Math.max(0, v).toString(16);
  reg('p0-counter', {
    acts: ['set', 'group', 'swatch', 'tick', 'say'],
    init: () => ({ v: null, bits: 8, grp: false, sw: null, say: '', src: '' }),
    apply(S, a) {
      switch (a.a) {
        case 'set': S.v = a.v; S.bits = a.bits || 8; S.grp = false; S.sw = null; if (a.src != null) S.src = a.src; break;
        case 'group': S.grp = true; break;
        case 'swatch': S.sw = a.rgb; break;
        case 'tick': S.v = a.to; S.grp = false; S.sw = null; if (a.bits) S.bits = a.bits; break;
        case 'say': S.say = a.t; break;
      }
    },
    tween(V, a, lp, S) {
      if (lp <= 0) return;
      switch (a.a) {
        case 'set': {
          const ov = V.v == null ? 0 : V.v, ob = V.bits, nb = a.bits || 8, mx = Math.max(ob, nb), cells = [];
          for (let i = 0; i < mx; i++) {
            const t0 = .1 + (i / mx) * .5, f = lp >= t0, b = f ? bitOf(a.v, i) : bitOf(ov, i);
            const al = i < nb ? (i < ob ? 1 : seg(lp, 0, .3)) : 1 - seg(lp, 0, .3);
            cells.push({ b, al, fk: bump(seg(lp, t0, t0 + .15)) * (bitOf(a.v, i) !== bitOf(ov, i) ? 1 : 0) });
          }
          V.cells = cells; V.decV = lp >= .3 ? a.v : V.v; V.decPop = seg(lp, .3, .7); V.hexV = lp >= .65 ? a.v : V.v; V.hexBits = lp >= .65 ? nb : ob;
          V.grpK = V.grp ? 1 - seg(lp, 0, .2) : 0; if (lp >= .2) V.grp = false;
          if (V.sw) { V.swK = 1 - seg(lp, 0, .25); if (lp >= .25) V.sw = null; }
          if (a.src != null) { V.src = a.src; V.srcK = seg(lp, .2, .6); }
          if (lp >= 1) { V.v = a.v; V.bits = nb; V.cells = null; }
          break;
        }
        case 'group': V.grp = true; V.grpK = EZ.out(lp); break;
        case 'swatch': V.sw = a.rgb; V.swK = EZ.back(seg(lp, 0, .6)); break;
        case 'tick': { const v = Math.round(lerp(a.from, a.to, lp)); V.v = v; V.decV = v; V.hexV = v; V.grp = false; V.sw = null; if (a.bits) { V.bits = a.bits; V.hexBits = a.bits; } V.ticking = lp < 1; break; }
        case 'say': V.say = a.t; V.sayK = seg(lp, 0, .4); break;
      }
    },
    prep(V) { V.cells = null; V.decV = undefined; V.hexV = undefined; V.hexBits = undefined; V.decPop = 0; V.grpK = null; V.swK = null; V.sayK = null; V.srcK = null; V.ticking = false; },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      // printf strip
      rrect(c, 8, 6, 384, 20, 4); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = V.say ? rgba(C.accent, .5) : C.border2; c.lineWidth = 1; c.stroke();
      if (V.say) txt(c, 'printf: ' + V.say, 16, 16.5, { size: 9.5, w: 700, col: C.accent, align: 'left', al: V.sayK == null ? 1 : V.sayK });
      else txt(c, 'one number, three spellings', 200, 16.5, { size: 8.5, col: C.muted });
      ['DEC', 'BIN', 'HEX'].forEach((l, i) => txt(c, l, 14, [64, BY, HY][i], { size: 9, w: 800, col: C.muted2, align: 'left' }));
      const has = V.v != null;
      // DEC
      const dv = V.decV !== undefined ? V.decV : V.v;
      if (dv == null) txt(c, '-', 386, 64, { size: 24, w: 800, col: C.muted, align: 'right' });
      else { const s = String(dv), pk = pop(V.decPop), w = tw(c, s, 26, 800); c.save(); c.translate(386 - w / 2, 64); c.scale(pk, pk); txt(c, s, 0, 0, { size: 26, w: 800, col: C.text }); c.restore(); }
      // swatch
      if (V.sw) {
        const k = V.swK == null ? 1 : Math.max(0, V.swK);
        c.save(); c.translate(80, 64); c.scale(k, k); rrect(c, -30, -20, 60, 40, 5); c.fillStyle = '#' + V.sw; c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1.5; c.stroke(); c.restore();
        txt(c, '#' + V.sw, 118, 64, { size: 8.5, w: 700, col: C.muted2, align: 'left', al: clamp(k) });
      }
      // BIN
      const nb = V.cells ? V.cells.length : V.bits;
      for (let i = 0; i < nb; i++) {
        const cl = V.cells ? V.cells[i] : { b: has ? bitOf(V.v, i) : 0, al: 1, fk: 0 }, x = cx(i);
        c.save(); c.globalAlpha *= clamp(cl.al);
        rrect(c, x - 5.5, BY - 9, 11, 18, 2); c.fillStyle = cl.b ? C.accent : C.surface2; c.fill(); c.lineWidth = cl.fk > .02 ? 2 : 1; c.strokeStyle = cl.fk > .02 ? C.yellow : (cl.b ? C.accent : C.border2); c.stroke();
        txt(c, has || V.cells ? String(cl.b) : '', x, BY + .5, { size: 9, w: 700, col: cl.b ? C.ink : C.muted });
        c.restore();
      }
      if (V.sw) { const k = V.swK == null ? 1 : clamp(V.swK); ['R', 'G', 'B'].forEach((l, j) => { const hi = 23 - j * 8, lo = hi - 7, mx = (cx(hi) + cx(lo)) / 2;
        c.strokeStyle = rgba(C.muted2, .6 * k); c.lineWidth = 1; c.beginPath(); c.moveTo(cx(hi) - 5, BY - 14); c.lineTo(cx(lo) + 5, BY - 14); c.stroke();
        txt(c, l + '  ' + V.sw.substr(j * 2, 2), mx, BY - 22, { size: 8.5, w: 700, col: C.text, al: k }); }); }
      else if (has && !V.cells) txt(c, nb + ' bits', cx(nb - 1) - 8, BY - 18, { size: 7.5, col: C.muted, align: 'left' });
      // HEX
      const hv = V.hexV !== undefined ? V.hexV : V.v, hb = V.hexBits !== undefined ? V.hexBits : V.bits, gk = V.grpK == null ? (V.grp ? 1 : 0) : V.grpK;
      if (hv != null) {
        const hs = hexOf(hv, hb), ng = hb / 4;
        for (let g = 0; g < ng; g++) {
          const xl = cx(4 * g + 3) - 5.5, xr = cx(4 * g) + 5.5, xm = (xl + xr) / 2, d = hs[hs.length - 1 - g];
          if (gk > 0) { c.save(); c.globalAlpha *= clamp(gk); c.strokeStyle = C.purple; c.lineWidth = 1.25; c.beginPath(); c.moveTo(xl, BY + 13); c.lineTo(xl, BY + 17); c.lineTo(xr, BY + 17); c.lineTo(xr, BY + 13); c.stroke();
            c.beginPath(); c.moveTo(xm, BY + 17); c.lineTo(xm, lerp(BY + 17, HY - 12, EZ.out(gk))); c.stroke(); c.restore(); }
          txt(c, d, xm, HY, { size: 15, w: 800, col: gk > .5 ? C.purple : C.muted2 });
        }
        const sh = shortHex(hv), dec = String(hv);
        txt(c, 'printf %x: ' + sh + '    %u: ' + dec, 386, HY + 22, { size: 8, col: C.muted2, align: 'right', al: V.ticking ? .6 : 1 });
      } else txt(c, '-', 386, HY, { size: 15, w: 800, col: C.muted, align: 'right' });
      // how the code spells it
      if (V.src) { const sk = V.srcK == null ? 1 : V.srcK; c.save(); c.globalAlpha *= sk; rrect(c, 8, 214, 384, 28, 4); c.fillStyle = rgba(C.border, .35); c.fill(); c.restore();
        txt(c, 'in the code:', 16, 228.5, { size: 8.5, col: C.muted2, align: 'left', al: sk }); txt(c, V.src, 84, 228.5, { size: 10, w: 700, col: C.text, align: 'left', al: sk }); }
    }
  });
})();

/* ================= p0-cpu ================= */
(function () {
  const ROWS = [['0x1000', '8B 44 24 20', 'mov eax, [score]'], ['0x1004', '83 C0 0A', 'add eax, 10'], ['0x1007', '89 44 24 20', 'mov [score], eax'], ['0x100B', '...', 'next line']];
  const rowY = i => 66 + i * 24, RC = { x: 314, y: 184, r: 22 }, KS = ['fetch', 'decode', 'execute', 'next'];
  const EAX = { x: 254, y: 96, w: 120, h: 30 }, MEM = { x: 60, y: 192, w: 104, h: 42 };
  const rowIdx = a => ROWS.findIndex(r => r[0] === a);
  reg('p0-cpu', {
    acts: ['cap', 'rip', 'phase', 'reg', 'mem'],
    init: () => ({ cap: '', rip: null, ph: null, eax: null, mem: null }),
    apply(S, a) {
      switch (a.a) {
        case 'cap': S.cap = a.t; break;
        case 'rip': S.rip = a.to; break;
        case 'phase': S.ph = a.k; break;
        case 'reg': S.eax = a.v; break;
        case 'mem': S.mem = a.v; break;
      }
    },
    tween(V, a, lp, S) {
      if (lp <= 0) return;
      switch (a.a) {
        case 'cap': V.cap = a.t; V.capK = seg(lp, 0, .4); break;
        case 'rip': { const to = a.to, oi = rowIdx(V.rip), ni = rowIdx(to); V.ripY = oi < 0 ? rowY(ni) : lerp(rowY(oi), rowY(ni), EZ.io(seg(lp, 0, .5))); V.ripK = oi < 0 ? seg(lp, 0, .4) : 1; if (lp >= .3) V.rip = to; V.ripPop = seg(lp, .3, .7); break; }
        case 'phase': {
          V.prevPh = V.ph; V.ph = a.k; V.phK = seg(lp, 0, .35);
          if (a.k === 'fetch' && V.rip) { const i = rowIdx(V.rip), k = EZ.io(seg(lp, .1, .8)); if (lp < .8) V.fly = { t: ROWS[i][1], x: lerp(120, RC.x, k), y: lerp(rowY(i), RC.y, k) - 18 * Math.sin(Math.PI * k), al: 1 - seg(lp, .6, .8), sc: 1 - .5 * seg(lp, .5, .8) }; }
          break;
        }
        case 'reg': {
          if (a.from === 'mem') { const k = EZ.io(seg(lp, 0, .6)); if (lp < .6) V.fly = { t: String(a.v), x: lerp(MEM.x + MEM.w / 2, EAX.x + EAX.w / 2, k), y: lerp(MEM.y + MEM.h / 2, EAX.y + EAX.h / 2, k) - 20 * Math.sin(Math.PI * k) };
            if (lp >= .6) V.eax = a.v; V.eaxPop = seg(lp, .6, 1); V.memFl = bump(seg(lp, 0, .3)); }
          else { if (lp >= .3) V.eax = a.v; V.eaxPop = seg(lp, .3, .8); }
          break;
        }
        case 'mem': {
          if (V.mem != null && String(V.mem) !== String(a.v)) { const k = EZ.io(seg(lp, 0, .6)); if (lp < .6) V.fly = { t: String(a.v), x: lerp(EAX.x + EAX.w / 2, MEM.x + MEM.w / 2, k), y: lerp(EAX.y + EAX.h / 2, MEM.y + MEM.h / 2, k) - 20 * Math.sin(Math.PI * k) };
            if (lp >= .6) V.mem = a.v; V.memPop = seg(lp, .6, 1); V.eaxFl = bump(seg(lp, 0, .3)); }
          else { V.mem = a.v; V.memPop = seg(lp, 0, .6); }
          break;
        }
      }
    },
    prep(V) { V.capK = null; V.ripY = null; V.ripK = null; V.ripPop = 0; V.phK = null; V.prevPh = null; V.fly = null; V.eaxPop = 0; V.memPop = 0; V.memFl = 0; V.eaxFl = 0; },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      // C line strip
      rrect(c, 8, 6, 384, 22, 4); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1; c.stroke();
      if (V.cap) { txt(c, 'C:', 16, 17.5, { size: 8.5, col: C.muted2, align: 'left' }); txt(c, V.cap, 34, 17.5, { size: 10, w: 700, col: C.accent, align: 'left', al: V.capK == null ? 1 : V.capK }); txt(c, 'the CPU never sees this', 384, 17.5, { size: 8, col: C.muted, align: 'right', al: V.capK == null ? 1 : V.capK }); }
      else txt(c, 'x64 machine code', 200, 17.5, { size: 8.5, col: C.muted });
      // instruction memory
      win(c, C, 8, 38, 210, 128, 'memory: instructions');
      const ri = rowIdx(V.rip), ry = V.ripY != null ? V.ripY : (ri >= 0 ? rowY(ri) : null);
      if (ry != null) { c.save(); c.globalAlpha *= V.ripK == null ? 1 : V.ripK; c.fillStyle = rgba(C.accent, .14); c.fillRect(10, ry - 10, 206, 20); c.fillStyle = C.accent; c.fillRect(10, ry - 10, 2.5, 20); c.restore(); }
      ROWS.forEach((r, i) => { const y = rowY(i), cur = ri === i, last = i === 3;
        txt(c, r[0], 18, y, { size: 8, col: cur ? C.accent : C.muted, align: 'left', w: cur ? 700 : 500 });
        txt(c, r[1], 58, y, { size: 8, w: 600, col: last ? C.muted : C.text, align: 'left' });
        txt(c, r[2], 124, y, { size: 8, w: 700, col: last ? C.muted : C.purple, align: 'left' }); });
      // data memory
      win(c, C, 8, 174, 210, 68, 'memory: data');
      const mfl = V.memFl || 0;
      rrect(c, MEM.x, MEM.y, MEM.w, MEM.h, 4); c.fillStyle = rgba(C.blue, .12 + .3 * mfl); c.fill(); c.strokeStyle = mfl > .02 ? C.yellow : C.blue; c.lineWidth = 1.5; c.stroke();
      txt(c, 'int', MEM.x + 7, MEM.y + 10, { size: 8, col: C.muted2, align: 'left' }); txt(c, 'score', MEM.x + 26, MEM.y + 10, { size: 9, w: 700, col: C.blue, align: 'left' });
      if (V.mem != null) { const pk = pop(V.memPop); c.save(); c.translate(MEM.x + MEM.w / 2, MEM.y + 28); c.scale(pk, pk); txt(c, String(V.mem), 0, 0, { size: 16, w: 800, col: C.text }); c.restore(); }
      txt(c, '[score]', MEM.x + MEM.w + 8, MEM.y + 28, { size: 8, col: C.muted, align: 'left' });
      // CPU chip
      c.fillStyle = C.border2; for (let k = 0; k < 9; k++) { c.fillRect(244 + k * 16, 34, 6, 5); c.fillRect(244 + k * 16, 241, 6, 5); }
      rrect(c, 234, 38, 158, 204, 6); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.border2; c.lineWidth = 2; c.stroke();
      txt(c, 'CPU', 244, 50, { size: 9, w: 800, col: C.muted2, align: 'left' });
      // RIP
      txt(c, 'RIP', 254, 70, { size: 9, w: 800, col: C.accent, align: 'left' });
      rrect(c, 282, 60, 92, 20, 3); c.fillStyle = rgba(C.accent, .1); c.fill(); c.strokeStyle = rgba(C.accent, .6); c.lineWidth = 1; c.stroke();
      if (V.rip) { const pk = pop(V.ripPop); c.save(); c.translate(328, 70.5); c.scale(pk, pk); txt(c, V.rip, 0, 0, { size: 10, w: 700, col: C.text }); c.restore(); }
      else txt(c, '-', 328, 70.5, { size: 10, col: C.muted });
      if (ry != null) { c.save(); c.globalAlpha *= V.ripK == null ? 1 : V.ripK; c.setLineDash([3, 3]); c.strokeStyle = rgba(C.accent, .7); c.lineWidth = 1.25; c.beginPath(); c.moveTo(249, 70); c.lineTo(240, 70); c.lineTo(240, ry); c.lineTo(224, ry); c.stroke(); c.setLineDash([]); arrowHead(c, C.accent, 219, ry, Math.PI); c.restore(); }
      // EAX
      const efl = V.eaxFl || 0;
      txt(c, 'EAX', EAX.x, EAX.y - 7, { size: 9, w: 800, col: C.yellow, align: 'left' }); txt(c, 'a register', EAX.x + 26, EAX.y - 7, { size: 7.5, col: C.muted, align: 'left' });
      rrect(c, EAX.x, EAX.y, EAX.w, EAX.h, 4); c.fillStyle = rgba(C.yellow, .1 + .3 * efl); c.fill(); c.strokeStyle = rgba(C.yellow, .7); c.lineWidth = 1.5; c.stroke();
      if (V.eax != null) { const pk = pop(V.eaxPop); c.save(); c.translate(EAX.x + EAX.w / 2, EAX.y + EAX.h / 2 + .5); c.scale(pk, pk); txt(c, String(V.eax), 0, 0, { size: 15, w: 800, col: C.text }); c.restore(); }
      else txt(c, 'empty', EAX.x + EAX.w / 2, EAX.y + EAX.h / 2 + .5, { size: 9, col: C.muted });
      // cycle ring
      const LAB = [[RC.x, RC.y - 36, 'FETCH'], [RC.x + 46, RC.y, 'DECODE'], [RC.x, RC.y + 36, 'EXECUTE'], [RC.x - 44, RC.y, 'NEXT']];
      KS.forEach((k, i) => {
        const ang = -Math.PI / 2 + i * Math.PI / 2, on = V.ph === k, was = V.prevPh === k && V.phK != null;
        const lit = on ? (V.phK == null ? 1 : V.phK) : (was ? 1 - V.phK : 0);
        c.beginPath(); c.arc(RC.x, RC.y, RC.r, ang - Math.PI / 4 + .08, ang + Math.PI / 4 - .08); c.lineWidth = 9; c.lineCap = 'butt';
        c.strokeStyle = C.border2; c.stroke(); if (lit > 0) { c.strokeStyle = rgba(C.accent, lit); c.stroke(); }
        txt(c, LAB[i][2], LAB[i][0], LAB[i][1], { size: 8, w: 800, col: lit > .5 ? C.accent : C.muted });
      });
      // a little arrowhead showing the direction round the ring
      arrowHead(c, C.muted, RC.x + RC.r * Math.cos(-Math.PI / 4) + 2, RC.y + RC.r * Math.sin(-Math.PI / 4) - 2, Math.PI / 4, .8);
      txt(c, 'loop', RC.x, RC.y + .5, { size: 7.5, col: C.muted });
      if (V.fly) token(c, C, V.fly.t, V.fly.x, V.fly.y, V.fly.al, V.fly.sc);
    }
  });
})();

/* ================= p0-stack ================= */
(function () {
  const COL = { x: 170, y: 32, w: 222, h: 210 }, FX = 178, FW = 206, TOP = 42, GAP = 6, ROW = 17;
  const fh = f => 22 + f.vars.length * ROW + 3;
  const cols = ['accent', 'blue', 'purple', 'orange'];
  const REG = { RCX: { y: 42, sub: 'argument' }, EAX: { y: 98, sub: 'return value' }, RIP: { y: 154, sub: 'running' } };
  const layout = frames => { let y = TOP; return frames.map(f => { const o = y; y += fh(f) + GAP; return o; }); };
  const bottomOf = frames => { if (!frames.length) return TOP - 4; const ys = layout(frames), f = frames[frames.length - 1]; return ys[ys.length - 1] + fh(f); };
  const varPos = (frames, id, name) => { const ys = layout(frames); for (let i = 0; i < frames.length; i++) if (frames[i].id === id) { const k = frames[i].vars.findIndex(v => v[0] === name); return [FX + FW - 30, ys[i] + 22 + k * ROW + ROW / 2]; } return [FX + FW / 2, TOP]; };
  reg('p0-stack', {
    acts: ['push', 'set', 'reg', 'pop', 'cap'],
    init: () => ({ frames: [], RCX: null, EAX: null, cap: '', n: 0 }),
    apply(S, a) {
      switch (a.a) {
        case 'push': S.frames.push({ id: a.id, fn: a.fn, ret: a.ret || '', vars: a.vars.map(v => [v[0], String(v[1])]), ci: S.n % cols.length }); S.n++; break;
        case 'set': { const f = find(S.frames, a.id), v = f.vars.find(x => x[0] === a.name); v[1] = String(a.v); break; }
        case 'reg': S[a.r] = a.v == null ? null : String(a.v); break;
        case 'pop': { const i = S.frames.findIndex(f => f.id === a.id); if (i >= 0) S.frames.splice(i, 1); break; }
        case 'cap': S.cap = a.t; break;
      }
    },
    tween(V, a, lp, S) {
      if (lp <= 0) return;
      switch (a.a) {
        case 'push': {
          const oldB = bottomOf(V.frames), f = { id: a.id, fn: a.fn, ret: a.ret || '', vars: a.vars.map(v => [v[0], String(v[1])]), ci: V.n % cols.length, al: seg(lp, 0, .4), dy: -(1 - EZ.out(seg(lp, 0, .5))) * 16 };
          V.frames.push(f); V.n++; V.rsp = lerp(oldB, bottomOf(V.frames), EZ.io(seg(lp, .2, .7)));
          if (V.RCX != null && f.vars.length && f.vars[0][1] === V.RCX) {
            const k = EZ.io(seg(lp, .35, .85)), p = varPos(V.frames, a.id, f.vars[0][0]);
            if (lp < .85) { f.hide0 = true; if (lp > .35) V.fly = { t: V.RCX, x: lerp(62, p[0], k), y: lerp(REG.RCX.y + 22, p[1], k) - 20 * Math.sin(Math.PI * k) }; }
            else f.pop0 = seg(lp, .85, 1);
          }
          break;
        }
        case 'set': {
          const f = find(V.frames, a.id), v = f.vars.find(x => x[0] === a.name), p = varPos(V.frames, a.id, a.name);
          if (a.from) { const k = EZ.io(seg(lp, 0, .55)), r = REG[a.from]; if (lp < .55) V.fly = { t: String(a.v), x: lerp(62, p[0], k), y: lerp(r.y + 22, p[1], k) - 20 * Math.sin(Math.PI * k) }; }
          const t0 = a.from ? .55 : .3; if (lp >= t0) v[1] = String(a.v); f.popVar = a.name; f.popK = seg(lp, t0, 1); break;
        }
        case 'reg': { if (lp >= .3) V[a.r] = a.v == null ? null : String(a.v); V.regPop = a.r; V.regK = seg(lp, .3, .8); break; }
        case 'pop': {
          const f = find(V.frames, a.id); if (!f) break; const oldB = bottomOf(V.frames);
          f.al = 1 - EZ.in(lp); f.dx = 30 * EZ.in(lp);
          const rest = V.frames.filter(x => x.id !== a.id); V.rsp = lerp(oldB, bottomOf(rest), EZ.io(seg(lp, .3, .9)));
          if (lp >= .5) V.ripFrames = rest; break;
        }
        case 'cap': V.cap = a.t; V.capK = seg(lp, 0, .4); break;
      }
    },
    prep(V) { V.rsp = null; V.fly = null; V.regPop = null; V.regK = 0; V.capK = null; V.ripFrames = null; },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      // stack column
      txt(c, 'stack (grows down)', COL.x + 2, 19, { size: 9.5, w: 800, col: C.text, align: 'left' });
      txt(c, 'high addresses', COL.x + COL.w, 19, { size: 7.5, col: C.muted, align: 'right' });
      rrect(c, COL.x, COL.y, COL.w, COL.h, 5); c.fillStyle = rgba(C.border, .22); c.fill(); c.setLineDash([4, 4]); c.strokeStyle = C.border2; c.lineWidth = 1.25; c.stroke(); c.setLineDash([]);
      txt(c, 'lower addresses', COL.x + COL.w - 6, COL.y + COL.h - 8, { size: 7.5, col: C.muted, align: 'right' });
      arrowHead(c, C.muted, COL.x + COL.w - 80, COL.y + COL.h - 4, Math.PI / 2, .7);
      const ys = layout(V.frames);
      V.frames.forEach((f, i) => {
        const y = ys[i] + (f.dy || 0), x = FX + (f.dx || 0), h = fh(f), col = C[cols[f.ci]];
        c.save(); c.globalAlpha *= clamp(f.al == null ? 1 : f.al);
        rrect(c, x, y, FW, h, 4); c.fillStyle = rgba(col, .1); c.fill(); c.strokeStyle = col; c.lineWidth = 1.5; c.stroke();
        txt(c, f.fn, x + 8, y + 10, { size: 9.5, w: 800, col, align: 'left' });
        if (f.ret) txt(c, 'returns to ' + f.ret, x + FW - 8, y + 10, { size: 7.5, col: C.muted2, align: 'right' });
        c.strokeStyle = rgba(col, .4); c.lineWidth = 1; c.beginPath(); c.moveTo(x + 6, y + 19.5); c.lineTo(x + FW - 6, y + 19.5); c.stroke();
        f.vars.forEach((v, k) => {
          const vy = y + 22 + k * ROW + ROW / 2; txt(c, 'int', x + 14, vy, { size: 8, col: C.muted2, align: 'left' }); txt(c, v[0], x + 34, vy, { size: 9.5, w: 700, col: C.text, align: 'left' });
          if (k === 0 && f.hide0) return;
          const pk = f.popVar === v[0] ? pop(f.popK) : (k === 0 && f.pop0 ? pop(f.pop0) : 1);
          c.save(); c.translate(x + FW - 30, vy); c.scale(pk, pk); txt(c, v[1], 0, 0, { size: 11, w: 800, col: v[1] === '?' ? C.muted : C.text }); c.restore();
        });
        c.restore();
      });
      // RSP
      const rsp = V.rsp != null ? V.rsp : bottomOf(V.frames);
      arrow(c, C.orange, 147, rsp, 167, rsp, null, 2);
      txt(c, 'RSP', 143, rsp, { size: 9, w: 800, col: C.orange, align: 'right' });
      // registers
      Object.keys(REG).forEach(r => {
        const g = REG[r], y = g.y; let v = V[r];
        if (r === 'RIP') { const fr = V.ripFrames || V.frames; v = fr.length ? fr[fr.length - 1].fn : null; }
        const col = r === 'RCX' ? C.purple : r === 'EAX' ? C.yellow : C.accent;
        rrect(c, 8, y, 114, 44, 4); c.fillStyle = rgba(col, .1); c.fill(); c.strokeStyle = rgba(col, .7); c.lineWidth = 1.5; c.stroke();
        txt(c, r, 15, y + 10, { size: 9, w: 800, col, align: 'left' }); txt(c, g.sub, 115, y + 10, { size: 7.5, col: C.muted, align: 'right' });
        const pk = V.regPop === r ? pop(V.regK) : 1;
        c.save(); c.translate(65, y + 29); c.scale(pk, pk);
        if (v == null) txt(c, '-', 0, 0, { size: 11, col: C.muted }); else txt(c, v, 0, 0, { size: r === 'RIP' ? 10.5 : 14, w: 800, col: C.text }); c.restore();
      });
      if (V.cap) txt(c, V.cap, 8, 222, { size: 8.5, w: 700, col: C.orange, align: 'left', al: V.capK == null ? 1 : V.capK });
      if (V.fly) token(c, C, V.fly.t, V.fly.x, V.fly.y);
    }
  });
})();

/* ================= p0-build ================= */
(function () {
  const ROWY = { game: 52, player: 98 }, SRC = { x: 128, w: 54 }, PRE = { x: 190, w: 62 }, CMP = { x: 260, w: 54 }, OBJ = { x: 322, w: 58 }, RH = 26;
  const LNK = { x: 214, y: 140, w: 148, h: 26 }, EXE = { x: 238, y: 192, w: 100, h: 34 }, LIB = { x: 8, y: 140, w: 110, h: 26 }, BUS = 388;
  reg('p0-build', {
    acts: ['cmd', 'files', 'compile', 'link'],
    init: () => ({ cmd: '', files: ['game.c', 'player.c'], hot: [], tag: '', obj: { game: 0, player: 0 }, linked: 0, cl: false }),
    apply(S, a) {
      switch (a.a) {
        case 'cmd': S.cmd = a.t; if (/^cl /.test(a.t)) S.cl = true; break;
        case 'files': S.files = a.list.slice(); S.hot = (a.hot || []).slice(); S.tag = a.tag || ''; break;
        case 'compile': S.obj[a.f] = 1; break;
        case 'link': S.linked = 1; break;
      }
    },
    tween(V, a, lp, S) {
      if (lp <= 0) return;
      switch (a.a) {
        case 'cmd': V.cmd = a.t; V.cmdN = Math.floor(seg(lp, 0, .6) * a.t.length); if (/^cl /.test(a.t)) { V.cl = true; V.clK = seg(lp, .5, 1); } break;
        case 'files': V.files = a.list.slice(); V.hot = (a.hot || []).slice(); V.tag = a.tag || ''; V.filesK = lp; break;
        case 'compile': V.cmpF = a.f; V.cmpK = lp; V.obj = Object.assign({}, V.obj); V.obj[a.f] = seg(lp, .78, 1); break;
        case 'link': V.linkK = lp; V.linked = seg(lp, .6, 1); break;
      }
    },
    prep(V) { V.cmdN = null; V.clK = null; V.filesK = null; V.cmpF = null; V.cmpK = 0; V.linkK = 0; },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      // terminal strip
      rrect(c, 8, 6, 384, 20, 4); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1; c.stroke();
      const cmd = V.cmdN == null ? V.cmd : V.cmd.slice(0, V.cmdN);
      const pw = tw(c, 'C:\\dev\\p00> ', 9, 600); txt(c, 'C:\\dev\\p00> ', 16, 16.5, { size: 9, w: 600, col: C.muted2, align: 'left' });
      txt(c, cmd, 16 + pw, 16.5, { size: 9, w: 700, col: C.text, align: 'left' });
      // folder
      win(c, C, 8, 34, 110, 98, 'C:\\dev\\p00');
      V.files.forEach((f, i) => {
        const y = 58 + i * 14, hot = V.hot.indexOf(f) >= 0, hk = V.filesK == null ? 1 : seg(V.filesK, .2 + i * .1, .5 + i * .1);
        if (hot) { c.fillStyle = rgba(V.tag ? C.orange : C.accent, .16 * hk); c.fillRect(10, y - 6.5, 106, 13); }
        txt(c, f, 16, y, { size: 8.5, w: hot ? 700 : 500, col: hot ? (V.tag ? C.orange : C.accent) : C.text, align: 'left', al: V.filesK == null ? 1 : seg(V.filesK, i * .08, i * .08 + .3) });
        if (hot && V.tag) txt(c, V.tag, 113, y, { size: 7, w: 700, col: C.orange, align: 'right', al: hk });
      });
      // C library
      const lk = V.linkK, lit = lk > 0 && lk < 1;
      box(c, LIB.x, LIB.y, LIB.w, LIB.h, C.blue, lit ? .25 : .1);
      txt(c, 'C library', LIB.x + LIB.w / 2, LIB.y + LIB.h / 2 + .5, { size: 9, w: 700, col: C.blue });
      txt(c, 'printf, fopen ...', LIB.x + LIB.w / 2, LIB.y + LIB.h + 9, { size: 7.5, col: C.muted });
      arrow(c, V.linked > .5 ? C.accent : C.muted, LIB.x + LIB.w + 2, LIB.y + LIB.h / 2, LNK.x - 3, LNK.y + LNK.h / 2, V.linked > .5 ? null : [3, 3]);
      // cl note
      if (V.cl) { const k = V.clK == null ? 1 : V.clK; txt(c, 'cl runs all three steps', 14, 196, { size: 8, w: 700, col: C.purple, align: 'left', al: k }); txt(c, '1 preprocess', 14, 210, { size: 7.5, col: C.muted2, align: 'left', al: k });
        txt(c, '2 compile (one file each)', 14, 221, { size: 7.5, col: C.muted2, align: 'left', al: k }); txt(c, '3 link (all together)', 14, 232, { size: 7.5, col: C.muted2, align: 'left', al: k }); }
      // the two rows
      ['game', 'player'].forEach(f => {
        const y = ROWY[f], top = y - RH / 2, on = V.cmpF === f, k = on ? V.cmpK : 0, col = f === 'game' ? C.accent : C.blue;
        box(c, SRC.x, top, SRC.w, RH, col, .12); txt(c, f + '.c', SRC.x + SRC.w / 2, y + .5, { size: 9, w: 700, col });
        const preOn = on && k > .15 && k < .5, cmpOn = on && k > .45 && k < .8;
        box(c, PRE.x, top, PRE.w, RH, preOn ? C.purple : C.border2, preOn ? .22 : .5, 1.25);
        txt(c, '1 preprocess', PRE.x + PRE.w / 2, y + .5, { size: 7.5, w: 700, col: preOn ? C.text : C.muted2 });
        box(c, CMP.x, top, CMP.w, RH, cmpOn ? C.yellow : C.border2, cmpOn ? .22 : .5, 1.25);
        txt(c, '2 compile', CMP.x + CMP.w / 2, y + .5, { size: 7.5, w: 700, col: cmpOn ? C.text : C.muted2 });
        if (preOn) txt(c, 'headers pasted in', PRE.x + PRE.w / 2, top + RH + 8, { size: 7, w: 600, col: C.purple, al: bump(seg(k, .15, .5)) });
        if (cmpOn) txt(c, 'C to machine code', CMP.x + CMP.w / 2, top + RH + 8, { size: 7, w: 600, col: C.yellow, al: bump(seg(k, .45, .8)) });
        [[SRC.x + SRC.w, PRE.x], [PRE.x + PRE.w, CMP.x], [CMP.x + CMP.w, OBJ.x]].forEach(p => arrow(c, C.muted, p[0] + 1, y, p[1] - 2, y));
        const ob = V.obj[f];
        if (ob > 0) { c.save(); c.translate(OBJ.x + OBJ.w / 2, y); const pk = pop(ob < 1 ? ob : 0); c.scale(pk, pk); c.globalAlpha *= clamp(ob * 2);
          box(c, -OBJ.w / 2, -RH / 2, OBJ.w, RH, col, .18); txt(c, f + '.obj', 0, .5, { size: 8.5, w: 700, col }); c.restore(); }
        else { box(c, OBJ.x, top, OBJ.w, RH, C.muted, 0, 1, [3, 3]); txt(c, f + '.obj', OBJ.x + OBJ.w / 2, y + .5, { size: 8.5, col: C.muted }); }
        // the travelling sheet
        if (on && k > 0 && k < .8) { const pts = [SRC.x + SRC.w / 2, PRE.x + PRE.w / 2, CMP.x + CMP.w / 2, OBJ.x + OBJ.w / 2], q = seg(k, .05, .8) * 3, i = Math.min(2, Math.floor(q)), x = lerp(pts[i], pts[i + 1], EZ.io(q - i));
          c.save(); c.translate(x, y - 20); c.fillStyle = C.yellow; c.beginPath(); c.moveTo(-5, -6); c.lineTo(2, -6); c.lineTo(5, -3); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill(); c.restore(); }
        // to the bus
        const busCol = V.linked > .5 ? C.accent : C.border2;
        c.strokeStyle = busCol; c.lineWidth = 1.5; c.beginPath(); c.moveTo(OBJ.x + OBJ.w, y); c.lineTo(BUS, y); c.stroke();
      });
      const busCol = V.linked > .5 ? C.accent : C.border2;
      c.strokeStyle = busCol; c.lineWidth = 1.5; c.beginPath(); c.moveTo(BUS, ROWY.game); c.lineTo(BUS, LNK.y + LNK.h / 2); c.lineTo(LNK.x + LNK.w + 3, LNK.y + LNK.h / 2); c.stroke();
      arrowHead(c, busCol, LNK.x + LNK.w + 2, LNK.y + LNK.h / 2, Math.PI);
      if (lit) { // .obj tokens down the bus, a library token from the left
        const k = EZ.io(seg(lk, 0, .5));
        [ROWY.game, ROWY.player].forEach((y0, i) => { const ty = lerp(y0, LNK.y + LNK.h / 2, k), tx = k < .95 ? BUS : BUS; c.fillStyle = i ? C.blue : C.accent; c.beginPath(); c.arc(tx, ty, 4, 0, 7); c.fill(); });
        c.fillStyle = C.blue; c.beginPath(); c.arc(lerp(LIB.x + LIB.w, LNK.x, k), LIB.y + LIB.h / 2, 4, 0, 7); c.fill();
      }
      const lon = lit && lk > .3 && lk < .75;
      box(c, LNK.x, LNK.y, LNK.w, LNK.h, lon ? C.orange : (V.linked > .5 ? C.accent : C.border2), lon ? .22 : .4, 1.5);
      txt(c, '3 link (link.exe)', LNK.x + LNK.w / 2, LNK.y + LNK.h / 2 + .5, { size: 8.5, w: 700, col: lon || V.linked > .5 ? C.text : C.muted2 });
      if (lon) txt(c, 'calls matched by name', LNK.x + LNK.w / 2, LNK.y + LNK.h + 8, { size: 7, w: 600, col: C.orange });
      arrow(c, V.linked > .5 ? C.accent : C.muted, EXE.x + EXE.w / 2, LNK.y + LNK.h + 2, EXE.x + EXE.w / 2, EXE.y - 3, V.linked > .5 ? null : [3, 3]);
      const ok = V.linked;
      if (ok > 0) { c.save(); c.translate(EXE.x + EXE.w / 2, EXE.y + EXE.h / 2); const pk = pop(ok < 1 ? ok : 0); c.scale(pk, pk); c.globalAlpha *= clamp(ok * 2);
        box(c, -EXE.w / 2, -EXE.h / 2, EXE.w, EXE.h, C.accent, .16, 1.75); txt(c, 'game.exe', 0, .5, { size: 11, w: 800, col: C.accent }); c.restore(); }
      else { box(c, EXE.x, EXE.y, EXE.w, EXE.h, C.muted, 0, 1.25, [4, 4]); txt(c, 'game.exe', EXE.x + EXE.w / 2, EXE.y + EXE.h / 2 + .5, { size: 11, w: 600, col: C.muted }); }
      if (ok >= 1) { c.save(); c.translate(EXE.x + EXE.w - 8, EXE.y + 6); c.beginPath(); c.arc(0, 0, 8, 0, 7); c.fillStyle = C.accent; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-3.5, 0); c.lineTo(-1, 3); c.lineTo(4, -3); c.stroke(); c.restore(); }
    }
  });
})();

/* ================= p0-os ================= */
(function () {
  const PX = [8, 204], PW = 188, PY = 66, PH = 104, CORE = { x: 214, y: 30 }, DIAL = { x: 318, y: 30 };
  const slip = p => ({ x: p.x + PW - 40, y: PY + 70 });
  const procAt = (procs, id) => { const i = procs.findIndex(p => p.id === id); return i < 0 ? null : { x: PX[i], i }; };
  reg('p0-os', {
    acts: ['proc', 'core', 'folder', 'ask', 'reply', 'check', 'say', 'end'],
    init: () => ({ procs: [], core: null, turns: 0, folder: null, ask: null, reply: null, say: '' }),
    apply(S, a) {
      switch (a.a) {
        case 'proc': S.procs.push({ id: a.id, name: a.name, pid: a.pid, dim: !!a.dim, gone: false }); break;
        case 'core': S.core = a.id; S.turns++; break;
        case 'folder': S.folder = a.files.slice(); break;
        case 'ask': S.ask = { id: a.id, t: a.t }; break;
        case 'reply': S.reply = { id: a.id, ok: !!a.ok, t: a.t }; S.ask = null; break;
        case 'say': S.say = a.t; break;
        case 'end': { const p = find(S.procs, a.id); p.gone = true; if (S.reply && S.reply.id === a.id) S.reply = null; if (S.core === a.id) { const o = S.procs.find(q => !q.gone); S.core = o ? o.id : null; S.turns++; } break; }
      }
    },
    tween(V, a, lp, S) {
      if (lp <= 0) return;
      switch (a.a) {
        case 'proc': { const p = { id: a.id, name: a.name, pid: a.pid, dim: !!a.dim, gone: false, k: EZ.back(seg(lp, 0, .6)) }; V.procs.push(p); break; }
        case 'core': V.coreFrom = V.core; V.core = a.id; V.coreK = EZ.io(lp); V.turns += 1; V.turnK = lp; break;
        case 'folder': V.folder = a.files.slice(); V.folderK = lp; break;
        case 'ask': V.ask = { id: a.id, t: a.t }; V.askK = lp; break;
        case 'reply': V.ask = lp < .45 ? V.ask : null; V.reply = lp >= .45 ? { id: a.id, ok: !!a.ok, t: a.t } : V.reply; V.replyK = lp; V.replyNew = { id: a.id, ok: !!a.ok, t: a.t }; break;
        case 'check': V.check = { id: a.id, t: a.t, k: lp }; break;
        case 'say': V.say = a.t; V.sayN = Math.floor(seg(lp, .1, .8) * a.t.length); break;
        case 'end': { const p = find(V.procs, a.id); p.fold = lp; if (V.core === a.id && lp > .5) { const o = V.procs.find(q => q.id !== a.id && !q.gone); V.coreFrom = a.id; V.core = o ? o.id : null; V.coreK = EZ.io(seg(lp, .5, 1)); V.turns += 1; V.turnK = seg(lp, .5, 1); } break; }
      }
    },
    prep(V) { V.coreFrom = null; V.coreK = null; V.turnK = null; V.folderK = null; V.askK = null; V.replyK = null; V.replyNew = null; V.check = null; V.sayN = null; },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      // Windows band
      rrect(c, 8, 6, 384, 48, 5); c.fillStyle = rgba(C.blue, .1); c.fill(); c.strokeStyle = rgba(C.blue, .7); c.lineWidth = 1.5; c.stroke();
      txt(c, 'Windows', 16, 18, { size: 11, w: 800, col: C.blue, align: 'left' }); txt(c, 'the operating system', 82, 18.5, { size: 7.5, col: C.muted2, align: 'left' });
      // core icon
      c.fillStyle = C.border2; for (let k = 0; k < 3; k++) { c.fillRect(CORE.x - 9 + k * 7, CORE.y - 15, 3, 4); c.fillRect(CORE.x - 9 + k * 7, CORE.y + 11, 3, 4); c.fillRect(CORE.x - 15, CORE.y - 9 + k * 7, 4, 3); c.fillRect(CORE.x + 11, CORE.y - 9 + k * 7, 4, 3); }
      rrect(c, CORE.x - 11, CORE.y - 11, 22, 22, 3); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.accent; c.lineWidth = 1.5; c.stroke();
      txt(c, 'core', CORE.x + 20, CORE.y, { size: 8, w: 700, col: C.accent, align: 'left' });
      // scheduler dial
      const turns = V.turns - (V.turnK != null ? 1 - V.turnK : 0), ang = -Math.PI / 2 + turns * Math.PI * .75;
      c.beginPath(); c.arc(DIAL.x, DIAL.y, 12, 0, 7); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.border2; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = C.yellow; c.lineWidth = 2; c.beginPath(); c.moveTo(DIAL.x, DIAL.y); c.lineTo(DIAL.x + 9 * Math.cos(ang), DIAL.y + 9 * Math.sin(ang)); c.stroke();
      txt(c, 'scheduler', DIAL.x + 18, DIAL.y, { size: 8, col: C.muted2, align: 'left' });
      // core line to the running thread
      const laneOf = id => { const p = procAt(V.procs, id); return p ? [p.x + PW / 2, PY + 84] : null; };
      const to = laneOf(V.core), from = V.coreFrom ? laneOf(V.coreFrom) : null;
      if (to) { const k = V.coreK == null ? 1 : V.coreK, e = from ? [lerp(from[0], to[0], k), lerp(from[1], to[1], k)] : to;
        c.save(); c.setLineDash([3, 3]); c.strokeStyle = rgba(C.accent, .75); c.lineWidth = 1.5; c.beginPath(); c.moveTo(CORE.x, CORE.y + 15); c.lineTo(CORE.x, PY - 4); c.lineTo(e[0], PY - 4); c.lineTo(e[0], PY + 2); c.stroke(); c.setLineDash([]); c.restore();
        arrowHead(c, C.accent, e[0], PY + 4, Math.PI / 2, .8); }
      // processes
      V.procs.forEach((p, i) => {
        if (p.gone) return; const x = PX[i], fold = p.fold || 0, k = p.k == null ? 1 : p.k, col = p.dim ? C.muted2 : C.accent, running = V.core === p.id;
        c.save(); c.globalAlpha *= (p.dim ? .65 : 1) * clamp(k) * (1 - seg(fold, .6, 1)); c.translate(x + PW / 2, PY); c.scale(1, Math.max(.02, (1 - EZ.in(fold)) * clamp(k))); c.translate(-x - PW / 2, -PY);
        rrect(c, x, PY, PW, PH, 5); c.fillStyle = rgba(col, .08); c.fill(); c.strokeStyle = rgba(col, .8); c.lineWidth = 1.5; c.stroke();
        txt(c, p.name, x + 9, PY + 13, { size: 10, w: 800, col, align: 'left' }); txt(c, 'PID ' + p.pid, x + PW - 9, PY + 13, { size: 8, col: C.muted2, align: 'right' });
        txt(c, 'its own memory', x + 9, PY + 32, { size: 7.5, col: C.muted, align: 'left' });
        for (let j = 0; j < 10; j++) { const fly = seg(fold, j * .04, .4 + j * .04); if (fly >= 1) continue; c.save(); c.translate(0, -fly * 60); c.globalAlpha *= 1 - fly;
          rrect(c, x + 9 + j * 17, PY + 40, 13, 10, 2); c.fillStyle = rgba(col, .25); c.fill(); c.restore(); }
        txt(c, 'thread', x + 9, PY + 70, { size: 7.5, col: C.muted, align: 'left' });
        c.strokeStyle = running ? rgba(C.accent, .8) : C.border2; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 9, PY + 84); c.lineTo(x + PW - 9, PY + 84); c.stroke();
        const dx = running && !rm ? ((T / 18) % (PW - 30)) : (PW - 30) * .3; c.beginPath(); c.arc(x + 15 + dx, PY + 84, 3.5, 0, 7); c.fillStyle = running ? C.accent : C.muted; c.fill();
        txt(c, running ? 'running' : 'waiting', x + PW - 9, PY + 96, { size: 7, col: running ? C.accent : C.muted, align: 'right' });
        c.restore();
      });
      // reply slip
      const rp = V.replyNew || V.reply;
      if (rp) { const pp = procAt(V.procs, rp.id);
        const pr = find(V.procs, rp.id), fa = pr ? 1 - seg(pr.fold || 0, 0, .5) : 1;
        if (pp && fa > 0) { c.save(); c.globalAlpha *= fa; const end = slip(pp), rk = V.replyK, k = rk == null ? 1 : EZ.io(seg(rk, .45, .9)), x = lerp(150, end.x, k), y = lerp(38, end.y, k), col = rp.ok ? C.accent : C.orange;
          if (rk == null || rk >= .45) { const fl = V.check && V.check.id === rp.id ? bump(V.check.k) : 0; c.save(); c.translate(x, y); c.rotate((1 - k) * .3 - .05);
            const w = tw(c, rp.t, 11, 800) + 18; rrect(c, -w / 2, -9, w, 18, 3); c.fillStyle = rgba(col, .18 + .3 * fl); c.fill(); c.strokeStyle = col; c.lineWidth = 1.5 + fl; c.stroke();
            txt(c, rp.t, 0, .5, { size: 11, w: 800, col }); c.restore(); }
          if (V.check && V.check.id === rp.id) bubble(c, C, V.check.t, end.x, end.y - 11, C.yellow, Math.min(seg(V.check.k, 0, .2), 1 - seg(V.check.k, .9, 1))); c.restore(); } }
      // ask card
      if (V.ask) { const pp = procAt(V.procs, V.ask.id), ak = V.askK == null ? 1 : EZ.io(seg(V.askK, 0, .7));
        if (pp) { const x = lerp(pp.x + PW / 2, 108, ak), y = lerp(PY + 20, 39, ak), w = tw(c, V.ask.t, 8, 700) + 14;
          c.save(); rrect(c, x - w / 2, y - 7.5, w, 15, 3); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.yellow; c.lineWidth = 1.25; c.stroke(); txt(c, V.ask.t, x, y + .5, { size: 8, w: 700, col: C.yellow }); c.restore(); } }
      // console
      win(c, C, 8, 180, 236, 62, 'console');
      if (V.say) { const s = V.sayN == null ? V.say : V.say.slice(0, V.sayN); txt(c, s, 16, 204, { size: 8, w: 600, col: C.text, align: 'left' }); }
      // folder on the drive
      win(c, C, 252, 180, 140, 62, 'C:\\dev\\p00');
      if (V.folder) V.folder.forEach((f, i) => txt(c, f, 262, 202 + i * 12, { size: 8, col: C.text, align: 'left', al: V.folderK == null ? 1 : seg(V.folderK, 0, .5) }));
      if (V.replyNew && V.replyK > .05 && V.replyK < .5) { const k = seg(V.replyK, .05, .45), x = lerp(300, 360, bump(k)), y = 216;
        c.save(); c.strokeStyle = C.yellow; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 6, 0, 7); c.stroke(); c.beginPath(); c.moveTo(x + 4.5, y + 4.5); c.lineTo(x + 9, y + 9); c.stroke(); c.restore();
        txt(c, 'save.txt?', 386, 202, { size: 7.5, w: 700, col: C.yellow, align: 'right' }); }
    }
  });
})();

/* ================= p0-keys ================= */
(function () {
  const KEYS = { '1': [22, 58], '2': [50, 58], '3': [78, 58] }, ENTER = [20, 74, 84, 18];
  const CON = { x: 120, y: 34, w: 272, h: 70 }, LH = 12, CX0 = 128, CY0 = 56;
  const SLOT = i => [26 + i * 38, 160], PROG = { x: 182, y: 116, w: 120, h: 126 }, CARD = { x: 194, y: 176, w: 96, h: 50 }, OUT = { x: 314, y: 128, w: 78, h: 64 };
  const show = ch => ch === '\n' ? '\\n' : "'" + ch + "'";
  const code = ch => ch.charCodeAt(0);
  function conAdd(lines, s) { lines = lines.slice(); for (const ch of s) { if (ch === '\n') lines.push(''); else lines[lines.length - 1] += ch; } return lines; }
  reg('p0-keys', {
    acts: ['decl', 'print', 'wait', 'press', 'enter', 'take', 'left'],
    init: () => ({ decl: false, con: [''], held: '', q: [], key: null, waiting: false }),
    apply(S, a) {
      switch (a.a) {
        case 'decl': S.decl = true; break;
        case 'print': S.con = conAdd(S.con, a.t); break;
        case 'wait': S.waiting = true; break;
        case 'press': S.con = conAdd(S.con, a.k); S.held += a.k; break;
        case 'enter': S.con = conAdd(S.con, '\n'); S.q = S.q.concat((S.held + '\n').split('')); S.held = ''; break;
        case 'take': S.key = a.v != null ? String(a.v) : S.q[0]; S.q = S.q.slice(1); S.waiting = false; break;
      }
    },
    tween(V, a, lp, S) {
      if (lp <= 0) return;
      switch (a.a) {
        case 'decl': V.decl = true; V.declK = EZ.back(seg(lp, 0, .6)); break;
        case 'print': { const n = Math.floor(seg(lp, .55, .95) * a.t.length + 1e-6); V.con = conAdd(V.con, a.t.slice(0, n)); V.printK = lp; V.printT = a.t.replace(/\n/g, ''); break; }
        case 'wait': V.waiting = true; V.waitK = seg(lp, 0, .4); break;
        case 'press': { V.keyDown = a.k; V.keyK = bump(seg(lp, 0, .3)); const p = KEYS[a.k] || [50, 58], last = V.con[V.con.length - 1], ex = CX0 + tw(null, last, 8, 600), ey = CY0 + (V.con.length - 1) * LH, k = EZ.io(seg(lp, .15, .7));
          if (lp < .7) V.fly = { t: a.k, x: lerp(p[0], ex + 4, k), y: lerp(p[1], ey, k) - 14 * Math.sin(Math.PI * k) }; else V.con = conAdd(V.con, a.k); break; }
        case 'enter': {
          V.keyDown = 'Enter'; V.keyK = bump(seg(lp, 0, .3)); const chars = (V.held + '\n').split(''), base = V.q.length;
          if (lp >= .25) V.con = conAdd(V.con, '\n');
          V.drop = chars.map((ch, i) => ({ ch, i: base + i, k: seg(lp, .3 + i * .15, .7 + i * .15) })); break;
        }
        case 'take': { const ch = V.q[0], k = EZ.io(seg(lp, 0, .6)); if (lp < .6) V.fly = { t: show(ch), x: lerp(SLOT(0)[0], CARD.x + CARD.w / 2, k), y: lerp(SLOT(0)[1], CARD.y + 28, k) - 24 * Math.sin(Math.PI * k) };
          V.takeHide = lp < .6; if (lp >= .6) { V.key = a.v != null ? String(a.v) : ch; V.keyPop = seg(lp, .6, 1); V.q = V.q.slice(1); V.waiting = false; V.shift = 1 - EZ.io(seg(lp, .6, 1)); } break; }
        case 'left': V.leftK = lp; break;
      }
    },
    prep(V) { V.declK = null; V.printK = null; V.waitK = null; V.keyDown = null; V.keyK = 0; V.fly = null; V.drop = null; V.takeHide = false; V.keyPop = 0; V.shift = 0; V.leftK = null; },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      // keyboard
      win(c, C, 8, 34, 104, 70, 'keyboard');
      Object.keys(KEYS).forEach(k => { const p = KEYS[k], d = V.keyDown === k ? V.keyK : 0;
        rrect(c, p[0] - 11, p[1] - 9 + 2 * d, 22, 18, 3); c.fillStyle = d > .05 ? rgba(C.accent, .3) : C.surface; c.fill(); c.strokeStyle = d > .05 ? C.accent : C.border2; c.lineWidth = 1.25; c.stroke();
        txt(c, k, p[0], p[1] + .5 + 2 * d, { size: 10, w: 800, col: C.text }); });
      { const d = V.keyDown === 'Enter' ? V.keyK : 0; rrect(c, ENTER[0], ENTER[1] + 2 * d, ENTER[2], ENTER[3], 3); c.fillStyle = d > .05 ? rgba(C.accent, .3) : C.surface; c.fill(); c.strokeStyle = d > .05 ? C.accent : C.border2; c.lineWidth = 1.25; c.stroke();
        txt(c, 'Enter', ENTER[0] + ENTER[2] / 2, ENTER[1] + ENTER[3] / 2 + .5 + 2 * d, { size: 9, w: 800, col: C.text }); }
      // console
      win(c, C, CON.x, CON.y, CON.w, CON.h, 'console (echoes what you type)');
      const lines = V.con.slice(-4);
      lines.forEach((l, i) => txt(c, l, CX0, CY0 + i * LH, { size: 8, w: 600, col: C.text, align: 'left' }));
      if (!rm ? Math.floor(T / 500) % 2 === 0 : true) { const last = lines[lines.length - 1]; c.fillStyle = rgba(C.accent, .7); c.fillRect(CX0 + tw(c, last, 8, 600) + 1, CY0 + (lines.length - 1) * LH - 5, 5, 10); }
      // flow arrows
      arrow(c, C.muted, 113, 64, 119, 64);
      arrow(c, C.muted, 150, CON.y + CON.h + 2, 112, 126, [3, 3]); txt(c, 'Enter sends the line', 12, 115, { size: 7, col: C.muted, align: 'left' });
      arrow(c, C.muted, 166, 160, 180, 160);
      arrow(c, C.muted, PROG.x + PROG.w + 1, 160, OUT.x - 2, 160);
      arrow(c, C.muted, OUT.x + OUT.w / 2, OUT.y - 2, OUT.x + OUT.w / 2, CON.y + CON.h + 3);
      // stdin queue
      txt(c, 'stdin', 10, 136, { size: 9, w: 800, col: C.blue, align: 'left' }); txt(c, 'waiting input', 44, 136, { size: 7.5, col: C.muted, align: 'left' });
      rrect(c, 8, 142, 158, 50, 4); c.fillStyle = rgba(C.blue, .06); c.fill(); c.strokeStyle = rgba(C.blue, .5); c.lineWidth = 1.25; c.stroke();
      for (let i = 0; i < 4; i++) { const p = SLOT(i); c.save(); c.setLineDash([2, 3]); c.strokeStyle = rgba(C.blue, .35); c.lineWidth = 1; c.strokeRect(p[0] - 14.5, p[1] - 13.5, 29, 27); c.restore(); }
      const drawSlot = (ch, x, y, al, fl) => { c.save(); c.globalAlpha *= clamp(al);
        rrect(c, x - 14, y - 13, 28, 26, 3); c.fillStyle = rgba(C.blue, .2 + .35 * (fl || 0)); c.fill(); c.strokeStyle = fl > .02 ? C.yellow : C.blue; c.lineWidth = 1.5 + (fl || 0); c.stroke();
        txt(c, show(ch), x, y - 3, { size: 9.5, w: 800, col: C.text }); txt(c, String(code(ch)), x, y + 8, { size: 7.5, w: 600, col: C.muted2 }); c.restore(); };
      V.q.forEach((ch, i) => { if (i === 0 && V.takeHide) return; const p = SLOT(i), sx = V.shift ? V.shift * 38 : 0, fl = V.leftK != null ? bump(seg(V.leftK, 0, .5)) + bump(seg(V.leftK, .5, 1)) : 0; drawSlot(ch, p[0] + sx, p[1], 1, fl); });
      if (V.leftK != null && V.q.length) { const al = Math.min(seg(V.leftK, 0, .15), 1 - seg(V.leftK, .9, 1)); c.save(); c.globalAlpha *= al; rrect(c, 48, 151, 112, 18, 4); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = C.yellow; c.lineWidth = 1.25; c.stroke(); c.restore();
        arrowHead(c, C.yellow, 44, 160, Math.PI, al > .5 ? 1 : al); txt(c, 'still waiting', 104, 160.5, { size: 8.5, w: 700, col: C.yellow, al }); }
      (V.drop || []).forEach(d => { if (d.k <= 0) return; const p = SLOT(d.i), sx = CX0 + 6 + d.i * 8, k = EZ.io(d.k); drawSlot(d.ch, lerp(sx, p[0], k), lerp(CY0, p[1], k), seg(d.k, 0, .2), 0); });
      // program
      win(c, C, PROG.x, PROG.y, PROG.w, PROG.h, 'game.exe', V.waiting ? C.yellow : null);
      if (V.waiting) { const k = V.waitK == null ? 1 : V.waitK, hx = PROG.x + 16, hy = PROG.y + 34, r = rm ? 0 : (T / 600) % (Math.PI * 2);
        c.save(); c.globalAlpha *= k; c.translate(hx, hy); c.rotate(Math.floor(r / Math.PI) * Math.PI); c.strokeStyle = C.yellow; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(-5, -7); c.lineTo(5, -7); c.lineTo(-5, 7); c.lineTo(5, 7); c.closePath(); c.stroke(); c.restore();
        txt(c, 'getchar() waits', hx + 10, hy, { size: 8, w: 700, col: C.yellow, align: 'left', al: k }); }
      else txt(c, V.key != null ? 'got one character' : 'running', PROG.x + 10, PROG.y + 34, { size: 8, col: C.muted2, align: 'left' });
      if (V.decl) { const k = V.declK == null ? 1 : V.declK; c.save(); c.translate(CARD.x + CARD.w / 2, CARD.y + CARD.h / 2); c.scale(Math.max(k, 0), Math.max(k, 0)); c.translate(-CARD.x - CARD.w / 2, -CARD.y - CARD.h / 2);
        box(c, CARD.x, CARD.y, CARD.w, CARD.h, C.accent, .12); txt(c, 'int', CARD.x + 7, CARD.y + 10, { size: 8, col: C.muted2, align: 'left' }); txt(c, 'key', CARD.x + 26, CARD.y + 10, { size: 9.5, w: 800, col: C.accent, align: 'left' });
        const pk = pop(V.keyPop); c.translate(CARD.x + CARD.w / 2, CARD.y + 28); c.scale(pk, pk);
        if (V.key == null) txt(c, '?', 0, 0, { size: 15, w: 800, col: C.muted }); else { txt(c, show(V.key), 0, 0, { size: 14, w: 800, col: C.text }); txt(c, '= ' + code(V.key), 0, 14, { size: 8.5, w: 600, col: C.muted2 }); }
        c.restore(); }
      // stdout
      txt(c, 'stdout', OUT.x + 2, 122, { size: 9, w: 800, col: C.purple, align: 'left' });
      rrect(c, OUT.x, OUT.y, OUT.w, OUT.h, 4); c.fillStyle = rgba(C.purple, .06); c.fill(); c.strokeStyle = rgba(C.purple, .5); c.lineWidth = 1.25; c.stroke();
      if (V.printK != null && V.printK < .6) { const k = seg(V.printK, 0, .5), x = lerp(PROG.x + PROG.w / 2, OUT.x + OUT.w / 2, EZ.io(seg(k, 0, .5))), y = lerp(160, OUT.y + OUT.h / 2, EZ.io(seg(k, 0, .5))) - 30 * EZ.io(seg(k, .5, 1)), s = V.printT.length > 10 ? V.printT.slice(0, 9) + '...' : V.printT;
        token(c, C, s, x, y, 1 - seg(V.printK, .5, .6)); }
      if (V.fly) token(c, C, V.fly.t, V.fly.x, V.fly.y);
    }
  });
})();

/* ================= p0-map ================= */
(function () {
  const RY = [56, 134, 210], CH = { x: 8, w: 122, h: 38 }, SWX = j => 188 + j * 16, CARRY = 170, ODO = { x: 322, w: 70 };
  const WH = { x: 164, y: 112, w: 92, h: 44 }, FR = { x: 300, y: 112, w: 92, h: 44 };
  const bitOf = (v, i) => Math.floor(v / Math.pow(2, i)) % 2;
  reg('p0-map', {
    acts: ['byte', 'wrap', 'box', 'ptr', 'via', 'map', 'size'],
    init: () => ({ byte: null, bname: '', box: null, bxname: '', ptr: null, rows: [null, null, null], size: null }),
    apply(S, a) {
      switch (a.a) {
        case 'byte': S.byte = a.v; S.bname = a.name; break;
        case 'wrap': S.byte = a.to; break;
        case 'box': S.box = String(a.v); S.bxname = a.name; break;
        case 'ptr': S.ptr = { name: a.name, to: a.to }; break;
        case 'via': S.box = String(a.v); break;
        case 'map': S.rows[a.row] = { c: a.c, hw: a.hw }; break;
        case 'size': S.size = a.t; break;
      }
    },
    tween(V, a, lp, S) {
      if (lp <= 0) return;
      switch (a.a) {
        case 'byte': V.byte = a.v; V.bname = a.name; V.byteK = lp; break;
        case 'wrap': { const raw = Math.round(lerp(a.from, a.from + a.add, EZ.io(seg(lp, 0, .5)))); V.wrapK = lp; V.raw = raw; V.byte = lp < .55 ? raw : a.to; V.wrapNote = 'needs 9 bits: ' + (a.from + a.add); break; }
        case 'box': V.box = String(a.v); V.bxname = a.name; V.boxK = lp; break;
        case 'ptr': V.ptr = { name: a.name, to: a.to }; V.ptrK = lp; break;
        case 'via': { V.viaK = lp; V.viaV = String(a.v); if (lp >= .7) { V.box = String(a.v); V.boxPop = seg(lp, .7, 1); } break; }
        case 'map': V.rows = V.rows.slice(); V.rows[a.row] = { c: a.c, hw: a.hw }; V.mapK = V.mapK || {}; V.mapK[a.row] = lp; break;
        case 'size': V.size = a.t; V.sizeK = lp; break;
      }
    },
    prep(V) { V.byteK = null; V.wrapK = null; V.raw = null; V.boxK = null; V.ptrK = null; V.viaK = null; V.viaV = ''; V.boxPop = 0; V.mapK = null; V.sizeK = null; },
    draw(c, V, T, C, rm) {
      U.bg(c, C, W, H);
      txt(c, 'in C', CH.x + CH.w / 2, 13, { size: 8.5, w: 700, col: C.muted2 }); txt(c, 'in the machine', 278, 13, { size: 8.5, w: 700, col: C.muted2 });
      c.strokeStyle = C.border2; c.lineWidth = 1; c.setLineDash([2, 4]); c.beginPath(); c.moveTo(146, 24); c.lineTo(146, 244); c.stroke(); c.setLineDash([]);
      // chips
      V.rows.forEach((r, i) => {
        const y = RY[i], mk = V.mapK && V.mapK[i] != null ? V.mapK[i] : (r ? 1 : 0);
        if (!r) { rrect(c, CH.x, y - CH.h / 2, CH.w, CH.h, 4); c.setLineDash([3, 4]); c.strokeStyle = rgba(C.muted, .4); c.lineWidth = 1; c.stroke(); c.setLineDash([]); return; }
        c.save(); c.globalAlpha *= seg(mk, 0, .4);
        box(c, CH.x, y - CH.h / 2, CH.w, CH.h, C.purple, .14); txt(c, r.c, CH.x + 8, y - 7, { size: 9.5, w: 800, col: C.text, align: 'left' }); txt(c, r.hw, CH.x + 8, y + 9, { size: 7.5, w: 600, col: C.purple, align: 'left' });
        c.restore();
        const lk = EZ.out(seg(mk, .3, 1)); if (lk > 0) { c.save(); c.strokeStyle = C.purple; c.lineWidth = 1.5; c.beginPath(); c.moveTo(CH.x + CH.w + 2, y); c.lineTo(lerp(CH.x + CH.w + 2, 154, lk), y); c.stroke(); if (lk >= 1) arrowHead(c, C.purple, 156, y, 0, .8); c.restore(); }
      });
      // row 0: the byte
      if (V.byte != null) {
        const y = RY[0], bk = V.byteK == null ? 1 : V.byteK, wk = V.wrapK;
        c.save(); c.globalAlpha *= seg(bk, 0, .4);
        txt(c, 'unsigned char ' + V.bname, SWX(0) - 6, y - 24, { size: 8, col: C.muted2, align: 'left' });
        const showV = wk != null && wk < .55 ? V.raw : V.byte;
        for (let j = 0; j < 8; j++) { const b = bitOf(showV, 7 - j), fk = bk < 1 ? seg(bk, .2 + j * .06, .35 + j * .06) : 1; toggle(c, C, SWX(j), y, b * fk, false); }
        if (wk != null && wk > 0) { // the ninth bit
          const carry = wk < .55 ? (V.raw >= 256 ? 1 : 0) : 1, t = seg(wk, .55, 1);
          if (V.raw >= 256 || wk >= .55) { c.save(); c.translate(CARRY + 30 * t, y + 120 * t * t); c.rotate(t * 2.4); c.globalAlpha *= 1 - seg(t, .7, 1);
            rrect(c, -6, -9, 12, 18, 3); c.fillStyle = rgba(C.orange, .3); c.fill(); c.strokeStyle = C.orange; c.lineWidth = 1.5; c.stroke(); txt(c, String(carry), 0, .5, { size: 9, w: 800, col: C.orange }); c.restore();
            txt(c, 'bit 9', CARRY, y - 16, { size: 7, w: 700, col: C.orange, al: 1 - t }); }
        }
        rrect(c, ODO.x, y - 15, ODO.w, 30, 4); c.fillStyle = C.surface2; c.fill(); c.strokeStyle = wk != null && wk > .55 ? C.orange : C.border2; c.lineWidth = 1.5; c.stroke();
        txt(c, String(showV), ODO.x + ODO.w / 2, y + .5, { size: 16, w: 800, col: showV > 255 ? C.orange : C.text });
        if (wk != null && wk < 1 && wk > .05) txt(c, wk < .55 ? V.wrapNote : 'kept: 260 - 256 = 4', 392, y + 26, { size: 7.5, w: 700, col: C.orange, align: 'right' });
        else txt(c, '0 to 255', ODO.x + ODO.w / 2, y + 24, { size: 7.5, col: C.muted });
        c.restore();
      }
      // row 1: box + pointer
      if (V.box != null) {
        const bk = V.boxK == null ? 1 : V.boxK, fl = V.viaK != null ? bump(seg(V.viaK, .55, 1)) : 0;
        c.save(); c.globalAlpha *= seg(bk, 0, .4);
        rrect(c, FR.x, FR.y, FR.w, FR.h, 4); c.fillStyle = rgba(C.accent, .12 + .3 * fl); c.fill(); c.strokeStyle = fl > .02 ? C.yellow : C.accent; c.lineWidth = 1.5; c.stroke();
        txt(c, 'int', FR.x + 7, FR.y + 10, { size: 8, col: C.muted2, align: 'left' }); txt(c, V.bxname, FR.x + 26, FR.y + 10, { size: 9, w: 800, col: C.accent, align: 'left' });
        const pk = pop(V.boxPop); c.save(); c.translate(FR.x + FR.w / 2, FR.y + 29); c.scale(pk, pk); txt(c, V.box, 0, 0, { size: 15, w: 800, col: C.text }); c.restore();
        txt(c, 'an int in memory', FR.x + FR.w / 2, FR.y + FR.h + 9, { size: 7, col: C.muted });
        c.restore();
      }
      if (V.ptr) {
        const pk = V.ptrK == null ? 1 : V.ptrK;
        c.save(); c.globalAlpha *= seg(pk, 0, .4);
        rrect(c, WH.x, WH.y, WH.w, WH.h, 4); c.fillStyle = rgba(C.purple, .12); c.fill(); c.strokeStyle = C.purple; c.lineWidth = 1.5; c.stroke();
        txt(c, 'int *', WH.x + 7, WH.y + 10, { size: 8, col: C.muted2, align: 'left' }); txt(c, V.ptr.name, WH.x + 34, WH.y + 10, { size: 9, w: 800, col: C.purple, align: 'left' });
        txt(c, '&' + V.ptr.to, WH.x + WH.w / 2, WH.y + 29, { size: 11, w: 800, col: C.text });
        txt(c, 'holds an address', WH.x + WH.w / 2, WH.y + WH.h + 9, { size: 7, col: C.muted });
        c.restore();
        const ak = EZ.out(seg(pk, .4, 1)), x0 = WH.x + WH.w + 3, x1 = FR.x - 3, yy = WH.y + WH.h / 2;
        if (ak > 0) { c.save(); c.strokeStyle = C.purple; c.lineWidth = 2; c.beginPath(); c.arc(x0, yy, 3, 0, 7); c.fillStyle = C.purple; c.fill(); c.beginPath(); c.moveTo(x0, yy); c.lineTo(lerp(x0, x1, ak), yy); c.stroke(); if (ak > .5) arrowHead(c, C.purple, lerp(x0, x1, ak), yy, 0); c.restore(); }
        if (V.viaK != null && V.viaK < .8) { const k = EZ.io(seg(V.viaK, 0, .6)); token(c, C, '*' + V.ptr.name + ' = ' + V.viaV, lerp(WH.x + WH.w / 2, FR.x + FR.w / 2, k), WH.y - 12 - 8 * Math.sin(Math.PI * k), 1 - seg(V.viaK, .7, .8)); }
      }
      // row 2: 8-byte address strip
      if (V.size) {
        const y = RY[2], sk = V.sizeK;
        txt(c, 'where, as bytes', 164, y - 20, { size: 8, col: C.muted2, align: 'left', al: sk == null ? 1 : seg(sk, 0, .3) });
        for (let i = 0; i < 8; i++) { const k = sk == null ? 1 : EZ.back(seg(sk, .1 + i * .07, .3 + i * .07)); if (k <= 0) continue;
          c.save(); c.translate(172 + i * 22, y); c.scale(k, k); rrect(c, -9, -10, 18, 20, 3); c.fillStyle = rgba(C.purple, .18); c.fill(); c.strokeStyle = C.purple; c.lineWidth = 1.25; c.stroke(); c.restore(); }
        txt(c, V.size, 346, y + .5, { size: 10, w: 800, col: C.purple, align: 'left', al: sk == null ? 1 : seg(sk, .7, 1) });
      }
    }
  });
})();

})();
