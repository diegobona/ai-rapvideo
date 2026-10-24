import { createFileRoute } from '@tanstack/react-router';
import { withCfDb } from '@/lib/with-request-db';
import { createPaidDanceCheckout, paidDanceErrorResponse } from '@/lib/paid-dance-service';
import { limitTrialIp, sameOriginMutation, trialErrorResponse } from '@/lib/video-visitor';
import { VideoTrialError } from '@libs/ai/video-trial';
import { VIDEO_PAYMENT_REQUIRED } from '../../../../../../config/videoPurchase';

export const Route = createFileRoute('/api/video-checkout/')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request }) => {
        try {
          if (!sameOriginMutation(request))
            return Response.json({ error: 'invalid_origin' }, { status: 403 });
          const { auth } = await import('@libs/auth');
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session?.user.id) return Response.json({ error: 'unauthorized' }, { status: 401 });
          if (!VIDEO_PAYMENT_REQUIRED)
            return Response.json({ error: 'video_payment_disabled' }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } });
          await limitTrialIp(request, 'generate');
          const data = await createPaidDanceCheckout(
            await request.json().catch(() => null),
            session.user.id,
          );
          return Response.json(
            { success: true, data },
            { headers: { 'Cache-Control': 'private, no-store' } },
          );
        } catch (error) {
          return error instanceof VideoTrialError
            ? trialErrorResponse(error)
            : paidDanceErrorResponse(error);
        }
      }),
    },
  },
});
