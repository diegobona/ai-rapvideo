# AutoDL image generation and temporary free access

Update October 21, 2026: paid admission has been restored at $4.99 USD. The current media and payment behavior is documented in `paid-media-retention.md`; temporary free code remains available for a deliberate future switch.

2026-10-20: supersedes the current-mode statements in `fixed-original-scene.md`. Earlier saved orders retain their original generation options.

## New generation

- `createDanceVideoOptions` freezes AutoDL workflow `minimax_h3_zm_u24`, 10 seconds and native `768p横` / `768p竖`. A stale workflow environment variable cannot redirect these requests.
- Send only three ordered references: uploaded dancer, uploaded or included princess, and the server-fixed barn image. Ignore obsolete scene fields; never send a reference video, first/last frame or audio.
- The hidden prompt describes five shots: shush 0–1.8s, reaction 1.8–3s, measured tiptoe 3–6.5s, feet 6.5–8.2s, medium shot and finish 8.2–10s. Request four to six total steps during the final seven seconds and one settled weight transfer every 1.2–1.5 seconds, without extra fast taps between beats.
- Fixed barn and period costumes remain consistent. Expressions animate with gaze, blinks, lips, jaw, head movement, lighting and hand occlusion. Notes and the playful tag affect facial expression without changing the scene, camera or dance cadence.
- Historical Compshare and AutoDL adapters/prompts remain. Legacy AutoDL options without a frozen workflow retain their prior environment/default workflow and resolution support.

Official schema read from `https://www.autodl.art/api/v1/comfyui/workflows/minimax_h3_zm_u24`; sanitized public schema evidence is in ignored `test-results/autodl-zm-u24-public-schema.json`. The workflow supports 1–15 seconds and six 480p/768p resolutions; generic legacy forms keep 5/10-second choices. Authorization uses the raw token. The schema has no reference-video field.

## Temporary payment switch

`config/videoPurchase.ts` exports `VIDEO_PAYMENT_REQUIRED = false`. The maker submits directly to `/api/video-generate/`; it does not open Stripe checkout. New checkout creation is blocked while the switch is off, including stale clients. Existing paid verification, recovery, refunds and downloads remain available.

Direct runs create no paid purchase or credit charge. Separate temporary browser/user reservation keys allow another run after a terminal result and prevent concurrent duplicate submissions. Ambiguous upstream submission failures retain their reservation to avoid silently submitting twice. No database migration is required.

Photo URLs, expression notes, selected tags, orientation and task ID are retained in browser session storage for same-tab refresh. No raw photo bytes or API keys are saved there. Public maker/tool/tutorial instructions reflect direct generation; the payment-only tutorial screenshot is hidden while the switch is off.

Restore payment by setting the single flag to `true`, rebuilding and redeploying. Paid unit contracts explicitly exercise that mode. Do not remove the Stripe secrets, webhook or recovery binding.

## Validation boundary

Unit and browser fixtures verify request contents, admission, retention, recovery and repeat generation. They do not establish actual visual identity quality or model adherence to the requested cadence. No real paid generation is required for this deployment.

Verified deployment: Worker `16f6e8c6-ef0d-4631-86b1-5bc5ec1cacdd`. All 344 AI/payment unit tests, TanStack typecheck, Cloudflare build and deployment dry run pass. Live browser suite: 21 pass, two new-payment-only scenarios intentionally skipped while payment is off. Actual public GETs return 200 for all three makers and the tutorial; makers expose two photo inputs, fixed barn and temporary free access. Anonymous generation lookup returns its expected no-purchase contract. Evidence: `test-results/autodl-free-{unit,build,dry-run,deploy,browser}.log`.
