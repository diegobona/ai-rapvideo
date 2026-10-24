# Paid Video Stripe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Charge USD 4.99 for each Rumpelstiltskin dance video through a modal launched by Generate, with server-enforced payment and full refunds for confirmed technical generation failures.

**Architecture:** Keep the existing guest session and photo upload flow. Store a purchase containing server-validated generation options, create a Stripe hosted Checkout Session for one fixed-price video, and record paid status only from a verified Stripe session/webhook. A durable purchase claim admits one provider generation per payment. Webhook and return handling share fulfillment; per-purchase SQLite Durable Object alarms start paid purchases and handle failures/refunds if the browser closes. Preserve old task access, with no new free generation or credit-balance bypass.

**Tech Stack:** Existing TanStack Start/React, Stripe SDK 18 API version 2025-04-30.basil, Drizzle SQLite/D1 and PostgreSQL schema counterparts, Cloudflare Worker with SQLite Durable Object alarms, Vitest and Playwright.

**Scope:** The established English TanStack site. Other frontend apps are unmodified scaffold apps. Reuse shared libraries and define both database schemas. Keep all existing uncommitted work. Do not modify Pixal3D's products, prices, webhooks, branding or credentials. Never print or commit secrets; no real charge is part of validation. The user supplied the target account's live key through the ignored local handoff file; account identity and charge readiness were verified before provisioning.

## Contracts

- `config/videoPurchase.ts`: fixed `amount=499`, `currency='usd'`, product label, app metadata marker, environment getters for `STRIPE_SECRET_KEY`, `STRIPE_VIDEO_PRICE_ID`, `STRIPE_VIDEO_WEBHOOK_SECRET`. Production must fail closed when configuration is missing or test-mode.
- Purchase states: `pending`, `paid`, `starting`, `processing`, `succeeded`, `refund_pending`, `refunded`, `expired`.
- `video_purchase`: id, userId, fixed amount/currency, state, generationOptions JSON, unique checkoutSessionId, paymentIntentId, taskId, refundId/refundStatus, checkoutUrl, createdAt/updatedAt. Add nullable unique `purchaseId` to video_task for reconciliation after a partial database failure.
- `GET /api/video-generate/`: `{success:true,data:{purchase: PublicVideoPurchase|null,storageKey:string}}`; latest owned active purchase or latest result. No payment granted merely by GET.
- `PublicVideoPurchase`: `{id,state,taskId:string|null,result?:VideoGenerationResult,error?:string,refundStatus?:string}`. No secret or full payment/customer record in public response.
- `POST /api/video-checkout/`: owned guest session required, same-origin, rate limit. Accept `{dancerImageUrl,princessImageUrl?,returnPath}`. Validate options with the existing dance template and provider configuration before taking payment. Fixed server price; return `{success:true,data:{purchaseId,checkoutUrl}}`.
- Stripe `success_url`: allowed returnPath plus `?checkout_session_id={CHECKOUT_SESSION_ID}#dance-maker`; `cancel_url`: same path plus `?checkout=cancelled#dance-maker`. Only homepage and the two existing maker route paths are allowed.
- `POST /api/video-checkout/verify`: accept `{sessionId}`; retrieve and validate owned session, mode/payment_status, matching DB session id, app marker, expected price/quantity, 499 USD. Return `{success:true,data:{purchase:PublicVideoPurchase}}`.
- `POST /api/video-generate/`: accept only `{purchaseId}`. No provider call until an owned paid purchase is atomically claimed; pending/refunded/another user's payment returns 402/403/404, duplicate calls return the existing purchase/task instead of another job. Success `{success:true,data:{purchase:PublicVideoPurchase}}`.
- `GET /api/video-generate/status?purchaseId=...`: owned purchase only, refresh provider status and refund as needed, return `{success:true,data:{purchase:PublicVideoPurchase}}`. Preserve legacy `taskId` reads and downloads.
- `POST /api/video-checkout/webhook`: isolated endpoint and signing secret; verify the raw body and signature, retrieve/validate Stripe session, process only this app's purchase records, idempotent fulfillment. Handle completed/async succeeded, expired and refund events; retry processing failures with non-2xx. Ignore other apps' payments. Global Stripe settings stay unchanged.
- Per-purchase Durable Object alarms reconcile once per minute: start paid purchases once, recover persisted task by purchaseId, poll processing tasks, and retry refunds. Persist the next alarm before external work and bound reconciliation to 45 seconds. Do not treat transient polling errors as a confirmed generation failure. An interrupted start without a recoverable task after a conservative timeout is refunded, never blindly resubmitted.
- Refunds use a stable purchase-specific Stripe idempotency key and durable `refund_pending` state. Verify existing Stripe refund records before repeating across the idempotency retention window. No money refund on success or transient status failures. Revocation/manual refunds must not resurrect a paid entitlement.
- Checkout creation uses a stable purchase-specific idempotency key and reuses an existing pending draft/session for simultaneous identical requests. Recover a Session created before its DB save on retry; no duplicate chargeable checkout for one draft.
- All state transitions are conditional/atomic. Settlement cannot revive refund states, and a failure/refund claim must not win over a purchase that has already succeeded. Refund webhooks locate the purchase by its indexed PaymentIntent; pending, failed, partial and completed refunds remain distinct, and reordered events cannot resurrect access.
- Accept only immediate card payments in Checkout; keep async success/failure handling defensive. No optional quantity, discount, promotion or currency conversion can change the server's fixed 499 USD price.
- Checkout photo URLs must use the configured R2 public origin and the authenticated user's `uploads/{userId}/` object prefix, with valid image filenames and no traversal/query/credentials. Verify existence through the R2 binding before checkout when available. Public R2 URLs have no signed expiry or automatic deletion; they remain usable through Checkout and processing. A confirmed missing input after payment follows the failure/refund path.
- Reconciliation uses one Durable Object per purchase, conditional claims and bounded work. Overlapping alarm, webhook and browser processing must not duplicate submissions/refunds. Stale starting claims recover by video_task.purchaseId; never blindly submit again. The retained batch helper uses indexed state/updatedAt lookups for maintenance/tests. Recovery does not overwrite the last checkout-attempt time on an unattached draft.

