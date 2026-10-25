import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from '@libs/database';
import { videoTask, videoTrial, videoTrialRate, creditTransaction, videoPurchase } from '@libs/database/schema';

export class VideoTrialError extends Error {
  constructor(readonly code: 'trial_used' | 'trial_processing' | 'rate_limited' | 'preview_ip_unavailable', readonly status: number) { super(code); }
}
export const trialKeys = (visitorId: string, userId?: string) => [`browser:${visitorId}`, ...(userId ? [`user:${userId}`] : [])];

export async function ensureTrialScopes(keys: string[], userId?: string) {
  // Existing successful videos count toward the launch offer too.
  if (userId) {
    const [previous] = await db.select().from(videoTask).where(and(eq(videoTask.userId, userId), inArray(videoTask.status, ['succeeded', 'processing'])))
      .orderBy(sql`CASE WHEN ${videoTask.status} = 'succeeded' THEN 0 ELSE 1 END`).limit(1);
    if (previous) await db.insert(videoTrial).values({ key: `user:${userId}`, state: previous.status === 'succeeded' ? 'used' : 'reserved', taskId: previous.id, reservationId: `legacy:${previous.id}`, updatedAt: new Date() }).onConflictDoNothing();
  }
  for (const key of keys) await db.insert(videoTrial).values({ key, updatedAt: new Date() }).onConflictDoNothing();
}

export async function getVideoTrial(keys: string[]) {
  const rows = await db.select().from(videoTrial).where(inArray(videoTrial.key, keys));
  const used = rows.find(row => row.state === 'used');
  const pending = rows.find(row => row.state === 'reserved');
  return { state: used ? 'used' as const : pending ? 'processing' as const : 'available' as const, taskId: (pending ?? used)?.taskId ?? null };
}

export async function inheritTrialUsage(keys: string[]) {
  await ensureTrialScopes(keys);
  const rows = await db.select().from(videoTrial).where(inArray(videoTrial.key, keys));
  const source = rows.find(row => row.state === 'used') ?? rows.find(row => row.state === 'reserved');
  if (source) await db.update(videoTrial).set({ state: source.state, reservationId: source.reservationId, taskId: source.taskId, updatedAt: new Date() })
    .where(and(inArray(videoTrial.key, keys), eq(videoTrial.state, 'available')));
}

export async function reserveVideoTrial(keys: string[], userId?: string) {
  await ensureTrialScopes(keys, userId);
  const reservationId = crypto.randomUUID();
  // One atomic statement claims BOTH browser and account. Rows already updated
  // by this statement have our reservation ID and do not block its second row.
  const keyList = sql.join(keys.map(key => sql`${key}`), sql`, `);
  const rows = await db.update(videoTrial).set({ state: 'reserved', reservationId, taskId: null, updatedAt: new Date() })
    .where(and(inArray(videoTrial.key, keys), sql`NOT EXISTS (
      SELECT 1 FROM video_trial occupied WHERE occupied.key IN (${keyList})
      AND occupied.state <> 'available' AND COALESCE(occupied.reservation_id, '') <> ${reservationId}
    )`)).returning();
  if (rows.length !== keys.length) {
    const state = await getVideoTrial(keys);
    throw new VideoTrialError(state.state === 'used' ? 'trial_used' : 'trial_processing', state.state === 'used' ? 403 : 409);
  }
  return reservationId;
}

export async function attachTrialTask(reservationId: string, taskId: string) {
  await db.update(videoTrial).set({ taskId, updatedAt: new Date() }).where(and(eq(videoTrial.reservationId, reservationId), eq(videoTrial.state, 'reserved')));
}
export async function releaseVideoTrial(reservationId: string) {
  await db.update(videoTrial).set({ state: 'available', reservationId: null, taskId: null, updatedAt: new Date() })
    .where(and(eq(videoTrial.reservationId, reservationId), eq(videoTrial.state, 'reserved')));
}
export async function finishVideoTrial(taskId: string, status: 'succeeded' | 'failed') {
  await db.update(videoTrial).set({ state: status === 'succeeded' ? 'used' : 'available', ...(status === 'failed' ? { taskId: null, reservationId: null } : {}), updatedAt: new Date() })
    .where(and(eq(videoTrial.taskId, taskId), eq(videoTrial.state, 'reserved')));
}
export async function completeImmediateTrial(reservationId: string) {
  await db.update(videoTrial).set({ state: 'used', updatedAt: new Date() }).where(eq(videoTrial.reservationId, reservationId));
}

export async function linkAnonymousVideoData(oldUserId: string, newUserId: string) {
  if (oldUserId === newUserId) return;
  await ensureTrialScopes([`user:${oldUserId}`, `user:${newUserId}`], oldUserId);
  await inheritTrialUsage([`user:${oldUserId}`, `user:${newUserId}`]);
  // Signing in must not reset a guest's one-time preview allowance. Keep the
  // same reservation/task references so later provider completion settles it.
  await inheritTrialUsage([`preview-v1:user:${oldUserId}`, `preview-v1:user:${newUserId}`]);
  // Better Auth deletes the anonymous account after this callback. Move its
  // records first so the new account can still poll/download the original job.
  await db.update(creditTransaction).set({ userId: newUserId }).where(eq(creditTransaction.userId, oldUserId));
  await db.update(videoPurchase).set({ userId: newUserId }).where(eq(videoPurchase.userId, oldUserId));
  await db.update(videoTask).set({ userId: newUserId }).where(eq(videoTask.userId, oldUserId));
}

export async function takeTrialRateSlot(key: string, limit: number, expiresAt: Date) {
  const rows = await db.insert(videoTrialRate).values({ key, count: 1, expiresAt }).onConflictDoUpdate({
    target: videoTrialRate.key, set: { count: sql`${videoTrialRate.count} + 1` }, setWhere: lt(videoTrialRate.count, limit),
  }).returning();
  if (!rows.length) throw new VideoTrialError('rate_limited', 429);
  // Window keys are salted hashes; expired counters contain no useful history.
  await db.delete(videoTrialRate).where(lt(videoTrialRate.expiresAt, new Date()));
}
