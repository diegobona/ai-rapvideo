import Stripe from 'stripe';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@libs/database';
import { rapCreditOrder } from '@libs/database/schema';
import { getRapCreditConfig, rapCreditConfig, rapCreditPaymentsEnabled, type RapCreditStripeAccount } from '../../config/rapCredits';
import { PaidVideoError } from '../ai/paid-video';
import { findRapCreditOrderByIntent, getRapCreditOrder, type RapCreditOrder } from './rap-credit-orders';

export type RapRecovery = (id: string) => Promise<void>;
const clientAccounts = new WeakMap<Stripe, RapCreditStripeAccount>();
function stripeAccount(accountId?: string): RapCreditStripeAccount {
  const cfg = getRapCreditConfig();
  if (!accountId || accountId === cfg.accountId || (!cfg.accountId && !cfg.legacyAccounts.length)) return cfg;
  const legacy = cfg.legacyAccounts.find(account => account.accountId === accountId);
  if (!legacy) throw new PaidVideoError('payments_unavailable', 503);
  return legacy;
}
export function createRapStripeClient(accountId?: string) {
  const account = stripeAccount(accountId);
  const stripe = new Stripe(account.secretKey, {
    apiVersion: '2025-04-30.basil', httpClient: Stripe.createFetchHttpClient(), timeout: 10_000, maxNetworkRetries: 1,
  });
  clientAccounts.set(stripe, account);
  return stripe;
}
function stripeForOrder(order: RapCreditOrder, candidate?: Stripe) {
  if (order.amount !== 890 || order.currency !== 'usd' || !/^price_[A-Za-z0-9]+$/.test(order.stripePriceId))
    throw new PaidVideoError('invalid_payment', 400);
  const account = stripeAccount(order.stripeAccountId);
  const legacy = getRapCreditConfig().legacyAccounts.find(value => value.accountId === order.stripeAccountId);
  if (legacy && order.stripePriceId !== legacy.priceId) throw new PaidVideoError('invalid_payment', 400);
  const provided = candidate && clientAccounts.get(candidate);
  // Some generation callers pass one current client across several purchased
  // credits. Never use that client for an order purchased on a legacy account.
  return candidate && provided?.secretKey === account.secretKey ? candidate : createRapStripeClient(order.stripeAccountId);
}
const itemId = (value: string | { id: string } | null | undefined) => typeof value === 'string' ? value : value?.id;
const metadata = (order: RapCreditOrder) => ({ app: rapCreditConfig.appMarker, orderId: order.id, userId: order.userId, accountId: order.stripeAccountId });

