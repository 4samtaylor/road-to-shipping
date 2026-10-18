# Road to Shipping: session handoff

Last updated: v22 (pages inside phases). Owner: Sam (GitHub `4samtaylor`). Read this first in a new session.

## What this is

A C game-dev learning roadmap (13 phases: C → terminal game → Win32 window → prototype → Godot handoff) that Sam works through, with a partner reviewing progress. It's a web app on GitHub Pages with accounts and synced progress, piloted by Sam on his PC and iPhone (home-screen app). A store app via Capacitor is started but paused.

- **Site:** https://4samtaylor.github.io/road-to-shipping/
- **Repo:** https://github.com/4samtaylor/road-to-shipping (public)
- **Local copy:** `C:\Users\4samt\.claude\Claude Workspace\Game Project\road-to-shipping`
- **Supabase project:** `qvrpzycindlchwjzoqph` (Supabase connector available)
- **Design canvas (themes):** https://claude.ai/artifact/1XxjpMqMMEmW1iDa9f5CgC, pinned in Sam's claude.ai sidebar; snapshot in `design/theme-workshop/`

**Rebuild in progress:** `docs/REBUILD_PLAN.md` is the plan for ladders in every phase, pages inside phases, content cuts, the library filter and play-button visuals. Read it before touching phase content.

## Where things stand

