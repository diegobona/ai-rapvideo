import { createFileRoute } from '@tanstack/react-router';
import { withCfDb } from '@/lib/with-request-db';
import { handleRapCreditWebhook } from '@libs/payment/rap-credit-stripe';
import { scheduleRapCreditRecovery } from '@/lib/rap-credit-recovery';
import { PaidVideoError } from '@libs/ai/paid-video';

export const Route = createFileRoute('/api/rap-credits/webhook')({ server: { handlers: {
  POST: withCfDb(async ({ request }) => {
    const signature = request.headers.get('stripe-signature');
    if (!signature || Number(request.headers.get('content-length') || 0) > 1024 * 1024) return Response.json({ error: 'invalid_webhook' }, { status: 400 });
    try {
      const body = await request.text();
      if (new TextEncoder().encode(body).length > 1024 * 1024) return Response.json({ error: 'invalid_webhook' }, { status: 400 });
      await handleRapCreditWebhook(body, signature, scheduleRapCreditRecovery);
      return Response.json({ received: true });
    } catch (error) {
      const invalid = (error instanceof Error && error.name === 'StripeSignatureVerificationError') || (error instanceof PaidVideoError && error.status < 500);
      return Response.json({ error: invalid ? 'invalid_webhook' : 'webhook_retry_required' }, { status: invalid ? 400 : 503 });
    }
  }),
} } });
