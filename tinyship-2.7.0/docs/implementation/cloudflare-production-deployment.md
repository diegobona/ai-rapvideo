# Cloudflare production deployment

## Fixed original scene and removed scene upload — 2026-10-20

Published Worker `d77eba43-f446-4df0-b43b-ecb00c0c4978` with `--keep-vars`. New Compshare orders use the fixed server-owned source video and one/two identity images; user-selected scenes and default scene-image/princess references no longer enter new requests. The shared maker removes scene upload/change/reset and never restores or resubmits historical scene images. Facial-expression notes and the playful tag remain; camera/film-grain tags are filtered from new drafts. Legacy paid jobs still use their frozen prompts/media. No price, migration, Stripe or provider change, and no paid test submission.

311 AI/payment tests, typecheck, build and dry run pass. The source video returns 200 with the expected 1,955,214 bytes. Live HTTP checks on all three maker routes return 200, exactly two character inputs, no scene controls, the fixed-scene hint and $4.99 price. Four live browser regressions pass with mutations mocked, covering fresh two-character checkout, stale historical scenes, checkout return/input retention and expression locks. Desktop1440/mobile390 have no scene controls or overflow. Evidence: `test-results/fixed-scene-{unit,typecheck,build,dryrun,deploy,browser}.log`, `fixed-scene-live.json`, `fixed-scene-live-ui.json`; details and model limits: [fixed original-video scene](./fixed-original-scene.md).

## Dynamic facial-performance prompt — 2026-10-20

Published Worker version `9179d418-a76a-47e8-b4c8-054ec05f7e26`. New orders explicitly distinguish photo identity from dynamic expression, request natural facial muscles/blinks/gaze and head/light/occlusion integration, and exclude pasted static masks. The active mode remains three-image generation with written performance; the retained video prompt also requests source expression timing. No generation-mode, UI, Stripe or configuration change. Existing paid prompts remain frozen. All 313 AI/payment tests, typecheck, build, dry run and deployment pass. Live homepage returns 200 and keeps the hidden prompt absent from HTML/client JavaScript. No paid generation was submitted, so this is verified prompt delivery, not proof of improved facial realism. See [identity and performance evidence](./dance-reference-continuity.md).

## Image-priority dance generation — 2026-10-20

Published Worker version `547c832c-6858-492c-a91e-5eed94ef582d`. The user approved prioritizing uploaded identities and scene with approximate dance movement. New Compshare orders now send only three reference images and hidden written choreography; configured/client video overrides do not add a source video. Historical paid orders retain their frozen prompts and references. Price, UI, Stripe, provider and bindings remain intact; no migration. Remote configuration was preserved with `--keep-vars`.

310 AI/payment tests, typecheck, build and final dry run pass. Two live browser regressions verified creator-input retention and scene/text/tag checkout using mocked mutations. Real image-priority output keeps the uploaded adult dancer through the clip, uses the selected lobby in main shots, applies the outfit/flower description and ends in moving footage. Early straw/duplicate-person artifacts remain; final template wording removes default scene cues and explicitly limits character instances, without a further paid visual retest. No additional Stripe charge or customer-order mutation. Live homepage returns 200 and keeps the hidden prompt out of HTML. Evidence and limitations: [Dance identity and scene continuity](./dance-reference-continuity.md), `test-results/image-priority-deploy.log`, `test-results/image-priority-live.json`.

Deployed on October 15, 2026. The public website is https://rumpelstiltskin-ai.co/.

Latest Worker version: `a9c09314-ca2c-4bfa-9ef9-a876d06fe7ae` (Compshare Workers request compatibility and thirty-minute paid polling, October 20). See [runtime incident and restored production order](./compshare-workers-runtime.md) and [earlier rejection/refund visibility](./blocked-video-refunds.md). Historical deployment records follow below.

Maker input retention: restore the owner's dancer/princess/scene previews, original description, tags and format on Stripe return/reload, while keeping active inputs locked and visible. Existing uploaded URLs can be reused for another purchase after completion. New orders save normalized creator metadata in existing JSON; historical templates recover only bounded creator fields without exposing the compiled prompt. Removed the default result-area still and added a two-minute processing reassurance. No provider, Stripe, schema, retention or resource-binding changes. 309 AI/payment tests, 22 existing browser checks plus the new combined scenario, typecheck/build and dry run pass. Deployed with `--keep-vars`. Details: [maker input retention](./maker-input-retention.md). Evidence: `test-results/retain-maker-inputs-deploy.log`.

