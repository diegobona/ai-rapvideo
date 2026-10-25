import { PaidVideoError } from '@libs/ai/paid-video';

export async function scheduleRapCreditRecovery(orderId: string): Promise<void> {
  try {
    const { env } = await import('cloudflare:workers');
    if (!env.RAP_CREDIT_RECOVERY) throw new Error('Rap credit recovery unavailable');
    await env.RAP_CREDIT_RECOVERY.getByName(orderId).wake(orderId);
  } catch { throw new PaidVideoError('video_service_unavailable', 503); }
}
