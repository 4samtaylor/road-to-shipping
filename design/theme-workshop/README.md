# Theme workshop

Source for the design canvas where the app's themes were explored:
https://claude.ai/artifact/1XxjpMqMMEmW1iDa9f5CgC (pinned in Sam's claude.ai sidebar).

Five artboards draw the same slice of the app (dashboard + a Phase 02 page with tasks, code and an explainer) in each look:

| File | Theme | In the app as |
|---|---|---|
| `Main.dc.html` | Neon terminal (the original) | `dark` |
| `Graphite.dc.html` | Graphite: quiet dark, one sage accent | `graphite` |
| `Paper.dc.html` | Paper: light, ink and one blue | `paper` |
| `Dusk.dc.html` | Dusk: warm dark, amber accent | `dusk` |
| `Blueprint.dc.html` | Blueprint: terminal feel, calmer | `blueprint` |

`canvas.json` is the canvas layout. These files are a snapshot; the live canvas is the source of truth while iterating. To keep iterating, ask Claude to revise the canvas at the link above (it reads the canvas first), then port any colour changes into the matching `[data-theme="…"]` block in `css/app.css` and the `THEMES` list in `js/app.js`.
