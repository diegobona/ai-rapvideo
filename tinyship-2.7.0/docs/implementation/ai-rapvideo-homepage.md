# AI Rap Video homepage — October 24, 2026

The TanStack homepage targets `ai rap video`: title, H1, introduction, maker labels, instructions, FAQ, site branding and homepage navigation. Gallery media now shows five two-person rap performances, including one portrait edit, self-hosted with matching posters; the how-to section uses newly generated rapper-themed illustrations. Homepage links point to the maker, instructions and FAQ within the homepage.

The shared frontend maker requires an uploaded photo for each person. It renders two empty upload controls, has no default second-person image or restore-default action, and blocks a new generation or payment when either photo is absent. Removing either photo clears persisted input recovery. Existing purchased-job recovery remains supported. Downloads use `ai-rap-video.mp4`.

Backend generation prompts, model configuration, billing logic, existing D1/R2 bindings and other page content are retained. This is a separate Worker named `ai-rapvideo`; the existing `rumpelstiltskin-ai` Worker was not deployed or updated.

## Deployment

- Production: https://ai-rapvideo.co
- `www.ai-rapvideo.co` is bound to the same Worker; existing site middleware redirects it to the apex domain while preserving the path and query.
- Independent address: https://ai-rapvideo.zw83716.workers.dev
- Cloudflare zone: `7b4d1a048fd42630ee2653c54800923b`, active; nameservers `ada.ns.cloudflare.com` and `rick.ns.cloudflare.com`.
- Current Worker version: `2fc98e7d-294a-4b11-a4ed-aeacfadc588d`.
- Canonical and runtime base URLs use https://ai-rapvideo.co.

The user removed the two imported parking A records and switched the nameservers. Wrangler then created the apex and www Custom Domains. Source configuration in `apps/tanstack-app/wrangler.jsonc` records the final settings. Domain activation reused the already verified application bundle, overriding its runtime URL and domain deployment settings through the installed Wrangler's `--var` and `--domains` flags. Existing Cloudflare secrets were retained.

## Verification

TanStack typecheck, Cloudflare production build and deployment dry run passed. AI unit tests: 364 passed; SEO unit tests: 9 passed. Local homepage/maker browser tests: 22 passed, 2 free-mode cases skipped because payment is enabled. The independent deployed address passed all five homepage checks; the two HTTP-request checks used the existing system proxy after direct Node DNS/IPv6 connections timed out. Desktop and mobile screenshots are in ignored `test-results/ai-rap-home-{desktop,mobile}.png`. Automated tests mock upload, payment and generation mutations; no real charges or model jobs were submitted.

Evidence: ignored `test-results/ai-rap-{unit,build,dry-run,browser,deploy,live-browser,live-http-browser,domain-deploy,domain-browser}.log`.

Final domain verification: Cloudflare's authoritative DNS returns `104.21.60.199` and `172.67.201.21` for apex and www. Direct HTTPS requests to those edge addresses, preserving the hostname/SNI and full certificate validation, return 200 for the homepage and 301 from `https://www.ai-rapvideo.co/?check=1` to `https://ai-rapvideo.co/?check=1`; TLS verification result is zero. Local/system proxy DNS still temporarily returned the old parking addresses during the domain browser run, causing connection failures. The same application bundle had already passed all five checks on its independent deployed address.

Sitemap cleanup deployed as Worker version `2cb38303-f03d-42f3-93f1-a6d652162045`. Sitemap discovery and rendering exclude Rumpelstiltskin pathnames. Verified the live `https://ai-rapvideo.co/sitemap.xml` contains exactly one URL, `https://ai-rapvideo.co/`, with none of the six legacy pages. Ten SEO unit tests, TanStack typecheck, production build and deployment dry run passed. No local proxy settings were changed.

The six legacy pages were subsequently retired in Worker version `e613db5b-0768-4404-a263-e2b5b062ae58`. An early request middleware returns 410 Gone and `X-Robots-Tag: noindex, follow` before canonical redirects; no Location header is emitted. Client-side legacy metadata is also noindex. All six deployed URLs passed GET and HEAD checks with redirects disabled, including a separate www/trailing-slash/query check. Homepage remains 200 and sitemap remains homepage-only. Seventeen SEO unit tests, typecheck, build, dry run and all eight deployed HTTP tests passed. Evidence: ignored `test-results/ai-rap-retired-{build,dry-run,deploy,live}.log`.