async function checkoutParams(order: RapCreditOrder): Promise<Stripe.Checkout.SessionCreateParams> {
  const cfg = getRapCreditConfig();
  return {
    mode: 'payment', payment_method_types: ['card'], line_items: [{ price: order.stripePriceId, quantity: 1 }],
    client_reference_id: order.id, metadata: metadata(order), payment_intent_data: { metadata: metadata(order) },
    success_url: `${cfg.appBaseUrl}/?rap_checkout_session_id={CHECKOUT_SESSION_ID}#rap-maker`,
    cancel_url: `${cfg.appBaseUrl}/?rap_checkout=cancelled#pricing`,
    expires_at: Math.floor(order.createdAt.getTime() / 1000) + rapCreditConfig.checkoutLifetimeSeconds,
    allow_promotion_codes: false, adaptive_pricing: { enabled: false }, automatic_tax: { enabled: false },
    ...{ branding_settings: {
      display_name: 'AI Rap Video', background_color: '#191714', button_color: '#bba789',
      icon: { type: 'url', url: 'https://ai-rapvideo.co/android-chrome-512x512.png?v=wave1' },
    } },
  };
}
export async function createRapCreditCheckout(userId: string, schedule: RapRecovery) {
  if (!rapCreditPaymentsEnabled()) throw new PaidVideoError('payments_unavailable', 503);
  const stripe = createRapStripeClient();
  const cfg = getRapCreditConfig();
  const account = await stripe.accounts.retrieve();
  const price = await stripe.prices.retrieve(cfg.priceId);
  if ((cfg.accountId && account.id !== cfg.accountId) || !account.charges_enabled || !price.active || price.unit_amount !== 890 || price.currency !== 'usd' || price.type !== 'one_time' || price.livemode !== cfg.live)
    throw new PaidVideoError('payments_unavailable', 503);
  let [order] = await db.select().from(rapCreditOrder).where(and(eq(rapCreditOrder.userId, userId), eq(rapCreditOrder.state, 'pending'))).limit(1) as RapCreditOrder[];
  if (order) {
    await schedule(order.id);
    order = await reconcileRapCheckout(order);
    if (order.state === 'pending' && (order.stripeAccountId !== account.id || order.stripePriceId !== cfg.priceId))
      order = await retirePreviousCheckout(order);
    if (order.state !== 'pending') order = undefined as unknown as RapCreditOrder;
  }
  if (!order) {
    const id = nanoid();
    const now = new Date();
    await db.insert(rapCreditOrder).values({ id, userId, amount: 890, currency: 'usd', state: 'pending', stripeAccountId: account.id, stripePriceId: cfg.priceId, createdAt: now, updatedAt: now }).onConflictDoNothing();
    [order] = await db.select().from(rapCreditOrder).where(and(eq(rapCreditOrder.userId, userId), eq(rapCreditOrder.state, 'pending'))).limit(1);
  }
  if (!order || order.stripeAccountId !== account.id || order.stripePriceId !== cfg.priceId) throw new PaidVideoError('payments_unavailable', 503);
  // Durable alarm exists before Checkout can accept any payment.
  await schedule(order.id);
  if (!order.checkoutSessionId) {
    if (order.createdAt.getTime() + rapCreditConfig.checkoutLifetimeSeconds * 1000 - Date.now() < 30 * 60_000)
      throw new PaidVideoError('checkout_recovery_pending', 409);
    const session = await stripe.checkout.sessions.create(await checkoutParams(order), { idempotencyKey: `rap-credit-checkout-${order.id}` });
    if (!session.url || new URL(session.url).origin !== 'https://checkout.stripe.com') throw new Error('Invalid Stripe checkout URL');
    await db.update(rapCreditOrder).set({ checkoutSessionId: session.id, checkoutUrl: session.url, updatedAt: new Date() })
      .where(and(eq(rapCreditOrder.id, order.id), eq(rapCreditOrder.state, 'pending'), isNull(rapCreditOrder.checkoutSessionId)));
    order = (await getRapCreditOrder(order.id))!;
  }
  if (!order.checkoutUrl || !order.checkoutSessionId) throw new PaidVideoError('payments_unavailable', 503);
  return { orderId: order.id, checkoutUrl: order.checkoutUrl };
}

