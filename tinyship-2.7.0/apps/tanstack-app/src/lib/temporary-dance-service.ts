import { PaidVideoError, PaidVideoInputMissing } from '@libs/ai/paid-video';
import { createPreviewVideo } from '@libs/ai/preview-video';
import type { VideoGenerationOptions } from '@libs/ai/types';
import { validateOwnedVideoImage } from '@libs/payment/video-stripe';
import { createRapVideoOptions } from './rap-template';
import { paidDanceDependencies } from './paid-dance-service';

/** Public free generation is always a server-owned three-second preview. */
export async function createTemporaryRap(input: unknown, userId: string, visitorId: string, ipKey: string) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new PaidVideoError('invalid_video_request', 400);
  const body = input as Record<string, unknown>;
  let publicUrl = process.env.R2_PUBLIC_URL || '';
  try {
    const { env } = await import('cloudflare:workers');
    publicUrl = String(env.R2_PUBLIC_URL || publicUrl);
  } catch { /* Node uses the configured public storage origin. */ }
  let options: VideoGenerationOptions;
  try {
    validateOwnedVideoImage(body.personOneImageUrl, userId, publicUrl);
    validateOwnedVideoImage(body.personTwoImageUrl, userId, publicUrl);
    options = createRapVideoOptions(body, true);
  } catch {
    throw new PaidVideoError('invalid_video_request', 400);
  }
  const dependencies = await paidDanceDependencies(undefined, false);
  try {
    await dependencies.validateInputs!(options, userId);
  } catch (error) {
    throw new PaidVideoError(
      error instanceof PaidVideoInputMissing ? 'invalid_video_request' : 'video_service_unavailable',
      error instanceof PaidVideoInputMissing ? 400 : 503,
    );
  }
  return createPreviewVideo(options, userId, visitorId, ipKey, { resultStorage: dependencies.resultStorage });
}
