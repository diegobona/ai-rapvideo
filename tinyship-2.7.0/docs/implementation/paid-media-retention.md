# Paid generation and temporary media storage

October 21, 2026. Supersedes temporary free access in `autodl-image-temporary-free.md`.

- `VIDEO_PAYMENT_REQUIRED=true`; one video costs $4.99 USD. Existing Stripe price, verification, idempotency, failure refunds and recovery remain in use. New direct free submissions are rejected. AutoDL image generation remains the active provider.
- The maker removes the screenshot-marked expression hint, idle result status and fidelity filler. The price appears in the generation button, badge and FAQ; no current free-access claim is rendered. The refund guarantee remains visible.
- A compact privacy notice below the refund promise names Cloudflare and scheduled automatic deletion after 24 hours. The FAQ, download reminder and privacy policy match this behavior.

## Actual storage behavior

Photos already upload through the existing R2 binding under `uploads/{owner}/`. New completed AutoDL/Compshare outputs now stream into `generated-videos/{owner}/{task}.mp4` before a task becomes successful. Their original provider/model are retained; unmanaged remote thumbnails are omitted. Stored results include the managed key and the original R2 upload timestamp plus 24 hours as expiry.

Retries reuse the existing object and its expiry. Conditional writes prevent competing polls from replacing it or extending retention. Storage transport failures leave the task retryable, without submitting another generation. An undelivered result beyond the retention window becomes a failed task and uses the existing refund path. Already delivered results become unavailable at expiry without changing the paid purchase record or issuing a second generation/refund.

Managed downloads read the native R2 bucket, require the matching owner, reject missing/expired media and never fall back to the processor URL. Historical already-completed external results retain their original delivery behavior. Shared non-Workers callers retain their prior behavior without an injected storage dependency.

The live `rumpelstiltskin-ai-uploads` bucket has two enabled lifecycle rules:

| Rule | Prefix | Expiry |
| --- | --- | --- |
| uploads-delete-after-24h | uploads/ | one day / 86400 seconds |
| generated-videos-delete-after-24h | generated-videos/ | one day / 86400 seconds |

The existing seven-day incomplete multipart abort rule remains. `references/`, example media and site assets are excluded. No database migration or new Cron Trigger is required.

R2 lifecycle deletion runs asynchronously after expiry; this is why the public wording says deletion is **scheduled** after 24 hours. The privacy policy explains that physical removal can take additional time. These rules control our R2 copies, not AutoDL/Compshare's separate retention or a user's downloaded file. Payment/refund records remain for order support. See [Cloudflare lifecycle behavior](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).

## Verification

377 AI/payment tests pass, including native Miniflare R2 streaming/conditional writes, managed download ownership/expiry boundaries and expired purchase presentation. TanStack typecheck, production build and deployment dry run pass. Lifecycle rules were read back from the live bucket; evidence: `test-results/media-retention-lifecycle-live.log`. Provider/Stripe mutations in automated checks are simulated; no customer payment or real generation was made.

Published Worker `51474d3d-722c-4eeb-9939-2106432d3c64`. Five live browser checks pass for payment dialog, checkout admission, customization, completion/download and responsive price/privacy/gallery. Public maker/guide/policy pages return200; current free claims and screenshot-marked filler are absent. Privacy notice fits mobile in under140px. Logs: `test-results/paid-retention-{unit,typecheck,build,dry-run,deploy,browser}.log`; screenshots: `test-results/media-privacy-{desktop,mobile}.png`.
