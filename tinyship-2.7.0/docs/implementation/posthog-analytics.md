# PostHog analytics

TanStack Start site only, using the official `posthog-js` SDK. The production website is `https://ai-rapvideo.co`; localhost and preview hostnames do not send analytics. No new routes, database tables or payment configuration are needed.

## Configuration

Vite reads the monorepo root `.env.production`, because this app sets `envDir` to the root. Public values are `VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST=https://us.i.posthog.com`. The token is a public project token, not a personal API key. The example is `apps/tanstack-app/.env.analytics.example`. Keep server secrets in the existing, ignored app `.env.production.local`; do not move them into Vite-prefixed variables.

`src/components/site-analytics.tsx` initializes once after hydration. `src/lib/analytics.ts` dynamically imports the SDK and preserves referrer and UTM information. Only a page-load visit is captured by this PostHog integration, with no History API navigation tracking. The optional [Plausible integration](./plausible-analytics.md) is configured separately and keeps PostHog in place.

## Events and interpretation

| Event | Trigger |
| --- | --- |
| `$pageview` | A page-load visit with referring domain and campaign tags |

No generation, upload, preview, download or click events are recorded. Browser identifiers allow approximate unique-visitor counts across page loads. These are browser-side measurements: blocked scripts and network failures can prevent counting. Analytics errors cannot block the website.

## Dashboard

In PostHog, use **Web Analytics → Channels → AI**, then inspect individual referrers and the Visitors metric. PostHog groups known AI referrers automatically. The user requested source counts only: no conversion goals, behavioral funnels or session recordings are configured. Referrer and UTM information must be present to attribute a visit; missing information remains direct/unknown. Do not label untagged visits as AI. The dashboard includes basic visits from all sources; the AI filter isolates the requested visitor counts.

The owner selected the free plan. This implementation does not add a payment card, enable billing, or subscribe to additional products. Account usage and plan limits remain managed in PostHog.

## Data scope

Session replay, autocapture, person profiles, feature flags, surveys, performance capture and automatic exception capture are disabled. The no-external SDK entry prevents loading recording/toolbar plugins. The SDK uses anonymous local-storage identifiers; the app does not identify analytics visitors with its anonymous authentication user IDs.

Only page-load visit events are allowed. Page URLs retain recognized campaign parameters but drop unrelated query parameters and fragments. Referrers are reduced to their origins. Uploaded photos, filenames, prompts and media URLs are not sent as analytics properties. The public privacy policy describes this processing and the US-hosted service.

## Validation

`tests/e2e/specs/analytics.spec.ts` runs the actual SDK on a production-origin browser context. Local builds are proxied through Playwright interception and analytics ingestion is mocked. It checks AI referrer/UTM preservation, stable anonymous visitor identity, absence of click/navigation events, and removal of private query values. PostHog intentionally ignores WebDriver browsers; this test simulates an ordinary human browser only on our own site. This creates no provider job and does not pollute live analytics.

References: [TanStack Start integration](https://posthog.com/docs/libraries/tanstack-start), [SDK configuration](https://posthog.com/docs/libraries/js/config), [channels](https://posthog.com/docs/web-analytics/dashboard), [free allowance](https://posthog.com/pricing).
