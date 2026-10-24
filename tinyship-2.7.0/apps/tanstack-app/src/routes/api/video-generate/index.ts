import { createFileRoute } from '@tanstack/react-router';
import { withCfDb } from '@/lib/with-request-db';
import { videoVisitor, visitorResponse, sameOriginMutation, limitTrialIp, trialErrorResponse } from '@/lib/video-visitor';
import { paidDanceDependencies, paidDanceErrorResponse } from '@/lib/paid-dance-service';
import { publicPaidVideoPurchase, startPaidVideoPurchase } from '@libs/ai/paid-video';
import { latestVideoPurchase } from '@libs/payment/video-purchases';
import { schedulePaidVideoRecovery } from '@/lib/paid-video-recovery';
import { VIDEO_PAYMENT_REQUIRED } from '../../../../../../config/videoPurchase';
import { createTemporaryRap } from '@/lib/temporary-dance-service';
import { readTemporaryVideoTask } from '@libs/ai/temporary-video';
import { VideoTrialError } from '@libs/ai/video-trial';

export const Route = createFileRoute('/api/video-generate/')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth');
          const session = await auth.api.getSession({ headers: request.headers });
          const visitor = await videoVisitor(request);
          const latest = session?.user.id
            ? await latestVideoPurchase(session.user.id)
            : undefined;
          // Keep actual paid work and refunds recoverable during temporary testing.
          const purchase = latest && (VIDEO_PAYMENT_REQUIRED || ['paid', 'starting', 'processing', 'refund_pending'].includes(latest.state))
            ? latest : undefined;
          const directTask = !VIDEO_PAYMENT_REQUIRED && session?.user.id
            ? await readTemporaryVideoTask(session.user.id, visitor.id, await paidDanceDependencies(undefined, false)) : undefined;
          if (purchase && ['pending', 'paid', 'starting', 'processing', 'refund_pending'].includes(purchase.state))
            await schedulePaidVideoRecovery(purchase.id);
          return visitorResponse(
            Response.json({
              success: true,
              data: {
                purchase: purchase ? await publicPaidVideoPurchase(purchase) : null,
                storageKey: visitor.id,
                ...(directTask && directTask.status !== 'failed' ? { directTaskId: directTask.id } : {}),
              },
            }),
            visitor.cookie,
          );
        } catch (error) {
          return paidDanceErrorResponse(error);
        }
      }),
      POST: withCfDb(async ({ request }) => {
        try {
          if (!sameOriginMutation(request))
            return Response.json({ error: 'invalid_origin' }, { status: 403 });
          const { auth } = await import('@libs/auth');
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session?.user.id) return Response.json({ error: 'unauthorized' }, { status: 401 });
          const body: unknown = await request.json().catch(() => null);
          if (!VIDEO_PAYMENT_REQUIRED && body && typeof body === 'object' && !Array.isArray(body) && !('purchaseId' in body)) {
            await limitTrialIp(request, 'generate');
            const visitor = await videoVisitor(request);
            const task = await createTemporaryRap(body, session.user.id, visitor.id);
            return visitorResponse(Response.json({ success: true, data: { taskId: task.id, status: task.status } }), visitor.cookie);
          }
          if (
            !body ||
            typeof body !== 'object' ||
            Array.isArray(body) ||
            Object.keys(body).length !== 1 ||
            !('purchaseId' in body) ||
            typeof body.purchaseId !== 'string' ||
            !body.purchaseId ||
            body.purchaseId.length > 100
          )
            return Response.json({ error: 'invalid_video_request' }, { status: 400 });
          const purchase = await startPaidVideoPurchase(
            body.purchaseId,
            session.user.id,
            await paidDanceDependencies(),
          );
          return Response.json(
            { success: true, data: { purchase: await publicPaidVideoPurchase(purchase) } },
            { headers: { 'Cache-Control': 'private, no-store' } },
          );
        } catch (error) {
          return error instanceof VideoTrialError ? trialErrorResponse(error) : paidDanceErrorResponse(error);
        }
      }),
    },
  },
});
