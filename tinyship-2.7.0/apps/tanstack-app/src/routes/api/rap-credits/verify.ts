import { createFileRoute } from '@tanstack/react-router';
import { withCfDb } from '@/lib/with-request-db';
import { sameOriginMutation } from '@/lib/video-visitor';
import { requireRapAccount } from '@libs/payment/rap-credit-orders';
import { verifyRapCreditCheckout } from '@libs/payment/rap-credit-stripe';
import { publicRapCreditOrder } from '@libs/ai/rap-paid-credits';
import { availableRapCredits } from '@libs/payment/rap-credit-orders';
import { rapCreditPaymentsEnabled } from '../../../../../../config/rapCredits';
import { PaidVideoError } from '@libs/ai/paid-video';
import { scheduleRapCreditRecovery } from '@/lib/rap-credit-recovery';
import { rapCreditErrorResponse, rapCreditHeaders, readSmallRapJson } from '@/lib/rap-credit-service';

export const Route = createFileRoute('/api/rap-credits/verify')({ server: { handlers: {
  POST: withCfDb(async ({ request }) => {
    try {
      if (!sameOriginMutation(request)) return Response.json({ error: 'invalid_origin' }, { status: 403 });
      const { auth } = await import('@libs/auth');
      const session = await auth.api.getSession({ headers: request.headers });
      const userId = requireRapAccount(session?.user);
      const body = await readSmallRapJson(request);
      if (Object.keys(body).length !== 1 || typeof body.sessionId !== 'string') throw new PaidVideoError('invalid_request', 400);
      const order = await verifyRapCreditCheckout(body.sessionId, userId, scheduleRapCreditRecovery);
      return Response.json({ success: true, data: { enabled: rapCreditPaymentsEnabled(), credits: await availableRapCredits(userId), order: await publicRapCreditOrder(order) } }, { headers: rapCreditHeaders });
    } catch (error) { return rapCreditErrorResponse(error); }
  }),
} } });
