# Stripe video payments

One purchase buys one 10-second video for **$4.99 USD**. Generate opens a price dialog. Continue creates a guest session, uploads photos, and redirects to Stripe hosted Checkout. The server only admits a generation after an owned session is verified paid; previous trial status, credit balances, client prices and return URL parameters cannot grant generation.

## Configuration and deployment

Target account: `acct_1TXtuTKmWtIG8s90`. Pixal3D's products, prices, webhooks and global account settings are preserved.

1. Put the target account's existing live secret key in the ignored `apps/tanstack-app/.env.stripe.live.local` file. Never put it in chat, source control or command arguments.
2. From repository root, run `node --use-env-proxy scripts/manual/configure-video-stripe.mjs --dry-run`. It verifies account identity and live-charge readiness without modifications.
3. Run the same command without `--dry-run`. It creates or reuses the isolated app product, fixed 499-cent USD one-time price, and signed webhook endpoint. Only the three payment variables are merged into the ignored production environment file. Existing AutoDL/auth settings are preserved. Non-secret configuration evidence goes to `test-results/stripe-video-provisioned.json`.
4. Apply only additive migration `libs/database/drizzle-sqlite/0008_video_purchase.sql` to the existing production D1 database after checking its applied migrations. The migration adds purchases and a nullable unique purchase reference to video tasks; old task rows remain readable. PostgreSQL has an equivalent additive migration.
5. Build the TanStack Worker, dry-run Wrangler, then deploy with the verified production environment file and `--keep-vars`. Wrangler creates the SQLite-backed `PaidVideoRecovery` class through the `paid-video-recovery-v1` migration and binds `PAID_VIDEO_RECOVERY`. This is a Durable Object migration, separate from D1 migration 0008. No account upgrade or cron slot is required.
6. Verify unpaid generation rejects, the live dialog says $4.99, and a created Stripe checkout displays $4.99 USD. No real card charge is needed for deployment checks. A real charge/refund cycle remains a separate operational check.

Required server variables: `STRIPE_SECRET_KEY`, `STRIPE_VIDEO_PRICE_ID`, `STRIPE_VIDEO_WEBHOOK_SECRET`. Public HTTPS deployments reject test-mode keys. Localhost permits test keys. Generation is unavailable when payment configuration is missing.

Provisioned live resources: product `prod_VTRJLJSCf40cKB`, price `price_1USUQxKmWtIG8s906I6fdXxy`, webhook `we_1USUQyKmWtIG8s90yIdgsNcD`. The account ID and live charge readiness were verified before creating them. The provisioner preserves existing production secrets. Checkout branding is set per Session to `Rumpelstiltskin AI`, without changing the account's global brand or Pixal3D configuration.

Webhook: `https://rumpelstiltskin-ai.co/api/video-checkout/webhook`, API `2025-04-30.basil`. Events: checkout completed, async payment success/failure, expiry; charge refunded; refund created/updated/failed. Raw-body signature validation precedes handling. Other applications' sessions are ignored.

## Recovery and refunds

The database atomically claims a paid purchase before calling the provider. Duplicate returns, browser retries, alarms and webhook deliveries reuse the purchase/task. A saved task can be recovered by its unique purchase ID. An ambiguous interrupted submission waits conservatively, then requests a refund rather than blindly submitting again.

Each purchase owns a SQLite-backed Durable Object alarm, persisted before Stripe creates a chargeable checkout. Every alarm persists its next retry before external I/O, then reconciles that purchase inside the D1 context with a 45-second work budget. Normal retries are one minute apart. Work continues without an open browser and survives repeated outages beyond the platform's automatic retry limit. Terminal cleanup checks the wake version so a concurrent settlement/refund handoff is retained. Terminal records stop their alarms; a delayed genuine payment can rearm them. Admission fails closed if durable scheduling is unavailable.

Transport errors are retried; they do not establish a failed generation. Confirmed technical failure requests a full refund. Refund retries reconcile existing Stripe records, use durable leases and stable idempotency keys, and account for partial/failed refunds. Revoked/refunded purchases cannot become paid again through delayed events. Unattached checkout drafts retain the time of the last actual create attempt, so minute-spaced recovery cannot block safe near-expiry draft rotation.

The first production upload encountered Cloudflare error 10072 because the account's five Free-plan cron slots were already occupied. The per-purchase alarm design replaces only this app's proposed cron; other projects' schedules and the billing plan remain unchanged. Production D1 was checked for pre-repair nonterminal purchases and had none, so no historical alarm seeding was needed.

Photo ownership is checked before checkout and again before generation. Missing stored input after payment requests a refund. Photos and prompts are kept out of Stripe metadata. Old task polling/download access remains available to the owning session.

## Local verification

Use the installed Node binaries directly; do not invoke the environment's pnpm installer wrapper.

```powershell
node node_modules/vitest/vitest.mjs run tests/unit/ai tests/unit/payment
node node_modules/typescript/bin/tsc --noEmit -p apps/tanstack-app/tsconfig.json
```

Build from `apps/tanstack-app` using `node scripts/cloudflare-vite.mjs build`. Local browser tests may use `CLOUDFLARE_PREVIEW_PORT=7005` and `CLOUDFLARE_PREVIEW_STATE=.wrangler/stripe-test-state` with `scripts/cloudflare-preview.mjs` and dummy test-mode payment variables. Apply local D1 migrations to the same persistence directory before real API checks. The paid-maker Playwright cases mock checkout/provider traffic: no real cards, provider jobs or user-photo uploads. Set `SEO_TEST_BASE_URL` to that preview, then run `tests/e2e/specs/launch-maker.spec.ts` through `tests/e2e/seo.config.ts`. `scripts/manual/stripe-local-admission.mjs` separately checks the actual Worker/D1 admission boundary and raw signed webhook, using only the dummy local signing secret.

The tutorial screenshot script uses the real price dialog and mocked completion controls. Its audit records zero real uploads/payments/provider jobs. Runtime recovery tests use actual Miniflare/workerd SQLite Durable Objects and D1 bindings, with payment/provider boundaries mocked. They cover persistent alarms across runtime restart, repeated failures, concurrent wakes, terminal cleanup and late resumption.

`scripts/manual/stripe-production-smoke.mjs` checks the real live hosted checkout without entering card details or paying. It verifies $4.99 USD, session ownership/price, unpaid generation rejection, webhook signatures, cancellation and real Stripe expiry delivery. It expires its own synthetic checkout and removes its generic R2 test image. A real paid generation and real refund remain untested; unit/browser tests cover those transitions with simulated payment/provider responses. Evidence is recorded under `test-results/stripe-*`.

Production deployment completed as Worker `9d20cf20-0159-4832-932a-5730ac652316`. The final production smoke passed all checks above, including per-Session branding, 402 for the unpaid owned purchase, actual checkout expiry and test-image cleanup. Zero real charges and provider jobs were submitted. All 208 focused unit tests and 24 browser checks passed before deployment.

The later [optional dance customization](./dance-customization.md) update compiles description/style inputs into the existing purchase's `generationOptions.prompt` before checkout. Payment amount, duration, provider admission, refunds and Stripe configuration are unchanged; custom text is not added to Stripe metadata. Paid starts continue accepting only a purchase ID and use the saved order options.
