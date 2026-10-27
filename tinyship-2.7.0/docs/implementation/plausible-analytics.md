# Plausible analytics

The TanStack Start app emits the official Plausible bootstrap and one async tracker directly in the initial server-rendered `<head>`, alongside the existing PostHog integration. Server request-origin checks allow only `https://ai-rapvideo.co` and `https://www.ai-rapvideo.co`; localhost, `workers.dev`, preview domains and unknown origins are excluded. No packages, server bindings, payment configuration or generation behavior are added.

## Configuration

Set the optional public build-time variable `VITE_PLAUSIBLE_SCRIPT_URL` to this website's script URL. Vite reads the monorepo root environment because `envDir` points there. The example in `env.example` leaves it empty, which disables Plausible.

Site: `ai-rapvideo.co`.

Script: `https://plausible.io/js/pa-uooNa9jT2d-mmvsYz4rSD.js`, provided by the user from this site's Plausible installation page on 2026-10-27. The complete original snippet uses the standard queue/init bootstrap implemented by the adapter.

The actual public value is saved in the ignored monorepo-root `.env.production.local`, which Vite loads for production builds. The existing PostHog public configuration is retained.

Copy the URL from this site's Plausible **Settings → General → Tracking → Site installation** screen. It must match `https://plausible.io/js/pa-[A-Za-z0-9_-]+.js` exactly; query strings, fragments, alternative hosts and other scripts are rejected. The URL is public and is not a Plausible API key. Changes require rebuilding and redeploying the client bundle; setting a runtime Worker secret alone does not configure it.

## Behavior and privacy

`src/components/plausible-analytics.tsx` renders once inside `RootDocument`'s head in `src/routes/__root.tsx`. `src/lib/feature-flags.ts` supplies the server-resolved origin gate. `src/lib/plausible-analytics.ts` supplies a self-contained inline official queue/init bootstrap and validates the async script URL. Analytics no longer depends on React hydration to insert its script. The bootstrap prevents duplicate initialization. Missing configuration, an invalid URL, blocked scripts or loading errors must not interrupt rendering. The inline tag's `data-bootstrap="ready"` and `data-pageview="prepared"` attributes provide DOM-only evidence of actual browser execution without recording extra events or input values.

Plausible automatically captures the initial pageview and History API navigation, together with its standard page engagement metrics (time and scroll depth). There is no router listener or manual pageview call, which would duplicate those events. The official `transformRequest` hook removes unrelated query values and URL fragments before transmission, retaining only recognized attribution parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `ref`, `source`). Referrers are reduced to their HTTP(S) origin. This preserves the existing privacy commitment; Plausible's default query filtering affects stored/reported URLs and does not redact the request URL in the browser. Engagement requests reuse the sanitized pageview URL.

The initializer explicitly disables `fileDownloads`, `formSubmissions` and `outboundLinks`, regardless of the site's dashboard defaults. Hash routing is not enabled. The request hook permits normal pageviews plus the official `verification-agent-test` diagnostic event, rejecting all other custom events and removing custom properties, metadata and revenue fields. The official installation verifier calls this named diagnostic event and requires its request/callback; filtering it out causes the generic "couldn't detect" failure even when normal pageviews are prepared correctly. Verification test traffic is excluded from dashboard counts. The integration never identifies visitors or passes uploaded photos, filenames, rap topics, prompts, media links, account information or input values to analytics. Plausible does not use analytics cookies or persistent browser identifiers. The privacy policy names both analytics services and separately describes the local IndexedDB creator draft.

## Verification

**Official verification passed on 2026-10-27:** version `7e2972ce-082d-4eed-a26d-5001b312761b` fixes the accidentally rejected `verification-agent-test` request. The previously deployed SSR-head reliability update is retained. In the user's existing Edge session, Plausible now displays **"Tracking is active on your site"** and **"Your dashboard is ready. Data will appear here as soon as visitors start arriving."** Screenshot: `D:/Asideproject/！Overseas网站项目/ai-rapvideo/.tmp/plausible-installation-success.png`. Only the official verification flow was triggered; its diagnostic traffic is not counted as visitors. The dashboard was still at zero, so no historical or real-user visit count is claimed. Typecheck, production build and deployment dry run passed.

Published on 2026-10-27 to the existing `ai-rapvideo` Worker, version `8c0e4a8d-b641-4f97-a5de-ea422f0497f9`. TypeScript checking, the production build and Wrangler deployment dry run passed. Read-only checks confirmed that the official account script responds successfully, identifies `ai-rapvideo.co`, and the live homepage references the new client bundle containing the exact configured script URL and singleton guard. No synthetic analytics events, payment sessions or video generations were submitted. Browser receipt of a pageview and Plausible's installation-check result have not been confirmed through the dashboard.

Before release, run TanStack type checking and a production build with the real script URL. On `https://ai-rapvideo.co`, use Plausible's installation check to confirm the site-specific script loads and pageviews reach the dashboard. An unset URL or a non-production origin must produce no Plausible script request. Confirm one script element after remounts and one automatic pageview per initial visit or History API navigation. Forms, downloads and video actions must not emit events. No generation or payment test is required for this integration.

References: [tracking script installation](https://plausible.io/docs/plausible-script), [initialization and optional measurements](https://plausible.io/docs/script-extensions), [official bootstrap snippet](https://plausible.io/docs/proxy/guides/fresh), [request URL transformation](https://plausible.io/docs/custom-locations), [data policy](https://plausible.io/data-policy), [tracker request source](https://github.com/plausible/analytics/blob/master/tracker/src/track.js), [engagement source](https://github.com/plausible/analytics/blob/master/tracker/src/engagement.js).

Installation diagnosis source: [official verifier diagnostic event](https://github.com/plausible/analytics/blob/master/tracker/installation_support/verifier.js#L255).
