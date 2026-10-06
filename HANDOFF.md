# Road to Shipping: session handoff

Last updated: 6 October 2026 (v16). Owner: Sam (GitHub `4samtaylor`). Read this first in a new session.

## What this is

A C game-dev learning roadmap (13 phases: C → terminal game → Win32 window → prototype → Godot handoff) that Sam works through, with a partner reviewing progress. It's a web app on GitHub Pages with accounts and synced progress, piloted by Sam on his PC and iPhone (home-screen app). A store app via Capacitor is started but paused.

- **Site:** https://4samtaylor.github.io/road-to-shipping/
- **Repo:** https://github.com/4samtaylor/road-to-shipping (public)
- **Local copy:** `C:\Users\4samt\.claude\Claude Workspace\Game Project\road-to-shipping`
- **Supabase project:** `qvrpzycindlchwjzoqph` (Supabase connector available)
- **Design canvas (themes):** https://claude.ai/artifact/1XxjpMqMMEmW1iDa9f5CgC, pinned in Sam's claude.ai sidebar; snapshot in `design/theme-workshop/`

## Where things stand

| Item | Status |
|---|---|
| v10–v12: design system, repo + Pages, email/password sign-in + cloud sync | Live |
| v13: five-stage phases, help drawer, curriculum Step 3 (King order, specs, stretches, mixed review, Stuck & Curious), phone polish | Live (PRs #1–#4, #6) |
| v14: cheat sheets, skill levels, time tracking, larger desktop text | Live (PR #7) |
| Quiet sync indicator (background time saves don't flash "saving…") | Live (PR #8) |
| v15: dashboard home, one section per page, three-tab explainers, floating window, optional Ask Claude links | Live (PR #9) |
| v16: theme picker (6 themes) + reading/code font picker | Live (PR #10) |
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
- **Ask Claude:** off by default (menu toggle; `rts_ask_claude`). Links to `https://claude.ai/new?q=<prompt>`, which uses Sam's own Pro plan. Not yet confirmed that the prefill works while signed in; ask Sam.

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