function validateSessionIdentity(session: Stripe.Checkout.Session, order: RapCreditOrder) {
  const cfg = stripeAccount(order.stripeAccountId);
  if ((order.checkoutSessionId && session.id !== order.checkoutSessionId) || session.mode !== 'payment'
    || session.livemode !== cfg.live || session.client_reference_id !== order.id || session.metadata?.app !== rapCreditConfig.appMarker
    || session.metadata?.orderId !== order.id || session.metadata?.userId !== order.userId || session.metadata?.accountId !== order.stripeAccountId)
    throw new PaidVideoError('invalid_payment', 400);
}
async function settleSession(session: Stripe.Checkout.Session, order: RapCreditOrder, stripe: Stripe) {
  validateSessionIdentity(session, order);
  if (session.status === 'expired') {
    await db.update(rapCreditOrder).set({ state: 'expired', checkoutSessionId: session.id, updatedAt: new Date() })
      .where(and(eq(rapCreditOrder.id, order.id), eq(rapCreditOrder.state, 'pending')));
  } else if (session.status === 'complete' && session.payment_status === 'paid') {
    const item = session.line_items?.data[0];
    const intentId = itemId(session.payment_intent);
    if (order.amount !== 890 || order.currency !== 'usd' || session.amount_total !== 890 || session.currency !== 'usd'
      || !intentId || !session.line_items || session.line_items.has_more || session.line_items.data.length !== 1
      || item?.quantity !== 1 || item.amount_total !== 890 || item.currency !== 'usd'
      || item.price?.id !== order.stripePriceId || item.price.unit_amount !== 890 || item.price.currency !== 'usd'
      || item.price.type !== 'one_time' || item.price.livemode !== session.livemode
      || session.total_details?.amount_discount !== 0 || session.total_details?.amount_tax !== 0)
      throw new PaidVideoError('invalid_payment', 400);
    const intent = await stripe.paymentIntents.retrieve(intentId);
    if (intent.status !== 'succeeded' || intent.currency !== 'usd' || intent.amount !== 890 || intent.amount_received !== 890
      || intent.livemode !== session.livemode || intent.metadata.app !== rapCreditConfig.appMarker || intent.metadata.orderId !== order.id
      || intent.metadata.userId !== order.userId || intent.metadata.accountId !== order.stripeAccountId)
      throw new PaidVideoError('invalid_payment', 400);
    // Grant only once. Retried webhooks never reset consumed/refunded credits.
    await db.update(rapCreditOrder).set({ state: 'available', checkoutSessionId: session.id, paymentIntentId: intentId, updatedAt: new Date() })
      .where(and(eq(rapCreditOrder.id, order.id), or(eq(rapCreditOrder.state, 'pending'), eq(rapCreditOrder.state, 'expired')), isNull(rapCreditOrder.paymentIntentId)));
  }
  return (await getRapCreditOrder(order.id))!;
}
export async function reconcileRapCheckout(order: RapCreditOrder, candidate?: Stripe): Promise<RapCreditOrder> {
  if (order.state !== 'pending') return order;
  const stripe = stripeForOrder(order, candidate);
  let id = order.checkoutSessionId;
  if (!id) {
    // Read-only recovery searches the entire possible creation window, including
    // late idempotent retries. GETs and alarms never create a fresh Checkout.
    if (Date.now() - order.createdAt.getTime() > 30_000) {
      let after: string | undefined;
      let exhausted = false;
      for (let page = 0; page < 20; page++) {
        const sessions = await stripe.checkout.sessions.list({ limit: 100, created: { gte: Math.floor(order.createdAt.getTime() / 1000) - 2, lte: Math.floor(order.createdAt.getTime() / 1000) + rapCreditConfig.checkoutLifetimeSeconds }, ...(after ? { starting_after: after } : {}) });
        const found = sessions.data.find(session => session.metadata?.app === rapCreditConfig.appMarker && session.metadata.orderId === order.id);
        if (found) { id = found.id; break; }
        if (!sessions.has_more) { exhausted = true; break; }
        after = sessions.data.at(-1)?.id;
      }
      if (!id && exhausted && Date.now() >= order.createdAt.getTime() + rapCreditConfig.checkoutLifetimeSeconds * 1000 + 30_000) {
        await db.update(rapCreditOrder).set({ state: 'expired', updatedAt: new Date() }).where(and(eq(rapCreditOrder.id, order.id), eq(rapCreditOrder.state, 'pending')));
        return (await getRapCreditOrder(order.id))!;
      }
    } else return order;
  }
  if (!id) return order;
  const session = await stripe.checkout.sessions.retrieve(id, { expand: ['line_items.data.price'] });
  validateSessionIdentity(session, order);
  if (!order.checkoutSessionId) {
    await db.update(rapCreditOrder).set({ checkoutSessionId: session.id, checkoutUrl: session.url || null, updatedAt: new Date() })
      .where(and(eq(rapCreditOrder.id, order.id), isNull(rapCreditOrder.checkoutSessionId)));
    order = (await getRapCreditOrder(order.id))!;
  }
  return settleSession(session, order, stripe);
}
/** Replacing an unpaid checkout must not cancel a payment that just completed. */
async function retirePreviousCheckout(order: RapCreditOrder): Promise<RapCreditOrder> {
  if (!order.checkoutSessionId) throw new PaidVideoError('checkout_recovery_pending', 409);
  const stripe = stripeForOrder(order);
  let session = await stripe.checkout.sessions.retrieve(order.checkoutSessionId, { expand: ['line_items.data.price'] });
  validateSessionIdentity(session, order);
  if (session.status === 'open') {
    try {
      session = await stripe.checkout.sessions.expire(session.id, {}, { idempotencyKey: `rap-credit-retire-${order.id}` });
    } catch (error) {
      // A completed payment wins a race with expiry. Re-read its authoritative
      // status; uncertain transport errors leave the order pending for recovery.
      if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) throw error;
      session = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items.data.price'] });
    }
  }
  if (session.status === 'complete' && session.payment_status === 'paid' && !session.line_items)
    session = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items.data.price'] });
  const settled = await settleSession(session, order, stripe);
  if (settled.state === 'pending') throw new PaidVideoError('checkout_recovery_pending', 409);
  return settled;
}
export async function verifyRapCreditCheckout(sessionId: string, userId: string, schedule: RapRecovery) {
  if (!/^cs_(test_|live_)?[A-Za-z0-9]{10,}$/.test(sessionId) || sessionId.length > 255) throw new PaidVideoError('invalid_payment', 400);
  const [order] = await db.select().from(rapCreditOrder)
    .where(and(eq(rapCreditOrder.checkoutSessionId, sessionId), eq(rapCreditOrder.userId, userId))).limit(1) as RapCreditOrder[];
  if (!order) throw new PaidVideoError('not_found', 404);
  return verifyOrderCheckout(sessionId, order, schedule);
}
async function verifyOrderCheckout(sessionId: string, order: RapCreditOrder, schedule: RapRecovery, candidate?: Stripe) {
  const stripe = stripeForOrder(order, candidate);
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items.data.price'] });
  validateSessionIdentity(session, order);
  await schedule(order.id);
  const settled = await settleSession(session, order, stripe);
  await refreshRapCreditRefunds(settled, stripe);
  await schedule(order.id);
  return (await getRapCreditOrder(order.id))!;
}

