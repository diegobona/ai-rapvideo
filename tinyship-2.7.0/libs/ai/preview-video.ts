import { and, eq, inArray, like } from 'drizzle-orm';
import { db } from '@libs/database';
import { videoTrial } from '@libs/database/schema';
import { RAP_PREVIEW_DURATION } from '../../config/rapVideo';
import { createVideoTask } from './video';
import type { VideoGenerationOptions } from './types';
import { createVideoTaskRecord, getVideoTaskRecord, type VideoTaskRecord } from './video-task-store';
import { refreshVideoTask } from './video-task-status';
import { attachTrialTask, getVideoTrial, releaseVideoTrial, reserveVideoTrial, VideoTrialError } from './video-trial';
import type { VideoResultStorage } from './video-result-storage';

type Dependencies = { resultStorage?: VideoResultStorage };
const ownerKeys = (userId: string | undefined, visitorId: string) => [
  `preview-v1:browser:${visitorId}`, ...(userId ? [`preview-v1:user:${userId}`] : []),
];
export const previewKeys = (ipKey: string, userId: string | undefined, visitorId: string) => [ipKey, ...ownerKeys(userId, visitorId)];

export async function assertPreviewAvailable(keys: string[]) {
  const { state } = await getVideoTrial(keys);
  if (state !== 'available') throw new VideoTrialError(state === 'used' ? 'trial_used' : 'trial_processing', state === 'used' ? 403 : 409);
}

export async function settlePreviewTask(task: VideoTaskRecord) {
  if (task.status === 'processing') return;
  await db.update(videoTrial).set({
    state: task.status === 'succeeded' ? 'used' : 'available', updatedAt: new Date(),
    ...(task.status === 'failed' ? { taskId: null, reservationId: null } : {}),
  }).where(and(like(videoTrial.key, 'preview-v1:%'), eq(videoTrial.taskId, task.id), eq(videoTrial.state, 'reserved')));
}

/** IP is admission only: it never grants access to another browser's task/result. */
export async function readPreviewVideoTask(userId: string, visitorId: string, dependencies: Dependencies = {}) {
  const rows = await db.select().from(videoTrial).where(inArray(videoTrial.key, ownerKeys(userId, visitorId)));
  for (const row of rows) {
    if (!row.taskId) continue;
    let task = await getVideoTaskRecord(row.taskId, userId);
    if (!task) continue;
    if (task.status === 'processing') {
      try { task = await refreshVideoTask(task.id, userId, dependencies) || task; }
      catch { /* Unknown provider state keeps the reservation. */ }
    }
    await settlePreviewTask(task);
    return task;
  }
}

/** All scopes are reserved in one database statement before any provider POST. */
export async function createPreviewVideo(options: VideoGenerationOptions, userId: string, visitorId: string, ipKey: string, dependencies: Dependencies = {}) {
  if (options.duration !== RAP_PREVIEW_DURATION || !/^preview-v1:ip:[\w-]{43}$/.test(ipKey)) throw new Error('Invalid preview contract');
  const current = await readPreviewVideoTask(userId, visitorId, dependencies);
  if (current?.status === 'processing') return current;
  const reservationId = await reserveVideoTrial(previewKeys(ipKey, userId, visitorId));
  try {
    const submitted = await createVideoTask(options);
    const task = await createVideoTaskRecord({ userId, provider: submitted.provider, model: submitted.model,
      providerTaskId: submitted.providerTaskId, creditCost: 0, rapReferencePlan: options.rapReferencePlan });
    await attachTrialTask(reservationId, task.id);
    return task;
  } catch (error) {
    // Release only confirmed pre-acceptance rejection. A timeout, lost task ID or
    // storage failure may already have incurred generation; no automatic expiry.
    if (error instanceof Error && (/^AutoDL API HTTP error: (400|401|403|404|413|415|422|429)$/.test(error.message)
      || /^AutoDL API error: (?!invalid_response\b)[A-Za-z0-9_.-]+ - /.test(error.message))) {
      await releaseVideoTrial(reservationId);
    }
    throw error;
  }
}
