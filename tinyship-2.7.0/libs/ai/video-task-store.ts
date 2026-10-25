import { nanoid } from 'nanoid';
import { and, eq, sql } from 'drizzle-orm';
import { db, getDialect, runNativeD1Batch, sqliteInstance } from '@libs/database';
import { videoTask, creditTransaction, user } from '@libs/database/schema';
import type { AsyncVideoProviderName, VideoGenerationResult, RapReferencePlan } from './types';
import type { RapLyricsDraft } from './rap-lyrics-types';
import { normalizeRapLyricsDraft } from './rap-lyrics-draft';

type LocalVideoTaskStatus = 'processing' | 'succeeded' | 'failed';

export interface VideoTaskRecord {
  id: string;
  userId: string;
  purchaseId?: string;
  rapCreditOrderId?: string;
  provider: AsyncVideoProviderName;
  model: string;
  providerTaskId: string;
  creditCost: number;
  consumeTransactionId?: string;
  status: LocalVideoTaskStatus;
  result?: VideoGenerationResult;
  /** Frozen script is available while processing, before a video result exists. */
  rapLyrics?: RapLyricsDraft;
  rapReferencePlan?: RapReferencePlan;
  errorMessage?: string;
  refunded: boolean;
  createdAt: number;
  updatedAt: number;
}

