import { createFileRoute } from '@tanstack/react-router';
import { withCfDb } from '@/lib/with-request-db';
import { paidDanceErrorResponse, verifyPaidDanceSession } from '@/lib/paid-dance-service';
import { sameOriginMutation } from '@/lib/video-visitor';

export const Route = createFileRoute('/api/video-checkout/verify')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request }) => {
        try {
          if (!sameOriginMutation(request))
            return Response.json({ error: 'invalid_origin' }, { status: 403 });
          const { auth } = await import('@libs/auth');
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session?.user.id) return Response.json({ error: 'unauthorized' }, { status: 401 });
          const body: unknown = await request.json().catch(() => null);
          if (
            !body ||
            typeof body !== 'object' ||
            Array.isArray(body) ||
            Object.keys(body).length !== 1 ||
            !('sessionId' in body) ||
            typeof body.sessionId !== 'string' ||
            !/^cs_[\w]+$/.test(body.sessionId)
          )
            return Response.json({ error: 'invalid_request' }, { status: 400 });
          const purchase = await verifyPaidDanceSession(body.sessionId, session.user.id);
          return Response.json(
            { success: true, data: { purchase } },
            { headers: { 'Cache-Control': 'private, no-store' } },
          );
        } catch (error) {
          return paidDanceErrorResponse(error);
        }
      }),
    },
  },
});
