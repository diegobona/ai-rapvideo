# AI Rap Video paid video credits

Implemented October 25, 2026, for the TanStack application on `ai-rapvideo.co`.

## Product and Stripe configuration

- One-time payment: **$8.90 USD** buys **one video credit**, redeemable for one full 12-second rap video. Native provider resolution remains the existing 768p request; this work does not change generation resolution.
- On October 26, 2026, the user requested migration to their new live account `acct_1UUoIyCx8hSxeaUk`, whose public name is `airapvideo`. New Checkout Sessions explicitly use **AI Rap Video**, the site's waveform icon, and warm-dark branding. The former shared `guitarcanvas` account is retained only for historical payments and refunds; its public name was not changed.
- New-account product `prod_VVqmOFT5f023lz`; live one-time price `price_1UUp4uCx8hSxeaUkmSNWDyIh` for USD 890 cents.
- New-account webhook `we_1UUp4vCx8hSxeaUkXsO0OqiQ`: `https://ai-rapvideo.co/api/rap-credits/webhook`, API version `2025-04-30.basil`. Both accounts keep their own signing secrets and may deliver to this same endpoint.
- Worker configuration: `STRIPE_RAP_CREDIT_SECRET_KEY`, `STRIPE_RAP_CREDIT_ACCOUNT_ID`, `STRIPE_RAP_CREDIT_PRICE_ID`, `STRIPE_RAP_CREDIT_WEBHOOK_SECRET`, `STRIPE_RAP_CREDIT_LEGACY_ACCOUNTS`, `RAP_CREDIT_PAYMENTS_ENABLED=true`. Code and new secrets are deployed together using Wrangler's private `--secrets-file`; unlisted existing secrets are preserved. No secret values enter client code or version control.
- Stripe-hosted Checkout is opened through the URL returned by the server. This flow does not need a browser Public Key. The server fixes price, quantity, currency and account/order metadata; automatic currency conversion, promotions and tax additions are disabled for this fixed-price offer.

## Customer flow

1. A visitor can generate one actual 3-second preview per public IP, retaining the existing cross-browser restriction.
2. Sign in with Google or email to buy a video credit. Pricing and preview completion cards open the dedicated Checkout endpoint.
3. Stripe returns to the homepage; verified payment and the webhook both settle the same order idempotently. The account shows its purchased video-credit balance.
4. An explicit full-video button reserves one purchased credit and starts the current two-photo/scene/voice/topic 12-second rap template. Refresh and status checks do not create another video or consume another credit.
5. A confirmed generation failure triggers a full refund to the original payment method. The associated credit becomes unusable, preventing the user from retaining both cash and credit. Refund posting time depends on Stripe and the bank.

The existing pinned account `1127512642@qq.com` retains complimentary full-video access, checked by its immutable server-side account ID and email. Other unpaid accounts cannot obtain full generation by changing a request field.

The creator stays editable without login or credits. Generate checks the visitor's free-preview allowance, then prompts for login or a credit purchase when required; only an explicit eligible submission creates a video. The owner exemption remains server-controlled.

Photo Files, photo upload mode, theme, stage, voice choices and consent are saved as a per-tab IndexedDB draft. The oldest retained photo expires after 24 hours; editing controls does not extend its lifetime. OAuth and Checkout await a fresh draft save before leaving. Stripe opens in a separate tab, preserving the original creator; returning to it refreshes the credit status. Storage failures show an error and stop the redirect rather than silently discarding photos.

After server-confirmed payment, the old 3-second preview is dismissed, including on later task recovery. Photos and settings are retained. The creator shows the full-video button; payment does not automatically spend the purchased credit. Full-video tasks and results retain their existing recovery behavior. Login/payment cancellation leaves the draft and preview intact.

## Accounting and recovery

- New `rap_credit_order` table: one paid order represents one video credit. Available balance is counted only from settled, unused paid orders, never from the starter kit's `credit_balance` or promotional ledger.
- Registration no longer grants starter-kit bonus credits. Old balances/transactions remain unchanged and cannot fund this new video-credit path.
- States: `pending`, `available`, `starting`, `processing`, `succeeded`, `refund_pending`, `refunded`, `expired`.
- Conditional updates and unique indexes protect pending Checkout reuse, one active generation per account, request replay and the association between a credit order and its video task.
- Each full submission carries a stable request ID. Unknown provider submission responses remain reserved and are queried, never automatically submitted again. If no task can be confirmed after the interrupted-start interval, recovery requests a full refund.
- A new `RapCreditRecovery` Durable Object persists an alarm before Checkout or generation can create chargeable work. Recovery survives page closure, webhook retry and network failures.
- Stripe refund inventory is checked before paid generation. Manual partial refunds invalidate the affected credit but do not automatically refund additional money unless a technical generation failure requires the full-refund guarantee. Pending/partial/full states are reflected in the UI.
- Account migration routes reconciliation, payment verification and refunds by the order's immutable `stripeAccountId`. The webhook verifies each configured account's own signature and then validates the order/account association before handling it. A stale unpaid Checkout is expired on its original account before a new-account Checkout replaces it; a payment that wins the expiry race is settled instead. Uncertain recovery remains pending.
- The private legacy-account array retains the old account ID, API credential, USD8.90 price and webhook signing secret. The old product `prod_VVTAlb2SBE0Uj0`, price `price_1UUSEXKmWtIG8s90c1xFi1s5` and webhook `we_1UUSEYKmWtIG8s90hZxxHkLM` remain intact. The general `STRIPE_SECRET_KEY` also stays on the former account so historical USD4.99 payments/refunds are unaffected by the dedicated credit-key switch. Do not revoke old credentials while these obligations remain.
- New-site generic `/api/payment/initiate` returns 410, preventing purchases of unrelated template plans. Legacy video order/refund endpoints and their $4.99 amount constraints are retained for historical handling.

## Database/deployment

- Applied additive D1 migration `0009_rap_credit_orders.sql`: creates the dedicated ledger and adds nullable `video_task.rap_credit_order_id` with a unique index. No legacy payment table was rebuilt or old balance changed.
- Added Worker binding `RAP_CREDIT_RECOVERY` and SQLite Durable Object migration `rap-credit-recovery-v1`; regenerated Worker binding types.
- Homepage FAQ, pricing, structured offers and payment/privacy terms now describe the active free preview and paid pack. Payment redirects stay on the homepage; sitemap remains unchanged.

## Validation and manual handoff

- Production Stripe product, price and webhook creation/configuration succeeded.
- Remote D1 migration succeeded; TypeScript check and Cloudflare production build passed.
- Static client bundle check found no production Stripe private-key or webhook-secret values.
- Per the user's standing instruction, no real or simulated payment, webhook event, account signup or video-generation test was submitted. Manual payment/credit/full-generation/refund behavior still needs the user's verification.

Deployment version is recorded in the task completion message and `.wrangler/rap-credit-live-deploy.log` (ignored local deployment log).

October 26 account-migration deployment: `59626bb0-b382-4bf7-a5db-553183474a49`, confirmed at 100% traffic. Read-only checks confirmed the homepage responds, `/api/rap-credits` reports payments enabled, and both new-credit and retained legacy credentials are present as secret bindings. TypeScript, production build and Wrangler dry run passed; 111 generated code/configuration files were checked for embedded credential values with none found. No payment, webhook simulation or video generation was submitted. Local migration/verification records are in ignored `.wrangler/stripe-account-migration-*` and `.wrangler/stripe-migration-*` files.