function toRecord(row: typeof videoTask.$inferSelect): VideoTaskRecord {
  const saved = row.result as Partial<VideoGenerationResult> | null;
  let rapLyrics: RapLyricsDraft | undefined;
  try { if (saved?.rapLyrics) rapLyrics = normalizeRapLyricsDraft(saved.rapLyrics); }
  catch { /* Historical task JSON without a valid script has no lyric transcript. */ }
  return {
    ...row,
    provider: row.provider as AsyncVideoProviderName,
    status: row.status as LocalVideoTaskStatus,
    result: saved && typeof saved.videoUrl === 'string' ? saved as VideoGenerationResult : undefined,
    ...(rapLyrics ? { rapLyrics } : {}),
    ...(saved?.rapReferencePlan ? { rapReferencePlan: saved.rapReferencePlan } : {}),
    errorMessage: row.errorMessage ?? undefined,
    consumeTransactionId: row.consumeTransactionId ?? undefined,
    purchaseId: row.purchaseId ?? undefined,
    rapCreditOrderId: row.rapCreditOrderId ?? undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export async function createVideoTaskRecord(
  input: Omit<VideoTaskRecord, 'id' | 'status' | 'refunded' | 'createdAt' | 'updatedAt'>,
): Promise<VideoTaskRecord> {
  const { rapLyrics: suppliedLyrics, rapReferencePlan, ...record } = input;
  const rapLyrics = suppliedLyrics === undefined ? undefined : normalizeRapLyricsDraft(suppliedLyrics);
  if (!Number.isSafeInteger(input.creditCost) || input.creditCost < 0) throw new Error('Invalid video credit cost');
  if (input.creditCost > 0) {
    const [consumption] = await db.select().from(creditTransaction).where(and(
      eq(creditTransaction.id, input.consumeTransactionId || ''),
      eq(creditTransaction.userId, input.userId), eq(creditTransaction.type, 'consumption'),
    )).limit(1);
    if (!consumption || Number(consumption.amount) !== -input.creditCost) {
      throw new Error('Video task must reference its original credit consumption');
    }
  }
  const [row] = await db.insert(videoTask).values({
    ...record, ...((rapLyrics || rapReferencePlan) ? { result: { ...record.result, ...(rapLyrics ? { rapLyrics } : {}), ...(rapReferencePlan ? { rapReferencePlan } : {}) } } : {}),
    id: nanoid(), status: 'processing', refunded: false,
    createdAt: new Date(), updatedAt: new Date(),
  }).returning();
  return toRecord(row);
}

// Scope every read and transition to the authenticated owner, including cached results.
export async function getVideoTaskRecord(taskId: string, userId: string): Promise<VideoTaskRecord | undefined> {
  const [row] = await db.select().from(videoTask).where(and(
    eq(videoTask.id, taskId), eq(videoTask.userId, userId),
  )).limit(1);
  return row ? toRecord(row) : undefined;
}

export async function getVideoTaskByPurchase(purchaseId: string, userId: string): Promise<VideoTaskRecord | undefined> {
  const [row] = await db.select().from(videoTask).where(and(eq(videoTask.purchaseId,purchaseId),eq(videoTask.userId,userId))).limit(1);
  return row ? toRecord(row) : undefined;
}

export async function getVideoTaskByRapCreditOrder(orderId: string, userId: string): Promise<VideoTaskRecord | undefined> {
  const [row] = await db.select().from(videoTask).where(and(eq(videoTask.rapCreditOrderId, orderId), eq(videoTask.userId, userId))).limit(1);
  return row ? toRecord(row) : undefined;
}

export async function markVideoTaskSucceeded(taskId: string, userId: string, result: VideoGenerationResult): Promise<VideoTaskRecord | undefined> {
  const current = await getVideoTaskRecord(taskId, userId);
  if (!current || current.status !== 'processing') return current;
  // The submitted script wins over provider metadata and survives managed R2
  // result replacement. Old tasks without a script retain their prior behavior.
  const savedResult = { ...result, ...(current.rapLyrics ? { rapLyrics: current.rapLyrics } : {}), ...(current.rapReferencePlan ? { rapReferencePlan: current.rapReferencePlan } : {}) };
  await db.update(videoTask).set({ status: 'succeeded', result: savedResult, errorMessage: null, updatedAt: new Date() })
    .where(and(eq(videoTask.id, taskId), eq(videoTask.userId, userId), eq(videoTask.status, 'processing')));
  return getVideoTaskRecord(taskId, userId);
}

export async function markVideoTaskFailed(taskId: string, userId: string, errorMessage: string): Promise<VideoTaskRecord | undefined> {
  await db.update(videoTask).set({ status: 'failed', errorMessage, updatedAt: new Date() })
    .where(and(eq(videoTask.id, taskId), eq(videoTask.userId, userId), eq(videoTask.status, 'processing')));
  return getVideoTaskRecord(taskId, userId);
}

/**
 * A single database transaction owns the refund flag, balance and ledger entry.
 * Concurrent polls can claim a failed task only once; an error rolls all three
 * writes back so the next poll can safely retry, even in a different Worker.
 */
export async function refundFailedVideoTask(taskId: string, userId: string): Promise<VideoTaskRecord | undefined> {
  const now = new Date();
  const transactionId = `txn_video_refund_${taskId}`;
  if (getDialect() !== 'pg') {
    const timestamp = Math.floor(now.getTime() / 1000);
    const statements = [
      {
        sql: `UPDATE video_task SET refunded = 1, updated_at = ?
              WHERE id = ? AND user_id = ? AND status = 'failed' AND refunded = 0 AND credit_cost > 0`,
        params: [timestamp, taskId, userId],
      },
      {
        sql: `UPDATE user SET credit_balance = CAST(credit_balance AS REAL) +
                (SELECT credit_cost FROM video_task WHERE id = ? AND user_id = ?), updated_at = ?
              WHERE id = ? AND changes() = 1`,
        params: [taskId, userId, timestamp, userId],
      },
      {
        sql: `INSERT INTO credit_transaction (id, user_id, type, amount, balance, description, metadata, created_at)
              SELECT ?, t.user_id, 'refund', CAST(t.credit_cost AS TEXT), u.credit_balance,
                'Refund for failed video generation',
                json_object('originalTransactionId', t.consume_transaction_id, 'videoTaskId', t.id,
                            'provider', t.provider, 'model', t.model, 'error', t.error_message), ?
              FROM video_task t JOIN user u ON u.id = t.user_id
              WHERE t.id = ? AND t.user_id = ? AND changes() = 1`,
        params: [transactionId, timestamp, taskId, userId],
      },
    ];
    if (getDialect() === 'd1') {
      await runNativeD1Batch(statements);
    } else {
      // better-sqlite3 requires a synchronous transaction callback.
      sqliteInstance.transaction(() => {
        for (const statement of statements) sqliteInstance.prepare(statement.sql).run(...statement.params);
      })();
    }
  } else {
    await db.transaction(async (tx) => {
      const [claimed] = await tx.update(videoTask).set({ refunded: true, updatedAt: now })
        .where(and(eq(videoTask.id, taskId), eq(videoTask.userId, userId), eq(videoTask.status, 'failed'), eq(videoTask.refunded, false), sql`${videoTask.creditCost} > 0`))
        .returning();
      if (!claimed) return;
      const [updatedUser] = await tx.update(user).set({ creditBalance: sql`${user.creditBalance} + ${claimed.creditCost}`, updatedAt: now })
        .where(eq(user.id, userId)).returning();
      if (!updatedUser) throw new Error('Video task owner no longer exists');
      await tx.insert(creditTransaction).values({
        id: transactionId, userId, type: 'refund', amount: String(claimed.creditCost), balance: updatedUser.creditBalance,
        description: 'Refund for failed video generation',
        metadata: { originalTransactionId: claimed.consumeTransactionId, videoTaskId: taskId, provider: claimed.provider, model: claimed.model, error: claimed.errorMessage },
      });
    });
  }
  return getVideoTaskRecord(taskId, userId);
}
