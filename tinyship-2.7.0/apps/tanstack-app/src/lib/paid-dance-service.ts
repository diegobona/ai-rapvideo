import type Stripe from 'stripe';
import { getVideoPurchaseConfig, videoPurchaseConfig } from '../../../../config/videoPurchase';
import {
  PaidVideoError,
  PaidVideoInputMissing,
  publicPaidVideoPurchase,
  startPaidVideoPurchase,
  type PaidVideoDependencies,
} from '@libs/ai/paid-video';
import { validateVideoGenerationOptions } from '@libs/ai/video';
import type { VideoGenerationOptions } from '@libs/ai/types';
import type { VideoResultStorage } from '@libs/ai/video-result-storage';
import * as purchases from '@libs/payment/video-purchases';
import {
  createVideoCheckout,
  createVideoStripeClient,
  refreshVideoPaymentRefunds,
  retrieveVideoCheckout,
  validateOwnedVideoImage,
  validateVideoCheckoutSession,
  videoCheckoutUrls,
  VideoCheckoutDraftExpired,
  VideoCheckoutNotFound,
} from '@libs/payment/video-stripe';
import { createDanceVideoOptions, DANCE_REFERENCE_KEYS } from './dance-template';
import { schedulePaidVideoRecovery } from './paid-video-recovery';

