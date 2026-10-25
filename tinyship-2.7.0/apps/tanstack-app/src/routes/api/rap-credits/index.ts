import { createFileRoute } from '@tanstack/react-router';
import { withCfDb } from '@/lib/with-request-db';
import { readRapCreditData } from '@libs/ai/rap-paid-credits';
import { rapCreditPaymentsEnabled } from '../../../../../../config/rapCredits';
import { paidDanceDependencies } from '@/lib/paid-dance-service';
import { scheduleRapCreditRecovery } from '@/lib/rap-credit-recovery';
import { rapCreditErrorResponse, rapCreditHeaders } from '@/lib/rap-credit-service';

export const Route = createFileRoute('/api/rap-credits/')({ server: { handlers: {
  GET: withCfDb(async ({ request }) => {
    try {
      const { auth } = await import('@libs/auth');
      const session = await auth.api.getSession({ headers: request.headers });
      const data = session?.user.isAnonymous === false
        ? await readRapCreditData(session.user.id, { ...(await paidDanceDependencies(undefined, false)), scheduleRecovery: scheduleRapCreditRecovery })
        : { enabled: rapCreditPaymentsEnabled(), credits: 0 };
      return Response.json({ success: true, data }, { headers: rapCreditHeaders });
    } catch (error) { return rapCreditErrorResponse(error); }
  }),
} } });
