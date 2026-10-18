# See It Run: writing scenes and specs

Two pieces:

- **Scene** (JS, `js/play/scenes-<name>.js`): the drawing code for one visual idea (a track, a set of boxes, a stack...). Written once, reused by many concepts.
- **Spec** (JSON, `content/play/<pid>.json`): a timeline for one rung: which line runs, what the canvas does, what the console prints. Most work is writing specs against an existing scene. Read the action list at the top of `scenes-core.js` first.

The engine (`engine.js`) does everything else: code panel with line highlight, canvas scaling, Play / Step / Reset / speed, console, caption, shared animation loop.

## Spec format

`content/play/<pid>.json` is `{ "<rungId>": spec }`. `<pid>` is the phase id (`phase2`), `<rungId>` is a rung `id` in `content/ladders/<pid>.json`.

```json
{
  "scene": "loops",
  "steps": [
    { "line": 4, "ms": 1100, "note": "lives starts at 3.", "do": [ { "a": "lives", "to": 3 } ] },
    { "line": 6, "ms": 1000, "out": "Lives: 3\n", "outAt": 0.3, "note": "printf prints it.",
      "do": [ { "a": "run", "from": 0, "to": 0.5, "ease": "start" }, { "a": "say", "t": "Lives: 3", "at": 0.25, "len": 0.7 } ] }
  ]
}
```

- `scene`: key in `RTSPlay.SCENES`. A spec whose scene is not registered is ignored (the button never shows).
- `code`: **omit it.** The player uses the rung's own `code` (from `window.RTS_LADDERS[pid]`), so `line` numbers are 1-based lines of that exact code. Only set `code` for a rung with no ladder code.
- `title`: optional; defaults to the rung title.

Step fields (one step per line executed, in run order; a loop revisits the same `line` many times):

| field | meaning |
|---|---|
| `line` | 1-based line of the rung code to highlight (required) |
| `ms` | duration at 1x speed, default 1000. 800-1300 is typical; 2000+ only for a showpiece |
| `note` | plain-English caption under the canvas for this step. Keep it to one or two short sentences |
| `out` | exact text this step writes to the console, including `\n` (printf output) |
| `outAt` | fraction of the step (0..1) at which `out` appears, default 0.5 |
| `do` | array of actions (below), run in parallel inside the step |

Action fields: `a` (action name, defined by the scene), any scene params, plus the timing fields:

- `at`: when the action starts, as a fraction of the step (0..1), default 0
- `len`: how long it lasts, as a fraction of the step, default `1 - at`

So `{ "a": "spawn", "n": 2, "at": 0.3, "len": 0.5 }` animates between 30% and 80% of the step. An empty `do: []` is valid (a pure highlight step).

## Scene contract

Register with `RTSPlay.scene(name, def)`. `def`:

```
W, H                 logical canvas size (e.g. 400, 250); the engine scales it to the real pixel size (DPR aware)
init()               -> state S before any line has run. Plain JSON only (no functions, no Infinity/NaN)
apply(S, a)          mutate S to the state AFTER action `a` has finished. Instant, no animation
tween(V, a, lp, S, C)  V is a copy of S. Push V toward the look of action `a` at local progress lp (0..1).
                     lp=0 must look like S; lp=1 must look like apply(S, a). C = palette
draw(ctx, V, T, C, rm) paint V. T = ms clock for idle motion, rm = reduced motion (skip idle motion)
prep(V, S)?          optional; runs on V before the tweens each frame (copy persistent S fields that tween code overwrites)
```

Lifecycle, per frame: `V = clone(stateAfterPreviousSteps)`, then for every action in the current step `tween(V, a, clamp((p - at) / len), S, C)`, then `draw`. States for finished steps are computed by folding `apply()` over their actions, so Reset, Step and pause are exact and the scene holds no hidden animation state. Consequences:

- Anything that must persist after an action goes in `apply()` and `S`. Anything transient (a flying token, a pop) lives only in `V`, set from `tween`.
- `tween` runs with lp = 0 and lp = 1 too; make both ends match `S` before / after `apply` (otherwise you get a visible jump).
- Actions whose window has not started (lp = 0) are still called; they must be harmless then.
- With `prefers-reduced-motion` every step is drawn at lp = 1.

## Palette keys (`C`)

All are `#rrggbb`, read from the app's CSS tokens, so every theme works:
`bg surface surface2 border border2 text muted muted2 accent orange purple yellow blue`, plus
`ink` (dark colour for text/outlines sitting on a coloured fill) and `accentDk` (darker accent for shading).
Never hard-code a hex in a scene except for pure effects (shadows, white highlights). Use `RTSPlay.util.rgba(C.accent, 0.3)` for alpha.

## Helpers: `RTSPlay.util`

`clamp(x,a=0,b=1)`, `lerp(a,b,t)`, `seg(p,a,b)` (progress of p inside [a,b], clamped), `EZ.{lin,in,out,io,back,bounce,start,end}`, `rgba(hex,alpha)`, `txt(ctx,str,x,y,{size,w,col,align,base,al})`, `bg(ctx,C,W,H)` (dotted background), `pix(ctx,rows,x,y,unit,cols,alpha)` (pixel sprite from strings; `'0'` is empty, other digits index `cols`), `rrect(ctx,x,y,w,h,r)`, `FONT`, `clone`.

## Worked example: a tiny "counter" scene

`js/play/scenes-counter.js` (load it in `index.html` after `scenes-core.js`):

```js
(function () {
  var U = RTSPlay.util;
  RTSPlay.scene('counter', {
    W: 400, H: 250,
    init: function () { return { n: 0, flash: 0 }; },
    apply: function (S, a) { if (a.a === 'set') S.n = a.to; },
    tween: function (V, a, lp, S) {
      if (a.a === 'set') {
        V.n = lp >= 0.5 ? a.to : S.n;                         // value flips halfway
        V.flash = Math.sin(Math.PI * U.seg(lp, 0, 1));         // pop 0 -> 1 -> 0
      }
    },
    draw: function (c, V, T, C, rm) {
      U.bg(c, C, 400, 250);
      var k = 1 + 0.3 * (V.flash || 0);
      c.save(); c.translate(200, 125); c.scale(k, k);
      U.txt(c, String(V.n), 0, 0, { size: 64, w: 800, col: C.accent });
      c.restore();
    }
  });
})();
```

Spec for a rung whose code has `int n = 0;` on line 4 and `n = n + 1;` on line 5:

```json
"counter": { "scene": "counter", "steps": [
  { "line": 4, "ms": 900, "note": "n starts at 0.", "do": [ { "a": "set", "to": 0 } ] },
  { "line": 5, "ms": 1000, "note": "n + 1 is 1; store it back in n.", "do": [ { "a": "set", "to": 1 } ] }
] }
```

## Wiring (app side)

```js
if (RTSPlay.has(pid, rung.id)) { /* show a "See it run" button */ }      // first call per phase starts loading
document.addEventListener('rtsplay:loaded', function (e) { /* e.detail.pid: re-render that phase's rung */ });
RTSPlay.open(hostEl, pid, rung.id);   // mount (replaces any player in hostEl)
RTSPlay.close(hostEl);                // unmount
RTSPlay.refresh();                    // after a theme change (also auto-detected via <html data-theme>)
```

The app must expose the ladders as `window.RTS_LADDERS[pid]` (the parsed ladder JSON, `{rungs:[...]}`) so the code defaults to the rung's code.

## Checklist

- `line` numbers match the rung `code` exactly; the last step ends the program (`return 0`).
- Every `out` string, concatenated, equals what the program would print.
- Captions are short; no emoji; plain words before jargon.
- Test in the six themes and at 390px width (canvas scales; controls wrap).
