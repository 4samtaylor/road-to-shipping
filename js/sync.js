/* ─────────────────────────────────────────────────────────────
   GitHub sync for Road to Shipping

   Content  : content/*.html, served by GitHub Pages
   Progress : progress/<login>.json in the same repo, one file per person
   Edits    : edit mode → branch + pull request (label: roadmap-edit)

   A device writes only after it is connected with a fine-grained
   token (this repo only: Contents + Pull requests, read & write).
   Anyone can read progress files because the repo is public.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var API = 'https://api.github.com';
  var LS_TOKEN = 'rts_token', LS_LOGIN = 'rts_login';
  var PUSH_DELAY = 3000, PULL_THROTTLE = 30000, NET_TIMEOUT = 6000;
  // State keys that follow you between devices. Everything else
  // (theme, open phases, scroll, timer, unpublished edits) stays per device.
  var SYNC_KEYS = { _notes: 1, _closed: 1, _log: 1, _logDay: 1, _scratch: 1 };
  var PER_KEY_OBJECTS = { _notes: 1, _closed: 1 };

  var cfg = { owner: '', repo: '', branch: 'main' };
  var RTS = window.RTS = { viewing: null };

  /* ─── small helpers ─── */
  function ls(k, v) {
    try {
      if (arguments.length === 1) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function token() { return ls(LS_TOKEN); }
  function login() { return ls(LS_LOGIN); }
  RTS.login = login;
  RTS.connected = function () { return !!(token() && login()); };
  function stateKey() { return window.RTS_KEY || 'roadmap_v3'; }
  function baseKey() { return 'rts_base:' + (login() || '').toLowerCase(); }
  function J(x) { return JSON.stringify(x === undefined ? null : x); }
  function readLocal() { try { return JSON.parse(ls(stateKey()) || '{}') || {}; } catch (e) { return {}; } }

  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob((b64 || '').replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function withTimeout(p, ms) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })]);
  }

  /* ─── GitHub REST ─── */
  function api(path, opts) {
    opts = opts || {};
    var h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (token() && !opts.anon) h.Authorization = 'Bearer ' + token();
    if (opts.body) h['Content-Type'] = 'application/json';
    return fetch(API + path, {
      method: opts.method || 'GET', headers: h, cache: 'no-store',
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      if (r.status === 404 && opts.allow404) return null;
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (b) {
          var e = new Error((b && b.message) || ('GitHub ' + r.status)); e.status = r.status; throw e;
        });
      }
      return r.status === 204 ? null : r.json();
    });
  }
  function repoPath(p) { return '/repos/' + cfg.owner + '/' + cfg.repo + p; }
  function getFile(path, ref, anon) {
    return api(repoPath('/contents/' + path + '?ref=' + encodeURIComponent(ref || cfg.branch)), { allow404: true, anon: anon })
      .then(function (f) { return f ? { sha: f.sha, text: b64decode(f.content) } : null; });
  }
  function putFile(path, text, sha, message, branch) {
    var body = { message: message, content: b64encode(text), branch: branch || cfg.branch };
    if (sha) body.sha = sha;
    return api(repoPath('/contents/' + path), { method: 'PUT', body: body });
  }

  /* ─── config: content/config.json, or derived from <owner>.github.io/<repo>/ ─── */
  RTS.loadConfig = function () {
    return fetch('content/config.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (c) {
        cfg.owner = c.owner || ''; cfg.repo = c.repo || ''; cfg.branch = c.branch || 'main';
        var m = location.hostname.match(/^([^.]+)\.github\.io$/);
        if (m) {
          cfg.owner = m[1];
          var seg = location.pathname.split('/').filter(Boolean)[0];
          if (seg && !/\.html$/.test(seg)) cfg.repo = seg;
        }
        RTS.cfg = cfg;
        return cfg;
      });
  };

  /* ─── progress: pick, merge ─── */
  function pick(s) {
    var o = {};
    Object.keys(s || {}).forEach(function (k) {
      if (k.charAt(0) !== '_' || SYNC_KEYS[k]) o[k] = s[k];
    });
    return o;
  }
  // remote wins, except keys that changed on this device since the last sync
  function merge(remote, local, base) {
    var out = JSON.parse(J(remote || {}));
    var keys = {};
    Object.keys(local || {}).concat(Object.keys(base || {})).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      if (PER_KEY_OBJECTS[k]) {
        var l = local[k] || {}, b = (base && base[k]) || {}, r = out[k] || {}, sub = {};
        Object.keys(l).concat(Object.keys(b)).forEach(function (n) { sub[n] = 1; });
        Object.keys(sub).forEach(function (n) {
          if (J(l[n]) !== J(b[n])) { if (l[n] === undefined) delete r[n]; else r[n] = l[n]; }
        });
        out[k] = r;
      } else if (J(local[k]) !== J(base ? base[k] : undefined)) {
        if (local[k] === undefined) delete out[k]; else out[k] = local[k];
      }
    });
    return out;
  }
  function sameSet(a, b) { return J(sortKeys(a)) === J(sortKeys(b)); }
  function sortKeys(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return o;
    var r = {}; Object.keys(o).sort().forEach(function (k) { r[k] = sortKeys(o[k]); }); return r;
  }
  function progressPath(user) { return 'progress/' + String(user).toLowerCase() + '.json'; }
  function progressDoc(user, s) {
    return JSON.stringify({ user: user, updated: new Date().toISOString(), state: sortKeys(s) }, null, 2) + '\n';
  }
  function readBase() { try { return JSON.parse(ls(baseKey()) || 'null'); } catch (e) { return null; } }
  function writeBase(s) { ls(baseKey(), JSON.stringify(s)); }

  /* ─── status pill ─── */
  function status(text, cls) {
    var el = document.getElementById('tb-sync');
    if (!el) return;
    el.textContent = text; el.className = 'tb-sync' + (cls ? ' ' + cls : '');
  }

  /* ─── before the app starts: bring this device up to date ─── */
  RTS.pullBeforeStart = function () {
    if (!cfg.owner || !cfg.repo) return Promise.resolve();
    if (RTS.viewing) {
      return withTimeout(getFile(progressPath(RTS.viewing), null, true), NET_TIMEOUT).then(function (f) {
        var s = f ? (JSON.parse(f.text).state || {}) : {};
        ls(stateKey(), JSON.stringify(s));
        RTS._viewFound = !!f;
      }).catch(function () { RTS._viewFound = null; });
    }
    if (!RTS.connected()) return Promise.resolve();
    return withTimeout(getFile(progressPath(login())), NET_TIMEOUT).then(function (f) {
      var local = readLocal();
      var remote = f ? (JSON.parse(f.text).state || {}) : null;
      if (!remote) { RTS._dirty = true; return; }
      var base = readBase();
      // first sync on a device that already has progress: combine instead of overwriting
      if (!base) base = {};
      var merged = merge(remote, pick(local), base);
      Object.keys(pick(local)).forEach(function (k) { if (!(k in merged)) delete local[k]; });
      Object.keys(merged).forEach(function (k) { local[k] = merged[k]; });
      ls(stateKey(), JSON.stringify(local));
      writeBase(remote);
      RTS._dirty = !sameSet(merged, remote);
    }).catch(function () { RTS._offline = true; });
  };

  /* ─── after the app starts ─── */
  var pushTimer = null, pushing = false, again = false, lastPull = 0;

  RTS.onSave = function () {
    if (RTS.viewing) return;
    if (!RTS.connected()) { status('saved on this device', ''); return; }
    clearTimeout(pushTimer);
    status('saving…', '');
    pushTimer = setTimeout(push, PUSH_DELAY);
  };

  function push() {
    if (pushing) { again = true; return Promise.resolve(); }
    pushing = true;
    var path = progressPath(login());
    var attempt = function (n) {
      return getFile(path).then(function (f) {
        var remote = f ? (JSON.parse(f.text).state || {}) : {};
        var local = pick(window.RTS_app.getState());
        var merged = merge(remote, local, readBase() || {});
        if (f && sameSet(merged, remote)) { writeBase(remote); return merged; }
        return putFile(path, progressDoc(login(), merged), f && f.sha, 'progress: ' + login())
          .then(function () { writeBase(merged); return merged; })
          .catch(function (e) { if ((e.status === 409 || e.status === 422) && n < 2) return attempt(n + 1); throw e; });
      });
    };
    return attempt(0).then(function (merged) {
      adoptIfDifferent(merged);
      status('● synced', 'ok');
    }).catch(function (e) {
      status(e.status === 401 || e.status === 403 ? 'token problem' : 'offline · will retry', 'err');
      if (!(e.status === 401 || e.status === 403)) pushTimer = setTimeout(push, 20000);
    }).then(function () {
      pushing = false;
      if (again) { again = false; push(); }
    });
  }

  function adoptIfDifferent(merged) {
    var full = window.RTS_app.getState();
    if (sameSet(pick(full), merged)) return;
    var next = {};
    Object.keys(full).forEach(function (k) { if (k.charAt(0) === '_' && !SYNC_KEYS[k]) next[k] = full[k]; });
    Object.keys(merged).forEach(function (k) { next[k] = merged[k]; });
    window.RTS_app.setState(next);
  }

  // coming back to the tab: pick up changes made on another device
  function pullNow(force) {
    if (!cfg.owner || pushing) return;
    if (!force && Date.now() - lastPull < PULL_THROTTLE) return;
    lastPull = Date.now();
    if (RTS.viewing) {
      getFile(progressPath(RTS.viewing), null, true).then(function (f) {
        if (f) window.RTS_app.setState(JSON.parse(f.text).state || {});
      }).catch(function () {});
      return;
    }
    if (!RTS.connected()) return;
    getFile(progressPath(login())).then(function (f) {
      if (!f) return;
      var remote = JSON.parse(f.text).state || {};
      var merged = merge(remote, pick(window.RTS_app.getState()), readBase() || {});
      writeBase(remote);
      adoptIfDifferent(merged);
      if (!sameSet(merged, remote)) RTS.onSave(); else status('● synced', 'ok');
    }).catch(function () { status('offline', 'err'); });
  }

  /* ─── connect / share / people ─── */
  function connect() {
    var t = window.prompt(
      'Paste a GitHub fine-grained token for ' + cfg.owner + '/' + cfg.repo + '.\n' +
      'Repository access: only this repo. Permissions: Contents and Pull requests set to Read and write.\n' +
      'It is stored in this browser only. Leave empty to disconnect this device.', '');
    if (t === null) return;
    t = t.trim();
    if (!t) { ls(LS_TOKEN, null); ls(LS_LOGIN, null); window.RTS_app.toast('This device is disconnected from GitHub'); status('saved on this device', ''); return; }
    ls(LS_TOKEN, t);
    api('/user').then(function (u) {
      return api(repoPath('')).then(function (r) {
        if (!r.permissions || !r.permissions.push) throw new Error('This token cannot write to ' + cfg.owner + '/' + cfg.repo);
        ls(LS_LOGIN, u.login);
        window.RTS_app.toast('Connected as ' + u.login + '. Reloading to sync…');
        setTimeout(function () { location.reload(); }, 900);
      });
    }).catch(function (e) {
      ls(LS_TOKEN, null); ls(LS_LOGIN, null);
      window.RTS_app.toast('Could not connect: ' + e.message);
    });
  }

  function shareLink() {
    var who = login();
    if (!who) { window.RTS_app.toast('Connect this device first, so the link points at your progress'); return; }
    var url = location.origin + location.pathname + '?user=' + encodeURIComponent(who.toLowerCase());
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
      window.RTS_app.toast('Copied: ' + url);
    }).catch(function () { window.prompt('Copy this link:', url); });
  }

  function loadPeople() {
    var box = document.getElementById('m-people');
    if (!box || !cfg.owner) return;
    api(repoPath('/contents/progress?ref=' + cfg.branch), { allow404: true, anon: !token() }).then(function (list) {
      var me = (login() || '').toLowerCase();
      var names = (list || []).map(function (f) { return f.name; })
        .filter(function (n) { return /\.json$/.test(n); }).map(function (n) { return n.replace(/\.json$/, ''); });
      var html = '';
      if (RTS.viewing) html += '<button class="mi" data-people="">Back to my progress</button>';
      names.forEach(function (n) {
        if (n === me || (RTS.viewing && n === RTS.viewing.toLowerCase())) return;
        html += '<button class="mi" data-people="' + n + '">View ' + n + '\'s progress</button>';
      });
      box.innerHTML = html;
    }).catch(function () {});
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-people]');
      if (!b) return;
      location.search = b.dataset.people ? '?user=' + encodeURIComponent(b.dataset.people) : '';
    });
  }

  /* ─── edit mode → pull request ─── */
  function resolveAnchor(root, key) {
    if (key === 'hero') return root.querySelector('.hero');
    var parts = key.split(':'), sec = root.querySelector('#' + CSS.escape(parts[0]));
    if (!sec) return null;
    var part = parts[1] || '', m = part.match(/^blk(\d+)$/);
    if (part === 'hdr') return sec.querySelector('.phase-header');
    if (part === 'cps') return sec.querySelector('.checkpoint-items');
    if (part === 'steps') return sec.querySelector('.setup-steps');
    if (m) return sec.querySelectorAll('.section-block')[+m[1]] || null;
    return null;
  }

  function publishEdits() {
    if (!RTS.connected()) { window.RTS_app.toast('Connect this device to GitHub first (menu → Connect this device)'); return; }
    var edits = window.RTS_app.edits(), keys = Object.keys(edits);
    if (!keys.length) { window.RTS_app.toast('No edits to publish. Turn on edit mode and change something first'); return; }
    var byFile = {};
    keys.forEach(function (k) {
      var el = document.querySelector('[data-ek="' + k.replace(/"/g, '') + '"]');
      var src = el && el.closest('[data-src]');
      if (src) (byFile[src.dataset.src] = byFile[src.dataset.src] || []).push(k);
    });
    var files = Object.keys(byFile);
    if (!files.length) { window.RTS_app.toast('Could not match your edits to a content file'); return; }
    var who = login(), branch = 'edit/' + who.toLowerCase() + '-' + Date.now();
    window.RTS_app.toast('Publishing ' + keys.length + ' edit' + (keys.length > 1 ? 's' : '') + '…');
    api(repoPath('/git/ref/heads/' + cfg.branch)).then(function (ref) {
      return api(repoPath('/git/refs'), { method: 'POST', body: { ref: 'refs/heads/' + branch, sha: ref.object.sha } });
    }).then(function () {
      return files.reduce(function (p, file) {
        return p.then(function () {
          var path = 'content/' + file;
          return getFile(path, branch).then(function (f) {
            if (!f) throw new Error(path + ' is missing on GitHub');
            var tpl = document.createElement('template');
            tpl.innerHTML = f.text;
            byFile[file].forEach(function (k) {
              var target = resolveAnchor(tpl.content, k);
              if (!target) return;
              target.innerHTML = edits[k];
              target.querySelectorAll('.done').forEach(function (n) { n.classList.remove('done'); });
              target.querySelectorAll('.tn-btn, .tn-wrap, .ptoc, .ph-prog, .ph-est, .em-ctl, .em-add').forEach(function (n) { n.remove(); });
              target.querySelectorAll('[contenteditable]').forEach(function (n) { n.removeAttribute('contenteditable'); });
            });
            var out = tpl.innerHTML.replace(/\s+$/, '') + '\n';
            if (out === f.text) return null;
            return putFile(path, out, f.sha, 'Edit ' + file, branch);
          });
        });
      }, Promise.resolve());
    }).then(function () {
      return api(repoPath('/pulls'), { method: 'POST', body: {
        title: 'Roadmap edit by ' + who + ': ' + files.join(', '),
        head: branch, base: cfg.branch,
        body: 'Published from the roadmap\'s edit mode.\n\nChanged blocks:\n' + keys.map(function (k) { return '- `' + k + '`'; }).join('\n')
      } });
    }).then(function (pr) {
      return api(repoPath('/issues/' + pr.number + '/labels'), { method: 'POST', body: { labels: ['roadmap-edit'] } })
        .catch(function () {}).then(function () { return pr; });
    }).then(function (pr) {
      window.RTS_app.toast('Pull request #' + pr.number + ' opened. Checks run, then it merges and the site updates in about a minute.');
      window.open(pr.html_url, '_blank', 'noopener');
    }).catch(function (e) {
      window.RTS_app.toast('Publishing failed: ' + e.message);
    });
  }

  /* ─── wire up once the app is running ─── */
  RTS.start = function () {
    var on = function (id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', function () { var m = document.getElementById('tb-menu'); if (m) m.classList.remove('open'); fn(); }); };
    on('m-connect', connect);
    on('m-share', shareLink);
    on('m-publish', publishEdits);
    on('em-publish', publishEdits);
    var mc = document.getElementById('m-connect');
    if (mc && RTS.connected()) mc.innerHTML = 'Connected as ' + login() + ' <span>change</span>';
    loadPeople();

    if (RTS.viewing) {
      var b = document.getElementById('view-banner');
      if (b) {
        b.innerHTML = RTS._viewFound === false
          ? 'No progress saved yet for <b>' + RTS.viewing + '</b>. <a href="./">Back to mine</a>'
          : 'Viewing <b>' + RTS.viewing + '</b>\'s progress (read-only). <a href="./">Back to mine</a>';
      }
      status('viewing ' + RTS.viewing, '');
    } else if (!cfg.owner) {
      status('', '');
    } else if (!RTS.connected()) {
      status('saved on this device', '');
    } else if (RTS._offline) {
      status('offline', 'err');
    } else {
      status('● synced', 'ok');
      if (RTS._dirty) RTS.onSave();
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) pullNow(); });
    window.addEventListener('focus', function () { pullNow(); });
    window.addEventListener('online', function () { pullNow(true); });
  };
})();
