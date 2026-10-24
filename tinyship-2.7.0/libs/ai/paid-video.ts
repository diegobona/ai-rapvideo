import type Stripe from 'stripe';
import { videoPurchaseConfig } from '../../config/videoPurchase';
import { isManagedVideoExpired } from '../../config/mediaRetention';
import { DANCE_ORIENTATIONS, danceOrientationRatios, danceOrientationResolutions } from '../../config/danceOutput';
import { DANCE_REFERENCE_KEYS } from '../../config/danceReferences';
import * as purchases from '../payment/video-purchases';
import {
  createVideoStripeClient,
  recoverVideoCheckoutSession,
  refundPaidVideoPurchase,
  refreshVideoPaymentRefunds,
  retrieveVideoCheckout,
  validateVideoCheckoutSession,
} from '../payment/video-stripe';
import { createVideoTask } from './video';
import {
  createVideoTaskRecord,
  getVideoTaskByPurchase,
  getVideoTaskRecord,
} from './video-task-store';
import { refreshVideoTask } from './video-task-status';
import type { VideoResultStorage } from './video-result-storage';
import type { VideoGenerationOptions } from './types';
import { readSavedDanceCustomization } from './dance-customization';
import { readVideoFailureReason } from '../../config/videoFailure';

export class PaidVideoError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}
export class PaidVideoInputMissing extends Error {}
export interface PaidVideoDependencies {
  stripe?: Stripe;
  deadline?: number;
  resultStorage?: VideoResultStorage;
  validateInputs?: (options: VideoGenerationOptions, userId: string) => Promise<void>;
  scheduleRecovery?: (purchaseId: string) => Promise<void>;
}
const paymentStripe = (deps: PaidVideoDependencies) =>
  deps.stripe ||
  createVideoStripeClient(deps.deadline === undefined ? undefined : deps.deadline - Date.now());
