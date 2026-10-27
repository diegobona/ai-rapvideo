import { SITE_ORIGIN } from './site'

/** Public site-specific script URL; this is never a Plausible API key. */
export const plausibleAnalyticsConfig = {
  scriptUrl: import.meta.env.VITE_PLAUSIBLE_SCRIPT_URL || '',
} as const

export const PLAUSIBLE_SCRIPT_ID = 'ai-rapvideo-plausible'
const SCRIPT_URL_PATTERN = /^https:\/\/plausible\.io\/js\/pa-[A-Za-z0-9_-]+\.js$/
const PRODUCTION_ORIGINS = [SITE_ORIGIN, 'https://www.ai-rapvideo.co']

export function getPlausibleScriptUrl(): string | undefined {
  const { scriptUrl } = plausibleAnalyticsConfig
  return SCRIPT_URL_PATTERN.test(scriptUrl) ? scriptUrl : undefined
}

/**
 * Self-contained browser source rendered in the initial HTML head. Keep every
 * runtime dependency inside this string; no module closures or toString().
 */
export const plausibleAnalyticsBootstrap = `(function () {
  try {
    var origins = ${JSON.stringify(PRODUCTION_ORIGINS)};
    if (origins.indexOf(window.location.origin) === -1 || window.__aiRapVideoPlausibleInitialized) return;
    var initScript = document.getElementById('ai-rapvideo-plausible-init');
    window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
    plausible.init({
      fileDownloads: false,
      formSubmissions: false,
      outboundLinks: false,
      transformRequest: function (payload) {
        // The official installation checker needs this diagnostic event.
        if (payload.n !== 'pageview' && payload.n !== 'verification-agent-test') return null;
        try {
          var url = new URL(payload.u);
          if (origins.indexOf(url.origin) === -1) return null;
          var attribution = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source'];
          Array.from(url.searchParams.keys()).forEach(function (key) {
            if (attribution.indexOf(key) === -1) url.searchParams.delete(key);
          });
          url.hash = '';
          var sanitized = Object.assign({}, payload, { u: url.href, r: null });
          if (payload.r) {
            try {
              var referrer = new URL(payload.r);
              if (referrer.protocol === 'http:' || referrer.protocol === 'https:') sanitized.r = referrer.origin;
            } catch (_) {}
          }
          delete sanitized.p;
          delete sanitized.m;
          delete sanitized.$;
          if (initScript && payload.n === 'pageview') initScript.setAttribute('data-pageview', 'prepared');
          return sanitized;
        } catch (_) { return null; }
      }
    });
    window.__aiRapVideoPlausibleInitialized = true;
    if (initScript) initScript.setAttribute('data-bootstrap', 'ready');
  } catch (_) {}
})();`
