import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@libs/database';
import { rapCreditOrder } from '@libs/database/schema';
import { PaidVideoError } from '../ai/paid-video';

export type RapCreditOrder = typeof rapCreditOrder.$inferSelect;
export const ACTIVE_RAP_STATES = ['pending', 'starting', 'processing', 'refund_pending'];

export async function getRapCreditOrder(id: string, userId?: string): Promise<RapCreditOrder | undefined> {
  const [row] = await db.select().from(rapCreditOrder).where(and(eq(rapCreditOrder.id, id), userId ? eq(rapCreditOrder.userId, userId) : undefined)).limit(1);
  return row;
}
export async function findRapCreditOrderBySession(sessionId: string) {
  const [row] = await db.select().from(rapCreditOrder).where(eq(rapCreditOrder.checkoutSessionId, sessionId)).limit(1);
  return row as RapCreditOrder | undefined;
}
export async function findRapCreditOrderByIntent(intentId: string) {
  const [row] = await db.select().from(rapCreditOrder).where(eq(rapCreditOrder.paymentIntentId, intentId)).limit(1);
  return row as RapCreditOrder | undefined;
}
export async function latestRapCreditOrder(userId: string): Promise<RapCreditOrder | undefined> {
  const [row] = await db.select().from(rapCreditOrder).where(eq(rapCreditOrder.userId, userId))
    .orderBy(sql`CASE WHEN ${rapCreditOrder.state} IN ('starting','processing','refund_pending') THEN 0 WHEN ${rapCreditOrder.state} = 'pending' THEN 1 ELSE 2 END`, desc(rapCreditOrder.updatedAt), desc(rapCreditOrder.createdAt)).limit(1);
  return row;
}
export async function availableRapCredits(userId: string): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(rapCreditOrder)
    .where(and(eq(rapCreditOrder.userId, userId), eq(rapCreditOrder.state, 'available'), eq(rapCreditOrder.refundRequired, false), eq(rapCreditOrder.refundedAmount, 0)));
  return Number(row?.count || 0);
}
export function requireRapAccount(user: { id: string; isAnonymous?: boolean | null } | null | undefined) {
  if (!user || user.isAnonymous !== false) throw new PaidVideoError('account_required', 401);
  return user.id;
}
export async function requestRapCreditRefund(id: string) {
  await db.update(rapCreditOrder).set({ state: 'refund_pending', refundRequired: true, updatedAt: new Date() })
    .where(and(eq(rapCreditOrder.id, id), sql`${rapCreditOrder.refundedAmount} < 890`,
      inArray(rapCreditOrder.state, ['available', 'starting', 'processing', 'succeeded', 'refund_pending', 'refunded'])));
}