## Task 1 — Purchase state and Stripe adapter

**Files:** create `config/videoPurchase.ts`, `libs/database/schema/{pg,sqlite}/video-purchase.ts`, proxy and exports, `libs/database/{drizzle,drizzle-sqlite}/0008_video_purchase.sql`, `libs/payment/video-purchases.ts`, `libs/payment/video-stripe.ts`; update video-task schemas/store for purchaseId. Tests: `tests/unit/payment/video-purchases.test.ts`, `video-stripe.test.ts`.

- [x] Write failing tests for fixed price, settlement verification, ownership, replay/concurrent claims, refund revocation and idempotency with real SQLite/D1 SQL where applicable.
- [x] Implement the minimal durable purchase operations and Stripe adapter; leave generic credit/subscription fulfillment intact.
- [x] Run focused Vitest tests and inspect the outcomes. Keep secrets out of tests/logs.

## Task 2 — Paid generation routes and reconciliation

**Files:** create `libs/ai/paid-video.ts`, `apps/tanstack-app/src/lib/paid-dance-service.ts`, `src/routes/api/video-checkout/{index,verify,webhook}.ts`, and `src/worker.ts`; modify `src/routes/api/video-generate/{index,status}.ts`, `src/routes/api/auth/$.ts`, `src/routes/api/upload.ts`, `src/lib/with-request-db.ts`, `src/lib/dance-service.ts`, `wrangler.jsonc`. Tests: `tests/unit/ai/paid-video.test.ts`, route tests.

- [x] Define acceptance scenarios in the E2E catalog before implementation.
- [x] Add failing tests that unpaid/forged/cross-owner/refunded requests never call the provider; paid concurrent requests start exactly once; a completed video needs a new payment for another generation.
- [x] Wire checkout and fulfillment, remove the legacy trial check from the site's anonymous sign-in, upload and generation routes, allow guests through the new checkout routes, and preserve legacy task reads/downloads.
- [x] Add a Worker scheduled handler that wraps the existing TanStack server entry without altering fetch behavior and runs reconciliation inside the D1 request context. Retrieve relevant Cloudflare docs and inspect installed types before writing the entrypoint.
- [x] Cover confirmed failures, refund retries, closed browser, interrupted start and duplicate webhooks; do not spend real money or create actual provider generations in tests.

## Task 3 — Checkout modal and paid copy

**Files:** modify `src/components/dance-maker.tsx`, `src/lib/dance-generation.ts`, `src/lib/home-copy.ts`, `tool-page-copy.ts`, `legal-copy.ts`, relevant centralized page metadata/tutorial/comparison copy; create `src/components/dance-checkout-dialog.tsx` and optional app CSS. Update existing relevant unit/E2E expectations.

