import { and, asc, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@libs/database';
import { videoPurchase } from '@libs/database/schema';
import type { VideoGenerationOptions, VideoGenerationResult } from '../ai/types';
import { videoPurchaseConfig } from '../../config/videoPurchase';

export type VideoPurchaseState =
  | 'pending'
  | 'paid'
  | 'starting'
  | 'processing'
  | 'succeeded'
  | 'refund_pending'
  | 'refunded'
  | 'expired';
export type VideoPurchase = Omit<typeof videoPurchase.$inferSelect, 'state'> & {
  state: VideoPurchaseState;
};
export interface PublicVideoPurchase {
  id: string;
  state: VideoPurchaseState;
  taskId: string | null;
  result?: VideoGenerationResult;
  error?: string;
  refundStatus?: string;
}
const cast = (row: typeof videoPurchase.$inferSelect | undefined) =>
  row as VideoPurchase | undefined;
export function publicVideoPurchase(
  purchase: VideoPurchase,
  result?: VideoGenerationResult,
): PublicVideoPurchase {
  return {
    id: purchase.id,
    state: purchase.state,
    taskId: purchase.taskId,
    ...(purchase.state === 'succeeded' && result ? { result } : {}),
    ...(purchase.errorMessage ? { error: purchase.errorMessage } : {}),
    ...(purchase.refundStatus ? { refundStatus: purchase.refundStatus } : {}),
  };
}
export async function getVideoPurchase(id: string, userId?: string) {
  const [row] = await db
    .select()
    .from(videoPurchase)
    .where(
      and(
        eq(videoPurchase.id, id),
        userId === undefined ? undefined : eq(videoPurchase.userId, userId),
      ),
    )
    .limit(1);
  return cast(row);
}
export async function latestVideoPurchase(userId: string) {
  const [row] = await db
    .select()
    .from(videoPurchase)
    .where(and(eq(videoPurchase.userId, userId), sql`${videoPurchase.state} <> 'expired'`))
    .orderBy(desc(videoPurchase.createdAt), desc(videoPurchase.id))
    .limit(1);
  return cast(row);
}
export async function videoPurchaseByPaymentIntent(paymentIntentId: string) {
  const [row] = await db
    .select()
    .from(videoPurchase)
    .where(eq(videoPurchase.paymentIntentId, paymentIntentId))
    .limit(1);
  return cast(row);
}
export async function createVideoPurchaseDraft(
  userId: string,
  generationOptions: VideoGenerationOptions,
  returnPath: string,
  draftKey: string,
) {
  // A draft lives only as long as its fixed, deterministic Stripe expiry. Retrying
  // after that window must never reuse an expired Stripe idempotency key.
  await db
    .update(videoPurchase)
    .set({ state: 'expired', draftKey: null, updatedAt: new Date() })
    .where(
      and(
        eq(videoPurchase.draftKey, draftKey),
        eq(videoPurchase.userId, userId),
        eq(videoPurchase.state, 'pending'),
        lte(
          videoPurchase.createdAt,
          new Date(Date.now() - videoPurchaseConfig.checkoutLifetimeSeconds * 1000),
        ),
      ),
    );
  await db
    .insert(videoPurchase)
    .values({
      id: crypto.randomUUID(),
      userId,
      generationOptions,
      returnPath,
      draftKey,
      amount: videoPurchaseConfig.amount,
      currency: videoPurchaseConfig.currency,
      state: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: videoPurchase.draftKey });
  const [row] = await db
    .select()
    .from(videoPurchase)
    .where(and(eq(videoPurchase.draftKey, draftKey), eq(videoPurchase.userId, userId)))
    .limit(1);
  if (!row) throw new Error('Could not recover video purchase draft');
  return row as VideoPurchase;
}
export async function attachVideoCheckout(
  id: string,
  userId: string,
  sessionId: string,
  checkoutUrl: string,
) {
  const [row] = await db
    .update(videoPurchase)
    .set({ checkoutSessionId: sessionId, checkoutUrl, updatedAt: new Date() })
    .where(
      and(
        eq(videoPurchase.id, id),
        eq(videoPurchase.userId, userId),
        inArray(videoPurchase.state, ['pending', 'expired']),
        or(isNull(videoPurchase.checkoutSessionId), eq(videoPurchase.checkoutSessionId, sessionId)),
      ),
    )
    .returning();
  return cast(row);
}
export async function noteVideoCheckoutAttempt(id: string, userId: string) {
  const [row] = await db
    .update(videoPurchase)
    .set({ updatedAt: new Date() })
    .where(
      and(
        eq(videoPurchase.id, id),
        eq(videoPurchase.userId, userId),
        eq(videoPurchase.state, 'pending'),
        isNull(videoPurchase.checkoutSessionId),
      ),
    )
    .returning();
  return cast(row);
}
/** Only an exhaustive Stripe scan may call this. Recent attempts remain recoverable. */
export async function retireUnattachedVideoDraft(id: string, userId: string) {
  const [row] = await db
    .update(videoPurchase)
    .set({ state: 'expired', draftKey: null, updatedAt: new Date() })
    .where(
      and(
        eq(videoPurchase.id, id),
        eq(videoPurchase.userId, userId),
        eq(videoPurchase.state, 'pending'),
        isNull(videoPurchase.checkoutSessionId),
        lte(videoPurchase.updatedAt, new Date(Date.now() - 2 * 60_000)),
      ),
    )
    .returning();
  return cast(row);
}
export async function settleVideoPurchase(id: string, sessionId: string, paymentIntentId: string) {
  const [row] = await db
    .update(videoPurchase)
    .set({ state: 'paid', paymentIntentId, draftKey: null, updatedAt: new Date() })
    .where(
      and(
        eq(videoPurchase.id, id),
        eq(videoPurchase.checkoutSessionId, sessionId),
        inArray(videoPurchase.state, ['pending', 'expired']),
        or(
          isNull(videoPurchase.paymentIntentId),
          eq(videoPurchase.paymentIntentId, paymentIntentId),
        ),
      ),
    )
    .returning();
  return cast(row);
}
export async function claimVideoPurchase(id: string, userId: string) {
  const [row] = await db
    .update(videoPurchase)
    .set({ state: 'starting', updatedAt: new Date() })
    .where(
      and(
        eq(videoPurchase.id, id),
        eq(videoPurchase.userId, userId),
        eq(videoPurchase.state, 'paid'),
        isNull(videoPurchase.taskId),
        isNull(videoPurchase.refundStatus),
      ),
    )
    .returning();
  return cast(row);
}
/** Only the owning worker, before calling the provider, may defer its claim. */
export async function releaseUnsubmittedVideoPurchase(id:string,userId:string) {
  const [row]=await db.update(videoPurchase).set({state:'paid',updatedAt:new Date()}).where(and(
    eq(videoPurchase.id,id),eq(videoPurchase.userId,userId),eq(videoPurchase.state,'starting'),
    isNull(videoPurchase.taskId),isNull(videoPurchase.refundStatus),
    sql`NOT EXISTS (SELECT 1 FROM video_task WHERE purchase_id = ${id})`,
  )).returning();
  return cast(row);
}
export async function attachVideoPurchaseTask(id: string, taskId: string) {
  const [row] = await db
    .update(videoPurchase)
    .set({ state: 'processing', taskId, updatedAt: new Date() })
    .where(
      and(
        eq(videoPurchase.id, id),
        eq(videoPurchase.state, 'starting'),
        or(isNull(videoPurchase.taskId), eq(videoPurchase.taskId, taskId)),
      ),
    )
    .returning();
  return cast(row);
}
export async function completeVideoPurchase(id: string) {
  const [row] = await db
    .update(videoPurchase)
    .set({ state: 'succeeded', errorMessage: null, updatedAt: new Date() })
    .where(
      and(
        eq(videoPurchase.id, id),
        eq(videoPurchase.state, 'processing'),
        isNull(videoPurchase.refundStatus),
      ),
    )
    .returning();
  return cast(row);
}
export async function requestVideoRefund(id: string, errorMessage: string) {
  const [row] = await db
    .update(videoPurchase)
    .set({
      state: 'refund_pending',
      refundRequired: true,
      refundStatus: 'requested',
      errorMessage,
      draftKey: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(videoPurchase.id, id),
        inArray(videoPurchase.state, ['paid', 'starting', 'processing']),
      ),
    )
    .returning();
  return cast(row);
}
export async function claimVideoRefund(id: string) {
  const [row] = await db
    .update(videoPurchase)
    .set({
      refundLeaseUntil: new Date(Date.now() + videoPurchaseConfig.refundLeaseMs),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(videoPurchase.id, id),
        eq(videoPurchase.state, 'refund_pending'),
        eq(videoPurchase.refundRequired, true),
        or(isNull(videoPurchase.refundLeaseUntil), lte(videoPurchase.refundLeaseUntil, new Date())),
      ),
    )
    .returning();
  return cast(row);
}
/** Inputs are an authoritative aggregate from Stripe, never a browser or stale event payload. */
export async function recordVideoRefund(
  id: string,
  refund: { id: string; status: string; amount: number },
) {
  const full = refund.amount >= videoPurchaseConfig.amount;
  const [row] = await db
    .update(videoPurchase)
    .set({
      state: full ? 'refunded' : 'refund_pending',
      refundId: refund.id,
      refundStatus: full ? 'succeeded' : refund.status,
      refundedAmount: refund.amount,
      draftKey: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(videoPurchase.id, id),
        sql`${videoPurchase.state} <> 'refunded'`,
        lte(videoPurchase.refundedAmount, refund.amount),
      ),
    )
    .returning();
  return cast(row);
}
export async function advanceFailedVideoRefund(id: string, refundId: string) {
  await db
    .update(videoPurchase)
    .set({
      refundAttempt: sql`${videoPurchase.refundAttempt} + 1`,
      lastFailedRefundId: refundId,
      refundId: null,
      refundStatus: 'requested',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(videoPurchase.id, id),
        eq(videoPurchase.state, 'refund_pending'),
        eq(videoPurchase.refundId, refundId),
        eq(videoPurchase.refundStatus, 'failed'),
        or(
          isNull(videoPurchase.lastFailedRefundId),
          sql`${videoPurchase.lastFailedRefundId} <> ${refundId}`,
        ),
      ),
    );
}
export async function expireVideoPurchase(id: string, sessionId?: string) {
  await db
    .update(videoPurchase)
    .set({ state: 'expired', draftKey: null, updatedAt: new Date() })
    .where(
      and(
        eq(videoPurchase.id, id),
        eq(videoPurchase.state, 'pending'),
        sessionId ? eq(videoPurchase.checkoutSessionId, sessionId) : undefined,
      ),
    );
}
export async function touchVideoPurchase(id: string, state: VideoPurchaseState) {
  await db
    .update(videoPurchase)
    .set({ updatedAt: new Date() })
    .where(and(eq(videoPurchase.id, id), eq(videoPurchase.state, state)));
}
export async function videoPurchasesForReconciliation(state: VideoPurchaseState) {
  return (await db
    .select()
    .from(videoPurchase)
    .where(
      and(
        eq(videoPurchase.state, state),
        lte(videoPurchase.updatedAt, new Date(Date.now() - 60_000)),
      ),
    )
    .orderBy(asc(videoPurchase.updatedAt))
    .limit(videoPurchaseConfig.batchSize)) as VideoPurchase[];
}
