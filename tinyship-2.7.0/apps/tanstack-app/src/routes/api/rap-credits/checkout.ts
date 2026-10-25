import { createFileRoute } from '@tanstack/react-router';
import { withCfDb } from '@/lib/with-request-db';
import { sameOriginMutation, limitTrialIp } from '@/lib/video-visitor';
import { requireRapAccount } from '@libs/payment/rap-credit-orders';
import { createRapCreditCheckout } from '@libs/payment/rap-credit-stripe';
import { scheduleRapCreditRecovery } from '@/lib/rap-credit-recovery';
import { rapCreditErrorResponse, rapCreditHeaders } from '@/lib/rap-credit-service';

export const Route = createFileRoute('/api/rap-credits/checkout')({ server: { handlers: {
  POST: withCfDb(async ({ request }) => {
    try {
      if (!sameOriginMutation(request)) return Response.json({ error: 'invalid_origin' }, { status: 403 });
      const { auth } = await import('@libs/auth');
      const session = await auth.api.getSession({ headers: request.headers });
      const userId = requireRapAccount(session?.user);
      await limitTrialIp(request, 'generate');
      const data = await createRapCreditCheckout(userId, scheduleRapCreditRecovery);
      return Response.json({ success: true, data }, { headers: rapCreditHeaders });
    } catch (error) { return rapCreditErrorResponse(error); }
  }),
} } });
