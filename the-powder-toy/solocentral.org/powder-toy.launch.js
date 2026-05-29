var _statEl  = document.getElementById('status-text');
var _loader  = document.getElementById('loader');
var _canvas  = document.getElementById('canvas');
var _gameReady = false;
var _loadedMB  = 0;
var _totalMB   = 0;

function setStatus(loadedMB, totalMB) {
  if (totalMB > 0) {
    _statEl.textContent = 'port by aubree.lat | LOADING... ' + loadedMB.toFixed(2) + 'MB/' + totalMB.toFixed(2) + 'MB';
  } else if (loadedMB > 0) {
    _statEl.textContent = 'port by aubree.lat | LOADING... ' + loadedMB.toFixed(2) + 'MB';
  } else {
    _statEl.textContent = 'port by aubree.lat | LOADING...';
  }
}

function dismissLoader() {
  _canvas.style.cssText = 'display:block;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:200;opacity:1;';
  _loader.classList.add('hidden');
}

function onReady() {
  if (_gameReady) return;
  _gameReady = true;
  dismissLoader();
}

(function () {
  var orig = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input.url || String(input));
    if (url.indexOf('.wasm') !== -1) {
      return orig(input, init).then(function (res) {
        if (!res.ok) return res;
        var total  = parseInt(res.headers.get('Content-Length') || '0', 10) || null;
        var loaded = 0;
        _totalMB = total ? total / 1048576 : 0;
        var reader = res.body.getReader();
        var stream = new ReadableStream({
          start: function (ctrl) {
            function pump() {
              reader.read().then(function (r) {
                if (r.done) { ctrl.close(); return; }
                loaded += r.value.byteLength;
                _loadedMB = loaded / 1048576;
                setStatus(_loadedMB, _totalMB);
                ctrl.enqueue(r.value);
                pump();
              }).catch(function (e) { ctrl.error(e); });
            }
            pump();
          }
        });
        return new Response(stream, { headers: res.headers, status: res.status, statusText: res.statusText });
      });
    }
    return orig(input, init);
  };
})();

window.onerror = function (msg) {
  _statEl.textContent = 'ERROR: ' + msg;
};

window.addEventListener('unhandledrejection', function (e) {
  _statEl.textContent = 'ERROR: ' + e.reason;
});

(function () {
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/Solo-Central/webport@main/the-powder-toy/powder.js';
  s.onerror = function () {
    _statEl.textContent = 'ERROR: powder.js failed to load';
  };
  s.onload = function () {
    if (typeof create_powder !== 'function') {
      _statEl.textContent = 'ERROR: create_powder() not found';
      return;
    }

    create_powder({
      canvas: _canvas,
      print:    function () {},
      printErr: function () {},
      setStatus: function (text) { if (!text) onReady(); },
      monitorRunDependencies: function (left) { if (left === 0) onReady(); },
      onRuntimeInitialized: function () { onReady(); }
    }).then(function () {
      onReady();
    }).catch(function (e) {
      _statEl.textContent = 'ERROR: ' + e;
    });
  };
  document.body.appendChild(s);
})();