- [x] Generate validates the selected photos and consent, then opens a compact dark/gold dialog with $4.99 USD, one video, no subscription, and technical-failure refund information. No invented discount, countdown, or likeness guarantee.
- [x] Paying creates a guest session, uploads the selected photos, creates checkout and navigates to Stripe. Closing the modal starts no generation and makes no charge.
- [x] Returning from Checkout verifies payment server-side, starts/resumes generation automatically, and recovers the task across refreshes. A declined/cancelled/unverified payment never starts generation. Allow another $4.99 purchase after a successful video.
- [x] Remove the current free-trial promises, one-video lifetime restriction and inaccurate pricing/refund copy. Preserve the user's compact three-video gallery.
- [x] Walk through the actual UI, then update Playwright flows for modal, cancellation, paid return, retry, repeat purchase, keyboard focus/mobile, and download behavior with mocked payment/provider responses.

## Task 4 — Verify and configure the target Stripe account

**Files:** create a secret-safe provisioning script and `docs/implementation/stripe-video-payments.md`; update env examples, test catalog and production deployment record.

- [x] Review implementation against spec and then for code quality, especially payment bypass/races, webhook auth, refunds and migration safety.
- [x] Run relevant unit tests, TanStack typecheck, Cloudflare build/dry run, D1 migration checks and focused E2E. Fix defects before publishing.
- [x] Confirm the credential's account id is exactly `acct_1TXtuTKmWtIG8s90` before any live account configuration. Add only an app-tagged $4.99 product/price and isolated webhook endpoint; do not change the existing Pixal3D setup. Never echo keys.
- [x] Verify payment/provider transitions with simulated unit/browser data and a real live checkout stopped before payment. No real card charge or test-mode paid/refund cycle was performed; record this validation limit explicitly.
- [x] Apply additive D1 migration and deploy only with verified correct live configuration; verify production rejects unpaid generation and the new checkout page shows $4.99. Record evidence and any untested real-money boundary explicitly.

## Verification and remaining dependency

### Production follow-up: replace unavailable cron capacity

The user supplied the live key through the ignored local file. Verified account `acct_1TXtuTKmWtIG8s90` and charges enabled, created the isolated499USD-cent price/webhook, and applied remote D1 migration0008. Worker upload succeeded; cron synchronization failed with Cloudflare10072 because the Free account already has five triggers. Preserve other projects' jobs and the billing plan.

- [x] Replace this app's cron with SQLite-backed per-purchase Durable Object alarms supported on Workers Free.
- [x] Persist recovery handoff before opening checkout; rearm existing nonterminal paid/refund work, preserve durable retries and terminal-state races without duplicate generation.
- [x] Reuse shared single-purchase reconciliation, cover actual Workers alarm behavior, regenerate types and rerun targeted checks/reviews. Spec and independent quality reviews approved after the minute-spaced draft-rotation regression fix.
- [x] Redeploy and verify real unpaid Stripe checkout499USD, payment admission402, signed callback, cancellation/expiry and cleanup; do not submit a real charge.

Final local evidence: 208 unit tests and 24 browser checks pass. Typecheck, production build, Wrangler dry run and local D1 migration pass, including the final rebuild after the last recovery fix. Actual local Worker/D1 admission and signed-webhook checks pass. Reviews found and resolved stale recovery references, aged no-session checkout drafts, unfair batch ordering, incorrect terminal verification status codes and maintenance touches blocking near-expiry draft rotation. Known pre-provider deadline exhaustion releases the claim safely for later processing; ambiguous submitted tasks are never resubmitted.

Completed: Worker `9d20cf20-0159-4832-932a-5730ac652316` uploaded and synchronized triggers successfully. The real production hosted checkout displayed `Rumpelstiltskin AI` and US$4.99; unpaid generation returned402 with no task, signed/unsigned callbacks behaved correctly, cancellation and actual Stripe expiry reached the website. The synthetic checkout was expired and its generic image removed. Evidence: `test-results/stripe-production-do-deploy.log` and `stripe-production-smoke.json`. Production had zero pre-repair nonterminal purchases, so no backfill was needed. No real-money transaction or provider job was submitted; real paid-generation/refund execution remains untested. The user requested no further reviews; no additional review or testing is planned.
