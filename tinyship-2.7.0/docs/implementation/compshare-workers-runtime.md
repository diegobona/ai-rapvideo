# Compshare submission on Workers

The October 20 follow-up incident was a server-runtime compatibility bug, separate from the prior provider rejection of political figures. The native adapter passed `redirect: 'error'` to `fetch`. Workers rejects this mode with a `TypeError` before sending any bytes, so paid orders were left `starting` without a provider task ID. Node accepts the option, so the earlier Node-based provider tests and simulated browser requests did not catch this production failure.

The adapter now uses `redirect: 'manual'`. Its existing non-2xx check rejects 3xx without following redirects or forwarding the API key. Both submission and status reads use the corrected request helper. This matches the [Workers Request contract](https://developers.cloudflare.com/workers/runtime-apis/request/#parameters).

## Reproduction and live recovery

A temporary authenticated diagnostic Worker reproduced the exact pre-network `TypeError` in zero milliseconds for both GET and POST. Changing only the redirect mode returned the real balance (HTTP 200) and the expected HTTP 400 for a deliberately impossible model with empty content. No video could be created by that probe. The temporary Worker and its duplicate local secret file were removed after the check.

Initial request fix: `b2cb397e-ca68-4a24-9023-39b8f72407d7`. Final deployment including the paid waiting budget: `a9c09314-ca2c-4bfa-9ef9-a876d06fe7ae`. After independently checking the original payment succeeded and had no refunds, order `17944be4-8725-4c8a-aac5-426dbb5a638a` was released from its unsubmitted claim back to `paid`. Frozen inputs and the original `dance-{purchaseId}` idempotency key were retained. The existing recovery alarm submitted it from the actual production Worker and persisted task `01a1595b-385a-796d-a8ff-fb28ab2e9230`. D1 entered `processing`; the real provider independently confirmed `running` with no rejection error. No new checkout or Stripe payment was created. This verifies accepted submission and processing, not a completed video or likeness quality.

The provider estimated more than ten minutes remaining. Paid browser polling now has a thirty-minute budget so the old ten-minute deadline does not prematurely report a live job as timed out. Legacy defaults, explicit caller deadlines, browser cancellation, two-minute reassurance and background recovery remain intact.

## Verification

Tests first reproduce the actual Workers exception and the eleven-minute paid polling timeout. The final 304 AI/payment tests pass, including real workerd submission/status requests, original idempotency headers, redirect rejection without credential forwarding, content-rejection refunds and waiting beyond eleven minutes. Typecheck, Cloudflare build and deployment dry run are recorded separately. Evidence: ignored `test-results/compshare-runtime-*`, `compshare-redirect-*` and `compshare-paid-wait-red.log`. Runtime tests mock transport inside real workerd; the recovered user order is the real production submission check.

The focused browser check also passes on the final published site: input recovery, two-minute reassurance, continued processing after thirteen minutes of virtual time, success, download and repeat checkout with mocked mutations. Evidence: `compshare-redirect-live-e2e.log`. Final real-order read-back shows D1 `processing` with an active recovery update at 12:56:17 UTC and provider `running`, estimated remaining 260 seconds. The estimate is not a completion promise; no completed result is claimed in this incident report.
