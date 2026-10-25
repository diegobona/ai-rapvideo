import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { db } from '@libs/database';
import { videoTrial } from '@libs/database/schema';
import { createVideoTask } from './video';
import type { VideoGenerationOptions } from './types';
import { createVideoTaskRecord, getVideoTaskRecord, type VideoTaskRecord } from './video-task-store';
import { refreshVideoTask } from './video-task-status';
import { VideoTrialError } from './video-trial';
import type { VideoResultStorage } from './video-result-storage';

type TemporaryVideoDependencies = { resultStorage?: VideoResultStorage };
const UNCONFIRMED_SUBMISSION_LEASE_MS = 30 * 60_000;

const keysFor = (userId: string, visitorId: string) => [`temporary:user:${userId}`, `temporary:browser:${visitorId}`];

/** Reconcile only this owner's temporary task; old once-only trial rows are untouched. */
export async function readTemporaryVideoTask(userId: string, visitorId: string, dependencies: TemporaryVideoDependencies = {}): Promise<VideoTaskRecord | undefined> {
  const rows = await db.select().from(videoTrial).where(inArray(videoTrial.key, keysFor(userId, visitorId)));
  rows.sort((a, b) => Number(b.state === 'reserved') - Number(a.state === 'reserved') || b.updatedAt.getTime() - a.updatedAt.getTime());
  for (const row of rows) {
    if (!row.taskId) {
      const expiredBefore = new Date(Date.now() - UNCONFIRMED_SUBMISSION_LEASE_MS);
      if (row.state === 'reserved' && row.reservationId && row.updatedAt <= expiredBefore) {
        // Compare the original reservation and expiry atomically. A concurrent
        // task attachment or a newer reservation must never be cleared here.
        await db.update(videoTrial).set({ state: 'available', reservationId: null, taskId: null, updatedAt: new Date() })
          .where(and(
            eq(videoTrial.reservationId, row.reservationId), eq(videoTrial.state, 'reserved'),
            sql`${videoTrial.taskId} IS NULL`, lte(videoTrial.updatedAt, expiredBefore),
            sql`NOT EXISTS (SELECT 1 FROM video_trial confirmed WHERE confirmed.reservation_id = ${row.reservationId} AND confirmed.task_id IS NOT NULL)`,
          ));
      }
      continue;
    }
    let task = await getVideoTaskRecord(row.taskId, userId);
    if (!task) continue;
    if (task.status === 'processing') {
      try { task = await refreshVideoTask(task.id, userId, dependencies) || task; }
      catch { /* Unknown provider/transport state retains admission and is retried later. */ }
    }
    if (task.status !== 'processing' && row.reservationId) {
      // Keep the final task for refresh/download, while permitting a new run.
      await db.update(videoTrial).set({ state: 'available', updatedAt: new Date() })
        .where(and(eq(videoTrial.reservationId, row.reservationId), eq(videoTrial.taskId, task.id), eq(videoTrial.state, 'reserved')));
    }
    return task;
  }
}

async function releaseRejectedSubmission(reservationId: string) {
  await db.update(videoTrial).set({ state: 'available', reservationId: null, taskId: null, updatedAt: new Date() })
    .where(and(eq(videoTrial.reservationId, reservationId), eq(videoTrial.state, 'reserved'), sql`${videoTrial.taskId} IS NULL`));
}

/** Repeatable temporary free mode, with one atomic in-flight run per browser/account. */
export async function createTemporaryVideo(options: VideoGenerationOptions, userId: string, visitorId: string, dependencies: TemporaryVideoDependencies = {}): Promise<VideoTaskRecord> {
  const current = await readTemporaryVideoTask(userId, visitorId, dependencies);
  if (current?.status === 'processing') return current;
  const keys = keysFor(userId, visitorId);
  for (const key of keys) await db.insert(videoTrial).values({ key, updatedAt: new Date() }).onConflictDoNothing();
  const reservationId = crypto.randomUUID();
  const keyList = sql.join(keys.map(key => sql`${key}`), sql`, `);
  const rows = await db.update(videoTrial).set({ state: 'reserved', reservationId, taskId: null, updatedAt: new Date() })
    .where(and(inArray(videoTrial.key, keys), sql`NOT EXISTS (
      SELECT 1 FROM video_trial occupied WHERE occupied.key IN (${keyList})
      AND occupied.state = 'reserved' AND COALESCE(occupied.reservation_id, '') <> ${reservationId}
    )`)).returning();
  if (rows.length !== keys.length) {
    const existing = await readTemporaryVideoTask(userId, visitorId, dependencies);
    if (existing?.status === 'processing') return existing;
    throw new VideoTrialError('trial_processing', 409);
  }
  try {
    const submitted = await createVideoTask(options);
    const task = await createVideoTaskRecord({ userId, provider: submitted.provider, model: submitted.model, providerTaskId: submitted.providerTaskId, creditCost: 0, ...(options.rapLyrics ? { rapLyrics: options.rapLyrics } : {}), ...(options.rapReferencePlan ? { rapReferencePlan: options.rapReferencePlan } : {}) });
    await db.update(videoTrial).set({ taskId: task.id, updatedAt: new Date() })
      .where(and(eq(videoTrial.reservationId, reservationId), eq(videoTrial.state, 'reserved')));
    return task;
  } catch (error) {
    // Explicit HTTP/business rejections precede acceptance. Malformed envelopes,
    // missing task IDs, transport errors and persistence failures are uncertain:
    // retain admission until the unconfirmed lease expires, with no POST retry.
    if (error instanceof Error && (
      /^AutoDL API HTTP error: (400|401|403|404|413|415|422|429)$/.test(error.message) ||
      /^AutoDL API error: (?!invalid_response\b)[A-Za-z0-9_.-]+ - /.test(error.message)
    )) {
      await releaseRejectedSubmission(reservationId);
    }
    throw error;
  }
}