Identity prompt correction: the hidden motion-reference template now explicitly maps the source male dancer to uploaded image one, the seated watching woman to image two, and the setting to image three. Subject labels and per-shot replacement rules prevent the prompt from treating the source actors as the target cast. The same Compshare endpoint and Context-IR setting are retained, along with the UI, $4.99/10-second settings and saved-order behavior. A clear-image/explicit-prompt five-second experiment visibly replaced the black-suited source performer with the reference's curly-haired green-coated adult, including close-up and footwork views (50 points). This establishes a successful example, not arbitrary-photo accuracy. All 304 AI/payment tests, 22 related browser checks, typecheck/build and deploy dry run pass. See [prompt correction evidence](./compshare-video.md#explicit-performer-mapping-correction--october-20). Deployment log: `test-results/compshare-identity-deploy.log`.

Compshare update: new paid orders use `MiniMax-H3` with the user-selected X motion reference normalized to a silent 15-second MP4. Output stays 10 seconds / 768P, $4.99, landscape or portrait; custom scene/text/tags remain supported. AutoDL's former default is commented beside the new selection, and its adapter/secrets/history routing remain available. The ignored `.env.compshare.local` supplies the new server-only key/reference URL, deployed with `--keep-vars`. No schema, Stripe price, binding or retention change. All 301 AI/payment tests, 22 related browser checks, typecheck/build and deployment dry run pass. One real Compshare job succeeded (1344×768, 10.125 seconds, 100 points); no real Stripe charge. Motion-video identity influence remains a known visual limitation. Details: [Compshare integration](./compshare-video.md). Evidence: `test-results/compshare-deploy.log`, `compshare-live-generation.json`, `compshare-live-video-metadata.json` and `compshare-production-smoke.json`.

Scene update: the shared maker accepts an optional owned scene image with preview/change/default restoration. It replaces only the third saved reference and uses a scene-compatible prompt without fixed straw-wall staging. Saved scenes survive paid fulfillment/recovery and restore in the order UI. All 259 AI/payment tests, 22 related browser checks, typecheck/build and deploy dry run pass. Deployed with `--keep-vars`; no schema, secret, binding or retention change. Details: [Optional scene image](./dance-scene-upload.md). Evidence: `test-results/custom-scene-deploy.log`.

Orientation update: the shared maker now offers Landscape / Portrait, validated and mapped to H3's actual `768p横` / `768p竖` resolution enum before checkout. The saved order settings control fulfillment/recovery, and the owned-order response restores the selected orientation. Price remains $4.99, duration 10 seconds. All 249 AI/payment tests and 21 related browser checks, typecheck/build and deploy dry run pass. Deployed with `--keep-vars`; no secrets, bindings, schema or storage-retention changes. Details: [Dance video orientation](./dance-orientation.md). Deployment evidence: `test-results/orientation-deploy.log`.

- Account: `c686d583b6d595875de1b8b73462fe42` (`zw83716@gmail.com`).
- Worker: `rumpelstiltskin-ai`.
- Main domain: `rumpelstiltskin-ai.co`; `www` uses the existing permanent redirect.
- Cloudflare zone: `831b0b5df0cb1e6937d3f2c36f251995`, created on the Free plan.
- Required registrar nameservers: `ada.ns.cloudflare.com`, `rick.ns.cloudflare.com`.
- Dedicated D1: `rumpelstiltskin-ai-db`, ID `76c8361b-6e97-4b4b-a77f-52dff0dd7126`.
- Existing R2: `rumpelstiltskin-ai-uploads`.
- Active R2 public domain: `https://media.rumpelstiltskin-ai.co` (TLS and ownership verified; both default reference images return 200).

The former `tinyship-db` configuration ID does not exist in this account. Other applications' databases and Workers were not changed. All eight existing SQLite migrations, `0000` through `0007`, were applied to the new empty database through Cloudflare's D1 API. The `d1_migrations` table uses Wrangler's installed schema and records all filenames, so later Wrangler migration commands recognize them.

`.env.production.local` is ignored by Git and contains the existing AutoDL key, configured workflow ID, production session secret and the three Stripe payment variables added on October 20. Secret values are not included in this document. Local variables are not uploaded wholesale.

The production build, TanStack typecheck and Wrangler deployment dry run passed. The user changed the registrar nameservers, and Cloudflare reports the zone active. The earlier DNS scan found only two parking A records and no mail records; the parking addresses were not imported. Both main and www custom domains are attached to the Worker.

