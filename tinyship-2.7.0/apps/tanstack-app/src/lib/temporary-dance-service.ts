import { PaidVideoError, PaidVideoInputMissing } from '@libs/ai/paid-video';
import { createPreviewVideo } from '@libs/ai/preview-video';
import { createTemporaryVideo } from '@libs/ai/temporary-video';
import { hasComplimentaryRapAccess } from '@libs/ai/rap-access';
import type { VideoGenerationOptions } from '@libs/ai/types';
import { validateOwnedVideoImage } from '@libs/payment/video-stripe';
import { createRapVideoOptions } from './rap-template';
import { paidDanceDependencies } from './paid-dance-service';
import { migrateRapMediaUrl } from '../../../../config/mediaRetention';

export async function prepareRap(input: unknown, userId: string, preview: boolean) {
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
    // An already-open tab may hold photo URLs uploaded before the custom-domain
    // switch. Canonicalize only known same-bucket keys, then keep owner checks.
    const current = { ...body,
      personOneImageUrl: typeof body.personOneImageUrl === 'string' ? migrateRapMediaUrl(body.personOneImageUrl, publicUrl) : body.personOneImageUrl,
      personTwoImageUrl: typeof body.personTwoImageUrl === 'string' ? migrateRapMediaUrl(body.personTwoImageUrl, publicUrl) : body.personTwoImageUrl,
    };
    validateOwnedVideoImage(current.personOneImageUrl, userId, publicUrl);
    validateOwnedVideoImage(current.personTwoImageUrl, userId, publicUrl);
    options = createRapVideoOptions(current, preview);
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
  return { options, resultStorage: dependencies.resultStorage };
}

/** Public free generation is always a server-owned three-second preview. */
export async function createTemporaryRap(input: unknown, userId: string, visitorId: string, ipKey: string) {
  const { options, resultStorage } = await prepareRap(input, userId, true);
  return createPreviewVideo(options, userId, visitorId, ipKey, { resultStorage });
}

/** Only the server-authenticated allowlisted account gets the full duration. */
export async function createComplimentaryRap(input: unknown, user: { id: string; email: string; isAnonymous?: boolean | null }, visitorId: string) {
  if (!hasComplimentaryRapAccess(user)) throw new PaidVideoError('unauthorized', 403);
  const { options, resultStorage } = await prepareRap(input, user.id, false);
  return createTemporaryVideo(options, user.id, visitorId, { resultStorage });
}
