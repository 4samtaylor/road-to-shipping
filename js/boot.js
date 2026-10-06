/* Loads content/*.html in manifest order, signs in and brings
   progress up to date, then starts js/app.js. */
(function () {
  'use strict';
  var main = document.getElementById('content');
  var loading = document.getElementById('content-loading');
  var GH = window.RTS_GH, CLOUD = window.RTS_CLOUD;

  // app.js calls RTS.onSave(state) after every save
  window.RTS = { onSave: function (s) { CLOUD.onSave(s); } };

  function getText(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' (' + r.status + ')');
      return r.text();
    });
  }

  Promise.all([getText('content/manifest.json').then(JSON.parse), GH.loadConfig()])
    .then(function (res) {
      var man = res[0], config = res[1] || {};
      window.RTS_GROUPS = man.groups;
      return Promise.all([
        Promise.all(man.files.map(function (f) { return getText('content/' + f).then(function (t) { return [f, t]; }); })),
        CLOUD.init(config)
      ]);
    })
    .then(function (res) {
      res[0].forEach(function (p) {
        var tpl = document.createElement('template');
        tpl.innerHTML = p[1];
        Array.prototype.forEach.call(tpl.content.children, function (el) { el.setAttribute('data-src', p[0]); });
        main.appendChild(tpl.content);
      });
      if (loading) loading.remove();
      return CLOUD.pullBeforeStart();
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
    .then(function () { GH.start(); CLOUD.start(); })
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