type Bucket = { head(key: string): Promise<unknown | null> };
async function photoStorage() {
  let publicUrl = process.env.R2_PUBLIC_URL || '';
  let bucket: Bucket | undefined;
  try {
    const { env } = await import('cloudflare:workers');
    publicUrl = String(env.R2_PUBLIC_URL || publicUrl);
    bucket = env.R2_BUCKET as Bucket | undefined;
  } catch {
    /* Node deployments validate URLs using their configured public origin. */
  }
  return { publicUrl, bucket };
}
async function validateStoredPhotos(options: VideoGenerationOptions, userId: string) {
  const { publicUrl, bucket } = await photoStorage();
  const base = new URL(publicUrl);
  for (const value of options.referenceImageUrls || []) {
    const url = new URL(value);
    const reference =
      Object.values(DANCE_REFERENCE_KEYS).includes(
        url.pathname.slice(1) as (typeof DANCE_REFERENCE_KEYS)[keyof typeof DANCE_REFERENCE_KEYS],
      ) &&
      url.origin === base.origin &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password;
    const key = reference
      ? url.pathname.slice(1)
      : validateOwnedVideoImage(value, userId, publicUrl);
    if (bucket && !(await bucket.head(key))) throw new PaidVideoInputMissing('Photo unavailable');
  }
  // Motion references are server-configured and frozen in the order. Check local
  // R2 objects too; old saved references do not depend on the current env value.
  for (const value of options.referenceVideoUrls || []) {
    const url = new URL(value);
    if (url.origin === base.origin && bucket && !(await bucket.head(url.pathname.slice(1)))) {
      throw new PaidVideoInputMissing('Reference video unavailable');
    }
  }
}
export async function paidDanceDependencies(stripe?: Stripe, recovery = true): Promise<PaidVideoDependencies> {
  let resultStorage: VideoResultStorage | undefined;
  if (typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined') {
    const [{ env }, { createManagedVideoResultStorage }] = await Promise.all([
      import('cloudflare:workers'),
      import('@libs/ai/video-result-storage'),
    ]);
    if (!env.R2_BUCKET || typeof env.R2_PUBLIC_URL !== 'string' || !env.R2_PUBLIC_URL.trim()) {
      throw new PaidVideoError('video_service_unavailable', 503);
    }
    resultStorage = createManagedVideoResultStorage({ bucket: env.R2_BUCKET, publicUrl: env.R2_PUBLIC_URL });
  }
  return {
    ...(stripe ? { stripe } : {}),
    ...(recovery ? { scheduleRecovery: schedulePaidVideoRecovery } : {}),
    ...(resultStorage ? { resultStorage } : {}),
    validateInputs: async (options, userId) => {
      validateVideoGenerationOptions(options);
      await validateStoredPhotos(options, userId);
    },
  };
}
export async function createPaidDanceCheckout(input: unknown, userId: string) {
  const cfg = getVideoPurchaseConfig();
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new PaidVideoError('invalid_video_request', 400);
  const body = input as Record<string, unknown>;
  if (
    Object.keys(body).some(
      (key) => !['dancerImageUrl', 'princessImageUrl', 'sceneImageUrl', 'returnPath', 'customDescription', 'quickTags', 'orientation'].includes(key),
    ) ||
    typeof body.returnPath !== 'string'
  )
    throw new PaidVideoError('invalid_video_request', 400);
  let options: VideoGenerationOptions;
  try {
    videoCheckoutUrls(cfg.appBaseUrl, body.returnPath);
    const { publicUrl } = await photoStorage();
    validateOwnedVideoImage(body.dancerImageUrl, userId, publicUrl);
    if (body.princessImageUrl !== undefined)
      validateOwnedVideoImage(body.princessImageUrl, userId, publicUrl);
    // Obsolete scene input from cached clients has no effect on new fixed-source
    // drafts. It is neither fetched nor validated as a purchased reference.
    options = createDanceVideoOptions({ ...body, danceTemplate: 'rumpelstiltskin-v2' }, publicUrl);
    await validateStoredPhotos(options, userId);
  } catch {
    throw new PaidVideoError('invalid_video_request', 400);
  }
  try {
    validateVideoGenerationOptions(options);
  } catch {
    throw new PaidVideoError('video_service_unavailable', 503);
  }
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify([userId, options, body.returnPath])),
  );
  const draftKey = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join(
    '',
  );
  let purchase = await purchases.createVideoPurchaseDraft(
    userId,
    options,
    body.returnPath,
    draftKey,
  );
  const stripe = createVideoStripeClient();
  let checkout: { id: string; url: string } | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    // Handoff must be durable before any chargeable session is created,
    // including a replacement draft after safe expiry recovery.
    await schedulePaidVideoRecovery(purchase.id);
    try {
      checkout = await createVideoCheckout(purchase, stripe, cfg, async () => {
        if (!(await purchases.noteVideoCheckoutAttempt(purchase.id, userId))) {
          const concurrent = await purchases.getVideoPurchase(purchase.id, userId);
          if (concurrent?.checkoutSessionId && concurrent.checkoutUrl)
            return { id: concurrent.checkoutSessionId, url: concurrent.checkoutUrl };
          throw new PaidVideoError('checkout_processing', 409);
        }
      });
      break;
    } catch (error) {
      if (!(error instanceof VideoCheckoutDraftExpired)) throw error;
      const retired = await purchases.retireUnattachedVideoDraft(purchase.id, userId);
      if (!retired) throw new PaidVideoError('checkout_processing', 409);
      purchase = await purchases.createVideoPurchaseDraft(
        userId,
        options,
        body.returnPath,
        draftKey,
      );
    }
  }
  if (!checkout) throw new Error('Checkout recovery requires retry');
  const attached = await purchases.attachVideoCheckout(
    purchase.id,
    userId,
    checkout.id,
    checkout.url,
  );
  // A simultaneous webhook can already have settled this exact draft.
  const current = attached || (await purchases.getVideoPurchase(purchase.id, userId));
  if (current?.checkoutSessionId !== checkout.id)
    throw new Error('Checkout persistence requires retry');
  return { purchaseId: purchase.id, checkoutUrl: checkout.url };
}
/** Browser returns and webhooks share the exact same authoritative fulfillment. */
export async function verifyPaidDanceSession(
  sessionId: string,
  userId?: string,
  stripe: Stripe = createVideoStripeClient(),
) {
  let session: Stripe.Checkout.Session;
  try {
    session = await retrieveVideoCheckout(sessionId, stripe);
  } catch (error) {
    if (error instanceof VideoCheckoutNotFound) throw new PaidVideoError('not_found', 404);
    throw error;
  }
  if (session.metadata?.app !== videoPurchaseConfig.appMarker || !session.metadata.purchaseId)
    throw new PaidVideoError('not_found', 404);
  let purchase = await purchases.getVideoPurchase(session.metadata.purchaseId, userId);
  if (!purchase) throw new PaidVideoError('not_found', 404);
  if (
    session.metadata.userId !== purchase.userId ||
    session.client_reference_id !== purchase.id ||
    (purchase.checkoutSessionId && purchase.checkoutSessionId !== session.id)
  )
    throw new PaidVideoError('not_found', 404);
  await schedulePaidVideoRecovery(purchase.id);
  if (session.status === 'expired') {
    if (!purchase.checkoutSessionId)
      await purchases.attachVideoCheckout(purchase.id, purchase.userId, session.id, '');
    await purchases.expireVideoPurchase(purchase.id, session.id);
    throw new PaidVideoError('checkout_expired', 410);
  }
  if (
    session.payment_status === 'unpaid' &&
    (session.status === 'open' || session.status === 'complete')
  ) {
    return publicPaidVideoPurchase(purchase);
  }
  if (session.payment_status === 'no_payment_required')
    throw new PaidVideoError('payment_required', 402);
  if (!purchase.checkoutSessionId) {
    // Recover a successfully created session whose original DB save was lost.
    // All payment/owner/price checks still run before recording its identifier.
    validateVideoCheckoutSession(session, { ...purchase, checkoutSessionId: session.id });
    await purchases.attachVideoCheckout(
      purchase.id,
      purchase.userId,
      session.id,
      session.url || '',
    );
    purchase = (await purchases.getVideoPurchase(purchase.id))!;
  }
  const intent = validateVideoCheckoutSession(session, purchase);
  await purchases.settleVideoPurchase(purchase.id, session.id, intent);
  // An expired object's previous alarm may already have stopped. Persist a
  // new wake AFTER settlement so a delayed genuine payment is recoverable.
  await schedulePaidVideoRecovery(purchase.id);
  purchase = (await purchases.getVideoPurchase(purchase.id))!;
  purchase = await refreshVideoPaymentRefunds(purchase, stripe);
  await schedulePaidVideoRecovery(purchase.id);
  if (purchase.state === 'paid')
    purchase = await startPaidVideoPurchase(
      purchase.id,
      purchase.userId,
      await paidDanceDependencies(stripe),
    );
  return publicPaidVideoPurchase(purchase);
}
export function paidDanceErrorResponse(error: unknown) {
  const status = error instanceof PaidVideoError ? error.status : 503;
  const code = error instanceof PaidVideoError ? error.code : 'video_service_unavailable';
  return Response.json(
    { error: code },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