For a later update, build from `apps/tanstack-app`, then deploy only after the build exits successfully:

```powershell
node scripts/cloudflare-vite.mjs build
node node_modules/wrangler/bin/wrangler.js deploy --config dist/server/wrangler.json --secrets-file .env.production.local
```

The source `wrangler.jsonc` now uses the dedicated production database, explicit account ID and R2 media domain. Production secrets were uploaded with the Worker. The default R2 development URL is no longer the production upload URL.

Online checks passed: all seven public routes and the two legal pages returned 200 with one H1, one description and a self canonical; legal pages are noindex. Robots allows crawling and sitemap lists all seven public URLs. WWW and HTTP return 301 to the HTTPS primary domain. An unknown page returns 404 with noindex.

The first live API check found that page path normalization redirected POST `/api/video-generate/` with 301. `src/start.ts` now preserves API paths and uses method-preserving 308 only for an API host/protocol redirect, while page redirects remain 301. The production regression now confirms an unauthenticated POST reaches the authentication check rather than redirecting.

The real production smoke check created an anonymous session, uploaded a generic illustrative photo, fetched it from the media domain, rejected an intentionally invalid generation request without consuming the allowance, and verified live browser hydration, photo preview and the enabled generation control. No provider generation was submitted and no user's portrait was uploaded. The temporary OAuth callback servers closed after successful authorization.

Evidence: `test-results/production-deploy.log`, `production-pages.json`, `production-smoke.json` and `production-home.png`; reproducible script: `scripts/manual/production-smoke.mjs`. The temporary generic R2 upload is removed after validation; the script records its exact key for cleanup.

## Basic source analytics update — 2026-10-15

Current deployed version: `5edb844b-3c6e-4ff0-993a-63bbb0f854ac`. PostHog now receives basic page-load visits with source/UTM attribution. Per the user's final scope, there are no generation, upload, preview, download or click events, and session replay/person profiles/autocapture are disabled. The privacy policy is updated. Public Vite configuration lives in the monorepo root `.env.production`; the server secrets file above is unchanged.

Build, typecheck, deployment dry run, two existing SSR unit checks and one focused analytics E2E passed. Live ingestion returned HTTP 200 with `{"status":"Ok"}`. Homepage and privacy return 200, with the H1 still present in source. No provider job, billing activation or payment-card configuration was performed. Detailed implementation: [PostHog analytics](./posthog-analytics.md). Evidence: `test-results/posthog-production-smoke.json` and `posthog-deploy.log`.

## Playable homepage examples — 2026-10-20

Current deployed version: `d68b22ba-317e-4b65-8598-88188f3ec768`. Homepage now features the existing maker sample and three externally streamed dance references, with no added author/source credit text as requested. The privacy notice covers direct third-party media requests. TanStack typecheck, production build, deployment dry run and 13 homepage/maker/tool-page E2E checks passed. Live browser verification confirmed all four videos played and the mobile page had no horizontal overflow. No provider job was submitted. Details: [homepage video examples](./homepage-video-examples.md); evidence: `test-results/homepage-videos-production.json` and `homepage-videos-deploy.log`.

## Simplified example gallery — 2026-10-20

Current deployed version: `9be55485-1792-475f-b8b7-b65cde202ea2`. Per the user's annotated screenshot, removed the homepage example intro, featured sample card, inspiration subheading and explanatory paragraph. The three reference videos now immediately follow the video-examples heading. Typecheck, build, dry run and all 13 relevant E2E checks passed. Live verification confirmed all three videos played, removed blocks were absent and the 390px layout had no horizontal overflow. Evidence: `test-results/homepage-videos-simplified-production.json` and `homepage-videos-simplified-deploy.log`.

## Stripe one-video payments — deployed (2026-10-20)

Deployed Worker version `9d20cf20-0159-4832-932a-5730ac652316`. Generate opens a $4.99 USD one-video dialog, and only an owned, verified paid Stripe session can start generation. The signed webhook and return flow share fulfillment, with one SQLite Durable Object per purchase for background recovery and refund retries. The compact three-video gallery is preserved.

The user supplied a live key through ignored `apps/tanstack-app/.env.stripe.live.local`. Account `acct_1TXtuTKmWtIG8s90` and live charge readiness were verified before creating app-specific product `prod_VTRJLJSCf40cKB`, 499 USD-cent price `price_1USUQxKmWtIG8s906I6fdXxy` and webhook `we_1USUQyKmWtIG8s90yIdgsNcD`. Only app payment variables were merged into the ignored production secret file. Pixal3D products, prices, endpoints and account branding remain unchanged. Checkout sets `Rumpelstiltskin AI` branding per Session. See [payment implementation and deployment](./stripe-video-payments.md).

