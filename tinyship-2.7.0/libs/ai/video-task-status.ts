import { queryVideoTask } from './video';
import { getVideoTaskRecord, markVideoTaskSucceeded, markVideoTaskFailed, refundFailedVideoTask } from './video-task-store';
import { VideoResultExpiredError, type VideoResultStorage } from './video-result-storage';

export async function refreshVideoTask(taskId: string, userId: string, {
  resultStorage,
}: { resultStorage?: VideoResultStorage } = {}) {
  let task = await getVideoTaskRecord(taskId, userId);
  if (!task) return undefined;
  if (task.status === 'processing') {
    const providerTask = await queryVideoTask(task.provider, task.model, task.providerTaskId);
    if (providerTask.status === 'succeeded' && providerTask.result) {
      // Storage failure remains retryable and must never expose an unmanaged
      // provider URL as a completed result for managed deployments.
      try {
        const result = resultStorage ? await resultStorage(task, providerTask.result) : providerTask.result;
        task = await markVideoTaskSucceeded(taskId, userId, result);
      } catch (error) {
        if (!(error instanceof VideoResultExpiredError)) throw error;
        // Expired delivery cannot recover; the existing failure/refund flow owns
        // compensation. Completed historical tasks never enter this branch.
        task = await markVideoTaskFailed(taskId, userId, error.message);
      }
    } else if (providerTask.status === 'failed') {
      task = await markVideoTaskFailed(taskId, userId, providerTask.errorMessage || 'Video generation failed');
    } else {
      // Another request may already have finalized the task while this one polled.
      task = await getVideoTaskRecord(taskId, userId);
    }
  }
  if (task?.status === 'failed' && !task.refunded && task.creditCost > 0) {
    // An unsuccessful refund remains retryable on the next poll.
    task = await refundFailedVideoTask(taskId, userId);
  }
  return task;
}
