# Road to Shipping

A C game-dev roadmap that lives on GitHub Pages. Sign in once and your progress follows you to every device.

**Site:** https://4samtaylor.github.io/road-to-shipping/

## How it fits together

| Path | What it is |
|---|---|
| `content/*.html` | The roadmap itself, one file per phase. `content/manifest.json` sets the order and the rail groups. |
| `supabase/setup.sql` | The database: tables, privacy rules, account deletion. Run once in Supabase's SQL Editor. |
| `progress/<name>.json` | Old (v11) progress files. Import yours once from the menu, then they're no longer used. |
| `index.html`, `css/`, `js/` | The app. `js/app.js` is the roadmap UI, `js/cloud.js` handles sign-in and progress sync, `js/github.js` publishes edits as PRs, `js/boot.js` loads it all. |
| `.github/workflows/` | `pages.yml` deploys the site. `roadmap-edits.yml` checks every PR and auto-merges edits published from the page. |
| `tools/validate.py` | The content check those workflows run. Run it yourself before committing by hand. |

## Day to day

- **Tick things off.** Changes save on the device instantly and reach your account a moment later. Other devices pick them up when you come back to them. Works offline; it catches up when you reconnect.
- **Change the wording.** Press `E`, edit in place, then **Publish as PR**. The check runs and the PR merges on its own (for you and anyone in the `AUTO_MERGE_USERS` repo variable). The site updates about a minute later.
- **Bigger changes.** Edit `content/*.html` in VS Code, run `python tools/validate.py`, commit, push. To add a phase, add its file to `manifest.json` `files` and its section id to a `groups` entry. Keep every `data-id` unique, since progress is keyed by it.

## Publishing edits from a device

Signing in is all a device needs for progress. Only the computer you publish edits from needs a GitHub token:


1. Create a fine-grained token at https://github.com/settings/personal-access-tokens/new
   - Repository access: only `road-to-shipping`
   - Permissions: **Contents** and **Pull requests**, both Read and write
2. Open the site → menu (⋯) → **Connect GitHub** → paste it.

The token stays in that browser.

## Run it locally

```
python -m http.server 8000
```
then open http://localhost:8000. Opening `index.html` straight from disk won't work, because the page loads its content files.

## First-time setup

`setup.ps1` creates the repo, turns on Pages and Actions permissions, adds the label, and deploys. See the top of the file for how to run it.