## Rap gallery and workflow assets

The subsequent single-page SEO update is documented in [ai-rapvideo-homepage-seo.md](ai-rapvideo-homepage-seo.md). It adds SoftwareApplication/FAQPage JSON-LD, homepage-only social tags, the requested 61-character title, a subtitle, three SSR editorial sections and two further rap examples. The final raw-source word counts are 907 editorial words and 1,087 main words. All seven FAQs retain their original wording and the sitemap is unchanged. The UI maker anchor/classes and checkout return fragments now use rap-* presentation identifiers.

The user's later placement correction moves examples directly below the maker, followed by instructions and editorial sections. Both SSR section order and delivered CSS were updated in version `2fc98e7d-294a-4b11-a4ed-aeacfadc588d`. Build, typecheck, dry run, all four production homepage SEO tests and a live CSS-order check passed. Evidence: `test-results/homepage-examples-order-{build,typecheck,dry-run,deploy,live-tests,position}.log` and `homepage-examples-order-live.json`.

The final gallery replaces the old dance footage with public [RapDuo examples](https://rapduo.app/): an orange studio duo, a graffiti-wall street duo and a pink/cyan neon duo. Videos are 1280×720, 12.096 seconds, with audio. Sources are `https://img.rapduo.app/public/rapduo/s/sample-{booth,street,neon}.mp4` and `thumb-{booth,street,neon}.jpg`. Local paths are `public/videos/examples/rap-{orange-studio,street-duo,neon-session}.mp4` and matching filenames in `public/images/examples/`. Posters and decoded midpoint frames were checked; captions describe the actual style and scene. The earlier dance downloads were removed.

Four new built-in ImageGen illustrations in `public/images/rap/` replace all old how-to imagery: first portrait, second portrait, two-person studio performance generation, and download. Their associated text requires two uploaded portraits and retains existing format, permission, payment and download controls.

Visible result/status labels use consistent “your video” wording. Page contact strings and the footer mail link use `support@ai-rapvideo.co`; this change does not provision an email mailbox. Privacy/terms branding and the media-hosting description match the current AI Rap Video site. The required dual-photo FAQ remains. Backend generation prompts and payment behavior are unchanged.

The rap gallery and regenerated workflow images were deployed in version `072e207d-f80e-44c8-94dd-65ca1c1fed33`. All 22 focused SEO/SSR unit tests, typecheck, production build and deployment dry run passed. Live checks verified the three complete MP4 payloads against local SHA256 hashes, their posters, all four new PNGs, homepage wording, support links, dual-photo FAQ, legal branding, homepage-only sitemap and a retired-page 410 response. Cloudflare returned HTTP 200 full video responses to Range requests; no 206 claim is made. Evidence: ignored `test-results/ai-rap-rap-assets-{build,dry-run,deploy,live}.log`. Full image prompts and output paths are recorded in `../../../.tmp/rap-process-image-prompts.json`.

P3 consistency cleanup was deployed in version `e48747f0-ed29-41dd-aae6-245995501077`. Seven retired page routes (including the former 1987 alias), their dedicated content/styles, 21 old marketing images and the old demo video were removed from the frontend. The request middleware still returns 410 for all seven retired page URLs before redirects. Pricing/refund/retention wording and checkout/download branding were aligned. All 28 focused unit tests, typecheck, build, dry run and 27 deployed HTTP checks passed. Live R2 lifecycle rules remain enabled for uploads and generated videos at one day. On October 24, 2026, the user explicitly authorized renaming the shared Stripe Product to `AI Rap Video`. The name was updated and read back with the same Price ID and 499 USD cents; no checkout, charge or refund was created. See `ai-rapvideo-p3-consistency.md` for the file inventory, sitemap snapshots, exact homepage metadata and Stripe verification. Backend generation prompts, existing orders and infrastructure identifiers are retained.
