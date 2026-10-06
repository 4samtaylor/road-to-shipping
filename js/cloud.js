/* ─────────────────────────────────────────────────────────────
   Your account: sign-in + progress sync (Supabase).

   Every change is saved on the device first, then sent to your
   account. Each field (one task, one note, the scratchpad…) carries
   its own timestamp, and the newest change wins, so two devices can
   both be used offline and still agree afterwards.

   Tables: progress (tasks + checkpoints), notes, skills (cheat-sheet
   levels), user_state (scratchpad, session log, time per phase).
   See supabase/setup.sql.
   Sign-in is email + password. Google can be switched on later
   with "googleSignIn": true in content/config.json.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var STATE_KEYS = ['_scratch', '_log', '_logDay', '_closed'];   // → user_state rows
  var PUSH_DELAY = 1500, PULL_THROTTLE = 20000, NET_TIMEOUT = 6000;
  var C = window.RTS_CLOUD = { ready: false };
  var sb = null, user = null;
  var pushTimer = null, pushing = false, again = false, lastPull = 0, offline = false;

  /* ─── storage helpers ─── */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function J(x) { return JSON.stringify(x === undefined ? null : x); }
  function stateKey() { return 'roadmap_v3'; }
  function uk(name) { return 'rts_' + name + ':' + (user ? user.id : 'none'); }   // per-account bookkeeping
  function timeout(p, ms) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })]);
  }

  /* ─── state ⇄ fields ───
     p:<item>  task/checkpoint done        → progress
     n:<item>  note text                   → notes
     k:<id>    skill level 0–2             → skills
     s:<key>   scratchpad, log, …          → user_state
     s:_time:<phase>  seconds on a phase   → user_state                */
  function flatten(s) {
    var f = {};
    Object.keys(s || {}).forEach(function (k) {
      if (k.charAt(0) !== '_' && typeof s[k] === 'boolean') f['p:' + k] = s[k];
    });
    Object.keys((s && s._notes) || {}).forEach(function (id) { f['n:' + id] = s._notes[id]; });
    STATE_KEYS.forEach(function (k) { if (s && s[k] !== undefined) f['s:' + k] = s[k]; });
    Object.keys((s && s._skills) || {}).forEach(function (id) { f['k:' + id] = +s._skills[id] || 0; });
    Object.keys((s && s._time) || {}).forEach(function (p) { f['s:_time:' + p] = Math.round(+s._time[p] || 0); });
    return f;
  }
  function applyField(s, field, value) {
    var kind = field.slice(0, 2), id = field.slice(2);
    if (kind === 'p:') { if (value) s[id] = true; else delete s[id]; }
    else if (kind === 'n:') { s._notes = s._notes || {}; if (value) s._notes[id] = value; else delete s._notes[id]; }
    else if (kind === 'k:') { s._skills = s._skills || {}; s._skills[id] = +value || 0; }
    else if (kind === 's:' && id.indexOf('_time:') === 0) {
      s._time = s._time || {};
      // never move a phase's time backwards because another device saw less of it
      s._time[id.slice(6)] = Math.max(+value || 0, +s._time[id.slice(6)] || 0);
    }
    else if (kind === 's:') { if (value === null || value === undefined) delete s[id]; else s[id] = value; }
  }
  function rowToField(table, r) {
    if (table === 'progress') return ['p:' + r.item_id, !!r.done];
    if (table === 'notes') return ['n:' + r.item_id, r.body || ''];
    if (table === 'skills') return ['k:' + r.skill_id, r.level];
    return ['s:' + r.key, r.value];
  }
  function fieldToRow(field, value, ts) {
    var kind = field.slice(0, 2), id = field.slice(2), at = new Date(ts).toISOString();
    if (kind === 'p:') return ['progress', { user_id: user.id, item_id: id, done: !!value, updated_at: at }];
    if (kind === 'n:') return ['notes', { user_id: user.id, item_id: id, body: value || '', updated_at: at }];
    if (kind === 'k:') return ['skills', { user_id: user.id, skill_id: id, level: +value || 0, updated_at: at }];
    return ['user_state', { user_id: user.id, key: id, value: value === undefined ? null : value, updated_at: at }];
  }

  /* ─── status pill ─── */
  function status(text, cls) {
    var el = document.getElementById('tb-sync');
    if (el) { el.textContent = text; el.className = 'tb-sync' + (cls ? ' ' + cls : ''); }
  }
  function idleStatus() {
    if (!sb) status('', '');
    else if (!user) status('this device only · sign in', '');
    else if (offline) status('offline · saved here', 'err');
    else if ((lsGet(uk('outbox'), [])).length) status('saving…', '');
    else status('● synced', 'ok');
  }

  /* ─── setup ─── */
  C.init = function (config) {
    C._recovery = /type=recovery/.test(location.hash);
    C._google = !!config.googleSignIn;
    if (!config.supabaseUrl || !config.supabaseKey || !window.supabase) return Promise.resolve();
    sb = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'rts-auth' }
    });
    C.client = sb;
    return timeout(sb.auth.getSession(), NET_TIMEOUT).then(function (r) {
      user = r && r.data && r.data.session ? r.data.session.user : null;
    }).catch(function () { user = null; }).then(function () {
      C.ready = true;
      sb.auth.onAuthStateChange(function (event, session) {
        var was = user && user.id;
        user = session ? session.user : null;
        if (event === 'PASSWORD_RECOVERY') { C._recovery = true; return; }
        if (event === 'SIGNED_IN' && (!was || was !== user.id) && !C._recovery) location.reload();   // start clean as the new account
        if (event === 'SIGNED_OUT' && was) location.reload();
      });
    });
  };

  /* ─── before the app starts: bring local state up to date ─── */
  C.pullBeforeStart = function () {
    if (!sb || !user) return Promise.resolve();
    var local = lsGet(stateKey(), {}) || {};
    return timeout(fetchAll(), NET_TIMEOUT).then(function (rows) {
      var first = lsGet(uk('snap'), null) === null;
      var next = merge(local, rows, first);
      lsSet(stateKey(), next);
      offline = false;
    }).catch(function () {
      offline = true;
      if (lsGet(uk('snap'), null) === null) adoptLocalAsChanges(local);
    });
  };

  function fetchAll() {
    return Promise.all(['progress', 'notes', 'skills', 'user_state'].map(function (t) {
      var cols = { progress: 'item_id,done,updated_at', notes: 'item_id,body,updated_at', skills: 'skill_id,level,updated_at', user_state: 'key,value,updated_at' }[t];
      return sb.from(t).select(cols).then(function (r) {
        if (r.error) throw r.error;
        return r.data.map(function (row) { var f = rowToField(t, row); return { field: f[0], value: f[1], ts: Date.parse(row.updated_at) }; });
      });
    })).then(function (lists) { return [].concat.apply([], lists); });
  }

  // Combine server rows into a local state object and return the result.
  // first = this device has never synced this account: the server wins
  // where it has a value, and anything only this device has gets uploaded.
  function merge(local, rows, first) {
    var s = JSON.parse(JSON.stringify(local || {}));
    var snap = lsGet(uk('snap'), {}) || {}, meta = lsGet(uk('meta'), {}) || {}, outbox = lsGet(uk('outbox'), []);
    var pending = {}; outbox.forEach(function (f) { pending[f] = 1; });
    var onServer = {};
    rows.forEach(function (r) {
      onServer[r.field] = 1;
      if (!first && pending[r.field] && (meta[r.field] || 0) > r.ts) return;   // local change is newer
      applyField(s, r.field, r.value);
      snap[r.field] = r.value; meta[r.field] = r.ts;
      if (pending[r.field]) { delete pending[r.field]; }
    });
    if (first) {
      var lf = flatten(local), now = Date.now();
      Object.keys(lf).forEach(function (f) {
        if (onServer[f]) return;
        if (lf[f] === false || lf[f] === '' || lf[f] === null) return;
        snap[f] = lf[f]; meta[f] = now; pending[f] = 1;
      });
    }
    lsSet(uk('snap'), snap); lsSet(uk('meta'), meta); lsSet(uk('outbox'), Object.keys(pending));
    return s;
  }
  function adoptLocalAsChanges(local) {
    var lf = flatten(local), now = Date.now(), meta = {};
    Object.keys(lf).forEach(function (f) { meta[f] = now; });
    lsSet(uk('snap'), lf); lsSet(uk('meta'), meta); lsSet(uk('outbox'), Object.keys(lf));
  }

  /* ─── after a change in the app ─── */
  C.onSave = function (state) {
    if (!sb || !user) { idleStatus(); return; }
    var f = flatten(state), snap = lsGet(uk('snap'), {}) || {}, meta = lsGet(uk('meta'), {}) || {};
    var outbox = lsGet(uk('outbox'), []), set = {}, now = Date.now(), changed = false;
    outbox.forEach(function (x) { set[x] = 1; });
    var all = {}; Object.keys(f).concat(Object.keys(snap)).forEach(function (k) { all[k] = 1; });
    Object.keys(all).forEach(function (k) {
      if (J(f[k]) !== J(snap[k])) { meta[k] = now; set[k] = 1; changed = true; if (f[k] === undefined) delete snap[k]; else snap[k] = f[k]; }
    });
    if (!changed) return;
    lsSet(uk('snap'), snap); lsSet(uk('meta'), meta); lsSet(uk('outbox'), Object.keys(set));
    status('saving…', '');
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, PUSH_DELAY);
  };

  function push() {
    if (!sb || !user) return;
    if (pushing) { again = true; return; }
    var outbox = lsGet(uk('outbox'), []);
    if (!outbox.length) { idleStatus(); return; }
    pushing = true;
    var snap = lsGet(uk('snap'), {}) || {}, meta = lsGet(uk('meta'), {}) || {}, byTable = {}, sentAt = {};
    outbox.forEach(function (f) {
      var r = fieldToRow(f, snap[f], meta[f] || Date.now());
      (byTable[r[0]] = byTable[r[0]] || []).push(r[1]);
      sentAt[f] = meta[f];
    });
    var conflict = { progress: 'user_id,item_id', notes: 'user_id,item_id', skills: 'user_id,skill_id', user_state: 'user_id,key' };
    Promise.all(Object.keys(byTable).map(function (t) {
      return sb.from(t).upsert(byTable[t], { onConflict: conflict[t] }).then(function (r) { if (r.error) throw r.error; });
    })).then(function () {
      var m = lsGet(uk('meta'), {}) || {};
      var left = lsGet(uk('outbox'), []).filter(function (f) { return !(f in sentAt) || m[f] !== sentAt[f]; });
      lsSet(uk('outbox'), left);
      offline = false;
    }).catch(function (e) {
      offline = true;
      if (e && (e.code === '42501' || /JWT|auth/i.test(e.message || ''))) status('sign-in expired · sign in again', 'err');
      else idleStatus();
      pushTimer = setTimeout(push, 20000);
    }).then(function () {
      pushing = false;
      if (again) { again = false; push(); return; }
      if (!offline) idleStatus();
    });
  }

  /* ─── coming back to the app: pick up changes from your other devices ─── */
  function pullNow(force) {
    if (!sb || !user || pushing) return;
    if (!force && Date.now() - lastPull < PULL_THROTTLE) return;
    lastPull = Date.now();
    fetchAll().then(function (rows) {
      var cur = window.RTS_app.getState();
      var next = merge(cur, rows, false);
      if (J(flatten(next)) !== J(flatten(cur))) window.RTS_app.setState(next);
      offline = false;
      if (lsGet(uk('outbox'), []).length) push(); else idleStatus();
    }).catch(function () { offline = true; idleStatus(); });
  }

  /* ─── sign-in panel: email + password ─── */
  var mode = 'signin';   // or 'signup'
  function panel(open) {
    var el = document.getElementById('auth');
    if (!el) return;
    el.classList.toggle('open', open);
    if (open) { setMode('signin'); setTimeout(function () { var i = document.getElementById('auth-email'); if (i) i.focus(); }, 50); }
  }
  function setMode(m) {
    mode = m;
    var up = m === 'signup';
    document.getElementById('auth-title').textContent = up ? 'Create your account' : 'Sign in to sync';
    document.getElementById('auth-submit').textContent = up ? 'Create account' : 'Sign in';
    document.getElementById('auth-mode').textContent = up ? 'Have an account? Sign in' : 'New here? Create an account';
    document.getElementById('auth-pass').setAttribute('autocomplete', up ? 'new-password' : 'current-password');
    document.getElementById('auth-hint').hidden = !up;
    document.getElementById('auth-forgot').hidden = up;
    msg('');
  }
  function msg(t, bad) { var m = document.getElementById('auth-msg'); if (m) { m.textContent = t; m.className = 'auth-msg' + (bad ? ' bad' : ''); } }
  function siteUrl() { return location.origin + location.pathname; }
  function friendly(e) {
    var t = (e && e.message) || 'Something went wrong';
    if (/invalid login credentials/i.test(t)) return 'That email and password don\'t match. Check them, or use Forgot password.';
    if (/already registered|already exists/i.test(t)) return 'There\'s already an account with that email. Sign in instead.';
    if (/signups? not allowed|signup is disabled/i.test(t)) return 'New accounts are turned off for this app.';
    if (/email not confirmed/i.test(t)) return 'This account still needs its email confirmed. Check your inbox.';
    if (/rate limit|too many/i.test(t)) return 'Too many tries. Wait a minute and try again.';
    if (/failed to fetch|network/i.test(t)) return 'Can\'t reach the server. Check your connection.';
    return t;
  }

  function submit(e) {
    e.preventDefault();
    var email = (document.getElementById('auth-email').value || '').trim();
    var pass = document.getElementById('auth-pass').value || '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg('Enter a valid email address', true); return; }
    if (pass.length < 8) { msg('Passwords need at least 8 characters', true); return; }
    var btn = document.getElementById('auth-submit');
    btn.disabled = true;
    msg(mode === 'signup' ? 'Creating your account…' : 'Signing in…');
    var req = mode === 'signup'
      ? sb.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: siteUrl() } })
      : sb.auth.signInWithPassword({ email: email, password: pass });
    req.then(function (r) {
      btn.disabled = false;
      if (r.error) { msg(friendly(r.error), true); return; }
      if (mode === 'signup' && !r.data.session) { msg('Account created. Check your email to confirm it, then sign in here.'); setMode('signin'); return; }
      msg('Signed in. Loading your progress…');
      // onAuthStateChange reloads the page as the signed-in account
    }).catch(function (err) { btn.disabled = false; msg(friendly(err), true); });
  }

  function forgot() {
    var email = (document.getElementById('auth-email').value || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg('Type your email above first, then tap Forgot password', true); return; }
    msg('Sending a reset link…');
    sb.auth.resetPasswordForEmail(email, { redirectTo: siteUrl() }).then(function (r) {
      msg(r.error ? friendly(r.error) : 'Check your email for a reset link. Open it, and you\'ll be asked for a new password.', !!r.error);
    });
  }
  // Arriving from a reset email: ask for the new password once the app is up.
  function finishRecovery() {
    var pass = window.prompt('Choose a new password (at least 8 characters):');
    if (!pass) return;
    if (pass.length < 8) { window.RTS_app.toast('That password is too short. Use Forgot password again.'); return; }
    sb.auth.updateUser({ password: pass }).then(function (r) {
      window.RTS_app.toast(r.error ? 'Could not update the password: ' + r.error.message : 'Password updated. You\'re signed in.');
    });
  }

  function google() {
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: siteUrl() } }).then(function (r) {
      if (r.error) msg(friendly(r.error), true);
    });
  }

  function signOut() {
    if (!window.confirm('Sign out on this device? Your progress stays in your account.')) return;
    lsDel(uk('snap')); lsDel(uk('meta')); lsDel(uk('outbox'));
    sb.auth.signOut();
  }
  function deleteAccount() {
    var typed = window.prompt('This permanently deletes your account and all progress, notes and session history saved in it.\n\nType DELETE to confirm.');
    if (typed !== 'DELETE') return;
    sb.rpc('delete_my_account').then(function (r) {
      if (r.error) { window.RTS_app.toast('Could not delete the account: ' + r.error.message); return; }
      lsDel(uk('snap')); lsDel(uk('meta')); lsDel(uk('outbox')); lsDel(stateKey());
      sb.auth.signOut().then(function () { location.reload(); });
    });
  }
  // One-time: bring in progress saved to GitHub before accounts existed.
  function importGitHub() {
    var gh = window.RTS_GH;
    var name = window.prompt('GitHub name whose old progress file to import:', (gh && gh.cfg && gh.cfg.owner) || '');
    if (!name) return;
    gh.getFile('progress/' + name.toLowerCase() + '.json', null, true).then(function (f) {
      if (!f) { window.RTS_app.toast('No progress file found for ' + name); return; }
      var old = JSON.parse(f.text).state || {}, cur = window.RTS_app.getState(), next = JSON.parse(JSON.stringify(cur)), n = 0;
      Object.keys(old).forEach(function (k) {
        if (k.charAt(0) !== '_' && old[k] === true && !next[k]) { next[k] = true; n++; }
      });
      Object.keys(old._notes || {}).forEach(function (id) { if (old._notes[id] && !(next._notes || {})[id]) { next._notes = next._notes || {}; next._notes[id] = old._notes[id]; n++; } });
      STATE_KEYS.forEach(function (k) { if (old[k] !== undefined && next[k] === undefined) { next[k] = old[k]; n++; } });
      window.RTS_app.setState(next);
      C.onSave(next);
      window.RTS_app.toast(n ? 'Imported ' + n + ' items from GitHub into your account' : 'Nothing new to import, you already have all of it');
    }).catch(function (e) { window.RTS_app.toast('Import failed: ' + e.message); });
  }

  /* ─── wire up once the app is running ─── */
  C.start = function () {
    var $ = function (id) { return document.getElementById(id); };
    var menu = function (id, fn) { var el = $(id); if (el) el.addEventListener('click', function () { var m = $('tb-menu'); if (m) m.classList.remove('open'); fn(); }); };
    var acct = $('m-account');
    if (!sb) {
      if (acct) acct.hidden = true;
      ['m-signout', 'm-delete', 'm-import'].forEach(function (id) { if ($(id)) $(id).hidden = true; });
      return;
    }
    if (user) {
      acct.innerHTML = 'Signed in <span>' + (user.email || 'account') + '</span>';
      acct.style.cursor = 'default';
    } else {
      acct.innerHTML = 'Sign in to sync <span>account</span>';
      menu('m-account', function () { panel(true); });
      ['m-signout', 'm-delete', 'm-import'].forEach(function (id) { if ($(id)) $(id).hidden = true; });
    }
    menu('m-signout', signOut);
    menu('m-delete', deleteAccount);
    menu('m-import', importGitHub);
    $('auth-form').addEventListener('submit', submit);
    $('auth-mode').addEventListener('click', function () { setMode(mode === 'signup' ? 'signin' : 'signup'); });
    $('auth-forgot').addEventListener('click', forgot);
    if (C._google) { $('auth-google').hidden = false; $('auth-google').addEventListener('click', google); }
    $('auth-skip').addEventListener('click', function () { lsSet('rts_auth_skip', 1); panel(false); });
    $('tb-sync').addEventListener('click', function () { if (!user) panel(true); });

    if (!user && !lsGet('rts_auth_skip', 0)) panel(true);
    idleStatus();
    if (user && C._recovery) { history.replaceState(null, '', siteUrl()); setTimeout(finishRecovery, 400); }
    if (user && lsGet(uk('outbox'), []).length) push();

    document.addEventListener('visibilitychange', function () { if (!document.hidden) pullNow(); });
    window.addEventListener('focus', function () { pullNow(); });
    window.addEventListener('online', function () { pullNow(true); });
  };
})();
