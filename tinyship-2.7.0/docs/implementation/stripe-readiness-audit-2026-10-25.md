# Stripe readiness audit — 2026-10-25

This records the state before the paid-pack implementation. The follow-up implementation and configuration are documented in [rap-credit-payments.md](rap-credit-payments.md).

## Conclusion

The project has a working live Stripe account and an older $4.99 per-video integration. The advertised $8.90 / one-credit / one-12-second-video purchase flow is not implemented or enabled. This audit did not activate payments, change Stripe settings, create Checkout Sessions, charge a card, issue refunds, or generate videos.

## Evidence and scope

- Read local configuration and application/payment/credit code.
- Listed secret **names only** on Cloudflare Worker `ai-rapvideo`.
- Used the existing ignored `apps/tanstack-app/.env.production.local` credential file for read-only Stripe API requests: account, price, active prices, webhook registrations and recent Checkout Sessions.
- Read production D1 table definitions and aggregate order/credit counts. No database rows were changed.
- Cloudflare does not return stored secret values: production secret presence was confirmed, but stored values were not retrieved or compared byte-for-byte with the local credential file. No end-to-end payment or webhook-delivery test was performed.

## Account and credentials

| Item | Finding |
| --- | --- |
| Existing Stripe account | `acct_1TXtuTKmWtIG8s90`, display/business name `guitarcanvas`, business URL `www.guitarcanvas.net`, country HK |
| Account readiness | `charges_enabled=true`, `payouts_enabled=true`, `details_submitted=true`, card payments active |
| Secret Key | Real live-mode key in the production credential file; authenticated successfully against Stripe. Worker has `STRIPE_SECRET_KEY`. No values are included in this report. |
| Public Key | No usable `STRIPE_PUBLIC_KEY` in the inspected configuration or production secret list. Root `.env` contains a placeholder. The existing hosted Checkout flow creates a Session server-side and redirects to its URL; it does not read the Public Key. |
| Video Price ID | Worker has `STRIPE_VIDEO_PRICE_ID`; local production value resolves to `price_1USUQxKmWtIG8s906I6fdXxy`, active/live, USD 499 cents, one-time |
| Video webhook signing secret | `STRIPE_VIDEO_WEBHOOK_SECRET` is present locally and in the Worker. Its per-endpoint association/signature was not tested. |
| Generic credit webhook secret | No production `STRIPE_WEBHOOK_SECRET` in the Worker secret list; local root value is a placeholder. The generic credit-payment webhook reads this different variable. |

Publishable keys and server-side keys have different uses; webhook signing secrets are separate, per-endpoint credentials. See [Stripe API keys](https://docs.stripe.com/keys) and [hosted Checkout](https://docs.stripe.com/checkout/quickstart).

## Live Stripe resources

- Configured product: `prod_VTRJLJSCf40cKB`, name **AI Rap Video**, active. Its URL remains `https://rumpelstiltskin-ai.co/`.
- Its active price is **$4.99**, not $8.90. The complete active-price listing had no $8.90 price.
- The account's sole registered webhook is enabled/live at `https://rumpelstiltskin-ai.co/api/video-checkout/webhook`. It listens for Checkout completion/asynchronous success/failure/expiry and charge/refund updates. No `ai-rapvideo.co` webhook was registered.
- Recent Stripe Sessions for the old application marker all use the old domain for success/cancel returns. There were 6 complete/paid and 3 expired/unpaid relevant Sessions.
- Production `video_purchase` has 9 old $4.99 records: 3 succeeded, 3 refunded, 3 expired. These database states are historical evidence, not a new refund test.
- The generic `order` table and dynamic `pricing_plan` table were empty. The credit ledger had bonuses and old video consumption, with no credit-purchase entries.

## Gaps before enabling the advertised pack

1. **Create a dedicated offer in the existing account.** Add an active live USD 890-cent, one-time price for one paid video credit. Preserve the shared old product/price and old webhook for historical processing. Configure new-site Checkout display/contact/return information rather than blindly changing shared account-wide settings.
2. **Choose and finish the credit path.** `config/videoPurchase.ts` still has `VIDEO_PAYMENT_REQUIRED=false` and `amount:499`. The old checkout endpoint is intentionally disabled. Homepage pricing and the preview card are display-only. Turning this flag on is insufficient.
3. **Do not reuse the old generation template.** `createPaidDanceCheckout()` still accepts old dancer/princess/customization fields and invokes `createDanceVideoOptions()` with the old dance template. Paid full videos must use the current two-photo rap template, chosen voices/scene/topic and server-owned 12-second duration.
4. **Configure a new-site webhook and its exact signing secret.** Register an `ai-rapvideo.co` endpoint for the chosen credit implementation. The old video webhook secret and generic credit webhook secret are separate variables. Webhook registration/delivery is required for reliable fulfillment; a browser success redirect is insufficient. See [Stripe webhooks](https://docs.stripe.com/webhooks).
5. **Connect payment, balance, generation and refunds.** Validate the paid Session's account/mode/amount/currency/price/order/user; grant exactly one credit once; atomically reserve/consume it for one full-video task; prevent duplicate webhook grants and concurrent double use. Associate the generation with its source paid order so a failure can receive the promised full original-payment refund while invalidating the corresponding credit. Do not silently replace the existing full-cash-refund promise with credit-only compensation.
6. **Keep historical accounting valid.** The production `video_purchase` table explicitly enforces `CHECK(amount = 499)`. Price verification and refund calculations also contain 499-cent constants. A dedicated new credit-order flow can preserve this legacy table; if reusing it, migrations and per-order historical amounts are required. Simply changing one constant to 890 would break the old flow/refunds.
7. **Separate legacy bonuses from purchased video credits.** `config/credits.ts` still enables 40 signup bonus credits. Production has actual 40-credit bonuses and non-anonymous accounts with 40-credit balances. They do not currently authorize new full videos, but must not become paid video credits when the new purchase flow is connected. This preserves the rule that only the specifically allowlisted account has complimentary full-video access.
8. **Strengthen the generic template before using it.** Generic `/api/payment/verify/stripe` only retrieves a Session and checks `payment_status`, without binding it to an authenticated owner/order/price. It does not itself grant credits, but must not be treated as payment entitlement. The generic Stripe webhook and fulfillment have reusable grant-once machinery, but need the new offer, full payment validation and Workers-compatible webhook verification connected to this product.
9. **Finish the frontend.** Add purchase actions, login gating, credit balance, payment-return reconciliation, pending/cancel/error states and the paid full-generation action. Preserve the existing account-specific complimentary rule and the one-time 3-second guest preview. Keep return UX on the homepage if retaining the single-page product.

## Reusable foundations

- Google/email authentication and owner-scoped video task storage.
- Current full 12-second rap prompt/options for the complimentary account, and separately enforced guest previews.
- Generic order/credit ledger and purchase-order unique index for granting credits once.
- Old paid-video state machine, signature verification with Web Crypto, task recovery through a Durable Object, refund leases/idempotency and historical order handling.

These are foundations to adapt; the new $8.90 credit pack is not ready merely because the Stripe Secret Key is present.
