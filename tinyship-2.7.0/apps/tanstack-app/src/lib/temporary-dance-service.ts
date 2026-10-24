import { PaidVideoError, PaidVideoInputMissing } from '@libs/ai/paid-video';
import { createTemporaryVideo } from '@libs/ai/temporary-video';
import type { VideoGenerationOptions } from '@libs/ai/types';
import { validateOwnedVideoImage } from '@libs/payment/video-stripe';
import { createDanceVideoOptions } from './dance-template';
import { paidDanceDependencies } from './paid-dance-service';

/** Temporary direct generation uses the same server template and owned-photo checks. */
export async function createTemporaryDance(input: unknown, userId: string, visitorId: string) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new PaidVideoError('invalid_video_request', 400);
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some(key => ![
    'danceTemplate', 'dancerImageUrl', 'princessImageUrl', 'customDescription', 'quickTags', 'orientation',
  ].includes(key))) throw new PaidVideoError('invalid_video_request', 400);
  let publicUrl = process.env.R2_PUBLIC_URL || '';
  try {
    const { env } = await import('cloudflare:workers');
    publicUrl = String(env.R2_PUBLIC_URL || publicUrl);
  } catch { /* Node uses the configured public storage origin. */ }
  let options: VideoGenerationOptions;
  try {
    validateOwnedVideoImage(body.dancerImageUrl, userId, publicUrl);
    if (body.princessImageUrl !== undefined)
      validateOwnedVideoImage(body.princessImageUrl, userId, publicUrl);
    options = createDanceVideoOptions(body, publicUrl);
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
  return createTemporaryVideo(options, userId, visitorId);
}
