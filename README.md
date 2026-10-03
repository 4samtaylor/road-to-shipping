# Road to Shipping

A C game-dev roadmap that lives on GitHub Pages. Progress syncs across devices and can be shared.

**Site:** https://4samtaylor.github.io/road-to-shipping/
**Someone's progress:** add `?user=<github-name>` to the link.

## How it fits together

| Path | What it is |
|---|---|
| `content/*.html` | The roadmap itself, one file per phase. `content/manifest.json` sets the order and the rail groups. |
| `progress/<name>.json` | One person's checkmarks, notes and session log. Written by the page, not by hand. |
| `index.html`, `css/`, `js/` | The app. `js/app.js` is the roadmap UI, `js/sync.js` talks to GitHub, `js/boot.js` loads it all. |
| `.github/workflows/` | `pages.yml` deploys the site. `roadmap-edits.yml` checks every PR and auto-merges edits published from the page. |
| `tools/validate.py` | The content check those workflows run. Run it yourself before committing by hand. |

## Day to day

- **Tick things off.** Each connected device saves to `progress/<you>.json` a few seconds after a change, and picks up changes from your other devices when you come back to the tab.
- **Change the wording.** Press `E`, edit in place, then **Publish as PR**. The check runs and the PR merges on its own (for you and anyone in the `AUTO_MERGE_USERS` repo variable). The site updates about a minute later.
- **Bigger changes.** Edit `content/*.html` in VS Code, run `python tools/validate.py`, commit, push. To add a phase, add its file to `manifest.json` `files` and its section id to a `groups` entry. Keep every `data-id` unique, since progress is keyed by it.

## Connect a device

1. Create a fine-grained token at https://github.com/settings/personal-access-tokens/new
   - Repository access: only `road-to-shipping`
   - Permissions: **Contents** and **Pull requests**, both Read and write
2. Open the site → menu (⋯) → **Connect this device** → paste it.

The token stays in that browser. Viewing the site or someone's progress needs no token.

## Run it locally

```
python -m http.server 8000
```
then open http://localhost:8000. Opening `index.html` straight from disk won't work, because the page loads its content files.

## First-time setup

`setup.ps1` creates the repo, turns on Pages and Actions permissions, adds the label, and deploys. See the top of the file for how to run it.
