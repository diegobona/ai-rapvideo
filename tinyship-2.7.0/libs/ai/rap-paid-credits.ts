import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@libs/database';
import { rapCreditOrder } from '@libs/database/schema';
import { isManagedVideoExpired } from '../../config/mediaRetention';
import { rapCreditConfig, rapCreditPaymentsEnabled } from '../../config/rapCredits';
import { availableRapCredits, getRapCreditOrder, latestRapCreditOrder, requestRapCreditRefund, type RapCreditOrder } from '../payment/rap-credit-orders';
import { createRapStripeClient, reconcileRapCheckout, refreshRapCreditRefunds, type RapRecovery } from '../payment/rap-credit-stripe';
import { PaidVideoError } from './paid-video';
import { createVideoTask } from './video';
import type { VideoGenerationOptions } from './types';
import { createVideoTaskRecord, getVideoTaskByRapCreditOrder, getVideoTaskRecord, type VideoTaskRecord } from './video-task-store';
import { refreshVideoTask } from './video-task-status';
import type { VideoResultStorage } from './video-result-storage';

type Dependencies = { resultStorage?: VideoResultStorage; scheduleRecovery?: RapRecovery };

export async function publicRapCreditOrder(order: RapCreditOrder) {
  const task = order.taskId ? await getVideoTaskRecord(order.taskId, order.userId) : undefined;
  const expired = task && isManagedVideoExpired(task.result);
  return {
    id: order.id, state: expired && order.state === 'succeeded' ? 'expired' : order.state,
    ...(order.taskId ? { taskId: order.taskId } : {}),
    ...(order.refundStatus ? { refundStatus: order.refundStatus } : {}),
    ...(task?.status === 'succeeded' && task.result && !expired ? { result: task.result } : {}),
  };
}

async function attachPaidTask(order: RapCreditOrder, task: VideoTaskRecord) {
  await db.update(rapCreditOrder).set({ taskId: task.id, state: 'processing', updatedAt: new Date() })
    .where(and(eq(rapCreditOrder.id, order.id), eq(rapCreditOrder.state, 'starting')));
}

/** Recovery only queries the provider; it never repeats an unconfirmed create. */
export async function reconcileRapCreditOrder(id: string, deps: Dependencies = {}): Promise<RapCreditOrder | undefined> {
  let order = await getRapCreditOrder(id);
  if (!order) return;
  if (order.state === 'pending') order = await reconcileRapCheckout(order);
  if (order.state === 'starting') {
    const task = await getVideoTaskByRapCreditOrder(id, order.userId);
    if (task) {
      await attachPaidTask(order, task);
      order = (await getRapCreditOrder(id))!;
    } else if (Date.now() - order.updatedAt.getTime() >= rapCreditConfig.interruptedStartMs) {
      await requestRapCreditRefund(id);
      order = (await getRapCreditOrder(id))!;
    }
  }
  if (order.taskId && ['processing', 'refund_pending', 'refunded'].includes(order.state)) {
    try {
      const task = await refreshVideoTask(order.taskId, order.userId, deps);
      if (task) await settleRapCreditTask(task);
    } catch { /* Unknown provider or media storage state is retried by the durable alarm. */ }
    order = (await getRapCreditOrder(id))!;
  }
  // Keep dashboard refunds authoritative before admission and during recovery.
  if (order.paymentIntentId && order.state !== 'refunded') order = await refreshRapCreditRefunds(order);
  return order;
}

export async function settleRapCreditTask(task: VideoTaskRecord) {
  if (!task.rapCreditOrderId || task.status === 'processing') return;
  const id = task.rapCreditOrderId;
  if (task.status === 'succeeded') {
    await db.update(rapCreditOrder).set({ state: 'succeeded', updatedAt: new Date() })
      .where(and(eq(rapCreditOrder.id, id), eq(rapCreditOrder.userId, task.userId), eq(rapCreditOrder.state, 'processing')));
  } else await requestRapCreditRefund(id);
}

export async function readRapCreditData(userId: string, deps: Dependencies = {}) {
  let order = await latestRapCreditOrder(userId);
  if (order && ['pending', 'starting', 'processing', 'refund_pending'].includes(order.state)) {
    await deps.scheduleRecovery?.(order.id);
    order = await reconcileRapCreditOrder(order.id, deps) || order;
  }
  return { enabled: rapCreditPaymentsEnabled(), credits: await availableRapCredits(userId), ...(order ? { order: await publicRapCreditOrder(order) } : {}) };
}