/** Refund inventory is authoritative, including dashboard refunds and pending reservations. */
export async function refreshRapCreditRefunds(order: RapCreditOrder, candidate?: Stripe): Promise<RapCreditOrder> {
  if (!order.paymentIntentId) return order;
  const stripe = stripeForOrder(order, candidate);
  const refunds: Stripe.Refund[] = [];
  let after: string | undefined;
  for (let page = 0; page < 10; page++) {
    const result = await stripe.refunds.list({ payment_intent: order.paymentIntentId, limit: 100, ...(after ? { starting_after: after } : {}) });
    refunds.push(...result.data);
    if (!result.has_more) break;
    if (page === 9) throw new Error('Refund inventory incomplete');
    after = result.data.at(-1)?.id;
  }
  const completed = refunds.filter(refund => refund.status === 'succeeded');
  const pending = refunds.filter(refund => refund.status === 'pending' || refund.status === 'requires_action');
  const amount = completed.reduce((sum, refund) => sum + refund.amount, 0);
  if (amount > 890 || refunds.some(refund => refund.currency !== 'usd' || itemId(refund.payment_intent) !== order.paymentIntentId)) throw new Error('Invalid refund inventory');
  const reserved = pending.reduce((sum, refund) => sum + refund.amount, 0);
  if (amount || pending.length) {
    const full = amount === 890;
    // A manual partial refund invalidates its credit, but does not authorize us
    // to send the remaining cash. Only a failed generation sets refundRequired.
    const partialComplete = !full && amount > 0 && pending.length === 0;
    await db.update(rapCreditOrder).set({
      state: full ? 'refunded' : partialComplete ? sql`CASE WHEN ${rapCreditOrder.refundRequired} THEN 'refund_pending' ELSE 'refunded' END` : 'refund_pending',
      refundRequired: full ? false : sql`${rapCreditOrder.refundRequired}`,
      refundedAmount: amount,
      refundStatus: full ? 'succeeded' : partialComplete ? sql`CASE WHEN ${rapCreditOrder.refundRequired} THEN 'pending' ELSE 'partially_refunded' END` : 'pending',
      refundId: (pending[0] || completed[0]).id,
      updatedAt: new Date(),
    }).where(eq(rapCreditOrder.id, order.id));
    order = (await getRapCreditOrder(order.id))!;
  }
  if (!order.refundRequired || amount === 890 || reserved > 0) return order;
  const lease = new Date(Date.now() + rapCreditConfig.refundLeaseMs);
  const [claimed] = await db.update(rapCreditOrder).set({ refundLeaseUntil: lease })
    .where(and(eq(rapCreditOrder.id, order.id), eq(rapCreditOrder.state, 'refund_pending'), eq(rapCreditOrder.refundRequired, true),
      or(isNull(rapCreditOrder.refundLeaseUntil), lt(rapCreditOrder.refundLeaseUntil, new Date())))).returning();
  if (!claimed) return order;
  try {
    // Failed/cancelled refund IDs change the key; uncertain network responses do not.
    const priorIds = refunds.filter(refund => refund.status === 'failed' || refund.status === 'canceled').map(refund => refund.id).sort().join(',');
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(priorIds));
    const suffix = Array.from(new Uint8Array(hash)).slice(0, 12).map(value => value.toString(16).padStart(2, '0')).join('');
    const refund = await stripe.refunds.create({ payment_intent: order.paymentIntentId!, amount: 890 - amount, reason: 'requested_by_customer', metadata: metadata(order) }, { idempotencyKey: `rap-credit-refund-${order.id}-${amount}-${suffix}` });
    if (refund.status === 'failed' || refund.status === 'canceled') {
      await db.update(rapCreditOrder).set({ refundId: refund.id, refundStatus: refund.status, refundAttempt: sql`${rapCreditOrder.refundAttempt} + 1`, updatedAt: new Date() }).where(eq(rapCreditOrder.id, order.id));
    } else {
      const succeeded = refund.status === 'succeeded';
      await db.update(rapCreditOrder).set({ refundId: refund.id, refundStatus: refund.status || 'pending', refundedAmount: succeeded ? 890 : amount,
        state: succeeded ? 'refunded' : 'refund_pending', refundRequired: !succeeded, updatedAt: new Date() }).where(eq(rapCreditOrder.id, order.id));
    }
  } finally {
    await db.update(rapCreditOrder).set({ refundLeaseUntil: null }).where(and(eq(rapCreditOrder.id, order.id), eq(rapCreditOrder.refundLeaseUntil, lease)));
  }
  return (await getRapCreditOrder(order.id))!;
}

