/* Loads content/*.html in manifest order, brings progress up to date,
   then starts js/app.js. */
(function () {
  'use strict';
  var RTS = window.RTS;
  var main = document.getElementById('content');
  var loading = document.getElementById('content-loading');

  var view = new URLSearchParams(location.search).get('user');
  var me = RTS.login();
  if (view && me && view.toLowerCase() === me.toLowerCase()) view = null;
  if (view) {
    RTS.viewing = view;
    window.RTS_KEY = 'roadmap_v3:view:' + view.toLowerCase();
    document.body.classList.add('viewing');
  }

  function getText(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' (' + r.status + ')');
      return r.text();
    });
  }

  Promise.all([getText('content/manifest.json').then(JSON.parse), RTS.loadConfig()])
    .then(function (res) {
      var man = res[0];
      window.RTS_GROUPS = man.groups;
      return Promise.all(man.files.map(function (f) {
        return getText('content/' + f).then(function (t) { return [f, t]; });
      }));
    })
    .then(function (parts) {
      parts.forEach(function (p) {
        var tpl = document.createElement('template');
        tpl.innerHTML = p[1];
        Array.prototype.forEach.call(tpl.content.children, function (el) { el.setAttribute('data-src', p[0]); });
        main.appendChild(tpl.content);
      });
      if (loading) loading.remove();
      return RTS.pullBeforeStart();
    })
    .then(function () {
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'js/app.js';
        s.onload = resolve;
        s.onerror = function () { reject(new Error('js/app.js')); };
        document.body.appendChild(s);
      });
    })
    .then(function () { RTS.start(); })
    .catch(function (err) {
      var msg = location.protocol === 'file:'
        ? 'This page loads its content files, which browsers block when you open it straight from disk. Use the GitHub Pages link, or run <code>python -m http.server</code> in this folder and open http://localhost:8000.'
        : 'Could not load ' + err.message + '. Check your connection and refresh.';
      if (loading) loading.innerHTML = msg; else main.insertAdjacentHTML('afterbegin', '<div class="content-loading">' + msg + '</div>');
    });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
