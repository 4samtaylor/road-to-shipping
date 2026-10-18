/* =====================================================================
   RTSPlay core scenes: "loops" and "boxes"
   =====================================================================
   Registered with RTSPlay.scene(). Specs reference them as  "scene": "loops" | "boxes".
   Every action is { a:'<name>', ...params, at?, len? }  (at/len = start/length as a fraction
   of the step, defaults 0 and 1-at). Colours are tokens (accent/orange/purple/yellow...), so
   all themes work. Canvas is 400x250 logical px.

   ---------------------------------------------------------------------
   SCENE "loops"  (an oval race track = the loop, hearts + HUD value top
   left/right, an arena row of enemy slots at the bottom, a runner)
     lives  { to:N }                    hearts go to N (0..3); HUD shows "lives = N"; pops/gains/loses hearts
     hud    { name:'i', val:3 }         HUD readout becomes "name = val" (any variable, e.g. a for counter)
     check  { t:'lives > 0', v:'3 > 0', r:true|false|'text' }
                                        condition bubble in the infield: expression t, with values v, and the
                                        verdict badge r (true = green, false = orange, string = purple)
     run    { from:0, to:.5, ease:'start'|'end'|'lin'|... }
                                        runner moves round the track from lap position `from` to `to`
                                        (0 = start line, 1 = a full lap; 0.5 = halfway)
     walk   { to:[x,y] }                runner walks off-track to canvas point (e.g. [46,214] = arena left)
     over   { on:true|false }           shows/hides the GAME OVER stamp in the infield
     slots  {}                          shows the three dashed empty enemy slots in the arena
     spawn  { n:2 }                     enemy number n (1..3) drops into the arena and is labelled "Wave n"
     say    { t:'Lives: 3' }            a short speech label rises from the runner
     hop    {}                          the runner jumps once (use for "program ends")
   Good for: while / for / do-while, counters, any "repeat until a condition fails" idea.

   ---------------------------------------------------------------------
   SCENE "boxes"  (five shelf boxes; the lid shape is the type; values drop in through the lid)
   Slots: 0 int score (square lid), 1 float speed (round), 2 char key (triangle),
          3 bool alive (diamond, starts locked behind a padlock), 4 int lives (hidden until `appear`).
   Every action takes slot:N.
     unlock { slot }                    padlock lifts off the slot (stdbool.h unlocking bool)
     drop   { slot, shape:'sq'|'ci'|'tr'|'di', text:'2.5', val:'2.5', sub?:'113' }
                                        a token of that shape and label falls into the slot; the slot then
                                        shows `val` (and a small "= sub" line, e.g. a char's number)
     chop   { slot, val:'2' }           the float 2.9 hits the int lid and is chopped to 2 (fraction falls away)
     appear { slot }                    the (hidden) box grows into view
     cap    { t:'chopped, not rounded' }  orange caption top right
     pick   { slots:[0,4] }             printf badges "%d #1", "%d #2" over those slots, in order
   Good for: variable declarations and types, assignment, truncation, printf argument order.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.RTSPlay) return;
  var U = RTSPlay.util;
  var clamp = U.clamp, lerp = U.lerp, seg = U.seg, EZ = U.EZ, rgba = U.rgba, txt = U.txt, bg = U.bg, pix = U.pix, rrect = U.rrect, FONT = U.FONT;
  var SCENES = RTSPlay.SCENES;
  function reg(name) { RTSPlay.scene(name, SCENES[name]); }
/* ===== scene: loops (track + lives + waves) ===== */
(function () {
  const W = 400, H = 250, TR = { cx: 200, cy: 106, L: 150, R: 42 };
  const per = 2 * TR.L + 2 * Math.PI * TR.R;
  function trackPos(u) {
    u = ((u % 1) + 1) % 1; let s = u * per; const { cx, cy, L, R } = TR, h = L / 2, arc = Math.PI * R;
    if (s < h) return [cx + s, cy + R]; s -= h;
    if (s < arc) { const th = Math.PI / 2 - s / R; return [cx + h + R * Math.cos(th), cy + R * Math.sin(th)]; } s -= arc;
    if (s < L) return [cx + h - s, cy - R]; s -= L;
    if (s < arc) { const th = -Math.PI / 2 - s / R; return [cx - h + R * Math.cos(th), cy + R * Math.sin(th)]; } s -= arc;
    return [cx - h + s, cy + R];
  }
  const faceAt = (u, keep) => { const a = trackPos(u), b = trackPos(u + .004); return b[0] > a[0] + .01 ? 1 : b[0] < a[0] - .01 ? -1 : keep; };
  const HEART = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  const ENEMY = ['01000010', '00111100', '01211210', '11111111', '10111101', '00100100'];
  const ARENA = { y: 214, x0: 118, dx: 90 };
  const hudT = (V, S, next, lp) => { V.hud = lp >= .3 ? next : S.hud; V.hudPop = lp >= .3 ? seg(lp, .3, .8) : -1; };

  SCENES.loops = {
    W, H,
    init() { const [x, y] = trackPos(0); return { lives: 0, hud: { name: 'lives', val: '?' }, msg: null, over: false, slots: false, waves: 0, run: { x, y, face: 1, u: 0, moving: 0, ph: 0 } }; },
    apply(S, a) {
      switch (a.a) {
        case 'lives': S.lives = a.to; S.hud = { name: 'lives', val: a.to }; break;
        case 'hud': S.hud = { name: a.name, val: a.val }; break;
        case 'check': S.msg = { t: a.t, v: a.v, r: a.r, rp: 1 }; break;
        case 'run': { const [x, y] = trackPos(a.to); S.run = { x, y, u: a.to, face: faceAt(a.to - .01, S.run.face), moving: 0, ph: a.to * per / 7 }; S.msg = null; break; }
        case 'walk': S.run = { x: a.to[0], y: a.to[1], face: Math.sign(a.to[0] - S.run.x) || S.run.face, moving: 0, ph: 0 }; S.msg = null; break;
        case 'over': S.over = a.on; if (a.on) S.msg = null; break;
        case 'slots': S.slots = true; break;
        case 'spawn': S.waves = a.n; break;
      }
    },
    tween(V, a, lp, S) {
      switch (a.a) {
        case 'lives': hudT(V, S, { name: 'lives', val: a.to }, lp); V.hearts = { from: S.lives, to: a.to, lp }; break;
        case 'hud': hudT(V, S, { name: a.name, val: a.val }, lp); break;
        case 'check': V.msg = { t: a.t, v: a.v, r: a.r, rp: EZ.back(seg(lp, .4, .6)) }; V.msgA = 1; break;
        case 'run': {
          const u = lerp(a.from, a.to, EZ[a.ease || 'lin'](lp)), [x, y] = trackPos(u), mv = lp > 0 && lp < 1;
          const trail = []; if (mv) for (let k = 1; k <= 5; k++) { const [tx, ty] = trackPos(Math.max(a.from, u - k * .011)); trail.push([tx, ty]); }
          V.run = { x, y, u, face: faceAt(u, S.run.face), moving: mv ? 1 : 0, ph: u * per / 7, trail };
          V.msgA = 1 - seg(lp, 0, .25); break;
        }
        case 'walk': {
          const e = EZ.io(lp), x = lerp(S.run.x, a.to[0], e), y = lerp(S.run.y, a.to[1], e), mv = lp > 0 && lp < 1, sx = Math.sign(a.to[0] - S.run.x) || S.run.face;
          const trail = []; if (mv) for (let k = 1; k <= 5; k++) { const e2 = EZ.io(Math.max(0, lp - k * .03)); trail.push([lerp(S.run.x, a.to[0], e2), lerp(S.run.y, a.to[1], e2)]); }
          V.run = { x, y, face: sx, moving: mv ? 1 : 0, ph: lp * 24, trail }; V.msgA = 1 - seg(lp, 0, .25); break;
        }
        case 'over': V.overK = a.on ? EZ.back(lp) : 1 - lp; V.over = lp > 0 || S.over; if (a.on) V.msgA = 1 - seg(lp, 0, .3); break;
        case 'slots': V.slotsA = lp; break;
        case 'spawn': V.spawnIdx = a.n - 1; V.spawnP = lp; V.waves = a.n - 1; break;
        case 'say': V.say = { t: a.t, lp }; break;
        case 'hop': V.run = Object.assign({}, V.run, { hop: Math.sin(Math.PI * lp) * 12 }); break;
      }
    },
    draw(c, V, T, C, rm) {
      bg(c, C, W, H);
      /* hearts */
      const hs = V.hearts;
      for (let i = 0; i < 3; i++) {
        const x = 12 + i * 28, y = 9, empty = 'rgba(124,124,160,.2)';
        let mode = i < V.lives ? 'full' : 'empty';
        if (hs) { const lo = Math.min(hs.from, hs.to), hi = Math.max(hs.from, hs.to);
          mode = i < lo ? 'full' : i >= hi ? 'empty' : hs.to > hs.from ? 'gain' : 'lose'; }
        if (mode === 'full') pix(c, HEART, x, y, 3, ['', C.orange]);
        else if (mode === 'empty') pix(c, HEART, x, y, 3, ['', empty]);
        else if (mode === 'gain') { const s = EZ.back(seg(hs.lp, i * .18, i * .18 + .5)); pix(c, HEART, x, y, 3, ['', empty]);
          c.save(); c.translate(x + 10.5, y + 9); c.scale(s, s); c.translate(-10.5, -9); pix(c, HEART, 0, 0, 3, ['', C.orange]); c.restore(); }
        else { // lose: pop, then split into halves that fall away
          const q = hs.lp, t = seg(q, .3, 1); pix(c, HEART, x, y, 3, ['', empty]);
          const sc = 1 + .35 * Math.sin(Math.PI * seg(q, 0, .3));
          HEART.forEach((row, j) => [...row].forEach((ch, k) => { if (ch === '0') return; const half = k <= 3 ? -1 : 1;
            c.save(); c.globalAlpha = 1 - seg(t, .55, 1); c.fillStyle = C.orange;
            const ox = half * t * 12, oy = t * t * 26;
            c.translate(x + 10.5 + ox, y + 9 + oy); c.rotate(half * t * .7); c.scale(sc, sc); c.fillRect(-10.5 + k * 3, -9 + j * 3, 3.2, 3.2); c.restore(); })); }
      }
      /* HUD */
      const h = V.hud;
      c.save(); c.font = `500 12px ${FONT}`; const lab = h.name + ' = ', val = String(h.val);
      const wl = c.measureText(lab).width; c.font = `700 14px ${FONT}`; const wv = c.measureText(val).width; c.restore();
      const x0 = W - 12 - wl - wv; txt(c, lab, x0, 20, { size: 12, col: C.muted2, align: 'left' });
      const pop = V.hudPop > 0 ? 1 + .35 * Math.sin(Math.PI * V.hudPop) : 1;
      c.save(); c.translate(x0 + wl + wv / 2, 20); c.scale(pop, pop);
      txt(c, val, 0, 0, { size: 14, w: 700, col: h.name === 'lives' ? C.orange : C.purple }); c.restore();
      /* track */
      const { cx, cy, L, R } = TR, hh = L / 2;
      const path = () => { c.beginPath(); c.moveTo(cx - hh, cy + R); c.lineTo(cx + hh, cy + R); c.arc(cx + hh, cy, R, Math.PI / 2, -Math.PI / 2, true);
        c.lineTo(cx - hh, cy - R); c.arc(cx - hh, cy, R, -Math.PI / 2, Math.PI / 2, true); c.closePath(); };
      path(); c.lineWidth = 27; c.strokeStyle = C.border2; c.stroke();
      path(); c.lineWidth = 24; c.strokeStyle = C.surface2; c.stroke();
      path(); c.lineWidth = 1.5; c.setLineDash([6, 8]); c.strokeStyle = rgba(C.yellow, .3); c.stroke(); c.setLineDash([]);
      for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? C.border2 : C.text; c.fillRect(cx - 2, cy + R - 12 + k * 4, 4, 4); }
      txt(c, 'START', cx, cy + R + 21, { size: 8, col: C.muted, w: 500 });
      /* infield: check bubble / game over / return */
      const ma = V.msgA == null ? 1 : V.msgA;
      if (V.msg && ma > 0) { const m = V.msg; c.save(); c.globalAlpha = ma;
        txt(c, m.t, cx, cy - 15, { size: 10, col: C.muted2 }); txt(c, m.v, cx, cy + 1, { size: 14, w: 700, col: C.text });
        if (m.rp > 0) { const word = m.r === true ? 'true' : m.r === false ? 'false' : String(m.r), col = m.r === true ? C.accent : m.r === false ? C.orange : C.purple;
          c.save(); c.translate(cx, cy + 19); c.scale(m.rp, m.rp); const w = word.length * 6.4 + 14;
          rrect(c, -w / 2, -8, w, 16, 3); c.fillStyle = rgba(col, .16); c.fill(); c.strokeStyle = rgba(col, .6); c.lineWidth = 1; c.stroke();
          txt(c, word, 0, 0.5, { size: 10, w: 700, col }); c.restore(); }
        c.restore(); }
      if (V.over && (V.overK == null || V.overK > 0)) { const k = V.overK == null ? 1 : V.overK;
        c.save(); c.translate(cx, cy); c.scale(Math.max(k, 0), Math.max(k, 0)); c.globalAlpha = clamp(k);
        txt(c, 'GAME OVER', 1.5, 1.5, { size: 16, w: 800, col: 'rgba(0,0,0,.6)' }); txt(c, 'GAME OVER', 0, 0, { size: 16, w: 800, col: C.orange }); c.restore(); }
      /* arena */
      const sa = V.slotsA == null ? (V.slots ? 1 : 0) : V.slotsA;
      c.save(); c.strokeStyle = C.border2; c.setLineDash([3, 5]); c.beginPath(); c.moveTo(10, 186); c.lineTo(W - 10, 186); c.stroke(); c.setLineDash([]); c.restore();
      txt(c, 'ARENA', W - 12, 196, { size: 8, col: C.muted, align: 'right' });
      for (let k = 0; k < 3; k++) {
        const ex = ARENA.x0 + k * ARENA.dx, ey = ARENA.y;
        if (sa > 0 && k >= V.waves && !(V.spawnIdx === k)) { c.save(); c.globalAlpha = .35 * sa; c.strokeStyle = C.muted; c.setLineDash([3, 3]); rrect(c, ex - 18, ey - 14, 36, 28, 3); c.stroke(); c.restore(); }
        let on = k < V.waves, sc = 1, off = 0, ring = 0;
        if (V.spawnIdx === k) { on = V.spawnP > 0; const q = V.spawnP; sc = EZ.back(seg(q, 0, .5)); off = -(1 - EZ.bounce(seg(q, 0, .7))) * 36; ring = seg(q, .15, 1); }
        if (on) { const sway = rm ? 0 : Math.sin(T / 300 + k) * 2;
          c.save(); c.translate(ex + sway, ey + off); c.scale(sc, sc); pix(c, ENEMY, -12, -9, 3, ['', C.orange, C.ink]); c.restore();
          if (ring > 0 && ring < 1) { c.save(); c.globalAlpha = 1 - ring; c.strokeStyle = C.accent; c.lineWidth = 2; c.beginPath(); c.arc(ex, ey, 8 + ring * 22, 0, 7); c.stroke(); c.restore(); }
          txt(c, 'Wave ' + (k + 1), ex, ey + 24, { size: 9, col: C.muted2, al: clamp(sc) }); }
      }
      /* runner */
      const r = V.run;
      (r.trail || []).forEach((p, k) => { c.fillStyle = `rgba(154,154,186,${.34 - k * .06})`; c.beginPath(); c.arc(p[0] - r.face * (1 + k * .6), p[1] - 1 - k * .5, 2 + k * .8, 0, 7); c.fill(); });
      const bob = !rm && !r.moving ? Math.sin(T / 260) * .8 : 0, hop = r.hop || 0;
      drawRunner(c, r.x, r.y - hop + bob, r.face, r.ph || 0, r.moving, T, C, rm, hop);
      if (V.say && V.say.lp > 0 && V.say.lp < 1) { const q = V.say.lp;
        txt(c, V.say.t, clamp(r.x, 36, W - 36), r.y - 30 - 16 * EZ.out(q), { size: 10, w: 700, col: C.accent, al: 1 - seg(q, .6, 1) }); }
    }
  };
  function drawRunner(c, x, y, f, ph, mv, T, C, rm, hop) {
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(x, y + 1.5 + (hop ? hop : 0), 7 - hop * .15, 2.4, 0, 0, 7); c.fill();
    const s = mv ? Math.sin(ph) : 0, lift = v => Math.max(0, v) * 2.4;
    c.fillStyle = C.accentDk; c.fillRect(x - 4, y - 5 - lift(s), 3, 5 + lift(s)); c.fillRect(x + 1, y - 5 - lift(-s), 3, 5 + lift(-s));   // legs
    const wav = rm ? 0 : Math.sin(T / 90 + ph) * (mv ? 1.5 : .6);
    c.fillStyle = C.yellow; c.fillRect(x - f * 6 - (f > 0 ? 7 : 0), y - 13 + wav, 7, 3); c.fillRect(x - f * 12 - (f > 0 ? 5 : 0), y - 12 - wav, 5, 3);   // scarf
    c.fillStyle = C.accent; c.fillRect(x - 6, y - 17, 12, 12); c.fillStyle = C.accentDk; c.fillRect(x - 6, y - 7, 12, 2);                              // body
    c.fillStyle = '#fff'; c.fillRect(x + (f > 0 ? 0 : -5), y - 14, 5, 4); c.fillStyle = C.ink; c.fillRect(x + (f > 0 ? 3 : -5), y - 13, 2, 3);   // eye
  }
  SCENES.loops.trackPos = trackPos;
  reg('loops');
})();