export async function handleRapCreditWebhook(body: string, signature: string, schedule: RapRecovery) {
  const cfg = getRapCreditConfig();
  let verified: { event: Stripe.Event; stripe: Stripe; account: RapCreditStripeAccount } | undefined;
  for (const account of [cfg, ...cfg.legacyAccounts]) {
    const stripe = createRapStripeClient(account.accountId || undefined);
    try {
      const event = await stripe.webhooks.constructEventAsync(body, signature, account.webhookSecret, undefined, Stripe.createSubtleCryptoProvider());
      verified = { event, stripe, account };
      break;
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'StripeSignatureVerificationError') throw error;
    }
  }
  if (!verified) throw new PaidVideoError('invalid_payment', 400);
  const { event, stripe, account } = verified;
  if (event.livemode !== account.live || event.account) throw new PaidVideoError('invalid_payment', 400);
  const validateWebhookOrder = (order: RapCreditOrder) => {
    if (stripeAccount(order.stripeAccountId).secretKey !== account.secretKey
      || (account.accountId && order.stripeAccountId !== account.accountId) || order.amount !== 890 || order.currency !== 'usd')
      throw new PaidVideoError('invalid_payment', 400);
    stripeForOrder(order, stripe);
  };
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded' || event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.app !== cfg.appMarker) return;
    const order = session.metadata.orderId ? await getRapCreditOrder(session.metadata.orderId) : undefined;
    if (!order) throw new PaidVideoError('not_found', 404);
    validateWebhookOrder(order);
    validateSessionIdentity(session, order);
    await verifyOrderCheckout(session.id, order, schedule, stripe);
  } else if (['charge.refunded', 'refund.created', 'refund.updated', 'refund.failed'].includes(event.type)) {
    const object = event.data.object as Stripe.Refund | Stripe.Charge;
    const intentId = itemId(object.payment_intent);
    const order = intentId ? await findRapCreditOrderByIntent(intentId) : undefined;
    if (!order) return;
    validateWebhookOrder(order);
    // Refund objects have no livemode field; their mode comes from the signed
    // enclosing event and the account-specific API client.
    if (object.currency !== 'usd' || (object.object === 'charge' && object.livemode !== account.live)) throw new PaidVideoError('invalid_payment', 400);
    await schedule(order.id);
    await refreshRapCreditRefunds(order, stripe);
    await schedule(order.id);
  }
}