/** A unique owner request key and conditional transition are the only provider admission. */
export async function createPaidRapVideo(options: VideoGenerationOptions, userId: string, requestId: unknown, deps: Dependencies) {
  if (!rapCreditPaymentsEnabled()) throw new PaidVideoError('payments_unavailable', 503);
  if (options.duration !== 12 || typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(requestId))
    throw new PaidVideoError('invalid_video_request', 400);
  if (!deps.scheduleRecovery) throw new PaidVideoError('video_service_unavailable', 503);
  const [sameRequest] = await db.select().from(rapCreditOrder).where(and(eq(rapCreditOrder.userId, userId), eq(rapCreditOrder.requestId, requestId))).limit(1) as RapCreditOrder[];
  const [active] = await db.select().from(rapCreditOrder).where(and(eq(rapCreditOrder.userId, userId), inArray(rapCreditOrder.state, ['starting', 'processing']))).limit(1) as RapCreditOrder[];
  const existing = sameRequest || active;
  if (existing) {
    await deps.scheduleRecovery(existing.id);
    const reconciled = await reconcileRapCreditOrder(existing.id, deps) || existing;
    const task = reconciled.taskId ? await getVideoTaskRecord(reconciled.taskId, userId) : undefined;
    if (task && !['refund_pending', 'refunded'].includes(reconciled.state)) return task;
    throw new PaidVideoError(['refund_pending', 'refunded'].includes(reconciled.state) ? 'payment_refunded' : 'video_start_pending', 409);
  }
  const candidates = await db.select().from(rapCreditOrder).where(and(eq(rapCreditOrder.userId, userId), eq(rapCreditOrder.state, 'available'), eq(rapCreditOrder.refundRequired, false)))
    .orderBy(asc(rapCreditOrder.createdAt)).limit(20) as RapCreditOrder[];
  const stripe = createRapStripeClient();
  for (const candidate of candidates) {
    await deps.scheduleRecovery(candidate.id);
    const current = await refreshRapCreditRefunds(candidate, stripe);
    if (current.state !== 'available') continue;
    let claimed: RapCreditOrder | undefined;
    try {
      [claimed] = await db.update(rapCreditOrder).set({ state: 'starting', requestId, generationOptions: options, updatedAt: new Date() })
        .where(and(eq(rapCreditOrder.id, candidate.id), eq(rapCreditOrder.state, 'available'), eq(rapCreditOrder.refundRequired, false), eq(rapCreditOrder.refundedAmount, 0),
          sql`NOT EXISTS (SELECT 1 FROM rap_credit_order occupied WHERE occupied.user_id = ${userId} AND occupied.state IN ('starting','processing'))`)).returning();
    } catch {
      // A concurrent owner request/unique index winner owns submission.
      throw new PaidVideoError('video_start_pending', 409);
    }
    if (!claimed) continue;
    try {
      // A previous alarm may have observed the formerly unused credit while
      // admission awaited Stripe. Persist a fresh wake for the claimed state.
      await deps.scheduleRecovery(claimed.id);
      // A refund handler may have invalidated the claim during async admission.
      if ((await getRapCreditOrder(claimed.id))?.state !== 'starting') throw new PaidVideoError('payment_refunded', 409);
      const submitted = await createVideoTask(options);
      const task = await createVideoTaskRecord({
        userId, rapCreditOrderId: claimed.id, provider: submitted.provider, model: submitted.model,
        providerTaskId: submitted.providerTaskId, creditCost: 0,
        ...(options.rapLyrics ? { rapLyrics: options.rapLyrics } : {}),
        ...(options.rapReferencePlan ? { rapReferencePlan: options.rapReferencePlan } : {}),
      });
      await attachPaidTask(claimed, task);
      await deps.scheduleRecovery(claimed.id);
      return task;
    } catch (error) {
      // Confirmed pre-acceptance rejections can refund immediately. Network errors,
      // missing task IDs and interrupted persistence keep the non-repeatable claim.
      if (error instanceof Error && (/^AutoDL API HTTP error: (400|401|403|404|413|415|422|429)$/.test(error.message)
        || /^AutoDL API error: (?!invalid_response\b)[A-Za-z0-9_.-]+ - /.test(error.message))) {
        await requestRapCreditRefund(claimed.id);
        await refreshRapCreditRefunds((await getRapCreditOrder(claimed.id))!, stripe);
        throw new PaidVideoError('payment_refunded', 409);
      }
      console.error('Rap credit generation requires reconciliation', { orderId: claimed.id });
      throw new PaidVideoError('video_start_pending', 409);
    }
  }
  throw new PaidVideoError('rap_credit_required', 402);
}