async function ownedPurchase(id: string, userId: string) {
  const purchase = await purchases.getVideoPurchase(id, userId);
  if (!purchase) throw new PaidVideoError('not_found', 404);
  return purchase;
}
export async function publicPaidVideoPurchase(purchase: purchases.VideoPurchase) {
  const task =
    purchase.taskId && ['succeeded', 'refund_pending', 'refunded'].includes(purchase.state)
      ? await getVideoTaskRecord(purchase.taskId, purchase.userId)
      : undefined;
  const orientation = DANCE_ORIENTATIONS.find(value => purchase.generationOptions.provider === 'compshare'
    ? danceOrientationRatios[value] === purchase.generationOptions.aspectRatio
    : danceOrientationResolutions[value] === purchase.generationOptions.size);
  const scene = purchase.generationOptions.referenceImageUrls?.[2];
  const sceneImageUrl = scene && !new URL(scene).pathname.endsWith(`/${DANCE_REFERENCE_KEYS.scene}`) ? scene : undefined;
  const dancerImageUrl = purchase.generationOptions.referenceImageUrls?.[0];
  const failureReason = task?.status === 'failed' ? readVideoFailureReason(task.errorMessage) : undefined;
  const princess = purchase.generationOptions.referenceImageUrls?.[1];
  const princessImageUrl = princess && !new URL(princess).pathname.endsWith(`/${DANCE_REFERENCE_KEYS.princess}`) ? princess : undefined;
  const mediaExpired = isManagedVideoExpired(task?.result);
  return {
    ...purchases.publicVideoPurchase(purchase, mediaExpired ? undefined : task?.result),
    ...(mediaExpired ? { state: 'expired' as const } : {}),
    ...(failureReason ? { failureReason } : {}),
    ...(orientation ? { orientation } : {}),
    ...(sceneImageUrl && !mediaExpired ? { sceneImageUrl } : {}),
    ...(dancerImageUrl && !mediaExpired ? { dancerImageUrl } : {}),
    ...(princessImageUrl && !mediaExpired ? { princessImageUrl } : {}),
    ...readSavedDanceCustomization(purchase.generationOptions),
  };
}
/** Only the conditional paid -> starting database transition permits submission. */
export async function startPaidVideoPurchase(
  id: string,
  userId: string,
  deps: PaidVideoDependencies = {},
) {
  let purchase = await ownedPurchase(id, userId);
  if (['pending', 'expired', 'refund_pending', 'refunded'].includes(purchase.state))
    throw new PaidVideoError('payment_required', 402);
  await deps.scheduleRecovery?.(id);
  if (purchase.state !== 'paid') return purchase;
  if (deps.deadline !== undefined && deps.deadline - Date.now() < 30_000) return purchase;
  const stripe = paymentStripe(deps);
  // Manual refunds can precede their webhook. Check Stripe before admission too.
  purchase = await refreshVideoPaymentRefunds(purchase, stripe, deps.deadline);
  if (purchase.state !== 'paid') throw new PaidVideoError('payment_required', 402);
  if (deps.deadline !== undefined && deps.deadline - Date.now() < 30_000) return purchase;
  const claimed = await purchases.claimVideoPurchase(id, userId);
  if (!claimed) return ownedPurchase(id, userId);
  try {
    await deps.validateInputs?.(claimed.generationOptions, userId);
  } catch (error) {
    await purchases.requestVideoRefund(
      id,
      error instanceof PaidVideoInputMissing
        ? 'The uploaded photo is unavailable. A full refund has been requested.'
        : 'Video generation could not start. A full refund has been requested.',
    );
    await refundPaidVideoPurchase(id, stripe, deps.deadline);
    return ownedPurchase(id, userId);
  }
  if (deps.deadline !== undefined && deps.deadline - Date.now() < 30_000) {
    // This worker has not submitted anything. Release only this known-safe
    // pre-provider claim; ambiguous submissions never take this path.
    await purchases.releaseUnsubmittedVideoPurchase(id,userId);
    return ownedPurchase(id, userId);
  }
  try {
    const task = await createVideoTask(claimed.generationOptions.provider === 'compshare'
      ? { ...claimed.generationOptions, idempotencyKey: `dance-${id}` }
      : claimed.generationOptions);
    const stored = await createVideoTaskRecord({
      purchaseId: id,
      userId,
      provider: task.provider,
      model: task.model,
      providerTaskId: task.providerTaskId,
      creditCost: 0,
    });
    await purchases.attachVideoPurchaseTask(id, stored.id);
  } catch {
    // A timeout may hide a provider-accepted job or a failed persistence write.
    // Recover by purchaseId later; never blindly submit the payment again.
    console.error('Paid video start requires reconciliation', { purchaseId: id });
  }
  return ownedPurchase(id, userId);
}
export async function refreshPaidVideoPurchase(
  id: string,
  userId: string,
  deps: PaidVideoDependencies = {},
) {
  let purchase = await ownedPurchase(id, userId);
  await deps.scheduleRecovery?.(id);
  const stripe = () => paymentStripe(deps);
  if (purchase.state === 'starting') {
    const task = await getVideoTaskByPurchase(id, userId);
    if (task) {
      await purchases.attachVideoPurchaseTask(id, task.id);
      purchase = await ownedPurchase(id, userId);
    } else if (
      Date.now() - purchase.updatedAt.getTime() >=
      videoPurchaseConfig.interruptedStartMs
    ) {
      await purchases.requestVideoRefund(
        id,
        'Video generation could not be confirmed. A full refund has been requested.',
      );
      purchase = await ownedPurchase(id, userId);
    }
  }
  if (purchase.state === 'processing' && purchase.taskId) {
    if (deps.deadline !== undefined && deps.deadline - Date.now() < 30_000) return purchase;
    try {
      const task = await refreshVideoTask(purchase.taskId, userId, { resultStorage: deps.resultStorage });
      if (task?.status === 'succeeded') await purchases.completeVideoPurchase(id);
      else if (task?.status === 'failed')
        await purchases.requestVideoRefund(
          id,
          'Video generation failed. A full refund has been requested.',
        );
      else await purchases.touchVideoPurchase(id, 'processing');
      purchase = await ownedPurchase(id, userId);
    } catch {
      // Transport failures and unknown provider states are retryable, not proof
      // that generation failed. Leave it eligible for later reconciliation.
      await purchases.touchVideoPurchase(id, 'processing');
    }
  }
  if (purchase.state === 'refund_pending') {
    try {
      if (purchase.refundRequired) await refundPaidVideoPurchase(id, stripe(), deps.deadline);
      else await refreshVideoPaymentRefunds(purchase, stripe(), deps.deadline);
    } catch {
      console.error('Paid video refund remains pending', { purchaseId: id });
    }
  }
  return ownedPurchase(id, userId);
}
/** Shared by per-purchase alarms and the bounded maintenance batch. */
export async function reconcilePaidVideoPurchase(
  id: string,
  deps: PaidVideoDependencies = {},
) {
  let purchase = await purchases.getVideoPurchase(id);
  if (!purchase) return undefined;
  if (purchase.state === 'paid')
    return startPaidVideoPurchase(purchase.id, purchase.userId, deps);
  if (purchase.state !== 'pending')
    return refreshPaidVideoPurchase(purchase.id, purchase.userId, deps);
  if (!purchase.checkoutSessionId) {
    const recovered = await recoverVideoCheckoutSession(purchase, paymentStripe(deps), deps.deadline);
    if (recovered) {
      await purchases.attachVideoCheckout(
        purchase.id, purchase.userId, recovered.id, recovered.url || '',
      );
      purchase = (await purchases.getVideoPurchase(purchase.id))!;
    }
  }
  if (purchase.checkoutSessionId) {
    const stripe = paymentStripe(deps);
    const session = await retrieveVideoCheckout(purchase.checkoutSessionId, stripe, deps.deadline);
    if (session.payment_status === 'paid') {
      const intent = validateVideoCheckoutSession(session, purchase);
      await purchases.settleVideoPurchase(purchase.id, session.id, intent);
      return startPaidVideoPurchase(purchase.id, purchase.userId, { ...deps, stripe });
    } else if (session.status === 'expired')
      await purchases.expireVideoPurchase(purchase.id, session.id);
    else await purchases.touchVideoPurchase(purchase.id, 'pending');
  } else if (
    Date.now() - purchase.createdAt.getTime() >= videoPurchaseConfig.checkoutLifetimeSeconds * 1000
  ) await purchases.expireVideoPurchase(purchase.id);
  // Without a session, updatedAt records the last possible chargeable-create
  // attempt. Recovery polling must not renew that attempt's retirement guard.
  return purchases.getVideoPurchase(purchase.id);
}
/** Work is sequential, indexed, capped to ten per state, and bounded in wall time. */
export async function reconcilePaidVideoPurchases(deps: PaidVideoDependencies = {}) {
  const deadline = Date.now() + 45_000;
  const scopedDeps = { ...deps, deadline };
  const states = ['paid', 'starting', 'processing', 'refund_pending', 'pending'] as const;
  // Every five-minute slot starts with a different state. Within a run take one
  // row from each state before taking its next row, so paid traffic cannot keep
  // interrupted starts, provider status or refunds behind an endless queue.
  const offset = Math.floor(Date.now() / (5 * 60_000)) % states.length;
  const ordered = [...states.slice(offset), ...states.slice(0, offset)];
  const queues = await Promise.all(
    ordered.map(async (state) => ({
      state,
      batch: await purchases.videoPurchasesForReconciliation(state),
    })),
  );
  for (let round = 0; round < videoPurchaseConfig.batchSize; round++) {
    for (const { state, batch } of queues) {
      const purchase = batch[round];
      if (!purchase) continue;
      if (Date.now() >= deadline) return;
      try {
        await reconcilePaidVideoPurchase(purchase.id, scopedDeps);
      } catch {
        console.error('Paid video reconciliation will retry', { purchaseId: purchase.id, state });
        if (state === 'paid' || state === 'refund_pending' || (state === 'pending' && purchase.checkoutSessionId))
          await purchases.touchVideoPurchase(purchase.id, state);
      }
    }
  }
}
