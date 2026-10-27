# AI Rap Video public media domain

On October 26, 2026, the public file origin changed to `https://media.ai-rapvideo.co`.

- Connected the new custom domain to the existing R2 bucket in Cloudflare account `c686d583b6d595875de1b8b73462fe42`, zone `7b4d1a048fd42630ee2653c54800923b`, with minimum TLS 1.2.
- Updated the TanStack Worker's `R2_PUBLIC_URL` and private local Worker configuration. New photo uploads and stored generated videos construct URLs from this origin. Scene images and voice references already use the primary site domain.
- Existing objects stay in place. The former custom domain stays connected for historical links and the old website. No files or database rows are moved, overwritten or deleted.
- Historical task results project exact old-origin user-media URLs to the new origin when read on this deployment. Only the known unsigned `uploads/<owner>/<photo>` and `generated-videos/<owner>/<task>.mp4` paths qualify. The old site's configured origin does not enable this projection.
- Downloads continue using the R2 binding and existing owner/24-hour expiry checks. Already-open tabs may submit a pre-switch photo URL; the exact old origin is normalized before the existing ownership and object-presence validation.
- Bucket lifecycle rules, preview quotas, generation duration/resolution and Stripe configuration remain unchanged.

Validation uses type checking, a production build, Cloudflare domain/HTTPS status, and read-only checks of existing public objects. No upload, payment or video-generation test is submitted under the user's standing instruction.

Deployed version: `41f52a7d-d1ec-4234-b6b0-be2deec02e0a`, confirmed at 100% traffic with `R2_PUBLIC_URL=https://media.ai-rapvideo.co`. Ownership and SSL are active. A pre-existing public static object returns HTTP200 from both origins with identical ETag and length; the new domain also returns HTTP200 through the user's existing system proxy without changing any proxy rules. Homepage and credit-configuration reads succeed, and payment/video secret bindings remain present. The built client contains no references to the former media hostname.
