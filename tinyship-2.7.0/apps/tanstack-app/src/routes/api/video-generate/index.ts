import { createFileRoute } from '@tanstack/react-router';
import { withCfDb } from '@/lib/with-request-db';
import { videoVisitor, visitorResponse, sameOriginMutation, limitTrialIp, trialErrorResponse, previewIpKey } from '@/lib/video-visitor';
import { paidDanceDependencies, paidDanceErrorResponse } from '@/lib/paid-dance-service';
import { publicPaidVideoPurchase, startPaidVideoPurchase } from '@libs/ai/paid-video';
import { latestVideoPurchase } from '@libs/payment/video-purchases';
import { schedulePaidVideoRecovery } from '@/lib/paid-video-recovery';
import { VIDEO_PAYMENT_REQUIRED } from '../../../../../../config/videoPurchase';
import { createComplimentaryRap, createTemporaryRap, prepareRap } from '@/lib/temporary-dance-service';
import { createPaidRapVideo, readRapCreditData } from '@libs/ai/rap-paid-credits';
import { requireRapAccount } from '@libs/payment/rap-credit-orders';
import { rapCreditPaymentsEnabled } from '../../../../../../config/rapCredits';
import { scheduleRapCreditRecovery } from '@/lib/rap-credit-recovery';
import { getVideoTaskRecord } from '@libs/ai/video-task-store';
import { hasComplimentaryRapAccess } from '@libs/ai/rap-access';
import { readTemporaryVideoTask } from '@libs/ai/temporary-video';
import { getVideoTrial, VideoTrialError } from '@libs/ai/video-trial';
import { previewKeys, readPreviewVideoTask } from '@libs/ai/preview-video';

export const Route = createFileRoute('/api/video-generate/')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth');
          const session = await auth.api.getSession({ headers: request.headers });
          const complimentaryFullVideo = hasComplimentaryRapAccess(session?.user);
          const visitor = await videoVisitor(request);
          const latest = session?.user.id
            ? await latestVideoPurchase(session.user.id)
            : undefined;
          // Keep actual paid work and refunds recoverable during temporary testing.
          const purchase = latest && (VIDEO_PAYMENT_REQUIRED || ['paid', 'starting', 'processing', 'refund_pending'].includes(latest.state))
            ? latest : undefined;
          const dependencies = complimentaryFullVideo || !VIDEO_PAYMENT_REQUIRED ? await paidDanceDependencies(undefined, false) : undefined;
          const previewTask = !VIDEO_PAYMENT_REQUIRED && session?.user.id
            ? await readPreviewVideoTask(session.user.id, visitor.id, dependencies) : undefined;
          const temporaryTask = (complimentaryFullVideo || !VIDEO_PAYMENT_REQUIRED) && session?.user.id
            ? await readTemporaryVideoTask(session.user.id, visitor.id, dependencies) : undefined;
          const paid = session?.user.isAnonymous === false
            ? await readRapCreditData(session.user.id, { ...dependencies, scheduleRecovery: scheduleRapCreditRecovery })
            : { enabled: rapCreditPaymentsEnabled(), credits: 0, order: undefined };
          const paidTask = paid.order?.taskId && session?.user.id ? await getVideoTaskRecord(paid.order.taskId, session.user.id) : undefined;
          const ownedTasks = [paidTask, temporaryTask, previewTask].filter((task): task is NonNullable<typeof task> => Boolean(task));
          ownedTasks.sort((a, b) => Number(b.status === 'processing') - Number(a.status === 'processing') || b.createdAt - a.createdAt);
          const directTask = ownedTasks[0];
          const preview = !complimentaryFullVideo && !VIDEO_PAYMENT_REQUIRED
            ? await getVideoTrial(previewKeys(await previewIpKey(request), session?.user.id, visitor.id)) : undefined;
          if (purchase && ['pending', 'paid', 'starting', 'processing', 'refund_pending'].includes(purchase.state))
            await schedulePaidVideoRecovery(purchase.id);
          return visitorResponse(
            Response.json({
              success: true,
              data: {
                purchase: purchase ? await publicPaidVideoPurchase(purchase) : null,
                storageKey: visitor.id,
                complimentaryFullVideo,
                paidCredits: paid.credits,
                paidPaymentsEnabled: paid.enabled,
                ...(paid.order ? { paidOrder: paid.order } : {}),
                ...(preview ? { previewState: preview.state } : {}),
                ...(directTask && directTask.status !== 'failed' ? { directTaskId: directTask.id } : {}),
              },
            }),
            visitor.cookie,
          );
        } catch (error) {
          return error instanceof VideoTrialError ? trialErrorResponse(error) : paidDanceErrorResponse(error);
        }
      }),
      POST: withCfDb(async ({ request }) => {
        try {
          if (!sameOriginMutation(request))
            return Response.json({ error: 'invalid_origin' }, { status: 403 });
          const { auth } = await import('@libs/auth');
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session?.user.id) return Response.json({ error: 'unauthorized' }, { status: 401 });
          const submittedBody: unknown = await request.json().catch(() => null);
          let body = submittedBody;
          let generationMode: unknown;
          let requestId: unknown;
          if (body && typeof body === 'object' && !Array.isArray(body)) {
            const { generationMode: mode, requestId: key, ...template } = body as Record<string, unknown>;
            generationMode = mode; requestId = key; body = template;
            if (mode !== undefined && mode !== 'full' && mode !== 'preview') return Response.json({ error: 'invalid_video_request' }, { status: 400 });
          }
          const complimentaryFullVideo = hasComplimentaryRapAccess(session.user);
          if (!complimentaryFullVideo && generationMode === 'full') {
            const userId = requireRapAccount(session.user);
            await limitTrialIp(request, 'generate');
            const { options, resultStorage } = await prepareRap(body, userId, false);
            const task = await createPaidRapVideo(options, userId, requestId, { resultStorage, scheduleRecovery: scheduleRapCreditRecovery });
            return Response.json({ success: true, data: { taskId: task.id, status: task.status } }, { headers: { 'Cache-Control': 'private, no-store' } });
          }
          if ((complimentaryFullVideo || !VIDEO_PAYMENT_REQUIRED) && body && typeof body === 'object' && !Array.isArray(body) && !('purchaseId' in body)) {
            await limitTrialIp(request, 'generate');
            const visitor = await videoVisitor(request);
            const task = complimentaryFullVideo
              ? await createComplimentaryRap(body, session.user, visitor.id)
              : await createTemporaryRap(body, session.user.id, visitor.id, await previewIpKey(request));
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
