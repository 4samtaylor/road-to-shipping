# Road to Shipping: session handoff

Last updated: 18 Oct 2026, after v23 shipped (King depth + Phase 00, releases R0–R7; PRs #23–#28). Owner: Sam (GitHub `4samtaylor`). Read this first in a new session.

## What this is

A C game-dev learning roadmap (12 phases, 00 to 07 with half-steps: how computers work → C → terminal game → Win32 window → prototype → Godot handoff) that Sam works through, with a partner reviewing progress. It's a web app on GitHub Pages with accounts and synced progress, piloted by Sam on his PC and iPhone (home-screen app). A store app via Capacitor is started but paused.

- **Site:** https://4samtaylor.github.io/road-to-shipping/
- **Repo:** https://github.com/4samtaylor/road-to-shipping (public)
- **Local copy:** `C:\Users\4samt\.claude\Claude Workspace\Game Project\road-to-shipping`
- **Supabase project:** `qvrpzycindlchwjzoqph` (Supabase connector available)
- **Design canvas (themes):** https://claude.ai/artifact/1XxjpMqMMEmW1iDa9f5CgC, pinned in Sam's claude.ai sidebar; snapshot in `design/theme-workshop/`

**Rebuild done (v19 to v22):** every phase now has a concept ladder, pages (Overview → one page per concept → Trace → Build → Practice → Review), trimmed content and See It Run animations. `docs/REBUILD_PLAN.md` records the plan and the review process.

**Textbook depth done (v23):** every concept page has a "Learn it" section written to the depth of K. N. King's *C Programming: A Modern Approach* (2nd ed.), in our own words, ending with a King section reference. Phase 2 and Phase 3.5 were split, a new Phase 00 was added, and 24 new concepts went in (89 in all). `docs/V23_PLAN.md` is the plan (implemented; its status note lists what was deferred). `docs/KING_MAP.md` is the superseded first pass. `docs/pages/<phase>.md` gives each phase's current concept list and the v22 record of where every old block went. Read the plan and the page file before touching phase content.

**Phases and ids (rail order):** 00 How Computers Work `phase0` (own "Foundations" group) · 01 Hello World `phase1` · 02 Values & Expressions `phase2` · 2.5 Decisions & Loops `phase2b` · 03 Functions, Arrays & Strings `phase3` · 3.5 Structs & Pointers `phase3b` · 3.75 Organising Code `phase3c` · 04 Git & Your Partner `phase4` · 4.5 ASCII Runner `phase4b` · 05 Win32 Window `phase5` · 06 Prototype `phase6` · 07 Directing Claude Code `phase7`. Environment Setup shows `>_` in the rail (00 now belongs to Phase 00).

## Start here (new session)

**Next up, in order:**

1. **v23 is complete.** R6/R7 (PR #28) added Phase 00 with See It Run for all 9 concepts, Learn it for Phases 4 and 7, the Phase 7 "Things Claude may show you" box, See It Run for Phase 1 "Comments and layout" and Phase 4.5 "Preprocessor switches", the docs/pages refresh, KING_MAP and V23_PLAN on main, and the em-dash sweep. Every concept in every phase now has Learn it, and every concept in Phases 00 to 6 has a See It Run (Phase 7 is about working with Claude and has none).
2. **Watch Sam's first week on v23.** Learn-it sections run 200–680 words; ask whether they feel too long on the phone and whether Phase 00 should be optional for him.
3. **Settled, not deferred:** `_CRT_SECURE_NO_WARNINGS` stays a `#define` at the top of each source file (Phase 4.5 "Preprocessor switches" teaches why it must come before the includes), and build.bat FLAGS leave out `/nologo` on purpose (Phase 1 "Compiling" uses cl's banner lines as signposts for each build step). `/RTC1` is not used; the debugger page says so. Splitting `scanf` into two rungs was optional and not done.
4. **Small leftovers:** none known. (The check-kit README and Start page step 9 were fixed in R6.)
5. Then pick from Open questions and Next steps below.

**How to work:**

1. `cd` into the repo, `git checkout main && git pull`. Branch for any change; PRs go through `gh api repos/4samtaylor/road-to-shipping/pulls` (GraphQL is blocked, so `gh pr create` fails), merge with `gh api -X PUT .../pulls/N/merge -f merge_method=squash`. Branch deletes are blocked; leave merged branches.
2. Run `python3 tools/validate.py` before every PR (CI runs it too).
3. Test locally with `python3 -m http.server 8000` and Playwright/Chromium at 1300 and 390 px. Click through the page you changed, including ▶ Watch it run if it's a concept. To show Sam a branch before merge, push it and send `https://rawcdn.githack.com/4samtaylor/road-to-shipping/<sha>/index.html` (a commit sha, not a branch name, so the CDN doesn't serve a stale copy). Bump `CACHE` in `sw.js` (`rts-v23-r6` now) with each release.
4. **Copyright rule:** King's text is never copied into the repo: no sentences, example programs or exercises. Explanations are in our own words with a "King §x.y" reference. The book text Sam supplied lives only in the session's scratch folder, never in the repo. Before each commit, run `python tools/king_overlap.py <folder with the King chNN.txt files>`: it finds any run of 7 words shared with King in the lines changed since main (plus em dashes and banned words). Rewrite every hit.
5. Sam likes drafts before big UX changes (show a screenshot or artifact first), then "push it" means PR + merge + confirm the deploy.
6. For big content jobs the pattern that worked: Sonnet agents execute (one per phase), Opus agents review independently, a Haiku agent sweeps style or clicks through the app, then fixes go back to the authors.

## Open questions for Sam

- **v23 decisions:** the source `#define` and no `/nologo` are deliberate (see Start here, item 3).
- **Session notes:** S1/S2 are still static pages edited by PR. Proposed options: in-app journal entries (`user_state` `_jnl:<id>`), auto-draft from the week's activity, or Ask Claude prefill. Not chosen yet.
- **King references:** verified against the book text in v23 (R0 rewrote every Pair with King block; every Learn-it ends with a section line). Phase 00, Phase 4 and parts of Phase 7 are mostly outside King and point at Microsoft Learn or Pro Git instead.
- **Section notes drawer:** built, but no phase uses it yet (content agents found nothing worth keeping that fit no page). Fine to leave.

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
| v22: Pages inside phases (Overview → one page per concept → Trace → Build → Practice → Review), Section notes drawer, content cut ~45% and re-homed per concept (maps in `docs/pages/`), See It Run animations for all 60 concepts in Phases 1 to 6 | Live (PR #17) |
| v23 R0+R1: verified King readings, "Learn it" field + validate.py checks, `LAD_MIGRATIONS`, goals by rung id, MSVC check kit | Live (PR #23) |
| v23 R2: Phase 1 and 2 rewrite, Phase 2 split into 02 Values & Expressions + 2.5 Decisions & Loops (`phase2b`) | Live (PR #24) |
| v23 R3: Phase 3 rewrite (13 concepts), build.bat gets `/std:c17`, pages matched to Sam's MSVC run | Live (PR #25) |
| v23 R4: Phase 3.5 split into 3.5 Structs & Pointers + 3.75 Organising Code (`phase3c`) | Live (PR #26) |
| v23 R5: Learn it for Phases 4.5, 5, 6; `ifdef`, `bit-flags`, `game-files`; Phase 5 PeekMessage + snprintf; Phase 6 starter matches the rungs | Live (PR #27) |
| v23 R6 + R7: Phase 00 How Computers Work (9 concepts); Phase 4 and 7 Learn-it, Phase 7 box; docs, HANDOFF, KING_MAP superseded | On branch `v23-r6`, not merged (see Start here) |
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
content/NN-*.html          one fragment per phase/section (v23 inserts use a letter: 01b-phase0, 05b-phase2b, 07b-phase3c)
content/glossary.json      cheat-sheet + explainer entries per phase (ids are skill ids)
content/ladders/<phase>.json  concept ladder for that phase's Learn stage (rung ids are progress keys; never rename)
content/exercises.json     weekly practice exercise pool (ids are 'done' keys; never rename)
content/play/<phase>.json  See It Run specs, keyed by rung id (js/play/README.md has the format)
js/play/                   See It Run engine (engine.js), scenes (scenes-core.js, scenes-<phase>.js), README
docs/pages/<phase>.md      current concept list per phase (v23), then the v22 map of every old block → page / moved / cut
docs/V23_PLAN.md           v23 plan (implemented; status note at the top lists deferrals)
docs/KING_MAP.md           first-pass King comparison, superseded by V23_PLAN
tools/msvc-check/          one tiny .c per MSVC warning the pages cite, facts.c, run.bat, expected.json, compare.py
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
- **Cheat sheets + explainers (v14–v15):** `content/glossary.json`, 161 entries across 12 phases: `what`, `def`, `model`, `game` (+ `gameCode`), `example`, `gotcha`, `aliases`, `match`. Inline `.cmd` text that matches links (once per section) to the explainer. Desktop ≥1200px shows the current phase's sheet in the side panel. **Never rename or reuse an entry id** (it's the skill id).
- **Floating window:** `#fw` (`fwOpen` / `fwBack` / `fwClose`) is the one popup for explainers, whole cheat sheets, time, and Appearance. ✕, Back and the backdrop have their own listeners.
- **Skill levels:** dots on cheat-sheet rows; `state._skills` → `skills` table.
- **Time:** counted every 5 s while visible, active in the last 5 min, and on a phase page. `state._time[phase]` syncs as `user_state` rows `_time:<phase>` (merge keeps the max). `state._session` is device-only and resets after a 30-min gap. Background time saves don't show "saving…".
- **Themes + fonts (v16):** `[data-theme]` token blocks in `css/app.css` plus the `THEMES` list in `js/app.js`. `--font-mono` is the reading/UI font (historical name); `--font-code` is for code. Non-default fonts load from Google Fonts on demand. Theme and fonts are per device.
- **Weekly Practice (v17):** `#sync-agenda` (id kept so time/URLs survive). `renderWeekly()` fills `[data-weekly]` mounts. `state._week` = {wk (ISO week), check, picks, basis, swaps, target, lastTarget}; `state._exDone` = exercise id → ISO week. Both sync as `user_state` (`STATE_KEYS` in cloud.js). Picks: slot 0 = current phase (next task's phase if started, else furthest started, Phase 7 ignored), slot 1 = review from an earlier started phase, slot 2 = break/predict from any reached phase; seeded by week + swap count, prefer not-yet-done. A slot not done this week re-picks when the reached phases change.
- **Concept ladder (v19):** a phase div with `data-ladder="<id>"` gets its Learn stage from `content/ladders/<id>.json`. `stagePhase()` puts a mount first and folds the old Learn blocks into `.lad-notes` (closed; `scrollToEl` opens it when search jumps inside). Each rung: why → Learn it (v23) → code walkthrough (`walk` = [line, note]) → one check (`check.a` is the right option, `miss` per wrong option) → try-it with `____` blanks → Q&A → bridge. Passing a check sets the rung's `skills` (glossary ids) to at least Practiced. `state._ladder[pid]` = {done:{rungId:true}, cur} syncs as user_state; walkthrough step/answers are per page view. `goals` maps checkpoint data-ids to rung ids or 1-based rung numbers (pills on the "By the end" list). validate.py checks line numbers, answers, skills and goals. Roll out to other phases by writing their JSON and adding the attribute; Phase 2 was the pilot. Programs in the ladder were compiled and run to confirm each check answer.
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

## v23: King depth

- **"Learn it":** a rung may carry `learn: { parts: [[heading, html], ...], king: "§2.4, §2.7" }`. `ladLearnHTML()` renders it as part 2 of the concept page, between "Why you need it" and the walkthrough, with a "~N min read" label and a "King's version: §…" line. It is open until the concept is passed, then folded. Every rung in every phase has one. validate.py checks that `parts` is a non-empty list of [heading, html] pairs, that the text is at most 900 words (over 900 means split the concept), and that `king` is text. Writing standard: V23_PLAN section 5 (idea, how it works, beginner mistakes, MSVC notes, King line; game-flavoured examples; links by concept name, never by number).
- **Moving rungs between phases:** ticks are stored per phase id, so `LAD_MIGRATIONS` in `js/app.js` lists one-time moves: `v23-phase2-split` (`if`, `switch`, `loops`, `rand` from `phase2` to `phase2b`) and `v23-phase3b-split` (`enum`, `headers`, `linker`, `debugger` from `phase3b` to `phase3c`). `ladMigrate()` runs from `ladState()`, records each id in `state._ladder._mig`, and saves once. To move a rung again, add an entry; never edit or reuse an old id. Tasks and checkpoints that move pages keep their old `data-id`s (for example `p2-loops` now lives in 2.5).
- **Goals by rung id:** ladder `goals` may list rung ids (`"variables"`) instead of 1-based positions, so inserting a rung doesn't break them (`ladGoalNums()`; validate.py checks both forms). Use ids for new goals.
- **MSVC check kit (`tools/msvc-check/`):** one tiny file per warning or error a page cites, plus `facts.c` (type sizes, `RAND_MAX`, `%p`, C17 features). `run.bat` works from any cmd or PowerShell window: it finds Visual Studio with vswhere and loads vcvars64 itself, compiles each case with `/W4 /WX /std:c17`, and writes `results.txt`; `compare.py results.txt` checks it. **`expected.json` is the source of truth for MSVC warning codes**: all 58 cases were verified on Sam's VS 2026 x64 install. A page may only cite a code that is in it; to add a claim, add a case, have Sam run it, then write the page. Notable results: `print_menu;` is C4550 (not C4551), a double include is C2371, `char c[3] = "Sam"` is C4295, C4555, C4390 and C4062 don't fire at `/W4`.
- **Toolchain:** setup uses vcvars64 (x64) and notes the VS 2026 folder (`18`). build.bat FLAGS are `/std:c17 /W4 /WX /Zi /Od`; Phase 3.75 adds a multi-file version with `SOURCES`. Starters that use scanf, fopen or strcpy still begin with `#define _CRT_SECURE_NO_WARNINGS` (kept on purpose; see Start here, item 3).

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

**A. v23 (textbook depth) and B. Phase 00: done.** Sam's two requests of 17 Oct 2026 (King-depth explanations on every concept, and a "how computers work" crash course) are implemented as described in "v23: King depth" and `docs/V23_PLAN.md`. What's left of them is in Start here (land R6/R7, deferrals, small leftovers).

0. **Page follow-ups (small):** watch for friction (page strip on phones, Learn-it length at 390 px, whether 390 px canvas labels are readable enough). Phase 7 has no See It Run by design. If a rung's `code` changes, re-check its `content/play/<phase>.json` spec (line numbers point into that code; validate.py catches out-of-range lines but not wrong ones).
1. **Session notes:** see Open questions.

2. **Pilot (running):** two weeks on PC + iPhone. Check ticks, notes, skills and time match across devices, and offline edits survive.
3. **Ask Claude:** confirm with Sam that the claude.ai prefill works while signed in.
4. **Themes:** Sam may keep iterating on the design canvas. Port any changes into `css/app.css` and `THEMES`. A theme could become the default for new devices once he picks a favourite.
5. **Collaboration (proposed, awaiting Sam's choice):** (a) read-only share with a friend by email; (b) comments + mentor "verified" checkpoints + mentor skill ratings; (c) editor role (personal tasks, weekly goals); (d) notifications. Each step is a small table plus RLS policies.
6. **Checked code exercises (proposed, awaiting choice):** a free "type the exact output" check for Predict-the-Output drills first. Then optionally run code on a hosted runner (Judge0/Piston) for pass/fail, with Claude feedback through a Supabase Edge Function (needs an Anthropic API key, which Sam doesn't want for now). Windows-only code (conio, Win32) can't run there.
7. **Android (paused):** install JDK 21 (`winget install --id EclipseAdoptium.Temurin.21.JDK -e`, about 170 MB; ask first), point `JAVA_HOME` at it, then `npm run build && npx cap sync android && cd android && gradlew.bat assembleDebug`, and test on emulator `Medium_Phone_API_37.0`. iOS later via a cloud Mac build (Codemagic or GitHub Actions macOS) + TestFlight; needs the Apple Developer account ($99/yr).
8. **Store-ready later:** Sign in with Apple, custom domain (Universal Links), content bundled with over-the-air updates, notifications.

## Working with Sam

- Direct and brief. Act on routine work, show the result, ask only when stakes are high. He's fine with Claude merging tested PRs and deploying.
- Wants plain output and exact clicks and commands. Uses Windows Terminal / VS Code, GitHub CLI (signed in), Chrome/Edge, an iPhone. No Mac, no Android phone.
- Test before shipping: check in the browser preview at 375/390/430 px and 1280 px, with real clicks for anything interactive.
