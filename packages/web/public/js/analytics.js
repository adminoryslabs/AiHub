// AI Hub Analytics — lightweight beacon snippet
// Target: <2KB gzipped, zero dependencies, graceful degradation
(function () {
  try {
    var doc = document.documentElement;
    var lang = doc.dataset.lang || 'es';
    var slug = doc.dataset.slug || null;
    var route = doc.dataset.route || window.location.pathname;

    // Referrer: document.referrer + UTM params
    var referrer = document.referrer || null;
    var params = new URLSearchParams(window.location.search);
    var utmSource = params.get('utm_source');
    var utmMedium = params.get('utm_medium');
    if (utmSource) {
      referrer = utmSource + (utmMedium ? '/' + utmMedium : '');
    }

    // Device type heuristic
    var ua = navigator.userAgent || '';
    var touchPoints = navigator.maxTouchPoints || 0;
    var deviceType = 'desktop';
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(ua) || (touchPoints > 0 && /Macintosh/i.test(ua))) {
      deviceType = 'tablet';
    }

    // Build payload
    var payload = {
      event_type: 'page_view',
      slug: slug,
      lang: lang,
      referrer: referrer,
      device_type: deviceType,
    };

    // Fire-and-forget POST
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
  } catch (e) {
    // Silent failure — no console output, no retry
  }
})();
