/* ─────────────────────────────────────────────────────────────
   GitHub, for publishing content edits only.

   Edit mode → branch + pull request (label: roadmap-edit). Needs a
   fine-grained token on the device you edit from (this repo only:
   Contents + Pull requests, read & write). Progress no longer goes
   to GitHub; js/cloud.js keeps it in your account.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var API = 'https://api.github.com';
  var LS_TOKEN = 'rts_token', LS_LOGIN = 'rts_login';

  var cfg = { owner: '', repo: '', branch: 'main' };
  var GH = window.RTS_GH = {};

  /* ─── small helpers ─── */
  function ls(k, v) {
    try {
      if (arguments.length === 1) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function token() { return ls(LS_TOKEN); }
  function login() { return ls(LS_LOGIN); }
  GH.login = login;
  GH.connected = function () { return !!(token() && login()); };

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
  GH.loadConfig = function () {
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
        GH.cfg = cfg;
        return c;
      });
  };

  function connect() {
    var t = window.prompt(
      'Only needed for publishing edits. Paste a GitHub fine-grained token for ' + cfg.owner + '/' + cfg.repo + '.\n' +
      'Repository access: only this repo. Permissions: Contents and Pull requests set to Read and write.\n' +
      'It is stored in this browser only. Leave empty to disconnect this device.', '');
    if (t === null) return;
    t = t.trim();
    if (!t) { ls(LS_TOKEN, null); ls(LS_LOGIN, null); window.RTS_app.toast('This device is disconnected from GitHub'); return; }
    ls(LS_TOKEN, t);
    api('/user').then(function (u) {
      return api(repoPath('')).then(function (r) {
        if (!r.permissions || !r.permissions.push) throw new Error('This token cannot write to ' + cfg.owner + '/' + cfg.repo);
        ls(LS_LOGIN, u.login);
        window.RTS_app.toast('GitHub connected as ' + u.login + '. You can publish edits from this device.');
        var mc = document.getElementById('m-connect'); if (mc) mc.innerHTML = 'GitHub: ' + u.login + ' <span>change</span>';
      });
    }).catch(function (e) {
      ls(LS_TOKEN, null); ls(LS_LOGIN, null);
      window.RTS_app.toast('Could not connect: ' + e.message);
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
    if (!GH.connected()) { window.RTS_app.toast('Connect this device to GitHub first (menu → Connect GitHub)'); return; }
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

  GH.start = function () {
    var on = function (id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', function () { var m = document.getElementById('tb-menu'); if (m) m.classList.remove('open'); fn(); }); };
    on('m-connect', connect);
    on('m-publish', publishEdits);
    on('em-publish', publishEdits);
    var mc = document.getElementById('m-connect');
    if (mc && GH.connected()) mc.innerHTML = 'GitHub: ' + login() + ' <span>change</span>';
  };
  GH.getFile = getFile;
})();