/* ===== scene: boxes (typed variable boxes with shaped lids) ===== */
(function () {
  const W = 400, H = 250, LID = 116, HOLE = 131, SH = 202;
  const slotX = i => 44 + i * 78;
  function shape(c, k, x, y, r, sx, sy) {
    c.save(); c.translate(x, y); c.scale(sx, sy); c.beginPath();
    if (k === 'sq') c.rect(-r, -r, 2 * r, 2 * r);
    else if (k === 'ci') c.arc(0, 0, r, 0, 7);
    else if (k === 'tr') { c.moveTo(0, -r * 1.1); c.lineTo(r * 1.15, r * .9); c.lineTo(-r * 1.15, r * .9); c.closePath(); }
    else { c.moveTo(0, -r * 1.2); c.lineTo(r * 1.2, 0); c.lineTo(0, r * 1.2); c.lineTo(-r * 1.2, 0); c.closePath(); }
    c.restore();
  }
  function token(c, t, C) {   // t = {kind,x,y,r,text,col,sx,sy,al,rot}
    c.save(); c.globalAlpha = t.al == null ? 1 : t.al; c.translate(t.x, t.y); c.rotate(t.rot || 0); c.scale(t.sx || 1, t.sy || 1);
    shape(c, t.kind, 0, 0, t.r, 1, 1); c.fillStyle = t.col; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke();
    txt(c, t.text, 0, t.kind === 'tr' ? 3 : 1, { size: t.text.length > 2 ? 9 : 11, w: 700, col: C.ink }); c.restore();
  }
  const SPEC = [
    { type: 'int', name: 'score', key: 'accent', shape: 'sq' }, { type: 'float', name: 'speed', key: 'purple', shape: 'ci' },
    { type: 'char', name: 'key', key: 'yellow', shape: 'tr' }, { type: 'bool', name: 'alive', key: 'orange', shape: 'di' },
    { type: 'int', name: 'lives', key: 'accent', shape: 'sq' }
  ];
  SCENES.boxes = {
    W, H,
    init() { return { slots: SPEC.map((s, i) => ({ val: null, sub: null, vis: i < 4, locked: i === 3, appear: 1, pop: 0, gulp: 0, lockT: 0 })), cap: null, picks: null }; },
    apply(S, a) {
      const sl = S.slots[a.slot];
      switch (a.a) {
        case 'unlock': sl.locked = false; break;
        case 'drop': sl.val = a.val; sl.sub = a.sub || null; break;
        case 'chop': sl.val = a.val; sl.sub = null; break;
        case 'appear': sl.vis = true; break;
        case 'cap': S.cap = a.t; break;
        case 'pick': S.picks = a.slots; break;
      }
    },
    tween(V, a, lp, S, C) {
      const sl = V.slots[a.slot], P = C;
      V.toks = V.toks || [];
      switch (a.a) {
        case 'unlock': sl.lockT = lp; break;
        case 'appear': sl.vis = true; sl.appear = EZ.back(lp); break;
        case 'drop': {
          const fall = seg(lp, 0, .6), sink = seg(lp, .6, .85), cx = slotX(a.slot);
          if (lp > 0 && lp < .85) V.toks.push({ kind: a.shape, x: cx, y: lerp(26, LID, EZ.in(fall)) + 15 * EZ.io(sink), r: 11, text: a.text, col: P[SPEC[a.slot].key], sx: lerp(1, .7, sink), sy: lerp(1, .3, sink), al: 1 - seg(lp, .78, .85) });
          if (lp >= .8) { sl.val = a.val; sl.sub = a.sub || null; sl.pop = seg(lp, .8, 1); }
          sl.gulp = Math.sin(Math.PI * seg(lp, .6, 1)); break;
        }
        case 'chop': {
          const cx = slotX(a.slot), fall = seg(lp, 0, .4);
          if (lp <= 0) break;
          if (lp < .5) { const hit = lp > .4, w = hit ? Math.sin((lp - .4) * 80) * 2.4 * (1 - seg(lp, .4, .5)) : 0;
            V.toks.push({ kind: 'ci', x: cx + w, y: hit ? LID - 2 : lerp(26, LID - 2, EZ.in(fall)), r: 14, text: '2.9', col: P.purple, sx: hit ? 1.08 : 1, sy: hit ? .94 : 1 }); }
          else if (lp < .9) { const m = seg(lp, .52, .68), sink = seg(lp, .7, .9), y = LID - 2 + 15 * EZ.io(sink), al = 1 - seg(lp, .84, .9), sx = lerp(1, .7, sink), sy = lerp(1, .3, sink);
            V.toks.push({ kind: 'ci', x: cx, y, r: 11, text: '2', col: P.purple, sx, sy, al: al * (1 - m) });
            V.toks.push({ kind: 'sq', x: cx, y, r: 10, text: '2', col: P.accent, sx, sy, al: al * m }); }
          if (lp >= .5) { const t2 = seg(lp, .5, 1);
            V.frac = { x: cx + 10 + 60 * t2, y: LID - 4 - 38 * t2 + 190 * t2 * t2, rot: t2 * 3.2, al: 1 - seg(t2, .75, 1) }; }
          if (lp >= .86) { sl.val = a.val; sl.sub = null; sl.pop = seg(lp, .86, 1); }
          sl.gulp = Math.sin(Math.PI * seg(lp, .7, 1)); break;
        }
        case 'cap': V.capA = lp; V.cap = a.t; break;
        case 'pick': V.pickK = lp; V.picks = a.slots; break;
      }
    },
    draw(c, V, T, C, rm) {
      bg(c, C, W, H);
      txt(c, 'a variable is a labelled box', 12, 14, { size: 9, col: C.muted, align: 'left' });
      txt(c, 'lid shape = type', 12, 26, { size: 9, col: C.muted, align: 'left' });
      c.fillStyle = C.border2; c.fillRect(8, SH, W - 16, 3);
      V.slots.forEach((sl, i) => {
        if (!sl.vis) return;
        const sp = SPEC[i], col = C[sp.key], cx = slotX(i), sc = sl.appear == null ? 1 : sl.appear, g = 1 - .07 * (sl.gulp || 0);
        c.save(); c.translate(cx, SH); c.scale(Math.max(sc, 0), Math.max(sc, 0) * g); c.translate(-cx, -SH);
        // front face
        c.fillStyle = rgba(col, .1); c.fillRect(cx - 34, 142, 68, SH - 142); c.strokeStyle = rgba(col, .55); c.lineWidth = 1.5; c.strokeRect(cx - 33.25, 142.75, 66.5, SH - 143.5);
        c.fillStyle = rgba(col, .12); c.fillRect(cx - 34, 150, 68, 1.5);
        // lid (top face) and shaped hole
        c.beginPath(); c.moveTo(cx - 28, 121); c.lineTo(cx + 28, 121); c.lineTo(cx + 34, 142); c.lineTo(cx - 34, 142); c.closePath();
        c.fillStyle = rgba(col, .3); c.fill(); c.strokeStyle = rgba(col, .8); c.stroke();
        shape(c, sp.shape, cx, HOLE, 10, 1, .42); c.fillStyle = '#04040a'; c.fill(); c.strokeStyle = col; c.lineWidth = 1.5; c.stroke();
        // stored value
        if (sl.val == null) txt(c, sl.locked ? 'needs' : '-', cx, 170, { size: sl.locked ? 8 : 16, col: C.muted });
        else { const pp = sl.pop > 0 && sl.pop < 1 ? 1 + .35 * Math.sin(Math.PI * sl.pop) : 1;
          c.save(); c.translate(cx, sl.sub ? 168 : 172); c.scale(pp, pp); txt(c, sl.val, 0, 0, { size: String(sl.val).length > 3 ? 14 : 18, w: 700, col: C.text }); c.restore();
          if (sl.sub) txt(c, '= ' + sl.sub, cx, 188, { size: 9, col: C.muted2 }); }
        if (sl.locked && sl.val == null) txt(c, 'stdbool.h', cx, 182, { size: 8, col: C.muted });
        // labels
        txt(c, sp.type, cx, 216, { size: 11, w: 700, col }); txt(c, sp.name, cx, 230, { size: 10, col: C.muted2 });
        c.restore();
        // padlock
        if (sl.locked || (sl.lockT > 0 && sl.lockT < 1)) {
          const t = sl.lockT, shake = t > 0 && t < .5 ? Math.sin(t * 90) * 2 : 0, lift = seg(t, .5, 1), al = 1 - lift;
          c.save(); c.globalAlpha = al; c.translate(cx + shake, 128 - lift * 40);
          c.strokeStyle = C.muted2; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -3, 5, Math.PI, 0); c.stroke();
          c.fillStyle = C.yellow; c.fillRect(-8, -3, 16, 12); c.fillStyle = C.ink; c.fillRect(-1.5, 1, 3, 4); c.restore();
        }
        // printf badges
        const pk = V.picks ? V.picks.indexOf(i) : -1;
        if (pk >= 0) { const pulse = V.pickK == null ? 1 : EZ.back(seg(V.pickK, pk * .25, pk * .25 + .4));
          c.save(); c.translate(cx, 104); c.scale(pulse, pulse); rrect(c, -22, -9, 44, 18, 3); c.fillStyle = rgba(C.accent, .16); c.fill(); c.strokeStyle = rgba(C.accent, .7); c.lineWidth = 1; c.stroke();
          txt(c, '%d #' + (pk + 1), 0, 1, { size: 10, w: 700, col: C.accent }); c.restore(); }
      });
      (V.toks || []).forEach(t => token(c, t, C));
      if (V.frac) { const f = V.frac; token(c, { kind: 'ci', x: f.x, y: f.y, r: 9, text: ".9", col: C.orange, rot: f.rot, al: f.al }, C); }
      if (V.cap) txt(c, V.cap, W - 12, 76, { size: 10, w: 700, col: C.orange, align: 'right', al: V.capA == null ? 1 : V.capA });
    }
  };
  // the chopped caption must persist across steps: mirror S.cap into V.cap before tweens
  SCENES.boxes.prep = (V, S) => { V.cap = S.cap; };
  reg('boxes');
})();

})();
