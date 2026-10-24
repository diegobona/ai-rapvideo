import Stripe from 'stripe';
import { getVideoPurchaseConfig, videoPurchaseConfig } from '../../config/videoPurchase';
import type { VideoPurchase } from './video-purchases';

type PaymentConfig = ReturnType<typeof getVideoPurchaseConfig>;
type SessionPurchase = Pick<
  VideoPurchase,
  'id' | 'userId' | 'checkoutSessionId' | 'amount' | 'currency'
>;
export class VideoCheckoutDraftExpired extends Error {}
export class VideoCheckoutNotFound extends Error {}
export const createVideoStripeClient = (requestBudgetMs?: number) =>
  new Stripe(getVideoPurchaseConfig().secretKey, {
    apiVersion: '2025-04-30.basil',
    httpClient: Stripe.createFetchHttpClient(),
    timeout: requestBudgetMs === undefined ? 10_000 : Math.max(1, Math.min(5_000, requestBudgetMs)),
    maxNetworkRetries: requestBudgetMs === undefined ? 1 : 0,
  });
function checkBudget(deadline?: number) {
  if (deadline !== undefined && Date.now() >= deadline)
    throw new Error('Video payment work exceeded its time budget');
}
export function videoCheckoutUrls(appBaseUrl: string, returnPath: string) {
  if (
    !['/', '/rumpelstiltskin-ai-video-generator', '/rumpelstiltskin-dance-video'].includes(
      returnPath,
    )
  )
    throw new Error('Invalid checkout return path');
  const base = new URL(appBaseUrl).origin + returnPath;
  return {
    success_url: `${base}?checkout_session_id={CHECKOUT_SESSION_ID}#rap-maker`,
    cancel_url: `${base}?checkout=cancelled#rap-maker`,
  };
}
export function validateOwnedVideoImage(value: unknown, userId: string, publicUrl: string): string {
  if (typeof value !== 'string' || /[%\\?#]/.test(value)) throw new Error('Invalid photo URL');
  const parsed = new URL(value);
  const base = new URL(publicUrl);
  const prefix = `/uploads/${userId}/`;
  if (
    parsed.protocol !== 'https:' ||
    base.protocol !== 'https:' ||
    base.pathname !== '/' ||
    parsed.origin !== base.origin ||
    parsed.username ||
    parsed.password ||
    !parsed.pathname.startsWith(prefix) ||
    value.includes('/../') ||
    value.includes('/./')
  )
    throw new Error('Photo does not belong to this session');
  const filename = parsed.pathname.slice(prefix.length);
  if (!/^[\w-][\w.-]*\.(jpe?g|png|webp)$/i.test(filename) || filename.includes('..'))
    throw new Error('Invalid photo object');
  return parsed.pathname.slice(1);
}
export function validateVideoCheckoutSession(
  session: Stripe.Checkout.Session,
  purchase: SessionPurchase,
  cfg: PaymentConfig = getVideoPurchaseConfig(),
): string {
  const items = session.line_items;
  const item = items?.data[0];
  const price = item?.price;
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;
  if (
    session.id !== purchase.checkoutSessionId ||
    session.mode !== 'payment' ||
    session.status !== 'complete' ||
    session.payment_status !== 'paid' ||
    session.livemode !== cfg.live ||
    session.amount_total !== videoPurchaseConfig.amount ||
    session.currency !== 'usd' ||
    purchase.amount !== 499 ||
    purchase.currency !== 'usd' ||
    session.client_reference_id !== purchase.id ||
    session.metadata?.app !== videoPurchaseConfig.appMarker ||
    session.metadata?.purchaseId !== purchase.id ||
    session.metadata?.userId !== purchase.userId ||
    !items ||
    items.has_more ||
    items.data.length !== 1 ||
    item?.quantity !== 1 ||
    item.amount_total !== 499 ||
    item.currency !== 'usd' ||
    price?.id !== cfg.priceId ||
    price.unit_amount !== 499 ||
    price.currency !== 'usd' ||
    price.type !== 'one_time' ||
    !paymentIntentId
  ) {
    throw new Error('Video payment verification failed');
  }
  return paymentIntentId;
}
export async function createVideoCheckout(
  purchase: VideoPurchase,
  stripe: Stripe = createVideoStripeClient(),
  cfg: PaymentConfig = getVideoPurchaseConfig(),
  beforeCreate?: () => Promise<void | { id: string; url: string }>,
) {
  if (purchase.checkoutSessionId && purchase.checkoutUrl)
    return { id: purchase.checkoutSessionId, url: purchase.checkoutUrl };
  const price = await stripe.prices.retrieve(cfg.priceId);
  if (
    !price.active ||
    price.livemode !== cfg.live ||
    price.unit_amount !== 499 ||
    price.currency !== 'usd' ||
    price.type !== 'one_time' ||
    price.billing_scheme !== 'per_unit'
  )
    throw new Error('Video price is not configured correctly');
  const expiresAt =
    Math.floor(purchase.createdAt.getTime() / 1000) + videoPurchaseConfig.checkoutLifetimeSeconds;
  if (expiresAt - Math.floor(Date.now() / 1000) < 30 * 60 + 10) {
    const recovered = await recoverVideoCheckoutSession(purchase, stripe);
    if (recovered?.status === 'expired')
      throw new VideoCheckoutDraftExpired('The recovered Stripe session has expired');
    if (recovered?.url) return { id: recovered.id, url: recovered.url };
    if (!recovered)
      throw new VideoCheckoutDraftExpired('No Stripe session exists for this old draft');
    throw new Error('The existing checkout requires payment recovery');
  }
  const metadata = {
    app: videoPurchaseConfig.appMarker,
    purchaseId: purchase.id,
    userId: purchase.userId,
  };
  const concurrent = await beforeCreate?.();
  if (concurrent) return concurrent;
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: cfg.priceId, quantity: 1 }],
      client_reference_id: purchase.id,
      metadata,
      payment_intent_data: { metadata },
      // Supported by this API version; the installed SDK predates this field.
      // Override this project's session only, preserving account-wide branding.
      ...{ branding_settings: videoPurchaseConfig.checkoutBranding },
      ...videoCheckoutUrls(cfg.appBaseUrl, purchase.returnPath),
      expires_at: expiresAt,
      allow_promotion_codes: false,
      automatic_tax: { enabled: false },
      adaptive_pricing: { enabled: false },
    },
    { idempotencyKey: `video-checkout:${purchase.id}` },
  );
  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return { id: session.id, url: session.url };
}
export async function retrieveVideoCheckout(
  sessionId: string,
  stripe: Stripe = createVideoStripeClient(),
  deadline?: number,
) {
  checkBudget(deadline);
  if (!/^cs_[\w]+$/.test(sessionId)) throw new Error('Invalid checkout session');
  try {
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price'],
    });
  } catch (error) {
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === 'resource_missing'
    )
      throw new VideoCheckoutNotFound('Checkout session not found');
    throw error;
  }
}
export async function recoverVideoCheckoutSession(
  purchase: VideoPurchase,
  stripe: Stripe,
  workDeadline?: number,
) {
  const deadline = Math.min(Date.now() + 15_000, workDeadline ?? Infinity);
  let starting_after: string | undefined;
  for (let page = 0; page < 10; page++) {
    if (Date.now() >= deadline) throw new Error('Checkout recovery scan exceeded its time budget');
    const batch = await stripe.checkout.sessions.list({
      created: {
        gte: Math.floor(purchase.createdAt.getTime() / 1000) - 60,
        lte:
          Math.floor(purchase.createdAt.getTime() / 1000) +
          videoPurchaseConfig.checkoutLifetimeSeconds,
      },
      limit: 100,
      ...(starting_after ? { starting_after } : {}),
    });
    const session = batch.data.find(
      (s) =>
        s.client_reference_id === purchase.id &&
        s.metadata?.app === videoPurchaseConfig.appMarker &&
        s.metadata.purchaseId === purchase.id &&
        s.metadata.userId === purchase.userId,
    );
    if (session) return retrieveVideoCheckout(session.id, stripe, deadline);
    if (!batch.has_more) return undefined;
    starting_after = batch.data.at(-1)?.id;
    if (!starting_after) break;
  }
  throw new Error('Could not completely recover checkout');
}
/** Read all existing refunds before any creation, including after Stripe's idempotency retention window. */
export async function listVideoPaymentRefunds(
  paymentIntentId: string,
  stripe: Stripe,
  workDeadline?: number,
) {
  const deadline = Math.min(Date.now() + 15_000, workDeadline ?? Infinity);
  const refunds: Stripe.Refund[] = [];
  let starting_after: string | undefined;
  for (let page = 0; page < 10; page++) {
    if (Date.now() >= deadline) throw new Error('Refund verification exceeded its time budget');
    const batch = await stripe.refunds.list({
      payment_intent: paymentIntentId,
      limit: 100,
      ...(starting_after ? { starting_after } : {}),
    });
    refunds.push(...batch.data);
    if (!batch.has_more) return refunds;
    starting_after = batch.data.at(-1)?.id;
    if (!starting_after) break;
  }
  throw new Error('Could not completely verify existing refunds');
}
export async function refreshVideoPaymentRefunds(
  purchase: VideoPurchase,
  stripe: Stripe = createVideoStripeClient(),
  deadline?: number,
) {
  if (!purchase.paymentIntentId) return purchase;
  const refunds = await listVideoPaymentRefunds(purchase.paymentIntentId, stripe, deadline);
  if (!refunds.length) return purchase;
  const succeeded = refunds.filter((r) => r.status === 'succeeded');
  const amount = succeeded.reduce((sum, r) => sum + r.amount, 0);
  const pending = refunds.find((r) => r.status === 'pending' || r.status === 'requires_action');
  const relevant = pending || refunds[0];
  if (relevant) {
    const store = await import('./video-purchases');
    const status =
      amount >= 499
        ? 'succeeded'
        : pending
          ? 'pending'
          : relevant.status === 'failed' || relevant.status === 'canceled'
            ? 'failed'
            : amount > 0
              ? 'partial'
              : 'failed';
    await store.recordVideoRefund(purchase.id, { id: relevant.id, status, amount });
    return (await store.getVideoPurchase(purchase.id))!;
  }
  return purchase;
}
export async function refundPaidVideoPurchase(
  purchaseId: string,
  stripe: Stripe = createVideoStripeClient(),
  deadline?: number,
) {
  checkBudget(deadline);
  const store = await import('./video-purchases');
  let purchase = await store.claimVideoRefund(purchaseId);
  if (!purchase?.paymentIntentId) return store.getVideoPurchase(purchaseId);
  purchase = await refreshVideoPaymentRefunds(purchase, stripe, deadline);
  if (purchase.state === 'refunded' || purchase.refundStatus === 'pending') return purchase;
  if (purchase.refundStatus === 'failed' && purchase.refundId) {
    await store.advanceFailedVideoRefund(purchase.id, purchase.refundId);
    purchase = (await store.getVideoPurchase(purchase.id))!;
  }
  checkBudget(deadline);
  const refund = await stripe.refunds.create(
    {
      payment_intent: purchase.paymentIntentId!,
      amount: 499 - purchase.refundedAmount,
      reason: 'requested_by_customer',
      metadata: {
        app: videoPurchaseConfig.appMarker,
        purchaseId: purchase.id,
        reason: 'technical_generation_failure',
      },
    },
    {
      idempotencyKey: `video-refund:${purchase.id}:${purchase.refundAttempt}:${499 - purchase.refundedAmount}`,
    },
  );
  // The response may be pending. Aggregate with Stripe instead of claiming money
  // has returned from a locally queued request or from a single partial refund.
  await store.recordVideoRefund(purchase.id, {
    id: refund.id,
    status: refund.status === 'succeeded' ? 'partial' : refund.status || 'pending',
    amount: purchase.refundedAmount,
  });
  return refreshVideoPaymentRefunds((await store.getVideoPurchase(purchase.id))!, stripe, deadline);
}
