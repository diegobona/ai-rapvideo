import { PaidVideoError } from '@libs/ai/paid-video';

/** Private binding-only handoff. No HTTP endpoint can create recovery work. */
export async function schedulePaidVideoRecovery(purchaseId: string): Promise<void> {
  try {
    const { env } = await import('cloudflare:workers');
    const namespace = env.PAID_VIDEO_RECOVERY;
    if (!namespace) throw new Error('Recovery binding unavailable');
    await namespace.getByName(purchaseId).wake(purchaseId);
  } catch {
    // Includes Node deployments: payment requires durable recovery, explicitly
    // mocked in Node tests. Never accept a charge without a persisted alarm.
    throw new PaidVideoError('video_service_unavailable', 503);
  }
}
