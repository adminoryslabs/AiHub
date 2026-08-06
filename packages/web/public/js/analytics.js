// AI Hub Analytics — lightweight beacon snippet
// Target: <2KB gzipped, zero dependencies, graceful degradation
(function () {
  var VALID_LANGS = ['es', 'en'];
  var lastTrackedPath = null;

  // El contexto se deriva de location en el momento del envío, no de los
  // data-attrs del <html>: esos los calcula un script inline una sola vez al
  // cargar y quedan obsoletos en cuanto el App Router navega del lado del cliente.
  function resolveContext() {
    var path = window.location.pathname;
    var parts = path.split('/').filter(Boolean);
    // La raíz "/" es la home real (no redirige) y se contabiliza como español.
    // Un primer segmento que no sea idioma (/admin, /_next) no es contenido público.
    var lang = 'es';
    if (parts.length > 0) {
      lang = VALID_LANGS.indexOf(parts[0]) !== -1 ? parts[0] : null;
    }
    // Las rutas de contenido son /{lang}/{categoria}/{slug}; con menos de tres
    // segmentos estamos en un listado o en la home y no hay slug de artículo.
    var slug = parts.length >= 3 ? parts[parts.length - 1] : null;
    return { path: path, lang: lang, slug: slug };
  }

  function resolveReferrer() {
    var referrer = document.referrer || null;
    var params = new URLSearchParams(window.location.search);
    var utmSource = params.get('utm_source');
    var utmMedium = params.get('utm_medium');
    if (utmSource) {
      referrer = utmSource + (utmMedium ? '/' + utmMedium : '');
    }
    return referrer;
  }

  function resolveDeviceType() {
    var ua = navigator.userAgent || '';
    var touchPoints = navigator.maxTouchPoints || 0;
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
      return 'mobile';
    }
    if (/Tablet|iPad/i.test(ua) || (touchPoints > 0 && /Macintosh/i.test(ua))) {
      return 'tablet';
    }
    return 'desktop';
  }

  function send(context) {
    var payload = {
      event_type: 'page_view',
      slug: context.slug,
      lang: context.lang,
      referrer: resolveReferrer(),
      device_type: resolveDeviceType(),
    };

    var endpoint = (window.__AIHUB_API_URL__ || '') + '/api/v1/analytics/events';
    if (navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {});
    }
  }

  function track() {
    try {
      var context = resolveContext();

      // Rutas sin idioma válido (/admin, /_next, assets) no son contenido
      // público. La API rechazaría el payload con 400 y el evento se perdería
      // igual, así que ni lo emitimos.
      if (!context.lang) return;

      // El App Router puede emitir varios eventos de history por una sola
      // navegación; sin esto una visita contaría dos o tres veces.
      if (context.path === lastTrackedPath) return;
      lastTrackedPath = context.path;

      // Se mantienen los data-attrs sincronizados para cualquier otro consumidor.
      document.documentElement.dataset.route = context.path;
      document.documentElement.dataset.lang = context.lang;
      if (context.slug) {
        document.documentElement.dataset.slug = context.slug;
      } else {
        delete document.documentElement.dataset.slug;
      }

      send(context);
    } catch (e) {
      // Silent failure — no console output, no retry
    }
  }

  // Next.js navega con history.pushState/replaceState sin recargar la página,
  // y ninguno de los dos dispara un evento nativo: hay que interceptarlos.
  function instrumentHistory() {
    var original = {
      pushState: history.pushState,
      replaceState: history.replaceState,
    };

    ['pushState', 'replaceState'].forEach(function (method) {
      history[method] = function () {
        var result = original[method].apply(this, arguments);
        // La URL recién queda actualizada tras aplicar el método original.
        track();
        return result;
      };
    });

    window.addEventListener('popstate', track);
  }

  try {
    instrumentHistory();
  } catch (e) {
    // Si la instrumentación falla, al menos se registra la carga inicial.
  }

  track();
})();
