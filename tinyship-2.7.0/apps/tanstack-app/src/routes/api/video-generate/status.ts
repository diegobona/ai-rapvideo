import { createFileRoute } from '@tanstack/react-router';
import { withCfDb } from '@/lib/with-request-db';
import { paidDanceDependencies, paidDanceErrorResponse } from '@/lib/paid-dance-service';
import { publicPaidVideoPurchase, refreshPaidVideoPurchase } from '@libs/ai/paid-video';
import { isManagedVideoExpired } from '../../../../../../config/mediaRetention';

export const Route = createFileRoute('/api/video-generate/status')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth');
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session?.user.id) return Response.json({ error: 'unauthorized' }, { status: 401 });
          const params = new URL(request.url).searchParams;
          const purchaseId = params.get('purchaseId');
          if (purchaseId) {
            const purchase = await refreshPaidVideoPurchase(
              purchaseId,
              session.user.id,
              await paidDanceDependencies(),
            );
            return Response.json(
              { success: true, data: { purchase: await publicPaidVideoPurchase(purchase) } },
              { headers: { 'Cache-Control': 'private, no-store' } },
            );
          }
          const taskId = params.get('taskId');
          if (!taskId) return Response.json({ error: 'invalid_request' }, { status: 400 });
          const { refreshVideoTask } = await import('@libs/ai/video-task-status');
          const { resultStorage } = await paidDanceDependencies(undefined, false);
          const task = await refreshVideoTask(taskId, session.user.id, { resultStorage });
          if (!task) return Response.json({ error: 'not_found' }, { status: 404 });
          if (isManagedVideoExpired(task.result)) return Response.json({ error: 'video_expired' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
          return Response.json(
            {
              success: true,
              data: { taskId, status: task.status, result: task.result, error: task.errorMessage },
            },
            { headers: { 'Cache-Control': 'private, no-store' } },
          );
        } catch (error) {
          return paidDanceErrorResponse(error);
        }
      }),
    },
  },
});