Additive remote D1 migration `0008_video_purchase.sql` succeeded. The first paid upload encountered Cloudflare10072 when synchronizing a proposed cron because the account's five Free-plan slots were occupied. Recovery now uses the `PAID_VIDEO_RECOVERY` binding and `paid-video-recovery-v1` SQLite Durable Object migration, with durable one-minute alarms and no cron requirement. The final deployment uploaded successfully and synchronized triggers successfully. Other projects' schedules and the billing plan were preserved. Production had zero nonterminal purchases before the repair deployment, so no alarm backfill was required.

The final tree passes 208 AI/payment unit tests, 24 browser tests, TanStack typecheck, Cloudflare build, local D1 migrations and Wrangler deployment dry run. Real workerd tests cover alarm persistence, restart, repeated failures, concurrent wake cleanup and late resumption. An actual local Worker with migrated D1 rejects unsigned webhooks, removed free inputs and forged purchases; it accepts a locally signed probe. Spec and independent quality reviews approved the repair. Secret scanning found no key/signing-secret bytes in 1,383 Git-visible files or 72 client build files. No real charges, provider generations or user-photo uploads were used. Final production verification passed: hosted checkout shows Rumpelstiltskin AI / US$4.99, unpaid owned generation returns402 with no task, webhook signatures behave correctly, cancellation is safe and real session expiry reaches the website. Its synthetic checkout was expired and generic R2 test image removed. Real paid-generation/refund execution remains untested. Evidence: `test-results/stripe-production-smoke.json`; deployment evidence: `stripe-production-do-deploy.log`.

## Selected violet homepage styling — 2026-10-20

Published version `123160c8-f65c-4e81-aea8-8b1160a95167`. Per the user's selected concept, the homepage now uses midnight surfaces, a violet horizon, glass panels, compact side-by-side photo inputs and a matching existing payment dialog. Changes are CSS plus one homepage presentation class. Existing text, assets, media URLs, API handlers, generation/payment behavior and Stripe configuration remain unchanged. Other pages retain their styles. Remote variables/secrets and bindings were preserved during deployment.

Typecheck, build/dry run and all 15 existing homepage/paid-maker E2E checks passed. Live verification confirmed the dark theme, original three gallery videos, $4.99 dialog and no horizontal overflow at 1440/768/390/320px, with no browser errors. No real upload, charge or generation. Evidence: `test-results/motion-ui-deploy.log` and `motion-ui-live-visual.json`. Details: [homepage violet theme](./homepage-violet-theme.md).

## Concise customer-facing copy — 2026-10-20

Published version `9ff4f9cb-8ff3-4a9d-b1be-78c581ace71f`. Homepage photo handling, generation and download hints now use brief customer-facing language. Privacy/terms retain accurate photo-link and deletion-request information without low-level database/storage prose. The user explicitly deferred automatic deletion, so no lifecycle rule, cleanup job or deletion promise was added. Existing generation, payment and UI styles remain intact.

Typecheck, build/dry run and four existing homepage tests passed. Read-only live checks confirm homepage/privacy/terms return200 with the updated copy and no automatic-deletion promise. No real upload, charge or generation. Evidence: `test-results/concise-copy-deploy.log`, `concise-copy-live.json`.

## Optional dance description and quick tags — 2026-10-20

Published version `631d6afb-fb3d-4d35-bc5f-4352d7aec985`. The shared maker offers a 300-character optional description and three selectable style tags. Checkout validates/canonicalizes them and stores the compiled prompt in the purchase before payment; fulfillment/recovery use this saved prompt. Empty customization preserves the original preset. Custom prompts avoid conflicting costume, scene, expression and camera prohibitions. Price remains499USD cents and duration10seconds. No migration, Stripe configuration or storage-rule change.

233 AI/payment tests, 17 browser checks, typecheck and build pass. Tests capture the actual AutoDL serializer output using a simulated provider response and verify purchase persistence and paid admission. Live UI verification passes on all three maker routes, including description/tag submission with mocked upload/checkout, mobile fit and zero browser errors. No real charge or provider generation; no visual-effect comparison was performed. Evidence: `test-results/custom-description-deploy.log`, `custom-description-live.json`; details: [dance customization](./dance-customization.md).
