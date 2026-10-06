# Road to Shipping: session handoff

Last session: October 2026. Owner: Sam (GitHub `4samtaylor`). Read this first in a new session.

## What this is

A C game-dev learning roadmap (13 phases, C → raylib prototype → Godot handoff) that Sam and a partner work through. It started as a single bundled HTML file (v9). It's now a web app on GitHub Pages with accounts and synced progress, being piloted by Sam alone across his PC and iPhone. The long-term option is a store app via Capacitor.

- **Site:** https://4samtaylor.github.io/road-to-shipping/
- **Repo:** https://github.com/4samtaylor/road-to-shipping (public)
- **Local copy:** `C:\Users\4samt\.claude\Claude Workspace\Game Project\road-to-shipping`
- **Supabase project:** `qvrpzycindlchwjzoqph` (Supabase connector available)

## Where things stand

| Item | Status |
|---|---|
| v10: design-system refactor (tokens, primitives, a11y, contrast, dead CSS) | Done |
| v11: split into repo, GitHub Pages, PR automation, `setup.ps1` | Done and live |
| Supabase database (tables, RLS, newest-wins triggers, delete-account) | Done. Migrations `init_progress_sync` + `harden_functions` applied; security advisor clean except the intentional `delete_my_account` |
| Supabase URL Configuration (Site URL + redirects) | Done |
| v12: email + password sign-in and cloud sync | Done and live. Sam's account exists; 80 progress rows verified in Supabase |
| v13: Step 2 "show less", Step 3 curriculum, phone polish | Done and live (PRs #1–#4, #6 merged Oct 6 2026) |
| Android app (Capacitor) | PR #5 open, **paused**: build needs JDK 21 (Android Studio ships Java 25; Gradle 8.14 needs ≤24). Next: install Temurin 21, build, test on emulator. Don't merge #5 until built: it also switches Pages to publish `www/` |
| Skill levels (Not started / Practiced / Solid) | Not started: needs a storage decision (new `skills` table vs a `user_state` key) |
| Supabase auth settings (confirm email off, min 8, sign-ups off) | Done by Sam |
| Custom SMTP | Skipped on purpose (password sign-in doesn't need it) |
| Supabase GitHub integration | Deliberately **off**; see Decisions |

## Repo layout

```
index.html               shell: top bar, rail, sign-in panel, menu
css/app.css              all styles; tokens at top (dark + light), primitives, utilities
js/app.js                roadmap UI (from v10); hooks at bottom: window.RTS_app
js/cloud.js              Supabase sign-in + offline-first sync
js/github.js             edit mode → branch + PR (needs a GitHub token on that device only)
js/boot.js               loads content in manifest order → pre-sync → app.js
js/vendor/supabase-2.117.2.js   vendored supabase-js UMD build
content/manifest.json    file order + rail groups (RTS_GROUPS)
content/config.json      owner/repo/branch + supabaseUrl + publishable key (public by design)
content/NN-*.html        one fragment per phase/section
supabase/setup.sql       readable copy of what's applied to the database
tools/validate.py        content check (CI): tag balance, unique id/data-id, no script/on*= handlers
.github/workflows/       pages.yml (deploy), roadmap-edits.yml (validate + auto-merge label roadmap-edit)
progress/4samtaylor.json old v11 progress; one-time import via menu
privacy.html, sw.js, manifest.webmanifest, icons/, setup.ps1, README.md
```

## How sync works (js/cloud.js)

- State is flattened into fields: `p:<data-id>` (task/checkpoint done) → `progress`, `n:<id>` → `notes`, `s:<key>` (`_scratch`, `_log`, `_logDay`, `_closed`) → `user_state`.
- Per account, localStorage keeps `rts_snap:<uid>`, `rts_meta:<uid>` (per-field timestamps), `rts_outbox:<uid>`.
- A change goes to localStorage immediately, then is upserted after 1.5 s. A DB trigger `keep_newest` rejects stale rows. Pulls happen on boot, focus, visibility change, and coming back online.
- First sign-in on a device: server wins where it has a value; local-only values upload. That's how existing PC progress migrates.
- Per-device only (not synced): theme, open phases, scroll, timer, unpublished edits.
- Delete account = RPC `delete_my_account()` (security definer, cascades).

## Decisions and why

- **GitHub for content + code, Supabase for accounts + progress.** Progress was in public repo files in v11; it moved for privacy and because strangers can't be given repo write access.
- **Email + password, not magic link.** On iPhone, an email link opens Safari, which keeps its sign-in separate from the home-screen app. iCloud Keychain + Face ID makes passwords nearly as smooth, and no email gets sent, so no SMTP.
- **Supabase GitHub integration off.** The connector applies migrations directly; running both risks migration-history drift. Turn it on only if someone besides Claude changes the DB. First add the two applied migrations as files under `supabase/migrations/` matching the live versions.
- **Google sign-in hidden.** Turn it on later with `"googleSignIn": true` in config.json after Google console setup.
- **Sign in with Apple waits for the App Store.** It needs the paid Apple Developer account.
- **Legacy class names kept as aliases** of the primitives (`.eyebrow`, `.btn`, `.tag`, `.callout`), because app.js hooks into them.

## How v13 works

- **Stages are built at load, not in the content files.** `stagePhase()` in `js/app.js` sorts each phase's blocks by badge into Learn / Trace / Practice / Build / Review; "Stuck…" and "Claude Code Prompts" go to the help drawer. Mapping is in `stageOf()`. A block can ask to go first in its stage with `data-order="-1"`; the checkpoint always closes Review.
- **This runs after `markAnchors()`**, so edit keys (`phase:blkN`) still mean "Nth `.section-block` in the source file". New blocks are appended at the end of a phase file so existing keys don't shift.
- **Curriculum block types:** Build Spec (practice, first), Stretch Goal (build), Mixed Review (review), Pair with King (learn, last), Stuck & Curious (help). Scratch helpers that generated them aren't in the repo; copy an existing block.
- **Optional tasks:** `data-optional` on a `.task` keeps it out of totals, phase counts and Resume. Its progress key still syncs.
- **Focus mode** (`_solo`) is on by default and per device.
- **Phase 3 / 3.5 swap:** Phase 03 = Functions, Arrays & Strings; 3.5 = Pointers & Structs. Task ids kept their old prefixes (`p3b-*` tasks now live in Phase 03 and vice versa); that's intentional, ids are progress keys.

## Gotchas learned

- Merges made with `GITHUB_TOKEN` don't trigger other workflows. `roadmap-edits.yml` runs `gh workflow run pages.yml` after auto-merging.
- Never dedent or reformat content fragments: `<pre>` code blocks depend on exact whitespace.
- `data-id` values are progress keys. Rewording a task is fine; changing or deleting an id orphans saved progress.
- Supabase's built-in email (no SMTP) only delivers to Supabase team members, so Sam's account email should match his Supabase login for password resets.
- Inputs under 16px make iPhone zoom in; `.auth-in` is 16px on mobile.
- The page needs a server (`python -m http.server 8000`); opening `index.html` from disk fails by design.
- The v11 app kept committing `progress/4samtaylor.json` to `main`. Always pull before pushing.
- Python's `http.server` gets cached hard by the browser; after editing, fetch the changed files with `{cache:'reload'}` or hard-refresh before trusting what you see.
- Supabase writes through the connector (even `update`) can be blocked by Claude Code's permission check; ask Sam before any DB change.

## Next steps

**Step 1 (pilot):** account created and verified (Oct 6 2026). Now a two-week pilot on PC + iPhone: ticks match, offline edits survive, nothing gets lost.

**Step 2: show less on screen at once** (done)
- Focus mode by default: only the current phase open.
- Progress indicators from 5 to 2 (keep top bar + rail; drop hero strip, per-phase bars, dock duplicate).
- Every phase in one order: **Learn → Trace → Practice → Build → Review**, with size labels ("4 drills · ~10 min").
- "Stuck?" and Claude prompts move into a help drawer.
- "By the end you can…" goals at the top of each phase, built from its checkpoint list.

**Step 3: curriculum** (done, except skill levels)
- *Khan:* move Predict the Output before tasks; add a stretch version to every build (guessing game, high-score table, ASCII runner, prototype); mixed review (two earlier-phase questions per quiz); skill levels Not started / Practiced / Solid saved to the account (this needs a new table, a good moment to adopt migration files); three requirement bullets before each Build, tied to Phase 07.
- *K.N. King:* swap so Phase 03 = Functions, Arrays & Strings and Phase 3.5 = Pointers & Structs (Player struct moves to 3.5). Add integer division/casting (02), `#define` constants (03), save high score with `fopen`, a multi-file ASCII Runner + `build.bat` before Phase 06. "Stuck?" becomes "Stuck & Curious" with 3–4 Q&A items per phase. Add a "Pair with King" line per phase: 01 → ch 1–2, 02 → 3–7, 03 → 8–10, 13, 3.5 → 11, 12, 16, multi-file → 14–15 (check against Sam's copy). Leave out unions, advanced pointers, and bit work.

**Store-ready later:** Sign in with Apple, a custom domain (needed for Universal Links), content bundled inside the app with over-the-air content updates (code ships through review), notifications, Capacitor wrap. Android first.

## Working with Sam

- Direct and brief. Act on routine work, show the result, and ask only when stakes are high.
- Prefers plain, clean output and step-by-step instructions with exact clicks and commands. He runs commands in Windows Terminal or VS Code.
- Has: Git, GitHub CLI (signed in), VS Code, Chrome/Edge on Windows, an iPhone.
- Test before shipping. Past builds were verified with Playwright against a mocked GitHub/Supabase API, and the SQL against a local Postgres harness with fake `auth.uid()`.