| Item | Status |
|---|---|
| v10–v12: design system, repo + Pages, email/password sign-in + cloud sync | Live |
| v13: five-stage phases, help drawer, curriculum Step 3 (King order, specs, stretches, mixed review, Stuck & Curious), phone polish | Live (PRs #1–#4, #6) |
| v14: cheat sheets, skill levels, time tracking, larger desktop text | Live (PR #7) |
| Quiet sync indicator (background time saves don't flash "saving…") | Live (PR #8) |
| v15: dashboard home, one section per page, three-tab explainers, floating window, optional Ask Claude links | Live (PR #9) |
| v16: theme picker (6 themes) + reading/code font picker | Live (PR #10) |
| v17: Weekly Practice page (self-study checklist that resets Mondays, 3 progress-based exercise picks from `content/exercises.json`) | Live (PR #12, includes ☰ layout fix) |
| v18: Settings window (tabs: Appearance, Account, Editing, Progress data, Shortcuts) + account footer in the rail; ⋯ trimmed to quick actions; Person A block removed from Weekly Practice; VS Code steps 7–12 in Environment Setup | Live (PR #13) |
| v19: Concept ladder for Phase 2's Learn stage (8 concepts, one at a time); old Learn blocks folded into "Full notes" | Live (PR #14) |
| v20: Concept table of contents (no slider); Phase 1 and 3 ladders; `docs/REBUILD_PLAN.md` | Live (PR #15) |
| v21: Ladders for every phase (1 to 7); Library by phase and concept with Focus / This phase / All / Phase… filter and search; Phase 5 starter fixed for /W4 /WX (C4100, C4204, brush leak) | Live (PR #16) |
| v22: Pages inside phases (Overview → one page per concept → Trace → Build → Practice → Review), Section notes drawer, content cut ~45% and re-homed per concept (maps in `docs/pages/`), See It Run animations for all 60 concepts in Phases 1 to 6 | PR #17 |
| Supabase | Tables `profiles`, `progress`, `notes`, `user_state`, `skills`; RLS on all; newest-wins triggers; `delete_my_account()`. Migrations: `init_progress_sync`, `harden_functions`, `skills_and_admin_views`. Security advisor: only the intentional `delete_my_account` and a "leaked password protection" suggestion |
| Admin views | `admin.user_overview`, `admin.user_activity` (Table Editor → schema dropdown → `admin`). Not exposed to the API |
| Auth settings | Confirm email off, min password 8, new sign-ups off (Sam did these) |
| Android app (Capacitor) | **Paused.** PR #5 open against `main`. Build needs JDK 21 (see Next steps). Don't merge until built: it also switches Pages to publish `www/` |
| Custom SMTP, Supabase GitHub integration | Deliberately off (see Decisions) |

## Repo layout

```
index.html                 shell: top bar, rail, sign-in, menu, help drawer; inline script applies saved theme before paint
css/app.css                all styles: tokens per theme at top, then components; later "v13…v16" blocks layer on top
js/app.js                  the app: stages, dashboard + routing, glossary/explainers, floating window, time, themes, edit mode
js/cloud.js                Supabase sign-in + offline-first sync
js/github.js               edit mode → branch + PR (needs a GitHub token on that device)
js/boot.js                 loads content in manifest order → pre-sync → app.js
js/vendor/                 supabase-js UMD build
content/manifest.json      file order + rail/dashboard groups
content/config.json        owner/repo/branch + Supabase URL + publishable key (public by design)
content/NN-*.html          one fragment per phase/section
content/glossary.json      cheat-sheet + explainer entries per phase (ids are skill ids)
content/ladders/<phase>.json  concept ladder for that phase's Learn stage (rung ids are progress keys; never rename)
content/exercises.json     weekly practice exercise pool (ids are 'done' keys; never rename)
content/play/<phase>.json  See It Run specs, keyed by rung id (js/play/README.md has the format)
js/play/                   See It Run engine (engine.js), scenes (scenes-core.js, scenes-<phase>.js), README
docs/pages/<phase>.md      v22 content map: every old block → page / moved / cut, with reasons
supabase/setup.sql         readable summary of the first two migrations
supabase/migrations/       migration files from 2026-10-06 on
design/theme-workshop/     snapshot of the theme design canvas
tools/validate.py          content check (CI)
.github/workflows/         pages.yml (deploy), roadmap-edits.yml
privacy.html, sw.js, manifest.webmanifest, icons/, fonts/, setup.ps1, README.md
```

## How the app works now

- **Views (v15):** opens on a dashboard (`renderDash()`): progress, time, a Continue button, a card per section. Each section is its own page at `#/<id>` (`navigate()` / `showView()`, history-backed). CSS keys off `body.view-dash` / `body.view-section`; only `.is-current` shows.
- **Phase pages (v13):** `stagePhase()` regroups blocks by badge into Learn / Trace / Practice / Build / Review (`stageOf()`); "Stuck…" and "Claude Code Prompts" move to the help drawer. It runs after `markAnchors()`, so edit keys (`phase:blkN`) still mean "Nth `.section-block` in the source file". **Append new blocks at the end of a phase file** so existing keys don't shift. `data-order="-1"` puts a block first in its stage.
- **Curriculum blocks:** Build Spec, Stretch Goal (optional task: `data-optional`, excluded from totals and Resume), Mixed Review, Pair with King, Stuck & Curious. Copy an existing block to add one.
- **Cheat sheets + explainers (v14–v15):** `content/glossary.json`, 91 entries: `what`, `def`, `model`, `game` (+ `gameCode`), `example`, `gotcha`, `aliases`, `match`. Inline `.cmd` text that matches links (once per section) to the explainer. Desktop ≥1200px shows the current phase's sheet in the side panel. **Never rename or reuse an entry id** (it's the skill id).
- **Floating window:** `#fw` (`fwOpen` / `fwBack` / `fwClose`) is the one popup for explainers, whole cheat sheets, time, and Appearance. ✕, Back and the backdrop have their own listeners.
- **Skill levels:** dots on cheat-sheet rows; `state._skills` → `skills` table.
- **Time:** counted every 5 s while visible, active in the last 5 min, and on a phase page. `state._time[phase]` syncs as `user_state` rows `_time:<phase>` (merge keeps the max). `state._session` is device-only and resets after a 30-min gap. Background time saves don't show "saving…".
- **Themes + fonts (v16):** `[data-theme]` token blocks in `css/app.css` plus the `THEMES` list in `js/app.js`. `--font-mono` is the reading/UI font (historical name); `--font-code` is for code. Non-default fonts load from Google Fonts on demand. Theme and fonts are per device.
- **Weekly Practice (v17):** `#sync-agenda` (id kept so time/URLs survive). `renderWeekly()` fills `[data-weekly]` mounts. `state._week` = {wk (ISO week), check, picks, basis, swaps, target, lastTarget}; `state._exDone` = exercise id → ISO week. Both sync as `user_state` (`STATE_KEYS` in cloud.js). Picks: slot 0 = current phase (next task's phase if started, else furthest started, Phase 7 ignored), slot 1 = review from an earlier started phase, slot 2 = break/predict from any reached phase; seeded by week + swap count, prefer not-yet-done. A slot not done this week re-picks when the reached phases change.
- **Concept ladder (v19):** a phase div with `data-ladder="<id>"` gets its Learn stage from `content/ladders/<id>.json`. `stagePhase()` puts a mount first and folds the old Learn blocks into `.lad-notes` (closed; `scrollToEl` opens it when search jumps inside). Each rung: why → code walkthrough (`walk` = [line, note]) → one check (`check.a` is the right option, `miss` per wrong option) → try-it with `____` blanks → Q&A → bridge. Passing a check sets the rung's `skills` (glossary ids) to at least Practiced. `state._ladder[pid]` = {done:{rungId:true}, cur} syncs as user_state; walkthrough step/answers are per page view. `goals` maps checkpoint data-ids to 1-based rung numbers (pills on the "By the end" list). validate.py checks line numbers, answers, skills and goals. Roll out to other phases by writing their JSON and adding the attribute; Phase 2 was the pilot. Programs in the ladder were compiled and run to confirm each check answer.
- **Library (v21):** the desktop side panel (`#dk-sheet`) and ⋯ → Library (phones, floating window) show every glossary term by phase (roadmap order), then by concept using `content/ladders/<pid>.json` rungs (`skills` ⊇ term id, first match wins; the rest under "More"; phases without a ladder use the kind grouping). Ladder files for all glossary phases are fetched on load (404s ignored), so adding one just works. Filter: Focus (default; current phase + its `state._ladder[pid].cur` concept open) / This phase / All / Phase… + a search across all phases. `LIB` state and manual collapse choices persist in localStorage `rts_library`. Code: `libHTML` / `libListHTML` / `libRender` / `openLibrary` in app.js; re-rendered from `spy()`, `renderLadder()` and `RTS_app.setState`. Rows come from `csItem()`, shared with `sheetHTML()` (the single-phase Cheat sheet buttons).
- **Settings (v18):** `openSettings(tab)` renders `settingsHTML()` in the floating window; tab in `rts_set_tab`. Action rows are proxies (`data-proxy`) for hidden buttons in `#menu-src` (index.html), which cloud.js/github.js still wire by id, so their hidden state carries over. ◑ opens the Appearance tab. Rail footer `#rl-foot` (`renderRailFoot()`) re-renders when `#tb-sync` text changes; `RTS_CLOUD.account()` / `.enabled()` expose the signed-in email.
- **☰ on desktop:** rail/main/dock are pinned to grid columns 1/2/3; `rail-off` sets `--rail-w: 0px` on `.shell`. Don't hide a grid child without pinning columns.
- **Ask Claude:** off by default (menu toggle; `rts_ask_claude`). Links to `https://claude.ai/new?q=<prompt>`, which uses Sam's own Pro plan. Not yet confirmed that the prefill works while signed in; ask Sam.

## v22: pages inside phases

- **Page model:** a phase with `data-ladder` is a list of pages: Overview, Concept 1..N, Trace, Build, Practice, Review (pages with no blocks are skipped; Build comes before Practice because practice uses the starter code). Overview is the table of contents (goals, concept list, later pages, King reading, one Start / Continue button). A concept page is one ladder rung plus its attached blocks. Phases without a ladder (or if the ladder fails to load) get Learn / Trace / Build / Practice / Review.
- **`data-page` values** on each top-level child of `.phase-inner`: `overview`, `concept:<rungId>`, `trace`, `build`, `practice`, `review`, `notes`, `help`. No `data-page` falls back to `stageOf()` (learn becomes notes). `data-order="-1"` still puts a block first on its page; the checkpoint always ends Review. Page containers have ids `<pid>-overview`, `<pid>-c<k>`, `<pid>-trace` etc. All blocks stay in the DOM (non-current pages are `hidden`), so counts, search and sync are unchanged. Code: `stagePhase`, `buildPages`, `showPage`, `revealPage` (anything that scrolls to an element calls it first), `renderOverview`, `renderStrip`, `renderFoot`.
- **State and URL:** `state._pages[pid]` = saved page key (synced as user_state `_pages`). Hash is `#/<pid>/<key>` (`overview`, `1`..`N`, `trace`...). `#/<pid>` resumes the saved page. Opening a concept sets `state._ladder[pid].cur`. Left/Right arrows move Back/Next.
- **Drawers:** `help` blocks go to the Stuck? drawer, `notes` blocks to the **Section notes** drawer (`#notes`, built in JS next to `#help`; button hidden when a phase has none). Tasks inside drawers are not counted in progress.
- **See It Run hook:** on a concept page, if `RTSPlay.has(pid, rungId)`, part 2's header gets a "Step through | ▶ Watch it run" switch. Watch mode hides the walkthrough code and walk controls and opens the player in `.lad-play-host` via `RTSPlay.open(host, pid, rungId)` (the engine's own header is hidden by CSS there); switching back closes it and restores the walkthrough at the same step. The player survives re-renders of the same concept (the host node is lifted out and put back) and closes when the rung or page changes or edit mode starts. `window.RTS_LADDERS` exposes the ladders; the `rtsplay:loaded` event redraws the concept so the button appears; theme changes call `RTSPlay.refresh()`.
- **Phones:** the page strip is one horizontally scrolling row (current pill scrolled into view) with a small tools row (Section notes, Stuck? Help, Cheat sheet) below.
- **See It Run engine (`js/play/`):** `engine.js` exposes `window.RTSPlay` (`scene`, `has`, `open`, `close`, `refresh`, `load`, `ready`, `mount`). Specs load lazily from `content/play/<pid>.json` on the first `has()` call and fire `rtsplay:loaded`. A spec's `line` numbers point into the rung's own `code` (read from `window.RTS_LADDERS`), so **if you edit a rung's code, re-check its play spec**. The console handles `\r` like a terminal; `prompt` sets the header line (default `> game.exe`, `""` hides it, used for shell/bat/text rungs). Each new `scenes-*.js` needs a script tag in index.html (validate.py checks this, plus spec rung ids, line ranges and scene names). Phase 7 has no animations (its concepts are prompts, not programs); `content/play/phase7.json` is `{}` to avoid a 404.
- **Writing content now:** new material goes on the page it serves (`data-page`). A task that practises one concept sits on that concept page in a small "Practice this" block (max two attached blocks per concept). Curiosity questions become rung `qa`. Don't re-add Concepts First / Explain Like I'm New / Session Plan blocks; the concept pages replace them.

## How sync works (js/cloud.js)

- Fields: `p:<data-id>` → `progress`, `n:<id>` → `notes`, `k:<id>` → `skills`, `s:<key>` (`_scratch`, `_log`, `_logDay`, `_closed`, `_time:<phase>`) → `user_state`.
- Per account, localStorage keeps `rts_snap:<uid>`, `rts_meta:<uid>` (per-field timestamps), `rts_outbox:<uid>`. Changes save locally first, then upsert after 1.5 s; trigger `keep_newest` rejects stale rows. Pulls on boot, focus, visibility change, coming back online.
- Device-only: theme, fonts, session, scroll, unpublished edits, Ask Claude toggle, explainer tab.

## Decisions and why

- **GitHub for content + code, Supabase for accounts + progress** (privacy; strangers can't get repo write access).
- **Email + password, not magic link** (iPhone home-screen app keeps its own sign-in; no SMTP needed).
- **Supabase GitHub integration off:** migrations go through the connector; files are saved in `supabase/migrations/` afterwards.
- **No in-app Claude chat:** it would need an API key billed per use; a Claude Pro subscription can't power it, and Sam only wants Pro. Ask Claude links into claude.ai instead.
- **Themes are per device**, so phone and PC can differ.
- **Google sign-in hidden** (`"googleSignIn": true` in config later). **Sign in with Apple** waits for the App Store.

## Gotchas learned

- Never dedent or reformat content fragments: `<pre>` blocks depend on exact whitespace.
- `data-id` values and glossary ids are progress/skill keys. Reword freely; never change or delete an id.
- Merges made with `GITHUB_TOKEN` don't trigger other workflows (`roadmap-edits.yml` runs `gh workflow run pages.yml` itself).
- Testing locally: `python -m http.server 8000` (opening `index.html` from disk fails). The browser and the service worker cache hard. Unregister the SW, clear caches, and fetch changed files with `{cache:'reload'}` before trusting what you see.
- Local checkout has untracked `android/`, `node_modules/`, `www/` from the Android branch, excluded via `.git/info/exclude`. Don't `git add -A` on another branch without checking `git status`.
- Large heredocs in the Bash tool can fail on quoting; write long files with the Write tool instead.
- Supabase writes through the connector can be blocked by Claude Code's permission check. Ask Sam before any DB change.
- Supabase's built-in email only reaches Supabase team members; Sam's account email matches his Supabase login.
- Inputs under 16px make iPhone zoom in.

## Next steps

0. **Session notes (proposed, awaiting Sam's choice):** make S1/S2 addable in-app instead of PR-only. Options in chat: in-app journal stored in `user_state` (`_jnl:<id>` rows), auto-draft from the week's activity, or Ask Claude prefill.

1. **Pilot (running):** two weeks on PC + iPhone. Check ticks, notes, skills and time match across devices, and offline edits survive.
2. **Ask Claude:** confirm with Sam that the claude.ai prefill works while signed in.
3. **Themes:** Sam may keep iterating on the design canvas. Port any changes into `css/app.css` and `THEMES`. A theme could become the default for new devices once he picks a favourite.
4. **Collaboration (proposed, awaiting Sam's choice):** (a) read-only share with a friend by email; (b) comments + mentor "verified" checkpoints + mentor skill ratings; (c) editor role (personal tasks, weekly goals); (d) notifications. Each step is a small table plus RLS policies.
5. **Checked code exercises (proposed, awaiting choice):** a free "type the exact output" check for Predict-the-Output drills first. Then optionally run code on a hosted runner (Judge0/Piston) for pass/fail, with Claude feedback through a Supabase Edge Function (needs an Anthropic API key, which Sam doesn't want for now). Windows-only code (conio, Win32) can't run there.
6. **Android (paused):** install JDK 21 (`winget install --id EclipseAdoptium.Temurin.21.JDK -e`, about 170 MB; ask first), point `JAVA_HOME` at it, then `npm run build && npx cap sync android && cd android && gradlew.bat assembleDebug`, and test on emulator `Medium_Phone_API_37.0`. iOS later via a cloud Mac build (Codemagic or GitHub Actions macOS) + TestFlight; needs the Apple Developer account ($99/yr).
7. **Store-ready later:** Sign in with Apple, custom domain (Universal Links), content bundled with over-the-air updates, notifications.

## Working with Sam

- Direct and brief. Act on routine work, show the result, ask only when stakes are high. He's fine with Claude merging tested PRs and deploying.
- Wants plain output and exact clicks and commands. Uses Windows Terminal / VS Code, GitHub CLI (signed in), Chrome/Edge, an iPhone. No Mac, no Android phone.
- Test before shipping: check in the browser preview at 375/390/430 px and 1280 px, with real clicks for anything interactive.
